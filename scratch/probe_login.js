async function probe() {
  console.log('Probing login endpoint...');
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@society.com', password: 'password123' })
    });
    console.log('Login status:', res.status);
    const data = await res.json();
    console.log('Login data:', data.success, data.user?.role);
  } catch (err) {
    console.error('Probe error:', err.message);
  }
}
probe();
