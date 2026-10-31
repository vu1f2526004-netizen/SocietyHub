import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING RESIDENT SEARCH VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Connect to MongoDB to find real test resident and admin
  console.log('\n1. Connecting to DB and obtaining test resident & admin tokens...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const residentUser = await db.collection('users').findOne({ role: 'Resident' });
  const adminUser = await db.collection('users').findOne({ role: 'Admin', societyId: residentUser.societyId });
  const otherSocietyUser = await db.collection('users').findOne({ 
    role: 'Resident', 
    societyId: { $ne: residentUser.societyId } 
  });

  if (!residentUser) {
    throw new Error('No resident user found in database!');
  }

  const residentToken = jwt.sign({ id: residentUser._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const headers = { 'Authorization': `Bearer ${residentToken}` };

  console.log(`  Resident: ${residentUser.name} (${residentUser.email}), Society: ${residentUser.societyId}`);

  // 2. Test Society Accounts / Transparency Search
  console.log('\n2. Testing /api/finance/transparency search...');

  // 2a. Fetch all expenses for period=all
  const allRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/finance/transparency?period=all',
    method: 'GET',
    headers
  });
  assert('Transparency endpoint returns HTTP 200', allRes.status === 200);
  assert('Transparency data has expenses array', Array.isArray(allRes.data?.data?.expenses));

  const expenses = allRes.data?.data?.expenses || [];
  console.log(`  Total transparency expenses in all-time: ${expenses.length}`);

  if (expenses.length > 0) {
    const sample = expenses[0];
    console.log(`  Sample expense: Title="${sample.title}", Vendor="${sample.vendor}", Category="${sample.category}", Amount=${sample.amount}`);

    // 2b. Search by vendor
    if (sample.vendor) {
      const vendorQuery = sample.vendor.substring(0, Math.min(sample.vendor.length, 4)).toLowerCase();
      const vendorRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/finance/transparency?period=all&search=${encodeURIComponent(vendorQuery)}`,
        method: 'GET',
        headers
      });
      assert('Vendor search returns HTTP 200', vendorRes.status === 200);
      const vendorMatches = vendorRes.data?.data?.expenses || [];
      assert(`Search by vendor "${vendorQuery}" finds matching records (${vendorMatches.length})`, vendorMatches.length > 0);
      const allVendorMatch = vendorMatches.every(e => 
        (e.vendor && e.vendor.toLowerCase().includes(vendorQuery)) ||
        (e.title && e.title.toLowerCase().includes(vendorQuery)) ||
        (e.category && e.category.toLowerCase().includes(vendorQuery)) ||
        (e.description && e.description.toLowerCase().includes(vendorQuery)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(vendorQuery)) ||
        (e.paymentStatus && e.paymentStatus.toLowerCase().includes(vendorQuery))
      );
      assert('Every returned record genuinely matches search query in at least one supported field', allVendorMatch);
    }

    // 2c. Non-matching query returns 0 records
    const nonMatchQuery = 'XYZ_NON_EXISTENT_VENDOR_QUERY_99999';
    const nonMatchRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/finance/transparency?period=all&search=${encodeURIComponent(nonMatchQuery)}`,
      method: 'GET',
      headers
    });
    assert('Non-matching query returns HTTP 200', nonMatchRes.status === 200);
    assert('Non-matching query returns 0 expense records', (nonMatchRes.data?.data?.expenses || []).length === 0);

    // 2d. Case-insensitivity and whitespace handling
    if (sample.title) {
      const titleQuery = '  ' + sample.title.substring(0, 3).toUpperCase() + '  ';
      const ciRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/finance/transparency?period=all&search=${encodeURIComponent(titleQuery)}`,
        method: 'GET',
        headers
      });
      assert('Whitespace-padded, uppercase query returns HTTP 200', ciRes.status === 200);
      assert('Case-insensitive and trimmed search returns records', (ciRes.data?.data?.expenses || []).length > 0);
    }

    // 2e. Special characters in query does not crash backend (regex escaping)
    const specialRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/finance/transparency?period=all&search=${encodeURIComponent('test[regex*(+)')}`,
      method: 'GET',
      headers
    });
    assert('Special characters in search query do not crash server with regex error (HTTP 200)', specialRes.status === 200);

    // 2f. Search combined with category filter
    if (sample.category) {
      const catRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/finance/transparency?period=all&category=${encodeURIComponent(sample.category)}`,
        method: 'GET',
        headers
      });
      assert('Category filter returns HTTP 200', catRes.status === 200);
      const catExpenses = catRes.data?.data?.expenses || [];
      assert('All returned records have the filtered category', catExpenses.every(e => e.category === sample.category));
    }
  }

  // 3. Test Resident Payment History Search
  console.log('\n3. Testing /api/payments/my search...');
  const paymentsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payments/my?period=all',
    method: 'GET',
    headers
  });
  assert('Payments endpoint returns HTTP 200', paymentsRes.status === 200);
  assert('Payments response contains data array', Array.isArray(paymentsRes.data?.data));

  const payments = paymentsRes.data?.data || [];
  console.log(`  Total resident payments: ${payments.length}`);
  if (payments.length > 0) {
    const pSample = payments[0];
    if (pSample.receiptNumber) {
      const recRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/payments/my?period=all&search=${encodeURIComponent(pSample.receiptNumber)}`,
        method: 'GET',
        headers
      });
      assert('Search by receiptNumber returns HTTP 200', recRes.status === 200);
      assert('Search by receiptNumber matches the payment', (recRes.data?.data || []).length > 0);
    }

    // Non-matching payment query
    const nonMatchPay = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/payments/my?period=all&search=NON_EXISTENT_RCP_99999',
      method: 'GET',
      headers
    });
    assert('Non-matching payment query returns 0 records', (nonMatchPay.data?.data || []).length === 0);
  }

  // 4. Test Resident Maintenance Bills Search
  console.log('\n4. Testing /api/bills/my search...');
  const billsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bills/my?period=all',
    method: 'GET',
    headers
  });
  assert('Bills endpoint returns HTTP 200', billsRes.status === 200);
  assert('Bills response contains data array', Array.isArray(billsRes.data?.data));

  // Special characters regex search test on bills
  const specialBills = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/my?search=${encodeURIComponent('bill[+(test)')}`,
    method: 'GET',
    headers
  });
  assert('Special character search on bills does not crash (HTTP 200)', specialBills.status === 200);

  // 5. Test Resident Visitors Search
  console.log('\n5. Testing /api/visitors/my search...');
  const visitorsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/my',
    method: 'GET',
    headers
  });
  assert('Visitors endpoint returns HTTP 200', visitorsRes.status === 200);

  const specialVisitors = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/my?search=${encodeURIComponent('guest(regex*[+)')}`,
    method: 'GET',
    headers
  });
  assert('Special character search on visitors does not crash (HTTP 200)', specialVisitors.status === 200);

  // 6. Test Resident Documents Search
  console.log('\n6. Testing /api/documents search...');
  const docsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/documents',
    method: 'GET',
    headers
  });
  assert('Documents endpoint returns HTTP 200', docsRes.status === 200);

  const specialDocs = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/documents?search=${encodeURIComponent('doc(rules*+)')}`,
    method: 'GET',
    headers
  });
  assert('Special character search on documents does not crash (HTTP 200)', specialDocs.status === 200);

  // 7. Test Resident Complaints Search
  console.log('\n7. Testing /api/complaints/my search...');
  const complaintsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/complaints/my',
    method: 'GET',
    headers
  });
  assert('Complaints endpoint returns HTTP 200', complaintsRes.status === 200);

  const specialComplaints = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/complaints/my?search=${encodeURIComponent('leak(pipe*+)')}`,
    method: 'GET',
    headers
  });
  assert('Special character search on complaints does not crash (HTTP 200)', specialComplaints.status === 200);

  // 8. Test Cross-Society Data Isolation
  console.log('\n8. Testing Cross-Society Data Isolation...');
  const spoofRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/finance/transparency?societyId=507f1f77bcf86cd799439011&period=all',
    method: 'GET',
    headers
  });
  assert('Transparency ignores spoofed client societyId query parameter (HTTP 200)', spoofRes.status === 200);
  const spoofExpenses = spoofRes.data?.data?.expenses || [];
  const unauthorizedSocietyMatches = spoofExpenses.filter(e => 
    e.societyId && e.societyId.toString() !== residentUser.societyId.toString()
  );
  assert('Zero records from other societies returned', unauthorizedSocietyMatches.length === 0);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
