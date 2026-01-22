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
 * User model - The user document of the person being moderated.
 * We update the user's moderationStatus field to track warnings and suspensions.
 * Also used to notify users about moderation actions via email.
 */
import User from '../models/User.js';

/**
 * ModerationAction model - Stores permanent audit trail of all moderation actions.
 * Creates new documents for each warning, suspension, or note to maintain
 * complete history for appeals and accountability.
 */
import ModerationAction from '../models/ModerationAction.js';

/**
 * Notification model - Sends in-app notifications to users about moderation.
 * When a user is warned or suspended, we create notification documents
 * so users are informed of actions taken against their account.
 */
import Notification from '../models/Notification.js';

// =============================================================================
// WARN USER
// =============================================================================

/**
 * warnUser(targetUserId, adminId, options)
 * ----------------------------------------
 * Issues a formal warning to a user for policy violation.
 * Warnings escalate from level 1 (mild) to level 3 (final).
 *
 * BUSINESS LOGIC:
 * Warnings are the first step in moderation escalation:
 * - Level 1: "Hey, please follow the rules"
 * - Level 2: "This is a formal warning, stop this behavior"
 * - Level 3: "Final warning - next step is suspension"
 * The warning count helps admins track repeat offenders.
 *
 * @param {ObjectId} targetUserId - The user receiving the warning
 * @param {ObjectId} adminId - The admin issuing the warning
 * @param {Object} options - Warning options
 *   @param {string} options.reason - Why the warning was issued (required)
 *     Example: "Posting spam content" or "Harassment of other users"
 *   @param {number} options.level - Warning severity 1-3 (default: 1)
 *     1 = minor/first offense
 *     2 = repeated or moderate
 *     3 = serious/final warning
 *
 * @returns {Promise<Object>} Result object:
 *   - user: Updated user document with new warning count
 *   - action: ModerationAction record created (audit trail)
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Verify target user exists
 * 2. Increment their warning count
 * 3. Record the warning timestamp
 * 4. Create ModerationAction for audit trail
 * 5. Send notification to user about the warning
 *
 * ESCALATION GUIDE:
 * - 1 warning: Gentle reminder
 * - 2 warnings: Formal warning, behavior must change
 * - 3+ warnings: Consider suspension
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const { user, action } = await warnUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Posting spam content in multiple threads',
 *     level: 2
 *   }
 * );
 * // user.moderationStatus.warningCount is now incremented
 * // action record saved with full details for audit
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
 * Temporarily or indefinitely suspends a user's account access.
 * Prevents login and API access until unsuspended.
 *
 * BUSINESS LOGIC:
 * Suspension is stronger than a warning but less permanent than a ban.
 * - Use for serious violations that need cooling-off period
 * - Can be temporary (auto-review at expiration) or indefinite
 * - Protects community while leaving room for redemption
 *
 * @param {ObjectId} targetUserId - The user being suspended
 * @param {ObjectId} adminId - The admin performing the suspension
 * @param {Object} options - Suspension options
 *   @param {string} options.reason - Why the user is being suspended (required)
 *     Example: "Repeated harassment after warnings"
 *   @param {Date} options.until - When suspension ends (optional)
 *     If null/undefined = indefinite suspension
 *     If Date = temporary suspension (auto-review at this date)
 *
 * @returns {Promise<Object>} Result object:
 *   - user: Updated user with suspended status
 *   - action: ModerationAction record for audit trail
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "Cannot suspend admin users" if target is admin
 * @throws {Error} "Cannot suspend yourself" if admin tries to suspend themselves
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Verify user exists
 * 2. Verify user is not an admin (can't suspend admins)
 * 3. Verify admin is not suspending themselves
 * 4. Set account status to 'suspended'
 * 5. Record suspension details (until, reason, who did it)
 * 6. Create audit trail
 * 7. Notify user via notification
 *
 * SUSPENDED USER EXPERIENCE:
 * - Cannot log in (401 Unauthorized)
 * - API calls return 403 Forbidden
 * - Can appeal or wait for unsuspension
 * - All content remains accessible to others (not deleted)
 *
 * SUSPENSION TYPES:
 * - Temporary: Specify 'until' date, auto-review possible
 * - Indefinite: Leave 'until' null, requires manual admin unsuspend
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Temporary suspension: 7-day cooling off period
 * const weekFromNow = new Date();
 * weekFromNow.setDate(weekFromNow.getDate() + 7);
 *
 * const { user, action } = await suspendUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Repeated harassment of other users after 2 warnings',
 *     until: weekFromNow
 *   }
 * );
 *
 * // Indefinite suspension: requires appeal/review
 * const { user, action } = await suspendUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Severe policy violation - must appeal for review',
 *     until: null  // No expiration
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
 * Removes a suspension from a user's account, restoring access.
 *
 * BUSINESS LOGIC:
 * Unsuspension restores user access after suspension period or appeal.
 * Helps users return if they've improved behavior or period has ended.
 *
 * @param {ObjectId} targetUserId - The user being unsuspended
 * @param {ObjectId} adminId - The admin removing the suspension
 * @param {Object} options - Unsuspension options
 *   @param {string} options.reason - Why the suspension is being lifted (required)
 *     Example: "Suspension period completed"
 *     Example: "User appealed and agreed to follow guidelines"
 *     Example: "Mistaken suspension - user behavior was acceptable"
 *
 * @returns {Promise<Object>} Result object:
 *   - user: Updated user with active status
 *   - action: ModerationAction record for audit trail
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Verify user exists
 * 2. Set account status back to 'active'
 * 3. Clear all suspension-related fields
 * 4. Create audit record
 * 5. Notify user of restoration
 *
 * REASONS FOR UNSUSPENSION:
 * - Temporary suspension period ended (automatic or manual)
 * - User submitted successful appeal with proof of behavior change
 * - Mistaken suspension (wrong user, wrong reason)
 * - User made explicit amends/apology accepted by community
 * - Appeal approved after review
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // After 7-day cooling period ends
 * const { user, action } = await unsuspendUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'Temporary suspension period of 7 days completed' }
 * );
 *
 * // After successful appeal
 * const { user, action } = await unsuspendUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'User appeal approved - promised to follow community guidelines' }
 * );
 *
 * // Correcting mistake
 * const { user, action } = await unsuspendUser(
 *   targetUserId,
 *   adminId,
 *   { reason: 'Mistaken suspension - user was not violating policy' }
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
 * Permanently bans a user's account for severe policy violations.
 * Most severe moderation action (only unbannable by admin).
 *
 * BUSINESS LOGIC:
 * A ban is permanent and only used for severe violations:
 * - Repeated harassment after warnings and suspension
 * - Threatening or violent behavior
 * - Illegal activity
 * - Impersonation or fraud
 * Admins can unban if new evidence shows innocence.
 *
 * @param {ObjectId} targetUserId - The user being banned
 * @param {ObjectId} adminId - The admin performing the ban
 * @param {Object} options - Ban options
 *   @param {string} options.reason - Why the user is being banned (required)
 *     Example: "Repeated severe policy violations after warnings and suspension"
 *     Example: "Threatening language and harassment"
 *     Example: "Impersonation and fraud"
 *
 * @returns {Promise<Object>} Result object:
 *   - user: Updated user with disabled status
 *   - action: ModerationAction record for audit trail
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "Cannot ban admin users" if target is an admin
 * @throws {Error} "Cannot ban yourself" if admin tries to ban themselves
 * @throws {Error} "User is already banned" if user is already banned
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Verify user exists
 * 2. Verify user is not an admin
 * 3. Verify admin is not banning themselves
 * 4. Verify user is not already banned
 * 5. Set account status to 'disabled'
 * 6. Record ban timestamp and admin who did it
 * 7. Clear any active suspension (ban supersedes it)
 * 8. Create comprehensive audit record
 * 9. Notify user of permanent ban
 *
 * BANNED USER EXPERIENCE:
 * - Cannot log in (401 Unauthorized)
 * - API calls return 403 Forbidden
 * - Account is permanently disabled
 * - All content remains visible (just creator is banned)
 * - Can only be unbanned by admin with explicit unban action
 * - High bar for appeals (requires admin review)
 *
 * WHEN TO BAN:
 * - Level 3 warning + continued violations
 * - Suspension period ended but user re-offended immediately
 * - Threatening or violent language
 * - Illegal activity
 * - Impersonation or account fraud
 * - Coordinated harassment
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // After escalation chain (warnings → suspension → violated again)
 * const { user, action } = await banUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Resumed harassment immediately after suspension period'
 *   }
 * );
 *
 * // For severe violations
 * const { user, action } = await banUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Threatening violence and doxxing other users'
 *   }
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
 * Rarely used - requires strong justification and admin agreement.
 *
 * BUSINESS LOGIC:
 * Unbans are exceptional because bans are meant to be permanent.
 * Only unban if:
 * - Evidence shows original ban was based on false information
 * - User successfully appealed with compelling evidence
 * - Case was decided incorrectly in hindsight
 * Not used for time-based appeals - use unsuspendUser for temporary bans.
 *
 * @param {ObjectId} targetUserId - The user being unbanned
 * @param {ObjectId} adminId - The admin removing the ban
 * @param {Object} options - Unban options
 *   @param {string} options.reason - Why the ban is being lifted (required)
 *     Must explain exceptional circumstances
 *     Example: "New evidence proves user did not threaten other user"
 *     Example: "Account was compromised - ban was for hacker actions"
 *     Example: "Mistaken ban - user account was impersonated"
 *
 * @returns {Promise<Object>} Result object:
 *   - user: Updated user with active status
 *   - action: ModerationAction record for audit trail
 *
 * @throws {Error} "User not found" if target user doesn't exist
 * @throws {Error} "User is not banned" if user wasn't banned
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Verify user exists
 * 2. Verify user is actually banned
 * 3. Set account status back to 'active'
 * 4. Clear all ban-related fields
 * 5. Create detailed audit record
 * 6. Notify user of reinstatement
 *
 * JUSTIFICATIONS FOR UNBAN:
 * - False accusation (evidence clears user)
 * - Account compromised (hacker actions, not user)
 * - Mistaken identity (banned wrong user)
 * - New evidence (original case was incomplete)
 * - Successful appeal (requires high bar of proof)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Discovered ban was based on false report
 * const { user, action } = await unbanUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Ban was based on false report - accused user has provided evidence of innocence'
 *   }
 * );
 *
 * // Account was compromised, ban was for hacker actions
 * const { user, action } = await unbanUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'User proved account was compromised - ban penalties removed for unauthorized actions'
 *   }
 * );
 *
 * // Mistaken identity
 * const { user, action } = await unbanUser(
 *   targetUserId,
 *   adminId,
 *   {
 *     reason: 'Ban was for wrong user - admin error in account identification'
 *   }
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
 * Adds a private admin note about a user for internal tracking.
 * Notes are not visible to users and don't trigger notifications.
 *
 * BUSINESS LOGIC:
 * Admin notes provide context without taking formal action.
 * Used for tracking context, patterns, and important information
 * that helps admins make better decisions on future interactions.
 *
 * @param {ObjectId} targetUserId - The user the note is about
 * @param {ObjectId} adminId - The admin adding the note
 * @param {Object} options - Note options
 *   @param {string} options.content - The note content (required)
 *     Should be clear and specific
 *     Example: "User reported bug #123, gave 1 month free premium"
 *     Example: "Repeat complainant - consolidate future tickets"
 *     Example: "VIP user - prioritize support tickets"
 *     Example: "Previous account (userXYZ) was banned - monitor for evasion"
 *
 * @returns {Promise<Object>} Result object:
 *   - user: The user the note is about (unchanged)
 *   - action: ModerationAction record with note content
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * WHAT ARE ADMIN NOTES?
 * ---------------------
 * Admin notes are private comments about a user that:
 * - Only admins can see (not visible to user)
 * - User is NOT notified (no email or in-app notification)
 * - Help track important context for future interactions
 * - Useful for coordination between support and moderation
 * - Build up institutional knowledge about tricky users
 *
 * NOT A MODERATION ACTION:
 * - Unlike warnings/suspensions, notes don't change user status
 * - No escalation value, just documentation
 * - Can be added freely without threshold
 * - Useful for tracking patterns before formal action needed
 *
 * COMMON USE CASES:
 * - "User reported critical bug, compensated with credits"
 * - "VIP customer - handle escalations with care"
 * - "Tends to create multiple support tickets for same issue, consolidate"
 * - "Previous account was banned for X, monitor for same behavior"
 * - "User mentioned in report #456 about harassment"
 * - "Requested feature #789, note that they're interested in it"
 * - "Timezone is PST, best to reach out morning hours"
 * - "High-touch account due to specific business arrangement"
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Track compensation given
 * const { user, action } = await addAdminNote(
 *   targetUserId,
 *   adminId,
 *   { content: 'User reported bug #123 (critical), gave 1 month premium access' }
 * );
 *
 * // Track VIP status
 * const { user, action } = await addAdminNote(
 *   targetUserId,
 *   adminId,
 *   { content: 'VIP customer - enterprise contact. Prioritize all support tickets.' }
 * );
 *
 * // Track patterns
 * const { user, action } = await addAdminNote(
 *   targetUserId,
 *   adminId,
 *   { content: 'Creates 3-5 tickets per month with similar issues. May need onboarding.' }
 * );
 *
 * // Track security/compliance
 * const { user, action } = await addAdminNote(
 *   targetUserId,
 *   adminId,
 *   {
 *     content: 'Alt account for user ABC123 (banned). Monitor for same policy violations.'
 *   }
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
 * Retrieves the complete moderation history for a user.
 * Shows all warnings, suspensions, bans, and notes created by admins.
 *
 * BUSINESS LOGIC:
 * History provides context for decision-making:
 * - See escalation pattern (warnings → suspension → ban)
 * - Understand user's compliance history
 * - Track if user pattern is improving or worsening
 * - Make informed decisions on appeals
 *
 * @param {ObjectId} targetUserId - The user to get history for
 * @param {Object} options - Query options
 *   @param {number} options.limit - Max records to return (default: 50)
 *   @param {number} options.skip - Records to skip for pagination (default: 0)
 *
 * @returns {Promise<Object>} Complete moderation history
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * {
 *   user: {
 *     _id: '...',
 *     email: 'user@example.com',
 *     status: 'active',
 *     moderationStatus: {
 *       warningCount: 2,
 *       lastWarningAt: '2024-01-10',
 *       isSuspended: false,
 *       isBanned: false
 *     }
 *   },
 *   actions: [
 *     {
 *       actionType: 'warning',          // 'warning', 'suspension', 'ban', 'unsuspend', 'unban', 'note'
 *       reason: 'Spam content',
 *       performedBy: { email: 'admin@example.com' },
 *       details: { warningLevel: 2 },
 *       createdAt: '2024-01-10T14:30:00Z'
 *     },
 *     // ... older actions first (reversed chronological)
 *   ],
 *   total: 5  // Total actions for this user (for pagination)
 * }
 * ```
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get full moderation history
 * const history = await getModerationHistory('user456');
 * console.log(`User has ${history.total} moderation actions`);
 *
 * // See escalation pattern
 * console.log(history.actions);
 * // [
 * //   { actionType: 'warning', reason: 'First offense', createdAt: '2024-01-01' },
 * //   { actionType: 'warning', reason: 'Repeated violation', createdAt: '2024-01-05' },
 * //   { actionType: 'suspension', reason: 'Escalated after warnings', createdAt: '2024-01-10' }
 * // ]
 *
 * // Get paginated history
 * const firstPage = await getModerationHistory('user456', { limit: 20, skip: 0 });
 * const nextPage = await getModerationHistory('user456', { limit: 20, skip: 20 });
 * ```
 *
 * ADMIN DECISION SUPPORT:
 * - See the full chain of actions before current status
 * - Identify patterns (e.g., user repeatedly violates same rule)
 * - Check if user has shown improvement over time
 * - Verify consistency of admin actions
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
 * Gets a quick snapshot of a user's current moderation status.
 * Shows current state without full history (use getModerationHistory for that).
 *
 * BUSINESS LOGIC:
 * Summary provides at-a-glance view of user's moderation state.
 * Helps admins quickly assess:
 * - Are they currently suspended/banned?
 * - How many warnings total?
 * - Are violations recent or historical?
 * Used for quick decisions without reviewing full history.
 *
 * @param {ObjectId} targetUserId - The user to get summary for
 *
 * @returns {Promise<Object>} Moderation status summary:
 *   - warningCount: Total warnings ever received
 *   - recentWarnings: Warnings in last 90 days (repeat offenders)
 *   - lastWarningAt: When last warning was issued
 *   - isSuspended: Currently suspended? (boolean)
 *   - suspendedUntil: When suspension ends (if applicable)
 *   - suspendReason: Why they were suspended
 *   - isBanned: Currently banned? (boolean)
 *   - bannedAt: When they were banned
 *   - banReason: Why they were banned
 *   - status: Current account status ('active', 'suspended', 'disabled')
 *
 * @throws {Error} "User not found" if target user doesn't exist
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const summary = await getModerationSummary('user789');
 *
 * // Quick status check
 * if (summary.status === 'suspended') {
 *   // User can't log in, they're in timeout
 * }
 *
 * // Check escalation level
 * if (summary.recentWarnings >= 3) {
 *   // Consider suspension if not already
 * }
 *
 * // Check if they're a repeat offender
 * if (summary.warningCount >= 5) {
 *   // Long history of violations, stricter action needed
 * }
 *
 * // Check suspension status for appeal request
 * if (summary.isSuspended) {
 *   if (summary.suspendedUntil && summary.suspendedUntil < new Date()) {
 *     // Suspension period has expired, could auto-unsuspend
 *   } else if (!summary.suspendedUntil) {
 *     // Indefinite suspension, requires explicit appeal review
 *   }
 * }
 * ```
 *
 * INTERPRETATION GUIDE:
 * - recentWarnings >= 2: Repeat offender in last 90 days
 * - isSuspended + recentWarnings > 0: Pattern not improving
 * - warningCount >= 5: Chronic violator
 * - isBanned: Serious enforcement (reversals are rare)
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
