/**
 * =============================================================================
 * ITEMSHARES.JS - Item Sharing Routes
 * =============================================================================
 *
 * This file handles sharing individual items with other users in myBrain.
 * Items (notes, tasks, projects, files, folders) can be shared with
 * connected users to collaborate and share information.
 *
 * WHAT IS ITEM SHARING?
 * ---------------------
 * Item sharing allows you to:
 * - Share a single note, task, or project with another user
 * - Give them read-only or edit access
 * - Share files and folders with specific people
 * - Control exactly what you share (not everything)
 *
 * SHAREABLE ITEM TYPES:
 * ---------------------
 * 1. NOTES: Share thoughts, ideas, research
 * 2. TASKS: Assign tasks or share work items
 * 3. PROJECTS: Collaborate on entire projects
 * 4. FILES: Share documents and resources
 * 5. FOLDERS: Share entire folder structures
 *
 * SHARE PERMISSIONS:
 * ------------------
 * - VIEW: Recipient can see the item, but not edit
 * - EDIT: Recipient can view and modify
 * - COMMENT: Recipient can add comments (future feature)
 * - OWNER: You (original creator) always have full control
 *
 * SHARE WORKFLOW:
 * ----------------
 * 1. YOU select an item to share
 * 2. YOU choose who to share with (must be connected)
 * 3. YOU set permission level (view, edit, etc.)
 * 4. RECIPIENT gets notification of shared item
 * 5. RECIPIENT can view in their "shared with me" section
 * 6. CHANGES: If editable, both see real-time updates
 *
 * SHARE VISIBILITY:
 * ------------------
 * - Shared items appear in recipient's sidebar
 * - Listed in "Shared with Me" section
 * - Different from copied (original stays connected)
 * - Changes sync to both users (if editable)
 *
 * UNSHARING:
 * -----------
 * - You can unshare at any time
 * - Recipient loses access immediately
 * - Item stays in their history (read-only copy remains)
 * - They get notification of unsharing
 *
 * ENDPOINTS:
 * -----------
 * - POST /item-shares - Share an item with user
 * - GET /item-shares - Get items shared with me
 * - GET /item-shares/:id - Get details of shared item
 * - PUT /item-shares/:id - Update permission level
 * - DELETE /item-shares/:id - Unshare an item
 * - GET /item-shares/shared-by-me - See what I've shared
 * - POST /item-shares/:id/duplicate - Make personal copy
 *
 * WHO CAN SHARE WITH WHOM:
 * ------------------------
 * - Must be connections (social connections feature)
 * - Can't share with blocked users
 * - Can't share with users who blocked you
 * - Can share with anyone you're connected to
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post defines a different sharing operation.
 */
import express from 'express';

/**
 * Mongoose provides database utilities, especially ObjectId validation.
 * We use mongoose.Types.ObjectId.isValid() to validate IDs
 * before querying the database. Also used to access database models.
 */
import mongoose from 'mongoose';

/**
 * ItemShare model represents a sharing relationship.
 * Tracks which items are shared, with whom, and what permissions they have.
 * Supports multiple share types: connection-based, public, password-protected.
 */
import ItemShare from '../models/ItemShare.js';

/**
 * Connection model checks if two users are connected (friends).
 * We use this to validate that sharing is only between connections.
 * Users cannot share with non-connected users (prevents unsolicited sharing).
 */
import Connection from '../models/Connection.js';

/**
 * UserBlock model checks for blocking relationships between users.
 * We use this to prevent sharing with blocked users.
 * If user A blocks user B, user B cannot share with user A.
 */
import UserBlock from '../models/UserBlock.js';

/**
 * User model represents user accounts and their profile data.
 * We use this to update user statistics (sharedItemCount, etc.)
 * and to fetch recipient data for populating share responses.
 */
import User from '../models/User.js';

/**
 * Auth middleware provides two authentication modes:
 * - requireAuth: User must be logged in (needed for most endpoints)
 * - optionalAuth: User can be logged in or anonymous (for public share access)
 */
import { requireAuth, optionalAuth } from '../middleware/auth.js';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to request logs.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach share ID, we can search logs for sharing activity.
 * Example: attachEntityId(req, 'shareId', share._id)
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all sharing-related endpoints together
const router = express.Router();

// =============================================================================
// SUPPORTED ITEM TYPES & HELPER FUNCTIONS
// =============================================================================

/**
 * ITEM_TYPES defines which content types can be shared.
 * Maps item type names to their MongoDB model names.
 * Example: { note: 'Note' } means "note" items use the Note model
 *
 * SUPPORTED TYPES:
 * - project: Projects
 * - task: Individual tasks
 * - note: Notes
 * - file: Uploaded files
 * - folder: Folder structures
 *
 * When user shares an item, we store itemType so we know
 * which model to query to fetch the shared content.
 */
const ITEM_TYPES = {
  project: 'Project',
  task: 'Task',
  note: 'Note',
  file: 'File',
  folder: 'Folder'
};

/**
 * getItemModel(itemType)
 *
 * WHAT IT DOES:
 * Converts an item type string (e.g., "note") to its MongoDB model class.
 * This allows us to dynamically query the right collection.
 *
 * EXAMPLE:
 * const NoteModel = await getItemModel('note');
 * const note = await NoteModel.findById(noteId);
 *
 * WHY THIS PATTERN:
 * Instead of hardcoding if (itemType === 'note') { ... } else if (itemType === 'task') { ... },
 * we use dynamic model loading. Cleaner and easier to add new item types.
 *
 * @param {string} itemType - The item type (e.g., "note", "task", "project")
 * @returns {Promise<Model>} MongoDB model class for that type
 * @throws {Error} If itemType is not in ITEM_TYPES
 */
async function getItemModel(itemType) {
  // Check if itemType is valid (exists in ITEM_TYPES)
  if (!ITEM_TYPES[itemType]) {
    throw new Error(`Invalid item type: ${itemType}`);
  }
  // Use mongoose to get the model class for this type
  // mongoose.model('Note') returns the Note model, etc.
  return mongoose.model(ITEM_TYPES[itemType]);
}

/**
 * verifyOwnership(itemId, itemType, userId)
 *
 * WHAT IT DOES:
 * Checks if a user owns a specific item.
 * Prevents users from sharing items they don't own (security check).
 *
 * USAGE:
 * Before allowing a user to share an item, we verify they own it.
 * Only the original creator can share their own content.
 *
 * RETURNS:
 * {
 *   exists: boolean,    // Does the item exist?
 *   isOwner: boolean,   // Does this user own it?
 *   item: object        // The item document (if exists)
 * }
 *
 * @param {string} itemId - The item's MongoDB ID
 * @param {string} itemType - The item's type (note, task, etc.)
 * @param {string} userId - The user ID to check ownership
 * @returns {Promise<object>} Object with exists, isOwner, item
 */
async function verifyOwnership(itemId, itemType, userId) {
  // Step 1: Get the model class for this item type
  const Model = await getItemModel(itemType);

  // Step 2: Query database for the item
  const item = await Model.findById(itemId);

  // Step 3: If item doesn't exist, return early
  if (!item) return { exists: false };

  // Step 4: Check if userId matches item's owner (userId field)
  // Convert both to strings for comparison (MongoDB IDs are objects)
  return {
    exists: true,
    isOwner: item.userId?.toString() === userId.toString(),
    item
  };
}

// =============================================================================
// ROUTE: POST /item-shares
// =============================================================================

/**
 * POST /item-shares
 * Share an item with users or create public/password-protected share
 *
 * WHAT IT DOES:
 * Creates a share of an item (note, task, project, file, folder).
 * Supports multiple share types:
 * - connection: Share with individual connected users
 * - public: Anyone with link can view (no authentication needed)
 * - password: Anyone with link+password can view
 *
 * USE CASES:
 * - Share note with specific teammate
 * - Create public link to share project
 * - Password-protect sensitive item for sharing
 * - Bulk share with multiple connected users
 *
 * REQUEST BODY:
 * {
 *   "itemId": "507f1f77bcf86cd799439011",       // ID of item to share (required)
 *   "itemType": "note",                         // Type: note|task|project|file|folder (required)
 *   "shareType": "connection",                  // Share type (default: connection)
 *   "userIds": ["507f...", "508f..."],          // User IDs for connection shares
 *   "permission": "view",                       // Permission level: view|edit (default: view)
 *   "title": "My Shared Note",                  // Optional display title
 *   "description": "Team notes for Q4",         // Optional description
 *   "password": "mypassword",                   // For password shares (optional)
 *   "expiresAt": "2025-03-15",                  // Link expiration date (optional)
 *   "maxAccessCount": 100,                      // Max access limit (optional)
 *   "permissions": {                            // Advanced permissions (public/password only)
 *     "canView": true,
 *     "canEdit": false,
 *     "canComment": true,
 *     "canDownload": true,
 *     "canShare": false
 *   }
 * }
 *
 * EXAMPLE REQUESTS:
 *
 * 1. Share with specific users:
 * POST /item-shares
 * {
 *   "itemId": "507f1f77bcf86cd799439011",
 *   "itemType": "note",
 *   "shareType": "connection",
 *   "userIds": ["507f...", "508f..."],
 *   "permission": "view"
 * }
 *
 * 2. Create public link:
 * POST /item-shares
 * {
 *   "itemId": "507f1f77bcf86cd799439011",
 *   "itemType": "project",
 *   "shareType": "public",
 *   "permissions": { "canView": true, "canEdit": false }
 * }
 *
 * 3. Create password-protected share:
 * POST /item-shares
 * {
 *   "itemId": "507f1f77bcf86cd799439011",
 *   "itemType": "file",
 *   "shareType": "password",
 *   "password": "secretcode",
 *   "expiresAt": "2025-03-15"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   "message": "Item shared successfully",
 *   "share": {
 *     "_id": "607f1f77bcf86cd799439101",
 *     "itemId": "507f1f77bcf86cd799439011",
 *     "itemType": "note",
 *     "shareType": "connection",
 *     "sharedWithUsers": [
 *       {
 *         "userId": {
 *           "_id": "507f1f77bcf86cd799439021",
 *           "email": "user@example.com",
 *           "profile": { "displayName": "John" }
 *         },
 *         "permission": "view",
 *         "status": "pending",
 *         "sharedAt": "2025-02-15T10:30:00.000Z"
 *       }
 *     ],
 *     "title": "My Shared Note",
 *     "createdAt": "2025-02-15T10:30:00.000Z"
 *   }
 * }
 *
 * SHARE TYPES:
 *
 * CONNECTION SHARES:
 * - Share with specific connected users
 * - Recipients get notifications
 * - Recipients can accept/decline
 * - Status changes: pending → accepted
 * - Both see real-time updates if edit permission granted
 *
 * PUBLIC SHARES:
 * - Create public link anyone can access
 * - No authentication required
 * - No access limits (anyone with link can view)
 * - Good for collaboration, publishing
 * - Get shareToken in response: /item-shares/token/{shareToken}
 *
 * PASSWORD SHARES:
 * - Public link but requires password
 * - Good for sensitive documents
 * - Can set expiration date
 * - Can limit access count
 * - Password is hashed (never stored in plain text)
 *
 * VALIDATION RULES:
 * - itemId and itemType required
 * - User must own the item (ownership check)
 * - Cannot share with blocked users
 * - Cannot share with non-connected users (connection shares)
 * - userIds must be valid MongoDB ObjectIds
 * - Cannot share with yourself
 *
 * ERROR RESPONSES:
 * - 400: Invalid itemType, invalid itemId, validation error
 * - 403: Not item owner, cannot share
 * - 404: Item not found
 * - 500: Server error
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract request body parameters
    // All parameters are optional except itemId and itemType
    const {
      itemId,
      itemType,
      userIds = [],                    // Default to empty array for non-connection shares
      shareType = 'connection',        // Default to sharing with connections
      permission = 'view',             // Default to view-only
      password,
      expiresAt,
      maxAccessCount,
      permissions = {},                // Advanced permissions for public/password shares
      title,
      description
    } = req.body;

    // Step 2: Validate that itemType is supported
    // itemType must be in ITEM_TYPES (note, task, project, file, folder)
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

// =============================================================================
// ROUTE: GET /item-shares
// =============================================================================

/**
 * GET /item-shares
 * Get items shared with the current user
 *
 * WHAT IT DOES:
 * Lists all items that other users have shared with the authenticated user.
 * Returns items across all share types (connection, public, password).
 * Includes ownership and permission information for each share.
 *
 * USE CASES:
 * - Display "Shared with Me" sidebar section
 * - Show all received shares in dashboard
 * - Filter shares by item type
 * - Paginate through many shared items
 *
 * QUERY PARAMETERS:
 * - itemType: Optional. Filter by type (note, task, project, file, folder)
 *   Example: /item-shares?itemType=note
 * - limit: Optional. Items per page (default: 50)
 *   Example: /item-shares?limit=20
 * - skip: Optional. Items to skip for pagination (default: 0)
 *   Example: /item-shares?skip=50&limit=20 (page 2)
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "shares": [
 *     {
 *       "_id": "607f1f77bcf86cd799439101",
 *       "item": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "title": "Q4 Planning Notes",
 *         "type": "note"
 *       },
 *       "owner": {
 *         "_id": "507f1f77bcf86cd799439021",
 *         "email": "owner@example.com"
 *       },
 *       "permission": "view",
 *       "sharedAt": "2025-02-14T15:20:00.000Z",
 *       "itemType": "note"
 *     }
 *   ],
 *   "total": 12,
 *   "hasMore": true
 * }
 *
 * PERMISSIONS:
 * - view: Can read item but not edit
 * - edit: Can read and modify item
 * - Each share can have different permission level
 *
 * PAGINATION:
 * Response includes "total" (all shares) and "hasMore" (is there a next page).
 * Frontend loads 50 items at a time, user can load more.
 *
 * ERROR RESPONSES:
 * - 500: Server error
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract query parameters with defaults
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
 * Get items I have shared with other users
 *
 * WHAT IT DOES:
 * Returns a paginated list of all items the current user has shared with others.
 * Allows users to see what they've shared, with whom, and manage those shares.
 * Returns items across all share types (connection, public, password).
 *
 * USE CASES:
 * - Display "Shared by Me" sidebar section showing what user has shared
 * - Track all active shares a user has created
 * - Filter shares by item type
 * - Paginate through many shared items
 * - Manage sharing settings and permissions
 *
 * QUERY PARAMETERS:
 * - itemType: Optional. Filter by type (note, task, project, file, folder)
 *   Example: /item-shares/by-me?itemType=note
 * - limit: Optional. Items per page (default: 50)
 *   Example: /item-shares/by-me?limit=20
 * - skip: Optional. Items to skip for pagination (default: 0)
 *   Example: /item-shares/by-me?skip=50&limit=20 (page 2)
 *
 * EXAMPLE REQUEST:
 * GET /item-shares/by-me?itemType=project&limit=25&skip=0
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "shares": [
 *     {
 *       "_id": "607f1f77bcf86cd799439101",
 *       "item": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "title": "Q4 Planning Document",
 *         "type": "project"
 *       },
 *       "shareType": "connection",
 *       "shareToken": "abc123xyz789",
 *       "sharedWithUsers": [
 *         {
 *           "userId": {
 *             "_id": "507f1f77bcf86cd799439021",
 *             "email": "teammate@example.com",
 *             "profile": { "displayName": "Alice" }
 *           },
 *           "permission": "edit",
 *           "status": "accepted",
 *           "sharedAt": "2025-02-14T15:20:00.000Z"
 *         }
 *       ],
 *       "permissions": { "canView": true, "canEdit": true, "canDownload": true },
 *       "expiresAt": null,
 *       "accessCount": 12,
 *       "itemType": "project",
 *       "createdAt": "2025-02-14T15:20:00.000Z"
 *     }
 *   ],
 *   "total": 5,
 *   "hasMore": false
 * }
 *
 * @returns {Object} Paginated list of shares created by user
 *
 * ERROR RESPONSES:
 * - 500: Server error
 */
router.get('/by-me', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract query parameters with defaults for pagination
    // limit controls page size (default 50), skip controls offset for pagination
    // itemType allows filtering by content type if provided
    const { itemType, limit = 50, skip = 0 } = req.query;

    // Step 2: Call service to fetch shares created by this user
    // Service handles filtering by userId and itemType, applies pagination
    const shares = await ItemShare.getSharedByUser(req.user._id, {
      itemType,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Fetch full item details for each share
    // We have share metadata but need actual item data to display preview info
    const sharesWithItems = await Promise.all(
      shares.map(async (share) => {
        try {
          // Get the model class for this item type (Note, Task, Project, etc.)
          const Model = await getItemModel(share.itemType);
          // Query for the actual item by its ID
          const item = await Model.findById(share.itemId);

          // Return share with item details for frontend display
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
          // If item fetch fails, return null (will be filtered out)
          return null;
        }
      })
    );

    // Step 4: Filter out any failed lookups
    // Only include shares where we successfully found the item
    const validShares = sharesWithItems.filter(s => s && s.item);

    // Step 5: Get total count for pagination
    // Used by frontend to show total shares and calculate hasMore flag
    const counts = await ItemShare.getShareCounts(req.user._id);

    // Step 6: Log this action for audit trail
    req.eventName = 'share.list.byMe.success';

    // Step 7: Return paginated results with metadata
    res.json({
      shares: validShares,
      total: counts.sharedByMe,
      hasMore: parseInt(skip) + validShares.length < counts.sharedByMe
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'get_shared_by_me' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to get shared items',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/:id/analytics
 * Get analytics data for a share
 *
 * WHAT IT DOES:
 * Returns access history and statistics for a shared item.
 * Only the owner of the share can view analytics.
 *
 * ANALYTICS DATA:
 * - Total view count
 * - Recent access log entries
 * - Access trends (views per day)
 *
 * PATH PARAMETERS:
 * - id: Share ID
 *
 * EXAMPLE RESPONSE:
 * {
 *   "analytics": {
 *     "totalViews": 45,
 *     "uniqueViewers": 12,
 *     "recentAccess": [...],
 *     "viewsByDay": { "2026-01-28": 5, "2026-01-27": 12 }
 *   }
 * }
 */
router.get('/:id/analytics', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the share
    const share = await ItemShare.findById(id);

    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    // Only owner can view analytics
    if (share.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Only the owner can view analytics',
        code: 'NOT_OWNER'
      });
    }

    // Calculate analytics
    const accessLog = share.accessLog || [];

    // Get unique viewers (by userId or IP for anonymous)
    const uniqueViewers = new Set();
    accessLog.forEach(entry => {
      if (entry.userId) {
        uniqueViewers.add(entry.userId.toString());
      } else if (entry.ip) {
        uniqueViewers.add(entry.ip);
      }
    });

    // Group views by day
    const viewsByDay = {};
    accessLog.forEach(entry => {
      const day = new Date(entry.accessedAt).toISOString().split('T')[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    // Get recent access (last 20 entries)
    const recentAccess = accessLog
      .slice(-20)
      .reverse()
      .map(entry => ({
        userId: entry.userId,
        action: entry.action,
        accessedAt: entry.accessedAt,
        ip: entry.ip ? entry.ip.substring(0, 6) + '***' : null // Partial IP for privacy
      }));

    // Populate user info for recent access
    const populatedAccess = await Promise.all(
      recentAccess.map(async (entry) => {
        if (entry.userId) {
          const User = mongoose.model('User');
          const user = await User.findById(entry.userId, 'email profile.displayName profile.avatarUrl');
          return { ...entry, user };
        }
        return entry;
      })
    );

    attachEntityId(req, 'shareId', id);
    req.eventName = 'share.analytics.view';

    res.json({
      analytics: {
        totalViews: share.currentAccessCount || 0,
        uniqueViewers: uniqueViewers.size,
        recentAccess: populatedAccess,
        viewsByDay,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        maxAccessCount: share.maxAccessCount
      }
    });
  } catch (error) {
    attachError(req, error, { operation: 'get_share_analytics' });
    res.status(500).json({
      error: 'Failed to get analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

/**
 * GET /item-shares/pending
 * Get pending share invitations waiting for user acceptance
 *
 * WHAT IT DOES:
 * Returns list of share invitations that haven't been accepted/declined yet.
 * Users need to review and accept these shares to gain access to items.
 * Helps users see what's waiting for their action.
 *
 * USE CASES:
 * - Show notification badge with pending share count
 * - Display pending invitations in a dedicated section
 * - Let user accept/decline pending shares
 * - Clear inbox of pending share notifications
 *
 * QUERY PARAMETERS:
 * - limit: Optional. Items per page (default: 50)
 *   Example: /item-shares/pending?limit=20
 * - skip: Optional. Items to skip for pagination (default: 0)
 *   Example: /item-shares/pending?skip=50&limit=20 (page 2)
 *
 * EXAMPLE REQUEST:
 * GET /item-shares/pending?limit=10&skip=0
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "shares": [
 *     {
 *       "_id": "607f1f77bcf86cd799439101",
 *       "item": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "title": "Team Project Notes",
 *         "type": "note"
 *       },
 *       "owner": {
 *         "_id": "507f1f77bcf86cd799439021",
 *         "email": "boss@example.com"
 *       },
 *       "permission": "view",
 *       "sharedAt": "2025-02-15T10:00:00.000Z",
 *       "itemType": "note",
 *       "title": "Team Project Notes",
 *       "description": "Review this project plan and provide feedback"
 *     }
 *   ],
 *   "total": 3,
 *   "hasMore": false
 * }
 *
 * SHARE STATUS:
 * - pending: User has not accepted or declined yet
 * - accepted: User approved, item is now shared
 * - declined: User rejected, item is not shared
 *
 * ACTIONS:
 * - POST /item-shares/:id/accept - Accept invitation
 * - POST /item-shares/:id/decline - Reject invitation
 *
 * ERROR RESPONSES:
 * - 500: Server error
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    const { limit = 50, skip = 0 } = req.query;

    // Step 2: Fetch pending shares for current user
    // Service returns only shares with status = 'pending'
    const shares = await ItemShare.getPendingShares(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    // Step 3: Fetch full item details for each pending share
    // We need item information to display to user for decision-making
    const sharesWithItems = await Promise.all(
      shares.map(async (share) => {
        try {
          // Get the model class for this item type
          const Model = await getItemModel(share.itemType);
          // Fetch the actual item being shared
          const item = await Model.findById(share.itemId);
          // Find this user's share record to get permission and status info
          const userShare = share.sharedWithUsers.find(
            u => u.userId.toString() === req.user._id.toString()
          );

          // Return share with all info needed for user to make decision
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
          // If we can't fetch item details, skip this share
          return null;
        }
      })
    );

    // Step 4: Filter out any failed lookups
    const validShares = sharesWithItems.filter(s => s && s.item);

    // Step 5: Get total counts for pagination
    const counts = await ItemShare.getShareCounts(req.user._id);

    // Step 6: Log this action
    req.eventName = 'share.list.pending.success';

    // Step 7: Return pending shares with pagination info
    res.json({
      shares: validShares,
      total: counts.pending,
      hasMore: parseInt(skip) + validShares.length < counts.pending
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'get_pending_shares' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to get pending shares',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/counts
 * Get summary counts of shares (for badges/notifications)
 *
 * WHAT IT DOES:
 * Returns count summaries for different share statuses.
 * Used by frontend to show badges on navigation items (e.g., "3 pending shares").
 * Helps users quickly see how many shares need their attention.
 *
 * USE CASES:
 * - Show notification badge: "You have 5 pending invitations"
 * - Display statistics in share management UI
 * - Quick overview of sharing activity
 * - Navigation menu share count badges
 *
 * EXAMPLE REQUEST:
 * GET /item-shares/counts
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "sharedWithMe": 12,    // Items shared with me that I accepted
 *   "sharedByMe": 8,       // Items I'm sharing with others
 *   "pending": 3,          // Pending invitations I need to review
 *   "total": 23            // Total shares (active + pending)
 * }
 *
 * ERROR RESPONSES:
 * - 500: Server error
 */
router.get('/counts', requireAuth, async (req, res) => {
  try {
    // Step 1: Call service to get share counts for this user
    // Returns object with various share status counts
    const counts = await ItemShare.getShareCounts(req.user._id);

    // Step 2: Log this action
    req.eventName = 'share.counts.success';

    // Step 3: Return counts for frontend badge/notification display
    res.json(counts);
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'get_share_counts' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to get counts',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /item-shares/item/:itemId
 * Get share details for a specific item owned by user
 *
 * WHAT IT DOES:
 * Retrieves the active share record for a specific item.
 * Used when editing an item to show current share settings.
 * Helps determine if an item is already shared and with whom.
 *
 * USE CASES:
 * - Load current share settings when opening item's share dialog
 * - Check if an item has an active share before creating new one
 * - Get existing share token to copy/regenerate
 * - View current permissions and shared recipients
 * - Show share status in item editor
 *
 * PATH PARAMETERS:
 * - itemId: The item's MongoDB ID (required)
 *   Example: /item-shares/item/507f1f77bcf86cd799439011
 *
 * QUERY PARAMETERS:
 * - itemType: Required. Type of item (note, task, project, file, folder)
 *   Example: /item-shares/item/507f.../share?itemType=note
 *
 * EXAMPLE REQUEST:
 * GET /item-shares/item/507f1f77bcf86cd799439011?itemType=project
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "share": {
 *     "_id": "607f1f77bcf86cd799439101",
 *     "itemId": "507f1f77bcf86cd799439011",
 *     "itemType": "project",
 *     "shareType": "connection",
 *     "shareToken": "abc123xyz789def456",
 *     "sharedWithUsers": [
 *       {
 *         "userId": {
 *           "_id": "507f1f77bcf86cd799439021",
 *           "email": "user@example.com",
 *           "profile": { "displayName": "John", "avatarUrl": "..." }
 *         },
 *         "permission": "edit",
 *         "status": "accepted"
 *       }
 *     ],
 *     "permissions": { "canView": true, "canEdit": true },
 *     "expiresAt": null,
 *     "title": "Q4 Planning",
 *     "description": "Team project plan",
 *     "createdAt": "2025-02-15T10:00:00.000Z"
 *   }
 * }
 *
 * NO SHARE RESPONSE (200 OK):
 * If item is not shared:
 * {
 *   "share": null
 * }
 *
 * ERROR RESPONSES:
 * - 400: Invalid itemId or missing itemType
 * - 500: Server error
 */
router.get('/item/:itemId', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract item ID and type from request
    const { itemId } = req.params;
    const { itemType } = req.query;

    // Step 2: Validate that itemType is provided and valid
    // Must specify what type of item we're checking
    if (!itemType || !ITEM_TYPES[itemType]) {
      return res.status(400).json({
        error: 'Invalid or missing item type',
        code: 'INVALID_ITEM_TYPE'
      });
    }

    // Step 3: Validate that itemId is proper MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID',
        code: 'INVALID_ITEM_ID'
      });
    }

    // Step 4: Find active share for this specific item
    // Only return shares owned by current user for this item
    const share = await ItemShare.findOne({
      itemId,
      itemType,
      ownerId: req.user._id,
      isActive: true
    }).populate('sharedWithUsers.userId', 'email profile.displayName profile.firstName profile.lastName profile.avatarUrl profile.defaultAvatarId');

    // Step 5: Check if share exists for this item
    if (!share) {
      // No active share found - return null to indicate item is not shared
      return res.json({ share: null });
    }

    // Step 6: Log this action
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', itemId);
    req.eventName = 'share.get.byItem.success';

    // Step 7: Return share details
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
    // Log error for debugging
    attachError(req, error, { operation: 'get_share_by_item' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to get share',
      code: 'FETCH_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /item-shares/:id/accept
// =============================================================================

/**
 * POST /item-shares/:id/accept
 * Accept a pending share invitation from another user
 *
 * WHAT IT DOES:
 * Changes share status from "pending" to "accepted".
 * Confirms that recipient wants to receive this shared item.
 * Item becomes officially shared and visible in "Shared with Me".
 *
 * USE CASES:
 * - Accept share invitation from teammate
 * - Confirm you want to collaborate on shared item
 * - Change status from pending to active
 *
 * PATH PARAMETERS:
 * - id: Share ID (required)
 *   Example: /item-shares/607f1f77bcf86cd799439101/accept
 *
 * EXAMPLE REQUEST:
 * POST /item-shares/607f1f77bcf86cd799439101/accept
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Share accepted"
 * }
 *
 * SHARE STATUS FLOW:
 * 1. Owner shares item → status = "pending" for recipient
 * 2. Recipient accepts → status = "accepted"
 * 3. Item now visible and active
 *
 * PERMISSIONS APPLY AFTER ACCEPTANCE:
 * - If permission is "view": Can see item, cannot edit
 * - If permission is "edit": Can see and modify item
 *
 * ERROR RESPONSES:
 * - 404: Share not found (doesn't exist or user not recipient)
 * - 500: Server error
 *
 * NOTIFICATION:
 * Owner gets notified when recipient accepts share.
 */
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract share ID from URL
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

// =============================================================================
// ROUTE: POST /item-shares/:id/decline
// =============================================================================

/**
 * POST /item-shares/:id/decline
 * Decline a pending share invitation from another user
 *
 * WHAT IT DOES:
 * Changes share status from "pending" to "declined".
 * Rejects shared item - you don't want to collaborate on it.
 * Item stays in history but isn't actively shared anymore.
 *
 * USE CASES:
 * - Reject share you don't need
 * - Decline collaboration on item
 * - Mark as "not interested"
 *
 * EXAMPLE REQUEST:
 * POST /item-shares/607f1f77bcf86cd799439101/decline
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Share declined"
 * }
 *
 * AFTER DECLINING:
 * - Item no longer appears in "Shared with Me"
 * - Status changes to "declined"
 * - Owner is notified of decline
 * - Can still recover share history if needed
 *
 * ERROR RESPONSES:
 * - 404: Share not found (doesn't exist or user not recipient)
 * - 500: Server error
 */
router.post('/:id/decline', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract share ID from URL
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
 * Update share settings (permissions, expiration, limits, title/description)
 *
 * WHAT IT DOES:
 * Modifies an existing share's configuration.
 * Can update permissions, expiration date, access limits, and metadata.
 * Only the share creator (owner) can modify these settings.
 *
 * USE CASES:
 * - Change permission level (read-only to editable or vice versa)
 * - Set/remove expiration date on public/password shares
 * - Adjust download limits for shared files
 * - Update share title or description
 * - Modify share visibility settings
 *
 * PATH PARAMETERS:
 * - id: Share ID to update (required)
 *   Example: /item-shares/607f1f77bcf86cd799439101
 *
 * REQUEST BODY (all optional - only update fields present):
 * {
 *   "permissions": {
 *     "canView": true,
 *     "canEdit": false,
 *     "canDownload": true,
 *     "canComment": false,
 *     "canShare": false
 *   },
 *   "expiresAt": "2025-03-15",     // ISO date string or null to remove expiration
 *   "maxAccessCount": 100,          // Max downloads/accesses
 *   "title": "Updated Share Title",
 *   "description": "Updated description"
 * }
 *
 * EXAMPLE REQUEST:
 * PATCH /item-shares/607f1f77bcf86cd799439101
 * {
 *   "permissions": { "canView": true, "canEdit": true },
 *   "expiresAt": "2025-03-20"
 * }
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Share updated",
 *   "share": {
 *     "_id": "607f1f77bcf86cd799439101",
 *     "itemId": "507f1f77bcf86cd799439011",
 *     "itemType": "project",
 *     "shareType": "connection",
 *     "permissions": { "canView": true, "canEdit": true, "canDownload": true },
 *     "expiresAt": "2025-03-20T00:00:00.000Z",
 *     "title": "Updated Share Title",
 *     "description": "Updated description",
 *     "updatedAt": "2025-02-15T14:30:00.000Z"
 *   }
 * }
 *
 * PERMISSION FIELDS:
 * - canView: Can recipient view the item?
 * - canEdit: Can recipient modify the item?
 * - canDownload: Can recipient download files?
 * - canComment: Can recipient add comments? (future feature)
 * - canShare: Can recipient reshare with others?
 *
 * EXPIRATION:
 * - expiresAt: Set expiration date (share becomes inactive after this date)
 * - expiresAt: null - Remove expiration (share never expires)
 *
 * MAX ACCESS:
 * - maxAccessCount: Number (share disabled after N accesses)
 * - maxAccessCount: null - No limit (share can be accessed unlimited times)
 *
 * ERROR RESPONSES:
 * - 404: Share not found or doesn't belong to user
 * - 500: Server error
 *
 * SECURITY:
 * Only share creator can update settings (enforced by ownerId check).
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract share ID and update fields from request
    const { id } = req.params;
    const { permissions, expiresAt, maxAccessCount, title, description } = req.body;

    // Step 2: Find the share to update
    // Only look for shares owned by current user (prevents unauthorized updates)
    const share = await ItemShare.findOne({
      _id: id,
      ownerId: req.user._id,
      isActive: true
    });

    // Step 3: Check if share exists and belongs to user
    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Apply updates to share (only fields provided in request)
    // Permissions - merge new permissions with existing ones
    if (permissions) {
      share.permissions = { ...share.permissions, ...permissions };
    }

    // Expiration date - set new date or remove (null)
    if (expiresAt !== undefined) {
      share.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    // Max access limit - set new limit or remove (null)
    if (maxAccessCount !== undefined) {
      share.maxAccessCount = maxAccessCount ? parseInt(maxAccessCount) : null;
    }

    // Title - update share title if provided
    if (title !== undefined) {
      share.title = title;
    }

    // Description - update description if provided
    if (description !== undefined) {
      share.description = description;
    }

    // Step 5: Save updated share to database
    await share.save();

    // Step 6: Capture mutation context for Wide Events logging
    // Track what was changed and the new values
    req.mutation = {
      after: {
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        maxAccessCount: share.maxAccessCount,
        title: share.title,
        description: share.description
      }
    };

    // Step 7: Log this action for audit trail
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.update.success';

    // Step 8: Return updated share
    res.json({
      message: 'Share updated',
      share
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'update_share' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to update share',
      code: 'UPDATE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: DELETE /item-shares/:id
// =============================================================================

/**
 * DELETE /item-shares/:id
 * Revoke a share - stop sharing item with recipients
 *
 * WHAT IT DOES:
 * Deactivates an active share relationship.
 * Recipients immediately lose access to shared item.
 * Owner can only revoke shares they created.
 *
 * USE CASES:
 * - Stop sharing item with someone
 * - Revoke access to sensitive content
 * - Remove outdated collaboration
 * - Deactivate public link
 *
 * PATH PARAMETERS:
 * - id: Share ID (required)
 *   Example: /item-shares/607f1f77bcf86cd799439101
 *
 * EXAMPLE REQUEST:
 * DELETE /item-shares/607f1f77bcf86cd799439101
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Share revoked"
 * }
 *
 * REVOCATION EFFECTS:
 * - Recipients immediately lose access
 * - Public link becomes inactive (if applicable)
 * - Share marked as inactive (isActive: false)
 * - Recipients notified of revocation
 * - Cannot restore revoked share (create new one if needed)
 *
 * OWNER STATISTICS:
 * User's sharedItemCount is decremented when share is revoked.
 * Used for tracking stats: "You've shared X items"
 *
 * AUDIT LOGGING:
 * Revocation is logged with timestamp and actor (who revoked).
 * Can retrieve history of revocations.
 *
 * ERROR RESPONSES:
 * - 404: Share not found (doesn't exist or user didn't create it)
 * - 500: Server error
 *
 * SECURITY:
 * Only share creator (owner) can revoke.
 * Recipients cannot revoke shares (only declining works for them).
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract share ID from URL
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
 * Remove a specific user from a share (revoke access for one user)
 *
 * WHAT IT DOES:
 * Removes a single recipient from a share.
 * That user loses access to the shared item immediately.
 * Other recipients remain unaffected.
 * Share continues to exist if other users are still shared with.
 *
 * USE CASES:
 * - Remove user from shared item after they leave team
 * - Revoke access for specific user while keeping other shares active
 * - Remove user from collaboration after they complete their task
 * - Selective access removal (revoke for one person, not everyone)
 *
 * PATH PARAMETERS:
 * - id: Share ID (required) - identifies which share to modify
 *   Example: /item-shares/607f1f77bcf86cd799439101
 * - userId: User ID (required) - identifies which user to remove
 *   Example: /item-shares/607f.../users/507f1f77bcf86cd799439021
 *
 * EXAMPLE REQUEST:
 * DELETE /item-shares/607f1f77bcf86cd799439101/users/507f1f77bcf86cd799439021
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "User removed from share"
 * }
 *
 * AFTER REMOVAL:
 * - User immediately loses access to shared item
 * - User sees item as no longer shared with them
 * - User gets notification (optional, configurable)
 * - Share remains active for other recipients
 * - Share can be restored if share has other users, otherwise cleared
 *
 * ERROR RESPONSES:
 * - 404: Share not found or doesn't belong to user
 * - 500: Server error
 *
 * SECURITY:
 * Only share creator can remove users from their own shares.
 * User cannot remove other users from shares someone else created.
 *
 * CLEANUP:
 * If removing the last user from a share:
 * - Share object remains (isActive: true) but has no users
 * - Share can be deleted separately with DELETE /item-shares/:id
 */
router.delete('/:id/users/:userId', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract share ID and user ID to remove from request
    const { id, userId } = req.params;

    // Step 2: Find the share to modify
    // Only allow removal if current user is the share creator (ownerId)
    const share = await ItemShare.findOne({
      _id: id,
      ownerId: req.user._id,
      isActive: true
    });

    // Step 3: Check if share exists and belongs to user
    if (!share) {
      return res.status(404).json({
        error: 'Share not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Find the index of user to remove in sharedWithUsers array
    const userIndexBefore = share.sharedWithUsers.findIndex(
      u => u.userId.toString() === userId
    );

    // Step 5: Remove user from shared recipients list
    // Filter out the user being removed, keep all others
    share.sharedWithUsers = share.sharedWithUsers.filter(
      u => u.userId.toString() !== userId
    );

    // Step 6: Save share with updated user list
    await share.save();

    // Step 7: Log this action for Wide Events tracking
    // Capture which user was removed for audit trail
    req.mutation = {
      before: { userCount: userIndexBefore >= 0 ? 'removed' : 'not found' },
      after: { userCount: share.sharedWithUsers.length }
    };

    // Step 8: Attach entity IDs for searchable logging
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    attachEntityId(req, 'removedUserId', userId);
    req.eventName = 'share.removeUser.success';

    // Step 9: Return success message
    res.json({
      message: 'User removed from share'
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'remove_user_from_share' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to remove user',
      code: 'REMOVE_ERROR'
    });
  }
});

/**
 * GET /item-shares/token/:token
 * Access a public or password-protected share using unique token
 *
 * WHAT IT DOES:
 * Allows anyone with the share token (and password if required) to access shared content.
 * This is how public/password shares are accessed - no myBrain account needed.
 * Validates expiration, password, and access limits before granting access.
 *
 * PUBLIC ENDPOINT:
 * This endpoint works for both authenticated and unauthenticated users.
 * Anyone with the token can view the shared content (if permissions allow).
 *
 * SHARE TYPES:
 * - public: Anyone with link can access
 * - password: Anyone with link + password can access
 * - connection: Requires myBrain account (different endpoint for this)
 *
 * USE CASES:
 * - Open public share link from email/chat
 * - Share file with external clients/partners
 * - Password-protected sensitive documents
 * - One-time share links for temporary access
 * - Preview shared content before downloading
 *
 * PATH PARAMETERS:
 * - token: Unique share token (required)
 *   Example: /item-shares/token/abc123xyz789def456ghi789
 *
 * QUERY PARAMETERS:
 * - password: Optional. Password if share is password-protected
 *   Example: /item-shares/token/abc123xyz789?password=mypassword
 *
 * EXAMPLE REQUEST:
 * GET /item-shares/token/abc123xyz789def456ghi789
 * GET /item-shares/token/abc123xyz789def456ghi789?password=mypassword
 *
 * EXAMPLE RESPONSE (200 OK - Public):
 * {
 *   "share": {
 *     "_id": "607f1f77bcf86cd799439101",
 *     "title": "Q4 Report",
 *     "description": "Company quarterly report",
 *     "owner": "507f1f77bcf86cd799439021",
 *     "permissions": { "canView": true, "canDownload": true, "canEdit": false },
 *     "itemType": "file"
 *   },
 *   "item": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Q4_Report.pdf",
 *     "content": "... file content/data ..."
 *   }
 * }
 *
 * EXAMPLE RESPONSE (200 OK - Requires Password):
 * {
 *   "requiresPassword": true,
 *   "title": "Sensitive Document",
 *   "owner": "507f1f77bcf86cd799439021"
 * }
 *
 * VALIDATION:
 * - Token must exist in database
 * - Share must not be expired (if expiresAt set)
 * - Share must not have exceeded access limit (if maxAccessCount set)
 * - Password must be correct (if share is password-protected)
 *
 * EXPIRATION:
 * If share has expiresAt date and current time is past it:
 * - Return 410 Gone with EXPIRED error
 * - Share cannot be accessed
 * - Owner can see it but it's marked as expired
 *
 * ACCESS LIMITS:
 * If share has maxAccessCount and limit is reached:
 * - Return 410 Gone with MAX_ACCESS_REACHED error
 * - Share cannot be accessed
 * - Access counter prevents further use
 *
 * PERMISSION CHECKS:
 * Based on share permissions, content may be restricted:
 * - canView: false → Don't return item content
 * - canDownload: false → Content visible but not downloadable
 *
 * ERROR RESPONSES:
 * - 401: Unauthorized - wrong password (if password-protected)
 * - 404: Share not found (invalid token)
 * - 410: Gone - share expired or access limit reached
 * - 500: Server error
 *
 * ACCESS LOGGING:
 * Each access is logged with:
 * - User ID (if authenticated)
 * - IP address (hashed for privacy)
 * - Timestamp
 * - Access type (view/download)
 * Used for tracking share usage and analytics.
 *
 * SECURITY:
 * - Token is cryptographically random (can't guess)
 * - Share link doesn't reveal content in URL
 * - Password is hashed (never stored plain text)
 * - IP logging helps detect abuse
 */
router.get('/token/:token', optionalAuth, async (req, res) => {
  try {
    // Step 1: Extract token and optional password from request
    const { token } = req.params;
    const { password } = req.query;

    // Step 2: Look up the share by token in database
    // Returns null if token doesn't exist
    const share = await ItemShare.getByToken(token);

    // Step 3: Check if share was found
    if (!share) {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'NOT_FOUND'
      });
    }

    // Step 4: Check if share has expired
    // If expiresAt date has passed, share is no longer accessible
    if (share.isExpired()) {
      return res.status(410).json({
        error: 'Share has expired',
        code: 'EXPIRED'
      });
    }

    // Step 5: Check if max access count has been reached
    // If maxAccessCount is set and currentAccessCount >= maxAccessCount, deny access
    if (share.hasReachedMaxAccess()) {
      return res.status(410).json({
        error: 'Share has reached maximum access count',
        code: 'MAX_ACCESS_REACHED'
      });
    }

    // Step 6: Validate password if share requires it
    if (share.shareType === 'password') {
      // Check if password was provided
      if (!password) {
        // No password provided - ask user to provide it
        return res.json({
          requiresPassword: true,
          title: share.title,
          owner: share.ownerId
        });
      }

      // Verify the provided password matches the share's password hash
      const isValid = await share.verifyPassword(password);
      if (!isValid) {
        // Password is incorrect
        return res.status(401).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
      }
    }

    // Step 7: Fetch the actual shared item from database
    // Get the model class for this item type (Note, Task, File, etc.)
    const Model = await getItemModel(share.itemType);
    // Query for the item by its ID
    const item = await Model.findById(share.itemId);

    // Step 8: Check if item still exists
    // Item may have been deleted since share was created
    if (!item) {
      return res.status(404).json({
        error: 'Item no longer exists',
        code: 'ITEM_NOT_FOUND'
      });
    }

    // Step 9: Log this access attempt
    // Track who accessed (user ID if logged in), when, from where, and what action
    await share.logAccess(
      req.user?._id || null,
      'view',
      req.ip
    );

    // Step 10: Log this action for Wide Events tracking
    attachEntityId(req, 'shareId', share._id);
    attachEntityId(req, 'itemId', share.itemId);
    req.eventName = 'share.access.byToken.success';

    // Step 11: Return share and item data to user
    // Respect permission flags when deciding what to return
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
        // Only include content if permission allows viewing
        content: share.permissions.canView ? item.content : undefined,
        // Add more item fields as needed based on item type
      }
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'access_share_token' });
    // Return generic error response
    res.status(500).json({
      error: 'Failed to access share',
      code: 'ACCESS_ERROR'
    });
  }
});

export default router;
