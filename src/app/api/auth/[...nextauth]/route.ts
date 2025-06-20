
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
  id: string; // Must be string for NextAuth session
  _id?: ObjectId | string; // MongoDB ObjectId
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
        const usersCollection = db.collection<AdapterUser>("users"); 

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
        
        return {
          id: dbUser._id!.toString(), 
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: (dbUser as MyAppUser).role ?? defaultGamification.role,
          totalXP: (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (dbUser as MyAppUser).level ?? defaultGamification.level,
          badges: (dbUser as MyAppUser).badges ?? defaultGamification.badges,
        } as MyAppUser; 
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

      if (dbUser) { // Existing user
        const updates: Partial<AdapterUser & MyAppUser> = {};
        let needsDbUpdate = false;

        // Update name/image if changed from provider
        if (user.name && dbUser.name !== user.name) {
          updates.name = user.name;
          needsDbUpdate = true;
        }
        if (user.image && dbUser.image !== user.image) {
          updates.image = user.image;
          needsDbUpdate = true;
        }
        // Set emailVerified if provider confirms it
        if (account?.provider === "google" && !dbUser.emailVerified && (profile as any)?.email_verified === true) {
          updates.emailVerified = new Date();
          needsDbUpdate = true;
        }
        
        // Ensure gamification fields are present
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
          dbUser = await usersCollection.findOne({ _id: dbUser._id }); // Re-fetch
        }
        
        // Enrich the NextAuth `user` object passed to JWT callback
        // IMPORTANT: user.id MUST be the string version of _id
        user.id = dbUser!._id!.toString(); 
        (user as MyAppUser).role = (dbUser as MyAppUser).role ?? defaultGamification.role;
        (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = (dbUser as MyAppUser).level ?? defaultGamification.level;
        (user as MyAppUser).badges = (dbUser as MyAppUser).badges ?? defaultGamification.badges;
        user.name = dbUser!.name; // Ensure name is from DB
        user.image = dbUser!.image; // Ensure image is from DB
        user.emailVerified = dbUser!.emailVerified;

      } else { 
        // New user via OAuth (adapter's createUser will handle DB creation)
        // Augment the incoming `user` object so adapter gets these default values.
        // The adapter *should* create user.id as a string if using MongoDBAdapter conventions.
        (user as MyAppUser).role = defaultGamification.role;
        (user as MyAppUser).totalXP = defaultGamification.totalXP;
        (user as MyAppUser).level = defaultGamification.level;
        (user as MyAppUser).badges = defaultGamification.badges;
        if (account?.provider === "google" && (profile as any)?.email_verified === true) {
            user.emailVerified = new Date(); 
        }
        // user.id will be set by the adapter after createUser
      }
      return true; 
    },
    async jwt({ token, user, trigger, session: sessionUpdate, account }) {
      if (user) { // user object is available on initial sign in (enriched by signIn callback)
        const typedUser = user as MyAppUser; 
        token.id = typedUser.id; // This ID should be the string version from signIn
        token.role = typedUser.role;
        token.totalXP = typedUser.totalXP;
        token.level = typedUser.level;
        token.badges = typedUser.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; 
        token.email = typedUser.email; 
        if (account) { 
            token.accessToken = account.access_token; // For Google
        }
      }

      // Handle session updates (e.g., user updates profile info)
      if (trigger === "update" && sessionUpdate?.user) {
        const sessionUser = sessionUpdate.user as MyAppUser;
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
      // The token object contains all the custom fields added in the jwt callback
      if (session.user) {
        const typedSessionUser = session.user as MyAppUser;
        typedSessionUser.id = token.id as string; // Ensure id is string
        typedSessionUser.role = token.role as string ?? defaultGamification.role;
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamification.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamification.level;
        typedSessionUser.badges = (token.badges as string[]) ?? defaultGamification.badges;
        
        typedSessionUser.name = token.name;
        typedSessionUser.email = token.email;
        typedSessionUser.image = token.picture as string | null | undefined; // 'picture' is standard in token

        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
