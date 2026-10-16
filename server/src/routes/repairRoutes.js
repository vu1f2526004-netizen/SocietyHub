const express = require('express');
const upload = require('../middleware/upload');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createRepair,
  createFromComplaint,
  getAdminRepairs,
  getStaffRepairs,
  getRepair,
  staffUpdateRepair,
  adminCloseRepair
} = require('../controllers/repairController');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res, next) => {
  if (req.user.role === 'Admin') return getAdminRepairs(req, res, next);
  if (req.user.role === 'SecurityStaff') return getStaffRepairs(req, res, next);
  next();
});
router.post('/admin', requireRoles('Admin'), createRepair);
router.post('/admin/from-complaint/:complaintId', requireRoles('Admin'), createFromComplaint);
router.get('/admin', requireRoles('Admin'), getAdminRepairs);
router.get('/staff', requireRoles('SecurityStaff'), getStaffRepairs);
router.get('/:id', requireRoles('Admin', 'SecurityStaff'), getRepair);
router.patch('/staff/:id/status', requireRoles('SecurityStaff'), upload.single('completionPhoto'), staffUpdateRepair);
router.patch('/admin/:id/close', requireRoles('Admin'), adminCloseRepair);

module.exports = router;
