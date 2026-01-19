import crypto from 'crypto';
import path from 'path';
import Image from '../models/Image.js';
import { getDefaultProvider } from './storage/storageFactory.js';
import { processImage, extractMetadata } from './imageProcessingService.js';

/**
 * Upload an image to S3 and save metadata to database
 */
export async function uploadImage(file, userId, options = {}) {
  const { folder = 'library', alt = '', tags = [], title = '', description = '' } = options;

  const storage = getDefaultProvider();
  const timestamp = Date.now();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';

  // Process image with Sharp (optimize + generate thumbnail)
  const processed = await processImage(file.buffer, {
    generateThumbnail: true,
    optimizeOriginal: true,
  });

  // Generate storage keys
  const storageKey = `${userId}/images/${folder}/${timestamp}-${uniqueId}${ext}`;
  const thumbnailKey = `${userId}/images/${folder}/thumbnails/${timestamp}-${uniqueId}.jpg`;

  // Upload original and thumbnail to S3 in parallel
  const [originalResult, thumbnailResult] = await Promise.all([
    storage.upload(processed.original, storageKey, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        userId: userId.toString(),
      },
    }),
    storage.upload(processed.thumbnail, thumbnailKey, {
      contentType: 'image/jpeg',
    }),
  ]);

  // Calculate aspect ratio
  const aspectRatio = processed.metadata.width && processed.metadata.height
    ? Math.round((processed.metadata.width / processed.metadata.height) * 100) / 100
    : null;

  // Save image metadata to database
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

  return image;
}

/**
 * Get a signed URL for an image
 * @param {Object} image - Image document
 * @param {string} type - 'original' or 'thumbnail'
 * @param {number} expiresIn - Expiration in seconds (default 1 hour)
 */
export async function getImageUrl(image, type = 'original', expiresIn = 3600) {
  const storage = getDefaultProvider();
  const key = type === 'thumbnail' && image.thumbnailKey
    ? image.thumbnailKey
    : image.storageKey;

  return storage.getSignedUrl(key, expiresIn, 'getObject');
}

/**
 * Get all images for a user with filtering and sorting
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

  const query = { userId };

  if (folder) {
    query.folder = folder;
  }

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (tags && tags.length > 0) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    query.tags = { $all: tagArray };
  }

  const skip = (page - 1) * limit;

  // Parse sort string
  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [images, total] = await Promise.all([
    Image.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Image.countDocuments(query),
  ]);

  // Generate signed URLs for images
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
 * Search images by text
 */
export async function searchImages(userId, options = {}) {
  const result = await Image.searchImages(userId, options);

  // Generate signed URLs for images
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
 * Get a single image by ID
 */
export async function getImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

/**
 * Update image metadata
 */
export async function updateImage(imageId, userId, updates) {
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

  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  image.favorite = !image.favorite;
  await image.save();

  const imgObj = image.toSafeJSON();
  imgObj.url = await getImageUrl(image, 'original');
  imgObj.thumbnailUrl = await getImageUrl(image, 'thumbnail');

  return imgObj;
}

/**
 * Get all unique tags for a user's images
 */
export async function getUserImageTags(userId) {
  return Image.getUserTags(userId);
}

/**
 * Delete a single image from storage and database
 */
export async function deleteImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });

  if (!image) {
    return null;
  }

  // Delete from S3
  const storage = getDefaultProvider();
  await Promise.all([
    storage.delete(image.storageKey).catch(err => {
      console.error(`Failed to delete ${image.storageKey} from S3:`, err);
    }),
    image.thumbnailKey && storage.delete(image.thumbnailKey).catch(err => {
      console.error(`Failed to delete thumbnail ${image.thumbnailKey} from S3:`, err);
    }),
  ].filter(Boolean));

  // Delete from database
  await Image.deleteOne({ _id: imageId });

  return image;
}

/**
 * Bulk delete images
 */
export async function deleteImages(imageIds, userId) {
  const images = await Image.find({ _id: { $in: imageIds }, userId });

  if (images.length === 0) return { deleted: 0 };

  const storage = getDefaultProvider();

  // Delete all images from S3
  const deletePromises = images.flatMap(img => [
    storage.delete(img.storageKey).catch(err => {
      console.error(`Failed to delete ${img.storageKey} from S3:`, err);
    }),
    img.thumbnailKey && storage.delete(img.thumbnailKey).catch(err => {
      console.error(`Failed to delete thumbnail from S3:`, err);
    }),
  ].filter(Boolean));
  await Promise.all(deletePromises);

  // Delete from database
  await Image.deleteMany({ _id: { $in: imageIds }, userId });

  return { deleted: images.length };
}

/**
 * Delete image by S3 key
 */
export async function deleteImageByStorageKey(storageKey) {
  if (!storageKey) return null;

  try {
    const storage = getDefaultProvider();
    const image = await Image.findOne({ storageKey });

    // Delete from S3
    await storage.delete(storageKey);

    // Delete thumbnail if exists
    if (image?.thumbnailKey) {
      await storage.delete(image.thumbnailKey).catch(() => {});
    }

    // Delete from database if exists
    if (image) {
      await Image.deleteOne({ _id: image._id });
    }

    return true;
  } catch (error) {
    console.error('Error deleting image by storageKey:', error);
    return false;
  }
}

/**
 * Get download URL for an image
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
