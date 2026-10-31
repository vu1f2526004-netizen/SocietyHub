const rateLimit = require('express-rate-limit');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');

// Rate limiter for public contact requests (prevents automated bot flooding)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'test' ? 1000 : 15, // 15 submissions per 15 mins per IP in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many contact requests from this network. Please wait a few minutes before trying again.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

// @desc      Submit public contact inquiry
// @route     POST /api/contact
// @access    Public
const submitContact = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body || {};

    // 1. Required field checks
    if (!name || typeof name !== 'string' || !name.trim()) {
      return next(new ErrorResponse('Please provide your name', 400));
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return next(new ErrorResponse('Please provide an inquiry subject', 400));
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return next(new ErrorResponse('Please provide a message description', 400));
    }

    // 2. Strict sanitization: strip newlines and control characters from header fields to prevent header injection
    const cleanName = name.replace(/[\r\n\t]/g, ' ').trim().slice(0, 100);
    const cleanEmail = email.replace(/[\r\n\t]/g, '').trim().toLowerCase().slice(0, 120);
    const cleanSubject = subject.replace(/[\r\n\t]/g, ' ').trim().slice(0, 150);
    const cleanMessage = message.trim().slice(0, 3000);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return next(new ErrorResponse('Please provide a valid email address format', 400));
    }

    if (cleanName.length < 2) {
      return next(new ErrorResponse('Name must be at least 2 characters long', 400));
    }

    if (cleanSubject.length < 3) {
      return next(new ErrorResponse('Subject must be at least 3 characters long', 400));
    }

    if (cleanMessage.length < 10) {
      return next(new ErrorResponse('Message must be at least 10 characters long', 400));
    }

    // 3. Resolve destination recipient from trusted server configuration only (user input can NEVER override recipient)
    const recipient = (
      process.env.SUPPORT_EMAIL ||
      process.env.CONTACT_EMAIL ||
      process.env.MAIL_USER ||
      process.env.SMTP_USER ||
      ''
    ).trim();

    if (!recipient) {
      console.error('[CONTACT CONFIG ERROR] No destination recipient configured in SUPPORT_EMAIL, CONTACT_EMAIL, or MAIL_USER');
      return next(new ErrorResponse('The inquiry delivery service is currently unconfigured. Please contact society operations directly.', 503));
    }

    // 4. Verify SMTP transport availability
    if (!sendEmail.isSmtpConfigured()) {
      console.error('[CONTACT CONFIG ERROR] SMTP transport is not configured in environment variables');
      return next(new ErrorResponse('The email delivery service is currently unavailable. Please contact society operations directly.', 503));
    }

    // 5. Escape HTML entities for safe rendering in HTML email
    const safeHtmlMessage = cleanMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>');

    const recipientDomain = recipient.includes('@') ? recipient.split('@')[1] : 'societyhub.internal';

    // 6. Deliver inquiry email with visitor's email set as Reply-To
    const sendResult = await sendEmail({
      to: recipient,
      replyTo: cleanEmail,
      subject: `[SocietyHub Inquiry] ${cleanSubject}`,
      text: `New public inquiry received:\n\nFrom: ${cleanName} <${cleanEmail}>\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}\n\n---\nSent via SocietyHub Public Contact Form`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin: 0; font-size: 20px;">SocietyHub Public Inquiry</h2>
            <span style="font-size: 13px; color: #64748b;">Submitted via SocietyHub Contact Portal</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 100px;"><strong>From:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${cleanName} &lt;<a href="mailto:${cleanEmail}" style="color: #059669; text-decoration: none;">${cleanEmail}</a>&gt;</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${cleanSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Reply-To:</strong></td>
              <td style="padding: 6px 0; color: #059669;">${cleanEmail}</td>
            </tr>
          </table>
          <div style="margin-top: 16px;">
            <strong style="font-size: 13.5px; color: #475569; display: block; margin-bottom: 8px;">Inquiry Message:</strong>
            <div style="padding: 16px; background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; font-size: 14.5px; line-height: 1.6; color: #334155;">
              ${safeHtmlMessage}
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
            This inquiry was routed to ${recipientDomain} via SocietyHub Operations Relay.
          </p>
        </div>
      `
    });

    if (!sendResult || !sendResult.success || !sendResult.acceptedBySmtp) {
      console.error(`[CONTACT ERROR] SMTP delivery rejected or failed: ${sendResult?.error || sendResult?.reason || 'Unknown error'}`);
      return next(new ErrorResponse('Failed to send your inquiry. Please verify your details or try again later.', 502));
    }

    console.log(`[CONTACT INQUIRY DELIVERED] Inquiry from "${cleanName}" <${cleanEmail}> accepted by SMTP for ${recipient} (MessageId: ${sendResult.messageId})`);

    return res.status(200).json({
      success: true,
      message: 'Thank you for reaching out! Your inquiry has been sent to our operations desk.',
      data: {
        inquiryId: sendResult.messageId
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  contactLimiter,
  submitContact
};
