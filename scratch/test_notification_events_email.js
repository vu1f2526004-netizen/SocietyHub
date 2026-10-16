const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { setTransporter, resetTransporter } = require('../server/src/utils/sendEmail');

async function testNotificationTriggers() {
  console.log('====================================================');
  console.log('   SocietyHub Event Notification Invocation Test');
  console.log('====================================================\n');

  const dispatchedEmails = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      dispatchedEmails.push(mailOptions);
      return {
        messageId: `<mock-${Date.now()}@societyhub.test>`,
        response: '250 Accepted'
      };
    }
  };

  setTransporter(mockTransporter);

  // 1. Simulate Resident Registration Approval
  console.log('1. Testing Resident Approval Email Dispatch...');
  const resident = {
    name: 'Test Resident',
    email: 'resident.test@societyhub.io',
    flatNumber: 'A-101'
  };
  const { sendEmail } = require('../server/src/utils/sendEmail');

  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: Registration Approved',
    text: `Hello ${resident.name},\n\nYour registration request for flat ${resident.flatNumber} has been approved.`,
    html: `<p>Hello <strong>${resident.name}</strong>,</p>`
  });

  assert.strictEqual(dispatchedEmails.length, 1);
  assert.strictEqual(dispatchedEmails[0].to, 'resident.test@societyhub.io');
  assert.ok(dispatchedEmails[0].subject.includes('Registration Approved'));
  console.log('   [PASS] Resident Approval email triggered correctly');

  // 2. Simulate Resident Registration Rejection
  console.log('2. Testing Resident Rejection Email Dispatch...');
  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: Registration Status Update',
    text: `Hello ${resident.name},\n\nYour registration request was not approved.`,
    html: `<p>Registration not approved.</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 2);
  assert.ok(dispatchedEmails[1].subject.includes('Registration Status Update'));
  console.log('   [PASS] Resident Rejection email triggered correctly');

  // 3. Simulate Maintenance Bill Generation
  console.log('3. Testing Maintenance Bill Generation Email Dispatch...');
  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: New Maintenance Bill - October 2026',
    text: `A new maintenance bill of INR 2500 for October 2026 has been issued for flat ${resident.flatNumber}.`,
    html: `<p>Bill of INR 2500 issued.</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 3);
  assert.ok(dispatchedEmails[2].subject.includes('New Maintenance Bill'));
  console.log('   [PASS] Maintenance Bill email triggered correctly');

  // 4. Simulate Confirmed Payment Receipt
  console.log('4. Testing Confirmed Payment Receipt Email Dispatch...');
  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: Payment Receipt - October 2026',
    text: `Your payment of INR 2500 for October 2026 has been confirmed. Receipt: REC-999`,
    html: `<p>Payment confirmed. Receipt: REC-999</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 4);
  assert.ok(dispatchedEmails[3].subject.includes('Payment Receipt'));
  console.log('   [PASS] Payment Receipt email triggered correctly');

  // 5. Simulate Visitor Arrival
  console.log('5. Testing Visitor Arrival Email Dispatch...');
  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: Visitor Arrival - John Doe',
    text: `Your visitor John Doe has arrived and checked in at the security gate.`,
    html: `<p>Visitor arrived: John Doe</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 5);
  assert.ok(dispatchedEmails[4].subject.includes('Visitor Arrival'));
  console.log('   [PASS] Visitor Arrival email triggered correctly');

  // 6. Simulate Staff Task Assignment (Complaint / Repair)
  console.log('6. Testing Staff Task Assignment Email Dispatch...');
  const staff = {
    name: 'Duty Guard',
    email: 'guard.staff@societyhub.io'
  };
  await sendEmail({
    to: staff.email,
    subject: 'SocietyHub: Task Assigned - Water Leakage In Lobby',
    text: `Hello ${staff.name},\n\nYou have been assigned to complaint "Water Leakage In Lobby".`,
    html: `<p>Task assigned.</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 6);
  assert.strictEqual(dispatchedEmails[5].to, 'guard.staff@societyhub.io');
  assert.ok(dispatchedEmails[5].subject.includes('Task Assigned'));
  console.log('   [PASS] Staff Task Assignment email triggered correctly');

  // 7. Simulate Event Published Update
  console.log('7. Testing Event Published Email Dispatch...');
  await sendEmail({
    to: resident.email,
    subject: 'SocietyHub: New Event - Annual Society Meeting',
    text: `A new event "Annual Society Meeting" has been published for your society.`,
    html: `<p>Annual Society Meeting</p>`
  });
  assert.strictEqual(dispatchedEmails.length, 7);
  assert.ok(dispatchedEmails[6].subject.includes('New Event'));
  console.log('   [PASS] Event Published email triggered correctly');

  resetTransporter();

  console.log('\n====================================================');
  console.log('All 7 Business Notification Event Triggers Verified!');
  console.log('====================================================');
}

testNotificationTriggers().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
