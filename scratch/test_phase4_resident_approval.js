const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('    MULTI-SOCIETY PHASE 4 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB directly for assertion verification.\n');

  const Society = mongoose.model('Society', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Flat = mongoose.model('Flat', new mongoose.Schema({}, { strict: false }));

  const createdSocietyIds = [];
  const createdUserIds = [];

  try {
    // SETUP: We need two test societies with their own admins to test cross-society isolation
    // Society A
    const secEmailA = `secA_${Date.now()}@testsocA.com`;
    const regSocA = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `Test Society Alpha ${Date.now()}`,
        address: '100 Alpha Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        name: 'Secretary Alpha',
        email: secEmailA,
        mobile: '9876543211',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    const societyA = regSocA.data.society;
    const adminA = regSocA.data.user;
    createdSocietyIds.push(societyA.id);
    createdUserIds.push(adminA.id);

    // Login Admin A
    const loginAdminA = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: secEmailA, password: 'Password123!' })
    });
    const tokenAdminA = loginAdminA.data.token;

    // Society B
    const secEmailB = `secB_${Date.now()}@testsocB.com`;
    const regSocB = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `Test Society Beta ${Date.now()}`,
        address: '200 Beta Lane',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        name: 'Secretary Beta',
        email: secEmailB,
        mobile: '9876543212',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    const societyB = regSocB.data.society;
    const adminB = regSocB.data.user;
    createdSocietyIds.push(societyB.id);
    createdUserIds.push(adminB.id);

    // Login Admin B
    const loginAdminB = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: secEmailB, password: 'Password123!' })
    });
    const tokenAdminB = loginAdminB.data.token;

    console.log(`Setup complete. Society A: "${societyA.name}" (Code: ${societyA.joinCode}), Society B: "${societyB.name}" (Code: ${societyB.joinCode})\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Valid Join Code creates a pending Resident in the correct Society
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Resident joins with valid Join Code...');
    const residentEmail1 = `res1_${Date.now()}@testres.com`;
    const res1 = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Rohit Sharma',
        email: residentEmail1,
        mobile: '9876543220',
        flatNumber: 'A-301',
        password: 'ResidentPassword123!',
        confirmPassword: 'ResidentPassword123!'
      })
    });

    if (res1.status === 201 && res1.data.success && res1.data.user.status === 'PendingApproval') {
      createdUserIds.push(res1.data.user.id);
      const dbUser = await User.findById(res1.data.user.id);
      if (dbUser && String(dbUser.societyId) === String(societyA.id) && dbUser.role === 'Resident' && dbUser.status === 'PendingApproval') {
        console.log(`  -> Status 201, User status: ${dbUser.status}, SocietyId: ${dbUser.societyId}`);
        console.log('  [PASS] Resident created with PendingApproval in correct Society.');
        testPassed++;
      } else {
        console.error('  [FAIL] DB verification failed for Resident 1');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Unexpected response for valid join:', res1.status, res1.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Invalid Join Code is rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Resident joins with invalid Join Code...');
    const resInvalidCode = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: 'SOC-INVALID99',
        name: 'Invalid Code Tester',
        email: `invalid_${Date.now()}@test.com`,
        mobile: '9876543221',
        flatNumber: 'B-101',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    if (resInvalidCode.status === 400 && resInvalidCode.data.error.includes('Invalid society join code')) {
      console.log('  -> Correctly rejected with HTTP 400:', resInvalidCode.data.error);
      console.log('  [PASS] Invalid Join Code rejected.');
      testPassed++;
    } else {
      console.error('  [FAIL] Invalid join code was not properly rejected:', resInvalidCode.status, resInvalidCode.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Duplicate email is rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Attempt registration with duplicate email...');
    const resDupEmail = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Duplicate Email Tester',
        email: residentEmail1, // existing email from Test 1
        mobile: '9876543222',
        flatNumber: 'A-302',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    if (resDupEmail.status === 400 && resDupEmail.data.error.includes('already exists')) {
      console.log('  -> Correctly rejected with HTTP 400:', resDupEmail.data.error);
      console.log('  [PASS] Duplicate email registration rejected.');
      testPassed++;
    } else {
      console.error('  [FAIL] Duplicate email was not rejected:', resDupEmail.status, resDupEmail.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Client-supplied role = Admin or SecurityStaff is ignored
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4 & 5] Role tampering check (client supplies role=Admin or SecurityStaff)...');
    const tamperEmail = `tamper_${Date.now()}@testres.com`;
    const resTamperRole = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Role Tamper Tester',
        email: tamperEmail,
        mobile: '9876543223',
        flatNumber: 'C-201',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'Admin', // Forged role
        status: 'Active' // Forged status
      })
    });

    createdUserIds.push(resTamperRole.data.user?.id);
    const dbTamperUser = await User.findById(resTamperRole.data.user?.id);
    if (dbTamperUser && dbTamperUser.role === 'Resident' && dbTamperUser.status === 'PendingApproval') {
      console.log(`  -> Client supplied role="Admin" and status="Active". Stored: role="${dbTamperUser.role}", status="${dbTamperUser.status}"`);
      console.log('  [PASS] Backend enforced Resident role and PendingApproval status.');
      testPassed++;
    } else {
      console.error('  [FAIL] Role tampering succeeded in altering role/status:', dbTamperUser);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 6: Client-supplied societyId cannot override the Join Code
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] SocietyId tampering check (client supplies Society B ID but Society A Join Code)...');
    const tamperSocEmail = `tamper_soc_${Date.now()}@testres.com`;
    const resTamperSoc = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode, // Valid Code for Society A
        societyId: societyB.id,      // Client attempts to force Society B
        name: 'Society Tamper Tester',
        email: tamperSocEmail,
        mobile: '9876543224',
        flatNumber: 'D-401',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    createdUserIds.push(resTamperSoc.data.user?.id);
    const dbTamperSoc = await User.findById(resTamperSoc.data.user?.id);
    if (dbTamperSoc && String(dbTamperSoc.societyId) === String(societyA.id)) {
      console.log(`  -> Client supplied societyId="${societyB.id}". Stored societyId="${dbTamperSoc.societyId}" (matches Society A)`);
      console.log('  [PASS] Backend strictly bound user to resolved Join Code society.');
      testPassed++;
    } else {
      console.error('  [FAIL] Client-supplied societyId overrode join code society:', dbTamperSoc?.societyId);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Pending Resident cannot log in or access protected APIs
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Pending Resident login and protected access check...');
    const loginPending = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: residentEmail1, password: 'ResidentPassword123!' })
    });

    if (loginPending.status === 403 && loginPending.data.error.includes('pending administrator approval')) {
      console.log('  -> Login blocked with HTTP 403:', loginPending.data.error);
      console.log('  [PASS] Pending Resident cannot obtain active session.');
      testPassed++;
    } else {
      console.error('  [FAIL] Pending resident login allowed or unexpected status:', loginPending.status, loginPending.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Admin A views registration requests for Society A
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Admin A fetches registration requests for Society A...');
    const resReqsA = await req(`${API_BASE}/admin/registration-requests`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    if (resReqsA.status === 200 && resReqsA.data.success) {
      const foundRes1 = resReqsA.data.data.find(u => u.email === residentEmail1);
      if (foundRes1) {
        console.log(`  -> Found resident "${foundRes1.name}" in Society A pending list (total: ${resReqsA.data.count})`);
        console.log('  [PASS] Admin receives pending registration requests scoped to their society.');
        testPassed++;
      } else {
        console.error('  [FAIL] Resident 1 not found in Admin A pending requests list');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Admin A could not fetch registration requests:', resReqsA.status, resReqsA.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Cross-society admin isolation (Admin B CANNOT see or approve Resident A)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Cross-society isolation check (Admin B attempts to access/approve Resident A)...');
    // Admin B requests list
    const resReqsB = await req(`${API_BASE}/admin/registration-requests`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });
    const foundInB = resReqsB.data.data?.find(u => u.email === residentEmail1);

    if (!foundInB) {
      console.log('  -> Resident A is NOT visible in Admin B pending list.');
    } else {
      console.error('  [FAIL] Resident A leaked into Admin B registration list!');
      testFailed++;
    }

    // Admin B attempts to approve Resident A
    const resCrossApprove = await req(`${API_BASE}/admin/registration-requests/${res1.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });

    if (resCrossApprove.status === 403 && resCrossApprove.data.error.includes('another society')) {
      console.log('  -> Cross-society approval blocked with HTTP 403:', resCrossApprove.data.error);
      console.log('  [PASS] Cross-society approval strictly forbidden.');
      testPassed++;
    } else {
      console.error('  [FAIL] Admin B was not blocked from approving Resident A:', resCrossApprove.status, resCrossApprove.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 10: Resident cannot approve requests (Role RBAC)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] Non-admin RBAC check (Resident demo account attempts approval)...');
    const demoResLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'residenta@society.com', password: 'password123' })
    });
    const tokenDemoRes = demoResLogin.data.token;

    const resUnauthApprove = await req(`${API_BASE}/admin/registration-requests/${res1.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenDemoRes}` }
    });

    if (resUnauthApprove.status === 403) {
      console.log('  -> Resident role blocked with HTTP 403 from admin endpoint.');
      console.log('  [PASS] Resident role cannot approve requests.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident was not forbidden from approving:', resUnauthApprove.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 11: SecurityStaff cannot approve requests (Role RBAC)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 11] SecurityStaff RBAC check...');
    const demoStaffLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@society.com', password: 'password123' })
    });
    const tokenDemoStaff = demoStaffLogin.data.token;

    const staffUnauthApprove = await req(`${API_BASE}/admin/registration-requests/${res1.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenDemoStaff}` }
    });

    if (staffUnauthApprove.status === 403) {
      console.log('  -> SecurityStaff role blocked with HTTP 403 from admin endpoint.');
      console.log('  [PASS] SecurityStaff role cannot approve requests.');
      testPassed++;
    } else {
      console.error('  [FAIL] SecurityStaff was not forbidden from approving:', staffUnauthApprove.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 12: Correct Society Admin approves the request
    // -------------------------------------------------------------------------
    console.log('\n[TEST 12] Admin A approves Resident A...');
    const resApprove = await req(`${API_BASE}/admin/registration-requests/${res1.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    if (resApprove.status === 200 && resApprove.data.success && resApprove.data.data.status === 'Active') {
      const dbApproved = await User.findById(res1.data.user.id);
      if (dbApproved && dbApproved.status === 'Active') {
        console.log(`  -> Status updated to "${dbApproved.status}"`);
        console.log('  [PASS] Resident request successfully approved.');
        testPassed++;
      } else {
        console.error('  [FAIL] DB status not updated to Active');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Admin A could not approve request:', resApprove.status, resApprove.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 13: Approved Resident can now log in and access /resident
    // -------------------------------------------------------------------------
    console.log('\n[TEST 13] Approved Resident logs in...');
    const loginApproved = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: residentEmail1, password: 'ResidentPassword123!' })
    });

    if (loginApproved.status === 200 && loginApproved.data.success && loginApproved.data.user.status === 'Active') {
      console.log(`  -> Login success! Role: ${loginApproved.data.user.role}, Status: ${loginApproved.data.user.status}`);
      // Access protected endpoint
      const meRes = await req(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginApproved.data.token}` }
      });
      if (meRes.status === 200 && meRes.data.data.role === 'Resident') {
        console.log('  -> Protected GET /api/auth/me accessed successfully.');
        console.log('  [PASS] Approved Resident has full operational access.');
        testPassed++;
      } else {
        console.error('  [FAIL] Failed to access protected API after approval');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Approved resident login failed:', loginApproved.status, loginApproved.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 14: Repeated approval on already Active resident is prevented
    // -------------------------------------------------------------------------
    console.log('\n[TEST 14] Attempt repeated approval on already Active resident...');
    const resRepeatApprove = await req(`${API_BASE}/admin/registration-requests/${res1.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    if (resRepeatApprove.status === 400 && resRepeatApprove.data.error.includes('already approved')) {
      console.log('  -> Correctly blocked repeated transition with HTTP 400:', resRepeatApprove.data.error);
      console.log('  [PASS] Invalid state transitions prevented.');
      testPassed++;
    } else {
      console.error('  [FAIL] Repeated approval was not blocked:', resRepeatApprove.status, resRepeatApprove.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 15: Rejection workflow and Rejected Resident blocked from login
    // -------------------------------------------------------------------------
    console.log('\n[TEST 15] Test Rejection workflow...');
    // Create another resident in Society A to reject
    const rejectEmail = `reject_${Date.now()}@testres.com`;
    const resToReject = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Reject Candidate',
        email: rejectEmail,
        mobile: '9876543225',
        flatNumber: 'A-305',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    createdUserIds.push(resToReject.data.user.id);

    // Reject by Admin A
    const rejectRes = await req(`${API_BASE}/admin/registration-requests/${resToReject.data.user.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    if (rejectRes.status === 200 && rejectRes.data.data.status === 'Rejected') {
      console.log('  -> Resident successfully rejected by society admin.');
      
      // Attempt login by rejected resident
      const loginRejected = await req(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: rejectEmail, password: 'Password123!' })
      });

      if (loginRejected.status === 403 && loginRejected.data.error.includes('rejected')) {
        console.log('  -> Rejected resident login blocked with HTTP 403:', loginRejected.data.error);
        console.log('  [PASS] Rejection workflow and login prevention verified.');
        testPassed++;
      } else {
        console.error('  [FAIL] Rejected user was able to log in:', loginRejected.status, loginRejected.data);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Admin A could not reject registration:', rejectRes.status, rejectRes.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 16: Existing demo logins continue working
    // -------------------------------------------------------------------------
    console.log('\n[TEST 16] Verify existing demo accounts (Admin, Resident, SecurityStaff)...');
    const demoAccounts = [
      { role: 'Admin', email: 'admin@society.com', password: 'password123' },
      { role: 'Resident', email: 'residenta@society.com', password: 'password123' },
      { role: 'SecurityStaff', email: 'staff@society.com', password: 'password123' }
    ];

    let allDemoWorking = true;
    for (const demo of demoAccounts) {
      const demoRes = await req(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: demo.email, password: demo.password })
      });
      if (demoRes.status === 200 && demoRes.data.user.role === demo.role && demoRes.data.user.status === 'Active') {
        console.log(`  -> Demo ${demo.role} (${demo.email}): SUCCESS (Status: ${demoRes.data.user.status})`);
      } else {
        console.error(`  -> Demo ${demo.role} login failed!`, demoRes.status, demoRes.data);
        allDemoWorking = false;
      }
    }

    if (allDemoWorking) {
      console.log('  [PASS] All existing demo accounts remain 100% functional.');
      testPassed++;
    } else {
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 17: Legacy Green Valley Society and data integrity preserved
    // -------------------------------------------------------------------------
    console.log('\n[TEST 17] Verify legacy Green Valley Society data intact...');
    const legacySoc = await Society.findOne({ name: 'Green Valley Society' });
    if (legacySoc) {
      const userCount = await User.countDocuments({ societyId: legacySoc._id });
      console.log(`  -> Green Valley Society found: ${legacySoc._id}, Associated Users: ${userCount}`);
      if (userCount >= 14) {
        console.log('  [PASS] Legacy society data intact.');
        testPassed++;
      } else {
        console.error('  [FAIL] Expected at least 14 legacy users in Green Valley Society');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Legacy Green Valley Society not found in DB!');
      testFailed++;
    }

  } catch (err) {
    console.error('GLOBAL TEST SUITE ERROR:', err);
  } finally {
    console.log('\n[CLEANUP] Removing test-created records from DB...');
    if (createdSocietyIds.length > 0) {
      await Society.deleteMany({ _id: { $in: createdSocietyIds } });
      console.log(`  -> Deleted ${createdSocietyIds.length} test societies.`);
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`  -> Deleted ${createdUserIds.length} test users.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');

    console.log('====================================================');
    console.log(`PHASE 4 TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('====================================================');

    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runPhase4Tests();
