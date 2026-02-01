/**
 * =============================================================================
 * FEEDBACK.JS - User Feedback & Bug Reporting Data Model
 * =============================================================================
 *
 * This file defines the Feedback model - the data structure for collecting and
 * managing user feedback, bug reports, feature requests, and general suggestions.
 *
 * WHAT IS FEEDBACK?
 * ----------------
 * Feedback is user-submitted input about the application. It can be:
 * - Bug reports: Something isn't working correctly
 * - Feature requests: Users suggesting new functionality
 * - General feedback: Comments, praise, suggestions
 * - Questions: Users asking for help
 *
 * KEY FEATURES:
 * - Privacy-first metadata capture (opt-in)
 * - Unique reference IDs for user tracking
 * - Cryptographic tokens for secure status lookups
 * - Admin management and response tracking
 * - Voting system for feature requests
 * - Automatic task creation in user's workflow
 *
 * LIFECYCLE:
 * - Created as 'new'
 * - Reviewed by admin ('in_review')
 * - Admin may ask for more info ('awaiting_reply')
 * - Work scheduled ('planned') or in progress ('in_progress')
 * - Completed ('resolved') and verified by user ('verified')
 * - Or closed if duplicate/won't fix ('closed')
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

/**
 * Crypto module for generating secure tokens.
 * Used to create unguessable tokens for public status lookups.
 */
import crypto from 'crypto';

// =============================================================================
// FEEDBACK SCHEMA DEFINITION
// =============================================================================

/**
 * The Feedback Schema
 * -------------------
 * Defines all the fields a Feedback document can have.
 */
const feedbackSchema = new mongoose.Schema({

  // ===========================================================================
  // REFERENCE AND SECURITY
  // ===========================================================================

  /**
   * referenceId: Human-readable unique identifier for user
   * - Format: FB-YYYY-XXXX (e.g., FB-2026-0142)
   * - Shown to user so they can track their feedback
   * - Unique index for fast lookups
   * - Generated in pre-save hook if not provided
   */
  referenceId: {
    type: String,
    unique: true,
    sparse: true, // Allow null during creation
    index: true
  },

  /**
   * statusToken: Cryptographic token for secure status lookups
   * - Unguessable random string (32 bytes hex = 64 chars)
   * - Used for public status endpoint: GET /api/feedback/status/:statusToken
   * - Prevents enumeration attacks (can't guess other feedback statuses)
   * - Unique index for fast lookups
   * - Generated in pre-save hook
   */
  statusToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  /**
   * statusTokenCreatedAt: When the status token was created/regenerated
   * - Used to implement 90-day token expiry
   * - Updated when status changes to 'resolved' (token rotation)
   * - Defaults to creation time
   */
  statusTokenCreatedAt: {
    type: Date,
    default: Date.now
  },

  // ===========================================================================
  // CLASSIFICATION
  // ===========================================================================

  /**
   * type: Category of feedback
   * - Required: Must specify what type of feedback this is
   * - Indexed: For filtering feedback by type
   *
   * VALUES:
   * - 'bug': Something is broken or not working as expected
   * - 'feature_request': User requesting new functionality
   * - 'general': General comments, praise, suggestions
   * - 'question': User asking for help or clarification
   */
  type: {
    type: String,
    enum: ['bug', 'feature_request', 'general', 'question'],
    required: true,
    index: true
  },

  /**
   * priority: How urgent/important this feedback is
   * - Set automatically based on feedback type and content
   * - Can be adjusted by admin
   *
   * VALUES:
   * - 'critical': Active breakage, major feature affected
   * - 'high': Important, should be fixed soon
   * - 'medium': Normal priority, can be scheduled
   * - 'low': Nice to have, lower urgency
   */
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
    index: true
  },

  /**
   * status: Current workflow state of the feedback
   * - Tracks where feedback is in the resolution process
   * - Indexed for filtering and querying
   *
   * VALUES:
   * - 'new': Just received, not yet reviewed
   * - 'in_review': Admin is reviewing the feedback
   * - 'awaiting_reply': Admin waiting for more info from user
   * - 'planned': Work has been scheduled
   * - 'in_progress': Currently being worked on
   * - 'resolved': Completed/fixed
   * - 'closed': Won't be worked on (duplicate, by design, etc.)
   * - 'verified': User confirmed the fix works
   */
  status: {
    type: String,
    enum: ['new', 'in_review', 'awaiting_reply', 'planned', 'in_progress', 'resolved', 'closed', 'verified'],
    default: 'new',
    index: true
  },

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  /**
   * title: Brief summary of the feedback
   * - Required: Every feedback item needs a concise title
   * - Max 100 characters: Keep it short and scannable
   * - Becomes the task title when a task is created
   *
   * EXAMPLES:
   * - "Login button not responding on mobile"
   * - "Dark mode contrast is too low"
   * - "Add ability to export tasks as CSV"
   */
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },

  /**
   * description: Detailed explanation of the feedback
   * - Optional: Can be left empty for simple feedback
   * - Max 2000 characters: Allows detailed bug reports or requests
   * - Included in created task's body
   *
   * EXAMPLES:
   * - "I tried clicking the login button three times and nothing happens"
   * - "The white text on light blue background is hard to read"
   * - "Would be useful to share weekly summaries with team"
   */
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },

  // ===========================================================================
  // SUBMITTER INFORMATION
  // ===========================================================================

  /**
   * submittedBy: Information about who submitted the feedback
   * - Captures user context without requiring login
   * - Allows follow-up communication
   */
  submittedBy: {
    /**
     * userId: The user who submitted (if authenticated)
     * - Optional: Guest users can submit without account
     * - Allows identifying feedback from same user
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    /**
     * email: Email for follow-up communication
     * - Provided by authenticated user or guest
     * - Used for sending status updates
     */
    email: String,

    /**
     * displayName: Name of person submitting
     * - Can be user's display name or guest-provided name
     * - For personalization in responses
     */
    displayName: String,

    /**
     * isAnonymous: User chose to remain anonymous
     * - Authenticated user may opt for anonymous feedback
     * - Affects what information is shared with admin
     */
    isAnonymous: {
      type: Boolean,
      default: false
    },

    /**
     * wantsUpdates: User wants to receive status updates
     * - True: Send notifications when status changes
     * - False: One-way feedback, no follow-up
     */
    wantsUpdates: {
      type: Boolean,
      default: true
    }
  },

  // ===========================================================================
  // CAPTURED CONTEXT (OPT-IN, REDACTED)
  // ===========================================================================

  /**
   * includedDiagnostics: Whether user opted-in to diagnostic capture
   * - Default: true for bug reports, false for other types
   * - Only set if user explicitly checked the box
   * - If false, context object should not contain sensitive data
   */
  includedDiagnostics: {
    type: Boolean,
    default: false
  },

  /**
   * context: Automatically captured environment and state data
   * - Only populated if includedDiagnostics is true
   * - All data is redacted to remove PII
   * - Helps reproduce and prioritize issues
   *
   * Privacy-first design: No personal data, no sensitive information
   */
  context: {
    /**
     * Browser environment information
     */
    browser: String,           // e.g., "Chrome 120"
    os: String,                // e.g., "Windows 11"
    screenSize: String,        // e.g., "1920x1080"
    viewport: String,          // e.g., "1280x720" (visible area)
    deviceType: String,        // e.g., "desktop", "mobile", "tablet"
    colorScheme: String,       // e.g., "dark", "light"

    /**
     * Application state (redacted)
     */
    currentUrl: String,        // Path only, no query params (e.g., "/dashboard")
    appVersion: String,        // e.g., "2.1.0"

    /**
     * User context (minimal, only if authenticated)
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    accountType: String,       // e.g., "premium", "free" (role tier only)

    /**
     * Error context (redacted - message only, no stack traces)
     * - Max 5 errors, captured from last 5 minutes only
     * - Messages redacted to remove sensitive paths/data
     */
    recentErrors: [{
      message: String,         // Error message only
      timestamp: Date
    }],

    /**
     * User action history (minimal)
     * - Max 10 actions, captured from last 2 minutes only
     * - Helps understand what led to the issue
     */
    recentActions: [{
      action: String,          // e.g., "click", "navigation", "form_submit"
      target: String,          // e.g., "create-task-btn", "/dashboard"
      timestamp: Date
    }],

    /**
     * Timestamp when diagnostics were captured
     */
    submittedAt: Date
  },

  // ===========================================================================
  // ATTACHMENTS (PHASE 2+)
  // ===========================================================================

  /**
   * attachments: Files attached to the feedback (screenshots, etc.)
   * - Optional: Not required for MVP
   * - Currently not captured in Phase 1
   * - Future: Screenshot uploads, screen recordings
   */
  attachments: [{
    type: {
      type: String,
      enum: ['screenshot', 'file'],
      default: 'screenshot'
    },
    url: String,               // S3 URL or file storage location
    filename: String,
    size: Number,              // File size in bytes
    mimeType: String           // e.g., "image/png"
  }],

  // ===========================================================================
  // ADMIN MANAGEMENT
  // ===========================================================================

  /**
   * assignedTo: Which admin is working on this feedback
   * - Optional: Admin ownership/assignment
   * - Helps distribute work and prevent duplicates
   */
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  /**
   * tags: Labels for organization and filtering
   * - Array of strings like ["mobile", "login", "critical", "new-user"]
   * - Auto-populated based on context and content
   * - Can be manually edited by admin
   * - Helps categorize and trend analysis
   */
  tags: {
    type: [String],
    default: [],
    index: true
  },

  /**
   * internalNotes: Admin-only notes about this feedback
   * - Not visible to user
   * - Tracks investigation, decisions, next steps
   */
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ===========================================================================
  // LINKED ITEMS
  // ===========================================================================

  /**
   * linkedTaskId: Reference to the created Task document
   * - Set when admin creates a task from this feedback
   * - Allows tracking feedback → task relationship
   * - Task does NOT have a back-reference to feedback
   */
  linkedTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },

  /**
   * linkedConversationId: Reference to a message conversation
   * - For two-way discussion with user
   * - Set if admin opens a chat thread about this feedback
   */
  linkedConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },

  /**
   * duplicateOf: If this is a duplicate, which feedback is it a duplicate of
   * - For merging duplicate reports
   * - Helps consolidate related feedback
   */
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    default: null
  },

  // ===========================================================================
  // RESOLUTION
  // ===========================================================================

  /**
   * resolution: Information about how the feedback was resolved
   * - Only populated when status changes to 'resolved' or 'closed'
   * - Tracks the outcome and decision
   */
  resolution: {
    /**
     * type: How this feedback was resolved
     * - 'fixed': Issue was fixed or feature was added
     * - 'wont_fix': Decided not to implement
     * - 'duplicate': Same issue already reported
     * - 'cannot_reproduce': Couldn't reproduce the issue
     * - 'by_design': Current behavior is intentional
     */
    type: {
      type: String,
      enum: ['fixed', 'wont_fix', 'duplicate', 'cannot_reproduce', 'by_design']
    },

    /**
     * notes: Explanation of the resolution
     * - Shared with user (visible, unlike internalNotes)
     * - Explains why and what was done
     */
    notes: String,

    /**
     * resolvedBy: Which admin resolved it
     */
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /**
     * resolvedAt: When it was marked resolved
     * - Set automatically when status → 'resolved'
     */
    resolvedAt: Date,

    /**
     * fixedInVersion: What version includes the fix
     * - e.g., "2.1.0"
     * - Helps users know when fix will be available
     */
    fixedInVersion: String
  },

  // ===========================================================================
  // USER VERIFICATION
  // ===========================================================================

  /**
   * userVerification: Whether user confirmed the fix works
   * - Only relevant for bug reports
   * - Tracks if user has verified the resolution
   */
  userVerification: {
    /**
     * verified: User confirmed fix works
     */
    verified: {
      type: Boolean,
      default: false
    },

    /**
     * verifiedAt: When user verified
     */
    verifiedAt: Date,

    /**
     * helpful: Was the admin's response helpful
     * - Part of "Was this helpful?" feedback
     */
    helpful: Boolean,

    /**
     * comment: Additional feedback from user
     * - e.g., "Works great now, thanks!"
     */
    comment: String
  },

  // ===========================================================================
  // FEATURE REQUEST VOTING
  // ===========================================================================

  /**
   * votes: Voting system for feature requests
   * - Allows users to upvote features they want
   * - Helps prioritize work based on demand
   */
  votes: {
    /**
     * count: Number of votes received
     */
    count: {
      type: Number,
      default: 0
    },

    /**
     * voters: Array of user IDs who voted
     * - Prevents duplicate votes from same user
     */
    voters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // ===========================================================================
  // TIMESTAMPS
  // ===========================================================================

  /**
   * createdAt: When feedback was submitted
   * - Set automatically by MongoDB timestamps
   * - Used for sorting and analytics
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  /**
   * updatedAt: When feedback was last modified
   * - Set automatically by MongoDB timestamps
   * - Tracks latest activity
   */
  updatedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * firstResponseAt: When admin first responded
   * - Tracks response time metric
   * - Goal: < 24 hours
   */
  firstResponseAt: Date,

  /**
   * resolvedAt: When feedback was marked resolved
   * - Tracks resolution time metric
   * - Goal: < 7 days
   * - Also stored in resolution.resolvedAt
   */
  resolvedAt: Date

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When feedback was created
   * - updatedAt: When feedback was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for reference ID (unique, for user lookups)
 * Used when: User provides reference ID to check status
 */
feedbackSchema.index({ referenceId: 1 }, { unique: true, sparse: true });

/**
 * Index for status token (unique, for public status endpoint)
 * Used when: Public status check without authentication
 */
feedbackSchema.index({ statusToken: 1 }, { unique: true, sparse: true });

/**
 * Index for status and creation date (sorting/filtering)
 * Used when: Admin lists feedback by status and date
 */
feedbackSchema.index({ status: 1, createdAt: -1 });

/**
 * Index for type and status (filtering)
 * Used when: Admin filters by feedback type (bug, feature, etc.)
 */
feedbackSchema.index({ type: 1, status: 1 });

/**
 * Index for submitter user ID (tracking user's feedback)
 * Used when: Finding all feedback from a specific user
 */
feedbackSchema.index({ 'submittedBy.userId': 1 });

/**
 * Index for tags (filtering)
 * Used when: Finding feedback with specific tags
 */
feedbackSchema.index({ tags: 1 });

/**
 * Index for vote count (sorting by popularity)
 * Used when: Ranking feature requests by community interest
 */
feedbackSchema.index({ 'votes.count': -1 });

/**
 * Compound index for common admin queries
 * Used when: Admin lists new feedback with high priority
 */
feedbackSchema.index({ status: 1, priority: -1, createdAt: -1 });

// =============================================================================
// PRE-SAVE HOOKS
// =============================================================================

/**
 * Generate referenceId and statusToken before saving
 * Called automatically when creating new feedback
 */
feedbackSchema.pre('save', async function(next) {
  // Only generate on new documents
  if (this.isNew) {
    // Generate referenceId if not provided
    if (!this.referenceId) {
      // Format: FB-YYYY-XXXX
      // Example: FB-2026-0142
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.referenceId = `FB-${year}-${randomNum}`;
    }

    // Generate statusToken if not provided
    if (!this.statusToken) {
      // Cryptographically random token (32 bytes = 64 hex chars)
      // Unguessable, suitable for public status lookups
      this.statusToken = crypto.randomBytes(32).toString('hex');
    }

    // Set statusTokenCreatedAt
    this.statusTokenCreatedAt = new Date();
  }

  next();
});

/**
 * If status changes to 'resolved', regenerate statusToken for security
 * This prevents old tokens from accessing resolved feedback
 * Called when admin marks feedback as resolved
 */
feedbackSchema.pre('save', async function(next) {
  // Check if status changed to 'resolved'
  if (this.isModified('status') && this.status === 'resolved') {
    // Rotate the token
    this.statusToken = crypto.randomBytes(32).toString('hex');
    this.statusTokenCreatedAt = new Date();
  }

  next();
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * -----------
 * Convert feedback to clean JSON for API responses.
 * Removes sensitive internal data.
 *
 * @returns {Object} - Clean feedback object
 */
feedbackSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.statusToken;  // Never expose token in normal responses
  return obj;
};

/**
 * getPublicStatus()
 * ----------------
 * Get minimal status info for public status endpoint.
 * Returns only what user should see.
 *
 * @returns {Object} - { status, lastUpdated }
 */
feedbackSchema.methods.getPublicStatus = function() {
  return {
    status: this.status,
    lastUpdated: this.updatedAt
    // NO: submitter info, feedback content, admin notes, linked task details
  };
};

/**
 * isTokenExpired()
 * ---------------
 * Check if status token has expired (90 days).
 * Used to validate tokens in public status endpoint.
 *
 * @returns {boolean} - true if token is older than 90 days
 */
feedbackSchema.methods.isTokenExpired = function() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return this.statusTokenCreatedAt < ninetyDaysAgo;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * findByStatusToken(token)
 * -----------------------
 * Find feedback by its public status token.
 * Used for public status lookups.
 *
 * @param {string} token - The status token
 * @returns {Object|null} - Feedback document or null if not found
 */
feedbackSchema.statics.findByStatusToken = async function(token) {
  const feedback = await this.findOne({ statusToken: token });

  // Check if token is expired
  if (feedback && feedback.isTokenExpired()) {
    return null; // Treat expired tokens as not found
  }

  return feedback;
};

/**
 * findByReferenceId(refId)
 * -----------------------
 * Find feedback by its human-readable reference ID.
 * Used for user lookups.
 *
 * @param {string} refId - The reference ID (e.g., "FB-2026-0142")
 * @returns {Object|null} - Feedback document or null if not found
 */
feedbackSchema.statics.findByReferenceId = async function(refId) {
  return this.findOne({ referenceId: refId });
};

/**
 * getFeedbackByUser(userId, options)
 * ---------------------------------
 * Get all feedback from a specific user.
 *
 * @param {string} userId - User ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - status: Filter by status
 * @returns {Array} - Array of feedback documents
 */
feedbackSchema.statics.getFeedbackByUser = async function(userId, options = {}) {
  const { limit = 50, skip = 0, status = null } = options;

  const query = { 'submittedBy.userId': userId };

  if (status && status !== 'all') {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getUnreadCount(adminId)
 * -----------------------
 * Get count of new feedback (unreviewed).
 * Used for admin notification badge.
 *
 * @param {string} adminId - Admin user ID
 * @returns {number} - Count of 'new' status feedback
 */
feedbackSchema.statics.getUnreadCount = async function(adminId) {
  return this.countDocuments({ status: 'new' });
};

/**
 * addInternalNote(feedbackId, userId, note)
 * -----------------------------------------
 * Add an internal note to feedback.
 * Only visible to admins.
 *
 * @param {string} feedbackId - Feedback ID
 * @param {string} userId - Admin user ID
 * @param {string} note - The note text
 * @returns {Object} - Updated feedback document
 */
feedbackSchema.statics.addInternalNote = async function(feedbackId, userId, note) {
  return this.findByIdAndUpdate(
    feedbackId,
    {
      $push: {
        internalNotes: {
          note,
          addedBy: userId,
          addedAt: new Date()
        }
      },
      $set: { updatedAt: new Date() }
    },
    { new: true }
  );
};

/**
 * addVote(feedbackId, userId)
 * ---------------------------
 * Add a vote to feedback (feature request upvoting).
 * Prevents duplicate votes from same user.
 *
 * @param {string} feedbackId - Feedback ID
 * @param {string} userId - User voting
 * @returns {Object} - Updated feedback document
 */
feedbackSchema.statics.addVote = async function(feedbackId, userId) {
  return this.findByIdAndUpdate(
    feedbackId,
    {
      $addToSet: { 'votes.voters': userId },
      $inc: { 'votes.count': 1 }
    },
    { new: true }
  );
};

/**
 * removeVote(feedbackId, userId)
 * ------------------------------
 * Remove a vote from feedback.
 *
 * @param {string} feedbackId - Feedback ID
 * @param {string} userId - User removing vote
 * @returns {Object} - Updated feedback document
 */
feedbackSchema.statics.removeVote = async function(feedbackId, userId) {
  return this.findByIdAndUpdate(
    feedbackId,
    {
      $pull: { 'votes.voters': userId },
      $inc: { 'votes.count': -1 }
    },
    { new: true }
  );
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Feedback model from the schema.
 * This gives us methods to:
 * - Create feedback: Feedback.create({ userId, title })
 * - Find feedback: Feedback.findById(id), Feedback.findByStatusToken(token)
 * - Update feedback: Feedback.findByIdAndUpdate(id, updates)
 * - Get user feedback: Feedback.getFeedbackByUser(userId)
 * - Add notes: Feedback.addInternalNote(id, userId, note)
 * - Vote on features: Feedback.addVote(id, userId)
 */
const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
