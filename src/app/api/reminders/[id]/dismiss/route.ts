import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { dismissReminder } from '@/lib/db-repository';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dismissed = await dismissReminder(params.id, session.userId);
    return NextResponse.json({ reminder: dismissed, message: 'Reminder alarm dismissed' });
  } catch (err: any) {
    console.error('[Dismiss Reminder Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
