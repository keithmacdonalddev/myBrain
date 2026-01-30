/**
 * =============================================================================
 * MESSAGES.JS - Direct Messaging Routes
 * =============================================================================
 *
 * This file handles real-time direct messaging in myBrain.
 * Users can send private messages to their connections and have real-time
 * conversations using WebSockets.
 *
 * WHAT IS DIRECT MESSAGING?
 * -------------------------
 * Direct messaging allows two connected users to:
 * - Send private messages to each other
 * - Have real-time conversations (like texting)
 * - Search message history
 * - Mark conversations as read/unread
 * - Archive conversations
 * - Delete messages
 *
 * MESSAGE CONCEPTS:
 * -----------------
 * MESSAGE: A single text message sent from one user to another
 * - Content: The actual text
 * - Sender: Who sent it
 * - Timestamp: When sent
 * - Read status: Has recipient read it?
 *
 * CONVERSATION: A thread between two users
 * - All messages between USER A and USER B
 * - Last message preview
 * - Unread count
 * - Archive status
 * - Last activity timestamp
 *
 * REAL-TIME WITH WEBSOCKETS:
 * ---------------------------
 * Messages use WebSockets for real-time delivery:
 * - User A sends message
 * - Server immediately broadcasts to User B (if online)
 * - User B's app updates instantly (no refresh needed)
 * - If User B is offline, message stored for next login
 *
 * CONVERSATION STATES:
 * --------------------
 * - ACTIVE: You're chatting with this person
 * - ARCHIVED: Conversation hidden but messages preserved
 * - BLOCKED: You blocked this person (can't message)
 *
 * RESTRICTIONS:
 * ---------------
 * - Can only message users you're connected with
 * - Can't message users who blocked you
 * - Can't message users you blocked
 * - Messages have size limit (prevent spam)
 *
 * NOTIFICATIONS:
 * ----------------
 * New messages trigger:
 * - Toast notification (small popup)
 * - In-app notification badge
 * - Optional sound alert
 * - Does NOT send emails by default
 *
 * ENDPOINTS:
 * -----------
 * - GET /messages/conversations - List your conversations
 * - GET /messages/:conversationId - Get conversation details
 * - POST /messages/:conversationId - Send message
 * - GET /messages/:conversationId/messages - Get message history
 * - PUT /messages/:conversationId - Archive conversation
 * - DELETE /messages/:id - Delete a message
 * - POST /messages/:conversationId/mark-read - Mark read
 * - POST /messages/:conversationId/mark-unread - Mark unread
 *
 * PAGINATION:
 * -----------
 * Messages paginated (load older messages as needed):
 * - Most recent messages loaded first
 * - Older messages loaded on scroll-up
 * - Prevents loading entire conversation at once
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools we need to handle real-time
// direct messaging. We import the web framework, database models, WebSocket
// support, authentication, and logging.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, DELETE)
 * - Define routes (URLs for messaging)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Mongoose provides utilities for working with MongoDB ObjectIds.
 * We use this to validate user IDs in message requests.
 */
import mongoose from 'mongoose';

/**
 * Conversation model represents a conversation thread between users.
 * A conversation is either:
 * - DIRECT: Between two users (private chat)
 * - GROUP: Between 3+ users (like Slack channels)
 * We query this to list conversations, create new ones, and update metadata.
 */
import Conversation from '../models/Conversation.js';

/**
 * Message model represents individual messages sent in conversations.
 * Each message has: sender, content, timestamp, read status, and reactions.
 * We query this to fetch message history and create new messages.
 */
import Message from '../models/Message.js';

/**
 * Connection model tracks relationships between users.
 * We query this to verify users are connected before allowing messages
 * (some users may restrict messages to connections only).
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model tracks users who have blocked each other.
 * We query this to prevent messaging between blocked users.
 * WHY: Blocked users shouldn't be able to contact each other.
 */
import UserBlock from '../models/UserBlock.js';

/**
 * User model represents user accounts.
 * We query this to:
 * - Verify users exist before creating conversations
 * - Check messaging permissions (some users block all messages)
 * - Populate user details (name, avatar) for the other participants
 */
import User from '../models/User.js';

/**
 * Notification model handles creating alerts for users.
 * We use it to notify users when they receive a new message.
 */
import Notification from '../models/Notification.js';

/**
 * requireAuth is middleware that checks if the user is authenticated.
 * ALL routes in this file require authentication (no anonymous messaging).
 */
import { requireAuth } from '../middleware/auth.js';
import { uploadFileMultiple, handleUploadError } from '../middleware/upload.js';
import { getDefaultProvider } from '../services/storage/storageFactory.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * attachError is logging middleware for tracking errors to system logs.
 * We use this for debugging messaging issues.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * attachEntityId is logging middleware that tracks which conversation/message
 * is affected by the request. This creates an audit trail of messaging activity.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * sanitizeSearchQuery escapes regex special characters in user input.
 * This prevents ReDoS (Regular Expression Denial of Service) attacks.
 */
import { sanitizeSearchQuery } from '../utils/sanitize.js';

const router = express.Router();

// =============================================================================
// WEBSOCKET SETUP - Real-Time Message Delivery
// =============================================================================
// WebSockets enable real-time messaging so users see new messages instantly.
// The io instance is set by server.js (because Socket.io must be initialized
// with the HTTP server, not just the Express app).

/**
 * io is the Socket.io instance for real-time communication.
 * Initially null, set by setSocketIO() when server starts.
 * We use this to broadcast messages to users who are online.
 */
let io = null;

/**
 * setSocketIO sets the Socket.io instance for real-time messaging.
 * Called by server.js after Socket.io is initialized.
 * This enables the routes to broadcast messages to online users.
 *
 * @param {object} ioInstance - The Socket.io server instance
 */
export function setSocketIO(ioInstance) {
  io = ioInstance;
}

// =============================================================================
// MESSAGING CONVERSATIONS - List and Create Conversations
// =============================================================================
// Conversations are the top level of messaging. Users have a list of
// conversations (each with a different person or group), and each
// conversation contains messages.

/**
 * GET /messages/conversations
 * Get the current user's conversation list
 *
 * This endpoint returns all conversations the user is part of.
 * Used to populate the messages sidebar (list of recent chats).
 *
 * CONVERSATION TYPES:
 * -------------------
 * - DIRECT: One-on-one messaging between two users
 * - GROUP: Group chat with 3+ users
 *
 * RESPONSE INCLUDES:
 * ------------------
 * - Participants: Who's in this conversation
 * - Last message: Preview of most recent message (for list display)
 * - Unread count: How many new messages user hasn't read
 * - isArchived: Whether user archived this conversation
 * - isMuted: Whether notifications are muted
 * - updatedAt: When conversation was last active (for sorting)
 *
 * PAGINATION:
 * -----------
 * - limit: Max conversations per page (default 50)
 * - skip: For pagination (show older conversations on scroll)
 * - includeArchived: Whether to include archived conversations
 *
 * EXAMPLE REQUEST:
 * GET /messages/conversations?limit=50&includeArchived=false
 *
 * EXAMPLE RESPONSE:
 * [
 *   {
 *     "_id": "conv123",
 *     "type": "direct",
 *     "participants": [
 *       {
 *         "_id": "user456",
 *         "profile": { displayName: "John Smith", avatarUrl: "..." }
 *       }
 *     ],
 *     "lastMessage": {
 *       "content": "Thanks for the update!",
 *       "sender": "user456",
 *       "timestamp": "2026-01-20T14:30:00Z"
 *     },
 *     "unreadCount": 2,  // User has 2 unread messages
 *     "isArchived": false,
 *     "isMuted": false,
 *     "updatedAt": "2026-01-20T14:30:00Z"
 *   }
 * ]
 *
 * @query {number} limit - Results per page (default 50)
 * @query {number} skip - Results to skip for pagination (default 0)
 * @query {boolean} includeArchived - Include archived conversations (default false)
 * @returns {Array} List of conversations sorted by most recent activity
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    // =============================================================================
    // STEP 1: Parse Pagination Parameters
    // =============================================================================
    // Extract pagination options from query string
    const { limit = 50, skip = 0, includeArchived = false } = req.query;

    // =============================================================================
    // STEP 2: Fetch Conversations for Current User
    // =============================================================================
    // Query the database for all conversations this user is part of
    // Results are sorted by most recent activity (so newest chats appear first)
    const conversations = await Conversation.getConversationsForUser(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      includeArchived: includeArchived === 'true'  // Only include archived if explicitly requested
    });

    // =============================================================================
    // STEP 3: Transform Conversations for Response
    // =============================================================================
    // Convert database documents to user-friendly response format
    // Include unread counts, archive status, and participant info
    const transformed = conversations.map(conv => {
      // Get metadata specific to this user (unread count, archive status)
      const meta = conv.getParticipantMeta(req.user._id);

      // Get all participants EXCEPT the current user
      // (We don't need to show users their own profile in the conversation)
      const otherParticipants = conv.participants.filter(
        p => p._id.toString() !== req.user._id.toString()
      );

      // Build response object with all conversation info
      return {
        _id: conv._id,
        type: conv.type,  // "direct" or "group"
        participants: otherParticipants,  // Everyone except current user
        groupMeta: conv.type === 'group' ? conv.groupMeta : undefined,  // Group details (name, icon)
        lastMessage: conv.lastMessage,  // Most recent message (for preview)
        unreadCount: meta?.unreadCount || 0,  // How many unread messages
        isArchived: meta?.isArchived || false,  // Is conversation archived?
        isMuted: conv.isMuted(req.user._id),  // Are notifications muted?
        updatedAt: conv.updatedAt  // When was conversation last active
      };
    });

    // =============================================================================
    // STEP 4: Return Conversation List
    // =============================================================================
    res.json({
      conversations: transformed
    });
  } catch (error) {
    // Error handling
    attachError(req, error, { operation: 'get_conversations' });
    res.status(500).json({
      error: 'Failed to get conversations',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /messages/conversations
 * Create a new conversation or return existing conversation
 *
 * This endpoint creates a new conversation between the current user and
 * one or more other users. For direct conversations, if a conversation
 * already exists between the two users, it returns the existing one.
 *
 * CONVERSATION TYPES:
 * -------------------
 * - DIRECT: One-on-one messaging (requires userId parameter)
 * - GROUP: Group messaging (requires name and participantIds)
 *
 * VALIDATION CHECKS (for direct conversations):
 * ----------------------------------------------
 * 1. Target user exists and is active
 * 2. Users are not blocked (mutual blocking check)
 * 3. Users are connected (if messaging restricted to connections)
 * 4. Target user allows messages from requester
 *
 * EXAMPLE REQUEST (direct):
 * POST /messages/conversations
 * {
 *   "userId": "507f1f77bcf86cd799439012",
 *   "type": "direct"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "conversation": {
 *     "_id": "conv123",
 *     "type": "direct",
 *     "participants": [
 *       { "_id": "user456", "profile": { displayName: "John" } }
 *     ],
 *     "lastMessage": null,
 *     "unreadCount": 0,
 *     "createdAt": "2026-01-21T10:00:00Z"
 *   },
 *   "created": true  // true if new conversation, false if existing
 * }
 *
 * @body {string} userId - Target user ID for direct conversations
 * @body {string} type - Conversation type: "direct" or "group"
 * @body {string} name - Group conversation name
 * @body {array} participantIds - Array of user IDs for group conversations
 * @returns {Object} Conversation object with created flag
 */
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    // Extract request parameters
    const { userId, type = 'direct', name, participantIds = [] } = req.body;

    // =============================================================================
    // DIRECT CONVERSATIONS
    // =============================================================================

    if (type === 'direct') {
      // =============================================================================
      // STEP 1: Validate Target User ID Provided
      // =============================================================================
      if (!userId) {
        return res.status(400).json({
          error: 'User ID is required for direct conversations',
          code: 'MISSING_USER_ID'
        });
      }

      // =============================================================================
      // STEP 2: Validate User ID Format
      // =============================================================================
      // Check that userId is a valid MongoDB ObjectId (24 hex characters)
      // WHY: Prevents database errors from invalid IDs
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      // =============================================================================
      // STEP 3: Prevent Self-Messaging
      // =============================================================================
      // Users cannot message themselves (doesn't make sense)
      if (userId === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot create conversation with yourself',
          code: 'SELF_CONVERSATION'
        });
      }

      // =============================================================================
      // STEP 4: Check for User Blocking
      // =============================================================================
      // Mutual blocking prevents messaging in either direction
      // WHY: Users should be able to block unwanted contact
      const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
      if (hasBlock) {
        return res.status(403).json({
          error: 'Cannot message this user',
          code: 'USER_BLOCKED'
        });
      }

      // =============================================================================
      // STEP 5: Verify Target User Exists and Is Active
      // =============================================================================
      // Query for the target user to:
      // - Verify they exist
      // - Check their account status (not suspended/deleted)
      // - Later check their messaging preferences
      const targetUser = await User.findById(userId);
      if (!targetUser || targetUser.status !== 'active') {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // =============================================================================
      // STEP 6: Check Connection and Messaging Permissions
      // =============================================================================
      // Some users restrict messaging to connections only
      // We need to check if users are connected, then ask the target user's
      // messaging preferences (do they allow messages from non-connections?)
      const isConnected = await Connection.areConnected(req.user._id, userId);
      const canMessage = await req.user.canMessageUser(targetUser, isConnected);

      if (!canMessage) {
        return res.status(403).json({
          error: 'You cannot message this user',
          code: 'MESSAGING_NOT_ALLOWED'
        });
      }

      // =============================================================================
      // STEP 7: Get or Create the Direct Conversation
      // =============================================================================
      // If a conversation already exists between these users, return it
      // Otherwise, create a new one
      // This prevents duplicate conversations and provides a single thread
      const { conversation, created } = await Conversation.getOrCreateDirect(
        req.user._id,
        userId
      );

      // =============================================================================
      // STEP 8: Populate Participant Details
      // =============================================================================
      // Get full user data for participants (names, avatars, etc.)
      await conversation.populate('participants', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId presence');

      // Get all participants except the current user
      const otherParticipants = conversation.participants.filter(
        p => p._id.toString() !== req.user._id.toString()
      );

      // =============================================================================
      // STEP 9: Log the Action
      // =============================================================================
      // Track whether we created new conversation or retrieved existing one
      attachEntityId(req, 'conversationId', conversation._id);
      req.eventName = created ? 'conversation.create.success' : 'conversation.get.success';

      // =============================================================================
      // STEP 10: Return Conversation
      // =============================================================================
      // Return with 201 (Created) if new, 200 (OK) if existing
      res.status(created ? 201 : 200).json({
        conversation: {
          _id: conversation._id,
          type: conversation.type,
          participants: otherParticipants,
          lastMessage: conversation.lastMessage,
          unreadCount: 0,  // New conversations have no unread messages
          createdAt: conversation.createdAt
        },
        created  // Flag indicating if conversation was newly created
      });
    } else if (type === 'group') {
      // =============================================================================
      // GROUP CONVERSATIONS
      // =============================================================================
      // Group conversation creation (validate name provided)
      if (!name) {
        return res.status(400).json({
          error: 'Group name is required',
          code: 'MISSING_NAME'
        });
      }

      if (!participantIds || participantIds.length === 0) {
        return res.status(400).json({
          error: 'At least one participant is required',
          code: 'MISSING_PARTICIPANTS'
        });
      }

      // Validate and filter participants
      const validParticipants = [req.user._id];
      const participantMeta = [{
        userId: req.user._id,
        role: 'owner'
      }];

      for (const pId of participantIds) {
        if (!mongoose.Types.ObjectId.isValid(pId)) continue;
        if (pId === req.user._id.toString()) continue;

        const hasBlock = await UserBlock.hasBlockBetween(req.user._id, pId);
        if (hasBlock) continue;

        const user = await User.findById(pId);
        if (!user || user.status !== 'active') continue;

        validParticipants.push(pId);
        participantMeta.push({
          userId: pId,
          role: 'member'
        });
      }

      if (validParticipants.length < 2) {
        return res.status(400).json({
          error: 'At least one valid participant is required',
          code: 'NO_VALID_PARTICIPANTS'
        });
      }

      const conversation = new Conversation({
        type: 'group',
        participants: validParticipants,
        participantMeta,
        groupMeta: {
          name,
          createdBy: req.user._id
        }
      });

      await conversation.save();

      // Create system message
      await Message.createSystemMessage(
        conversation._id,
        'group_created',
        req.user._id
      );

      await conversation.populate('participants', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

      attachEntityId(req, 'conversationId', conversation._id);
      req.eventName = 'conversation.create.success';

      res.status(201).json({
        conversation: {
          _id: conversation._id,
          type: conversation.type,
          participants: conversation.participants,
          groupMeta: conversation.groupMeta,
          createdAt: conversation.createdAt
        },
        created: true
      });
    } else {
      return res.status(400).json({
        error: 'Invalid conversation type',
        code: 'INVALID_TYPE'
      });
    }
  } catch (error) {
    attachError(req, error, { operation: 'create_conversation' });
    res.status(500).json({
      error: 'Failed to create conversation',
      code: 'CREATE_ERROR'
    });
  }
});

/**
 * GET /messages/conversations/:id/messages
 * Get message history for a conversation
 *
 * WHAT IT DOES:
 * Retrieves messages from a conversation with pagination support.
 * Messages can be loaded in chronological order (oldest first) or loaded
 * relative to a specific message (for infinite scroll).
 * Automatically marks all messages as read when loaded.
 *
 * PAGINATION OPTIONS:
 * - Default: Load newest messages (most recent first)
 * - before: Load messages older than this timestamp/ID
 * - after: Load messages newer than this timestamp/ID
 * Useful for infinite scroll (load older on scroll up, newer on scroll down)
 *
 * @param {string} req.params.id - Conversation ID (MongoDB ObjectId)
 * @param {number} req.query.limit - Messages per page (default 50)
 * @param {string} req.query.before - Load messages before this timestamp (for scrolling up)
 * @param {string} req.query.after - Load messages after this timestamp (for scrolling down)
 *
 * @returns {Object} - Messages and pagination info:
 * {
 *   messages: [
 *     {
 *       _id: "msg123",
 *       conversationId: "conv456",
 *       senderId: "user789",
 *       content: "Hello!",
 *       contentType: "text",
 *       readBy: ["user789"],
 *       createdAt: "2026-01-21T14:00:00Z"
 *     }
 *   ],
 *   hasMore: true  // More messages available
 * }
 *
 * @throws {404} - Conversation not found or user not participant
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (get newest messages):
 * GET /messages/conversations/conv456/messages?limit=50
 *
 * EXAMPLE REQUEST (scroll up to load older messages):
 * GET /messages/conversations/conv456/messages?limit=50&before=2026-01-20T10:00:00Z
 *
 * SIDE EFFECTS:
 * - Automatically marks all messages in conversation as read
 * - Clears unread notification count
 */
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before, after } = req.query;

    // =====================================================
    // VERIFY CONVERSATION ACCESS
    // =====================================================
    // Ensure:
    // - Conversation exists
    // - User is a participant
    // - Conversation is active (not deleted)
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // =====================================================
    // FETCH MESSAGES WITH PAGINATION
    // =====================================================
    // Load messages in batches (limit results to prevent large responses)
    // Support loading messages before/after a timestamp for scrolling
    const messages = await Message.getMessages(id, {
      limit: parseInt(limit),
      before,  // Optional: messages older than this
      after    // Optional: messages newer than this
    });

    // =====================================================
    // MARK MESSAGES AS READ
    // =====================================================
    // When user loads messages, consider them read
    // This clears unread badges in notification center
    await conversation.markAsRead(req.user._id);

    // =====================================================
    // RESPONSE: Return in chronological order
    // =====================================================
    // Reverse so oldest are first (chronological order, newer at end)
    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)  // More available if we got limit count
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_messages' });
    res.status(500).json({
      error: 'Failed to get messages',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/messages
 * Send a message in a conversation
 *
 * WHAT IT DOES:
 * Sends a new message to a conversation.
 * Message is immediately saved, delivered via WebSocket if recipient is online,
 * and stored for offline delivery.
 *
 * MESSAGE TYPES:
 * - TEXT: Plain text message (default)
 * - MEDIA: Message with image/file attachments
 * - REPLY: Message replying to another message
 *
 * VALIDATION:
 * - At least content OR attachments required
 * - Max message length: varies by type
 * - Only participants can send messages
 *
 * @param {string} req.params.id - Conversation ID (MongoDB ObjectId)
 * @param {string} req.body.content - Message text content (optional if attachments present)
 * @param {string} req.body.contentType - Message type (default: 'text')
 * @param {array} req.body.attachments - Array of file attachments (optional)
 * @param {string} req.body.replyToId - ID of message being replied to (optional)
 *
 * @returns {Object} - Created message:
 * {
 *   message: {
 *     _id: "msg123",
 *     conversationId: "conv456",
 *     senderId: { _id: "user789", profile: {...} },
 *     content: "Thanks for the update!",
 *     contentType: "text",
 *     replyToId: null,
 *     readBy: ["user789"],
 *     createdAt: "2026-01-21T14:30:00Z"
 *   }
 * }
 *
 * @throws {400} - Empty message (no content or attachments)
 * @throws {404} - Conversation not found or user not participant
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (text message):
 * POST /messages/conversations/conv456/messages
 * Body: { content: "Thanks for the update!" }
 *
 * EXAMPLE REQUEST (reply to message):
 * POST /messages/conversations/conv456/messages
 * Body: {
 *   content: "I agree!",
 *   replyToId: "msg123"
 * }
 *
 * SIDE EFFECTS:
 * - Updates conversation's lastMessage
 * - Broadcasts to online participants via WebSocket
 * - Triggers notifications for other participants
 * - Marks conversation as active/recent
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'conversationId', id): Track conversation
 * - attachEntityId(req, 'messageId', message._id): Track message
 * - req.eventName = 'message.send.success': Event type
 */
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, contentType = 'text', attachments = [], replyToId } = req.body;

    // =====================================================
    // VALIDATION: Ensure message has content
    // =====================================================
    // Message must have either text content or attachments
    if (!content && attachments.length === 0) {
      return res.status(400).json({
        error: 'Message content or attachment is required',
        code: 'EMPTY_MESSAGE'
      });
    }

    // =====================================================
    // VERIFY CONVERSATION ACCESS
    // =====================================================
    // Ensure:
    // - Conversation exists
    // - User is a participant
    // - Conversation is active (not deleted)
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // =====================================================
    // GET REPLY PREVIEW (if replying to another message)
    // =====================================================
    // If replying, fetch the quoted message to include preview
    let replyToPreview = null;
    if (replyToId) {
      const replyMessage = await Message.findById(replyToId);
      // Verify reply is in same conversation (security check)
      if (replyMessage && replyMessage.conversationId.toString() === id) {
        replyToPreview = {
          content: replyMessage.content?.substring(0, 100),  // First 100 chars
          senderId: replyMessage.senderId
        };
      }
    }

    // =====================================================
    // CREATE MESSAGE
    // =====================================================
    // Assemble message with all metadata
    const message = new Message({
      conversationId: id,
      senderId: req.user._id,
      content,
      contentType,
      attachments,
      replyToId,
      replyToPreview
    });

    await message.save();

    // =====================================================
    // UPDATE CONVERSATION
    // =====================================================
    // Update conversation's lastMessage timestamp and preview
    await conversation.updateLastMessage(message);

    // =====================================================
    // POPULATE SENDER INFO
    // =====================================================
    // Get full sender profile (name, avatar, etc.) for response
    await message.populate('senderId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // =====================================================
    // BROADCAST VIA WEBSOCKET (Real-time delivery)
    // =====================================================
    // If Socket.io is available, broadcast to online recipients
    // Other participants will see the message appear instantly
    if (io) {
      const { emitNewMessage } = await import('../websocket/index.js');
      emitNewMessage(io, id, {
        ...message.toObject(),
        conversationId: id
      });
    }

    // =====================================================
    // NOTIFICATIONS (for offline participants)
    // =====================================================
    // Create notifications for other participants who may not be online
    // Fire and forget - don't block response if notification fails
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );

    const messagePreview = content?.substring(0, 100) || 'Sent an attachment';
    for (const recipientId of otherParticipants) {
      Notification.notifyNewMessage(req.user._id, recipientId, id, messagePreview)
        .catch(err => console.error('Failed to create message notification:', err));
    }

    // =====================================================
    // LOGGING
    // =====================================================
    attachEntityId(req, 'conversationId', id);
    attachEntityId(req, 'messageId', message._id);
    req.eventName = 'message.send.success';

    // =====================================================
    // RESPONSE
    // =====================================================
    res.status(201).json({
      message
    });
  } catch (error) {
    attachError(req, error, { operation: 'send_message' });
    res.status(500).json({
      error: 'Failed to send message',
      code: 'SEND_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/members
 * Add a member to a group conversation
 *
 * @param {string} req.params.id - Conversation ID
 * @param {string} req.body.userId - User ID to add
 *
 * @returns {Object} - Updated conversation
 */
router.post('/conversations/:id/members', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // Must be a group conversation
    if (conversation.type !== 'group') {
      return res.status(400).json({
        error: 'Can only add members to group conversations',
        code: 'NOT_GROUP'
      });
    }

    // Check if requester is admin
    const requesterMeta = conversation.participantMeta.find(
      m => m.userId.toString() === req.user._id.toString()
    );
    if (!requesterMeta || requesterMeta.role !== 'admin') {
      return res.status(403).json({
        error: 'Only admins can add members',
        code: 'NOT_ADMIN'
      });
    }

    // Add the participant
    const added = await conversation.addParticipant(userId, req.user._id);

    if (!added) {
      return res.status(400).json({
        error: 'User is already a member',
        code: 'ALREADY_MEMBER'
      });
    }

    // Populate and return
    await conversation.populate('participants', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId presence');

    attachEntityId(req, 'conversationId', id);
    attachEntityId(req, 'addedUserId', userId);
    req.eventName = 'conversation.member.add';

    res.json({ conversation });
  } catch (error) {
    attachError(req, error, { operation: 'add_member' });
    res.status(500).json({
      error: 'Failed to add member',
      code: 'ADD_MEMBER_ERROR'
    });
  }
});

/**
 * DELETE /messages/conversations/:id/members/:userId
 * Remove a member from a group conversation
 *
 * @param {string} req.params.id - Conversation ID
 * @param {string} req.params.userId - User ID to remove
 *
 * @returns {Object} - Success status
 */
router.delete('/conversations/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // Must be a group conversation
    if (conversation.type !== 'group') {
      return res.status(400).json({
        error: 'Can only remove members from group conversations',
        code: 'NOT_GROUP'
      });
    }

    // Allow self-removal (leaving) or admin removal
    const isSelf = userId === req.user._id.toString();
    const requesterMeta = conversation.participantMeta.find(
      m => m.userId.toString() === req.user._id.toString()
    );
    const isAdmin = requesterMeta?.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        error: 'Only admins can remove other members',
        code: 'NOT_ADMIN'
      });
    }

    // Don't allow removing the last admin
    if (isAdmin && isSelf) {
      const otherAdmins = conversation.participantMeta.filter(
        m => m.role === 'admin' && m.userId.toString() !== userId
      );
      if (otherAdmins.length === 0 && conversation.participants.length > 1) {
        return res.status(400).json({
          error: 'Cannot leave - you are the only admin. Transfer admin role first.',
          code: 'LAST_ADMIN'
        });
      }
    }

    // Remove the participant
    await conversation.removeParticipant(userId);

    attachEntityId(req, 'conversationId', id);
    attachEntityId(req, 'removedUserId', userId);
    req.eventName = isSelf ? 'conversation.member.leave' : 'conversation.member.remove';

    res.json({ success: true, left: isSelf });
  } catch (error) {
    attachError(req, error, { operation: 'remove_member' });
    res.status(500).json({
      error: 'Failed to remove member',
      code: 'REMOVE_MEMBER_ERROR'
    });
  }
});

/**
 * PATCH /messages/conversations/:id/members/:userId
 * Update a member's role in a group conversation
 *
 * @param {string} req.params.id - Conversation ID
 * @param {string} req.params.userId - User ID to update
 * @param {string} req.body.role - New role ('admin' or 'member')
 *
 * @returns {Object} - Success status
 */
router.patch('/conversations/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: 'Valid role (admin or member) is required',
        code: 'INVALID_ROLE'
      });
    }

    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // Must be a group conversation
    if (conversation.type !== 'group') {
      return res.status(400).json({
        error: 'Can only change roles in group conversations',
        code: 'NOT_GROUP'
      });
    }

    // Only admins can change roles
    const requesterMeta = conversation.participantMeta.find(
      m => m.userId.toString() === req.user._id.toString()
    );
    if (!requesterMeta || requesterMeta.role !== 'admin') {
      return res.status(403).json({
        error: 'Only admins can change member roles',
        code: 'NOT_ADMIN'
      });
    }

    // Update the role
    const memberMeta = conversation.participantMeta.find(
      m => m.userId.toString() === userId
    );
    if (!memberMeta) {
      return res.status(404).json({
        error: 'Member not found',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    memberMeta.role = role;
    await conversation.save();

    attachEntityId(req, 'conversationId', id);
    attachEntityId(req, 'updatedUserId', userId);
    req.eventName = 'conversation.member.role.update';

    res.json({ success: true, role });
  } catch (error) {
    attachError(req, error, { operation: 'update_member_role' });
    res.status(500).json({
      error: 'Failed to update member role',
      code: 'UPDATE_ROLE_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/attachments
 * Upload attachments for a message
 *
 * WHAT IT DOES:
 * Uploads files to cloud storage and returns attachment metadata
 * that can be included in a message.
 *
 * WORKFLOW:
 * 1. Frontend uploads files here first
 * 2. This returns attachment metadata (URLs, types, etc.)
 * 3. Frontend includes that metadata when sending the message
 *
 * @param {string} req.params.id - Conversation ID
 * @files Array of files (max 10, max 100MB each)
 *
 * @returns {Object} - Attachment metadata:
 * {
 *   attachments: [
 *     {
 *       type: "image",
 *       url: "https://...",
 *       thumbnailUrl: "https://...",
 *       name: "photo.jpg",
 *       size: 1234567,
 *       mimeType: "image/jpeg"
 *     }
 *   ]
 * }
 */
router.post('/conversations/:id/attachments', requireAuth, uploadFileMultiple, handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify conversation access
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const storage = getDefaultProvider();
    const attachments = [];

    // Process each file
    for (const file of req.files) {
      const extension = path.extname(file.originalname).toLowerCase();
      const uniqueId = uuidv4();
      const storageKey = `messages/${req.user._id}/${Date.now()}-${uniqueId}${extension}`;

      // Determine attachment type based on MIME type
      let attachmentType = 'file';
      if (file.mimetype.startsWith('image/')) {
        attachmentType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        attachmentType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        attachmentType = 'audio';
      }

      // Upload to storage
      const result = await storage.upload(file.buffer, storageKey, {
        contentType: file.mimetype
      });

      attachments.push({
        type: attachmentType,
        url: result.url,
        thumbnailUrl: attachmentType === 'image' ? result.url : null,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });
    }

    attachEntityId(req, 'conversationId', id);
    req.eventName = 'message.attachments.upload';

    res.json({ attachments });
  } catch (error) {
    attachError(req, error, { operation: 'upload_attachments' });
    res.status(500).json({
      error: 'Failed to upload attachments',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * PATCH /messages/:id
 * Edit a message (update content)
 *
 * WHAT IT DOES:
 * Allows the sender to edit a message they sent.
 * Edited messages are marked as edited with timestamp.
 * Other participants see the updated content in real-time via WebSocket.
 *
 * RESTRICTIONS:
 * - Only message sender can edit
 * - Cannot edit message after certain time period (configurable)
 * - Edit history is preserved
 *
 * USE CASES:
 * - Fix typos in messages
 * - Remove sensitive information
 * - Add important clarification
 * - Update with new information
 *
 * @param {string} req.params.id - Message ID (MongoDB ObjectId)
 * @param {string} req.body.content - New message content (required, non-empty)
 *
 * @returns {Object} - Updated message:
 * {
 *   message: {
 *     _id: "msg123",
 *     conversationId: "conv456",
 *     senderId: {...profile},
 *     content: "Updated: Thanks for the update!",
 *     editedAt: "2026-01-21T14:35:00Z",
 *     createdAt: "2026-01-21T14:30:00Z"
 *   }
 * }
 *
 * @throws {400} - Content is required
 * @throws {403} - User is not the sender or cannot edit (too old)
 * @throws {404} - Message not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * PATCH /messages/msg123
 * Body: { content: "Updated: Thanks for the update!" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: {
 *     _id: "msg123",
 *     content: "Updated: Thanks for the update!",
 *     editedAt: "2026-01-21T14:35:00Z"
 *   }
 * }
 *
 * SIDE EFFECTS:
 * - Message marked with editedAt timestamp
 * - Broadcasts to online participants via WebSocket
 * - History log updated
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'messageId', message._id): Track message
 * - attachEntityId(req, 'conversationId', message.conversationId): Track conversation
 * - req.eventName = 'message.edit.success': Event type
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // =====================================================
    // VALIDATION: Ensure new content is provided
    // =====================================================
    if (!content) {
      return res.status(400).json({
        error: 'Content is required',
        code: 'MISSING_CONTENT'
      });
    }

    // =====================================================
    // FETCH MESSAGE
    // =====================================================
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // =====================================================
    // VERIFY CONVERSATION ACCESS
    // =====================================================
    // Ensure user is participant in this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // =====================================================
    // VERIFY EDIT PERMISSION
    // =====================================================
    // Only the sender can edit the message
    // Messages can only be edited within time window (e.g., 15 min)
    if (!message.canEdit(req.user._id)) {
      return res.status(403).json({
        error: 'Cannot edit this message',
        code: 'CANNOT_EDIT'
      });
    }

    // =====================================================
    // APPLY EDIT
    // =====================================================
    // Update content and mark as edited
    await message.edit(content);

    // =====================================================
    // POPULATE SENDER INFO
    // =====================================================
    // Get full sender profile for response
    await message.populate('senderId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // =====================================================
    // BROADCAST VIA WEBSOCKET
    // =====================================================
    // Notify other participants of the edit in real-time
    if (io) {
      const { emitMessageUpdated } = await import('../websocket/index.js');
      emitMessageUpdated(io, message.conversationId, message);
    }

    // =====================================================
    // LOGGING
    // =====================================================
    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);
    req.eventName = 'message.edit.success';

    // =====================================================
    // RESPONSE
    // =====================================================
    res.json({
      message
    });
  } catch (error) {
    attachError(req, error, { operation: 'edit_message' });
    res.status(500).json({
      error: 'Failed to edit message',
      code: 'EDIT_ERROR'
    });
  }
});

/**
 * DELETE /messages/:id
 * Delete a message (soft delete)
 *
 * WHAT IT DOES:
 * Removes a message from the conversation.
 * Message is soft-deleted (marked deleted, not removed from database).
 * Allows recovery and preserves audit trail.
 *
 * PERMISSIONS:
 * - Sender can delete their own message
 * - Admins/Owners can delete any message
 * - Time window restrictions may apply
 *
 * SOFT DELETE:
 * - Message marked as deleted (not visible)
 * - Data preserved in database
 * - Shows as "[deleted message]" to other users
 * - Can be recovered by admins if needed
 *
 * USE CASES:
 * - Remove accidental messages
 * - Delete sensitive information
 * - Cleanup spam or off-topic messages (for admins)
 * - Undo sent messages immediately
 *
 * @param {string} req.params.id - Message ID (MongoDB ObjectId)
 *
 * @returns {Object} - Success confirmation:
 * {
 *   message: "Message deleted"
 * }
 *
 * @throws {403} - User is not sender (and not admin)
 * @throws {404} - Message not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * DELETE /messages/msg123
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Message deleted"
 * }
 *
 * SIDE EFFECTS:
 * - Message marked with deletedBy and deletedAt
 * - Broadcasts to online participants via WebSocket
 * - Other users see "[deleted message]" placeholder
 * - Edit history preserved
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'messageId', message._id): Track message
 * - attachEntityId(req, 'conversationId', message.conversationId): Track conversation
 * - req.eventName = 'message.delete.success': Event type
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // =====================================================
    // FETCH MESSAGE
    // =====================================================
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // =====================================================
    // VERIFY CONVERSATION ACCESS
    // =====================================================
    // Ensure user is participant in this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // =====================================================
    // CHECK PERMISSIONS
    // =====================================================
    // Get user's role in conversation (member, admin, owner)
    const meta = conversation.getParticipantMeta(req.user._id);
    const isAdmin = meta?.role === 'admin' || meta?.role === 'owner';

    // Can only delete if:
    // - You're the sender, OR
    // - You're an admin/owner
    if (!message.canDelete(req.user._id, isAdmin)) {
      return res.status(403).json({
        error: 'Cannot delete this message',
        code: 'CANNOT_DELETE'
      });
    }

    // =====================================================
    // LOGGING (before deletion)
    // =====================================================
    // Attach entity IDs for tracking
    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);

    // =====================================================
    // SOFT DELETE
    // =====================================================
    // Mark message as deleted (preserve data)
    await message.softDelete(req.user._id);

    // =====================================================
    // BROADCAST VIA WEBSOCKET
    // =====================================================
    // Notify other participants that message was deleted
    if (io) {
      const { emitMessageDeleted } = await import('../websocket/index.js');
      emitMessageDeleted(io, message.conversationId, message._id);
    }

    // =====================================================
    // EVENT LOGGING
    // =====================================================
    req.eventName = 'message.delete.success';

    // =====================================================
    // RESPONSE
    // =====================================================
    res.json({
      message: 'Message deleted'
    });
  } catch (error) {
    attachError(req, error, { operation: 'delete_message' });
    res.status(500).json({
      error: 'Failed to delete message',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * POST /messages/:id/reactions
 * Add or toggle a reaction on a message
 *
 * WHAT IT DOES:
 * Adds an emoji reaction to a message. If the user has already reacted
 * with the same emoji, the reaction is removed (toggle behavior).
 *
 * @param {string} req.params.id - Message ID (MongoDB ObjectId)
 * @param {string} req.body.emoji - The emoji to react with (e.g., "👍", "❤️")
 *
 * @returns {Object} - Updated reaction state:
 * {
 *   added: true,        // true if reaction was added, false if removed
 *   reactions: [...]    // Updated reaction summary
 * }
 *
 * EXAMPLE REQUEST:
 * POST /messages/msg123/reactions
 * Body: { emoji: "👍" }
 *
 * SIDE EFFECTS:
 * - Broadcasts to online participants via WebSocket
 */
router.post('/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    // Validate emoji is provided
    if (!emoji) {
      return res.status(400).json({
        error: 'Emoji is required',
        code: 'MISSING_EMOJI'
      });
    }

    // Fetch the message
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify conversation access
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Toggle the reaction
    const result = await message.toggleReaction(req.user._id, emoji);

    // Get updated reaction summary
    const reactionSummary = message.getReactionSummary();

    // Broadcast via WebSocket
    if (io) {
      const { emitMessageReaction } = await import('../websocket/index.js');
      emitMessageReaction(io, message.conversationId, {
        messageId: message._id,
        userId: req.user._id,
        emoji,
        added: result.added,
        reactions: reactionSummary
      });
    }

    // Logging
    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);
    req.eventName = result.added ? 'message.reaction.add' : 'message.reaction.remove';

    res.json({
      added: result.added,
      reactions: reactionSummary
    });
  } catch (error) {
    attachError(req, error, { operation: 'toggle_reaction' });
    res.status(500).json({
      error: 'Failed to update reaction',
      code: 'REACTION_ERROR'
    });
  }
});

/**
 * DELETE /messages/:id/reactions/:emoji
 * Remove a specific reaction from a message
 *
 * @param {string} req.params.id - Message ID
 * @param {string} req.params.emoji - Emoji to remove (URL encoded)
 */
router.delete('/:id/reactions/:emoji', requireAuth, async (req, res) => {
  try {
    const { id, emoji } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify conversation access
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Remove the reaction
    const decodedEmoji = decodeURIComponent(emoji);
    const removed = await message.removeReaction(req.user._id, decodedEmoji);

    // Get updated reaction summary
    const reactionSummary = message.getReactionSummary();

    // Broadcast via WebSocket
    if (io && removed) {
      const { emitMessageReaction } = await import('../websocket/index.js');
      emitMessageReaction(io, message.conversationId, {
        messageId: message._id,
        userId: req.user._id,
        emoji: decodedEmoji,
        added: false,
        reactions: reactionSummary
      });
    }

    // Logging
    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);
    req.eventName = 'message.reaction.remove';

    res.json({
      removed,
      reactions: reactionSummary
    });
  } catch (error) {
    attachError(req, error, { operation: 'remove_reaction' });
    res.status(500).json({
      error: 'Failed to remove reaction',
      code: 'REACTION_ERROR'
    });
  }
});

/**
 * POST /messages/:id/read
 * Mark a message as read
 */
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify conversation access
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    await message.markAsRead(req.user._id);
    await conversation.markAsRead(req.user._id);

    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', conversation._id);
    req.eventName = 'message.read.success';

    res.json({
      message: 'Marked as read'
    });
  } catch (error) {
    attachError(req, error, { operation: 'mark_read' });
    res.status(500).json({
      error: 'Failed to mark as read',
      code: 'READ_ERROR'
    });
  }
});

/**
 * GET /messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Conversation.getTotalUnreadCount(req.user._id);

    res.json({
      unreadCount: count
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_unread_count' });
    res.status(500).json({
      error: 'Failed to get unread count',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/archive
 * Toggle archive status
 */
router.post('/conversations/:id/archive', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    const isArchived = await conversation.toggleArchive(req.user._id);

    attachEntityId(req, 'conversationId', conversation._id);
    req.eventName = isArchived ? 'conversation.archive.success' : 'conversation.unarchive.success';

    res.json({
      isArchived
    });
  } catch (error) {
    attachError(req, error, { operation: 'archive_conversation' });
    res.status(500).json({
      error: 'Failed to archive conversation',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/mute
 * Mute a conversation
 */
router.post('/conversations/:id/mute', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body; // Duration in milliseconds, null for indefinite

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    await conversation.mute(req.user._id, duration);

    attachEntityId(req, 'conversationId', conversation._id);
    req.eventName = 'conversation.mute.success';

    res.json({
      message: 'Conversation muted'
    });
  } catch (error) {
    attachError(req, error, { operation: 'mute_conversation' });
    res.status(500).json({
      error: 'Failed to mute conversation',
      code: 'MUTE_ERROR'
    });
  }
});

/**
 * POST /messages/conversations/:id/unmute
 * Unmute a conversation
 */
router.post('/conversations/:id/unmute', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'NOT_FOUND'
      });
    }

    await conversation.unmute(req.user._id);

    attachEntityId(req, 'conversationId', conversation._id);
    req.eventName = 'conversation.unmute.success';

    res.json({
      message: 'Conversation unmuted'
    });
  } catch (error) {
    attachError(req, error, { operation: 'unmute_conversation' });
    res.status(500).json({
      error: 'Failed to unmute conversation',
      code: 'UNMUTE_ERROR'
    });
  }
});

/**
 * =============================================================================
 * SEARCH MESSAGES
 * =============================================================================
 *
 * Searches across all messages the user has access to (in their conversations).
 *
 * @route GET /messages/search
 * @param {string} q - Search query (required)
 * @param {string} conversationId - Optional: limit search to specific conversation
 * @param {number} limit - Number of results (default: 20, max: 50)
 * @returns {Object} - { results: Array of message results with conversation context }
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, conversationId, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
        code: 'INVALID_QUERY'
      });
    }

    const searchLimit = Math.min(parseInt(limit) || 20, 50);

    // Get all conversations the user is part of
    const conversationQuery = {
      participants: req.user._id,
      isActive: true
    };

    if (conversationId) {
      conversationQuery._id = conversationId;
    }

    const userConversations = await Conversation.find(conversationQuery).select('_id');
    const conversationIds = userConversations.map(c => c._id);

    if (conversationIds.length === 0) {
      return res.json({ results: [], total: 0 });
    }

    // Search messages in those conversations
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      isDeleted: { $ne: true },
      $text: { $search: q }
    })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(searchLimit)
      .populate('senderId', 'email profile.displayName profile.avatarUrl')
      .populate('conversationId', 'type name participants')
      .lean();

    // If text search doesn't work (no text index), fall back to regex search
    let results = messages;
    if (messages.length === 0) {
      // Use sanitizeSearchQuery to escape special chars and limit length (ReDoS prevention)
      const regexQuery = new RegExp(sanitizeSearchQuery(q, 100), 'i');
      results = await Message.find({
        conversationId: { $in: conversationIds },
        isDeleted: { $ne: true },
        content: regexQuery
      })
        .sort({ createdAt: -1 })
        .limit(searchLimit)
        .populate('senderId', 'email profile.displayName profile.avatarUrl')
        .populate('conversationId', 'type name participants')
        .lean();
    }

    // Format results with conversation context
    const formattedResults = results.map(msg => ({
      _id: msg._id,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: msg.senderId,
      conversation: {
        _id: msg.conversationId?._id,
        type: msg.conversationId?.type,
        name: msg.conversationId?.name
      }
    }));

    attachEntityId(req, 'searchQuery', q);
    req.eventName = 'messages.search.success';

    res.json({
      results: formattedResults,
      total: formattedResults.length,
      query: q
    });
  } catch (error) {
    attachError(req, error, { operation: 'search_messages' });
    res.status(500).json({
      error: 'Failed to search messages',
      code: 'SEARCH_ERROR'
    });
  }
});

export default router;
