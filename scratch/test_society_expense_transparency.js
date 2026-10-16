const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const Finance = require('../server/src/models/Finance');

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
  let assertionsPassed = true;
  let testSocietyA = null;
  let testSocietyB = null;
  let adminA = null;
  let residentA = null;
  let staffA = null;
  let adminB = null;
  let residentB = null;
  const createdRecordIds = [];

  try {
    await connectDB();
    console.log('Connected to MongoDB. Setting up isolated test fixtures...');

    const timestamp = Date.now();

    // 1. Create Society A and Society B
    testSocietyA = await Society.create({
      name: `Test Society Alpha ${timestamp}`,
      address: '123 Alpha Road',
      registrationNumber: `REG-A-${timestamp}`,
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001'
    });

    testSocietyB = await Society.create({
      name: `Test Society Beta ${timestamp}`,
      address: '456 Beta Avenue',
      registrationNumber: `REG-B-${timestamp}`,
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001'
    });

    // Users for Society A
    adminA = await User.create({
      name: 'Admin Alpha',
      email: `admin.alpha.${timestamp}@test.com`,
      password: 'Password123!',
      role: 'Admin',
      status: 'Active',
      societyId: testSocietyA._id
    });

    residentA = await User.create({
      name: 'Resident Alpha',
      email: `res.alpha.${timestamp}@test.com`,
      password: 'Password123!',
      role: 'Resident',
      flatNumber: 'A-101',
      status: 'Active',
      societyId: testSocietyA._id
    });

    staffA = await User.create({
      name: 'Staff Alpha',
      email: `staff.alpha.${timestamp}@test.com`,
      password: 'Password123!',
      role: 'SecurityStaff',
      status: 'Active',
      societyId: testSocietyA._id
    });

    // Users for Society B
    adminB = await User.create({
      name: 'Admin Beta',
      email: `admin.beta.${timestamp}@test.com`,
      password: 'Password123!',
      role: 'Admin',
      status: 'Active',
      societyId: testSocietyB._id
    });

    residentB = await User.create({
      name: 'Resident Beta',
      email: `res.beta.${timestamp}@test.com`,
      password: 'Password123!',
      role: 'Resident',
      flatNumber: 'B-202',
      status: 'Active',
      societyId: testSocietyB._id
    });

    const tokenAdminA = jwt.sign({ id: adminA._id, role: adminA.role, societyId: adminA.societyId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    const tokenResidentA = jwt.sign({ id: residentA._id, role: residentA.role, societyId: residentA.societyId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    const tokenStaffA = jwt.sign({ id: staffA._id, role: staffA.role, societyId: staffA.societyId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    const tokenAdminB = jwt.sign({ id: adminB._id, role: adminB.role, societyId: adminB.societyId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    const tokenResidentB = jwt.sign({ id: residentB._id, role: residentB.role, societyId: residentB.societyId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    console.log('Test fixtures created. Starting verification suite...\n');

    // ----------------------------------------------------
    // TEST 1: Admin creates an authorized Expense
    // ----------------------------------------------------
    console.log('--- TEST 1: Admin creates an authorized Expense ---');
    const expenseData1 = {
      type: 'Expense',
      title: 'Lift AMC & Safety Inspection',
      category: 'Lift maintenance',
      amount: 4500,
      description: 'Quarterly elevator safety inspection and motor servicing',
      vendor: 'Otis Elevators India Ltd',
      referenceNumber: 'INV-OTIS-2026-90',
      paymentStatus: 'Paid',
      receiptUrl: 'https://res.cloudinary.com/societyhub/image/upload/v1/invoices/otis_lift_amc.pdf',
      date: new Date().toISOString()
    };

    const resExp1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminA}`
      }
    }, expenseData1);

    if (resExp1.status === 201 && resExp1.data?.success) {
      console.log('  [PASS] Admin A successfully created expense 1 (HTTP 201)');
      createdRecordIds.push(resExp1.data.data._id);
    } else {
      console.error('  [FAIL] Admin A could not create expense 1:', resExp1);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 2: Validation checks on amount and required fields
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Amount and required field validation ---');
    const invalidAmountRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminA}`
      }
    }, {
      type: 'Expense',
      category: 'Cleaning and housekeeping',
      amount: -500, // Invalid negative amount
      description: 'Test invalid amount'
    });

    if (invalidAmountRes.status === 400) {
      console.log('  [PASS] Negative amount rejected with HTTP 400');
    } else {
      console.error('  [FAIL] Negative amount was not rejected:', invalidAmountRes.status);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 3: Create a Pending Expense and Income record
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Create Pending Expense & Income record ---');
    const expenseData2 = {
      type: 'Expense',
      title: 'Security CCTV Camera Repair',
      category: 'Security services',
      amount: 2200,
      description: 'Replacing damaged wiring on Gate 2 CCTV camera',
      vendor: 'Hikvision Secure Tech',
      referenceNumber: 'QUOT-HIK-4421',
      paymentStatus: 'Pending', // Pending invoice awaiting sign-off
      date: new Date().toISOString()
    };

    const resExp2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminA}`
      }
    }, expenseData2);

    if (resExp2.status === 201 && resExp2.data?.data?.paymentStatus === 'Pending') {
      console.log('  [PASS] Admin A created Pending expense 2 (HTTP 201, status Pending)');
      createdRecordIds.push(resExp2.data.data._id);
    } else {
      console.error('  [FAIL] Could not create pending expense:', resExp2);
      assertionsPassed = false;
    }

    // Income record for Society A
    const incomeData1 = {
      type: 'Income',
      title: 'Maintenance Collection Batch 1',
      category: 'Maintenance Fee',
      amount: 15000,
      description: 'Verified resident maintenance collections for October 2026',
      date: new Date().toISOString()
    };
    const resInc1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminA}`
      }
    }, incomeData1);

    if (resInc1.status === 201) {
      console.log('  [PASS] Admin A recorded Income (₹15,000)');
      createdRecordIds.push(resInc1.data.data._id);
    }

    // ----------------------------------------------------
    // TEST 4: Resident A reads Society Expense Transparency
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Resident A accesses Society Transparency API ---');
    const transparencyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/transparency',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResidentA}`
      }
    });

    if (transparencyRes.status === 200 && transparencyRes.data?.success) {
      const summary = transparencyRes.data.data.summary;
      const expenses = transparencyRes.data.data.expenses;
      console.log('  [PASS] Resident A received transparency data (HTTP 200)');
      console.log(`         Collected Income: ₹${summary.totalCollectedIncome} (expected: 15000)`);
      console.log(`         Recorded Expenses: ₹${summary.totalRecordedExpenses} (expected: 6700: 4500+2200)`);
      console.log(`         Paid Expenses: ₹${summary.totalPaidExpenses} (expected: 4500)`);
      console.log(`         Pending Expenses: ₹${summary.totalPendingExpenses} (expected: 2200)`);
      console.log(`         Net Operational Balance: ₹${summary.netOperationalBalance} (expected: 15000 - 4500 = 10500)`);

      if (summary.totalCollectedIncome !== 15000) { assertionsPassed = false; console.error('  [FAIL] totalCollectedIncome mismatch'); }
      if (summary.totalRecordedExpenses !== 6700) { assertionsPassed = false; console.error('  [FAIL] totalRecordedExpenses mismatch'); }
      if (summary.totalPaidExpenses !== 4500) { assertionsPassed = false; console.error('  [FAIL] totalPaidExpenses mismatch'); }
      if (summary.totalPendingExpenses !== 2200) { assertionsPassed = false; console.error('  [FAIL] totalPendingExpenses mismatch'); }
      if (summary.netOperationalBalance !== 10500) { assertionsPassed = false; console.error('  [FAIL] netOperationalBalance mismatch'); }
      if (expenses.length !== 2) { assertionsPassed = false; console.error('  [FAIL] Expected 2 expense items, found:', expenses.length); }

      // Check fields of expenses
      const itemWithReceipt = expenses.find(e => e.vendor === 'Otis Elevators India Ltd');
      if (itemWithReceipt && itemWithReceipt.receiptUrl && itemWithReceipt.paymentStatus === 'Paid') {
        console.log('  [PASS] Expense 1 contains vendor, receiptUrl and Paid status');
      } else {
        console.error('  [FAIL] Expense 1 missing expected fields:', itemWithReceipt);
        assertionsPassed = false;
      }

      const itemWithoutReceipt = expenses.find(e => e.vendor === 'Hikvision Secure Tech');
      if (itemWithoutReceipt && itemWithoutReceipt.receiptUrl === null && itemWithoutReceipt.paymentStatus === 'Pending') {
        console.log('  [PASS] Expense 2 cleanly handles null receipt and Pending status');
      } else {
        console.error('  [FAIL] Expense 2 fields unexpected:', itemWithoutReceipt);
        assertionsPassed = false;
      }
    } else {
      console.error('  [FAIL] Resident transparency request failed:', transparencyRes);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 5: Resident cannot create, update, or delete expenses
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Resident RBAC enforcement (Cannot mutate) ---');
    const residentCreateRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResidentA}`
      }
    }, { type: 'Expense', category: 'Repairs', amount: 100, description: 'Unauthorized' });

    if (residentCreateRes.status === 403) {
      console.log('  [PASS] Resident cannot POST /api/finance/admin (HTTP 403)');
    } else {
      console.error('  [FAIL] Resident POST was not blocked with 403:', residentCreateRes.status);
      assertionsPassed = false;
    }

    const residentDeleteRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/finance/admin/${createdRecordIds[0]}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenResidentA}` }
    });

    if (residentDeleteRes.status === 403) {
      console.log('  [PASS] Resident cannot DELETE /api/finance/admin/:id (HTTP 403)');
    } else {
      console.error('  [FAIL] Resident DELETE was not blocked with 403:', residentDeleteRes.status);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 6: SecurityStaff cannot access financial endpoints
    // ----------------------------------------------------
    console.log('\n--- TEST 6: SecurityStaff cannot access financial records ---');
    const staffTransparencyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/transparency',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenStaffA}` }
    });

    if (staffTransparencyRes.status === 403) {
      console.log('  [PASS] SecurityStaff blocked from /api/finance/transparency (HTTP 403)');
    } else {
      console.error('  [FAIL] SecurityStaff was not blocked with 403:', staffTransparencyRes.status);
      assertionsPassed = false;
    }

    const staffAdminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/admin',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenStaffA}` }
    });

    if (staffAdminRes.status === 403) {
      console.log('  [PASS] SecurityStaff blocked from /api/finance/admin (HTTP 403)');
    } else {
      console.error('  [FAIL] SecurityStaff was not blocked with 403:', staffAdminRes.status);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 7: Multi-Society Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Multi-Society Isolation (Society A vs Society B) ---');
    // Resident B requests transparency for Society B
    const resBTransparency = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/transparency',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenResidentB}` }
    });

    if (resBTransparency.status === 200) {
      const summaryB = resBTransparency.data.data.summary;
      const expensesB = resBTransparency.data.data.expenses;
      if (summaryB.totalRecordedExpenses === 0 && summaryB.totalCollectedIncome === 0 && expensesB.length === 0) {
        console.log('  [PASS] Resident B sees 0 expenses and 0 income for Society B (Zero leakage from Society A)');
      } else {
        console.error('  [FAIL] Data leak! Resident B saw records:', summaryB, expensesB);
        assertionsPassed = false;
      }
    } else {
      console.error('  [FAIL] Resident B transparency request failed:', resBTransparency);
      assertionsPassed = false;
    }

    // Admin B attempts to modify Society A's expense
    const adminBModifyRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/finance/admin/${createdRecordIds[0]}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminB}`
      }
    }, { amount: 9999 });

    if (adminBModifyRes.status === 403) {
      console.log('  [PASS] Admin B cross-society PATCH blocked with HTTP 403');
    } else {
      console.error('  [FAIL] Admin B cross-society PATCH was not blocked with 403:', adminBModifyRes.status);
      assertionsPassed = false;
    }

    // ----------------------------------------------------
    // TEST 8: Admin updates an expense status and audit trail
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Admin updates an expense (Pending -> Paid) with audit trail ---');
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/finance/admin/${createdRecordIds[1]}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdminA}`
      }
    }, {
      paymentStatus: 'Paid',
      receiptUrl: 'https://res.cloudinary.com/societyhub/image/upload/v1/invoices/cctv_receipt.pdf'
    });

    if (updateRes.status === 200 && updateRes.data?.data?.paymentStatus === 'Paid' && updateRes.data?.data?.updatedBy) {
      console.log('  [PASS] Expense status updated to Paid and updatedBy recorded');
    } else {
      console.error('  [FAIL] Expense update failed:', updateRes);
      assertionsPassed = false;
    }

    // Check transparency summary again to verify recalculation
    const transparencyUpdatedRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/finance/transparency',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenResidentA}` }
    });

    const updatedSummary = transparencyUpdatedRes.data?.data?.summary;
    if (updatedSummary.totalPaidExpenses === 6700 && updatedSummary.totalPendingExpenses === 0 && updatedSummary.netOperationalBalance === 15000 - 6700) {
      console.log('  [PASS] Updated transparency reflects Paid expenses: ₹6700, Pending: ₹0, Net Balance: ₹8300');
    } else {
      console.error('  [FAIL] Transparency recalculation mismatch:', updatedSummary);
      assertionsPassed = false;
    }

    console.log('\n======================================================');
    if (assertionsPassed) {
      console.log('ALL EXPENSE TRANSPARENCY BACKEND ASSERTIONS PASSED (12/12)!');
    } else {
      console.error('SOME ASSERTIONS FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    assertionsPassed = false;
  } finally {
    console.log('\nCleaning up isolated test fixtures...');
    if (createdRecordIds.length > 0) {
      await Finance.deleteMany({ _id: { $in: createdRecordIds } });
    }
    if (adminA) await User.deleteOne({ _id: adminA._id });
    if (residentA) await User.deleteOne({ _id: residentA._id });
    if (staffA) await User.deleteOne({ _id: staffA._id });
    if (adminB) await User.deleteOne({ _id: adminB._id });
    if (residentB) await User.deleteOne({ _id: residentB._id });
    if (testSocietyA) await Society.deleteOne({ _id: testSocietyA._id });
    if (testSocietyB) await Society.deleteOne({ _id: testSocietyB._id });
    console.log('Cleanup completed successfully.');
    process.exit(assertionsPassed ? 0 : 1);
  }
})();
