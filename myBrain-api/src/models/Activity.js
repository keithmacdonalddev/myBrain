/**
 * =============================================================================
 * ACTIVITY.JS - User Activity Feed Data Model
 * =============================================================================
 *
 * This file defines the Activity model - the data structure for tracking
 * user actions that appear in social activity feeds in myBrain.
 *
 * WHAT IS AN ACTIVITY?
 * --------------------
 * An activity is a record of something a user did that might be interesting
 * to their connections. Think of it like posts on Facebook or updates on
 * LinkedIn - it shows what you and your connections have been up to.
 *
 * EXAMPLES OF ACTIVITIES:
 * - "John created a new project: Q4 Marketing Plan"
 * - "Sarah completed 5 tasks"
 * - "Mike connected with Jane"
 * - "Lisa uploaded a new file"
 *
 * ACTIVITY vs NOTIFICATION:
 * -------------------------
 * - NOTIFICATION: A direct alert to a specific user about something
 *   that affects them ("Someone shared a file with you")
 *
 * - ACTIVITY: A public/semi-public record of what a user did
 *   that appears in activity feeds ("John completed a project")
 *
 * Think of it this way:
 * - Notifications are like text messages (direct, personal)
 * - Activities are like social media posts (visible to followers)
 *
 * VISIBILITY LEVELS:
 * ------------------
 * 1. PRIVATE: Only the user can see this activity
 * 2. CONNECTIONS: Only the user's connections can see it
 * 3. PUBLIC: Anyone can see this activity
 *
 * The visibility setting respects user privacy preferences.
 *
 * ENTITY SNAPSHOT:
 * ----------------
 * When we create an activity, we save a "snapshot" of the related item.
 * This is because:
 * - The item might be renamed later
 * - The item might be deleted
 * - We want to show what it looked like AT THE TIME
 *
 * EXAMPLE:
 * If John creates "Project Alpha" and later renames it to "Project Beta",
 * the activity will still show "Project Alpha" (the original name).
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// ACTIVITY SCHEMA DEFINITION
// =============================================================================

/**
 * The Activity Schema
 * -------------------
 * Defines all the fields an Activity document can have.
 */
const activitySchema = new mongoose.Schema({

  // ===========================================================================
  // WHO DID IT
  // ===========================================================================

  /**
   * userId: The user who performed the action
   * - Required: Every activity has someone who did it
   * - References: Points to a User document
   * - Index: For finding a user's activities quickly
   *
   * This is WHO did the action shown in the activity.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // ACTIVITY TYPE
  // ===========================================================================

  /**
   * type: What kind of action was performed
   * - Required: We need to know what happened
   * - Index: For filtering activities by type
   *
   * VALUES - CONTENT CREATION:
   * - 'project_created': User started a new project
   * - 'project_updated': User made changes to a project
   * - 'project_completed': User finished a project
   * - 'task_created': User created a new task
   * - 'task_completed': User completed a task
   * - 'note_created': User wrote a new note
   * - 'note_updated': User edited a note
   * - 'file_uploaded': User uploaded a file
   *
   * VALUES - SOCIAL:
   * - 'connection_made': User connected with someone
   * - 'item_shared': User shared something with connections
   *
   * VALUES - PROFILE:
   * - 'profile_updated': User updated their profile
   * - 'status_updated': User changed their status
   */
  type: {
    type: String,
    enum: [
      // Content creation
      'project_created',
      'project_updated',
      'project_completed',
      'task_created',
      'task_completed',
      'note_created',
      'note_updated',
      'file_uploaded',
      // Social
      'connection_made',
      'item_shared',
      // Profile
      'profile_updated',
      'status_updated'
    ],
    required: true,
    index: true
  },

  // ===========================================================================
  // RELATED ENTITY
  // ===========================================================================

  /**
   * entityId: The ID of the item related to this activity
   * - Optional: Some activities might not relate to a specific item
   *
   * EXAMPLES:
   * - 'project_created' → entityId is the new project's ID
   * - 'task_completed' → entityId is the completed task's ID
   * - 'connection_made' → entityId is the connection record's ID
   */
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },

  /**
   * entityType: What type of item the entityId refers to
   * - Helps the frontend know how to display the activity
   *
   * VALUES:
   * - 'project': A project
   * - 'task': A task
   * - 'note': A note
   * - 'file': A file
   * - 'folder': A folder
   * - 'connection': A user connection
   * - 'share': A shared item
   * - 'profile': User profile
   */
  entityType: {
    type: String,
    enum: ['project', 'task', 'note', 'file', 'folder', 'connection', 'share', 'profile']
  },

  // ===========================================================================
  // ENTITY SNAPSHOT
  // ===========================================================================

  /**
   * entitySnapshot: A snapshot of the entity at the time of the activity
   *
   * WHY SNAPSHOT?
   * - The original item might be renamed, edited, or deleted
   * - We want to show what it looked like when the activity happened
   * - Prevents broken references if items are deleted
   *
   * EXAMPLE:
   * User creates "Project Alpha", then renames to "Project Beta"
   * Activity still shows: "John created Project Alpha"
   */
  entitySnapshot: {
    /**
     * title: The item's title at the time
     * EXAMPLE: "Q4 Marketing Plan"
     */
    title: String,

    /**
     * description: Brief description of the item
     * EXAMPLE: "Planning for Q4 marketing initiatives"
     */
    description: String,

    /**
     * status: The item's status at the time
     * EXAMPLE: "in_progress", "completed"
     */
    status: String,

    /**
     * thumbnailUrl: Image preview if applicable
     * EXAMPLE: URL to a project cover image
     */
    thumbnailUrl: String
  },

  // ===========================================================================
  // VISIBILITY
  // ===========================================================================

  /**
   * visibility: Who can see this activity
   * - Default: 'connections' (only connections can see)
   *
   * VALUES:
   * - 'private': Only the user can see this activity
   *   (Useful for personal tracking without sharing)
   *
   * - 'connections': Only the user's connections can see
   *   (Most common - share with friends/colleagues)
   *
   * - 'public': Anyone can see this activity
   *   (For public profiles and achievements)
   *
   * User can override default visibility in their settings.
   */
  visibility: {
    type: String,
    enum: ['private', 'connections', 'public'],
    default: 'connections'
  },

  // ===========================================================================
  // METADATA
  // ===========================================================================

  /**
   * metadata: Additional data for special handling
   * - Optional: Store any extra information needed
   * - Mixed type: Can be any shape of data
   *
   * EXAMPLES:
   * - { taskCount: 5 } for "completed 5 tasks"
   * - { previousStatus: 'draft', newStatus: 'published' } for status changes
   * - { sharedWith: 3 } for "shared with 3 people"
   */
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the activity was recorded
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for User's Activities by Date
 * -----------------------------------
 * Find a user's activities sorted by newest first.
 * Used when viewing someone's profile activity.
 */
activitySchema.index({ userId: 1, createdAt: -1 });

/**
 * Index for Visible Activities by User
 * ------------------------------------
 * Find activities by user AND visibility level.
 * Used when showing only public or connections-visible activities.
 */
activitySchema.index({ userId: 1, visibility: 1, createdAt: -1 });

/**
 * Index for Activity Type
 * -----------------------
 * Find all activities of a certain type.
 * Used for filtering ("Show only completed projects").
 */
activitySchema.index({ type: 1, createdAt: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getFeed(userId, options)
 * ------------------------
 * Get the activity feed for a user.
 * Shows activities from the user AND their connections.
 *
 * @param {string} userId - The user viewing the feed
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - before: Only get activities before this date (for infinite scroll)
 * @returns {Array} - Array of activity documents with user info
 *
 * HOW IT WORKS:
 * 1. Gets all the user's connections
 * 2. Finds activities from those connections
 * 3. Only shows 'connections' or 'public' visibility activities
 * 4. Returns sorted by newest first
 *
 * EXAMPLE:
 * const feed = await Activity.getFeed(userId);
 * // Shows: "John completed Project X", "Sarah shared a file", etc.
 */
activitySchema.statics.getFeed = async function(userId, options = {}) {
  const { limit = 50, skip = 0, before = null } = options;
  const Connection = mongoose.model('Connection');

  // Step 1: Get all connections (friends)
  const connections = await Connection.getConnections(userId, { populate: false });

  // Step 2: Extract the IDs of connected users
  const connectedUserIds = connections.map(conn => {
    // A connection has requesterId and addresseeId
    // We want the "other" user (not the current user)
    const otherUserId = conn.requesterId.toString() === userId.toString()
      ? conn.addresseeId
      : conn.requesterId;
    return new mongoose.Types.ObjectId(otherUserId);
  });

  // Step 3: Include the user's own ID (to see their own activities)
  connectedUserIds.push(new mongoose.Types.ObjectId(userId));

  // Step 4: Build the query
  const query = {
    userId: { $in: connectedUserIds },         // From me or my connections
    visibility: { $in: ['connections', 'public'] } // Only visible activities
  };

  // Optional: For infinite scroll, only get activities before a certain time
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  // Step 5: Execute query with user info populated
  return this.find(query)
    .populate('userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId')
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit);
};

/**
 * getUserActivities(userId, viewerId, options)
 * --------------------------------------------
 * Get activities for a specific user's profile.
 * Respects visibility based on viewer's relationship.
 *
 * @param {string} userId - User whose activities to get
 * @param {string} viewerId - User viewing the profile
 * @param {Object} options:
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset
 *   - type: Filter by activity type
 * @returns {Array} - Array of activity documents
 *
 * VISIBILITY LOGIC:
 * - If viewing own profile: See ALL activities
 * - If connected: See 'connections' and 'public'
 * - If not connected: See only 'public'
 *
 * EXAMPLE:
 * // John viewing Sarah's profile
 * const activities = await Activity.getUserActivities(sarahId, johnId);
 * // If connected: sees connections + public activities
 * // If not connected: sees only public activities
 */
activitySchema.statics.getUserActivities = async function(userId, viewerId, options = {}) {
  const { limit = 50, skip = 0, type = null } = options;
  const Connection = mongoose.model('Connection');

  // Determine what viewer can see based on relationship
  const isSelf = userId.toString() === viewerId.toString();
  const isConnected = await Connection.areConnected(userId, viewerId);

  // Build visibility filter
  const visibilityFilter = isSelf
    ? {} // Can see all own activities (no filter)
    : isConnected
      ? { visibility: { $in: ['connections', 'public'] } } // Friends see connections + public
      : { visibility: 'public' }; // Strangers see only public

  // Build query
  const query = {
    userId,
    ...visibilityFilter
  };

  // Optional: filter by type
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * createActivity(data)
 * --------------------
 * Create and save a new activity.
 * Respects user's "showActivity" privacy setting.
 *
 * @param {Object} data - Activity fields
 * @returns {Object|null} - The created activity, or null if user disabled activities
 *
 * IMPORTANT: This checks if the user has disabled activity tracking
 * in their settings. If so, no activity is created.
 *
 * EXAMPLE:
 * const activity = await Activity.createActivity({
 *   userId: userId,
 *   type: 'project_created',
 *   entityId: project._id,
 *   entityType: 'project',
 *   entitySnapshot: { title: project.title }
 * });
 */
activitySchema.statics.createActivity = async function(data) {
  // Check user's privacy settings
  const User = mongoose.model('User');
  const user = await User.findById(data.userId);

  // Respect user's choice to hide their activity
  if (user?.socialSettings?.showActivity === false) {
    return null; // Don't create activity if user disabled it
  }

  // Create and save the activity
  const activity = new this(data);
  await activity.save();
  return activity;
};

// =============================================================================
// CONVENIENCE METHODS FOR COMMON ACTIVITIES
// =============================================================================

/**
 * logProjectCreated(userId, project)
 * ----------------------------------
 * Log when a user creates a new project.
 *
 * @param {string} userId - User who created the project
 * @param {Object} project - The project document
 * @returns {Object|null} - The created activity
 *
 * EXAMPLE:
 * await Activity.logProjectCreated(userId, newProject);
 * // Creates: "John created Q4 Marketing Plan"
 */
activitySchema.statics.logProjectCreated = async function(userId, project) {
  return this.createActivity({
    userId,
    type: 'project_created',
    entityId: project._id,
    entityType: 'project',
    entitySnapshot: {
      title: project.title,
      description: project.description?.substring(0, 200), // Truncate long descriptions
      status: project.status
    },
    visibility: 'connections'
  });
};

/**
 * logProjectCompleted(userId, project)
 * ------------------------------------
 * Log when a user completes a project.
 * This is a significant achievement worth sharing!
 *
 * @param {string} userId - User who completed the project
 * @param {Object} project - The project document
 * @returns {Object|null} - The created activity
 *
 * EXAMPLE:
 * await Activity.logProjectCompleted(userId, project);
 * // Creates: "John completed Q4 Marketing Plan"
 */
activitySchema.statics.logProjectCompleted = async function(userId, project) {
  return this.createActivity({
    userId,
    type: 'project_completed',
    entityId: project._id,
    entityType: 'project',
    entitySnapshot: {
      title: project.title,
      status: 'completed'
    },
    visibility: 'connections'
  });
};

/**
 * logTaskCompleted(userId, task)
 * ------------------------------
 * Log when a user completes a task.
 *
 * @param {string} userId - User who completed the task
 * @param {Object} task - The task document
 * @returns {Object|null} - The created activity
 *
 * EXAMPLE:
 * await Activity.logTaskCompleted(userId, task);
 * // Creates: "John completed: Review Q3 reports"
 */
activitySchema.statics.logTaskCompleted = async function(userId, task) {
  return this.createActivity({
    userId,
    type: 'task_completed',
    entityId: task._id,
    entityType: 'task',
    entitySnapshot: {
      title: task.title,
      status: 'completed'
    },
    visibility: 'connections'
  });
};

/**
 * logConnectionMade(userId1, userId2, connectionId)
 * -------------------------------------------------
 * Log when two users become connected.
 * Creates an activity for BOTH users.
 *
 * @param {string} userId1 - First user in the connection
 * @param {string} userId2 - Second user in the connection
 * @param {string} connectionId - The Connection document ID
 *
 * EXAMPLE:
 * await Activity.logConnectionMade(johnId, sarahId, connection._id);
 * // Creates two activities:
 * // - "John connected with Sarah"
 * // - "Sarah connected with John"
 */
activitySchema.statics.logConnectionMade = async function(userId1, userId2, connectionId) {
  // Get both users' info for the activity snapshots
  const User = mongoose.model('User');
  const [user1, user2] = await Promise.all([
    User.findById(userId1),
    User.findById(userId2)
  ]);

  // Create activity for BOTH users (connection is mutual)
  await Promise.all([
    // Activity for user1: "Connected with user2"
    this.createActivity({
      userId: userId1,
      type: 'connection_made',
      entityId: connectionId,
      entityType: 'connection',
      entitySnapshot: {
        title: user2?.profile?.displayName || user2?.email
      },
      visibility: 'connections'
    }),
    // Activity for user2: "Connected with user1"
    this.createActivity({
      userId: userId2,
      type: 'connection_made',
      entityId: connectionId,
      entityType: 'connection',
      entitySnapshot: {
        title: user1?.profile?.displayName || user1?.email
      },
      visibility: 'connections'
    })
  ]);
};

/**
 * logItemShared(userId, share, itemTitle)
 * ---------------------------------------
 * Log when a user shares an item with connections.
 *
 * @param {string} userId - User who shared the item
 * @param {Object} share - The Share document
 * @param {string} itemTitle - Title of the shared item
 * @returns {Object|null} - The created activity
 *
 * EXAMPLE:
 * await Activity.logItemShared(userId, share, 'Q4 Marketing Plan');
 * // Creates: "John shared Q4 Marketing Plan"
 */
activitySchema.statics.logItemShared = async function(userId, share, itemTitle) {
  return this.createActivity({
    userId,
    type: 'item_shared',
    entityId: share._id,
    entityType: 'share',
    entitySnapshot: {
      title: itemTitle
    },
    visibility: 'connections'
  });
};

// =============================================================================
// CLEANUP METHODS
// =============================================================================

/**
 * cleanupOldActivities(daysToKeep)
 * --------------------------------
 * Delete old activities to keep the database manageable.
 *
 * @param {number} daysToKeep - How many days of activities to keep (default 90)
 * @returns {Object} - MongoDB delete result
 *
 * Unlike notifications, activities don't have a "read" status,
 * so we just delete everything older than the cutoff.
 *
 * EXAMPLE:
 * // Run as a scheduled job (cron)
 * await Activity.cleanupOldActivities(90);
 * // Deletes all activities older than 90 days
 */
activitySchema.statics.cleanupOldActivities = async function(daysToKeep = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  return this.deleteMany({
    createdAt: { $lt: cutoff }
  });
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Activity model from the schema.
 * This gives us methods to:
 * - Get feed: Activity.getFeed(userId, options)
 * - Get user activities: Activity.getUserActivities(userId, viewerId, options)
 * - Log activities: Activity.logProjectCreated(), logTaskCompleted(), etc.
 * - Cleanup: Activity.cleanupOldActivities(days)
 */
const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
