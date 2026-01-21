/**
 * =============================================================================
 * ITEMSHARE.JS - Content Sharing Data Model
 * =============================================================================
 *
 * This file defines the ItemShare model - the data structure for sharing
 * projects, tasks, notes, files, and folders with other users in myBrain.
 *
 * WHAT IS AN ITEM SHARE?
 * ----------------------
 * An ItemShare represents sharing an item (like a project or file) with
 * one or more other users. Think of it like Google Docs sharing - you
 * can share with specific people, or create a shareable link.
 *
 * SHARE TYPES:
 * ------------
 * 1. CONNECTION SHARE:
 *    - Share with specific connected users
 *    - Requires them to accept the share
 *    - Most controlled form of sharing
 *
 * 2. PUBLIC SHARE:
 *    - Creates a shareable link anyone can access
 *    - No authentication required
 *    - Link format: /share/abc123def456
 *
 * 3. PASSWORD SHARE:
 *    - Like public share, but requires a password
 *    - Extra security for sensitive content
 *    - Link + password needed to view
 *
 * PERMISSION LEVELS:
 * ------------------
 * - VIEW: Can only look at the content
 * - COMMENT: Can view and add comments
 * - EDIT: Can make changes to the content
 *
 * Additional permissions for public/password shares:
 * - canDownload: Can download files
 * - canShare: Can re-share with others
 *
 * ACCESS CONTROLS:
 * ----------------
 * Public/password shares can have:
 * - Expiration date: Link stops working after this date
 * - Max access count: Link stops working after N views
 *
 * ACCESS LOGGING:
 * ---------------
 * Every access to a shared item is logged with:
 * - Who accessed it
 * - When they accessed it
 * - What action they took (view, download, edit)
 * - Their IP address
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
 * crypto: Node.js built-in library for generating secure random tokens.
 * Used to create unique share links (like abc123def456).
 */
import crypto from 'crypto';

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

/**
 * Shared User Schema
 * ------------------
 * Stores info about each user an item is shared with (for connection shares).
 * Each user has their own permission level and status.
 */
const sharedUserSchema = new mongoose.Schema({
  /**
   * userId: The user this item is shared with
   * - Required: Must specify who
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * permission: What this user can do with the item
   *
   * VALUES:
   * - 'view': Can only look at the content (read-only)
   * - 'comment': Can view and add comments
   * - 'edit': Can make changes to the content
   */
  permission: {
    type: String,
    enum: ['view', 'comment', 'edit'],
    default: 'view'
  },

  /**
   * sharedAt: When the share was sent
   * - Used for sorting and display
   */
  sharedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * status: Current state of the share invitation
   *
   * VALUES:
   * - 'pending': Share sent, waiting for user to accept
   * - 'accepted': User accepted and can access the item
   * - 'declined': User declined the share
   */
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },

  /**
   * acceptedAt: When the user accepted the share
   * - Only set when status changes to 'accepted'
   */
  acceptedAt: Date
}, { _id: false }); // Don't create separate _id for sub-documents

/**
 * Access Log Entry Schema
 * -----------------------
 * Records each time someone accesses the shared item.
 * Used for tracking, analytics, and security.
 */
const accessLogEntrySchema = new mongoose.Schema({
  /**
   * userId: Who accessed the item
   * - Can be null for anonymous/public access
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  /**
   * accessedAt: When they accessed it
   */
  accessedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * action: What they did
   *
   * VALUES:
   * - 'view': Looked at the content
   * - 'download': Downloaded a file
   * - 'edit': Made changes
   * - 'comment': Added a comment
   */
  action: {
    type: String,
    enum: ['view', 'download', 'edit', 'comment']
  },

  /**
   * ip: IP address of the access
   * - Useful for security and tracking
   */
  ip: String
}, { _id: false });

// =============================================================================
// ITEM SHARE SCHEMA DEFINITION
// =============================================================================

/**
 * The Item Share Schema
 * ---------------------
 * Defines all the fields an ItemShare document can have.
 */
const itemShareSchema = new mongoose.Schema({

  // ===========================================================================
  // ITEM REFERENCE
  // ===========================================================================

  /**
   * itemId: The ID of the item being shared
   * - Required: Must specify what's being shared
   * - Index: For finding shares of a specific item
   *
   * This could be a Project, Task, Note, File, or Folder ID.
   */
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  /**
   * itemType: What kind of item is being shared
   * - Required: Must know the type to look up the item
   *
   * VALUES:
   * - 'project': A project is being shared
   * - 'task': A task is being shared
   * - 'note': A note is being shared
   * - 'file': A file is being shared
   * - 'folder': A folder (with contents) is being shared
   */
  itemType: {
    type: String,
    enum: ['project', 'task', 'note', 'file', 'folder'],
    required: true
  },

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * ownerId: The user who owns and is sharing the item
   * - Required: Every share has an owner
   * - Index: For finding all shares by a user
   *
   * The owner always has full access and can revoke the share.
   */
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // SHARE TYPE
  // ===========================================================================

  /**
   * shareType: How the item is being shared
   *
   * VALUES:
   * - 'connection': Shared with specific users (requires acceptance)
   * - 'public': Shareable link anyone can access
   * - 'password': Shareable link requiring a password
   */
  shareType: {
    type: String,
    enum: ['connection', 'public', 'password'],
    default: 'connection'
  },

  // ===========================================================================
  // SHARED USERS (for connection shares)
  // ===========================================================================

  /**
   * sharedWithUsers: List of users the item is shared with
   * - Only used for 'connection' share type
   * - Each entry has permission level and status
   */
  sharedWithUsers: [sharedUserSchema],

  // ===========================================================================
  // PUBLIC/PASSWORD SHARE SETTINGS
  // ===========================================================================

  /**
   * shareToken: The unique token in the shareable link
   * - Only for 'public' and 'password' share types
   * - Generated as a random hex string
   * - EXAMPLE: "a1b2c3d4e5f67890" → /share/a1b2c3d4e5f67890
   *
   * unique + sparse: Only enforces uniqueness on non-null values.
   */
  shareToken: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    index: true
  },

  /**
   * sharePasswordHash: Hashed password for password-protected shares
   * - Only for 'password' share type
   * - select: false means it won't be included in queries by default
   *   (must explicitly request it for security)
   */
  sharePasswordHash: {
    type: String,
    select: false // Hide by default for security
  },

  /**
   * permissions: What actions are allowed for public/password shares
   * - These apply to anyone with the link (or link + password)
   */
  permissions: {
    canView: { type: Boolean, default: true },      // Can view the content
    canComment: { type: Boolean, default: false },   // Can add comments
    canEdit: { type: Boolean, default: false },      // Can make changes
    canDownload: { type: Boolean, default: true },   // Can download files
    canShare: { type: Boolean, default: false }      // Can re-share with others
  },

  // ===========================================================================
  // ACCESS LIMITS
  // ===========================================================================

  /**
   * expiresAt: When this share expires
   * - After this date, the share no longer works
   * - null = never expires
   * - Uses TTL index for automatic cleanup
   */
  expiresAt: {
    type: Date,
    default: null
  },

  /**
   * maxAccessCount: Maximum number of times the share can be accessed
   * - null = unlimited access
   * - EXAMPLE: Set to 5 for "first 5 viewers only"
   */
  maxAccessCount: {
    type: Number,
    default: null
  },

  /**
   * currentAccessCount: How many times the share has been accessed
   * - Incremented each time someone views
   * - Compared against maxAccessCount
   */
  currentAccessCount: {
    type: Number,
    default: 0
  },

  // ===========================================================================
  // ACCESS TRACKING
  // ===========================================================================

  /**
   * accessLog: Record of every access to this share
   * - Who, when, what action, from where (IP)
   * - Kept limited to prevent database bloat
   */
  accessLog: [accessLogEntrySchema],

  // ===========================================================================
  // METADATA
  // ===========================================================================

  /**
   * title: Display title for the share
   * - Can be different from the item's actual title
   * - Useful for custom share link names
   */
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  /**
   * description: Description for the share
   * - Explains what's being shared or adds context
   */
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * isActive: Is this share currently active?
   * - Default: true
   * - Set to false to disable the share without deleting it
   */
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the share was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Finding Shares of an Item
 * -----------------------------------
 * Quickly find all shares of a specific item (regardless of type).
 */
itemShareSchema.index({ itemId: 1, itemType: 1 });

/**
 * Index for Finding Shares Received by User
 * -----------------------------------------
 * Find all items shared with a specific user.
 */
itemShareSchema.index({ 'sharedWithUsers.userId': 1 });

/**
 * Index for Finding Shares by Owner and Type
 * ------------------------------------------
 * Find all shares of a certain type by a user.
 */
itemShareSchema.index({ ownerId: 1, itemType: 1 });

/**
 * TTL Index for Automatic Expiration
 * ----------------------------------
 * MongoDB automatically deletes expired shares.
 * expireAfterSeconds: 0 means delete when expiresAt time arrives.
 */
itemShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * generateShareToken()
 * --------------------
 * Generate a unique token for a shareable link.
 * Creates a 32-character random hex string.
 *
 * @returns {string} - Random token like "a1b2c3d4e5f67890abcdef1234567890"
 *
 * EXAMPLE:
 * const token = ItemShare.generateShareToken();
 * // Creates link: /share/a1b2c3d4e5f67890abcdef1234567890
 */
itemShareSchema.statics.generateShareToken = function() {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * hashPassword(password)
 * ----------------------
 * Hash a password for password-protected shares.
 * Uses bcrypt for secure one-way hashing.
 *
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password (safe to store)
 */
itemShareSchema.statics.hashPassword = async function(password) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(password, 10); // 10 rounds of salting
};

/**
 * getSharedWithUser(userId, options)
 * ----------------------------------
 * Get all items that have been shared with a user and they've accepted.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - itemType: Filter by item type
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of ItemShare documents
 *
 * EXAMPLE:
 * const sharedProjects = await ItemShare.getSharedWithUser(userId, { itemType: 'project' });
 */
itemShareSchema.statics.getSharedWithUser = async function(userId, options = {}) {
  const { itemType, limit = 50, skip = 0 } = options;

  const query = {
    'sharedWithUsers.userId': userId,
    'sharedWithUsers.status': 'accepted', // Only accepted shares
    isActive: true
  };

  // Optional: filter by item type
  if (itemType) {
    query.itemType = itemType;
  }

  return this.find(query)
    .populate('ownerId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getPendingShares(userId, options)
 * ---------------------------------
 * Get pending share invitations for a user.
 * These are shares waiting to be accepted.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of pending ItemShare documents
 */
itemShareSchema.statics.getPendingShares = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    'sharedWithUsers.userId': userId,
    'sharedWithUsers.status': 'pending', // Only pending invites
    isActive: true
  })
    .populate('ownerId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getSharedByUser(userId, options)
 * --------------------------------
 * Get all items a user has shared with others.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - itemType: Filter by item type
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of ItemShare documents with recipient info
 */
itemShareSchema.statics.getSharedByUser = async function(userId, options = {}) {
  const { itemType, limit = 50, skip = 0 } = options;

  const query = {
    ownerId: userId,
    isActive: true
  };

  if (itemType) {
    query.itemType = itemType;
  }

  return this.find(query)
    .populate('sharedWithUsers.userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getByToken(token)
 * -----------------
 * Get a share by its public token (for public/password shares).
 * Used when someone accesses a share link.
 *
 * @param {string} token - The share token from the URL
 * @returns {Object|null} - The ItemShare document or null
 *
 * EXAMPLE:
 * // User visits /share/abc123
 * const share = await ItemShare.getByToken('abc123');
 * if (share && !share.isExpired()) {
 *   // Show the shared content
 * }
 */
itemShareSchema.statics.getByToken = async function(token) {
  return this.findOne({
    shareToken: token,
    isActive: true,
    shareType: { $in: ['public', 'password'] } // Only for link shares
  }).populate('ownerId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');
};

/**
 * getSharesForItem(itemId, itemType)
 * ----------------------------------
 * Get all active shares for a specific item.
 * Used to show who an item is shared with.
 *
 * @param {string} itemId - The item's ID
 * @param {string} itemType - Type of item
 * @returns {Array} - Array of ItemShare documents
 */
itemShareSchema.statics.getSharesForItem = async function(itemId, itemType) {
  return this.find({
    itemId,
    itemType,
    isActive: true
  }).populate('sharedWithUsers.userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');
};

/**
 * getShareCounts(userId)
 * ----------------------
 * Get share statistics for a user.
 * Used for dashboard/profile display.
 *
 * @param {string} userId - User's ID
 * @returns {Object} - { sharedWithMe, sharedByMe, pending }
 */
itemShareSchema.statics.getShareCounts = async function(userId) {
  // Run all three counts in parallel for efficiency
  const [sharedWithMe, sharedByMe, pending] = await Promise.all([
    // Items shared with this user (accepted)
    this.countDocuments({
      'sharedWithUsers.userId': userId,
      'sharedWithUsers.status': 'accepted',
      isActive: true
    }),
    // Items this user has shared
    this.countDocuments({
      ownerId: userId,
      isActive: true
    }),
    // Pending share invitations for this user
    this.countDocuments({
      'sharedWithUsers.userId': userId,
      'sharedWithUsers.status': 'pending',
      isActive: true
    })
  ]);

  return { sharedWithMe, sharedByMe, pending };
};

// =============================================================================
// INSTANCE METHODS (Called on an ItemShare document)
// =============================================================================

/**
 * verifyPassword(password)
 * ------------------------
 * Check if a password matches for password-protected shares.
 *
 * @param {string} password - The password to check
 * @returns {boolean} - True if password matches
 *
 * EXAMPLE:
 * const isValid = await share.verifyPassword(userInput);
 * if (isValid) {
 *   // Show the content
 * }
 */
itemShareSchema.methods.verifyPassword = async function(password) {
  // If no password set, always allow
  if (!this.sharePasswordHash) return true;

  const bcrypt = (await import('bcryptjs')).default;

  // Need to fetch the password hash since it's select: false
  const share = await this.constructor.findById(this._id).select('+sharePasswordHash');
  return bcrypt.compare(password, share.sharePasswordHash);
};

/**
 * isExpired()
 * -----------
 * Check if this share has expired.
 *
 * @returns {boolean} - True if expired
 */
itemShareSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false; // No expiration set
  return new Date() > this.expiresAt;
};

/**
 * hasReachedMaxAccess()
 * ---------------------
 * Check if this share has reached its maximum access count.
 *
 * @returns {boolean} - True if max reached
 */
itemShareSchema.methods.hasReachedMaxAccess = function() {
  if (!this.maxAccessCount) return false; // No limit set
  return this.currentAccessCount >= this.maxAccessCount;
};

/**
 * hasUserAccess(userId)
 * ---------------------
 * Check if a specific user has access to this share.
 *
 * @param {string} userId - User's ID
 * @returns {boolean} - True if user has access
 *
 * Access is granted if:
 * - User is the owner
 * - User is in sharedWithUsers with 'accepted' status
 */
itemShareSchema.methods.hasUserAccess = function(userId) {
  // Owner always has access
  if (this.ownerId.toString() === userId.toString()) return true;

  // Check if in shared users list with accepted status
  const sharedUser = this.sharedWithUsers.find(
    u => u.userId.toString() === userId.toString() && u.status === 'accepted'
  );
  return !!sharedUser;
};

/**
 * getUserPermission(userId)
 * -------------------------
 * Get the permission level for a specific user.
 *
 * @param {string} userId - User's ID
 * @returns {string|null} - 'owner', 'view', 'comment', 'edit', or null
 */
itemShareSchema.methods.getUserPermission = function(userId) {
  // Owner has full control
  if (this.ownerId.toString() === userId.toString()) return 'owner';

  // Find user in shared users list
  const sharedUser = this.sharedWithUsers.find(
    u => u.userId.toString() === userId.toString() && u.status === 'accepted'
  );
  return sharedUser?.permission || null;
};

/**
 * logAccess(userId, action, ip)
 * -----------------------------
 * Record an access to this share.
 *
 * @param {string} userId - Who accessed (null for anonymous)
 * @param {string} action - What they did ('view', 'download', etc.)
 * @param {string} ip - Their IP address
 *
 * This method:
 * 1. Adds entry to access log
 * 2. Increments access count
 * 3. Keeps only last 100 log entries (to prevent bloat)
 */
itemShareSchema.methods.logAccess = async function(userId, action, ip) {
  // Add to access log
  this.accessLog.push({ userId, action, ip, accessedAt: new Date() });

  // Increment access counter
  this.currentAccessCount += 1;

  // Keep only last 100 entries to prevent database bloat
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100);
  }

  await this.save();
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the ItemShare model from the schema.
 * This gives us methods to:
 * - Generate tokens: ItemShare.generateShareToken()
 * - Hash passwords: ItemShare.hashPassword(password)
 * - Get shares: getSharedWithUser(), getSharedByUser(), getPendingShares()
 * - Find by token: ItemShare.getByToken(token)
 * - Get counts: ItemShare.getShareCounts(userId)
 * - Check access: share.hasUserAccess(), share.isExpired(), share.hasReachedMaxAccess()
 * - Verify password: share.verifyPassword(password)
 * - Log access: share.logAccess(userId, action, ip)
 */
const ItemShare = mongoose.model('ItemShare', itemShareSchema);

export default ItemShare;
