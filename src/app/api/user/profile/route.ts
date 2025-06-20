
'use server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { ObjectId, type MongoClient, type Db } from 'mongodb';
import type { User as NextAuthUser } from 'next-auth';

interface UpdateProfilePayload {
  name?: string;
  // Add other updatable profile fields here if needed in the future
}

interface SessionUser extends NextAuthUser {
  id?: string;
  _id?: ObjectId | string;
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized. User not authenticated.' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json() as UpdateProfilePayload;
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required and must be a non-empty string.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const usersCollection = db.collection('users');

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { name: name.trim(), updatedAt: new Date() } },
      { returnDocument: 'after', projection: { name: 1, email: 1, image: 1, role: 1, totalXP: 1, level: 1, badges: 1 } } // Return relevant fields
    );

    if (!result.value) {
      return NextResponse.json({ error: 'User not found or update failed.' }, { status: 404 });
    }
    
    const updatedUser = {
        id: (result.value._id as ObjectId).toString(),
        name: result.value.name,
        email: result.value.email, // For session update consistency
        image: result.value.image, // For session update consistency
        role: result.value.role,
        totalXP: result.value.totalXP,
        level: result.value.level,
        badges: result.value.badges,
    };


    return NextResponse.json({ message: 'Profile updated successfully.', user: updatedUser }, { status: 200 });

  } catch (error) {
    console.error("Update Profile API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update profile.', details: errorMessage }, { status: 500 });
  }
}
