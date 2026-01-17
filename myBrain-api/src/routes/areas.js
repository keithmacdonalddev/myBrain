import express from 'express';
import Area from '../models/Area.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /areas
 * Get areas visible to the current user
 * Requires authentication
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const areas = await Area.getAreasForUser(req.user);

    res.json({
      areas: areas.map(area => area.toSafeJSON())
    });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({
      error: 'Failed to fetch areas',
      code: 'AREAS_FETCH_ERROR'
    });
  }
});

/**
 * GET /areas/admin
 * Get all areas (admin only)
 */
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const areas = await Area.find().sort({ order: 1 });

    res.json({
      areas: areas.map(area => area.toSafeJSON())
    });
  } catch (error) {
    console.error('Error fetching areas for admin:', error);
    res.status(500).json({
      error: 'Failed to fetch areas',
      code: 'AREAS_FETCH_ERROR'
    });
  }
});

/**
 * POST /areas/admin
 * Create a new area (admin only)
 */
router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, icon, status, order, description, color, permissions, featureFlags } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        error: 'Name and slug are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if slug already exists
    const existingArea = await Area.findOne({ slug: slug.toLowerCase() });
    if (existingArea) {
      return res.status(409).json({
        error: 'An area with this slug already exists',
        code: 'SLUG_EXISTS'
      });
    }

    // Get max order if not provided
    let areaOrder = order;
    if (areaOrder === undefined) {
      const maxOrderArea = await Area.findOne().sort({ order: -1 });
      areaOrder = maxOrderArea ? maxOrderArea.order + 1 : 1;
    }

    const area = new Area({
      name,
      slug: slug.toLowerCase(),
      icon: icon || 'Folder',
      status: status || 'coming_soon',
      order: areaOrder,
      description,
      color,
      permissions,
      featureFlags,
      createdBy: req.user._id
    });

    await area.save();

    res.status(201).json({
      message: 'Area created successfully',
      area: area.toSafeJSON()
    });
  } catch (error) {
    console.error('Error creating area:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create area',
      code: 'AREA_CREATE_ERROR'
    });
  }
});

/**
 * PATCH /areas/admin/:slug
 * Update an area (admin only)
 */
router.patch('/admin/:slug', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;

    // Don't allow changing the slug to avoid breaking references
    delete updates.slug;
    delete updates._id;
    delete updates.createdAt;
    delete updates.createdBy;

    const area = await Area.findOneAndUpdate(
      { slug },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!area) {
      return res.status(404).json({
        error: 'Area not found',
        code: 'AREA_NOT_FOUND'
      });
    }

    res.json({
      message: 'Area updated successfully',
      area: area.toSafeJSON()
    });
  } catch (error) {
    console.error('Error updating area:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update area',
      code: 'AREA_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /areas/admin/:slug
 * Delete an area (admin only)
 */
router.delete('/admin/:slug', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    // Prevent deleting core areas
    const protectedSlugs = ['notes'];
    if (protectedSlugs.includes(slug)) {
      return res.status(403).json({
        error: 'Cannot delete core areas',
        code: 'PROTECTED_AREA'
      });
    }

    const area = await Area.findOneAndDelete({ slug });

    if (!area) {
      return res.status(404).json({
        error: 'Area not found',
        code: 'AREA_NOT_FOUND'
      });
    }

    res.json({
      message: 'Area deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({
      error: 'Failed to delete area',
      code: 'AREA_DELETE_ERROR'
    });
  }
});

/**
 * POST /areas/admin/reorder
 * Reorder areas (admin only)
 */
router.post('/admin/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { orderedSlugs } = req.body;

    if (!Array.isArray(orderedSlugs)) {
      return res.status(400).json({
        error: 'orderedSlugs must be an array',
        code: 'INVALID_INPUT'
      });
    }

    // Update order for each area
    const updatePromises = orderedSlugs.map((slug, index) =>
      Area.findOneAndUpdate({ slug }, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    // Fetch updated areas
    const areas = await Area.find().sort({ order: 1 });

    res.json({
      message: 'Areas reordered successfully',
      areas: areas.map(area => area.toSafeJSON())
    });
  } catch (error) {
    console.error('Error reordering areas:', error);
    res.status(500).json({
      error: 'Failed to reorder areas',
      code: 'REORDER_ERROR'
    });
  }
});

export default router;
