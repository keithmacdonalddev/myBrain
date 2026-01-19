import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import Log from '../models/Log.js';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import RoleConfig from '../models/RoleConfig.js';
import SidebarConfig from '../models/SidebarConfig.js';
import moderationService from '../services/moderationService.js';
import adminContentService from '../services/adminContentService.js';
import limitService from '../services/limitService.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import * as fileService from '../services/fileService.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/inbox
 * Get items that need admin attention (task-first view)
 */
router.get('/inbox', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // 1. Get flagged/warned users (needs review)
    const flaggedUsers = await User.find({
      $or: [
        { 'moderationStatus.warningCount': { $gt: 0 } },
        { status: 'suspended' },
        { 'moderationStatus.isSuspended': true }
      ]
    })
      .sort({ 'moderationStatus.lastWarningAt': -1, updatedAt: -1 })
      .limit(10);

    // 2. Get recent server errors (last hour)
    const recentErrors = await Log.find({
      statusCode: { $gte: 500 },
      timestamp: { $gte: oneHourAgo }
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // Calculate error rate
    const totalRequestsLastHour = await Log.countDocuments({
      timestamp: { $gte: oneHourAgo }
    });
    const errorCountLastHour = await Log.countDocuments({
      statusCode: { $gte: 500 },
      timestamp: { $gte: oneHourAgo }
    });
    const errorRate = totalRequestsLastHour > 0
      ? ((errorCountLastHour / totalRequestsLastHour) * 100).toFixed(2)
      : 0;

    // 3. Get new signups today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await User.find({
      createdAt: { $gte: todayStart }
    })
      .sort({ createdAt: -1 })
      .limit(20);

    // 4. Get platform stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const onlineRecently = await Log.distinct('userId', {
      timestamp: { $gte: new Date(now - 15 * 60 * 1000) },
      userId: { $ne: null }
    });

    // Build inbox items
    const urgent = [];
    const needsReview = [];
    const fyi = [];

    // Add error spike if significant
    if (parseFloat(errorRate) > 1) {
      urgent.push({
        id: 'error-spike',
        type: 'error_spike',
        title: 'Error rate spike detected',
        description: `Error rate is ${errorRate}% (${errorCountLastHour} errors in the last hour). Check logs for details.`,
        priority: 'urgent',
        timestamp: now,
        meta: {
          errorRate,
          errorCount: errorCountLastHour,
          totalRequests: totalRequestsLastHour
        },
        actions: ['view_logs']
      });
    }

    // Add suspended users (potential appeals)
    const suspendedUsers = flaggedUsers.filter(u =>
      u.status === 'suspended' || u.moderationStatus?.isSuspended
    );
    for (const user of suspendedUsers) {
      urgent.push({
        id: `suspended-${user._id}`,
        type: 'suspended_user',
        title: 'User suspended',
        description: user.moderationStatus?.suspendReason || 'No reason provided',
        priority: 'urgent',
        timestamp: user.moderationStatus?.suspendedAt || user.updatedAt,
        user: user.toSafeJSON(),
        actions: ['review', 'unsuspend']
      });
    }

    // Add warned users
    const warnedUsers = flaggedUsers.filter(u =>
      u.moderationStatus?.warningCount > 0 &&
      u.status !== 'suspended' &&
      !u.moderationStatus?.isSuspended
    );
    for (const user of warnedUsers) {
      needsReview.push({
        id: `warned-${user._id}`,
        type: 'warned_user',
        title: `User has ${user.moderationStatus.warningCount} warning(s)`,
        description: 'Review user activity and determine if further action is needed.',
        priority: 'warning',
        timestamp: user.moderationStatus?.lastWarningAt || user.updatedAt,
        user: user.toSafeJSON(),
        actions: ['investigate', 'dismiss', 'suspend']
      });
    }

    // Add recent errors as review items (if not already urgent)
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

    // Add new signups as FYI
    if (newUsersToday.length > 0) {
      fyi.push({
        id: 'new-signups',
        type: 'new_signups',
        title: `${newUsersToday.length} new user${newUsersToday.length === 1 ? '' : 's'} today`,
        description: newUsersToday.length > 5
          ? 'Higher than usual signup activity.'
          : 'Normal signup activity.',
        priority: 'info',
        timestamp: newUsersToday[0]?.createdAt || now,
        users: newUsersToday.slice(0, 5).map(u => u.toSafeJSON()),
        meta: {
          count: newUsersToday.length
        },
        actions: ['view_users']
      });
    }

    res.json({
      inbox: {
        urgent,
        needsReview,
        fyi
      },
      stats: {
        totalUsers,
        activeUsers,
        onlineNow: onlineRecently.length,
        errorRate: parseFloat(errorRate),
        newUsersToday: newUsersToday.length
      },
      generatedAt: now
    });
  } catch (error) {
    attachError(req, error, { operation: 'inbox_fetch' });
    res.status(500).json({
      error: 'Failed to fetch inbox',
      code: 'INBOX_FETCH_ERROR',
      requestId: req.requestId
    });
  }
});

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
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
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

    res.json({
      message: 'Warning issued successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_warn' });
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
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
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

    res.json({
      message: 'User suspended successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot suspend admin users') {
      return res.status(400).json({
        error: 'Cannot suspend admin users',
        code: 'CANNOT_SUSPEND_ADMIN',
        requestId: req.requestId
      });
    }
    if (error.message === 'Cannot suspend yourself') {
      return res.status(400).json({
        error: 'Cannot suspend yourself',
        code: 'CANNOT_SUSPEND_SELF',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_suspend' });
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
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!reason || reason.trim().length === 0) {
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

    res.json({
      message: 'User unsuspended successfully',
      user: result.user.toSafeJSON(),
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'user_unsuspend' });
    res.status(500).json({
      error: 'Failed to unsuspend user',
      code: 'UNSUSPEND_ERROR',
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
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID',
        requestId: req.requestId
      });
    }

    if (!content || content.trim().length === 0) {
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

    res.json({
      message: 'Admin note added successfully',
      action: result.action.toSafeJSON()
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'admin_note_add' });
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

    res.json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }
    attachError(req, error, { operation: 'moderation_history_fetch' });
    res.status(500).json({
      error: 'Failed to fetch moderation history',
      code: 'MODERATION_HISTORY_ERROR',
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

export default router;
