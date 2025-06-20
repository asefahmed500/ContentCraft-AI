
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
  createdAt?: Date; // Added for completeness in type
  updatedAt?: Date; // Added for completeness in type
}

const defaultGamificationAndStatus = {
  role: 'viewer' as 'viewer' | 'editor' | 'admin',
  totalXP: 0,
  level: 1,
  badges: [] as string[],
  isBanned: false,
  // emailVerified: null, // emailVerified is handled separately by providers
  // createdAt: new Date(), // Set by MongoDB or adapter on creation
  // updatedAt: new Date(), // Set by MongoDB or adapter on creation/update
};

const getDbName = (): string | undefined => {
  const dbName = process.env.MONGODB_DB_NAME;
  return dbName && dbName.trim() !== "" ? dbName.trim() : undefined;
};

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise as Promise<MongoClient>, {
    databaseName: getDbName(),
    // The adapter should handle creation of user documents with default fields if necessary,
    // but we also explicitly add them in `signIn` if missing for robustness.
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
      // Profile callback for Google to ensure our default fields are set if the adapter doesn't do it.
      // However, the `signIn` callback is generally a better place for this logic
      // as it runs after the user is fetched or created by the adapter.
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

        // Ensure all our custom fields are present on the user object returned to NextAuth
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
      const usersCollection = db.collection<AdapterUser>("users"); // Use AdapterUser for DB interaction
      
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (dbUser && (dbUser as unknown as MyAppUser).isBanned) {
        // For signIn, returning false or throwing an error prevents login
        throw new Error("This account has been suspended.");
      }
      
      const updates: Partial<AdapterUser & MyAppUser> = {};
      let needsDbUpdate = false;

      if (dbUser) { // User exists
        user.id = dbUser._id.toString(); // Ensure user.id is set for later JWT/session population
        const appDbUser = dbUser as unknown as MyAppUser;

        // Sync profile info from Google if it's a Google sign-in
        if (account?.provider === "google") {
          const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });
          if (googleProfile?.name && appDbUser.name !== googleProfile.name) {
            updates.name = googleProfile.name; user.name = googleProfile.name; needsDbUpdate = true;
          }
          const googleImage = googleProfile?.picture || googleProfile?.image;
          if (googleImage && appDbUser.image !== googleImage) {
            updates.image = googleImage; user.image = googleImage; needsDbUpdate = true;
          }
          if (!appDbUser.emailVerified && googleProfile?.email_verified === true) {
            updates.emailVerified = new Date(); (user as MyAppUser).emailVerified = updates.emailVerified; needsDbUpdate = true;
          } else {
            (user as MyAppUser).emailVerified = appDbUser.emailVerified ? new Date(appDbUser.emailVerified) : null;
          }
        } else { // For credentials login, ensure NextAuth user object has emailVerified from DB
            (user as MyAppUser).emailVerified = appDbUser.emailVerified ? new Date(appDbUser.emailVerified) : null;
        }

        // Check and set default custom fields if missing on existing user
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
          updates.updatedAt = new Date(); // Ensure updatedAt is set
          await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
        }
      } else { // New user (adapter should have created them, this is a fallback or for enriching user object for JWT)
        const typedUser = user as MyAppUser;
        typedUser.role = defaultGamificationAndStatus.role;
        typedUser.totalXP = defaultGamificationAndStatus.totalXP;
        typedUser.level = defaultGamificationAndStatus.level;
        typedUser.badges = defaultGamificationAndStatus.badges;
        typedUser.isBanned = defaultGamificationAndStatus.isBanned;
        
        // For new Google users, set emailVerified based on profile
        if (account?.provider === "google") {
            const googleProfile = profile as (Profile & { email_verified?: boolean });
            if (googleProfile?.email_verified === true && !typedUser.emailVerified) {
                typedUser.emailVerified = new Date();
                 // The adapter should handle inserting these into the DB.
                 // If the adapter does not add these defaults, this would be a place to ensure they are in the dbUser object.
                 // However, relying on the adapter and then updating in `signIn` is a common pattern.
            }
        }
         // For new credential users, emailVerified is typically null until a verification process.
         // The register route sets it to null.
      }
      
      // Final check for banned status before allowing sign-in
      if ((user as MyAppUser).isBanned) {
        return false; // This is another way to prevent sign-in for banned users
      }
      return true; // Allow sign in
    },
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      if (user) { // This block runs on initial sign-in
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

      // This block runs when the session is updated (e.g., via `update()` from client)
      if (trigger === "update" && sessionUpdate?.user) {
        const updateData = sessionUpdate.user as Partial<MyAppUser>;
        if (updateData.name !== undefined) token.name = updateData.name;
        if (updateData.image !== undefined) token.picture = updateData.image;
        if (updateData.role !== undefined) token.role = updateData.role;
        if (updateData.totalXP !== undefined) token.totalXP = updateData.totalXP;
        if (updateData.level !== undefined) token.level = updateData.level;
        if (updateData.badges !== undefined) token.badges = updateData.badges;
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
        
        // Standard fields from token
        typedSessionUser.name = token.name;
        typedSessionUser.email = token.email;
        typedSessionUser.image = token.picture as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login on auth errors, including ban or other issues
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

