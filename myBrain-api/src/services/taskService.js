/**
 * =============================================================================
 * TASKSERVICE.JS - Task Management Business Logic
 * =============================================================================
 *
 * This file handles all task-related operations in myBrain. Tasks are actionable
 * items with clear completion criteria - things you need to DO.
 *
 * WHAT IS A TASK?
 * ---------------
 * A task is a single action item that can be completed. Unlike notes (which are
 * information), tasks are things you need to act on. Examples:
 * - "Call dentist to schedule appointment"
 * - "Review quarterly report"
 * - "Buy groceries for dinner party"
 *
 * TASK VS NOTE:
 * -------------
 * NOTE (information):           TASK (action):
 * - "Meeting notes from Monday" - "Follow up with John"
 * - "Recipe for pasta"          - "Make pasta for dinner"
 * - "Ideas for vacation"        - "Book flights"
 *
 * TASK LIFECYCLE:
 * ---------------
 * 1. todo → New task, not started
 * 2. in_progress → Currently working on it
 * 3. done → Task completed
 * 4. cancelled → No longer needed (not done)
 * 5. archived → Completed and archived for reference
 * 6. trashed → In trash, awaiting permanent deletion
 *
 * KEY FEATURES:
 * -------------
 * 1. DUE DATES: Schedule when tasks should be done
 * 2. PRIORITIES: low, medium, high, urgent
 * 3. LINKING: Connect tasks to notes and projects
 * 4. TODAY VIEW: See overdue tasks and tasks due today
 * 5. COMMENTS: Add notes and updates to tasks
 * 6. BACKLINKS: See what references this task
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Task model - represents a task in the database.
 * Contains title, status, due date, priority, and more.
 */
import Task from '../models/Task.js';

/**
 * Note model - used for linking notes to tasks and verifying note ownership.
 * Also used for inbox count in the Today view.
 */
import Note from '../models/Note.js';

/**
 * Link model - manages bidirectional links between entities.
 * Used for task backlinks and reference connections.
 */
import Link from '../models/Link.js';

/**
 * Tag model - tracks tag usage for suggestions and cleanup.
 */
import Tag from '../models/Tag.js';

// =============================================================================
// TASK CRUD OPERATIONS
// =============================================================================

/**
 * createTask(userId, data)
 * ------------------------
 * Creates a new task for a user.
 *
 * @param {ObjectId} userId - ID of the user creating the task
 * @param {Object} data - Task data
 * @param {string} data.title - Task title (required)
 * @param {string} [data.body] - Additional details/description
 * @param {string} [data.location] - Where the task needs to be done
 * @param {string} [data.status] - Status: 'todo', 'in_progress', 'done', etc.
 * @param {string} [data.priority] - Priority: 'low', 'medium', 'high', 'urgent'
 * @param {Date} [data.dueDate] - When the task should be completed
 * @param {string[]} [data.tags] - Array of tag names
 * @param {ObjectId[]} [data.linkedNoteIds] - Notes to link
 * @param {ObjectId} [data.sourceNoteId] - Note this task was created from
 * @param {ObjectId} [data.lifeAreaId] - Life area/category
 * @param {ObjectId} [data.projectId] - Project this task belongs to
 *
 * @returns {Promise<Task>} The created task document
 *
 * EXAMPLE:
 * const task = await createTask(userId, {
 *   title: 'Review quarterly report',
 *   dueDate: new Date('2024-03-15'),
 *   priority: 'high',
 *   projectId: someProjectId,
 *   tags: ['work', 'important']
 * });
 *
 * WHAT HAPPENS:
 * 1. Creates new Task document
 * 2. If linked to a project, adds task to project's linkedTaskIds
 * 3. Tracks tag usage for suggestions
 * 4. Returns the created task
 */
export async function createTask(userId, data) {
  // Extract tags (default to empty array)
  const tags = data.tags || [];

  // Create the task with provided data and defaults
  const task = new Task({
    userId,
    title: data.title,
    body: data.body || '',                    // Optional description/details
    location: data.location || '',            // Where to do the task
    status: data.status || 'todo',            // New tasks start as todo
    priority: data.priority || 'medium',      // Default priority
    dueDate: data.dueDate || null,            // Optional deadline
    tags,                                     // For organization
    linkedNoteIds: data.linkedNoteIds || [],  // Related notes
    sourceNoteId: data.sourceNoteId || null,  // If converted from a note
    lifeAreaId: data.lifeAreaId || null,      // Category
    projectId: data.projectId || null         // Parent project
  });

  // Save the task to the database
  await task.save();

  // Track tag usage for autocomplete suggestions
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  // =====================================================
  // LINK TO PROJECT IF SPECIFIED
  // =====================================================
  // If this task belongs to a project, update the project's linkedTaskIds
  // This maintains bidirectional linking between tasks and projects
  if (data.projectId) {
    // Dynamic import to avoid circular dependency issues
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(data.projectId);
    if (project) {
      await project.linkTask(task._id);
    }
  }

  return task;
}

/**
 * getTasks(userId, options)
 * -------------------------
 * Retrieves tasks for a user with search and filter options.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {Object} [options] - Search/filter options
 * @param {string} [options.search] - Search term for title/body
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.priority] - Filter by priority
 * @param {ObjectId} [options.projectId] - Filter by project
 * @param {ObjectId} [options.lifeAreaId] - Filter by life area
 * @param {string[]} [options.tags] - Filter by tags
 * @param {Date} [options.dueBefore] - Tasks due before this date
 * @param {Date} [options.dueAfter] - Tasks due after this date
 * @param {number} [options.page] - Page number
 * @param {number} [options.limit] - Items per page
 *
 * @returns {Promise<Task[]>} Array of matching tasks
 *
 * EXAMPLE:
 * // Get all high-priority tasks due this week
 * const tasks = await getTasks(userId, {
 *   priority: 'high',
 *   dueBefore: endOfWeek,
 *   status: 'todo'
 * });
 */
export async function getTasks(userId, options = {}) {
  // Delegate to the static search method on the Task model
  return Task.searchTasks(userId, options);
}

/**
 * getTaskById(userId, taskId)
 * ---------------------------
 * Retrieves a single task by ID.
 *
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 * @param {ObjectId} taskId - ID of the task to retrieve
 *
 * @returns {Promise<Task|null>} Task document or null if not found
 */
export async function getTaskById(userId, taskId) {
  const task = await Task.findOne({ _id: taskId, userId });
  return task;
}

/**
 * updateTask(userId, taskId, updates)
 * -----------------------------------
 * Updates a task with new data.
 *
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 * @param {ObjectId} taskId - ID of the task to update
 * @param {Object} updates - Fields to update
 *
 * @returns {Promise<Task|null>} Updated task or null if not found
 *
 * SPECIAL BEHAVIORS:
 * 1. Marking as 'done' or 'cancelled' sets completedAt timestamp
 * 2. Changing back from done/cancelled clears completedAt
 * 3. Protected fields (_id, userId, createdAt) cannot be updated
 * 4. Tag changes are tracked for usage statistics
 * 5. Project changes update both old and new project's linkedTaskIds
 *
 * EXAMPLE:
 * const updated = await updateTask(userId, taskId, {
 *   status: 'done',
 *   completedAt: new Date()
 * });
 */
export async function updateTask(userId, taskId, updates) {
  // =====================================================
  // PROTECT IMMUTABLE FIELDS
  // =====================================================
  delete updates._id;         // Document ID is immutable
  delete updates.userId;      // Owner cannot change
  delete updates.createdAt;   // Creation time is fixed

  // =====================================================
  // HANDLE STATUS TRANSITIONS
  // =====================================================
  // When marking as done or cancelled, record completion time
  if (updates.status === 'done' || updates.status === 'cancelled') {
    updates.completedAt = new Date();
  } else if (updates.status && updates.status !== 'done' && updates.status !== 'cancelled') {
    // If changing to any non-completed status, clear completion time
    updates.completedAt = null;
  }

  // =====================================================
  // GET EXISTING TASK FOR COMPARISONS
  // =====================================================
  const existingTask = await Task.findOne({ _id: taskId, userId });
  if (!existingTask) return null;

  // Track old values for tag and project change handling
  let oldTags = existingTask.tags || [];
  const oldProjectId = existingTask.projectId?.toString() || null;
  const newProjectId = updates.projectId !== undefined
    ? (updates.projectId?.toString() || null)
    : oldProjectId;

  // =====================================================
  // PERFORM THE UPDATE
  // =====================================================
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!task) return null;

  // =====================================================
  // UPDATE TAG USAGE STATISTICS
  // =====================================================
  if (updates.tags) {
    const newTags = updates.tags || [];

    // Find added and removed tags
    const addedTags = newTags.filter(t => !oldTags.includes(t));
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    // Update tag usage counts
    if (addedTags.length > 0) {
      await Tag.trackUsage(userId, addedTags);
    }
    if (removedTags.length > 0) {
      await Tag.decrementUsage(userId, removedTags);
    }
  }

  // =====================================================
  // HANDLE PROJECT CHANGE
  // =====================================================
  // If the task's project changed, update both projects' linkedTaskIds
  if (updates.projectId !== undefined && oldProjectId !== newProjectId) {
    // Dynamic import to avoid circular dependency
    const Project = (await import('../models/Project.js')).default;

    // Remove from old project's linkedTaskIds
    if (oldProjectId) {
      const oldProject = await Project.findById(oldProjectId);
      if (oldProject) {
        await oldProject.unlinkTask(taskId);
      }
    }

    // Add to new project's linkedTaskIds
    if (newProjectId) {
      const newProject = await Project.findById(newProjectId);
      if (newProject) {
        await newProject.linkTask(taskId);
      }
    }
  }

  return task;
}

/**
 * updateTaskStatus(userId, taskId, status)
 * ----------------------------------------
 * Quick method to change just the task status.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task
 * @param {string} status - New status: 'todo', 'in_progress', 'done', 'cancelled'
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHY A SEPARATE METHOD?
 * Changing status is very common (checking off tasks) and benefits
 * from a simpler, faster code path.
 *
 * EXAMPLE:
 * // Mark task as done
 * await updateTaskStatus(userId, taskId, 'done');
 *
 * // Reopen a completed task
 * await updateTaskStatus(userId, taskId, 'todo');
 */
export async function updateTaskStatus(userId, taskId, status) {
  const updates = { status };

  // Set or clear completedAt based on status
  if (status === 'done' || status === 'cancelled') {
    updates.completedAt = new Date();
  } else {
    updates.completedAt = null;
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: updates },
    { new: true }
  );

  return task;
}

/**
 * deleteTask(userId, taskId)
 * --------------------------
 * Permanently deletes a task and all its links.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task to delete
 *
 * @returns {Promise<Task|null>} Deleted task or null if not found
 *
 * IMPORTANT: This is permanent deletion, not soft delete.
 * For recoverable deletion, use trashTask() instead.
 *
 * WHAT GETS DELETED:
 * - The task document
 * - All Link documents connecting to this task
 *
 * WHAT STAYS:
 * - Linked notes (just lose their link)
 * - Parent project (task is removed from linkedTaskIds)
 */
export async function deleteTask(userId, taskId) {
  // First, delete all bidirectional links involving this task
  // Links where this task is the source OR the target
  await Link.deleteMany({
    userId,
    $or: [
      { sourceType: 'task', sourceId: taskId },
      { targetType: 'task', targetId: taskId }
    ]
  });

  // Delete the task itself
  const result = await Task.findOneAndDelete({ _id: taskId, userId });
  return result;
}

// =============================================================================
// TODAY VIEW
// =============================================================================

/**
 * getTodayView(userId)
 * --------------------
 * Gets data for the Today view: overdue tasks, tasks due today, and inbox count.
 *
 * @param {ObjectId} userId - ID of the user
 *
 * @returns {Promise<Object>} Today view data
 * @returns {Task[]} return.overdue - Tasks past their due date
 * @returns {Task[]} return.dueToday - Tasks due today
 * @returns {number} return.inboxCount - Unprocessed notes in inbox
 *
 * WHAT IS THE TODAY VIEW?
 * A focused view showing what needs attention right now:
 * 1. OVERDUE: Tasks that should have been done by now
 * 2. DUE TODAY: Tasks that need to be done today
 * 3. INBOX COUNT: New notes that need to be processed/organized
 *
 * EXAMPLE RESPONSE:
 * {
 *   overdue: [{ title: 'Call dentist', dueDate: yesterday, ... }],
 *   dueToday: [{ title: 'Submit report', dueDate: today, ... }],
 *   inboxCount: 3
 * }
 */
export async function getTodayView(userId) {
  // Get overdue and due-today tasks from the Task model
  const { overdue, dueToday } = await Task.getTodayTasks(userId);

  // Get inbox count (unprocessed notes)
  // These are notes that haven't been reviewed and organized yet
  const inboxCount = await Note.countDocuments({
    userId,
    processed: false,   // Not yet processed
    status: 'active'    // Not archived or trashed
  });

  return {
    overdue: overdue.map(t => t.toSafeJSON()),
    dueToday: dueToday.map(t => t.toSafeJSON()),
    inboxCount
  };
}

// =============================================================================
// NOTE LINKING
// =============================================================================

/**
 * linkNote(userId, taskId, noteId)
 * --------------------------------
 * Links a note to a task for reference.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task
 * @param {ObjectId} noteId - ID of the note to link
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHY LINK NOTES TO TASKS?
 * - Reference material for completing the task
 * - Background information
 * - Related meeting notes
 * - Research for the task
 *
 * EXAMPLE:
 * // Link meeting notes to a follow-up task
 * await linkNote(userId, taskId, meetingNotesId);
 */
export async function linkNote(userId, taskId, noteId) {
  // Verify task exists and belongs to user
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  // Verify note exists and belongs to user
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  // Add to linkedNoteIds if not already linked (avoid duplicates)
  if (!task.linkedNoteIds.includes(noteId)) {
    task.linkedNoteIds.push(noteId);
    await task.save();
  }

  // Create a bidirectional link record for backlink support
  // This allows finding all tasks that reference a note
  await Link.findOneAndUpdate(
    { sourceId: taskId, targetId: noteId },
    {
      userId,
      sourceType: 'task',
      sourceId: taskId,
      targetType: 'note',
      targetId: noteId,
      linkType: 'reference'
    },
    { upsert: true, new: true }  // Create if doesn't exist
  );

  return task;
}

/**
 * unlinkNote(userId, taskId, noteId)
 * ----------------------------------
 * Removes the link between a note and a task.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task
 * @param {ObjectId} noteId - ID of the note to unlink
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * NOTE: The note is NOT deleted, just unlinked.
 */
export async function unlinkNote(userId, taskId, noteId) {
  // Remove from linkedNoteIds array using $pull operator
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $pull: { linkedNoteIds: noteId } },
    { new: true }
  );

  // Remove the bidirectional link record
  await Link.deleteOne({
    userId,
    sourceType: 'task',
    sourceId: taskId,
    targetType: 'note',
    targetId: noteId
  });

  return task;
}

// =============================================================================
// BACKLINKS
// =============================================================================

/**
 * getTaskBacklinks(userId, taskId)
 * --------------------------------
 * Gets all items that reference this task (backlinks).
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task
 *
 * @returns {Promise<Object[]>} Array of backlink objects with populated sources
 *
 * WHAT ARE BACKLINKS?
 * Backlinks are references TO this task FROM other items.
 * If Note A links to Task B, then Note A is a backlink for Task B.
 *
 * EXAMPLE RESPONSE:
 * [
 *   {
 *     _id: 'link123',
 *     sourceType: 'note',
 *     source: { _id: 'note456', title: 'Meeting Notes', ... }
 *   },
 *   {
 *     _id: 'link789',
 *     sourceType: 'task',
 *     source: { _id: 'task012', title: 'Related task', ... }
 *   }
 * ]
 *
 * WHY BACKLINKS MATTER:
 * - Discover related content
 * - Understand context
 * - Navigate knowledge graph
 */
export async function getTaskBacklinks(userId, taskId) {
  // Get all links where this task is the target
  const backlinks = await Link.getBacklinks(userId, 'task', taskId);

  // Populate the source entities based on their type
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      const linkObj = link.toSafeJSON();

      // Populate based on source type
      if (link.sourceType === 'note') {
        const note = await Note.findById(link.sourceId);
        linkObj.source = note ? note.toSafeJSON() : null;
      } else if (link.sourceType === 'task') {
        const task = await Task.findById(link.sourceId);
        linkObj.source = task ? task.toSafeJSON() : null;
      }

      return linkObj;
    })
  );

  // Filter out any links where the source no longer exists
  return populated.filter(l => l.source !== null);
}

// =============================================================================
// TAG QUERIES
// =============================================================================

/**
 * getUserTaskTags(userId)
 * -----------------------
 * Gets all unique tags used across a user's tasks with counts.
 *
 * @param {ObjectId} userId - ID of the user
 *
 * @returns {Promise<Object[]>} Array of { tag, count } objects sorted by count
 *
 * EXAMPLE RESPONSE:
 * [
 *   { tag: 'work', count: 25 },
 *   { tag: 'urgent', count: 12 },
 *   { tag: 'personal', count: 8 }
 * ]
 *
 * USE CASES:
 * - Tag autocomplete suggestions
 * - Tag cloud visualization
 * - Filter dropdown options
 */
export async function getUserTaskTags(userId) {
  // Use MongoDB aggregation to get unique tags with counts
  const result = await Task.aggregate([
    { $match: { userId: userId } },           // Filter by user
    { $unwind: '$tags' },                     // Flatten tags array
    { $group: { _id: '$tags', count: { $sum: 1 } } }, // Count each tag
    { $sort: { count: -1 } },                 // Sort by count descending
    { $project: { tag: '$_id', count: 1, _id: 0 } }  // Rename fields
  ]);
  return result;
}

// =============================================================================
// TASK LIFECYCLE OPERATIONS
// =============================================================================

/**
 * archiveTask(userId, taskId)
 * ---------------------------
 * Archives a completed task for long-term storage.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task to archive
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHAT IS ARCHIVING?
 * Archiving moves completed tasks out of the main list but keeps them
 * for reference. Archived tasks:
 * - Don't appear in regular task lists
 * - Can be searched
 * - Can be unarchived
 *
 * RESTRICTIONS:
 * - Cannot archive tasks that are already archived
 * - Cannot archive tasks that are in trash
 */
export async function archiveTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      userId,
      status: { $nin: ['archived', 'trashed'] }  // Not already archived/trashed
    },
    {
      $set: {
        status: 'archived',
        archivedAt: new Date()
      }
    },
    { new: true }
  );
  return task;
}

/**
 * unarchiveTask(userId, taskId)
 * -----------------------------
 * Restores an archived task to active status.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task to unarchive
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHAT HAPPENS:
 * - Status changes from 'archived' to 'todo'
 * - archivedAt is cleared
 * - Task appears in regular task lists again
 */
export async function unarchiveTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: 'archived' },
    {
      $set: {
        status: 'todo',       // Return to todo status
        archivedAt: null      // Clear archive timestamp
      }
    },
    { new: true }
  );
  return task;
}

/**
 * trashTask(userId, taskId)
 * -------------------------
 * Moves a task to trash (soft delete).
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task to trash
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHAT IS SOFT DELETE?
 * Instead of permanently deleting, we move to trash where:
 * - User can recover if deleted by mistake
 * - Trash can be emptied periodically
 * - Provides a safety net against accidental deletion
 *
 * RESTRICTIONS:
 * - Cannot trash a task that's already in trash
 */
export async function trashTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      userId,
      status: { $ne: 'trashed' }  // Not already in trash
    },
    {
      $set: {
        status: 'trashed',
        trashedAt: new Date()
      }
    },
    { new: true }
  );
  return task;
}

/**
 * restoreTask(userId, taskId)
 * ---------------------------
 * Restores a task from trash.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} taskId - ID of the task to restore
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * WHAT HAPPENS:
 * - Status changes from 'trashed' to 'todo'
 * - trashedAt is cleared
 * - Task appears in regular task lists again
 */
export async function restoreTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: 'trashed' },
    {
      $set: {
        status: 'todo',
        trashedAt: null
      }
    },
    { new: true }
  );
  return task;
}

// =============================================================================
// TASK COMMENTS
// =============================================================================

/**
 * addComment(userId, taskId, text)
 * --------------------------------
 * Adds a comment to a task.
 *
 * @param {ObjectId} userId - ID of the user adding the comment
 * @param {ObjectId} taskId - ID of the task
 * @param {string} text - Comment text
 *
 * @returns {Promise<Task|null>} Updated task or null
 *
 * USE CASES:
 * - Progress updates
 * - Questions about the task
 * - Blockers or issues
 * - Notes for future reference
 *
 * EXAMPLE:
 * await addComment(userId, taskId, 'Waiting for client feedback before proceeding');
 */
export async function addComment(userId, taskId, text) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  // Add comment with userId and text
  // Timestamp is automatically set
  task.comments.push({
    userId,
    text
  });

  await task.save();
  return task;
}

/**
 * updateComment(userId, taskId, commentId, text)
 * ----------------------------------------------
 * Updates an existing comment. Only the comment owner can update.
 *
 * @param {ObjectId} userId - ID of the user attempting to update
 * @param {ObjectId} taskId - ID of the task
 * @param {ObjectId} commentId - ID of the comment to update
 * @param {string} text - New comment text
 *
 * @returns {Promise<Task|{error: string}|null>} Updated task, error object, or null
 *
 * POSSIBLE ERRORS:
 * - { error: 'COMMENT_NOT_FOUND' } - Comment doesn't exist
 * - { error: 'NOT_AUTHORIZED' } - User doesn't own the comment
 * - null - Task not found
 */
export async function updateComment(userId, taskId, commentId, text) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  // Find the specific comment
  const comment = task.comments.id(commentId);
  if (!comment) return { error: 'COMMENT_NOT_FOUND' };

  // Verify the user owns this comment
  if (comment.userId.toString() !== userId.toString()) {
    return { error: 'NOT_AUTHORIZED' };
  }

  // Update the comment text
  comment.text = text;
  await task.save();
  return task;
}

/**
 * deleteComment(userId, taskId, commentId)
 * ----------------------------------------
 * Deletes a comment from a task. Only the comment owner can delete.
 *
 * @param {ObjectId} userId - ID of the user attempting to delete
 * @param {ObjectId} taskId - ID of the task
 * @param {ObjectId} commentId - ID of the comment to delete
 *
 * @returns {Promise<Task|{error: string}|null>} Updated task, error object, or null
 *
 * POSSIBLE ERRORS:
 * - { error: 'COMMENT_NOT_FOUND' } - Comment doesn't exist
 * - { error: 'NOT_AUTHORIZED' } - User doesn't own the comment
 * - null - Task not found
 */
export async function deleteComment(userId, taskId, commentId) {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  // Find the specific comment
  const comment = task.comments.id(commentId);
  if (!comment) return { error: 'COMMENT_NOT_FOUND' };

  // Verify ownership
  if (comment.userId.toString() !== userId.toString()) {
    return { error: 'NOT_AUTHORIZED' };
  }

  // Remove the comment
  task.comments.pull(commentId);
  await task.save();
  return task;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all task service functions as a default object.
 *
 * USAGE:
 * import taskService from './services/taskService.js';
 *
 * // Create a task
 * const task = await taskService.createTask(userId, { title: 'Do something' });
 *
 * // Get today's tasks
 * const today = await taskService.getTodayView(userId);
 *
 * // Update task status
 * await taskService.updateTaskStatus(userId, taskId, 'done');
 *
 * // Link a note to a task
 * await taskService.linkNote(userId, taskId, noteId);
 *
 * // Add a comment
 * await taskService.addComment(userId, taskId, 'Making progress!');
 */
export default {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTodayView,
  linkNote,
  unlinkNote,
  getTaskBacklinks,
  getUserTaskTags,
  archiveTask,
  unarchiveTask,
  trashTask,
  restoreTask,
  addComment,
  updateComment,
  deleteComment
};
