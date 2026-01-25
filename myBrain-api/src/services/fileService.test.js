/**
 * =============================================================================
 * FILESERVICE.TEST.JS - Comprehensive Tests for File Service
 * =============================================================================
 *
 * Tests all file service operations including:
 * - File upload with S3 storage and thumbnail generation
 * - File retrieval (single, multiple, search)
 * - File organization (move, copy, trash, restore, delete)
 * - Bulk operations (bulk move, bulk trash, bulk delete)
 * - File versioning
 * - Entity linking (notes, projects, tasks)
 * - Error handling and edge cases
 *
 * MOCKING STRATEGY:
 * - S3/Storage operations are mocked via jest.unstable_mockModule
 * - MongoDB models use Jest spies for isolated unit testing
 * - Image processing is mocked for predictable test results
 *
 * =============================================================================
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';

// =============================================================================
// MOCK SETUP - For ESM modules
// =============================================================================

// Create mock storage provider
const mockStorageProvider = {
  providerName: 's3',
  bucket: 'test-bucket',
  generateKey: (userId, filename, folder) =>
    `${userId}/${folder}/${Date.now()}-${filename}`,
  getThumbnailKey: (key) => key.replace(/(\.[^.]+)$/, '_thumb.jpg'),
  getPublicUrl: (key) => `https://s3.example.com/${key}`,
  upload: async () => ({
    bucket: 'test-bucket',
    key: 'test-key',
    size: 1024,
    etag: 'abc123'
  }),
  delete: async () => ({}),
  deleteMany: async () => ({}),
  copy: async () => ({}),
  getSignedUrl: async () => 'https://s3.example.com/signed-url?token=abc123',
  exists: async () => true,
};

// Mock the modules before importing
jest.unstable_mockModule('./storage/storageFactory.js', () => ({
  getDefaultProvider: jest.fn(() => mockStorageProvider),
  getStorageProvider: jest.fn(() => mockStorageProvider),
}));

jest.unstable_mockModule('./imageProcessingService.js', () => ({
  processImage: jest.fn().mockResolvedValue({
    original: Buffer.from('processed-image'),
    thumbnail: Buffer.from('thumbnail-image'),
    metadata: {
      width: 800,
      height: 600,
      aspectRatio: 1.33,
      wasResized: true,
      dominantColor: '#336699',
      colors: ['#336699', '#ffffff', '#000000'],
    },
  }),
}));

jest.unstable_mockModule('./usageService.js', () => ({
  trackCreate: jest.fn(),
  trackView: jest.fn(),
}));

// =============================================================================
// NOW IMPORT THE SERVICE AND MODELS
// =============================================================================

const fileServiceModule = await import('./fileService.js');
const fileService = fileServiceModule.default || fileServiceModule;

const { default: File } = await import('../models/File.js');
const { default: Folder } = await import('../models/Folder.js');
const { default: FileShare } = await import('../models/FileShare.js');
const storageFactory = await import('./storage/storageFactory.js');
const imageProcessing = await import('./imageProcessingService.js');
const usageService = await import('./usageService.js');

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a mock Multer file object
 */
function createMockFile(overrides = {}) {
  return {
    buffer: Buffer.from('test file content'),
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    ...overrides,
  };
}

/**
 * Create a mock MongoDB ObjectId
 */
function createObjectId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Create a mock File document
 */
function createMockFileDoc(overrides = {}) {
  const id = createObjectId();
  const userId = overrides.userId || createObjectId();

  const doc = {
    _id: id,
    userId,
    storageProvider: 's3',
    storageKey: `${userId}/files/test-file.pdf`,
    storageBucket: 'test-bucket',
    filename: 'test-file.pdf',
    originalName: 'Original Document.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    fileCategory: 'document',
    size: 1024,
    folderId: null,
    path: '/',
    title: 'Test Document',
    description: 'A test document',
    tags: ['test'],
    favorite: false,
    isTrashed: false,
    isLatestVersion: true,
    version: 1,
    previousVersionId: null,
    thumbnailKey: null,
    thumbnailUrl: null,
    downloadCount: 0,
    checksums: { md5: 'abc123', sha256: 'def456' },
    linkedNoteIds: [],
    linkedProjectIds: [],
    linkedTaskIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  // Add mock methods - use arrow functions to preserve jest mock while accessing doc
  doc.save = jest.fn().mockImplementation(() => Promise.resolve(doc));

  doc.toObject = jest.fn().mockImplementation(() => {
    const obj = { ...doc };
    delete obj.save;
    delete obj.toObject;
    return obj;
  });

  return doc;
}

/**
 * Create a mock Folder document
 */
function createMockFolderDoc(overrides = {}) {
  const id = createObjectId();
  return {
    _id: id,
    userId: createObjectId(),
    name: 'Test Folder',
    path: '/Test Folder',
    parentId: null,
    depth: 0,
    isTrashed: false,
    stats: { fileCount: 0, totalSize: 0, subfolderCount: 0 },
    ...overrides,
  };
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('fileService', () => {
  // Test user ID used across tests
  let testUserId;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    testUserId = createObjectId();

    // Reset storage provider mocks
    mockStorageProvider.upload = jest.fn().mockResolvedValue({
      bucket: 'test-bucket',
      key: 'test-key',
      size: 1024,
      etag: 'abc123'
    });
    mockStorageProvider.delete = jest.fn().mockResolvedValue({});
    mockStorageProvider.deleteMany = jest.fn().mockResolvedValue({});
    mockStorageProvider.copy = jest.fn().mockResolvedValue({});
    mockStorageProvider.getSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/signed-url?token=abc123');
    mockStorageProvider.generateKey = jest.fn((userId, filename, folder) =>
      `${userId}/${folder}/${Date.now()}-${filename}`
    );
    mockStorageProvider.getThumbnailKey = jest.fn((key) => key.replace(/(\.[^.]+)$/, '_thumb.jpg'));
    mockStorageProvider.getPublicUrl = jest.fn((key) => `https://s3.example.com/${key}`);
  });

  // ===========================================================================
  // UPLOAD FILE TESTS
  // ===========================================================================

  describe('uploadFile()', () => {
    beforeEach(() => {
      // Mock File.create to return a file document
      jest.spyOn(File, 'create').mockImplementation((data) => {
        return Promise.resolve(createMockFileDoc({
          ...data,
          _id: createObjectId(),
        }));
      });

      // Mock File.getCategoryFromMimeType
      jest.spyOn(File, 'getCategoryFromMimeType').mockReturnValue('document');

      // Mock Folder.findById
      jest.spyOn(Folder, 'findById').mockResolvedValue(null);

      // Mock Folder.updateFolderStats
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a file record successfully', async () => {
      const mockFile = createMockFile();

      const result = await fileService.uploadFile(mockFile, testUserId.toString(), {
        title: 'My Document',
        description: 'Test description',
        tags: ['work', 'important'],
      });

      expect(result).toBeDefined();
      expect(File.create).toHaveBeenCalledTimes(1);
      expect(mockStorageProvider.upload).toHaveBeenCalled();
      expect(usageService.trackCreate).toHaveBeenCalledWith(testUserId.toString(), 'files');
    });

    it('should handle image files with thumbnail generation', async () => {
      // Mock category detection for images
      File.getCategoryFromMimeType.mockReturnValue('image');

      const mockFile = createMockFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      });

      const result = await fileService.uploadFile(mockFile, testUserId.toString());

      expect(result).toBeDefined();
      // Check that processImage was called (buffer content may differ due to processing)
      expect(imageProcessing.processImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          generateThumbnail: true,
          optimizeOriginal: true,
        })
      );
      // Should upload both original and thumbnail
      expect(mockStorageProvider.upload).toHaveBeenCalledTimes(2);
    });

    it('should update folder stats when file is placed in a folder', async () => {
      const folderId = createObjectId();
      const mockFolder = createMockFolderDoc({ _id: folderId, path: '/Documents' });

      Folder.findById.mockResolvedValue(mockFolder);

      const mockFile = createMockFile();

      await fileService.uploadFile(mockFile, testUserId.toString(), {
        folderId: folderId.toString(),
      });

      expect(Folder.findById).toHaveBeenCalledWith(folderId.toString());
      expect(Folder.updateFolderStats).toHaveBeenCalledWith(folderId.toString());
    });

    it('should calculate checksums correctly', async () => {
      const fileContent = 'test file content';
      const mockFile = createMockFile({ buffer: Buffer.from(fileContent) });

      // Capture the create call arguments
      let createArgs;
      File.create.mockImplementation((data) => {
        createArgs = data;
        return Promise.resolve(createMockFileDoc(data));
      });

      await fileService.uploadFile(mockFile, testUserId.toString());

      expect(createArgs.checksums).toBeDefined();
      expect(createArgs.checksums.md5).toBeDefined();
      expect(createArgs.checksums.sha256).toBeDefined();

      // Verify checksums are actual hash values
      const expectedMd5 = crypto.createHash('md5').update(Buffer.from(fileContent)).digest('hex');
      const expectedSha256 = crypto.createHash('sha256').update(Buffer.from(fileContent)).digest('hex');

      expect(createArgs.checksums.md5).toBe(expectedMd5);
      expect(createArgs.checksums.sha256).toBe(expectedSha256);
    });

    it('should reject forbidden file extensions', async () => {
      const mockFile = createMockFile({
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
      });

      await expect(
        fileService.uploadFile(mockFile, testUserId.toString())
      ).rejects.toThrow('File type .exe is not allowed for security reasons');
    });

    it('should reject .bat files', async () => {
      const mockFile = createMockFile({
        originalname: 'script.bat',
        mimetype: 'application/x-bat',
      });

      await expect(
        fileService.uploadFile(mockFile, testUserId.toString())
      ).rejects.toThrow('.bat is not allowed');
    });

    it('should reject .js files for security', async () => {
      const mockFile = createMockFile({
        originalname: 'script.js',
        mimetype: 'application/javascript',
      });

      await expect(
        fileService.uploadFile(mockFile, testUserId.toString())
      ).rejects.toThrow('.js is not allowed');
    });

    it('should continue upload if image processing fails', async () => {
      // Make image processing fail
      imageProcessing.processImage.mockRejectedValueOnce(new Error('Processing failed'));
      File.getCategoryFromMimeType.mockReturnValue('image');

      const mockFile = createMockFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      });

      // Should not throw - continues with original
      const result = await fileService.uploadFile(mockFile, testUserId.toString());
      expect(result).toBeDefined();
      // Only original file uploaded (no thumbnail)
      expect(mockStorageProvider.upload).toHaveBeenCalledTimes(1);
    });

    it('should return the created file record', async () => {
      const mockFile = createMockFile();

      const result = await fileService.uploadFile(mockFile, testUserId.toString(), {
        title: 'Test Title',
        tags: ['tag1', 'tag2'],
      });

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
    });
  });

  // ===========================================================================
  // CREATE FILE VERSION TESTS
  // ===========================================================================

  describe('createFileVersion()', () => {
    let originalFile;

    beforeEach(() => {
      originalFile = createMockFileDoc({
        userId: testUserId,
        isLatestVersion: true,
        version: 2,
      });

      jest.spyOn(File, 'findOne').mockResolvedValue(originalFile);
      jest.spyOn(File, 'create').mockImplementation((data) => {
        const newFile = createMockFileDoc({
          ...data,
          _id: createObjectId(),
        });
        return Promise.resolve(newFile);
      });
      jest.spyOn(File, 'getCategoryFromMimeType').mockReturnValue('document');
      jest.spyOn(Folder, 'findById').mockResolvedValue(null);
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a new version of an existing file', async () => {
      const newFile = createMockFile({ originalname: 'updated-document.pdf' });

      const result = await fileService.createFileVersion(
        originalFile._id.toString(),
        newFile,
        testUserId.toString()
      );

      expect(result).toBeDefined();
      expect(result.version).toBe(3); // version 2 + 1
      expect(result.previousVersionId).toEqual(originalFile._id);
    });

    it('should mark the previous version as not latest', async () => {
      const newFile = createMockFile();

      await fileService.createFileVersion(
        originalFile._id.toString(),
        newFile,
        testUserId.toString()
      );

      expect(originalFile.isLatestVersion).toBe(false);
      expect(originalFile.save).toHaveBeenCalled();
    });

    it('should throw error if original file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const newFile = createMockFile();

      await expect(
        fileService.createFileVersion(
          createObjectId().toString(),
          newFile,
          testUserId.toString()
        )
      ).rejects.toThrow('Original file not found');
    });

    it('should throw error with 404 status code when file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const newFile = createMockFile();

      try {
        await fileService.createFileVersion(
          createObjectId().toString(),
          newFile,
          testUserId.toString()
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Original file not found');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  // ===========================================================================
  // BULK MOVE FILES TESTS
  // ===========================================================================

  describe('bulkMoveFiles()', () => {
    let files;
    let targetFolder;

    beforeEach(() => {
      files = [
        createMockFileDoc({ userId: testUserId, folderId: null }),
        createMockFileDoc({ userId: testUserId, folderId: null }),
        createMockFileDoc({ userId: testUserId, folderId: null }),
      ];

      targetFolder = createMockFolderDoc({
        _id: createObjectId(),
        userId: testUserId,
        path: '/Target Folder',
      });

      jest.spyOn(Folder, 'findOne').mockResolvedValue(targetFolder);
      jest.spyOn(Folder, 'findById').mockResolvedValue(targetFolder);
      jest.spyOn(File, 'find').mockResolvedValue(files);
      jest.spyOn(File, 'updateMany').mockResolvedValue({ modifiedCount: 3 });
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should move multiple files to a folder', async () => {
      const fileIds = files.map(f => f._id.toString());

      const result = await fileService.bulkMoveFiles(
        fileIds,
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(result.moved).toBe(3);
      expect(File.updateMany).toHaveBeenCalledWith(
        { _id: { $in: fileIds }, userId: testUserId.toString() },
        { $set: { folderId: targetFolder._id.toString(), path: '/Target Folder' } }
      );
    });

    it('should update folder stats for source and destination folders', async () => {
      const sourceFolder = createMockFolderDoc({
        _id: createObjectId(),
        userId: testUserId,
        path: '/Source',
      });

      // Files are in source folder
      files.forEach(f => {
        f.folderId = sourceFolder._id;
      });

      const fileIds = files.map(f => f._id.toString());

      await fileService.bulkMoveFiles(
        fileIds,
        targetFolder._id.toString(),
        testUserId.toString()
      );

      // Should update folder stats
      expect(Folder.updateFolderStats).toHaveBeenCalled();
    });

    it('should verify target folder exists and belongs to user', async () => {
      const fileIds = files.map(f => f._id.toString());

      await fileService.bulkMoveFiles(
        fileIds,
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(Folder.findOne).toHaveBeenCalledWith({
        _id: targetFolder._id.toString(),
        userId: testUserId.toString(),
      });
    });

    it('should throw error if target folder not found', async () => {
      Folder.findOne.mockResolvedValue(null);

      const fileIds = files.map(f => f._id.toString());

      try {
        await fileService.bulkMoveFiles(
          fileIds,
          createObjectId().toString(),
          testUserId.toString()
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Target folder not found');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle move to root (null folderId)', async () => {
      const fileIds = files.map(f => f._id.toString());

      const result = await fileService.bulkMoveFiles(
        fileIds,
        null,
        testUserId.toString()
      );

      expect(result.moved).toBe(3);
      expect(File.updateMany).toHaveBeenCalledWith(
        expect.anything(),
        { $set: { folderId: null, path: '/' } }
      );
    });
  });

  // ===========================================================================
  // DELETE FILE TESTS
  // ===========================================================================

  describe('deleteFile()', () => {
    let fileToDelete;

    beforeEach(() => {
      fileToDelete = createMockFileDoc({
        userId: testUserId,
        folderId: createObjectId(),
        thumbnailKey: 'test-thumb-key',
      });

      jest.spyOn(File, 'findOne').mockResolvedValue(fileToDelete);
      jest.spyOn(File, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      jest.spyOn(FileShare, 'deactivateFileShares').mockResolvedValue(2);
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should permanently delete a file', async () => {
      const result = await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      expect(result.deleted).toBe(true);
      expect(File.deleteOne).toHaveBeenCalledWith({ _id: fileToDelete._id.toString() });
    });

    it('should delete file from S3 storage', async () => {
      await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      expect(mockStorageProvider.delete).toHaveBeenCalledWith(fileToDelete.storageKey);
    });

    it('should delete thumbnail from S3 if it exists', async () => {
      await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      expect(mockStorageProvider.delete).toHaveBeenCalledWith(fileToDelete.thumbnailKey);
      expect(mockStorageProvider.delete).toHaveBeenCalledTimes(2);
    });

    it('should deactivate all file shares', async () => {
      await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      expect(FileShare.deactivateFileShares).toHaveBeenCalledWith(
        fileToDelete._id.toString()
      );
    });

    it('should update folder stats after deletion', async () => {
      await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      expect(Folder.updateFolderStats).toHaveBeenCalledWith(fileToDelete.folderId);
    });

    it('should return deleted: false if file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const result = await fileService.deleteFile(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result.deleted).toBe(false);
      expect(File.deleteOne).not.toHaveBeenCalled();
    });

    it('should continue with DB cleanup even if S3 deletion fails', async () => {
      mockStorageProvider.delete.mockRejectedValueOnce(new Error('S3 error'));

      const result = await fileService.deleteFile(
        fileToDelete._id.toString(),
        testUserId.toString()
      );

      // Should still delete from database
      expect(result.deleted).toBe(true);
      expect(File.deleteOne).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // TRASH FILE TESTS
  // ===========================================================================

  describe('trashFile()', () => {
    let fileToTrash;

    beforeEach(() => {
      fileToTrash = createMockFileDoc({
        userId: testUserId,
        isTrashed: false,
        folderId: createObjectId(),
      });

      jest.spyOn(File, 'findOneAndUpdate').mockResolvedValue({
        ...fileToTrash,
        isTrashed: true,
        trashedAt: new Date(),
      });
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should move file to trash (soft delete)', async () => {
      const result = await fileService.trashFile(
        fileToTrash._id.toString(),
        testUserId.toString()
      );

      expect(result.isTrashed).toBe(true);
      expect(result.trashedAt).toBeDefined();
    });

    it('should update folder stats after trashing', async () => {
      await fileService.trashFile(
        fileToTrash._id.toString(),
        testUserId.toString()
      );

      expect(Folder.updateFolderStats).toHaveBeenCalledWith(fileToTrash.folderId);
    });

    it('should return null if file not found', async () => {
      File.findOneAndUpdate.mockResolvedValue(null);

      const result = await fileService.trashFile(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // RESTORE FILE TESTS
  // ===========================================================================

  describe('restoreFile()', () => {
    let trashedFile;

    beforeEach(() => {
      trashedFile = createMockFileDoc({
        userId: testUserId,
        isTrashed: true,
        trashedAt: new Date(),
        folderId: createObjectId(),
      });

      jest.spyOn(File, 'findOneAndUpdate').mockResolvedValue({
        ...trashedFile,
        isTrashed: false,
        trashedAt: undefined,
      });
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should restore file from trash', async () => {
      const result = await fileService.restoreFile(
        trashedFile._id.toString(),
        testUserId.toString()
      );

      expect(result.isTrashed).toBe(false);
    });

    it('should update folder stats after restoration', async () => {
      await fileService.restoreFile(
        trashedFile._id.toString(),
        testUserId.toString()
      );

      expect(Folder.updateFolderStats).toHaveBeenCalledWith(trashedFile.folderId);
    });

    it('should only restore files that are actually trashed', async () => {
      await fileService.restoreFile(
        trashedFile._id.toString(),
        testUserId.toString()
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: trashedFile._id.toString(), userId: testUserId.toString(), isTrashed: true },
        expect.anything(),
        expect.anything()
      );
    });

    it('should return null if file not in trash', async () => {
      File.findOneAndUpdate.mockResolvedValue(null);

      const result = await fileService.restoreFile(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // GET FILE TESTS
  // ===========================================================================

  describe('getFile()', () => {
    let existingFile;

    beforeEach(() => {
      existingFile = createMockFileDoc({ userId: testUserId });
      jest.spyOn(File, 'findOne').mockResolvedValue(existingFile);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return a file by ID', async () => {
      const result = await fileService.getFile(
        existingFile._id.toString(),
        testUserId.toString()
      );

      expect(result).toBeDefined();
      expect(result._id).toEqual(existingFile._id);
    });

    it('should verify file ownership', async () => {
      await fileService.getFile(
        existingFile._id.toString(),
        testUserId.toString()
      );

      expect(File.findOne).toHaveBeenCalledWith({
        _id: existingFile._id.toString(),
        userId: testUserId.toString(),
      });
    });

    it('should track view for analytics', async () => {
      await fileService.getFile(
        existingFile._id.toString(),
        testUserId.toString()
      );

      expect(usageService.trackView).toHaveBeenCalledWith(testUserId.toString(), 'files');
    });

    it('should return null for non-existent file', async () => {
      File.findOne.mockResolvedValue(null);

      const result = await fileService.getFile(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });

    it('should not track view when file not found', async () => {
      File.findOne.mockResolvedValue(null);

      await fileService.getFile(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(usageService.trackView).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // GET FILES TESTS
  // ===========================================================================

  describe('getFiles()', () => {
    let mockFiles;

    beforeEach(() => {
      mockFiles = [
        createMockFileDoc({ userId: testUserId, title: 'File 1' }),
        createMockFileDoc({ userId: testUserId, title: 'File 2' }),
        createMockFileDoc({ userId: testUserId, title: 'File 3' }),
      ];

      // Mock the query builder pattern
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockFiles),
      };

      jest.spyOn(File, 'find').mockReturnValue(mockQuery);
      jest.spyOn(File, 'countDocuments').mockResolvedValue(3);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return paginated files', async () => {
      const result = await fileService.getFiles(testUserId.toString());

      expect(result.files).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(3);
    });

    it('should filter by folderId', async () => {
      const folderId = createObjectId();

      await fileService.getFiles(testUserId.toString(), {
        folderId: folderId.toString(),
      });

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: folderId.toString(),
        })
      );
    });

    it('should filter by fileCategory', async () => {
      await fileService.getFiles(testUserId.toString(), {
        fileCategory: 'document',
      });

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          fileCategory: 'document',
        })
      );
    });

    it('should filter by favorite status', async () => {
      await fileService.getFiles(testUserId.toString(), {
        favorite: true,
      });

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          favorite: true,
        })
      );
    });

    it('should filter by tags', async () => {
      await fileService.getFiles(testUserId.toString(), {
        tags: ['work', 'important'],
      });

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { $all: ['work', 'important'] },
        })
      );
    });

    it('should exclude trashed files by default', async () => {
      await fileService.getFiles(testUserId.toString());

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isTrashed: false,
        })
      );
    });

    it('should only return latest versions', async () => {
      await fileService.getFiles(testUserId.toString());

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isLatestVersion: true,
        })
      );
    });

    it('should handle text search', async () => {
      await fileService.getFiles(testUserId.toString(), {
        q: 'report',
      });

      expect(File.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $text: { $search: 'report' },
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      File.countDocuments.mockResolvedValue(100);

      const result = await fileService.getFiles(testUserId.toString(), {
        page: 2,
        limit: 20,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.pages).toBe(5);
    });
  });

  // ===========================================================================
  // MOVE FILE TESTS
  // ===========================================================================

  describe('moveFile()', () => {
    let fileToMove;
    let targetFolder;

    beforeEach(() => {
      fileToMove = createMockFileDoc({
        userId: testUserId,
        folderId: createObjectId(),
        path: '/Old Folder',
      });

      targetFolder = createMockFolderDoc({
        _id: createObjectId(),
        userId: testUserId,
        path: '/New Folder',
      });

      jest.spyOn(File, 'findOne').mockResolvedValue(fileToMove);
      jest.spyOn(Folder, 'findOne').mockResolvedValue(targetFolder);
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should move file to new folder', async () => {
      const result = await fileService.moveFile(
        fileToMove._id.toString(),
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(result).toBeDefined();
      expect(fileToMove.save).toHaveBeenCalled();
    });

    it('should update path to match target folder', async () => {
      await fileService.moveFile(
        fileToMove._id.toString(),
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(fileToMove.path).toBe('/New Folder');
    });

    it('should update both old and new folder stats', async () => {
      const oldFolderId = fileToMove.folderId;

      await fileService.moveFile(
        fileToMove._id.toString(),
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(Folder.updateFolderStats).toHaveBeenCalledWith(oldFolderId);
      expect(Folder.updateFolderStats).toHaveBeenCalledWith(targetFolder._id.toString());
    });

    it('should throw error if target folder not found', async () => {
      Folder.findOne.mockResolvedValue(null);

      try {
        await fileService.moveFile(
          fileToMove._id.toString(),
          createObjectId().toString(),
          testUserId.toString()
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Target folder not found');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should allow moving to root (null folderId)', async () => {
      const result = await fileService.moveFile(
        fileToMove._id.toString(),
        null,
        testUserId.toString()
      );

      expect(result).toBeDefined();
      expect(fileToMove.folderId).toBeNull();
      expect(fileToMove.path).toBe('/');
    });

    it('should return null if file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const result = await fileService.moveFile(
        createObjectId().toString(),
        targetFolder._id.toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // TOGGLE FAVORITE TESTS
  // ===========================================================================

  describe('toggleFavorite()', () => {
    let file;

    beforeEach(() => {
      file = createMockFileDoc({ userId: testUserId, favorite: false });
      jest.spyOn(File, 'findOne').mockResolvedValue(file);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should toggle favorite from false to true', async () => {
      const result = await fileService.toggleFavorite(
        file._id.toString(),
        testUserId.toString()
      );

      expect(result.favorite).toBe(true);
      expect(file.save).toHaveBeenCalled();
    });

    it('should toggle favorite from true to false', async () => {
      file.favorite = true;

      const result = await fileService.toggleFavorite(
        file._id.toString(),
        testUserId.toString()
      );

      expect(result.favorite).toBe(false);
    });

    it('should return null if file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const result = await fileService.toggleFavorite(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // GET DOWNLOAD URL TESTS
  // ===========================================================================

  describe('getDownloadUrl()', () => {
    let file;

    beforeEach(() => {
      file = createMockFileDoc({
        userId: testUserId,
        downloadCount: 5,
      });
      jest.spyOn(File, 'findOne').mockResolvedValue(file);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate a signed URL', async () => {
      const result = await fileService.getDownloadUrl(
        file._id.toString(),
        testUserId.toString()
      );

      expect(result.url).toBeDefined();
      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(
        file.storageKey,
        3600,
        'getObject'
      );
    });

    it('should increment download count', async () => {
      await fileService.getDownloadUrl(
        file._id.toString(),
        testUserId.toString()
      );

      expect(file.downloadCount).toBe(6);
      expect(file.save).toHaveBeenCalled();
    });

    it('should update lastAccessedAt', async () => {
      const beforeTime = new Date();

      await fileService.getDownloadUrl(
        file._id.toString(),
        testUserId.toString()
      );

      expect(file.lastAccessedAt).toBeDefined();
      expect(file.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should return file metadata for headers', async () => {
      const result = await fileService.getDownloadUrl(
        file._id.toString(),
        testUserId.toString()
      );

      expect(result.filename).toBe(file.originalName);
      expect(result.contentType).toBe(file.mimeType);
      expect(result.size).toBe(file.size);
    });

    it('should return null if file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const result = await fileService.getDownloadUrl(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // GET FILE VERSIONS TESTS
  // ===========================================================================

  describe('getFileVersions()', () => {
    let v3File, v2File, v1File;

    beforeEach(() => {
      v1File = createMockFileDoc({
        userId: testUserId,
        version: 1,
        previousVersionId: null,
        isLatestVersion: false,
      });

      v2File = createMockFileDoc({
        userId: testUserId,
        version: 2,
        previousVersionId: v1File._id,
        isLatestVersion: false,
      });

      v3File = createMockFileDoc({
        userId: testUserId,
        version: 3,
        previousVersionId: v2File._id,
        isLatestVersion: true,
      });

      jest.spyOn(File, 'findOne').mockResolvedValue(v3File);
      jest.spyOn(File, 'findById')
        .mockResolvedValueOnce(v2File)
        .mockResolvedValueOnce(v1File)
        .mockResolvedValueOnce(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return version chain from newest to oldest', async () => {
      const versions = await fileService.getFileVersions(
        v3File._id.toString(),
        testUserId.toString()
      );

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    it('should return empty array if file not found', async () => {
      File.findOne.mockResolvedValue(null);

      const versions = await fileService.getFileVersions(
        createObjectId().toString(),
        testUserId.toString()
      );

      expect(versions).toEqual([]);
    });
  });

  // ===========================================================================
  // ENTITY LINKING TESTS
  // ===========================================================================

  describe('linkFileToEntity()', () => {
    let file;

    beforeEach(() => {
      file = createMockFileDoc({
        userId: testUserId,
        linkedNoteIds: [],
        linkedProjectIds: [],
        linkedTaskIds: [],
      });

      jest.spyOn(File, 'findOneAndUpdate').mockResolvedValue(file);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should link file to a note', async () => {
      const noteId = createObjectId();

      await fileService.linkFileToEntity(
        file._id.toString(),
        noteId.toString(),
        'note',
        testUserId.toString()
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: file._id.toString(), userId: testUserId.toString() },
        { $addToSet: { linkedNoteIds: noteId.toString() } },
        { new: true }
      );
    });

    it('should link file to a project', async () => {
      const projectId = createObjectId();

      await fileService.linkFileToEntity(
        file._id.toString(),
        projectId.toString(),
        'project',
        testUserId.toString()
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $addToSet: { linkedProjectIds: projectId.toString() } },
        expect.anything()
      );
    });

    it('should link file to a task', async () => {
      const taskId = createObjectId();

      await fileService.linkFileToEntity(
        file._id.toString(),
        taskId.toString(),
        'task',
        testUserId.toString()
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $addToSet: { linkedTaskIds: taskId.toString() } },
        expect.anything()
      );
    });

    it('should throw error for invalid entity type', async () => {
      try {
        await fileService.linkFileToEntity(
          file._id.toString(),
          createObjectId().toString(),
          'invalid',
          testUserId.toString()
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid entity type');
        expect(error.statusCode).toBe(400);
      }
    });
  });

  describe('unlinkFileFromEntity()', () => {
    let file;

    beforeEach(() => {
      const noteId = createObjectId();
      file = createMockFileDoc({
        userId: testUserId,
        linkedNoteIds: [noteId],
      });

      jest.spyOn(File, 'findOneAndUpdate').mockResolvedValue(file);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should unlink file from entity', async () => {
      const noteId = file.linkedNoteIds[0];

      await fileService.unlinkFileFromEntity(
        file._id.toString(),
        noteId.toString(),
        'note',
        testUserId.toString()
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: file._id.toString(), userId: testUserId.toString() },
        { $pull: { linkedNoteIds: noteId.toString() } },
        { new: true }
      );
    });

    it('should throw error for invalid entity type', async () => {
      try {
        await fileService.unlinkFileFromEntity(
          file._id.toString(),
          createObjectId().toString(),
          'invalid',
          testUserId.toString()
        );
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid entity type');
        expect(error.statusCode).toBe(400);
      }
    });
  });

  describe('getFilesForEntity()', () => {
    let linkedFiles;

    beforeEach(() => {
      linkedFiles = [
        createMockFileDoc({ userId: testUserId }),
        createMockFileDoc({ userId: testUserId }),
      ];

      jest.spyOn(File, 'find').mockResolvedValue(linkedFiles);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return files linked to an entity', async () => {
      const noteId = createObjectId();

      const result = await fileService.getFilesForEntity(
        noteId.toString(),
        'note',
        testUserId.toString()
      );

      expect(result).toHaveLength(2);
      expect(File.find).toHaveBeenCalledWith({
        userId: testUserId.toString(),
        linkedNoteIds: noteId.toString(),
        isTrashed: false,
        isLatestVersion: true,
      });
    });

    it('should throw error for invalid entity type', async () => {
      await expect(
        fileService.getFilesForEntity(
          createObjectId().toString(),
          'invalid',
          testUserId.toString()
        )
      ).rejects.toThrow('Invalid entity type');
    });
  });

  // ===========================================================================
  // BULK OPERATIONS TESTS
  // ===========================================================================

  describe('bulkTrashFiles()', () => {
    beforeEach(() => {
      jest.spyOn(File, 'updateMany').mockResolvedValue({ modifiedCount: 3 });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should trash multiple files', async () => {
      const fileIds = [
        createObjectId().toString(),
        createObjectId().toString(),
        createObjectId().toString(),
      ];

      const result = await fileService.bulkTrashFiles(fileIds, testUserId.toString());

      expect(result.trashed).toBe(3);
      expect(File.updateMany).toHaveBeenCalled();
    });
  });

  describe('bulkDeleteFiles()', () => {
    let files;

    beforeEach(() => {
      files = [
        createMockFileDoc({ userId: testUserId, thumbnailKey: 'thumb1' }),
        createMockFileDoc({ userId: testUserId, thumbnailKey: null }),
        createMockFileDoc({ userId: testUserId, thumbnailKey: 'thumb3' }),
      ];

      jest.spyOn(File, 'find').mockResolvedValue(files);
      jest.spyOn(File, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
      jest.spyOn(FileShare, 'updateMany').mockResolvedValue({ modifiedCount: 0 });
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should permanently delete multiple files', async () => {
      const fileIds = files.map(f => f._id.toString());

      const result = await fileService.bulkDeleteFiles(fileIds, testUserId.toString());

      expect(result.deleted).toBe(3);
    });

    it('should delete files and thumbnails from S3', async () => {
      const fileIds = files.map(f => f._id.toString());

      await fileService.bulkDeleteFiles(fileIds, testUserId.toString());

      // Should call deleteMany with storage keys
      expect(mockStorageProvider.deleteMany).toHaveBeenCalled();
    });

    it('should deactivate shares for deleted files', async () => {
      const fileIds = files.map(f => f._id.toString());

      await fileService.bulkDeleteFiles(fileIds, testUserId.toString());

      expect(FileShare.updateMany).toHaveBeenCalled();
    });

    it('should return deleted: 0 if no files found', async () => {
      File.find.mockResolvedValue([]);

      const result = await fileService.bulkDeleteFiles(
        [createObjectId().toString()],
        testUserId.toString()
      );

      expect(result.deleted).toBe(0);
    });
  });

  // ===========================================================================
  // UPDATE FILE TESTS
  // ===========================================================================

  describe('updateFile()', () => {
    let file;

    beforeEach(() => {
      file = createMockFileDoc({ userId: testUserId });
      jest.spyOn(File, 'findOneAndUpdate').mockResolvedValue(file);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update allowed fields', async () => {
      const updates = {
        title: 'New Title',
        description: 'New description',
        tags: ['new', 'tags'],
        favorite: true,
      };

      await fileService.updateFile(
        file._id.toString(),
        testUserId.toString(),
        updates
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: file._id.toString(), userId: testUserId.toString() },
        { $set: updates },
        { new: true, runValidators: true }
      );
    });

    it('should filter out disallowed fields', async () => {
      const updates = {
        title: 'New Title',
        storageKey: 'hacked-key', // Should be filtered out
        checksums: { md5: 'hacked' }, // Should be filtered out
      };

      await fileService.updateFile(
        file._id.toString(),
        testUserId.toString(),
        updates
      );

      expect(File.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $set: { title: 'New Title' } },
        expect.anything()
      );
    });

    it('should return null if file not found', async () => {
      File.findOneAndUpdate.mockResolvedValue(null);

      const result = await fileService.updateFile(
        createObjectId().toString(),
        testUserId.toString(),
        { title: 'New Title' }
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle S3 upload failures', async () => {
      mockStorageProvider.upload.mockRejectedValueOnce(new Error('S3 upload failed'));

      jest.spyOn(File, 'getCategoryFromMimeType').mockReturnValue('document');

      const mockFile = createMockFile();

      await expect(
        fileService.uploadFile(mockFile, testUserId.toString())
      ).rejects.toThrow('S3 upload failed');
    });

    it('should handle database connection errors in getFiles', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      jest.spyOn(File, 'find').mockReturnValue(mockQuery);

      await expect(
        fileService.getFiles(testUserId.toString())
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid file IDs gracefully in getFile', async () => {
      jest.spyOn(File, 'findOne').mockRejectedValue(new Error('Cast to ObjectId failed'));

      await expect(
        fileService.getFile('invalid-id', testUserId.toString())
      ).rejects.toThrow('Cast to ObjectId failed');
    });

    it('should handle S3 deletion failures in deleteFile but still clean up DB', async () => {
      const file = createMockFileDoc({ userId: testUserId });

      jest.spyOn(File, 'findOne').mockResolvedValue(file);
      jest.spyOn(File, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      jest.spyOn(FileShare, 'deactivateFileShares').mockResolvedValue(0);
      jest.spyOn(Folder, 'updateFolderStats').mockResolvedValue({});

      // Make S3 delete fail
      mockStorageProvider.delete.mockRejectedValueOnce(new Error('S3 error'));

      // Should not throw - should continue with DB cleanup
      const result = await fileService.deleteFile(
        file._id.toString(),
        testUserId.toString()
      );

      expect(result.deleted).toBe(true);
      expect(File.deleteOne).toHaveBeenCalled();
    });
  });
});
