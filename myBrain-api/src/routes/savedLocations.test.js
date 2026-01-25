/**
 * =============================================================================
 * SAVEDLOCATIONS.TEST.JS - Tests for Saved Locations Routes
 * =============================================================================
 *
 * Comprehensive tests for the saved geographic locations API.
 * Tests cover CRUD operations, authentication, validation, and user isolation.
 *
 * ENDPOINTS TESTED:
 * - GET /saved-locations - Get all saved locations
 * - GET /saved-locations/:id - Get single location
 * - POST /saved-locations - Create new location
 * - PATCH /saved-locations/:id - Update location
 * - DELETE /saved-locations/:id - Delete location
 * - POST /saved-locations/:id/set-default - Set default location
 * - POST /saved-locations/reorder - Reorder locations
 *
 * =============================================================================
 */

import request from 'supertest';
import app from '../test/testApp.js';

describe('SavedLocations Routes', () => {
  let authToken;

  // =============================================================================
  // TEST SETUP
  // =============================================================================

  /**
   * Before each test:
   * 1. Register a new test user
   * 2. Login to get an auth token
   * This ensures each test starts fresh with a clean user
   */
  beforeEach(async () => {
    // Register test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'locations@example.com',
        password: 'Password123!',
      });

    // Login to get token
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'locations@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  // =============================================================================
  // POST /saved-locations - CREATE LOCATION
  // =============================================================================

  describe('POST /saved-locations', () => {
    it('should create a new saved location', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Home',
          address: '123 Main Street, San Francisco, CA 94102',
          coordinates: { lat: 37.7749, lon: -122.4194 },
          category: 'home',
          isDefault: false,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Home');
      expect(res.body.data.address).toBe('123 Main Street, San Francisco, CA 94102');
      expect(res.body.data.coordinates.lat).toBe(37.7749);
      expect(res.body.data.coordinates.lon).toBe(-122.4194);
      expect(res.body.data.category).toBe('home');
      expect(res.body.data._id).toBeDefined();
    });

    it('should create location with minimal data (name and address only)', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Office',
          address: '456 Business Ave, New York, NY 10001',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe('Office');
      expect(res.body.data.address).toBe('456 Business Ave, New York, NY 10001');
      expect(res.body.data.category).toBe('other'); // Default category
    });

    it('should create location and set as default', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Primary Home',
          address: '789 Default St, Chicago, IL 60601',
          isDefault: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '123 No Name Street',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Name and address are required');
    });

    it('should return 400 if address is missing', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Address Location',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Name and address are required');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .send({
          name: 'Unauthorized Location',
          address: '123 Unauthorized St',
        });

      expect(res.statusCode).toBe(401);
    });

    it('should assign sequential order values to new locations', async () => {
      // Create first location
      const res1 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'First', address: '111 First St' });

      // Create second location
      const res2 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Second', address: '222 Second St' });

      // Create third location
      const res3 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Third', address: '333 Third St' });

      expect(res1.body.data.order).toBe(0);
      expect(res2.body.data.order).toBe(1);
      expect(res3.body.data.order).toBe(2);
    });
  });

  // =============================================================================
  // GET /saved-locations - LIST LOCATIONS
  // =============================================================================

  describe('GET /saved-locations', () => {
    beforeEach(async () => {
      // Create some test locations
      await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Home', address: '123 Home St', category: 'home' });

      await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', address: '456 Work Ave', category: 'work' });

      await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Gym', address: '789 Fitness Blvd', category: 'other' });
    });

    it('should return list of all saved locations', async () => {
      const res = await request(app)
        .get('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(3);
    });

    it('should return locations sorted by order', async () => {
      const res = await request(app)
        .get('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data[0].name).toBe('Home');
      expect(res.body.data[1].name).toBe('Work');
      expect(res.body.data[2].name).toBe('Gym');
    });

    it('should return empty array for new user', async () => {
      // Register and login as a different user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
        });

      const newUserToken = loginRes.body.token;

      const res = await request(app)
        .get('/saved-locations')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/saved-locations');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /saved-locations/:id - GET SINGLE LOCATION
  // =============================================================================

  describe('GET /saved-locations/:id', () => {
    let locationId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Single Location',
          address: '999 Test Drive',
          coordinates: { lat: 40.7128, lon: -74.0060 },
          category: 'work',
        });

      locationId = res.body.data._id;
    });

    it('should return single location by ID', async () => {
      const res = await request(app)
        .get(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(locationId);
      expect(res.body.data.name).toBe('Single Location');
      expect(res.body.data.address).toBe('999 Test Drive');
    });

    it('should return 404 for non-existent location', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/saved-locations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/saved-locations/${locationId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // USER ISOLATION - Locations should be private to each user
  // =============================================================================

  describe('User Isolation', () => {
    let user1Token;
    let user2Token;
    let user1LocationId;

    beforeEach(async () => {
      // Create and login first user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      const login1 = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      user1Token = login1.body.token;

      // Create and login second user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      const login2 = await request(app)
        .post('/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      user2Token = login2.body.token;

      // User1 creates a location
      const createRes = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'User1 Home',
          address: '111 User1 Street',
        });

      user1LocationId = createRes.body.data._id;
    });

    it('should not allow user2 to see user1 locations in list', async () => {
      const res = await request(app)
        .get('/saved-locations')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should not allow user2 to get user1 location by ID', async () => {
      const res = await request(app)
        .get(`/saved-locations/${user1LocationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to update user1 location', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${user1LocationId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to delete user1 location', async () => {
      const res = await request(app)
        .delete(`/saved-locations/${user1LocationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);

      // Verify location still exists for user1
      const checkRes = await request(app)
        .get(`/saved-locations/${user1LocationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(checkRes.statusCode).toBe(200);
    });

    it('should not allow user2 to set default on user1 location', async () => {
      const res = await request(app)
        .post(`/saved-locations/${user1LocationId}/set-default`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // PATCH /saved-locations/:id - UPDATE LOCATION
  // =============================================================================

  describe('PATCH /saved-locations/:id', () => {
    let locationId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Name',
          address: 'Original Address',
          category: 'home',
        });

      locationId = res.body.data._id;
    });

    it('should update location name', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.address).toBe('Original Address'); // Unchanged
    });

    it('should update location address', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ address: 'Updated Address' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.address).toBe('Updated Address');
    });

    it('should update location coordinates', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          coordinates: { lat: 51.5074, lon: -0.1278 },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.coordinates.lat).toBe(51.5074);
      expect(res.body.data.coordinates.lon).toBe(-0.1278);
    });

    it('should update location category', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: 'work' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.category).toBe('work');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Name',
          address: 'New Address',
          category: 'other',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.address).toBe('New Address');
      expect(res.body.data.category).toBe('other');
    });

    it('should return 404 for non-existent location', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .patch(`/saved-locations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .patch(`/saved-locations/${locationId}`)
        .send({ name: 'Unauthorized Update' });

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // DELETE /saved-locations/:id - DELETE LOCATION
  // =============================================================================

  describe('DELETE /saved-locations/:id', () => {
    let locationId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Be Deleted',
          address: 'Delete Me Street',
        });

      locationId = res.body.data._id;
    });

    it('should delete location', async () => {
      const res = await request(app)
        .delete(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(locationId);
      expect(res.body.message).toContain('deleted');

      // Verify location is gone
      const getRes = await request(app)
        .get(`/saved-locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent location', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/saved-locations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete(`/saved-locations/${locationId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // POST /saved-locations/:id/set-default - SET DEFAULT LOCATION
  // =============================================================================

  describe('POST /saved-locations/:id/set-default', () => {
    let location1Id;
    let location2Id;

    beforeEach(async () => {
      // Create two locations, first one as default
      const res1 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Location 1',
          address: '111 First St',
          isDefault: true,
        });

      location1Id = res1.body.data._id;

      const res2 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Location 2',
          address: '222 Second St',
          isDefault: false,
        });

      location2Id = res2.body.data._id;
    });

    it('should set location as default', async () => {
      const res = await request(app)
        .post(`/saved-locations/${location2Id}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isDefault).toBe(true);
    });

    it('should unset previous default when setting new default', async () => {
      // Set location2 as default
      await request(app)
        .post(`/saved-locations/${location2Id}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check that location1 is no longer default
      const getRes = await request(app)
        .get(`/saved-locations/${location1Id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data.isDefault).toBe(false);
    });

    it('should return 404 for non-existent location', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post(`/saved-locations/${fakeId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/saved-locations/${location1Id}/set-default`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // POST /saved-locations/reorder - REORDER LOCATIONS
  // =============================================================================

  describe('POST /saved-locations/reorder', () => {
    let locationIds;

    beforeEach(async () => {
      locationIds = [];

      // Create three locations in order
      const names = ['First', 'Second', 'Third'];
      for (const name of names) {
        const res = await request(app)
          .post('/saved-locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: name,
            address: `${name} Address`,
          });

        locationIds.push(res.body.data._id);
      }
    });

    it('should reorder locations', async () => {
      // Reverse the order: Third, Second, First
      const newOrder = [locationIds[2], locationIds[1], locationIds[0]];

      const res = await request(app)
        .post('/saved-locations/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: newOrder });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(3);

      // Check new order
      expect(res.body.data[0].name).toBe('Third');
      expect(res.body.data[0].order).toBe(0);
      expect(res.body.data[1].name).toBe('Second');
      expect(res.body.data[1].order).toBe(1);
      expect(res.body.data[2].name).toBe('First');
      expect(res.body.data[2].order).toBe(2);
    });

    it('should return 400 if orderedIds is not an array', async () => {
      const res = await request(app)
        .post('/saved-locations/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: 'not-an-array' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('orderedIds must be an array');
    });

    it('should return 400 if orderedIds is missing', async () => {
      const res = await request(app)
        .post('/saved-locations/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/saved-locations/reorder')
        .send({ orderedIds: locationIds });

      expect(res.statusCode).toBe(401);
    });

    it('should persist reordering across requests', async () => {
      // Reorder
      const newOrder = [locationIds[2], locationIds[0], locationIds[1]];
      await request(app)
        .post('/saved-locations/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderedIds: newOrder });

      // Fetch all locations again
      const getRes = await request(app)
        .get('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data[0].name).toBe('Third');
      expect(getRes.body.data[1].name).toBe('First');
      expect(getRes.body.data[2].name).toBe('Second');
    });
  });

  // =============================================================================
  // EDGE CASES AND VALIDATION
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle creating location with all category types', async () => {
      const categories = ['home', 'work', 'other'];

      for (const category of categories) {
        const res = await request(app)
          .post('/saved-locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `${category} Location`,
            address: `${category} Address`,
            category,
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.category).toBe(category);
      }
    });

    it('should handle location with null coordinates', async () => {
      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Coords',
          address: 'Address Only',
          coordinates: { lat: null, lon: null },
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.coordinates.lat).toBeNull();
      expect(res.body.data.coordinates.lon).toBeNull();
    });

    it('should handle long location name and address', async () => {
      const longName = 'A'.repeat(100); // Max is 100
      const longAddress = 'B'.repeat(500); // Max is 500

      const res = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: longName,
          address: longAddress,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe(longName);
      expect(res.body.data.address).toBe(longAddress);
    });

    it('should only allow one default location at a time', async () => {
      // Create first default
      const res1 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'First Default',
          address: 'First Address',
          isDefault: true,
        });

      expect(res1.body.data.isDefault).toBe(true);

      // Create second default
      const res2 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Second Default',
          address: 'Second Address',
          isDefault: true,
        });

      expect(res2.body.data.isDefault).toBe(true);

      // Check first is no longer default
      const getRes = await request(app)
        .get(`/saved-locations/${res1.body.data._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data.isDefault).toBe(false);
    });

    it('should handle updating isDefault via PATCH', async () => {
      // Create two locations
      const res1 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Location A',
          address: 'Address A',
          isDefault: true,
        });

      const res2 = await request(app)
        .post('/saved-locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Location B',
          address: 'Address B',
        });

      // Update location B to be default via PATCH
      const updateRes = await request(app)
        .patch(`/saved-locations/${res2.body.data._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isDefault: true });

      expect(updateRes.body.data.isDefault).toBe(true);

      // Check A is no longer default
      const getRes = await request(app)
        .get(`/saved-locations/${res1.body.data._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data.isDefault).toBe(false);
    });
  });
});
