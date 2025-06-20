
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';

interface UpdateUserPayload {
  role?: 'viewer' | 'editor' | 'admin';
  isBanned?: boolean;
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
    }

    const body = await request.json() as UpdateUserPayload;
    const { role, isBanned } = body;

    if (role === undefined && isBanned === undefined) {
      return NextResponse.json({ error: 'No update parameters provided (role or isBanned).' }, { status: 400 });
    }

    const updateData: Partial<UpdateUserPayload & { updatedAt: Date }> = { updatedAt: new Date() };
    if (role !== undefined) {
      if (!['viewer', 'editor', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (isBanned !== undefined) {
      updateData.isBanned = isBanned;
    }
    
    // Prevent admin from accidentally changing their own role or banning themselves via this specific endpoint
    // They should manage their own account through settings or direct DB access if absolutely necessary.
    if (token.id === userId && (updateData.role !== 'admin' || updateData.isBanned === true)) {
        return NextResponse.json({ error: 'Admins cannot change their own role to non-admin or ban themselves through this panel.' }, { status: 403 });
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const usersCollection = db.collection('users');

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'User not found or update failed.' }, { status: 404 });
    }
    
    const updatedUser = {
        id: (result.value._id as ObjectId).toString(),
        name: result.value.name,
        email: result.value.email,
        role: result.value.role,
        isBanned: result.value.isBanned,
        totalXP: result.value.totalXP,
        level: result.value.level,
    };

    return NextResponse.json({ message: 'User updated successfully.', user: updatedUser }, { status: 200 });

  } catch (error) {
    console.error("Admin Update User API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update user.', details: errorMessage }, { status: 500 });
  }
}
