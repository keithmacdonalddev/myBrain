/**
 * =============================================================================
 * DASHBOARDSERVICE.JS - Intelligent Dashboard Data Aggregation
 * =============================================================================
 *
 * This service provides all data needed for the intelligent dashboard in a
 * single optimized query. It aggregates tasks, events, projects, messages,
 * notifications, and usage statistics.
 *
 * THE INTELLIGENT DASHBOARD:
 * --------------------------
 * The dashboard uses a priority scoring system with 5 weighted factors:
 * 1. URGENCY - Time-sensitive items (overdue tasks, upcoming events)
 * 2. ATTENTION - Items needing human response (unread messages, notifications)
 * 3. RECENCY - Recently created/modified items
 * 4. FEATURE USAGE - User's most-used features get priority
 * 5. CONTEXT - Time of day, day of week, user patterns
 *
 * WHY A SINGLE ENDPOINT?
 * ----------------------
 * - Reduces API calls from 10+ to 1
 * - Server-side data aggregation is faster
 * - Enables intelligent priority calculations
 * - Supports caching and prefetching
 *
 * =============================================================================
 */

import Task from '../models/Task.js';
import Note from '../models/Note.js';
import Event from '../models/Event.js';
import Project from '../models/Project.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import ItemShare from '../models/ItemShare.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { getUsageProfile } from './usageService.js';

// =============================================================================
// MAIN DASHBOARD DATA AGGREGATION
// =============================================================================

/**
 * getDashboardData(userId, options)
 * ---------------------------------
 * Aggregates all data needed for the intelligent dashboard.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {Object} options - Query options
 * @param {string} options.timezone - User's timezone (default: 'UTC')
 *
 * @returns {Object} Complete dashboard data
 */
export async function getDashboardData(userId, options = {}) {
  const { timezone = 'UTC' } = options;

  // Get current date boundaries
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Execute all queries in parallel for performance
  const [
    urgentItems,
    attentionItems,
    recentItems,
    usageProfile,
    todayEvents,
    tomorrowEvents,
    priorityTasks,
    activeProjects,
    unreadConversations,
    inboxNotes,
    notifications,
    sharedItems,
    recentActivity,
    stats,
    userPreferences
  ] = await Promise.all([
    getUrgentItems(userId, now, todayEnd),
    getAttentionItems(userId),
    getRecentItems(userId),
    getUsageProfile(userId, 30),
    getTodayEvents(userId, todayStart, todayEnd),
    getTomorrowEvents(userId, tomorrowStart, tomorrowEnd),
    getPriorityTasks(userId),
    getActiveProjects(userId),
    getUnreadConversations(userId),
    getInboxNotes(userId),
    getUnreadNotifications(userId),
    getPendingShares(userId),
    getRecentActivity(userId),
    getCompletionStats(userId, todayStart, weekEnd),
    getUserDashboardPreferences(userId)
  ]);

  // Update last visit timestamp
  await User.findByIdAndUpdate(userId, {
    'preferences.dashboard.lastVisit': now
  });

  return {
    // Core dashboard data
    urgentItems,
    attentionItems,
    recentItems,
    usageProfile,

    // Grouped by feature
    events: {
      today: todayEvents,
      tomorrow: tomorrowEvents
    },
    tasks: priorityTasks,
    projects: activeProjects,
    messages: unreadConversations,
    inbox: inboxNotes,
    notifications,
    sharedItems,
    activity: recentActivity,

    // Stats and metadata
    stats,
    preferences: userPreferences,
    timestamp: now.toISOString()
  };
}

// =============================================================================
// URGENT ITEMS - Time-sensitive items that need immediate attention
// =============================================================================

async function getUrgentItems(userId, now, todayEnd) {
  // Get overdue tasks (due date passed, not completed)
  const overdueTasks = await Task.find({
    userId,
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] },
    dueDate: { $lt: now }
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  // Get tasks due today
  const dueTodayTasks = await Task.find({
    userId,
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] },
    dueDate: {
      $gte: now,
      $lte: todayEnd
    }
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  // Get events happening in the next hour
  const oneHourFromNow = new Date(now);
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

  const upcomingEvents = await Event.find({
    userId,
    status: { $ne: 'cancelled' },
    startDate: {
      $gte: now,
      $lte: oneHourFromNow
    }
  })
    .sort({ startDate: 1 })
    .limit(5)
    .lean();

  return {
    overdueTasks: overdueTasks.map(t => ({
      ...t,
      itemType: 'task',
      urgencyReason: 'overdue'
    })),
    dueTodayTasks: dueTodayTasks.map(t => ({
      ...t,
      itemType: 'task',
      urgencyReason: 'dueToday'
    })),
    upcomingEvents: upcomingEvents.map(e => ({
      ...e,
      itemType: 'event',
      urgencyReason: 'startingSoon'
    })),
    counts: {
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      upcoming: upcomingEvents.length
    }
  };
}

// =============================================================================
// ATTENTION ITEMS - Items needing human response
// =============================================================================

async function getAttentionItems(userId) {
  // Get unread message count
  const unreadMessagesCount = await Conversation.countDocuments({
    participants: userId,
    [`unreadCounts.${userId}`]: { $gt: 0 }
  });

  // Get pending share invites
  const pendingSharesCount = await ItemShare.countDocuments({
    targetUserId: userId,
    status: 'pending'
  });

  // Get unread notifications count
  const unreadNotificationsCount = await Notification.countDocuments({
    userId,
    read: false
  });

  return {
    unreadMessages: unreadMessagesCount,
    pendingShares: pendingSharesCount,
    unreadNotifications: unreadNotificationsCount,
    total: unreadMessagesCount + pendingSharesCount + unreadNotificationsCount
  };
}

// =============================================================================
// RECENT ITEMS - Recently created or modified items
// =============================================================================

async function getRecentItems(userId) {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Get recently created notes
  const recentNotes = await Note.find({
    userId,
    status: 'active',
    createdAt: { $gte: oneDayAgo }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title body createdAt updatedAt tags')
    .lean();

  // Get recently created tasks
  const recentTasks = await Task.find({
    userId,
    status: { $nin: ['archived', 'trashed'] },
    createdAt: { $gte: oneDayAgo }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title status priority dueDate createdAt')
    .lean();

  // Get recently modified projects
  const recentProjects = await Project.find({
    userId,
    status: { $nin: ['archived', 'trashed'] },
    updatedAt: { $gte: oneDayAgo }
  })
    .sort({ updatedAt: -1 })
    .limit(3)
    .select('title status progress deadline updatedAt')
    .lean();

  return {
    notes: recentNotes.map(n => ({ ...n, itemType: 'note' })),
    tasks: recentTasks.map(t => ({ ...t, itemType: 'task' })),
    projects: recentProjects.map(p => ({ ...p, itemType: 'project' }))
  };
}

// =============================================================================
// EVENTS - Today's and tomorrow's events
// =============================================================================

async function getTodayEvents(userId, todayStart, todayEnd) {
  const events = await Event.find({
    userId,
    status: { $ne: 'cancelled' },
    $or: [
      // Events that start today
      { startDate: { $gte: todayStart, $lte: todayEnd } },
      // All-day events today
      { allDay: true, startDate: { $lte: todayEnd }, endDate: { $gte: todayStart } }
    ]
  })
    .sort({ startDate: 1 })
    .limit(10)
    .lean();

  return events;
}

async function getTomorrowEvents(userId, tomorrowStart, tomorrowEnd) {
  const events = await Event.find({
    userId,
    status: { $ne: 'cancelled' },
    $or: [
      { startDate: { $gte: tomorrowStart, $lte: tomorrowEnd } },
      { allDay: true, startDate: { $lte: tomorrowEnd }, endDate: { $gte: tomorrowStart } }
    ]
  })
    .sort({ startDate: 1 })
    .limit(5)
    .lean();

  return events;
}

// =============================================================================
// PRIORITY TASKS - High-priority and due-soon tasks
// =============================================================================

async function getPriorityTasks(userId) {
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const tasks = await Task.find({
    userId,
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] },
    $or: [
      { priority: { $in: ['high', 'urgent'] } },
      { dueDate: { $lte: oneWeekFromNow } }
    ]
  })
    .sort({ priority: -1, dueDate: 1 })
    .limit(10)
    .lean();

  return tasks;
}

// =============================================================================
// ACTIVE PROJECTS - Projects the user is working on
// =============================================================================

async function getActiveProjects(userId) {
  const projects = await Project.find({
    userId,
    status: 'active'
  })
    .sort({ updatedAt: -1 })
    .limit(6)
    .select('title description status progress deadline color lifeAreaId linkedTaskIds')
    .populate('lifeAreaId', 'name color icon')
    .lean();

  // Add task completion counts
  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      if (!project.linkedTaskIds?.length) {
        return { ...project, taskCounts: { total: 0, completed: 0 } };
      }

      const completedCount = await Task.countDocuments({
        _id: { $in: project.linkedTaskIds },
        status: 'done'
      });

      return {
        ...project,
        taskCounts: {
          total: project.linkedTaskIds.length,
          completed: completedCount
        }
      };
    })
  );

  return projectsWithCounts;
}

// =============================================================================
// MESSAGES - Unread conversations
// =============================================================================

async function getUnreadConversations(userId) {
  const conversations = await Conversation.find({
    participants: userId,
    [`unreadCounts.${userId}`]: { $gt: 0 }
  })
    .sort({ lastMessageAt: -1 })
    .limit(5)
    .populate('participants', 'name avatar')
    .lean();

  return conversations.map(conv => ({
    ...conv,
    unreadCount: conv.unreadCounts?.get?.(userId.toString()) || conv.unreadCounts?.[userId] || 0
  }));
}

// =============================================================================
// INBOX - Unprocessed notes
// =============================================================================

async function getInboxNotes(userId) {
  const notes = await Note.find({
    userId,
    processed: false,
    status: 'active'
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('title body createdAt tags')
    .lean();

  return notes;
}

// =============================================================================
// NOTIFICATIONS - Unread notifications
// =============================================================================

async function getUnreadNotifications(userId) {
  const notifications = await Notification.find({
    userId,
    read: false
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return notifications;
}

// =============================================================================
// SHARED ITEMS - Pending share invites
// =============================================================================

async function getPendingShares(userId) {
  const shares = await ItemShare.find({
    targetUserId: userId,
    status: 'pending'
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('sourceUserId', 'name avatar')
    .lean();

  return shares;
}

// =============================================================================
// RECENT ACTIVITY - Activity feed
// =============================================================================

async function getRecentActivity(userId) {
  const activity = await Activity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return activity;
}

// =============================================================================
// COMPLETION STATS - Task and project completion statistics
// =============================================================================

async function getCompletionStats(userId, todayStart, weekEnd) {
  const now = new Date();

  // Today's completed tasks
  const todayCompleted = await Task.countDocuments({
    userId,
    status: 'done',
    completedAt: { $gte: todayStart }
  });

  // This week's completed tasks
  const weekCompleted = await Task.countDocuments({
    userId,
    status: 'done',
    completedAt: { $gte: todayStart, $lte: weekEnd }
  });

  // Total active tasks
  const totalActive = await Task.countDocuments({
    userId,
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] }
  });

  // Overdue count
  const overdueCount = await Task.countDocuments({
    userId,
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] },
    dueDate: { $lt: now }
  });

  // Projects in progress
  const activeProjects = await Project.countDocuments({
    userId,
    status: 'active'
  });

  // Projects completed this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const projectsCompleted = await Project.countDocuments({
    userId,
    status: 'completed',
    completedAt: { $gte: monthStart }
  });

  return {
    tasks: {
      completedToday: todayCompleted,
      completedThisWeek: weekCompleted,
      totalActive,
      overdue: overdueCount
    },
    projects: {
      active: activeProjects,
      completedThisMonth: projectsCompleted
    }
  };
}

// =============================================================================
// USER PREFERENCES - Dashboard preferences
// =============================================================================

async function getUserDashboardPreferences(userId) {
  const user = await User.findById(userId)
    .select('preferences.dashboard')
    .lean();

  return user?.preferences?.dashboard || {
    pinnedWidgets: [],
    hiddenWidgets: [],
    widgetSettings: {},
    lastVisit: null
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  getDashboardData
};
