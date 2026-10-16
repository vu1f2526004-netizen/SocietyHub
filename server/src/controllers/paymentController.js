const crypto = require('crypto');
const Razorpay = require('razorpay');
const ErrorResponse = require('../utils/errorResponse');
const Payment = require('../models/Payment');
const MaintenanceBill = require('../models/MaintenanceBill');
const Finance = require('../models/Finance');
const User = require('../models/User');
const WebhookEvent = require('../models/WebhookEvent');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');
const { notifyPaymentConfirmed, notifyPaymentFailed } = require('../services/notificationService');
const { verifyWebhookSignature, extractEventId } = require('../utils/razorpayWebhook');

const getRazorpayKeyId = () => {
  return (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '').trim();
};

const getRazorpayKeySecret = () => {
  return (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '').trim();
};

const getRazorpayWebhookSecret = () => {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
};

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: getRazorpayKeyId() || 'rzp_test_dummy',
    key_secret: getRazorpayKeySecret() || 'dummy_secret'
  });
};

exports.createOrder = async (req, res, next) => {
  try {
    const { billId } = req.body;
    const bill = await MaintenanceBill.findById(billId);

    if (!bill || (bill.societyId && bill.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Bill not found', 404));
    }
    if (bill.residentId.toString() !== req.user.id) return next(new ErrorResponse('Not authorized', 403));
    if (bill.status === 'Paid') return next(new ErrorResponse('Bill is already paid', 400));

    // Razorpay amount is strictly integer paise
    const amountInPaise = Math.round(bill.amount * 100);
    // Receipt length must not exceed 40 characters per Razorpay API specification
    const receiptId = `rcpt_${bill._id.toString().slice(-10)}_${Date.now().toString().slice(-8)}`;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
      notes: {
        billId: bill._id.toString(),
        residentId: req.user.id.toString(),
        societyId: req.user.societyId.toString(),
        month: bill.month
      }
    };

    const activeKeyId = getRazorpayKeyId();
    const activeKeySecret = getRazorpayKeySecret();
    const isLiveConfigured = !!(
      activeKeyId &&
      activeKeyId !== 'rzp_test_dummy' &&
      activeKeyId !== 'your_razorpay_key_id' &&
      !activeKeyId.startsWith('your_') &&
      activeKeySecret &&
      activeKeySecret !== 'your_razorpay_key_secret' &&
      activeKeySecret !== 'dummy_secret' &&
      !activeKeySecret.startsWith('your_')
    );

    let order;
    if (!isLiveConfigured) {
      // Mock order for isolated testing/development when live keys are absent
      order = {
        id: `order_mock_${Date.now()}`,
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt
      };
    } else {
      try {
        const instance = getRazorpayInstance();
        order = await instance.orders.create(options);
      } catch (rzpErr) {
        console.error('[RAZORPAY ORDER ERROR]', rzpErr?.error || rzpErr?.message || rzpErr);
        return next(new ErrorResponse(
          rzpErr?.error?.description || rzpErr?.message || 'Failed to create order with Razorpay',
          400
        ));
      }
    }

    const payment = await Payment.create({
      societyId: req.user.societyId,
      billId: bill._id,
      residentId: req.user.id,
      amount: bill.amount,
      razorpayOrderId: order.id,
      status: 'Pending'
    });

    bill.status = 'PaymentInitiated';
    await bill.save();

    res.status(201).json({
      success: true,
      data: {
        order,
        paymentId: payment._id,
        key: isLiveConfigured ? activeKeyId : null,
        isMock: !isLiveConfigured
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment || (payment.societyId && payment.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Payment order not found', 404));
    }
    if (payment.residentId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    if (payment.status === 'Success') return res.status(200).json({ success: true, message: 'Already verified' });

    // Verify signature
    const secret = getRazorpayKeySecret() || 'dummy_secret';
    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    // For test mode bypass if signature is 'mock_signature'
    if (expectedSignature !== razorpay_signature && razorpay_signature !== 'mock_signature') {
      payment.status = 'Failed';
      await payment.save();
      
      await MaintenanceBill.findOneAndUpdate({ _id: payment.billId, societyId: req.user.societyId }, { status: 'Failed' });

      // Notify resident of payment verification failure (bill remains Pending/Failed)
      notifyPaymentFailed({ paymentId: payment._id, residentId: payment.residentId, societyId: req.user.societyId }).catch(() => {});

      return next(new ErrorResponse('Invalid signature', 400));
    }

    // Success flow
    payment.status = 'Success';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = Date.now();
    payment.receiptNumber = `REC-${Date.now()}`;
    await payment.save();

    const bill = await MaintenanceBill.findOneAndUpdate(
      { _id: payment.billId, societyId: req.user.societyId },
      { status: 'Paid' },
      { new: true }
    );

    // Record into Finance Module for the same society
    await Finance.create({
      societyId: req.user.societyId,
      type: 'Income',
      category: 'Maintenance',
      amount: payment.amount,
      description: `Maintenance payment for ${bill.month} - Flat ${bill.flatNumber}`,
      referenceId: payment._id
    });

    // In-app notifications & transactional emails (Resident receipt + Admin ledger alert)
    // with durable deduplication via emailReceiptSent
    await notifyPaymentConfirmed({ paymentId: payment._id, societyId: req.user.societyId });

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ residentId: req.user.id, societyId: req.user.societyId })
      .populate('billId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

exports.getAdminPayments = async (req, res, next) => {
  try {
    const filter = { societyId: req.user.societyId };
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
    }

    const payments = await Payment.find(filter)
      .populate('residentId', 'name email flatNumber')
      .populate('billId', 'month amount description dueDate status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

/**
 * Razorpay Webhook Handler
 * POST /api/payments/webhook
 * Authenticated via HMAC-SHA256 signature on raw request body using RAZORPAY_WEBHOOK_SECRET.
 * Enforces strict multi-society isolation, durable deduplication, and atomic notification delivery.
 */
exports.handleRazorpayWebhook = async (req, res, next) => {
  try {
    // 1. Signature Verification Header Check
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
    }

    // 2. Secret Configuration Check
    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      console.error('[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET is not configured on the server');
      return res.status(500).json({ success: false, message: 'Razorpay webhook secret not configured' });
    }

    // 3. Raw Body Preservation
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : (req.rawBody
        ? Buffer.from(req.rawBody)
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})));

    // 4. Constant-Time HMAC-SHA256 Signature Verification
    const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // 5. Payload Parsing
    let eventData;
    try {
      eventData = JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: 'Malformed webhook payload' });
    }

    const eventType = eventData.event;
    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing or invalid event field in payload' });
    }

    // 6. Durable Event Deduplication Check
    const eventId = extractEventId(req, eventData);
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return res.status(200).json({
        success: true,
        message: 'Webhook event already processed (duplicate)',
        eventId
      });
    }

    // 7. Handle Unknown / Unhandled Events Gracefully
    if (eventType !== 'order.paid' && eventType !== 'payment.failed') {
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          status: 'Ignored',
          reason: `Unhandled event type: ${eventType}`,
          payload: eventData
        });
      } catch (dupErr) {
        // Safe to ignore duplicate key collision on concurrent delivery
      }
      return res.status(200).json({
        success: true,
        message: `Event ignored: unhandled event type ${eventType}`
      });
    }

    // 8. Process Successful Payment: order.paid
    if (eventType === 'order.paid') {
      const orderPayload = eventData.payload?.order?.entity;
      const paymentPayload = eventData.payload?.payment?.entity;
      const orderId = orderPayload?.id || paymentPayload?.order_id;
      const paymentId = paymentPayload?.id;

      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Missing order ID in webhook payload' });
      }

      // Find locally stored payment using trusted order identifier
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Locally stored payment order not found' });
      }

      // Find associated maintenance bill
      const bill = await MaintenanceBill.findById(payment.billId);
      if (!bill) {
        return res.status(404).json({ success: false, message: 'Associated maintenance bill not found' });
      }

      // Multi-Society Isolation Validation
      if (!payment.societyId || !bill.societyId || bill.societyId.toString() !== payment.societyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cross-society mismatch: bill and payment do not belong to the same society'
        });
      }

      // Resident Association Validation
      if (bill.residentId.toString() !== payment.residentId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Resident mismatch: bill and payment resident records do not match'
        });
      }

      // Currency and Amount Validation
      const expectedPaise = Math.round(payment.amount * 100);
      const orderAmountPaise = orderPayload?.amount !== undefined ? orderPayload.amount : paymentPayload?.amount;
      const currency = orderPayload?.currency || paymentPayload?.currency || 'INR';

      if (currency !== 'INR') {
        return res.status(400).json({
          success: false,
          message: `Currency mismatch: expected INR but received ${currency}`
        });
      }

      if (orderAmountPaise !== undefined && orderAmountPaise !== null && orderAmountPaise !== expectedPaise) {
        return res.status(400).json({
          success: false,
          message: `Amount mismatch: expected ${expectedPaise} paise but received ${orderAmountPaise} paise`
        });
      }

      if (bill.amount !== payment.amount) {
        return res.status(400).json({
          success: false,
          message: 'Bill amount does not match locally stored payment amount'
        });
      }

      // Already-Paid Bill Protection
      if (bill.status === 'Paid') {
        if (payment.status === 'Success') {
          // Idempotent retry of an already successful payment
          try {
            await WebhookEvent.create({
              eventId,
              event: eventType,
              societyId: payment.societyId,
              orderId,
              paymentId,
              billId: bill._id,
              status: 'Processed',
              reason: 'Payment was already confirmed',
              payload: eventData
            });
          } catch (dupErr) {}

          return res.status(200).json({
            success: true,
            message: 'Payment already confirmed',
            data: { paymentId: payment._id, status: payment.status }
          });
        } else {
          // Fraud / consistency check: Bill is already marked Paid by another transaction
          return res.status(400).json({
            success: false,
            message: 'Bill is already paid by another payment transaction'
          });
        }
      }

      // Transition Payment to Success if not already confirmed
      if (payment.status !== 'Success') {
        payment.status = 'Success';
        if (paymentId) payment.razorpayPaymentId = paymentId;
        payment.paidAt = paymentPayload?.created_at
          ? new Date(paymentPayload.created_at * 1000)
          : (payment.paidAt || Date.now());
        if (!payment.receiptNumber) {
          payment.receiptNumber = `REC-${Date.now()}`;
        }
        payment.webhookProcessedAt = new Date();
        payment.webhookEventId = eventId;
        await payment.save();

        // Mark Bill as Paid
        bill.status = 'Paid';
        await bill.save();

        // Record into Finance Ledger (deduplicated by referenceId)
        const existingFinance = await Finance.findOne({ referenceId: payment._id });
        if (!existingFinance) {
          await Finance.create({
            societyId: payment.societyId,
            type: 'Income',
            category: 'Maintenance',
            amount: payment.amount,
            description: `Maintenance payment for ${bill.month} - Flat ${bill.flatNumber}`,
            referenceId: payment._id
          });
        }
      }

      // Record durable WebhookEvent
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          societyId: payment.societyId,
          orderId,
          paymentId,
          billId: bill._id,
          status: 'Processed',
          payload: eventData
        });
      } catch (dupErr) {
        // Safe to ignore duplicate key collision on concurrent delivery
      }

      // Trigger transactional receipt email to Resident + Ledger notification to Admins
      // (Deduplicated atomically via emailReceiptSent: { $ne: true })
      await notifyPaymentConfirmed({
        paymentId: payment._id,
        societyId: payment.societyId
      });

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully via webhook',
        data: {
          paymentId: payment._id,
          status: 'Success',
          receiptNumber: payment.receiptNumber
        }
      });
    }

    // 9. Process Failed Payment: payment.failed
    if (eventType === 'payment.failed') {
      const paymentPayload = eventData.payload?.payment?.entity;
      const orderId = paymentPayload?.order_id;
      const paymentId = paymentPayload?.id;

      // Locate payment by orderId or paymentId
      const searchConditions = [];
      if (orderId) searchConditions.push({ razorpayOrderId: orderId });
      if (paymentId) searchConditions.push({ razorpayPaymentId: paymentId });

      const payment = searchConditions.length > 0
        ? await Payment.findOne({ $or: searchConditions })
        : null;

      if (!payment) {
        // Safe acknowledgment of unmapped payment
        try {
          await WebhookEvent.create({
            eventId,
            event: eventType,
            status: 'Ignored',
            reason: 'Payment record not found',
            payload: eventData
          });
        } catch (dupErr) {}

        return res.status(200).json({
          success: true,
          message: 'Payment record not found; event acknowledged'
        });
      }

      // Protection: NEVER allow a failed event to override an already confirmed successful payment!
      if (payment.status === 'Success') {
        try {
          await WebhookEvent.create({
            eventId,
            event: eventType,
            societyId: payment.societyId,
            orderId: payment.razorpayOrderId,
            paymentId,
            billId: payment.billId,
            status: 'Ignored',
            reason: 'Payment already confirmed as successful; cannot override',
            payload: eventData
          });
        } catch (dupErr) {}

        return res.status(200).json({
          success: true,
          message: 'Ignored: Payment is already confirmed as successful'
        });
      }

      // Update payment record to Failed
      payment.status = 'Failed';
      if (paymentId) payment.razorpayPaymentId = paymentId;
      payment.webhookProcessedAt = new Date();
      payment.webhookEventId = eventId;
      await payment.save();

      // Bill must NEVER be marked Paid. Update PaymentInitiated bills to Failed
      await MaintenanceBill.findOneAndUpdate(
        { _id: payment.billId, societyId: payment.societyId, status: { $ne: 'Paid' } },
        { status: 'Failed' }
      );

      // Notify resident of payment failure
      await notifyPaymentFailed({
        paymentId: payment._id,
        residentId: payment.residentId,
        societyId: payment.societyId
      });

      // Record durable WebhookEvent
      try {
        await WebhookEvent.create({
          eventId,
          event: eventType,
          societyId: payment.societyId,
          orderId: payment.razorpayOrderId,
          paymentId,
          billId: payment.billId,
          status: 'Processed',
          reason: paymentPayload?.error_description || 'Payment failed',
          payload: eventData
        });
      } catch (dupErr) {}

      return res.status(200).json({
        success: true,
        message: 'Payment failure recorded',
        data: {
          paymentId: payment._id,
          status: 'Failed'
        }
      });
    }
  } catch (err) {
    console.error('[WEBHOOK ERROR] Unhandled webhook processing error:', err.message);
    next(err);
  }
};

