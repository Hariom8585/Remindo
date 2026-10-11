'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Clock4,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { TaskItem } from './TaskCard';

interface LiveRemindersViewProps {
  tasks: TaskItem[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  onOpenQuickAdd: () => void;
}

export default function LiveRemindersView({
  tasks,
  onToggleComplete,
  onSnooze,
  onOpenQuickAdd,
}: LiveRemindersViewProps) {
  const [now, setNow] = useState(new Date());

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Collect all pending reminders with task context
  const pendingReminders: Array<{
    reminderId: string;
    remindAt: Date;
    task: TaskItem;
    advanceMinutes: number;
  }> = [];

  for (const t of tasks) {
    if (t.isCompleted) continue;
    if (t.reminders && t.reminders.length > 0) {
      for (const r of t.reminders) {
        if (r.status === 'PENDING') {
          pendingReminders.push({
            reminderId: r.id,
            remindAt: new Date(r.remindAt),
            task: t,
            advanceMinutes: r.advanceMinutes,
          });
        }
      }
    } else if (t.dueDate) {
      // If task has due date but no explicit reminder entry, synthesize for view
      const targetTime = t.dueTime ? `${t.dueDate.split('T')[0]}T${t.dueTime}:00` : `${t.dueDate.split('T')[0]}T09:00:00`;
      const dateObj = new Date(targetTime);
      pendingReminders.push({
        reminderId: `synth-${t.id}`,
        remindAt: dateObj,
        task: t,
        advanceMinutes: 0,
      });
    }
  }

  // Sort chronologically
  pendingReminders.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());

  // Next upcoming reminder (nearest future or earliest overdue)
  const nextReminder = pendingReminders[0];

  // Helper function to format countdown from real timestamps
  const formatCountdown = (target: Date) => {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) {
      const pastSeconds = Math.abs(Math.floor(diff / 1000));
      const pastMins = Math.floor(pastSeconds / 60);
      return { text: `Overdue by ${pastMins} min(s)`, isOverdue: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    let text = '';
    if (days > 0) text += `${days}d `;
    text += `${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
    return { text, isOverdue: false };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Header */}
      <div
        className="remindo-card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fbf9ff 60%, #f3ebff 100%)',
          border: '1.5px solid rgba(139, 92, 246, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--primary-gradient)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Next Scheduled Reminder</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Live real-time countdown calculated from your database
            </p>
          </div>
        </div>

        {nextReminder ? (
          <div>
            {/* Live Ticking Countdown Display */}
            <div
              style={{
                margin: '18px 0',
                padding: '16px 20px',
                borderRadius: '18px',
                background: '#ffffff',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Countdown Clock:
                </span>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    color: formatCountdown(nextReminder.remindAt).isOverdue ? 'var(--rose)' : 'var(--primary)',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: '2px',
                  }}
                >
                  {formatCountdown(nextReminder.remindAt).text}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <span className="badge badge-category">{nextReminder.task.category}</span>
                  {nextReminder.task.alertMode === 'NOTIFICATION' ? (
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                      <span>🔔</span> Notice
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
                      <span>🔊</span> Sound Alarm
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Alert at {format(nextReminder.remindAt, 'dd MMM, hh:mm a')}
                </div>
              </div>
            </div>

            {/* Imminent Task Details & Action Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                  {nextReminder.task.title}
                </h3>
                {nextReminder.task.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {nextReminder.task.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onToggleComplete(nextReminder.task.id, true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <CheckCircle2 size={15} /> Complete Task
                </button>

                {!nextReminder.reminderId.startsWith('synth-') && (
                  <button
                    type="button"
                    onClick={() => onSnooze(nextReminder.reminderId, 15)}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    <Clock4 size={14} color="var(--primary)" /> Snooze 15m
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0 16px 0' }}>
              No upcoming reminders found. All scheduled alerts are up to date!
            </p>
            <button onClick={onOpenQuickAdd} className="btn-primary">
              <Sparkles size={16} /> Schedule a Reminder
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Reminders Queue */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 12px 0' }}>
          Upcoming Reminder Queue ({pendingReminders.length})
        </h3>

        {pendingReminders.length === 0 ? (
          <div className="remindo-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Your reminder queue is completely clear.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingReminders.map((rem, idx) => {
              const countdown = formatCountdown(rem.remindAt);
              return (
                <div
                  key={`${rem.reminderId}-${idx}`}
                  className="remindo-card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderLeft: countdown.isOverdue
                      ? '4px solid var(--rose)'
                      : '4px solid var(--primary)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span className="badge badge-category">{rem.task.category}</span>
                      {rem.task.alertMode === 'NOTIFICATION' ? (
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.72rem' }}>
                          <span>🔔</span> Notice
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.25)', fontSize: '0.72rem' }}>
                          <span>🔊</span> Alarm
                        </span>
                      )}
                      {countdown.isOverdue && (
                        <span className="badge badge-overdue">Past Due</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block' }}>
                      {rem.task.title}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Scheduled for {format(rem.remindAt, 'EEEE, dd MMM yyyy • hh:mm a')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: countdown.isOverdue ? 'var(--rose)' : 'var(--primary)',
                        background: countdown.isOverdue ? 'var(--rose-light)' : 'var(--primary-light)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                      }}
                    >
                      {countdown.text}
                    </span>

                    {!rem.reminderId.startsWith('synth-') && (
                      <button
                        onClick={() => onSnooze(rem.reminderId, 60)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Snooze 1 hour"
                      >
                        +1h
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
