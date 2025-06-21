import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { MongoClient, Db } from 'mongodb';
import { summarizeDataForExport, type DataSummaryInput } from '@/ai/flows/admin/data-summarizer';

type DataType = 'Users' | 'Campaigns' | 'Feedback Logs';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }
    
    const body = await request.json() as { dataType: DataType };
    const { dataType } = body;

    if (!dataType || !['Users', 'Campaigns', 'Feedback Logs'].includes(dataType)) {
      return NextResponse.json({ error: 'A valid dataType is required.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    
    let summaryInput: DataSummaryInput;

    switch (dataType) {
      case 'Users':
        const usersCollection = db.collection('users');
        const totalUsers = await usersCollection.countDocuments();
        const adminUsers = await usersCollection.countDocuments({ role: 'admin' });
        summaryInput = {
          dataType: 'Users',
          totalRecords: totalUsers,
          additionalStats: {
            'Admin Users': adminUsers,
            'Editor/Viewer Users': totalUsers - adminUsers,
          },
        };
        break;
      
      case 'Campaigns':
        const campaignsCollection = db.collection('campaigns');
        const totalCampaigns = await campaignsCollection.countDocuments();
        const publishedCampaigns = await campaignsCollection.countDocuments({ status: 'published' });
        const flaggedCampaigns = await campaignsCollection.countDocuments({ isFlagged: true });
        summaryInput = {
          dataType: 'Campaigns',
          totalRecords: totalCampaigns,
          additionalStats: {
            'Published Campaigns': publishedCampaigns,
            'Flagged for Moderation': flaggedCampaigns,
          },
        };
        break;
      
      case 'Feedback Logs':
        const feedbackCollection = db.collection('feedback_logs');
        const totalFeedback = await feedbackCollection.countDocuments();
        const positiveRatings = await feedbackCollection.countDocuments({ rating: 1 });
        const negativeRatings = await feedbackCollection.countDocuments({ rating: -1 });
        summaryInput = {
          dataType: 'Feedback Logs',
          totalRecords: totalFeedback,
          additionalStats: {
            'Positive Ratings (👍)': positiveRatings,
            'Negative Ratings (👎)': negativeRatings,
          },
        };
        break;
    }

    const result = await summarizeDataForExport(summaryInput);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Admin Data Summarizer API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to generate data summary.', details: errorMessage }, { status: 500 });
  }
}
