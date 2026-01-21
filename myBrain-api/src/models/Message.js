/**
 * =============================================================================
 * MESSAGE.JS - Chat Message Data Model
 * =============================================================================
 *
 * This file defines the Message model - the data structure for chat messages
 * exchanged between users in myBrain's messaging feature.
 *
 * WHAT IS A MESSAGE?
 * ------------------
 * A message is a piece of communication sent from one user to another within
 * a conversation. Messages can be text, images, files, or system notifications.
 *
 * MESSAGE TYPES:
 * --------------
 * - 'text': Regular text message
 * - 'image': Message with image attachment(s)
 * - 'file': Message with file attachment(s)
 * - 'system': System-generated message (user joined, left, etc.)
 *
 * KEY FEATURES:
 * -------------
 * - Read receipts (track who has read each message)
 * - Message replies (threading)
 * - Edit history (track edits, time-limited editing)
 * - Soft delete (mark as deleted without removing)
 * - File attachments (images, documents, etc.)
 *
 * MESSAGE LIFECYCLE:
 * ------------------
 * 1. Sender composes and sends message
 * 2. Message stored with createdAt timestamp
 * 3. Recipients see message and read receipts are recorded
 * 4. Sender can edit within 15 minutes (edit history kept)
 * 5. Message can be soft-deleted (marked, not removed)
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
// SUB-SCHEMAS (Embedded Documents)
// =============================================================================

/**
 * Attachment Schema
 * -----------------
 * Represents a file or media attached to a message.
 *
 * _id: false means attachments don't get their own IDs
 */
const attachmentSchema = new mongoose.Schema({
  /**
   * type: What kind of attachment this is
   *
   * VALUES:
   * - 'image': Photo or graphic
   * - 'file': Document, PDF, etc.
   * - 'video': Video clip
   * - 'audio': Voice message, audio file
   */
  type: {
    type: String,
    enum: ['image', 'file', 'video', 'audio'],
    required: true
  },

  /**
   * url: Direct URL to access the attachment
   * - Required: Must know where the file is stored
   */
  url: {
    type: String,
    required: true
  },

  /**
   * thumbnailUrl: URL to a smaller preview image
   * - Optional: For images and videos
   * - Used to show previews without loading full file
   */
  thumbnailUrl: String,

  /**
   * name: Original filename
   * - Displayed to users
   */
  name: String,

  /**
   * size: File size in bytes
   */
  size: Number,

  /**
   * mimeType: File type (e.g., "image/png", "application/pdf")
   */
  mimeType: String

}, { _id: false });

/**
 * Read Receipt Schema
 * -------------------
 * Tracks when each user read a message.
 * Enables "seen by" functionality.
 *
 * _id: false means receipts don't get their own IDs
 */
const readReceiptSchema = new mongoose.Schema({
  /**
   * userId: Who read the message
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * readAt: When they read it
   * - Defaults to now when the receipt is created
   */
  readAt: {
    type: Date,
    default: Date.now
  }

}, { _id: false });

// =============================================================================
// MESSAGE SCHEMA DEFINITION
// =============================================================================

/**
 * The Message Schema
 * ------------------
 * Defines all the fields a Message document can have.
 */
const messageSchema = new mongoose.Schema({

  // ===========================================================================
  // CONVERSATION REFERENCE
  // ===========================================================================

  /**
   * conversationId: Which conversation this message belongs to
   * - Required: Every message is part of a conversation
   * - References: Points to a Conversation document
   * - Index: For fetching messages in a conversation
   */
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // ===========================================================================
  // SENDER
  // ===========================================================================

  /**
   * senderId: Who sent this message
   * - Required: Every message has a sender
   * - References: Points to a User document
   * - Index: For finding messages by sender
   */
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  /**
   * content: The text content of the message
   * - Max 10,000 characters
   * - Can be empty if message is only attachments
   */
  content: {
    type: String,
    maxlength: [10000, 'Message cannot exceed 10000 characters']
  },

  /**
   * contentType: What kind of message this is
   *
   * VALUES:
   * - 'text': Regular text message (default)
   * - 'image': Message with image(s)
   * - 'file': Message with file attachment(s)
   * - 'system': System-generated message
   */
  contentType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },

  /**
   * attachments: Files/media attached to this message
   * - Array of attachment sub-documents
   * - Can have multiple attachments per message
   */
  attachments: [attachmentSchema],

  // ===========================================================================
  // READ RECEIPTS
  // ===========================================================================

  /**
   * readBy: List of users who have read this message
   * - Array of read receipt sub-documents
   * - Sender is not included (they wrote it, they know)
   *
   * EXAMPLE:
   * readBy: [
   *   { userId: "user123", readAt: "2024-01-15T10:30:00Z" },
   *   { userId: "user456", readAt: "2024-01-15T10:35:00Z" }
   * ]
   */
  readBy: [readReceiptSchema],

  // ===========================================================================
  // THREADING (REPLIES)
  // ===========================================================================

  /**
   * replyToId: If this message is a reply, reference to the original message
   * - Enables message threading
   * - null if not a reply
   */
  replyToId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  /**
   * replyToPreview: Cached snippet of the message being replied to
   * - Stored so we don't need to look up the original message
   * - Contains just enough for display
   */
  replyToPreview: {
    /**
     * content: First part of the replied message's text
     */
    content: String,

    /**
     * senderId: Who sent the message being replied to
     */
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // ===========================================================================
  // EDIT STATUS
  // ===========================================================================

  /**
   * isEdited: Whether this message has been edited
   * - Shows "(edited)" indicator in UI
   */
  isEdited: {
    type: Boolean,
    default: false
  },

  /**
   * editedAt: When the message was last edited
   * - Only set if isEdited is true
   */
  editedAt: Date,

  /**
   * editHistory: Record of all previous versions
   * - Keeps track of what the message said before each edit
   * - Ordered oldest to newest
   */
  editHistory: [{
    /**
     * content: What the message said before this edit
     */
    content: String,

    /**
     * editedAt: When this edit was made
     */
    editedAt: Date
  }],

  // ===========================================================================
  // DELETE STATUS (SOFT DELETE)
  // ===========================================================================

  /**
   * isDeleted: Whether this message has been deleted
   * - Soft delete: message stays in database but is hidden
   * - UI shows "This message was deleted"
   */
  isDeleted: {
    type: Boolean,
    default: false
  },

  /**
   * deletedAt: When the message was deleted
   */
  deletedAt: Date,

  /**
   * deletedBy: Who deleted the message
   * - Could be the sender or a conversation admin
   */
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ===========================================================================
  // SYSTEM MESSAGE METADATA
  // ===========================================================================

  /**
   * systemMeta: Extra information for system messages
   * - Only used when contentType is 'system'
   */
  systemMeta: {
    /**
     * type: What kind of system event this message represents
     *
     * VALUES:
     * - 'user_joined': Someone joined the conversation
     * - 'user_left': Someone left the conversation
     * - 'group_created': A group conversation was created
     * - 'group_renamed': The group was renamed
     * - 'user_added': Someone was added to the group
     * - 'user_removed': Someone was removed from the group
     */
    type: {
      type: String,
      enum: ['user_joined', 'user_left', 'group_created', 'group_renamed', 'user_added', 'user_removed']
    },

    /**
     * targetUserId: The user affected by the action (if applicable)
     * - For 'user_added' or 'user_removed' events
     */
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the message was sent
   * - updatedAt: When the message was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Primary Index: Messages in a Conversation
 * -----------------------------------------
 * The most common query - get messages for a conversation, newest first.
 */
messageSchema.index({ conversationId: 1, createdAt: -1 });

/**
 * Index for Sender Queries
 * ------------------------
 * Find all messages by a specific user.
 */
messageSchema.index({ senderId: 1, createdAt: -1 });

/**
 * Index for Non-Deleted Messages
 * ------------------------------
 * Quickly filter out deleted messages.
 */
messageSchema.index({ conversationId: 1, isDeleted: 1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getMessages(conversationId, options)
 * ------------------------------------
 * Get messages for a conversation with pagination and filtering.
 *
 * @param {string} conversationId - The conversation's ID
 * @param {Object} options:
 *   - limit: Max messages to return (default 50)
 *   - before: Get messages before this timestamp (for "load more")
 *   - after: Get messages after this timestamp (for new messages)
 * @returns {Array} - Messages sorted newest first
 *
 * EXAMPLE:
 * // Initial load
 * const messages = await Message.getMessages(convId);
 *
 * // Load older messages
 * const older = await Message.getMessages(convId, {
 *   before: messages[messages.length - 1].createdAt
 * });
 */
messageSchema.statics.getMessages = async function(conversationId, options = {}) {
  const { limit = 50, before, after } = options;

  // Start with conversation filter, exclude deleted
  const query = {
    conversationId,
    isDeleted: false
  };

  // Pagination - get messages before a certain time
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  // Or get messages after a certain time (for new messages)
  if (after) {
    query.createdAt = { $gt: new Date(after) };
  }

  return this.find(query)
    .populate('senderId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .populate('replyToPreview.senderId', 'email profile.displayName profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * createSystemMessage(conversationId, type, actorId, targetUserId, content)
 * -------------------------------------------------------------------------
 * Create a system message for conversation events.
 *
 * @param {string} conversationId - The conversation's ID
 * @param {string} type - System message type ('user_joined', etc.)
 * @param {string} actorId - Who triggered the action
 * @param {string} targetUserId - Who was affected (optional)
 * @param {string} content - Custom message content (optional)
 * @returns {Object} - The created system message
 *
 * EXAMPLE:
 * await Message.createSystemMessage(convId, 'user_added', adminId, newUserId);
 * // Creates: "John was added to the conversation"
 */
messageSchema.statics.createSystemMessage = async function(conversationId, type, actorId, targetUserId = null, content = null) {
  // Default messages for each system event type
  const systemMessages = {
    user_joined: 'joined the conversation',
    user_left: 'left the conversation',
    group_created: 'created this group',
    group_renamed: content || 'renamed this group',
    user_added: 'was added to the conversation',
    user_removed: 'was removed from the conversation'
  };

  const message = new this({
    conversationId,
    senderId: actorId,
    content: content || systemMessages[type],
    contentType: 'system',
    systemMeta: {
      type,
      targetUserId
    }
  });

  await message.save();
  return message;
};

/**
 * getUnreadCount(conversationId, userId, lastReadAt)
 * --------------------------------------------------
 * Count unread messages in a conversation for a specific user.
 *
 * @param {string} conversationId - The conversation's ID
 * @param {string} userId - The user to check for
 * @param {Date} lastReadAt - When the user last read messages
 * @returns {number} - Count of unread messages
 *
 * EXAMPLE:
 * const unread = await Message.getUnreadCount(convId, userId, user.lastReadAt);
 * // Returns: 5 (there are 5 unread messages)
 */
messageSchema.statics.getUnreadCount = async function(conversationId, userId, lastReadAt) {
  const query = {
    conversationId,
    isDeleted: false,
    senderId: { $ne: userId } // Don't count user's own messages
  };

  // If we have a last read time, only count newer messages
  if (lastReadAt) {
    query.createdAt = { $gt: lastReadAt };
  }

  return this.countDocuments(query);
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * markAsRead(userId)
 * ------------------
 * Record that a user has read this message.
 *
 * @param {string} userId - The user who read the message
 * @returns {boolean} - True if a new read receipt was added
 *
 * EXAMPLE:
 * await message.markAsRead(req.user._id);
 */
messageSchema.methods.markAsRead = async function(userId) {
  // Check if already marked as read
  const alreadyRead = this.readBy.some(
    r => r.userId.toString() === userId.toString()
  );

  // Don't add receipt if already read or if user is the sender
  if (!alreadyRead && this.senderId.toString() !== userId.toString()) {
    this.readBy.push({ userId, readAt: new Date() });
    await this.save();
    return true;
  }
  return false;
};

/**
 * edit(newContent)
 * ----------------
 * Edit the message content. Records the old content in edit history.
 *
 * @param {string} newContent - The new message text
 * @throws {Error} - If message is deleted
 *
 * EXAMPLE:
 * await message.edit("Fixed typo in my message");
 */
messageSchema.methods.edit = async function(newContent) {
  // Can't edit deleted messages
  if (this.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }

  // Save current content to history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });

  // Update content
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();

  await this.save();
};

/**
 * softDelete(userId)
 * ------------------
 * Mark message as deleted without actually removing it.
 *
 * @param {string} userId - Who is deleting the message
 *
 * EXAMPLE:
 * await message.softDelete(req.user._id);
 */
messageSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
};

/**
 * canEdit(userId)
 * ---------------
 * Check if a user can edit this message.
 * Rules: Must be sender, not deleted, and within 15 minutes.
 *
 * @param {string} userId - The user trying to edit
 * @returns {boolean} - True if editing is allowed
 */
messageSchema.methods.canEdit = function(userId) {
  // Can't edit deleted messages
  if (this.isDeleted) return false;

  // Only sender can edit
  if (this.senderId.toString() !== userId.toString()) return false;

  // Can only edit within 15 minutes of sending
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.createdAt > fifteenMinutesAgo;
};

/**
 * canDelete(userId, isConversationAdmin)
 * --------------------------------------
 * Check if a user can delete this message.
 * Sender can always delete, admins can delete any message.
 *
 * @param {string} userId - The user trying to delete
 * @param {boolean} isConversationAdmin - If user is conversation admin
 * @returns {boolean} - True if deletion is allowed
 */
messageSchema.methods.canDelete = function(userId, isConversationAdmin = false) {
  // Already deleted
  if (this.isDeleted) return false;

  // Sender can always delete their own messages
  if (this.senderId.toString() === userId.toString()) return true;

  // Conversation admins can delete any message
  return isConversationAdmin;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Message model from the schema.
 */
const Message = mongoose.model('Message', messageSchema);

export default Message;
