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
 * 2. Server verifies credentials and creates a JWT containing user ID
 * 3. Token is sent to the browser (stored in cookie or localStorage)
 * 4. On subsequent requests, browser sends the token
 * 5. Server verifies token and identifies the user
 *
 * WHY THIS MATTERS:
 * ----------------
 * Without authentication:
 * - Anyone could access your notes, tasks, and personal data
 * - Anyone could modify or delete your content
 * - There would be no user accounts or privacy
 *
 * MIDDLEWARE FUNCTIONS IN THIS FILE:
 * ----------------------------------
 * - requireAuth: Route is protected, user MUST be logged in
 * - requireAdmin: Route requires admin privileges
 * - optionalAuth: Route works for guests, but adds user info if logged in
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
 * - Contains encoded data (like user ID)
 * - Signed with a secret key so it can't be forged
 * - Has an expiration time for security
 */
import jwt from 'jsonwebtoken';

/**
 * User model to look up users in the database after verifying their token.
 */
import User from '../models/User.js';

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
 * 3. Does the user account still exist?
 * 4. Is the account in good standing (not suspended/banned)?
 *
 * AUTHENTICATION METHOD:
 * ----------------------
 * JWT TOKENS (for web browsers and API clients)
 *    - Sent via: Cookie (httpOnly) or Authorization: Bearer header
 *    - Use case: User logs in, gets token, includes it with each request
 *    - Expiration: Short-lived (typically 1-24 hours)
 *
 * BUSINESS LOGIC FLOW:
 * --------------------
 * 1. Extract JWT from cookie or Authorization header
 * 2. Verify the token is valid and not expired
 * 3. Look up the user in the database
 * 4. Check account status (active, disabled, suspended, or banned)
 * 5. Attach user object to request for route handlers to access
 * 6. Continue to next middleware/route handler
 *
 * @param {Object} req - Express request object
 *   - req.headers.authorization: Token in Bearer format
 *   - req.cookies.token: JWT token stored in cookie
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * ATTACHES TO REQUEST:
 * - req.user: The authenticated user object with _id, email, role, etc.
 * - req.authMethod: 'jwt' (for logging)
 *
 * ERROR RESPONSES:
 * - 401 NO_TOKEN: No credentials provided
 * - 401 INVALID_TOKEN: JWT is malformed or signature is invalid
 * - 401 TOKEN_EXPIRED: JWT has passed its expiration time
 * - 401 USER_NOT_FOUND: User ID in token doesn't exist in database
 * - 403 ACCOUNT_DISABLED: User disabled their account
 * - 403 ACCOUNT_SUSPENDED: User temporarily suspended from platform
 * - 403 ACCOUNT_BANNED: User permanently banned for violations
 *
 * MIDDLEWARE CHAIN REQUIREMENTS:
 * ------------------------------
 * This middleware should run AFTER:
 * - cookieParser() - Must be able to read req.cookies
 * - bodyParser() - For POST requests with bodies
 *
 * This middleware should run BEFORE:
 * - Any route that requires authentication
 * - routes/notes.js, routes/tasks.js, routes/profile.js
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In your Express app setup:
 * app.use(cookieParser());     // Must be first
 * app.use(bodyParser.json());  // Then body parsing
 * app.use(requestLogger);      // Then logging
 *
 * // In route definitions:
 * router.get('/notes', requireAuth, (req, res) => {
 *   // At this point, req.user is guaranteed to exist
 *   // req.user contains: { _id, email, role, status, ... }
 *   const notes = await Note.find({ userId: req.user._id });
 *   res.json(notes);
 * });
 * ```
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
    // Returns the decoded payload (contains userId)
    const decoded = jwt.verify(token, JWT_SECRET);

    // Look up the user in database
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
    // Check account status
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
    // Attach user to request
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
 * SECURITY MODEL:
 * ---------------
 * This middleware creates a second security checkpoint after authentication.
 * It's like a club with multiple doors:
 * 1. First door (requireAuth): "Are you a real member?" (authentication)
 * 2. Second door (requireAdmin): "Are you a VIP member?" (authorization)
 *
 * USE THIS FOR:
 * - Administrative routes (/admin/users, /admin/settings)
 * - System-level operations (database backup, feature toggles)
 * - Moderation actions (ban/suspend users, delete content)
 * - Debug endpoints (only admins need system diagnostics)
 *
 * PREREQUISITE:
 * This middleware MUST run AFTER requireAuth. If used before requireAuth,
 * it will always fail because req.user won't be set yet.
 *
 * @param {Object} req - Express request object
 *   - MUST have req.user (set by requireAuth)
 *   - req.user.role: String like 'admin', 'moderator', or 'user'
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * ERROR RESPONSES:
 * - 401 NO_USER: User not authenticated (should not happen if after requireAuth)
 * - 403 NOT_ADMIN: User is authenticated but doesn't have admin role
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // CORRECT - requireAuth first, then requireAdmin
 * router.get('/admin/users',
 *   requireAuth,      // Verify user is logged in
 *   requireAdmin,     // Verify user is admin
 *   listAllUsers      // Now safe to run sensitive operation
 * );
 *
 * // WRONG - This would always fail because req.user is undefined
 * router.get('/admin/users',
 *   requireAdmin,     // NO! req.user not set yet
 *   requireAuth,      // This never runs
 *   listAllUsers
 * );
 * ```
 *
 * COMMON ADMIN ROUTES:
 * - GET /admin/users - List all users
 * - POST /admin/users/:id/ban - Ban a user
 * - PUT /admin/settings - Update system settings
 * - GET /admin/reports - View user reports
 * - POST /admin/features/toggle - Enable/disable features
 */
export const requireAdmin = (req, res, next) => {
  // =========================================================================
  // CHECK 1: IS USER AUTHENTICATED?
  // =========================================================================
  // If req.user is missing, it means requireAuth didn't run or failed.
  // This is a setup error, not a normal authentication failure.

  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // =========================================================================
  // CHECK 2: DOES USER HAVE ADMIN ROLE?
  // =========================================================================
  // Users can have different roles: 'admin', 'moderator', 'user'
  // We only allow requests where role === 'admin'

  if (req.user.role !== 'admin') {
    // User is authenticated but doesn't have admin role
    // Use 403 Forbidden (authenticated but not authorized)
    return res.status(403).json({
      error: 'Admin access required',
      code: 'NOT_ADMIN'
    });
  }

  // =========================================================================
  // ALL CHECKS PASSED
  // =========================================================================
  // User is authenticated AND has admin role
  // Continue to the next middleware/route handler

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
 * 1. If user provides valid token: req.user = user object (identified)
 * 2. If user provides invalid/expired token: Silently ignore it
 * 3. If user provides no token: req.user = undefined (anonymous)
 * 4. In ALL cases: Continue to route handler (never block)
 *
 * USE THIS FOR:
 * - Public/shared content viewable by anyone
 * - Routes that offer extra features for logged-in users
 * - Search endpoints that work for everyone
 * - Public profiles or shared notes
 *
 * @param {Object} req - Express request object
 *   - May or may not have Authorization header or cookie
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * AFTER THIS MIDDLEWARE:
 * - req.user = user object (if authenticated) or undefined (if not)
 * - Route handler should ALWAYS check if (req.user) before using it
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get a shared note - anyone can view, owner can edit
 * router.get('/shared/:id',
 *   optionalAuth,  // Try to identify user (won't block)
 *   async (req, res) => {
 *     const note = await Note.findById(req.params.id);
 *     const response = { note };
 *
 *     if (req.user) {
 *       // User is logged in - check permissions
 *       response.canEdit = note.userId.equals(req.user._id);
 *       response.canDelete = note.userId.equals(req.user._id);
 *     } else {
 *       // User is not logged in - read-only
 *       response.canEdit = false;
 *       response.canDelete = false;
 *     }
 *
 *     res.json(response);
 *   }
 * );
 * ```
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // =========================================================================
    // TRY TO EXTRACT TOKEN
    // =========================================================================
    // Look for token in Authorization header or cookies
    // If no token exists, getTokenFromRequest returns null

    const token = getTokenFromRequest(req);

    // =========================================================================
    // IF TOKEN EXISTS, VERIFY AND ATTACH USER
    // =========================================================================
    // If user provided credentials, verify them
    // If verification fails, we silently ignore it (unlike requireAuth)

    if (token) {
      // Verify the JWT token signature and expiration
      // jwt.verify() throws if token is invalid or expired
      const decoded = jwt.verify(token, JWT_SECRET);

      // Look up user in database
      const user = await User.findById(decoded.userId);

      // Only attach if user exists AND account is active
      // This prevents disabled/suspended users from using the app
      // even if they had an old valid token
      if (user && user.status === 'active') {
        req.user = user;
      }
      // If user doesn't exist or isn't active:
      // Just leave req.user undefined and continue
      // (different from requireAuth which would return an error)
    }

    // =========================================================================
    // ALWAYS CONTINUE
    // =========================================================================
    // Whether we found a user or not, continue to route handler
    // This is the key difference from requireAuth which returns errors

  } catch (error) {
    // Token verification failed (invalid signature, expired, malformed)
    // For optional auth, we just ignore the bad token
    // The user is treated as anonymous
    // (If we logged in as "no user" due to bad token, app still works)
  }

  // Always proceed to next middleware/route handler
  // req.user may be set or undefined - caller must handle both cases
  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export all middleware functions.
 *
 * USAGE:
 * import { requireAuth, requireAdmin, optionalAuth } from './middleware/auth.js';
 *
 * Or import the default object:
 * import auth from './middleware/auth.js';
 * Then use: auth.requireAuth, auth.requireAdmin, etc.
 */
export default { requireAuth, requireAdmin, optionalAuth };
