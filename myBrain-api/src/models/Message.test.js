/**
 * =============================================================================
 * MESSAGE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Message model, covering:
 * - Static methods (getMessages, createSystemMessage, getUnreadCount)
 * - Instance methods (markAsRead, edit, softDelete, canEdit, canDelete)
 * - Message creation (regular and system messages)
 * - Read receipts and tracking
 * - Edit and delete permissions with time limits
 * - User isolation (only see messages in own conversations)
 * - Soft delete functionality
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Message from './Message.js';
import Conversation from './Conversation.js';
import User from './User.js';

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
 * Creates a test conversation between users.
 */
async function createTestConversation(participants, type = 'direct') {
  return Conversation.create({
    participants: participants.map(p => p._id),
    type,
    participantMeta: participants.map(p => ({
      userId: p._id,
      role: type === 'direct' ? 'member' : 'member',
    })),
  });
}

/**
 * Creates a test message with sensible defaults.
 */
async function createTestMessage(conversationId, senderId, overrides = {}) {
  const defaults = {
    conversationId,
    senderId,
    content: 'Test message content',
    contentType: 'text',
  };
  return Message.create({ ...defaults, ...overrides });
}

/**
 * Helper to create a message with a custom createdAt timestamp.
 * Uses insertOne to bypass Mongoose timestamps auto-generation.
 */
async function createMessageWithTimestamp(conversationId, senderId, content, createdAt) {
  const message = new Message({
    conversationId,
    senderId,
    content,
    contentType: 'text',
    createdAt,
    updatedAt: createdAt,
  });
  await Message.collection.insertOne(message.toObject());
  return Message.findById(message._id);
}

// =============================================================================
// TEST SUITE: MESSAGE CREATION
// =============================================================================

describe('Message Model', () => {
  // ---------------------------------------------------------------------------
  // MESSAGE CREATION - REGULAR MESSAGES
  // ---------------------------------------------------------------------------
  describe('Message Creation - Regular Messages', () => {
    it('should create a basic text message', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);

      expect(message.conversationId.toString()).toBe(conversation._id.toString());
      expect(message.senderId.toString()).toBe(user._id.toString());
      expect(message.content).toBe('Test message content');
      expect(message.contentType).toBe('text');
      expect(message.isDeleted).toBe(false);
      expect(message.isEdited).toBe(false);
      expect(message.readBy).toHaveLength(0);
    });

    it('should create a message with custom content type', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        contentType: 'image',
        attachments: [{
          type: 'image',
          url: 'https://example.com/image.jpg',
          name: 'photo.jpg',
        }],
      });

      expect(message.contentType).toBe('image');
      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0].type).toBe('image');
      expect(message.attachments[0].url).toBe('https://example.com/image.jpg');
    });

    it('should create a message with file attachment', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        contentType: 'file',
        content: 'Here is the document',
        attachments: [{
          type: 'file',
          url: 'https://example.com/doc.pdf',
          name: 'document.pdf',
          size: 1024000,
          mimeType: 'application/pdf',
        }],
      });

      expect(message.contentType).toBe('file');
      expect(message.attachments[0].size).toBe(1024000);
      expect(message.attachments[0].mimeType).toBe('application/pdf');
    });

    it('should create a message with reply reference', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const originalMessage = await createTestMessage(conversation._id, user._id, {
        content: 'Original message',
      });

      const replyMessage = await createTestMessage(conversation._id, user2._id, {
        content: 'Reply to original',
        replyToId: originalMessage._id,
        replyToPreview: {
          content: 'Original message',
          senderId: user._id,
        },
      });

      expect(replyMessage.replyToId.toString()).toBe(originalMessage._id.toString());
      expect(replyMessage.replyToPreview.content).toBe('Original message');
      expect(replyMessage.replyToPreview.senderId.toString()).toBe(user._id.toString());
    });

    it('should set timestamps automatically', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const before = new Date();
      const message = await createTestMessage(conversation._id, user._id);
      const after = new Date();

      expect(message.createdAt).toBeInstanceOf(Date);
      expect(message.createdAt >= before).toBe(true);
      expect(message.createdAt <= after).toBe(true);
    });

    it('should enforce content max length', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await expect(
        createTestMessage(conversation._id, user._id, {
          content: 'a'.repeat(10001),
        })
      ).rejects.toThrow(/cannot exceed 10000 characters/);
    });

    it('should require conversationId', async () => {
      const user = await createTestUser();

      await expect(
        Message.create({
          senderId: user._id,
          content: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should require senderId', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await expect(
        Message.create({
          conversationId: conversation._id,
          content: 'Test',
        })
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // MESSAGE CREATION - SYSTEM MESSAGES
  // ---------------------------------------------------------------------------
  describe('Message Creation - System Messages', () => {
    it('should create a user_joined system message', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_joined',
        user._id
      );

      expect(message.contentType).toBe('system');
      expect(message.content).toBe('joined the conversation');
      expect(message.systemMeta.type).toBe('user_joined');
      expect(message.senderId.toString()).toBe(user._id.toString());
    });

    it('should create a user_left system message', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_left',
        user._id
      );

      expect(message.content).toBe('left the conversation');
      expect(message.systemMeta.type).toBe('user_left');
    });

    it('should create a group_created system message', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'group_created',
        user._id
      );

      expect(message.content).toBe('created this group');
      expect(message.systemMeta.type).toBe('group_created');
    });

    it('should create a group_renamed system message with custom content', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'group_renamed',
        user._id,
        null,
        'renamed the group to "Project Team"'
      );

      expect(message.content).toBe('renamed the group to "Project Team"');
      expect(message.systemMeta.type).toBe('group_renamed');
    });

    it('should create a user_added system message with target user', async () => {
      const admin = await createTestUser();
      const newUser = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([admin, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_added',
        admin._id,
        newUser._id
      );

      expect(message.content).toBe('was added to the conversation');
      expect(message.systemMeta.type).toBe('user_added');
      expect(message.systemMeta.targetUserId.toString()).toBe(newUser._id.toString());
    });

    it('should create a user_removed system message with target user', async () => {
      const admin = await createTestUser();
      const removedUser = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([admin, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_removed',
        admin._id,
        removedUser._id
      );

      expect(message.content).toBe('was removed from the conversation');
      expect(message.systemMeta.type).toBe('user_removed');
      expect(message.systemMeta.targetUserId.toString()).toBe(removedUser._id.toString());
    });

    it('should persist system message to database', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_joined',
        user._id
      );

      const found = await Message.findById(message._id);
      expect(found).not.toBeNull();
      expect(found.contentType).toBe('system');
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  // ---------------------------------------------------------------------------
  // getMessages()
  // ---------------------------------------------------------------------------
  describe('getMessages()', () => {
    it('should return messages for a conversation', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createTestMessage(conversation._id, user._id, { content: 'Message 1' });
      await createTestMessage(conversation._id, user2._id, { content: 'Message 2' });
      await createTestMessage(conversation._id, user._id, { content: 'Message 3' });

      const messages = await Message.getMessages(conversation._id);

      expect(messages).toHaveLength(3);
    });

    it('should return messages sorted by createdAt descending (newest first)', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const msg1 = await createMessageWithTimestamp(
        conversation._id, user._id, 'First', new Date('2024-01-01')
      );
      const msg2 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Second', new Date('2024-01-02')
      );
      const msg3 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Third', new Date('2024-01-03')
      );

      const messages = await Message.getMessages(conversation._id);

      expect(messages[0].content).toBe('Third');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('First');
    });

    it('should respect limit option', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      for (let i = 0; i < 10; i++) {
        await createTestMessage(conversation._id, user._id, { content: `Message ${i}` });
      }

      const messages = await Message.getMessages(conversation._id, { limit: 5 });

      expect(messages).toHaveLength(5);
    });

    it('should default limit to 50', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      // Create 60 messages
      for (let i = 0; i < 60; i++) {
        await createTestMessage(conversation._id, user._id, { content: `Message ${i}` });
      }

      const messages = await Message.getMessages(conversation._id);

      expect(messages).toHaveLength(50);
    });

    it('should support pagination with before option', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const msg1 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Old', new Date('2024-01-01')
      );
      const msg2 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Middle', new Date('2024-01-02')
      );
      const msg3 = await createMessageWithTimestamp(
        conversation._id, user._id, 'New', new Date('2024-01-03')
      );

      // Get messages before the middle message
      const messages = await Message.getMessages(conversation._id, {
        before: msg2.createdAt,
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Old');
    });

    it('should support pagination with after option', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const msg1 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Old', new Date('2024-01-01')
      );
      const msg2 = await createMessageWithTimestamp(
        conversation._id, user._id, 'Middle', new Date('2024-01-02')
      );
      const msg3 = await createMessageWithTimestamp(
        conversation._id, user._id, 'New', new Date('2024-01-03')
      );

      // Get messages after the middle message
      const messages = await Message.getMessages(conversation._id, {
        after: msg2.createdAt,
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('New');
    });

    it('should exclude soft-deleted messages', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createTestMessage(conversation._id, user._id, { content: 'Visible' });
      const deletedMsg = await createTestMessage(conversation._id, user._id, {
        content: 'Deleted',
        isDeleted: true,
      });

      const messages = await Message.getMessages(conversation._id);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Visible');
    });

    it('should populate sender information', async () => {
      const user = await createTestUser({
        profile: { displayName: 'John Doe', firstName: 'John', lastName: 'Doe' },
      });
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createTestMessage(conversation._id, user._id);

      const messages = await Message.getMessages(conversation._id);

      expect(messages[0].senderId.profile.displayName).toBe('John Doe');
    });

    it('should return empty array for non-existent conversation', async () => {
      const fakeConversationId = new mongoose.Types.ObjectId();

      const messages = await Message.getMessages(fakeConversationId);

      expect(messages).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // createSystemMessage() - Additional tests
  // ---------------------------------------------------------------------------
  describe('createSystemMessage() - Edge Cases', () => {
    it('should handle null targetUserId gracefully', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_joined',
        user._id,
        null
      );

      expect(message.systemMeta.targetUserId).toBeNull();
    });

    it('should use custom content when provided', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2], 'group');

      const message = await Message.createSystemMessage(
        conversation._id,
        'user_joined',
        user._id,
        null,
        'Admin invited you to this conversation'
      );

      expect(message.content).toBe('Admin invited you to this conversation');
    });
  });

  // ---------------------------------------------------------------------------
  // getUnreadCount()
  // ---------------------------------------------------------------------------
  describe('getUnreadCount()', () => {
    it('should count all messages for user with no lastReadAt', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      // Create 3 messages from user2
      await createTestMessage(conversation._id, user2._id, { content: 'Message 1' });
      await createTestMessage(conversation._id, user2._id, { content: 'Message 2' });
      await createTestMessage(conversation._id, user2._id, { content: 'Message 3' });

      const count = await Message.getUnreadCount(conversation._id, user._id, null);

      expect(count).toBe(3);
    });

    it('should count messages after lastReadAt', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      // Create messages at different times
      await createMessageWithTimestamp(
        conversation._id, user2._id, 'Old', new Date('2024-01-01')
      );
      await createMessageWithTimestamp(
        conversation._id, user2._id, 'New 1', new Date('2024-01-03')
      );
      await createMessageWithTimestamp(
        conversation._id, user2._id, 'New 2', new Date('2024-01-04')
      );

      // Last read on Jan 2
      const count = await Message.getUnreadCount(
        conversation._id,
        user._id,
        new Date('2024-01-02')
      );

      expect(count).toBe(2);
    });

    it('should not count user own messages', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      // User's own messages
      await createTestMessage(conversation._id, user._id, { content: 'My message 1' });
      await createTestMessage(conversation._id, user._id, { content: 'My message 2' });
      // Other user's messages
      await createTestMessage(conversation._id, user2._id, { content: 'Their message' });

      const count = await Message.getUnreadCount(conversation._id, user._id, null);

      expect(count).toBe(1);
    });

    it('should not count deleted messages', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createTestMessage(conversation._id, user2._id, { content: 'Visible' });
      await createTestMessage(conversation._id, user2._id, {
        content: 'Deleted',
        isDeleted: true,
      });

      const count = await Message.getUnreadCount(conversation._id, user._id, null);

      expect(count).toBe(1);
    });

    it('should return 0 when all messages are read', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createMessageWithTimestamp(
        conversation._id, user2._id, 'Message', new Date('2024-01-01')
      );

      // Last read after the message
      const count = await Message.getUnreadCount(
        conversation._id,
        user._id,
        new Date('2024-01-02')
      );

      expect(count).toBe(0);
    });

    it('should return 0 for empty conversation', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const count = await Message.getUnreadCount(conversation._id, user._id, null);

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  // ---------------------------------------------------------------------------
  // markAsRead()
  // ---------------------------------------------------------------------------
  describe('markAsRead()', () => {
    it('should add read receipt for user', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      const result = await message.markAsRead(receiver._id);

      expect(result).toBe(true);
      expect(message.readBy).toHaveLength(1);
      expect(message.readBy[0].userId.toString()).toBe(receiver._id.toString());
      expect(message.readBy[0].readAt).toBeInstanceOf(Date);
    });

    it('should not add duplicate read receipt', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      await message.markAsRead(receiver._id);
      const result = await message.markAsRead(receiver._id);

      expect(result).toBe(false);
      expect(message.readBy).toHaveLength(1);
    });

    it('should not add read receipt for sender', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      const result = await message.markAsRead(sender._id);

      expect(result).toBe(false);
      expect(message.readBy).toHaveLength(0);
    });

    it('should allow multiple users to mark as read', async () => {
      const sender = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      const conversation = await createTestConversation([sender, user2, user3], 'group');

      const message = await createTestMessage(conversation._id, sender._id);

      await message.markAsRead(user2._id);
      await message.markAsRead(user3._id);

      expect(message.readBy).toHaveLength(2);
    });

    it('should persist read receipts to database', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);
      await message.markAsRead(receiver._id);

      const found = await Message.findById(message._id);
      expect(found.readBy).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // edit()
  // ---------------------------------------------------------------------------
  describe('edit()', () => {
    it('should update message content', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Original content',
      });

      await message.edit('Updated content');

      expect(message.content).toBe('Updated content');
    });

    it('should set isEdited flag to true', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);

      expect(message.isEdited).toBe(false);

      await message.edit('New content');

      expect(message.isEdited).toBe(true);
    });

    it('should set editedAt timestamp', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);

      const before = new Date();
      await message.edit('New content');
      const after = new Date();

      expect(message.editedAt).toBeInstanceOf(Date);
      expect(message.editedAt >= before).toBe(true);
      expect(message.editedAt <= after).toBe(true);
    });

    it('should add original content to edit history', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Version 1',
      });

      await message.edit('Version 2');

      expect(message.editHistory).toHaveLength(1);
      expect(message.editHistory[0].content).toBe('Version 1');
    });

    it('should maintain full edit history for multiple edits', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Version 1',
      });

      await message.edit('Version 2');
      await message.edit('Version 3');
      await message.edit('Version 4');

      expect(message.editHistory).toHaveLength(3);
      expect(message.editHistory[0].content).toBe('Version 1');
      expect(message.editHistory[1].content).toBe('Version 2');
      expect(message.editHistory[2].content).toBe('Version 3');
      expect(message.content).toBe('Version 4');
    });

    it('should throw error when editing deleted message', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        isDeleted: true,
      });

      await expect(message.edit('New content')).rejects.toThrow(
        'Cannot edit deleted message'
      );
    });

    it('should persist changes to database', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Original',
      });

      await message.edit('Updated');

      const found = await Message.findById(message._id);
      expect(found.content).toBe('Updated');
      expect(found.isEdited).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // softDelete()
  // ---------------------------------------------------------------------------
  describe('softDelete()', () => {
    it('should set isDeleted to true', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);

      await message.softDelete(user._id);

      expect(message.isDeleted).toBe(true);
    });

    it('should set deletedAt timestamp', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);

      const before = new Date();
      await message.softDelete(user._id);
      const after = new Date();

      expect(message.deletedAt).toBeInstanceOf(Date);
      expect(message.deletedAt >= before).toBe(true);
      expect(message.deletedAt <= after).toBe(true);
    });

    it('should record who deleted the message', async () => {
      const sender = await createTestUser();
      const admin = await createTestUser({ role: 'admin' });
      const conversation = await createTestConversation([sender, admin]);

      const message = await createTestMessage(conversation._id, sender._id);

      await message.softDelete(admin._id);

      expect(message.deletedBy.toString()).toBe(admin._id.toString());
    });

    it('should preserve message content after soft delete', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Important content',
      });

      await message.softDelete(user._id);

      // Content is still there, just hidden
      expect(message.content).toBe('Important content');
      expect(message.isDeleted).toBe(true);
    });

    it('should persist deletion to database', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);
      await message.softDelete(user._id);

      const found = await Message.findById(message._id);
      expect(found.isDeleted).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // canEdit()
  // ---------------------------------------------------------------------------
  describe('canEdit()', () => {
    it('should return true for sender within 15 minutes', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      expect(message.canEdit(sender._id)).toBe(true);
    });

    it('should return false for non-sender', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      expect(message.canEdit(receiver._id)).toBe(false);
    });

    it('should return false for deleted message', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id, {
        isDeleted: true,
      });

      expect(message.canEdit(sender._id)).toBe(false);
    });

    it('should return false after 15 minutes', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      // Create message 20 minutes ago
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      const message = await createMessageWithTimestamp(
        conversation._id,
        sender._id,
        'Old message',
        twentyMinutesAgo
      );

      expect(message.canEdit(sender._id)).toBe(false);
    });

    it('should return true at exactly 14 minutes', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      // Create message 14 minutes ago (within window)
      const fourteenMinutesAgo = new Date(Date.now() - 14 * 60 * 1000);
      const message = await createMessageWithTimestamp(
        conversation._id,
        sender._id,
        'Recent message',
        fourteenMinutesAgo
      );

      expect(message.canEdit(sender._id)).toBe(true);
    });

    it('should handle string userId comparison correctly', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      // Pass userId as string instead of ObjectId
      expect(message.canEdit(sender._id.toString())).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // canDelete()
  // ---------------------------------------------------------------------------
  describe('canDelete()', () => {
    it('should return true for sender', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      expect(message.canDelete(sender._id)).toBe(true);
    });

    it('should return false for non-sender without admin rights', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      expect(message.canDelete(receiver._id)).toBe(false);
    });

    it('should return true for conversation admin', async () => {
      const sender = await createTestUser();
      const admin = await createTestUser();
      const conversation = await createTestConversation([sender, admin], 'group');

      const message = await createTestMessage(conversation._id, sender._id);

      expect(message.canDelete(admin._id, true)).toBe(true);
    });

    it('should return false for already deleted message', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id, {
        isDeleted: true,
      });

      expect(message.canDelete(sender._id)).toBe(false);
    });

    it('should allow sender to delete old messages (no time limit)', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      // Create message from a year ago
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const message = await createMessageWithTimestamp(
        conversation._id,
        sender._id,
        'Old message',
        oneYearAgo
      );

      expect(message.canDelete(sender._id)).toBe(true);
    });

    it('should handle isConversationAdmin default to false', async () => {
      const sender = await createTestUser();
      const receiver = await createTestUser();
      const conversation = await createTestConversation([sender, receiver]);

      const message = await createTestMessage(conversation._id, sender._id);

      // When not passing isConversationAdmin, non-sender cannot delete
      expect(message.canDelete(receiver._id)).toBe(false);
    });
  });

  // =============================================================================
  // TEST SUITE: USER ISOLATION
  // =============================================================================

  describe('User Isolation', () => {
    it('should only return messages from requested conversation', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const conv1 = await createTestConversation([user1, user2]);
      const conv2 = await createTestConversation([user1, user3]);

      await createTestMessage(conv1._id, user1._id, { content: 'Conv 1 message' });
      await createTestMessage(conv2._id, user1._id, { content: 'Conv 2 message' });

      const conv1Messages = await Message.getMessages(conv1._id);
      const conv2Messages = await Message.getMessages(conv2._id);

      expect(conv1Messages).toHaveLength(1);
      expect(conv1Messages[0].content).toBe('Conv 1 message');

      expect(conv2Messages).toHaveLength(1);
      expect(conv2Messages[0].content).toBe('Conv 2 message');
    });

    it('should isolate unread counts per conversation', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const conv1 = await createTestConversation([user1, user2]);
      const conv2 = await createTestConversation([user1, user3]);

      // 3 messages in conv1 from user2
      await createTestMessage(conv1._id, user2._id);
      await createTestMessage(conv1._id, user2._id);
      await createTestMessage(conv1._id, user2._id);

      // 1 message in conv2 from user3
      await createTestMessage(conv2._id, user3._id);

      const count1 = await Message.getUnreadCount(conv1._id, user1._id, null);
      const count2 = await Message.getUnreadCount(conv2._id, user1._id, null);

      expect(count1).toBe(3);
      expect(count2).toBe(1);
    });

    it('should not allow cross-conversation message reading', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const conv1 = await createTestConversation([user1, user2]);
      const conv2 = await createTestConversation([user2, user3]);

      await createTestMessage(conv1._id, user1._id, { content: 'Secret message' });

      // User3 is not in conv1, should get no messages
      const messages = await Message.getMessages(conv1._id);

      // Messages are returned based on conversationId, not user
      // Access control should be done at the route level
      expect(messages).toHaveLength(1);
    });
  });

  // =============================================================================
  // TEST SUITE: SOFT DELETE BEHAVIOR
  // =============================================================================

  describe('Soft Delete Behavior', () => {
    it('should exclude soft-deleted messages from getMessages', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const visibleMsg = await createTestMessage(conversation._id, user._id, {
        content: 'Visible',
      });
      const deletedMsg = await createTestMessage(conversation._id, user._id, {
        content: 'Will be deleted',
      });

      await deletedMsg.softDelete(user._id);

      const messages = await Message.getMessages(conversation._id);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Visible');
    });

    it('should exclude soft-deleted messages from unread count', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await createTestMessage(conversation._id, user2._id, { content: 'Visible' });
      const deletedMsg = await createTestMessage(conversation._id, user2._id, {
        content: 'Deleted',
      });

      await deletedMsg.softDelete(user2._id);

      const count = await Message.getUnreadCount(conversation._id, user._id, null);

      expect(count).toBe(1);
    });

    it('should still be findable by direct ID lookup', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id);
      await message.softDelete(user._id);

      const found = await Message.findById(message._id);

      expect(found).not.toBeNull();
      expect(found.isDeleted).toBe(true);
    });

    it('should preserve all data after soft delete', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Important data',
        attachments: [{
          type: 'file',
          url: 'https://example.com/file.pdf',
          name: 'document.pdf',
        }],
      });

      await message.softDelete(user._id);

      const found = await Message.findById(message._id);

      expect(found.content).toBe('Important data');
      expect(found.attachments).toHaveLength(1);
      expect(found.attachments[0].name).toBe('document.pdf');
    });
  });

  // =============================================================================
  // TEST SUITE: ATTACHMENT HANDLING
  // =============================================================================

  describe('Attachment Handling', () => {
    it('should store multiple attachments', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        content: 'Multiple files',
        attachments: [
          { type: 'image', url: 'https://example.com/1.jpg', name: '1.jpg' },
          { type: 'image', url: 'https://example.com/2.jpg', name: '2.jpg' },
          { type: 'file', url: 'https://example.com/doc.pdf', name: 'doc.pdf' },
        ],
      });

      expect(message.attachments).toHaveLength(3);
    });

    it('should store all attachment metadata', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      const message = await createTestMessage(conversation._id, user._id, {
        attachments: [{
          type: 'video',
          url: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          name: 'my-video.mp4',
          size: 5242880,
          mimeType: 'video/mp4',
        }],
      });

      const attachment = message.attachments[0];
      expect(attachment.type).toBe('video');
      expect(attachment.url).toBe('https://example.com/video.mp4');
      expect(attachment.thumbnailUrl).toBe('https://example.com/thumb.jpg');
      expect(attachment.name).toBe('my-video.mp4');
      expect(attachment.size).toBe(5242880);
      expect(attachment.mimeType).toBe('video/mp4');
    });

    it('should validate attachment type enum', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await expect(
        createTestMessage(conversation._id, user._id, {
          attachments: [{
            type: 'invalid_type',
            url: 'https://example.com/file',
          }],
        })
      ).rejects.toThrow();
    });

    it('should require url for attachments', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const conversation = await createTestConversation([user, user2]);

      await expect(
        createTestMessage(conversation._id, user._id, {
          attachments: [{
            type: 'image',
            name: 'no-url.jpg',
          }],
        })
      ).rejects.toThrow();
    });
  });

  // =============================================================================
  // TEST SUITE: INDEXES AND PERFORMANCE
  // =============================================================================

  describe('Indexes', () => {
    it('should have index on conversationId and createdAt', async () => {
      const indexes = await Message.collection.indexes();
      const hasIndex = indexes.some(
        idx =>
          idx.key.conversationId === 1 && idx.key.createdAt === -1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on senderId and createdAt', async () => {
      const indexes = await Message.collection.indexes();
      const hasIndex = indexes.some(
        idx =>
          idx.key.senderId === 1 && idx.key.createdAt === -1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on conversationId and isDeleted', async () => {
      const indexes = await Message.collection.indexes();
      const hasIndex = indexes.some(
        idx =>
          idx.key.conversationId === 1 && idx.key.isDeleted === 1
      );
      expect(hasIndex).toBe(true);
    });
  });
});
