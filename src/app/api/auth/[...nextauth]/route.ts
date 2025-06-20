
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
}

const defaultGamificationAndStatus = {
  role: 'viewer' as 'viewer' | 'editor' | 'admin',
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

      if (dbUser && (dbUser as unknown as MyAppUser).isBanned) {
        throw new Error("This account has been suspended."); // Or return false for a generic error
      }
      
      if (account?.provider === "google") {
        const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });

        if (dbUser) { 
          const updates: Partial<AdapterUser & MyAppUser> = {};
          let needsDbUpdate = false;
          user.id = dbUser._id.toString(); 

          if (googleProfile?.name && dbUser.name !== googleProfile.name) {
            updates.name = googleProfile.name; user.name = googleProfile.name; needsDbUpdate = true;
          }
          const googleImage = googleProfile?.picture || googleProfile?.image;
          if (googleImage && dbUser.image !== googleImage) {
            updates.image = googleImage; user.image = googleImage; needsDbUpdate = true;
          }
          if (!dbUser.emailVerified && googleProfile?.email_verified === true) {
            updates.emailVerified = new Date(); (user as MyAppUser).emailVerified = updates.emailVerified; needsDbUpdate = true;
          } else {
            (user as MyAppUser).emailVerified = dbUser.emailVerified ? new Date(dbUser.emailVerified) : null;
          }

          const appDbUser = dbUser as unknown as MyAppUser;
          if (typeof appDbUser.role === 'undefined') { updates.role = defaultGamificationAndStatus.role; (user as MyAppUser).role = defaultGamificationAndStatus.role; needsDbUpdate = true; } 
          else { (user as MyAppUser).role = appDbUser.role; }
          if (typeof appDbUser.totalXP === 'undefined') { updates.totalXP = defaultGamificationAndStatus.totalXP; (user as MyAppUser).totalXP = defaultGamificationAndStatus.totalXP; needsDbUpdate = true; } 
          else { (user as MyAppUser).totalXP = appDbUser.totalXP; }
          if (typeof appDbUser.level === 'undefined') { updates.level = defaultGamificationAndStatus.level; (user as MyAppUser).level = defaultGamificationAndStatus.level; needsDbUpdate = true; } 
          else { (user as MyAppUser).level = appDbUser.level; }
          if (typeof appDbUser.badges === 'undefined') { updates.badges = defaultGamificationAndStatus.badges; (user as MyAppUser).badges = defaultGamificationAndStatus.badges; needsDbUpdate = true; } 
          else { (user as MyAppUser).badges = appDbUser.badges; }
          if (typeof appDbUser.isBanned === 'undefined') { updates.isBanned = defaultGamificationAndStatus.isBanned; (user as MyAppUser).isBanned = defaultGamificationAndStatus.isBanned; needsDbUpdate = true; }
          else { (user as MyAppUser).isBanned = appDbUser.isBanned; }
          
          if (needsDbUpdate) {
            await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
          }
        } else { 
          (user as MyAppUser).role = defaultGamificationAndStatus.role;
          (user as MyAppUser).totalXP = defaultGamificationAndStatus.totalXP;
          (user as MyAppUser).level = defaultGamificationAndStatus.level;
          (user as MyAppUser).badges = defaultGamificationAndStatus.badges;
          (user as MyAppUser).isBanned = defaultGamificationAndStatus.isBanned;
          if (googleProfile?.email_verified === true && !(user as MyAppUser).emailVerified) {
             (user as MyAppUser).emailVerified = new Date();
          }
        }
      } else if (user && !account) { 
        const typedUser = user as MyAppUser;
        user.id = typedUser.id; 
        (user as MyAppUser).role = typedUser.role ?? defaultGamificationAndStatus.role;
        (user as MyAppUser).totalXP = typedUser.totalXP ?? defaultGamificationAndStatus.totalXP;
        (user as MyAppUser).level = typedUser.level ?? defaultGamificationAndStatus.level;
        (user as MyAppUser).badges = typedUser.badges ?? defaultGamificationAndStatus.badges;
        (user as MyAppUser).emailVerified = typedUser.emailVerified ? new Date(typedUser.emailVerified) : null;
        (user as MyAppUser).isBanned = typedUser.isBanned ?? defaultGamificationAndStatus.isBanned;
      }
      
      if ((user as MyAppUser).isBanned) {
        return false; // Prevent sign-in for banned users
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

      if (trigger === "update" && sessionUpdate?.user) {
        const updateData = sessionUpdate.user as Partial<MyAppUser>;
        if (updateData.name) token.name = updateData.name;
        if (updateData.image) token.picture = updateData.image;
        if (updateData.role) token.role = updateData.role;
        if (updateData.totalXP !== undefined) token.totalXP = updateData.totalXP;
        if (updateData.level !== undefined) token.level = updateData.level;
        if (updateData.badges) token.badges = updateData.badges;
        if (updateData.isBanned !== undefined) token.isBanned = updateData.isBanned;
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

        if (typedSessionUser.isBanned) {
             // This is a good place to potentially invalidate the session or handle client-side logout
             // For now, the middleware will catch subsequent requests from banned users.
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login on auth errors, including ban
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
