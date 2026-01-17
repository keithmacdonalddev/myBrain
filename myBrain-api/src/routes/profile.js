import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import * as imageService from '../services/imageService.js';

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
    console.error('Get profile error:', error);
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
      'bio', 'location', 'website', 'timezone', 'avatarUrl'
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
    console.error('Update profile error:', error);

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
    console.error('Change password error:', error);
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
    console.error('Change email error:', error);

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
    console.error('Delete account error:', error);
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
    console.error('Upload avatar error:', error);
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
    console.error('Delete avatar error:', error);
    res.status(500).json({
      error: 'Failed to delete avatar',
      code: 'AVATAR_DELETE_ERROR',
    });
  }
});

export default router;
