/**
 * =============================================================================
 * ADMINMESSAGE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the AdminMessage model, covering:
 * - Schema validation (required fields, enums, maxlength)
 * - CRUD operations (create, read, update, delete)
 * - Message categories (general, support, moderation, security, billing, announcement)
 * - Priority levels (low, normal, high, urgent)
 * - Read/unread status
 * - Static methods (getMessages, getUnreadCount, sendMessage)
 * - Instance methods (markAsRead, toSafeJSON)
 * - Related entities
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import AdminMessage from './AdminMessage.js';
import User from './User.js';
import Notification from './Notification.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
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
 * Creates a test admin user.
 */
async function createTestAdmin(overrides = {}) {
  return createTestUser({ ...overrides, role: 'admin' });
}

/**
 * Creates a test admin message with sensible defaults.
 */
async function createTestMessage(userId, sentBy, overrides = {}) {
  const defaults = {
    userId,
    sentBy,
    subject: 'Test Subject',
    message: 'This is a test message body.',
    category: 'general',
    priority: 'normal',
  };
  return AdminMessage.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('AdminMessage Model', () => {
  describe('Schema Validation', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should require userId', async () => {
      await expect(
        AdminMessage.create({
          sentBy: admin._id,
          subject: 'Test',
          message: 'Test message',
        })
      ).rejects.toThrow(/userId.*required/i);
    });

    it('should require sentBy', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          subject: 'Test',
          message: 'Test message',
        })
      ).rejects.toThrow(/sentBy.*required/i);
    });

    it('should require subject', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          message: 'Test message',
        })
      ).rejects.toThrow(/subject.*required/i);
    });

    it('should require message', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'Test',
        })
      ).rejects.toThrow(/message.*required/i);
    });

    it('should enforce subject maxlength of 200', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'a'.repeat(201),
          message: 'Test message',
        })
      ).rejects.toThrow(/subject/i);
    });

    it('should accept subject at max length', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'a'.repeat(200),
        message: 'Test message',
      });
      expect(msg.subject).toHaveLength(200);
    });

    it('should enforce message maxlength of 5000', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'Test',
          message: 'a'.repeat(5001),
        })
      ).rejects.toThrow(/message/i);
    });

    it('should accept message at max length', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Test',
        message: 'a'.repeat(5000),
      });
      expect(msg.message).toHaveLength(5000);
    });

    it('should trim subject', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: '  Trimmed Subject  ',
        message: 'Test message',
      });
      expect(msg.subject).toBe('Trimmed Subject');
    });

    it('should default category to general', async () => {
      const msg = await createTestMessage(user._id, admin._id);
      expect(msg.category).toBe('general');
    });

    it('should accept valid category values', async () => {
      const validCategories = ['general', 'support', 'moderation', 'security', 'billing', 'announcement'];

      for (const category of validCategories) {
        const msg = await AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: `Test ${category}`,
          message: 'Test message',
          category,
        });
        expect(msg.category).toBe(category);
      }
    });

    it('should reject invalid category', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'Test',
          message: 'Test message',
          category: 'invalid',
        })
      ).rejects.toThrow(/category/i);
    });

    it('should default priority to normal', async () => {
      const msg = await createTestMessage(user._id, admin._id);
      expect(msg.priority).toBe('normal');
    });

    it('should accept valid priority values', async () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      for (const priority of validPriorities) {
        const msg = await AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: `Test ${priority}`,
          message: 'Test message',
          priority,
        });
        expect(msg.priority).toBe(priority);
      }
    });

    it('should reject invalid priority', async () => {
      await expect(
        AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'Test',
          message: 'Test message',
          priority: 'invalid',
        })
      ).rejects.toThrow(/priority/i);
    });

    it('should default isRead to false', async () => {
      const msg = await createTestMessage(user._id, admin._id);
      expect(msg.isRead).toBe(false);
    });
  });

  // =============================================================================
  // TEST SUITE: CRUD OPERATIONS
  // =============================================================================

  describe('CRUD Operations', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should create an admin message successfully', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Welcome Message',
        message: 'Welcome to our platform!',
        category: 'general',
        priority: 'normal',
      });

      expect(msg._id).toBeDefined();
      expect(msg.userId.toString()).toBe(user._id.toString());
      expect(msg.sentBy.toString()).toBe(admin._id.toString());
      expect(msg.subject).toBe('Welcome Message');
      expect(msg.message).toBe('Welcome to our platform!');
      expect(msg.isRead).toBe(false);
      expect(msg.createdAt).toBeDefined();
    });

    it('should find a message by id', async () => {
      const created = await createTestMessage(user._id, admin._id);
      const found = await AdminMessage.findById(created._id);

      expect(found).not.toBeNull();
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('should update a message', async () => {
      const msg = await createTestMessage(user._id, admin._id);

      msg.isRead = true;
      msg.readAt = new Date();
      await msg.save();

      const updated = await AdminMessage.findById(msg._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should delete a message', async () => {
      const msg = await createTestMessage(user._id, admin._id);

      await AdminMessage.deleteOne({ _id: msg._id });

      const found = await AdminMessage.findById(msg._id);
      expect(found).toBeNull();
    });

    it('should find messages by userId', async () => {
      await createTestMessage(user._id, admin._id, { subject: 'Message 1' });
      await createTestMessage(user._id, admin._id, { subject: 'Message 2' });

      const messages = await AdminMessage.find({ userId: user._id });
      expect(messages).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: CATEGORIES
  // =============================================================================

  describe('Message Categories', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should create general message', async () => {
      const msg = await createTestMessage(user._id, admin._id, { category: 'general' });
      expect(msg.category).toBe('general');
    });

    it('should create support message', async () => {
      const msg = await createTestMessage(user._id, admin._id, {
        category: 'support',
        subject: 'Your support ticket has been resolved',
      });
      expect(msg.category).toBe('support');
    });

    it('should create moderation message', async () => {
      const msg = await createTestMessage(user._id, admin._id, {
        category: 'moderation',
        subject: 'Content policy notice',
      });
      expect(msg.category).toBe('moderation');
    });

    it('should create security message', async () => {
      const msg = await createTestMessage(user._id, admin._id, {
        category: 'security',
        subject: 'Security alert',
        priority: 'urgent',
      });
      expect(msg.category).toBe('security');
    });

    it('should create billing message', async () => {
      const msg = await createTestMessage(user._id, admin._id, {
        category: 'billing',
        subject: 'Subscription update',
      });
      expect(msg.category).toBe('billing');
    });

    it('should create announcement message', async () => {
      const msg = await createTestMessage(user._id, admin._id, {
        category: 'announcement',
        subject: 'New feature announcement',
      });
      expect(msg.category).toBe('announcement');
    });

    it('should filter messages by category', async () => {
      await createTestMessage(user._id, admin._id, { category: 'support' });
      await createTestMessage(user._id, admin._id, { category: 'support' });
      await createTestMessage(user._id, admin._id, { category: 'security' });

      const supportMessages = await AdminMessage.find({ category: 'support' });
      const securityMessages = await AdminMessage.find({ category: 'security' });

      expect(supportMessages).toHaveLength(2);
      expect(securityMessages).toHaveLength(1);
    });
  });

  // =============================================================================
  // TEST SUITE: PRIORITY LEVELS
  // =============================================================================

  describe('Priority Levels', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should create low priority message', async () => {
      const msg = await createTestMessage(user._id, admin._id, { priority: 'low' });
      expect(msg.priority).toBe('low');
    });

    it('should create normal priority message', async () => {
      const msg = await createTestMessage(user._id, admin._id, { priority: 'normal' });
      expect(msg.priority).toBe('normal');
    });

    it('should create high priority message', async () => {
      const msg = await createTestMessage(user._id, admin._id, { priority: 'high' });
      expect(msg.priority).toBe('high');
    });

    it('should create urgent priority message', async () => {
      const msg = await createTestMessage(user._id, admin._id, { priority: 'urgent' });
      expect(msg.priority).toBe('urgent');
    });

    it('should filter messages by priority', async () => {
      await createTestMessage(user._id, admin._id, { priority: 'urgent' });
      await createTestMessage(user._id, admin._id, { priority: 'normal' });
      await createTestMessage(user._id, admin._id, { priority: 'normal' });

      const urgentMessages = await AdminMessage.find({ priority: 'urgent' });
      const normalMessages = await AdminMessage.find({ priority: 'normal' });

      expect(urgentMessages).toHaveLength(1);
      expect(normalMessages).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: READ/UNREAD STATUS
  // =============================================================================

  describe('Read/Unread Status', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should start as unread', async () => {
      const msg = await createTestMessage(user._id, admin._id);
      expect(msg.isRead).toBe(false);
      expect(msg.readAt).toBeUndefined();
    });

    it('should mark message as read', async () => {
      const msg = await createTestMessage(user._id, admin._id);

      await msg.markAsRead();

      expect(msg.isRead).toBe(true);
      expect(msg.readAt).toBeDefined();
    });

    it('should persist read status to database', async () => {
      const msg = await createTestMessage(user._id, admin._id);

      await msg.markAsRead();

      const freshMsg = await AdminMessage.findById(msg._id);
      expect(freshMsg.isRead).toBe(true);
      expect(freshMsg.readAt).toBeDefined();
    });

    it('should not update readAt if already read', async () => {
      const msg = await createTestMessage(user._id, admin._id);

      await msg.markAsRead();
      const firstReadAt = msg.readAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await msg.markAsRead();

      expect(msg.readAt.getTime()).toBe(firstReadAt.getTime());
    });

    it('should filter unread messages', async () => {
      const msg1 = await createTestMessage(user._id, admin._id, { subject: 'Unread 1' });
      const msg2 = await createTestMessage(user._id, admin._id, { subject: 'Unread 2' });
      const msg3 = await createTestMessage(user._id, admin._id, { subject: 'Read' });

      await msg3.markAsRead();

      const unreadMessages = await AdminMessage.find({ userId: user._id, isRead: false });
      expect(unreadMessages).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    describe('getMessages()', () => {
      it('should return messages for a user', async () => {
        await createTestMessage(user._id, admin._id, { subject: 'Message 1' });
        await createTestMessage(user._id, admin._id, { subject: 'Message 2' });

        const messages = await AdminMessage.getMessages(user._id);

        expect(messages).toHaveLength(2);
      });

      it('should sort messages by createdAt descending (newest first)', async () => {
        await createTestMessage(user._id, admin._id, { subject: 'First' });
        await new Promise(resolve => setTimeout(resolve, 10));
        await createTestMessage(user._id, admin._id, { subject: 'Second' });

        const messages = await AdminMessage.getMessages(user._id);

        expect(messages[0].subject).toBe('Second');
        expect(messages[1].subject).toBe('First');
      });

      it('should limit results', async () => {
        for (let i = 0; i < 5; i++) {
          await createTestMessage(user._id, admin._id, { subject: `Message ${i}` });
        }

        const messages = await AdminMessage.getMessages(user._id, { limit: 3 });

        expect(messages).toHaveLength(3);
      });

      it('should skip results for pagination', async () => {
        for (let i = 0; i < 5; i++) {
          await createTestMessage(user._id, admin._id, { subject: `Message ${i}` });
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        const messages = await AdminMessage.getMessages(user._id, { skip: 2, limit: 2 });

        expect(messages).toHaveLength(2);
      });

      it('should filter by unreadOnly', async () => {
        const msg1 = await createTestMessage(user._id, admin._id, { subject: 'Unread' });
        const msg2 = await createTestMessage(user._id, admin._id, { subject: 'Read' });

        await msg2.markAsRead();

        const messages = await AdminMessage.getMessages(user._id, { unreadOnly: true });

        expect(messages).toHaveLength(1);
        expect(messages[0].subject).toBe('Unread');
      });

      it('should filter by category', async () => {
        await createTestMessage(user._id, admin._id, { category: 'support' });
        await createTestMessage(user._id, admin._id, { category: 'security' });

        const messages = await AdminMessage.getMessages(user._id, { category: 'support' });

        expect(messages).toHaveLength(1);
        expect(messages[0].category).toBe('support');
      });

      it('should populate sentBy field', async () => {
        await createTestMessage(user._id, admin._id);

        const messages = await AdminMessage.getMessages(user._id);

        expect(messages[0].sentBy).toBeDefined();
        expect(messages[0].sentBy.email).toBe(admin.email);
      });

      it('should not return messages from other users', async () => {
        const otherUser = await createTestUser();
        await createTestMessage(user._id, admin._id);
        await createTestMessage(otherUser._id, admin._id);

        const messages = await AdminMessage.getMessages(user._id);

        expect(messages).toHaveLength(1);
      });
    });

    describe('getUnreadCount()', () => {
      it('should return 0 when no messages', async () => {
        const count = await AdminMessage.getUnreadCount(user._id);
        expect(count).toBe(0);
      });

      it('should count unread messages', async () => {
        await createTestMessage(user._id, admin._id);
        await createTestMessage(user._id, admin._id);
        await createTestMessage(user._id, admin._id);

        const count = await AdminMessage.getUnreadCount(user._id);
        expect(count).toBe(3);
      });

      it('should not count read messages', async () => {
        const msg1 = await createTestMessage(user._id, admin._id);
        await createTestMessage(user._id, admin._id);

        await msg1.markAsRead();

        const count = await AdminMessage.getUnreadCount(user._id);
        expect(count).toBe(1);
      });

      it('should not count messages from other users', async () => {
        const otherUser = await createTestUser();
        await createTestMessage(user._id, admin._id);
        await createTestMessage(otherUser._id, admin._id);

        const count = await AdminMessage.getUnreadCount(user._id);
        expect(count).toBe(1);
      });
    });

    describe('sendMessage()', () => {
      it('should create and save a message', async () => {
        const msg = await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Test Subject',
          message: 'Test message body',
        });

        expect(msg._id).toBeDefined();
        expect(msg.userId.toString()).toBe(user._id.toString());
        expect(msg.sentBy.toString()).toBe(admin._id.toString());
        expect(msg.subject).toBe('Test Subject');
        expect(msg.message).toBe('Test message body');
      });

      it('should default category to general', async () => {
        const msg = await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Test',
          message: 'Test message',
        });

        expect(msg.category).toBe('general');
      });

      it('should default priority to normal', async () => {
        const msg = await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Test',
          message: 'Test message',
        });

        expect(msg.priority).toBe('normal');
      });

      it('should accept custom category and priority', async () => {
        const msg = await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Security Alert',
          message: 'Urgent security issue',
          category: 'security',
          priority: 'urgent',
        });

        expect(msg.category).toBe('security');
        expect(msg.priority).toBe('urgent');
      });

      it('should accept relatedTo entity', async () => {
        const reportId = new mongoose.Types.ObjectId();

        const msg = await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Report Resolution',
          message: 'Your report has been resolved',
          relatedTo: {
            entityType: 'report',
            entityId: reportId,
          },
        });

        expect(msg.relatedTo.entityType).toBe('report');
        expect(msg.relatedTo.entityId.toString()).toBe(reportId.toString());
      });

      it('should create a notification for the user', async () => {
        await AdminMessage.sendMessage(admin._id, user._id, {
          subject: 'Test Notification',
          message: 'Test message body',
        });

        const notification = await Notification.findOne({
          userId: user._id,
          type: 'admin_message',
        });

        expect(notification).not.toBeNull();
        expect(notification.title).toContain('Test Notification');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    describe('markAsRead()', () => {
      it('should mark message as read', async () => {
        const msg = await createTestMessage(user._id, admin._id);

        await msg.markAsRead();

        expect(msg.isRead).toBe(true);
        expect(msg.readAt).toBeDefined();
      });

      it('should set readAt to current time', async () => {
        const msg = await createTestMessage(user._id, admin._id);
        const before = new Date();

        await msg.markAsRead();

        const after = new Date();
        expect(msg.readAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(msg.readAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('toSafeJSON()', () => {
      it('should return safe fields', async () => {
        const msg = await createTestMessage(user._id, admin._id);

        const safeJson = msg.toSafeJSON();

        expect(safeJson._id).toBeDefined();
        expect(safeJson.subject).toBe('Test Subject');
        expect(safeJson.message).toBeDefined();
        expect(safeJson.category).toBe('general');
        expect(safeJson.priority).toBe('normal');
        expect(safeJson.isRead).toBe(false);
        expect(safeJson.createdAt).toBeDefined();
      });

      it('should exclude internal fields', async () => {
        const msg = await createTestMessage(user._id, admin._id);

        const safeJson = msg.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
        expect(safeJson.updatedAt).toBeUndefined();
        expect(safeJson.userId).toBeUndefined();
      });

      it('should include relatedTo when present', async () => {
        const reportId = new mongoose.Types.ObjectId();
        const msg = await AdminMessage.create({
          userId: user._id,
          sentBy: admin._id,
          subject: 'Report Update',
          message: 'Your report status',
          relatedTo: {
            entityType: 'report',
            entityId: reportId,
          },
        });

        const safeJson = msg.toSafeJSON();

        expect(safeJson.relatedTo).toBeDefined();
        expect(safeJson.relatedTo.entityType).toBe('report');
      });

      it('should include readAt when message is read', async () => {
        const msg = await createTestMessage(user._id, admin._id);
        await msg.markAsRead();

        const safeJson = msg.toSafeJSON();

        expect(safeJson.readAt).toBeDefined();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: RELATED ENTITIES
  // =============================================================================

  describe('Related Entities', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should store report reference', async () => {
      const reportId = new mongoose.Types.ObjectId();

      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Report Resolution',
        message: 'Your report has been resolved',
        relatedTo: {
          entityType: 'report',
          entityId: reportId,
        },
      });

      expect(msg.relatedTo.entityType).toBe('report');
      expect(msg.relatedTo.entityId.toString()).toBe(reportId.toString());
    });

    it('should store moderation_action reference', async () => {
      const actionId = new mongoose.Types.ObjectId();

      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Moderation Notice',
        message: 'Action taken on your account',
        relatedTo: {
          entityType: 'moderation_action',
          entityId: actionId,
        },
      });

      expect(msg.relatedTo.entityType).toBe('moderation_action');
    });

    it('should store ticket reference', async () => {
      const ticketId = new mongoose.Types.ObjectId();

      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Ticket Update',
        message: 'Your ticket status has changed',
        relatedTo: {
          entityType: 'ticket',
          entityId: ticketId,
        },
      });

      expect(msg.relatedTo.entityType).toBe('ticket');
    });

    it('should store other reference type', async () => {
      const entityId = new mongoose.Types.ObjectId();

      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'General Notice',
        message: 'Important information',
        relatedTo: {
          entityType: 'other',
          entityId,
        },
      });

      expect(msg.relatedTo.entityType).toBe('other');
    });

    it('should allow message without relatedTo', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'General Message',
        message: 'No related entity',
      });

      expect(msg.relatedTo.entityType).toBeUndefined();
      expect(msg.relatedTo.entityId).toBeUndefined();
    });
  });

  // =============================================================================
  // TEST SUITE: METADATA
  // =============================================================================

  describe('Metadata', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should store arbitrary metadata', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Test',
        message: 'Test message',
        metadata: {
          customField: 'value',
          numberField: 123,
          nested: { deep: true },
        },
      });

      expect(msg.metadata.customField).toBe('value');
      expect(msg.metadata.numberField).toBe(123);
      expect(msg.metadata.nested.deep).toBe(true);
    });

    it('should allow empty metadata', async () => {
      const msg = await AdminMessage.create({
        userId: user._id,
        sentBy: admin._id,
        subject: 'Test',
        message: 'Test message',
      });

      expect(msg.metadata).toBeUndefined();
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    let user, admin;

    beforeEach(async () => {
      user = await createTestUser();
      admin = await createTestAdmin();
    });

    it('should set createdAt on creation', async () => {
      const before = new Date();
      const msg = await createTestMessage(user._id, admin._id);
      const after = new Date();

      expect(msg.createdAt).toBeDefined();
      expect(msg.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(msg.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const msg = await createTestMessage(user._id, admin._id);
      const originalUpdatedAt = msg.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      msg.isRead = true;
      await msg.save();

      expect(msg.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
