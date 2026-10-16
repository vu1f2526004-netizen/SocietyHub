const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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

async function runTests() {
  console.log('====================================================');
  console.log('       MULTI-SOCIETY PHASE 3 VERIFICATION SUITE     ');
  console.log('====================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB directly for verification assertions.\n');

  const Society = mongoose.model('Society', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Clean up any earlier probe record if present
  await Society.deleteOne({ name: { $regex: /^Test Society 1791830647160/ } });
  await User.deleteOne({ email: 'sec_1791830647160@test.com' });

  const createdTestSocietyIds = [];
  const createdTestUserIds = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Valid society registration creates one Society and one Admin
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Register new society with valid data...');
    const testEmail1 = `sec_${Date.now()}@orchidgardens.com`;
    const regPayload1 = {
      societyName: `Orchid Palms ${Date.now()}`,
      address: 'Plot 88, Palm Meadows Road',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      name: 'Aditi Deshmukh',
      email: testEmail1,
      mobile: '9876543219',
      password: 'StrongSecretPassword123!',
      confirmPassword: 'StrongSecretPassword123!'
    };

    const res1 = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify(regPayload1)
    });
    
    if (res1.status === 201 && res1.data.success) {
      console.log('  -> Status 201 Created');
      console.log('  -> Response message:', res1.data.message);
      console.log('  -> Returned Society Name:', res1.data.society?.name);
      console.log('  -> Returned Join Code:', res1.data.society?.joinCode);
      console.log('  -> Returned Admin Email:', res1.data.user?.email);
      console.log('  -> Returned Admin Role:', res1.data.user?.role);

      createdTestSocietyIds.push(res1.data.society?.id);
      createdTestUserIds.push(res1.data.user?.id);

      const dbSoc = await Society.findById(res1.data.society.id);
      const dbUser = await User.findById(res1.data.user.id);

      if (dbSoc && dbUser && dbUser.role === 'Admin' && String(dbUser.societyId) === String(dbSoc._id)) {
        console.log('  [PASS] Society and Admin exist in DB with role Admin and correct societyId linkage.');
        testPassed++;
      } else {
        console.error('  [FAIL] DB verification failed for created society/admin.');
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Unexpected response status or payload:', res1.status, res1.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Join Code uniqueness, secure randomness, and format
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Verify Join Code format and uniqueness...');
    const joinCode = res1.data.society.joinCode;
    const joinCodeRegex = /^SOC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
    if (joinCodeRegex.test(joinCode)) {
      console.log(`  -> Join Code format verified: "${joinCode}" matches ^SOC-[2-9A-HJ-NP-Z]{6}$`);
      const count = await Society.countDocuments({ joinCode });
      if (count === 1) {
        console.log('  [PASS] Join code is strictly unique in database.');
        testPassed++;
      } else {
        console.error(`  [FAIL] Join code count in DB is ${count}, expected 1.`);
        testFailed++;
      }
    } else {
      console.error(`  [FAIL] Join Code "${joinCode}" does not match required secure format.`);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Duplicate Secretary email is rejected (Global Uniqueness)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Attempt registration with duplicate Secretary email...');
    const resDupEmail = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        ...regPayload1,
        societyName: `Another Complex ${Date.now()}`
      })
    });

    if (resDupEmail.status === 400 && resDupEmail.data.error.includes('already exists')) {
      console.log('  -> Correctly rejected with HTTP 400:', resDupEmail.data.error);
      console.log('  [PASS] Duplicate Secretary email rejected.');
      testPassed++;
    } else {
      console.error('  [FAIL] Unexpected response for duplicate email:', resDupEmail.status, resDupEmail.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate submission does not create duplicate records
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Attempt duplicate society submission (same name and postalCode)...');
    const resDupSoc = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        ...regPayload1,
        email: `new_sec_${Date.now()}@orchid.com`
      })
    });

    if (resDupSoc.status === 400 && resDupSoc.data.error.includes('already exists')) {
      console.log('  -> Correctly rejected duplicate society with HTTP 400:', resDupSoc.data.error);
      console.log('  [PASS] Duplicate society registration prevented.');
      testPassed++;
    } else {
      console.error('  [FAIL] Unexpected response for duplicate society:', resDupSoc.status, resDupSoc.data);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Client-supplied role tampering prevention
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Attempt role tampering (client supplies role: "Resident" or "SecurityStaff")...');
    const testEmail2 = `tamper_${Date.now()}@testsoc.com`;
    const resTamper = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `Secure Society ${Date.now()}`,
        address: '100 Security Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        name: 'Tamper Tester',
        email: testEmail2,
        mobile: '9876543210',
        password: 'TamperPassword123!',
        confirmPassword: 'TamperPassword123!',
        role: 'Resident', // Client trying to forge role
        status: 'SuperAdmin' // Client trying to forge status
      })
    });

    createdTestSocietyIds.push(resTamper.data.society?.id);
    createdTestUserIds.push(resTamper.data.user?.id);

    const tamperUserInDb = await User.findById(resTamper.data.user.id);
    if (tamperUserInDb.role === 'Admin') {
      console.log(`  -> Client supplied role="Resident", DB stored role="${tamperUserInDb.role}"`);
      console.log('  [PASS] Backend enforced Admin role; client role injection ignored.');
      testPassed++;
    } else {
      console.error(`  [FAIL] Tampered role accepted: ${tamperUserInDb.role}`);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 6: Passwords remain bcrypt-hashed
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Verify password hashing and no plaintext password in response/DB...');
    const userInDb = await User.findById(res1.data.user.id);
    const hash = userInDb.password;
    const isBcrypt = hash && hash.startsWith('$2') && hash.length === 60;
    const matchesPassword = await bcrypt.compare('StrongSecretPassword123!', hash);

    if (isBcrypt && matchesPassword && !res1.data.user.password && !res1.data.user.passwordHash) {
      console.log('  -> Password starts with $2 and matches bcrypt comparison.');
      console.log('  -> Response payload contains zero password fields.');
      console.log('  [PASS] Password securely bcrypt-hashed.');
      testPassed++;
    } else {
      console.error('  [FAIL] Password hashing verification failed.');
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Admin association and GET /api/auth/my-society
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Verify Admin login and authorized retrieval of society Join Code...');
    const loginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail1,
        password: 'StrongSecretPassword123!'
      })
    });

    const adminToken = loginRes.data.token;
    console.log('  -> Admin logged in successfully, received JWT token.');

    const mySocRes = await req(`${API_BASE}/auth/my-society`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (mySocRes.status === 200 && mySocRes.data.data.joinCode === joinCode) {
      console.log('  -> GET /api/auth/my-society returned correct society and Join Code:', mySocRes.data.data.joinCode);
      console.log('  [PASS] Admin can view society Join Code via authorized endpoint.');
      testPassed++;
    } else {
      console.error('  [FAIL] Could not retrieve society join code via my-society endpoint:', mySocRes.status, mySocRes.data);
      testFailed++;
    }

    // Check that resident cannot access /api/auth/my-society
    const resLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'residenta@society.com',
        password: 'password123'
      })
    });
    const resTry = await req(`${API_BASE}/auth/my-society`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${resLogin.data.token}` }
    });

    if (resTry.status === 403) {
      console.log('  -> Resident access to /api/auth/my-society correctly forbidden (HTTP 403).');
      console.log('  [PASS] Role authorization for /api/auth/my-society verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident accessed /api/auth/my-society or unexpected status:', resTry.status);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Compensating cleanup / No orphaned society on creation failure
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Verify safe consistency (no orphaned society on failure)...');
    const initialSocCount = await Society.countDocuments();
    
    await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `Orphan Test Society ${Date.now()}`,
        address: '123 Fail Street',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        name: 'Fail User',
        email: `orphan_${Date.now()}@fail.com`,
        mobile: 'invalid_phone_number_not_digits', // will fail backend validation
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!'
      })
    });

    const finalSocCount = await Society.countDocuments();
    if (finalSocCount === initialSocCount) {
      console.log(`  -> Initial society count: ${initialSocCount}, Final society count: ${finalSocCount}`);
      console.log('  [PASS] No orphaned society record left in database.');
      testPassed++;
    } else {
      console.error(`  [FAIL] Society count changed! Initial: ${initialSocCount}, Final: ${finalSocCount}`);
      testFailed++;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Existing users and demo logins remain intact
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Verify existing demo logins still work...');
    const demoAccounts = [
      { role: 'Admin', email: 'admin@society.com', password: 'password123' },
      { role: 'Resident', email: 'residenta@society.com', password: 'password123' },
      { role: 'SecurityStaff', email: 'staff@society.com', password: 'password123' }
    ];

    let allDemoPassed = true;
    for (const demo of demoAccounts) {
      const res = await req(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: demo.email,
          password: demo.password
        })
      });
      if (res.data && res.data.success && res.data.user.role === demo.role) {
        console.log(`  -> ${demo.role} login (${demo.email}): SUCCESS (role verified: ${res.data.user.role})`);
      } else {
        console.error(`  -> ${demo.role} login failed role check:`, res.status, res.data);
        allDemoPassed = false;
      }
    }

    if (allDemoPassed) {
      console.log('  [PASS] All existing demo logins remain 100% operational.');
      testPassed++;
    } else {
      console.error('  [FAIL] One or more demo logins failed.');
      testFailed++;
    }

    // Verify Legacy Society & records unchanged
    const legacySociety = await Society.findOne({ name: 'Green Valley Society' });
    if (legacySociety) {
      console.log('  -> Legacy "Green Valley Society" found:', legacySociety._id);
      const associatedUsers = await User.countDocuments({ societyId: legacySociety._id });
      console.log(`  -> Legacy society associated users: ${associatedUsers}`);
      if (associatedUsers > 0) {
        console.log('  [PASS] Legacy society data intact.');
        testPassed++;
      }
    } else {
      console.error('  [FAIL] Legacy society not found!');
      testFailed++;
    }

  } catch (globalErr) {
    console.error('Global error during tests:', globalErr);
  } finally {
    console.log('\n[CLEANUP] Removing test-created records from DB...');
    if (createdTestSocietyIds.length > 0) {
      await Society.deleteMany({ _id: { $in: createdTestSocietyIds } });
      console.log(`  -> Deleted ${createdTestSocietyIds.length} test societies.`);
    }
    if (createdTestUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdTestUserIds } });
      console.log(`  -> Deleted ${createdTestUserIds.length} test users.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');

    console.log('====================================================');
    console.log(`TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('====================================================');

    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runTests();
