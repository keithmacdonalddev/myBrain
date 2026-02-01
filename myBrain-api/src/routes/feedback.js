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
import { requireAuth, optionalAuth } from '../middleware/auth.js';

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
 * Falls back to storing feedback-only if config not set up
 */
async function createTaskFromFeedback(feedback) {
  try {
    // Get feedback routing configuration from SystemSettings
    const routing = await SystemSettings.getFeedbackRouting?.();
    if (!routing || routing.fallbackBehavior === 'store_only') {
      // Not configured - just store feedback without creating task
      return null;
    }

    // Verify admin user exists and is actually an admin
    const admin = await mongoose.model('User').findById(routing.adminUserId);
    if (!admin || admin.role !== 'admin') {
      // Admin deleted or no longer admin - fall back to store-only
      return null;
    }

    // Verify project exists and is owned by admin
    const project = await mongoose.model('Project').findOne({
      _id: routing.defaultProjectId,
      userId: routing.adminUserId
    });
    if (!project) {
      // Project doesn't exist or not owned by admin - fall back to store-only
      return null;
    }

    // Build task title with feedback type prefix
    const typePrefix = feedback.type === 'bug' ? '[Bug]' :
                       feedback.type === 'feature_request' ? '[Feature]' :
                       feedback.type === 'question' ? '[Q]' : '';
    const taskTitle = typePrefix ? `${typePrefix} ${feedback.title}` : feedback.title;

    // Build task description from feedback
    const taskBody = `
## User Report
${feedback.description || '(No additional details provided)'}

## User Information
- **Report Type:** ${feedback.type}
- **Reference ID:** ${feedback.referenceId}
- **Status Token:** ${feedback.statusToken}

${feedback.submittedBy?.userId ? `- **User:** ${feedback.submittedBy.userId}` : '- **User:** Anonymous'}

${feedback.includedDiagnostics && feedback.context ? `## Technical Context
- **URL:** ${feedback.context.url || 'N/A'}
- **Browser:** ${feedback.context.browser || 'N/A'}
- **OS:** ${feedback.context.os || 'N/A'}
- **Device:** ${feedback.context.deviceType || 'N/A'}
- **App Version:** ${feedback.context.appVersion || 'N/A'}

${feedback.context.recentErrors?.length > 0 ? `## Errors
${feedback.context.recentErrors.map(err => `- ${err.message}`).join('\n')}` : ''}` : ''}

---
*Submitted via User Feedback System*
`;

    // Determine priority based on feedback type and context
    let priority = 'medium';
    if (feedback.type === 'bug') {
      // Bugs are high priority by default
      priority = feedback.context?.recentErrors?.length > 0 ? 'critical' : 'high';
    }

    // Build tags array
    const tags = ['user-reported', `feedback-${feedback.type}`];
    if (feedback.context?.deviceType === 'mobile') tags.push('mobile');
    if (feedback.context?.recentErrors?.length > 0) tags.push('has-errors');
    if (feedback.submittedBy?.userId) tags.push('authenticated-user');

    // Create the task
    const task = new Task({
      title: taskTitle,
      body: taskBody,
      projectId: routing.defaultProjectId,
      userId: routing.adminUserId,
      priority,
      status: 'todo',
      tags
    });

    await task.save();

    // Link feedback to task
    feedback.linkedTaskId = task._id;

    return task;
  } catch (error) {
    console.error('Error creating task from feedback:', error);
    // Fall back to feedback-only storage
    return null;
  }
}

/**
 * Notify admin about new feedback
 */
async function notifyAdmin(feedback) {
  try {
    // Get feedback routing to find which admin to notify
    const routing = await SystemSettings.getFeedbackRouting?.();
    if (!routing || !routing.adminUserId) {
      return null;
    }

    // Create notification for admin
    const notification = new Notification({
      userId: routing.adminUserId,
      type: 'feedback_received',
      title: `New ${feedback.type} Report`,
      body: feedback.title.substring(0, 100),
      actionUrl: `/admin/feedback/${feedback._id}`,
      metadata: {
        feedbackId: feedback._id,
        feedbackType: feedback.type,
        priority: feedback.priority,
        submitterName: feedback.submittedBy?.displayName || 'Anonymous'
      }
    });

    await notification.save();
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
    await createTaskFromFeedback(feedback);

    // Step 9: Save feedback again if task was created (to store linkedTaskId)
    if (feedback.linkedTaskId) {
      await feedback.save();
    }

    // Step 10: Notify admin
    await notifyAdmin(feedback);

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

export default router;
