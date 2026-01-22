/**
 * =============================================================================
 * REPORTS.JS - User Reports (Content Moderation) Routes
 * =============================================================================
 *
 * This file handles user reports in myBrain.
 * Users can report inappropriate content or behavior for admin review.
 *
 * WHAT CAN BE REPORTED?
 * ---------------------
 * Users can report:
 * - OTHER USERS: Suspicious, abusive, or spam behavior
 * - MESSAGES: Harassing or inappropriate messages
 * - SHARED CONTENT: Notes, files, or projects shared with offensive content
 * - ACCOUNTS: Fake accounts, phishing attempts
 * - SPAM: Unwanted connections or messages
 *
 * WHY REPORTS MATTER:
 * -------------------
 * Reports help keep myBrain safe by:
 * - Identifying abusive users and content
 * - Protecting users from harassment
 * - Preventing spam and phishing
 * - Maintaining community standards
 * - Providing paper trail for moderation
 *
 * REPORT PROCESS:
 * ----------------
 * 1. USER SUBMITS: Identifies problem content/user
 * 2. REASON PROVIDED: User explains why they're reporting
 * 3. EVIDENCE SAVED: Report includes context (message, user, etc.)
 * 4. ADMIN REVIEW: Moderator investigates report
 * 5. ACTION TAKEN: User warned, suspended, or no action
 * 6. REPORTER NOTIFIED: Outcome communicated (optional)
 *
 * REPORT REASONS:
 * ----------------
 * - HARASSMENT: Abusive, threatening, or bullying behavior
 * - SPAM: Unwanted messages or connection requests
 * - INAPPROPRIATE: Sexual, violent, or hateful content
 * - PHISHING: Attempting to steal credentials
 * - SCAM: Fraudulent or deceptive activity
 * - IMPERSONATION: Pretending to be someone else
 * - COPYRIGHT: Stolen or infringing content
 * - OTHER: User provides custom reason
 *
 * REPORT STATUS:
 * ---------------
 * - PENDING: Submitted, awaiting admin review
 * - UNDER_REVIEW: Admin is investigating
 * - RESOLVED: Admin took action
 * - DISMISSED: No action needed
 * - APPEALED: User appealed the decision
 *
 * REPORTER PROTECTION:
 * --------------------
 * - Reports are confidential
 * - Reported user doesn't see who reported them
 * - Multiple reports aggregated (privacy protection)
 * - False reporters can be warned
 *
 * FALSE REPORTING:
 * ----------------
 * Using reports maliciously can result in:
 * - Warning from admin
 * - Suspension of report privileges
 * - Account suspension if pattern continues
 *
 * ENDPOINTS:
 * -----------
 * - POST /reports - Submit a new report
 * - GET /reports/:id - Get report details (admin/reporter only)
 * - GET /admin/reports - List all reports (admin only)
 * - PUT /admin/reports/:id - Update report status (admin only)
 * - DELETE /reports/:id - Delete report (reporter or admin)
 *
 * PRIVACY NOTES:
 * ----------------
 * - Reports contain sensitive information
 * - Only admins can view reporter identity
 * - Reported users don't see reports against them
 * - Reports deleted after 2 years
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
 * Mongoose provides database utilities for MongoDB validation.
 * We use mongoose.model() to dynamically get model classes and
 * mongoose.Types.ObjectId.isValid() to validate IDs are proper format.
 */
import mongoose from 'mongoose';

/**
 * Report model represents a user report for moderation.
 * Stores what was reported, why it was reported, and moderation status.
 * Used by admins to review and take action on problematic content/users.
 */
import Report from '../models/Report.js';

/**
 * User model represents user accounts.
 * We import this to check if reported user exists before creating report.
 */
import User from '../models/User.js';

/**
 * Message model represents direct messages.
 * We import this to get message details when reporting a message.
 * Also captures message content in the report for admin review.
 */
import Message from '../models/Message.js';

/**
 * ItemShare model represents shared content.
 * We import this to validate shared items being reported.
 * Helps determine what content is being reported.
 */
import ItemShare from '../models/ItemShare.js';

/**
 * Auth middleware checks that the user is logged in.
 * Most report endpoints require authentication (except public admin access).
 * If not logged in, request is rejected with 401 Unauthorized.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to logs
 * so we can investigate failures (database errors, validation issues, etc.).
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger attaches important IDs to requests for Wide Events logging.
 * attachEntityId(req, 'reportId', value) marks what report this request affects.
 * This helps us track and search logs by specific reports.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// =============================================================================
// CONTENT TYPES MAPPING
// =============================================================================
// Maps user-friendly names to database models for flexible reporting
// This allows reporting different types of content with a single endpoint
//
// WHAT THIS DOES:
// When user submits a report, they specify what type of content they're reporting
// (user, message, note, etc.). This mapping lets us look up the correct database
// model to fetch details about the reported content.
//
// HOW IT WORKS:
// Report: { targetType: 'message', targetId: '123abc' }
// Lookup: TARGET_MODELS['message'] → 'Message' → mongoose.model('Message')
// Then we fetch Message.findById('123abc') to get the content details

const TARGET_MODELS = {
  user: 'User',           // Reporting abusive user account
  message: 'Message',     // Reporting harassing message
  project: 'Project',     // Reporting inappropriate project
  task: 'Task',           // Reporting inappropriate task
  note: 'Note',           // Reporting inappropriate note
  file: 'File',           // Reporting inappropriate file
  share: 'ItemShare'      // Reporting inappropriate shared content
};

/**
 * POST /reports
 * Submit a report about inappropriate content or user behavior
 *
 * WHAT IT DOES:
 * User submits a report about inappropriate content or abusive behavior.
 * Reports are reviewed by moderators who can warn, suspend, or delete content.
 * Helps maintain community safety and enforce community standards.
 *
 * WHAT CAN BE REPORTED?
 * - Users: Abusive, spam, impersonation behavior
 * - Messages: Harassment, threats, hate speech in direct messages
 * - Content: Notes, tasks, projects with inappropriate content
 * - Files: Malware, copyright infringement, illegal content
 * - Shares: Shared content with harmful material
 *
 * REPORT REASONS:
 * - spam: Unwanted messages or connection requests
 * - harassment: Bullying or threatening behavior
 * - hate_speech: Hateful or discriminatory content
 * - inappropriate_content: Sexual, violent, or offensive material
 * - impersonation: Pretending to be someone else
 * - copyright: Stolen content or copyright infringement
 * - privacy_violation: Sharing private information without permission
 * - scam: Fraudulent or deceptive activity
 * - other: Custom reason described by reporter
 *
 * PRIVACY PROTECTION:
 * - Report is confidential - reported user doesn't know who reported them
 * - Reporters cannot file duplicate reports on same content
 * - Reports are only visible to admins and trust/safety team
 * - Reporter identity protected even from admins in some cases
 *
 * REQUEST BODY:
 * {
 *   "targetType": "user" | "message" | "note" | "task" | "project" | "file" | "share",
 *   "targetId": "MongoDB ObjectId",
 *   "reason": "spam" | "harassment" | "hate_speech" | "inappropriate_content" |
 *             "impersonation" | "copyright" | "privacy_violation" | "scam" | "other",
 *   "description": "Detailed explanation of why you're reporting this"
 * }
 *
 * EXAMPLE REQUEST:
 * POST /reports
 * {
 *   "targetType": "user",
 *   "targetId": "507f1f77bcf86cd799439021",
 *   "reason": "harassment",
 *   "description": "This user has been sending me threatening messages repeatedly"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   "message": "Report submitted successfully",
 *   "reportId": "607f1f77bcf86cd799439101"
 * }
 *
 * VALIDATION RULES:
 * - targetType: Required, must be valid (user, message, note, task, project, file, share)
 * - targetId: Required, must be valid MongoDB ObjectId
 * - reason: Required, must be from pre-defined list of reasons
 * - description: Optional but recommended (helps admins understand context)
 * - Cannot report yourself (security check)
 * - Cannot report same content twice (duplicate prevention)
 * - Content being reported must exist in database
 *
 * ERROR RESPONSES:
 * - 400: Validation error (invalid targetType, targetId, or reason)
 * - 400: Cannot report yourself
 * - 400: Duplicate report (already reported this content)
 * - 404: Content not found or target doesn't exist
 * - 401: User not authenticated
 * - 500: Server error
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract report details from request body
    const {
      targetType,    // What type of content? (user, message, note, etc.)
      targetId,      // ID of the content being reported
      reason,        // Why are they reporting it? (spam, harassment, etc.)
      description    // Detailed explanation from reporter
    } = req.body;

    // Step 2: Validate that target type is recognized
    // Make sure we support reporting this type of content
    if (!TARGET_MODELS[targetType]) {
      return res.status(400).json({
        error: 'Invalid target type',
        code: 'INVALID_TARGET_TYPE'
      });
    }

    // Step 3: Validate that target ID is proper MongoDB format
    // Prevents errors when querying database with invalid IDs
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        error: 'Invalid target ID',
        code: 'INVALID_TARGET_ID'
      });
    }

    // Step 4: Validate the report reason is from pre-defined list
    // Only allow specific reasons for consistency and admin categorization
    const validReasons = [
      'spam',                    // Unwanted messages/connections
      'harassment',              // Bullying or threatening
      'hate_speech',             // Discriminatory content
      'inappropriate_content',   // Sexual, violent, offensive
      'impersonation',           // Pretending to be someone
      'copyright',               // Stolen or infringing content
      'privacy_violation',       // Sharing private info
      'scam',                    // Fraudulent activity
      'other'                    // Custom reason
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        error: 'Invalid reason',
        code: 'INVALID_REASON'
      });
    }

    // =====================================================
    // CONTENT SNAPSHOT & REPORTED USER IDENTIFICATION
    // =====================================================
    // Step 5: Get details about the reported content
    // Capture a snapshot for admins to review and identify reported user
    let reportedUserId = null;  // Who is being reported?
    let contentSnapshot = null; // Snapshot of content for admins to review

    // CASE 1: Reporting a user account
    if (targetType === 'user') {
      // Check if user exists
      const user = await User.findById(targetId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'TARGET_NOT_FOUND'
        });
      }
      reportedUserId = targetId;

      // Capture user info for admin review
      contentSnapshot = {
        email: user.email,
        displayName: user.profile?.displayName,
        bio: user.profile?.bio
      };

      // Security check: Users cannot report themselves (prevents abuse)
      if (targetId === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot report yourself',
          code: 'SELF_REPORT'
        });
      }

    // CASE 2: Reporting a message
    } else if (targetType === 'message') {
      // Get the message to report
      const message = await Message.findById(targetId);
      if (!message) {
        return res.status(404).json({
          error: 'Message not found',
          code: 'TARGET_NOT_FOUND'
        });
      }
      reportedUserId = message.senderId;  // The person who sent the message

      // Capture message content for admin review (first 500 chars to avoid huge snapshots)
      contentSnapshot = {
        content: message.content?.substring(0, 500),
        contentType: message.contentType
      };

    // CASE 3: Reporting other content (notes, tasks, projects, files, etc.)
    } else {
      // Get the model for this content type
      // For example: 'Note' → mongoose.model('Note')
      const Model = mongoose.model(TARGET_MODELS[targetType]);
      const doc = await Model.findById(targetId);

      // Check if content exists
      if (!doc) {
        return res.status(404).json({
          error: `${targetType} not found`,
          code: 'TARGET_NOT_FOUND'
        });
      }

      // Get the owner/author of this content (userId or ownerId field)
      reportedUserId = doc.userId || doc.ownerId;

      // Capture content details for admin review (first 500 chars)
      contentSnapshot = {
        title: doc.title || doc.name,
        content: doc.content?.substring(0, 500) || doc.description?.substring(0, 500)
      };
    }

    // =====================================================
    // CREATE REPORT
    // =====================================================
    // Step 6: Create the report in database
    // Report.createReport handles:
    // - Duplicate checking (prevents multiple reports on same content)
    // - Report creation
    // - Timestamps
    const report = await Report.createReport({
      reporterId: req.user._id,    // Who is reporting?
      targetType,                  // What type of content?
      targetId,                    // ID of content being reported
      reportedUserId,              // Who is the content owner/author?
      reason,                      // Why are they reporting?
      description,                 // Reporter's detailed explanation
      contentSnapshot              // Content snapshot for admins to review
    });

    // =====================================================
    // LOGGING
    // =====================================================
    // Step 7: Log this action for Wide Events tracking
    // Attach report ID so admins can search logs by report
    attachEntityId(req, 'reportId', report._id);
    // Set event name for reporting analytics
    req.eventName = 'report.create.success';

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 8: Return success response with report ID
    res.status(201).json({
      message: 'Report submitted successfully',
      reportId: report._id
    });

  } catch (error) {
    // Handle specific error: user already reported this content
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        error: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }

    // Log unexpected errors for debugging
    attachError(req, error, { operation: 'submit_report' });
    res.status(500).json({
      error: 'Failed to submit report',
      code: 'REPORT_ERROR'
    });
  }
});

/**
 * GET /reports/my-reports
 * Get reports submitted by the current user
 *
 * WHAT IT DOES:
 * Returns a paginated list of all reports the current user has submitted.
 * Users can see the status and outcome of reports they filed.
 *
 * WHY THIS MATTERS:
 * - Users can track status of reports they submitted
 * - See if admin took action
 * - See why report was dismissed (if applicable)
 *
 * QUERY PARAMETERS:
 * - limit: How many reports per page (default: 20, max: recommended 50)
 * - skip: How many to skip for pagination (default: 0)
 *
 * RESPONSE:
 * {
 *   reports: [
 *     {
 *       _id: "123abc",
 *       targetType: "user",
 *       reason: "harassment",
 *       status: "resolved",
 *       createdAt: "2026-01-20T10:00:00Z",
 *       resolution: { action: "user_suspended" }
 *     }
 *   ],
 *   total: 5,
 *   limit: 20,
 *   skip: 0
 * }
 *
 * PAGINATION:
 * - Total: Total number of reports user submitted
 * - Limit: Number of results per page
 * - Skip: How many were skipped (for pagination)
 * - To get next page: skip += limit
 */
router.get('/my-reports', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 20, skip = 0 } = req.query;

    // Step 2: Query for reports submitted by this user
    // Only return relevant fields (don't expose sensitive info)
    const reports = await Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })              // Most recent first
      .skip(parseInt(skip))                 // Skip for pagination
      .limit(parseInt(limit))               // Limit results
      .select('targetType reason status createdAt resolution.action');

    // Step 3: Get total count of user's reports
    // Used by frontend for pagination (showing "1 of 5", etc.)
    const total = await Report.countDocuments({ reporterId: req.user._id });

    // Step 4: Return reports with pagination info
    res.json({
      reports,
      total,              // Total number of reports user submitted
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'get_my_reports' });
    res.status(500).json({
      error: 'Failed to get reports',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;
