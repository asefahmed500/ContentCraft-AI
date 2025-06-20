
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { UserFeedback } from '@/types/content';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized. User not authenticated.' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json() as Omit<UserFeedback, 'timestamp' | 'userId'>;

    if (!body.campaignId || !body.contentFormat || body.rating === undefined) {
      return NextResponse.json({ error: 'Missing required fields: campaignId, contentFormat, rating' }, { status: 400 });
    }

    if (body.rating !== 1 && body.rating !== -1) {
        return NextResponse.json({ error: 'Invalid rating value. Must be 1 or -1.' }, { status: 400 });
    }

    const feedbackEntry: UserFeedback & { userId: string } = {
      ...body,
      userId: userId, // Add the authenticated user's ID
      timestamp: new Date(),
    };

    // Store in 'feedback_logs' collection in MongoDB
    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const feedbackCollection = db.collection('feedback_logs');
    
    const result = await feedbackCollection.insertOne(feedbackEntry);

    if (!result.insertedId) {
        console.error("Failed to insert feedback into MongoDB:", feedbackEntry);
        return NextResponse.json({ error: 'Failed to save feedback entry.' }, { status: 500 });
    }

    // The toast for XP is handled client-side.
    // If actual XP update is needed here, that would be an additional step to update user document.

    return NextResponse.json({ message: 'Feedback submitted successfully.', data: { ...feedbackEntry, _id: result.insertedId } }, { status: 200 });

  } catch (error) {
    console.error("Feedback API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to submit feedback.', details: errorMessage }, { status: 500 });
  }
}
