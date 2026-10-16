const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
  createFinanceRecord, 
  updateFinanceRecord,
  deleteFinanceRecord,
  getAdminFinance, 
  getFinanceSummary, 
  getPublicSummary,
  getSocietyTransparency
} = require('../controllers/financeController');

const router = express.Router();

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

// Safe middleware for receipt upload supporting both multipart/form-data and application/json
const uploadReceipt = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.single('receipt')(req, res, next);
  }
  next();
};

// Resident & Admin Society Expense Transparency (Strictly society members, SecurityStaff rejected)
router.get('/transparency', requireRoles('Resident', 'Admin'), getSocietyTransparency);
router.get('/public-summary', requireRoles('Resident', 'Admin'), getPublicSummary);

// Admin Routes (Admin role required)
router.get('/admin/summary', requireRoles('Admin'), getFinanceSummary);
router.post('/admin', requireRoles('Admin'), uploadReceipt, createFinanceRecord);
router.patch('/admin/:id', requireRoles('Admin'), uploadReceipt, updateFinanceRecord);
router.delete('/admin/:id', requireRoles('Admin'), deleteFinanceRecord);
router.get('/admin', requireRoles('Admin'), getAdminFinance);
router.get('/admin/ledger', requireRoles('Admin'), getAdminFinance);

module.exports = router;
