/**
 * =============================================================================
 * TASKSERVICE.TEST.JS - Task Service Unit Tests
 * =============================================================================
 *
 * This file contains comprehensive unit tests for the taskService module.
 * Tests cover all CRUD operations, task lifecycle, comments, linking,
 * and special views like Today.
 *
 * TEST STRUCTURE:
 * - createTask(): Task creation with various inputs
 * - getTasks(): Task listing, filtering, and pagination
 * - getTaskById(): Single task retrieval with authorization
 * - updateTask(): Task updates including status transitions
 * - updateTaskStatus(): Quick status change method
 * - deleteTask(): Permanent deletion with link cleanup
 * - getTodayView(): Today view aggregation
 * - linkNote/unlinkNote(): Note linking operations
 * - getTaskBacklinks(): Backlink retrieval
 * - getUserTaskTags(): Tag aggregation
 * - archiveTask/unarchiveTask(): Archive lifecycle
 * - trashTask/restoreTask(): Trash lifecycle
 * - addComment/updateComment/deleteComment(): Comment operations
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import taskService from './taskService.js';
import Task from '../models/Task.js';
import Note from '../models/Note.js';
import Link from '../models/Link.js';
import Tag from '../models/Tag.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a valid MongoDB ObjectId for testing
 */
const createObjectId = () => new mongoose.Types.ObjectId();

/**
 * Creates a test user ID
 */
const createUserId = () => createObjectId();

/**
 * Creates a date at a specific offset from now in UTC
 * The Task model's getTodayTasks uses UTC date boundaries, so we need
 * to create dates that align with those boundaries for consistent testing.
 * @param {number} daysOffset - Days from today (negative for past)
 */
const createDate = (daysOffset = 0) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Create date at UTC midnight for consistency with Task model
  const date = new Date(Date.UTC(year, month, day + daysOffset, 12, 0, 0, 0));
  return date;
};

// =============================================================================
// TEST SUITE: createTask()
// =============================================================================

describe('taskService', () => {
  describe('createTask()', () => {
    const userId = createUserId();

    it('should create a task with valid data', async () => {
      const taskData = {
        title: 'Test Task',
        body: 'This is a test task description',
        priority: 'high',
        status: 'todo',
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task).toBeDefined();
      expect(task._id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.body).toBe('This is a test task description');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('todo');
      expect(task.userId.toString()).toBe(userId.toString());
    });

    it('should create a task with minimal data (title only)', async () => {
      const taskData = {
        title: 'Minimal Task',
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task).toBeDefined();
      expect(task.title).toBe('Minimal Task');
      expect(task.body).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
    });

    it('should apply default values for optional fields', async () => {
      const task = await taskService.createTask(userId, { title: 'Defaults Test' });

      expect(task.body).toBe('');
      expect(task.location).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.tags).toEqual([]);
      expect(task.linkedNoteIds).toEqual([]);
      expect(task.sourceNoteId).toBeNull();
      expect(task.lifeAreaId).toBeNull();
      expect(task.projectId).toBeNull();
    });

    it('should create a task with a due date', async () => {
      const dueDate = createDate(7); // 7 days from now
      const taskData = {
        title: 'Task with due date',
        dueDate,
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.dueDate).toBeDefined();
      expect(new Date(task.dueDate).toDateString()).toBe(dueDate.toDateString());
    });

    it('should create a task with tags', async () => {
      const taskData = {
        title: 'Tagged Task',
        tags: ['urgent', 'work', 'important'],
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.tags).toEqual(['urgent', 'work', 'important']);
    });

    it('should create a task with a life area', async () => {
      const lifeAreaId = createObjectId();
      const taskData = {
        title: 'Categorized Task',
        lifeAreaId,
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.lifeAreaId.toString()).toBe(lifeAreaId.toString());
    });

    it('should handle empty tags array gracefully', async () => {
      const taskData = {
        title: 'No Tags Task',
        tags: [],
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.tags).toEqual([]);
    });

    it('should reject task without title', async () => {
      const taskData = {
        body: 'Body without title',
      };

      await expect(taskService.createTask(userId, taskData)).rejects.toThrow();
    });

    it('should create task with all priority levels', async () => {
      const priorities = ['low', 'medium', 'high'];

      for (const priority of priorities) {
        const task = await taskService.createTask(userId, {
          title: `${priority} priority task`,
          priority,
        });
        expect(task.priority).toBe(priority);
      }
    });

    it('should create task with location', async () => {
      const taskData = {
        title: 'Location Task',
        location: 'Office - Room 302',
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.location).toBe('Office - Room 302');
    });

    it('should create task with linked note IDs', async () => {
      const noteId1 = createObjectId();
      const noteId2 = createObjectId();

      const taskData = {
        title: 'Task with linked notes',
        linkedNoteIds: [noteId1, noteId2],
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.linkedNoteIds).toHaveLength(2);
      expect(task.linkedNoteIds.map(id => id.toString())).toContain(noteId1.toString());
      expect(task.linkedNoteIds.map(id => id.toString())).toContain(noteId2.toString());
    });

    it('should create task with source note ID', async () => {
      const sourceNoteId = createObjectId();

      const taskData = {
        title: 'Converted from note',
        sourceNoteId,
      };

      const task = await taskService.createTask(userId, taskData);

      expect(task.sourceNoteId.toString()).toBe(sourceNoteId.toString());
    });
  });

  // =============================================================================
  // TEST SUITE: getTasks()
  // =============================================================================

  describe('getTasks()', () => {
    const userId = createUserId();

    beforeEach(async () => {
      // Create test tasks
      await taskService.createTask(userId, {
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        tags: ['work'],
      });

      await taskService.createTask(userId, {
        title: 'Task 2',
        status: 'in_progress',
        priority: 'medium',
        tags: ['personal'],
      });

      await taskService.createTask(userId, {
        title: 'Task 3',
        status: 'done',
        priority: 'low',
        tags: ['work', 'urgent'],
      });
    });

    it('should return all tasks for user', async () => {
      const result = await taskService.getTasks(userId);

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBe(3);
    });

    it('should filter tasks by status', async () => {
      const result = await taskService.getTasks(userId, { status: 'todo' });

      expect(result.tasks.every(t => t.status === 'todo')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const result = await taskService.getTasks(userId, { priority: 'high' });

      expect(result.tasks.every(t => t.priority === 'high')).toBe(true);
    });

    it('should filter tasks by tags', async () => {
      const result = await taskService.getTasks(userId, { tags: ['work'] });

      expect(result.tasks.every(t => t.tags.includes('work'))).toBe(true);
    });

    it('should return correct total count', async () => {
      const result = await taskService.getTasks(userId);

      expect(result.total).toBe(3);
    });

    it('should limit results', async () => {
      const result = await taskService.getTasks(userId, { limit: 2 });

      expect(result.tasks.length).toBe(2);
    });

    it('should skip results for pagination', async () => {
      const result = await taskService.getTasks(userId, { skip: 1, limit: 10 });

      expect(result.tasks.length).toBe(2);
    });

    it('should return empty array for user with no tasks', async () => {
      const otherUserId = createUserId();
      const result = await taskService.getTasks(otherUserId);

      expect(result.tasks).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by life area', async () => {
      const lifeAreaId = createObjectId();

      // Create task with life area
      await taskService.createTask(userId, {
        title: 'Life Area Task',
        lifeAreaId,
      });

      const result = await taskService.getTasks(userId, { lifeAreaId });

      expect(result.tasks.every(t => t.lifeAreaId?.toString() === lifeAreaId.toString())).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const result = await taskService.getTasks(userId, {
        status: ['todo', 'in_progress'],
      });

      expect(result.tasks.every(t => ['todo', 'in_progress'].includes(t.status))).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: getTaskById()
  // =============================================================================

  describe('getTaskById()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Test Task for getById',
        body: 'This is the body',
      });
      taskId = task._id;
    });

    it('should return task by ID', async () => {
      const task = await taskService.getTaskById(userId, taskId);

      expect(task).toBeDefined();
      expect(task._id.toString()).toBe(taskId.toString());
      expect(task.title).toBe('Test Task for getById');
    });

    it('should return null for non-existent task', async () => {
      const fakeId = createObjectId();
      const task = await taskService.getTaskById(userId, fakeId);

      expect(task).toBeNull();
    });

    it('should return null when user does not own task', async () => {
      const otherUserId = createUserId();
      const task = await taskService.getTaskById(otherUserId, taskId);

      expect(task).toBeNull();
    });

    it('should include all task fields', async () => {
      const task = await taskService.getTaskById(userId, taskId);

      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('body');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });
  });

  // =============================================================================
  // TEST SUITE: updateTask()
  // =============================================================================

  describe('updateTask()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Original Title',
        body: 'Original body',
        status: 'todo',
        priority: 'medium',
        tags: ['original'],
      });
      taskId = task._id;
    });

    it('should update task title', async () => {
      const updated = await taskService.updateTask(userId, taskId, {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.body).toBe('Original body'); // Unchanged
    });

    it('should update task body', async () => {
      const updated = await taskService.updateTask(userId, taskId, {
        body: 'Updated body content',
      });

      expect(updated.body).toBe('Updated body content');
    });

    it('should update task priority', async () => {
      const updated = await taskService.updateTask(userId, taskId, {
        priority: 'high',
      });

      expect(updated.priority).toBe('high');
    });

    it('should update multiple fields at once', async () => {
      const updated = await taskService.updateTask(userId, taskId, {
        title: 'Multi Update',
        body: 'Multi body',
        priority: 'low',
      });

      expect(updated.title).toBe('Multi Update');
      expect(updated.body).toBe('Multi body');
      expect(updated.priority).toBe('low');
    });

    it('should not update immutable fields (_id)', async () => {
      const newId = createObjectId();
      const updated = await taskService.updateTask(userId, taskId, {
        _id: newId,
        title: 'Title Change',
      });

      expect(updated._id.toString()).toBe(taskId.toString());
      expect(updated._id.toString()).not.toBe(newId.toString());
    });

    it('should not update immutable fields (userId)', async () => {
      const newUserId = createUserId();
      const updated = await taskService.updateTask(userId, taskId, {
        userId: newUserId,
        title: 'Title Change',
      });

      expect(updated.userId.toString()).toBe(userId.toString());
    });

    it('should not update immutable fields (createdAt)', async () => {
      const original = await taskService.getTaskById(userId, taskId);
      const newDate = new Date('2020-01-01');

      const updated = await taskService.updateTask(userId, taskId, {
        createdAt: newDate,
        title: 'Title Change',
      });

      expect(updated.createdAt.getTime()).toBe(original.createdAt.getTime());
    });

    it('should return null for non-existent task', async () => {
      const fakeId = createObjectId();
      const result = await taskService.updateTask(userId, fakeId, {
        title: 'New Title',
      });

      expect(result).toBeNull();
    });

    it('should return null when user does not own task', async () => {
      const otherUserId = createUserId();
      const result = await taskService.updateTask(otherUserId, taskId, {
        title: 'Unauthorized Update',
      });

      expect(result).toBeNull();
    });

    // Status transition tests
    describe('status transitions', () => {
      it('should transition from todo to in_progress', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'in_progress',
        });

        expect(updated.status).toBe('in_progress');
        expect(updated.completedAt).toBeNull();
      });

      it('should transition from todo to done and set completedAt', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'done',
        });

        expect(updated.status).toBe('done');
        expect(updated.completedAt).toBeDefined();
        expect(updated.completedAt).toBeInstanceOf(Date);
      });

      it('should transition from in_progress to done and set completedAt', async () => {
        // First, move to in_progress
        await taskService.updateTask(userId, taskId, { status: 'in_progress' });

        // Then, move to done
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'done',
        });

        expect(updated.status).toBe('done');
        expect(updated.completedAt).toBeDefined();
      });

      it('should transition to cancelled and set completedAt', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'cancelled',
        });

        expect(updated.status).toBe('cancelled');
        expect(updated.completedAt).toBeDefined();
      });

      it('should clear completedAt when transitioning from done to todo', async () => {
        // First, mark as done
        await taskService.updateTask(userId, taskId, { status: 'done' });

        // Then, reopen
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'todo',
        });

        expect(updated.status).toBe('todo');
        expect(updated.completedAt).toBeNull();
      });

      it('should clear completedAt when transitioning from done to in_progress', async () => {
        // First, mark as done
        await taskService.updateTask(userId, taskId, { status: 'done' });

        // Then, move to in_progress
        const updated = await taskService.updateTask(userId, taskId, {
          status: 'in_progress',
        });

        expect(updated.status).toBe('in_progress');
        expect(updated.completedAt).toBeNull();
      });
    });

    // Tag update tests
    describe('tag updates', () => {
      it('should update tags', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          tags: ['new', 'tags'],
        });

        expect(updated.tags).toEqual(['new', 'tags']);
      });

      it('should handle empty tags array', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          tags: [],
        });

        expect(updated.tags).toEqual([]);
      });

      it('should replace existing tags', async () => {
        const updated = await taskService.updateTask(userId, taskId, {
          tags: ['completely', 'different'],
        });

        expect(updated.tags).not.toContain('original');
        expect(updated.tags).toEqual(['completely', 'different']);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: updateTaskStatus()
  // =============================================================================

  describe('updateTaskStatus()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Status Test Task',
        status: 'todo',
      });
      taskId = task._id;
    });

    it('should update status to done', async () => {
      const task = await taskService.updateTaskStatus(userId, taskId, 'done');

      expect(task.status).toBe('done');
      expect(task.completedAt).toBeDefined();
    });

    it('should update status to in_progress', async () => {
      const task = await taskService.updateTaskStatus(userId, taskId, 'in_progress');

      expect(task.status).toBe('in_progress');
      expect(task.completedAt).toBeNull();
    });

    it('should update status to cancelled', async () => {
      const task = await taskService.updateTaskStatus(userId, taskId, 'cancelled');

      expect(task.status).toBe('cancelled');
      expect(task.completedAt).toBeDefined();
    });

    it('should clear completedAt when reopening task', async () => {
      // Complete the task first
      await taskService.updateTaskStatus(userId, taskId, 'done');

      // Reopen
      const task = await taskService.updateTaskStatus(userId, taskId, 'todo');

      expect(task.status).toBe('todo');
      expect(task.completedAt).toBeNull();
    });

    it('should return null for non-existent task', async () => {
      const fakeId = createObjectId();
      const result = await taskService.updateTaskStatus(userId, fakeId, 'done');

      expect(result).toBeNull();
    });

    it('should return null when user does not own task', async () => {
      const otherUserId = createUserId();
      const result = await taskService.updateTaskStatus(otherUserId, taskId, 'done');

      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // TEST SUITE: deleteTask()
  // =============================================================================

  describe('deleteTask()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task to Delete',
      });
      taskId = task._id;
    });

    it('should permanently delete a task', async () => {
      const result = await taskService.deleteTask(userId, taskId);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(taskId.toString());

      // Verify task is gone
      const findResult = await taskService.getTaskById(userId, taskId);
      expect(findResult).toBeNull();
    });

    it('should return null for non-existent task', async () => {
      const fakeId = createObjectId();
      const result = await taskService.deleteTask(userId, fakeId);

      expect(result).toBeNull();
    });

    it('should return null when user does not own task', async () => {
      const otherUserId = createUserId();
      const result = await taskService.deleteTask(otherUserId, taskId);

      expect(result).toBeNull();

      // Verify task still exists for original owner
      const task = await taskService.getTaskById(userId, taskId);
      expect(task).toBeDefined();
    });

    it('should clean up links when deleting task', async () => {
      // Create a note
      const note = await Note.create({
        userId,
        title: 'Linked Note',
        content: 'Content',
      });

      // Create a link
      await Link.create({
        userId,
        sourceType: 'task',
        sourceId: taskId,
        targetType: 'note',
        targetId: note._id,
        linkType: 'reference',
      });

      // Delete the task
      await taskService.deleteTask(userId, taskId);

      // Verify link is cleaned up
      const links = await Link.find({
        $or: [
          { sourceId: taskId },
          { targetId: taskId },
        ],
      });

      expect(links.length).toBe(0);
    });
  });

  // =============================================================================
  // TEST SUITE: getTodayView()
  // =============================================================================

  describe('getTodayView()', () => {
    const userId = createUserId();

    beforeEach(async () => {
      // Create overdue task (due yesterday)
      await taskService.createTask(userId, {
        title: 'Overdue Task',
        dueDate: createDate(-1),
        status: 'todo',
      });

      // Create task due today
      await taskService.createTask(userId, {
        title: 'Due Today Task',
        dueDate: createDate(0),
        status: 'todo',
      });

      // Create future task (not in today view)
      await taskService.createTask(userId, {
        title: 'Future Task',
        dueDate: createDate(7),
        status: 'todo',
      });

      // Create completed task (should not appear)
      await taskService.createTask(userId, {
        title: 'Completed Task',
        dueDate: createDate(-1),
        status: 'done',
      });

      // Create unprocessed note for inbox count
      await Note.create({
        userId,
        title: 'Inbox Note',
        content: 'Content',
        processed: false,
        status: 'active',
      });
    });

    it('should return overdue tasks', async () => {
      const view = await taskService.getTodayView(userId);

      expect(view.overdue).toBeDefined();
      expect(Array.isArray(view.overdue)).toBe(true);
      expect(view.overdue.length).toBeGreaterThanOrEqual(1);
      expect(view.overdue.some(t => t.title === 'Overdue Task')).toBe(true);
    });

    it('should return tasks due today', async () => {
      const view = await taskService.getTodayView(userId);

      expect(view.dueToday).toBeDefined();
      expect(Array.isArray(view.dueToday)).toBe(true);
      expect(view.dueToday.some(t => t.title === 'Due Today Task')).toBe(true);
    });

    it('should not include future tasks in overdue or due today', async () => {
      const view = await taskService.getTodayView(userId);

      const allTitles = [
        ...view.overdue.map(t => t.title),
        ...view.dueToday.map(t => t.title),
      ];

      expect(allTitles).not.toContain('Future Task');
    });

    it('should not include completed tasks', async () => {
      const view = await taskService.getTodayView(userId);

      const allTitles = [
        ...view.overdue.map(t => t.title),
        ...view.dueToday.map(t => t.title),
      ];

      expect(allTitles).not.toContain('Completed Task');
    });

    it('should return inbox count', async () => {
      const view = await taskService.getTodayView(userId);

      expect(view.inboxCount).toBeDefined();
      expect(typeof view.inboxCount).toBe('number');
      expect(view.inboxCount).toBeGreaterThanOrEqual(1);
    });

    it('should return zero inbox count when no unprocessed notes', async () => {
      const newUserId = createUserId();
      const view = await taskService.getTodayView(newUserId);

      expect(view.inboxCount).toBe(0);
    });

    it('should return empty arrays for user with no tasks', async () => {
      const newUserId = createUserId();
      const view = await taskService.getTodayView(newUserId);

      expect(view.overdue).toEqual([]);
      expect(view.dueToday).toEqual([]);
    });
  });

  // =============================================================================
  // TEST SUITE: linkNote() / unlinkNote()
  // =============================================================================

  describe('linkNote() / unlinkNote()', () => {
    const userId = createUserId();
    let taskId;
    let noteId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task for Linking',
      });
      taskId = task._id;

      const note = await Note.create({
        userId,
        title: 'Note to Link',
        content: 'Content',
      });
      noteId = note._id;
    });

    describe('linkNote()', () => {
      it('should link a note to a task', async () => {
        const task = await taskService.linkNote(userId, taskId, noteId);

        expect(task).toBeDefined();
        expect(task.linkedNoteIds.map(id => id.toString())).toContain(noteId.toString());
      });

      it('should create bidirectional Link record', async () => {
        await taskService.linkNote(userId, taskId, noteId);

        const link = await Link.findOne({
          sourceType: 'task',
          sourceId: taskId,
          targetType: 'note',
          targetId: noteId,
        });

        expect(link).toBeDefined();
        expect(link.linkType).toBe('reference');
      });

      it('should not duplicate links', async () => {
        await taskService.linkNote(userId, taskId, noteId);
        await taskService.linkNote(userId, taskId, noteId);

        const task = await taskService.getTaskById(userId, taskId);
        const linkedCount = task.linkedNoteIds.filter(
          id => id.toString() === noteId.toString()
        ).length;

        expect(linkedCount).toBe(1);
      });

      it('should return null for non-existent task', async () => {
        const fakeTaskId = createObjectId();
        const result = await taskService.linkNote(userId, fakeTaskId, noteId);

        expect(result).toBeNull();
      });

      it('should return null for non-existent note', async () => {
        const fakeNoteId = createObjectId();
        const result = await taskService.linkNote(userId, taskId, fakeNoteId);

        expect(result).toBeNull();
      });

      it('should return null when user does not own task', async () => {
        const otherUserId = createUserId();
        const result = await taskService.linkNote(otherUserId, taskId, noteId);

        expect(result).toBeNull();
      });

      it('should return null when user does not own note', async () => {
        const otherUserId = createUserId();
        const otherNote = await Note.create({
          userId: otherUserId,
          title: 'Other User Note',
          content: 'Content',
        });

        const result = await taskService.linkNote(userId, taskId, otherNote._id);

        expect(result).toBeNull();
      });
    });

    describe('unlinkNote()', () => {
      beforeEach(async () => {
        await taskService.linkNote(userId, taskId, noteId);
      });

      it('should unlink a note from a task', async () => {
        const task = await taskService.unlinkNote(userId, taskId, noteId);

        expect(task).toBeDefined();
        expect(task.linkedNoteIds.map(id => id.toString())).not.toContain(noteId.toString());
      });

      it('should remove bidirectional Link record', async () => {
        await taskService.unlinkNote(userId, taskId, noteId);

        const link = await Link.findOne({
          sourceType: 'task',
          sourceId: taskId,
          targetType: 'note',
          targetId: noteId,
        });

        expect(link).toBeNull();
      });

      it('should handle unlinking non-linked note gracefully', async () => {
        const otherNoteId = createObjectId();
        const task = await taskService.unlinkNote(userId, taskId, otherNoteId);

        // Should still return the task (no error)
        expect(task).toBeDefined();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: getTaskBacklinks()
  // =============================================================================

  describe('getTaskBacklinks()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task with Backlinks',
      });
      taskId = task._id;
    });

    it('should return empty array when no backlinks exist', async () => {
      const backlinks = await taskService.getTaskBacklinks(userId, taskId);

      expect(backlinks).toEqual([]);
    });

    it('should return backlinks from notes', async () => {
      // Create a note that links to this task
      const note = await Note.create({
        userId,
        title: 'Note linking to task',
        content: 'Content',
      });

      // Create the backlink (note -> task)
      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: note._id,
        targetType: 'task',
        targetId: taskId,
        linkType: 'reference',
      });

      const backlinks = await taskService.getTaskBacklinks(userId, taskId);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceType).toBe('note');
      expect(backlinks[0].source).toBeDefined();
      expect(backlinks[0].source.title).toBe('Note linking to task');
    });

    it('should return backlinks from other tasks', async () => {
      // Create another task that links to this task
      const otherTask = await taskService.createTask(userId, {
        title: 'Task linking to other task',
      });

      // Create the backlink (task -> task)
      await Link.create({
        userId,
        sourceType: 'task',
        sourceId: otherTask._id,
        targetType: 'task',
        targetId: taskId,
        linkType: 'reference',
      });

      const backlinks = await taskService.getTaskBacklinks(userId, taskId);

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].sourceType).toBe('task');
      expect(backlinks[0].source.title).toBe('Task linking to other task');
    });

    it('should filter out backlinks where source no longer exists', async () => {
      // Create orphaned backlink (source note doesn't exist)
      const fakeNoteId = createObjectId();
      await Link.create({
        userId,
        sourceType: 'note',
        sourceId: fakeNoteId,
        targetType: 'task',
        targetId: taskId,
        linkType: 'reference',
      });

      const backlinks = await taskService.getTaskBacklinks(userId, taskId);

      expect(backlinks).toEqual([]);
    });
  });

  // =============================================================================
  // TEST SUITE: getUserTaskTags()
  // =============================================================================

  describe('getUserTaskTags()', () => {
    const userId = createUserId();

    beforeEach(async () => {
      // Create tasks with various tags
      await taskService.createTask(userId, {
        title: 'Task 1',
        tags: ['work', 'urgent'],
      });

      await taskService.createTask(userId, {
        title: 'Task 2',
        tags: ['work', 'personal'],
      });

      await taskService.createTask(userId, {
        title: 'Task 3',
        tags: ['work'],
      });
    });

    it('should return all unique tags with counts', async () => {
      const tags = await taskService.getUserTaskTags(userId);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should count tags correctly', async () => {
      const tags = await taskService.getUserTaskTags(userId);

      const workTag = tags.find(t => t.tag === 'work');
      expect(workTag).toBeDefined();
      expect(workTag.count).toBe(3);
    });

    it('should sort tags by count descending', async () => {
      const tags = await taskService.getUserTaskTags(userId);

      // First tag should be 'work' with count 3
      expect(tags[0].tag).toBe('work');
      expect(tags[0].count).toBe(3);
    });

    it('should return empty array for user with no tasks', async () => {
      const newUserId = createUserId();
      const tags = await taskService.getUserTaskTags(newUserId);

      expect(tags).toEqual([]);
    });
  });

  // =============================================================================
  // TEST SUITE: archiveTask() / unarchiveTask()
  // =============================================================================

  describe('archiveTask() / unarchiveTask()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task to Archive',
        status: 'done',
      });
      taskId = task._id;
    });

    describe('archiveTask()', () => {
      it('should archive a task', async () => {
        const task = await taskService.archiveTask(userId, taskId);

        expect(task).toBeDefined();
        expect(task.status).toBe('archived');
        expect(task.archivedAt).toBeDefined();
        expect(task.archivedAt).toBeInstanceOf(Date);
      });

      it('should not archive already archived task', async () => {
        await taskService.archiveTask(userId, taskId);
        const task = await taskService.archiveTask(userId, taskId);

        // Should return null because status is already archived
        expect(task).toBeNull();
      });

      it('should not archive trashed task', async () => {
        await taskService.trashTask(userId, taskId);
        const task = await taskService.archiveTask(userId, taskId);

        expect(task).toBeNull();
      });

      it('should return null for non-existent task', async () => {
        const fakeId = createObjectId();
        const result = await taskService.archiveTask(userId, fakeId);

        expect(result).toBeNull();
      });
    });

    describe('unarchiveTask()', () => {
      beforeEach(async () => {
        await taskService.archiveTask(userId, taskId);
      });

      it('should unarchive a task', async () => {
        const task = await taskService.unarchiveTask(userId, taskId);

        expect(task).toBeDefined();
        expect(task.status).toBe('todo');
        expect(task.archivedAt).toBeNull();
      });

      it('should only unarchive archived tasks', async () => {
        // Unarchive first
        await taskService.unarchiveTask(userId, taskId);

        // Try to unarchive non-archived task
        const result = await taskService.unarchiveTask(userId, taskId);

        expect(result).toBeNull();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: trashTask() / restoreTask()
  // =============================================================================

  describe('trashTask() / restoreTask()', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task to Trash',
        status: 'todo',
      });
      taskId = task._id;
    });

    describe('trashTask()', () => {
      it('should trash a task', async () => {
        const task = await taskService.trashTask(userId, taskId);

        expect(task).toBeDefined();
        expect(task.status).toBe('trashed');
        expect(task.trashedAt).toBeDefined();
        expect(task.trashedAt).toBeInstanceOf(Date);
      });

      it('should not trash already trashed task', async () => {
        await taskService.trashTask(userId, taskId);
        const task = await taskService.trashTask(userId, taskId);

        // Should return null because already trashed
        expect(task).toBeNull();
      });

      it('should return null for non-existent task', async () => {
        const fakeId = createObjectId();
        const result = await taskService.trashTask(userId, fakeId);

        expect(result).toBeNull();
      });

      it('should return null when user does not own task', async () => {
        const otherUserId = createUserId();
        const result = await taskService.trashTask(otherUserId, taskId);

        expect(result).toBeNull();
      });
    });

    describe('restoreTask()', () => {
      beforeEach(async () => {
        await taskService.trashTask(userId, taskId);
      });

      it('should restore a trashed task', async () => {
        const task = await taskService.restoreTask(userId, taskId);

        expect(task).toBeDefined();
        expect(task.status).toBe('todo');
        expect(task.trashedAt).toBeNull();
      });

      it('should only restore trashed tasks', async () => {
        // Restore first
        await taskService.restoreTask(userId, taskId);

        // Try to restore non-trashed task
        const result = await taskService.restoreTask(userId, taskId);

        expect(result).toBeNull();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: Task Comments
  // =============================================================================

  describe('Task Comments', () => {
    const userId = createUserId();
    let taskId;

    beforeEach(async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task with Comments',
      });
      taskId = task._id;
    });

    describe('addComment()', () => {
      it('should add a comment to a task', async () => {
        const task = await taskService.addComment(userId, taskId, 'This is a comment');

        expect(task).toBeDefined();
        expect(task.comments).toHaveLength(1);
        expect(task.comments[0].text).toBe('This is a comment');
        expect(task.comments[0].userId.toString()).toBe(userId.toString());
      });

      it('should add multiple comments', async () => {
        await taskService.addComment(userId, taskId, 'First comment');
        await taskService.addComment(userId, taskId, 'Second comment');
        const task = await taskService.addComment(userId, taskId, 'Third comment');

        expect(task.comments).toHaveLength(3);
        expect(task.comments[0].text).toBe('First comment');
        expect(task.comments[1].text).toBe('Second comment');
        expect(task.comments[2].text).toBe('Third comment');
      });

      it('should return null for non-existent task', async () => {
        const fakeId = createObjectId();
        const result = await taskService.addComment(userId, fakeId, 'Comment');

        expect(result).toBeNull();
      });

      it('should return null when user does not own task', async () => {
        const otherUserId = createUserId();
        const result = await taskService.addComment(otherUserId, taskId, 'Comment');

        expect(result).toBeNull();
      });

      it('should include createdAt timestamp on comment', async () => {
        const task = await taskService.addComment(userId, taskId, 'Timestamped comment');

        expect(task.comments[0].createdAt).toBeDefined();
        expect(task.comments[0].createdAt).toBeInstanceOf(Date);
      });
    });

    describe('updateComment()', () => {
      let commentId;

      beforeEach(async () => {
        const task = await taskService.addComment(userId, taskId, 'Original comment');
        commentId = task.comments[0]._id;
      });

      it('should update a comment', async () => {
        const task = await taskService.updateComment(userId, taskId, commentId, 'Updated comment');

        expect(task.comments[0].text).toBe('Updated comment');
      });

      it('should return null for non-existent task', async () => {
        const fakeTaskId = createObjectId();
        const result = await taskService.updateComment(userId, fakeTaskId, commentId, 'New text');

        expect(result).toBeNull();
      });

      it('should return COMMENT_NOT_FOUND for non-existent comment', async () => {
        const fakeCommentId = createObjectId();
        const result = await taskService.updateComment(userId, taskId, fakeCommentId, 'New text');

        expect(result).toEqual({ error: 'COMMENT_NOT_FOUND' });
      });

      it('should return NOT_AUTHORIZED when user does not own comment', async () => {
        const otherUserId = createUserId();

        // Create another task that the other user owns
        const otherTask = await taskService.createTask(otherUserId, {
          title: 'Other Task',
        });

        // Add comment from the other user
        const taskWithComment = await taskService.addComment(otherUserId, otherTask._id, 'Other comment');
        const otherCommentId = taskWithComment.comments[0]._id;

        // Try to update from original user (should fail)
        const result = await taskService.updateComment(userId, otherTask._id, otherCommentId, 'Hacked');

        // Returns null because userId doesn't match task owner
        expect(result).toBeNull();
      });
    });

    describe('deleteComment()', () => {
      let commentId;

      beforeEach(async () => {
        const task = await taskService.addComment(userId, taskId, 'Comment to delete');
        commentId = task.comments[0]._id;
      });

      it('should delete a comment', async () => {
        const task = await taskService.deleteComment(userId, taskId, commentId);

        expect(task.comments).toHaveLength(0);
      });

      it('should return null for non-existent task', async () => {
        const fakeTaskId = createObjectId();
        const result = await taskService.deleteComment(userId, fakeTaskId, commentId);

        expect(result).toBeNull();
      });

      it('should return COMMENT_NOT_FOUND for non-existent comment', async () => {
        const fakeCommentId = createObjectId();
        const result = await taskService.deleteComment(userId, taskId, fakeCommentId);

        expect(result).toEqual({ error: 'COMMENT_NOT_FOUND' });
      });

      it('should only delete the specified comment', async () => {
        // Add more comments
        await taskService.addComment(userId, taskId, 'Second comment');
        let task = await taskService.addComment(userId, taskId, 'Third comment');

        // Delete the first comment
        task = await taskService.deleteComment(userId, taskId, commentId);

        expect(task.comments).toHaveLength(2);
        expect(task.comments.map(c => c.text)).not.toContain('Comment to delete');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: Edge Cases and Error Handling
  // =============================================================================

  describe('Edge Cases and Error Handling', () => {
    const userId = createUserId();

    it('should handle task with very long title', async () => {
      const longTitle = 'A'.repeat(200); // Max is 200 characters

      const task = await taskService.createTask(userId, {
        title: longTitle,
      });

      expect(task.title).toBe(longTitle);
    });

    it('should reject task with title exceeding max length', async () => {
      const tooLongTitle = 'A'.repeat(201);

      await expect(
        taskService.createTask(userId, { title: tooLongTitle })
      ).rejects.toThrow();
    });

    it('should handle special characters in title', async () => {
      const specialTitle = '<script>alert("xss")</script> & "quotes" \'apostrophes\'';

      const task = await taskService.createTask(userId, {
        title: specialTitle,
      });

      expect(task.title).toBe(specialTitle);
    });

    it('should handle unicode characters in title', async () => {
      const unicodeTitle = 'Task with emoji and unicode';

      const task = await taskService.createTask(userId, {
        title: unicodeTitle,
      });

      expect(task.title).toBe(unicodeTitle);
    });

    it('should handle null values gracefully', async () => {
      const task = await taskService.createTask(userId, {
        title: 'Task with nulls',
        body: null,
        dueDate: null,
      });

      expect(task).toBeDefined();
      expect(task.body).toBe('');
      expect(task.dueDate).toBeNull();
    });

    it('should handle concurrent updates', async () => {
      const task = await taskService.createTask(userId, {
        title: 'Concurrent Task',
        priority: 'low',
      });

      // Simulate concurrent updates
      const updates = [
        taskService.updateTask(userId, task._id, { priority: 'high' }),
        taskService.updateTask(userId, task._id, { status: 'in_progress' }),
      ];

      const results = await Promise.all(updates);

      // Both should succeed
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });

    it('should handle invalid ObjectId gracefully', async () => {
      const invalidId = 'not-a-valid-id';

      await expect(
        taskService.getTaskById(userId, invalidId)
      ).rejects.toThrow();
    });
  });

  // =============================================================================
  // TEST SUITE: Project Integration
  // =============================================================================

  describe('Project Integration', () => {
    const userId = createUserId();

    // Note: These tests verify the service behavior when projects are involved.
    // Full project integration tests would require the Project model to be set up.

    it('should create task with projectId', async () => {
      const projectId = createObjectId();

      const task = await taskService.createTask(userId, {
        title: 'Project Task',
        projectId,
      });

      expect(task.projectId.toString()).toBe(projectId.toString());
    });

    it('should filter tasks by projectId', async () => {
      const projectId = createObjectId();

      await taskService.createTask(userId, {
        title: 'Project Task 1',
        projectId,
      });

      await taskService.createTask(userId, {
        title: 'Project Task 2',
        projectId,
      });

      await taskService.createTask(userId, {
        title: 'Non-Project Task',
      });

      const result = await taskService.getTasks(userId, { projectId });

      expect(result.tasks.every(t => t.projectId?.toString() === projectId.toString())).toBe(true);
      expect(result.tasks.length).toBe(2);
    });

    it('should update task projectId', async () => {
      const originalProjectId = createObjectId();
      const newProjectId = createObjectId();

      const task = await taskService.createTask(userId, {
        title: 'Moving Task',
        projectId: originalProjectId,
      });

      const updated = await taskService.updateTask(userId, task._id, {
        projectId: newProjectId,
      });

      expect(updated.projectId.toString()).toBe(newProjectId.toString());
    });

    it('should remove task from project', async () => {
      const projectId = createObjectId();

      const task = await taskService.createTask(userId, {
        title: 'Task to Remove',
        projectId,
      });

      const updated = await taskService.updateTask(userId, task._id, {
        projectId: null,
      });

      expect(updated.projectId).toBeNull();
    });
  });
});
