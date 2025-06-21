
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auditContentAgainstBrand, type BrandAuditInput } from '@/ai/flows/brand-audit-flow';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { ObjectId, type MongoClient, type Db } from 'mongodb';
import type { Campaign } from '@/types/content';


interface AuditApiInput extends Omit<BrandAuditInput, 'brandProfile'> {
    campaignId: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id;

    const body = await request.json() as AuditApiInput;

    if (!body.contentToCheck || !body.campaignId) {
      return NextResponse.json({ error: 'Missing required fields: contentToCheck and campaignId' }, { status: 400 });
    }
    
    if (!ObjectId.isValid(body.campaignId)) {
        return NextResponse.json({ error: 'Invalid Campaign ID format.' }, { status: 400 });
    }


    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    const campaign = await campaignsCollection.findOne({ _id: new ObjectId(body.campaignId), userId: userId });

    if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found or user not authorized.' }, { status: 404 });
    }
    if (!campaign.brandProfile) {
        return NextResponse.json({ error: 'No brand profile has been generated for this campaign yet. Please generate one first.' }, { status: 400 });
    }

    const auditInput: BrandAuditInput = {
        contentToCheck: body.contentToCheck,
        brandProfile: campaign.brandProfile
    };


    const result = await auditContentAgainstBrand(auditInput);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Brand Audit API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to audit content.', details: errorMessage }, { status: 500 });
  }
}
