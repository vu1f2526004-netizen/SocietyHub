const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

async function testCall() {
  console.log('Sending request to http://127.0.0.1:5000/api/auth/register-society...');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('http://127.0.0.1:5000/api/auth/register-society', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        societyName: 'Test Society ' + Date.now(),
        address: '123 Test St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
        name: 'Test Secretary',
        email: 'sec_' + Date.now() + '@test.com',
        mobile: '9876543210',
        password: 'password123',
        confirmPassword: 'password123'
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (err) {
    clearTimeout(timeout);
    console.error('Error:', err.message);
  }
}

testCall();
