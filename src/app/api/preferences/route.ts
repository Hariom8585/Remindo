import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserPreferences, updateUserPreferences } from '@/lib/db-repository';

export async function GET(request: NextRequest) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const preferences = await getUserPreferences(session.userId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await updateUserPreferences(session.userId, {
      defaultAdvanceMinutes: typeof body.defaultAdvanceMinutes === 'number' ? body.defaultAdvanceMinutes : undefined,
      defaultAlertMode: body.defaultAlertMode ? (body.defaultAlertMode === 'NOTIFICATION' ? 'NOTIFICATION' : 'ALARM') : undefined,
      defaultSnoozeMinutes: typeof body.defaultSnoozeMinutes === 'number' ? body.defaultSnoozeMinutes : undefined,
      soundEnabled: typeof body.soundEnabled === 'boolean' ? body.soundEnabled : undefined,
      theme: body.theme,
      timezone: body.timezone,
    });

    return NextResponse.json({ preferences: updated });
  } catch (err: any) {
    console.error('[Update Preferences Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
