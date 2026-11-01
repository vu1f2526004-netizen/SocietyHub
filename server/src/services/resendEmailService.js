/**
 * Resend HTTPS Email Dispatcher Service
 * 
 * Delivers transactional emails via Resend HTTPS REST API (https://api.resend.com/emails).
 * Avoids outbound SMTP port blocking on restricted hosts such as Render Free.
 * 
 * Required Environment Variables:
 * - RESEND_API_KEY: Resend Bearer Token
 * - EMAIL_FROM: Verified sender identity (e.g. "SocietyHub <onboarding@resend.dev>" or "support@yourdomain.com")
 * - CONTACT_RECEIVER_EMAIL: Destination inbox for inquiries
 */

let customDispatcher = null;

/**
 * Checks whether Resend service is properly configured with an API key and verified sender.
 * @returns {boolean}
 */
const isResendConfigured = () => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();
  return Boolean(
    apiKey &&
    from &&
    !apiKey.includes('placeholder') &&
    !apiKey.includes('replace_with') &&
    !apiKey.includes('your_')
  );
};

/**
 * Resolves destination email address for contact notifications.
 * @returns {string}
 */
const getReceiverEmail = () => {
  return (
    process.env.CONTACT_RECEIVER_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    process.env.CONTACT_EMAIL ||
    process.env.MAIL_USER ||
    ''
  ).trim();
};

/**
 * Sets a custom dispatcher for testing or mocked environments.
 * @param {Function|null} dispatcher - Async function(url, options) returning { status, ok, json() }
 */
const setCustomDispatcher = (dispatcher) => {
  customDispatcher = dispatcher;
};

/**
 * Resets custom dispatcher to native fetch.
 */
const resetDispatcher = () => {
  customDispatcher = null;
};

/**
 * Dispatches an email via Resend HTTPS API.
 * 
 * @param {object} params
 * @param {string|string[]} params.to - Destination email address(es)
 * @param {string} params.subject - Email subject line
 * @param {string} [params.text] - Plain text body
 * @param {string} [params.html] - HTML body
 * @param {string} [params.replyTo] - Visitor/Sender reply-to address
 * @param {string} [params.from] - Optional sender override (defaults to process.env.EMAIL_FROM)
 * @param {string} [params.idempotencyKey] - Unique key to guarantee idempotency and avoid duplicate delivery
 * @param {Array} [params.attachments] - Optional attachments array [{ filename, content }]
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string, reason?: string, provider: 'resend' }>}
 */
const sendResendEmail = async ({ to, subject, text, html, replyTo, from: senderOverride, idempotencyKey, attachments }) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = (senderOverride || process.env.EMAIL_FROM || '').trim();

  // 1. Configuration Validation
  if (!apiKey) {
    return {
      success: false,
      reason: 'RESEND_KEY_MISSING',
      error: 'RESEND_API_KEY is not configured in environment variables',
      provider: 'resend'
    };
  }

  if (!fromEmail) {
    return {
      success: false,
      reason: 'EMAIL_FROM_MISSING',
      error: 'EMAIL_FROM sender identity is not configured in environment variables',
      provider: 'resend'
    };
  }

  const recipient = to || getReceiverEmail();
  if (!recipient) {
    return {
      success: false,
      reason: 'RECIPIENT_MISSING',
      error: 'No recipient email configured in CONTACT_RECEIVER_EMAIL or parameters',
      provider: 'resend'
    };
  }

  const recipients = Array.isArray(recipient)
    ? recipient.map(r => String(r).trim().toLowerCase())
    : [String(recipient).trim().toLowerCase()];

  // 2. Prepare Payload
  const payload = {
    from: fromEmail,
    to: recipients,
    subject: String(subject || '').trim(),
    text: text ? String(text).trim() : undefined,
    html: html ? String(html).trim() : undefined
  };

  if (replyTo && typeof replyTo === 'string' && replyTo.trim()) {
    payload.reply_to = replyTo.trim().toLowerCase();
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments;
  }

  // 3. Dispatch to Resend HTTPS API with Idempotency Key header if supplied
  try {
    const fetchFn = customDispatcher || globalThis.fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('No fetch implementation available in current runtime');
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      headers['Idempotency-Key'] = idempotencyKey.trim();
    }

    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.id) {
      const errorMsg = data.message || data.error?.message || `HTTP ${response.status} from Resend API`;
      console.error(`[RESEND ERROR] Failed to deliver email: ${errorMsg}`);
      return {
        success: false,
        reason: 'RESEND_API_ERROR',
        error: errorMsg,
        provider: 'resend'
      };
    }

    console.log(`[RESEND SUCCESS] Email accepted by Resend (Message ID: ${data.id})`);
    return {
      success: true,
      messageId: data.id,
      provider: 'resend'
    };
  } catch (err) {
    // Mask any secrets from error logs
    const safeError = err.message ? err.message.replace(/re_[A-Za-z0-9_]+/g, 're_***') : 'Network error';
    console.error(`[RESEND NETWORK ERROR] ${safeError}`);
    return {
      success: false,
      reason: 'RESEND_NETWORK_ERROR',
      error: safeError,
      provider: 'resend'
    };
  }
};

module.exports = {
  sendResendEmail,
  isResendConfigured,
  getReceiverEmail,
  setCustomDispatcher,
  resetDispatcher
};

