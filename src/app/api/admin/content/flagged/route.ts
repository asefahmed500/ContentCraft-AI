
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Campaign, ContentVersion, MultiFormatContent } from '@/types/content';

const ensureDate = (dateInput: string | Date | undefined | null): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) return dateInput;
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? undefined : date;
};

export interface FlaggedContentVersionItem {
  campaignId: string;
  campaignTitle: string;
  campaignUserId: string;
  versionId: string;
  versionNumber: number;
  actorName: string;
  changeSummary: string;
  timestamp: Date;
  isFlagged: boolean;
  adminModerationNotes?: string;
  multiFormatContentSnapshot: MultiFormatContent; // For quick preview if needed
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');
    
    const allCampaignDocs = await campaignsCollection.find({}).toArray();
    
    const flaggedVersions: FlaggedContentVersionItem[] = [];

    allCampaignDocs.forEach(campaignDoc => {
      const campaign = {
        ...campaignDoc,
        id: (campaignDoc._id as ObjectId).toString(),
        userId: campaignDoc.userId, // Assuming userId is stored directly
        title: campaignDoc.title,
        contentVersions: (campaignDoc.contentVersions || []).map(cv => ({
            ...cv,
            timestamp: ensureDate(cv.timestamp) || new Date(),
            isFlagged: cv.isFlagged ?? false,
            adminModerationNotes: cv.adminModerationNotes ?? undefined,
        })),
        createdAt: ensureDate(campaignDoc.createdAt) || new Date(),
        updatedAt: ensureDate(campaignDoc.updatedAt) || new Date(),
      } as Campaign;


      campaign.contentVersions?.forEach(version => {
        if (version.isFlagged) {
          flaggedVersions.push({
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            campaignUserId: campaign.userId,
            versionId: version.id,
            versionNumber: version.versionNumber,
            actorName: version.actorName,
            changeSummary: version.changeSummary,
            timestamp: version.timestamp,
            isFlagged: version.isFlagged,
            adminModerationNotes: version.adminModerationNotes,
            multiFormatContentSnapshot: version.multiFormatContentSnapshot,
          });
        }
      });
    });

    // Sort by version timestamp, newest first
    flaggedVersions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(flaggedVersions, { status: 200 });
  } catch (error) {
    console.error("Admin Fetch Flagged Content API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch flagged content for admin.', details: errorMessage }, { status: 500 });
  }
}
