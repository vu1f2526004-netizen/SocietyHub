/**
 * SocietyHub Email Template Engine
 * Generates responsive, branded HTML email templates with readable plain-text fallbacks.
 * All dynamic parameters are escaped to prevent HTML injection.
 */

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Base layout wrapper for all SocietyHub transactional emails
 */
const renderEmailLayout = ({ title, preheader, bodyContentHtml, ctaText, ctaUrl, societyName }) => {
  const safeTitle = escapeHtml(title || 'SocietyHub Notification');
  const safePreheader = escapeHtml(preheader || '');
  const safeSocietyName = escapeHtml(societyName || 'SocietyHub Community');
  const safeCtaText = escapeHtml(ctaText || '');
  const safeCtaUrl = escapeHtml(ctaUrl || '');

  const ctaButtonHtml = ctaText && ctaUrl ? `
    <div style="margin: 32px 0 20px 0; text-align: center;">
      <a href="${safeCtaUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
        ${safeCtaText} &rarr;
      </a>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-box { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <span style="display: none; font-size: 1px; color: #f1f5f9; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${safePreheader}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 0;">
    <tr>
      <td align="center">
        <table class="email-container" role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 20px 0; text-align: center;">
              <div style="display: inline-block;">
                <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Society<span style="color: #2563eb;">Hub</span></span>
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500;">
                ${safeSocietyName}
              </div>
            </td>
          </tr>
          <!-- Main Content Card -->
          <tr>
            <td>
              <div class="content-box" style="background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                  ${safeTitle}
                </h1>
                <div style="font-size: 14px; color: #334155; line-height: 1.6;">
                  ${bodyContentHtml}
                </div>
                ${ctaButtonHtml}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">This is an automated notification from <strong>${safeSocietyName}</strong> on SocietyHub.</p>
              <p style="margin: 0;">Please do not reply directly to this email. For assistance, contact your society administration office.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ============================================================================
// 1. RESIDENT TEMPLATES
// ============================================================================

/**
 * A. Resident: Registration Approved
 */
const residentRegistrationApproved = ({ residentName, societyName, flatNumber, loginUrl }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeFlat = escapeHtml(flatNumber);

  const title = 'Registration Approved';
  const preheader = `Your registration request for ${safeSociety} has been approved.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>We are pleased to inform you that your registration request for flat <strong>${safeFlat}</strong> at <strong>${safeSociety}</strong> has been approved by the society administrator.</p>
    <p>Your resident account is now active. You can log in to access maintenance billing, society complaints, visitor passes, community voting, and events.</p>
  `;

  const text = `Hello ${residentName},\n\nYour registration request for flat ${flatNumber} at "${societyName}" has been approved by the society administrator.\nYour account is now active.\n\nYou can log in here: ${loginUrl}\n\nBest regards,\n${societyName} Administration`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'Log In to Resident Portal',
    ctaUrl: loginUrl,
    societyName
  });

  return { subject: `SocietyHub: Registration Approved - ${societyName}`, text, html };
};

/**
 * B. Resident: Registration Rejected
 */
const residentRegistrationRejected = ({ residentName, societyName, flatNumber }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeFlat = escapeHtml(flatNumber);

  const title = 'Registration Status Update';
  const preheader = `Update regarding your registration for ${safeSociety}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>Thank you for your interest in joining <strong>${safeSociety}</strong>.</p>
    <p>Your registration request for flat <strong>${safeFlat}</strong> was not approved by the society administration office at this time.</p>
    <p>If you believe this is in error or require further clarification, please contact your society administrative committee directly.</p>
  `;

  const text = `Hello ${residentName},\n\nYour registration request for flat ${flatNumber} at "${societyName}" was not approved by the society administration office at this time.\n\nPlease contact your society administrative committee if you require assistance.\n\nBest regards,\n${societyName} Administration`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    societyName
  });

  return { subject: `SocietyHub: Registration Status Update - ${societyName}`, text, html };
};

/**
 * C. Resident: Maintenance Bill Generated
 */
const residentMaintenanceBillCreated = ({ residentName, societyName, flatNumber, billId, month, amount, dueDate, paymentUrl }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeFlat = escapeHtml(flatNumber);
  const safeMonth = escapeHtml(month);
  const safeAmount = escapeHtml(amount);
  const safeDueDate = escapeHtml(new Date(dueDate).toLocaleDateString());
  const safeBillId = escapeHtml(billId);

  const title = `New Maintenance Bill: ${safeMonth}`;
  const preheader = `A new maintenance bill of ₹${safeAmount} for ${safeMonth} has been issued.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>A new maintenance bill has been issued for your flat <strong>${safeFlat}</strong> at <strong>${safeSociety}</strong>.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Billing Period:</td><td style="font-weight: 600; text-align: right;">${safeMonth}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Bill Reference:</td><td style="font-weight: 600; text-align: right;">${safeBillId}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount Due:</td><td style="font-weight: 700; color: #0f172a; font-size: 16px; text-align: right;">₹${safeAmount}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Due Date:</td><td style="font-weight: 600; color: #dc2626; text-align: right;">${safeDueDate}</td></tr>
      </table>
    </div>
    <p>Please log in to your resident portal to view bill breakdown and complete payment before the due date.</p>
  `;

  const text = `Hello ${residentName},\n\nA new maintenance bill has been issued for flat ${flatNumber} at ${societyName}.\n\nBilling Period: ${month}\nBill Reference: ${billId}\nAmount Due: INR ${amount}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nPay online: ${paymentUrl}\n\nBest regards,\n${societyName} Finance Office`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View & Pay Maintenance Bill',
    ctaUrl: paymentUrl,
    societyName
  });

  return { subject: `SocietyHub: Maintenance Bill - ${month} (${societyName})`, text, html };
};

/**
 * D. Resident: Payment Confirmed (Receipt)
 */
const residentPaymentConfirmed = ({ residentName, societyName, flatNumber, amount, receiptNumber, paymentId, month, paymentDate, portalUrl }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeFlat = escapeHtml(flatNumber);
  const safeAmount = escapeHtml(amount);
  const safeReceipt = escapeHtml(receiptNumber);
  const safePaymentId = escapeHtml(paymentId);
  const safeMonth = escapeHtml(month);
  const safeDate = escapeHtml(new Date(paymentDate || Date.now()).toLocaleDateString());

  const title = 'Payment Confirmed';
  const preheader = `Payment receipt for ₹${safeAmount} (${safeMonth}) confirmed.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>Your maintenance payment for <strong>${safeMonth}</strong> (Flat <strong>${safeFlat}</strong>) has been verified and confirmed successfully.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #166534; padding: 4px 0;">Receipt Number:</td><td style="font-weight: 700; text-align: right; color: #166534;">${safeReceipt}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Transaction Ref:</td><td style="font-weight: 600; text-align: right;">${safePaymentId}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Period:</td><td style="font-weight: 600; text-align: right;">${safeMonth}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Confirmed Amount:</td><td style="font-weight: 700; color: #166534; font-size: 16px; text-align: right;">₹${safeAmount}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Payment Date:</td><td style="font-weight: 600; text-align: right;">${safeDate}</td></tr>
      </table>
    </div>
    <p>Thank you for keeping your society maintenance dues up to date.</p>
  `;

  const text = `Hello ${residentName},\n\nYour maintenance payment for ${month} (Flat ${flatNumber}) has been confirmed successfully.\n\nReceipt Number: ${receiptNumber}\nTransaction Reference: ${paymentId}\nPeriod: ${month}\nConfirmed Amount: INR ${amount}\nPayment Date: ${new Date(paymentDate || Date.now()).toLocaleDateString()}\n\nView History: ${portalUrl}\n\nThank you,\n${societyName} Management`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View Payment History',
    ctaUrl: portalUrl,
    societyName
  });

  return { subject: `SocietyHub: Payment Receipt - ${month} [${receiptNumber}]`, text, html };
};

/**
 * E. Resident: Payment Failure Notification
 */
const residentPaymentFailed = ({ residentName, societyName, flatNumber, amount, month, orderId, retryUrl }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeFlat = escapeHtml(flatNumber);
  const safeAmount = escapeHtml(amount);
  const safeMonth = escapeHtml(month);
  const safeOrderId = escapeHtml(orderId);

  const title = 'Payment Verification Failed';
  const preheader = `Payment for ${safeMonth} could not be confirmed.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>Your payment attempt of <strong>₹${safeAmount}</strong> for <strong>${safeMonth}</strong> (Flat <strong>${safeFlat}</strong>) could not be verified.</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #991b1b; padding: 4px 0;">Status:</td><td style="font-weight: 700; color: #dc2626; text-align: right;">Failed / Unconfirmed</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Order Reference:</td><td style="font-weight: 600; text-align: right;">${safeOrderId}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount:</td><td style="font-weight: 600; text-align: right;">₹${safeAmount}</td></tr>
      </table>
    </div>
    <p>Please note: Your maintenance bill status remains <strong>Pending</strong>. No receipt has been generated. If funds were debited by your bank, they will typically be reversed within standard banking timelines.</p>
    <p>You can retry payment securely through your resident portal.</p>
  `;

  const text = `Hello ${residentName},\n\nYour payment attempt of INR ${amount} for ${month} (Flat ${flatNumber}) could not be verified.\nOrder Reference: ${orderId}\n\nYour maintenance bill remains Pending. You can retry payment at: ${retryUrl}\n\n${societyName} Administration`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'Retry Payment in Resident Portal',
    ctaUrl: retryUrl,
    societyName
  });

  return { subject: `SocietyHub: Payment Failure Notification - ${month}`, text, html };
};

/**
 * F. Resident: Complaint Status Update
 */
const residentComplaintStatusUpdated = ({ residentName, societyName, title: complaintTitle, status, adminNotes, portalUrl }) => {
  const safeName = escapeHtml(residentName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(complaintTitle);
  const safeStatus = escapeHtml(status);
  const safeNotes = adminNotes ? escapeHtml(adminNotes) : '';

  const title = `Complaint Status: ${safeStatus}`;
  const preheader = `Your complaint "${safeTitle}" status changed to ${safeStatus}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeName}</strong>,</p>
    <p>Your registered complaint "<strong>${safeTitle}</strong>" at <strong>${safeSociety}</strong> has been updated.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Complaint:</td><td style="font-weight: 600; text-align: right;">${safeTitle}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Current Status:</td><td style="font-weight: 700; color: #2563eb; text-align: right;">${safeStatus}</td></tr>
        ${safeNotes ? `<tr><td style="color: #64748b; padding: 4px 0;">Notes:</td><td style="text-align: right;">${safeNotes}</td></tr>` : ''}
      </table>
    </div>
    <p>You can view progress details or updates directly in your Resident Portal.</p>
  `;

  const text = `Hello ${residentName},\n\nYour complaint "${complaintTitle}" at ${societyName} has been updated to "${status}".\n${adminNotes ? `Notes: ${adminNotes}\n` : ''}\nView details: ${portalUrl}\n\nBest regards,\n${societyName} Support`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View My Complaints',
    ctaUrl: portalUrl,
    societyName
  });

  return { subject: `SocietyHub: Complaint Status Updated - ${complaintTitle}`, text, html };
};

// ============================================================================
// 2. ADMIN / SECRETARY TEMPLATES (Same Society Only)
// ============================================================================

/**
 * A. Admin: New Resident Registration Request
 */
const adminNewRegistrationRequest = ({ adminName, societyName, residentName, flatNumber, email, mobile, reviewUrl }) => {
  const safeAdminName = escapeHtml(adminName);
  const safeSociety = escapeHtml(societyName);
  const safeResidentName = escapeHtml(residentName);
  const safeFlat = escapeHtml(flatNumber);
  const safeEmail = escapeHtml(email);
  const safeMobile = escapeHtml(mobile);

  const title = 'New Resident Registration Request';
  const preheader = `New registration request for Flat ${safeFlat} awaiting review.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeAdminName}</strong>,</p>
    <p>A prospective resident has submitted a new registration request for <strong>${safeSociety}</strong>.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Resident Name:</td><td style="font-weight: 600; text-align: right;">${safeResidentName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Flat Number:</td><td style="font-weight: 700; color: #2563eb; text-align: right;">${safeFlat}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Email:</td><td style="font-weight: 600; text-align: right;">${safeEmail}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Mobile:</td><td style="font-weight: 600; text-align: right;">${safeMobile}</td></tr>
      </table>
    </div>
    <p>Please review and verify the applicant's details in the Admin Portal to approve or reject access.</p>
  `;

  const text = `Hello ${adminName},\n\nA new resident registration request has been submitted for ${societyName}.\nResident: ${residentName}\nFlat: ${flatNumber}\nEmail: ${email}\nMobile: ${mobile}\n\nReview request: ${reviewUrl}\n\nSocietyHub Admin Notifications`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'Review Registration Requests',
    ctaUrl: reviewUrl,
    societyName
  });

  return { subject: `SocietyHub Admin Alert: New Resident Registration - Flat ${flatNumber}`, text, html };
};

/**
 * B. Admin: Maintenance Payment Confirmed
 */
const adminPaymentReceived = ({ adminName, societyName, residentName, flatNumber, amount, month, receiptNumber, paymentDate, ledgerUrl }) => {
  const safeAdminName = escapeHtml(adminName);
  const safeSociety = escapeHtml(societyName);
  const safeResidentName = escapeHtml(residentName);
  const safeFlat = escapeHtml(flatNumber);
  const safeAmount = escapeHtml(amount);
  const safeMonth = escapeHtml(month);
  const safeReceipt = escapeHtml(receiptNumber);
  const safeDate = escapeHtml(new Date(paymentDate || Date.now()).toLocaleDateString());

  const title = 'Maintenance Payment Confirmed';
  const preheader = `Received ₹${safeAmount} from Flat ${safeFlat} for ${safeMonth}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeAdminName}</strong>,</p>
    <p>A maintenance payment has been verified and recorded into the <strong>${safeSociety}</strong> financial ledger.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Resident:</td><td style="font-weight: 600; text-align: right;">${safeResidentName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Flat Number:</td><td style="font-weight: 700; color: #166534; text-align: right;">Flat ${safeFlat}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Billing Period:</td><td style="font-weight: 600; text-align: right;">${safeMonth}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount Paid:</td><td style="font-weight: 700; color: #166534; font-size: 16px; text-align: right;">₹${safeAmount}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Receipt:</td><td style="font-weight: 600; text-align: right;">${safeReceipt}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Date:</td><td style="font-weight: 600; text-align: right;">${safeDate}</td></tr>
      </table>
    </div>
  `;

  const text = `Hello ${adminName},\n\nA maintenance payment of INR ${amount} for ${month} from Flat ${flatNumber} (${residentName}) has been confirmed and recorded in ${societyName} finances.\nReceipt: ${receiptNumber}\nDate: ${new Date(paymentDate || Date.now()).toLocaleDateString()}\n\nView records: ${ledgerUrl}`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View Society Payments',
    ctaUrl: ledgerUrl,
    societyName
  });

  return { subject: `SocietyHub Finance: Payment Received - Flat ${flatNumber} (₹${amount})`, text, html };
};

/**
 * C. Admin: Serious Complaint / Incident Alert
 */
const adminSeriousComplaintAlert = ({ adminName, societyName, title: complaintTitle, category, priority, location, description, residentName, flatNumber, reviewUrl }) => {
  const safeAdminName = escapeHtml(adminName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(complaintTitle);
  const safeCategory = escapeHtml(category);
  const safePriority = escapeHtml(priority);
  const safeLocation = escapeHtml(location || 'N/A');
  const safeDesc = escapeHtml(description);
  const safeResident = escapeHtml(residentName);
  const safeFlat = escapeHtml(flatNumber);

  const title = `Urgent Complaint Alert: ${safeTitle}`;
  const preheader = `High-priority complaint reported at ${safeSociety}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeAdminName}</strong>,</p>
    <p>A high-priority resident complaint has been logged and requires administrative review at <strong>${safeSociety}</strong>.</p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Title:</td><td style="font-weight: 700; text-align: right;">${safeTitle}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Priority:</td><td style="font-weight: 700; color: #dc2626; text-align: right;">${safePriority}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Category / Location:</td><td style="text-align: right;">${safeCategory} / ${safeLocation}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Reported By:</td><td style="text-align: right;">${safeResident} (Flat ${safeFlat})</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;" colspan="2"><div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fca5a5; font-style: italic;">"${safeDesc}"</div></td></tr>
      </table>
    </div>
    <p>Please review and assign a duty staff member or initiate necessary repairs.</p>
  `;

  const text = `Hello ${adminName},\n\nA High-Priority complaint has been registered in ${societyName}.\nTitle: ${complaintTitle}\nCategory: ${category}\nLocation: ${location || 'N/A'}\nReported by: ${residentName} (Flat ${flatNumber})\nDescription: ${description}\n\nReview: ${reviewUrl}`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'Review Complaint in Admin Portal',
    ctaUrl: reviewUrl,
    societyName
  });

  return { subject: `SocietyHub Alert: High-Priority Complaint - ${complaintTitle}`, text, html };
};

/**
 * D. Admin: Escalated Repair Alert
 */
const adminEscalatedRepairAlert = ({ adminName, societyName, title: repairTitle, category, priority, location, description, reviewUrl }) => {
  const safeAdminName = escapeHtml(adminName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(repairTitle);
  const safeCategory = escapeHtml(category);
  const safePriority = escapeHtml(priority);
  const safeLocation = escapeHtml(location || 'N/A');
  const safeDesc = escapeHtml(description);

  const title = `Escalated Repair Alert: ${safeTitle}`;
  const preheader = `Urgent maintenance repair task created in ${safeSociety}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeAdminName}</strong>,</p>
    <p>An escalated maintenance repair task has been flagged for administrative tracking at <strong>${safeSociety}</strong>.</p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Task:</td><td style="font-weight: 700; text-align: right;">${safeTitle}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Priority:</td><td style="font-weight: 700; color: #b45309; text-align: right;">${safePriority}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Location:</td><td style="text-align: right;">${safeLocation}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;" colspan="2"><div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fcd34d; font-style: italic;">"${safeDesc}"</div></td></tr>
      </table>
    </div>
  `;

  const text = `Hello ${adminName},\n\nAn escalated repair task has been flagged in ${societyName}.\nTask: ${repairTitle}\nPriority: ${priority}\nLocation: ${location || 'N/A'}\nDescription: ${description}\n\nReview: ${reviewUrl}`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'Review Repairs in Admin Portal',
    ctaUrl: reviewUrl,
    societyName
  });

  return { subject: `SocietyHub Alert: Escalated Repair Task - ${repairTitle}`, text, html };
};

// ============================================================================
// 3. SECURITY / STAFF TEMPLATES (Operational Only, Strictly Sanitized)
// ============================================================================

/**
 * A. Staff: Task / Repair Assigned
 */
const staffTaskAssigned = ({ staffName, societyName, title: taskTitle, category, priority, location, deadline, description, taskUrl }) => {
  const safeStaffName = escapeHtml(staffName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(taskTitle);
  const safeCategory = escapeHtml(category || 'General');
  const safePriority = escapeHtml(priority || 'Normal');
  const safeLocation = escapeHtml(location || 'N/A');
  const safeDeadline = deadline ? escapeHtml(new Date(deadline).toLocaleDateString()) : 'Immediate';
  const safeDesc = escapeHtml(description || '');

  const title = `New Task Assigned: ${safeTitle}`;
  const preheader = `You have been assigned to duty task: ${safeTitle}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeStaffName}</strong>,</p>
    <p>You have been assigned to a new operational duty task at <strong>${safeSociety}</strong>.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Task Title:</td><td style="font-weight: 700; text-align: right;">${safeTitle}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Category:</td><td style="text-align: right;">${safeCategory}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Location:</td><td style="font-weight: 600; text-align: right;">${safeLocation}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Priority:</td><td style="font-weight: 700; color: #2563eb; text-align: right;">${safePriority}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Deadline:</td><td style="text-align: right;">${safeDeadline}</td></tr>
        ${safeDesc ? `<tr><td style="color: #64748b; padding: 4px 0;" colspan="2"><div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">${safeDesc}</div></td></tr>` : ''}
      </table>
    </div>
    <p>Please log in to your Staff Portal to review task instructions and update status upon progress or completion.</p>
  `;

  const text = `Hello ${staffName},\n\nYou have been assigned to task: "${taskTitle}" at ${societyName}.\nCategory: ${category || 'General'}\nLocation: ${location || 'N/A'}\nPriority: ${priority || 'Normal'}\nDeadline: ${deadline ? new Date(deadline).toLocaleDateString() : 'Immediate'}\n\nView task: ${taskUrl}\n\nSecurity Operations`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View Assigned Tasks in Staff Portal',
    ctaUrl: taskUrl,
    societyName
  });

  return { subject: `SocietyHub Task Assigned: ${taskTitle}`, text, html };
};

/**
 * B. Staff: Task Updated or Priority Changed
 */
const staffTaskUpdated = ({ staffName, societyName, title: taskTitle, status, priority, notes, taskUrl }) => {
  const safeStaffName = escapeHtml(staffName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(taskTitle);
  const safeStatus = escapeHtml(status || 'Updated');
  const safePriority = escapeHtml(priority || 'Normal');
  const safeNotes = notes ? escapeHtml(notes) : '';

  const title = `Task Updated: ${safeTitle}`;
  const preheader = `Task "${safeTitle}" has been updated.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeStaffName}</strong>,</p>
    <p>An assigned duty task at <strong>${safeSociety}</strong> has been updated by the administration.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Task:</td><td style="font-weight: 700; text-align: right;">${safeTitle}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Status:</td><td style="font-weight: 600; text-align: right;">${safeStatus}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Priority:</td><td style="font-weight: 700; color: #2563eb; text-align: right;">${safePriority}</td></tr>
        ${safeNotes ? `<tr><td style="color: #64748b; padding: 4px 0;">Instructions:</td><td style="text-align: right;">${safeNotes}</td></tr>` : ''}
      </table>
    </div>
  `;

  const text = `Hello ${staffName},\n\nTask "${taskTitle}" has been updated.\nStatus: ${status}\nPriority: ${priority}\n${notes ? `Notes: ${notes}\n` : ''}\nView: ${taskUrl}`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View Task in Staff Portal',
    ctaUrl: taskUrl,
    societyName
  });

  return { subject: `SocietyHub Task Update: ${taskTitle}`, text, html };
};

/**
 * C. Staff: Task Reassigned or Cancelled
 */
const staffTaskReassignedOrCancelled = ({ staffName, societyName, title: taskTitle, action, taskUrl }) => {
  const safeStaffName = escapeHtml(staffName);
  const safeSociety = escapeHtml(societyName);
  const safeTitle = escapeHtml(taskTitle);
  const safeAction = escapeHtml(action || 'Reassigned');

  const title = `Task Notice: ${safeAction}`;
  const preheader = `Task "${safeTitle}" has been ${safeAction.toLowerCase()}.`;

  const bodyContentHtml = `
    <p>Hello <strong>${safeStaffName}</strong>,</p>
    <p>This is to notify you that task "<strong>${safeTitle}</strong>" at <strong>${safeSociety}</strong> has been <strong>${safeAction.toLowerCase()}</strong>.</p>
    <p>You are no longer responsible for this assignment. Please check your Staff Portal for any remaining active duties.</p>
  `;

  const text = `Hello ${staffName},\n\nTask "${taskTitle}" has been ${action.toLowerCase()} at ${societyName}.\nYou are no longer responsible for this assignment.\n\nStaff Portal: ${taskUrl}`;

  const html = renderEmailLayout({
    title,
    preheader,
    bodyContentHtml,
    ctaText: 'View Staff Tasks',
    ctaUrl: taskUrl,
    societyName
  });

  return { subject: `SocietyHub Task Notice: ${taskTitle} (${action})`, text, html };
};

module.exports = {
  escapeHtml,
  residentRegistrationApproved,
  residentRegistrationRejected,
  residentMaintenanceBillCreated,
  residentPaymentConfirmed,
  residentPaymentFailed,
  residentComplaintStatusUpdated,
  adminNewRegistrationRequest,
  adminPaymentReceived,
  adminSeriousComplaintAlert,
  adminEscalatedRepairAlert,
  staffTaskAssigned,
  staffTaskUpdated,
  staffTaskReassignedOrCancelled
};
