import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateContent, type GenerateContentInput } from '@/ai/flows/content-generation';


// This route will use the generateContent flow as a proxy for orchestration for now
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateContentInput;

    if (!body.inputContent) {
      return NextResponse.json({ error: 'Missing required field: inputContent' }, { status: 400 });
    }

    // Simulate orchestration by directly calling content generation
    const result = await generateContent(body);
    return NextResponse.json({ message: "Content orchestrated successfully", generatedContent: result }, { status: 200 });

  } catch (error) {
    console.error("Content Orchestration API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to orchestrate content.', details: errorMessage }, { status: 500 });
  }
}
