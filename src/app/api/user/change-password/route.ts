
'use server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { ObjectId, type MongoClient, type Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import type { User as AdapterUser } from 'next-auth/adapters'; // For password field from DB

interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized. User not authenticated.' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json() as ChangePasswordPayload;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }
    
    if (newPassword === currentPassword) {
        return NextResponse.json({ error: 'New password cannot be the same as the current password.' }, { status: 400 });
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const usersCollection = db.collection<AdapterUser>('users'); // Use AdapterUser to ensure 'password' field is typed

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Check if user signed up with credentials (has a password)
    if (!user.password) {
        return NextResponse.json({ error: 'Cannot change password for accounts signed up with a social provider.' }, { status: 400 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedNewPassword, updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      // This could happen if, for some reason, the update didn't go through, though unlikely if user and password checks passed.
      return NextResponse.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password changed successfully.' }, { status: 200 });

  } catch (error) {
    console.error("Change Password API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to change password.', details: errorMessage }, { status: 500 });
  }
}
