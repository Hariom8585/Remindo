import assert from 'assert';
import { hashPassword, comparePassword, signToken, verifyToken } from '../src/lib/auth';
import {
  createUser,
  findUserByEmail,
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
} from '../src/lib/db-repository';

async function testPersistenceCycle() {
  console.log('====================================================');
  console.log('🔄 Testing Complete User Lifecycle & Persistence');
  console.log('====================================================\n');

  const testEmail = `pers_cycle_${Date.now()}@test.com`;
  const rawPassword = 'SecurePassword123!';

  // Step 1: Register User
  console.log('1. Registering user...');
  const passwordHash = await hashPassword(rawPassword);
  const createdUser = await createUser({
    name: 'Lifecycle Tester',
    email: testEmail,
    passwordHash,
    timezone: 'Asia/Kolkata',
  });
  assert.ok(createdUser.id, 'User ID should be generated');

  // Step 2: Login and generate session
  console.log('2. Verifying credentials and signing session token...');
  const foundUser = await findUserByEmail(testEmail);
  assert.ok(foundUser, 'User should be found in DB');
  const passwordMatches = await comparePassword(rawPassword, foundUser.passwordHash);
  assert.strictEqual(passwordMatches, true, 'Password must match');

  const sessionToken = signToken({
    userId: foundUser.id,
    email: foundUser.email,
    name: foundUser.name,
    timezone: foundUser.timezone,
  });
  assert.ok(sessionToken, 'JWT session token must be created');

  // Step 3: Create Tasks
  console.log('3. Creating tasks with Alarm and Notification modes...');
  const t1 = await createTask({
    userId: foundUser.id,
    title: 'Submit NPTEL assignment',
    category: 'College & Education',
    dueDate: new Date(2026, 9, 23, 17, 0),
    dueTime: '17:00',
    alertMode: 'ALARM',
    reminders: [{ remindAt: new Date(2026, 9, 23, 16, 45), advanceMinutes: 15, alertMode: 'ALARM' }],
  });

  const t2 = await createTask({
    userId: foundUser.id,
    title: 'Buy Milk & Groceries',
    category: 'Shopping',
    dueDate: new Date(2026, 9, 12, 10, 0),
    dueTime: '10:00',
    alertMode: 'NOTIFICATION',
    reminders: [{ remindAt: new Date(2026, 9, 12, 10, 0), advanceMinutes: 0, alertMode: 'NOTIFICATION' }],
  });

  const t3 = await createTask({
    userId: foundUser.id,
    title: 'Call Doctor for Appointment',
    category: 'Family & Personal',
    dueDate: new Date(2026, 9, 15, 11, 0),
    dueTime: '11:00',
    alertMode: 'ALARM',
  });

  const initialTasks = await getUserTasks(foundUser.id);
  assert.strictEqual(initialTasks.length, 3, 'Should have exactly 3 tasks');

  // Step 4: Edit Task 1
  console.log('4. Editing task 1...');
  const updatedT1 = await updateTask(t1.id, foundUser.id, {
    title: 'Submit NPTEL Final Assignment (Graded)',
    priority: 'HIGH',
    alertMode: 'ALARM',
  });
  assert.strictEqual(updatedT1.title, 'Submit NPTEL Final Assignment (Graded)');

  // Step 5: Delete Task 2
  console.log('5. Deleting task 2...');
  const deleteResult = await deleteTask(t2.id, foundUser.id);
  assert.strictEqual(deleteResult.success, true);

  // Step 6: Verify after simulating page refresh
  console.log('6. Simulating page refresh (querying with existing session)...');
  const refreshedTasks = await getUserTasks(foundUser.id);
  assert.strictEqual(refreshedTasks.length, 2, 'Should have 2 tasks remaining');
  const foundT1 = refreshedTasks.find((t: any) => t.id === t1.id);
  assert.ok(foundT1);
  assert.strictEqual(foundT1.title, 'Submit NPTEL Final Assignment (Graded)');
  const foundT2 = refreshedTasks.find((t: any) => t.id === t2.id);
  assert.strictEqual(foundT2, undefined, 'Deleted task 2 must not exist');

  // Step 7: Simulate Logout & Re-login
  console.log('7. Simulating logout & fresh re-login...');
  // Verify token decoding
  const decoded = verifyToken(sessionToken);
  assert.strictEqual(decoded.userId, foundUser.id);

  // Fresh login query from DB
  const reLoginUser = await findUserByEmail(testEmail);
  assert.ok(reLoginUser, 'User must exist upon re-login');
  const reLoginTasks = await getUserTasks(reLoginUser.id);
  assert.strictEqual(reLoginTasks.length, 2, 'All tasks must persist after re-login');
  assert.strictEqual(reLoginTasks.some((t: any) => t.title.includes('NPTEL Final')), true);
  assert.strictEqual(reLoginTasks.some((t: any) => t.title.includes('Call Doctor')), true);

  console.log('\n✅ PERSISTENCE CYCLE PASSED: Register, Login, Task Create, Edit, Delete, Refresh, Logout, and Re-login verified successfully!\n');
}

testPersistenceCycle().catch((err) => {
  console.error('❌ Persistence cycle failed:', err);
  process.exit(1);
});
