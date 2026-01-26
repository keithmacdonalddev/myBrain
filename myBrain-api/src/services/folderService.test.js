/**
 * =============================================================================
 * FOLDERSERVICE.TEST.JS - Unit Tests for Folder Service
 * =============================================================================
 *
 * This test file contains comprehensive unit tests for the folder service.
 * Tests use MongoDB Memory Server (same as other project tests) for realistic
 * database behavior without affecting production data.
 *
 * TESTING APPROACH:
 * - Use in-memory MongoDB for realistic database operations
 * - Test each service function independently
 * - Cover happy paths, edge cases, and error conditions
 *
 * TEST CATEGORIES:
 * - createFolder(): Basic creation, nested folders, duplicate handling
 * - createEntityFolder(): Entity-linked folder creation
 * - updateFolder(): Name updates, cascade path updates
 * - moveFolder(): Hierarchy changes, circular prevention
 * - trashFolder(): Recursive trash operations
 * - restoreFolder(): Recursive restore operations
 * - deleteFolder(): Permanent deletion with S3 cleanup
 * - getFolders(), getFolder(), getFolderTree(), getBreadcrumb(): Retrieval
 * - getFolderStats(): Statistics calculation
 * - Edge cases: Circular hierarchies, root handling, empty folders
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import Folder from '../models/Folder.js';
import File from '../models/File.js';
import * as folderService from './folderService.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a test user ID for folder ownership
 */
const createTestUserId = () => new mongoose.Types.ObjectId();

/**
 * Create a folder directly in the database for testing
 */
async function createTestFolder(userId, data = {}) {
  const folder = new Folder({
    userId,
    name: data.name || 'Test Folder',
    parentId: data.parentId || null,
    color: data.color || null,
    icon: data.icon || 'folder',
    folderType: data.folderType || 'user',
    linkedEntityId: data.linkedEntityId || null,
    linkedEntityType: data.linkedEntityType || null,
    isTrashed: data.isTrashed || false,
    trashedAt: data.trashedAt || null,
  });

  await folder.generatePath();
  await folder.save();
  return folder;
}

/**
 * Create a test file in the database
 * Includes all required fields for the File model
 */
async function createTestFile(userId, folderId, data = {}) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const file = new File({
    userId,
    folderId: folderId || null,
    path: data.path || '/Test Folder',
    // Required storage fields
    storageProvider: data.storageProvider || 's3',
    storageKey: data.storageKey || `files/${userId}/${uniqueId}-test.txt`,
    storageBucket: data.storageBucket || 'mybrain-test-bucket',
    // Required file identity fields
    filename: data.filename || `${uniqueId}-test.txt`,
    originalName: data.originalName || 'test-file.txt',
    // Required file info
    mimeType: data.mimeType || 'text/plain',
    size: data.size || 1024,
    // Optional fields
    extension: data.extension || 'txt',
    fileCategory: data.fileCategory || 'document',
    isTrashed: data.isTrashed || false,
    isLatestVersion: data.isLatestVersion !== false,
  });

  await file.save();
  return file;
}

// =============================================================================
// TESTS
// =============================================================================

describe('folderService', () => {
  // ===========================================================================
  // createFolder() Tests
  // ===========================================================================
  describe('createFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should create a folder with valid data at root level', async () => {
      // Act
      const folder = await folderService.createFolder(userId, {
        name: 'Documents',
      });

      // Assert
      expect(folder).toBeDefined();
      expect(folder.name).toBe('Documents');
      expect(folder.path).toBe('/Documents');
      expect(folder.parentId).toBeNull();
      expect(folder.depth).toBe(0);
      expect(folder.folderType).toBe('user');
    });

    it('should create folder with custom color and icon', async () => {
      // Act
      const folder = await folderService.createFolder(userId, {
        name: 'Colored Folder',
        color: '#FF6B6B',
        icon: 'briefcase',
      });

      // Assert
      expect(folder.color).toBe('#FF6B6B');
      expect(folder.icon).toBe('briefcase');
    });

    it('should create nested folder with correct path', async () => {
      // Arrange
      const parentFolder = await folderService.createFolder(userId, {
        name: 'Parent',
      });

      // Act
      const childFolder = await folderService.createFolder(userId, {
        name: 'Child',
        parentId: parentFolder._id,
      });

      // Assert
      expect(childFolder.parentId.toString()).toBe(parentFolder._id.toString());
      expect(childFolder.path).toBe('/Parent/Child');
      expect(childFolder.depth).toBe(1);
    });

    it('should create deeply nested folder structure', async () => {
      // Arrange
      const level1 = await folderService.createFolder(userId, { name: 'Level1' });
      const level2 = await folderService.createFolder(userId, { name: 'Level2', parentId: level1._id });
      const level3 = await folderService.createFolder(userId, { name: 'Level3', parentId: level2._id });

      // Act
      const level4 = await folderService.createFolder(userId, { name: 'Level4', parentId: level3._id });

      // Assert
      expect(level4.path).toBe('/Level1/Level2/Level3/Level4');
      expect(level4.depth).toBe(3);
    });

    it('should throw error when folder name already exists in same parent', async () => {
      // Arrange
      await folderService.createFolder(userId, { name: 'Documents' });

      // Act & Assert
      await expect(
        folderService.createFolder(userId, { name: 'Documents' })
      ).rejects.toThrow('A folder with this name already exists in this location');
    });

    it('should allow same name in different parents', async () => {
      // Arrange
      const parent1 = await folderService.createFolder(userId, { name: 'Parent1' });
      const parent2 = await folderService.createFolder(userId, { name: 'Parent2' });

      // Act
      const child1 = await folderService.createFolder(userId, {
        name: 'Reports',
        parentId: parent1._id,
      });
      const child2 = await folderService.createFolder(userId, {
        name: 'Reports',
        parentId: parent2._id,
      });

      // Assert
      expect(child1.name).toBe('Reports');
      expect(child2.name).toBe('Reports');
      expect(child1._id.toString()).not.toBe(child2._id.toString());
    });

    it('should use default icon when not specified', async () => {
      // Act
      const folder = await folderService.createFolder(userId, { name: 'Test' });

      // Assert
      expect(folder.icon).toBe('folder');
    });
  });

  // ===========================================================================
  // createEntityFolder() Tests
  // ===========================================================================
  describe('createEntityFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should create folder linked to project entity', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();

      // Act
      const folder = await folderService.createEntityFolder(
        userId,
        entityId,
        'project',
        'My Project'
      );

      // Assert
      expect(folder.name).toBe('My Project');
      expect(folder.linkedEntityId.toString()).toBe(entityId.toString());
      expect(folder.linkedEntityType).toBe('project');
      expect(folder.folderType).toBe('project');
      expect(folder.icon).toBe('folder-kanban');
    });

    it('should create folder linked to task entity', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();

      // Act
      const folder = await folderService.createEntityFolder(
        userId,
        entityId,
        'task',
        'My Task'
      );

      // Assert
      expect(folder.linkedEntityType).toBe('task');
      expect(folder.icon).toBe('folder-check');
    });

    it('should create folder linked to note entity', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();

      // Act
      const folder = await folderService.createEntityFolder(
        userId,
        entityId,
        'note',
        'My Note'
      );

      // Assert
      expect(folder.linkedEntityType).toBe('note');
      expect(folder.icon).toBe('folder-file');
    });

    it('should return existing folder if entity folder already exists', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();
      const firstFolder = await folderService.createEntityFolder(
        userId,
        entityId,
        'project',
        'My Project'
      );

      // Act
      const secondFolder = await folderService.createEntityFolder(
        userId,
        entityId,
        'project',
        'Different Name'
      );

      // Assert
      expect(secondFolder._id.toString()).toBe(firstFolder._id.toString());
      expect(secondFolder.name).toBe('My Project'); // Original name preserved
    });

    it('should create entity folders at root level', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();

      // Act
      const folder = await folderService.createEntityFolder(
        userId,
        entityId,
        'project',
        'Test Project'
      );

      // Assert
      expect(folder.parentId).toBeNull();
    });
  });

  // ===========================================================================
  // getFolders() Tests
  // ===========================================================================
  describe('getFolders()', () => {
    let userId;

    beforeEach(async () => {
      userId = createTestUserId();
      await folderService.createFolder(userId, { name: 'Documents' });
      await folderService.createFolder(userId, { name: 'Photos' });
      await folderService.createFolder(userId, { name: 'Work' });
    });

    it('should return all non-trashed folders for user', async () => {
      // Act
      const folders = await folderService.getFolders(userId);

      // Assert
      expect(folders).toHaveLength(3);
    });

    it('should return folders sorted by name', async () => {
      // Act
      const folders = await folderService.getFolders(userId);

      // Assert
      expect(folders[0].name).toBe('Documents');
      expect(folders[1].name).toBe('Photos');
      expect(folders[2].name).toBe('Work');
    });

    it('should filter by parentId for root folders', async () => {
      // Arrange
      const parentFolder = await folderService.getFolder(
        (await folderService.getFolders(userId))[0]._id,
        userId
      );
      await folderService.createFolder(userId, { name: 'Subfolder', parentId: parentFolder._id });

      // Act
      const rootFolders = await folderService.getFolders(userId, { parentId: null });

      // Assert
      expect(rootFolders).toHaveLength(3);
      rootFolders.forEach(f => expect(f.parentId).toBeNull());
    });

    it('should filter by parentId for subfolders', async () => {
      // Arrange
      const folders = await folderService.getFolders(userId);
      const parentId = folders[0]._id;
      await folderService.createFolder(userId, { name: 'Sub1', parentId });
      await folderService.createFolder(userId, { name: 'Sub2', parentId });

      // Act
      const subfolders = await folderService.getFolders(userId, { parentId });

      // Assert
      expect(subfolders).toHaveLength(2);
      subfolders.forEach(f => expect(f.parentId.toString()).toBe(parentId.toString()));
    });

    it('should exclude trashed folders by default', async () => {
      // Arrange
      const folders = await folderService.getFolders(userId);
      await folderService.trashFolder(folders[0]._id, userId);

      // Act
      const activeFolders = await folderService.getFolders(userId);

      // Assert
      expect(activeFolders).toHaveLength(2);
    });

    it('should include trashed folders when option is set', async () => {
      // Arrange
      const folders = await folderService.getFolders(userId);
      await folderService.trashFolder(folders[0]._id, userId);

      // Act
      const allFolders = await folderService.getFolders(userId, { includeTrashed: true });

      // Assert
      expect(allFolders).toHaveLength(3);
    });

    it('should filter by folder type', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();
      await folderService.createEntityFolder(userId, entityId, 'project', 'Project Folder');

      // Act
      const projectFolders = await folderService.getFolders(userId, { folderType: 'project' });

      // Assert
      expect(projectFolders).toHaveLength(1);
      expect(projectFolders[0].folderType).toBe('project');
    });
  });

  // ===========================================================================
  // getFolderTree() Tests
  // ===========================================================================
  describe('getFolderTree()', () => {
    let userId;

    beforeEach(async () => {
      userId = createTestUserId();
    });

    it('should return hierarchical folder tree structure', async () => {
      // Arrange
      const documents = await folderService.createFolder(userId, { name: 'Documents' });
      await folderService.createFolder(userId, { name: 'Work', parentId: documents._id });
      await folderService.createFolder(userId, { name: 'Personal', parentId: documents._id });
      await folderService.createFolder(userId, { name: 'Photos' });

      // Act
      const tree = await folderService.getFolderTree(userId);

      // Assert
      expect(tree).toHaveLength(2); // Two root folders
      const docsFolder = tree.find(f => f.name === 'Documents');
      expect(docsFolder.children).toHaveLength(2);
    });

    it('should exclude trashed folders by default', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'ToTrash' });
      await folderService.createFolder(userId, { name: 'Active' });
      await folderService.trashFolder(folder._id, userId);

      // Act
      const tree = await folderService.getFolderTree(userId);

      // Assert
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('Active');
    });

    it('should include trashed folders when option is set', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'ToTrash' });
      await folderService.createFolder(userId, { name: 'Active' });
      await folderService.trashFolder(folder._id, userId);

      // Act
      const tree = await folderService.getFolderTree(userId, { includeTrashed: true });

      // Assert
      expect(tree).toHaveLength(2);
    });
  });

  // ===========================================================================
  // getFolder() Tests
  // ===========================================================================
  describe('getFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should return folder by ID', async () => {
      // Arrange
      const created = await folderService.createFolder(userId, { name: 'Test Folder' });

      // Act
      const folder = await folderService.getFolder(created._id, userId);

      // Assert
      expect(folder).toBeDefined();
      expect(folder._id.toString()).toBe(created._id.toString());
    });

    it('should return null for non-existent folder', async () => {
      // Act
      const folder = await folderService.getFolder(new mongoose.Types.ObjectId(), userId);

      // Assert
      expect(folder).toBeNull();
    });

    it('should return null for folder belonging to different user', async () => {
      // Arrange
      const created = await folderService.createFolder(userId, { name: 'Test Folder' });
      const differentUserId = createTestUserId();

      // Act
      const folder = await folderService.getFolder(created._id, differentUserId);

      // Assert
      expect(folder).toBeNull();
    });
  });

  // ===========================================================================
  // getBreadcrumb() Tests
  // ===========================================================================
  describe('getBreadcrumb()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should return breadcrumb path from root to folder', async () => {
      // Arrange
      const documents = await folderService.createFolder(userId, { name: 'Documents' });
      const work = await folderService.createFolder(userId, { name: 'Work', parentId: documents._id });
      const reports = await folderService.createFolder(userId, { name: 'Reports', parentId: work._id });

      // Act
      const breadcrumb = await folderService.getBreadcrumb(reports._id);

      // Assert
      expect(breadcrumb).toHaveLength(3);
      expect(breadcrumb[0].name).toBe('Documents');
      expect(breadcrumb[1].name).toBe('Work');
      expect(breadcrumb[2].name).toBe('Reports');
    });

    it('should return single item for root level folder', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'RootFolder' });

      // Act
      const breadcrumb = await folderService.getBreadcrumb(folder._id);

      // Assert
      expect(breadcrumb).toHaveLength(1);
      expect(breadcrumb[0].name).toBe('RootFolder');
    });

    it('should return empty array for non-existent folder', async () => {
      // Act
      const breadcrumb = await folderService.getBreadcrumb(new mongoose.Types.ObjectId());

      // Assert
      expect(breadcrumb).toEqual([]);
    });
  });

  // ===========================================================================
  // updateFolder() Tests
  // ===========================================================================
  describe('updateFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should update folder name', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Old Name' });

      // Act
      const updated = await folderService.updateFolder(folder._id, userId, {
        name: 'New Name',
      });

      // Assert
      expect(updated.name).toBe('New Name');
      expect(updated.path).toBe('/New Name');
    });

    it('should update folder color', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Test' });

      // Act
      const updated = await folderService.updateFolder(folder._id, userId, {
        color: '#FF0000',
      });

      // Assert
      expect(updated.color).toBe('#FF0000');
    });

    it('should update folder icon', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Test' });

      // Act
      const updated = await folderService.updateFolder(folder._id, userId, {
        icon: 'archive',
      });

      // Assert
      expect(updated.icon).toBe('archive');
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Test' });

      // Act
      const updated = await folderService.updateFolder(folder._id, userId, {
        name: 'Updated',
        color: '#00FF00',
        icon: 'star',
      });

      // Assert
      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#00FF00');
      expect(updated.icon).toBe('star');
    });

    it('should cascade rename to all descendant folders', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
      const grandchild = await folderService.createFolder(userId, { name: 'Grandchild', parentId: child._id });

      // Act
      await folderService.updateFolder(parent._id, userId, { name: 'Renamed' });

      // Assert - verify descendants have updated paths
      const updatedChild = await folderService.getFolder(child._id, userId);
      const updatedGrandchild = await folderService.getFolder(grandchild._id, userId);

      expect(updatedChild.path).toBe('/Renamed/Child');
      expect(updatedGrandchild.path).toBe('/Renamed/Child/Grandchild');
    });

    it('should update file paths when folder is renamed', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Original' });
      await createTestFile(userId, folder._id, { path: '/Original' });

      // Act
      await folderService.updateFolder(folder._id, userId, { name: 'Renamed' });

      // Assert
      const files = await File.find({ folderId: folder._id });
      expect(files[0].path).toBe('/Renamed');
    });

    it('should throw error when renaming to existing name in same parent', async () => {
      // Arrange
      await folderService.createFolder(userId, { name: 'Existing' });
      const folder = await folderService.createFolder(userId, { name: 'ToRename' });

      // Act & Assert
      await expect(
        folderService.updateFolder(folder._id, userId, { name: 'Existing' })
      ).rejects.toThrow('A folder with this name already exists in this location');
    });

    it('should return null if folder not found', async () => {
      // Act
      const result = await folderService.updateFolder(
        new mongoose.Types.ObjectId(),
        userId,
        { name: 'Test' }
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should only allow whitelisted fields to be updated', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Test' });

      // Act - try to update non-whitelisted field
      const updated = await folderService.updateFolder(folder._id, userId, {
        name: 'Updated',
        isTrashed: true, // Should be ignored
        folderType: 'system', // Should be ignored
      });

      // Assert
      expect(updated.name).toBe('Updated');
      expect(updated.isTrashed).toBe(false);
      expect(updated.folderType).toBe('user');
    });
  });

  // ===========================================================================
  // moveFolder() Tests
  // ===========================================================================
  describe('moveFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should move folder to new parent', async () => {
      // Arrange
      const source = await folderService.createFolder(userId, { name: 'Source' });
      const target = await folderService.createFolder(userId, { name: 'Target' });

      // Act
      const moved = await folderService.moveFolder(source._id, target._id, userId);

      // Assert
      expect(moved.parentId.toString()).toBe(target._id.toString());
      expect(moved.path).toBe('/Target/Source');
    });

    it('should move folder to root level', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });

      // Act
      const moved = await folderService.moveFolder(child._id, null, userId);

      // Assert
      expect(moved.parentId).toBeNull();
      expect(moved.path).toBe('/Child');
    });

    it('should update descendant paths after move', async () => {
      // Arrange
      const source = await folderService.createFolder(userId, { name: 'Source' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: source._id });
      const target = await folderService.createFolder(userId, { name: 'Target' });

      // Act
      await folderService.moveFolder(source._id, target._id, userId);

      // Assert
      const updatedChild = await folderService.getFolder(child._id, userId);
      expect(updatedChild.path).toBe('/Target/Source/Child');
    });

    it('should prevent moving folder into itself', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Folder' });

      // Act & Assert
      await expect(
        folderService.moveFolder(folder._id, folder._id, userId)
      ).rejects.toThrow('Cannot move folder into its own descendant');
    });

    it('should prevent moving folder into its descendant', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });

      // Act & Assert
      await expect(
        folderService.moveFolder(parent._id, child._id, userId)
      ).rejects.toThrow('Cannot move folder into its own descendant');
    });

    it('should throw error if target folder not found', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Folder' });
      const nonExistentId = new mongoose.Types.ObjectId();

      // Act & Assert
      await expect(
        folderService.moveFolder(folder._id, nonExistentId, userId)
      ).rejects.toThrow('Target folder not found');
    });

    it('should throw error if name exists in target location', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'MyFolder' });
      const target = await folderService.createFolder(userId, { name: 'Target' });
      await folderService.createFolder(userId, { name: 'MyFolder', parentId: target._id });

      // Act & Assert
      await expect(
        folderService.moveFolder(folder._id, target._id, userId)
      ).rejects.toThrow('A folder with this name already exists in the target location');
    });

    it('should return null if folder not found', async () => {
      // Act
      const result = await folderService.moveFolder(
        new mongoose.Types.ObjectId(),
        null,
        userId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // trashFolder() Tests
  // ===========================================================================
  describe('trashFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should move folder to trash', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'ToTrash' });

      // Act
      const trashed = await folderService.trashFolder(folder._id, userId);

      // Assert
      expect(trashed.isTrashed).toBe(true);
      expect(trashed.trashedAt).toBeDefined();
    });

    it('should recursively trash all subfolders', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
      const grandchild = await folderService.createFolder(userId, { name: 'Grandchild', parentId: child._id });

      // Act
      await folderService.trashFolder(parent._id, userId);

      // Assert
      const trashedChild = await Folder.findById(child._id);
      const trashedGrandchild = await Folder.findById(grandchild._id);

      expect(trashedChild.isTrashed).toBe(true);
      expect(trashedGrandchild.isTrashed).toBe(true);
    });

    it('should trash all files in folder and subfolders', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Parent' });
      await createTestFile(userId, folder._id, { path: folder.path });

      // Act
      await folderService.trashFolder(folder._id, userId);

      // Assert
      const files = await File.find({ userId, folderId: folder._id });
      expect(files[0].isTrashed).toBe(true);
    });

    it('should return null if folder not found', async () => {
      // Act
      const result = await folderService.trashFolder(new mongoose.Types.ObjectId(), userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // restoreFolder() Tests
  // ===========================================================================
  describe('restoreFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should restore folder from trash', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'ToRestore' });
      await folderService.trashFolder(folder._id, userId);

      // Act
      const restored = await folderService.restoreFolder(folder._id, userId);

      // Assert
      expect(restored.isTrashed).toBe(false);
      expect(restored.trashedAt).toBeUndefined();
    });

    it('should recursively restore all subfolders', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
      await folderService.trashFolder(parent._id, userId);

      // Act
      await folderService.restoreFolder(parent._id, userId);

      // Assert
      const restoredChild = await Folder.findById(child._id);
      expect(restoredChild.isTrashed).toBe(false);
    });

    it('should restore all files in folder and subfolders', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Parent' });
      await createTestFile(userId, folder._id, { path: folder.path });
      await folderService.trashFolder(folder._id, userId);

      // Act
      await folderService.restoreFolder(folder._id, userId);

      // Assert
      const files = await File.find({ userId, folderId: folder._id });
      expect(files[0].isTrashed).toBe(false);
    });

    it('should return null if folder not found or not trashed', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'NotTrashed' });

      // Act
      const result = await folderService.restoreFolder(folder._id, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // deleteFolder() Tests
  // ===========================================================================
  describe('deleteFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should permanently delete folder', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'ToDelete' });

      // Act
      const result = await folderService.deleteFolder(folder._id, userId);

      // Assert
      expect(result.deleted).toBe(true);
      const deleted = await Folder.findById(folder._id);
      expect(deleted).toBeNull();
    });

    it('should delete all subfolders', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
      const grandchild = await folderService.createFolder(userId, { name: 'Grandchild', parentId: child._id });

      // Act
      const result = await folderService.deleteFolder(parent._id, userId);

      // Assert
      expect(result.subfoldersDeleted).toBe(2);
      const deletedChild = await Folder.findById(child._id);
      const deletedGrandchild = await Folder.findById(grandchild._id);
      expect(deletedChild).toBeNull();
      expect(deletedGrandchild).toBeNull();
    });

    it('should return deletion stats', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Parent' });
      await folderService.createFolder(userId, { name: 'Child', parentId: folder._id });

      // Act
      const result = await folderService.deleteFolder(folder._id, userId);

      // Assert
      expect(result).toHaveProperty('deleted', true);
      expect(result).toHaveProperty('filesDeleted');
      expect(result).toHaveProperty('subfoldersDeleted');
      expect(result.subfoldersDeleted).toBe(1);
    });

    it('should return not deleted if folder not found', async () => {
      // Act
      const result = await folderService.deleteFolder(new mongoose.Types.ObjectId(), userId);

      // Assert
      expect(result.deleted).toBe(false);
      expect(result.filesDeleted).toBe(0);
      expect(result.subfoldersDeleted).toBe(0);
    });
  });

  // ===========================================================================
  // getFolderStats() Tests
  // ===========================================================================
  describe('getFolderStats()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should return folder statistics', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Stats Folder' });
      await createTestFile(userId, folder._id, { path: folder.path, size: 1000 });
      await createTestFile(userId, folder._id, { path: folder.path, size: 2000 });
      await folderService.createFolder(userId, { name: 'Subfolder', parentId: folder._id });

      // Act
      const stats = await folderService.getFolderStats(folder._id, userId);

      // Assert
      expect(stats.folder).toBeDefined();
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3000);
      expect(stats.subfolderCount).toBe(1);
    });

    it('should return zero stats for empty folder', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Empty Folder' });

      // Act
      const stats = await folderService.getFolderStats(folder._id, userId);

      // Assert
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.subfolderCount).toBe(0);
    });

    it('should return null if folder not found', async () => {
      // Act
      const stats = await folderService.getFolderStats(new mongoose.Types.ObjectId(), userId);

      // Assert
      expect(stats).toBeNull();
    });

    it('should only count non-trashed files', async () => {
      // Arrange
      const folder = await folderService.createFolder(userId, { name: 'Folder' });
      await createTestFile(userId, folder._id, { path: folder.path, size: 1000 });
      const trashedFile = await createTestFile(userId, folder._id, { path: folder.path, size: 2000 });
      await File.findByIdAndUpdate(trashedFile._id, { isTrashed: true });

      // Act
      const stats = await folderService.getFolderStats(folder._id, userId);

      // Assert
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalSize).toBe(1000);
    });
  });

  // ===========================================================================
  // getTrashedFolders() Tests
  // ===========================================================================
  describe('getTrashedFolders()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should return top-level trashed folders', async () => {
      // Arrange
      const folder1 = await folderService.createFolder(userId, { name: 'Trash1' });
      const folder2 = await folderService.createFolder(userId, { name: 'Trash2' });
      await folderService.trashFolder(folder1._id, userId);
      await folderService.trashFolder(folder2._id, userId);

      // Act
      const trashed = await folderService.getTrashedFolders(userId);

      // Assert
      expect(trashed).toHaveLength(2);
    });

    it('should not return child folders of trashed parents', async () => {
      // Arrange
      const parent = await folderService.createFolder(userId, { name: 'Parent' });
      await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
      await folderService.trashFolder(parent._id, userId);

      // Act
      const trashed = await folderService.getTrashedFolders(userId);

      // Assert - should only return parent, not child
      expect(trashed).toHaveLength(1);
      expect(trashed[0].name).toBe('Parent');
    });

    it('should return empty array when no trashed folders', async () => {
      // Arrange
      await folderService.createFolder(userId, { name: 'Active' });

      // Act
      const trashed = await folderService.getTrashedFolders(userId);

      // Assert
      expect(trashed).toEqual([]);
    });
  });

  // ===========================================================================
  // getEntityFolder() Tests
  // ===========================================================================
  describe('getEntityFolder()', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    it('should return folder linked to entity', async () => {
      // Arrange
      const entityId = new mongoose.Types.ObjectId();
      await folderService.createEntityFolder(userId, entityId, 'project', 'Project');

      // Act
      const folder = await folderService.getEntityFolder(entityId, 'project');

      // Assert
      expect(folder).toBeDefined();
      expect(folder.linkedEntityId.toString()).toBe(entityId.toString());
    });

    it('should return null if no entity folder exists', async () => {
      // Act
      const folder = await folderService.getEntityFolder(
        new mongoose.Types.ObjectId(),
        'project'
      );

      // Assert
      expect(folder).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe('Edge Cases', () => {
    let userId;

    beforeEach(() => {
      userId = createTestUserId();
    });

    describe('Circular Hierarchy Prevention', () => {
      it('should prevent creating circular reference through move', async () => {
        // Arrange
        const parent = await folderService.createFolder(userId, { name: 'Parent' });
        const child = await folderService.createFolder(userId, { name: 'Child', parentId: parent._id });
        const grandchild = await folderService.createFolder(userId, { name: 'Grandchild', parentId: child._id });

        // Act & Assert - moving parent into grandchild creates cycle
        await expect(
          folderService.moveFolder(parent._id, grandchild._id, userId)
        ).rejects.toThrow();
      });
    });

    describe('Root Folder Handling', () => {
      it('should correctly handle root level operations', async () => {
        // Arrange
        const folder = await folderService.createFolder(userId, { name: 'RootFolder' });

        // Assert
        expect(folder.parentId).toBeNull();
        expect(folder.depth).toBe(0);
        expect(folder.path).toBe('/RootFolder');
      });

      it('should allow moving any folder to root', async () => {
        // Arrange
        const parent = await folderService.createFolder(userId, { name: 'Parent' });
        const nested = await folderService.createFolder(userId, { name: 'Nested', parentId: parent._id });

        // Act
        const moved = await folderService.moveFolder(nested._id, null, userId);

        // Assert
        expect(moved.parentId).toBeNull();
        expect(moved.depth).toBe(0);
      });
    });

    describe('Empty Folder Handling', () => {
      it('should allow all operations on empty folders', async () => {
        // Arrange
        const folder = await folderService.createFolder(userId, { name: 'Empty' });

        // Act & Assert - all operations should work
        const updated = await folderService.updateFolder(folder._id, userId, { name: 'Renamed' });
        expect(updated.name).toBe('Renamed');

        const trashed = await folderService.trashFolder(folder._id, userId);
        expect(trashed.isTrashed).toBe(true);

        const restored = await folderService.restoreFolder(folder._id, userId);
        expect(restored.isTrashed).toBe(false);

        const deleted = await folderService.deleteFolder(folder._id, userId);
        expect(deleted.deleted).toBe(true);
      });
    });

    describe('Path String Manipulation', () => {
      it('should handle folders with special characters in name', async () => {
        // Arrange
        const folder = await folderService.createFolder(userId, { name: 'Folder (2024)' });

        // Assert
        expect(folder.path).toBe('/Folder (2024)');
      });

      it('should correctly update deeply nested paths', async () => {
        // Arrange
        const level1 = await folderService.createFolder(userId, { name: 'L1' });
        const level2 = await folderService.createFolder(userId, { name: 'L2', parentId: level1._id });
        const level3 = await folderService.createFolder(userId, { name: 'L3', parentId: level2._id });
        const level4 = await folderService.createFolder(userId, { name: 'L4', parentId: level3._id });
        const level5 = await folderService.createFolder(userId, { name: 'L5', parentId: level4._id });

        // Act
        await folderService.updateFolder(level1._id, userId, { name: 'Renamed' });

        // Assert
        const updated = await folderService.getFolder(level5._id, userId);
        expect(updated.path).toBe('/Renamed/L2/L3/L4/L5');
      });
    });

    describe('Case Insensitive Name Matching', () => {
      it('should treat names as case-insensitive for uniqueness', async () => {
        // Arrange
        await folderService.createFolder(userId, { name: 'Documents' });

        // Act & Assert - same name different case should fail
        await expect(
          folderService.createFolder(userId, { name: 'documents' })
        ).rejects.toThrow('A folder with this name already exists');
      });
    });

    describe('getFolderWithContents()', () => {
      it('should return folder with subfolders and files', async () => {
        // Arrange
        const folder = await folderService.createFolder(userId, { name: 'Parent' });
        await folderService.createFolder(userId, { name: 'Sub1', parentId: folder._id });
        await folderService.createFolder(userId, { name: 'Sub2', parentId: folder._id });
        await createTestFile(userId, folder._id, { path: folder.path });

        // Act
        const contents = await folderService.getFolderWithContents(folder._id, userId);

        // Assert
        expect(contents.folder).toBeDefined();
        expect(contents.subfolders).toHaveLength(2);
        expect(contents.files).toHaveLength(1);
      });

      it('should return root contents when folderId is null', async () => {
        // Arrange
        await folderService.createFolder(userId, { name: 'RootFolder1' });
        await folderService.createFolder(userId, { name: 'RootFolder2' });

        // Act
        const contents = await folderService.getFolderWithContents(null, userId);

        // Assert
        expect(contents.folder).toBeNull();
        expect(contents.subfolders.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
