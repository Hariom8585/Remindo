import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { toggleTaskComplete } from '@/lib/db-repository';

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
    const { isCompleted } = body;

    const updated = await toggleTaskComplete(params.id, session.userId, Boolean(isCompleted));
    return NextResponse.json({ task: updated });
  } catch (err: any) {
    console.error('[Toggle Task Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
