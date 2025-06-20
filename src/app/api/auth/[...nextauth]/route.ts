
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { User as NextAuthUser } from 'next-auth';

interface MyAppUser extends NextAuthUser {
  role?: string;
  id?: string; // Ensure id is part of the user type
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
    databaseName: process.env.MONGODB_DB_NAME || undefined, // Optional: specify DB name if not in URI
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
        const db: Db = client.db();
        const usersCollection = db.collection<MyAppUser>("users");

        const user = await usersCollection.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email.");
        }

        if (!user.password) {
            throw new Error("This account was created using a social login.");
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
          role: user.role || 'viewer',
          totalXP: user.totalXP ?? defaultGamification.totalXP,
          level: user.level ?? defaultGamification.level,
          badges: user.badges || defaultGamification.badges, // `||` is fine for arrays defaulting to empty
        } as MyAppUser;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.image) token.picture = session.user.image; 
        if ((session.user as MyAppUser).role) token.role = (session.user as MyAppUser).role;
        if ((session.user as MyAppUser).totalXP !== undefined) token.totalXP = (session.user as MyAppUser).totalXP;
        if ((session.user as MyAppUser).level !== undefined) token.level = (session.user as MyAppUser).level;
        if ((session.user as MyAppUser).badges) token.badges = (session.user as MyAppUser).badges;
        return token;
      }

      if (user) {
        const typedUser = user as MyAppUser;
        token.id = typedUser.id || (typedUser as any)._id?.toString();
        token.role = typedUser.role || 'viewer';
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges || defaultGamification.badges;
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
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db();
      const usersCollection = db.collection<MyAppUser>("users");
      
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (account?.provider === 'google') {
        if (!dbUser) {
          const newUserDoc: Partial<MyAppUser> = {
            email: user.email as string,
            name: user.name,
            image: user.image,
            emailVerified: new Date(),
            role: 'viewer',
            totalXP: defaultGamification.totalXP,
            level: defaultGamification.level,
            badges: defaultGamification.badges,
          };
          const result = await usersCollection.insertOne(newUserDoc as any); 
          dbUser = { ...newUserDoc, _id: result.insertedId } as any;
        } else {
          const updates: Partial<MyAppUser> = {};
          if (dbUser.image !== user.image && user.image) updates.image = user.image; // check user.image exists
          if (dbUser.name !== user.name && user.name) updates.name = user.name; // update name if changed via Google
          if (dbUser.totalXP === undefined) updates.totalXP = defaultGamification.totalXP;
          if (dbUser.level === undefined) updates.level = defaultGamification.level;
          if (dbUser.badges === undefined) updates.badges = defaultGamification.badges;
          if (Object.keys(updates).length > 0) {
            await usersCollection.updateOne(
                { email: user.email as string },
                { $set: updates }
            );
            // After updating, re-fetch dbUser to get the latest data
            dbUser = await usersCollection.findOne({ email: user.email as string });
          }
        }
      }
      
      if (dbUser) {
        user.id = dbUser._id!.toString(); 
        (user as MyAppUser).role = dbUser.role || 'viewer';
        (user as MyAppUser).totalXP = dbUser.totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = dbUser.level ?? defaultGamification.level;
        (user as MyAppUser).badges = dbUser.badges || defaultGamification.badges;
      }
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
