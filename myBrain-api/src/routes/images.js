import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { requireStorageLimit } from '../middleware/limitEnforcement.js';
import { requireFeature } from '../middleware/featureGate.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import * as imageService from '../services/imageService.js';
import limitService from '../services/limitService.js';

const router = express.Router();

/**
 * GET /images
 * List user's images with filtering and sorting
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { folder, page = 1, limit = 20, sort = '-createdAt', favorite, tags } = req.query;

    const result = await imageService.getImages(req.user._id, {
      folder,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      favorite,
      tags,
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'images_fetch' });
    res.status(500).json({
      error: 'Failed to get images',
      code: 'GET_IMAGES_ERROR',
    });
  }
});

/**
 * GET /images/search
 * Search images by text
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, folder, tags, favorite, sort = '-createdAt', limit = 50, skip = 0 } = req.query;

    const tagArray = tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [];

    const result = await imageService.searchImages(req.user._id, {
      q,
      folder,
      tags: tagArray,
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : null,
      sort,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'images_search' });
    res.status(500).json({
      error: 'Failed to search images',
      code: 'SEARCH_IMAGES_ERROR',
    });
  }
});

/**
 * GET /images/tags
 * Get all unique tags for user's images
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    const tags = await imageService.getUserImageTags(req.user._id);
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'images_tags' });
    res.status(500).json({
      error: 'Failed to get image tags',
      code: 'GET_TAGS_ERROR',
    });
  }
});

/**
 * GET /images/limits
 * Get user's image storage limits and usage
 */
router.get('/limits', requireAuth, async (req, res) => {
  try {
    const limitStatus = await limitService.getUserLimitStatus(req.user);
    const { images, storage } = limitStatus.status;

    res.json({
      images: {
        current: images.current,
        max: images.max,
        percentage: images.percentage,
        remaining: images.max === -1 ? -1 : Math.max(0, images.max - images.current),
      },
      storage: {
        currentBytes: storage.currentBytes,
        maxBytes: storage.maxBytes,
        currentFormatted: storage.currentFormatted,
        maxFormatted: storage.maxFormatted,
        percentage: storage.percentage,
        remainingBytes: storage.maxBytes === -1 ? -1 : Math.max(0, storage.maxBytes - storage.currentBytes),
      },
    });
  } catch (error) {
    attachError(req, error, { operation: 'images_limits' });
    res.status(500).json({
      error: 'Failed to get image limits',
      code: 'GET_LIMITS_ERROR',
    });
  }
});

/**
 * POST /images
 * Upload an image
 */
router.post('/', requireAuth, requireFeature('imagesEnabled'), uploadSingle, handleUploadError, requireStorageLimit, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    const { alt, tags, folder, title, description } = req.body;
    const parsedTags = tags ? JSON.parse(tags) : [];

    const image = await imageService.uploadImage(req.file, req.user._id, {
      folder: folder || 'library',
      alt: alt || '',
      tags: parsedTags,
      title: title || '',
      description: description || '',
    });

    res.status(201).json({ image });
  } catch (error) {
    attachError(req, error, { operation: 'image_upload' });
    res.status(500).json({
      error: 'Failed to upload image',
      code: 'UPLOAD_ERROR',
    });
  }
});

/**
 * POST /images/bulk-delete
 * Delete multiple images
 */
router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Image IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // Validate all IDs
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid image ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    const result = await imageService.deleteImages(ids, req.user._id);

    res.json({
      message: `Deleted ${result.deleted} images`,
      deleted: result.deleted,
    });
  } catch (error) {
    attachError(req, error, { operation: 'images_bulk_delete' });
    res.status(500).json({
      error: 'Failed to delete images',
      code: 'BULK_DELETE_ERROR',
    });
  }
});

/**
 * GET /images/:id
 * Get a single image
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    const image = await imageService.getImage(req.params.id, req.user._id);

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    res.json({ image });
  } catch (error) {
    attachError(req, error, { operation: 'image_fetch', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to get image',
      code: 'GET_IMAGE_ERROR',
    });
  }
});

/**
 * PATCH /images/:id
 * Update image metadata
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    const { title, description, alt, tags, favorite, sourceUrl } = req.body;

    const image = await imageService.updateImage(req.params.id, req.user._id, {
      title,
      description,
      alt,
      tags,
      favorite,
      sourceUrl,
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    res.json({ image });
  } catch (error) {
    attachError(req, error, { operation: 'image_update', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to update image',
      code: 'UPDATE_IMAGE_ERROR',
    });
  }
});

/**
 * POST /images/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    const image = await imageService.toggleFavorite(req.params.id, req.user._id);

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    res.json({ image, favorite: image.favorite });
  } catch (error) {
    attachError(req, error, { operation: 'image_toggle_favorite', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to toggle favorite',
      code: 'TOGGLE_FAVORITE_ERROR',
    });
  }
});

/**
 * GET /images/:id/download
 * Get download URL for an image
 */
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    const result = await imageService.getDownloadUrl(req.params.id, req.user._id);

    if (!result) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'image_download', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * DELETE /images/:id
 * Delete an image
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    const image = await imageService.deleteImage(req.params.id, req.user._id);

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'image_delete', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete image',
      code: 'DELETE_IMAGE_ERROR',
    });
  }
});

export default router;
