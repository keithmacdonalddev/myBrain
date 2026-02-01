/**
 * =============================================================================
 * ADMIN.JS - Admin Panel Routes
 * =============================================================================
 *
 * This file handles all administrator operations for myBrain.
 * Admins are special users who can manage the platform, users, content, and
 * system settings. Only users with the "admin" role can access these routes.
 *
 * WHAT IS AN ADMIN?
 * -----------------
 * An admin is a superuser who has special permissions to:
 * - View and manage all users
 * - Suspend/warn/moderate users
 * - View system logs and analytics
 * - Manage platform-wide settings
 * - Access database management tools
 * - Configure role permissions
 *
 * KEY ADMIN RESPONSIBILITIES:
 * ---------------------------
 * 1. CONTENT MODERATION: Review flagged content and user reports
 * 2. USER MANAGEMENT: Suspend, warn, or delete misbehaving users
 * 3. SYSTEM MONITORING: Track errors, health, and performance
 * 4. CONFIGURATION: Manage roles, permissions, sidebar layout, tags
 * 5. ANALYTICS: Review usage patterns and engagement metrics
 * 6. DATABASE MANAGEMENT: Export, manage, and monitor database
 *
 * ADMIN ENDPOINTS SUMMARY:
 * ------------------------
 * - GET /admin/inbox - Items needing admin attention
 * - GET /admin/users - List all users with filters
 * - POST /admin/users/:userId/warn - Warn a user
 * - POST /admin/users/:userId/suspend - Suspend a user
 * - POST /admin/users/:userId/unsuspend - Unsuspend a user
 * - GET /admin/reports - View user reports
 * - GET /admin/analytics - Platform analytics
 * - GET /admin/logs - API request logs
 * - POST/GET /admin/system-settings - Configure system settings
 * - POST/GET /admin/role-config - Configure user roles and permissions
 * - POST/GET /admin/sidebar-config - Configure default sidebar
 * - POST /admin/moderation-templates - Manage moderation messages
 *
 * SECURITY NOTES:
 * ---------------
 * - ALL routes require authentication (requireAuth middleware)
 * - ALL routes require admin role (requireAdmin middleware)
 * - All admin actions are logged for audit trail
 * - Never expose non-admin data in error messages
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools and models we need to provide
// admin functionality. We import both external libraries (express, mongoose)
// and internal models, middleware, and services that handle admin operations.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PUT, DELETE)
 * - Define routes (URLs that admins can call)
 * - Use middleware (functions that process requests before route handlers)
 */
import express from 'express';

/**
 * Mongoose is an ODM (Object Document Mapper) for MongoDB.
 * It lets us define data schemas, validate data, and query the database easily.
 * We use it to find and update user records, logs, and configuration.
 */
import mongoose from 'mongoose';

/**
 * bcryptjs is a password hashing library.
 * When admins reset user passwords, we use bcrypt to hash the new password
 * before storing it in the database (we never store plain text passwords).
 */
import bcrypt from 'bcryptjs';

/**
 * Validator is a library for validating and sanitizing input data.
 * We use it to check that emails are valid, strings are safe, etc.
 * This prevents bad data from being stored in the database.
 */
import validator from 'validator';

/**
 * Authentication middleware that checks if a user is logged in.
 * requireAuth ensures only authenticated users can access admin routes.
 * requireAdmin ensures only users with admin role can access these routes.
 */
import { requireAuth, requireAdmin } from '../middleware/auth.js';

/**
 * Error handler middleware to format errors consistently.
 * Allows us to attach error information to requests for logging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logging middleware that tracks which entity is being modified.
 * attachEntityId helps us log which user/note/task was affected by admin actions.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// IMPORTS - Database Models for Admin Operations
// =============================================================================
// These models represent the different types of data in our database.
// We import them so we can query and update records (users, notes, logs, etc).

/**
 * Log - Stores API request logs for system monitoring.
 * We use this to show admins recent server errors and performance metrics.
 */
import Log from '../models/Log.js';

/**
 * User - Stores user accounts (email, password, profile info, role).
 * Admins use this to manage users: suspend, warn, check status, etc.
 */
import User from '../models/User.js';

/**
 * SystemSettings - Stores platform-wide configuration (feature flags, limits).
 * Admins can view and update these settings.
 */
import SystemSettings from '../models/SystemSettings.js';

/**
 * RoleConfig - Stores role definitions (what each role can and can't do).
 * Admins can view and edit role permissions.
 */
import RoleConfig from '../models/RoleConfig.js';

/**
 * SidebarConfig - Stores the default sidebar configuration.
 * Admins can customize what appears in users' sidebars.
 */
import SidebarConfig from '../models/SidebarConfig.js';

/**
 * Note - Stores user notes.
 * Admins use this to view/manage user content during moderation.
 */
import Note from '../models/Note.js';

/**
 * Task - Stores user tasks.
 * Admins use this to view statistics and manage user content.
 */
import Task from '../models/Task.js';

/**
 * Project - Stores user projects (collections of tasks).
 * Admins use this to understand user activity.
 */
import Project from '../models/Project.js';

/**
 * Event - Stores calendar events.
 * Used by admins to track overall platform usage.
 */
import Event from '../models/Event.js';

/**
 * Image - Stores image metadata (not the actual files, just info about them).
 * Admins can see what images users have uploaded.
 */
import Image from '../models/Image.js';

/**
 * LifeArea - Stores life area categories (health, work, relationships, etc).
 * Admins can manage these category templates.
 */
import LifeArea from '../models/LifeArea.js';

/**
 * Tag - Stores user-defined tags for organizing content.
 * Admins can manage tag templates.
 */
import Tag from '../models/Tag.js';

/**
 * Report - Stores user reports (complaints about other users or content).
 * Admins review these reports to decide if action is needed.
 */
import Report from '../models/Report.js';

/**
 * ModerationTemplate - Stores pre-written moderation messages.
 * Admins can use these templates when warning or suspending users
 * instead of typing the same message repeatedly.
 */
import ModerationTemplate from '../models/ModerationTemplate.js';

/**
 * AdminMessage - Messages sent from admins to users (warnings, suspensions, etc).
 * Users can see these messages to understand why they were moderated.
 */
import AdminMessage from '../models/AdminMessage.js';

/**
 * File - Stores file metadata (not the actual files, just info about them).
 * Admins can see what files users have uploaded.
 */
import File from '../models/File.js';

/**
 * Folder - Stores folder structures for organizing files.
 * Admins can manage user folder structures if needed.
 */
import Folder from '../models/Folder.js';

/**
 * RateLimitEvent - Tracks rate limit events for security monitoring.
 * Admins can view rate limit events and manage trusted IPs.
 */
import RateLimitEvent from '../models/RateLimitEvent.js';

/**
 * IP validation utility for validating IP addresses before storing
 * or using in whitelist operations.
 */
import { validateIP, isValidIP } from '../utils/ipValidation.js';

/**
 * Cache invalidation for rate limit config.
 * Called after config changes to ensure immediate effect.
 */
import { invalidateRateLimitConfigCache } from './auth.js';

// =============================================================================
// IMPORTS - Business Logic Services
// =============================================================================
// Services contain reusable business logic for operations like moderation,
// content management, and user management.

/**
 * Moderation service handles user warnings and suspensions.
 * We use this to warn users, suspend them, and manage moderation actions.
 */
import moderationService from '../services/moderationService.js';

/**
 * Admin content service provides operations for managing user content.
 * Admins can use this to delete flagged content, manage archived items, etc.
 */
import adminContentService from '../services/adminContentService.js';

/**
 * Admin social service handles operations on user connections and social features.
 * Admins can manage user relationships and social connections if needed.
 */
import adminSocialService from '../services/adminSocialService.js';

/**
 * Limit service enforces usage limits (how many notes/tasks per user, file sizes).
 * Admins can view and modify these limits.
 */
import limitService from '../services/limitService.js';

/**
 * File service handles file operations (storage, deletion, retrieval).
 * We use this to manage files on behalf of users during moderation.
 */
import * as fileService from '../services/fileService.js';

// Create an Express router to group all admin-related routes together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: SECURITY AND AUTHENTICATION
// =============================================================================
// Protect all admin routes with authentication checks.
// These middleware functions run on EVERY request to an admin route BEFORE
// the route handler executes. If the user isn't authenticated or isn't admin,
// the request is rejected immediately.

/**
 * requireAuth checks that the user is logged in (has a valid JWT token).
 * Without this, anonymous users could access admin routes.
 */
router.use(requireAuth);

/**
 * requireAdmin checks that the authenticated user has the "admin" role.
 * Only special user accounts with role='admin' can access these routes.
 * Regular users will get a 403 Forbidden error.
 */
router.use(requireAdmin);

// =============================================================================
// CONSTANTS AND HELPER FUNCTIONS
// =============================================================================

/**
 * Maximum page size for paginated queries.
 * Prevents clients from requesting too many records at once.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Rate limit configuration constraints.
 * These bounds prevent dangerous settings that could lock out users
 * or make the system unusable.
 */
const RATE_LIMIT_CONSTRAINTS = {
  windowMs: {
    min: 60000,      // 1 minute minimum
    max: 3600000,    // 1 hour maximum (was 24 hours - reduced for safety)
    default: 900000  // 15 minutes
  },
  maxAttempts: {
    min: 3,          // At least 3 attempts (1-2 too restrictive)
    max: 50,         // 50 max (was 100 - reduced)
    default: 10
  },
  alertThreshold: {
    min: 1,
    max: 100,
    default: 5
  },
  alertWindowMs: {
    min: 60000,       // 1 minute
    max: 86400000,    // 24 hours
    default: 3600000  // 1 hour
  }
};

/**
 * escapeRegex(str)
 * ----------------
 * Escapes regex special characters to prevent ReDoS attacks.
 * Used when user input is used in MongoDB regex queries.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for regex
 *
 * EXAMPLE:
 * escapeRegex('test@email.com')  // 'test@email\\.com'
 * escapeRegex('user.*')          // 'user\\.\\*'
 */
function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// ADMIN INBOX - Task-First View for Admin Attention Items
// =============================================================================
// The inbox endpoint provides a dashboard showing what admins need to do TODAY.
// It's called a "task-first" view because it prioritizes urgent actions that
// need immediate attention.

/**
 * GET /admin/inbox
 * Get items that need admin attention
 *
 * This endpoint returns a comprehensive dashboard for admins showing:
 * - Urgent items: Server errors, suspended users waiting for appeal
 * - Items needing review: Warned users, flagged content, user reports
 * - FYI items: New signups, system statistics
 *
 * The endpoint automatically calculates metrics (error rates) and organizes
 * items by priority so admins can quickly see what needs action.
 *
 * @returns {Object} Inbox with urgent, needsReview, fyi, and stats sections
 */
router.get('/inbox', async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Calculate Time Ranges for Queries
    // =============================================================================
    // We need to check recent activity (last hour) vs. daily activity
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);  // 24 hours ago
    const oneHourAgo = new Date(now - 60 * 60 * 1000);      // 1 hour ago

    // =============================================================================
    // STEP 2: Find Users That Need Moderation Attention
    // =============================================================================
    // Query for users who:
    // - Have warnings (moderationStatus.warningCount > 0) - Need review before
    //   escalation to suspension
    // - Are suspended (status: 'suspended') - May be appealing their suspension
    //   and need admin review
    // Sort by most recent warning to show urgent cases first
    const flaggedUsers = await User.find({
      $or: [
        { 'moderationStatus.warningCount': { $gt: 0 } },  // Users with warnings
        { status: 'suspended' },                           // Suspended users
        { 'moderationStatus.isSuspended': true }          // Redundant but explicit
      ]
    })
      .sort({ 'moderationStatus.lastWarningAt': -1, updatedAt: -1 })  // Most recent first
      .limit(10);  // Top 10 priority users only

    // =============================================================================
    // STEP 3: Get Recent Server Errors for System Health
    // =============================================================================
    // Query API request logs for server errors (HTTP status 500+).
    // If error rate is too high, admins need to investigate what's wrong.
    // We only look at the last hour to catch recent issues.
    const recentErrors = await Log.find({
      statusCode: { $gte: 500 },  // Server errors only (400s are client errors)
      timestamp: { $gte: oneHourAgo }  // Last hour only
    })
      .sort({ timestamp: -1 })  // Most recent first
      .limit(10);  // Top 10 errors

    // =============================================================================
    // STEP 4: Calculate Error Rate to Determine System Health
    // =============================================================================
    // Error rate = (errors / total requests) * 100
    // If error rate > 1%, something is likely broken and needs investigation
    const totalRequestsLastHour = await Log.countDocuments({
      timestamp: { $gte: oneHourAgo }
    });
    const errorCountLastHour = await Log.countDocuments({
      statusCode: { $gte: 500 },  // Count only server errors
      timestamp: { $gte: oneHourAgo }
    });
    const errorRate = totalRequestsLastHour > 0
      ? ((errorCountLastHour / totalRequestsLastHour) * 100).toFixed(2)  // As percentage
      : 0;

    // =============================================================================
    // STEP 5: Get New User Signups From Today
    // =============================================================================
    // Track new signups so admins can:
    // - Welcome and encourage new users
    // - Monitor for suspicious registration patterns
    // - Understand growth metrics
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);  // Midnight today
    const newUsersToday = await User.find({
      createdAt: { $gte: todayStart }  // Signed up today
    })
      .sort({ createdAt: -1 })  // Most recent signups first
      .limit(20);  // Top 20 new users

    // =============================================================================
    // STEP 6: Get Overall Platform Statistics
    // =============================================================================
    // Show overall health metrics: how many users, how many active, etc.
    const totalUsers = await User.countDocuments();  // Total registered users
    const activeUsers = await User.countDocuments({ status: 'active' });  // Active (not suspended)
    const onlineRecently = await Log.distinct('userId', {
      timestamp: { $gte: new Date(now - 15 * 60 * 1000) },  // Last 15 minutes
      userId: { $ne: null }  // Skip anonymous requests
    });

    // =============================================================================
    // STEP 7: Organize Items by Priority
    // =============================================================================
    // Create three arrays to hold inbox items organized by urgency:
    // - urgent: Need immediate action (servers down, critical violations)
    // - needsReview: Should be reviewed soon (warned users, minor issues)
    // - fyi: Just for information (growth stats, normal activity)
    const urgent = [];
    const needsReview = [];
    const fyi = [];

    // =============================================================================
    // STEP 8A: Check for Error Spikes
    // =============================================================================
    // If error rate > 1%, the platform is having issues and needs investigation.
    // We only add this as URGENT if it's a significant problem (> 1%).
    // WHY: If errors are rare, they might be normal network hiccups. But >1%
    // suggests a real system problem that could affect user experience.
    if (parseFloat(errorRate) > 1) {
      urgent.push({
        id: 'error-spike',
        type: 'error_spike',
        title: 'Error rate spike detected',
        description: `Error rate is ${errorRate}% (${errorCountLastHour} errors in the last hour). Check logs for details.`,
        priority: 'urgent',  // Mark as URGENT - needs immediate attention
        timestamp: now,
        meta: {
          errorRate,
          errorCount: errorCountLastHour,
          totalRequests: totalRequestsLastHour
        },
        actions: ['view_logs']  // Admin can click to view logs
      });
    }

    // =============================================================================
    // STEP 8B: Add Suspended Users (Appeal Candidates)
    // =============================================================================
    // Filter for users who are currently suspended. These could be:
    // - Users who might appeal their suspension
    // - Users who need their suspension reviewed (was it justified?)
    // - Users who might be unbanned if they changed behavior
    // Mark as URGENT because suspended users may generate complaints.
    const suspendedUsers = flaggedUsers.filter(u =>
      u.status === 'suspended' || u.moderationStatus?.isSuspended
    );
    for (const user of suspendedUsers) {
      urgent.push({
        id: `suspended-${user._id}`,
        type: 'suspended_user',
        title: 'User suspended',
        description: user.moderationStatus?.suspendReason || 'No reason provided',
        priority: 'urgent',  // Suspended users are URGENT
        timestamp: user.moderationStatus?.suspendedAt || user.updatedAt,
        user: user.toSafeJSON(),  // Include safe user info
        actions: ['review', 'unsuspend']  // Admin can unsuspend if appropriate
      });
    }

    // =============================================================================
    // STEP 8C: Add Warned Users (Escalation Candidates)
    // =============================================================================
    // Filter for users who have warnings but aren't suspended yet.
    // These users are at risk of suspension and may be about to be banned.
    // They need review to see if:
    // - More warnings are needed
    // - Escalation to suspension is necessary
    // - The issue is resolved and warnings can be cleared
    const warnedUsers = flaggedUsers.filter(u =>
      u.moderationStatus?.warningCount > 0 &&       // Has warnings
      u.status !== 'suspended' &&                   // Not suspended yet
      !u.moderationStatus?.isSuspended            // Explicitly not suspended
    );
    for (const user of warnedUsers) {
      needsReview.push({
        id: `warned-${user._id}`,
        type: 'warned_user',
        title: `User has ${user.moderationStatus.warningCount} warning(s)`,
        description: 'Review user activity and determine if further action is needed.',
        priority: 'warning',  // NEEDS REVIEW but not as urgent as suspensions
        timestamp: user.moderationStatus?.lastWarningAt || user.updatedAt,
        user: user.toSafeJSON(),
        actions: ['investigate', 'dismiss', 'suspend']  // Admin choices
      });
    }

    // =============================================================================
    // STEP 8D: Add Error Items to Review (If Not Critical)
    // =============================================================================
    // If error rate is NOT critical (> 1%), but there are still some errors,
    // add them to "needs review" instead of "urgent".
    // WHY: Occasional errors are normal and don't need immediate action.
    // Only spikes (>1%) need emergency response.
    if (parseFloat(errorRate) <= 1 && recentErrors.length > 0) {
      needsReview.push({
        id: 'recent-errors',
        type: 'recent_errors',
        title: `${recentErrors.length} server error(s) in the last hour`,
        description: 'Some API requests failed. May need investigation.',
        priority: 'warning',
        timestamp: recentErrors[0]?.timestamp || now,
        meta: {
          errorCount: recentErrors.length,
          routes: [...new Set(recentErrors.map(e => e.route))].slice(0, 3)
        },
        actions: ['view_logs', 'dismiss']
      });
    }

    // =============================================================================
    // STEP 8E: Add New Signups as FYI
    // =============================================================================
    // Track new user signups for:
    // - Welcoming new users
    // - Monitoring growth metrics
    // - Detecting suspicious signup patterns
    // Mark as FYI (informational) - no action required.
    if (newUsersToday.length > 0) {
      fyi.push({
        id: 'new-signups',
        type: 'new_signups',
        title: `${newUsersToday.length} new user${newUsersToday.length === 1 ? '' : 's'} today`,
        // WHY: Show a different message if signups are unusually high
        description: newUsersToday.length > 5
          ? 'Higher than usual signup activity.'  // Might be viral growth or bot attack
          : 'Normal signup activity.',  // Expected daily signups
        priority: 'info',  // FYI only
        timestamp: newUsersToday[0]?.createdAt || now,
        users: newUsersToday.slice(0, 5).map(u => u.toSafeJSON()),
        meta: {
          count: newUsersToday.length
        },
        actions: ['view_users']
      });
    }

    // =============================================================================
    // STEP 9: Return Organized Inbox to Admin
    // =============================================================================
    // Send back all the inbox items organized by priority plus platform statistics.
    // This gives the admin a complete dashboard of what needs action.
    res.json({
      inbox: {
        urgent,       // Items requiring immediate attention
        needsReview,  // Items that should be reviewed soon
        fyi          // Items that are just for information
      },
      stats: {
        totalUsers,          // Total registered user accounts
        activeUsers,         // Users who haven't been suspended
        onlineNow: onlineRecently.length,  // Users active in last 15 min
        errorRate: parseFloat(errorRate),   // Current system error percentage
        newUsersToday: newUsersToday.length  // New signups today
      },
      generatedAt: now  // When this data was generated
    });
  } catch (error) {
    // Error handling: If something goes wrong, log it and return error response
    attachError(req, error, { operation: 'inbox_fetch' });
    res.status(500).json({
      error: 'Failed to fetch inbox',  // Safe generic message
      code: 'INBOX_FETCH_ERROR',       // Error code for debugging
      requestId: req.requestId         // Unique ID to trace this request
    });
  }
});

// =============================================================================
// ADMIN LOGS - System-Wide Request Logging and Search
// =============================================================================
// These endpoints allow admins to search and analyze API request logs.
// Logs are valuable for: debugging issues, understanding user activity patterns,
// finding performance problems, and investigating security incidents.

/**
 * GET /admin/logs
 * Search and filter API request logs (admin only)
 *
 * PURPOSE:
 * Provides advanced searching and filtering to find specific API request logs.
 * Used for debugging, monitoring, analytics, and security investigation.
 *
 * LOG SEARCH CAPABILITIES:
 * - Find by requestId: Locate specific request by unique ID
 * - Find by userId: All requests from a specific user
 * - Find by eventName: All instances of a specific event type
 * - Find by status code: Find errors (500+), auth failures (401), etc.
 * - Find by date range: Logs between two timestamps
 * - Find with error state: Only logs that have errors
 *
 * USE CASES:
 * - Debug: "User reports task creation failed - find the log"
 * - Incident response: "Find all errors in last hour"
 * - User investigation: "What did this user do yesterday?"
 * - Feature analysis: "How many times was notes.create called?"
 * - Performance analysis: "Which API calls are slowest?"
 * - Security: "Find failed login attempts in last 24 hours"
 *
 * EXAMPLE QUERIES:
 * GET /admin/logs?eventName=auth.login.failure&from=2026-01-21T00:00&to=2026-01-21T01:00
 * Find all failed login attempts in the last hour
 *
 * GET /admin/logs?userId=507f1f77bcf86cd799439011
 * Find all requests made by this user
 *
 * GET /admin/logs?statusCode=500
 * Find all server errors
 *
 * GET /admin/logs?minStatusCode=400&maxStatusCode=499
 * Find all client errors
 *
 * @query {string} requestId - Find logs by request ID (unique request identifier)
 *   Example: requestId=req_abc123xyz789
 *   Returns exactly one log (if found)
 *
 * @query {string} userId - Find all logs from a specific user (MongoDB ID)
 *   Example: userId=507f1f77bcf86cd799439011
 *   Returns all requests made by this user
 *
 * @query {string} eventName - Find specific event type (event naming convention)
 *   Examples: auth.login.success, note.create, task.update.success
 *   Returns all logs for this event type
 *
 * @query {number} statusCode - Find specific HTTP status code
 *   Example: statusCode=404
 *   Returns all requests that returned 404 Not Found
 *
 * @query {number} minStatusCode - Start of status code range (inclusive)
 *   Example: minStatusCode=400 with maxStatusCode=499 finds all 4xx errors
 *
 * @query {number} maxStatusCode - End of status code range (inclusive)
 *
 * @query {string} from - Start date for range search (ISO 8601 format)
 *   Example: from=2026-01-21T00:00:00Z
 *   Returns logs on or after this timestamp
 *
 * @query {string} to - End date for range search (ISO 8601 format)
 *   Example: to=2026-01-21T23:59:59Z
 *   Returns logs on or before this timestamp
 *
 * @query {boolean} hasError - Find only logs with errors
 *   Example: hasError=true
 *   Returns only logs where error object is not empty
 *
 * @query {number} limit - Number of results per page (default 50, max 100)
 *   Example: limit=20
 *   Backend enforces max 100 to prevent overload
 *
 * @query {number} skip - Number of results to skip for pagination (default 0)
 *   Example: skip=50
 *   With limit=20: skips first 50, returns results 51-70
 *
 * @query {string} sort - Sort order (default -timestamp for newest first)
 *   Example: sort=-timestamp (newest first)
 *   Example: sort=durationMs (slowest last)
 *
 * @returns {Object} - Search results with pagination:
 * {
 *   "logs": [
 *     {
 *       "requestId": "req_abc123xyz789",
 *       "timestamp": "2026-01-21T10:30:00Z",
 *       "route": "/notes",
 *       "method": "POST",
 *       "statusCode": 201,
 *       "durationMs": 45,
 *       "userId": "507f1f77bcf86cd799439011",
 *       "eventName": "note.create.success"
 *     },
 *     ...more logs
 *   ],
 *   "total": 156,    // Total matching logs
 *   "limit": 50,     // Confirmed limit
 *   "skip": 0        // Confirmed skip
 * }
 *
 * @throws {400} - Invalid query parameters
 * @throws {401} - User not authenticated
 * @throws {403} - User not admin
 * @throws {500} - Server error
 *
 * EXAMPLE REQUEST:
 * GET /admin/logs?eventName=note.create.success&limit=20&skip=0
 * Authorization: Bearer <ADMIN_JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "logs": [
 *     {
 *       "requestId": "req_abc123xyz789",
 *       "timestamp": "2026-01-21T10:30:00Z",
 *       "route": "/notes",
 *       "method": "POST",
 *       "statusCode": 201,
 *       "durationMs": 45,
 *       "userId": "507f1f77bcf86cd799439011",
 *       "eventName": "note.create.success"
 *     }
 *   ],
 *   "total": 1247,
 *   "limit": 20,
 *   "skip": 0
 * }
 *
 * PERFORMANCE NOTES:
 * - Logs are indexed for fast searching (timestamp, userId, eventName, statusCode)
 * - Large date ranges might be slow (e.g. last 90 days)
 * - Combine filters to narrow results and improve performance
 * - Consider using /admin/logs/stats/summary for aggregate metrics instead
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'admin.logs.search' - tracks admin log searches
 * - Used to understand which admins investigate which logs
 * - Can detect suspicious admin activity (excessive searching, data access)
 */
router.get('/logs', async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Extract Search Filters from Query Parameters
    // =============================================================================
    // All parameters are optional - extract with safe defaults
    const {
      requestId,      // Find by specific request ID
      userId,         // Find by user ID
      eventName,      // Find by event name (what action occurred)
      statusCode,     // Find by specific HTTP status
      minStatusCode,  // Find by status code range (min)
      maxStatusCode,  // Find by status code range (max)
      from,           // Find by date range (start)
      to,             // Find by date range (end)
      hasError,       // Find only logs with errors
      limit = 50,     // Pagination: results per page
      skip = 0,       // Pagination: results to skip
      sort = '-timestamp'  // Sort order (default: newest first)
    } = req.query;

    // =============================================================================
    // STEP 2: Build Search Options Object
    // =============================================================================
    // Package all filters into options object for the search function
    // We limit results to prevent returning too much data at once
    const options = {
      requestId,                                    // Filter: specific request
      userId,                                       // Filter: specific user
      eventName,                                    // Filter: event type
      statusCode,                                   // Filter: exact status
      minStatusCode,                                // Filter: min status
      maxStatusCode,                                // Filter: max status
      from,                                         // Filter: start date
      to,                                           // Filter: end date
      hasError,                                     // Filter: only errors
      limit: Math.min(parseInt(limit) || 50, 100), // Max 100 results (prevent overload)
      skip: parseInt(skip) || 0,                    // Skip N results
      sort                                          // Sort order
    };

    // =============================================================================
    // STEP 3: Execute Search Using Log Model
    // =============================================================================
    // Use the Log model's custom searchLogs method to run the query with all filters
    // This method handles building complex MongoDB queries based on options
    const { logs, total } = await Log.searchLogs(options);

    // =============================================================================
    // STEP 4: Log the Search for Audit Trail
    // =============================================================================
    // Track admin searches for security monitoring
    attachEntityId(req, 'searchFilters', { eventName, userId, statusCode });
    req.eventName = 'admin.logs.search';
    req.mutation = {
      after: {
        resultCount: logs.length,
        totalMatching: total
      }
    };

    // =============================================================================
    // STEP 5: Return Search Results
    // =============================================================================
    // Convert each log to safe format (removes sensitive data)
    res.json({
      logs: logs.map(log => log.toSafeJSON()),  // Convert each log to safe format (no sensitive data)
      total,  // Total matching logs (for pagination UI)
      limit: options.limit,  // Returned limit
      skip: options.skip  // Returned skip
    });
  } catch (error) {
    // Error handling: log and return error response
    attachError(req, error, { operation: 'logs_fetch' });
    res.status(500).json({
      error: {
        message: 'Failed to fetch logs',
        code: 'LOGS_FETCH_ERROR',
        requestId: req.requestId
      }
    });
  }
});

/**
 * GET /admin/logs/:requestId
 * Get a single log entry by request ID (admin only)
 *
 * PURPOSE:
 * Retrieves complete details for a specific API request log.
 * Used for debugging specific requests or investigating user activity.
 *
 * USE CASES:
 * - User reports error with error ID "Error #req_abc123" → fetch that log
 * - Investigate specific request that failed
 * - Review user's specific action (creation, update, deletion)
 * - Analyze performance of one request
 * - Security investigation (what exactly did user try to do?)
 *
 * @param {string} requestId - Unique request ID (path parameter, required)
 *   Example: req_abc123xyz789
 *   Get this from:
 *   - User error message ("Error #req_...")
 *   - Search results from GET /admin/logs
 *   - Browser console errors
 *
 * @returns {Object} - Complete log entry:
 * {
 *   "log": {
 *     "requestId": "req_abc123xyz789",
 *     "timestamp": "2026-01-21T10:30:00Z",
 *     "route": "/notes",
 *     "method": "POST",
 *     "statusCode": 201,
 *     "durationMs": 45,
 *     "userId": "507f1f77bcf86cd799439011",
 *     "eventName": "note.create.success",
 *     "entityIds": {
 *       "noteId": "note_xyz789"
 *     },
 *     "error": null,
 *     "mutation": {
 *       "after": { "title": "My Note", "status": "active" }
 *     }
 *   }
 * }
 *
 * @throws {404} - Log not found (requestId doesn't exist)
 * @throws {401} - User not authenticated
 * @throws {403} - User not admin
 * @throws {500} - Server error
 *
 * EXAMPLE REQUEST:
 * GET /admin/logs/req_abc123xyz789
 * Authorization: Bearer <ADMIN_JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "log": {
 *     "requestId": "req_abc123xyz789",
 *     "timestamp": "2026-01-21T10:30:00Z",
 *     "route": "/notes",
 *     "method": "POST",
 *     "statusCode": 201,
 *     "durationMs": 45,
 *     "userId": "507f1f77bcf86cd799439011",
 *     "eventName": "note.create.success",
 *     "entityIds": { "noteId": "note_xyz789" },
 *     "error": null
 *   }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'admin.logs.view' - tracks when admin views logs
 * - Used to understand which admins investigate which requests
 */
router.get('/logs/:requestId', async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Find Log by Request ID
    // =============================================================================
    // Find the specific log entry with matching requestId
    // requestId is unique so query returns at most one result
    const log = await Log.findOne({ requestId: req.params.requestId });

    // =============================================================================
    // STEP 2: Check if Log Was Found
    // =============================================================================
    // If not found, user requested non-existent requestId
    if (!log) {
      return res.status(404).json({
        error: {
          message: 'Log not found',
          code: 'LOG_NOT_FOUND',
          requestId: req.requestId
        }
      });
    }

    // =============================================================================
    // STEP 3: Log the View for Audit Trail
    // =============================================================================
    // Track that admin viewed this log
    attachEntityId(req, 'targetRequestId', req.params.requestId);
    req.eventName = 'admin.logs.view';

    // =============================================================================
    // STEP 4: Return Log Entry
    // =============================================================================
    // Convert to safe format (removes sensitive data)
    res.json({ log: log.toSafeJSON() });
  } catch (error) {
    // Error handling
    attachError(req, error, { operation: 'log_fetch', targetRequestId: req.params.requestId });
    res.status(500).json({
      error: {
        message: 'Failed to fetch log',
        code: 'LOG_FETCH_ERROR',
        requestId: req.requestId
      }
    });
  }
});

/**
 * GET /admin/logs/stats/summary
 * Get log statistics
 */
router.get('/logs/stats/summary', async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const matchStage = Object.keys(dateFilter).length > 0
      ? { timestamp: dateFilter }
      : {};

    const stats = await Log.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          maxDuration: { $max: '$durationMs' },
          errorCount: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
          },
          serverErrorCount: {
            $sum: { $cond: [{ $gte: ['$statusCode', 500] }, 1, 0] }
          }
        }
      }
    ]);

    // Get status code distribution
    const statusDistribution = await Log.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $floor: { $divide: ['$statusCode', 100] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top event names
    const topEvents = await Log.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent errors
    const recentErrors = await Log.find({
      ...matchStage,
      statusCode: { $gte: 400 }
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('requestId timestamp route statusCode error.code error.messageSafe');

    res.json({
      summary: stats[0] || {
        totalRequests: 0,
        avgDuration: 0,
        maxDuration: 0,
        errorCount: 0,
        serverErrorCount: 0
      },
      statusDistribution: statusDistribution.map(s => ({
        statusGroup: `${s._id}xx`,
        count: s.count
      })),
      topEvents,
      recentErrors
    });
  } catch (error) {
    attachError(req, error, { operation: 'log_stats_fetch' });
    res.status(500).json({
      error: 'Failed to fetch log stats',
      code: 'STATS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

// =============================================================================
// USER MANAGEMENT - Admin User Lookup and Filtering
// =============================================================================
// These endpoints allow admins to search for users and manage their accounts.
// Admins can find users by email, filter by role (admin, user, etc) or status
// (active, suspended, etc), and then take actions on them.

/**
 * GET /admin/users
 * List all users with search and filtering (admin only)
 *
 * PURPOSE:
 * Allows admins to search and filter all user accounts in the system.
 * Supports pagination for large user bases (thousands of users).
 * Used for user management, moderation, and analytics.
 *
 * SEARCH & FILTER OPTIONS:
 * - q: Search by email address (case-insensitive partial match)
 *   Example: q=john searches for "john@example.com", "john.doe@...", etc.
 * - role: Filter by user role (admin, free, premium, etc)
 *   Example: role=admin finds all admin users
 * - status: Filter by account status (active, suspended, deleted)
 *   Example: status=suspended finds all suspended users
 *
 * PAGINATION:
 * - Supports limit/skip pagination (traditional offset-based)
 * - Default 50 results per page, max 100 to prevent overload
 * - Use skip to jump to specific page
 *
 * USE CASES:
 * - Find all suspended users to review appeals
 * - Search for specific user by email to manage account
 * - Find all admin users to verify permissions
 * - Find flagged users for moderation review
 * - Export user list for reporting
 *
 * EXAMPLE QUERIES:
 * GET /admin/users?status=suspended - Find all suspended users
 * GET /admin/users?role=admin - Find all admin accounts
 * GET /admin/users?q=john@example.com - Search for specific user
 * GET /admin/users?status=active&limit=20&skip=40 - Paginate active users
 * GET /admin/users?q=gmail&role=free - Find free users with Gmail accounts
 *
 * @query {string} q - Email search query (case-insensitive partial match, optional)
 *   Example: q=john searches for "john" anywhere in email
 *   Empty or omitted = return all users (no email filter)
 * @query {string} role - Filter by user role (optional)
 *   Enum: "admin", "free", "premium"
 *   Empty or omitted = return all roles
 * @query {string} status - Filter by account status (optional)
 *   Enum: "active", "suspended", "deleted"
 *   Empty or omitted = return all statuses
 * @query {number} limit - Results per page (default 50, max 100, optional)
 *   Should be >= 1 and <= 100 (enforced on backend)
 *   Example: limit=20 returns 20 results per page
 * @query {number} skip - Number of results to skip (default 0, optional)
 *   Example: skip=40 with limit=20 returns results 40-59 (page 3)
 *
 * @returns {Object} - Search results with pagination info:
 * {
 *   "users": [
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "email": "john@example.com",
 *       "role": "free",
 *       "status": "active",
 *       "profile": { "firstName": "John", "lastName": "Doe" },
 *       "createdAt": "2025-01-15T10:30:00Z"
 *     },
 *     ...more users
 *   ],
 *   "total": 156,    // Total matching users (for pagination UI)
 *   "limit": 50,     // Confirmed limit used
 *   "skip": 0        // Confirmed skip used
 * }
 *
 * @throws {400} - Invalid query parameters
 * @throws {401} - User not authenticated
 * @throws {403} - User not admin
 * @throws {500} - Server error
 *
 * EXAMPLE REQUEST:
 * GET /admin/users?q=john&role=free&limit=20&skip=0
 * Authorization: Bearer <ADMIN_JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "users": [
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "email": "john.doe@example.com",
 *       "role": "free",
 *       "status": "active",
 *       "profile": { "firstName": "John" },
 *       "createdAt": "2025-01-15T10:30:00Z"
 *     }
 *   ],
 *   "total": 5,
 *   "limit": 20,
 *   "skip": 0
 * }
 *
 * PAGINATION EXAMPLES:
 * - Page 1: skip=0, limit=50 → users 0-49
 * - Page 2: skip=50, limit=50 → users 50-99
 * - Page 3: skip=100, limit=50 → users 100-149
 * Calculate: pageNumber = (skip / limit) + 1
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'admin.users.search' - tracks admin searches
 * - User ID attached for audit trail
 * - Used to understand which admins search which users
 * - Can detect suspicious admin activity
 */
router.get('/users', async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Extract and Validate Query Parameters
    // =============================================================================
    // All parameters are optional - extract with safe defaults
    const { q, role, status, limit = 50, skip = 0 } = req.query;

    // =============================================================================
    // STEP 2: Build MongoDB Query Object Dynamically
    // =============================================================================
    // Start with empty query object and add filters based on provided parameters
    // This approach allows users to combine multiple filters
    const query = {};

    // If search query provided, search by email (case-insensitive)
    // MongoDB $regex allows partial matching (substring search)
    // $options: 'i' makes search case-insensitive (matches "John", "john", "JOHN")
    // Example: q="john" matches "john@example.com", "john.doe@...", etc.
    if (q) {
      query.email = { $regex: q, $options: 'i' };
    }

    // If role filter provided, only return users with that specific role
    // Exact match - user must have exactly this role
    if (role) {
      query.role = role;
    }

    // If status filter provided, only return users with that status
    // Exact match - user must have exactly this status
    if (status) {
      query.status = status;
    }

    // =============================================================================
    // STEP 3: Execute MongoDB Query with Pagination
    // =============================================================================
    // Find all users matching the query filters
    const users = await User.find(query)
      .sort({ createdAt: -1 })  // Sort by newest users first (most recently created)
      .skip(parseInt(skip) || 0)  // Skip N results for pagination
      .limit(Math.min(parseInt(limit) || 50, 100));  // Max 100 results (prevent overload)

    // =============================================================================
    // STEP 4: Get Total Count for Pagination UI
    // =============================================================================
    // Count total matching users (important for calculating total pages)
    // For example: total=156, limit=50 → total pages = 156/50 = 3.12 → 4 pages
    const total = await User.countDocuments(query);

    // =============================================================================
    // STEP 5: Log the Search for Audit Trail
    // =============================================================================
    // Track admin search activity for security monitoring
    attachEntityId(req, 'searchQuery', { q, role, status });
    req.eventName = 'admin.users.search';
    req.mutation = {
      after: {
        resultCount: users.length,
        totalMatching: total
      }
    };

    // =============================================================================
    // STEP 6: Return Results with Pagination Info
    // =============================================================================
    // Convert users to safe format (no sensitive data like password hashes)
    res.json({
      users: users.map(u => u.toSafeJSON()),  // Convert to safe format (no sensitive data)
      total,  // Total matching users (for pagination UI to show "Page 1 of 4" etc)
      limit: parseInt(limit) || 50,  // Confirmed limit used
      skip: parseInt(skip) || 0  // Confirmed skip used
    });
  } catch (error) {
    // Error handling: log and return error response
    attachError(req, error, { operation: 'users_fetch' });
    res.status(500).json({
      error: {
        message: 'Failed to fetch users',
        code: 'USERS_FETCH_ERROR',
        requestId: req.requestId
      }
    });
  }
});

/**
 * POST /admin/users
 * Create a new user (admin only)
 */
router.post('/users', async (req, res) => {
  try {
    const { email, password, role = 'free', profile } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED',
        requestId: req.requestId
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'INVALID_PASSWORD',
        requestId: req.requestId
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL',
        requestId: req.requestId
      });
    }

    // Validate role
    if (!['free', 'premium', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be free, premium, or admin',
        code: 'INVALID_ROLE',
        requestId: req.requestId
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email is already in use',
        code: 'EMAIL_IN_USE',
        requestId: req.requestId
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role,
      status: 'active',
      profile: profile || {}
    });

    await user.save();

    // Attach entity ID for logging
    attachEntityId(req, 'targetUserId', user._id.toString());

    res.status(201).json({
      message: 'User created successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      attachError(req, error, { operation: 'user_create', reason: 'duplicate_email' });
      return res.status(400).json({
        error: 'Email is already in use',
        code: 'EMAIL_IN_USE',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_create' });
    res.status(500).json({
      error: 'Failed to create user',
      code: 'USER_CREATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/features
 * Get feature lists (premium vs beta features)
 */
router.get('/features', async (req, res) => {
  try {
    const { PREMIUM_FEATURES, BETA_FEATURES } = User.getFeatureLists();
    res.json({
      premiumFeatures: PREMIUM_FEATURES,
      betaFeatures: BETA_FEATURES
    });
  } catch (error) {
    attachError(req, error, { operation: 'features_fetch' });
    res.status(500).json({
      error: 'Failed to fetch features',
      code: 'FEATURES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/users/:id
 * Update user (role, status, email, profile)
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, email, profile } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    // Prevent admin from modifying themselves (except profile)
    const isSelf = id === req.user._id.toString();
    if (isSelf && (role || status)) {
      return res.status(400).json({
        error: 'Cannot modify your own role or status',
        code: 'SELF_MODIFY',
        requestId: req.requestId
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Update role and status
    if (role && ['free', 'premium', 'admin'].includes(role)) {
      user.role = role;
    }
    if (status && ['active', 'disabled'].includes(status)) {
      user.status = status;
    }

    // Update email (admin can change directly, no verification required)
    if (email && email !== user.email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          error: 'Please provide a valid email address',
          code: 'INVALID_EMAIL',
          requestId: req.requestId
        });
      }

      // Check if email is already in use
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({
          error: 'Email is already in use',
          code: 'EMAIL_IN_USE',
          requestId: req.requestId
        });
      }

      user.email = email.toLowerCase();
    }

    // Update profile fields
    if (profile && typeof profile === 'object') {
      const allowedProfileFields = [
        'firstName', 'lastName', 'displayName', 'phone',
        'bio', 'location', 'website', 'timezone'
      ];

      // Initialize profile if it doesn't exist
      if (!user.profile) {
        user.profile = {};
      }

      for (const field of allowedProfileFields) {
        if (field in profile) {
          // Allow empty strings to clear fields
          user.profile[field] = profile[field] || '';
        }
      }

      // Validate website if provided
      if (profile.website && profile.website.trim()) {
        if (!validator.isURL(profile.website)) {
          return res.status(400).json({
            error: 'Please provide a valid URL for website',
            code: 'INVALID_WEBSITE',
            requestId: req.requestId
          });
        }
      }
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      attachError(req, error, { operation: 'user_update', targetUserId: id, reason: 'duplicate_email' });
      return res.status(400).json({
        error: 'Email is already in use',
        code: 'EMAIL_IN_USE',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_update', targetUserId: id });
    res.status(500).json({
      error: 'Failed to update user',
      code: 'USER_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/users/:id/flags
 * Update user feature flags
 */
router.patch('/users/:id/flags', async (req, res) => {
  const { id } = req.params;
  const { flags } = req.body;

  // Attach target user ID for logging
  attachEntityId(req, 'targetUserId', id);

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        error: 'Flags must be an object',
        code: 'INVALID_FLAGS',
        requestId: req.requestId
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Capture state before modification for logging
    const flagsBefore = user.flags ? Object.fromEntries(user.flags) : {};

    // Ensure flags is a Map (may be undefined for older users)
    if (!user.flags || !(user.flags instanceof Map)) {
      user.flags = new Map();
    }

    // Update flags
    Object.entries(flags).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        user.flags.delete(key);
      } else {
        user.flags.set(key, Boolean(value));
      }
    });

    await user.save();

    // Capture state after modification for logging
    const flagsAfter = Object.fromEntries(user.flags);

    // Attach mutation context for logging
    req.mutation = {
      type: 'flags_update',
      targetUserId: id,
      before: flagsBefore,
      after: flagsAfter,
      requested: flags
    };

    res.json({
      message: 'Flags updated successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    // Attach error with full context for logging
    attachError(req, error, {
      operation: 'flags_update',
      targetUserId: id,
      requestedFlags: flags,
      errorType: error.name,
      mongooseError: error.errors ? Object.keys(error.errors) : null
    });

    res.status(500).json({
      error: 'Failed to update flags',
      code: 'FLAGS_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/reset-password
 * Admin reset user password
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    // Prevent admin from resetting their own password this way
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot reset your own password. Use profile settings instead.',
        code: 'SELF_RESET',
        requestId: req.requestId
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'INVALID_PASSWORD',
        requestId: req.requestId
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();

    await user.save();

    res.json({
      message: 'Password reset successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'password_reset', targetUserId: id });
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'PASSWORD_RESET_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// User Content Endpoints
// ============================================

/**
 * GET /admin/users/:id/content
 * Get user content with counts
 */
router.get('/users/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'all', limit = 20, skip = 0, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const content = await adminContentService.getUserContent(id, {
      type,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      status
    });

    res.json(content);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_content_fetch' });
    res.status(500).json({
      error: 'Failed to fetch user content',
      code: 'CONTENT_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/activity
 * Get user activity timeline
 */
router.get('/users/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const [timeline, stats] = await Promise.all([
      adminContentService.getUserActivityTimeline(id, {
        from,
        to,
        limit: parseInt(limit) || 50
      }),
      adminContentService.getUserActivityStats(id, { days: 30 })
    ]);

    res.json({
      ...timeline,
      stats
    });
  } catch (error) {
    console.error('[Activity] Error:', error);
    attachError(req, error, { operation: 'user_activity_fetch' });
    res.status(500).json({
      error: 'Failed to fetch user activity',
      code: 'ACTIVITY_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// Moderation Endpoints
// ============================================

/**
 * POST /admin/users/:id/warn
 * Issue a warning to a user
 */
router.post('/users/:id/warn', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, level = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.warn.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
      req.eventName = 'admin.user.warn.missing_reason';
      return res.status(400).json({
        error: 'Reason is required',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.warnUser(id, req.user._id, {
      reason: reason.trim(),
      level: parseInt(level) || 1
    });

    req.eventName = 'admin.user.warn.success';
    res.json({
      message: 'Warning issued successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.warn.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_warn' });
    req.eventName = 'admin.user.warn.error';
    res.status(500).json({
      error: 'Failed to issue warning',
      code: 'WARN_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/suspend
 * Suspend a user
 */
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, until } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.suspend.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
      req.eventName = 'admin.user.suspend.missing_reason';
      return res.status(400).json({
        error: 'Reason is required',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.suspendUser(id, req.user._id, {
      reason: reason.trim(),
      until
    });

    req.eventName = 'admin.user.suspend.success';
    res.json({
      message: 'User suspended successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.suspend.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot suspend admin users') {
      req.eventName = 'admin.user.suspend.cannot_admin';
      return res.status(400).json({
        error: 'Cannot suspend admin users',
        code: 'CANNOT_SUSPEND_ADMIN',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot suspend yourself') {
      req.eventName = 'admin.user.suspend.cannot_self';
      return res.status(400).json({
        error: 'Cannot suspend yourself',
        code: 'CANNOT_SUSPEND_SELF',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_suspend' });
    req.eventName = 'admin.user.suspend.error';
    res.status(500).json({
      error: 'Failed to suspend user',
      code: 'SUSPEND_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/unsuspend
 * Remove suspension from a user
 */
router.post('/users/:id/unsuspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.unsuspend.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
      req.eventName = 'admin.user.unsuspend.missing_reason';
      return res.status(400).json({
        error: 'Reason is required',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.unsuspendUser(id, req.user._id, {
      reason: reason.trim()
    });

    req.eventName = 'admin.user.unsuspend.success';
    res.json({
      message: 'User unsuspended successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.unsuspend.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_unsuspend' });
    req.eventName = 'admin.user.unsuspend.error';
    res.status(500).json({
      error: 'Failed to unsuspend user',
      code: 'UNSUSPEND_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/ban
 * Permanently ban a user
 */
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.ban.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
      req.eventName = 'admin.user.ban.missing_reason';
      return res.status(400).json({
        error: 'Reason is required',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.banUser(id, req.user._id, {
      reason: reason.trim()
    });

    req.eventName = 'admin.user.ban.success';
    res.json({
      message: 'User banned successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.ban.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot ban admin users') {
      req.eventName = 'admin.user.ban.cannot_admin';
      return res.status(400).json({
        error: 'Cannot ban admin users',
        code: 'CANNOT_BAN_ADMIN',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot ban yourself') {
      req.eventName = 'admin.user.ban.cannot_self';
      return res.status(400).json({
        error: 'Cannot ban yourself',
        code: 'CANNOT_BAN_SELF',
        requestId: req.requestId
      });
    }
    if (error.message === 'User is already banned') {
      req.eventName = 'admin.user.ban.already_banned';
      return res.status(400).json({
        error: 'User is already banned',
        code: 'ALREADY_BANNED',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_ban' });
    req.eventName = 'admin.user.ban.error';
    res.status(500).json({
      error: 'Failed to ban user',
      code: 'BAN_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/unban
 * Remove permanent ban from a user
 */
router.post('/users/:id/unban', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.unban.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
      req.eventName = 'admin.user.unban.missing_reason';
      return res.status(400).json({
        error: 'Reason is required',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.unbanUser(id, req.user._id, {
      reason: reason.trim()
    });

    req.eventName = 'admin.user.unban.success';
    res.json({
      message: 'User unbanned successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.unban.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    if (error.message === 'User is not banned') {
      req.eventName = 'admin.user.unban.not_banned';
      return res.status(400).json({
        error: 'User is not banned',
        code: 'NOT_BANNED',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_unban' });
    req.eventName = 'admin.user.unban.error';
    res.status(500).json({
      error: 'Failed to unban user',
      code: 'UNBAN_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/users/:id/admin-note
 * Add an admin note about a user
 */
router.post('/users/:id/admin-note', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.note.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!content || content.trim().length === 0) {
      req.eventName = 'admin.user.note.missing_content';
      return res.status(400).json({
        error: 'Note content is required',
        code: 'CONTENT_REQUIRED',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.addAdminNote(id, req.user._id, {
      content: content.trim()
    });

    req.eventName = 'admin.user.note.success';
    res.json({
      message: 'Admin note added successfully',
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.note.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'admin_note_add' });
    req.eventName = 'admin.user.note.error';
    res.status(500).json({
      error: 'Failed to add admin note',
      code: 'ADMIN_NOTE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/moderation-history
 * Get moderation history for a user
 */
router.get('/users/:id/moderation-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.eventName = 'admin.user.moderation_history.invalid_id';
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await moderationService.getModerationHistory(id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    req.eventName = 'admin.user.moderation_history.success';
    res.json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      req.eventName = 'admin.user.moderation_history.not_found';
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'moderation_history_fetch' });
    req.eventName = 'admin.user.moderation_history.error';
    res.status(500).json({
      error: 'Failed to fetch moderation history',
      code: 'MODERATION_HISTORY_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// User Social Monitoring Endpoints
// ============================================

/**
 * GET /admin/users/:id/social
 * Get social stats summary for a user
 */
router.get('/users/:id/social', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const stats = await adminContentService.getUserSocialStats(id);
    res.json(stats);
  } catch (error) {
    attachError(req, error, { operation: 'user_social_stats_fetch' });
    res.status(500).json({
      error: 'Failed to fetch social stats',
      code: 'SOCIAL_STATS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/connections
 * Get user's connections
 */
router.get('/users/:id/connections', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0, status = 'accepted' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await adminContentService.getUserConnections(id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      status
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'user_connections_fetch' });
    res.status(500).json({
      error: 'Failed to fetch connections',
      code: 'CONNECTIONS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/blocks
 * Get user's blocked users (both directions)
 */
router.get('/users/:id/blocks', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await adminContentService.getUserBlocks(id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'user_blocks_fetch' });
    res.status(500).json({
      error: 'Failed to fetch blocks',
      code: 'BLOCKS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/messages
 * Get user's conversations and messages (for moderation)
 */
router.get('/users/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, skip = 0, conversationId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await adminContentService.getUserMessages(id, {
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      conversationId
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        requestId: req.requestId
      });
    }
    if (error.message === 'User is not a participant in this conversation') {
      return res.status(400).json({
        error: error.message,
        code: 'NOT_PARTICIPANT',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_messages_fetch' });
    res.status(500).json({
      error: 'Failed to fetch messages',
      code: 'MESSAGES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/shares
 * Get user's shared items
 */
router.get('/users/:id/shares', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0, direction = 'both' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const result = await adminContentService.getUserShares(id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      direction
    });

    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'user_shares_fetch' });
    res.status(500).json({
      error: 'Failed to fetch shares',
      code: 'SHARES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// System Settings Endpoints
// ============================================

/**
 * GET /admin/system/settings
 * Get system settings
 */
router.get('/system/settings', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings.toSafeJSON());
  } catch (error) {
    attachError(req, error, { operation: 'system_settings_fetch' });
    res.status(500).json({
      error: 'Failed to fetch system settings',
      code: 'SETTINGS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/system/kill-switches
 * Get all kill switches
 */
router.get('/system/kill-switches', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      killSwitches: settings.getKillSwitchesObject(),
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy
    });
  } catch (error) {
    attachError(req, error, { operation: 'kill_switches_fetch' });
    res.status(500).json({
      error: 'Failed to fetch kill switches',
      code: 'KILL_SWITCHES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/system/kill-switch
 * Toggle a kill switch
 */
router.post('/system/kill-switch', async (req, res) => {
  try {
    const { feature, enabled, reason } = req.body;

    if (!feature || typeof feature !== 'string') {
      return res.status(400).json({
        error: 'Feature name is required',
        code: 'FEATURE_REQUIRED',
        requestId: req.requestId
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Enabled must be a boolean',
        code: 'INVALID_ENABLED',
        requestId: req.requestId
      });
    }

    // Require reason when disabling
    if (!enabled && (!reason || reason.trim().length === 0)) {
      return res.status(400).json({
        error: 'Reason is required when disabling a feature',
        code: 'REASON_REQUIRED',
        requestId: req.requestId
      });
    }

    const settings = await SystemSettings.setFeatureKillSwitch(
      feature,
      enabled,
      req.user._id,
      reason?.trim() || ''
    );

    res.json({
      message: enabled ? 'Feature enabled' : 'Feature disabled',
      killSwitches: settings.getKillSwitchesObject(),
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    attachError(req, error, { operation: 'kill_switch_toggle' });
    res.status(500).json({
      error: 'Failed to toggle kill switch',
      code: 'KILL_SWITCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/system/feedback-routing
 * Get feedback routing configuration
 */
router.get('/system/feedback-routing', async (req, res) => {
  try {
    const routing = await SystemSettings.getFeedbackRouting();
    res.json({
      routing,
      isConfigured: routing.enabled && routing.adminUserId && routing.projectId
    });
  } catch (error) {
    attachError(req, error, { operation: 'feedback_routing_fetch' });
    res.status(500).json({
      error: 'Failed to fetch feedback routing configuration',
      code: 'FEEDBACK_ROUTING_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/system/feedback-routing
 * Update feedback routing configuration
 */
router.patch('/system/feedback-routing', async (req, res) => {
  try {
    const { enabled, adminUserId, projectId, createTasks, defaultPriority } = req.body;

    // Validate adminUserId if provided
    if (adminUserId) {
      const User = mongoose.model('User');
      const admin = await User.findById(adminUserId);
      if (!admin) {
        return res.status(400).json({
          error: 'Admin user not found',
          code: 'ADMIN_NOT_FOUND',
          requestId: req.requestId
        });
      }
      if (admin.role !== 'admin') {
        return res.status(400).json({
          error: 'User must be an admin',
          code: 'USER_NOT_ADMIN',
          requestId: req.requestId
        });
      }
    }

    // Validate projectId if provided
    if (projectId) {
      const Project = mongoose.model('Project');
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(400).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
          requestId: req.requestId
        });
      }
    }

    // Build update object with only provided fields
    const update = {};
    if (enabled !== undefined) update.enabled = enabled;
    if (adminUserId !== undefined) update.adminUserId = adminUserId;
    if (projectId !== undefined) update.projectId = projectId;
    if (createTasks !== undefined) update.createTasks = createTasks;
    if (defaultPriority !== undefined) update.defaultPriority = defaultPriority;

    const routing = await SystemSettings.updateFeedbackRouting(update);

    res.json({
      message: 'Feedback routing configuration updated',
      routing,
      isConfigured: routing.enabled && routing.adminUserId && routing.projectId
    });
  } catch (error) {
    attachError(req, error, { operation: 'feedback_routing_update' });
    res.status(500).json({
      error: 'Failed to update feedback routing configuration',
      code: 'FEEDBACK_ROUTING_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// Role Configuration Endpoints
// ============================================

/**
 * GET /admin/roles/features
 * Get all available features that can be configured per role
 */
router.get('/roles/features', async (req, res) => {
  try {
    const features = RoleConfig.getAllFeatures();
    res.json({ features });
  } catch (error) {
    attachError(req, error, { operation: 'features_fetch' });
    res.status(500).json({
      error: 'Failed to fetch features',
      code: 'FEATURES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/roles
 * Get all role configurations
 */
router.get('/roles', async (req, res) => {
  try {
    const configs = await RoleConfig.getAllConfigs();
    res.json({
      roles: configs.map(c => c.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'roles_fetch' });
    res.status(500).json({
      error: 'Failed to fetch role configurations',
      code: 'ROLES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/roles/:role
 * Get single role configuration
 */
router.get('/roles/:role', async (req, res) => {
  try {
    const { role } = req.params;

    if (!['free', 'premium', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be free, premium, or admin',
        code: 'INVALID_ROLE',
        requestId: req.requestId
      });
    }

    const config = await RoleConfig.getConfig(role);
    res.json(config.toSafeJSON());
  } catch (error) {
    attachError(req, error, { operation: 'role_fetch', role: req.params.role });
    res.status(500).json({
      error: 'Failed to fetch role configuration',
      code: 'ROLE_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/roles/:role
 * Update role limits/features
 */
router.patch('/roles/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { limits, features } = req.body;

    if (!['free', 'premium', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be free, premium, or admin',
        code: 'INVALID_ROLE',
        requestId: req.requestId
      });
    }

    // Validate limits if provided
    if (limits) {
      const validLimitKeys = ['maxNotes', 'maxTasks', 'maxProjects', 'maxEvents', 'maxImages', 'maxStorageBytes', 'maxCategories'];
      for (const key of Object.keys(limits)) {
        if (!validLimitKeys.includes(key)) {
          return res.status(400).json({
            error: `Invalid limit key: ${key}`,
            code: 'INVALID_LIMIT_KEY',
            requestId: req.requestId
          });
        }
        if (typeof limits[key] !== 'number' || (limits[key] < -1 && limits[key] !== -1)) {
          return res.status(400).json({
            error: `Invalid value for ${key}. Must be a number >= -1`,
            code: 'INVALID_LIMIT_VALUE',
            requestId: req.requestId
          });
        }
      }
    }

    const config = await RoleConfig.updateConfig(role, { limits, features }, req.user._id);

    res.json({
      message: 'Role configuration updated successfully',
      role: config.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'role_update', role: req.params.role });
    res.status(500).json({
      error: 'Failed to update role configuration',
      code: 'ROLE_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/roles/sync
 * Sync all role configurations with defaults (adds missing features/limits)
 */
router.post('/roles/sync', async (req, res) => {
  try {
    const configs = await RoleConfig.syncAllWithDefaults(req.user._id);

    res.json({
      message: 'Role configurations synced with defaults',
      roles: configs.map(c => c.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'roles_sync' });
    res.status(500).json({
      error: 'Failed to sync role configurations',
      code: 'ROLES_SYNC_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/roles/:role/reset
 * Reset a specific role configuration to defaults
 */
router.post('/roles/:role/reset', async (req, res) => {
  try {
    const { role } = req.params;

    if (!['free', 'premium', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
        requestId: req.requestId
      });
    }

    const config = await RoleConfig.resetToDefaults(role, req.user._id);

    res.json({
      message: `Role configuration for "${role}" reset to defaults`,
      role: config.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'role_reset', role: req.params.role });
    res.status(500).json({
      error: 'Failed to reset role configuration',
      code: 'ROLE_RESET_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// User Limits Endpoints
// ============================================

/**
 * GET /admin/users/:id/limits
 * Get user's effective limits and current usage
 */
router.get('/users/:id/limits', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    const limitStatus = await limitService.getUserLimitStatus(user);

    res.json(limitStatus);
  } catch (error) {
    attachError(req, error, { operation: 'user_limits_fetch' });
    res.status(500).json({
      error: 'Failed to fetch user limits',
      code: 'USER_LIMITS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/users/:id/limits
 * Update user's limit overrides
 */
router.patch('/users/:id/limits', async (req, res) => {
  try {
    const { id } = req.params;
    const { limits } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!limits || typeof limits !== 'object') {
      return res.status(400).json({
        error: 'Limits must be an object',
        code: 'INVALID_LIMITS',
        requestId: req.requestId
      });
    }

    // Validate limit keys and values
    const validLimitKeys = ['maxNotes', 'maxTasks', 'maxProjects', 'maxEvents', 'maxImages', 'maxStorageBytes', 'maxCategories'];
    for (const [key, value] of Object.entries(limits)) {
      if (!validLimitKeys.includes(key)) {
        return res.status(400).json({
          error: `Invalid limit key: ${key}`,
          code: 'INVALID_LIMIT_KEY',
          requestId: req.requestId
        });
      }
      // Allow null to clear an override, otherwise must be a number >= -1
      if (value !== null && (typeof value !== 'number' || (value < -1 && value !== -1))) {
        return res.status(400).json({
          error: `Invalid value for ${key}. Must be a number >= -1 or null to clear`,
          code: 'INVALID_LIMIT_VALUE',
          requestId: req.requestId
        });
      }
    }

    attachEntityId(req, 'targetUserId', id);

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Capture state before modification for logging
    const limitsBefore = user.limitOverrides ? Object.fromEntries(user.limitOverrides) : {};

    // Ensure limitOverrides is a Map
    if (!user.limitOverrides || !(user.limitOverrides instanceof Map)) {
      user.limitOverrides = new Map();
    }

    // Update limit overrides
    for (const [key, value] of Object.entries(limits)) {
      if (value === null) {
        // Clear the override
        user.limitOverrides.delete(key);
      } else {
        // Set the override
        user.limitOverrides.set(key, value);
      }
    }

    await user.save();

    // Capture state after modification for logging
    const limitsAfter = Object.fromEntries(user.limitOverrides);

    // Attach mutation context for logging
    req.mutation = {
      type: 'limits_update',
      targetUserId: id,
      before: limitsBefore,
      after: limitsAfter,
      requested: limits
    };

    // Get updated limit status
    const limitStatus = await limitService.getUserLimitStatus(user);

    res.json({
      message: 'User limits updated successfully',
      user: user.toSafeJSON(),
      limits: limitStatus
    });
  } catch (error) {
    attachError(req, error, { operation: 'user_limits_update' });
    res.status(500).json({
      error: 'Failed to update user limits',
      code: 'USER_LIMITS_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// Sidebar Configuration Endpoints
// ============================================

/**
 * GET /admin/sidebar
 * Get sidebar configuration
 */
router.get('/sidebar', async (req, res) => {
  try {
    const config = await SidebarConfig.getConfig();
    res.json(config.toSafeJSON());
  } catch (error) {
    attachError(req, error, { operation: 'sidebar_config_fetch' });
    res.status(500).json({
      error: 'Failed to fetch sidebar configuration',
      code: 'SIDEBAR_CONFIG_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/sidebar
 * Update sidebar configuration
 */
router.patch('/sidebar', async (req, res) => {
  try {
    const { items, sections } = req.body;

    // Validate items if provided
    if (items && !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Items must be an array',
        code: 'INVALID_ITEMS',
        requestId: req.requestId
      });
    }

    // Validate sections if provided
    if (sections && !Array.isArray(sections)) {
      return res.status(400).json({
        error: 'Sections must be an array',
        code: 'INVALID_SECTIONS',
        requestId: req.requestId
      });
    }

    // Validate item structure if items provided
    if (items) {
      for (const item of items) {
        if (!item.key || !item.label || !item.icon || !item.path || !item.section) {
          return res.status(400).json({
            error: 'Each item must have key, label, icon, path, and section',
            code: 'INVALID_ITEM_STRUCTURE',
            requestId: req.requestId
          });
        }
      }
    }

    // Validate section structure if sections provided
    if (sections) {
      for (const section of sections) {
        if (!section.key || !section.label || typeof section.order !== 'number') {
          return res.status(400).json({
            error: 'Each section must have key, label, and order',
            code: 'INVALID_SECTION_STRUCTURE',
            requestId: req.requestId
          });
        }
      }
    }

    const config = await SidebarConfig.updateConfig({ items, sections }, req.user._id);

    res.json({
      message: 'Sidebar configuration updated successfully',
      config: config.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'sidebar_config_update' });
    res.status(500).json({
      error: 'Failed to update sidebar configuration',
      code: 'SIDEBAR_CONFIG_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/sidebar/reset
 * Reset sidebar to default configuration
 */
router.post('/sidebar/reset', async (req, res) => {
  try {
    const config = await SidebarConfig.resetToDefaults(req.user._id);

    res.json({
      message: 'Sidebar configuration reset to defaults',
      config: config.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'sidebar_config_reset' });
    res.status(500).json({
      error: 'Failed to reset sidebar configuration',
      code: 'SIDEBAR_CONFIG_RESET_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// FILE MANAGEMENT ROUTES
// ============================================

/**
 * GET /admin/files/stats
 * Get global storage statistics
 */
router.get('/files/stats', async (req, res) => {
  try {
    // Overall file stats
    const totalFiles = await File.countDocuments();
    const trashedFiles = await File.countDocuments({ isTrashed: true });
    const totalFolders = await Folder.countDocuments();

    // Storage by category
    const storageByCategory = await File.aggregate([
      { $match: { isTrashed: false } },
      {
        $group: {
          _id: '$fileCategory',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { totalSize: -1 } }
    ]);

    // Total storage used
    const totalStorageResult = await File.aggregate([
      { $match: { isTrashed: false } },
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);
    const totalStorage = totalStorageResult[0]?.total || 0;

    // Files by storage provider
    const byProvider = await File.aggregate([
      { $match: { isTrashed: false } },
      {
        $group: {
          _id: '$storageProvider',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    // Recent upload activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = await File.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top users by storage
    const topUsersByStorage = await File.aggregate([
      { $match: { isTrashed: false } },
      {
        $group: {
          _id: '$userId',
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { totalSize: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          fileCount: 1,
          totalSize: 1,
          'user.name': 1,
          'user.email': 1
        }
      }
    ]);

    res.json({
      totalFiles,
      trashedFiles,
      totalFolders,
      totalStorage,
      storageByCategory,
      byProvider,
      recentUploads,
      topUsersByStorage
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_files_stats' });
    res.status(500).json({
      error: 'Failed to get file statistics',
      code: 'GET_FILE_STATS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/files/users/:userId
 * Browse a specific user's files
 */
router.get('/files/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { folderId, page = 1, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get user's files
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    if (folderId) {
      query.folderId = folderId === 'null' ? null : new mongoose.Types.ObjectId(folderId);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await File.countDocuments(query);

    // Get user's folders
    const folders = await Folder.find({ userId: new mongoose.Types.ObjectId(userId), isTrashed: false });

    // Get user's storage stats
    const storageStats = await File.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isTrashed: false } },
      { $group: { _id: null, total: { $sum: '$size' }, count: { $sum: 1 } } }
    ]);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      files,
      folders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10))
      },
      storageStats: {
        totalSize: storageStats[0]?.total || 0,
        fileCount: storageStats[0]?.count || 0
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_user_files', userId: req.params.userId });
    res.status(500).json({
      error: 'Failed to get user files',
      code: 'GET_USER_FILES_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/files/usage
 * Get per-user storage usage report
 */
router.get('/files/usage', async (req, res) => {
  try {
    const { sortBy = 'totalSize', order = 'desc', page = 1, limit = 50 } = req.query;

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Aggregate usage per user
    const usageData = await File.aggregate([
      { $match: { isTrashed: false } },
      {
        $group: {
          _id: '$userId',
          totalSize: { $sum: '$size' },
          fileCount: { $sum: 1 },
          lastUpload: { $max: '$createdAt' }
        }
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: parseInt(limit, 10) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'roleconfigs',
          localField: 'user.role',
          foreignField: '_id',
          as: 'roleConfig'
        }
      },
      { $unwind: { path: '$roleConfig', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalSize: 1,
          fileCount: 1,
          lastUpload: 1,
          'user._id': 1,
          'user.name': 1,
          'user.email': 1,
          'user.role': 1,
          'roleConfig.limits.maxStorageBytes': 1,
          'roleConfig.limits.maxFiles': 1
        }
      }
    ]);

    // Get total users with files
    const totalUsersWithFiles = await File.distinct('userId', { isTrashed: false });

    // Add usage percentage
    const usageWithPercentage = usageData.map(u => {
      const maxStorage = u.roleConfig?.limits?.maxStorageBytes || -1;
      const maxFiles = u.roleConfig?.limits?.maxFiles || -1;

      return {
        ...u,
        storagePercentage: maxStorage === -1 ? 0 : Math.round((u.totalSize / maxStorage) * 100),
        filesPercentage: maxFiles === -1 ? 0 : Math.round((u.fileCount / maxFiles) * 100),
        isOverLimit: (maxStorage !== -1 && u.totalSize > maxStorage) ||
                     (maxFiles !== -1 && u.fileCount > maxFiles)
      };
    });

    res.json({
      usage: usageWithPercentage,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalUsersWithFiles.length,
        pages: Math.ceil(totalUsersWithFiles.length / parseInt(limit, 10))
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_files_usage' });
    res.status(500).json({
      error: 'Failed to get storage usage',
      code: 'GET_USAGE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/files/cleanup
 * Clean up old trashed files (permanent delete)
 */
router.post('/files/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays, 10));

    // Find trashed files older than cutoff
    const filesToDelete = await File.find({
      isTrashed: true,
      trashedAt: { $lt: cutoffDate }
    });

    let deletedCount = 0;
    let freedSpace = 0;
    const errors = [];

    for (const file of filesToDelete) {
      try {
        const result = await fileService.deleteFile(file._id, file.userId, true); // Force delete
        if (result.deleted) {
          deletedCount++;
          freedSpace += file.size || 0;
        }
      } catch (err) {
        errors.push({ fileId: file._id, error: err.message });
      }
    }

    res.json({
      message: `Cleanup completed. Deleted ${deletedCount} files.`,
      deletedCount,
      freedSpace,
      errors: errors.length > 0 ? errors : undefined,
      criteria: {
        olderThanDays: parseInt(olderThanDays, 10),
        cutoffDate
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_files_cleanup' });
    res.status(500).json({
      error: 'Failed to cleanup files',
      code: 'CLEANUP_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /admin/files/:fileId
 * Force delete a file (admin override)
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID',
        code: 'INVALID_FILE_ID'
      });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Delete file using admin override (passing file's userId)
    const result = await fileService.deleteFile(fileId, file.userId, true);

    res.json({
      message: 'File deleted by admin',
      file: { _id: fileId, originalName: file.originalName }
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_file_delete', fileId: req.params.fileId });
    res.status(500).json({
      error: 'Failed to delete file',
      code: 'DELETE_FILE_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// DATABASE METRICS ROUTES
// ============================================

/**
 * GET /admin/metrics/database
 * Get comprehensive MongoDB database metrics
 */
router.get('/metrics/database', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const adminDb = db.admin();

    // 1. Database stats
    const dbStats = await db.stats();

    // 2. Server status (connection info, operations)
    let serverStatus = null;
    try {
      serverStatus = await adminDb.serverStatus();
    } catch (e) {
      // May not have admin privileges on Atlas free tier
      serverStatus = { error: 'Insufficient privileges for serverStatus' };
    }

    // 3. Collection stats
    const collections = await db.listCollections().toArray();
    const collectionStats = [];

    for (const coll of collections) {
      try {
        const stats = await db.collection(coll.name).stats();
        const count = await db.collection(coll.name).countDocuments();
        collectionStats.push({
          name: coll.name,
          count,
          size: stats.size,
          avgObjSize: stats.avgObjSize || 0,
          storageSize: stats.storageSize,
          totalIndexSize: stats.totalIndexSize,
          indexCount: stats.nindexes,
        });
      } catch (e) {
        collectionStats.push({
          name: coll.name,
          error: e.message,
        });
      }
    }

    // Sort by size descending
    collectionStats.sort((a, b) => (b.size || 0) - (a.size || 0));

    // 4. Index information for main collections
    const mainCollections = ['users', 'notes', 'tasks', 'projects', 'files', 'images', 'logs'];
    const indexInfo = {};

    for (const collName of mainCollections) {
      try {
        const indexes = await db.collection(collName).indexes();
        indexInfo[collName] = indexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
        }));
      } catch (e) {
        // Collection may not exist
      }
    }

    // 5. Document counts summary
    const [
      userCount,
      noteCount,
      taskCount,
      projectCount,
      eventCount,
      imageCount,
      fileCount,
      logCount,
      lifeAreaCount,
      tagCount,
      folderCount,
    ] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Task.countDocuments(),
      Project.countDocuments(),
      Event.countDocuments(),
      Image.countDocuments(),
      File.countDocuments(),
      Log.countDocuments(),
      LifeArea.countDocuments(),
      Tag.countDocuments(),
      Folder.countDocuments(),
    ]);

    // 6. Growth metrics (last 7 days, 30 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      usersLast7Days,
      usersLast30Days,
      notesLast7Days,
      notesLast30Days,
      filesLast7Days,
      filesLast30Days,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Note.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Note.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      File.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      File.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    // 7. Connection info
    const connectionInfo = {
      readyState: mongoose.connection.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };

    // 8. Build response
    res.json({
      database: {
        name: dbStats.db,
        collections: dbStats.collections,
        views: dbStats.views || 0,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        totalSize: dbStats.dataSize + dbStats.indexSize,
        avgObjSize: dbStats.avgObjSize,
        objects: dbStats.objects,
        // Human readable
        dataSizeMB: Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100,
        storageSizeMB: Math.round(dbStats.storageSize / 1024 / 1024 * 100) / 100,
        indexSizeMB: Math.round(dbStats.indexSize / 1024 / 1024 * 100) / 100,
        totalSizeMB: Math.round((dbStats.dataSize + dbStats.indexSize) / 1024 / 1024 * 100) / 100,
      },
      collections: collectionStats,
      indexes: indexInfo,
      documentCounts: {
        users: userCount,
        notes: noteCount,
        tasks: taskCount,
        projects: projectCount,
        events: eventCount,
        images: imageCount,
        files: fileCount,
        folders: folderCount,
        logs: logCount,
        lifeAreas: lifeAreaCount,
        tags: tagCount,
        total: userCount + noteCount + taskCount + projectCount + eventCount + imageCount + fileCount + folderCount + logCount + lifeAreaCount + tagCount,
      },
      growth: {
        users: {
          last7Days: usersLast7Days,
          last30Days: usersLast30Days,
          avgPerDay7: Math.round(usersLast7Days / 7 * 100) / 100,
          avgPerDay30: Math.round(usersLast30Days / 30 * 100) / 100,
        },
        notes: {
          last7Days: notesLast7Days,
          last30Days: notesLast30Days,
          avgPerDay7: Math.round(notesLast7Days / 7 * 100) / 100,
          avgPerDay30: Math.round(notesLast30Days / 30 * 100) / 100,
        },
        files: {
          last7Days: filesLast7Days,
          last30Days: filesLast30Days,
          avgPerDay7: Math.round(filesLast7Days / 7 * 100) / 100,
          avgPerDay30: Math.round(filesLast30Days / 30 * 100) / 100,
        },
      },
      connection: connectionInfo,
      server: serverStatus?.error ? { error: serverStatus.error } : {
        version: serverStatus?.version,
        uptime: serverStatus?.uptime,
        uptimeDays: serverStatus?.uptime ? Math.round(serverStatus.uptime / 86400 * 100) / 100 : null,
        currentConnections: serverStatus?.connections?.current,
        availableConnections: serverStatus?.connections?.available,
        totalConnectionsCreated: serverStatus?.connections?.totalCreated,
        opcounters: serverStatus?.opcounters,
        network: serverStatus?.network ? {
          bytesIn: serverStatus.network.bytesIn,
          bytesOut: serverStatus.network.bytesOut,
          bytesInMB: Math.round(serverStatus.network.bytesIn / 1024 / 1024 * 100) / 100,
          bytesOutMB: Math.round(serverStatus.network.bytesOut / 1024 / 1024 * 100) / 100,
        } : null,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_database_metrics' });
    res.status(500).json({
      error: 'Failed to fetch database metrics',
      code: 'DATABASE_METRICS_ERROR',
      requestId: req.requestId,
    });
  }
});

/**
 * GET /admin/metrics/database/slow-queries
 * Get slow query analysis from logs
 */
router.get('/metrics/database/slow-queries', async (req, res) => {
  try {
    const { days = 7, minDuration = 1000 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    // Find slow requests from logs
    const slowQueries = await Log.aggregate([
      {
        $match: {
          timestamp: { $gte: since },
          durationMs: { $gte: parseInt(minDuration, 10) },
        },
      },
      {
        $group: {
          _id: {
            route: '$route',
            method: '$method',
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          maxDuration: { $max: '$durationMs' },
          minDuration: { $min: '$durationMs' },
          lastOccurred: { $max: '$timestamp' },
        },
      },
      {
        $sort: { avgDuration: -1 },
      },
      {
        $limit: 50,
      },
      {
        $project: {
          _id: 0,
          route: '$_id.route',
          method: '$_id.method',
          count: 1,
          avgDuration: { $round: ['$avgDuration', 0] },
          maxDuration: 1,
          minDuration: 1,
          lastOccurred: 1,
        },
      },
    ]);

    // Duration distribution
    const durationDistribution = await Log.aggregate([
      {
        $match: {
          timestamp: { $gte: since },
        },
      },
      {
        $bucket: {
          groupBy: '$durationMs',
          boundaries: [0, 100, 250, 500, 1000, 2500, 5000, 10000, Infinity],
          default: 'other',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    // Map bucket boundaries to labels
    const bucketLabels = {
      0: '0-100ms',
      100: '100-250ms',
      250: '250-500ms',
      500: '500ms-1s',
      1000: '1-2.5s',
      2500: '2.5-5s',
      5000: '5-10s',
      10000: '10s+',
    };

    const distribution = durationDistribution.map(d => ({
      range: bucketLabels[d._id] || d._id,
      count: d.count,
    }));

    res.json({
      slowQueries,
      distribution,
      criteria: {
        days: parseInt(days, 10),
        minDurationMs: parseInt(minDuration, 10),
        since,
      },
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_slow_queries' });
    res.status(500).json({
      error: 'Failed to fetch slow queries',
      code: 'SLOW_QUERIES_ERROR',
      requestId: req.requestId,
    });
  }
});

/**
 * GET /admin/metrics/database/health
 * Quick health check for database
 */
router.get('/metrics/database/health', async (req, res) => {
  try {
    const start = Date.now();

    // Simple ping to check connectivity
    await mongoose.connection.db.admin().ping();
    const pingMs = Date.now() - start;

    // Check write capability with a simple operation
    const writeStart = Date.now();
    const testDoc = await Log.findOne().lean();
    const readMs = Date.now() - writeStart;

    // Connection state
    const readyState = mongoose.connection.readyState;
    const isHealthy = readyState === 1 && pingMs < 1000;

    res.json({
      healthy: isHealthy,
      status: isHealthy ? 'ok' : 'degraded',
      checks: {
        connection: {
          ok: readyState === 1,
          state: ['disconnected', 'connected', 'connecting', 'disconnecting'][readyState],
        },
        ping: {
          ok: pingMs < 1000,
          latencyMs: pingMs,
        },
        read: {
          ok: readMs < 1000,
          latencyMs: readMs,
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      healthy: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// ============================================
// REPORT MODERATION ROUTES
// ============================================

/**
 * GET /admin/reports
 * Get reports for admin review
 */
router.get('/reports', async (req, res) => {
  try {
    const { status = 'pending', priority, targetType, limit = 50, skip = 0 } = req.query;

    const reports = await Report.getPendingReports({
      status,
      priority,
      targetType,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const counts = await Report.getReportCounts();

    res.json({
      reports,
      counts,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_reports_fetch' });
    res.status(500).json({
      error: 'Failed to fetch reports',
      code: 'REPORTS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/reports/counts
 * Get report counts by status
 */
router.get('/reports/counts', async (req, res) => {
  try {
    const counts = await Report.getReportCounts();
    res.json(counts);
  } catch (error) {
    attachError(req, error, { operation: 'admin_reports_counts' });
    res.status(500).json({
      error: 'Failed to fetch report counts',
      code: 'REPORTS_COUNTS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/reports/:id
 * Get single report details
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid report ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const report = await Report.findById(id)
      .populate('reporterId', 'email profile.displayName profile.avatarUrl')
      .populate('reportedUserId', 'email profile.displayName profile.avatarUrl')
      .populate('resolution.resolvedBy', 'email profile.displayName');

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'NOT_FOUND',
        requestId: req.requestId
      });
    }

    res.json({ report });
  } catch (error) {
    attachError(req, error, { operation: 'admin_report_fetch' });
    res.status(500).json({
      error: 'Failed to fetch report',
      code: 'REPORT_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/reports/:id
 * Resolve or dismiss a report
 */
router.patch('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid report ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Update status to reviewing if just starting to review
    if (status === 'reviewing') {
      report.status = 'reviewing';
      await report.save();
      return res.json({ message: 'Report marked as reviewing', report });
    }

    // Resolve or dismiss
    if (action) {
      if (action === 'dismiss' || action === 'no_action') {
        await report.dismiss(req.user._id, notes);
      } else {
        await report.resolve(req.user._id, action, notes);

        // If action involves user suspension, execute it
        if (action === 'user_suspended' && report.reportedUserId) {
          await moderationService.suspendUser(
            report.reportedUserId,
            req.user._id,
            { reason: `Report resolved: ${report.reason}` }
          );
        }

        // If action involves user ban, execute it
        if (action === 'user_banned' && report.reportedUserId) {
          await moderationService.banUser(
            report.reportedUserId,
            req.user._id,
            { reason: `Report resolved: ${report.reason}` }
          );
        }

        // If action involves content removal, soft-delete the content
        if (action === 'content_removed' && report.targetId && report.targetType) {
          try {
            const targetId = report.targetId;
            switch (report.targetType) {
              case 'message': {
                const Message = require('../models/Message').default;
                await Message.findByIdAndUpdate(targetId, {
                  isDeleted: true,
                  deletedAt: new Date(),
                  deletedBy: req.user._id,
                  deletedReason: 'moderation'
                });
                break;
              }
              case 'note': {
                const Note = require('../models/Note').default;
                await Note.findByIdAndUpdate(targetId, {
                  isTrashed: true,
                  trashedAt: new Date(),
                  isModerated: true,
                  moderatedAt: new Date(),
                  moderatedBy: req.user._id
                });
                break;
              }
              case 'task': {
                const Task = require('../models/Task').default;
                await Task.findByIdAndUpdate(targetId, {
                  isTrashed: true,
                  trashedAt: new Date(),
                  isModerated: true,
                  moderatedAt: new Date(),
                  moderatedBy: req.user._id
                });
                break;
              }
              case 'project': {
                const Project = require('../models/Project').default;
                await Project.findByIdAndUpdate(targetId, {
                  status: 'deleted',
                  isModerated: true,
                  moderatedAt: new Date(),
                  moderatedBy: req.user._id
                });
                break;
              }
              case 'file': {
                const File = require('../models/File').default;
                await File.findByIdAndUpdate(targetId, {
                  isTrashed: true,
                  trashedAt: new Date(),
                  isModerated: true,
                  moderatedAt: new Date(),
                  moderatedBy: req.user._id
                });
                break;
              }
              case 'share': {
                const ItemShare = require('../models/ItemShare').default;
                await ItemShare.findByIdAndUpdate(targetId, {
                  status: 'revoked',
                  revokedAt: new Date(),
                  revokedBy: req.user._id,
                  revokedReason: 'moderation'
                });
                break;
              }
              default:
                // Unknown target type, log but don't fail
                console.warn(`Unknown target type for content removal: ${report.targetType}`);
            }
          } catch (contentError) {
            // Log but don't fail the resolution
            console.error(`Failed to remove content for report ${id}:`, contentError.message);
          }
        }
      }
    }

    await report.populate('reporterId', 'email profile.displayName profile.avatarUrl');
    await report.populate('reportedUserId', 'email profile.displayName profile.avatarUrl');
    await report.populate('resolution.resolvedBy', 'email profile.displayName');

    res.json({
      message: 'Report updated',
      report
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_report_update' });
    res.status(500).json({
      error: 'Failed to update report',
      code: 'REPORT_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/reports/user/:userId
 * Get all reports for a specific user
 */
router.get('/reports/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const reports = await Report.getReportsForUser(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await Report.countDocuments({ reportedUserId: userId });

    res.json({
      reports,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_user_reports_fetch' });
    res.status(500).json({
      error: 'Failed to fetch user reports',
      code: 'USER_REPORTS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

// =============================================================================
// SOCIAL MONITORING
// =============================================================================

/**
 * GET /admin/social/dashboard
 * Get social activity dashboard statistics
 */
router.get('/social/dashboard', async (req, res) => {
  try {
    const { period = 'weekly', days = 7 } = req.query;

    const stats = await adminSocialService.getSocialDashboardStats({
      period,
      days: parseInt(days)
    });

    res.json(stats);
  } catch (error) {
    attachError(req, error, { operation: 'admin_social_dashboard_fetch' });
    res.status(500).json({
      error: 'Failed to fetch social dashboard',
      code: 'SOCIAL_DASHBOARD_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/social-metrics
 * Get detailed social metrics for a user
 */
router.get('/users/:id/social-metrics', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const metrics = await adminSocialService.getUserSocialMetrics(id);

    res.json(metrics);
  } catch (error) {
    attachError(req, error, { operation: 'admin_user_social_metrics_fetch' });
    res.status(500).json({
      error: 'Failed to fetch user social metrics',
      code: 'SOCIAL_METRICS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/connection-patterns
 * Get connection pattern analysis for a user (spam detection)
 */
router.get('/users/:id/connection-patterns', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const patterns = await adminSocialService.getConnectionPatterns(id);

    res.json(patterns);
  } catch (error) {
    attachError(req, error, { operation: 'admin_connection_patterns_fetch' });
    res.status(500).json({
      error: 'Failed to fetch connection patterns',
      code: 'CONNECTION_PATTERNS_ERROR',
      requestId: req.requestId
    });
  }
});

// =============================================================================
// MODERATION TEMPLATES
// =============================================================================

/**
 * GET /admin/moderation-templates
 * Get all moderation templates
 */
router.get('/moderation-templates', async (req, res) => {
  try {
    const { actionType, includeInactive } = req.query;

    const query = {};
    if (actionType) {
      query.actionType = actionType;
    }
    if (!includeInactive) {
      query.isActive = true;
    }

    const templates = await ModerationTemplate.find(query)
      .sort({ usageCount: -1, name: 1 })
      .populate('createdBy', 'email profile.displayName')
      .lean();

    res.json({ templates });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_templates_fetch' });
    res.status(500).json({
      error: 'Failed to fetch moderation templates',
      code: 'TEMPLATES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/moderation-templates/:id
 * Get a specific moderation template
 */
router.get('/moderation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid template ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const template = await ModerationTemplate.findById(id)
      .populate('createdBy', 'email profile.displayName');

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        code: 'NOT_FOUND',
        requestId: req.requestId
      });
    }

    res.json({ template });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_template_fetch' });
    res.status(500).json({
      error: 'Failed to fetch moderation template',
      code: 'TEMPLATE_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/moderation-templates
 * Create a new moderation template
 */
router.post('/moderation-templates', async (req, res) => {
  try {
    const {
      name,
      actionType,
      reason,
      warningLevel,
      suspensionDays,
      category,
      description
    } = req.body;

    // Validation
    if (!name || !actionType || !reason) {
      return res.status(400).json({
        error: 'Name, action type, and reason are required',
        code: 'VALIDATION_ERROR',
        requestId: req.requestId
      });
    }

    if (!['warning', 'suspension', 'ban'].includes(actionType)) {
      return res.status(400).json({
        error: 'Invalid action type',
        code: 'INVALID_ACTION_TYPE',
        requestId: req.requestId
      });
    }

    const template = new ModerationTemplate({
      name: name.trim(),
      actionType,
      reason: reason.trim(),
      warningLevel: actionType === 'warning' ? warningLevel : undefined,
      suspensionDays: actionType === 'suspension' ? suspensionDays : undefined,
      category,
      description: description?.trim(),
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      message: 'Template created successfully',
      template: template.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_template_create' });
    res.status(500).json({
      error: 'Failed to create moderation template',
      code: 'TEMPLATE_CREATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PATCH /admin/moderation-templates/:id
 * Update a moderation template
 */
router.patch('/moderation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      reason,
      warningLevel,
      suspensionDays,
      category,
      description,
      isActive
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid template ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const template = await ModerationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        code: 'NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Update fields
    if (name !== undefined) template.name = name.trim();
    if (reason !== undefined) template.reason = reason.trim();
    if (warningLevel !== undefined) template.warningLevel = warningLevel;
    if (suspensionDays !== undefined) template.suspensionDays = suspensionDays;
    if (category !== undefined) template.category = category;
    if (description !== undefined) template.description = description?.trim();
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    res.json({
      message: 'Template updated successfully',
      template: template.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_template_update' });
    res.status(500).json({
      error: 'Failed to update moderation template',
      code: 'TEMPLATE_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /admin/moderation-templates/:id
 * Delete a moderation template
 */
router.delete('/moderation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid template ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const template = await ModerationTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        code: 'NOT_FOUND',
        requestId: req.requestId
      });
    }

    res.json({
      message: 'Template deleted successfully'
    });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_template_delete' });
    res.status(500).json({
      error: 'Failed to delete moderation template',
      code: 'TEMPLATE_DELETE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/moderation-templates/:id/use
 * Mark a template as used (increment usage count)
 */
router.post('/moderation-templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid template ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    await ModerationTemplate.incrementUsage(id);

    res.json({ message: 'Template usage recorded' });
  } catch (error) {
    attachError(req, error, { operation: 'moderation_template_use' });
    res.status(500).json({
      error: 'Failed to record template usage',
      code: 'TEMPLATE_USE_ERROR',
      requestId: req.requestId
    });
  }
});

// ============================================
// Admin Message Endpoints
// ============================================

/**
 * POST /admin/users/:id/admin-message
 * Send an admin message to a user
 */
router.post('/users/:id/admin-message', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, category, priority, relatedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    // Validate required fields
    if (!subject?.trim()) {
      return res.status(400).json({
        error: 'Subject is required',
        code: 'MISSING_SUBJECT',
        requestId: req.requestId
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE',
        requestId: req.requestId
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    // Send the admin message
    const adminMessage = await AdminMessage.sendMessage(
      req.user._id,
      id,
      {
        subject: subject.trim(),
        message: message.trim(),
        category: category || 'general',
        priority: priority || 'normal',
        relatedTo
      }
    );

    res.status(201).json({
      message: 'Admin message sent successfully',
      adminMessage: adminMessage.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_message_send' });
    res.status(500).json({
      error: 'Failed to send admin message',
      code: 'ADMIN_MESSAGE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/users/:id/admin-messages
 * Get admin messages sent to a user
 */
router.get('/users/:id/admin-messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0, unreadOnly, category } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    attachEntityId(req, 'targetUserId', id);

    const messages = await AdminMessage.getMessages(id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      unreadOnly: unreadOnly === 'true',
      category: category || null
    });

    const total = await AdminMessage.countDocuments({ userId: id });
    const unreadCount = await AdminMessage.getUnreadCount(id);

    res.json({
      messages: messages.map(m => m.toSafeJSON()),
      total,
      unreadCount,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });
  } catch (error) {
    attachError(req, error, { operation: 'admin_messages_fetch' });
    res.status(500).json({
      error: 'Failed to fetch admin messages',
      code: 'ADMIN_MESSAGES_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/admin-messages/:messageId
 * Get a specific admin message
 */
router.get('/admin-messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        error: 'Invalid message ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    const message = await AdminMessage.findById(messageId)
      .populate('sentBy', 'email profile.displayName profile.firstName profile.lastName')
      .populate('userId', 'email profile.displayName');

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
        requestId: req.requestId
      });
    }

    res.json({ message: message.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'admin_message_fetch' });
    res.status(500).json({
      error: 'Failed to fetch admin message',
      code: 'ADMIN_MESSAGE_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

// =============================================================================
// RATE LIMIT MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /admin/rate-limit/config
 * ----------------------------
 * Get the current rate limit configuration.
 */
router.get('/rate-limit/config', async (req, res) => {
  try {
    const config = await SystemSettings.getRateLimitConfig();

    req.eventName = 'admin.rate_limit.config.view';

    res.json({ config });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_config_fetch' });
    res.status(500).json({
      error: 'Failed to fetch rate limit configuration',
      code: 'RATE_LIMIT_CONFIG_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * PUT /admin/rate-limit/config
 * ----------------------------
 * Update the rate limit configuration.
 *
 * REQUEST BODY:
 * {
 *   enabled: boolean,
 *   windowMs: number,
 *   maxAttempts: number,
 *   trustedIPs: string[],
 *   alertThreshold: number,
 *   alertWindowMs: number
 * }
 */
router.put('/rate-limit/config', async (req, res) => {
  try {
    const { enabled, windowMs, maxAttempts, trustedIPs, alertThreshold, alertWindowMs } = req.body;

    // Validate windowMs with security-focused bounds (1 minute to 1 hour)
    if (windowMs !== undefined) {
      const { min, max } = RATE_LIMIT_CONSTRAINTS.windowMs;
      if (typeof windowMs !== 'number' || windowMs < min || windowMs > max) {
        return res.status(400).json({
          error: `Window must be between ${min / 60000} minute(s) and ${max / 3600000} hour(s)`,
          code: 'INVALID_WINDOW_MS',
          constraints: { min, max }
        });
      }
    }

    // Validate maxAttempts (3-50 range to prevent lockouts)
    if (maxAttempts !== undefined) {
      const { min, max } = RATE_LIMIT_CONSTRAINTS.maxAttempts;
      if (typeof maxAttempts !== 'number' || maxAttempts < min || maxAttempts > max) {
        return res.status(400).json({
          error: `Max attempts must be between ${min} and ${max}`,
          code: 'INVALID_MAX_ATTEMPTS',
          constraints: { min, max }
        });
      }
    }

    // Validate alertThreshold
    if (alertThreshold !== undefined) {
      const { min, max } = RATE_LIMIT_CONSTRAINTS.alertThreshold;
      if (typeof alertThreshold !== 'number' || alertThreshold < min || alertThreshold > max) {
        return res.status(400).json({
          error: `Alert threshold must be between ${min} and ${max}`,
          code: 'INVALID_ALERT_THRESHOLD',
          constraints: { min, max }
        });
      }
    }

    // Validate alertWindowMs
    if (alertWindowMs !== undefined) {
      const { min, max } = RATE_LIMIT_CONSTRAINTS.alertWindowMs;
      if (typeof alertWindowMs !== 'number' || alertWindowMs < min || alertWindowMs > max) {
        return res.status(400).json({
          error: 'Alert window must be between 1 minute and 24 hours',
          code: 'INVALID_ALERT_WINDOW',
          constraints: { min, max }
        });
      }
    }

    // Validate trustedIPs array and each IP address
    if (trustedIPs !== undefined) {
      if (!Array.isArray(trustedIPs)) {
        return res.status(400).json({
          error: 'Trusted IPs must be an array',
          code: 'INVALID_TRUSTED_IPS'
        });
      }
      if (trustedIPs.length > 100) {
        return res.status(400).json({
          error: 'Maximum 100 trusted IPs allowed',
          code: 'TOO_MANY_TRUSTED_IPS'
        });
      }
      // Validate each IP in the array
      for (const ip of trustedIPs) {
        if (!isValidIP(ip)) {
          return res.status(400).json({
            error: `Invalid IP address format: ${ip}`,
            code: 'INVALID_IP_FORMAT'
          });
        }
      }
    }

    const config = await SystemSettings.updateRateLimitConfig(
      { enabled, windowMs, maxAttempts, trustedIPs, alertThreshold, alertWindowMs },
      req.user._id
    );

    // Invalidate the cache so changes take effect immediately
    invalidateRateLimitConfigCache();

    req.eventName = 'admin.rate_limit.config.update';
    req.mutation = {
      after: { enabled, windowMs, maxAttempts, trustedIPCount: trustedIPs?.length }
    };

    res.json({ message: 'Rate limit configuration updated', config });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_config_update' });
    res.status(500).json({
      error: 'Failed to update rate limit configuration',
      code: 'RATE_LIMIT_CONFIG_UPDATE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/rate-limit/events
 * ----------------------------
 * Get rate limit events with pagination and filtering.
 *
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - ip: Filter by IP address
 * - email: Filter by attempted email
 * - resolved: Filter by resolution status (true/false)
 * - from: Start date
 * - to: End date
 */
router.get('/rate-limit/events', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      ip,
      email,
      resolved,
      from,
      to
    } = req.query;

    // Validate and bound pagination parameters
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const query = {};

    if (ip) query.ip = ip;
    // Escape regex special characters to prevent ReDoS attacks
    if (email) query.attemptedEmail = { $regex: escapeRegex(email), $options: 'i' };
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      RateLimitEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('resolvedBy', 'email profile.displayName'),
      RateLimitEvent.countDocuments(query)
    ]);

    req.eventName = 'admin.rate_limit.events.view';

    res.json({
      events,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_events_fetch' });
    res.status(500).json({
      error: 'Failed to fetch rate limit events',
      code: 'RATE_LIMIT_EVENTS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/rate-limit/stats
 * ---------------------------
 * Get rate limit statistics for the admin dashboard.
 *
 * QUERY PARAMS:
 * - windowMs: Time window for stats (default: 1 hour)
 */
router.get('/rate-limit/stats', async (req, res) => {
  try {
    const windowMs = parseInt(req.query.windowMs) || 60 * 60 * 1000; // Default: 1 hour

    const stats = await RateLimitEvent.getAlertStats(windowMs);
    const config = await SystemSettings.getRateLimitConfig();

    // Check if we should trigger an alert
    const alertTriggered = stats.totalEvents >= config.alertThreshold;

    req.eventName = 'admin.rate_limit.stats.view';

    res.json({
      stats,
      config: {
        alertThreshold: config.alertThreshold,
        alertWindowMs: config.alertWindowMs
      },
      alertTriggered
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_stats_fetch' });
    res.status(500).json({
      error: 'Failed to fetch rate limit statistics',
      code: 'RATE_LIMIT_STATS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/rate-limit/alerts
 * ----------------------------
 * Get unresolved rate limit events that need attention.
 * Used by the Attention section of the admin panel.
 */
router.get('/rate-limit/alerts', async (req, res) => {
  try {
    const windowMs = 60 * 60 * 1000; // 1 hour
    const stats = await RateLimitEvent.getAlertStats(windowMs);
    const config = await SystemSettings.getRateLimitConfig();

    // Get unresolved events
    const unresolvedEvents = await RateLimitEvent.getUnresolvedEvents(20);

    // Build alerts based on thresholds
    const alerts = [];

    // Alert if total events exceed threshold
    if (stats.totalEvents >= config.alertThreshold) {
      alerts.push({
        type: 'high_volume',
        severity: 'warning',
        message: `${stats.totalEvents} rate limit events in the last hour`,
        count: stats.totalEvents,
        threshold: config.alertThreshold
      });
    }

    // Alert for repeat offender IPs (3+ events from same IP)
    const repeatOffenderIPs = stats.byIP.filter(ip => ip.count >= 3);
    if (repeatOffenderIPs.length > 0) {
      alerts.push({
        type: 'repeat_offenders',
        severity: repeatOffenderIPs.some(ip => ip.count >= 5) ? 'danger' : 'warning',
        message: `${repeatOffenderIPs.length} IP(s) with multiple rate limit hits`,
        ips: repeatOffenderIPs.map(ip => ({
          ip: ip._id,
          count: ip.count,
          lastEvent: ip.lastEvent
        }))
      });
    }

    req.eventName = 'admin.rate_limit.alerts.view';

    res.json({
      alerts,
      unresolvedCount: stats.unresolvedCount,
      unresolvedEvents,
      stats: {
        totalEvents: stats.totalEvents,
        topIPs: stats.byIP.slice(0, 5),
        topEmails: stats.byEmail.slice(0, 5)
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_alerts_fetch' });
    res.status(500).json({
      error: 'Failed to fetch rate limit alerts',
      code: 'RATE_LIMIT_ALERTS_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/rate-limit/whitelist
 * --------------------------------
 * Add an IP address to the trusted IPs whitelist.
 *
 * REQUEST BODY:
 * {
 *   ip: string,
 *   resolveEvents: boolean (optional, default: true)
 * }
 */
router.post('/rate-limit/whitelist', async (req, res) => {
  try {
    const { ip, resolveEvents = true } = req.body;

    // Validate IP address format
    let validatedIP;
    try {
      validatedIP = validateIP(ip);
    } catch (e) {
      return res.status(400).json({
        error: 'Valid IPv4 or IPv6 address is required',
        code: 'INVALID_IP_FORMAT'
      });
    }

    // Add IP to whitelist
    const config = await SystemSettings.addTrustedIP(validatedIP, req.user._id);

    // Optionally resolve all events from this IP
    if (resolveEvents) {
      await RateLimitEvent.resolveEventsByIP(validatedIP, req.user._id, 'whitelisted');
    }

    // Invalidate the cache so whitelist changes take effect immediately
    invalidateRateLimitConfigCache();

    attachEntityId(req, 'whitelistedIP', validatedIP);
    req.eventName = 'admin.rate_limit.whitelist.add';

    res.json({
      message: `IP ${validatedIP} added to whitelist`,
      config
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_whitelist_add' });
    res.status(500).json({
      error: 'Failed to add IP to whitelist',
      code: 'WHITELIST_ADD_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /admin/rate-limit/whitelist/:ip
 * --------------------------------------
 * Remove an IP address from the trusted IPs whitelist.
 */
router.delete('/rate-limit/whitelist/:ip', async (req, res) => {
  try {
    const { ip } = req.params;

    // Validate IP address format (URL-decoded)
    const decodedIP = decodeURIComponent(ip);
    let validatedIP;
    try {
      validatedIP = validateIP(decodedIP);
    } catch (e) {
      return res.status(400).json({
        error: 'Valid IPv4 or IPv6 address is required',
        code: 'INVALID_IP_FORMAT'
      });
    }

    const config = await SystemSettings.removeTrustedIP(validatedIP, req.user._id);

    // Invalidate the cache so whitelist changes take effect immediately
    invalidateRateLimitConfigCache();

    attachEntityId(req, 'removedIP', validatedIP);
    req.eventName = 'admin.rate_limit.whitelist.remove';

    res.json({
      message: `IP ${validatedIP} removed from whitelist`,
      config
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_whitelist_remove' });
    res.status(500).json({
      error: 'Failed to remove IP from whitelist',
      code: 'WHITELIST_REMOVE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/rate-limit/events/:id/resolve
 * -----------------------------------------
 * Resolve a rate limit event.
 *
 * REQUEST BODY:
 * {
 *   action: 'whitelisted' | 'dismissed'
 * }
 */
router.post('/rate-limit/events/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action = 'dismissed' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid event ID',
        code: 'INVALID_ID'
      });
    }

    if (!['whitelisted', 'dismissed'].includes(action)) {
      return res.status(400).json({
        error: 'Action must be "whitelisted" or "dismissed"',
        code: 'INVALID_ACTION'
      });
    }

    const event = await RateLimitEvent.resolveEvent(id, req.user._id, action);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // If action is whitelist, also add IP to whitelist
    if (action === 'whitelisted') {
      await SystemSettings.addTrustedIP(event.ip, req.user._id);
    }

    attachEntityId(req, 'eventId', id);
    req.eventName = 'admin.rate_limit.event.resolve';

    res.json({
      message: 'Event resolved',
      event
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_event_resolve' });
    res.status(500).json({
      error: 'Failed to resolve event',
      code: 'EVENT_RESOLVE_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * POST /admin/rate-limit/events/resolve-by-ip
 * -------------------------------------------
 * Resolve all rate limit events from a specific IP.
 *
 * REQUEST BODY:
 * {
 *   ip: string,
 *   action: 'whitelisted' | 'dismissed'
 * }
 */
router.post('/rate-limit/events/resolve-by-ip', async (req, res) => {
  try {
    const { ip, action = 'dismissed' } = req.body;

    // Validate IP address format
    let validatedIP;
    try {
      validatedIP = validateIP(ip);
    } catch (e) {
      return res.status(400).json({
        error: 'Valid IPv4 or IPv6 address is required',
        code: 'INVALID_IP_FORMAT'
      });
    }

    if (!['whitelisted', 'dismissed'].includes(action)) {
      return res.status(400).json({
        error: 'Action must be "whitelisted" or "dismissed"',
        code: 'INVALID_ACTION'
      });
    }

    const result = await RateLimitEvent.resolveEventsByIP(validatedIP, req.user._id, action);

    // If action is whitelist, also add IP to whitelist
    if (action === 'whitelisted') {
      await SystemSettings.addTrustedIP(validatedIP, req.user._id);
    }

    attachEntityId(req, 'resolvedIP', validatedIP);
    req.eventName = 'admin.rate_limit.events.resolve_by_ip';

    res.json({
      message: `Resolved ${result.modifiedCount} events from IP ${validatedIP}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    attachError(req, error, { operation: 'rate_limit_events_resolve_by_ip' });
    res.status(500).json({
      error: 'Failed to resolve events',
      code: 'EVENTS_RESOLVE_ERROR',
      requestId: req.requestId
    });
  }
});

export default router;
