const path = require('path');
const dotenv = require('dotenv');

// 1. Load configuration from server/.env
const envPath = path.join(__dirname, '../server/.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[CONFIG ERROR] Failed to load server/.env:', result.error.message);
  process.exit(1);
}

const sendEmailModule = require('../server/src/utils/sendEmail');
const {
  sendEmail,
  isSmtpConfigured,
  getTransporter
} = sendEmailModule;

// Sanitize helper to scrub credentials or password-like strings from messages
function sanitizeError(msg) {
  if (!msg) return '';
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;
  let sanitized = String(msg);
  if (pass && pass.trim()) {
    sanitized = sanitized.split(pass.trim()).join('[REDACTED_SECRET]');
  }
  return sanitized;
}

async function runSmtpVerification() {
  console.log('====================================================');
  console.log('   SocietyHub Live SMTP Verification and Test');
  console.log('====================================================\n');

  // Step 1: Configuration check
  const hasConfig = isSmtpConfigured();
  if (!hasConfig) {
    console.error('[CONFIG CHECK] FAIL: SMTP is not configured in server/.env');
    console.log(JSON.stringify({
      nodemailerInstalled: 'PASS',
      configurationLoaded: 'FAIL',
      smtpConnection: 'FAIL',
      emailAccepted: 'FAIL',
      reason: 'Missing SMTP credentials in server/.env'
    }));
    return;
  }

  const recipient = (process.env.SMTP_USER || process.env.MAIL_USER || '').trim();
  console.log(`[CONFIG CHECK] PASS: SMTP configuration loaded. Target test recipient: ${recipient}`);

  // Step 2: Transporter verify
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[TRANSPORTER] FAIL: Unable to acquire SMTP transporter');
    return;
  }

  console.log('[SMTP CONNECT] Testing transporter connection and authentication via transporter.verify()...');
  let verifySuccess = false;
  try {
    await transporter.verify();
    verifySuccess = true;
    console.log('[SMTP CONNECT] PASS: SMTP connection and credentials authenticated successfully.');
  } catch (err) {
    const sanitizedMsg = sanitizeError(err.message);
    console.error(`[SMTP CONNECT] FAIL: Authentication or connectivity error: ${sanitizedMsg}`);
    console.log(JSON.stringify({
      nodemailerInstalled: 'PASS',
      configurationLoaded: 'PASS',
      smtpConnection: 'FAIL',
      emailAccepted: 'FAIL',
      error: sanitizedMsg
    }));
    return;
  }

  // Step 3: Send exactly ONE test email to configured SMTP_USER
  console.log('\n[TEST EMAIL] Sending exactly one test email to configured SMTP_USER...');
  try {
    const sendResult = await sendEmail({
      to: recipient,
      subject: 'SocietyHub SMTP Test',
      text: 'This is a test email confirming that SocietyHub SMTP configuration is working.',
      html: '<p>This is a test email confirming that SocietyHub SMTP configuration is working.</p>'
    });

    if (sendResult.sent && sendResult.acceptedBySmtp) {
      console.log(`[TEST EMAIL] PASS: Test email accepted by SMTP relay.`);
      console.log(`[TEST EMAIL] Message ID: ${sendResult.messageId}`);
      console.log(`[TEST EMAIL] SMTP Response: ${sendResult.response || 'Accepted'}`);
      console.log('\n[SUMMARY REPORT JSON]');
      console.log(JSON.stringify({
        nodemailerInstalled: 'PASS',
        configurationLoaded: 'PASS',
        smtpConnection: 'PASS',
        emailAccepted: 'PASS',
        messageId: sendResult.messageId,
        recipient: recipient
      }, null, 2));
    } else {
      console.error(`[TEST EMAIL] FAIL: Email was not accepted by SMTP relay. Reason: ${sendResult.reason || sendResult.error}`);
      console.log(JSON.stringify({
        nodemailerInstalled: 'PASS',
        configurationLoaded: 'PASS',
        smtpConnection: 'PASS',
        emailAccepted: 'FAIL',
        reason: sendResult.reason,
        error: sanitizeError(sendResult.error)
      }));
    }
  } catch (err) {
    const sanitizedMsg = sanitizeError(err.message);
    console.error(`[TEST EMAIL] FAIL: Error dispatching email: ${sanitizedMsg}`);
    console.log(JSON.stringify({
      nodemailerInstalled: 'PASS',
      configurationLoaded: 'PASS',
      smtpConnection: 'PASS',
      emailAccepted: 'FAIL',
      error: sanitizedMsg
    }));
  }
}

runSmtpVerification().catch(err => {
  console.error('Fatal execution error:', sanitizeError(err.message));
  process.exit(1);
});
