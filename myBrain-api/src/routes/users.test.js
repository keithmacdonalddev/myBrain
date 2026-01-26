import request from 'supertest';
import app from '../test/testApp.js';

describe('Users Routes', () => {
  let authToken;
  let userId;

  // Helper to create and login a user, returns { token, userId }
  const createAndLoginUser = async (email, options = {}) => {
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

    // Update profile if options provided
    if (options.profile) {
      await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send(options.profile);
    }

    return {
      token: loginRes.body.token,
      userId: loginRes.body.user._id,
    };
  };

  // Login before each test
  beforeEach(async () => {
    // Create and login primary test user with profile info
    const user = await createAndLoginUser('users@example.com', {
      profile: {
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
      },
    });
    authToken = user.token;
    userId = user.userId;
  });

  // ============================================================================
  // GET /users/search - Search for users
  // ============================================================================
  describe('GET /users/search', () => {
    it('should search for users by name', async () => {
      // Create searchable users
      await createAndLoginUser('searchable1@example.com', {
        profile: { firstName: 'John', lastName: 'Smith', displayName: 'John Smith' },
      });
      await createAndLoginUser('searchable2@example.com', {
        profile: { firstName: 'John', lastName: 'Doe', displayName: 'John Doe' },
      });

      const res = await request(app)
        .get('/users/search')
        .query({ q: 'John' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.total).toBeDefined();
      expect(res.body.hasMore).toBeDefined();
    });

    it('should search for users by email', async () => {
      await createAndLoginUser('uniqueemail@example.com', {
        profile: { displayName: 'Unique Email User' },
      });

      const res = await request(app)
        .get('/users/search')
        .query({ q: 'uniqueemail' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.users.some(u => u.profile.displayName === 'Unique Email User')).toBe(true);
    });

    it('should not include current user in search results', async () => {
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'Test User' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // The current user should not appear in results
      const foundSelf = res.body.users.some(u => u._id === userId);
      expect(foundSelf).toBe(false);
    });

    it('should include connection status in results', async () => {
      // Create a user and send connection request
      const targetUser = await createAndLoginUser('connection-status@example.com', {
        profile: { displayName: 'Connection Status' },
      });

      // Send connection request
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Search for the user
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'Connection Status' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const foundUser = res.body.users.find(u => u._id === targetUser.userId);
      expect(foundUser).toBeDefined();
      expect(foundUser.connectionStatus).toBe('pending');
      expect(foundUser.isRequester).toBe(true);
    });

    it('should respect pagination (limit and skip)', async () => {
      // Create multiple users
      for (let i = 0; i < 5; i++) {
        await createAndLoginUser(`paginate${i}@example.com`, {
          profile: { displayName: `Paginate User ${i}` },
        });
      }

      const res = await request(app)
        .get('/users/search')
        .query({ q: 'Paginate', limit: 2, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(2);
    });

    it('should not include blocked users in search results', async () => {
      // Create a user to block
      const blockedUser = await createAndLoginUser('blockedsearch@example.com', {
        profile: { displayName: 'Blocked Search User' },
      });

      // Block the user
      await request(app)
        .post(`/connections/${blockedUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Search should not include blocked user
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'Blocked Search' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const foundBlocked = res.body.users.some(u => u._id === blockedUser.userId);
      expect(foundBlocked).toBe(false);
    });

    it('should not include users who blocked the current user in search results', async () => {
      // Create a user who will block the current user
      const blockerUser = await createAndLoginUser('blocker@example.com', {
        profile: { displayName: 'Blocker User' },
      });

      // Blocker blocks the current user
      await request(app)
        .post(`/connections/${userId}/block`)
        .set('Authorization', `Bearer ${blockerUser.token}`)
        .send({});

      // Search should not include the blocker
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'Blocker' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const foundBlocker = res.body.users.some(u => u._id === blockerUser.userId);
      expect(foundBlocker).toBe(false);
    });

    it('should reject search query less than 2 characters', async () => {
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'a' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('QUERY_TOO_SHORT');
    });

    it('should reject search without query parameter', async () => {
      const res = await request(app)
        .get('/users/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('QUERY_TOO_SHORT');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/users/search')
        .query({ q: 'test' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /users/:id/profile - View a user's public profile
  // ============================================================================
  describe('GET /users/:id/profile', () => {
    it('should get public profile of another user', async () => {
      const targetUser = await createAndLoginUser('viewprofile@example.com', {
        profile: {
          displayName: 'View Profile User',
          firstName: 'View',
          lastName: 'Profile',
          bio: 'This is my bio',
        },
      });

      const res = await request(app)
        .get(`/users/${targetUser.userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.profile.displayName).toBe('View Profile User');
      expect(res.body.isOwnProfile).toBe(false);
      expect(res.body.connection).toBeNull();
      expect(res.body.canConnect).toBeDefined();
      expect(res.body.canMessage).toBeDefined();
    });

    it('should identify own profile', async () => {
      const res = await request(app)
        .get(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.isOwnProfile).toBe(true);
    });

    it('should include connection info when connected', async () => {
      const targetUser = await createAndLoginUser('connected-profile@example.com', {
        profile: { displayName: 'Connected Profile' },
      });

      // Create and accept connection
      const connRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      await request(app)
        .patch(`/connections/${connRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${targetUser.token}`);

      // Get profile
      const res = await request(app)
        .get(`/users/${targetUser.userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connection).toBeDefined();
      expect(res.body.connection.status).toBe('accepted');
      expect(res.body.profile.isConnected).toBe(true);
    });

    it('should include pending connection info', async () => {
      const targetUser = await createAndLoginUser('pending-profile@example.com', {
        profile: { displayName: 'Pending Profile' },
      });

      // Send connection request
      await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUser.userId });

      // Get profile
      const res = await request(app)
        .get(`/users/${targetUser.userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connection).toBeDefined();
      expect(res.body.connection.status).toBe('pending');
      expect(res.body.connection.isRequester).toBe(true);
    });

    it('should return 404 for blocked user', async () => {
      const blockedUser = await createAndLoginUser('blocked-profile@example.com', {
        profile: { displayName: 'Blocked Profile' },
      });

      // Block the user
      await request(app)
        .post(`/connections/${blockedUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Try to view blocked user's profile
      const res = await request(app)
        .get(`/users/${blockedUser.userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 when user has blocked the current user', async () => {
      const blockerUser = await createAndLoginUser('blocker-profile@example.com', {
        profile: { displayName: 'Blocker Profile' },
      });

      // Blocker blocks current user
      await request(app)
        .post(`/connections/${userId}/block`)
        .set('Authorization', `Bearer ${blockerUser.token}`)
        .send({});

      // Try to view blocker's profile
      const res = await request(app)
        .get(`/users/${blockerUser.userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID format', async () => {
      const res = await request(app)
        .get('/users/invalid-id/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_USER_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/users/507f1f77bcf86cd799439011/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/users/${userId}/profile`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /users/:id/connections - View a user's connections
  // ============================================================================
  describe('GET /users/:id/connections', () => {
    it('should get own connections', async () => {
      // Create another user and establish connection
      const friendUser = await createAndLoginUser('friend@example.com', {
        profile: { displayName: 'Friend User' },
      });

      // Create and accept connection
      const connRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: friendUser.userId });

      await request(app)
        .patch(`/connections/${connRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${friendUser.token}`);

      // Get own connections
      const res = await request(app)
        .get(`/users/${userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
      expect(res.body.connections.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeDefined();
      expect(res.body.hasMore).toBeDefined();
    });

    it('should get public connections of another user', async () => {
      // Create two users and connect them
      const userA = await createAndLoginUser('usera-conn@example.com', {
        profile: { displayName: 'User A' },
      });
      const userB = await createAndLoginUser('userb-conn@example.com', {
        profile: { displayName: 'User B' },
      });

      // Connect A and B
      const connRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ userId: userB.userId });

      await request(app)
        .patch(`/connections/${connRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      // View A's connections as the primary test user
      const res = await request(app)
        .get(`/users/${userA.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
    });

    it('should respect pagination (limit and skip)', async () => {
      // Get connections with pagination
      const res = await request(app)
        .get(`/users/${userId}/connections`)
        .query({ limit: 5, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.hasMore).toBeDefined();
    });

    it('should return 404 for blocked user', async () => {
      const blockedUser = await createAndLoginUser('blocked-conn@example.com', {
        profile: { displayName: 'Blocked Conn' },
      });

      // Block the user
      await request(app)
        .post(`/connections/${blockedUser.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      const res = await request(app)
        .get(`/users/${blockedUser.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID format', async () => {
      const res = await request(app)
        .get('/users/invalid-id/connections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_USER_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/users/507f1f77bcf86cd799439011/connections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/users/${userId}/connections`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /users/social-settings - Update social/privacy settings
  // ============================================================================
  describe('PATCH /users/social-settings', () => {
    it('should update profileVisibility setting', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileVisibility: 'private',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Social settings updated');
      expect(res.body.socialSettings.profileVisibility).toBe('private');
    });

    it('should update allowConnectionRequests setting', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          allowConnectionRequests: 'none',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.allowConnectionRequests).toBe('none');
    });

    it('should update allowMessages setting', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          allowMessages: 'everyone',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.allowMessages).toBe('everyone');
    });

    it('should update showActivity setting', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showActivity: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.showActivity).toBe(false);
    });

    it('should update showOnlineStatus setting', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showOnlineStatus: 'everyone',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.showOnlineStatus).toBe('everyone');
    });

    it('should update visibleFields settings', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          visibleFields: {
            bio: false,
            location: false,
            website: true,
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.visibleFields.bio).toBe(false);
      expect(res.body.socialSettings.visibleFields.location).toBe(false);
      expect(res.body.socialSettings.visibleFields.website).toBe(true);
    });

    it('should update multiple settings at once', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileVisibility: 'connections',
          allowMessages: 'connections',
          showActivity: true,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.socialSettings.profileVisibility).toBe('connections');
      expect(res.body.socialSettings.allowMessages).toBe('connections');
      expect(res.body.socialSettings.showActivity).toBe(true);
    });

    it('should reject with no valid settings to update', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'value',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject with empty body', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_UPDATES');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/users/social-settings')
        .send({
          profileVisibility: 'private',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATCH /users/presence - Update online status
  // ============================================================================
  describe('PATCH /users/presence', () => {
    it('should update presence status to available', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'available',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Presence updated');
      expect(res.body.presence.currentStatus).toBe('available');
      expect(res.body.presence.isOnline).toBe(true);
    });

    it('should update presence status to busy', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'busy',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.presence.currentStatus).toBe('busy');
      expect(res.body.presence.isOnline).toBe(true);
    });

    it('should update presence status to away', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'away',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.presence.currentStatus).toBe('away');
    });

    it('should update presence status to dnd (do not disturb)', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'dnd',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.presence.currentStatus).toBe('dnd');
    });

    it('should update presence status to offline', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'offline',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.presence.currentStatus).toBe('offline');
      expect(res.body.presence.isOnline).toBe(false);
      expect(res.body.presence.lastSeenAt).toBeDefined();
    });

    it('should update presence with status message', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'busy',
          statusMessage: 'In a meeting',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.presence.currentStatus).toBe('busy');
      expect(res.body.presence.statusMessage).toBe('In a meeting');
    });

    it('should reject invalid status value', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid-status',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch('/users/presence')
        .send({
          status: 'available',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Privacy - Profile visibility affects connections view
  // ============================================================================
  describe('Privacy - Connections visibility', () => {
    it('should deny access to private user connections', async () => {
      // Create a user with private profile
      const privateUser = await createAndLoginUser('private-user@example.com', {
        profile: { displayName: 'Private User' },
      });

      // Set profile visibility to private
      await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${privateUser.token}`)
        .send({
          profileVisibility: 'private',
        });

      // Try to view private user's connections as another user
      const res = await request(app)
        .get(`/users/${privateUser.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('CONNECTIONS_PRIVATE');
    });

    it('should deny access to connections-only user when not connected', async () => {
      // Create a user with connections-only visibility
      const connOnlyUser = await createAndLoginUser('conn-only@example.com', {
        profile: { displayName: 'Connections Only User' },
      });

      // Set profile visibility to connections
      await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${connOnlyUser.token}`)
        .send({
          profileVisibility: 'connections',
        });

      // Try to view user's connections when not connected
      const res = await request(app)
        .get(`/users/${connOnlyUser.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('NOT_CONNECTED');
    });

    it('should allow access to connections-only user when connected', async () => {
      // Create a user with connections-only visibility
      const connOnlyUser = await createAndLoginUser('conn-only-allow@example.com', {
        profile: { displayName: 'Connections Only Allow' },
      });

      // Set profile visibility to connections
      await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${connOnlyUser.token}`)
        .send({
          profileVisibility: 'connections',
        });

      // Create and accept connection
      const connRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: connOnlyUser.userId });

      await request(app)
        .patch(`/connections/${connRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${connOnlyUser.token}`);

      // Now should be able to view connections
      const res = await request(app)
        .get(`/users/${connOnlyUser.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
    });

    it('should always allow viewing own connections regardless of settings', async () => {
      // Set own profile to private
      await request(app)
        .patch('/users/social-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileVisibility: 'private',
        });

      // Should still be able to view own connections
      const res = await request(app)
        .get(`/users/${userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.connections).toBeDefined();
    });
  });

  // ============================================================================
  // Filter blocked users from connection lists
  // ============================================================================
  describe('Filter blocked users from connections', () => {
    it('should not include users blocked by viewer in connection list', async () => {
      // Create user A and user B
      const userA = await createAndLoginUser('usera-block@example.com', {
        profile: { displayName: 'User A Block' },
      });
      const userB = await createAndLoginUser('userb-block@example.com', {
        profile: { displayName: 'User B Block' },
      });

      // Connect A and B
      const connRes = await request(app)
        .post('/connections')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ userId: userB.userId });

      await request(app)
        .patch(`/connections/${connRes.body.connection._id}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      // Primary test user blocks user B
      await request(app)
        .post(`/connections/${userB.userId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // View user A's connections - should not include B (who primary user blocked)
      const res = await request(app)
        .get(`/users/${userA.userId}/connections`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const foundBlockedUser = res.body.connections.some(
        c => c.user._id === userB.userId
      );
      expect(foundBlockedUser).toBe(false);
    });
  });
});
