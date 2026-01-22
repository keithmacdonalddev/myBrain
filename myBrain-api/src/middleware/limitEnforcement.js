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
 * requireLimit(resourceType) - Middleware Factory for Resource Limits
 * ====================================================================
 * This middleware factory creates a middleware that enforces usage limits
 * based on the user's role/subscription tier. It prevents free users from
 * creating unlimited content and encourages upgrades to paid plans.
 *
 * WHAT ARE RESOURCE LIMITS?
 * -------------------------
 * Resource limits are quotas on how much users can create. Different user
 * tiers have different limits:
 * - Free: 100 notes, 500 tasks, 10 projects
 * - Premium: 10,000 notes, unlimited tasks, 100 projects
 * - Admin: Unlimited everything
 *
 * WHY HAVE LIMITS?
 * ----------------
 * 1. BUSINESS MODEL: Encourage users to upgrade to premium
 * 2. RESOURCE MANAGEMENT: Prevent database bloat from single users
 * 3. FAIR USE: Ensure resources available for all users
 * 4. ABUSE PREVENTION: Stop bots from creating unlimited spam
 *
 * SUPPORTED RESOURCE TYPES:
 * -------------------------
 * - 'notes': Total notes allowed
 * - 'tasks': Total tasks allowed
 * - 'projects': Total projects allowed
 * - 'events': Total calendar events allowed
 * - 'images': Total images allowed
 * - 'categories': Total life areas allowed
 *
 * HOW IT WORKS:
 * 1. User tries to create a note
 * 2. requireLimit('notes') middleware runs
 * 3. Checks: Does user have limit on notes? (some roles unlimited)
 * 4. Counts: How many notes does user currently have?
 * 5. Compares: current + 1 <= max?
 * 6. Result: Allow or block with friendly message
 *
 * @param {string} resourceType - Which resource to limit
 *   Common types: 'notes', 'tasks', 'projects', 'events', 'images'
 *
 * @returns {Function} Express middleware function
 *
 * ATTACHES TO REQUEST:
 * - req.limitInfo: Object with allowed, current, max
 *   Used by route handler if needed
 *
 * ERROR RESPONSES:
 * - 401 AUTH_REQUIRED: User not authenticated (shouldn't happen after requireAuth)
 * - 403 LIMIT_EXCEEDED: User has reached limit, message explains why
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Protect note creation with limit
 * router.post('/notes',
 *   requireAuth,              // User must be logged in
 *   requireLimit('notes'),    // Check note limit
 *   createNote                // Only runs if under limit
 * );
 *
 * // Protect task creation
 * router.post('/tasks',
 *   requireAuth,
 *   requireLimit('tasks'),    // Check task limit
 *   createTask
 * );
 *
 * // Multiple resources in one request
 * router.post('/projects',
 *   requireAuth,
 *   requireLimit('projects'), // Check project limit
 *   async (req, res) => {
 *     // Inside handler, use req.limitInfo:
 *     console.log(req.limitInfo.current); // 5 of 10 projects
 *     ...
 *   }
 * );
 * ```
 *
 * RESPONSE WHEN LIMIT EXCEEDED:
 * ```json
 * {
 *   "error": "You have reached your notes limit (100). Upgrade to create more.",
 *   "code": "LIMIT_EXCEEDED",
 *   "limitType": "notes",
 *   "current": 100,
 *   "max": 100,
 *   "requestId": "req_abc123"
 * }
 * ```
 */
export function requireLimit(resourceType) {
  return async (req, res, next) => {
    try {
      // =========================================================================
      // CHECK 1: IS USER AUTHENTICATED?
      // =========================================================================
      // User should already be attached by requireAuth middleware
      // (This middleware should always run after requireAuth)

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId: req.requestId
        });
      }

      // =========================================================================
      // CHECK 2: CAN USER CREATE THIS RESOURCE?
      // =========================================================================
      // Call limitService.canCreate() to check if user is under their limit
      // This function:
      // 1. Gets user's role/tier
      // 2. Looks up limit for that resource type
      // 3. Counts current usage
      // 4. Compares: current + 1 <= limit?
      //
      // Returns: { allowed: true/false, message: "...", current: N, max: N }

      const result = await limitService.canCreate(req.user, resourceType);

      // =========================================================================
      // CHECK 3: IS USER UNDER LIMIT?
      // =========================================================================
      // If not allowed, send 403 Forbidden with helpful message

      if (!result.allowed) {
        // User has reached their limit
        // Send friendly message explaining why and how to fix it
        return res.status(403).json({
          error: result.message,           // "You have reached your notes limit (100)..."
          code: 'LIMIT_EXCEEDED',
          limitType: resourceType,         // Which resource type
          current: result.current,         // How many they have
          max: result.max,                 // What their max is
          requestId: req.requestId
        });
      }

      // =========================================================================
      // ATTACH LIMIT INFO TO REQUEST
      // =========================================================================
      // Route handler might want to access this info
      // E.g., to show "You've used 5 of 10 projects"

      req.limitInfo = result;

      // =========================================================================
      // USER IS UNDER LIMIT - CONTINUE
      // =========================================================================
      // All checks passed, user can create this resource

      next();

    } catch (error) {
      // =========================================================================
      // ERROR HANDLING
      // =========================================================================
      // If limit check fails (database error, service down, etc.),
      // log it but ALLOW the operation.
      //
      // Philosophy: Better to let users through than block them on a config error.
      // The alternative would be blocking everyone when the limit service breaks.

      console.error(`[LimitEnforcement] Error checking ${resourceType} limit:`, error);

      // Allow the operation despite error
      next();
    }
  };
}

// =============================================================================
// REQUIRE STORAGE LIMIT MIDDLEWARE
// =============================================================================

/**
 * requireStorageLimit(req, res, next) - Check Image Storage Limits
 * ==================================================================
 * This middleware checks image upload limits before accepting the file.
 * It enforces both image COUNT limits (max 500 images) and STORAGE limits
 * (max 100MB total).
 *
 * WHAT ARE IMAGE LIMITS?
 * ----------------------
 * Images have TWO types of limits:
 *
 * 1. IMAGE COUNT LIMIT
 *    - Maximum number of images user can upload
 *    - Free: 100 images max
 *    - Premium: 1000 images max
 *    - Admin: Unlimited
 *
 * 2. STORAGE LIMIT
 *    - Maximum total storage user can use
 *    - Free: 100MB max
 *    - Premium: 10GB max
 *    - Admin: Unlimited
 *
 * Both limits must be respected. User can hit either one first.
 *
 * MIDDLEWARE ORDER:
 * ----------------
 * Important: This middleware must run AFTER multer middleware:
 *
 * router.post('/images',
 *   requireAuth,            // 1. Verify user is logged in
 *   uploadSingle,           // 2. Multer processes the file (req.file is set)
 *   requireStorageLimit,    // 3. Check limits AFTER file is uploaded
 *   saveImageToDB           // 4. Only runs if limits passed
 * );
 *
 * WHY AFTER MULTER?
 * - Multer provides req.file.size (file size in bytes)
 * - We need file.size to check storage limit
 * - If we check before multer, req.file doesn't exist yet
 *
 * @param {Request} req - Express request object
 *   - req.user: Authenticated user (from requireAuth)
 *   - req.file: Uploaded file from multer
 *     - req.file.buffer: File data in memory
 *     - req.file.size: File size in bytes
 *     - req.file.originalname: Original filename
 *
 * @param {Response} res - Express response object
 *
 * @param {Function} next - Express next function
 *
 * CHECKS PERFORMED:
 * 1. Is user authenticated?
 * 2. Was a file actually uploaded?
 * 3. Does user have image count limit?
 * 4. Does this upload exceed count limit?
 * 5. Does user have storage limit?
 * 6. Does this upload exceed storage limit?
 *
 * ERROR RESPONSES:
 * - 401 AUTH_REQUIRED: Not authenticated
 * - 403 LIMIT_EXCEEDED: Hit count or storage limit
 *
 * RESPONSE WHEN LIMIT EXCEEDED:
 * ```json
 * {
 *   "error": "You have exceeded your storage limit. You're using 100MB of 100MB allowed.",
 *   "code": "LIMIT_EXCEEDED",
 *   "limitType": "STORAGE",  // or "IMAGE_COUNT"
 *   "currentBytes": 104857600,      // Current storage in bytes
 *   "maxBytes": 104857600,          // Max storage in bytes
 *   "currentCount": 100,            // Number of images
 *   "maxCount": 100,                // Max images allowed
 *   "requestId": "req_abc123"
 * }
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * router.post('/images/upload',
 *   requireAuth,              // User must be logged in
 *   uploadSingle,             // Multer processes file
 *   requireStorageLimit,      // Check storage limits
 *   async (req, res) => {
 *     // Only reaches here if:
 *     // 1. User authenticated
 *     // 2. File uploaded successfully
 *     // 3. User under both count and storage limits
 *
 *     const image = await Image.create({
 *       userId: req.user._id,
 *       filename: req.file.originalname,
 *       size: req.file.size,
 *       data: req.file.buffer
 *     });
 *
 *     res.json({ image });
 *   }
 * );
 * ```
 */
export async function requireStorageLimit(req, res, next) {
  try {
    // =========================================================================
    // CHECK 1: IS USER AUTHENTICATED?
    // =========================================================================

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId: req.requestId
      });
    }

    // =========================================================================
    // CHECK 2: WAS A FILE ACTUALLY UPLOADED?
    // =========================================================================
    // req.file is set by multer middleware if upload succeeded
    // If no file, maybe it's optional (some forms have optional uploads)

    const file = req.file;
    if (!file) {
      // No file uploaded - might be optional
      // Continue without checking limits
      return next();
    }

    // =========================================================================
    // CHECK 3 & 4: CAN USER UPLOAD THIS FILE?
    // =========================================================================
    // limitService.canUploadImage checks:
    // 1. Would this upload exceed image count limit?
    // 2. Would this upload exceed storage limit?
    //
    // Returns:
    // {
    //   allowed: true/false,
    //   message: "...",        // Only if not allowed
    //   reason: 'IMAGE_COUNT' or 'STORAGE' or null,
    //   currentBytes: N,
    //   maxBytes: N,
    //   currentCount: N,
    //   maxCount: N
    // }

    const result = await limitService.canUploadImage(req.user, file.size);

    // =========================================================================
    // CHECK 5: IS UPLOAD ALLOWED?
    // =========================================================================

    if (!result.allowed) {
      // User has reached one of their limits
      // Send detailed response showing which limit and current usage
      return res.status(403).json({
        error: result.message,
        code: 'LIMIT_EXCEEDED',
        limitType: result.reason || 'STORAGE',  // Which limit hit: 'IMAGE_COUNT' or 'STORAGE'
        currentBytes: result.currentBytes,      // Current storage in bytes
        maxBytes: result.maxBytes,              // Max storage in bytes
        currentCount: result.currentCount,      // Number of images user has
        maxCount: result.maxCount,              // Max images allowed
        requestId: req.requestId
      });
    }

    // =========================================================================
    // ATTACH LIMIT INFO TO REQUEST
    // =========================================================================
    // Route handler might want to use this info
    // E.g., to show "You're using 50MB of 100MB storage"

    req.storageLimitInfo = result;

    // =========================================================================
    // USER CAN UPLOAD - CONTINUE
    // =========================================================================
    // All limits checked and passed, proceed to next middleware

    next();

  } catch (error) {
    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    // If limit check fails, allow upload to proceed
    // Better to let it through than block on a config error

    console.error('[LimitEnforcement] Error checking storage limit:', error);

    // Allow the operation
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
