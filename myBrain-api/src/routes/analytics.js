import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import analyticsService from '../services/analyticsService.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';

const router = express.Router();

/**
 * POST /analytics/track
 * Track an analytics event (available to all authenticated users)
 */
router.post('/track', requireAuth, async (req, res, next) => {
  try {
    const {
      category,
      action,
      feature,
      metadata,
      page,
      referrer,
      screenSize,
      duration,
      sessionId
    } = req.body;

    if (!category || !action) {
      return res.status(400).json({
        success: false,
        error: 'Category and action are required'
      });
    }

    const event = await analyticsService.trackEvent({
      userId: req.user._id,
      sessionId,
      category,
      action,
      feature,
      metadata,
      page,
      referrer,
      userAgent: req.headers['user-agent'],
      screenSize,
      duration
    });

    res.status(201).json({
      success: true,
      data: { tracked: !!event }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /analytics/track/batch
 * Track multiple events at once
 */
router.post('/track/batch', requireAuth, async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required'
      });
    }

    const userAgent = req.headers['user-agent'];
    const results = await Promise.all(
      events.slice(0, 50).map(event => // Limit to 50 events per batch
        analyticsService.trackEvent({
          userId: req.user._id,
          sessionId: event.sessionId,
          category: event.category,
          action: event.action,
          feature: event.feature,
          metadata: event.metadata,
          page: event.page,
          referrer: event.referrer,
          userAgent,
          screenSize: event.screenSize,
          duration: event.duration
        })
      )
    );

    res.status(201).json({
      success: true,
      data: { tracked: results.filter(Boolean).length }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Admin-only routes below
// ============================================

/**
 * GET /analytics/overview
 * Get analytics overview (admin only)
 */
router.get('/overview', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate, period = '7d' } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    const overview = await analyticsService.getOverview(start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...overview
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/features
 * Get detailed feature analytics (admin only)
 */
router.get('/features', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate, period = '7d', feature } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    const analytics = await analyticsService.getFeatureAnalytics(start, end, feature || null);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...analytics
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/users
 * Get user analytics (admin only)
 */
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate, period = '7d' } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    const [userAnalytics, retentionMetrics] = await Promise.all([
      analyticsService.getUserAnalytics(start, end),
      analyticsService.getRetentionMetrics(start, end)
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...userAnalytics,
        retention: retentionMetrics
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/errors
 * Get error analytics (admin only)
 */
router.get('/errors', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;

    const end = new Date();
    const start = new Date();

    switch (period) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    const errors = await analyticsService.getErrorAnalytics(start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        errors
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/realtime
 * Get real-time analytics (last hour) (admin only)
 */
router.get('/realtime', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - 1);

    const [
      totalEvents,
      activeUsers,
      recentEvents
    ] = await Promise.all([
      AnalyticsEvent.countDocuments({
        timestamp: { $gte: start, $lte: end }
      }),
      AnalyticsEvent.distinct('userId', {
        timestamp: { $gte: start, $lte: end },
        userId: { $ne: null }
      }),
      AnalyticsEvent.find({
        timestamp: { $gte: start, $lte: end }
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('category action feature page timestamp userId')
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        totalEvents,
        activeUsers: activeUsers.length,
        recentEvents
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
