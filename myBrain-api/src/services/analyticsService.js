import AnalyticsEvent from '../models/AnalyticsEvent.js';

/**
 * Parse user agent string to extract device info
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // Detect OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

/**
 * Track an analytics event
 */
async function trackEvent({
  userId = null,
  sessionId = null,
  category,
  action,
  feature = 'other',
  metadata = {},
  page = null,
  referrer = null,
  userAgent = null,
  screenSize = null,
  duration = null
}) {
  try {
    const deviceInfo = parseUserAgent(userAgent);

    const event = await AnalyticsEvent.track({
      userId,
      sessionId,
      category,
      action,
      feature,
      metadata,
      page,
      referrer,
      userAgent,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screenSize,
      duration
    });

    return event;
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return null;
  }
}

/**
 * Get comprehensive analytics overview
 */
async function getOverview(startDate, endDate) {
  const [
    totalEvents,
    uniqueUsers,
    featureUsage,
    popularActions,
    dailyActiveUsers,
    pageViews,
    deviceBreakdown
  ] = await Promise.all([
    AnalyticsEvent.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    }),
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate },
      userId: { $ne: null }
    }),
    AnalyticsEvent.getFeatureUsage(startDate, endDate),
    AnalyticsEvent.getPopularActions(startDate, endDate, 10),
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),
    AnalyticsEvent.getPageViews(startDate, endDate),
    AnalyticsEvent.getDeviceBreakdown(startDate, endDate)
  ]);

  return {
    summary: {
      totalEvents,
      uniqueUsers: uniqueUsers.length,
      avgEventsPerUser: uniqueUsers.length > 0
        ? Math.round(totalEvents / uniqueUsers.length)
        : 0
    },
    featureUsage,
    popularActions,
    dailyActiveUsers,
    pageViews: pageViews.slice(0, 10),
    deviceBreakdown
  };
}

/**
 * Get detailed feature analytics
 */
async function getFeatureAnalytics(startDate, endDate, feature = null) {
  const matchStage = {
    timestamp: { $gte: startDate, $lte: endDate },
    category: 'feature'
  };

  if (feature) {
    matchStage.feature = feature;
  }

  const [usage, actionBreakdown, dailyUsage, userEngagement] = await Promise.all([
    // Overall usage
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$feature',
          totalActions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          createActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /create/i } }, 1, 0] }
          },
          updateActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /update|edit/i } }, 1, 0] }
          },
          deleteActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /delete|remove/i } }, 1, 0] }
          },
          viewActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /view|open/i } }, 1, 0] }
          }
        }
      },
      {
        $project: {
          feature: '$_id',
          totalActions: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          createActions: 1,
          updateActions: 1,
          deleteActions: 1,
          viewActions: 1,
          _id: 0
        }
      },
      { $sort: { totalActions: -1 } }
    ]),

    // Action breakdown
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { feature: '$feature', action: '$action' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.feature',
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          feature: '$_id',
          actions: { $slice: [{ $sortArray: { input: '$actions', sortBy: { count: -1 } } }, 10] },
          _id: 0
        }
      }
    ]),

    // Daily usage trend
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            feature: '$feature'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          features: {
            $push: {
              feature: '$_id.feature',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $project: {
          date: '$_id',
          features: 1,
          total: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]),

    // User engagement (top users by feature usage)
    AnalyticsEvent.aggregate([
      { $match: { ...matchStage, userId: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          actionCount: { $sum: 1 },
          features: { $addToSet: '$feature' }
        }
      },
      {
        $project: {
          userId: '$_id',
          actionCount: 1,
          featureCount: { $size: '$features' },
          _id: 0
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    usage,
    actionBreakdown,
    dailyUsage,
    userEngagement
  };
}

/**
 * Get user activity analytics
 */
async function getUserAnalytics(startDate, endDate) {
  const [
    activeUsers,
    newVsReturning,
    userSessions,
    hourlyActivity
  ] = await Promise.all([
    // Most active users
    AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          features: { $addToSet: '$feature' },
          lastActive: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          userId: '$_id',
          eventCount: 1,
          sessionCount: { $size: '$sessions' },
          featureCount: { $size: '$features' },
          lastActive: 1,
          _id: 0
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 20 }
    ]),

    // Session statistics
    AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          sessionId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          userId: { $first: '$userId' },
          eventCount: { $sum: 1 },
          startTime: { $min: '$timestamp' },
          endTime: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          sessionId: '$_id',
          userId: 1,
          eventCount: 1,
          duration: { $subtract: ['$endTime', '$startTime'] },
          _id: 0
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgEventsPerSession: { $avg: '$eventCount' },
          avgSessionDuration: { $avg: '$duration' }
        }
      },
      {
        $project: {
          totalSessions: 1,
          avgEventsPerSession: { $round: ['$avgEventsPerSession', 1] },
          avgSessionDurationMs: { $round: ['$avgSessionDuration', 0] },
          _id: 0
        }
      }
    ]),

    // Daily unique users
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),

    // Hourly activity pattern
    AnalyticsEvent.getHourlyActivity(startDate, endDate)
  ]);

  return {
    activeUsers,
    sessionStats: newVsReturning[0] || { totalSessions: 0, avgEventsPerSession: 0, avgSessionDurationMs: 0 },
    dailyActiveUsers: userSessions,
    hourlyActivity
  };
}

/**
 * Get error analytics
 */
async function getErrorAnalytics(startDate, endDate) {
  return AnalyticsEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'error'
      }
    },
    {
      $group: {
        _id: { action: '$action', page: '$page' },
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' },
        affectedUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        error: '$_id.action',
        page: '$_id.page',
        count: 1,
        lastOccurred: 1,
        affectedUsers: { $size: '$affectedUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
}

/**
 * Get retention metrics
 */
async function getRetentionMetrics(startDate, endDate) {
  // Get users who were active in the first week
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  const [firstPeriodUsers, secondPeriodUsers] = await Promise.all([
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lt: midPoint },
      userId: { $ne: null }
    }),
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: midPoint, $lte: endDate },
      userId: { $ne: null }
    })
  ]);

  const firstSet = new Set(firstPeriodUsers.map(id => id?.toString()));
  const secondSet = new Set(secondPeriodUsers.map(id => id?.toString()));

  const retained = [...firstSet].filter(id => secondSet.has(id)).length;
  const retentionRate = firstSet.size > 0
    ? Math.round((retained / firstSet.size) * 100)
    : 0;

  return {
    firstPeriodUsers: firstSet.size,
    secondPeriodUsers: secondSet.size,
    retainedUsers: retained,
    retentionRate
  };
}

export default {
  trackEvent,
  getOverview,
  getFeatureAnalytics,
  getUserAnalytics,
  getErrorAnalytics,
  getRetentionMetrics,
  parseUserAgent
};
