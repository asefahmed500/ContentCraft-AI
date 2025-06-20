import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { agentDebate, type AgentDebateInput } from '@/ai/flows/agent-debate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AgentDebateInput;

    if (!body.topic || !body.initialContent || !body.agentRoles) {
      return NextResponse.json({ error: 'Missing required fields: topic, initialContent, agentRoles' }, { status: 400 });
    }

    const result = await agentDebate(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Agent Debate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to conduct agent debate.', details: errorMessage }, { status: 500 });
  }
}
