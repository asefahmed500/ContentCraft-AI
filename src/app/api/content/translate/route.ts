
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { translateContent, type TranslateContentInput } from '@/ai/flows/translate-content-flow';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as TranslateContentInput;

    if (!body.originalContent || !body.targetLanguage) {
      return NextResponse.json({ error: 'Missing required fields: originalContent and targetLanguage' }, { status: 400 });
    }

    const result = await translateContent(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Content Translation API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to translate content.', details: errorMessage }, { status: 500 });
  }
}
