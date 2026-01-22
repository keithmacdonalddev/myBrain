/**
 * =============================================================================
 * APIKEYSERVICE.JS - API Key Management Service
 * =============================================================================
 *
 * This service handles all operations related to Personal API Keys:
 * - Generating secure API keys for CLI and programmatic access
 * - Hashing keys for secure storage (never store plain text)
 * - Verifying keys during authentication
 * - Creating, listing, and revoking keys
 *
 * WHY API KEYS?
 * -------------
 * API keys allow users to authenticate from:
 * - Command-line tools (like Claude Code CLI)
 * - Scripts and automation
 * - External integrations
 *
 * Without exposing their main session token or password.
 *
 * SECURITY:
 * ---------
 * - Keys are hashed with bcrypt (same as passwords)
 * - Full key is only shown ONCE when generated
 * - Users can revoke individual keys without affecting others
 * - Limited to 5 keys per user
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * crypto - Node.js built-in cryptographic library.
 * We use crypto.randomBytes() to generate random bytes for API keys.
 * This ensures we create cryptographically secure random keys that can't be guessed.
 */
import crypto from 'crypto';

/**
 * bcryptjs - Password hashing library for secure one-way encryption.
 * We use bcrypt to hash API keys before storing them in the database.
 * This ensures that even if the database is breached, raw API keys aren't exposed.
 */
import bcrypt from 'bcryptjs';

/**
 * User model - MongoDB schema for user documents.
 * Each user has an apiKeys array that stores hashed API key information.
 * We update this to create, list, and revoke API keys.
 */
import User from '../models/User.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * API_KEY_PREFIX: Prefix for all API keys
 * Makes keys easily identifiable and prevents confusion with other tokens
 */
const API_KEY_PREFIX = 'mbrain_';

/**
 * API_KEY_LENGTH: Length of random bytes for the key
 * 32 bytes = 64 hex characters (very secure)
 */
const API_KEY_LENGTH = 32;

/**
 * MAX_KEYS_PER_USER: Maximum number of API keys allowed per user
 * Prevents abuse and encourages proper key management
 */
const MAX_KEYS_PER_USER = 5;

// =============================================================================
// KEY GENERATION FUNCTIONS
// =============================================================================

/**
 * generateApiKey()
 * ----------------
 * Generates a new random API key with the myBrain prefix.
 *
 * FORMAT: mbrain_abc123def456...
 * - Prefix identifies it as a myBrain API key
 * - Random hex string ensures uniqueness and security
 *
 * @returns {string} - The generated API key (plain text)
 *
 * EXAMPLE OUTPUT: "mbrain_a3f7b2c8d9e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
 */
export function generateApiKey() {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  const apiKey = `${API_KEY_PREFIX}${randomBytes}`;
  return apiKey;
}

/**
 * hashApiKey(apiKey)
 * ------------------
 * Hashes an API key using bcrypt for secure storage.
 * Same approach as password hashing - one-way encryption.
 *
 * @param {string} apiKey - The plain text API key
 * @returns {Promise<string>} - The bcrypt hash
 *
 * WHY HASH?
 * ---------
 * If the database is compromised, attackers can't use the hashed keys.
 * They would need the plain text key, which is only shown once.
 */
export async function hashApiKey(apiKey) {
  const salt = await bcrypt.genSalt(10);
  const hashedKey = await bcrypt.hash(apiKey, salt);
  return hashedKey;
}

/**
 * verifyApiKey(apiKey, hashedKey)
 * --------------------------------
 * Verifies a plain text API key against its stored hash.
 * Used during authentication to check if the key is valid.
 *
 * @param {string} apiKey - The plain text API key from the request
 * @param {string} hashedKey - The stored bcrypt hash from the database
 * @returns {Promise<boolean>} - True if the key matches the hash
 */
export async function verifyApiKey(apiKey, hashedKey) {
  return await bcrypt.compare(apiKey, hashedKey);
}

// =============================================================================
// API KEY CRUD OPERATIONS
// =============================================================================

/**
 * createApiKey(userId, name)
 * --------------------------
 * Creates a new API key for a user.
 *
 * PROCESS:
 * 1. Generate random API key
 * 2. Hash the key for storage
 * 3. Extract prefix for display
 * 4. Save to user's apiKeys array
 * 5. Return the PLAIN TEXT key (only time it's shown!)
 *
 * @param {string} userId - The user's database ID
 * @param {string} name - Human-readable name for the key
 * @returns {Promise<Object>} - Object with apiKey (plain text), prefix, name, createdAt
 *
 * @throws {Error} - If user not found or max keys reached
 *
 * EXAMPLE USAGE:
 * ```
 * const result = await createApiKey('user123', 'Claude Code CLI');
 * // Returns: {
 * //   apiKey: 'mbrain_abc123...',  // FULL KEY - show to user NOW
 * //   prefix: 'mbrain_abc123a',     // Safe to show later
 * //   name: 'Claude Code CLI',
 * //   createdAt: Date
 * // }
 * ```
 */
export async function createApiKey(userId, name) {
  // Find the user
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if user has reached maximum keys
  if (user.apiKeys && user.apiKeys.length >= MAX_KEYS_PER_USER) {
    const error = new Error(`Maximum of ${MAX_KEYS_PER_USER} API keys allowed`);
    error.statusCode = 400;
    throw error;
  }

  // Generate new API key
  const apiKey = generateApiKey();
  const hashedKey = await hashApiKey(apiKey);
  const prefix = apiKey.substring(0, 15); // "mbrain_abc123ab"

  // Initialize apiKeys array if it doesn't exist
  user.apiKeys = user.apiKeys || [];

  // Add new key to user's array
  user.apiKeys.push({
    key: hashedKey,
    name,
    prefix,
    createdAt: new Date(),
    lastUsed: null,
    expiresAt: null
  });

  // Save to database
  await user.save();

  // Return the PLAIN TEXT key to show user (only time they see it!)
  return {
    apiKey,      // Full key - user must save this now!
    prefix,      // Partial key for display
    name,
    createdAt: new Date()
  };
}

/**
 * revokeApiKey(userId, keyId)
 * ----------------------------
 * Revokes (deletes) an API key.
 * The key will immediately stop working for authentication.
 *
 * @param {string} userId - The user's database ID
 * @param {string} keyId - The _id of the API key to revoke
 * @returns {Promise<Object>} - Success confirmation
 *
 * @throws {Error} - If user or key not found
 *
 * USE CASES:
 * - Key compromised → revoke immediately
 * - No longer needed → clean up unused keys
 * - Key shown to wrong person → revoke and generate new one
 */
export async function revokeApiKey(userId, keyId) {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Find the key in user's apiKeys array
  const keyIndex = user.apiKeys.findIndex(k => k._id.toString() === keyId);

  if (keyIndex === -1) {
    const error = new Error('API key not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove the key from the array
  user.apiKeys.splice(keyIndex, 1);

  // Save changes
  await user.save();

  return { success: true };
}

/**
 * listApiKeys(userId)
 * -------------------
 * Lists all API keys for a user (without sensitive data).
 * Returns safe information for display in UI.
 *
 * @param {string} userId - The user's database ID
 * @returns {Promise<Array>} - Array of API key info objects
 *
 * RETURNED DATA (per key):
 * - id: Key's database ID (for revocation)
 * - name: Human-readable name
 * - prefix: Partial key for identification (e.g., "mbrain_abc123a...")
 * - lastUsed: When key was last used (or null)
 * - createdAt: When key was created
 * - expiresAt: When key expires (or null for no expiration)
 *
 * NOT RETURNED:
 * - Full API key (never shown again after creation)
 * - Hashed key (internal only)
 */
export async function listApiKeys(userId) {
  const user = await User.findById(userId);

  if (!user || !user.apiKeys) {
    return [];
  }

  // Return safe data only (no hashed keys or full keys)
  return user.apiKeys.map(k => ({
    id: k._id,
    name: k.name,
    prefix: k.prefix,
    lastUsed: k.lastUsed,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt
  }));
}

/**
 * updateLastUsed(userId, keyId)
 * ------------------------------
 * Updates the lastUsed timestamp for an API key after successful authentication.
 * This is a fire-and-forget operation that enables usage tracking and monitoring.
 *
 * BUSINESS LOGIC:
 * When a user authenticates with an API key, we record the timestamp. This helps:
 * 1. Users identify inactive keys that can be revoked
 * 2. Security team detect unusual access patterns (time of day, frequency changes)
 * 3. Build audit trails for compliance and accountability
 *
 * FIRE-AND-FORGET PATTERN:
 * This function doesn't throw errors - if the update fails, we just silently continue.
 * We don't want failed tracking to block authentication requests.
 *
 * @param {string} userId - The user's database ID
 * @param {string} keyId - The _id of the API key that was used
 *
 * @returns {Promise<void>} - No return value; this is fire-and-forget
 *
 * @throws - Does not throw; silently continues if update fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // After authenticating a user with an API key:
 * const userId = 'user123';
 * const keyId = 'apiKey456';
 *
 * // Record this usage (don't await - fire and forget)
 * updateLastUsed(userId, keyId).catch(err => {
 *   console.error('[ApiKeyService] Failed to update lastUsed:', err.message);
 *   // Don't throw - we already authenticated successfully
 * });
 *
 * // User can later see when they last used this key
 * const keys = await listApiKeys(userId);
 * console.log(keys[0].lastUsed); // Date object or null
 * ```
 */
export async function updateLastUsed(userId, keyId) {
  // =====================================================
  // UPDATE THE KEY'S LAST USED TIMESTAMP
  // =====================================================
  // We use MongoDB's positional operator ($) to update the specific key
  // in the apiKeys array that matches both userId and keyId.
  // This is more efficient than fetching, modifying, and saving the whole document.
  await User.updateOne(
    // Find: User with this ID AND has an API key with this ID
    { _id: userId, 'apiKeys._id': keyId },
    // Update: Set that specific key's lastUsed to now
    { $set: { 'apiKeys.$.lastUsed': new Date() } }
  );
}

/**
 * findUserByApiKey(apiKey)
 * ------------------------
 * Finds the user who owns a given API key during authentication.
 * This is the main entry point for API key-based authentication.
 *
 * BUSINESS LOGIC:
 * API key authentication needs to:
 * 1. Find which user owns a key (can't query by hash, so we check all users)
 * 2. Verify the key matches (bcrypt comparison)
 * 3. Check if key is still valid (not expired)
 * 4. Return the user and key metadata for the authenticating request
 *
 * PERFORMANCE CONSIDERATIONS:
 * This function is slower than JWT auth because:
 * - We can't query by hash directly (hashes are one-way)
 * - We must fetch users and check each key against the provided key
 * - Bcrypt comparison is computationally expensive
 *
 * OPTIMIZATION OPPORTUNITIES FOR HIGH TRAFFIC:
 * - Cache recently-used keys with short TTL
 * - Maintain a separate key-to-userId lookup table (trade-off: more storage)
 * - Use database indexes on key prefixes (we store prefix for this reason)
 * - Consider moving API key auth to a separate fast path
 *
 * @param {string} apiKey - The plain text API key from the request header
 *
 * @returns {Promise<Object|null>} - { user, apiKeyDoc } or null if not found
 *   - user: User document (full object for use in routes)
 *   - apiKeyDoc: The specific API key entry with metadata
 *
 * @throws - Does not throw; returns null instead
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In authentication middleware:
 * const apiKey = req.headers['x-api-key'];
 *
 * const result = await findUserByApiKey(apiKey);
 * if (!result) {
 *   // No matching key found, or key expired
 *   return res.status(401).json({ error: 'Invalid API key' });
 * }
 *
 * const { user, apiKeyDoc } = result;
 * // user is now authenticated and can access protected routes
 * req.user = user;
 *
 * // Record usage asynchronously (fire-and-forget)
 * updateLastUsed(user._id, apiKeyDoc._id).catch(err => {
 *   console.error('Failed to update lastUsed:', err);
 * });
 * ```
 */
export async function findUserByApiKey(apiKey) {
  // =====================================================
  // FETCH ALL USERS WITH API KEYS
  // =====================================================
  // We fetch all users who have at least one API key.
  // { 'apiKeys.0': { $exists: true } } means "has an item at index 0"
  // This is much faster than fetching ALL users.
  // We also use .select('+apiKeys.key') to include the hashed keys
  // (they're normally excluded from queries for security)
  const users = await User.find({ 'apiKeys.0': { $exists: true } }).select('+apiKeys.key');

  // =====================================================
  // CHECK EACH USER'S API KEYS
  // =====================================================
  // Since we can't query by hash (it's one-way encrypted),
  // we need to check each user's keys individually
  for (const user of users) {
    // Skip if user has no keys (shouldn't happen due to query, but be safe)
    if (!user.apiKeys || user.apiKeys.length === 0) continue;

    // =====================================================
    // CHECK EACH KEY AGAINST THE PROVIDED KEY
    // =====================================================
    // Try to match the provided key against each stored (hashed) key
    for (const apiKeyObj of user.apiKeys) {
      // Use bcrypt to compare the plain text key with the stored hash
      const isValid = await verifyApiKey(apiKey, apiKeyObj.key);

      if (isValid) {
        // =====================================================
        // CHECK IF KEY HAS EXPIRED
        // =====================================================
        // Even if the key matches, it might have an expiration date
        // If expiration time is before now, the key is no longer valid
        if (apiKeyObj.expiresAt && apiKeyObj.expiresAt < new Date()) {
          // Key is expired - treat as if it doesn't exist
          return null;
        }

        // =====================================================
        // RETURN AUTHENTICATED USER AND KEY
        // =====================================================
        // We return both the user (for route access) and the key
        // (so caller can update lastUsed and know which key was used)
        return {
          user,        // Full user document for authenticated requests
          apiKeyDoc: apiKeyObj // The specific key that matched
        };
      }
    }
  }

  // =====================================================
  // NO MATCHING KEY FOUND
  // =====================================================
  // Either no key matches, or the key exists but is expired
  return null;
}
