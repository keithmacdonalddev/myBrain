/**
 * =============================================================================
 * FAILEDLOGIN.JS - Failed Login Attempt Tracking Model
 * =============================================================================
 *
 * This file defines the FailedLogin model - the data structure for tracking
 * failed login attempts. This helps detect brute force attacks and alert
 * users when someone is trying to guess their password.
 *
 * WHAT IS A FAILED LOGIN?
 * -----------------------
 * A failed login is any attempt to log in that doesn't succeed:
 * - Wrong password (most common)
 * - Email doesn't exist
 * - Account is disabled
 * - Account is locked
 *
 * WHY TRACK FAILED LOGINS?
 * ------------------------
 * 1. BRUTE FORCE DETECTION: Multiple failures indicate password guessing
 * 2. USER ALERTING: Warn users when someone tries to access their account
 * 3. PASSWORD SPRAY DETECTION: Many accounts from one IP
 * 4. ACCOUNT PROTECTION: Enable lockouts after too many failures
 * 5. FORENSICS: Investigate suspicious activity
 *
 * PRIVACY CONSIDERATIONS:
 * -----------------------
 * We track failures for EXISTING accounts (userId is set) and for
 * non-existing emails (userId is null). However, we do NOT store
 * an explicit 'emailExists' field because that would be an enumeration
 * risk - if someone gets access to this collection, they could see
 * which emails have accounts.
 *
 * Instead, we can INFER whether an email exists by checking if userId
 * is present (email exists) or null (email doesn't exist).
 *
 * TIMING ATTACK PREVENTION:
 * -------------------------
 * The login route is designed to take the same time whether:
 * - Email exists and password is wrong
 * - Email doesn't exist
 *
 * This is achieved by:
 * 1. Starting geolocation lookup BEFORE credential validation
 * 2. Tracking failures in the background (setImmediate)
 * 3. Not awaiting the failure tracking in the response path
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// FAILED LOGIN SCHEMA DEFINITION
// =============================================================================

const failedLoginSchema = new mongoose.Schema({

  // ===========================================================================
  // IDENTITY
  // ===========================================================================

  /**
   * attemptedEmail: The email address used in the login attempt
   * - Required: Always capture what email was tried
   * - Lowercase: Normalized for consistent matching
   * - Index: For counting failures per email
   */
  attemptedEmail: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  /**
   * userId: The user this email belongs to (if exists)
   * - Optional: null if email doesn't have an account
   * - Index: For counting failures per user
   *
   * SECURITY NOTE:
   * If userId is present, the email exists in our system.
   * If userId is null, the email does NOT have an account.
   * We don't store an explicit 'emailExists' field to avoid
   * making account enumeration easier if this data is exposed.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // ===========================================================================
  // FAILURE REASON
  // ===========================================================================

  /**
   * reason: Why the login failed
   *
   * VALUES:
   * - 'invalid_email': Email doesn't have an account (userId will be null)
   * - 'wrong_password': Email exists but password is wrong
   * - 'account_disabled': Account exists but is disabled/banned
   * - 'account_locked': Account is locked due to too many failures (future)
   */
  reason: {
    type: String,
    enum: ['invalid_email', 'wrong_password', 'account_disabled', 'account_locked'],
    required: true
  },

  // ===========================================================================
  // REQUEST CONTEXT
  // ===========================================================================

  /**
   * ip: IP address of the request
   * - Required: Always capture for pattern detection
   * - Index: For password spray detection (many emails from one IP)
   */
  ip: {
    type: String,
    required: true,
    index: true
  },

  /**
   * userAgent: Browser/client information
   * Useful for identifying what tool is being used
   */
  userAgent: String,

  /**
   * origin: Origin header from the request
   * Helps identify if request is from our app or elsewhere
   */
  origin: String,

  // ===========================================================================
  // LOCATION (FROM IP GEOLOCATION)
  // ===========================================================================

  /**
   * location: Geographic location from IP lookup
   * Helps identify geographic patterns in attacks
   */
  location: {
    city: String,
    region: String,
    country: String,
    countryCode: String
  },

  // ===========================================================================
  // TIMESTAMP
  // ===========================================================================

  /**
   * timestamp: When the failure occurred
   * - Default: current time
   * - NOTE: Index is created via TTL index below, not here
   */
  timestamp: {
    type: Date,
    default: Date.now
  }

}, {
  /**
   * timestamps: true automatically adds createdAt and updatedAt
   * We don't need updatedAt for failed logins, but it's harmless
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for User's Recent Failures
 * Count failures for a specific user in a time window.
 * Used for: Alert triggering, lockout logic
 */
failedLoginSchema.index({ userId: 1, timestamp: -1 });

/**
 * Index for IP-Based Failures
 * Find failures from a specific IP address.
 * Used for: Password spray detection
 */
failedLoginSchema.index({ ip: 1, timestamp: -1 });

/**
 * Compound Index for Password Spray Detection
 * Find how many different emails one IP tried.
 * Used for: Detecting attacks targeting many accounts
 */
failedLoginSchema.index({ ip: 1, timestamp: -1, attemptedEmail: 1 });

/**
 * TTL Index for Automatic Cleanup
 * Automatically delete records after 7 days.
 * We don't need to keep failed logins forever:
 * - Recent failures matter for security
 * - Old failures are noise
 * - 7 days is enough for pattern detection
 */
const FAILED_LOGIN_TTL_DAYS = 7;
failedLoginSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: FAILED_LOGIN_TTL_DAYS * 24 * 60 * 60 }
);

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getRecentByUser(userId, windowMs)
 * ---------------------------------
 * Count failed login attempts for a user within a time window.
 * Used to trigger security alerts at thresholds.
 *
 * @param {ObjectId|string} userId - User to check failures for
 * @param {number} windowMs - Time window in milliseconds (default: 15 min)
 * @returns {Promise<number>} Count of failures in the window
 *
 * EXAMPLE:
 * const failures = await FailedLogin.getRecentByUser(userId);
 * if (failures >= 3) {
 *   // Trigger warning alert
 * }
 * if (failures >= 5) {
 *   // Trigger critical alert
 * }
 */
failedLoginSchema.statics.getRecentByUser = async function(userId, windowMs = 15 * 60 * 1000) {
  if (!userId) return 0;

  return this.countDocuments({
    userId,
    timestamp: { $gte: new Date(Date.now() - windowMs) }
  });
};

/**
 * getRecentByIP(ip, windowMs)
 * ---------------------------
 * Get unique emails attempted from an IP address within a time window.
 * Used for password spray detection (attacking many accounts from one IP).
 *
 * @param {string} ip - IP address to check
 * @param {number} windowMs - Time window in milliseconds (default: 1 hour)
 * @returns {Promise<Array<string>>} Array of unique emails tried from this IP
 *
 * EXAMPLE:
 * const emails = await FailedLogin.getRecentByIP('1.2.3.4');
 * if (emails.length >= 10) {
 *   // Likely password spray attack - consider blocking IP
 * }
 */
failedLoginSchema.statics.getRecentByIP = async function(ip, windowMs = 60 * 60 * 1000) {
  if (!ip) return [];

  return this.distinct('attemptedEmail', {
    ip,
    timestamp: { $gte: new Date(Date.now() - windowMs) }
  });
};

/**
 * countRecentByIP(ip, windowMs)
 * -----------------------------
 * Count total failed attempts from an IP address.
 * Simpler than getRecentByIP when you just need a count.
 *
 * @param {string} ip - IP address to check
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<number>} Count of failures from this IP
 */
failedLoginSchema.statics.countRecentByIP = async function(ip, windowMs = 60 * 60 * 1000) {
  if (!ip) return 0;

  return this.countDocuments({
    ip,
    timestamp: { $gte: new Date(Date.now() - windowMs) }
  });
};

/**
 * getRecentByEmail(email, windowMs)
 * ---------------------------------
 * Count failed attempts for a specific email address.
 * Useful for checking if someone is targeting a specific email
 * before they've been identified as a user.
 *
 * @param {string} email - Email to check
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<number>} Count of failures for this email
 */
failedLoginSchema.statics.getRecentByEmail = async function(email, windowMs = 15 * 60 * 1000) {
  if (!email) return 0;

  return this.countDocuments({
    attemptedEmail: email.toLowerCase(),
    timestamp: { $gte: new Date(Date.now() - windowMs) }
  });
};

/**
 * recordFailure(data)
 * -------------------
 * Record a failed login attempt.
 * This is the main method called by the auth route.
 *
 * @param {Object} data - Failure data
 *   - attemptedEmail: Email that was tried (required)
 *   - userId: User ID if email exists (optional)
 *   - reason: Why it failed (required)
 *   - ip: IP address (required)
 *   - userAgent: Browser info (optional)
 *   - origin: Origin header (optional)
 *   - location: Geo data { city, country, countryCode } (optional)
 * @returns {Promise<FailedLogin>} Created document
 */
failedLoginSchema.statics.recordFailure = async function(data) {
  return this.create({
    attemptedEmail: data.attemptedEmail,
    userId: data.userId || null,
    reason: data.reason,
    ip: data.ip,
    userAgent: data.userAgent,
    origin: data.origin,
    location: data.location ? {
      city: data.location.city,
      region: data.location.region,
      country: data.location.country,
      countryCode: data.location.countryCode
    } : undefined,
    timestamp: new Date()
  });
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the FailedLogin model from the schema.
 *
 * USAGE:
 * - FailedLogin.recordFailure(data) - Record a failure
 * - FailedLogin.getRecentByUser(userId) - Count user's recent failures
 * - FailedLogin.getRecentByIP(ip) - Get emails tried from IP
 * - FailedLogin.countRecentByIP(ip) - Count failures from IP
 *
 * IMPORTANT:
 * - Records auto-delete after 7 days via TTL index
 * - Don't include explicit emailExists field (security risk)
 * - Call from background (setImmediate) to avoid timing attacks
 */
const FailedLogin = mongoose.model('FailedLogin', failedLoginSchema);

export default FailedLogin;
