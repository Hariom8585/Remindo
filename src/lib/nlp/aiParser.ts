import { parseTaskDeterministic, ParsedTaskResult } from './parseTaskDeterministic';

export async function parseTaskWithAI(
  input: string,
  baseDate: Date = new Date(),
  userTimezone: string = 'Asia/Kolkata'
): Promise<ParsedTaskResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini API if key is present
  if (geminiKey && geminiKey.trim().length > 5) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are Remindo's task parser. Current local date is ${baseDate.toISOString()} in timezone ${userTimezone}.
Extract the following from the user's sentence: "${input}"
Categories: "College & Education", "Family & Personal", "Payments", "Shopping", "Travel & Booking", "Work", "Other".
Priorities: "HIGH", "MEDIUM", "LOW".
IMPORTANT: If the user DID NOT specify any date or time, set dueDate: null, dueTime: null, hasDeadline: false, needsClarification: true. Do not guess or invent a fake deadline.
Respond ONLY with a valid JSON object matching this schema:
{
  "title": string,
  "dueDate": string | null (format YYYY-MM-DD or null),
  "dueTime": string | null (format HH:mm 24-hr or null),
  "category": string,
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "hasDeadline": boolean,
  "needsClarification": boolean
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          const fallback = parseTaskDeterministic(input, baseDate, userTimezone);
          return {
            title: parsed.title || fallback.title,
            originalInput: input,
            dueDate: parsed.dueDate || null,
            dueTime: parsed.dueTime || null,
            category: parsed.category || fallback.category,
            priority: (['HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority) ? parsed.priority : fallback.priority) as any,
            reminders: fallback.reminders,
            hasDeadline: Boolean(parsed.dueDate || parsed.dueTime),
            needsClarification: Boolean(parsed.needsClarification ?? (!parsed.dueDate && !parsed.dueTime)),
            clarificationPrompt: fallback.clarificationPrompt,
            suggestions: fallback.suggestions,
            confidence: {
              title: 0.98,
              date: parsed.dueDate ? 0.98 : 0,
              time: parsed.dueTime ? 0.98 : 0,
              category: 0.95,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[Remindo AI] Gemini API call failed, using deterministic parser:', err);
    }
  }

  // 2. Try OpenAI API if key is present
  if (openAiKey && openAiKey.trim().length > 5) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Remindo's task parser. Current local date is ${baseDate.toISOString()} in timezone ${userTimezone}.
Extract title, dueDate (YYYY-MM-DD), dueTime (HH:mm), category (College & Education, Family & Personal, Payments, Shopping, Travel & Booking, Work, Other), priority (HIGH, MEDIUM, LOW).
If no date/time is mentioned, set dueDate: null, dueTime: null, hasDeadline: false, needsClarification: true. Output JSON only.`,
            },
            {
              role: 'user',
              content: input,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const fallback = parseTaskDeterministic(input, baseDate, userTimezone);
          return {
            title: parsed.title || fallback.title,
            originalInput: input,
            dueDate: parsed.dueDate || null,
            dueTime: parsed.dueTime || null,
            category: parsed.category || fallback.category,
            priority: (['HIGH', 'MEDIUM', 'LOW'].includes(parsed.priority) ? parsed.priority : fallback.priority) as any,
            reminders: fallback.reminders,
            hasDeadline: Boolean(parsed.dueDate || parsed.dueTime),
            needsClarification: Boolean(parsed.needsClarification ?? (!parsed.dueDate && !parsed.dueTime)),
            clarificationPrompt: fallback.clarificationPrompt,
            suggestions: fallback.suggestions,
            confidence: {
              title: 0.98,
              date: parsed.dueDate ? 0.98 : 0,
              time: parsed.dueTime ? 0.98 : 0,
              category: 0.95,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[Remindo AI] OpenAI API call failed, using deterministic parser:', err);
    }
  }

  // 3. Deterministic Fallback Parser (Robust, offline, instant, zero latency)
  return parseTaskDeterministic(input, baseDate, userTimezone);
}
