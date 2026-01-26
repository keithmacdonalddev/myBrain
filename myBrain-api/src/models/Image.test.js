/**
 * =============================================================================
 * IMAGE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Image model, covering:
 * - Schema validation (required fields, enums, defaults)
 * - Image-specific metadata (dimensions, colors, aspect ratio)
 * - Thumbnail references
 * - User isolation
 * - Soft delete (trashed images)
 * - Storage provider handling (S3, Cloudinary, local)
 * - Static methods (searchImages, getUserTags)
 * - Instance methods (toSafeJSON, isS3, isCloudinary, getStorageId)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import '../test/setup.js';
import Image from './Image.js';
import User from './User.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
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
 * Creates an image with sensible defaults for testing.
 */
async function createTestImage(userId, overrides = {}) {
  const defaults = {
    userId,
    storageProvider: 's3',
    storageKey: `images/${userId}/${Date.now()}/test-image.jpg`,
    storageBucket: 'mybrain-images-test',
    filename: `test-image-${Date.now()}.jpg`,
    originalName: 'Test Photo.jpg',
    format: 'jpg',
    mimeType: 'image/jpeg',
    size: 1024 * 500, // 500KB
    folder: 'library',
  };
  return Image.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('Image Model', () => {
  describe('Schema Validation', () => {
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          Image.create({
            filename: 'test.jpg',
            originalName: 'Test.jpg',
            format: 'jpg',
            size: 1000,
          })
        ).rejects.toThrow(/userId.*required/i);
      });

      it('should require filename', async () => {
        const user = await createTestUser();
        await expect(
          Image.create({
            userId: user._id,
            originalName: 'Test.jpg',
            format: 'jpg',
            size: 1000,
          })
        ).rejects.toThrow(/filename.*required/i);
      });

      it('should require originalName', async () => {
        const user = await createTestUser();
        await expect(
          Image.create({
            userId: user._id,
            filename: 'test.jpg',
            format: 'jpg',
            size: 1000,
          })
        ).rejects.toThrow(/originalName.*required/i);
      });

      it('should require format', async () => {
        const user = await createTestUser();
        await expect(
          Image.create({
            userId: user._id,
            filename: 'test.jpg',
            originalName: 'Test.jpg',
            size: 1000,
          })
        ).rejects.toThrow(/format.*required/i);
      });

      it('should require size', async () => {
        const user = await createTestUser();
        await expect(
          Image.create({
            userId: user._id,
            filename: 'test.jpg',
            originalName: 'Test.jpg',
            format: 'jpg',
          })
        ).rejects.toThrow(/size.*required/i);
      });
    });

    describe('Enum validations', () => {
      it('should accept valid storage providers', async () => {
        const user = await createTestUser();
        const providers = ['cloudinary', 's3', 'local'];

        for (const provider of providers) {
          const image = await createTestImage(user._id, { storageProvider: provider });
          expect(image.storageProvider).toBe(provider);
        }
      });

      it('should reject invalid storage provider', async () => {
        const user = await createTestUser();
        await expect(
          createTestImage(user._id, { storageProvider: 'dropbox' })
        ).rejects.toThrow();
      });

      it('should accept valid folder types', async () => {
        const user = await createTestUser();
        const folders = ['library', 'avatars', 'notes', 'projects'];

        for (const folder of folders) {
          const image = await createTestImage(user._id, { folder });
          expect(image.folder).toBe(folder);
        }
      });

      it('should reject invalid folder type', async () => {
        const user = await createTestUser();
        await expect(
          createTestImage(user._id, { folder: 'custom' })
        ).rejects.toThrow();
      });
    });

    describe('Default values', () => {
      it('should default storageProvider to s3', async () => {
        const user = await createTestUser();
        const image = await Image.create({
          userId: user._id,
          filename: 'test.jpg',
          originalName: 'Test.jpg',
          format: 'jpg',
          size: 1000,
        });
        expect(image.storageProvider).toBe('s3');
      });

      it('should default folder to library', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.folder).toBe('library');
      });

      it('should default favorite to false', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.favorite).toBe(false);
      });

      it('should default title to empty string', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.title).toBe('');
      });

      it('should default description to empty string', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.description).toBe('');
      });

      it('should default alt to empty string', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.alt).toBe('');
      });

      it('should default tags to empty array', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.tags).toEqual([]);
      });

      it('should default colors to empty array', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);
        expect(image.colors).toEqual([]);
      });
    });

    describe('Field constraints', () => {
      it('should reject title exceeding 200 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestImage(user._id, { title: 'a'.repeat(201) })
        ).rejects.toThrow(/Title cannot exceed 200 characters/);
      });

      it('should reject description exceeding 1000 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestImage(user._id, { description: 'a'.repeat(1001) })
        ).rejects.toThrow(/Description cannot exceed 1000 characters/);
      });

      it('should reject alt text exceeding 500 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestImage(user._id, { alt: 'a'.repeat(501) })
        ).rejects.toThrow(/Alt text cannot exceed 500 characters/);
      });

      it('should trim whitespace from title', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, { title: '  Spaced Title  ' });
        expect(image.title).toBe('Spaced Title');
      });

      it('should trim whitespace from description', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, { description: '  Spaced Description  ' });
        expect(image.description).toBe('Spaced Description');
      });

      it('should trim whitespace from alt', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, { alt: '  Spaced Alt  ' });
        expect(image.alt).toBe('Spaced Alt');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: IMAGE-SPECIFIC METADATA
  // =============================================================================

  describe('Image-Specific Metadata', () => {
    describe('Dimensions', () => {
      it('should store width and height', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          width: 1920,
          height: 1080,
        });

        expect(image.width).toBe(1920);
        expect(image.height).toBe(1080);
      });

      it('should store aspect ratio', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          width: 1920,
          height: 1080,
          aspectRatio: 1.78,
        });

        expect(image.aspectRatio).toBeCloseTo(1.78, 2);
      });

      it('should handle square images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          width: 500,
          height: 500,
          aspectRatio: 1.0,
        });

        expect(image.aspectRatio).toBe(1.0);
      });

      it('should handle portrait images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          width: 1080,
          height: 1920,
          aspectRatio: 0.5625,
        });

        expect(image.aspectRatio).toBeCloseTo(0.5625, 4);
      });
    });

    describe('Colors', () => {
      it('should store dominant color', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          dominantColor: '#3b82f6',
        });

        expect(image.dominantColor).toBe('#3b82f6');
      });

      it('should store array of prominent colors', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          colors: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'],
        });

        expect(image.colors).toHaveLength(4);
        expect(image.colors).toContain('#3b82f6');
        expect(image.colors).toContain('#ef4444');
      });

      it('should handle null dominant color', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);

        expect(image.dominantColor).toBeNull();
      });
    });

    describe('File formats', () => {
      it('should store JPEG format', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          format: 'jpg',
          mimeType: 'image/jpeg',
        });

        expect(image.format).toBe('jpg');
        expect(image.mimeType).toBe('image/jpeg');
      });

      it('should store PNG format', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          format: 'png',
          mimeType: 'image/png',
        });

        expect(image.format).toBe('png');
        expect(image.mimeType).toBe('image/png');
      });

      it('should store GIF format', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          format: 'gif',
          mimeType: 'image/gif',
        });

        expect(image.format).toBe('gif');
        expect(image.mimeType).toBe('image/gif');
      });

      it('should store WebP format', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          format: 'webp',
          mimeType: 'image/webp',
        });

        expect(image.format).toBe('webp');
        expect(image.mimeType).toBe('image/webp');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: THUMBNAIL REFERENCES
  // =============================================================================

  describe('Thumbnail References', () => {
    it('should store thumbnail key', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, {
        thumbnailKey: 'thumbnails/user123/thumb-abc123.jpg',
      });

      expect(image.thumbnailKey).toBe('thumbnails/user123/thumb-abc123.jpg');
    });

    it('should default thumbnail key to null', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id);

      expect(image.thumbnailKey).toBeNull();
    });
  });

  // =============================================================================
  // TEST SUITE: USER ISOLATION
  // =============================================================================

  describe('User Isolation', () => {
    it('should only return images for specific user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestImage(user1._id, { originalName: 'User1 Photo.jpg' });
      await createTestImage(user1._id, { originalName: 'User1 Another.jpg' });
      await createTestImage(user2._id, { originalName: 'User2 Photo.jpg' });

      const user1Images = await Image.find({ userId: user1._id });
      const user2Images = await Image.find({ userId: user2._id });

      expect(user1Images).toHaveLength(2);
      expect(user2Images).toHaveLength(1);
      expect(user1Images[0].userId.toString()).toBe(user1._id.toString());
    });

    it('should not leak images between users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const secretImage = await createTestImage(user1._id, { title: 'Secret Photo' });

      const user2Query = await Image.findOne({ _id: secretImage._id, userId: user2._id });
      expect(user2Query).toBeNull();
    });
  });

  // =============================================================================
  // TEST SUITE: FOLDER ORGANIZATION
  // =============================================================================

  describe('Folder Organization', () => {
    it('should organize images in library folder', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, { folder: 'library' });

      expect(image.folder).toBe('library');
    });

    it('should organize avatars separately', async () => {
      const user = await createTestUser();
      const avatar = await createTestImage(user._id, { folder: 'avatars' });

      expect(avatar.folder).toBe('avatars');
    });

    it('should filter images by folder', async () => {
      const user = await createTestUser();
      await createTestImage(user._id, { folder: 'library' });
      await createTestImage(user._id, { folder: 'library' });
      await createTestImage(user._id, { folder: 'avatars' });
      await createTestImage(user._id, { folder: 'notes' });

      const libraryImages = await Image.find({ userId: user._id, folder: 'library' });
      const avatarImages = await Image.find({ userId: user._id, folder: 'avatars' });

      expect(libraryImages).toHaveLength(2);
      expect(avatarImages).toHaveLength(1);
    });
  });

  // =============================================================================
  // TEST SUITE: ENTITY LINKS
  // =============================================================================

  describe('Entity Links', () => {
    it('should store linked note IDs', async () => {
      const user = await createTestUser();
      const noteId1 = new mongoose.Types.ObjectId();
      const noteId2 = new mongoose.Types.ObjectId();

      const image = await createTestImage(user._id, {
        linkedNoteIds: [noteId1, noteId2],
      });

      expect(image.linkedNoteIds).toHaveLength(2);
    });

    it('should store linked project IDs', async () => {
      const user = await createTestUser();
      const projectId = new mongoose.Types.ObjectId();

      const image = await createTestImage(user._id, {
        linkedProjectIds: [projectId],
      });

      expect(image.linkedProjectIds).toHaveLength(1);
    });

    it('should track source URL for imported images', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, {
        sourceUrl: 'https://example.com/original-image.jpg',
      });

      expect(image.sourceUrl).toBe('https://example.com/original-image.jpg');
    });
  });

  // =============================================================================
  // TEST SUITE: STORAGE PROVIDERS
  // =============================================================================

  describe('Storage Providers', () => {
    describe('S3 Storage', () => {
      it('should identify S3-stored images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: 'images/user123/photo.jpg',
          storageBucket: 'mybrain-images',
        });

        // isS3() returns truthy (storageKey) when conditions met
        expect(image.isS3()).toBeTruthy();
        expect(image.isCloudinary()).toBeFalsy();
      });

      it('should return storageKey as storage ID for S3', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: 'images/user123/photo.jpg',
        });

        expect(image.getStorageId()).toBe('images/user123/photo.jpg');
      });
    });

    describe('Cloudinary Storage', () => {
      it('should identify Cloudinary-stored images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'mybrain/user123/photo',
          storageKey: null,
        });

        expect(image.isCloudinary()).toBe(true);
        expect(image.isS3()).toBe(false);
      });

      it('should return cloudinaryId as storage ID for Cloudinary', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'mybrain/user123/photo',
          storageKey: null,
        });

        expect(image.getStorageId()).toBe('mybrain/user123/photo');
      });

      it('should handle legacy Cloudinary images without explicit provider', async () => {
        const user = await createTestUser();
        // Legacy image without storageProvider set correctly
        const image = await Image.create({
          userId: user._id,
          filename: 'legacy.jpg',
          originalName: 'Legacy.jpg',
          format: 'jpg',
          size: 1000,
          cloudinaryId: 'legacy/image',
          url: 'http://res.cloudinary.com/demo/image.jpg',
          secureUrl: 'https://res.cloudinary.com/demo/image.jpg',
          storageKey: null,
        });

        // isCloudinary() returns truthy (cloudinaryId) for legacy images
        expect(image.isCloudinary()).toBeTruthy();
      });

      it('should store Cloudinary URLs', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'mybrain/photo',
          url: 'http://res.cloudinary.com/demo/image.jpg',
          secureUrl: 'https://res.cloudinary.com/demo/image.jpg',
        });

        expect(image.url).toBe('http://res.cloudinary.com/demo/image.jpg');
        expect(image.secureUrl).toBe('https://res.cloudinary.com/demo/image.jpg');
      });
    });

    describe('Local Storage', () => {
      it('should handle local storage provider', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'local',
          storageKey: '/uploads/images/photo.jpg',
        });

        expect(image.storageProvider).toBe('local');
        expect(image.storageKey).toBe('/uploads/images/photo.jpg');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: FAVORITES
  // =============================================================================

  describe('Favorites', () => {
    it('should mark image as favorite', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, { favorite: true });

      expect(image.favorite).toBe(true);
    });

    it('should filter favorite images', async () => {
      const user = await createTestUser();
      await createTestImage(user._id, { favorite: true });
      await createTestImage(user._id, { favorite: true });
      await createTestImage(user._id, { favorite: false });

      const favorites = await Image.find({ userId: user._id, favorite: true });
      expect(favorites).toHaveLength(2);
    });

    it('should toggle favorite status', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, { favorite: false });

      image.favorite = true;
      await image.save();

      const updated = await Image.findById(image._id);
      expect(updated.favorite).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: TAGS
  // =============================================================================

  describe('Tags', () => {
    it('should store tags as an array', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, {
        tags: ['vacation', 'beach', 'sunset'],
      });

      expect(image.tags).toEqual(['vacation', 'beach', 'sunset']);
    });

    it('should find images by tag', async () => {
      const user = await createTestUser();
      await createTestImage(user._id, { tags: ['vacation', 'beach'] });
      await createTestImage(user._id, { tags: ['work', 'presentation'] });
      await createTestImage(user._id, { tags: ['vacation', 'mountains'] });

      const vacationImages = await Image.find({ userId: user._id, tags: 'vacation' });
      expect(vacationImages).toHaveLength(2);
    });

    it('should find images with multiple tags (all match)', async () => {
      const user = await createTestUser();
      await createTestImage(user._id, { tags: ['vacation', 'beach', 'sunset'] });
      await createTestImage(user._id, { tags: ['vacation', 'beach'] });
      await createTestImage(user._id, { tags: ['vacation'] });

      const beachVacation = await Image.find({
        userId: user._id,
        tags: { $all: ['vacation', 'beach'] },
      });
      expect(beachVacation).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    describe('searchImages()', () => {
      it('should return images for user', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { title: 'Photo 1' });
        await createTestImage(user._id, { title: 'Photo 2' });

        const { images, total } = await Image.searchImages(user._id);

        expect(images).toHaveLength(2);
        expect(total).toBe(2);
      });

      it('should filter by folder', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { folder: 'library' });
        await createTestImage(user._id, { folder: 'avatars' });

        const { images } = await Image.searchImages(user._id, { folder: 'library' });

        expect(images).toHaveLength(1);
        expect(images[0].folder).toBe('library');
      });

      it('should filter by tags', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { tags: ['vacation', 'beach'] });
        await createTestImage(user._id, { tags: ['work'] });
        await createTestImage(user._id, { tags: ['vacation', 'mountains'] });

        const { images } = await Image.searchImages(user._id, { tags: ['vacation'] });

        expect(images).toHaveLength(2);
      });

      it('should filter by favorite status', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { favorite: true });
        await createTestImage(user._id, { favorite: false });
        await createTestImage(user._id, { favorite: true });

        const { images } = await Image.searchImages(user._id, { favorite: true });

        expect(images).toHaveLength(2);
      });

      it('should support pagination', async () => {
        const user = await createTestUser();
        for (let i = 0; i < 10; i++) {
          await createTestImage(user._id, { title: `Photo ${i}` });
        }

        const page1 = await Image.searchImages(user._id, { limit: 3, skip: 0 });
        const page2 = await Image.searchImages(user._id, { limit: 3, skip: 3 });

        expect(page1.images).toHaveLength(3);
        expect(page2.images).toHaveLength(3);
        expect(page1.total).toBe(10);
      });

      it('should sort by createdAt descending by default', async () => {
        const user = await createTestUser();
        const img1 = await createTestImage(user._id, { title: 'First' });
        await new Promise(resolve => setTimeout(resolve, 10));
        const img2 = await createTestImage(user._id, { title: 'Second' });

        const { images } = await Image.searchImages(user._id);

        expect(images[0]._id.toString()).toBe(img2._id.toString());
        expect(images[1]._id.toString()).toBe(img1._id.toString());
      });

      it('should sort ascending when specified', async () => {
        const user = await createTestUser();
        const img1 = await createTestImage(user._id, { title: 'First' });
        await new Promise(resolve => setTimeout(resolve, 10));
        const img2 = await createTestImage(user._id, { title: 'Second' });

        const { images } = await Image.searchImages(user._id, { sort: 'createdAt' });

        expect(images[0]._id.toString()).toBe(img1._id.toString());
        expect(images[1]._id.toString()).toBe(img2._id.toString());
      });
    });

    describe('getUserTags()', () => {
      it('should return unique tags with counts', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { tags: ['vacation', 'beach'], folder: 'library' });
        await createTestImage(user._id, { tags: ['vacation', 'mountains'], folder: 'library' });
        await createTestImage(user._id, { tags: ['work'], folder: 'library' });

        const tags = await Image.getUserTags(user._id);

        expect(tags).toContainEqual({ tag: 'vacation', count: 2 });
        expect(tags).toContainEqual({ tag: 'beach', count: 1 });
        expect(tags).toContainEqual({ tag: 'mountains', count: 1 });
        expect(tags).toContainEqual({ tag: 'work', count: 1 });
      });

      it('should only count library images', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { tags: ['portrait'], folder: 'library' });
        await createTestImage(user._id, { tags: ['avatar'], folder: 'avatars' });

        const tags = await Image.getUserTags(user._id);

        expect(tags).toContainEqual({ tag: 'portrait', count: 1 });
        expect(tags.find(t => t.tag === 'avatar')).toBeUndefined();
      });

      it('should sort by count descending', async () => {
        const user = await createTestUser();
        await createTestImage(user._id, { tags: ['popular'], folder: 'library' });
        await createTestImage(user._id, { tags: ['popular'], folder: 'library' });
        await createTestImage(user._id, { tags: ['popular'], folder: 'library' });
        await createTestImage(user._id, { tags: ['rare'], folder: 'library' });

        const tags = await Image.getUserTags(user._id);

        expect(tags[0].tag).toBe('popular');
        expect(tags[0].count).toBe(3);
      });

      it('should return empty array for user with no images', async () => {
        const user = await createTestUser();

        const tags = await Image.getUserTags(user._id);

        expect(tags).toEqual([]);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    describe('displayName (virtual)', () => {
      it('should return title when set', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          title: 'Beach Sunset',
          originalName: 'IMG_1234.jpg',
        });

        expect(image.displayName).toBe('Beach Sunset');
      });

      it('should return originalName when title is empty', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          title: '',
          originalName: 'IMG_1234.jpg',
        });

        expect(image.displayName).toBe('IMG_1234.jpg');
      });

      it('should return originalName when title is not set', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          originalName: 'IMG_1234.jpg',
        });

        expect(image.displayName).toBe('IMG_1234.jpg');
      });
    });

    describe('toSafeJSON()', () => {
      it('should include virtuals', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          title: 'My Photo',
        });

        const json = image.toSafeJSON();

        expect(json.displayName).toBe('My Photo');
      });

      it('should remove __v', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id);

        const json = image.toSafeJSON();

        expect(json.__v).toBeUndefined();
      });

      it('should include all relevant fields', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          title: 'Test Photo',
          description: 'A test photo',
          width: 1920,
          height: 1080,
          dominantColor: '#3b82f6',
        });

        const json = image.toSafeJSON();

        expect(json.title).toBe('Test Photo');
        expect(json.description).toBe('A test photo');
        expect(json.width).toBe(1920);
        expect(json.height).toBe(1080);
        expect(json.dominantColor).toBe('#3b82f6');
      });
    });

    describe('isS3()', () => {
      it('should return truthy for S3 images with storageKey', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: 'images/photo.jpg',
        });

        // Returns storageKey (truthy) when conditions met
        expect(image.isS3()).toBeTruthy();
      });

      it('should return falsy for S3 images without storageKey', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: null,
        });

        // Returns falsy when storageKey is null
        expect(image.isS3()).toBeFalsy();
      });

      it('should return falsy for non-S3 images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'test/image',
        });

        // Returns false when provider is not s3
        expect(image.isS3()).toBeFalsy();
      });
    });

    describe('isCloudinary()', () => {
      it('should return truthy for Cloudinary images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'test/image',
        });

        // Returns true when provider is explicitly cloudinary
        expect(image.isCloudinary()).toBeTruthy();
      });

      it('should return truthy for legacy images with cloudinaryId but no storageKey', async () => {
        const user = await createTestUser();
        const image = await Image.create({
          userId: user._id,
          filename: 'legacy.jpg',
          originalName: 'Legacy.jpg',
          format: 'jpg',
          size: 1000,
          cloudinaryId: 'legacy/image',
          storageKey: null,
        });

        // Returns cloudinaryId (truthy) for legacy images
        expect(image.isCloudinary()).toBeTruthy();
      });

      it('should return falsy for S3 images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: 'images/photo.jpg',
        });

        // Returns false when provider is s3 with storageKey
        expect(image.isCloudinary()).toBeFalsy();
      });
    });

    describe('getStorageId()', () => {
      it('should return storageKey for S3 images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 's3',
          storageKey: 'images/photo.jpg',
        });

        expect(image.getStorageId()).toBe('images/photo.jpg');
      });

      it('should return cloudinaryId for Cloudinary images', async () => {
        const user = await createTestUser();
        const image = await createTestImage(user._id, {
          storageProvider: 'cloudinary',
          cloudinaryId: 'mybrain/photo',
          storageKey: null,
        });

        expect(image.getStorageId()).toBe('mybrain/photo');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id);

      expect(image.createdAt).toBeInstanceOf(Date);
    });

    it('should set updatedAt on creation', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id);

      expect(image.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id);

      const originalUpdatedAt = image.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10));

      image.title = 'Updated Title';
      await image.save();

      expect(image.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle image with all metadata populated', async () => {
      const user = await createTestUser();
      const noteId = new mongoose.Types.ObjectId();
      const projectId = new mongoose.Types.ObjectId();

      const image = await createTestImage(user._id, {
        storageProvider: 's3',
        storageKey: 'images/complete.jpg',
        storageBucket: 'mybrain-images',
        thumbnailKey: 'thumbnails/complete-thumb.jpg',
        filename: 'complete.jpg',
        originalName: 'Complete Photo.jpg',
        format: 'jpg',
        mimeType: 'image/jpeg',
        size: 2000000,
        width: 4000,
        height: 3000,
        aspectRatio: 1.333,
        folder: 'library',
        title: 'Complete Test Image',
        description: 'An image with all fields populated',
        alt: 'A comprehensive test image',
        tags: ['test', 'complete', 'all-fields'],
        favorite: true,
        dominantColor: '#3b82f6',
        colors: ['#3b82f6', '#ef4444', '#22c55e'],
        linkedNoteIds: [noteId],
        linkedProjectIds: [projectId],
        sourceUrl: 'https://example.com/source.jpg',
      });

      expect(image._id).toBeDefined();
      expect(image.title).toBe('Complete Test Image');
      expect(image.tags).toHaveLength(3);
      expect(image.linkedNoteIds).toHaveLength(1);
    });

    it('should handle very large file sizes', async () => {
      const user = await createTestUser();
      const largeSize = 1024 * 1024 * 1024 * 5; // 5GB

      const image = await createTestImage(user._id, {
        size: largeSize,
      });

      expect(image.size).toBe(largeSize);
    });

    it('should handle very small file sizes', async () => {
      const user = await createTestUser();
      const smallSize = 1; // 1 byte

      const image = await createTestImage(user._id, {
        size: smallSize,
      });

      expect(image.size).toBe(1);
    });

    it('should handle images with zero dimensions', async () => {
      const user = await createTestUser();
      const image = await createTestImage(user._id, {
        width: 0,
        height: 0,
      });

      expect(image.width).toBe(0);
      expect(image.height).toBe(0);
    });
  });
});
