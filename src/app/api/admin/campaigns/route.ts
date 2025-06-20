
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign, ContentVersion } from '@/types/content'; // Ensure ContentVersion is imported

const ensureDate = (dateInput: string | Date | undefined | null): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) return dateInput;
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? undefined : date;
};

const mapCampaignDocumentToCampaign = (campaignDoc: Omit<Campaign, 'id'> & { _id: ObjectId }): Campaign => {
  return {
    ...campaignDoc,
    id: campaignDoc._id.toString(),
    agentDebates: (campaignDoc.agentDebates || []).map(ad => ({ ...ad, timestamp: ensureDate(ad.timestamp) || new Date() })),
    contentVersions: (campaignDoc.contentVersions || []).map(cv => ({
        ...cv,
        timestamp: ensureDate(cv.timestamp) || new Date(),
        isFlagged: cv.isFlagged ?? false, // Handle new field
        adminModerationNotes: cv.adminModerationNotes ?? undefined, // Handle new field
    })),
    scheduledPosts: (campaignDoc.scheduledPosts || []).map(sp => ({ ...sp, scheduledAt: ensureDate(sp.scheduledAt) || new Date() })),
    abTests: (campaignDoc.abTests || []).map(ab => ({ ...ab, createdAt: ensureDate(ab.createdAt) || new Date() })),
    isPrivate: campaignDoc.isPrivate ?? false,
    isFlagged: campaignDoc.isFlagged ?? false, // Campaign level flag
    adminModerationNotes: campaignDoc.adminModerationNotes ?? undefined, // Campaign level notes
    createdAt: ensureDate(campaignDoc.createdAt) || new Date(),
    updatedAt: ensureDate(campaignDoc.updatedAt) || new Date(),
  };
};

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');
    
    const allCampaignDocs = await campaignsCollection.find({}).sort({ createdAt: -1 }).toArray();
    
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

