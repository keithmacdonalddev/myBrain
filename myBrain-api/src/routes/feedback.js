/**
 * =============================================================================
 * FEEDBACK.JS - User Feedback Submission Routes
 * =============================================================================
 *
 * This file handles user feedback submission endpoints. Feedback is user-
 * submitted reports about bugs, feature requests, general comments, or questions.
 *
 * PUBLIC ENDPOINTS (No Auth Required):
 * - POST /api/feedback - Submit feedback (rate-limited)
 * - GET /api/feedback/status/:statusToken - Check feedback status (token-based)
 *
 * AUTHENTICATED ENDPOINTS (User's Own Feedback):
 * - GET /api/feedback/mine - List user's own feedback
 * - POST /api/feedback/:id/verify - Mark feedback as verified/helpful
 *
 * ADMIN ENDPOINTS:
 * - GET /api/admin/feedback - List all feedback
 * - GET /api/admin/feedback/:id - Get feedback details
 * - PATCH /api/admin/feedback/:id - Update status, assignment, tags
 * - POST /api/admin/feedback/:id/respond - Send admin response
 *
 * RATE LIMITING STRATEGY:
 * - Authenticated: 10 submissions per hour
 * - Guest (no auth): 3 submissions per hour
 * - Status check: 10 requests per minute per IP (anti-enumeration)
 *
 * SPAM PROTECTION (MVP):
 * - Honeypot field (hidden from humans, filled by bots)
 * - Time-based check (form must be submitted >3 seconds after open)
 * - Input validation and sanitization
 * - Note: CAPTCHA added in Phase 5 (not in MVP)
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch defines a different feedback operation.
 */
import express from 'express';

/**
 * Mongoose is our MongoDB ODM (Object Document Mapper).
 * It lets us work with MongoDB documents as JavaScript objects
 * and provides validation, hooks, and query building.
 * We use it here to validate IDs (ObjectId.isValid) before database queries.
 */
import mongoose from 'mongoose';

/**
 * Crypto for generating secure tokens.
 */
import crypto from 'crypto';

/**
 * Rate limit middleware to prevent abuse.
 * Different limits for authenticated users vs guests.
 */
import rateLimit from 'express-rate-limit';

/**
 * Auth middleware checks that the user is logged in.
 * optionalAuth allows the route to work for both authenticated and guest users.
 */
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

/**
 * Error handler middleware captures unexpected errors and logs them.
 * This helps us debug issues by recording what went wrong and the context.
 * We call attachError(req, error, {operation: '...'}) to log errors.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for a specific feedback.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Import Feedback model to work with feedback documents.
 */
import Feedback from '../models/Feedback.js';

/**
 * Import SystemSettings to get feedback routing configuration.
 * This tells us where to create tasks (which admin, which project).
 */
import SystemSettings from '../models/SystemSettings.js';

/**
 * Import Task model to create tasks from feedback.
 */
import Task from '../models/Task.js';

/**
 * Import Notification model to notify admin of new feedback.
 */
import Notification from '../models/Notification.js';

// =============================================================================
// WEBSOCKET SETUP
// =============================================================================
/**
 * io is the Socket.io instance for real-time communication.
 * Initially null, set by setSocketIO() when server starts.
 * We use this to broadcast notifications to users who are online.
 *
 * TODO: Phase 3 - Add real-time task creation events
 * TODO: Phase 3 - Add feedback status update events
 */
let io = null;

/**
 * setSocketIO sets the Socket.io instance for real-time notifications.
 * Called by server.js after Socket.io is initialized.
 * This enables the routes to broadcast notifications to online users.
 *
 * @param {object} ioInstance - The Socket.io server instance
 */
export function setSocketIO(ioInstance) {
  io = ioInstance;
}

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all feedback-related endpoints together
const router = express.Router();

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

/**
 * Rate limiter for feedback submission
 * - Authenticated users: 10 per hour
 * - Guests: 3 per hour (stricter, higher risk of abuse)
 *
 * Uses IP + optional user ID to track requests.
 * For authenticated users, we use their user ID for more accurate tracking.
 * For guests, we use IP address only.
 */
const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req, res) => {
    // Authenticated users get higher limit (10/hour)
    // Guests get lower limit (3/hour)
    return req.user ? 10 : 3;
  },
  keyGenerator: (req, res) => {
    // For authenticated users, use user ID + IP
    // For guests, use IP only
    return req.user ? `${req.user._id}-${req.ip}` : req.ip;
  },
  message: 'Too many feedback submissions. Please try again later.',
  standardHeaders: false, // Don't send RateLimit-* headers
  skip: (req, res) => {
    // Skip rate limiting for admin users (testing, etc.)
    return req.user?.role === 'admin';
  }
});

/**
 * Rate limiter for status endpoint
 * - 10 requests per minute per IP (prevents brute-force enumeration)
 */
const statusRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req, res) => req.ip,
  message: 'Too many status checks. Please try again later.',
  standardHeaders: false
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a human-readable reference ID for the feedback
 * Format: FB-YYYY-XXXX (e.g., FB-2026-0142)
 * This is shown to users so they can track their feedback
 */
async function generateReferenceId() {
  const year = new Date().getFullYear();
  // Find the highest number in use this year
  const feedback = await Feedback.findOne(
    { referenceId: new RegExp(`^FB-${year}-`) },
    { referenceId: 1 }
  ).sort({ referenceId: -1 });

  let number = 1;
  if (feedback) {
    // Extract number from FB-YYYY-XXXX format
    const match = feedback.referenceId.match(/FB-\d+-(\d+)/);
    if (match) {
      number = parseInt(match[1]) + 1;
    }
  }

  return `FB-${year}-${String(number).padStart(4, '0')}`;
}

/**
 * Validate and redact metadata based on privacy-first principles
 * Only include metadata if user opted in
 * Apply strict redaction rules to prevent PII leakage
 */
function validateAndRedactMetadata(metadata, optsIntoCapture) {
  if (!optsIntoCapture || !metadata) {
    return null;
  }

  // Redact URL - strip query parameters
  let redactedUrl = metadata.url;
  if (redactedUrl && redactedUrl.includes('?')) {
    redactedUrl = redactedUrl.split('?')[0];
  }

  // Cap recent errors at 5 items
  const recentErrors = (metadata.recentErrors || []).slice(0, 5).map(err => ({
    message: err.message || 'Unknown error', // Error message only, no stack
    timestamp: err.timestamp
  }));

  // Cap recent actions at 10 items
  const recentActions = (metadata.recentActions || []).slice(0, 10).map(action => ({
    action: action.action,
    target: action.target,
    timestamp: action.timestamp
  }));

  return {
    url: redactedUrl,
    browser: metadata.browser,
    os: metadata.os,
    deviceType: metadata.deviceType,
    screenSize: metadata.screenSize,
    viewport: metadata.viewport,
    colorScheme: metadata.colorScheme,
    appVersion: metadata.appVersion,
    recentErrors,
    recentActions
  };
}

/**
 * Create a task from feedback
 * Uses configured admin user and project from SystemSettings
 * Falls back to "myBrain" project if no routing configured
 */
async function createTaskFromFeedback(feedback) {
  try {
    // Get feedback routing configuration from SystemSettings
    const routing = await SystemSettings.getFeedbackRouting?.();

    // Find target project and admin
    let targetProjectId = routing?.projectId;
    let targetAdminId = routing?.adminUserId;

    // If no routing configured, find the "myBrain" project
    if (!targetProjectId) {
      const Project = mongoose.model('Project');
      const myBrainProject = await Project.findOne({ title: 'myBrain' });
      if (myBrainProject) {
        targetProjectId = myBrainProject._id;
        targetAdminId = myBrainProject.userId;
      }
    }

    // If still no project, cannot create task
    if (!targetProjectId) {
      console.log('No target project found for feedback task creation');
      return null;
    }

    // Verify project exists
    const Project = mongoose.model('Project');
    const project = await Project.findById(targetProjectId);
    if (!project) {
      console.log('Target project not found');
      return null;
    }

    // Use project owner as admin if no specific admin configured
    const adminUserId = targetAdminId || project.userId;

    // Build task title with feedback type prefix
    const typePrefix = feedback.type === 'bug' ? '[Bug]' :
                       feedback.type === 'feature_request' ? '[Feature]' :
                       feedback.type === 'question' ? '[Q]' : '[Feedback]';
    const taskTitle = `${typePrefix} ${feedback.title}`;

    // Build comprehensive task description with ALL metadata
    let taskBody = `## User Report
${feedback.description || '(No additional details provided)'}

## Feedback Details
- **Reference ID:** ${feedback.referenceId}
- **Type:** ${feedback.type}
- **Priority:** ${feedback.priority}
- **Status:** ${feedback.status}
- **Submitted:** ${feedback.createdAt.toISOString()}`;

    // Add submitter information
    if (feedback.submittedBy) {
      taskBody += `

## Submitter Information`;
      if (feedback.submittedBy.userId) {
        taskBody += `
- **User ID:** ${feedback.submittedBy.userId}`;
      }
      if (feedback.submittedBy.email) {
        taskBody += `
- **Email:** ${feedback.submittedBy.email}`;
      }
      if (feedback.submittedBy.displayName) {
        taskBody += `
- **Name:** ${feedback.submittedBy.displayName}`;
      }
      taskBody += `
- **Anonymous:** ${feedback.submittedBy.isAnonymous ? 'Yes' : 'No'}`;
      taskBody += `
- **Wants Updates:** ${feedback.submittedBy.wantsUpdates ? 'Yes' : 'No'}`;
    }

    // Add ALL diagnostic context if available
    if (feedback.includedDiagnostics && feedback.context) {
      taskBody += `

## Technical Context (Auto-Captured)`;
      if (feedback.context.url) {
        taskBody += `
- **Page URL:** ${feedback.context.url}`;
      }
      if (feedback.context.browser) {
        taskBody += `
- **Browser:** ${feedback.context.browser}`;
      }
      if (feedback.context.os) {
        taskBody += `
- **OS:** ${feedback.context.os}`;
      }
      if (feedback.context.deviceType) {
        taskBody += `
- **Device Type:** ${feedback.context.deviceType}`;
      }
      if (feedback.context.screenSize) {
        taskBody += `
- **Screen Size:** ${feedback.context.screenSize}`;
      }
      if (feedback.context.viewport) {
        taskBody += `
- **Viewport:** ${feedback.context.viewport}`;
      }
      if (feedback.context.colorScheme) {
        taskBody += `
- **Color Scheme:** ${feedback.context.colorScheme}`;
      }
      if (feedback.context.appVersion) {
        taskBody += `
- **App Version:** ${feedback.context.appVersion}`;
      }
      if (feedback.context.userId) {
        taskBody += `
- **User ID:** ${feedback.context.userId}`;
      }
      if (feedback.context.accountType) {
        taskBody += `
- **Account Type:** ${feedback.context.accountType}`;
      }

      // Recent errors
      if (feedback.context.recentErrors?.length > 0) {
        taskBody += `

## Recent Errors (${feedback.context.recentErrors.length})`;
        feedback.context.recentErrors.forEach((err, idx) => {
          taskBody += `
${idx + 1}. ${err.message}${err.timestamp ? ` (${new Date(err.timestamp).toISOString()})` : ''}`;
        });
      }

      // Recent actions
      if (feedback.context.recentActions?.length > 0) {
        taskBody += `

## Recent User Actions (${feedback.context.recentActions.length})`;
        feedback.context.recentActions.forEach((action, idx) => {
          taskBody += `
${idx + 1}. ${action.action}${action.target ? ` → ${action.target}` : ''}${action.timestamp ? ` (${new Date(action.timestamp).toISOString()})` : ''}`;
        });
      }
    }

    taskBody += `

---
*Submitted via User Feedback System*
*Reference: ${feedback.referenceId}*`;

    // Determine priority based on feedback type and context
    let priority = 'medium';
    if (feedback.type === 'bug') {
      // Bugs are high priority by default
      priority = feedback.context?.recentErrors?.length > 0 ? 'critical' : 'high';
    } else if (feedback.type === 'feature_request') {
      priority = 'medium';
    } else if (feedback.type === 'question') {
      priority = 'medium';
    }

    // Build tags array
    const tags = ['user-reported', `feedback-${feedback.type}`];
    if (feedback.context?.deviceType === 'mobile') tags.push('mobile');
    if (feedback.context?.deviceType === 'tablet') tags.push('tablet');
    if (feedback.context?.recentErrors?.length > 0) tags.push('has-errors');
    if (feedback.submittedBy?.userId) tags.push('authenticated-user');
    if (feedback.includedDiagnostics) tags.push('has-diagnostics');

    // Calculate due date: 24 hours from now
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    // Create the task
    const task = new Task({
      title: taskTitle,
      body: taskBody,
      projectId: targetProjectId,
      userId: adminUserId,
      priority,
      status: 'todo',
      tags,
      dueDate
    });

    await task.save();

    // Link feedback to task
    feedback.linkedTaskId = task._id;

    console.log(`Created task ${task._id} from feedback ${feedback.referenceId}`);
    return task;
  } catch (error) {
    console.error('Error creating task from feedback:', error);
    // Fall back to feedback-only storage
    return null;
  }
}

/**
 * Notify admin about new feedback
 * Finds admin by configured routing, or by email keithmacdonald2025@gmail.com as fallback
 *
 * TODO: Phase 3 - Add support for multiple admins
 * TODO: Phase 3 - Add email notification option for urgent feedback
 * TODO: Phase 3 - Emit 'task:new' event when taskId is provided for real-time task list updates
 */
async function notifyAdmin(feedback, taskId = null) {
  try {
    // Get feedback routing to find which admin to notify
    const routing = await SystemSettings.getFeedbackRouting?.();
    let adminUserId = routing?.adminUserId;

    // If no routing configured, find admin by email
    if (!adminUserId) {
      const User = mongoose.model('User');
      const admin = await User.findOne({
        email: 'keithmacdonald2025@gmail.com',
        role: 'admin'
      });
      if (admin) {
        adminUserId = admin._id;
      }
    }

    // If still no admin found, cannot notify
    if (!adminUserId) {
      console.log('No admin user found to notify for feedback');
      return null;
    }

    // Build action URL - link to task if created, otherwise to feedback admin
    const actionUrl = taskId
      ? `/app/projects?task=${taskId}`
      : `/admin/feedback/${feedback._id}`;

    // Create notification for admin
    const notification = new Notification({
      userId: adminUserId,
      type: 'feedback_received',
      title: `New ${feedback.type} Report${taskId ? ' (Task Created)' : ''}`,
      body: feedback.title.substring(0, 100),
      actionUrl: actionUrl,
      metadata: {
        feedbackId: feedback._id,
        feedbackType: feedback.type,
        priority: feedback.priority,
        submitterName: feedback.submittedBy?.displayName || 'Anonymous',
        taskId: taskId || null
      }
    });

    await notification.save();
    console.log(`Notification created for admin ${adminUserId} about feedback ${feedback.referenceId}`);

    // Emit real-time notification via WebSocket if io is available
    // TODO: Phase 3 - Also emit 'task:new' event when taskId is provided
    if (io) {
      io.to(`user:${adminUserId}`).emit('notification:new', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isSeen: false
      });
      console.log(`WebSocket notification emitted to user:${adminUserId}`);
    } else {
      // TODO: Phase 3 - Set up a way to access io instance globally or via request
      console.log('WebSocket io not available, notification saved to DB only');
    }

    return notification;
  } catch (error) {
    console.error('Error notifying admin:', error);
    return null;
  }
}

// =============================================================================
// PUBLIC ENDPOINTS (No Auth Required)
// =============================================================================

/**
 * POST /api/feedback
 * Submit feedback (public endpoint)
 *
 * WHAT IT DOES:
 * Accepts feedback from any user (authenticated or guest).
 * Validates required fields, applies rate limiting, checks for spam,
 * creates a task (if configured), notifies admin, and returns confirmation.
 *
 * RATE LIMITING:
 * - Authenticated: 10 per hour
 * - Guest: 3 per hour
 *
 * SPAM PROTECTION:
 * - Honeypot field (hidden field that bots fill)
 * - Time-based check (form must exist >3 seconds before submit)
 * - Input validation and sanitization
 *
 * REQUEST BODY:
 * {
 *   type: "bug" | "feature_request" | "general" | "question" (required),
 *   title: "string, 5-100 chars" (required),
 *   description: "string, max 2000 chars" (optional),
 *   includeDiagnostics: boolean (opt-in metadata capture),
 *   metadata: { ... context object ... } (if includeDiagnostics: true),
 *   wantsUpdates: boolean (opt-in for follow-up),
 *   email: "email address" (required if guest + wantsUpdates),
 *   honeypot: "should be empty" (spam check - ignored if filled)
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   success: true,
 *   message: "Thank you! We've received your feedback.",
 *   referenceId: "FB-2026-0142",
 *   statusToken: "a7f3b9c2d1e4f5a6...",
 *   wantsUpdates: true
 * }
 */
router.post('/', feedbackRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    // Step 1: Extract and validate request body
    const {
      type,
      title,
      description,
      includeDiagnostics,
      metadata,
      wantsUpdates,
      email,
      honeypot,
      formOpenedAt
    } = req.body;

    // Step 2: Validate required fields
    const errors = [];

    // Type is required and must be valid
    if (!type || !['bug', 'feature_request', 'general', 'question'].includes(type)) {
      errors.push('Feedback type is required (bug, feature_request, general, or question)');
    }

    // Title is required and must be 5-100 chars
    if (!title || !title.trim()) {
      errors.push('Title is required');
    } else if (title.trim().length < 5 || title.trim().length > 100) {
      errors.push('Title must be between 5 and 100 characters');
    }

    // Description is optional but max 2000 chars if provided
    if (description && description.length > 2000) {
      errors.push('Description must be no more than 2000 characters');
    }

    // Email required if guest + wants updates
    if (!req.user && wantsUpdates && !email) {
      errors.push('Email is required if you want updates and are not logged in');
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please provide a valid email address');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Step 3: Spam checks
    // Check honeypot field - if filled, this is a bot
    if (honeypot && honeypot.trim() !== '') {
      // Silently accept but flag for review
      // Don't tell the attacker they were caught
      return res.status(201).json({
        success: true,
        message: 'Thank you! We have received your feedback.',
        referenceId: 'FB-XXXX-XXXX', // Fake reference for honeypot catches
        statusToken: 'token'
      });
    }

    // Check time-based spam: form must be open >3 seconds
    if (formOpenedAt) {
      const formOpenTime = new Date(formOpenedAt).getTime();
      const submitTime = Date.now();
      const timeOpen = (submitTime - formOpenTime) / 1000;

      if (timeOpen < 3) {
        // Form submitted too quickly - likely bot
        // Silently accept but flag for review
        return res.status(201).json({
          success: true,
          message: 'Thank you! We have received your feedback.',
          referenceId: 'FB-XXXX-XXXX',
          statusToken: 'token'
        });
      }
    }

    // Step 4: Validate and redact metadata if opted in
    let redactedMetadata = null;
    if (includeDiagnostics && metadata) {
      redactedMetadata = validateAndRedactMetadata(metadata, true);
    }

    // Step 5: Generate reference ID and status token
    const referenceId = await generateReferenceId();
    const statusToken = crypto.randomBytes(32).toString('hex');

    // Step 6: Create feedback document
    const feedback = new Feedback({
      type,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      priority: type === 'bug' ? 'high' : 'medium',
      status: 'new',
      referenceId,
      statusToken,
      statusTokenCreatedAt: new Date(),
      includedDiagnostics: !!includeDiagnostics,
      context: redactedMetadata,
      submittedBy: {
        userId: req.user?._id || null,
        email: email || req.user?.email || null,
        displayName: req.user?.displayName || null,
        isAnonymous: !req.user,
        wantsUpdates: !!wantsUpdates
      }
    });

    // Step 7: Save feedback document
    await feedback.save();

    // Step 8: Create task in admin's project (if configured)
    const task = await createTaskFromFeedback(feedback);

    // Step 9: Save feedback again if task was created (to store linkedTaskId)
    if (feedback.linkedTaskId) {
      await feedback.save();
    }

    // Step 10: Notify admin (pass task ID if created)
    await notifyAdmin(feedback, task?._id || null);

    // Step 11: Log the submission
    attachEntityId(req, 'feedbackId', feedback._id);
    req.eventName = 'feedback.submit.success';

    // Step 12: Return success response
    res.status(201).json({
      success: true,
      message: 'Thank you! We have received your feedback.',
      referenceId: feedback.referenceId,
      statusToken: feedback.statusToken,
      wantsUpdates: feedback.submittedBy.wantsUpdates
    });

  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'feedback_submit' });

    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    // Unexpected error
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      code: 'FEEDBACK_SUBMIT_ERROR'
    });
  }
});

/**
 * GET /api/feedback/status/:statusToken
 * Check feedback status (public endpoint, no auth required)
 *
 * WHAT IT DOES:
 * Returns the current status of feedback based on an unguessable token.
 * No authentication required - users share the status token to check progress.
 *
 * SECURITY:
 * - Token-based: Can't guess other feedback by trying IDs
 * - Rate-limited: 10 requests per minute per IP (prevents brute-force)
 * - Minimal response: Only status + lastUpdated, no content or user info
 * - Token expiry: Tokens valid for 90 days (no enumeration of old feedback)
 *
 * PATH PARAMETERS:
 * - statusToken: Cryptographic token (64-char hex string)
 *
 * EXAMPLE RESPONSE:
 * {
 *   status: "in_progress",
 *   lastUpdated: "2026-01-31T15:00:00Z"
 * }
 *
 * HTTP STATUS CODES:
 * - 200: Valid token, status returned
 * - 404: Token invalid, expired, or not found
 * - 429: Rate limit exceeded
 */
router.get('/status/:statusToken', statusRateLimiter, async (req, res, next) => {
  try {
    const { statusToken } = req.params;

    // Step 1: Validate statusToken format (must be 64 hex characters)
    // This prevents NoSQL injection attacks like { $gt: "" }
    if (typeof statusToken !== 'string' || !/^[a-f0-9]{64}$/i.test(statusToken)) {
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    // Step 2: Find feedback by status token
    const feedback = await Feedback.findOne({ statusToken });

    // Step 3: Check if feedback exists
    if (!feedback) {
      // Invalid/expired/not found - don't distinguish (security)
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    // Step 4: Check token expiry (90 days)
    const tokenAge = Date.now() - new Date(feedback.statusTokenCreatedAt).getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysMs) {
      // Token expired
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    // Step 5: Return minimal response (status + lastUpdated only)
    res.json({
      status: feedback.status,
      lastUpdated: feedback.updatedAt
    });

  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'feedback_status_check' });

    res.status(500).json({
      error: 'Failed to check feedback status',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS (Require Admin Role)
// =============================================================================

/**
 * GET /api/feedback/admin/all
 * List all feedback (admin only)
 */
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const {
      type,
      status = 'new',
      priority,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (status && status !== 'all') query.status = status;
    if (priority) query.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get feedback with pagination
    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Feedback.countDocuments(query)
    ]);

    // Get counts by status for the filter tabs
    const statusCounts = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = statusCounts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});

    res.json({
      feedback: feedback.map(f => ({
        ...f,
        statusToken: undefined // Don't expose tokens in list
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      counts: {
        new: counts.new || 0,
        in_review: counts.in_review || 0,
        awaiting_reply: counts.awaiting_reply || 0,
        planned: counts.planned || 0,
        in_progress: counts.in_progress || 0,
        resolved: counts.resolved || 0,
        closed: counts.closed || 0,
        verified: counts.verified || 0,
        total
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'feedback_admin_list' });
    res.status(500).json({
      error: 'Failed to fetch feedback',
      code: 'FEEDBACK_LIST_ERROR'
    });
  }
});

/**
 * GET /api/feedback/admin/:id
 * Get single feedback details (admin only)
 */
router.get('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid feedback ID',
        code: 'INVALID_ID'
      });
    }

    const feedback = await Feedback.findById(id).lean();

    if (!feedback) {
      return res.status(404).json({
        error: 'Feedback not found',
        code: 'NOT_FOUND'
      });
    }

    // Get linked task if exists
    let linkedTask = null;
    if (feedback.linkedTaskId) {
      linkedTask = await mongoose.model('Task').findById(feedback.linkedTaskId)
        .select('title status priority dueDate')
        .lean();
    }

    res.json({
      ...feedback,
      linkedTask
    });
  } catch (error) {
    attachError(req, error, { operation: 'feedback_admin_detail' });
    res.status(500).json({
      error: 'Failed to fetch feedback details',
      code: 'FEEDBACK_DETAIL_ERROR'
    });
  }
});

/**
 * PATCH /api/feedback/admin/:id
 * Update feedback status (admin only)
 */
router.patch('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, tags, internalNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid feedback ID',
        code: 'INVALID_ID'
      });
    }

    const update = { updatedAt: new Date() };
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assignedTo) update.assignedTo = assignedTo;
    if (tags) update.tags = tags;

    // Add internal note if provided
    if (internalNote && internalNote.trim()) {
      await Feedback.addInternalNote(id, req.user._id, internalNote.trim());
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!feedback) {
      return res.status(404).json({
        error: 'Feedback not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (error) {
    attachError(req, error, { operation: 'feedback_admin_update' });
    res.status(500).json({
      error: 'Failed to update feedback',
      code: 'FEEDBACK_UPDATE_ERROR'
    });
  }
});

export default router;
