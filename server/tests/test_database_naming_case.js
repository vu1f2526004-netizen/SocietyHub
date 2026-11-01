/**
 * Test Suite: MongoDB Database Naming & Casing Consistency Verification
 * 
 * Verifies:
 * 1. URI normalization helper correctly enforces exact 'studyHub' casing across all URI formats.
 * 2. Environment files (.env, .env.example) consistently specify 'studyHub'.
 * 3. No accidental useDb() calls or lowercase 'studyhub' references exist in server/src.
 * 4. Models and controllers adhere to single-database multi-society architecture.
 * 5. Multi-tenancy integrity is preserved without destructive operations.
 */

const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('DATABASE NAMING & CASING CONSISTENCY VERIFICATION SUITE');
console.log('================================================================\n');

// ----------------------------------------------------------------
// SECTION 1: URI Normalization Logic
// ----------------------------------------------------------------
console.log('SECTION 1: Mongo URI Normalization Logic');

const normalize = connectDB.normalizeMongoUri;
assert(typeof normalize === 'function', 'connectDB exports normalizeMongoUri function');

// Test 1.1: Atlas URI ending with /studyhub
const uri1 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyhub';
assert(normalize(uri1) === 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub', 'Normalizes lowercase /studyhub to /studyHub');

// Test 1.2: Atlas URI with query parameters
const uri2 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyhub?retryWrites=true&w=majority';
assert(normalize(uri2) === 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub?retryWrites=true&w=majority', 'Normalizes /studyhub with query parameters to /studyHub?...');

// Test 1.3: Uppercase /STUDYHUB
const uri3 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/STUDYHUB';
assert(normalize(uri3) === 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub', 'Normalizes uppercase /STUDYHUB to /studyHub');

// Test 1.4: Mixed case /studyHUB
const uri4 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHUB';
assert(normalize(uri4) === 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub', 'Normalizes mixed-case /studyHUB to /studyHub');

// Test 1.5: Trailing slash /studyhub/
const uri5 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyhub/';
assert(normalize(uri5) === 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub/', 'Normalizes trailing slash /studyhub/ to /studyHub/');

// Test 1.6: Already correct casing
const uri6 = 'mongodb+srv://user:pass@cluster0.0qwfjqc.mongodb.net/studyHub';
assert(normalize(uri6) === uri6, 'Preserves already correct /studyHub unchanged');

// Test 1.7: Unrelated database name
const uri7 = 'mongodb://localhost:27017/otherdb';
assert(normalize(uri7) === uri7, 'Preserves unrelated database names untouched');

// Test 1.8: Preserves sub-name like /studyhub_test without corrupting
const uri8 = 'mongodb://localhost:27017/studyhub_test';
assert(normalize(uri8) === uri8, 'Does not corrupt database names with prefixes like studyhub_test');

// Test 1.9: Handles non-string/null/undefined safely
assert(normalize(null) === null, 'Handles null gracefully');
assert(normalize(undefined) === undefined, 'Handles undefined gracefully');
assert(normalize('') === '', 'Handles empty string gracefully');

// ----------------------------------------------------------------
// SECTION 2: Environment File Verification
// ----------------------------------------------------------------
console.log('\nSECTION 2: Environment Configuration Consistency');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const mongoLine = envContent.split('\n').find(l => l.startsWith('MONGO_URI='));
  assert(
    mongoLine && mongoLine.includes('/studyHub') && !mongoLine.includes('/studyhub'),
    '.env configures MONGO_URI with exact Atlas database name "studyHub"'
  );
} else {
  console.log('  [INFO] .env file not present in current test environment');
}

const envExamplePath = path.join(__dirname, '../.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const mongoExLine = envExampleContent.split('\n').find(l => l.startsWith('MONGO_URI='));
  assert(
    mongoExLine && mongoExLine.includes('/studyHub'),
    '.env.example specifies "studyHub" database'
  );
}

// ----------------------------------------------------------------
// SECTION 3: Codebase Audit for Dynamic useDb or Case Inconsistencies
// ----------------------------------------------------------------
console.log('\nSECTION 3: Codebase Audit for Accidental Database Switching');

const srcDir = path.join(__dirname, '../src');
function scanDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const jsFiles = scanDir(srcDir);
let hasAccidentalUseDb = false;
let hasHardcodedLowercaseStudyhub = false;

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Check for useDb calls
  if (content.includes('.useDb(')) {
    hasAccidentalUseDb = true;
    console.error(`  [WARN] Found .useDb() in: ${file}`);
  }
  // Check for hardcoded 'studyhub' (lowercase) outside db.js normalization logic
  if (!file.endsWith(path.join('config', 'db.js'))) {
    const lowerMatch = content.match(/['"`][^'"`]*\/studyhub[\/?#]?['"`]/i);
    if (lowerMatch && lowerMatch[0].toLowerCase().includes('/studyhub') && !lowerMatch[0].includes('/studyHub')) {
      hasHardcodedLowercaseStudyhub = true;
      console.error(`  [WARN] Found lowercase studyhub reference in: ${file}`);
    }
  }
}

assert(!hasAccidentalUseDb, 'No accidental .useDb() calls found in server/src (single-database multi-society architecture)');
assert(!hasHardcodedLowercaseStudyhub, 'No hardcoded lowercase "studyhub" connection strings found in application code');

// ----------------------------------------------------------------
// SECTION 4: Multi-Tenancy Architecture & Safety Guarantees
// ----------------------------------------------------------------
console.log('\nSECTION 4: Multi-Tenancy Architecture & Safety Guarantees');

const authControllerPath = path.join(__dirname, '../src/controllers/authController.js');
const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');

assert(
  !authControllerContent.includes('dropDatabase'),
  'Registration workflow does not contain destructive dropDatabase commands'
);

assert(
  authControllerContent.includes('societyId: createdSociety._id'),
  'Registration creates Admin linked to societyId (document-level multi-tenancy)'
);

assert(
  authControllerContent.includes('Society.generateJoinCode()'),
  'Registration generates unique society join code for tenant isolation'
);

// ----------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${passedTests + failedTests} assertions passed (${Math.round((passedTests / (passedTests + failedTests)) * 100)}%)`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\n❌ SOME TESTS FAILED. Please resolve errors before proceeding.\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL DATABASE NAMING & CASING TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

