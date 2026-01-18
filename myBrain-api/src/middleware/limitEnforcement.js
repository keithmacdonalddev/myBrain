import limitService from '../services/limitService.js';

/**
 * Middleware factory to check resource creation limits
 * @param {string} resourceType - Type of resource (notes, tasks, projects, events, images, categories)
 * @returns {Function} - Express middleware function
 */
export function requireLimit(resourceType) {
  return async (req, res, next) => {
    try {
      // User should be attached by requireAuth middleware
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId: req.requestId
        });
      }

      const result = await limitService.canCreate(req.user, resourceType);

      if (!result.allowed) {
        return res.status(403).json({
          error: result.message,
          code: 'LIMIT_EXCEEDED',
          limitType: resourceType,
          current: result.current,
          max: result.max,
          requestId: req.requestId
        });
      }

      // Attach limit info to request for potential use in route handler
      req.limitInfo = result;

      next();
    } catch (error) {
      console.error(`[LimitEnforcement] Error checking ${resourceType} limit:`, error);
      // On error, allow the operation to prevent blocking users
      next();
    }
  };
}

/**
 * Middleware to check image upload limits (both count and storage)
 * Should be used after multer processes the file
 */
export async function requireStorageLimit(req, res, next) {
  try {
    // User should be attached by requireAuth middleware
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId: req.requestId
      });
    }

    // File should be attached by multer
    const file = req.file;
    if (!file) {
      // No file to check, continue
      return next();
    }

    const result = await limitService.canUploadImage(req.user, file.size);

    if (!result.allowed) {
      return res.status(403).json({
        error: result.message,
        code: 'LIMIT_EXCEEDED',
        limitType: result.reason || 'STORAGE',
        currentBytes: result.currentBytes,
        maxBytes: result.maxBytes,
        currentCount: result.currentCount,
        maxCount: result.maxCount,
        requestId: req.requestId
      });
    }

    // Attach limit info to request for potential use in route handler
    req.storageLimitInfo = result;

    next();
  } catch (error) {
    console.error('[LimitEnforcement] Error checking storage limit:', error);
    // On error, allow the operation to prevent blocking users
    next();
  }
}

/**
 * Middleware to check category creation limits
 * Same as requireLimit('categories') but with a specific error message
 */
export const requireCategoryLimit = requireLimit('categories');

export default {
  requireLimit,
  requireStorageLimit,
  requireCategoryLimit
};
