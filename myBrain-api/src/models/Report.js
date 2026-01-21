/**
 * =============================================================================
 * REPORT.JS - Content/User Reporting Data Model
 * =============================================================================
 *
 * This file defines the Report model - the data structure for tracking
 * user reports about inappropriate content or behavior in myBrain.
 *
 * WHAT IS A REPORT?
 * -----------------
 * A report is when a user flags content or another user for violating
 * community guidelines. Reports help moderators identify and address
 * problems on the platform.
 *
 * EXAMPLES OF REPORTS:
 * - "This message contains hate speech"
 * - "This user is sending spam"
 * - "This file violates copyright"
 * - "This user is impersonating someone"
 *
 * WHAT CAN BE REPORTED?
 * ---------------------
 * - Users: Report a user's behavior
 * - Messages: Report a specific message
 * - Projects/Tasks/Notes: Report shared content
 * - Files: Report uploaded files
 * - Shares: Report shared items
 * - Comments: Report inappropriate comments
 *
 * REPORT REASONS:
 * ---------------
 * Each report must specify a reason:
 * - spam: Unwanted promotional content
 * - harassment: Bullying, threats, or intimidation
 * - hate_speech: Discriminatory content
 * - inappropriate_content: NSFW or offensive material
 * - impersonation: Pretending to be someone else
 * - copyright: Stolen or pirated content
 * - privacy_violation: Sharing private information
 * - scam: Fraudulent activity
 * - other: Anything else
 *
 * REPORT LIFECYCLE:
 * -----------------
 * 1. PENDING: Report submitted, waiting for review
 * 2. REVIEWING: Moderator is investigating
 * 3. RESOLVED: Action taken (warning, content removed, user banned)
 * 4. DISMISSED: Report was invalid or no action needed
 *
 * PRIORITY LEVELS:
 * ----------------
 * Reports are prioritized for moderator attention:
 * - LOW: Minor issues (spam)
 * - MEDIUM: Standard issues (default)
 * - HIGH: Serious issues (harassment, hate speech, scams)
 * - CRITICAL: Urgent issues requiring immediate attention
 *
 * CONTENT SNAPSHOT:
 * -----------------
 * When a report is filed, we save a copy of the reported content.
 * This is important because:
 * - The content might be deleted before review
 * - Shows exactly what was reported
 * - Provides evidence for moderation decisions
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
// REPORT SCHEMA DEFINITION
// =============================================================================

/**
 * The Report Schema
 * -----------------
 * Defines all the fields a Report document can have.
 */
const reportSchema = new mongoose.Schema({

  // ===========================================================================
  // REPORTER
  // ===========================================================================

  /**
   * reporterId: The user who submitted the report
   * - Required: Every report has a reporter
   * - References: Points to a User document
   * - Index: For finding reports by a specific user
   *
   * This is WHO is making the report.
   */
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // REPORTED ENTITY
  // ===========================================================================

  /**
   * targetType: What kind of thing is being reported
   * - Required: Must specify what's being reported
   *
   * VALUES:
   * - 'user': Reporting a user's behavior/profile
   * - 'message': Reporting a chat message
   * - 'project': Reporting a project
   * - 'task': Reporting a task
   * - 'note': Reporting a note
   * - 'file': Reporting a file
   * - 'share': Reporting a shared item
   * - 'comment': Reporting a comment
   */
  targetType: {
    type: String,
    enum: ['user', 'message', 'project', 'task', 'note', 'file', 'share', 'comment'],
    required: true
  },

  /**
   * targetId: The ID of the thing being reported
   * - Required: Must specify which item
   * - Index: For finding reports about a specific item
   *
   * This could be a User ID, Message ID, Project ID, etc.
   */
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  /**
   * reportedUserId: The user who is being reported (if applicable)
   * - Optional: Set when targetType is 'user' or when a user owns the content
   * - Index: For finding all reports about a specific user
   *
   * This makes it easy to find "all reports about User X"
   * regardless of whether they reported the user directly or their content.
   */
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // ===========================================================================
  // REPORT REASON
  // ===========================================================================

  /**
   * reason: Why the content/user is being reported
   * - Required: Must specify a reason
   *
   * VALUES:
   * - 'spam': Unwanted promotional or repetitive content
   * - 'harassment': Bullying, threats, or intimidation
   * - 'hate_speech': Discriminatory language or content
   * - 'inappropriate_content': NSFW, violent, or disturbing material
   * - 'impersonation': Pretending to be another person or entity
   * - 'copyright': Content that violates copyright/intellectual property
   * - 'privacy_violation': Sharing someone's private information
   * - 'scam': Fraudulent or deceptive content/behavior
   * - 'other': Any other violation not covered above
   */
  reason: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_content',
      'impersonation',
      'copyright',
      'privacy_violation',
      'scam',
      'other'
    ],
    required: true
  },

  /**
   * description: Additional details about the report
   * - Optional: Reporter can explain the issue
   * - Max 1000 characters
   *
   * EXAMPLE: "This user has sent me 15 unsolicited sales messages
   * after I asked them to stop. See the attached screenshots."
   */
  description: {
    type: String,
    maxlength: 1000
  },

  // ===========================================================================
  // CONTENT SNAPSHOT
  // ===========================================================================

  /**
   * contentSnapshot: Copy of the reported content at time of report
   * - Optional but recommended
   * - Mixed type: Can store any shape of data
   *
   * WHY SAVE A SNAPSHOT?
   * - Content might be deleted before moderator reviews
   * - Shows exactly what was reported
   * - Provides evidence for the decision
   *
   * EXAMPLE for a message report:
   * {
   *   content: "The offensive message text",
   *   sentAt: "2024-01-15T10:30:00Z",
   *   conversationId: "..."
   * }
   */
  contentSnapshot: {
    type: mongoose.Schema.Types.Mixed
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * status: Current state of the report in the review process
   * - Default: 'pending' (waiting for review)
   * - Index: For finding reports by status
   *
   * VALUES:
   * - 'pending': Report submitted, waiting for moderator review
   * - 'reviewing': Moderator is currently investigating
   * - 'resolved': Review complete, action taken
   * - 'dismissed': Report was invalid or no action needed
   */
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  // ===========================================================================
  // RESOLUTION
  // ===========================================================================

  /**
   * resolution: Details about how the report was handled
   * - Filled in when status changes to 'resolved' or 'dismissed'
   */
  resolution: {
    /**
     * resolvedBy: The admin/moderator who handled the report
     */
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /**
     * resolvedAt: When the report was resolved
     */
    resolvedAt: Date,

    /**
     * action: What action was taken
     *
     * VALUES:
     * - 'no_action': Report reviewed, no action needed
     * - 'warning': User received a warning
     * - 'content_removed': Reported content was deleted
     * - 'user_suspended': User temporarily suspended
     * - 'user_banned': User permanently banned
     */
    action: {
      type: String,
      enum: ['no_action', 'warning', 'content_removed', 'user_suspended', 'user_banned']
    },

    /**
     * notes: Moderator's notes about the resolution
     * - Why they made this decision
     * - Any additional context
     */
    notes: String
  },

  // ===========================================================================
  // PRIORITY
  // ===========================================================================

  /**
   * priority: How urgent this report is
   * - Default: 'medium'
   * - Determined automatically based on reason, or set by moderator
   *
   * VALUES:
   * - 'low': Minor issues, can be reviewed later (spam)
   * - 'medium': Standard priority (default)
   * - 'high': Serious issues, review soon (harassment, hate speech)
   * - 'critical': Urgent, review immediately (safety concerns)
   *
   * AUTOMATIC ASSIGNMENT:
   * - harassment, hate_speech, scam → 'high'
   * - spam → 'low'
   * - everything else → 'medium'
   */
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the report was submitted
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Moderator Queue
 * -------------------------
 * Find pending reports sorted by priority (high first) and date (old first).
 * Used for the moderator dashboard queue.
 */
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });

/**
 * Index for User Reports
 * ----------------------
 * Find all reports about a specific user.
 */
reportSchema.index({ reportedUserId: 1, status: 1 });

/**
 * Index for Target Reports
 * ------------------------
 * Find all reports about a specific item (by type and ID).
 */
reportSchema.index({ targetType: 1, targetId: 1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getPendingReports(options)
 * --------------------------
 * Get reports for the moderator queue.
 *
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - status: Filter by status (default 'pending')
 *   - priority: Filter by priority
 *   - targetType: Filter by what's being reported
 * @returns {Array} - Array of Report documents sorted by priority
 *
 * EXAMPLE:
 * // Get high-priority pending reports
 * const urgentReports = await Report.getPendingReports({
 *   priority: 'high',
 *   limit: 20
 * });
 */
reportSchema.statics.getPendingReports = async function(options = {}) {
  const {
    limit = 50,
    skip = 0,
    status = 'pending',
    priority = null,
    targetType = null
  } = options;

  // Build query
  const query = { status };

  if (priority) {
    query.priority = priority;
  }
  if (targetType) {
    query.targetType = targetType;
  }

  return this.find(query)
    .populate('reporterId', 'email profile.displayName profile.avatarUrl')
    .populate('reportedUserId', 'email profile.displayName profile.avatarUrl')
    .sort({ priority: -1, createdAt: -1 }) // High priority first, then oldest
    .skip(skip)
    .limit(limit);
};

/**
 * getReportsForUser(userId, options)
 * ----------------------------------
 * Get all reports about a specific user.
 * Used to review a user's report history.
 *
 * @param {string} userId - The reported user's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of Report documents
 */
reportSchema.statics.getReportsForUser = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({ reportedUserId: userId })
    .populate('reporterId', 'email profile.displayName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getReportCounts()
 * -----------------
 * Get count of reports by status.
 * Used for the moderator dashboard summary.
 *
 * @returns {Object} - { pending, reviewing, resolved, dismissed, total }
 *
 * EXAMPLE:
 * const counts = await Report.getReportCounts();
 * // { pending: 15, reviewing: 3, resolved: 142, dismissed: 28, total: 188 }
 */
reportSchema.statics.getReportCounts = async function() {
  // Use aggregation to count by status
  const pipeline = [
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];

  const results = await this.aggregate(pipeline);

  // Initialize counts object
  const counts = {
    pending: 0,
    reviewing: 0,
    resolved: 0,
    dismissed: 0,
    total: 0
  };

  // Fill in counts from aggregation results
  results.forEach(r => {
    counts[r._id] = r.count;
    counts.total += r.count;
  });

  return counts;
};

/**
 * createReport(data)
 * ------------------
 * Create a new report with automatic priority assignment.
 *
 * @param {Object} data:
 *   - reporterId: Who is reporting
 *   - targetType: What type of thing
 *   - targetId: Which item
 *   - reportedUserId: User being reported (optional)
 *   - reason: Why they're reporting
 *   - description: Additional details (optional)
 *   - contentSnapshot: Copy of the content (optional)
 * @returns {Object} - The created Report document
 * @throws {Error} - If user already reported this item
 *
 * FEATURES:
 * - Prevents duplicate reports (same reporter, same target)
 * - Auto-assigns priority based on reason
 */
reportSchema.statics.createReport = async function(data) {
  const {
    reporterId,
    targetType,
    targetId,
    reportedUserId,
    reason,
    description,
    contentSnapshot
  } = data;

  // Check for existing report from same user about same target
  const existingReport = await this.findOne({
    reporterId,
    targetType,
    targetId,
    status: { $in: ['pending', 'reviewing'] } // Only check active reports
  });

  if (existingReport) {
    throw new Error('You have already reported this content');
  }

  // Automatically determine priority based on reason
  let priority = 'medium';
  if (['harassment', 'hate_speech', 'scam'].includes(reason)) {
    priority = 'high'; // Serious issues get high priority
  } else if (reason === 'spam') {
    priority = 'low'; // Spam is lower priority
  }

  // Create the report
  const report = new this({
    reporterId,
    targetType,
    targetId,
    reportedUserId,
    reason,
    description,
    contentSnapshot,
    priority
  });

  await report.save();
  return report;
};

// =============================================================================
// INSTANCE METHODS (Called on a Report document)
// =============================================================================

/**
 * resolve(adminId, action, notes)
 * -------------------------------
 * Mark this report as resolved with an action taken.
 *
 * @param {string} adminId - The admin/moderator resolving the report
 * @param {string} action - What action was taken
 * @param {string} notes - Notes about the resolution
 * @returns {Object} - The updated Report document
 *
 * EXAMPLE:
 * await report.resolve(adminId, 'content_removed', 'Violated ToS section 5.2');
 */
reportSchema.methods.resolve = async function(adminId, action, notes) {
  this.status = 'resolved';
  this.resolution = {
    resolvedBy: adminId,
    resolvedAt: new Date(),
    action,
    notes
  };
  await this.save();
  return this;
};

/**
 * dismiss(adminId, notes)
 * -----------------------
 * Mark this report as dismissed (no action needed).
 *
 * @param {string} adminId - The admin/moderator dismissing the report
 * @param {string} notes - Why the report was dismissed
 * @returns {Object} - The updated Report document
 *
 * EXAMPLE:
 * await report.dismiss(adminId, 'Content does not violate guidelines');
 */
reportSchema.methods.dismiss = async function(adminId, notes) {
  this.status = 'dismissed';
  this.resolution = {
    resolvedBy: adminId,
    resolvedAt: new Date(),
    action: 'no_action',
    notes
  };
  await this.save();
  return this;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Report model from the schema.
 * This gives us methods to:
 * - Get reports: Report.getPendingReports(), getReportsForUser()
 * - Get counts: Report.getReportCounts()
 * - Create reports: Report.createReport(data)
 * - Resolve reports: report.resolve(adminId, action, notes)
 * - Dismiss reports: report.dismiss(adminId, notes)
 */
const Report = mongoose.model('Report', reportSchema);

export default Report;
