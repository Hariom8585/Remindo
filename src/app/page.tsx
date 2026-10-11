'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Bell,
  LogOut,
  User,
  Shield,
  Home,
  Calendar as CalendarIcon,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
} from 'lucide-react';
import { TaskItem } from '@/components/TaskCard';
import HomeDashboardView from '@/components/HomeDashboardView';
import CalendarView from '@/components/CalendarView';
import AiAssistantView from '@/components/AiAssistantView';
import LiveRemindersView from '@/components/LiveRemindersView';
import StatisticsView from '@/components/StatisticsView';
import QuickAddTaskModal from '@/components/QuickAddTaskModal';
import VoiceInputModal from '@/components/VoiceInputModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import TaskEditModal from '@/components/TaskEditModal';
import NotificationSettingsModal from '@/components/NotificationSettingsModal';
import AuthModal from '@/components/AuthModal';
import NotificationManager from '@/components/NotificationManager';
import BottomNavBar, { AppTab } from '@/components/BottomNavBar';

export default function RemindoApp() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active Screen / Tab
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedCategory, setSelectedCategory] = useState('All Tasks');

  // Real Database Tasks
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDatePreselect, setQuickAddDatePreselect] = useState<string | undefined>(undefined);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [parsedDataForConfirm, setParsedDataForConfirm] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);

  // Check current session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({ ...data.user, preferences: data.preferences });
        if (data.databaseStatus) {
          setDatabaseStatus(data.databaseStatus);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);

    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  // Fetch real user tasks
  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingTasks(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [currentUser]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser, fetchTasks]);

  // Create Task handler
  const handleSaveTask = async (taskData: any) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create task');
    }

    fetchTasks();
  };

  // Toggle Complete handler
  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      });
      fetchTasks();
    } catch (e) {
      fetchTasks();
    }
  };

  // Delete Task handler
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      alert('Failed to delete task');
    }
  };

  // Update Task handler
  const handleUpdateTask = async (taskId: string, data: any) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update task');
    }

    fetchTasks();
  };

  // Snooze Reminder handler
  const handleSnooze = async (reminderId: string, minutes: number) => {
    try {
      const res = await fetch(`/api/reminders/${reminderId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) {
      alert('Failed to snooze reminder');
    }
  };

  // Voice parsed result handler
  const handleVoiceParsed = (result: any) => {
    setParsedDataForConfirm(result);
    setIsConfirmModalOpen(true);
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setTasks([]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '90px' }}>
      {/* Background Notification Poller & Audio Chime */}
      <NotificationManager onRefreshTasks={fetchTasks} />

      {/* Top Header Navigation */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-card)',
          position: 'sticky',
          top: 0,
          zIndex: 700,
        }}
      >
        <div
          style={{
            maxWidth: '1080px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--primary-gradient)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                boxShadow: '0 4px 14px var(--primary-glow)',
              }}
            >
              R
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                REMINDO
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.1 }}>
                Remember Less. Get More Done.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav
            style={{
              display: 'flex',
              gap: '6px',
              background: '#f8fafc',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
            }}
            className="hide-on-mobile"
          >
            {[
              { id: 'home', label: 'Dashboard', icon: <Home size={15} /> },
              { id: 'calendar', label: 'Calendar', icon: <CalendarIcon size={15} /> },
              { id: 'assistant', label: 'AI Assistant', icon: <Sparkles size={15} /> },
              { id: 'reminders', label: 'Reminders', icon: <Bell size={15} /> },
              { id: 'statistics', label: 'Statistics', icon: <BarChart3 size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  background: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* User Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
              title="Notification Settings & Test Alert"
            >
              <Bell size={17} />
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '1.5px solid rgba(139, 92, 246, 0.3)',
                  }}
                  title={currentUser.email}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                  }}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <User size={15} /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo Mode Notice Banner if using serverless fallback */}
      {databaseStatus?.isDemoMode && (
        <div
          style={{
            background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)',
            borderBottom: '1px solid #bfdbfe',
            color: '#1e40af',
            fontSize: '0.78rem',
            padding: '7px 16px',
            textAlign: 'center',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.68rem',
              letterSpacing: '0.5px',
            }}
          >
            DEMO MODE
          </span>
          <span>
            Active on temporary serverless storage. Alarms, Voice capture & AI are fully interactive. Connect TiDB Cloud MySQL for permanent multi-device sync.
          </span>
        </div>
      )}

      {/* Main Content Area */}

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 20px', width: '100%', flex: 1 }}>
        {!currentUser && !isAuthChecking ? (
          <div
            className="remindo-card"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '520px',
              margin: '40px auto',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={32} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
              Private Personal AI Reminder Assistant
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Sign in to manage your tasks, assignments, and voice reminders with real cross-platform notification synchronization.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn-primary"
              style={{ padding: '12px 28px', marginTop: '6px' }}
            >
              Sign In or Create Account
            </button>
          </div>
        ) : (
          <>
            {/* Screen 1: Home Dashboard */}
            {activeTab === 'home' && (
              <HomeDashboardView
                userName={currentUser?.name}
                tasks={tasks}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenNotifications={() => setIsNotificationsModalOpen(true)}
                onToggleComplete={handleToggleComplete}
                onEditTask={(t) => setEditingTask(t)}
                onDeleteTask={handleDeleteTask}
                onSnooze={handleSnooze}
              />
            )}

            {/* Screen 3: Calendar */}
            {activeTab === 'calendar' && (
              <CalendarView
                tasks={tasks}
                onOpenQuickAdd={(date) => {
                  setQuickAddDatePreselect(date);
                  setIsQuickAddOpen(true);
                }}
                onToggleComplete={handleToggleComplete}
              />
            )}

            {/* Screen 4: AI Assistant */}
            {activeTab === 'assistant' && (
              <AiAssistantView
                userName={currentUser?.name}
                onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                onConfirmTask={handleSaveTask}
                onEditTaskInModal={(t) => {
                  setParsedDataForConfirm(t);
                  setIsConfirmModalOpen(true);
                }}
              />
            )}

            {/* Screen 5: Live Reminders */}
            {activeTab === 'reminders' && (
              <LiveRemindersView
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}

            {/* Screen 7: Statistics */}
            {activeTab === 'statistics' && (
              <StatisticsView
                tasks={tasks}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Prominent Floating Action Button (+) */}
      <button
        onClick={() => {
          if (!currentUser) {
            setAuthModalOpen(true);
            return;
          }
          setIsQuickAddOpen(true);
        }}
        className="fab-btn"
        title="Add a Reminder"
        aria-label="Add a Reminder"
      >
        <Plus size={28} />
      </button>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Screen 2: Quick Add Task Modal */}
      <QuickAddTaskModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setQuickAddDatePreselect(undefined);
        }}
        onOpenVoiceModal={() => {
          setIsQuickAddOpen(false);
          setIsVoiceModalOpen(true);
        }}
        onSaveTask={handleSaveTask}
        userTimezone={currentUser?.timezone || 'Asia/Kolkata'}
        defaultAlertMode={currentUser?.preferences?.defaultAlertMode || 'ALARM'}
      />

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onParsedResult={handleVoiceParsed}
        userTimezone={currentUser?.timezone || 'Asia/Kolkata'}
      />

      {/* Confirmation & Clarification Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setParsedDataForConfirm(null);
        }}
        parsedData={parsedDataForConfirm}
        onConfirm={handleSaveTask}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdateTask}
      />

      {/* Screen 6: Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        userPreferences={currentUser?.preferences}
        onPreferencesUpdated={(updated: any) =>
          setCurrentUser((prev: any) => (prev ? { ...prev, preferences: updated } : null))
        }
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchTasks();
        }}
      />
    </div>
  );
}
