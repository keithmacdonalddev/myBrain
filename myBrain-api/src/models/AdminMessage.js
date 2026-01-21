/**
 * =============================================================================
 * ADMINMESSAGE.JS - Admin-to-User Direct Communication Model
 * =============================================================================
 *
 * This file defines the AdminMessage model - the data structure for storing
 * direct messages from administrators to users.
 *
 * WHAT IS AN ADMIN MESSAGE?
 * -------------------------
 * An admin message is a direct communication from an administrator to a user.
 * Unlike regular notifications, admin messages:
 * - Are persistent and can be reviewed later
 * - Have full message content (not just a preview)
 * - Support replies tracking
 * - Are useful for support, warnings, and announcements
 *
 * USE CASES:
 * ----------
 * 1. SUPPORT: "Your ticket has been resolved"
 * 2. WARNINGS: "We've noticed some concerning activity on your account"
 * 3. ANNOUNCEMENTS: "Important changes to your subscription"
 * 4. FOLLOW-UPS: "Regarding your recent report..."
 * 5. VERIFICATION: "Please verify your email address"
 *
 * RELATIONSHIP TO NOTIFICATIONS:
 * ------------------------------
 * When an admin message is sent, a notification is also created to alert
 * the user. The admin message stores the full content; the notification
 * provides the alert and quick preview.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// ADMIN MESSAGE SCHEMA DEFINITION
// =============================================================================

const adminMessageSchema = new mongoose.Schema({

  // ===========================================================================
  // RECIPIENT
  // ===========================================================================

  /**
   * userId: The user who receives this message
   * - Required: Every message must have a recipient
   * - Index: For fast lookups of a user's messages
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // SENDER (ADMIN)
  // ===========================================================================

  /**
   * sentBy: The admin who sent this message
   * - Required: Track which admin sent the message
   * - References: Points to a User document (with admin role)
   */
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ===========================================================================
  // MESSAGE CONTENT
  // ===========================================================================

  /**
   * subject: Message subject line
   * - Required: Every message needs a subject
   * - Max 200 characters
   *
   * EXAMPLES:
   * - "Regarding your recent report"
   * - "Account security notice"
   * - "Your subscription has been updated"
   */
  subject: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },

  /**
   * message: Full message content
   * - Required: The actual message body
   * - Max 5000 characters: Allow for detailed communications
   */
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },

  // ===========================================================================
  // MESSAGE CATEGORY
  // ===========================================================================

  /**
   * category: Type of admin message
   * - Helps organize and filter messages
   *
   * VALUES:
   * - 'general': General communication
   * - 'support': Support-related response
   * - 'moderation': Moderation-related notice
   * - 'security': Security alert or notice
   * - 'billing': Billing or subscription related
   * - 'announcement': Platform announcement
   */
  category: {
    type: String,
    enum: ['general', 'support', 'moderation', 'security', 'billing', 'announcement'],
    default: 'general'
  },

  // ===========================================================================
  // PRIORITY
  // ===========================================================================

  /**
   * priority: Message priority level
   * - Affects how the message is displayed to the user
   *
   * VALUES:
   * - 'low': Informational, no urgency
   * - 'normal': Standard priority
   * - 'high': Important, needs attention
   * - 'urgent': Critical, immediate attention required
   */
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // ===========================================================================
  // STATUS FLAGS
  // ===========================================================================

  /**
   * isRead: Has the user read this message?
   * - Default: false
   * - Index: For counting unread messages
   */
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  /**
   * readAt: When the user read the message
   */
  readAt: {
    type: Date
  },

  // ===========================================================================
  // RELATED ENTITIES
  // ===========================================================================

  /**
   * relatedTo: Link to a related entity (report, ticket, etc.)
   * - Optional: Not all messages relate to a specific item
   */
  relatedTo: {
    entityType: {
      type: String,
      enum: ['report', 'moderation_action', 'ticket', 'other']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },

  // ===========================================================================
  // METADATA
  // ===========================================================================

  /**
   * metadata: Additional data for special handling
   * - Store any extra information needed
   */
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }

}, {
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for User's Messages by Date
 * Find a user's admin messages sorted by newest first.
 */
adminMessageSchema.index({ userId: 1, createdAt: -1 });

/**
 * Index for User's Unread Messages
 * Quickly find unread admin messages for a user.
 */
adminMessageSchema.index({ userId: 1, isRead: 1 });

/**
 * Index by Category
 * Filter messages by type.
 */
adminMessageSchema.index({ category: 1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getMessages(userId, options)
 * ----------------------------
 * Get admin messages for a user.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - unreadOnly: Only return unread messages
 *   - category: Filter by category
 * @returns {Array} - Array of admin message documents
 */
adminMessageSchema.statics.getMessages = async function(userId, options = {}) {
  const { limit = 50, skip = 0, unreadOnly = false, category = null } = options;

  const query = { userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .populate('sentBy', 'email profile.displayName profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * getUnreadCount(userId)
 * ----------------------
 * Get the number of unread admin messages for a user.
 *
 * @param {string} userId - User's ID
 * @returns {number} - Count of unread messages
 */
adminMessageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

/**
 * sendMessage(adminId, userId, data)
 * ----------------------------------
 * Send an admin message to a user.
 *
 * @param {string} adminId - Admin sending the message
 * @param {string} userId - User receiving the message
 * @param {Object} data - Message data
 *   - subject: Message subject
 *   - message: Message body
 *   - category: Message category
 *   - priority: Message priority
 *   - relatedTo: Related entity (optional)
 * @returns {Object} - The created message
 */
adminMessageSchema.statics.sendMessage = async function(adminId, userId, data) {
  const { subject, message, category = 'general', priority = 'normal', relatedTo = null } = data;

  const adminMessage = new this({
    userId,
    sentBy: adminId,
    subject,
    message,
    category,
    priority,
    relatedTo
  });

  await adminMessage.save();

  // Create a notification for the user
  const Notification = mongoose.model('Notification');
  await Notification.notifyAdminMessage(userId, subject, message, adminId);

  return adminMessage;
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * markAsRead()
 * ------------
 * Mark this message as read.
 */
adminMessageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON representation.
 */
adminMessageSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  return {
    _id: obj._id,
    subject: obj.subject,
    message: obj.message,
    category: obj.category,
    priority: obj.priority,
    isRead: obj.isRead,
    readAt: obj.readAt,
    sentBy: obj.sentBy,
    relatedTo: obj.relatedTo,
    createdAt: obj.createdAt
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const AdminMessage = mongoose.model('AdminMessage', adminMessageSchema);

export default AdminMessage;
