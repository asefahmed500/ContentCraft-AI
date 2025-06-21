
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db, Filter } from 'mongodb';
import { getPlatformInsights, type PlatformInsightsInput } from '@/ai/flows/admin/platform-insights';
import { subDays } from 'date-fns';

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
    const feedbackCollection = db.collection('feedback_logs');

    const twentyFourHoursAgo = subDays(new Date(), 1);
    const dateFilter: Filter<any> = { createdAt: { $gte: twentyFourHoursAgo } };

    const totalUsers = await usersCollection.countDocuments();
    const totalCampaigns = await campaignsCollection.countDocuments();
    const totalFeedback = await feedbackCollection.countDocuments();
    const newUsersToday = await usersCollection.countDocuments(dateFilter);
    const newCampaignsToday = await campaignsCollection.countDocuments(dateFilter);


    const stats = {
        totalUsers,
        totalCampaigns,
        activeUsersToday: newUsersToday, // Using new users as proxy for active users
        campaignsCreatedToday: newCampaignsToday,
        aiFlowsExecuted: Math.floor(Math.random() * 500) + 200, // Mocked for demonstration
        feedbackItemsSubmitted: totalFeedback
    };

    const insightsInput: PlatformInsightsInput = {
      totalUsers: stats.totalUsers,
      totalCampaigns: stats.totalCampaigns,
      activeUsersToday: stats.activeUsersToday,
      campaignsCreatedToday: stats.campaignsCreatedToday,
    };

    const insights = await getPlatformInsights(insightsInput);

    return NextResponse.json({ stats, insights }, { status: 200 });

  } catch (error) {
    console.error("Admin Platform Insights API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to generate platform insights.', details: errorMessage }, { status: 500 });
  }
}
