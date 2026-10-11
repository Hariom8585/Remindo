import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

console.log('====================================================');
console.log('🌐 REMINDO — Live HTTP Server End-to-End Tests');
console.log(`Target: ${BASE_URL}`);
console.log('====================================================\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runE2E() {
  let sessionCookie = '';
  let authToken = '';
  let createdTaskId = '';
  let createdReminderId = '';

  // 1. Web Home Page
  await test('GET / serves Remindo HTML application', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('REMINDO'));
  });

  // 2. User Registration
  await test('POST /api/auth/register creates user and returns session', async () => {
    const uniqueEmail = `omkar_e2e_${Date.now()}@remindo.io`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Omkar Live',
        email: uniqueEmail,
        password: 'password123',
        timezone: 'Asia/Kolkata',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.strictEqual(data.user.name, 'Omkar Live');
    assert.ok(data.token);
    authToken = data.token;

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    sessionCookie = setCookie.split(';')[0];
  });

  // 3. Me endpoint
  await test('GET /api/auth/me returns authenticated user details', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Cookie: sessionCookie,
        Authorization: `Bearer ${authToken}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.name, 'Omkar Live');
    assert.ok(data.preferences);
  });

  // 4. AI Parse Task - Assignment with exact date
  await test('POST /api/ai/parse-task parses NPTEL assignment', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/parse-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        input: 'Submit my NPTEL assignment on 23 October 2026',
        timezone: 'Asia/Kolkata',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.result.dueDate, '2026-10-23');
    assert.strictEqual(data.result.category, 'College & Education');
  });

  // 5. AI Parse Task - Clarification flow (no date/time)
  await test('POST /api/ai/parse-task flags missing deadline for "buy milk"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/parse-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        input: 'Remind me to buy milk',
        timezone: 'Asia/Kolkata',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.result.hasDeadline, false);
    assert.strictEqual(data.result.needsClarification, true);
    assert.ok(data.result.suggestions && data.result.suggestions.length > 0);
  });

  // 6. Create Task with reminders
  await test('POST /api/tasks creates task with reminders', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'Submit NPTEL assignment',
        category: 'College & Education',
        priority: 'HIGH',
        dueDate: '2026-10-23',
        dueTime: '17:00',
        reminders: [
          { advanceMinutes: 0 },
          { advanceMinutes: 15 },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.task.id);
    assert.strictEqual(data.task.title, 'Submit NPTEL assignment');
    assert.ok(data.task.reminders.length >= 1);
    createdTaskId = data.task.id;
    createdReminderId = data.task.reminders[0].id;
  });

  // 7. List Tasks
  await test('GET /api/tasks returns created task for user', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const found = data.tasks.find((t) => t.id === createdTaskId);
    assert.ok(found);
  });

  // 8. Toggle Complete
  await test('POST /api/tasks/[id]/toggle toggles completion status', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ isCompleted: true }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.task.isCompleted, true);
  });

  // 9. Snooze Reminder
  await test('POST /api/reminders/[id]/snooze snoozes reminder by 30 mins', async () => {
    const res = await fetch(`${BASE_URL}/api/reminders/${createdReminderId}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ minutes: 30 }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.reminder);
  });

  // 10. Cron Scheduler endpoint
  await test('GET /api/cron/reminders processes due reminders idempotently', async () => {
    const res = await fetch(`${BASE_URL}/api/cron/reminders`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.processedCount === 'number');
    assert.ok(Array.isArray(data.logs));
  });

  // 11. Logout
  await test('POST /api/auth/logout clears session', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(res.status, 200);
  });

  console.log('\n====================================================');
  console.log(`📊 Live E2E Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E();
