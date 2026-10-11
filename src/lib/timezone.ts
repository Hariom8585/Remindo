export function getTimezoneOffsetMs(timeZone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    if (offsetPart && offsetPart.value) {
      // Formats: "GMT+05:30", "GMT-08:00", "GMT"
      const match = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const mins = match[3] ? parseInt(match[3], 10) : 0;
        return sign * (hours * 60 + mins) * 60 * 1000;
      }
    }
  } catch (e) {
    // fallback
  }
  return 5.5 * 60 * 60 * 1000; // default Asia/Kolkata (+05:30)
}

/**
 * Parses user input date string (YYYY-MM-DD) and time string (HH:mm)
 * according to the user's specific IANA timezone (e.g. Asia/Kolkata),
 * returning an exact UTC Date object ready for database storage and cron queries.
 */
export function parseDateTimeInTimezone(
  dateStr: string,
  timeStr?: string | null,
  timezone: string = 'Asia/Kolkata'
): Date {
  // If dateStr is already an ISO string with offset
  if (
    dateStr.includes('T') &&
    (dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.length > 19))
  ) {
    return new Date(dateStr);
  }

  const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const normalizedTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : '09:00:00';
  const isoUtcLike = `${normalizedDate}T${normalizedTime}.000Z`;
  const utcTargetTime = new Date(isoUtcLike).getTime();

  const offsetMs = getTimezoneOffsetMs(timezone, new Date(isoUtcLike));
  return new Date(utcTargetTime - offsetMs);
}
