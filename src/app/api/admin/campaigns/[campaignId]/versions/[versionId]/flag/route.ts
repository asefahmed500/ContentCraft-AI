
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign, ContentVersion } from '@/types/content';

interface FlagContentVersionPayload {
  isFlagged: boolean;
  adminModerationNotes?: string;
}

export async function PUT(request: NextRequest, context: any) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { campaignId, versionId } = context.params;
    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID provided.' }, { status: 400 });
    }
    if (!versionId) { // Version ID is a string, not ObjectId
        return NextResponse.json({ error: 'Invalid content version ID provided.' }, { status: 400 });
    }


    const body = await request.json() as FlagContentVersionPayload;
    const { isFlagged, adminModerationNotes } = body;

    if (typeof isFlagged !== 'boolean') {
      return NextResponse.json({ error: 'isFlagged must be a boolean.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection('campaigns');

    const campaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId) }) as Campaign | null;

    if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    const versionIndex = campaign.contentVersions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) {
        return NextResponse.json({ error: 'Content version not found within the campaign.' }, { status: 404 });
    }
    
    const updatedContentVersions = [...campaign.contentVersions];
    updatedContentVersions[versionIndex] = {
        ...updatedContentVersions[versionIndex],
        isFlagged: isFlagged,
        adminModerationNotes: adminModerationNotes !== undefined ? adminModerationNotes : (isFlagged === false ? '' : updatedContentVersions[versionIndex].adminModerationNotes),
        timestamp: updatedContentVersions[versionIndex].timestamp, // Keep original timestamp unless specified
    };


    const result = await campaignsCollection.updateOne(
      { _id: new ObjectId(campaignId) },
      { $set: { 
            contentVersions: updatedContentVersions,
            updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Campaign not found for update.' }, { status: 404 });
    }
    if (result.modifiedCount === 0) {
      // This could happen if the values were already set to the target values
      // Or if there was an issue applying the update.
      console.warn(`Content version flag update for campaign ${campaignId}, version ${versionId} resulted in no modification.`);
    }
    
    const updatedCampaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId) });


    return NextResponse.json({ 
        message: 'Content version moderation status updated successfully.', 
        campaign: updatedCampaign // Return the whole campaign as the version is embedded
    }, { status: 200 });

  } catch (error) {
    console.error("Admin Flag Content Version API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update content version moderation status.', details: errorMessage }, { status: 500 });
  }
}
