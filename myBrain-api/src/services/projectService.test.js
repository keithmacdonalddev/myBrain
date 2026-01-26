/**
 * =============================================================================
 * PROJECTSERVICE.TEST.JS - Unit Tests for Project Service
 * =============================================================================
 *
 * Comprehensive tests for all project service operations including:
 * - CRUD operations (create, read, update, delete)
 * - Status transitions and lifecycle management
 * - Item linking (notes, tasks, events)
 * - Progress calculation
 * - Date-based queries (upcoming, overdue)
 * - Comment operations
 *
 * Uses in-memory MongoDB for isolation and real model behavior testing.
 * =============================================================================
 */

import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Event from '../models/Event.js';
import Tag from '../models/Tag.js';
// Import LifeArea to register the model with Mongoose (required for populate)
import '../models/LifeArea.js';
import * as projectService from './projectService.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user ID for ownership testing
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Creates a basic project directly in the database for testing
 */
async function createTestProject(userId, overrides = {}) {
  const defaults = {
    userId,
    title: 'Test Project',
    description: 'A test project description',
    status: 'active',
    priority: 'medium',
    tags: [],
    linkedNoteIds: [],
    linkedTaskIds: [],
    linkedEventIds: [],
    progress: { total: 0, completed: 0, percentage: 0 }
  };
  return Project.create({ ...defaults, ...overrides });
}

/**
 * Creates a test note directly in the database
 */
async function createTestNote(userId, overrides = {}) {
  const defaults = {
    userId,
    title: 'Test Note',
    body: 'Test note content',
    status: 'active'
  };
  return Note.create({ ...defaults, ...overrides });
}

/**
 * Creates a test task directly in the database
 */
async function createTestTask(userId, overrides = {}) {
  const defaults = {
    userId,
    title: 'Test Task',
    status: 'todo',
    priority: 'medium'
  };
  return Task.create({ ...defaults, ...overrides });
}

/**
 * Creates a test event directly in the database
 */
async function createTestEvent(userId, overrides = {}) {
  const defaults = {
    userId,
    title: 'Test Event',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000) // 1 hour later
  };
  return Event.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('ProjectService', () => {
  let userId;

  // Create a fresh user ID for each test
  beforeEach(() => {
    userId = createUserId();
  });

  // =========================================================================
  // createProject()
  // =========================================================================
  describe('createProject()', () => {
    it('should create a project with valid data', async () => {
      const data = {
        title: 'Launch Website',
        description: 'Launch the new company website',
        outcome: 'Website is live and receiving traffic',
        priority: 'high',
        status: 'active'
      };

      const project = await projectService.createProject(userId, data);

      expect(project).toBeDefined();
      expect(project.title).toBe('Launch Website');
      expect(project.description).toBe('Launch the new company website');
      expect(project.outcome).toBe('Website is live and receiving traffic');
      expect(project.priority).toBe('high');
      expect(project.status).toBe('active');
      expect(project.userId.toString()).toBe(userId.toString());
    });

    it('should create a project with minimal data (title only)', async () => {
      const data = { title: 'Minimal Project' };

      const project = await projectService.createProject(userId, data);

      expect(project.title).toBe('Minimal Project');
      expect(project.description).toBe('');
      expect(project.outcome).toBe('');
      expect(project.status).toBe('active'); // Default
      expect(project.priority).toBe('medium'); // Default
      expect(project.pinned).toBe(false); // Default
    });

    it('should create a project with tags', async () => {
      const data = {
        title: 'Tagged Project',
        tags: ['work', 'urgent', 'q1-2026']
      };

      const project = await projectService.createProject(userId, data);

      expect(project.tags).toEqual(['work', 'urgent', 'q1-2026']);
    });

    it('should create a project with deadline', async () => {
      const deadline = new Date('2026-06-30');
      const data = {
        title: 'Deadline Project',
        deadline
      };

      const project = await projectService.createProject(userId, data);

      expect(project.deadline).toEqual(deadline);
    });

    it('should create a pinned project', async () => {
      const data = {
        title: 'Pinned Project',
        pinned: true
      };

      const project = await projectService.createProject(userId, data);

      expect(project.pinned).toBe(true);
    });

    it('should create a project with custom color', async () => {
      const data = {
        title: 'Colored Project',
        color: '#3b82f6'
      };

      const project = await projectService.createProject(userId, data);

      expect(project.color).toBe('#3b82f6');
    });

    it('should initialize progress to zero', async () => {
      const data = { title: 'New Project' };

      const project = await projectService.createProject(userId, data);

      expect(project.progress.total).toBe(0);
      expect(project.progress.completed).toBe(0);
      expect(project.progress.percentage).toBe(0);
    });

    it('should track tag usage when tags are provided', async () => {
      // Create a tag first
      await Tag.create({
        userId,
        name: 'existing-tag',
        usageCount: 5
      });

      const data = {
        title: 'Project with Tags',
        tags: ['existing-tag', 'new-tag']
      };

      await projectService.createProject(userId, data);

      // Check that tag usage was tracked
      const existingTag = await Tag.findOne({ userId, name: 'existing-tag' });
      expect(existingTag.usageCount).toBe(6); // Incremented from 5
    });
  });

  // =========================================================================
  // getProjects()
  // =========================================================================
  describe('getProjects()', () => {
    beforeEach(async () => {
      // Create test projects with various statuses and priorities
      await createTestProject(userId, { title: 'Active High', status: 'active', priority: 'high' });
      await createTestProject(userId, { title: 'Active Medium', status: 'active', priority: 'medium' });
      await createTestProject(userId, { title: 'Completed', status: 'completed', priority: 'low' });
      await createTestProject(userId, { title: 'On Hold', status: 'on_hold', priority: 'high' });
    });

    it('should return all projects for a user', async () => {
      const result = await projectService.getProjects(userId);

      expect(result.projects).toBeDefined();
      expect(result.total).toBe(4);
    });

    it('should filter by status', async () => {
      const result = await projectService.getProjects(userId, { status: 'active' });

      expect(result.projects.length).toBe(2);
      result.projects.forEach(p => {
        expect(p.status).toBe('active');
      });
    });

    it('should filter by priority', async () => {
      const result = await projectService.getProjects(userId, { priority: 'high' });

      expect(result.projects.length).toBe(2);
      result.projects.forEach(p => {
        expect(p.priority).toBe('high');
      });
    });

    it('should filter by multiple statuses', async () => {
      const result = await projectService.getProjects(userId, { status: ['active', 'completed'] });

      expect(result.projects.length).toBe(3);
    });

    it('should paginate results with limit', async () => {
      const result = await projectService.getProjects(userId, { limit: 2 });

      expect(result.projects.length).toBe(2);
      expect(result.total).toBe(4);
    });

    it('should paginate results with skip', async () => {
      const result = await projectService.getProjects(userId, { skip: 2, limit: 10 });

      expect(result.projects.length).toBe(2);
    });

    it('should not return projects from other users', async () => {
      const otherUserId = createUserId();
      await createTestProject(otherUserId, { title: 'Other User Project' });

      const result = await projectService.getProjects(userId);

      expect(result.total).toBe(4);
      result.projects.forEach(p => {
        expect(p.userId.toString()).toBe(userId.toString());
      });
    });

    it('should filter by tags', async () => {
      await createTestProject(userId, { title: 'Tagged Project', tags: ['important', 'work'] });

      const result = await projectService.getProjects(userId, { tags: ['important'] });

      expect(result.projects.length).toBe(1);
      expect(result.projects[0].title).toBe('Tagged Project');
    });

    it('should show pinned projects first', async () => {
      await createTestProject(userId, { title: 'Pinned Project', pinned: true });

      const result = await projectService.getProjects(userId);

      // Pinned project should be first (when not searching)
      expect(result.projects[0].pinned).toBe(true);
    });
  });

  // =========================================================================
  // getProjectById()
  // =========================================================================
  describe('getProjectById()', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId, {
        title: 'Detailed Project',
        description: 'A detailed description'
      });
    });

    it('should return a project by ID', async () => {
      const result = await projectService.getProjectById(userId, project._id);

      expect(result).toBeDefined();
      expect(result.title).toBe('Detailed Project');
      expect(result.description).toBe('A detailed description');
    });

    it('should return null for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await projectService.getProjectById(userId, fakeId);

      expect(result).toBeNull();
    });

    it('should return null for another user project', async () => {
      const otherUserId = createUserId();
      const result = await projectService.getProjectById(otherUserId, project._id);

      expect(result).toBeNull();
    });

    it('should populate linked items when populateLinks=true', async () => {
      // Create and link items
      const note = await createTestNote(userId);
      const task = await createTestTask(userId);
      const event = await createTestEvent(userId);

      await projectService.linkNote(userId, project._id, note._id);
      await projectService.linkTask(userId, project._id, task._id);
      await projectService.linkEvent(userId, project._id, event._id);

      const result = await projectService.getProjectById(userId, project._id, true);

      expect(result.linkedNotes).toBeDefined();
      expect(result.linkedNotes.length).toBe(1);
      expect(result.linkedNotes[0].title).toBe('Test Note');

      expect(result.linkedTasks).toBeDefined();
      expect(result.linkedTasks.length).toBe(1);
      expect(result.linkedTasks[0].title).toBe('Test Task');

      expect(result.linkedEvents).toBeDefined();
      expect(result.linkedEvents.length).toBe(1);
      expect(result.linkedEvents[0].title).toBe('Test Event');
    });

    it('should return only IDs when populateLinks=false', async () => {
      const note = await createTestNote(userId);
      await projectService.linkNote(userId, project._id, note._id);

      const result = await projectService.getProjectById(userId, project._id, false);

      expect(result.linkedNoteIds).toBeDefined();
      expect(result.linkedNoteIds.length).toBe(1);
      expect(result.linkedNotes).toBeUndefined();
    });
  });

  // =========================================================================
  // updateProject()
  // =========================================================================
  describe('updateProject()', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId, {
        title: 'Original Title',
        description: 'Original description',
        priority: 'medium',
        status: 'active'
      });
    });

    it('should update allowed fields', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'high'
      };

      const result = await projectService.updateProject(userId, project._id, updates);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(result.priority).toBe('high');
    });

    it('should not allow updating protected fields', async () => {
      const originalId = project._id.toString();
      const originalUserId = project.userId.toString();

      const updates = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        title: 'Updated Title'
      };

      const result = await projectService.updateProject(userId, project._id, updates);

      expect(result._id.toString()).toBe(originalId);
      expect(result.userId.toString()).toBe(originalUserId);
      expect(result.title).toBe('Updated Title');
    });

    it('should set completedAt when status changes to completed', async () => {
      const result = await projectService.updateProject(userId, project._id, {
        status: 'completed'
      });

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should clear completedAt when status changes from completed', async () => {
      // First complete the project
      await projectService.updateProject(userId, project._id, { status: 'completed' });

      // Then reactivate it
      const result = await projectService.updateProject(userId, project._id, {
        status: 'active'
      });

      expect(result.status).toBe('active');
      expect(result.completedAt).toBeNull();
    });

    it('should return null for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await projectService.updateProject(userId, fakeId, { title: 'New' });

      expect(result).toBeNull();
    });

    it('should return null for another user project', async () => {
      const otherUserId = createUserId();
      const result = await projectService.updateProject(otherUserId, project._id, {
        title: 'Hacked'
      });

      expect(result).toBeNull();

      // Verify original was not changed
      const unchanged = await Project.findById(project._id);
      expect(unchanged.title).toBe('Original Title');
    });

    it('should update deadline', async () => {
      const newDeadline = new Date('2026-12-31');
      const result = await projectService.updateProject(userId, project._id, {
        deadline: newDeadline
      });

      expect(result.deadline).toEqual(newDeadline);
    });

    it('should update pinned status', async () => {
      const result = await projectService.updateProject(userId, project._id, {
        pinned: true
      });

      expect(result.pinned).toBe(true);
    });

    it('should track tag changes', async () => {
      // Create existing tags
      await Tag.create({ userId, name: 'old-tag', usageCount: 3 });
      await Tag.create({ userId, name: 'keep-tag', usageCount: 2 });

      // Update project with initial tags
      // This should increment both old-tag (3->4) and keep-tag (2->3)
      await projectService.updateProject(userId, project._id, {
        tags: ['old-tag', 'keep-tag']
      });

      // Update to new tags (remove old-tag, add new-tag, keep keep-tag)
      // This should decrement old-tag (4->3) and NOT change keep-tag
      await projectService.updateProject(userId, project._id, {
        tags: ['keep-tag', 'new-tag']
      });

      // Check tag counts were updated
      const oldTag = await Tag.findOne({ userId, name: 'old-tag' });
      const keepTag = await Tag.findOne({ userId, name: 'keep-tag' });

      // old-tag: started at 3, +1 (first update added it), -1 (second update removed it) = 3
      expect(oldTag.usageCount).toBe(3);
      // keep-tag: started at 2, +1 (first update added it), kept in second update = 3
      expect(keepTag.usageCount).toBe(3);
    });
  });

  // =========================================================================
  // updateProjectStatus()
  // =========================================================================
  describe('updateProjectStatus()', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId, { status: 'active' });
    });

    it('should update status to completed', async () => {
      const result = await projectService.updateProjectStatus(userId, project._id, 'completed');

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should update status to on_hold', async () => {
      const result = await projectService.updateProjectStatus(userId, project._id, 'on_hold');

      expect(result.status).toBe('on_hold');
      expect(result.completedAt).toBeNull();
    });

    it('should update status to someday', async () => {
      const result = await projectService.updateProjectStatus(userId, project._id, 'someday');

      expect(result.status).toBe('someday');
      expect(result.completedAt).toBeNull();
    });

    it('should clear completedAt when changing from completed to active', async () => {
      // First complete
      await projectService.updateProjectStatus(userId, project._id, 'completed');

      // Then reactivate
      const result = await projectService.updateProjectStatus(userId, project._id, 'active');

      expect(result.status).toBe('active');
      expect(result.completedAt).toBeNull();
    });

    it('should return null for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await projectService.updateProjectStatus(userId, fakeId, 'completed');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // deleteProject()
  // =========================================================================
  describe('deleteProject()', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId, {
        title: 'To Be Deleted',
        tags: ['tag1', 'tag2']
      });
    });

    it('should permanently delete a project', async () => {
      const result = await projectService.deleteProject(userId, project._id);

      expect(result).toBeDefined();
      expect(result.title).toBe('To Be Deleted');

      // Verify it is actually deleted
      const found = await Project.findById(project._id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await projectService.deleteProject(userId, fakeId);

      expect(result).toBeNull();
    });

    it('should return null for another user project', async () => {
      const otherUserId = createUserId();
      const result = await projectService.deleteProject(otherUserId, project._id);

      expect(result).toBeNull();

      // Verify project still exists
      const found = await Project.findById(project._id);
      expect(found).toBeDefined();
    });

    it('should unlink associated notes', async () => {
      const note = await createTestNote(userId);
      await projectService.linkNote(userId, project._id, note._id);

      // Verify note is linked
      let linkedNote = await Note.findById(note._id);
      expect(linkedNote.projectId.toString()).toBe(project._id.toString());

      // Delete project
      await projectService.deleteProject(userId, project._id);

      // Verify note is unlinked (projectId set to null)
      linkedNote = await Note.findById(note._id);
      expect(linkedNote.projectId).toBeNull();
    });

    it('should unlink associated tasks', async () => {
      const task = await createTestTask(userId);
      await projectService.linkTask(userId, project._id, task._id);

      // Verify task is linked
      let linkedTask = await Task.findById(task._id);
      expect(linkedTask.projectId.toString()).toBe(project._id.toString());

      // Delete project
      await projectService.deleteProject(userId, project._id);

      // Verify task is unlinked
      linkedTask = await Task.findById(task._id);
      expect(linkedTask.projectId).toBeNull();
    });

    it('should unlink associated events', async () => {
      const event = await createTestEvent(userId);
      await projectService.linkEvent(userId, project._id, event._id);

      // Verify event is linked
      let linkedEvent = await Event.findById(event._id);
      expect(linkedEvent.projectId.toString()).toBe(project._id.toString());

      // Delete project
      await projectService.deleteProject(userId, project._id);

      // Verify event is unlinked
      linkedEvent = await Event.findById(event._id);
      expect(linkedEvent.projectId).toBeNull();
    });

    it('should decrement tag usage counts', async () => {
      await Tag.create({ userId, name: 'tag1', usageCount: 5 });
      await Tag.create({ userId, name: 'tag2', usageCount: 3 });

      await projectService.deleteProject(userId, project._id);

      const tag1 = await Tag.findOne({ userId, name: 'tag1' });
      const tag2 = await Tag.findOne({ userId, name: 'tag2' });

      expect(tag1.usageCount).toBe(4);
      expect(tag2.usageCount).toBe(2);
    });
  });

  // =========================================================================
  // linkNote() / unlinkNote()
  // =========================================================================
  describe('linkNote() / unlinkNote()', () => {
    let project;
    let note;

    beforeEach(async () => {
      project = await createTestProject(userId);
      note = await createTestNote(userId);
    });

    describe('linkNote()', () => {
      it('should link a note to a project', async () => {
        const result = await projectService.linkNote(userId, project._id, note._id);

        expect(result.linkedNoteIds).toContainEqual(note._id);
      });

      it('should set projectId on the note', async () => {
        await projectService.linkNote(userId, project._id, note._id);

        const updatedNote = await Note.findById(note._id);
        expect(updatedNote.projectId.toString()).toBe(project._id.toString());
      });

      it('should not duplicate when linking same note twice', async () => {
        await projectService.linkNote(userId, project._id, note._id);
        await projectService.linkNote(userId, project._id, note._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedNoteIds.length).toBe(1);
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkNote(userId, fakeId, note._id);

        expect(result).toBeNull();
      });

      it('should return null for non-existent note', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkNote(userId, project._id, fakeId);

        expect(result).toBeNull();
      });

      it('should return null for another user project', async () => {
        const otherUserId = createUserId();
        const result = await projectService.linkNote(otherUserId, project._id, note._id);

        expect(result).toBeNull();
      });

      it('should return null for another user note', async () => {
        const otherUserId = createUserId();
        const otherNote = await createTestNote(otherUserId);
        const result = await projectService.linkNote(userId, project._id, otherNote._id);

        expect(result).toBeNull();
      });
    });

    describe('unlinkNote()', () => {
      beforeEach(async () => {
        await projectService.linkNote(userId, project._id, note._id);
      });

      it('should unlink a note from a project', async () => {
        const result = await projectService.unlinkNote(userId, project._id, note._id);

        expect(result.linkedNoteIds).not.toContainEqual(note._id);
      });

      it('should clear projectId on the note', async () => {
        await projectService.unlinkNote(userId, project._id, note._id);

        const updatedNote = await Note.findById(note._id);
        expect(updatedNote.projectId).toBeNull();
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.unlinkNote(userId, fakeId, note._id);

        expect(result).toBeNull();
      });
    });
  });

  // =========================================================================
  // linkTask() / unlinkTask()
  // =========================================================================
  describe('linkTask() / unlinkTask()', () => {
    let project;
    let task;

    beforeEach(async () => {
      project = await createTestProject(userId);
      task = await createTestTask(userId);
    });

    describe('linkTask()', () => {
      it('should link a task to a project', async () => {
        const result = await projectService.linkTask(userId, project._id, task._id);

        expect(result.linkedTaskIds).toContainEqual(task._id);
      });

      it('should set projectId on the task', async () => {
        await projectService.linkTask(userId, project._id, task._id);

        const updatedTask = await Task.findById(task._id);
        expect(updatedTask.projectId.toString()).toBe(project._id.toString());
      });

      it('should update project progress when task is linked', async () => {
        // Create a completed task
        const completedTask = await createTestTask(userId, { status: 'done' });

        await projectService.linkTask(userId, project._id, completedTask._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.progress.total).toBe(1);
        expect(updatedProject.progress.completed).toBe(1);
        expect(updatedProject.progress.percentage).toBe(100);
      });

      it('should not duplicate when linking same task twice', async () => {
        await projectService.linkTask(userId, project._id, task._id);
        await projectService.linkTask(userId, project._id, task._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedTaskIds.length).toBe(1);
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkTask(userId, fakeId, task._id);

        expect(result).toBeNull();
      });

      it('should return null for non-existent task', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkTask(userId, project._id, fakeId);

        expect(result).toBeNull();
      });
    });

    describe('unlinkTask()', () => {
      beforeEach(async () => {
        await projectService.linkTask(userId, project._id, task._id);
      });

      it('should unlink a task from a project', async () => {
        const result = await projectService.unlinkTask(userId, project._id, task._id);

        expect(result.linkedTaskIds).not.toContainEqual(task._id);
      });

      it('should clear projectId on the task', async () => {
        await projectService.unlinkTask(userId, project._id, task._id);

        const updatedTask = await Task.findById(task._id);
        expect(updatedTask.projectId).toBeNull();
      });

      it('should update project progress when task is unlinked', async () => {
        // Link another task to verify progress recalculation
        const anotherTask = await createTestTask(userId, { status: 'done' });
        await projectService.linkTask(userId, project._id, anotherTask._id);

        // Unlink the first (incomplete) task
        await projectService.unlinkTask(userId, project._id, task._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.progress.total).toBe(1);
        expect(updatedProject.progress.completed).toBe(1);
        expect(updatedProject.progress.percentage).toBe(100);
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.unlinkTask(userId, fakeId, task._id);

        expect(result).toBeNull();
      });
    });
  });

  // =========================================================================
  // linkEvent() / unlinkEvent()
  // =========================================================================
  describe('linkEvent() / unlinkEvent()', () => {
    let project;
    let event;

    beforeEach(async () => {
      project = await createTestProject(userId);
      event = await createTestEvent(userId);
    });

    describe('linkEvent()', () => {
      it('should link an event to a project', async () => {
        const result = await projectService.linkEvent(userId, project._id, event._id);

        expect(result.linkedEventIds).toContainEqual(event._id);
      });

      it('should set projectId on the event', async () => {
        await projectService.linkEvent(userId, project._id, event._id);

        const updatedEvent = await Event.findById(event._id);
        expect(updatedEvent.projectId.toString()).toBe(project._id.toString());
      });

      it('should not duplicate when linking same event twice', async () => {
        await projectService.linkEvent(userId, project._id, event._id);
        await projectService.linkEvent(userId, project._id, event._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedEventIds.length).toBe(1);
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkEvent(userId, fakeId, event._id);

        expect(result).toBeNull();
      });

      it('should return null for non-existent event', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.linkEvent(userId, project._id, fakeId);

        expect(result).toBeNull();
      });
    });

    describe('unlinkEvent()', () => {
      beforeEach(async () => {
        await projectService.linkEvent(userId, project._id, event._id);
      });

      it('should unlink an event from a project', async () => {
        const result = await projectService.unlinkEvent(userId, project._id, event._id);

        expect(result.linkedEventIds).not.toContainEqual(event._id);
      });

      it('should clear projectId on the event', async () => {
        await projectService.unlinkEvent(userId, project._id, event._id);

        const updatedEvent = await Event.findById(event._id);
        expect(updatedEvent.projectId).toBeNull();
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.unlinkEvent(userId, fakeId, event._id);

        expect(result).toBeNull();
      });
    });
  });

  // =========================================================================
  // recalculateProgress()
  // =========================================================================
  describe('recalculateProgress()', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId);
    });

    it('should return 0% for project with no tasks', async () => {
      const result = await projectService.recalculateProgress(project._id);

      expect(result.progress.total).toBe(0);
      expect(result.progress.completed).toBe(0);
      expect(result.progress.percentage).toBe(0);
    });

    it('should calculate progress from task completion', async () => {
      // Create and link 4 tasks, 2 complete
      const task1 = await createTestTask(userId, { status: 'done' });
      const task2 = await createTestTask(userId, { status: 'done' });
      const task3 = await createTestTask(userId, { status: 'todo' });
      const task4 = await createTestTask(userId, { status: 'in_progress' });

      await projectService.linkTask(userId, project._id, task1._id);
      await projectService.linkTask(userId, project._id, task2._id);
      await projectService.linkTask(userId, project._id, task3._id);
      await projectService.linkTask(userId, project._id, task4._id);

      const result = await projectService.recalculateProgress(project._id);

      expect(result.progress.total).toBe(4);
      expect(result.progress.completed).toBe(2);
      expect(result.progress.percentage).toBe(50);
    });

    it('should return 100% when all tasks are complete', async () => {
      const task1 = await createTestTask(userId, { status: 'done' });
      const task2 = await createTestTask(userId, { status: 'done' });

      await projectService.linkTask(userId, project._id, task1._id);
      await projectService.linkTask(userId, project._id, task2._id);

      const result = await projectService.recalculateProgress(project._id);

      expect(result.progress.percentage).toBe(100);
    });

    it('should return null for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await projectService.recalculateProgress(fakeId);

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // onTaskStatusChange()
  // =========================================================================
  describe('onTaskStatusChange()', () => {
    let project;
    let task;

    beforeEach(async () => {
      project = await createTestProject(userId);
      task = await createTestTask(userId, { status: 'todo' });
      await projectService.linkTask(userId, project._id, task._id);
    });

    it('should update project progress when task status changes', async () => {
      // Manually update task status (simulating what a route would do)
      await Task.findByIdAndUpdate(task._id, { status: 'done' });

      await projectService.onTaskStatusChange(task._id);

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject.progress.completed).toBe(1);
      expect(updatedProject.progress.percentage).toBe(100);
    });

    it('should do nothing for task not linked to any project', async () => {
      const unlinkedTask = await createTestTask(userId);

      // Should not throw
      await projectService.onTaskStatusChange(unlinkedTask._id);
    });
  });

  // =========================================================================
  // getUpcomingProjects()
  // =========================================================================
  describe('getUpcomingProjects()', () => {
    beforeEach(async () => {
      const now = new Date();

      // Project with deadline in 3 days
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(now.getDate() + 3);
      await createTestProject(userId, {
        title: 'Due Soon',
        deadline: threeDaysFromNow,
        status: 'active'
      });

      // Project with deadline in 10 days
      const tenDaysFromNow = new Date(now);
      tenDaysFromNow.setDate(now.getDate() + 10);
      await createTestProject(userId, {
        title: 'Due Later',
        deadline: tenDaysFromNow,
        status: 'active'
      });

      // Project with no deadline
      await createTestProject(userId, {
        title: 'No Deadline',
        status: 'active'
      });

      // Completed project with upcoming deadline (should not appear)
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(now.getDate() + 5);
      await createTestProject(userId, {
        title: 'Completed',
        deadline: fiveDaysFromNow,
        status: 'completed'
      });
    });

    it('should return projects with deadlines in next 7 days by default', async () => {
      const result = await projectService.getUpcomingProjects(userId);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Due Soon');
    });

    it('should respect custom days parameter', async () => {
      const result = await projectService.getUpcomingProjects(userId, 14);

      expect(result.length).toBe(2);
    });

    it('should not include completed projects', async () => {
      const result = await projectService.getUpcomingProjects(userId, 30);

      const completedProject = result.find(p => p.title === 'Completed');
      expect(completedProject).toBeUndefined();
    });

    it('should not include projects without deadlines', async () => {
      const result = await projectService.getUpcomingProjects(userId, 30);

      const noDeadlineProject = result.find(p => p.title === 'No Deadline');
      expect(noDeadlineProject).toBeUndefined();
    });

    it('should sort by deadline ascending', async () => {
      const result = await projectService.getUpcomingProjects(userId, 30);

      // First deadline should be earliest
      if (result.length >= 2) {
        expect(result[0].deadline <= result[1].deadline).toBe(true);
      }
    });
  });

  // =========================================================================
  // getOverdueProjects()
  // =========================================================================
  describe('getOverdueProjects()', () => {
    beforeEach(async () => {
      const now = new Date();

      // Project with past deadline (overdue)
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(now.getDate() - 5);
      await createTestProject(userId, {
        title: 'Overdue Project',
        deadline: fiveDaysAgo,
        status: 'active'
      });

      // Completed project with past deadline (not overdue - it's done)
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(now.getDate() - 3);
      await createTestProject(userId, {
        title: 'Completed Past',
        deadline: threeDaysAgo,
        status: 'completed'
      });

      // Project with future deadline (not overdue)
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(now.getDate() + 5);
      await createTestProject(userId, {
        title: 'Future Project',
        deadline: fiveDaysFromNow,
        status: 'active'
      });

      // Project with no deadline (not overdue)
      await createTestProject(userId, {
        title: 'No Deadline',
        status: 'active'
      });
    });

    it('should return projects with past deadlines that are not completed', async () => {
      const result = await projectService.getOverdueProjects(userId);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Overdue Project');
    });

    it('should not include completed projects', async () => {
      const result = await projectService.getOverdueProjects(userId);

      const completedProject = result.find(p => p.title === 'Completed Past');
      expect(completedProject).toBeUndefined();
    });

    it('should not include projects with future deadlines', async () => {
      const result = await projectService.getOverdueProjects(userId);

      const futureProject = result.find(p => p.title === 'Future Project');
      expect(futureProject).toBeUndefined();
    });

    it('should not include projects without deadlines', async () => {
      const result = await projectService.getOverdueProjects(userId);

      const noDeadlineProject = result.find(p => p.title === 'No Deadline');
      expect(noDeadlineProject).toBeUndefined();
    });
  });

  // =========================================================================
  // getUserProjectTags()
  // =========================================================================
  describe('getUserProjectTags()', () => {
    beforeEach(async () => {
      await createTestProject(userId, { title: 'P1', tags: ['work', 'urgent'] });
      await createTestProject(userId, { title: 'P2', tags: ['work', 'home'] });
      await createTestProject(userId, { title: 'P3', tags: ['personal'] });
    });

    it('should return unique tags with counts', async () => {
      const result = await projectService.getUserProjectTags(userId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      const workTag = result.find(t => t.tag === 'work');
      expect(workTag).toBeDefined();
      expect(workTag.count).toBe(2);

      const urgentTag = result.find(t => t.tag === 'urgent');
      expect(urgentTag).toBeDefined();
      expect(urgentTag.count).toBe(1);
    });

    it('should sort tags by count descending', async () => {
      const result = await projectService.getUserProjectTags(userId);

      // 'work' has count 2, should be first
      if (result.length >= 2) {
        expect(result[0].count >= result[1].count).toBe(true);
      }
    });

    it('should only return tags from user projects', async () => {
      const otherUserId = createUserId();
      await createTestProject(otherUserId, { title: 'Other', tags: ['other-tag'] });

      const result = await projectService.getUserProjectTags(userId);

      const otherTag = result.find(t => t.tag === 'other-tag');
      expect(otherTag).toBeUndefined();
    });
  });

  // =========================================================================
  // addComment() / updateComment() / deleteComment()
  // =========================================================================
  describe('Comment operations', () => {
    let project;

    beforeEach(async () => {
      project = await createTestProject(userId);
    });

    describe('addComment()', () => {
      it('should add a comment to a project', async () => {
        const result = await projectService.addComment(userId, project._id, 'Great progress!');

        expect(result.comments.length).toBe(1);
        expect(result.comments[0].text).toBe('Great progress!');
        expect(result.comments[0].userId.toString()).toBe(userId.toString());
      });

      it('should add multiple comments', async () => {
        await projectService.addComment(userId, project._id, 'First comment');
        const result = await projectService.addComment(userId, project._id, 'Second comment');

        expect(result.comments.length).toBe(2);
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.addComment(userId, fakeId, 'Comment');

        expect(result).toBeNull();
      });

      it('should return null for another user project', async () => {
        const otherUserId = createUserId();
        const result = await projectService.addComment(otherUserId, project._id, 'Comment');

        expect(result).toBeNull();
      });
    });

    describe('updateComment()', () => {
      let commentId;

      beforeEach(async () => {
        const updated = await projectService.addComment(userId, project._id, 'Original comment');
        commentId = updated.comments[0]._id;
      });

      it('should update a comment', async () => {
        const result = await projectService.updateComment(
          userId,
          project._id,
          commentId,
          'Updated comment'
        );

        expect(result.comments[0].text).toBe('Updated comment');
      });

      it('should return error for non-existent comment', async () => {
        const fakeCommentId = new mongoose.Types.ObjectId();
        const result = await projectService.updateComment(
          userId,
          project._id,
          fakeCommentId,
          'Updated'
        );

        expect(result.error).toBe('COMMENT_NOT_FOUND');
      });

      it('should return error for unauthorized user', async () => {
        // Add comment from another user
        const otherUserId = createUserId();
        const updated = await Project.findById(project._id);
        updated.comments.push({ userId: otherUserId, text: 'Other user comment' });
        await updated.save();
        const otherCommentId = updated.comments[updated.comments.length - 1]._id;

        // Try to update as original user
        const result = await projectService.updateComment(
          userId,
          project._id,
          otherCommentId,
          'Trying to edit'
        );

        expect(result.error).toBe('NOT_AUTHORIZED');
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.updateComment(userId, fakeId, commentId, 'Updated');

        expect(result).toBeNull();
      });
    });

    describe('deleteComment()', () => {
      let commentId;

      beforeEach(async () => {
        const updated = await projectService.addComment(userId, project._id, 'Comment to delete');
        commentId = updated.comments[0]._id;
      });

      it('should delete a comment', async () => {
        const result = await projectService.deleteComment(userId, project._id, commentId);

        expect(result.comments.length).toBe(0);
      });

      it('should return error for non-existent comment', async () => {
        const fakeCommentId = new mongoose.Types.ObjectId();
        const result = await projectService.deleteComment(userId, project._id, fakeCommentId);

        expect(result.error).toBe('COMMENT_NOT_FOUND');
      });

      it('should return error for unauthorized user', async () => {
        // Add comment from another user
        const otherUserId = createUserId();
        const updated = await Project.findById(project._id);
        updated.comments.push({ userId: otherUserId, text: 'Other user comment' });
        await updated.save();
        const otherCommentId = updated.comments[updated.comments.length - 1]._id;

        // Try to delete as original user
        const result = await projectService.deleteComment(userId, project._id, otherCommentId);

        expect(result.error).toBe('NOT_AUTHORIZED');
      });

      it('should return null for non-existent project', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await projectService.deleteComment(userId, fakeId, commentId);

        expect(result).toBeNull();
      });
    });
  });

  // =========================================================================
  // EDGE CASES & ERROR HANDLING
  // =========================================================================
  describe('Edge cases and error handling', () => {
    it('should handle empty tags array gracefully', async () => {
      const project = await projectService.createProject(userId, {
        title: 'No Tags',
        tags: []
      });

      expect(project.tags).toEqual([]);
    });

    it('should handle undefined optional fields', async () => {
      const project = await projectService.createProject(userId, {
        title: 'Minimal',
        description: undefined,
        outcome: undefined,
        deadline: undefined,
        lifeAreaId: undefined
      });

      expect(project.title).toBe('Minimal');
      expect(project.description).toBe('');
    });

    it('should handle updating project with empty updates object', async () => {
      const project = await createTestProject(userId, { title: 'Original' });

      const result = await projectService.updateProject(userId, project._id, {});

      expect(result.title).toBe('Original');
    });

    it('should handle linking already-linked items gracefully', async () => {
      const project = await createTestProject(userId);
      const note = await createTestNote(userId);

      await projectService.linkNote(userId, project._id, note._id);
      const result = await projectService.linkNote(userId, project._id, note._id);

      // Should succeed but not duplicate
      const updatedProject = await Project.findById(project._id);
      expect(updatedProject.linkedNoteIds.length).toBe(1);
      expect(result).not.toBeNull();
    });

    it('should handle unlinking item that was never linked', async () => {
      const project = await createTestProject(userId);
      const note = await createTestNote(userId);

      // Unlink without ever linking
      const result = await projectService.unlinkNote(userId, project._id, note._id);

      expect(result).not.toBeNull();
      expect(result.linkedNoteIds.length).toBe(0);
    });
  });
});
