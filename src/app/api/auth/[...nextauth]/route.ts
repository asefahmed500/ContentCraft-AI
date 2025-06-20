
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

        if (!dbUser.password) { // User signed up with OAuth, no password set
            throw new Error("This account was created using a social login. Please sign in with Google or another provider.");
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
          emailVerified: dbUser.emailVerified,
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

      const dbUser = await usersCollection.findOne({ email: user.email as string });
      
      if (dbUser) { // Existing user
        const updates: Partial<AdapterUser & MyAppUser> = {};
        let needsDbUpdate = false;

        // IMPORTANT: Ensure the user object passed to JWT uses the DB user's ID
        user.id = dbUser._id.toString(); 

        if (account?.provider === "google") {
          // Use 'profile' from Google for name/image updates as it's the direct provider data
          const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });

          if (googleProfile?.name && dbUser.name !== googleProfile.name) {
            updates.name = googleProfile.name;
            user.name = googleProfile.name; // Update the user object for JWT
            needsDbUpdate = true;
          }
          // Google often provides 'picture' instead of 'image' in its profile
          const googleImage = googleProfile?.picture || googleProfile?.image;
          if (googleImage && dbUser.image !== googleImage) {
            updates.image = googleImage;
            user.image = googleImage; // Update the user object for JWT
            needsDbUpdate = true;
          }
          
          if (!dbUser.emailVerified && googleProfile?.email_verified === true) {
            updates.emailVerified = new Date();
            user.emailVerified = updates.emailVerified; // Update for JWT
            needsDbUpdate = true;
          }
        }

        // Ensure gamification fields are present in DB and consistently on the user object for JWT
        const currentRole = (dbUser as MyAppUser).role;
        if (typeof currentRole === 'undefined') { 
          updates.role = defaultGamification.role; 
          needsDbUpdate = true; 
        }
        (user as MyAppUser).role = currentRole ?? updates.role ?? defaultGamification.role;

        const currentTotalXP = (dbUser as MyAppUser).totalXP;
        if (typeof currentTotalXP === 'undefined') { 
          updates.totalXP = defaultGamification.totalXP; 
          needsDbUpdate = true; 
        }
        (user as MyAppUser).totalXP = currentTotalXP ?? updates.totalXP ?? defaultGamification.totalXP;
        
        const currentLevel = (dbUser as MyAppUser).level;
        if (typeof currentLevel === 'undefined') { 
          updates.level = defaultGamification.level; 
          needsDbUpdate = true; 
        }
        (user as MyAppUser).level = currentLevel ?? updates.level ?? defaultGamification.level;

        const currentBadges = (dbUser as MyAppUser).badges;
        if (typeof currentBadges === 'undefined') { 
          updates.badges = defaultGamification.badges; 
          needsDbUpdate = true; 
        }
        (user as MyAppUser).badges = currentBadges ?? updates.badges ?? defaultGamification.badges;
        
        // Persist DB updates if any
        if (needsDbUpdate) {
          await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
        }
        
        // Ensure the main user fields on the user object (for JWT) are from dbUser after potential updates
        user.name = (updates.name || dbUser.name) ?? user.name;
        user.image = (updates.image || dbUser.image) ?? user.image;
        user.emailVerified = (updates.emailVerified || dbUser.emailVerified) ?? user.emailVerified;

      } else { // New user via OAuth (e.g., first Google Sign-In)
        // Augment the user object (from provider) with our defaults before adapter's createUser
        (user as MyAppUser).role = defaultGamification.role;
        (user as MyAppUser).totalXP = defaultGamification.totalXP;
        (user as MyAppUser).level = defaultGamification.level;
        (user as MyAppUser).badges = defaultGamification.badges;
        
        const googleProfile = profile as { email_verified?: boolean };
        if (account?.provider === "google" && googleProfile?.email_verified === true) {
            user.emailVerified = new Date(); 
        }
        // The adapter's createUser will be called with this 'user' object.
        // The 'id' (string version of _id) will be set by the adapter on the user object it returns,
        // which then becomes the 'user' for the JWT callback.
      }
      return true; // Allow sign in
    },
    async jwt({ token, user, trigger, session: sessionUpdate, account }) {
      // 'user' object is only passed on initial sign-in.
      // It has been enriched by the 'signIn' callback OR by the adapter for new users.
      if (user) { 
        const typedUser = user as MyAppUser; // user object here should have string id
        token.id = typedUser.id; 
        token.role = typedUser.role ?? defaultGamification.role;
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges ?? defaultGamification.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; 
        token.email = typedUser.email; 
        if (account?.provider === "google" && account.access_token) { 
            token.accessToken = account.access_token; // Store access token if needed for Google API calls
        }
      }

      // Handle session updates triggered by client (e.g., update({ name: "New Name" }))
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
      // Populate session.user with fields from the token
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
          (session as any).accessToken = token.accessToken; // Expose access token on session if needed
        }
      }
      return session;
    },
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

    