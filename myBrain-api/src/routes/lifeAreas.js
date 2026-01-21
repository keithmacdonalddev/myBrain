import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import { requireLimit } from '../middleware/limitEnforcement.js';
import lifeAreaService from '../services/lifeAreaService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /life-areas
 * Get all categories for the user (sorted by order)
 */
router.get('/', async (req, res) => {
  try {
    const { includeArchived = 'false' } = req.query;
    const lifeAreas = await lifeAreaService.getLifeAreas(
      req.user._id,
      includeArchived === 'true'
    );

    res.json({
      lifeAreas: lifeAreas.map(la => la.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_areas_fetch' });
    res.status(500).json({
      error: 'Failed to fetch categories',
      code: 'LIFE_AREAS_FETCH_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id
 * Get a single category by ID with item counts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeCounts = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.getLifeAreaById(
      req.user._id,
      id,
      includeCounts === 'true'
    );

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      lifeArea: lifeArea.toSafeJSON ? lifeArea.toSafeJSON() : lifeArea
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_fetch', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch category',
      code: 'LIFE_AREA_FETCH_ERROR'
    });
  }
});

/**
 * POST /life-areas
 * Create a new category
 */
router.post('/', requireLimit('categories'), async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Category name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const lifeArea = await lifeAreaService.createLifeArea(req.user._id, {
      name,
      description,
      color,
      icon
    });

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.create.success';

    res.status(201).json({
      message: 'Category created successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_create' });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create category',
      code: 'LIFE_AREA_CREATE_ERROR'
    });
  }
});

/**
 * PATCH /life-areas/:id
 * Update a category
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const lifeArea = await lifeAreaService.updateLifeArea(req.user._id, id, updates);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.update.success';

    res.json({
      message: 'Category updated successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_update', lifeAreaId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update category',
      code: 'LIFE_AREA_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /life-areas/:id
 * Delete a category (reassigns items to default)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const result = await lifeAreaService.deleteLifeArea(req.user._id, id);

    if (!result) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', result.deleted._id);
    req.eventName = 'lifeArea.delete.success';

    res.json({
      message: 'Category deleted successfully',
      deletedArea: result.deleted.toSafeJSON(),
      reassignedTo: result.reassignedTo.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_delete', lifeAreaId: req.params.id });

    if (error.message === 'Cannot delete the default category') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_DELETE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to delete category',
      code: 'LIFE_AREA_DELETE_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/set-default
 * Set a category as the default
 */
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.setDefault(req.user._id, id);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.setDefault.success';

    res.json({
      message: 'Default category set successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_set_default', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to set default category',
      code: 'SET_DEFAULT_ERROR'
    });
  }
});

/**
 * POST /life-areas/reorder
 * Reorder categories
 */
router.post('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        error: 'orderedIds must be a non-empty array',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate all IDs
    const invalidIds = orderedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid ID(s) in orderedIds',
        code: 'INVALID_ID'
      });
    }

    await lifeAreaService.reorderLifeAreas(req.user._id, orderedIds);

    // Fetch updated categories
    const lifeAreas = await lifeAreaService.getLifeAreas(req.user._id);

    req.eventName = 'lifeArea.reorder.success';

    res.json({
      message: 'Categorys reordered successfully',
      lifeAreas: lifeAreas.map(la => la.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_areas_reorder' });
    res.status(500).json({
      error: 'Failed to reorder categories',
      code: 'REORDER_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/archive
 * Archive or unarchive a category
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.archiveLifeArea(req.user._id, id, isArchived);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = isArchived ? 'lifeArea.archive.success' : 'lifeArea.unarchive.success';

    res.json({
      message: isArchived ? 'Category archived' : 'Category unarchived',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_archive', lifeAreaId: req.params.id });

    if (error.message === 'Cannot archive the default category') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_ARCHIVE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to archive category',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id/items
 * Get all items in a category
 */
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { types, limit = '50', skip = '0' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const options = {
      types: types ? types.split(',') : ['note', 'task', 'event', 'project'],
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    const items = await lifeAreaService.getLifeAreaItems(req.user._id, id, options);

    // Convert to safe JSON
    const result = {};
    if (items.notes) {
      result.notes = items.notes.map(n => n.toSafeJSON());
    }
    if (items.tasks) {
      result.tasks = items.tasks.map(t => t.toSafeJSON());
    }
    if (items.events) {
      result.events = items.events.map(e => e.toObject());
    }
    if (items.projects) {
      result.projects = items.projects.map(p => p.toSafeJSON());
    }

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'life_area_items_fetch', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch items',
      code: 'ITEMS_FETCH_ERROR'
    });
  }
});

export default router;
