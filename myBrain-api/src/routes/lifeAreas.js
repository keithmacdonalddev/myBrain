import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import lifeAreaService from '../services/lifeAreaService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /life-areas
 * Get all life areas for the user (sorted by order)
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
    console.error('Error fetching life areas:', error);
    res.status(500).json({
      error: 'Failed to fetch life areas',
      code: 'LIFE_AREAS_FETCH_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id
 * Get a single life area by ID with item counts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeCounts = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
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
        error: 'Life area not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      lifeArea: lifeArea.toSafeJSON ? lifeArea.toSafeJSON() : lifeArea
    });
  } catch (error) {
    console.error('Error fetching life area:', error);
    res.status(500).json({
      error: 'Failed to fetch life area',
      code: 'LIFE_AREA_FETCH_ERROR'
    });
  }
});

/**
 * POST /life-areas
 * Create a new life area
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Life area name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const lifeArea = await lifeAreaService.createLifeArea(req.user._id, {
      name,
      description,
      color,
      icon
    });

    res.status(201).json({
      message: 'Life area created successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    console.error('Error creating life area:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create life area',
      code: 'LIFE_AREA_CREATE_ERROR'
    });
  }
});

/**
 * PATCH /life-areas/:id
 * Update a life area
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const lifeArea = await lifeAreaService.updateLifeArea(req.user._id, id, updates);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Life area not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      message: 'Life area updated successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    console.error('Error updating life area:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update life area',
      code: 'LIFE_AREA_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /life-areas/:id
 * Delete a life area (reassigns items to default)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
        code: 'INVALID_ID'
      });
    }

    const result = await lifeAreaService.deleteLifeArea(req.user._id, id);

    if (!result) {
      return res.status(404).json({
        error: 'Life area not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      message: 'Life area deleted successfully',
      deletedArea: result.deleted.toSafeJSON(),
      reassignedTo: result.reassignedTo.toSafeJSON()
    });
  } catch (error) {
    console.error('Error deleting life area:', error);

    if (error.message === 'Cannot delete the default life area') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_DELETE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to delete life area',
      code: 'LIFE_AREA_DELETE_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/set-default
 * Set a life area as the default
 */
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.setDefault(req.user._id, id);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Life area not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      message: 'Default life area set successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    console.error('Error setting default life area:', error);
    res.status(500).json({
      error: 'Failed to set default life area',
      code: 'SET_DEFAULT_ERROR'
    });
  }
});

/**
 * POST /life-areas/reorder
 * Reorder life areas
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

    // Fetch updated life areas
    const lifeAreas = await lifeAreaService.getLifeAreas(req.user._id);

    res.json({
      message: 'Life areas reordered successfully',
      lifeAreas: lifeAreas.map(la => la.toSafeJSON())
    });
  } catch (error) {
    console.error('Error reordering life areas:', error);
    res.status(500).json({
      error: 'Failed to reorder life areas',
      code: 'REORDER_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/archive
 * Archive or unarchive a life area
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.archiveLifeArea(req.user._id, id, isArchived);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Life area not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    res.json({
      message: isArchived ? 'Life area archived' : 'Life area unarchived',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    console.error('Error archiving life area:', error);

    if (error.message === 'Cannot archive the default life area') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_ARCHIVE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to archive life area',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id/items
 * Get all items in a life area
 */
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { types, limit = '50', skip = '0' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid life area ID',
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
    console.error('Error fetching life area items:', error);
    res.status(500).json({
      error: 'Failed to fetch items',
      code: 'ITEMS_FETCH_ERROR'
    });
  }
});

export default router;
