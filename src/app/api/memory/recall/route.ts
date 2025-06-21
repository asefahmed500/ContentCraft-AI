
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { analyzeCampaignHistory } from '@/ai/flows/campaign-memory-flow';
import type { Campaign } from '@/types/content';
import type { CampaignSummary } from '@/types/memory';

interface RecallPayload {
  userId: string;
  currentCampaignBrief: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json() as RecallPayload;
    const { userId, currentCampaignBrief } = body;

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID provided.' }, { status: 400 });
    }
     if (!currentCampaignBrief) {
      return NextResponse.json({ error: 'Current campaign brief is required for context.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Campaign>('campaigns');

    // Fetch last 10 campaigns for the user to create a summary
    const userCampaigns = await campaignsCollection.find(
      { userId: userId },
      { 
        projection: { title: 1, status: 1, tone: 1, contentVersions: 1 },
        sort: { createdAt: -1 },
        limit: 10 
      }
    ).toArray();

    if (userCampaigns.length === 0) {
        return NextResponse.json({
            insights: ["No prior campaign history found for this user."],
            suggestions: ["Start fresh! This is a great opportunity to establish a baseline.", "Consider defining a primary tone and 2-3 key content formats for this first campaign."],
            confidenceScore: 10,
        }, { status: 200 });
    }

    const pastCampaignsSummary: CampaignSummary[] = userCampaigns.map(campaign => {
        const finalVersion = campaign.contentVersions?.[campaign.contentVersions.length - 1];
        const contentFormats = finalVersion ? Object.keys(finalVersion.multiFormatContentSnapshot) : [];
        return {
            title: campaign.title,
            status: campaign.status,
            tone: campaign.tone,
            contentFormats: contentFormats
        };
    });

    const result = await analyzeCampaignHistory({
        pastCampaignsSummary,
        currentCampaignBrief
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Campaign Memory API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to analyze campaign history.', details: errorMessage }, { status: 500 });
  }
}
