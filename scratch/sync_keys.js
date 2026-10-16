const fs = require('fs');
const path = require('path');

const serverEnvPath = path.join(__dirname, '../server/.env');
const clientEnvPath = path.join(__dirname, '../client/.env');

const serverContent = fs.readFileSync(serverEnvPath, 'utf8');
const lines = serverContent.split(/\r?\n/);

let rzpKey = '';
let rzpSecret = '';

for (const line of lines) {
  const trimmed = line.trim();
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (key === 'RAZORPAY_KEY' || key === 'RAZORPAY_KEY_ID') {
      rzpKey = val;
    }
    if (key === 'RAZORPAY_SECRET' || key === 'RAZORPAY_KEY_SECRET') {
      rzpSecret = val;
    }
  }
}

if (!rzpKey || !rzpSecret) {
  console.error('ERROR: Could not find Razorpay Key or Secret in server/.env');
  process.exit(1);
}

console.log('Found key starting with:', rzpKey.substring(0, 9), 'length:', rzpKey.length);
console.log('Found secret length:', rzpSecret.length);

// 1. Update server/.env to ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are both present
const updatedServerLines = [];
let keyIdAdded = false;
let keySecretAdded = false;

for (const line of lines) {
  const trimmed = line.trim();
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    if (key === 'RAZORPAY_KEY') {
      updatedServerLines.push(`RAZORPAY_KEY_ID=${rzpKey}`);
      updatedServerLines.push(`RAZORPAY_KEY=${rzpKey}`);
      keyIdAdded = true;
      continue;
    }
    if (key === 'RAZORPAY_SECRET') {
      updatedServerLines.push(`RAZORPAY_KEY_SECRET=${rzpSecret}`);
      updatedServerLines.push(`RAZORPAY_SECRET=${rzpSecret}`);
      keySecretAdded = true;
      continue;
    }
    if (key === 'RAZORPAY_KEY_ID') {
      if (!keyIdAdded) {
        updatedServerLines.push(`RAZORPAY_KEY_ID=${rzpKey}`);
        keyIdAdded = true;
      }
      continue;
    }
    if (key === 'RAZORPAY_KEY_SECRET') {
      if (!keySecretAdded) {
        updatedServerLines.push(`RAZORPAY_KEY_SECRET=${rzpSecret}`);
        keySecretAdded = true;
      }
      continue;
    }
  }
  updatedServerLines.push(line);
}

fs.writeFileSync(serverEnvPath, updatedServerLines.join('\n'), 'utf8');
console.log('Successfully updated server/.env with standard and alias keys.');

// 2. Update client/.env to configure VITE_RAZORPAY_KEY_ID
const clientContent = `VITE_API_URL=http://localhost:5000/api\nVITE_RAZORPAY_KEY_ID=${rzpKey}\n`;
fs.writeFileSync(clientEnvPath, clientContent, 'utf8');
console.log('Successfully updated client/.env with VITE_RAZORPAY_KEY_ID.');
