export interface ParsedTaskResult {
  title: string;
  originalInput: string;
  dueDate: string | null; // ISO YYYY-MM-DD
  dueTime: string | null; // HH:mm (24h)
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reminders: Array<{ advanceMinutes: number; label: string }>;
  hasDeadline: boolean;
  needsClarification: boolean;
  clarificationPrompt?: string;
  suggestions?: Array<{ label: string; date: string; time: string }>;
  confidence: {
    title: number;
    date: number;
    time: number;
    category: number;
  };
}

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const DAYS_OF_WEEK: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

export function parseTaskDeterministic(
  input: string,
  baseDate: Date = new Date(),
  userTimezone: string = 'Asia/Kolkata'
): ParsedTaskResult {
  const original = input.trim();
  let text = original;

  let detectedDate: Date | null = null;
  let detectedTime: string | null = null;
  let hasExplicitDate = false;
  let hasExplicitTime = false;

  // 1. Detect Category
  let category = 'Other';
  const lower = text.toLowerCase();

  if (/\b(assignment|nptel|homework|exam|quiz|test|study|class|lecture|syllabus|college|university|submission|course)\b/i.test(lower)) {
    category = 'College & Education';
  } else if (/\b(dad|mom|brother|sister|family|friend|doctor|medicine|pill|appointment|birthday|anniversary|home|call\s+(dad|mom|mum|papa|maa))\b/i.test(lower)) {
    category = 'Family & Personal';
  } else if (/\b(₹|rs\.?|inr|send|pay|payment|transfer|rent|bill|recharge|fee|electricity|emi|bank|money|rupees)\b/i.test(lower)) {
    category = 'Payments';
  } else if (/\b(buy|purchase|shop|order|charger|milk|grocery|groceries|vegetable|vegetables|clothes|store|market|amazon|flipkart)\b/i.test(lower)) {
    category = 'Shopping';
  } else if (/\b(ticket|train|flight|bus|irctc|cab|uber|ola|hotel|trip|travel|book|booking|reservation)\b/i.test(lower)) {
    category = 'Travel & Booking';
  } else if (/\b(meeting|report|presentation|client|sprint|office|work|email|slack|standup|project|deliverable|boss)\b/i.test(lower)) {
    category = 'Work';
  }

  // 2. Detect Priority
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (/\b(urgent|asap|emergency|critical|immediately|high\s+priority|deadline|important)\b/i.test(lower)) {
    priority = 'HIGH';
  } else if (/\b(low\s+priority|whenever|no\s+rush|sometime|chill)\b/i.test(lower)) {
    priority = 'LOW';
  }

  // 3. Extract Time
  // Match patterns like "at 6 PM", "6:30 pm", "18:00", "at 9 am", "6pm"
  const timeRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;
  const timeMatch = text.match(timeRegex);

  if (timeMatch) {
    hasExplicitTime = true;
    if (timeMatch[3]) {
      // 12-hour AM/PM format
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3].toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      detectedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } else if (timeMatch[4]) {
      // 24-hour format
      const hours = parseInt(timeMatch[4], 10);
      const mins = parseInt(timeMatch[5], 10);
      detectedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    // Remove time from text
    text = text.replace(timeMatch[0], ' ');
  } else {
    // Relative times: "this evening", "tonight", "this morning", "this afternoon", "noon", "midnight"
    if (/\bthis evening\b/i.test(text)) {
      detectedTime = '18:00';
      hasExplicitTime = true;
      text = text.replace(/\bthis evening\b/i, ' ');
      if (!detectedDate) detectedDate = new Date(baseDate);
    } else if (/\btonight\b/i.test(text)) {
      detectedTime = '20:00';
      hasExplicitTime = true;
      text = text.replace(/\btonight\b/i, ' ');
      if (!detectedDate) detectedDate = new Date(baseDate);
    } else if (/\bthis afternoon\b/i.test(text)) {
      detectedTime = '14:00';
      hasExplicitTime = true;
      text = text.replace(/\bthis afternoon\b/i, ' ');
      if (!detectedDate) detectedDate = new Date(baseDate);
    } else if (/\bthis morning\b/i.test(text)) {
      detectedTime = '09:00';
      hasExplicitTime = true;
      text = text.replace(/\bthis morning\b/i, ' ');
      if (!detectedDate) detectedDate = new Date(baseDate);
    } else if (/\bnoon\b/i.test(text)) {
      detectedTime = '12:00';
      hasExplicitTime = true;
      text = text.replace(/\bnoon\b/i, ' ');
    } else if (/\bmidnight\b/i.test(text)) {
      detectedTime = '00:00';
      hasExplicitTime = true;
      text = text.replace(/\bmidnight\b/i, ' ');
    }
  }

  // 4. Extract Explicit Dates (e.g., "23 October 2026", "23 Oct", "23/10/2026", "2026-10-23")
  // Format: DD Month YYYY or DD Month
  const explicitDayMonthYear = /\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)(?:\s+(\d{4}))?\b/i;
  const monthDayYear = /\b(?:on\s+)?([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;
  const isoDateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const slashDateRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;

  const dmyMatch = text.match(explicitDayMonthYear);
  const mdyMatch = text.match(monthDayYear);
  const isoMatch = text.match(isoDateRegex);
  const slashMatch = text.match(slashDateRegex);

  if (dmyMatch && MONTHS[dmyMatch[2].toLowerCase()] !== undefined) {
    const day = parseInt(dmyMatch[1], 10);
    const month = MONTHS[dmyMatch[2].toLowerCase()];
    const year = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : baseDate.getFullYear();
    detectedDate = new Date(year, month, day);
    hasExplicitDate = true;
    text = text.replace(dmyMatch[0], ' ');
  } else if (mdyMatch && MONTHS[mdyMatch[1].toLowerCase()] !== undefined) {
    const month = MONTHS[mdyMatch[1].toLowerCase()];
    const day = parseInt(mdyMatch[2], 10);
    const year = mdyMatch[3] ? parseInt(mdyMatch[3], 10) : baseDate.getFullYear();
    detectedDate = new Date(year, month, day);
    hasExplicitDate = true;
    text = text.replace(mdyMatch[0], ' ');
  } else if (isoMatch) {
    detectedDate = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    hasExplicitDate = true;
    text = text.replace(isoMatch[0], ' ');
  } else if (slashMatch) {
    // Assuming DD/MM/YYYY for Indian/UK standard
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    detectedDate = new Date(year, month, day);
    hasExplicitDate = true;
    text = text.replace(slashMatch[0], ' ');
  }

  // 5. Extract Relative Dates (e.g. "today", "tomorrow", "day after tomorrow", "in 2 days", "next Monday")
  if (!detectedDate) {
    if (/\b(?:the\s+)?day after tomorrow\b/i.test(text)) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 2);
      detectedDate = d;
      hasExplicitDate = true;
      text = text.replace(/\b(?:the\s+)?day after tomorrow\b/i, ' ');
    } else if (/\btomorrow\b|\btmrw\b/i.test(text)) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      detectedDate = d;
      hasExplicitDate = true;
      text = text.replace(/\btomorrow\b|\btmrw\b/i, ' ');
    } else if (/\btoday\b/i.test(text)) {
      detectedDate = new Date(baseDate);
      hasExplicitDate = true;
      text = text.replace(/\btoday\b/i, ' ');
    } else {
      // "in X days" or "in X hours"
      const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);
      const inHoursMatch = text.match(/\bin\s+(\d+)\s+hours?\b/i);
      const inMinsMatch = text.match(/\bin\s+(\d+)\s+mins?\b|\bin\s+(\d+)\s+minutes?\b/i);

      if (inDaysMatch) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + parseInt(inDaysMatch[1], 10));
        detectedDate = d;
        hasExplicitDate = true;
        text = text.replace(inDaysMatch[0], ' ');
      } else if (inHoursMatch) {
        const d = new Date(baseDate);
        d.setHours(d.getHours() + parseInt(inHoursMatch[1], 10));
        detectedDate = d;
        detectedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        hasExplicitDate = true;
        hasExplicitTime = true;
        text = text.replace(inHoursMatch[0], ' ');
      } else if (inMinsMatch) {
        const mins = inMinsMatch[1] ? parseInt(inMinsMatch[1], 10) : parseInt(inMinsMatch[2], 10);
        const d = new Date(baseDate);
        d.setMinutes(d.getMinutes() + mins);
        detectedDate = d;
        detectedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        hasExplicitDate = true;
        hasExplicitTime = true;
        text = text.replace(inMinsMatch[0], ' ');
      } else {
        // "next monday" or "this friday"
        const weekdayMatch = text.match(/\b(next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i);
        if (weekdayMatch) {
          const targetDay = DAYS_OF_WEEK[weekdayMatch[2].toLowerCase()];
          const currentDay = baseDate.getDay();
          let diff = targetDay - currentDay;
          if (diff <= 0) diff += 7;
          if (weekdayMatch[1].toLowerCase() === 'next' && diff < 7) {
            diff += 7;
          }
          const d = new Date(baseDate);
          d.setDate(d.getDate() + diff);
          detectedDate = d;
          hasExplicitDate = true;
          text = text.replace(weekdayMatch[0], ' ');
        }
      }
    }
  }

  // 6. Clean and Refine Title
  // Strip common prompt prefixes: "remind me to", "remind me", "please remind me to", "set a reminder to", "i have to"
  let cleanTitle = text
    .replace(/^remind\s+me\s+to\s+/i, '')
    .replace(/^remind\s+me\s+/i, '')
    .replace(/^please\s+remind\s+me\s+(?:to\s+)?/i, '')
    .replace(/^set\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+)?/i, '')
    .replace(/^i\s+(?:have|need)\s+to\s+/i, '')
    .replace(/^don't\s+forget\s+to\s+/i, '')
    .replace(/^dont\s+forget\s+to\s+/i, '')
    .replace(/\s+to\s+call\s+/i, ' Call ')
    .replace(/\s+/g, ' ')
    .trim();

  // If text starts with lowercase word, capitalize first character
  if (cleanTitle.length > 0) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else {
    cleanTitle = original;
  }

  // Format YYYY-MM-DD
  let formattedDate: string | null = null;
  if (detectedDate) {
    const y = detectedDate.getFullYear();
    const m = String(detectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(detectedDate.getDate()).padStart(2, '0');
    formattedDate = `${y}-${m}-${d}`;
  }

  // 7. Check Clarification requirement (Requirement 4 & 10)
  // "Never silently invent an exact time or deadline if the user has not provided one. Ask a clarification when necessary."
  // "If the user only says 'remind me to buy milk' without a date or time, ask when to remind them rather than inventing an exact deadline."
  const hasDeadline = Boolean(formattedDate || detectedTime);
  const needsClarification = !hasDeadline;

  // Build sensible suggested options
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const todayStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;

  const suggestions = needsClarification
    ? [
        { label: 'Today at 6:00 PM', date: todayStr, time: '18:00' },
        { label: 'Tomorrow at 9:00 AM', date: tomorrowStr, time: '09:00' },
        { label: 'Tomorrow at 6:00 PM', date: tomorrowStr, time: '18:00' },
      ]
    : undefined;

  // Default reminder schedule: 15 minutes before
  const defaultReminders = [
    { advanceMinutes: 0, label: 'At time of event' },
    { advanceMinutes: 15, label: '15 minutes before' },
  ];

  return {
    title: cleanTitle,
    originalInput: original,
    dueDate: formattedDate,
    dueTime: detectedTime,
    category,
    priority,
    reminders: defaultReminders,
    hasDeadline,
    needsClarification,
    clarificationPrompt: needsClarification
      ? `When would you like Remindo to alert you for "${cleanTitle}"?`
      : undefined,
    suggestions,
    confidence: {
      title: cleanTitle ? 0.95 : 0.4,
      date: hasExplicitDate ? 0.95 : 0.0,
      time: hasExplicitTime ? 0.95 : 0.0,
      category: category !== 'Other' ? 0.9 : 0.5,
    },
  };
}
