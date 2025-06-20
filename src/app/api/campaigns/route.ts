
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import type { Campaign, ContentVersion, AgentInteraction, ABTestInstance } from '@/types/content';

// GET /api/campaigns - List all campaigns for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;

    const client = await clientPromise;
    const db = client.db();
    const campaignsCollection = db.collection<Campaign>('campaigns');
    
    const userCampaigns = await campaignsCollection.find({ userId }).sort({ createdAt: -1 }).toArray();
    
    const formattedCampaigns = userCampaigns.map(campaign => ({
      ...campaign,
      id: campaign._id!.toString(), 
      contentVersions: campaign.contentVersions || [],
      agentDebates: campaign.agentDebates || [],
      scheduledPosts: campaign.scheduledPosts || [],
      abTests: campaign.abTests || [],
      isPrivate: campaign.isPrivate || false, // Ensure isPrivate is returned, default to false
    }));

    return NextResponse.json(formattedCampaigns, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
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
    const { title, brief, targetAudience, tone, contentGoals, brandId, referenceMaterials, isPrivate } = body;

    if (!title || !brief) {
      return NextResponse.json({ error: 'Campaign title and brief (product/service description) are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const campaignsCollection = db.collection('campaigns');

    const newCampaignData: Omit<Campaign, 'id' | '_id'> = { 
      userId,
      title,
      brief,
      targetAudience,
      tone,
      contentGoals,
      brandId, 
      referenceMaterials: referenceMaterials || [],
      agentDebates: [],
      contentVersions: [],
      scheduledPosts: [],
      abTests: [],
      status: 'draft', 
      isPrivate: isPrivate || false, // Save isPrivate, default to false
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignsCollection.insertOne(newCampaignData);
    
    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    const createdCampaign: Campaign = {
      id: result.insertedId.toString(),
      ...newCampaignData,
       _id: result.insertedId, 
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
    
    if (title !== undefined) updateData.title = title;
    if (brief !== undefined) updateData.brief = brief;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (tone !== undefined) updateData.tone = tone;
    if (contentGoals !== undefined) updateData.contentGoals = contentGoals;
    if (status !== undefined) updateData.status = status;
    if (referenceMaterials !== undefined) updateData.referenceMaterials = referenceMaterials;
    if (brandId !== undefined) updateData.brandId = brandId;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate; // Update isPrivate


    if (contentVersions !== undefined && Array.isArray(contentVersions)) {
      updateData.contentVersions = contentVersions.map((v: ContentVersion) => ({
        ...v,
        timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
      }));
    }
    if (agentDebates !== undefined && Array.isArray(agentDebates)) {
      updateData.agentDebates = agentDebates.map((ad: AgentInteraction) => ({
        ...ad,
        timestamp: ad.timestamp ? new Date(ad.timestamp) : new Date(),
      }));
    }
    if (scheduledPosts !== undefined && Array.isArray(scheduledPosts)) {
      updateData.scheduledPosts = scheduledPosts.map((sp: any) => ({ // Type any for sp if ScheduledPost is not fully defined yet
        ...sp,
        scheduledAt: sp.scheduledAt ? new Date(sp.scheduledAt) : new Date(),
        // Ensure other date fields are handled if they exist
      }));
    }
     if (abTests !== undefined && Array.isArray(abTests)) {
      updateData.abTests = abTests.map((ab: ABTestInstance) => ({
        ...ab,
        createdAt: ab.createdAt ? new Date(ab.createdAt) : new Date(),
      }));
    }
    
    const updateKeys = Object.keys(updateData).filter(key => key !== 'updatedAt');
    
    const client = await clientPromise;
    const db = client.db();
    const campaignsCollection = db.collection<Campaign>('campaigns');

    if (updateKeys.length === 0 && isPrivate === undefined) { // Check if isPrivate is also undefined
        const existingCampaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId), userId: userId });
        if (!existingCampaign) {
            return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
        }
        return NextResponse.json({ 
            ...existingCampaign, 
            id: existingCampaign._id!.toString(), 
            contentVersions: existingCampaign.contentVersions || [], 
            agentDebates: existingCampaign.agentDebates || [],
            scheduledPosts: existingCampaign.scheduledPosts || [],
            abTests: existingCampaign.abTests || [],
            isPrivate: existingCampaign.isPrivate || false,
        }, { status: 200 });
    }


    const result = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId), userId: userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Campaign not found or user not authorized for update' }, { status: 404 });
    }
    
    const updatedCampaign = {
        ...result.value,
        id: result.value._id!.toString(),
        contentVersions: result.value.contentVersions || [],
        agentDebates: result.value.agentDebates || [],
        scheduledPosts: result.value.scheduledPosts || [],
        abTests: result.value.abTests || [],
        isPrivate: result.value.isPrivate || false,
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
    const db = client.db();
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
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
