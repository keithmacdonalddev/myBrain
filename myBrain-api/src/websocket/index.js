/**
 * =============================================================================
 * WEBSOCKET/INDEX.JS - Real-Time Communication Server
 * =============================================================================
 *
 * This file sets up WebSocket communication for real-time features in myBrain.
 *
 * WHAT ARE WEBSOCKETS?
 * --------------------
 * Normal HTTP requests are like sending a letter:
 * - You send a request, wait for a response, and the connection closes
 * - If you want new information, you have to ask again
 *
 * WebSockets are like a phone call:
 * - The connection stays open continuously
 * - Either side can send messages at any time
 * - No need to keep asking "is there anything new?"
 *
 * WHY WEBSOCKETS FOR MYBRAIN?
 * ---------------------------
 * - Instant Messaging: Messages appear immediately without refreshing
 * - Typing Indicators: See when someone is typing to you
 * - Presence: Know when your connections are online/offline
 * - Real-time Updates: Notes, tasks, etc. sync instantly across devices
 *
 * SOCKET.IO LIBRARY:
 * -----------------
 * We use Socket.IO, a popular library that makes WebSockets easier:
 * - Handles reconnection automatically if connection drops
 * - Falls back to polling if WebSockets aren't supported
 * - Provides "rooms" to organize connections by conversation
 * - Works well with Express.js
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Server class from socket.io - creates the WebSocket server
 */
import { Server } from 'socket.io';

/**
 * JWT (JSON Web Token) library for verifying user authentication
 * Same tokens used for HTTP authentication work for WebSockets
 */
import jwt from 'jsonwebtoken';

/**
 * Database models we need to interact with:
 * - User: Get user info and update presence status
 * - Conversation: Find user's conversations to join rooms
 * - Message: Not used here but imported for potential future use
 * - Connection: Get user's friends to broadcast presence updates
 * - Session: Validate that user's session is still active (not revoked)
 */
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Connection from '../models/Connection.js';
import Session from '../models/Session.js';

/**
 * Console logging utilities from requestLogger.
 * We reuse the same colors and log level configuration for consistency.
 */
import { colors, getLogLevel, LOG_LEVELS, truncate, formatTimestamp } from '../middleware/requestLogger.js';

// =============================================================================
// WEBSOCKET CONSOLE LOGGING
// =============================================================================
/**
 * logSocketEvent(eventName, data) - Log WebSocket Event to Console
 * =================================================================
 * Prints WebSocket events to the terminal with the same style as HTTP
 * request logging. Events are prefixed with [WS] to distinguish them.
 *
 * LOG LEVELS (same as HTTP logging):
 * - none (0): Silent - no output
 * - minimal (1): Just event name
 * - normal (2): + user, socket ID, conversation ID
 * - verbose (3): + room count, error details
 *
 * EXAMPLE OUTPUT:
 * [WS] socket.connect
 *   user: user@example.com
 *   socket: abc123xyz
 *
 * [WS] conversation:join
 *   user: user@example.com
 *   conversation: 507f...
 *   room size: 2
 *
 * @param {string} eventName - Name of the WebSocket event
 * @param {Object} data - Event data containing:
 *   - userId: User ID or email
 *   - socketId: Socket connection ID
 *   - conversationId: Conversation ID (if applicable)
 *   - error: Error message (if any)
 *   - roomCount: Number of users in room (if applicable)
 */
export function logSocketEvent(eventName, data = {}) {
  // Check log level (use getLogLevel() to read env var at runtime)
  const level = LOG_LEVELS[getLogLevel()] || 0;
  if (level === 0) return;

  const { userId, userEmail, socketId, conversationId, error, roomCount, status } = data;
  const timestamp = `${colors.dim}[${formatTimestamp()}]${colors.reset}`;
  const errorTag = error ? ` ${colors.red}[ERROR]${colors.reset}` : '';

  // Level 1 (minimal): Just the event name with timestamp
  console.log(`${timestamp} ${colors.magenta}[WS]${colors.reset} ${eventName}${errorTag}`);

  if (level < 2) return;

  // Level 2 (normal): Add user and socket info
  if (userEmail || userId) {
    console.log(`${colors.dim}  user: ${userEmail || userId}${colors.reset}`);
  }
  if (socketId) {
    console.log(`${colors.dim}  socket: ${truncate(socketId, 20)}${colors.reset}`);
  }
  if (conversationId) {
    console.log(`${colors.dim}  conversation: ${truncate(String(conversationId), 24)}${colors.reset}`);
  }
  if (status) {
    console.log(`${colors.dim}  status: ${status}${colors.reset}`);
  }

  if (level < 3) return;

  // Level 3 (verbose): Add room count and errors
  if (roomCount !== undefined) {
    console.log(`${colors.dim}  room size: ${roomCount}${colors.reset}`);
  }
  if (error) {
    console.log(`${colors.red}  error: ${error}${colors.reset}`);
  }

  // Blank line for readability
  console.log('');
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * JWT_SECRET: The secret key used to verify authentication tokens
 * Must match the secret used when creating tokens during login
 * Should be a strong, random string in production (from environment variable)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// =============================================================================
// CONNECTION TRACKING
// =============================================================================

/**
 * userSockets: Tracks which socket connections belong to which users
 *
 * Structure: Map<userId, Set<socketId>>
 *
 * Why a Map of Sets?
 * - A user might have multiple devices/tabs connected
 * - Each device has a different socket ID
 * - We need to track all of them to know when user is truly offline
 *
 * Example:
 * {
 *   "user123": Set(["socket_abc", "socket_xyz"]),  // User has 2 devices online
 *   "user456": Set(["socket_def"])                  // User has 1 device online
 * }
 */
const userSockets = new Map();

// =============================================================================
// MAIN WEBSOCKET INITIALIZATION
// =============================================================================

/**
 * Initialize the WebSocket Server
 * --------------------------------
 * This function creates and configures the Socket.IO server.
 * It's called once when the main server starts.
 *
 * @param {Object} httpServer - The HTTP server from Express
 * @returns {Object} - The Socket.IO server instance
 *
 * WHAT THIS FUNCTION DOES:
 * 1. Creates a Socket.IO server attached to the HTTP server
 * 2. Configures CORS (which websites can connect)
 * 3. Sets up authentication middleware
 * 4. Defines event handlers for all socket events
 */
export function initializeWebSocket(httpServer) {
  // -----------------------------------------
  // STEP 1: Create the Socket.IO server
  // -----------------------------------------
  const io = new Server(httpServer, {
    // CORS configuration - same as HTTP API
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true  // Allow cookies/authentication
    },
    // Connection health settings
    pingTimeout: 60000,   // Wait 60 seconds before considering client disconnected
    pingInterval: 25000   // Send ping every 25 seconds to check connection
  });

  // -----------------------------------------
  // STEP 2: Authentication Middleware
  // -----------------------------------------
  /**
   * This middleware runs before accepting any socket connection.
   * It verifies the user is logged in by checking their JWT token
   * and validates that the session is still active (not revoked).
   *
   * SESSION VALIDATION:
   * - JWTs are stateless and can't be revoked once issued
   * - To enable instant logout, we check if the session is still active
   * - If user logs out or session is revoked, WebSocket will disconnect
   *
   * If authentication fails, the connection is rejected.
   * If it succeeds, the user info is attached to the socket.
   */
  io.use(async (socket, next) => {
    try {
      // Get the JWT token from the connection handshake
      // Can be passed in auth object or Authorization header
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      // No token = not authenticated
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify the token and extract user ID
      // jwt.verify throws an error if token is invalid/expired
      const decoded = jwt.verify(token, JWT_SECRET);

      // -----------------------------------------
      // SESSION VALIDATION
      // -----------------------------------------
      // If token has session ID and JWT ID, validate the session
      // Legacy tokens without these fields skip session validation
      if (decoded.sid && decoded.jti) {
        const session = await Session.findOne({
          sessionId: decoded.sid,
          jwtId: decoded.jti,
          status: 'active',
          expiresAt: { $gt: new Date() }  // Not expired
        }).select('_id').lean();

        if (!session) {
          return next(new Error('Session expired or revoked'));
        }
      }

      // Look up the user in the database
      const user = await User.findById(decoded.userId);

      // User must exist and be active (not suspended/deleted)
      if (!user || user.status !== 'active') {
        return next(new Error('User not found or inactive'));
      }

      // Attach user info and decoded token to the socket for use in event handlers
      socket.user = user;
      socket.userId = user._id.toString();
      socket.decoded = decoded;  // Store decoded token for session ID access

      // Continue to connection handler
      next();
    } catch (error) {
      // Authentication failed - log and reject connection
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // -----------------------------------------
  // STEP 3: Connection Handler
  // -----------------------------------------
  /**
   * This runs when a user successfully connects.
   * Sets up all the event listeners for this socket.
   */
  io.on('connection', async (socket) => {
    // Get the authenticated user's ID
    const userId = socket.userId;

    // Log socket connection
    logSocketEvent('socket.connect', {
      userId,
      userEmail: socket.user?.email,
      socketId: socket.id
    });

    // -----------------------------------------
    // Track this socket connection
    // -----------------------------------------
    // If user has no existing sockets, create a new Set for them
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    // Add this socket ID to the user's set of connections
    userSockets.get(userId).add(socket.id);

    // -----------------------------------------
    // Update user's presence in database
    // -----------------------------------------
    // Mark user as online when they connect
    await User.findByIdAndUpdate(userId, {
      $set: {
        'presence.isOnline': true,
        'presence.currentStatus': 'available'
      }
    });

    // -----------------------------------------
    // Join Socket.IO "rooms"
    // -----------------------------------------
    /**
     * Rooms in Socket.IO are like chat rooms - messages sent to a room
     * go to everyone in that room. We use rooms for:
     * - user:123 - Personal room for direct notifications to this user
     * - conversation:456 - Room for each conversation/chat
     */

    // Join user's personal room (for direct notifications)
    socket.join(`user:${userId}`);

    // Find all conversations this user is part of
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    });

    // Join each conversation's room
    conversations.forEach(conv => {
      socket.join(`conversation:${conv._id}`);
    });

    // -----------------------------------------
    // Broadcast presence update to friends
    // -----------------------------------------
    // Tell the user's connections that they came online
    broadcastPresenceUpdate(io, userId, true);

    // =========================================
    // EVENT HANDLERS
    // =========================================
    // These handle different events the client can send

    /**
     * EVENT: conversation:join
     * -----------------------
     * When user opens a conversation, join its room for real-time messages.
     * Also marks the conversation as read.
     */
    socket.on('conversation:join', async (conversationId) => {
      try {
        // Verify user is actually a participant in this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isActive: true
        });

        if (conversation) {
          // Join the conversation's room
          socket.join(`conversation:${conversationId}`);

          // Mark all messages in this conversation as read
          await conversation.markAsRead(userId);

          // Get room size for logging
          const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
          const roomCount = room ? room.size : 0;

          // Log the event
          logSocketEvent('conversation:join', {
            userId,
            userEmail: socket.user?.email,
            conversationId,
            roomCount
          });

          // Confirm to client that they joined
          socket.emit('conversation:joined', { conversationId });
        }
      } catch (error) {
        logSocketEvent('conversation:join', {
          userId,
          conversationId,
          error: error.message
        });
      }
    });

    /**
     * EVENT: conversation:leave
     * ------------------------
     * When user closes a conversation, leave its room.
     * They'll stop receiving real-time updates for that conversation.
     */
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);

      logSocketEvent('conversation:leave', {
        userId,
        userEmail: socket.user?.email,
        conversationId
      });
    });

    /**
     * EVENT: typing:start
     * ------------------
     * User started typing in a conversation.
     * Broadcast this to other participants so they see "User is typing..."
     */
    socket.on('typing:start', async (conversationId) => {
      logSocketEvent('typing:start', {
        userId,
        userEmail: socket.user?.email,
        conversationId
      });

      // Send to everyone in the conversation EXCEPT the sender
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        conversationId,
        userId,
        user: {
          _id: userId,
          displayName: socket.user.profile?.displayName || socket.user.email
        }
      });
    });

    /**
     * EVENT: typing:stop
     * -----------------
     * User stopped typing (either sent message or paused).
     * Remove the "typing" indicator for other participants.
     */
    socket.on('typing:stop', async (conversationId) => {
      logSocketEvent('typing:stop', {
        userId,
        userEmail: socket.user?.email,
        conversationId
      });

      socket.to(`conversation:${conversationId}`).emit('user:stopped_typing', {
        conversationId,
        userId
      });
    });

    /**
     * EVENT: messages:read
     * -------------------
     * User has read all messages in a conversation.
     * Update the database and notify other participants.
     */
    socket.on('messages:read', async (conversationId) => {
      try {
        // Find the conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isActive: true
        });

        if (conversation) {
          // Update read timestamp in database
          await conversation.markAsRead(userId);

          logSocketEvent('messages:read', {
            userId,
            userEmail: socket.user?.email,
            conversationId
          });

          // Notify other participants that messages were read
          // This enables "seen" indicators
          socket.to(`conversation:${conversationId}`).emit('messages:read', {
            conversationId,
            userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        logSocketEvent('messages:read', {
          userId,
          conversationId,
          error: error.message
        });
      }
    });

    /**
     * EVENT: presence:update
     * ---------------------
     * User manually changes their presence status.
     * Options: available, away, busy, offline
     * Can also set a custom status message.
     */
    socket.on('presence:update', async (data) => {
      try {
        const { status, statusMessage } = data;

        logSocketEvent('presence:update', {
          userId,
          userEmail: socket.user?.email,
          status
        });

        // Update presence in the database
        await socket.user.setPresence(status, statusMessage);

        // Broadcast new status to connections
        broadcastPresenceUpdate(io, userId, status !== 'offline', status, statusMessage);
      } catch (error) {
        logSocketEvent('presence:update', {
          userId,
          error: error.message
        });
      }
    });

    /**
     * EVENT: disconnect
     * ----------------
     * User's socket disconnected (closed tab, lost connection, etc.)
     * Update tracking and potentially mark user as offline.
     */
    socket.on('disconnect', async () => {
      logSocketEvent('socket.disconnect', {
        userId,
        userEmail: socket.user?.email,
        socketId: socket.id
      });

      // Remove this socket from the user's set of connections
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);

        // Check if user has NO more connected sockets
        // This means they're truly offline (all devices disconnected)
        if (sockets.size === 0) {
          // Remove user from tracking map entirely
          userSockets.delete(userId);

          // Update database to show user is offline
          await User.findByIdAndUpdate(userId, {
            $set: {
              'presence.isOnline': false,
              'presence.currentStatus': 'offline',
              'presence.lastSeenAt': new Date()  // Record when they went offline
            }
          });

          // Broadcast offline status to connections
          broadcastPresenceUpdate(io, userId, false);
        }
        // If sockets.size > 0, user still has other devices connected
        // so we don't mark them as offline
      }
    });
  });

  // Return the io instance so other parts of the app can use it
  return io;
}

// =============================================================================
// PRESENCE BROADCASTING
// =============================================================================

/**
 * Broadcast Presence Update to User's Connections
 * -----------------------------------------------
 * When a user's online status changes, notify all their friends/connections.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - ID of user whose presence changed
 * @param {boolean} isOnline - Whether user is now online
 * @param {string} status - Status string (available, away, busy, offline)
 * @param {string} statusMessage - Custom status message
 *
 * EXAMPLE FLOW:
 * 1. User123 comes online
 * 2. Get User123's connections (User456, User789)
 * 3. Send presence update to User456's personal room
 * 4. Send presence update to User789's personal room
 * 5. Their frontends show User123 as "Online"
 */
async function broadcastPresenceUpdate(io, userId, isOnline, status = null, statusMessage = null) {
  try {
    // Get all of this user's connections (friends)
    const connections = await Connection.getConnections(userId);

    // Notify each connected user
    connections.forEach(conn => {
      // Get the other user in this connection
      // (connection has 2 users, we want the one that isn't userId)
      const otherUser = conn.getOtherUser(userId);
      const otherUserId = otherUser._id?.toString() || otherUser.toString();

      // Send to the other user's personal room
      io.to(`user:${otherUserId}`).emit('presence:update', {
        userId,                                        // Who changed status
        isOnline,                                      // Are they online?
        status: status || (isOnline ? 'available' : 'offline'), // Their status
        statusMessage,                                 // Custom message
        lastSeenAt: isOnline ? null : new Date()       // When they went offline
      });
    });
  } catch (error) {
    console.error('Error broadcasting presence:', error);
  }
}

// =============================================================================
// MESSAGE EMISSION HELPERS
// =============================================================================

/**
 * These functions are called from HTTP routes (messages.js) to emit
 * real-time events after database operations complete.
 *
 * FLOW:
 * 1. User sends message via HTTP POST /messages
 * 2. Message route saves to database
 * 3. Message route calls emitNewMessage()
 * 4. Socket.IO broadcasts to conversation room
 * 5. Other participants see message instantly
 */

/**
 * Emit New Message to Conversation
 * --------------------------------
 * Called when a new message is sent.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} conversationId - ID of the conversation
 * @param {Object} message - The complete message object
 */
export function emitNewMessage(io, conversationId, message) {
  // Send to everyone in the conversation room
  io.to(`conversation:${conversationId}`).emit('message:new', message);
}

/**
 * Emit Message Updated
 * --------------------
 * Called when a message is edited.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} conversationId - ID of the conversation
 * @param {Object} message - The updated message object
 */
export function emitMessageUpdated(io, conversationId, message) {
  io.to(`conversation:${conversationId}`).emit('message:updated', message);
}

/**
 * Emit Message Deleted
 * --------------------
 * Called when a message is deleted.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} conversationId - ID of the conversation
 * @param {string} messageId - ID of the deleted message
 */
export function emitMessageDeleted(io, conversationId, messageId) {
  io.to(`conversation:${conversationId}`).emit('message:deleted', {
    conversationId,
    messageId
  });
}

/**
 * Emit New Conversation
 * --------------------
 * Called when a new conversation is created.
 * Notifies the other participant(s) so they see the new conversation.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - ID of user to notify
 * @param {Object} conversation - The new conversation object
 */
export function emitNewConversation(io, userId, conversation) {
  io.to(`user:${userId}`).emit('conversation:new', conversation);
}

/**
 * Emit Message Reaction
 * --------------------
 * Called when a reaction is added or removed from a message.
 * Notifies all conversation participants so they see the updated reactions.
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} conversationId - ID of the conversation
 * @param {Object} reactionData - Object containing:
 *   - messageId: The message that was reacted to
 *   - userId: Who added/removed the reaction
 *   - emoji: The emoji that was added/removed
 *   - added: Boolean indicating if reaction was added (true) or removed (false)
 *   - reactions: Updated reaction summary for the message
 */
export function emitMessageReaction(io, conversationId, reactionData) {
  io.to(`conversation:${conversationId}`).emit('message:reaction', reactionData);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a User is Currently Online
 * -----------------------------------
 * Looks up the user in our tracking map.
 *
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user has at least one connected socket
 */
export function isUserOnline(userId) {
  // User is online if they're in the map AND have at least one socket
  return userSockets.has(userId.toString()) && userSockets.get(userId.toString()).size > 0;
}

/**
 * Get Online Users from a List
 * ----------------------------
 * Filters a list of user IDs to only those currently online.
 * Useful for showing online indicators in a user list.
 *
 * @param {Array<string>} userIds - List of user IDs to check
 * @returns {Array<string>} - Subset of IDs that are online
 *
 * EXAMPLE:
 * getOnlineUsers(['user1', 'user2', 'user3']) => ['user1', 'user3']
 * (if user2 is offline)
 */
export function getOnlineUsers(userIds) {
  return userIds.filter(id => isUserOnline(id));
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all functions as a default object.
 * This allows importing either individual functions or the whole module:
 *
 * Individual: import { emitNewMessage } from './websocket/index.js'
 * Module: import websocket from './websocket/index.js'
 */
export default {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitNewConversation,
  emitMessageReaction,
  logSocketEvent,
  isUserOnline,
  getOnlineUsers
};
