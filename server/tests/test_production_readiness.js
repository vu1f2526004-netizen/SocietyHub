/**
 * SocietyHub Production Readiness Verification Suite
 * Verifies security hardenings, CORS rules, error masking, payment bypass defenses, and API configuration.
 */

const assert = require('assert');
const crypto = require('crypto');
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
console.log('SOCIETYHUB PRODUCTION READINESS VERIFICATION SUITE');
console.log('=============================================================\n');

// 1. Payment Controller: Verification & Mock Signature Defense
test('PaymentController: verifyPayment forbids mock_signature in production mode', () => {
  const paymentCtrlCode = fs.readFileSync(path.resolve(__dirname, '../src/controllers/paymentController.js'), 'utf8');
  assert(paymentCtrlCode.includes('process.env.NODE_ENV !== \'production\''), 'Must strictly guard mock bypass by NODE_ENV');
  assert(paymentCtrlCode.includes('crypto.timingSafeEqual'), 'Must use constant-time crypto.timingSafeEqual for signature verification');
  assert(!paymentCtrlCode.includes('|| \'dummy_secret\''), 'Must not silently fall back to dummy_secret in production');
});

test('PaymentController: createOrder forbids mock orders in production mode', () => {
  const paymentCtrlCode = fs.readFileSync(path.resolve(__dirname, '../src/controllers/paymentController.js'), 'utf8');
  assert(paymentCtrlCode.includes('Payment gateway is not configured for production'), 'Must reject mock order creation in production');
});

// 2. Error Handler: Sensitive Data & Stack Disclosure Defense
test('ErrorHandler: Mask unhandled 500 errors in production', () => {
  const errorHandler = require('../src/middleware/error');
  
  // Set production environment temporarily
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const rawInternalError = new Error('MongoServerError: connection timed out to 10.0.0.45:27017 with credentials user:admin:secretpass');
  let resStatus = null;
  let resJson = null;
  const res = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(data) {
      resJson = data;
      return this;
    }
  };

  errorHandler(rawInternalError, {}, res, () => {});

  // Restore env
  process.env.NODE_ENV = origEnv;

  assert.strictEqual(resStatus, 500, 'Status must be 500');
  assert.strictEqual(resJson.success, false, 'Success must be false');
  assert(!resJson.error.includes('10.0.0.45'), 'Must NOT leak internal IP');
  assert(!resJson.error.includes('secretpass'), 'Must NOT leak passwords or database details');
  assert.strictEqual(resJson.error, 'An internal server error occurred. Please try again later.');
});

// 3. Server Configuration & CORS
test('Server: CORS and Helmet security headers configured', () => {
  const serverCode = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
  assert(serverCode.includes('crossOriginResourcePolicy'), 'Helmet must configure crossOriginResourcePolicy');
  assert(serverCode.includes('getCorsOptions'), 'CORS must have dynamic getCorsOptions function');
  assert(serverCode.includes('CLIENT_URL'), 'CORS must respect CLIENT_URL');
});

// 4. Client API Configuration & Localhost Elimination
test('Client API: getApiBaseUrl handles production relative path and environment overrides', () => {
  const apiCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/services/api.js'), 'utf8');
  assert(apiCode.includes('export const getApiBaseUrl'), 'api.js must export getApiBaseUrl');
  assert(apiCode.includes('import.meta.env.PROD'), 'api.js must check import.meta.env.PROD');
  assert(apiCode.includes('\'/api\''), 'api.js must default to /api in production when VITE_API_URL is unset');

  const docMgmtCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/Admin/DocumentsManagement.jsx'), 'utf8');
  assert(!docMgmtCode.includes('http://localhost:5000'), 'Admin DocumentsManagement must not hardcode localhost:5000');
  assert(docMgmtCode.includes('getApiBaseUrl()'), 'Admin DocumentsManagement must use getApiBaseUrl()');

  const resDocCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/Resident/ResidentDocuments.jsx'), 'utf8');
  assert(!resDocCode.includes('http://localhost:5000'), 'Resident Documents must not hardcode localhost:5000');
  assert(resDocCode.includes('getApiBaseUrl()'), 'Resident Documents must use getApiBaseUrl()');
});

// 5. Document Upload: Concurrency Lock & Cloudinary Cleanup
test('Document Management: Upload lock and Cloudinary cleanup are active', () => {
  const docMgmtCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/Admin/DocumentsManagement.jsx'), 'utf8');
  assert(docMgmtCode.includes('const [uploading, setUploading] = useState(false)'), 'Must have uploading state');
  assert(docMgmtCode.includes('disabled={uploading}'), 'Must disable submit button during upload');

  const docCtrlCode = fs.readFileSync(path.resolve(__dirname, '../../server/src/controllers/documentController.js'), 'utf8');
  assert(docCtrlCode.includes('cloudinary.uploader.destroy'), 'Must clean up file from Cloudinary on failed document creation');
});

// 6. Security Hygiene: Clean Environment Examples
test('Environment Examples: No real credentials in .env.example files', () => {
  const serverExample = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
  assert(!serverExample.includes('rzp_test_TQqqrrhwXEtLxG'), 'Must not contain real Razorpay key');
  assert(!serverExample.includes('aubECQDY49yylv3Ed7TgXixR'), 'Must not contain real Razorpay secret');
  assert(!serverExample.includes('9506910865'), 'Must not contain phone numbers in example');

  const clientExample = fs.readFileSync(path.resolve(__dirname, '../../client/.env.example'), 'utf8');
  assert(!clientExample.includes('rzp_test_TQqqrrhwXEtLxG'), 'Client example must not contain real Razorpay key');
});

console.log('\n=============================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('=============================================================\n');

if (failed > 0) {
  process.exit(1);
}

