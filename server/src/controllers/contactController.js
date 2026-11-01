const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const ErrorResponse = require('../utils/errorResponse');
const Contact = require('../models/Contact');
const {
  sendResendEmail,
  isResendConfigured,
  getReceiverEmail
} = require('../services/resendEmailService');

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

    // 2. Strict sanitization: strip newlines and control characters from header fields to prevent injection
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

    // 3. Deduplication and Idempotency Protection
    // Generates a content hash to detect rapid duplicate submissions within 5 minutes
    const dedupHash = crypto
      .createHash('sha256')
      .update(`${cleanEmail}:${cleanSubject}:${cleanMessage}`)
      .digest('hex');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingInquiry = await Contact.findOne({
      dedupHash,
      createdAt: { $gte: fiveMinutesAgo }
    });

    let contact;
    if (existingInquiry) {
      // If notification was already sent, avoid duplicate dispatch
      if (existingInquiry.notificationStatus === 'Sent') {
        console.log(`[CONTACT DEDUP] Duplicate inquiry from "${cleanEmail}" suppressed. Existing inquiry ID: ${existingInquiry._id}`);
        return res.status(200).json({
          success: true,
          message: 'Your inquiry has already been received. Our operations team is reviewing it.',
          data: {
            inquiryId: existingInquiry._id,
            notificationStatus: 'Sent'
          }
        });
      }
      // Re-use existing inquiry document for retry
      contact = existingInquiry;
    } else {
      // 4. Guaranteed Database Persistence First
      try {
        contact = await Contact.create({
          name: cleanName,
          email: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage,
          status: 'New',
          notificationStatus: 'Pending',
          dedupHash,
          ipAddress: req.ip || req.connection?.remoteAddress || null
        });
      } catch (dbErr) {
        console.error(`[CONTACT DB ERROR] Failed to persist inquiry: ${dbErr.message}`);
        return next(new ErrorResponse('Unable to save your inquiry at this moment. Please try again later.', 500));
      }
    }

    // 5. Check Resend Configuration & Recipient Availability
    const recipient = getReceiverEmail();
    const resendConfigured = isResendConfigured();

    if (!resendConfigured || !recipient) {
      const reason = !recipient
        ? 'CONTACT_RECEIVER_EMAIL not configured'
        : 'RESEND_API_KEY or EMAIL_FROM not configured';

      console.warn(`[CONTACT EMAIL NOTICE] Email notification skipped (${reason}). Inquiry safely preserved in MongoDB: ${contact._id}`);
      contact.notificationStatus = 'Pending';
      contact.notificationError = reason;
      await contact.save().catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Thank you! Your inquiry has been received and our operations team will review it shortly.',
        data: {
          inquiryId: contact._id,
          notificationStatus: 'Pending'
        }
      });
    }

    // 6. Deliver Notification via Resend HTTPS API
    const safeHtmlMessage = cleanMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>');

    const emailResult = await sendResendEmail({
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
            This inquiry was securely forwarded via SocietyHub Resend HTTPS Dispatcher.
          </p>
        </div>
      `
    });

    if (emailResult.success) {
      contact.notificationStatus = 'Sent';
      contact.emailMessageId = emailResult.messageId;
      contact.notifiedAt = new Date();
      contact.notificationError = null;
      await contact.save().catch(() => {});

      console.log(`[CONTACT INQUIRY DELIVERED] Inquiry from "${cleanName}" <${cleanEmail}> delivered via Resend (Message ID: ${emailResult.messageId})`);

      return res.status(200).json({
        success: true,
        message: 'Thank you for reaching out! Your inquiry has been sent to our operations desk.',
        data: {
          inquiryId: contact._id,
          emailMessageId: emailResult.messageId,
          notificationStatus: 'Sent'
        }
      });
    } else {
      // Email delivery failed after successful DB persistence: retain record and inform user honestly
      contact.notificationStatus = 'Failed';
      contact.notificationError = emailResult.error || 'Delivery failed';
      await contact.save().catch(() => {});

      console.error(`[CONTACT RESEND ERROR] Email delivery failed: ${emailResult.error}. Inquiry retained in MongoDB: ${contact._id}`);

      return res.status(200).json({
        success: true,
        message: 'Thank you! Your inquiry has been received and our operations team will review it shortly.',
        data: {
          inquiryId: contact._id,
          notificationStatus: 'Failed'
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  contactLimiter,
  submitContact
};
