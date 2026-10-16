/**
 * SocietyHub Business Notification Service
 * Orchestrates event-triggered transactional emails and in-app notifications
 * with strict multi-society tenant isolation, durable deduplication, and error resilience.
 */

const User = require('../models/User');
const Society = require('../models/Society');
const Notification = require('../models/Notification');
const MaintenanceBill = require('../models/MaintenanceBill');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const Repair = require('../models/Repair');
const sendEmail = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

const getClientBaseUrl = () => {
  return process.env.CLIENT_URL || 'http://localhost:5173';
};

/**
 * Helper to safely create an in-app notification without throwing
 */
const safeCreateInAppNotification = async ({ userId, societyId, title, message, type = 'Info', link = '' }) => {
  try {
    if (!userId || !societyId) return null;
    return await Notification.create({
      userId,
      societyId,
      title,
      message,
      type,
      link
    });
  } catch (err) {
    console.warn(`[NOTIFICATION] Could not create in-app notification: ${err.message}`);
    return null;
  }
};

/**
 * 1A. Resident Registration Approved
 */
const notifyResidentRegistrationApproved = async ({ residentId, societyId }) => {
  try {
    const resident = await User.findOne({ _id: residentId, societyId });
    if (!resident || !resident.email) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const loginUrl = `${clientUrl}/login`;

    // In-app notification
    await safeCreateInAppNotification({
      userId: resident._id,
      societyId,
      title: 'Registration Approved',
      message: `Your registration request for ${societyName} (Flat ${resident.flatNumber || 'N/A'}) has been approved. You can now access resident services.`,
      type: 'Success',
      link: '/resident'
    });

    // Transactional email
    const emailData = templates.residentRegistrationApproved({
      residentName: resident.name,
      societyName,
      flatNumber: resident.flatNumber || 'N/A',
      loginUrl
    });

    await sendEmail({
      to: resident.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyResidentRegistrationApproved: ${err.message}`);
  }
};

/**
 * 1B. Resident Registration Rejected
 */
const notifyResidentRegistrationRejected = async ({ residentId, societyId }) => {
  try {
    const resident = await User.findOne({ _id: residentId, societyId });
    if (!resident || !resident.email) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';

    // In-app notification
    await safeCreateInAppNotification({
      userId: resident._id,
      societyId,
      title: 'Registration Rejected',
      message: `Your registration request for ${societyName} was not approved.`,
      type: 'Warning'
    });

    // Transactional email
    const emailData = templates.residentRegistrationRejected({
      residentName: resident.name,
      societyName,
      flatNumber: resident.flatNumber || 'N/A'
    });

    await sendEmail({
      to: resident.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyResidentRegistrationRejected: ${err.message}`);
  }
};

/**
 * 2A. Admin: New Resident Registration Request Submitted
 */
const notifyAdminNewResidentRegistration = async ({ residentUser, societyId }) => {
  try {
    if (!residentUser || !societyId) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const reviewUrl = `${clientUrl}/admin/registration-requests`;

    // Fetch all active Admins belonging strictly to the SAME society
    const admins = await User.find({ societyId, role: 'Admin', status: 'Active' });
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
      // In-app notification
      await safeCreateInAppNotification({
        userId: admin._id,
        societyId,
        title: 'New Registration Request',
        message: `New resident registration request submitted for Flat ${residentUser.flatNumber} by ${residentUser.name}.`,
        type: 'Info',
        link: '/admin/registration-requests'
      });

      // Email notification
      if (admin.email) {
        const emailData = templates.adminNewRegistrationRequest({
          adminName: admin.name,
          societyName,
          residentName: residentUser.name,
          flatNumber: residentUser.flatNumber || 'N/A',
          email: residentUser.email,
          mobile: residentUser.mobile || residentUser.phone || 'N/A',
          reviewUrl
        });

        await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html
        });
      }
    }
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyAdminNewResidentRegistration: ${err.message}`);
  }
};

/**
 * 1C. Resident: Maintenance Bill Generated
 */
const notifyResidentBillCreated = async ({ billId, societyId }) => {
  try {
    const bill = await MaintenanceBill.findOne({ _id: billId, societyId });
    if (!bill) return;

    const resident = await User.findOne({ _id: bill.residentId, societyId });
    if (!resident || !resident.email) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const paymentUrl = `${clientUrl}/resident/bills`;

    // In-app notification
    await safeCreateInAppNotification({
      userId: resident._id,
      societyId,
      title: 'Maintenance Bill Generated',
      message: `A new maintenance bill of ₹${bill.amount} for ${bill.month} has been issued for your flat.`,
      type: 'Info',
      link: '/resident/bills'
    });

    // Transactional email
    const emailData = templates.residentMaintenanceBillCreated({
      residentName: resident.name,
      societyName,
      flatNumber: bill.flatNumber || resident.flatNumber || 'N/A',
      billId: bill._id.toString(),
      month: bill.month,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paymentUrl
    });

    await sendEmail({
      to: resident.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyResidentBillCreated: ${err.message}`);
  }
};

/**
 * 1D & 2B. Payment Confirmation (Resident Receipt + Admin Ledger Alert)
 * Durable deduplication ensures webhook retries or repeat calls never send duplicate receipts.
 */
const notifyPaymentConfirmed = async ({ paymentId, societyId }) => {
  try {
    // Durable atomic deduplication: only proceeds if emailReceiptSent was not already true
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, societyId, status: 'Success', emailReceiptSent: { $ne: true } },
      { $set: { emailReceiptSent: true } },
      { new: true }
    );

    if (!payment) {
      // Already sent or payment not found/not successful
      return;
    }

    const resident = await User.findOne({ _id: payment.residentId, societyId });
    const bill = await MaintenanceBill.findOne({ _id: payment.billId, societyId });
    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();

    // 1D. Send Resident Receipt
    if (resident && resident.email) {
      await safeCreateInAppNotification({
        userId: resident._id,
        societyId,
        title: 'Payment Successful',
        message: `Payment of ₹${payment.amount} for ${bill ? bill.month : 'Maintenance'} successful (Receipt: ${payment.receiptNumber || 'N/A'}).`,
        type: 'Success',
        link: '/resident/payments'
      });

      const residentEmailData = templates.residentPaymentConfirmed({
        residentName: resident.name,
        societyName,
        flatNumber: bill ? bill.flatNumber : (resident.flatNumber || 'N/A'),
        amount: payment.amount,
        receiptNumber: payment.receiptNumber || `REC-${payment._id}`,
        paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
        month: bill ? bill.month : 'Maintenance',
        paymentDate: payment.paidAt || Date.now(),
        portalUrl: `${clientUrl}/resident/payments`
      });

      await sendEmail({
        to: resident.email,
        subject: residentEmailData.subject,
        text: residentEmailData.text,
        html: residentEmailData.html
      });
    }

    // 2B. Send Admin Society Financial Tracking Alert (same society only)
    const admins = await User.find({ societyId, role: 'Admin', status: 'Active' });
    if (admins && admins.length > 0) {
      const ledgerUrl = `${clientUrl}/admin/payments`;
      for (const admin of admins) {
        if (admin.email) {
          const adminEmailData = templates.adminPaymentReceived({
            adminName: admin.name,
            societyName,
            residentName: resident ? resident.name : 'Resident',
            flatNumber: bill ? bill.flatNumber : (resident ? resident.flatNumber : 'N/A'),
            amount: payment.amount,
            month: bill ? bill.month : 'Maintenance',
            receiptNumber: payment.receiptNumber || `REC-${payment._id}`,
            paymentDate: payment.paidAt || Date.now(),
            ledgerUrl
          });

          await sendEmail({
            to: admin.email,
            subject: adminEmailData.subject,
            text: adminEmailData.text,
            html: adminEmailData.html
          });
        }
      }
    }
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyPaymentConfirmed: ${err.message}`);
  }
};

/**
 * 1F. Resident: Payment Failure Notification
 */
const notifyPaymentFailed = async ({ paymentId, residentId, societyId }) => {
  try {
    const payment = await Payment.findOne({ _id: paymentId, societyId });
    const resident = await User.findOne({ _id: residentId, societyId });
    if (!resident || !resident.email) return;

    const bill = payment ? await MaintenanceBill.findOne({ _id: payment.billId, societyId }) : null;
    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const retryUrl = `${clientUrl}/resident/bills`;

    // In-app notification
    await safeCreateInAppNotification({
      userId: resident._id,
      societyId,
      title: 'Payment Failed',
      message: `Your payment attempt for ${bill ? bill.month : 'maintenance dues'} could not be confirmed. Your bill remains pending.`,
      type: 'Warning',
      link: '/resident/bills'
    });

    // Transactional email
    const emailData = templates.residentPaymentFailed({
      residentName: resident.name,
      societyName,
      flatNumber: bill ? bill.flatNumber : (resident.flatNumber || 'N/A'),
      amount: payment ? payment.amount : (bill ? bill.amount : 0),
      month: bill ? bill.month : 'Maintenance',
      orderId: payment ? payment.razorpayOrderId : 'N/A',
      retryUrl
    });

    await sendEmail({
      to: resident.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyPaymentFailed: ${err.message}`);
  }
};

/**
 * 1E. Resident: Complaint Status Update
 */
const notifyComplaintStatusUpdated = async ({ complaintId, societyId, newStatus, adminNotes }) => {
  try {
    const complaint = await Complaint.findOne({ _id: complaintId, societyId });
    if (!complaint) return;

    const creator = await User.findOne({ _id: complaint.createdBy, societyId });
    if (!creator || !creator.email) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const portalUrl = `${clientUrl}/resident/complaints`;

    // In-app notification
    await safeCreateInAppNotification({
      userId: creator._id,
      societyId,
      title: 'Complaint Updated',
      message: `Your complaint "${complaint.title}" status changed to ${newStatus}.`,
      type: 'Info',
      link: '/resident/complaints'
    });

    // Transactional email
    const emailData = templates.residentComplaintStatusUpdated({
      residentName: creator.name,
      societyName,
      title: complaint.title,
      status: newStatus,
      adminNotes,
      portalUrl
    });

    await sendEmail({
      to: creator.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyComplaintStatusUpdated: ${err.message}`);
  }
};

/**
 * 2C. Admin: Serious Complaint / Incident Alert (High Priority)
 */
const notifyAdminSeriousComplaint = async ({ complaintId, societyId }) => {
  try {
    const complaint = await Complaint.findOne({ _id: complaintId, societyId });
    if (!complaint || complaint.priority !== 'High') return;

    const creator = await User.findOne({ _id: complaint.createdBy, societyId });
    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const reviewUrl = `${clientUrl}/admin/complaints`;

    const admins = await User.find({ societyId, role: 'Admin', status: 'Active' });
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
      if (admin.email) {
        const emailData = templates.adminSeriousComplaintAlert({
          adminName: admin.name,
          societyName,
          title: complaint.title,
          category: complaint.category,
          priority: complaint.priority,
          location: complaint.location,
          description: complaint.description,
          residentName: creator ? creator.name : 'Resident',
          flatNumber: creator ? creator.flatNumber : 'N/A',
          reviewUrl
        });

        await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html
        });
      }
    }
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyAdminSeriousComplaint: ${err.message}`);
  }
};

/**
 * 2D. Admin: Escalated Repair Alert (High Priority)
 */
const notifyAdminEscalatedRepair = async ({ repairId, societyId }) => {
  try {
    const repair = await Repair.findOne({ _id: repairId, societyId });
    if (!repair || repair.priority !== 'High') return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const reviewUrl = `${clientUrl}/admin/repairs`;

    const admins = await User.find({ societyId, role: 'Admin', status: 'Active' });
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
      if (admin.email) {
        const emailData = templates.adminEscalatedRepairAlert({
          adminName: admin.name,
          societyName,
          title: repair.title,
          category: repair.category,
          priority: repair.priority,
          location: repair.location,
          description: repair.description,
          reviewUrl
        });

        await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html
        });
      }
    }
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyAdminEscalatedRepair: ${err.message}`);
  }
};

/**
 * 3A. Staff: Task / Repair Assigned
 */
const notifyStaffTaskAssigned = async ({ taskType, taskId, staffUserId, societyId }) => {
  try {
    const staff = await User.findOne({ _id: staffUserId, societyId, role: 'SecurityStaff' });
    if (!staff || !staff.email) return;

    let item = null;
    if (taskType === 'Repair') {
      item = await Repair.findOne({ _id: taskId, societyId });
    } else {
      item = await Complaint.findOne({ _id: taskId, societyId });
    }
    if (!item) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const taskUrl = `${clientUrl}/staff/tasks`;

    // In-app notification
    await safeCreateInAppNotification({
      userId: staff._id,
      societyId,
      title: 'Task Assigned',
      message: `You have been assigned to task: "${item.title}" (${item.priority || 'Normal'} priority).`,
      type: 'Info',
      link: '/staff/tasks'
    });

    // Transactional email (strictly operational details only - no finance or private resident info)
    const emailData = templates.staffTaskAssigned({
      staffName: staff.name,
      societyName,
      title: item.title,
      category: item.category || 'General',
      priority: item.priority || 'Normal',
      location: item.location || 'N/A',
      deadline: item.deadline,
      description: item.description,
      taskUrl
    });

    await sendEmail({
      to: staff.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyStaffTaskAssigned: ${err.message}`);
  }
};

/**
 * 3B. Staff: Task Updated or Priority Changed
 */
const notifyStaffTaskUpdated = async ({ taskId, staffUserId, societyId, status, priority, notes }) => {
  try {
    const staff = await User.findOne({ _id: staffUserId, societyId, role: 'SecurityStaff' });
    if (!staff || !staff.email) return;

    let item = await Repair.findOne({ _id: taskId, societyId });
    if (!item) {
      item = await Complaint.findOne({ _id: taskId, societyId });
    }
    if (!item) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const taskUrl = `${clientUrl}/staff/tasks`;

    const emailData = templates.staffTaskUpdated({
      staffName: staff.name,
      societyName,
      title: item.title,
      status: status || item.status,
      priority: priority || item.priority,
      notes,
      taskUrl
    });

    await sendEmail({
      to: staff.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyStaffTaskUpdated: ${err.message}`);
  }
};

/**
 * 3D. Staff: Task Reassigned or Cancelled
 */
const notifyStaffTaskReassigned = async ({ previousStaffUserId, societyId, taskTitle, action = 'Reassigned' }) => {
  try {
    const staff = await User.findOne({ _id: previousStaffUserId, societyId, role: 'SecurityStaff' });
    if (!staff || !staff.email) return;

    const society = await Society.findById(societyId);
    const societyName = society ? society.name : 'Your Society';
    const clientUrl = getClientBaseUrl();
    const taskUrl = `${clientUrl}/staff/tasks`;

    await safeCreateInAppNotification({
      userId: staff._id,
      societyId,
      title: `Task ${action}`,
      message: `Task "${taskTitle}" has been ${action.toLowerCase()}.`,
      type: 'Info',
      link: '/staff/tasks'
    });

    const emailData = templates.staffTaskReassignedOrCancelled({
      staffName: staff.name,
      societyName,
      title: taskTitle,
      action,
      taskUrl
    });

    await sendEmail({
      to: staff.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    });
  } catch (err) {
    console.error(`[NOTIFICATION ERROR] notifyStaffTaskReassigned: ${err.message}`);
  }
};

module.exports = {
  safeCreateInAppNotification,
  notifyResidentRegistrationApproved,
  notifyResidentRegistrationRejected,
  notifyAdminNewResidentRegistration,
  notifyResidentBillCreated,
  notifyPaymentConfirmed,
  notifyPaymentFailed,
  notifyComplaintStatusUpdated,
  notifyAdminSeriousComplaint,
  notifyAdminEscalatedRepair,
  notifyStaffTaskAssigned,
  notifyStaffTaskUpdated,
  notifyStaffTaskReassigned
};
