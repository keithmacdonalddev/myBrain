/**
 * =============================================================================
 * DASHBOARD.JS - Dashboard API Routes
 * =============================================================================
 *
 * This file defines the API endpoints for the intelligent dashboard feature.
 * The main endpoint aggregates all dashboard data in a single request.
 *
 * ENDPOINTS:
 * ----------
 * GET /dashboard          - Get all dashboard data (aggregated)
 * POST /dashboard/session - Track a dashboard session/visit
 *
 * =============================================================================
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import { getDashboardData } from '../services/dashboardService.js';
import { trackSession } from '../services/usageService.js';

const router = express.Router();

// =============================================================================
// ROUTE: GET /dashboard
// =============================================================================

/**
 * GET /dashboard
 * --------------
 * Gets all data needed for the intelligent dashboard in a single request.
 *
 * This endpoint aggregates:
 * - Urgent items (overdue tasks, events starting soon)
 * - Attention items (unread messages, notifications, pending shares)
 * - Recent items (recently created/modified content)
 * - Usage profile (feature usage percentages for priority scoring)
 * - Today's and tomorrow's events
 * - Priority tasks
 * - Active projects
 * - Unread conversations
 * - Inbox notes
 * - Notifications
 * - Completion stats
 * - User dashboard preferences
 *
 * QUERY PARAMETERS:
 * - timezone: User's timezone (default: 'UTC')
 *
 * SUCCESS RESPONSE:
 * {
 *   urgentItems: { overdueTasks, dueTodayTasks, upcomingEvents, counts },
 *   attentionItems: { unreadMessages, pendingShares, unreadNotifications, total },
 *   recentItems: { notes, tasks, projects },
 *   usageProfile: { tasks: 35, notes: 22, ... },
 *   events: { today: [...], tomorrow: [...] },
 *   tasks: [...],
 *   projects: [...],
 *   messages: [...],
 *   inbox: [...],
 *   notifications: [...],
 *   sharedItems: [...],
 *   activity: [...],
 *   stats: { tasks: {...}, projects: {...} },
 *   preferences: { pinnedWidgets, hiddenWidgets, widgetSettings },
 *   timestamp: '2024-01-15T10:30:00.000Z'
 * }
 *
 * CACHING:
 * The frontend should cache this data for 30-60 seconds and use
 * polling or WebSocket updates for real-time changes.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { timezone = 'UTC' } = req.query;

    const dashboardData = await getDashboardData(req.user._id, { timezone });

    // Track for logging
    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'dashboard.view';

    res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /dashboard/session
// =============================================================================

/**
 * POST /dashboard/session
 * -----------------------
 * Tracks a new dashboard session (app open).
 * Used for usage analytics and the intelligent dashboard's activity tracking.
 *
 * This should be called when:
 * - User opens the app
 * - User returns to the dashboard after being away
 *
 * SUCCESS RESPONSE:
 * { message: 'Session tracked' }
 */
router.post('/session', requireAuth, async (req, res) => {
  try {
    await trackSession(req.user._id);

    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'dashboard.session';

    res.json({ message: 'Session tracked' });

  } catch (error) {
    // Don't fail the request for session tracking errors
    console.error('Dashboard session tracking error:', error.message);
    res.json({ message: 'Session tracked' });
  }
});

export default router;
