/**
 * =============================================================================
 * LOGS.TEST.JS - Tests for Logging Routes
 * =============================================================================
 *
 * This file tests all logging-related endpoints:
 *
 * 1. POST /logs/client-error - Frontend error reporting (public endpoint)
 * 2. GET /admin/logs - Search logs (admin only)
 * 3. GET /admin/logs/:requestId - Get single log (admin only)
 * 4. GET /admin/logs/stats/summary - Log statistics (admin only)
 *
 * =============================================================================
 */

import request from 'supertest';
import app from '../test/testApp.js';
import mongoose from 'mongoose';
import Log from '../models/Log.js';

describe('Logs Routes', () => {
  // =============================================================================
  // TEST SETUP - Authentication Tokens
  // =============================================================================
  // We need two types of users:
  // - Regular user: Should NOT be able to access admin log routes
  // - Admin user: Should be able to access all log routes

  let userToken;
  let adminToken;
  let adminUserId;

  beforeEach(async () => {
    // -------------------------------------------------------------------------
    // Create and login a regular user
    // -------------------------------------------------------------------------
    await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'Password123!' });

    const userRes = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });
    userToken = userRes.body.token;

    // -------------------------------------------------------------------------
    // Create and login an admin user
    // -------------------------------------------------------------------------
    await request(app)
      .post('/auth/register')
      .send({ email: 'admin@example.com', password: 'Password123!' });

    // Upgrade user to admin role
    const User = mongoose.model('User');
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      { role: 'admin' },
      { new: true }
    );
    adminUserId = adminUser._id.toString();

    const adminRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' });
    adminToken = adminRes.body.token;
  });

  // =============================================================================
  // POST /logs/client-error - Frontend Error Reporting
  // =============================================================================
  // This is a PUBLIC endpoint (no authentication required) because:
  // - Errors might happen before login
  // - Errors might break authentication itself
  // - We want to capture ALL frontend errors

  describe('POST /logs/client-error', () => {
    it('should accept a valid client error log', async () => {
      const errorData = {
        errorType: 'JavaScriptError',
        message: 'Cannot read property "name" of undefined',
        stack: 'Error: at Object.<anonymous> (app.js:123:45)',
        url: 'https://app.mybrain.com/dashboard',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        userId: adminUserId,
        sessionId: 'sess_abc123xyz789',
        metadata: { component: 'Dashboard', action: 'loadData' }
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requestId).toBeDefined();
      expect(res.body.requestId).toMatch(/^client_/); // Should start with "client_"
    });

    it('should accept error without optional fields', async () => {
      // Only errorType and message are required
      const errorData = {
        errorType: 'NetworkError',
        message: 'Failed to fetch API response'
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requestId).toBeDefined();
    });

    it('should reject error without errorType', async () => {
      const res = await request(app)
        .post('/logs/client-error')
        .send({ message: 'Some error happened' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('errorType');
    });

    it('should reject error without message', async () => {
      const res = await request(app)
        .post('/logs/client-error')
        .send({ errorType: 'JavaScriptError' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('message');
    });

    it('should reject empty request body', async () => {
      const res = await request(app)
        .post('/logs/client-error')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept ReactError type with componentStack', async () => {
      const errorData = {
        errorType: 'ReactError',
        message: 'Component render failed',
        componentStack: 'in App > Dashboard > TaskList > TaskItem',
        url: 'https://app.mybrain.com/tasks'
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should store the error log in database', async () => {
      const errorData = {
        errorType: 'UserAction',
        message: 'Form submission failed',
        url: 'https://app.mybrain.com/settings'
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);

      // Verify log was stored in database
      const log = await Log.findOne({ requestId: res.body.requestId });
      expect(log).toBeDefined();
      expect(log.eventName).toBe('client.UserAction');
      expect(log.method).toBe('CLIENT');
      expect(log.error.messageSafe).toBe('Form submission failed');
    });

    it('should work without authentication (public endpoint)', async () => {
      // No Authorization header set - this should still work
      const errorData = {
        errorType: 'NetworkTimeout',
        message: 'Request timed out after 30 seconds'
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should accept metadata with custom fields', async () => {
      const errorData = {
        errorType: 'JavaScriptError',
        message: 'Array index out of bounds',
        metadata: {
          arrayLength: 5,
          attemptedIndex: 10,
          pageName: 'ProjectList',
          userPreferences: { theme: 'dark' }
        }
      };

      const res = await request(app)
        .post('/logs/client-error')
        .send(errorData);

      expect(res.statusCode).toBe(201);

      // Verify metadata was stored
      const log = await Log.findOne({ requestId: res.body.requestId });
      expect(log.metadata.arrayLength).toBe(5);
      expect(log.metadata.attemptedIndex).toBe(10);
    });
  });

  // =============================================================================
  // GET /admin/logs - Admin Log Search
  // =============================================================================
  // This endpoint allows admins to search and filter API request logs.
  // Regular users should get 403 Forbidden.

  describe('GET /admin/logs', () => {
    // -------------------------------------------------------------------------
    // Create some test logs before each test
    // -------------------------------------------------------------------------
    beforeEach(async () => {
      // Create a mix of logs for testing filtering
      await Log.create([
        {
          requestId: 'req_test1',
          timestamp: new Date('2026-01-24T10:00:00Z'),
          route: '/notes',
          method: 'POST',
          statusCode: 201,
          durationMs: 45,
          userId: adminUserId,
          eventName: 'note.create.success',
          sampled: true,
          sampleReason: 'mutation'
        },
        {
          requestId: 'req_test2',
          timestamp: new Date('2026-01-24T11:00:00Z'),
          route: '/tasks',
          method: 'GET',
          statusCode: 200,
          durationMs: 30,
          userId: adminUserId,
          eventName: 'task.list.success',
          sampled: true,
          sampleReason: 'random'
        },
        {
          requestId: 'req_test3',
          timestamp: new Date('2026-01-24T12:00:00Z'),
          route: '/auth/login',
          method: 'POST',
          statusCode: 401,
          durationMs: 15,
          eventName: 'auth.login.failure',
          sampled: true,
          sampleReason: 'error',
          error: {
            category: 'auth',
            code: 'INVALID_CREDENTIALS',
            messageSafe: 'Invalid email or password'
          }
        },
        {
          requestId: 'req_test4',
          timestamp: new Date('2026-01-24T13:00:00Z'),
          route: '/notes/123',
          method: 'DELETE',
          statusCode: 500,
          durationMs: 100,
          userId: adminUserId,
          eventName: 'note.delete.error',
          sampled: true,
          sampleReason: 'error',
          error: {
            category: 'server',
            code: 'DATABASE_ERROR',
            messageSafe: 'Failed to delete note'
          }
        }
      ]);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/admin/logs');

      expect(res.statusCode).toBe(401);
    });

    it('should reject regular users (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return logs for admin users', async () => {
      const res = await request(app)
        .get('/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(res.body.limit).toBeDefined();
      expect(res.body.skip).toBeDefined();
    });

    it('should filter by eventName', async () => {
      // Search for logs containing "auth" in event name
      // Note: eventName may use dots or underscores depending on how it was created
      const res = await request(app)
        .get('/admin/logs?eventName=auth')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
      res.body.logs.forEach(log => {
        // Event name should contain "auth" (case-insensitive)
        expect(log.eventName.toLowerCase()).toContain('auth');
      });
    });

    it('should filter by statusCode', async () => {
      const res = await request(app)
        .get('/admin/logs?statusCode=401')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.logs.forEach(log => {
        expect(log.statusCode).toBe(401);
      });
    });

    it('should filter by status code range (minStatusCode/maxStatusCode)', async () => {
      const res = await request(app)
        .get('/admin/logs?minStatusCode=400&maxStatusCode=599')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.logs.forEach(log => {
        expect(log.statusCode).toBeGreaterThanOrEqual(400);
        expect(log.statusCode).toBeLessThanOrEqual(599);
      });
    });

    it('should filter by userId', async () => {
      const res = await request(app)
        .get(`/admin/logs?userId=${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.logs.forEach(log => {
        expect(log.userId).toBe(adminUserId);
      });
    });

    it('should filter by hasError=true', async () => {
      const res = await request(app)
        .get('/admin/logs?hasError=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.logs.forEach(log => {
        expect(log.error).toBeDefined();
        expect(log.error.code).toBeDefined();
      });
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/admin/logs?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBeLessThanOrEqual(2);
      expect(res.body.limit).toBe(2);
    });

    it('should respect skip parameter for pagination', async () => {
      // Get first page
      const page1 = await request(app)
        .get('/admin/logs?limit=2&skip=0')
        .set('Authorization', `Bearer ${adminToken}`);

      // Get second page
      const page2 = await request(app)
        .get('/admin/logs?limit=2&skip=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.statusCode).toBe(200);
      expect(page2.statusCode).toBe(200);

      // Pages should have different logs (if there are enough)
      if (page1.body.logs.length > 0 && page2.body.logs.length > 0) {
        expect(page1.body.logs[0].requestId).not.toBe(page2.body.logs[0].requestId);
      }
    });

    it('should enforce maximum limit of 100', async () => {
      const res = await request(app)
        .get('/admin/logs?limit=500')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.limit).toBeLessThanOrEqual(100);
    });

    it('should filter by date range (from/to)', async () => {
      const res = await request(app)
        .get('/admin/logs?from=2026-01-24T11:00:00Z&to=2026-01-24T12:30:00Z')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      res.body.logs.forEach(log => {
        const timestamp = new Date(log.timestamp);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(new Date('2026-01-24T11:00:00Z').getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(new Date('2026-01-24T12:30:00Z').getTime());
      });
    });

    it('should sort by timestamp descending by default (newest first)', async () => {
      const res = await request(app)
        .get('/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      if (res.body.logs.length > 1) {
        const timestamps = res.body.logs.map(log => new Date(log.timestamp).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });

    it('should find log by requestId', async () => {
      const res = await request(app)
        .get('/admin/logs?requestId=req_test1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBe(1);
      expect(res.body.logs[0].requestId).toBe('req_test1');
    });
  });

  // =============================================================================
  // GET /admin/logs/:requestId - Get Single Log
  // =============================================================================
  // Retrieves complete details for a specific API request log.

  describe('GET /admin/logs/:requestId', () => {
    let testLogRequestId;

    beforeEach(async () => {
      // Create a test log to retrieve
      const log = await Log.create({
        requestId: 'req_single_test',
        timestamp: new Date(),
        route: '/notes',
        method: 'POST',
        statusCode: 201,
        durationMs: 50,
        userId: adminUserId,
        eventName: 'note.create.success',
        sampled: true,
        sampleReason: 'mutation',
        entityIds: { noteId: 'note_xyz789' }
      });
      testLogRequestId = log.requestId;
    });

    it('should require authentication', async () => {
      const res = await request(app).get(`/admin/logs/${testLogRequestId}`);

      expect(res.statusCode).toBe(401);
    });

    it('should reject regular users (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/admin/logs/${testLogRequestId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return log details for admin', async () => {
      const res = await request(app)
        .get(`/admin/logs/${testLogRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.log).toBeDefined();
      expect(res.body.log.requestId).toBe(testLogRequestId);
      expect(res.body.log.route).toBe('/notes');
      expect(res.body.log.method).toBe('POST');
      expect(res.body.log.statusCode).toBe(201);
      expect(res.body.log.eventName).toBe('note.create.success');
    });

    it('should return 404 for non-existent requestId', async () => {
      const res = await request(app)
        .get('/admin/logs/req_nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe('LOG_NOT_FOUND');
    });

    it('should include entityIds in response', async () => {
      const res = await request(app)
        .get(`/admin/logs/${testLogRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.log.entityIds).toBeDefined();
      expect(res.body.log.entityIds.noteId).toBe('note_xyz789');
    });
  });

  // =============================================================================
  // GET /admin/logs/stats/summary - Log Statistics
  // =============================================================================
  // Returns aggregate statistics about logs.

  describe('GET /admin/logs/stats/summary', () => {
    beforeEach(async () => {
      // Create logs for statistics testing
      await Log.create([
        {
          requestId: 'req_stat1',
          timestamp: new Date(),
          route: '/notes',
          method: 'GET',
          statusCode: 200,
          durationMs: 50,
          eventName: 'note.list.success',
          sampled: true,
          sampleReason: 'random'
        },
        {
          requestId: 'req_stat2',
          timestamp: new Date(),
          route: '/tasks',
          method: 'POST',
          statusCode: 201,
          durationMs: 100,
          eventName: 'task.create.success',
          sampled: true,
          sampleReason: 'mutation'
        },
        {
          requestId: 'req_stat3',
          timestamp: new Date(),
          route: '/auth/login',
          method: 'POST',
          statusCode: 401,
          durationMs: 20,
          eventName: 'auth.login.failure',
          sampled: true,
          sampleReason: 'error',
          error: { code: 'INVALID_CREDENTIALS' }
        },
        {
          requestId: 'req_stat4',
          timestamp: new Date(),
          route: '/notes',
          method: 'DELETE',
          statusCode: 500,
          durationMs: 200,
          eventName: 'note.delete.error',
          sampled: true,
          sampleReason: 'error',
          error: { code: 'DATABASE_ERROR' }
        }
      ]);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/admin/logs/stats/summary');

      expect(res.statusCode).toBe(401);
    });

    it('should reject regular users (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/logs/stats/summary')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return statistics for admin', async () => {
      const res = await request(app)
        .get('/admin/logs/stats/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      // Stats are nested under 'summary' object
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalRequests).toBeDefined();
      expect(res.body.statusDistribution).toBeDefined();
      expect(res.body.topEvents).toBeDefined();
      expect(res.body.recentErrors).toBeDefined();
    });

    it('should filter statistics by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/admin/logs/stats/summary?from=${today}T00:00:00Z`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalRequests).toBeDefined();
    });
  });

  // =============================================================================
  // Integration Tests - Log Flow
  // =============================================================================
  // Test the complete flow of creating client errors and viewing them as admin.

  describe('Log Flow Integration', () => {
    it('should allow admin to find client errors that were logged', async () => {
      // Step 1: Create a client error (simulating frontend error)
      const errorRes = await request(app)
        .post('/logs/client-error')
        .send({
          errorType: 'JavaScriptError',
          message: 'Integration test error',
          url: 'https://app.mybrain.com/test'
        });

      expect(errorRes.statusCode).toBe(201);
      const clientRequestId = errorRes.body.requestId;

      // Step 2: Admin searches for the error
      const searchRes = await request(app)
        .get(`/admin/logs?requestId=${clientRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(searchRes.statusCode).toBe(200);
      expect(searchRes.body.logs.length).toBe(1);
      expect(searchRes.body.logs[0].eventName).toBe('client.JavaScriptError');

      // Step 3: Admin views the full error details
      const detailRes = await request(app)
        .get(`/admin/logs/${clientRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.body.log.error.messageSafe).toBe('Integration test error');
    });

    it('should track client errors with method=CLIENT', async () => {
      await request(app)
        .post('/logs/client-error')
        .send({
          errorType: 'NetworkError',
          message: 'API request failed'
        });

      // Verify method is CLIENT (not a real HTTP method)
      const searchRes = await request(app)
        .get('/admin/logs?eventName=client.NetworkError')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(searchRes.statusCode).toBe(200);
      if (searchRes.body.logs.length > 0) {
        expect(searchRes.body.logs[0].method).toBe('CLIENT');
      }
    });
  });
});
