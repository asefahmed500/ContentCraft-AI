import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { runCreativeWarRoom, type CreativeWarRoomInput } from '@/ai/flows/agent-debate';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as CreativeWarRoomInput;

    if (!body.brief || !body.title) {
      return NextResponse.json({ error: 'Missing required fields: brief, title' }, { status: 400 });
    }

    const result = await runCreativeWarRoom(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Agent Debate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to conduct agent debate.', details: errorMessage }, { status: 500 });
  }
}
