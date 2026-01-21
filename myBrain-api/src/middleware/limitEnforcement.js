/**
 * =============================================================================
 * LIMITENFORCEMENT.JS - Resource Limit Checking Middleware
 * =============================================================================
 *
 * This file provides middleware for enforcing usage limits based on user roles.
 * It prevents users from exceeding their quota for notes, tasks, images, etc.
 *
 * WHAT ARE RESOURCE LIMITS?
 * -------------------------
 * Resource limits are restrictions on how many items a user can create.
 * Different user tiers (free, premium, admin) have different limits.
 *
 * EXAMPLES:
 * - Free users: 100 notes, 500 tasks, 10 projects
 * - Premium users: 10,000 notes, unlimited tasks, 100 projects
 * - Admin users: Unlimited everything
 *
 * WHY HAVE LIMITS?
 * ----------------
 * 1. BUSINESS MODEL: Encourage upgrades to premium
 * 2. RESOURCES: Prevent database/storage overload
 * 3. FAIR USE: Ensure resources are available for all users
 * 4. ABUSE PREVENTION: Stop bots/spam from creating unlimited content
 *
 * HOW IT WORKS:
 * -------------
 * 1. Middleware checks user's current usage vs their limit
 * 2. If under limit → allow the request
 * 3. If at/over limit → return 403 error with details
 *
 * LIMIT TYPES SUPPORTED:
 * ----------------------
 * - notes: Total notes allowed
 * - tasks: Total tasks allowed
 * - projects: Total projects allowed
 * - events: Total calendar events allowed
 * - images: Total images allowed (plus storage limits)
 * - categories: Total life areas/categories allowed
 *
 * IMAGE STORAGE LIMITS:
 * ---------------------
 * Images have two types of limits:
 * 1. COUNT: Maximum number of images
 * 2. STORAGE: Maximum total storage (e.g., 100MB for free, 10GB for premium)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * limitService handles all the logic for checking limits.
 * It queries the database to get current usage and compares to configured limits.
 */
import limitService from '../services/limitService.js';

// =============================================================================
// REQUIRE LIMIT MIDDLEWARE FACTORY
// =============================================================================

/**
 * requireLimit(resourceType)
 * --------------------------
 * Middleware factory that creates a middleware to check resource limits.
 *
 * @param {string} resourceType - Type of resource to check
 *   - 'notes': Check note creation limit
 *   - 'tasks': Check task creation limit
 *   - 'projects': Check project creation limit
 *   - 'events': Check event creation limit
 *   - 'images': Check image count limit
 *   - 'categories': Check category creation limit
 *
 * @returns {Function} Express middleware function
 *
 * USAGE:
 * // Protect note creation
 * router.post('/notes', requireAuth, requireLimit('notes'), createNote);
 *
 * // Protect task creation
 * router.post('/tasks', requireAuth, requireLimit('tasks'), createTask);
 *
 * RESPONSE ON LIMIT EXCEEDED:
 * {
 *   error: "You have reached your notes limit (100). Upgrade to create more.",
 *   code: "LIMIT_EXCEEDED",
 *   limitType: "notes",
 *   current: 100,
 *   max: 100,
 *   requestId: "req_xxx"
 * }
 */
export function requireLimit(resourceType) {
  return async (req, res, next) => {
    try {
      // =====================================================
      // CHECK AUTHENTICATION
      // =====================================================
      // User should already be attached by requireAuth middleware

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId: req.requestId
        });
      }

      // =====================================================
      // CHECK IF USER CAN CREATE
      // =====================================================
      // limitService.canCreate returns:
      // {
      //   allowed: true/false,
      //   message: "...",     // Only if not allowed
      //   current: 50,        // Current usage
      //   max: 100            // Maximum allowed
      // }

      const result = await limitService.canCreate(req.user, resourceType);

      if (!result.allowed) {
        // User has reached their limit
        return res.status(403).json({
          error: result.message,
          code: 'LIMIT_EXCEEDED',
          limitType: resourceType,
          current: result.current,
          max: result.max,
          requestId: req.requestId
        });
      }

      // =====================================================
      // ATTACH LIMIT INFO AND CONTINUE
      // =====================================================
      // Attach limit info to request for use in route handler if needed
      // E.g., to show "You've used 50 of 100 notes"

      req.limitInfo = result;

      next();
    } catch (error) {
      // Log error for debugging
      console.error(`[LimitEnforcement] Error checking ${resourceType} limit:`, error);

      // On error, ALLOW the operation to prevent blocking users
      // Better to let some requests through than to block everyone
      next();
    }
  };
}

// =============================================================================
// REQUIRE STORAGE LIMIT MIDDLEWARE
// =============================================================================

/**
 * requireStorageLimit(req, res, next)
 * -----------------------------------
 * Middleware to check image upload limits (both count AND storage).
 * Should be used AFTER multer middleware processes the file.
 *
 * @param {Request} req - Express request object
 *   - req.user: Authenticated user (from requireAuth)
 *   - req.file: Uploaded file (from multer)
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * CHECKS PERFORMED:
 * 1. Image count limit (e.g., max 500 images)
 * 2. Storage limit (e.g., max 100MB total)
 *
 * USAGE:
 * router.post('/images',
 *   requireAuth,
 *   uploadSingle,           // multer middleware
 *   requireStorageLimit,    // this middleware
 *   handleImageUpload
 * );
 *
 * RESPONSE ON LIMIT EXCEEDED:
 * {
 *   error: "You have exceeded your storage limit",
 *   code: "LIMIT_EXCEEDED",
 *   limitType: "STORAGE",  // or "IMAGE_COUNT"
 *   currentBytes: 104857600,
 *   maxBytes: 104857600,
 *   currentCount: 500,
 *   maxCount: 500,
 *   requestId: "req_xxx"
 * }
 */
export async function requireStorageLimit(req, res, next) {
  try {
    // =====================================================
    // CHECK AUTHENTICATION
    // =====================================================

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId: req.requestId
      });
    }

    // =====================================================
    // CHECK IF FILE EXISTS
    // =====================================================
    // File should be attached by multer middleware

    const file = req.file;
    if (!file) {
      // No file to check - maybe optional upload
      return next();
    }

    // =====================================================
    // CHECK STORAGE LIMITS
    // =====================================================
    // limitService.canUploadImage checks:
    // 1. Would this upload exceed image count limit?
    // 2. Would this upload exceed storage limit?

    const result = await limitService.canUploadImage(req.user, file.size);

    if (!result.allowed) {
      // User has reached a limit
      return res.status(403).json({
        error: result.message,
        code: 'LIMIT_EXCEEDED',
        limitType: result.reason || 'STORAGE',  // 'IMAGE_COUNT' or 'STORAGE'
        currentBytes: result.currentBytes,
        maxBytes: result.maxBytes,
        currentCount: result.currentCount,
        maxCount: result.maxCount,
        requestId: req.requestId
      });
    }

    // =====================================================
    // ATTACH LIMIT INFO AND CONTINUE
    // =====================================================

    req.storageLimitInfo = result;

    next();
  } catch (error) {
    console.error('[LimitEnforcement] Error checking storage limit:', error);

    // On error, allow the operation
    next();
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * requireCategoryLimit
 * --------------------
 * Pre-configured middleware for checking category limits.
 * Same as requireLimit('categories').
 *
 * USAGE:
 * router.post('/categories', requireAuth, requireCategoryLimit, createCategory);
 */
export const requireCategoryLimit = requireLimit('categories');

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all limit enforcement utilities.
 *
 * USAGE:
 * import { requireLimit, requireStorageLimit } from './middleware/limitEnforcement.js';
 *
 * // Check notes limit
 * router.post('/notes', requireAuth, requireLimit('notes'), createNote);
 *
 * // Check image storage limit
 * router.post('/images', requireAuth, uploadSingle, requireStorageLimit, uploadImage);
 */
export default {
  requireLimit,
  requireStorageLimit,
  requireCategoryLimit
};
