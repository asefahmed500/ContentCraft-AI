
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { analyzeBrandProfile, type AnalyzeBrandProfileInput } from '@/ai/flows/brand-learning';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as AnalyzeBrandProfileInput;

    if (!body.contentDataUri) {
      return NextResponse.json({ error: 'Missing required field: contentDataUri' }, { status: 400 });
    }
    
    // Basic validation for data URI format
    if (!body.contentDataUri.startsWith('data:') || !body.contentDataUri.includes(';base64,')) {
        return NextResponse.json({ error: 'Invalid contentDataUri format. Expected data:<mimetype>;base64,<encoded_data>.' }, { status: 400 });
    }


    const result = await analyzeBrandProfile(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Brand Analyze API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to analyze brand profile.', details: errorMessage }, { status: 500 });
  }
}
