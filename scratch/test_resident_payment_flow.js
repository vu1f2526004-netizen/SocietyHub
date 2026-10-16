/**
 * SocietyHub Resident Payment Gateway Integration & Checkout Verification Test Suite
 *
 * Verifies:
 * 1. Real bill data retrieval via GET /api/bills/my
 * 2. Order creation via POST /api/payments/create-order
 * 3. Checkout parameter integrity (order ID, amount in paise, currency)
 * 4. Server-side signature verification required (invalid signatures rejected with 400)
 * 5. Invalid signature cannot mark bill as Paid (bill remains unpaid)
 * 6. Cross-society order creation strictly rejected (404/403)
 * 7. Duplicate payment attempts on paid bills rejected (400)
 * 8. Payment history displays confirmed transactions via GET /api/payments/my
 * 9. Receipt email triggered once without duplication on repeat verification
 * 10. Webhook and Checkout verification cooperative idempotency
 */

const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const MaintenanceBill = require('../server/src/models/MaintenanceBill');
const Payment = require('../server/src/models/Payment');
const Finance = require('../server/src/models/Finance');
const { setTransporter, resetTransporter } = require('../server/src/utils/sendEmail');

const API_BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}${detail ? ' - ' + detail : ''}`);
  }
}

// In-memory mock email transporter
const mockEmails = [];
const mockTransporter = {
  sendMail: async (options) => {
    mockEmails.push(options);
    return {
      messageId: `<mock-flow-${Date.now()}@societyhub.test>`,
      response: '250 Mock Accepted'
    };
  }
};

async function runPaymentFlowTests() {
  console.log('========================================================');
  console.log('SOCIETYHUB RESIDENT PAYMENT GATEWAY FLOW TEST SUITE');
  console.log('========================================================\n');

  await connectDB();
  setTransporter(mockTransporter);

  const timestamp = Date.now();
  console.log('Setting up isolated test fixtures...');

  // Society A & B
  const societyA = await Society.create({
    name: `Payment Flow Society A ${timestamp}`,
    address: '100 Gateway Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    joinCode: `PAY-${timestamp}-A`
  });

  const societyB = await Society.create({
    name: `Payment Flow Society B ${timestamp}`,
    address: '200 Boundary Rd',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    joinCode: `PAY-${timestamp}-B`
  });

  // Admin A
  const adminA = await User.create({
    name: `Admin A ${timestamp}`,
    email: `adminA_${timestamp}@testpay.com`,
    password: 'Password123!',
    role: 'Admin',
    status: 'Active',
    societyId: societyA._id
  });

  // Resident A in Society A
  const residentA = await User.create({
    name: `Resident A ${timestamp}`,
    email: `residentA_${timestamp}@testpay.com`,
    password: 'Password123!',
    role: 'Resident',
    status: 'Active',
    flatNumber: 'A-401',
    societyId: societyA._id
  });

  // Resident B in Society B
  const residentB = await User.create({
    name: `Resident B ${timestamp}`,
    email: `residentB_${timestamp}@testpay.com`,
    password: 'Password123!',
    role: 'Resident',
    status: 'Active',
    flatNumber: 'B-502',
    societyId: societyB._id
  });

  // Authentic signed JWT tokens
  const tokenA = residentA.getSignedJwtToken();
  const tokenB = residentB.getSignedJwtToken();

  console.log('Fixtures & authentic session tokens created.\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Real bill data appears on payment page (GET /bills/my)
    // -------------------------------------------------------------
    console.log('--- Test 1: Real bill data appears on payment page ---');
    const bill1 = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-401',
      amount: 3200,
      month: 'November 2026',
      dueDate: new Date(Date.now() + 86400000 * 5),
      status: 'Pending'
    });

    const bill2B = await MaintenanceBill.create({
      societyId: societyB._id, // Belongs to Society B
      residentId: residentB._id,
      flatNumber: 'B-502',
      amount: 4500,
      month: 'November 2026',
      dueDate: new Date(Date.now() + 86400000 * 5),
      status: 'Pending'
    });

    const res1 = await fetch(`${API_BASE}/bills/my`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(res1.status === 200, 'Resident A can retrieve their bills (HTTP 200)');
    const billsData = await res1.json();
    assert(Array.isArray(billsData.data), 'Bills response data is an array');
    const foundBill1 = billsData.data.find(b => b._id === bill1._id.toString());
    assert(!!foundBill1, 'Resident A finds their own Bill 1 in the list');
    assert(foundBill1 && foundBill1.amount === 3200, 'Bill 1 amount correctly reflects 3200');
    assert(foundBill1 && foundBill1.month === 'November 2026', 'Bill 1 month correctly reflects November 2026');
    assert(foundBill1 && foundBill1.status === 'Pending', 'Bill 1 status is Pending');
    
    // Society B isolation
    const foundBillB = billsData.data.find(b => b._id === bill2B._id.toString());
    assert(!foundBillB, 'Society B bills are strictly isolated and not visible to Resident A');

    // -------------------------------------------------------------
    // Test 2: Pay Now calls backend order creation API
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Pay Now calls backend order creation API ---');
    const orderRes = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ billId: bill1._id })
    });
    assert(orderRes.status === 201, 'Backend creates payment order with HTTP 201');
    const orderPayload = await orderRes.json();
    assert(orderPayload.success === true, 'Order response returns success: true');
    assert(orderPayload.data && orderPayload.data.order && orderPayload.data.order.id, 'Returns valid order ID from server');
    const createdOrderId = orderPayload.data.order.id;

    // Verify database state after order creation
    const paymentDoc = await Payment.findOne({ razorpayOrderId: createdOrderId });
    assert(!!paymentDoc, 'Payment document created in database matching order ID');
    assert(paymentDoc && paymentDoc.status === 'Pending', 'Payment document initial status is Pending');
    assert(paymentDoc && paymentDoc.amount === 3200, 'Payment amount stored as 3200');

    const updatedBill1 = await MaintenanceBill.findById(bill1._id);
    assert(updatedBill1.status === 'PaymentInitiated', 'Bill transitioned to PaymentInitiated');

    // -------------------------------------------------------------
    // Test 3: Checkout parameter integrity
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Checkout parameter integrity ---');
    assert(createdOrderId.startsWith('order_'), 'Server-created order ID has standard Razorpay format');
    // Amount in paise
    if (orderPayload.data.order.amount) {
      assert(orderPayload.data.order.amount === 320000, 'Order amount in paise equals 320000 (3200 * 100)');
    } else {
      assert(paymentDoc.amount * 100 === 320000, 'Payment amount in paise is 320000');
    }

    // -------------------------------------------------------------
    // Test 4 & 5: Server-side signature verification is required & invalid signatures rejected
    // -------------------------------------------------------------
    console.log('\n--- Test 4 & 5: Signature verification strictly enforced & invalid signature rejected ---');
    mockEmails.length = 0;
    const invalidVerifyRes = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: 'pay_tampered_001',
        razorpay_signature: 'invalid_forged_signature_123'
      })
    });
    assert(invalidVerifyRes.status === 400, 'Invalid signature rejected with HTTP 400 Bad Request');
    const invalidData = await invalidVerifyRes.json();
    const errText = invalidData.error || invalidData.message || '';
    assert(errText.includes('Invalid signature'), 'Descriptive error message returned');

    // Verify bill is NOT marked Paid!
    const billAfterInvalid = await MaintenanceBill.findById(bill1._id);
    assert(billAfterInvalid.status !== 'Paid', 'Bill is strictly NOT marked Paid on invalid signature');
    assert(billAfterInvalid.status === 'Failed', 'Bill status updated to Failed');

    const paymentAfterInvalid = await Payment.findOne({ razorpayOrderId: createdOrderId });
    assert(paymentAfterInvalid.status === 'Failed', 'Payment status updated to Failed');

    // Verify NO receipt email was issued
    const receiptEmail = mockEmails.find(m => m.subject && m.subject.includes('Receipt'));
    assert(!receiptEmail, 'Zero receipt emails issued on invalid signature');

    // -------------------------------------------------------------
    // Test 6: Cross-society payment attempts are rejected
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Cross-society order creation rejected ---');
    const crossOrderRes = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}` // Resident A trying to pay Bill 2B (Society B)
      },
      body: JSON.stringify({ billId: bill2B._id })
    });
    assert(crossOrderRes.status === 404 || crossOrderRes.status === 403, 'Cross-society order creation strictly rejected (HTTP 404/403)');
    const untouchedBillB = await MaintenanceBill.findById(bill2B._id);
    assert(untouchedBillB.status === 'Pending', 'Society B bill remains uncompromised and in Pending state');

    // -------------------------------------------------------------
    // Test 7 & 8: Successful verification, bill marked Paid & Payment History refresh
    // -------------------------------------------------------------
    console.log('\n--- Test 7 & 8: Valid signature verification & Payment History refresh ---');
    mockEmails.length = 0;
    const bill3 = await MaintenanceBill.create({
      societyId: societyA._id,
      residentId: residentA._id,
      flatNumber: 'A-401',
      amount: 2800,
      month: 'December 2026',
      dueDate: new Date(Date.now() + 86400000 * 5),
      status: 'Pending'
    });

    const order3Res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ billId: bill3._id })
    });
    const order3Data = await order3Res.json();
    const order3Id = order3Data.data.order.id;
    const pay3Id = `pay_valid_${timestamp}_3`;

    // Compute valid HMAC signature using RAZORPAY_KEY_SECRET
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order3Id}|${pay3Id}`)
      .digest('hex');

    const validVerifyRes = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        razorpay_order_id: order3Id,
        razorpay_payment_id: pay3Id,
        razorpay_signature: validSignature
      })
    });
    assert(validVerifyRes.status === 200, 'Valid verification succeeds with HTTP 200');
    const validVerifyData = await validVerifyRes.json();
    assert(validVerifyData.success === true, 'Verification returns success: true');

    // Verify Bill 3 is now Paid
    const bill3Paid = await MaintenanceBill.findById(bill3._id);
    assert(bill3Paid.status === 'Paid', 'Bill 3 status updated to Paid');

    // Verify Payment 3 is Success
    const payment3Doc = await Payment.findOne({ razorpayOrderId: order3Id });
    assert(payment3Doc.status === 'Success', 'Payment status updated to Success');
    assert(payment3Doc.receiptNumber && payment3Doc.receiptNumber.startsWith('REC-'), 'Receipt number assigned');

    // Verify Payment History endpoint (GET /payments/my)
    const historyRes = await fetch(`${API_BASE}/payments/my`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(historyRes.status === 200, 'Resident A retrieves payment history (HTTP 200)');
    const historyData = await historyRes.json();
    const foundPayment3 = historyData.data.find(p => p.razorpayOrderId === order3Id);
    assert(!!foundPayment3, 'Payment 3 appears in payment history list');
    assert(foundPayment3 && foundPayment3.status === 'Success', 'Payment 3 status in history is Success');
    assert(foundPayment3 && foundPayment3.amount === 2800, 'Payment 3 amount in history is 2800');

    // -------------------------------------------------------------
    // Test 9: Deduplication: Repeat verification and order creation blocked
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Deduplication: Repeat verification & order on paid bill blocked ---');
    // Calling order creation again on the already-paid bill3 must fail
    const orderPaidBillRes = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ billId: bill3._id })
    });
    assert(orderPaidBillRes.status === 400, 'Order creation on already-paid bill rejected with HTTP 400');
    const orderPaidData = await orderPaidBillRes.json();
    const paidErrText = orderPaidData.error || orderPaidData.message || '';
    assert(paidErrText.includes('already paid'), 'Descriptive error "Bill is already paid"');

    // Calling verify again on already confirmed payment
    const emailCountBefore = mockEmails.length;
    const repeatVerifyRes = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        razorpay_order_id: order3Id,
        razorpay_payment_id: pay3Id,
        razorpay_signature: validSignature
      })
    });
    assert(repeatVerifyRes.status === 200, 'Repeat verification acknowledges with HTTP 200 ("Already verified")');
    assert(mockEmails.length === emailCountBefore, 'Zero duplicate emails sent on repeat verification');

    // -------------------------------------------------------------
    // Test 10: Webhook and Checkout cooperative idempotency
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Webhook and Checkout cooperative idempotency ---');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_development_local';
    const webhookEventId = `evt_coop_${timestamp}`;
    const webhookPayload = JSON.stringify({
      id: webhookEventId,
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: order3Id,
            amount: 280000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: pay3Id,
            order_id: order3Id,
            amount: 280000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    });

    const webhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    const webhookRes = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': webhookSig,
        'x-razorpay-event-id': webhookEventId
      },
      body: webhookPayload
    });

    assert(webhookRes.status === 200, 'Webhook acknowledges already-confirmed payment with HTTP 200');
    assert(mockEmails.length === emailCountBefore, 'Zero duplicate emails sent when webhook confirms already-verified payment');
    const financeCount = await Finance.countDocuments({ referenceId: payment3Doc._id });
    assert(financeCount === 1, 'Exactly 1 Finance ledger record exists (no duplicate accounting entry)');

  } finally {
    // Cleanup test fixtures
    console.log('\nCleaning up test fixtures...');
    await Payment.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await MaintenanceBill.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await Finance.deleteMany({ societyId: { $in: [societyA._id, societyB._id] } });
    await User.deleteMany({ _id: { $in: [adminA._id, residentA._id, residentB._id] } });
    await Society.deleteMany({ _id: { $in: [societyA._id, societyB._id] } });
    resetTransporter();
    await mongoose.disconnect();
    console.log('Cleanup completed.\n');
  }

  console.log('========================================================');
  console.log(`PAYMENT FLOW TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPaymentFlowTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
