
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign } from '@/types/content';

interface FlagCampaignPayload {
  isFlagged: boolean;
  adminModerationNotes?: string;
}

export async function PUT(request: NextRequest, context: { params: { campaignId: string } }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { campaignId } = context.params;
    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID provided.' }, { status: 400 });
    }

    const body = await request.json() as FlagCampaignPayload;
    const { isFlagged, adminModerationNotes } = body;

    if (typeof isFlagged !== 'boolean') {
      return NextResponse.json({ error: 'isFlagged must be a boolean.' }, { status: 400 });
    }

    const updateData: Partial<Pick<Campaign, 'isFlagged' | 'adminModerationNotes'>> & { updatedAt: Date } = {
      isFlagged,
      updatedAt: new Date(),
    };

    if (adminModerationNotes !== undefined) {
      updateData.adminModerationNotes = adminModerationNotes;
    } else if (isFlagged === false) { // Clear notes if unflagging and no new notes provided
      updateData.adminModerationNotes = ''; 
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection('campaigns');

    const result = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId) }, // Admins can flag any campaign
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Campaign not found or update failed.' }, { status: 404 });
    }
    
    const updatedCampaign = {
      id: (result.value._id as ObjectId).toString(),
      title: result.value.title,
      isFlagged: result.value.isFlagged,
      adminModerationNotes: result.value.adminModerationNotes,
    };

    return NextResponse.json({ message: 'Campaign moderation status updated successfully.', campaign: updatedCampaign }, { status: 200 });

  } catch (error) {
    console.error("Admin Flag Campaign API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update campaign moderation status.', details: errorMessage }, { status: 500 });
  }
}
