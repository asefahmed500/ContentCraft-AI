
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { auditCampaignQuality, type CampaignQualityAuditInput } from '@/ai/flows/admin/campaign-quality-audit';
import type { Campaign } from '@/types/content';
import { differenceInDays } from 'date-fns';

export async function POST(request: NextRequest, context: any) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { campaignId } = context.params;
    if (!campaignId || !ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID provided.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');
    
    const campaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId) });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    const daysSinceLastUpdate = campaign.updatedAt ? differenceInDays(new Date(), new Date(campaign.updatedAt)) : 0;

    const auditInput: CampaignQualityAuditInput = {
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      daysSinceLastUpdate: Math.max(0, daysSinceLastUpdate),
      contentVersionCount: campaign.contentVersions?.length ?? 0,
      agentDebateCount: campaign.agentDebates?.length ?? 0,
    };
    
    const result = await auditCampaignQuality(auditInput);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Admin Campaign Quality Audit API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to run campaign quality audit.', details: errorMessage }, { status: 500 });
  }
}
