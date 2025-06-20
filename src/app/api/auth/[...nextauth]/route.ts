
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

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise as Promise<MongoClient>, {
    databaseName: process.env.MONGODB_DB_NAME || undefined, 
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
        const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
        const usersCollection = db.collection<AdapterUser>("users");

        const user = await usersCollection.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email.");
        }

        if (!user.password) { // Check if password field exists, as OAuth users won't have it
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
          role: (user as MyAppUser).role || 'viewer', // Cast to MyAppUser to access custom fields
          totalXP: (user as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (user as MyAppUser).level ?? defaultGamification.level,
          badges: (user as MyAppUser).badges || defaultGamification.badges,
        } as MyAppUser; // Return as MyAppUser
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session, account, profile }) {
      // Initial sign in or user object is present
      if (user) {
        const typedUser = user as MyAppUser; // User from authorize or signIn callback
        token.id = typedUser.id || typedUser._id; // Use id if present (from authorize), else _id (from signIn)
        token.role = typedUser.role || 'viewer';
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges || defaultGamification.badges;
        // Persist the OAuth access_token and or the user id to the token right after signin
        if (account) {
            token.accessToken = account.access_token
        }
      }
      
      // Handle session updates
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
        typedSessionUser.role = token.role as string;
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamification.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamification.level;
        typedSessionUser.badges = (token.badges as string[]) || defaultGamification.badges;
        (session as any).accessToken = token.accessToken; // Add accessToken to session if needed
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
      const usersCollection = db.collection<AdapterUser>("users"); // Use AdapterUser for DB operations
      
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (account?.provider === 'google') {
        const updateDoc: Partial<AdapterUser & MyAppUser> = {
            name: user.name,
            image: user.image,
            emailVerified: new Date(), // Mark email as verified for Google sign-ins
            role: dbUser ? (dbUser as MyAppUser).role || 'viewer' : 'viewer', // Preserve existing role or default
            totalXP: dbUser ? ((dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP) : defaultGamification.totalXP,
            level: dbUser ? ((dbUser as MyAppUser).level ?? defaultGamification.level) : defaultGamification.level,
            badges: dbUser ? (dbUser as MyAppUser).badges || defaultGamification.badges : defaultGamification.badges,
        };

        if (dbUser) {
          // Update existing user if name/image changed, ensure gamification fields
          await usersCollection.updateOne({ _id: dbUser._id }, { $set: updateDoc });
          dbUser = {...dbUser, ...updateDoc }; // Reflect updates in dbUser
        } else {
          // This case should be handled by the adapter creating the user,
          // but if not, we can ensure fields are set if user somehow bypasses adapter's initial creation.
          // Typically, MongoDBAdapter handles the creation with info from Google profile.
          // We just want to ensure our custom fields are there.
          // The adapter usually runs createUser before this signIn callback.
        }
      }
      
      // Enrich the user object passed to JWT callback
      if (dbUser) {
        user.id = dbUser._id!.toString(); // Ensure user.id is set for JWT callback
        (user as MyAppUser).role = (dbUser as MyAppUser).role || 'viewer';
        (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = (dbUser as MyAppUser).level ?? defaultGamification.level;
        (user as MyAppUser).badges = (dbUser as MyAppUser).badges || defaultGamification.badges;
      }
      return true; // Proceed with sign-in
    }
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Optional: Custom error page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
