
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import type { Campaign, ContentVersion, AgentInteraction, ABTestInstance, ScheduledPost } from '@/types/content';
import type { User as NextAuthUser } from 'next-auth';
import type { BrandProfile } from '@/types/brand';

interface SessionUser extends NextAuthUser {
  id?: string;
  role?: 'viewer' | 'editor' | 'admin';
}

const ensureDate = (dateInput: string | Date | undefined | null): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) return date;
  }
  return undefined; // Return undefined for invalid dates
};

export const mapCampaignDocumentToCampaign = (campaignDoc: Omit<Campaign, 'id'> & { _id: ObjectId }): Campaign => {
  return {
    ...campaignDoc,
    id: campaignDoc._id.toString(),
    userId: campaignDoc.userId,
    title: campaignDoc.title,
    brief: campaignDoc.brief,
    targetAudience: campaignDoc.targetAudience,
    tone: campaignDoc.tone,
    contentGoals: campaignDoc.contentGoals || [],
    brandId: campaignDoc.brandId,
    brandProfile: campaignDoc.brandProfile, // Ensure this is mapped
    referenceMaterials: campaignDoc.referenceMaterials || [],
    agentDebates: (campaignDoc.agentDebates || []).map(ad => ({ ...ad, timestamp: ensureDate(ad.timestamp) || new Date() })),
    contentVersions: (campaignDoc.contentVersions || []).map(cv => ({
        ...cv,
        id: cv.id || new ObjectId().toString(), // Ensure version ID exists
        versionNumber: cv.versionNumber || 0,
        timestamp: ensureDate(cv.timestamp) || new Date(),
        multiFormatContentSnapshot: cv.multiFormatContentSnapshot || {},
        isFlagged: cv.isFlagged ?? false,
        adminModerationNotes: cv.adminModerationNotes ?? '', 
    })),
    scheduledPosts: (campaignDoc.scheduledPosts || []).map(sp => ({ ...sp, id: sp.id || new ObjectId().toString(), scheduledAt: ensureDate(sp.scheduledAt) || new Date() })),
    abTests: (campaignDoc.abTests || []).map(ab => ({ ...ab, id: ab.id || new ObjectId().toString(), createdAt: ensureDate(ab.createdAt) || new Date() })),
    status: campaignDoc.status || 'draft',
    isPrivate: campaignDoc.isPrivate ?? false,
    isFlagged: campaignDoc.isFlagged ?? false, 
    adminModerationNotes: campaignDoc.adminModerationNotes ?? '',
    createdAt: ensureDate(campaignDoc.createdAt) || new Date(),
    updatedAt: ensureDate(campaignDoc.updatedAt) || new Date(),
  };
};


export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns'); 
    
    if (campaignId) { 
        if (!ObjectId.isValid(campaignId)) {
            return NextResponse.json({ error: 'Invalid Campaign ID format' }, { status: 400 });
        }
        const campaignDoc = await campaignsCollection.findOne({ _id: new ObjectId(campaignId), userId });
        if (!campaignDoc) {
            return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
        }
        const campaign = mapCampaignDocumentToCampaign({ ...campaignDoc, _id: campaignDoc._id! });
        return NextResponse.json(campaign, { status: 200 });
    }

    const userCampaignDocs = await campaignsCollection.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }).toArray();
    const formattedCampaigns: Campaign[] = userCampaignDocs.map(doc => mapCampaignDocumentToCampaign({ ...doc, _id: doc._id! }));

    return NextResponse.json(formattedCampaigns, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) as SessionUser | null;
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (token.role !== 'editor' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create campaigns.' }, { status: 403 });
    }
    const userId = token.id as string;

    const body = await request.json();
    const { title, brief, targetAudience, tone, contentGoals, isPrivate, status } = body;

    if (!title || !brief) {
      return NextResponse.json({ error: 'Campaign title and brief (product/service description) are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection('campaigns');

    const newCampaignData: Omit<Campaign, 'id' | '_id'> = { 
      userId,
      title,
      brief,
      targetAudience: targetAudience || undefined,
      tone: tone || undefined,
      contentGoals: contentGoals || [],
      brandProfile: undefined,
      referenceMaterials: [],
      agentDebates: [],
      contentVersions: [],
      scheduledPosts: [],
      abTests: [],
      status: status || 'draft', 
      isPrivate: isPrivate ?? false, 
      isFlagged: false, 
      adminModerationNotes: '', 
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignsCollection.insertOne(newCampaignData);
    
    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }
    
    const createdCampaign = mapCampaignDocumentToCampaign({ ...newCampaignData, _id: result.insertedId });

    return NextResponse.json(createdCampaign, { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to create campaign', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) as SessionUser | null;
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
     if (token.role !== 'editor' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to update campaigns.' }, { status: 403 });
    }
    const userId = token.id as string;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required for update' }, { status: 400 });
    }
    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid Campaign ID format' }, { status: 400 });
    }

    const body = await request.json();
    
    const updateData: Partial<Omit<Campaign, 'id' | '_id' | 'userId' | 'createdAt'>> = { updatedAt: new Date() };
    
    if (Object.prototype.hasOwnProperty.call(body, 'title')) updateData.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'brief')) updateData.brief = body.brief;
    if (Object.prototype.hasOwnProperty.call(body, 'targetAudience')) updateData.targetAudience = body.targetAudience === null ? undefined : body.targetAudience;
    if (Object.prototype.hasOwnProperty.call(body, 'tone')) updateData.tone = body.tone === null ? undefined : body.tone;
    if (Object.prototype.hasOwnProperty.call(body, 'contentGoals')) updateData.contentGoals = body.contentGoals === null ? [] : body.contentGoals;
    if (Object.prototype.hasOwnProperty.call(body, 'status')) updateData.status = body.status;
    if (Object.prototype.hasOwnProperty.call(body, 'referenceMaterials')) updateData.referenceMaterials = body.referenceMaterials === null ? [] : body.referenceMaterials;
    if (Object.prototype.hasOwnProperty.call(body, 'isPrivate')) updateData.isPrivate = body.isPrivate ?? false;
    if (Object.prototype.hasOwnProperty.call(body, 'brandProfile')) updateData.brandProfile = body.brandProfile === null ? undefined : body.brandProfile;


    if (Object.prototype.hasOwnProperty.call(body, 'contentVersions')) {
      updateData.contentVersions = (body.contentVersions === null ? [] : body.contentVersions).map((v: ContentVersion) => ({
        ...v,
        id: v.id || new ObjectId().toString(),
        timestamp: ensureDate(v.timestamp) || new Date(),
        multiFormatContentSnapshot: v.multiFormatContentSnapshot || {},
        isFlagged: v.isFlagged ?? false,
        adminModerationNotes: v.adminModerationNotes ?? '',
      }));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'agentDebates')) {
      updateData.agentDebates = (body.agentDebates === null ? [] : body.agentDebates).map((ad: AgentInteraction) => ({
        ...ad,
        timestamp: ensureDate(ad.timestamp) || new Date(),
      }));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'scheduledPosts')) {
      updateData.scheduledPosts = (body.scheduledPosts === null ? [] : body.scheduledPosts).map((sp: ScheduledPost) => ({ 
        ...sp,
        id: sp.id || new ObjectId().toString(),
        scheduledAt: ensureDate(sp.scheduledAt) || new Date(),
      }));
    }
    if (Object.prototype.hasOwnProperty.call(body, 'abTests')) {
      updateData.abTests = (body.abTests === null ? [] : body.abTests).map((ab: ABTestInstance) => ({
        ...ab,
        id: ab.id || new ObjectId().toString(),
        createdAt: ensureDate(ab.createdAt) || new Date(),
      }));
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    // Admins can update any campaign, editors can only update their own.
    const query: { _id: ObjectId; userId?: string } = { _id: new ObjectId(campaignId) };
    if (token.role !== 'admin') {
      query.userId = userId;
    }
    
    const result = await campaignsCollection.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Campaign not found or user not authorized for update' }, { status: 404 });
    }
    
    const updatedCampaign = mapCampaignDocumentToCampaign({ ...result.value, _id: result.value._id! });

    return NextResponse.json(updatedCampaign, { status: 200 });

  } catch (error) {
    console.error("Failed to update campaign:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to update campaign', details: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) as SessionUser | null;
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (token.role !== 'editor' && token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete campaigns.' }, { status: 403 });
    }
    const userId = token.id as string;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json({ error: 'Invalid Campaign ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection('campaigns');
    
    const query = { _id: new ObjectId(campaignId), userId: userId };
        
    const result = await campaignsCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Campaign not found or user not authorized to delete' }, { status: 404 });
    }

    const feedbackCollection = db.collection('feedback_logs');
    await feedbackCollection.deleteMany({ campaignId: new ObjectId(campaignId) });


    return NextResponse.json({ message: 'Campaign and associated feedback deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error("Failed to delete campaign:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to delete campaign', details: errorMessage }, { status: 500 });
  }
}
