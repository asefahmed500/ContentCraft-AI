import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db } from 'mongodb';
import { getPlatformInsights, type PlatformInsightsInput } from '@/ai/flows/admin/platform-insights';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    
    const usersCollection = db.collection('users');
    const campaignsCollection = db.collection('campaigns');

    const totalUsers = await usersCollection.countDocuments();
    const totalCampaigns = await campaignsCollection.countDocuments();

    // In a real app, you would query for actual recent activity.
    // Here, we'll use mocked data for demonstration.
    const activeUsersToday = Math.floor(Math.random() * totalUsers / 2) + 1;
    const campaignsCreatedToday = Math.floor(Math.random() * Math.min(5, totalCampaigns)) + 1;

    const insightsInput: PlatformInsightsInput = {
      totalUsers,
      totalCampaigns,
      activeUsersToday,
      campaignsCreatedToday,
    };

    const result = await getPlatformInsights(insightsInput);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Admin Platform Insights API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to generate platform insights.', details: errorMessage }, { status: 500 });
  }
}
