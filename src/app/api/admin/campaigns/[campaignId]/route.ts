
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign } from '@/types/content';


export async function DELETE(request: NextRequest, context: any) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { campaignId } = context.params;
    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID provided.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection('campaigns');
    const feedbackCollection = db.collection('feedback_logs');

    // Admins can delete any campaign
    const deleteResult = await campaignsCollection.deleteOne({ _id: new ObjectId(campaignId) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: 'Campaign not found or already deleted.' }, { status: 404 });
    }

    // Also delete associated feedback to prevent orphaned data.
    await feedbackCollection.deleteMany({ campaignId: new ObjectId(campaignId) });

    return NextResponse.json({ message: 'Campaign and associated feedback deleted successfully by admin.' }, { status: 200 });

  } catch (error) {
    console.error("Admin Delete Campaign API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to delete campaign by admin.', details: errorMessage }, { status: 500 });
  }
}
