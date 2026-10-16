const http = require('http');

const users = [
  { email: 'admin@society.com', password: 'password123', role: 'Admin', expectedUrl: '/admin' },
  { email: 'residenta@society.com', password: 'password123', role: 'Resident', expectedUrl: '/resident' },
  { email: 'staff@society.com', password: 'password123', role: 'SecurityStaff', expectedUrl: '/staff' }
];

async function testLogins() {
  for (const user of users) {
    await new Promise((resolve) => {
      const data = JSON.stringify({ email: user.email, password: user.password });
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          console.log(`\nTesting ${user.email}:`);
          console.log(`Status Code: ${res.statusCode}`);
          const json = JSON.parse(body);
          console.log(`Success: ${json.success}`);
          console.log(`Token received: ${!!json.token}`);
          console.log(`Role in response: ${json.user?.role}`);
          resolve();
        });
      });

      req.on('error', error => {
        console.error(`Error logging in ${user.email}:`, error);
        resolve();
      });

      req.write(data);
      req.end();
    });
  }
}

testLogins();
