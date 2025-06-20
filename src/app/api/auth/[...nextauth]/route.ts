
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { User as NextAuthUser, Account, Profile } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';


interface MyAppUser extends NextAuthUser {
  role?: string;
  id?: string; 
  _id?: string; // MongoDB ObjectId as string
  totalXP?: number;
  level?: number;
  badges?: string[];
}

const defaultGamification = {
  totalXP: 0,
  level: 1,
  badges: [],
};

const getDbName = (): string | undefined => {
  const dbName = process.env.MONGODB_DB_NAME;
  return dbName && dbName.trim() !== "" ? dbName.trim() : undefined;
};

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise as Promise<MongoClient>, {
    databaseName: getDbName(),
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing email or password");
        }

        const client: MongoClient = await clientPromise;
        const db: Db = client.db(getDbName());
        const usersCollection = db.collection<AdapterUser>("users");

        const user = await usersCollection.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email.");
        }

        if (!user.password) { 
            throw new Error("This account was created using a social login. Please sign in with Google.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          throw new Error("Incorrect password.");
        }
        
        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: (user as MyAppUser).role || 'viewer', 
          totalXP: (user as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (user as MyAppUser).level ?? defaultGamification.level,
          badges: (user as MyAppUser).badges || defaultGamification.badges,
        } as MyAppUser; 
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        const typedUser = user as MyAppUser; 
        token.id = typedUser.id || typedUser._id; 
        token.role = typedUser.role || 'viewer';
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges || defaultGamification.badges;
        if (account) {
            token.accessToken = account.access_token;
        }
      }
      
      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as MyAppUser;
        if (sessionUser.name) token.name = sessionUser.name;
        if (sessionUser.image) token.picture = sessionUser.image; 
        if (sessionUser.role) token.role = sessionUser.role;
        if (sessionUser.totalXP !== undefined) token.totalXP = sessionUser.totalXP;
        if (sessionUser.level !== undefined) token.level = sessionUser.level;
        if (sessionUser.badges) token.badges = sessionUser.badges;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedSessionUser = session.user as MyAppUser;
        typedSessionUser.id = token.id as string;
        typedSessionUser.role = token.role as string ?? 'viewer';
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamification.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamification.level;
        typedSessionUser.badges = (token.badges as string[]) || defaultGamification.badges;
        (session as any).accessToken = token.accessToken; 
      }
      return session;
    },
    async signIn({ user, account }) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db(getDbName());
      const usersCollection = db.collection<AdapterUser>("users"); 
      
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      const updateDoc: Partial<AdapterUser & MyAppUser> = {
          name: user.name,
          image: user.image,
          emailVerified: account?.provider === 'google' ? new Date() : (dbUser?.emailVerified || null),
          role: dbUser ? (dbUser as MyAppUser).role || 'viewer' : 'viewer', 
          totalXP: dbUser ? ((dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP) : defaultGamification.totalXP,
          level: dbUser ? ((dbUser as MyAppUser).level ?? defaultGamification.level) : defaultGamification.level,
          badges: dbUser ? (dbUser as MyAppUser).badges || defaultGamification.badges : defaultGamification.badges,
      };
      
      if (dbUser) {
        // Update existing user if name/image changed from provider or to ensure gamification fields
        await usersCollection.updateOne({ _id: dbUser._id }, { $set: updateDoc, $setOnInsert: defaultGamification });
        dbUser = {...dbUser, ...updateDoc }; 
      } else {
        // If the adapter hasn't created the user yet (e.g., for credentials, though less likely here as authorize handles it)
        // or to ensure default fields for a new OAuth user if adapter's createUser is minimalistic.
        // For OAuth, adapter.createUser is usually called before this.
        // The adapter should ideally set these on creation.
        // We're enriching the `user` object that will be passed to JWT.
      }
      
      // Enrich the user object for JWT callback
      user.id = dbUser?._id!.toString() || user.id; // Ensure user.id is set
      (user as MyAppUser).role = (dbUser as MyAppUser)?.role || updateDoc.role || 'viewer';
      (user as MyAppUser).totalXP = (dbUser as MyAppUser)?.totalXP ?? updateDoc.totalXP ?? defaultGamification.totalXP;
      (user as MyAppUser).level = (dbUser as MyAppUser)?.level ?? updateDoc.level ?? defaultGamification.level;
      (user as MyAppUser).badges = (dbUser as MyAppUser)?.badges || updateDoc.badges || defaultGamification.badges;
      
      return true; 
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

