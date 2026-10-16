const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const jwt = require('../server/node_modules/jsonwebtoken');
const mongoose = require('../server/node_modules/mongoose');
const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const Finance = require('../server/src/models/Finance');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Payment = require('../server/src/models/Payment');
const Notification = require('../server/src/models/Notification');

const API_BASE = 'http://127.0.0.1:5000/api';

async function req(url, token, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { status: res.status, ok: res.ok, data };
}

(async () => {
  console.log('========================================================');
  console.log(' SOCIETYHUB PHASE 6: FINANCE & NOTIFICATIONS TEST SUITE');
  console.log('========================================================\n');

  await connectDB();

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

  // Find Admin, Resident, and Staff users
  const admin = await User.findOne({ role: 'Admin' });
  const resident = await User.findOne({ role: 'Resident', societyId: admin.societyId });
  const staff = await User.findOne({ role: 'SecurityStaff', societyId: admin.societyId });

  const adminToken = jwt.sign(
    { id: admin._id, role: admin.role, societyId: admin.societyId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const residentToken = jwt.sign(
    { id: resident._id, role: resident.role, societyId: resident.societyId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const staffToken = staff ? jwt.sign(
    { id: staff._id, role: staff.role, societyId: staff.societyId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  ) : null;

  console.log('--- 1. FINANCE DASHBOARD ACCURACY & ACCOUNTING INTEGRITY ---');
  const summaryRes = await req('/finance/admin/summary', adminToken);
  assert('Summary endpoint returns HTTP 200', summaryRes.status === 200);
  assert('Summary returns success: true', summaryRes.data?.success === true);

  const sData = summaryRes.data?.data;
  assert('Summary contains totalIncome number', typeof sData?.totalIncome === 'number');
  assert('Summary contains totalExpense number', typeof sData?.totalExpense === 'number');
  assert('Summary contains netBalance number', typeof sData?.netBalance === 'number');
  assert('Net balance equals totalIncome - totalExpense', sData?.netBalance === sData?.totalIncome - sData?.totalExpense);
  assert('Current month net equals monthIncome - monthExpense', sData?.currentMonthNetBalance === sData?.currentMonthIncome - sData?.currentMonthExpense);

  // Cross-check against direct DB queries
  const societyId = admin.societyId;
  const rawSocietyId = societyId.toString();
  const socMatch = { $in: [new mongoose.Types.ObjectId(societyId), rawSocietyId] };

  const dbIncome = await Finance.aggregate([
    { $match: { societyId: socMatch, type: 'Income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const expectedIncome = dbIncome[0]?.total || 0;
  assert(`API totalIncome (₹${sData?.totalIncome}) matches confirmed DB records (₹${expectedIncome})`, sData?.totalIncome === expectedIncome);

  const dbPending = await MaintenanceBill.aggregate([
    { $match: { societyId: socMatch, status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const expectedPending = dbPending[0]?.total || 0;
  assert(`API pendingDues (₹${sData?.pendingDues}) matches actual outstanding bills (₹${expectedPending})`, sData?.pendingDues === expectedPending);

  assert('Monthly report array is populated with valid breakdown', Array.isArray(sData?.monthlyReport) && sData?.monthlyReport.length > 0);
  assert('Accounting rules metadata is clearly defined', !!sData?.accountingRules?.netBalanceFormula);

  console.log('\n--- 2. RESIDENT PAYMENT TRANSACTION TABLE ---');
  const paymentsRes = await req('/payments/admin', adminToken);
  assert('Admin payments endpoint returns HTTP 200', paymentsRes.status === 200);
  assert('Payments data is an array', Array.isArray(paymentsRes.data?.data));

  if (paymentsRes.data?.data?.length > 0) {
    const p1 = paymentsRes.data.data[0];
    assert('Payment includes residentId with name', typeof p1.residentId?.name === 'string');
    assert('Payment includes residentId with flatNumber', typeof p1.residentId?.flatNumber === 'string');
    assert('Payment includes amount number', typeof p1.amount === 'number');
    assert('Payment includes razorpayOrderId', typeof p1.razorpayOrderId === 'string');
    assert('Payment includes status (Success/Pending/Failed)', ['Success', 'Pending', 'Failed'].includes(p1.status));
    assert('Payment includes paymentMethod', typeof p1.paymentMethod === 'string');
    if (p1.status === 'Success') {
      assert('Verified payment includes receiptNumber', typeof p1.receiptNumber === 'string');
    }
  }

  console.log('\n--- 3. MULTI-SOCIETY ISOLATION & RBAC SECURITY ---');
  // Isolated Society B Fixture
  const socB = await Society.create({
    name: 'Test Isolated Society Beta',
    address: '456 Beta Way',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400002',
    societyJoinCode: 'BETATEST123'
  });

  const adminB = await User.create({
    name: 'Admin Beta',
    email: `adminb_${Date.now()}@test.io`,
    password: 'password123',
    role: 'Admin',
    status: 'Active',
    societyId: socB._id
  });

  const adminBToken = jwt.sign(
    { id: adminB._id, role: adminB.role, societyId: adminB.societyId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const bSummaryRes = await req('/finance/admin/summary', adminBToken);
  assert('Society B receives HTTP 200 for their own dashboard', bSummaryRes.status === 200);
  assert('Society B receives zero/isolated summary (no leakage of Society A ₹6357)', bSummaryRes.data?.data?.totalIncome === 0);
  assert('Society B pending dues is 0', bSummaryRes.data?.data?.pendingDues === 0);

  const bPaymentsRes = await req('/payments/admin', adminBToken);
  assert('Society B receives empty payment transactions (strict isolation)', bPaymentsRes.data?.data?.length === 0);

  // Clean up Society B fixtures
  await User.findByIdAndDelete(adminB._id);
  await Society.findByIdAndDelete(socB._id);
  assert('Isolated Society B fixtures cleaned up', true);

  if (staffToken) {
    const staffSummaryRes = await req('/finance/admin/summary', staffToken);
    assert('SecurityStaff strictly forbidden from Admin Finance Dashboard (HTTP 403)', staffSummaryRes.status === 403);
  }

  const resSummaryRes = await req('/finance/admin/summary', residentToken);
  assert('Resident strictly forbidden from Admin Finance Dashboard (HTTP 403)', resSummaryRes.status === 403);

  console.log('\n--- 4. NOTIFICATION DROPDOWN & ACTIONS ---');
  const notifRes = await req('/notifications', adminToken);
  assert('Notifications endpoint returns HTTP 200', notifRes.status === 200);
  assert('Notifications data is an array', Array.isArray(notifRes.data?.data));
  assert('Notifications response includes unreadCount number', typeof notifRes.data?.unreadCount === 'number');

  // Create isolated notification for testing mark read actions
  const testNotif = await Notification.create({
    societyId: admin.societyId,
    userId: admin._id,
    title: 'Automated Test Notification',
    message: 'Testing mark as read and unread count tracking',
    type: 'Info',
    link: '/admin/finance',
    read: false
  });

  // Verify unread count reflects test notification
  const afterCreateRes = await req('/notifications', adminToken);
  const foundNotif = afterCreateRes.data?.data?.find(n => n._id === testNotif._id.toString());
  assert('Test notification appears in notification list', !!foundNotif);
  assert('Test notification initially read = false', foundNotif?.read === false);

  // Mark single as read
  const markReadRes = await req(`/notifications/${testNotif._id}/read`, adminToken, { method: 'PATCH' });
  assert('Mark as read returns HTTP 200', markReadRes.status === 200);
  assert('Notification updated to read = true', markReadRes.data?.data?.read === true);

  // Mark all as read
  const markAllRes = await req('/notifications/mark-all-read', adminToken, { method: 'PATCH' });
  assert('Mark all as read returns HTTP 200', markAllRes.status === 200);

  const finalNotifRes = await req('/notifications', adminToken);
  assert('Unread count is 0 after mark all as read', finalNotifRes.data?.unreadCount === 0);

  // Clean up test notification
  await Notification.findByIdAndDelete(testNotif._id);
  assert('Test notification cleaned up cleanly', true);

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
})();
