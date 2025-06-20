
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { analyzeBrandDNA, type AnalyzeBrandDNAInput } from '@/ai/flows/brand-learning';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeBrandDNAInput;

    if (!body.contentDataUri) {
      return NextResponse.json({ error: 'Missing required field: contentDataUri' }, { status: 400 });
    }
    
    // Basic validation for data URI format
    if (!body.contentDataUri.startsWith('data:') || !body.contentDataUri.includes(';base64,')) {
        return NextResponse.json({ error: 'Invalid contentDataUri format. Expected data:<mimetype>;base64,<encoded_data>.' }, { status: 400 });
    }


    const result = await analyzeBrandDNA(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Brand Analyze API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to analyze brand DNA.', details: errorMessage }, { status: 500 });
  }
}
