import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { requireFeature } from '../middleware/featureGate.js';
import * as folderService from '../services/folderService.js';
import limitService from '../services/limitService.js';

const router = express.Router();

/**
 * Middleware to validate ObjectId
 */
function validateId(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        error: `Invalid ${paramName}`,
        code: 'INVALID_ID',
      });
    }
    next();
  };
}

// ============================================
// FOLDER LISTING ROUTES
// ============================================

/**
 * GET /folders
 * List user's folders
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { parentId, includeTrashed, folderType } = req.query;

    const folders = await folderService.getFolders(req.user._id, {
      parentId: parentId === 'null' ? null : parentId,
      includeTrashed: includeTrashed === 'true',
      folderType,
    });

    res.json({ folders });
  } catch (error) {
    attachError(req, error, { operation: 'folders_fetch' });
    res.status(500).json({
      error: 'Failed to get folders',
      code: 'GET_FOLDERS_ERROR',
    });
  }
});

/**
 * GET /folders/tree
 * Get full folder tree for a user
 */
router.get('/tree', requireAuth, async (req, res) => {
  try {
    const { includeTrashed, maxDepth } = req.query;

    const tree = await folderService.getFolderTree(req.user._id, {
      includeTrashed: includeTrashed === 'true',
      maxDepth: maxDepth ? parseInt(maxDepth, 10) : 10,
    });

    res.json({ tree });
  } catch (error) {
    attachError(req, error, { operation: 'folders_tree' });
    res.status(500).json({
      error: 'Failed to get folder tree',
      code: 'GET_TREE_ERROR',
    });
  }
});

/**
 * GET /folders/trash
 * Get trashed folders
 */
router.get('/trash', requireAuth, async (req, res) => {
  try {
    const folders = await folderService.getTrashedFolders(req.user._id);
    res.json({ folders });
  } catch (error) {
    attachError(req, error, { operation: 'folders_trash' });
    res.status(500).json({
      error: 'Failed to get trashed folders',
      code: 'GET_TRASH_ERROR',
    });
  }
});

// ============================================
// SINGLE FOLDER ROUTES
// ============================================

/**
 * GET /folders/:id
 * Get a single folder with its contents
 */
router.get('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const { sort = '-createdAt', limit = 50, skip = 0 } = req.query;

    const result = await folderService.getFolderWithContents(
      req.params.id,
      req.user._id,
      {
        sort,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      }
    );

    if (!result.folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'folder_fetch', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to get folder',
      code: 'GET_FOLDER_ERROR',
    });
  }
});

/**
 * GET /folders/:id/breadcrumb
 * Get breadcrumb path for a folder
 */
router.get('/:id/breadcrumb', requireAuth, validateId(), async (req, res) => {
  try {
    const breadcrumb = await folderService.getBreadcrumb(req.params.id);
    res.json({ breadcrumb });
  } catch (error) {
    attachError(req, error, { operation: 'folder_breadcrumb', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to get breadcrumb',
      code: 'GET_BREADCRUMB_ERROR',
    });
  }
});

/**
 * GET /folders/:id/stats
 * Get folder statistics
 */
router.get('/:id/stats', requireAuth, validateId(), async (req, res) => {
  try {
    const stats = await folderService.getFolderStats(req.params.id, req.user._id);

    if (!stats) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json(stats);
  } catch (error) {
    attachError(req, error, { operation: 'folder_stats', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to get folder stats',
      code: 'GET_STATS_ERROR',
    });
  }
});

// ============================================
// FOLDER CREATION & MODIFICATION
// ============================================

/**
 * POST /folders
 * Create a new folder
 */
router.post('/', requireAuth, requireFeature('filesEnabled'), async (req, res) => {
  try {
    // Check folder limit
    const limitCheck = await limitService.canCreateFolder(req.user);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'FOLDER_LIMIT_EXCEEDED',
      });
    }

    const { name, parentId, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Folder name is required',
        code: 'NAME_REQUIRED',
      });
    }

    const folder = await folderService.createFolder(req.user._id, {
      name: name.trim(),
      parentId: parentId || null,
      color,
      icon,
    });

    res.status(201).json({ folder });
  } catch (error) {
    attachError(req, error, { operation: 'folder_create' });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to create folder',
      code: 'CREATE_FOLDER_ERROR',
    });
  }
});

/**
 * PATCH /folders/:id
 * Update a folder
 */
router.patch('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const { name, color, icon } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        error: 'Folder name cannot be empty',
        code: 'NAME_REQUIRED',
      });
    }

    const folder = await folderService.updateFolder(req.params.id, req.user._id, {
      name: name?.trim(),
      color,
      icon,
    });

    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json({ folder });
  } catch (error) {
    attachError(req, error, { operation: 'folder_update', folderId: req.params.id });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to update folder',
      code: 'UPDATE_FOLDER_ERROR',
    });
  }
});

// ============================================
// FOLDER ACTIONS
// ============================================

/**
 * POST /folders/:id/move
 * Move a folder to a new parent
 */
router.post('/:id/move', requireAuth, validateId(), async (req, res) => {
  try {
    const { parentId } = req.body;

    // Validate parentId if provided
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({
        error: 'Invalid parent folder ID',
        code: 'INVALID_PARENT_ID',
      });
    }

    const folder = await folderService.moveFolder(
      req.params.id,
      parentId || null,
      req.user._id
    );

    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json({ folder });
  } catch (error) {
    attachError(req, error, { operation: 'folder_move', folderId: req.params.id });

    if (error.message.includes('Cannot move')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_MOVE',
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to move folder',
      code: 'MOVE_FOLDER_ERROR',
    });
  }
});

/**
 * POST /folders/:id/trash
 * Move folder to trash
 */
router.post('/:id/trash', requireAuth, validateId(), async (req, res) => {
  try {
    const folder = await folderService.trashFolder(req.params.id, req.user._id);

    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json({ message: 'Folder moved to trash', folder });
  } catch (error) {
    attachError(req, error, { operation: 'folder_trash', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash folder',
      code: 'TRASH_FOLDER_ERROR',
    });
  }
});

/**
 * POST /folders/:id/restore
 * Restore folder from trash
 */
router.post('/:id/restore', requireAuth, validateId(), async (req, res) => {
  try {
    const folder = await folderService.restoreFolder(req.params.id, req.user._id);

    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found in trash',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json({ message: 'Folder restored', folder });
  } catch (error) {
    attachError(req, error, { operation: 'folder_restore', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore folder',
      code: 'RESTORE_FOLDER_ERROR',
    });
  }
});

/**
 * DELETE /folders/:id
 * Permanently delete a folder and all contents
 */
router.delete('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const result = await folderService.deleteFolder(req.params.id, req.user._id);

    if (!result.deleted) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    res.json({
      message: 'Folder deleted permanently',
      filesDeleted: result.filesDeleted,
      subfoldersDeleted: result.subfoldersDeleted,
    });
  } catch (error) {
    attachError(req, error, { operation: 'folder_delete', folderId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete folder',
      code: 'DELETE_FOLDER_ERROR',
    });
  }
});

export default router;
