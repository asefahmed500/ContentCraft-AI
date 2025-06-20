
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { UserFeedback } from '@/types/content';

// This is a mock implementation. In a real scenario, you'd save this to a database.
// For example, you might have a 'feedback' collection, or embed feedback within campaign documents.

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized. User not authenticated.' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json() as Omit<UserFeedback, 'timestamp'>;

    if (!body.campaignId || !body.contentFormat || body.rating === undefined) {
      return NextResponse.json({ error: 'Missing required fields: campaignId, contentFormat, rating' }, { status: 400 });
    }

    if (body.rating !== 1 && body.rating !== -1) {
        return NextResponse.json({ error: 'Invalid rating value. Must be 1 or -1.' }, { status: 400 });
    }

    const feedbackEntry: UserFeedback = {
      ...body,
      timestamp: new Date(),
      // In a real system, you might add userId here too
      // userId: userId, 
    };

    // Simulate saving feedback to agent logs or a database
    console.log("User Feedback Received:", JSON.stringify(feedbackEntry, null, 2));

    // Example: Store in a 'feedback' collection in MongoDB (conceptual)
    // const client = await clientPromise;
    // const db = client.db();
    // const feedbackCollection = db.collection('feedback_logs');
    // await feedbackCollection.insertOne({ ...feedbackEntry, userId });

    return NextResponse.json({ message: 'Feedback submitted successfully.', data: feedbackEntry }, { status: 200 });

  } catch (error) {
    console.error("Feedback API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to submit feedback.', details: errorMessage }, { status: 500 });
  }
}
