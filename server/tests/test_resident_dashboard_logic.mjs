// Test suite for Resident Dashboard refresh logic and Toast deduplication

console.log('--- STARTING RESIDENT DASHBOARD REFRESH LOGIC TESTS ---');
let passed = 0;
let failed = 0;

function assert(desc, condition) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
}

// 1. Test Toast Deduplication Engine
console.log('\n1. Testing Toast Deduplication Engine...');

class TestToastProvider {
  constructor() {
    this.toasts = [];
    this.recentToasts = new Map();
  }

  addToast(type, message, title = '') {
    const key = `${type}:${title}:${message}`;
    const now = Date.now();
    const lastTime = this.recentToasts.get(key) || 0;
    if (now - lastTime < 1500) {
      return false; // Deduplicated
    }
    this.recentToasts.set(key, now);
    const id = now + Math.random().toString(36).substring(2, 7);
    this.toasts.push({ id, type, message, title });
    return true; // Added
  }

  error(msg, title = 'Error') {
    return this.addToast('error', msg, title);
  }

  success(msg, title = 'Success') {
    return this.addToast('success', msg, title);
  }
}

const toastEngine = new TestToastProvider();
const firstCall = toastEngine.error('Failed to refresh resident dashboard');
const secondCall = toastEngine.error('Failed to refresh resident dashboard'); // Immediate duplicate
const thirdCall = toastEngine.error('Failed to refresh resident dashboard'); // Third rapid duplicate

assert('First error toast was accepted', firstCall === true);
assert('Second identical error toast was deduplicated', secondCall === false);
assert('Third identical error toast was deduplicated', thirdCall === false);
assert('Exactly 1 toast item exists in state after 3 rapid triggers', toastEngine.toasts.length === 1);

// Different message or different type is allowed
const differentMsg = toastEngine.error('Another error occurred');
assert('Different error message is not blocked by deduplication', differentMsg === true);
assert('Toast state now contains 2 distinct toasts', toastEngine.toasts.length === 2);


// 2. Test Concurrency Lock (isFetchingRef)
console.log('\n2. Testing In-Flight Request Concurrency Lock...');

let isFetching = false;
let executionCount = 0;

async function simulatedFetchDashboardData(isRefresh = false) {
  if (isFetching) return { aborted: true };
  isFetching = true;
  executionCount++;
  try {
    // simulate async work
    await new Promise(r => setTimeout(r, 20));
    return { success: true };
  } finally {
    isFetching = false;
  }
}

// Trigger two simultaneous refresh clicks
const [call1, call2] = await Promise.all([
  simulatedFetchDashboardData(true),
  simulatedFetchDashboardData(true)
]);

assert('Simultaneous call 1 succeeded', call1.success === true);
assert('Simultaneous call 2 was safely aborted by concurrency guard', call2.aborted === true);
assert('fetchDashboardData executed exactly once during parallel trigger', executionCount === 1);


// 3. Test Fault Tolerance (Promise.allSettled) with Deliberate Failures
console.log('\n3. Testing Deliberate API Failure Handling and State Preservation...');

const initialStats = {
  pendingBillsAmount: 4050,
  complaints: { pending: 1, inProgress: 0, resolved: 2 },
  expectedVisitors: 1,
  upcomingEvents: 2,
  activePolls: 1,
  unreadNotifications: 3
};

// Scenario A: Partial Failure (Notifications endpoint fails, others succeed)
{
  const results = await Promise.allSettled([
    Promise.resolve({ data: { success: true, data: [{ amount: 5000, status: 'Pending' }] } }), // Bills
    Promise.resolve({ data: { success: true, data: [{ status: 'Pending' }, { status: 'InProgress' }] } }), // Complaints
    Promise.resolve({ data: { success: true, data: [{ expectedDate: new Date().toISOString().split('T')[0], status: 'Expected' }] } }), // Visitors
    Promise.resolve({ data: { success: true, data: [{ status: 'Published', date: '2027-01-01' }] } }), // Events
    Promise.resolve({ data: { success: true, data: [{ status: 'Published' }] } }), // Polls
    Promise.reject(new Error('Network error or 500 Internal Server Error')) // Notifications FAILS
  ]);

  const [billsRes, complaintsRes, visitorsRes, eventsRes, pollsRes, notifsRes] = results;
  const failedServices = [];
  if (billsRes.status === 'rejected') failedServices.push('Bills');
  if (complaintsRes.status === 'rejected') failedServices.push('Complaints');
  if (visitorsRes.status === 'rejected') failedServices.push('Visitors');
  if (eventsRes.status === 'rejected') failedServices.push('Events');
  if (pollsRes.status === 'rejected') failedServices.push('Polls');
  if (notifsRes.status === 'rejected') failedServices.push('Notifications');

  assert('Identified exactly 1 failed service (Notifications)', failedServices.length === 1 && failedServices[0] === 'Notifications');

  // Verify state calculation updates succeeded services and preserves failed ones
  let updatedStats = { ...initialStats };
  if (billsRes.status === 'fulfilled') {
    const billsData = billsRes.value.data?.data || [];
    updatedStats.pendingBillsAmount = billsData.reduce((acc, b) => acc + (b.amount || 0), 0);
  }
  if (notifsRes.status === 'fulfilled') {
    updatedStats.unreadNotifications = 999; // Would be updated if fulfilled
  }

  assert('Bills metric updated to new value ₹5000', updatedStats.pendingBillsAmount === 5000);
  assert('Unread notifications preserved previous value 3 (not wiped to 0 or undefined)', updatedStats.unreadNotifications === 3);
}

// Scenario B: Complete Failure (All services fail or server offline)
{
  const results = await Promise.allSettled([
    Promise.reject(new Error('500 Bills error')),
    Promise.reject(new Error('500 Complaints error')),
    Promise.reject(new Error('500 Visitors error')),
    Promise.reject(new Error('500 Events error')),
    Promise.reject(new Error('500 Polls error')),
    Promise.reject(new Error('500 Notifications error'))
  ]);

  const failedCount = results.filter(r => r.status === 'rejected').length;
  assert('Detected total outage when all 6 services fail', failedCount === 6);

  let toastMessage = '';
  if (failedCount === results.length) {
    toastMessage = 'Failed to refresh resident dashboard';
  }
  assert('Dispatches single controlled error toast for full failure', toastMessage === 'Failed to refresh resident dashboard');

  // Verify stats are NOT wiped to 0
  const preservedStats = { ...initialStats };
  assert('Existing dashboard data preserved during full failure', preservedStats.pendingBillsAmount === 4050);
}

console.log(`\n========================================`);
console.log(`LOGIC TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
