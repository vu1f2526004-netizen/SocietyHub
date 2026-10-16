const express = require('express');
const upload = require('../middleware/upload');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createIssue,
  getIssues,
  adminUpdateIssue,
  staffUpdateIssue,
  getAnalytics
} = require('../controllers/issueController');

const router = express.Router();
router.use(verifyToken);

router.get('/analytics', requireRoles('Admin'), getAnalytics);

router.route('/')
  .post(requireRoles('Resident'), upload.single('photo'), createIssue)
  .get(getIssues); // Admin gets all, Resident gets approved

router.patch('/admin/:id', requireRoles('Admin'), adminUpdateIssue);
router.patch('/staff/:id', requireRoles('SecurityStaff'), upload.single('staffEvidence'), staffUpdateIssue);

module.exports = router;
