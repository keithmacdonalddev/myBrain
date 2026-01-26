/**
 * =============================================================================
 * NOTIFICATION MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Notification model, covering:
 * - Static methods (16): getNotifications, getUnreadCount, markAllAsRead,
 *   markAllAsSeen, createNotification, notifyConnectionRequest,
 *   notifyConnectionAccepted, notifyItemShared, notifyNewMessage,
 *   notifyModerationWarning, notifyModerationSuspension, notifyModerationBan,
 *   notifyModerationUnsuspend, notifyModerationUnban, notifyAdminMessage,
 *   cleanupOldNotifications
 * - Instance methods (2): markAsRead, markAsSeen
 * - Validation (required fields, valid types)
 * - User isolation (only see own notifications)
 * - Cleanup (old notifications removed)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Notification from './Notification.js';
import User from './User.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a user with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'free',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Creates a notification with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestNotification(userId, overrides = {}) {
  const defaults = {
    userId,
    type: 'system_announcement',
    title: 'Test Notification',
    body: 'This is a test notification',
  };
  return Notification.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: NOTIFICATION MODEL
// =============================================================================

describe('Notification Model', () => {
  // ==========================================================================
  // STATIC METHODS - QUERYING
  // ==========================================================================

  describe('Static Methods - Querying', () => {
    // -------------------------------------------------------------------------
    // getNotifications(userId, options)
    // -------------------------------------------------------------------------
    describe('getNotifications()', () => {
      it('should return notifications for a specific user', async () => {
        const user = await createTestUser();
        await createTestNotification(user._id, { title: 'Notification 1' });
        await createTestNotification(user._id, { title: 'Notification 2' });

        const notifications = await Notification.getNotifications(user._id);

        expect(notifications).toHaveLength(2);
      });

      it('should not return notifications from other users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createTestNotification(user1._id, { title: 'User 1 Notification' });
        await createTestNotification(user2._id, { title: 'User 2 Notification' });

        const notifications = await Notification.getNotifications(user1._id);

        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe('User 1 Notification');
      });

      it('should return notifications sorted by createdAt descending (newest first)', async () => {
        const user = await createTestUser();

        // Create with different timestamps
        const older = await createTestNotification(user._id, { title: 'Older' });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
        const newer = await createTestNotification(user._id, { title: 'Newer' });

        const notifications = await Notification.getNotifications(user._id);

        expect(notifications[0].title).toBe('Newer');
        expect(notifications[1].title).toBe('Older');
      });

      it('should respect the limit option', async () => {
        const user = await createTestUser();

        for (let i = 0; i < 5; i++) {
          await createTestNotification(user._id, { title: `Notification ${i}` });
        }

        const notifications = await Notification.getNotifications(user._id, { limit: 3 });

        expect(notifications).toHaveLength(3);
      });

      it('should respect the skip option for pagination', async () => {
        const user = await createTestUser();

        for (let i = 0; i < 5; i++) {
          await createTestNotification(user._id, { title: `Notification ${i}` });
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        const notifications = await Notification.getNotifications(user._id, { skip: 2, limit: 2 });

        expect(notifications).toHaveLength(2);
        // Should skip the 2 newest and return the next 2
        expect(notifications[0].title).toBe('Notification 2');
        expect(notifications[1].title).toBe('Notification 1');
      });

      it('should filter by unreadOnly when set to true', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { title: 'Read', isRead: true });
        await createTestNotification(user._id, { title: 'Unread 1', isRead: false });
        await createTestNotification(user._id, { title: 'Unread 2', isRead: false });

        const notifications = await Notification.getNotifications(user._id, { unreadOnly: true });

        expect(notifications).toHaveLength(2);
        notifications.forEach((n) => expect(n.isRead).toBe(false));
      });

      it('should return all notifications when unreadOnly is false', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { title: 'Read', isRead: true });
        await createTestNotification(user._id, { title: 'Unread', isRead: false });

        const notifications = await Notification.getNotifications(user._id, { unreadOnly: false });

        expect(notifications).toHaveLength(2);
      });

      it('should filter by notification type when specified', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { type: 'connection_request', title: 'Connection' });
        await createTestNotification(user._id, { type: 'new_message', title: 'Message' });
        await createTestNotification(user._id, { type: 'connection_request', title: 'Connection 2' });

        const notifications = await Notification.getNotifications(user._id, { type: 'connection_request' });

        expect(notifications).toHaveLength(2);
        notifications.forEach((n) => expect(n.type).toBe('connection_request'));
      });

      it('should populate actorId with user profile fields', async () => {
        const actor = await createTestUser({
          profile: {
            displayName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
          },
        });
        const recipient = await createTestUser();

        await createTestNotification(recipient._id, {
          actorId: actor._id,
          type: 'connection_request',
        });

        const notifications = await Notification.getNotifications(recipient._id);

        expect(notifications[0].actorId).toBeDefined();
        expect(notifications[0].actorId.profile.displayName).toBe('John Doe');
        expect(notifications[0].actorId.profile.firstName).toBe('John');
      });

      it('should use default limit of 50', async () => {
        const user = await createTestUser();

        // Create 55 notifications
        for (let i = 0; i < 55; i++) {
          await createTestNotification(user._id, { title: `Notification ${i}` });
        }

        const notifications = await Notification.getNotifications(user._id);

        expect(notifications).toHaveLength(50);
      });

      it('should return empty array for user with no notifications', async () => {
        const user = await createTestUser();

        const notifications = await Notification.getNotifications(user._id);

        expect(notifications).toEqual([]);
      });
    });

    // -------------------------------------------------------------------------
    // getUnreadCount(userId)
    // -------------------------------------------------------------------------
    describe('getUnreadCount()', () => {
      it('should return the count of unread notifications', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: false });
        await createTestNotification(user._id, { isRead: false });
        await createTestNotification(user._id, { isRead: true });

        const count = await Notification.getUnreadCount(user._id);

        expect(count).toBe(2);
      });

      it('should return 0 when all notifications are read', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: true });
        await createTestNotification(user._id, { isRead: true });

        const count = await Notification.getUnreadCount(user._id);

        expect(count).toBe(0);
      });

      it('should return 0 for user with no notifications', async () => {
        const user = await createTestUser();

        const count = await Notification.getUnreadCount(user._id);

        expect(count).toBe(0);
      });

      it('should not count notifications from other users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createTestNotification(user1._id, { isRead: false });
        await createTestNotification(user2._id, { isRead: false });
        await createTestNotification(user2._id, { isRead: false });

        const count = await Notification.getUnreadCount(user1._id);

        expect(count).toBe(1);
      });
    });
  });

  // ==========================================================================
  // STATIC METHODS - STATE CHANGES
  // ==========================================================================

  describe('Static Methods - State Changes', () => {
    // -------------------------------------------------------------------------
    // markAllAsRead(userId)
    // -------------------------------------------------------------------------
    describe('markAllAsRead()', () => {
      it('should mark all unread notifications as read', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: false });
        await createTestNotification(user._id, { isRead: false });
        await createTestNotification(user._id, { isRead: false });

        await Notification.markAllAsRead(user._id);

        const notifications = await Notification.find({ userId: user._id });
        notifications.forEach((n) => {
          expect(n.isRead).toBe(true);
          expect(n.readAt).toBeDefined();
        });
      });

      it('should not affect already read notifications', async () => {
        const user = await createTestUser();

        const originalReadAt = new Date('2024-01-01');
        await createTestNotification(user._id, { isRead: true, readAt: originalReadAt });

        await Notification.markAllAsRead(user._id);

        const notifications = await Notification.find({ userId: user._id });
        // The already read one should not have its readAt changed
        expect(notifications[0].isRead).toBe(true);
      });

      it('should not affect notifications from other users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createTestNotification(user1._id, { isRead: false });
        await createTestNotification(user2._id, { isRead: false });

        await Notification.markAllAsRead(user1._id);

        const user2Notifications = await Notification.find({ userId: user2._id });
        expect(user2Notifications[0].isRead).toBe(false);
      });

      it('should return the update result', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: false });
        await createTestNotification(user._id, { isRead: false });

        const result = await Notification.markAllAsRead(user._id);

        expect(result.modifiedCount).toBe(2);
      });

      it('should return modifiedCount 0 when no unread notifications', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: true });

        const result = await Notification.markAllAsRead(user._id);

        expect(result.modifiedCount).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // markAllAsSeen(userId)
    // -------------------------------------------------------------------------
    describe('markAllAsSeen()', () => {
      it('should mark all unseen notifications as seen', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isSeen: false });
        await createTestNotification(user._id, { isSeen: false });

        await Notification.markAllAsSeen(user._id);

        const notifications = await Notification.find({ userId: user._id });
        notifications.forEach((n) => {
          expect(n.isSeen).toBe(true);
          expect(n.seenAt).toBeDefined();
        });
      });

      it('should not affect already seen notifications', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isSeen: true });

        await Notification.markAllAsSeen(user._id);

        const notifications = await Notification.find({ userId: user._id });
        expect(notifications[0].isSeen).toBe(true);
      });

      it('should not affect notifications from other users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createTestNotification(user1._id, { isSeen: false });
        await createTestNotification(user2._id, { isSeen: false });

        await Notification.markAllAsSeen(user1._id);

        const user2Notifications = await Notification.find({ userId: user2._id });
        expect(user2Notifications[0].isSeen).toBe(false);
      });

      it('should return the update result', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isSeen: false });
        await createTestNotification(user._id, { isSeen: false });
        await createTestNotification(user._id, { isSeen: false });

        const result = await Notification.markAllAsSeen(user._id);

        expect(result.modifiedCount).toBe(3);
      });
    });
  });

  // ==========================================================================
  // STATIC METHODS - NOTIFICATION CREATION
  // ==========================================================================

  describe('Static Methods - Notification Creation', () => {
    // -------------------------------------------------------------------------
    // createNotification(data)
    // -------------------------------------------------------------------------
    describe('createNotification()', () => {
      it('should create and save a notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.createNotification({
          userId: user._id,
          type: 'system_announcement',
          title: 'Test Title',
          body: 'Test Body',
        });

        expect(notification._id).toBeDefined();
        expect(notification.userId.toString()).toBe(user._id.toString());
        expect(notification.title).toBe('Test Title');
      });

      it('should set default values for isRead and isSeen', async () => {
        const user = await createTestUser();

        const notification = await Notification.createNotification({
          userId: user._id,
          type: 'system_announcement',
          title: 'Test',
        });

        expect(notification.isRead).toBe(false);
        expect(notification.isSeen).toBe(false);
      });

      it('should accept all optional fields', async () => {
        const user = await createTestUser();
        const actor = await createTestUser();
        const entityId = new mongoose.Types.ObjectId();

        const notification = await Notification.createNotification({
          userId: user._id,
          type: 'item_shared',
          actorId: actor._id,
          entityId: entityId,
          entityType: 'project',
          title: 'Test Title',
          body: 'Test Body',
          actionUrl: '/app/projects/123',
          metadata: { priority: 'high' },
        });

        expect(notification.actorId.toString()).toBe(actor._id.toString());
        expect(notification.entityId.toString()).toBe(entityId.toString());
        expect(notification.entityType).toBe('project');
        expect(notification.actionUrl).toBe('/app/projects/123');
        expect(notification.metadata.priority).toBe('high');
      });
    });

    // -------------------------------------------------------------------------
    // notifyConnectionRequest(requesterId, addresseeId, connectionId)
    // -------------------------------------------------------------------------
    describe('notifyConnectionRequest()', () => {
      it('should create a connection request notification', async () => {
        const requester = await createTestUser({
          profile: { displayName: 'John Doe' },
        });
        const addressee = await createTestUser();
        const connectionId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyConnectionRequest(
          requester._id,
          addressee._id,
          connectionId
        );

        expect(notification.userId.toString()).toBe(addressee._id.toString());
        expect(notification.type).toBe('connection_request');
        expect(notification.actorId.toString()).toBe(requester._id.toString());
        expect(notification.entityId.toString()).toBe(connectionId.toString());
        expect(notification.entityType).toBe('connection');
        expect(notification.title).toBe('John Doe wants to connect');
        expect(notification.body).toBe('You have a new connection request');
        expect(notification.actionUrl).toBe('/app/social/connections?tab=pending');
      });

      it('should use email when displayName is not set', async () => {
        const requester = await createTestUser({ email: 'john@example.com' });
        const addressee = await createTestUser();
        const connectionId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyConnectionRequest(
          requester._id,
          addressee._id,
          connectionId
        );

        expect(notification.title).toBe('john@example.com wants to connect');
      });

      it('should use "Someone" when user not found', async () => {
        const addressee = await createTestUser();
        const fakeRequesterId = new mongoose.Types.ObjectId();
        const connectionId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyConnectionRequest(
          fakeRequesterId,
          addressee._id,
          connectionId
        );

        expect(notification.title).toBe('Someone wants to connect');
      });
    });

    // -------------------------------------------------------------------------
    // notifyConnectionAccepted(accepterId, requesterId, connectionId)
    // -------------------------------------------------------------------------
    describe('notifyConnectionAccepted()', () => {
      it('should create a connection accepted notification', async () => {
        const accepter = await createTestUser({
          profile: { displayName: 'Jane Smith' },
        });
        const requester = await createTestUser();
        const connectionId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyConnectionAccepted(
          accepter._id,
          requester._id,
          connectionId
        );

        expect(notification.userId.toString()).toBe(requester._id.toString());
        expect(notification.type).toBe('connection_accepted');
        expect(notification.actorId.toString()).toBe(accepter._id.toString());
        expect(notification.entityType).toBe('connection');
        expect(notification.title).toBe('Jane Smith accepted your connection request');
        expect(notification.body).toBe('You are now connected');
        expect(notification.actionUrl).toBe(`/app/social/profile/${accepter._id}`);
      });

      it('should use email when displayName is not set', async () => {
        const accepter = await createTestUser({ email: 'jane@example.com' });
        const requester = await createTestUser();
        const connectionId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyConnectionAccepted(
          accepter._id,
          requester._id,
          connectionId
        );

        expect(notification.title).toBe('jane@example.com accepted your connection request');
      });
    });

    // -------------------------------------------------------------------------
    // notifyItemShared(ownerId, recipientId, shareId, itemType, itemTitle)
    // -------------------------------------------------------------------------
    describe('notifyItemShared()', () => {
      it('should create an item shared notification', async () => {
        const owner = await createTestUser({
          profile: { displayName: 'Project Owner' },
        });
        const recipient = await createTestUser();
        const shareId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyItemShared(
          owner._id,
          recipient._id,
          shareId,
          'project',
          'Q4 Report'
        );

        expect(notification.userId.toString()).toBe(recipient._id.toString());
        expect(notification.type).toBe('item_shared');
        expect(notification.actorId.toString()).toBe(owner._id.toString());
        expect(notification.entityType).toBe('share');
        expect(notification.title).toBe('Project Owner shared a project with you');
        expect(notification.body).toBe('Q4 Report');
        expect(notification.actionUrl).toBe('/app/social/shared?tab=pending');
      });

      it('should work with different item types', async () => {
        const owner = await createTestUser({
          profile: { displayName: 'Alice' },
        });
        const recipient = await createTestUser();
        const shareId = new mongoose.Types.ObjectId();

        const noteNotification = await Notification.notifyItemShared(
          owner._id,
          recipient._id,
          shareId,
          'note',
          'Meeting Notes'
        );

        expect(noteNotification.title).toBe('Alice shared a note with you');
        expect(noteNotification.body).toBe('Meeting Notes');
      });
    });

    // -------------------------------------------------------------------------
    // notifyNewMessage(senderId, recipientId, conversationId, preview)
    // -------------------------------------------------------------------------
    describe('notifyNewMessage()', () => {
      it('should create a new message notification', async () => {
        const sender = await createTestUser({
          profile: { displayName: 'Mike' },
        });
        const recipient = await createTestUser();
        const conversationId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyNewMessage(
          sender._id,
          recipient._id,
          conversationId,
          'Hey, can you help me with this task?'
        );

        expect(notification.userId.toString()).toBe(recipient._id.toString());
        expect(notification.type).toBe('new_message');
        expect(notification.actorId.toString()).toBe(sender._id.toString());
        expect(notification.entityType).toBe('conversation');
        expect(notification.title).toBe('New message from Mike');
        expect(notification.body).toBe('Hey, can you help me with this task?');
        expect(notification.actionUrl).toBe(`/app/messages/${conversationId}`);
      });

      it('should truncate long message previews to 100 characters', async () => {
        const sender = await createTestUser({
          profile: { displayName: 'Verbose User' },
        });
        const recipient = await createTestUser();
        const conversationId = new mongoose.Types.ObjectId();
        const longMessage = 'a'.repeat(150);

        const notification = await Notification.notifyNewMessage(
          sender._id,
          recipient._id,
          conversationId,
          longMessage
        );

        expect(notification.body).toHaveLength(100);
      });

      it('should handle null preview gracefully', async () => {
        const sender = await createTestUser();
        const recipient = await createTestUser();
        const conversationId = new mongoose.Types.ObjectId();

        const notification = await Notification.notifyNewMessage(
          sender._id,
          recipient._id,
          conversationId,
          null
        );

        expect(notification.body).toBeUndefined();
      });
    });

    // -------------------------------------------------------------------------
    // notifyModerationWarning(userId, reason, level)
    // -------------------------------------------------------------------------
    describe('notifyModerationWarning()', () => {
      it('should create a moderation warning notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationWarning(
          user._id,
          'Posting spam content',
          2
        );

        expect(notification.userId.toString()).toBe(user._id.toString());
        expect(notification.type).toBe('moderation_warning');
        expect(notification.entityType).toBe('system');
        expect(notification.title).toBe('You have received a warning');
        expect(notification.body).toBe('Posting spam content');
        expect(notification.actionUrl).toBe('/app/settings?tab=account');
        expect(notification.metadata.warningLevel).toBe(2);
        expect(notification.metadata.levelLabel).toBe('moderate');
      });

      it('should set correct level labels', async () => {
        const user = await createTestUser();

        const minor = await Notification.notifyModerationWarning(user._id, 'reason', 1);
        const moderate = await Notification.notifyModerationWarning(user._id, 'reason', 2);
        const severe = await Notification.notifyModerationWarning(user._id, 'reason', 3);

        expect(minor.metadata.levelLabel).toBe('minor');
        expect(moderate.metadata.levelLabel).toBe('moderate');
        expect(severe.metadata.levelLabel).toBe('severe');
      });

      it('should default to minor for unknown level', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationWarning(user._id, 'reason', 999);

        expect(notification.metadata.levelLabel).toBe('minor');
      });
    });

    // -------------------------------------------------------------------------
    // notifyModerationSuspension(userId, reason, until)
    // -------------------------------------------------------------------------
    describe('notifyModerationSuspension()', () => {
      it('should create a suspension notification with end date', async () => {
        const user = await createTestUser();
        const untilDate = new Date('2024-12-31');

        const notification = await Notification.notifyModerationSuspension(
          user._id,
          'Repeated harassment',
          untilDate
        );

        expect(notification.type).toBe('moderation_suspension');
        expect(notification.title).toBe('Your account has been suspended');
        expect(notification.body).toContain('Repeated harassment');
        expect(notification.body).toContain('until');
        expect(notification.metadata.suspendedUntil).toEqual(untilDate);
        expect(notification.metadata.isIndefinite).toBe(false);
      });

      it('should create indefinite suspension notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationSuspension(
          user._id,
          'Severe policy violation',
          null
        );

        expect(notification.body).toContain('indefinitely');
        expect(notification.metadata.isIndefinite).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // notifyModerationBan(userId, reason)
    // -------------------------------------------------------------------------
    describe('notifyModerationBan()', () => {
      it('should create a ban notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationBan(
          user._id,
          'Repeated severe policy violations'
        );

        expect(notification.type).toBe('moderation_ban');
        expect(notification.title).toBe('Your account has been permanently banned');
        expect(notification.body).toBe('Repeated severe policy violations');
        expect(notification.metadata.isPermanent).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // notifyModerationUnsuspend(userId, reason)
    // -------------------------------------------------------------------------
    describe('notifyModerationUnsuspend()', () => {
      it('should create an unsuspend notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationUnsuspend(
          user._id,
          'Suspension period completed'
        );

        expect(notification.type).toBe('moderation_unsuspend');
        expect(notification.title).toBe('Your suspension has been lifted');
        expect(notification.body).toBe('Suspension period completed');
        expect(notification.actionUrl).toBe('/app/dashboard');
      });

      it('should use default message when reason is not provided', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationUnsuspend(user._id, null);

        expect(notification.body).toBe('Your account access has been restored.');
      });
    });

    // -------------------------------------------------------------------------
    // notifyModerationUnban(userId, reason)
    // -------------------------------------------------------------------------
    describe('notifyModerationUnban()', () => {
      it('should create an unban notification', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationUnban(
          user._id,
          'Successful appeal'
        );

        expect(notification.type).toBe('moderation_unban');
        expect(notification.title).toBe('Your ban has been lifted');
        expect(notification.body).toBe('Successful appeal');
        expect(notification.actionUrl).toBe('/app/dashboard');
      });

      it('should use default message when reason is not provided', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyModerationUnban(user._id, '');

        expect(notification.body).toBe('Your account access has been restored.');
      });
    });

    // -------------------------------------------------------------------------
    // notifyAdminMessage(userId, subject, message, adminId)
    // -------------------------------------------------------------------------
    describe('notifyAdminMessage()', () => {
      it('should create an admin message notification', async () => {
        const user = await createTestUser();
        const admin = await createTestUser({ role: 'admin' });

        const notification = await Notification.notifyAdminMessage(
          user._id,
          'Regarding your support request',
          'We have reviewed your case and found a solution.',
          admin._id
        );

        expect(notification.type).toBe('admin_message');
        expect(notification.title).toBe('Message from Admin: Regarding your support request');
        expect(notification.body).toBe('We have reviewed your case and found a solution.');
        expect(notification.actorId.toString()).toBe(admin._id.toString());
        expect(notification.actionUrl).toBe('/app/notifications');
        expect(notification.metadata.isAdminMessage).toBe(true);
        expect(notification.metadata.fullMessage).toBe('We have reviewed your case and found a solution.');
      });

      it('should truncate long messages to 500 characters', async () => {
        const user = await createTestUser();
        const longMessage = 'a'.repeat(600);

        const notification = await Notification.notifyAdminMessage(
          user._id,
          'Subject',
          longMessage,
          null
        );

        expect(notification.body).toHaveLength(500);
        expect(notification.metadata.fullMessage).toBe(longMessage);
      });

      it('should work without adminId', async () => {
        const user = await createTestUser();

        const notification = await Notification.notifyAdminMessage(
          user._id,
          'System Notice',
          'Important update',
          null
        );

        expect(notification.actorId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // STATIC METHODS - CLEANUP
  // ==========================================================================

  describe('Static Methods - Cleanup', () => {
    // -------------------------------------------------------------------------
    // cleanupOldNotifications(daysToKeep)
    // -------------------------------------------------------------------------
    describe('cleanupOldNotifications()', () => {
      it('should delete old read notifications', async () => {
        const user = await createTestUser();

        // Create an old read notification (40 days ago)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40);
        const oldNotification = await createTestNotification(user._id, { isRead: true });
        // Use collection-level updateOne to bypass Mongoose timestamps
        await Notification.collection.updateOne(
          { _id: oldNotification._id },
          { $set: { createdAt: oldDate } }
        );

        // Create a recent read notification
        await createTestNotification(user._id, { isRead: true });

        await Notification.cleanupOldNotifications(30);

        const remaining = await Notification.find({ userId: user._id });
        expect(remaining).toHaveLength(1);
      });

      it('should not delete old unread notifications', async () => {
        const user = await createTestUser();

        // Create an old unread notification (40 days ago)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40);
        const oldNotification = await createTestNotification(user._id, { isRead: false });
        // Use collection-level updateOne to bypass Mongoose timestamps
        await Notification.collection.updateOne(
          { _id: oldNotification._id },
          { $set: { createdAt: oldDate } }
        );

        await Notification.cleanupOldNotifications(30);

        const remaining = await Notification.find({ userId: user._id });
        expect(remaining).toHaveLength(1);
        expect(remaining[0].isRead).toBe(false);
      });

      it('should not delete recent notifications even if read', async () => {
        const user = await createTestUser();

        await createTestNotification(user._id, { isRead: true });
        await createTestNotification(user._id, { isRead: true });

        await Notification.cleanupOldNotifications(30);

        const remaining = await Notification.find({ userId: user._id });
        expect(remaining).toHaveLength(2);
      });

      it('should use default of 30 days', async () => {
        const user = await createTestUser();

        // Create notification 25 days ago (should not be deleted)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 25);
        const recent = await createTestNotification(user._id, { isRead: true });
        // Use collection-level updateOne to bypass Mongoose timestamps
        await Notification.collection.updateOne(
          { _id: recent._id },
          { $set: { createdAt: recentDate } }
        );

        // Create notification 35 days ago (should be deleted)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 35);
        const old = await createTestNotification(user._id, { isRead: true });
        // Use collection-level updateOne to bypass Mongoose timestamps
        await Notification.collection.updateOne(
          { _id: old._id },
          { $set: { createdAt: oldDate } }
        );

        await Notification.cleanupOldNotifications();

        const remaining = await Notification.find({ userId: user._id });
        expect(remaining).toHaveLength(1);
      });

      it('should return the delete result', async () => {
        const user = await createTestUser();

        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40);

        const n1 = await createTestNotification(user._id, { isRead: true });
        const n2 = await createTestNotification(user._id, { isRead: true });
        // Use collection-level updateMany to bypass Mongoose timestamps
        await Notification.collection.updateMany(
          { userId: user._id },
          { $set: { createdAt: oldDate } }
        );

        const result = await Notification.cleanupOldNotifications(30);

        expect(result.deletedCount).toBe(2);
      });

      it('should respect custom daysToKeep parameter', async () => {
        const user = await createTestUser();

        // Create notification 10 days ago
        const date = new Date();
        date.setDate(date.getDate() - 10);
        const notification = await createTestNotification(user._id, { isRead: true });
        // Use collection-level updateOne to bypass Mongoose timestamps
        await Notification.collection.updateOne(
          { _id: notification._id },
          { $set: { createdAt: date } }
        );

        // With 7 days, should be deleted
        await Notification.cleanupOldNotifications(7);

        const remaining = await Notification.find({ userId: user._id });
        expect(remaining).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // INSTANCE METHODS
  // ==========================================================================

  describe('Instance Methods', () => {
    // -------------------------------------------------------------------------
    // markAsRead()
    // -------------------------------------------------------------------------
    describe('markAsRead()', () => {
      it('should mark notification as read', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, { isRead: false });

        await notification.markAsRead();

        expect(notification.isRead).toBe(true);
        expect(notification.readAt).toBeDefined();
        expect(notification.readAt instanceof Date).toBe(true);
      });

      it('should save the changes to database', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, { isRead: false });

        await notification.markAsRead();

        const freshNotification = await Notification.findById(notification._id);
        expect(freshNotification.isRead).toBe(true);
        expect(freshNotification.readAt).toBeDefined();
      });

      it('should not update if already read', async () => {
        const user = await createTestUser();
        const originalReadAt = new Date('2024-01-01');
        const notification = await createTestNotification(user._id, {
          isRead: true,
          readAt: originalReadAt,
        });

        await notification.markAsRead();

        expect(notification.readAt.getTime()).toBe(originalReadAt.getTime());
      });

      it('should be idempotent (calling multiple times has same result)', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, { isRead: false });

        await notification.markAsRead();
        const firstReadAt = notification.readAt;

        await notification.markAsRead();

        expect(notification.readAt.getTime()).toBe(firstReadAt.getTime());
      });
    });

    // -------------------------------------------------------------------------
    // markAsSeen()
    // -------------------------------------------------------------------------
    describe('markAsSeen()', () => {
      it('should mark notification as seen', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, { isSeen: false });

        await notification.markAsSeen();

        expect(notification.isSeen).toBe(true);
        expect(notification.seenAt).toBeDefined();
        expect(notification.seenAt instanceof Date).toBe(true);
      });

      it('should save the changes to database', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, { isSeen: false });

        await notification.markAsSeen();

        const freshNotification = await Notification.findById(notification._id);
        expect(freshNotification.isSeen).toBe(true);
        expect(freshNotification.seenAt).toBeDefined();
      });

      it('should not update if already seen', async () => {
        const user = await createTestUser();
        const originalSeenAt = new Date('2024-01-01');
        const notification = await createTestNotification(user._id, {
          isSeen: true,
          seenAt: originalSeenAt,
        });

        await notification.markAsSeen();

        expect(notification.seenAt.getTime()).toBe(originalSeenAt.getTime());
      });

      it('should be independent of isRead', async () => {
        const user = await createTestUser();
        const notification = await createTestNotification(user._id, {
          isRead: false,
          isSeen: false,
        });

        await notification.markAsSeen();

        expect(notification.isSeen).toBe(true);
        expect(notification.isRead).toBe(false);
      });
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe('Validation', () => {
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          Notification.create({
            type: 'system_announcement',
            title: 'Test',
          })
        ).rejects.toThrow();
      });

      it('should require type', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            title: 'Test',
          })
        ).rejects.toThrow();
      });

      it('should require title', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            type: 'system_announcement',
          })
        ).rejects.toThrow();
      });
    });

    describe('Type validation', () => {
      it('should accept all valid notification types', async () => {
        const user = await createTestUser();
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
          const notification = await Notification.create({
            userId: user._id,
            type,
            title: `Test ${type}`,
          });
          expect(notification.type).toBe(type);
        }
      });

      it('should reject invalid notification type', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            type: 'invalid_type',
            title: 'Test',
          })
        ).rejects.toThrow();
      });
    });

    describe('EntityType validation', () => {
      it('should accept all valid entity types', async () => {
        const user = await createTestUser();
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
          const notification = await Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'Test',
            entityType,
          });
          expect(notification.entityType).toBe(entityType);
        }
      });

      it('should reject invalid entity type', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'Test',
            entityType: 'invalid_entity',
          })
        ).rejects.toThrow();
      });
    });

    describe('Field length validation', () => {
      it('should reject title exceeding 200 characters', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'a'.repeat(201),
          })
        ).rejects.toThrow();
      });

      it('should reject body exceeding 500 characters', async () => {
        const user = await createTestUser();
        await expect(
          Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'Test',
            body: 'a'.repeat(501),
          })
        ).rejects.toThrow();
      });

      it('should accept title at max length (200)', async () => {
        const user = await createTestUser();
        const notification = await Notification.create({
          userId: user._id,
          type: 'system_announcement',
          title: 'a'.repeat(200),
        });
        expect(notification.title).toHaveLength(200);
      });

      it('should accept body at max length (500)', async () => {
        const user = await createTestUser();
        const notification = await Notification.create({
          userId: user._id,
          type: 'system_announcement',
          title: 'Test',
          body: 'a'.repeat(500),
        });
        expect(notification.body).toHaveLength(500);
      });
    });
  });

  // ==========================================================================
  // USER ISOLATION
  // ==========================================================================

  describe('User Isolation', () => {
    it('should keep notifications separate between users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestNotification(user1._id, { title: 'User 1 - N1' });
      await createTestNotification(user1._id, { title: 'User 1 - N2' });
      await createTestNotification(user2._id, { title: 'User 2 - N1' });
      await createTestNotification(user2._id, { title: 'User 2 - N2' });
      await createTestNotification(user2._id, { title: 'User 2 - N3' });

      const user1Notifications = await Notification.getNotifications(user1._id);
      const user2Notifications = await Notification.getNotifications(user2._id);

      expect(user1Notifications).toHaveLength(2);
      expect(user2Notifications).toHaveLength(3);

      user1Notifications.forEach((n) => {
        expect(n.userId.toString()).toBe(user1._id.toString());
      });
    });

    it('markAllAsRead should only affect own notifications', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestNotification(user1._id, { isRead: false });
      await createTestNotification(user2._id, { isRead: false });

      await Notification.markAllAsRead(user1._id);

      const user1Count = await Notification.getUnreadCount(user1._id);
      const user2Count = await Notification.getUnreadCount(user2._id);

      expect(user1Count).toBe(0);
      expect(user2Count).toBe(1);
    });

    it('markAllAsSeen should only affect own notifications', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestNotification(user1._id, { isSeen: false });
      await createTestNotification(user2._id, { isSeen: false });

      await Notification.markAllAsSeen(user1._id);

      const user1Unseen = await Notification.countDocuments({ userId: user1._id, isSeen: false });
      const user2Unseen = await Notification.countDocuments({ userId: user2._id, isSeen: false });

      expect(user1Unseen).toBe(0);
      expect(user2Unseen).toBe(1);
    });
  });

  // ==========================================================================
  // DEFAULT VALUES
  // ==========================================================================

  describe('Default Values', () => {
    it('should set correct defaults for new notification', async () => {
      const user = await createTestUser();
      const notification = await Notification.create({
        userId: user._id,
        type: 'system_announcement',
        title: 'Test',
      });

      expect(notification.isRead).toBe(false);
      expect(notification.isSeen).toBe(false);
      expect(notification.readAt).toBeUndefined();
      expect(notification.seenAt).toBeUndefined();
      expect(notification.createdAt).toBeDefined();
      expect(notification.updatedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // TIMESTAMPS
  // ==========================================================================

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const user = await createTestUser();
      const beforeCreate = new Date();

      const notification = await Notification.create({
        userId: user._id,
        type: 'system_announcement',
        title: 'Test',
      });

      const afterCreate = new Date();

      expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(notification.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(notification.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });

    it('should update updatedAt on save', async () => {
      const user = await createTestUser();
      const notification = await Notification.create({
        userId: user._id,
        type: 'system_announcement',
        title: 'Test',
      });

      const originalUpdatedAt = notification.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      notification.title = 'Updated Title';
      await notification.save();

      expect(notification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ==========================================================================
  // METADATA
  // ==========================================================================

  describe('Metadata', () => {
    it('should store arbitrary metadata', async () => {
      const user = await createTestUser();
      const notification = await Notification.create({
        userId: user._id,
        type: 'system_announcement',
        title: 'Test',
        metadata: {
          priority: 'high',
          category: 'billing',
          nested: { value: 123 },
          array: [1, 2, 3],
        },
      });

      expect(notification.metadata.priority).toBe('high');
      expect(notification.metadata.category).toBe('billing');
      expect(notification.metadata.nested.value).toBe(123);
      expect(notification.metadata.array).toEqual([1, 2, 3]);
    });

    it('should persist metadata correctly', async () => {
      const user = await createTestUser();
      const notification = await Notification.create({
        userId: user._id,
        type: 'system_announcement',
        title: 'Test',
        metadata: { key: 'value' },
      });

      const fetched = await Notification.findById(notification._id);
      expect(fetched.metadata.key).toBe('value');
    });
  });
});
