/**
 * =============================================================================
 * MODERATIONSERVICE.JS - User Moderation Management Service
 * =============================================================================
 *
 * This service handles all admin moderation actions against users.
 * It provides tools for managing user behavior through warnings,
 * suspensions, and admin notes.
 *
 * WHAT IS MODERATION?
 * -------------------
 * Moderation is the process of enforcing community guidelines:
 * - Warning users who violate rules
 * - Suspending accounts for serious violations
 * - Keeping notes about user behavior
 * - Tracking moderation history
 *
 * WHY HAVE MODERATION?
 * --------------------
 * 1. COMMUNITY SAFETY: Protect users from harmful behavior
 * 2. RULE ENFORCEMENT: Ensure guidelines are followed
 * 3. ACCOUNTABILITY: Track actions taken against users
 * 4. APPEALS: Provide history for appeals process
 * 5. GRADUAL RESPONSE: Escalate from warnings to suspensions
 *
 * MODERATION ACTIONS:
 * -------------------
 * 1. WARNING: Formal notice to user (levels 1-3)
 * 2. SUSPENSION: Temporarily disable account
 * 3. UNSUSPEND: Restore suspended account
 * 4. NOTE: Admin-only note (user doesn't see)
 *
 * WARNING LEVELS:
 * ---------------
 * - Level 1: Minor violation, first offense
 * - Level 2: Repeated minor or moderate violation
 * - Level 3: Serious violation, final warning
 *
 * ADMIN-ONLY:
 * -----------
 * All functions in this service should only be called by admin users.
 * The route layer should verify admin role before calling these.
 *
 * AUDIT TRAIL:
 * ------------
 * All moderation actions are logged to ModerationAction model for:
 * - Accountability (who did what)
 * - History (when actions were taken)
 * - Appeals (review past decisions)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * User model - The user being moderated.
 */
import User from '../models/User.js';

/**
 * ModerationAction model - Logs all moderation actions.
 */
import ModerationAction from '../models/ModerationAction.js';

/**
 * Notification model - For sending notifications to users.
 */
import Notification from '../models/Notification.js';

// =============================================================================
// WARN USER
// =============================================================================

/**
 * warnUser(targetUserId, adminId, options)
 * ----------------------------------------
 * Issues a warning to a user.
 *
 * @param {ObjectId} targetUserId - The user receiving the warning
 * @param {ObjectId} adminId - The admin issuing the warning
 * @param {Object} options - Warning options
 *   - options.reason: Why the warning was issued (required)
 *   - options.level: Warning severity 1-3 (default: 1)
 *
 * @returns {Object} { user, action } - Updated user and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT HAPPENS:
 * 1. Find the target user
 * 2. Increment their warning count
 * 3. Record when they were last warned
 * 4. Log the action to ModerationAction
 *
 * WARNING LEVELS:
 * - Level 1: "Please be aware of [rule]"
 * - Level 2: "This is a formal warning about [rule]"
 * - Level 3: "Final warning before suspension"
 *
 * EXAMPLE:
 * ```javascript
 * const { user, action } = await warnUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Posting spam content',
 *     level: 2
 *   }
 * );
 * ```
 */
export async function warnUser(targetUserId, adminId, { reason, level = 1 }) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // =========================================================================
  // UPDATE USER'S WARNING STATUS
  // =========================================================================

  // Initialize moderationStatus if it doesn't exist
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }

  // Increment warning count
  user.moderationStatus.warningCount = (user.moderationStatus.warningCount || 0) + 1;

  // Record when the warning was issued
  user.moderationStatus.lastWarningAt = new Date();

  // Save the user changes
  await user.save();

  // =========================================================================
  // LOG THE ACTION
  // =========================================================================

  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'warning',
    reason,
    details: {
      warningLevel: level
    }
  });

  // =========================================================================
  // NOTIFY USER
  // =========================================================================

  try {
    await Notification.notifyModerationWarning(targetUserId, reason, level);
  } catch (notifyError) {
    // Don't fail the moderation action if notification fails
    console.error('Failed to send warning notification:', notifyError);
  }

  return { user, action };
}

// =============================================================================
// SUSPEND USER
// =============================================================================

/**
 * suspendUser(targetUserId, adminId, options)
 * -------------------------------------------
 * Suspends a user's account.
 *
 * @param {ObjectId} targetUserId - The user being suspended
 * @param {ObjectId} adminId - The admin performing the suspension
 * @param {Object} options - Suspension options
 *   - options.reason: Why the user is being suspended (required)
 *   - options.until: Suspension end date (optional, null = indefinite)
 *
 * @returns {Object} { user, action } - Updated user and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "Cannot suspend admin users" if target is admin
 * @throws {Error} "Cannot suspend yourself" if admin tries self-suspend
 *
 * WHAT HAPPENS:
 * 1. Verify the user can be suspended
 * 2. Set user status to 'suspended'
 * 3. Record suspension details
 * 4. Log the action
 *
 * SUSPENDED USER EXPERIENCE:
 * - Cannot log in
 * - API calls return 403 Forbidden
 * - Can be unsuspended by admin
 *
 * SUSPENSION TYPES:
 * - Temporary: Set 'until' date, auto-unsuspend possible
 * - Indefinite: Leave 'until' null, requires manual unsuspend
 *
 * EXAMPLE:
 * ```javascript
 * // Suspend for 7 days
 * const weekFromNow = new Date();
 * weekFromNow.setDate(weekFromNow.getDate() + 7);
 *
 * const { user, action } = await suspendUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Repeated harassment',
 *     until: weekFromNow
 *   }
 * );
 * ```
 */
export async function suspendUser(targetUserId, adminId, { reason, until }) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // =========================================================================
  // SAFETY CHECKS
  // =========================================================================

  // Don't allow suspending admin users
  // Admins can only be demoted first, then suspended
  if (user.role === 'admin') {
    throw new Error('Cannot suspend admin users');
  }

  // Don't allow admins to suspend themselves
  // This prevents accidental lockouts
  if (targetUserId.toString() === adminId.toString()) {
    throw new Error('Cannot suspend yourself');
  }

  // =========================================================================
  // UPDATE USER STATUS
  // =========================================================================

  // Set account status to suspended
  user.status = 'suspended';

  // Initialize moderationStatus if needed
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }

  // Record suspension details
  user.moderationStatus.isSuspended = true;
  user.moderationStatus.suspendedUntil = until ? new Date(until) : null;
  user.moderationStatus.suspendedBy = adminId;
  user.moderationStatus.suspendReason = reason;

  await user.save();

  // =========================================================================
  // LOG THE ACTION
  // =========================================================================

  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'suspension',
    reason,
    details: {
      suspendedUntil: until ? new Date(until) : null
    }
  });

  // =========================================================================
  // NOTIFY USER
  // =========================================================================

  try {
    await Notification.notifyModerationSuspension(targetUserId, reason, until ? new Date(until) : null);
  } catch (notifyError) {
    // Don't fail the moderation action if notification fails
    console.error('Failed to send suspension notification:', notifyError);
  }

  return { user, action };
}

// =============================================================================
// UNSUSPEND USER
// =============================================================================

/**
 * unsuspendUser(targetUserId, adminId, options)
 * ---------------------------------------------
 * Removes a suspension from a user's account.
 *
 * @param {ObjectId} targetUserId - The user being unsuspended
 * @param {ObjectId} adminId - The admin removing the suspension
 * @param {Object} options - Unsuspension options
 *   - options.reason: Why the suspension is being lifted (required)
 *
 * @returns {Object} { user, action } - Updated user and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT HAPPENS:
 * 1. Find the target user
 * 2. Set status back to 'active'
 * 3. Clear suspension-related fields
 * 4. Log the action
 *
 * REASONS TO UNSUSPEND:
 * - Suspension period ended
 * - Successful appeal
 * - Mistaken suspension
 * - User made amends
 *
 * EXAMPLE:
 * ```javascript
 * const { user, action } = await unsuspendUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'Suspension period completed, user agreed to follow guidelines' }
 * );
 * ```
 */
export async function unsuspendUser(targetUserId, adminId, { reason }) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Save previous status for logging
  const previousStatus = user.status;

  // =========================================================================
  // RESTORE USER STATUS
  // =========================================================================

  // Restore account to active status
  user.status = 'active';

  // Initialize moderationStatus if needed
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }

  // Clear all suspension-related fields
  user.moderationStatus.isSuspended = false;
  user.moderationStatus.suspendedUntil = null;
  user.moderationStatus.suspendedBy = null;
  user.moderationStatus.suspendReason = null;

  await user.save();

  // =========================================================================
  // LOG THE ACTION
  // =========================================================================

  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'unsuspend',
    reason,
    details: {
      previousStatus  // Record what status they had before
    }
  });

  // =========================================================================
  // NOTIFY USER
  // =========================================================================

  try {
    await Notification.notifyModerationUnsuspend(targetUserId, reason);
  } catch (notifyError) {
    // Don't fail the moderation action if notification fails
    console.error('Failed to send unsuspend notification:', notifyError);
  }

  return { user, action };
}

// =============================================================================
// BAN USER
// =============================================================================

/**
 * banUser(targetUserId, adminId, options)
 * ---------------------------------------
 * Permanently bans a user's account.
 *
 * @param {ObjectId} targetUserId - The user being banned
 * @param {ObjectId} adminId - The admin performing the ban
 * @param {Object} options - Ban options
 *   - options.reason: Why the user is being banned (required)
 *
 * @returns {Object} { user, action } - Updated user and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "Cannot ban admin users" if target is admin
 * @throws {Error} "Cannot ban yourself" if admin tries to self-ban
 * @throws {Error} "User is already banned" if user is already banned
 *
 * WHAT HAPPENS:
 * 1. Verify the user can be banned
 * 2. Set user status to 'disabled'
 * 3. Record ban details
 * 4. Log the action
 *
 * BANNED USER EXPERIENCE:
 * - Cannot log in
 * - API calls return 403 Forbidden
 * - Account is permanently disabled
 * - Can only be unbanned by admin
 *
 * EXAMPLE:
 * ```javascript
 * const { user, action } = await banUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'Repeated severe policy violations' }
 * );
 * ```
 */
export async function banUser(targetUserId, adminId, { reason }) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // =========================================================================
  // SAFETY CHECKS
  // =========================================================================

  // Don't allow banning admin users
  if (user.role === 'admin') {
    throw new Error('Cannot ban admin users');
  }

  // Don't allow admins to ban themselves
  if (targetUserId.toString() === adminId.toString()) {
    throw new Error('Cannot ban yourself');
  }

  // Check if user is already banned
  if (user.moderationStatus?.isBanned) {
    throw new Error('User is already banned');
  }

  // =========================================================================
  // UPDATE USER STATUS
  // =========================================================================

  // Set account status to disabled (permanent)
  user.status = 'disabled';

  // Initialize moderationStatus if needed
  if (!user.moderationStatus) {
    user.moderationStatus = {};
  }

  // Record ban details
  user.moderationStatus.isBanned = true;
  user.moderationStatus.bannedAt = new Date();
  user.moderationStatus.bannedBy = adminId;
  user.moderationStatus.banReason = reason;

  // Clear any suspension (ban supersedes suspension)
  user.moderationStatus.isSuspended = false;
  user.moderationStatus.suspendedUntil = null;
  user.moderationStatus.suspendedBy = null;
  user.moderationStatus.suspendReason = null;

  await user.save();

  // =========================================================================
  // LOG THE ACTION
  // =========================================================================

  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'ban',
    reason,
    details: {}
  });

  // =========================================================================
  // NOTIFY USER
  // =========================================================================

  try {
    await Notification.notifyModerationBan(targetUserId, reason);
  } catch (notifyError) {
    // Don't fail the moderation action if notification fails
    console.error('Failed to send ban notification:', notifyError);
  }

  return { user, action };
}

// =============================================================================
// UNBAN USER
// =============================================================================

/**
 * unbanUser(targetUserId, adminId, options)
 * -----------------------------------------
 * Removes a permanent ban from a user's account.
 *
 * @param {ObjectId} targetUserId - The user being unbanned
 * @param {ObjectId} adminId - The admin removing the ban
 * @param {Object} options - Unban options
 *   - options.reason: Why the ban is being lifted (required)
 *
 * @returns {Object} { user, action } - Updated user and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "User is not banned" if user wasn't banned
 *
 * WHAT HAPPENS:
 * 1. Find the target user
 * 2. Set status back to 'active'
 * 3. Clear ban-related fields
 * 4. Log the action
 *
 * EXAMPLE:
 * ```javascript
 * const { user, action } = await unbanUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'Successful appeal, user agreed to follow guidelines' }
 * );
 * ```
 */
export async function unbanUser(targetUserId, adminId, { reason }) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user is actually banned
  if (!user.moderationStatus?.isBanned) {
    throw new Error('User is not banned');
  }

  // =========================================================================
  // RESTORE USER STATUS
  // =========================================================================

  // Restore account to active status
  user.status = 'active';

  // Clear all ban-related fields
  user.moderationStatus.isBanned = false;
  user.moderationStatus.bannedAt = null;
  user.moderationStatus.bannedBy = null;
  user.moderationStatus.banReason = null;

  await user.save();

  // =========================================================================
  // LOG THE ACTION
  // =========================================================================

  const action = await ModerationAction.logAction({
    targetUserId,
    performedBy: adminId,
    actionType: 'unban',
    reason,
    details: {}
  });

  // =========================================================================
  // NOTIFY USER
  // =========================================================================

  try {
    await Notification.notifyModerationUnban(targetUserId, reason);
  } catch (notifyError) {
    // Don't fail the moderation action if notification fails
    console.error('Failed to send unban notification:', notifyError);
  }

  return { user, action };
}

// =============================================================================
// ADD ADMIN NOTE
// =============================================================================

/**
 * addAdminNote(targetUserId, adminId, options)
 * --------------------------------------------
 * Adds a private admin note about a user.
 *
 * @param {ObjectId} targetUserId - The user the note is about
 * @param {ObjectId} adminId - The admin adding the note
 * @param {Object} options - Note options
 *   - options.content: The note content (required)
 *
 * @returns {Object} { user, action } - User and action record
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT ARE ADMIN NOTES?
 * ---------------------
 * Admin notes are private comments about a user that:
 * - Only admins can see
 * - User is NOT notified
 * - Help track important context
 * - Useful for support and moderation
 *
 * USE CASES:
 * - "User complained about feature X, watch for feedback"
 * - "VIP customer, handle with care"
 * - "Tends to create multiple tickets, consolidate"
 * - "Previous account was banned, monitor for same behavior"
 *
 * EXAMPLE:
 * ```javascript
 * const { user, action } = await addAdminNote(
 *   targetUserId,
 *   adminId,
 *   { content: 'User reported bug #123, gave them 1 month premium' }
 * );
 * ```
 */
export async function addAdminNote(targetUserId, adminId, { content }) {
  // Find the target user (verify they exist)
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // =========================================================================
  // LOG THE NOTE
  // =========================================================================
  // Notes don't change the user, they just create a log entry

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

// =============================================================================
// GET MODERATION HISTORY
// =============================================================================

/**
 * getModerationHistory(targetUserId, options)
 * -------------------------------------------
 * Gets the complete moderation history for a user.
 *
 * @param {ObjectId} targetUserId - The user to get history for
 * @param {Object} options - Query options
 *   - options.limit: Max records to return (default: 50)
 *   - options.skip: Records to skip for pagination (default: 0)
 *
 * @returns {Object} Moderation history
 *   - user: Basic user info and current moderation status
 *   - actions: Array of moderation actions
 *   - total: Total number of actions
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * RETURNED DATA:
 * ```javascript
 * {
 *   user: {
 *     _id: '...',
 *     email: 'user@example.com',
 *     status: 'active',
 *     moderationStatus: {
 *       warningCount: 2,
 *       lastWarningAt: '2024-01-10',
 *       isSuspended: false
 *     }
 *   },
 *   actions: [
 *     {
 *       actionType: 'warning',
 *       reason: 'Spam content',
 *       performedBy: { email: 'admin@example.com' },
 *       createdAt: '2024-01-10'
 *     },
 *     // ... more actions
 *   ],
 *   total: 5
 * }
 * ```
 */
export async function getModerationHistory(targetUserId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get moderation actions from the model
  const { actions, total } = await ModerationAction.getHistory(targetUserId, { limit, skip });

  return {
    // Return limited user info (not the full user document)
    user: {
      _id: user._id,
      email: user.email,
      status: user.status,
      moderationStatus: user.moderationStatus
    },
    // Convert actions to safe JSON (removes sensitive fields)
    actions: actions.map(a => a.toSafeJSON()),
    total
  };
}

// =============================================================================
// GET MODERATION SUMMARY
// =============================================================================

/**
 * getModerationSummary(targetUserId)
 * ----------------------------------
 * Gets a summary of a user's moderation status.
 *
 * @param {ObjectId} targetUserId - The user to get summary for
 *
 * @returns {Object} Moderation summary
 *   - warningCount: Total warnings ever received
 *   - recentWarnings: Warnings in last 90 days
 *   - lastWarningAt: When last warning was issued
 *   - isSuspended: Currently suspended?
 *   - suspendedUntil: When suspension ends (if applicable)
 *   - suspendReason: Why they were suspended
 *   - status: Current account status
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * USE CASES:
 * - Quick status check before taking action
 * - Displaying in admin user profile
 * - Determining escalation level
 *
 * EXAMPLE:
 * ```javascript
 * const summary = await getModerationSummary(userId);
 *
 * if (summary.recentWarnings >= 3) {
 *   // Consider suspension
 * }
 * ```
 */
export async function getModerationSummary(targetUserId) {
  // Find the target user
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get count of warnings in the last 90 days
  // This helps determine if user is a repeat offender
  const recentWarnings = await ModerationAction.getRecentWarningCount(targetUserId, 90);

  return {
    warningCount: user.moderationStatus?.warningCount || 0,
    recentWarnings,
    lastWarningAt: user.moderationStatus?.lastWarningAt,
    isSuspended: user.moderationStatus?.isSuspended || false,
    suspendedUntil: user.moderationStatus?.suspendedUntil,
    suspendReason: user.moderationStatus?.suspendReason,
    isBanned: user.moderationStatus?.isBanned || false,
    bannedAt: user.moderationStatus?.bannedAt,
    banReason: user.moderationStatus?.banReason,
    status: user.status
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all moderation service functions.
 *
 * USAGE:
 * ```javascript
 * import moderationService from './services/moderationService.js';
 *
 * // Issue a warning
 * const { user, action } = await moderationService.warnUser(
 *   targetId,
 *   adminId,
 *   { reason: 'Spam', level: 1 }
 * );
 *
 * // Suspend a user
 * await moderationService.suspendUser(
 *   targetId,
 *   adminId,
 *   { reason: 'TOS violation', until: oneWeekFromNow }
 * );
 *
 * // Get moderation history
 * const history = await moderationService.getModerationHistory(targetId);
 * ```
 */
export default {
  warnUser,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  addAdminNote,
  getModerationHistory,
  getModerationSummary
};
