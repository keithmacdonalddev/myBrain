/**
 * =============================================================================
 * CONNECTIONS.JS - Social Connection Routes
 * =============================================================================
 *
 * This file handles all social features in myBrain - connecting with other
 * users, managing connections, and blocking users.
 *
 * WHAT ARE CONNECTIONS?
 * ---------------------
 * Connections are relationships between users. Think of them like "friends"
 * on social media. When two users are connected:
 * - They can message each other directly
 * - They can see basic profile information
 * - They might share content with each other
 * - They're part of each other's social network
 *
 * CONNECTION REQUEST FLOW:
 * -------------------------
 * 1. USER A sends request to USER B (pending state)
 * 2. USER B receives notification of request
 * 3. USER B accepts or declines request
 * 4. If accepted → connection becomes "active"
 * 5. If declined → connection is removed
 *
 * CONNECTION STATES:
 * ------------------
 * - PENDING: A→B sent request, B hasn't responded
 * - ACTIVE: Both users agreed, connection established
 * - BLOCKED: One user blocked the other
 *
 * BLOCKING:
 * ---------
 * When you block someone:
 * - They can't see your profile
 * - They can't send messages
 * - They can't send connection requests
 * - Previous messages/connections might be hidden
 * - They don't know they're blocked (stays private)
 *
 * ENDPOINTS:
 * -----------
 * - POST /connections - Send connection request
 * - GET /connections - Get all connections (with filter options)
 * - GET /connections/:userId - Get connection status with specific user
 * - POST /connections/:userId/accept - Accept pending request
 * - POST /connections/:userId/decline - Decline pending request
 * - DELETE /connections/:userId - Remove existing connection
 * - POST /connections/:userId/block - Block a user
 * - POST /connections/:userId/unblock - Unblock a user
 * - GET /connections/:userId/is-blocked - Check if user is blocked
 * - GET /connections/pending - Get pending requests
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch/delete defines a different connection operation.
 */
import express from 'express';

/**
 * Mongoose is our MongoDB ODM (Object Document Mapper).
 * It lets us work with MongoDB documents as JavaScript objects
 * and provides validation, hooks, and query building.
 * We use it here to validate IDs (ObjectId.isValid) before database queries.
 */
import mongoose from 'mongoose';

/**
 * User model represents a user account.
 * Contains profile info, social stats, and connection preferences.
 * We use it to:
 * - Check if users exist before connecting
 * - Update connection counts on success
 * - Fetch user profile info when needed
 */
import User from '../models/User.js';

/**
 * Connection model represents a relationship between two users.
 * Tracks:
 * - Who requested the connection (requesterId)
 * - Who received it (addresseeId)
 * - Status (pending, accepted, declined)
 * - Timestamps (createdAt, acceptedAt, declinedAt)
 * - Optional message and source of connection
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model represents a block relationship between users.
 * When user A blocks user B:
 * - They can't see each other's profiles
 * - They can't send messages
 * - They can't create connections
 * - The block is private (B doesn't know they're blocked)
 */
import UserBlock from '../models/UserBlock.js';

/**
 * Auth middleware checks that the user is logged in.
 * Every connection request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware captures unexpected errors and logs them.
 * This helps us debug issues by recording what went wrong and the context.
 * We call attachError(req, error, {operation: '...'}) to log errors.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for a specific connection.
 * Example: attachEntityId(req, 'connectionId', connection._id) for audit trail.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all connection-related endpoints together
const router = express.Router();

/**
 * POST /connections
 * Send a connection request to another user
 *
 * WHAT IT DOES:
 * Creates a connection request to another user. If they accept, you become connected
 * and can message each other and share content.
 *
 * REQUEST BODY:
 * {
 *   userId: "507f1f77bcf86cd799439011" (required),
 *   message: "I'd like to connect!",
 *   source: "search"  (optional: search, profile, recommendation)
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   message: "Connection request sent",
 *   connection: { id: "...", status: "pending", addresseeId: {...}, ... }
 * }
 *
 * VALIDATION:
 * - Target user must exist
 * - Can't connect to yourself
 * - Can't connect if blocked by target or you blocked them
 * - Target must allow connection requests in their settings
 * - Can't duplicate pending requests (unless retrying after decline)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract and validate required fields
    const { userId, message, source = 'search' } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Step 2: Validate userId format
    // Prevents malformed IDs before database queries
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Step 3: Prevent self-connection
    // Users can't send connection requests to themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot send connection request to yourself',
        code: 'SELF_CONNECTION'
      });
    }

    // Step 4: Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Step 5: Check if blocked (either direction)
    // Blocks prevent all connection attempts
    const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
    if (hasBlock) {
      return res.status(403).json({
        error: 'Cannot connect with this user',
        code: 'USER_BLOCKED'
      });
    }

    // Step 6: Check if target user allows connection requests
    // Users can disable connection requests in privacy settings
    if (!req.user.canRequestConnection(targetUser)) {
      return res.status(403).json({
        error: 'This user is not accepting connection requests',
        code: 'CONNECTIONS_DISABLED'
      });
    }

    // Step 7: Check if connection already exists in any form
    const existingConnection = await Connection.getConnection(req.user._id, userId);
    if (existingConnection) {
      // CASE A: Already connected
      if (existingConnection.status === 'accepted') {
        return res.status(409).json({
          error: 'Already connected with this user',
          code: 'ALREADY_CONNECTED'
        });
      }

      // CASE B: Pending request exists
      if (existingConnection.status === 'pending') {
        // Check who sent the pending request
        if (existingConnection.requesterId.toString() === req.user._id.toString()) {
          // WE sent it - can't send again
          return res.status(409).json({
            error: 'Connection request already sent',
            code: 'REQUEST_PENDING'
          });
        } else {
          // THEY sent it - suggest accepting instead
          return res.status(409).json({
            error: 'This user has already sent you a connection request. You can accept it instead.',
            code: 'INCOMING_REQUEST_EXISTS',
            connectionId: existingConnection._id
          });
        }
      }

      // CASE C: Previously declined - allow retry
      if (existingConnection.status === 'declined') {
        // Update existing record to pending instead of creating new
        existingConnection.status = 'pending';
        existingConnection.requesterId = req.user._id;
        existingConnection.addresseeId = userId;
        existingConnection.requestMessage = message;
        existingConnection.connectionSource = source;
        existingConnection.declinedAt = null;
        await existingConnection.save();

        attachEntityId(req, 'connectionId', existingConnection._id);
        attachEntityId(req, 'targetUserId', userId);
        req.eventName = 'connection.request.success';

        return res.status(201).json({
          message: 'Connection request sent',
          connection: existingConnection
        });
      }
    }

    // Step 8: Create new connection request
    // All validations passed - safe to proceed
    const connection = new Connection({
      requesterId: req.user._id,        // Who's asking
      addresseeId: userId,               // Who's being asked
      requestMessage: message,           // Optional personal message
      connectionSource: source,          // Where the request came from
      status: 'pending'                  // Awaiting response
    });

    await connection.save();

    // Step 9: Populate target user info in response
    await connection.populate('addresseeId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Step 10: Log the successful request for audit trail
    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.request.success';

    // Step 11: Return created connection
    res.status(201).json({
      message: 'Connection request sent',
      connection
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'connection_request' });
    res.status(500).json({
      error: 'Failed to send connection request',
      code: 'CONNECTION_ERROR'
    });
  }
});

/**
 * GET /connections
 * Get all accepted connections for the current user
 *
 * WHAT IT DOES:
 * Returns the user's list of people they're connected with.
 * Only includes accepted connections (not pending requests).
 *
 * QUERY PARAMETERS:
 * - limit: How many connections to return (default 50, max 100)
 * - skip: How many to skip (for pagination)
 *
 * EXAMPLE REQUEST:
 * GET /connections?limit=25&skip=0
 *
 * EXAMPLE RESPONSE:
 * {
 *   connections: [
 *     { user: {...profile}, connectedAt: "2025-02-01T10:00:00Z", connectionSource: "search" },
 *     { user: {...profile}, connectedAt: "2025-02-05T14:30:00Z", connectionSource: "recommendation" }
 *   ],
 *   total: 47,
 *   hasMore: true
 * }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 50, skip = 0 } = req.query;

    // Step 2: Fetch accepted connections from database
    // Service queries for status === 'accepted' connections
    const connections = await Connection.getConnections(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Transform responses to put the "other user" first
    // For each connection, extract the user we're connected with (not ourselves)
    const transformedConnections = connections.map(conn => {
      const otherUser = conn.getOtherUser(req.user._id);  // Get the other person's profile
      return {
        _id: conn._id,                           // Connection ID
        user: otherUser,                         // The connected user's profile
        connectedAt: conn.acceptedAt,            // When they accepted
        connectionSource: conn.connectionSource  // How they met (search, recommendation, etc)
      };
    });

    // Step 4: Get total count for pagination
    const total = await Connection.getConnectionCount(req.user._id);

    // Step 5: Return connections with pagination info
    res.json({
      connections: transformedConnections,
      total,                                     // Total connections
      hasMore: parseInt(skip) + connections.length < total  // More results available?
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_connections' });
    res.status(500).json({
      error: 'Failed to get connections',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/pending
 * Get pending connection requests (received from others)
 *
 * WHAT IT DOES:
 * Returns connection requests you've received but haven't responded to yet.
 * These are people asking to connect with you.
 *
 * @param {number} req.query.limit - Results per page (default 50, max 100)
 * @param {number} req.query.skip - Results to skip for pagination (default 0)
 *
 * @returns {Object} - Pending requests:
 * {
 *   requests: [
 *     {
 *       _id: "conn123",
 *       user: {
 *         _id: "user456",
 *         email: "john@example.com",
 *         profile: { displayName: "John Smith", avatarUrl: "..." }
 *       },
 *       message: "Let's connect!",
 *       source: "search",
 *       sentAt: "2025-02-15T10:00:00Z"
 *     }
 *   ],
 *   total: 3,
 *   hasMore: false
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * GET /connections/pending?limit=25
 *
 * EXAMPLE RESPONSE:
 * {
 *   requests: [
 *     { _id: "...", user: {...}, message: "Let's connect!", sentAt: "2025-02-15T10:00:00Z" }
 *   ],
 *   total: 3,
 *   hasMore: false
 * }
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 50, skip = 0 } = req.query;

    // Step 2: Fetch pending requests sent TO the current user
    // Query: status === 'pending' AND addresseeId === req.user._id
    const requests = await Connection.getPendingRequests(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Get total count for pagination
    const total = await Connection.getPendingCount(req.user._id);

    // Step 4: Return pending requests with pagination info
    res.json({
      requests: requests.map(req => ({
        _id: req._id,                   // Connection request ID
        user: req.requesterId,          // The person who sent the request
        message: req.requestMessage,    // Optional message they included
        source: req.connectionSource,   // Where they found us
        sentAt: req.createdAt           // When they sent it
      })),
      total,                            // Total pending requests
      hasMore: parseInt(skip) + requests.length < total  // More results available?
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_pending_requests' });
    res.status(500).json({
      error: 'Failed to get pending requests',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/sent
 * Get sent connection requests that are still pending
 *
 * WHAT IT DOES:
 * Returns connection requests you've sent but haven't been responded to yet.
 * These are people you're waiting to hear back from.
 *
 * @param {number} req.query.limit - Results per page (default 50, max 100)
 * @param {number} req.query.skip - Results to skip for pagination (default 0)
 *
 * @returns {Object} - Sent requests:
 * {
 *   requests: [
 *     {
 *       _id: "conn123",
 *       user: {
 *         _id: "user789",
 *         email: "alice@example.com",
 *         profile: { displayName: "Alice Johnson", avatarUrl: "..." }
 *       },
 *       message: "I'd love to connect!",
 *       source: "profile",
 *       sentAt: "2025-02-10T10:00:00Z"
 *     }
 *   ],
 *   total: 5,
 *   hasMore: false
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * GET /connections/sent?limit=25
 *
 * EXAMPLE RESPONSE:
 * {
 *   requests: [
 *     { _id: "...", user: {...}, message: "I'd love to connect!", sentAt: "2025-02-10T10:00:00Z" }
 *   ],
 *   total: 5,
 *   hasMore: false
 * }
 */
router.get('/sent', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 50, skip = 0 } = req.query;

    // Step 2: Fetch requests SENT BY the current user that are still pending
    // Query: status === 'pending' AND requesterId === req.user._id
    const requests = await Connection.getSentRequests(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Get total count for pagination
    const total = await Connection.countDocuments({
      requesterId: req.user._id,
      status: 'pending'
    });

    // Step 4: Return sent requests with pagination info
    res.json({
      requests: requests.map(req => ({
        _id: req._id,                   // Connection request ID
        user: req.addresseeId,          // The person we sent the request to
        message: req.requestMessage,    // Optional message we included
        source: req.connectionSource,   // Where we found them
        sentAt: req.createdAt           // When we sent it
      })),
      total,                            // Total sent requests pending
      hasMore: parseInt(skip) + requests.length < total  // More results available?
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_sent_requests' });
    res.status(500).json({
      error: 'Failed to get sent requests',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/counts
 * Get connection and request counts (lightweight for badges/UI)
 *
 * WHAT IT DOES:
 * Returns counts for:
 * - Accepted connections (people you're connected with)
 * - Pending received requests (people asking to connect)
 * - Sent requests (people you're waiting to hear from)
 *
 * Lightweight endpoint for UI badges showing counts.
 *
 * EXAMPLE REQUEST:
 * GET /connections/counts
 *
 * EXAMPLE RESPONSE:
 * {
 *   connections: 47,    (total people you're connected with)
 *   pending: 3,         (requests you received)
 *   sent: 5             (requests you sent)
 * }
 */
router.get('/counts', requireAuth, async (req, res) => {
  try {
    // Step 1: Fetch all three counts in parallel for performance
    // These are lightweight aggregation queries
    const [connectionCount, pendingCount, sentCount] = await Promise.all([
      Connection.getConnectionCount(req.user._id),        // Accepted connections
      Connection.getPendingCount(req.user._id),           // Pending requests RECEIVED
      Connection.countDocuments({ requesterId: req.user._id, status: 'pending' })  // Pending requests SENT
    ]);

    // Step 2: Return the three counts
    res.json({
      connections: connectionCount,  // Total connections
      pending: pendingCount,         // Requests to respond to
      sent: sentCount                // Requests waiting for response
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_connection_counts' });
    res.status(500).json({
      error: 'Failed to get counts',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/suggestions
 * Get suggested users to connect with
 *
 * WHAT IT DOES:
 * Returns a personalized list of users you might want to connect with.
 * Excludes:
 * - Yourself
 * - People you're already connected with
 * - People you've sent/received pending requests from
 * - People who've blocked you or you've blocked
 * - People with private profiles
 * - People not accepting connection requests
 *
 * SORTING:
 * Users with most connections appear first (popular/active users).
 *
 * QUERY PARAMETERS:
 * - limit: How many suggestions to return (default 10, max 20)
 *
 * EXAMPLE REQUEST:
 * GET /connections/suggestions?limit=10
 *
 * EXAMPLE RESPONSE:
 * {
 *   suggestions: [
 *     {
 *       _id: "...",
 *       profile: { displayName: "Alice Smith", bio: "Software Engineer", avatarUrl: "..." },
 *       stats: { connectionCount: 250, sharedItemCount: 45 },
 *       mutualConnections: 0
 *     }
 *   ]
 * }
 */
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract limit parameter
    const { limit = 10 } = req.query;

    // Step 2: Build exclusion list to filter out users we don't want suggested
    // Fetch all existing connections (pending or accepted) and all blocks in parallel
    const [existingConnections, blockedIds] = await Promise.all([
      // Get all connections where we're either requester or addressee
      // and status is either pending (waiting) or accepted (already connected)
      Connection.find({
        $or: [
          { requesterId: req.user._id },      // Connections we initiated
          { addresseeId: req.user._id }       // Connections others initiated
        ],
        status: { $in: ['pending', 'accepted'] }  // Either way, don't suggest them
      }).select('requesterId addresseeId'),
      // Get all users we've blocked or who blocked us
      UserBlock.getAllExcludedUserIds(req.user._id)
    ]);

    // Step 3: Build set of user IDs to exclude
    const excludeIds = new Set([
      req.user._id.toString()  // Don't suggest ourselves
    ]);

    // Add all blocked users
    blockedIds.forEach(id => excludeIds.add(id.toString()));

    // Add all existing connections (pending and accepted)
    existingConnections.forEach(conn => {
      excludeIds.add(conn.requesterId.toString());
      excludeIds.add(conn.addresseeId.toString());
    });

    // Step 4: Query for suggestible users
    // Find users who:
    // - Are not in our exclusion list
    // - Have active accounts
    // - Allow connection requests in their settings
    // - Have public profiles
    const suggestions = await User.find({
      _id: { $nin: Array.from(excludeIds).map(id => new mongoose.Types.ObjectId(id)) },
      status: 'active',                                    // Account is active
      'socialSettings.allowConnectionRequests': { $ne: 'none' },  // Accepts connections
      'socialSettings.profileVisibility': { $in: ['public', null, undefined] }  // Public profile
    })
      .select('email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId profile.bio socialStats')
      .limit(parseInt(limit))                            // Limit results
      .sort({ 'socialStats.connectionCount': -1, createdAt: -1 });  // Sort by popularity then newness

    // Step 5: Transform and return suggestions
    res.json({
      suggestions: suggestions.map(user => ({
        _id: user._id,
        profile: user.profile,               // Name, avatar, bio
        stats: user.socialStats,             // How many connections, shared items, etc
        mutualConnections: 0 // TODO: Calculate how many connections you share
      }))
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_suggestions' });
    res.status(500).json({
      error: 'Failed to get suggestions',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PATCH /connections/:id/accept
 * Accept a pending connection request
 *
 * WHAT IT DOES:
 * Accepts a connection request you received from another user.
 * Once accepted, you both become connected and can message each other.
 *
 * PATH PARAMETERS:
 * - id: Connection request ID
 *
 * EXAMPLE REQUEST:
 * PATCH /connections/507f1f77bcf86cd799439011/accept
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Connection accepted",
 *   connection: {
 *     user: { _id: "...", profile: {...} },
 *     connectedAt: "2025-02-15T10:00:00Z"
 *   }
 * }
 *
 * SIDE EFFECTS:
 * - Both users' connection counts increment by 1
 * - Connection status changes to "accepted"
 * - Timestamp recorded for when connection was established
 */
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract connection request ID
    const { id } = req.params;

    // Step 2: Fetch the connection request we're accepting
    // Only find if:
    // - We are the addressee (recipient)
    // - Status is pending (not already accepted/declined)
    const connection = await Connection.findOne({
      _id: id,
      addresseeId: req.user._id,        // We must be the recipient
      status: 'pending'                 // Must be waiting for response
    }).populate('requesterId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Step 3: Check if valid connection request exists
    if (!connection) {
      return res.status(404).json({
        error: 'Connection request not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Accept the connection
    connection.status = 'accepted';      // Mark as accepted
    connection.acceptedAt = new Date();  // Record acceptance time
    await connection.save();

    // Step 5: Update connection counts for both users
    // When users connect, both get +1 to their connection count
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': 1 } }),
      User.findByIdAndUpdate(connection.requesterId._id, { $inc: { 'socialStats.connectionCount': 1 } })
    ]);

    // Step 6: Log the successful acceptance for audit trail
    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', connection.requesterId._id);
    req.eventName = 'connection.accept.success';

    // Step 7: Return the accepted connection
    res.json({
      message: 'Connection accepted',
      connection: {
        _id: connection._id,
        user: connection.requesterId,    // The person we just connected with
        connectedAt: connection.acceptedAt
      }
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'accept_connection' });
    res.status(500).json({
      error: 'Failed to accept connection',
      code: 'ACCEPT_ERROR'
    });
  }
});

/**
 * PATCH /connections/:id/decline
 * Decline a pending connection request
 *
 * WHAT IT DOES:
 * Rejects a connection request you received from another user.
 * The person can try again later (request can be retried after decline).
 *
 * PATH PARAMETERS:
 * - id: Connection request ID
 *
 * EXAMPLE REQUEST:
 * PATCH /connections/507f1f77bcf86cd799439011/decline
 *
 * EXAMPLE RESPONSE:
 * { message: "Connection request declined" }
 *
 * NOTES:
 * - Person can send another request after decline
 * - Decline is recorded with timestamp
 */
router.patch('/:id/decline', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract connection request ID
    const { id } = req.params;

    // Step 2: Fetch the connection request we're declining
    // Only find if:
    // - We are the addressee (recipient)
    // - Status is pending (not already accepted/declined)
    const connection = await Connection.findOne({
      _id: id,
      addresseeId: req.user._id,        // We must be the recipient
      status: 'pending'                 // Must be waiting for response
    });

    // Step 3: Check if valid connection request exists
    if (!connection) {
      return res.status(404).json({
        error: 'Connection request not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Decline the connection request
    connection.status = 'declined';      // Mark as declined
    connection.declinedAt = new Date();  // Record decline time
    await connection.save();

    // Step 5: Log the successful decline for audit trail
    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', connection.requesterId);
    req.eventName = 'connection.reject.success';

    // Step 6: Return success message
    res.json({
      message: 'Connection request declined'
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'decline_connection' });
    res.status(500).json({
      error: 'Failed to decline connection',
      code: 'DECLINE_ERROR'
    });
  }
});

/**
 * DELETE /connections/:id
 * Remove a connection or cancel a sent request
 *
 * WHAT IT DOES:
 * - If connection is accepted: Removes the connection between you
 * - If connection is pending: Cancels a request you sent (or unfollows a request received)
 *
 * PATH PARAMETERS:
 * - id: Connection ID
 *
 * EXAMPLE REQUEST:
 * DELETE /connections/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE (if was accepted):
 * { message: "Connection removed" }
 *
 * EXAMPLE RESPONSE (if was pending):
 * { message: "Connection request cancelled" }
 *
 * SIDE EFFECTS:
 * - If accepted: Both users' connection counts decrement by 1
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract connection ID
    const { id } = req.params;

    // Step 2: Fetch the connection we want to remove
    // Find if we're involved (either requester or addressee)
    const connection = await Connection.findOne({
      _id: id,
      $or: [
        { requesterId: req.user._id },    // We initiated it
        { addresseeId: req.user._id }     // They initiated it
      ]
    });

    // Step 3: Check if connection exists
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Determine if this was an accepted connection (matters for counts)
    const wasAccepted = connection.status === 'accepted';

    // Step 5: Figure out who the "other" user is (not us)
    const otherUserId = connection.requesterId.toString() === req.user._id.toString()
      ? connection.addresseeId          // We were requester, so other is addressee
      : connection.requesterId;          // They were requester, so other is requester

    // Step 6: Delete the connection
    await Connection.findByIdAndDelete(id);

    // Step 7: Update connection counts if it was an accepted connection
    // Only decrement counts if the connection was already established
    if (wasAccepted) {
      await Promise.all([
        User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': -1 } }),
        User.findByIdAndUpdate(otherUserId, { $inc: { 'socialStats.connectionCount': -1 } })
      ]);
    }

    // Step 8: Log the successful removal for audit trail
    attachEntityId(req, 'connectionId', id);
    attachEntityId(req, 'targetUserId', otherUserId);
    req.eventName = 'connection.remove.success';

    // Step 9: Return appropriate message based on what was removed
    res.json({
      message: wasAccepted ? 'Connection removed' : 'Connection request cancelled'
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'remove_connection' });
    res.status(500).json({
      error: 'Failed to remove connection',
      code: 'REMOVE_ERROR'
    });
  }
});

/**
 * POST /connections/:userId/block
 * Block a user (prevents all interaction)
 *
 * WHAT IT DOES:
 * Blocks a user from:
 * - Seeing your profile
 * - Sending you messages
 * - Sending you connection requests
 * - Interacting with your content
 *
 * The block is private - they don't know they're blocked.
 *
 * PATH PARAMETERS:
 * - userId: User ID to block
 *
 * REQUEST BODY:
 * {
 *   reason: "harassment",  (optional: reason for block)
 *   notes: "spammy behavior"  (optional: private notes)
 * }
 *
 * EXAMPLE REQUEST:
 * POST /connections/507f1f77bcf86cd799439011/block
 * { "reason": "inappropriate", "notes": "sent spam messages" }
 *
 * EXAMPLE RESPONSE:
 * { message: "User blocked successfully" }
 *
 * SIDE EFFECTS:
 * - Any existing connections are removed
 * - Their connection count decreases if you were connected
 */
router.post('/:userId/block', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract user ID and reason
    const { userId } = req.params;
    const { reason = 'other', notes } = req.body;

    // Step 2: Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Step 3: Prevent self-blocking
    // Users can't block themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot block yourself',
        code: 'SELF_BLOCK'
      });
    }

    // Step 4: Check if already blocked
    // Prevent duplicate blocks
    const existingBlock = await UserBlock.findOne({
      blockerId: req.user._id,
      blockedId: userId
    });

    if (existingBlock) {
      return res.status(409).json({
        error: 'User already blocked',
        code: 'ALREADY_BLOCKED'
      });
    }

    // Step 5: Create the block record
    const block = new UserBlock({
      blockerId: req.user._id,    // Who's doing the blocking
      blockedId: userId,          // Who's being blocked
      reason,                     // Why (for our records)
      notes                       // Private notes
    });
    await block.save();

    // Step 6: Remove any existing connection with this user
    // Blocking automatically ends any connection
    const connection = await Connection.findOne({
      $or: [
        { requesterId: req.user._id, addresseeId: userId },
        { requesterId: userId, addresseeId: req.user._id }
      ]
    });

    if (connection) {
      const wasAccepted = connection.status === 'accepted';
      await Connection.findByIdAndDelete(connection._id);

      // If they were connected, decrement both connection counts
      if (wasAccepted) {
        await Promise.all([
          User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': -1 } }),
          User.findByIdAndUpdate(userId, { $inc: { 'socialStats.connectionCount': -1 } })
        ]);
      }
    }

    // Step 7: Log the successful block for audit trail
    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.block.success';

    // Step 8: Return success message
    res.json({
      message: 'User blocked successfully'
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'block_user' });
    res.status(500).json({
      error: 'Failed to block user',
      code: 'BLOCK_ERROR'
    });
  }
});

/**
 * DELETE /connections/:userId/block
 * Unblock a user (allow interaction again)
 *
 * WHAT IT DOES:
 * Removes a block, allowing the user to interact with you again.
 *
 * PATH PARAMETERS:
 * - userId: User ID to unblock
 *
 * EXAMPLE REQUEST:
 * DELETE /connections/507f1f77bcf86cd799439011/block
 *
 * EXAMPLE RESPONSE:
 * { message: "User unblocked successfully" }
 *
 * NOTES:
 * - After unblocking, they can send connection requests
 * - They can see your profile (if public)
 * - They can message you (if you're connected)
 */
router.delete('/:userId/block', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract user ID to unblock
    const { userId } = req.params;

    // Step 2: Delete the block record
    const result = await UserBlock.findOneAndDelete({
      blockerId: req.user._id,    // The block we created
      blockedId: userId           // For this user
    });

    // Step 3: Check if block existed
    if (!result) {
      return res.status(404).json({
        error: 'Block not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Log the successful unblock for audit trail
    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.unblock.success';

    // Step 5: Return success message
    res.json({
      message: 'User unblocked successfully'
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'unblock_user' });
    res.status(500).json({
      error: 'Failed to unblock user',
      code: 'UNBLOCK_ERROR'
    });
  }
});

/**
 * GET /connections/blocked
 * Get list of users you've blocked
 *
 * WHAT IT DOES:
 * Returns a list of all users you've blocked.
 * This lets you manage your blocks and unblock if needed.
 *
 * QUERY PARAMETERS:
 * - limit: How many blocks to return (default 50, max 100)
 * - skip: How many to skip (for pagination)
 *
 * EXAMPLE REQUEST:
 * GET /connections/blocked?limit=25&skip=0
 *
 * EXAMPLE RESPONSE:
 * {
 *   blocked: [
 *     { user: {...profile}, reason: "harassment", blockedAt: "2025-02-10T10:00:00Z" },
 *     { user: {...profile}, reason: "spam", blockedAt: "2025-02-12T14:30:00Z" }
 *   ],
 *   total: 5,
 *   hasMore: false
 * }
 */
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 50, skip = 0 } = req.query;

    // Step 2: Fetch list of users we've blocked
    const blocks = await UserBlock.getBlockedUsers(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Get total count for pagination
    const total = await UserBlock.countDocuments({ blockerId: req.user._id });

    // Step 4: Return blocked users with pagination info
    res.json({
      blocked: blocks.map(b => ({
        _id: b._id,                 // Block record ID
        user: b.blockedId,          // The blocked user's profile
        reason: b.reason,           // Why we blocked them
        blockedAt: b.createdAt      // When we blocked them
      })),
      total,                        // Total users we've blocked
      hasMore: parseInt(skip) + blocks.length < total  // More results available?
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'get_blocked_users' });
    res.status(500).json({
      error: 'Failed to get blocked users',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;
