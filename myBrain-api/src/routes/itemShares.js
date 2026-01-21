import express from 'express';
import mongoose from 'mongoose';
import ItemShare from '../models/ItemShare.js';
import Connection from '../models/Connection.js';
import UserBlock from '../models/UserBlock.js';
import User from '../models/User.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// Supported item types and their models
const ITEM_TYPES = {
  project: 'Project',
  task: 'Task',
  note: 'Note',
  file: 'File',
  folder: 'Folder'
};

/**
 * Get the model for an item type
 */
async function getItemModel(itemType) {
  if (!ITEM_TYPES[itemType]) {
    throw new Error(`Invalid item type: ${itemType}`);
  }
  return mongoose.model(ITEM_TYPES[itemType]);
}

/**
 * Verify item ownership
 */
async function verifyOwnership(itemId, itemType, userId) {
  const Model = await getItemModel(itemType);
  const item = await Model.findById(itemId);
  if (!item) return { exists: false };
  return {
    exists: true,
    isOwner: item.userId?.toString() === userId.toString(),
    item
  };
}

/**
 * POST /item-shares
 * Share an item with users
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      itemId,
      itemType,
      userIds = [],
      shareType = 'connection',
      permission = 'view',
      password,
      expiresAt,
      maxAccessCount,
      permissions = {},
      title,
      description
    } = req.body;

    // Validate item type
    if (!ITEM_TYPES[itemType]) {
      return res.status(400).json({
        error: 'Invalid item type',
        code: 'INVALID_ITEM_TYPE'
      });
    }

    // Validate item ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID',
        code: 'INVALID_ITEM_ID'
      });
    }

    // Verify ownership
    const { exists, isOwner, item } = await verifyOwnership(itemId, itemType, req.user._id);
    if (!exists) {
      return res.status(404).json({
        error: 'Item not found',
        code: 'ITEM_NOT_FOUND'
      });
    }
    if (!isOwner) {
      return res.status(403).json({
        error: 'You do not have permission to share this item',
        code: 'NOT_OWNER'
      });
    }

    // Check for existing share
    let share = await ItemShare.findOne({
      itemId,
      itemType,
      ownerId: req.user._id,
      isActive: true
    });

    if (share && shareType === 'connection') {
      // Add new users to existing share
      for (const userId of userIds) {
        if (!mongoose.Types.ObjectId.isValid(userId)) continue;
        if (userId === req.user._id.toString()) continue;

        // Check if blocked
        const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
        if (hasBlock) continue;

        // Check if user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) continue;

        // Check if already shared with this user
        const existingShare = share.sharedWithUsers.find(
          u => u.userId.toString() === userId
        );
        if (existingShare) continue;

        // Check if connected
        const isConnected = await Connection.areConnected(req.user._id, userId);

        share.sharedWithUsers.push({
          userId,
          permission,
          status: isConnected ? 'pending' : 'pending', // Always pending until accepted
          sharedAt: new Date()
        });
      }

      await share.save();
    } else if (!share) {
      // Create new share
      const shareData = {
        itemId,
        itemType,
        ownerId: req.user._id,
        shareType,
        title: title || item.title || item.name,
        description
      };

      if (shareType === 'connection') {
        const sharedWithUsers = [];

        for (const userId of userIds) {
          if (!mongoose.Types.ObjectId.isValid(userId)) continue;
          if (userId === req.user._id.toString()) continue;

          const hasBlock = await UserBlock.hasBlockBetween(req.user._id, userId);
          if (hasBlock) continue;

          const targetUser = await User.findById(userId);
          if (!targetUser) continue;

          sharedWithUsers.push({
            userId,
            permission,
            status: 'pending',
            sharedAt: new Date()
          });
        }

        shareData.sharedWithUsers = sharedWithUsers;
      } else if (shareType === 'public' || shareType === 'password') {
        shareData.shareToken = ItemShare.generateShareToken();
        shareData.permissions = {
          canView: permissions.canView !== false,
          canComment: permissions.canComment === true,
          canEdit: permissions.canEdit === true,
          canDownload: permissions.canDownload !== false,
          canShare: permissions.canShare === true
        };

        if (expiresAt) {
          shareData.expiresAt = new Date(expiresAt);
        }
        if (maxAccessCount) {
          shareData.maxAccessCount = parseInt(maxAccessCount);
        }

        if (shareType === 'password' && password) {
          shareData.sharePasswordHash = await ItemShare.hashPassword(password);
        }
      }

      share = new ItemShare(shareData);
      await share.save();

      // Update owner's shared item count
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'socialStats.sharedItemCount': 1 }
      });
    }

    // Populate for response
    await share.populate('sharedWithUsers.userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', itemId);
    req.eventName = 'share.create.success';

    res.status(201).json({
      message: 'Item shared successfully',
      share: {
        _id: share._id,
        itemId: share.itemId,
        itemType: share.itemType,
        shareType: share.shareType,
        shareToken: share.shareToken,
        sharedWithUsers: share.sharedWithUsers,
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        title: share.title,
        createdAt: share.createdAt
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'share_item' });
    res.status(500).json({
      error: 'Failed to share item',
      code: 'SHARE_ERROR'
    });
  }
});

/**
 * GET /item-shares
 * Get items shared with the current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { itemType, limit = 50, skip = 0 } = req.query;

    const shares = await ItemShare.getSharedWithUser(req.user._id, {
      itemType,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get the actual items
    const sharesWithItems = await Promise.all(
      shares.map(async (share) => {
        try {
          const Model = await getItemModel(share.itemType);
          const item = await Model.findById(share.itemId);
          const userShare = share.sharedWithUsers.find(
            u => u.userId._id.toString() === req.user._id.toString()
          );

          return {
            _id: share._id,
            item: item ? {
              _id: item._id,
              title: item.title || item.name,
              type: share.itemType
            } : null,
            owner: share.ownerId,
            permission: userShare?.permission,
            sharedAt: userShare?.sharedAt,
            itemType: share.itemType
          };
        } catch {
          return null;
        }
      })
    );

    const validShares = sharesWithItems.filter(s => s && s.item);

    const counts = await ItemShare.getShareCounts(req.user._id);

    res.json({
      shares: validShares,
      total: counts.sharedWithMe,
      hasMore: parseInt(skip) + validShares.length < counts.sharedWithMe
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_shared_with_me' });
    res.status(500).json({
      error: 'Failed to get shared items',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/by-me
 * Get items shared by the current user
 */
router.get('/by-me', requireAuth, async (req, res) => {
  try {
    const { itemType, limit = 50, skip = 0 } = req.query;

    const shares = await ItemShare.getSharedByUser(req.user._id, {
      itemType,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get the actual items
    const sharesWithItems = await Promise.all(
      shares.map(async (share) => {
        try {
          const Model = await getItemModel(share.itemType);
          const item = await Model.findById(share.itemId);

          return {
            _id: share._id,
            item: item ? {
              _id: item._id,
              title: item.title || item.name,
              type: share.itemType
            } : null,
            shareType: share.shareType,
            shareToken: share.shareToken,
            sharedWithUsers: share.sharedWithUsers,
            permissions: share.permissions,
            expiresAt: share.expiresAt,
            accessCount: share.currentAccessCount,
            itemType: share.itemType,
            createdAt: share.createdAt
          };
        } catch {
          return null;
        }
      })
    );

    const validShares = sharesWithItems.filter(s => s && s.item);

    const counts = await ItemShare.getShareCounts(req.user._id);

    res.json({
      shares: validShares,
      total: counts.sharedByMe,
      hasMore: parseInt(skip) + validShares.length < counts.sharedByMe
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_shared_by_me' });
    res.status(500).json({
      error: 'Failed to get shared items',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/pending
 * Get pending share invitations
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const shares = await ItemShare.getPendingShares(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get the actual items
    const sharesWithItems = await Promise.all(
      shares.map(async (share) => {
        try {
          const Model = await getItemModel(share.itemType);
          const item = await Model.findById(share.itemId);
          const userShare = share.sharedWithUsers.find(
            u => u.userId.toString() === req.user._id.toString()
          );

          return {
            _id: share._id,
            item: item ? {
              _id: item._id,
              title: item.title || item.name,
              type: share.itemType
            } : null,
            owner: share.ownerId,
            permission: userShare?.permission,
            sharedAt: userShare?.sharedAt,
            itemType: share.itemType,
            title: share.title,
            description: share.description
          };
        } catch {
          return null;
        }
      })
    );

    const validShares = sharesWithItems.filter(s => s && s.item);

    const counts = await ItemShare.getShareCounts(req.user._id);

    res.json({
      shares: validShares,
      total: counts.pending,
      hasMore: parseInt(skip) + validShares.length < counts.pending
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_pending_shares' });
    res.status(500).json({
      error: 'Failed to get pending shares',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/counts
 * Get share counts
 */
router.get('/counts', requireAuth, async (req, res) => {
  try {
    const counts = await ItemShare.getShareCounts(req.user._id);
    res.json(counts);
  } catch (error) {
    attachError(req, error, { operation: 'get_share_counts' });
    res.status(500).json({
      error: 'Failed to get counts',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/item/:itemId
 * Get share for a specific item (check if item is already shared)
 */
router.get('/item/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { itemType } = req.query;

    if (!itemType || !ITEM_TYPES[itemType]) {
      return res.status(400).json({
        error: 'Invalid or missing item type',
        code: 'INVALID_ITEM_TYPE'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID',
        code: 'INVALID_ITEM_ID'
      });
    }

    // Find active share for this item
    const share = await ItemShare.findOne({
      itemId,
      itemType,
      ownerId: req.user._id,
      isActive: true
    }).populate('sharedWithUsers.userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    if (!share) {
      return res.json({ share: null });
    }

    res.json({
      share: {
        _id: share._id,
        itemId: share.itemId,
        itemType: share.itemType,
        shareType: share.shareType,
        shareToken: share.shareToken,
        sharedWithUsers: share.sharedWithUsers,
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        title: share.title,
        description: share.description,
        createdAt: share.createdAt
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_share_by_item' });
    res.status(500).json({
      error: 'Failed to get share',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /item-shares/:id/accept
 * Accept a share invitation
 */
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const share = await ItemShare.findOne({
      _id: id,
      'sharedWithUsers.userId': req.user._id,
      'sharedWithUsers.status': 'pending',
      isActive: true
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share invitation not found',
        code: 'NOT_FOUND'
      });
    }

    // Update the user's status
    const userIndex = share.sharedWithUsers.findIndex(
      u => u.userId.toString() === req.user._id.toString()
    );

    if (userIndex !== -1) {
      share.sharedWithUsers[userIndex].status = 'accepted';
      share.sharedWithUsers[userIndex].acceptedAt = new Date();
      await share.save();
    }

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.accept.success';

    res.json({
      message: 'Share accepted'
    });
  } catch (error) {
    attachError(req, error, { operation: 'accept_share' });
    res.status(500).json({
      error: 'Failed to accept share',
      code: 'ACCEPT_ERROR'
    });
  }
});

/**
 * POST /item-shares/:id/decline
 * Decline a share invitation
 */
router.post('/:id/decline', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const share = await ItemShare.findOne({
      _id: id,
      'sharedWithUsers.userId': req.user._id,
      'sharedWithUsers.status': 'pending',
      isActive: true
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share invitation not found',
        code: 'NOT_FOUND'
      });
    }

    // Update the user's status
    const userIndex = share.sharedWithUsers.findIndex(
      u => u.userId.toString() === req.user._id.toString()
    );

    if (userIndex !== -1) {
      share.sharedWithUsers[userIndex].status = 'declined';
      await share.save();
    }

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.decline.success';

    res.json({
      message: 'Share declined'
    });
  } catch (error) {
    attachError(req, error, { operation: 'decline_share' });
    res.status(500).json({
      error: 'Failed to decline share',
      code: 'DECLINE_ERROR'
    });
  }
});

/**
 * PATCH /item-shares/:id
 * Update share settings
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, expiresAt, maxAccessCount, title, description } = req.body;

    const share = await ItemShare.findOne({
      _id: id,
      ownerId: req.user._id,
      isActive: true
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    // Update fields
    if (permissions) {
      share.permissions = { ...share.permissions, ...permissions };
    }
    if (expiresAt !== undefined) {
      share.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (maxAccessCount !== undefined) {
      share.maxAccessCount = maxAccessCount ? parseInt(maxAccessCount) : null;
    }
    if (title !== undefined) {
      share.title = title;
    }
    if (description !== undefined) {
      share.description = description;
    }

    await share.save();

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.update.success';

    res.json({
      message: 'Share updated',
      share
    });
  } catch (error) {
    attachError(req, error, { operation: 'update_share' });
    res.status(500).json({
      error: 'Failed to update share',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /item-shares/:id
 * Revoke a share
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const share = await ItemShare.findOne({
      _id: id,
      ownerId: req.user._id,
      isActive: true
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    share.isActive = false;
    await share.save();

    // Update owner's shared item count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'socialStats.sharedItemCount': -1 }
    });

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.delete.success';

    res.json({
      message: 'Share revoked'
    });
  } catch (error) {
    attachError(req, error, { operation: 'revoke_share' });
    res.status(500).json({
      error: 'Failed to revoke share',
      code: 'REVOKE_ERROR'
    });
  }
});

/**
 * DELETE /item-shares/:id/users/:userId
 * Remove a user from a share
 */
router.delete('/:id/users/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const share = await ItemShare.findOne({
      _id: id,
      ownerId: req.user._id,
      isActive: true
    });

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    share.sharedWithUsers = share.sharedWithUsers.filter(
      u => u.userId.toString() !== userId
    );
    await share.save();

    // Wide Events logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.removeUser.success';

    res.json({
      message: 'User removed from share'
    });
  } catch (error) {
    attachError(req, error, { operation: 'remove_user_from_share' });
    res.status(500).json({
      error: 'Failed to remove user',
      code: 'REMOVE_ERROR'
    });
  }
});

/**
 * GET /item-shares/token/:token
 * Access a public/password share by token
 */
router.get('/token/:token', optionalAuth, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const share = await ItemShare.getByToken(token);

    if (!share) {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'NOT_FOUND'
      });
    }

    // Check expiration
    if (share.isExpired()) {
      return res.status(410).json({
        error: 'Share has expired',
        code: 'EXPIRED'
      });
    }

    // Check max access
    if (share.hasReachedMaxAccess()) {
      return res.status(410).json({
        error: 'Share has reached maximum access count',
        code: 'MAX_ACCESS_REACHED'
      });
    }

    // Check password
    if (share.shareType === 'password') {
      if (!password) {
        return res.json({
          requiresPassword: true,
          title: share.title,
          owner: share.ownerId
        });
      }

      const isValid = await share.verifyPassword(password);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
      }
    }

    // Get the item
    const Model = await getItemModel(share.itemType);
    const item = await Model.findById(share.itemId);

    if (!item) {
      return res.status(404).json({
        error: 'Item no longer exists',
        code: 'ITEM_NOT_FOUND'
      });
    }

    // Log access
    await share.logAccess(
      req.user?._id || null,
      'view',
      req.ip
    );

    res.json({
      share: {
        _id: share._id,
        title: share.title,
        description: share.description,
        owner: share.ownerId,
        permissions: share.permissions,
        itemType: share.itemType
      },
      item: {
        _id: item._id,
        title: item.title || item.name,
        content: share.permissions.canView ? item.content : undefined,
        // Add more item fields as needed based on item type
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'access_share_token' });
    res.status(500).json({
      error: 'Failed to access share',
      code: 'ACCESS_ERROR'
    });
  }
});

export default router;
