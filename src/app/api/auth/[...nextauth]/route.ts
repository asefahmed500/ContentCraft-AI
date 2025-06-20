
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { User as NextAuthUser, Account, Profile } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';


interface MyAppUser extends NextAuthUser {
  role?: string;
  id?: string;
  _id?: string; // MongoDB ObjectId as string
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

        const user = await usersCollection.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email.");
        }

        if (!user.password) {
            throw new Error("This account was created using a social login. Please sign in with Google.");
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
          role: (user as MyAppUser).role ?? defaultGamification.role,
          totalXP: (user as MyAppUser).totalXP ?? defaultGamification.totalXP,
          level: (user as MyAppUser).level ?? defaultGamification.level,
          badges: (user as MyAppUser).badges ?? defaultGamification.badges,
        } as MyAppUser;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      if (user) { // user object is available on initial sign in
        const typedUser = user as MyAppUser;
        token.id = typedUser.id || typedUser._id;
        token.role = typedUser.role ?? defaultGamification.role;
        token.totalXP = typedUser.totalXP ?? defaultGamification.totalXP;
        token.level = typedUser.level ?? defaultGamification.level;
        token.badges = typedUser.badges ?? defaultGamification.badges;
        if (account) { // account is available on initial sign in
            token.accessToken = account.access_token; // Example for Google
        }
      }

      // This block allows updating the JWT token when the session is updated client-side
      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as MyAppUser;
        if (sessionUser.name) token.name = sessionUser.name;
        if (sessionUser.image) token.picture = sessionUser.image; // Note: NextAuth uses 'picture' in JWT for image
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
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db(getDbName());
      const usersCollection = db.collection<AdapterUser>("users");

      // For OAuth, the adapter should have created/linked the user.
      // For credentials, authorize function handles user validation.
      // This callback is mainly for post-processing or custom logic.
      let dbUser = await usersCollection.findOne({ email: user.email as string });

      if (dbUser) {
        // User exists in DB. Ensure all our custom fields are present and update if necessary.
        const updates: Partial<MyAppUser> = {};
        let needsDbUpdate = false;

        // Sync name/image from provider if they've changed
        if (user.name && dbUser.name !== user.name) {
          updates.name = user.name;
        }
        if (user.image && dbUser.image !== user.image) {
          updates.image = user.image;
        }
        // Update emailVerified for Google sign-ins if profile indicates verification
        if (account?.provider === "google" && !dbUser.emailVerified && (profile as any)?.email_verified === true) {
          updates.emailVerified = new Date();
        }
        
        if(Object.keys(updates).length > 0) needsDbUpdate = true;


        // Check and initialize custom fields if they are missing on the DB record
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
          // Re-fetch dbUser to get the accurately merged data for enriching the user object below
          dbUser = await usersCollection.findOne({ _id: dbUser._id });
        }

        // Enrich the `user` object (which NextAuth passes to the JWT callback)
        // with data from our database, ensuring defaults are applied.
        user.id = dbUser!._id!.toString(); // dbUser is guaranteed to exist here
        (user as MyAppUser).role = (dbUser as MyAppUser).role ?? defaultGamification.role;
        (user as MyAppUser).totalXP = (dbUser as MyAppUser).totalXP ?? defaultGamification.totalXP;
        (user as MyAppUser).level = (dbUser as MyAppUser).level ?? defaultGamification.level;
        (user as MyAppUser).badges = (dbUser as MyAppUser).badges ?? defaultGamification.badges;
        user.image = dbUser!.image; // Use the potentially updated image from DB
        user.name = dbUser!.name;   // Use the potentially updated name from DB
        user.emailVerified = dbUser!.emailVerified;

      } else {
        // This case implies a new user not yet fully processed by the adapter,
        // or an issue if `authorize` (for credentials) didn't provide a user.
        // For new OAuth users, the adapter's `createUser` is typically called.
        // We augment the `user` object passed from the provider with defaults.
        // These defaults will be included when the adapter creates the user.
        (user as MyAppUser).role = defaultGamification.role;
        (user as MyAppUser).totalXP = defaultGamification.totalXP;
        (user as MyAppUser).level = defaultGamification.level;
        (user as MyAppUser).badges = defaultGamification.badges;
        if (account?.provider === "google" && (profile as any)?.email_verified === true) {
            user.emailVerified = new Date(); // Set emailVerified for new Google users
        }
      }
      return true; // Allow the sign-in
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
