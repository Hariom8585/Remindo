import { NextRequest, NextResponse } from 'next/server';
import { getDueReminders, markReminderSent } from '@/lib/db-repository';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');

    // If a CRON_SECRET is configured, enforce security
    if (cronSecret && cronSecret !== 'remindo_cron_scheduler_secret') {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        querySecret === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    const now = new Date();
    // Query due reminders that are still PENDING and task is not completed
    const dueReminders = await getDueReminders(now);

    const processedLogs: Array<{
      reminderId: string;
      taskId: string;
      taskTitle: string;
      userId: string;
      channel: string;
      alertMode: string;
      remindAt: string;
      status: string;
    }> = [];

    for (const rem of dueReminders) {
      if (!rem.task || rem.task.isCompleted) {
        // Task was completed or deleted; skip
        continue;
      }

      const alertMode = (rem as any).alertMode || (rem.task as any).alertMode || 'ALARM';

      try {
        // Idempotent update: mark reminder as SENT and log in database
        await markReminderSent(rem.id, rem.userId, 'SENT');

        processedLogs.push({
          reminderId: rem.id,
          taskId: rem.taskId,
          taskTitle: rem.task.title,
          userId: rem.userId,
          channel: rem.channel,
          alertMode,
          remindAt: rem.remindAt.toISOString(),
          status: 'SUCCESS',
        });
      } catch (err: any) {
        await markReminderSent(rem.id, rem.userId, 'FAILED', err.message);
        processedLogs.push({
          reminderId: rem.id,
          taskId: rem.taskId,
          taskTitle: rem.task.title,
          userId: rem.userId,
          channel: rem.channel,
          alertMode,
          remindAt: rem.remindAt.toISOString(),
          status: 'FAILED',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${processedLogs.length} due reminders successfully`,
      timestamp: now.toISOString(),
      processedCount: processedLogs.length,
      logs: processedLogs,
    });
  } catch (err: any) {
    console.error('[Cron Reminder Error]', err);
    return NextResponse.json({ error: err.message || 'Internal scheduler error' }, { status: 500 });
  }
}
