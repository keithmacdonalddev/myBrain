/**
 * =============================================================================
 * ADMINCONTENTSERVICE.JS - Admin Content Viewing Service
 * =============================================================================
 *
 * This service provides functions for administrators to view and moderate
 * user content. It's designed for the admin panel to investigate user accounts,
 * review content for policy violations, and handle support requests.
 *
 * PURPOSE OF THIS SERVICE:
 * ------------------------
 * Administrators sometimes need to view user content for legitimate reasons:
 * 1. CONTENT MODERATION: Review flagged content for policy violations
 * 2. SUPPORT REQUESTS: Help users with issues in their account
 * 3. ABUSE INVESTIGATION: Investigate reported harassment or spam
 * 4. LEGAL COMPLIANCE: Respond to valid legal requests
 *
 * PRIVACY CONSIDERATIONS:
 * -----------------------
 * All admin access should be:
 * - LOGGED: Every admin action is recorded in audit logs
 * - JUSTIFIED: Access requires a legitimate reason
 * - LIMITED: Only view what's necessary
 * - SECURE: Admin access requires additional authentication
 *
 * CONTENT TYPES VIEWABLE:
 * ----------------------
 * - Notes: User's notes and documents
 * - Tasks: User's tasks and to-do items
 * - Projects: User's projects and linked items
 * - Images: User's uploaded images
 * - Activity: User's activity timeline from logs
 * - Social: Connections, blocks, messages, shares
 *
 * DATA MINIMIZATION:
 * ------------------
 * Functions return only necessary data fields and provide content previews
 * (first 200 characters) rather than full content when possible.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose for ObjectId type conversion.
 * Some queries need ObjectId instead of string for proper matching.
 */
import mongoose from 'mongoose';

/**
 * Content models - represent user-created content in the database.
 */
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Image from '../models/Image.js';

/**
 * Log model - stores all API request logs for activity tracking.
 */
import Log from '../models/Log.js';

/**
 * User model - for verifying user exists.
 */
import User from '../models/User.js';

/**
 * Social models - represent relationships between users.
 */
import Connection from '../models/Connection.js';     // Friend/follow relationships
import UserBlock from '../models/UserBlock.js';       // Blocked users
import Message from '../models/Message.js';           // Direct messages
import Conversation from '../models/Conversation.js'; // Message threads
import ItemShare from '../models/ItemShare.js';       // Shared content

// =============================================================================
// CONTENT COUNTS
// =============================================================================

/**
 * getUserContentCounts(userId)
 * ----------------------------
 * Get summary counts of all content types for a user.
 * Useful for admin dashboard overview.
 *
 * @param {string} userId - User ID to get counts for
 *
 * @returns {Promise<Object>} Content counts:
 *   - notes: Number of notes
 *   - tasks: Number of tasks
 *   - projects: Number of projects
 *   - images: Number of images
 *   - total: Sum of all counts
 *
 * USE CASE:
 * Admin viewing a user's profile sees:
 * "This user has 150 notes, 75 tasks, 5 projects, 20 images"
 *
 * EXAMPLE:
 * ```javascript
 * const counts = await getUserContentCounts('user123');
 * // { notes: 150, tasks: 75, projects: 5, images: 20, total: 250 }
 * ```
 */
export async function getUserContentCounts(userId) {
  // Query all content types in parallel for speed
  const [notesCount, tasksCount, projectsCount, imagesCount] = await Promise.all([
    Note.countDocuments({ userId }),
    Task.countDocuments({ userId }),
    Project.countDocuments({ userId }),
    Image.countDocuments({ userId })
  ]);

  return {
    notes: notesCount,
    tasks: tasksCount,
    projects: projectsCount,
    images: imagesCount,
    total: notesCount + tasksCount + projectsCount + imagesCount
  };
}

// =============================================================================
// NOTES VIEWING
// =============================================================================

/**
 * getUserNotes(userId, options)
 * -----------------------------
 * Get a user's notes with pagination.
 * Returns content previews, not full content (privacy consideration).
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Query options:
 *   @param {number} options.limit - Max notes to return (default: 20)
 *   @param {number} options.skip - Offset for pagination (default: 0)
 *   @param {string} options.status - Filter by status ('active', 'archived', etc.)
 *
 * @returns {Promise<Object>} Results:
 *   - notes: Array of note objects with previews
 *   - total: Total count for pagination
 *
 * NOTE: Returns first 200 characters of content as "contentPreview"
 * for privacy. Admin can request full content if needed with separate action.
 */
export async function getUserNotes(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  // Build query with optional status filter
  const query = { userId };
  if (status) {
    query.status = status;
  }

  // Query notes with limited fields (don't include full content)
  const notes = await Note.find(query)
    .sort({ updatedAt: -1 })  // Most recent first
    .skip(skip)
    .limit(limit)
    .select('title content status isPinned createdAt updatedAt tags');

  const total = await Note.countDocuments(query);

  // Transform to include content preview only
  return {
    notes: notes.map(n => ({
      _id: n._id,
      title: n.title,
      contentPreview: n.content?.substring(0, 200),  // First 200 chars only
      status: n.status,
      isPinned: n.isPinned,
      tags: n.tags,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    })),
    total
  };
}

// =============================================================================
// TASKS VIEWING
// =============================================================================

/**
 * getUserTasks(userId, options)
 * -----------------------------
 * Get a user's tasks with pagination.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip, status)
 *
 * @returns {Promise<Object>} Tasks with previews and total count
 */
export async function getUserTasks(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const tasks = await Task.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('title description status priority dueDate createdAt updatedAt tags');

  const total = await Task.countDocuments(query);

  return {
    tasks: tasks.map(t => ({
      _id: t._id,
      title: t.title,
      descriptionPreview: t.description?.substring(0, 200),  // Preview only
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      tags: t.tags,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    })),
    total
  };
}

// =============================================================================
// PROJECTS VIEWING
// =============================================================================

/**
 * getUserProjects(userId, options)
 * --------------------------------
 * Get a user's projects with pagination.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip, status)
 *
 * @returns {Promise<Object>} Projects with previews and total count
 */
export async function getUserProjects(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const projects = await Project.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('name description status priority startDate endDate createdAt updatedAt');

  const total = await Project.countDocuments(query);

  return {
    projects: projects.map(p => ({
      _id: p._id,
      name: p.name,
      descriptionPreview: p.description?.substring(0, 200),  // Preview only
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })),
    total
  };
}

// =============================================================================
// IMAGES VIEWING
// =============================================================================

/**
 * getUserImages(userId, options)
 * ------------------------------
 * Get a user's images with pagination.
 * Includes metadata but admin must use proper channels to view actual images.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip)
 *
 * @returns {Promise<Object>} Image metadata and total count
 */
export async function getUserImages(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  const query = { userId };

  const images = await Image.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('filename originalName mimeType size url thumbnailUrl alt createdAt');

  const total = await Image.countDocuments(query);

  return {
    images: images.map(i => ({
      _id: i._id,
      filename: i.filename,
      originalName: i.originalName,
      mimeType: i.mimeType,
      size: i.size,
      url: i.url,
      thumbnailUrl: i.thumbnailUrl,
      alt: i.alt,
      createdAt: i.createdAt
    })),
    total
  };
}

// =============================================================================
// ACTIVITY TIMELINE
// =============================================================================

/**
 * getUserActivityTimeline(userId, options)
 * ----------------------------------------
 * Get a user's activity history from API logs.
 * Groups activities by day for easy review.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Timeline options:
 *   @param {Date} options.from - Start date for the range
 *   @param {Date} options.to - End date for the range
 *   @param {number} options.limit - Max log entries (default: 50)
 *
 * @returns {Promise<Object>} Timeline data:
 *   - timeline: Array of { date, activities, count }
 *   - total: Total activities in result
 *
 * USE CASE:
 * Admin investigating suspicious account activity can see:
 * - What endpoints the user accessed
 * - When they were most active
 * - If there are unusual patterns
 *
 * EXAMPLE OUTPUT:
 * ```javascript
 * {
 *   timeline: [
 *     {
 *       date: '2024-01-15',
 *       activities: [
 *         { eventName: 'note_create', route: '/api/notes', ... },
 *         { eventName: 'task_update', route: '/api/tasks/123', ... }
 *       ],
 *       count: 2
 *     }
 *   ],
 *   total: 2
 * }
 * ```
 */
export async function getUserActivityTimeline(userId, options = {}) {
  const { from, to, limit = 50 } = options;

  // =====================================================
  // CONVERT USER ID
  // =====================================================
  // MongoDB queries need ObjectId, not string

  const userObjectId = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  // =====================================================
  // BUILD QUERY
  // =====================================================

  const query = { userId: userObjectId };

  // Optional date range filter
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  // =====================================================
  // FETCH LOGS
  // =====================================================

  const logs = await Log.find(query)
    .sort({ timestamp: -1 })  // Most recent first
    .limit(limit)
    .select('eventName route method statusCode timestamp durationMs userAgent');

  // =====================================================
  // GROUP BY DAY
  // =====================================================
  // Makes it easier to see daily patterns

  const grouped = {};
  logs.forEach(log => {
    // Extract date part (YYYY-MM-DD) from timestamp
    const day = log.timestamp.toISOString().split('T')[0];

    if (!grouped[day]) {
      grouped[day] = [];
    }

    grouped[day].push({
      _id: log._id,
      eventName: log.eventName,
      route: log.route,
      method: log.method,
      statusCode: log.statusCode,
      timestamp: log.timestamp,
      durationMs: log.durationMs
    });
  });

  // =====================================================
  // CONVERT TO ARRAY FORMAT
  // =====================================================

  const timeline = Object.entries(grouped).map(([date, activities]) => ({
    date,
    activities,
    count: activities.length
  }));

  return {
    timeline,
    total: logs.length
  };
}

// =============================================================================
// ACTIVITY STATISTICS
// =============================================================================

/**
 * getUserActivityStats(userId, options)
 * -------------------------------------
 * Get summary statistics of a user's activity over a time period.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Stats options:
 *   @param {number} options.days - Time period in days (default: 30)
 *
 * @returns {Promise<Object>} Activity stats:
 *   - period: Time period string
 *   - totalRequests: Total API requests made
 *   - contentCreated: Items created (POST requests)
 *   - contentUpdated: Items updated (PATCH requests)
 *   - logins: Successful login count
 *
 * USE CASE:
 * Quick overview of user engagement:
 * "In the last 30 days: 500 requests, 50 items created, 100 updates, 15 logins"
 */
export async function getUserActivityStats(userId, options = {}) {
  const { days = 30 } = options;

  // Convert to ObjectId for query
  const userObjectId = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  // Calculate start date (X days ago)
  const since = new Date();
  since.setDate(since.getDate() - days);

  // =====================================================
  // GATHER STATISTICS IN PARALLEL
  // =====================================================

  const [
    totalRequests,
    contentCreated,
    contentUpdated,
    logins
  ] = await Promise.all([
    // Total API requests
    Log.countDocuments({
      userId: userObjectId,
      timestamp: { $gte: since }
    }),

    // Content created (POST requests that succeeded)
    Log.countDocuments({
      userId: userObjectId,
      method: 'POST',
      statusCode: { $lt: 400 },  // Success codes only
      timestamp: { $gte: since }
    }),

    // Content updated (PATCH requests that succeeded)
    Log.countDocuments({
      userId: userObjectId,
      method: 'PATCH',
      statusCode: { $lt: 400 },
      timestamp: { $gte: since }
    }),

    // Successful logins
    Log.countDocuments({
      userId: userObjectId,
      eventName: 'auth_login',
      statusCode: 200,
      timestamp: { $gte: since }
    })
  ]);

  return {
    period: `${days} days`,
    totalRequests,
    contentCreated,
    contentUpdated,
    logins
  };
}

// =============================================================================
// COMBINED CONTENT VIEW
// =============================================================================

/**
 * getUserContent(userId, options)
 * -------------------------------
 * Get user content with flexible filtering by type.
 * Combined endpoint for admin dashboard.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Content options:
 *   @param {string} options.type - Content type: 'notes', 'tasks', 'projects', 'images', 'all'
 *   @param {number} options.limit - Max items to return
 *   @param {number} options.skip - Pagination offset
 *   @param {string} options.status - Filter by status
 *
 * @returns {Promise<Object>} Content data based on type:
 *   - userId: The user ID
 *   - counts: Content counts from getUserContentCounts()
 *   - [content type]: The requested content items
 *
 * @throws {Error} If user not found
 */
export async function getUserContent(userId, options = {}) {
  const { type = 'all', limit = 20, skip = 0, status } = options;

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Always get counts for context
  const counts = await getUserContentCounts(userId);

  let content = {};

  // Get specific content type based on request
  switch (type) {
    case 'notes':
      content = await getUserNotes(userId, { limit, skip, status });
      break;
    case 'tasks':
      content = await getUserTasks(userId, { limit, skip, status });
      break;
    case 'projects':
      content = await getUserProjects(userId, { limit, skip, status });
      break;
    case 'images':
      content = await getUserImages(userId, { limit, skip });
      break;
    case 'all':
    default:
      // For 'all', just return counts (summary view)
      content = { type: 'summary' };
      break;
  }

  return {
    userId,
    counts,
    ...content
  };
}

// =============================================================================
// SOCIAL: CONNECTIONS
// =============================================================================

/**
 * getUserConnections(userId, options)
 * -----------------------------------
 * Get a user's social connections (friends/follows).
 * Useful for investigating social network abuse.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Connection options:
 *   @param {number} options.limit - Max connections (default: 50)
 *   @param {number} options.skip - Pagination offset
 *   @param {string} options.status - Filter by status: 'accepted', 'pending', 'rejected'
 *
 * @returns {Promise<Object>} Connection data:
 *   - connections: Array of connection objects with user details
 *   - total: Total count for pagination
 *
 * USE CASE:
 * Admin investigating harassment can see who a user is connected to.
 */
export async function getUserConnections(userId, options = {}) {
  const { limit = 50, skip = 0, status = 'accepted' } = options;

  // Find connections where user is either requester or addressee
  const query = {
    $or: [{ requesterId: userId }, { addresseeId: userId }],
    status
  };

  const connections = await Connection.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    // Populate both sides to get user details
    .populate('requesterId', 'email profile.displayName profile.avatarUrl')
    .populate('addresseeId', 'email profile.displayName profile.avatarUrl');

  const total = await Connection.countDocuments(query);

  // Transform to show the "other" user from perspective of target user
  return {
    connections: connections.map(c => {
      // Determine which user is the "other" one
      const isRequester = c.requesterId._id.toString() === userId.toString();
      const otherUser = isRequester ? c.addresseeId : c.requesterId;

      return {
        _id: c._id,
        status: c.status,
        connectedUser: {
          _id: otherUser._id,
          email: otherUser.email,
          displayName: otherUser.profile?.displayName,
          avatarUrl: otherUser.profile?.avatarUrl
        },
        connectionSource: c.connectionSource,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    }),
    total
  };
}

// =============================================================================
// SOCIAL: BLOCKS
// =============================================================================

/**
 * getUserBlocks(userId, options)
 * ------------------------------
 * Get blocking relationships involving a user (both directions).
 * Important for investigating harassment cases.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Block options:
 *   @param {number} options.limit - Max blocks per direction (default: 50)
 *   @param {number} options.skip - Pagination offset
 *
 * @returns {Promise<Object>} Block data:
 *   - blockedByUser: Users this person has blocked
 *   - blockedThisUser: Users who have blocked this person
 *   - totalBlocked: Count of users blocked by this person
 *   - totalBlockedBy: Count of users who blocked this person
 *
 * USE CASE:
 * If many users have blocked someone, it might indicate problematic behavior.
 */
export async function getUserBlocks(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  // =====================================================
  // USERS THIS PERSON HAS BLOCKED
  // =====================================================

  const blockedByUser = await UserBlock.find({ blockerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('blockedId', 'email profile.displayName profile.avatarUrl');

  // =====================================================
  // USERS WHO HAVE BLOCKED THIS PERSON
  // =====================================================

  const blockedThisUser = await UserBlock.find({ blockedId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('blockerId', 'email profile.displayName profile.avatarUrl');

  // Get total counts
  const totalBlocked = await UserBlock.countDocuments({ blockerId: userId });
  const totalBlockedBy = await UserBlock.countDocuments({ blockedId: userId });

  return {
    blockedByUser: blockedByUser.map(b => ({
      _id: b._id,
      user: {
        _id: b.blockedId._id,
        email: b.blockedId.email,
        displayName: b.blockedId.profile?.displayName,
        avatarUrl: b.blockedId.profile?.avatarUrl
      },
      reason: b.reason,
      createdAt: b.createdAt
    })),
    blockedThisUser: blockedThisUser.map(b => ({
      _id: b._id,
      user: {
        _id: b.blockerId._id,
        email: b.blockerId.email,
        displayName: b.blockerId.profile?.displayName,
        avatarUrl: b.blockerId.profile?.avatarUrl
      },
      reason: b.reason,
      createdAt: b.createdAt
    })),
    totalBlocked,
    totalBlockedBy
  };
}

// =============================================================================
// SOCIAL: MESSAGES
// =============================================================================

/**
 * getUserMessages(userId, options)
 * --------------------------------
 * Get a user's conversations and messages.
 * Critical for investigating harassment or policy violations in messaging.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Message options:
 *   @param {number} options.limit - Max items (default: 20)
 *   @param {number} options.skip - Pagination offset
 *   @param {string} options.conversationId - Specific conversation to view
 *
 * @returns {Promise<Object>} Message data:
 *   If conversationId provided:
 *     - conversation: Conversation details
 *     - messages: Messages in that conversation
 *     - totalMessages: Total message count
 *   Otherwise:
 *     - conversations: List of conversations with counts
 *     - totalConversations: Total conversation count
 *     - totalMessagesSent: Total messages sent by user
 *
 * @throws {Error} If conversation not found or user not a participant
 *
 * PRIVACY NOTE:
 * Admin viewing messages should be logged and require justification.
 */
export async function getUserMessages(userId, options = {}) {
  const { limit = 20, skip = 0, conversationId } = options;

  // =====================================================
  // VIEW SPECIFIC CONVERSATION
  // =====================================================

  if (conversationId) {
    // Get the conversation with participant details
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'email profile.displayName profile.avatarUrl');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify the target user is actually a participant
    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Get messages in this conversation
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'email profile.displayName profile.avatarUrl');

    const totalMessages = await Message.countDocuments({ conversationId });

    return {
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        participants: conversation.participants.map(p => ({
          _id: p._id,
          email: p.email,
          displayName: p.profile?.displayName,
          avatarUrl: p.profile?.avatarUrl
        })),
        createdAt: conversation.createdAt
      },
      messages: messages.map(m => ({
        _id: m._id,
        content: m.content,
        contentType: m.contentType,
        sender: {
          _id: m.senderId._id,
          email: m.senderId.email,
          displayName: m.senderId.profile?.displayName
        },
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        createdAt: m.createdAt
      })),
      totalMessages
    };
  }

  // =====================================================
  // LIST ALL CONVERSATIONS
  // =====================================================

  const conversations = await Conversation.find({
    participants: userId
  })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('participants', 'email profile.displayName profile.avatarUrl');

  const totalConversations = await Conversation.countDocuments({
    participants: userId
  });

  // Add message counts to each conversation
  const conversationsWithCounts = await Promise.all(
    conversations.map(async (conv) => {
      // Total messages in conversation
      const messageCount = await Message.countDocuments({ conversationId: conv._id });

      // Messages sent by this specific user
      const userMessageCount = await Message.countDocuments({
        conversationId: conv._id,
        senderId: userId
      });

      return {
        _id: conv._id,
        type: conv.type,
        participants: conv.participants.map(p => ({
          _id: p._id,
          email: p.email,
          displayName: p.profile?.displayName,
          avatarUrl: p.profile?.avatarUrl
        })),
        lastMessage: conv.lastMessage,
        messageCount,
        userMessageCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    })
  );

  // Total messages sent by user across all conversations
  const totalMessagesSent = await Message.countDocuments({ senderId: userId });

  return {
    conversations: conversationsWithCounts,
    totalConversations,
    totalMessagesSent
  };
}

// =============================================================================
// SOCIAL: SHARES
// =============================================================================

/**
 * getUserShares(userId, options)
 * ------------------------------
 * Get items shared by or with a user.
 * Useful for investigating unauthorized sharing or data leaks.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Share options:
 *   @param {number} options.limit - Max items (default: 50)
 *   @param {number} options.skip - Pagination offset
 *   @param {string} options.direction - 'by' (shared by user), 'with' (shared with user), 'both'
 *
 * @returns {Promise<Object>} Share data:
 *   - sharedByUser: Items this user shared with others
 *   - sharedWithUser: Items others shared with this user
 *   - totalSharedByUser: Count of items shared by user
 *   - totalSharedWithUser: Count of items shared with user
 */
export async function getUserShares(userId, options = {}) {
  const { limit = 50, skip = 0, direction = 'both' } = options;

  let sharedByUser = [];
  let sharedWithUser = [];
  let totalSharedByUser = 0;
  let totalSharedWithUser = 0;

  // =====================================================
  // ITEMS SHARED BY THIS USER
  // =====================================================

  if (direction === 'both' || direction === 'by') {
    sharedByUser = await ItemShare.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .skip(direction === 'by' ? skip : 0)
      .limit(direction === 'by' ? limit : 20)
      .populate('sharedWithUsers.userId', 'email profile.displayName profile.avatarUrl');

    totalSharedByUser = await ItemShare.countDocuments({ ownerId: userId });
  }

  // =====================================================
  // ITEMS SHARED WITH THIS USER
  // =====================================================

  if (direction === 'both' || direction === 'with') {
    sharedWithUser = await ItemShare.find({
      'sharedWithUsers.userId': userId,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip(direction === 'with' ? skip : 0)
      .limit(direction === 'with' ? limit : 20)
      .populate('ownerId', 'email profile.displayName profile.avatarUrl');

    totalSharedWithUser = await ItemShare.countDocuments({
      'sharedWithUsers.userId': userId,
      status: 'active'
    });
  }

  return {
    sharedByUser: sharedByUser.map(s => ({
      _id: s._id,
      itemId: s.itemId,
      itemType: s.itemType,
      shareType: s.shareType,
      sharedWith: s.sharedWithUsers?.map(u => ({
        user: u.userId ? {
          _id: u.userId._id,
          email: u.userId.email,
          displayName: u.userId.profile?.displayName
        } : null,
        permission: u.permission,
        sharedAt: u.sharedAt
      })),
      createdAt: s.createdAt
    })),
    sharedWithUser: sharedWithUser.map(s => ({
      _id: s._id,
      itemId: s.itemId,
      itemType: s.itemType,
      owner: {
        _id: s.ownerId._id,
        email: s.ownerId.email,
        displayName: s.ownerId.profile?.displayName
      },
      permission: s.sharedWithUsers?.find(
        u => u.userId?.toString() === userId.toString()
      )?.permission,
      createdAt: s.createdAt
    })),
    totalSharedByUser,
    totalSharedWithUser
  };
}

// =============================================================================
// SOCIAL STATISTICS
// =============================================================================

/**
 * getUserSocialStats(userId)
 * --------------------------
 * Get comprehensive social activity statistics for a user.
 * Overview of all social features usage.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object>} Social stats:
 *   - connections: { total, pendingReceived, pendingSent }
 *   - blocks: { blocked, blockedBy }
 *   - messaging: { conversations, messagesSent }
 *   - sharing: { itemsShared, itemsReceived }
 *
 * USE CASE:
 * Quick overview of user's social engagement for admin dashboard.
 */
export async function getUserSocialStats(userId) {
  // Gather all stats in parallel for performance
  const [
    connectionCount,
    pendingRequestsReceived,
    pendingRequestsSent,
    blockedCount,
    blockedByCount,
    conversationCount,
    messagesSent,
    itemsShared,
    itemsReceivedShares
  ] = await Promise.all([
    // Accepted connections (either direction)
    Connection.countDocuments({
      $or: [{ requesterId: userId }, { addresseeId: userId }],
      status: 'accepted'
    }),
    // Pending requests received (waiting for this user to respond)
    Connection.countDocuments({ addresseeId: userId, status: 'pending' }),
    // Pending requests sent (this user is waiting for response)
    Connection.countDocuments({ requesterId: userId, status: 'pending' }),
    // Users blocked by this person
    UserBlock.countDocuments({ blockerId: userId }),
    // Users who blocked this person
    UserBlock.countDocuments({ blockedId: userId }),
    // Conversations this user is in
    Conversation.countDocuments({ participants: userId }),
    // Messages sent by this user
    Message.countDocuments({ senderId: userId }),
    // Items shared by this user
    ItemShare.countDocuments({ ownerId: userId }),
    // Items shared with this user
    ItemShare.countDocuments({ 'sharedWithUsers.userId': userId, status: 'active' })
  ]);

  return {
    connections: {
      total: connectionCount,
      pendingReceived: pendingRequestsReceived,
      pendingSent: pendingRequestsSent
    },
    blocks: {
      blocked: blockedCount,
      blockedBy: blockedByCount
    },
    messaging: {
      conversations: conversationCount,
      messagesSent
    },
    sharing: {
      itemsShared,
      itemsReceived: itemsReceivedShares
    }
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all admin content service functions.
 *
 * USAGE:
 * import adminContentService from './adminContentService.js';
 * // OR
 * import { getUserContentCounts, getUserNotes } from './adminContentService.js';
 *
 * FUNCTION CATEGORIES:
 *
 * CONTENT VIEWING:
 * - getUserContentCounts: Summary counts of all content
 * - getUserNotes: View user's notes
 * - getUserTasks: View user's tasks
 * - getUserProjects: View user's projects
 * - getUserImages: View user's images
 * - getUserContent: Combined content endpoint
 *
 * ACTIVITY TRACKING:
 * - getUserActivityTimeline: Activity history grouped by day
 * - getUserActivityStats: Activity summary statistics
 *
 * SOCIAL FEATURES:
 * - getUserConnections: Friend/follow relationships
 * - getUserBlocks: Block relationships
 * - getUserMessages: Conversations and messages
 * - getUserShares: Shared items
 * - getUserSocialStats: Social activity summary
 */
export default {
  getUserContentCounts,
  getUserNotes,
  getUserTasks,
  getUserProjects,
  getUserImages,
  getUserActivityTimeline,
  getUserActivityStats,
  getUserContent,
  // Social functions
  getUserConnections,
  getUserBlocks,
  getUserMessages,
  getUserShares,
  getUserSocialStats
};
