
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import type { Campaign, ContentVersion, AgentInteraction, ABTestInstance, ScheduledPost } from '@/types/content';

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
    const campaignsCollection = db.collection<Omit<Campaign, 'id'>>('campaigns'); // Use DB model type
    
    if (fetchSingle && campaignId) {
        if (!ObjectId.isValid(campaignId)) {
            return NextResponse.json({ error: 'Invalid Campaign ID format for single fetch' }, { status: 400 });
        }
        const campaignDoc = await campaignsCollection.findOne({ _id: new ObjectId(campaignId), userId });
        if (!campaignDoc) {
            return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
        }
        const campaign: Campaign = { // Map to client-side type with string id
            ...campaignDoc,
            id: campaignDoc._id!.toString(), 
            contentVersions: (campaignDoc.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
            agentDebates: (campaignDoc.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
            scheduledPosts: (campaignDoc.scheduledPosts || []).map(sp => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
            abTests: (campaignDoc.abTests || []).map(ab => ({...ab, createdAt: new Date(ab.createdAt)})),
            isPrivate: campaignDoc.isPrivate || false,
            createdAt: new Date(campaignDoc.createdAt),
            updatedAt: new Date(campaignDoc.updatedAt),
        };
        return NextResponse.json(campaign, { status: 200 });
    }


    const userCampaignDocs = await campaignsCollection.find({ userId }).sort({ createdAt: -1 }).toArray();
    
    const formattedCampaigns: Campaign[] = userCampaignDocs.map(campaignDoc => ({
      ...campaignDoc,
      id: campaignDoc._id!.toString(), 
      contentVersions: (campaignDoc.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
      agentDebates: (campaignDoc.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
      scheduledPosts: (campaignDoc.scheduledPosts || []).map(sp => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
      abTests: (campaignDoc.abTests || []).map(ab => ({...ab, createdAt: new Date(ab.createdAt)})),
      isPrivate: campaignDoc.isPrivate || false,
      createdAt: new Date(campaignDoc.createdAt),
      updatedAt: new Date(campaignDoc.updatedAt),
    }));

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
      isPrivate: isPrivate || false, 
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignsCollection.insertOne(newCampaignData);
    
    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    const createdCampaign: Campaign = { // Map to client-side type
      id: result.insertedId.toString(),
      ...newCampaignData,
       _id: result.insertedId, // Keep _id for internal MongoDB use if needed, but id is primary for client
    }; 

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
    const { title, brief, targetAudience, tone, contentGoals, status, contentVersions, agentDebates, referenceMaterials, brandId, scheduledPosts, abTests, isPrivate } = body;

    const updateData: Partial<Omit<Campaign, 'id' | '_id' | 'userId' | 'createdAt'>> = { updatedAt: new Date() };
    
    // Explicitly handle each field to avoid unintended overwrites with undefined
    if (title !== undefined) updateData.title = title;
    if (brief !== undefined) updateData.brief = brief;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience === null ? undefined : targetAudience;
    if (tone !== undefined) updateData.tone = tone === null ? undefined : tone;
    if (contentGoals !== undefined) updateData.contentGoals = contentGoals === null ? [] : contentGoals;
    if (status !== undefined) updateData.status = status;
    if (referenceMaterials !== undefined) updateData.referenceMaterials = referenceMaterials === null ? [] : referenceMaterials;
    if (brandId !== undefined) updateData.brandId = brandId === null ? undefined : brandId;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate === null ? false : isPrivate;


    if (contentVersions !== undefined) {
      updateData.contentVersions = (contentVersions === null ? [] : contentVersions).map((v: ContentVersion) => ({
        ...v,
        timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
      }));
    }

    if (agentDebates !== undefined) {
      updateData.agentDebates = (agentDebates === null ? [] : agentDebates).map((ad: AgentInteraction) => ({
        ...ad,
        timestamp: ad.timestamp ? new Date(ad.timestamp) : new Date(),
      }));
    }

    if (scheduledPosts !== undefined) {
      updateData.scheduledPosts = (scheduledPosts === null ? [] : scheduledPosts).map((sp: ScheduledPost) => ({ 
        ...sp,
        scheduledAt: sp.scheduledAt ? new Date(sp.scheduledAt) : new Date(),
      }));
    }

    if (abTests !== undefined) {
      updateData.abTests = (abTests === null ? [] : abTests).map((ab: ABTestInstance) => ({
        ...ab,
        createdAt: ab.createdAt ? new Date(ab.createdAt) : new Date(),
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
    
    const updatedCampaignDoc = result.value;
    const updatedCampaign: Campaign = { // Map to client-side type
        ...updatedCampaignDoc,
        id: updatedCampaignDoc._id!.toString(),
        contentVersions: (updatedCampaignDoc.contentVersions || []).map(cv => ({...cv, timestamp: new Date(cv.timestamp)})),
        agentDebates: (updatedCampaignDoc.agentDebates || []).map(ad => ({...ad, timestamp: new Date(ad.timestamp)})),
        scheduledPosts: (updatedCampaignDoc.scheduledPosts || []).map(sp => ({...sp, scheduledAt: new Date(sp.scheduledAt)})),
        abTests: (updatedCampaignDoc.abTests || []).map(ab => ({...ab, createdAt: new Date(ab.createdAt)})),
        isPrivate: updatedCampaignDoc.isPrivate || false,
        createdAt: new Date(updatedCampaignDoc.createdAt),
        updatedAt: new Date(updatedCampaignDoc.updatedAt),
    };

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
