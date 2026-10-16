const ErrorResponse = require('../utils/errorResponse');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

exports.createPoll = async (req, res, next) => {
  try {
    const pollData = { ...req.body };
    delete pollData.societyId;
    const poll = await Poll.create({
      ...pollData,
      societyId: req.user.societyId,
      createdBy: req.user.id
    });
    
    if (poll.status === 'Active') {
      const residents = await User.find({ societyId: req.user.societyId, role: 'Resident' });
      residents.forEach(r => createNotification(r._id, 'New Poll', `A new poll "${poll.question}" is active.`, 'Info', '', req.user.societyId));
    }

    res.status(201).json({ success: true, data: poll });
  } catch (err) {
    next(err);
  }
};

exports.updatePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll || (poll.societyId && poll.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Poll not found', 404));
    }

    const updateData = { ...req.body };
    delete updateData.societyId;

    const updatedPoll = await Poll.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updatedPoll });
  } catch (err) {
    next(err);
  }
};

exports.getPolls = async (req, res, next) => {
  try {
    let query = { societyId: req.user.societyId };
    if (req.user.role === 'Resident') query.status = { $in: ['Active', 'Published'] };
    const polls = await Poll.find(query).sort({ createdAt: -1 });
    
    // For residents, inject their vote status if they voted
    if (req.user.role === 'Resident') {
      const enhancedPolls = await Promise.all(polls.map(async p => {
        const pObj = p.toObject();
        const vote = await Vote.findOne({ pollId: p._id, residentId: req.user.id, societyId: req.user.societyId });
        pObj.hasVoted = !!vote;
        pObj.myVote = vote ? vote.optionId : null;
        
        // Hide vote counts unless Published
        if (pObj.status !== 'Published') {
          pObj.options.forEach(opt => opt.voteCount = undefined);
        }
        return pObj;
      }));
      return res.status(200).json({ success: true, data: enhancedPolls });
    }

    res.status(200).json({ success: true, data: polls });
  } catch (err) {
    next(err);
  }
};

exports.getPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll || (poll.societyId && poll.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Poll not found', 404));
    }

    if (req.user.role === 'Resident' && !['Active', 'Published'].includes(poll.status)) {
      return next(new ErrorResponse('Poll not found', 404));
    }
    
    let pObj = poll.toObject();
    if (req.user.role === 'Resident') {
      const vote = await Vote.findOne({ pollId: poll._id, residentId: req.user.id, societyId: req.user.societyId });
      pObj.hasVoted = !!vote;
      pObj.myVote = vote ? vote.optionId : null;
      if (pObj.status !== 'Published') {
        pObj.options.forEach(opt => opt.voteCount = undefined);
      }
    }
    res.status(200).json({ success: true, data: pObj });
  } catch (err) {
    next(err);
  }
};

exports.votePoll = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll || (poll.societyId && poll.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Poll not found', 404));
    }
    if (poll.status !== 'Active') return next(new ErrorResponse('Poll is not active', 400));
    
    const now = new Date();
    if (now > poll.closingDate) return next(new ErrorResponse('Poll is closed', 400));

    // Valid option check
    const optionExists = poll.options.find(opt => opt._id.toString() === optionId);
    if (!optionExists) return next(new ErrorResponse('Invalid option', 400));

    // Duplicate check
    const existing = await Vote.findOne({ pollId: poll._id, residentId: req.user.id, societyId: req.user.societyId });
    if (existing) return next(new ErrorResponse('Already voted', 400));

    await Vote.create({
      societyId: req.user.societyId,
      pollId: poll._id,
      residentId: req.user.id,
      optionId
    });
    
    // Atomic increment
    await Poll.updateOne(
      { _id: poll._id, "options._id": optionId },
      { $inc: { "options.$.voteCount": 1 } }
    );

    res.status(201).json({ success: true, data: {} });
  } catch (err) {
    if (err.code === 11000) return next(new ErrorResponse('Already voted', 400));
    next(err);
  }
};

exports.publishResult = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll || (poll.societyId && poll.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Poll not found', 404));
    }

    poll.status = 'Published';
    poll.decision = req.body.decision;
    await poll.save();

    res.status(200).json({ success: true, data: poll });
  } catch (err) {
    next(err);
  }
};
