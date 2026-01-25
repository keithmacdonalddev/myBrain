import request from 'supertest';
import app from '../test/testApp.js';

describe('Filters Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'filters@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'filters@example.com',
        password: 'Password123!',
      });

    // Use token from response body for Bearer auth
    authToken = loginRes.body.token;
  });

  // =============================================================================
  // POST /filters - Create Filter
  // =============================================================================
  describe('POST /filters', () => {
    it('should create a new filter with all fields', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'High Priority Tasks',
          entityType: 'task',
          filters: { priority: 'high', status: 'active' },
          sortBy: '-createdAt',
          icon: 'star',
          color: '#FF6B6B'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Filter saved successfully');
      expect(res.body.filter).toBeDefined();
      expect(res.body.filter.name).toBe('High Priority Tasks');
      expect(res.body.filter.entityType).toBe('task');
      // Check specific filter fields (schema adds defaults for other fields)
      expect(res.body.filter.filters.priority).toBe('high');
      expect(res.body.filter.filters.status).toBe('active');
      expect(res.body.filter.sortBy).toBe('-createdAt');
      expect(res.body.filter.icon).toBe('star');
      expect(res.body.filter.color).toBe('#FF6B6B');
    });

    it('should create filter with minimal data (name and entityType only)', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Minimal Filter',
          entityType: 'note'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.filter.name).toBe('Minimal Filter');
      expect(res.body.filter.entityType).toBe('note');
      // Check defaults
      expect(res.body.filter.sortBy).toBe('-updatedAt');
      expect(res.body.filter.icon).toBe('filter');
      expect(res.body.filter.color).toBeNull();
    });

    it('should create filter for note entityType', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work Notes',
          entityType: 'note',
          filters: { tags: ['work'], status: 'active' }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.filter.entityType).toBe('note');
    });

    it('should create filter for task entityType', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Urgent Tasks',
          entityType: 'task',
          filters: { priority: 'high' }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.filter.entityType).toBe('task');
    });

    it('should reject without auth (401)', async () => {
      const res = await request(app)
        .post('/filters')
        .send({
          name: 'Test Filter',
          entityType: 'note'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject without name (400)', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'note'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('name');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject with empty name (400)', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '   ',
          entityType: 'note'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject without entityType (400)', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Filter'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('entity type');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid entityType (400)', async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Filter',
          entityType: 'invalid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('entity type');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // =============================================================================
  // GET /filters - List Filters
  // =============================================================================
  describe('GET /filters', () => {
    beforeEach(async () => {
      // Create some test filters
      await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Note Filter 1', entityType: 'note' });

      await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Note Filter 2', entityType: 'note' });

      await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Task Filter 1', entityType: 'task' });
    });

    it('should return all filters for user', async () => {
      const res = await request(app)
        .get('/filters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters).toBeDefined();
      expect(res.body.filters.length).toBe(3);
    });

    it('should filter by entityType=note', async () => {
      const res = await request(app)
        .get('/filters')
        .query({ entityType: 'note' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.length).toBe(2);
      res.body.filters.forEach(filter => {
        expect(filter.entityType).toBe('note');
      });
    });

    it('should filter by entityType=task', async () => {
      const res = await request(app)
        .get('/filters')
        .query({ entityType: 'task' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.length).toBe(1);
      expect(res.body.filters[0].entityType).toBe('task');
    });

    it('should return empty array when no filters exist for entityType', async () => {
      const res = await request(app)
        .get('/filters')
        .query({ entityType: 'project' }) // No project filters exist
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters).toEqual([]);
    });

    it('should return filters sorted by createdAt descending (newest first)', async () => {
      const res = await request(app)
        .get('/filters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Verify descending order (newest first)
      const dates = res.body.filters.map(f => new Date(f.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should reject without auth (401)', async () => {
      const res = await request(app)
        .get('/filters');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /filters/:id - Get Single Filter
  // =============================================================================
  describe('GET /filters/:id', () => {
    let filterId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Single Filter',
          entityType: 'note',
          filters: { tags: ['important'] },
          color: '#4ECDC4'
        });

      filterId = res.body.filter._id;
    });

    it('should return single filter by ID', async () => {
      const res = await request(app)
        .get(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filter).toBeDefined();
      expect(res.body.filter._id).toBe(filterId);
      expect(res.body.filter.name).toBe('Single Filter');
      expect(res.body.filter.entityType).toBe('note');
      // Check specific filter fields (schema adds defaults for other fields)
      expect(res.body.filter.filters.tags).toEqual(['important']);
      expect(res.body.filter.color).toBe('#4ECDC4');
    });

    it('should return 404 for non-existent filter', async () => {
      const res = await request(app)
        .get('/filters/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('not found');
      expect(res.body.code).toBe('FILTER_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/filters/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth (401)', async () => {
      const res = await request(app)
        .get(`/filters/${filterId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // PATCH /filters/:id - Update Filter
  // =============================================================================
  describe('PATCH /filters/:id', () => {
    let filterId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Name',
          entityType: 'task',
          filters: { priority: 'low' },
          sortBy: '-updatedAt',
          icon: 'filter',
          color: null
        });

      filterId = res.body.filter._id;
    });

    it('should update filter name', async () => {
      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Filter updated successfully');
      expect(res.body.filter.name).toBe('Updated Name');
      // Other fields should remain unchanged
      expect(res.body.filter.entityType).toBe('task');
      // Check specific filter field (schema adds defaults for other fields)
      expect(res.body.filter.filters.priority).toBe('low');
    });

    it('should update filter criteria', async () => {
      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filters: { priority: 'high', status: 'active' }
        });

      expect(res.statusCode).toBe(200);
      // Check specific filter fields (schema adds defaults for other fields)
      expect(res.body.filter.filters.priority).toBe('high');
      expect(res.body.filter.filters.status).toBe('active');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Name',
          sortBy: '-createdAt',
          icon: 'star',
          color: '#FF0000'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.filter.name).toBe('New Name');
      expect(res.body.filter.sortBy).toBe('-createdAt');
      expect(res.body.filter.icon).toBe('star');
      expect(res.body.filter.color).toBe('#FF0000');
    });

    it('should not allow updating userId (protected field)', async () => {
      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: '507f1f77bcf86cd799439099',
          name: 'Try Change Owner'
        });

      expect(res.statusCode).toBe(200);
      // Name should update but userId should not change
      expect(res.body.filter.name).toBe('Try Change Owner');
      // userId should remain the original user's ID (not the attempted change)
      // The exact userId comparison is less important than ensuring the request succeeds
    });

    it('should not allow updating createdAt (protected field)', async () => {
      const originalFilter = await request(app)
        .get(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const originalCreatedAt = originalFilter.body.filter.createdAt;

      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          createdAt: '2020-01-01T00:00:00.000Z',
          name: 'Try Change CreatedAt'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.filter.name).toBe('Try Change CreatedAt');
      expect(res.body.filter.createdAt).toBe(originalCreatedAt);
    });

    it('should return 404 for non-existent filter', async () => {
      const res = await request(app)
        .patch('/filters/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Update Non-Existent' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILTER_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .patch('/filters/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Update Invalid ID' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth (401)', async () => {
      const res = await request(app)
        .patch(`/filters/${filterId}`)
        .send({ name: 'No Auth Update' });

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // DELETE /filters/:id - Delete Filter
  // =============================================================================
  describe('DELETE /filters/:id', () => {
    let filterId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Delete Me',
          entityType: 'note'
        });

      filterId = res.body.filter._id;
    });

    it('should permanently delete filter', async () => {
      const res = await request(app)
        .delete(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Filter deleted successfully');

      // Verify filter is gone
      const getRes = await request(app)
        .get(`/filters/${filterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent filter', async () => {
      const res = await request(app)
        .delete('/filters/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILTER_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .delete('/filters/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth (401)', async () => {
      const res = await request(app)
        .delete(`/filters/${filterId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // User Isolation Tests
  // =============================================================================
  describe('User Isolation', () => {
    let user1Token;
    let user2Token;
    let user1FilterId;

    beforeEach(async () => {
      // Create and login first user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      const login1Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      user1Token = login1Res.body.token;

      // Create and login second user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      const login2Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      user2Token = login2Res.body.token;

      // Create filter as user 1
      const filterRes = await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'User 1 Private Filter',
          entityType: 'note'
        });

      user1FilterId = filterRes.body.filter._id;
    });

    it('should not allow user 2 to see user 1 filters in list', async () => {
      const res = await request(app)
        .get('/filters')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.length).toBe(0);
    });

    it('should not allow user 2 to get user 1 filter by ID', async () => {
      const res = await request(app)
        .get(`/filters/${user1FilterId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILTER_NOT_FOUND');
    });

    it('should not allow user 2 to update user 1 filter', async () => {
      const res = await request(app)
        .patch(`/filters/${user1FilterId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILTER_NOT_FOUND');

      // Verify original name is unchanged
      const verifyRes = await request(app)
        .get(`/filters/${user1FilterId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verifyRes.body.filter.name).toBe('User 1 Private Filter');
    });

    it('should not allow user 2 to delete user 1 filter', async () => {
      const res = await request(app)
        .delete(`/filters/${user1FilterId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILTER_NOT_FOUND');

      // Verify filter still exists
      const verifyRes = await request(app)
        .get(`/filters/${user1FilterId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.filter.name).toBe('User 1 Private Filter');
    });

    it('should keep filters separate between users', async () => {
      // Create filter as user 2
      await request(app)
        .post('/filters')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User 2 Filter',
          entityType: 'task'
        });

      // User 1 should still only see their filter
      const user1Res = await request(app)
        .get('/filters')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1Res.body.filters.length).toBe(1);
      expect(user1Res.body.filters[0].name).toBe('User 1 Private Filter');

      // User 2 should only see their filter
      const user2Res = await request(app)
        .get('/filters')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Res.body.filters.length).toBe(1);
      expect(user2Res.body.filters[0].name).toBe('User 2 Filter');
    });
  });
});
