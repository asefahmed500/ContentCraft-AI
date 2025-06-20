import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';
import type { Campaign, ContentVersion } from '@/types/content';

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
    
    // Ensure _id is converted to id string and contentHistory is initialized if missing
    const formattedCampaigns = userCampaigns.map(campaign => ({
      ...campaign,
      id: campaign._id!.toString(), 
      contentHistory: campaign.contentHistory || [], // Ensure contentHistory is an array
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
    const { brief, targetAudience, tone, contentGoals, brandProfileId } = body;

    if (!brief) {
      return NextResponse.json({ error: 'Campaign brief is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const campaignsCollection = db.collection('campaigns');

    const newCampaignData: Omit<Campaign, 'id' | '_id'> = { 
      userId,
      brief,
      targetAudience,
      tone,
      contentGoals,
      brandProfileId, 
      agentDebates: [],
      contentHistory: [], // Initialize with empty content history
      status: 'draft', 
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await campaignsCollection.insertOne(newCampaignData);
    
    if (!result.insertedId) {
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    const createdCampaign = {
      id: result.insertedId.toString(),
      ...newCampaignData
    } as Campaign; 

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
    const { brief, targetAudience, tone, contentGoals, status, contentHistory } = body;

    const updateData: Partial<Campaign> & { $set?: any } = { updatedAt: new Date() };
    if (brief !== undefined) updateData.brief = brief;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (tone !== undefined) updateData.tone = tone;
    if (contentGoals !== undefined) updateData.contentGoals = contentGoals;
    if (status !== undefined) updateData.status = status;
    if (contentHistory !== undefined) {
      // Ensure contentHistory versions have valid timestamps
      const validatedHistory = contentHistory.map((v: ContentVersion) => ({
        ...v,
        timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
      }));
      updateData.contentHistory = validatedHistory;
    }
    
    // Prevent updating with only updatedAt if no other fields are provided
    const updateKeys = Object.keys(updateData).filter(key => key !== 'updatedAt');
    if (updateKeys.length === 0) {
        // If only updatedAt is present, fetch and return current campaign data without an update
        const client = await clientPromise;
        const db = client.db();
        const campaignsCollection = db.collection<Campaign>('campaigns');
        const existingCampaign = await campaignsCollection.findOne({ _id: new ObjectId(campaignId), userId: userId });
        if (!existingCampaign) {
            return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
        }
        return NextResponse.json({ ...existingCampaign, id: existingCampaign._id.toString() }, { status: 200 });
    }


    const client = await clientPromise;
    const db = client.db();
    const campaignsCollection = db.collection<Campaign>('campaigns');

    const result = await campaignsCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId), userId: userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Campaign not found or user not authorized' }, { status: 404 });
    }
    
    const updatedCampaign = {
        ...result.value,
        id: result.value._id!.toString(),
        contentHistory: result.value.contentHistory || [], // Ensure contentHistory exists
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
