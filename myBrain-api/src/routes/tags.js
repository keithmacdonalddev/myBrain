import express from 'express';
import Tag from '../models/Tag.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /tags
 * Get active tags for the user, sorted by popularity (for autocomplete)
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, search } = req.query;

    let tags;
    if (search && search.trim()) {
      tags = await Tag.searchTags(req.user._id, search.trim(), parseInt(limit));
    } else {
      tags = await Tag.getPopularTags(req.user._id, parseInt(limit));
    }

    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tags/all
 * Get ALL tags including inactive (for management)
 */
router.get('/all', async (req, res) => {
  try {
    const { sortBy = 'usageCount', sortOrder = 'desc' } = req.query;

    const tags = await Tag.getAllTags(req.user._id, {
      sortBy,
      sortOrder: sortOrder === 'asc' ? 1 : -1,
      includeInactive: true
    });

    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'all_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tags/popular
 * Get the most popular active tags (top 10)
 */
router.get('/popular', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const tags = await Tag.getPopularTags(req.user._id, limit);
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'popular_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch popular tags',
      code: 'POPULAR_TAGS_ERROR'
    });
  }
});

/**
 * POST /tags
 * Create a new tag
 */
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tag name is required',
        code: 'TAG_NAME_REQUIRED'
      });
    }

    const normalizedName = name.trim().toLowerCase();

    // Check if tag already exists
    const existing = await Tag.findOne({ userId: req.user._id, name: normalizedName });
    if (existing) {
      return res.status(400).json({
        error: 'Tag already exists',
        code: 'TAG_EXISTS'
      });
    }

    const tag = new Tag({
      userId: req.user._id,
      name: normalizedName,
      color: color || null,
      usageCount: 0,
      isActive: true
    });

    await tag.save();

    // Log successful tag creation
    req.entityIds.tagName = normalizedName;
    req.eventName = 'tag.create.success';

    res.status(201).json({ tag });
  } catch (error) {
    attachError(req, error, { operation: 'tag_create' });
    res.status(500).json({
      error: 'Failed to create tag',
      code: 'TAG_CREATE_ERROR'
    });
  }
});

/**
 * POST /tags/track
 * Track usage of tags (called when tags are applied to an item)
 */
router.post('/track', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Tags must be an array',
        code: 'INVALID_TAGS'
      });
    }

    const trackedTags = await Tag.trackUsage(req.user._id, tags);
    res.json({ tags: trackedTags });
  } catch (error) {
    attachError(req, error, { operation: 'tags_track' });
    res.status(500).json({
      error: 'Failed to track tags',
      code: 'TAG_TRACK_ERROR'
    });
  }
});

/**
 * POST /tags/rename
 * Rename a tag (updates tag name and all items using it)
 */
router.post('/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({
        error: 'Both oldName and newName are required',
        code: 'NAMES_REQUIRED'
      });
    }

    const normalizedOld = oldName.trim().toLowerCase();
    const normalizedNew = newName.trim().toLowerCase();

    // Rename the tag
    const tag = await Tag.renameTag(req.user._id, normalizedOld, normalizedNew);

    if (!tag) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Update all notes with this tag
    await Note.updateMany(
      { userId: req.user._id, tags: normalizedOld },
      { $set: { 'tags.$[elem]': normalizedNew } },
      { arrayFilters: [{ elem: normalizedOld }] }
    );

    // Update all tasks with this tag
    await Task.updateMany(
      { userId: req.user._id, tags: normalizedOld },
      { $set: { 'tags.$[elem]': normalizedNew } },
      { arrayFilters: [{ elem: normalizedOld }] }
    );

    // Log successful tag rename
    req.entityIds.tagName = normalizedNew;
    req.eventName = 'tag.rename.success';

    res.json({ tag });
  } catch (error) {
    attachError(req, error, { operation: 'tag_rename' });
    res.status(500).json({
      error: error.message || 'Failed to rename tag',
      code: 'TAG_RENAME_ERROR'
    });
  }
});

/**
 * POST /tags/merge
 * Merge multiple tags into one
 */
router.post('/merge', async (req, res) => {
  try {
    const { sourceTags, targetTag } = req.body;

    if (!Array.isArray(sourceTags) || sourceTags.length === 0 || !targetTag) {
      return res.status(400).json({
        error: 'sourceTags array and targetTag are required',
        code: 'MERGE_PARAMS_REQUIRED'
      });
    }

    const normalizedTarget = targetTag.trim().toLowerCase();
    const normalizedSources = sourceTags.map(t => t.trim().toLowerCase());

    // Merge the tags in the Tag collection
    const result = await Tag.mergeTags(req.user._id, normalizedSources, normalizedTarget);

    // Update notes - replace source tags with target tag
    for (const sourceTag of normalizedSources) {
      await Note.updateMany(
        { userId: req.user._id, tags: sourceTag },
        {
          $addToSet: { tags: normalizedTarget },
          $pull: { tags: sourceTag }
        }
      );
    }

    // Update tasks - replace source tags with target tag
    for (const sourceTag of normalizedSources) {
      await Task.updateMany(
        { userId: req.user._id, tags: sourceTag },
        {
          $addToSet: { tags: normalizedTarget },
          $pull: { tags: sourceTag }
        }
      );
    }

    // Log successful tag merge
    req.entityIds.tagName = normalizedTarget;
    req.eventName = 'tag.merge.success';

    res.json({
      success: true,
      targetTag: result.targetTag,
      mergedCount: result.mergedCount
    });
  } catch (error) {
    attachError(req, error, { operation: 'tags_merge' });
    res.status(500).json({
      error: 'Failed to merge tags',
      code: 'TAG_MERGE_ERROR'
    });
  }
});

/**
 * PATCH /tags/:name
 * Update a tag (color, isActive status)
 */
router.patch('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { color, isActive } = req.body;

    const updates = {};
    if (color !== undefined) updates.color = color;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid update fields provided',
        code: 'NO_UPDATES'
      });
    }

    const tag = await Tag.findOneAndUpdate(
      { userId: req.user._id, name: name.toLowerCase() },
      { $set: updates },
      { new: true }
    );

    if (!tag) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Log successful tag update
    req.entityIds.tagName = name.toLowerCase();
    req.eventName = 'tag.update.success';

    res.json({ tag });
  } catch (error) {
    attachError(req, error, { operation: 'tag_update', tagName: req.params.name });
    res.status(500).json({
      error: 'Failed to update tag',
      code: 'TAG_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /tags/:name
 * Delete a tag completely (also removes from all items)
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const normalizedName = name.toLowerCase();

    const result = await Tag.deleteOne({
      userId: req.user._id,
      name: normalizedName
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Remove tag from all notes
    await Note.updateMany(
      { userId: req.user._id, tags: normalizedName },
      { $pull: { tags: normalizedName } }
    );

    // Remove tag from all tasks
    await Task.updateMany(
      { userId: req.user._id, tags: normalizedName },
      { $pull: { tags: normalizedName } }
    );

    // Log successful tag deletion
    req.entityIds.tagName = normalizedName;
    req.eventName = 'tag.delete.success';

    res.json({ success: true });
  } catch (error) {
    attachError(req, error, { operation: 'tag_delete', tagName: req.params.name });
    res.status(500).json({
      error: 'Failed to delete tag',
      code: 'TAG_DELETE_ERROR'
    });
  }
});

export default router;
