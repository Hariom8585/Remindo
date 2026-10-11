'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Volume2, CheckCircle2, Clock, VolumeX, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  requestWebNotificationPermission,
  showWebNotification,
  playReminderChime,
  startAlarmSound,
  stopAlarmSound,
  isAlarmSounding,
} from '@/lib/notifications/webNotification';
import {
  initAndroidNotificationChannels,
  requestAndroidNotificationPermission,
} from '@/lib/notifications/capacitorNotification';

export interface ActiveAlarmItem {
  reminderId: string;
  taskId: string;
  taskTitle: string;
  alertMode: 'ALARM' | 'NOTIFICATION';
}

interface NotificationManagerProps {
  onRefreshTasks?: () => void;
}

export default function NotificationManager({ onRefreshTasks }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmItem | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    setPermission(Notification.permission);

    // If Capacitor native environment, initialize channels & request permissions
    initAndroidNotificationChannels();
    requestAndroidNotificationPermission();

    // Foreground poller: Checks due reminders every 20 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/cron/reminders');
        if (res.ok) {
          const data = await res.json();
          if (data.processedCount > 0 && Array.isArray(data.logs)) {
            // Trigger alerts for each processed reminder
            for (const item of data.logs) {
              if (item.status === 'SUCCESS') {
                const isAlarmMode = item.alertMode !== 'NOTIFICATION';

                if (isAlarmMode) {
                  // SOUND ALARM MODE: continuous audible sound + active ringing modal + heads-up alert
                  startAlarmSound();
                  setActiveAlarm({
                    reminderId: item.reminderId,
                    taskId: item.taskId,
                    taskTitle: item.taskTitle,
                    alertMode: 'ALARM',
                  });

                  showWebNotification({
                    title: `🔊 Alarm: ${item.taskTitle}`,
                    body: `Alarm is ringing for: ${item.taskTitle}. Click to stop or snooze.`,
                    tag: `remindo-alarm-${item.reminderId}`,
                    alertMode: 'ALARM',
                    onClick: () => {
                      // Handled by modal
                    },
                  });
                } else {
                  // NOTIFICATION ONLY MODE: gentle single chime + standard notification (NO continuous sound)
                  playReminderChime();
                  showToast(`🔔 Reminder: ${item.taskTitle}`);

                  showWebNotification({
                    title: `🔔 Reminder: ${item.taskTitle}`,
                    body: `It's time for: ${item.taskTitle}`,
                    tag: `remindo-notice-${item.reminderId}`,
                    alertMode: 'NOTIFICATION',
                  });
                }
              }
            }
            if (onRefreshTasks) {
              onRefreshTasks();
            }
          }
        }
      } catch (err) {
        // Background check silent fail
      }
    }, 20000);

    return () => {
      clearInterval(interval);
      stopAlarmSound();
    };
  }, [onRefreshTasks]);

  const handleRequestPermission = async () => {
    const result = await requestWebNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      showToast('Notifications enabled successfully!');
      showWebNotification({
        title: 'REMINDO Notifications Enabled',
        body: 'You will receive timely alerts for your deadlines and tasks.',
        alertMode: 'NOTIFICATION',
      });
    }
  };

  const handleStopAlarm = async () => {
    stopAlarmSound();
    if (activeAlarm) {
      try {
        await fetch(`/api/reminders/${activeAlarm.reminderId}/dismiss`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to dismiss reminder:', e);
      }
      showToast(`Alarm stopped for "${activeAlarm.taskTitle}"`);
      setActiveAlarm(null);
      if (onRefreshTasks) onRefreshTasks();
    }
  };

  const handleSnoozeAlarm = async (minutes: number = 10) => {
    stopAlarmSound();
    if (activeAlarm) {
      try {
        await fetch(`/api/reminders/${activeAlarm.reminderId}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes }),
        });
      } catch (e) {
        console.error('Failed to snooze reminder:', e);
      }
      showToast(`Alarm snoozed for ${minutes} minutes`);
      setActiveAlarm(null);
      if (onRefreshTasks) onRefreshTasks();
    }
  };

  const handleCompleteTask = async () => {
    stopAlarmSound();
    if (activeAlarm) {
      try {
        await fetch(`/api/tasks/${activeAlarm.taskId}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted: true }),
        });
      } catch (e) {
        console.error('Failed to complete task:', e);
      }
      showToast(`Task marked complete: "${activeAlarm.taskTitle}"`);
      setActiveAlarm(null);
      if (onRefreshTasks) onRefreshTasks();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* ACTIVE RINGING ALARM MODAL (SOUND ALARM MODE)            */}
      {/* ======================================================== */}
      {activeAlarm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 99999,
            animation: 'modalIn 0.25s ease-out',
          }}
        >
          <div
            className="remindo-card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '28px 24px',
              textAlign: 'center',
              background: 'linear-gradient(145deg, #ffffff 0%, #fdf4ff 100%)',
              border: '2px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 20px 45px rgba(219, 39, 119, 0.25), 0 0 25px rgba(99, 102, 241, 0.2)',
            }}
          >
            {/* Pulsing Alarm Icon Badge */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 8px 24px rgba(236, 72, 153, 0.45)',
                animation: 'pulseGlow 1.2s infinite alternate',
              }}
            >
              <Volume2 size={40} />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(236, 72, 153, 0.12)',
                color: '#db2777',
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              🔊 Sound Alarm Ringing
            </div>

            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              {activeAlarm.taskTitle}
            </h2>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 24px' }}>
              Your scheduled deadline is due now. The alarm will continue sounding until you stop it.
            </p>

            {/* Alarm Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Stop Alarm */}
              <button
                onClick={handleStopAlarm}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <VolumeX size={20} /> Stop Alarm
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Snooze 10 Minutes */}
                <button
                  onClick={() => handleSnoozeAlarm(10)}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    padding: '11px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={16} /> Snooze 10m
                </button>

                {/* Complete Task */}
                <button
                  onClick={handleCompleteTask}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    padding: '11px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: 'var(--emerald)',
                    borderColor: '#a7f3d0',
                  }}
                >
                  <CheckCircle2 size={16} /> Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid var(--border-glow)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-card)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 500,
            animation: 'modalIn 0.2s ease-out',
          }}
        >
          <Bell size={18} color="var(--cyan)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Permission Request Prompt (if not yet granted) */}
      {isSupported && permission !== 'granted' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.88rem', color: '#c7d2fe' }}>
              Enable browser notifications to receive sound alarms and reminder alerts when deadlines arrive.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRequestPermission}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}
    </>
  );
}
