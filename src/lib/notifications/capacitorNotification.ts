import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const REMINDO_ALARM_CHANNEL_ID = 'remindo_sound_alarm';
export const REMINDO_NOTICE_CHANNEL_ID = 'remindo_notification_only';

export async function isNativePlatform(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

export async function initAndroidNotificationChannels() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 1. High-Importance Sound Alarm Channel (plays alarm sound, vibrates, heads-up)
    await LocalNotifications.createChannel({
      id: REMINDO_ALARM_CHANNEL_ID,
      name: 'Remindo Sound Alarms',
      description: 'Audible loud alarms with Stop and Snooze controls for deadlines',
      importance: 5, // High importance (heads-up banner + sound)
      visibility: 1, // Public on lockscreen
      sound: 'alarm.wav',
      vibration: true,
      lights: true,
      lightColor: '#6366f1',
    });

    // 2. Notification-Only Channel (standard notification chime, no continuous sound)
    await LocalNotifications.createChannel({
      id: REMINDO_NOTICE_CHANNEL_ID,
      name: 'Remindo Standard Notifications',
      description: 'Standard notifications without continuous alarm sound',
      importance: 3, // Standard priority
      visibility: 1,
      vibration: true,
      lights: false,
    });

    // 3. Register Action Types for both modes
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'ALARM_ACTIONS',
          actions: [
            {
              id: 'stop_alarm',
              title: '🛑 Stop Alarm',
              foreground: true,
            },
            {
              id: 'snooze_15',
              title: '⏰ Snooze 15m',
              foreground: false,
            },
            {
              id: 'done',
              title: '✓ Complete',
              foreground: false,
            },
          ],
        },
        {
          id: 'TASK_ACTIONS',
          actions: [
            {
              id: 'done',
              title: '✓ Complete',
              foreground: false,
            },
            {
              id: 'snooze_15',
              title: '⏰ Snooze 15m',
              foreground: false,
            },
          ],
        },
      ],
    });

    // 4. Attach listener for notification actions (Stop, Snooze, Complete)
    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      const { actionId, notification } = action;
      const extra = notification.extra || {};

      console.log(`[Remindo Action] Notification action triggered: ${actionId}`, extra);

      if (actionId === 'stop_alarm' && extra.reminderId) {
        try {
          await fetch(`/api/reminders/${extra.reminderId}/dismiss`, { method: 'POST' });
        } catch (e) {
          console.error('Failed to dismiss reminder alarm via action:', e);
        }
      } else if (actionId === 'snooze_15' && extra.reminderId) {
        try {
          await fetch(`/api/reminders/${extra.reminderId}/snooze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: 15 }),
          });
        } catch (e) {
          console.error('Failed to snooze reminder via action:', e);
        }
      } else if (actionId === 'done' && extra.taskId) {
        try {
          await fetch(`/api/tasks/${extra.taskId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isCompleted: true }),
          });
        } catch (e) {
          console.error('Failed to mark task complete via action:', e);
        }
      }
    });
  } catch (err) {
    console.error('[Remindo Capacitor] Failed to setup notification channels:', err);
  }
}

export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch (err) {
    console.error('[Remindo Capacitor] Failed to request permissions:', err);
    return false;
  }
}

export async function scheduleAndroidReminder(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  alertMode?: 'ALARM' | 'NOTIFICATION';
  extra?: any;
}) {
  if (!Capacitor.isNativePlatform()) return;

  const isAlarm = options.alertMode !== 'NOTIFICATION';
  const channelId = isAlarm ? REMINDO_ALARM_CHANNEL_ID : REMINDO_NOTICE_CHANNEL_ID;
  const actionTypeId = isAlarm ? 'ALARM_ACTIONS' : 'TASK_ACTIONS';

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: { at: options.scheduleAt, allowWhileIdle: true },
          channelId,
          actionTypeId,
          extra: options.extra,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#6366f1',
          sound: isAlarm ? 'alarm.wav' : undefined,
        },
      ],
    });
    console.log(
      `[Remindo Capacitor] Scheduled ${isAlarm ? 'ALARM' : 'NOTIFICATION'} ${options.id} at ${options.scheduleAt.toISOString()}`
    );
  } catch (err) {
    console.error('[Remindo Capacitor] Failed to schedule notification:', err);
  }
}

export async function cancelAndroidReminder(id: number) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id }],
    });
  } catch (err) {
    console.error('[Remindo Capacitor] Failed to cancel notification:', err);
  }
}
