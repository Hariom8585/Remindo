'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  Bell,
  CheckCircle,
  X,
  HelpCircle,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import { playReminderChime, previewAlarmSound } from '@/lib/notifications/webNotification';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedData: {
    title: string;
    originalInput?: string;
    dueDate: string | null;
    dueTime: string | null;
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    alertMode?: 'ALARM' | 'NOTIFICATION';
    hasDeadline: boolean;
    needsClarification: boolean;
    clarificationPrompt?: string;
    suggestions?: Array<{ label: string; date: string; time: string }>;
    reminders?: Array<{ advanceMinutes: number; label: string }>;
  } | null;
  onConfirm: (finalTask: {
    title: string;
    category: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
    alertMode: 'ALARM' | 'NOTIFICATION';
    reminders: Array<{ advanceMinutes: number }>;
  }) => Promise<void>;
}

const CATEGORIES = [
  'College & Education',
  'Family & Personal',
  'Payments',
  'Shopping',
  'Travel & Booking',
  'Work',
  'Other',
];

const REMINDER_OPTIONS = [
  { minutes: 0, label: 'At time of event' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

export default function ConfirmationModal({
  isOpen,
  onClose,
  parsedData,
  onConfirm,
}: ConfirmationModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [alertMode, setAlertMode] = useState<'ALARM' | 'NOTIFICATION'>('ALARM');
  const [selectedReminders, setSelectedReminders] = useState<number[]>([0, 15]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsedData) {
      setTitle(parsedData.title || '');
      setCategory(parsedData.category || 'Other');
      setPriority(parsedData.priority || 'MEDIUM');
      setDueDate(parsedData.dueDate || '');
      setDueTime(parsedData.dueTime || '');
      setAlertMode(parsedData.alertMode || 'ALARM');
      setSelectedReminders([0, 15]);
      setError(null);
    }
  }, [parsedData]);

  if (!isOpen || !parsedData) return null;

  const toggleReminder = (minutes: number) => {
    if (selectedReminders.includes(minutes)) {
      setSelectedReminders(selectedReminders.filter((m) => m !== minutes));
    } else {
      setSelectedReminders([...selectedReminders, minutes]);
    }
  };

  const handleApplySuggestion = (suggestion: { date: string; time: string }) => {
    setDueDate(suggestion.date);
    setDueTime(suggestion.time);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        title: title.trim(),
        category,
        priority,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        alertMode,
        reminders: selectedReminders.map((m) => ({ advanceMinutes: m })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ padding: '24px', maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Confirm Reminder Details</h2>
          </div>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Clarification Alert if deadline was missing in input */}
        {parsedData.needsClarification && !dueDate && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'var(--amber-light)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)', fontWeight: 700, fontSize: '0.88rem' }}>
              <HelpCircle size={18} />
              <span>When should Remindo remind you?</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '4px', marginBottom: '10px' }}>
              No deadline or time was mentioned in your input. Remindo never silently invents dates without your confirmation.
            </p>

            {parsedData.suggestions && parsedData.suggestions.length > 0 && (
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#78350f', fontWeight: 700, letterSpacing: '0.5px' }}>
                  <Lightbulb size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Optional Suggestions (Tap to pick):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {parsedData.suggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplySuggestion(sug)}
                      style={{
                        padding: '5px 12px',
                        background: '#ffffff',
                        border: '1px solid rgba(217, 119, 6, 0.35)',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        color: 'var(--amber)',
                        fontWeight: 600,
                      }}
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#fda4af',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Task Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit NPTEL assignment"
              required
              style={{ width: '100%', fontSize: '0.95rem' }}
            />
          </div>

          {/* Date and Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Calendar size={14} /> Due Date:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Clock size={14} /> Due Time:
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Category & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Tag size={14} /> Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <AlertTriangle size={14} /> Priority:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Alert Type Selection: Sound Alarm vs Notification Only */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Volume2 size={14} color="var(--primary)" /> Alert Type:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => previewAlarmSound(2500)}
                  style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  🔊 Test Alarm
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>•</span>
                <button
                  type="button"
                  onClick={() => playReminderChime()}
                  style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  🔔 Test Chime
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAlertMode('ALARM')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: `1.5px solid ${alertMode === 'ALARM' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: alertMode === 'ALARM' ? 'var(--primary-light)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: alertMode === 'ALARM' ? 700 : 500,
                  color: alertMode === 'ALARM' ? 'var(--primary)' : 'var(--text-primary)',
                  boxShadow: alertMode === 'ALARM' ? '0 2px 8px rgba(139, 92, 246, 0.15)' : 'none',
                }}
              >
                <span>🔊</span> Sound Alarm
              </button>
              <button
                type="button"
                onClick={() => setAlertMode('NOTIFICATION')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: `1.5px solid ${alertMode === 'NOTIFICATION' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: alertMode === 'NOTIFICATION' ? 'var(--primary-light)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: alertMode === 'NOTIFICATION' ? 700 : 500,
                  color: alertMode === 'NOTIFICATION' ? 'var(--primary)' : 'var(--text-primary)',
                  boxShadow: alertMode === 'NOTIFICATION' ? '0 2px 8px rgba(139, 92, 246, 0.15)' : 'none',
                }}
              >
                <span>🔔</span> Notification Only
              </button>
            </div>
          </div>

          {/* Reminder Schedule */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <Bell size={14} /> Reminder Schedules:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = selectedReminders.includes(opt.minutes);
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => toggleReminder(opt.minutes)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'var(--primary-light)' : '#f8fafc',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '11px',
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Confirm & Save Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
