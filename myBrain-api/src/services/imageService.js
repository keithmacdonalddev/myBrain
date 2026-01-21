/**
 * =============================================================================
 * IMAGESERVICE.JS - Image Gallery Management Service
 * =============================================================================
 *
 * This service handles the image gallery feature in myBrain. It manages image
 * uploads, retrieval, search, and organization with a focus on photo management.
 *
 * DIFFERENCE FROM FILE SERVICE:
 * -----------------------------
 * While fileService handles general file management (documents, PDFs, etc.),
 * imageService is specifically designed for photos and images:
 * - Automatic thumbnail generation
 * - Color extraction for visual organization
 * - Gallery-friendly pagination
 * - Image-specific metadata (dimensions, aspect ratio)
 *
 * IMAGE STORAGE STRUCTURE:
 * ------------------------
 * Images are stored with this pattern in S3:
 *
 * {userId}/images/{folder}/{timestamp}-{uniqueId}.{ext}     ← Original
 * {userId}/images/{folder}/thumbnails/{timestamp}-{uniqueId}.jpg  ← Thumbnail
 *
 * FOLDERS IN IMAGE GALLERY:
 * -------------------------
 * Images can be organized into folders (like albums):
 * - 'library' - Default folder for all images
 * - 'avatars' - Profile pictures
 * - Custom folders created by users
 *
 * SIGNED URLs:
 * ------------
 * All image URLs are "signed" - temporary URLs with built-in authentication.
 * This keeps images private while allowing controlled access.
 * Signed URLs expire after a set time (default: 1 hour).
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Node.js crypto for generating unique IDs.
 */
import crypto from 'crypto';

/**
 * Node.js path for handling file extensions.
 */
import path from 'path';

/**
 * Image model - MongoDB schema for image metadata.
 */
import Image from '../models/Image.js';

/**
 * Storage factory to get the configured storage provider.
 */
import { getDefaultProvider } from './storage/storageFactory.js';

/**
 * Image processing utilities for thumbnails and optimization.
 */
import { processImage, extractMetadata } from './imageProcessingService.js';

/**
 * Usage tracking service for the intelligent dashboard.
 * Tracks creates and views.
 */
import { trackCreate, trackView } from './usageService.js';

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * uploadImage(file, userId, options)
 * ----------------------------------
 * Upload an image to storage with automatic processing.
 * Creates optimized original and thumbnail versions.
 *
 * @param {Object} file - Multer file object:
 *   - buffer: Raw image data
 *   - originalname: Original filename
 *   - mimetype: MIME type (e.g., 'image/jpeg')
 *
 * @param {string} userId - User ID (owner)
 *
 * @param {Object} options - Upload options:
 *   @param {string} options.folder - Folder/album name (default: 'library')
 *   @param {string} options.alt - Alt text for accessibility
 *   @param {string[]} options.tags - Tags for organization
 *   @param {string} options.title - Image title
 *   @param {string} options.description - Image description
 *
 * @returns {Promise<Image>} Created image document
 *
 * PROCESSING STEPS:
 * 1. Process image with Sharp (optimize + thumbnail)
 * 2. Generate unique storage keys
 * 3. Upload original and thumbnail to S3 in parallel
 * 4. Extract color information
 * 5. Save metadata to database
 *
 * EXAMPLE:
 * ```javascript
 * const image = await uploadImage(req.file, req.user._id, {
 *   folder: 'vacation-2024',
 *   tags: ['travel', 'beach'],
 *   alt: 'Sunset at the beach'
 * });
 * ```
 */
export async function uploadImage(file, userId, options = {}) {
  const { folder = 'library', alt = '', tags = [], title = '', description = '' } = options;

  // Get storage provider (S3)
  const storage = getDefaultProvider();

  // Generate unique identifiers
  const timestamp = Date.now();
  const uniqueId = crypto.randomBytes(8).toString('hex');  // 16 char random string
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';

  // =====================================================
  // PROCESS IMAGE
  // =====================================================
  // Optimize original and generate thumbnail using Sharp

  const processed = await processImage(file.buffer, {
    generateThumbnail: true,
    optimizeOriginal: true,
  });

  // =====================================================
  // GENERATE STORAGE KEYS
  // =====================================================
  // Storage keys are the paths/filenames in S3

  const storageKey = `${userId}/images/${folder}/${timestamp}-${uniqueId}${ext}`;
  const thumbnailKey = `${userId}/images/${folder}/thumbnails/${timestamp}-${uniqueId}.jpg`;

  // =====================================================
  // UPLOAD TO S3
  // =====================================================
  // Upload both versions in parallel for speed

  const [originalResult, thumbnailResult] = await Promise.all([
    // Upload original (optimized) image
    storage.upload(processed.original, storageKey, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        userId: userId.toString(),
      },
    }),
    // Upload thumbnail (always JPEG for consistency)
    storage.upload(processed.thumbnail, thumbnailKey, {
      contentType: 'image/jpeg',
    }),
  ]);

  // =====================================================
  // CALCULATE ASPECT RATIO
  // =====================================================
  // Useful for responsive image layouts
  // Round to 2 decimal places (e.g., 1.78 for 16:9)

  const aspectRatio = processed.metadata.width && processed.metadata.height
    ? Math.round((processed.metadata.width / processed.metadata.height) * 100) / 100
    : null;

  // =====================================================
  // SAVE TO DATABASE
  // =====================================================

  const image = await Image.create({
    userId,
    storageProvider: 's3',
    storageKey,
    storageBucket: originalResult.bucket,
    thumbnailKey,
    filename: `${timestamp}-${uniqueId}${ext}`,
    originalName: file.originalname,
    format: processed.metadata.format || ext.replace('.', ''),
    mimeType: file.mimetype,
    size: processed.original.length,
    width: processed.metadata.processedWidth || processed.metadata.width,
    height: processed.metadata.processedHeight || processed.metadata.height,
    aspectRatio,
    folder,
    title,
    description,
    alt,
    tags,
    dominantColor: processed.metadata.dominantColor || null,
    colors: processed.metadata.colors || [],
  });

  // Track usage for intelligent dashboard
  trackCreate(userId, 'images');

  return image;
}

// =============================================================================
// URL GENERATION
// =============================================================================

/**
 * getImageUrl(image, type, expiresIn)
 * -----------------------------------
 * Get a signed URL for accessing an image.
 * Signed URLs provide temporary, authenticated access to private S3 objects.
 *
 * @param {Object} image - Image document from database
 * @param {string} type - Which version to get: 'original' or 'thumbnail'
 * @param {number} expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 *
 * @returns {Promise<string>} Signed URL for the image
 *
 * WHY SIGNED URLs?
 * - Images are stored privately in S3
 * - Direct URLs would be public or require auth headers
 * - Signed URLs embed temporary credentials in the URL itself
 * - They expire automatically for security
 *
 * EXAMPLE:
 * ```javascript
 * const url = await getImageUrl(image, 'thumbnail', 3600);
 * // Returns: https://bucket.s3.amazonaws.com/...?X-Amz-Signature=...
 * ```
 */
export async function getImageUrl(image, type = 'original', expiresIn = 3600) {
  const storage = getDefaultProvider();

  // Choose which key to use
  const key = type === 'thumbnail' && image.thumbnailKey
    ? image.thumbnailKey
    : image.storageKey;

  return storage.getSignedUrl(key, expiresIn, 'getObject');
}

// =============================================================================
// IMAGE RETRIEVAL
// =============================================================================

/**
 * getImages(userId, options)
 * --------------------------
 * Get images for a user with filtering, sorting, and pagination.
 * Returns images with generated signed URLs for display.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Filter options:
 *   @param {string} options.folder - Filter by folder/album
 *   @param {number} options.page - Page number (default: 1)
 *   @param {number} options.limit - Images per page (default: 20)
 *   @param {string} options.sort - Sort field (prefix - for desc)
 *   @param {boolean} options.favorite - Filter favorites only
 *   @param {string[]} options.tags - Filter by tags (must have ALL)
 *
 * @returns {Promise<Object>} Results:
 *   - images: Array of images with URLs
 *   - pagination: { page, limit, total, pages }
 *
 * EXAMPLE:
 * ```javascript
 * const { images, pagination } = await getImages(userId, {
 *   folder: 'vacation-2024',
 *   tags: ['beach'],
 *   sort: '-createdAt',
 *   page: 1,
 *   limit: 20
 * });
 * ```
 */
export async function getImages(userId, options = {}) {
  const {
    folder,
    page = 1,
    limit = 20,
    sort = '-createdAt',
    favorite,
    tags
  } = options;

  // =====================================================
  // BUILD QUERY
  // =====================================================

  const query = { userId };

  // Filter by folder (album)
  if (folder) {
    query.folder = folder;
  }

  // Filter favorites
  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  // Filter by tags (must have ALL specified tags)
  if (tags && tags.length > 0) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    query.tags = { $all: tagArray };
  }

  // =====================================================
  // PAGINATION
  // =====================================================

  const skip = (page - 1) * limit;

  // =====================================================
  // PARSE SORT
  // =====================================================
  // '-createdAt' means descending (newest first)

  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // =====================================================
  // EXECUTE QUERY
  // =====================================================

  const [images, total] = await Promise.all([
    Image.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Image.countDocuments(query),
  ]);

  // =====================================================
  // GENERATE SIGNED URLs
  // =====================================================
  // Each image needs fresh signed URLs for the response

  const imagesWithUrls = await Promise.all(
    images.map(async (img) => {
      const imgObj = img.toSafeJSON();
      imgObj.url = await getImageUrl(img, 'original');
      imgObj.thumbnailUrl = await getImageUrl(img, 'thumbnail');
      return imgObj;
    })
  );

  return {
    images: imagesWithUrls,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * searchImages(userId, options)
 * -----------------------------
 * Search images by text (title, description, alt, tags).
 *
 * @param {string} userId - User ID
 * @param {Object} options - Search options passed to model
 *
 * @returns {Promise<Object>} Results with images and total count
 */
export async function searchImages(userId, options = {}) {
  // Use the model's search method
  const result = await Image.searchImages(userId, options);

  // Generate signed URLs for each result
  const imagesWithUrls = await Promise.all(
    result.images.map(async (img) => {
      const imgObj = img.toSafeJSON();
      imgObj.url = await getImageUrl(img, 'original');
      imgObj.thumbnailUrl = await getImageUrl(img, 'thumbnail');
      return imgObj;
    })
  );

  return {
    images: imagesWithUrls,
    total: result.total,
  };
}

/**
 * getImage(imageId, userId)
 * -------------------------
 * Get a single image by ID with signed URLs.
 *
 * @param {string} imageId - Image ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object|null>} Image with URLs or null
 */
export async function getImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  // Track view for intelligent dashboard
  trackView(userId, 'images');

  // Add signed URLs to response
  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

// =============================================================================
// IMAGE UPDATES
// =============================================================================

/**
 * updateImage(imageId, userId, updates)
 * -------------------------------------
 * Update image metadata.
 *
 * @param {string} imageId - Image ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update:
 *   - title: Image title
 *   - description: Description text
 *   - alt: Alt text for accessibility
 *   - tags: Array of tags
 *   - favorite: Boolean favorite status
 *   - sourceUrl: URL if image was from web
 *
 * @returns {Promise<Object|null>} Updated image with URLs or null
 */
export async function updateImage(imageId, userId, updates) {
  // Whitelist allowed update fields
  const allowedUpdates = ['title', 'description', 'alt', 'tags', 'favorite', 'sourceUrl'];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const image = await Image.findOneAndUpdate(
    { _id: imageId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );

  if (!image) return null;

  // Add signed URLs
  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

// =============================================================================
// FAVORITES
// =============================================================================

/**
 * toggleFavorite(imageId, userId)
 * -------------------------------
 * Toggle the favorite status of an image.
 *
 * @param {string} imageId - Image ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object|null>} Updated image with URLs or null
 */
export async function toggleFavorite(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  // Toggle the boolean
  image.favorite = !image.favorite;
  await image.save();

  // Add signed URLs
  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

// =============================================================================
// TAGS
// =============================================================================

/**
 * getUserImageTags(userId)
 * ------------------------
 * Get all unique tags used in a user's images.
 * Useful for tag autocomplete and filtering UI.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<Array<{tag: string, count: number}>>} Tags with usage counts
 */
export async function getUserImageTags(userId) {
  return Image.getUserTags(userId);
}

// =============================================================================
// IMAGE DELETION
// =============================================================================

/**
 * deleteImage(imageId, userId)
 * ----------------------------
 * Permanently delete a single image.
 * Removes from both S3 storage and database.
 *
 * @param {string} imageId - Image ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Image|null>} Deleted image or null if not found
 *
 * WARNING: This is permanent! Images cannot be recovered.
 */
export async function deleteImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });

  if (!image) {
    return null;
  }

  const storage = getDefaultProvider();

  // =====================================================
  // DELETE FROM S3
  // =====================================================
  // Delete both original and thumbnail
  // Use Promise.all with catch to handle individual failures

  await Promise.all([
    // Delete original
    storage.delete(image.storageKey).catch(err => {
      console.error(`Failed to delete ${image.storageKey} from S3:`, err);
    }),
    // Delete thumbnail (if exists)
    image.thumbnailKey && storage.delete(image.thumbnailKey).catch(err => {
      console.error(`Failed to delete thumbnail ${image.thumbnailKey} from S3:`, err);
    }),
  ].filter(Boolean));  // Remove null/undefined promises

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================

  await Image.deleteOne({ _id: imageId });

  return image;
}

/**
 * deleteImages(imageIds, userId)
 * ------------------------------
 * Bulk delete multiple images.
 *
 * @param {string[]} imageIds - Array of image IDs
 * @param {string} userId - User ID
 *
 * @returns {Promise<{deleted: number}>} Count of deleted images
 *
 * WARNING: This is permanent!
 */
export async function deleteImages(imageIds, userId) {
  // Find all images to delete
  const images = await Image.find({ _id: { $in: imageIds }, userId });

  if (images.length === 0) return { deleted: 0 };

  const storage = getDefaultProvider();

  // =====================================================
  // DELETE FROM S3 (BATCH)
  // =====================================================
  // Collect all delete operations

  const deletePromises = images.flatMap(img => [
    storage.delete(img.storageKey).catch(err => {
      console.error(`Failed to delete ${img.storageKey} from S3:`, err);
    }),
    img.thumbnailKey && storage.delete(img.thumbnailKey).catch(err => {
      console.error(`Failed to delete thumbnail from S3:`, err);
    }),
  ].filter(Boolean));

  await Promise.all(deletePromises);

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================

  await Image.deleteMany({ _id: { $in: imageIds }, userId });

  return { deleted: images.length };
}

/**
 * deleteImageByStorageKey(storageKey)
 * -----------------------------------
 * Delete an image by its storage key.
 * Useful for cleanup operations when you only have the S3 key.
 *
 * @param {string} storageKey - S3 storage key
 *
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
export async function deleteImageByStorageKey(storageKey) {
  if (!storageKey) return null;

  try {
    const storage = getDefaultProvider();

    // Find image by storage key
    const image = await Image.findOne({ storageKey });

    // Delete from S3
    await storage.delete(storageKey);

    // Delete thumbnail if exists
    if (image?.thumbnailKey) {
      await storage.delete(image.thumbnailKey).catch(() => {});
    }

    // Delete from database if record exists
    if (image) {
      await Image.deleteOne({ _id: image._id });
    }

    return true;
  } catch (error) {
    console.error('Error deleting image by storageKey:', error);
    return false;
  }
}

// =============================================================================
// DOWNLOADS
// =============================================================================

/**
 * getDownloadUrl(imageId, userId)
 * -------------------------------
 * Get download information for an image.
 * Returns a signed URL and file info for downloading.
 *
 * @param {string} imageId - Image ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object|null>} Download info:
 *   - url: Signed download URL
 *   - filename: Original filename
 *   - contentType: MIME type
 *   - size: File size in bytes
 */
export async function getDownloadUrl(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  const storage = getDefaultProvider();

  return {
    url: await storage.getSignedUrl(image.storageKey, 3600, 'getObject'),
    filename: image.originalName,
    contentType: image.mimeType,
    size: image.size,
  };
}
