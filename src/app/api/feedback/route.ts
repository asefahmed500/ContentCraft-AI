
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { UserFeedback } from '@/types/content';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';


export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const userId = token.id as string;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'A valid campaignId is required.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const feedbackCollection = db.collection('feedback_logs');

    const userFeedback = await feedbackCollection.find({
      userId: new ObjectId(userId),
      campaignId: new ObjectId(campaignId)
    }).project({ contentVersionId: 1, contentFormat: 1, rating: 1, _id: 0 }).toArray();

    return NextResponse.json(userFeedback, { status: 200 });

  } catch (error) {
    console.error("Fetch Feedback API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch feedback history.', details: errorMessage }, { status: 500 });
  }
}

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
    
    if(!ObjectId.isValid(body.campaignId)) {
        return NextResponse.json({ error: 'Invalid campaignId format.' }, { status: 400 });
    }
    
    if (body.contentVersionId && typeof body.contentVersionId !== 'string') {
      return NextResponse.json({ error: 'Invalid contentVersionId format, must be a string.' }, { status: 400 });
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const feedbackCollection = db.collection('feedback_logs');
    
    // Check for existing feedback from this user for this specific content piece
    const existingFeedback = await feedbackCollection.findOne({
        userId: new ObjectId(userId),
        campaignId: new ObjectId(body.campaignId),
        contentVersionId: body.contentVersionId,
        contentFormat: body.contentFormat
    });

    if (existingFeedback) {
        return NextResponse.json({ error: 'You have already submitted feedback for this item.' }, { status: 409 });
    }


    const feedbackEntry: UserFeedback = {
      ...body,
      userId: userId, 
      timestamp: new Date(),
    };
    
    const result = await feedbackCollection.insertOne({
        ...feedbackEntry,
        userId: new ObjectId(userId), // Store as ObjectId
        campaignId: new ObjectId(feedbackEntry.campaignId), // Store as ObjectId
        contentVersionId: feedbackEntry.contentVersionId, // Store as string ID from version object
    });

    if (!result.insertedId) {
        console.error("Failed to insert feedback into MongoDB:", feedbackEntry);
        return NextResponse.json({ error: 'Failed to save feedback entry.' }, { status: 500 });
    }

    return NextResponse.json({ 
        message: 'Feedback submitted successfully.', 
        feedbackId: result.insertedId.toString()
    }, { status: 200 });

  } catch (error) {
    console.error("Feedback API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to submit feedback.', details: errorMessage }, { status: 500 });
  }
}
