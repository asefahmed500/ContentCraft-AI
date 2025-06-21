

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
  role?: 'viewer' | 'editor' | 'admin';
  id: string; 
  _id?: ObjectId | string; 
  totalXP?: number;
  level?: number;
  badges?: string[];
  emailVerified?: Date | null;
  isBanned?: boolean; 
  createdAt?: Date;
  updatedAt?: Date;
}

const defaultGamificationAndStatus = {
  role: 'editor' as 'viewer' | 'editor' | 'admin', // Default to editor now
  totalXP: 0,
  level: 1,
  badges: [] as string[],
  isBanned: false,
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
      },
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
        
        const appUser = dbUser as unknown as MyAppUser;
        if (appUser.isBanned) {
            throw new Error("This account has been suspended.");
        }

        return {
          id: appUser._id!.toString(), 
          email: appUser.email,
          name: appUser.name,
          image: appUser.image,
          role: appUser.role ?? defaultGamificationAndStatus.role,
          totalXP: appUser.totalXP ?? defaultGamificationAndStatus.totalXP,
          level: appUser.level ?? defaultGamificationAndStatus.level,
          badges: appUser.badges ?? defaultGamificationAndStatus.badges,
          emailVerified: appUser.emailVerified ? new Date(appUser.emailVerified) : null,
          isBanned: appUser.isBanned ?? defaultGamificationAndStatus.isBanned,
          createdAt: appUser.createdAt ? new Date(appUser.createdAt) : undefined,
          updatedAt: appUser.updatedAt ? new Date(appUser.updatedAt) : undefined,
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
      const usersCollection = db.collection<AdapterUser & Partial<MyAppUser>>("users");
      
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (dbUser && dbUser.isBanned) {
        throw new Error("This account has been suspended.");
      }
      
      const updates: Partial<AdapterUser & MyAppUser> = {};
      let needsDbUpdate = false;
      const isNewUser = !dbUser;

      if (dbUser) {
        user.id = dbUser._id.toString(); 
      }

      if (account?.provider === "google") {
        const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });
        if (googleProfile?.name && (!dbUser || dbUser.name !== googleProfile.name)) {
          updates.name = googleProfile.name; user.name = googleProfile.name; needsDbUpdate = true;
        }
        const googleImage = googleProfile?.picture || googleProfile?.image;
        if (googleImage && (!dbUser || dbUser.image !== googleImage)) {
          updates.image = googleImage; user.image = googleImage; needsDbUpdate = true;
        }
        if (!dbUser?.emailVerified && googleProfile?.email_verified === true) {
          updates.emailVerified = new Date(); (user as MyAppUser).emailVerified = updates.emailVerified; needsDbUpdate = true;
        } else if (dbUser?.emailVerified) {
          (user as MyAppUser).emailVerified = new Date(dbUser.emailVerified);
        } else {
           (user as MyAppUser).emailVerified = null;
        }
      } else if (dbUser?.emailVerified) {
          (user as MyAppUser).emailVerified = new Date(dbUser.emailVerified);
      } else {
          (user as MyAppUser).emailVerified = null;
      }
      
      if (isNewUser) {
        Object.assign(updates, defaultGamificationAndStatus);
        Object.assign(user, defaultGamificationAndStatus);
        needsDbUpdate = true;
      } else {
         if (typeof (dbUser?.role) === 'undefined') { updates.role = defaultGamificationAndStatus.role; (user as MyAppUser).role = defaultGamificationAndStatus.role; needsDbUpdate = true; } 
        else { (user as MyAppUser).role = dbUser.role; }
        if (typeof (dbUser?.totalXP) === 'undefined') { updates.totalXP = defaultGamificationAndStatus.totalXP; (user as MyAppUser).totalXP = defaultGamificationAndStatus.totalXP; needsDbUpdate = true; } 
        else { (user as MyAppUser).totalXP = dbUser.totalXP; }
        if (typeof (dbUser?.level) === 'undefined') { updates.level = defaultGamificationAndStatus.level; (user as MyAppUser).level = defaultGamificationAndStatus.level; needsDbUpdate = true; } 
        else { (user as MyAppUser).level = dbUser.level; }
        if (typeof (dbUser?.badges) === 'undefined') { updates.badges = defaultGamificationAndStatus.badges; (user as MyAppUser).badges = defaultGamificationAndStatus.badges; needsDbUpdate = true; } 
        else { (user as MyAppUser).badges = dbUser.badges; }
        if (typeof (dbUser?.isBanned) === 'undefined') { updates.isBanned = defaultGamificationAndStatus.isBanned; (user as MyAppUser).isBanned = defaultGamificationAndStatus.isBanned; needsDbUpdate = true; }
        else { (user as MyAppUser).isBanned = dbUser.isBanned; }
      }
      
      if (needsDbUpdate && user.id) { 
        updates.updatedAt = new Date();
        const finalUpdates = { $set: updates };
        if (isNewUser) {
            // For new users created by the adapter, we also set createdAt
            (finalUpdates as any).$setOnInsert = { createdAt: new Date() };
        }
        await usersCollection.updateOne({ _id: new ObjectId(user.id) }, finalUpdates, { upsert: true });
      }
      
      if ((user as MyAppUser).isBanned) { 
        return false; 
      }
      return true; 
    },
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      if (user) { 
        const typedUser = user as MyAppUser; 
        token.id = typedUser.id; 
        token.role = typedUser.role ?? defaultGamificationAndStatus.role;
        token.totalXP = typedUser.totalXP ?? defaultGamificationAndStatus.totalXP;
        token.level = typedUser.level ?? defaultGamificationAndStatus.level;
        token.badges = typedUser.badges ?? defaultGamificationAndStatus.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; 
        token.email = typedUser.email;
        token.isBanned = typedUser.isBanned ?? defaultGamificationAndStatus.isBanned;
      }

      // If user's role is updated by an admin, we need to refresh the token
      if (trigger === "update" && sessionUpdate?.user) {
        const client: MongoClient = await clientPromise;
        const db: Db = client.db(getDbName());
        const usersCollection = db.collection<AdapterUser & Partial<MyAppUser>>("users");
        const dbUser = await usersCollection.findOne({ _id: new ObjectId(token.id as string) });

        if (dbUser) {
            token.name = dbUser.name;
            token.picture = dbUser.image;
            token.role = dbUser.role ?? defaultGamificationAndStatus.role;
            token.totalXP = dbUser.totalXP ?? defaultGamificationAndStatus.totalXP;
            token.level = dbUser.level ?? defaultGamificationAndStatus.level;
            token.badges = dbUser.badges ?? defaultGamificationAndStatus.badges;
            token.isBanned = dbUser.isBanned ?? defaultGamificationAndStatus.isBanned;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedSessionUser = session.user as MyAppUser;
        typedSessionUser.id = token.id as string;
        typedSessionUser.role = (token.role as MyAppUser['role']) ?? defaultGamificationAndStatus.role;
        typedSessionUser.totalXP = (token.totalXP as number) ?? defaultGamificationAndStatus.totalXP;
        typedSessionUser.level = (token.level as number) ?? defaultGamificationAndStatus.level;
        typedSessionUser.badges = (token.badges as string[]) ?? defaultGamificationAndStatus.badges;
        typedSessionUser.isBanned = (token.isBanned as boolean) ?? defaultGamificationAndStatus.isBanned;
        
        typedSessionUser.name = token.name;
        typedSessionUser.email = token.email;
        typedSessionUser.image = token.picture as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', 
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
