/**
 * =============================================================================
 * SECURITYALERT.JS - Security Alert Data Model
 * =============================================================================
 *
 * This file defines the SecurityAlert model - the data structure for tracking
 * security-related events in myBrain. Security alerts notify users of suspicious
 * activity on their accounts.
 *
 * WHAT IS A SECURITY ALERT?
 * -------------------------
 * A security alert is a record of something security-relevant that happened:
 * - Someone logged in from a new device
 * - Someone logged in from a new location
 * - Multiple failed login attempts (brute force detection)
 * - Impossible travel detected (NYC then Tokyo in 1 hour)
 * - Password was changed
 * - Session was revoked
 *
 * WHY TRACK SECURITY ALERTS?
 * --------------------------
 * 1. USER AWARENESS: Users can see and review suspicious activity
 * 2. ACCOUNT PROTECTION: Detect if someone else has access
 * 3. AUDIT TRAIL: Track security events for investigation
 * 4. PROACTIVE SECURITY: Alert users before damage occurs
 *
 * ALERT TYPES:
 * ------------
 * - new_device: First login from unrecognized device
 * - new_location: First login from new city/country
 * - failed_login_burst: 3+ failed logins in 15 minutes
 * - password_changed: Password was changed
 * - email_changed: Email was changed
 * - session_revoked: A session was terminated
 * - impossible_travel: Login from distant location too quickly
 * - suspicious_ip: Known malicious IP (future)
 *
 * SEVERITY LEVELS:
 * ----------------
 * - info: Just informational (new device, new location)
 * - warning: User should be aware (3 failed logins)
 * - critical: Immediate attention needed (5+ failed logins, impossible travel)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// SECURITY ALERT SCHEMA DEFINITION
// =============================================================================

const securityAlertSchema = new mongoose.Schema({

  // ===========================================================================
  // IDENTITY
  // ===========================================================================

  /**
   * userId: Which user this alert belongs to
   * - Required: Every alert has an owner
   * - Index: For fast lookup of user's alerts
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // ALERT TYPE
  // ===========================================================================

  /**
   * alertType: What kind of security event this is
   * - Required: We need to know what happened
   * - Index: For filtering by alert type
   *
   * VALUES:
   * - 'new_device': Browser/device fingerprint not seen in 90 days
   * - 'new_location': City+Country not seen in 90 days
   * - 'failed_login_burst': Multiple failed login attempts
   * - 'password_changed': User changed their password
   * - 'email_changed': User changed their email
   * - 'session_revoked': A session was terminated
   * - 'impossible_travel': Login speed exceeds 1000 km/h
   * - 'suspicious_ip': Known malicious IP (future feature)
   */
  alertType: {
    type: String,
    enum: [
      'new_device',
      'new_location',
      'failed_login_burst',
      'password_changed',
      'email_changed',
      'session_revoked',
      'impossible_travel',
      'suspicious_ip'
    ],
    required: true,
    index: true
  },

  // ===========================================================================
  // SEVERITY
  // ===========================================================================

  /**
   * severity: How urgent is this alert?
   * - info: Just informational (new device, new location)
   * - warning: User should be aware (3 failed logins)
   * - critical: Immediate attention needed (5+ failed logins, impossible travel)
   *
   * SEVERITY MAPPING:
   * - new_device → info
   * - new_location → info
   * - failed_login_burst (3) → warning
   * - failed_login_burst (5+) → critical
   * - password_changed → info
   * - impossible_travel → critical
   */
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },

  // ===========================================================================
  // DISPLAY CONTENT
  // ===========================================================================

  /**
   * title: Short description of what happened
   * EXAMPLES: "New device sign-in", "Multiple failed login attempts"
   */
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  /**
   * description: More detailed explanation
   * EXAMPLES: "Signed in from Chrome on Windows", "5 failed attempts in 15 minutes"
   */
  description: {
    type: String,
    maxlength: 1000
  },

  // ===========================================================================
  // METADATA (CONTEXT)
  // ===========================================================================

  /**
   * metadata: Additional data about the alert
   * Varies by alert type - stores relevant context
   */
  metadata: {
    // For all alerts
    sessionId: String,   // Related session (if applicable)
    ip: String,          // IP address involved
    device: String,      // Device description (e.g., "Chrome on Windows")
    location: String,    // Location description (e.g., "New York, United States")

    // For failed_login_burst
    attemptCount: Number,

    // For impossible_travel
    fromLocation: String,
    toLocation: String,
    distanceKm: Number,
    timeHours: Number,
    requiredSpeedKmH: Number
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * status: Current state of the alert
   * - unread: User hasn't seen it yet
   * - read: User has viewed it
   * - dismissed: User acknowledged and dismissed it
   */
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed'],
    default: 'unread',
    index: true
  },

  /**
   * readAt: When the alert was marked as read
   */
  readAt: Date,

  /**
   * dismissedAt: When the alert was dismissed
   */
  dismissedAt: Date,

  // ===========================================================================
  // TTL (TIME TO LIVE)
  // ===========================================================================

  /**
   * expiresAt: When this alert should be automatically deleted
   * - Set based on severity when alert is created
   * - Critical: 1 year (important for audit trail)
   * - Warning: 90 days
   * - Info: 30 days
   * - NOTE: Index is created via TTL index below, not here
   */
  expiresAt: {
    type: Date,
    required: true
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the document was created
   * - updatedAt: When the document was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for User's Alerts by Date
 * Find a user's alerts sorted by newest first.
 */
securityAlertSchema.index({ userId: 1, createdAt: -1 });

/**
 * Index for User's Unread Alerts
 * Quickly find unread alerts for the badge count.
 */
securityAlertSchema.index({ userId: 1, status: 1, createdAt: -1 });

/**
 * Index for Deduplication
 * Check if similar alert exists within time window.
 */
securityAlertSchema.index({ userId: 1, alertType: 1, createdAt: -1 });

/**
 * TTL Index for Automatic Cleanup
 * MongoDB automatically deletes documents when expiresAt time passes.
 * expireAfterSeconds: 0 means delete exactly when expiresAt arrives.
 */
securityAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * calculateExpiresAt(severity)
 * ----------------------------
 * Calculate expiration date based on alert severity.
 * Critical alerts are kept longer for audit purposes.
 *
 * @param {string} severity - 'info', 'warning', or 'critical'
 * @returns {Date} When the alert should expire
 */
function calculateExpiresAt(severity) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (severity) {
    case 'critical':
      // Keep critical alerts for 1 year (important for security audits)
      return new Date(now + 365 * DAY_MS);
    case 'warning':
      // Keep warning alerts for 90 days
      return new Date(now + 90 * DAY_MS);
    case 'info':
    default:
      // Keep info alerts for 30 days
      return new Date(now + 30 * DAY_MS);
  }
}

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * createAlert(data)
 * -----------------
 * Create a new security alert with 1-hour deduplication.
 * If an identical alert type was created in the last hour,
 * return the existing one instead of creating a duplicate.
 *
 * @param {Object} data - Alert data
 *   - userId: User this alert is for (required)
 *   - alertType: Type of alert (required)
 *   - severity: 'info', 'warning', or 'critical' (default: 'info')
 *   - title: Short description (required)
 *   - description: Longer explanation
 *   - metadata: Additional context
 * @returns {Promise<SecurityAlert>} Created or existing alert
 *
 * DEDUPLICATION:
 * We don't want to spam users with identical alerts.
 * If someone logs in from a new device 5 times in an hour,
 * they should only see 1 "new device" alert, not 5.
 */
securityAlertSchema.statics.createAlert = async function(data) {
  const { userId, alertType, severity = 'info' } = data;

  // Check for recent duplicate (within 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentAlert = await this.findOne({
    userId,
    alertType,
    createdAt: { $gte: oneHourAgo }
  });

  // If we already have a recent alert of this type, don't create a duplicate
  if (recentAlert) {
    return recentAlert;
  }

  // Calculate expiration based on severity
  const expiresAt = calculateExpiresAt(severity);

  // Create the new alert
  return this.create({
    ...data,
    severity,
    expiresAt
  });
};

/**
 * getUnreadCount(userId)
 * ----------------------
 * Get the number of unread security alerts for a user.
 * Used for the alert badge count in the UI.
 *
 * @param {ObjectId|string} userId - User to count alerts for
 * @returns {Promise<number>} Count of unread alerts
 */
securityAlertSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, status: 'unread' });
};

/**
 * getAlerts(userId, options)
 * --------------------------
 * Get security alerts for a user with filtering options.
 *
 * @param {ObjectId|string} userId - User to get alerts for
 * @param {Object} options - Query options
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - status: Filter by status ('unread', 'read', 'dismissed')
 *   - severity: Filter by severity ('info', 'warning', 'critical')
 * @returns {Promise<Array>} Array of security alerts
 */
securityAlertSchema.statics.getAlerts = async function(userId, options = {}) {
  const { limit = 50, skip = 0, status, severity } = options;

  const query = { userId };

  if (status) {
    query.status = status;
  }

  if (severity) {
    query.severity = severity;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * markAsRead(alertId, userId)
 * ---------------------------
 * Mark a specific alert as read.
 *
 * @param {ObjectId|string} alertId - Alert to mark as read
 * @param {ObjectId|string} userId - User who owns the alert (for security)
 * @returns {Promise<SecurityAlert|null>} Updated alert or null if not found
 */
securityAlertSchema.statics.markAsRead = async function(alertId, userId) {
  return this.findOneAndUpdate(
    { _id: alertId, userId, status: 'unread' },
    { status: 'read', readAt: new Date() },
    { new: true }
  );
};

/**
 * dismiss(alertId, userId)
 * ------------------------
 * Dismiss a specific alert (user acknowledged it).
 *
 * @param {ObjectId|string} alertId - Alert to dismiss
 * @param {ObjectId|string} userId - User who owns the alert (for security)
 * @returns {Promise<SecurityAlert|null>} Updated alert or null if not found
 */
securityAlertSchema.statics.dismiss = async function(alertId, userId) {
  return this.findOneAndUpdate(
    { _id: alertId, userId },
    { status: 'dismissed', dismissedAt: new Date() },
    { new: true }
  );
};

/**
 * markAllAsRead(userId)
 * ---------------------
 * Mark all unread alerts as read for a user.
 *
 * @param {ObjectId|string} userId - User to update alerts for
 * @returns {Promise<Object>} MongoDB update result
 */
securityAlertSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, status: 'unread' },
    { status: 'read', readAt: new Date() }
  );
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert alert to clean JSON for API responses.
 *
 * @returns {Object} Alert data safe for client
 */
securityAlertSchema.methods.toSafeJSON = function() {
  return {
    id: this._id,
    alertType: this.alertType,
    severity: this.severity,
    title: this.title,
    description: this.description,
    metadata: this.metadata,
    status: this.status,
    readAt: this.readAt,
    dismissedAt: this.dismissedAt,
    createdAt: this.createdAt
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the SecurityAlert model from the schema.
 *
 * USAGE:
 * - SecurityAlert.createAlert(data) - Create with deduplication
 * - SecurityAlert.getUnreadCount(userId) - Get badge count
 * - SecurityAlert.getAlerts(userId, options) - Get user's alerts
 * - SecurityAlert.markAsRead(alertId, userId) - Mark as read
 * - SecurityAlert.dismiss(alertId, userId) - Dismiss alert
 *
 * IMPORTANT:
 * - Alerts auto-delete based on severity (30/90/365 days)
 * - 1-hour deduplication prevents alert spam
 * - Always verify userId when updating (security)
 */
const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);

export default SecurityAlert;
