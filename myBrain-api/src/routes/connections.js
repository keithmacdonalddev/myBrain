import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Connection from '../models/Connection.js';
import UserBlock from '../models/UserBlock.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

/**
 * POST /connections
 * Send a connection request to another user
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { userId, message, source = 'search' } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Can't connect to yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot send connection request to yourself',
        code: 'SELF_CONNECTION'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if blocked
    const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
    if (hasBlock) {
      return res.status(403).json({
        error: 'Cannot connect with this user',
        code: 'USER_BLOCKED'
      });
    }

    // Check if target user allows connection requests
    if (!req.user.canRequestConnection(targetUser)) {
      return res.status(403).json({
        error: 'This user is not accepting connection requests',
        code: 'CONNECTIONS_DISABLED'
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.getConnection(req.user._id, userId);
    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        return res.status(409).json({
          error: 'Already connected with this user',
          code: 'ALREADY_CONNECTED'
        });
      }
      if (existingConnection.status === 'pending') {
        // Check if this user sent the request or received it
        if (existingConnection.requesterId.toString() === req.user._id.toString()) {
          return res.status(409).json({
            error: 'Connection request already sent',
            code: 'REQUEST_PENDING'
          });
        } else {
          // They sent us a request - we can accept it instead
          return res.status(409).json({
            error: 'This user has already sent you a connection request. You can accept it instead.',
            code: 'INCOMING_REQUEST_EXISTS',
            connectionId: existingConnection._id
          });
        }
      }
      if (existingConnection.status === 'declined') {
        // Allow re-requesting after a decline (update existing record)
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

    // Create new connection request
    const connection = new Connection({
      requesterId: req.user._id,
      addresseeId: userId,
      requestMessage: message,
      connectionSource: source,
      status: 'pending'
    });

    await connection.save();

    // Populate requester info for response
    await connection.populate('addresseeId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.request.success';

    res.status(201).json({
      message: 'Connection request sent',
      connection
    });
  } catch (error) {
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
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const connections = await Connection.getConnections(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Transform to include the "other" user prominently
    const transformedConnections = connections.map(conn => {
      const otherUser = conn.getOtherUser(req.user._id);
      return {
        _id: conn._id,
        user: otherUser,
        connectedAt: conn.acceptedAt,
        connectionSource: conn.connectionSource
      };
    });

    const total = await Connection.getConnectionCount(req.user._id);

    res.json({
      connections: transformedConnections,
      total,
      hasMore: parseInt(skip) + connections.length < total
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_connections' });
    res.status(500).json({
      error: 'Failed to get connections',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/pending
 * Get pending connection requests (received)
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const requests = await Connection.getPendingRequests(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await Connection.getPendingCount(req.user._id);

    res.json({
      requests: requests.map(req => ({
        _id: req._id,
        user: req.requesterId,
        message: req.requestMessage,
        source: req.connectionSource,
        sentAt: req.createdAt
      })),
      total,
      hasMore: parseInt(skip) + requests.length < total
    });
  } catch (error) {
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
 */
router.get('/sent', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const requests = await Connection.getSentRequests(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await Connection.countDocuments({
      requesterId: req.user._id,
      status: 'pending'
    });

    res.json({
      requests: requests.map(req => ({
        _id: req._id,
        user: req.addresseeId,
        message: req.requestMessage,
        source: req.connectionSource,
        sentAt: req.createdAt
      })),
      total,
      hasMore: parseInt(skip) + requests.length < total
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_sent_requests' });
    res.status(500).json({
      error: 'Failed to get sent requests',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /connections/counts
 * Get connection and request counts
 */
router.get('/counts', requireAuth, async (req, res) => {
  try {
    const [connectionCount, pendingCount, sentCount] = await Promise.all([
      Connection.getConnectionCount(req.user._id),
      Connection.getPendingCount(req.user._id),
      Connection.countDocuments({ requesterId: req.user._id, status: 'pending' })
    ]);

    res.json({
      connections: connectionCount,
      pending: pendingCount,
      sent: sentCount
    });
  } catch (error) {
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
 */
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users to exclude (already connected, pending, blocked)
    const [existingConnections, blockedIds] = await Promise.all([
      Connection.find({
        $or: [
          { requesterId: req.user._id },
          { addresseeId: req.user._id }
        ],
        status: { $in: ['pending', 'accepted'] }
      }).select('requesterId addresseeId'),
      UserBlock.getAllExcludedUserIds(req.user._id)
    ]);

    // Build list of user IDs to exclude
    const excludeIds = new Set([
      req.user._id.toString(),
      ...blockedIds
    ]);

    existingConnections.forEach(conn => {
      excludeIds.add(conn.requesterId.toString());
      excludeIds.add(conn.addresseeId.toString());
    });

    // Find users who are public and allow connections
    const suggestions = await User.find({
      _id: { $nin: Array.from(excludeIds).map(id => new mongoose.Types.ObjectId(id)) },
      status: 'active',
      'socialSettings.allowConnectionRequests': { $ne: 'none' },
      'socialSettings.profileVisibility': { $in: ['public', null, undefined] }
    })
      .select('email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId profile.bio socialStats')
      .limit(parseInt(limit))
      .sort({ 'socialStats.connectionCount': -1, createdAt: -1 });

    res.json({
      suggestions: suggestions.map(user => ({
        _id: user._id,
        profile: user.profile,
        stats: user.socialStats,
        mutualConnections: 0 // TODO: Calculate mutual connections
      }))
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_suggestions' });
    res.status(500).json({
      error: 'Failed to get suggestions',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PATCH /connections/:id/accept
 * Accept a connection request
 */
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findOne({
      _id: id,
      addresseeId: req.user._id,
      status: 'pending'
    }).populate('requesterId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    if (!connection) {
      return res.status(404).json({
        error: 'Connection request not found',
        code: 'NOT_FOUND'
      });
    }

    connection.status = 'accepted';
    connection.acceptedAt = new Date();
    await connection.save();

    // Update connection counts for both users
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': 1 } }),
      User.findByIdAndUpdate(connection.requesterId._id, { $inc: { 'socialStats.connectionCount': 1 } })
    ]);

    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', connection.requesterId._id);
    req.eventName = 'connection.accept.success';

    res.json({
      message: 'Connection accepted',
      connection: {
        _id: connection._id,
        user: connection.requesterId,
        connectedAt: connection.acceptedAt
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'accept_connection' });
    res.status(500).json({
      error: 'Failed to accept connection',
      code: 'ACCEPT_ERROR'
    });
  }
});

/**
 * PATCH /connections/:id/decline
 * Decline a connection request
 */
router.patch('/:id/decline', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findOne({
      _id: id,
      addresseeId: req.user._id,
      status: 'pending'
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Connection request not found',
        code: 'NOT_FOUND'
      });
    }

    connection.status = 'declined';
    connection.declinedAt = new Date();
    await connection.save();

    attachEntityId(req, 'connectionId', connection._id);
    attachEntityId(req, 'targetUserId', connection.requesterId);
    req.eventName = 'connection.reject.success';

    res.json({
      message: 'Connection request declined'
    });
  } catch (error) {
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
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await Connection.findOne({
      _id: id,
      $or: [
        { requesterId: req.user._id },
        { addresseeId: req.user._id }
      ]
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        code: 'NOT_FOUND'
      });
    }

    const wasAccepted = connection.status === 'accepted';
    const otherUserId = connection.requesterId.toString() === req.user._id.toString()
      ? connection.addresseeId
      : connection.requesterId;

    await Connection.findByIdAndDelete(id);

    // Update connection counts if it was an accepted connection
    if (wasAccepted) {
      await Promise.all([
        User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': -1 } }),
        User.findByIdAndUpdate(otherUserId, { $inc: { 'socialStats.connectionCount': -1 } })
      ]);
    }

    attachEntityId(req, 'connectionId', id);
    attachEntityId(req, 'targetUserId', otherUserId);
    req.eventName = 'connection.remove.success';

    res.json({
      message: wasAccepted ? 'Connection removed' : 'Connection request cancelled'
    });
  } catch (error) {
    attachError(req, error, { operation: 'remove_connection' });
    res.status(500).json({
      error: 'Failed to remove connection',
      code: 'REMOVE_ERROR'
    });
  }
});

/**
 * POST /connections/:userId/block
 * Block a user
 */
router.post('/:userId/block', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'other', notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot block yourself',
        code: 'SELF_BLOCK'
      });
    }

    // Check if already blocked
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

    // Create block
    const block = new UserBlock({
      blockerId: req.user._id,
      blockedId: userId,
      reason,
      notes
    });
    await block.save();

    // Remove any existing connection
    const connection = await Connection.findOne({
      $or: [
        { requesterId: req.user._id, addresseeId: userId },
        { requesterId: userId, addresseeId: req.user._id }
      ]
    });

    if (connection) {
      const wasAccepted = connection.status === 'accepted';
      await Connection.findByIdAndDelete(connection._id);

      if (wasAccepted) {
        await Promise.all([
          User.findByIdAndUpdate(req.user._id, { $inc: { 'socialStats.connectionCount': -1 } }),
          User.findByIdAndUpdate(userId, { $inc: { 'socialStats.connectionCount': -1 } })
        ]);
      }
    }

    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.block.success';

    res.json({
      message: 'User blocked successfully'
    });
  } catch (error) {
    attachError(req, error, { operation: 'block_user' });
    res.status(500).json({
      error: 'Failed to block user',
      code: 'BLOCK_ERROR'
    });
  }
});

/**
 * DELETE /connections/:userId/block
 * Unblock a user
 */
router.delete('/:userId/block', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await UserBlock.findOneAndDelete({
      blockerId: req.user._id,
      blockedId: userId
    });

    if (!result) {
      return res.status(404).json({
        error: 'Block not found',
        code: 'NOT_FOUND'
      });
    }

    attachEntityId(req, 'targetUserId', userId);
    req.eventName = 'connection.unblock.success';

    res.json({
      message: 'User unblocked successfully'
    });
  } catch (error) {
    attachError(req, error, { operation: 'unblock_user' });
    res.status(500).json({
      error: 'Failed to unblock user',
      code: 'UNBLOCK_ERROR'
    });
  }
});

/**
 * GET /connections/blocked
 * Get list of blocked users
 */
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const blocks = await UserBlock.getBlockedUsers(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await UserBlock.countDocuments({ blockerId: req.user._id });

    res.json({
      blocked: blocks.map(b => ({
        _id: b._id,
        user: b.blockedId,
        reason: b.reason,
        blockedAt: b.createdAt
      })),
      total,
      hasMore: parseInt(skip) + blocks.length < total
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_blocked_users' });
    res.status(500).json({
      error: 'Failed to get blocked users',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;
