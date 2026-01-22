/**
 * =============================================================================
 * ADMINSOCIALSERVICE.JS - Admin Social Monitoring & Analytics
 * =============================================================================
 *
 * This service provides aggregated statistics and insights for the admin
 * social monitoring dashboard. It tracks user connections, messaging activity,
 * sharing, blocking, and reports to give admins visibility into social health.
 *
 * PURPOSE:
 * --------
 * Admins need to understand what's happening in the social layer:
 * 1. Connection Health: Are users connecting? Building relationships?
 * 2. Messaging Activity: Is the messaging feature being used?
 * 3. Sharing Behavior: How much content is being shared?
 * 4. Safety Issues: Are users blocking others? Are reports being filed?
 * 5. Abuse Trends: Detect patterns of harassment or spam
 *
 * ADMIN-ONLY:
 * -----------
 * All functions in this service are admin-only and should be protected
 * by requireAdmin middleware at the route level.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Connection model - Tracks friend/follow relationships between users.
 * We analyze connections to understand network growth and relationship patterns.
 */
import Connection from '../models/Connection.js';

/**
 * Message model - Individual messages sent between users.
 * We track message volume and trends to gauge messaging feature usage.
 */
import Message from '../models/Message.js';

/**
 * Conversation model - Threads/conversations containing messages.
 * We count active conversations to show engagement in direct messaging.
 */
import Conversation from '../models/Conversation.js';

/**
 * Report model - User reports of harassment, spam, or violations.
 * We analyze reports to identify problematic users or patterns of abuse.
 */
import Report from '../models/Report.js';

/**
 * ItemShare model - Records of content shared between users.
 * We track sharing activity to understand feature usage and collaboration.
 */
import ItemShare from '../models/ItemShare.js';

/**
 * UserBlock model - Records of users blocking other users.
 * We monitor blocks to identify safety issues and potential harassment.
 */
import UserBlock from '../models/UserBlock.js';

/**
 * User model - User documents needed to populate admin dashboard data.
 * We fetch top users and other user details for admin visualization.
 */
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
 * ======================================
 * Aggregates connection statistics for a date range.
 *
 * BUSINESS LOGIC:
 * Connection stats help admins understand network growth:
 * - Total accepted connections show overall network size
 * - New connections in period show growth rate
 * - Pending requests show engagement level
 * - By status breakdown shows health of connection pipeline
 *
 * @param {Date} startDate - Period start (inclusive)
 * @param {Date} endDate - Period end (inclusive)
 *
 * @returns {Promise<Object>} Connection statistics:
 *   - total: All accepted connections
 *   - new: Connections accepted in the period
 *   - pending: Awaiting response
 *   - byStatus: Breakdown by each status
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getConnectionStats(startDate, endDate) {
  // =====================================================
  // GATHER STATISTICS IN PARALLEL
  // =====================================================
  const [
    total,
    newConnections,
    pendingRequests,
    statusCounts
  ] = await Promise.all([
    // Total accepted connections (all time)
    Connection.countDocuments({ status: 'accepted' }),

    // New connections in the period
    Connection.countDocuments({
      status: 'accepted',
      acceptedAt: { $gte: startDate, $lte: endDate }
    }),

    // Pending connections awaiting response
    Connection.countDocuments({ status: 'pending' }),

    // Breakdown of all statuses (accepted, pending, declined, etc.)
    Connection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // =====================================================
  // TRANSFORM TO USABLE FORMAT
  // =====================================================
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
 * ==========================
 * Generates daily connection trends over specified number of days.
 *
 * BUSINESS LOGIC:
 * Shows day-by-day connection creation to visualize network growth trends.
 * We fill in zeros for days with no activity so admins see the full timeline.
 *
 * @param {number} days - Number of past days to include
 *
 * @returns {Promise<Array>} Daily trend data:
 *   Each item: { date: 'YYYY-MM-DD', count: new connections that day }
 *   Includes zero-count days for complete timeline visualization
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getConnectionTrends(days) {
  // =====================================================
  // CALCULATE DATE RANGE
  // =====================================================
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);  // Start at beginning of day

  // =====================================================
  // AGGREGATE NEW CONNECTIONS BY DAY
  // =====================================================
  const trends = await Connection.aggregate([
    {
      $match: {
        status: 'accepted',
        acceptedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        // Group by date, extract from acceptedAt timestamp
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$acceptedAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }  // Sort by date ascending
  ]);

  // =====================================================
  // FILL IN MISSING DAYS WITH ZERO
  // =====================================================
  // This creates a continuous timeline even if some days had no connections
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Find if there were connections this day
    const found = trends.find(t => t._id === dateStr);

    result.push({
      date: dateStr,
      count: found ? found.count : 0  // Zero if no data
    });
  }

  return result;
}

// =============================================================================
// MESSAGE STATISTICS
// =============================================================================

/**
 * getMessageStats(startDate, endDate)
 * ====================================
 * Aggregates messaging statistics for a date range.
 *
 * BUSINESS LOGIC:
 * Message stats show engagement and usage of the messaging feature:
 * - Total messages show volume and scale
 * - New messages in period show activity level
 * - Active conversations show engagement (conversations with recent messages)
 * - Total conversations show total threads ever created
 *
 * @param {Date} startDate - Period start (inclusive)
 * @param {Date} endDate - Period end (inclusive)
 *
 * @returns {Promise<Object>} Messaging statistics:
 *   - totalMessages: All non-deleted messages
 *   - newMessages: Messages created in period
 *   - activeConversations: Conversations with messages in period
 *   - totalConversations: All conversations ever created
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getMessageStats(startDate, endDate) {
  // =====================================================
  // GATHER MESSAGE STATISTICS IN PARALLEL
  // =====================================================
  const [
    totalMessages,
    newMessages,
    activeConversations,
    totalConversations
  ] = await Promise.all([
    // Total messages (all time, excluding deleted)
    Message.countDocuments({ isDeleted: { $ne: true } }),

    // New messages in the period
    Message.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    }),

    // Conversations with activity in the period
    // (lastMessageAt in period = recently active conversations)
    Conversation.countDocuments({
      lastMessageAt: { $gte: startDate }
    }),

    // Total conversations created (all time)
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
 * ======================
 * Generates daily message volume trends over specified number of days.
 *
 * BUSINESS LOGIC:
 * Shows messaging activity by day. Helps admins visualize messaging feature
 * usage patterns and detect anomalies (e.g., sudden spikes could indicate
 * coordinated spam or abuse). Includes zero-count days for complete timeline.
 *
 * @param {number} days - Number of past days to include
 *
 * @returns {Promise<Array>} Daily trend data:
 *   Each item: { date: 'YYYY-MM-DD', count: messages sent that day }
 *   Includes zero-count days for complete timeline visualization
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getMessageTrends(days) {
  // =====================================================
  // CALCULATE DATE RANGE
  // =====================================================
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);  // Start at beginning of day

  // =====================================================
  // AGGREGATE MESSAGE COUNT BY DAY
  // =====================================================
  const trends = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true }  // Exclude deleted messages
      }
    },
    {
      $group: {
        // Group by date, extract from createdAt timestamp
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }  // Sort by date ascending
  ]);

  // =====================================================
  // FILL IN MISSING DAYS WITH ZERO
  // =====================================================
  // Creates continuous timeline even if some days had no messages
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Find if there were messages this day
    const found = trends.find(t => t._id === dateStr);

    result.push({
      date: dateStr,
      count: found ? found.count : 0  // Zero if no messages
    });
  }

  return result;
}

// =============================================================================
// REPORT STATISTICS
// =============================================================================

/**
 * getReportStats()
 * =================
 * Aggregates user report statistics for moderation overview.
 *
 * BUSINESS LOGIC:
 * Reports are user complaints about policy violations. Tracking reports helps
 * admins understand abuse patterns:
 * - High report volume = active abuse
 * - High priority reports = serious violations
 * - Patterns by reason = identify systematic problems
 * The pending count shows admin workload.
 *
 * @returns {Promise<Object>} Report statistics:
 *   - pending: Count of unreviewed reports
 *   - reviewing: Count of reports being reviewed
 *   - resolved: Count of reports that were acted on
 *   - dismissed: Count of reports that were unfounded
 *   - total: Sum of all reports
 *   - pendingByPriority: Breakdown of pending reports by priority
 *   - pendingByReason: Breakdown of pending reports by violation reason
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getReportStats() {
  // =====================================================
  // GATHER REPORT STATISTICS IN PARALLEL
  // =====================================================
  const [statusCounts, priorityCounts, reasonCounts] = await Promise.all([
    // Count reports by status (pending, reviewing, resolved, dismissed)
    Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    // Priority breakdown for pending reports (high priority needs faster action)
    Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),

    // Reason breakdown for pending reports (identify patterns of abuse)
    Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ])
  ]);

  // =====================================================
  // TRANSFORM TO USABLE FORMAT
  // =====================================================
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
    pending: byStatus.pending || 0,     // Unreviewed - admin action needed
    reviewing: byStatus.reviewing || 0, // Being investigated
    resolved: byStatus.resolved || 0,   // Action taken
    dismissed: byStatus.dismissed || 0, // Not a violation
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    pendingByPriority: byPriority,      // Which priority violations are pending
    pendingByReason: byReason           // What types of violations are reported
  };
}

// =============================================================================
// SHARE STATISTICS
// =============================================================================

/**
 * getShareStats(startDate, endDate)
 * ==================================
 * Aggregates item sharing statistics for a date range.
 *
 * BUSINESS LOGIC:
 * Sharing data shows collaboration and feature usage:
 * - Total shares = overall feature usage scale
 * - New shares = collaboration activity in period
 * - Active shares = how many shared items are currently accessible
 * - By type = which content types users share most
 *
 * @param {Date} startDate - Period start (inclusive)
 * @param {Date} endDate - Period end (inclusive)
 *
 * @returns {Promise<Object>} Sharing statistics:
 *   - total: All shares created (all time)
 *   - new: Shares created in the period
 *   - active: Currently active shares (not revoked)
 *   - byType: Breakdown by content type (notes, tasks, projects, etc.)
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getShareStats(startDate, endDate) {
  // =====================================================
  // GATHER SHARING STATISTICS IN PARALLEL
  // =====================================================
  const [total, newShares, activeShares, byType] = await Promise.all([
    // Total shares created (all time)
    ItemShare.countDocuments({}),

    // New shares created in the period
    ItemShare.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),

    // Currently active shares (not revoked/deleted)
    ItemShare.countDocuments({ status: 'active' }),

    // Shares grouped by item type (which content types are shared most)
    ItemShare.aggregate([
      {
        $group: {
          _id: '$itemType',  // 'note', 'task', 'project', etc.
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // =====================================================
  // TRANSFORM TO USABLE FORMAT
  // =====================================================
  const typeStats = {};
  byType.forEach(t => {
    typeStats[t._id] = t.count;
  });

  return {
    total,
    new: newShares,
    active: activeShares,
    byType: typeStats  // e.g., { note: 500, task: 300, project: 150 }
  };
}

// =============================================================================
// BLOCK STATISTICS
// =============================================================================

/**
 * getBlockStats(startDate, endDate)
 * ==================================
 * Aggregates user blocking statistics for a date range.
 *
 * BUSINESS LOGIC:
 * Blocking is a safety mechanism. High block counts indicate:
 * - User safety concerns (people blocking abusers)
 * - Potential harassment (if certain users get blocked frequently)
 * - Reasons show patterns (spam, harassment, inappropriate content, etc.)
 *
 * @param {Date} startDate - Period start (inclusive)
 * @param {Date} endDate - Period end (inclusive)
 *
 * @returns {Promise<Object>} Blocking statistics:
 *   - total: Total blocks created (all time)
 *   - new: Blocks created in the period
 *   - byReason: Breakdown of blocks by stated reason
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getBlockStats(startDate, endDate) {
  // =====================================================
  // GATHER BLOCKING STATISTICS IN PARALLEL
  // =====================================================
  const [total, newBlocks, byReason] = await Promise.all([
    // Total blocks ever created (all time)
    UserBlock.countDocuments({}),

    // New blocks created in the period
    UserBlock.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),

    // Breakdown of blocks by reason given
    UserBlock.aggregate([
      {
        $group: {
          _id: '$reason',  // Reason provided for the block
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // =====================================================
  // TRANSFORM TO USABLE FORMAT
  // =====================================================
  const reasonStats = {};
  byReason.forEach(r => {
    reasonStats[r._id || 'other'] = r.count;  // Handle null reasons
  });

  return {
    total,              // Total blocks ever
    new: newBlocks,     // New blocks this period
    byReason: reasonStats  // e.g., { 'spam': 50, 'harassment': 30, 'other': 10 }
  };
}

// =============================================================================
// TOP ACTIVE USERS
// =============================================================================

/**
 * getTopActiveUsers(limit)
 * =========================
 * Identifies users with highest social activity (messaging) in recent period.
 *
 * BUSINESS LOGIC:
 * Top active users in messaging shows:
 * - Who's most engaged with social features
 * - Potential power users / community leaders
 * - Potential spam accounts (if combined with other metrics)
 * Uses 7-day window to show recent activity, not all-time.
 *
 * @param {number} limit - Max users to return (default: 10)
 *
 * @returns {Promise<Array>} Top users by message count:
 *   Each item: { user: {...}, messageCount: number }
 *   Sorted by messageCount descending
 *
 * @private - Internal function for getSocialDashboardStats
 */
async function getTopActiveUsers(limit = 10) {
  // =====================================================
  // GET USERS WITH MOST MESSAGES IN LAST 7 DAYS
  // =====================================================
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Aggregate messages by sender for recent period
  const topMessagers = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo },
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$senderId',  // Group by who sent messages
        messageCount: { $sum: 1 }
      }
    },
    { $sort: { messageCount: -1 } },  // Most messages first
    { $limit: limit }                 // Top N users
  ]);

  // =====================================================
  // POPULATE USER DETAILS
  // =====================================================
  // Get user profile information for the top messagers
  const userIds = topMessagers.map(u => u._id);
  const users = await User.find(
    { _id: { $in: userIds } },
    'email profile.displayName profile.avatarUrl'
  ).lean();

  // Create lookup map for efficient searching
  const userMap = {};
  users.forEach(u => {
    userMap[u._id.toString()] = u;
  });

  // =====================================================
  // RETURN FORMATTED RESULTS
  // =====================================================
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
 * Retrieves comprehensive social engagement metrics for a specific user.
 * Shows complete picture of user's social behavior for admin review.
 *
 * BUSINESS LOGIC:
 * This function aggregates all social-related metrics for one user to help
 * admins understand their engagement level and identify problematic patterns:
 * - Connections show social integration
 * - Blocks sent/received show conflict signals
 * - Messaging shows engagement
 * - Sharing shows collaboration
 * - Reports show if community flagged them for violations
 *
 * @param {ObjectId} userId - The user to get metrics for
 *
 * @returns {Promise<Object>} Social metrics object:
 *   - connections: { total, pendingSent, pendingReceived }
 *   - blocking: { blockedByUser, blockedByOthers }
 *   - messaging: { messagesSent, conversationCount }
 *   - sharing: { sharesSent, sharesReceived }
 *   - reports: { against: reports filed about user, submitted: reports filed by user }
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const metrics = await getUserSocialMetrics('user789');
 * // Assess user's social health
 * if (metrics.blocking.blockedByOthers > 5) {
 *   // Red flag: many users have blocked this person
 * }
 * if (metrics.reports.against > 3) {
 *   // Red flag: community reported this user multiple times
 * }
 * ```
 */
export async function getUserSocialMetrics(userId) {
  // =====================================================
  // GATHER ALL SOCIAL METRICS IN PARALLEL
  // =====================================================
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
    // =====================================================
    // CONNECTION METRICS
    // =====================================================
    // Accepted connections (user is either requester or receiverId)
    Connection.countDocuments({
      $or: [{ requesterId: userId }, { receiverId: userId }],
      status: 'accepted'
    }),
    // Pending requests sent by user
    Connection.countDocuments({ requesterId: userId, status: 'pending' }),
    // Pending requests received by user
    Connection.countDocuments({ receiverId: userId, status: 'pending' }),

    // =====================================================
    // BLOCKING METRICS
    // =====================================================
    // Users this person has blocked
    UserBlock.countDocuments({ blockerId: userId }),
    // Users who have blocked this person (RISK SIGNAL)
    UserBlock.countDocuments({ blockedId: userId }),

    // =====================================================
    // MESSAGING METRICS
    // =====================================================
    // Messages sent by user (not deleted)
    Message.countDocuments({ senderId: userId, isDeleted: { $ne: true } }),
    // Conversations this user participates in
    Conversation.countDocuments({
      'participants.userId': userId
    }),

    // =====================================================
    // SHARING METRICS
    // =====================================================
    // Items this user has shared with others
    ItemShare.countDocuments({ ownerId: userId }),
    // Items others have shared with this user
    ItemShare.countDocuments({ 'sharedWith.userId': userId }),

    // =====================================================
    // REPORT METRICS
    // =====================================================
    // Reports filed against this user (community flagged them)
    Report.countDocuments({ reportedUserId: userId }),
    // Reports filed by this user (complaints they submitted)
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
      blockedByOthers  // HIGH VALUE = RISK SIGNAL
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
      against: reportsAgainst,  // Community reported this user
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
 * Analyzes connection patterns for a user to detect spam/abuse behavior.
 * Identifies suspicious patterns in how user makes connections.
 *
 * BUSINESS LOGIC:
 * Connection patterns reveal behavior:
 * - High rejection rate = people don't want to connect with this user (red flag)
 * - High request volume = potential spam/mass-adding (red flag)
 * - High blocked frequency = people blocking after connecting (red flag for harasser)
 * This function calculates risk indicators based on these patterns.
 *
 * @param {ObjectId} userId - The user to analyze
 *
 * @returns {Promise<Object>} Connection pattern analysis:
 *   - period: Time period analyzed ('30 days')
 *   - requests: {
 *       sent: Total requests in period
 *       accepted: How many were accepted
 *       declined: How many were declined/rejected
 *       rejectionRate: Percentage of sent requests that were declined
 *     }
 *   - blockedBy: {
 *       count: Users who blocked this user after connecting
 *       users: List of users who blocked them (top 10)
 *     }
 *   - riskIndicators: Array of identified risk patterns
 *   - riskLevel: 'low', 'medium', or 'high'
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const patterns = await getConnectionPatterns('user123');
 *
 * // Assess risk level
 * if (patterns.riskLevel === 'high') {
 *   // Consider suspension or warning
 * }
 *
 * // Check specific metrics
 * if (patterns.requests.rejectionRate > 70) {
 *   // Most people decline connections from this user
 * }
 * ```
 *
 * RISK INDICATORS:
 * - rejectionRate > 50%: Red flag - people don't want to connect
 * - requestsSent > 50: Potential spamming
 * - blockedAfterConnecting > 3: Potential harasser
 */
export async function getConnectionPatterns(userId) {
  // =====================================================
  // CALCULATE TIME RANGE (LAST 30 DAYS)
  // =====================================================
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // =====================================================
  // GATHER CONNECTION PATTERN DATA IN PARALLEL
  // =====================================================
  const [
    requestsSent,
    requestsAccepted,
    requestsDeclined,
    blockedAfterConnecting,
    whoBlockedUser
  ] = await Promise.all([
    // Total requests sent by user in last 30 days
    Connection.countDocuments({
      requesterId: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }),

    // Requests that were accepted (positive response)
    Connection.countDocuments({
      requesterId: userId,
      status: 'accepted',
      createdAt: { $gte: thirtyDaysAgo }
    }),

    // Requests that were declined (negative response)
    Connection.countDocuments({
      requesterId: userId,
      status: 'declined',
      createdAt: { $gte: thirtyDaysAgo }
    }),

    // Users who blocked this user recently (after or during interactions)
    UserBlock.countDocuments({
      blockedId: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }),

    // Get list of who blocked this user for context
    UserBlock.find({ blockedId: userId })
      .populate('blockerId', 'email profile.displayName')
      .select('blockerId reason createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
  ]);

  // =====================================================
  // CALCULATE REJECTION RATE
  // =====================================================
  // Shows what percentage of connection attempts are rejected
  const totalResponses = requestsAccepted + requestsDeclined;
  const rejectionRate = totalResponses > 0
    ? (requestsDeclined / totalResponses * 100).toFixed(1)
    : 0;

  // =====================================================
  // IDENTIFY RISK INDICATORS
  // =====================================================
  // Build list of concerning patterns detected
  const riskIndicators = [];

  // HIGH REJECTION RATE: Most people don't want to connect with this user
  if (rejectionRate > 50) {
    riskIndicators.push({
      type: 'high_rejection_rate',
      message: `${rejectionRate}% of connection requests declined`,
      severity: rejectionRate > 75 ? 'high' : 'medium'
    });
  }

  // HIGH REQUEST VOLUME: Potential spamming or mass-adding behavior
  if (requestsSent > 50) {
    riskIndicators.push({
      type: 'high_request_volume',
      message: `${requestsSent} connection requests in 30 days`,
      severity: requestsSent > 100 ? 'high' : 'medium'
    });
  }

  // FREQUENTLY BLOCKED: People block this user after connecting (harasser signal)
  if (blockedAfterConnecting > 3) {
    riskIndicators.push({
      type: 'blocked_frequently',
      message: `Blocked by ${blockedAfterConnecting} users recently`,
      severity: blockedAfterConnecting > 10 ? 'high' : 'medium'
    });
  }

  // =====================================================
  // DETERMINE OVERALL RISK LEVEL
  // =====================================================
  // Aggregate risk indicators into single risk score
  const riskLevel = riskIndicators.some(r => r.severity === 'high') ? 'high'
    : riskIndicators.length > 0 ? 'medium' : 'low';

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
    riskIndicators,  // Array of specific concerning patterns
    riskLevel        // 'low', 'medium', or 'high'
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
