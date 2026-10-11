'use client';

import React, { useState } from 'react';
import {
  Mic,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  Bell,
  Sparkles,
  X,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import { playReminderChime, previewAlarmSound } from '@/lib/notifications/webNotification';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceModal: () => void;
  onSaveTask: (taskData: {
    title: string;
    category: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
    alertMode: 'ALARM' | 'NOTIFICATION';
    reminders: Array<{ advanceMinutes: number }>;
  }) => Promise<void>;
  userTimezone?: string;
  defaultAlertMode?: 'ALARM' | 'NOTIFICATION';
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
  { minutes: 0, label: 'At event time' },
  { minutes: 15, label: '15 mins before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

export default function QuickAddTaskModal({
  isOpen,
  onClose,
  onOpenVoiceModal,
  onSaveTask,
  userTimezone = 'Asia/Kolkata',
  defaultAlertMode = 'ALARM',
}: QuickAddTaskModalProps) {
  const [naturalInput, setNaturalInput] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [alertMode, setAlertMode] = useState<'ALARM' | 'NOTIFICATION'>(defaultAlertMode);
  const [selectedReminders, setSelectedReminders] = useState<number[]>([0, 15]);
  const [hasInterpreted, setHasInterpreted] = useState(false);
  const [clarificationInfo, setClarificationInfo] = useState<{
    prompt?: string;
    suggestions?: Array<{ label: string; date: string; time: string }>;
  } | null>(null);

  if (!isOpen) return null;

  const handleInterpret = async (textToParse?: string) => {
    const query = textToParse || naturalInput;
    if (!query.trim()) return;

    setIsInterpreting(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query.trim(), timezone: userTimezone }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        const r = data.result;
        setTitle(r.title || query.trim());
        setCategory(r.category || 'Other');
        setPriority(r.priority || 'MEDIUM');
        setDueDate(r.dueDate || '');
        setDueTime(r.dueTime || '');
        setHasInterpreted(true);

        if (r.needsClarification && !r.dueDate) {
          setClarificationInfo({
            prompt: r.clarificationPrompt,
            suggestions: r.suggestions,
          });
        } else {
          setClarificationInfo(null);
        }
      } else {
        setTitle(query.trim());
        setHasInterpreted(true);
      }
    } catch (err: any) {
      setTitle(query.trim());
      setHasInterpreted(true);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleApplySuggestion = (sug: { date: string; time: string }) => {
    setDueDate(sug.date);
    setDueTime(sug.time);
    setClarificationInfo(null);
  };

  const toggleReminder = (minutes: number) => {
    if (selectedReminders.includes(minutes)) {
      setSelectedReminders(selectedReminders.filter((m) => m !== minutes));
    } else {
      setSelectedReminders([...selectedReminders, minutes]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || naturalInput.trim();
    if (!finalTitle) {
      setError('Please provide a task description');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSaveTask({
        title: finalTitle,
        category,
        priority,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        alertMode,
        reminders: selectedReminders.map((m) => ({ advanceMinutes: m })),
      });
      // Reset & close
      setNaturalInput('');
      setTitle('');
      setHasInterpreted(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ padding: '24px', maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
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
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                New Reminder
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Type or speak in plain English
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--rose-light)',
              color: 'var(--rose)',
              fontSize: '0.84rem',
              marginBottom: '16px',
              border: '1px solid rgba(225, 29, 72, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        {/* Big Input Inspired by Reference Design */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <textarea
            value={naturalInput}
            onChange={(e) => {
              setNaturalInput(e.target.value);
              if (!hasInterpreted) setTitle(e.target.value);
            }}
            placeholder="What do you need to remember?"
            rows={2}
            style={{
              width: '100%',
              fontSize: '1.05rem',
              fontWeight: 500,
              padding: '14px 48px 14px 16px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1.5px solid var(--border-subtle)',
              resize: 'none',
              lineHeight: 1.4,
            }}
          />
          <button
            type="button"
            onClick={onOpenVoiceModal}
            style={{
              position: 'absolute',
              right: '12px',
              top: '18px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Voice Input"
          >
            <Mic size={18} />
          </button>
        </div>

        {/* Natural Language Example Chips */}
        {!hasInterpreted && (
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Suggestions (Tap to test):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {[
                'Submit my assignment on 23 October',
                'Call Dad tomorrow at 6 PM',
                'Buy charger from shop this evening',
                'Send Rahul ₹500 tomorrow',
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setNaturalInput(ex);
                    handleInterpret(ex);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                  }}
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>

            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => handleInterpret()}
                disabled={!naturalInput.trim() || isInterpreting}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <Sparkles size={14} color="var(--primary)" />
                {isInterpreting ? 'Interpreting...' : 'Interpret Details'}
              </button>
            </div>
          </div>
        )}

        {/* Clarification Alert if deadline is missing */}
        {clarificationInfo && !dueDate && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'var(--amber-light)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber)', fontWeight: 700, fontSize: '0.86rem' }}>
              <HelpCircle size={16} />
              <span>When should Remindo alert you?</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '3px', marginBottom: '8px' }}>
              No deadline was found in your text. Pick a suggestion below or select a date/time.
            </p>
            {clarificationInfo.suggestions && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {clarificationInfo.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySuggestion(s)}
                    style={{
                      padding: '4px 10px',
                      background: '#ffffff',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      borderRadius: '16px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: 'var(--amber)',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Structured Form */}
        <form onSubmit={handleSubmit}>
          {hasInterpreted && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Interpreted Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.92rem' }}
              />
            </div>
          )}

          {/* Date and Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                <Calendar size={13} color="var(--primary)" /> Due Date:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                <Clock size={13} color="var(--primary)" /> Due Time:
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Category Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Tag size={13} color="var(--primary)" /> Category:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: category === cat ? 700 : 500,
                    background: category === cat ? 'var(--primary-gradient)' : '#f8fafc',
                    color: category === cat ? '#ffffff' : 'var(--text-secondary)',
                    border: `1px solid ${category === cat ? 'transparent' : 'var(--border-subtle)'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <AlertTriangle size={13} color="var(--amber)" /> Priority:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'HIGH', label: 'High Priority', color: 'var(--rose)', bg: 'var(--rose-light)' },
                { id: 'MEDIUM', label: 'Medium', color: 'var(--amber)', bg: 'var(--amber-light)' },
                { id: 'LOW', label: 'Low', color: 'var(--emerald)', bg: 'var(--emerald-light)' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: priority === p.id ? 700 : 500,
                    background: priority === p.id ? p.bg : '#f8fafc',
                    color: priority === p.id ? p.color : 'var(--text-secondary)',
                    border: `1.5px solid ${priority === p.id ? p.color : 'var(--border-subtle)'}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Type Selection: Sound Alarm vs Notification Only */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Volume2 size={13} color="var(--primary)" /> Alert Type:
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

          {/* Reminder Notifications Schedule */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Bell size={13} color="var(--primary)" /> Reminders:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = selectedReminders.includes(opt.minutes);
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => toggleReminder(opt.minutes)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '10px',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isSelected ? 'var(--primary-light)' : '#f8fafc',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '9px',
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

          {/* Action Row */}
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
              disabled={isSubmitting || (!naturalInput.trim() && !title.trim())}
              style={{ padding: '12px 24px' }}
            >
              {isSubmitting ? 'Saving Task...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
