/**
 * =============================================================================
 * NOTIFICATIONS.JS - Notification Center Routes
 * =============================================================================
 *
 * This file handles user notifications in myBrain.
 * Notifications alert you to important events like:
 * - New messages from connections
 * - Items shared with you
 * - Tasks coming due
 * - Calendar events
 * - Admin messages
 *
 * WHAT ARE NOTIFICATIONS?
 * -----------------------
 * Notifications are alerts about things happening in myBrain:
 * - Someone sent you a message
 * - Someone shared an item with you
 * - A task is due tomorrow
 * - A project deadline is approaching
 * - Someone connected with you
 * - An admin sent you a message
 *
 * NOTIFICATION TYPES:
 * -------------------
 * - MESSAGE: New direct message from connection
 * - SHARE: Item shared with you by another user
 * - TASK_DUE: Task due soon (tomorrow or today)
 * - TASK_OVERDUE: Task is past due
 * - EVENT_SOON: Calendar event coming up
 * - CONNECTION_REQUEST: New connection request
 * - CONNECTION_ACCEPTED: Someone accepted your request
 * - ADMIN_MESSAGE: Administrator sent you a message
 *
 * NOTIFICATION FLOW:
 * ------------------
 * 1. ACTION HAPPENS: Someone shares item, sends message, etc.
 * 2. NOTIFICATION CREATED: New entry in Notification collection
 * 3. REAL-TIME DELIVERY: WebSocket sends to recipient if online
 * 4. BADGE UPDATE: Unread count increases in UI
 * 5. USER VIEWS: User clicks notification to view/act on it
 * 6. MARKED READ: Notification marked as read
 *
 * READ VS UNREAD:
 * ----------------
 * - UNREAD: New notification, user hasn't seen it
 * - SEEN: User has viewed notifications page (not fully read)
 * - READ: User has interacted with notification (clicked it)
 * - ARCHIVED: User dismissed notification
 *
 * NOTIFICATION CENTER:
 * --------------------
 * Centralized location showing:
 * - All unread notifications at top (with badge)
 * - Older notifications below
 * - Ability to mark read/unread
 * - Ability to delete/archive
 * - Filter by type
 * - Search through notifications
 *
 * DELIVERY METHODS:
 * -----------------
 * - IN-APP: Notification badge and notification center
 * - POPUP: Toast notification (temporary popup)
 * - SOUND: Optional audio alert (if enabled in settings)
 * - EMAIL: Optional email notification (if enabled)
 * - PUSH: Mobile push notification (if on mobile app)
 *
 * ENDPOINTS:
 * -----------
 * - GET /notifications - Get all notifications with unread count
 * - GET /notifications/unread - Get only unread notifications
 * - POST /notifications/:id/read - Mark as read
 * - POST /notifications/:id/unread - Mark as unread
 * - DELETE /notifications/:id - Delete/archive notification
 * - POST /notifications/read-all - Mark all as read
 * - DELETE /notifications - Delete all notifications
 * - POST /notifications/settings - Update notification preferences
 *
 * PAGINATION:
 * -----------
 * Notifications paginated (most recent first):
 * - Default: 50 per page
 * - Older ones loaded on scroll
 * - Can filter by type
 *
 * AUTO-CLEANUP:
 * ---------------
 * - Read notifications stay for 30 days
 * - Deleted notifications stay for 7 days (recovery)
 * - Then permanently deleted from database
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools we need to handle notifications.
// We import the web framework, database models, authentication middleware,
// and logging utilities.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, DELETE)
 * - Define routes (URLs for notification management)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Notification model represents notification alerts in the database.
 * Notifications track:
 * - Type (message, share, task_due, admin_message, etc)
 * - Read status (unread, seen, read)
 * - Related entity (which message, which shared item, etc)
 * - Timestamp when created
 *
 * We query this to fetch, mark read, and delete user notifications.
 */
import Notification from '../models/Notification.js';

/**
 * Activity model represents user activity events for the activity feed.
 * Unlike notifications (alerts), activities are just records of what happened
 * in the platform (for analytics and history).
 */
import Activity from '../models/Activity.js';

/**
 * requireAuth is middleware that checks if the user is authenticated.
 * ALL routes in this file require authentication (no anonymous notifications).
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError is logging middleware that tracks errors to system logs.
 * We use this when notification operations fail.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * attachEntityId is logging middleware that tracks which notification
 * is affected by the request. This creates an audit trail of user actions.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all notification management routes together

const router = express.Router();

// =============================================================================
// NOTIFICATION CENTER - Get and Manage Notifications
// =============================================================================
// These endpoints provide a complete notification management system.
// Users can view their notifications, mark them as read, and delete them.

/**
 * GET /notifications
 * Get all notifications for the current user
 *
 * This endpoint returns the user's notification list for the notification
 * center. It's the main endpoint for viewing notifications.
 *
 * NOTIFICATION TYPES:
 * -------------------
 * - MESSAGE: New direct message from connection
 * - SHARE: Item shared with you by another user
 * - TASK_DUE: Task due today or tomorrow
 * - TASK_OVERDUE: Task is past due
 * - EVENT_SOON: Calendar event coming up
 * - CONNECTION_REQUEST: New connection request
 * - CONNECTION_ACCEPTED: Someone accepted your request
 * - ADMIN_MESSAGE: Administrator sent you a message
 *
 * NOTIFICATION STATES:
 * --------------------
 * - UNREAD: New, user hasn't opened notification center
 * - SEEN: Notification center opened (but notification not clicked)
 * - READ: User clicked on notification or marked as read
 * - ARCHIVED/DELETED: User dismissed notification
 *
 * FILTERING:
 * ----------
 * - unreadOnly: Show only unread notifications
 * - type: Filter by notification type (e.g., "message", "share")
 *
 * EXAMPLE REQUEST:
 * GET /notifications?limit=20&unreadOnly=true&type=message
 *
 * EXAMPLE RESPONSE:
 * {
 *   "notifications": [
 *     {
 *       "_id": "notif123",
 *       "type": "message",
 *       "title": "New message from John Smith",
 *       "body": "Thanks for the update!",
 *       "readAt": null,  // null = unread
 *       "relatedEntity": { entityType: "conversation", entityId: "conv456" },
 *       "createdAt": "2026-01-21T14:30:00Z"
 *     }
 *   ],
 *   "unreadCount": 5,    // Total unread notifications
 *   "total": 127,        // Total notifications (all time)
 *   "hasMore": true      // More notifications available
 * }
 *
 * @query {number} limit - Results per page (default 50)
 * @query {number} skip - Results to skip for pagination
 * @query {boolean} unreadOnly - Show only unread (default false)
 * @query {string} type - Filter by notification type
 * @returns {Object} Notifications array with metadata
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Parse Query Parameters
    // =============================================================================
    // Extract pagination and filtering options
    const { limit = 50, skip = 0, unreadOnly = false, type = null } = req.query;

    // =============================================================================
    // STEP 2: Fetch Notifications with Filters
    // =============================================================================
    // Query the database for notifications matching the filters
    // Results are sorted by most recent first (when created)
    const notifications = await Notification.getNotifications(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true',  // Only unread if explicitly requested
      type  // Filter by type if provided
    });

    // =============================================================================
    // STEP 3: Get Unread Count and Total
    // =============================================================================
    // Unread count: Number of notifications user hasn't viewed yet
    // Total: All notifications ever (for "page X of Y" calculations)
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    const total = await Notification.countDocuments({ userId: req.user._id });

    // =============================================================================
    // STEP 4: Mark All Notifications as "Seen"
    // =============================================================================
    // When user opens notification center, mark all as "seen"
    // (They've seen the list, even if they haven't clicked each one)
    // WHY: Helps us distinguish between unread (new) and seen (viewed but not read)
    await Notification.markAllAsSeen(req.user._id);

    // =============================================================================
    // STEP 5: Return Notifications List
    // =============================================================================
    res.json({
      notifications,           // Array of notification objects
      unreadCount,            // How many unread
      total,                  // Total notifications (for pagination UI)
      hasMore: parseInt(skip) + notifications.length < total  // More pages available?
    });
  } catch (error) {
    // Error handling
    attachError(req, error, { operation: 'get_notifications' });
    res.status(500).json({
      error: 'Failed to get notifications',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /notifications/unread-count
 * Get the unread notification count only
 *
 * This is a lightweight endpoint for updating the notification badge
 * (the red circle with a number on the notifications icon).
 *
 * USAGE:
 * ------
 * Frontend polls this endpoint periodically to update the badge.
 * Cheaper than calling GET /notifications since it only counts.
 *
 * EXAMPLE RESPONSE:
 * {
 *   "unreadCount": 5
 * }
 *
 * @returns {Object} Just the unread count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Get Unread Notification Count
    // =============================================================================
    // Query for count of unread (not yet seen) notifications
    const count = await Notification.getUnreadCount(req.user._id);

    // =============================================================================
    // STEP 2: Return Count
    // =============================================================================
    // Return minimal response (just the count)
    res.json({
      unreadCount: count
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_unread_count' });
    res.status(500).json({
      error: 'Failed to get unread count',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /notifications/:id/read
 * Mark a single notification as read
 *
 * WHAT IT DOES:
 * Marks a notification as read. User has interacted with it
 * (clicked on it, took action, etc.).
 *
 * NOTIFICATION STATES:
 * - UNREAD: New notification, user hasn't seen it
 * - SEEN: Notification center opened (list was viewed)
 * - READ: User clicked or interacted with it
 *
 * USE CASES:
 * - User clicks message notification → mark as read
 * - User acknowledges system notification → mark as read
 * - User takes action on notification → mark as read
 *
 * @param {string} req.params.id - Notification ID (MongoDB ObjectId)
 *
 * @returns {Object} - Success message:
 * {
 *   message: "Notification marked as read"
 * }
 *
 * @throws {404} - Notification not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /notifications/notif123/read
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Notification marked as read"
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'notificationId', notification._id): Track notification
 * - req.eventName = 'notification.read.success': Event type
 */
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Extract Notification ID from URL
    // =============================================================================
    const { id } = req.params;

    // =============================================================================
    // STEP 2: Fetch Notification with Ownership Check
    // =============================================================================
    // Query for notification by ID AND userId
    // WHY: Prevents users from marking other users' notifications as read
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id  // Ownership check: must be the current user's
    });

    // =============================================================================
    // STEP 3: Check if Notification Found
    // =============================================================================
    // If notification doesn't exist or doesn't belong to user, return 404
    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    // =============================================================================
    // STEP 4: Mark Notification as Read
    // =============================================================================
    // Call the model method to update readAt timestamp
    await notification.markAsRead();

    // =============================================================================
    // STEP 5: Log the Action
    // =============================================================================
    // Track which notification was marked read by which user
    attachEntityId(req, 'notificationId', notification._id);
    req.eventName = 'notification.read.success';

    // =============================================================================
    // STEP 6: Return Success
    // =============================================================================
    res.json({
      message: 'Notification marked as read'
    });
  } catch (error) {
    attachError(req, error, { operation: 'mark_read' });
    res.status(500).json({
      error: 'Failed to mark as read',
      code: 'READ_ERROR'
    });
  }
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read at once
 *
 * This is a convenience endpoint for when users want to clear their
 * notification list (often in the "Mark all as read" button).
 *
 * USE CASES:
 * ---------
 * - User has many notifications and wants to clear them all
 * - User says "I'm caught up, mark everything read"
 * - User wants to reset the unread badge to 0
 *
 * EXAMPLE REQUEST:
 * POST /notifications/read-all
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "All notifications marked as read",
 *   "count": 47  // Number of notifications updated
 * }
 *
 * @returns {Object} Success message with count of updated notifications
 */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Mark All Notifications as Read
    // =============================================================================
    // Update all unread notifications for current user to have readAt timestamp
    const result = await Notification.markAllAsRead(req.user._id);

    // =============================================================================
    // STEP 2: Log the Action
    // =============================================================================
    // Track that user marked all as read
    req.eventName = 'notification.readAll.success';

    // =============================================================================
    // STEP 3: Return Results
    // =============================================================================
    // Tell the user how many notifications were updated
    res.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount  // Number of notifications updated
    });
  } catch (error) {
    attachError(req, error, { operation: 'mark_all_read' });
    res.status(500).json({
      error: 'Failed to mark all as read',
      code: 'READ_ERROR'
    });
  }
});

/**
 * DELETE /notifications/:id
 * Delete (dismiss) a single notification
 *
 * When the user dismisses or archives a notification, the frontend
 * calls this endpoint to delete it from the notification center.
 *
 * DELETION BEHAVIOR:
 * -----------------
 * - Immediately removed from notification center
 * - Not visible to user anymore
 * - Data remains in database for 7 days (recovery window)
 * - After 7 days, permanently deleted
 *
 * WHY KEEP DELETED NOTIFICATIONS?
 * --------------------------------
 * - Users sometimes accidentally dismiss important notifications
 * - Recovery window: contact support, restore notification
 * - Audit trail: system logs show what was deleted when
 *
 * EXAMPLE REQUEST:
 * DELETE /notifications/notif123
 *
 * @param {string} id - Notification ID to delete
 * @returns {Object} Success message
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Extract Notification ID from URL
    // =============================================================================
    const { id } = req.params;

    // =============================================================================
    // STEP 2: Delete Notification with Ownership Check
    // =============================================================================
    // Use findOneAndDelete to:
    // - Verify ownership (userId check)
    // - Delete the notification in one atomic operation
    // - Return the deleted document (for logging)
    const result = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id  // Ownership check: must be current user's
    });

    // =============================================================================
    // STEP 3: Check if Notification Found and Deleted
    // =============================================================================
    // If notification doesn't exist or doesn't belong to user, return 404
    if (!result) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    // =============================================================================
    // STEP 4: Log the Action
    // =============================================================================
    // Track which notification was deleted by which user
    attachEntityId(req, 'notificationId', id);
    req.eventName = 'notification.delete.success';

    // =============================================================================
    // STEP 5: Return Success
    // =============================================================================
    res.json({
      message: 'Notification deleted'
    });
  } catch (error) {
    attachError(req, error, { operation: 'delete_notification' });
    res.status(500).json({
      error: 'Failed to delete notification',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * DELETE /notifications
 * Delete all read notifications at once
 *
 * This endpoint deletes all notifications that have been marked as read.
 * Useful for bulk cleanup (like "Clear all read messages").
 *
 * USE CASES:
 * ---------
 * - User wants to clean up notification center
 * - Remove clutter after reading many notifications
 * - Archive old notifications
 *
 * WHY ONLY READ NOTIFICATIONS?
 * ----------------------------
 * - Unread notifications are important (user hasn't seen them yet)
 * - Read notifications are less critical (user already knows about them)
 * - Keeps inbox clean while preserving unread items
 *
 * EXAMPLE REQUEST:
 * DELETE /notifications
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Read notifications deleted",
 *   "count": 12  // Number deleted
 * }
 *
 * @returns {Object} Success message with count of deleted notifications
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Delete All Read Notifications
    // =============================================================================
    // Delete notifications where:
    // - userId matches current user
    // - isRead is true (already read)
    const result = await Notification.deleteMany({
      userId: req.user._id,
      isRead: true  // Only delete read notifications
    });

    // =============================================================================
    // STEP 2: Log the Action
    // =============================================================================
    req.eventName = 'notification.deleteRead.success';

    // =============================================================================
    // STEP 3: Return Results
    // =============================================================================
    // Tell user how many notifications were deleted
    res.json({
      message: 'Read notifications deleted',
      count: result.deletedCount  // Number of notifications deleted
    });
  } catch (error) {
    attachError(req, error, { operation: 'delete_read_notifications' });
    res.status(500).json({
      error: 'Failed to delete notifications',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * GET /notifications/activity/feed
 * Get the activity feed for the current user
 *
 * The activity feed is a real-time stream of what your connections are doing:
 * - Notes they created or shared
 * - Tasks they completed
 * - Projects they started
 * - Items they shared with you
 *
 * DIFFERENCE FROM NOTIFICATIONS:
 * ----------------------------
 * - NOTIFICATIONS: Alerts about things that need YOUR attention
 * - ACTIVITY FEED: Record of what's happening (informational)
 *
 * ACTIVITY TYPES:
 * ---------------
 * - note.created: Connection created a new note
 * - task.completed: Connection completed a task
 * - project.created: Connection started a new project
 * - item.shared: Connection shared something with you
 *
 * USE CASES:
 * ---------
 * - "What are my friends working on?" (activity feed)
 * - "I was tagged in something - check notification"
 * - Monitor team activity in real-time
 * - Inspiration from what others are doing
 *
 * EXAMPLE REQUEST:
 * GET /notifications/activity/feed?limit=20&skip=0
 *
 * EXAMPLE RESPONSE:
 * {
 *   "activities": [
 *     {
 *       "_id": "activity123",
 *       "type": "note.created",
 *       "actor": { _id: "user456", name: "John Smith" },
 *       "description": "John created a note: Project Planning",
 *       "timestamp": "2026-01-21T14:30:00Z"
 *     }
 *   ],
 *   "hasMore": true  // More activities available
 * }
 *
 * @query {number} limit - Results per page (default 50)
 * @query {number} skip - Results to skip for pagination
 * @query {string} before - Load activities before this timestamp
 * @returns {Object} Activities array with hasMore flag
 */
router.get('/activity/feed', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Parse Query Parameters
    // =============================================================================
    // Extract pagination options
    const { limit = 50, skip = 0, before = null } = req.query;

    // =============================================================================
    // STEP 2: Fetch Activity Feed
    // =============================================================================
    // Get activities from connections (people you're connected with)
    // Sorted by most recent first
    const activities = await Activity.getFeed(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      before  // Optional: load activities before a certain timestamp
    });

    // =============================================================================
    // STEP 3: Return Activity Feed
    // =============================================================================
    // Return activities and hasMore flag for pagination UI
    res.json({
      activities,  // Array of activity objects
      hasMore: activities.length === parseInt(limit)  // More activities available?
    });
  } catch (error) {
    // Error handling
    attachError(req, error, { operation: 'get_activity_feed' });
    res.status(500).json({
      error: 'Failed to get activity feed',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /notifications/activity/user/:userId
 * Get activity feed for a specific user
 *
 * WHAT IT DOES:
 * Retrieves the activity history for a specific user.
 * Shows what another user (or yourself) has been doing in the app.
 * Only returns activities visible to current user (respects privacy).
 *
 * PRIVACY:
 * - Only shows activities the current user is allowed to see
 * - Respects user's privacy settings
 * - Doesn't show deleted or archived items
 * - Only shows actions on public content
 *
 * ACTIVITY TYPES:
 * - note.created: User created a note
 * - task.completed: User completed a task
 * - project.created: User started a project
 * - item.shared: User shared content
 *
 * USE CASES:
 * - View what a friend has been doing
 * - See team member's activity
 * - Browse user's public contributions
 * - Track user's productivity
 *
 * @param {string} req.params.userId - User ID to get activities for (MongoDB ObjectId)
 * @param {number} req.query.limit - Activities per page (default 50)
 * @param {number} req.query.skip - Activities to skip (default 0)
 * @param {string} req.query.type - Filter by activity type (optional)
 *
 * @returns {Object} - User's activities:
 * {
 *   activities: [
 *     {
 *       _id: "activity123",
 *       type: "note.created",
 *       actor: {
 *         _id: "user456",
 *         profile: { displayName: "John Smith" }
 *       },
 *       description: "John created a note: Project Planning",
 *       timestamp: "2026-01-21T14:30:00Z"
 *     }
 *   ],
 *   hasMore: true  // More activities available
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (all activities):
 * GET /notifications/activity/user/user456
 *
 * EXAMPLE REQUEST (filter by type):
 * GET /notifications/activity/user/user456?type=task.completed&limit=20
 *
 * EXAMPLE RESPONSE:
 * {
 *   activities: [
 *     { _id: "...", type: "task.completed", description: "John completed: Q1 Planning" }
 *   ],
 *   hasMore: true
 * }
 */
router.get('/activity/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, type = null } = req.query;

    // =====================================================
    // FETCH USER ACTIVITIES
    // =====================================================
    // Get activities for the specified user
    // Respects privacy settings automatically
    const activities = await Activity.getUserActivities(userId, req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      type  // Optional filter by activity type
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    res.json({
      activities,
      hasMore: activities.length === parseInt(limit)  // More available?
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_user_activities' });
    res.status(500).json({
      error: 'Failed to get user activities',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;
