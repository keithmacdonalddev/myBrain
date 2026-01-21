import express from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Connection from '../models/Connection.js';
import UserBlock from '../models/UserBlock.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// Store io instance (set by server.js)
let io = null;

export function setSocketIO(ioInstance) {
  io = ioInstance;
}

/**
 * GET /messages/conversations
 * Get all conversations for the current user
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0, includeArchived = false } = req.query;

    const conversations = await Conversation.getConversationsForUser(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      includeArchived: includeArchived === 'true'
    });

    // Transform for response
    const transformed = conversations.map(conv => {
      const meta = conv.getParticipantMeta(req.user._id);
      const otherParticipants = conv.participants.filter(
        p => p._id.toString() !== req.user._id.toString()
      );

      return {
        _id: conv._id,
        type: conv.type,
        participants: otherParticipants,
        groupMeta: conv.type === 'group' ? conv.groupMeta : undefined,
        lastMessage: conv.lastMessage,
        unreadCount: meta?.unreadCount || 0,
        isArchived: meta?.isArchived || false,
        isMuted: conv.isMuted(req.user._id),
        updatedAt: conv.updatedAt
      };
    });

    res.json({
      conversations: transformed
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_conversations' });
    res.status(500).json({
      error: 'Failed to get conversations',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /messages/conversations
 * Create a new conversation or get existing direct conversation
 */
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { userId, type = 'direct', name, participantIds = [] } = req.body;

    if (type === 'direct') {
      if (!userId) {
        return res.status(400).json({
          error: 'User ID is required for direct conversations',
          code: 'MISSING_USER_ID'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      if (userId === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot create conversation with yourself',
          code: 'SELF_CONVERSATION'
        });
      }

      // Check if blocked
      const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
      if (hasBlock) {
        return res.status(403).json({
          error: 'Cannot message this user',
          code: 'USER_BLOCKED'
        });
      }

      // Check if user exists and allows messages
      const targetUser = await User.findById(userId);
      if (!targetUser || targetUser.status !== 'active') {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if connected (for connections-only messaging)
      const isConnected = await Connection.areConnected(req.user._id, userId);
      const canMessage = await req.user.canMessageUser(targetUser, isConnected);

      if (!canMessage) {
        return res.status(403).json({
          error: 'You cannot message this user',
          code: 'MESSAGING_NOT_ALLOWED'
        });
      }

      // Get or create conversation
      const { conversation, created } = await Conversation.getOrCreateDirect(
        req.user._id,
        userId
      );

      // Populate participants
      await conversation.populate('participants', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId presence');

      const otherParticipants = conversation.participants.filter(
        p => p._id.toString() !== req.user._id.toString()
      );

      attachEntityId(req, 'conversationId', conversation._id);
      req.eventName = created ? 'conversation.create.success' : 'conversation.get.success';

      res.status(created ? 201 : 200).json({
        conversation: {
          _id: conversation._id,
          type: conversation.type,
          participants: otherParticipants,
          lastMessage: conversation.lastMessage,
          unreadCount: 0,
          createdAt: conversation.createdAt
        },
        created
      });
    } else if (type === 'group') {
      // Group conversation creation
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
 * Get messages for a conversation
 */
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before, after } = req.query;

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

    const messages = await Message.getMessages(id, {
      limit: parseInt(limit),
      before,
      after
    });

    // Mark as read
    await conversation.markAsRead(req.user._id);

    res.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === parseInt(limit)
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
 * Send a message
 */
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, contentType = 'text', attachments = [], replyToId } = req.body;

    if (!content && attachments.length === 0) {
      return res.status(400).json({
        error: 'Message content or attachment is required',
        code: 'EMPTY_MESSAGE'
      });
    }

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

    // Get reply preview if replying
    let replyToPreview = null;
    if (replyToId) {
      const replyMessage = await Message.findById(replyToId);
      if (replyMessage && replyMessage.conversationId.toString() === id) {
        replyToPreview = {
          content: replyMessage.content?.substring(0, 100),
          senderId: replyMessage.senderId
        };
      }
    }

    // Create message
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

    // Update conversation
    await conversation.updateLastMessage(message);

    // Populate sender for response
    await message.populate('senderId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Emit via WebSocket
    if (io) {
      const { emitNewMessage } = await import('../websocket/index.js');
      emitNewMessage(io, id, {
        ...message.toObject(),
        conversationId: id
      });
    }

    attachEntityId(req, 'conversationId', id);
    attachEntityId(req, 'messageId', message._id);
    req.eventName = 'message.send.success';

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
 * PATCH /messages/:id
 * Edit a message
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Content is required',
        code: 'MISSING_CONTENT'
      });
    }

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

    if (!message.canEdit(req.user._id)) {
      return res.status(403).json({
        error: 'Cannot edit this message',
        code: 'CANNOT_EDIT'
      });
    }

    await message.edit(content);

    await message.populate('senderId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Emit via WebSocket
    if (io) {
      const { emitMessageUpdated } = await import('../websocket/index.js');
      emitMessageUpdated(io, message.conversationId, message);
    }

    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);
    req.eventName = 'message.edit.success';

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
 * Delete a message
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
    }

    // Verify conversation access and get participant role
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

    const meta = conversation.getParticipantMeta(req.user._id);
    const isAdmin = meta?.role === 'admin' || meta?.role === 'owner';

    if (!message.canDelete(req.user._id, isAdmin)) {
      return res.status(403).json({
        error: 'Cannot delete this message',
        code: 'CANNOT_DELETE'
      });
    }

    // Attach entity IDs before deletion for logging
    attachEntityId(req, 'messageId', message._id);
    attachEntityId(req, 'conversationId', message.conversationId);

    await message.softDelete(req.user._id);

    // Emit via WebSocket
    if (io) {
      const { emitMessageDeleted } = await import('../websocket/index.js');
      emitMessageDeleted(io, message.conversationId, message._id);
    }

    req.eventName = 'message.delete.success';

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

export default router;
