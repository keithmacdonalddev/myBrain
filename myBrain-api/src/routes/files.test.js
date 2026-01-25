/**
 * =============================================================================
 * FILES.TEST.JS - Comprehensive Tests for Files Route
 * =============================================================================
 *
 * Tests the files API endpoints for file management in myBrain.
 * Since actual file uploads require S3 integration, we use mocking for upload
 * tests and focus on testing metadata operations with direct database setup.
 *
 * TEST CATEGORIES:
 * - Authentication (401 without token)
 * - File listing with filters and pagination
 * - Single file retrieval
 * - File metadata updates
 * - File organization (move, favorite, trash, restore)
 * - Bulk operations
 * - Entity linking
 * - Validation errors
 * =============================================================================
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';

describe('Files Routes', () => {
  let authToken;
  let userId;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'files@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'files@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;

    // Get user ID from the database
    const user = await User.findOne({ email: 'files@example.com' });
    userId = user._id;
  });

  // =============================================================================
  // HELPER FUNCTION: Create a file directly in DB for testing
  // =============================================================================
  // Since actual uploads require S3, we create test files directly in the database
  // This simulates files that have already been uploaded

  async function createTestFile(overrides = {}) {
    const defaults = {
      userId,
      storageProvider: 's3',
      storageKey: `files/${userId}/test-${Date.now()}.pdf`,
      storageBucket: 'test-bucket',
      filename: `test-${Date.now()}.pdf`,
      originalName: 'test-document.pdf',
      mimeType: 'application/pdf',
      extension: '.pdf',
      fileCategory: 'document',
      size: 1024,
      folderId: null,
      path: '/',
      title: 'Test Document',
      description: 'A test document for testing',
      tags: ['test'],
      favorite: false,
      isTrashed: false,
      isLatestVersion: true,
      version: 1,
    };

    return File.create({ ...defaults, ...overrides });
  }

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  describe('Authentication', () => {
    it('should return 401 for GET /files without token', async () => {
      const res = await request(app).get('/files');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for GET /files/:id without token', async () => {
      const res = await request(app).get('/files/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for PATCH /files/:id without token', async () => {
      const res = await request(app)
        .patch('/files/507f1f77bcf86cd799439011')
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for DELETE /files/:id without token', async () => {
      const res = await request(app).delete('/files/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /files - LIST FILES
  // =============================================================================

  describe('GET /files', () => {
    beforeEach(async () => {
      // Create some test files
      await createTestFile({ title: 'Document 1', tags: ['work'] });
      await createTestFile({ title: 'Document 2', tags: ['personal'], favorite: true });
      await createTestFile({
        title: 'Spreadsheet',
        fileCategory: 'spreadsheet',
        mimeType: 'application/vnd.ms-excel',
        extension: '.xlsx',
      });
    });

    it('should return list of files', async () => {
      const res = await request(app)
        .get('/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files).toBeDefined();
      expect(res.body.files.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by fileCategory', async () => {
      const res = await request(app)
        .get('/files')
        .query({ fileCategory: 'spreadsheet' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBe(1);
      expect(res.body.files[0].fileCategory).toBe('spreadsheet');
    });

    it('should filter by favorite', async () => {
      const res = await request(app)
        .get('/files')
        .query({ favorite: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBe(1);
      expect(res.body.files[0].favorite).toBe(true);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/files')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('should not return trashed files by default', async () => {
      // Create a trashed file
      await createTestFile({ title: 'Trashed File', isTrashed: true });

      const res = await request(app)
        .get('/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should still be 3, not 4 (trashed file excluded)
      expect(res.body.files.length).toBe(3);
    });

    it('should filter by folder', async () => {
      // Create a folder and a file in it
      const folder = await Folder.create({
        userId,
        name: 'Test Folder',
        path: '/Test Folder',
      });

      await createTestFile({ title: 'Folder File', folderId: folder._id });

      const res = await request(app)
        .get('/files')
        .query({ folderId: folder._id.toString() })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBe(1);
      expect(res.body.files[0].title).toBe('Folder File');
    });
  });

  // =============================================================================
  // GET /files/search - SEARCH FILES
  // =============================================================================

  describe('GET /files/search', () => {
    beforeEach(async () => {
      await createTestFile({ title: 'Budget Report', description: 'Annual budget' });
      await createTestFile({ title: 'Meeting Notes', description: 'Project discussion' });
      await createTestFile({ title: 'Invoice', description: 'Client billing' });
    });

    it('should search files by text', async () => {
      const res = await request(app)
        .get('/files/search')
        .query({ q: 'Budget' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files).toBeDefined();
    });

    it('should combine search with filters', async () => {
      // Create a favorite file
      await createTestFile({
        title: 'Important Budget',
        favorite: true,
        fileCategory: 'spreadsheet',
      });

      const res = await request(app)
        .get('/files/search')
        .query({ q: 'Budget', favorite: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // =============================================================================
  // GET /files/recent - RECENT FILES
  // =============================================================================

  describe('GET /files/recent', () => {
    it('should return recent files', async () => {
      // Create files with lastAccessedAt
      await createTestFile({
        title: 'Recent File 1',
        lastAccessedAt: new Date(Date.now() - 1000),
      });
      await createTestFile({
        title: 'Recent File 2',
        lastAccessedAt: new Date(),
      });

      const res = await request(app)
        .get('/files/recent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      // Create multiple recent files
      for (let i = 0; i < 5; i++) {
        await createTestFile({
          title: `Recent File ${i}`,
          lastAccessedAt: new Date(Date.now() - i * 1000),
        });
      }

      const res = await request(app)
        .get('/files/recent')
        .query({ limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBeLessThanOrEqual(3);
    });
  });

  // =============================================================================
  // GET /files/trash - TRASHED FILES
  // =============================================================================

  describe('GET /files/trash', () => {
    it('should return trashed files', async () => {
      await createTestFile({ title: 'Trashed 1', isTrashed: true, trashedAt: new Date() });
      await createTestFile({ title: 'Trashed 2', isTrashed: true, trashedAt: new Date() });
      await createTestFile({ title: 'Not Trashed' });

      const res = await request(app)
        .get('/files/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.files.length).toBe(2);
    });
  });

  // =============================================================================
  // GET /files/stats - STORAGE STATISTICS
  // =============================================================================

  describe('GET /files/stats', () => {
    it('should return storage statistics', async () => {
      await createTestFile({ size: 1024 });
      await createTestFile({ size: 2048 });
      await createTestFile({ size: 4096 });

      const res = await request(app)
        .get('/files/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // =============================================================================
  // GET /files/tags - USER FILE TAGS
  // =============================================================================

  describe('GET /files/tags', () => {
    it('should return unique tags used in files', async () => {
      await createTestFile({ tags: ['work', 'important'] });
      await createTestFile({ tags: ['work', 'finance'] });
      await createTestFile({ tags: ['personal'] });

      const res = await request(app)
        .get('/files/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
    });
  });

  // =============================================================================
  // GET /files/limits - STORAGE LIMITS
  // =============================================================================

  describe('GET /files/limits', () => {
    it('should return storage limits', async () => {
      const res = await request(app)
        .get('/files/limits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // =============================================================================
  // GET /files/:id - SINGLE FILE
  // =============================================================================

  describe('GET /files/:id', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'Single File Test' });
    });

    it('should return single file', async () => {
      const res = await request(app)
        .get(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.file._id).toBe(testFile._id.toString());
      expect(res.body.file.title).toBe('Single File Test');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .get('/files/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FILE_NOT_FOUND');
    });

    it('should return 400 for invalid file ID', async () => {
      const res = await request(app)
        .get('/files/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should not return another user\'s file', async () => {
      // Create another user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherLogin = await request(app)
        .post('/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherToken = otherLogin.body.token;

      // Try to access the original user's file
      const res = await request(app)
        .get(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // PATCH /files/:id - UPDATE FILE METADATA
  // =============================================================================

  describe('PATCH /files/:id', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({
        title: 'Original Title',
        description: 'Original description',
        tags: ['original'],
      });
    });

    it('should update file metadata', async () => {
      const res = await request(app)
        .patch(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated', 'modified'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.file.title).toBe('Updated Title');
      expect(res.body.file.description).toBe('Updated description');
      expect(res.body.file.tags).toContain('updated');
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title Only' });

      expect(res.statusCode).toBe(200);
      expect(res.body.file.title).toBe('New Title Only');
      expect(res.body.file.description).toBe('Original description');
    });

    it('should update favorite status', async () => {
      const res = await request(app)
        .patch(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ favorite: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.file.favorite).toBe(true);
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .patch('/files/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /files/:id/favorite - TOGGLE FAVORITE
  // =============================================================================

  describe('POST /files/:id/favorite', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ favorite: false });
    });

    it('should toggle favorite to true', async () => {
      const res = await request(app)
        .post(`/files/${testFile._id}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.favorite).toBe(true);
    });

    it('should toggle favorite to false', async () => {
      // First set to true
      testFile.favorite = true;
      await testFile.save();

      const res = await request(app)
        .post(`/files/${testFile._id}/favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.favorite).toBe(false);
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .post('/files/507f1f77bcf86cd799439011/favorite')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /files/:id/move - MOVE FILE
  // =============================================================================

  describe('POST /files/:id/move', () => {
    let testFile;
    let testFolder;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'File to Move' });
      testFolder = await Folder.create({
        userId,
        name: 'Destination Folder',
        path: '/Destination Folder',
      });
    });

    it('should move file to folder', async () => {
      const res = await request(app)
        .post(`/files/${testFile._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId: testFolder._id.toString() });

      expect(res.statusCode).toBe(200);
      expect(res.body.file.folderId.toString()).toBe(testFolder._id.toString());
    });

    it('should move file to root (null folderId)', async () => {
      // First put file in a folder
      testFile.folderId = testFolder._id;
      await testFile.save();

      const res = await request(app)
        .post(`/files/${testFile._id}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId: null });

      expect(res.statusCode).toBe(200);
      expect(res.body.file.folderId).toBeNull();
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .post('/files/507f1f77bcf86cd799439011/move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId: testFolder._id.toString() });

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /files/:id/trash - TRASH FILE
  // =============================================================================

  describe('POST /files/:id/trash', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'File to Trash' });
    });

    it('should move file to trash', async () => {
      const res = await request(app)
        .post(`/files/${testFile._id}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.file.isTrashed).toBe(true);
      expect(res.body.message).toContain('trash');
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .post('/files/507f1f77bcf86cd799439011/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // POST /files/:id/restore - RESTORE FILE
  // =============================================================================

  describe('POST /files/:id/restore', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({
        title: 'Trashed File',
        isTrashed: true,
        trashedAt: new Date(),
      });
    });

    it('should restore file from trash', async () => {
      const res = await request(app)
        .post(`/files/${testFile._id}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.file.isTrashed).toBe(false);
      expect(res.body.message).toContain('restored');
    });

    it('should return 404 for file not in trash', async () => {
      // Create a file that's NOT trashed
      const activeFile = await createTestFile({ isTrashed: false });

      const res = await request(app)
        .post(`/files/${activeFile._id}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // DELETE /files/:id - PERMANENT DELETE
  // =============================================================================

  describe('DELETE /files/:id', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'File to Delete' });
    });

    it('should permanently delete file', async () => {
      const res = await request(app)
        .delete(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify file is gone
      const getRes = await request(app)
        .get(`/files/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .delete('/files/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  describe('Bulk Operations', () => {
    let files;

    beforeEach(async () => {
      files = await Promise.all([
        createTestFile({ title: 'Bulk File 1' }),
        createTestFile({ title: 'Bulk File 2' }),
        createTestFile({ title: 'Bulk File 3' }),
      ]);
    });

    describe('POST /files/bulk-move', () => {
      let folder;

      beforeEach(async () => {
        folder = await Folder.create({
          userId,
          name: 'Bulk Move Folder',
          path: '/Bulk Move Folder',
        });
      });

      it('should move multiple files to folder', async () => {
        const ids = files.map(f => f._id.toString());

        const res = await request(app)
          .post('/files/bulk-move')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids, folderId: folder._id.toString() });

        expect(res.statusCode).toBe(200);
        expect(res.body.moved).toBe(3);
      });

      it('should return 400 for empty ids array', async () => {
        const res = await request(app)
          .post('/files/bulk-move')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [], folderId: folder._id.toString() });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_IDS');
      });

      it('should return 400 for invalid id in array', async () => {
        const res = await request(app)
          .post('/files/bulk-move')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: ['invalid-id'], folderId: folder._id.toString() });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('POST /files/bulk-trash', () => {
      it('should trash multiple files', async () => {
        const ids = files.map(f => f._id.toString());

        const res = await request(app)
          .post('/files/bulk-trash')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids });

        expect(res.statusCode).toBe(200);
        expect(res.body.trashed).toBe(3);
      });

      it('should return 400 for empty ids array', async () => {
        const res = await request(app)
          .post('/files/bulk-trash')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_IDS');
      });
    });

    describe('POST /files/bulk-delete', () => {
      it('should permanently delete multiple files', async () => {
        const ids = files.map(f => f._id.toString());

        const res = await request(app)
          .post('/files/bulk-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids });

        expect(res.statusCode).toBe(200);
        expect(res.body.deleted).toBe(3);
      });

      it('should return 400 for empty ids array', async () => {
        const res = await request(app)
          .post('/files/bulk-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [] });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_IDS');
      });
    });
  });

  // =============================================================================
  // POST /files/empty-trash - EMPTY TRASH
  // =============================================================================

  describe('POST /files/empty-trash', () => {
    it('should delete all trashed files', async () => {
      // Create trashed files
      await createTestFile({ isTrashed: true, trashedAt: new Date() });
      await createTestFile({ isTrashed: true, trashedAt: new Date() });

      const res = await request(app)
        .post('/files/empty-trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(2);
    });

    it('should return 0 deleted when trash is empty', async () => {
      const res = await request(app)
        .post('/files/empty-trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(0);
    });
  });

  // =============================================================================
  // ENTITY LINKING
  // =============================================================================

  describe('Entity Linking', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'File to Link' });
    });

    describe('POST /files/:id/link', () => {
      it('should link file to a note', async () => {
        const noteId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: noteId.toString(), entityType: 'note' });

        expect(res.statusCode).toBe(200);
        expect(res.body.file.linkedNoteIds).toContain(noteId.toString());
      });

      it('should link file to a project', async () => {
        const projectId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: projectId.toString(), entityType: 'project' });

        expect(res.statusCode).toBe(200);
        expect(res.body.file.linkedProjectIds).toContain(projectId.toString());
      });

      it('should link file to a task', async () => {
        const taskId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: taskId.toString(), entityType: 'task' });

        expect(res.statusCode).toBe(200);
        expect(res.body.file.linkedTaskIds).toContain(taskId.toString());
      });

      it('should return 400 for missing entityId', async () => {
        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityType: 'note' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_PARAMS');
      });

      it('should return 400 for missing entityType', async () => {
        const noteId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: noteId.toString() });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_PARAMS');
      });

      it('should return 400 for invalid entityType', async () => {
        const noteId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .post(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: noteId.toString(), entityType: 'invalid' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ENTITY_TYPE');
      });
    });

    describe('DELETE /files/:id/link', () => {
      beforeEach(async () => {
        // Link file to a note first
        const noteId = new mongoose.Types.ObjectId();
        testFile.linkedNoteIds = [noteId];
        await testFile.save();
      });

      it('should unlink file from entity', async () => {
        const noteId = testFile.linkedNoteIds[0];

        const res = await request(app)
          .delete(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ entityId: noteId.toString(), entityType: 'note' });

        expect(res.statusCode).toBe(200);
        expect(res.body.file.linkedNoteIds).not.toContain(noteId.toString());
      });

      it('should return 400 for missing parameters', async () => {
        const res = await request(app)
          .delete(`/files/${testFile._id}/link`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /files/entity/:entityType/:entityId', () => {
      it('should get files linked to an entity', async () => {
        const noteId = new mongoose.Types.ObjectId();
        testFile.linkedNoteIds = [noteId];
        await testFile.save();

        const res = await request(app)
          .get(`/files/entity/note/${noteId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.files).toBeDefined();
        expect(res.body.files.length).toBe(1);
      });

      it('should return empty array for entity with no linked files', async () => {
        const noteId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .get(`/files/entity/note/${noteId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.files).toEqual([]);
      });

      it('should return 400 for invalid entityType', async () => {
        const noteId = new mongoose.Types.ObjectId();

        const res = await request(app)
          .get(`/files/entity/invalid/${noteId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ENTITY_TYPE');
      });

      it('should return 400 for invalid entityId', async () => {
        const res = await request(app)
          .get('/files/entity/note/invalid-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });
  });

  // =============================================================================
  // VALIDATION TESTS
  // =============================================================================

  describe('Validation', () => {
    it('should return 400 for invalid file ID format on GET', async () => {
      const res = await request(app)
        .get('/files/not-a-valid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 400 for invalid file ID format on PATCH', async () => {
      const res = await request(app)
        .patch('/files/not-a-valid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 400 for invalid file ID format on DELETE', async () => {
      const res = await request(app)
        .delete('/files/not-a-valid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // GET /files/:id/download - DOWNLOAD URL (Limited Test)
  // =============================================================================

  describe('GET /files/:id/download', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'Downloadable File' });
    });

    it('should return 404 for non-existent file', async () => {
      const res = await request(app)
        .get('/files/507f1f77bcf86cd799439011/download')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid file ID', async () => {
      const res = await request(app)
        .get('/files/invalid-id/download')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // GET /files/:id/versions - FILE VERSIONS
  // =============================================================================

  describe('GET /files/:id/versions', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'Versioned File', version: 1 });
    });

    it('should return file versions', async () => {
      const res = await request(app)
        .get(`/files/${testFile._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.versions).toBeDefined();
    });

    it('should return 400 for invalid file ID', async () => {
      const res = await request(app)
        .get('/files/invalid-id/versions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // SHARING ROUTES (Limited Tests - Requires Share Model Setup)
  // =============================================================================

  describe('Sharing Routes', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await createTestFile({ title: 'Shareable File' });
    });

    describe('GET /files/:id/share', () => {
      it('should return 400 for invalid file ID', async () => {
        const res = await request(app)
          .get('/files/invalid-id/share')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('DELETE /files/:id/share', () => {
      it('should return 400 for invalid file ID', async () => {
        const res = await request(app)
          .delete('/files/invalid-id/share')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });
  });
});
