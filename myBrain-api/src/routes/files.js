import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { requireFeature } from '../middleware/featureGate.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import * as fileService from '../services/fileService.js';
import * as shareService from '../services/shareService.js';
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

/**
 * Middleware to check file upload limits
 */
async function checkFileUploadLimit(req, res, next) {
  if (!req.file) return next();

  try {
    const extension = path.extname(req.file.originalname).toLowerCase();
    const limitCheck = await limitService.canUploadFile(
      req.user,
      req.file.size,
      req.file.mimetype,
      extension
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: limitCheck.reason || 'LIMIT_EXCEEDED',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// FILE LISTING & SEARCH ROUTES
// ============================================

/**
 * GET /files
 * List user's files with filtering and sorting
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      folderId,
      fileCategory,
      favorite,
      tags,
      q,
      sort = '-createdAt',
      page = 1,
      limit = 50,
    } = req.query;

    const result = await fileService.getFiles(req.user._id, {
      folderId: folderId === 'null' ? null : folderId,
      fileCategory,
      favorite,
      tags,
      q,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_fetch' });
    res.status(500).json({
      error: 'Failed to get files',
      code: 'GET_FILES_ERROR',
    });
  }
});

/**
 * GET /files/search
 * Search files by text
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const {
      q,
      fileCategory,
      tags,
      favorite,
      sort = '-createdAt',
      limit = 50,
      page = 1,
    } = req.query;

    const result = await fileService.getFiles(req.user._id, {
      q,
      fileCategory,
      tags,
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : null,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_search' });
    res.status(500).json({
      error: 'Failed to search files',
      code: 'SEARCH_FILES_ERROR',
    });
  }
});

/**
 * GET /files/recent
 * Get recently accessed files
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const files = await fileService.getRecentFiles(req.user._id, parseInt(limit, 10));
    res.json({ files });
  } catch (error) {
    attachError(req, error, { operation: 'files_recent' });
    res.status(500).json({
      error: 'Failed to get recent files',
      code: 'GET_RECENT_ERROR',
    });
  }
});

/**
 * GET /files/trash
 * Get trashed files
 */
router.get('/trash', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await fileService.getTrashedFiles(req.user._id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_trash' });
    res.status(500).json({
      error: 'Failed to get trashed files',
      code: 'GET_TRASH_ERROR',
    });
  }
});

/**
 * GET /files/stats
 * Get storage statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await fileService.getStorageStats(req.user._id);
    res.json(stats);
  } catch (error) {
    attachError(req, error, { operation: 'files_stats' });
    res.status(500).json({
      error: 'Failed to get storage stats',
      code: 'GET_STATS_ERROR',
    });
  }
});

/**
 * GET /files/tags
 * Get all unique tags for user's files
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    const tags = await fileService.getUserFileTags(req.user._id);
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'files_tags' });
    res.status(500).json({
      error: 'Failed to get file tags',
      code: 'GET_TAGS_ERROR',
    });
  }
});

/**
 * GET /files/limits
 * Get user's file storage limits and usage
 */
router.get('/limits', requireAuth, async (req, res) => {
  try {
    const limitStatus = await limitService.getFileLimitStatus(req.user);
    res.json(limitStatus);
  } catch (error) {
    attachError(req, error, { operation: 'files_limits' });
    res.status(500).json({
      error: 'Failed to get file limits',
      code: 'GET_LIMITS_ERROR',
    });
  }
});

// ============================================
// FILE UPLOAD ROUTES
// ============================================

/**
 * POST /files
 * Upload a file
 */
router.post(
  '/',
  requireAuth,
  requireFeature('filesEnabled'),
  uploadSingle,
  handleUploadError,
  checkFileUploadLimit,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'NO_FILE',
        });
      }

      const { folderId, title, description, tags } = req.body;
      const parsedTags = tags ? JSON.parse(tags) : [];

      const file = await fileService.uploadFile(req.file, req.user._id, {
        folderId: folderId || null,
        title: title || '',
        description: description || '',
        tags: parsedTags,
      });

      res.status(201).json({ file });
    } catch (error) {
      attachError(req, error, { operation: 'file_upload' });
      res.status(500).json({
        error: error.message || 'Failed to upload file',
        code: 'UPLOAD_ERROR',
      });
    }
  }
);

/**
 * POST /files/:id/version
 * Upload a new version of a file
 */
router.post(
  '/:id/version',
  requireAuth,
  requireFeature('filesEnabled'),
  validateId(),
  uploadSingle,
  handleUploadError,
  checkFileUploadLimit,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'NO_FILE',
        });
      }

      const file = await fileService.createFileVersion(req.params.id, req.file, req.user._id);
      res.status(201).json({ file });
    } catch (error) {
      attachError(req, error, { operation: 'file_version', fileId: req.params.id });
      res.status(error.message === 'Original file not found' ? 404 : 500).json({
        error: error.message || 'Failed to create file version',
        code: 'VERSION_ERROR',
      });
    }
  }
);

// ============================================
// SINGLE FILE ROUTES
// ============================================

/**
 * GET /files/:id
 * Get a single file
 */
router.get('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const file = await fileService.getFile(req.params.id, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_fetch', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get file',
      code: 'GET_FILE_ERROR',
    });
  }
});

/**
 * PATCH /files/:id
 * Update file metadata
 */
router.patch('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const { title, description, tags, favorite } = req.body;

    const file = await fileService.updateFile(req.params.id, req.user._id, {
      title,
      description,
      tags,
      favorite,
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_update', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to update file',
      code: 'UPDATE_FILE_ERROR',
    });
  }
});

/**
 * GET /files/:id/download
 * Get download URL for a file
 */
router.get('/:id/download', requireAuth, validateId(), async (req, res) => {
  try {
    const downloadInfo = await fileService.getDownloadUrl(req.params.id, req.user._id);

    if (!downloadInfo) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json(downloadInfo);
  } catch (error) {
    attachError(req, error, { operation: 'file_download', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * GET /files/:id/versions
 * Get version history for a file
 */
router.get('/:id/versions', requireAuth, validateId(), async (req, res) => {
  try {
    const versions = await fileService.getFileVersions(req.params.id, req.user._id);
    res.json({ versions });
  } catch (error) {
    attachError(req, error, { operation: 'file_versions', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get file versions',
      code: 'GET_VERSIONS_ERROR',
    });
  }
});

// ============================================
// FILE ACTIONS
// ============================================

/**
 * POST /files/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', requireAuth, validateId(), async (req, res) => {
  try {
    const file = await fileService.toggleFavorite(req.params.id, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file, favorite: file.favorite });
  } catch (error) {
    attachError(req, error, { operation: 'file_toggle_favorite', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to toggle favorite',
      code: 'TOGGLE_FAVORITE_ERROR',
    });
  }
});

/**
 * POST /files/:id/move
 * Move file to a folder
 */
router.post('/:id/move', requireAuth, validateId(), async (req, res) => {
  try {
    const { folderId } = req.body;

    const file = await fileService.moveFile(req.params.id, folderId || null, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_move', fileId: req.params.id });
    res.status(error.message === 'Target folder not found' ? 404 : 500).json({
      error: error.message || 'Failed to move file',
      code: 'MOVE_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/copy
 * Copy a file
 */
router.post('/:id/copy', requireAuth, requireFeature('filesEnabled'), validateId(), async (req, res) => {
  try {
    const { folderId } = req.body;

    // Check limits before copy
    const limitCheck = await limitService.canCreate(req.user, 'files');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'FILE_LIMIT_EXCEEDED',
      });
    }

    const file = await fileService.copyFile(req.params.id, folderId || null, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.status(201).json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_copy', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to copy file',
      code: 'COPY_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/trash
 * Move file to trash
 */
router.post('/:id/trash', requireAuth, validateId(), async (req, res) => {
  try {
    const file = await fileService.trashFile(req.params.id, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ message: 'File moved to trash', file });
  } catch (error) {
    attachError(req, error, { operation: 'file_trash', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash file',
      code: 'TRASH_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/restore
 * Restore file from trash
 */
router.post('/:id/restore', requireAuth, validateId(), async (req, res) => {
  try {
    const file = await fileService.restoreFile(req.params.id, req.user._id);

    if (!file) {
      return res.status(404).json({
        error: 'File not found in trash',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ message: 'File restored', file });
  } catch (error) {
    attachError(req, error, { operation: 'file_restore', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore file',
      code: 'RESTORE_FILE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id
 * Permanently delete a file
 */
router.delete('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    const result = await fileService.deleteFile(req.params.id, req.user._id);

    if (!result.deleted) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ message: 'File deleted permanently' });
  } catch (error) {
    attachError(req, error, { operation: 'file_delete', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete file',
      code: 'DELETE_FILE_ERROR',
    });
  }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * POST /files/bulk-move
 * Move multiple files to a folder
 */
router.post('/bulk-move', requireAuth, async (req, res) => {
  try {
    const { ids, folderId } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // Validate all IDs
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    const result = await fileService.bulkMoveFiles(ids, folderId || null, req.user._id);
    res.json({ message: `Moved ${result.moved} files`, moved: result.moved });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_move' });
    res.status(500).json({
      error: error.message || 'Failed to move files',
      code: 'BULK_MOVE_ERROR',
    });
  }
});

/**
 * POST /files/bulk-trash
 * Move multiple files to trash
 */
router.post('/bulk-trash', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // Validate all IDs
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    const result = await fileService.bulkTrashFiles(ids, req.user._id);
    res.json({ message: `Trashed ${result.trashed} files`, trashed: result.trashed });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_trash' });
    res.status(500).json({
      error: 'Failed to trash files',
      code: 'BULK_TRASH_ERROR',
    });
  }
});

/**
 * POST /files/bulk-delete
 * Permanently delete multiple files
 */
router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // Validate all IDs
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    const result = await fileService.bulkDeleteFiles(ids, req.user._id);
    res.json({ message: `Deleted ${result.deleted} files`, deleted: result.deleted });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_delete' });
    res.status(500).json({
      error: 'Failed to delete files',
      code: 'BULK_DELETE_ERROR',
    });
  }
});

/**
 * POST /files/empty-trash
 * Empty trash (delete all trashed files)
 */
router.post('/empty-trash', requireAuth, async (req, res) => {
  try {
    const result = await fileService.emptyTrash(req.user._id);
    res.json({ message: `Deleted ${result.deleted} files from trash`, deleted: result.deleted });
  } catch (error) {
    attachError(req, error, { operation: 'files_empty_trash' });
    res.status(500).json({
      error: 'Failed to empty trash',
      code: 'EMPTY_TRASH_ERROR',
    });
  }
});

// ============================================
// SHARING ROUTES
// ============================================

/**
 * GET /files/:id/share
 * Get share settings for a file
 */
router.get('/:id/share', requireAuth, validateId(), async (req, res) => {
  try {
    const shares = await shareService.getFileShares(req.params.id, req.user._id);
    res.json({ shares });
  } catch (error) {
    attachError(req, error, { operation: 'file_get_shares', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to get shares',
      code: 'GET_SHARES_ERROR',
    });
  }
});

/**
 * POST /files/:id/share
 * Create a share link for a file
 */
router.post('/:id/share', requireAuth, requireFeature('filesEnabled'), validateId(), async (req, res) => {
  try {
    // Check share limit
    const limitCheck = await limitService.canCreateShare(req.user);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'SHARE_LIMIT_EXCEEDED',
      });
    }

    const { shareType, expiresIn, password, permissions, maxAccessCount } = req.body;

    const share = await shareService.createShare(req.params.id, req.user._id, {
      shareType,
      expiresIn,
      password,
      permissions,
      maxAccessCount,
    });

    res.status(201).json({ share: share.toPublicJSON(), shareToken: share.shareToken });
  } catch (error) {
    attachError(req, error, { operation: 'file_create_share', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to create share',
      code: 'CREATE_SHARE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id/share
 * Revoke all shares for a file
 */
router.delete('/:id/share', requireAuth, validateId(), async (req, res) => {
  try {
    const count = await shareService.revokeFileShares(req.params.id, req.user._id);
    res.json({ message: `Revoked ${count} share links`, revoked: count });
  } catch (error) {
    attachError(req, error, { operation: 'file_revoke_shares', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to revoke shares',
      code: 'REVOKE_SHARES_ERROR',
    });
  }
});

// ============================================
// ENTITY LINKING ROUTES
// ============================================

/**
 * POST /files/:id/link
 * Link a file to an entity (note, project, task)
 */
router.post('/:id/link', requireAuth, validateId(), async (req, res) => {
  try {
    const { entityId, entityType } = req.body;

    if (!entityId || !entityType) {
      return res.status(400).json({
        error: 'entityId and entityType are required',
        code: 'INVALID_PARAMS',
      });
    }

    if (!['note', 'project', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'entityType must be note, project, or task',
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    const file = await fileService.linkFileToEntity(
      req.params.id,
      entityId,
      entityType,
      req.user._id
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_link', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to link file',
      code: 'LINK_FILE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id/link
 * Unlink a file from an entity
 */
router.delete('/:id/link', requireAuth, validateId(), async (req, res) => {
  try {
    const { entityId, entityType } = req.body;

    if (!entityId || !entityType) {
      return res.status(400).json({
        error: 'entityId and entityType are required',
        code: 'INVALID_PARAMS',
      });
    }

    const file = await fileService.unlinkFileFromEntity(
      req.params.id,
      entityId,
      entityType,
      req.user._id
    );

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_unlink', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to unlink file',
      code: 'UNLINK_FILE_ERROR',
    });
  }
});

/**
 * GET /files/entity/:entityType/:entityId
 * Get files linked to an entity
 */
router.get('/entity/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!['note', 'project', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'entityType must be note, project, or task',
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({
        error: 'Invalid entityId',
        code: 'INVALID_ID',
      });
    }

    const files = await fileService.getFilesForEntity(entityId, entityType, req.user._id);
    res.json({ files });
  } catch (error) {
    attachError(req, error, { operation: 'files_for_entity' });
    res.status(500).json({
      error: error.message || 'Failed to get files',
      code: 'GET_ENTITY_FILES_ERROR',
    });
  }
});

export default router;
