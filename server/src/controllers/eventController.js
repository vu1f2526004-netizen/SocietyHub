const ErrorResponse = require('../utils/errorResponse');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendEmail } = require('../utils/sendEmail');

exports.createEvent = async (req, res, next) => {
  try {
    const eventData = { ...req.body };
    delete eventData.societyId;
    const event = await Event.create({
      ...eventData,
      societyId: req.user.societyId,
      createdBy: req.user.id
    });

    if (event.status === 'Published') {
      const residents = await User.find({ societyId: req.user.societyId, role: 'Resident' });
      residents.forEach(r => {
        createNotification(r._id, 'New Event', `New event "${event.title}" has been published.`, 'Info', '', req.user.societyId);
        if (r.email) {
          sendEmail({
            to: r.email,
            subject: `SocietyHub: New Event - ${event.title}`,
            text: `Hello ${r.name},\n\nA new event "${event.title}" has been published for your society.\nDate: ${new Date(event.date).toLocaleDateString()}\nVenue: ${event.location}\n\nPlease check the portal to RSVP.\n\nBest regards,\nSocietyHub`,
            html: `<p>Hello <strong>${r.name}</strong>,</p><p>A new event "<strong>${event.title}</strong>" has been published.</p><p>Date: <strong>${new Date(event.date).toLocaleDateString()}</strong> at <strong>${event.startTime}</strong></p><p>Location: <strong>${event.location}</strong></p>`
          }).catch(() => {});
        }
      });

      // Also notify fellow administrators of the same society (deduped)
      const admins = await User.find({ societyId: req.user.societyId, role: 'Admin', status: 'Active' });
      admins.forEach(adm => {
        if (adm.email && adm._id.toString() !== req.user.id) {
          sendEmail({
            to: adm.email,
            subject: `SocietyHub Announcement: Event Published - ${event.title}`,
            text: `Hello ${adm.name},\n\nA new event "${event.title}" has been published in your society.\nDate: ${new Date(event.date).toLocaleDateString()}\nVenue: ${event.location}`,
            html: `<p>Hello <strong>${adm.name}</strong>,</p><p>A new event "<strong>${event.title}</strong>" has been published in your society.</p><p>Date: <strong>${new Date(event.date).toLocaleDateString()}</strong></p><p>Location: <strong>${event.location}</strong></p>`
          }).catch(() => {});
        }
      });
    }

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || (event.societyId && event.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Event not found', 404));
    }

    const updateData = { ...req.body };
    delete updateData.societyId;

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (updateData.status === 'Published' && event.status !== 'Published') {
      const residents = await User.find({ societyId: req.user.societyId, role: 'Resident' });
      residents.forEach(r => {
        createNotification(r._id, 'New Event', `New event "${updatedEvent.title}" has been published.`, 'Info', '', req.user.societyId);
        if (r.email) {
          sendEmail({
            to: r.email,
            subject: `SocietyHub: New Event - ${updatedEvent.title}`,
            text: `Hello ${r.name},\n\nA new event "${updatedEvent.title}" has been published for your society.\nDate: ${new Date(updatedEvent.date).toLocaleDateString()}\nVenue: ${updatedEvent.location}\n\nBest regards,\nSocietyHub`,
            html: `<p>Hello <strong>${r.name}</strong>,</p><p>A new event "<strong>${updatedEvent.title}</strong>" has been published.</p><p>Date: <strong>${new Date(updatedEvent.date).toLocaleDateString()}</strong></p><p>Location: <strong>${updatedEvent.location}</strong></p>`
          }).catch(() => {});
        }
      });
    }

    res.status(200).json({ success: true, data: updatedEvent });
  } catch (err) {
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || (event.societyId && event.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Event not found', 404));
    }

    await RSVP.deleteMany({ eventId: event._id, societyId: req.user.societyId });
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    let query = { societyId: req.user.societyId };
    if (req.user.role === 'Resident') query.status = { $in: ['Published', 'Completed'] };
    const events = await Event.find(query).sort({ date: 1 });
    res.status(200).json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || (event.societyId && event.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Event not found', 404));
    }
    if (req.user.role === 'Resident' && !['Published', 'Completed'].includes(event.status)) {
      return next(new ErrorResponse('Event not found', 404));
    }
    res.status(200).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

exports.rsvpEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || (event.societyId && event.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Event not found', 404));
    }
    if (event.status !== 'Published') return next(new ErrorResponse('Event not available for RSVP', 400));
    
    const rsvpCount = await RSVP.countDocuments({ eventId: event._id, societyId: req.user.societyId, status: 'Going' });
    if (rsvpCount >= event.capacity) return next(new ErrorResponse('Event is full', 400));

    // Prevent duplicate within the society
    let rsvp = await RSVP.findOne({ eventId: event._id, residentId: req.user.id, societyId: req.user.societyId });
    if (rsvp) {
      if (rsvp.status === 'Going') return next(new ErrorResponse('Already RSVPd', 400));
      rsvp.status = 'Going';
      await rsvp.save();
    } else {
      rsvp = await RSVP.create({
        societyId: req.user.societyId,
        eventId: event._id,
        residentId: req.user.id,
        status: 'Going'
      });
    }

    res.status(201).json({ success: true, data: rsvp });
  } catch (err) {
    // Mongo duplicate key error handle
    if (err.code === 11000) {
      return next(new ErrorResponse('Already RSVPd', 400));
    }
    next(err);
  }
};

exports.cancelRsvp = async (req, res, next) => {
  try {
    const rsvp = await RSVP.findOneAndUpdate(
      { eventId: req.params.id, residentId: req.user.id, societyId: req.user.societyId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!rsvp) return next(new ErrorResponse('RSVP not found', 404));
    res.status(200).json({ success: true, data: rsvp });
  } catch (err) {
    next(err);
  }
};

exports.getMyRsvps = async (req, res, next) => {
  try {
    const rsvps = await RSVP.find({ residentId: req.user.id, societyId: req.user.societyId }).populate('eventId');
    res.status(200).json({ success: true, data: rsvps });
  } catch (err) {
    next(err);
  }
};

exports.getParticipants = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || (event.societyId && event.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Event not found', 404));
    }

    const rsvps = await RSVP.find({ eventId: req.params.id, societyId: req.user.societyId }).populate('residentId', 'name email flatNumber');
    res.status(200).json({ success: true, data: rsvps });
  } catch (err) {
    next(err);
  }
};

exports.recordAttendance = async (req, res, next) => {
  try {
    const { rsvpId, attendance } = req.body;
    const rsvp = await RSVP.findById(rsvpId);
    if (!rsvp || (rsvp.societyId && rsvp.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('RSVP record not found', 404));
    }

    rsvp.attendance = attendance;
    await rsvp.save();
    res.status(200).json({ success: true, data: rsvp });
  } catch (err) {
    next(err);
  }
};
