const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

// Load environment config from server/.env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const sendEmailModule = require('../server/src/utils/sendEmail');
const {
  sendEmail,
  isSmtpConfigured,
  getTransporter,
  setTransporter,
  resetTransporter,
  validateEmailParams
} = sendEmailModule;

async function runTests() {
  console.log('====================================================');
  console.log('   SocietyHub Nodemailer Service Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log('--- 1. Import and Interface Verification ---');

  test('Module exports both default callable function and named exports', () => {
    assert.strictEqual(typeof sendEmailModule, 'function', 'Default export should be a function');
    assert.strictEqual(typeof sendEmail, 'function', 'sendEmail named export should be a function');
    assert.strictEqual(sendEmailModule, sendEmail, 'Default export matches named sendEmail');
    assert.strictEqual(typeof isSmtpConfigured, 'function', 'isSmtpConfigured should be a function');
    assert.strictEqual(typeof getTransporter, 'function', 'getTransporter should be a function');
    assert.strictEqual(typeof setTransporter, 'function', 'setTransporter should be a function');
    assert.strictEqual(typeof resetTransporter, 'function', 'resetTransporter should be a function');
    assert.strictEqual(typeof validateEmailParams, 'function', 'validateEmailParams should be a function');
  });

  console.log('\n--- 2. Parameter Validation Verification ---');

  test('Rejects missing recipient email address', () => {
    const err = validateEmailParams({ to: '', subject: 'Test', text: 'Hello' });
    assert.ok(err && err.includes('Recipient email address'), 'Should flag missing to');
  });

  test('Rejects invalid recipient email format', () => {
    const err = validateEmailParams({ to: 'invalid-email-address', subject: 'Test', text: 'Hello' });
    assert.ok(err && err.includes('Invalid recipient email format'), 'Should flag invalid format');
  });

  test('Accepts valid email formats including plus-addressing and subdomains', () => {
    assert.strictEqual(validateEmailParams({ to: 'resident@societyhub.io', subject: 'Bill', text: 'Due' }), null);
    assert.strictEqual(validateEmailParams({ to: 'user+tag@gmail.com', subject: 'Event', text: 'Details' }), null);
    assert.strictEqual(validateEmailParams({ to: 'admin@greenvalley.co.in', subject: 'Pass', text: 'Approval' }), null);
  });

  test('Rejects missing subject', () => {
    const err = validateEmailParams({ to: 'user@example.com', subject: '', text: 'Hello' });
    assert.ok(err && err.includes('subject'), 'Should flag missing subject');
  });

  test('Rejects missing body (both text and html empty)', () => {
    const err = validateEmailParams({ to: 'user@example.com', subject: 'Notice' });
    assert.ok(err && err.includes('Email content'), 'Should flag missing text/html');
  });

  await testAsync('sendEmail returns safe INVALID_PARAMETERS without throwing', async () => {
    const res = await sendEmail({ to: '', subject: 'Hi' });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.reason, 'INVALID_PARAMETERS');
    assert.ok(res.error);
  });

  console.log('\n--- 3. Unconfigured SMTP Fallback Verification ---');

  // Save current env
  const origHost = process.env.SMTP_HOST;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;
  const origMailHost = process.env.MAIL_HOST;
  const origMailUser = process.env.MAIL_USER;
  const origMailPass = process.env.MAIL_PASS;

  // Clear env vars to simulate unconfigured SMTP
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.MAIL_HOST;
  delete process.env.MAIL_USER;
  delete process.env.MAIL_PASS;
  resetTransporter();

  test('isSmtpConfigured returns false when credentials are empty', () => {
    assert.strictEqual(isSmtpConfigured(), false);
  });

  test('getTransporter returns null when SMTP is unconfigured', () => {
    assert.strictEqual(getTransporter(), null);
  });

  await testAsync('sendEmail returns SMTP_NOT_CONFIGURED safely without throwing', async () => {
    const res = await sendEmail({
      to: 'resident@example.com',
      subject: 'Welcome to SocietyHub',
      text: 'Your registration is pending review.'
    });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.reason, 'SMTP_NOT_CONFIGURED');
  });

  console.log('\n--- 4. Transporter Reuse and Caching Verification ---');

  // Temporarily set dummy SMTP env vars to test caching
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'smtp_user';
  process.env.SMTP_PASS = 'smtp_pass';
  resetTransporter();

  test('Transporter is cached and reused across multiple getTransporter calls', () => {
    const t1 = getTransporter();
    const t2 = getTransporter();
    assert.ok(t1, 'First transporter should be created');
    assert.strictEqual(t1, t2, 'Subsequent call must reuse the exact same cached instance');
  });

  test('resetTransporter clears the cached instance', () => {
    resetTransporter();
    // After reset, a new instance is created
    const t3 = getTransporter();
    assert.ok(t3, 'Transporter recreated after reset');
    resetTransporter();
  });

  // Restore env to unconfigured state
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  console.log('\n--- 5. Mocked SMTP Transporter Dispatch Verification ---');

  let mockDispatchedMails = [];
  const mockSuccessTransporter = {
    sendMail: async (mailOptions) => {
      mockDispatchedMails.push(mailOptions);
      return {
        messageId: `<mock-${Date.now()}-societyhub@local>`,
        response: '250 2.0.0 OK queued mock'
      };
    }
  };

  setTransporter(mockSuccessTransporter);

  await testAsync('Mocked transporter accepts email and accurately reports acceptedBySmtp', async () => {
    mockDispatchedMails = [];
    const res = await sendEmail({
      to: 'resident.greenvalley@example.com',
      subject: 'Maintenance Bill Generated',
      text: 'Your bill for October 2026 is INR 2500.',
      html: '<p>Your bill for October 2026 is <b>INR 2500</b>.</p>'
    });

    assert.strictEqual(res.sent, true, 'sent must be true');
    assert.strictEqual(res.acceptedBySmtp, true, 'acceptedBySmtp must be true');
    assert.ok(res.messageId, 'messageId should be present');
    assert.strictEqual(mockDispatchedMails.length, 1, 'Exactly one mail dispatched');

    const mail = mockDispatchedMails[0];
    assert.strictEqual(mail.to, 'resident.greenvalley@example.com');
    assert.strictEqual(mail.subject, 'Maintenance Bill Generated');
    assert.strictEqual(mail.text, 'Your bill for October 2026 is INR 2500.');
    assert.strictEqual(mail.html, '<p>Your bill for October 2026 is <b>INR 2500</b>.</p>');
    assert.ok(mail.from.includes('SocietyHub'), 'From header contains SocietyHub');
  });

  console.log('\n--- 6. Error Handling and Resilience Verification ---');

  const mockFailingTransporter = {
    sendMail: async () => {
      throw new Error('Connection timeout to mail.internal:587');
    }
  };

  setTransporter(mockFailingTransporter);

  await testAsync('sendEmail safely catches SMTP connection failures and returns SMTP_SEND_FAILED', async () => {
    const res = await sendEmail({
      to: 'resident@example.com',
      subject: 'Visitor Arrived',
      text: 'A visitor has arrived at the gate.'
    });

    assert.strictEqual(res.sent, false, 'sent must be false on failure');
    assert.strictEqual(res.reason, 'SMTP_SEND_FAILED', 'reason must be SMTP_SEND_FAILED');
    assert.strictEqual(res.error, 'Connection timeout to mail.internal:587');
  });

  // Clean up
  resetTransporter();
  if (origHost) process.env.SMTP_HOST = origHost;
  if (origUser) process.env.SMTP_USER = origUser;
  if (origPass) process.env.SMTP_PASS = origPass;
  if (origMailHost) process.env.MAIL_HOST = origMailHost;
  if (origMailUser) process.env.MAIL_USER = origMailUser;
  if (origMailPass) process.env.MAIL_PASS = origMailPass;

  console.log('\n====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
