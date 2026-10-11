'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Bell,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Search,
} from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import TaskCard, { TaskItem } from './TaskCard';
import CircularProgress from './CircularProgress';

interface HomeDashboardViewProps {
  userName?: string;
  tasks: TaskItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenQuickAdd: () => void;
  onOpenNotifications: () => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
}

const CATEGORY_FILTERS = [
  'All Tasks',
  'Personal',
  'College',
  'Work',
  'Payments',
  'Shopping',
  'Travel',
];

export default function HomeDashboardView({
  userName = 'Omkar',
  tasks,
  selectedCategory,
  onSelectCategory,
  onOpenQuickAdd,
  onOpenNotifications,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onSnooze,
}: HomeDashboardViewProps) {
  const currentDateFormatted = format(new Date(), 'EEEE, dd MMMM');

  // Filter tasks based on category
  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory === 'All Tasks') return true;
    if (selectedCategory === 'Personal') return t.category.toLowerCase().includes('personal') || t.category.toLowerCase().includes('family');
    if (selectedCategory === 'College') return t.category.toLowerCase().includes('college') || t.category.toLowerCase().includes('education');
    if (selectedCategory === 'Work') return t.category.toLowerCase().includes('work');
    if (selectedCategory === 'Payments') return t.category.toLowerCase().includes('payment');
    if (selectedCategory === 'Shopping') return t.category.toLowerCase().includes('shopping');
    if (selectedCategory === 'Travel') return t.category.toLowerCase().includes('travel') || t.category.toLowerCase().includes('booking');
    return t.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Calculate task counts
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const pendingCount = tasks.filter((t) => !t.isCompleted).length;

  // Today's tasks
  const todayTasks = filteredTasks.filter((t) => {
    if (t.isCompleted) return false;
    if (!t.dueDate) return true; // Undated tasks show in today's active flow
    const d = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
    return isToday(d);
  });

  // Upcoming deadlines (future, not today)
  const upcomingDeadlines = filteredTasks.filter((t) => {
    if (t.isCompleted || !t.dueDate) return false;
    const d = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
    return !isPast(d) && !isToday(d);
  });

  // Overdue tasks
  const overdueTasks = filteredTasks.filter((t) => {
    if (t.isCompleted || !t.dueDate) return false;
    const d = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
    return isPast(d) && !isToday(d);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header: Greeting, User Avatar & Notification Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {currentDateFormatted}
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', letterSpacing: '-0.5px' }}>
            Hello, {userName} 👋
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenNotifications}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid var(--border-card)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
            }}
            title="Notification Settings"
          >
            <Bell size={19} />
            {overdueTasks.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--rose)',
                }}
              />
            )}
          </button>

          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--primary-gradient)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.05rem',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* 2. Today's Progress Card with Circular Progress & Task Statistics */}
      <div
        className="remindo-card"
        style={{
          padding: '22px 20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fbf9ff 60%, #f4edff 100%)',
          border: '1.5px solid rgba(196, 181, 253, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, color: 'var(--primary)' }}>
            Daily Focus
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 6px 0', letterSpacing: '-0.3px' }}>
            {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'} for today
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            {completedCount} of {totalCount} total reminders completed
          </p>

          {/* Micro Stats Pills */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: '8px',
                background: 'var(--emerald-light)',
                color: 'var(--emerald)',
              }}
            >
              ✓ {completedCount} Done
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              ⏳ {pendingCount} Pending
            </span>
            {overdueTasks.length > 0 && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: '8px',
                  background: 'var(--rose-light)',
                  color: 'var(--rose)',
                }}
              >
                ⚠️ {overdueTasks.length} Overdue
              </span>
            )}
          </div>
        </div>

        {/* Circular Progress Ring */}
        <CircularProgress completed={completedCount} total={totalCount} size={74} strokeWidth={6.5} />
      </div>

      {/* 3. Category Filter Chips (All Tasks, Personal, College, Work...) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. Overdue Notice (if any) */}
      {overdueTasks.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: 'var(--rose-light)',
            border: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose)', fontWeight: 600, fontSize: '0.84rem' }}>
            <AlertCircle size={17} />
            <span>{overdueTasks.length} overdue task(s) require your attention</span>
          </div>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--rose)' }}>Review</span>
        </div>
      )}

      {/* 5. Today's Tasks Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Today&apos;s Schedule
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {todayTasks.length} items
          </span>
        </div>

        {todayTasks.length === 0 ? (
          <div
            className="remindo-card"
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={32} color="var(--primary)" style={{ opacity: 0.6 }} />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, margin: 0 }}>
              No tasks left for today!
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              You are all caught up. Tap + to schedule an assignment or reminder.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onSnooze={onSnooze}
              />
            ))}
          </div>
        )}
      </div>

      {/* 6. Upcoming Deadlines Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Upcoming Deadlines
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {upcomingDeadlines.length} upcoming
          </span>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div
            className="remindo-card"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
            }}
          >
            No upcoming deadlines beyond today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcomingDeadlines.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onSnooze={onSnooze}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
