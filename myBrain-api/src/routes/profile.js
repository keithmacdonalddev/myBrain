import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Log from '../models/Log.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import * as imageService from '../services/imageService.js';

/**
 * Convert a log entry to a human-readable activity description
 */
function formatActivityDescription(log) {
  const { method, route, statusCode, eventName } = log;

  // Parse route to extract resource type
  const routeParts = route.split('/').filter(Boolean);
  const resource = routeParts[0] || 'app';

  // Handle specific event names
  if (eventName === 'auth_login') {
    return { action: 'Signed in', category: 'account' };
  }
  if (eventName?.includes('logout')) {
    return { action: 'Signed out', category: 'account' };
  }

  // Handle by method and route
  const isError = statusCode >= 400;

  switch (resource) {
    case 'notes':
      if (method === 'POST') return { action: 'Created a note', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a note', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a note', category: 'content' };
      if (method === 'GET') return { action: 'Viewed notes', category: 'content' };
      break;
    case 'tasks':
      if (method === 'POST') return { action: 'Created a task', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a task', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a task', category: 'content' };
      if (method === 'GET') return { action: 'Viewed tasks', category: 'content' };
      break;
    case 'projects':
      if (method === 'POST') return { action: 'Created a project', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated a project', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a project', category: 'content' };
      if (method === 'GET') return { action: 'Viewed projects', category: 'content' };
      break;
    case 'events':
      if (method === 'POST') return { action: 'Created an event', category: 'content' };
      if (method === 'PATCH' || method === 'PUT') return { action: 'Updated an event', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted an event', category: 'content' };
      if (method === 'GET') return { action: 'Viewed calendar', category: 'content' };
      break;
    case 'images':
      if (method === 'POST') return { action: 'Uploaded an image', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted an image', category: 'content' };
      if (method === 'GET') return { action: 'Viewed images', category: 'content' };
      break;
    case 'profile':
      if (method === 'PATCH') return { action: 'Updated profile', category: 'account' };
      if (route.includes('avatar')) {
        if (method === 'POST') return { action: 'Updated profile picture', category: 'account' };
        if (method === 'DELETE') return { action: 'Removed profile picture', category: 'account' };
      }
      if (route.includes('change-password')) return { action: 'Changed password', category: 'security' };
      if (route.includes('change-email')) return { action: 'Changed email address', category: 'security' };
      break;
    case 'tags':
      if (method === 'POST') return { action: 'Created a tag', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a tag', category: 'content' };
      break;
    case 'filters':
      if (method === 'POST') return { action: 'Created a filter', category: 'content' };
      if (method === 'PATCH') return { action: 'Updated a filter', category: 'content' };
      if (method === 'DELETE') return { action: 'Deleted a filter', category: 'content' };
      break;
    case 'weather':
      if (route.includes('locations')) {
        if (method === 'POST') return { action: 'Added a weather location', category: 'settings' };
        if (method === 'DELETE') return { action: 'Removed a weather location', category: 'settings' };
      }
      break;
  }

  // Default fallback - don't show raw technical details
  return null;
}

const router = express.Router();

const BCRYPT_ROUNDS = 10;

/**
 * GET /profile
 * Get current user's profile
 */
router.get('/', requireAuth, async (req, res) => {
  try {
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

/**
 * PATCH /profile
 * Update current user's profile information
 */
router.patch('/', requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'displayName', 'phone',
      'bio', 'location', 'website', 'timezone', 'avatarUrl', 'defaultAvatarId'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[`profile.${field}`] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: user.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'profile_update' });

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

/**
 * POST /profile/change-password
 * Change user's password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+passwordHash');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    await user.save();

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

/**
 * POST /profile/change-email
 * Request email change (for now, changes immediately - in production you'd want verification)
 */
router.post('/change-email', requireAuth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    // Validate input
    if (!newEmail || !password) {
      return res.status(400).json({
        error: 'New email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    const normalizedEmail = newEmail.toLowerCase();

    // Check if new email is same as current
    if (normalizedEmail === req.user.email) {
      return res.status(400).json({
        error: 'New email is the same as your current email',
        code: 'SAME_EMAIL'
      });
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Get user with password and verify
    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Update email
    user.email = normalizedEmail;
    await user.save();

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

/**
 * DELETE /profile
 * Delete user's account
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required to delete account',
        code: 'MISSING_PASSWORD'
      });
    }

    // Get user with password and verify
    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Delete user
    await User.findByIdAndDelete(req.user._id);

    // Clear auth cookie
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

/**
 * POST /profile/avatar
 * Upload a profile avatar
 */
router.post('/avatar', requireAuth, uploadSingle, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    // Delete old avatar if exists
    if (req.user.profile?.avatarCloudinaryId) {
      await imageService.deleteImageByCloudinaryId(req.user.profile.avatarCloudinaryId);
    }

    // Upload new avatar
    const image = await imageService.uploadImage(req.file, req.user._id, {
      folder: 'avatars',
      alt: `${req.user.email}'s avatar`,
    });

    // Update user profile with avatar URL
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'profile.avatarUrl': image.secureUrl,
          'profile.avatarCloudinaryId': image.cloudinaryId,
        },
      },
      { new: true }
    );

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

/**
 * DELETE /profile/avatar
 * Delete profile avatar
 */
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    if (!req.user.profile?.avatarCloudinaryId) {
      return res.status(400).json({
        error: 'No avatar to delete',
        code: 'NO_AVATAR',
      });
    }

    // Delete from Cloudinary and database
    await imageService.deleteImageByCloudinaryId(req.user.profile.avatarCloudinaryId);

    // Clear avatar from user profile
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          'profile.avatarUrl': '',
          'profile.avatarCloudinaryId': '',
        },
      },
      { new: true }
    );

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

/**
 * GET /profile/activity
 * Get current user's activity log in human-readable format
 */
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const { limit = 50, days = 30 } = req.query;

    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    // Fetch logs for current user
    const logs = await Log.find({
      userId: req.user._id,
      timestamp: { $gte: since },
      // Only include meaningful actions (exclude pure reads for less noise)
      $or: [
        { method: { $in: ['POST', 'PATCH', 'PUT', 'DELETE'] } },
        { eventName: 'auth_login' },
        { eventName: { $regex: /logout/i } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('timestamp method route statusCode eventName clientInfo.ip');

    // Convert to human-readable format
    const activities = [];
    for (const log of logs) {
      const formatted = formatActivityDescription(log);
      if (formatted) {
        activities.push({
          id: log._id,
          action: formatted.action,
          category: formatted.category,
          timestamp: log.timestamp,
          success: log.statusCode < 400,
          ip: log.clientInfo?.ip || null
        });
      }
    }

    // Group by date for timeline view
    const grouped = {};
    for (const activity of activities) {
      const dateKey = activity.timestamp.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    }

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

export default router;
