import request from 'supertest';
import mongoose from 'mongoose';
import app from '../test/testApp.js';
import User from '../models/User.js';

describe('Folders Routes', () => {
  let authToken;
  let testUserId;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'folders@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'folders@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
    testUserId = loginRes.body.user._id;

    // Enable filesEnabled feature for the test user
    // This is required because the POST /folders route uses requireFeature('filesEnabled')
    await User.findByIdAndUpdate(testUserId, {
      $set: {
        'flags.filesEnabled': true,
      },
    });
  });

  // =============================================================================
  // POST /folders - Create Folder
  // =============================================================================
  describe('POST /folders', () => {
    it('should create a new folder at root level', async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Folder',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.folder).toBeDefined();
      expect(res.body.folder.name).toBe('Test Folder');
      expect(res.body.folder.parentId).toBeNull();
      expect(res.body.folder.path).toBe('/Test Folder');
    });

    it('should create folder with color and icon', async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Colored Folder',
          color: '#FF6B6B',
          icon: 'briefcase',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.folder.color).toBe('#FF6B6B');
      expect(res.body.folder.icon).toBe('briefcase');
    });

    it('should create nested folder (subfolder)', async () => {
      // Create parent folder first
      const parentRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent Folder' });

      const parentId = parentRes.body.folder._id;

      // Create subfolder
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Child Folder',
          parentId: parentId,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.folder.parentId).toBe(parentId);
      expect(res.body.folder.path).toBe('/Parent Folder/Child Folder');
      expect(res.body.folder.depth).toBe(1);
    });

    it('should reject folder without name', async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NAME_REQUIRED');
    });

    it('should reject folder with empty name', async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NAME_REQUIRED');
    });

    it('should reject duplicate folder name at same level', async () => {
      // Create first folder
      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unique Folder' });

      // Try to create duplicate
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unique Folder' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('FOLDER_EXISTS');
    });

    it('should allow same name in different parent folders', async () => {
      // Create two parent folders
      const parent1Res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent 1' });

      const parent2Res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent 2' });

      // Create subfolder with same name in both parents
      const sub1Res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Reports', parentId: parent1Res.body.folder._id });

      const sub2Res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Reports', parentId: parent2Res.body.folder._id });

      expect(sub1Res.statusCode).toBe(201);
      expect(sub2Res.statusCode).toBe(201);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/folders')
        .send({ name: 'Test' });

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /folders - List Folders
  // =============================================================================
  describe('GET /folders', () => {
    beforeEach(async () => {
      // Create some test folders
      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Documents' });

      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Photos' });

      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work' });
    });

    it('should return list of folders', async () => {
      const res = await request(app)
        .get('/folders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folders).toBeDefined();
      expect(res.body.folders.length).toBe(3);
    });

    it('should filter by parentId (root folders)', async () => {
      const res = await request(app)
        .get('/folders')
        .query({ parentId: 'null' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folders.every(f => f.parentId === null)).toBe(true);
    });

    it('should filter by parentId (subfolders)', async () => {
      // Get parent folder
      const foldersRes = await request(app)
        .get('/folders')
        .set('Authorization', `Bearer ${authToken}`);

      const parentId = foldersRes.body.folders[0]._id;

      // Create subfolders
      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Subfolder 1', parentId });

      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Subfolder 2', parentId });

      // Get subfolders
      const res = await request(app)
        .get('/folders')
        .query({ parentId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folders.length).toBe(2);
      expect(res.body.folders.every(f => f.parentId === parentId)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/folders');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /folders/tree - Get Folder Tree
  // =============================================================================
  describe('GET /folders/tree', () => {
    beforeEach(async () => {
      // Create nested folder structure
      const parentRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Documents' });

      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', parentId: parentRes.body.folder._id });

      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Photos' });
    });

    it('should return folder tree structure', async () => {
      const res = await request(app)
        .get('/folders/tree')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tree).toBeDefined();
      // Tree should have root folders with children arrays
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/folders/tree');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /folders/trash - Get Trashed Folders
  // =============================================================================
  describe('GET /folders/trash', () => {
    it('should return empty array when no trashed folders', async () => {
      const res = await request(app)
        .get('/folders/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folders).toEqual([]);
    });

    it('should return trashed folders', async () => {
      // Create and trash a folder
      const createRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Be Trashed' });

      await request(app)
        .post(`/folders/${createRes.body.folder._id}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/folders/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folders.length).toBe(1);
      expect(res.body.folders[0].name).toBe('To Be Trashed');
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/folders/trash');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /folders/:id - Get Single Folder
  // =============================================================================
  describe('GET /folders/:id', () => {
    let folderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Single Folder' });

      folderId = res.body.folder._id;
    });

    it('should return single folder with contents', async () => {
      const res = await request(app)
        .get(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folder._id).toBe(folderId);
      expect(res.body.folder.name).toBe('Single Folder');
      expect(res.body.subfolders).toBeDefined();
      expect(res.body.files).toBeDefined();
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .get('/folders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .get('/folders/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth', async () => {
      const res = await request(app).get(`/folders/${folderId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // GET /folders/:id/breadcrumb - Get Folder Breadcrumb
  // =============================================================================
  describe('GET /folders/:id/breadcrumb', () => {
    it('should return breadcrumb for nested folder', async () => {
      // Create nested structure
      const parentRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Documents' });

      const childRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', parentId: parentRes.body.folder._id });

      const grandchildRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Reports', parentId: childRes.body.folder._id });

      const res = await request(app)
        .get(`/folders/${grandchildRes.body.folder._id}/breadcrumb`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.breadcrumb).toBeDefined();
      expect(res.body.breadcrumb.length).toBe(3);
      expect(res.body.breadcrumb[0].name).toBe('Documents');
      expect(res.body.breadcrumb[1].name).toBe('Work');
      expect(res.body.breadcrumb[2].name).toBe('Reports');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .get('/folders/invalid-id/breadcrumb')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // GET /folders/:id/stats - Get Folder Statistics
  // =============================================================================
  describe('GET /folders/:id/stats', () => {
    let folderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Stats Folder' });

      folderId = res.body.folder._id;
    });

    it('should return folder statistics', async () => {
      const res = await request(app)
        .get(`/folders/${folderId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.folder).toBeDefined();
      expect(res.body.totalFiles).toBeDefined();
      expect(res.body.totalSize).toBeDefined();
      expect(res.body.subfolderCount).toBeDefined();
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .get('/folders/507f1f77bcf86cd799439011/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .get('/folders/invalid-id/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // PATCH /folders/:id - Update Folder
  // =============================================================================
  describe('PATCH /folders/:id', () => {
    let folderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Name' });

      folderId = res.body.folder._id;
    });

    it('should update folder name', async () => {
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.name).toBe('Updated Name');
      expect(res.body.folder.path).toBe('/Updated Name');
    });

    it('should update folder color', async () => {
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#00FF00' });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.color).toBe('#00FF00');
    });

    it('should update folder icon', async () => {
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ icon: 'archive' });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.icon).toBe('archive');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Name',
          color: '#FF0000',
          icon: 'star',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.name).toBe('New Name');
      expect(res.body.folder.color).toBe('#FF0000');
      expect(res.body.folder.icon).toBe('star');
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NAME_REQUIRED');
    });

    it('should reject duplicate name at same level', async () => {
      // Create another folder
      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Existing Folder' });

      // Try to rename to existing name
      const res = await request(app)
        .patch(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Existing Folder' });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('FOLDER_EXISTS');
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .patch('/folders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .patch('/folders/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // POST /folders/:id/move - Move Folder
  // =============================================================================
  describe('POST /folders/:id/move', () => {
    let sourceFolderId;
    let targetFolderId;

    beforeEach(async () => {
      // Create source folder
      const sourceRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Source Folder' });
      sourceFolderId = sourceRes.body.folder._id;

      // Create target folder
      const targetRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Target Folder' });
      targetFolderId = targetRes.body.folder._id;
    });

    it('should move folder to another folder', async () => {
      const res = await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: targetFolderId });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.parentId).toBe(targetFolderId);
      expect(res.body.folder.path).toBe('/Target Folder/Source Folder');
    });

    it('should move folder to root', async () => {
      // First move folder into another
      await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: targetFolderId });

      // Then move back to root
      const res = await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: null });

      expect(res.statusCode).toBe(200);
      expect(res.body.folder.parentId).toBeNull();
      expect(res.body.folder.path).toBe('/Source Folder');
    });

    it('should reject moving folder into itself', async () => {
      const res = await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: sourceFolderId });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_MOVE');
    });

    it('should reject moving folder into its descendant', async () => {
      // Create child of source
      const childRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Child', parentId: sourceFolderId });

      // Try to move source into its child
      const res = await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: childRes.body.folder._id });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_MOVE');
    });

    it('should reject invalid parentId format', async () => {
      const res = await request(app)
        .post(`/folders/${sourceFolderId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: 'invalid-id' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_PARENT_ID');
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .post('/folders/507f1f77bcf86cd799439011/move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: targetFolderId });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .post('/folders/invalid-id/move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: targetFolderId });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // POST /folders/:id/trash - Trash Folder
  // =============================================================================
  describe('POST /folders/:id/trash', () => {
    let folderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Folder to Trash' });

      folderId = res.body.folder._id;
    });

    it('should move folder to trash', async () => {
      const res = await request(app)
        .post(`/folders/${folderId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('trash');
      expect(res.body.folder.isTrashed).toBe(true);
    });

    it('should hide trashed folder from normal list', async () => {
      await request(app)
        .post(`/folders/${folderId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/folders')
        .set('Authorization', `Bearer ${authToken}`);

      const trashedFolder = res.body.folders.find(f => f._id === folderId);
      expect(trashedFolder).toBeUndefined();
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .post('/folders/507f1f77bcf86cd799439011/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .post('/folders/invalid-id/trash')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // POST /folders/:id/restore - Restore Folder
  // =============================================================================
  describe('POST /folders/:id/restore', () => {
    let folderId;

    beforeEach(async () => {
      // Create and trash a folder
      const createRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Folder to Restore' });

      folderId = createRes.body.folder._id;

      await request(app)
        .post(`/folders/${folderId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should restore folder from trash', async () => {
      const res = await request(app)
        .post(`/folders/${folderId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('restored');
      expect(res.body.folder.isTrashed).toBe(false);
    });

    it('should show restored folder in normal list', async () => {
      await request(app)
        .post(`/folders/${folderId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/folders')
        .set('Authorization', `Bearer ${authToken}`);

      const restoredFolder = res.body.folders.find(f => f._id === folderId);
      expect(restoredFolder).toBeDefined();
    });

    it('should return 404 for non-trashed folder', async () => {
      // Create a non-trashed folder
      const createRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Not Trashed' });

      const res = await request(app)
        .post(`/folders/${createRes.body.folder._id}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .post('/folders/invalid-id/restore')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =============================================================================
  // DELETE /folders/:id - Permanently Delete Folder
  // =============================================================================
  describe('DELETE /folders/:id', () => {
    let folderId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Folder to Delete' });

      folderId = res.body.folder._id;
    });

    it('should permanently delete folder', async () => {
      const res = await request(app)
        .delete(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');
      expect(res.body.filesDeleted).toBeDefined();
      expect(res.body.subfoldersDeleted).toBeDefined();

      // Verify folder is gone
      const getRes = await request(app)
        .get(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should delete folder and its subfolders', async () => {
      // Create subfolder
      await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Subfolder', parentId: folderId });

      const res = await request(app)
        .delete(`/folders/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.subfoldersDeleted).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for non-existent folder', async () => {
      const res = await request(app)
        .delete('/folders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('FOLDER_NOT_FOUND');
    });

    it('should return 400 for invalid folder ID', async () => {
      const res = await request(app)
        .delete('/folders/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete(`/folders/${folderId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // Nested Folder Operations
  // =============================================================================
  describe('Nested Folder Operations', () => {
    it('should handle deeply nested folder creation', async () => {
      let parentId = null;

      // Create 5 levels of nested folders
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/folders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Level ${i}`,
            parentId: parentId,
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.folder.depth).toBe(i - 1);
        parentId = res.body.folder._id;
      }
    });

    it('should update descendant paths when parent is renamed', async () => {
      // Create parent
      const parentRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent' });

      // Create child
      const childRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Child', parentId: parentRes.body.folder._id });

      // Rename parent
      await request(app)
        .patch(`/folders/${parentRes.body.folder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Renamed Parent' });

      // Verify child path was updated
      const childGetRes = await request(app)
        .get(`/folders/${childRes.body.folder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(childGetRes.body.folder.path).toBe('/Renamed Parent/Child');
    });

    it('should trash all subfolders when parent is trashed', async () => {
      // Create parent with child
      const parentRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent' });

      const childRes = await request(app)
        .post('/folders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Child', parentId: parentRes.body.folder._id });

      // Trash parent
      await request(app)
        .post(`/folders/${parentRes.body.folder._id}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify child is also trashed (not in normal list)
      const res = await request(app)
        .get('/folders')
        .set('Authorization', `Bearer ${authToken}`);

      const childFolder = res.body.folders.find(f => f._id === childRes.body.folder._id);
      expect(childFolder).toBeUndefined();
    });
  });
});
