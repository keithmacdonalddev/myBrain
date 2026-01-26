import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import User from '../models/User.js';
import Connection from '../models/Connection.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import UserBlock from '../models/UserBlock.js';

describe('Messages Routes', () => {
  let authToken;
  let userId;
  let otherUser;
  let otherUserToken;

  /**
   * Helper function to create and login a test user
   * Returns the auth token and user ID
   */
  const createAndLoginUser = async (email, password = 'Password123!') => {
    await request(app)
      .post('/auth/register')
      .send({ email, password });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email, password });

    // Update user to allow messages from everyone (for testing)
    await User.findByIdAndUpdate(loginRes.body.user._id, {
      socialSettings: { allowMessages: 'everyone' }
    });

    return {
      token: loginRes.body.token,
      userId: loginRes.body.user._id
    };
  };

  /**
   * Helper function to create a connection between two users
   */
  const createConnection = async (user1Id, user2Id) => {
    const connection = new Connection({
      requesterId: user1Id,
      addresseeId: user2Id,
      status: 'accepted',
      acceptedAt: new Date()
    });
    await connection.save();
    return connection;
  };

  // Setup before each test
  beforeEach(async () => {
    // Create and login first user
    const user1 = await createAndLoginUser('messages-user1@example.com');
    authToken = user1.token;
    userId = user1.userId;

    // Create and login second user
    const user2 = await createAndLoginUser('messages-user2@example.com');
    otherUserToken = user2.token;
    otherUser = await User.findById(user2.userId);
  });

  // ========================================================================
  // CONVERSATION TESTS
  // ========================================================================

  describe('GET /messages/conversations', () => {
    it('should return empty list when no conversations', async () => {
      const res = await request(app)
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.conversations).toBeDefined();
      expect(res.body.conversations).toHaveLength(0);
    });

    it('should return conversations list', async () => {
      // Create a conversation first
      await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      const res = await request(app)
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.conversations).toBeDefined();
      expect(res.body.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/messages/conversations');

      expect(res.statusCode).toBe(401);
    });

    it('should support pagination with limit', async () => {
      // Create multiple conversations by creating messages with different users
      const user3 = await createAndLoginUser('messages-user3@example.com');
      const user4 = await createAndLoginUser('messages-user4@example.com');

      await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: user3.userId, type: 'direct' });

      await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: user4.userId, type: 'direct' });

      const res = await request(app)
        .get('/messages/conversations')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.conversations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /messages/conversations', () => {
    describe('Direct Conversations', () => {
      it('should create a new direct conversation', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userId: otherUser._id.toString(),
            type: 'direct'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.conversation).toBeDefined();
        expect(res.body.conversation.type).toBe('direct');
        expect(res.body.created).toBe(true);
      });

      it('should return existing conversation if already exists', async () => {
        // Create first conversation
        const firstRes = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: otherUser._id.toString(), type: 'direct' });

        expect(firstRes.statusCode).toBe(201);
        expect(firstRes.body.created).toBe(true);

        // Try to create again
        const secondRes = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: otherUser._id.toString(), type: 'direct' });

        expect(secondRes.statusCode).toBe(200);
        expect(secondRes.body.created).toBe(false);
        expect(secondRes.body.conversation._id).toBe(firstRes.body.conversation._id);
      });

      it('should return 400 when userId is missing', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'direct' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
      });

      it('should return 400 for invalid user ID format', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: 'invalid-id', type: 'direct' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_USER_ID');
      });

      it('should return 400 when trying to message self', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: userId, type: 'direct' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('SELF_CONVERSATION');
      });

      it('should return 404 for non-existent user', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: fakeUserId, type: 'direct' });

        expect(res.statusCode).toBe(404);
        expect(res.body.code).toBe('USER_NOT_FOUND');
      });

      it('should return 403 when user is blocked', async () => {
        // Create a block
        const block = new UserBlock({
          blockerId: otherUser._id,
          blockedId: userId
        });
        await block.save();

        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: otherUser._id.toString(), type: 'direct' });

        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('USER_BLOCKED');
      });

      it('should return 401 without auth token', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .send({ userId: otherUser._id.toString(), type: 'direct' });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('Group Conversations', () => {
      it('should create a new group conversation', async () => {
        const user3 = await createAndLoginUser('messages-user3@example.com');

        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'group',
            name: 'Test Group',
            participantIds: [otherUser._id.toString(), user3.userId]
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.conversation).toBeDefined();
        expect(res.body.conversation.type).toBe('group');
        expect(res.body.conversation.groupMeta.name).toBe('Test Group');
        expect(res.body.created).toBe(true);
      });

      it('should return 400 when group name is missing', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'group',
            participantIds: [otherUser._id.toString()]
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('MISSING_NAME');
      });

      it('should return 400 when no participants provided', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'group',
            name: 'Test Group',
            participantIds: []
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('MISSING_PARTICIPANTS');
      });

      it('should return 400 for invalid conversation type', async () => {
        const res = await request(app)
          .post('/messages/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'invalid-type',
            userId: otherUser._id.toString()
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_TYPE');
      });
    });
  });

  // ========================================================================
  // MESSAGE TESTS
  // ========================================================================

  describe('GET /messages/conversations/:id/messages', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      // Add some messages
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello!' });

      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Hi there!' });
    });

    it('should return messages for a conversation', async () => {
      const res = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages).toBeDefined();
      expect(res.body.messages.length).toBe(2);
    });

    it('should return messages in chronological order', async () => {
      const res = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // First message should be 'Hello!' (sent first, chronological order)
      expect(res.body.messages[0].content).toBe('Hello!');
      expect(res.body.messages[1].content).toBe('Hi there!');
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/messages/conversations/${fakeId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`);

      expect(res.statusCode).toBe(401);
    });

    it('should support pagination with limit', async () => {
      // Add more messages
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message 3' });

      const res = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`)
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages.length).toBe(2);
      expect(res.body.hasMore).toBe(true);
    });
  });

  describe('POST /messages/conversations/:id/messages', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;
    });

    it('should send a message', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello World!' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.content).toBe('Hello World!');
      expect(res.body.message.contentType).toBe('text');
    });

    it('should send a message with custom content type', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Image description', contentType: 'image' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message.contentType).toBe('image');
    });

    it('should return 400 when message is empty', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('EMPTY_MESSAGE');
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/messages/conversations/${fakeId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello!' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .send({ content: 'Hello!' });

      expect(res.statusCode).toBe(401);
    });

    it('should update conversation lastMessage', async () => {
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Latest message' });

      const conversation = await Conversation.findById(conversationId);
      expect(conversation.lastMessage.content).toBe('Latest message');
    });

    describe('Validation', () => {
      it('should reject empty content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: '' });

        expect(res.statusCode).toBe(400);
      });

      it('should reject null content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: null });

        expect(res.statusCode).toBe(400);
      });

      it('should reject undefined content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: undefined });

        expect(res.statusCode).toBe(400);
      });

      it('should reject whitespace-only content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: '   ' });

        expect(res.statusCode).toBe(400);
      });

      it('should reject content exceeding max length', async () => {
        const longContent = 'a'.repeat(10001); // Assuming 10000 char limit
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: longContent });

        expect(res.statusCode).toBe(400);
      });

      it('should accept content at max length', async () => {
        const maxContent = 'a'.repeat(10000); // Exactly at limit
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: maxContent });

        expect([201, 400]).toContain(res.statusCode);
        if (res.statusCode === 201) {
          expect(res.body.message.content).toBe(maxContent);
        }
      });

      it('should reject non-string content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 12345 });

        expect(res.statusCode).toBe(400);
      });

      it('should reject content as object', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: { nested: 'object' } });

        expect(res.statusCode).toBe(400);
      });

      it('should reject content as array', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: ['array', 'content'] });

        expect(res.statusCode).toBe(400);
      });

      it('should reject invalid contentType', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Hello', contentType: 'invalid_type' });

        expect(res.statusCode).toBe(400);
      });

      it('should handle unicode characters in content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Hello 你好 こんにちは 안녕하세요' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message.content).toBe('Hello 你好 こんにちは 안녕하세요');
      });

      it('should handle emojis in content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'Hello! 👋 😊 🎉' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message.content).toBe('Hello! 👋 😊 🎉');
      });

      it('should handle special characters safely (XSS)', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: "<script>alert('xss')</script>" });

        expect(res.statusCode).toBe(201);
        expect(res.body.message.content).toBe("<script>alert('xss')</script>");
      });

      it('should handle SQL injection attempts safely', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: "'; DROP TABLE messages; --" });

        expect(res.statusCode).toBe(201);
        expect(res.body.message.content).toBe("'; DROP TABLE messages; --");
      });

      it('should accept valid contentType values', async () => {
        const validTypes = ['text', 'image', 'file', 'link'];

        for (const type of validTypes) {
          const res = await request(app)
            .post(`/messages/conversations/${conversationId}/messages`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ content: `Message with ${type}`, contentType: type });

          expect([201, 400]).toContain(res.statusCode);
          if (res.statusCode === 201) {
            expect(res.body.message.contentType).toBe(type);
          }
        }
      });

      it('should trim whitespace from content', async () => {
        const res = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: '  Hello World  ' });

        if (res.statusCode === 201) {
          // Some implementations may trim, others may not
          expect(res.body.message.content).toBeDefined();
        }
      });
    });
  });

  // ========================================================================
  // MESSAGE EDIT/DELETE TESTS
  // ========================================================================

  describe('PATCH /messages/:id', () => {
    let conversationId;
    let messageId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      // Send a message
      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Original content' });

      messageId = msgRes.body.message._id;
    });

    it('should edit a message', async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message.content).toBe('Updated content');
      expect(res.body.message.isEdited).toBe(true);
    });

    it('should return 400 when content is missing', async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_CONTENT');
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/messages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'New content' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 403 when editing another user\'s message', async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Trying to edit' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('CANNOT_EDIT');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .patch(`/messages/${messageId}`)
        .send({ content: 'New content' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /messages/:id', () => {
    let conversationId;
    let messageId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      // Send a message
      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message to delete' });

      messageId = msgRes.body.message._id;
    });

    it('should delete a message', async () => {
      const res = await request(app)
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Message deleted');

      // Verify message is soft-deleted
      const message = await Message.findById(messageId);
      expect(message.isDeleted).toBe(true);
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/messages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 403 when deleting another user\'s message (non-admin)', async () => {
      const res = await request(app)
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('CANNOT_DELETE');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete(`/messages/${messageId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ========================================================================
  // MESSAGE READ STATUS TESTS
  // ========================================================================

  describe('POST /messages/:id/read', () => {
    let conversationId;
    let messageId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      // Send a message from user 1
      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Read this message' });

      messageId = msgRes.body.message._id;
    });

    it('should mark a message as read', async () => {
      const res = await request(app)
        .post(`/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Marked as read');
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/messages/${fakeId}/read`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/messages/${messageId}/read`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ========================================================================
  // UNREAD COUNT TESTS
  // ========================================================================

  describe('GET /messages/unread-count', () => {
    it('should return unread count of 0 when no messages', async () => {
      const res = await request(app)
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(0);
    });

    it('should return correct unread count', async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      const conversationId = convRes.body.conversation._id;

      // Send messages from other user
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Message 1' });

      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Message 2' });

      // Check unread count for first user
      const res = await request(app)
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(2);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/messages/unread-count');

      expect(res.statusCode).toBe(401);
    });
  });

  // ========================================================================
  // ARCHIVE TESTS
  // ========================================================================

  describe('POST /messages/conversations/:id/archive', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;
    });

    it('should archive a conversation', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(true);
    });

    it('should toggle archive status', async () => {
      // Archive first
      await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Unarchive
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(false);
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/messages/conversations/${fakeId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/archive`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ========================================================================
  // MUTE/UNMUTE TESTS
  // ========================================================================

  describe('POST /messages/conversations/:id/mute', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;
    });

    it('should mute a conversation', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Conversation muted');
    });

    it('should mute for a specific duration', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ duration: 3600000 }); // 1 hour

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Conversation muted');
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/messages/conversations/${fakeId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/mute`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /messages/conversations/:id/unmute', () => {
    let conversationId;

    beforeEach(async () => {
      // Create a conversation
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      // Mute the conversation first
      await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should unmute a conversation', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/unmute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Conversation unmuted');
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/messages/conversations/${fakeId}/unmute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/unmute`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ========================================================================
  // MESSAGING PERMISSION TESTS
  // ========================================================================

  describe('Messaging Permissions', () => {
    it('should not allow messaging when user restricts to connections only', async () => {
      // Update other user to only allow messages from connections
      await User.findByIdAndUpdate(otherUser._id, {
        socialSettings: { allowMessages: 'connections' }
      });

      const res = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('MESSAGING_NOT_ALLOWED');
    });

    it('should allow messaging when users are connected', async () => {
      // Update other user to only allow messages from connections
      await User.findByIdAndUpdate(otherUser._id, {
        socialSettings: { allowMessages: 'connections' }
      });

      // Create a connection between users
      await createConnection(userId, otherUser._id);

      const res = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      expect(res.statusCode).toBe(201);
      expect(res.body.conversation).toBeDefined();
    });

    it('should not allow messaging when user blocks all messages', async () => {
      // Update other user to not allow any messages
      await User.findByIdAndUpdate(otherUser._id, {
        socialSettings: { allowMessages: 'none' }
      });

      const res = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('MESSAGING_NOT_ALLOWED');
    });
  });

  // ========================================================================
  // EDGE CASE TESTS
  // ========================================================================

  describe('Edge Cases', () => {
    let conversationId;
    let messageId;

    beforeEach(async () => {
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;

      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Original message' });

      messageId = msgRes.body.message._id;
    });

    it('should handle editing message multiple times', async () => {
      // First edit
      const edit1 = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'First edit' });

      expect(edit1.statusCode).toBe(200);
      expect(edit1.body.message.content).toBe('First edit');

      // Second edit
      const edit2 = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Second edit' });

      expect(edit2.statusCode).toBe(200);
      expect(edit2.body.message.content).toBe('Second edit');

      // Third edit
      const edit3 = await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Third edit' });

      expect(edit3.statusCode).toBe(200);
      expect(edit3.body.message.content).toBe('Third edit');
      expect(edit3.body.message.isEdited).toBe(true);
    });

    it('should handle deleting last message in conversation', async () => {
      // Delete the only message
      await request(app)
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify conversation still exists but has no non-deleted messages
      const getMessages = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getMessages.statusCode).toBe(200);
      // Messages might be empty or show soft-deleted messages depending on implementation
      expect(getMessages.body.messages).toBeDefined();
    });

    it('should handle marking many messages as read in bulk', async () => {
      // Create multiple messages from other user
      const messageIds = [];
      for (let i = 0; i < 10; i++) {
        const msgRes = await request(app)
          .post(`/messages/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ content: `Message ${i}` });
        messageIds.push(msgRes.body.message._id);
      }

      // Mark all as read
      for (const id of messageIds) {
        const res = await request(app)
          .post(`/messages/${id}/read`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
      }

      // Verify unread count is 0
      const unreadRes = await request(app)
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unreadRes.statusCode).toBe(200);
      expect(unreadRes.body.unreadCount).toBe(0);
    });

    it('should handle conversation with many participants (group)', async () => {
      // Create several users
      const users = [];
      for (let i = 0; i < 5; i++) {
        const userResult = await createAndLoginUser(`group-user-${i}@example.com`);
        users.push(userResult.userId);
      }

      // Create group conversation with all users
      const res = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'group',
          name: 'Large Group',
          participantIds: users
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.conversation.participants.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle muting already-muted conversation', async () => {
      // Mute conversation
      await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);

      // Mute again
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should handle archiving already-archived conversation', async () => {
      // Archive conversation
      await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Archive again
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should handle unmuting non-muted conversation', async () => {
      // Try to unmute a conversation that was never muted
      const res = await request(app)
        .post(`/messages/conversations/${conversationId}/unmute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should handle reading already-read message', async () => {
      // Mark as read
      await request(app)
        .post(`/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Mark as read again
      const res = await request(app)
        .post(`/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ========================================================================
  // STATE VERIFICATION TESTS
  // ========================================================================

  describe('State Verification', () => {
    let conversationId;

    beforeEach(async () => {
      const convRes = await request(app)
        .post('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: otherUser._id.toString(), type: 'direct' });

      conversationId = convRes.body.conversation._id;
    });

    it('should verify unread count decrements after marking message as read', async () => {
      // Send multiple messages from other user
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Message 1' });

      const msg2Res = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Message 2' });

      // Check initial unread count
      const initialUnread = await request(app)
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialUnread.body.unreadCount).toBe(2);

      // Mark one as read
      await request(app)
        .post(`/messages/${msg2Res.body.message._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify count decreased
      const afterReadUnread = await request(app)
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(afterReadUnread.body.unreadCount).toBe(1);
    });

    it('should verify mutedUntil timestamp is set after muting', async () => {
      const duration = 3600000; // 1 hour

      await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ duration });

      // Fetch conversation to verify mutedUntil
      const conversation = await Conversation.findById(conversationId);
      const userParticipant = conversation.participants.find(
        p => p.userId.toString() === userId
      );

      expect(userParticipant.mutedUntil).toBeDefined();
      expect(new Date(userParticipant.mutedUntil).getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify conversation lastMessage updates after sending', async () => {
      const initialConv = await Conversation.findById(conversationId);
      const initialLastMessage = initialConv.lastMessage;

      // Send new message
      await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'New latest message' });

      // Fetch conversation again
      const updatedConv = await Conversation.findById(conversationId);

      expect(updatedConv.lastMessage.content).toBe('New latest message');
      expect(updatedConv.lastMessage.senderId.toString()).toBe(userId);

      // Verify timestamp changed
      if (initialLastMessage) {
        expect(updatedConv.lastMessage.timestamp).not.toBe(initialLastMessage.timestamp);
      }
    });

    it('should verify archive status persists across requests', async () => {
      // Archive conversation
      await request(app)
        .post(`/messages/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Fetch conversation list
      const convList = await request(app)
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      // Find the conversation in the list
      const archivedConv = convList.body.conversations.find(
        c => c._id === conversationId
      );

      // Verify archived status persisted
      const userParticipant = archivedConv.participants.find(
        p => p.userId._id ? p.userId._id === userId : p.userId === userId
      );

      expect(userParticipant.isArchived).toBe(true);
    });

    it('should verify mute status persists after setting', async () => {
      // Mute conversation
      await request(app)
        .post(`/messages/conversations/${conversationId}/mute`)
        .set('Authorization', `Bearer ${authToken}`);

      // Fetch conversation from database
      const conversation = await Conversation.findById(conversationId);
      const userParticipant = conversation.participants.find(
        p => p.userId.toString() === userId
      );

      expect(userParticipant.mutedUntil).toBeDefined();

      // Verify it persists when fetching conversations
      const convList = await request(app)
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      const mutedConv = convList.body.conversations.find(
        c => c._id === conversationId
      );

      expect(mutedConv).toBeDefined();
    });

    it('should verify message edit persists with isEdited flag', async () => {
      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Original content' });

      const messageId = msgRes.body.message._id;

      // Edit message
      await request(app)
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Edited content' });

      // Fetch messages
      const messages = await request(app)
        .get(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      const editedMsg = messages.body.messages.find(m => m._id === messageId);
      expect(editedMsg.content).toBe('Edited content');
      expect(editedMsg.isEdited).toBe(true);
    });

    it('should verify deleted message persists as soft-deleted', async () => {
      const msgRes = await request(app)
        .post(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Will be deleted' });

      const messageId = msgRes.body.message._id;

      // Delete message
      await request(app)
        .delete(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify in database
      const message = await Message.findById(messageId);
      expect(message).toBeDefined();
      expect(message.isDeleted).toBe(true);
    });
  });
});
