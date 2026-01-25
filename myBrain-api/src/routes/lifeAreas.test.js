import request from 'supertest';
import app from '../test/testApp.js';

describe('LifeAreas Routes', () => {
  let authToken;

  // Create and login a test user before each test
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'lifeareas@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'lifeareas@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  describe('Authentication', () => {
    it('should return 401 when accessing routes without token', async () => {
      const res = await request(app).get('/life-areas');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when creating life area without token', async () => {
      const res = await request(app)
        .post('/life-areas')
        .send({ name: 'Test Area' });
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when updating life area without token', async () => {
      const res = await request(app)
        .patch('/life-areas/507f1f77bcf86cd799439011')
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when deleting life area without token', async () => {
      const res = await request(app)
        .delete('/life-areas/507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // POST /life-areas - CREATE
  // =============================================================================

  describe('POST /life-areas', () => {
    it('should create a new life area with name only', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Category created successfully');
      expect(res.body.lifeArea).toBeDefined();
      expect(res.body.lifeArea.name).toBe('Work');
      expect(res.body.lifeArea._id).toBeDefined();
    });

    it('should create a life area with all fields', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Health',
          description: 'Exercise and wellness activities',
          color: '#10b981',
          icon: 'Heart',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.lifeArea.name).toBe('Health');
      expect(res.body.lifeArea.description).toBe('Exercise and wellness activities');
      expect(res.body.lifeArea.color).toBe('#10b981');
      expect(res.body.lifeArea.icon).toBe('Heart');
    });

    it('should use default values when optional fields not provided', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Finance' });

      expect(res.statusCode).toBe(201);
      expect(res.body.lifeArea.color).toBeDefined();
      expect(res.body.lifeArea.icon).toBeDefined();
      expect(res.body.lifeArea.isArchived).toBe(false);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No name provided' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is whitespace only', async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should set incrementing order for multiple life areas', async () => {
      // Create first area
      const res1 = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Area One' });

      // Create second area
      const res2 = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Area Two' });

      // Second area should have higher order
      expect(res2.body.lifeArea.order).toBeGreaterThan(res1.body.lifeArea.order);
    });
  });

  // =============================================================================
  // GET /life-areas - LIST
  // =============================================================================

  describe('GET /life-areas', () => {
    beforeEach(async () => {
      // Create test life areas
      await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', color: '#3b82f6' });

      await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Personal', color: '#8b5cf6' });

      await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Health', color: '#10b981' });
    });

    it('should return list of life areas', async () => {
      const res = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeAreas).toBeDefined();
      expect(Array.isArray(res.body.lifeAreas)).toBe(true);
      expect(res.body.lifeAreas.length).toBe(3);
    });

    it('should return life areas sorted by order', async () => {
      const res = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Check that order is ascending
      for (let i = 1; i < res.body.lifeAreas.length; i++) {
        expect(res.body.lifeAreas[i].order).toBeGreaterThanOrEqual(
          res.body.lifeAreas[i - 1].order
        );
      }
    });

    it('should exclude archived life areas by default', async () => {
      // Archive one of the life areas
      const listRes = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      const areaToArchive = listRes.body.lifeAreas[0];

      await request(app)
        .post(`/life-areas/${areaToArchive._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      // Get life areas without includeArchived
      const res = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeAreas.length).toBe(2);
    });

    it('should include archived life areas when requested', async () => {
      // Archive one life area
      const listRes = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      const areaToArchive = listRes.body.lifeAreas[0];

      await request(app)
        .post(`/life-areas/${areaToArchive._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      // Get life areas with includeArchived=true
      const res = await request(app)
        .get('/life-areas')
        .query({ includeArchived: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeAreas.length).toBe(3);
    });
  });

  // =============================================================================
  // GET /life-areas/:id - GET SINGLE
  // =============================================================================

  describe('GET /life-areas/:id', () => {
    let lifeAreaId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Area',
          description: 'A test life area',
          color: '#ff6b6b',
          icon: 'Star',
        });

      lifeAreaId = res.body.lifeArea._id;
    });

    it('should return a single life area by ID', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea).toBeDefined();
      expect(res.body.lifeArea._id).toBe(lifeAreaId);
      expect(res.body.lifeArea.name).toBe('Test Area');
      expect(res.body.lifeArea.description).toBe('A test life area');
    });

    it('should return 404 for non-existent life area', async () => {
      const res = await request(app)
        .get('/life-areas/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('LIFE_AREA_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/life-areas/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should include counts when includeCounts is true', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}`)
        .query({ includeCounts: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.counts).toBeDefined();
      expect(typeof res.body.lifeArea.counts.notes).toBe('number');
      expect(typeof res.body.lifeArea.counts.tasks).toBe('number');
      expect(typeof res.body.lifeArea.counts.events).toBe('number');
      expect(typeof res.body.lifeArea.counts.projects).toBe('number');
    });
  });

  // =============================================================================
  // PATCH /life-areas/:id - UPDATE
  // =============================================================================

  describe('PATCH /life-areas/:id', () => {
    let lifeAreaId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Name',
          description: 'Original description',
          color: '#ff6b6b',
          icon: 'Folder',
        });

      lifeAreaId = res.body.lifeArea._id;
    });

    it('should update life area name', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Category updated successfully');
      expect(res.body.lifeArea.name).toBe('Updated Name');
    });

    it('should update life area description', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' });

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.description).toBe('Updated description');
    });

    it('should update life area color', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#10b981' });

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.color).toBe('#10b981');
    });

    it('should update life area icon', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ icon: 'Heart' });

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.icon).toBe('Heart');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Multi Update',
          color: '#3b82f6',
          icon: 'Briefcase',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.name).toBe('Multi Update');
      expect(res.body.lifeArea.color).toBe('#3b82f6');
      expect(res.body.lifeArea.icon).toBe('Briefcase');
    });

    it('should only update provided fields', async () => {
      const res = await request(app)
        .patch(`/life-areas/${lifeAreaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Only Name Updated' });

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.name).toBe('Only Name Updated');
      // Original values should remain
      expect(res.body.lifeArea.description).toBe('Original description');
      expect(res.body.lifeArea.color).toBe('#ff6b6b');
    });

    it('should return 404 for non-existent life area', async () => {
      const res = await request(app)
        .patch('/life-areas/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('LIFE_AREA_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .patch('/life-areas/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // DELETE /life-areas/:id - DELETE
  // =============================================================================

  describe('DELETE /life-areas/:id', () => {
    let defaultAreaId;
    let nonDefaultAreaId;

    beforeEach(async () => {
      // Create a life area and set it as default
      const defaultRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Default Area' });

      defaultAreaId = defaultRes.body.lifeArea._id;

      // Set it as default
      await request(app)
        .post(`/life-areas/${defaultAreaId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      // Create another non-default area
      const nonDefaultRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Non-Default Area' });

      nonDefaultAreaId = nonDefaultRes.body.lifeArea._id;
    });

    it('should delete a non-default life area', async () => {
      const res = await request(app)
        .delete(`/life-areas/${nonDefaultAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Category deleted successfully');
      expect(res.body.deletedArea).toBeDefined();
      expect(res.body.deletedArea._id).toBe(nonDefaultAreaId);
      expect(res.body.reassignedTo).toBeDefined();
    });

    it('should not delete the default life area', async () => {
      const res = await request(app)
        .delete(`/life-areas/${defaultAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('CANNOT_DELETE_DEFAULT');
    });

    it('should return 404 for non-existent life area', async () => {
      const res = await request(app)
        .delete('/life-areas/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('LIFE_AREA_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .delete('/life-areas/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should verify deleted area no longer exists', async () => {
      // Delete the area
      await request(app)
        .delete(`/life-areas/${nonDefaultAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to get it
      const res = await request(app)
        .get(`/life-areas/${nonDefaultAreaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /life-areas/:id/set-default - SET DEFAULT
  // =============================================================================

  describe('POST /life-areas/:id/set-default', () => {
    let lifeAreaId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Default Area' });

      lifeAreaId = res.body.lifeArea._id;
    });

    it('should set a life area as default', async () => {
      const res = await request(app)
        .post(`/life-areas/${lifeAreaId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Default category set successfully');
      expect(res.body.lifeArea.isDefault).toBe(true);
    });

    it('should unset previous default when setting new default', async () => {
      // Create and set first area as default
      const firstRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'First Default' });

      const firstId = firstRes.body.lifeArea._id;

      await request(app)
        .post(`/life-areas/${firstId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      // Create and set second area as default
      const secondRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Second Default' });

      const secondId = secondRes.body.lifeArea._id;

      await request(app)
        .post(`/life-areas/${secondId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check first area is no longer default
      const checkRes = await request(app)
        .get(`/life-areas/${firstId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.body.lifeArea.isDefault).toBe(false);
    });

    it('should return 404 for non-existent life area', async () => {
      const res = await request(app)
        .post('/life-areas/507f1f77bcf86cd799439011/set-default')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('LIFE_AREA_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .post('/life-areas/invalid-id/set-default')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // POST /life-areas/reorder - REORDER
  // =============================================================================

  describe('POST /life-areas/reorder', () => {
    let areaIds;

    beforeEach(async () => {
      areaIds = [];

      // Create three life areas
      for (const name of ['Area A', 'Area B', 'Area C']) {
        const res = await request(app)
          .post('/life-areas')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name });

        areaIds.push(res.body.lifeArea._id);
      }
    });

    it('should reorder life areas', async () => {
      // Reverse the order
      const reversedIds = [...areaIds].reverse();

      const res = await request(app)
        .post('/life-areas/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: reversedIds });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Categories reordered successfully');
      expect(res.body.lifeAreas).toBeDefined();
    });

    it('should apply new order correctly', async () => {
      // Reverse the order
      const reversedIds = [...areaIds].reverse();

      await request(app)
        .post('/life-areas/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: reversedIds });

      // Get all areas and check order
      const listRes = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${authToken}`);

      // First area in response should be the last from original
      const firstArea = listRes.body.lifeAreas[0];
      expect(firstArea._id).toBe(reversedIds[0]);
    });

    it('should return 400 when orderedIds is not an array', async () => {
      const res = await request(app)
        .post('/life-areas/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: 'not-an-array' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when orderedIds is empty', async () => {
      const res = await request(app)
        .post('/life-areas/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when orderedIds contains invalid IDs', async () => {
      const res = await request(app)
        .post('/life-areas/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: ['invalid-id', 'another-invalid'] });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // POST /life-areas/:id/archive - ARCHIVE/UNARCHIVE
  // =============================================================================

  describe('POST /life-areas/:id/archive', () => {
    let lifeAreaId;
    let defaultAreaId;

    beforeEach(async () => {
      // Create a default area
      const defaultRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Default Area' });

      defaultAreaId = defaultRes.body.lifeArea._id;

      await request(app)
        .post(`/life-areas/${defaultAreaId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      // Create a non-default area
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Archivable Area' });

      lifeAreaId = res.body.lifeArea._id;
    });

    it('should archive a life area', async () => {
      const res = await request(app)
        .post(`/life-areas/${lifeAreaId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Category archived');
      expect(res.body.lifeArea.isArchived).toBe(true);
    });

    it('should archive by default when isArchived not provided', async () => {
      const res = await request(app)
        .post(`/life-areas/${lifeAreaId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.lifeArea.isArchived).toBe(true);
    });

    it('should unarchive a life area', async () => {
      // First archive
      await request(app)
        .post(`/life-areas/${lifeAreaId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      // Then unarchive
      const res = await request(app)
        .post(`/life-areas/${lifeAreaId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Category unarchived');
      expect(res.body.lifeArea.isArchived).toBe(false);
    });

    it('should not archive the default life area', async () => {
      const res = await request(app)
        .post(`/life-areas/${defaultAreaId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('CANNOT_ARCHIVE_DEFAULT');
    });

    it('should return 404 for non-existent life area', async () => {
      const res = await request(app)
        .post('/life-areas/507f1f77bcf86cd799439011/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('LIFE_AREA_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .post('/life-areas/invalid-id/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isArchived: true });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // GET /life-areas/:id/items - GET ITEMS
  // =============================================================================

  describe('GET /life-areas/:id/items', () => {
    let lifeAreaId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Items Test Area' });

      lifeAreaId = res.body.lifeArea._id;
    });

    it('should return items for a life area', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}/items`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Response may contain any subset of notes, tasks, events, projects
    });

    it('should filter by item types', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}/items`)
        .query({ types: 'note,task' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should only return notes and tasks if any exist
      if (res.body.notes) expect(Array.isArray(res.body.notes)).toBe(true);
      if (res.body.tasks) expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.events).toBeUndefined();
      expect(res.body.projects).toBeUndefined();
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}/items`)
        .query({ limit: '10' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should respect skip parameter for pagination', async () => {
      const res = await request(app)
        .get(`/life-areas/${lifeAreaId}/items`)
        .query({ skip: '5' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/life-areas/invalid-id/items')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // USER ISOLATION TESTS
  // =============================================================================

  describe('User Isolation', () => {
    let user1Token;
    let user2Token;
    let user1AreaId;

    beforeEach(async () => {
      // Register and login user 1
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user1-isolation@example.com',
          password: 'Password123!',
        });

      const login1Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1-isolation@example.com',
          password: 'Password123!',
        });

      user1Token = login1Res.body.token;

      // Register and login user 2
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user2-isolation@example.com',
          password: 'Password123!',
        });

      const login2Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user2-isolation@example.com',
          password: 'Password123!',
        });

      user2Token = login2Res.body.token;

      // User 1 creates a life area
      const createRes = await request(app)
        .post('/life-areas')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'User 1 Private Area' });

      user1AreaId = createRes.body.lifeArea._id;
    });

    it('should not return other users life areas in list', async () => {
      // User 2 should not see User 1's area
      const res = await request(app)
        .get('/life-areas')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      const areaIds = res.body.lifeAreas.map(a => a._id);
      expect(areaIds).not.toContain(user1AreaId);
    });

    it('should not allow user to access another users life area', async () => {
      // User 2 tries to get User 1's area
      const res = await request(app)
        .get(`/life-areas/${user1AreaId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user to update another users life area', async () => {
      // User 2 tries to update User 1's area
      const res = await request(app)
        .patch(`/life-areas/${user1AreaId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user to delete another users life area', async () => {
      // User 2 tries to delete User 1's area
      const res = await request(app)
        .delete(`/life-areas/${user1AreaId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user to archive another users life area', async () => {
      // User 2 tries to archive User 1's area
      const res = await request(app)
        .post(`/life-areas/${user1AreaId}/archive`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ isArchived: true });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user to set another users life area as default', async () => {
      // User 2 tries to set User 1's area as default
      const res = await request(app)
        .post(`/life-areas/${user1AreaId}/set-default`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
