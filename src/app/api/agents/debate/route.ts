import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { runCreativeWarRoom, type CreativeWarRoomInput } from '@/ai/flows/agent-debate';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign } from '@/types/content';


interface DebateApiInput {
  campaignId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id;

    const body = await request.json() as DebateApiInput;
    const { campaignId } = body;

    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Valid campaign ID is required.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    // Verify user owns the campaign
    const campaign = await campaignsCollection.findOne({
      _id: new ObjectId(campaignId),
      userId: userId
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or user is not authorized to access it.' }, { status: 404 });
    }

    if (!campaign.brief || !campaign.title) {
      return NextResponse.json({ error: 'Campaign brief and title are required to run the war room.' }, { status: 400 });
    }

    const warRoomInput: CreativeWarRoomInput = {
      brief: campaign.brief,
      title: campaign.title,
    };

    const result = await runCreativeWarRoom(warRoomInput);

    const debateLogWithTimestamps = result.debateLog.map(interaction => ({
        ...interaction,
        timestamp: new Date()
    }));

    // Save the debate log to the campaign
    const updatedResult = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId) },
      { $set: { 
          agentDebates: debateLogWithTimestamps,
          status: 'review', // Move status to review after debate
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!updatedResult.value) {
        return NextResponse.json({ error: 'Failed to save debate results to campaign.' }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Agent Debate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to conduct agent debate.', details: errorMessage }, { status: 500 });
  }
}
