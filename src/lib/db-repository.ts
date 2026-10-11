import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

// Fallback JSON-persisted storage file (used seamlessly if MySQL credentials are not yet configured)
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', '.remindo_data')
  : path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'remindo_store.json');


interface FallbackStore {
  users: Array<{
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
  }>;
  tasks: Array<{
    id: string;
    userId: string;
    title: string;
    description: string | null;
    category: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
    alertMode?: string;
    isCompleted: boolean;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  reminders: Array<{
    id: string;
    taskId: string;
    userId: string;
    remindAt: string;
    channel: string;
    alertMode?: string;
    status: string;
    advanceMinutes: number;
    sentAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  notificationLogs: Array<{
    id: string;
    reminderId: string | null;
    userId: string;
    channel: string;
    status: string;
    errorMessage: string | null;
    deliveredAt: string;
  }>;
  preferences: Array<{
    id: string;
    userId: string;
    defaultAdvanceMinutes: number;
    defaultAlertMode?: string;
    defaultSnoozeMinutes?: number;
    timezone: string;
    soundEnabled: boolean;
    theme: string;
  }>;
}

function getFallbackStore(): FallbackStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial: FallbackStore = {
      users: [],
      tasks: [],
      reminders: [],
      notificationLogs: [],
      preferences: [],
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      users: [],
      tasks: [],
      reminders: [],
      notificationLogs: [],
      preferences: [],
    };
  }
}

function saveFallbackStore(store: FallbackStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

let isUsingFallback = false;
let fallbackLogged = false;

async function executeWithFallback<T>(
  prismaFn: () => Promise<T>,
  fallbackFn: () => any
): Promise<T> {
  if (isUsingFallback) {
    return fallbackFn();
  }
  try {
    return await prismaFn();
  } catch (err: any) {
    // Check if it's a connection or authentication error to MySQL
    const isConnError =
      err?.code === 'P1001' || // Can't reach database server
      err?.code === 'P1000' || // Authentication failed
      err?.errorCode === 'P1000' ||
      err?.errorCode === 'P1001' ||
      err?.code === 'P1003' || // Database does not exist
      err?.name === 'PrismaClientInitializationError' ||
      err?.message?.includes('connect') ||
      err?.message?.includes('denied') ||
      err?.message?.includes('Authentication failed') ||
      err?.message?.includes('credentials') ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.message?.includes('ECONNREFUSED');

    if (isConnError) {
      if (!fallbackLogged) {
        console.warn(
          '[Remindo DB] MySQL not reachable with current DATABASE_URL. Seamlessly falling back to local persistent file store until MySQL credentials are configured.',
          err.message
        );
        fallbackLogged = true;
      }
      isUsingFallback = true;
      return fallbackFn();
    }
    throw err;
  }
}

// -------------------------------------------------------------
// USER REPOSITORY
// -------------------------------------------------------------
export async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  return executeWithFallback(
    () => prisma.user.findUnique({ where: { email: normalized } }),
    () => {
      const store = getFallbackStore();
      const user = store.users.find((u) => u.email === normalized);
      if (!user) return null;
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
    }
  );
}

export async function findUserById(id: string) {
  return executeWithFallback(
    () => prisma.user.findUnique({ where: { id } }),
    () => {
      const store = getFallbackStore();
      const user = store.users.find((u) => u.id === id);
      if (!user) return null;
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
    }
  );
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  timezone?: string;
}) {
  const normalized = data.email.toLowerCase().trim();
  const id = crypto.randomUUID();
  const timezone = data.timezone || 'Asia/Kolkata';

  return executeWithFallback(
    async () => {
      const created = await prisma.user.create({
        data: {
          id,
          name: data.name,
          email: normalized,
          passwordHash: data.passwordHash,
          timezone,
          preferences: {
            create: {
              timezone,
              defaultAdvanceMinutes: 15,
              defaultAlertMode: 'ALARM',
              defaultSnoozeMinutes: 15,
            },
          },
        },
      });
      return created;
    },
    () => {
      const store = getFallbackStore();
      const now = new Date().toISOString();
      const newUser = {
        id,
        name: data.name,
        email: normalized,
        passwordHash: data.passwordHash,
        timezone,
        createdAt: now,
        updatedAt: now,
      };
      store.users.push(newUser);
      store.preferences.push({
        id: crypto.randomUUID(),
        userId: id,
        defaultAdvanceMinutes: 15,
        defaultAlertMode: 'ALARM',
        defaultSnoozeMinutes: 15,
        timezone,
        soundEnabled: true,
        theme: 'dark',
      });
      saveFallbackStore(store);
      return {
        ...newUser,
        createdAt: new Date(newUser.createdAt),
        updatedAt: new Date(newUser.updatedAt),
      };
    }
  );
}

// -------------------------------------------------------------
// TASK REPOSITORY (User Isolated)
// -------------------------------------------------------------
export interface TaskFilterOptions {
  category?: string;
  priority?: string;
  status?: 'all' | 'upcoming' | 'due_today' | 'overdue' | 'completed';
  search?: string;
}

export async function getUserTasks(userId: string, filters?: TaskFilterOptions) {
  return executeWithFallback(
    async () => {
      const where: any = { userId };
      if (filters?.category && filters.category !== 'all') {
        where.category = filters.category;
      }
      if (filters?.priority && filters.priority !== 'all') {
        where.priority = filters.priority;
      }
      if (filters?.search) {
        where.title = { contains: filters.search };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          reminders: {
            orderBy: { remindAt: 'asc' },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      });
      return tasks;
    },
    () => {
      const store = getFallbackStore();
      let userTasks = store.tasks.filter((t) => t.userId === userId);

      if (filters?.category && filters.category !== 'all') {
        userTasks = userTasks.filter((t) => t.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters?.priority && filters.priority !== 'all') {
        userTasks = userTasks.filter((t) => t.priority.toLowerCase() === filters.priority!.toLowerCase());
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        userTasks = userTasks.filter((t) => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
      }

      // Join reminders
      return userTasks.map((t) => {
        const taskReminders = store.reminders.filter((r) => r.taskId === t.id);
        taskReminders.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
        const taskAlertMode = t.alertMode || 'ALARM';
        return {
          ...t,
          alertMode: taskAlertMode,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          reminders: taskReminders.map((r) => ({
            ...r,
            alertMode: r.alertMode || taskAlertMode,
            remindAt: new Date(r.remindAt),
            sentAt: r.sentAt ? new Date(r.sentAt) : null,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
        };
      });
    }
  );
}

export async function getTaskById(taskId: string, userId: string) {
  return executeWithFallback(
    () =>
      prisma.task.findFirst({
        where: { id: taskId, userId },
        include: { reminders: true },
      }),
    () => {
      const store = getFallbackStore();
      const task = store.tasks.find((t) => t.id === taskId && t.userId === userId);
      if (!task) return null;
      const reminders = store.reminders.filter((r) => r.taskId === task.id);
      const taskAlertMode = task.alertMode || 'ALARM';
      return {
        ...task,
        alertMode: taskAlertMode,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        reminders: reminders.map((r) => ({
          ...r,
          alertMode: r.alertMode || taskAlertMode,
          remindAt: new Date(r.remindAt),
          sentAt: r.sentAt ? new Date(r.sentAt) : null,
        })),
      };
    }
  );
}

export async function createTask(data: {
  userId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  dueDate?: Date | null;
  dueTime?: string | null;
  alertMode?: string;
  reminders?: Array<{ remindAt: Date; advanceMinutes?: number; channel?: string; alertMode?: string }>;
}) {
  const taskId = crypto.randomUUID();
  const alertMode = data.alertMode || 'ALARM';

  return executeWithFallback(
    async () => {
      const reminderCreates =
        data.reminders?.map((r) => ({
          id: crypto.randomUUID(),
          userId: data.userId,
          remindAt: r.remindAt,
          advanceMinutes: r.advanceMinutes ?? 0,
          channel: r.channel || 'BROWSER',
          alertMode: r.alertMode || alertMode,
          status: 'PENDING',
        })) || [];

      return prisma.task.create({
        data: {
          id: taskId,
          userId: data.userId,
          title: data.title,
          description: data.description || null,
          category: data.category || 'Other',
          priority: data.priority || 'MEDIUM',
          dueDate: data.dueDate || null,
          dueTime: data.dueTime || null,
          alertMode,
          reminders: {
            create: reminderCreates,
          },
        },
        include: { reminders: true },
      });
    },
    () => {
      const store = getFallbackStore();
      const now = new Date().toISOString();
      const newTask = {
        id: taskId,
        userId: data.userId,
        title: data.title,
        description: data.description || null,
        category: data.category || 'Other',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        dueTime: data.dueTime || null,
        alertMode,
        isCompleted: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      store.tasks.push(newTask);

      const createdReminders: any[] = [];
      if (data.reminders && data.reminders.length > 0) {
        for (const r of data.reminders) {
          const rem = {
            id: crypto.randomUUID(),
            taskId,
            userId: data.userId,
            remindAt: r.remindAt.toISOString(),
            channel: r.channel || 'BROWSER',
            alertMode: r.alertMode || alertMode,
            status: 'PENDING',
            advanceMinutes: r.advanceMinutes ?? 0,
            sentAt: null,
            createdAt: now,
            updatedAt: now,
          };
          store.reminders.push(rem);
          createdReminders.push({ ...rem, remindAt: r.remindAt });
        }
      }
      saveFallbackStore(store);
      return {
        ...newTask,
        dueDate: data.dueDate || null,
        reminders: createdReminders,
      };
    }
  );
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    dueDate?: Date | null;
    dueTime?: string | null;
    alertMode?: string;
    reminders?: Array<{ remindAt: Date; advanceMinutes?: number; channel?: string; alertMode?: string }>;
  }
) {
  return executeWithFallback(
    async () => {
      // If reminders provided, delete existing and re-create
      if (data.reminders) {
        await prisma.reminder.deleteMany({
          where: { taskId, userId },
        });
      }

      return prisma.task.update({
        where: { id: taskId },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          dueDate: data.dueDate,
          dueTime: data.dueTime,
          ...(data.alertMode && { alertMode: data.alertMode }),
          ...(data.reminders && {
            reminders: {
              create: data.reminders.map((r) => ({
                id: crypto.randomUUID(),
                userId,
                remindAt: r.remindAt,
                advanceMinutes: r.advanceMinutes ?? 0,
                channel: r.channel || 'BROWSER',
                alertMode: r.alertMode || data.alertMode || 'ALARM',
                status: 'PENDING',
              })),
            },
          }),
        },
        include: { reminders: true },
      });
    },
    () => {
      const store = getFallbackStore();
      const index = store.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
      if (index === -1) throw new Error('Task not found');

      const now = new Date().toISOString();
      const current = store.tasks[index];
      const targetAlertMode = data.alertMode ?? current.alertMode ?? 'ALARM';
      store.tasks[index] = {
        ...current,
        title: data.title ?? current.title,
        description: data.description !== undefined ? data.description : current.description,
        category: data.category ?? current.category,
        priority: data.priority ?? current.priority,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? data.dueDate.toISOString() : null) : current.dueDate,
        dueTime: data.dueTime !== undefined ? data.dueTime : current.dueTime,
        alertMode: targetAlertMode,
        updatedAt: now,
      };

      if (data.reminders) {
        // Remove old reminders
        store.reminders = store.reminders.filter((r) => r.taskId !== taskId);
        // Add new
        for (const r of data.reminders) {
          store.reminders.push({
            id: crypto.randomUUID(),
            taskId,
            userId,
            remindAt: r.remindAt.toISOString(),
            channel: r.channel || 'BROWSER',
            alertMode: r.alertMode || targetAlertMode,
            status: 'PENDING',
            advanceMinutes: r.advanceMinutes ?? 0,
            sentAt: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (data.alertMode) {
        // Update alertMode on existing reminders for this task
        store.reminders
          .filter((r) => r.taskId === taskId)
          .forEach((r) => {
            r.alertMode = data.alertMode;
            r.updatedAt = now;
          });
      }

      saveFallbackStore(store);
      const updated = store.tasks[index];
      const reminders = store.reminders.filter((r) => r.taskId === taskId);
      return {
        ...updated,
        dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
        reminders: reminders.map((r) => ({
          ...r,
          remindAt: new Date(r.remindAt),
        })),
      };
    }
  );
}

export async function toggleTaskComplete(taskId: string, userId: string, isCompleted: boolean) {
  const completedAt = isCompleted ? new Date() : null;

  return executeWithFallback(
    async () => {
      // When completed, dismiss pending reminders so stale alerts are cancelled
      if (isCompleted) {
        await prisma.reminder.updateMany({
          where: { taskId, userId, status: 'PENDING' },
          data: { status: 'DISMISSED' },
        });
      }

      return prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted,
          completedAt,
        },
        include: { reminders: true },
      });
    },
    () => {
      const store = getFallbackStore();
      const task = store.tasks.find((t) => t.id === taskId && t.userId === userId);
      if (!task) throw new Error('Task not found');

      task.isCompleted = isCompleted;
      task.completedAt = completedAt ? completedAt.toISOString() : null;
      task.updatedAt = new Date().toISOString();

      if (isCompleted) {
        store.reminders
          .filter((r) => r.taskId === taskId && r.status === 'PENDING')
          .forEach((r) => {
            r.status = 'DISMISSED';
            r.updatedAt = new Date().toISOString();
          });
      }

      saveFallbackStore(store);
      return {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completedAt,
      };
    }
  );
}

export async function deleteTask(taskId: string, userId: string) {
  return executeWithFallback(
    async () => {
      await prisma.task.delete({
        where: { id: taskId, userId },
      });
      return { success: true };
    },
    () => {
      const store = getFallbackStore();
      const idx = store.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
      if (idx === -1) throw new Error('Task not found');
      store.tasks.splice(idx, 1);
      store.reminders = store.reminders.filter((r) => r.taskId !== taskId);
      saveFallbackStore(store);
      return { success: true };
    }
  );
}

export async function snoozeReminder(
  reminderId: string,
  userId: string,
  snoozeMinutes: number
) {
  const newRemindAt = new Date(Date.now() + snoozeMinutes * 60 * 1000);

  return executeWithFallback(
    async () => {
      return prisma.reminder.update({
        where: { id: reminderId, userId },
        data: {
          remindAt: newRemindAt,
          status: 'PENDING',
        },
      });
    },
    () => {
      const store = getFallbackStore();
      const reminder = store.reminders.find((r) => r.id === reminderId && r.userId === userId);
      if (!reminder) throw new Error('Reminder not found');
      reminder.remindAt = newRemindAt.toISOString();
      reminder.status = 'PENDING';
      reminder.updatedAt = new Date().toISOString();
      saveFallbackStore(store);
      return { ...reminder, remindAt: newRemindAt };
    }
  );
}

export async function dismissReminder(reminderId: string, userId: string) {
  return executeWithFallback(
    async () => {
      return prisma.reminder.update({
        where: { id: reminderId, userId },
        data: {
          status: 'DISMISSED',
        },
      });
    },
    () => {
      const store = getFallbackStore();
      const reminder = store.reminders.find((r) => r.id === reminderId && r.userId === userId);
      if (!reminder) throw new Error('Reminder not found');
      reminder.status = 'DISMISSED';
      reminder.updatedAt = new Date().toISOString();
      saveFallbackStore(store);
      return reminder;
    }
  );
}

// -------------------------------------------------------------
// REMINDER PROCESSING & LOGGING (Scheduler / Cron)
// -------------------------------------------------------------
export async function getDueReminders(thresholdDate: Date = new Date()) {
  return executeWithFallback(
    async () => {
      return prisma.reminder.findMany({
        where: {
          status: 'PENDING',
          remindAt: { lte: thresholdDate },
          task: { isCompleted: false },
        },
        include: {
          task: true,
          user: true,
        },
      });
    },
    () => {
      const store = getFallbackStore();
      const thresholdTime = thresholdDate.getTime();
      const due = store.reminders.filter((r) => {
        if (r.status !== 'PENDING') return false;
        if (new Date(r.remindAt).getTime() > thresholdTime) return false;
        const task = store.tasks.find((t) => t.id === r.taskId);
        return task && !task.isCompleted;
      });

      return due.map((r) => {
        const task = store.tasks.find((t) => t.id === r.taskId);
        const user = store.users.find((u) => u.id === r.userId);
        const alertMode = r.alertMode || (task ? task.alertMode : 'ALARM') || 'ALARM';
        return {
          ...r,
          alertMode,
          remindAt: new Date(r.remindAt),
          task: task
            ? {
                ...task,
                alertMode: task.alertMode || alertMode,
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
              }
            : null,
          user,
        };
      });
    }
  );
}

export async function markReminderSent(
  reminderId: string,
  userId: string,
  status: 'SENT' | 'FAILED',
  errorMessage?: string
) {
  const now = new Date();

  return executeWithFallback(
    async () => {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: status === 'SENT' ? 'SENT' : 'PENDING',
          sentAt: status === 'SENT' ? now : null,
        },
      });

      await prisma.notificationLog.create({
        data: {
          id: crypto.randomUUID(),
          reminderId,
          userId,
          channel: 'BROWSER',
          status: status === 'SENT' ? 'SUCCESS' : 'FAILED',
          errorMessage: errorMessage || null,
          deliveredAt: now,
        },
      });
    },
    () => {
      const store = getFallbackStore();
      const rem = store.reminders.find((r) => r.id === reminderId);
      if (rem) {
        rem.status = status === 'SENT' ? 'SENT' : 'PENDING';
        rem.sentAt = status === 'SENT' ? now.toISOString() : null;
        rem.updatedAt = now.toISOString();
      }
      store.notificationLogs.push({
        id: crypto.randomUUID(),
        reminderId,
        userId,
        channel: 'BROWSER',
        status: status === 'SENT' ? 'SUCCESS' : 'FAILED',
        errorMessage: errorMessage || null,
        deliveredAt: now.toISOString(),
      });
      saveFallbackStore(store);
    }
  );
}

// -------------------------------------------------------------
// USER PREFERENCES
// -------------------------------------------------------------
export async function getUserPreferences(userId: string) {
  return executeWithFallback(
    () => prisma.userPreference.findUnique({ where: { userId } }),
    () => {
      const store = getFallbackStore();
      const pref = store.preferences.find((p) => p.userId === userId);
      return (
        pref || {
          id: crypto.randomUUID(),
          userId,
          defaultAdvanceMinutes: 15,
          defaultAlertMode: 'ALARM',
          defaultSnoozeMinutes: 15,
          timezone: 'Asia/Kolkata',
          soundEnabled: true,
          theme: 'dark',
        }
      );
    }
  );
}

export async function updateUserPreferences(
  userId: string,
  data: {
    defaultAdvanceMinutes?: number;
    defaultAlertMode?: string;
    defaultSnoozeMinutes?: number;
    timezone?: string;
    soundEnabled?: boolean;
    theme?: string;
  }
) {
  return executeWithFallback(
    () =>
      prisma.userPreference.upsert({
        where: { userId },
        update: data,
        create: {
          id: crypto.randomUUID(),
          userId,
          defaultAdvanceMinutes: data.defaultAdvanceMinutes ?? 15,
          defaultAlertMode: data.defaultAlertMode ?? 'ALARM',
          defaultSnoozeMinutes: data.defaultSnoozeMinutes ?? 15,
          timezone: data.timezone ?? 'Asia/Kolkata',
          soundEnabled: data.soundEnabled ?? true,
          theme: data.theme ?? 'dark',
        },
      }),
    () => {
      const store = getFallbackStore();
      let pref = store.preferences.find((p) => p.userId === userId);
      if (!pref) {
        pref = {
          id: crypto.randomUUID(),
          userId,
          defaultAdvanceMinutes: data.defaultAdvanceMinutes ?? 15,
          defaultAlertMode: data.defaultAlertMode ?? 'ALARM',
          defaultSnoozeMinutes: data.defaultSnoozeMinutes ?? 15,
          timezone: data.timezone ?? 'Asia/Kolkata',
          soundEnabled: data.soundEnabled ?? true,
          theme: data.theme ?? 'dark',
        };
        store.preferences.push(pref);
      } else {
        if (data.defaultAdvanceMinutes !== undefined) pref.defaultAdvanceMinutes = data.defaultAdvanceMinutes;
        if (data.defaultAlertMode !== undefined) pref.defaultAlertMode = data.defaultAlertMode;
        if (data.defaultSnoozeMinutes !== undefined) pref.defaultSnoozeMinutes = data.defaultSnoozeMinutes;
        if (data.timezone !== undefined) pref.timezone = data.timezone;
        if (data.soundEnabled !== undefined) pref.soundEnabled = data.soundEnabled;
        if (data.theme !== undefined) pref.theme = data.theme;
      }
      saveFallbackStore(store);
      return pref;
    }
  );
}

export function getDatabaseStatus() {
  const isVercel = !!process.env.VERCEL;
  const isLocalhostDb =
    process.env.DATABASE_URL?.includes('localhost') ||
    process.env.DATABASE_URL?.includes('127.0.0.1');
  const isDemo = isUsingFallback || (isVercel && isLocalhostDb);

  return {
    isUsingFallback: isDemo,
    isDemoMode: isDemo,
    modeLabel: isDemo
      ? 'Demo Mode (Temporary Serverless Storage)'
      : 'Production Mode (Persistent Hosted MySQL)',
    targetProvider: 'mysql',
    databaseUrl: process.env.DATABASE_URL
      ? isLocalhostDb
        ? 'Localhost (Demo on Cloud)'
        : 'Cloud Configured'
      : 'Missing',
  };
}

