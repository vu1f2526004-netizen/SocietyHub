const express = require('express');
const upload = require('../middleware/upload');
const { verifyToken, requireRoles, requireSociety } = require('../middleware/auth');
const {
  createIssue,
  getIssues,
  adminUpdateIssue,
  staffUpdateIssue,
  getAnalytics
} = require('../controllers/issueController');

const router = express.Router();
router.use(verifyToken);
router.use(requireSociety);

router.get('/analytics', requireRoles('Admin'), getAnalytics);

router.route('/')
  .post(requireRoles('Resident', 'SecurityStaff', 'Admin'), upload.single('photo'), createIssue)
  .get(requireRoles('Resident', 'SecurityStaff', 'Admin'), getIssues);

router.patch('/admin/:id', requireRoles('Admin'), adminUpdateIssue);
router.patch('/staff/:id', requireRoles('SecurityStaff'), upload.single('staffEvidence'), staffUpdateIssue);

module.exports = router;
