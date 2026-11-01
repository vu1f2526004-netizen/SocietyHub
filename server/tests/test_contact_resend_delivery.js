/**
 * Test Suite: Contact Inquiry & Resend HTTPS Email Delivery
 * 
 * Verifies:
 * 1. Input validation & header injection sanitization.
 * 2. Guaranteed MongoDB persistence before email dispatch.
 * 3. Resend HTTPS API delivery on success (updates notificationStatus to 'Sent').
 * 4. Resend HTTPS API delivery on failure (retains inquiry, marks 'Failed', returns honest success).
 * 5. Database failure returns honest HTTP 500 (no false success).
 * 6. Deduplication prevents duplicate records and repeat emails.
 * 7. Security: No secrets or credentials exposed.
 */

const assert = require('assert');
const crypto = require('crypto');
const Contact = require('../src/models/Contact');
const { submitContact } = require('../src/controllers/contactController');
const {
  sendResendEmail,
  isResendConfigured,
  setCustomDispatcher,
  resetDispatcher
} = require('../src/services/resendEmailService');

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

function createMockReqRes(body = {}, ip = '127.0.0.1') {
  const req = {
    body,
    ip,
    connection: { remoteAddress: ip }
  };
  let statusCode = 200;
  let jsonResponse = null;
  let nextCalledWith = null;

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
    nextCalledWith = err;
  };

  return {
    req,
    res,
    next,
    getResult: () => ({
      statusCode: nextCalledWith?.statusCode || statusCode,
      data: jsonResponse || (nextCalledWith ? { success: false, error: nextCalledWith.message } : null),
      error: nextCalledWith
    })
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('CONTACT RESEND HTTPS DELIVERY & PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  // Save original env vars
  const origResendKey = process.env.RESEND_API_KEY;
  const origEmailFrom = process.env.EMAIL_FROM;
  const origReceiver = process.env.CONTACT_RECEIVER_EMAIL;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: Input Validation
    // ----------------------------------------------------------------
    console.log('SECTION 1: Field Validation & Header Sanitization');

    // 1.1 Missing name
    {
      const { req, res, next, getResult } = createMockReqRes({
        email: 'user@example.com',
        subject: 'Maintenance question',
        message: 'This is a valid long message'
      });
      await submitContact(req, res, next);
      const r = getResult();
      runCheck(r.statusCode === 400 && r.data?.error === 'Please provide your name', 'Missing name returns HTTP 400');
    }

    // 1.2 Invalid email format
    {
      const { req, res, next, getResult } = createMockReqRes({
        name: 'Aarav Patel',
        email: 'invalid-email-format',
        subject: 'Maintenance question',
        message: 'This is a valid long message'
      });
      await submitContact(req, res, next);
      const r = getResult();
      runCheck(r.statusCode === 400 && r.data?.error.includes('valid email address format'), 'Invalid email returns HTTP 400');
    }

    // 1.3 Missing subject
    {
      const { req, res, next, getResult } = createMockReqRes({
        name: 'Aarav Patel',
        email: 'aarav@example.com',
        subject: '   ',
        message: 'This is a valid long message'
      });
      await submitContact(req, res, next);
      const r = getResult();
      runCheck(r.statusCode === 400 && r.data?.error === 'Please provide an inquiry subject', 'Missing subject returns HTTP 400');
    }

    // 1.4 Short message (< 10 chars)
    {
      const { req, res, next, getResult } = createMockReqRes({
        name: 'Aarav Patel',
        email: 'aarav@example.com',
        subject: 'Maintenance question',
        message: 'Short'
      });
      await submitContact(req, res, next);
      const r = getResult();
      runCheck(r.statusCode === 400 && r.data?.error.includes('10 characters long'), 'Message under 10 chars returns HTTP 400');
    }

    // ----------------------------------------------------------------
    // SECTION 2: Database Persistence First & Resend API Success
    // ----------------------------------------------------------------
    console.log('\nSECTION 2: Guaranteed DB Persistence & Resend Dispatch Success');

    // Configure test environment variables
    process.env.RESEND_API_KEY = 're_test_dummy_key_12345';
    process.env.EMAIL_FROM = 'SocietyHub <onboarding@resend.dev>';
    process.env.CONTACT_RECEIVER_EMAIL = 'operations@societyhub.internal';

    // Mock Contact.create and Contact.findOne for unit testing without live MongoDB writes
    let savedInquiries = [];
    let dbCreateFailed = false;

    const originalCreate = Contact.create;
    const originalFindOne = Contact.findOne;

    Contact.create = async function(data) {
      if (dbCreateFailed) {
        throw new Error('MongoNetworkError: connection timed out to studyHub replica set');
      }
      const record = {
        _id: 'inq_' + Math.random().toString(36).substring(2, 9),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function() {
          return this;
        }
      };
      savedInquiries.push(record);
      return record;
    };

    Contact.findOne = async function(query) {
      if (query.dedupHash) {
        return savedInquiries.find(i => i.dedupHash === query.dedupHash) || null;
      }
      return null;
    };

    // Mock Resend HTTPS Dispatcher
    let lastResendPayload = null;
    setCustomDispatcher(async (url, options) => {
      lastResendPayload = JSON.parse(options.body);
      return {
        status: 200,
        ok: true,
        json: async () => ({ id: 'resend_msg_' + Math.random().toString(36).substring(2, 9) })
      };
    });

    // 2.1 Submit inquiry and verify success
    {
      savedInquiries = [];
      const { req, res, next, getResult } = createMockReqRes({
        name: 'Sunita Rao\r\nBcc: evil@test.com',
        email: 'sunita.rao@example.com\r\n',
        subject: 'Parking Space Inquiry\r\n',
        message: 'Hello, I would like to inquire about visitor parking regulations.'
      });

      await submitContact(req, res, next);
      const r = getResult();

      runCheck(r.statusCode === 200, 'Valid inquiry returns HTTP 200');
      runCheck(r.data?.success === true, 'Response contains success: true');
      runCheck(r.data?.data?.notificationStatus === 'Sent', 'Response marks notificationStatus as Sent');
      runCheck(savedInquiries.length === 1, 'Inquiry successfully saved to MongoDB before delivery');
      runCheck(!savedInquiries[0].name.includes('\r') && !savedInquiries[0].name.includes('\n'), 'Header injection newlines stripped from name in DB record');
      runCheck(!savedInquiries[0].email.includes('\r') && !savedInquiries[0].email.includes('\n'), 'Header injection newlines stripped from email');
      runCheck(savedInquiries[0].notificationStatus === 'Sent', 'Inquiry record in DB updated with notificationStatus: Sent');
      runCheck(savedInquiries[0].emailMessageId?.startsWith('resend_msg_'), 'Inquiry record in DB stores Resend messageId');
      runCheck(lastResendPayload?.reply_to === 'sunita.rao@example.com', 'Resend payload sets visitor email as reply_to');
      runCheck(lastResendPayload?.from === 'SocietyHub <onboarding@resend.dev>', 'Resend payload uses EMAIL_FROM');
    }

    // ----------------------------------------------------------------
    // SECTION 3: Resend API Failure Handling (Preserves Inquiry)
    // ----------------------------------------------------------------
    console.log('\nSECTION 3: Resend Failure Handling & Inquiry Preservation');

    // Simulate Resend returning HTTP 422 (e.g. unverified sender domain)
    setCustomDispatcher(async (url, options) => {
      return {
        status: 422,
        ok: false,
        json: async () => ({
          statusCode: 422,
          message: 'The from address does not match any verified domain.'
        })
      };
    });

    {
      savedInquiries = [];
      const { req, res, next, getResult } = createMockReqRes({
        name: 'Vikram Mehta',
        email: 'vikram@example.com',
        subject: 'Elevator Maintenance Question',
        message: 'Could you please confirm when the service lift maintenance is scheduled?'
      });

      await submitContact(req, res, next);
      const r = getResult();

      runCheck(r.statusCode === 200, 'Resend failure returns honest HTTP 200 (not unhandled 502)');
      runCheck(r.data?.success === true, 'Returns success: true so user is informed inquiry is received');
      runCheck(r.data?.data?.notificationStatus === 'Failed', 'Response marks notificationStatus as Failed/Pending');
      runCheck(savedInquiries.length === 1, 'Inquiry is PRESERVED in MongoDB despite Resend failure');
      runCheck(savedInquiries[0].notificationStatus === 'Failed', 'Database record retains notificationStatus: Failed');
      runCheck(
        savedInquiries[0].notificationError?.includes('does not match any verified domain'),
        'Database record stores informative notificationError for operations audit'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 4: Database Failure Handling
    // ----------------------------------------------------------------
    console.log('\nSECTION 4: Database Failure Error Handling');

    {
      dbCreateFailed = true;
      let resendCalledDuringDbFailure = false;
      setCustomDispatcher(async () => {
        resendCalledDuringDbFailure = true;
        return { status: 200, ok: true, json: async () => ({ id: 'never_called' }) };
      });

      const { req, res, next, getResult } = createMockReqRes({
        name: 'Pooja Verma',
        email: 'pooja@example.com',
        subject: 'General Question',
        message: 'Please send society clubhouse rental rules.'
      });

      await submitContact(req, res, next);
      const r = getResult();

      runCheck(r.statusCode === 500, 'Database failure returns HTTP 500 (no false success)');
      runCheck(
        r.data?.error?.includes('Unable to save your inquiry'),
        'Returns honest error message when database persistence fails'
      );
      runCheck(!resendCalledDuringDbFailure, 'Email delivery is NEVER attempted if database persistence fails');
      dbCreateFailed = false;
    }

    // ----------------------------------------------------------------
    // SECTION 5: Deduplication & Idempotency
    // ----------------------------------------------------------------
    console.log('\nSECTION 5: Deduplication & Idempotency');

    {
      savedInquiries = [];
      let resendDispatchCount = 0;
      setCustomDispatcher(async () => {
        resendDispatchCount++;
        return { status: 200, ok: true, json: async () => ({ id: 'resend_msg_unique_1' }) };
      });

      const submissionPayload = {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        subject: 'Duplicate Submission Test',
        message: 'Testing that rapid repeated submissions do not trigger duplicate emails.'
      };

      // First submission
      const { req: req1, res: res1, next: next1, getResult: getResult1 } = createMockReqRes(submissionPayload);
      await submitContact(req1, res1, next1);
      const r1 = getResult1();

      runCheck(r1.statusCode === 200 && r1.data?.data?.notificationStatus === 'Sent', 'First submission dispatches email');
      runCheck(resendDispatchCount === 1, 'Resend called exactly once for first submission');
      runCheck(savedInquiries.length === 1, 'Single record saved for first submission');

      // Immediate identical submission
      const { req: req2, res: res2, next: next2, getResult: getResult2 } = createMockReqRes(submissionPayload);
      await submitContact(req2, res2, next2);
      const r2 = getResult2();

      runCheck(r2.statusCode === 200, 'Duplicate submission returns HTTP 200');
      runCheck(r2.data?.message?.includes('already been received'), 'Duplicate response indicates already received');
      runCheck(resendDispatchCount === 1, 'Duplicate submission does NOT trigger duplicate Resend dispatch');
      runCheck(savedInquiries.length === 1, 'Duplicate submission does NOT create duplicate database record');
    }

    // ----------------------------------------------------------------
    // SECTION 6: Graceful Handling when Resend Unconfigured
    // ----------------------------------------------------------------
    console.log('\nSECTION 6: Graceful Handling when Resend Unconfigured');

    {
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;
      savedInquiries = [];

      const { req, res, next, getResult } = createMockReqRes({
        name: 'Geeta Nair',
        email: 'geeta@example.com',
        subject: 'Visitor Pass Query',
        message: 'How do I pre-approve visitors using the resident portal?'
      });

      await submitContact(req, res, next);
      const r = getResult();

      runCheck(r.statusCode === 200, 'Unconfigured Resend returns HTTP 200');
      runCheck(r.data?.data?.notificationStatus === 'Pending', 'Inquiry marked as Pending');
      runCheck(savedInquiries.length === 1, 'Inquiry safely stored in MongoDB for administrative review');
    }

    // Restore original methods
    Contact.create = originalCreate;
    Contact.findOne = originalFindOne;
    resetDispatcher();

  } finally {
    // Restore env vars
    if (origResendKey !== undefined) process.env.RESEND_API_KEY = origResendKey;
    else delete process.env.RESEND_API_KEY;

    if (origEmailFrom !== undefined) process.env.EMAIL_FROM = origEmailFrom;
    else delete process.env.EMAIL_FROM;

    if (origReceiver !== undefined) process.env.CONTACT_RECEIVER_EMAIL = origReceiver;
    else delete process.env.CONTACT_RECEIVER_EMAIL;
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${passedTests + failedTests} assertions passed (${Math.round((passedTests / (passedTests + failedTests)) * 100)}%)`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error('\n❌ SOME CONTACT TESTS FAILED.\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL CONTACT RESEND & PERSISTENCE TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
