

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { reviseContent, type ReviseContentInput } from '@/ai/flows/revise-content-flow';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


interface ReviseApiInput extends ReviseContentInput {
    campaignId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id;

    const body = await request.json() as ReviseApiInput;

    if (!body.originalContent || !body.revisionInstructions || !body.campaignId) {
      return NextResponse.json({ error: 'Missing required fields: campaignId, originalContent, and revisionInstructions' }, { status: 400 });
    }

    if (!ObjectId.isValid(body.campaignId)) {
        return NextResponse.json({ error: 'Invalid Campaign ID format.' }, { status: 400 });
    }

    // Verify user owns the campaign before proceeding
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection('campaigns');
    const campaign = await campaignsCollection.findOne({ _id: new ObjectId(body.campaignId), userId });

    if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found or user not authorized.' }, { status: 404 });
    }

    // Call the flow with the user-provided data
    const result = await reviseContent({
        originalContent: body.originalContent,
        revisionInstructions: body.revisionInstructions,
        contentType: body.contentType,
        targetAudience: body.targetAudience,
        desiredTone: body.desiredTone,
    });

    // Note: The revised content is NOT automatically saved back as a new version.
    // The user receives it in the UI and can decide what to do with it.
    // This could be changed to automatically create a new version if desired.

    return NextResponse.json(result, { status: 200 });

  } catch (error)
 {
    console.error("Content Revision API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to revise content.', details: errorMessage }, { status: 500 });
  }
}
