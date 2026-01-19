import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import SidebarConfig from '../models/SidebarConfig.js';

const router = express.Router();

// All settings routes require auth
router.use(requireAuth);

/**
 * GET /settings/sidebar
 * Get sidebar configuration for authenticated users
 */
router.get('/sidebar', async (req, res) => {
  try {
    const config = await SidebarConfig.getConfig();
    res.json(config.toSafeJSON());
  } catch (error) {
    attachError(req, error, { operation: 'sidebar_config_fetch' });
    res.status(500).json({
      error: 'Failed to fetch sidebar configuration',
      code: 'SIDEBAR_CONFIG_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

export default router;
