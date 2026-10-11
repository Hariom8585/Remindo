import https from 'https';

async function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { ...options.headers };
    let payload = null;
    if (data) {
      payload = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(u, {
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const BASE_URL = 'https://remindo-alpha.vercel.app';
  console.log(`[TEST 1] Testing Homepage at ${BASE_URL}...`);
  const home = await request(`${BASE_URL}/`);
  console.log(`Homepage Status: ${home.status} (Expected: 200)`);

  console.log('\n[TEST 2] Testing User Registration...');
  const testEmail = `test_${Date.now()}@remindo.app`;
  const regRes = await request(`${BASE_URL}/api/auth/register`, { method: 'POST' }, {
    name: 'Live Tester',
    email: testEmail,
    password: 'Password123!',
  });
  console.log(`Registration Status: ${regRes.status}`);
  let cookie = '';
  if (regRes.headers['set-cookie']) {
    cookie = regRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
    console.log('Session Cookie received successfully.');
  }
  const regData = JSON.parse(regRes.body);
  console.log('Registration Response:', JSON.stringify(regData));

  console.log('\n[TEST 3] Testing Session & DB Status (/api/auth/me)...');
  const meRes = await request(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  console.log(`Auth Me Status: ${meRes.status}`);
  const meData = JSON.parse(meRes.body);
  console.log('User info:', meData.user?.email);
  console.log('Database Status:', JSON.stringify(meData.databaseStatus));

  console.log('\n[TEST 4] Testing Task Creation with Sound Alarm (/api/tasks)...');
  const taskRes = await request(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { Cookie: cookie },
  }, {
    title: 'Submit College Assignment on Friday',
    category: 'College & Education',
    priority: 'HIGH',
    dueDate: '2026-10-16',
    dueTime: '17:00',
    alertMode: 'ALARM',
  });
  console.log(`Task Creation Status: ${taskRes.status}`);
  const taskData = JSON.parse(taskRes.body);
  console.log('Created Task ID:', taskData.task?.id);
  console.log('Task Alert Mode:', taskData.task?.alertMode);

  console.log('\n[TEST 5] Testing AI Natural Language Task Parsing (/api/ai/parse-task)...');
  const aiRes = await request(`${BASE_URL}/api/ai/parse-task`, {
    method: 'POST',
    headers: { Cookie: cookie },
  }, {
    input: 'Remind me tomorrow at 6 PM to pay electricity bill',
  });
  console.log(`AI Parse Status: ${aiRes.status}`);
  const aiData = JSON.parse(aiRes.body);
  console.log('Parsed Task Result:', JSON.stringify(aiData.result));

  console.log('\n--- ALL LIVE TESTS COMPLETED ---');
}

main().catch(console.error);
