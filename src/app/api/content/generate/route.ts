
'use server';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {getToken} from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import {MongoClient, Db, ObjectId} from 'mongodb';
import type {Campaign, ContentVersion} from '@/types/content';
import {generateContent, type GenerateContentInput} from '@/ai/flows/content-generation';
import { mapCampaignDocumentToCampaign } from '@/app/api/campaigns/route';

interface GenerateApiInput {
  campaignId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({req: request, secret: process.env.NEXTAUTH_SECRET});
    if (!token || !token.id) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    const userId = token.id;

    const body = (await request.json()) as GenerateApiInput;
    const {campaignId} = body;

    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({error: 'Valid campaign ID is required.'}, {status: 400});
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    const campaign = await campaignsCollection.findOne({
      _id: new ObjectId(campaignId),
      userId: userId,
    });

    if (!campaign) {
      return NextResponse.json({error: 'Campaign not found or user is not authorized.'}, {status: 404});
    }

    // Prepare input for the AI flow
    const flowInput: GenerateContentInput = {
      inputContent: campaign.brief,
      brandVoice: campaign.brandProfile?.voiceProfile.tone || campaign.tone,
    };

    const generatedContent = await generateContent(flowInput);

    const newVersion: ContentVersion = {
      id: new ObjectId().toString(),
      versionNumber: (campaign.contentVersions?.length || 0) + 1,
      timestamp: new Date(),
      actorName: 'AI Content Team',
      changeSummary: 'Initial content generation from creative brief and brand profile.',
      multiFormatContentSnapshot: generatedContent,
      isFlagged: false,
      adminModerationNotes: '',
    };
    
    const updatedResult = await campaignsCollection.findOneAndUpdate(
      {_id: new ObjectId(campaignId)},
      {
        $push: {contentVersions: newVersion as any}, // Cast to any to handle ObjectId conversion in DB layer
        $set: {status: 'review', updatedAt: new Date()},
      },
      {returnDocument: 'after'}
    );

    if (!updatedResult.value) {
      return NextResponse.json({error: 'Failed to save generated content to campaign.'}, {status: 500});
    }
    
    const updatedCampaign = mapCampaignDocumentToCampaign({ ...updatedResult.value, _id: updatedResult.value._id! });

    return NextResponse.json(updatedCampaign, {status: 200});
  } catch (error) {
    console.error('Content Generation API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({error: 'Failed to generate content.', details: errorMessage}, {status: 500});
  }
}
