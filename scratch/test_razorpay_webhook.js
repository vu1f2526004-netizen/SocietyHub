/**
 * SocietyHub Automated Razorpay Webhook Verification Test Suite
 *
 * Verifies:
 * 1. Missing signature rejection (400)
 * 2. Invalid signature rejection (400)
 * 3. Malformed payload rejection (400)
 * 4. Unknown event graceful handling (200 Ignored)
 * 5. Successful order.paid processing (200 Success + Bill Paid + Finance + Email Receipt)
 * 6. Duplicate event delivery idempotency (No duplicate records or emails)
 * 7. Amount mismatch rejection (400)
 * 8. Cross-society payment attempt rejection (400)
 * 9. Already-paid bill protection (400)
 * 10. payment.failed processing (200 + Bill Failed, Never Paid + Notification)
 * 11. Protection: failed event cannot override confirmed payment
 * 12. Reliability: SMTP failure does not undo confirmed payment
 * 13. Regression: Existing Checkout signature verification remains functional
 */

const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Payment = require('../server/src/models/Payment');
const Finance = require('../server/src/models/Finance');
const WebhookEvent = require('../server/src/models/WebhookEvent');
const Notification = require('../server/src/models/Notification');
const { setTransporter, resetTransporter } = require('../server/src/utils/sendEmail');
const express = require('express');
const paymentRoutes = require('../server/src/routes/paymentRoutes');
const errorHandler = require('../server/src/middleware/error');

const testApp = express();
testApp.use('/api/payments/webhook', express.raw({ type: '*/*' }));
testApp.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
testApp.use('/api/payments', paymentRoutes);
testApp.use(errorHandler);

let testServer = null;
let API_BASE = '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_development_local';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
  }
}

// Mock Email Transporter
const sentMockEmails = [];
const mockTransporter = {
  sendMail: async (options) => {
    if (mockTransporter.shouldFail) {
      throw new Error('Simulated SMTP connection timeout');
    }
    sentMockEmails.push({
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      time: Date.now()
    });
    return {
      messageId: `<mock-${Date.now()}-${Math.random().toString(36).substring(7)}@societyhub.test>`,
      response: '250 Mock email accepted'
    };
  },
  shouldFail: false
};

const computeSignature = (body, secret = WEBHOOK_SECRET) => {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
};

async function runTests() {
  console.log('========================================================');
  console.log('SOCIETYHUB RAZORPAY WEBHOOK INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  // Connect to DB using server config
  await connectDB();
  console.log('Connected to MongoDB.\n');

  // Start in-process test HTTP server
  testServer = await new Promise(resolve => {
    const s = testApp.listen(0, () => resolve(s));
  });
  const testPort = testServer.address().port;
  API_BASE = `http://localhost:${testPort}/api`;
  console.log(`Test Express server listening on ${API_BASE}`);

  // Set mock email transporter (in-process)
  setTransporter(mockTransporter);

  // Setup test fixtures
  const timestamp = Date.now();
  console.log('Setting up isolated test fixtures...');

  // Society A
  const societyA = await Society.create({
    name: `Webhook Test Society A ${timestamp}`,
    address: '100 Webhook Lane',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    joinCode: `WH-${timestamp}-A`
  });

  // Society B
  const societyB = await Society.create({
    name: `Webhook Test Society B ${timestamp}`,
    address: '200 Isolation Road',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    joinCode: `WH-${timestamp}-B`
  });

  // Admin A
  const adminA = await User.create({
    name: `Admin A ${timestamp}`,
    email: `adminA_${timestamp}@testwh.com`,
    password: 'Password123!',
    role: 'Admin',
    status: 'Active',
    societyId: societyA._id
  });

  // Resident A in Society A
  const residentA = await User.create({
    name: `Resident A ${timestamp}`,
    email: `residentA_${timestamp}@testwh.com`,
    password: 'Password123!',
    role: 'Resident',
    status: 'Active',
    flatNumber: 'A-101',
    societyId: societyA._id
  });

  // Resident B in Society B
  const residentB = await User.create({
    name: `Resident B ${timestamp}`,
    email: `residentB_${timestamp}@testwh.com`,
    password: 'Password123!',
    role: 'Resident',
    status: 'Active',
    flatNumber: 'B-202',
    societyId: societyB._id
  });

  // Resident A JWT Token for Checkout Verify Test
  const residentAToken = jwt.sign(
    { id: residentA._id, role: 'Resident', societyId: societyA._id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  console.log('Test fixtures created successfully.\n');

  try {
    // ---------------------------------------------------------
    // TEST 1: Missing signature rejection
    // ---------------------------------------------------------
    console.log('--- Test 1: Missing x-razorpay-signature header ---');
    const res1 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'order.paid' })
    });
    assert(res1.status === 400, 'Rejects request missing signature header with 400');
    const data1 = await res1.json();
    assert(data1.message && data1.message.includes('x-razorpay-signature'), 'Returns descriptive error message for missing signature');

    // ---------------------------------------------------------
    // TEST 2: Invalid signature rejection
    // ---------------------------------------------------------
    console.log('\n--- Test 2: Invalid signature rejection ---');
    const body2 = JSON.stringify({ event: 'order.paid' });
    const res2 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000'
      },
      body: body2
    });
    assert(res2.status === 400, 'Rejects request with forged/invalid signature with 400');
    const data2 = await res2.json();
    assert(data2.message && data2.message.includes('Invalid webhook signature'), 'Returns descriptive error message for invalid signature');

    // ---------------------------------------------------------
    // TEST 3: Malformed payload rejection
    // ---------------------------------------------------------
    console.log('\n--- Test 3: Malformed JSON payload rejection ---');
    const malformedBody = '{"event": "order.paid", unclosed_json: ';
    const malformedSig = computeSignature(malformedBody);
    const res3 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': malformedSig
      },
      body: malformedBody
    });
    assert(res3.status === 400, 'Rejects malformed JSON with 400 Bad Request');
    const data3 = await res3.json();
    assert(data3.message && data3.message.includes('Malformed webhook payload'), 'Returns descriptive error for malformed payload');

    // ---------------------------------------------------------
    // TEST 4: Unknown / Unhandled event handling
    // ---------------------------------------------------------
    console.log('\n--- Test 4: Unknown event graceful handling ---');
    const unknownPayload = JSON.stringify({
      id: `evt_unknown_${timestamp}`,
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_123' } } }
    });
    const unknownSig = computeSignature(unknownPayload);
    const res4 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': unknownSig
      },
      body: unknownPayload
    });
    assert(res4.status === 200, 'Gracefully responds with 200 for unhandled events');
    const data4 = await res4.json();
    assert(data4.message && data4.message.includes('unhandled event type'), 'Acknowledges unhandled event without error');
    const unhandledEvtDoc = await WebhookEvent.findOne({ eventId: `evt_unknown_${timestamp}` });
    assert(unhandledEvtDoc && unhandledEvtDoc.status === 'Ignored', 'Records unhandled event as Ignored in WebhookEvent collection');

    // ---------------------------------------------------------
    // TEST 5: Successful order.paid processing
    // ---------------------------------------------------------
    console.log('\n--- Test 5: Successful order.paid processing ---');
    sentMockEmails.length = 0;

    const bill1 = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-101',
      amount: 2500,
      month: 'October 2026',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    const payment1 = await Payment.create({
      societyId: societyA._id,
      billId: bill1._id,
      residentId: residentA._id,
      amount: 2500,
      razorpayOrderId: `order_hook_${timestamp}_01`,
      status: 'Pending'
    });

    const orderPaidEventId = `evt_paid_${timestamp}_01`;
    const orderPaidPayload = JSON.stringify({
      id: orderPaidEventId,
      entity: 'event',
      event: 'order.paid',
      contains: ['order', 'payment'],
      payload: {
        order: {
          entity: {
            id: payment1.razorpayOrderId,
            amount: 250000,
            amount_paid: 250000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_hook_${timestamp}_01`,
            order_id: payment1.razorpayOrderId,
            amount: 250000,
            currency: 'INR',
            status: 'captured',
            created_at: Math.floor(Date.now() / 1000)
          }
        }
      }
    });
    const orderPaidSig = computeSignature(orderPaidPayload);

    const res5 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': orderPaidSig,
        'x-razorpay-event-id': orderPaidEventId
      },
      body: orderPaidPayload
    });

    assert(res5.status === 200, 'Responds with 200 for valid order.paid event');
    const data5 = await res5.json();
    assert(data5.success === true, 'Returns success: true');

    // Verify DB updates
    const updatedPayment1 = await Payment.findById(payment1._id);
    assert(updatedPayment1.status === 'Success', 'Payment status updated to Success');
    assert(updatedPayment1.razorpayPaymentId === `pay_hook_${timestamp}_01`, 'Payment records razorpayPaymentId');
    assert(updatedPayment1.receiptNumber && updatedPayment1.receiptNumber.startsWith('REC-'), 'Receipt number generated');
    assert(updatedPayment1.emailReceiptSent === true, 'emailReceiptSent marked true');
    assert(updatedPayment1.webhookProcessedAt !== null, 'webhookProcessedAt recorded');

    const updatedBill1 = await MaintenanceBill.findById(bill1._id);
    assert(updatedBill1.status === 'Paid', 'Maintenance bill status marked Paid');

    const finance1 = await Finance.findOne({ referenceId: payment1._id, societyId: societyA._id });
    assert(finance1 && finance1.amount === 2500, 'Finance income entry created for Society A');

    const webhookEvent1 = await WebhookEvent.findOne({ eventId: orderPaidEventId });
    assert(webhookEvent1 && webhookEvent1.status === 'Processed', 'WebhookEvent recorded as Processed');

    // Verify email notifications
    assert(sentMockEmails.length === 2, 'Sent exactly 2 emails (1 Resident Receipt + 1 Admin Ledger alert)', `Sent: ${sentMockEmails.length}`);
    const residentReceipt = sentMockEmails.find(e => e.to.toLowerCase() === residentA.email.toLowerCase() && e.subject.includes('Payment Receipt'));
    assert(!!residentReceipt, 'Resident received payment receipt email');
    const adminAlert = sentMockEmails.find(e => e.to.toLowerCase() === adminA.email.toLowerCase() && e.subject.includes('Payment Received'));
    assert(!!adminAlert, 'Admin received financial ledger notification');

    // ---------------------------------------------------------
    // TEST 6: Duplicate event delivery (idempotency)
    // ---------------------------------------------------------
    console.log('\n--- Test 6: Duplicate webhook delivery (idempotency) ---');
    const initialEmailCount = sentMockEmails.length;
    const initialFinanceCount = await Finance.countDocuments({ referenceId: payment1._id });

    const res6 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': orderPaidSig,
        'x-razorpay-event-id': orderPaidEventId
      },
      body: orderPaidPayload
    });

    assert(res6.status === 200, 'Duplicate delivery returns 200 OK');
    const data6 = await res6.json();
    assert(data6.message && data6.message.includes('already processed'), 'Acknowledges duplicate delivery');
    assert(sentMockEmails.length === initialEmailCount, 'Zero duplicate emails sent on retry');
    const finalFinanceCount = await Finance.countDocuments({ referenceId: payment1._id });
    assert(finalFinanceCount === initialFinanceCount, 'Zero duplicate Finance records created');

    // ---------------------------------------------------------
    // TEST 7: Amount mismatch rejection
    // ---------------------------------------------------------
    console.log('\n--- Test 7: Amount mismatch rejection ---');
    const bill2 = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-101',
      amount: 1500,
      month: 'November 2026',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    const payment2 = await Payment.create({
      societyId: societyA._id,
      billId: bill2._id,
      residentId: residentA._id,
      amount: 1500,
      razorpayOrderId: `order_hook_${timestamp}_02`,
      status: 'Pending'
    });

    const mismatchPayload = JSON.stringify({
      id: `evt_mismatch_${timestamp}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: payment2.razorpayOrderId,
            amount: 999900, // Tampered amount (expected 150000)
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_tampered_${timestamp}`,
            order_id: payment2.razorpayOrderId,
            amount: 999900,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });
    const mismatchSig = computeSignature(mismatchPayload);

    const res7 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': mismatchSig
      },
      body: mismatchPayload
    });

    assert(res7.status === 400, 'Rejects amount mismatch with 400');
    const data7 = await res7.json();
    assert(data7.message && data7.message.includes('Amount mismatch'), 'Returns Amount mismatch error message');
    const untouchedBill2 = await MaintenanceBill.findById(bill2._id);
    assert(untouchedBill2.status !== 'Paid', 'Bill is NOT marked Paid when amount does not match');

    // ---------------------------------------------------------
    // TEST 8: Cross-society payment attempt
    // ---------------------------------------------------------
    console.log('\n--- Test 8: Cross-society isolation enforcement ---');
    const billB = await MaintenanceBill.create({
      societyId: societyB._id, // Belongs to Society B
      residentId: residentB._id,
      flatNumber: 'B-202',
      amount: 3000,
      month: 'October 2026',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    // Rogue payment referencing Bill B (Society B) but falsely claiming Society A
    const paymentCross = await Payment.create({
      societyId: societyA._id, // Cross-society forgery
      billId: billB._id,
      residentId: residentA._id,
      amount: 3000,
      razorpayOrderId: `order_hook_${timestamp}_cross`,
      status: 'Pending'
    });

    const crossPayload = JSON.stringify({
      id: `evt_cross_${timestamp}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: paymentCross.razorpayOrderId,
            amount: 300000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_cross_${timestamp}`,
            order_id: paymentCross.razorpayOrderId,
            amount: 300000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });
    const crossSig = computeSignature(crossPayload);

    const res8 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': crossSig
      },
      body: crossPayload
    });

    assert(res8.status === 400, 'Rejects cross-society mismatch with 400');
    const data8 = await res8.json();
    assert(data8.message && data8.message.includes('Cross-society mismatch'), 'Returns Cross-society mismatch error');
    const untouchedBillB = await MaintenanceBill.findById(billB._id);
    assert(untouchedBillB.status !== 'Paid', 'Society B bill remains uncompromised and NOT Paid');

    // ---------------------------------------------------------
    // TEST 9: Already-paid bill protection
    // ---------------------------------------------------------
    console.log('\n--- Test 9: Protection against marking already-paid bill ---');
    // bill1 is already 'Paid'. Create an unauthorized second payment for the same bill
    const paymentRogue = await Payment.create({
      societyId: societyA._id,
      billId: bill1._id, // Points to already-paid bill1
      residentId: residentA._id,
      amount: 2500,
      razorpayOrderId: `order_hook_${timestamp}_rogue`,
      status: 'Pending'
    });

    const roguePayload = JSON.stringify({
      id: `evt_rogue_${timestamp}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: paymentRogue.razorpayOrderId,
            amount: 250000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_rogue_${timestamp}`,
            order_id: paymentRogue.razorpayOrderId,
            amount: 250000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });
    const rogueSig = computeSignature(roguePayload);

    const res9 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': rogueSig
      },
      body: roguePayload
    });

    assert(res9.status === 400, 'Rejects duplicate payment attempt on already-paid bill with 400');
    const data9 = await res9.json();
    assert(data9.message && data9.message.includes('already paid by another payment'), 'Protects bill from double payment claim');

    // ---------------------------------------------------------
    // TEST 10: payment.failed processing
    // ---------------------------------------------------------
    console.log('\n--- Test 10: payment.failed event handling ---');
    sentMockEmails.length = 0;

    const billFail = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-101',
      amount: 1800,
      month: 'December 2026',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    const paymentFail = await Payment.create({
      societyId: societyA._id,
      billId: billFail._id,
      residentId: residentA._id,
      amount: 1800,
      razorpayOrderId: `order_hook_${timestamp}_fail`,
      status: 'Pending'
    });

    const failPayload = JSON.stringify({
      id: `evt_fail_${timestamp}`,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${timestamp}`,
            order_id: paymentFail.razorpayOrderId,
            amount: 180000,
            currency: 'INR',
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Card declined by issuing bank'
          }
        }
      }
    });
    const failSig = computeSignature(failPayload);

    const res10 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': failSig
      },
      body: failPayload
    });

    assert(res10.status === 200, 'Acknowledges payment.failed with 200');
    const updatedPaymentFail = await Payment.findById(paymentFail._id);
    assert(updatedPaymentFail.status === 'Failed', 'Payment status marked Failed');
    const updatedBillFail = await MaintenanceBill.findById(billFail._id);
    assert(updatedBillFail.status === 'Failed', 'Bill status marked Failed (NEVER Paid)');
    assert(updatedBillFail.status !== 'Paid', 'Bill is strictly NOT Paid');

    const failEmail = sentMockEmails.find(e => e.to.toLowerCase() === residentA.email.toLowerCase() && (e.subject.includes('Payment Failure') || e.subject.includes('Payment Failed')));
    assert(!!failEmail, 'Resident notified of payment failure via email');

    // ---------------------------------------------------------
    // TEST 11: Protection: Failed event cannot override confirmed payment
    // ---------------------------------------------------------
    console.log('\n--- Test 11: Protection against failed event overriding confirmed payment ---');
    // payment1 is already 'Success' from Test 5. Send a failed payment webhook pointing to payment1's order
    const overrideAttemptPayload = JSON.stringify({
      id: `evt_override_${timestamp}`,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_override_${timestamp}`,
            order_id: payment1.razorpayOrderId,
            amount: 250000,
            currency: 'INR',
            status: 'failed'
          }
        }
      }
    });
    const overrideSig = computeSignature(overrideAttemptPayload);

    const res11 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': overrideSig
      },
      body: overrideAttemptPayload
    });

    assert(res11.status === 200, 'Handles override attempt gracefully with 200');
    const data11 = await res11.json();
    assert(data11.message && data11.message.includes('already confirmed as successful'), 'Returns protection message against overriding confirmed payment');
    const payment1Check = await Payment.findById(payment1._id);
    assert(payment1Check.status === 'Success', 'Payment status remains strictly Success');
    const bill1Check = await MaintenanceBill.findById(bill1._id);
    assert(bill1Check.status === 'Paid', 'Bill remains strictly Paid');

    // ---------------------------------------------------------
    // TEST 12: Reliability: SMTP failure does not undo confirmed payment
    // ---------------------------------------------------------
    console.log('\n--- Test 12: SMTP failure does not undo confirmed payment ---');
    mockTransporter.shouldFail = true; // Simulate SMTP outage

    const billSmtpFail = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-101',
      amount: 4000,
      month: 'January 2027',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    const paymentSmtpFail = await Payment.create({
      societyId: societyA._id,
      billId: billSmtpFail._id,
      residentId: residentA._id,
      amount: 4000,
      razorpayOrderId: `order_hook_${timestamp}_smtpfail`,
      status: 'Pending'
    });

    const smtpFailPayload = JSON.stringify({
      id: `evt_smtpfail_${timestamp}`,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: paymentSmtpFail.razorpayOrderId,
            amount: 400000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_smtpfail_${timestamp}`,
            order_id: paymentSmtpFail.razorpayOrderId,
            amount: 400000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });
    const smtpFailSig = computeSignature(smtpFailPayload);

    const res12 = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': smtpFailSig
      },
      body: smtpFailPayload
    });

    assert(res12.status === 200, 'Webhook succeeds with 200 despite SMTP failure');
    const updatedPaymentSmtp = await Payment.findById(paymentSmtpFail._id);
    assert(updatedPaymentSmtp.status === 'Success', 'Payment is confirmed Success in database despite SMTP error');
    const updatedBillSmtp = await MaintenanceBill.findById(billSmtpFail._id);
    assert(updatedBillSmtp.status === 'Paid', 'Bill is marked Paid in database despite SMTP error');

    mockTransporter.shouldFail = false; // Restore SMTP

    // ---------------------------------------------------------
    // TEST 13: Regression: Existing Checkout signature verification works
    // ---------------------------------------------------------
    console.log('\n--- Test 13: Existing Checkout signature verification (POST /api/payments/verify) ---');
    const billCheckout = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-101',
      amount: 1200,
      month: 'February 2027',
      dueDate: new Date(Date.now() + 86400000 * 7),
      status: 'PaymentInitiated'
    });

    const checkoutOrderId = `order_checkout_${timestamp}`;
    const checkoutPayId = `pay_checkout_${timestamp}`;
    const paymentCheckout = await Payment.create({
      societyId: societyA._id,
      billId: billCheckout._id,
      residentId: residentA._id,
      amount: 1200,
      razorpayOrderId: checkoutOrderId,
      status: 'Pending'
    });

    // Generate Checkout HMAC signature using RAZORPAY_KEY_SECRET (order_id + "|" + payment_id)
    const checkoutSecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const checkoutSig = crypto
      .createHmac('sha256', checkoutSecret)
      .update(`${checkoutOrderId}|${checkoutPayId}`)
      .digest('hex');

    const res13 = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${residentAToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: checkoutOrderId,
        razorpay_payment_id: checkoutPayId,
        razorpay_signature: checkoutSig
      })
    });

    assert(res13.status === 200, 'Existing Checkout verify succeeds with 200');
    const data13 = await res13.json();
    assert(data13.success === true, 'Checkout verify returns success: true');
    const updatedPaymentCheckout = await Payment.findById(paymentCheckout._id);
    assert(updatedPaymentCheckout.status === 'Success', 'Payment marked Success via Checkout verify');
    const updatedBillCheckout = await MaintenanceBill.findById(billCheckout._id);
    assert(updatedBillCheckout.status === 'Paid', 'Bill marked Paid via Checkout verify');

  } finally {
    // Clean up test fixtures
    console.log('\nCleaning up test fixtures...');
    await Payment.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await MaintenanceBill.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Finance.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await WebhookEvent.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Notification.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await User.deleteMany({ _id: { $in: [adminA._id, residentA._id, residentB._id] } });
    await Society.deleteMany({ _id: { $in: [societyA._id, societyB._id] } });
    if (testServer) testServer.close();
    resetTransporter();
    await mongoose.disconnect();
    console.log('Cleanup completed.\n');
  }

  console.log('========================================================');
  console.log(`TEST SUMMARY: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
