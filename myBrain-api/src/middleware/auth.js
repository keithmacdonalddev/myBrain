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
 * requireAuth - Require User to be Logged In
 * ------------------------------------------
 * This middleware checks if the request includes a valid JWT token.
 * If valid, attaches the user to the request. If not, returns an error.
 *
 * USE THIS FOR:
 * - Any route that needs to know who the user is
 * - Routes that access or modify user-specific data
 * - Routes like /notes, /tasks, /profile
 *
 * WHAT IT DOES:
 * 1. Extract token from request
 * 2. Verify token is valid and not expired
 * 3. Look up the user in the database
 * 4. Check user account status (active, disabled, suspended)
 * 5. Attach user to req.user for route handlers to use
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * ERROR CODES RETURNED:
 * - NO_TOKEN (401): No token provided
 * - INVALID_TOKEN (401): Token is malformed or tampered with
 * - TOKEN_EXPIRED (401): Token has expired
 * - USER_NOT_FOUND (401): User in token doesn't exist
 * - ACCOUNT_DISABLED (403): User's account is disabled
 * - ACCOUNT_SUSPENDED (403): User's account is suspended
 *
 * EXAMPLE USAGE IN ROUTES:
 * ```
 * router.get('/notes', requireAuth, (req, res) => {
 *   // req.user is now available and contains the logged-in user
 *   const notes = await Note.find({ userId: req.user._id });
 *   res.json(notes);
 * });
 * ```
 */
export const requireAuth = async (req, res, next) => {
  try {
    // -----------------------------------------
    // STEP 1: Get the token from the request
    // -----------------------------------------
    const token = getTokenFromRequest(req);

    // No token = not logged in
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // -----------------------------------------
    // STEP 2: Verify the token
    // -----------------------------------------
    // jwt.verify() does two things:
    // 1. Checks the signature (proves token wasn't tampered with)
    // 2. Checks expiration (throws TokenExpiredError if expired)
    // Returns the decoded payload (contains userId)
    const decoded = jwt.verify(token, JWT_SECRET);

    // -----------------------------------------
    // STEP 3: Look up the user in database
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
    // STEP 4: Check account status
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
    // STEP 5: Attach user to request
    // -----------------------------------------
    // All checks passed! Attach user for route handlers to use
    req.user = user;

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
 * requireAdmin - Require Admin Role
 * ---------------------------------
 * This middleware checks if the user is an administrator.
 * MUST be used AFTER requireAuth (user must be logged in first).
 *
 * USE THIS FOR:
 * - Admin panel routes
 * - User management endpoints
 * - System configuration endpoints
 * - Moderation actions
 *
 * @param {Object} req - Express request object (must have req.user from requireAuth)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * EXAMPLE USAGE:
 * ```
 * // Use both middlewares - requireAuth first, then requireAdmin
 * router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
 *   // Only admins reach this code
 *   const users = await User.find();
 *   res.json(users);
 * });
 * ```
 */
export const requireAdmin = (req, res, next) => {
  // User should already be attached by requireAuth
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'NOT_ADMIN'
    });
  }

  // User is an admin, continue to route handler
  next();
};

/**
 * optionalAuth - Attach User if Logged In (Optional)
 * --------------------------------------------------
 * This middleware tries to identify the user but doesn't require them
 * to be logged in. Useful for routes that work for everyone but show
 * personalized content for logged-in users.
 *
 * USE THIS FOR:
 * - Public pages that show extra features for logged-in users
 * - Shared content that anyone can view
 * - API endpoints where authentication is optional
 *
 * BEHAVIOR:
 * - If valid token: req.user is set to the user object
 * - If no token or invalid: req.user is undefined, but request continues
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * EXAMPLE USAGE:
 * ```
 * router.get('/shared/:id', optionalAuth, (req, res) => {
 *   const content = await getSharedContent(req.params.id);
 *
 *   if (req.user) {
 *     // User is logged in, show personalized features
 *     content.canEdit = content.ownerId === req.user._id;
 *   }
 *
 *   res.json(content);
 * });
 * ```
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Try to get the token
    const token = getTokenFromRequest(req);

    // If there's a token, try to identify the user
    if (token) {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Look up the user
      const user = await User.findById(decoded.userId);

      // Only attach if user exists and is active
      // (don't let disabled/suspended users through even optionally)
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  } catch (error) {
    // Token invalid or expired - that's fine for optional auth
    // Just don't attach a user and continue
  }

  // Always continue to the next middleware/route handler
  // (unlike requireAuth which can return early with an error)
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
