/**
 * Admin Routes Tests
 *
 * Tests for the admin API endpoints including:
 * - Authentication and authorization (401/403 checks)
 * - User management (list, create, update, delete)
 * - Moderation (warn, suspend, unsuspend, ban, unban)
 * - System configuration (settings, roles, sidebar)
 * - Logs access
 * - Reports management
 */

import request from 'supertest';
import app from '../test/testApp.js';
import mongoose from 'mongoose';

describe('Admin Routes', () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let regularUserId;

  /**
   * Helper function to register a user and get their token
   */
  async function createUserAndGetToken(email, password) {
    await request(app)
      .post('/auth/register')
      .send({ email, password });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email, password });

    return {
      token: loginRes.body.token,
      userId: loginRes.body.user._id
    };
  }

  /**
   * Setup before each test - create admin and regular users
   */
  beforeEach(async () => {
    // Create regular user
    const regularUserData = await createUserAndGetToken('user@example.com', 'Password123!');
    userToken = regularUserData.token;
    regularUserId = regularUserData.userId;

    // Create admin user
    const adminUserData = await createUserAndGetToken('admin@example.com', 'AdminPass123!');
    adminToken = adminUserData.token;
    adminUserId = adminUserData.userId;

    // Make the second user an admin by updating their role directly in database
    const User = mongoose.model('User');
    await User.updateOne({ email: 'admin@example.com' }, { role: 'admin' });

    // Re-login to get updated token with admin role
    const adminLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123!' });
    adminToken = adminLoginRes.body.token;
  });

  // ============================================================================
  // AUTHORIZATION TESTS - Verify admin-only access
  // ============================================================================

  describe('Authorization', () => {
    it('should return 401 for unauthenticated requests to /admin/users', async () => {
      const res = await request(app)
        .get('/admin/users');

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should return 403 for regular users accessing /admin/users', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('NOT_ADMIN');
    });

    it('should return 401 for unauthenticated requests to /admin/inbox', async () => {
      const res = await request(app)
        .get('/admin/inbox');

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for regular users accessing /admin/inbox', async () => {
      const res = await request(app)
        .get('/admin/inbox')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 401 for unauthenticated requests to /admin/logs', async () => {
      const res = await request(app)
        .get('/admin/logs');

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for regular users accessing /admin/logs', async () => {
      const res = await request(app)
        .get('/admin/logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // ADMIN INBOX TESTS
  // ============================================================================

  describe('GET /admin/inbox', () => {
    it('should return inbox data for admin users', async () => {
      const res = await request(app)
        .get('/admin/inbox')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('inbox');
      expect(res.body.inbox).toHaveProperty('urgent');
      expect(res.body.inbox).toHaveProperty('needsReview');
      expect(res.body.inbox).toHaveProperty('fyi');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalUsers');
      expect(res.body.stats).toHaveProperty('activeUsers');
    });
  });

  // ============================================================================
  // USER MANAGEMENT TESTS
  // ============================================================================

  describe('GET /admin/users', () => {
    it('should return list of users for admin', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body.total).toBeGreaterThanOrEqual(2); // At least admin and regular user
    });

    it('should support email search with q parameter', async () => {
      const res = await request(app)
        .get('/admin/users?q=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.users.some(u => u.email.includes('admin'))).toBe(true);
    });

    it('should support role filter', async () => {
      const res = await request(app)
        .get('/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.every(u => u.role === 'admin')).toBe(true);
    });

    it('should support pagination with limit and skip', async () => {
      const res = await request(app)
        .get('/admin/users?limit=1&skip=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.skip).toBe(0);
    });
  });

  describe('POST /admin/users', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@example.com',
          password: 'NewUser123!',
          role: 'free'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User created successfully');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.role).toBe('free');
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('EMAIL_REQUIRED');
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'short@example.com',
          password: 'short'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'user@example.com', // Already exists
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('EMAIL_IN_USE');
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalidrole@example.com',
          password: 'Password123!',
          role: 'superadmin' // Invalid role
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ROLE');
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should update user role', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'premium' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User updated successfully');
      expect(res.body.user.role).toBe('premium');
    });

    it('should update user status', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.status).toBe('disabled');
    });

    it('should reject invalid user ID format', async () => {
      const res = await request(app)
        .patch('/admin/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'premium' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'premium' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should prevent admin from modifying their own role', async () => {
      const res = await request(app)
        .patch(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'free' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SELF_MODIFY');
    });

    it('should allow admin to update user email', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'updated@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('updated@example.com');
    });
  });

  // ============================================================================
  // FEATURE FLAGS TESTS
  // ============================================================================

  describe('PATCH /admin/users/:id/flags', () => {
    it('should update user feature flags', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}/flags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flags: {
            betaFeatures: true,
            darkMode: false
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Flags updated successfully');
    });

    it('should reject non-object flags', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}/flags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flags: 'invalid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_FLAGS');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/admin/users/${fakeId}/flags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flags: { test: true }
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  describe('POST /admin/users/:id/reset-password', () => {
    it('should reset user password', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');

      // Verify the new password works
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'NewPassword123!' });

      expect(loginRes.statusCode).toBe(200);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'short' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should prevent admin from resetting their own password', async () => {
      const res = await request(app)
        .post(`/admin/users/${adminUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('SELF_RESET');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/admin/users/${fakeId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  // ============================================================================
  // MODERATION TESTS - Warn, Suspend, Unsuspend, Ban, Unban
  // ============================================================================

  describe('POST /admin/users/:id/warn', () => {
    it('should issue a warning to a user', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/warn`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Violation of community guidelines',
          level: 1
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Warning issued successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.action).toBeDefined();
    });

    it('should require a reason for warning', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/warn`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/admin/users/${fakeId}/warn`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test warning' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /admin/users/:id/suspend', () => {
    it('should suspend a user', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Repeated violations',
          until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User suspended successfully');
    });

    it('should require a reason for suspension', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/admin/users/${fakeId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test suspension' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /admin/users/:id/unsuspend', () => {
    it('should unsuspend a user', async () => {
      // First suspend the user
      await request(app)
        .post(`/admin/users/${regularUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Initial suspension' });

      // Then unsuspend
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Appeal approved' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User unsuspended successfully');
    });

    it('should require a reason for unsuspension', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });
  });

  describe('POST /admin/users/:id/ban', () => {
    it('should permanently ban a user', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Severe violation' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User banned successfully');
    });

    it('should require a reason for ban', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });
  });

  describe('POST /admin/users/:id/unban', () => {
    it('should unban a user', async () => {
      // First ban the user
      await request(app)
        .post(`/admin/users/${regularUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Initial ban' });

      // Then unban
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Rehabilitation complete' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User unbanned successfully');
    });

    it('should require a reason for unban', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });
  });

  // ============================================================================
  // ADMIN NOTES TESTS
  // ============================================================================

  describe('POST /admin/users/:id/admin-note', () => {
    it('should add an admin note about a user', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/admin-note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'User contacted support about account issues' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Admin note added successfully');
    });

    it('should require content for admin note', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/admin-note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('CONTENT_REQUIRED');
    });
  });

  // ============================================================================
  // MODERATION HISTORY TESTS
  // ============================================================================

  describe('GET /admin/users/:id/moderation-history', () => {
    it('should return moderation history for a user', async () => {
      // First create some moderation actions
      await request(app)
        .post(`/admin/users/${regularUserId}/warn`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'First warning' });

      const res = await request(app)
        .get(`/admin/users/${regularUserId}/moderation-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('actions');
    });

    it('should reject invalid user ID', async () => {
      const res = await request(app)
        .get('/admin/users/invalid-id/moderation-history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // ============================================================================
  // LOGS TESTS
  // ============================================================================

  describe('GET /admin/logs', () => {
    it('should return logs for admin', async () => {
      const res = await request(app)
        .get('/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('logs');
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    it('should support limit parameter', async () => {
      const res = await request(app)
        .get('/admin/logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBeLessThanOrEqual(5);
      expect(res.body.limit).toBe(5);
    });

    it('should cap limit at 100', async () => {
      const res = await request(app)
        .get('/admin/logs?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /admin/logs/stats/summary', () => {
    it('should return log statistics', async () => {
      const res = await request(app)
        .get('/admin/logs/stats/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('statusDistribution');
      expect(res.body).toHaveProperty('topEvents');
    });
  });

  // ============================================================================
  // FEATURES ENDPOINT TESTS
  // ============================================================================

  describe('GET /admin/features', () => {
    it('should return feature lists', async () => {
      const res = await request(app)
        .get('/admin/features')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('premiumFeatures');
      expect(res.body).toHaveProperty('betaFeatures');
    });
  });

  // ============================================================================
  // SYSTEM SETTINGS TESTS
  // ============================================================================

  describe('GET /admin/system/settings', () => {
    it('should return system settings for admin', async () => {
      const res = await request(app)
        .get('/admin/system/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      // Response should be an object with settings
      expect(typeof res.body).toBe('object');
    });
  });

  describe('GET /admin/system/kill-switches', () => {
    it('should return kill switches', async () => {
      const res = await request(app)
        .get('/admin/system/kill-switches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('killSwitches');
    });
  });

  describe('POST /admin/system/kill-switch', () => {
    it('should toggle a kill switch', async () => {
      const res = await request(app)
        .post('/admin/system/kill-switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          feature: 'testFeature',
          enabled: false,
          reason: 'Testing kill switch functionality'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Feature disabled');
    });

    it('should require feature name', async () => {
      const res = await request(app)
        .post('/admin/system/kill-switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: false,
          reason: 'Test'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('FEATURE_REQUIRED');
    });

    it('should require enabled to be boolean', async () => {
      const res = await request(app)
        .post('/admin/system/kill-switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          feature: 'testFeature',
          enabled: 'yes', // Invalid - not boolean
          reason: 'Test'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ENABLED');
    });

    it('should require reason when disabling a feature', async () => {
      const res = await request(app)
        .post('/admin/system/kill-switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          feature: 'testFeature',
          enabled: false
          // Missing reason
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });
  });

  // ============================================================================
  // ROLE CONFIGURATION TESTS
  // ============================================================================

  describe('GET /admin/roles', () => {
    it('should return all role configurations', async () => {
      const res = await request(app)
        .get('/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('roles');
      expect(Array.isArray(res.body.roles)).toBe(true);
    });
  });

  describe('GET /admin/roles/features', () => {
    it('should return available features for roles', async () => {
      const res = await request(app)
        .get('/admin/roles/features')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('features');
    });
  });

  describe('GET /admin/roles/:role', () => {
    it('should return config for specific role', async () => {
      const res = await request(app)
        .get('/admin/roles/free')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should reject invalid role name', async () => {
      const res = await request(app)
        .get('/admin/roles/superuser')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ROLE');
    });
  });

  describe('PATCH /admin/roles/:role', () => {
    it('should update role configuration', async () => {
      const res = await request(app)
        .patch('/admin/roles/free')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: {
            maxNotes: 100
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Role configuration updated successfully');
    });

    it('should reject invalid role name', async () => {
      const res = await request(app)
        .patch('/admin/roles/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: { maxNotes: 100 }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ROLE');
    });

    it('should reject invalid limit key', async () => {
      const res = await request(app)
        .patch('/admin/roles/free')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: {
            invalidLimit: 100
          }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_LIMIT_KEY');
    });
  });

  // ============================================================================
  // SIDEBAR CONFIGURATION TESTS
  // ============================================================================

  describe('GET /admin/sidebar', () => {
    it('should return sidebar configuration', async () => {
      const res = await request(app)
        .get('/admin/sidebar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /admin/sidebar/reset', () => {
    it('should reset sidebar to defaults', async () => {
      const res = await request(app)
        .post('/admin/sidebar/reset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Sidebar configuration reset to defaults');
    });
  });

  // ============================================================================
  // USER LIMITS TESTS
  // ============================================================================

  describe('GET /admin/users/:id/limits', () => {
    it('should return user limits', async () => {
      const res = await request(app)
        .get(`/admin/users/${regularUserId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/admin/users/${fakeId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /admin/users/:id/limits', () => {
    it('should update user limit overrides', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: {
            maxNotes: 500
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User limits updated successfully');
    });

    it('should reject invalid limits object', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: 'invalid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_LIMITS');
    });

    it('should reject invalid limit key', async () => {
      const res = await request(app)
        .patch(`/admin/users/${regularUserId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limits: {
            maxInvalidThing: 100
          }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_LIMIT_KEY');
    });
  });

  // ============================================================================
  // USER CONTENT TESTS
  // ============================================================================

  describe('GET /admin/users/:id/content', () => {
    it('should return user content', async () => {
      const res = await request(app)
        .get(`/admin/users/${regularUserId}/content`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should reject invalid user ID', async () => {
      const res = await request(app)
        .get('/admin/users/invalid-id/content')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // ============================================================================
  // REPORTS TESTS
  // ============================================================================

  describe('GET /admin/reports', () => {
    it('should return reports for admin', async () => {
      const res = await request(app)
        .get('/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('reports');
      expect(res.body).toHaveProperty('counts');
    });
  });

  describe('GET /admin/reports/counts', () => {
    it('should return report counts', async () => {
      const res = await request(app)
        .get('/admin/reports/counts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /admin/reports/:id', () => {
    it('should reject invalid report ID', async () => {
      const res = await request(app)
        .get('/admin/reports/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/admin/reports/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================================
  // DATABASE METRICS TESTS
  // ============================================================================

  describe('GET /admin/metrics/database', () => {
    it('should return database metrics for admin', async () => {
      const res = await request(app)
        .get('/admin/metrics/database')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('collections');
      expect(res.body).toHaveProperty('documentCounts');
    });
  });

  describe('GET /admin/metrics/database/health', () => {
    it('should return database health status', async () => {
      const res = await request(app)
        .get('/admin/metrics/database/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('healthy');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('checks');
    });
  });

  // ============================================================================
  // FILE MANAGEMENT TESTS
  // ============================================================================

  describe('GET /admin/files/stats', () => {
    it('should return file statistics', async () => {
      const res = await request(app)
        .get('/admin/files/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalFiles');
      expect(res.body).toHaveProperty('totalStorage');
    });
  });

  describe('GET /admin/files/usage', () => {
    it('should return storage usage per user', async () => {
      const res = await request(app)
        .get('/admin/files/usage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('usage');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  // ============================================================================
  // MODERATION TEMPLATES TESTS
  // ============================================================================

  describe('GET /admin/moderation-templates', () => {
    it('should return moderation templates', async () => {
      const res = await request(app)
        .get('/admin/moderation-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('templates');
    });
  });

  describe('POST /admin/moderation-templates', () => {
    it('should create a moderation template', async () => {
      const res = await request(app)
        .post('/admin/moderation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Spam Warning',
          actionType: 'warning',
          reason: 'Your content has been flagged as spam.',
          warningLevel: 1,
          category: 'spam'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Template created successfully');
      expect(res.body.template.name).toBe('Spam Warning');
    });

    it('should require name, actionType, and reason', async () => {
      const res = await request(app)
        .post('/admin/moderation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Template'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid action type', async () => {
      const res = await request(app)
        .post('/admin/moderation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Template',
          actionType: 'invalid',
          reason: 'Test reason'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ACTION_TYPE');
    });
  });

  // ============================================================================
  // SOCIAL DASHBOARD TESTS
  // ============================================================================

  describe('GET /admin/social/dashboard', () => {
    it('should return social dashboard stats', async () => {
      const res = await request(app)
        .get('/admin/social/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // ADMIN MESSAGE TESTS
  // ============================================================================

  describe('POST /admin/users/:id/admin-message', () => {
    it('should send an admin message to a user', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/admin-message`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Important Notice',
          message: 'This is a test admin message.',
          category: 'general',
          priority: 'normal'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Admin message sent successfully');
    });

    it('should require subject', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/admin-message`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Message without subject'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_SUBJECT');
    });

    it('should require message', async () => {
      const res = await request(app)
        .post(`/admin/users/${regularUserId}/admin-message`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Subject without message'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_MESSAGE');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/admin/users/${fakeId}/admin-message`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Test',
          message: 'Test message'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /admin/users/:id/admin-messages', () => {
    it('should return admin messages for a user', async () => {
      // First send a message
      await request(app)
        .post(`/admin/users/${regularUserId}/admin-message`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Test Message',
          message: 'Test content'
        });

      const res = await request(app)
        .get(`/admin/users/${regularUserId}/admin-messages`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('unreadCount');
    });
  });
});
