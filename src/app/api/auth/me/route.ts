import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { findUserById, getUserPreferences, getDatabaseStatus } from '@/lib/db-repository';

export async function GET(request: NextRequest) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const preferences = await getUserPreferences(session.userId);
  const dbStatus = getDatabaseStatus();

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
    },
    preferences,
    databaseStatus: dbStatus,
  });
}
