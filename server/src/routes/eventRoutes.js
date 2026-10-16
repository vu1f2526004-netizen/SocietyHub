const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { createEvent, updateEvent, deleteEvent, getEvents, getEvent, rsvpEvent, cancelRsvp, getMyRsvps, getParticipants, recordAttendance } = require('../controllers/eventController');

const router = express.Router();
router.use(verifyToken);

router.post('/admin', requireRoles('Admin'), createEvent);
router.patch('/admin/:id', requireRoles('Admin'), updateEvent);
router.delete('/admin/:id', requireRoles('Admin'), deleteEvent);
router.get('/admin/:id/participants', requireRoles('Admin'), getParticipants);
router.post('/admin/:id/attendance', requireRoles('Admin'), recordAttendance);

router.get('/my/rsvps', requireRoles('Resident'), getMyRsvps);
router.post('/:id/rsvp', requireRoles('Resident'), rsvpEvent);
router.patch('/:id/rsvp', requireRoles('Resident'), cancelRsvp);

router.get('/', getEvents);
router.get('/:id', getEvent);

module.exports = router;
