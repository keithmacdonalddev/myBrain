/**
 * =============================================================================
 * USERBLOCK.JS - User Blocking Data Model
 * =============================================================================
 *
 * This file defines the UserBlock model - the data structure for tracking
 * when one user blocks another user in myBrain.
 *
 * WHAT IS A USER BLOCK?
 * ---------------------
 * A block is when User A prevents User B from interacting with them.
 * This is a safety feature that helps users control who can contact them
 * and see their content.
 *
 * WHAT HAPPENS WHEN YOU BLOCK SOMEONE?
 * ------------------------------------
 * When User A blocks User B:
 *
 * 1. B cannot:
 *    - Send connection requests to A
 *    - Send messages to A
 *    - See A's profile (if A has it restricted)
 *    - Comment on A's shared content
 *    - View A in search results
 *
 * 2. A's content:
 *    - A's posts/activities hidden from B's feed
 *    - Existing shares with B may be revoked
 *
 * 3. Both users:
 *    - Existing connections are broken
 *    - Can't be added to the same group chat
 *
 * ONE-WAY RELATIONSHIP:
 * ---------------------
 * Unlike connections (which are mutual), blocks are one-way:
 * - A blocking B doesn't mean B blocked A
 * - B might not even know they're blocked
 * - A can unblock B at any time
 *
 * MUTUAL BLOCKING:
 * ----------------
 * For safety features (like search), we often check both directions:
 * - Is A blocked by B? (B blocked A)
 * - Has A blocked B? (A blocked B)
 *
 * If EITHER is true, we prevent interaction.
 *
 * REASONS FOR BLOCKING:
 * ---------------------
 * Users can specify why they blocked someone:
 * - spam: Unwanted promotional messages
 * - harassment: Bullying or threatening behavior
 * - inappropriate: Inappropriate content or behavior
 * - other: Any other reason
 *
 * This helps with moderation and understanding platform safety.
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
// USER BLOCK SCHEMA DEFINITION
// =============================================================================

/**
 * The User Block Schema
 * ---------------------
 * Defines all the fields a UserBlock document can have.
 */
const userBlockSchema = new mongoose.Schema({

  // ===========================================================================
  // BLOCK PARTICIPANTS
  // ===========================================================================

  /**
   * blockerId: The user who created the block (the blocker)
   * - Required: Every block has someone who initiated it
   * - References: Points to a User document
   * - Index: For finding who a user has blocked
   *
   * This is WHO is doing the blocking.
   */
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  /**
   * blockedId: The user who is blocked
   * - Required: Every block has a target
   * - References: Points to a User document
   * - Index: For finding who has blocked a user
   *
   * This is WHO is being blocked.
   */
  blockedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // BLOCK REASON
  // ===========================================================================

  /**
   * reason: Why the user was blocked
   * - Optional but helpful for moderation
   * - Default: 'other'
   *
   * VALUES:
   * - 'spam': User was sending unwanted promotional messages
   * - 'harassment': User was bullying or threatening
   * - 'inappropriate': User shared inappropriate content
   * - 'other': Any other reason
   */
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'other'],
    default: 'other'
  },

  /**
   * notes: Additional details about the block
   * - Optional: For the user's own reference
   * - Max 500 characters
   *
   * EXAMPLE: "Kept sending unsolicited sales messages"
   */
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the block was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Unique Compound Index
 * ---------------------
 * Ensures only ONE block can exist between two users (in one direction).
 * If A already blocked B, A can't block B again.
 *
 * Note: A blocking B and B blocking A are separate records.
 */
userBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * isBlocked(blockerId, blockedId)
 * -------------------------------
 * Check if one user has blocked another (one direction only).
 *
 * @param {string} blockerId - The potential blocker's ID
 * @param {string} blockedId - The potentially blocked user's ID
 * @returns {boolean} - True if blockerId has blocked blockedId
 *
 * EXAMPLE:
 * // Check if John blocked Sarah
 * const johnBlockedSarah = await UserBlock.isBlocked(johnId, sarahId);
 * if (johnBlockedSarah) {
 *   // Sarah can't message John
 * }
 */
userBlockSchema.statics.isBlocked = async function(blockerId, blockedId) {
  const block = await this.findOne({ blockerId, blockedId });
  return !!block; // Convert to boolean
};

/**
 * hasBlockBetween(userId1, userId2)
 * ---------------------------------
 * Check if EITHER user has blocked the other (both directions).
 * Used when we need to prevent any interaction between two users.
 *
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {boolean} - True if any block exists between them
 *
 * EXAMPLE:
 * // Before allowing a connection request
 * const hasBlock = await UserBlock.hasBlockBetween(senderId, recipientId);
 * if (hasBlock) {
 *   // Don't allow the connection request
 * }
 */
userBlockSchema.statics.hasBlockBetween = async function(userId1, userId2) {
  // Check both directions in one query
  const block = await this.findOne({
    $or: [
      { blockerId: userId1, blockedId: userId2 }, // User1 blocked User2
      { blockerId: userId2, blockedId: userId1 }  // User2 blocked User1
    ]
  });
  return !!block;
};

/**
 * getBlockedUsers(userId, options)
 * --------------------------------
 * Get all users that a user has blocked.
 * Used for the "Blocked Users" settings page.
 *
 * @param {string} userId - The blocker's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 * @returns {Array} - Array of UserBlock documents with blocked user info
 *
 * EXAMPLE:
 * const blockedUsers = await UserBlock.getBlockedUsers(userId);
 * // Shows list of users with unblock option
 */
userBlockSchema.statics.getBlockedUsers = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({ blockerId: userId })
    .populate('blockedId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ createdAt: -1 }) // Most recently blocked first
    .skip(skip)
    .limit(limit);
};

/**
 * getBlockedUserIds(userId)
 * -------------------------
 * Get just the IDs of users blocked by this user.
 * Useful for filtering queries (exclude these users from results).
 *
 * @param {string} userId - The blocker's ID
 * @returns {Array} - Array of blocked user IDs
 *
 * EXAMPLE:
 * const blockedIds = await UserBlock.getBlockedUserIds(userId);
 * // Then use in query: { userId: { $nin: blockedIds } }
 */
userBlockSchema.statics.getBlockedUserIds = async function(userId) {
  // Only select the blockedId field for efficiency
  const blocks = await this.find({ blockerId: userId }).select('blockedId');
  return blocks.map(b => b.blockedId);
};

/**
 * getBlockedByUserIds(userId)
 * ---------------------------
 * Get IDs of users who have blocked this user.
 * Useful for hiding this user from people who blocked them.
 *
 * @param {string} userId - The potentially blocked user's ID
 * @returns {Array} - Array of user IDs who blocked this user
 *
 * EXAMPLE:
 * const blockedByIds = await UserBlock.getBlockedByUserIds(userId);
 * // These users shouldn't see this user in their searches
 */
userBlockSchema.statics.getBlockedByUserIds = async function(userId) {
  // Find blocks where this user is the blocked one
  const blocks = await this.find({ blockedId: userId }).select('blockerId');
  return blocks.map(b => b.blockerId);
};

/**
 * getAllExcludedUserIds(userId)
 * -----------------------------
 * Get all user IDs that should be excluded from this user's view.
 * Combines both:
 * - Users this user has blocked
 * - Users who have blocked this user
 *
 * @param {string} userId - The user's ID
 * @returns {Array} - Array of user IDs to exclude (deduplicated strings)
 *
 * EXAMPLE:
 * const excludedIds = await UserBlock.getAllExcludedUserIds(userId);
 * // Use in search: "Don't show any of these users"
 *
 * WHY COMBINE BOTH?
 * - If I blocked you: I don't want to see you
 * - If you blocked me: You don't want me to see you (or interact)
 * - Either way, we shouldn't appear in each other's results
 */
userBlockSchema.statics.getAllExcludedUserIds = async function(userId) {
  // Get both lists in parallel for efficiency
  const [blockedIds, blockedByIds] = await Promise.all([
    this.getBlockedUserIds(userId),    // Users I've blocked
    this.getBlockedByUserIds(userId)   // Users who've blocked me
  ]);

  // Combine and deduplicate using Set
  const allIds = [...blockedIds, ...blockedByIds];
  return [...new Set(allIds.map(id => id.toString()))];
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the UserBlock model from the schema.
 * This gives us methods to:
 * - Check blocks: UserBlock.isBlocked(blockerId, blockedId)
 * - Check mutual: UserBlock.hasBlockBetween(user1, user2)
 * - Get blocked users: UserBlock.getBlockedUsers(userId)
 * - Get IDs for filtering: getBlockedUserIds(), getBlockedByUserIds()
 * - Get all excluded: UserBlock.getAllExcludedUserIds(userId)
 */
const UserBlock = mongoose.model('UserBlock', userBlockSchema);

export default UserBlock;
