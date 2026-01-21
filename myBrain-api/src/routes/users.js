/**
 * =============================================================================
 * USERS.JS - User Discovery and Social Features Routes
 * =============================================================================
 *
 * This file handles API endpoints for finding and interacting with other users.
 * These are the social features that let users connect and see each other's
 * public profiles.
 *
 * WHAT IS THIS FILE FOR?
 * ----------------------
 * While auth.js handles YOUR account (login, register), this file handles
 * interactions with OTHER users - finding people, viewing profiles, and
 * managing social settings.
 *
 * SOCIAL FEATURES IN MYBRAIN:
 * ---------------------------
 * 1. USER SEARCH: Find other users by name or email
 * 2. PUBLIC PROFILES: View another user's profile
 * 3. CONNECTIONS: See who a user is connected with
 * 4. SOCIAL SETTINGS: Control privacy (who can see your profile)
 * 5. PRESENCE: Set your online status (available, busy, away)
 *
 * PRIVACY MODEL:
 * --------------
 * Users control their privacy with three visibility levels:
 * - PUBLIC: Anyone can see your profile
 * - CONNECTIONS: Only connected users can see your profile
 * - PRIVATE: No one can see your profile
 *
 * BLOCKING:
 * ---------
 * Users can block other users. Blocked users:
 * - Don't appear in search results
 * - Can't view your profile
 * - Can't send connection requests
 *
 * ENDPOINTS IN THIS FILE:
 * -----------------------
 * - GET /users/search - Search for users
 * - GET /users/:id/profile - View a user's public profile
 * - GET /users/:id/connections - View a user's connections
 * - PATCH /users/social-settings - Update your privacy settings
 * - PATCH /users/presence - Update your online status
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Express router for handling HTTP requests.
 */
import express from 'express';

/**
 * Mongoose for MongoDB ObjectId validation.
 * We use mongoose.Types.ObjectId.isValid() to check if IDs are valid
 * before querying the database (prevents errors and injection attacks).
 */
import mongoose from 'mongoose';

/**
 * User model for database operations.
 */
import User from '../models/User.js';

/**
 * Connection model for managing user connections (like "friends").
 * Connections have a status: pending, accepted, rejected.
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model for managing blocked users.
 * Blocking is mutual - if A blocks B, neither can see the other.
 */
import UserBlock from '../models/UserBlock.js';

/**
 * requireAuth middleware ensures only logged-in users can access routes.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError for structured error logging.
 */
import { attachError } from '../middleware/errorHandler.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Create an Express router for user routes.
 * This router will be mounted at /users in the main app.
 */
const router = express.Router();

// =============================================================================
// ROUTE: GET /users/search
// =============================================================================

/**
 * GET /users/search
 * -----------------
 * Searches for users by name or email.
 *
 * QUERY PARAMETERS:
 * - q: Search query (minimum 2 characters)
 * - limit: Max results to return (default 20)
 * - skip: Number of results to skip for pagination
 *
 * EXAMPLE:
 * GET /users/search?q=john&limit=10
 *
 * SEARCH BEHAVIOR:
 * - Case-insensitive (john matches John, JOHN, jOhN)
 * - Searches: displayName, firstName, lastName, email
 * - Excludes: Blocked users, self
 *
 * RESPONSE FORMAT:
 * {
 *   "users": [
 *     {
 *       "_id": "...",
 *       "profile": { displayName, firstName, lastName, avatarUrl },
 *       "stats": { connectionCount },
 *       "connectionStatus": "pending" | "accepted" | null,
 *       "connectionId": "..." | null,
 *       "isRequester": true | false | null
 *     }
 *   ],
 *   "total": 42,
 *   "hasMore": true
 * }
 *
 * The connectionStatus tells the frontend what to show:
 * - null: Show "Connect" button
 * - "pending" + isRequester=true: Show "Request Sent"
 * - "pending" + isRequester=false: Show "Accept Request"
 * - "accepted": Show "Connected" or "Message"
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    // =========================================================================
    // PARSE AND VALIDATE QUERY PARAMETERS
    // =========================================================================

    const { q, limit = 20, skip = 0 } = req.query;

    // Require minimum 2 characters to prevent overly broad searches
    // (searching for "a" would return too many results)
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
        code: 'QUERY_TOO_SHORT'
      });
    }

    const searchTerm = q.trim();

    // =========================================================================
    // GET EXCLUDED USER IDS (BLOCKED USERS + SELF)
    // =========================================================================

    // Get IDs of users that should be excluded from search results:
    // - Users who blocked the current user
    // - Users the current user blocked
    // - The current user themselves
    const excludedIds = await UserBlock.getAllExcludedUserIds(req.user._id);
    excludedIds.push(req.user._id.toString()); // Exclude self

    // =========================================================================
    // BUILD SEARCH QUERY
    // =========================================================================

    // MongoDB query with multiple conditions
    const searchQuery = {
      // Exclude blocked users and self
      _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) },
      // Only search active accounts (not disabled/deleted)
      status: 'active',
      // Search across multiple fields using regex
      // $or means: match ANY of these conditions
      $or: [
        { 'profile.displayName': { $regex: searchTerm, $options: 'i' } },  // Case-insensitive
        { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // =========================================================================
    // EXECUTE SEARCH QUERY
    // =========================================================================

    // Find matching users with limited fields
    // .select() specifies which fields to include (reduces data transfer)
    const users = await User.find(searchQuery)
      .select('email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId profile.bio socialSettings.profileVisibility socialStats')
      .limit(parseInt(limit))      // Limit results per page
      .skip(parseInt(skip))        // Skip for pagination
      .sort({ 'socialStats.connectionCount': -1 });  // Popular users first

    // Get total count for pagination ("Showing 1-20 of 42 results")
    const total = await User.countDocuments(searchQuery);

    // =========================================================================
    // GET CONNECTION STATUS FOR EACH USER
    // =========================================================================

    // For each result, we need to know the connection status with current user
    // This determines what button to show (Connect, Pending, Message, etc.)

    const userIds = users.map(u => u._id);

    // Find all connections between current user and search results
    // Connection can go either direction (requesterId or addresseeId)
    const connections = await Connection.find({
      $or: [
        { requesterId: req.user._id, addresseeId: { $in: userIds } },
        { requesterId: { $in: userIds }, addresseeId: req.user._id }
      ]
    });

    // =========================================================================
    // MAP CONNECTION STATUS TO EACH USER
    // =========================================================================

    // Create a map for O(1) lookup: userId -> connectionInfo
    const connectionMap = new Map();

    connections.forEach(conn => {
      // Determine which user in the connection is NOT the current user
      const otherUserId = conn.requesterId.toString() === req.user._id.toString()
        ? conn.addresseeId.toString()
        : conn.requesterId.toString();

      connectionMap.set(otherUserId, {
        status: conn.status,
        connectionId: conn._id,
        isRequester: conn.requesterId.toString() === req.user._id.toString()
      });
    });

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================

    const results = users.map(user => {
      const connInfo = connectionMap.get(user._id.toString());

      return {
        _id: user._id,
        profile: {
          displayName: user.profile?.displayName,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          avatarUrl: user.profile?.avatarUrl,
          defaultAvatarId: user.profile?.defaultAvatarId,
          // Only show bio if profile isn't private
          bio: user.socialSettings?.profileVisibility !== 'private' ? user.profile?.bio : undefined
        },
        stats: user.socialStats,
        connectionStatus: connInfo?.status || null,
        connectionId: connInfo?.connectionId || null,
        isRequester: connInfo?.isRequester || null
      };
    });

    res.json({
      users: results,
      total,
      hasMore: parseInt(skip) + users.length < total  // More pages available?
    });

  } catch (error) {
    attachError(req, error, { operation: 'user_search' });
    res.status(500).json({
      error: 'Failed to search users',
      code: 'SEARCH_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /users/:id/profile
// =============================================================================

/**
 * GET /users/:id/profile
 * ----------------------
 * Gets the public profile for a specific user.
 *
 * PATH PARAMETERS:
 * - id: MongoDB ObjectId of the user to view
 *
 * PRIVACY RULES:
 * - If blocked → Returns 404 (pretend user doesn't exist)
 * - If private → Returns limited info
 * - If connections-only → Returns limited info unless connected
 * - If public → Returns full profile
 *
 * RESPONSE FORMAT:
 * {
 *   "profile": {
 *     "_id": "...",
 *     "profile": { displayName, firstName, lastName, avatarUrl, bio, ... },
 *     "stats": { connectionCount, ... }
 *   },
 *   "connection": {
 *     "status": "accepted" | "pending" | null,
 *     "connectionId": "...",
 *     "isRequester": true | false,
 *     "connectedAt": "2024-01-15T..."
 *   },
 *   "isOwnProfile": false,
 *   "canMessage": true,
 *   "canConnect": true
 * }
 *
 * SPECIAL FLAGS:
 * - canMessage: Whether current user can send messages
 * - canConnect: Whether current user can send connection request
 */
router.get('/:id/profile', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // =========================================================================
    // VALIDATE USER ID FORMAT
    // =========================================================================

    // MongoDB ObjectIds have a specific format
    // Check before querying to prevent errors and injection attacks
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // =========================================================================
    // CHECK FOR BLOCKS
    // =========================================================================

    // If there's a block between users (either direction), pretend user doesn't exist
    // This prevents blocked users from knowing they're blocked
    const hasBlock = await UserBlock.hasBlockBetween(req.user._id, id);

    if (hasBlock) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // =========================================================================
    // FIND USER
    // =========================================================================

    const user = await User.findById(id);

    if (!user || user.status !== 'active') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // =========================================================================
    // GET CONNECTION STATUS
    // =========================================================================

    // Check if users are connected (friends)
    const isConnected = await Connection.areConnected(req.user._id, id);

    // Get detailed connection info (status, who requested, when accepted)
    const connection = await Connection.getConnection(req.user._id, id);

    let connectionInfo = null;
    if (connection) {
      connectionInfo = {
        status: connection.status,
        connectionId: connection._id,
        isRequester: connection.requesterId.toString() === req.user._id.toString(),
        connectedAt: connection.acceptedAt
      };
    }

    // =========================================================================
    // CHECK IF VIEWING OWN PROFILE
    // =========================================================================

    const isOwnProfile = req.user._id.toString() === id;

    // =========================================================================
    // GET PUBLIC PROFILE DATA
    // =========================================================================

    // toPublicProfile() respects privacy settings
    // Returns different fields based on visibility and connection status
    const publicProfile = user.toPublicProfile(req.user, isConnected);

    // =========================================================================
    // DETERMINE AVAILABLE ACTIONS
    // =========================================================================

    res.json({
      profile: publicProfile,
      connection: connectionInfo,
      isOwnProfile,
      // Can message if messaging settings allow it
      canMessage: await req.user.canMessageUser(user, isConnected),
      // Can connect if: not own profile, no existing connection, and user accepts requests
      canConnect: !isOwnProfile && !connection && req.user.canRequestConnection(user)
    });

  } catch (error) {
    attachError(req, error, { operation: 'get_user_profile' });
    res.status(500).json({
      error: 'Failed to get user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /users/:id/connections
// =============================================================================

/**
 * GET /users/:id/connections
 * --------------------------
 * Gets a user's connections (friend list).
 *
 * PATH PARAMETERS:
 * - id: MongoDB ObjectId of the user whose connections to view
 *
 * QUERY PARAMETERS:
 * - limit: Max results (default 20)
 * - skip: Pagination offset
 *
 * PRIVACY RULES:
 * - Own profile: Always can see
 * - Private visibility: Cannot see
 * - Connections visibility: Only if connected
 * - Public visibility: Can see
 *
 * RESPONSE FORMAT:
 * {
 *   "connections": [
 *     {
 *       "_id": "connectionId",
 *       "user": {
 *         "_id": "userId",
 *         "profile": { displayName, avatarUrl, ... }
 *       },
 *       "connectedAt": "2024-01-15T..."
 *     }
 *   ],
 *   "total": 42,
 *   "hasMore": true
 * }
 */
router.get('/:id/connections', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // =========================================================================
    // VALIDATE USER ID
    // =========================================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // =========================================================================
    // CHECK FOR BLOCKS
    // =========================================================================

    const hasBlock = await UserBlock.hasBlockBetween(req.user._id, id);

    if (hasBlock) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // =========================================================================
    // FIND USER
    // =========================================================================

    const user = await User.findById(id);

    if (!user || user.status !== 'active') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // =========================================================================
    // CHECK PRIVACY PERMISSIONS
    // =========================================================================

    const isOwnProfile = req.user._id.toString() === id;
    const isConnected = await Connection.areConnected(req.user._id, id);
    const visibility = user.socialSettings?.profileVisibility || 'public';

    // If profile is private and not viewing own profile, deny access
    if (!isOwnProfile && visibility === 'private') {
      return res.status(403).json({
        error: 'This user\'s connections are private',
        code: 'CONNECTIONS_PRIVATE'
      });
    }

    // If visibility is "connections only" and viewer isn't connected, deny access
    if (!isOwnProfile && visibility === 'connections' && !isConnected) {
      return res.status(403).json({
        error: 'You must be connected to view this user\'s connections',
        code: 'NOT_CONNECTED'
      });
    }

    // =========================================================================
    // GET USER'S CONNECTIONS
    // =========================================================================

    const connections = await Connection.getConnections(id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // =========================================================================
    // FILTER OUT BLOCKED USERS FROM VIEWER'S PERSPECTIVE
    // =========================================================================

    // The target user might be connected to someone the viewer has blocked
    // Don't show those in the list
    const excludedIds = await UserBlock.getAllExcludedUserIds(req.user._id);
    const excludeSet = new Set(excludedIds);

    // Transform connections and filter out blocked users
    const transformedConnections = connections
      .map(conn => {
        // getOtherUser() returns the user that isn't the one whose connections we're viewing
        const otherUser = conn.getOtherUser(id);
        return {
          _id: conn._id,
          user: {
            _id: otherUser._id,
            profile: otherUser.profile
          },
          connectedAt: conn.acceptedAt
        };
      })
      .filter(conn => !excludeSet.has(conn.user._id.toString()));

    // Get total count for pagination
    const total = await Connection.getConnectionCount(id);

    res.json({
      connections: transformedConnections,
      total,
      hasMore: parseInt(skip) + connections.length < total
    });

  } catch (error) {
    attachError(req, error, { operation: 'get_user_connections' });
    res.status(500).json({
      error: 'Failed to get user connections',
      code: 'FETCH_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /users/social-settings
// =============================================================================

/**
 * PATCH /users/social-settings
 * ----------------------------
 * Updates the current user's social/privacy settings.
 *
 * REQUEST BODY (all fields optional):
 * {
 *   "profileVisibility": "public" | "connections" | "private",
 *   "allowConnectionRequests": true | false,
 *   "allowMessages": "anyone" | "connections" | "none",
 *   "showActivity": true | false,
 *   "showOnlineStatus": true | false,
 *   "visibleFields": {
 *     "bio": true | false,
 *     "location": true | false,
 *     "website": true | false,
 *     "joinedDate": true | false,
 *     "stats": true | false
 *   }
 * }
 *
 * SETTINGS EXPLAINED:
 * - profileVisibility: Who can see your full profile
 * - allowConnectionRequests: Whether others can send friend requests
 * - allowMessages: Who can send you direct messages
 * - showActivity: Whether your activity is visible
 * - showOnlineStatus: Whether to show "Online now"
 * - visibleFields: Fine-grained control over individual fields
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Social settings updated",
 *   "socialSettings": { ... updated settings ... }
 * }
 */
router.patch('/social-settings', requireAuth, async (req, res) => {
  try {
    // =========================================================================
    // DEFINE ALLOWED FIELDS
    // =========================================================================

    // Whitelist of settings that can be updated
    // This prevents users from updating arbitrary fields
    const allowedSettings = [
      'profileVisibility',
      'allowConnectionRequests',
      'allowMessages',
      'showActivity',
      'showOnlineStatus'
    ];

    const allowedVisibleFields = ['bio', 'location', 'website', 'joinedDate', 'stats'];

    // =========================================================================
    // BUILD UPDATE OBJECT
    // =========================================================================

    const updates = {};

    // Handle top-level settings
    for (const field of allowedSettings) {
      if (req.body[field] !== undefined) {
        // Use dot notation for nested updates in MongoDB
        // 'socialSettings.profileVisibility' updates only that field
        updates[`socialSettings.${field}`] = req.body[field];
      }
    }

    // Handle nested visibleFields object
    if (req.body.visibleFields) {
      for (const field of allowedVisibleFields) {
        if (req.body.visibleFields[field] !== undefined) {
          updates[`socialSettings.visibleFields.${field}`] = req.body.visibleFields[field];
        }
      }
    }

    // =========================================================================
    // VALIDATE UPDATES
    // =========================================================================

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid settings to update',
        code: 'NO_UPDATES'
      });
    }

    // =========================================================================
    // APPLY UPDATES
    // =========================================================================

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },        // $set updates only specified fields
      { new: true, runValidators: true }  // Return updated doc, validate values
    );

    res.json({
      message: 'Social settings updated',
      socialSettings: user.socialSettings
    });

  } catch (error) {
    attachError(req, error, { operation: 'update_social_settings' });

    // Handle validation errors (e.g., invalid profileVisibility value)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update social settings',
      code: 'UPDATE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /users/presence
// =============================================================================

/**
 * PATCH /users/presence
 * ---------------------
 * Updates the current user's online presence/status.
 *
 * REQUEST BODY:
 * {
 *   "status": "available" | "busy" | "away" | "dnd" | "offline",
 *   "statusMessage": "In a meeting" (optional, max 100 chars)
 * }
 *
 * STATUS VALUES:
 * - available: Green dot, accepting messages
 * - busy: Yellow dot, might be delayed responding
 * - away: Grey dot, not actively using app
 * - dnd: Red dot, "do not disturb"
 * - offline: No dot, appear offline
 *
 * SUCCESS RESPONSE:
 * {
 *   "message": "Presence updated",
 *   "presence": {
 *     "status": "busy",
 *     "statusMessage": "In a meeting",
 *     "lastSeenAt": "2024-01-15T..."
 *   }
 * }
 */
router.patch('/presence', requireAuth, async (req, res) => {
  try {
    const { status, statusMessage } = req.body;

    // =========================================================================
    // UPDATE PRESENCE
    // =========================================================================

    // setPresence() is a method on the User model that validates
    // the status and updates the presence object
    const user = await req.user.setPresence(status, statusMessage);

    res.json({
      message: 'Presence updated',
      presence: user.presence
    });

  } catch (error) {
    attachError(req, error, { operation: 'update_presence' });

    // Handle specific error for invalid status value
    if (error.message === 'Invalid status') {
      return res.status(400).json({
        error: 'Invalid status. Valid values: available, busy, away, dnd, offline',
        code: 'INVALID_STATUS'
      });
    }

    res.status(500).json({
      error: 'Failed to update presence',
      code: 'UPDATE_ERROR'
    });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Export the router to be mounted in the main app.
 *
 * USAGE IN SERVER.JS:
 * import usersRoutes from './routes/users.js';
 * app.use('/users', usersRoutes);
 *
 * This makes all routes available at:
 * - GET /users/search
 * - GET /users/:id/profile
 * - GET /users/:id/connections
 * - PATCH /users/social-settings
 * - PATCH /users/presence
 */
export default router;
