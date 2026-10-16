const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Payment = require('../server/src/models/Payment');
const Complaint = require('../server/src/models/Complaint');
const Repair = require('../server/src/models/Repair');
const Notification = require('../server/src/models/Notification');

const { setTransporter, resetTransporter } = require('../server/src/utils/sendEmail');
const notificationService = require('../server/src/services/notificationService');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  SocietyHub Event-Triggered Email Notification Test');
  console.log('====================================================\n');

  // Connect to DB directly for fixtures using project's connectDB
  await connectDB();

  const dispatchedEmails = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      dispatchedEmails.push(mailOptions);
      return {
        messageId: `<mock-${Date.now()}@test.societyhub.internal>`,
        response: '250 Mock Accepted'
      };
    }
  };

  setTransporter(mockTransporter);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Set up 2 distinct test societies for tenant isolation testing
  const timestamp = Date.now();
  const societyA = await Society.create({
    name: `Test Society Alpha ${timestamp}`,
    address: '100 Alpha St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    joinCode: `SOC-A${timestamp.toString().slice(-4)}`
  });

  const societyB = await Society.create({
    name: `Test Society Beta ${timestamp}`,
    address: '200 Beta St',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    joinCode: `SOC-B${timestamp.toString().slice(-4)}`
  });

  // Society A Admin, Resident, Staff
  const adminA = await User.create({
    name: 'Admin Alpha',
    email: `admin.alpha.${timestamp}@test.io`,
    password: 'password123',
    role: 'Admin',
    societyId: societyA._id,
    status: 'Active'
  });

  const residentA = await User.create({
    name: 'Resident Alpha',
    email: `resident.alpha.${timestamp}@test.io`,
    flatNumber: 'A-101',
    mobile: '9876543210',
    password: 'password123',
    role: 'Resident',
    societyId: societyA._id,
    status: 'PendingApproval'
  });

  const staffA = await User.create({
    name: 'Staff Alpha',
    email: `staff.alpha.${timestamp}@test.io`,
    password: 'password123',
    role: 'SecurityStaff',
    societyId: societyA._id,
    status: 'Active'
  });

  // Society B Admin, Resident, Staff
  const adminB = await User.create({
    name: 'Admin Beta',
    email: `admin.beta.${timestamp}@test.io`,
    password: 'password123',
    role: 'Admin',
    societyId: societyB._id,
    status: 'Active'
  });

  const residentB = await User.create({
    name: 'Resident Beta',
    email: `resident.beta.${timestamp}@test.io`,
    flatNumber: 'B-202',
    mobile: '9876543211',
    password: 'password123',
    role: 'Resident',
    societyId: societyB._id,
    status: 'Active'
  });

  const staffB = await User.create({
    name: 'Staff Beta',
    email: `staff.beta.${timestamp}@test.io`,
    password: 'password123',
    role: 'SecurityStaff',
    societyId: societyB._id,
    status: 'Active'
  });

  try {
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 1: RESIDENT EMAIL NOTIFICATIONS ---');
    // ------------------------------------------------------------------------

    await test('1A. Resident Registration Approval email dispatched with society name & login link', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyResidentRegistrationApproved({
        residentId: residentA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, residentA.email);
      assert.ok(mail.subject.includes('Registration Approved'));
      assert.ok(mail.subject.includes(societyA.name));
      assert.ok(mail.html.includes(residentA.name));
      assert.ok(mail.html.includes(societyA.name));
      assert.ok(mail.html.includes('/login'));

      // In-app notification verification
      const notif = await Notification.findOne({ userId: residentA._id, title: 'Registration Approved' });
      assert.ok(notif, 'In-app notification should exist');
    });

    await test('1B. Resident Registration Rejection email dispatched with clear status message without internal admin notes', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyResidentRegistrationRejected({
        residentId: residentA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, residentA.email);
      assert.ok(mail.subject.includes('Registration Status Update'));
      assert.ok(mail.html.includes('not approved'));
      assert.ok(!mail.html.includes('internal admin note'));
    });

    const billA = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: residentA.flatNumber,
      amount: 4500,
      dueDate: new Date(Date.now() + 86400000 * 15),
      month: 'October 2026',
      status: 'Pending'
    });

    await test('1C. Maintenance Bill Generated email includes bill identifier, period, amount, due date, payment link', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyResidentBillCreated({
        billId: billA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, residentA.email);
      assert.ok(mail.subject.includes('Maintenance Bill'));
      assert.ok(mail.html.includes('October 2026'));
      assert.ok(mail.html.includes('4500'));
      assert.ok(mail.html.includes(billA._id.toString()));
      assert.ok(mail.html.includes('/resident/bills'));
    });

    const paymentA = await Payment.create({
      societyId: societyA._id,
      billId: billA._id,
      residentId: residentA._id,
      amount: 4500,
      razorpayOrderId: `order_${Date.now()}`,
      razorpayPaymentId: `pay_${Date.now()}`,
      razorpaySignature: 'sig_mock',
      receiptNumber: `REC-${Date.now()}`,
      status: 'Success',
      paidAt: Date.now()
    });

    await test('1D. Confirmed Payment Receipt email sent to resident with amount, receipt, bill reference and payment date', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyPaymentConfirmed({
        paymentId: paymentA._id,
        societyId: societyA._id
      });

      // Resident + Admin = 2 emails
      const residentMail = dispatchedEmails.find(m => m.to === residentA.email);
      assert.ok(residentMail, 'Resident should receive payment receipt');
      assert.ok(residentMail.subject.includes('Payment Receipt'));
      assert.ok(residentMail.html.includes(paymentA.receiptNumber));
      assert.ok(residentMail.html.includes('4500'));
      assert.ok(residentMail.html.includes('October 2026'));
      assert.ok(residentMail.html.includes('/resident/payments'));
    });

    const complaintA = await Complaint.create({
      societyId: societyA._id,
      title: 'Water Seepage In Ceiling',
      category: 'Plumbing',
      description: 'Severe water seepage near master bedroom ceiling',
      location: 'Flat A-101',
      priority: 'High',
      createdBy: residentA._id,
      status: 'Pending'
    });

    await test('1E. Complaint Status Update email notifies owner without leaking other residents info', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyComplaintStatusUpdated({
        complaintId: complaintA._id,
        societyId: societyA._id,
        newStatus: 'In Progress',
        adminNotes: 'Plumber arriving today at 3 PM'
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, residentA.email);
      assert.ok(mail.subject.includes('Complaint Status Updated'));
      assert.ok(mail.html.includes('In Progress'));
      assert.ok(mail.html.includes('Water Seepage In Ceiling'));
      assert.ok(!mail.html.includes(residentB.name));
      assert.ok(!mail.html.includes(residentB.email));
    });

    const failedPayment = await Payment.create({
      societyId: societyA._id,
      billId: billA._id,
      residentId: residentA._id,
      amount: 4500,
      razorpayOrderId: `order_fail_${Date.now()}`,
      status: 'Failed'
    });

    await test('1F. Payment Failure Notification notifies resident; never marks bill as Paid', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyPaymentFailed({
        paymentId: failedPayment._id,
        residentId: residentA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, residentA.email);
      assert.ok(mail.subject.includes('Payment Failure Notification'));
      assert.ok(mail.html.includes('could not be confirmed'));
      assert.ok(mail.html.includes('/resident/bills'));

      // Check bill status remains un-paid
      const currentBill = await MaintenanceBill.findById(billA._id);
      assert.notStrictEqual(currentBill.status, 'Paid', 'Bill must NEVER be marked Paid on failure notification');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: ADMIN / SECRETARY EMAIL NOTIFICATIONS ---');
    // ------------------------------------------------------------------------

    await test('2A. New Resident registration request alerts Admin of the SAME society only without exposing passwords', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyAdminNewResidentRegistration({
        residentUser: residentA,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, adminA.email);
      assert.ok(mail.subject.includes('New Resident Registration'));
      assert.ok(mail.html.includes(residentA.name));
      assert.ok(mail.html.includes(residentA.flatNumber));
      assert.ok(mail.html.includes('/admin/registration-requests'));
      assert.ok(!mail.html.includes('password'));
      assert.ok(!mail.html.includes('password123'));

      // Ensure Admin B received nothing
      assert.ok(!dispatchedEmails.some(m => m.to === adminB.email), 'Admin of other society must NOT be emailed');
    });

    await test('2B. Maintenance payment confirmation alerts Admin with payment amount, bill reference & resident flat', async () => {
      // Create fresh payment to trigger both
      const payment2 = await Payment.create({
        societyId: societyA._id,
        billId: billA._id,
        residentId: residentA._id,
        amount: 4500,
        razorpayOrderId: `order_adm_${Date.now()}`,
        status: 'Success',
        receiptNumber: `REC-ADM-${Date.now()}`,
        paidAt: Date.now()
      });

      dispatchedEmails.length = 0;
      await notificationService.notifyPaymentConfirmed({
        paymentId: payment2._id,
        societyId: societyA._id
      });

      const adminMail = dispatchedEmails.find(m => m.to === adminA.email);
      assert.ok(adminMail, 'Admin A must receive payment alert');
      assert.ok(adminMail.subject.includes('Payment Received'));
      assert.ok(adminMail.html.includes('4500'));
      assert.ok(adminMail.html.includes(residentA.flatNumber));
      assert.ok(adminMail.html.includes('/admin/payments'));

      // Ensure Admin B received nothing
      assert.ok(!dispatchedEmails.some(m => m.to === adminB.email), 'Admin B must NOT receive Society A payment alert');
    });

    await test('2C. Serious / High Priority complaint alerts Admin with report details and review link', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyAdminSeriousComplaint({
        complaintId: complaintA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, adminA.email);
      assert.ok(mail.subject.includes('High-Priority Complaint'));
      assert.ok(mail.html.includes(complaintA.title));
      assert.ok(mail.html.includes('/admin/complaints'));
    });

    const repairA = await Repair.create({
      societyId: societyA._id,
      title: 'Main Elevator Cable Overhaul',
      category: 'Electrical',
      description: 'Main lift sensor malfunction',
      location: 'Block A Lift 1',
      priority: 'High',
      assignedTo: staffA._id,
      status: 'Assigned'
    });

    await test('2D. Escalated / High Priority repair alerts Admin with task details', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyAdminEscalatedRepair({
        repairId: repairA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, adminA.email);
      assert.ok(mail.subject.includes('Escalated Repair Task'));
      assert.ok(mail.html.includes(repairA.title));
      assert.ok(mail.html.includes('/admin/repairs'));
    });

    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: SECURITY / STAFF EMAIL NOTIFICATIONS ---');
    // ------------------------------------------------------------------------

    await test('3A. Task / Repair assignment email notifies assigned Staff with title, location & task link', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyStaffTaskAssigned({
        taskType: 'Repair',
        taskId: repairA._id,
        staffUserId: staffA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, staffA.email);
      assert.ok(mail.subject.includes('Task Assigned'));
      assert.ok(mail.html.includes(repairA.title));
      assert.ok(mail.html.includes(repairA.location));
      assert.ok(mail.html.includes('/staff/tasks'));
    });

    await test('3B. Staff task updated email notifies assigned staff member', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyStaffTaskUpdated({
        taskId: repairA._id,
        staffUserId: staffA._id,
        societyId: societyA._id,
        status: 'In Progress',
        priority: 'High',
        notes: 'Vendor arrives at 11 AM'
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.strictEqual(mail.to, staffA.email);
      assert.ok(mail.subject.includes('Task Update'));
      assert.ok(mail.html.includes('Vendor arrives at 11 AM'));
    });

    await test('3C. Staff emails never include restricted finance, resident account or other society data', async () => {
      dispatchedEmails.length = 0;
      await notificationService.notifyStaffTaskAssigned({
        taskType: 'Complaint',
        taskId: complaintA._id,
        staffUserId: staffA._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 1);
      const mail = dispatchedEmails[0];
      assert.ok(!mail.html.includes('₹'), 'Staff email must not contain finance data');
      assert.ok(!mail.html.includes('MaintenanceBill'), 'Staff email must not contain maintenance bill references');
      assert.ok(!mail.html.includes(societyB.name), 'Staff email must not contain Society B references');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: SECURITY & TENANT ISOLATION ---');
    // ------------------------------------------------------------------------

    await test('4A. Society A events NEVER dispatch emails to Society B users', async () => {
      dispatchedEmails.length = 0;

      // Try notifying Society B resident with Society A ID
      await notificationService.notifyResidentRegistrationApproved({
        residentId: residentB._id,
        societyId: societyA._id
      });

      assert.strictEqual(dispatchedEmails.length, 0, 'Cross-society notification must be strictly rejected');
    });

    await test('4B. Durable payment deduplication: repeat calls NEVER send duplicate receipts', async () => {
      const dedupPayment = await Payment.create({
        societyId: societyA._id,
        billId: billA._id,
        residentId: residentA._id,
        amount: 2500,
        razorpayOrderId: `order_dedup_${Date.now()}`,
        status: 'Success',
        receiptNumber: `REC-DEDUP-${Date.now()}`,
        paidAt: Date.now()
      });

      dispatchedEmails.length = 0;
      // First invocation
      await notificationService.notifyPaymentConfirmed({
        paymentId: dedupPayment._id,
        societyId: societyA._id
      });
      assert.strictEqual(dispatchedEmails.length, 2, 'First call dispatches resident + admin email');

      // Second invocation (e.g. webhook retry)
      dispatchedEmails.length = 0;
      await notificationService.notifyPaymentConfirmed({
        paymentId: dedupPayment._id,
        societyId: societyA._id
      });
      assert.strictEqual(dispatchedEmails.length, 0, 'Duplicate call MUST NOT dispatch any email');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: RELIABILITY & RESILIENCE ---');
    // ------------------------------------------------------------------------

    await test('5A. Failing SMTP transport is caught safely without throwing unhandled exceptions', async () => {
      const failingTransporter = {
        sendMail: async () => {
          throw new Error('ECONNREFUSED mail.relay:587');
        }
      };
      setTransporter(failingTransporter);

      // Should complete safely without throwing
      await notificationService.notifyResidentRegistrationApproved({
        residentId: residentA._id,
        societyId: societyA._id
      });

      // Restore mock
      setTransporter(mockTransporter);
    });

    await test('5B. In-app notifications persist and continue functioning during email service execution', async () => {
      const inAppCountBefore = await Notification.countDocuments({ userId: residentA._id });
      await notificationService.notifyResidentRegistrationApproved({
        residentId: residentA._id,
        societyId: societyA._id
      });
      const inAppCountAfter = await Notification.countDocuments({ userId: residentA._id });
      assert.ok(inAppCountAfter > inAppCountBefore, 'In-app notification count must increase');
    });

  } finally {
    // Cleanup test fixtures
    await Society.deleteMany({ _id: { $in: [societyA._id, societyB._id] } });
    await User.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await MaintenanceBill.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Payment.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Complaint.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Repair.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Notification.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    resetTransporter();
    await mongoose.connection.close();
  }

  console.log('\n====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
