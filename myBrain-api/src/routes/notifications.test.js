import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import Notification from '../models/Notification.js';

describe('Notifications Routes', () => {
  let authToken;
  let userId;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'notifications@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'notifications@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
    userId = loginRes.body.user._id;
  });

  // Helper function to create a notification directly in the database
  async function createTestNotification(overrides = {}) {
    const notification = new Notification({
      userId: userId,
      type: 'system_announcement',
      title: 'Test Notification',
      body: 'This is a test notification body',
      isRead: false,
      isSeen: false,
      ...overrides,
    });
    await notification.save();
    return notification;
  }

  describe('GET /notifications', () => {
    it('should return empty list when no notifications', async () => {
      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toBeDefined();
      expect(res.body.notifications).toHaveLength(0);
      expect(res.body.unreadCount).toBe(0);
      expect(res.body.total).toBe(0);
      expect(res.body.hasMore).toBe(false);
    });

    it('should return list of notifications', async () => {
      // Create some test notifications
      await createTestNotification({ title: 'Notification 1' });
      await createTestNotification({ title: 'Notification 2' });
      await createTestNotification({ title: 'Notification 3' });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toHaveLength(3);
      expect(res.body.unreadCount).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it('should return notifications sorted by most recent first', async () => {
      // Create notifications with slight delay to ensure different timestamps
      await createTestNotification({ title: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestNotification({ title: 'Second' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestNotification({ title: 'Third' });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications[0].title).toBe('Third');
      expect(res.body.notifications[2].title).toBe('First');
    });

    it('should filter by unreadOnly', async () => {
      await createTestNotification({ title: 'Unread 1', isRead: false });
      await createTestNotification({ title: 'Unread 2', isRead: false });
      await createTestNotification({ title: 'Read 1', isRead: true });

      const res = await request(app)
        .get('/notifications')
        .query({ unreadOnly: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.notifications.every(n => !n.isRead)).toBe(true);
    });

    it('should filter by notification type', async () => {
      await createTestNotification({ title: 'System 1', type: 'system_announcement' });
      await createTestNotification({ title: 'System 2', type: 'system_announcement' });
      await createTestNotification({ title: 'Connection', type: 'connection_request' });

      const res = await request(app)
        .get('/notifications')
        .query({ type: 'system_announcement' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.notifications.every(n => n.type === 'system_announcement')).toBe(true);
    });

    it('should paginate results with limit and skip', async () => {
      // Create 5 notifications
      for (let i = 1; i <= 5; i++) {
        await createTestNotification({ title: `Notification ${i}` });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const res = await request(app)
        .get('/notifications')
        .query({ limit: 2, skip: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.hasMore).toBe(true);
    });

    it('should mark all notifications as seen when fetching', async () => {
      await createTestNotification({ title: 'Unseen', isSeen: false });

      await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      // Fetch directly from database to verify
      const notifications = await Notification.find({ userId });
      expect(notifications.every(n => n.isSeen)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notifications');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count of 0 when no notifications', async () => {
      const res = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(0);
    });

    it('should return correct unread count', async () => {
      await createTestNotification({ isRead: false });
      await createTestNotification({ isRead: false });
      await createTestNotification({ isRead: true });

      const res = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notifications/unread-count');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notification = await createTestNotification({ isRead: false });

      const res = await request(app)
        .post(`/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Notification marked as read');

      // Verify in database
      const updated = await Notification.findById(notification._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should not fail when marking already-read notification', async () => {
      const notification = await createTestNotification({ isRead: true, readAt: new Date() });

      const res = await request(app)
        .post(`/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should not allow marking another user notification as read', async () => {
      // Create notification for a different user
      const otherUserId = new mongoose.Types.ObjectId();
      const notification = new Notification({
        userId: otherUserId,
        type: 'system_announcement',
        title: 'Other User Notification',
        isRead: false,
      });
      await notification.save();

      const res = await request(app)
        .post(`/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const notification = await createTestNotification();

      const res = await request(app)
        .post(`/notifications/${notification._id}/read`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      await createTestNotification({ isRead: false });
      await createTestNotification({ isRead: false });
      await createTestNotification({ isRead: false });

      const res = await request(app)
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('All notifications marked as read');
      expect(res.body.count).toBe(3);

      // Verify in database
      const notifications = await Notification.find({ userId });
      expect(notifications.every(n => n.isRead)).toBe(true);
    });

    it('should return count of 0 when no unread notifications', async () => {
      await createTestNotification({ isRead: true });
      await createTestNotification({ isRead: true });

      const res = await request(app)
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it('should only mark current user notifications as read', async () => {
      // Create notification for current user
      await createTestNotification({ isRead: false });

      // Create notification for another user
      const otherUserId = new mongoose.Types.ObjectId();
      const otherNotification = new Notification({
        userId: otherUserId,
        type: 'system_announcement',
        title: 'Other User Notification',
        isRead: false,
      });
      await otherNotification.save();

      await request(app)
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      // Verify other user's notification is still unread
      const otherUpdated = await Notification.findById(otherNotification._id);
      expect(otherUpdated.isRead).toBe(false);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/notifications/read-all');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete a single notification', async () => {
      const notification = await createTestNotification();

      const res = await request(app)
        .delete(`/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Notification deleted');

      // Verify deleted from database
      const deleted = await Notification.findById(notification._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should not allow deleting another user notification', async () => {
      // Create notification for a different user
      const otherUserId = new mongoose.Types.ObjectId();
      const notification = new Notification({
        userId: otherUserId,
        type: 'system_announcement',
        title: 'Other User Notification',
      });
      await notification.save();

      const res = await request(app)
        .delete(`/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);

      // Verify notification still exists
      const stillExists = await Notification.findById(notification._id);
      expect(stillExists).not.toBeNull();
    });

    it('should reject without auth', async () => {
      const notification = await createTestNotification();

      const res = await request(app)
        .delete(`/notifications/${notification._id}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /notifications', () => {
    it('should delete all read notifications', async () => {
      await createTestNotification({ isRead: true });
      await createTestNotification({ isRead: true });
      await createTestNotification({ isRead: false });

      const res = await request(app)
        .delete('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Read notifications deleted');
      expect(res.body.count).toBe(2);

      // Verify only unread notification remains
      const remaining = await Notification.find({ userId });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].isRead).toBe(false);
    });

    it('should not delete unread notifications', async () => {
      await createTestNotification({ isRead: false });
      await createTestNotification({ isRead: false });

      const res = await request(app)
        .delete('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(0);

      // Verify all notifications still exist
      const remaining = await Notification.find({ userId });
      expect(remaining).toHaveLength(2);
    });

    it('should only delete current user read notifications', async () => {
      // Create read notification for current user
      await createTestNotification({ isRead: true });

      // Create read notification for another user
      const otherUserId = new mongoose.Types.ObjectId();
      const otherNotification = new Notification({
        userId: otherUserId,
        type: 'system_announcement',
        title: 'Other User Notification',
        isRead: true,
      });
      await otherNotification.save();

      await request(app)
        .delete('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      // Verify other user's notification still exists
      const stillExists = await Notification.findById(otherNotification._id);
      expect(stillExists).not.toBeNull();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete('/notifications');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notifications/activity/feed', () => {
    it('should return empty activity feed', async () => {
      const res = await request(app)
        .get('/notifications/activity/feed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.hasMore).toBeDefined();
    });

    it('should accept pagination parameters', async () => {
      const res = await request(app)
        .get('/notifications/activity/feed')
        .query({ limit: 10, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notifications/activity/feed');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notifications/activity/user/:userId', () => {
    it('should return user activities', async () => {
      const res = await request(app)
        .get(`/notifications/activity/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.hasMore).toBeDefined();
    });

    it('should accept pagination and type filter parameters', async () => {
      const res = await request(app)
        .get(`/notifications/activity/user/${userId}`)
        .query({ limit: 10, skip: 0, type: 'note.created' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/notifications/activity/user/${userId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Notification types', () => {
    it('should accept all valid notification types', async () => {
      const validTypes = [
        'connection_request',
        'connection_accepted',
        'item_shared',
        'share_accepted',
        'new_message',
        'message_mention',
        'comment_added',
        'comment_reply',
        'collaborator_added',
        'collaborator_removed',
        'item_updated',
        'system_announcement',
        'security_alert',
        'account_update',
        'moderation_warning',
        'moderation_suspension',
        'moderation_ban',
        'moderation_unsuspend',
        'moderation_unban',
        'admin_message',
      ];

      for (const type of validTypes) {
        const notification = await createTestNotification({ type, title: `Test ${type}` });
        expect(notification.type).toBe(type);
      }

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toHaveLength(validTypes.length);
    });
  });

  describe('Notification entity types', () => {
    it('should accept all valid entity types', async () => {
      const validEntityTypes = [
        'connection',
        'message',
        'conversation',
        'project',
        'task',
        'note',
        'file',
        'folder',
        'share',
        'comment',
        'system',
      ];

      for (const entityType of validEntityTypes) {
        const notification = await createTestNotification({
          entityType,
          title: `Test ${entityType}`,
        });
        expect(notification.entityType).toBe(entityType);
      }
    });
  });

  describe('Notification with metadata', () => {
    it('should store and retrieve notification metadata', async () => {
      const metadata = {
        priority: 'high',
        category: 'urgent',
        customField: { nested: true },
      };

      const notification = await createTestNotification({ metadata });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications[0].metadata).toEqual(metadata);
    });
  });

  describe('Notification with action URL', () => {
    it('should store and retrieve actionUrl', async () => {
      const notification = await createTestNotification({
        actionUrl: '/app/projects/123',
      });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notifications[0].actionUrl).toBe('/app/projects/123');
    });
  });
});
