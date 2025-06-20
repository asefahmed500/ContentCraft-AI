
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
  id: string; 
  _id?: ObjectId | string; 
  totalXP?: number;
  level?: number;
  badges?: string[];
}

const defaultGamification = {
  role: 'viewer',
  totalXP: 0,
  level: 1,
  badges: [] as string[],
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
          emailVerified: dbUser.emailVerified ? new Date(dbUser.emailVerified) : null,
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

        // Ensure the user object for JWT uses the DB user's ID
        user.id = dbUser._id.toString(); 

        if (account?.provider === "google") {
          const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });
          if (googleProfile?.name && dbUser.name !== googleProfile.name) {
            updates.name = googleProfile.name;
            user.name = googleProfile.name; 
            needsDbUpdate = true;
          }
          const googleImage = googleProfile?.picture || googleProfile?.image;
          if (googleImage && dbUser.image !== googleImage) {
            updates.image = googleImage;
            user.image = googleImage; 
            needsDbUpdate = true;
          }
          if (!dbUser.emailVerified && googleProfile?.email_verified === true) {
            updates.emailVerified = new Date();
            user.emailVerified = updates.emailVerified; 
            needsDbUpdate = true;
          }
        }

        // Ensure gamification fields are present in DB and on user object for JWT
        if (typeof (dbUser as MyAppUser).role === 'undefined') { 
          updates.role = defaultGamification.role; needsDbUpdate = true; 
        }
        (user as MyAppUser).role = (dbUser as MyAppUser).role ?? updates.role ?? defaultGamification.role;

        if (typeof (dbUser as MyAppUser).totalXP === 'undefined') { 
          updates.totalXP = defaultGamification.totalXP; needsDbUpdate = true; 
        }
        (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP ?? updates.totalXP ?? defaultGamification.totalXP;
        
        if (typeof (dbUser as MyAppUser).level === 'undefined') { 
          updates.level = defaultGamification.level; needsDbUpdate = true; 
        }
        (user as MyAppUser).level = (dbUser as MyAppUser).level ?? updates.level ?? defaultGamification.level;

        if (typeof (dbUser as MyAppUser).badges === 'undefined') { 
          updates.badges = defaultGamification.badges; needsDbUpdate = true; 
        }
        (user as MyAppUser).badges = (dbUser as MyAppUser).badges ?? updates.badges ?? defaultGamification.badges;
        
        if (needsDbUpdate) {
          await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
          // Re-fetch dbUser to ensure the user object passed to JWT is fresh
          dbUser = await usersCollection.findOne({ _id: dbUser._id });
        }
        
        // Populate the user object for JWT with the latest data from DB
        if(dbUser) {
            user.id = dbUser._id.toString();
            user.name = dbUser.name;
            user.email = dbUser.email; // email should already be there
            user.image = dbUser.image;
            user.emailVerified = dbUser.emailVerified ? new Date(dbUser.emailVerified) : null;
            (user as MyAppUser).role = (dbUser as MyAppUser).role;
            (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP;
            (user as MyAppUser).level = (dbUser as MyAppUser).level;
            (user as MyAppUser).badges = (dbUser as MyAppUser).badges;
        }

      } else { // New user via OAuth (adapter's createUser will handle DB insertion)
        (user as MyAppUser).role = defaultGamification.role;
        (user as MyAppUser).totalXP = defaultGamification.totalXP;
        (user as MyAppUser).level = defaultGamification.level;
        (user as MyAppUser).badges = defaultGamification.badges;
        
        const googleProfile = profile as (Profile & { email_verified?: boolean });
        if (account?.provider === "google" && googleProfile?.email_verified === true) {
            user.emailVerified = new Date(); 
        }
        // The adapter's createUser will be called AFTER this signIn callback completes (if user is new)
        // The `user` object passed to JWT will be the one returned by adapter's createUser
      }
      return true; 
    },
    async jwt({ token, user, trigger, session: sessionUpdate, account }) {
      if (user) { // This 'user' is from signIn callback or adapter's createUser
        const typedUser = user as MyAppUser;
        token.id = typedUser.id; // This ID should be the string version of MongoDB _id
        token.role = typedUser.role ?? defaultGamification.role;
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges ?? defaultGamification.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; 
        token.email = typedUser.email; 
        if (account?.provider === "google" && account.access_token) { 
            token.accessToken = account.access_token; 
        }
      }

      if (trigger === "update" && sessionUpdate?.user) {
        const sessionUserUpdate = sessionUpdate.user as Partial<MyAppUser>;
        if (sessionUserUpdate.name) token.name = sessionUserUpdate.name;
        if (sessionUserUpdate.image) token.picture = sessionUserUpdate.image;
        if (sessionUserUpdate.role) token.role = sessionUserUpdate.role;
        if (sessionUserUpdate.totalXP !== undefined) token.totalXP = sessionUserUpdate.totalXP;
        if (sessionUserUpdate.level !== undefined) token.level = sessionUserUpdate.level;
        if (sessionUserUpdate.badges) token.badges = sessionUserUpdate.badges;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedSessionUser = session.user as MyAppUser;
        typedSessionUser.id = token.id as string;
        typedSessionUser.role = (token.role as string) ?? defaultGamification.role;
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamification.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamification.level;
        typedSessionUser.badges = (token.badges as string[]) ?? defaultGamification.badges;
        
        typedSessionUser.name = token.name;
        typedSessionUser.email = token.email;
        typedSessionUser.image = token.picture as string | null | undefined;

        if (token.accessToken) {
          (session as any).accessToken = token.accessToken; 
        }
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
    
