
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign, ScheduledPost } from '@/types/content';
import { generateContentStrategy, type ContentStrategyInput } from '@/ai/flows/content-strategy-flow';
import { addDays } from 'date-fns';

export async function POST(request: NextRequest, context: any) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id;

    const { campaignId } = context.params;
    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Valid campaign ID is required.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    // Verify user owns the campaign
    const campaign = await campaignsCollection.findOne({
      _id: new ObjectId(campaignId),
      userId: userId,
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or user is not authorized to access it.' }, { status: 404 });
    }

    const strategyInput: ContentStrategyInput = {
      campaignTitle: campaign.title,
      campaignBrief: campaign.brief,
      targetAudience: campaign.targetAudience,
      contentGoals: campaign.contentGoals,
    };

    const result = await generateContentStrategy(strategyInput);
    
    const today = new Date();
    const scheduledPosts: ScheduledPost[] = result.schedule.map(item => ({
        id: new ObjectId().toString(),
        campaignId: campaignId,
        contentFormat: item.contentType,
        platform: item.platform,
        description: item.actionDescription,
        scheduledAt: addDays(today, item.day - 1),
        status: 'draft',
    }));

    // Save the schedule to the campaign
    const updatedResult = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId) },
      { 
        $set: { 
          scheduledPosts: scheduledPosts,
          status: campaign.status === 'draft' ? 'review' : campaign.status, // Move status if still in draft
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!updatedResult.value) {
        return NextResponse.json({ error: 'Failed to save content schedule to campaign.' }, { status: 500 });
    }

    return NextResponse.json(updatedResult.value, { status: 200 });

  } catch (error) {
    console.error("Content Strategy API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to generate content strategy.', details: errorMessage }, { status: 500 });
  }
}
