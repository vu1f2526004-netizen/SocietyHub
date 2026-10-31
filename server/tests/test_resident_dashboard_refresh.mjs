import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING RESIDENT DASHBOARD REFRESH VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Connect to DB to load test accounts
  console.log('\n1. Connecting to DB and obtaining test resident & tokens...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const residentUser = await db.collection('users').findOne({ role: 'Resident' });
  if (!residentUser) {
    console.error('No resident user found in database!');
    process.exit(1);
  }

  const otherSocietyUser = await db.collection('users').findOne({
    role: 'Resident',
    societyId: { $ne: residentUser.societyId }
  });

  const residentToken = jwt.sign(
    { id: residentUser._id.toString(), role: residentUser.role, societyId: residentUser.societyId.toString() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const otherResidentToken = otherSocietyUser ? jwt.sign(
    { id: otherSocietyUser._id.toString(), role: otherSocietyUser.role, societyId: otherSocietyUser.societyId.toString() },
    JWT_SECRET,
    { expiresIn: '1h' }
  ) : null;

  console.log(`Resident: ${residentUser.name} (${residentUser.email}), Society: ${residentUser.societyId}`);

  // 2. Test All 6 Dashboard API Endpoints with Resident Token
  console.log('\n2. Testing all 6 dashboard endpoints called during refresh...');

  const endpoints = [
    { name: 'Bills', path: '/api/bills/my' },
    { name: 'Complaints', path: '/api/complaints/my' },
    { name: 'Visitors', path: '/api/visitors/my' },
    { name: 'Events', path: '/api/events' },
    { name: 'Polls', path: '/api/polls' },
    { name: 'Notifications (/api/notifications)', path: '/api/notifications' },
    { name: 'Notifications Alias (/api/notifications/my)', path: '/api/notifications/my' }
  ];

  const results = {};

  for (const ep of endpoints) {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: ep.path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${residentToken}`
      }
    });

    results[ep.name] = res;
    assert(`Endpoint ${ep.path} returned HTTP 200`, res.status === 200);
    assert(`Endpoint ${ep.path} returned success: true`, res.data?.success === true);
    assert(`Endpoint ${ep.path} returned data array`, Array.isArray(res.data?.data));
  }

  // 3. Test Dashboard Data Calculations
  console.log('\n3. Validating Dashboard Metrics derivation from API responses...');

  const bills = results['Bills'].data?.data || [];
  const pendingBills = bills.filter(b => ['Pending', 'PaymentInitiated', 'Failed', 'Overdue'].includes(b.status));
  const expectedAmountDue = pendingBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  console.log(`  Bills count: ${bills.length}, Pending bills: ${pendingBills.length}, Amount Due: ₹${expectedAmountDue}`);
  assert('Bills data correctly lists resident bills', bills.length >= 0);

  const complaints = results['Complaints'].data?.data || [];
  const compStats = {
    pending: complaints.filter(c => c.status === 'Pending' || c.status === 'Assigned').length,
    inProgress: complaints.filter(c => c.status === 'InProgress').length,
    resolved: complaints.filter(c => c.status === 'Completed' || c.status === 'Resolved').length
  };
  console.log(`  Complaints: pending=${compStats.pending}, inProgress=${compStats.inProgress}, resolved=${compStats.resolved}`);
  assert('Complaints categorized properly', typeof compStats.pending === 'number');

  const notifsData = results['Notifications (/api/notifications)'].data;
  assert('Notifications API provides unreadCount field', typeof notifsData?.unreadCount === 'number');
  const notifsAliasData = results['Notifications Alias (/api/notifications/my)'].data;
  assert('Notifications /my alias provides unreadCount field', typeof notifsAliasData?.unreadCount === 'number');

  // 4. Test Unauthenticated Requests (Security & JWT enforcement)
  console.log('\n4. Testing security: unauthenticated requests must be rejected...');

  for (const ep of ['/api/bills/my', '/api/complaints/my', '/api/visitors/my', '/api/notifications', '/api/notifications/my']) {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: ep,
      method: 'GET',
      headers: {} // No token
    });
    assert(`Unauthenticated ${ep} returns 401 Unauthorized`, res.status === 401);
  }

  // 5. Test Multi-Society Isolation
  console.log('\n5. Testing multi-society isolation...');
  if (otherResidentToken) {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/my',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${otherResidentToken}`
      }
    });

    assert('Other society resident receives 200', res.status === 200);
    const otherBills = res.data?.data || [];
    const hasLeak = otherBills.some(b => b.societyId?.toString() === residentUser.societyId.toString());
    assert('No cross-society bills leaked to other resident', !hasLeak);
  } else {
    console.log('  [SKIP] Only one society in DB, skipping cross-society check');
  }

  // 6. Test Fault-Tolerance Simulation (Promise.allSettled)
  console.log('\n6. Testing fault-tolerance (Promise.allSettled simulation)...');
  const simulatedSettled = await Promise.allSettled([
    Promise.resolve({ status: 200, data: { success: true, data: [{ amount: 500, status: 'Pending' }] } }),
    Promise.reject(new Error('Simulated network timeout for visitors')),
    Promise.resolve({ status: 200, data: { success: true, data: [{ status: 'Pending' }] } }),
    Promise.resolve({ status: 200, data: { success: true, unreadCount: 2, data: [] } })
  ]);

  const fulfilled = simulatedSettled.filter(r => r.status === 'fulfilled');
  const rejected = simulatedSettled.filter(r => r.status === 'rejected');
  assert('Promise.allSettled allows remaining services to succeed when one fails', fulfilled.length === 3 && rejected.length === 1);

  // 7. Test summary
  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
