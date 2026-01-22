/**
 * =============================================================================
 * APIKEYS.JS - API Key Management Routes
 * =============================================================================
 *
 * This file handles Personal API Key operations in myBrain.
 * API keys allow users to authenticate from CLI tools and scripts.
 *
 * WHAT ARE API KEYS?
 * ------------------
 * Personal API keys are:
 * - Alternative to session tokens for programmatic access
 * - Long-lived (don't expire in 7 days like JWT tokens)
 * - Revocable without logging out
 * - Named for easy identification
 * - Limited to 5 per user
 *
 * WHY USE API KEYS?
 * -----------------
 * Instead of copying session tokens from browser DevTools every time:
 * - Generate key once in Settings
 * - Store locally in .claude/credentials.json
 * - Automatic authentication in CLI tools
 *
 * SECURITY:
 * ---------
 * - Keys are hashed with bcrypt (like passwords)
 * - Full key shown ONLY ONCE when generated
 * - Each key can be individually revoked
 * - Usage tracking (lastUsed timestamp)
 * - Optional expiration dates
 *
 * ENDPOINTS:
 * ----------
 * - POST /api-keys - Generate new API key
 * - GET /api-keys - List user's API keys
 * - DELETE /api-keys/:id - Revoke API key
 *
 * AUTHENTICATION:
 * ---------------
 * All endpoints require authentication (via JWT or another API key).
 * You can't manage API keys without being logged in.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools we need to handle API key
// management. This includes the web framework, authentication checks,
// logging, and the service that manages API key creation/revocation.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, DELETE)
 * - Define routes (URLs for API key management)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * requireAuth is middleware that checks if the user is authenticated.
 * It verifies that the user has a valid JWT token or API key.
 * Without this, anyone could create and revoke API keys without logging in.
 * SECURITY: This is critical for protecting API key operations.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachEntityId is a logging middleware that tracks which entity a request
 * affects. We use this to log which API key was created/revoked by which user.
 * This creates an audit trail so we can track who did what.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * API Key service contains the business logic for:
 * - Creating new API keys (generating random tokens, hashing them)
 * - Listing user's existing keys (without exposing full keys)
 * - Revoking keys (deleting them so they stop working)
 * - Checking key validity during authentication
 *
 * We separate this logic into a service so multiple routes can reuse it.
 */
import * as apiKeyService from '../services/apiKeyService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all API key management routes together

const router = express.Router();

// =============================================================================
// API KEY MANAGEMENT - Create, List, and Revoke Personal API Keys
// =============================================================================
// These endpoints allow users to manage their personal API keys.
// API keys are used for programmatic access (scripts, CLI tools, integrations)
// instead of copying session tokens from the browser.

/**
 * POST /api-keys
 * Generate a new API key for programmatic access
 *
 * This endpoint creates a new personal API key that the user can use to
 * authenticate API calls from scripts, CLI tools, integrations, etc.
 *
 * SECURITY MODEL:
 * ---------------
 * - Each user can have max 5 API keys (prevents key sprawl)
 * - Keys are hashed with bcrypt (like passwords)
 * - Full key shown ONLY ONCE when created (can't be retrieved later)
 * - Users must save the key immediately or generate a new one
 * - Keys can be individually revoked without affecting others
 *
 * USE CASES:
 * ---------
 * - Claude Code CLI: Authenticate CLI tool with myBrain API
 * - Custom scripts: Automate note/task creation
 * - Third-party integrations: Zapier, Make, custom webhooks
 * - Mobile apps: Programmatic access without session tokens
 *
 * EXAMPLE REQUEST:
 * ---------------
 * POST /api-keys
 * {
 *   "name": "Claude Code CLI"
 * }
 *
 * EXAMPLE RESPONSE:
 * ----------------
 * {
 *   "success": true,
 *   "data": {
 *     "apiKey": "mbrain_kR7xQ9pL2mN4vB8c...",  // FULL KEY - save this!
 *     "prefix": "mbrain_kR7xQ9pL",  // Safe partial key (shown in list)
 *     "name": "Claude Code CLI",
 *     "createdAt": "2026-01-21T10:30:00Z"
 *   },
 *   "warning": "Save this API key now - you will not be able to see it again!"
 * }
 *
 * @body {string} name - Human-readable key name (required, max 50 chars)
 * @returns {Object} New API key with full key (shown only once)
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Extract and Validate Key Name
    // =============================================================================
    // The key name is what the user will see when listing keys
    // Examples: "Claude Code CLI", "Mobile App", "Zapier Integration"
    const { name } = req.body;

    // =============================================================================
    // STEP 2: Validate Name is Not Empty
    // =============================================================================
    // Name is required. Empty names don't help users identify keys.
    if (!name || name.trim().length === 0) {
      const error = new Error('API key name is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.field = 'name';
      return next(error);
    }

    // =============================================================================
    // STEP 3: Validate Name Length
    // =============================================================================
    // Max 50 characters keeps the UI clean and prevents abuse
    // WHY: Prevents users from storing long text in key names
    if (name.trim().length > 50) {
      const error = new Error('API key name cannot exceed 50 characters');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.field = 'name';
      return next(error);
    }

    // =============================================================================
    // STEP 4: Create the API Key
    // =============================================================================
    // The service will:
    // - Generate a random token (cryptographically secure)
    // - Hash the token with bcrypt (same as passwords)
    // - Store the hash in the database
    // - Return both the plain token (to show user) and hash (for storage)
    const result = await apiKeyService.createApiKey(req.user._id, name.trim());

    // =============================================================================
    // STEP 5: Log the Action for Audit Trail
    // =============================================================================
    // Track who created what key (for security audit)
    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'api_key.create.success';

    // =============================================================================
    // STEP 6: Return Success Response
    // =============================================================================
    // CRITICAL: Include warning so user understands they must save the key now
    // This is their ONLY chance to see the full key
    res.status(201).json({
      success: true,
      data: result,  // Contains full key, prefix, name, createdAt
      warning: 'Save this API key now - you will not be able to see it again!'
    });
  } catch (err) {
    // Error handling: Log error and pass to error handler
    req.error = err;
    next(err);
  }
});

/**
 * GET /api-keys
 * List all API keys for the authenticated user
 *
 * This endpoint shows all API keys the user has created.
 * Full keys are NEVER returned (for security reasons).
 * Users can see key metadata to identify which key is which.
 *
 * RESPONSE INCLUDES:
 * -----------------
 * - id: Database ID (for revocation requests)
 * - name: Human-readable name (what user named it)
 * - prefix: First 8 chars of key (safe identifier)
 * - lastUsed: When this key was last used (or null if never)
 * - createdAt: When key was generated
 * - expiresAt: Optional expiration date (if set)
 *
 * SECURITY NOTES:
 * ---------------
 * - Full keys NEVER returned (can't be reconstructed)
 * - Only prefix shown (first 8 characters only)
 * - Users can identify their keys by name, not by secret
 * - Users can see which keys are actively used
 *
 * USE CASES:
 * ---------
 * - Settings page: Show all user's API keys
 * - Audit: Check which keys exist
 * - Cleanup: Delete unused/old keys
 * - Security: Identify suspicious lastUsed timestamps
 *
 * EXAMPLE RESPONSE:
 * ----------------
 * [
 *   {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "Claude Code CLI",
 *     "prefix": "mbrain_kR7xQ",
 *     "lastUsed": "2026-01-20T14:30:00Z",
 *     "createdAt": "2026-01-10T08:00:00Z",
 *     "expiresAt": null
 *   },
 *   {
 *     "id": "507f1f77bcf86cd799439012",
 *     "name": "Mobile App Beta",
 *     "prefix": "mbrain_pL9mK",
 *     "lastUsed": null,  // Never used yet
 *     "createdAt": "2026-01-18T10:00:00Z",
 *     "expiresAt": "2026-02-18T10:00:00Z"  // Expires in 1 month
 *   }
 * ]
 *
 * @returns {Array} Array of API key metadata objects
 */
/**
 * GET /api-keys
 * List all API keys for the authenticated user
 *
 * PURPOSE:
 * Returns all API keys the user has created for programmatic access.
 * Full keys are NEVER returned (for security reasons).
 * Users can see key metadata to identify which key is which.
 *
 * RESPONSE DATA:
 * Each key object includes:
 * - id: Database ID (use this to revoke the key)
 * - name: Human-readable name (what user named it)
 * - prefix: First 8 characters of the key (safe identifier)
 * - lastUsed: When this key was last used to authenticate
 * - createdAt: When key was generated
 * - expiresAt: Optional expiration date (or null if no expiration)
 *
 * SECURITY NOTES:
 * - Full keys NEVER returned (can't be reconstructed)
 * - Only prefix shown (first 8 characters for identification)
 * - Users must identify keys by name, not by secret content
 * - Users can see usage history (lastUsed timestamp)
 * - Users can revoke keys individually
 *
 * USE CASES:
 * - Settings page: Show all user's API keys for management
 * - Security audit: Check which keys exist and when they were created
 * - Cleanup: Identify and delete unused/old keys
 * - Security: Spot suspicious lastUsed timestamps or unexpected keys
 *
 * @returns {Object} - Success response with keys array:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Claude Code CLI",
 *       "prefix": "mbrain_kR7xQ",
 *       "lastUsed": "2026-01-20T14:30:00Z",
 *       "createdAt": "2026-01-10T08:00:00Z",
 *       "expiresAt": null
 *     },
 *     {
 *       "id": "507f1f77bcf86cd799439012",
 *       "name": "Mobile App Beta",
 *       "prefix": "mbrain_pL9mK",
 *       "lastUsed": null,
 *       "createdAt": "2026-01-18T10:00:00Z",
 *       "expiresAt": "2026-02-18T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching API keys
 *
 * EXAMPLE REQUEST:
 * GET /api-keys
 * Authorization: Bearer <JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Claude Code CLI",
 *       "prefix": "mbrain_kR7xQ",
 *       "lastUsed": "2026-01-20T14:30:00Z",
 *       "createdAt": "2026-01-10T08:00:00Z",
 *       "expiresAt": null
 *     }
 *   ]
 * }
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'api_key.list' - tracks when user views their keys
 * - User ID attached for audit trail
 * - Used to understand which users actively manage API keys
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Fetch User's API Keys
    // =============================================================================
    // Query for all keys belonging to this user
    // Only returns metadata, never full keys (for security)
    // apiKeyService.listApiKeys returns array of key metadata objects
    const keys = await apiKeyService.listApiKeys(req.user._id);

    // =============================================================================
    // STEP 2: Log the List Action for Audit Trail
    // =============================================================================
    // Track that user viewed their API keys (for security audit)
    // Helps detect suspicious activity or unauthorized key management
    attachEntityId(req, 'userId', req.user._id);
    // Set event name for Wide Events logging system
    req.eventName = 'api_key.list';

    // =============================================================================
    // STEP 3: Return Keys List to Frontend
    // =============================================================================
    // Return success response with user's API keys
    res.json({
      success: true,
      data: keys  // Array of key metadata (without full keys)
    });
  } catch (err) {
    // Error handling: attach error and pass to error handler
    req.error = err;
    next(err);
  }
});

/**
 * DELETE /api-keys/:id
 * Revoke (permanently disable) an API key
 *
 * PURPOSE:
 * Revokes an API key, making it stop working immediately.
 * Revoked keys can no longer authenticate API requests.
 * This action is permanent and cannot be undone (user must create new key).
 *
 * SECURITY MODEL:
 * - User can only revoke their own keys (ownership check prevents abuse)
 * - Revocation is immediate (stops working instantly for new requests)
 * - Revoked keys cannot be "un-revoked" or recovered
 * - Creates permanent audit trail for security compliance
 *
 * WHY REVOKE INSTEAD OF DELETE?
 * We keep revoked keys in database (marked as revoked, not fully deleted) so we can:
 * - Track security events ("key was compromised on Jan 15 at 2:30 PM")
 * - See usage history ("key was last used on Jan 14")
 * - Detect patterns ("3 keys revoked in 1 day" might indicate leak)
 * - Comply with audit requirements (retain revocation history)
 * - Investigate security incidents ("which integrations were affected?")
 *
 * USE CASES:
 * - Security incident: Key compromised → revoke immediately
 * - Integration retirement: No longer need integration → revoke
 * - Accidental exposure: Posted key in public code → revoke and regenerate
 * - Account cleanup: User removing unused credentials
 * - DevOps rotation: Periodic key rotation for security
 * - Suspicious activity: Detected unauthorized usage → revoke to investigate
 *
 * @param {string} id - MongoDB ID of the API key to revoke (required)
 *   Example: "507f1f77bcf86cd799439011"
 *   Get this from GET /api-keys response
 *
 * @returns {Object} - Success response:
 * {
 *   "success": true,
 *   "message": "API key revoked successfully"
 * }
 *
 * @throws {400} - Invalid key ID format
 * @throws {404} - Key not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error during revocation
 *
 * EXAMPLE REQUEST:
 * DELETE /api-keys/507f1f77bcf86cd799439011
 * Authorization: Bearer <JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "success": true,
 *   "message": "API key revoked successfully"
 * }
 *
 * SIDE EFFECTS:
 * - Key stops authenticating immediately
 * - Any scripts/tools using this key will start failing
 * - API calls with revoked key return 401 Unauthorized
 * - User must update scripts/tools to use new key
 * - Revocation is logged for audit trail
 *
 * ERROR CASES:
 * - User tries to revoke another user's key → 404 (key not found)
 * - Invalid/malformed key ID → 400 (invalid ID)
 * - Key already revoked → success (idempotent)
 * - Database error → 500 (server error)
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'api_key.revoke.success' - tracks revocation
 * - User ID and Key ID attached for full audit trail
 * - Used to monitor API key lifecycle and security
 * - Helps detect compromised keys being revoked in response to incidents
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Revoke the API Key
    // =============================================================================
    // Call service to revoke the API key
    // apiKeyService.revokeApiKey does:
    // - Verify the key belongs to the current user (ownership check)
    //   WHY: Prevents users from revoking other users' keys
    // - Mark key as revoked in database
    //   WHY: Keeps audit trail but disables future authentication
    // - Make it stop working for future auth attempts
    //   WHY: Immediately invalidates all future requests using this key
    // Throws 404 if key not found or doesn't belong to user
    await apiKeyService.revokeApiKey(req.user._id, req.params.id);

    // =============================================================================
    // STEP 2: Log the Revocation Event for Audit Trail
    // =============================================================================
    // Track comprehensive information about this revocation
    // User ID: Which user revoked the key
    attachEntityId(req, 'userId', req.user._id);
    // Key ID: Which key was revoked
    attachEntityId(req, 'keyId', req.params.id);
    // Set event name for Wide Events logging system
    req.eventName = 'api_key.revoke.success';
    // Track mutation: what was changed
    req.mutation = {
      after: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: req.user._id
      }
    };

    // =============================================================================
    // STEP 3: Return Success Response
    // =============================================================================
    // Confirm to user that key was successfully revoked
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (err) {
    // Error handling: attach error and pass to error handler
    req.error = err;
    next(err);
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================

export default router;
