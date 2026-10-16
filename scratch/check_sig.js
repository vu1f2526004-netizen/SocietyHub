const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: 'server/.env' });

const transcript = fs.readFileSync('C:/Users/ansh jaiswal/.gemini/antigravity-ide/brain/57ab5365-ed1d-4e9a-8773-dae39b01536c/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
const line4544 = lines.find(l => l.includes('ToGhA6vmQzXfG9') && l.includes('refund.processed'));
if (!line4544) {
  console.log('Not found');
  process.exit(1);
}
const data = JSON.parse(line4544);
const match = data.content.match(/\{"account_id":.*\}\}\}\}/);
if (match) {
  const jsonStr = match[0];
  console.log('Found body length:', jsonStr.length);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(jsonStr);
  const digest = hmac.digest('hex');
  const expectedSig = '62fc9b444f7d6dc2b14dca103b9e867cbdfa8852c07b1bd7113236f7146eb82b';
  console.log('Digest:  ', digest);
  console.log('Expected:', expectedSig);
  console.log('Matches: ', digest === expectedSig);
} else {
  console.log('Match regex failed');
}
