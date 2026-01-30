/**
 * =============================================================================
 * BLOCKCHECK.JS - Block Relationship Middleware
 * =============================================================================
 *
 * This middleware provides centralized checking for block relationships between
 * users. It prevents users from interacting with users they've blocked or who
 * have blocked them.
 *
 * WHY THIS MIDDLEWARE?
 * --------------------
 * Many routes need to check block relationships before allowing actions:
 * - Creating messages/conversations
 * - Sharing items
 * - Sending connection requests
 * - Viewing profiles
 *
 * Instead of repeating the same code in every route, this middleware provides
 * a reusable, consistent implementation.
 *
 * BLOCK RELATIONSHIP:
 * -------------------
 * When User A blocks User B:
 * - User A initiated the block (blocker)
 * - User B is blocked (blocked)
 * - Neither can interact with the other
 * - Blocking is one-directional but effects are mutual
 *
 * USAGE:
 * ------
 * There are two ways to use this middleware:
 *
 * 1. Check against a URL parameter:
 *    router.post('/messages/:userId', requireAuth, checkNotBlocked('userId'), handler)
 *
 * 2. Check against a body field:
 *    router.post('/shares', requireAuth, checkNotBlockedBody('recipientId'), handler)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * UserBlock model handles block relationships between users.
 * The hasBlockBetween static method checks if ANY block exists between two users
 * (regardless of who blocked whom).
 */
import UserBlock from '../models/UserBlock.js';

/**
 * mongoose provides ObjectId validation.
 * We validate IDs before database queries.
 */
import mongoose from 'mongoose';

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * checkNotBlocked(paramName) - Check Block Against URL Parameter
 * ===============================================================
 * Factory function that creates middleware to check if current user is blocked
 * by (or has blocked) the user specified in a URL parameter.
 *
 * HOW IT WORKS:
 * 1. Extract target user ID from req.params[paramName]
 * 2. Query UserBlock to check for any block relationship
 * 3. If blocked, return 403 Forbidden
 * 4. If not blocked, continue to next middleware
 *
 * @param {string} paramName - Name of URL parameter containing target user ID
 *   Example: For /api/messages/:userId, paramName would be 'userId'
 *
 * @returns {Function} Express middleware function
 *
 * USAGE:
 * ```javascript
 * // Route: POST /api/messages/:userId
 * router.post('/:userId',
 *   requireAuth,
 *   checkNotBlocked('userId'),  // Check against URL param
 *   createMessage
 * );
 * ```
 *
 * EXAMPLE FLOW:
 * - User A requests POST /api/messages/123 (to message User 123)
 * - Middleware extracts userId = "123" from params
 * - Checks if block exists between User A and User 123
 * - If blocked: 403 "Cannot interact with this user"
 * - If not blocked: proceeds to createMessage handler
 *
 * ERROR RESPONSES:
 * - 400: Invalid user ID format
 * - 403: Users are blocked (either direction)
 * - Passes through if valid
 */
export function checkNotBlocked(paramName) {
  return async (req, res, next) => {
    try {
      // =====================================================================
      // STEP 1: Extract Target User ID from URL Parameter
      // =====================================================================
      const targetUserId = req.params[paramName];

      // If parameter is not provided, skip check (route might be optional)
      if (!targetUserId) {
        return next();
      }

      // =====================================================================
      // STEP 2: Validate User ID Format
      // =====================================================================
      // Ensure it's a valid MongoDB ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      // =====================================================================
      // STEP 3: Check for Block Relationship
      // =====================================================================
      // hasBlockBetween returns true if:
      // - Current user has blocked target user, OR
      // - Target user has blocked current user
      const hasBlock = await UserBlock.hasBlockBetween(req.user._id, targetUserId);

      if (hasBlock) {
        // =====================================================================
        // STEP 4: Block Exists - Deny Access
        // =====================================================================
        // Return generic message to prevent information leakage
        // (don't reveal who blocked whom)
        return res.status(403).json({
          error: 'Cannot interact with this user',
          code: 'USER_BLOCKED'
        });
      }

      // =====================================================================
      // STEP 5: No Block - Continue
      // =====================================================================
      next();

    } catch (error) {
      // Log error but don't expose internal details
      console.error('[BLOCK_CHECK] Error checking block relationship:', error.message);
      return res.status(500).json({
        error: 'Failed to verify user access',
        code: 'BLOCK_CHECK_ERROR'
      });
    }
  };
}

/**
 * checkNotBlockedBody(fieldName) - Check Block Against Request Body Field
 * =======================================================================
 * Factory function that creates middleware to check if current user is blocked
 * by (or has blocked) the user specified in a request body field.
 *
 * Similar to checkNotBlocked but reads from req.body instead of req.params.
 * Useful for POST/PUT endpoints where target user is in the request body.
 *
 * @param {string} fieldName - Name of body field containing target user ID
 *   Example: For { recipientId: "123" }, fieldName would be 'recipientId'
 *
 * @returns {Function} Express middleware function
 *
 * USAGE:
 * ```javascript
 * // Route: POST /api/item-shares
 * // Body: { itemId: "abc", recipientId: "123" }
 * router.post('/',
 *   requireAuth,
 *   checkNotBlockedBody('recipientId'),  // Check against body field
 *   createItemShare
 * );
 * ```
 *
 * FOR ARRAYS OF USER IDS:
 * If the field contains an array of user IDs (e.g., userIds: ["123", "456"]),
 * use checkNotBlockedBodyArray instead.
 */
export function checkNotBlockedBody(fieldName) {
  return async (req, res, next) => {
    try {
      // =====================================================================
      // STEP 1: Extract Target User ID from Body
      // =====================================================================
      const targetUserId = req.body[fieldName];

      // If field is not provided, skip check (might be optional)
      if (!targetUserId) {
        return next();
      }

      // =====================================================================
      // STEP 2: Validate User ID Format
      // =====================================================================
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          error: `Invalid ${fieldName}`,
          code: 'INVALID_USER_ID'
        });
      }

      // =====================================================================
      // STEP 3: Check for Block Relationship
      // =====================================================================
      const hasBlock = await UserBlock.hasBlockBetween(req.user._id, targetUserId);

      if (hasBlock) {
        return res.status(403).json({
          error: 'Cannot interact with this user',
          code: 'USER_BLOCKED'
        });
      }

      // =====================================================================
      // STEP 4: No Block - Continue
      // =====================================================================
      next();

    } catch (error) {
      console.error('[BLOCK_CHECK] Error checking block relationship:', error.message);
      return res.status(500).json({
        error: 'Failed to verify user access',
        code: 'BLOCK_CHECK_ERROR'
      });
    }
  };
}

/**
 * checkNotBlockedBodyArray(fieldName) - Check Block Against Array of User IDs
 * ===========================================================================
 * Factory function that creates middleware to check if current user is blocked
 * by (or has blocked) ANY of the users specified in a body array field.
 *
 * Useful for bulk operations like sharing with multiple users at once.
 *
 * BEHAVIOR:
 * - Filters out blocked users from the array silently
 * - Modifies req.body[fieldName] to only include non-blocked users
 * - Does NOT fail the request (just removes blocked users)
 *
 * @param {string} fieldName - Name of body field containing array of user IDs
 *   Example: For { userIds: ["123", "456"] }, fieldName would be 'userIds'
 *
 * @returns {Function} Express middleware function
 *
 * USAGE:
 * ```javascript
 * // Route: POST /api/item-shares
 * // Body: { itemId: "abc", userIds: ["123", "456", "789"] }
 * router.post('/',
 *   requireAuth,
 *   checkNotBlockedBodyArray('userIds'),  // Filters blocked users
 *   createItemShare  // Only receives non-blocked userIds
 * );
 * ```
 *
 * WHY FILTER INSTEAD OF REJECT?
 * - User might share with 10 people, 1 of whom they blocked ages ago
 * - Better UX to silently skip blocked users than fail entire request
 * - Matches existing behavior in itemShares.js and messages.js
 */
export function checkNotBlockedBodyArray(fieldName) {
  return async (req, res, next) => {
    try {
      // =====================================================================
      // STEP 1: Extract Array of User IDs from Body
      // =====================================================================
      const userIds = req.body[fieldName];

      // If field is not provided or empty, skip check
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return next();
      }

      // =====================================================================
      // STEP 2: Filter Out Invalid and Blocked Users
      // =====================================================================
      const validUserIds = [];

      for (const userId of userIds) {
        // Skip invalid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId)) continue;

        // Skip self (can't share with yourself)
        if (userId === req.user._id.toString()) continue;

        // Check for block relationship
        const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
        if (hasBlock) continue;

        // Valid and not blocked - include in filtered array
        validUserIds.push(userId);
      }

      // =====================================================================
      // STEP 3: Update Request Body with Filtered Array
      // =====================================================================
      req.body[fieldName] = validUserIds;

      // =====================================================================
      // STEP 4: Continue to Next Middleware
      // =====================================================================
      next();

    } catch (error) {
      console.error('[BLOCK_CHECK] Error filtering blocked users:', error.message);
      return res.status(500).json({
        error: 'Failed to verify user access',
        code: 'BLOCK_CHECK_ERROR'
      });
    }
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  checkNotBlocked,
  checkNotBlockedBody,
  checkNotBlockedBodyArray
};
