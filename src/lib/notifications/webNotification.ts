// Audio tone and alarm generator using Web Audio API for reliable cross-browser reminder alerts

let activeAlarmInterval: any = null;
let activeAlarmCtx: AudioContext | null = null;

/**
 * Gentle two-tone bell chime for "Notification Only" alerts
 * (D5: 587.33Hz -> A5: 880Hz)
 */
export function playReminderChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.28, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

/**
 * Plays a single burst of 4 energetic alarm pulses (digital alarm clock style)
 */
function playAlarmPulseBurst(ctx: AudioContext) {
  try {
    const now = ctx.currentTime;
    const toneFreqs = [880, 880, 1046.5, 1046.5]; // A5 -> C6
    const stepDuration = 0.12;

    toneFreqs.forEach((freq, idx) => {
      const startTime = now + idx * (stepDuration + 0.05);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and decay to avoid speaker click
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + stepDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + stepDuration);
    });
  } catch (e) {
    console.warn('Alarm burst error:', e);
  }
}

/**
 * Starts continuous alarm sound playback until stopped by user.
 */
export function startAlarmSound(): boolean {
  if (typeof window === 'undefined') return false;

  stopAlarmSound(); // Clear any existing

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;

    activeAlarmCtx = new AudioCtx();
    if (activeAlarmCtx.state === 'suspended') {
      activeAlarmCtx.resume();
    }

    // Play immediate first pulse burst
    playAlarmPulseBurst(activeAlarmCtx);

    // Loop every 1.1 seconds
    activeAlarmInterval = setInterval(() => {
      if (activeAlarmCtx && activeAlarmCtx.state !== 'closed') {
        playAlarmPulseBurst(activeAlarmCtx);
      }
    }, 1100);

    return true;
  } catch (err) {
    console.warn('Failed to start alarm sound:', err);
    return false;
  }
}

/**
 * Stops any actively sounding continuous alarm.
 */
export function stopAlarmSound() {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
  if (activeAlarmCtx) {
    try {
      activeAlarmCtx.close();
    } catch (e) {
      // Ignored
    }
    activeAlarmCtx = null;
  }
}

/**
 * Checks if the alarm is currently ringing.
 */
export function isAlarmSounding(): boolean {
  return activeAlarmInterval !== null;
}

/**
 * Plays a 3-second preview of the sound alarm (used in settings and task creation)
 */
export function previewAlarmSound(durationMs: number = 3000) {
  startAlarmSound();
  setTimeout(() => {
    stopAlarmSound();
  }, durationMs);
}

/**
 * Request notification permissions from the browser
 */
export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return Notification.requestPermission();
}

/**
 * Shows browser notification with appropriate vibration pattern and actions
 */
export function showWebNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: any;
  alertMode?: 'ALARM' | 'NOTIFICATION';
  onClick?: () => void;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const isAlarm = options.alertMode === 'ALARM';

  // Vibrate mobile device if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    if (isAlarm) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    } else {
      navigator.vibrate([200, 100, 200]);
    }
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag || 'remindo-notification',
      data: options.data,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      requireInteraction: isAlarm,
    });

    notification.onclick = () => {
      window.focus();
      if (options.onClick) options.onClick();
      notification.close();
    };

    return notification;
  }

  return null;
}
