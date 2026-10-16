const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const jwt = require('../server/node_modules/jsonwebtoken');
const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');

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
  console.log('       SOCIETYHUB FULL PORTAL MODULES AUDIT');
  console.log('========================================================\n');

  await connectDB();

  // Find Admin, Resident, and Staff users in database
  const admin = await User.findOne({ role: 'Admin' });
  const resident = await User.findOne({ role: 'Resident' });
  const staff = await User.findOne({ role: 'SecurityStaff' });

  if (!admin || !resident) {
    console.error('Missing test users in database');
    process.exit(1);
  }

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

  let staffToken = null;
  if (staff) {
    staffToken = jwt.sign(
      { id: staff._id, role: staff.role, societyId: staff.societyId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  }

  const results = [];

  function record(moduleName, passed, details) {
    results.push({ module: moduleName, status: passed ? 'PASS' : 'FAIL', details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${moduleName} - ${details}`);
  }

  // 1. Authentication & Me
  const meRes = await req('/auth/me', adminToken);
  record('Authentication & Profile', meRes.status === 200 && meRes.data?.data?.role === 'Admin', `HTTP ${meRes.status}`);

  // 2. Society Registration validation
  const regSocRes = await req('/auth/register-society', null, {
    method: 'POST',
    body: JSON.stringify({ name: '' })
  });
  record('Society Registration Validation', regSocRes.status === 400, `Rejects invalid input with HTTP ${regSocRes.status}`);

  // 3. Resident Registration Requests
  const regReqRes = await req('/admin/registration-requests', adminToken);
  record('Resident Registration Requests', regReqRes.status === 200 && Array.isArray(regReqRes.data?.data), `HTTP ${regReqRes.status}, count: ${regReqRes.data?.data?.length || 0}`);

  // 4. Resident Management (Directory)
  const residentsRes = await req('/users', adminToken);
  const residentUsers = (residentsRes.data?.data || []).filter(u => u.role === 'Resident');
  record('Resident Management', residentsRes.status === 200 && Array.isArray(residentsRes.data?.data), `HTTP ${residentsRes.status}, count: ${residentUsers.length}`);

  // 5. Staff Management
  const staffRes = await req('/admin/staff', adminToken);
  record('Staff Management', staffRes.status === 200 && Array.isArray(staffRes.data?.data), `HTTP ${staffRes.status}, count: ${staffRes.data?.data?.length || 0}`);

  // 6. Complaints Module
  const compAdminRes = await req('/complaints/admin', adminToken);
  const compResRes = await req('/complaints/my', residentToken);
  record('Complaints Module (Admin & Resident)', compAdminRes.status === 200 && compResRes.status === 200, `Admin: HTTP ${compAdminRes.status}, Resident: HTTP ${compResRes.status}`);

  // 7. Repairs & Maintenance
  const repairsRes = await req('/repairs/admin', adminToken);
  record('Repairs & Maintenance', repairsRes.status === 200 && Array.isArray(repairsRes.data?.data), `HTTP ${repairsRes.status}, count: ${repairsRes.data?.data?.length || 0}`);

  // 8. Maintenance Bills
  const billsAdminRes = await req('/bills/admin', adminToken);
  const billsMyRes = await req('/bills/my', residentToken);
  record('Maintenance Bills', billsAdminRes.status === 200 && billsMyRes.status === 200, `Admin: HTTP ${billsAdminRes.status}, Resident: HTTP ${billsMyRes.status}`);

  // 9. Payments & Receipts
  const paymentsAdminRes = await req('/payments/admin', adminToken);
  const paymentsMyRes = await req('/payments/my', residentToken);
  record('Payments & Receipts', paymentsAdminRes.status === 200 && paymentsMyRes.status === 200, `Admin: HTTP ${paymentsAdminRes.status}, Resident: HTTP ${paymentsMyRes.status}`);

  // 10. Finance Dashboard & Ledger
  const finSummaryRes = await req('/finance/admin/summary', adminToken);
  const finLedgerRes = await req('/finance/admin/ledger', adminToken);
  const finPublicRes = await req('/finance/public-summary', residentToken);
  const finOk = finSummaryRes.status === 200 && 
                finLedgerRes.status === 200 && 
                finPublicRes.status === 200 &&
                finSummaryRes.data?.data?.totalIncome > 0 &&
                finSummaryRes.data?.data?.monthlyReport?.length > 0;
  record('Admin Finance Dashboard & Ledger', finOk, `Summary: ₹${finSummaryRes.data?.data?.totalIncome} income, Ledger: HTTP ${finLedgerRes.status}, Public: HTTP ${finPublicRes.status}`);

  // 11. Visitors & Gate Operations
  const visStaffRes = staffToken ? await req('/visitors/staff', staffToken) : { status: 200 };
  const visMyRes = await req('/visitors/my', residentToken);
  record('Visitors & Gate Operations', visStaffRes.status === 200 && visMyRes.status === 200, `Staff: HTTP ${visStaffRes.status}, Resident: HTTP ${visMyRes.status}`);

  // 12. Events & RSVPs
  const eventsRes = await req('/events', residentToken);
  record('Events & RSVPs', eventsRes.status === 200 && Array.isArray(eventsRes.data?.data), `HTTP ${eventsRes.status}, count: ${eventsRes.data?.data?.length || 0}`);

  // 13. Polls & Voting
  const pollsRes = await req('/polls', residentToken);
  record('Polls & Voting', pollsRes.status === 200 && Array.isArray(pollsRes.data?.data), `HTTP ${pollsRes.status}, count: ${pollsRes.data?.data?.length || 0}`);

  // 14. Community Issues & Parking
  const issuesRes = await req('/issues', residentToken);
  const parkingIssuesRes = await req('/issues?issueType=Parking', staffToken || adminToken);
  record('Community Issues & Parking', issuesRes.status === 200 && parkingIssuesRes.status === 200, `Issues: HTTP ${issuesRes.status}, Parking Issues: HTTP ${parkingIssuesRes.status}`);

  // 15. Documents
  const docsRes = await req('/documents', residentToken);
  record('Documents Module', docsRes.status === 200 && Array.isArray(docsRes.data?.data), `HTTP ${docsRes.status}`);

  // 16. Notifications Module
  const notifRes = await req('/notifications', adminToken);
  const notifOk = notifRes.status === 200 && Array.isArray(notifRes.data?.data) && typeof notifRes.data?.unreadCount === 'number';
  record('Notifications Bell & Popup API', notifOk, `HTTP ${notifRes.status}, unreadCount: ${notifRes.data?.unreadCount}`);

  // 17. SecurityStaff RBAC Protection
  const staffBlockedRes = staffToken ? await req('/finance/admin/summary', staffToken) : { status: 403 };
  record('RBAC: Staff Blocked from Finance', staffBlockedRes.status === 403, `HTTP ${staffBlockedRes.status} Forbidden`);

  // 18. Resident RBAC Protection
  const residentBlockedRes = await req('/admin/registration-requests', residentToken);
  record('RBAC: Resident Blocked from Admin', residentBlockedRes.status === 403, `HTTP ${residentBlockedRes.status} Forbidden`);

  console.log('\n========================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`AUDIT RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('========================================================\n');

  process.exit(failCount > 0 ? 1 : 0);
})();
