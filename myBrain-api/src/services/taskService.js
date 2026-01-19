import Task from '../models/Task.js';
import Note from '../models/Note.js';
import Link from '../models/Link.js';
import Tag from '../models/Tag.js';

/**
 * Tasks Service
 * Business logic for task operations
 */

/**
 * Create a new task
 */
export async function createTask(userId, data) {
  const tags = data.tags || [];

  const task = new Task({
    userId,
    title: data.title,
    body: data.body || '',
    location: data.location || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    dueDate: data.dueDate || null,
    tags,
    linkedNoteIds: data.linkedNoteIds || [],
    sourceNoteId: data.sourceNoteId || null,
    lifeAreaId: data.lifeAreaId || null,
    projectId: data.projectId || null
  });

  await task.save();

  // Track tag usage
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  // If linked to a project, update the project's linkedTaskIds
  if (data.projectId) {
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(data.projectId);
    if (project) {
      await project.linkTask(task._id);
    }
  }

  return task;
}

/**
 * Get tasks for a user with search/filter options
 */
export async function getTasks(userId, options = {}) {
  return Task.searchTasks(userId, options);
}

/**
 * Get a single task by ID
 */
export async function getTaskById(userId, taskId) {
  const task = await Task.findOne({ _id: taskId, userId });
  return task;
}

/**
 * Update a task
 */
export async function updateTask(userId, taskId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.userId;
  delete updates.createdAt;

  // If status is being changed to done/cancelled, set completedAt
  if (updates.status === 'done' || updates.status === 'cancelled') {
    updates.completedAt = new Date();
  } else if (updates.status && updates.status !== 'done' && updates.status !== 'cancelled') {
    updates.completedAt = null;
  }

  // If tags are being updated, track changes
  let oldTags = [];
  if (updates.tags) {
    const existingTask = await Task.findOne({ _id: taskId, userId });
    if (existingTask) {
      oldTags = existingTask.tags || [];
    }
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  // Track new tags and decrement removed tags
  if (updates.tags && task) {
    const newTags = updates.tags || [];
    const addedTags = newTags.filter(t => !oldTags.includes(t));
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    if (addedTags.length > 0) {
      await Tag.trackUsage(userId, addedTags);
    }
    if (removedTags.length > 0) {
      await Tag.decrementUsage(userId, removedTags);
    }
  }

  return task;
}

/**
 * Update task status (quick status change)
 */
export async function updateTaskStatus(userId, taskId, status) {
  const updates = { status };

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
 * Delete a task permanently
 */
export async function deleteTask(userId, taskId) {
  // Also delete any links associated with this task
  await Link.deleteMany({
    userId,
    $or: [
      { sourceType: 'task', sourceId: taskId },
      { targetType: 'task', targetId: taskId }
    ]
  });

  const result = await Task.findOneAndDelete({ _id: taskId, userId });
  return result;
}

/**
 * Get today view data (overdue + due today + inbox count)
 */
export async function getTodayView(userId) {
  const { overdue, dueToday } = await Task.getTodayTasks(userId);

  // Get inbox count (unprocessed notes)
  const inboxCount = await Note.countDocuments({
    userId,
    processed: false,
    status: 'active'
  });

  return {
    overdue: overdue.map(t => t.toSafeJSON()),
    dueToday: dueToday.map(t => t.toSafeJSON()),
    inboxCount
  };
}

/**
 * Link a note to a task
 */
export async function linkNote(userId, taskId, noteId) {
  // Verify task exists and belongs to user
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  // Verify note exists and belongs to user
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  // Add to linkedNoteIds if not already linked
  if (!task.linkedNoteIds.includes(noteId)) {
    task.linkedNoteIds.push(noteId);
    await task.save();
  }

  // Create bidirectional link
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
    { upsert: true, new: true }
  );

  return task;
}

/**
 * Unlink a note from a task
 */
export async function unlinkNote(userId, taskId, noteId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $pull: { linkedNoteIds: noteId } },
    { new: true }
  );

  // Remove bidirectional link
  await Link.deleteOne({
    userId,
    sourceType: 'task',
    sourceId: taskId,
    targetType: 'note',
    targetId: noteId
  });

  return task;
}

/**
 * Get backlinks for a task
 */
export async function getTaskBacklinks(userId, taskId) {
  const backlinks = await Link.getBacklinks(userId, 'task', taskId);

  // Populate the source entities
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      const linkObj = link.toSafeJSON();
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

  return populated.filter(l => l.source !== null);
}

/**
 * Get all unique tags for a user's tasks
 */
export async function getUserTaskTags(userId) {
  const result = await Task.aggregate([
    { $match: { userId: userId } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { tag: '$_id', count: 1, _id: 0 } }
  ]);
  return result;
}

/**
 * Archive a task
 */
export async function archiveTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: { $nin: ['archived', 'trashed'] } },
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
 * Unarchive a task
 */
export async function unarchiveTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: 'archived' },
    {
      $set: {
        status: 'todo',
        archivedAt: null
      }
    },
    { new: true }
  );
  return task;
}

/**
 * Move a task to trash
 */
export async function trashTask(userId, taskId) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: { $ne: 'trashed' } },
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
 * Restore a task from trash
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
  restoreTask
};
