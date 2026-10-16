const nodemailer = require('nodemailer');

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
 * Safe email notification dispatcher.
 * Delivers transactional emails via Nodemailer when SMTP credentials are configured.
 * Safely falls back if SMTP is unconfigured without disrupting business operations.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML formatted body
 * @returns {Promise<{ sent: boolean, reason?: string, messageId?: string, error?: string, acceptedBySmtp?: boolean }>}
 */
const sendEmail = async ({ to, subject, text, html }) => {
  // 1. Parameter Validation
  const validationError = validateEmailParams({ to, subject, text, html });
  if (validationError) {
    console.warn(`[SMTP WARN] Email dispatch skipped: ${validationError}`);
    return {
      success: false,
      sent: false,
      reason: 'INVALID_PARAMETERS',
      error: validationError
    };
  }

  const normalizedTo = to.trim().toLowerCase();

  // 2. Configuration Check
  if (!cachedTransporter && !isSmtpConfigured()) {
    console.log(`[SMTP INFO] SMTP not configured. Skipped email notification to: ${normalizedTo}`);
    return {
      success: false,
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED'
    };
  }

  // 3. Acquire Transporter
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return {
        success: false,
        sent: false,
        reason: 'SMTP_NOT_CONFIGURED'
      };
    }

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.MAIL_USER || 'no-reply@societyhub.internal';
    const fromName = process.env.FROM_NAME || 'SocietyHub';
    const from = `"${fromName}" <${fromEmail}>`;

    // 4. Dispatch Email to SMTP Server
    const info = await transporter.sendMail({
      from,
      to: normalizedTo,
      subject: subject.trim(),
      text: text ? text.trim() : undefined,
      html: html ? html.trim() : undefined
    });

    // Note: Accurately record SMTP acceptance (relay handoff), not inbox delivery.
    console.log(`[SMTP ACCEPTED] Email accepted by SMTP relay for ${normalizedTo} (MessageId: ${info.messageId})`);
    return {
      success: true,
      sent: true,
      acceptedBySmtp: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (err) {
    // Never log passwords, SMTP auth tokens, or secrets.
    console.error(`[SMTP ERROR] Failed to transmit email to ${normalizedTo}: ${err.message}`);
    return {
      success: false,
      sent: false,
      reason: 'SMTP_SEND_FAILED',
      error: err.message
    };
  }
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

