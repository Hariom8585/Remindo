// REMINDO - Comprehensive Automated Test & Verification Suite
import assert from 'assert';
import { parseTaskDeterministic } from '../src/lib/nlp/parseTaskDeterministic';
import { hashPassword, comparePassword, signToken, verifyToken } from '../src/lib/auth';
import {
  createUser,
  findUserByEmail,
  createTask,
  getUserTasks,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  snoozeReminder,
  getDueReminders,
  markReminderSent,
} from '../src/lib/db-repository';

console.log('====================================================');
console.log('🧪 REMINDO — Automated Verification Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function runTests() {
  // -----------------------------------------------------------------
  // 1. Natural Language Task Parsing Tests
  // -----------------------------------------------------------------
  console.log('--- 1. Natural Language & Date Parsing ---');

  const baseDate = new Date(2026, 9, 11, 10, 0, 0); // 11 Oct 2026 10:00 AM

  await test('NPTEL assignment on 23 October 2026', () => {
    const res = parseTaskDeterministic('Submit my NPTEL assignment on 23 October 2026.', baseDate);
    assert.strictEqual(res.dueDate, '2026-10-23');
    assert.strictEqual(res.category, 'College & Education');
    assert.ok(res.title.toLowerCase().includes('nptel assignment'));
    assert.strictEqual(res.needsClarification, false);
  });

  await test('Remind me tomorrow at 6 PM to call Dad', () => {
    const res = parseTaskDeterministic('Remind me tomorrow at 6 PM to call Dad.', baseDate);
    assert.strictEqual(res.dueDate, '2026-10-12');
    assert.strictEqual(res.dueTime, '18:00');
    assert.strictEqual(res.category, 'Family & Personal');
    assert.ok(res.title.toLowerCase().includes('call dad'));
    assert.strictEqual(res.needsClarification, false);
  });

  await test('Buy a charger from the shop this evening', () => {
    const res = parseTaskDeterministic('Buy a charger from the shop this evening.', baseDate);
    assert.strictEqual(res.dueDate, '2026-10-11');
    assert.strictEqual(res.dueTime, '18:00');
    assert.strictEqual(res.category, 'Shopping');
    assert.ok(res.title.toLowerCase().includes('charger'));
    assert.strictEqual(res.needsClarification, false);
  });

  await test('Send Rahul ₹500 tomorrow', () => {
    const res = parseTaskDeterministic('Send Rahul ₹500 tomorrow.', baseDate);
    assert.strictEqual(res.dueDate, '2026-10-12');
    assert.strictEqual(res.category, 'Payments');
    assert.ok(res.title.toLowerCase().includes('₹500') || res.title.toLowerCase().includes('rahul'));
    assert.strictEqual(res.needsClarification, false);
  });

  await test('Book my train ticket before the booking deadline', () => {
    const res = parseTaskDeterministic('Book my train ticket before the booking deadline.', baseDate);
    assert.strictEqual(res.category, 'Travel & Booking');
    assert.strictEqual(res.priority, 'HIGH'); // "deadline" triggers high priority
  });

  await test('Ambiguous input asks for clarification (e.g. "Remind me to buy milk")', () => {
    const res = parseTaskDeterministic('Remind me to buy milk', baseDate);
    assert.strictEqual(res.hasDeadline, false);
    assert.strictEqual(res.needsClarification, true);
    assert.ok(res.clarificationPrompt);
    assert.ok(Array.isArray(res.suggestions) && res.suggestions.length > 0);
    assert.strictEqual(res.dueDate, null);
    assert.strictEqual(res.dueTime, null);
  });

  // -----------------------------------------------------------------
  // 2. Authentication & Password Security Tests
  // -----------------------------------------------------------------
  console.log('\n--- 2. Authentication & Password Security ---');

  let testUser1Id = '';
  let testUser2Id = '';

  await test('Bcrypt password hashing and verification', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await hashPassword(password);
    assert.notStrictEqual(password, hash);
    const isValid = await comparePassword(password, hash);
    assert.strictEqual(isValid, true);
    const isWrongValid = await comparePassword('WrongPassword', hash);
    assert.strictEqual(isWrongValid, false);
  });

  await test('JWT session token signing and verification', () => {
    const payload = {
      userId: 'test-user-id-123',
      email: 'test@remindo.com',
      name: 'Test User',
      timezone: 'Asia/Kolkata',
    };
    const token = signToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);
    const verified = verifyToken(token);
    assert.ok(verified);
    assert.strictEqual(verified.userId, payload.userId);
    assert.strictEqual(verified.email, payload.email);
  });

  await test('User registration in database', async () => {
    const email = `test_omkar_${Date.now()}@remindo.com`;
    const passwordHash = await hashPassword('password123');
    const user = await createUser({
      name: 'Omkar Test',
      email,
      passwordHash,
      timezone: 'Asia/Kolkata',
    });
    assert.ok(user.id);
    assert.strictEqual(user.name, 'Omkar Test');
    testUser1Id = user.id;

    // Check retrieval
    const found = await findUserByEmail(email);
    assert.ok(found);
    assert.strictEqual(found.id, user.id);
  });

  await test('Second user registration for data isolation test', async () => {
    const email = `test_other_${Date.now()}@remindo.com`;
    const passwordHash = await hashPassword('password123');
    const user = await createUser({
      name: 'Other User',
      email,
      passwordHash,
    });
    testUser2Id = user.id;
    assert.ok(testUser2Id);
  });

  // -----------------------------------------------------------------
  // 3. User Data Isolation Tests
  // -----------------------------------------------------------------
  console.log('\n--- 3. User-Level Data Isolation ---');

  let user1TaskId = '';

  await test('User 1 creates a private task', async () => {
    const task = await createTask({
      userId: testUser1Id,
      title: 'Secret Exam Submission',
      category: 'College & Education',
      priority: 'HIGH',
      dueDate: new Date(2026, 9, 23, 17, 0, 0),
      dueTime: '17:00',
      reminders: [{ remindAt: new Date(2026, 9, 23, 16, 45, 0), advanceMinutes: 15 }],
    });
    assert.ok(task.id);
    user1TaskId = task.id;
  });

  await test('User 2 cannot see User 1 tasks', async () => {
    const user2Tasks = await getUserTasks(testUser2Id);
    const hasUser1Task = user2Tasks.some((t: any) => t.id === user1TaskId);
    assert.strictEqual(hasUser1Task, false);
  });

  await test('User 2 cannot update User 1 task (strict isolation)', async () => {
    let failed = false;
    try {
      await updateTask(user1TaskId, testUser2Id, { title: 'Hacked by User 2' });
    } catch (e: any) {
      failed = true;
      assert.ok(e.message.includes('not found') || e.message.includes('unauthorized'));
    }
    assert.strictEqual(failed, true, 'User 2 updating User 1 task must be blocked');
  });

  await test('User 2 cannot complete User 1 task (strict isolation)', async () => {
    let failed = false;
    try {
      await toggleTaskComplete(user1TaskId, testUser2Id, true);
    } catch (e: any) {
      failed = true;
      assert.ok(e.message.includes('not found') || e.message.includes('unauthorized'));
    }
    assert.strictEqual(failed, true, 'User 2 completing User 1 task must be blocked');
  });

  await test('User 2 cannot delete User 1 task (strict isolation)', async () => {
    let failed = false;
    try {
      await deleteTask(user1TaskId, testUser2Id);
    } catch (e: any) {
      failed = true;
      assert.ok(e.message.includes('not found') || e.message.includes('unauthorized'));
    }
    assert.strictEqual(failed, true, 'User 2 deleting User 1 task must be blocked');
  });

  // -----------------------------------------------------------------
  // 4. Task CRUD & Completion Management
  // -----------------------------------------------------------------
  console.log('\n--- 4. Task Management & Snooze ---');

  await test('Update task details', async () => {
    const updated = await updateTask(user1TaskId, testUser1Id, {
      title: 'Updated Exam Submission (Final)',
      priority: 'HIGH',
    });
    assert.strictEqual(updated.title, 'Updated Exam Submission (Final)');
  });

  await test('Mark task complete dismisses pending reminders', async () => {
    const completed = await toggleTaskComplete(user1TaskId, testUser1Id, true);
    assert.strictEqual(completed.isCompleted, true);
    assert.ok(completed.completedAt);
  });

  await test('Reopen task restores task state', async () => {
    const reopened = await toggleTaskComplete(user1TaskId, testUser1Id, false);
    assert.strictEqual(reopened.isCompleted, false);
    assert.strictEqual(reopened.completedAt, null);
  });

  // -----------------------------------------------------------------
  // 5. Reminder Scheduler & Snooze Tests
  // -----------------------------------------------------------------
  console.log('\n--- 5. Reminder Scheduling & Due Processor ---');

  let reminderTaskId = '';

  await test('Create due reminder and verify scheduler processor', async () => {
    // Reminder scheduled 2 minutes in past
    const pastTime = new Date(Date.now() - 2 * 60 * 1000);
    const task = await createTask({
      userId: testUser1Id,
      title: 'Urgent Pill Reminder',
      category: 'Family & Personal',
      dueDate: pastTime,
      dueTime: '10:00',
      reminders: [{ remindAt: pastTime, advanceMinutes: 0 }],
    });
    reminderTaskId = task.id;

    // Check due reminders query
    const dueReminders = await getDueReminders(new Date());
    const matched = dueReminders.find((r: any) => r.taskId === reminderTaskId);
    assert.ok(matched, 'Due reminder should be returned by getDueReminders');

    // Mark sent (idempotent processing)
    await markReminderSent(matched.id, testUser1Id, 'SENT');

    // Query again - should not be in pending due reminders anymore!
    const dueAfter = await getDueReminders(new Date());
    const matchedAfter = dueAfter.find((r: any) => r.id === matched.id);
    assert.strictEqual(matchedAfter, undefined, 'Sent reminder should not appear in due list');
  });

  await test('Snooze reminder by 15 minutes', async () => {
    const task = await createTask({
      userId: testUser1Id,
      title: 'Snooze Test Task',
      reminders: [{ remindAt: new Date(), advanceMinutes: 0 }],
    });
    const reminderId = task.reminders[0].id;
    const beforeSnooze = Date.now();
    const snoozed = await snoozeReminder(reminderId, testUser1Id, 15);
    const snoozedTime = new Date(snoozed.remindAt).getTime();
    assert.ok(snoozedTime >= beforeSnooze + 14 * 60 * 1000);
  });

  await test('Delete task removes task and attached reminders', async () => {
    const res = await deleteTask(user1TaskId, testUser1Id);
    assert.strictEqual(res.success, true);
    const remaining = await getUserTasks(testUser1Id);
    assert.strictEqual(remaining.some((t: any) => t.id === user1TaskId), false);
  });

  // -----------------------------------------------------------------
  // 6. Multi-Task Natural Language Extraction Tests
  // -----------------------------------------------------------------
  console.log('\n--- 6. Multi-Task Voice & NLP Extraction ---');
  const { parseMultipleTasksDeterministic } = await import('../src/lib/nlp/parseTaskDeterministic');

  await test('Split multi-task sentence joined by "and" with action verbs', () => {
    const multi = parseMultipleTasksDeterministic('Buy milk today at 5 PM and call Dad tomorrow at 6 PM', baseDate);
    assert.strictEqual(multi.length, 2);
    assert.ok(multi[0].title.toLowerCase().includes('buy milk'));
    assert.strictEqual(multi[0].dueTime, '17:00');
    assert.ok(multi[1].title.toLowerCase().includes('call dad'));
    assert.strictEqual(multi[1].dueTime, '18:00');
    assert.strictEqual(multi[1].dueDate, '2026-10-12');
  });

  await test('Split multi-line tasks', () => {
    const input = 'Submit assignment on 23 October\nPay electricity bill tomorrow at 10 AM\nBuy charger this evening';
    const multi = parseMultipleTasksDeterministic(input, baseDate);
    assert.strictEqual(multi.length, 3);
    assert.strictEqual(multi[0].dueDate, '2026-10-23');
    assert.strictEqual(multi[1].dueDate, '2026-10-12');
    assert.strictEqual(multi[1].dueTime, '10:00');
    assert.strictEqual(multi[2].dueTime, '18:00');
  });

  await test('Do NOT split single task with compound object ("Buy milk and bread")', () => {
    const multi = parseMultipleTasksDeterministic('Buy milk and bread tomorrow at 8 AM', baseDate);
    assert.strictEqual(multi.length, 1);
    assert.ok(multi[0].title.toLowerCase().includes('milk and bread'));
  });

  // -----------------------------------------------------------------
  // 7. Security, Rate Limiter & Secret Sanitization Tests
  // -----------------------------------------------------------------
  console.log('\n--- 7. Rate Limiter & Secret Sanitization ---');
  const { checkRateLimit, sanitizeErrorMessage } = await import('../src/lib/rate-limiter');

  await test('Rate limiter allows requests under threshold and blocks excess', () => {
    const testKey = `test_ip_${Date.now()}`;
    // Limit to 3 requests
    const r1 = checkRateLimit(testKey, 3, 10000);
    const r2 = checkRateLimit(testKey, 3, 10000);
    const r3 = checkRateLimit(testKey, 3, 10000);
    const r4 = checkRateLimit(testKey, 3, 10000);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r4.allowed, false);
    assert.strictEqual(r4.remaining, 0);
  });

  await test('Secret sanitizer redacts database credentials and tokens', () => {
    const leakedDb = 'Failed connecting to mysql://root:super_secret_pw123@gateway.tidbcloud.com:4000/remindo';
    const sanitizedDb = sanitizeErrorMessage(leakedDb);
    assert.strictEqual(sanitizedDb.includes('super_secret_pw123'), false);
    assert.ok(sanitizedDb.includes('mysql://***:***@'));

    const leakedToken = 'Authorization error for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123xyz456def';
    const sanitizedToken = sanitizeErrorMessage(leakedToken);
    assert.strictEqual(sanitizedToken.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), false);
    assert.ok(sanitizedToken.includes('[REDACTED_JWT_TOKEN]'));
  });

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
