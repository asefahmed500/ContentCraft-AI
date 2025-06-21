import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { auditUserBehavior, type UserAuditInput } from '@/ai/flows/admin/user-audit';
import { differenceInDays } from 'date-fns';

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    
    const usersCollection = db.collection('users');
    const campaignsCollection = db.collection('campaigns');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    
    const campaignCount = await campaignsCollection.countDocuments({ userId: user._id.toString() });

    const daysSinceJoined = user.createdAt ? differenceInDays(new Date(), new Date(user.createdAt)) : 0;

    const auditInput: UserAuditInput = {
      userName: user.name || 'N/A',
      userRole: user.role || 'editor',
      totalXP: user.totalXP || 0,
      campaignCount: campaignCount,
      daysSinceJoined: Math.max(0, daysSinceJoined), // Ensure it's not negative
    };
    
    const result = await auditUserBehavior(auditInput);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Admin User Audit API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to run user audit.', details: errorMessage }, { status: 500 });
  }
}
