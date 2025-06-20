
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
  emailVerified?: Date | null;
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
        
        // Ensure all fields for MyAppUser are present
        return {
          id: dbUser._id!.toString(), 
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          role: (dbUser as unknown as MyAppUser).role ?? defaultGamification.role,
          totalXP: (dbUser as unknown as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (dbUser as unknown as MyAppUser).level ?? defaultGamification.level,
          badges: (dbUser as unknown as MyAppUser).badges ?? defaultGamification.badges,
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
      
      // The 'user' object passed to signIn is what the adapter returns (for OAuth)
      // or what authorize returns (for credentials).
      // For OAuth, if it's a new user, 'user' might be the raw profile from provider,
      // and adapter.createUser will be called after this callback if it returns true.
      // We need to ensure the user object that eventually goes into JWT is complete.

      if (account?.provider === "google") {
        let dbUser = await usersCollection.findOne({ email: user.email as string });
        const googleProfile = profile as (Profile & { picture?: string; email_verified?: boolean });

        if (dbUser) { // Existing user signed in with Google
          const updates: Partial<AdapterUser & MyAppUser> = {};
          let needsDbUpdate = false;

          // Update user.id to be the string version of DB _id for JWT consistency
          // This 'user' object will be passed to JWT callback.
          user.id = dbUser._id.toString(); 

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
            (user as MyAppUser).emailVerified = updates.emailVerified;
            needsDbUpdate = true;
          } else {
            (user as MyAppUser).emailVerified = dbUser.emailVerified ? new Date(dbUser.emailVerified) : null;
          }

          // Ensure custom fields are present in user object for JWT and update DB if needed
          if (typeof (dbUser as unknown as MyAppUser).role === 'undefined') { 
            updates.role = defaultGamification.role; 
            (user as MyAppUser).role = defaultGamification.role;
            needsDbUpdate = true; 
          } else {
            (user as MyAppUser).role = (dbUser as unknown as MyAppUser).role;
          }

          if (typeof (dbUser as unknown as MyAppUser).totalXP === 'undefined') { 
            updates.totalXP = defaultGamification.totalXP; 
            (user as MyAppUser).totalXP = defaultGamification.totalXP;
            needsDbUpdate = true; 
          } else {
            (user as MyAppUser).totalXP = (dbUser as unknown as MyAppUser).totalXP;
          }
          
          if (typeof (dbUser as unknown as MyAppUser).level === 'undefined') { 
            updates.level = defaultGamification.level; 
            (user as MyAppUser).level = defaultGamification.level;
            needsDbUpdate = true; 
          } else {
            (user as MyAppUser).level = (dbUser as unknown as MyAppUser).level;
          }

          if (typeof (dbUser as unknown as MyAppUser).badges === 'undefined') { 
            updates.badges = defaultGamification.badges; 
            (user as MyAppUser).badges = defaultGamification.badges;
            needsDbUpdate = true; 
          } else {
            (user as MyAppUser).badges = (dbUser as unknown as MyAppUser).badges;
          }
          
          if (needsDbUpdate) {
            await usersCollection.updateOne({ _id: dbUser._id }, { $set: updates });
          }
        } else { 
          // New user via Google. Adapter will call createUser.
          // Augment the 'user' object (from Google profile) with defaults.
          // These will be passed to adapter.createUser.
          (user as MyAppUser).role = defaultGamification.role;
          (user as MyAppUser).totalXP = defaultGamification.totalXP;
          (user as MyAppUser).level = defaultGamification.level;
          (user as MyAppUser).badges = defaultGamification.badges;
          if (googleProfile?.email_verified === true && !(user as MyAppUser).emailVerified) {
             (user as MyAppUser).emailVerified = new Date();
          }
          // The 'id' will be set by the adapter after createUser. The user object
          // passed to JWT will be the result of adapter.createUser.
        }
      } else if (user && !account) { // Credentials sign-in
        // 'user' is already from 'authorize' and should be MyAppUser type.
        // We just need to ensure it's correctly typed for JWT.
        const typedUser = user as MyAppUser;
        user.id = typedUser.id; // ensure it's there
        (user as MyAppUser).role = typedUser.role ?? defaultGamification.role;
        (user as MyAppUser).totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = typedUser.level ?? defaultGamification.level;
        (user as MyAppUser).badges = typedUser.badges ?? defaultGamification.badges;
        (user as MyAppUser).emailVerified = typedUser.emailVerified ? new Date(typedUser.emailVerified) : null;
      }
      return true; 
    },
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // The 'user' object is available on initial sign-in.
      // For new OAuth users, 'user' is the result of adapter.createUser.
      // For existing OAuth/Credentials, 'user' is what signIn callback prepared.
      if (user) { 
        const typedUser = user as MyAppUser; // Cast to ensure all fields are accessible
        token.id = typedUser.id; // This ID MUST be the string version of MongoDB _id
        token.role = typedUser.role ?? defaultGamification.role;
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges ?? defaultGamification.badges;
        token.name = typedUser.name;
        token.picture = typedUser.image; // NextAuth uses 'picture' in token for image
        token.email = typedUser.email; 
      }

      // Handle session updates if you use `update()` from `useSession`
      if (trigger === "update" && sessionUpdate?.user) {
        const updateData = sessionUpdate.user as Partial<MyAppUser>;
        if (updateData.name) token.name = updateData.name;
        if (updateData.image) token.picture = updateData.image;
        if (updateData.role) token.role = updateData.role;
        if (updateData.totalXP !== undefined) token.totalXP = updateData.totalXP;
        if (updateData.level !== undefined) token.level = updateData.level;
        if (updateData.badges) token.badges = updateData.badges;
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
    

    
