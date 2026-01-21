import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import { requireLimit } from '../middleware/limitEnforcement.js';
import noteService from '../services/noteService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /notes
 * Get notes with search/filter
 * Query params: q, status, tags, pinned, sort, limit, skip
 */
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      status = 'active',
      tags = '',
      pinned,
      lifeAreaId,
      projectId,
      sort = '-updatedAt',
      limit = 50,
      skip = 0
    } = req.query;

    const mongoose = (await import('mongoose')).default;
    const options = {
      q,
      status,
      tags: tags ? tags.split(',').filter(Boolean) : [],
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : null,
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : null,
      sort,
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    const { notes, total } = await noteService.getNotes(req.user._id, options);

    res.json({
      notes: notes.map(n => n.toSafeJSON()),
      total,
      limit: options.limit,
      skip: options.skip
    });
  } catch (error) {
    attachError(req, error, { operation: 'notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch notes',
      code: 'NOTES_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/inbox
 * Get unprocessed notes (inbox)
 */
router.get('/inbox', async (req, res) => {
  try {
    const {
      sort = '-createdAt',
      limit = 50,
      skip = 0
    } = req.query;

    const options = {
      sort,
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    const { notes, total } = await noteService.getInboxNotes(req.user._id, options);

    res.json({
      notes: notes.map(n => n.toSafeJSON()),
      total,
      limit: options.limit,
      skip: options.skip
    });
  } catch (error) {
    attachError(req, error, { operation: 'inbox_fetch' });
    res.status(500).json({
      error: 'Failed to fetch inbox',
      code: 'INBOX_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/inbox/count
 * Get inbox count (unprocessed notes)
 */
router.get('/inbox/count', async (req, res) => {
  try {
    const count = await noteService.getInboxCount(req.user._id);
    res.json({ count });
  } catch (error) {
    attachError(req, error, { operation: 'inbox_count' });
    res.status(500).json({
      error: 'Failed to fetch inbox count',
      code: 'INBOX_COUNT_ERROR'
    });
  }
});

/**
 * GET /notes/tags
 * Get all unique tags for the user
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await noteService.getUserTags(req.user._id);
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/recent
 * Get recent notes for dashboard
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const notes = await noteService.getRecentNotes(req.user._id, limit);
    res.json({ notes: notes.map(n => n.toSafeJSON()) });
  } catch (error) {
    attachError(req, error, { operation: 'recent_notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch recent notes',
      code: 'RECENT_NOTES_ERROR'
    });
  }
});

/**
 * GET /notes/pinned
 * Get pinned notes
 */
router.get('/pinned', async (req, res) => {
  try {
    const notes = await noteService.getPinnedNotes(req.user._id);
    res.json({ notes: notes.map(n => n.toSafeJSON()) });
  } catch (error) {
    attachError(req, error, { operation: 'pinned_notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch pinned notes',
      code: 'PINNED_NOTES_ERROR'
    });
  }
});

/**
 * GET /notes/last-opened
 * Get last opened note for "Continue" feature
 */
router.get('/last-opened', async (req, res) => {
  try {
    const note = await noteService.getLastOpenedNote(req.user._id);
    res.json({ note: note ? note.toSafeJSON() : null });
  } catch (error) {
    attachError(req, error, { operation: 'last_opened_fetch' });
    res.status(500).json({
      error: 'Failed to fetch last opened note',
      code: 'LAST_OPENED_ERROR'
    });
  }
});

/**
 * POST /notes
 * Create a new note
 */
router.post('/', requireLimit('notes'), async (req, res) => {
  try {
    const { title, body, tags, pinned, lifeAreaId, projectId } = req.body;

    const note = await noteService.createNote(req.user._id, {
      title,
      body,
      tags,
      pinned,
      lifeAreaId,
      projectId
    });

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.create.success';

    res.status(201).json({
      message: 'Note created successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_create' });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create note',
      code: 'NOTE_CREATE_ERROR'
    });
  }
});

/**
 * GET /notes/:id
 * Get a single note by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.getNoteById(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Mark as opened
    await noteService.markNoteAsOpened(req.user._id, id);

    res.json({ note: note.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'note_fetch', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch note',
      code: 'NOTE_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /notes/:id
 * Update a note
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const note = await noteService.updateNote(req.user._id, id, updates);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.update.success';

    res.json({
      message: 'Note updated successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_update', noteId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update note',
      code: 'NOTE_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /notes/:id
 * Permanently delete a note
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.deleteNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', id);
    req.eventName = 'note.delete.success';

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'note_delete', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete note',
      code: 'NOTE_DELETE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/pin
 * Pin a note
 */
router.post('/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.pinNote(req.user._id, id, true);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.pin.success';

    res.json({
      message: 'Note pinned successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_pin', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to pin note',
      code: 'PIN_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unpin
 * Unpin a note
 */
router.post('/:id/unpin', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.pinNote(req.user._id, id, false);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unpin.success';

    res.json({
      message: 'Note unpinned successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_unpin', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unpin note',
      code: 'UNPIN_ERROR'
    });
  }
});

/**
 * POST /notes/:id/archive
 * Archive a note
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.archiveNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or already archived',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.archive.success';

    res.json({
      message: 'Note archived successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_archive', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to archive note',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unarchive
 * Unarchive a note
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.unarchiveNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or not archived',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unarchive.success';

    res.json({
      message: 'Note unarchived successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_unarchive', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unarchive note',
      code: 'UNARCHIVE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/trash
 * Move a note to trash
 */
router.post('/:id/trash', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.trashNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or already trashed',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.trash.success';

    res.json({
      message: 'Note moved to trash',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_trash', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash note',
      code: 'TRASH_ERROR'
    });
  }
});

/**
 * POST /notes/:id/restore
 * Restore a note from trash
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.restoreNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or not in trash',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.restore.success';

    res.json({
      message: 'Note restored successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_restore', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore note',
      code: 'RESTORE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/process
 * Mark a note as processed (remove from inbox)
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.processNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.process.success';

    res.json({
      message: 'Note processed successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_process', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to process note',
      code: 'PROCESS_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unprocess
 * Move a note back to inbox
 */
router.post('/:id/unprocess', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const note = await noteService.unprocessNote(req.user._id, id);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unprocess.success';

    res.json({
      message: 'Note moved back to inbox',
      note: note.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_unprocess', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unprocess note',
      code: 'UNPROCESS_ERROR'
    });
  }
});

/**
 * POST /notes/:id/convert-to-task
 * Convert a note to a task
 */
router.post('/:id/convert-to-task', async (req, res) => {
  try {
    const { id } = req.params;
    const { keepNote = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const result = await noteService.convertToTask(req.user._id, id, keepNote);

    if (!result) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    attachEntityId(req, 'noteId', id);
    req.eventName = 'note.convert.success';

    res.json({
      message: 'Note converted to task',
      task: result.task.toSafeJSON(),
      note: result.note ? result.note.toSafeJSON() : null
    });
  } catch (error) {
    attachError(req, error, { operation: 'note_convert_to_task', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to convert note to task',
      code: 'CONVERT_ERROR'
    });
  }
});

/**
 * GET /notes/:id/backlinks
 * Get backlinks for a note
 */
router.get('/:id/backlinks', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    const backlinks = await noteService.getNoteBacklinks(req.user._id, id);
    res.json({ backlinks });
  } catch (error) {
    attachError(req, error, { operation: 'note_backlinks', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch backlinks',
      code: 'BACKLINKS_ERROR'
    });
  }
});

export default router;
