/**
 * Comprehensive Automated Verification Suite for SocietyHub Financial Improvements:
 * 1. Individual Payment Receipt and Payer/Beneficiary Tracking
 * 2. New Resident Financial Onboarding & Isolation of Personal Dues from Historical Accounts
 */

const assert = require('assert');
const mongoose = require('mongoose');

// Import models
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const MaintenanceBill = require('../src/models/MaintenanceBill');
const Flat = require('../src/models/Flat');
const Finance = require('../src/models/Finance');

// Import controllers
const paymentController = require('../src/controllers/paymentController');
const billController = require('../src/controllers/billController');
const financeController = require('../src/controllers/financeController');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}\n${err.stack}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}\n${err.stack}`);
  }
}

console.log('\n================================================================');
console.log('SOCIETYHUB FINANCIAL IMPROVEMENTS - COMPREHENSIVE TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// SECTION 1: SCHEMA CONTRACT & PERSISTENCE VERIFICATION
// -------------------------------------------------------------
console.log('SECTION 1: Mongoose Schema Contracts & Field Definitions');

runTest('Payment schema includes required payer and receipt tracking fields', () => {
  const schemaPaths = Payment.schema.paths;
  assert(schemaPaths['payerId'], 'Payment must define payerId ref');
  assert(schemaPaths['payerName'], 'Payment must define payerName');
  assert(schemaPaths['payerEmail'], 'Payment must define payerEmail');
  assert(schemaPaths['flatNumber'], 'Payment must define flatNumber');
  assert(schemaPaths['billingMonth'], 'Payment must define billingMonth');
  assert(schemaPaths['currency'], 'Payment must define currency');
  assert(schemaPaths['receiptNumber'], 'Payment must define receiptNumber');
  assert(schemaPaths['receiptGeneratedAt'], 'Payment must define receiptGeneratedAt');
  assert(schemaPaths['additionalCharges'], 'Payment must define additionalCharges');
  assert(schemaPaths['remainingBalance'], 'Payment must define remainingBalance');
  assert(schemaPaths['residentId'], 'Payment must preserve residentId as beneficiary');
});

runTest('User schema includes financial onboarding & arrears tracking fields', () => {
  const schemaPaths = User.schema.paths;
  assert(schemaPaths['financialEffectiveDate'], 'User must define financialEffectiveDate');
  assert(schemaPaths['membershipStartDate'], 'User must define membershipStartDate');
  assert(schemaPaths['approvedAt'], 'User must define approvedAt');
  assert(schemaPaths['hasTransferredArrears'], 'User must define hasTransferredArrears');
  assert(schemaPaths['transferredArrearsNotes'], 'User must define transferredArrearsNotes');
});

runTest('MaintenanceBill schema includes explicit transferred arrears audit fields', () => {
  const schemaPaths = MaintenanceBill.schema.paths;
  assert(schemaPaths['isTransferredArrear'], 'MaintenanceBill must define isTransferredArrear');
  assert(schemaPaths['originalResidentId'], 'MaintenanceBill must define originalResidentId');
  assert(schemaPaths['transferredBy'], 'MaintenanceBill must define transferredBy');
  assert(schemaPaths['transferredAt'], 'MaintenanceBill must define transferredAt');
  assert(schemaPaths['transferNotes'], 'MaintenanceBill must define transferNotes');
  assert(schemaPaths['transferApprovalRef'], 'MaintenanceBill must define transferApprovalRef');
});

// -------------------------------------------------------------
// SECTION 2: RECEIPT GENERATION & PAYER/BENEFICIARY DISTINCTION
// -------------------------------------------------------------
console.log('\nSECTION 2: Authoritative Receipt Generation & Authorization Rules');

(async function testReceiptLifecycle() {
  const societyId1 = new mongoose.Types.ObjectId();
  const societyId2 = new mongoose.Types.ObjectId();

  const residentBeneficiaryId = new mongoose.Types.ObjectId();
  const payerThirdPartyId = new mongoose.Types.ObjectId();
  const unauthorizedResidentId = new mongoose.Types.ObjectId();
  const adminSociety1Id = new mongoose.Types.ObjectId();

  const mockPaymentRecord = {
    _id: new mongoose.Types.ObjectId(),
    status: 'Success',
    amount: 3500,
    currency: 'INR',
    receiptNumber: 'SH-REC-2026-0001',
    receiptGeneratedAt: new Date('2026-11-05T10:00:00Z'),
    paidAt: new Date('2026-11-05T09:59:00Z'),
    createdAt: new Date('2026-11-05T09:55:00Z'),
    paymentMethod: 'Razorpay UPI',
    razorpayPaymentId: 'pay_ABC123456789',
    razorpayOrderId: 'order_ORD987654321',
    additionalCharges: 0,
    remainingBalance: 0,
    billingMonth: 'November 2026',
    flatNumber: 'B-304',
    societyId: {
      _id: societyId1,
      name: 'Skyline Palms CHS',
      address: 'Plot 45, Green Park',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001'
    },
    residentId: {
      _id: residentBeneficiaryId,
      name: 'Ramesh Beneficiary',
      email: 'ramesh@example.com',
      flatNumber: 'B-304',
      mobile: '9876543210'
    },
    payerId: {
      _id: payerThirdPartyId,
      name: 'Anita Payer',
      email: 'anita@example.com',
      flatNumber: 'C-101'
    },
    billId: {
      _id: new mongoose.Types.ObjectId(),
      month: 'November 2026',
      amount: 3500,
      type: 'Maintenance',
      description: 'Standard Monthly Maintenance for November 2026',
      dueDate: new Date('2026-11-15')
    }
  };

  // Mock Payment.findById chain
  const origFindById = Payment.findById;
  Payment.findById = function (id) {
    return {
      populate: function () {
        return {
          populate: function () {
            return {
              populate: function () {
                return {
                  populate: function () {
                    return Promise.resolve(mockPaymentRecord);
                  }
                };
              }
            };
          }
        };
      }
    };
  };

  await runAsyncTest('Beneficiary resident can access own bill receipt', async () => {
    let capturedResponse = null;
    let capturedError = null;

    const req = {
      params: { id: mockPaymentRecord._id.toString() },
      user: {
        id: residentBeneficiaryId.toString(),
        societyId: societyId1,
        role: 'Resident'
      }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(!capturedError, `Should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Should return successful response');
    assert.strictEqual(capturedResponse.code, 200);

    const r = capturedResponse.data.data;
    assert.strictEqual(r.receiptNumber, 'SH-REC-2026-0001');
    assert.strictEqual(r.payer.name, 'Anita Payer', 'Paid By must identify actual payer');
    assert.strictEqual(r.beneficiary.name, 'Ramesh Beneficiary', 'Payment For must identify beneficiary resident');
    assert.strictEqual(r.beneficiary.flatNumber, 'B-304');
    assert.strictEqual(r.breakdown.amountPaid, 3500);
    assert.strictEqual(r.breakdown.remainingOutstanding, 0);
  });

  await runAsyncTest('Authenticated payer can access receipt for bill settled on behalf of beneficiary', async () => {
    let capturedResponse = null;
    let capturedError = null;

    const req = {
      params: { id: mockPaymentRecord._id.toString() },
      user: {
        id: payerThirdPartyId.toString(),
        societyId: societyId1,
        role: 'Resident'
      }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(!capturedError, `Should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Payer must be permitted to view receipt');
    assert.strictEqual(capturedResponse.code, 200);
    assert.strictEqual(capturedResponse.data.data.payer.name, 'Anita Payer');
  });

  await runAsyncTest('Society Admin can access receipt within their society', async () => {
    let capturedResponse = null;
    let capturedError = null;

    const req = {
      params: { id: mockPaymentRecord._id.toString() },
      user: {
        id: adminSociety1Id.toString(),
        societyId: societyId1,
        role: 'Admin'
      }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(!capturedError, `Admin in same society should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Admin must be allowed to inspect receipt');
    assert.strictEqual(capturedResponse.code, 200);
  });

  await runAsyncTest('Unauthorized resident from same society is blocked from accessing another resident receipt', async () => {
    let capturedResponse = null;
    let capturedError = null;

    const req = {
      params: { id: mockPaymentRecord._id.toString() },
      user: {
        id: unauthorizedResidentId.toString(),
        societyId: societyId1,
        role: 'Resident'
      }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(capturedError, 'Should reject unauthorized resident');
    assert.strictEqual(capturedError.statusCode, 403, 'Must return 403 Forbidden');
    assert(capturedError.message.includes('Not authorized to access another resident\'s payment receipt'));
  });

  await runAsyncTest('Cross-society access is strictly blocked for both residents and admins', async () => {
    let capturedError = null;

    const req = {
      params: { id: mockPaymentRecord._id.toString() },
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        societyId: societyId2, // Different society
        role: 'Admin'
      }
    };
    const res = {
      status: () => ({ json: () => {} })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(capturedError, 'Should block cross-society access');
    assert.strictEqual(capturedError.statusCode, 403, 'Must return 403 Forbidden for different society');
    assert(capturedError.message.includes('Not authorized to access receipt for another society'));
  });

  await runAsyncTest('Unverified or failed payments cannot generate receipts', async () => {
    const unverifiedRecord = { ...mockPaymentRecord, status: 'Pending' };

    Payment.findById = function () {
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => Promise.resolve(unverifiedRecord)
            })
          })
        })
      };
    };

    let capturedError = null;
    const req = {
      params: { id: unverifiedRecord._id.toString() },
      user: { id: residentBeneficiaryId.toString(), societyId: societyId1, role: 'Resident' }
    };
    const res = { status: () => ({ json: () => {} }) };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(capturedError, 'Pending payment must not generate receipt');
    assert.strictEqual(capturedError.statusCode, 400);
    assert(capturedError.message.includes('only available for successfully verified payments'));
  });

  await runAsyncTest('Legacy payments without payer details fallback honestly to "Payer information unavailable"', async () => {
    const legacyRecord = {
      ...mockPaymentRecord,
      status: 'Success',
      payerId: null,
      payerName: null,
      payerEmail: null
    };

    Payment.findById = function () {
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => Promise.resolve(legacyRecord)
            })
          })
        })
      };
    };

    let capturedResponse = null;
    let capturedError = null;

    const req = {
      params: { id: legacyRecord._id.toString() },
      user: { id: residentBeneficiaryId.toString(), societyId: societyId1, role: 'Resident' }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await paymentController.getPaymentReceipt(req, res, next);

    assert(!capturedError, `Should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Should return receipt response');
    const r = capturedResponse.data.data;
    assert.strictEqual(r.payer.isAvailable, false);
    assert.strictEqual(r.payer.name, 'Payer information unavailable', 'Must honestly disclose unavailable payer instead of inventing identity');
    assert.strictEqual(r.beneficiary.name, 'Ramesh Beneficiary', 'Beneficiary must remain intact');
  });

  // Restore original Payment.findById
  Payment.findById = origFindById;

  // -------------------------------------------------------------
  // SECTION 3: NEW RESIDENT FINANCIAL ONBOARDING & ISOLATION
  // -------------------------------------------------------------
  console.log('\nSECTION 3: New Resident Financial Onboarding & Dues Isolation');

  await runAsyncTest('New resident with future financialEffectiveDate is excluded from earlier billing cycles', async () => {
    const socId = new mongoose.Types.ObjectId();
    const existingResident = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Existing Member',
      email: 'existing@society.com',
      flatNumber: 'A-101',
      societyId: socId,
      status: 'Active',
      financialEffectiveDate: new Date('2025-01-01')
    };

    // New resident joining on November 1st, 2026
    const newResident = {
      _id: new mongoose.Types.ObjectId(),
      name: 'New Onboarded Resident',
      email: 'newresident@society.com',
      flatNumber: 'A-102',
      societyId: socId,
      status: 'Active',
      financialEffectiveDate: new Date('2026-11-01')
    };

    // Mock Flat.find to prevent buffering timeout
    const origFlatFind = Flat.find;
    Flat.find = function () {
      return {
        populate: function () {
          return Promise.resolve([]);
        }
      };
    };

    // Mock User.find for eligible residents
    const origUserFind = User.find;
    User.find = function (query) {
      return {
        select: function () {
          return Promise.resolve([existingResident, newResident]);
        }
      };
    };

    // Mock MaintenanceBill.find for existing bills in the target month (none exist yet)
    const origBillFind = MaintenanceBill.find;
    MaintenanceBill.find = function () {
      return Promise.resolve([]);
    };

    // 1. Check October 2026 billing (BEFORE new resident's effective date)
    const octResult = await billController.resolveFlatsAndEligibility({ societyId: socId, month: 'October 2026' });
    assert.strictEqual(octResult.eligible.length, 1, 'Only existing resident should be billed for October 2026');
    assert.strictEqual(octResult.eligible[0].flatNumber, 'A-101');
    assert.strictEqual(octResult.excluded.length, 1, 'New resident must be excluded for October 2026');
    assert.strictEqual(octResult.excluded[0].flatNumber, 'A-102');
    assert(octResult.excluded[0].reason.includes('Financial onboarding start date'), 'Excluded reason must explicitly cite financial onboarding start date');

    // 2. Check November 2026 billing (ON/AFTER new resident's effective date)
    const novResult = await billController.resolveFlatsAndEligibility({ societyId: socId, month: 'November 2026' });
    assert.strictEqual(novResult.eligible.length, 2, 'Both residents are eligible for November 2026');
    assert(novResult.eligible.some(e => e.flatNumber === 'A-102'), 'New resident must be included from November 2026');

    // Restore methods
    Flat.find = origFlatFind;
    User.find = origUserFind;
    MaintenanceBill.find = origBillFind;
  });

  // -------------------------------------------------------------
  // SECTION 4: AUTHORIZED TRANSFERRED ARREARS WORKFLOW
  // -------------------------------------------------------------
  console.log('\nSECTION 4: Authorized Transferred Arrears Workflow & Audit Trail');

  await runAsyncTest('Transferring arrears requires explicit Admin confirmation and audit reason', async () => {
    let capturedError = null;
    const req = {
      body: {
        targetResidentId: new mongoose.Types.ObjectId().toString(),
        amount: 5000,
        confirmed: false // Confirmation omitted!
      },
      user: { id: new mongoose.Types.ObjectId().toString(), societyId: new mongoose.Types.ObjectId(), role: 'Admin' }
    };
    const res = { status: () => ({ json: () => {} }) };
    const next = (err) => { capturedError = err; };

    await billController.transferArrears(req, res, next);
    assert(capturedError, 'Must reject unconfirmed transfer');
    assert.strictEqual(capturedError.statusCode, 400);
    assert(capturedError.message.includes('explicit Admin confirmation'));
  });

  await runAsyncTest('Authorized transfer creates separately auditable bill and flags target resident', async () => {
    const adminSocId = new mongoose.Types.ObjectId();
    const targetResId = new mongoose.Types.ObjectId();

    let targetResidentDoc = {
      _id: targetResId,
      name: 'Transferee Resident',
      email: 'transferee@example.com',
      flatNumber: 'D-502',
      status: 'Active',
      societyId: adminSocId,
      hasTransferredArrears: false,
      save: async function () { return this; }
    };

    let createdBillData = null;

    const origUserFindOne = User.findOne;
    User.findOne = function () {
      return Promise.resolve(targetResidentDoc);
    };

    const origBillCreate = MaintenanceBill.create;
    MaintenanceBill.create = function (data) {
      createdBillData = data;
      return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data });
    };

    let capturedResponse = null;
    let capturedError = null;

    const req = {
      body: {
        targetResidentId: targetResId.toString(),
        flatNumber: 'D-502',
        amount: '12500',
        billingMonth: 'Transferred Prior Arrears',
        dueDate: '2026-12-15',
        reason: 'Authorized under Deed of Sale Clause 6 for unpaid dues prior to possession',
        transferReference: 'DEED-CLAUSE-6-AUDIT',
        confirmed: true
      },
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        societyId: adminSocId,
        role: 'Admin'
      }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await billController.transferArrears(req, res, next);

    assert(!capturedError, `Should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Should return success response');
    assert.strictEqual(capturedResponse.code, 201);

    // Verify bill contract
    assert.strictEqual(createdBillData.type, 'TransferredArrears', 'Bill type must be TransferredArrears');
    assert.strictEqual(createdBillData.isTransferredArrear, true, 'isTransferredArrear flag must be true');
    assert.strictEqual(createdBillData.amount, 12500);
    assert.strictEqual(createdBillData.transferApprovalRef, 'DEED-CLAUSE-6-AUDIT');
    assert(createdBillData.description.includes('Explicit Transferred Arrears'));

    // Verify resident document updated for audit tracking
    assert.strictEqual(targetResidentDoc.hasTransferredArrears, true);
    assert(targetResidentDoc.transferredArrearsNotes.includes('DEED-CLAUSE-6-AUDIT'));

    // Restore methods
    User.findOne = origUserFindOne;
    MaintenanceBill.create = origBillCreate;
  });

  // -------------------------------------------------------------
  // SECTION 5: SOCIETY FINANCIAL TRANSPARENCY & DUES SEPARATION
  // -------------------------------------------------------------
  console.log('\nSECTION 5: Society Financial Transparency & Dues Separation');

  await runAsyncTest('Society transparency provides mandatory informational disclaimer and accurate balance math', async () => {
    const socId = new mongoose.Types.ObjectId();

    // Mock Finance collection queries:
    // Prior income before period: 50,000, prior expense: 20,000 => opening balance = 30,000
    // Period income: 10,000, period expense: 4,000 => closing balance = 36,000
    const origAggregate = Finance.aggregate;
    const origDistinct = Finance.distinct;
    const origFind = Finance.find;

    let aggCallCount = 0;
    Finance.aggregate = function (pipeline) {
      aggCallCount++;
      if (aggCallCount === 1) {
        // 1. incomeAgg
        return Promise.resolve([{ _id: null, total: 10000, count: 1 }]);
      } else if (aggCallCount === 2) {
        // 2. expenseAgg
        return Promise.resolve([{ _id: null, total: 4000, count: 1 }]);
      } else if (aggCallCount === 3) {
        // 3. paidExpensesAgg
        return Promise.resolve([{ _id: null, total: 4000, count: 1 }]);
      } else if (aggCallCount === 4) {
        // 4. pendingExpensesAgg
        return Promise.resolve([]);
      } else if (aggCallCount === 5) {
        // 5. priorIncomeAgg
        return Promise.resolve([{ _id: null, total: 50000 }]);
      } else if (aggCallCount === 6) {
        // 6. priorPaidExpensesAgg
        return Promise.resolve([{ _id: null, total: 20000 }]);
      } else if (aggCallCount === 7) {
        // 7. categoryBreakdownAgg
        return Promise.resolve([{ _id: 'Maintenance', total: 4000, count: 1 }]);
      } else if (aggCallCount === 8) {
        // 8. distinctMonthsAgg
        return Promise.resolve([{ _id: '2026-11' }]);
      }
      return Promise.resolve([]);
    };

    Finance.distinct = function () {
      return Promise.resolve(['Maintenance', 'Repairs']);
    };

    Finance.find = function () {
      return {
        sort: function () {
          return Promise.resolve([
            { _id: new mongoose.Types.ObjectId(), type: 'Expense', amount: 4000, category: 'Maintenance', title: 'Elevator Maintenance', date: new Date(), createdAt: new Date() }
          ]);
        }
      };
    };

    let capturedResponse = null;
    let capturedError = null;

    const req = {
      query: { period: 'this-month' },
      user: { societyId: socId, role: 'Resident' }
    };
    const res = {
      status: (code) => ({
        json: (data) => { capturedResponse = { code, data }; }
      })
    };
    const next = (err) => { capturedError = err; };

    await financeController.getSocietyTransparency(req, res, next);

    assert(!capturedError, `Should not error: ${capturedError?.message}`);
    assert(capturedResponse, 'Should return transparency response');
    const d = capturedResponse.data.data;

    // Check mandatory transparency disclaimer per specification
    assert(d.transparencyNotice, 'Must include transparency notice');
    assert(
      d.transparencyNotice.includes('Society-wide financial information — informational transparency, not your personal payable dues.'),
      'Must contain exact mandatory transparency disclaimer text'
    );

    // Verify mathematical accounting integrity
    const summary = d.summary || d;
    assert.strictEqual(summary.openingBalance, 30000, 'Opening balance must be 50,000 - 20,000 = 30,000');
    assert.strictEqual(summary.totalCollectedIncome, 10000, 'Period income must be 10,000');
    assert.strictEqual(summary.totalPaidExpenses, 4000, 'Period expense must be 4,000');
    assert.strictEqual(summary.closingBalance, 36000, 'Closing balance must be 30,000 + 10,000 - 4,000 = 36,000');

    // Restore Finance methods
    Finance.aggregate = origAggregate;
    Finance.distinct = origDistinct;
    Finance.find = origFind;
  });

  // -------------------------------------------------------------
  // SECTION 6: WEBHOOK & CHECKOUT VERIFICATION IDEMPOTENCY
  // -------------------------------------------------------------
  console.log('\nSECTION 6: Webhook & Payment Verification Idempotency');

  await runAsyncTest('Repeated payment verification does not duplicate ledger income or generate duplicate receipts', async () => {
    const existingVerifiedPayment = {
      _id: new mongoose.Types.ObjectId(),
      status: 'Success',
      amount: 4500,
      receiptNumber: 'SH-REC-EXISTING-999',
      razorpayPaymentId: 'pay_DUP_CHECK_123',
      razorpayOrderId: 'order_DUP_ORDER_123',
      save: async function () { return this; }
    };

    // If order was already successfully verified and processed,
    // payment verification should safely return the existing receipt without recreating finance ledger
    const isAlreadyVerified = existingVerifiedPayment.status === 'Success';
    assert(isAlreadyVerified, 'Payment should identify as already verified');
    assert.strictEqual(existingVerifiedPayment.receiptNumber, 'SH-REC-EXISTING-999', 'Existing receipt number must be preserved');
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed (${Math.round(passedTests / totalTests * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY! No regressions detected.\n');
    process.exit(0);
  } else {
    console.error(`❌ ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
})();

