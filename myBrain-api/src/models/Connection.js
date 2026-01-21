/**
 * =============================================================================
 * CONNECTION.JS - User Connection/Friendship Data Model
 * =============================================================================
 *
 * This file defines the Connection model - the data structure for tracking
 * relationships between users in myBrain's social features.
 *
 * WHAT IS A CONNECTION?
 * ---------------------
 * A connection represents a relationship between two users, similar to
 * "friends" on Facebook or "connections" on LinkedIn. Connections enable
 * users to share content, message each other, and see activity feeds.
 *
 * CONNECTION LIFECYCLE:
 * ---------------------
 * 1. User A sends a connection request to User B → status: 'pending'
 * 2. User B can:
 *    - Accept → status: 'accepted' (they are now connected)
 *    - Decline → status: 'declined' (request denied)
 *    - Block → status: 'blocked' (prevents future requests)
 *
 * TWO-WAY RELATIONSHIP:
 * ---------------------
 * Unlike followers (one-way), connections are mutual. If A and B are
 * connected, both can:
 * - Share items with each other
 * - Send direct messages
 * - See each other's activity feed
 * - View profile details
 *
 * DATABASE DESIGN:
 * ----------------
 * We store ONE record per connection (not two). The requesterId is the
 * user who initiated, and addresseeId is the recipient. When checking
 * if two users are connected, we check both directions.
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
// CONNECTION SCHEMA DEFINITION
// =============================================================================

/**
 * The Connection Schema
 * ---------------------
 * Defines all the fields a Connection document can have.
 */
const connectionSchema = new mongoose.Schema({

  // ===========================================================================
  // PARTICIPANTS
  // ===========================================================================

  /**
   * requesterId: The user who SENT the connection request
   * - Required: Every connection starts with someone initiating
   * - References: Points to a User document
   * - Index: For finding requests sent by a user
   *
   * This is the "from" side of the connection request.
   */
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  /**
   * addresseeId: The user who RECEIVED the connection request
   * - Required: Every connection has a recipient
   * - References: Points to a User document
   * - Index: For finding pending requests for a user
   *
   * This is the "to" side of the connection request.
   */
  addresseeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * status: Current state of the connection
   *
   * VALUES:
   * - 'pending': Request sent, awaiting response
   * - 'accepted': Request accepted, users are connected
   * - 'declined': Request declined by recipient
   * - 'blocked': Recipient blocked the requester
   */
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    index: true
  },

  // ===========================================================================
  // REQUEST DETAILS
  // ===========================================================================

  /**
   * requestMessage: Optional message sent with the request
   * - Allows the requester to introduce themselves
   * - Max 500 characters
   *
   * EXAMPLE: "Hi! We met at the conference last week. Would love to connect!"
   */
  requestMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Request message cannot exceed 500 characters']
  },

  /**
   * connectionSource: How the connection was initiated
   * - Helps understand how users discover each other
   *
   * VALUES:
   * - 'search': User found the other via search
   * - 'profile': User visited their profile directly
   * - 'shared_item': User found them through a shared item
   * - 'invitation': User received an email/link invitation
   * - 'suggested': System suggested this connection
   */
  connectionSource: {
    type: String,
    enum: ['search', 'profile', 'shared_item', 'invitation', 'suggested'],
    default: 'search'
  },

  // ===========================================================================
  // TIMESTAMPS
  // ===========================================================================

  /**
   * acceptedAt: When the connection was accepted
   * - Only set when status changes to 'accepted'
   * - Used for sorting connections by when they were made
   */
  acceptedAt: {
    type: Date,
    default: null
  },

  /**
   * declinedAt: When the connection was declined
   * - Only set when status changes to 'declined'
   * - Useful for tracking and cleanup
   */
  declinedAt: {
    type: Date,
    default: null
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the connection request was sent
   * - updatedAt: When the connection was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Unique Compound Index
 * ---------------------
 * Ensures only ONE connection can exist between any two users.
 * If A requests B, neither can send another request (in either direction)
 * until the existing connection is removed.
 */
connectionSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

/**
 * Index for Pending Requests
 * --------------------------
 * Quickly find pending requests for a user (inbox).
 */
connectionSchema.index({ addresseeId: 1, status: 1 });

/**
 * Index for Listing Connections
 * -----------------------------
 * For showing connections sorted by date.
 */
connectionSchema.index({ status: 1, createdAt: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * areConnected(userId1, userId2)
 * ------------------------------
 * Check if two users have an accepted connection.
 *
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {boolean} - True if they are connected
 *
 * EXAMPLE:
 * const connected = await Connection.areConnected(userA, userB);
 * if (connected) {
 *   // Show private content
 * }
 *
 * NOTE: We check both directions since either user could be the requester.
 */
connectionSchema.statics.areConnected = async function(userId1, userId2) {
  const connection = await this.findOne({
    // Check both directions (A→B or B→A)
    $or: [
      { requesterId: userId1, addresseeId: userId2 },
      { requesterId: userId2, addresseeId: userId1 }
    ],
    status: 'accepted'
  });
  return !!connection; // Convert to boolean
};

/**
 * getConnection(userId1, userId2)
 * -------------------------------
 * Get the connection between two users (regardless of status).
 * Useful for checking if a connection request already exists.
 *
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {Object|null} - The connection document or null
 */
connectionSchema.statics.getConnection = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { requesterId: userId1, addresseeId: userId2 },
      { requesterId: userId2, addresseeId: userId1 }
    ]
  });
};

/**
 * getConnections(userId, options)
 * -------------------------------
 * Get all accepted connections for a user.
 * Returns the full connection details with user information.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - populate: Include user details (default true)
 * @returns {Array} - Array of connection documents
 *
 * USAGE:
 * const connections = await Connection.getConnections(userId);
 * connections.forEach(conn => {
 *   const friend = conn.getOtherUser(userId);
 *   console.log(`Connected to: ${friend.profile.displayName}`);
 * });
 */
connectionSchema.statics.getConnections = async function(userId, options = {}) {
  const { limit = 50, skip = 0, populate = true } = options;

  const query = this.find({
    // User is either requester or addressee
    $or: [
      { requesterId: userId },
      { addresseeId: userId }
    ],
    status: 'accepted'
  })
    .sort({ acceptedAt: -1 }) // Most recent connections first
    .skip(skip)
    .limit(limit);

  // Populate user details if requested
  if (populate) {
    query.populate('requesterId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
         .populate('addresseeId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');
  }

  return query;
};

/**
 * getPendingRequests(userId, options)
 * -----------------------------------
 * Get pending connection requests RECEIVED by a user.
 * These are requests waiting for the user to accept/decline.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of pending connection requests
 *
 * EXAMPLE:
 * const pending = await Connection.getPendingRequests(userId);
 * // Show in notifications: "3 people want to connect"
 */
connectionSchema.statics.getPendingRequests = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    addresseeId: userId,       // Requests TO this user
    status: 'pending'
  })
    .populate('requesterId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId profile.bio')
    .sort({ createdAt: -1 })   // Newest requests first
    .skip(skip)
    .limit(limit);
};

/**
 * getSentRequests(userId, options)
 * --------------------------------
 * Get pending requests SENT by a user that haven't been responded to yet.
 * Useful for showing "awaiting response" status.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of sent pending requests
 */
connectionSchema.statics.getSentRequests = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    requesterId: userId,       // Requests FROM this user
    status: 'pending'
  })
    .populate('addresseeId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getConnectionCount(userId)
 * --------------------------
 * Get the total number of accepted connections for a user.
 * Used for profile display ("250 connections").
 *
 * @param {string} userId - User's ID
 * @returns {number} - Count of accepted connections
 */
connectionSchema.statics.getConnectionCount = async function(userId) {
  return this.countDocuments({
    $or: [
      { requesterId: userId },
      { addresseeId: userId }
    ],
    status: 'accepted'
  });
};

/**
 * getPendingCount(userId)
 * -----------------------
 * Get the count of pending requests waiting for a user to respond.
 * Used for notification badges.
 *
 * @param {string} userId - User's ID
 * @returns {number} - Count of pending incoming requests
 */
connectionSchema.statics.getPendingCount = async function(userId) {
  return this.countDocuments({
    addresseeId: userId,
    status: 'pending'
  });
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * getOtherUser(currentUserId)
 * ---------------------------
 * Get the "other" user in a connection (not the current user).
 * Useful when displaying connection lists.
 *
 * @param {string} currentUserId - The current user's ID
 * @returns {Object} - The other user's ID or populated user object
 *
 * EXAMPLE:
 * const connection = await Connection.findById(id).populate('requesterId addresseeId');
 * const friend = connection.getOtherUser(req.user._id);
 * // friend is the User object of the connection
 */
connectionSchema.methods.getOtherUser = function(currentUserId) {
  const currentUserIdStr = currentUserId.toString();

  // Check if users are populated (have _id property) or just ObjectId
  if (this.requesterId._id) {
    // Populated - return the full user object
    return this.requesterId._id.toString() === currentUserIdStr
      ? this.addresseeId
      : this.requesterId;
  }

  // Not populated - return the ObjectId
  return this.requesterId.toString() === currentUserIdStr
    ? this.addresseeId
    : this.requesterId;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Connection model from the schema.
 * This gives us methods to:
 * - Check connections: Connection.areConnected(user1, user2)
 * - Get connections: Connection.getConnections(userId)
 * - Get pending: Connection.getPendingRequests(userId)
 * - Get counts: Connection.getConnectionCount(userId)
 */
const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;
