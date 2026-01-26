/**
 * =============================================================================
 * NOTESERVICE.TEST.JS - Comprehensive Tests for Note Service
 * =============================================================================
 *
 * This test file covers all functions in noteService.js:
 * - createNote: Creating notes with various data
 * - getNotes: Fetching notes with search and filters
 * - getNoteById: Getting a single note
 * - updateNote: Updating note fields
 * - deleteNote: Permanently deleting notes
 * - pinNote: Pinning/unpinning notes
 * - archiveNote/unarchiveNote: Archiving and restoring
 * - trashNote/restoreNote: Soft delete and restore
 * - markNoteAsOpened: Tracking note access
 * - getUserTags: Getting tag usage from notes
 * - getRecentNotes/getPinnedNotes/getLastOpenedNote: Dashboard queries
 * - getInboxNotes/getInboxCount: Inbox functionality
 * - processNote/unprocessNote: Inbox processing
 * - convertToTask: Converting notes to tasks
 * - getNoteBacklinks: Finding backlinks to a note
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import * as noteService from './noteService.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Tag from '../models/Tag.js';
import Link from '../models/Link.js';
import Project from '../models/Project.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock user ID for testing.
 * Uses mongoose.Types.ObjectId to create a valid MongoDB ObjectId.
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Creates a test note directly in the database.
 * Useful for setting up test data without going through the service.
 */
async function createTestNote(userId, overrides = {}) {
  const noteData = {
    userId,
    title: overrides.title || 'Test Note',
    body: overrides.body || 'Test body content',
    tags: overrides.tags || [],
    pinned: overrides.pinned || false,
    status: overrides.status || 'active',
    processed: overrides.processed !== undefined ? overrides.processed : false,
    lifeAreaId: overrides.lifeAreaId || null,
    projectId: overrides.projectId || null,
    ...overrides
  };

  const note = new Note(noteData);
  await note.save();
  return note;
}

// =============================================================================
// CREATE NOTE TESTS
// =============================================================================

describe('noteService', () => {
  describe('createNote', () => {
    it('should create a note with valid data', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'My First Note',
        body: 'This is the body of my note.',
        tags: ['work', 'important']
      };

      const note = await noteService.createNote(userId, noteData);

      expect(note).toBeDefined();
      expect(note._id).toBeDefined();
      expect(note.title).toBe('My First Note');
      expect(note.body).toBe('This is the body of my note.');
      expect(note.tags).toEqual(['work', 'important']);
      expect(note.userId.toString()).toBe(userId.toString());
      expect(note.status).toBe('active');
      expect(note.processed).toBe(false);
    });

    it('should create a note with minimal data (empty title and body)', async () => {
      const userId = createUserId();
      const noteData = {};

      const note = await noteService.createNote(userId, noteData);

      expect(note).toBeDefined();
      expect(note.title).toBe('');
      expect(note.body).toBe('');
      expect(note.tags).toEqual([]);
      expect(note.pinned).toBe(false);
    });

    it('should create a pinned note when pinned is true', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'Pinned Note',
        pinned: true
      };

      const note = await noteService.createNote(userId, noteData);

      expect(note.pinned).toBe(true);
    });

    it('should track tag usage when creating note with tags', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'Tagged Note',
        tags: ['project-alpha', 'meeting']
      };

      await noteService.createNote(userId, noteData);

      // Verify tags were tracked in the Tag model
      const tags = await Tag.find({ userId });
      expect(tags.length).toBe(2);

      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('project-alpha');
      expect(tagNames).toContain('meeting');
    });

    it('should not track tags if tags array is empty', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'No Tags',
        tags: []
      };

      await noteService.createNote(userId, noteData);

      const tags = await Tag.find({ userId });
      expect(tags.length).toBe(0);
    });

    it('should set lifeAreaId when provided', async () => {
      const userId = createUserId();
      const lifeAreaId = new mongoose.Types.ObjectId();
      const noteData = {
        title: 'Work Note',
        lifeAreaId
      };

      const note = await noteService.createNote(userId, noteData);

      expect(note.lifeAreaId.toString()).toBe(lifeAreaId.toString());
    });

    it('should set projectId when provided', async () => {
      const userId = createUserId();
      const projectId = new mongoose.Types.ObjectId();
      const noteData = {
        title: 'Project Note',
        projectId
      };

      // Note: This test doesn't fully test project linking since Project model
      // needs to exist. The linkNote call will fail silently if project doesn't exist.
      const note = await noteService.createNote(userId, noteData);

      expect(note.projectId.toString()).toBe(projectId.toString());
    });
  });

  // =============================================================================
  // GET NOTES TESTS
  // =============================================================================

  describe('getNotes', () => {
    let userId;

    beforeEach(async () => {
      userId = createUserId();

      // Create test notes
      await createTestNote(userId, { title: 'Note 1', body: 'First note body' });
      await createTestNote(userId, { title: 'Note 2', body: 'Second note body', tags: ['important'] });
      await createTestNote(userId, { title: 'Note 3', body: 'Third note body', pinned: true });
      await createTestNote(userId, { title: 'Archived Note', status: 'archived' });
      await createTestNote(userId, { title: 'Trashed Note', status: 'trashed' });
    });

    it('should return active notes by default', async () => {
      const result = await noteService.getNotes(userId);

      expect(result.notes).toBeDefined();
      expect(result.notes.length).toBe(3); // Only active notes
      expect(result.total).toBe(3);
    });

    it('should filter by status=archived', async () => {
      const result = await noteService.getNotes(userId, { status: 'archived' });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe('Archived Note');
    });

    it('should filter by status=trashed', async () => {
      const result = await noteService.getNotes(userId, { status: 'trashed' });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe('Trashed Note');
    });

    it('should filter by tags', async () => {
      const result = await noteService.getNotes(userId, { tags: ['important'] });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].tags).toContain('important');
    });

    it('should paginate results with limit', async () => {
      const result = await noteService.getNotes(userId, { limit: 2 });

      expect(result.notes.length).toBe(2);
      expect(result.total).toBe(3); // Total is still 3
    });

    it('should paginate results with skip', async () => {
      const result = await noteService.getNotes(userId, { limit: 2, skip: 2 });

      expect(result.notes.length).toBe(1); // Only 1 note after skipping 2
    });

    it('should not return notes from other users', async () => {
      const otherUserId = createUserId();
      await createTestNote(otherUserId, { title: 'Other User Note' });

      const result = await noteService.getNotes(userId);

      expect(result.notes.length).toBe(3); // Only original user's notes
      const titles = result.notes.map(n => n.title);
      expect(titles).not.toContain('Other User Note');
    });

    it('should filter by lifeAreaId', async () => {
      const lifeAreaId = new mongoose.Types.ObjectId();
      await createTestNote(userId, { title: 'Life Area Note', lifeAreaId });

      const result = await noteService.getNotes(userId, { lifeAreaId });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe('Life Area Note');
    });

    it('should filter by projectId', async () => {
      const projectId = new mongoose.Types.ObjectId();
      await createTestNote(userId, { title: 'Project Note', projectId });

      const result = await noteService.getNotes(userId, { projectId });

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe('Project Note');
    });
  });

  // =============================================================================
  // GET NOTE BY ID TESTS
  // =============================================================================

  describe('getNoteById', () => {
    it('should return a note by its ID', async () => {
      const userId = createUserId();
      const createdNote = await createTestNote(userId, { title: 'Find Me' });

      const note = await noteService.getNoteById(userId, createdNote._id);

      expect(note).toBeDefined();
      expect(note._id.toString()).toBe(createdNote._id.toString());
      expect(note.title).toBe('Find Me');
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const note = await noteService.getNoteById(userId, fakeNoteId);

      expect(note).toBeNull();
    });

    it('should return null if user does not own the note', async () => {
      const userId = createUserId();
      const otherUserId = createUserId();
      const createdNote = await createTestNote(otherUserId, { title: 'Not Yours' });

      const note = await noteService.getNoteById(userId, createdNote._id);

      expect(note).toBeNull();
    });
  });

  // =============================================================================
  // UPDATE NOTE TESTS
  // =============================================================================

  describe('updateNote', () => {
    it('should update note title and body', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Original', body: 'Original body' });

      const updated = await noteService.updateNote(userId, note._id, {
        title: 'Updated Title',
        body: 'Updated body'
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.body).toBe('Updated body');
    });

    it('should not allow updating _id', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Test' });
      const newId = new mongoose.Types.ObjectId();

      const updated = await noteService.updateNote(userId, note._id, {
        _id: newId,
        title: 'New Title'
      });

      expect(updated._id.toString()).toBe(note._id.toString());
      expect(updated.title).toBe('New Title');
    });

    it('should not allow updating userId (ownership transfer)', async () => {
      const userId = createUserId();
      const otherUserId = createUserId();
      const note = await createTestNote(userId, { title: 'Test' });

      const updated = await noteService.updateNote(userId, note._id, {
        userId: otherUserId
      });

      expect(updated.userId.toString()).toBe(userId.toString());
    });

    it('should track added tags', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Test', tags: ['existing'] });

      // Track the existing tag first
      await Tag.trackUsage(userId, ['existing']);

      await noteService.updateNote(userId, note._id, {
        tags: ['existing', 'new-tag']
      });

      const tags = await Tag.find({ userId });
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('new-tag');
    });

    it('should track removed tags', async () => {
      const userId = createUserId();

      // Create note with tags and track their usage
      const note = await createTestNote(userId, { title: 'Test', tags: ['keep', 'remove'] });
      await Tag.trackUsage(userId, ['keep', 'remove']);

      await noteService.updateNote(userId, note._id, {
        tags: ['keep']
      });

      // The 'remove' tag should have decremented usage
      const removeTag = await Tag.findOne({ userId, name: 'remove' });
      // Tag might be deleted if usage count reached 0
      if (removeTag) {
        expect(removeTag.usageCount).toBeLessThan(2);
      }
    });

    it('should return null when updating non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const updated = await noteService.updateNote(userId, fakeNoteId, {
        title: 'New Title'
      });

      expect(updated).toBeNull();
    });

    it('should return null when user does not own the note', async () => {
      const userId = createUserId();
      const otherUserId = createUserId();
      const note = await createTestNote(otherUserId, { title: 'Not Yours' });

      const updated = await noteService.updateNote(userId, note._id, {
        title: 'Trying to update'
      });

      expect(updated).toBeNull();
    });

    it('should update pinned status', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Test', pinned: false });

      const updated = await noteService.updateNote(userId, note._id, {
        pinned: true
      });

      expect(updated.pinned).toBe(true);
    });
  });

  // =============================================================================
  // DELETE NOTE TESTS
  // =============================================================================

  describe('deleteNote', () => {
    it('should permanently delete a note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Delete Me' });

      const deleted = await noteService.deleteNote(userId, note._id);

      expect(deleted).toBeDefined();
      expect(deleted._id.toString()).toBe(note._id.toString());

      // Verify note is gone
      const found = await Note.findById(note._id);
      expect(found).toBeNull();
    });

    it('should return null when deleting non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const deleted = await noteService.deleteNote(userId, fakeNoteId);

      expect(deleted).toBeNull();
    });

    it('should return null when user does not own the note', async () => {
      const userId = createUserId();
      const otherUserId = createUserId();
      const note = await createTestNote(otherUserId, { title: 'Not Yours' });

      const deleted = await noteService.deleteNote(userId, note._id);

      expect(deleted).toBeNull();

      // Verify note still exists
      const found = await Note.findById(note._id);
      expect(found).toBeDefined();
    });
  });

  // =============================================================================
  // PIN/UNPIN NOTE TESTS
  // =============================================================================

  describe('pinNote', () => {
    it('should pin a note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Pin Me', pinned: false });

      const pinned = await noteService.pinNote(userId, note._id, true);

      expect(pinned.pinned).toBe(true);
    });

    it('should unpin a note when called with false', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Unpin Me', pinned: true });

      const unpinned = await noteService.pinNote(userId, note._id, false);

      expect(unpinned.pinned).toBe(false);
    });

    it('should default to pinning when no value provided', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Pin Me', pinned: false });

      const pinned = await noteService.pinNote(userId, note._id);

      expect(pinned.pinned).toBe(true);
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.pinNote(userId, fakeNoteId, true);

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // ARCHIVE/UNARCHIVE NOTE TESTS
  // =============================================================================

  describe('archiveNote', () => {
    it('should archive an active note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Archive Me', status: 'active' });

      const archived = await noteService.archiveNote(userId, note._id);

      expect(archived.status).toBe('archived');
    });

    it('should return null when archiving already archived note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Already Archived', status: 'archived' });

      const result = await noteService.archiveNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should return null when archiving trashed note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Trashed', status: 'trashed' });

      const result = await noteService.archiveNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.archiveNote(userId, fakeNoteId);

      expect(result).toBeNull();
    });
  });

  describe('unarchiveNote', () => {
    it('should unarchive an archived note to active', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Unarchive Me', status: 'archived' });

      const unarchived = await noteService.unarchiveNote(userId, note._id);

      expect(unarchived.status).toBe('active');
    });

    it('should return null when unarchiving active note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Active', status: 'active' });

      const result = await noteService.unarchiveNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should return null when unarchiving trashed note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Trashed', status: 'trashed' });

      const result = await noteService.unarchiveNote(userId, note._id);

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // TRASH/RESTORE NOTE TESTS
  // =============================================================================

  describe('trashNote', () => {
    it('should trash an active note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Trash Me', status: 'active' });

      const trashed = await noteService.trashNote(userId, note._id);

      expect(trashed.status).toBe('trashed');
      expect(trashed.trashedAt).toBeDefined();
      expect(trashed.trashedAt).toBeInstanceOf(Date);
    });

    it('should trash an archived note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Archived to Trash', status: 'archived' });

      const trashed = await noteService.trashNote(userId, note._id);

      expect(trashed.status).toBe('trashed');
    });

    it('should return null when trashing already trashed note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Already Trashed', status: 'trashed' });

      const result = await noteService.trashNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should set trashedAt timestamp', async () => {
      const userId = createUserId();
      const beforeTrash = new Date();
      const note = await createTestNote(userId, { title: 'Trash Me', status: 'active' });

      const trashed = await noteService.trashNote(userId, note._id);
      const afterTrash = new Date();

      expect(trashed.trashedAt.getTime()).toBeGreaterThanOrEqual(beforeTrash.getTime());
      expect(trashed.trashedAt.getTime()).toBeLessThanOrEqual(afterTrash.getTime());
    });
  });

  describe('restoreNote', () => {
    it('should restore a trashed note to active', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, {
        title: 'Restore Me',
        status: 'trashed',
        trashedAt: new Date()
      });

      const restored = await noteService.restoreNote(userId, note._id);

      expect(restored.status).toBe('active');
      expect(restored.trashedAt).toBeNull();
    });

    it('should return null when restoring active note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Active', status: 'active' });

      const result = await noteService.restoreNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should return null when restoring archived note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Archived', status: 'archived' });

      const result = await noteService.restoreNote(userId, note._id);

      expect(result).toBeNull();
    });

    it('should clear trashedAt when restoring', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, {
        title: 'Restore Me',
        status: 'trashed',
        trashedAt: new Date(Date.now() - 86400000) // 1 day ago
      });

      const restored = await noteService.restoreNote(userId, note._id);

      expect(restored.trashedAt).toBeNull();
    });
  });

  // =============================================================================
  // MARK NOTE AS OPENED TESTS
  // =============================================================================

  describe('markNoteAsOpened', () => {
    it('should set lastOpenedAt timestamp', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Open Me' });

      const beforeOpen = new Date();
      const opened = await noteService.markNoteAsOpened(userId, note._id);
      const afterOpen = new Date();

      expect(opened.lastOpenedAt).toBeDefined();
      expect(opened.lastOpenedAt.getTime()).toBeGreaterThanOrEqual(beforeOpen.getTime());
      expect(opened.lastOpenedAt.getTime()).toBeLessThanOrEqual(afterOpen.getTime());
    });

    it('should update lastOpenedAt on subsequent opens', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, {
        title: 'Open Again',
        lastOpenedAt: new Date(Date.now() - 86400000) // 1 day ago
      });

      const opened = await noteService.markNoteAsOpened(userId, note._id);

      expect(opened.lastOpenedAt.getTime()).toBeGreaterThan(note.lastOpenedAt.getTime());
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.markNoteAsOpened(userId, fakeNoteId);

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // GET USER TAGS TESTS
  // =============================================================================

  describe('getUserTags', () => {
    it('should return tags with usage counts from active notes', async () => {
      const userId = createUserId();

      // Create notes with various tags
      await createTestNote(userId, { title: 'Note 1', tags: ['work', 'urgent'] });
      await createTestNote(userId, { title: 'Note 2', tags: ['work', 'meeting'] });
      await createTestNote(userId, { title: 'Note 3', tags: ['work'] });

      const tags = await noteService.getUserTags(userId);

      expect(tags.length).toBe(3);

      // Work should have highest count
      const workTag = tags.find(t => t.tag === 'work');
      expect(workTag.count).toBe(3);

      const urgentTag = tags.find(t => t.tag === 'urgent');
      expect(urgentTag.count).toBe(1);
    });

    it('should not include tags from archived notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Active', tags: ['active-tag'] });
      await createTestNote(userId, { title: 'Archived', tags: ['archived-tag'], status: 'archived' });

      const tags = await noteService.getUserTags(userId);

      const tagNames = tags.map(t => t.tag);
      expect(tagNames).toContain('active-tag');
      expect(tagNames).not.toContain('archived-tag');
    });

    it('should not include tags from trashed notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Active', tags: ['keep'] });
      await createTestNote(userId, { title: 'Trashed', tags: ['discard'], status: 'trashed' });

      const tags = await noteService.getUserTags(userId);

      const tagNames = tags.map(t => t.tag);
      expect(tagNames).toContain('keep');
      expect(tagNames).not.toContain('discard');
    });

    it('should return empty array for user with no notes', async () => {
      const userId = createUserId();

      const tags = await noteService.getUserTags(userId);

      expect(tags).toEqual([]);
    });

    it('should return sorted by count descending', async () => {
      const userId = createUserId();

      // Create notes to get specific counts
      await createTestNote(userId, { title: 'Note 1', tags: ['c', 'b', 'a'] });
      await createTestNote(userId, { title: 'Note 2', tags: ['b', 'a'] });
      await createTestNote(userId, { title: 'Note 3', tags: ['a'] });

      const tags = await noteService.getUserTags(userId);

      expect(tags[0].tag).toBe('a'); // count 3
      expect(tags[1].tag).toBe('b'); // count 2
      expect(tags[2].tag).toBe('c'); // count 1
    });
  });

  // =============================================================================
  // GET RECENT NOTES TESTS
  // =============================================================================

  describe('getRecentNotes', () => {
    it('should return most recently updated notes', async () => {
      const userId = createUserId();

      // Create notes with slight delays to ensure different updatedAt
      const note1 = await createTestNote(userId, { title: 'Oldest' });
      const note2 = await createTestNote(userId, { title: 'Middle' });
      const note3 = await createTestNote(userId, { title: 'Newest' });

      const recent = await noteService.getRecentNotes(userId);

      expect(recent.length).toBe(3);
      expect(recent[0].title).toBe('Newest');
    });

    it('should respect limit parameter', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Note 1' });
      await createTestNote(userId, { title: 'Note 2' });
      await createTestNote(userId, { title: 'Note 3' });

      const recent = await noteService.getRecentNotes(userId, 2);

      expect(recent.length).toBe(2);
    });

    it('should only return active notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Active' });
      await createTestNote(userId, { title: 'Archived', status: 'archived' });
      await createTestNote(userId, { title: 'Trashed', status: 'trashed' });

      const recent = await noteService.getRecentNotes(userId);

      expect(recent.length).toBe(1);
      expect(recent[0].title).toBe('Active');
    });

    it('should default to 5 notes', async () => {
      const userId = createUserId();

      for (let i = 0; i < 10; i++) {
        await createTestNote(userId, { title: `Note ${i}` });
      }

      const recent = await noteService.getRecentNotes(userId);

      expect(recent.length).toBe(5);
    });
  });

  // =============================================================================
  // GET PINNED NOTES TESTS
  // =============================================================================

  describe('getPinnedNotes', () => {
    it('should return only pinned notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Not Pinned', pinned: false });
      await createTestNote(userId, { title: 'Pinned 1', pinned: true });
      await createTestNote(userId, { title: 'Pinned 2', pinned: true });

      const pinned = await noteService.getPinnedNotes(userId);

      expect(pinned.length).toBe(2);
      expect(pinned.every(n => n.pinned)).toBe(true);
    });

    it('should only return active pinned notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Active Pinned', pinned: true });
      await createTestNote(userId, { title: 'Archived Pinned', pinned: true, status: 'archived' });

      const pinned = await noteService.getPinnedNotes(userId);

      expect(pinned.length).toBe(1);
      expect(pinned[0].title).toBe('Active Pinned');
    });

    it('should return empty array when no pinned notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Not Pinned', pinned: false });

      const pinned = await noteService.getPinnedNotes(userId);

      expect(pinned).toEqual([]);
    });
  });

  // =============================================================================
  // GET LAST OPENED NOTE TESTS
  // =============================================================================

  describe('getLastOpenedNote', () => {
    it('should return the most recently opened note', async () => {
      const userId = createUserId();

      await createTestNote(userId, {
        title: 'Opened First',
        lastOpenedAt: new Date(Date.now() - 86400000)
      });
      await createTestNote(userId, {
        title: 'Opened Last',
        lastOpenedAt: new Date()
      });

      const lastOpened = await noteService.getLastOpenedNote(userId);

      expect(lastOpened.title).toBe('Opened Last');
    });

    it('should return null when no notes have been opened', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Never Opened', lastOpenedAt: null });

      const lastOpened = await noteService.getLastOpenedNote(userId);

      expect(lastOpened).toBeNull();
    });

    it('should only consider active notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, {
        title: 'Active Old',
        lastOpenedAt: new Date(Date.now() - 86400000)
      });
      await createTestNote(userId, {
        title: 'Archived Recent',
        lastOpenedAt: new Date(),
        status: 'archived'
      });

      const lastOpened = await noteService.getLastOpenedNote(userId);

      expect(lastOpened.title).toBe('Active Old');
    });
  });

  // =============================================================================
  // INBOX NOTES TESTS
  // =============================================================================

  describe('getInboxNotes', () => {
    it('should return unprocessed active notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Inbox 1', processed: false });
      await createTestNote(userId, { title: 'Inbox 2', processed: false });
      await createTestNote(userId, { title: 'Processed', processed: true });

      const result = await noteService.getInboxNotes(userId);

      expect(result.notes.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.notes.every(n => !n.processed)).toBe(true);
    });

    it('should not include archived or trashed notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Active Inbox', processed: false });
      await createTestNote(userId, { title: 'Archived Inbox', processed: false, status: 'archived' });
      await createTestNote(userId, { title: 'Trashed Inbox', processed: false, status: 'trashed' });

      const result = await noteService.getInboxNotes(userId);

      expect(result.notes.length).toBe(1);
      expect(result.notes[0].title).toBe('Active Inbox');
    });

    it('should paginate with limit and skip', async () => {
      const userId = createUserId();

      for (let i = 0; i < 5; i++) {
        await createTestNote(userId, { title: `Inbox ${i}`, processed: false });
      }

      const result = await noteService.getInboxNotes(userId, { limit: 2, skip: 2 });

      expect(result.notes.length).toBe(2);
      expect(result.total).toBe(5);
    });

    it('should sort by createdAt descending by default', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Oldest', processed: false });
      await createTestNote(userId, { title: 'Newest', processed: false });

      const result = await noteService.getInboxNotes(userId);

      expect(result.notes[0].title).toBe('Newest');
    });

    it('should support ascending sort', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Oldest', processed: false });
      await createTestNote(userId, { title: 'Newest', processed: false });

      const result = await noteService.getInboxNotes(userId, { sort: 'createdAt' });

      expect(result.notes[0].title).toBe('Oldest');
    });
  });

  describe('getInboxCount', () => {
    it('should return count of unprocessed active notes', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Inbox 1', processed: false });
      await createTestNote(userId, { title: 'Inbox 2', processed: false });
      await createTestNote(userId, { title: 'Processed', processed: true });

      const count = await noteService.getInboxCount(userId);

      expect(count).toBe(2);
    });

    it('should return 0 when inbox is empty', async () => {
      const userId = createUserId();

      await createTestNote(userId, { title: 'Processed', processed: true });

      const count = await noteService.getInboxCount(userId);

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // PROCESS/UNPROCESS NOTE TESTS
  // =============================================================================

  describe('processNote', () => {
    it('should mark a note as processed', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Process Me', processed: false });

      const processed = await noteService.processNote(userId, note._id);

      expect(processed.processed).toBe(true);
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.processNote(userId, fakeNoteId);

      expect(result).toBeNull();
    });
  });

  describe('unprocessNote', () => {
    it('should mark a note as unprocessed', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Unprocess Me', processed: true });

      const unprocessed = await noteService.unprocessNote(userId, note._id);

      expect(unprocessed.processed).toBe(false);
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.unprocessNote(userId, fakeNoteId);

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // CONVERT TO TASK TESTS
  // =============================================================================

  describe('convertToTask', () => {
    it('should create a task from a note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, {
        title: 'Convert Me',
        body: 'Task description',
        tags: ['urgent', 'work']
      });

      const result = await noteService.convertToTask(userId, note._id, false);

      expect(result).toBeDefined();
      expect(result.task).toBeDefined();
      expect(result.task.title).toBe('Convert Me');
      expect(result.task.body).toBe('Task description');
      expect(result.task.tags).toEqual(['urgent', 'work']);
    });

    it('should delete the note when keepNote is false', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Delete After Convert' });

      const result = await noteService.convertToTask(userId, note._id, false);

      expect(result.note).toBeNull();

      // Verify note is deleted
      const found = await Note.findById(note._id);
      expect(found).toBeNull();
    });

    it('should keep the note when keepNote is true', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Keep Me' });

      const result = await noteService.convertToTask(userId, note._id, true);

      expect(result.note).toBeDefined();
      expect(result.note.processed).toBe(true);

      // Verify note still exists
      const found = await Note.findById(note._id);
      expect(found).toBeDefined();
    });

    it('should create a link when keeping the note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Link Test' });

      const result = await noteService.convertToTask(userId, note._id, true);

      // Check for the link
      const link = await Link.findOne({
        userId,
        sourceType: 'task',
        sourceId: result.task._id,
        targetType: 'note',
        targetId: note._id
      });

      expect(link).toBeDefined();
      expect(link.linkType).toBe('converted_from');
    });

    it('should default keepNote to true', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Default Keep' });

      const result = await noteService.convertToTask(userId, note._id);

      expect(result.note).toBeDefined();
    });

    it('should return null for non-existent note', async () => {
      const userId = createUserId();
      const fakeNoteId = new mongoose.Types.ObjectId();

      const result = await noteService.convertToTask(userId, fakeNoteId);

      expect(result).toBeNull();
    });

    it('should return null when user does not own the note', async () => {
      const userId = createUserId();
      const otherUserId = createUserId();
      const note = await createTestNote(otherUserId, { title: 'Not Yours' });

      const result = await noteService.convertToTask(userId, note._id);

      expect(result).toBeNull();
    });

    it('should set sourceNoteId and linkedNoteIds when keeping note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Source Test' });

      const result = await noteService.convertToTask(userId, note._id, true);

      expect(result.task.sourceNoteId.toString()).toBe(note._id.toString());
      expect(result.task.linkedNoteIds[0].toString()).toBe(note._id.toString());
    });

    it('should use "Untitled Task" when note has no title', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: '', body: 'Just body' });

      const result = await noteService.convertToTask(userId, note._id, false);

      expect(result.task.title).toBe('Untitled Task');
    });
  });

  // =============================================================================
  // GET NOTE BACKLINKS TESTS
  // =============================================================================

  describe('getNoteBacklinks', () => {
    it('should return links from other notes', async () => {
      const userId = createUserId();

      // Create target note
      const targetNote = await createTestNote(userId, { title: 'Target' });

      // Create source note that links to target
      const sourceNote = await createTestNote(userId, { title: 'Source' });

      // Create link
      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: sourceNote._id,
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'reference'
      });

      const backlinks = await noteService.getNoteBacklinks(userId, targetNote._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceType).toBe('note');
      expect(backlinks[0].source).toBeDefined();
      expect(backlinks[0].source.title).toBe('Source');
    });

    it('should return links from tasks', async () => {
      const userId = createUserId();

      // Create target note
      const targetNote = await createTestNote(userId, { title: 'Target' });

      // Create source task
      const sourceTask = new Task({
        userId,
        title: 'Source Task'
      });
      await sourceTask.save();

      // Create link
      await Link.create({
        userId,
        sourceType: 'task',
        sourceId: sourceTask._id,
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'reference'
      });

      const backlinks = await noteService.getNoteBacklinks(userId, targetNote._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceType).toBe('task');
      expect(backlinks[0].source.title).toBe('Source Task');
    });

    it('should filter out orphaned links (source deleted)', async () => {
      const userId = createUserId();

      // Create target note
      const targetNote = await createTestNote(userId, { title: 'Target' });

      // Create orphan link (source note doesn't exist)
      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: new mongoose.Types.ObjectId(), // Non-existent
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'reference'
      });

      const backlinks = await noteService.getNoteBacklinks(userId, targetNote._id);

      expect(backlinks.length).toBe(0);
    });

    it('should return empty array when no backlinks exist', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Lonely Note' });

      const backlinks = await noteService.getNoteBacklinks(userId, note._id);

      expect(backlinks).toEqual([]);
    });

    it('should include converted_from link type', async () => {
      const userId = createUserId();

      // Create note
      const note = await createTestNote(userId, { title: 'Original Note' });

      // Convert to task (creates converted_from link)
      const result = await noteService.convertToTask(userId, note._id, true);

      const backlinks = await noteService.getNoteBacklinks(userId, note._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].linkType).toBe('converted_from');
      expect(backlinks[0].source.title).toBe('Original Note'); // Task gets note's title
    });

    it('should handle multiple backlinks', async () => {
      const userId = createUserId();

      // Create target note
      const targetNote = await createTestNote(userId, { title: 'Target' });

      // Create multiple source notes
      const source1 = await createTestNote(userId, { title: 'Source 1' });
      const source2 = await createTestNote(userId, { title: 'Source 2' });

      // Create links
      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: source1._id,
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'reference'
      });

      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: source2._id,
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'related'
      });

      const backlinks = await noteService.getNoteBacklinks(userId, targetNote._id);

      expect(backlinks.length).toBe(2);
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING
  // =============================================================================

  describe('edge cases', () => {
    it('should handle special characters in note title', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\'',
        body: 'Body with special chars: <>"\''
      };

      const note = await noteService.createNote(userId, noteData);

      expect(note.title).toBe(noteData.title);
      expect(note.body).toBe(noteData.body);
    });

    it('should handle very long note body', async () => {
      const userId = createUserId();
      const longBody = 'a'.repeat(100000); // 100KB of text

      const note = await noteService.createNote(userId, {
        title: 'Long Note',
        body: longBody
      });

      expect(note.body.length).toBe(100000);
    });

    it('should handle empty tags array', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'No Tags', tags: [] });

      const updated = await noteService.updateNote(userId, note._id, {
        tags: []
      });

      expect(updated.tags).toEqual([]);
    });

    it('should handle unicode characters in title and body', async () => {
      const userId = createUserId();
      const noteData = {
        title: 'Unicode Test: \u{1F600} \u{1F4DD} \u4E2D\u6587',
        body: 'Emoji and CJK: \u{1F389} \u65E5\u672C\u8A9E \uD55C\uAE00'
      };

      const note = await noteService.createNote(userId, noteData);

      expect(note.title).toBe(noteData.title);
      expect(note.body).toBe(noteData.body);
    });

    it('should handle concurrent updates to the same note', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Concurrent' });

      // Perform multiple concurrent updates
      const updates = await Promise.all([
        noteService.updateNote(userId, note._id, { title: 'Update 1' }),
        noteService.updateNote(userId, note._id, { title: 'Update 2' }),
        noteService.updateNote(userId, note._id, { title: 'Update 3' })
      ]);

      // All should succeed (last one wins in MongoDB)
      expect(updates.every(u => u !== null)).toBe(true);
    });
  });
});
