import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Link from '../models/Link.js';
import Tag from '../models/Tag.js';

/**
 * Notes Service
 * Business logic for note operations
 */

/**
 * Create a new note
 */
export async function createNote(userId, data) {
  const tags = data.tags || [];

  const note = new Note({
    userId,
    title: data.title || '',
    body: data.body || '',
    tags,
    pinned: data.pinned || false,
  });

  await note.save();

  // Track tag usage
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  return note;
}

/**
 * Get notes for a user with search/filter options
 */
export async function getNotes(userId, options = {}) {
  return Note.searchNotes(userId, options);
}

/**
 * Get a single note by ID
 */
export async function getNoteById(userId, noteId) {
  const note = await Note.findOne({ _id: noteId, userId });
  return note;
}

/**
 * Update a note
 */
export async function updateNote(userId, noteId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.userId;
  delete updates.createdAt;

  // If tags are being updated, track changes
  let oldTags = [];
  if (updates.tags) {
    const existingNote = await Note.findOne({ _id: noteId, userId });
    if (existingNote) {
      oldTags = existingNote.tags || [];
    }
  }

  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  // Track new tags and decrement removed tags
  if (updates.tags && note) {
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

  return note;
}

/**
 * Delete a note permanently
 */
export async function deleteNote(userId, noteId) {
  const result = await Note.findOneAndDelete({ _id: noteId, userId });
  return result;
}

/**
 * Pin/unpin a note
 */
export async function pinNote(userId, noteId, pinned = true) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { pinned } },
    { new: true }
  );
  return note;
}

/**
 * Archive a note
 */
export async function archiveNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'active' },
    { $set: { status: 'archived' } },
    { new: true }
  );
  return note;
}

/**
 * Unarchive a note (restore from archive to active)
 */
export async function unarchiveNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'archived' },
    { $set: { status: 'active' } },
    { new: true }
  );
  return note;
}

/**
 * Move a note to trash
 */
export async function trashNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: { $ne: 'trashed' } },
    {
      $set: {
        status: 'trashed',
        trashedAt: new Date()
      }
    },
    { new: true }
  );
  return note;
}

/**
 * Restore a note from trash
 */
export async function restoreNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'trashed' },
    {
      $set: {
        status: 'active',
        trashedAt: null
      }
    },
    { new: true }
  );
  return note;
}

/**
 * Update lastOpenedAt timestamp
 */
export async function markNoteAsOpened(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { lastOpenedAt: new Date() } },
    { new: true }
  );
  return note;
}

/**
 * Get all unique tags for a user
 */
export async function getUserTags(userId) {
  const result = await Note.aggregate([
    { $match: { userId: userId, status: 'active' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { tag: '$_id', count: 1, _id: 0 } }
  ]);
  return result;
}

/**
 * Get recent notes (for dashboard)
 */
export async function getRecentNotes(userId, limit = 5) {
  const notes = await Note.find({ userId, status: 'active' })
    .sort({ updatedAt: -1 })
    .limit(limit);
  return notes;
}

/**
 * Get pinned notes
 */
export async function getPinnedNotes(userId) {
  const notes = await Note.find({ userId, status: 'active', pinned: true })
    .sort({ updatedAt: -1 });
  return notes;
}

/**
 * Get last opened note (for "Continue" feature)
 */
export async function getLastOpenedNote(userId) {
  const note = await Note.findOne({ userId, status: 'active', lastOpenedAt: { $ne: null } })
    .sort({ lastOpenedAt: -1 });
  return note;
}

/**
 * Get inbox notes (unprocessed)
 */
export async function getInboxNotes(userId, options = {}) {
  const {
    sort = '-createdAt',
    limit = 50,
    skip = 0
  } = options;

  const query = {
    userId,
    processed: false,
    status: 'active'
  };

  // Build sort
  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const notes = await Note.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await Note.countDocuments(query);

  return { notes, total };
}

/**
 * Get inbox count (unprocessed notes)
 */
export async function getInboxCount(userId) {
  return Note.countDocuments({
    userId,
    processed: false,
    status: 'active'
  });
}

/**
 * Mark a note as processed (remove from inbox)
 */
export async function processNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { processed: true } },
    { new: true }
  );
  return note;
}

/**
 * Mark a note as unprocessed (move back to inbox)
 */
export async function unprocessNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { processed: false } },
    { new: true }
  );
  return note;
}

/**
 * Convert a note to a task
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} noteId - Note ID to convert
 * @param {boolean} keepNote - Whether to keep the original note (default: true)
 * @returns {Object} - { task, note } - Created task and updated/deleted note
 */
export async function convertToTask(userId, noteId, keepNote = true) {
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  // Create task from note
  const task = new Task({
    userId,
    title: note.title || 'Untitled Task',
    body: note.body,
    tags: note.tags,
    sourceNoteId: keepNote ? noteId : null,
    linkedNoteIds: keepNote ? [noteId] : []
  });

  await task.save();

  if (keepNote) {
    // Mark note as processed and create a link
    note.processed = true;
    await note.save();

    // Create bidirectional link
    await Link.create({
      userId,
      sourceType: 'task',
      sourceId: task._id,
      targetType: 'note',
      targetId: noteId,
      linkType: 'converted_from'
    });

    return { task, note };
  } else {
    // Delete the original note
    await Note.deleteOne({ _id: noteId, userId });
    return { task, note: null };
  }
}

/**
 * Get backlinks for a note
 */
export async function getNoteBacklinks(userId, noteId) {
  const backlinks = await Link.find({
    userId,
    targetType: 'note',
    targetId: noteId
  });

  // Populate source entities
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      const linkObj = link.toSafeJSON();

      if (link.sourceType === 'note') {
        const linkedNote = await Note.findById(link.sourceId);
        if (linkedNote) {
          linkObj.source = linkedNote.toSafeJSON();
        }
      } else if (link.sourceType === 'task') {
        const task = await Task.findById(link.sourceId);
        if (task) {
          linkObj.source = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  return populated.filter(l => l.source);
}

export default {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  pinNote,
  archiveNote,
  unarchiveNote,
  trashNote,
  restoreNote,
  markNoteAsOpened,
  getUserTags,
  getRecentNotes,
  getPinnedNotes,
  getLastOpenedNote,
  getInboxNotes,
  getInboxCount,
  processNote,
  unprocessNote,
  convertToTask,
  getNoteBacklinks
};
