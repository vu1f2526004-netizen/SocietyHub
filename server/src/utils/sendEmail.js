const nodemailer = require('nodemailer');
const { sendResendEmail, isResendConfigured } = require('../services/resendEmailService');

/**
 * Cached singleton transporter instance.
 * Avoids reconstructing connection pools on each email dispatch.
 */
let cachedTransporter = null;

/**
 * Checks whether SMTP environment variables are properly configured.
 * @returns {boolean}
 */
const isSmtpConfigured = () => {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;
  return Boolean(host && user && pass);
};

/**
 * Obtains or creates the reusable SMTP transporter.
 * @returns {object|null} Nodemailer transporter instance or null if unconfigured
 */
const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!isSmtpConfigured()) {
    return null;
  }

  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return cachedTransporter;
};

/**
 * Sets a custom transporter (useful for mocked testing or custom transports).
 * @param {object|null} transporter
 */
const setTransporter = (transporter) => {
  cachedTransporter = transporter;
};

/**
 * Resets the cached transporter (useful when environment configurations change or during tests).
 */
const resetTransporter = () => {
  if (cachedTransporter && typeof cachedTransporter.close === 'function') {
    try {
      cachedTransporter.close();
    } catch (_) {}
  }
  cachedTransporter = null;
};

/**
 * Validates the required parameters for sending an email.
 * @param {object} params
 * @returns {string|null} Error message if invalid, null if valid
 */
const validateEmailParams = ({ to, subject, text, html }) => {
  if (!to || typeof to !== 'string' || !to.trim()) {
    return 'Recipient email address ("to") is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    return `Invalid recipient email format: "${to}".`;
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return 'Email "subject" is required.';
  }

  if ((!text || typeof text !== 'string' || !text.trim()) && (!html || typeof html !== 'string' || !html.trim())) {
    return 'Email content ("text" or "html") is required.';
  }

  return null;
};

/**
 * Dispatches email via Nodemailer SMTP.
 */
const sendViaNodemailer = async ({ to, subject, text, html, replyTo, normalizedTo }) => {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED'
    };
  }

  const rawFromEmail = process.env.FROM_EMAIL;
  const isPlaceholderFrom = !rawFromEmail || rawFromEmail.includes('YOUR_') || rawFromEmail.includes('placeholder') || !rawFromEmail.includes('@');
  const fromEmail = isPlaceholderFrom
    ? (process.env.MAIL_USER || process.env.SMTP_USER || 'no-reply@societyhub.internal')
    : rawFromEmail.trim();
  const fromName = process.env.FROM_NAME || 'SocietyHub';
  const from = `"${fromName}" <${fromEmail}>`;

  const mailOptions = {
    from,
    to: normalizedTo,
    subject: subject.trim(),
    text: text ? text.trim() : undefined,
    html: html ? html.trim() : undefined
  };

  if (replyTo && typeof replyTo === 'string' && replyTo.trim()) {
    mailOptions.replyTo = replyTo.trim().toLowerCase();
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`[SMTP ACCEPTED] Email accepted by SMTP relay for ${normalizedTo} (MessageId: ${info.messageId})`);
  return {
    success: true,
    sent: true,
    acceptedBySmtp: true,
    acceptedByProvider: true,
    provider: 'smtp',
    messageId: info.messageId,
    response: info.response
  };
};

/**
 * Universal safe email notification dispatcher.
 * Prioritizes Resend HTTPS API in production (bypassing outbound SMTP port restrictions on Render Free).
 * Seamlessly falls back to Nodemailer SMTP or mocks as configured.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML formatted body
 * @param {string} [options.replyTo] - Optional Reply-To address
 * @param {string} [options.idempotencyKey] - Optional idempotency key for Resend
 * @param {Array} [options.attachments] - Optional attachments
 * @returns {Promise<{ success: boolean, sent: boolean, reason?: string, messageId?: string, error?: string, acceptedByProvider?: boolean, provider?: string }>}
 */
const sendEmail = async ({ to, subject, text, html, replyTo, idempotencyKey, attachments }) => {
  // 1. Parameter Validation
  const validationError = validateEmailParams({ to, subject, text, html });
  if (validationError) {
    console.warn(`[EMAIL WARN] Email dispatch skipped: ${validationError}`);
    return {
      success: false,
      sent: false,
      reason: 'INVALID_PARAMETERS',
      error: validationError
    };
  }

  const normalizedTo = to.trim().toLowerCase();

  // 2. Explicit Mocked Transporter Check (for test fixtures that call setTransporter)
  if (cachedTransporter) {
    try {
      return await sendViaNodemailer({ to, subject, text, html, replyTo, normalizedTo });
    } catch (err) {
      console.error(`[SMTP ERROR] Failed to transmit email to ${normalizedTo}: ${err.message}`);
      return {
        success: false,
        sent: false,
        reason: 'SMTP_SEND_FAILED',
        error: err.message
      };
    }
  }

  // 3. Primary Dispatcher: Resend HTTPS API (avoids Render Free SMTP port blocks)
  if (isResendConfigured()) {
    const resendResult = await sendResendEmail({
      to: normalizedTo,
      subject,
      text,
      html,
      replyTo,
      idempotencyKey,
      attachments
    });

    return {
      success: resendResult.success,
      sent: resendResult.success,
      acceptedByProvider: resendResult.success,
      acceptedBySmtp: resendResult.success,
      provider: 'resend',
      messageId: resendResult.messageId,
      error: resendResult.error,
      reason: resendResult.reason
    };
  }

  // 4. Fallback Dispatcher: Nodemailer SMTP
  if (isSmtpConfigured()) {
    try {
      return await sendViaNodemailer({ to, subject, text, html, replyTo, normalizedTo });
    } catch (err) {
      console.error(`[SMTP ERROR] Failed to transmit email to ${normalizedTo}: ${err.message}`);
      return {
        success: false,
        sent: false,
        reason: 'SMTP_SEND_FAILED',
        error: err.message
      };
    }
  }

  // 5. Neither service is configured: skip gracefully without failing business workflow
  console.log(`[EMAIL INFO] Neither Resend nor SMTP is configured. Skipped email notification to: ${normalizedTo}`);
  return {
    success: false,
    sent: false,
    reason: 'EMAIL_NOT_CONFIGURED'
  };
};

// Export as both callable function and named exports for maximum caller compatibility
sendEmail.sendEmail = sendEmail;
sendEmail.isSmtpConfigured = isSmtpConfigured;
sendEmail.getTransporter = getTransporter;
sendEmail.setTransporter = setTransporter;
sendEmail.resetTransporter = resetTransporter;
sendEmail.validateEmailParams = validateEmailParams;
sendEmail.default = sendEmail;

module.exports = sendEmail;
