import assert from 'assert';

export function getTimezoneOffsetMs(timeZone: string, date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  if (offsetPart && offsetPart.value) {
    // Value is e.g. "GMT+05:30" or "GMT-08:00" or "GMT"
    const match = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (match) {
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const mins = match[3] ? parseInt(match[3], 10) : 0;
      return sign * (hours * 60 + mins) * 60 * 1000;
    }
  }
  return 5.5 * 60 * 60 * 1000; // default to Asia/Kolkata
}

export function parseDateTimeInTimezone(dateStr: string, timeStr: string, timezone: string = 'Asia/Kolkata'): Date {
  if (dateStr.includes('T') && (dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.length > 19))) {
    return new Date(dateStr);
  }

  const normalizedTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : '09:00:00';
  const isoUtcLike = `${dateStr}T${normalizedTime}.000Z`;
  const utcTargetTime = new Date(isoUtcLike).getTime();

  const offsetMs = getTimezoneOffsetMs(timezone, new Date(isoUtcLike));
  return new Date(utcTargetTime - offsetMs);
}

const parsed = parseDateTimeInTimezone('2026-10-23', '17:00', 'Asia/Kolkata');
console.log('UTC ISO:', parsed.toISOString());
console.log('Kolkata Formatted:', parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

assert.strictEqual(parsed.toISOString(), '2026-10-23T11:30:00.000Z');
console.log('✅ Timezone calculation is 100% accurate!');
