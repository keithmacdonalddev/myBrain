/**
 * =============================================================================
 * AUTH.JS - Authentication Middleware
 * =============================================================================
 *
 * This file contains middleware functions that protect routes by checking if
 * users are logged in. Middleware is code that runs BEFORE a route handler,
 * acting as a gatekeeper.
 *
 * WHAT IS AUTHENTICATION?
 * -----------------------
 * Authentication is the process of verifying "who you are". When a user logs
 * in with email and password, they receive a JWT (JSON Web Token) that proves
 * their identity. This token is like a digital ID card that the user presents
 * with every request.
 *
 * HOW JWT TOKENS WORK:
 * -------------------
 * 1. User logs in with email/password
 * 2. Server verifies credentials and creates a JWT containing user ID + session ID
 * 3. Token is sent to the browser (stored in cookie or localStorage)
 * 4. On subsequent requests, browser sends the token
 * 5. Server verifies token AND validates session is still active
 *
 * SESSION-BASED REVOCATION:
 * -------------------------
 * JWTs are stateless - they can't be invalidated once issued. To enable
 * instant logout/revocation, we:
 * 1. Include a session ID (sid) in the JWT
 * 2. Create a Session document in the database on login
 * 3. On each request, verify the session is still active
 * 4. To revoke access, mark the session as revoked
 *
 * This gives us the best of both worlds:
 * - Fast JWT verification (cryptographic, no DB hit)
 * - Ability to revoke access instantly (session check)
 *
 * MIDDLEWARE FUNCTIONS IN THIS FILE:
 * ----------------------------------
 * - requireAuth: Route is protected, user MUST be logged in
 * - requireAdmin: Route requires admin privileges
 * - optionalAuth: Route works for guests, but adds user info if logged in
 * - invalidateSessionCache: Clear cached session validation on revocation
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * JWT (JSON Web Token) library for creating and verifying tokens.
 *
 * A JWT is a secure way to transmit user identity:
 * - Contains encoded data (like user ID, session ID)
 * - Signed with a secret key so it can't be forged
 * - Has an expiration time for security
 */
import jwt from 'jsonwebtoken';

/**
 * User model to look up users in the database after verifying their token.
 */
import User from '../models/User.js';

/**
 * Session model to validate that sessions are still active.
 */
import Session from '../models/Session.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * JWT_SECRET: The secret key used to sign and verify tokens.
 *
 * IMPORTANT SECURITY NOTE:
 * - In production, this MUST be a strong, random string from environment variables
 * - If someone knows this secret, they can forge tokens and impersonate any user
 * - Never commit real secrets to code repositories
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// =============================================================================
// SESSION CACHE
// =============================================================================

/**
 * Session Validation Cache
 * ------------------------
 * We cache session validation results to avoid hitting the database on every
 * request. This is a tradeoff between security and performance.
 *
 * CACHE TTL: 15 seconds (security review recommended shorter TTL)
 * - Short enough that revoked sessions stop working quickly
 * - Long enough to reduce database load significantly
 *
 * STRUCTURE: Map<cacheKey, { isValid: boolean, checkedAt: number }>
 * - cacheKey: `${sessionId}:${jwtId}`
 * - isValid: Whether session was valid when last checked
 * - checkedAt: Timestamp when validation was performed
 */
const sessionCache = new Map();

/**
 * Cache TTL in milliseconds
 * 15 seconds is a good balance:
 * - Most requests use cached result (fast)
 * - Revoked sessions become invalid within 15 seconds (secure)
 */
const SESSION_CACHE_TTL = 15 * 1000; // 15 seconds

/**
 * Maximum cache size to prevent memory leaks
 * Clear oldest entries when this limit is reached
 */
const SESSION_CACHE_MAX_SIZE = 10000;

/**
 * Activity update throttle in milliseconds
 * Only update lastActivityAt if more than this time has passed
 * Prevents excessive database writes on rapid requests
 */
const ACTIVITY_UPDATE_THROTTLE = 60 * 1000; // 1 minute

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * cleanupSessionCache()
 * ---------------------
 * Remove expired entries from the session cache.
 * Called periodically to prevent memory growth.
 */
function cleanupSessionCache() {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, value] of sessionCache) {
    if (now - value.checkedAt > SESSION_CACHE_TTL) {
      sessionCache.delete(key);
      deletedCount++;
    }
  }

  // If cache is still too large, delete oldest entries
  if (sessionCache.size > SESSION_CACHE_MAX_SIZE) {
    const entries = Array.from(sessionCache.entries())
      .sort((a, b) => a[1].checkedAt - b[1].checkedAt);

    const deleteCount = sessionCache.size - (SESSION_CACHE_MAX_SIZE * 0.8); // Keep 80%
    for (let i = 0; i < deleteCount; i++) {
      sessionCache.delete(entries[i][0]);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupSessionCache, 60 * 1000);

/**
 * invalidateSessionCache(sessionId)
 * ---------------------------------
 * Remove all cache entries for a specific session.
 * Called when a session is revoked to ensure immediate effect.
 *
 * @param {string} sessionId - Session ID to invalidate
 *
 * USAGE:
 * import { invalidateSessionCache } from './auth.js';
 * await session.revoke('user_logout');
 * invalidateSessionCache(session.sessionId);
 */
export function invalidateSessionCache(sessionId) {
  if (!sessionId) return;

  // Delete all entries that start with this sessionId
  // (handles different jti values for the same session)
  for (const key of sessionCache.keys()) {
    if (key.startsWith(sessionId + ':')) {
      sessionCache.delete(key);
    }
  }
}

// =============================================================================
// SESSION VALIDATION
// =============================================================================

/**
 * validateSession(sid, jti)
 * -------------------------
 * Check if a session is valid (active and not expired).
 * Uses caching to minimize database hits.
 *
 * @param {string} sid - Session ID from JWT
 * @param {string} jti - JWT ID from JWT
 * @returns {Promise<boolean>} True if session is valid
 *
 * VALIDATION CHECKS:
 * 1. Session exists in database
 * 2. Session status is 'active' (not revoked or expired)
 * 3. Session has not expired (expiresAt > now)
 */
async function validateSession(sid, jti) {
  const cacheKey = `${sid}:${jti}`;

  // Check cache first
  const cached = sessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.checkedAt) < SESSION_CACHE_TTL) {
    return cached.isValid;
  }

  // Cache miss or expired - query database
  const session = await Session.findOne({
    sessionId: sid,
    jwtId: jti,
    status: 'active',
    expiresAt: { $gt: new Date() }  // Not expired
  }).select('_id').lean();

  const isValid = !!session;

  // Update cache
  sessionCache.set(cacheKey, {
    isValid,
    checkedAt: Date.now()
  });

  return isValid;
}

/**
 * updateSessionActivity(sid)
 * --------------------------
 * Update the lastActivityAt timestamp for a session.
 * Throttled to avoid excessive database writes.
 *
 * @param {string} sid - Session ID to update
 *
 * This is fire-and-forget - errors are logged but don't affect the request.
 */
function updateSessionActivity(sid) {
  // Use $max operator to avoid race conditions
  // Only updates if new time is greater than current value
  Session.updateOne(
    {
      sessionId: sid,
      status: 'active',
      lastActivityAt: { $lt: new Date(Date.now() - ACTIVITY_UPDATE_THROTTLE) }
    },
    { $max: { lastActivityAt: new Date() } }
  ).catch(err => {
    console.error('[AUTH] Failed to update session activity:', err.message);
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract Token from Request
 * --------------------------
 * Looks for the JWT token in two places:
 *
 * 1. Authorization Header: "Bearer <token>"
 *    - Standard method for API authentication
 *    - Used by mobile apps and API clients
 *
 * 2. Cookie: req.cookies.token
 *    - Used by web browsers
 *    - More secure against XSS attacks when cookie is httpOnly
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - The JWT token or null if not found
 *
 * EXAMPLE:
 * Header: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
const getTokenFromRequest = (req) => {
  // First, check the Authorization header (Bearer token format)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Remove "Bearer " prefix (7 characters) to get just the token
    return authHeader.substring(7);
  }

  // If no header, fall back to checking cookies
  // The ?. is optional chaining - safely access token even if cookies is undefined
  return req.cookies?.token;
};

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * requireAuth(req, res, next) - Require User Authentication
 * ============================================================
 * This middleware is the gatekeeper for protected routes. It checks if the
 * request includes valid authentication credentials and identifies the user.
 *
 * WHAT IS AUTHENTICATION MIDDLEWARE?
 * -----------------------------------
 * Authentication middleware acts as a security checkpoint. Before a user can
 * access protected resources (their notes, tasks, etc.), we verify:
 * 1. Are they providing proof of identity (a token)?
 * 2. Is that token valid (not expired, not forged)?
 * 3. Is the session still active (not revoked)?
 * 4. Does the user account still exist?
 * 5. Is the account in good standing (not suspended/banned)?
 *
 * AUTHENTICATION METHOD:
 * ----------------------
 * JWT TOKENS with SESSION VALIDATION
 *    - Sent via: Cookie (httpOnly) or Authorization: Bearer header
 *    - JWT contains: userId, sid (session ID), jti (JWT ID)
 *    - Session validation ensures revoked sessions stop working
 *
 * BUSINESS LOGIC FLOW:
 * --------------------
 * 1. Extract JWT from cookie or Authorization header
 * 2. Verify the token is valid and not expired
 * 3. If token has sid/jti, validate session is still active
 * 4. Look up the user in the database
 * 5. Check account status (active, disabled, suspended, or banned)
 * 6. Attach user and decoded token to request for route handlers
 * 7. Update session activity (throttled)
 * 8. Continue to next middleware/route handler
 *
 * LEGACY TOKEN SUPPORT:
 * ---------------------
 * Tokens without sid/jti (created before session tracking) still work.
 * They bypass session validation but otherwise authenticate normally.
 * This ensures existing users aren't logged out when we deploy.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * ATTACHES TO REQUEST:
 * - req.user: The authenticated user object with _id, email, role, etc.
 * - req.decoded: The decoded JWT payload (userId, sid, jti)
 * - req.authMethod: 'jwt' (for logging)
 *
 * ERROR RESPONSES:
 * - 401 NO_TOKEN: No credentials provided
 * - 401 INVALID_TOKEN: JWT is malformed or signature is invalid
 * - 401 TOKEN_EXPIRED: JWT has passed its expiration time
 * - 401 SESSION_INVALID: Session was revoked or expired
 * - 401 USER_NOT_FOUND: User ID in token doesn't exist in database
 * - 403 ACCOUNT_DISABLED: User disabled their account
 * - 403 ACCOUNT_SUSPENDED: User temporarily suspended from platform
 * - 403 ACCOUNT_BANNED: User permanently banned for violations
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Get the JWT token from the request
    const token = getTokenFromRequest(req);

    // No token = not logged in
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // Verify the JWT token
    // jwt.verify() does two things:
    // 1. Checks the signature (proves token wasn't tampered with)
    // 2. Checks expiration (throws TokenExpiredError if expired)
    // Returns the decoded payload (contains userId, sid, jti)
    const decoded = jwt.verify(token, JWT_SECRET);

    // Store decoded token on request for route handlers
    req.decoded = decoded;

    // -----------------------------------------
    // SESSION VALIDATION
    // -----------------------------------------
    // If token has session ID and JWT ID, validate the session
    // Legacy tokens without these fields skip session validation

    if (decoded.sid && decoded.jti) {
      const isValid = await validateSession(decoded.sid, decoded.jti);

      if (!isValid) {
        return res.status(401).json({
          error: 'Session expired or revoked',
          code: 'SESSION_INVALID'
        });
      }

      // Update session activity (fire and forget, throttled)
      updateSessionActivity(decoded.sid);
    }

    // -----------------------------------------
    // LOOK UP USER
    // -----------------------------------------
    // Token is valid, but we need to verify user still exists
    // (they might have been deleted after the token was issued)
    const user = await User.findById(decoded.userId);

    // User no longer exists
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // -----------------------------------------
    // CHECK ACCOUNT STATUS
    // -----------------------------------------

    // Account is permanently banned
    if (user.moderationStatus?.isBanned) {
      return res.status(403).json({
        error: 'Account is permanently banned',
        code: 'ACCOUNT_BANNED',
        banReason: user.moderationStatus?.banReason // Why they're banned
      });
    }

    // Account has been disabled by user or admin
    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Account is suspended (temporary ban)
    if (user.status === 'suspended' || user.moderationStatus?.isSuspended) {
      // Check if the suspension has expired
      // If it has, clear it and let them proceed
      const wasCleared = await user.checkAndClearSuspension();

      // Still suspended
      if (!wasCleared && user.isSuspendedNow()) {
        return res.status(403).json({
          error: 'Account is suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspendedUntil: user.moderationStatus?.suspendedUntil, // When it ends
          suspendReason: user.moderationStatus?.suspendReason    // Why they're suspended
        });
      }
    }

    // -----------------------------------------
    // ATTACH USER TO REQUEST
    // -----------------------------------------
    // All checks passed! Attach user for route handlers to use
    req.user = user;
    req.authMethod = 'jwt';

    // Continue to the next middleware or route handler
    next();

  } catch (error) {
    // -----------------------------------------
    // ERROR HANDLING
    // -----------------------------------------

    // Token has invalid structure or signature
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Token has expired (past its expiration time)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Unexpected error (database issue, etc.)
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * requireAdmin(req, res, next) - Require Admin Role
 * ==================================================
 * This middleware enforces role-based access control (RBAC) for admin operations.
 * It checks if the authenticated user has admin privileges before allowing access
 * to sensitive operations like user management, moderation, or system settings.
 *
 * WHAT IS ROLE-BASED ACCESS CONTROL?
 * ----------------------------------
 * RBAC is a security pattern where different user roles have different permissions:
 * - Admin: Full access to system settings, user management, moderation
 * - Moderator: Can moderate content and users
 * - User: Normal access to their own content
 *
 * PREREQUISITE:
 * This middleware MUST run AFTER requireAuth. If used before requireAuth,
 * it will always fail because req.user won't be set yet.
 *
 * @param {Object} req - Express request object (must have req.user from requireAuth)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * ERROR RESPONSES:
 * - 401 NO_USER: User not authenticated (should not happen if after requireAuth)
 * - 403 NOT_ADMIN: User is authenticated but doesn't have admin role
 */
export const requireAdmin = (req, res, next) => {
  // Check 1: Is user authenticated?
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Check 2: Does user have admin role?
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'NOT_ADMIN'
    });
  }

  // All checks passed
  next();
};

/**
 * optionalAuth(req, res, next) - Attach User if Logged In (Optional)
 * ===================================================================
 * This middleware provides optional authentication for routes that work for
 * both logged-in and anonymous users. It tries to identify the user but never
 * blocks the request.
 *
 * WHAT IS OPTIONAL AUTHENTICATION?
 * --------------------------------
 * Some features work better with authentication but should still work without it:
 * - A shared note can be viewed by anyone, but show "edit" button if it's yours
 * - A public profile can be viewed by anyone, but show more info if you're logged in
 * - A search can return results to anyone, but personalize results if user is known
 *
 * THIS VS requireAuth MIDDLEWARE:
 * --------------------------------
 * requireAuth:
 * - Blocks unauthenticated users (returns 401 error)
 * - Guarantees req.user exists
 * - Use for: /notes, /tasks, /profile
 *
 * optionalAuth:
 * - Allows unauthenticated users (continues with req.user = undefined)
 * - req.user may or may not exist
 * - Use for: /shared/:id, /profile/:userId, /search
 *
 * BEHAVIOR:
 * ---------
 * 1. If user provides valid token with valid session: req.user = user object
 * 2. If user provides invalid/expired token: Silently ignore it
 * 3. If session is revoked: Silently ignore (treat as anonymous)
 * 4. If user provides no token: req.user = undefined (anonymous)
 * 5. In ALL cases: Continue to route handler (never block)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * AFTER THIS MIDDLEWARE:
 * - req.user = user object (if authenticated) or undefined (if not)
 * - req.decoded = decoded JWT (if authenticated) or undefined (if not)
 * - Route handler should ALWAYS check if (req.user) before using it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Try to extract token
    const token = getTokenFromRequest(req);

    // If token exists, verify and attach user
    if (token) {
      // Verify the JWT token signature and expiration
      const decoded = jwt.verify(token, JWT_SECRET);

      // Store decoded token on request
      req.decoded = decoded;

      // Validate session if present (skip for legacy tokens)
      if (decoded.sid && decoded.jti) {
        const isValid = await validateSession(decoded.sid, decoded.jti);
        if (!isValid) {
          // Session revoked - treat as anonymous
          // Don't throw error, just skip user attachment
          next();
          return;
        }

        // Update session activity (fire and forget)
        updateSessionActivity(decoded.sid);
      }

      // Look up user in database
      const user = await User.findById(decoded.userId);

      // Only attach if user exists AND account is active
      if (user && user.status === 'active') {
        req.user = user;
      }
    }

  } catch (error) {
    // Token verification failed (invalid signature, expired, malformed)
    // For optional auth, we just ignore the bad token
    // The user is treated as anonymous
  }

  // Always proceed to next middleware/route handler
  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export all middleware functions.
 *
 * USAGE:
 * import { requireAuth, requireAdmin, optionalAuth, invalidateSessionCache } from './middleware/auth.js';
 *
 * Or import the default object:
 * import auth from './middleware/auth.js';
 * Then use: auth.requireAuth, auth.requireAdmin, etc.
 */
export default { requireAuth, requireAdmin, optionalAuth, invalidateSessionCache };
