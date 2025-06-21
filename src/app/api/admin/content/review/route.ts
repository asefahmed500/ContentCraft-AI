
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign } from '@/types/content';
import { reviewFlaggedContent, type FlaggedContentReviewInput } from '@/ai/flows/admin/flag-review';

interface ReviewApiPayload {
  campaignId: string;
  versionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json() as ReviewApiPayload;
    const { campaignId, versionId } = body;

    if (!campaignId || !ObjectId.isValid(campaignId) || !versionId) {
      return NextResponse.json({ error: 'Valid campaignId and versionId are required.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    const campaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId) });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    const version = campaign.contentVersions?.find(v => v.id === versionId);

    if (!version) {
      return NextResponse.json({ error: 'Content version not found within the campaign.' }, { status: 404 });
    }
    
    // We will just review the first piece of text found in the snapshot for this demonstration.
    const contentToReviewEntry = Object.entries(version.multiFormatContentSnapshot).find(([_, text]) => !!text);
    if (!contentToReviewEntry) {
        return NextResponse.json({ error: 'No reviewable text content found in this version snapshot.' }, { status: 400 });
    }
    const [contentType, flaggedContent] = contentToReviewEntry;

    const reviewInput: FlaggedContentReviewInput = {
      flaggedContent,
      contentType,
      adminModerationNotes: version.adminModerationNotes,
      brandProfile: campaign.brandProfile,
    };

    const result = await reviewFlaggedContent(reviewInput);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Admin Content Review API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to run AI content review.', details: errorMessage }, { status: 500 });
  }
}
