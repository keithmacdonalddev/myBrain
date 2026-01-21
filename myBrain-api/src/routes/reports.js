import express from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import ItemShare from '../models/ItemShare.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// Content type to model mapping
const TARGET_MODELS = {
  user: 'User',
  message: 'Message',
  project: 'Project',
  task: 'Task',
  note: 'Note',
  file: 'File',
  share: 'ItemShare'
};

/**
 * POST /reports
 * Submit a report
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      reason,
      description
    } = req.body;

    // Validate target type
    if (!TARGET_MODELS[targetType]) {
      return res.status(400).json({
        error: 'Invalid target type',
        code: 'INVALID_TARGET_TYPE'
      });
    }

    // Validate target ID
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        error: 'Invalid target ID',
        code: 'INVALID_TARGET_ID'
      });
    }

    // Validate reason
    const validReasons = [
      'spam', 'harassment', 'hate_speech', 'inappropriate_content',
      'impersonation', 'copyright', 'privacy_violation', 'scam', 'other'
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        error: 'Invalid reason',
        code: 'INVALID_REASON'
      });
    }

    // Get the target entity and determine reported user
    let reportedUserId = null;
    let contentSnapshot = null;

    if (targetType === 'user') {
      const user = await User.findById(targetId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'TARGET_NOT_FOUND'
        });
      }
      reportedUserId = targetId;
      contentSnapshot = {
        email: user.email,
        displayName: user.profile?.displayName,
        bio: user.profile?.bio
      };

      // Can't report yourself
      if (targetId === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot report yourself',
          code: 'SELF_REPORT'
        });
      }
    } else if (targetType === 'message') {
      const message = await Message.findById(targetId);
      if (!message) {
        return res.status(404).json({
          error: 'Message not found',
          code: 'TARGET_NOT_FOUND'
        });
      }
      reportedUserId = message.senderId;
      contentSnapshot = {
        content: message.content?.substring(0, 500),
        contentType: message.contentType
      };
    } else {
      // For other content types, get the userId from the document
      const Model = mongoose.model(TARGET_MODELS[targetType]);
      const doc = await Model.findById(targetId);
      if (!doc) {
        return res.status(404).json({
          error: `${targetType} not found`,
          code: 'TARGET_NOT_FOUND'
        });
      }
      reportedUserId = doc.userId || doc.ownerId;
      contentSnapshot = {
        title: doc.title || doc.name,
        content: doc.content?.substring(0, 500) || doc.description?.substring(0, 500)
      };
    }

    // Create the report
    const report = await Report.createReport({
      reporterId: req.user._id,
      targetType,
      targetId,
      reportedUserId,
      reason,
      description,
      contentSnapshot
    });

    // Wide Events logging
    attachEntityId(req, 'reportId', report._id);
    req.eventName = 'report.create.success';

    res.status(201).json({
      message: 'Report submitted successfully',
      reportId: report._id
    });
  } catch (error) {
    if (error.message === 'You have already reported this content') {
      return res.status(400).json({
        error: error.message,
        code: 'DUPLICATE_REPORT'
      });
    }
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
 */
router.get('/my-reports', requireAuth, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const reports = await Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('targetType reason status createdAt resolution.action');

    const total = await Report.countDocuments({ reporterId: req.user._id });

    res.json({
      reports,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_my_reports' });
    res.status(500).json({
      error: 'Failed to get reports',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;
