import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import Log from '../models/Log.js';
import User from '../models/User.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/logs
 * Search and filter logs
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      requestId,
      userId,
      eventName,
      statusCode,
      minStatusCode,
      maxStatusCode,
      from,
      to,
      hasError,
      limit = 50,
      skip = 0,
      sort = '-timestamp'
    } = req.query;

    const options = {
      requestId,
      userId,
      eventName,
      statusCode,
      minStatusCode,
      maxStatusCode,
      from,
      to,
      hasError,
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0,
      sort
    };

    const { logs, total } = await Log.searchLogs(options);

    res.json({
      logs: logs.map(log => log.toSafeJSON()),
      total,
      limit: options.limit,
      skip: options.skip
    });
  } catch (error) {
    attachError(req, error, { operation: 'logs_fetch' });
    res.status(500).json({
      error: 'Failed to fetch logs',
      code: 'LOGS_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

/**
 * GET /admin/logs/:requestId
 * Get single log by requestId
 */
router.get('/logs/:requestId', async (req, res) => {
  try {
    const log = await Log.findOne({ requestId: req.params.requestId });

    if (!log) {
      return res.status(404).json({
        error: 'Log not found',
        code: 'LOG_NOT_FOUND',
        requestId: req.requestId
      });
    }

    res.json({ log: log.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'log_fetch', targetRequestId: req.params.requestId });
    res.status(500).json({
      error: 'Failed to fetch log',
      code: 'LOG_FETCH_ERROR',
      requestId: req.requestId
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

/**
 * GET /admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const { q, role, status, limit = 50, skip = 0 } = req.query;

    const query = {};

    if (q) {
      query.email = { $regex: q, $options: 'i' };
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip) || 0)
      .limit(Math.min(parseInt(limit) || 50, 100));

    const total = await User.countDocuments(query);

    res.json({
      users: users.map(u => u.toSafeJSON()),
      total,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });
  } catch (error) {
    attachError(req, error, { operation: 'users_fetch' });
    res.status(500).json({
      error: 'Failed to fetch users',
      code: 'USERS_FETCH_ERROR',
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
    if (role && ['user', 'admin'].includes(role)) {
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

export default router;
