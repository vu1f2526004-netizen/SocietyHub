const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

const realPayload = '{"account_id":"acc_TLhQvLqGMaaqdX","contains":["refund","payment"],"created_at":1792085681,"entity":"event","event":"refund.processed","payload":{"payment":{"entity":{"account_id":null,"acquirer_data":{"bank_transaction_id":"9266734"},"amount":5020100,"amount_refunded":5020100,"amount_transferred":0,"bank":"BARB_R","base_amount":5020100,"captured":true,"card_id":null,"contact":"+919892647989","created_at":1792071578,"currency":"INR","customer_id":null,"description":"Maintenance Bill - July 2027 Flat 405","device_id":null,"email":"anshjai98@gmail.com","entity":"payment","error_code":null,"error_description":null,"error_reason":null,"error_source":null,"error_step":null,"fee":118474,"fee_bearer":null,"gateway_merchant_id":null,"gateway_provider":"Razorpay","gateway_terminal_id":null,"id":"pay_ToCgJF2U6D77Nq","internal_status":null,"international":false,"invoice_id":null,"method":"netbanking","notes":{"billId":"6ad0d685dc2fa7d8ece49793","flatNumber":"405","month":"July 2027","residentId":"6acf90a8daa73a900498bc4b","societyId":"6acf8a57c579a4bffbf87bef"},"optimizer_provider":null,"order_id":"order_ToCgDhHkgVKj6q","provider":null,"receiver_type":null,"refund_status":"full","settled_by":null,"source_channel":"online","status":"refunded","store_id":null,"tax":18072,"terminal_id":null,"token_id":null,"vpa":null,"wallet":null}},"refund":{"entity":{"acquirer_data":{"arn":"10000000000000"},"amount":5020100,"batch_id":null,"created_at":1792085677,"currency":"INR","entity":"refund","id":"rfnd_ToGgXeEPMjwKxX","notes":{"comment":""},"payment_id":"pay_ToCgJF2U6D77Nq","receipt":null,"speed_processed":"normal","speed_requested":"normal","status":"processed"}}}}';

const signature = crypto.createHmac('sha256', secret).update(Buffer.from(realPayload)).digest('hex');

(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature,
        'X-Razorpay-Event-Id': 'test_event_' + Date.now()
      },
      body: realPayload
    });
    console.log('Status code:', res.status);
    console.log('Response body:', await res.json());
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
})();
