const crypto = require('crypto');
const fs = require('fs');

async function run() {
  const rRes = await fetch('http://127.0.0.1:4040/api/requests/http/airt_3Kk7mUP1eOIC04prc4hlrZgQXk9');
  const r = await rRes.json();
  const rawHttp = Buffer.from(r.request.raw, 'base64');
  const headerEndIdx = rawHttp.indexOf('\r\n\r\n');
  const rawBody = rawHttp.slice(headerEndIdx + 4);
  const targetSig = r.request.headers['X-Razorpay-Signature']?.[0];

  const envFiles = ['server/.env', 'server/.env.example', 'client/.env', 'client/.env.example'];
  const candidates = new Set();
  
  envFiles.forEach(f => {
    if (fs.existsSync(f)) {
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts[1]) {
          const val = parts.slice(1).join('=').trim();
          candidates.add(val);
          candidates.add(val.replace(/['"]/g, ''));
        }
      });
    }
  });

  candidates.add('');
  candidates.add('rzp_whsec_development_local');
  candidates.add('secret');
  candidates.add('webhook_secret');
  candidates.add('SocietyHub');
  candidates.add('societyhub');

  console.log('Testing', candidates.size, 'candidates...');
  for (const cand of candidates) {
    const hmac = crypto.createHmac('sha256', cand).update(rawBody).digest('hex');
    if (hmac === targetSig) {
      console.log('FOUND MATCH! Candidate length:', cand.length);
      return;
    }
  }
  console.log('No candidate matched.');
}

run().catch(console.error);
