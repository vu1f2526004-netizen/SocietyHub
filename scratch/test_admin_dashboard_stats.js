const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');

function makeRequest(options) {
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
    req.end();
  });
}

(async () => {
  try {
    await connectDB();
    const adminUser = await User.findOne({ email: 'anshjai@98gmail.com' });
    if (!adminUser) {
      console.error('Admin user not found in DB');
      process.exit(1);
    }

    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role, societyId: adminUser.societyId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    console.log('Testing Admin Dashboard Stats API for society:', adminUser.societyId.toString());

    // 1. Test /api/admin/stats
    const statsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n--- /api/admin/stats Response (Status:', statsRes.status, ') ---');
    console.log(JSON.stringify(statsRes.data, null, 2));

    if (statsRes.status !== 200 || !statsRes.data.success) {
      console.error('FAILED: /api/admin/stats returned non-200 or unsuccessful');
      process.exit(1);
    }

    // Compute ground truth directly from DB for this society
    const mongoose = require('mongoose');
    const Complaint = require('../server/src/models/Complaint');
    const Repair = require('../server/src/models/Repair');
    const MaintenanceBill = require('../server/src/models/MaintenanceBill');
    const Finance = require('../server/src/models/Finance');
    const Visitor = require('../server/src/models/Visitor');
    const CommunityIssue = require('../server/src/models/CommunityIssue');

    const rawSocietyId = adminUser.societyId;
    const societyObjId = mongoose.Types.ObjectId.isValid(rawSocietyId)
      ? new mongoose.Types.ObjectId(rawSocietyId)
      : rawSocietyId;
    const socMatch = { $in: [societyObjId, rawSocietyId.toString()] };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      expectedResidents,
      expectedStaff,
      expectedComplaints,
      expectedRepairs,
      expectedPendingBillsAgg,
      expectedIncomeAgg,
      expectedExpenseAgg,
      expectedVisitorsToday,
      expectedPendingIssues
    ] = await Promise.all([
      User.countDocuments({ societyId: socMatch, role: 'Resident', status: 'Active' }),
      User.countDocuments({ societyId: socMatch, role: 'SecurityStaff', status: 'Active' }),
      Complaint.countDocuments({ societyId: socMatch, status: 'Pending' }),
      Repair.countDocuments({ societyId: socMatch, status: { $in: ['Assigned', 'In Progress'] } }),
      MaintenanceBill.aggregate([
        { $match: { societyId: socMatch, status: { $in: ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { societyId: socMatch, type: 'Income', date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Finance.aggregate([
        { $match: { societyId: socMatch, type: 'Expense', date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Visitor.countDocuments({
        societyId: socMatch,
        $or: [
          { entryTimestamp: { $gte: todayStart, $lte: todayEnd } },
          { expectedDate: { $gte: todayStart, $lte: todayEnd } },
          { createdAt: { $gte: todayStart, $lte: todayEnd } }
        ]
      }),
      CommunityIssue.countDocuments({ societyId: socMatch, status: 'Pending' })
    ]);

    const expectedPendingDues = expectedPendingBillsAgg[0]?.total || 0;
    const expectedIncome = expectedIncomeAgg[0]?.total || 0;
    const expectedExpense = expectedExpenseAgg[0]?.total || 0;
    const { residents, staff, complaints, repairs, pendingDues, income, expense, visitorsToday, pendingIssues } = statsRes.data.data;

    console.log('\nExtracted Metrics vs Ground Truth:');
    console.log(`- Residents: ${residents} (expected: ${expectedResidents})`);
    console.log(`- Staff: ${staff} (expected: ${expectedStaff})`);
    console.log(`- Complaints: ${complaints} (expected: ${expectedComplaints})`);
    console.log(`- Repairs: ${repairs} (expected: ${expectedRepairs})`);
    console.log(`- Pending Dues: ₹${pendingDues} (expected: ₹${expectedPendingDues})`);
    console.log(`- Income: ₹${income} (expected: ₹${expectedIncome})`);
    console.log(`- Expense: ₹${expense} (expected: ₹${expectedExpense})`);
    console.log(`- Today's Visitors: ${visitorsToday} (expected: ${expectedVisitorsToday})`);
    console.log(`- Pending Issues: ${pendingIssues} (expected: ${expectedPendingIssues})`);

    // Verify expectations
    let assertionsPassed = true;
    if (residents !== expectedResidents) { console.error('Mismatch: residents'); assertionsPassed = false; }
    if (staff !== expectedStaff) { console.error('Mismatch: staff'); assertionsPassed = false; }
    if (complaints !== expectedComplaints) { console.error('Mismatch: complaints'); assertionsPassed = false; }
    if (repairs !== expectedRepairs) { console.error('Mismatch: repairs'); assertionsPassed = false; }
    if (pendingDues !== expectedPendingDues) { console.error('Mismatch: pendingDues'); assertionsPassed = false; }
    if (income !== expectedIncome) { console.error('Mismatch: income'); assertionsPassed = false; }
    if (expense !== expectedExpense) { console.error('Mismatch: expense'); assertionsPassed = false; }
    if (visitorsToday !== expectedVisitorsToday) { console.error('Mismatch: visitorsToday'); assertionsPassed = false; }
    if (pendingIssues !== expectedPendingIssues) { console.error('Mismatch: pendingIssues'); assertionsPassed = false; }

    // 2. Test individual endpoints
    console.log('\n--- Testing Fallback / Individual Endpoints ---');
    const resUsers = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/residents',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`GET /api/users/residents -> Status ${resUsers.status}, count: ${resUsers.data?.count}`);

    const resComplaints = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/complaints',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`GET /api/complaints -> Status ${resComplaints.status}, data length: ${Array.isArray(resComplaints.data?.data) ? resComplaints.data.data.length : 'N/A'}`);

    const resRepairs = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/repairs',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`GET /api/repairs -> Status ${resRepairs.status}, count: ${resRepairs.data?.count}`);

    const resVisitors = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/visitors',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`GET /api/visitors -> Status ${resVisitors.status}, count: ${resVisitors.data?.count}`);

    // 3. Test multi-society isolation with an isolated test fixture
    console.log('\n--- Testing Multi-Society Isolation ---');
    const Society = require('../server/src/models/Society');
    let tempSociety = null;
    let tempAdmin = null;

    try {
      tempSociety = await Society.create({
        name: 'Isolated Test Society Alpha',
        address: 'Test Location',
        registrationNumber: 'TEST-ISOLATION-001',
        city: 'Test City',
        state: 'Test State',
        postalCode: '400001'
      });
      tempAdmin = await User.create({
        name: 'Temp Isolation Admin',
        email: 'isolationadmin@test.com',
        password: 'Password123!',
        role: 'Admin',
        status: 'Active',
        societyId: tempSociety._id
      });

      const isolatedToken = jwt.sign(
        { id: tempAdmin._id, role: tempAdmin.role, societyId: tempAdmin.societyId },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );
      const isolatedStats = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/admin/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${isolatedToken}` }
      });
      console.log('Isolated society response status:', isolatedStats.status);
      console.log('Isolated society metrics:', JSON.stringify(isolatedStats.data?.data, null, 2));

      const isoData = isolatedStats.data?.data;
      if (
        isoData?.residents === 0 &&
        isoData?.staff === 0 &&
        isoData?.complaints === 0 &&
        isoData?.repairs === 0 &&
        isoData?.pendingDues === 0 &&
        isoData?.income === 0 &&
        isoData?.expense === 0 &&
        isoData?.visitorsToday === 0 &&
        isoData?.pendingIssues === 0
      ) {
        console.log('PASSED: Multi-society isolation verified. Another society sees 0 for all metrics.');
      } else {
        console.error('FAILED: Multi-society isolation breached!');
        assertionsPassed = false;
      }
    } finally {
      // Clean up isolated fixtures
      if (tempAdmin) await User.deleteOne({ _id: tempAdmin._id });
      if (tempSociety) await Society.deleteOne({ _id: tempSociety._id });
      console.log('Cleaned up temporary isolation fixtures.');
    }

    if (assertionsPassed) {
      console.log('\nALL BACKEND DASHBOARD STATS ASSERTIONS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('\nSOME ASSERTIONS FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
})();
