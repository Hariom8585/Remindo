import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { snoozeReminder } from '@/lib/db-repository';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const minutes = typeof body.minutes === 'number' && body.minutes > 0 ? body.minutes : 15;

    const updated = await snoozeReminder(params.id, session.userId, minutes);
    return NextResponse.json({ reminder: updated, message: `Snoozed for ${minutes} minutes` });
  } catch (err: any) {
    console.error('[Snooze Reminder Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
