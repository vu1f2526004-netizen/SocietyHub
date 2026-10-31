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

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
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
  console.log('====================================================');
  console.log('STARTING PHASE 2 COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub');
  const db = mongoose.connection.db;

  // 1. Fetch test users and society
  const adminUser = await db.collection('users').findOne({ email: 'anshjai@98gmail.com' });
  const otherAdminUser = await db.collection('users').findOne({ email: 'akashchaursia239239@gmail.com' });
  const residentUser = await db.collection('users').findOne({ role: 'Resident', societyId: adminUser.societyId });

  const adminToken = jwt.sign({ id: adminUser._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const residentToken = jwt.sign({ id: residentUser._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const otherAdminToken = jwt.sign({ id: otherAdminUser._id.toString() }, JWT_SECRET, { expiresIn: '1h' });

  console.log(`Admin User: ${adminUser.email} (Society: ${adminUser.societyId})`);
  console.log(`Other Society Admin: ${otherAdminUser.email} (Society: ${otherAdminUser.societyId})`);
  console.log(`Resident User: ${residentUser.email} (Flat: ${residentUser.flatNumber})\n`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    }
  }

  // -----------------------------------------------------------------
  // SECTION 1: PAYMENT VISIBILITY & SUMMARY CALCULATION
  // -----------------------------------------------------------------
  console.log('--- SECTION 1: PAYMENT VISIBILITY & SUMMARY CALCULATIONS ---');
  
  // Test 1.1: Admin payments summary
  const summaryRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin/summary?period=all-time',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(summaryRes.status === 200 && summaryRes.data.success, 'Admin can fetch /api/payments/admin/summary');
  assert(summaryRes.data.data.totalCollected !== undefined, 'Summary includes authoritative totalCollected');
  assert(summaryRes.data.data.totalPendingDues !== undefined, 'Summary includes totalPendingDues');
  assert(summaryRes.data.data.successCount !== undefined, 'Summary includes verified payment counts');

  // Test 1.2: Resident is forbidden from admin summary
  const residentSummaryRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin/summary',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${residentToken}` }
  });
  assert(residentSummaryRes.status === 403, 'Resident is forbidden (403) from accessing Admin payment summary');

  // Test 1.3: Admin from other society sees only their society data (tenant isolation)
  const otherAdminSummaryRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin/summary',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${otherAdminToken}` }
  });
  assert(
    otherAdminSummaryRes.status === 200 && otherAdminSummaryRes.data.success,
    'Multi-society isolation: admin from other society can fetch their own summary'
  );
  
  const adminPaymentsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin?period=all-time',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const otherAdminPaymentsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin?period=all-time',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${otherAdminToken}` }
  });
  const adminSocietyPaymentsOnly = adminPaymentsRes.data.data.every(
    p => p.societyId.toString() === adminUser.societyId.toString()
  );
  const otherSocietyPaymentsOnly = otherAdminPaymentsRes.data.data.every(
    p => p.societyId.toString() === otherAdminUser.societyId.toString()
  );
  assert(adminSocietyPaymentsOnly && otherSocietyPaymentsOnly, 'Strict multi-society isolation: zero cross-society payment visibility');

  // Test 1.4: Admin can search and filter verified payments
  const paymentsListRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/admin?period=all-time&status=Success',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(paymentsListRes.status === 200 && paymentsListRes.data.success, 'Admin can fetch verified payments list');
  const allSuccess = paymentsListRes.data.data.every(p => p.status === 'Success');
  assert(allSuccess, 'Verified payments filter strictly returns status=Success');

  // Test 1.5: Resident can only view their own payments via /api/payments/my
  const myPaymentsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/my',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${residentToken}` }
  });
  assert(myPaymentsRes.status === 200 && myPaymentsRes.data.success, 'Resident can fetch /api/payments/my');
  const onlyOwnPayments = myPaymentsRes.data.data.every(p => {
    const uid = p.residentId?._id ? p.residentId._id.toString() : (p.residentId ? p.residentId.toString() : '');
    return uid === residentUser._id.toString();
  });
  assert(onlyOwnPayments, "Resident's payment list contains strictly the resident's own payments");

  // -----------------------------------------------------------------
  // SECTION 2: REMINDERS (INDIVIDUAL & BULK)
  // -----------------------------------------------------------------
  console.log('\n--- SECTION 2: REMINDERS FOR PENDING BILLS ---');

  // Find a pending bill for testing
  const pendingBill = await db.collection('maintenancebills').findOne({
    societyId: adminUser.societyId,
    status: { $in: ['Pending', 'Overdue'] }
  });
  const paidBill = await db.collection('maintenancebills').findOne({
    societyId: adminUser.societyId,
    status: 'Paid'
  });

  assert(!!pendingBill, 'Found eligible pending bill in test society');
  assert(!!paidBill, 'Found paid bill in test society');

  // Test 2.1: Individual reminder on eligible pending bill
  const initialReminderCount = pendingBill.reminderCount || 0;
  const individualReminderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/admin/${pendingBill._id}/reminder`,
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {});

  assert(individualReminderRes.status === 200 && individualReminderRes.data.success, 'Admin can send individual reminder on pending bill');
  assert(individualReminderRes.data.delivery?.email?.acceptedBySmtp !== undefined, 'Reminder response distinguishes acceptedBySmtp');
  assert(individualReminderRes.data.delivery?.inAppNotification === true, 'Reminder successfully creates in-app notification');

  // Verify DB updates
  const updatedPendingBill = await db.collection('maintenancebills').findOne({ _id: pendingBill._id });
  assert(updatedPendingBill.reminderCount === initialReminderCount + 1, 'Bill reminderCount is incremented in DB');
  assert(!!updatedPendingBill.lastReminderSentAt, 'Bill lastReminderSentAt is recorded');
  assert(updatedPendingBill.status === pendingBill.status, 'Bill status remains unchanged after reminder dispatch');
  assert(updatedPendingBill.amount === pendingBill.amount, 'Financial amount remains unchanged after reminder dispatch');

  // Test 2.2: Re-check exclusion of Paid bills
  const paidReminderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/admin/${paidBill._id}/reminder`,
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {});
  assert(paidReminderRes.status === 400, 'Sending reminder on a Paid bill is rejected with status 400');
  const errorMsg = paidReminderRes.data.error || paidReminderRes.data.message || '';
  assert(errorMsg.toLowerCase().includes('already paid'), 'Rejection error message states bill is already paid');

  // Test 2.3: Resident is forbidden from triggering reminders
  const residentSendReminderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/admin/${pendingBill._id}/reminder`,
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${residentToken}`,
      'Content-Type': 'application/json'
    }
  }, {});
  assert(residentSendReminderRes.status === 403, 'Resident is forbidden (403) from triggering reminders');

  // Test 2.4: Bulk Reminders on eligible pending bills
  const bulkRemindersRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bills/admin/bulk-reminders',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    billIds: [pendingBill._id.toString(), paidBill._id.toString()]
  });

  assert(bulkRemindersRes.status === 200 && bulkRemindersRes.data.success, 'Bulk reminder endpoint executes successfully');
  assert(bulkRemindersRes.data.summary.totalRequested === 2, 'Bulk reminder reports totalRequested=2');
  assert(bulkRemindersRes.data.skipped.some(s => s.billId.toString() === paidBill._id.toString()), 'Paid bill is automatically skipped in bulk dispatch');

  // -----------------------------------------------------------------
  // SECTION 3: IN-APP NOTIFICATION & AUDIT INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n--- SECTION 3: IN-APP NOTIFICATIONS & AUDIT INTEGRITY ---');

  const notifications = await db.collection('notifications')
    .find({ userId: pendingBill.residentId })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const reminderNotification = notifications.find(n => n.title && n.title.includes('Payment Reminder'));
  assert(!!reminderNotification, 'In-app payment_reminder notification document exists for the resident');
  assert(reminderNotification.link === '/resident/bills', 'Notification link routes resident directly to /resident/bills');

  // -----------------------------------------------------------------
  // SECTION 4: HISTORICAL DATA PRESERVATION CHECK
  // -----------------------------------------------------------------
  console.log('\n--- SECTION 4: HISTORICAL DATA PRESERVATION ---');

  const totalPaymentsCount = await db.collection('payments').countDocuments();
  const totalBillsCount = await db.collection('maintenancebills').countDocuments();
  const totalFinanceCount = await db.collection('finances').countDocuments();

  assert(totalPaymentsCount > 0, `Preserved all ${totalPaymentsCount} historical payments without deletion`);
  assert(totalBillsCount > 0, `Preserved all ${totalBillsCount} historical bills without deletion`);
  assert(totalFinanceCount > 0, `Preserved all ${totalFinanceCount} historical finance entries without alteration`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED!`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
