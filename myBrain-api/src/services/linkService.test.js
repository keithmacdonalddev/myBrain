/**
 * =============================================================================
 * LINKSERVICE.TEST.JS - Comprehensive Tests for Link Service
 * =============================================================================
 *
 * This test file covers all functions in linkService.js:
 * - createLink: Creates bidirectional link between items
 * - removeLink: Removes a link
 * - getBacklinks: Gets items linking TO this item
 * - getOutgoingLinks: Gets items this item links TO
 * - getAllLinks: Gets all links for an item
 * - deleteEntityLinks: Removes all links when item deleted
 *
 * Test categories:
 * 1. Success cases - Create/remove links
 * 2. Bidirectional - Both directions work
 * 3. Cross-type links - Note to task, task to project, etc.
 * 4. User isolation - Can't link to other users' items
 * 5. Orphan cleanup - Links removed when item deleted
 * 6. Duplicate prevention - Can't create duplicate links
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import '../test/setup.js';
import * as linkService from './linkService.js';
import Link from '../models/Link.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
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
 */
async function createTestNote(userId, overrides = {}) {
  const noteData = {
    userId,
    title: overrides.title || 'Test Note',
    body: overrides.body || 'Test body content',
    tags: overrides.tags || [],
    status: overrides.status || 'active',
    ...overrides
  };

  const note = new Note(noteData);
  await note.save();
  return note;
}

/**
 * Creates a test task directly in the database.
 */
async function createTestTask(userId, overrides = {}) {
  const taskData = {
    userId,
    title: overrides.title || 'Test Task',
    body: overrides.body || 'Test task body',
    status: overrides.status || 'todo',
    ...overrides
  };

  const task = new Task(taskData);
  await task.save();
  return task;
}

/**
 * Creates a test project directly in the database.
 */
async function createTestProject(userId, overrides = {}) {
  const projectData = {
    userId,
    title: overrides.title || 'Test Project',
    description: overrides.description || 'Test project description',
    status: overrides.status || 'active',
    ...overrides
  };

  const project = new Project(projectData);
  await project.save();
  return project;
}

// =============================================================================
// CREATE LINK TESTS
// =============================================================================

describe('linkService', () => {
  describe('createLink', () => {
    it('should create a link between two notes', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source Note' });
      const targetNote = await createTestNote(userId, { title: 'Target Note' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      expect(link).toBeDefined();
      expect(link._id).toBeDefined();
      expect(link.userId.toString()).toBe(userId.toString());
      expect(link.sourceType).toBe('note');
      expect(link.sourceId.toString()).toBe(sourceNote._id.toString());
      expect(link.targetType).toBe('note');
      expect(link.targetId.toString()).toBe(targetNote._id.toString());
      expect(link.linkType).toBe('reference'); // default
    });

    it('should create a link with custom linkType', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      const link = await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'note', id: note._id },
        'converted_from'
      );

      expect(link.linkType).toBe('converted_from');
    });

    it('should create a link with related linkType', async () => {
      const userId = createUserId();
      const note1 = await createTestNote(userId, { title: 'Note 1' });
      const note2 = await createTestNote(userId, { title: 'Note 2' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id },
        'related'
      );

      expect(link.linkType).toBe('related');
    });

    it('should upsert link if it already exists (update linkType)', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create first link
      const firstLink = await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id },
        'reference'
      );

      // Create same link with different linkType
      const secondLink = await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id },
        'related'
      );

      // Should be the same link, just updated
      expect(secondLink._id.toString()).toBe(firstLink._id.toString());
      expect(secondLink.linkType).toBe('related');

      // Verify only one link exists
      const linkCount = await Link.countDocuments({
        sourceId: note._id,
        targetId: task._id
      });
      expect(linkCount).toBe(1);
    });

    it('should not create duplicate links', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create same link multiple times
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // Only one link should exist
      const links = await Link.find({
        sourceId: note._id,
        targetId: task._id
      });
      expect(links.length).toBe(1);
    });

    it('should allow reverse links (different direction)', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create link: note -> task
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // Create reverse link: task -> note
      await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'note', id: note._id }
      );

      // Both links should exist (they are different)
      const links = await Link.find({
        $or: [
          { sourceId: note._id, targetId: task._id },
          { sourceId: task._id, targetId: note._id }
        ]
      });
      expect(links.length).toBe(2);
    });
  });

  // =============================================================================
  // CROSS-TYPE LINKS TESTS
  // =============================================================================

  describe('cross-type links', () => {
    it('should create link from note to task', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      expect(link.sourceType).toBe('note');
      expect(link.targetType).toBe('task');
    });

    it('should create link from task to note', async () => {
      const userId = createUserId();
      const task = await createTestTask(userId, { title: 'Task' });
      const note = await createTestNote(userId, { title: 'Note' });

      const link = await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'note', id: note._id }
      );

      expect(link.sourceType).toBe('task');
      expect(link.targetType).toBe('note');
    });

    it('should create link from note to project', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const project = await createTestProject(userId, { title: 'Project' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'project', id: project._id }
      );

      expect(link.sourceType).toBe('note');
      expect(link.targetType).toBe('project');
    });

    it('should create link from task to project', async () => {
      const userId = createUserId();
      const task = await createTestTask(userId, { title: 'Task' });
      const project = await createTestProject(userId, { title: 'Project' });

      const link = await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'project', id: project._id }
      );

      expect(link.sourceType).toBe('task');
      expect(link.targetType).toBe('project');
    });

    it('should create link between same types (note to note)', async () => {
      const userId = createUserId();
      const note1 = await createTestNote(userId, { title: 'Note 1' });
      const note2 = await createTestNote(userId, { title: 'Note 2' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id }
      );

      expect(link.sourceType).toBe('note');
      expect(link.targetType).toBe('note');
    });

    it('should create link between same types (task to task)', async () => {
      const userId = createUserId();
      const task1 = await createTestTask(userId, { title: 'Task 1' });
      const task2 = await createTestTask(userId, { title: 'Task 2' });

      const link = await linkService.createLink(
        userId,
        { type: 'task', id: task1._id },
        { type: 'task', id: task2._id }
      );

      expect(link.sourceType).toBe('task');
      expect(link.targetType).toBe('task');
    });
  });

  // =============================================================================
  // REMOVE LINK TESTS
  // =============================================================================

  describe('removeLink', () => {
    it('should remove an existing link', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create link
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // Remove link
      const result = await linkService.removeLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      expect(result).toBe(true);

      // Verify link is gone
      const link = await Link.findOne({
        sourceId: note._id,
        targetId: task._id
      });
      expect(link).toBeNull();
    });

    it('should return false when removing non-existent link', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      const result = await linkService.removeLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      expect(result).toBe(false);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create link
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // Remove multiple times
      const result1 = await linkService.removeLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );
      const result2 = await linkService.removeLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should only remove link for correct user (user isolation)', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();
      const note = await createTestNote(userId1, { title: 'User 1 Note' });
      const task = await createTestTask(userId1, { title: 'User 1 Task' });

      // Create link as user 1
      await linkService.createLink(
        userId1,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // Try to remove as user 2
      const result = await linkService.removeLink(
        userId2,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      expect(result).toBe(false);

      // Link should still exist
      const link = await Link.findOne({
        sourceId: note._id,
        targetId: task._id
      });
      expect(link).toBeDefined();
    });

    it('should not affect reverse links when removing', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Note' });
      const task = await createTestTask(userId, { title: 'Task' });

      // Create both directions
      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );
      await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'note', id: note._id }
      );

      // Remove only note -> task
      await linkService.removeLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      // task -> note should still exist
      const reverseLink = await Link.findOne({
        sourceId: task._id,
        targetId: note._id
      });
      expect(reverseLink).toBeDefined();
    });
  });

  // =============================================================================
  // GET BACKLINKS TESTS
  // =============================================================================

  describe('getBacklinks', () => {
    it('should return all links pointing TO a note', async () => {
      const userId = createUserId();
      const targetNote = await createTestNote(userId, { title: 'Target Note' });
      const sourceNote1 = await createTestNote(userId, { title: 'Source Note 1' });
      const sourceNote2 = await createTestNote(userId, { title: 'Source Note 2' });

      // Create links pointing to target
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote1._id },
        { type: 'note', id: targetNote._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote2._id },
        { type: 'note', id: targetNote._id }
      );

      const backlinks = await linkService.getBacklinks(userId, 'note', targetNote._id);

      expect(backlinks.length).toBe(2);
      expect(backlinks[0].source).toBeDefined();
      expect(backlinks[1].source).toBeDefined();
    });

    it('should return backlinks from different entity types', async () => {
      const userId = createUserId();
      const targetNote = await createTestNote(userId, { title: 'Target Note' });
      const sourceNote = await createTestNote(userId, { title: 'Source Note' });
      const sourceTask = await createTestTask(userId, { title: 'Source Task' });

      // Link note -> target
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      // Link task -> target
      await linkService.createLink(
        userId,
        { type: 'task', id: sourceTask._id },
        { type: 'note', id: targetNote._id }
      );

      const backlinks = await linkService.getBacklinks(userId, 'note', targetNote._id);

      expect(backlinks.length).toBe(2);

      const sourceTypes = backlinks.map(b => b.sourceType);
      expect(sourceTypes).toContain('note');
      expect(sourceTypes).toContain('task');
    });

    it('should populate source entity data for notes', async () => {
      const userId = createUserId();
      const targetNote = await createTestNote(userId, { title: 'Target' });
      const sourceNote = await createTestNote(userId, { title: 'Source', body: 'Source body' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      const backlinks = await linkService.getBacklinks(userId, 'note', targetNote._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].source).toBeDefined();
      expect(backlinks[0].source.title).toBe('Source');
      expect(backlinks[0].source.body).toBe('Source body');
    });

    it('should populate source entity data for tasks', async () => {
      const userId = createUserId();
      const targetNote = await createTestNote(userId, { title: 'Target' });
      const sourceTask = await createTestTask(userId, { title: 'Task Title', body: 'Task body' });

      await linkService.createLink(
        userId,
        { type: 'task', id: sourceTask._id },
        { type: 'note', id: targetNote._id }
      );

      const backlinks = await linkService.getBacklinks(userId, 'note', targetNote._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].source).toBeDefined();
      expect(backlinks[0].source.title).toBe('Task Title');
    });

    it('should filter out orphaned links (source deleted)', async () => {
      const userId = createUserId();
      const targetNote = await createTestNote(userId, { title: 'Target' });
      const sourceNote = await createTestNote(userId, { title: 'Source' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      // Delete the source note (orphaning the link)
      await Note.findByIdAndDelete(sourceNote._id);

      const backlinks = await linkService.getBacklinks(userId, 'note', targetNote._id);

      // Should filter out the orphaned link
      expect(backlinks.length).toBe(0);
    });

    it('should return empty array when no backlinks exist', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Lonely Note' });

      const backlinks = await linkService.getBacklinks(userId, 'note', note._id);

      expect(backlinks).toEqual([]);
    });

    it('should not return backlinks from other users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const targetNote = await createTestNote(userId1, { title: 'User 1 Target' });
      const user2Note = await createTestNote(userId2, { title: 'User 2 Note' });

      // Create link as user 2 (this shouldn't be visible to user 1)
      await Link.create({
        userId: userId2,
        sourceType: 'note',
        sourceId: user2Note._id,
        targetType: 'note',
        targetId: targetNote._id,
        linkType: 'reference'
      });

      // Get backlinks as user 1
      const backlinks = await linkService.getBacklinks(userId1, 'note', targetNote._id);

      expect(backlinks.length).toBe(0);
    });
  });

  // =============================================================================
  // GET OUTGOING LINKS TESTS
  // =============================================================================

  describe('getOutgoingLinks', () => {
    it('should return all links FROM a note', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source Note' });
      const targetNote1 = await createTestNote(userId, { title: 'Target Note 1' });
      const targetNote2 = await createTestNote(userId, { title: 'Target Note 2' });

      // Create outgoing links from source
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote1._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote2._id }
      );

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', sourceNote._id);

      expect(outgoing.length).toBe(2);
      expect(outgoing[0].target).toBeDefined();
      expect(outgoing[1].target).toBeDefined();
    });

    it('should return outgoing links to different entity types', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source' });
      const targetNote = await createTestNote(userId, { title: 'Target Note' });
      const targetTask = await createTestTask(userId, { title: 'Target Task' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'task', id: targetTask._id }
      );

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', sourceNote._id);

      expect(outgoing.length).toBe(2);

      const targetTypes = outgoing.map(o => o.targetType);
      expect(targetTypes).toContain('note');
      expect(targetTypes).toContain('task');
    });

    it('should populate target entity data for notes', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source' });
      const targetNote = await createTestNote(userId, { title: 'Target', body: 'Target body' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', sourceNote._id);

      expect(outgoing.length).toBe(1);
      expect(outgoing[0].target).toBeDefined();
      expect(outgoing[0].target.title).toBe('Target');
      expect(outgoing[0].target.body).toBe('Target body');
    });

    it('should populate target entity data for tasks', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source' });
      const targetTask = await createTestTask(userId, { title: 'Task', status: 'in_progress' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'task', id: targetTask._id }
      );

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', sourceNote._id);

      expect(outgoing.length).toBe(1);
      expect(outgoing[0].target).toBeDefined();
      expect(outgoing[0].target.title).toBe('Task');
    });

    it('should filter out orphaned links (target deleted)', async () => {
      const userId = createUserId();
      const sourceNote = await createTestNote(userId, { title: 'Source' });
      const targetNote = await createTestNote(userId, { title: 'Target' });

      await linkService.createLink(
        userId,
        { type: 'note', id: sourceNote._id },
        { type: 'note', id: targetNote._id }
      );

      // Delete the target note
      await Note.findByIdAndDelete(targetNote._id);

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', sourceNote._id);

      expect(outgoing.length).toBe(0);
    });

    it('should return empty array when no outgoing links exist', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'No Links' });

      const outgoing = await linkService.getOutgoingLinks(userId, 'note', note._id);

      expect(outgoing).toEqual([]);
    });

    it('should not return links from other users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const sourceNote = await createTestNote(userId1, { title: 'User 1 Source' });
      const user2Note = await createTestNote(userId2, { title: 'User 2 Note' });

      // Create link as user 2
      await Link.create({
        userId: userId2,
        sourceType: 'note',
        sourceId: sourceNote._id,
        targetType: 'note',
        targetId: user2Note._id,
        linkType: 'reference'
      });

      // Get outgoing as user 1
      const outgoing = await linkService.getOutgoingLinks(userId1, 'note', sourceNote._id);

      expect(outgoing.length).toBe(0);
    });
  });

  // =============================================================================
  // GET ALL LINKS TESTS
  // =============================================================================

  describe('getAllLinks', () => {
    it('should return both backlinks and outgoing links', async () => {
      const userId = createUserId();
      const centralNote = await createTestNote(userId, { title: 'Central' });
      const incomingNote = await createTestNote(userId, { title: 'Incoming' });
      const outgoingNote = await createTestNote(userId, { title: 'Outgoing' });

      // Create incoming link (pointing TO central)
      await linkService.createLink(
        userId,
        { type: 'note', id: incomingNote._id },
        { type: 'note', id: centralNote._id }
      );

      // Create outgoing link (FROM central)
      await linkService.createLink(
        userId,
        { type: 'note', id: centralNote._id },
        { type: 'note', id: outgoingNote._id }
      );

      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'note', centralNote._id);

      expect(backlinks.length).toBe(1);
      expect(outgoing.length).toBe(1);
      expect(backlinks[0].source.title).toBe('Incoming');
      expect(outgoing[0].target.title).toBe('Outgoing');
    });

    it('should return empty arrays when no links exist', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'No Links' });

      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'note', note._id);

      expect(backlinks).toEqual([]);
      expect(outgoing).toEqual([]);
    });

    it('should handle entity with only backlinks', async () => {
      const userId = createUserId();
      const target = await createTestNote(userId, { title: 'Target' });
      const source1 = await createTestNote(userId, { title: 'Source 1' });
      const source2 = await createTestNote(userId, { title: 'Source 2' });

      await linkService.createLink(
        userId,
        { type: 'note', id: source1._id },
        { type: 'note', id: target._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: source2._id },
        { type: 'note', id: target._id }
      );

      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'note', target._id);

      expect(backlinks.length).toBe(2);
      expect(outgoing.length).toBe(0);
    });

    it('should handle entity with only outgoing links', async () => {
      const userId = createUserId();
      const source = await createTestNote(userId, { title: 'Source' });
      const target1 = await createTestNote(userId, { title: 'Target 1' });
      const target2 = await createTestNote(userId, { title: 'Target 2' });

      await linkService.createLink(
        userId,
        { type: 'note', id: source._id },
        { type: 'note', id: target1._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: source._id },
        { type: 'note', id: target2._id }
      );

      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'note', source._id);

      expect(backlinks.length).toBe(0);
      expect(outgoing.length).toBe(2);
    });

    it('should work for tasks', async () => {
      const userId = createUserId();
      const task = await createTestTask(userId, { title: 'Central Task' });
      const note = await createTestNote(userId, { title: 'Note' });

      await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'task', id: task._id }
      );

      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'task', task._id);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].source.title).toBe('Note');
    });
  });

  // =============================================================================
  // DELETE ENTITY LINKS TESTS
  // =============================================================================

  describe('deleteEntityLinks', () => {
    it('should delete all links when entity is deleted (source)', async () => {
      const userId = createUserId();
      const source = await createTestNote(userId, { title: 'Source' });
      const target1 = await createTestNote(userId, { title: 'Target 1' });
      const target2 = await createTestNote(userId, { title: 'Target 2' });

      await linkService.createLink(
        userId,
        { type: 'note', id: source._id },
        { type: 'note', id: target1._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: source._id },
        { type: 'note', id: target2._id }
      );

      const deletedCount = await linkService.deleteEntityLinks(userId, 'note', source._id);

      expect(deletedCount).toBe(2);

      // Verify links are gone
      const remainingLinks = await Link.find({ sourceId: source._id });
      expect(remainingLinks.length).toBe(0);
    });

    it('should delete all links when entity is deleted (target)', async () => {
      const userId = createUserId();
      const target = await createTestNote(userId, { title: 'Target' });
      const source1 = await createTestNote(userId, { title: 'Source 1' });
      const source2 = await createTestNote(userId, { title: 'Source 2' });

      await linkService.createLink(
        userId,
        { type: 'note', id: source1._id },
        { type: 'note', id: target._id }
      );
      await linkService.createLink(
        userId,
        { type: 'note', id: source2._id },
        { type: 'note', id: target._id }
      );

      const deletedCount = await linkService.deleteEntityLinks(userId, 'note', target._id);

      expect(deletedCount).toBe(2);

      // Verify links are gone
      const remainingLinks = await Link.find({ targetId: target._id });
      expect(remainingLinks.length).toBe(0);
    });

    it('should delete both incoming and outgoing links', async () => {
      const userId = createUserId();
      const central = await createTestNote(userId, { title: 'Central' });
      const incoming = await createTestNote(userId, { title: 'Incoming' });
      const outgoing = await createTestNote(userId, { title: 'Outgoing' });

      // Incoming link
      await linkService.createLink(
        userId,
        { type: 'note', id: incoming._id },
        { type: 'note', id: central._id }
      );

      // Outgoing link
      await linkService.createLink(
        userId,
        { type: 'note', id: central._id },
        { type: 'note', id: outgoing._id }
      );

      const deletedCount = await linkService.deleteEntityLinks(userId, 'note', central._id);

      expect(deletedCount).toBe(2);
    });

    it('should return 0 when entity has no links', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'No Links' });

      const deletedCount = await linkService.deleteEntityLinks(userId, 'note', note._id);

      expect(deletedCount).toBe(0);
    });

    it('should only delete links for correct user', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const note1 = await createTestNote(userId1, { title: 'User 1 Note' });
      const note2 = await createTestNote(userId1, { title: 'User 1 Target' });

      // Create link as user 1
      await linkService.createLink(
        userId1,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id }
      );

      // Try to delete as user 2
      const deletedCount = await linkService.deleteEntityLinks(userId2, 'note', note1._id);

      expect(deletedCount).toBe(0);

      // Link should still exist
      const link = await Link.findOne({
        sourceId: note1._id,
        targetId: note2._id
      });
      expect(link).toBeDefined();
    });

    it('should not affect other users links when deleting', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const sharedTargetId = new mongoose.Types.ObjectId();
      const user1Source = await createTestNote(userId1, { title: 'User 1 Source' });
      const user2Source = await createTestNote(userId2, { title: 'User 2 Source' });

      // Create links from both users to same target ID
      await Link.create({
        userId: userId1,
        sourceType: 'note',
        sourceId: user1Source._id,
        targetType: 'note',
        targetId: sharedTargetId,
        linkType: 'reference'
      });

      await Link.create({
        userId: userId2,
        sourceType: 'note',
        sourceId: user2Source._id,
        targetType: 'note',
        targetId: sharedTargetId,
        linkType: 'reference'
      });

      // Delete links for user 1
      await linkService.deleteEntityLinks(userId1, 'note', sharedTargetId);

      // User 2's link should still exist
      const user2Link = await Link.findOne({
        userId: userId2,
        targetId: sharedTargetId
      });
      expect(user2Link).toBeDefined();
    });

    it('should work for different entity types', async () => {
      const userId = createUserId();
      const task = await createTestTask(userId, { title: 'Task' });
      const note = await createTestNote(userId, { title: 'Note' });

      await linkService.createLink(
        userId,
        { type: 'task', id: task._id },
        { type: 'note', id: note._id }
      );

      const deletedCount = await linkService.deleteEntityLinks(userId, 'task', task._id);

      expect(deletedCount).toBe(1);
    });
  });

  // =============================================================================
  // USER ISOLATION TESTS
  // =============================================================================

  describe('user isolation', () => {
    it('should not allow one user to see another users links', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const note1 = await createTestNote(userId1, { title: 'User 1 Note 1' });
      const note2 = await createTestNote(userId1, { title: 'User 1 Note 2' });

      // Create link as user 1
      await linkService.createLink(
        userId1,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id }
      );

      // User 2 should not see user 1's backlinks
      const backlinksUser2 = await linkService.getBacklinks(userId2, 'note', note2._id);
      expect(backlinksUser2.length).toBe(0);

      // User 2 should not see user 1's outgoing links
      const outgoingUser2 = await linkService.getOutgoingLinks(userId2, 'note', note1._id);
      expect(outgoingUser2.length).toBe(0);
    });

    it('should keep links separate between users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const user1Note1 = await createTestNote(userId1, { title: 'U1 Note 1' });
      const user1Note2 = await createTestNote(userId1, { title: 'U1 Note 2' });
      const user2Note1 = await createTestNote(userId2, { title: 'U2 Note 1' });
      const user2Note2 = await createTestNote(userId2, { title: 'U2 Note 2' });

      // Create links for both users
      await linkService.createLink(
        userId1,
        { type: 'note', id: user1Note1._id },
        { type: 'note', id: user1Note2._id }
      );
      await linkService.createLink(
        userId2,
        { type: 'note', id: user2Note1._id },
        { type: 'note', id: user2Note2._id }
      );

      // Each user sees only their own links
      const user1Links = await linkService.getAllLinks(userId1, 'note', user1Note1._id);
      const user2Links = await linkService.getAllLinks(userId2, 'note', user2Note1._id);

      expect(user1Links.outgoing.length).toBe(1);
      expect(user2Links.outgoing.length).toBe(1);

      // Verify targets are correct
      expect(user1Links.outgoing[0].target.title).toBe('U1 Note 2');
      expect(user2Links.outgoing[0].target.title).toBe('U2 Note 2');
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('should handle linking entity to itself', async () => {
      const userId = createUserId();
      const note = await createTestNote(userId, { title: 'Self Link' });

      const link = await linkService.createLink(
        userId,
        { type: 'note', id: note._id },
        { type: 'note', id: note._id }
      );

      expect(link).toBeDefined();
      expect(link.sourceId.toString()).toBe(note._id.toString());
      expect(link.targetId.toString()).toBe(note._id.toString());
    });

    it('should handle multiple link types between same entities', async () => {
      const userId = createUserId();
      const note1 = await createTestNote(userId, { title: 'Note 1' });
      const note2 = await createTestNote(userId, { title: 'Note 2' });

      // Create with 'reference'
      const link1 = await linkService.createLink(
        userId,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id },
        'reference'
      );

      // Update to 'related'
      const link2 = await linkService.createLink(
        userId,
        { type: 'note', id: note1._id },
        { type: 'note', id: note2._id },
        'related'
      );

      // Should be same link ID (upserted)
      expect(link1._id.toString()).toBe(link2._id.toString());

      // linkType should be updated
      const currentLink = await Link.findById(link1._id);
      expect(currentLink.linkType).toBe('related');
    });

    it('should handle non-existent entity IDs gracefully', async () => {
      const userId = createUserId();
      const fakeId = new mongoose.Types.ObjectId();

      // Create link to non-existent entity (link model doesn't validate entity existence)
      const link = await linkService.createLink(
        userId,
        { type: 'note', id: fakeId },
        { type: 'task', id: new mongoose.Types.ObjectId() }
      );

      expect(link).toBeDefined();

      // When trying to get populated links, it should return empty
      const backlinks = await linkService.getBacklinks(userId, 'task', new mongoose.Types.ObjectId());
      expect(backlinks).toEqual([]);
    });

    it('should handle concurrent link creations', async () => {
      const userId = createUserId();
      const source = await createTestNote(userId, { title: 'Source' });
      const target = await createTestNote(userId, { title: 'Target' });

      // Create same link concurrently
      const results = await Promise.all([
        linkService.createLink(userId, { type: 'note', id: source._id }, { type: 'note', id: target._id }),
        linkService.createLink(userId, { type: 'note', id: source._id }, { type: 'note', id: target._id }),
        linkService.createLink(userId, { type: 'note', id: source._id }, { type: 'note', id: target._id })
      ]);

      // All should succeed (upsert behavior)
      expect(results.every(r => r !== null)).toBe(true);

      // Only one link should exist
      const linkCount = await Link.countDocuments({
        sourceId: source._id,
        targetId: target._id
      });
      expect(linkCount).toBe(1);
    });

    it('should handle deleting links for entity with many connections', async () => {
      const userId = createUserId();
      const central = await createTestNote(userId, { title: 'Central' });

      // Create many incoming and outgoing links
      for (let i = 0; i < 10; i++) {
        const incoming = await createTestNote(userId, { title: `Incoming ${i}` });
        const outgoing = await createTestNote(userId, { title: `Outgoing ${i}` });

        await linkService.createLink(
          userId,
          { type: 'note', id: incoming._id },
          { type: 'note', id: central._id }
        );
        await linkService.createLink(
          userId,
          { type: 'note', id: central._id },
          { type: 'note', id: outgoing._id }
        );
      }

      // Verify links exist
      const { backlinks, outgoing } = await linkService.getAllLinks(userId, 'note', central._id);
      expect(backlinks.length).toBe(10);
      expect(outgoing.length).toBe(10);

      // Delete all links
      const deletedCount = await linkService.deleteEntityLinks(userId, 'note', central._id);
      expect(deletedCount).toBe(20);

      // Verify all gone
      const { backlinks: after, outgoing: afterOut } = await linkService.getAllLinks(userId, 'note', central._id);
      expect(after.length).toBe(0);
      expect(afterOut.length).toBe(0);
    });
  });
});
