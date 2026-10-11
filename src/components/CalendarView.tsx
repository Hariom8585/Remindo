'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock4,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isPast,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { TaskItem } from './TaskCard';

interface CalendarViewProps {
  tasks: TaskItem[];
  onOpenQuickAdd: (datePreselect?: string) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
}

export default function CalendarView({
  tasks,
  onOpenQuickAdd,
  onToggleComplete,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Compute days to display
  let days: Date[] = [];
  if (viewMode === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  } else {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  }

  // Filter tasks for selected date
  const selectedDateTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const taskDate = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
    return isSameDay(taskDate, selectedDate);
  });

  // Sort by time
  selectedDateTasks.sort((a, b) => {
    if (!a.dueTime) return 1;
    if (!b.dueTime) return -1;
    return a.dueTime.localeCompare(b.dueTime);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Calendar Header with Navigation and View Toggle */}
      <div
        className="remindo-card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              {format(selectedDate, 'EEEE, dd MMMM')} selected
            </p>
          </div>
        </div>

        {/* View Mode & Nav Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
            <button
              onClick={() => setViewMode('week')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'week' ? 700 : 500,
                background: viewMode === 'week' ? '#ffffff' : 'transparent',
                color: viewMode === 'week' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'week' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'month' ? 700 : 500,
                background: viewMode === 'month' ? '#ffffff' : 'transparent',
                color: viewMode === 'month' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Month
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Today
          </button>

          <button
            onClick={prevPeriod}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextPeriod}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Date Strip / Grid */}
      <div
        className="remindo-card"
        style={{
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: viewMode === 'week' ? 'repeat(7, 1fr)' : 'repeat(7, 1fr)',
          gap: '8px',
          textAlign: 'center',
        }}
      >
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          // Count tasks on this day
          const dayTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            const d = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
            return isSameDay(d, day);
          });
          const hasTasks = dayTasks.length > 0;
          const hasOverdue = dayTasks.some((t) => !t.isCompleted && isPast(day) && !isToday(day));

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(day)}
              style={{
                padding: viewMode === 'week' ? '12px 6px' : '10px 4px',
                borderRadius: '14px',
                background: isSelected
                  ? 'var(--primary-gradient)'
                  : isTodayDate
                  ? 'var(--primary-light)'
                  : 'transparent',
                color: isSelected ? '#ffffff' : isTodayDate ? 'var(--primary)' : 'var(--text-primary)',
                border: `1.5px solid ${isSelected ? 'transparent' : isTodayDate ? 'rgba(139, 92, 246, 0.4)' : 'transparent'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  opacity: isSelected ? 0.9 : 0.6,
                }}
              >
                {format(day, 'EEE')}
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {format(day, 'd')}
              </span>

              {/* Task indicator dot */}
              <div style={{ height: '6px', display: 'flex', gap: '2px', alignItems: 'center' }}>
                {hasTasks && (
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isSelected
                        ? '#ffffff'
                        : hasOverdue
                        ? 'var(--rose)'
                        : 'var(--primary)',
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Task Stream */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Schedule for {format(selectedDate, 'dd MMMM yyyy')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {selectedDateTasks.length} reminder(s) configured
            </p>
          </div>
          <button
            onClick={() => onOpenQuickAdd(format(selectedDate, 'yyyy-MM-dd'))}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Add Task
          </button>
        </div>

        {selectedDateTasks.length === 0 ? (
          <div
            className="remindo-card"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CalendarIcon size={34} color="var(--primary)" style={{ opacity: 0.6 }} />
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>
              No tasks scheduled for this day
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '340px', margin: 0 }}>
              Enjoy your free time, or schedule an assignment, meeting, or personal reminder.
            </p>
            <button
              onClick={() => onOpenQuickAdd(format(selectedDate, 'yyyy-MM-dd'))}
              className="btn-secondary"
              style={{ marginTop: '8px', fontSize: '0.84rem' }}
            >
              <Plus size={14} /> Schedule for {format(selectedDate, 'dd MMM')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedDateTasks.map((t) => {
              const isTaskOverdue = !t.isCompleted && isPast(selectedDate) && !isToday(selectedDate);
              return (
                <div
                  key={t.id}
                  className="remindo-card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: t.isCompleted ? 0.65 : 1,
                  }}
                >
                  <button
                    onClick={() => onToggleComplete(t.id, !t.isCompleted)}
                    style={{
                      padding: 0,
                      color: t.isCompleted ? 'var(--emerald)' : 'var(--text-muted)',
                      display: 'flex',
                    }}
                  >
                    {t.isCompleted ? <CheckCircle2 size={22} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)' }} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="badge badge-category">{t.category}</span>
                      <span className="badge" style={{ fontSize: '0.72rem', background: t.alertMode === 'NOTIFICATION' ? '#f1f5f9' : 'rgba(236, 72, 153, 0.1)', color: t.alertMode === 'NOTIFICATION' ? '#475569' : '#db2777' }}>
                        {t.alertMode === 'NOTIFICATION' ? '🔔 Notice' : '🔊 Alarm'}
                      </span>
                      {isTaskOverdue && (
                        <span className="badge badge-overdue">
                          <AlertCircle size={10} /> Overdue
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: t.isCompleted ? 'line-through' : 'none',
                        display: 'block',
                      }}
                    >
                      {t.title}
                    </span>
                  </div>

                  {t.dueTime && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        background: 'var(--primary-light)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                      }}
                    >
                      <Clock size={13} /> {t.dueTime}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
