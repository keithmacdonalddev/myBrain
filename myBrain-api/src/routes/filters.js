import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import SavedFilter from '../models/SavedFilter.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /filters
 * Get all saved filters for the user
 */
router.get('/', async (req, res) => {
  try {
    const { entityType } = req.query;

    const query = { userId: req.user._id };
    if (entityType) {
      query.entityType = entityType;
    }

    const filters = await SavedFilter.find(query).sort({ createdAt: -1 });

    res.json({
      filters: filters.map(f => f.toSafeJSON())
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({
      error: 'Failed to fetch filters',
      code: 'FILTERS_FETCH_ERROR'
    });
  }
});

/**
 * POST /filters
 * Create a new saved filter
 */
router.post('/', async (req, res) => {
  try {
    const { name, entityType, filters, sortBy, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Filter name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!entityType || !['note', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'Valid entity type is required (note or task)',
        code: 'VALIDATION_ERROR'
      });
    }

    const filter = new SavedFilter({
      userId: req.user._id,
      name,
      entityType,
      filters: filters || {},
      sortBy: sortBy || '-updatedAt',
      icon: icon || 'filter',
      color: color || null
    });

    await filter.save();

    res.status(201).json({
      message: 'Filter saved successfully',
      filter: filter.toSafeJSON()
    });
  } catch (error) {
    console.error('Error creating filter:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create filter',
      code: 'FILTER_CREATE_ERROR'
    });
  }
});

/**
 * GET /filters/:id
 * Get a single filter by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    const filter = await SavedFilter.findOne({ _id: id, userId: req.user._id });

    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    res.json({ filter: filter.toSafeJSON() });
  } catch (error) {
    console.error('Error fetching filter:', error);
    res.status(500).json({
      error: 'Failed to fetch filter',
      code: 'FILTER_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /filters/:id
 * Update a filter
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;

    const filter = await SavedFilter.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Filter updated successfully',
      filter: filter.toSafeJSON()
    });
  } catch (error) {
    console.error('Error updating filter:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update filter',
      code: 'FILTER_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /filters/:id
 * Delete a filter
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    const filter = await SavedFilter.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    res.json({ message: 'Filter deleted successfully' });
  } catch (error) {
    console.error('Error deleting filter:', error);
    res.status(500).json({
      error: 'Failed to delete filter',
      code: 'FILTER_DELETE_ERROR'
    });
  }
});

export default router;
