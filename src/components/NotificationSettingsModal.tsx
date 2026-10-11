'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  Moon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  VolumeX,
  Smartphone,
  Info,
} from 'lucide-react';
import {
  requestWebNotificationPermission,
  showWebNotification,
  playReminderChime,
  previewAlarmSound,
} from '@/lib/notifications/webNotification';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPreferences?: any;
  onPreferencesUpdated?: (updated: any) => void;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  userPreferences,
  onPreferencesUpdated,
}: NotificationSettingsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [defaultAlertMode, setDefaultAlertMode] = useState<'ALARM' | 'NOTIFICATION'>('ALARM');
  const [defaultSnooze, setDefaultSnooze] = useState(15);
  const [defaultAdvance, setDefaultAdvance] = useState(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    if (userPreferences) {
      if (userPreferences.defaultAlertMode) {
        setDefaultAlertMode(userPreferences.defaultAlertMode);
      }
      if (typeof userPreferences.defaultSnoozeMinutes === 'number') {
        setDefaultSnooze(userPreferences.defaultSnoozeMinutes);
      }
      if (typeof userPreferences.defaultAdvanceMinutes === 'number') {
        setDefaultAdvance(userPreferences.defaultAdvanceMinutes);
      }
      if (typeof userPreferences.soundEnabled === 'boolean') {
        setSoundEnabled(userPreferences.soundEnabled);
      }
    }
  }, [isOpen, userPreferences]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await requestWebNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      playReminderChime();
      showWebNotification({
        title: 'REMINDO Notifications Enabled',
        body: 'You will receive timely sound alarms and notifications for your deadlines.',
        alertMode: 'NOTIFICATION',
      });
    }
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultAlertMode,
          defaultSnoozeMinutes: defaultSnooze,
          defaultAdvanceMinutes: defaultAdvance,
          soundEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onPreferencesUpdated) {
          onPreferencesUpdated(data.preferences);
        }
      }
    } catch (e) {
      console.error('Failed to save preferences:', e);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ padding: '24px', maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Notification Preferences</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Configure alert delivery, sound alarm, and snooze defaults
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Permission Status Box */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background:
              permission === 'granted'
                ? 'var(--emerald-light)'
                : 'var(--primary-light)',
            border: `1.5px solid ${permission === 'granted' ? '#a7f3d0' : 'rgba(139, 92, 246, 0.3)'}`,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {permission === 'granted' ? (
              <CheckCircle2 size={22} color="var(--emerald)" />
            ) : (
              <AlertCircle size={22} color="var(--primary)" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: permission === 'granted' ? 'var(--emerald)' : 'var(--text-primary)' }}>
                {permission === 'granted' ? 'Notifications Active' : 'Permission Required'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {permission === 'granted'
                  ? 'Browser & Android push alerts enabled'
                  : 'Allow alerts to receive timely reminders and alarms'}
              </div>
            </div>
          </div>

          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Enable Now
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* 1. DEFAULT ALERT MODE SELECTION                          */}
        {/* ======================================================== */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
            Default Alert Mode
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Sound Alarm Card */}
            <button
              type="button"
              onClick={() => setDefaultAlertMode('ALARM')}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${defaultAlertMode === 'ALARM' ? 'var(--primary)' : 'var(--border-card)'}`,
                background: defaultAlertMode === 'ALARM' ? 'var(--primary-light)' : '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: defaultAlertMode === 'ALARM' ? 'var(--primary)' : 'var(--text-primary)' }}>
                <span>🔊</span> Sound Alarm
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.25 }}>
                Loud continuous alarm ringing until stopped or snoozed.
              </div>
            </button>

            {/* Notification Only Card */}
            <button
              type="button"
              onClick={() => setDefaultAlertMode('NOTIFICATION')}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: `2px solid ${defaultAlertMode === 'NOTIFICATION' ? 'var(--primary)' : 'var(--border-card)'}`,
                background: defaultAlertMode === 'NOTIFICATION' ? 'var(--primary-light)' : '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: defaultAlertMode === 'NOTIFICATION' ? 'var(--primary)' : 'var(--text-primary)' }}>
                <span>🔔</span> Notification Only
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.25 }}>
                Normal banner alert with brief gentle chime. No loop.
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SOUND PREVIEW BUTTONS                                 */}
        {/* ======================================================== */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            marginBottom: '18px',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sound Previews
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => previewAlarmSound(3000)}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>🔊</span> Test Alarm (3s)
            </button>
            <button
              type="button"
              onClick={() => playReminderChime()}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>🔔</span> Test Chime
            </button>
          </div>
        </div>

        {/* Setting Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
          {/* Default Snooze length */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Default Snooze Duration</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Time added when snoozing an alert
                </div>
              </div>
            </div>
            <select
              value={defaultSnooze}
              onChange={(e) => setDefaultSnooze(parseInt(e.target.value, 10))}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
            </select>
          </div>

          {/* Default advance time */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Default Advance Notice</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Advance notice before deadline time
                </div>
              </div>
            </div>
            <select
              value={defaultAdvance}
              onChange={(e) => setDefaultAdvance(parseInt(e.target.value, 10))}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value={0}>At event time</option>
              <option value={15}>15 mins before</option>
              <option value={30}>30 mins before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>
        </div>

        {/* Platform Limitation Notice (Educational & Transparent) */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Info size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.76rem', color: '#92400e', lineHeight: 1.4 }}>
            <strong>Web vs Android App Alert Delivery:</strong>
            <br />
            Browsers restrict sound and timers when closed or when the screen is locked. For guaranteed alarm-clock alerts and sound even when closed, use the REMINDO Android App with exact alarms enabled.
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="btn-primary"
            style={{ flex: 1, padding: '10px' }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
