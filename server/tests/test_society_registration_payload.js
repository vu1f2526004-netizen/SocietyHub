/**
 * Society Registration Payload & Field Mapping Verification Suite
 * Verifies exact frontend-to-backend payload contracts, field aliases, and validation responses.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { registerSociety } = require('../src/controllers/authController');

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
console.log('SOCIETY REGISTRATION PAYLOAD & FIELD MAPPING VERIFICATION');
console.log('=============================================================\n');

// Mock request / response helper
function createMockContext(body) {
  let nextCalledWith = null;
  let statusSet = null;
  let jsonSent = null;

  const req = { body };
  const res = {
    status(code) {
      statusSet = code;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    }
  };
  const next = (err) => {
    nextCalledWith = err;
  };

  return { req, res, next, getError: () => nextCalledWith, getStatus: () => statusSet, getJson: () => jsonSent };
}

// 1. Verify frontend RegisterSociety.jsx source generates the exact expected payload
test('Frontend RegisterSociety.jsx constructs sanitized payload with all required fields', () => {
  const code = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/RegisterSociety.jsx'), 'utf8');
  assert(code.includes('societyName: formData.societyName.trim()'), 'Must map societyName');
  assert(code.includes('address: (formData.address || formData.streetAddress'), 'Must map address from address or streetAddress');
  assert(code.includes('city: formData.city.trim()'), 'Must map city');
  assert(code.includes('state: formData.state.trim()'), 'Must map state');
  assert(code.includes('postalCode: (formData.postalCode'), 'Must map postalCode');
  assert(code.includes('name: (formData.name'), 'Must map secretary name');
  assert(code.includes('email: formData.email.trim().toLowerCase()'), 'Must normalize email');
  assert(code.includes('mobile: (formData.mobile'), 'Must map mobile');
});

// 2. Verify all five required society fields reach validator and missing ones fail with 400
asyncTest('Validation: Missing societyName returns HTTP 400', async () => {
  const ctx = createMockContext({
    address: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('societyName, address, city, state, postalCode'));
});

asyncTest('Validation: Missing address returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('societyName, address, city, state, postalCode'));
});

asyncTest('Validation: Missing city returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('societyName, address, city, state, postalCode'));
});

asyncTest('Validation: Missing state returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    city: 'Mumbai',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('societyName, address, city, state, postalCode'));
});

asyncTest('Validation: Missing postalCode returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('societyName, address, city, state, postalCode'));
});

asyncTest('Validation: Missing secretary field (password) returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected ErrorResponse to be passed to next');
  assert.strictEqual(err.statusCode, 400);
  assert(err.message.includes('name, email, mobile, password'));
});

// 3. Verify field aliases (streetAddress, pincode, phone, secretaryName)
asyncTest('Field Aliases: streetAddress and pincode map successfully to address and postalCode', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    streetAddress: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    secretaryName: 'Rajesh Sharma',
    email: 'invalid-email-to-stop-at-email-check',
    phone: '9876543210',
    password: 'securePassword123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  // If society fields and secretary fields were accepted, it progresses past required fields to email format check
  assert(err, 'Expected validation error');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.message, 'Please provide a valid email address');
});

// 4. Verify nested society/secretary structure mapping
asyncTest('Nested Payload: society and secretary objects map successfully', async () => {
  const ctx = createMockContext({
    society: {
      name: 'Palm Heights',
      address: '123 Palm Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001'
    },
    secretary: {
      name: 'Rajesh Sharma',
      email: 'invalid-email-to-stop-at-email-check',
      mobile: '9876543210',
      password: 'securePassword123'
    }
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err, 'Expected validation error at email check');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.message, 'Please provide a valid email address');
});

// 5. Verify password policy & confirm password check
asyncTest('Validation: Short password (<6 chars) returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: '123'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err);
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.message, 'Password must be at least 6 characters long');
});

asyncTest('Validation: Password mismatch returns HTTP 400', async () => {
  const ctx = createMockContext({
    societyName: 'Palm Heights',
    address: '123 Palm Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    name: 'Rajesh Sharma',
    email: 'rajesh@society.com',
    mobile: '9876543210',
    password: 'securePassword123',
    confirmPassword: 'differentPassword456'
  });

  await registerSociety(ctx.req, ctx.res, ctx.next);
  const err = ctx.getError();
  assert(err);
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.message, 'Confirm Password does not match Password');
});

// 6. Verify shared API client usage and Render endpoint resolution
test('Registration handler strictly routes through shared API client with Render backend target', () => {
  const regCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/RegisterSociety.jsx'), 'utf8');
  assert(regCode.includes('useContext(AuthContext)'), 'RegisterSociety must consume AuthContext');
  assert(regCode.includes('await registerSociety(registrationPayload)'), 'RegisterSociety must call registerSociety');

  const authCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/context/AuthContext.jsx'), 'utf8');
  assert(authCode.includes("import api, { getAuthToken, getActiveRoleFromPath } from '../services/api'"), 'AuthContext must import shared api');
  assert(authCode.includes("await api.post('/auth/register-society', societyData)"), 'registerSociety must call api.post on shared api instance');

  const apiCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/services/api.js'), 'utf8');
  assert(apiCode.includes('import.meta.env.VITE_BASE_URL'), 'api.js must check VITE_BASE_URL');
  assert(apiCode.includes('https://societyhub-api-2eoh.onrender.com/api'), 'api.js must target Render origin');
  assert(!apiCode.includes("return '/api';\n  }\n  return 'http://localhost:5000/api';"), 'Must not silently fall back to relative /api on Vercel');

  const vercelJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../client/vercel.json'), 'utf8'));
  const apiProxy = vercelJson.rewrites.find(r => r.source === '/api/:path*');
  assert(apiProxy, 'vercel.json must have /api/:path* reverse-proxy rule');
  assert.strictEqual(apiProxy.destination, 'https://societyhub-api-2eoh.onrender.com/api/:path*');
});

setTimeout(() => {
  console.log('\n=============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');
  if (failed > 0) process.exit(1);
}, 200);

