/**
 * =============================================================================
 * FILESHARE.JS - File Sharing Link Data Model
 * =============================================================================
 *
 * This file defines the FileShare model - the data structure for creating
 * shareable links to files stored in myBrain.
 *
 * WHAT IS A FILE SHARE?
 * ---------------------
 * A file share is a special link that lets you share a file with others
 * without giving them access to your account. You create a share link,
 * send it to someone, and they can view/download the file.
 *
 * HOW FILE SHARING WORKS:
 * -----------------------
 * 1. User has a file they want to share
 * 2. User creates a share with settings (public, password, expiring, etc.)
 * 3. System generates a unique share token (random string)
 * 4. User sends the share link: https://app.com/share/{token}
 * 5. Recipient clicks link and accesses the file
 * 6. Access is logged and counted
 *
 * SHARE TYPES:
 * ------------
 * 1. PUBLIC: Anyone with the link can access
 *    - Simplest type, no protection
 *    - Good for: Public documents, portfolios
 *
 * 2. PASSWORD: Requires a password to access
 *    - Link alone isn't enough
 *    - Good for: Sensitive documents, controlled sharing
 *
 * 3. USERS: Only specific users can access
 *    - Recipients must be logged in and on the allow list
 *    - Good for: Team collaboration, specific recipients
 *
 * 4. EXPIRING: Automatically expires after a set time
 *    - Link becomes invalid after expiration
 *    - Good for: Temporary shares, time-sensitive content
 *
 * SECURITY FEATURES:
 * ------------------
 * - Unique tokens (UUID) - extremely hard to guess
 * - Password protection (hashed with bcrypt)
 * - Expiration dates
 * - Access count limits
 * - Access logging
 * - Can be deactivated at any time
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
 * crypto is Node.js's built-in cryptography module.
 * We use it to generate unique, secure share tokens.
 */
import crypto from 'crypto';

// =============================================================================
// FILE SHARE SCHEMA DEFINITION
// =============================================================================

/**
 * The File Share Schema
 * ---------------------
 * Defines all the fields a FileShare document can have.
 */
const fileShareSchema = new mongoose.Schema(
  {

    // =========================================================================
    // CORE REFERENCES
    // =========================================================================

    /**
     * fileId: The file being shared
     * - Required: Must reference a file
     * - Index: For finding shares for a specific file
     */
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      index: true,
    },

    /**
     * userId: The user who created this share
     * - Required: Must know who created it
     * - Index: For finding a user's shares
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // =========================================================================
    // SHARE TOKEN
    // =========================================================================

    /**
     * shareToken: The unique identifier for this share
     * - Required: Every share needs a token
     * - Unique: No two shares can have the same token
     * - Index: For fast lookups when accessing share links
     *
     * This is the random string that appears in the share URL:
     * https://app.com/share/{shareToken}
     *
     * EXAMPLE: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
     */
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // =========================================================================
    // SHARE TYPE & PROTECTION
    // =========================================================================

    /**
     * shareType: How the share is protected
     *
     * VALUES:
     * - 'public': Anyone with the link can access
     * - 'password': Requires password to access
     * - 'users': Only specific users (in allowedUsers) can access
     * - 'expiring': Has an expiration date (can combine with others)
     */
    shareType: {
      type: String,
      enum: ['public', 'password', 'users', 'expiring'],
      default: 'public',
    },

    /**
     * expiresAt: When this share expires
     * - null: Never expires
     * - Date: Share becomes invalid after this date
     *
     * Uses TTL index to automatically clean up expired shares.
     *
     * EXAMPLE:
     * expiresAt: new Date('2024-02-01')
     * // Share works until Feb 1, 2024, then becomes invalid
     */
    expiresAt: {
      type: Date,
      default: null,
    },

    /**
     * password: Hashed password for password-protected shares
     * - null: No password protection
     * - Hashed with bcrypt (never stored in plain text)
     *
     * NOTE: This is the HASHED password, not the original.
     * Compare using bcrypt.compare(), never direct comparison.
     */
    password: {
      type: String, // Hashed with bcrypt
      default: null,
    },

    /**
     * allowedUsers: List of users who can access (for 'users' type)
     * - Empty array if not using 'users' type
     * - Only these users can access the share (must be logged in)
     */
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // =========================================================================
    // PERMISSIONS
    // =========================================================================

    /**
     * permissions: What recipients can do with the file
     * - Granular control over access level
     */
    permissions: {
      /**
       * canView: Can the recipient view/preview the file?
       * - Default: true (otherwise what's the point?)
       */
      canView: {
        type: Boolean,
        default: true,
      },

      /**
       * canDownload: Can the recipient download the file?
       * - true: Download button available
       * - false: View-only, no download
       *
       * Use case: Share a document for review but prevent copying.
       */
      canDownload: {
        type: Boolean,
        default: true,
      },

      /**
       * canComment: Can the recipient leave comments?
       * - Default: false (most shares don't need comments)
       * - true: Enables commenting on the shared file
       */
      canComment: {
        type: Boolean,
        default: false,
      },
    },

    // =========================================================================
    // ACCESS TRACKING
    // =========================================================================

    /**
     * accessCount: How many times this share has been accessed
     * - Incremented each time someone views the file
     * - Useful for analytics and access limits
     */
    accessCount: {
      type: Number,
      default: 0,
    },

    /**
     * maxAccessCount: Maximum allowed accesses
     * - null: Unlimited accesses
     * - Number: Share becomes invalid after this many accesses
     *
     * EXAMPLE:
     * maxAccessCount: 10
     * // After 10 people access, the share stops working
     *
     * Use case: "One-time" download links, limited distribution.
     */
    maxAccessCount: {
      type: Number,
      default: null, // null = unlimited
    },

    /**
     * isActive: Is this share currently active?
     * - true: Share is working
     * - false: Share has been deactivated (manually or automatically)
     * - Index: For filtering out deactivated shares
     *
     * User can deactivate a share at any time to revoke access.
     */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /**
     * lastAccessedAt: When was this share last used?
     * - Updated each time someone accesses the file
     */
    lastAccessedAt: Date,

    /**
     * lastAccessedBy: Who last accessed this share?
     * - Only set if the accessor was logged in
     * - null if anonymous access
     */
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // =========================================================================
    // ACCESS LOG
    // =========================================================================

    /**
     * accessLog: Recent access history
     * - Keeps the last 100 accesses
     * - Useful for security auditing and analytics
     *
     * Each entry records:
     * - When: accessedAt timestamp
     * - Who: accessedBy (if logged in) or null
     * - Where: ipAddress of the accessor
     * - What: userAgent (browser/device info)
     */
    accessLog: [{
      /**
       * accessedAt: When this access occurred
       */
      accessedAt: Date,

      /**
       * accessedBy: Which user accessed (null if anonymous)
       */
      accessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      /**
       * ipAddress: IP address of the accessor
       * - For security tracking
       */
      ipAddress: String,

      /**
       * userAgent: Browser/device info
       * - Helps identify device types
       */
      userAgent: String,
    }],
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the share was created
     * - updatedAt: When it was last modified
     */
    timestamps: true,
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Finding File's Active Shares
 * --------------------------------------
 * Quickly find all active shares for a specific file.
 */
fileShareSchema.index({ fileId: 1, isActive: 1 });

/**
 * Index for Finding User's Active Shares
 * --------------------------------------
 * Quickly find all shares a user has created.
 */
fileShareSchema.index({ userId: 1, isActive: 1 });

/**
 * TTL Index for Auto-Expiration
 * -----------------------------
 * Automatically delete documents when expiresAt is reached.
 *
 * HOW IT WORKS:
 * - expireAfterSeconds: 0 means "delete immediately when expiresAt is reached"
 * - MongoDB checks periodically and removes expired documents
 * - Documents with expiresAt: null are never deleted by this index
 */
fileShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * generateToken()
 * ---------------
 * Generate a unique, secure share token.
 *
 * @returns {string} - A UUID v4 token
 *
 * WHY UUID?
 * UUIDs are:
 * - Virtually impossible to guess (122 bits of randomness)
 * - Globally unique
 * - URL-safe
 *
 * EXAMPLE:
 * const token = FileShare.generateToken();
 * // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
fileShareSchema.statics.generateToken = function () {
  return crypto.randomUUID();
};

/**
 * findByToken(token)
 * ------------------
 * Find an active, valid share by its token.
 *
 * @param {string} token - The share token to look up
 * @returns {Object|null} - The share with file populated, or null
 *
 * VALIDATION:
 * This method also validates the share:
 * - Must be active (isActive: true)
 * - Must not be expired
 * - Must not have exceeded access count
 *
 * If invalid, the share is automatically deactivated.
 *
 * EXAMPLE:
 * const share = await FileShare.findByToken('abc123');
 * if (share) {
 *   // Access the file
 *   const file = share.fileId; // Populated File document
 * }
 */
fileShareSchema.statics.findByToken = async function (token) {
  // Find share and populate the file reference
  const share = await this.findOne({
    shareToken: token,
    isActive: true,
  }).populate('fileId');

  if (!share) return null;

  // Check if share is still valid
  if (!share.isValid()) {
    // Deactivate expired/exhausted shares automatically
    share.isActive = false;
    await share.save();
    return null;
  }

  return share;
};

/**
 * getFileShares(fileId)
 * ---------------------
 * Get all active shares for a specific file.
 *
 * @param {string} fileId - The file's ID
 * @returns {Array} - Array of valid share documents
 *
 * VALIDATION:
 * Invalid shares (expired, exhausted) are automatically deactivated.
 *
 * EXAMPLE:
 * const shares = await FileShare.getFileShares(fileId);
 * // Returns array of active shares for this file
 */
fileShareSchema.statics.getFileShares = async function (fileId) {
  const shares = await this.find({
    fileId,
    isActive: true,
  }).sort({ createdAt: -1 }); // Newest first

  // Filter out and deactivate invalid shares
  const validShares = [];
  for (const share of shares) {
    if (share.isValid()) {
      validShares.push(share);
    } else {
      // Deactivate invalid shares
      share.isActive = false;
      await share.save();
    }
  }

  return validShares;
};

/**
 * getUserShareCount(userId)
 * -------------------------
 * Get the count of active shares a user has created.
 * Useful for enforcing share limits.
 *
 * @param {string} userId - User's ID
 * @returns {number} - Count of active shares
 *
 * EXAMPLE:
 * const shareCount = await FileShare.getUserShareCount(userId);
 * if (shareCount >= userLimit) {
 *   throw new Error('Share limit reached');
 * }
 */
fileShareSchema.statics.getUserShareCount = async function (userId) {
  return this.countDocuments({
    userId,
    isActive: true,
  });
};

/**
 * deactivateFileShares(fileId)
 * ----------------------------
 * Deactivate all shares for a file.
 * Used when deleting a file or revoking all shares.
 *
 * @param {string} fileId - The file's ID
 * @returns {number} - Number of shares deactivated
 *
 * EXAMPLE:
 * // User deletes a file - deactivate all its shares
 * const count = await FileShare.deactivateFileShares(fileId);
 * // count = how many shares were deactivated
 */
fileShareSchema.statics.deactivateFileShares = async function (fileId) {
  const result = await this.updateMany(
    { fileId, isActive: true },
    { $set: { isActive: false } }
  );
  return result.modifiedCount;
};

// =============================================================================
// INSTANCE METHODS (Called on a share document)
// =============================================================================

/**
 * isValid()
 * ---------
 * Check if this share is still valid (can be accessed).
 *
 * @returns {boolean} - true if valid, false if invalid
 *
 * CHECKS:
 * 1. isActive must be true
 * 2. If expiration set, must not be past
 * 3. If access limit set, must not be exceeded
 *
 * EXAMPLE:
 * if (share.isValid()) {
 *   // Allow access
 * } else {
 *   // Show "link expired" message
 * }
 */
fileShareSchema.methods.isValid = function () {
  // Check if deactivated
  if (!this.isActive) return false;

  // Check expiration date
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }

  // Check access count limit
  if (this.maxAccessCount !== null && this.accessCount >= this.maxAccessCount) {
    return false;
  }

  return true;
};

/**
 * recordAccess(accessInfo)
 * ------------------------
 * Record an access to this share.
 * Call this when someone views/downloads the shared file.
 *
 * @param {Object} accessInfo:
 *   - userId: The accessing user's ID (null if anonymous)
 *   - ipAddress: The accessor's IP address
 *   - userAgent: The accessor's browser/device info
 *
 * WHAT IT DOES:
 * 1. Increments accessCount
 * 2. Updates lastAccessedAt and lastAccessedBy
 * 3. Adds entry to accessLog (keeping last 100)
 * 4. Saves the document
 *
 * EXAMPLE:
 * await share.recordAccess({
 *   userId: req.user?._id,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * });
 */
fileShareSchema.methods.recordAccess = async function (accessInfo = {}) {
  const { userId, ipAddress, userAgent } = accessInfo;

  // Increment access count
  this.accessCount += 1;

  // Update last access info
  this.lastAccessedAt = new Date();
  if (userId) {
    this.lastAccessedBy = userId;
  }

  // Keep only last 100 access log entries to prevent unbounded growth
  if (this.accessLog.length >= 100) {
    this.accessLog = this.accessLog.slice(-99); // Keep last 99
  }

  // Add new log entry
  this.accessLog.push({
    accessedAt: new Date(),
    accessedBy: userId || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  await this.save();
};

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Removes sensitive information.
 *
 * @returns {Object} - Safe JSON representation
 *
 * REMOVES:
 * - __v (version key)
 * - password (never expose password hash)
 * - accessLog (too detailed for normal responses)
 */
fileShareSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.password; // Never expose password hash
  delete obj.accessLog; // Don't expose full access log by default
  return obj;
};

/**
 * toPublicJSON()
 * --------------
 * Convert to public information for share link pages.
 * Only includes info needed to display the share.
 *
 * @returns {Object} - Minimal public information
 *
 * INCLUDES:
 * - shareToken: For the URL
 * - shareType: To show appropriate UI
 * - permissions: What the user can do
 * - expiresAt: To show expiration info
 * - hasPassword: Whether to show password prompt (not the password itself!)
 */
fileShareSchema.methods.toPublicJSON = function () {
  return {
    shareToken: this.shareToken,
    shareType: this.shareType,
    permissions: this.permissions,
    expiresAt: this.expiresAt,
    hasPassword: !!this.password, // Boolean: true if password set
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the FileShare model from the schema.
 * This gives us methods to:
 * - Generate tokens: FileShare.generateToken()
 * - Find by token: FileShare.findByToken(token)
 * - Get file shares: FileShare.getFileShares(fileId)
 * - Get user count: FileShare.getUserShareCount(userId)
 * - Deactivate all: FileShare.deactivateFileShares(fileId)
 * - Check validity: share.isValid()
 * - Record access: share.recordAccess(info)
 * - Safe output: share.toSafeJSON(), share.toPublicJSON()
 *
 * TYPICAL FLOW - Creating a Share:
 * 1. User selects file and share settings
 * 2. const token = FileShare.generateToken()
 * 3. Create FileShare with token and settings
 * 4. Return share URL to user
 *
 * TYPICAL FLOW - Accessing a Share:
 * 1. User visits share link with token
 * 2. const share = await FileShare.findByToken(token)
 * 3. If null, show "invalid link" message
 * 4. Check password if required
 * 5. await share.recordAccess({ userId, ipAddress, userAgent })
 * 6. Serve the file based on permissions
 */
const FileShare = mongoose.model('FileShare', fileShareSchema);

export default FileShare;
