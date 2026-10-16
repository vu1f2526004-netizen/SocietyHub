const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Flat = require('../server/src/models/Flat');
const Society = require('../server/src/models/Society');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Payment = require('../server/src/models/Payment');
const Finance = require('../server/src/models/Finance');
const Notification = require('../server/src/models/Notification');

function makeRequest(options, postData = null) {
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
      if (typeof postData === 'string') {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

(async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  };

  console.log('========================================================');
  console.log('SOCIETYHUB BULK MONTHLY MAINTENANCE BILLING TEST SUITE');
  console.log('========================================================');

  await connectDB();

  const timestamp = Date.now();
  let societyA, societyB;
  let adminA, adminB, residentA1, residentA2, residentA3_1, residentA3_2, residentA4_pending, residentB1;
  let flatA1, flatA2, flatA3, flatA4, flatA5_vacant, flatB1;
  let tokenAdminA, tokenAdminB, tokenResidentA1, tokenResidentB1, tokenStaff;

  try {
    console.log('\nSetting up isolated multi-society test fixtures...');

    // 1. Create Societies
    societyA = await Society.create({
      name: `Test Bulk Billing Society A ${timestamp}`,
      address: '100 Alpha Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001'
    });

    societyB = await Society.create({
      name: `Test Bulk Billing Society B ${timestamp}`,
      address: '200 Beta Enclave',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001'
    });

    // 2. Create Users
    adminA = await User.create({
      name: 'Admin Alpha',
      email: `admin.alpha.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Admin',
      status: 'Active',
      societyId: societyA._id
    });

    adminB = await User.create({
      name: 'Admin Beta',
      email: `admin.beta.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Admin',
      status: 'Active',
      societyId: societyB._id
    });

    const staffA = await User.create({
      name: 'Security Alpha',
      email: `security.alpha.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'SecurityStaff',
      status: 'Active',
      societyId: societyA._id
    });

    // Resident A1: Eligible (Flat 101)
    residentA1 = await User.create({
      name: 'Resident A1',
      email: `resident.a1.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      flatNumber: '101',
      societyId: societyA._id
    });

    // Resident A2: Eligible (Flat 102)
    residentA2 = await User.create({
      name: 'Resident A2',
      email: `resident.a2.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      flatNumber: '102',
      societyId: societyA._id
    });

    // Resident A3_1 & A3_2: Ambiguous (Two active residents in Flat 103)
    residentA3_1 = await User.create({
      name: 'Resident A3 One',
      email: `resident.a3.1.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      flatNumber: '103',
      societyId: societyA._id
    });

    residentA3_2 = await User.create({
      name: 'Resident A3 Two',
      email: `resident.a3.2.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      flatNumber: '103',
      societyId: societyA._id
    });

    // Resident A4: Inactive account in Flat 104
    residentA4_pending = await User.create({
      name: 'Resident A4 Pending',
      email: `resident.a4.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'PendingApproval',
      flatNumber: '104',
      societyId: societyA._id
    });

    // Resident B1 in Society B
    residentB1 = await User.create({
      name: 'Resident Beta 1',
      email: `resident.b1.${timestamp}@testbilling.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      flatNumber: '201',
      societyId: societyB._id
    });

    // 3. Create Flat Records
    flatA1 = await Flat.create({
      societyId: societyA._id,
      block: 'A',
      number: '101',
      occupants: [residentA1._id]
    });

    flatA2 = await Flat.create({
      societyId: societyA._id,
      block: 'A',
      number: '102',
      occupants: [residentA2._id]
    });

    flatA3 = await Flat.create({
      societyId: societyA._id,
      block: 'A',
      number: '103',
      occupants: [residentA3_1._id, residentA3_2._id] // Ambiguous: 2 active residents
    });

    flatA4 = await Flat.create({
      societyId: societyA._id,
      block: 'A',
      number: '104',
      occupants: [residentA4_pending._id] // Inactive occupant
    });

    flatA5_vacant = await Flat.create({
      societyId: societyA._id,
      block: 'A',
      number: '105',
      occupants: [] // Vacant flat
    });

    flatB1 = await Flat.create({
      societyId: societyB._id,
      block: 'B',
      number: '201',
      occupants: [residentB1._id]
    });

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    tokenAdminA = jwt.sign({ id: adminA._id, role: adminA.role, societyId: societyA._id }, jwtSecret, { expiresIn: '1h' });
    tokenAdminB = jwt.sign({ id: adminB._id, role: adminB.role, societyId: societyB._id }, jwtSecret, { expiresIn: '1h' });
    tokenResidentA1 = jwt.sign({ id: residentA1._id, role: residentA1.role, societyId: societyA._id }, jwtSecret, { expiresIn: '1h' });
    tokenResidentB1 = jwt.sign({ id: residentB1._id, role: residentB1.role, societyId: societyB._id }, jwtSecret, { expiresIn: '1h' });
    tokenStaff = jwt.sign({ id: staffA._id, role: staffA.role, societyId: societyA._id }, jwtSecret, { expiresIn: '1h' });

    console.log('Fixtures created successfully.');

    // -------------------------------------------------------------
    // TEST 1: Preview Monthly Bills (Phase 2 & Phase 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Admin Previews Monthly Bulk Billing ---');
    const previewRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-preview',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAdminA}`,
        'Content-Type': 'application/json'
      }
    }, {
      month: 'December 2026',
      amount: 3000,
      dueDate: '2026-12-25'
    });

    assert(previewRes.status === 200, `Preview API returns HTTP 200 (Got ${previewRes.status})`);
    assert(previewRes.data?.success === true, 'Preview response returns success: true');
    assert(previewRes.data?.data?.eligibleCount === 2, `Accurately identified 2 eligible flats (Got ${previewRes.data?.data?.eligibleCount})`);
    assert(previewRes.data?.data?.eligibleResidentCount === 2, 'Identified 2 eligible resident accounts');
    assert(previewRes.data?.data?.totalAmountToBill === 6000, `Calculated total billable amount ₹6000 (Got ${previewRes.data?.data?.totalAmountToBill})`);
    assert(previewRes.data?.data?.skippedCount === 0, 'Skipped count is 0 on fresh month');
    assert(previewRes.data?.data?.excludedCount === 3, `Accurately identified 3 excluded flats (Got ${previewRes.data?.data?.excludedCount})`);

    // Verify detailed exclusion reasons
    const excludedList = previewRes.data?.data?.excluded || [];
    const ambiguousFlat = excludedList.find(e => e.flatNumber?.includes('103'));
    const inactiveFlat = excludedList.find(e => e.flatNumber?.includes('104'));
    const vacantFlat = excludedList.find(e => e.flatNumber?.includes('105'));

    assert(ambiguousFlat && ambiguousFlat.reason.includes('Ambiguous'), 'Flat 103 excluded due to ambiguous multiple active occupants');
    assert(inactiveFlat && inactiveFlat.reason.includes('not active'), 'Flat 104 excluded due to inactive resident account');
    assert(vacantFlat && vacantFlat.reason.includes('Vacant'), 'Flat 105 excluded due to vacant flat without occupants');

    // Verify preview did NOT create any bills in DB
    const dbBillsCountPre = await MaintenanceBill.countDocuments({ societyId: societyA._id });
    assert(dbBillsCountPre === 0, 'Zero bills created in database by preview action alone');

    // -------------------------------------------------------------
    // TEST 2: Confirmation Guard Enforcement
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Generation Requires Explicit Confirmation ---');
    const unconfirmedRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-generate',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAdminA}`,
        'Content-Type': 'application/json'
      }
    }, {
      month: 'December 2026',
      amount: 3000,
      dueDate: '2026-12-25',
      confirmed: false // Explicitly unconfirmed
    });

    assert(unconfirmedRes.status === 400, `Unconfirmed generation rejected with HTTP 400 (Got ${unconfirmedRes.status})`);
    assert(unconfirmedRes.data?.message?.includes('confirmation') || unconfirmedRes.data?.error?.includes('confirmation'), 'Descriptive error requiring explicit confirmation');

    // -------------------------------------------------------------
    // TEST 3: Safe Bulk Bill Generation
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Confirmed Bulk Generation ---');
    const generateRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-generate',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAdminA}`,
        'Content-Type': 'application/json'
      }
    }, {
      month: 'December 2026',
      amount: 3000,
      dueDate: '2026-12-25',
      confirmed: true
    });

    assert(generateRes.status === 201, `Confirmed generation returns HTTP 201 (Got ${generateRes.status})`);
    assert(generateRes.data?.data?.createdCount === 2, `Exactly 2 bills created for eligible flats (Got ${generateRes.data?.data?.createdCount})`);
    assert(generateRes.data?.data?.skippedCount === 0, '0 bills skipped on first generation run');
    assert(generateRes.data?.data?.totalBilledAmount === 6000, `Total billed amount is ₹6000 (Got ${generateRes.data?.data?.totalBilledAmount})`);

    // Verify in MongoDB
    const createdBills = await MaintenanceBill.find({ societyId: societyA._id, month: 'December 2026' });
    assert(createdBills.length === 2, 'Exactly 2 bills stored in MongoDB for Society A');
    assert(createdBills.every(b => b.amount === 3000), 'All created bills have standard amount ₹3000');
    assert(createdBills.every(b => b.status === 'Pending'), 'All created bills initialize with status "Pending"');
    assert(createdBills.every(b => Boolean(b.billingPeriodKey)), 'billingPeriodKey generated for deduplication protection');

    // -------------------------------------------------------------
    // TEST 4: Duplicate Prevention on Retry (Phase 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Retrying Generation Skips Previously Billed Flats ---');
    const retryRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-generate',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAdminA}`,
        'Content-Type': 'application/json'
      }
    }, {
      month: 'December 2026',
      amount: 3000,
      dueDate: '2026-12-25',
      confirmed: true
    });

    assert(retryRes.status === 201, `Retry generation returns HTTP 201 (Got ${retryRes.status})`);
    assert(retryRes.data?.data?.createdCount === 0, `Zero new bills created on retry (Got ${retryRes.data?.data?.createdCount})`);
    assert(retryRes.data?.data?.skippedCount === 2, `Exactly 2 bills skipped on retry (Got ${retryRes.data?.data?.skippedCount})`);
    assert(retryRes.data?.data?.skippedBills[0]?.reason.includes('Already billed'), 'Skipped reason explicitly cites previous billing');

    const totalBillsAfterRetry = await MaintenanceBill.countDocuments({ societyId: societyA._id, month: 'December 2026' });
    assert(totalBillsAfterRetry === 2, `Total bills in DB remains exactly 2 (No duplicate entries created)`);

    // -------------------------------------------------------------
    // TEST 5: Concurrency Safety (Simultaneous Generation Requests)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Concurrency Protection on Simultaneous Requests ---');
    const [concurrent1, concurrent2] = await Promise.all([
      makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/bills/admin/bulk-generate',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' }
      }, { month: 'January 2027', amount: 3500, dueDate: '2027-01-20', confirmed: true }),
      makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/bills/admin/bulk-generate',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' }
      }, { month: 'January 2027', amount: 3500, dueDate: '2027-01-20', confirmed: true })
    ]);

    const totalCreatedAcrossConcurrent = (concurrent1.data?.data?.createdCount || 0) + (concurrent2.data?.data?.createdCount || 0);
    const dbCountJan = await MaintenanceBill.countDocuments({ societyId: societyA._id, month: 'January 2027' });

    assert(dbCountJan === 2, `Database contains exactly 2 bills for January 2027 despite concurrent runs (Got ${dbCountJan})`);
    assert(totalCreatedAcrossConcurrent === 2, `Total bills created across both concurrent executions equals 2 (Got ${totalCreatedAcrossConcurrent})`);

    // -------------------------------------------------------------
    // TEST 6: Existing Paid Bills Remain Untouched
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Existing Paid Bills Remain Untouched ---');
    const billToPay = await MaintenanceBill.findOne({ societyId: societyA._id, month: 'December 2026', residentId: residentA1._id });
    billToPay.status = 'Paid';
    await billToPay.save();

    // Re-run preview for December 2026
    const previewDecemberAfterPaid = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-preview',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' }
    }, { month: 'December 2026', amount: 3000, dueDate: '2026-12-25' });

    const flat101Skipped = previewDecemberAfterPaid.data?.data?.skipped?.find(s => s.flatNumber?.includes('101'));
    assert(flat101Skipped && flat101Skipped.existingStatus === 'Paid', 'Preview identifies flat 101 as already Paid');

    const freshBillA1 = await MaintenanceBill.findById(billToPay._id);
    assert(freshBillA1.status === 'Paid', 'Database bill remains strictly "Paid"');

    // -------------------------------------------------------------
    // TEST 7: Resident Experience & Tenant Isolation (Phase 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Resident Experience & Isolation ---');
    const residentBillsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/my',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenResidentA1}` }
    });

    assert(residentBillsRes.status === 200, `Resident A1 retrieves bills with HTTP 200 (Got ${residentBillsRes.status})`);
    assert(Array.isArray(residentBillsRes.data?.data), 'Resident bills response is an array');
    const residentDecBill = residentBillsRes.data?.data?.find(b => b.month === 'December 2026');
    assert(Boolean(residentDecBill), 'Resident A1 finds their generated December 2026 bill');
    assert(residentDecBill?.flatNumber === '101', 'Bill displays correct flat number 101');
    assert(residentDecBill?.amount === 3000, 'Bill displays correct amount ₹3000');

    // Verify Resident A1 cannot see Resident A2's bills
    const hasA2Bill = residentBillsRes.data?.data?.some(b => b.residentId?.toString() === residentA2._id.toString());
    assert(!hasA2Bill, 'Resident A1 cannot see Resident A2 bills');

    // Verify Resident B1 in Society B cannot see Society A's bills
    const residentB1Bills = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/my',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenResidentB1}` }
    });
    assert(residentB1Bills.data?.data?.length === 0, 'Resident B1 sees 0 bills from Society A');

    // -------------------------------------------------------------
    // TEST 8: Cross-Society Admin Isolation (Phase 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Cross-Society Admin Isolation ---');
    const adminBPreview = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-preview',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenAdminB}`, 'Content-Type': 'application/json' }
    }, { month: 'December 2026', amount: 4000, dueDate: '2026-12-25' });

    assert(adminBPreview.data?.data?.eligibleCount === 1, `Admin B only sees Society B flats (1 eligible flat, got ${adminBPreview.data?.data?.eligibleCount})`);
    assert(adminBPreview.data?.data?.eligible[0]?.flatNumber === '201', 'Admin B only bills Flat 201 in Society B');

    // -------------------------------------------------------------
    // TEST 9: SecurityStaff Blocked (RBAC)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: SecurityStaff Blocked from Billing Endpoints ---');
    const staffPreview = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-preview',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenStaff}`, 'Content-Type': 'application/json' }
    }, { month: 'December 2026', amount: 3000, dueDate: '2026-12-25' });

    const staffGenerate = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills/admin/bulk-generate',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenStaff}`, 'Content-Type': 'application/json' }
    }, { month: 'December 2026', amount: 3000, dueDate: '2026-12-25', confirmed: true });

    assert(staffPreview.status === 403, `Staff blocked from bulk-preview with HTTP 403 (Got ${staffPreview.status})`);
    assert(staffGenerate.status === 403, `Staff blocked from bulk-generate with HTTP 403 (Got ${staffGenerate.status})`);

    // -------------------------------------------------------------
    // TEST 10: Razorpay & Finance Integration on Bulk-Generated Bill
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Razorpay Order & Payment Integration ---');
    const billA2 = await MaintenanceBill.findOne({ societyId: societyA._id, month: 'January 2027', residentId: residentA2._id });
    const orderRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments/create-order',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt.sign({ id: residentA2._id, role: 'Resident', societyId: societyA._id }, jwtSecret, { expiresIn: '1h' })}`,
        'Content-Type': 'application/json'
      }
    }, { billId: billA2._id });

    assert(orderRes.status === 201, `Payment order created for bulk bill (HTTP 201, Got ${orderRes.status})`);
    assert(orderRes.data?.data?.order?.amount === 350000, `Order amount in paise equals 350000 (₹3500 * 100)`);

    // Verify payment verification marks bill Paid and records Finance ledger entry
    const fakePaymentId = `pay_mock_${timestamp}`;
    const fakeOrderId = orderRes.data.data.order.id;
    const testSecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const validSignature = crypto.createHmac('sha256', testSecret).update(`${fakeOrderId}|${fakePaymentId}`).digest('hex');

    const verifyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments/verify',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt.sign({ id: residentA2._id, role: 'Resident', societyId: societyA._id }, jwtSecret, { expiresIn: '1h' })}`,
        'Content-Type': 'application/json'
      }
    }, {
      razorpay_order_id: fakeOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature,
      billId: billA2._id
    });

    assert(verifyRes.status === 200, `Payment verification succeeds with HTTP 200 (Got ${verifyRes.status})`);
    const verifiedBill = await MaintenanceBill.findById(billA2._id);
    assert(verifiedBill.status === 'Paid', 'Bill status updated to "Paid" via trusted backend payment verification');

    const paymentRecord = await Payment.findOne({ billId: billA2._id });
    const financeRecords = await Finance.find({ societyId: societyA._id, referenceId: paymentRecord._id });
    assert(financeRecords.length === 1, 'Exactly 1 Finance ledger record created upon confirmed payment');
    assert(financeRecords[0]?.amount === 3500, 'Finance record amount matches bill amount ₹3500');

  } finally {
    console.log('\nCleaning up isolated test fixtures...');
    if (societyA) {
      await User.deleteMany({ societyId: societyA._id });
      await Flat.deleteMany({ societyId: societyA._id });
      await MaintenanceBill.deleteMany({ societyId: societyA._id });
      await Payment.deleteMany({ societyId: societyA._id });
      await Finance.deleteMany({ societyId: societyA._id });
      await Notification.deleteMany({ societyId: societyA._id });
      await Society.deleteOne({ _id: societyA._id });
    }
    if (societyB) {
      await User.deleteMany({ societyId: societyB._id });
      await Flat.deleteMany({ societyId: societyB._id });
      await MaintenanceBill.deleteMany({ societyId: societyB._id });
      await Payment.deleteMany({ societyId: societyB._id });
      await Finance.deleteMany({ societyId: societyB._id });
      await Notification.deleteMany({ societyId: societyB._id });
      await Society.deleteOne({ _id: societyB._id });
    }
    console.log('Cleanup completed successfully.');
  }

  console.log('\n========================================================');
  console.log(`BULK BILLING TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
