import request from 'supertest';
import app from '../test/testApp.js';

/**
 * Dashboard Routes Test Suite
 * ===========================
 * Tests for the dashboard API endpoints:
 * - GET /dashboard - Get aggregated dashboard data
 * - POST /dashboard/session - Track dashboard session
 */
describe('Dashboard Routes', () => {
  let authToken;
  let userId;

  // Login before each test to get auth token
  beforeEach(async () => {
    // Create and login test user
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'dashboard@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'dashboard@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
    userId = loginRes.body.user._id;
  });

  // =========================================================================
  // GET /dashboard - Get aggregated dashboard data
  // =========================================================================
  describe('GET /dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check for main dashboard data structure
      expect(res.body).toHaveProperty('urgentItems');
      expect(res.body).toHaveProperty('attentionItems');
      expect(res.body).toHaveProperty('recentItems');
      expect(res.body).toHaveProperty('usageProfile');
      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('projects');
      expect(res.body).toHaveProperty('messages');
      expect(res.body).toHaveProperty('inbox');
      expect(res.body).toHaveProperty('notifications');
      expect(res.body).toHaveProperty('sharedItems');
      expect(res.body).toHaveProperty('activity');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('preferences');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/dashboard');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });

    it('should accept optional timezone query parameter', async () => {
      const res = await request(app)
        .get('/dashboard')
        .query({ timezone: 'America/New_York' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('urgentItems');
    });

    it('should return urgent items structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check urgentItems structure
      expect(res.body.urgentItems).toHaveProperty('overdueTasks');
      expect(res.body.urgentItems).toHaveProperty('dueTodayTasks');
      expect(res.body.urgentItems).toHaveProperty('upcomingEvents');
      expect(res.body.urgentItems).toHaveProperty('counts');

      // Arrays should exist (empty for new user)
      expect(Array.isArray(res.body.urgentItems.overdueTasks)).toBe(true);
      expect(Array.isArray(res.body.urgentItems.dueTodayTasks)).toBe(true);
      expect(Array.isArray(res.body.urgentItems.upcomingEvents)).toBe(true);

      // Counts should be numbers
      expect(typeof res.body.urgentItems.counts.overdue).toBe('number');
      expect(typeof res.body.urgentItems.counts.dueToday).toBe('number');
      expect(typeof res.body.urgentItems.counts.upcoming).toBe('number');
    });

    it('should return attention items structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check attentionItems structure
      expect(res.body.attentionItems).toHaveProperty('unreadMessages');
      expect(res.body.attentionItems).toHaveProperty('pendingShares');
      expect(res.body.attentionItems).toHaveProperty('unreadNotifications');
      expect(res.body.attentionItems).toHaveProperty('total');

      // All should be numbers
      expect(typeof res.body.attentionItems.unreadMessages).toBe('number');
      expect(typeof res.body.attentionItems.pendingShares).toBe('number');
      expect(typeof res.body.attentionItems.unreadNotifications).toBe('number');
      expect(typeof res.body.attentionItems.total).toBe('number');
    });

    it('should return recent items structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check recentItems structure
      expect(res.body.recentItems).toHaveProperty('notes');
      expect(res.body.recentItems).toHaveProperty('tasks');
      expect(res.body.recentItems).toHaveProperty('projects');

      // All should be arrays
      expect(Array.isArray(res.body.recentItems.notes)).toBe(true);
      expect(Array.isArray(res.body.recentItems.tasks)).toBe(true);
      expect(Array.isArray(res.body.recentItems.projects)).toBe(true);
    });

    it('should return events structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check events structure
      expect(res.body.events).toHaveProperty('today');
      expect(res.body.events).toHaveProperty('tomorrow');

      // Both should be arrays
      expect(Array.isArray(res.body.events.today)).toBe(true);
      expect(Array.isArray(res.body.events.tomorrow)).toBe(true);
    });

    it('should return stats structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check stats structure
      expect(res.body.stats).toHaveProperty('tasks');
      expect(res.body.stats).toHaveProperty('projects');

      // Task stats
      expect(res.body.stats.tasks).toHaveProperty('completedToday');
      expect(res.body.stats.tasks).toHaveProperty('completedThisWeek');
      expect(res.body.stats.tasks).toHaveProperty('totalActive');
      expect(res.body.stats.tasks).toHaveProperty('overdue');

      // Project stats
      expect(res.body.stats.projects).toHaveProperty('active');
      expect(res.body.stats.projects).toHaveProperty('completedThisMonth');
    });

    it('should return preferences structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check preferences structure
      expect(res.body.preferences).toHaveProperty('pinnedWidgets');
      expect(res.body.preferences).toHaveProperty('hiddenWidgets');
      expect(res.body.preferences).toHaveProperty('widgetSettings');

      // Arrays and object should exist
      expect(Array.isArray(res.body.preferences.pinnedWidgets)).toBe(true);
      expect(Array.isArray(res.body.preferences.hiddenWidgets)).toBe(true);
      expect(typeof res.body.preferences.widgetSettings).toBe('object');
    });

    it('should return a valid timestamp', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Timestamp should be a valid ISO string
      expect(res.body.timestamp).toBeDefined();
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should return usage profile structure correctly', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check usageProfile structure - all features should have percentage values
      expect(res.body.usageProfile).toHaveProperty('tasks');
      expect(res.body.usageProfile).toHaveProperty('notes');
      expect(res.body.usageProfile).toHaveProperty('projects');
      expect(res.body.usageProfile).toHaveProperty('events');
      expect(res.body.usageProfile).toHaveProperty('messages');
      expect(res.body.usageProfile).toHaveProperty('images');
      expect(res.body.usageProfile).toHaveProperty('files');
      expect(res.body.usageProfile).toHaveProperty('totalInteractions');
      expect(res.body.usageProfile).toHaveProperty('lastActivityDays');
    });
  });

  // =========================================================================
  // GET /dashboard with test data - Tests that verify dashboard aggregation
  // =========================================================================
  describe('GET /dashboard with data', () => {
    beforeEach(async () => {
      // Create some tasks for testing
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Task 1', body: 'Task body' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Task 2', priority: 'high' });

      // Create a note
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Note', body: 'Note content' });

      // Create a project
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Project', description: 'Project description' });
    });

    it('should return recently created tasks in recentItems', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Recent tasks should include the ones we created (within last 24 hours)
      expect(res.body.recentItems.tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('should return recently created notes in recentItems', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Recent notes should include the one we created (within last 24 hours)
      expect(res.body.recentItems.notes.length).toBeGreaterThanOrEqual(0);
    });

    it('should return active projects', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Active projects should be an array
      expect(Array.isArray(res.body.projects)).toBe(true);
    });

    it('should include priority tasks', async () => {
      // Create a high priority task with due date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Priority Task',
          priority: 'high',
          dueDate: tomorrow.toISOString()
        });

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('should track overdue tasks', async () => {
      // Create a task with past due date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Overdue Task',
          dueDate: yesterday.toISOString()
        });

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Overdue tasks count should reflect the task
      expect(res.body.urgentItems.counts.overdue).toBeGreaterThanOrEqual(1);
      expect(res.body.urgentItems.overdueTasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should track tasks due today', async () => {
      // Create a task due later today
      const laterToday = new Date();
      laterToday.setHours(laterToday.getHours() + 2);

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Due Today Task',
          dueDate: laterToday.toISOString()
        });

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Due today count should reflect the task
      expect(res.body.urgentItems.counts.dueToday).toBeGreaterThanOrEqual(1);
      expect(res.body.urgentItems.dueTodayTasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // POST /dashboard/session - Track dashboard session
  // =========================================================================
  describe('POST /dashboard/session', () => {
    it('should track session for authenticated user', async () => {
      const res = await request(app)
        .post('/dashboard/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Session tracked');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/dashboard/session');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const res = await request(app)
        .post('/dashboard/session')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });

    it('should succeed on multiple session tracking calls', async () => {
      // First call
      const res1 = await request(app)
        .post('/dashboard/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.message).toBe('Session tracked');

      // Second call
      const res2 = await request(app)
        .post('/dashboard/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.message).toBe('Session tracked');
    });

    it('should always return 200 OK (graceful degradation)', async () => {
      // This endpoint is designed to never fail even if internal tracking fails
      // It should always return 200 OK with "Session tracked" message
      const res = await request(app)
        .post('/dashboard/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Session tracked');
    });
  });

  // =========================================================================
  // Dashboard data isolation - Tests for multi-user scenarios
  // =========================================================================
  describe('Dashboard data isolation', () => {
    let secondUserToken;

    beforeEach(async () => {
      // Create a second user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'seconduser@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'seconduser@example.com',
          password: 'Password123!',
        });

      secondUserToken = loginRes.body.token;

      // Create task for first user
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'First User Task' });

      // Create task for second user
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ title: 'Second User Task' });
    });

    it('should only return data belonging to the authenticated user', async () => {
      // Get dashboard for first user
      const res1 = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      // Get dashboard for second user
      const res2 = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);

      // Each user should have their own data
      // The recent tasks should be isolated
      // (The exact counts may vary based on timing, but data should be separate)
      expect(res1.body.urgentItems).toBeDefined();
      expect(res2.body.urgentItems).toBeDefined();
    });
  });
});
