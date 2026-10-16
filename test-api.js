// Using native fetch in node 25
const { Blob } = require('buffer');

async function runTests() {
  const url = 'http://localhost:5000/api';
  console.log('--- TESTING APIS ---\n');

  try {
    // Login to get tokens
    const adminLogin = await (await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@society.com', password: 'password123' }) })).json();
    const resLogin = await (await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'residenta@society.com', password: 'password123' }) })).json();
    const staffLogin = await (await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'staff@society.com', password: 'password123' }) })).json();

    const adminToken = adminLogin.token;
    const resToken = resLogin.token;
    const staffToken = staffLogin.token;

    // --- PHASE 2: COMPLAINTS & SECURITY ---
    console.log('\n--- Complaints & Repairs ---');
    const comp1 = await (await fetch(`${url}/complaints`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Plumbing', title: 'Leaky Pipe', description: 'Under sink', location: 'Kitchen' })
    })).json();
    console.log('Resident creates complaint:', comp1.success);
    const compId = comp1.data?._id;

    // Admin assigns staff
    const assignRes = await (await fetch(`${url}/complaints/admin/${compId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress', assignedTo: staffLogin.user.id })
    })).json();
    console.log('Admin assigns to staff:', assignRes.data?.assignedTo === staffLogin.user.id);

    // Staff completes
    const staffFinish = await (await fetch(`${url}/complaints/staff/${compId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Completed', staffNotes: 'Fixed pipe' })
    })).json();
    console.log('Staff completes repair:', staffFinish.data?.status === 'Completed');

    // Resident B tries to view Resident A's complaint (Isolation check)
    const resBLogin = await (await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'residentb@society.com', password: 'password123' }) })).json();
    const privCheck = await (await fetch(`${url}/complaints/${compId}`, { headers: { 'Authorization': `Bearer ${resBLogin.token}` } })).json();
    console.log('Resident B isolated from A\'s complaint:', privCheck.success === false);

    // --- PHASE 3: VISITORS ---
    console.log('\n--- Visitor Management ---');
    const visReq = await (await fetch(`${url}/visitors`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Amazon Delivery', mobile: '9999999999', expectedDate: '2026-10-10', purpose: 'Delivery' })
    })).json();
    console.log('Visitor expected:', visReq.success);
    const visId = visReq.data?._id;

    const gateUpdate = await (await fetch(`${url}/visitors/${visId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Entered' })
    })).json();
    console.log('Gate allows entry:', gateUpdate.data?.status === 'Entered');

    // --- NOTIFICATIONS ---
    console.log('\n--- Notifications ---');
    const notifs = await (await fetch(`${url}/notifications`, { headers: { 'Authorization': `Bearer ${resToken}` } })).json();
    console.log('Resident notifications generated:', notifs.data?.length > 0);

    // --- PHASE 4: BILLING & PAYMENTS ---
    console.log('\n--- Billing & Payments ---');
    console.log('1. Admin generates Maintenance Bill...');
    const createBill = await (await fetch(`${url}/bills/admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentId: resLogin.user.id, amount: 2500, dueDate: '2026-10-15', month: 'October 2026', type: 'Maintenance' })
    })).json();
    console.log('Bill created:', createBill.success);
    const billId = createBill.data?._id;

    // --- PHASE 5: EVENTS & VOTING ---
    console.log('\n--- Society Events ---');
    console.log('1. Admin creates event...');
    const createEv = await (await fetch(`${url}/events/admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Diwali Party', description: 'Fun!', date: '2026-11-01', startTime: '18:00', endTime: '22:00', location: 'Clubhouse', capacity: 2, status: 'Published' })
    })).json();
    console.log('Event created:', createEv.success);
    const evId = createEv.data?._id;

    console.log('2. Resident RSVPs...');
    const rsvp1 = await (await fetch(`${url}/events/${evId}/rsvp`, { method: 'POST', headers: { 'Authorization': `Bearer ${resToken}` } })).json();
    console.log('Resident A RSVP successful:', rsvp1.success);

    console.log('3. Resident tries duplicate RSVP...');
    const rsvp2 = await (await fetch(`${url}/events/${evId}/rsvp`, { method: 'POST', headers: { 'Authorization': `Bearer ${resToken}` } })).json();
    console.log('Duplicate RSVP blocked:', rsvp2.success === false && rsvp2.error === 'Already RSVPd');

    console.log('\n--- Society Voting ---');
    console.log('1. Admin creates poll...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const createPoll = await (await fetch(`${url}/polls/admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Paint color?', options: [{ text: 'Red' }, { text: 'Blue' }], openingDate: new Date(), closingDate: futureDate, status: 'Active' })
    })).json();
    console.log('Poll created:', createPoll.success);
    const pollId = createPoll.data?._id;
    const optId = createPoll.data?.options[0]._id;

    console.log('2. Resident casts vote...');
    const vote1 = await (await fetch(`${url}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: optId })
    })).json();
    console.log('Vote cast successful:', vote1.success);

    console.log('3. Resident tries duplicate vote...');
    const vote2 = await (await fetch(`${url}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: optId })
    })).json();
    console.log('Duplicate vote blocked:', vote2.success === false && vote2.error === 'Already voted');

    console.log('4. Admin publishes poll result...');
    const pubPoll = await (await fetch(`${url}/polls/admin/${pollId}/publish-result`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'Red wins' })
    })).json();
    console.log('Poll published:', pubPoll.data?.status === 'Published');

    console.log('\nTests complete.');
  } catch (err) {
    console.error('Test Error:', err);
  }
}

runTests();
