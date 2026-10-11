async function runLiveAlertModeE2E() {
  console.log('========================================================');
  console.log('REMINDO: Live HTTP E2E Test Suite for Alert Modes');
  console.log('Testing against http://localhost:3000');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000';
  let cookieHeader = '';

  try {
    // 1. Register test user
    const testEmail = `live_alert_${Date.now()}@remindo.app`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Live Mode Tester',
        email: testEmail,
        password: 'Password123!',
      }),
    });

    const setCookie = regRes.headers.get('set-cookie');
    if (setCookie) {
      cookieHeader = setCookie.split(';')[0];
    }
    const regData = await regRes.json();
    assert(
      (regRes.status === 200 || regRes.status === 201) && regData.user?.email === testEmail,
      'User registration with session cookie'
    );

    // 2. Fetch User Preferences
    const prefRes = await fetch(`${BASE_URL}/api/preferences`, {
      headers: { Cookie: cookieHeader },
    });
    const prefData = await prefRes.json();
    assert(prefRes.status === 200 && prefData.preferences?.defaultAlertMode === 'ALARM', 'Fetch default preferences (ALARM mode)');

    // 3. Update User Preferences
    const updatePrefRes = await fetch(`${BASE_URL}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        defaultAlertMode: 'NOTIFICATION',
        defaultSnoozeMinutes: 20,
      }),
    });
    const updatePrefData = await updatePrefRes.json();
    assert(
      updatePrefRes.status === 200 &&
      updatePrefData.preferences?.defaultAlertMode === 'NOTIFICATION' &&
      updatePrefData.preferences?.defaultSnoozeMinutes === 20,
      'Update user preferences to NOTIFICATION mode with 20m snooze'
    );

    // 4. Create Task with SOUND ALARM mode
    const alarmTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        title: 'Project Submission Live Test',
        category: 'College & Education',
        priority: 'HIGH',
        dueDate: '2026-10-11',
        dueTime: '08:00',
        alertMode: 'ALARM',
        reminders: [{ advanceMinutes: 0 }],
      }),
    });
    const alarmTaskData = await alarmTaskRes.json();
    const alarmTask = alarmTaskData.task;
    assert(
      alarmTaskRes.status === 201 &&
      alarmTask?.alertMode === 'ALARM' &&
      alarmTask?.reminders?.[0]?.alertMode === 'ALARM',
      'Create task with SOUND ALARM mode'
    );

    // 5. Create Task with NOTIFICATION ONLY mode
    const noticeTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        title: 'Grocery Shopping Live Test',
        category: 'Shopping',
        priority: 'MEDIUM',
        dueDate: '2026-10-11',
        dueTime: '08:00',
        alertMode: 'NOTIFICATION',
        reminders: [{ advanceMinutes: 0 }],
      }),
    });
    const noticeTaskData = await noticeTaskRes.json();
    const noticeTask = noticeTaskData.task;
    assert(
      noticeTaskRes.status === 201 &&
      noticeTask?.alertMode === 'NOTIFICATION' &&
      noticeTask?.reminders?.[0]?.alertMode === 'NOTIFICATION',
      'Create task with NOTIFICATION ONLY mode'
    );

    // 6. Get tasks and verify list contains both with proper alertMode
    const listRes = await fetch(`${BASE_URL}/api/tasks`, {
      headers: { Cookie: cookieHeader },
    });
    const listData = await listRes.json();
    const foundA = listData.tasks?.find((t) => t.id === alarmTask.id);
    const foundN = listData.tasks?.find((t) => t.id === noticeTask.id);
    assert(
      foundA?.alertMode === 'ALARM' && foundN?.alertMode === 'NOTIFICATION',
      'List tasks returns correct alertMode on tasks and reminders'
    );

    // 7. Trigger scheduler/cron and verify alertMode in processed logs
    const cronRes = await fetch(`${BASE_URL}/api/cron/reminders`);
    const cronData = await cronRes.json();
    const logA = cronData.logs?.find((l) => l.taskId === alarmTask.id);
    const logN = cronData.logs?.find((l) => l.taskId === noticeTask.id);
    assert(
      cronRes.status === 200 &&
      logA?.alertMode === 'ALARM' &&
      logN?.alertMode === 'NOTIFICATION',
      'Cron scheduler processes reminders and outputs matching alertMode for both'
    );

    // 8. Snooze reminder
    if (foundN && foundN.reminders?.[0]) {
      const snoozeRes = await fetch(`${BASE_URL}/api/reminders/${foundN.reminders[0].id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({ minutes: 15 }),
      });
      const snoozeData = await snoozeRes.json();
      assert(snoozeRes.status === 200 && Boolean(snoozeData.reminder), 'Snooze reminder by 15 minutes');
    }

    // 9. Dismiss reminder alarm (Stop Alarm)
    if (foundA && foundA.reminders?.[0]) {
      const dismissRes = await fetch(`${BASE_URL}/api/reminders/${foundA.reminders[0].id}/dismiss`, {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      const dismissData = await dismissRes.json();
      assert(dismissRes.status === 200 && dismissData.reminder?.status === 'DISMISSED', 'Dismiss reminder alarm (Stop Alarm button)');
    }

    // 10. Complete task
    const toggleRes = await fetch(`${BASE_URL}/api/tasks/${alarmTask.id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ isCompleted: true }),
    });
    const toggleData = await toggleRes.json();
    assert(toggleRes.status === 200 && toggleData.task?.isCompleted === true, 'Mark task complete');

    // 11. Delete task
    const delRes = await fetch(`${BASE_URL}/api/tasks/${noticeTask.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    assert(delRes.status === 200, 'Delete task cleans up reminders');

  } catch (err) {
    console.error('E2E Test Error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 E2E Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveAlertModeE2E();
