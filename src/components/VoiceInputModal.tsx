'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Sparkles, Check, X, RefreshCw } from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedResult: (parsed: any) => void;
  userTimezone?: string;
}

export default function VoiceInputModal({
  isOpen,
  onClose,
  onParsedResult,
  userTimezone = 'Asia/Kolkata',
}: VoiceInputModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage(
        'Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or an Android WebView browser.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English default, works great with bilingual phrases & accents

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('[Speech Recognition Error]', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permissions in your browser address bar and try again.'
          );
        } else if (event.error === 'no-speech') {
          // No speech detected, keep listening or prompt
        } else if (event.error === 'network') {
          setErrorMessage('Speech recognition network error. Please check your internet connection.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      setIsSupported(false);
      setErrorMessage('Could not initialize speech recognition: ' + e.message);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Auto-start listening when modal opens if supported
  useEffect(() => {
    if (isOpen && isSupported && recognitionRef.current) {
      setTranscript('');
      setErrorMessage(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    } else if (!isOpen && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [isOpen, isSupported]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      setErrorMessage(null);
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const res = await fetch('/api/ai/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: transcript.trim(),
          timezone: userTimezone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        onParsedResult(data.result);
        onClose();
      } else {
        setErrorMessage(data.error || 'Failed to interpret voice input');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing speech input');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ padding: '28px', maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <Mic size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Voice Task Capture</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Speak naturally with task and deadline details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Visualizer / Microphone Centerpiece */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fbf9ff 50%, #f3ebff 100%)',
            borderRadius: '20px',
            marginBottom: '20px',
            border: '1.5px solid rgba(196, 181, 253, 0.45)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <button
            onClick={toggleListening}
            disabled={!isSupported}
            className={isListening ? 'mic-recording' : ''}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isListening
                ? 'var(--primary-gradient)'
                : '#ffffff',
              border: `2px solid ${isListening ? 'transparent' : 'var(--primary)'}`,
              color: isListening ? '#ffffff' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 8px 24px var(--primary-glow)' : 'var(--shadow-sm)',
              transition: 'all 0.3s ease',
            }}
            title={isListening ? 'Tap to pause' : 'Tap to start recording'}
          >
            {isListening ? <Mic size={36} /> : <MicOff size={32} />}
          </button>

          {isListening && (
            <div className="waveform-container">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          )}

          <p
            style={{
              marginTop: '14px',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: isListening ? 'var(--primary)' : 'var(--text-primary)',
            }}
          >
            {isListening
              ? 'Listening... Speak your reminder now'
              : transcript
              ? 'Recording paused. Review transcript below'
              : 'Tap microphone to begin speaking'}
          </p>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
            Try: &ldquo;Remind me on 23 October to submit my assignment&rdquo; or &ldquo;Call Dad tomorrow at 6 PM&rdquo;
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fecdd3',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#f43f5e' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Editable Transcript Area */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            Editable Speech Transcript:
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken words will appear here in real-time. You can edit them manually before confirming."
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              fontSize: '0.95rem',
              lineHeight: 1.4,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setTranscript('')}
            className="btn-secondary"
            disabled={!transcript || isProcessing}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} /> Clear
          </button>
          <button
            onClick={handleProcessTranscript}
            disabled={!transcript.trim() || isProcessing}
            className="btn-primary"
            style={{
              padding: '10px 22px',
              opacity: !transcript.trim() || isProcessing ? 0.6 : 1,
            }}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Sparkles size={16} /> Interpret & Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
