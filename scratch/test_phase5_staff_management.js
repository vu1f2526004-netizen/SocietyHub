const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('    MULTI-SOCIETY PHASE 5 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB directly for assertion verification.\n');

  const Society = mongoose.model('Society', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const createdSocietyIds = [];
  const createdUserIds = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create two test societies with their own admins for cross-society tests
    // -------------------------------------------------------------------------
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

    console.log(`Setup complete. Society A: "${societyA.name}", Society B: "${societyB.name}"\n`);

    // -------------------------------------------------------------------------
    // TEST 1, 2, 3: Admin A creates a SecurityStaff account successfully
    // Role = SecurityStaff, SocietyId = societyA.id, Sanitized response (no password)
    // -------------------------------------------------------------------------
    console.log('[TEST 1-3] Admin A creates a SecurityStaff account...');
    const staffEmail1 = `staff1_${Date.now()}@testguard.com`;
    const staffPassword1 = 'GuardPassword123!';
    const createRes1 = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Ramesh Patil Guard',
        email: staffEmail1,
        mobile: '9876543230',
        phone: '022-23456789',
        password: staffPassword1,
        confirmPassword: staffPassword1
      })
    });

    if (createRes1.status === 201 && createRes1.data.success && createRes1.data.data) {
      const createdStaff = createRes1.data.data;
      createdUserIds.push(createdStaff.id);

      const dbStaff = await User.findById(createdStaff.id).select('+password');
      const isRoleCorrect = createdStaff.role === 'SecurityStaff' && dbStaff.role === 'SecurityStaff';
      const isSocietyCorrect = String(createdStaff.societyId) === String(societyA.id) && String(dbStaff.societyId) === String(societyA.id);
      const isPasswordSanitized = createRes1.data.data.password === undefined;

      if (isRoleCorrect && isSocietyCorrect && isPasswordSanitized) {
        console.log(`  -> Status 201, Role: ${createdStaff.role}, SocietyId: ${createdStaff.societyId}`);
        console.log(`  -> Response password sanitized: ${isPasswordSanitized}`);
        console.log('  [PASS] SecurityStaff account created with correct role and society association.');
        testPassed++;
      } else {
        console.error('  [FAIL] Role or societyId incorrect:', createdStaff);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Admin staff creation failed:', createRes1.status, createRes1.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate email is rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Duplicate staff email is rejected...');
    const dupRes = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Duplicate Guard',
        email: staffEmail1, // existing email from Test 1
        mobile: '9876543231',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    if (dupRes.status === 400 && dupRes.data.error.includes('already exists')) {
      console.log('  -> Duplicate rejected with HTTP 400:', dupRes.data.error);
      console.log('  [PASS] Duplicate email strictly rejected.');
      testPassed++;
    } else {
      console.error('  [FAIL] Duplicate email was not rejected:', dupRes.status, dupRes.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 5 & 6: Role & Society tampering prevention
    // Client supplies role=Admin and societyId=societyB.id
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5 & 6] Role and SocietyId tampering prevention...');
    const tamperEmail = `staff_tamper_${Date.now()}@testguard.com`;
    const tamperRes = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Tamper Guard',
        email: tamperEmail,
        mobile: '9876543232',
        role: 'Admin', // Forged role
        societyId: societyB.id, // Forged society
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    if (tamperRes.status === 201 && tamperRes.data.success) {
      createdUserIds.push(tamperRes.data.data.id);
      const dbTamper = await User.findById(tamperRes.data.data.id);
      if (dbTamper.role === 'SecurityStaff' && String(dbTamper.societyId) === String(societyA.id)) {
        console.log(`  -> Client supplied role="Admin", societyId="${societyB.id}".`);
        console.log(`  -> Server stored role="${dbTamper.role}", societyId="${dbTamper.societyId}" (matches Society A).`);
        console.log('  [PASS] Backend enforced SecurityStaff role and Admin societyId.');
        testPassed++;
      } else {
        console.error('  [FAIL] Tampering succeeded in DB:', dbTamper);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Tamper request failed unexpectedly:', tamperRes.status, tamperRes.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Resident cannot create staff (RBAC check)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Non-admin RBAC check (Resident attempts staff creation)...');
    const demoResLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'residenta@society.com', password: 'password123' })
    });
    const tokenDemoRes = demoResLogin.data.token;

    const resAttempt = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDemoRes}` },
      body: JSON.stringify({
        name: 'Resident Created Staff',
        email: `res_staff_${Date.now()}@testguard.com`,
        mobile: '9876543233',
        password: 'Password123!'
      })
    });

    if (resAttempt.status === 403) {
      console.log('  -> Resident blocked with HTTP 403 Forbidden.');
      console.log('  [PASS] Resident role cannot create Staff.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident was not blocked from creating staff:', resAttempt.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 8: SecurityStaff cannot create staff accounts (RBAC check)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] SecurityStaff attempts staff creation...');
    const demoStaffLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@society.com', password: 'password123' })
    });
    const tokenDemoStaff = demoStaffLogin.data.token;

    const staffAttempt = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDemoStaff}` },
      body: JSON.stringify({
        name: 'Staff Created Staff',
        email: `staff_staff_${Date.now()}@testguard.com`,
        mobile: '9876543234',
        password: 'Password123!'
      })
    });

    if (staffAttempt.status === 403) {
      console.log('  -> SecurityStaff blocked with HTTP 403 Forbidden.');
      console.log('  [PASS] SecurityStaff role cannot create Staff accounts.');
      testPassed++;
    } else {
      console.error('  [FAIL] SecurityStaff was not blocked from creating staff:', staffAttempt.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Cross-society isolation: Admin B cannot list or manage Society A's staff
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Cross-society isolation check...');
    // Admin B lists staff
    const listResB = await req(`${API_BASE}/admin/staff`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });
    const foundInB = listResB.data.data?.find(s => s.email === staffEmail1);

    if (!foundInB) {
      console.log('  -> Society A Staff is NOT visible in Society B Staff list.');
    } else {
      console.error('  [FAIL] Society A Staff leaked to Society B list!');
      testFailed++;
    }

    // Admin B attempts to update Society A Staff
    const crossUpdate = await req(`${API_BASE}/admin/staff/${createRes1.data.data.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({ name: 'Hacked Name' })
    });

    // Admin B attempts to toggle status of Society A Staff
    const crossStatus = await req(`${API_BASE}/admin/staff/${createRes1.data.data.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({ status: 'Suspended' })
    });

    if (crossUpdate.status === 403 && crossStatus.status === 403) {
      console.log('  -> Cross-society update blocked with HTTP 403.');
      console.log('  -> Cross-society status toggle blocked with HTTP 403.');
      console.log('  [PASS] Cross-society staff management strictly forbidden.');
      testPassed++;
    } else {
      console.error('  [FAIL] Admin B was not blocked from managing Society A staff:', crossUpdate.status, crossStatus.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 10: Password is stored as a bcrypt hash in DB
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] Verify bcrypt hash in database...');
    const dbStaffUser = await User.findById(createRes1.data.data.id).select('+password');
    const isBcrypt = dbStaffUser.password && dbStaffUser.password.startsWith('$2') && dbStaffUser.password.length >= 60;
    const bcryptMatches = await bcrypt.compare(staffPassword1, dbStaffUser.password);

    if (isBcrypt && bcryptMatches) {
      console.log(`  -> Stored hash prefix: ${dbStaffUser.password.substring(0, 7)}... (length: ${dbStaffUser.password.length})`);
      console.log(`  -> bcrypt.compare matches raw password: ${bcryptMatches}`);
      console.log('  [PASS] Password stored as bcrypt hash.');
      testPassed++;
    } else {
      console.error('  [FAIL] Password hash verification failed:', dbStaffUser.password);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 11: Staff login and authentication
    // -------------------------------------------------------------------------
    console.log('\n[TEST 11] Newly created staff logs in...');
    const loginStaff = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staffEmail1, password: staffPassword1 })
    });

    if (loginStaff.status === 200 && loginStaff.data.user.role === 'SecurityStaff') {
      console.log(`  -> Login success! Role: ${loginStaff.data.user.role}, Society: ${loginStaff.data.user.societyId}`);
      
      // Access gate visitors endpoint (allowed for staff)
      const gateVis = await req(`${API_BASE}/visitors`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginStaff.data.token}` }
      });
      console.log(`  -> Staff accesses gate visitors endpoint: HTTP ${gateVis.status}`);

      // Attempt access to admin endpoint (forbidden)
      const adminAttempt = await req(`${API_BASE}/admin/staff`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginStaff.data.token}` }
      });
      console.log(`  -> Staff blocked from admin staff endpoint: HTTP ${adminAttempt.status}`);

      if (adminAttempt.status === 403) {
        console.log('  [PASS] Staff login succeeds and RBAC restrictions hold.');
        testPassed++;
      } else {
        console.error('  [FAIL] Staff was not blocked from admin endpoint');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Staff login failed:', loginStaff.status, loginStaff.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 12: Account suspension (deactivation) and reactivation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 12] Account suspension and reactivation...');
    // Admin A suspends staff
    const suspendRes = await req(`${API_BASE}/admin/staff/${createRes1.data.data.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({ status: 'Suspended' })
    });

    if (suspendRes.status === 200 && suspendRes.data.data.status === 'Suspended') {
      console.log('  -> Staff status updated to Suspended.');

      // Attempt login by suspended staff
      const loginSuspended = await req(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: staffEmail1, password: staffPassword1 })
      });

      if (loginSuspended.status === 403 && loginSuspended.data.error.includes('suspended')) {
        console.log('  -> Suspended staff login blocked with HTTP 403:', loginSuspended.data.error);

        // Reactivate staff
        const activateRes = await req(`${API_BASE}/admin/staff/${createRes1.data.data.id}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tokenAdminA}` },
          body: JSON.stringify({ status: 'Active' })
        });

        if (activateRes.status === 200 && activateRes.data.data.status === 'Active') {
          console.log('  -> Staff account reactivated to Active.');
          console.log('  [PASS] Staff suspension and reactivation workflow verified.');
          testPassed++;
        } else {
          console.error('  [FAIL] Failed to reactivate staff:', activateRes.status, activateRes.data);
          testFailed++;
        }
      } else {
        console.error('  [FAIL] Suspended staff was able to login:', loginSuspended.status, loginSuspended.data);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Admin could not suspend staff:', suspendRes.status, suspendRes.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 13: Staff Details Update (Name, Mobile, Phone)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 13] Admin A updates staff details...');
    const updateRes = await req(`${API_BASE}/admin/staff/${createRes1.data.data.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Ramesh Patil Senior Guard',
        mobile: '9876543999',
        phone: 'Gate 1 Intercom'
      })
    });

    if (updateRes.status === 200 && updateRes.data.data.name === 'Ramesh Patil Senior Guard' && updateRes.data.data.mobile === '9876543999') {
      console.log('  -> Updated name and mobile successfully.');
      console.log('  [PASS] Permitted staff updates verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Staff update failed:', updateRes.status, updateRes.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 14: Existing demo logins continue working
    // -------------------------------------------------------------------------
    console.log('\n[TEST 14] Verify existing demo accounts (Admin, Resident, SecurityStaff)...');
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
    // TEST 15: Legacy Green Valley Society and data integrity preserved
    // -------------------------------------------------------------------------
    console.log('\n[TEST 15] Verify legacy Green Valley Society data intact...');
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
    console.log(`PHASE 5 TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('====================================================');

    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runPhase5Tests();
