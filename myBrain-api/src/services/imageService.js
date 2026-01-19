import getCloudinary from '../config/cloudinary.js';
import Image from '../models/Image.js';

/**
 * Upload an image to Cloudinary and save metadata to database
 */
export async function uploadImage(file, userId, options = {}) {
  const { folder = 'library', alt = '', tags = [], title = '', description = '' } = options;
  const cloudinary = getCloudinary();

  // Upload to Cloudinary using stream with color extraction
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `mybrain/${userId}/${folder}`,
        resource_type: 'image',
        colors: true, // Extract dominant colors
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

  // Extract colors from Cloudinary response
  const colors = uploadResult.colors?.map(c => c[0]) || [];
  const dominantColor = colors[0] || null;

  // Calculate aspect ratio
  const aspectRatio = uploadResult.width && uploadResult.height
    ? Math.round((uploadResult.width / uploadResult.height) * 100) / 100
    : null;

  // Save image metadata to database
  const image = await Image.create({
    userId,
    cloudinaryId: uploadResult.public_id,
    url: uploadResult.url,
    secureUrl: uploadResult.secure_url,
    filename: uploadResult.public_id.split('/').pop(),
    originalName: file.originalname,
    format: uploadResult.format,
    mimeType: file.mimetype,
    size: uploadResult.bytes,
    width: uploadResult.width,
    height: uploadResult.height,
    aspectRatio,
    folder,
    title,
    description,
    alt,
    tags,
    dominantColor,
    colors: colors.slice(0, 5), // Store top 5 colors
  });

  return image;
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

  return {
    images,
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
  return Image.searchImages(userId, options);
}

/**
 * Get a single image by ID
 */
export async function getImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  return image;
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

  return image;
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });
  if (!image) return null;

  image.favorite = !image.favorite;
  await image.save();

  return image;
}

/**
 * Get all unique tags for a user's images
 */
export async function getUserImageTags(userId) {
  return Image.getUserTags(userId);
}

/**
 * Bulk delete images
 */
export async function deleteImages(imageIds, userId) {
  const cloudinary = getCloudinary();
  const images = await Image.find({ _id: { $in: imageIds }, userId });

  if (images.length === 0) return { deleted: 0 };

  // Delete from Cloudinary
  const deletePromises = images.map(img =>
    cloudinary.uploader.destroy(img.cloudinaryId).catch(err => {
      console.error(`Failed to delete ${img.cloudinaryId} from Cloudinary:`, err);
    })
  );
  await Promise.all(deletePromises);

  // Delete from database
  await Image.deleteMany({ _id: { $in: imageIds }, userId });

  return { deleted: images.length };
}

/**
 * Delete an image from Cloudinary and database
 */
export async function deleteImage(imageId, userId) {
  const image = await Image.findOne({ _id: imageId, userId });

  if (!image) {
    return null;
  }

  const cloudinary = getCloudinary();

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(image.cloudinaryId);

  // Delete from database
  await Image.deleteOne({ _id: imageId });

  return image;
}

/**
 * Delete image by Cloudinary ID (used for avatar cleanup)
 */
export async function deleteImageByCloudinaryId(cloudinaryId) {
  if (!cloudinaryId) return null;

  try {
    const cloudinary = getCloudinary();

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(cloudinaryId);

    // Delete from database if exists
    await Image.deleteOne({ cloudinaryId });

    return true;
  } catch (error) {
    console.error('Error deleting image by cloudinaryId:', error);
    return false;
  }
}
