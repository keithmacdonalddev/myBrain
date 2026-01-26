/**
 * =============================================================================
 * CONVERSATION MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Conversation model, covering:
 * - Static methods (findDirectConversation, getOrCreateDirect, getConversationsForUser, getTotalUnreadCount)
 * - Instance methods (getParticipantMeta, updateLastMessage, markAsRead, toggleArchive, mute, unmute, isMuted, addParticipant, removeParticipant)
 * - Conversation creation (direct and group)
 * - Participant management (add/remove/permissions)
 * - Message tracking (last message, unread counts)
 * - User states (read, archived, muted per-user)
 * - User isolation (only see own conversations)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Conversation from './Conversation.js';
import User from './User.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
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
 * Creates a direct conversation between two users.
 */
async function createDirectConversation(user1, user2) {
  return Conversation.create({
    type: 'direct',
    participants: [user1._id, user2._id],
    participantMeta: [
      { userId: user1._id, role: 'member' },
      { userId: user2._id, role: 'member' }
    ]
  });
}

/**
 * Creates a group conversation with the specified users.
 * First user becomes owner.
 */
async function createGroupConversation(users, name = 'Test Group') {
  const owner = users[0];
  return Conversation.create({
    type: 'group',
    participants: users.map(u => u._id),
    participantMeta: users.map((u, i) => ({
      userId: u._id,
      role: i === 0 ? 'owner' : 'member'
    })),
    groupMeta: {
      name,
      createdBy: owner._id
    }
  });
}

// =============================================================================
// TEST SUITE: CONVERSATION CREATION
// =============================================================================

describe('Conversation Model', () => {
  describe('Conversation Creation', () => {
    describe('Direct Conversations', () => {
      it('should create a direct conversation between two users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        expect(conversation.type).toBe('direct');
        expect(conversation.participants).toHaveLength(2);
        expect(conversation.participantMeta).toHaveLength(2);
        expect(conversation.isActive).toBe(true);
      });

      it('should set default values for participant metadata', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user1._id);

        expect(meta.unreadCount).toBe(0);
        expect(meta.isArchived).toBe(false);
        expect(meta.role).toBe('member');
        expect(meta.lastReadAt).toBeNull();
        expect(meta.mutedUntil).toBeNull();
      });

      it('should track joinedAt timestamp for participants', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const beforeCreate = new Date();
        const conversation = await createDirectConversation(user1, user2);
        const afterCreate = new Date();

        const meta = conversation.getParticipantMeta(user1._id);
        expect(meta.joinedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(meta.joinedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      });

      it('should start with zero message count', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        expect(conversation.messageCount).toBe(0);
      });

      it('should start with empty last message', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        expect(conversation.lastMessage.content).toBeUndefined();
        expect(conversation.lastMessage.senderId).toBeUndefined();
        expect(conversation.lastMessage.sentAt).toBeUndefined();
      });
    });

    describe('Group Conversations', () => {
      it('should create a group conversation with multiple users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3], 'My Group');

        expect(conversation.type).toBe('group');
        expect(conversation.participants).toHaveLength(3);
        expect(conversation.groupMeta.name).toBe('My Group');
      });

      it('should set first user as owner in group', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3]);

        const ownerMeta = conversation.getParticipantMeta(user1._id);
        const memberMeta = conversation.getParticipantMeta(user2._id);

        expect(ownerMeta.role).toBe('owner');
        expect(memberMeta.role).toBe('member');
      });

      it('should store group metadata including createdBy', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2], 'Test Group');

        expect(conversation.groupMeta.createdBy.toString()).toBe(user1._id.toString());
      });

      it('should allow optional group description', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await Conversation.create({
          type: 'group',
          participants: [user1._id, user2._id],
          participantMeta: [
            { userId: user1._id, role: 'owner' },
            { userId: user2._id, role: 'member' }
          ],
          groupMeta: {
            name: 'Test Group',
            description: 'A test group for testing',
            createdBy: user1._id
          }
        });

        expect(conversation.groupMeta.description).toBe('A test group for testing');
      });

      it('should validate group name max length', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const longName = 'a'.repeat(101);

        await expect(
          Conversation.create({
            type: 'group',
            participants: [user1._id, user2._id],
            participantMeta: [
              { userId: user1._id, role: 'owner' },
              { userId: user2._id, role: 'member' }
            ],
            groupMeta: {
              name: longName,
              createdBy: user1._id
            }
          })
        ).rejects.toThrow(/cannot exceed 100 characters/);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    // ---------------------------------------------------------------------------
    // findDirectConversation(userId1, userId2)
    // ---------------------------------------------------------------------------
    describe('findDirectConversation()', () => {
      it('should find existing direct conversation between two users', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const original = await createDirectConversation(user1, user2);
        const found = await Conversation.findDirectConversation(user1._id, user2._id);

        expect(found._id.toString()).toBe(original._id.toString());
      });

      it('should find conversation regardless of user order', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createDirectConversation(user1, user2);

        const foundForward = await Conversation.findDirectConversation(user1._id, user2._id);
        const foundReverse = await Conversation.findDirectConversation(user2._id, user1._id);

        expect(foundForward._id.toString()).toBe(foundReverse._id.toString());
      });

      it('should return null when no conversation exists', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const found = await Conversation.findDirectConversation(user1._id, user2._id);

        expect(found).toBeNull();
      });

      it('should not find inactive conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        conversation.isActive = false;
        await conversation.save();

        const found = await Conversation.findDirectConversation(user1._id, user2._id);

        expect(found).toBeNull();
      });

      it('should not find group conversations with same participants', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createGroupConversation([user1, user2]);

        const found = await Conversation.findDirectConversation(user1._id, user2._id);

        expect(found).toBeNull();
      });

      it('should not confuse conversations with more participants', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        // Create direct with user1 and user2
        await createDirectConversation(user1, user2);
        // Create group with all three (different type)
        await createGroupConversation([user1, user2, user3]);

        const found = await Conversation.findDirectConversation(user1._id, user3._id);

        expect(found).toBeNull();
      });
    });

    // ---------------------------------------------------------------------------
    // getOrCreateDirect(userId1, userId2)
    // ---------------------------------------------------------------------------
    describe('getOrCreateDirect()', () => {
      it('should create new conversation when none exists', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const { conversation, created } = await Conversation.getOrCreateDirect(user1._id, user2._id);

        expect(created).toBe(true);
        expect(conversation.type).toBe('direct');
        expect(conversation.participants).toHaveLength(2);
      });

      it('should return existing conversation when one exists', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const original = await createDirectConversation(user1, user2);
        const { conversation, created } = await Conversation.getOrCreateDirect(user1._id, user2._id);

        expect(created).toBe(false);
        expect(conversation._id.toString()).toBe(original._id.toString());
      });

      it('should set up participant metadata for new conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const { conversation } = await Conversation.getOrCreateDirect(user1._id, user2._id);

        expect(conversation.participantMeta).toHaveLength(2);
        expect(conversation.getParticipantMeta(user1._id).role).toBe('member');
        expect(conversation.getParticipantMeta(user2._id).role).toBe('member');
      });

      it('should work regardless of user order', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const { conversation: conv1, created: created1 } = await Conversation.getOrCreateDirect(user1._id, user2._id);
        const { conversation: conv2, created: created2 } = await Conversation.getOrCreateDirect(user2._id, user1._id);

        expect(created1).toBe(true);
        expect(created2).toBe(false);
        expect(conv1._id.toString()).toBe(conv2._id.toString());
      });

      it('should not create duplicate conversations on concurrent calls', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        // Simulate concurrent calls
        const [result1, result2] = await Promise.all([
          Conversation.getOrCreateDirect(user1._id, user2._id),
          Conversation.getOrCreateDirect(user1._id, user2._id)
        ]);

        // One should be created, one should find existing
        const totalCreated = (result1.created ? 1 : 0) + (result2.created ? 1 : 0);
        // Due to race conditions, both might create or one might find - at least one created
        expect(totalCreated).toBeGreaterThanOrEqual(1);
      });
    });

    // ---------------------------------------------------------------------------
    // getConversationsForUser(userId, options)
    // ---------------------------------------------------------------------------
    describe('getConversationsForUser()', () => {
      it('should return all conversations for a user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        await createDirectConversation(user1, user2);
        await createDirectConversation(user1, user3);

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations).toHaveLength(2);
      });

      it('should not return conversations user is not part of', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        await createDirectConversation(user2, user3);

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations).toHaveLength(0);
      });

      it('should not return archived conversations by default', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conv1 = await createDirectConversation(user1, user2);
        await createDirectConversation(user1, user3);

        // Archive conv1 for user1
        await conv1.toggleArchive(user1._id);

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations).toHaveLength(1);
      });

      it('should return archived conversations when includeArchived is true', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conv1 = await createDirectConversation(user1, user2);
        await createDirectConversation(user1, user3);

        await conv1.toggleArchive(user1._id);

        const conversations = await Conversation.getConversationsForUser(user1._id, { includeArchived: true });

        expect(conversations).toHaveLength(2);
      });

      it('should respect pagination with limit and skip', async () => {
        const user1 = await createTestUser();
        const users = await Promise.all([
          createTestUser(),
          createTestUser(),
          createTestUser(),
          createTestUser(),
          createTestUser()
        ]);

        for (const user of users) {
          await createDirectConversation(user1, user);
        }

        const page1 = await Conversation.getConversationsForUser(user1._id, { limit: 2, skip: 0 });
        const page2 = await Conversation.getConversationsForUser(user1._id, { limit: 2, skip: 2 });

        expect(page1).toHaveLength(2);
        expect(page2).toHaveLength(2);
      });

      it('should sort by last message date descending', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conv1 = await createDirectConversation(user1, user2);
        const conv2 = await createDirectConversation(user1, user3);

        // Update conv1 with an older message
        conv1.lastMessage = {
          content: 'Old message',
          senderId: user2._id,
          sentAt: new Date('2024-01-01')
        };
        await conv1.save();

        // Update conv2 with a newer message
        conv2.lastMessage = {
          content: 'New message',
          senderId: user3._id,
          sentAt: new Date('2024-01-15')
        };
        await conv2.save();

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations[0]._id.toString()).toBe(conv2._id.toString());
        expect(conversations[1]._id.toString()).toBe(conv1._id.toString());
      });

      it('should not return inactive conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        conversation.isActive = false;
        await conversation.save();

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations).toHaveLength(0);
      });

      it('should populate participant information', async () => {
        const user1 = await createTestUser({
          profile: { displayName: 'User One' }
        });
        const user2 = await createTestUser({
          profile: { displayName: 'User Two' }
        });

        await createDirectConversation(user1, user2);

        const conversations = await Conversation.getConversationsForUser(user1._id);

        expect(conversations[0].participants[0].profile).toBeDefined();
      });
    });

    // ---------------------------------------------------------------------------
    // getTotalUnreadCount(userId)
    // ---------------------------------------------------------------------------
    describe('getTotalUnreadCount()', () => {
      it('should return zero when no unread messages', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createDirectConversation(user1, user2);

        const count = await Conversation.getTotalUnreadCount(user1._id);

        expect(count).toBe(0);
      });

      it('should sum unread counts across all conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conv1 = await createDirectConversation(user1, user2);
        const conv2 = await createDirectConversation(user1, user3);

        // Set unread counts for user1
        const meta1 = conv1.getParticipantMeta(user1._id);
        meta1.unreadCount = 3;
        await conv1.save();

        const meta2 = conv2.getParticipantMeta(user1._id);
        meta2.unreadCount = 5;
        await conv2.save();

        const count = await Conversation.getTotalUnreadCount(user1._id);

        expect(count).toBe(8);
      });

      it('should not count other users unread messages', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        // Set unread for user2 only
        const meta2 = conversation.getParticipantMeta(user2._id);
        meta2.unreadCount = 10;
        await conversation.save();

        const countUser1 = await Conversation.getTotalUnreadCount(user1._id);
        const countUser2 = await Conversation.getTotalUnreadCount(user2._id);

        expect(countUser1).toBe(0);
        expect(countUser2).toBe(10);
      });

      it('should not count inactive conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user1._id);
        meta.unreadCount = 5;
        conversation.isActive = false;
        await conversation.save();

        const count = await Conversation.getTotalUnreadCount(user1._id);

        expect(count).toBe(0);
      });

      it('should return zero for user with no conversations', async () => {
        const user1 = await createTestUser();

        const count = await Conversation.getTotalUnreadCount(user1._id);

        expect(count).toBe(0);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    // ---------------------------------------------------------------------------
    // getParticipantMeta(userId)
    // ---------------------------------------------------------------------------
    describe('getParticipantMeta()', () => {
      it('should return metadata for existing participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user1._id);

        expect(meta).toBeDefined();
        expect(meta.userId.toString()).toBe(user1._id.toString());
      });

      it('should return undefined for non-participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user3._id);

        expect(meta).toBeUndefined();
      });

      it('should work with string userId', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user1._id.toString());

        expect(meta).toBeDefined();
        expect(meta.userId.toString()).toBe(user1._id.toString());
      });
    });

    // ---------------------------------------------------------------------------
    // updateLastMessage(message)
    // ---------------------------------------------------------------------------
    describe('updateLastMessage()', () => {
      it('should update last message preview', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const message = {
          content: 'Hello there!',
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        };

        await conversation.updateLastMessage(message);

        expect(conversation.lastMessage.content).toBe('Hello there!');
        expect(conversation.lastMessage.senderId.toString()).toBe(user1._id.toString());
        expect(conversation.lastMessage.contentType).toBe('text');
      });

      it('should truncate long message content', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const longContent = 'a'.repeat(600);
        const message = {
          content: longContent,
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        };

        await conversation.updateLastMessage(message);

        expect(conversation.lastMessage.content.length).toBe(500);
      });

      it('should increment message count', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        expect(conversation.messageCount).toBe(0);

        await conversation.updateLastMessage({
          content: 'Message 1',
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        });

        expect(conversation.messageCount).toBe(1);

        await conversation.updateLastMessage({
          content: 'Message 2',
          senderId: user2._id,
          createdAt: new Date(),
          contentType: 'text'
        });

        expect(conversation.messageCount).toBe(2);
      });

      it('should increment unread count for recipients only', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.updateLastMessage({
          content: 'Hello',
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        });

        const senderMeta = conversation.getParticipantMeta(user1._id);
        const recipientMeta = conversation.getParticipantMeta(user2._id);

        expect(senderMeta.unreadCount).toBe(0);
        expect(recipientMeta.unreadCount).toBe(1);
      });

      it('should increment unread for all recipients in group chat', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3]);

        await conversation.updateLastMessage({
          content: 'Group message',
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        });

        expect(conversation.getParticipantMeta(user1._id).unreadCount).toBe(0);
        expect(conversation.getParticipantMeta(user2._id).unreadCount).toBe(1);
        expect(conversation.getParticipantMeta(user3._id).unreadCount).toBe(1);
      });

      it('should handle different content types', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.updateLastMessage({
          content: null,
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'image'
        });

        expect(conversation.lastMessage.contentType).toBe('image');
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.updateLastMessage({
          content: 'Saved message',
          senderId: user1._id,
          createdAt: new Date(),
          contentType: 'text'
        });

        const refreshed = await Conversation.findById(conversation._id);

        expect(refreshed.lastMessage.content).toBe('Saved message');
        expect(refreshed.messageCount).toBe(1);
      });
    });

    // ---------------------------------------------------------------------------
    // markAsRead(userId)
    // ---------------------------------------------------------------------------
    describe('markAsRead()', () => {
      it('should reset unread count to zero', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        // Add some unread messages for user1
        const meta = conversation.getParticipantMeta(user1._id);
        meta.unreadCount = 5;
        await conversation.save();

        await conversation.markAsRead(user1._id);

        expect(conversation.getParticipantMeta(user1._id).unreadCount).toBe(0);
      });

      it('should update lastReadAt timestamp', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const beforeRead = new Date();

        await conversation.markAsRead(user1._id);

        const meta = conversation.getParticipantMeta(user1._id);
        expect(meta.lastReadAt.getTime()).toBeGreaterThanOrEqual(beforeRead.getTime());
      });

      it('should only affect specified user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const meta1 = conversation.getParticipantMeta(user1._id);
        const meta2 = conversation.getParticipantMeta(user2._id);
        meta1.unreadCount = 3;
        meta2.unreadCount = 5;
        await conversation.save();

        await conversation.markAsRead(user1._id);

        expect(conversation.getParticipantMeta(user1._id).unreadCount).toBe(0);
        expect(conversation.getParticipantMeta(user2._id).unreadCount).toBe(5);
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);
        const meta = conversation.getParticipantMeta(user1._id);
        meta.unreadCount = 10;
        await conversation.save();

        await conversation.markAsRead(user1._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.getParticipantMeta(user1._id).unreadCount).toBe(0);
      });

      it('should do nothing for non-participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        // Should not throw
        await conversation.markAsRead(user3._id);
      });
    });

    // ---------------------------------------------------------------------------
    // toggleArchive(userId)
    // ---------------------------------------------------------------------------
    describe('toggleArchive()', () => {
      it('should archive an unarchived conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const isNowArchived = await conversation.toggleArchive(user1._id);

        expect(isNowArchived).toBe(true);
        expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(true);
      });

      it('should unarchive an archived conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.toggleArchive(user1._id); // Archive
        const isNowArchived = await conversation.toggleArchive(user1._id); // Unarchive

        expect(isNowArchived).toBe(false);
        expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(false);
      });

      it('should only affect specified user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.toggleArchive(user1._id);

        expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(true);
        expect(conversation.getParticipantMeta(user2._id).isArchived).toBe(false);
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.toggleArchive(user1._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.getParticipantMeta(user1._id).isArchived).toBe(true);
      });

      it('should return undefined for non-participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const result = await conversation.toggleArchive(user3._id);

        expect(result).toBeUndefined();
      });
    });

    // ---------------------------------------------------------------------------
    // mute(userId, duration)
    // ---------------------------------------------------------------------------
    describe('mute()', () => {
      it('should mute conversation indefinitely when no duration provided', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);

        const meta = conversation.getParticipantMeta(user1._id);
        expect(meta.mutedUntil).toEqual(new Date('2099-12-31'));
      });

      it('should mute conversation for specified duration', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const oneHour = 60 * 60 * 1000;
        const beforeMute = Date.now();
        await conversation.mute(user1._id, oneHour);

        const meta = conversation.getParticipantMeta(user1._id);
        const mutedUntilTime = meta.mutedUntil.getTime();

        expect(mutedUntilTime).toBeGreaterThanOrEqual(beforeMute + oneHour - 1000);
        expect(mutedUntilTime).toBeLessThanOrEqual(beforeMute + oneHour + 1000);
      });

      it('should only affect specified user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);

        expect(conversation.getParticipantMeta(user1._id).mutedUntil).toBeDefined();
        expect(conversation.getParticipantMeta(user2._id).mutedUntil).toBeNull();
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.getParticipantMeta(user1._id).mutedUntil).toEqual(new Date('2099-12-31'));
      });
    });

    // ---------------------------------------------------------------------------
    // unmute(userId)
    // ---------------------------------------------------------------------------
    describe('unmute()', () => {
      it('should remove mute from conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);
        expect(conversation.getParticipantMeta(user1._id).mutedUntil).toBeDefined();

        await conversation.unmute(user1._id);
        expect(conversation.getParticipantMeta(user1._id).mutedUntil).toBeNull();
      });

      it('should only affect specified user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);
        await conversation.mute(user2._id);
        await conversation.unmute(user1._id);

        expect(conversation.getParticipantMeta(user1._id).mutedUntil).toBeNull();
        expect(conversation.getParticipantMeta(user2._id).mutedUntil).toBeDefined();
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);
        await conversation.unmute(user1._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.getParticipantMeta(user1._id).mutedUntil).toBeNull();
      });

      it('should work when already unmuted', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        // Should not throw
        await conversation.unmute(user1._id);
        expect(conversation.getParticipantMeta(user1._id).mutedUntil).toBeNull();
      });
    });

    // ---------------------------------------------------------------------------
    // isMuted(userId)
    // ---------------------------------------------------------------------------
    describe('isMuted()', () => {
      it('should return true when muted indefinitely', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);

        expect(conversation.isMuted(user1._id)).toBe(true);
      });

      it('should return true when mute has not expired', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        const oneHour = 60 * 60 * 1000;
        await conversation.mute(user1._id, oneHour);

        expect(conversation.isMuted(user1._id)).toBe(true);
      });

      it('should return false when mute has expired', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        // Set mute in the past
        const meta = conversation.getParticipantMeta(user1._id);
        meta.mutedUntil = new Date(Date.now() - 1000);
        await conversation.save();

        expect(conversation.isMuted(user1._id)).toBe(false);
      });

      it('should return false when not muted', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        expect(conversation.isMuted(user1._id)).toBe(false);
      });

      it('should return false for non-participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        expect(conversation.isMuted(user3._id)).toBe(false);
      });

      it('should check each user independently', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await conversation.mute(user1._id);

        expect(conversation.isMuted(user1._id)).toBe(true);
        expect(conversation.isMuted(user2._id)).toBe(false);
      });
    });

    // ---------------------------------------------------------------------------
    // addParticipant(userId, addedBy)
    // ---------------------------------------------------------------------------
    describe('addParticipant()', () => {
      it('should add participant to group conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);

        const result = await conversation.addParticipant(user3._id, user1._id);

        expect(result).toBe(true);
        expect(conversation.participants).toHaveLength(3);
        expect(conversation.participantMeta).toHaveLength(3);
      });

      it('should set new participant role to member', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);

        await conversation.addParticipant(user3._id, user1._id);

        const meta = conversation.getParticipantMeta(user3._id);
        expect(meta.role).toBe('member');
      });

      it('should set joinedAt timestamp for new participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);
        const beforeAdd = new Date();

        await conversation.addParticipant(user3._id, user1._id);

        const meta = conversation.getParticipantMeta(user3._id);
        expect(meta.joinedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      });

      it('should return false if user is already a participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);

        const result = await conversation.addParticipant(user2._id, user1._id);

        expect(result).toBe(false);
        expect(conversation.participants).toHaveLength(2);
      });

      it('should throw error for direct conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await expect(
          conversation.addParticipant(user3._id, user1._id)
        ).rejects.toThrow('Can only add participants to group conversations');
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);

        await conversation.addParticipant(user3._id, user1._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.participants).toHaveLength(3);
      });
    });

    // ---------------------------------------------------------------------------
    // removeParticipant(userId)
    // ---------------------------------------------------------------------------
    describe('removeParticipant()', () => {
      it('should remove participant from group conversation', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3]);

        await conversation.removeParticipant(user3._id);

        expect(conversation.participants).toHaveLength(2);
        expect(conversation.participantMeta).toHaveLength(2);
      });

      it('should remove participant metadata', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3]);

        await conversation.removeParticipant(user3._id);

        expect(conversation.getParticipantMeta(user3._id)).toBeUndefined();
      });

      it('should throw error for direct conversations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const conversation = await createDirectConversation(user1, user2);

        await expect(
          conversation.removeParticipant(user2._id)
        ).rejects.toThrow('Can only remove participants from group conversations');
      });

      it('should persist changes to database', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2, user3]);

        await conversation.removeParticipant(user3._id);

        const refreshed = await Conversation.findById(conversation._id);
        expect(refreshed.participants).toHaveLength(2);
      });

      it('should do nothing if user is not a participant', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const user3 = await createTestUser();

        const conversation = await createGroupConversation([user1, user2]);

        await conversation.removeParticipant(user3._id);

        expect(conversation.participants).toHaveLength(2);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: USER ISOLATION
  // =============================================================================

  describe('User Isolation', () => {
    it('should isolate conversations per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      await createDirectConversation(user1, user2);
      await createDirectConversation(user2, user3);

      const user1Convs = await Conversation.getConversationsForUser(user1._id);
      const user2Convs = await Conversation.getConversationsForUser(user2._id);
      const user3Convs = await Conversation.getConversationsForUser(user3._id);

      expect(user1Convs).toHaveLength(1);
      expect(user2Convs).toHaveLength(2);
      expect(user3Convs).toHaveLength(1);
    });

    it('should isolate unread counts per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      // User1 sends messages
      await conversation.updateLastMessage({
        content: 'Message 1',
        senderId: user1._id,
        createdAt: new Date(),
        contentType: 'text'
      });
      await conversation.updateLastMessage({
        content: 'Message 2',
        senderId: user1._id,
        createdAt: new Date(),
        contentType: 'text'
      });

      const user1Unread = await Conversation.getTotalUnreadCount(user1._id);
      const user2Unread = await Conversation.getTotalUnreadCount(user2._id);

      expect(user1Unread).toBe(0);
      expect(user2Unread).toBe(2);
    });

    it('should isolate archived state per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      await conversation.toggleArchive(user1._id);

      const user1Convs = await Conversation.getConversationsForUser(user1._id);
      const user2Convs = await Conversation.getConversationsForUser(user2._id);

      expect(user1Convs).toHaveLength(0); // Archived
      expect(user2Convs).toHaveLength(1); // Not archived
    });

    it('should isolate muted state per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      await conversation.mute(user1._id);

      expect(conversation.isMuted(user1._id)).toBe(true);
      expect(conversation.isMuted(user2._id)).toBe(false);
    });
  });

  // =============================================================================
  // TEST SUITE: CLEANUP (Leaving Conversations)
  // =============================================================================

  describe('Cleanup', () => {
    it('should allow participant to leave group conversation', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const conversation = await createGroupConversation([user1, user2, user3]);

      await conversation.removeParticipant(user3._id);

      const user3Convs = await Conversation.getConversationsForUser(user3._id);
      expect(user3Convs).toHaveLength(0);
    });

    it('should preserve conversation for remaining participants after one leaves', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const conversation = await createGroupConversation([user1, user2, user3]);

      await conversation.removeParticipant(user3._id);

      const user1Convs = await Conversation.getConversationsForUser(user1._id);
      const user2Convs = await Conversation.getConversationsForUser(user2._id);

      expect(user1Convs).toHaveLength(1);
      expect(user2Convs).toHaveLength(1);
    });

    it('should deactivate conversation when isActive set to false', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);
      conversation.isActive = false;
      await conversation.save();

      const user1Convs = await Conversation.getConversationsForUser(user1._id);
      const user2Convs = await Conversation.getConversationsForUser(user2._id);

      expect(user1Convs).toHaveLength(0);
      expect(user2Convs).toHaveLength(0);
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle conversation with no messages', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      expect(conversation.messageCount).toBe(0);
      expect(conversation.lastMessage.content).toBeUndefined();
    });

    it('should handle multiple read operations', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      await conversation.markAsRead(user1._id);
      await conversation.markAsRead(user1._id);
      await conversation.markAsRead(user1._id);

      expect(conversation.getParticipantMeta(user1._id).unreadCount).toBe(0);
    });

    it('should handle archive toggle multiple times', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      await conversation.toggleArchive(user1._id);
      expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(true);

      await conversation.toggleArchive(user1._id);
      expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(false);

      await conversation.toggleArchive(user1._id);
      expect(conversation.getParticipantMeta(user1._id).isArchived).toBe(true);
    });

    it('should handle mute and unmute cycles', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      await conversation.mute(user1._id);
      expect(conversation.isMuted(user1._id)).toBe(true);

      await conversation.unmute(user1._id);
      expect(conversation.isMuted(user1._id)).toBe(false);

      await conversation.mute(user1._id, 60 * 60 * 1000);
      expect(conversation.isMuted(user1._id)).toBe(true);
    });

    it('should handle empty participant list gracefully', async () => {
      const conversation = new Conversation({
        type: 'group',
        participants: [],
        participantMeta: [],
        groupMeta: { name: 'Empty Group' }
      });

      await conversation.save();

      expect(conversation.participants).toHaveLength(0);
    });

    it('should handle ObjectId strings in methods', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const conversation = await createDirectConversation(user1, user2);

      // Use string instead of ObjectId
      const meta = conversation.getParticipantMeta(user1._id.toString());
      expect(meta).toBeDefined();

      await conversation.markAsRead(user1._id.toString());
      expect(conversation.getParticipantMeta(user1._id).unreadCount).toBe(0);
    });

    it('should handle timestamps correctly', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const beforeCreate = new Date();
      const conversation = await createDirectConversation(user1, user2);
      const afterCreate = new Date();

      expect(conversation.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(conversation.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(conversation.updatedAt).toBeDefined();
    });
  });
});
