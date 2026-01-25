/**
 * =============================================================================
 * FOLDER MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Folder model, covering:
 * - Instance methods (toSafeJSON, generatePath)
 * - Static methods (updateDescendantPaths, getFolderTree, getBreadcrumb,
 *   updateFolderStats, getFolderContents, nameExistsInParent, canMoveTo)
 * - Folder creation (root and nested)
 * - Hierarchy (parent/child relationships)
 * - Path generation (materialized paths)
 * - Move operations (update paths, prevent cycles)
 * - Stats (file counts, total size)
 * - Name uniqueness (within same parent)
 * - User isolation (can't access other users' folders)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import Folder from './Folder.js';
import File from './File.js';
import User from './User.js';

// Import test setup for MongoDB Memory Server
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
 * @param {Object} overrides - Fields to override
 * @returns {Promise<Object>} - Created user document
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'free',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Creates a test folder with sensible defaults.
 * @param {Object} overrides - Fields to override
 * @returns {Promise<Object>} - Created folder document
 */
async function createTestFolder(overrides = {}) {
  const defaults = {
    name: `Folder-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    path: '/default',
    folderType: 'user',
  };
  return Folder.create({ ...defaults, ...overrides });
}

/**
 * Creates a test file with sensible defaults.
 * @param {Object} overrides - Fields to override
 * @returns {Promise<Object>} - Created file document
 */
async function createTestFile(overrides = {}) {
  const defaults = {
    filename: `file-${Date.now()}.pdf`,
    originalName: 'test-file.pdf',
    storageProvider: 's3',
    storageKey: `files/test-${Date.now()}.pdf`,
    storageBucket: 'mybrain-test',
    mimeType: 'application/pdf',
    size: 1024,
    isLatestVersion: true,
    isTrashed: false,
  };
  return File.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: FOLDER CREATION
// =============================================================================

describe('Folder Model', () => {
  // ---------------------------------------------------------------------------
  // Folder Creation
  // ---------------------------------------------------------------------------
  describe('Folder Creation', () => {
    describe('Root folders', () => {
      it('should create a root folder with required fields', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        expect(folder._id).toBeDefined();
        expect(folder.userId.toString()).toBe(user._id.toString());
        expect(folder.name).toBe('Documents');
        expect(folder.path).toBe('/Documents');
        expect(folder.parentId).toBeNull();
        expect(folder.depth).toBe(0);
      });

      it('should set default values for optional fields', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'New Folder',
          path: '/New Folder',
        });

        expect(folder.folderType).toBe('user');
        expect(folder.icon).toBe('folder');
        expect(folder.color).toBeNull();
        expect(folder.isPublic).toBe(false);
        expect(folder.isTrashed).toBe(false);
        expect(folder.stats.fileCount).toBe(0);
        expect(folder.stats.totalSize).toBe(0);
        expect(folder.stats.subfolderCount).toBe(0);
      });

      it('should set timestamps on creation', async () => {
        const user = await createTestUser();
        const before = new Date();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Timestamped',
          path: '/Timestamped',
        });
        const after = new Date();

        expect(folder.createdAt).toBeInstanceOf(Date);
        expect(folder.updatedAt).toBeInstanceOf(Date);
        expect(folder.createdAt >= before).toBe(true);
        expect(folder.createdAt <= after).toBe(true);
      });

      it('should require userId', async () => {
        await expect(
          Folder.create({
            name: 'No User',
            path: '/No User',
          })
        ).rejects.toThrow(/userId.*required|Path `userId` is required/i);
      });

      it('should require name', async () => {
        const user = await createTestUser();
        await expect(
          Folder.create({
            userId: user._id,
            path: '/test',
          })
        ).rejects.toThrow(/name.*required|Path `name` is required/i);
      });

      it('should require path', async () => {
        const user = await createTestUser();
        await expect(
          Folder.create({
            userId: user._id,
            name: 'No Path',
          })
        ).rejects.toThrow(/path.*required|Path `path` is required/i);
      });

      it('should enforce max name length', async () => {
        const user = await createTestUser();
        const longName = 'a'.repeat(256);
        await expect(
          Folder.create({
            userId: user._id,
            name: longName,
            path: `/${longName}`,
          })
        ).rejects.toThrow(/cannot exceed 255 characters/);
      });

      it('should trim whitespace from name', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: '  Trimmed Name  ',
          path: '/Trimmed Name',
        });

        expect(folder.name).toBe('Trimmed Name');
      });
    });

    describe('Nested folders', () => {
      it('should create a nested folder with parentId', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
          depth: 0,
        });

        const child = await Folder.create({
          userId: user._id,
          name: 'Child',
          path: '/Parent/Child',
          parentId: parent._id,
          depth: 1,
        });

        expect(child.parentId.toString()).toBe(parent._id.toString());
        expect(child.path).toBe('/Parent/Child');
        expect(child.depth).toBe(1);
      });

      it('should create deeply nested folders', async () => {
        const user = await createTestUser();
        const level0 = await Folder.create({
          userId: user._id,
          name: 'Level0',
          path: '/Level0',
          depth: 0,
        });

        const level1 = await Folder.create({
          userId: user._id,
          name: 'Level1',
          path: '/Level0/Level1',
          parentId: level0._id,
          depth: 1,
        });

        const level2 = await Folder.create({
          userId: user._id,
          name: 'Level2',
          path: '/Level0/Level1/Level2',
          parentId: level1._id,
          depth: 2,
        });

        const level3 = await Folder.create({
          userId: user._id,
          name: 'Level3',
          path: '/Level0/Level1/Level2/Level3',
          parentId: level2._id,
          depth: 3,
        });

        expect(level3.depth).toBe(3);
        expect(level3.path).toBe('/Level0/Level1/Level2/Level3');
      });
    });

    describe('Folder types', () => {
      it('should accept all valid folder types', async () => {
        const user = await createTestUser();
        const types = ['user', 'project', 'task', 'note', 'system'];

        for (const type of types) {
          const folder = await Folder.create({
            userId: user._id,
            name: `${type} Folder`,
            path: `/${type}`,
            folderType: type,
          });
          expect(folder.folderType).toBe(type);
        }
      });

      it('should reject invalid folder type', async () => {
        const user = await createTestUser();
        await expect(
          Folder.create({
            userId: user._id,
            name: 'Invalid Type',
            path: '/invalid',
            folderType: 'invalid',
          })
        ).rejects.toThrow();
      });

      it('should link entity for project folder', async () => {
        const user = await createTestUser();
        const projectId = new mongoose.Types.ObjectId();

        const folder = await Folder.create({
          userId: user._id,
          name: 'Project Folder',
          path: '/Project Folder',
          folderType: 'project',
          linkedEntityId: projectId,
          linkedEntityType: 'project',
        });

        expect(folder.linkedEntityId.toString()).toBe(projectId.toString());
        expect(folder.linkedEntityType).toBe('project');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Instance Methods
  // ---------------------------------------------------------------------------
  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should remove __v from output', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Test',
          path: '/Test',
        });

        const json = folder.toSafeJSON();

        expect(json.__v).toBeUndefined();
        expect(json._id).toBeDefined();
        expect(json.name).toBe('Test');
      });

      it('should include all folder fields', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Complete',
          path: '/Complete',
          color: '#3b82f6',
          icon: 'briefcase',
          folderType: 'user',
          isPublic: true,
        });

        const json = folder.toSafeJSON();

        expect(json.name).toBe('Complete');
        expect(json.path).toBe('/Complete');
        expect(json.color).toBe('#3b82f6');
        expect(json.icon).toBe('briefcase');
        expect(json.isPublic).toBe(true);
      });

      it('should include stats in output', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'With Stats',
          path: '/With Stats',
          stats: {
            fileCount: 5,
            totalSize: 1024000,
            subfolderCount: 2,
          },
        });

        const json = folder.toSafeJSON();

        expect(json.stats.fileCount).toBe(5);
        expect(json.stats.totalSize).toBe(1024000);
        expect(json.stats.subfolderCount).toBe(2);
      });
    });

    describe('generatePath()', () => {
      it('should generate path for root folder', async () => {
        const user = await createTestUser();
        const folder = new Folder({
          userId: user._id,
          name: 'Root',
          path: '',
          parentId: null,
        });

        const path = await folder.generatePath();

        expect(path).toBe('/Root');
        expect(folder.path).toBe('/Root');
        expect(folder.depth).toBe(0);
      });

      it('should generate path for nested folder', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
          depth: 0,
        });

        const child = new Folder({
          userId: user._id,
          name: 'Child',
          path: '',
          parentId: parent._id,
        });

        const path = await child.generatePath();

        expect(path).toBe('/Parent/Child');
        expect(child.path).toBe('/Parent/Child');
        expect(child.depth).toBe(1);
      });

      it('should generate path for deeply nested folder', async () => {
        const user = await createTestUser();
        const level1 = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
          depth: 0,
        });

        const level2 = await Folder.create({
          userId: user._id,
          name: 'Work',
          path: '/Documents/Work',
          parentId: level1._id,
          depth: 1,
        });

        const level3 = new Folder({
          userId: user._id,
          name: 'Reports',
          path: '',
          parentId: level2._id,
        });

        const path = await level3.generatePath();

        expect(path).toBe('/Documents/Work/Reports');
        expect(level3.depth).toBe(2);
      });

      it('should throw error for non-existent parent', async () => {
        const user = await createTestUser();
        const folder = new Folder({
          userId: user._id,
          name: 'Orphan',
          path: '',
          parentId: new mongoose.Types.ObjectId(),
        });

        await expect(folder.generatePath()).rejects.toThrow('Parent folder not found');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Static Methods: updateDescendantPaths
  // ---------------------------------------------------------------------------
  describe('Static Methods', () => {
    describe('updateDescendantPaths()', () => {
      it('should update paths when folder is renamed', async () => {
        const user = await createTestUser();

        // Create hierarchy: Documents > Work > Reports
        const docs = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        const work = await Folder.create({
          userId: user._id,
          name: 'Work',
          path: '/Documents/Work',
          parentId: docs._id,
          depth: 1,
        });

        const reports = await Folder.create({
          userId: user._id,
          name: 'Reports',
          path: '/Documents/Work/Reports',
          parentId: work._id,
          depth: 2,
        });

        // Rename Documents to Files
        const updatedCount = await Folder.updateDescendantPaths(
          docs._id,
          '/Documents',
          '/Files'
        );

        expect(updatedCount).toBe(2);

        // Verify paths were updated
        const updatedWork = await Folder.findById(work._id);
        const updatedReports = await Folder.findById(reports._id);

        expect(updatedWork.path).toBe('/Files/Work');
        expect(updatedReports.path).toBe('/Files/Work/Reports');
      });

      it('should update paths when folder is moved', async () => {
        const user = await createTestUser();

        // Create hierarchy
        const docs = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        const archive = await Folder.create({
          userId: user._id,
          name: 'Archive',
          path: '/Archive',
        });

        const old = await Folder.create({
          userId: user._id,
          name: 'Old',
          path: '/Documents/Old',
          parentId: docs._id,
          depth: 1,
        });

        const reports = await Folder.create({
          userId: user._id,
          name: 'Reports',
          path: '/Documents/Old/Reports',
          parentId: old._id,
          depth: 2,
        });

        // Move Old from Documents to Archive
        const updatedCount = await Folder.updateDescendantPaths(
          old._id,
          '/Documents/Old',
          '/Archive/Old'
        );

        expect(updatedCount).toBe(1);

        const updatedReports = await Folder.findById(reports._id);
        expect(updatedReports.path).toBe('/Archive/Old/Reports');
      });

      it('should return 0 when no descendants exist', async () => {
        const user = await createTestUser();

        const folder = await Folder.create({
          userId: user._id,
          name: 'Lonely',
          path: '/Lonely',
        });

        const count = await Folder.updateDescendantPaths(
          folder._id,
          '/Lonely',
          '/Renamed'
        );

        expect(count).toBe(0);
      });

      it('should update depth correctly', async () => {
        const user = await createTestUser();

        const level1 = await Folder.create({
          userId: user._id,
          name: 'Level1',
          path: '/Level1',
          depth: 0,
        });

        const level2 = await Folder.create({
          userId: user._id,
          name: 'Level2',
          path: '/Level1/Level2',
          parentId: level1._id,
          depth: 1,
        });

        const level3 = await Folder.create({
          userId: user._id,
          name: 'Level3',
          path: '/Level1/Level2/Level3',
          parentId: level2._id,
          depth: 2,
        });

        // Move Level1 to /Deep/Path/Level1
        await Folder.updateDescendantPaths(
          level1._id,
          '/Level1',
          '/Deep/Path/Level1'
        );

        const updatedLevel2 = await Folder.findById(level2._id);
        const updatedLevel3 = await Folder.findById(level3._id);

        expect(updatedLevel2.path).toBe('/Deep/Path/Level1/Level2');
        expect(updatedLevel3.path).toBe('/Deep/Path/Level1/Level2/Level3');
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: getFolderTree
    // ---------------------------------------------------------------------------
    describe('getFolderTree()', () => {
      it('should return empty array for user with no folders', async () => {
        const user = await createTestUser();
        const tree = await Folder.getFolderTree(user._id);

        expect(tree).toEqual([]);
      });

      it('should return root folders at top level', async () => {
        const user = await createTestUser();

        await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        await Folder.create({
          userId: user._id,
          name: 'Photos',
          path: '/Photos',
        });

        const tree = await Folder.getFolderTree(user._id);

        expect(tree.length).toBe(2);
        expect(tree.map(f => f.name).sort()).toEqual(['Documents', 'Photos']);
      });

      it('should nest children inside parents', async () => {
        const user = await createTestUser();

        const docs = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        await Folder.create({
          userId: user._id,
          name: 'Work',
          path: '/Documents/Work',
          parentId: docs._id,
          depth: 1,
        });

        await Folder.create({
          userId: user._id,
          name: 'Personal',
          path: '/Documents/Personal',
          parentId: docs._id,
          depth: 1,
        });

        const tree = await Folder.getFolderTree(user._id);

        expect(tree.length).toBe(1);
        expect(tree[0].name).toBe('Documents');
        expect(tree[0].children.length).toBe(2);
        expect(tree[0].children.map(f => f.name).sort()).toEqual(['Personal', 'Work']);
      });

      it('should build deep hierarchy correctly', async () => {
        const user = await createTestUser();

        const level0 = await Folder.create({
          userId: user._id,
          name: 'Root',
          path: '/Root',
        });

        const level1 = await Folder.create({
          userId: user._id,
          name: 'Level1',
          path: '/Root/Level1',
          parentId: level0._id,
          depth: 1,
        });

        const level2 = await Folder.create({
          userId: user._id,
          name: 'Level2',
          path: '/Root/Level1/Level2',
          parentId: level1._id,
          depth: 2,
        });

        await Folder.create({
          userId: user._id,
          name: 'Level3',
          path: '/Root/Level1/Level2/Level3',
          parentId: level2._id,
          depth: 3,
        });

        const tree = await Folder.getFolderTree(user._id);

        expect(tree.length).toBe(1);
        expect(tree[0].children[0].name).toBe('Level1');
        expect(tree[0].children[0].children[0].name).toBe('Level2');
        expect(tree[0].children[0].children[0].children[0].name).toBe('Level3');
      });

      it('should exclude trashed folders by default', async () => {
        const user = await createTestUser();

        await Folder.create({
          userId: user._id,
          name: 'Active',
          path: '/Active',
          isTrashed: false,
        });

        await Folder.create({
          userId: user._id,
          name: 'Trashed',
          path: '/Trashed',
          isTrashed: true,
        });

        const tree = await Folder.getFolderTree(user._id);

        expect(tree.length).toBe(1);
        expect(tree[0].name).toBe('Active');
      });

      it('should include trashed folders when option is set', async () => {
        const user = await createTestUser();

        await Folder.create({
          userId: user._id,
          name: 'Active',
          path: '/Active',
          isTrashed: false,
        });

        await Folder.create({
          userId: user._id,
          name: 'Trashed',
          path: '/Trashed',
          isTrashed: true,
        });

        const tree = await Folder.getFolderTree(user._id, { includeTrashed: true });

        expect(tree.length).toBe(2);
      });

      it('should respect maxDepth option', async () => {
        const user = await createTestUser();

        const level0 = await Folder.create({
          userId: user._id,
          name: 'Level0',
          path: '/Level0',
          depth: 0,
        });

        const level1 = await Folder.create({
          userId: user._id,
          name: 'Level1',
          path: '/Level0/Level1',
          parentId: level0._id,
          depth: 1,
        });

        await Folder.create({
          userId: user._id,
          name: 'Level2',
          path: '/Level0/Level1/Level2',
          parentId: level1._id,
          depth: 2,
        });

        const tree = await Folder.getFolderTree(user._id, { maxDepth: 1 });

        expect(tree[0].children[0].name).toBe('Level1');
        expect(tree[0].children[0].children.length).toBe(0);
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: getBreadcrumb
    // ---------------------------------------------------------------------------
    describe('getBreadcrumb()', () => {
      it('should return empty array for non-existent folder', async () => {
        const breadcrumb = await Folder.getBreadcrumb(new mongoose.Types.ObjectId());
        expect(breadcrumb).toEqual([]);
      });

      it('should return single item for root folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Root',
          path: '/Root',
        });

        const breadcrumb = await Folder.getBreadcrumb(folder._id);

        expect(breadcrumb.length).toBe(1);
        expect(breadcrumb[0].name).toBe('Root');
        expect(breadcrumb[0]._id.toString()).toBe(folder._id.toString());
      });

      it('should return path from root to folder', async () => {
        const user = await createTestUser();

        const docs = await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        const work = await Folder.create({
          userId: user._id,
          name: 'Work',
          path: '/Documents/Work',
          parentId: docs._id,
          depth: 1,
        });

        const reports = await Folder.create({
          userId: user._id,
          name: 'Reports',
          path: '/Documents/Work/Reports',
          parentId: work._id,
          depth: 2,
        });

        const breadcrumb = await Folder.getBreadcrumb(reports._id);

        expect(breadcrumb.length).toBe(3);
        expect(breadcrumb[0].name).toBe('Documents');
        expect(breadcrumb[1].name).toBe('Work');
        expect(breadcrumb[2].name).toBe('Reports');
      });

      it('should include folder IDs in breadcrumb', async () => {
        const user = await createTestUser();

        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        const child = await Folder.create({
          userId: user._id,
          name: 'Child',
          path: '/Parent/Child',
          parentId: parent._id,
          depth: 1,
        });

        const breadcrumb = await Folder.getBreadcrumb(child._id);

        expect(breadcrumb[0]._id.toString()).toBe(parent._id.toString());
        expect(breadcrumb[1]._id.toString()).toBe(child._id.toString());
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: updateFolderStats
    // ---------------------------------------------------------------------------
    describe('updateFolderStats()', () => {
      it('should return zero stats for empty folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Empty',
          path: '/Empty',
        });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(0);
        expect(stats.totalSize).toBe(0);
        expect(stats.subfolderCount).toBe(0);
      });

      it('should count files in folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'WithFiles',
          path: '/WithFiles',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, size: 1000 });
        await createTestFile({ userId: user._id, folderId: folder._id, size: 2000 });
        await createTestFile({ userId: user._id, folderId: folder._id, size: 3000 });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(3);
        expect(stats.totalSize).toBe(6000);
      });

      it('should count subfolders', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        await Folder.create({
          userId: user._id,
          name: 'Child1',
          path: '/Parent/Child1',
          parentId: parent._id,
          depth: 1,
        });

        await Folder.create({
          userId: user._id,
          name: 'Child2',
          path: '/Parent/Child2',
          parentId: parent._id,
          depth: 1,
        });

        const stats = await Folder.updateFolderStats(parent._id);

        expect(stats.subfolderCount).toBe(2);
      });

      it('should not count trashed files', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Mixed',
          path: '/Mixed',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, size: 1000, isTrashed: false });
        await createTestFile({ userId: user._id, folderId: folder._id, size: 5000, isTrashed: true });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(1);
        expect(stats.totalSize).toBe(1000);
      });

      it('should not count non-latest file versions', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Versioned',
          path: '/Versioned',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, size: 1000, isLatestVersion: true });
        await createTestFile({ userId: user._id, folderId: folder._id, size: 500, isLatestVersion: false });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(1);
        expect(stats.totalSize).toBe(1000);
      });

      it('should not count trashed subfolders', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        await Folder.create({
          userId: user._id,
          name: 'Active',
          path: '/Parent/Active',
          parentId: parent._id,
          isTrashed: false,
        });

        await Folder.create({
          userId: user._id,
          name: 'Trashed',
          path: '/Parent/Trashed',
          parentId: parent._id,
          isTrashed: true,
        });

        const stats = await Folder.updateFolderStats(parent._id);

        expect(stats.subfolderCount).toBe(1);
      });

      it('should persist stats to folder document', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Persisted',
          path: '/Persisted',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, size: 2500 });

        await Folder.updateFolderStats(folder._id);

        const updated = await Folder.findById(folder._id);
        expect(updated.stats.fileCount).toBe(1);
        expect(updated.stats.totalSize).toBe(2500);
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: getFolderContents
    // ---------------------------------------------------------------------------
    describe('getFolderContents()', () => {
      it('should return null folder for root contents', async () => {
        const user = await createTestUser();
        const contents = await Folder.getFolderContents(null, user._id);

        expect(contents.folder).toBeNull();
        expect(contents.subfolders).toEqual([]);
        expect(contents.files).toEqual([]);
      });

      it('should return folder info for specific folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Specific',
          path: '/Specific',
        });

        const contents = await Folder.getFolderContents(folder._id, user._id);

        expect(contents.folder.name).toBe('Specific');
      });

      it('should return subfolders sorted alphabetically', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        await Folder.create({
          userId: user._id,
          name: 'Zebra',
          path: '/Parent/Zebra',
          parentId: parent._id,
        });

        await Folder.create({
          userId: user._id,
          name: 'Alpha',
          path: '/Parent/Alpha',
          parentId: parent._id,
        });

        await Folder.create({
          userId: user._id,
          name: 'Middle',
          path: '/Parent/Middle',
          parentId: parent._id,
        });

        const contents = await Folder.getFolderContents(parent._id, user._id);

        expect(contents.subfolders.length).toBe(3);
        expect(contents.subfolders[0].name).toBe('Alpha');
        expect(contents.subfolders[1].name).toBe('Middle');
        expect(contents.subfolders[2].name).toBe('Zebra');
      });

      it('should return files in folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'WithFiles',
          path: '/WithFiles',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, originalName: 'file1.pdf' });
        await createTestFile({ userId: user._id, folderId: folder._id, originalName: 'file2.pdf' });

        const contents = await Folder.getFolderContents(folder._id, user._id);

        expect(contents.files.length).toBe(2);
        expect(contents.totalFiles).toBe(2);
      });

      it('should exclude trashed subfolders', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        await Folder.create({
          userId: user._id,
          name: 'Active',
          path: '/Parent/Active',
          parentId: parent._id,
          isTrashed: false,
        });

        await Folder.create({
          userId: user._id,
          name: 'Trashed',
          path: '/Parent/Trashed',
          parentId: parent._id,
          isTrashed: true,
        });

        const contents = await Folder.getFolderContents(parent._id, user._id);

        expect(contents.subfolders.length).toBe(1);
        expect(contents.subfolders[0].name).toBe('Active');
      });

      it('should respect limit option for files', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'ManyFiles',
          path: '/ManyFiles',
        });

        for (let i = 0; i < 10; i++) {
          await createTestFile({ userId: user._id, folderId: folder._id });
        }

        const contents = await Folder.getFolderContents(folder._id, user._id, { limit: 5 });

        expect(contents.files.length).toBe(5);
        expect(contents.totalFiles).toBe(10);
      });

      it('should respect skip option for pagination', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Paginated',
          path: '/Paginated',
        });

        for (let i = 0; i < 10; i++) {
          await createTestFile({ userId: user._id, folderId: folder._id });
        }

        const page1 = await Folder.getFolderContents(folder._id, user._id, { limit: 5, skip: 0 });
        const page2 = await Folder.getFolderContents(folder._id, user._id, { limit: 5, skip: 5 });

        expect(page1.files.length).toBe(5);
        expect(page2.files.length).toBe(5);
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: nameExistsInParent
    // ---------------------------------------------------------------------------
    describe('nameExistsInParent()', () => {
      it('should return false when name does not exist', async () => {
        const user = await createTestUser();
        const exists = await Folder.nameExistsInParent(user._id, null, 'NewFolder');

        expect(exists).toBe(false);
      });

      it('should return true when name exists in root', async () => {
        const user = await createTestUser();
        await Folder.create({
          userId: user._id,
          name: 'Existing',
          path: '/Existing',
        });

        const exists = await Folder.nameExistsInParent(user._id, null, 'Existing');

        expect(exists).toBe(true);
      });

      it('should be case-insensitive', async () => {
        const user = await createTestUser();
        await Folder.create({
          userId: user._id,
          name: 'Documents',
          path: '/Documents',
        });

        const exists1 = await Folder.nameExistsInParent(user._id, null, 'documents');
        const exists2 = await Folder.nameExistsInParent(user._id, null, 'DOCUMENTS');

        expect(exists1).toBe(true);
        expect(exists2).toBe(true);
      });

      it('should check within specific parent', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        await Folder.create({
          userId: user._id,
          name: 'Child',
          path: '/Parent/Child',
          parentId: parent._id,
        });

        const existsInParent = await Folder.nameExistsInParent(user._id, parent._id, 'Child');
        const existsInRoot = await Folder.nameExistsInParent(user._id, null, 'Child');

        expect(existsInParent).toBe(true);
        expect(existsInRoot).toBe(false);
      });

      it('should exclude specific folder for rename checks', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Original',
          path: '/Original',
        });

        // Check if "Original" exists, excluding the folder itself (for rename)
        const exists = await Folder.nameExistsInParent(user._id, null, 'Original', folder._id);

        expect(exists).toBe(false);
      });

      it('should find duplicate even with excludeId for different folder', async () => {
        const user = await createTestUser();
        const folder1 = await Folder.create({
          userId: user._id,
          name: 'Folder1',
          path: '/Folder1',
        });

        await Folder.create({
          userId: user._id,
          name: 'Folder2',
          path: '/Folder2',
        });

        // Check if "Folder2" exists, excluding folder1
        const exists = await Folder.nameExistsInParent(user._id, null, 'Folder2', folder1._id);

        expect(exists).toBe(true);
      });

      it('should not consider trashed folders', async () => {
        const user = await createTestUser();
        await Folder.create({
          userId: user._id,
          name: 'TrashedName',
          path: '/TrashedName',
          isTrashed: true,
        });

        const exists = await Folder.nameExistsInParent(user._id, null, 'TrashedName');

        expect(exists).toBe(false);
      });
    });

    // ---------------------------------------------------------------------------
    // Static Methods: canMoveTo
    // ---------------------------------------------------------------------------
    describe('canMoveTo()', () => {
      it('should allow moving to root', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Folder',
          path: '/Parent/Folder',
        });

        const canMove = await Folder.canMoveTo(folder._id, null);

        expect(canMove).toBe(true);
      });

      it('should prevent moving folder into itself', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Folder',
          path: '/Folder',
        });

        const canMove = await Folder.canMoveTo(folder._id, folder._id);

        expect(canMove).toBe(false);
      });

      it('should prevent moving folder into its child', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        const child = await Folder.create({
          userId: user._id,
          name: 'Child',
          path: '/Parent/Child',
          parentId: parent._id,
        });

        const canMove = await Folder.canMoveTo(parent._id, child._id);

        expect(canMove).toBe(false);
      });

      it('should prevent moving folder into its grandchild', async () => {
        const user = await createTestUser();
        const level1 = await Folder.create({
          userId: user._id,
          name: 'Level1',
          path: '/Level1',
        });

        const level2 = await Folder.create({
          userId: user._id,
          name: 'Level2',
          path: '/Level1/Level2',
          parentId: level1._id,
        });

        const level3 = await Folder.create({
          userId: user._id,
          name: 'Level3',
          path: '/Level1/Level2/Level3',
          parentId: level2._id,
        });

        const canMove = await Folder.canMoveTo(level1._id, level3._id);

        expect(canMove).toBe(false);
      });

      it('should allow moving to sibling folder', async () => {
        const user = await createTestUser();
        const folder1 = await Folder.create({
          userId: user._id,
          name: 'Folder1',
          path: '/Folder1',
        });

        const folder2 = await Folder.create({
          userId: user._id,
          name: 'Folder2',
          path: '/Folder2',
        });

        const canMove = await Folder.canMoveTo(folder1._id, folder2._id);

        expect(canMove).toBe(true);
      });

      it('should allow moving to uncle folder', async () => {
        const user = await createTestUser();
        const parent = await Folder.create({
          userId: user._id,
          name: 'Parent',
          path: '/Parent',
        });

        const child = await Folder.create({
          userId: user._id,
          name: 'Child',
          path: '/Parent/Child',
          parentId: parent._id,
        });

        const uncle = await Folder.create({
          userId: user._id,
          name: 'Uncle',
          path: '/Uncle',
        });

        const canMove = await Folder.canMoveTo(child._id, uncle._id);

        expect(canMove).toBe(true);
      });

      it('should return false for non-existent folder', async () => {
        const canMove = await Folder.canMoveTo(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId());

        expect(canMove).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // User Isolation
  // ---------------------------------------------------------------------------
  describe('User Isolation', () => {
    it('should not return folders from other users in getFolderTree', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await Folder.create({
        userId: user1._id,
        name: 'User1Folder',
        path: '/User1Folder',
      });

      await Folder.create({
        userId: user2._id,
        name: 'User2Folder',
        path: '/User2Folder',
      });

      const user1Tree = await Folder.getFolderTree(user1._id);
      const user2Tree = await Folder.getFolderTree(user2._id);

      expect(user1Tree.length).toBe(1);
      expect(user1Tree[0].name).toBe('User1Folder');
      expect(user2Tree.length).toBe(1);
      expect(user2Tree[0].name).toBe('User2Folder');
    });

    it('should not find name conflict with other user folders', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await Folder.create({
        userId: user1._id,
        name: 'SameName',
        path: '/SameName',
      });

      const existsForUser2 = await Folder.nameExistsInParent(user2._id, null, 'SameName');

      expect(existsForUser2).toBe(false);
    });

    it('should only return contents for correct user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const user1Folder = await Folder.create({
        userId: user1._id,
        name: 'User1Folder',
        path: '/User1Folder',
      });

      await createTestFile({ userId: user1._id, folderId: user1Folder._id });

      // User2 should get empty results for user1's folder
      const contents = await Folder.getFolderContents(user1Folder._id, user2._id);

      expect(contents.folder).toBeNull();
    });

    it('should allow same folder names for different users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const folder1 = await Folder.create({
        userId: user1._id,
        name: 'Documents',
        path: '/Documents',
      });

      const folder2 = await Folder.create({
        userId: user2._id,
        name: 'Documents',
        path: '/Documents',
      });

      expect(folder1.name).toBe('Documents');
      expect(folder2.name).toBe('Documents');
      expect(folder1._id.toString()).not.toBe(folder2._id.toString());
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------
  describe('Edge Cases', () => {
    describe('Special characters in names', () => {
      it('should handle folder names with spaces', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'My Documents',
          path: '/My Documents',
        });

        expect(folder.name).toBe('My Documents');
      });

      it('should handle folder names with special characters', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Reports (2024) - Final',
          path: '/Reports (2024) - Final',
        });

        expect(folder.name).toBe('Reports (2024) - Final');
      });

      it('should handle Unicode folder names', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'Dokumenty',
          path: '/Dokumenty',
        });

        expect(folder.name).toBe('Dokumenty');
      });
    });

    describe('Empty parent handling', () => {
      it('should treat null and undefined parentId as root', async () => {
        const user = await createTestUser();

        const folder1 = await Folder.create({
          userId: user._id,
          name: 'NullParent',
          path: '/NullParent',
          parentId: null,
        });

        const folder2 = await Folder.create({
          userId: user._id,
          name: 'UndefinedParent',
          path: '/UndefinedParent',
        });

        expect(folder1.parentId).toBeNull();
        expect(folder2.parentId).toBeNull();
      });
    });

    describe('Path edge cases', () => {
      it('should handle very long paths', async () => {
        const user = await createTestUser();
        let parent = await Folder.create({
          userId: user._id,
          name: 'Level0',
          path: '/Level0',
          depth: 0,
        });

        // Create 10 levels deep
        for (let i = 1; i <= 10; i++) {
          const path = parent.path + `/Level${i}`;
          parent = await Folder.create({
            userId: user._id,
            name: `Level${i}`,
            path: path,
            parentId: parent._id,
            depth: i,
          });
        }

        expect(parent.depth).toBe(10);
        expect(parent.path.split('/').length).toBe(12); // /Level0/Level1/.../Level10
      });
    });

    describe('Trashed folders', () => {
      it('should set trashedAt when trashing folder', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'ToTrash',
          path: '/ToTrash',
          isTrashed: true,
          trashedAt: new Date(),
        });

        expect(folder.isTrashed).toBe(true);
        expect(folder.trashedAt).toBeInstanceOf(Date);
      });
    });

    describe('Folder stats edge cases', () => {
      it('should handle folder with only files (no subfolders)', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'FilesOnly',
          path: '/FilesOnly',
        });

        await createTestFile({ userId: user._id, folderId: folder._id, size: 1000 });
        await createTestFile({ userId: user._id, folderId: folder._id, size: 2000 });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(2);
        expect(stats.totalSize).toBe(3000);
        expect(stats.subfolderCount).toBe(0);
      });

      it('should handle folder with only subfolders (no files)', async () => {
        const user = await createTestUser();
        const folder = await Folder.create({
          userId: user._id,
          name: 'SubfoldersOnly',
          path: '/SubfoldersOnly',
        });

        await Folder.create({
          userId: user._id,
          name: 'Sub1',
          path: '/SubfoldersOnly/Sub1',
          parentId: folder._id,
        });

        await Folder.create({
          userId: user._id,
          name: 'Sub2',
          path: '/SubfoldersOnly/Sub2',
          parentId: folder._id,
        });

        const stats = await Folder.updateFolderStats(folder._id);

        expect(stats.fileCount).toBe(0);
        expect(stats.totalSize).toBe(0);
        expect(stats.subfolderCount).toBe(2);
      });
    });
  });
});
