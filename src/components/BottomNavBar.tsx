'use client';

import React from 'react';
import {
  Home,
  Calendar,
  Sparkles,
  BarChart3,
  Bell,
} from 'lucide-react';

export type AppTab = 'home' | 'calendar' | 'assistant' | 'reminders' | 'statistics';

interface BottomNavBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  const tabs: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { id: 'assistant', label: 'AI Assistant', icon: <Sparkles size={20} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
    { id: 'statistics', label: 'Statistics', icon: <BarChart3 size={20} /> },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-item ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
