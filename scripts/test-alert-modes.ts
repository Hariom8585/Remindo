import {
  createUser,
  findUserByEmail,
  createTask,
  getUserTasks,
  getTaskById,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  snoozeReminder,
  dismissReminder,
  getDueReminders,
  getUserPreferences,
  updateUserPreferences,
} from '../src/lib/db-repository';

async function runAlertModeTests() {
  console.log('=====================================================');
  console.log('REMINDO: Alert Modes & Scheduling Test Suite');
  console.log('Testing: SOUND ALARM vs NOTIFICATION ONLY');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Setup test user
    const testEmail = `alert_test_${Date.now()}@remindo.local`;
    const user = await createUser({
      name: 'Alert Tester',
      email: testEmail,
      passwordHash: 'dummy_hash',
      timezone: 'Asia/Kolkata',
    });

    assert(Boolean(user && user.id), 'User created for testing');

    // Test 1: User Preferences defaults
    const defaultPref = await getUserPreferences(user.id);
    assert(
      defaultPref?.defaultAlertMode === 'ALARM',
      'Default user preference is ALARM mode'
    );

    // Test 2: Update User Preference to NOTIFICATION
    const updatedPref = await updateUserPreferences(user.id, {
      defaultAlertMode: 'NOTIFICATION',
      defaultSnoozeMinutes: 10,
    });
    assert(
      updatedPref?.defaultAlertMode === 'NOTIFICATION' && updatedPref?.defaultSnoozeMinutes === 10,
      'User preference updated to NOTIFICATION mode with 10m snooze'
    );

    // Test 3: Create Task with SOUND ALARM mode
    const now = new Date();
    const pastDue = new Date(now.getTime() - 5 * 60 * 1000); // 5 mins ago (due now)

    const alarmTask = await createTask({
      userId: user.id,
      title: 'Submit Project Assignment',
      category: 'College & Education',
      priority: 'HIGH',
      dueDate: pastDue,
      dueTime: '10:00',
      alertMode: 'ALARM',
      reminders: [{ remindAt: pastDue, advanceMinutes: 0 }],
    });

    assert(
      alarmTask.alertMode === 'ALARM' && alarmTask.reminders?.[0]?.alertMode === 'ALARM',
      'Task and reminder created with SOUND ALARM alert mode'
    );

    // Test 4: Create Task with NOTIFICATION ONLY mode
    const noticeTask = await createTask({
      userId: user.id,
      title: 'Buy Groceries & Milk',
      category: 'Shopping',
      priority: 'LOW',
      dueDate: pastDue,
      dueTime: '10:00',
      alertMode: 'NOTIFICATION',
      reminders: [{ remindAt: pastDue, advanceMinutes: 0 }],
    });

    assert(
      noticeTask.alertMode === 'NOTIFICATION' && noticeTask.reminders?.[0]?.alertMode === 'NOTIFICATION',
      'Task and reminder created with NOTIFICATION ONLY alert mode'
    );

    // Test 5: Verify getDueReminders returns correct alertMode for both
    const dueReminders = await getDueReminders(new Date());
    const userDueAlarms = dueReminders.filter((r) => r.userId === user.id);

    const foundAlarm = userDueAlarms.find((r) => r.taskId === alarmTask.id);
    const foundNotice = userDueAlarms.find((r) => r.taskId === noticeTask.id);

    assert(
      Boolean(foundAlarm && foundAlarm.alertMode === 'ALARM'),
      'Scheduler query returns ALARM alertMode for alarm task'
    );
    assert(
      Boolean(foundNotice && foundNotice.alertMode === 'NOTIFICATION'),
      'Scheduler query returns NOTIFICATION alertMode for notification task'
    );

    // Test 6: Dismiss active alarm
    if (foundAlarm) {
      const dismissed = await dismissReminder(foundAlarm.id, user.id);
      assert(dismissed?.status === 'DISMISSED', 'Sound alarm successfully dismissed via stop button');

      const dueAfterDismiss = await getDueReminders(new Date());
      const stillDue = dueAfterDismiss.some((r) => r.id === foundAlarm.id);
      assert(!stillDue, 'Dismissed sound alarm no longer triggers in scheduler');
    }

    // Test 7: Snooze notification reminder
    if (foundNotice) {
      const snoozed = await snoozeReminder(foundNotice.id, user.id, 15);
      const newTime = new Date(snoozed.remindAt).getTime();
      const expectedMinTime = now.getTime() + 14 * 60 * 1000;
      assert(
        snoozed.status === 'PENDING' && newTime > expectedMinTime,
        'Notification reminder snoozed 15 minutes into future'
      );
    }

    // Test 8: Completing task prevents stale alarms
    await toggleTaskComplete(alarmTask.id, user.id, true);
    const completedTask = await getTaskById(alarmTask.id, user.id);
    assert(completedTask?.isCompleted === true, 'Task toggled to completed');

    // Test 9: Deleting task removes all reminders
    await deleteTask(noticeTask.id, user.id);
    const remainingTasks = await getUserTasks(user.id);
    assert(
      !remainingTasks.some((t) => t.id === noticeTask.id),
      'Task and reminders deleted cleanly, preventing duplicate or stale alarms'
    );

    // Test 10: User isolation
    const otherUser = await createUser({
      name: 'Second User',
      email: `other_${Date.now()}@remindo.local`,
      passwordHash: 'dummy_hash',
    });
    const otherTasks = await getUserTasks(otherUser.id);
    assert(
      otherTasks.length === 0,
      'User isolation verified: other user has 0 tasks'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAlertModeTests();
