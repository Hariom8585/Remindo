import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseTaskDeterministic } from '@/lib/nlp/parseTaskDeterministic';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionUser(request);
    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const hasAiConfigured = Boolean((geminiKey && geminiKey.trim().length > 5) || (openAiKey && openAiKey.trim().length > 5));

    const userTimezone = session?.timezone || 'Asia/Kolkata';
    const now = new Date();

    // 1. If Gemini is configured, use real Gemini Flash
    if (geminiKey && geminiKey.trim().length > 5) {
      try {
        const prompt = `You are REMINDO Assistant, a calm, friendly, and ultra-productive AI reminder companion.
User: ${session?.name || 'User'}. Timezone: ${userTimezone}. Current Date/Time: ${now.toISOString()}.

If the user mentions any task, reminder, deadline, assignment, payment, meeting, or event, formulate an explicit task proposal.
Format your output as a JSON object with:
{
  "reply": "friendly natural language message to the user",
  "proposedTask": {
    "title": "Clean task title",
    "dueDate": "YYYY-MM-DD or null",
    "dueTime": "HH:mm or null",
    "category": "College & Education | Family & Personal | Payments | Shopping | Travel & Booking | Work | Other",
    "priority": "HIGH | MEDIUM | LOW",
    "reminders": [0, 15]
  } | null
}
If no specific task is mentioned (e.g. user asked for tips or general chat), set proposedTask to null.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: `${prompt}\n\nUser message: "${message}"` }],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            return NextResponse.json({
              reply: parsed.reply,
              proposedTask: parsed.proposedTask,
              aiSource: 'Google Gemini AI',
              isConfigured: true,
            });
          }
        }
      } catch (e) {
        console.warn('Gemini chat call error, using deterministic assistant:', e);
      }
    }

    // 2. Deterministic smart assistant mode when AI key is not yet set
    // Checks if the user is asking to create a task or plan something
    const lower = message.toLowerCase();
    const parsedTask = parseTaskDeterministic(message, now, userTimezone);

    let reply = '';
    let proposedTask: any = null;

    if (lower.includes('plan my day') || lower.includes('plan today')) {
      reply = `Good day! To help you plan effectively, focus on your top 3 priority tasks first. You can tap the proposal below or type specific deadlines like "Team meeting at 2 PM" or "Submit lab report by 5 PM" and I will schedule them for you!`;
      proposedTask = {
        title: 'Review today’s key priorities & goals',
        dueDate: now.toISOString().split('T')[0],
        dueTime: '09:30',
        category: 'Work',
        priority: 'HIGH',
        reminders: [0, 15],
      };
    } else if (lower.includes('assignment') || lower.includes('exam') || lower.includes('study')) {
      reply = `I have structured this college task for you with advance alerts so you stay ahead of your deadline!`;
      proposedTask = {
        title: parsedTask.title || 'Submit College Assignment',
        dueDate: parsedTask.dueDate || now.toISOString().split('T')[0],
        dueTime: parsedTask.dueTime || '17:00',
        category: 'College & Education',
        priority: 'HIGH',
        reminders: [0, 60, 1440],
      };
    } else if (parsedTask.title && (parsedTask.dueDate || parsedTask.dueTime || !parsedTask.needsClarification)) {
      reply = `I understood your reminder for "${parsedTask.title}". Here is the structured proposal for your review:`;
      proposedTask = {
        title: parsedTask.title,
        dueDate: parsedTask.dueDate,
        dueTime: parsedTask.dueTime,
        category: parsedTask.category,
        priority: parsedTask.priority,
        reminders: [0, 15],
      };
    } else {
      reply = `I am here to help you remember less and get more done! You can tell me anything like "Remind me tomorrow at 6 PM to call Dad" or "Submit assignment on 23 October", or tap one of the suggested prompts below.`;
    }

    return NextResponse.json({
      reply,
      proposedTask,
      aiSource: hasAiConfigured ? 'AI Service' : 'Built-in Intelligent Engine',
      isConfigured: hasAiConfigured,
      note: hasAiConfigured ? undefined : 'To connect custom cloud AI, add GEMINI_API_KEY in your .env file.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Chat error' }, { status: 500 });
  }
}
