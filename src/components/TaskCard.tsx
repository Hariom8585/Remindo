'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  MoreVertical,
  Bell,
  Clock4,
  Trash2,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate: string | null;
  dueTime: string | null;
  alertMode?: 'ALARM' | 'NOTIFICATION';
  isCompleted: boolean;
  completedAt: string | null;
  reminders: Array<{
    id: string;
    remindAt: string;
    advanceMinutes: number;
    status: string;
    alertMode?: 'ALARM' | 'NOTIFICATION';
  }>;
}

interface TaskCardProps {
  task: TaskItem;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
}

export default function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onSnooze,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  // Determine status (Overdue, Due Today, Upcoming, Completed)
  let isTaskOverdue = false;
  let isTaskDueToday = false;
  let formattedDateDisplay = '';

  if (task.dueDate) {
    const dateObj = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate);
    isTaskDueToday = isToday(dateObj);
    isTaskOverdue = !task.isCompleted && isPast(dateObj) && !isTaskDueToday;

    try {
      formattedDateDisplay = format(dateObj, 'dd MMM yyyy');
    } catch (e) {
      formattedDateDisplay = String(task.dueDate);
    }
  }

  const priorityClass =
    task.priority === 'HIGH'
      ? 'badge-high'
      : task.priority === 'LOW'
      ? 'badge-low'
      : 'badge-medium';

  const pendingReminder = task.reminders?.find((r) => r.status === 'PENDING');

  return (
    <div
      className="remindo-card"
      style={{
        padding: '16px 18px',
        opacity: task.isCompleted ? 0.6 : 1,
        borderColor: isTaskOverdue
          ? '#fecdd3'
          : isTaskDueToday
          ? '#fde68a'
          : undefined,
        background: isTaskOverdue
          ? '#fffbfb'
          : isTaskDueToday
          ? '#fffdfa'
          : '#ffffff',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Top row: Checkbox, Title, Badges, Menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Toggle Complete Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id, !task.isCompleted)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            marginTop: '2px',
            color: task.isCompleted ? 'var(--emerald)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          title={task.isCompleted ? 'Mark uncompleted' : 'Mark completed'}
        >
          {task.isCompleted ? (
            <CheckCircle2 size={22} color="var(--emerald)" />
          ) : (
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid #cbd5e1',
                background: '#ffffff',
                transition: 'border-color 0.2s',
              }}
            />
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className={`badge ${priorityClass}`}>{task.priority}</span>
            <span className="badge badge-category">{task.category}</span>

            {/* Alert Mode Badge */}
            {task.alertMode === 'NOTIFICATION' ? (
              <span
                className="badge"
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                title="Notification Only Alert"
              >
                <span>🔔</span> Notice
              </span>
            ) : (
              <span
                className="badge"
                style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                title="Sound Alarm Mode"
              >
                <span>🔊</span> Alarm
              </span>
            )}

            {isTaskOverdue && (
              <span className="badge badge-overdue">
                <AlertCircle size={11} /> Overdue
              </span>
            )}
            {isTaskDueToday && !task.isCompleted && (
              <span className="badge badge-due-today">
                <Clock4 size={11} /> Due Today
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: '0.98rem',
              fontWeight: 700,
              color: task.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: task.isCompleted ? 'line-through' : 'none',
              wordBreak: 'break-word',
              margin: '2px 0 3px 0',
            }}
          >
            {task.title}
          </h3>

          {task.description && (
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                margin: 0,
                wordBreak: 'break-word',
              }}
            >
              {task.description}
            </p>
          )}
        </div>

        {/* Action Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              padding: '4px',
              borderRadius: '6px',
              color: 'var(--text-muted)',
            }}
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: '#ffffff',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '6px',
                zIndex: 50,
                minWidth: '130px',
                boxShadow: 'var(--shadow-elevated)',
              }}
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit(task);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <Edit2 size={14} color="var(--primary)" /> Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(task.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  color: 'var(--rose)',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer row: Due date/time, reminders, snooze quick button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {formattedDateDisplay && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: isTaskOverdue ? 'var(--rose)' : isTaskDueToday ? 'var(--amber)' : 'var(--text-secondary)',
                fontWeight: isTaskOverdue || isTaskDueToday ? 700 : 500,
              }}
            >
              <Calendar size={13} /> {formattedDateDisplay}
            </span>
          )}

          {task.dueTime && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> {task.dueTime}
            </span>
          )}

          {task.reminders && task.reminders.length > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: pendingReminder ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600,
              }}
              title={`${task.reminders.length} reminder(s)`}
            >
              <Bell size={13} /> {task.reminders.length}
            </span>
          )}
        </div>

        {/* Quick Snooze Actions */}
        {!task.isCompleted && pendingReminder && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.74rem',
                color: 'var(--primary)',
                padding: '3px 8px',
                background: 'var(--primary-light)',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                fontWeight: 600,
              }}
            >
              <Clock4 size={12} /> Snooze
            </button>

            {showSnoozeMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: '100%',
                  marginBottom: '4px',
                  background: '#ffffff',
                  border: '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '4px',
                  zIndex: 50,
                  minWidth: '120px',
                  boxShadow: 'var(--shadow-elevated)',
                }}
                onMouseLeave={() => setShowSnoozeMenu(false)}
              >
                {[
                  { label: '+15 Mins', mins: 15 },
                  { label: '+1 Hour', mins: 60 },
                  { label: '+1 Day', mins: 1440 },
                ].map((sn) => (
                  <button
                    key={sn.mins}
                    onClick={() => {
                      setShowSnoozeMenu(false);
                      onSnooze(pendingReminder.id, sn.mins);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.76rem',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                    }}
                  >
                    {sn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
