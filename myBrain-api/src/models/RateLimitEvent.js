/**
 * =============================================================================
 * RATELIMITEVENT.JS - Rate Limit Event Tracking Model
 * =============================================================================
 *
 * This model tracks rate limit events for security monitoring and alerting.
 * When users hit rate limits (too many login attempts, etc.), we record the
 * event here for admin visibility and alert generation.
 *
 * WHY SEPARATE FROM LOGS?
 * -----------------------
 * While rate limit events are also logged in the general Log model, this
 * dedicated model provides:
 * 1. Faster queries for rate limit specific data
 * 2. Simpler aggregation for alerts (count by IP, email, etc.)
 * 3. Longer retention for security analysis
 * 4. Quick IP whitelisting actions
 *
 * USE CASES:
 * ----------
 * - Admin sees "5 rate limit events from IP X in last hour" alert
 * - Admin can view all rate limit events sorted by IP or email
 * - Admin can whitelist an IP directly from the event
 * - Security analysis of brute force attempts
 *
 * =============================================================================
 */

import mongoose from 'mongoose';

// =============================================================================
// RATE LIMIT EVENT SCHEMA
// =============================================================================

const rateLimitEventSchema = new mongoose.Schema({
  /**
   * ip: The IP address that hit the rate limit
   * - Required: Every rate limit event has an IP
   * - Index: For fast lookups by IP
   */
  ip: {
    type: String,
    required: true,
    index: true
  },

  /**
   * attemptedEmail: The email that was being used for login
   * - Optional: May be 'unknown' if not captured
   * - Index: For finding attempts targeting specific accounts
   */
  attemptedEmail: {
    type: String,
    default: 'unknown',
    index: true
  },

  /**
   * route: Which route triggered the rate limit
   * - Usually /auth/login or /auth/register
   */
  route: {
    type: String,
    required: true
  },

  /**
   * timestamp: When the rate limit event occurred
   * - Default: Current time
   * - Index: For time-based queries and TTL
   */
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  /**
   * userAgent: Browser/client information
   * - Helps identify bot vs human attempts
   */
  userAgent: {
    type: String,
    default: null
  },

  /**
   * origin: The origin header from the request
   * - Helps identify cross-origin attacks
   */
  origin: {
    type: String,
    default: null
  },

  /**
   * resolved: Whether this event has been addressed by an admin
   * - Used for alert dismissal
   */
  resolved: {
    type: Boolean,
    default: false
  },

  /**
   * resolvedBy: Admin who resolved this event
   */
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  /**
   * resolvedAt: When this event was resolved
   */
  resolvedAt: {
    type: Date,
    default: null
  },

  /**
   * action: What action was taken (if any)
   * - 'whitelisted': IP was added to whitelist
   * - 'dismissed': Event was dismissed without action
   * - null: No action taken yet
   */
  action: {
    type: String,
    enum: ['whitelisted', 'dismissed', null],
    default: null
  }
}, {
  timestamps: true
});

// =============================================================================
// INDEXES
// =============================================================================

// For finding recent events by IP
rateLimitEventSchema.index({ ip: 1, timestamp: -1 });

// For finding recent events by email
rateLimitEventSchema.index({ attemptedEmail: 1, timestamp: -1 });

// For finding unresolved events (alerts)
rateLimitEventSchema.index({ resolved: 1, timestamp: -1 });

// TTL Index - automatically delete events after 30 days
const RATE_LIMIT_RETENTION_DAYS = parseInt(process.env.RATE_LIMIT_RETENTION_DAYS) || 30;
rateLimitEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 }
);

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * recordEvent(eventData)
 * ----------------------
 * Record a new rate limit event.
 *
 * @param {Object} eventData - Event data
 * @param {string} eventData.ip - IP address
 * @param {string} eventData.attemptedEmail - Email attempted
 * @param {string} eventData.route - Route that was rate limited
 * @param {string} eventData.userAgent - Browser user agent
 * @param {string} eventData.origin - Request origin
 * @returns {Object} - Created event
 */
rateLimitEventSchema.statics.recordEvent = async function(eventData) {
  return this.create({
    ip: eventData.ip,
    attemptedEmail: eventData.attemptedEmail || 'unknown',
    route: eventData.route,
    userAgent: eventData.userAgent,
    origin: eventData.origin,
    timestamp: new Date()
  });
};

/**
 * getRecentByIP(ip, windowMs)
 * ---------------------------
 * Get recent rate limit events for an IP address.
 *
 * @param {string} ip - IP address to check
 * @param {number} windowMs - Time window in milliseconds (default: 1 hour)
 * @returns {Array} - List of events
 */
rateLimitEventSchema.statics.getRecentByIP = async function(ip, windowMs = 60 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs);
  return this.find({
    ip,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
};

/**
 * getAlertStats(windowMs)
 * -----------------------
 * Get aggregated stats for rate limit alerts.
 *
 * @param {number} windowMs - Time window in milliseconds (default: 1 hour)
 * @returns {Object} - Alert statistics
 */
rateLimitEventSchema.statics.getAlertStats = async function(windowMs = 60 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs);

  // Count events by IP
  const byIP = await this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: '$ip', count: { $sum: 1 }, lastEvent: { $max: '$timestamp' } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  // Count events by email
  const byEmail = await this.aggregate([
    { $match: { timestamp: { $gte: since }, attemptedEmail: { $ne: 'unknown' } } },
    { $group: { _id: '$attemptedEmail', count: { $sum: 1 }, lastEvent: { $max: '$timestamp' } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  // Total events in window
  const totalEvents = await this.countDocuments({ timestamp: { $gte: since } });

  // Unresolved events count
  const unresolvedCount = await this.countDocuments({ resolved: false });

  return {
    totalEvents,
    unresolvedCount,
    byIP,
    byEmail,
    windowMs,
    since
  };
};

/**
 * getUnresolvedEvents(limit)
 * --------------------------
 * Get unresolved rate limit events for the attention panel.
 *
 * @param {number} limit - Maximum events to return
 * @returns {Array} - Unresolved events
 */
rateLimitEventSchema.statics.getUnresolvedEvents = async function(limit = 50) {
  return this.find({ resolved: false })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * resolveEvent(eventId, adminId, action)
 * --------------------------------------
 * Mark an event as resolved.
 *
 * @param {string} eventId - Event ID to resolve
 * @param {string} adminId - Admin who resolved it
 * @param {string} action - Action taken ('whitelisted' or 'dismissed')
 * @returns {Object} - Updated event
 */
rateLimitEventSchema.statics.resolveEvent = async function(eventId, adminId, action) {
  return this.findByIdAndUpdate(
    eventId,
    {
      resolved: true,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      action
    },
    { new: true }
  );
};

/**
 * resolveEventsByIP(ip, adminId, action)
 * --------------------------------------
 * Mark all events from an IP as resolved.
 *
 * @param {string} ip - IP address
 * @param {string} adminId - Admin who resolved them
 * @param {string} action - Action taken
 * @returns {Object} - Update result
 */
rateLimitEventSchema.statics.resolveEventsByIP = async function(ip, adminId, action) {
  return this.updateMany(
    { ip, resolved: false },
    {
      resolved: true,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      action
    }
  );
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const RateLimitEvent = mongoose.model('RateLimitEvent', rateLimitEventSchema);

export default RateLimitEvent;
