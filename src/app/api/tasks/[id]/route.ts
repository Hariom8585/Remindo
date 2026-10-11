import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTaskById, updateTask, deleteTask } from '@/lib/db-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await getTaskById(params.id, session.userId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, category, priority, dueDate, dueTime, alertMode, reminders } = body;

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      if (dueTime) {
        parsedDueDate = new Date(`${dueDate}T${dueTime}:00`);
      } else {
        parsedDueDate = new Date(`${dueDate}T09:00:00`);
      }
    }

    let reminderItems: Array<{ remindAt: Date; advanceMinutes?: number; channel?: string; alertMode?: string }> | undefined;
    if (Array.isArray(reminders)) {
      reminderItems = [];
      if (parsedDueDate) {
        for (const rem of reminders) {
          const adv = typeof rem.advanceMinutes === 'number' ? rem.advanceMinutes : 0;
          const remindAtTime = new Date(parsedDueDate.getTime() - adv * 60 * 1000);
          reminderItems.push({
            remindAt: remindAtTime,
            advanceMinutes: adv,
            channel: rem.channel || 'BROWSER',
            alertMode: rem.alertMode || alertMode,
          });
        }
      }
    }

    const updated = await updateTask(params.id, session.userId, {
      title,
      description,
      category,
      priority,
      dueDate: parsedDueDate,
      dueTime: dueTime || null,
      alertMode: alertMode ? (alertMode === 'NOTIFICATION' ? 'NOTIFICATION' : 'ALARM') : undefined,
      reminders: reminderItems,
    });

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    console.error('[Update Task Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteTask(params.id, session.userId);
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Task Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
