/**
 * =============================================================================
 * CONVERSATION.JS - Chat Conversation Data Model
 * =============================================================================
 *
 * This file defines the Conversation model - the data structure for chat
 * threads between users in myBrain's messaging system.
 *
 * WHAT IS A CONVERSATION?
 * -----------------------
 * A conversation is a container for messages between two or more users.
 * Think of it like an email thread or a chat room - it groups related
 * messages together so you can follow a discussion.
 *
 * CONVERSATION TYPES:
 * -------------------
 * 1. DIRECT (1-on-1):
 *    - Between exactly two users
 *    - Private chat, like text messaging
 *    - Example: John chatting with Sarah
 *
 * 2. GROUP:
 *    - Three or more users
 *    - Has a name, description, and optional avatar
 *    - Has roles (owner, admin, member)
 *    - Example: "Project Team" group with 5 members
 *
 * PARTICIPANT METADATA:
 * --------------------
 * Each user in a conversation has their own settings stored separately:
 * - lastReadAt: When they last read messages (for "unread" badge)
 * - unreadCount: How many messages they haven't read
 * - mutedUntil: If/when the conversation is muted
 * - isArchived: If they've archived this conversation
 * - role: Their role in group chats (member, admin, owner)
 *
 * This way, if John archives a conversation, Sarah still sees it normally.
 *
 * LAST MESSAGE PREVIEW:
 * --------------------
 * To display conversation lists efficiently, we store a preview of the
 * last message directly on the conversation. This avoids having to
 * query the Messages collection for every conversation in the list.
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
// SUB-SCHEMAS
// =============================================================================

/**
 * Participant Metadata Schema
 * ---------------------------
 * Stores per-user settings for each conversation participant.
 * Each user can have different read status, mute settings, etc.
 *
 * WHY SEPARATE METADATA?
 * Different users have different states for the same conversation:
 * - John might have read all messages, Sarah might have 3 unread
 * - John might mute it, Sarah might want notifications
 * - John might archive it, Sarah keeps it active
 */
const participantMetaSchema = new mongoose.Schema({
  /**
   * userId: Which user this metadata belongs to
   * - Required: Every metadata entry needs a user
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * lastReadAt: When this user last read messages in this conversation
   * - Used to calculate unread count
   * - Updated when user opens the conversation
   *
   * EXAMPLE: If lastReadAt is yesterday, and there are 3 messages
   * from today, the unread count is 3.
   */
  lastReadAt: {
    type: Date,
    default: null
  },

  /**
   * unreadCount: Number of unread messages for this user
   * - Denormalized (duplicated) for performance
   * - Instead of counting every time, we track it directly
   * - Incremented when new message arrives, reset when user reads
   *
   * This appears as the badge number: "Messages (3)"
   */
  unreadCount: {
    type: Number,
    default: 0
  },

  /**
   * mutedUntil: When the mute expires (null = not muted)
   * - Muted conversations don't send notifications
   * - Can be temporary (muted for 1 hour) or indefinite
   *
   * EXAMPLES:
   * - null: Not muted, receive notifications
   * - new Date('2024-01-01 10:00'): Muted until 10am
   * - new Date('2099-12-31'): Effectively muted forever
   */
  mutedUntil: {
    type: Date,
    default: null
  },

  /**
   * isArchived: Has this user archived the conversation?
   * - Archived conversations are hidden from the main list
   * - User can still access them in the "Archived" section
   * - New messages might un-archive it (depends on settings)
   */
  isArchived: {
    type: Boolean,
    default: false
  },

  /**
   * joinedAt: When this user joined the conversation
   * - For direct chats: when the conversation was created
   * - For groups: when they were added
   * - Users only see messages after they joined
   */
  joinedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * role: User's role in the conversation (for group chats)
   *
   * VALUES:
   * - 'member': Regular participant, can send messages
   * - 'admin': Can add/remove members, change settings
   * - 'owner': Full control, can delete the group, promote admins
   *
   * For direct chats, everyone is just 'member'.
   */
  role: {
    type: String,
    enum: ['member', 'admin', 'owner'],
    default: 'member'
  }
}, { _id: false }); // Don't create separate _id for this sub-document

// =============================================================================
// CONVERSATION SCHEMA DEFINITION
// =============================================================================

/**
 * The Conversation Schema
 * -----------------------
 * Defines all the fields a Conversation document can have.
 */
const conversationSchema = new mongoose.Schema({

  // ===========================================================================
  // PARTICIPANTS
  // ===========================================================================

  /**
   * participants: Array of users in this conversation
   * - For direct chats: exactly 2 users
   * - For groups: 2 or more users
   * - References: Each is a User document ID
   *
   * EXAMPLE:
   * Direct: [userId1, userId2]
   * Group: [userId1, userId2, userId3, userId4]
   */
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ===========================================================================
  // CONVERSATION TYPE
  // ===========================================================================

  /**
   * type: What kind of conversation this is
   *
   * VALUES:
   * - 'direct': One-on-one private chat (2 users only)
   * - 'group': Group conversation (3+ users)
   */
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },

  // ===========================================================================
  // GROUP CHAT METADATA
  // ===========================================================================

  /**
   * groupMeta: Additional info for group conversations
   * - Only used when type is 'group'
   * - Direct chats don't need these fields
   */
  groupMeta: {
    /**
     * name: Display name for the group
     * EXAMPLE: "Project Team", "Marketing Department"
     */
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters']
    },

    /**
     * description: What the group is about
     * EXAMPLE: "Discussion channel for the Q4 marketing campaign"
     */
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    /**
     * avatarUrl: Group's profile picture URL
     */
    avatarUrl: String,

    /**
     * createdBy: User who created the group
     * - This user typically starts as 'owner'
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // ===========================================================================
  // LAST MESSAGE PREVIEW
  // ===========================================================================

  /**
   * lastMessage: Preview of the most recent message
   *
   * WHY STORE THIS?
   * When showing a conversation list, we need to display:
   * "John: Hey, are you free tomorrow?" with the time.
   *
   * Instead of querying the Messages collection for each conversation,
   * we store the preview here for fast display.
   */
  lastMessage: {
    /**
     * content: Preview text of the message
     * - Truncated to 500 characters
     * EXAMPLE: "Hey, are you free tomorrow?"
     */
    content: {
      type: String,
      maxlength: 500
    },

    /**
     * senderId: Who sent the last message
     * - Used to show "John: message..." format
     */
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /**
     * sentAt: When the last message was sent
     * - Used for sorting conversations by "most recent"
     * - Displayed as "2m ago", "Yesterday", etc.
     */
    sentAt: Date,

    /**
     * contentType: What kind of message it was
     *
     * VALUES:
     * - 'text': Regular text message
     * - 'image': Image was sent
     * - 'file': File was sent
     * - 'system': System message (user joined, left, etc.)
     *
     * Used to show "Sent a photo" instead of empty preview.
     */
    contentType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    }
  },

  // ===========================================================================
  // PARTICIPANT METADATA
  // ===========================================================================

  /**
   * participantMeta: Per-user settings for each participant
   * - One entry for each user in participants
   * - Stores read status, mute settings, etc.
   */
  participantMeta: [participantMetaSchema],

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * messageCount: Total number of messages in this conversation
   * - Incremented with each new message
   * - Used for statistics and display
   */
  messageCount: {
    type: Number,
    default: 0
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * isActive: Is this conversation still active?
   * - Default: true
   * - Set to false when deleted/disabled
   * - Inactive conversations are hidden from queries
   */
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the conversation was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Finding User's Conversations
 * --------------------------------------
 * Quickly find all conversations a user is part of.
 */
conversationSchema.index({ participants: 1 });

/**
 * Index for User's Metadata Lookup
 * --------------------------------
 * Find participant metadata for a specific user across conversations.
 */
conversationSchema.index({ 'participantMeta.userId': 1 });

/**
 * Index for Sorting by Last Message
 * ---------------------------------
 * Sort conversations by most recent activity.
 */
conversationSchema.index({ 'lastMessage.sentAt': -1 });

/**
 * Index for Update Time
 * ---------------------
 * Sort conversations by when they were last modified.
 */
conversationSchema.index({ updatedAt: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * findDirectConversation(userId1, userId2)
 * ----------------------------------------
 * Find an existing direct conversation between two users.
 *
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {Object|null} - The conversation or null if none exists
 *
 * EXAMPLE:
 * const existing = await Conversation.findDirectConversation(john._id, sarah._id);
 * if (existing) {
 *   // Use existing conversation
 * }
 *
 * NOTE: Uses $all and $size to ensure it's exactly these 2 users,
 * not a group chat that happens to include both.
 */
conversationSchema.statics.findDirectConversation = async function(userId1, userId2) {
  return this.findOne({
    type: 'direct',
    participants: { $all: [userId1, userId2], $size: 2 },
    isActive: true
  });
};

/**
 * getOrCreateDirect(userId1, userId2)
 * -----------------------------------
 * Get an existing direct conversation or create a new one.
 * This is the main way to start a chat with someone.
 *
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {Object} - { conversation, created: boolean }
 *
 * EXAMPLE:
 * // When user clicks "Message" on someone's profile
 * const { conversation, created } = await Conversation.getOrCreateDirect(me._id, them._id);
 * if (created) {
 *   console.log('Started new conversation!');
 * }
 */
conversationSchema.statics.getOrCreateDirect = async function(userId1, userId2) {
  // First, try to find existing conversation
  let conversation = await this.findDirectConversation(userId1, userId2);

  // If exists, return it
  if (conversation) {
    return { conversation, created: false };
  }

  // Otherwise, create a new one
  conversation = new this({
    type: 'direct',
    participants: [userId1, userId2],
    participantMeta: [
      { userId: userId1, role: 'member' },
      { userId: userId2, role: 'member' }
    ]
  });

  await conversation.save();
  return { conversation, created: true };
};

/**
 * getConversationsForUser(userId, options)
 * ----------------------------------------
 * Get all conversations for a user's inbox.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - includeArchived: Show archived conversations too
 * @returns {Array} - Array of conversation documents with populated user info
 *
 * EXAMPLE:
 * // Load user's message inbox
 * const conversations = await Conversation.getConversationsForUser(userId);
 * // Each has: participants (with names), lastMessage, unread counts
 */
conversationSchema.statics.getConversationsForUser = async function(userId, options = {}) {
  const { limit = 50, skip = 0, includeArchived = false } = options;

  // Build query: find conversations where user is a participant
  const matchQuery = {
    participants: userId,
    isActive: true
  };

  // Optionally filter out archived conversations
  if (!includeArchived) {
    matchQuery['participantMeta'] = {
      $elemMatch: {
        userId: userId,
        isArchived: false
      }
    };
  }

  return this.find(matchQuery)
    // Populate participant info (for displaying names/avatars)
    .populate('participants', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId presence')
    // Populate last message sender info
    .populate('lastMessage.senderId', 'email profile.displayName profile.firstName profile.lastName')
    // Sort by most recent activity
    .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getTotalUnreadCount(userId)
 * ---------------------------
 * Get the total unread message count across all conversations.
 * Used for the main "Messages (5)" badge in the navigation.
 *
 * @param {string} userId - User's ID
 * @returns {number} - Total unread count
 *
 * EXAMPLE:
 * const totalUnread = await Conversation.getTotalUnreadCount(userId);
 * // Display in nav: "Messages (12)"
 */
conversationSchema.statics.getTotalUnreadCount = async function(userId) {
  // Use aggregation pipeline to sum up unread counts
  const result = await this.aggregate([
    // Find conversations the user is in
    { $match: { participants: new mongoose.Types.ObjectId(userId), isActive: true } },
    // Unwind the participantMeta array to access individual entries
    { $unwind: '$participantMeta' },
    // Filter to only this user's metadata
    { $match: { 'participantMeta.userId': new mongoose.Types.ObjectId(userId) } },
    // Sum up all unread counts
    { $group: { _id: null, total: { $sum: '$participantMeta.unreadCount' } } }
  ]);

  return result[0]?.total || 0;
};

// =============================================================================
// INSTANCE METHODS (Called on a conversation document)
// =============================================================================

/**
 * getParticipantMeta(userId)
 * --------------------------
 * Get the metadata for a specific participant in this conversation.
 *
 * @param {string} userId - User's ID
 * @returns {Object|undefined} - The participant's metadata or undefined
 *
 * EXAMPLE:
 * const meta = conversation.getParticipantMeta(userId);
 * console.log(`Unread: ${meta.unreadCount}`);
 */
conversationSchema.methods.getParticipantMeta = function(userId) {
  return this.participantMeta.find(
    p => p.userId.toString() === userId.toString()
  );
};

/**
 * updateLastMessage(message)
 * --------------------------
 * Update the conversation with a new message preview.
 * Called every time a new message is sent.
 *
 * @param {Object} message - The message document
 *
 * This method:
 * 1. Updates the lastMessage preview
 * 2. Increments the message count
 * 3. Increments unread count for all recipients (not the sender)
 *
 * EXAMPLE:
 * await conversation.updateLastMessage(newMessage);
 */
conversationSchema.methods.updateLastMessage = async function(message) {
  // Update the preview
  this.lastMessage = {
    content: message.content?.substring(0, 500), // Truncate for preview
    senderId: message.senderId,
    sentAt: message.createdAt,
    contentType: message.contentType
  };

  // Increment total message count
  this.messageCount += 1;

  // Increment unread count for everyone except the sender
  this.participantMeta.forEach(pm => {
    if (pm.userId.toString() !== message.senderId.toString()) {
      pm.unreadCount += 1;
    }
  });

  await this.save();
};

/**
 * markAsRead(userId)
 * ------------------
 * Mark this conversation as read for a user.
 * Called when user opens the conversation.
 *
 * @param {string} userId - User's ID
 *
 * EXAMPLE:
 * // When user opens a conversation
 * await conversation.markAsRead(userId);
 * // Now unread count is 0
 */
conversationSchema.methods.markAsRead = async function(userId) {
  const meta = this.getParticipantMeta(userId);
  if (meta) {
    meta.lastReadAt = new Date();
    meta.unreadCount = 0;
    await this.save();
  }
};

/**
 * toggleArchive(userId)
 * ---------------------
 * Toggle the archived status for a user.
 * Archived conversations are hidden from the main list.
 *
 * @param {string} userId - User's ID
 * @returns {boolean} - New archived status
 *
 * EXAMPLE:
 * const isNowArchived = await conversation.toggleArchive(userId);
 * // Returns true if now archived, false if un-archived
 */
conversationSchema.methods.toggleArchive = async function(userId) {
  const meta = this.getParticipantMeta(userId);
  if (meta) {
    meta.isArchived = !meta.isArchived;
    await this.save();
  }
  return meta?.isArchived;
};

/**
 * mute(userId, duration)
 * ----------------------
 * Mute notifications for this conversation.
 *
 * @param {string} userId - User's ID
 * @param {number} duration - Mute duration in milliseconds (null = forever)
 *
 * EXAMPLES:
 * // Mute for 1 hour
 * await conversation.mute(userId, 60 * 60 * 1000);
 *
 * // Mute forever
 * await conversation.mute(userId);
 */
conversationSchema.methods.mute = async function(userId, duration = null) {
  const meta = this.getParticipantMeta(userId);
  if (meta) {
    if (duration) {
      // Mute until duration from now
      meta.mutedUntil = new Date(Date.now() + duration);
    } else {
      // Mute indefinitely (far future date)
      meta.mutedUntil = new Date('2099-12-31');
    }
    await this.save();
  }
};

/**
 * unmute(userId)
 * --------------
 * Remove mute from this conversation.
 *
 * @param {string} userId - User's ID
 */
conversationSchema.methods.unmute = async function(userId) {
  const meta = this.getParticipantMeta(userId);
  if (meta) {
    meta.mutedUntil = null;
    await this.save();
  }
};

/**
 * isMuted(userId)
 * ---------------
 * Check if this conversation is currently muted for a user.
 *
 * @param {string} userId - User's ID
 * @returns {boolean} - True if currently muted
 *
 * EXAMPLE:
 * if (conversation.isMuted(userId)) {
 *   // Don't send push notification
 * }
 */
conversationSchema.methods.isMuted = function(userId) {
  const meta = this.getParticipantMeta(userId);
  if (!meta || !meta.mutedUntil) return false;
  // Muted if current time is before mutedUntil
  return new Date() < meta.mutedUntil;
};

// =============================================================================
// GROUP CONVERSATION METHODS
// =============================================================================

/**
 * addParticipant(userId, addedBy)
 * -------------------------------
 * Add a new participant to a group conversation.
 *
 * @param {string} userId - User to add
 * @param {string} addedBy - User who is adding them
 * @returns {boolean} - True if added, false if already a participant
 * @throws {Error} - If not a group conversation
 *
 * EXAMPLE:
 * await groupConversation.addParticipant(newUser._id, admin._id);
 */
conversationSchema.methods.addParticipant = async function(userId, addedBy) {
  // Only works for group conversations
  if (this.type !== 'group') {
    throw new Error('Can only add participants to group conversations');
  }

  // Check if already a participant
  if (this.participants.some(p => p.toString() === userId.toString())) {
    return false; // Already in the group
  }

  // Add to participants list
  this.participants.push(userId);

  // Add metadata for the new participant
  this.participantMeta.push({
    userId,
    role: 'member',
    joinedAt: new Date()
  });

  await this.save();
  return true;
};

/**
 * removeParticipant(userId)
 * -------------------------
 * Remove a participant from a group conversation.
 *
 * @param {string} userId - User to remove
 * @throws {Error} - If not a group conversation
 *
 * EXAMPLE:
 * await groupConversation.removeParticipant(userToRemove._id);
 */
conversationSchema.methods.removeParticipant = async function(userId) {
  // Only works for group conversations
  if (this.type !== 'group') {
    throw new Error('Can only remove participants from group conversations');
  }

  // Remove from participants array
  this.participants = this.participants.filter(
    p => p.toString() !== userId.toString()
  );

  // Remove their metadata
  this.participantMeta = this.participantMeta.filter(
    p => p.userId.toString() !== userId.toString()
  );

  await this.save();
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Conversation model from the schema.
 * This gives us methods to:
 * - Find/create direct chats: Conversation.getOrCreateDirect(user1, user2)
 * - Get user's inbox: Conversation.getConversationsForUser(userId)
 * - Get total unread: Conversation.getTotalUnreadCount(userId)
 * - Update last message: conversation.updateLastMessage(message)
 * - Mark as read: conversation.markAsRead(userId)
 * - Mute/unmute: conversation.mute(userId), conversation.unmute(userId)
 * - Archive: conversation.toggleArchive(userId)
 * - Group management: conversation.addParticipant(), removeParticipant()
 */
const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
