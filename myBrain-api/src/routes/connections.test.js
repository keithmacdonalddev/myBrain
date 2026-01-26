import request from 'supertest';
import app from '../test/testApp.js';

describe('Connections Routes', () => {
  let authToken;
  let userId;

  // Helper to create and login a user, returns { token, userId }
  const createAndLoginUser = async (email) => {
    await request(app)
      .post('/auth/register')
      .send({
        email,
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email,
        password: 'Password123!',
      });

    return {
      token: loginRes.body.token,
      userId: loginRes.body.user._id,
    };
  };

  // Login before each test
  beforeEach(async () => {
    // Create and login primary test user
    const user = await createAndLoginUser('connections@example.com');
    authToken = user.token;
    userId = user.userId;
  });

  // ============================================================================
  // POST /connections - Send connection request
  // ============================================================================
  describe('POST /connections', () => {
    it('should send a connection request to another user', async () => {
      // Create target user
      const targetUser = await createAndLoginUser('target@example.com');

      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: targetUser.userId,
          message: 'Hello! Let us connect.',
          source: 'search',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Connection request sent');
      expect(res.body.connection).toBeDefined();
      expect(res.body.connection.status).toBe('pending');
    });

    it('should send connection request with minimal data', async () => {
      const targetUser = await createAndLoginUser('minimal@example.com');

      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: targetUser.userId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.connection.status).toBe('pending');
    });

    it('should reject without userId', async () => {
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello!',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('should reject with invalid userId format', async () => {
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'invalid-id',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_USER_ID');
    });

    it('should reject self-connection request', async () => {
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SELF_CONNECTION');
    });

    it('should reject connection to non-existent user', async () => {
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: '507f1f77bcf86cd799439011',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should reject duplicate pending connection request', async () => {
      const targetUser = await createAndLoginUser('duplicate@example.com');

      // Send first request
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Send duplicate request
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('REQUEST_PENDING');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/connections')
        .send({ userId: '507f1f77bcf86cd799439011' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections - Get all accepted connections
  // ============================================================================
  describe('GET /connections', () => {
    it('should return empty list when no connections', async () => {
      const res = await request(app)
        .get('/connections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
      expect(res.body.connections).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should return accepted connections', async () => {
      // Create target user and establish connection
      const targetUser = await createAndLoginUser('friend@example.com');

      // Send request
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Accept request as target user
      await request(app)
        .patch(`/connections/${reqRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Get connections
      const res = await request(app)
        .get('/connections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should paginate connections', async () => {
      const res = await request(app)
        .get('/connections')
        .query({ limit: 5, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.hasMore).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections/pending - Get pending incoming requests
  // ============================================================================
  describe('GET /connections/pending', () => {
    it('should return empty list when no pending requests', async () => {
      const res = await request(app)
        .get('/connections/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should return pending requests received', async () => {
      // Create sender user
      const senderUser = await createAndLoginUser('sender@example.com');

      // Sender sends request to primary user
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${senderUser.token}`)
        .send({ userId: userId, message: 'Please connect!' });

      // Check pending requests for primary user
      const res = await request(app)
        .get('/connections/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
      expect(res.body.requests[0].message).toBe('Please connect!');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections/pending');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections/sent - Get sent pending requests
  // ============================================================================
  describe('GET /connections/sent', () => {
    it('should return empty list when no sent requests', async () => {
      const res = await request(app)
        .get('/connections/sent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should return sent pending requests', async () => {
      // Create target user
      const targetUser = await createAndLoginUser('sentto@example.com');

      // Send connection request
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId, message: 'Lets connect!' });

      // Check sent requests
      const res = await request(app)
        .get('/connections/sent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
      expect(res.body.requests[0].message).toBe('Lets connect!');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections/sent');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections/counts - Get connection counts
  // ============================================================================
  describe('GET /connections/counts', () => {
    it('should return zero counts when no connections', async () => {
      const res = await request(app)
        .get('/connections/counts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
      expect(res.body.pending).toBeDefined();
      expect(res.body.sent).toBeDefined();
    });

    it('should return correct counts', async () => {
      // Create target user and send request
      const targetUser = await createAndLoginUser('count@example.com');

      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      const res = await request(app)
        .get('/connections/counts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sent).toBeGreaterThanOrEqual(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections/counts');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections/suggestions - Get suggested users
  // ============================================================================
  describe('GET /connections/suggestions', () => {
    it('should return suggestions', async () => {
      // Create some potential suggestions
      await createAndLoginUser('suggestion1@example.com');
      await createAndLoginUser('suggestion2@example.com');

      const res = await request(app)
        .get('/connections/suggestions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.suggestions).toBeDefined();
      expect(Array.isArray(res.body.suggestions)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/connections/suggestions')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections/suggestions');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /connections/:id/accept - Accept connection request
  // ============================================================================
  describe('PATCH /connections/:id/accept', () => {
    it('should accept a pending connection request', async () => {
      // Create sender user
      const senderUser = await createAndLoginUser('acceptme@example.com');

      // Sender sends request to primary user
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${senderUser.token}`)
        .send({ userId: userId });

      const connectionId = reqRes.body.connection._id;

      // Primary user accepts the request
      const res = await request(app)
        .patch(`/connections/${connectionId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Connection accepted');
      expect(res.body.connection).toBeDefined();
      expect(res.body.connection.connectedAt).toBeDefined();
    });

    it('should return 404 for non-existent connection', async () => {
      const res = await request(app)
        .patch('/connections/507f1f77bcf86cd799439011/accept')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should reject accepting own request', async () => {
      // Create target user
      const targetUser = await createAndLoginUser('ownaccept@example.com');

      // Send request to target user
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Try to accept own request (should fail)
      const res = await request(app)
        .patch(`/connections/${reqRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/connections/507f1f77bcf86cd799439011/accept');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /connections/:id/decline - Decline connection request
  // ============================================================================
  describe('PATCH /connections/:id/decline', () => {
    it('should decline a pending connection request', async () => {
      // Create sender user
      const senderUser = await createAndLoginUser('declineme@example.com');

      // Sender sends request to primary user
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${senderUser.token}`)
        .send({ userId: userId });

      const connectionId = reqRes.body.connection._id;

      // Primary user declines the request
      const res = await request(app)
        .patch(`/connections/${connectionId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Connection request declined');
    });

    it('should return 404 for non-existent connection', async () => {
      const res = await request(app)
        .patch('/connections/507f1f77bcf86cd799439011/decline')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/connections/507f1f77bcf86cd799439011/decline');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // DELETE /connections/:id - Remove connection or cancel request
  // ============================================================================
  describe('DELETE /connections/:id', () => {
    it('should cancel a sent pending connection request', async () => {
      // Create target user
      const targetUser = await createAndLoginUser('cancel@example.com');

      // Send request
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Cancel the request
      const res = await request(app)
        .delete(`/connections/${reqRes.body.connection._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Connection request cancelled');
    });

    it('should remove an accepted connection', async () => {
      // Create target user
      const targetUser = await createAndLoginUser('remove@example.com');

      // Send request
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Accept the request
      await request(app)
        .patch(`/connections/${reqRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Remove the connection
      const res = await request(app)
        .delete(`/connections/${reqRes.body.connection._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Connection removed');
    });

    it('should return 404 for non-existent connection', async () => {
      const res = await request(app)
        .delete('/connections/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete('/connections/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // POST /connections/:userId/block - Block a user
  // ============================================================================
  describe('POST /connections/:userId/block', () => {
    it('should block a user', async () => {
      const targetUser = await createAndLoginUser('blockme@example.com');

      const res = await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'spam',
          notes: 'Test block',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User blocked successfully');
    });

    it('should block user with default reason', async () => {
      const targetUser = await createAndLoginUser('blockdefault@example.com');

      const res = await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User blocked successfully');
    });

    it('should reject blocking yourself', async () => {
      const res = await request(app)
        .post(`/connections/${userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SELF_BLOCK');
    });

    it('should reject blocking invalid userId', async () => {
      const res = await request(app)
        .post('/connections/invalid-id/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_USER_ID');
    });

    it('should reject duplicate block', async () => {
      const targetUser = await createAndLoginUser('dupblock@example.com');

      // First block
      await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Second block
      const res = await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('ALREADY_BLOCKED');
    });

    it('should remove connection when blocking a connected user', async () => {
      const targetUser = await createAndLoginUser('blockconnected@example.com');

      // Create and accept connection
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      await request(app)
        .patch(`/connections/${reqRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Block the connected user
      const res = await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(200);

      // Verify connection is gone
      const connRes = await request(app)
        .get('/connections')
        .set('Authorization', `Bearer ${authToken}`);

      const stillConnected = connRes.body.connections.some(
        c => c.user._id === targetUser.userId
      );
      expect(stillConnected).toBe(false);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/connections/507f1f77bcf86cd799439011/block')
        .send({});

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // DELETE /connections/:userId/block - Unblock a user
  // ============================================================================
  describe('DELETE /connections/:userId/block', () => {
    it('should unblock a blocked user', async () => {
      const targetUser = await createAndLoginUser('unblockme@example.com');

      // First block
      await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Then unblock
      const res = await request(app)
        .delete(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User unblocked successfully');
    });

    it('should return 404 for non-blocked user', async () => {
      const targetUser = await createAndLoginUser('notblocked@example.com');

      const res = await request(app)
        .delete(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete('/connections/507f1f77bcf86cd799439011/block');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /connections/blocked - Get list of blocked users
  // ============================================================================
  describe('GET /connections/blocked', () => {
    it('should return empty list when no users blocked', async () => {
      const res = await request(app)
        .get('/connections/blocked')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.blocked).toBeDefined();
      expect(res.body.blocked).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should return list of blocked users', async () => {
      const targetUser = await createAndLoginUser('blocklist@example.com');

      // Block the user
      await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'harassment' });

      const res = await request(app)
        .get('/connections/blocked')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.blocked.length).toBeGreaterThanOrEqual(1);
      expect(res.body.blocked[0].reason).toBe('harassment');
    });

    it('should paginate blocked users', async () => {
      const res = await request(app)
        .get('/connections/blocked')
        .query({ limit: 5, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.hasMore).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/connections/blocked');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Block prevents connection requests
  // ============================================================================
  describe('Block prevents connection requests', () => {
    it('should prevent connection request when blocked', async () => {
      const targetUser = await createAndLoginUser('blockedtarget@example.com');

      // Target user blocks primary user
      await request(app)
        .post(`/connections/${userId}/block`)
        .set('Authorization', `Bearer ${targetUser.token}`)
        .send({});

      // Primary user tries to send connection request
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('USER_BLOCKED');
    });

    it('should prevent connection request when you blocked the target', async () => {
      const targetUser = await createAndLoginUser('iblockedyou@example.com');

      // Primary user blocks target
      await request(app)
        .post(`/connections/${targetUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Primary user tries to send connection request to blocked user
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('USER_BLOCKED');
    });
  });

  // ============================================================================
  // Connection retry after decline
  // ============================================================================
  describe('Connection retry after decline', () => {
    it('should allow retry after declined request', async () => {
      const targetUser = await createAndLoginUser('retry@example.com');

      // Send first request
      const firstReq = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Target declines
      await request(app)
        .patch(`/connections/${firstReq.body.connection._id}/decline`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Retry connection request
      const retryRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId, message: 'Trying again!' });

      expect(retryRes.statusCode).toBe(201);
      expect(retryRes.body.message).toBe('Connection request sent');
    });
  });

  // ============================================================================
  // Incoming request exists scenario
  // ============================================================================
  describe('Incoming request exists scenario', () => {
    it('should return incoming request exists when target already sent request', async () => {
      const targetUser = await createAndLoginUser('alreadysent@example.com');

      // Target user sends request to primary user first
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${targetUser.token}`)
        .send({ userId: userId });

      // Primary user tries to send request to target (who already sent one)
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('INCOMING_REQUEST_EXISTS');
      expect(res.body.connectionId).toBeDefined();
    });
  });

  // ============================================================================
  // Already connected scenario
  // ============================================================================
  describe('Already connected scenario', () => {
    it('should return already connected when trying to send request to connected user', async () => {
      const targetUser = await createAndLoginUser('alreadyconnected@example.com');

      // Send and accept connection
      const reqRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      await request(app)
        .patch(`/connections/${reqRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Try to send another connection request
      const res = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('ALREADY_CONNECTED');
    });
  });
});
