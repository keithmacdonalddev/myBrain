import express from 'express';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

/**
 * GET /notifications
 * Get notifications for the current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0, unreadOnly = false, type = null } = req.query;

    const notifications = await Notification.getNotifications(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true',
      type
    });

    const unreadCount = await Notification.getUnreadCount(req.user._id);
    const total = await Notification.countDocuments({ userId: req.user._id });

    // Mark as seen
    await Notification.markAllAsSeen(req.user._id);

    res.json({
      notifications,
      unreadCount,
      total,
      hasMore: parseInt(skip) + notifications.length < total
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_notifications' });
    res.status(500).json({
      error: 'Failed to get notifications',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

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
 * Mark a notification as read
 */
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    await notification.markAsRead();

    attachEntityId(req, 'notificationId', notification._id);
    req.eventName = 'notification.read.success';

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
 * Mark all notifications as read
 */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    req.eventName = 'notification.readAll.success';

    res.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount
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
 * Delete a notification
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!result) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND'
      });
    }

    attachEntityId(req, 'notificationId', id);
    req.eventName = 'notification.delete.success';

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
 * Delete all read notifications
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user._id,
      isRead: true
    });

    req.eventName = 'notification.deleteRead.success';

    res.json({
      message: 'Read notifications deleted',
      count: result.deletedCount
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
 * Get activity feed (connections' activities)
 */
router.get('/activity/feed', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0, before = null } = req.query;

    const activities = await Activity.getFeed(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      before
    });

    res.json({
      activities,
      hasMore: activities.length === parseInt(limit)
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_activity_feed' });
    res.status(500).json({
      error: 'Failed to get activity feed',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /notifications/activity/user/:userId
 * Get activities for a specific user
 */
router.get('/activity/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, type = null } = req.query;

    const activities = await Activity.getUserActivities(userId, req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      type
    });

    res.json({
      activities,
      hasMore: activities.length === parseInt(limit)
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
