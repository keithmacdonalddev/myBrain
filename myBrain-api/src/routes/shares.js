import express from 'express';
import { attachError } from '../middleware/errorHandler.js';
import * as shareService from '../services/shareService.js';

const router = express.Router();

/**
 * GET /share/:token
 * Get shared file info (public endpoint)
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const fileInfo = await shareService.getPublicFileInfo(token);

    if (!fileInfo) {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND',
      });
    }

    res.json(fileInfo);
  } catch (error) {
    attachError(req, error, { operation: 'share_get_info' });
    res.status(500).json({
      error: 'Failed to get share info',
      code: 'GET_SHARE_ERROR',
    });
  }
});

/**
 * POST /share/:token/verify
 * Verify password for password-protected share
 */
router.post('/:token/verify', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required',
        code: 'PASSWORD_REQUIRED',
      });
    }

    const result = await shareService.verifyShareAccess(token, { password });

    if (!result.valid) {
      return res.status(result.needsPassword ? 401 : 403).json({
        error: result.error || 'Invalid password',
        code: result.needsPassword ? 'PASSWORD_REQUIRED' : 'INVALID_PASSWORD',
      });
    }

    // Return verification success (don't include file yet - they need to request download)
    res.json({
      verified: true,
      filename: result.file.originalName,
      size: result.file.size,
      mimeType: result.file.mimeType,
    });
  } catch (error) {
    attachError(req, error, { operation: 'share_verify' });
    res.status(500).json({
      error: 'Failed to verify share',
      code: 'VERIFY_SHARE_ERROR',
    });
  }
});

/**
 * GET /share/:token/download
 * Get download URL for shared file
 */
router.get('/:token/download', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    // Get access info from request
    const accessInfo = {
      password,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    // If user is authenticated, include their ID
    if (req.user) {
      accessInfo.userId = req.user._id;
    }

    const downloadInfo = await shareService.accessShare(token, accessInfo);

    res.json(downloadInfo);
  } catch (error) {
    attachError(req, error, { operation: 'share_download' });

    // Handle specific errors
    if (error.message === 'Invalid share' || error.message === 'Share not found') {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND',
      });
    }

    if (error.message === 'Invalid password') {
      return res.status(401).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD',
        needsPassword: true,
      });
    }

    if (error.message === 'Download not permitted for this share') {
      return res.status(403).json({
        error: error.message,
        code: 'DOWNLOAD_NOT_PERMITTED',
      });
    }

    if (error.message.includes('access')) {
      return res.status(403).json({
        error: error.message,
        code: 'ACCESS_DENIED',
      });
    }

    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * GET /share/:token/preview
 * Get preview info for shared file (for inline viewing)
 */
router.get('/:token/preview', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const result = await shareService.verifyShareAccess(token, { password });

    if (!result.valid) {
      return res.status(result.needsPassword ? 401 : 403).json({
        error: result.error || 'Access denied',
        code: result.needsPassword ? 'PASSWORD_REQUIRED' : 'ACCESS_DENIED',
        needsPassword: result.needsPassword,
      });
    }

    const { file, share } = result;

    // Return preview info
    res.json({
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      fileCategory: file.fileCategory,
      thumbnailUrl: file.thumbnailUrl,
      previewUrl: file.previewUrl,
      width: file.width,
      height: file.height,
      permissions: share.permissions,
    });
  } catch (error) {
    attachError(req, error, { operation: 'share_preview' });
    res.status(500).json({
      error: 'Failed to get preview',
      code: 'PREVIEW_ERROR',
    });
  }
});

export default router;
