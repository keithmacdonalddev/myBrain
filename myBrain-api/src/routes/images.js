import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import * as imageService from '../services/imageService.js';

const router = express.Router();

/**
 * GET /images
 * List user's images
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { folder, page = 1, limit = 20 } = req.query;

    const result = await imageService.getImages(req.user._id, {
      folder,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
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
 * POST /images
 * Upload an image
 */
router.post('/', requireAuth, uploadSingle, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    const { alt, tags, folder } = req.body;
    const parsedTags = tags ? JSON.parse(tags) : [];

    const image = await imageService.uploadImage(req.file, req.user._id, {
      folder: folder || 'library',
      alt: alt || '',
      tags: parsedTags,
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
 * GET /images/:id
 * Get a single image
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
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
    const { alt, tags } = req.body;

    const image = await imageService.updateImage(req.params.id, req.user._id, {
      alt,
      tags,
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
 * DELETE /images/:id
 * Delete an image
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
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
