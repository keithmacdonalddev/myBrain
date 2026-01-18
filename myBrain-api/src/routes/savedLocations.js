import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as savedLocationService from '../services/savedLocationService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /saved-locations
 * Get all saved locations for the current user
 */
router.get('/', async (req, res, next) => {
  try {
    const locations = await savedLocationService.getLocations(req.user._id);
    res.json({ data: locations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /saved-locations/:id
 * Get a single saved location
 */
router.get('/:id', async (req, res, next) => {
  try {
    const location = await savedLocationService.getLocation(req.user._id, req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: location });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /saved-locations
 * Create a new saved location
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, address, coordinates, category, isDefault } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const location = await savedLocationService.createLocation(req.user._id, {
      name,
      address,
      coordinates,
      category,
      isDefault
    });

    res.status(201).json({ data: location });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /saved-locations/:id
 * Update a saved location
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, address, coordinates, category, isDefault } = req.body;

    const location = await savedLocationService.updateLocation(
      req.user._id,
      req.params.id,
      { name, address, coordinates, category, isDefault }
    );

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: location });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /saved-locations/:id
 * Delete a saved location
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const location = await savedLocationService.deleteLocation(req.user._id, req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: location, message: 'Location deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /saved-locations/:id/set-default
 * Set a location as the default
 */
router.post('/:id/set-default', async (req, res, next) => {
  try {
    const location = await savedLocationService.setDefaultLocation(req.user._id, req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: location });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /saved-locations/reorder
 * Reorder saved locations
 */
router.post('/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }

    const locations = await savedLocationService.reorderLocations(req.user._id, orderedIds);
    res.json({ data: locations });
  } catch (error) {
    next(error);
  }
});

export default router;
