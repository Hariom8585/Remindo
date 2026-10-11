import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserTasks, createTask, TaskFilterOptions } from '@/lib/db-repository';
import { parseDateTimeInTimezone } from '@/lib/timezone';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const search = searchParams.get('search') || undefined;
  const status = (searchParams.get('status') as TaskFilterOptions['status']) || undefined;

  const tasks = await getUserTasks(session.userId, {
    category,
    priority,
    status,
    search,
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`task_create_${session.userId || ip}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, category, priority, dueDate, dueTime, alertMode, reminders } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const taskAlertMode = alertMode === 'NOTIFICATION' ? 'NOTIFICATION' : 'ALARM';
    const userTimezone = session.timezone || 'Asia/Kolkata';

    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = parseDateTimeInTimezone(dueDate, dueTime, userTimezone);
    }

    // Build scheduled reminders
    const reminderItems: Array<{ remindAt: Date; advanceMinutes?: number; channel?: string; alertMode?: string }> = [];

    if (parsedDueDate) {
      if (Array.isArray(reminders) && reminders.length > 0) {
        for (const rem of reminders) {
          const adv = typeof rem.advanceMinutes === 'number' ? rem.advanceMinutes : 0;
          const remindAtTime = new Date(parsedDueDate.getTime() - adv * 60 * 1000);
          reminderItems.push({
            remindAt: remindAtTime,
            advanceMinutes: adv,
            channel: rem.channel || 'BROWSER',
            alertMode: rem.alertMode || taskAlertMode,
          });
        }
      } else {
        // Default on-time reminder
        reminderItems.push({
          remindAt: parsedDueDate,
          advanceMinutes: 0,
          channel: 'BROWSER',
          alertMode: taskAlertMode,
        });
      }
    }

    const newTask = await createTask({
      userId: session.userId,
      title: title.trim(),
      description: description?.trim() || null,
      category: category || 'Other',
      priority: priority || 'MEDIUM',
      dueDate: parsedDueDate,
      dueTime: dueTime || null,
      alertMode: taskAlertMode,
      reminders: reminderItems,
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Task Error]', sanitizeErrorMessage(err));
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Internal server error' }, { status: 500 });
  }
}
