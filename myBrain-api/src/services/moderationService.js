import User from '../models/User.js';
import ModerationAction from '../models/ModerationAction.js';

/**
 * Issue a warning to a user
 */
export async function warnUser(targetUserId, adminId, { reason, level = 1 }) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update user's warning count
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }
  user.moderationStatus.warningCount = (user.moderationStatus.warningCount || 0) + 1;
  user.moderationStatus.lastWarningAt = new Date();
  await user.save();

  // Log the action
  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'warning',
    reason,
    details: {
      warningLevel: level
    }
  });

  return { user, action };
}

/**
 * Suspend a user
 */
export async function suspendUser(targetUserId, adminId, { reason, until }) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Don't allow suspending admins
  if (user.role === 'admin') {
    throw new Error('Cannot suspend admin users');
  }

  // Don't allow suspending yourself
  if (targetUserId.toString() === adminId.toString()) {
    throw new Error('Cannot suspend yourself');
  }

  // Update user status
  user.status = 'suspended';
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }
  user.moderationStatus.isSuspended = true;
  user.moderationStatus.suspendedUntil = until ? new Date(until) : null;
  user.moderationStatus.suspendedBy = adminId;
  user.moderationStatus.suspendReason = reason;
  await user.save();

  // Log the action
  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'suspension',
    reason,
    details: {
      suspendedUntil: until ? new Date(until) : null
    }
  });

  return { user, action };
}

/**
 * Remove suspension from a user
 */
export async function unsuspendUser(targetUserId, adminId, { reason }) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const previousStatus = user.status;

  // Update user status
  user.status = 'active';
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }
  user.moderationStatus.isSuspended = false;
  user.moderationStatus.suspendedUntil = null;
  user.moderationStatus.suspendedBy = null;
  user.moderationStatus.suspendReason = null;
  await user.save();

  // Log the action
  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'unsuspend',
    reason,
    details: {
      previousStatus
    }
  });

  return { user, action };
}

/**
 * Add an admin note about a user
 */
export async function addAdminNote(targetUserId, adminId, { content }) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Log the action
  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'note',
    reason: 'Admin note added',
    details: {
      noteContent: content
    }
  });

  return { user, action };
}

/**
 * Get moderation history for a user
 */
export async function getModerationHistory(targetUserId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const { actions, total } = await ModerationAction.getHistory(targetUserId, { limit, skip });

  return {
    user: {
      _id: user._id,
      email: user.email,
      status: user.status,
      moderationStatus: user.moderationStatus
    },
    actions: actions.map(a => a.toSafeJSON()),
    total
  };
}

/**
 * Get moderation summary for a user
 */
export async function getModerationSummary(targetUserId) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const recentWarnings = await ModerationAction.getRecentWarningCount(targetUserId, 90);

  return {
    warningCount: user.moderationStatus?.warningCount || 0,
    recentWarnings,
    lastWarningAt: user.moderationStatus?.lastWarningAt,
    isSuspended: user.moderationStatus?.isSuspended || false,
    suspendedUntil: user.moderationStatus?.suspendedUntil,
    suspendReason: user.moderationStatus?.suspendReason,
    status: user.status
  };
}

export default {
  warnUser,
  suspendUser,
  unsuspendUser,
  addAdminNote,
  getModerationHistory,
  getModerationSummary
};
