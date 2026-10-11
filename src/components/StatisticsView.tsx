'use client';

import React from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock4,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { parseISO, isPast, isToday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { TaskItem } from './TaskCard';
import CircularProgress from './CircularProgress';

interface StatisticsViewProps {
  tasks: TaskItem[];
  onOpenQuickAdd: () => void;
}

export default function StatisticsView({ tasks, onOpenQuickAdd }: StatisticsViewProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted);
  const pendingTasks = tasks.filter((t) => !t.isCompleted);

  // Overdue count
  const overdueTasks = tasks.filter((t) => {
    if (t.isCompleted || !t.dueDate) return false;
    const d = typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate);
    return isPast(d) && !isToday(d);
  });

  // Completed this week
  const completedThisWeek = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    const d = typeof t.completedAt === 'string' ? parseISO(t.completedAt) : new Date(t.completedAt);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // 7-day weekly activity computation (Mon - Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const t of completedTasks) {
    if (t.completedAt) {
      const d = typeof t.completedAt === 'string' ? parseISO(t.completedAt) : new Date(t.completedAt);
      if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
        const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
        dayCounts[dayIdx]++;
      }
    }
  }

  const maxDayCount = Math.max(...dayCounts, 1);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  for (const t of tasks) {
    const cat = t.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }

  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div className="remindo-card" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald)', marginBottom: '4px' }}>
            <CheckCircle2 size={16} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Completed</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {completedTasks.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {completedThisWeek.length} finished this week
          </span>
        </div>

        <div className="remindo-card" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', marginBottom: '4px' }}>
            <Clock4 size={16} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Pending</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {pendingTasks.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Active reminders
          </span>
        </div>

        <div className="remindo-card" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rose)', marginBottom: '4px' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Overdue</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--rose)' }}>
            {overdueTasks.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Need attention
          </span>
        </div>

        <div className="remindo-card" style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', marginBottom: '4px' }}>
              <TrendingUp size={16} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Completion</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {completionRate}%
            </div>
          </div>
          <CircularProgress completed={completedTasks.length} total={totalTasks} size={54} strokeWidth={5} />
        </div>
      </div>

      {totalTasks === 0 ? (
        <div
          className="remindo-card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <BarChart3 size={40} color="var(--primary)" style={{ opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
            No productivity data yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '380px', margin: 0 }}>
            Start creating and completing tasks to see your weekly performance metrics, activity charts, and category breakdowns.
          </p>
          <button onClick={onOpenQuickAdd} className="btn-primary" style={{ marginTop: '6px' }}>
            <Sparkles size={16} /> Add Your First Task
          </button>
        </div>
      ) : (
        <>
          {/* Weekly Activity Bar Chart */}
          <div className="remindo-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Weekly Activity (Completed Tasks)
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                This Week (Mon - Sun)
              </span>
            </div>

            {/* Vertical Bar Chart Graphic */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '140px',
                paddingTop: '20px',
                borderBottom: '1.5px solid var(--border-subtle)',
                gap: '8px',
              }}
            >
              {daysOfWeek.map((dayName, idx) => {
                const count = dayCounts[idx];
                const heightPercent = maxDayCount > 0 ? Math.max((count / maxDayCount) * 100, 8) : 8;
                return (
                  <div
                    key={dayName}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {count}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '28px',
                        height: `${heightPercent}%`,
                        borderRadius: '6px 6px 2px 2px',
                        background: count > 0 ? 'var(--primary-gradient)' : '#f1f5f9',
                        boxShadow: count > 0 ? '0 2px 8px var(--primary-glow)' : 'none',
                        transition: 'height 0.4s ease',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Day Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {daysOfWeek.map((dayName) => (
                <span
                  key={dayName}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {dayName}
                </span>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="remindo-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <PieChart size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Tasks by Category
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categoryEntries.map(([categoryName, count]) => {
                const pct = Math.round((count / totalTasks) * 100);
                return (
                  <div key={categoryName}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{categoryName}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {count} task(s) ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: '4px',
                          background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
