const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createBill,
  getMyBills,
  getAdminBills,
  getBill,
  updateBill,
  deleteBill,
  previewBulkMonthlyBills,
  generateBulkMonthlyBills
} = require('../controllers/billController');

const router = express.Router();
router.use(verifyToken);

router.post('/admin/bulk-preview', requireRoles('Admin'), previewBulkMonthlyBills);
router.post('/admin/bulk-generate', requireRoles('Admin'), generateBulkMonthlyBills);
router.post('/admin', requireRoles('Admin'), createBill);
router.get('/my', requireRoles('Resident'), getMyBills);
router.get('/admin', requireRoles('Admin'), getAdminBills);
router.route('/:id')
  .get(getBill) // Auth check in controller
  .patch(requireRoles('Admin'), updateBill)
  .delete(requireRoles('Admin'), deleteBill);

module.exports = router;
