const crypto = require('crypto');

/**
 * Verify Razorpay Webhook signature using HMAC-SHA256 and constant-time comparison.
 *
 * @param {Buffer|string} rawBody - The unparsed, untransformed request body
 * @param {string} signature - The value of the 'x-razorpay-signature' header
 * @param {string} secret - The RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean} - true if signature matches, false otherwise
 */
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || typeof signature !== 'string') {
    return false;
  }
  if (!secret || typeof secret !== 'string') {
    return false;
  }
  if (!rawBody) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    // Constant-time length and contents comparison
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Extract or synthesize a durable, deterministic event identifier for deduplication.
 *
 * @param {object} req - Express request
 * @param {object} eventData - Parsed webhook payload
 * @returns {string} - Unique event key
 */
function extractEventId(req, eventData) {
  const headerEventId = req.headers['x-razorpay-event-id'];
  if (headerEventId && typeof headerEventId === 'string' && headerEventId.trim().length > 0) {
    return headerEventId.trim();
  }

  if (eventData?.id && typeof eventData.id === 'string' && eventData.id.trim().length > 0) {
    return eventData.id.trim();
  }

  if (eventData?.event_id && typeof eventData.event_id === 'string' && eventData.event_id.trim().length > 0) {
    return eventData.event_id.trim();
  }

  // Deterministic fallback based on event type, order ID and payment ID
  const event = eventData?.event || 'unknown';
  const orderId = eventData?.payload?.order?.entity?.id || eventData?.payload?.payment?.entity?.order_id || 'no_order';
  const paymentId = eventData?.payload?.payment?.entity?.id || 'no_payment';

  return `${event}:${orderId}:${paymentId}`;
}

module.exports = {
  verifyWebhookSignature,
  extractEventId
};
