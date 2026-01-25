import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import SidebarConfig from '../models/SidebarConfig.js';

describe('Settings Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'settings@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'settings@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;

    // Clean up any existing sidebar config before each test
    await SidebarConfig.deleteMany({});
  });

  describe('GET /settings/sidebar', () => {
    it('should return sidebar configuration for authenticated user', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.sections).toBeDefined();
      expect(Array.isArray(res.body.sections)).toBe(true);
    });

    it('should return default sidebar items when no config exists', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check that default items are present
      const items = res.body.items;
      const dashboardItem = items.find(item => item.key === 'dashboard');
      expect(dashboardItem).toBeDefined();
      expect(dashboardItem.label).toBe('Dashboard');
      expect(dashboardItem.path).toBe('/app');

      const notesItem = items.find(item => item.key === 'notes');
      expect(notesItem).toBeDefined();
      expect(notesItem.label).toBe('Notes');

      const tasksItem = items.find(item => item.key === 'tasks');
      expect(tasksItem).toBeDefined();
      expect(tasksItem.label).toBe('Tasks');
    });

    it('should return default sections when no config exists', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check that default sections are present
      const sections = res.body.sections;
      const mainSection = sections.find(section => section.key === 'main');
      expect(mainSection).toBeDefined();
      expect(mainSection.label).toBe('Main');

      const workingMemorySection = sections.find(section => section.key === 'working-memory');
      expect(workingMemorySection).toBeDefined();
      expect(workingMemorySection.label).toBe('Working Memory');
    });

    it('should return correct sidebar item structure', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check that items have required fields
      const items = res.body.items;
      items.forEach(item => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('section');
        expect(item).toHaveProperty('order');
        expect(item).toHaveProperty('visible');
      });
    });

    it('should return correct sidebar section structure', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check that sections have required fields
      const sections = res.body.sections;
      sections.forEach(section => {
        expect(section).toHaveProperty('key');
        expect(section).toHaveProperty('label');
        expect(section).toHaveProperty('order');
        expect(section).toHaveProperty('collapsible');
      });
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/settings/sidebar');

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', 'NotBearer ' + authToken);

      expect(res.statusCode).toBe(401);
    });

    it('should return existing config if already created', async () => {
      // First request creates default config
      const res1 = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.statusCode).toBe(200);

      // Second request should return same config
      const res2 = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.items.length).toBe(res1.body.items.length);
      expect(res2.body.sections.length).toBe(res1.body.sections.length);
    });

    it('should include items with feature flags', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Projects requires projectsEnabled feature flag
      const projectsItem = res.body.items.find(item => item.key === 'projects');
      expect(projectsItem).toBeDefined();
      expect(projectsItem.featureFlag).toBe('projectsEnabled');

      // Calendar requires calendarEnabled feature flag
      const calendarItem = res.body.items.find(item => item.key === 'calendar');
      expect(calendarItem).toBeDefined();
      expect(calendarItem.featureFlag).toBe('calendarEnabled');
    });

    it('should include admin items with requiresAdmin flag', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Admin panel requires admin role
      const adminItem = res.body.items.find(item => item.key === 'admin');
      expect(adminItem).toBeDefined();
      expect(adminItem.requiresAdmin).toBe(true);
      expect(adminItem.section).toBe('admin');
    });

    it('should have items sorted by section and order', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      // Check that main section items have correct order
      const mainItems = res.body.items.filter(item => item.section === 'main');
      const sortedMainItems = [...mainItems].sort((a, b) => a.order - b.order);

      expect(mainItems[0].key).toBe(sortedMainItems[0].key);
    });
  });

  describe('Authentication edge cases', () => {
    it('should reject expired token', async () => {
      // Using an expired token (crafted to look like JWT but invalid)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.invalid_signature';

      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with empty Authorization header', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', '');

      expect(res.statusCode).toBe(401);
    });

    it('should reject request with Bearer but no token', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', 'Bearer ');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Sidebar configuration consistency', () => {
    it('should return consistent updatedAt field', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.updatedAt).toBeDefined();

      // updatedAt should be a valid date string
      const updatedAtDate = new Date(res.body.updatedAt);
      expect(updatedAtDate).toBeInstanceOf(Date);
      expect(isNaN(updatedAtDate.getTime())).toBe(false);
    });

    it('should return all expected default sections', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      const expectedSections = ['main', 'working-memory', 'social', 'categories', 'beta', 'admin'];
      const actualSectionKeys = res.body.sections.map(s => s.key);

      expectedSections.forEach(sectionKey => {
        expect(actualSectionKeys).toContain(sectionKey);
      });
    });

    it('should return all expected main navigation items', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      const expectedMainItems = ['dashboard', 'today', 'inbox'];
      const mainItems = res.body.items.filter(item => item.section === 'main');
      const mainItemKeys = mainItems.map(i => i.key);

      expectedMainItems.forEach(itemKey => {
        expect(mainItemKeys).toContain(itemKey);
      });
    });

    it('should return all expected working memory items', async () => {
      const res = await request(app)
        .get('/settings/sidebar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      const expectedWorkingMemoryItems = ['notes', 'tasks', 'projects', 'images', 'files', 'calendar'];
      const workingMemoryItems = res.body.items.filter(item => item.section === 'working-memory');
      const workingMemoryItemKeys = workingMemoryItems.map(i => i.key);

      expectedWorkingMemoryItems.forEach(itemKey => {
        expect(workingMemoryItemKeys).toContain(itemKey);
      });
    });
  });
});
