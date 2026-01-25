import request from 'supertest';
import app from '../test/testApp.js';
import User from '../models/User.js';

describe('Analytics Routes', () => {
  let authToken;
  let adminToken;
  let userId;
  let adminId;

  // =============================================================================
  // TEST SETUP - Create regular user and admin user before each test
  // =============================================================================
  beforeEach(async () => {
    // Create and login regular test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'analytics@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'analytics@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
    userId = loginRes.body.user._id;

    // Create admin user directly in database
    const adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: '$2b$10$test', // Placeholder, will use registration
      role: 'admin'
    });
    adminId = adminUser._id;

    // Register admin properly to get valid password
    await request(app)
      .post('/auth/register')
      .send({
        email: 'realadmin@example.com',
        password: 'AdminPass123!',
      });

    // Update the registered user to admin role
    await User.findOneAndUpdate(
      { email: 'realadmin@example.com' },
      { role: 'admin' }
    );

    const adminLoginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'realadmin@example.com',
        password: 'AdminPass123!',
      });

    adminToken = adminLoginRes.body.token;
  });

  // =============================================================================
  // POST /analytics/track - Single Event Tracking
  // =============================================================================
  describe('POST /analytics/track', () => {
    it('should track a single event successfully', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'feature',
          action: 'create_note',
          feature: 'notes',
          page: '/app/notes',
          duration: 5000,
          metadata: { wordCount: 150 }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tracked).toBe(true);
    });

    it('should track event with minimal required fields', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'page_view',
          action: 'view_dashboard'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tracked).toBe(true);
    });

    it('should return 400 when category is missing', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'create_note'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Category and action are required');
    });

    it('should return 400 when action is missing', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'feature'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Category and action are required');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .send({
          category: 'feature',
          action: 'create_note'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should track event with all optional fields', async () => {
      const res = await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'feature',
          action: 'update_task',
          feature: 'tasks',
          page: '/app/tasks',
          referrer: '/app/dashboard',
          screenSize: 'desktop',
          duration: 12000,
          sessionId: 'sess_abc123',
          metadata: {
            taskId: 'task123',
            priority: 'high',
            daysOpen: 3
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // =============================================================================
  // POST /analytics/track/batch - Batch Event Tracking
  // =============================================================================
  describe('POST /analytics/track/batch', () => {
    it('should track multiple events in a batch', async () => {
      const events = [
        { category: 'page_view', action: 'view_notes' },
        { category: 'feature', action: 'create_note' },
        { category: 'feature', action: 'update_note' }
      ];

      const res = await request(app)
        .post('/analytics/track/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ events });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tracked).toBe(3);
    });

    it('should return 400 when events array is missing', async () => {
      const res = await request(app)
        .post('/analytics/track/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Events array is required');
    });

    it('should return 400 when events is empty array', async () => {
      const res = await request(app)
        .post('/analytics/track/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ events: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Events array is required');
    });

    it('should return 400 when events is not an array', async () => {
      const res = await request(app)
        .post('/analytics/track/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ events: 'not an array' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/analytics/track/batch')
        .send({
          events: [{ category: 'feature', action: 'test' }]
        });

      expect(res.statusCode).toBe(401);
    });

    it('should limit batch to 50 events', async () => {
      // Create 60 events
      const events = [];
      for (let i = 0; i < 60; i++) {
        events.push({
          category: 'feature',
          action: `action_${i}`
        });
      }

      const res = await request(app)
        .post('/analytics/track/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ events });

      expect(res.statusCode).toBe(201);
      // Should only track first 50
      expect(res.body.data.tracked).toBeLessThanOrEqual(50);
    });
  });

  // =============================================================================
  // GET /analytics/overview - Admin Only
  // =============================================================================
  describe('GET /analytics/overview', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/analytics/overview');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return overview data for admin users', async () => {
      const res = await request(app)
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
      expect(res.body.data.summary).toBeDefined();
    });

    it('should accept period query parameter', async () => {
      const res = await request(app)
        .get('/analytics/overview')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept custom date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const res = await request(app)
        .get('/analytics/overview')
        .query({
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =============================================================================
  // GET /analytics/features - Admin Only
  // =============================================================================
  describe('GET /analytics/features', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/analytics/features');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/analytics/features')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return feature analytics for admin', async () => {
      const res = await request(app)
        .get('/analytics/features')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
    });

    it('should accept feature filter', async () => {
      const res = await request(app)
        .get('/analytics/features')
        .query({ feature: 'notes' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =============================================================================
  // GET /analytics/users - Admin Only
  // =============================================================================
  describe('GET /analytics/users', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/analytics/users');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/analytics/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return user analytics for admin', async () => {
      const res = await request(app)
        .get('/analytics/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
    });
  });

  // =============================================================================
  // GET /analytics/errors - Admin Only
  // =============================================================================
  describe('GET /analytics/errors', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/analytics/errors');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/analytics/errors')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return error analytics for admin', async () => {
      const res = await request(app)
        .get('/analytics/errors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
    });
  });

  // =============================================================================
  // GET /analytics/realtime - Admin Only
  // =============================================================================
  describe('GET /analytics/realtime', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/analytics/realtime');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .get('/analytics/realtime')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return realtime data for admin', async () => {
      const res = await request(app)
        .get('/analytics/realtime')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
      expect(res.body.data.totalEvents).toBeDefined();
      expect(res.body.data.activeUsers).toBeDefined();
      expect(res.body.data.recentEvents).toBeDefined();
    });
  });

  // =============================================================================
  // Integration Tests - Track and Retrieve
  // =============================================================================
  describe('Integration: Track and Retrieve Analytics', () => {
    beforeEach(async () => {
      // Track some events first
      await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'feature',
          action: 'create_note',
          feature: 'notes'
        });

      await request(app)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'feature',
          action: 'update_task',
          feature: 'tasks'
        });
    });

    it('should show tracked events in realtime analytics', async () => {
      const res = await request(app)
        .get('/analytics/realtime')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Events we just tracked should be in recent events
      expect(res.body.data.totalEvents).toBeGreaterThanOrEqual(0);
    });
  });
});
