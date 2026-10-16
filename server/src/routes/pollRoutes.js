const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { createPoll, updatePoll, getPolls, getPoll, votePoll, publishResult } = require('../controllers/pollController');

const router = express.Router();
router.use(verifyToken);

router.post('/admin', requireRoles('Admin'), createPoll);
router.patch('/admin/:id', requireRoles('Admin'), updatePoll);
router.post('/admin/:id/publish-result', requireRoles('Admin'), publishResult);

router.post('/:id/vote', requireRoles('Resident'), votePoll);

router.get('/', getPolls);
router.get('/:id', getPoll);

module.exports = router;
