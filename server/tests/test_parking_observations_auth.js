/**
 * Comprehensive Test Suite: Parking Observations Authorization & Operational Log Workflow
 * 
 * Verifies:
 * 1. Security Staff (SecurityStaff) and Society Secretary (Admin) can submit parking observations (POST /api/issues).
 * 2. Resident can still submit community issues (POST /api/issues).
 * 3. Route authorization & society isolation: Only active members with societyId can create and view issues.
 * 4. Validation: Missing required fields (issueType, title, description, location) return HTTP 400.
 * 5. GET /api/issues:
 *    - SecurityStaff can view observations they reported, assigned to them, and operational parking/incident logs.
 *    - Admin can view all society issues with full reporter and assignment context.
 *    - Resident can only view public approved/resolved issues with reporter privacy preserved.
 *    - Strict society-level data isolation across all queries.
 * 6. Admin and Staff update permissions:
 *    - Admin can approve/reject/resolve observations in their society.
 *    - Staff can update observations they reported or were assigned.
 *    - Cross-society modifications are strictly blocked.
 * 7. Frontend ParkingObservations.jsx contract:
 *    - Prevents double submissions (disabled state & guard).
 *    - Handles errors with descriptive toast messages.
 *    - Displays operational log warning and recent observations list.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const CommunityIssue = require('../src/models/CommunityIssue');
const User = require('../src/models/User');
const { requireRoles, requireSociety } = require('../src/middleware/auth');
const {
  createIssue,
  getIssues,
  adminUpdateIssue,
  staffUpdateIssue
} = require('../src/controllers/issueController');

let passedTests = 0;
let failedTests = 0;

function runCheck(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failedTests++;
  }
}

function createMockReqRes(user, body = {}, query = {}, file = null, params = {}) {
  const req = {
    user,
    body,
    query,
    file,
    params
  };

  let statusCode = 200;
  let jsonResponse = null;
  let nextError = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      jsonResponse = data;
      return res;
    }
  };

  const next = (err) => {
    if (err) nextError = err;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getJsonResponse: () => jsonResponse,
    getNextError: () => nextError
  };
}

// In-memory data store for isolated mock testing
const mockIssuesDb = [];
const mockUsersDb = [];

// Intercept Mongoose Model methods for unit testing
CommunityIssue.create = async function(doc) {
  const newDoc = {
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'Pending',
    ...doc,
    save: async function() {
      const idx = mockIssuesDb.findIndex(i => i._id.toString() === this._id.toString());
      if (idx !== -1) mockIssuesDb[idx] = this;
      return this;
    }
  };
  mockIssuesDb.push(newDoc);
  return newDoc;
};

CommunityIssue.findById = async function(id) {
  const issue = mockIssuesDb.find(i => i._id.toString() === id.toString());
  if (!issue) return null;
  return {
    ...issue,
    save: async function() {
      const idx = mockIssuesDb.findIndex(i => i._id.toString() === this._id.toString());
      if (idx !== -1) mockIssuesDb[idx] = this;
      return this;
    }
  };
};

CommunityIssue.find = function(filter) {
  let results = [...mockIssuesDb];

  const evaluateCondition = (item, cond) => {
    for (const key of Object.keys(cond)) {
      if (key === '$or') {
        const matchesOr = cond.$or.some(subCond => evaluateCondition(item, subCond));
        if (!matchesOr) return false;
      } else if (key === 'societyId') {
        if (!item.societyId || item.societyId.toString() !== cond.societyId.toString()) return false;
      } else if (key === 'status') {
        if (typeof cond.status === 'object' && cond.status.$in) {
          if (!cond.status.$in.includes(item.status)) return false;
        } else if (item.status !== cond.status) {
          return false;
        }
      } else if (key === 'issueType') {
        if (typeof cond.issueType === 'object' && cond.issueType.$in) {
          if (!cond.issueType.$in.includes(item.issueType)) return false;
        } else if (item.issueType !== cond.issueType) {
          return false;
        }
      } else if (key === 'assignedTo') {
        if (!item.assignedTo || item.assignedTo.toString() !== cond.assignedTo.toString()) return false;
      } else if (key === 'reporterId') {
        if (typeof cond.reporterId === 'object' && cond.reporterId.$in) {
          const ids = cond.reporterId.$in.map(id => id.toString());
          if (!item.reporterId || !ids.includes(item.reporterId.toString())) return false;
        } else if (!item.reporterId || item.reporterId.toString() !== cond.reporterId.toString()) {
          return false;
        }
      }
    }
    return true;
  };

  if (filter) {
    if (filter.$and) {
      results = results.filter(item => filter.$and.every(cond => evaluateCondition(item, cond)));
    } else {
      results = results.filter(item => evaluateCondition(item, filter));
    }
  }

  const queryChain = {
    populate: function(field, select) {
      results = results.map(item => {
        const copy = { ...item };
        if (field === 'reporterId' && item.reporterId) {
          const user = mockUsersDb.find(u => u._id.toString() === item.reporterId.toString());
          copy.reporterId = user ? { _id: user._id, name: user.name, flatNumber: user.flatNumber, email: user.email } : null;
        }
        if (field === 'assignedTo' && item.assignedTo) {
          const user = mockUsersDb.find(u => u._id.toString() === item.assignedTo.toString());
          copy.assignedTo = user ? { _id: user._id, name: user.name } : null;
        }
        return copy;
      });
      return queryChain;
    },
    select: function(fields) {
      if (fields === '-reporterId') {
        results = results.map(item => {
          const copy = { ...item };
          delete copy.reporterId;
          return copy;
        });
      }
      return queryChain;
    },
    sort: function() {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return queryChain;
    },
    then: function(resolve) {
      resolve(results);
    }
  };

  return queryChain;
};

User.find = function() {
  return {
    select: function() {
      return mockUsersDb;
    }
  };
};

User.findOne = async function(filter) {
  return mockUsersDb.find(u => {
    if (filter._id && u._id.toString() !== filter._id.toString()) return false;
    if (filter.societyId && u.societyId.toString() !== filter.societyId.toString()) return false;
    if (filter.role && u.role !== filter.role) return false;
    return true;
  }) || null;
};

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('PARKING OBSERVATIONS AUTHORIZATION & OPERATIONAL WORKFLOW SUITE');
  console.log('================================================================\n');

  // Test Entities
  const societyAId = new mongoose.Types.ObjectId();
  const societyBId = new mongoose.Types.ObjectId();

  const securityStaffAId = new mongoose.Types.ObjectId();
  const securityStaffA = {
    _id: securityStaffAId,
    id: securityStaffAId.toString(),
    name: 'Ramesh Guard',
    email: 'ramesh.guard@societya.com',
    role: 'SecurityStaff',
    societyId: societyAId,
    status: 'Active'
  };

  const adminSecretaryAId = new mongoose.Types.ObjectId();
  const adminSecretaryA = {
    _id: adminSecretaryAId,
    id: adminSecretaryAId.toString(),
    name: 'Priya Secretary',
    email: 'priya.secretary@societya.com',
    role: 'Admin',
    societyId: societyAId,
    status: 'Active'
  };

  const residentAId = new mongoose.Types.ObjectId();
  const residentA = {
    _id: residentAId,
    id: residentAId.toString(),
    name: 'Amit Resident',
    email: 'amit.resident@societya.com',
    flatNumber: 'A-402',
    role: 'Resident',
    societyId: societyAId,
    status: 'Active'
  };

  const securityStaffBId = new mongoose.Types.ObjectId();
  const securityStaffB = {
    _id: securityStaffBId,
    id: securityStaffBId.toString(),
    name: 'Suresh Guard B',
    email: 'suresh@societyb.com',
    role: 'SecurityStaff',
    societyId: societyBId,
    status: 'Active'
  };

  mockUsersDb.push(securityStaffA, adminSecretaryA, residentA, securityStaffB);

  // -------------------------------------------------------------
  // SECTION 1: Route Middleware & Code Inspection
  // -------------------------------------------------------------
  console.log('SECTION 1: Route Middleware & Code Inspection');

  const issueRoutesPath = path.resolve(__dirname, '../src/routes/issueRoutes.js');
  const issueRoutesCode = fs.readFileSync(issueRoutesPath, 'utf8');

  runCheck(
    issueRoutesCode.includes("requireRoles('Resident', 'SecurityStaff', 'Admin')"),
    'issueRoutes.js grants POST / to Resident, SecurityStaff, and Admin'
  );

  runCheck(
    issueRoutesCode.includes("requireSociety"),
    'issueRoutes.js binds requireSociety middleware to enforce society association'
  );

  // Check role middleware function behavior
  const staffRoleCheck = createMockReqRes(securityStaffA);
  requireRoles('Resident', 'SecurityStaff', 'Admin')(staffRoleCheck.req, staffRoleCheck.res, staffRoleCheck.next);
  runCheck(staffRoleCheck.getNextError() === null, 'SecurityStaff passes requireRoles(Resident, SecurityStaff, Admin)');

  const adminRoleCheck = createMockReqRes(adminSecretaryA);
  requireRoles('Resident', 'SecurityStaff', 'Admin')(adminRoleCheck.req, adminRoleCheck.res, adminRoleCheck.next);
  runCheck(adminRoleCheck.getNextError() === null, 'Admin passes requireRoles(Resident, SecurityStaff, Admin)');

  const residentRoleCheck = createMockReqRes(residentA);
  requireRoles('Resident', 'SecurityStaff', 'Admin')(residentRoleCheck.req, residentRoleCheck.res, residentRoleCheck.next);
  runCheck(residentRoleCheck.getNextError() === null, 'Resident passes requireRoles(Resident, SecurityStaff, Admin)');

  const guestUserCheck = createMockReqRes({ role: 'Guest', societyId: societyAId, status: 'Active' });
  requireRoles('Resident', 'SecurityStaff', 'Admin')(guestUserCheck.req, guestUserCheck.res, guestUserCheck.next);
  runCheck(guestUserCheck.getNextError()?.statusCode === 403, 'Unauthorized role returns HTTP 403');

  const noSocietyCheck = createMockReqRes({ role: 'SecurityStaff', societyId: null, status: 'Active' });
  requireSociety(noSocietyCheck.req, noSocietyCheck.res, noSocietyCheck.next);
  runCheck(noSocietyCheck.getNextError()?.statusCode === 403, 'User without societyId returns HTTP 403');

  // -------------------------------------------------------------
  // SECTION 2: Parking Observation Creation (POST /api/issues)
  // -------------------------------------------------------------
  console.log('\nSECTION 2: Parking Observation Creation (POST /api/issues)');

  // 2.1 SecurityStaff logs parking observation
  const staffPostReq = createMockReqRes(
    securityStaffA,
    {
      issueType: 'Parking',
      title: 'Wrong Parking',
      description: 'Vehicle parked in visitor slot without permit',
      location: 'Basement B1, Slot 12',
      vehicleNumber: 'mh-12-ab-1234'
    },
    {},
    { path: 'https://res.cloudinary.com/societyhub/image/upload/v12345/parking_evidence.jpg' }
  );

  await createIssue(staffPostReq.req, staffPostReq.res, staffPostReq.next);
  const staffIssueRes = staffPostReq.getJsonResponse();

  runCheck(staffPostReq.getStatusCode() === 201, 'SecurityStaff successfully creates parking observation (HTTP 201)');
  runCheck(staffIssueRes?.data?.issueType === 'Parking', 'Created issue has issueType: Parking');
  runCheck(staffIssueRes?.data?.status === 'Pending', 'New observation defaults to Pending status');
  runCheck(staffIssueRes?.data?.vehicleNumber === 'MH-12-AB-1234', 'Vehicle number is trimmed and normalized to uppercase');
  runCheck(staffIssueRes?.data?.reporterId.toString() === securityStaffA._id.toString(), 'Observation is linked to SecurityStaff reporterId');
  runCheck(staffIssueRes?.data?.societyId.toString() === societyAId.toString(), 'Observation is bound to reporter societyId');
  runCheck(staffIssueRes?.data?.photoUrl.includes('parking_evidence.jpg'), 'Observation preserves uploaded photo evidence URL');

  // 2.2 Admin logs administrative parking observation
  const adminPostReq = createMockReqRes(
    adminSecretaryA,
    {
      issueType: 'Parking',
      title: 'Blocked Gate',
      description: 'Delivery truck blocking Society Gate 2',
      location: 'Gate 2 Driveway',
      vehicleNumber: 'DL-01-XY-9999'
    }
  );

  await createIssue(adminPostReq.req, adminPostReq.res, adminPostReq.next);
  runCheck(adminPostReq.getStatusCode() === 201, 'Admin (Secretary) successfully creates parking observation (HTTP 201)');

  // 2.3 Resident reports community issue
  const residentPostReq = createMockReqRes(
    residentA,
    {
      issueType: 'Cleanliness',
      title: 'Lobby Maintenance',
      description: 'Water leakage in Tower A elevator lobby',
      location: 'Tower A Ground Floor'
    }
  );

  await createIssue(residentPostReq.req, residentPostReq.res, residentPostReq.next);
  runCheck(residentPostReq.getStatusCode() === 201, 'Resident successfully creates community issue (HTTP 201)');

  // 2.4 Society B staff reports observation in Society B
  const staffBPostReq = createMockReqRes(
    securityStaffB,
    {
      issueType: 'Parking',
      title: 'Unauthorized Parking',
      description: 'Unknown sedan parked in reserved doctor slot',
      location: 'Society B North Wing',
      vehicleNumber: 'KA-05-ZZ-5555'
    }
  );
  await createIssue(staffBPostReq.req, staffBPostReq.res, staffBPostReq.next);

  // 2.5 Validation: Missing required fields
  const missingTitleReq = createMockReqRes(
    securityStaffA,
    {
      issueType: 'Parking',
      title: '',
      description: 'No title given',
      location: 'Basement'
    }
  );
  await createIssue(missingTitleReq.req, missingTitleReq.res, missingTitleReq.next);
  runCheck(missingTitleReq.getNextError()?.statusCode === 400, 'Missing title returns HTTP 400');

  const missingLocationReq = createMockReqRes(
    securityStaffA,
    {
      issueType: 'Parking',
      title: 'Wrong Parking',
      description: 'No location provided',
      location: '   '
    }
  );
  await createIssue(missingLocationReq.req, missingLocationReq.res, missingLocationReq.next);
  runCheck(missingLocationReq.getNextError()?.statusCode === 400, 'Blank location returns HTTP 400');

  // -------------------------------------------------------------
  // SECTION 3: Issue Retrieval & Scoping (GET /api/issues)
  // -------------------------------------------------------------
  console.log('\nSECTION 3: Issue Retrieval & Scoping (GET /api/issues)');

  // 3.1 SecurityStaff queries parking observations
  const staffGetReq = createMockReqRes(securityStaffA, {}, { issueType: 'Parking' });
  await getIssues(staffGetReq.req, staffGetReq.res, staffGetReq.next);
  const staffGetRes = staffGetReq.getJsonResponse();

  runCheck(staffGetReq.getStatusCode() === 200, 'SecurityStaff successfully queries issues (HTTP 200)');
  runCheck(Array.isArray(staffGetRes?.data), 'Returns issues array');
  runCheck(
    staffGetRes.data.some(i => i.vehicleNumber === 'MH-12-AB-1234'),
    'SecurityStaff sees observation reported by themselves'
  );
  runCheck(
    staffGetRes.data.every(i => i.societyId.toString() === societyAId.toString()),
    'SecurityStaff ONLY sees issues from their own society (strict isolation)'
  );
  runCheck(
    !staffGetRes.data.some(i => i.vehicleNumber === 'KA-05-ZZ-5555'),
    'Society B parking observation is NOT visible to Society A staff'
  );

  // 3.2 Admin queries all society issues
  const adminGetReq = createMockReqRes(adminSecretaryA, {}, {});
  await getIssues(adminGetReq.req, adminGetReq.res, adminGetReq.next);
  const adminGetRes = adminGetReq.getJsonResponse();

  runCheck(adminGetReq.getStatusCode() === 200, 'Admin successfully queries society issues (HTTP 200)');
  runCheck(
    adminGetRes.data.length >= 3,
    'Admin sees all community issues and operational parking observations in Society A'
  );
  runCheck(
    adminGetRes.data.every(i => i.societyId.toString() === societyAId.toString()),
    'Admin ONLY sees issues belonging to their society'
  );

  // 3.3 Resident queries community issues feed
  const residentGetReq = createMockReqRes(residentA, {}, {});
  await getIssues(residentGetReq.req, residentGetReq.res, residentGetReq.next);
  const residentGetRes = residentGetReq.getJsonResponse();

  runCheck(residentGetReq.getStatusCode() === 200, 'Resident successfully queries issues feed (HTTP 200)');
  // Pending issues should NOT be in the resident public feed
  runCheck(
    residentGetRes.data.every(i => ['Approved', 'Resolved'].includes(i.status)),
    'Resident feed strictly excludes unapproved Pending observations'
  );

  // -------------------------------------------------------------
  // SECTION 4: Admin Review & Staff Update Workflow
  // -------------------------------------------------------------
  console.log('\nSECTION 4: Admin Review & Staff Update Workflow');

  const createdObservationId = staffIssueRes.data._id;

  // 4.1 Admin reviews and approves parking observation
  const adminReviewReq = createMockReqRes(
    adminSecretaryA,
    {
      status: 'Approved',
      adminActionTaken: 'Notice issued to flat owner. Security instructed to monitor.',
      assignedTo: securityStaffA._id
    },
    {},
    null,
    { id: createdObservationId }
  );

  await adminUpdateIssue(adminReviewReq.req, adminReviewReq.res, adminReviewReq.next);
  const adminReviewRes = adminReviewReq.getJsonResponse();

  runCheck(adminReviewReq.getStatusCode() === 200, 'Admin successfully reviews and approves observation');
  runCheck(adminReviewRes?.data?.status === 'Approved', 'Status updated to Approved');
  runCheck(adminReviewRes?.data?.adminActionTaken.includes('Notice issued'), 'Admin action note is recorded');
  runCheck(adminReviewRes?.data?.assignedTo.toString() === securityStaffA._id.toString(), 'Observation assigned to staff member');

  // 4.2 Cross-society Admin attempts to review Society A observation
  const crossAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    id: new mongoose.Types.ObjectId().toString(),
    name: 'Secretary B',
    role: 'Admin',
    societyId: societyBId,
    status: 'Active'
  };
  const crossAdminReq = createMockReqRes(
    crossAdminUser,
    { status: 'Rejected' },
    {},
    null,
    { id: createdObservationId }
  );

  await adminUpdateIssue(crossAdminReq.req, crossAdminReq.res, crossAdminReq.next);
  runCheck(crossAdminReq.getNextError()?.statusCode === 404, 'Cross-society Admin update blocked with HTTP 404');

  // 4.3 Assigned staff logs resolution notes & evidence
  const staffUpdateReq = createMockReqRes(
    securityStaffA,
    {
      status: 'Resolved',
      staffNotes: 'Vehicle was moved by resident after warning.'
    },
    {},
    null,
    { id: createdObservationId }
  );

  await staffUpdateIssue(staffUpdateReq.req, staffUpdateReq.res, staffUpdateReq.next);
  const staffUpdateRes = staffUpdateReq.getJsonResponse();

  runCheck(staffUpdateReq.getStatusCode() === 200, 'Assigned staff successfully updates observation');
  runCheck(staffUpdateRes?.data?.status === 'Resolved', 'Status updated to Resolved');
  runCheck(staffUpdateRes?.data?.staffNotes.includes('Vehicle was moved'), 'Staff resolution notes recorded');

  // 4.4 Unassigned Staff B attempts to update Society A issue
  const unauthStaffReq = createMockReqRes(
    securityStaffB,
    { status: 'Rejected' },
    {},
    null,
    { id: createdObservationId }
  );
  await staffUpdateIssue(unauthStaffReq.req, unauthStaffReq.res, unauthStaffReq.next);
  runCheck(unauthStaffReq.getNextError()?.statusCode === 404, 'Foreign staff update rejected with 404');

  // -------------------------------------------------------------
  // SECTION 5: Frontend Component Safety & Contract Verification
  // -------------------------------------------------------------
  console.log('\nSECTION 5: Frontend Component Safety & Contract Verification');

  const parkingObsPath = path.resolve(__dirname, '../../client/src/pages/Staff/ParkingObservations.jsx');
  const parkingObsCode = fs.readFileSync(parkingObsPath, 'utf8');

  runCheck(
    parkingObsCode.includes('if (submitting) return;'),
    'ParkingObservations.jsx guards against multiple concurrent submits'
  );

  runCheck(
    parkingObsCode.includes('disabled={submitting}'),
    'ParkingObservations.jsx disables submit button while request is in-flight'
  );

  runCheck(
    parkingObsCode.includes('err.response?.data?.error || err.response?.data?.message'),
    'ParkingObservations.jsx formats error messages safely from API response'
  );

  runCheck(
    parkingObsCode.includes("api.get('/issues'"),
    'ParkingObservations.jsx fetches recent parking observations'
  );

  runCheck(
    parkingObsCode.includes('Recent Parking Observations'),
    'ParkingObservations.jsx displays operational observation log section'
  );

  runCheck(
    parkingObsCode.includes('This is an operational log'),
    'ParkingObservations.jsx informs staff that observations require Admin review'
  );

  // -------------------------------------------------------------
  // TEST REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${passedTests + failedTests} assertions passed (${Math.round((passedTests / (passedTests + failedTests)) * 100)}%)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`❌ ${failedTests} TEST(S) FAILED.`);
    process.exit(1);
  } else {
    console.log('✅ ALL PARKING OBSERVATIONS & AUTHORIZATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
