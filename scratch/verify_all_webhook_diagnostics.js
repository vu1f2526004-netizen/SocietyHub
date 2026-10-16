const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const BASE_LOCAL = 'http://localhost:5000';
const BASE_NGROK = 'https://jingling-thumb-robust.ngrok-free.dev';

async function testEndpoint(name, url, method, headers, body) {
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
    const data = await res.json().catch(() => ({ raw: 'non-json' }));
    return { name, status: res.status, ok: res.ok, data };
  } catch (err) {
    return { name, error: err.message };
  }
}

async function run() {
  console.log('=== SocietyHub Webhook Diagnostic Verification ===');
  console.log('Webhook secret configured length:', secret?.length);

  const testPayload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_TLhQvLqGMaaqdX',
    event: 'order.paid',
    contains: ['payment', 'order'],
    payload: {
      payment: {
        entity: {
          id: 'pay_diagnostic_' + Date.now(),
          order_id: 'order_diagnostic_' + Date.now(),
          status: 'captured',
          amount: 500000
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  });

  const validSig = crypto.createHmac('sha256', secret).update(Buffer.from(testPayload)).digest('hex');
  const invalidSig = 'a19b1d4a02e8249a94d244933170f317835660b0c3618bbef8f25b110953c26b';

  const results = [];

  // 1. Missing signature on /api/payments/webhook
  results.push(await testEndpoint(
    'Local /api/payments/webhook [No Signature]',
    `${BASE_LOCAL}/api/payments/webhook`,
    'POST',
    { 'Content-Type': 'application/json' },
    testPayload
  ));

  // 2. Invalid signature on /api/payments/webhook
  results.push(await testEndpoint(
    'Local /api/payments/webhook [Invalid Signature]',
    `${BASE_LOCAL}/api/payments/webhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': invalidSig },
    testPayload
  ));

  // 3. Valid signature on /api/payments/webhook
  results.push(await testEndpoint(
    'Local /api/payments/webhook [Valid Signature]',
    `${BASE_LOCAL}/api/payments/webhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': validSig },
    testPayload
  ));

  // 4. Missing signature on /api/payments/verifyPaymentByWebhook
  results.push(await testEndpoint(
    'Local /api/payments/verifyPaymentByWebhook [No Signature]',
    `${BASE_LOCAL}/api/payments/verifyPaymentByWebhook`,
    'POST',
    { 'Content-Type': 'application/json' },
    testPayload
  ));

  // 5. Valid signature on /api/payments/verifyPaymentByWebhook
  results.push(await testEndpoint(
    'Local /api/payments/verifyPaymentByWebhook [Valid Signature]',
    `${BASE_LOCAL}/api/payments/verifyPaymentByWebhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': validSig },
    testPayload
  ));

  // 6. Valid signature on legacy /api/v1/payments/verifyPaymentByWebhook
  results.push(await testEndpoint(
    'Local /api/v1/payments/verifyPaymentByWebhook [Valid Signature]',
    `${BASE_LOCAL}/api/v1/payments/verifyPaymentByWebhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': validSig },
    testPayload
  ));

  // 7. Protected route /api/payments/verify without JWT
  results.push(await testEndpoint(
    'Local /api/payments/verify [No JWT - Protected Route]',
    `${BASE_LOCAL}/api/payments/verify`,
    'POST',
    { 'Content-Type': 'application/json' },
    { razorpay_payment_id: 'test', razorpay_order_id: 'test', razorpay_signature: 'test' }
  ));

  // 8. Public ngrok endpoint with valid signature
  results.push(await testEndpoint(
    'Ngrok /api/payments/webhook [Valid Signature]',
    `${BASE_NGROK}/api/payments/webhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': validSig },
    testPayload
  ));

  // 9. Public ngrok legacy endpoint with valid signature
  results.push(await testEndpoint(
    'Ngrok /api/v1/payments/verifyPaymentByWebhook [Valid Signature]',
    `${BASE_NGROK}/api/v1/payments/verifyPaymentByWebhook`,
    'POST',
    { 'Content-Type': 'application/json', 'X-Razorpay-Signature': validSig },
    testPayload
  ));

  console.log('\n--- Test Results Summary ---');
  results.forEach(r => {
    console.log(`[${r.status || 'ERR'}] ${r.name} -> message: ${r.data?.message || JSON.stringify(r.data)}`);
  });
}

run();
