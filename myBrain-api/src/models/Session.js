/**
 * =============================================================================
 * SESSION.JS - User Session Data Model
 * =============================================================================
 *
 * This file defines the Session model - the data structure for tracking user
 * login sessions in myBrain. Each time a user logs in, a new Session document
 * is created that tracks:
 *
 * WHAT THIS MODEL TRACKS:
 * -----------------------
 * 1. DEVICE INFO: What browser, OS, and device type the user is using
 * 2. LOCATION: Where the user is logging in from (city, country, coordinates)
 * 3. LIFECYCLE: When the session was created, when it expires, last activity
 * 4. SECURITY FLAGS: Is this a new device? New location? Suspicious?
 *
 * WHY TRACK SESSIONS?
 * -------------------
 * 1. REVOCATION: Users can log out specific devices without logging out everywhere
 * 2. SECURITY: Detect suspicious logins (new device, new location)
 * 3. VISIBILITY: "Where am I logged in?" shows all active sessions
 * 4. AUDIT: Track login history for security investigations
 *
 * HOW IT WORKS WITH JWT:
 * ----------------------
 * - JWT contains a session ID (sid) that references this document
 * - On each request, we check if the session is still valid (not revoked)
 * - This allows "instant logout" by revoking the session document
 * - The JWT can't be invalidated itself (stateless), but we can invalidate
 *   the session it references
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 */
import mongoose from 'mongoose';

// =============================================================================
// SESSION SCHEMA DEFINITION
// =============================================================================

/**
 * The Session Schema
 * ------------------
 * Defines all the fields a Session document can have.
 */
const sessionSchema = new mongoose.Schema({

  // ===========================================================================
  // IDENTITY
  // ===========================================================================

  /**
   * userId: Which user this session belongs to
   * - Required: Every session must belong to a user
   * - Index: For fast lookup of user's sessions
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  /**
   * sessionId: Unique identifier for this session
   * - Format: "ses_" + 20 character nanoid
   * - Used in JWT as 'sid' claim for session lookup
   * - Human-readable prefix makes debugging easier
   *
   * EXAMPLE: "ses_V1StGXR8_Z5jdHi6B-my"
   */
  sessionId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: v => /^ses_[A-Za-z0-9_-]{20}$/.test(v),
      message: 'Invalid session ID format (must be ses_ + 20 alphanumeric characters)'
    }
  },

  /**
   * jwtId: The 'jti' (JWT ID) claim from the token
   * - Used to link a specific JWT to this session
   * - If a token is refreshed, the jwtId changes but sessionId stays the same
   * - Indexed for fast lookup during token validation
   *
   * EXAMPLE: "abc123xyz789defg"
   */
  jwtId: {
    type: String,
    required: true,
    index: true
  },

  // ===========================================================================
  // DEVICE INFORMATION
  // ===========================================================================

  /**
   * device: Information about the client device
   * - Parsed from User-Agent header
   * - Used to show "Chrome on Windows" in session list
   */
  device: {
    /**
     * deviceType: Category of device
     * - Using 'deviceType' instead of 'type' to avoid Mongoose reserved word
     *
     * VALUES:
     * - 'desktop': Regular computer (Windows, Mac, Linux)
     * - 'mobile': Smartphone (iPhone, Android phone)
     * - 'tablet': Tablet device (iPad, Android tablet)
     * - 'unknown': Couldn't determine device type
     */
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },

    /**
     * browser: Name of the browser
     * EXAMPLES: "Chrome", "Firefox", "Safari", "Edge"
     */
    browser: String,

    /**
     * browserVersion: Version of the browser
     * EXAMPLES: "120.0.0", "119.0", "17.1"
     */
    browserVersion: String,

    /**
     * os: Operating system name
     * EXAMPLES: "Windows", "macOS", "iOS", "Android", "Linux"
     */
    os: String,

    /**
     * osVersion: Operating system version
     * EXAMPLES: "10", "14.1", "11"
     */
    osVersion: String,

    /**
     * userAgent: Raw User-Agent string for debugging
     * We store this in case parsing fails and we need to investigate
     */
    userAgent: String,

    /**
     * fingerprint: Coarse device identifier for new device detection
     * - Format: "browser|os|deviceType|language"
     * - Example: "chrome|windows|desktop|en-us"
     * - Not unique (different users can share fingerprint)
     * - Used to answer "have I seen this device before?"
     * - Indexed for efficient lookups in new device checks
     */
    fingerprint: String
  },

  // ===========================================================================
  // LOCATION INFORMATION
  // ===========================================================================

  /**
   * location: Information about where the user logged in from
   * - Derived from IP address geolocation
   * - Used for security checks (new location detection)
   */
  location: {
    /**
     * ip: IP address used for login
     * - Required: Always capture the IP
     * - Used for impossible travel detection
     */
    ip: {
      type: String,
      required: true
    },

    /**
     * city: City name from geolocation
     * EXAMPLES: "New York", "London", "Tokyo"
     */
    city: String,

    /**
     * region: State/province/region
     * EXAMPLES: "California", "Ontario", "England"
     */
    region: String,

    /**
     * country: Full country name
     * EXAMPLES: "United States", "Canada", "Japan"
     */
    country: String,

    /**
     * countryCode: Two-letter country code (ISO 3166-1 alpha-2)
     * EXAMPLES: "US", "CA", "JP", "GB"
     */
    countryCode: String,

    /**
     * timezone: Timezone identifier
     * EXAMPLES: "America/New_York", "Europe/London", "Asia/Tokyo"
     */
    timezone: String,

    /**
     * latitude: Geographic latitude
     * - Used for impossible travel detection (distance calculation)
     * - Range: -90 to 90
     */
    latitude: Number,

    /**
     * longitude: Geographic longitude
     * - Used for impossible travel detection (distance calculation)
     * - Range: -180 to 180
     */
    longitude: Number,

    /**
     * geoResolved: Whether geolocation was successfully resolved
     * - false: IP lookup failed or IP is private/local
     * - true: Successfully got location from IP
     */
    geoResolved: {
      type: Boolean,
      default: false
    }
  },

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * status: Current state of the session
   * - 'active': Session is valid and can be used
   * - 'expired': Session reached its expiration time
   * - 'revoked': Session was manually terminated
   */
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
    index: true
  },

  /**
   * issuedAt: When the session was created (login time)
   * - Required: Every session has a creation time
   */
  issuedAt: {
    type: Date,
    required: true
  },

  /**
   * expiresAt: When the session will expire
   * - Required: Sessions must have an expiration
   * - Used for TTL index (auto-cleanup)
   * - Also checked during validation
   */
  expiresAt: {
    type: Date,
    required: true
  },

  /**
   * lastActivityAt: When the user was last active with this session
   * - Updated on each authenticated request (throttled)
   * - Used to show "Last active 5 minutes ago" in session list
   */
  lastActivityAt: {
    type: Date,
    default: Date.now
  },

  // ===========================================================================
  // REVOCATION DETAILS
  // ===========================================================================

  /**
   * revokedAt: When the session was revoked
   * - Only set if status is 'revoked'
   */
  revokedAt: Date,

  /**
   * revokedReason: Why the session was revoked
   *
   * VALUES:
   * - 'user_logout': User clicked "logout"
   * - 'user_revoked': User revoked from session management
   * - 'password_changed': All sessions revoked after password change
   * - 'admin_action': Admin forcibly ended the session
   * - 'security_threat': Revoked due to suspicious activity
   * - null: Not revoked
   */
  revokedReason: {
    type: String,
    enum: ['user_logout', 'user_revoked', 'password_changed', 'admin_action', 'security_threat', null],
    default: null
  },

  /**
   * revokedBy: Who revoked the session
   * - If user revoked their own session: their user ID
   * - If admin revoked: admin's user ID
   * - null if not revoked
   */
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ===========================================================================
  // SECURITY FLAGS
  // ===========================================================================

  /**
   * securityFlags: Flags for security-relevant session characteristics
   * - Set at login time based on historical data
   * - Used for alerting and "new device" notifications
   */
  securityFlags: {
    /**
     * isNewDevice: User hasn't logged in from this browser before
     * - Compared to recent sessions (90-day lookback)
     */
    isNewDevice: {
      type: Boolean,
      default: false
    },

    /**
     * isNewLocation: User hasn't logged in from this city before
     * - Compared to recent sessions (90-day lookback)
     */
    isNewLocation: {
      type: Boolean,
      default: false
    },

    /**
     * triggeredAlert: Whether this session triggered a security alert
     * - Set if either isNewDevice or isNewLocation is true
     * - Or if impossible travel was detected
     */
    triggeredAlert: {
      type: Boolean,
      default: false
    }
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
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways sessions are queried.
 */

// For getting user's active sessions sorted by activity
// Used by: GET /auth/sessions
sessionSchema.index({ userId: 1, status: 1, lastActivityAt: -1 });

// For validating a session during authentication
// Used by: requireAuth middleware
sessionSchema.index({ jwtId: 1, status: 1 });

// For finding sessions by sessionId and status
// Used by: Session revocation, logout
sessionSchema.index({ sessionId: 1, status: 1 });

// For checking device history (new device detection) using fingerprint
// Used by: checkNewDevice in securityService.js
sessionSchema.index({ userId: 1, 'device.fingerprint': 1, createdAt: -1 });

// For checking location history (new location detection) using city + countryCode
// Used by: checkNewLocation in securityService.js
sessionSchema.index({ userId: 1, 'location.city': 1, 'location.countryCode': 1, createdAt: -1 });

// NOTE: Index for impossible travel detection (userId + status + lastActivityAt)
// already exists above as "For getting user's active sessions sorted by activity"

/**
 * TTL Index for Automatic Cleanup
 * -------------------------------
 * Automatically delete session documents 90 days after they expire.
 * This keeps the collection clean while preserving recent history
 * for security analysis (90-day lookback for new device/location checks).
 *
 * NOTE: Documents are deleted 90 days after expiresAt, not after creation.
 * A session that expires after 7 days will be deleted 97 days after creation.
 */
const SESSION_TTL_DAYS = 90;
sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: SESSION_TTL_DAYS * 24 * 60 * 60 }
);

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * revoke(reason, revokedBy)
 * -------------------------
 * Revoke this session, making it invalid for future requests.
 *
 * @param {string} reason - Why the session is being revoked
 *   - 'user_logout': Normal logout
 *   - 'user_revoked': User revoked from session list
 *   - 'password_changed': All sessions revoked after password change
 *   - 'admin_action': Admin forced logout
 *   - 'security_threat': Suspicious activity detected
 * @param {ObjectId} revokedBy - ID of user who revoked (optional)
 * @returns {Promise<Session>} - The updated session document
 *
 * EXAMPLE:
 * await session.revoke('user_logout');
 * await session.revoke('admin_action', adminUserId);
 */
sessionSchema.methods.revoke = async function(reason, revokedBy = null) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedReason = reason;
  if (revokedBy) {
    this.revokedBy = revokedBy;
  }
  return this.save();
};

/**
 * isValid()
 * ---------
 * Check if this session is currently valid.
 *
 * @returns {boolean} - True if session is active and not expired
 *
 * CHECKS:
 * 1. Status is 'active' (not revoked or expired)
 * 2. Current time is before expiresAt
 */
sessionSchema.methods.isValid = function() {
  return this.status === 'active' && new Date() < this.expiresAt;
};

/**
 * toSafeJSON()
 * ------------
 * Convert session to a clean JSON object for API responses.
 * Includes formatted device and location info.
 *
 * @returns {Object} - Session data safe for client display
 */
sessionSchema.methods.toSafeJSON = function() {
  const deviceDisplay = this.device?.browser
    ? `${this.device.browser} on ${this.device.os || 'Unknown OS'}`
    : 'Unknown Device';

  const locationDisplay = this.location?.city && this.location?.country
    ? `${this.location.city}, ${this.location.country}`
    : this.location?.country || 'Unknown Location';

  return {
    id: this.sessionId,
    device: deviceDisplay,
    deviceType: this.device?.deviceType || 'unknown',
    location: locationDisplay,
    ip: this.location?.ip,
    issuedAt: this.issuedAt,
    lastActivityAt: this.lastActivityAt,
    status: this.status,
    securityFlags: {
      isNewDevice: this.securityFlags?.isNewDevice || false,
      isNewLocation: this.securityFlags?.isNewLocation || false
    }
  };
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getActiveSessions(userId)
 * -------------------------
 * Get all active sessions for a user, sorted by most recently active.
 *
 * @param {ObjectId|string} userId - User ID to get sessions for
 * @returns {Promise<Session[]>} - Array of active session documents
 *
 * EXAMPLE:
 * const sessions = await Session.getActiveSessions(req.user._id);
 */
sessionSchema.statics.getActiveSessions = async function(userId) {
  return this.find({
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() }  // Not expired
  })
    .sort({ lastActivityAt: -1 })
    .lean();
};

/**
 * revokeAllExcept(userId, exceptSessionId, reason)
 * ------------------------------------------------
 * Revoke all of a user's sessions except one (usually the current session).
 * Used for "Logout all other devices" feature.
 *
 * @param {ObjectId|string} userId - User whose sessions to revoke
 * @param {string} exceptSessionId - Session ID to keep active
 * @param {string} reason - Revocation reason
 * @returns {Promise<Object>} - MongoDB update result
 *
 * EXAMPLE:
 * // Logout all except current session
 * await Session.revokeAllExcept(userId, currentSessionId, 'user_revoked');
 */
sessionSchema.statics.revokeAllExcept = async function(userId, exceptSessionId, reason) {
  return this.updateMany(
    {
      userId,
      sessionId: { $ne: exceptSessionId },
      status: 'active'
    },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
};

/**
 * revokeAll(userId, reason)
 * -------------------------
 * Revoke ALL of a user's active sessions.
 * Used when password is changed (security measure).
 *
 * @param {ObjectId|string} userId - User whose sessions to revoke
 * @param {string} reason - Revocation reason (typically 'password_changed')
 * @returns {Promise<Object>} - MongoDB update result with modifiedCount
 *
 * EXAMPLE:
 * // After password change, revoke all sessions
 * const result = await Session.revokeAll(userId, 'password_changed');
 * console.log(`${result.modifiedCount} sessions revoked`);
 */
sessionSchema.statics.revokeAll = async function(userId, reason) {
  return this.updateMany(
    {
      userId,
      status: 'active'
    },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
};

/**
 * revokeBySessionId(sessionId, reason, revokedBy)
 * -----------------------------------------------
 * Revoke a specific session by its sessionId.
 *
 * @param {string} sessionId - Session ID to revoke
 * @param {string} reason - Revocation reason
 * @param {ObjectId} revokedBy - Who revoked it (optional)
 * @returns {Promise<Session|null>} - Updated session or null if not found
 */
sessionSchema.statics.revokeBySessionId = async function(sessionId, reason, revokedBy = null) {
  const update = {
    status: 'revoked',
    revokedAt: new Date(),
    revokedReason: reason
  };
  if (revokedBy) {
    update.revokedBy = revokedBy;
  }

  return this.findOneAndUpdate(
    { sessionId, status: 'active' },
    { $set: update },
    { new: true }
  );
};

/**
 * findBySessionId(sessionId)
 * --------------------------
 * Find a session by its sessionId (not MongoDB _id).
 *
 * @param {string} sessionId - Session ID (ses_xxx format)
 * @returns {Promise<Session|null>} - Session document or null
 */
sessionSchema.statics.findBySessionId = async function(sessionId) {
  return this.findOne({ sessionId });
};

/**
 * validateSession(sessionId, jwtId)
 * ---------------------------------
 * Check if a session is valid for authentication.
 * Returns true only if session exists, is active, and not expired.
 *
 * @param {string} sessionId - Session ID from JWT 'sid' claim
 * @param {string} jwtId - JWT ID from JWT 'jti' claim
 * @returns {Promise<boolean>} - True if session is valid
 *
 * USED BY: requireAuth middleware for session validation
 */
sessionSchema.statics.validateSession = async function(sessionId, jwtId) {
  const session = await this.findOne({
    sessionId,
    jwtId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).select('_id').lean();

  return !!session;
};

/**
 * updateActivity(sessionId)
 * -------------------------
 * Update the lastActivityAt timestamp for a session.
 * Uses $max operator to avoid race conditions (only updates if new time is greater).
 *
 * @param {string} sessionId - Session ID to update
 * @returns {Promise<void>}
 *
 * NOTE: This is fire-and-forget (errors are logged but not thrown)
 */
sessionSchema.statics.updateActivity = async function(sessionId) {
  try {
    await this.updateOne(
      { sessionId, status: 'active' },
      { $max: { lastActivityAt: new Date() } }
    );
  } catch (error) {
    console.error('[SESSION] Failed to update activity:', error.message);
  }
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Session model from the schema.
 * This gives us methods to:
 * - Create sessions: Session.create({ ... })
 * - Find sessions: Session.find(query)
 * - Validate sessions: Session.validateSession(sid, jti)
 * - Get user's sessions: Session.getActiveSessions(userId)
 * - Revoke sessions: session.revoke(reason)
 *
 * IMPORTANT NOTES:
 * - Sessions auto-delete 90 days after expiry via TTL index
 * - Always check both status AND expiresAt for validity
 * - Use sessionId (not _id) for external references
 */
const Session = mongoose.model('Session', sessionSchema);

export default Session;
