import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseTaskWithAI } from '@/lib/nlp/aiParser';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionUser(request);
    // Parsing can also be used during preview or authenticated sessions
    const body = await request.json();
    const { input, timezone } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    const userTimezone = timezone || session?.timezone || 'Asia/Kolkata';
    const parsed = await parseTaskWithAI(input.trim(), new Date(), userTimezone);

    return NextResponse.json({ result: parsed });
  } catch (err: any) {
    console.error('[AI Parse Task Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to parse task' }, { status: 500 });
  }
}
