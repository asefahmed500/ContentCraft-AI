
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import type { Campaign, ContentVersion, AgentInteraction, ABTestInstance, ScheduledPost } from '@/types/content';

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
    contentVersions: (campaignDoc.contentVersions || []).map(cv => ({ ...cv, timestamp: ensureDate(cv.timestamp) || new Date() })),
    scheduledPosts: (campaignDoc.scheduledPosts || []).map(sp => ({ ...sp, scheduledAt: ensureDate(sp.scheduledAt) || new Date() })),
    abTests: (campaignDoc.abTests || []).map(ab => ({ ...ab, createdAt: ensureDate(ab.createdAt) || new Date() })),
    isPrivate: campaignDoc.isPrivate ?? false,
    createdAt: ensureDate(campaignDoc.createdAt) || new Date(),
    updatedAt: ensureDate(campaignDoc.updatedAt) || new Date(),
  };
};


// GET /api/campaigns - List all campaigns for the authenticated user OR a single campaign
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const fetchSingle = searchParams.get('single') === 'true';

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns'); 
    
    if (fetchSingle && campaignId) {
        if (!ObjectId.isValid(campaignId)) {
            return NextResponse.json({ error: 'Invalid Campaign ID format for single fetch' }, { status: 400 });
        }
        const campaignDoc = await campaignsCollection.findOne({ _id: new ObjectId(campaignId), userId });
        if (!campaignDoc) {
            return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
        }
        const campaign = mapCampaignDocumentToCampaign({ ...campaignDoc, _id: campaignDoc._id! });
        return NextResponse.json(campaign, { status: 200 });
    }

    const userCampaignDocs = await campaignsCollection.find({ userId }).sort({ createdAt: -1 }).toArray();
    const formattedCampaigns: Campaign[] = userCampaignDocs.map(doc => mapCampaignDocumentToCampaign({ ...doc, _id: doc._id! }));

    return NextResponse.json(formattedCampaigns, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: errorMessage }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json();
    const { title, brief, targetAudience, tone, contentGoals, brandId, referenceMaterials, isPrivate, status } = body;

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
      brandId: brandId || undefined, 
      referenceMaterials: referenceMaterials || [],
      agentDebates: [],
      contentVersions: [],
      scheduledPosts: [],
      abTests: [],
      status: status || 'draft', 
      isPrivate: isPrivate ?? false, 
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

// PUT /api/campaigns?id=<campaignId> - Update an existing campaign
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    // Explicitly handle each field to avoid unintended overwrites with undefined
    if (body.title !== undefined) updateData.title = body.title;
    if (body.brief !== undefined) updateData.brief = body.brief;
    if (body.targetAudience !== undefined) updateData.targetAudience = body.targetAudience === null ? undefined : body.targetAudience;
    if (body.tone !== undefined) updateData.tone = body.tone === null ? undefined : body.tone;
    if (body.contentGoals !== undefined) updateData.contentGoals = body.contentGoals === null ? [] : body.contentGoals;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.referenceMaterials !== undefined) updateData.referenceMaterials = body.referenceMaterials === null ? [] : body.referenceMaterials;
    if (body.brandId !== undefined) updateData.brandId = body.brandId === null ? undefined : body.brandId;
    if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate ?? false;


    if (body.contentVersions !== undefined) {
      updateData.contentVersions = (body.contentVersions === null ? [] : body.contentVersions).map((v: ContentVersion) => ({
        ...v,
        timestamp: ensureDate(v.timestamp) || new Date(),
      }));
    }

    if (body.agentDebates !== undefined) {
      updateData.agentDebates = (body.agentDebates === null ? [] : body.agentDebates).map((ad: AgentInteraction) => ({
        ...ad,
        timestamp: ensureDate(ad.timestamp) || new Date(),
      }));
    }

    if (body.scheduledPosts !== undefined) {
      updateData.scheduledPosts = (body.scheduledPosts === null ? [] : body.scheduledPosts).map((sp: ScheduledPost) => ({ 
        ...sp,
        scheduledAt: ensureDate(sp.scheduledAt) || new Date(),
      }));
    }

    if (body.abTests !== undefined) {
      updateData.abTests = (body.abTests === null ? [] : body.abTests).map((ab: ABTestInstance) => ({
        ...ab,
        createdAt: ensureDate(ab.createdAt) || new Date(),
      }));
    }
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns');

    const result = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId), userId: userId },
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


// DELETE /api/campaigns?id=<campaignId> - Delete a campaign
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const result = await campaignsCollection.deleteOne({ 
      _id: new ObjectId(campaignId),
      userId: userId 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Campaign not found or user not authorized to delete' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error("Failed to delete campaign:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to delete campaign', details: errorMessage }, { status: 500 });
  }
}
