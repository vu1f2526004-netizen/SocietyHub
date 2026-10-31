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
  console.log('===========================================================');
  console.log('STARTING WALKIN VISITOR & PARCEL APPROVAL WORKFLOW TESTS');
  console.log('===========================================================');
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

  // 1. Connect to DB and set up tokens
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const staffUser = await db.collection('users').findOne({ role: 'SecurityStaff' });
  const residentUser = await db.collection('users').findOne({
    role: 'Resident',
    societyId: staffUser.societyId
  });
  const otherResidentUser = await db.collection('users').findOne({
    role: 'Resident',
    societyId: staffUser.societyId,
    flatNumber: { $ne: residentUser.flatNumber }
  });
  const otherSocietyStaff = await db.collection('users').findOne({
    role: 'SecurityStaff',
    societyId: { $ne: staffUser.societyId }
  });
  const otherSocietyResident = await db.collection('users').findOne({
    role: 'Resident',
    societyId: { $ne: staffUser.societyId }
  });

  const staffToken = jwt.sign(
    { id: staffUser._id.toString(), role: staffUser.role, societyId: staffUser.societyId.toString() },
    JWT_SECRET, { expiresIn: '1h' }
  );

  const residentToken = jwt.sign(
    { id: residentUser._id.toString(), role: residentUser.role, societyId: residentUser.societyId.toString() },
    JWT_SECRET, { expiresIn: '1h' }
  );

  const otherResidentToken = jwt.sign(
    { id: otherResidentUser._id.toString(), role: otherResidentUser.role, societyId: otherResidentUser.societyId.toString() },
    JWT_SECRET, { expiresIn: '1h' }
  );

  const otherSocietyStaffToken = otherSocietyStaff ? jwt.sign(
    { id: otherSocietyStaff._id.toString(), role: otherSocietyStaff.role, societyId: otherSocietyStaff.societyId.toString() },
    JWT_SECRET, { expiresIn: '1h' }
  ) : null;

  console.log(`Staff: ${staffUser.name} (${staffUser.email})`);
  console.log(`Target Resident: ${residentUser.name} (Flat ${residentUser.flatNumber})`);
  console.log(`Other Flat Resident: ${otherResidentUser.name} (Flat ${otherResidentUser.flatNumber})`);

  // 1. Staff destination flats lookup
  console.log('\n--- TEST 1: Destination Flats Lookup ---');
  const flatsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/flats',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert('Flats lookup returns 200', flatsRes.status === 200);
  assert('Flats lookup returns data array', Array.isArray(flatsRes.data?.data));
  const flatItem = flatsRes.data?.data?.find(f => f.flatNumber === residentUser.flatNumber);
  assert('Target resident flat is included in flats list', !!flatItem);
  assert('Resident sensitive contact details are NOT exposed in flats response', !flatItem?.mobile && !flatItem?.email);

  // 2. Reject invalid or nonexistent flat
  console.log('\n--- TEST 2: Validation of Nonexistent Destination Flat ---');
  const invalidFlatRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/walk-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, {
    name: 'Courier Guy',
    mobile: '9876543210',
    destinationFlat: 'NON_EXISTENT_FLAT_9999',
    visitType: 'Parcel/Delivery',
    purpose: 'Package delivery'
  });
  assert('Nonexistent destination flat rejected with 400', invalidFlatRes.status === 400);

  // 3. Staff creates valid walk-in permission request
  console.log('\n--- TEST 3: Staff Creates Valid Walk-in Permission Request ---');
  const createWalkInRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/walk-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, {
    name: 'Amazon Delivery',
    mobile: '9876543210',
    destinationFlat: residentUser.flatNumber,
    visitType: 'Parcel/Delivery',
    purpose: 'Amazon parcel',
    vehicleNumber: 'MH-12-AB-1234'
  });

  assert('Valid walk-in request creation returns 201', createWalkInRes.status === 201);
  const walkInVisitor = createWalkInRes.data?.data;
  assert('Initial status is strictly "Pending"', walkInVisitor?.status === 'Pending');
  assert('entryType is "WalkIn"', walkInVisitor?.entryType === 'WalkIn');
  assert('requestRef was generated with WALK- prefix', walkInVisitor?.requestRef?.startsWith('WALK-'));
  assert('expiresAt timestamp is set', !!walkInVisitor?.expiresAt);

  // 4. Verify in-app notification created for resident
  console.log('\n--- TEST 4: In-app Notification for Resident ---');
  const notifRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications/my',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${residentToken}` }
  });
  const notifs = notifRes.data?.data || [];
  const walkInNotif = notifs.find(n => n.title === 'Visitor Entry Request' && n.message.includes(walkInVisitor.requestRef));
  assert('In-app notification created for destination resident with matching reference', !!walkInNotif);

  // 5. Cross-society isolation: staff from other society cannot see or decide this request
  console.log('\n--- TEST 5: Cross-Society Isolation ---');
  if (otherSocietyStaffToken) {
    const otherStaffList = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/visitors/staff',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${otherSocietyStaffToken}` }
    });
    const leak = (otherStaffList.data?.data || []).some(v => v._id === walkInVisitor._id);
    assert('Other society staff cannot see this walk-in request', !leak);
  } else {
    console.log('  [SKIP] Only one society in DB, skipping cross-society staff check');
  }

  // 6. Unrelated resident cannot view or decide the request
  console.log('\n--- TEST 6: Unrelated Resident Cannot View or Decide Request ---');
  const otherResidentRequests = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/permissions/my',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${otherResidentToken}` }
  });
  const inOtherFlat = (otherResidentRequests.data?.data || []).some(r => r._id === walkInVisitor._id);
  assert('Other flat resident cannot see this permission request in their list', !inOtherFlat);

  const unauthorizedDecision = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${otherResidentToken}` }
  }, { action: 'Approve' });
  assert('Unauthorized resident decision rejected with 404/403', unauthorizedDecision.status === 404 || unauthorizedDecision.status === 403);

  // 7. CRITICAL BACKEND ENFORCEMENT: Staff CANNOT check in while status is Pending
  console.log('\n--- TEST 7: Staff Cannot Check In Walk-in while Pending ---');
  const pendingCheckIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Check-in of Pending walk-in rejected by server with 400', pendingCheckIn.status === 400);

  // 8. Correct Resident sees request and approves
  console.log('\n--- TEST 8: Correct Resident Views and Approves Request ---');
  const targetRequests = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/permissions/my',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${residentToken}` }
  });
  const foundInTarget = (targetRequests.data?.data || []).some(r => r._id === walkInVisitor._id);
  assert('Target resident can view the permission request', foundInTarget);

  const approveRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, { action: 'Approve', note: 'Allowed by resident' });
  assert('Resident approval returns 200', approveRes.status === 200);
  assert('Visitor status is updated to "Approved"', approveRes.data?.data?.status === 'Approved');

  // 9. Concurrency / Duplicate Decision Guard: Already resolved request cannot be re-decided
  console.log('\n--- TEST 9: Duplicate Decision Concurrency Guard ---');
  const secondDecision = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, { action: 'Deny' });
  assert('Second decision on already resolved request is rejected with 400', secondDecision.status === 400);

  // 10. Approved request can be checked in exactly once by Staff
  console.log('\n--- TEST 10: Approved Walk-in Can Be Checked In Exactly Once ---');
  const checkInRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Staff check-in of Approved walk-in succeeds with 200', checkInRes.status === 200);
  assert('Status is "Entered"', checkInRes.data?.data?.status === 'Entered');
  assert('entryTimestamp is recorded', !!checkInRes.data?.data?.entryTimestamp);

  // Re-checking in already entered visitor should fail
  const duplicateCheckIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Duplicate check-in rejected with 400', duplicateCheckIn.status === 400);

  // 11. Check out visitor
  console.log('\n--- TEST 11: Check Out Visitor ---');
  const checkOutRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${walkInVisitor._id}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Exited' });
  assert('Staff check-out succeeds with 200', checkOutRes.status === 200);
  assert('Status is "Exited"', checkOutRes.data?.data?.status === 'Exited');
  assert('exitTimestamp is recorded', !!checkOutRes.data?.data?.exitTimestamp);

  // 12. Denied visitor cannot be checked in
  console.log('\n--- TEST 12: Denied Request Cannot Be Checked In ---');
  const denyWalkIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/walk-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, {
    name: 'Suspicious Salesperson',
    destinationFlat: residentUser.flatNumber,
    visitType: 'Other',
    purpose: 'Sales pitch'
  });
  const denyVisitorId = denyWalkIn.data?.data?._id;

  const residentDeny = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${denyVisitorId}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, { action: 'Deny', note: 'Not interested' });
  assert('Resident denies permission successfully (200)', residentDeny.status === 200);

  const deniedCheckIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${denyVisitorId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Staff check-in of Denied visitor strictly rejected with 400', deniedCheckIn.status === 400);

  // 13. Parcel "Leave at Gate/Security Desk" workflow and Handover
  console.log('\n--- TEST 13: Parcel Leave at Gate & Handover Workflow ---');
  const parcelWalkIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/walk-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, {
    name: 'FedEx Courier',
    destinationFlat: residentUser.flatNumber,
    visitType: 'Parcel/Delivery',
    purpose: 'Laptop delivery box'
  });
  const parcelId = parcelWalkIn.data?.data?._id;

  const parcelGateDrop = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${parcelId}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, { action: 'ParcelAtGate', note: 'Please leave with security desk' });
  assert('Resident selects "Leave at Gate" (200)', parcelGateDrop.status === 200);
  assert('Status is "ParcelAtGate"', parcelGateDrop.data?.data?.status === 'ParcelAtGate');

  // Verify delivery person cannot enter flat
  const parcelEntryAttempt = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${parcelId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Parcel designated for gate cannot be checked in as visitor to flat (400)', parcelEntryAttempt.status === 400);

  // Handover parcel to resident
  const handoverRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${parcelId}/parcel-handover`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert('Parcel handover recorded with 200', handoverRes.status === 200);
  assert('Parcel status is "ParcelCollected"', handoverRes.data?.data?.status === 'ParcelCollected');
  assert('parcelDetails.handedOverAt is recorded', !!handoverRes.data?.data?.parcelDetails?.handedOverAt);

  // 14. Expired Request Enforcement
  console.log('\n--- TEST 14: Expired Request Cannot Be Decided or Checked In ---');
  const expiredWalkIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors/walk-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, {
    name: 'Late Visitor',
    destinationFlat: residentUser.flatNumber,
    visitType: 'Guest',
    purpose: 'Visiting'
  });
  const expiredId = expiredWalkIn.data?.data?._id;

  // Manually back-date expiresAt in DB to simulate timeout
  await db.collection('visitors').updateOne(
    { _id: new mongoose.Types.ObjectId(expiredId) },
    { $set: { expiresAt: new Date(Date.now() - 60000) } }
  );

  const decideExpired = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${expiredId}/permission`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, { action: 'Approve' });
  assert('Decision on expired request is rejected with 400', decideExpired.status === 400);

  // 15. Existing Pre-Approved Expected Visitor flow remains intact
  console.log('\n--- TEST 15: Existing Pre-Approved Visitor Workflow Preserved ---');
  const preApproved = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/visitors',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${residentToken}` }
  }, {
    name: 'Invited Friend',
    mobile: '9123456780',
    expectedDate: new Date().toISOString().split('T')[0],
    expectedTime: '15:00',
    purpose: 'Dinner party'
  });
  assert('Resident creates pre-approved visitor (201)', preApproved.status === 201);
  const preAppId = preApproved.data?.data?._id;
  assert('Pre-approved status is Expected', preApproved.data?.data?.status === 'Expected');

  const preAppCheckIn = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/visitors/${preAppId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
  }, { status: 'Entered' });
  assert('Staff can check in Expected pre-approved visitor directly (200)', preAppCheckIn.status === 200);
  assert('Pre-approved visitor is now Entered', preAppCheckIn.data?.data?.status === 'Entered');

  // Summary
  console.log(`\n===========================================================`);
  console.log(`WORKFLOW TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===========================================================\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
