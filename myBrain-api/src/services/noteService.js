import Note from '../models/Note.js';

/**
 * Notes Service
 * Business logic for note operations
 */

/**
 * Create a new note
 */
export async function createNote(userId, data) {
  const note = new Note({
    userId,
    title: data.title || '',
    body: data.body || '',
    tags: data.tags || [],
    pinned: data.pinned || false,
  });

  await note.save();
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

  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

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
};
