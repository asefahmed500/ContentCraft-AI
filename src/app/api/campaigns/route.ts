import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Placeholder for campaign data store
let campaigns: any[] = [];

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    // In a real app, fetch from database
    return NextResponse.json(campaigns, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newCampaign = { id: Date.now().toString(), ...body, createdAt: new Date() };
    campaigns.push(newCampaign);
    // In a real app, save to database and return the created campaign
    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
