
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auditContentAgainstBrand, type BrandAuditInput } from '@/ai/flows/brand-audit-flow';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as BrandAuditInput;

    if (!body.contentToCheck || !body.brandProfile) {
      return NextResponse.json({ error: 'Missing required fields: contentToCheck and brandProfile' }, { status: 400 });
    }

    const result = await auditContentAgainstBrand(body);
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Brand Audit API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to audit content.', details: errorMessage }, { status: 500 });
  }
}
