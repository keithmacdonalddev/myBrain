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
 * Mongoose - Popular MongoDB library that provides utility functions.
 * We use mongoose.Types.ObjectId to convert string IDs to proper ObjectIds
 * for some database queries that require ObjectId type matching.
 */
import mongoose from 'mongoose';

/**
 * Note model - User-created notes and documents.
 * Admins may need to view notes to investigate content violations.
 */
import Note from '../models/Note.js';

/**
 * Task model - User-created tasks and to-do items.
 * Admins may access tasks during support requests or violation investigations.
 */
import Task from '../models/Task.js';

/**
 * Project model - User-created projects containing tasks and links.
 * Used to retrieve projects for admin review and user support.
 */
import Project from '../models/Project.js';

/**
 * Image model - Metadata for user-uploaded images.
 * Admins review image metadata to investigate content violations.
 */
import Image from '../models/Image.js';

/**
 * Log model - Stores all API request logs and activity history.
 * Admins review logs to investigate user behavior and troubleshoot issues.
 */
import Log from '../models/Log.js';

/**
 * User model - User accounts and profile information.
 * Admins fetch user data to verify existence and pull user details
 * for the admin panel user management interface.
 */
import User from '../models/User.js';

/**
 * Connection model - Friend/follow relationships between users.
 * Used by admins to understand user social networks during investigations.
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model - Records of users blocking each other.
 * Admins review blocks to assess potential harassment situations.
 */
import UserBlock from '../models/UserBlock.js';

/**
 * Message model - Individual messages sent between users.
 * Admins may view messages for harassment investigations or support.
 */
import Message from '../models/Message.js';

/**
 * Conversation model - Message threads between users.
 * Admins fetch conversations to review communication and identify abuse patterns.
 */
import Conversation from '../models/Conversation.js';

/**
 * ItemShare model - Records of content shared between users.
 * Used to understand sharing patterns and investigate potential abuse.
 */
import ItemShare from '../models/ItemShare.js';

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
 * Retrieves a user's tasks with pagination and optional status filtering.
 * Returns task previews (first 200 characters of description) instead of full content
 * for privacy and performance reasons.
 *
 * BUSINESS LOGIC:
 * When admins investigate a user account, they need to see what tasks the user has
 * created. By returning previews instead of full descriptions, we respect user privacy
 * while allowing admins to understand the user's task patterns and priorities.
 *
 * @param {string} userId - User ID to fetch tasks for
 * @param {Object} options - Query options
 *   @param {number} options.limit - Max tasks to return (default: 20)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *   @param {string} options.status - Filter by task status ('active', 'completed', 'archived', etc.)
 *
 * @returns {Promise<Object>} Results object:
 *   - tasks: Array of task objects with title, preview, metadata
 *   - total: Total count of tasks matching the query (for pagination)
 *
 * @throws {Error} If the database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get first 20 active tasks for a user
 * const result = await getUserTasks('user123', { limit: 20, skip: 0, status: 'active' });
 * // Returns: { tasks: [...], total: 45 }
 *
 * // Get next page of tasks (pagination)
 * const nextPage = await getUserTasks('user123', { limit: 20, skip: 20 });
 * ```
 */
export async function getUserTasks(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  // =====================================================
  // BUILD QUERY
  // =====================================================
  // Start with userId as base query, then add optional status filter
  const query = { userId };
  if (status) {
    query.status = status;
  }

  // =====================================================
  // FETCH TASKS WITH PAGINATION
  // =====================================================
  // We select limited fields and sort by most recent for admin review
  const tasks = await Task.find(query)
    .sort({ updatedAt: -1 })  // Most recently updated first
    .skip(skip)               // Offset for pagination
    .limit(limit)             // Maximum items per page
    .select('title description status priority dueDate createdAt updatedAt tags');

  // Get total count for pagination info
  const total = await Task.countDocuments(query);

  // =====================================================
  // TRANSFORM DATA FOR RESPONSE
  // =====================================================
  // Include only necessary fields and truncate descriptions for privacy
  return {
    tasks: tasks.map(t => ({
      _id: t._id,
      title: t.title,
      descriptionPreview: t.description?.substring(0, 200),  // First 200 chars only
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
 * Retrieves a user's projects with pagination and optional status filtering.
 * Returns project previews (first 200 characters of description) instead of full content
 * for privacy and performance.
 *
 * BUSINESS LOGIC:
 * Projects are comprehensive work items. When admins review a user account, they need
 * to understand the scope and nature of the user's projects. Description previews allow
 * admins to get the gist without seeing the entire project details, balancing oversight
 * with user privacy.
 *
 * @param {string} userId - User ID to fetch projects for
 * @param {Object} options - Query options
 *   @param {number} options.limit - Max projects to return (default: 20)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *   @param {string} options.status - Filter by project status ('planning', 'active', 'completed', 'archived')
 *
 * @returns {Promise<Object>} Results object:
 *   - projects: Array of project objects with name, preview, timeline
 *   - total: Total count of projects matching the query (for pagination)
 *
 * @throws {Error} If the database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get user's active projects
 * const result = await getUserProjects('user456', { limit: 20, status: 'active' });
 * // Returns: { projects: [...], total: 12 }
 *
 * // Get archived projects for historical review
 * const archived = await getUserProjects('user456', { limit: 50, status: 'archived' });
 * ```
 */
export async function getUserProjects(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  // =====================================================
  // BUILD QUERY
  // =====================================================
  // Start with userId, optionally filter by status
  const query = { userId };
  if (status) {
    query.status = status;
  }

  // =====================================================
  // FETCH PROJECTS WITH PAGINATION
  // =====================================================
  // Select limited fields for admin view, sort by most recent
  const projects = await Project.find(query)
    .sort({ updatedAt: -1 })  // Most recently updated first
    .skip(skip)               // Pagination offset
    .limit(limit)             // Max items per page
    .select('name description status priority startDate endDate createdAt updatedAt');

  // Get total for pagination tracking
  const total = await Project.countDocuments(query);

  // =====================================================
  // TRANSFORM DATA FOR RESPONSE
  // =====================================================
  // Return safe subset of data with description previews
  return {
    projects: projects.map(p => ({
      _id: p._id,
      name: p.name,
      descriptionPreview: p.description?.substring(0, 200),  // First 200 chars only
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
 * Retrieves a user's uploaded images with pagination.
 * Returns metadata (filename, size, dimensions) but intentionally excludes full image content
 * for privacy. Actual image content should only be viewed through secure admin channels.
 *
 * BUSINESS LOGIC:
 * Image metadata (filename, size, upload date) helps admins understand what a user has
 * uploaded. However, viewing the actual images requires additional authorization and
 * logging to ensure admin access is appropriate. This function returns only metadata.
 *
 * @param {string} userId - User ID to fetch images for
 * @param {Object} options - Query options
 *   @param {number} options.limit - Max images to return (default: 20)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *
 * @returns {Promise<Object>} Results object:
 *   - images: Array of image metadata objects
 *   - total: Total count of user's images (for pagination)
 *
 * @throws {Error} If the database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get list of images a user has uploaded
 * const result = await getUserImages('user789', { limit: 20, skip: 0 });
 * // Returns: { images: [...], total: 156 }
 *
 * // To view actual image content, admin must use separate secure endpoint
 * // that logs the access and requires specific justification
 * ```
 *
 * PRIVACY NOTE:
 * Only metadata is returned here. Full image content must be accessed through
 * a separate, more restrictively controlled endpoint.
 */
export async function getUserImages(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  // =====================================================
  // BUILD QUERY
  // =====================================================
  // Simple query by userId
  const query = { userId };

  // =====================================================
  // FETCH IMAGES WITH PAGINATION
  // =====================================================
  // Select only metadata, not actual image content
  const images = await Image.find(query)
    .sort({ createdAt: -1 })  // Most recently uploaded first
    .skip(skip)               // Pagination offset
    .limit(limit)             // Max items per page
    .select('filename originalName mimeType size url thumbnailUrl alt createdAt');

  // Get total count for pagination
  const total = await Image.countDocuments(query);

  // =====================================================
  // TRANSFORM DATA FOR RESPONSE
  // =====================================================
  // Return metadata while being intentional about privacy protection
  return {
    images: images.map(i => ({
      _id: i._id,
      filename: i.filename,
      originalName: i.originalName,
      mimeType: i.mimeType,        // e.g., 'image/jpeg'
      size: i.size,                // File size in bytes
      url: i.url,                  // S3 URL
      thumbnailUrl: i.thumbnailUrl, // Thumbnail version
      alt: i.alt,                  // Alt text provided by user
      createdAt: i.createdAt       // Upload timestamp
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
 * Flexible content retrieval endpoint that returns different content types
 * based on the request type parameter. Serves as a unified interface for
 * admin content viewing with type-based routing.
 *
 * BUSINESS LOGIC:
 * Instead of having separate endpoints for each content type, this function
 * acts as a router to provide a consistent interface. Admins can request
 * specific types ('notes', 'tasks', etc.) or get a summary of all content.
 * Content counts are always included for context (e.g., "user has 150 notes").
 *
 * @param {string} userId - User ID to fetch content for
 * @param {Object} options - Content retrieval options
 *   @param {string} options.type - Which content to fetch:
 *     - 'notes': User's notes
 *     - 'tasks': User's tasks
 *     - 'projects': User's projects
 *     - 'images': User's images
 *     - 'all': Just return counts (summary view, default)
 *   @param {number} options.limit - Max items to return per type (default: 20)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *   @param {string} options.status - Filter results by status (optional)
 *
 * @returns {Promise<Object>} Results object containing:
 *   - userId: The requested user's ID
 *   - counts: Summary counts (notes, tasks, projects, images, total)
 *   - [type-specific data]: Items from requested type with previews
 *
 * @throws {Error} "User not found" if the user doesn't exist
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get user profile with summary of all content
 * const summary = await getUserContent('user123', { type: 'all' });
 * // Returns: { userId: '...', counts: { notes: 150, tasks: 75, ... } }
 *
 * // Get specific content type with pagination
 * const notes = await getUserContent('user123', { type: 'notes', limit: 20, skip: 0 });
 * // Returns: { userId: '...', counts: {...}, notes: [...], total: 150 }
 *
 * // Filter by status
 * const tasks = await getUserContent('user123', { type: 'tasks', status: 'completed' });
 * ```
 */
export async function getUserContent(userId, options = {}) {
  const { type = 'all', limit = 20, skip = 0, status } = options;

  // =====================================================
  // VERIFY USER EXISTS
  // =====================================================
  // Throw error if the user cannot be found
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // =====================================================
  // GET CONTENT COUNTS
  // =====================================================
  // Always include counts for context, helps admins understand user's activity
  const counts = await getUserContentCounts(userId);

  // =====================================================
  // ROUTE TO SPECIFIC CONTENT TYPE
  // =====================================================
  // Delegate to specific function based on requested type
  let content = {};

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
      // For 'all', just return counts (summary view without detailed content)
      content = { type: 'summary' };
      break;
  }

  // =====================================================
  // RETURN COMBINED RESPONSE
  // =====================================================
  // Always include userId and counts, plus type-specific content
  return {
    userId,
    counts,
    ...content  // Spread type-specific content into response
  };
}

// =============================================================================
// SOCIAL: CONNECTIONS
// =============================================================================

/**
 * getUserConnections(userId, options)
 * -----------------------------------
 * Retrieves a user's social connections (friends/follows) from both directions.
 * Shows who the user is connected to, including pending connection requests.
 * Essential for investigating social network abuse patterns.
 *
 * BUSINESS LOGIC:
 * A user can be connected in two ways: as a requester (sent the request) or
 * as an addressee (received the request). To get ALL connections, we query both
 * directions. Admins investigating harassment need to see the social network
 * to identify patterns (e.g., mass connecting + spamming, or targeting behavior).
 *
 * @param {string} userId - User ID to get connections for
 * @param {Object} options - Connection options
 *   @param {number} options.limit - Max connections to return (default: 50)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *   @param {string} options.status - Filter by connection status:
 *     - 'accepted': Confirmed connections (default)
 *     - 'pending': Waiting for response
 *     - 'rejected': Connection was declined
 *
 * @returns {Promise<Object>} Results object:
 *   - connections: Array of connection objects, each showing the "other" user
 *   - total: Total count of connections for pagination
 *
 * @throws {Error} If database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // See who a user is connected to
 * const result = await getUserConnections('user123', { limit: 50, status: 'accepted' });
 * // Returns: { connections: [{ connectedUser: {...}, createdAt: ... }], total: 237 }
 *
 * // See pending connection requests (both sent and received)
 * const pending = await getUserConnections('user123', { status: 'pending' });
 * ```
 */
export async function getUserConnections(userId, options = {}) {
  const { limit = 50, skip = 0, status = 'accepted' } = options;

  // =====================================================
  // BUILD QUERY FOR BOTH DIRECTIONS
  // =====================================================
  // User can be on either side of a connection (requester or addressee)
  // We want to find all their connections, regardless of direction
  const query = {
    $or: [
      { requesterId: userId },  // Connections user initiated
      { addresseeId: userId }   // Connections initiated toward user
    ],
    status  // Filter by connection status
  };

  // =====================================================
  // FETCH CONNECTIONS WITH PAGINATION
  // =====================================================
  // Populate user details for both sides, then we'll extract "the other" user
  const connections = await Connection.find(query)
    .sort({ updatedAt: -1 })  // Most recent first
    .skip(skip)               // Pagination
    .limit(limit)             // Max items
    // Populate to get full user details
    .populate('requesterId', 'email profile.displayName profile.avatarUrl')
    .populate('addresseeId', 'email profile.displayName profile.avatarUrl');

  // Get total count for pagination
  const total = await Connection.countDocuments(query);

  // =====================================================
  // NORMALIZE RESPONSE
  // =====================================================
  // From the target user's perspective, show who they're connected to
  return {
    connections: connections.map(c => {
      // Figure out which side of the connection the target user is on
      const isRequester = c.requesterId._id.toString() === userId.toString();
      // Get the "other" user (the one they're connected to)
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
 * Retrieves blocking relationships involving a user in both directions.
 * Essential for investigating harassment, stalking, or abuse patterns.
 *
 * BUSINESS LOGIC:
 * Blocking is a safety mechanism. When admins investigate a user, they need to see:
 * 1. Who the user has blocked (might indicate defensive behavior)
 * 2. Who has blocked the user (might indicate they're causing problems)
 * If many users have blocked someone, it's a strong signal of problematic behavior.
 * This is a key abuse detection signal.
 *
 * @param {string} userId - User ID to get block data for
 * @param {Object} options - Block options
 *   @param {number} options.limit - Max blocks to return per direction (default: 50)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *
 * @returns {Promise<Object>} Results object:
 *   - blockedByUser: Users that this person has blocked (with reason and date)
 *   - blockedThisUser: Users who have blocked this person
 *   - totalBlocked: Total count of people this user blocked
 *   - totalBlockedBy: Total count of people who blocked this user
 *
 * @throws {Error} If database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // See blocking relationships for harassment investigation
 * const blocks = await getUserBlocks('user123');
 * // Returns: { blockedByUser: [...], blockedThisUser: [...], totalBlocked: 5, totalBlockedBy: 23 }
 *
 * // If totalBlockedBy is high, indicates potential problematic user
 * if (blocks.totalBlockedBy > 10) {
 *   // Flag for review or escalation
 * }
 * ```
 *
 * RISK INDICATOR:
 * High totalBlockedBy is a strong signal of harassment or policy violations.
 */
export async function getUserBlocks(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  // =====================================================
  // GET USERS THIS PERSON HAS BLOCKED
  // =====================================================
  // These are users the target user actively chose to block
  const blockedByUser = await UserBlock.find({ blockerId: userId })
    .sort({ createdAt: -1 })  // Most recent blocks first
    .skip(skip)               // Pagination
    .limit(limit)             // Max items
    .populate('blockedId', 'email profile.displayName profile.avatarUrl');

  // =====================================================
  // GET USERS WHO HAVE BLOCKED THIS PERSON
  // =====================================================
  // These are users who chose to block the target user (risk signal!)
  const blockedThisUser = await UserBlock.find({ blockedId: userId })
    .sort({ createdAt: -1 })  // Most recent blocks first
    .limit(limit)             // Max items
    .populate('blockerId', 'email profile.displayName profile.avatarUrl');

  // =====================================================
  // GET TOTAL COUNTS
  // =====================================================
  // Important for understanding scope without pagination limits
  const totalBlocked = await UserBlock.countDocuments({ blockerId: userId });
  const totalBlockedBy = await UserBlock.countDocuments({ blockedId: userId });

  // =====================================================
  // RETURN FORMATTED RESULTS
  // =====================================================
  return {
    // Users this person has blocked
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
    // Users who have blocked this person (RISK SIGNAL)
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
 * Retrieves sharing relationships involving a user in both directions.
 * Useful for investigating unauthorized sharing, data leaks, or privacy violations.
 *
 * BUSINESS LOGIC:
 * Sharing is collaborative, but can be abused. When investigating a user, admins need to see:
 * 1. What has the user shared with others (might reveal suspicious distribution patterns)
 * 2. What have others shared with the user (might reveal suspicious access patterns)
 * This helps detect data leaks, collaborative abuse, or privacy violations.
 *
 * @param {string} userId - User ID to get sharing data for
 * @param {Object} options - Share options
 *   @param {number} options.limit - Max items to return per direction (default: 50)
 *   @param {number} options.skip - Pagination offset (default: 0)
 *   @param {string} options.direction - Which sharing to retrieve:
 *     - 'by': Only items shared BY this user
 *     - 'with': Only items shared WITH this user
 *     - 'both': Both directions (default)
 *
 * @returns {Promise<Object>} Results object:
 *   - sharedByUser: Items this user has shared with others
 *   - sharedWithUser: Items others have shared with this user
 *   - totalSharedByUser: Total count of shares by this user
 *   - totalSharedWithUser: Total count of shares with this user
 *
 * @throws {Error} If database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // See all sharing relationships for a user
 * const shares = await getUserShares('user123');
 * // Returns: { sharedByUser: [...], sharedWithUser: [...], totalSharedByUser: 12, totalSharedWithUser: 5 }
 *
 * // Check if user is excessively sharing (potential abuse)
 * const byShares = await getUserShares('user123', { direction: 'by' });
 * if (byShares.totalSharedByUser > 100) {
 *   // Flag for potential data leak or abuse pattern
 * }
 * ```
 */
export async function getUserShares(userId, options = {}) {
  const { limit = 50, skip = 0, direction = 'both' } = options;

  // Initialize storage for results
  let sharedByUser = [];
  let sharedWithUser = [];
  let totalSharedByUser = 0;
  let totalSharedWithUser = 0;

  // =====================================================
  // GET ITEMS SHARED BY THIS USER
  // =====================================================
  // Shows what content this user is sharing with others
  if (direction === 'both' || direction === 'by') {
    sharedByUser = await ItemShare.find({ ownerId: userId })
      .sort({ createdAt: -1 })  // Most recent shares first
      .skip(direction === 'by' ? skip : 0)          // Pagination only if this is the main request
      .limit(direction === 'by' ? limit : 20)       // Limit items
      .populate('sharedWithUsers.userId', 'email profile.displayName profile.avatarUrl');

    totalSharedByUser = await ItemShare.countDocuments({ ownerId: userId });
  }

  // =====================================================
  // GET ITEMS SHARED WITH THIS USER
  // =====================================================
  // Shows what content others are sharing with this user (access patterns)
  if (direction === 'both' || direction === 'with') {
    sharedWithUser = await ItemShare.find({
      'sharedWithUsers.userId': userId,
      status: 'active'  // Only active shares, ignore revoked access
    })
      .sort({ createdAt: -1 })  // Most recent first
      .skip(direction === 'with' ? skip : 0)        // Pagination only if this is the main request
      .limit(direction === 'with' ? limit : 20)     // Limit items
      .populate('ownerId', 'email profile.displayName profile.avatarUrl');

    totalSharedWithUser = await ItemShare.countDocuments({
      'sharedWithUsers.userId': userId,
      status: 'active'
    });
  }

  // =====================================================
  // FORMAT AND RETURN RESULTS
  // =====================================================
  return {
    // Items this user shared with others
    sharedByUser: sharedByUser.map(s => ({
      _id: s._id,
      itemId: s.itemId,
      itemType: s.itemType,        // 'note', 'task', 'project', etc.
      shareType: s.shareType,      // 'collaboration', 'view_only', etc.
      sharedWith: s.sharedWithUsers?.map(u => ({
        user: u.userId ? {
          _id: u.userId._id,
          email: u.userId.email,
          displayName: u.userId.profile?.displayName
        } : null,
        permission: u.permission,  // 'edit', 'view', etc.
        sharedAt: u.sharedAt
      })),
      createdAt: s.createdAt
    })),
    // Items others shared with this user
    sharedWithUser: sharedWithUser.map(s => ({
      _id: s._id,
      itemId: s.itemId,
      itemType: s.itemType,
      owner: {
        _id: s.ownerId._id,
        email: s.ownerId.email,
        displayName: s.ownerId.profile?.displayName
      },
      // Get this user's specific permission for the shared item
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
 * Generates comprehensive social activity statistics for a user.
 * Provides quick overview of all social features usage at a glance.
 *
 * BUSINESS LOGIC:
 * This function aggregates counts from all social-related models to create
 * a snapshot of a user's social behavior. This helps admins quickly assess:
 * - How connected is the user (network size)
 * - Are there conflict signals (blocks sent/received)
 * - How active in messaging (engagement level)
 * - How much sharing (collaboration level)
 * All counts are gathered in parallel for performance.
 *
 * @param {string} userId - User ID to get social stats for
 *
 * @returns {Promise<Object>} Social statistics object:
 *   - connections: {
 *       total: Total accepted connections
 *       pendingReceived: Connection requests awaiting this user's response
 *       pendingSent: Connection requests this user is waiting on
 *     }
 *   - blocks: {
 *       blocked: Count of users this person has blocked
 *       blockedBy: Count of users who have blocked this person (RISK SIGNAL)
 *     }
 *   - messaging: {
 *       conversations: Total conversations this user is in
 *       messagesSent: Total messages sent by this user
 *     }
 *   - sharing: {
 *       itemsShared: Total items this user has shared with others
 *       itemsReceived: Total items others have shared with this user
 *     }
 *
 * @throws {Error} If any database query fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get quick overview of user's social activity for admin dashboard
 * const stats = await getUserSocialStats('user456');
 * console.log(stats);
 * // {
 * //   connections: { total: 50, pendingReceived: 3, pendingSent: 2 },
 * //   blocks: { blocked: 1, blockedBy: 8 },
 * //   messaging: { conversations: 15, messagesSent: 342 },
 * //   sharing: { itemsShared: 23, itemsReceived: 12 }
 * // }
 *
 * // High blockedBy count is concerning
 * if (stats.blocks.blockedBy > 5) {
 *   // Flag for potential harassment/abuse
 * }
 * ```
 *
 * INTERPRETATION GUIDE:
 * - blockedBy > 5: Strong risk signal of problematic behavior
 * - messagesSent >> conversations: Might indicate mass messaging/spam
 * - itemsShared > 50: Check if legitimate collaboration or data leak
 */
export async function getUserSocialStats(userId) {
  // =====================================================
  // GATHER ALL STATISTICS IN PARALLEL
  // =====================================================
  // Use Promise.all for performance - all queries run simultaneously
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
    // =====================================================
    // CONNECTION STATISTICS
    // =====================================================
    // Total accepted connections (user is either requester or addressee)
    Connection.countDocuments({
      $or: [{ requesterId: userId }, { addresseeId: userId }],
      status: 'accepted'
    }),
    // Pending requests received (waiting for this user to respond)
    Connection.countDocuments({ addresseeId: userId, status: 'pending' }),
    // Pending requests sent (this user is waiting for response)
    Connection.countDocuments({ requesterId: userId, status: 'pending' }),

    // =====================================================
    // BLOCKING STATISTICS
    // =====================================================
    // Users blocked by this person (defensive action)
    UserBlock.countDocuments({ blockerId: userId }),
    // Users who blocked this person (RISK SIGNAL - if high)
    UserBlock.countDocuments({ blockedId: userId }),

    // =====================================================
    // MESSAGING STATISTICS
    // =====================================================
    // Conversations this user is a participant in
    Conversation.countDocuments({ participants: userId }),
    // Messages sent by this user
    Message.countDocuments({ senderId: userId }),

    // =====================================================
    // SHARING STATISTICS
    // =====================================================
    // Items this user has shared with others
    ItemShare.countDocuments({ ownerId: userId }),
    // Items others have shared with this user
    ItemShare.countDocuments({ 'sharedWithUsers.userId': userId, status: 'active' })
  ]);

  // =====================================================
  // RETURN ORGANIZED RESULTS
  // =====================================================
  return {
    connections: {
      total: connectionCount,
      pendingReceived: pendingRequestsReceived,
      pendingSent: pendingRequestsSent
    },
    blocks: {
      blocked: blockedCount,
      blockedBy: blockedByCount  // HIGH VALUE = RISK SIGNAL
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
