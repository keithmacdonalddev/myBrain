/**
 * =============================================================================
 * PROFILE.JS - User Profile Management Routes
 * =============================================================================
 *
 * This file handles all endpoints for managing the current user's profile.
 * While auth.js handles login/register and users.js handles viewing OTHER
 * users, this file handles YOUR OWN profile settings and information.
 *
 * WHAT IS A USER PROFILE?
 * -----------------------
 * A user profile contains personal information beyond just email/password:
 * - Name (first, last, display name)
 * - Contact info (phone)
 * - Bio and personal details
 * - Avatar (profile picture)
 * - Preferences and settings
 *
 * PROFILE VS ACCOUNT:
 * -------------------
 * - ACCOUNT: Email, password, role (handled by auth.js)
 * - PROFILE: Name, avatar, bio, preferences (handled by this file)
 *
 * ENDPOINTS IN THIS FILE:
 * -----------------------
 * - GET /profile - Get your profile info
 * - PATCH /profile - Update your profile info
 * - PATCH /profile/preferences - Update UI preferences
 * - POST /profile/change-password - Change your password
 * - POST /profile/change-email - Change your email
 * - DELETE /profile - Delete your account
 * - POST /profile/avatar - Upload profile picture
 * - DELETE /profile/avatar - Remove profile picture
 * - GET /profile/activity - View your activity log
 *
 * SECURITY NOTES:
 * ---------------
 * - All endpoints require authentication
 * - Sensitive actions (password/email change, delete) require password confirmation
 * - Activity logs help users monitor their account security
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Express router for handling HTTP requests.
 */
import express from 'express';

/**
 * bcryptjs for password hashing and verification.
 * Used when changing passwords and verifying for sensitive actions.
 */
import bcrypt from 'bcryptjs';

/**
 * User model for database operations.
 */
import User from '../models/User.js';

/**
 * Log model for fetching user activity history.
 * Logs are created automatically by the logging middleware.
 */
import Log from '../models/Log.js';

/**
 * Session model for revoking sessions on password change.
 * Also used for login history endpoint.
 */
import Session from '../models/Session.js';

/**
 * SecurityAlert model for user's security alerts.
 */
import SecurityAlert from '../models/SecurityAlert.js';

/**
 * Notification model for syncing security alert status.
 */
import Notification from '../models/Notification.js';

/**
 * Security service for creating security alerts.
 */
import { createPasswordChangedAlert } from '../services/securityService.js';

/**
 * Rate limiting for export endpoint.
 * Prevents abuse by limiting exports to 5 per hour.
 */
import rateLimit from 'express-rate-limit';

/**
 * CSV helper for activity export.
 */
import { escapeCSV } from '../utils/csvHelper.js';

/**
 * Regex helper for safe search queries.
 * Prevents ReDoS attacks by escaping special regex characters.
 */
import { escapeRegex } from '../utils/regexHelper.js';

/**
 * requireAuth middleware ensures only logged-in users can access routes.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError for structured error logging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * attachEntityId for Wide Events logging.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * File upload middleware for avatar uploads.
 * - uploadSingle: Handles single image upload
 * - handleUploadError: Error handler for upload failures
 */
import { uploadSingle, handleUploadError } from '../middleware/upload.js';

/**
 * isPrivateIP for detecting local/private IP addresses.
 * Used to display "Local Network" for logins from localhost or private networks.
 */
import { isPrivateIP } from '../utils/geoip.js';

/**
 * Image service for uploading and managing images.
 */
import * as imageService from '../services/imageService.js';

// =============================================================================
// HELPER FUNCTION: FORMAT ACTIVITY DESCRIPTION
// =============================================================================

/**
 * formatBytes(bytes)
 * ------------------
 * Converts bytes to a human-readable size string.
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Human-readable size (e.g., "2.4 MB")
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * formatActivityDescription(log)
 * ------------------------------
 * Converts a raw API log entry into a human-readable activity description
 * with rich metadata for enhanced display.
 *
 * WHY THIS EXISTS:
 * ----------------
 * API logs contain technical details like "POST /notes" or "PATCH /profile".
 * Users don't understand these. This function converts them to friendly
 * descriptions like "Created note: Meeting Notes" or "Updated profile".
 *
 * ENRICHMENT:
 * -----------
 * The function now returns additional metadata for richer display:
 * - entityTitle: The title/name of the entity (note, task, project, file)
 * - lifeArea: The life area context if available
 * - project: The project context if available
 * - fileInfo: File details (name, size, type) for file uploads
 * - deviceInfo: Device details for login activities
 * - settingChanged: What setting was modified
 *
 * @param {Object} log - Log entry from database
 *   - log.method: HTTP method (GET, POST, PATCH, DELETE)
 *   - log.route: API route path (e.g., "/notes/123")
 *   - log.statusCode: HTTP status code (200, 404, 500)
 *   - log.eventName: Custom event name if set
 *   - log.metadata: Additional context including requestBody with item titles
 *   - log.clientInfo: Client information including device details
 *
 * @returns {Object|null} Human-readable description with metadata
 *   - action: What happened (e.g., "Created note")
 *   - category: Type of action (content, account, security, settings)
 *   - entityTitle: Title of the entity (optional)
 *   - lifeArea: Life area name (optional)
 *   - project: Project name (optional)
 *   - fileInfo: { name, size, type } (optional)
 *   - deviceInfo: { browser, os } (optional)
 *   - settingChanged: What was changed (optional)
 *   - priority: Task priority if applicable (optional)
 *   - Returns null for actions we don't want to show users
 *
 * EXAMPLE:
 * Input: { method: 'POST', route: '/notes', metadata: { requestBody: { title: 'My Note' } } }
 * Output: { action: 'Created note', category: 'content', entityTitle: 'My Note' }
 *
 * CATEGORIES:
 * - content: Notes, tasks, projects, images
 * - account: Profile updates, settings
 * - security: Password changes, email changes
 * - settings: App preferences
 */
function formatActivityDescription(log) {
  const { method, route, statusCode, eventName, metadata, clientInfo } = log;

  // Extract request body data
  const requestBody = metadata?.requestBody || {};

  // Extract common entity properties
  const entityTitle = requestBody.title || requestBody.name || requestBody.text || null;
  const lifeArea = requestBody.lifeAreaName || requestBody.lifeArea || null;
  const project = requestBody.projectName || requestBody.project || null;
  const priority = requestBody.priority || null;

  // Extract device info for login activities
  const deviceInfo = clientInfo?.device ? {
    browser: clientInfo.device.browser,
    os: clientInfo.device.os,
    deviceType: clientInfo.device.deviceType
  } : null;

  // Helper to truncate long titles
  const truncate = (str, maxLen = 40) => {
    if (!str) return null;
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  };

  // Legacy helper for backward compatibility - appends title to action
  const withTitle = (action, itemTitle = entityTitle) => {
    if (itemTitle) {
      const truncated = truncate(itemTitle);
      return `${action}: ${truncated}`;
    }
    return action;
  };

  // =========================================================================
  // EXTRACT RESOURCE TYPE FROM ROUTE
  // =========================================================================

  // Strip query string first: "/notes/123?q=test" → "/notes/123"
  const cleanRoute = route.split('?')[0];
  // Split route into parts: "/notes/123" → ["notes", "123"]
  const routeParts = cleanRoute.split('/').filter(Boolean);
  const resource = routeParts[0] || 'app';

  // =========================================================================
  // HANDLE SPECIFIC EVENT NAMES
  // =========================================================================

  // Some actions have custom event names set by the code
  if (eventName === 'auth_login') {
    // Include device info for login activities
    return {
      action: 'Signed in',
      category: 'account',
      deviceInfo
    };
  }
  if (eventName === 'auth_logout' || eventName?.includes('logout')) {
    return { action: 'Signed out', category: 'account' };
  }

  // =========================================================================
  // HANDLE BY METHOD AND ROUTE
  // =========================================================================

  const isError = statusCode >= 400;

  // Map HTTP methods and routes to human-readable descriptions
  switch (resource) {
    // -----------------------------------------------------------------------
    // NOTES
    // -----------------------------------------------------------------------
    case 'notes':
      if (method === 'POST') {
        return {
          action: 'Created note',
          category: 'content',
          entityTitle: truncate(entityTitle),
          lifeArea: truncate(lifeArea, 20)
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        return {
          action: 'Updated note',
          category: 'content',
          entityTitle: truncate(entityTitle),
          lifeArea: truncate(lifeArea, 20)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a note', category: 'content' };
      if (method === 'GET') return null; // Skip read operations
      break;

    // -----------------------------------------------------------------------
    // TASKS
    // -----------------------------------------------------------------------
    case 'tasks':
      if (method === 'POST') {
        return {
          action: 'Created task',
          category: 'content',
          entityTitle: truncate(entityTitle),
          project: truncate(project, 20),
          priority
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        // Check for status changes
        if (requestBody.status === 'done') {
          return {
            action: 'Completed task',
            category: 'content',
            entityTitle: truncate(entityTitle),
            project: truncate(project, 20)
          };
        }
        return {
          action: 'Updated task',
          category: 'content',
          entityTitle: truncate(entityTitle),
          project: truncate(project, 20),
          priority
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a task', category: 'content' };
      if (method === 'GET') return null; // Skip read operations
      break;

    // -----------------------------------------------------------------------
    // PROJECTS
    // -----------------------------------------------------------------------
    case 'projects':
      if (method === 'POST') {
        return {
          action: 'Created project',
          category: 'content',
          entityTitle: truncate(entityTitle),
          lifeArea: truncate(lifeArea, 20)
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        if (requestBody.status === 'completed') {
          return {
            action: 'Completed project',
            category: 'content',
            entityTitle: truncate(entityTitle)
          };
        }
        return {
          action: 'Updated project',
          category: 'content',
          entityTitle: truncate(entityTitle),
          lifeArea: truncate(lifeArea, 20)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a project', category: 'content' };
      if (method === 'GET') return null; // Skip read operations
      break;

    // -----------------------------------------------------------------------
    // EVENTS (CALENDAR)
    // -----------------------------------------------------------------------
    case 'events':
      if (method === 'POST') {
        return {
          action: 'Created event',
          category: 'content',
          entityTitle: truncate(entityTitle)
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        return {
          action: 'Updated event',
          category: 'content',
          entityTitle: truncate(entityTitle)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted an event', category: 'content' };
      if (method === 'GET') return null; // Skip read operations
      break;

    // -----------------------------------------------------------------------
    // IMAGES
    // -----------------------------------------------------------------------
    case 'images':
      if (method === 'POST') {
        const imageName = requestBody.originalname || requestBody.name || requestBody.alt;
        return {
          action: 'Uploaded image',
          category: 'content',
          fileInfo: {
            name: truncate(imageName, 30),
            size: formatBytes(requestBody.size),
            type: 'image'
          }
        };
      }
      if (method === 'DELETE') return { action: 'Deleted an image', category: 'content' };
      if (method === 'GET') return null; // Skip read operations
      break;

    // -----------------------------------------------------------------------
    // PROFILE
    // -----------------------------------------------------------------------
    case 'profile':
      if (method === 'PATCH') {
        // Extract what was changed from request body
        const changedFields = Object.keys(requestBody).filter(k => k !== 'password');
        return {
          action: 'Updated profile',
          category: 'account',
          settingChanged: changedFields.length > 0 ? changedFields.join(', ') : null
        };
      }
      if (route.includes('avatar')) {
        if (method === 'POST') return { action: 'Updated profile picture', category: 'account' };
        if (method === 'DELETE') return { action: 'Removed profile picture', category: 'account' };
      }
      if (route.includes('change-password')) return { action: 'Changed password', category: 'security' };
      if (route.includes('change-email')) return { action: 'Changed email address', category: 'security' };
      break;

    // -----------------------------------------------------------------------
    // TAGS
    // -----------------------------------------------------------------------
    case 'tags':
      if (method === 'POST') {
        return {
          action: 'Created tag',
          category: 'content',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a tag', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // FILTERS
    // -----------------------------------------------------------------------
    case 'filters':
      if (method === 'POST') {
        return {
          action: 'Created filter',
          category: 'content',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'PATCH') {
        return {
          action: 'Updated filter',
          category: 'content',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a filter', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // WEATHER
    // -----------------------------------------------------------------------
    case 'weather':
      if (route.includes('locations')) {
        if (method === 'POST') {
          return {
            action: 'Added weather location',
            category: 'settings',
            entityTitle: truncate(requestBody.name || requestBody.city)
          };
        }
        if (method === 'DELETE') return { action: 'Removed a weather location', category: 'settings' };
      }
      break;

    // -----------------------------------------------------------------------
    // AUTH
    // -----------------------------------------------------------------------
    case 'auth':
      if (route.includes('signup')) {
        return {
          action: 'Created account',
          category: 'account',
          deviceInfo
        };
      }
      break;

    // -----------------------------------------------------------------------
    // FILES
    // -----------------------------------------------------------------------
    case 'files':
      if (method === 'POST') {
        const fileName = requestBody.title || requestBody.name || requestBody.originalname;
        return {
          action: 'Uploaded file',
          category: 'content',
          fileInfo: {
            name: truncate(fileName, 30),
            size: formatBytes(requestBody.size),
            type: requestBody.mimetype || requestBody.fileCategory || 'file'
          }
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a file', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // FOLDERS
    // -----------------------------------------------------------------------
    case 'folders':
      if (method === 'POST') {
        return {
          action: 'Created folder',
          category: 'content',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        return {
          action: 'Updated folder',
          category: 'content',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a folder', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // LIFE AREAS
    // -----------------------------------------------------------------------
    case 'life-areas':
      if (method === 'POST') {
        return {
          action: 'Created category',
          category: 'settings',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'PATCH' || method === 'PUT') {
        return {
          action: 'Updated category',
          category: 'settings',
          entityTitle: truncate(requestBody.name)
        };
      }
      if (method === 'DELETE') return { action: 'Deleted a category', category: 'settings' };
      break;

    // -----------------------------------------------------------------------
    // CONNECTIONS (SOCIAL)
    // -----------------------------------------------------------------------
    case 'connections':
      if (method === 'POST') return { action: 'Sent a connection request', category: 'account' };
      if (method === 'PATCH') return { action: 'Accepted a connection', category: 'account' };
      if (method === 'DELETE') return { action: 'Removed a connection', category: 'account' };
      break;

    // -----------------------------------------------------------------------
    // MESSAGES
    // -----------------------------------------------------------------------
    case 'messages':
      if (method === 'POST') return { action: 'Sent a message', category: 'social' };
      if (method === 'DELETE') return { action: 'Deleted a message', category: 'social' };
      break;

    // -----------------------------------------------------------------------
    // SETTINGS
    // -----------------------------------------------------------------------
    case 'settings':
      if (method === 'PATCH' || method === 'PUT') {
        // Extract what settings were changed
        const changedSettings = Object.keys(requestBody);
        return {
          action: 'Updated settings',
          category: 'settings',
          settingChanged: changedSettings.length > 0 ? changedSettings.join(', ') : null
        };
      }
      break;

    // -----------------------------------------------------------------------
    // SAVED LOCATIONS
    // -----------------------------------------------------------------------
    case 'saved-locations':
      if (method === 'POST') return { action: 'Saved a location', category: 'settings' };
      if (method === 'DELETE') return { action: 'Removed a saved location', category: 'settings' };
      break;

    // -----------------------------------------------------------------------
    // SHARES
    // -----------------------------------------------------------------------
    case 'shares':
    case 'item-shares':
      if (method === 'POST') return { action: 'Shared an item', category: 'content' };
      if (method === 'DELETE') return { action: 'Removed a share', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // NOTIFICATIONS
    // -----------------------------------------------------------------------
    case 'notifications':
      if (method === 'PATCH') return { action: 'Marked notifications as read', category: 'account' };
      break;
  }

  // =========================================================================
  // FALLBACK - Skip unrecognized routes
  // =========================================================================

  // Don't show generic descriptions like "Created analytics item"
  // If we don't know what it is, don't show it - better to show nothing
  // than confusing garbage. Only recognized, meaningful actions get shown.
  return null;
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Create an Express router for profile routes.
 * This router will be mounted at /profile in the main app.
 */
const router = express.Router();

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * BCRYPT_ROUNDS
 * -------------
 * Number of hashing rounds for password changes.
 * Must match the setting in auth.js for consistency.
 */
const BCRYPT_ROUNDS = 10;

// =============================================================================
// ROUTE: GET /profile
// =============================================================================

/**
 * GET /profile
 * ------------
 * Returns the current user's profile information.
 *
 * REQUIRES: Authentication
 *
 * SUCCESS RESPONSE:
 * {
 *   "user": {
 *     "_id": "...",
 *     "email": "user@example.com",
 *     "profile": {
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "displayName": "Johnny",
 *       "bio": "Hello world",
 *       "avatarUrl": "https://..."
 *     },
 *     "preferences": { ... }
 *   }
 * }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // req.user is set by requireAuth middleware
    // toSafeJSON() excludes sensitive fields like passwordHash
    res.json({
      user: req.user.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'profile_fetch' });
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /profile
// =============================================================================

/**
 * PATCH /profile
 * --------------
 * Updates the current user's profile information.
 *
 * REQUEST BODY (all fields optional):
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "displayName": "Johnny",
 *   "phone": "+1234567890",
 *   "bio": "Software developer",
 *   "location": "New York, NY",
 *   "website": "https://example.com",
 *   "timezone": "America/New_York",
 *   "avatarUrl": "https://...",
 *   "defaultAvatarId": "avatar-1"
 * }
 *
 * WHITELIST APPROACH:
 * Only specified fields can be updated. This prevents users from
 * updating sensitive fields like email, role, or passwordHash.
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Profile updated successfully",
 *   "user": { ... updated user data ... }
 * }
 */
router.patch('/', requireAuth, async (req, res) => {
  try {
    // =========================================================================
    // DEFINE ALLOWED FIELDS
    // =========================================================================

    // Only these fields can be updated via this endpoint
    // This is a security measure to prevent updating sensitive fields
    const allowedFields = [
      'firstName', 'lastName', 'displayName', 'phone',
      'bio', 'location', 'website', 'timezone', 'avatarUrl', 'defaultAvatarId'
    ];

    // =========================================================================
    // BUILD UPDATE OBJECT
    // =========================================================================

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // All profile fields are nested under 'profile' in the User model
        updates[`profile.${field}`] = req.body[field];
      }
    }

    // =========================================================================
    // VALIDATE UPDATES
    // =========================================================================

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // =========================================================================
    // APPLY UPDATES
    // =========================================================================

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }  // Return updated doc, run validators
    );

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.update.success';

    res.json({
      message: 'Profile updated successfully',
      user: user.toSafeJSON()
    });

  } catch (error) {
    attachError(req, error, { operation: 'profile_update' });

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /profile/preferences
// =============================================================================

/**
 * PATCH /profile/preferences
 * --------------------------
 * Updates user UI preferences.
 *
 * REQUEST BODY:
 * {
 *   "tooltipsEnabled": true | false
 * }
 *
 * PREFERENCES EXPLAINED:
 * - tooltipsEnabled: Whether to show helpful tooltips in the UI
 * - (More preferences can be added in the future)
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Preferences updated successfully",
 *   "user": { ... }
 * }
 */
router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    // Whitelist of allowed preference fields
    const allowedFields = ['tooltipsEnabled'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[`preferences.${field}`] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid preferences to update',
        code: 'NO_UPDATES'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Preferences updated successfully',
      user: user.toSafeJSON()
    });

  } catch (error) {
    attachError(req, error, { operation: 'preferences_update' });
    res.status(500).json({
      error: 'Failed to update preferences',
      code: 'PREFERENCES_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /profile/change-password
// =============================================================================

/**
 * POST /profile/change-password
 * -----------------------------
 * Changes the user's password.
 *
 * REQUEST BODY:
 * {
 *   "currentPassword": "oldpassword123",
 *   "newPassword": "newpassword456"
 * }
 *
 * SECURITY CHECKS:
 * 1. Current password must be correct (prevents hijacked sessions)
 * 2. New password must be at least 8 characters
 * 3. New password must be different from current
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Password changed successfully"
 * }
 *
 * NOTE:
 * - User stays logged in after password change
 * - passwordChangedAt timestamp is updated for audit
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Enforce minimum password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Prevent "changing" to the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    }

    // =========================================================================
    // VERIFY CURRENT PASSWORD
    // =========================================================================

    // Get user with password hash (normally excluded from queries)
    const user = await User.findById(req.user._id).select('+passwordHash');

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // =========================================================================
    // UPDATE PASSWORD
    // =========================================================================

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user with new hash and timestamp
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    await user.save();

    // =========================================================================
    // REVOKE ALL SESSIONS (SECURITY MEASURE)
    // =========================================================================

    /**
     * IMPORTANT: When password changes, revoke ALL sessions immediately.
     *
     * WHY? If someone's password was compromised:
     * 1. The attacker might have active sessions
     * 2. Changing password alone doesn't kick them out
     * 3. We need to force re-authentication everywhere
     *
     * This means the user changing their password will also be logged out
     * on all their other devices. This is expected and secure behavior.
     */
    const revokeResult = await Session.revokeAll(req.user._id, 'password_changed');

    // =========================================================================
    // CREATE SECURITY ALERT (Non-blocking)
    // =========================================================================

    /**
     * Create an informational security alert so the user has a record
     * of when their password was changed. This helps detect if someone
     * else changed their password (account compromise scenario).
     */
    setImmediate(async () => {
      try {
        const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
        await createPasswordChangedAlert(req.user._id, clientIP);
      } catch (err) {
        console.error('[Security] Failed to create password change alert:', err.message);
      }
    });

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.password_change.success';

    // Include session revocation info in response
    res.json({
      message: 'Password changed successfully',
      sessionsRevoked: revokeResult.modifiedCount || 0
    });

  } catch (error) {
    attachError(req, error, { operation: 'password_change' });
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /profile/change-email
// =============================================================================

/**
 * POST /profile/change-email
 * --------------------------
 * Changes the user's email address.
 *
 * REQUEST BODY:
 * {
 *   "newEmail": "newemail@example.com",
 *   "password": "currentpassword123"
 * }
 *
 * SECURITY CHECKS:
 * 1. Password must be correct (prevents hijacked sessions)
 * 2. Email format must be valid
 * 3. Email must not already be registered
 * 4. Email must be different from current
 *
 * NOTE:
 * In a production system, you'd typically:
 * 1. Send verification email to new address
 * 2. Only change email after verification
 * For simplicity, this changes immediately.
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Email changed successfully",
 *   "user": { ... }
 * }
 */
router.post('/change-email', requireAuth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================

    if (!newEmail || !password) {
      return res.status(400).json({
        error: 'New email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = newEmail.toLowerCase();

    // =========================================================================
    // CHECK IF SAME AS CURRENT
    // =========================================================================

    if (normalizedEmail === req.user.email) {
      return res.status(400).json({
        error: 'New email is the same as your current email',
        code: 'SAME_EMAIL'
      });
    }

    // =========================================================================
    // CHECK IF EMAIL ALREADY TAKEN
    // =========================================================================

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // =========================================================================
    // VERIFY PASSWORD
    // =========================================================================

    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // =========================================================================
    // UPDATE EMAIL
    // =========================================================================

    user.email = normalizedEmail;
    await user.save();

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.email_change.success';

    res.json({
      message: 'Email changed successfully',
      user: user.toSafeJSON()
    });

  } catch (error) {
    attachError(req, error, { operation: 'email_change' });

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to change email',
      code: 'EMAIL_CHANGE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: DELETE /profile
// =============================================================================

/**
 * DELETE /profile
 * ---------------
 * Permanently deletes the user's account.
 *
 * REQUEST BODY:
 * {
 *   "password": "currentpassword123"
 * }
 *
 * SECURITY:
 * Password required to prevent accidental deletion or hijacked sessions.
 *
 * WHAT GETS DELETED:
 * - User account
 * - Auth cookie cleared
 *
 * NOTE:
 * In a production system, you might:
 * - Soft delete (mark as deleted) instead
 * - Delete all user's content (notes, tasks, etc.)
 * - Send confirmation email
 * - Allow recovery period
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Account deleted successfully"
 * }
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================

    if (!password) {
      return res.status(400).json({
        error: 'Password is required to delete account',
        code: 'MISSING_PASSWORD'
      });
    }

    // =========================================================================
    // VERIFY PASSWORD
    // =========================================================================

    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // =========================================================================
    // DELETE USER
    // =========================================================================

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.account_delete.success';

    await User.findByIdAndDelete(req.user._id);

    // =========================================================================
    // CLEAR AUTH COOKIE
    // =========================================================================

    // User is no longer authenticated
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    attachError(req, error, { operation: 'account_delete' });
    res.status(500).json({
      error: 'Failed to delete account',
      code: 'DELETE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /profile/avatar
// =============================================================================

/**
 * POST /profile/avatar
 * --------------------
 * Uploads a new profile avatar (profile picture).
 *
 * REQUEST:
 * - Content-Type: multipart/form-data
 * - Field name: "image"
 * - File type: JPEG, PNG, GIF, or WebP
 * - Max size: 5MB
 *
 * PROCESS:
 * 1. Validate file uploaded
 * 2. Delete old avatar if exists
 * 3. Upload new image to storage
 * 4. Update user profile with new URL
 *
 * MIDDLEWARE CHAIN:
 * requireAuth → uploadSingle → handleUploadError → (this handler)
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Avatar uploaded successfully",
 *   "user": { ... },
 *   "image": { ... image metadata ... }
 * }
 */
router.post('/avatar', requireAuth, uploadSingle, handleUploadError, async (req, res) => {
  try {
    // =========================================================================
    // CHECK FILE UPLOADED
    // =========================================================================

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    // =========================================================================
    // DELETE OLD AVATAR IF EXISTS
    // =========================================================================

    // If user already has an avatar, delete it from storage
    // This prevents orphaned files in storage
    if (req.user.profile?.avatarStorageKey) {
      await imageService.deleteImageByStorageKey(req.user.profile.avatarStorageKey);
    }

    // =========================================================================
    // UPLOAD NEW AVATAR
    // =========================================================================

    // Upload to storage (S3) with specific folder for avatars
    const image = await imageService.uploadImage(req.file, req.user._id, {
      folder: 'avatars',
      alt: `${req.user.email}'s avatar`,
    });

    // Get the URL for the uploaded image
    const avatarUrl = await imageService.getImageUrl(image, 'original');

    // =========================================================================
    // UPDATE USER PROFILE
    // =========================================================================

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'profile.avatarUrl': avatarUrl,
          'profile.avatarStorageKey': image.storageKey,
          'profile.avatarThumbnailKey': image.thumbnailKey,
        },
      },
      { new: true }
    );

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.avatar_upload.success';

    res.json({
      message: 'Avatar uploaded successfully',
      user: user.toSafeJSON(),
      image,
    });

  } catch (error) {
    attachError(req, error, { operation: 'avatar_upload' });
    res.status(500).json({
      error: 'Failed to upload avatar',
      code: 'AVATAR_UPLOAD_ERROR',
    });
  }
});

// =============================================================================
// ROUTE: DELETE /profile/avatar
// =============================================================================

/**
 * DELETE /profile/avatar
 * ----------------------
 * Removes the user's profile avatar.
 *
 * PROCESS:
 * 1. Check if user has an avatar
 * 2. Delete image from storage
 * 3. Clear avatar fields from profile
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Avatar deleted successfully",
 *   "user": { ... }
 * }
 */
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    // =========================================================================
    // CHECK IF AVATAR EXISTS
    // =========================================================================

    if (!req.user.profile?.avatarStorageKey) {
      return res.status(400).json({
        error: 'No avatar to delete',
        code: 'NO_AVATAR',
      });
    }

    // =========================================================================
    // DELETE FROM STORAGE
    // =========================================================================

    // Delete from S3 and database
    await imageService.deleteImageByStorageKey(req.user.profile.avatarStorageKey);

    // =========================================================================
    // CLEAR AVATAR FROM PROFILE
    // =========================================================================

    // $unset removes the fields entirely
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          'profile.avatarUrl': '',
          'profile.avatarStorageKey': '',
          'profile.avatarThumbnailKey': '',
        },
      },
      { new: true }
    );

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.avatar_delete.success';

    res.json({
      message: 'Avatar deleted successfully',
      user: user.toSafeJSON(),
    });

  } catch (error) {
    attachError(req, error, { operation: 'avatar_delete' });
    res.status(500).json({
      error: 'Failed to delete avatar',
      code: 'AVATAR_DELETE_ERROR',
    });
  }
});

// =============================================================================
// ROUTE: PATCH /profile/dashboard-preferences
// =============================================================================

/**
 * PATCH /profile/dashboard-preferences
 * ------------------------------------
 * Updates user dashboard preferences including pinned widgets,
 * hidden widgets, and per-widget settings.
 *
 * REQUEST BODY (all fields optional):
 * {
 *   "pinnedWidgets": [
 *     { "widgetId": "calendar", "position": "top-right", "size": "narrow" }
 *   ],
 *   "hiddenWidgets": ["featureGuide"],
 *   "widgetSettings": {
 *     "weather": { "unit": "celsius" }
 *   },
 *   "lastVisit": "2024-01-15T10:30:00Z"
 * }
 *
 * VALIDATION:
 * - pinnedWidgets must have valid widgetId, position, and size values
 * - Maximum 4 pinned widgets recommended (enforced client-side)
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Dashboard preferences updated successfully",
 *   "user": { ... }
 * }
 */
router.patch('/dashboard-preferences', requireAuth, async (req, res) => {
  try {
    const { pinnedWidgets, hiddenWidgets, widgetSettings, lastVisit } = req.body;
    const updates = {};

    // Validate and set pinned widgets
    if (pinnedWidgets !== undefined) {
      if (!Array.isArray(pinnedWidgets)) {
        return res.status(400).json({
          error: 'pinnedWidgets must be an array',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate each pinned widget
      const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'always-show'];
      const validSizes = ['narrow', 'default', 'wide'];

      for (const widget of pinnedWidgets) {
        if (!widget.widgetId || typeof widget.widgetId !== 'string') {
          return res.status(400).json({
            error: 'Each pinned widget must have a widgetId',
            code: 'VALIDATION_ERROR'
          });
        }
        if (widget.position && !validPositions.includes(widget.position)) {
          return res.status(400).json({
            error: `Invalid position "${widget.position}". Must be one of: ${validPositions.join(', ')}`,
            code: 'VALIDATION_ERROR'
          });
        }
        if (widget.size && !validSizes.includes(widget.size)) {
          return res.status(400).json({
            error: `Invalid size "${widget.size}". Must be one of: ${validSizes.join(', ')}`,
            code: 'VALIDATION_ERROR'
          });
        }
      }

      updates['preferences.dashboard.pinnedWidgets'] = pinnedWidgets;
    }

    // Validate and set hidden widgets
    if (hiddenWidgets !== undefined) {
      if (!Array.isArray(hiddenWidgets)) {
        return res.status(400).json({
          error: 'hiddenWidgets must be an array',
          code: 'VALIDATION_ERROR'
        });
      }
      updates['preferences.dashboard.hiddenWidgets'] = hiddenWidgets;
    }

    // Set widget settings (any object is valid)
    if (widgetSettings !== undefined) {
      if (typeof widgetSettings !== 'object' || widgetSettings === null) {
        return res.status(400).json({
          error: 'widgetSettings must be an object',
          code: 'VALIDATION_ERROR'
        });
      }
      updates['preferences.dashboard.widgetSettings'] = widgetSettings;
    }

    // Set last visit timestamp
    if (lastVisit !== undefined) {
      const visitDate = new Date(lastVisit);
      if (isNaN(visitDate.getTime())) {
        return res.status(400).json({
          error: 'lastVisit must be a valid date',
          code: 'VALIDATION_ERROR'
        });
      }
      updates['preferences.dashboard.lastVisit'] = visitDate;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid preferences to update',
        code: 'NO_UPDATES'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.dashboard_preferences.update';

    res.json({
      message: 'Dashboard preferences updated successfully',
      user: user.toSafeJSON()
    });

  } catch (error) {
    attachError(req, error, { operation: 'dashboard_preferences_update' });
    res.status(500).json({
      error: 'Failed to update dashboard preferences',
      code: 'DASHBOARD_PREFERENCES_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /profile/activity
// =============================================================================

/**
 * Category route patterns for filtering
 * Uses kebab-case to match actual route definitions
 */
const CATEGORY_ROUTES = {
  content: /^\/(notes|tasks|projects|events|files|images|folders)/i,
  account: /^\/(profile)/i,
  security: /^\/(auth)/i,
  social: /^\/(connections|messages|shares|item-shares)/i,
  settings: /^\/(settings|filters|saved-locations|tags|life-areas)/i
};

/**
 * GET /profile/activity
 * ---------------------
 * Returns the user's recent activity in human-readable format.
 *
 * BACKWARD COMPATIBLE: Maintains the original response format when no
 * new parameters are used. The Settings page relies on this format.
 *
 * LEGACY QUERY PARAMETERS (original behavior):
 * - limit: Max activities to return (default 50)
 * - days: How many days back to look (default 30)
 *
 * NEW QUERY PARAMETERS (enhanced features):
 * - cursor: ISO timestamp for pagination (mutually exclusive with dateFrom/dateTo)
 * - category: Filter by content|account|security|social|settings
 * - search: Keyword search in eventName/route (ReDoS protected)
 * - grouped: Boolean - collapse repeated actions by hour
 * - dateFrom: ISO date for range start (when no cursor)
 * - dateTo: ISO date for range end (when no cursor)
 * - format: 'legacy' (default) or 'enhanced' for response format
 *
 * LEGACY RESPONSE FORMAT (when no new params or format='legacy'):
 * {
 *   "activities": [...],
 *   "timeline": [...],    // Grouped by date for Settings page
 *   "total": 45,
 *   "period": "30 days"
 * }
 *
 * ENHANCED RESPONSE FORMAT (when new params or format='enhanced'):
 * {
 *   "activities": [...],
 *   "nextCursor": "2024-01-15T10:30:00.000Z" | null,
 *   "hasMore": true | false
 * }
 */
router.get('/activity', requireAuth, async (req, res) => {
  try {
    // =========================================================================
    // PARSE QUERY PARAMETERS
    // =========================================================================

    const {
      // Legacy parameters
      limit = 50,
      days = 30,
      // New enhancement parameters
      cursor,
      category,
      search,
      grouped = 'false',
      dateFrom,
      dateTo,
      format = 'legacy'
    } = req.query;

    // Parse and cap the limit (max 200 for enhanced, 50 for legacy)
    const parsedLimit = Math.min(parseInt(limit) || 50, 200);

    // Determine if this is an enhanced query (new params used)
    const isEnhancedQuery = cursor || category || search || grouped === 'true' || format === 'enhanced';

    // =========================================================================
    // BUILD BASE QUERY
    // =========================================================================

    const query = {
      userId: req.user._id,
      // Only include meaningful actions (not pure reads)
      $or: [
        { method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] } },
        { eventName: 'auth_login' },
        { eventName: 'auth_logout' },
        { eventName: { $regex: /logout/i } }
      ]
    };

    // =========================================================================
    // DATE FILTERING (cursor OR date range)
    // =========================================================================

    if (cursor) {
      // Validate cursor date format
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid cursor format',
          code: 'INVALID_CURSOR'
        });
      }
      // Cursor pagination: get items older than cursor
      query.timestamp = { $lt: cursorDate };
    } else if (dateFrom || dateTo) {
      // Date range filter (only when no cursor)
      query.timestamp = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          query.timestamp.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          query.timestamp.$lte = toDate;
        }
      }
    } else if (!isEnhancedQuery) {
      // Legacy behavior: use days parameter
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days));
      query.timestamp = { $gte: since };
    }

    // =========================================================================
    // CATEGORY FILTER
    // =========================================================================

    if (category && CATEGORY_ROUTES[category]) {
      // Use the category field if available, fallback to route regex
      // Note: New logs have category field, old logs need route regex
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { category },  // New logs with category field
          { route: CATEGORY_ROUTES[category] }  // Old logs without category field
        ]
      });
    }

    // =========================================================================
    // SEARCH FILTER (ReDoS protected)
    // =========================================================================

    if (search) {
      // Escape special regex characters to prevent ReDoS attacks
      const safeSearch = escapeRegex(search);
      // Add search to existing $or or create new one
      const searchOr = [
        { eventName: { $regex: safeSearch, $options: 'i' } },
        { route: { $regex: safeSearch, $options: 'i' } }
      ];
      // Combine with existing query using $and
      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    // =========================================================================
    // GROUPED MODE (collapse repeated actions by hour)
    // =========================================================================

    if (grouped === 'true') {
      // Use aggregation with $facet for proper grouping
      // $facet allows us to group ALL matching documents, not just the first N
      const results = await Log.aggregate([
        { $match: query },
        { $sort: { timestamp: -1 } },
        {
          $facet: {
            grouped: [
              {
                $group: {
                  _id: {
                    eventName: '$eventName',
                    // Use $dateToString for MongoDB 4.x compatibility (not $dateTrunc)
                    hour: { $dateToString: { format: '%Y-%m-%d-%H', date: '$timestamp' } }
                  },
                  count: { $sum: 1 },
                  firstTimestamp: { $min: '$timestamp' },
                  lastTimestamp: { $max: '$timestamp' },
                  sample: { $first: '$$ROOT' }
                }
              },
              { $sort: { lastTimestamp: -1 } },
              { $limit: parsedLimit + 1 }
            ]
          }
        }
      ]);

      const groupedActivities = results[0]?.grouped || [];
      const hasMore = groupedActivities.length > parsedLimit;
      const items = hasMore ? groupedActivities.slice(0, -1) : groupedActivities;

      // Format grouped activities with enriched metadata
      const activities = items.map(g => {
        const formatted = formatActivityDescription(g.sample);
        if (!formatted) return null;

        return {
          id: g.sample._id,
          action: formatted.action,
          category: formatted.category,
          timestamp: g.lastTimestamp,
          success: g.sample.statusCode < 400,
          ip: g.sample.clientInfo?.ip || null,
          count: g.count,
          firstTimestamp: g.firstTimestamp,
          lastTimestamp: g.lastTimestamp,
          // Enriched metadata (optional fields)
          entityTitle: formatted.entityTitle || null,
          lifeArea: formatted.lifeArea || null,
          project: formatted.project || null,
          fileInfo: formatted.fileInfo || null,
          deviceInfo: formatted.deviceInfo || null,
          settingChanged: formatted.settingChanged || null,
          priority: formatted.priority || null
        };
      }).filter(Boolean);

      return res.json({
        activities,
        nextCursor: hasMore && items.length > 0
          ? items[items.length - 1].lastTimestamp.toISOString()
          : null,
        hasMore
      });
    }

    // =========================================================================
    // STANDARD QUERY (non-grouped)
    // =========================================================================

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(parsedLimit + 1)  // Fetch one extra to check for more
      .select('timestamp method route statusCode eventName clientInfo.ip clientInfo.device metadata.requestBody category')
      .lean();

    const hasMore = logs.length > parsedLimit;
    const items = hasMore ? logs.slice(0, -1) : logs;

    // =========================================================================
    // FORMAT ACTIVITIES WITH ENRICHED METADATA
    // =========================================================================

    const activities = [];
    for (const log of items) {
      const formatted = formatActivityDescription(log);
      if (formatted) {
        activities.push({
          id: log._id,
          action: formatted.action,
          category: formatted.category,
          timestamp: log.timestamp,
          success: log.statusCode < 400,
          ip: log.clientInfo?.ip || null,
          device: log.clientInfo?.device || null,
          // Enriched metadata (optional fields)
          entityTitle: formatted.entityTitle || null,
          lifeArea: formatted.lifeArea || null,
          project: formatted.project || null,
          fileInfo: formatted.fileInfo || null,
          deviceInfo: formatted.deviceInfo || null,
          settingChanged: formatted.settingChanged || null,
          priority: formatted.priority || null
        });
      }
    }

    // =========================================================================
    // RETURN RESPONSE (legacy or enhanced format)
    // =========================================================================

    if (!isEnhancedQuery) {
      // Legacy format for backward compatibility with Settings page
      const grouped = {};
      for (const activity of activities) {
        const dateKey = new Date(activity.timestamp).toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(activity);
      }

      const timeline = Object.entries(grouped).map(([date, items]) => ({
        date,
        activities: items
      }));

      return res.json({
        activities,
        timeline,
        total: activities.length,
        period: `${days} days`
      });
    }

    // Enhanced format with cursor pagination
    res.json({
      activities,
      nextCursor: hasMore && items.length > 0
        ? items[items.length - 1].timestamp.toISOString()
        : null,
      hasMore
    });

  } catch (error) {
    attachError(req, error, { operation: 'activity_fetch' });
    res.status(500).json({
      error: 'Failed to fetch activity',
      code: 'ACTIVITY_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /profile/activity/stats
// =============================================================================

/**
 * Event name aliases for backward compatibility
 * Old logs may use underscore format, new logs use dot format
 */
const LOGIN_EVENT_NAMES = ['auth.login.success', 'auth_login'];
const LOGOUT_EVENT_NAMES = ['auth.logout.success', 'auth_logout'];

/**
 * GET /profile/activity/stats
 * ---------------------------
 * Returns activity statistics for a time period.
 *
 * QUERY PARAMETERS:
 * - period: 7d | 30d | 90d (default 30d)
 *
 * RESPONSE:
 * {
 *   "period": "30d",
 *   "summary": {
 *     "totalActions": 156,
 *     "loginCount": 12,
 *     "mostActiveDay": "Wednesday"
 *   },
 *   "byCategory": {
 *     "content": 120,
 *     "security": 15,
 *     "social": 10,
 *     "account": 8,
 *     "settings": 3
 *   }
 * }
 */
router.get('/activity/stats', requireAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Parse period to days
    const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // =========================================================================
    // RUN PARALLEL QUERIES FOR STATS
    // =========================================================================

    const [totalActions, byCategory, byDay, loginCount] = await Promise.all([
      // Total actions count
      Log.countDocuments({
        userId: req.user._id,
        timestamp: { $gte: since },
        method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] }
      }),

      // Actions by category (aggregation)
      Log.aggregate([
        {
          $match: {
            userId: req.user._id,
            timestamp: { $gte: since },
            method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] }
          }
        },
        {
          $project: {
            category: {
              $switch: {
                branches: [
                  // Content routes
                  {
                    case: { $regexMatch: { input: '$route', regex: /^\/(notes|tasks|projects|events|files|images|folders)/i } },
                    then: 'content'
                  },
                  // Security routes
                  {
                    case: { $regexMatch: { input: '$route', regex: /^\/(auth)/i } },
                    then: 'security'
                  },
                  // Social routes
                  {
                    case: { $regexMatch: { input: '$route', regex: /^\/(connections|messages|shares|item-shares)/i } },
                    then: 'social'
                  },
                  // Account routes
                  {
                    case: { $regexMatch: { input: '$route', regex: /^\/(profile)/i } },
                    then: 'account'
                  },
                  // Settings routes
                  {
                    case: { $regexMatch: { input: '$route', regex: /^\/(settings|filters|saved-locations|tags|life-areas)/i } },
                    then: 'settings'
                  }
                ],
                default: 'other'
              }
            }
          }
        },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),

      // Actions by day of week
      Log.aggregate([
        {
          $match: {
            userId: req.user._id,
            timestamp: { $gte: since },
            method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] }
          }
        },
        { $group: { _id: { $dayOfWeek: '$timestamp' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Login count (handle both old and new event names)
      Log.countDocuments({
        userId: req.user._id,
        timestamp: { $gte: since },
        eventName: { $in: LOGIN_EVENT_NAMES }
      })
    ]);

    // =========================================================================
    // FORMAT RESPONSE
    // =========================================================================

    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const categoryStats = Object.fromEntries(byCategory.map(c => [c._id, c.count]));

    res.json({
      period,
      summary: {
        totalActions,
        loginCount,
        mostActiveDay: byDay[0] ? dayNames[byDay[0]._id] : 'N/A'
      },
      byCategory: {
        content: categoryStats.content || 0,
        security: categoryStats.security || 0,
        social: categoryStats.social || 0,
        account: categoryStats.account || 0,
        settings: categoryStats.settings || 0,
        other: categoryStats.other || 0
      }
    });

  } catch (error) {
    attachError(req, error, { operation: 'activity_stats' });
    res.status(500).json({
      error: 'Failed to fetch activity stats',
      code: 'ACTIVITY_STATS_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /profile/activity/logins
// =============================================================================

/**
 * GET /profile/activity/logins
 * ----------------------------
 * Returns login history with device and location information.
 * Uses the Session model for detailed login tracking.
 *
 * QUERY PARAMETERS:
 * - cursor: ISO timestamp for pagination
 * - limit: Max items (default 20, max 50)
 *
 * RESPONSE:
 * {
 *   "logins": [
 *     {
 *       "id": "ses_xxx",
 *       "timestamp": "2024-01-15T10:30:00Z",
 *       "device": { "type": "desktop", "browser": "Chrome", "os": "Windows", "display": "Chrome on Windows" },
 *       "location": { "city": "New York", "country": "United States", "ip": "...", "display": "New York, United States" },
 *       "status": "active",
 *       "isNewDevice": false,
 *       "isNewLocation": false
 *     }
 *   ],
 *   "nextCursor": "2024-01-10T08:00:00.000Z" | null,
 *   "hasMore": true | false
 * }
 */
router.get('/activity/logins', requireAuth, async (req, res) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 20, 50);

    // Build query
    const query = { userId: req.user._id };

    // Cursor pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid cursor format',
          code: 'INVALID_CURSOR'
        });
      }
      query.createdAt = { $lt: cursorDate };
    }

    // Fetch sessions
    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1)
      .lean();

    const hasMore = sessions.length > parsedLimit;
    const items = hasMore ? sessions.slice(0, -1) : sessions;

    // Get total count for pagination info
    const total = await Session.countDocuments({ userId: req.user._id });

    // Format logins
    const logins = items.map(s => ({
      id: s.sessionId,
      timestamp: s.createdAt,
      device: {
        type: s.device?.deviceType || 'unknown',
        browser: s.device?.browser || 'Unknown',
        os: s.device?.os || 'Unknown',
        display: s.device?.browser
          ? `${s.device.browser} on ${s.device.os || 'Unknown OS'}`
          : 'Unknown Device'
      },
      location: {
        city: s.location?.city || 'Unknown',
        country: s.location?.country || 'Unknown',
        ip: s.location?.ip,
        display: s.location?.city && s.location.city !== 'Unknown'
          ? `${s.location.city}, ${s.location.country}`
          : (s.location?.country === 'Local Network' || isPrivateIP(s.location?.ip))
            ? 'Local Network'
            : s.location?.ip || 'Unknown Location'
      },
      status: s.status,
      // For login history, a session existing means the login succeeded
      // (failed logins don't create sessions)
      success: true,
      isNewDevice: s.securityFlags?.isNewDevice || false,
      isNewLocation: s.securityFlags?.isNewLocation || false
    }));

    res.json({
      logins,
      total,
      nextCursor: hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null,
      hasMore
    });

  } catch (error) {
    attachError(req, error, { operation: 'activity_logins' });
    res.status(500).json({
      error: 'Failed to fetch login history',
      code: 'LOGINS_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /profile/activity/export
// =============================================================================

/**
 * Rate limiter for activity export
 * Prevents abuse by limiting to 5 exports per hour
 */
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour
  message: { error: 'Too many export requests. Try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key (requires auth)
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

/**
 * GET /profile/activity/export
 * ----------------------------
 * Export activity logs as CSV or JSON file.
 *
 * QUERY PARAMETERS:
 * - format: json | csv (default json)
 * - dateFrom: Required ISO date for range start
 * - dateTo: Required ISO date for range end (max 90 days from dateFrom)
 *
 * RATE LIMIT: 5 exports per hour per user
 *
 * RESPONSE:
 * - JSON: { activities: [...], exportedAt: "...", count: N }
 * - CSV: File download with headers
 */
router.get('/activity/export', requireAuth, exportLimiter, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;

    // =========================================================================
    // VALIDATE DATE RANGE
    // =========================================================================

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'dateFrom and dateTo are required',
        code: 'MISSING_DATE_RANGE'
      });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        code: 'INVALID_DATE'
      });
    }

    // Check 90-day max range
    const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
    if (to - from > MAX_RANGE_MS) {
      return res.status(400).json({
        error: 'Date range cannot exceed 90 days',
        code: 'DATE_RANGE_TOO_LARGE'
      });
    }

    // =========================================================================
    // FETCH LOGS
    // =========================================================================

    const logs = await Log.find({
      userId: req.user._id,
      timestamp: { $gte: from, $lte: to },
      method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] }
    })
      .sort({ timestamp: -1 })
      .limit(10000)  // Safety limit
      .lean();

    // =========================================================================
    // FORMAT ACTIVITIES
    // =========================================================================

    const activities = [];
    for (const log of logs) {
      const formatted = formatActivityDescription(log);
      if (formatted) {
        activities.push({
          timestamp: log.timestamp.toISOString(),
          action: formatted.action,
          category: formatted.category,
          ip: log.clientInfo?.ip || 'Unknown',
          success: log.statusCode < 400
        });
      }
    }

    // =========================================================================
    // RETURN RESPONSE (JSON or CSV)
    // =========================================================================

    if (format === 'csv') {
      // Build CSV with proper escaping
      const headers = ['Timestamp', 'Action', 'Category', 'IP', 'Success'];
      const rows = activities.map(a => [
        escapeCSV(a.timestamp),
        escapeCSV(a.action),
        escapeCSV(a.category),
        escapeCSV(a.ip),
        escapeCSV(a.success ? 'Yes' : 'No')
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=activity-${Date.now()}.csv`);
      return res.send(csv);
    }

    // JSON format
    res.setHeader('Content-Disposition', `attachment; filename=activity-${Date.now()}.json`);
    res.json({
      activities,
      exportedAt: new Date().toISOString(),
      count: activities.length,
      dateRange: { from: dateFrom, to: dateTo }
    });

  } catch (error) {
    attachError(req, error, { operation: 'activity_export' });
    res.status(500).json({
      error: 'Failed to export activity',
      code: 'EXPORT_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /profile/security-alerts
// =============================================================================

/**
 * GET /profile/security-alerts
 * ----------------------------
 * Returns user's security alerts with cursor pagination.
 *
 * QUERY PARAMETERS:
 * - status: Filter by unread | read | dismissed (default: exclude dismissed)
 * - cursor: ISO timestamp for pagination
 * - limit: Max items (default 20, max 50)
 *
 * RESPONSE:
 * {
 *   "alerts": [
 *     {
 *       "id": "...",
 *       "type": "new_device",
 *       "severity": "info",
 *       "title": "New device sign-in",
 *       "description": "...",
 *       "status": "unread",
 *       "createdAt": "...",
 *       "metadata": { ... }
 *     }
 *   ],
 *   "nextCursor": "...",
 *   "hasMore": true | false,
 *   "unreadCount": 3
 * }
 */
router.get('/security-alerts', requireAuth, async (req, res) => {
  try {
    const { status, cursor, limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 20, 50);

    // Build query
    const query = { userId: req.user._id };

    // Status filter
    if (status && ['unread', 'read', 'dismissed'].includes(status)) {
      query.status = status;
    } else {
      // Default: exclude dismissed alerts
      query.status = { $ne: 'dismissed' };
    }

    // Cursor pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid cursor format',
          code: 'INVALID_CURSOR'
        });
      }
      query.createdAt = { $lt: cursorDate };
    }

    // Fetch alerts
    const alerts = await SecurityAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1)
      .lean();

    const hasMore = alerts.length > parsedLimit;
    const items = hasMore ? alerts.slice(0, -1) : alerts;

    // Get unread count
    const unreadCount = await SecurityAlert.getUnreadCount(req.user._id);

    // Format alerts
    const formattedAlerts = items.map(a => ({
      id: a._id,
      type: a.alertType,
      severity: a.severity,
      title: a.title,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt,
      metadata: a.metadata
    }));

    res.json({
      alerts: formattedAlerts,
      nextCursor: hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null,
      hasMore,
      unreadCount
    });

  } catch (error) {
    attachError(req, error, { operation: 'security_alerts_fetch' });
    res.status(500).json({
      error: 'Failed to fetch security alerts',
      code: 'SECURITY_ALERTS_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /profile/security-alerts/:id
// =============================================================================

/**
 * PATCH /profile/security-alerts/:id
 * ----------------------------------
 * Mark a security alert as read or dismissed.
 * Also syncs with related notification (if any).
 *
 * REQUEST BODY:
 * {
 *   "status": "read" | "dismissed"
 * }
 *
 * RESPONSE:
 * {
 *   "alert": { ... updated alert ... }
 * }
 */
router.patch('/security-alerts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['read', 'dismissed'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be "read" or "dismissed".',
        code: 'INVALID_STATUS'
      });
    }

    // Build update
    const update = {
      status,
      ...(status === 'read' ? { readAt: new Date() } : {}),
      ...(status === 'dismissed' ? { dismissedAt: new Date() } : {})
    };

    // Update alert (verify ownership)
    const alert = await SecurityAlert.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      update,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        error: 'Security alert not found',
        code: 'NOT_FOUND'
      });
    }

    // =========================================================================
    // SYNC WITH NOTIFICATION (if related notification exists)
    // =========================================================================

    // Security alerts create notifications with type 'security_alert'
    // When alert is marked as read/dismissed, also mark the notification
    try {
      await Notification.updateOne(
        {
          userId: req.user._id,
          type: 'security_alert',
          'metadata.alertId': id.toString()
        },
        {
          $set: {
            isRead: true,  // Note: Notification model uses 'isRead', not 'read'
            readAt: new Date()
          }
        }
      );
    } catch (syncError) {
      // Non-blocking: log but don't fail the request
      console.error('[Profile] Failed to sync notification:', syncError.message);
    }

    attachEntityId(req, 'alertId', id);
    req.eventName = `security_alert.${status}.success`;

    res.json({
      alert: alert.toSafeJSON ? alert.toSafeJSON() : {
        id: alert._id,
        type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        status: alert.status,
        createdAt: alert.createdAt
      }
    });

  } catch (error) {
    attachError(req, error, { operation: 'security_alert_update' });
    res.status(500).json({
      error: 'Failed to update security alert',
      code: 'SECURITY_ALERT_UPDATE_ERROR'
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
 * import profileRoutes from './routes/profile.js';
 * app.use('/profile', profileRoutes);
 *
 * This makes all routes available at:
 * - GET /profile
 * - PATCH /profile
 * - PATCH /profile/preferences
 * - POST /profile/change-password
 * - POST /profile/change-email
 * - DELETE /profile
 * - POST /profile/avatar
 * - DELETE /profile/avatar
 * - PATCH /profile/dashboard-preferences
 * - GET /profile/activity
 * - GET /profile/activity/stats
 * - GET /profile/activity/logins
 * - GET /profile/activity/export
 * - GET /profile/security-alerts
 * - PATCH /profile/security-alerts/:id
 */
export default router;
