import mongoose from 'mongoose';

const moderationActionSchema = new mongoose.Schema({
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: ['warning', 'suspension', 'unsuspend', 'note', 'status_change'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },
  details: {
    // For warnings
    warningLevel: {
      type: Number,
      min: 1,
      max: 3
    },
    // For suspensions
    suspendedUntil: Date,
    // For admin notes
    noteContent: {
      type: String,
      maxlength: 5000
    },
    // For status changes
    previousStatus: String,
    newStatus: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient user moderation history queries
moderationActionSchema.index({ targetUserId: 1, createdAt: -1 });

/**
 * Get moderation history for a user
 */
moderationActionSchema.statics.getHistory = async function(targetUserId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  const actions = await this.find({ targetUserId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'email profile.firstName profile.lastName');

  const total = await this.countDocuments({ targetUserId });

  return { actions, total };
};

/**
 * Log a moderation action
 */
moderationActionSchema.statics.logAction = async function({
  targetUserId,
  performedBy,
  actionType,
  reason,
  details = {}
}) {
  const action = new this({
    targetUserId,
    performedBy,
    actionType,
    reason,
    details
  });

  await action.save();
  return action;
};

/**
 * Get warning count for user in last N days
 */
moderationActionSchema.statics.getRecentWarningCount = async function(targetUserId, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.countDocuments({
    targetUserId,
    actionType: 'warning',
    createdAt: { $gte: since }
  });
};

/**
 * Convert to safe JSON for API response
 */
moderationActionSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();

  // Format performedBy if populated
  if (obj.performedBy && typeof obj.performedBy === 'object') {
    obj.performedBy = {
      _id: obj.performedBy._id,
      email: obj.performedBy.email,
      name: obj.performedBy.profile?.firstName
        ? `${obj.performedBy.profile.firstName} ${obj.performedBy.profile.lastName || ''}`.trim()
        : obj.performedBy.email
    };
  }

  return obj;
};

const ModerationAction = mongoose.model('ModerationAction', moderationActionSchema);

export default ModerationAction;
