import http from 'http';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const API_PORT = process.env.PORT || 5000;

function httpRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING FINANCE DASHBOARD & PAYMENT HISTORY BUGFIX TESTS ===\n');

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  // Find an active admin
  const adminUser = await db.collection('users').findOne({ role: 'Admin', status: 'Active' });
  if (!adminUser) {
    throw new Error('No active admin user found in database');
  }

  // Find another society admin for cross-society test
  const otherAdmin = await db.collection('users').findOne({
    role: 'Admin',
    societyId: { $ne: adminUser.societyId }
  });

  const adminToken = jwt.sign({ id: adminUser._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const otherToken = otherAdmin ? jwt.sign({ id: otherAdmin._id.toString() }, JWT_SECRET, { expiresIn: '1h' }) : null;

  const authHeader = { Authorization: `Bearer ${adminToken}` };
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // TEST 1: BUG 3 FIX — GET /api/finance/admin/ledger?search=aman does NOT throw "User is not defined"
  console.log('\n--- BUG 3: "User is not defined" Fix Verification ---');
  const ledgerSearchRes = await httpRequest('/api/finance/admin/ledger?search=aman', 'GET', authHeader);
  assert(ledgerSearchRes.status === 200, `ledger search returns 200 (got ${ledgerSearchRes.status})`);
  assert(ledgerSearchRes.body?.success === true, 'ledger search returns success: true');
  assert(!JSON.stringify(ledgerSearchRes.body).includes('User is not defined'), 'no "User is not defined" error in response');

  // Regex special characters do not crash
  const ledgerRegexRes = await httpRequest('/api/finance/admin/ledger?search=aman(', 'GET', authHeader);
  assert(ledgerRegexRes.status === 200, 'search with special characters "( " returns 200 instead of 500');

  // TEST 2: BUG 2 FIX — Payment History Search
  console.log('\n--- BUG 2: Payment History Search Accuracy ---');
  const paySearchRes = await httpRequest('/api/payments/admin?search=aman', 'GET', authHeader);
  assert(paySearchRes.status === 200, `payments search returns 200 (got ${paySearchRes.status})`);
  const matchingPayments = paySearchRes.body?.data || [];
  assert(matchingPayments.length > 0, `found ${matchingPayments.length} payments matching "aman"`);

  // Ensure NO records for resident "jayyesh" are returned when searching "aman"
  const hasJayyesh = matchingPayments.some(p => {
    const rName = (p.residentId?.name || '').toLowerCase();
    const rEmail = (p.residentId?.email || '').toLowerCase();
    return rName.includes('jayyesh') || rEmail.includes('jayyesh');
  });
  assert(!hasJayyesh, 'zero records for resident "jayyesh" when searching "aman"');

  // Ensure every returned record actually matches "aman" in supported fields
  const allMatchAman = matchingPayments.every(p => {
    const q = 'aman';
    const rName = (p.residentId?.name || '').toLowerCase();
    const rEmail = (p.residentId?.email || '').toLowerCase();
    const flat = (p.residentId?.flatNumber || '').toLowerCase();
    const receipt = (p.receiptNumber || '').toLowerCase();
    const payId = (p.razorpayPaymentId || '').toLowerCase();
    const ordId = (p.razorpayOrderId || '').toLowerCase();
    const billMonth = (p.billId?.month || '').toLowerCase();
    const billDesc = (p.billId?.description || '').toLowerCase();
    return rName.includes(q) || rEmail.includes(q) || flat.includes(q) || receipt.includes(q) || payId.includes(q) || ordId.includes(q) || billMonth.includes(q) || billDesc.includes(q);
  });
  assert(allMatchAman, 'all returned records match "aman" in a valid searchable field');

  // Test clearing search restores records
  const allPaymentsRes = await httpRequest('/api/payments/admin', 'GET', authHeader);
  assert(allPaymentsRes.status === 200, 'cleared search (empty) returns 200');
  assert(allPaymentsRes.body?.totalCount >= matchingPayments.length, `cleared search totalCount (${allPaymentsRes.body?.totalCount}) >= filtered count (${matchingPayments.length})`);

  // Non-matching search returns 0 records
  const emptySearchRes = await httpRequest('/api/payments/admin?search=nonexistentxyz123456789', 'GET', authHeader);
  assert(emptySearchRes.status === 200, 'non-matching search returns 200');
  assert((emptySearchRes.body?.data || []).length === 0, 'non-matching search returns exactly 0 records');

  // TEST 3: BUG 1 FIX — January 2026 Filter
  console.log('\n--- BUG 1: January Filter vs October Data ---');
  const janSummaryRes = await httpRequest('/api/finance/admin/summary?period=month&month=2026-01&year=2026', 'GET', authHeader);
  assert(janSummaryRes.status === 200, `january summary returns 200 (got ${janSummaryRes.status})`);
  assert(janSummaryRes.body?.data?.periodSummary?.periodLabel === 'January 2026', `periodLabel is exactly "January 2026" (got "${janSummaryRes.body?.data?.periodSummary?.periodLabel}")`);
  assert(janSummaryRes.body?.data?.periodSummary?.totalIncome === 0, 'period income for January 2026 is 0');
  assert(janSummaryRes.body?.data?.periodSummary?.totalExpense === 0, 'period expense for January 2026 is 0');
  assert(janSummaryRes.body?.data?.periodSummary?.successfulTransactionsCount === 0, 'period verified transactions for January 2026 is 0');

  // Monthly Report includes January 2026
  const monthlyReport = janSummaryRes.body?.data?.monthlyReport || [];
  const hasJanInReport = monthlyReport.some(m => m.month === '2026-01');
  assert(hasJanInReport, 'historical monthlyReport breakdown includes "2026-01"');

  // Lifetime / All-Time metrics remain separate and unaffected
  const lifetime = janSummaryRes.body?.data?.lifetimeSummary;
  assert(lifetime?.totalIncome !== undefined, 'lifetimeSummary.totalIncome is present');
  assert(lifetime?.totalIncome > 0, `lifetimeSummary is non-zero (all-time preserved: ₹${lifetime?.totalIncome})`);

  // January payments list
  const janPaymentsRes = await httpRequest('/api/payments/admin?period=month&month=2026-01&year=2026', 'GET', authHeader);
  assert(janPaymentsRes.status === 200, 'january payments list returns 200');
  assert((janPaymentsRes.body?.data || []).length === 0, 'january payments list has 0 records (empty state)');

  // TEST 4: Multi-Society Isolation
  console.log('\n--- Security: Multi-Society Isolation ---');
  if (otherToken) {
    const otherPaymentsRes = await httpRequest('/api/payments/admin', 'GET', { Authorization: `Bearer ${otherToken}` });
    const otherPayments = otherPaymentsRes.body?.data || [];
    const leaked = otherPayments.some(p => p.societyId.toString() === adminUser.societyId.toString());
    assert(!leaked, 'other society admin cannot access current society payments');
  } else {
    console.log('[SKIP] Only one society in DB, skipping cross-society check');
  }

  await client.close();

  console.log(`\n=== TEST RESULTS: ${passed}/${total} PASSED ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
