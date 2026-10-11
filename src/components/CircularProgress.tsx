'use client';

import React from 'react';

interface CircularProgressProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({
  completed,
  total,
  size = 72,
  strokeWidth = 6,
}: CircularProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ede9fe"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      {/* Central percentage */}
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', lineHeight: 1 }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
