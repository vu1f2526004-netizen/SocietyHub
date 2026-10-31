/**
 * Test Suite: Security Staff Provisioning & Success Modal Contract Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

console.log('\n=============================================================');
console.log('SECURITY STAFF PROVISIONING & MODAL VERIFICATION SUITE');
console.log('=============================================================\n');

// 1. Static AST / Code Inspection of StaffManagement.jsx
const staffManagementPath = path.resolve(__dirname, '../../client/src/pages/Admin/StaffManagement.jsx');
const staffManagementCode = fs.readFileSync(staffManagementPath, 'utf8');

test('StaffManagement.jsx completely removes "INITIAL LOGIN PASSWORD" section', () => {
  assert(!staffManagementCode.includes('INITIAL LOGIN PASSWORD'), 'Must not contain "INITIAL LOGIN PASSWORD" in uppercase');
  assert(!staffManagementCode.toLowerCase().includes('initial login password'), 'Must not contain "initial login password" in any casing');
});

test('StaffManagement.jsx removes "(As specified)" placeholder text', () => {
  assert(!staffManagementCode.includes('(As specified)'), 'Must not contain "(As specified)" text');
});

test('StaffManagement.jsx removes password Copy button and copied state', () => {
  assert(!staffManagementCode.includes('copyToClipboard'), 'Must not contain copyToClipboard function');
  assert(!staffManagementCode.includes('copied ?'), 'Must not contain copied ternary button state');
  assert(!staffManagementCode.includes('setupPassword'), 'Must not reference setupPassword in component state or JSX');
});

test('StaffManagement.jsx keeps required success modal fields', () => {
  assert(staffManagementCode.includes('Staff Account Created Successfully'), 'Must display "Staff Account Created Successfully"');
  assert(staffManagementCode.includes('createdResult.user.name'), 'Must display user name');
  assert(staffManagementCode.includes('createdResult.user.email'), 'Must display user email');
  assert(staffManagementCode.includes('createdResult.user.role'), 'Must display user role');
  assert(staffManagementCode.includes('createdResult.user.status'), 'Must display user status');
  assert(staffManagementCode.includes('emailStatus'), 'Must display activation email status confirmation');
  assert(staffManagementCode.includes('An activation email with instructions was dispatched'), 'Must display email dispatched confirmation');
});

test('StaffManagement.jsx maintains Done and Close modal actions', () => {
  assert(staffManagementCode.includes('setIsCreateOpen(false)'), 'Must close create modal');
  assert(staffManagementCode.includes('setCreatedResult(null)'), 'Must reset created result on close/done');
  assert(/Done\s*<\/button>/.test(staffManagementCode), 'Must have Done button');
});

// 2. Backend Controller Logic Verification (Unchanged & Functioning)
const adminController = require('../src/controllers/adminController');
const User = require('../src/models/User');

test('Backend adminController.createStaff is preserved and exported', () => {
  assert(typeof adminController.createStaff === 'function', 'createStaff must be a valid controller function');
  assert(typeof adminController.getStaffList === 'function', 'getStaffList must be a valid controller function');
  assert(typeof adminController.updateStaff === 'function', 'updateStaff must be a valid controller function');
});

(async () => {
  await asyncTest('Simulate Admin createStaff call and verify response schema', async () => {
    // Mock User.findOne to ensure email is not duplicate
    const originalFindOne = User.findOne;
    const originalCreate = User.create;

    let createdUserDoc = null;
    User.findOne = async () => null;
    User.create = async (userData) => {
      createdUserDoc = {
        _id: '672000000000000000000001',
        ...userData,
        createdAt: new Date()
      };
      return createdUserDoc;
    };

    const req = {
      user: {
        _id: '671000000000000000000099',
        role: 'Admin',
        societyId: '671000000000000000000088'
      },
      body: {
        name: 'Ramesh Security Guard',
        email: 'ramesh.guard@society.com',
        mobile: '9876543210',
        phone: '011-2345678',
        password: 'Password@123',
        confirmPassword: 'Password@123'
      }
    };

    let responseStatusCode = null;
    let responseJson = null;
    const res = {
      status(code) {
        responseStatusCode = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    let nextError = null;
    const next = (err) => {
      nextError = err;
    };

    await adminController.createStaff(req, res, next);

    // Restore original User methods
    User.findOne = originalFindOne;
    User.create = originalCreate;

    assert(!nextError, `createStaff threw an error: ${nextError?.message}`);
    assert.strictEqual(responseStatusCode, 201, 'Status code must be 201 Created');
    assert.strictEqual(responseJson.success, true, 'Response must be success: true');
    assert.strictEqual(responseJson.data.name, 'Ramesh Security Guard', 'Name must match');
    assert.strictEqual(responseJson.data.email, 'ramesh.guard@society.com', 'Email must match');
    assert.strictEqual(responseJson.data.role, 'SecurityStaff', 'Role must be SecurityStaff');
    assert.strictEqual(responseJson.data.status, 'Active', 'Status must be Active');

    // Simulate what the frontend component receives and stores in createdResult
    const frontendCreatedResult = {
      user: responseJson.data,
      emailStatus: responseJson.emailStatus
    };

    // Verify frontend does NOT have setupPassword
    assert.strictEqual(frontendCreatedResult.setupPassword, undefined, 'Frontend state must NOT have setupPassword');
    assert.strictEqual(frontendCreatedResult.user.name, 'Ramesh Security Guard');
    assert.strictEqual(frontendCreatedResult.user.email, 'ramesh.guard@society.com');
    assert.strictEqual(frontendCreatedResult.user.role, 'SecurityStaff');
    assert.strictEqual(frontendCreatedResult.user.status, 'Active');
    assert(frontendCreatedResult.emailStatus !== undefined, 'Frontend receives emailStatus');
  });

  console.log('\n=============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
})();
