
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { User as NextAuthUser } from 'next-auth';

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

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const usersCollection = db.collection('users');

    const usersFromDb = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    const users: MyAppUser[] = usersFromDb.map(userDoc => ({
      id: (userDoc._id as ObjectId).toString(),
      name: userDoc.name || null,
      email: userDoc.email || null,
      image: userDoc.image || null,
      role: userDoc.role || 'viewer',
      totalXP: userDoc.totalXP || 0,
      level: userDoc.level || 1,
      badges: userDoc.badges || [],
      emailVerified: userDoc.emailVerified ? new Date(userDoc.emailVerified) : null,
      isBanned: userDoc.isBanned || false,
      createdAt: userDoc.createdAt ? new Date(userDoc.createdAt) : undefined,
      updatedAt: userDoc.updatedAt ? new Date(userDoc.updatedAt) : undefined,
    }));

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("Admin Fetch Users API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch users.', details: errorMessage }, { status: 500 });
  }
}
