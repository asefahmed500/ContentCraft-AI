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
}

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
          id: user._id.toString(), // Important: NextAuth expects id as string
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role || 'viewer', // Default role if not set
        } as MyAppUser;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as MyAppUser;
        token.id = typedUser.id || (typedUser as any)._id?.toString(); // Handle both direct id and _id from DB
        token.role = typedUser.role || 'viewer';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedSessionUser = session.user as MyAppUser;
        typedSessionUser.id = token.id as string;
        typedSessionUser.role = token.role as string;
      }
      return session;
    },
    // Handle user creation for OAuth providers
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const client: MongoClient = await clientPromise;
        const db: Db = client.db();
        const usersCollection = db.collection<MyAppUser>("users");
        
        const existingUser = await usersCollection.findOne({ email: user.email as string });
        if (!existingUser) {
          // Create a new user if they don't exist
          await usersCollection.insertOne({
            email: user.email as string,
            name: user.name,
            image: user.image,
            emailVerified: new Date(), // Assume email is verified via Google
            role: 'viewer', // Default role
            // provider specific details can be stored in accounts collection by adapter
          });
        } else {
            // Update user image if it has changed from Google
            if (existingUser.image !== user.image) {
                await usersCollection.updateOne(
                    { email: user.email as string },
                    { $set: { image: user.image } }
                );
            }
        }
      }
      return true; // Continue with sign in
    }
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Optional: custom error page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
