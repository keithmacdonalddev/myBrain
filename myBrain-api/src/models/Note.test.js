/**
 * =============================================================================
 * NOTE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Note model covering:
 * - Schema validation (required fields, max lengths, enums, defaults)
 * - toSafeJSON() instance method
 * - searchNotes() static method with all filter/sort/pagination options
 * - linkFile() and unlinkFile() bidirectional linking methods
 * - User isolation (notes belong to specific users)
 * - Text search functionality
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import Note from './Note.js';
import File from './File.js';
import User from './User.js';
import LifeArea from './LifeArea.js';
import Project from './Project.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `notetest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'free',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Creates a test note with sensible defaults.
 */
async function createTestNote(userId, overrides = {}) {
  const defaults = {
    userId,
    title: `Test Note ${Date.now()}`,
    body: 'This is test note content.',
    status: 'active',
    processed: false,
    pinned: false,
    tags: [],
  };
  return Note.create({ ...defaults, ...overrides });
}

/**
 * Creates a test file for linking tests.
 */
async function createTestFile(userId, overrides = {}) {
  const defaults = {
    userId,
    storageProvider: 's3',
    storageKey: `files/${userId}/${Date.now()}/test-file.pdf`,
    storageBucket: 'mybrain-files-test',
    filename: `test-file-${Date.now()}.pdf`,
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 100,
    fileCategory: 'document',
  };
  return File.create({ ...defaults, ...overrides });
}

/**
 * Creates a test life area for filtering tests.
 */
async function createTestLifeArea(userId, overrides = {}) {
  const defaults = {
    userId,
    name: `Test Area ${Date.now()}`,
    color: '#3B82F6',
    icon: 'folder',
  };
  return LifeArea.create({ ...defaults, ...overrides });
}

/**
 * Creates a test project for filtering tests.
 */
async function createTestProject(userId, overrides = {}) {
  const defaults = {
    userId,
    title: `Test Project ${Date.now()}`,
    status: 'active',
  };
  return Project.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Note Model', () => {
  let testUser;
  let testUserId;

  beforeEach(async () => {
    testUser = await createTestUser();
    testUserId = testUser._id;
  });

  // ===========================================================================
  // SCHEMA VALIDATION TESTS
  // ===========================================================================

  describe('Schema Validation', () => {
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          Note.create({
            title: 'Test Note',
            body: 'Content without userId',
          })
        ).rejects.toThrow(/userId.*required/i);
      });

      it('should create note with only userId (all other fields optional)', async () => {
        const note = await Note.create({ userId: testUserId });

        expect(note._id).toBeDefined();
        expect(note.userId.toString()).toBe(testUserId.toString());
        expect(note.title).toBe(''); // Default empty string
        expect(note.body).toBe(''); // Default empty string
        expect(note.status).toBe('active'); // Default status
        expect(note.pinned).toBe(false); // Default false
        expect(note.processed).toBe(false); // Default false
        expect(note.tags).toEqual([]); // Default empty array
      });
    });

    describe('Title field', () => {
      it('should accept title up to 200 characters', async () => {
        const longTitle = 'A'.repeat(200);
        const note = await Note.create({
          userId: testUserId,
          title: longTitle,
        });

        expect(note.title).toBe(longTitle);
        expect(note.title.length).toBe(200);
      });

      it('should reject title exceeding 200 characters', async () => {
        const tooLongTitle = 'A'.repeat(201);
        await expect(
          Note.create({
            userId: testUserId,
            title: tooLongTitle,
          })
        ).rejects.toThrow(/200 characters/i);
      });

      it('should trim whitespace from title', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: '  Trimmed Title  ',
        });

        expect(note.title).toBe('Trimmed Title');
      });
    });

    describe('Status field', () => {
      it('should accept valid status values', async () => {
        const validStatuses = ['active', 'archived', 'trashed'];

        for (const status of validStatuses) {
          const note = await Note.create({
            userId: testUserId,
            title: `Note with status ${status}`,
            status,
          });
          expect(note.status).toBe(status);
        }
      });

      it('should reject invalid status values', async () => {
        await expect(
          Note.create({
            userId: testUserId,
            title: 'Invalid status note',
            status: 'invalid_status',
          })
        ).rejects.toThrow(/enum/i);
      });

      it('should default to active status', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Default status note',
        });

        expect(note.status).toBe('active');
      });
    });

    describe('Tags field', () => {
      it('should accept array of strings', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Tagged note',
          tags: ['work', 'important', 'review'],
        });

        expect(note.tags).toEqual(['work', 'important', 'review']);
        expect(note.tags.length).toBe(3);
      });

      it('should default to empty array', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'No tags note',
        });

        expect(note.tags).toEqual([]);
      });
    });

    describe('Timestamps', () => {
      it('should automatically add createdAt and updatedAt', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Timestamp test note',
        });

        expect(note.createdAt).toBeInstanceOf(Date);
        expect(note.updatedAt).toBeInstanceOf(Date);
      });

      it('should update updatedAt on modification', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Original title',
        });

        const originalUpdatedAt = note.updatedAt;

        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));

        note.title = 'Updated title';
        await note.save();

        expect(note.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });
    });

    describe('Optional reference fields', () => {
      it('should accept valid lifeAreaId reference', async () => {
        const lifeArea = await createTestLifeArea(testUserId);
        const note = await Note.create({
          userId: testUserId,
          title: 'Note with life area',
          lifeAreaId: lifeArea._id,
        });

        expect(note.lifeAreaId.toString()).toBe(lifeArea._id.toString());
      });

      it('should accept valid projectId reference', async () => {
        const project = await createTestProject(testUserId);
        const note = await Note.create({
          userId: testUserId,
          title: 'Note with project',
          projectId: project._id,
        });

        expect(note.projectId.toString()).toBe(project._id.toString());
      });

      it('should default lifeAreaId and projectId to null', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Note without references',
        });

        expect(note.lifeAreaId).toBeNull();
        expect(note.projectId).toBeNull();
      });
    });

    describe('Date fields', () => {
      it('should default trashedAt to null', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Non-trashed note',
        });

        expect(note.trashedAt).toBeNull();
      });

      it('should default lastOpenedAt to null', async () => {
        const note = await Note.create({
          userId: testUserId,
          title: 'Never opened note',
        });

        expect(note.lastOpenedAt).toBeNull();
      });

      it('should accept valid date for trashedAt', async () => {
        const trashedDate = new Date();
        const note = await Note.create({
          userId: testUserId,
          title: 'Trashed note',
          status: 'trashed',
          trashedAt: trashedDate,
        });

        expect(note.trashedAt).toBeInstanceOf(Date);
        expect(note.trashedAt.getTime()).toBe(trashedDate.getTime());
      });
    });
  });

  // ===========================================================================
  // toSafeJSON() TESTS
  // ===========================================================================

  describe('toSafeJSON()', () => {
    it('should remove __v field from output', async () => {
      const note = await Note.create({
        userId: testUserId,
        title: 'Test Note',
      });

      const safeJson = note.toSafeJSON();

      expect(safeJson.__v).toBeUndefined();
      expect(safeJson._id).toBeDefined();
      expect(safeJson.title).toBe('Test Note');
    });

    it('should preserve all standard fields', async () => {
      const lifeArea = await createTestLifeArea(testUserId);
      const project = await createTestProject(testUserId);

      const note = await Note.create({
        userId: testUserId,
        title: 'Full Note',
        body: 'Full body content with lots of text.',
        status: 'active',
        pinned: true,
        processed: true,
        tags: ['tag1', 'tag2', 'tag3'],
        lifeAreaId: lifeArea._id,
        projectId: project._id,
      });

      const safeJson = note.toSafeJSON();

      expect(safeJson.title).toBe('Full Note');
      expect(safeJson.body).toBe('Full body content with lots of text.');
      expect(safeJson.status).toBe('active');
      expect(safeJson.pinned).toBe(true);
      expect(safeJson.processed).toBe(true);
      expect(safeJson.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(safeJson.lifeAreaId.toString()).toBe(lifeArea._id.toString());
      expect(safeJson.projectId.toString()).toBe(project._id.toString());
      expect(safeJson.createdAt).toBeDefined();
      expect(safeJson.updatedAt).toBeDefined();
    });

    it('should preserve linkedFileIds array', async () => {
      const file = await createTestFile(testUserId);
      const note = await Note.create({
        userId: testUserId,
        title: 'Note with file',
        linkedFileIds: [file._id],
      });

      const safeJson = note.toSafeJSON();

      expect(safeJson.linkedFileIds).toHaveLength(1);
      expect(safeJson.linkedFileIds[0].toString()).toBe(file._id.toString());
    });
  });

  // ===========================================================================
  // searchNotes() TESTS
  // ===========================================================================

  describe('searchNotes(userId, options)', () => {
    let lifeArea;
    let project;

    beforeEach(async () => {
      lifeArea = await createTestLifeArea(testUserId);
      project = await createTestProject(testUserId);

      // Create a variety of notes for search tests
      await Note.create([
        {
          userId: testUserId,
          title: 'Meeting notes from Monday',
          body: 'Discussed project timeline and deliverables',
          status: 'active',
          pinned: true,
          processed: true,
          tags: ['work', 'meeting'],
        },
        {
          userId: testUserId,
          title: 'Shopping list',
          body: 'Milk, eggs, bread, cheese',
          status: 'active',
          pinned: false,
          processed: false,
          tags: ['personal', 'shopping'],
        },
        {
          userId: testUserId,
          title: 'Project ideas',
          body: 'New feature ideas for the app',
          status: 'active',
          pinned: false,
          processed: true,
          tags: ['work', 'ideas'],
          lifeAreaId: lifeArea._id,
        },
        {
          userId: testUserId,
          title: 'Old archived note',
          body: 'This note has been archived',
          status: 'archived',
          pinned: false,
          processed: true,
          tags: ['archive'],
        },
        {
          userId: testUserId,
          title: 'Deleted note in trash',
          body: 'This note is in the trash',
          status: 'trashed',
          pinned: false,
          processed: true,
          tags: ['trash'],
          trashedAt: new Date(),
        },
        {
          userId: testUserId,
          title: 'Project linked note',
          body: 'Note linked to a project',
          status: 'active',
          pinned: false,
          processed: false,
          tags: ['work'],
          projectId: project._id,
        },
      ]);
    });

    describe('Basic queries', () => {
      it('should return only active notes by default', async () => {
        const { notes, total } = await Note.searchNotes(testUserId);

        expect(total).toBe(4); // 4 active notes
        expect(notes).toHaveLength(4);
        expect(notes.every(n => n.status === 'active')).toBe(true);
      });

      it('should return empty results for user with no notes', async () => {
        const otherUser = await createTestUser();
        const { notes, total } = await Note.searchNotes(otherUser._id);

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });
    });

    describe('Status filtering', () => {
      it('should filter by active status', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'active',
        });

        expect(total).toBe(4);
        expect(notes.every(n => n.status === 'active')).toBe(true);
      });

      it('should filter by archived status', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'archived',
        });

        expect(total).toBe(1);
        expect(notes[0].title).toBe('Old archived note');
      });

      it('should filter by trashed status', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'trashed',
        });

        expect(total).toBe(1);
        expect(notes[0].title).toBe('Deleted note in trash');
      });

      it('should return all notes with status: all', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'all',
        });

        expect(total).toBe(6); // All 6 notes
        expect(notes).toHaveLength(6);
      });
    });

    describe('Tag filtering', () => {
      it('should filter by single tag', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          tags: ['work'],
        });

        expect(total).toBe(3);
        expect(notes.every(n => n.tags.includes('work'))).toBe(true);
      });

      it('should filter by multiple tags (must have ALL)', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          tags: ['work', 'meeting'],
        });

        expect(total).toBe(1);
        expect(notes[0].title).toBe('Meeting notes from Monday');
      });

      it('should return empty when no notes have all specified tags', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          tags: ['work', 'nonexistent'],
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });
    });

    describe('Pinned filtering', () => {
      it('should filter by pinned: true', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          pinned: true,
        });

        expect(total).toBe(1);
        expect(notes[0].pinned).toBe(true);
        expect(notes[0].title).toBe('Meeting notes from Monday');
      });

      it('should filter by pinned: false', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          pinned: false,
        });

        expect(total).toBe(3); // 3 active non-pinned notes
        expect(notes.every(n => n.pinned === false)).toBe(true);
      });

      it('should return all when pinned is null (default)', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          pinned: null,
        });

        expect(total).toBe(4); // All active notes
      });
    });

    describe('LifeArea filtering', () => {
      it('should filter by lifeAreaId', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          lifeAreaId: lifeArea._id,
        });

        expect(total).toBe(1);
        expect(notes[0].title).toBe('Project ideas');
        expect(notes[0].lifeAreaId.toString()).toBe(lifeArea._id.toString());
      });

      it('should return empty for lifeArea with no notes', async () => {
        const emptyLifeArea = await createTestLifeArea(testUserId);
        const { notes, total } = await Note.searchNotes(testUserId, {
          lifeAreaId: emptyLifeArea._id,
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });
    });

    describe('Project filtering', () => {
      it('should filter by projectId', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          projectId: project._id,
        });

        expect(total).toBe(1);
        expect(notes[0].title).toBe('Project linked note');
        expect(notes[0].projectId.toString()).toBe(project._id.toString());
      });

      it('should return empty for project with no notes', async () => {
        const emptyProject = await createTestProject(testUserId, { title: 'Empty Project' });
        const { notes, total } = await Note.searchNotes(testUserId, {
          projectId: emptyProject._id,
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });
    });

    describe('Combined filters', () => {
      it('should combine status and tags filters', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'active',
          tags: ['work'],
        });

        expect(total).toBe(3);
        expect(notes.every(n => n.status === 'active' && n.tags.includes('work'))).toBe(true);
      });

      it('should combine pinned and tags filters', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          pinned: true,
          tags: ['work'],
        });

        expect(total).toBe(1);
        expect(notes[0].pinned).toBe(true);
        expect(notes[0].tags).toContain('work');
      });

      it('should return empty when combined filters match nothing', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'archived',
          tags: ['work'],
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });
    });

    describe('Sorting', () => {
      it('should sort by updatedAt descending by default', async () => {
        const { notes } = await Note.searchNotes(testUserId);

        // Pinned notes should come first, then sorted by updatedAt
        expect(notes[0].pinned).toBe(true);
      });

      it('should show pinned notes first for non-search queries', async () => {
        const { notes } = await Note.searchNotes(testUserId);

        // First note should be the pinned one
        const pinnedIndex = notes.findIndex(n => n.pinned === true);
        expect(pinnedIndex).toBe(0);
      });

      it('should sort by createdAt ascending', async () => {
        const { notes } = await Note.searchNotes(testUserId, {
          sort: 'createdAt',
        });

        // Still pinned first, but rest sorted by createdAt ascending
        const nonPinnedNotes = notes.filter(n => !n.pinned);
        for (let i = 1; i < nonPinnedNotes.length; i++) {
          expect(new Date(nonPinnedNotes[i].createdAt).getTime())
            .toBeGreaterThanOrEqual(new Date(nonPinnedNotes[i - 1].createdAt).getTime());
        }
      });

      it('should sort by createdAt descending with minus prefix', async () => {
        const { notes } = await Note.searchNotes(testUserId, {
          sort: '-createdAt',
        });

        // Pinned first, rest sorted descending
        const nonPinnedNotes = notes.filter(n => !n.pinned);
        for (let i = 1; i < nonPinnedNotes.length; i++) {
          expect(new Date(nonPinnedNotes[i].createdAt).getTime())
            .toBeLessThanOrEqual(new Date(nonPinnedNotes[i - 1].createdAt).getTime());
        }
      });
    });

    describe('Pagination', () => {
      it('should limit results with limit option', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          limit: 2,
        });

        expect(notes).toHaveLength(2);
        expect(total).toBe(4); // Total is still 4, just limited results
      });

      it('should skip results with skip option', async () => {
        const { notes: firstPage } = await Note.searchNotes(testUserId, {
          limit: 2,
          skip: 0,
        });

        const { notes: secondPage } = await Note.searchNotes(testUserId, {
          limit: 2,
          skip: 2,
        });

        // Pages should have different notes
        const firstIds = firstPage.map(n => n._id.toString());
        const secondIds = secondPage.map(n => n._id.toString());

        expect(firstIds.some(id => secondIds.includes(id))).toBe(false);
      });

      it('should return empty array when skip exceeds total', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          skip: 100,
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(4);
      });

      it('should use default limit of 50', async () => {
        // Create 60 notes
        const manyNotes = [];
        for (let i = 0; i < 60; i++) {
          manyNotes.push({
            userId: testUserId,
            title: `Note ${i}`,
            body: `Body ${i}`,
          });
        }
        await Note.create(manyNotes);

        const { notes, total } = await Note.searchNotes(testUserId);

        expect(notes).toHaveLength(50); // Default limit
        expect(total).toBe(64); // 60 new + 4 from beforeEach
      });
    });

    describe('Text search', () => {
      it('should find notes by title text', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          q: 'Meeting',
          status: 'all',
        });

        expect(total).toBeGreaterThanOrEqual(1);
        expect(notes.some(n => n.title.toLowerCase().includes('meeting'))).toBe(true);
      });

      it('should find notes by body text', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          q: 'timeline',
          status: 'all',
        });

        expect(total).toBeGreaterThanOrEqual(1);
        expect(notes.some(n => n.body.toLowerCase().includes('timeline'))).toBe(true);
      });

      it('should return empty for non-matching search', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          q: 'xyznonexistentterm123',
          status: 'all',
        });

        expect(notes).toHaveLength(0);
        expect(total).toBe(0);
      });

      it('should combine text search with status filter', async () => {
        const { notes, total } = await Note.searchNotes(testUserId, {
          q: 'note',
          status: 'trashed',
        });

        expect(total).toBeGreaterThanOrEqual(1);
        expect(notes.every(n => n.status === 'trashed')).toBe(true);
      });

      it('should ignore empty or whitespace-only queries', async () => {
        const { notes: emptyResult } = await Note.searchNotes(testUserId, {
          q: '',
        });

        const { notes: whitespaceResult } = await Note.searchNotes(testUserId, {
          q: '   ',
        });

        // Should return normal results, not text search results
        expect(emptyResult).toHaveLength(4);
        expect(whitespaceResult).toHaveLength(4);
      });
    });

    describe('User isolation', () => {
      it('should not return notes from other users', async () => {
        const otherUser = await createTestUser();
        await createTestNote(otherUser._id, { title: 'Other user note' });

        const { notes, total } = await Note.searchNotes(testUserId, {
          status: 'all',
        });

        expect(notes.every(n => n.userId.toString() === testUserId.toString())).toBe(true);
        expect(total).toBe(6); // Only our test user's notes
      });
    });
  });

  // ===========================================================================
  // linkFile() TESTS
  // ===========================================================================

  describe('linkFile(fileId)', () => {
    it('should add file to linkedFileIds array', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      expect(note.linkedFileIds).toHaveLength(0);

      await note.linkFile(file._id);

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(1);
      expect(updatedNote.linkedFileIds[0].toString()).toBe(file._id.toString());
    });

    it('should create bidirectional link (file -> note)', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      await note.linkFile(file._id);

      const updatedFile = await File.findById(file._id);
      expect(updatedFile.linkedNoteIds).toContainEqual(note._id);
    });

    it('should not duplicate file if already linked', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      await note.linkFile(file._id);
      await note.linkFile(file._id); // Link again

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(1); // Still only 1
    });

    it('should return the note after linking', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      const result = await note.linkFile(file._id);

      expect(result._id.toString()).toBe(note._id.toString());
      expect(result.linkedFileIds).toHaveLength(1);
    });

    it('should link multiple files', async () => {
      const note = await createTestNote(testUserId);
      const file1 = await createTestFile(testUserId, { originalName: 'File1.pdf' });
      const file2 = await createTestFile(testUserId, { originalName: 'File2.pdf' });
      const file3 = await createTestFile(testUserId, { originalName: 'File3.pdf' });

      await note.linkFile(file1._id);
      await note.linkFile(file2._id);
      await note.linkFile(file3._id);

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(3);
    });
  });

  // ===========================================================================
  // unlinkFile() TESTS
  // ===========================================================================

  describe('unlinkFile(fileId)', () => {
    it('should remove file from linkedFileIds array', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      await note.linkFile(file._id);
      expect(note.linkedFileIds).toHaveLength(1);

      await note.unlinkFile(file._id);

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(0);
    });

    it('should remove bidirectional link (file -> note)', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      await note.linkFile(file._id);
      await note.unlinkFile(file._id);

      const updatedFile = await File.findById(file._id);
      expect(updatedFile.linkedNoteIds).not.toContainEqual(note._id);
    });

    it('should handle unlinking file that was never linked', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      // Unlink without linking first - should not throw
      await expect(note.unlinkFile(file._id)).resolves.toBeDefined();

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(0);
    });

    it('should return the note after unlinking', async () => {
      const note = await createTestNote(testUserId);
      const file = await createTestFile(testUserId);

      await note.linkFile(file._id);
      const result = await note.unlinkFile(file._id);

      expect(result._id.toString()).toBe(note._id.toString());
    });

    it('should only unlink specified file, keeping others', async () => {
      const note = await createTestNote(testUserId);
      const file1 = await createTestFile(testUserId, { originalName: 'File1.pdf' });
      const file2 = await createTestFile(testUserId, { originalName: 'File2.pdf' });
      const file3 = await createTestFile(testUserId, { originalName: 'File3.pdf' });

      await note.linkFile(file1._id);
      await note.linkFile(file2._id);
      await note.linkFile(file3._id);

      await note.unlinkFile(file2._id);

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote.linkedFileIds).toHaveLength(2);
      expect(updatedNote.linkedFileIds.map(id => id.toString()))
        .not.toContain(file2._id.toString());
      expect(updatedNote.linkedFileIds.map(id => id.toString()))
        .toContain(file1._id.toString());
      expect(updatedNote.linkedFileIds.map(id => id.toString()))
        .toContain(file3._id.toString());
    });
  });

  // ===========================================================================
  // EDGE CASES & SPECIAL SCENARIOS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very long body content', async () => {
      const longBody = 'A'.repeat(100000); // 100KB of text
      const note = await Note.create({
        userId: testUserId,
        title: 'Long body note',
        body: longBody,
      });

      expect(note.body.length).toBe(100000);
    });

    it('should handle Unicode characters in title and body', async () => {
      const note = await Note.create({
        userId: testUserId,
        title: '日本語タイトル 🎉 Émoji Test',
        body: '中文内容 with 日本語 and العربية and emoji 🚀💡🎯',
        tags: ['日本語', 'emoji🎉', 'العربية'],
      });

      expect(note.title).toBe('日本語タイトル 🎉 Émoji Test');
      expect(note.body).toContain('中文内容');
      expect(note.tags).toContain('日本語');
    });

    it('should handle special characters in tags', async () => {
      const note = await Note.create({
        userId: testUserId,
        title: 'Special tags note',
        tags: ['c++', 'node.js', '#hashtag', '@mention'],
      });

      expect(note.tags).toContain('c++');
      expect(note.tags).toContain('node.js');
    });

    it('should handle empty string title and body', async () => {
      const note = await Note.create({
        userId: testUserId,
        title: '',
        body: '',
      });

      expect(note.title).toBe('');
      expect(note.body).toBe('');
    });

    it('should preserve note state through multiple updates', async () => {
      const note = await Note.create({
        userId: testUserId,
        title: 'Original Title',
        body: 'Original body',
        tags: ['original'],
      });

      // Update 1: Change title
      note.title = 'Updated Title';
      await note.save();

      // Update 2: Add tags
      note.tags.push('updated');
      await note.save();

      // Update 3: Change status
      note.status = 'archived';
      await note.save();

      const finalNote = await Note.findById(note._id);
      expect(finalNote.title).toBe('Updated Title');
      expect(finalNote.body).toBe('Original body');
      expect(finalNote.tags).toContain('original');
      expect(finalNote.tags).toContain('updated');
      expect(finalNote.status).toBe('archived');
    });
  });
});
