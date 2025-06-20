
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign, ContentVersion } from '@/types/content'; 
import { mapCampaignDocumentToCampaign } from '@/app/api/campaigns/route'; // Import the shared mapper

// ensureDate function is implicitly available via mapCampaignDocumentToCampaign

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');
    
    // New: Support fetching a single campaign by ID for admin detail view
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const fetchSingle = searchParams.get('single') === 'true';

    if (fetchSingle && campaignId) {
        if (!ObjectId.isValid(campaignId)) {
            return NextResponse.json({ error: 'Invalid Campaign ID format for single fetch' }, { status: 400 });
        }
        // Admins can view any campaign
        const campaignDoc = await campaignsCollection.findOne({ _id: new ObjectId(campaignId) });
        if (!campaignDoc) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }
        const campaign = mapCampaignDocumentToCampaign({ ...campaignDoc, _id: campaignDoc._id! });
        return NextResponse.json(campaign, { status: 200 });
    }
    
    // Fetch all campaigns for admin overview
    const allCampaignDocs = await campaignsCollection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
    
    const formattedCampaigns: Campaign[] = allCampaignDocs.map(doc => 
        mapCampaignDocumentToCampaign({ ...doc, _id: doc._id! })
    );

    return NextResponse.json(formattedCampaigns, { status: 200 });
  } catch (error) {
    console.error("Admin Fetch Campaigns API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch campaigns for admin.', details: errorMessage }, { status: 500 });
  }
}
