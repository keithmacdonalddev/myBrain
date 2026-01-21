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
 * Image service for uploading and managing images.
 */
import * as imageService from '../services/imageService.js';

// =============================================================================
// HELPER FUNCTION: FORMAT ACTIVITY DESCRIPTION
// =============================================================================

/**
 * formatActivityDescription(log)
 * ------------------------------
 * Converts a raw API log entry into a human-readable activity description.
 *
 * WHY THIS EXISTS:
 * ----------------
 * API logs contain technical details like "POST /notes" or "PATCH /profile".
 * Users don't understand these. This function converts them to friendly
 * descriptions like "Created a note" or "Updated profile".
 *
 * @param {Object} log - Log entry from database
 *   - log.method: HTTP method (GET, POST, PATCH, DELETE)
 *   - log.route: API route path (e.g., "/notes/123")
 *   - log.statusCode: HTTP status code (200, 404, 500)
 *   - log.eventName: Custom event name if set
 *
 * @returns {Object|null} Human-readable description
 *   - action: What happened (e.g., "Created a note")
 *   - category: Type of action (content, account, security, settings)
 *   - Returns null for actions we don't want to show users
 *
 * EXAMPLE:
 * Input: { method: 'POST', route: '/notes', statusCode: 201 }
 * Output: { action: 'Created a note', category: 'content' }
 *
 * CATEGORIES:
 * - content: Notes, tasks, projects, images
 * - account: Profile updates, settings
 * - security: Password changes, email changes
 * - settings: App preferences
 */
function formatActivityDescription(log) {
  const { method, route, statusCode, eventName } = log;

  // =========================================================================
  // EXTRACT RESOURCE TYPE FROM ROUTE
  // =========================================================================

  // Split route into parts: "/notes/123" → ["notes", "123"]
  const routeParts = route.split('/').filter(Boolean);
  const resource = routeParts[0] || 'app';

  // =========================================================================
  // HANDLE SPECIFIC EVENT NAMES
  // =========================================================================

  // Some actions have custom event names set by the code
  if (eventName === 'auth_login') {
    return { action: 'Signed in', category: 'account' };
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
      if (method === 'POST') return { action: 'Created a note', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a note', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a note', category: 'content' };
      if (method === 'GET') return { action: 'Viewed notes', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // TASKS
    // -----------------------------------------------------------------------
    case 'tasks':
      if (method === 'POST') return { action: 'Created a task', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a task', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a task', category: 'content' };
      if (method === 'GET') return { action: 'Viewed tasks', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // PROJECTS
    // -----------------------------------------------------------------------
    case 'projects':
      if (method === 'POST') return { action: 'Created a project', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a project', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a project', category: 'content' };
      if (method === 'GET') return { action: 'Viewed projects', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // EVENTS (CALENDAR)
    // -----------------------------------------------------------------------
    case 'events':
      if (method === 'POST') return { action: 'Created an event', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated an event', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted an event', category: 'content' };
      if (method === 'GET') return { action: 'Viewed calendar', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // IMAGES
    // -----------------------------------------------------------------------
    case 'images':
      if (method === 'POST') return { action: 'Uploaded an image', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted an image', category: 'content' };
      if (method === 'GET') return { action: 'Viewed images', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // PROFILE
    // -----------------------------------------------------------------------
    case 'profile':
      if (method === 'PATCH') return { action: 'Updated profile', category: 'account' };
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
      if (method === 'POST') return { action: 'Created a tag', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a tag', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // FILTERS
    // -----------------------------------------------------------------------
    case 'filters':
      if (method === 'POST') return { action: 'Created a filter', category: 'content' };
      if (method === 'PATCH') return { action: 'Updated a filter', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a filter', category: 'content' };
      break;

    // -----------------------------------------------------------------------
    // WEATHER
    // -----------------------------------------------------------------------
    case 'weather':
      if (route.includes('locations')) {
        if (method === 'POST') return { action: 'Added a weather location', category: 'settings' };
        if (method === 'DELETE') return { action: 'Removed a weather location', category: 'settings' };
      }
      break;
  }

  // =========================================================================
  // FALLBACK
  // =========================================================================

  // If we don't recognize the action, return null
  // The caller will skip these entries
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

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'profile.password_change.success';

    res.json({
      message: 'Password changed successfully'
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
// ROUTE: GET /profile/activity
// =============================================================================

/**
 * GET /profile/activity
 * ---------------------
 * Returns the user's recent activity in human-readable format.
 *
 * QUERY PARAMETERS:
 * - limit: Max activities to return (default 50)
 * - days: How many days back to look (default 30)
 *
 * USE CASES:
 * - Security: "Did I log in from somewhere unexpected?"
 * - Tracking: "What have I been working on?"
 * - Debugging: "Why did that note disappear?"
 *
 * RESPONSE FORMAT:
 * {
 *   "activities": [
 *     {
 *       "id": "...",
 *       "action": "Created a note",
 *       "category": "content",
 *       "timestamp": "2024-01-15T10:30:00Z",
 *       "success": true,
 *       "ip": "192.168.1.1"
 *     }
 *   ],
 *   "timeline": [
 *     {
 *       "date": "2024-01-15",
 *       "activities": [ ... activities for this date ... ]
 *     }
 *   ],
 *   "total": 45,
 *   "period": "30 days"
 * }
 *
 * FILTERING:
 * - Only shows meaningful actions (excludes pure reads)
 * - Only shows actions we can describe in human terms
 */
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const { limit = 50, days = 30 } = req.query;

    // =========================================================================
    // CALCULATE DATE RANGE
    // =========================================================================

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    // =========================================================================
    // FETCH LOGS
    // =========================================================================

    // Query logs for the current user
    const logs = await Log.find({
      userId: req.user._id,
      timestamp: { $gte: since },
      // Only include meaningful actions (not pure reads)
      // Users want to see what they DID, not what they viewed
      $or: [
        { method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] } },
        { eventName: 'auth_login' },
        { eventName: 'auth_logout' },
        { eventName: { $regex: /logout/i } }
      ]
    })
      .sort({ timestamp: -1 })  // Most recent first
      .limit(parseInt(limit))
      .select('timestamp method route statusCode eventName clientInfo.ip');

    // =========================================================================
    // CONVERT TO HUMAN-READABLE FORMAT
    // =========================================================================

    const activities = [];

    for (const log of logs) {
      // Try to convert to human-readable description
      const formatted = formatActivityDescription(log);

      // Skip if we couldn't format it (unrecognized action)
      if (formatted) {
        activities.push({
          id: log._id,
          action: formatted.action,
          category: formatted.category,
          timestamp: log.timestamp,
          success: log.statusCode < 400,  // < 400 means success
          ip: log.clientInfo?.ip || null
        });
      }
    }

    // =========================================================================
    // GROUP BY DATE FOR TIMELINE VIEW
    // =========================================================================

    // Create groups: { "2024-01-15": [...], "2024-01-14": [...] }
    const grouped = {};

    for (const activity of activities) {
      // Get just the date part (YYYY-MM-DD)
      const dateKey = activity.timestamp.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    }

    // Convert to array format
    const timeline = Object.entries(grouped).map(([date, items]) => ({
      date,
      activities: items
    }));

    res.json({
      activities,
      timeline,
      total: activities.length,
      period: `${days} days`
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
 * - GET /profile/activity
 */
export default router;
