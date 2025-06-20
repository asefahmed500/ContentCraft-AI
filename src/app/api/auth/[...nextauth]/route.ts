
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { User as NextAuthUser, Account, Profile } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';


interface MyAppUser extends NextAuthUser {
  role?: string;
  id?: string; // This will hold the string version of _id
  _id?: ObjectId | string; // MongoDB ObjectId or its string representation
  totalXP?: number;
  level?: number;
  badges?: string[];
}

const defaultGamification = {
  role: 'viewer',
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
        const usersCollection = db.collection<AdapterUser>("users"); // AdapterUser for DB interaction

        const dbUser = await usersCollection.findOne({ email: credentials.email });

        if (!dbUser) {
          throw new Error("No user found with this email.");
        }

        if (!dbUser.password) {
            throw new Error("This account was created using a social login. Please sign in with Google.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, dbUser.password);

        if (!isValidPassword) {
          throw new Error("Incorrect password.");
        }
        
        // Ensure gamification fields for the user object returned by authorize
        return {
          id: dbUser._id!.toString(), // Convert ObjectId to string for NextAuth user object
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: (dbUser as MyAppUser).role ?? defaultGamification.role,
          totalXP: (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (dbUser as MyAppUser).level ?? defaultGamification.level,
          badges: (dbUser as MyAppUser).badges ?? defaultGamification.badges,
        } as MyAppUser; // Cast to MyAppUser
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db(getDbName());
      const usersCollection = db.collection<AdapterUser>("users");

      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (dbUser) {
        const updates: Partial<AdapterUser & MyAppUser> = {};
        let needsDbUpdate = false;

        if (user.name && dbUser.name !== user.name) {
          updates.name = user.name;
          needsDbUpdate = true;
        }
        if (user.image && dbUser.image !== user.image) {
          updates.image = user.image;
          needsDbUpdate = true;
        }
        if (account?.provider === "google" && !dbUser.emailVerified && (profile as any)?.email_verified === true) {
          updates.emailVerified = new Date();
          needsDbUpdate = true;
        }
        
        if (typeof (dbUser as MyAppUser).role === 'undefined') {
          updates.role = defaultGamification.role;
          needsDbUpdate = true;
        }
        if (typeof (dbUser as MyAppUser).totalXP === 'undefined') {
          updates.totalXP = defaultGamification.totalXP;
          needsDbUpdate = true;
        }
        if (typeof (dbUser as MyAppUser).level === 'undefined') {
          updates.level = defaultGamification.level;
          needsDbUpdate = true;
        }
        if (typeof (dbUser as MyAppUser).badges === 'undefined') {
          updates.badges = defaultGamification.badges;
          needsDbUpdate = true;
        }

        if (needsDbUpdate) {
          await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
          dbUser = await usersCollection.findOne({ _id: dbUser._id }); // Re-fetch to get merged data
        }
        
        // Enrich the NextAuth `user` object (which is passed to JWT callback)
        // It must have `id` as string.
        user.id = dbUser!._id!.toString();
        (user as MyAppUser).role = (dbUser as MyAppUser).role ?? defaultGamification.role;
        (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = (dbUser as MyAppUser).level ?? defaultGamification.level;
        (user as MyAppUser).badges = (dbUser as MyAppUser).badges ?? defaultGamification.badges;
        user.name = dbUser!.name;
        user.image = dbUser!.image;
        user.emailVerified = dbUser!.emailVerified;

      } else {
        // This branch is for new users being created by the adapter (typically OAuth)
        // The adapter's createUser method will be called after this.
        // We augment the incoming `user` object so the adapter has these default values.
        (user as MyAppUser).role = defaultGamification.role;
        (user as MyAppUser).totalXP = defaultGamification.totalXP;
        (user as MyAppUser).level = defaultGamification.level;
        (user as MyAppUser).badges = defaultGamification.badges;
        if (account?.provider === "google" && (profile as any)?.email_verified === true) {
            user.emailVerified = new Date(); 
        }
      }
      return true; 
    },
    async jwt({ token, user, trigger, session, account }) {
      if (user) { // user object is available on initial sign in (enriched by signIn callback)
        const typedUser = user as MyAppUser; // user object has id as string here
        token.id = typedUser.id;
        token.role = typedUser.role;
        token.totalXP = typedUser.totalXP;
        token.level = typedUser.level;
        token.badges = typedUser.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; // NextAuth uses 'picture' in JWT for image
        token.email = typedUser.email; 
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
        typedSessionUser.role = token.role as string ?? defaultGamification.role;
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamification.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamification.level;
        typedSessionUser.badges = (token.badges as string[]) ?? defaultGamification.badges;
        // Ensure name, email, image are also correctly populated from token
        typedSessionUser.name = token.name;
        typedSessionUser.email = token.email;
        typedSessionUser.image = token.picture as string | null | undefined;

        (session as any).accessToken = token.accessToken; // If you need access token client-side
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Optionally, define an error page
    // newUser: '/auth/new-user' // Optionally, define a new user page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
