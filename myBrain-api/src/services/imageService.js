import getCloudinary from '../config/cloudinary.js';
import Image from '../models/Image.js';

/**
 * Upload an image to Cloudinary and save metadata to database
 */
export async function uploadImage(file, userId, options = {}) {
  const { folder = 'library', alt = '', tags = [] } = options;
  const cloudinary = getCloudinary();

  // Upload to Cloudinary using stream
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `mybrain/${userId}/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

  // Save image metadata to database
  const image = await Image.create({
    userId,
    cloudinaryId: uploadResult.public_id,
    url: uploadResult.url,
    secureUrl: uploadResult.secure_url,
    filename: uploadResult.public_id.split('/').pop(),
    originalName: file.originalname,
    format: uploadResult.format,
    size: uploadResult.bytes,
    width: uploadResult.width,
    height: uploadResult.height,
    folder,
    alt,
    tags,
  });

  return image;
}

/**
 * Get all images for a user
 */
export async function getImages(userId, options = {}) {
  const { folder, page = 1, limit = 20 } = options;

  const query = { userId };
  if (folder) {
    query.folder = folder;
  }

  const skip = (page - 1) * limit;

  const [images, total] = await Promise.all([
    Image.find(query)
      .sort({ createdAt: -1 })
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
  const allowedUpdates = ['alt', 'tags'];
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
