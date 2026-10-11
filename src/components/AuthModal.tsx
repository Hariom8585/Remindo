'use client';

import React, { useState } from 'react';
import { User, Lock, Mail, Globe, ArrowRight, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        mode === 'register'
          ? { name: name.trim(), email: email.trim(), password, timezone }
          : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ padding: '28px', maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {mode === 'login' ? 'Sign in to access your reminders' : 'Get started with Remindo'}
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
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#fda4af',
              fontSize: '0.85rem',
              marginBottom: '16px',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <User size={14} /> Full Name:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Omkar"
                required
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Mail size={14} /> Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="omkar@example.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Lock size={14} /> Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              style={{ width: '100%' }}
            />
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Globe size={14} /> Timezone:
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                <option value="UTC">UTC (Universal Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Free Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'underline' }}
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'underline' }}
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
