/**
 * adminSocialService.js
 * =====================
 * Service for admin social monitoring dashboard.
 * Provides aggregated statistics and insights for social features.
 */

import Connection from '../models/Connection.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Report from '../models/Report.js';
import ItemShare from '../models/ItemShare.js';
import UserBlock from '../models/UserBlock.js';
import User from '../models/User.js';

// =============================================================================
// DASHBOARD STATISTICS
// =============================================================================

/**
 * getSocialDashboardStats(options)
 * --------------------------------
 * Get aggregated statistics for the social features dashboard.
 *
 * @param {Object} options
 *   - options.period: 'daily' | 'weekly' | 'monthly' (default: 'weekly')
 *   - options.days: Number of days to include in trends (default: 7)
 *
 * @returns {Object} Dashboard statistics
 */
export async function getSocialDashboardStats(options = {}) {
  const { period = 'weekly', days = 7 } = options;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Run all queries in parallel
  const [
    connectionStats,
    messageStats,
    reportStats,
    shareStats,
    blockStats,
    activeUsers,
    connectionTrends,
    messageTrends
  ] = await Promise.all([
    getConnectionStats(startDate, endDate),
    getMessageStats(startDate, endDate),
    getReportStats(),
    getShareStats(startDate, endDate),
    getBlockStats(startDate, endDate),
    getTopActiveUsers(10),
    getConnectionTrends(days),
    getMessageTrends(days)
  ]);

  return {
    period,
    dateRange: {
      start: startDate,
      end: endDate
    },
    connections: connectionStats,
    messages: messageStats,
    reports: reportStats,
    shares: shareStats,
    blocks: blockStats,
    activeUsers,
    trends: {
      connections: connectionTrends,
      messages: messageTrends
    }
  };
}

// =============================================================================
// CONNECTION STATISTICS
// =============================================================================

/**
 * getConnectionStats(startDate, endDate)
 * --------------------------------------
 * Get connection-related statistics.
 */
async function getConnectionStats(startDate, endDate) {
  const [
    total,
    newConnections,
    pendingRequests,
    statusCounts
  ] = await Promise.all([
    Connection.countDocuments({ status: 'accepted' }),
    Connection.countDocuments({
      status: 'accepted',
      acceptedAt: { $gte: startDate, $lte: endDate }
    }),
    Connection.countDocuments({ status: 'pending' }),
    Connection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const byStatus = {};
  statusCounts.forEach(s => {
    byStatus[s._id] = s.count;
  });

  return {
    total,
    new: newConnections,
    pending: pendingRequests,
    byStatus
  };
}

/**
 * getConnectionTrends(days)
 * -------------------------
 * Get daily connection trends for the past N days.
 */
async function getConnectionTrends(days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const trends = await Connection.aggregate([
    {
      $match: {
        status: 'accepted',
        acceptedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$acceptedAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill in missing days with 0
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const found = trends.find(t => t._id === dateStr);
    result.push({
      date: dateStr,
      count: found ? found.count : 0
    });
  }

  return result;
}

// =============================================================================
// MESSAGE STATISTICS
// =============================================================================

/**
 * getMessageStats(startDate, endDate)
 * -----------------------------------
 * Get message-related statistics.
 */
async function getMessageStats(startDate, endDate) {
  const [
    totalMessages,
    newMessages,
    activeConversations,
    totalConversations
  ] = await Promise.all([
    Message.countDocuments({ isDeleted: { $ne: true } }),
    Message.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    }),
    Conversation.countDocuments({
      lastMessageAt: { $gte: startDate }
    }),
    Conversation.countDocuments({})
  ]);

  return {
    totalMessages,
    newMessages,
    activeConversations,
    totalConversations
  };
}

/**
 * getMessageTrends(days)
 * ----------------------
 * Get daily message volume trends.
 */
async function getMessageTrends(days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const trends = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill in missing days with 0
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const found = trends.find(t => t._id === dateStr);
    result.push({
      date: dateStr,
      count: found ? found.count : 0
    });
  }

  return result;
}

// =============================================================================
// REPORT STATISTICS
// =============================================================================

/**
 * getReportStats()
 * ----------------
 * Get report-related statistics.
 */
async function getReportStats() {
  const [statusCounts, priorityCounts, reasonCounts] = await Promise.all([
    Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ])
  ]);

  const byStatus = {};
  statusCounts.forEach(s => {
    byStatus[s._id] = s.count;
  });

  const byPriority = {};
  priorityCounts.forEach(p => {
    byPriority[p._id] = p.count;
  });

  const byReason = {};
  reasonCounts.forEach(r => {
    byReason[r._id] = r.count;
  });

  return {
    pending: byStatus.pending || 0,
    reviewing: byStatus.reviewing || 0,
    resolved: byStatus.resolved || 0,
    dismissed: byStatus.dismissed || 0,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    pendingByPriority: byPriority,
    pendingByReason: byReason
  };
}

// =============================================================================
// SHARE STATISTICS
// =============================================================================

/**
 * getShareStats(startDate, endDate)
 * ---------------------------------
 * Get item sharing statistics.
 */
async function getShareStats(startDate, endDate) {
  const [total, newShares, activeShares, byType] = await Promise.all([
    ItemShare.countDocuments({}),
    ItemShare.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    ItemShare.countDocuments({ status: 'active' }),
    ItemShare.aggregate([
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const typeStats = {};
  byType.forEach(t => {
    typeStats[t._id] = t.count;
  });

  return {
    total,
    new: newShares,
    active: activeShares,
    byType: typeStats
  };
}

// =============================================================================
// BLOCK STATISTICS
// =============================================================================

/**
 * getBlockStats(startDate, endDate)
 * ---------------------------------
 * Get user blocking statistics.
 */
async function getBlockStats(startDate, endDate) {
  const [total, newBlocks, byReason] = await Promise.all([
    UserBlock.countDocuments({}),
    UserBlock.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    UserBlock.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const reasonStats = {};
  byReason.forEach(r => {
    reasonStats[r._id || 'other'] = r.count;
  });

  return {
    total,
    new: newBlocks,
    byReason: reasonStats
  };
}

// =============================================================================
// TOP ACTIVE USERS
// =============================================================================

/**
 * getTopActiveUsers(limit)
 * ------------------------
 * Get users with most social activity.
 */
async function getTopActiveUsers(limit = 10) {
  // Get users with most messages in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const topMessagers = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo },
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$senderId',
        messageCount: { $sum: 1 }
      }
    },
    { $sort: { messageCount: -1 } },
    { $limit: limit }
  ]);

  // Populate user details
  const userIds = topMessagers.map(u => u._id);
  const users = await User.find(
    { _id: { $in: userIds } },
    'email profile.displayName profile.avatarUrl'
  ).lean();

  const userMap = {};
  users.forEach(u => {
    userMap[u._id.toString()] = u;
  });

  return topMessagers.map(u => ({
    user: userMap[u._id.toString()] || { _id: u._id, email: 'Unknown' },
    messageCount: u.messageCount
  }));
}

// =============================================================================
// USER SOCIAL METRICS
// =============================================================================

/**
 * getUserSocialMetrics(userId)
 * ----------------------------
 * Get detailed social metrics for a specific user.
 *
 * @param {ObjectId} userId - The user to get metrics for
 *
 * @returns {Object} Social metrics
 */
export async function getUserSocialMetrics(userId) {
  const [
    connectionCount,
    pendingSent,
    pendingReceived,
    blockedByUser,
    blockedByOthers,
    messagesSent,
    conversationCount,
    sharesSent,
    sharesReceived,
    reportsAgainst,
    reportsSubmitted
  ] = await Promise.all([
    Connection.countDocuments({
      $or: [{ requesterId: userId }, { receiverId: userId }],
      status: 'accepted'
    }),
    Connection.countDocuments({ requesterId: userId, status: 'pending' }),
    Connection.countDocuments({ receiverId: userId, status: 'pending' }),
    UserBlock.countDocuments({ blockerId: userId }),
    UserBlock.countDocuments({ blockedId: userId }),
    Message.countDocuments({ senderId: userId, isDeleted: { $ne: true } }),
    Conversation.countDocuments({
      'participants.userId': userId
    }),
    ItemShare.countDocuments({ ownerId: userId }),
    ItemShare.countDocuments({ 'sharedWith.userId': userId }),
    Report.countDocuments({ reportedUserId: userId }),
    Report.countDocuments({ reporterId: userId })
  ]);

  return {
    connections: {
      total: connectionCount,
      pendingSent,
      pendingReceived
    },
    blocking: {
      blockedByUser,
      blockedByOthers
    },
    messaging: {
      messagesSent,
      conversationCount
    },
    sharing: {
      sharesSent,
      sharesReceived
    },
    reports: {
      against: reportsAgainst,
      submitted: reportsSubmitted
    }
  };
}

// =============================================================================
// CONNECTION PATTERN ANALYSIS
// =============================================================================

/**
 * getConnectionPatterns(userId)
 * -----------------------------
 * Analyze connection patterns for a user (for spam/abuse detection).
 *
 * @param {ObjectId} userId - The user to analyze
 *
 * @returns {Object} Connection pattern analysis
 */
export async function getConnectionPatterns(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    requestsSent,
    requestsAccepted,
    requestsDeclined,
    blockedAfterConnecting,
    whoBlockedUser
  ] = await Promise.all([
    // Requests sent in last 30 days
    Connection.countDocuments({
      requesterId: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }),
    // Requests accepted
    Connection.countDocuments({
      requesterId: userId,
      status: 'accepted',
      createdAt: { $gte: thirtyDaysAgo }
    }),
    // Requests declined
    Connection.countDocuments({
      requesterId: userId,
      status: 'declined',
      createdAt: { $gte: thirtyDaysAgo }
    }),
    // Users who blocked this user after connecting
    UserBlock.countDocuments({
      blockedId: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }),
    // Get list of users who blocked this user
    UserBlock.find({ blockedId: userId })
      .populate('blockerId', 'email profile.displayName')
      .select('blockerId reason createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
  ]);

  // Calculate rejection rate
  const totalResponses = requestsAccepted + requestsDeclined;
  const rejectionRate = totalResponses > 0
    ? (requestsDeclined / totalResponses * 100).toFixed(1)
    : 0;

  // Determine risk indicators
  const riskIndicators = [];

  if (rejectionRate > 50) {
    riskIndicators.push({
      type: 'high_rejection_rate',
      message: `${rejectionRate}% of connection requests declined`,
      severity: rejectionRate > 75 ? 'high' : 'medium'
    });
  }

  if (requestsSent > 50) {
    riskIndicators.push({
      type: 'high_request_volume',
      message: `${requestsSent} connection requests in 30 days`,
      severity: requestsSent > 100 ? 'high' : 'medium'
    });
  }

  if (blockedAfterConnecting > 3) {
    riskIndicators.push({
      type: 'blocked_frequently',
      message: `Blocked by ${blockedAfterConnecting} users recently`,
      severity: blockedAfterConnecting > 10 ? 'high' : 'medium'
    });
  }

  return {
    period: '30 days',
    requests: {
      sent: requestsSent,
      accepted: requestsAccepted,
      declined: requestsDeclined,
      rejectionRate: parseFloat(rejectionRate)
    },
    blockedBy: {
      count: blockedAfterConnecting,
      users: whoBlockedUser.map(b => ({
        user: b.blockerId,
        reason: b.reason,
        blockedAt: b.createdAt
      }))
    },
    riskIndicators,
    riskLevel: riskIndicators.some(r => r.severity === 'high') ? 'high'
      : riskIndicators.length > 0 ? 'medium' : 'low'
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  getSocialDashboardStats,
  getUserSocialMetrics,
  getConnectionPatterns
};
