'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  Calendar,
  Clock,
  CheckCircle,
  Edit2,
  Info,
  Plus,
  Bot,
} from 'lucide-react';

interface AiAssistantViewProps {
  userName?: string;
  onOpenVoiceModal: () => void;
  onConfirmTask: (task: any) => Promise<void>;
  onEditTaskInModal: (task: any) => void;
}

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  proposedTask?: {
    title: string;
    dueDate: string | null;
    dueTime: string | null;
    category: string;
    priority: string;
    reminders?: number[];
  } | null;
}

export default function AiAssistantView({
  userName = 'Omkar',
  onOpenVoiceModal,
  onConfirmTask,
  onEditTaskInModal,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${userName}! I am your REMINDO productivity assistant. Tell me what is on your mind, or tap one of the suggested actions below to get started.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState<string>('Built-in Engine');
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.aiSource) setAiEngineStatus(data.aiSource);
        if (data.note) setStatusNote(data.note);

        const botMsg: Message = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: data.reply || 'Task processed successfully.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposedTask: data.proposedTask,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: 'assistant',
            text: 'I could not process this request right now. Please try again.',
            timestamp: 'Just now',
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: 'Network error communicating with Remindo assistant: ' + err.message,
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmProposed = async (proposed: any) => {
    try {
      await onConfirmTask({
        title: proposed.title,
        category: proposed.category || 'Other',
        priority: proposed.priority || 'MEDIUM',
        dueDate: proposed.dueDate || null,
        dueTime: proposed.dueTime || null,
        alertMode: proposed.alertMode || 'ALARM',
        reminders: (proposed.reminders || [0, 15]).map((m: number) => ({ advanceMinutes: m })),
      });
      alert(`Reminder "${proposed.title}" successfully added!`);
    } catch (e: any) {
      alert('Failed to save reminder: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '520px', gap: '14px' }}>
      {/* Header with Engine Badge */}
      <div
        className="remindo-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>REMINDO AI Companion</h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
              Natural language planner & reminder assistant
            </p>
          </div>
        </div>

        {/* Source Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              border: '1px solid var(--border-card)',
            }}
          >
            ✨ {aiEngineStatus}
          </span>
        </div>
      </div>

      {statusNote && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: '12px',
            background: 'var(--sky-light)',
            border: '1px solid #bae6fd',
            fontSize: '0.78rem',
            color: 'var(--sky)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Info size={14} />
          <span>{statusNote}</span>
        </div>
      )}

      {/* Messages Stream Container */}
      <div
        className="remindo-card"
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'linear-gradient(180deg, #ffffff 0%, #faf8ff 100%)',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isUser ? 'var(--primary-gradient)' : '#ffffff',
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  boxShadow: isUser ? '0 4px 14px var(--primary-glow)' : 'var(--shadow-card)',
                  border: isUser ? 'none' : '1px solid var(--border-card)',
                  fontSize: '0.9rem',
                  lineHeight: 1.45,
                }}
              >
                {msg.text}

                {/* Embedded Task Proposal Card */}
                {msg.proposedTask && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1.5px solid var(--border-card)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span className="badge badge-category">{msg.proposedTask.category}</span>
                      <span className={`badge badge-${msg.proposedTask.priority.toLowerCase()}`}>
                        {msg.proposedTask.priority}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '4px 0' }}>
                      {msg.proposedTask.title}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {msg.proposedTask.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--primary)" /> {msg.proposedTask.dueDate}
                        </span>
                      )}
                      {msg.proposedTask.dueTime && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="var(--primary)" /> {msg.proposedTask.dueTime}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleConfirmProposed(msg.proposedTask)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', flex: 1 }}
                      >
                        <CheckCircle size={13} /> Add to Reminders
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTaskInModal(msg.proposedTask)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                {msg.timestamp}
              </span>
            </div>
          );
        })}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-card)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Thinking & formulating tasks...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          'Plan my day',
          'Add an assignment deadline',
          'Remind me tomorrow at 6 PM to call Dad',
          'Send Rahul ₹500 tomorrow',
        ].map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => handleSendMessage(sug)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1px solid var(--border-card)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div
        className="remindo-card"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={onOpenVoiceModal}
          style={{
            padding: '8px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Voice input"
        >
          <Mic size={18} />
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Ask anything or describe a reminder..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: '10px',
            fontSize: '0.92rem',
          }}
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="btn-primary"
          style={{
            width: '40px',
            height: '40px',
            padding: 0,
            borderRadius: '50%',
            opacity: !inputMessage.trim() || isLoading ? 0.6 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
