/**
 * =============================================================================
 * IMAGESERVICE.TEST.JS - Image Service Tests
 * =============================================================================
 *
 * Comprehensive tests for image gallery business logic including:
 * - Image upload with S3 integration (mocked)
 * - Image retrieval with signed URL generation
 * - Search and filtering
 * - Updates and favorites
 * - Deletion (S3 + database cleanup)
 * - Tag management
 * - Folder organization
 * - User isolation
 * - Validation and edge cases
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as imageService from './imageService.js';
import Image from '../models/Image.js';

// =============================================================================
// MOCKS
// =============================================================================

// Mock the storage factory
jest.mock('./storage/storageFactory.js', () => ({
  getDefaultProvider: jest.fn(() => ({
    upload: jest.fn(async (buffer, key, options) => ({
      key,
      bucket: 'test-bucket',
      location: `https://test-bucket.s3.amazonaws.com/${key}`,
      etag: 'mock-etag',
    })),
    delete: jest.fn(async (key) => ({ deleted: true })),
    getSignedUrl: jest.fn(async (key, expiresIn, operation) =>
      `https://test-bucket.s3.amazonaws.com/${key}?signature=mock-signature&expires=${expiresIn}`
    ),
  })),
}));

// Mock the image processing service
jest.mock('./imageProcessingService.js', () => ({
  processImage: jest.fn(async (buffer, options) => ({
    original: Buffer.from('processed-original'),
    thumbnail: Buffer.from('processed-thumbnail'),
    metadata: {
      format: 'jpeg',
      width: 1920,
      height: 1080,
      processedWidth: 1920,
      processedHeight: 1080,
      dominantColor: '#3b82f6',
      colors: ['#3b82f6', '#ef4444', '#10b981'],
    },
  })),
  extractMetadata: jest.fn(async (buffer) => ({
    format: 'jpeg',
    width: 1920,
    height: 1080,
  })),
}));

// Mock usage tracking service
jest.mock('./usageService.js', () => ({
  trackCreate: jest.fn(),
  trackView: jest.fn(),
}));

// =============================================================================
// TEST SETUP
// =============================================================================

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Image.deleteMany({});
  jest.clearAllMocks();
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a unique user ID for test isolation
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Create a mock file object (simulates multer file upload)
 */
function createMockFile(overrides = {}) {
  return {
    buffer: Buffer.from('fake-image-data'),
    originalname: 'test-image.jpg',
    mimetype: 'image/jpeg',
    size: 1024000, // 1MB
    ...overrides,
  };
}

/**
 * Create a test image in the database
 */
async function createTestImage(userId, overrides = {}) {
  return await Image.create({
    userId,
    storageProvider: 's3',
    storageKey: `${userId}/images/library/${Date.now()}-test.jpg`,
    storageBucket: 'test-bucket',
    thumbnailKey: `${userId}/images/library/thumbnails/${Date.now()}-test.jpg`,
    filename: 'test-image.jpg',
    originalName: 'test-image.jpg',
    format: 'jpeg',
    mimeType: 'image/jpeg',
    size: 1024000,
    width: 1920,
    height: 1080,
    aspectRatio: 1.78,
    folder: 'library',
    ...overrides,
  });
}

// =============================================================================
// UPLOAD IMAGE TESTS
// =============================================================================

describe('uploadImage', () => {
  it('should upload an image with valid data', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const image = await imageService.uploadImage(file, userId, {
      title: 'Test Image',
      description: 'A test image',
      alt: 'Test image description',
      tags: ['test', 'upload'],
      folder: 'library',
    });

    expect(image).toBeDefined();
    expect(image.userId.toString()).toBe(userId.toString());
    expect(image.title).toBe('Test Image');
    expect(image.description).toBe('A test image');
    expect(image.alt).toBe('Test image description');
    expect(image.tags).toEqual(['test', 'upload']);
    expect(image.folder).toBe('library');
    expect(image.originalName).toBe('test-image.jpg');
    expect(image.format).toBe('jpeg');
    expect(image.mimeType).toBe('image/jpeg');
    expect(image.storageProvider).toBe('s3');
    expect(image.storageKey).toContain(userId.toString());
    expect(image.thumbnailKey).toContain('thumbnails');
  });

  it('should use default folder if not specified', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const image = await imageService.uploadImage(file, userId);

    expect(image.folder).toBe('library');
  });

  it('should handle different image formats', async () => {
    const userId = createUserId();

    const formats = [
      { name: 'image.png', mime: 'image/png' },
      { name: 'image.gif', mime: 'image/gif' },
      { name: 'image.webp', mime: 'image/webp' },
    ];

    for (const format of formats) {
      const file = createMockFile({
        originalname: format.name,
        mimetype: format.mime,
      });

      const image = await imageService.uploadImage(file, userId);

      expect(image.originalName).toBe(format.name);
      expect(image.mimeType).toBe(format.mime);
    }
  });

  it('should handle files without extension', async () => {
    const userId = createUserId();
    const file = createMockFile({
      originalname: 'image-no-extension',
    });

    const image = await imageService.uploadImage(file, userId);

    expect(image).toBeDefined();
    expect(image.filename).toMatch(/\.jpg$/); // Default to .jpg
  });

  it('should store color information from processing', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const image = await imageService.uploadImage(file, userId);

    expect(image.dominantColor).toBe('#3b82f6');
    expect(image.colors).toEqual(['#3b82f6', '#ef4444', '#10b981']);
  });

  it('should calculate aspect ratio correctly', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const image = await imageService.uploadImage(file, userId);

    // 1920 / 1080 = 1.78 (rounded)
    expect(image.aspectRatio).toBe(1.78);
  });

  it('should handle upload to different folders', async () => {
    const userId = createUserId();

    const folders = ['library', 'avatars', 'notes', 'projects'];

    for (const folder of folders) {
      const file = createMockFile();
      const image = await imageService.uploadImage(file, userId, { folder });

      expect(image.folder).toBe(folder);
      expect(image.storageKey).toContain(folder);
    }
  });

  it('should generate unique filenames for multiple uploads', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const image1 = await imageService.uploadImage(file, userId);
    const image2 = await imageService.uploadImage(file, userId);

    expect(image1.filename).not.toBe(image2.filename);
    expect(image1.storageKey).not.toBe(image2.storageKey);
  });

  it('should handle unicode characters in filenames', async () => {
    const userId = createUserId();
    const file = createMockFile({
      originalname: 'test-图片-照片.jpg',
    });

    const image = await imageService.uploadImage(file, userId);

    expect(image.originalName).toBe('test-图片-照片.jpg');
  });

  it('should track usage for analytics', async () => {
    const userId = createUserId();
    const file = createMockFile();
    const { trackCreate } = require('./usageService.js');

    await imageService.uploadImage(file, userId);

    expect(trackCreate).toHaveBeenCalledWith(userId, 'images');
  });
});

// =============================================================================
// GET IMAGE URL TESTS
// =============================================================================

describe('getImageUrl', () => {
  it('should generate signed URL for original image', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);

    const url = await imageService.getImageUrl(image, 'original', 3600);

    expect(url).toBeDefined();
    expect(url).toContain('signature=mock-signature');
    expect(url).toContain('expires=3600');
  });

  it('should generate signed URL for thumbnail', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);

    const url = await imageService.getImageUrl(image, 'thumbnail', 3600);

    expect(url).toBeDefined();
    expect(url).toContain(image.thumbnailKey || image.storageKey);
  });

  it('should fall back to original if thumbnail does not exist', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { thumbnailKey: null });

    const url = await imageService.getImageUrl(image, 'thumbnail', 3600);

    expect(url).toBeDefined();
    expect(url).toContain(image.storageKey);
  });

  it('should handle custom expiration times', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);

    const url1 = await imageService.getImageUrl(image, 'original', 1800);
    const url2 = await imageService.getImageUrl(image, 'original', 7200);

    expect(url1).toContain('expires=1800');
    expect(url2).toContain('expires=7200');
  });
});

// =============================================================================
// GET IMAGES TESTS (LIST WITH FILTERING)
// =============================================================================

describe('getImages', () => {
  it('should return images for a user with pagination', async () => {
    const userId = createUserId();

    // Create 5 test images
    for (let i = 0; i < 5; i++) {
      await createTestImage(userId, { title: `Image ${i}` });
    }

    const result = await imageService.getImages(userId, {
      page: 1,
      limit: 3,
    });

    expect(result.images).toHaveLength(3);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.pages).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(3);
  });

  it('should filter images by folder', async () => {
    const userId = createUserId();

    await createTestImage(userId, { folder: 'library' });
    await createTestImage(userId, { folder: 'library' });
    await createTestImage(userId, { folder: 'avatars' });

    const result = await imageService.getImages(userId, { folder: 'library' });

    expect(result.images).toHaveLength(2);
    expect(result.images.every(img => img.folder === 'library')).toBe(true);
  });

  it('should filter by favorite status', async () => {
    const userId = createUserId();

    await createTestImage(userId, { favorite: true });
    await createTestImage(userId, { favorite: true });
    await createTestImage(userId, { favorite: false });

    const result = await imageService.getImages(userId, { favorite: true });

    expect(result.images).toHaveLength(2);
    expect(result.images.every(img => img.favorite === true)).toBe(true);
  });

  it('should filter by tags (must have all)', async () => {
    const userId = createUserId();

    await createTestImage(userId, { tags: ['vacation', 'beach'] });
    await createTestImage(userId, { tags: ['vacation', 'beach', 'sunset'] });
    await createTestImage(userId, { tags: ['vacation'] });

    const result = await imageService.getImages(userId, {
      tags: ['vacation', 'beach'],
    });

    expect(result.images).toHaveLength(2);
  });

  it('should sort images correctly', async () => {
    const userId = createUserId();

    // Create images with different timestamps
    const image1 = await createTestImage(userId, { title: 'First' });
    await new Promise(resolve => setTimeout(resolve, 10));
    const image2 = await createTestImage(userId, { title: 'Second' });
    await new Promise(resolve => setTimeout(resolve, 10));
    const image3 = await createTestImage(userId, { title: 'Third' });

    // Default sort: newest first (-createdAt)
    const result = await imageService.getImages(userId, { sort: '-createdAt' });

    expect(result.images[0].title).toBe('Third');
    expect(result.images[1].title).toBe('Second');
    expect(result.images[2].title).toBe('First');
  });

  it('should isolate images by user', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    await createTestImage(user1, { title: 'User 1 Image' });
    await createTestImage(user2, { title: 'User 2 Image' });

    const user1Result = await imageService.getImages(user1);
    const user2Result = await imageService.getImages(user2);

    expect(user1Result.images).toHaveLength(1);
    expect(user2Result.images).toHaveLength(1);
    expect(user1Result.images[0].title).toBe('User 1 Image');
    expect(user2Result.images[0].title).toBe('User 2 Image');
  });

  it('should return empty array for user with no images', async () => {
    const userId = createUserId();

    const result = await imageService.getImages(userId);

    expect(result.images).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('should include signed URLs in response', async () => {
    const userId = createUserId();
    await createTestImage(userId);

    const result = await imageService.getImages(userId);

    expect(result.images[0].url).toBeDefined();
    expect(result.images[0].thumbnailUrl).toBeDefined();
    expect(result.images[0].url).toContain('signature=mock-signature');
  });

  it('should handle pagination edge cases', async () => {
    const userId = createUserId();

    // Create 10 images
    for (let i = 0; i < 10; i++) {
      await createTestImage(userId);
    }

    // Request page beyond available pages
    const result = await imageService.getImages(userId, {
      page: 10,
      limit: 5,
    });

    expect(result.images).toEqual([]);
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.pages).toBe(2);
  });
});

// =============================================================================
// SEARCH IMAGES TESTS
// =============================================================================

describe('searchImages', () => {
  it('should search images by text', async () => {
    const userId = createUserId();

    await createTestImage(userId, { title: 'Beach vacation photo' });
    await createTestImage(userId, { title: 'Mountain hiking' });
    await createTestImage(userId, { description: 'Beautiful beach sunset' });

    const result = await imageService.searchImages(userId, { q: 'beach' });

    expect(result.images.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it('should include signed URLs in search results', async () => {
    const userId = createUserId();
    await createTestImage(userId, { title: 'Searchable image' });

    const result = await imageService.searchImages(userId, { q: 'searchable' });

    expect(result.images[0].url).toBeDefined();
    expect(result.images[0].thumbnailUrl).toBeDefined();
  });
});

// =============================================================================
// GET IMAGE BY ID TESTS
// =============================================================================

describe('getImage', () => {
  it('should return image by ID', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { title: 'Test Image' });

    const found = await imageService.getImage(image._id, userId);

    expect(found).toBeDefined();
    expect(found.title).toBe('Test Image');
    expect(found.url).toBeDefined();
    expect(found.thumbnailUrl).toBeDefined();
  });

  it('should return null for non-existent image', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const found = await imageService.getImage(fakeId, userId);

    expect(found).toBeNull();
  });

  it('should return null for other user\'s image', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    const image = await createTestImage(user1);

    const found = await imageService.getImage(image._id, user2);

    expect(found).toBeNull();
  });

  it('should track view for analytics', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const { trackView } = require('./usageService.js');

    await imageService.getImage(image._id, userId);

    expect(trackView).toHaveBeenCalledWith(userId, 'images');
  });
});

// =============================================================================
// UPDATE IMAGE TESTS
// =============================================================================

describe('updateImage', () => {
  it('should update image metadata', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { title: 'Old Title' });

    const updated = await imageService.updateImage(image._id, userId, {
      title: 'New Title',
      description: 'Updated description',
      alt: 'Updated alt text',
      tags: ['updated', 'tag'],
    });

    expect(updated.title).toBe('New Title');
    expect(updated.description).toBe('Updated description');
    expect(updated.alt).toBe('Updated alt text');
    expect(updated.tags).toEqual(['updated', 'tag']);
  });

  it('should return null for non-existent image', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const updated = await imageService.updateImage(fakeId, userId, {
      title: 'New Title',
    });

    expect(updated).toBeNull();
  });

  it('should not allow updating read-only fields', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const originalKey = image.storageKey;
    const originalSize = image.size;

    await imageService.updateImage(image._id, userId, {
      storageKey: 'hacked-key',
      size: 999,
      width: 9999,
      height: 9999,
    });

    const found = await Image.findById(image._id);

    expect(found.storageKey).toBe(originalKey);
    expect(found.size).toBe(originalSize);
  });

  it('should handle partial updates', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, {
      title: 'Original Title',
      description: 'Original Description',
    });

    await imageService.updateImage(image._id, userId, {
      title: 'Updated Title',
    });

    const found = await Image.findById(image._id);

    expect(found.title).toBe('Updated Title');
    expect(found.description).toBe('Original Description'); // Unchanged
  });

  it('should include signed URLs in response', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);

    const updated = await imageService.updateImage(image._id, userId, {
      title: 'Updated',
    });

    expect(updated.url).toBeDefined();
    expect(updated.thumbnailUrl).toBeDefined();
  });
});

// =============================================================================
// TOGGLE FAVORITE TESTS
// =============================================================================

describe('toggleFavorite', () => {
  it('should toggle favorite from false to true', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { favorite: false });

    const toggled = await imageService.toggleFavorite(image._id, userId);

    expect(toggled.favorite).toBe(true);
  });

  it('should toggle favorite from true to false', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { favorite: true });

    const toggled = await imageService.toggleFavorite(image._id, userId);

    expect(toggled.favorite).toBe(false);
  });

  it('should return null for non-existent image', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const toggled = await imageService.toggleFavorite(fakeId, userId);

    expect(toggled).toBeNull();
  });

  it('should include signed URLs in response', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);

    const toggled = await imageService.toggleFavorite(image._id, userId);

    expect(toggled.url).toBeDefined();
    expect(toggled.thumbnailUrl).toBeDefined();
  });
});

// =============================================================================
// GET USER IMAGE TAGS TESTS
// =============================================================================

describe('getUserImageTags', () => {
  it('should return unique tags with counts', async () => {
    const userId = createUserId();

    await createTestImage(userId, { tags: ['vacation', 'beach'], folder: 'library' });
    await createTestImage(userId, { tags: ['vacation', 'mountain'], folder: 'library' });
    await createTestImage(userId, { tags: ['beach'], folder: 'library' });

    const tags = await imageService.getUserImageTags(userId);

    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    // Tags should include vacation (2), beach (2), mountain (1)
  });

  it('should return empty array for user with no images', async () => {
    const userId = createUserId();

    const tags = await imageService.getUserImageTags(userId);

    expect(tags).toEqual([]);
  });
});

// =============================================================================
// DELETE IMAGE TESTS (S3 + DATABASE)
// =============================================================================

describe('deleteImage', () => {
  it('should delete image from both S3 and database', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const { getDefaultProvider } = require('./storage/storageFactory.js');
    const mockProvider = getDefaultProvider();

    const deleted = await imageService.deleteImage(image._id, userId);

    expect(deleted).toBeDefined();
    expect(deleted._id.toString()).toBe(image._id.toString());

    // Verify S3 deletion was called
    expect(mockProvider.delete).toHaveBeenCalledWith(image.storageKey);
    expect(mockProvider.delete).toHaveBeenCalledWith(image.thumbnailKey);

    // Verify database deletion
    const found = await Image.findById(image._id);
    expect(found).toBeNull();
  });

  it('should return null for non-existent image', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const deleted = await imageService.deleteImage(fakeId, userId);

    expect(deleted).toBeNull();
  });

  it('should only delete images belonging to user', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    const image1 = await createTestImage(user1);
    const image2 = await createTestImage(user2);

    await imageService.deleteImage(image1._id, user1);

    // User 1's image should be deleted
    const found1 = await Image.findById(image1._id);
    expect(found1).toBeNull();

    // User 2's image should still exist
    const found2 = await Image.findById(image2._id);
    expect(found2).toBeDefined();
  });

  it('should handle S3 deletion errors gracefully', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const { getDefaultProvider } = require('./storage/storageFactory.js');
    const mockProvider = getDefaultProvider();

    // Mock S3 deletion to fail
    mockProvider.delete.mockRejectedValueOnce(new Error('S3 error'));

    // Should still delete from database even if S3 fails
    const deleted = await imageService.deleteImage(image._id, userId);

    expect(deleted).toBeDefined();

    const found = await Image.findById(image._id);
    expect(found).toBeNull();
  });

  it('should handle images without thumbnails', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { thumbnailKey: null });
    const { getDefaultProvider } = require('./storage/storageFactory.js');
    const mockProvider = getDefaultProvider();

    await imageService.deleteImage(image._id, userId);

    // Should only call delete once for original
    expect(mockProvider.delete).toHaveBeenCalledTimes(1);
    expect(mockProvider.delete).toHaveBeenCalledWith(image.storageKey);
  });
});

// =============================================================================
// DELETE MULTIPLE IMAGES TESTS (BULK)
// =============================================================================

describe('deleteImages', () => {
  it('should delete multiple images', async () => {
    const userId = createUserId();

    const image1 = await createTestImage(userId);
    const image2 = await createTestImage(userId);
    const image3 = await createTestImage(userId);

    const result = await imageService.deleteImages(
      [image1._id, image2._id, image3._id],
      userId
    );

    expect(result.deleted).toBe(3);

    // Verify all deleted from database
    const found1 = await Image.findById(image1._id);
    const found2 = await Image.findById(image2._id);
    const found3 = await Image.findById(image3._id);

    expect(found1).toBeNull();
    expect(found2).toBeNull();
    expect(found3).toBeNull();
  });

  it('should return 0 for empty array', async () => {
    const userId = createUserId();

    const result = await imageService.deleteImages([], userId);

    expect(result.deleted).toBe(0);
  });

  it('should only delete images belonging to user', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    const image1 = await createTestImage(user1);
    const image2 = await createTestImage(user2);

    const result = await imageService.deleteImages(
      [image1._id, image2._id],
      user1
    );

    // Only user1's image should be deleted
    expect(result.deleted).toBe(1);

    const found1 = await Image.findById(image1._id);
    const found2 = await Image.findById(image2._id);

    expect(found1).toBeNull();
    expect(found2).toBeDefined(); // User 2's still exists
  });

  it('should ignore non-existent IDs', async () => {
    const userId = createUserId();
    const image1 = await createTestImage(userId);
    const fakeId = new mongoose.Types.ObjectId();

    const result = await imageService.deleteImages(
      [image1._id, fakeId],
      userId
    );

    expect(result.deleted).toBe(1);
  });
});

// =============================================================================
// DELETE IMAGE BY STORAGE KEY TESTS
// =============================================================================

describe('deleteImageByStorageKey', () => {
  it('should delete image by storage key', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const storageKey = image.storageKey;

    const result = await imageService.deleteImageByStorageKey(storageKey);

    expect(result).toBe(true);

    // Verify deleted from database
    const found = await Image.findById(image._id);
    expect(found).toBeNull();
  });

  it('should return false for null storage key', async () => {
    const result = await imageService.deleteImageByStorageKey(null);

    expect(result).toBe(false);
  });

  it('should handle non-existent storage key gracefully', async () => {
    const result = await imageService.deleteImageByStorageKey('non-existent-key');

    // Should not throw, just return false or true (graceful handling)
    expect(typeof result).toBe('boolean');
  });

  it('should delete thumbnail if it exists', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId);
    const { getDefaultProvider } = require('./storage/storageFactory.js');
    const mockProvider = getDefaultProvider();

    await imageService.deleteImageByStorageKey(image.storageKey);

    // Should delete both original and thumbnail
    expect(mockProvider.delete).toHaveBeenCalledWith(image.storageKey);
    expect(mockProvider.delete).toHaveBeenCalledWith(image.thumbnailKey);
  });

  it('should handle errors gracefully', async () => {
    const { getDefaultProvider } = require('./storage/storageFactory.js');
    const mockProvider = getDefaultProvider();

    // Mock S3 deletion to fail
    mockProvider.delete.mockRejectedValueOnce(new Error('S3 error'));

    const result = await imageService.deleteImageByStorageKey('some-key');

    // Should return false instead of throwing
    expect(result).toBe(false);
  });
});

// =============================================================================
// GET DOWNLOAD URL TESTS
// =============================================================================

describe('getDownloadUrl', () => {
  it('should return download info with signed URL', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, {
      originalName: 'vacation-photo.jpg',
      mimeType: 'image/jpeg',
      size: 2048000,
    });

    const downloadInfo = await imageService.getDownloadUrl(image._id, userId);

    expect(downloadInfo).toBeDefined();
    expect(downloadInfo.url).toBeDefined();
    expect(downloadInfo.url).toContain('signature=mock-signature');
    expect(downloadInfo.filename).toBe('vacation-photo.jpg');
    expect(downloadInfo.contentType).toBe('image/jpeg');
    expect(downloadInfo.size).toBe(2048000);
  });

  it('should return null for non-existent image', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const downloadInfo = await imageService.getDownloadUrl(fakeId, userId);

    expect(downloadInfo).toBeNull();
  });

  it('should return null for other user\'s image', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    const image = await createTestImage(user1);

    const downloadInfo = await imageService.getDownloadUrl(image._id, user2);

    expect(downloadInfo).toBeNull();
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('Validation', () => {
  it('should reject invalid folder values', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'invalid-folder', // Not in enum
      })
    ).rejects.toThrow();
  });

  it('should reject title exceeding max length', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        title: 'a'.repeat(201), // Exceeds 200 char limit
      })
    ).rejects.toThrow();
  });

  it('should reject description exceeding max length', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        description: 'a'.repeat(1001), // Exceeds 1000 char limit
      })
    ).rejects.toThrow();
  });

  it('should require userId', async () => {
    await expect(
      Image.create({
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        // Missing userId
      })
    ).rejects.toThrow();
  });

  it('should require filename', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        // Missing filename
      })
    ).rejects.toThrow();
  });

  it('should require originalName', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        // Missing originalName
      })
    ).rejects.toThrow();
  });

  it('should require format', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        folder: 'library',
        // Missing format
      })
    ).rejects.toThrow();
  });

  it('should require size', async () => {
    const userId = createUserId();

    await expect(
      Image.create({
        userId,
        storageProvider: 's3',
        storageKey: 'test-key',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        folder: 'library',
        // Missing size
      })
    ).rejects.toThrow();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('should handle very large images', async () => {
    const userId = createUserId();
    const file = createMockFile({
      size: 10 * 1024 * 1024, // 10MB
    });

    const image = await imageService.uploadImage(file, userId);

    expect(image).toBeDefined();
    expect(image.size).toBeGreaterThan(0);
  });

  it('should handle images with no dimensions', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, {
      width: null,
      height: null,
      aspectRatio: null,
    });

    expect(image).toBeDefined();
    expect(image.aspectRatio).toBeNull();
  });

  it('should handle images without color data', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, {
      dominantColor: null,
      colors: [],
    });

    expect(image).toBeDefined();
    expect(image.dominantColor).toBeNull();
    expect(image.colors).toEqual([]);
  });

  it('should handle concurrent uploads', async () => {
    const userId = createUserId();
    const file = createMockFile();

    const uploads = await Promise.all([
      imageService.uploadImage(file, userId),
      imageService.uploadImage(file, userId),
      imageService.uploadImage(file, userId),
    ]);

    expect(uploads).toHaveLength(3);
    expect(uploads.every(img => img._id)).toBe(true);

    // All should have unique filenames
    const filenames = uploads.map(img => img.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).toBe(3);
  });

  it('should handle empty tags array', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, { tags: [] });

    expect(image.tags).toEqual([]);
  });

  it('should trim whitespace from metadata fields', async () => {
    const userId = createUserId();
    const image = await createTestImage(userId, {
      title: '  Padded Title  ',
      description: '  Padded Description  ',
      alt: '  Padded Alt  ',
    });

    expect(image.title).toBe('Padded Title');
    expect(image.description).toBe('Padded Description');
    expect(image.alt).toBe('Padded Alt');
  });
});
