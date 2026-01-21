/**
 * =============================================================================
 * NOTIFICATION.JS - User Notification Data Model
 * =============================================================================
 *
 * This file defines the Notification model - the data structure for alerting
 * users about events, activities, and updates in myBrain.
 *
 * WHAT IS A NOTIFICATION?
 * -----------------------
 * A notification is an alert that tells a user something happened that they
 * should know about. Think of it like the red badge on your phone apps.
 *
 * EXAMPLES OF NOTIFICATIONS:
 * - "John wants to connect with you"
 * - "Sarah shared a project with you"
 * - "New message from Mike"
 * - "Your password was changed"
 *
 * NOTIFICATION TYPES:
 * ------------------
 * 1. CONNECTIONS:
 *    - connection_request: Someone wants to connect
 *    - connection_accepted: Your request was accepted
 *
 * 2. SHARING:
 *    - item_shared: Someone shared something with you
 *    - share_accepted: Someone accepted your shared item
 *
 * 3. MESSAGING:
 *    - new_message: You received a new message
 *    - message_mention: Someone mentioned you in a message
 *
 * 4. COMMENTS:
 *    - comment_added: Someone commented on your item
 *    - comment_reply: Someone replied to your comment
 *
 * 5. COLLABORATION:
 *    - collaborator_added: You were added as a collaborator
 *    - collaborator_removed: You were removed as a collaborator
 *    - item_updated: A shared item was updated
 *
 * 6. SYSTEM:
 *    - system_announcement: Important platform news
 *    - security_alert: Security-related warning
 *    - account_update: Account changes
 *
 * READ vs SEEN:
 * -------------
 * - SEEN: The notification appeared in the user's notification list
 *   (they might have glanced at it)
 * - READ: The user clicked on the notification and viewed the details
 *
 * This distinction helps track:
 * - Unread count (red badge number)
 * - New notifications since last visit
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
// NOTIFICATION SCHEMA DEFINITION
// =============================================================================

/**
 * The Notification Schema
 * -----------------------
 * Defines all the fields a Notification document can have.
 */
const notificationSchema = new mongoose.Schema({

  // ===========================================================================
  // RECIPIENT
  // ===========================================================================

  /**
   * userId: The user who receives this notification
   * - Required: Every notification has a recipient
   * - References: Points to a User document
   * - Index: For fast lookups of a user's notifications
   *
   * This is WHO should see the notification.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // NOTIFICATION TYPE
  // ===========================================================================

  /**
   * type: What kind of notification this is
   * - Required: We need to know what happened
   * - Index: For filtering by notification type
   *
   * VALUES - CONNECTIONS:
   * - 'connection_request': Someone sent you a connection request
   * - 'connection_accepted': Someone accepted your connection request
   *
   * VALUES - SHARING:
   * - 'item_shared': Someone shared a project/task/note/file with you
   * - 'share_accepted': Recipient accepted your shared item
   *
   * VALUES - MESSAGING:
   * - 'new_message': You have a new direct message
   * - 'message_mention': Someone @mentioned you in a message
   *
   * VALUES - COMMENTS:
   * - 'comment_added': Someone commented on your item
   * - 'comment_reply': Someone replied to your comment
   *
   * VALUES - COLLABORATION:
   * - 'collaborator_added': You were added to collaborate on something
   * - 'collaborator_removed': You were removed from a collaboration
   * - 'item_updated': A shared/collaborated item was changed
   *
   * VALUES - SYSTEM:
   * - 'system_announcement': Platform-wide announcement
   * - 'security_alert': Security warning (password changed, new login, etc.)
   * - 'account_update': Changes to your account
   *
   * VALUES - MODERATION:
   * - 'moderation_warning': You received a warning from admins
   * - 'moderation_suspension': Your account has been suspended
   * - 'moderation_ban': Your account has been banned
   * - 'moderation_unsuspend': Your suspension has been lifted
   * - 'moderation_unban': Your ban has been lifted
   * - 'admin_message': Direct message from admins
   */
  type: {
    type: String,
    enum: [
      // Connections
      'connection_request',
      'connection_accepted',
      // Sharing
      'item_shared',
      'share_accepted',
      // Messaging
      'new_message',
      'message_mention',
      // Comments
      'comment_added',
      'comment_reply',
      // Collaboration
      'collaborator_added',
      'collaborator_removed',
      'item_updated',
      // System
      'system_announcement',
      'security_alert',
      'account_update',
      // Moderation
      'moderation_warning',
      'moderation_suspension',
      'moderation_ban',
      'moderation_unsuspend',
      'moderation_unban',
      'admin_message'
    ],
    required: true,
    index: true
  },

  // ===========================================================================
  // ACTOR (WHO TRIGGERED IT)
  // ===========================================================================

  /**
   * actorId: The user who caused this notification
   * - Optional: System notifications don't have an actor
   * - References: Points to a User document
   *
   * EXAMPLES:
   * - "John wants to connect" → John is the actor
   * - "Your password was changed" → No actor (system notification)
   */
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ===========================================================================
  // RELATED ENTITY
  // ===========================================================================

  /**
   * entityId: The ID of the related item
   * - Optional: Some notifications don't relate to a specific item
   *
   * EXAMPLES:
   * - Connection request → entityId is the connection document
   * - Item shared → entityId is the share document
   * - New message → entityId is the conversation
   */
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },

  /**
   * entityType: What type of item the entityId refers to
   * - Helps the frontend know how to handle the entity
   *
   * VALUES:
   * - 'connection': A connection/friendship
   * - 'message': A single message
   * - 'conversation': A message thread
   * - 'project': A project
   * - 'task': A task
   * - 'note': A note
   * - 'file': A file
   * - 'folder': A folder
   * - 'share': A shared item
   * - 'comment': A comment
   * - 'system': System-level entity
   */
  entityType: {
    type: String,
    enum: ['connection', 'message', 'conversation', 'project', 'task', 'note', 'file', 'folder', 'share', 'comment', 'system']
  },

  // ===========================================================================
  // DISPLAY CONTENT
  // ===========================================================================

  /**
   * title: The main notification text (headline)
   * - Required: Every notification needs a title
   * - Max 200 characters: Keep it short and scannable
   *
   * EXAMPLES:
   * - "John Smith wants to connect"
   * - "Sarah shared a project with you"
   * - "New message from Mike"
   */
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  /**
   * body: Additional details about the notification
   * - Optional: Extra context if needed
   * - Max 500 characters: More room for explanation
   *
   * EXAMPLES:
   * - "You have a new connection request" (for connection_request)
   * - "Quarterly Report Project" (the name of the shared item)
   * - "Hey, can you check this out?" (message preview)
   */
  body: {
    type: String,
    maxlength: 500
  },

  /**
   * actionUrl: Where to navigate when notification is clicked
   * - Optional: Some notifications might not have a destination
   * - Relative URL within the app
   *
   * EXAMPLES:
   * - "/app/social/connections?tab=pending" (for connection requests)
   * - "/app/messages/abc123" (for new message)
   * - "/app/projects/xyz789" (for shared project)
   */
  actionUrl: {
    type: String
  },

  // ===========================================================================
  // METADATA
  // ===========================================================================

  /**
   * metadata: Additional data for special handling
   * - Optional: Store any extra information needed
   * - Mixed type: Can be any shape of data
   *
   * EXAMPLES:
   * - { priority: 'high' } for urgent notifications
   * - { originalTitle: 'Old Name' } for tracking changes
   * - { category: 'billing' } for system notifications
   */
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // ===========================================================================
  // STATUS FLAGS
  // ===========================================================================

  /**
   * isRead: Has the user clicked/viewed this notification?
   * - Default: false (not read yet)
   * - Index: For counting unread notifications quickly
   *
   * The "unread count" badge uses this field.
   * Clicking a notification marks it as read.
   */
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  /**
   * readAt: When the notification was marked as read
   * - Only set when isRead becomes true
   * - Useful for analytics and user behavior tracking
   */
  readAt: {
    type: Date
  },

  /**
   * isSeen: Has the notification appeared in the user's list?
   * - Default: false (user hasn't opened notification dropdown yet)
   *
   * DIFFERENCE FROM isRead:
   * - SEEN: Notification appeared in the list (user opened dropdown)
   * - READ: User actually clicked on the notification
   *
   * This helps with "You have 3 new notifications" messages.
   */
  isSeen: {
    type: Boolean,
    default: false
  },

  /**
   * seenAt: When the notification was first seen
   * - Only set when isSeen becomes true
   */
  seenAt: {
    type: Date
  },

  // ===========================================================================
  // EXPIRATION
  // ===========================================================================

  /**
   * expiresAt: When this notification should be automatically deleted
   * - Optional: Most notifications don't expire
   * - Uses TTL index: MongoDB automatically deletes expired documents
   *
   * USEFUL FOR:
   * - Time-sensitive announcements
   * - Promotional notifications
   * - Temporary system alerts
   *
   * EXAMPLE: A "Flash sale ends in 24 hours" notification that
   * automatically disappears when the sale ends.
   */
  expiresAt: {
    type: Date
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the notification was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for User's Notifications by Date
 * --------------------------------------
 * Find a user's notifications sorted by newest first.
 * Used every time someone opens their notification list.
 */
notificationSchema.index({ userId: 1, createdAt: -1 });

/**
 * Index for User's Unread Notifications
 * -------------------------------------
 * Quickly find unread notifications for a user.
 * Used for the "unread count" badge.
 */
notificationSchema.index({ userId: 1, isRead: 1 });

/**
 * Index for User's Unseen Notifications
 * -------------------------------------
 * Find notifications user hasn't seen yet.
 * Used for "You have X new notifications" alerts.
 */
notificationSchema.index({ userId: 1, isSeen: 1 });

/**
 * TTL Index for Automatic Expiration
 * ----------------------------------
 * MongoDB automatically deletes documents where expiresAt has passed.
 * expireAfterSeconds: 0 means delete immediately when expiresAt time arrives.
 */
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getNotifications(userId, options)
 * ---------------------------------
 * Get notifications for a user with filtering options.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - unreadOnly: Only return unread notifications
 *   - type: Filter by notification type
 * @returns {Array} - Array of notification documents with actor info
 *
 * EXAMPLE:
 * // Get unread notifications
 * const unread = await Notification.getNotifications(userId, { unreadOnly: true });
 *
 * // Get connection notifications only
 * const connections = await Notification.getNotifications(userId, {
 *   type: 'connection_request'
 * });
 */
notificationSchema.statics.getNotifications = async function(userId, options = {}) {
  const { limit = 50, skip = 0, unreadOnly = false, type = null } = options;

  // Build query
  const query = { userId };

  // Optional: only unread notifications
  if (unreadOnly) {
    query.isRead = false;
  }

  // Optional: filter by type
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .populate('actorId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit);
};

/**
 * getUnreadCount(userId)
 * ----------------------
 * Get the number of unread notifications for a user.
 * Used for the notification badge (the red number).
 *
 * @param {string} userId - User's ID
 * @returns {number} - Count of unread notifications
 *
 * EXAMPLE:
 * const count = await Notification.getUnreadCount(userId);
 * // Returns: 5 (displayed as red badge)
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// =============================================================================
// INSTANCE METHODS (Called on a notification document)
// =============================================================================

/**
 * markAsRead()
 * ------------
 * Mark this notification as read (user clicked it).
 *
 * This method:
 * 1. Sets isRead to true
 * 2. Records the timestamp
 * 3. Saves the document
 *
 * EXAMPLE:
 * const notification = await Notification.findById(id);
 * await notification.markAsRead();
 */
notificationSchema.methods.markAsRead = async function() {
  // Only update if not already read
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

/**
 * markAsSeen()
 * ------------
 * Mark this notification as seen (appeared in the list).
 * Called when user opens the notification dropdown.
 *
 * EXAMPLE:
 * // When user opens notification panel
 * notifications.forEach(async (n) => await n.markAsSeen());
 */
notificationSchema.methods.markAsSeen = async function() {
  // Only update if not already seen
  if (!this.isSeen) {
    this.isSeen = true;
    this.seenAt = new Date();
    await this.save();
  }
};

/**
 * markAllAsRead(userId)
 * ---------------------
 * Mark ALL notifications as read for a user.
 * Used when user clicks "Mark all as read" button.
 *
 * @param {string} userId - User's ID
 * @returns {Object} - MongoDB update result
 *
 * EXAMPLE:
 * await Notification.markAllAsRead(userId);
 * // Now unread count is 0
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, isRead: false },           // Find all unread
    { $set: { isRead: true, readAt: new Date() } } // Mark as read
  );
};

/**
 * markAllAsSeen(userId)
 * ---------------------
 * Mark ALL notifications as seen for a user.
 * Called when user opens the notification panel.
 *
 * @param {string} userId - User's ID
 * @returns {Object} - MongoDB update result
 */
notificationSchema.statics.markAllAsSeen = async function(userId) {
  return this.updateMany(
    { userId, isSeen: false },           // Find all unseen
    { $set: { isSeen: true, seenAt: new Date() } } // Mark as seen
  );
};

// =============================================================================
// NOTIFICATION CREATION METHODS
// =============================================================================

/**
 * createNotification(data)
 * ------------------------
 * Create and save a new notification.
 *
 * @param {Object} data - Notification fields
 * @returns {Object} - The created notification document
 *
 * EXAMPLE:
 * const notification = await Notification.createNotification({
 *   userId: recipientId,
 *   type: 'system_announcement',
 *   title: 'New feature available!',
 *   body: 'Check out our new project templates.'
 * });
 */
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

/**
 * notifyConnectionRequest(requesterId, addresseeId, connectionId)
 * ---------------------------------------------------------------
 * Create a notification when someone sends a connection request.
 *
 * @param {string} requesterId - User who sent the request
 * @param {string} addresseeId - User who received the request
 * @param {string} connectionId - The Connection document ID
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * When User A sends a connection request to User B:
 * await Notification.notifyConnectionRequest(userA._id, userB._id, connection._id);
 * // User B sees: "John Smith wants to connect"
 */
notificationSchema.statics.notifyConnectionRequest = async function(requesterId, addresseeId, connectionId) {
  // Get requester's info for the notification text
  const User = mongoose.model('User');
  const requester = await User.findById(requesterId);
  const displayName = requester?.profile?.displayName || requester?.email || 'Someone';

  return this.createNotification({
    userId: addresseeId,
    type: 'connection_request',
    actorId: requesterId,
    entityId: connectionId,
    entityType: 'connection',
    title: `${displayName} wants to connect`,
    body: 'You have a new connection request',
    actionUrl: '/app/social/connections?tab=pending'
  });
};

/**
 * notifyConnectionAccepted(accepterId, requesterId, connectionId)
 * ---------------------------------------------------------------
 * Create a notification when someone accepts a connection request.
 *
 * @param {string} accepterId - User who accepted the request
 * @param {string} requesterId - User who originally sent the request
 * @param {string} connectionId - The Connection document ID
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * When User B accepts User A's request:
 * await Notification.notifyConnectionAccepted(userB._id, userA._id, connection._id);
 * // User A sees: "Sarah accepted your connection request"
 */
notificationSchema.statics.notifyConnectionAccepted = async function(accepterId, requesterId, connectionId) {
  // Get accepter's info for the notification text
  const User = mongoose.model('User');
  const accepter = await User.findById(accepterId);
  const displayName = accepter?.profile?.displayName || accepter?.email || 'Someone';

  return this.createNotification({
    userId: requesterId,
    type: 'connection_accepted',
    actorId: accepterId,
    entityId: connectionId,
    entityType: 'connection',
    title: `${displayName} accepted your connection request`,
    body: 'You are now connected',
    actionUrl: `/app/social/profile/${accepterId}`
  });
};

/**
 * notifyItemShared(ownerId, recipientId, shareId, itemType, itemTitle)
 * --------------------------------------------------------------------
 * Create a notification when someone shares an item with a user.
 *
 * @param {string} ownerId - User who shared the item
 * @param {string} recipientId - User receiving the share
 * @param {string} shareId - The Share document ID
 * @param {string} itemType - Type of item (project, task, note, file)
 * @param {string} itemTitle - Title of the shared item
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * When User A shares a project with User B:
 * await Notification.notifyItemShared(userA._id, userB._id, share._id, 'project', 'Q4 Report');
 * // User B sees: "John shared a project with you"
 */
notificationSchema.statics.notifyItemShared = async function(ownerId, recipientId, shareId, itemType, itemTitle) {
  // Get owner's info for the notification text
  const User = mongoose.model('User');
  const owner = await User.findById(ownerId);
  const displayName = owner?.profile?.displayName || owner?.email || 'Someone';

  return this.createNotification({
    userId: recipientId,
    type: 'item_shared',
    actorId: ownerId,
    entityId: shareId,
    entityType: 'share',
    title: `${displayName} shared a ${itemType} with you`,
    body: itemTitle,
    actionUrl: '/app/social/shared?tab=pending'
  });
};

/**
 * notifyNewMessage(senderId, recipientId, conversationId, preview)
 * ----------------------------------------------------------------
 * Create a notification for a new direct message.
 *
 * @param {string} senderId - User who sent the message
 * @param {string} recipientId - User who receives the message
 * @param {string} conversationId - The Conversation document ID
 * @param {string} preview - Preview of the message text
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyNewMessage(
 *   senderId, recipientId, conversation._id, 'Hey, can you help me with...'
 * );
 * // Recipient sees: "New message from John"
 */
notificationSchema.statics.notifyNewMessage = async function(senderId, recipientId, conversationId, preview) {
  // Get sender's info for the notification text
  const User = mongoose.model('User');
  const sender = await User.findById(senderId);
  const displayName = sender?.profile?.displayName || sender?.email || 'Someone';

  return this.createNotification({
    userId: recipientId,
    type: 'new_message',
    actorId: senderId,
    entityId: conversationId,
    entityType: 'conversation',
    title: `New message from ${displayName}`,
    body: preview?.substring(0, 100), // Truncate to 100 chars
    actionUrl: `/app/messages/${conversationId}`
  });
};

// =============================================================================
// MODERATION NOTIFICATION METHODS
// =============================================================================

/**
 * notifyModerationWarning(userId, reason, level)
 * -----------------------------------------------
 * Create a notification when a user receives a warning.
 *
 * @param {string} userId - User who received the warning
 * @param {string} reason - Why they were warned
 * @param {number} level - Warning severity (1-3)
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyModerationWarning(
 *   userId,
 *   'Posting spam content',
 *   2
 * );
 * // User sees: "You have received a warning"
 */
notificationSchema.statics.notifyModerationWarning = async function(userId, reason, level) {
  const levelLabels = {
    1: 'minor',
    2: 'moderate',
    3: 'severe'
  };
  const levelLabel = levelLabels[level] || 'minor';

  return this.createNotification({
    userId,
    type: 'moderation_warning',
    entityType: 'system',
    title: 'You have received a warning',
    body: reason,
    actionUrl: '/app/settings?tab=account',
    metadata: {
      warningLevel: level,
      levelLabel
    }
  });
};

/**
 * notifyModerationSuspension(userId, reason, until)
 * --------------------------------------------------
 * Create a notification when a user's account is suspended.
 *
 * @param {string} userId - User who was suspended
 * @param {string} reason - Why they were suspended
 * @param {Date|null} until - When suspension ends (null = indefinite)
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyModerationSuspension(
 *   userId,
 *   'Repeated harassment',
 *   new Date('2024-02-01')
 * );
 * // User sees: "Your account has been suspended"
 */
notificationSchema.statics.notifyModerationSuspension = async function(userId, reason, until) {
  const untilText = until
    ? `until ${new Date(until).toLocaleDateString()}`
    : 'indefinitely';

  return this.createNotification({
    userId,
    type: 'moderation_suspension',
    entityType: 'system',
    title: 'Your account has been suspended',
    body: `${reason}. Suspended ${untilText}.`,
    actionUrl: '/app/settings?tab=account',
    metadata: {
      suspendedUntil: until,
      isIndefinite: !until
    }
  });
};

/**
 * notifyModerationBan(userId, reason)
 * ------------------------------------
 * Create a notification when a user's account is permanently banned.
 *
 * @param {string} userId - User who was banned
 * @param {string} reason - Why they were banned
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyModerationBan(
 *   userId,
 *   'Repeated severe policy violations'
 * );
 * // User sees: "Your account has been permanently banned"
 */
notificationSchema.statics.notifyModerationBan = async function(userId, reason) {
  return this.createNotification({
    userId,
    type: 'moderation_ban',
    entityType: 'system',
    title: 'Your account has been permanently banned',
    body: reason,
    metadata: {
      isPermanent: true
    }
  });
};

/**
 * notifyModerationUnsuspend(userId, reason)
 * ------------------------------------------
 * Create a notification when a user's suspension is lifted.
 *
 * @param {string} userId - User who was unsuspended
 * @param {string} reason - Why the suspension was lifted
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyModerationUnsuspend(
 *   userId,
 *   'Suspension period completed'
 * );
 * // User sees: "Your suspension has been lifted"
 */
notificationSchema.statics.notifyModerationUnsuspend = async function(userId, reason) {
  return this.createNotification({
    userId,
    type: 'moderation_unsuspend',
    entityType: 'system',
    title: 'Your suspension has been lifted',
    body: reason || 'Your account access has been restored.',
    actionUrl: '/app/dashboard'
  });
};

/**
 * notifyModerationUnban(userId, reason)
 * --------------------------------------
 * Create a notification when a user's ban is lifted.
 *
 * @param {string} userId - User who was unbanned
 * @param {string} reason - Why the ban was lifted
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyModerationUnban(
 *   userId,
 *   'Successful appeal'
 * );
 * // User sees: "Your ban has been lifted"
 */
notificationSchema.statics.notifyModerationUnban = async function(userId, reason) {
  return this.createNotification({
    userId,
    type: 'moderation_unban',
    entityType: 'system',
    title: 'Your ban has been lifted',
    body: reason || 'Your account access has been restored.',
    actionUrl: '/app/dashboard'
  });
};

/**
 * notifyAdminMessage(userId, subject, message, adminId)
 * ------------------------------------------------------
 * Create a notification for a direct admin message to a user.
 *
 * @param {string} userId - User receiving the message
 * @param {string} subject - Message subject/title
 * @param {string} message - Message content
 * @param {string} adminId - Admin who sent the message (optional)
 * @returns {Object} - The created notification
 *
 * EXAMPLE:
 * await Notification.notifyAdminMessage(
 *   userId,
 *   'Regarding your recent support request',
 *   'We have reviewed your case and...',
 *   adminId
 * );
 * // User sees: "Message from Admin: Regarding your recent support request"
 */
notificationSchema.statics.notifyAdminMessage = async function(userId, subject, message, adminId = null) {
  return this.createNotification({
    userId,
    type: 'admin_message',
    actorId: adminId,
    entityType: 'system',
    title: `Message from Admin: ${subject}`,
    body: message?.substring(0, 500),
    actionUrl: '/app/notifications',
    metadata: {
      isAdminMessage: true,
      fullMessage: message
    }
  });
};

// =============================================================================
// CLEANUP METHODS
// =============================================================================

/**
 * cleanupOldNotifications(daysToKeep)
 * -----------------------------------
 * Delete old notifications that have been read.
 * Keeps the database from growing too large.
 *
 * @param {number} daysToKeep - How many days to keep notifications (default 30)
 * @returns {Object} - MongoDB delete result
 *
 * IMPORTANT: Only deletes READ notifications older than the cutoff.
 * Unread notifications are kept regardless of age.
 *
 * EXAMPLE:
 * // Run as a scheduled job
 * await Notification.cleanupOldNotifications(30);
 * // Deletes all read notifications older than 30 days
 */
notificationSchema.statics.cleanupOldNotifications = async function(daysToKeep = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  return this.deleteMany({
    createdAt: { $lt: cutoff },
    isRead: true // Only delete read notifications
  });
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Notification model from the schema.
 * This gives us methods to:
 * - Get notifications: Notification.getNotifications(userId, options)
 * - Get unread count: Notification.getUnreadCount(userId)
 * - Mark as read: notification.markAsRead() or Notification.markAllAsRead(userId)
 * - Create notifications: Notification.notifyConnectionRequest(), etc.
 * - Cleanup: Notification.cleanupOldNotifications(days)
 */
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
