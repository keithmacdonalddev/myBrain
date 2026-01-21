/**
 * =============================================================================
 * MODERATIONACTION.JS - Admin Moderation Actions Log
 * =============================================================================
 *
 * This file defines the ModerationAction model - the data structure for
 * recording all moderation actions taken by administrators on users.
 *
 * WHAT IS A MODERATION ACTION?
 * ----------------------------
 * A moderation action is any administrative action taken on a user's account.
 * This includes warnings, suspensions, admin notes, and status changes.
 * Every action is permanently logged for accountability and history.
 *
 * WHY LOG MODERATION ACTIONS?
 * ---------------------------
 * 1. ACCOUNTABILITY: Track which admin did what and when
 * 2. HISTORY: See full moderation history for any user
 * 3. PATTERNS: Identify repeat offenders or escalating behavior
 * 4. APPEALS: Provide evidence if user disputes an action
 * 5. AUDITING: Review admin behavior for policy compliance
 *
 * ACTION TYPES:
 * -------------
 * 1. WARNING: Official warning to user about behavior
 *    - Has severity levels (1-3)
 *    - Multiple warnings may lead to suspension
 *
 * 2. SUSPENSION: Temporarily disable user's account
 *    - Has an end date (suspendedUntil)
 *    - User cannot log in during suspension
 *
 * 3. UNSUSPEND: Lift a suspension early
 *    - Restores user access before scheduled end
 *
 * 4. NOTE: Admin note for internal documentation
 *    - Not visible to user
 *    - For admin-to-admin communication about user
 *
 * 5. STATUS_CHANGE: Change user's account status
 *    - Records previous and new status
 *    - E.g., changing from 'active' to 'inactive'
 *
 * EXAMPLE SCENARIO:
 * -----------------
 * User reported for spam:
 * 1. Admin reviews report
 * 2. Admin adds NOTE: "Reviewed spam report - appears valid"
 * 3. Admin issues WARNING (level 1): "First warning for spam"
 * 4. User continues spamming
 * 5. Admin issues SUSPENSION: "Repeated spam, 7-day suspension"
 * 6. After 7 days, user returns
 * 7. All these actions are logged and visible in user's history
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// MODERATION ACTION SCHEMA DEFINITION
// =============================================================================

/**
 * The Moderation Action Schema
 * ----------------------------
 * Defines all the fields a ModerationAction document can have.
 */
const moderationActionSchema = new mongoose.Schema({

  // ===========================================================================
  // PARTICIPANTS
  // ===========================================================================

  /**
   * targetUserId: The user this action was taken against
   * - Required: Every action targets a user
   * - Index: For finding all actions against a user
   *
   * This is the user receiving the warning, suspension, etc.
   */
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  /**
   * performedBy: The admin who performed this action
   * - Required: Must know who took the action
   *
   * For accountability - every action has an admin responsible.
   */
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ===========================================================================
  // ACTION DETAILS
  // ===========================================================================

  /**
   * actionType: What type of moderation action was taken
   * - Required: Must specify the action type
   *
   * VALUES:
   * - 'warning': Official warning about behavior
   * - 'suspension': Temporarily disable account
   * - 'unsuspend': Lift suspension early
   * - 'ban': Permanently ban user account
   * - 'unban': Lift permanent ban
   * - 'note': Internal admin note (not visible to user)
   * - 'status_change': Change account status
   */
  actionType: {
    type: String,
    enum: ['warning', 'suspension', 'unsuspend', 'ban', 'unban', 'note', 'status_change'],
    required: true
  },

  /**
   * reason: Why this action was taken
   * - Required: Must document the reason
   * - Max 1000 characters
   *
   * EXAMPLES:
   * - "First warning for posting spam content"
   * - "7-day suspension for repeated harassment"
   * - "Investigated report - no violation found"
   */
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // ===========================================================================
  // ACTION-SPECIFIC DETAILS
  // ===========================================================================

  /**
   * details: Additional information specific to the action type
   * - Different actions store different details here
   */
  details: {
    /**
     * warningLevel: Severity of warning (1-3)
     * - Only for 'warning' actions
     * - 1: Minor warning
     * - 2: Moderate warning
     * - 3: Severe/final warning
     *
     * ESCALATION:
     * Typically: 2-3 level 1 warnings → 1 level 2 → 1 level 3 → suspension
     */
    warningLevel: {
      type: Number,
      min: 1,
      max: 3
    },

    /**
     * suspendedUntil: When the suspension ends
     * - Only for 'suspension' actions
     * - User cannot access account until this date
     *
     * EXAMPLE: suspendedUntil: new Date('2024-02-01')
     * User regains access on February 1st, 2024
     */
    suspendedUntil: Date,

    /**
     * noteContent: Content of admin note
     * - Only for 'note' actions
     * - Longer text allowed (up to 5000 characters)
     * - For detailed internal documentation
     *
     * EXAMPLE:
     * "Spoke with user via email. They claim account was hacked.
     * Reviewed IP logs - suspicious activity confirmed. Reset password
     * and advised on security. Monitoring for further issues."
     */
    noteContent: {
      type: String,
      maxlength: 5000
    },

    /**
     * previousStatus: Account status before change
     * - Only for 'status_change' actions
     *
     * EXAMPLES: 'active', 'inactive', 'pending'
     */
    previousStatus: String,

    /**
     * newStatus: Account status after change
     * - Only for 'status_change' actions
     *
     * EXAMPLES: 'active', 'inactive', 'pending'
     */
    newStatus: String
  },

  // ===========================================================================
  // TIMESTAMP
  // ===========================================================================

  /**
   * createdAt: When the action was taken
   * - Default: Current time when created
   * - Index: For chronological queries
   *
   * Note: We use our own createdAt instead of timestamps: true
   * because we only need createdAt, not updatedAt.
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index for User Moderation History
 * ------------------------------------------
 * Quickly get all moderation actions for a user, sorted by date.
 * Used when viewing a user's moderation history in admin panel.
 */
moderationActionSchema.index({ targetUserId: 1, createdAt: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getHistory(targetUserId, options)
 * ---------------------------------
 * Get the full moderation history for a user.
 *
 * @param {string} targetUserId - User to get history for
 * @param {Object} options:
 *   - limit: Max actions to return (default 50)
 *   - skip: Pagination offset
 * @returns {Object} - { actions: [...], total: number }
 *
 * EXAMPLE:
 * const { actions, total } = await ModerationAction.getHistory(userId);
 * // actions: Array of moderation actions
 * // total: Total count (for pagination)
 *
 * USAGE:
 * Display in admin panel when viewing a user's profile.
 * Shows complete timeline of all moderation actions.
 */
moderationActionSchema.statics.getHistory = async function(targetUserId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  // Get actions with admin details populated
  const actions = await this.find({ targetUserId })
    .sort({ createdAt: -1 })  // Newest first
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'email profile.firstName profile.lastName');

  // Get total count for pagination
  const total = await this.countDocuments({ targetUserId });

  return { actions, total };
};

/**
 * logAction({ targetUserId, performedBy, actionType, reason, details })
 * ---------------------------------------------------------------------
 * Log a new moderation action.
 *
 * @param {Object} actionData:
 *   - targetUserId: User receiving the action
 *   - performedBy: Admin taking the action
 *   - actionType: Type of action
 *   - reason: Why the action was taken
 *   - details: Action-specific details (optional)
 * @returns {Object} - The created action document
 *
 * EXAMPLE - Warning:
 * await ModerationAction.logAction({
 *   targetUserId: userId,
 *   performedBy: adminId,
 *   actionType: 'warning',
 *   reason: 'Posting inappropriate content',
 *   details: { warningLevel: 1 }
 * });
 *
 * EXAMPLE - Suspension:
 * await ModerationAction.logAction({
 *   targetUserId: userId,
 *   performedBy: adminId,
 *   actionType: 'suspension',
 *   reason: 'Repeated violations after warnings',
 *   details: { suspendedUntil: new Date('2024-02-01') }
 * });
 *
 * EXAMPLE - Admin Note:
 * await ModerationAction.logAction({
 *   targetUserId: userId,
 *   performedBy: adminId,
 *   actionType: 'note',
 *   reason: 'Internal documentation',
 *   details: { noteContent: 'User requested account recovery...' }
 * });
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
 * getRecentWarningCount(targetUserId, days)
 * -----------------------------------------
 * Get the count of warnings issued to a user in the last N days.
 *
 * @param {string} targetUserId - User to check
 * @param {number} days - Number of days to look back (default 90)
 * @returns {number} - Count of warnings
 *
 * USAGE:
 * Helps admins decide severity of next action.
 * "User has 2 warnings in last 90 days - next violation = suspension"
 *
 * EXAMPLE:
 * const warningCount = await ModerationAction.getRecentWarningCount(userId, 90);
 * if (warningCount >= 3) {
 *   // Consider suspension instead of another warning
 * }
 */
moderationActionSchema.statics.getRecentWarningCount = async function(targetUserId, days = 90) {
  // Calculate the date N days ago
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Count warnings since that date
  return this.countDocuments({
    targetUserId,
    actionType: 'warning',
    createdAt: { $gte: since }
  });
};

// =============================================================================
// INSTANCE METHODS (Called on an action document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Formats populated admin data nicely.
 *
 * @returns {Object} - Safe JSON representation
 *
 * FORMATTING:
 * If performedBy is populated, formats the admin's name as:
 * - "John Smith" (if name available)
 * - "admin@example.com" (if no name)
 */
moderationActionSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();

  // Format performedBy if it's a populated User object
  if (obj.performedBy && typeof obj.performedBy === 'object') {
    obj.performedBy = {
      _id: obj.performedBy._id,
      email: obj.performedBy.email,
      // Build name from profile, fallback to email
      name: obj.performedBy.profile?.firstName
        ? `${obj.performedBy.profile.firstName} ${obj.performedBy.profile.lastName || ''}`.trim()
        : obj.performedBy.email
    };
  }

  return obj;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the ModerationAction model from the schema.
 * This gives us methods to:
 * - Log action: ModerationAction.logAction({ targetUserId, performedBy, ... })
 * - Get history: ModerationAction.getHistory(targetUserId)
 * - Get warnings: ModerationAction.getRecentWarningCount(targetUserId)
 * - Format for API: action.toSafeJSON()
 *
 * TYPICAL WORKFLOW:
 * 1. Admin reviews reported user or content
 * 2. Admin decides on appropriate action
 * 3. Action is logged with ModerationAction.logAction()
 * 4. User account is updated separately if needed (suspension, status change)
 * 5. History is viewable in admin panel via ModerationAction.getHistory()
 *
 * IMPORTANT:
 * Moderation actions are PERMANENT records. They should not be deleted.
 * This ensures accountability and complete audit trails.
 */
const ModerationAction = mongoose.model('ModerationAction', moderationActionSchema);

export default ModerationAction;
