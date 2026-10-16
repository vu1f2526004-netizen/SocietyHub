const crypto = require('crypto');

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

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

const secret = 'test_webhook_secret_123';
const body = JSON.stringify({ event: 'order.paid', test: true });
const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

console.log('Valid with string:', verifyWebhookSignature(body, validSig, secret));
console.log('Valid with Buffer:', verifyWebhookSignature(Buffer.from(body), validSig, secret));
console.log('Invalid sig:', verifyWebhookSignature(body, 'wrong_signature', secret));
console.log('Missing sig:', verifyWebhookSignature(body, null, secret));
console.log('Missing secret:', verifyWebhookSignature(body, validSig, null));
console.log('Tampered body:', verifyWebhookSignature(body + ' ', validSig, secret));
