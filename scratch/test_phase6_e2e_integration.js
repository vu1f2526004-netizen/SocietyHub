const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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

async function runPhase6E2ETests() {
  console.log('====================================================');
  console.log('    MULTI-SOCIETY PHASE 6: E2E INTEGRATION & SECURITY');
  console.log('====================================================\n');

  let testPassed = 0;
  let testFailed = 0;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyhub';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB directly for assertion verification.\n');

  const db = mongoose.connection.db;
  const createdSocietyIds = [];
  const createdUserIds = [];

  try {
    // =========================================================================
    // SECTION 1: VERIFY THE MULTI-SOCIETY LIFECYCLE
    // =========================================================================
    console.log('--- SECTION 1: MULTI-SOCIETY LIFECYCLE ---');

    // 1. Secretary registers Society A
    console.log('\n[TEST 1.1] Secretary registers Society A...');
    const secEmailA = `secA_${Date.now()}@e2esocA.com`;
    const regSocA = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `E2E Society Alpha ${Date.now()}`,
        address: '777 Alpha Towers, Marine Lines',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        name: 'Secretary Alpha',
        email: secEmailA,
        mobile: '9876543301',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });

    if (regSocA.status === 201 && regSocA.data.success && regSocA.data.society?.joinCode) {
      console.log(`  -> Society created: "${regSocA.data.society.name}", JoinCode: "${regSocA.data.society.joinCode}"`);
      console.log('  [PASS] Secretary registration creates Society & Admin with unique Join Code.');
      testPassed++;
    } else {
      console.error('  [FAIL] Society registration failed:', regSocA.status, regSocA.data);
      testFailed++;
    }

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

    // 2. Resident joins Society A using valid Join Code
    console.log('\n[TEST 1.2] Resident joins Society A using valid Join Code...');
    const resEmailA = `resA_${Date.now()}@e2eresA.com`;
    const joinResA = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Aarav Sharma',
        email: resEmailA,
        mobile: '9876543302',
        flatNumber: 'A-101',
        password: 'ResidentPassword123!',
        confirmPassword: 'ResidentPassword123!'
      })
    });

    if (joinResA.status === 201 && joinResA.data.user?.status === 'PendingApproval') {
      createdUserIds.push(joinResA.data.user.id);
      console.log(`  -> Resident created: "${joinResA.data.user.name}", Status: "${joinResA.data.user.status}"`);
      console.log('  [PASS] Resident joins in PendingApproval status bound to Society A.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident join failed:', joinResA.status, joinResA.data);
      testFailed++;
    }

    // 3. Pending Resident cannot access protected APIs or log in
    console.log('\n[TEST 1.3] Pending Resident login block...');
    const loginPending = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: resEmailA, password: 'ResidentPassword123!' })
    });

    if (loginPending.status === 403 && loginPending.data.error.includes('pending administrator approval')) {
      console.log('  -> Login blocked with HTTP 403:', loginPending.data.error);
      console.log('  [PASS] Pending Resident cannot access protected APIs.');
      testPassed++;
    } else {
      console.error('  [FAIL] Pending resident login was not blocked:', loginPending.status, loginPending.data);
      testFailed++;
    }

    // 4. Admin A approves Resident A
    console.log('\n[TEST 1.4] Admin A approves Resident A...');
    const approveResA = await req(`${API_BASE}/admin/registration-requests/${joinResA.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    if (approveResA.status === 200 && approveResA.data.data?.status === 'Active') {
      console.log('  -> Resident status updated to Active.');
      console.log('  [PASS] Admin A approved Resident A.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident approval failed:', approveResA.status, approveResA.data);
      testFailed++;
    }

    // 5. Approved Resident logs in and accesses /resident services
    console.log('\n[TEST 1.5] Approved Resident A logs in and accesses /resident...');
    const loginApproved = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: resEmailA, password: 'ResidentPassword123!' })
    });

    let tokenResidentA = null;
    if (loginApproved.status === 200 && loginApproved.data.user?.status === 'Active' && loginApproved.data.user?.role === 'Resident') {
      tokenResidentA = loginApproved.data.token;
      const meRes = await req(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenResidentA}` }
      });
      if (meRes.status === 200 && meRes.data.data.role === 'Resident') {
        console.log(`  -> Login success! Role: ${meRes.data.data.role}, Flat: ${meRes.data.data.flatNumber}`);
        console.log('  [PASS] Approved Resident can log in and access protected session.');
        testPassed++;
      } else {
        console.error('  [FAIL] /auth/me failed for approved resident:', meRes.status);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Approved resident login failed:', loginApproved.status, loginApproved.data);
      testFailed++;
    }

    // 6. Admin A creates SecurityStaff A for Society A
    console.log('\n[TEST 1.6] Admin A creates SecurityStaff A account...');
    const staffEmailA = `guardA_${Date.now()}@e2eguardA.com`;
    const createStaffA = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        name: 'Guard Alpha',
        email: staffEmailA,
        mobile: '9876543303',
        password: 'GuardPassword123!',
        confirmPassword: 'GuardPassword123!'
      })
    });

    let tokenStaffA = null;
    if (createStaffA.status === 201 && createStaffA.data.data?.role === 'SecurityStaff') {
      createdUserIds.push(createStaffA.data.data.id);
      console.log(`  -> SecurityStaff created: "${createStaffA.data.data.name}", Role: "${createStaffA.data.data.role}"`);

      // Staff logs in to /staff
      const loginStaffA = await req(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: staffEmailA, password: 'GuardPassword123!' })
      });

      if (loginStaffA.status === 200 && loginStaffA.data.user.role === 'SecurityStaff') {
        tokenStaffA = loginStaffA.data.token;
        console.log('  -> Staff login success! Role: SecurityStaff');
        console.log('  [PASS] Admin creates SecurityStaff and Staff logs in successfully.');
        testPassed++;
      } else {
        console.error('  [FAIL] Staff login failed:', loginStaffA.status, loginStaffA.data);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Staff creation failed:', createStaffA.status, createStaffA.data);
      testFailed++;
    }

    // 7. Rejection flow: Prospective resident joined and rejected
    console.log('\n[TEST 1.7] Rejection flow for prospective resident...');
    const rejectEmail = `rejectCandidate_${Date.now()}@testreject.com`;
    const joinRejectCandidate = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyA.joinCode,
        name: 'Rejected Candidate',
        email: rejectEmail,
        mobile: '9876543304',
        flatNumber: 'B-202',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    createdUserIds.push(joinRejectCandidate.data.user?.id);

    const rejectAction = await req(`${API_BASE}/admin/registration-requests/${joinRejectCandidate.data.user?.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });

    const loginRejected = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: rejectEmail, password: 'Password123!' })
    });

    if (rejectAction.status === 200 && loginRejected.status === 403 && loginRejected.data.error.includes('rejected')) {
      console.log('  -> Rejection executed, login blocked with HTTP 403.');
      console.log('  [PASS] Rejected resident lifecycle verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Rejection verification failed:', rejectAction.status, loginRejected.status);
      testFailed++;
    }

    // =========================================================================
    // SECTION 2: TEST TWO INDEPENDENT SOCIETIES (SOCIETY A vs SOCIETY B)
    // =========================================================================
    console.log('\n--- SECTION 2: TWO INDEPENDENT SOCIETIES & TENANT ISOLATION ---');

    // Setup Society B
    const secEmailB = `secB_${Date.now()}@e2esocB.com`;
    const regSocB = await req(`${API_BASE}/auth/register-society`, {
      method: 'POST',
      body: JSON.stringify({
        societyName: `E2E Society Beta ${Date.now()}`,
        address: '888 Beta Boulevard, Kothrud',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411038',
        name: 'Secretary Beta',
        email: secEmailB,
        mobile: '9876543311',
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

    // Create & Approve Resident B in Society B
    const resEmailB = `resB_${Date.now()}@e2eresB.com`;
    const joinResB = await req(`${API_BASE}/auth/join-society`, {
      method: 'POST',
      body: JSON.stringify({
        joinCode: societyB.joinCode,
        name: 'Bhavna Verma',
        email: resEmailB,
        mobile: '9876543312',
        flatNumber: 'B-101',
        password: 'ResidentPassword123!',
        confirmPassword: 'ResidentPassword123!'
      })
    });
    createdUserIds.push(joinResB.data.user.id);

    await req(`${API_BASE}/admin/registration-requests/${joinResB.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });

    const loginResB = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: resEmailB, password: 'ResidentPassword123!' })
    });
    const tokenResidentB = loginResB.data.token;

    // Create Staff B in Society B
    const staffEmailB = `guardB_${Date.now()}@e2eguardB.com`;
    const createStaffB = await req(`${API_BASE}/admin/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({
        name: 'Guard Beta',
        email: staffEmailB,
        mobile: '9876543313',
        password: 'GuardPassword123!',
        confirmPassword: 'GuardPassword123!'
      })
    });
    createdUserIds.push(createStaffB.data.data.id);

    const loginStaffB = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staffEmailB, password: 'GuardPassword123!' })
    });
    const tokenStaffB = loginStaffB.data.token;

    console.log(`  -> Two societies configured. Society A: "${societyA.name}", Society B: "${societyB.name}"`);

    // 2.1 Cross-society registration requests & approvals
    console.log('\n[TEST 2.1] Cross-society registration approval barrier...');
    const crossRegApprove = await req(`${API_BASE}/admin/registration-requests/${joinResA.data.user.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });
    if (crossRegApprove.status === 403) {
      console.log('  -> Admin B blocked from approving Resident A: HTTP 403');
      console.log('  [PASS] Cross-society registration approval blocked.');
      testPassed++;
    } else {
      console.error('  [FAIL] Cross-society approval was not blocked:', crossRegApprove.status);
      testFailed++;
    }

    // 2.2 Cross-society staff management barrier
    console.log('\n[TEST 2.2] Cross-society staff management barrier...');
    const crossStaffUpdate = await req(`${API_BASE}/admin/staff/${createStaffA.data.data.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({ name: 'Malicious Change' })
    });
    const crossStaffStatus = await req(`${API_BASE}/admin/staff/${createStaffA.data.data.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({ status: 'Suspended' })
    });
    if (crossStaffUpdate.status === 403 && crossStaffStatus.status === 403) {
      console.log('  -> Admin B blocked from editing or suspending Staff A: HTTP 403');
      console.log('  [PASS] Cross-society staff management blocked.');
      testPassed++;
    } else {
      console.error('  [FAIL] Cross-society staff management not blocked:', crossStaffUpdate.status, crossStaffStatus.status);
      testFailed++;
    }

    // 2.3 Complaints Isolation: Resident A creates complaint in Society A
    console.log('\n[TEST 2.3] Complaints cross-society and resident privacy isolation...');
    const compA = await req(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({
        category: 'Plumbing',
        title: 'Alpha Tap Leak',
        description: 'Leaking tap in flat A-101',
        location: 'Bathroom'
      })
    });
    const compAId = compA.data.data._id;

    // Resident B tries to view Resident A's complaint
    const resBTriesCompA = await req(`${API_BASE}/complaints/${compAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentB}` }
    });

    // Admin B tries to view Society A's complaint
    const adminBTriesCompA = await req(`${API_BASE}/complaints/${compAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });

    if ((resBTriesCompA.status === 403 || resBTriesCompA.status === 404) && adminBTriesCompA.status === 404) {
      console.log(`  -> Resident B blocked: HTTP ${resBTriesCompA.status}, Admin B blocked: HTTP ${adminBTriesCompA.status}`);
      console.log('  [PASS] Complaints cross-society isolation verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Complaint cross-society leak:', resBTriesCompA.status, adminBTriesCompA.status);
      testFailed++;
    }

    // 2.4 Repairs and Maintenance Isolation
    console.log('\n[TEST 2.4] Repairs cross-society isolation...');
    const repairA = await req(`${API_BASE}/repairs/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        title: 'Elevator Maintenance Alpha',
        category: 'Elevator',
        description: 'Lift 1 inspection',
        location: 'Tower Alpha',
        priority: 'Medium',
        assignedTo: createStaffA.data.data.id
      })
    });
    const repairAId = repairA.data.data?._id;

    // Staff B tries to view Staff A's repair
    const staffBTriesRepairA = await req(`${API_BASE}/repairs/${repairAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenStaffB}` }
    });

    // Admin B tries to close Society A's repair
    const adminBTriesRepairA = await req(`${API_BASE}/repairs/admin/${repairAId}/close`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminB}` },
      body: JSON.stringify({ adminNotes: 'Unauthorized close' })
    });

    if ((staffBTriesRepairA.status === 403 || staffBTriesRepairA.status === 404) && adminBTriesRepairA.status === 404) {
      console.log(`  -> Staff B blocked: HTTP ${staffBTriesRepairA.status}, Admin B blocked: HTTP ${adminBTriesRepairA.status}`);
      console.log('  [PASS] Repairs cross-society isolation verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Repair cross-society leak:', staffBTriesRepairA.status, adminBTriesRepairA.status);
      testFailed++;
    }

    // 2.5 Visitor Management Isolation
    console.log('\n[TEST 2.5] Visitor management cross-society isolation...');
    const visA = await req(`${API_BASE}/visitors`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({
        name: 'Courier Delivery Alpha',
        mobile: '9111111111',
        expectedDate: '2026-10-15',
        purpose: 'Package'
      })
    });
    const visAId = visA.data.data?._id;

    // Staff B attempts to update Visitor A's status
    const staffBTriesVisA = await req(`${API_BASE}/visitors/${visAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenStaffB}` },
      body: JSON.stringify({ status: 'Entered' })
    });

    if (staffBTriesVisA.status === 404) {
      console.log('  -> Staff B blocked from updating Visitor A status: HTTP 404');
      console.log('  [PASS] Visitor management cross-society isolation verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Staff B was able to access Visitor A:', staffBTriesVisA.status);
      testFailed++;
    }

    // 2.6 Events and RSVPs Isolation
    console.log('\n[TEST 2.6] Events and RSVPs cross-society isolation...');
    const eventA = await req(`${API_BASE}/events/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        title: 'Diwali Gala Alpha',
        description: 'Society A Celebration',
        date: '2026-11-01',
        startTime: '18:00',
        endTime: '22:00',
        location: 'Alpha Clubhouse',
        capacity: 100,
        status: 'Published'
      })
    });
    const eventAId = eventA.data.data?._id;

    // Resident B tries to RSVP for Event A
    const resBTriesRSVPA = await req(`${API_BASE}/events/${eventAId}/rsvp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentB}` },
      body: JSON.stringify({ status: 'Going' })
    });

    // Resident B queries events (should only see Society B events, not Society A)
    const resBEvents = await req(`${API_BASE}/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentB}` }
    });
    const foundEventAInB = resBEvents.data.data?.some(e => e._id === eventAId);

    if (resBTriesRSVPA.status === 404 && !foundEventAInB) {
      console.log(`  -> Resident B RSVP blocked: HTTP ${resBTriesRSVPA.status}, Event not visible in Society B: true`);
      console.log('  [PASS] Events and RSVPs cross-society isolation verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Events cross-society leak:', resBTriesRSVPA.status, foundEventAInB);
      testFailed++;
    }

    // 2.7 Polls and Voting Isolation
    console.log('\n[TEST 2.7] Polls and Voting cross-society isolation...');
    const pollA = await req(`${API_BASE}/polls/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        question: 'Solar Rooftop Installation for Alpha?',
        description: 'Should we install solar panels?',
        options: [{ text: 'Yes' }, { text: 'No' }],
        endDate: '2026-12-01',
        status: 'Active'
      })
    });
    const pollAId = pollA.data.data?._id;
    const optionAId = pollA.data.data?.options[0]?._id;

    // Resident B attempts to vote on Poll A
    const resBTriesVoteA = await req(`${API_BASE}/polls/${pollAId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentB}` },
      body: JSON.stringify({ optionId: optionAId })
    });

    if (resBTriesVoteA.status === 404) {
      console.log('  -> Resident B vote on Poll A blocked: HTTP 404');
      console.log('  [PASS] Polls and Voting cross-society isolation verified.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident B was able to vote on Poll A:', resBTriesVoteA.status);
      testFailed++;
    }

    // 2.8 Community Issues Isolation
    console.log('\n[TEST 2.8] Community Issues isolation (Approved issues visible within correct society only)...');
    const issueA = await req(`${API_BASE}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({
        issueType: 'Parking',
        title: 'Unauthorized Car in Alpha Slot 14',
        description: 'Black sedan parked in assigned slot',
        location: 'Basement 1 Slot 14',
        vehicleNumber: 'MH01AB1234'
      })
    });
    const issueAId = issueA.data.data?._id;

    // Admin A approves issue A
    await req(`${API_BASE}/issues/admin/${issueAId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({ status: 'Approved' })
    });

    // Resident A views issues (should see approved issue A)
    const resAIssues = await req(`${API_BASE}/issues`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentA}` }
    });
    const foundInA = resAIssues.data.data?.some(i => i._id === issueAId);

    // Resident B views issues (must NOT see Society A issue)
    const resBIssues = await req(`${API_BASE}/issues`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentB}` }
    });
    const foundInB = resBIssues.data.data?.some(i => i._id === issueAId);

    if (foundInA && !foundInB) {
      console.log(`  -> Issue visible to Resident A: ${foundInA}, Leaked to Resident B: ${foundInB}`);
      console.log('  [PASS] Approved community issues visible only within correct society.');
      testPassed++;
    } else {
      console.error('  [FAIL] Community issue visibility leak:', foundInA, foundInB);
      testFailed++;
    }

    // 2.9 Finance Records Isolation
    console.log('\n[TEST 2.9] Finance records cross-society isolation...');
    await req(`${API_BASE}/finance/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        type: 'Expense',
        category: 'Maintenance',
        amount: 25000,
        description: 'Elevator servicing Alpha',
        date: '2026-10-10'
      })
    });

    const finSummA = await req(`${API_BASE}/finance/admin/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminA}` }
    });
    const finSummB = await req(`${API_BASE}/finance/admin/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenAdminB}` }
    });

    if (finSummA.data.data.totalExpense === 25000 && finSummB.data.data.totalExpense === 0) {
      console.log(`  -> Society A Expense: ${finSummA.data.data.totalExpense}, Society B Expense: ${finSummB.data.data.totalExpense}`);
      console.log('  [PASS] Finance summaries strictly scoped per society.');
      testPassed++;
    } else {
      console.error('  [FAIL] Finance summary cross-society leak:', finSummA.data.data, finSummB.data.data);
      testFailed++;
    }

    // 2.10 Forged societyId in payload cannot bypass backend authorization
    console.log('\n[TEST 2.10] Forged societyId payload tampering test...');
    const forgedEvent = await req(`${API_BASE}/events/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        title: 'Forged Event Attempt',
        description: 'Attempting to inject into Society B',
        date: '2026-11-20',
        startTime: '19:00',
        endTime: '21:00',
        location: 'Tampered Venue',
        capacity: 50,
        societyId: societyB.id // Forged
      })
    });
    const dbForgedEvent = await db.collection('events').findOne({ _id: new mongoose.Types.ObjectId(forgedEvent.data.data?._id) });
    if (dbForgedEvent && dbForgedEvent.societyId.toString() === societyA.id) {
      console.log(`  -> Client supplied societyId="${societyB.id}". Stored: "${dbForgedEvent.societyId}" (Society A)`);
      console.log('  [PASS] Backend enforced server session societyId, ignoring forged client input.');
      testPassed++;
    } else {
      console.error('  [FAIL] Client-supplied societyId successfully tampered data:', dbForgedEvent?.societyId);
      testFailed++;
    }

    // =========================================================================
    // SECTION 3: BILLING & PAYMENT VERIFICATION (RAZORPAY)
    // =========================================================================
    console.log('\n--- SECTION 3: BILLING & PAYMENT VERIFICATION ---');

    // 3.1 Admin A creates maintenance bill for Resident A
    console.log('\n[TEST 3.1] Admin A creates maintenance bill for Resident A...');
    const billA = await req(`${API_BASE}/bills/admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({
        residentId: joinResA.data.user.id,
        amount: 3500,
        dueDate: '2026-10-31',
        month: 'October 2026',
        type: 'Maintenance',
        description: 'Monthly Maintenance Fee'
      })
    });
    const billAId = billA.data.data?._id;

    if (billA.status === 201 && billA.data.data.amount === 3500) {
      console.log(`  -> Bill created: ID=${billAId}, Amount=₹${billA.data.data.amount}, Status=${billA.data.data.status}`);
      console.log('  [PASS] Maintenance bill created successfully.');
      testPassed++;
    } else {
      console.error('  [FAIL] Bill creation failed:', billA.status, billA.data);
      testFailed++;
    }

    // 3.2 Cross-society payment order block: Resident B tries to pay Resident A's bill
    console.log('\n[TEST 3.2] Cross-society payment order creation blocked...');
    const crossOrder = await req(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentB}` },
      body: JSON.stringify({ billId: billAId })
    });

    if (crossOrder.status === 404 || crossOrder.status === 403) {
      console.log(`  -> Resident B blocked from initiating order for Bill A: HTTP ${crossOrder.status}`);
      console.log('  [PASS] Cross-society order creation strictly rejected.');
      testPassed++;
    } else {
      console.error('  [FAIL] Resident B was able to initiate payment for Resident A:', crossOrder.status, crossOrder.data);
      testFailed++;
    }

    // 3.3 Resident A creates payment order for their own bill
    console.log('\n[TEST 3.3] Resident A creates payment order for their bill...');
    const orderRes = await req(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({ billId: billAId })
    });

    let razorpayOrderId = null;
    if (orderRes.status === 201 && orderRes.data.data?.order?.id) {
      razorpayOrderId = orderRes.data.data.order.id;
      console.log(`  -> Order created: ${razorpayOrderId}, Payment Doc ID: ${orderRes.data.data.paymentId}`);
      console.log('  [PASS] Payment order created successfully.');
      testPassed++;
    } else {
      console.error('  [FAIL] Order creation failed:', orderRes.status, orderRes.data);
      testFailed++;
    }

    // 3.4 Invalid signature rejected by server
    console.log('\n[TEST 3.4] Invalid payment signature rejected...');
    const badVerify = await req(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: 'pay_bad_test_123',
        razorpay_signature: 'invalid_forged_signature_hash'
      })
    });

    if (badVerify.status === 400 && badVerify.data.error.includes('Invalid signature')) {
      console.log('  -> Invalid signature correctly rejected: HTTP 400', badVerify.data.error);
      console.log('  [PASS] Server-side signature validation strictly enforced.');
      testPassed++;
    } else {
      console.error('  [FAIL] Invalid signature was not rejected:', badVerify.status, badVerify.data);
      testFailed++;
    }

    // 3.5 Frontend cannot arbitrarily mark a bill as paid via updateBill
    console.log('\n[TEST 3.5] Frontend cannot mark bill paid via PATCH /bills/:id...');
    const fakePaidAttempt = await req(`${API_BASE}/bills/${billAId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
      body: JSON.stringify({ status: 'Paid', amount: 3500 })
    });
    const dbBillCheck = await db.collection('maintenancebills').findOne({ _id: new mongoose.Types.ObjectId(billAId) });
    if (dbBillCheck.status !== 'Paid') {
      console.log(`  -> Admin sent status="Paid" to PATCH /bills. Stored status remains: "${dbBillCheck.status}"`);
      console.log('  [PASS] Frontend cannot arbitrarily mark a bill as paid.');
      testPassed++;
    } else {
      console.error('  [FAIL] Bill was arbitrarily marked paid via updateBill endpoint!');
      testFailed++;
    }

    // 3.6 Valid Payment verification in Test Mode
    console.log('\n[TEST 3.6] Server-side payment verification (test mode)...');
    // In development test mode, 'mock_signature' verifies the payment
    const validVerify = await req(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResidentA}` },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'mock_signature'
      })
    });

    if (validVerify.status === 200 && validVerify.data.data?.status === 'Success') {
      const dbBillAfterPay = await db.collection('maintenancebills').findOne({ _id: new mongoose.Types.ObjectId(billAId) });
      const dbFinanceEntry = await db.collection('finances').findOne({ referenceId: new mongoose.Types.ObjectId(validVerify.data.data._id) });

      if (dbBillAfterPay.status === 'Paid' && dbFinanceEntry && dbFinanceEntry.societyId.toString() === societyA.id) {
        console.log(`  -> Payment verified: Success. Bill status: "${dbBillAfterPay.status}", Recorded in Society A Finance: true`);
        console.log('  [PASS] Server-side payment verification and accounting updates verified.');
        testPassed++;
      } else {
        console.error('  [FAIL] Payment verified but bill or finance entry incorrect:', dbBillAfterPay, dbFinanceEntry);
        testFailed++;
      }
    } else {
      console.error('  [FAIL] Valid payment verification failed:', validVerify.status, validVerify.data);
      testFailed++;
    }

    // =========================================================================
    // SECTION 4: NOTIFICATIONS & EMAIL HANDLING
    // =========================================================================
    console.log('\n--- SECTION 4: NOTIFICATIONS & EMAIL HANDLING ---');

    // 4.1 In-app notification delivered to Resident A
    console.log('\n[TEST 4.1] In-app notifications delivery and isolation...');
    const resANotifs = await req(`${API_BASE}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentA}` }
    });
    const resBNotifs = await req(`${API_BASE}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenResidentB}` }
    });

    const hasPayNotif = resANotifs.data.data?.some(n => n.title.includes('Payment Successful'));
    const notifsLeakedToB = resBNotifs.data.data?.some(n => n.title.includes('Payment Successful'));

    if (hasPayNotif && !notifsLeakedToB) {
      console.log(`  -> Resident A has Payment Notification: ${hasPayNotif}, Leaked to Resident B: ${notifsLeakedToB}`);
      console.log('  [PASS] In-app notifications delivered and strictly isolated.');
      testPassed++;
    } else {
      console.error('  [FAIL] Notification delivery or isolation failure:', hasPayNotif, notifsLeakedToB);
      testFailed++;
    }

    // 4.2 Nodemailer unconfigured handling
    console.log('\n[TEST 4.2] Nodemailer unconfigured SMTP handling...');
    const sendEmailModule = require('../server/src/utils/sendEmail');
    const origHost = process.env.SMTP_HOST;
    const origMailHost = process.env.MAIL_HOST;
    delete process.env.SMTP_HOST;
    delete process.env.MAIL_HOST;
    sendEmailModule.resetTransporter();

    const emailResult = await sendEmailModule.sendEmail({
      to: 'test@example.com',
      subject: 'Test Graceful Handling',
      text: 'Testing SMTP missing handling'
    });

    if (origHost) process.env.SMTP_HOST = origHost;
    if (origMailHost) process.env.MAIL_HOST = origMailHost;
    sendEmailModule.resetTransporter();

    if (emailResult.sent === false && emailResult.reason === 'SMTP_NOT_CONFIGURED') {
      console.log(`  -> sendEmail safely returned: sent=false, reason="${emailResult.reason}"`);
      console.log('  [PASS] Nodemailer handles missing SMTP configuration gracefully without throwing.');
      testPassed++;
    } else {
      console.error('  [FAIL] Unexpected sendEmail behavior:', emailResult);
      testFailed++;
    }

  } catch (err) {
    console.error('GLOBAL E2E INTEGRATION TEST ERROR:', err);
    testFailed++;
  } finally {
    // Teardown test fixtures
    console.log('\n[CLEANUP] Cleaning up test fixtures from DB...');
    if (createdSocietyIds.length > 0) {
      const socObjIds = createdSocietyIds.map(id => new mongoose.Types.ObjectId(id));
      await db.collection('societies').deleteMany({ _id: { $in: socObjIds } });
      await db.collection('complaints').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('repairs').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('visitors').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('events').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('rsvps').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('polls').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('votes').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('communityissues').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('finances').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('maintenancebills').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('payments').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('notifications').deleteMany({ societyId: { $in: socObjIds } });
      await db.collection('flats').deleteMany({ societyId: { $in: socObjIds } });
      console.log(`  -> Deleted ${createdSocietyIds.length} test societies and related entities.`);
    }

    if (createdUserIds.length > 0) {
      const userObjIds = createdUserIds.map(id => new mongoose.Types.ObjectId(id));
      await db.collection('users').deleteMany({ _id: { $in: userObjIds } });
      console.log(`  -> Deleted ${createdUserIds.length} test users.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');

    console.log('====================================================');
    console.log(`PHASE 6 E2E RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('====================================================');

    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runPhase6E2ETests();
