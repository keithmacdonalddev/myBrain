/**
 * =============================================================================
 * LOGS.JS - Error & Request Logging Routes
 * =============================================================================
 *
 * This file handles logging in myBrain - recording errors, requests, and
 * other important events for monitoring and debugging purposes.
 *
 * WHY DO WE LOG?
 * ---------------
 * Logging helps us:
 * - Find and fix bugs (see what went wrong)
 * - Monitor system health (detect problems early)
 * - Understand user behavior (analytics)
 * - Investigate security issues (audit trail)
 * - Improve performance (identify slow operations)
 *
 * TWO TYPES OF LOGS IN MYBRAIN:
 * ------------------------------------
 * 1. CLIENT ERRORS: Errors from the frontend/browser
 *    - JavaScript crashes
 *    - React component errors
 *    - Network failures
 *    - User actions that failed
 *
 * 2. SERVER LOGS: Errors and requests on the backend
 *    - Database errors
 *    - API request failures
 *    - Authentication issues
 *    - Performance metrics
 *
 * WHAT GETS LOGGED?
 * ------------------
 * CLIENT ERRORS:
 * - Error type (JavaScript, React boundary, etc.)
 * - Error message and stack trace
 * - Which component crashed
 * - URL where error occurred
 * - Browser info (user agent)
 * - Session ID for tracking
 *
 * SERVER LOGS (Backend):
 * - Request method and URL
 * - Response status code
 * - Time taken to process
 * - User who made request
 * - Any errors encountered
 * - Entity IDs involved (for searching)
 *
 * WIDE EVENTS LOGGING PATTERN:
 * ----------------------------
 * myBrain uses "Wide Events" approach:
 * ONE comprehensive log entry per API request with full context
 * (instead of many small scattered logs)
 *
 * WHAT'S LOGGED IN EACH REQUEST:
 * - eventName: What happened (e.g., "note.create.success")
 * - userId: Who did it
 * - entityIds: What items involved (note ID, task ID, etc.)
 * - mutation: Before/after data for updates
 * - statusCode: Success or error
 * - duration: How long request took
 * - metadata: Additional context
 *
 * PRIVACY & RETENTION:
 * --------------------
 * - Logs automatically deleted after 90 days
 * - Personal data only included when necessary
 * - Logs only available to admins and system
 * - Rate limiting prevents log flooding
 *
 * ENDPOINTS:
 * -----------
 * - POST /logs/client-error - Frontend reports an error
 * - GET /admin/logs - Admin views all logs (admin only)
 * - GET /admin/logs/:id - Admin views single log entry
 * - DELETE /admin/logs - Admin can delete logs (admin only)
 *
 * CLIENT-SIDE ERROR REPORTING:
 * ----------------------------
 * Frontend automatically sends:
 * - Uncaught JavaScript errors
 * - React error boundary catches
 * - Network request failures
 * - User can also report issues manually
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (POST, GET)
 * - Define routes (URLs that the frontend can call)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * nanoid is a library for generating secure random IDs.
 * We use it to create unique requestIds for client error logs.
 * This makes it easy to track and search for specific errors later.
 */
import { nanoid } from 'nanoid';

/**
 * Log model represents a request log entry in the database.
 * Stores all information about API requests (method, route, status, errors, duration).
 * Used for monitoring, debugging, analytics, and audit trails.
 */
import Log from '../models/Log.js';

const router = express.Router();

/**
 * POST /logs/client-error
 * Receive and log frontend errors from browser
 *
 * PURPOSE:
 * Receives error reports from the frontend (browser) and stores them for debugging.
 * Frontend automatically captures JavaScript errors, React crashes, network failures,
 * and other runtime issues that occur in the browser.
 *
 * WHY IS THIS IMPORTANT?
 * - Frontend errors occur in user's browser - backend never sees them directly
 * - This endpoint lets frontend send error data to backend for centralized logging
 * - Helps developers find and fix client-side bugs by seeing real user errors
 * - Can identify patterns across many users (e.g., "Safari has this bug")
 * - Provides error request IDs users can share for support tickets
 *
 * ERROR TYPES CAPTURED:
 * - JavaScript: Uncaught JavaScript errors and exceptions
 * - ReactError: Component render errors from error boundaries
 * - NetworkError: API request failures and timeouts
 * - UserAction: Errors triggered by user actions (form submissions, etc)
 * - NetworkTimeout: Slow or failed network requests
 *
 * AUTHENTICATION:
 * This endpoint is PUBLIC (no auth required) because:
 * - Errors might happen before user logs in (auth page errors)
 * - Errors might break authentication itself (login failures)
 * - Want to capture ALL errors, not just authenticated user errors
 * - Unauthenticated users still need their errors logged
 *
 * ERROR SAMPLING & RETENTION:
 * - All client errors are sampled (100% sampling for client errors)
 * - Logs automatically deleted after 90 days (privacy/storage management)
 * - Client errors marked with priority sampling to ensure they're visible
 *
 * USE CASES:
 * - User gets blank page → JavaScript error sent to help diagnose
 * - Component crashes → React error boundary sends error details
 * - Network request fails → Browser sends error with response details
 * - User reports "app broken" → Error log shows exact failure point
 * - Performance debugging → Stack trace helps developers identify bottlenecks
 *
 * @body {string} errorType - Error type identifier (required)
 *   Enum: "JavaScriptError", "ReactError", "NetworkError", "UserAction", etc.
 * @body {string} message - Error message text (required)
 *   Example: "Cannot read property 'name' of undefined"
 * @body {string} stack - JavaScript call stack showing where error occurred (optional)
 *   Example: "Error: at Object.<anonymous> (app.js:123:45)"
 * @body {string} componentStack - React component stack if React error (optional)
 *   Example: "in App > Dashboard > TaskList"
 * @body {string} url - Page URL where error occurred (optional)
 *   Example: "https://app.com/notes?filter=active"
 * @body {string} userAgent - Browser user agent string (optional)
 *   Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
 * @body {string} userId - User ID if user was logged in when error occurred (optional)
 *   Example: "507f1f77bcf86cd799439011"
 * @body {string} sessionId - Session ID for tracking related errors (optional)
 * @body {object} metadata - Additional custom data for debugging (optional)
 *   Example: { formName: "login", attemptNumber: 3 }
 *
 * @returns {Object} - Success response with unique requestId:
 * {
 *   success: true,
 *   requestId: "client_a1b2c3d4e5f6g7h8"
 * }
 *
 * @throws {400} - Missing required fields (errorType or message)
 * @throws {500} - Database error when saving log entry
 *
 * EXAMPLE REQUEST:
 * POST /logs/client-error
 * Content-Type: application/json
 * {
 *   "errorType": "JavaScriptError",
 *   "message": "Cannot read property 'name' of undefined",
 *   "stack": "TypeError: Cannot read property 'name' of undefined\n    at getUserName (app.js:123:45)\n    at Dashboard (app.js:456:20)",
 *   "url": "https://app.myBrain.com/dashboard?timezone=UTC",
 *   "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
 *   "userId": "507f1f77bcf86cd799439011",
 *   "sessionId": "sess_abc123xyz789",
 *   "metadata": {
 *     "component": "UserProfile",
 *     "action": "loadUserData",
 *     "latency": 1234
 *   }
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "success": true,
 *   "requestId": "client_a1b2c3d4e5f6g7h8"
 * }
 */
router.post('/client-error', async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Extract Error Details from Request
    // =============================================================================
    // Frontend sends comprehensive error information for debugging
    const {
      errorType,      // What type of error (JavaScript, React, Network, etc.)
      message,        // Error message text - the key error description
      stack,          // Call stack showing where error happened (helps pinpoint issue)
      componentStack, // React component stack (if React error - shows component hierarchy)
      url,            // What URL was user on when error occurred?
      userAgent,      // What browser/device? (helps identify browser-specific bugs)
      userId,         // User ID (if logged in) - helps correlate errors to specific users
      sessionId,      // Session ID for tracking - groups related errors from same session
      metadata        // Additional custom data for context-specific debugging
    } = req.body;

    // =============================================================================
    // STEP 2: Validate Required Fields
    // =============================================================================
    // errorType and message are REQUIRED - without these we can't categorize the error
    // WHY: Minimal error data without these fields is not useful for debugging
    if (!errorType || !message) {
      return res.status(400).json({
        error: {
          message: 'errorType and message are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // =============================================================================
    // STEP 3: Create Unique ID for This Error Log Entry
    // =============================================================================
    // nanoid generates cryptographically secure random string for tracking
    // Format: "client_" + 16 random alphanumeric characters
    // Used as unique identifier for this specific error occurrence
    const uniqueRequestId = `client_${nanoid(16)}`;

    // =============================================================================
    // STEP 4: Build Complete Log Entry Document
    // =============================================================================
    // Create a comprehensive log record with all error details, context, and metadata
    const logEntry = new Log({
      // Request identification
      requestId: uniqueRequestId,                 // Unique ID for this error (can be searched later)
      timestamp: new Date(),                      // When the error occurred
      route: url || '/client',                    // What page was user on?
      method: 'CLIENT',                           // Marks this as client error (not HTTP request)

      // Response/Status info
      statusCode: 0,                              // Client errors don't have HTTP status code
      durationMs: 0,                              // Client errors logged immediately (no duration)

      // User and session tracking
      userId: userId || null,                     // Who was affected? (null if not logged in)

      // Event naming for analytics/searching
      eventName: `client.${errorType}`,           // Event name: client.JavaScriptError, etc.

      // Logging control (Wide Events sampling)
      sampled: true,                              // Always sample client errors (they're important!)
      sampleReason: 'client_error',               // Mark why we're sampling this (for audit trail)

      // Complete error details
      error: {
        category: 'client',                       // This is a client-side error (not server)
        code: errorType,                          // Error code/type for classification
        name: errorType,                          // Error name (same as code for consistency)
        messageSafe: message,                     // Error message (safe to display to users)
        stack: stack || null,                     // Call stack for debugging (where error occurred)
        context: {
          componentStack: componentStack || null, // React component stack if applicable
          url: url || null,                       // Page URL where error happened
          sessionId: sessionId || null            // Session ID for grouping related errors
        }
      },

      // Client information for debugging
      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || null,  // IP address (can identify VPN/proxy usage)
        userAgent: userAgent || req.get('User-Agent') || null, // Browser/device info (identify browser bugs)
        origin: req.get('Origin') || null                      // What domain sent this? (security check)
      },

      // Custom metadata for context-specific debugging
      metadata: metadata || {}
    });

    // =============================================================================
    // STEP 5: Save Error Log to Database
    // =============================================================================
    // Persist the error log so it can be searched, analyzed, and debugged later
    // Error is now available in /admin/logs for admins to review
    await logEntry.save();

    // =============================================================================
    // STEP 6: Return Success Response with Unique Request ID
    // =============================================================================
    // Frontend receives unique ID that can be shown to user
    // User can include this ID in support tickets for correlation
    res.status(201).json({
      success: true,
      requestId: uniqueRequestId  // User can include this: "Error #client_a1b2c3d4e5f6g7h8"
    });

  } catch (error) {
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    // If logging itself fails, at least log it to console for debugging
    // WHY: Errors in error logging can hide actual issues if not handled
    console.error('Failed to log client error:', error.message);

    // Return friendly error response without exposing internal details
    // Never send stack trace to user (security best practice)
    res.status(500).json({
      error: {
        message: 'Failed to log error',
        code: 'LOG_ERROR'
      }
    });
  }
});

export default router;
