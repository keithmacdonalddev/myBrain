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
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools we need to handle user discovery
// and social features. We import the web framework, database models, and
// middleware for authentication and error handling.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PATCH)
 * - Define routes (URLs for user search and profile viewing)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Mongoose provides utilities for working with MongoDB ObjectIds.
 * We use mongoose.Types.ObjectId to:
 * - Validate that ID strings are valid MongoDB ObjectIds
 * - Convert ID strings to ObjectId type for database queries
 * - Prevent injection attacks from invalid IDs
 */
import mongoose from 'mongoose';

/**
 * User model represents user accounts in the database.
 * We query this to:
 * - Search for users by name/email
 * - Get user profile information
 * - View connection counts and public info
 * - Check profile visibility settings
 */
import User from '../models/User.js';

/**
 * Connection model represents relationships between users (like "friends").
 * Connections have a status: pending (awaiting acceptance) or accepted.
 * We query this to:
 * - Check if two users are already connected
 * - See connection requests (pending)
 * - Determine who initiated the connection (for UI messaging)
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model tracks users who have blocked each other.
 * Blocking is:
 * - Mutual: If A blocks B, both can't see each other
 * - Private: Users don't know they've been blocked
 * - Revocable: Can unblock anytime
 *
 * We query this to:
 * - Exclude blocked users from search results
 * - Prevent blocked users from viewing profiles
 * - Prevent connection requests between blocked users
 */
import UserBlock from '../models/UserBlock.js';

/**
 * requireAuth is middleware that checks if the user is authenticated.
 * It verifies they have a valid JWT token or API key.
 * ALL routes in this file require authentication (no anonymous access).
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError is logging middleware that tracks errors for debugging.
 * We use it to log unexpected errors to the system logs.
 */
import { attachError } from '../middleware/errorHandler.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all user discovery and social routes together

const router = express.Router();

// =============================================================================
// USER DISCOVERY - Search for Users and View Public Profiles
// =============================================================================
// These endpoints allow users to find each other and connect.
// All search results respect privacy settings and blocking.

/**
 * GET /users/search
 * Search for users by name or email
 *
 * This endpoint finds other users in the platform so users can:
 * - Discover people to connect with
 * - Add friends/colleagues
 * - Share content with specific people
 * - Build their professional network
 *
 * SEARCH FIELDS:
 * ---------------
 * - displayName: How the user appears ("Sarah J.", "Mike Chen")
 * - firstName & lastName: Full name components
 * - email: User's email address
 * - All searches are case-insensitive
 *
 * PRIVACY & BLOCKING:
 * ------------------
 * - Excludes blocked users (mutual blocks)
 * - Excludes your own account
 * - Respects profileVisibility settings (won't show if private)
 * - Doesn't reveal who blocked whom
 *
 * CONNECTION STATUS:
 * ------------------
 * Results include connection status to show the frontend what button to display:
 * - No connection: Show "Connect" button
 * - Pending (you sent): Show "Request Sent"
 * - Pending (they sent): Show "Accept" button
 * - Accepted: Show "Message" or "Connected"
 *
 * EXAMPLE QUERY:
 * GET /users/search?q=john&limit=20&skip=0
 *
 * EXAMPLE RESPONSE:
 * {
 *   "users": [
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "profile": {
 *         "displayName": "John Smith",
 *         "firstName": "John",
 *         "lastName": "Smith",
 *         "avatarUrl": "https://s3.../avatar123.jpg"
 *       },
 *       "socialStats": { "connectionCount": 42 },
 *       "connectionStatus": null,  // Not connected yet
 *       "connectionId": null,
 *       "isRequester": null
 *     }
 *   ],
 *   "total": 127,
 *   "hasMore": true  // More results available
 * }
 *
 * @query {string} q - Search term (required, min 2 chars)
 * @query {number} limit - Results per page (default 20, max 50)
 * @query {number} skip - Results to skip for pagination (default 0)
 * @returns {Object} User list with connection status for each
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Parse and Validate Query Parameters
    // =============================================================================
    // Extract search parameters from URL query string
    const { q, limit = 20, skip = 0 } = req.query;

    // =============================================================================
    // STEP 2: Validate Search Query Length
    // =============================================================================
    // Minimum 2 characters prevents overly broad searches
    // WHY: Searching for "a" would return thousands of results (slow, useless)
    // Minimum requirement balances usability with performance
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
        code: 'QUERY_TOO_SHORT'
      });
    }

    // Trim whitespace from search term
    const searchTerm = q.trim();

    // =============================================================================
    // STEP 3: Get Excluded User IDs (Blocked Users + Self)
    // =============================================================================
    // We need to exclude certain users from results:
    // - Users who blocked the current user (mutual block)
    // - Users the current user blocked (mutual block)
    // - The current user themselves
    // WHY: Blocked users shouldn't see each other; you don't search for yourself
    const excludedIds = await UserBlock.getAllExcludedUserIds(req.user._id);
    excludedIds.push(req.user._id.toString());  // Also exclude current user

    // =============================================================================
    // STEP 4: Build MongoDB Search Query
    // =============================================================================
    // Build a MongoDB query with multiple conditions:
    // - Exclude blocked users and self (using $nin = "not in")
    // - Only active accounts (not suspended/deleted)
    // - Search across multiple profile fields (using $or = "any of these")
    // - Case-insensitive regex search
    const searchQuery = {
      // Exclude blocked users and current user
      _id: { $nin: excludedIds.map(id => new mongoose.Types.ObjectId(id)) },
      // Only search active (not suspended, deleted, etc)
      status: 'active',
      // Search across multiple fields - match ANY of these
      // $or means: if displayName matches OR firstName matches OR email matches...
      $or: [
        { 'profile.displayName': { $regex: searchTerm, $options: 'i' } },  // Case-insensitive
        { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    // =============================================================================
    // STEP 5: Execute Search Query with Pagination
    // =============================================================================
    // Query the database for matching users
    // .select() picks only the fields we need (reduces bandwidth)
    // .sort() puts most-connected users first (more likely to be relevant)
    const users = await User.find(searchQuery)
      .select('email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId profile.bio socialSettings.profileVisibility socialStats')
      .limit(parseInt(limit) || 20)       // Limit results per page
      .skip(parseInt(skip) || 0)          // Skip for pagination
      .sort({ 'socialStats.connectionCount': -1 });  // Most popular first

    // Count total matching users (for "page 1 of 5" info)
    const total = await User.countDocuments(searchQuery);

    // =============================================================================
    // STEP 6: Fetch Connection Status for Each User
    // =============================================================================
    // For each search result, we need to show the relationship with current user.
    // The frontend uses this to show the right button (Connect, Message, etc).
    //
    // Connections can go either direction:
    // - Current user sent request to other user
    // - Other user sent request to current user
    const userIds = users.map(u => u._id);

    // Find all connections between current user and these search results
    const connections = await Connection.find({
      $or: [
        // Connections where current user is the requester
        { requesterId: req.user._id, addresseeId: { $in: userIds } },
        // Connections where current user is the addressee
        { requesterId: { $in: userIds }, addresseeId: req.user._id }
      ]
    });

    // =============================================================================
    // STEP 7: Create Connection Status Map for Quick Lookup
    // =============================================================================
    // Build a map: userId -> { status, connectionId, isRequester }
    // This enables O(1) lookup when building the response
    const connectionMap = new Map();

    connections.forEach(conn => {
      // Figure out which user in the connection is NOT the current user
      // (We already know req.user._id, so find the other side)
      const otherUserId = conn.requesterId.toString() === req.user._id.toString()
        ? conn.addresseeId.toString()
        : conn.requesterId.toString();

      // Store the connection info keyed by the other user's ID
      connectionMap.set(otherUserId, {
        status: conn.status,          // "pending" or "accepted"
        connectionId: conn._id,       // For modification requests
        isRequester: conn.requesterId.toString() === req.user._id.toString()  // Did WE send the request?
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
