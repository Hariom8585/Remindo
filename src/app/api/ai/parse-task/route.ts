import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseTaskWithAI } from '@/lib/nlp/aiParser';
import { parseMultipleTasksDeterministic } from '@/lib/nlp/parseTaskDeterministic';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`ai_parse_${ip}`, 45, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a few seconds before trying again.' },
      { status: 429 }
    );
  }

  try {
    const session = getSessionUser(request);
    const body = await request.json();
    const { input, timezone } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    const userTimezone = timezone || session?.timezone || 'Asia/Kolkata';
    const text = input.trim();

    // Check if multiple tasks are present
    const multiTasks = parseMultipleTasksDeterministic(text, new Date(), userTimezone);
    const isMultiTask = multiTasks.length > 1;

    let primaryResult;
    if (!isMultiTask) {
      primaryResult = await parseTaskWithAI(text, new Date(), userTimezone);
    } else {
      primaryResult = multiTasks[0];
    }

    return NextResponse.json({
      result: primaryResult,
      tasks: multiTasks,
      isMultiTask,
    });
  } catch (err: any) {
    console.error('[AI Parse Task Error]', sanitizeErrorMessage(err));
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Failed to parse task' }, { status: 500 });
  }
}
