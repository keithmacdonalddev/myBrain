/**
 * =============================================================================
 * IMAGES.TEST.JS - Tests for Image Routes
 * =============================================================================
 *
 * This file contains comprehensive tests for the images API endpoints.
 * Since image upload requires actual S3 storage and file processing,
 * we test the metadata/CRUD operations by creating image documents
 * directly in the database.
 *
 * WHAT WE TEST:
 * - GET /images - List images with pagination and filters
 * - GET /images/:id - Get single image details
 * - PATCH /images/:id - Update image metadata
 * - DELETE /images/:id - Delete single image
 * - POST /images/:id/favorite - Toggle favorite status
 * - POST /images/bulk-delete - Delete multiple images
 * - GET /images/tags - Get user's image tags
 * - GET /images/search - Search images by text
 * - Auth requirements (401 without token)
 * - Validation errors (400 for invalid IDs)
 * - Ownership checks (404 for other user's images)
 *
 * NOTE: We skip actual upload tests (POST /images) because they require
 * real S3 storage. Those should be tested with integration tests.
 *
 * =============================================================================
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import Image from '../models/Image.js';
import User from '../models/User.js';

describe('Images Routes', () => {
  let authToken;
  let userId;

  // Helper to create test images directly in the database
  async function createTestImage(overrides = {}) {
    const defaults = {
      userId,
      storageProvider: 's3',
      storageKey: `${userId}/images/library/${Date.now()}-test.jpg`,
      storageBucket: 'test-bucket',
      thumbnailKey: `${userId}/images/library/thumbnails/${Date.now()}-test.jpg`,
      filename: `${Date.now()}-test.jpg`,
      originalName: 'test-image.jpg',
      format: 'jpg',
      mimeType: 'image/jpeg',
      size: 102400, // 100KB
      width: 1920,
      height: 1080,
      aspectRatio: 1.78,
      folder: 'library',
      title: '',
      description: '',
      alt: '',
      tags: [],
      favorite: false,
    };

    return Image.create({ ...defaults, ...overrides });
  }

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'images@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'images@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;

    // Get the user ID for creating test images
    const user = await User.findOne({ email: 'images@example.com' });
    userId = user._id;
  });

  // =============================================================================
  // AUTH TESTS
  // =============================================================================

  describe('Authentication Requirements', () => {
    it('should return 401 for GET /images without auth', async () => {
      const res = await request(app).get('/images');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for GET /images/:id without auth', async () => {
      const res = await request(app).get('/images/507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for PATCH /images/:id without auth', async () => {
      const res = await request(app)
        .patch('/images/507f1f77bcf86cd799439011')
        .send({ title: 'Test' });
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for DELETE /images/:id without auth', async () => {
      const res = await request(app).delete('/images/507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for POST /images/:id/favorite without auth', async () => {
      const res = await request(app).post('/images/507f1f77bcf86cd799439011/favorite');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for POST /images/bulk-delete without auth', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .send({ ids: ['507f1f77bcf86cd799439011'] });
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for GET /images/tags without auth', async () => {
      const res = await request(app).get('/images/tags');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for GET /images/search without auth', async () => {
      const res = await request(app).get('/images/search?q=test');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for GET /images/limits without auth', async () => {
      const res = await request(app).get('/images/limits');
      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /images - List Images
  // =============================================================================

  describe('GET /images', () => {
    beforeEach(async () => {
      // Create some test images
      await createTestImage({ title: 'Image 1', tags: ['nature', 'outdoor'] });
      await createTestImage({ title: 'Image 2', tags: ['work'], favorite: true });
      await createTestImage({ title: 'Image 3', tags: ['nature'] });
    });

    it('should return list of images', async () => {
      const res = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images).toBeDefined();
      expect(res.body.images.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/images')
        .query({ limit: 2, page: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('should filter by favorite', async () => {
      const res = await request(app)
        .get('/images')
        .query({ favorite: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBe(1);
      expect(res.body.images[0].favorite).toBe(true);
    });

    it('should filter by tags', async () => {
      const res = await request(app)
        .get('/images')
        .query({ tags: 'nature' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBe(2);
      expect(res.body.images.every(img => img.tags.includes('nature'))).toBe(true);
    });

    it('should filter by folder', async () => {
      // Create an image in a different folder
      await createTestImage({ title: 'Avatar', folder: 'avatars' });

      const res = await request(app)
        .get('/images')
        .query({ folder: 'avatars' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBe(1);
      expect(res.body.images[0].folder).toBe('avatars');
    });

    it('should sort by newest first by default', async () => {
      const res = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Images should be sorted by createdAt descending (newest first)
      const dates = res.body.images.map(img => new Date(img.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('should return empty array when no images exist', async () => {
      // Delete all images
      await Image.deleteMany({ userId });

      const res = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // =============================================================================
  // GET /images/:id - Get Single Image
  // =============================================================================

  describe('GET /images/:id', () => {
    let imageId;

    beforeEach(async () => {
      const image = await createTestImage({
        title: 'Single Image',
        description: 'Test description',
        tags: ['test'],
      });
      imageId = image._id.toString();
    });

    it('should return single image', async () => {
      const res = await request(app)
        .get(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.image).toBeDefined();
      expect(res.body.image._id).toBe(imageId);
      expect(res.body.image.title).toBe('Single Image');
      expect(res.body.image.description).toBe('Test description');
    });

    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .get('/images/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should return 400 for invalid image ID', async () => {
      const res = await request(app)
        .get('/images/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 404 for another user\'s image', async () => {
      // Create another user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherToken = otherLoginRes.body.token;

      // Try to access original user's image with other user's token
      const res = await request(app)
        .get(`/images/${imageId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // PATCH /images/:id - Update Image
  // =============================================================================

  describe('PATCH /images/:id', () => {
    let imageId;

    beforeEach(async () => {
      const image = await createTestImage({
        title: 'Original Title',
        description: 'Original description',
        alt: 'Original alt',
        tags: ['original'],
        favorite: false,
      });
      imageId = image._id.toString();
    });

    it('should update image metadata', async () => {
      const res = await request(app)
        .patch(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          alt: 'Updated alt',
          tags: ['updated', 'new'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.image.title).toBe('Updated Title');
      expect(res.body.image.description).toBe('Updated description');
      expect(res.body.image.alt).toBe('Updated alt');
      expect(res.body.image.tags).toEqual(['updated', 'new']);
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Title Only',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.image.title).toBe('New Title Only');
      expect(res.body.image.description).toBe('Original description'); // Unchanged
    });

    it('should update favorite status', async () => {
      const res = await request(app)
        .patch(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          favorite: true,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.image.favorite).toBe(true);
    });

    it('should update sourceUrl', async () => {
      const res = await request(app)
        .patch(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceUrl: 'https://example.com/original.jpg',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.image.sourceUrl).toBe('https://example.com/original.jpg');
    });

    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .patch('/images/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should return 400 for invalid image ID', async () => {
      const res = await request(app)
        .patch('/images/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 404 when updating another user\'s image', async () => {
      // Create another user and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other2@example.com',
          password: 'Password123!',
        });

      const otherLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'other2@example.com',
          password: 'Password123!',
        });

      const otherToken = otherLoginRes.body.token;

      const res = await request(app)
        .patch(`/images/${imageId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /images/:id/favorite - Toggle Favorite
  // =============================================================================

  describe('POST /images/:id/favorite', () => {
    let imageId;

    beforeEach(async () => {
      const image = await createTestImage({ favorite: false });
      imageId = image._id.toString();
    });

    it('should toggle favorite from false to true', async () => {
      const res = await request(app)
        .post(`/images/${imageId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.image.favorite).toBe(true);
      expect(res.body.favorite).toBe(true);
    });

    it('should toggle favorite from true to false', async () => {
      // First set to true
      await request(app)
        .post(`/images/${imageId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then toggle back to false
      const res = await request(app)
        .post(`/images/${imageId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.image.favorite).toBe(false);
      expect(res.body.favorite).toBe(false);
    });

    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .post('/images/507f1f77bcf86cd799439011/favorite')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should return 400 for invalid image ID', async () => {
      const res = await request(app)
        .post('/images/invalid-id/favorite')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // DELETE /images/:id - Delete Single Image
  // =============================================================================

  describe('DELETE /images/:id', () => {
    let imageId;

    beforeEach(async () => {
      const image = await createTestImage({ title: 'Delete Me' });
      imageId = image._id.toString();
    });

    it('should delete an image', async () => {
      const res = await request(app)
        .delete(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify image is gone
      const getRes = await request(app)
        .get(`/images/${imageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .delete('/images/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should return 400 for invalid image ID', async () => {
      const res = await request(app)
        .delete('/images/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 404 when deleting another user\'s image', async () => {
      // Create another user and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other3@example.com',
          password: 'Password123!',
        });

      const otherLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'other3@example.com',
          password: 'Password123!',
        });

      const otherToken = otherLoginRes.body.token;

      const res = await request(app)
        .delete(`/images/${imageId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /images/bulk-delete - Bulk Delete Images
  // =============================================================================

  describe('POST /images/bulk-delete', () => {
    let imageIds;

    beforeEach(async () => {
      const images = await Promise.all([
        createTestImage({ title: 'Bulk 1' }),
        createTestImage({ title: 'Bulk 2' }),
        createTestImage({ title: 'Bulk 3' }),
      ]);
      imageIds = images.map(img => img._id.toString());
    });

    it('should delete multiple images', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: imageIds });

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(3);
      expect(res.body.message).toContain('3');

      // Verify all images are gone
      const listRes = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.body.images.length).toBe(0);
    });

    it('should delete subset of images', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [imageIds[0], imageIds[1]] });

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(2);

      // Verify one image remains
      const listRes = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.body.images.length).toBe(1);
    });

    it('should return 400 for empty ids array', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_IDS');
    });

    it('should return 400 for missing ids', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_IDS');
    });

    it('should return 400 for invalid id in array', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [imageIds[0], 'invalid-id'] });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should handle non-existent ids gracefully', async () => {
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: ['507f1f77bcf86cd799439011'] });

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(0);
    });

    it('should only delete images owned by user', async () => {
      // Create another user with their own image
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other4@example.com',
          password: 'Password123!',
        });

      const otherLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'other4@example.com',
          password: 'Password123!',
        });

      const otherToken = otherLoginRes.body.token;

      // Try to bulk delete original user's images with other user's token
      const res = await request(app)
        .post('/images/bulk-delete')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ ids: imageIds });

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(0); // None deleted because not owned

      // Verify images still exist
      const listRes = await request(app)
        .get('/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.body.images.length).toBe(3);
    });
  });

  // =============================================================================
  // GET /images/tags - Get User's Image Tags
  // =============================================================================

  describe('GET /images/tags', () => {
    beforeEach(async () => {
      await createTestImage({ tags: ['nature', 'outdoor'] });
      await createTestImage({ tags: ['nature', 'mountains'] });
      await createTestImage({ tags: ['work', 'screenshots'] });
    });

    it('should return unique tags with counts', async () => {
      const res = await request(app)
        .get('/images/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
      expect(Array.isArray(res.body.tags)).toBe(true);

      // Find nature tag - should have count of 2
      const natureTag = res.body.tags.find(t => t.tag === 'nature');
      expect(natureTag).toBeDefined();
      expect(natureTag.count).toBe(2);
    });

    it('should return empty array when no images have tags', async () => {
      await Image.deleteMany({ userId }); // Clear images
      await createTestImage({ tags: [] }); // Image with no tags

      const res = await request(app)
        .get('/images/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toEqual([]);
    });
  });

  // =============================================================================
  // GET /images/search - Search Images
  // =============================================================================

  describe('GET /images/search', () => {
    beforeEach(async () => {
      await createTestImage({
        title: 'Beach Sunset',
        description: 'Beautiful sunset at the beach',
        tags: ['nature', 'sunset'],
      });
      await createTestImage({
        title: 'Mountain View',
        description: 'View from the top of the mountain',
        tags: ['nature', 'mountains'],
      });
      await createTestImage({
        title: 'Office Meeting',
        description: 'Team meeting in the office',
        tags: ['work'],
      });
    });

    it('should search images by title', async () => {
      const res = await request(app)
        .get('/images/search')
        .query({ q: 'beach' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images).toBeDefined();
      expect(res.body.images.length).toBeGreaterThan(0);
      expect(res.body.images[0].title).toContain('Beach');
    });

    it('should search images by description', async () => {
      const res = await request(app)
        .get('/images/search')
        .query({ q: 'mountain' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBeGreaterThan(0);
    });

    it('should filter search results by favorite', async () => {
      // Mark one as favorite first
      const image = await Image.findOne({ userId, title: 'Beach Sunset' });
      await Image.updateOne({ _id: image._id }, { favorite: true });

      const res = await request(app)
        .get('/images/search')
        .query({ q: 'sunset', favorite: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.images.length > 0) {
        expect(res.body.images.every(img => img.favorite === true)).toBe(true);
      }
    });

    it('should filter search results by tags', async () => {
      const res = await request(app)
        .get('/images/search')
        .query({ q: 'view', tags: 'nature' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.images.length > 0) {
        expect(res.body.images.every(img => img.tags.includes('nature'))).toBe(true);
      }
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/images/search')
        .query({ q: 'the', limit: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.length).toBeLessThanOrEqual(1);
    });

    it('should return empty results for no matches', async () => {
      const res = await request(app)
        .get('/images/search')
        .query({ q: 'nonexistentxyz123' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images).toEqual([]);
    });
  });

  // =============================================================================
  // GET /images/limits - Get Storage Limits
  // =============================================================================

  describe('GET /images/limits', () => {
    it('should return storage limits information', async () => {
      const res = await request(app)
        .get('/images/limits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images).toBeDefined();
      expect(res.body.storage).toBeDefined();
      expect(typeof res.body.images.current).toBe('number');
      expect(typeof res.body.images.max).toBe('number');
      expect(typeof res.body.storage.currentBytes).toBe('number');
    });

    it('should reflect current image count', async () => {
      // Create some images
      await createTestImage({ title: 'Test 1' });
      await createTestImage({ title: 'Test 2' });

      const res = await request(app)
        .get('/images/limits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.images.current).toBeGreaterThanOrEqual(2);
    });
  });

  // =============================================================================
  // GET /images/:id/download - Get Download URL
  // =============================================================================

  describe('GET /images/:id/download', () => {
    let imageId;

    beforeEach(async () => {
      const image = await createTestImage({ title: 'Download Test' });
      imageId = image._id.toString();
    });

    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .get('/images/507f1f77bcf86cd799439011/download')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('IMAGE_NOT_FOUND');
    });

    it('should return 400 for invalid image ID', async () => {
      const res = await request(app)
        .get('/images/invalid-id/download')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get(`/images/${imageId}/download`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // POST /images - Upload (Skip actual upload, test validation only)
  // =============================================================================

  describe('POST /images (validation only)', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/images')
        .send({});

      expect(res.statusCode).toBe(401);
    });

    // Note: Actual upload tests would require mocking S3 and file processing
    // This is better suited for integration tests with proper mocking
  });
});
