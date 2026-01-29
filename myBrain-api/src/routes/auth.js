/**
 * =============================================================================
 * AUTH.JS - Authentication Routes
 * =============================================================================
 *
 * This file handles all authentication-related API endpoints for myBrain.
 * Authentication is how the application verifies who users are before
 * allowing them to access their data.
 *
 * WHAT IS AUTHENTICATION?
 * -----------------------
 * Authentication is the process of proving your identity to a system.
 * Think of it like showing your ID at a bar - you prove who you are
 * before you're allowed in. In web apps, this is typically done with:
 * - Email + Password (most common)
 * - Social login (Google, Facebook)
 * - Magic links (email-based login)
 *
 * HOW AUTHENTICATION WORKS IN THIS APP:
 * -------------------------------------
 * 1. USER REGISTERS: Creates account with email + password
 * 2. PASSWORD HASHED: Password is encrypted (bcrypt) before storing
 * 3. JWT CREATED: A secure "ticket" is generated (JSON Web Token)
 * 4. COOKIE SET: The JWT is stored in a browser cookie
 * 5. FUTURE REQUESTS: Browser sends cookie, server verifies JWT
 *
 * SECURITY FEATURES:
 * ------------------
 * 1. RATE LIMITING: Only 10 login attempts per 15 minutes
 * 2. PASSWORD HASHING: Passwords never stored in plain text
 * 3. HTTP-ONLY COOKIES: JavaScript can't read the auth token
 * 4. JWT EXPIRATION: Tokens expire after 7 days
 *
 * ENDPOINTS IN THIS FILE:
 * -----------------------
 * - POST /auth/register - Create new account
 * - POST /auth/login - Sign in to existing account
 * - POST /auth/logout - Sign out (clear cookie)
 * - GET /auth/me - Get current user's info
 * - GET /auth/subscription - Get user's plan limits and usage
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Express is the web framework that handles HTTP requests.
 * We create a "router" to group related routes together.
 */
import express from 'express';

/**
 * bcryptjs is a library for hashing passwords.
 * HASHING: Converting a password into a scrambled version that can't
 * be reversed. Even if someone steals the database, they can't see passwords.
 *
 * Example: "password123" → "$2a$10$N9qo8uLOickgx2ZMRZoMy..."
 */
import bcrypt from 'bcryptjs';

/**
 * jsonwebtoken (JWT) creates secure tokens for authentication.
 * A JWT is like a signed ticket that proves who you are.
 *
 * STRUCTURE OF A JWT:
 * - Header: Algorithm used (how it was signed)
 * - Payload: Data (user ID, expiration time)
 * - Signature: Cryptographic proof the token is valid
 */
import jwt from 'jsonwebtoken';

/**
 * express-rate-limit prevents brute force attacks.
 * BRUTE FORCE: Trying thousands of passwords until one works.
 * Rate limiting blocks users after too many failed attempts.
 */
import rateLimit from 'express-rate-limit';

/**
 * User model for database operations.
 */
import User from '../models/User.js';

/**
 * RoleConfig defines limits and features for different user tiers.
 * Example: Free users get 100 notes, premium gets 10,000.
 */
import RoleConfig from '../models/RoleConfig.js';

/**
 * SystemSettings stores global configuration including rate limit settings.
 */
import SystemSettings from '../models/SystemSettings.js';

/**
 * RateLimitEvent tracks rate limit events for admin visibility and alerts.
 */
import RateLimitEvent from '../models/RateLimitEvent.js';

/**
 * requireAuth middleware ensures a route is only accessible
 * to logged-in users.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError helper for structured error logging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * attachEntityId helper for Wide Events logging.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Create an Express router for authentication routes.
 * This router will be mounted at /auth in the main app.
 */
const router = express.Router();

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/**
 * JWT_SECRET
 * ----------
 * The secret key used to sign JWTs. This MUST be kept secret.
 * If someone knows this key, they can create fake tokens.
 *
 * In development: Uses 'dev-secret-change-in-production'
 * In production: MUST be set via environment variable
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * JWT_EXPIRES_IN
 * --------------
 * How long a JWT is valid before the user must log in again.
 * '7d' means 7 days.
 *
 * TRADEOFF:
 * - Longer = More convenient (less frequent logins)
 * - Shorter = More secure (stolen tokens expire sooner)
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * BCRYPT_ROUNDS
 * -------------
 * How many times to hash the password. Higher = more secure but slower.
 * 10 rounds takes about 100ms on modern hardware.
 *
 * Each +1 doubles the time. 10 rounds = 2^10 = 1024 iterations.
 */
const BCRYPT_ROUNDS = 10;

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Rate Limit Configuration Cache
 * ------------------------------
 * Cache the rate limit config to avoid hitting the database on every request.
 * Refreshes every 60 seconds to pick up admin changes.
 */
let rateLimitConfigCache = null;
let rateLimitConfigCacheTime = 0;
const RATE_LIMIT_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * getRateLimitConfig()
 * --------------------
 * Get rate limit configuration from database (with caching).
 */
async function getRateLimitConfig() {
  const now = Date.now();
  if (rateLimitConfigCache && (now - rateLimitConfigCacheTime) < RATE_LIMIT_CACHE_TTL) {
    return rateLimitConfigCache;
  }

  try {
    rateLimitConfigCache = await SystemSettings.getRateLimitConfig();
    rateLimitConfigCacheTime = now;
    return rateLimitConfigCache;
  } catch (error) {
    console.error('[RATE_LIMIT] Failed to fetch config from database:', error.message);
    // Return defaults if database fails
    return {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxAttempts: 10,
      trustedIPs: []
    };
  }
}

/**
 * Trusted IPs from environment (legacy support).
 * These are merged with database-configured trusted IPs.
 */
const envTrustedIPs = (process.env.TRUSTED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

/**
 * authLimiter
 * -----------
 * Rate limiter specifically for authentication routes.
 * Prevents brute force password guessing attacks.
 *
 * SETTINGS:
 * - windowMs: 15 minutes (900,000 milliseconds) - configurable via admin panel
 * - max: 10 attempts per window - configurable via admin panel
 *
 * EXAMPLE:
 * If someone tries 10 wrong passwords in 15 minutes, they're blocked
 * until the window resets. This makes guessing passwords impractical.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (default, can be overridden)
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // High limit for tests
  message: {
    error: 'Too many attempts, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => {
    // In test environment, don't rate limit
    if (process.env.NODE_ENV === 'test') return true;

    try {
      const config = await getRateLimitConfig();

      // If rate limiting is disabled globally, skip
      if (!config.enabled) {
        return true;
      }

      // Check if IP is trusted (database config + env vars)
      const clientIP = req.ip || req.connection?.remoteAddress;
      const allTrustedIPs = [...(config.trustedIPs || []), ...envTrustedIPs];
      const isTrusted = allTrustedIPs.includes(clientIP);

      if (isTrusted) {
        console.log(`[AUTH] IP "${clientIP}" is whitelisted - bypassing rate limit`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[RATE_LIMIT] Error in skip check:', error.message);
      // On error, don't skip (enforce rate limiting as safety default)
      return false;
    }
  },
  handler: async (req, res, next, options) => {
    const clientIP = req.ip || req.connection?.remoteAddress;
    const attemptedEmail = req.body?.email || 'unknown';

    console.warn(`[RATE_LIMIT] IP: ${clientIP}, Email: ${attemptedEmail}, Route: ${req.path}`);

    // Record the rate limit event in the database
    try {
      await RateLimitEvent.recordEvent({
        ip: clientIP,
        attemptedEmail,
        route: req.path,
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin')
      });
    } catch (error) {
      console.error('[RATE_LIMIT] Failed to record event:', error.message);
      // Don't fail the request if recording fails
    }

    // Attach entity IDs for structured log querying
    attachEntityId(req, 'ip', clientIP);
    attachEntityId(req, 'attemptedEmail', attemptedEmail);
    attachEntityId(req, 'route', req.path);

    // Attach to request for logging middleware
    req.eventName = 'auth.rate_limited';
    req.rateLimitInfo = {
      ip: clientIP,
      attemptedEmail,
      route: req.path,
      timestamp: new Date().toISOString()
    };

    // Send the rate limit response
    res.status(429).json(options.message);
  }
});

// =============================================================================
// COOKIE CONFIGURATION
// =============================================================================

/**
 * getCookieOptions()
 * ------------------
 * Returns the settings for the authentication cookie.
 *
 * COOKIE OPTIONS EXPLAINED:
 *
 * httpOnly: true
 *   - JavaScript CANNOT read this cookie
 *   - Protects against XSS attacks (malicious scripts stealing tokens)
 *
 * secure: true (production only)
 *   - Cookie only sent over HTTPS
 *   - Prevents interception on insecure networks
 *
 * sameSite: 'none' (production) or 'lax' (development)
 *   - 'none': Cookie sent with cross-origin requests (needed for CORS)
 *   - 'lax': Cookie only sent with same-site requests (more secure)
 *
 * maxAge: 7 days
 *   - How long the cookie lasts before browser deletes it
 *   - Matches the JWT expiration
 *
 * @returns {Object} Cookie options object
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

// =============================================================================
// ROUTE: POST /auth/register
// =============================================================================

/**
 * POST /auth/register
 * -------------------
 * Creates a new user account.
 *
 * REQUEST BODY:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123"
 * }
 *
 * PROCESS:
 * 1. Validate email and password provided
 * 2. Check password meets minimum length (8 chars)
 * 3. Check email isn't already registered
 * 4. Hash the password (never store plain text!)
 * 5. Create user in database
 * 6. Generate JWT for immediate login
 * 7. Set auth cookie and return user data
 *
 * SUCCESS RESPONSE (201 Created):
 * {
 *   "message": "Account created successfully",
 *   "user": { ... user data ... },
 *   "token": "eyJhbGc..." (for cross-origin clients)
 * }
 *
 * ERROR RESPONSES:
 * - 400: Missing fields or password too short
 * - 409: Email already exists
 * - 500: Server error
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    // =========================================================================
    // EXTRACT REQUEST DATA
    // =========================================================================

    const { email, password } = req.body;

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================

    // Check both fields are provided
    if (!email || !password) {
      req.eventName = 'auth.register.missing_fields';
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Attach email for logging (useful for debugging patterns)
    attachEntityId(req, 'attemptedEmail', email.toLowerCase());

    // Enforce minimum password length for security
    // Longer passwords are harder to crack
    if (password.length < 8) {
      req.eventName = 'auth.register.password_too_short';
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // =========================================================================
    // CHECK FOR EXISTING USER
    // =========================================================================

    // Convert email to lowercase for consistent comparison
    // "User@Email.com" and "user@email.com" should be treated as the same
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      req.eventName = 'auth.register.email_exists';
      // 409 Conflict - resource (email) already exists
      return res.status(409).json({
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // =========================================================================
    // HASH PASSWORD
    // =========================================================================

    // NEVER store plain text passwords
    // bcrypt.hash(password, rounds) creates a secure hash
    // The hash includes a random "salt" to prevent rainbow table attacks
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // =========================================================================
    // CREATE USER
    // =========================================================================

    // Create new user document
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
    });

    // Save to database
    // This triggers Mongoose validation (email format, etc.)
    await user.save();

    // Attach entity ID for logging
    attachEntityId(req, 'userId', user._id);
    req.eventName = 'auth.register.success';

    // =========================================================================
    // GENERATE JWT
    // =========================================================================

    // Create a token containing the user's ID
    // jwt.sign(payload, secret, options)
    const token = jwt.sign(
      { userId: user._id },  // Payload - data stored in token
      JWT_SECRET,            // Secret key for signing
      { expiresIn: JWT_EXPIRES_IN }  // Token expiration
    );

    // =========================================================================
    // SET COOKIE AND RESPOND
    // =========================================================================

    // Set HTTP-only cookie for same-origin requests
    res.cookie('token', token, getCookieOptions());

    // Get role config for feature flags (what features this user can access)
    const roleConfig = await RoleConfig.getConfig(user.role);

    // 201 Created - new resource was created
    res.status(201).json({
      message: 'Account created successfully',
      user: user.toSafeJSON(roleConfig),  // Exclude sensitive data like password
      token  // Include token for cross-origin clients (mobile apps, etc.)
    });

  } catch (error) {
    // Attach error info for logging
    attachError(req, error, { operation: 'register' });

    // =========================================================================
    // HANDLE VALIDATION ERRORS
    // =========================================================================

    // Mongoose validation errors (invalid email format, etc.)
    if (error.name === 'ValidationError') {
      req.eventName = 'auth.register.validation_error';
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Generic server error
    req.eventName = 'auth.register.error';
    res.status(500).json({
      error: 'Failed to create account',
      code: 'REGISTER_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /auth/login
// =============================================================================

/**
 * POST /auth/login
 * ----------------
 * Authenticates a user and returns a session token.
 *
 * REQUEST BODY:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123"
 * }
 *
 * PROCESS:
 * 1. Validate email and password provided
 * 2. Find user by email
 * 3. Check account isn't disabled
 * 4. Verify password matches hash
 * 5. Update last login timestamp
 * 6. Generate new JWT
 * 7. Set auth cookie and return user data
 *
 * SECURITY NOTE:
 * We return the same error message for "user not found" and "wrong password"
 * to prevent email enumeration attacks (checking which emails have accounts).
 *
 * SUCCESS RESPONSE (200 OK):
 * {
 *   "message": "Login successful",
 *   "user": { ... user data ... },
 *   "token": "eyJhbGc..."
 * }
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================

    if (!email || !password) {
      req.eventName = 'auth.login.missing_fields';
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Attach email for logging (useful even on failure for debugging patterns)
    attachEntityId(req, 'attemptedEmail', email.toLowerCase());

    // =========================================================================
    // FIND USER
    // =========================================================================

    // Use .select('+passwordHash') to include password field
    // By default, passwordHash is excluded from queries (select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      // Use generic message to prevent email enumeration
      // Log as invalid_credentials (same as wrong password) for security
      req.eventName = 'auth.login.invalid_credentials';
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Attach userId now that we found the user (even for failures below)
    attachEntityId(req, 'userId', user._id);

    // =========================================================================
    // CHECK ACCOUNT STATUS
    // =========================================================================

    // Disabled accounts cannot log in
    // Accounts might be disabled for policy violations
    if (user.status === 'disabled') {
      req.eventName = 'auth.login.account_disabled';
      return res.status(403).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // =========================================================================
    // VERIFY PASSWORD
    // =========================================================================

    // bcrypt.compare() securely compares the password to the hash
    // It handles the salt extraction and hashing automatically
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      // Same error message as "user not found" for security
      req.eventName = 'auth.login.invalid_credentials';
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // =========================================================================
    // UPDATE LAST LOGIN
    // =========================================================================

    // Track when users last logged in (useful for analytics/security)
    user.lastLoginAt = new Date();
    await user.save();

    // =========================================================================
    // SET UP REQUEST FOR LOGGING
    // =========================================================================

    // Attach user to request so logging middleware can capture userId
    req.user = user;
    // Attach entity ID for logging
    attachEntityId(req, 'userId', user._id);
    // Set event name for activity tracking
    req.eventName = 'auth.login.success';

    // =========================================================================
    // GENERATE JWT AND SET COOKIE
    // =========================================================================

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, getCookieOptions());

    // Get role config for feature flags
    const roleConfig = await RoleConfig.getConfig(user.role);

    res.json({
      message: 'Login successful',
      user: user.toSafeJSON(roleConfig),
      token
    });

  } catch (error) {
    attachError(req, error, { operation: 'login' });
    req.eventName = 'auth.login.error';
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /auth/logout
// =============================================================================

/**
 * POST /auth/logout
 * -----------------
 * Signs the user out by clearing the auth cookie.
 *
 * No request body required.
 *
 * PROCESS:
 * 1. Try to extract user from token for activity logging
 * 2. Clear the auth cookie
 * 3. Return success message
 *
 * NOTE:
 * This endpoint doesn't require authentication (requireAuth middleware)
 * because we want to allow logging out even with an expired token.
 *
 * SUCCESS RESPONSE (200 OK):
 * {
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', async (req, res) => {
  // =========================================================================
  // TRY TO IDENTIFY USER FOR LOGGING
  // =========================================================================

  // Even though we're logging out, try to get user info for activity tracking
  const token = req.cookies?.token;

  if (token) {
    try {
      // Verify the token and get user ID
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        req.user = user;  // For activity logging
        attachEntityId(req, 'userId', user._id);
      }
    } catch (err) {
      // Token invalid or expired - that's fine for logout
      // We still want to clear the cookie
    }
  }

  // Set event name for activity tracking
  req.eventName = 'auth.logout.success';

  // =========================================================================
  // CLEAR AUTH COOKIE
  // =========================================================================

  // Use same settings as when setting the cookie
  // Browser needs matching path/domain/etc. to delete the right cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.json({
    message: 'Logged out successfully'
  });
});

// =============================================================================
// ROUTE: GET /auth/me
// =============================================================================

/**
 * GET /auth/me
 * ------------
 * Returns the currently authenticated user's information.
 * This is how the frontend checks if the user is logged in
 * and gets their profile data.
 *
 * REQUIRES: Authentication (valid JWT)
 *
 * USAGE:
 * - Called on app startup to check login status
 * - Called after page refresh to restore user state
 * - Called after profile updates to get fresh data
 *
 * SUCCESS RESPONSE (200 OK):
 * {
 *   "user": {
 *     "_id": "...",
 *     "email": "user@example.com",
 *     "role": "user",
 *     "profile": { ... },
 *     "featureFlags": { ... }
 *   }
 * }
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Attach user ID for logging
    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'auth.me.success';

    // Get role config to include feature flags
    const roleConfig = await RoleConfig.getConfig(req.user.role);

    res.json({
      user: req.user.toSafeJSON(roleConfig)
    });
  } catch (error) {
    // If role config fetch fails, return user without feature flags
    // This is a graceful degradation - better to return something than error
    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'auth.me.fallback';
    res.json({
      user: req.user.toSafeJSON()
    });
  }
});

// =============================================================================
// ROUTE: GET /auth/subscription
// =============================================================================

/**
 * GET /auth/subscription
 * ----------------------
 * Returns the user's subscription info, resource limits, and current usage.
 * This allows the frontend to show usage meters and limit warnings.
 *
 * REQUIRES: Authentication (valid JWT)
 *
 * RETURNS:
 * {
 *   "role": "user",                    // user, premium, admin
 *   "roleLabel": "User",               // Display name
 *   "limits": {
 *     "notes": 100,                    // Max notes allowed
 *     "tasks": 500,                    // Max tasks allowed
 *     "images": 50,                    // Max images allowed
 *     "storage": 104857600             // Max storage in bytes (100MB)
 *   },
 *   "usage": {
 *     "notes": 45,                     // Current note count
 *     "tasks": 120,                    // Current task count
 *     "images": 10,                    // Current image count
 *     "storage": 52428800              // Current storage used (50MB)
 *   },
 *   "hasOverrides": false,             // True if admin gave extra limits
 *   "overrides": {}                    // Specific limit overrides
 * }
 *
 * FRONTEND USAGE:
 * - Show progress bars: "45 of 100 notes used"
 * - Show upgrade prompts when nearing limits
 * - Disable actions when limits reached
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const user = req.user;

    // Attach user ID for logging
    attachEntityId(req, 'userId', user._id);

    // Get role configuration (default limits for this role)
    const roleConfig = await RoleConfig.getConfig(user.role);

    // Get effective limits (role defaults + any user-specific overrides)
    // Admins can grant extra limits to specific users
    const limits = user.getEffectiveLimits(roleConfig);

    // Get current usage counts from database
    const usage = await user.getCurrentUsage();

    // Build subscription info response
    const subscription = {
      role: user.role,
      roleLabel: user.role.charAt(0).toUpperCase() + user.role.slice(1),  // Capitalize
      limits,
      usage,
      hasOverrides: user.limitOverrides && user.limitOverrides.size > 0,
      overrides: user.limitOverrides ? Object.fromEntries(user.limitOverrides) : {}
    };

    req.eventName = 'auth.subscription.success';
    res.json(subscription);
  } catch (error) {
    attachError(req, error, { operation: 'get_subscription' });
    req.eventName = 'auth.subscription.error';
    res.status(500).json({
      error: 'Failed to get subscription info',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Export the router to be mounted in the main app.
 *
 * USAGE IN SERVER.JS:
 * import authRoutes from './routes/auth.js';
 * app.use('/auth', authRoutes);
 *
 * This makes all routes available at:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - GET /auth/me
 * - GET /auth/subscription
 */
export default router;
