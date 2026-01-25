/**
 * =============================================================================
 * PROJECT MODEL TESTS
 * =============================================================================
 *
 * Tests for Project model static and instance methods:
 * - searchProjects(userId, options) - Query building
 * - getUpcoming(userId, days) - Date filtering
 * - getOverdue(userId) - Past date detection
 * - getUserTags(userId) - Aggregation
 * - calculateProgress() - Task completion percentage
 * - updateProgress() - Saves progress
 * - linkNote/unlinkNote(noteId) - Bidirectional
 * - linkTask/unlinkTask(taskId) - Includes progress recalc
 * - linkEvent/unlinkEvent(eventId) - Bidirectional
 * - linkFile/unlinkFile(fileId) - Uses $addToSet
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import Project from './Project.js';
import Task from './Task.js';
import Note from './Note.js';
import Event from './Event.js';
import File from './File.js';
import User from './User.js';
import LifeArea from './LifeArea.js';

describe('Project Model', () => {
  let testUser;
  let testUserId;

  // Create a test user before each test
  beforeEach(async () => {
    testUser = await User.create({
      email: `projecttest-${Date.now()}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: { displayName: 'Project Tester' }
    });
    testUserId = testUser._id;
  });

  // ==========================================================================
  // toSafeJSON() Tests
  // ==========================================================================

  describe('toSafeJSON()', () => {
    it('should remove __v field from output', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Test Project'
      });

      const safeJson = project.toSafeJSON();

      expect(safeJson.__v).toBeUndefined();
      expect(safeJson._id).toBeDefined();
      expect(safeJson.title).toBe('Test Project');
    });

    it('should preserve all other fields', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Full Project',
        description: 'Project description',
        outcome: 'Desired outcome',
        priority: 'high',
        status: 'active',
        tags: ['important', 'q4'],
        pinned: true
      });

      const safeJson = project.toSafeJSON();

      expect(safeJson.title).toBe('Full Project');
      expect(safeJson.description).toBe('Project description');
      expect(safeJson.outcome).toBe('Desired outcome');
      expect(safeJson.priority).toBe('high');
      expect(safeJson.status).toBe('active');
      expect(safeJson.tags).toEqual(['important', 'q4']);
      expect(safeJson.pinned).toBe(true);
    });
  });

  // ==========================================================================
  // searchProjects() Tests
  // ==========================================================================

  describe('searchProjects(userId, options)', () => {
    let testLifeArea;

    beforeEach(async () => {
      // Create a life area for testing
      testLifeArea = await LifeArea.create({
        userId: testUserId,
        name: 'Work',
        color: '#ff0000'
      });

      // Create a variety of projects for search tests
      await Project.create([
        {
          userId: testUserId,
          title: 'Website Redesign',
          description: 'Complete overhaul of company website',
          priority: 'high',
          status: 'active',
          tags: ['client', 'web'],
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
          lifeAreaId: testLifeArea._id,
          pinned: true
        },
        {
          userId: testUserId,
          title: 'Mobile App Development',
          description: 'Build iOS and Android app',
          priority: 'high',
          status: 'active',
          tags: ['mobile', 'development'],
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month
        },
        {
          userId: testUserId,
          title: 'Q4 Marketing Campaign',
          description: 'Holiday marketing push',
          outcome: 'Increase sales by 20%',
          priority: 'medium',
          status: 'active',
          tags: ['marketing', 'q4']
        },
        {
          userId: testUserId,
          title: 'Completed Project',
          description: 'This was finished',
          priority: 'low',
          status: 'completed',
          tags: ['archived']
        },
        {
          userId: testUserId,
          title: 'On Hold Project',
          description: 'Paused for now',
          priority: 'medium',
          status: 'on_hold',
          tags: ['client']
        }
      ]);
    });

    it('should return all projects for a user with default options', async () => {
      const { projects, total } = await Project.searchProjects(testUserId);

      expect(projects).toHaveLength(5);
      expect(total).toBe(5);
    });

    it('should filter by single status', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        status: 'active'
      });

      expect(projects).toHaveLength(3);
      expect(total).toBe(3);
      expect(projects.every(p => p.status === 'active')).toBe(true);
    });

    it('should filter by array of statuses', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        status: ['active', 'on_hold']
      });

      expect(projects).toHaveLength(4);
      expect(total).toBe(4);
      expect(projects.every(p => ['active', 'on_hold'].includes(p.status))).toBe(true);
    });

    it('should filter by priority', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        priority: 'high'
      });

      expect(projects).toHaveLength(2);
      expect(total).toBe(2);
      expect(projects.every(p => p.priority === 'high')).toBe(true);
    });

    it('should filter by life area', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        lifeAreaId: testLifeArea._id
      });

      expect(projects).toHaveLength(1);
      expect(total).toBe(1);
      expect(projects[0].title).toBe('Website Redesign');
    });

    it('should filter by tags (must have ALL specified tags)', async () => {
      const { projects: clientProjects } = await Project.searchProjects(testUserId, {
        tags: ['client']
      });

      expect(clientProjects).toHaveLength(2);

      const { projects: webClientProjects } = await Project.searchProjects(testUserId, {
        tags: ['client', 'web']
      });

      expect(webClientProjects).toHaveLength(1);
      expect(webClientProjects[0].title).toBe('Website Redesign');
    });

    it('should filter projects with deadlines (hasDeadline: true)', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        hasDeadline: true
      });

      expect(projects).toHaveLength(2);
      expect(total).toBe(2);
      expect(projects.every(p => p.deadline !== null)).toBe(true);
    });

    it('should filter projects without deadlines (hasDeadline: false)', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        hasDeadline: false
      });

      expect(projects).toHaveLength(3);
      expect(total).toBe(3);
      expect(projects.every(p => p.deadline === null)).toBe(true);
    });

    it('should filter by pinned status', async () => {
      const { projects: pinnedProjects } = await Project.searchProjects(testUserId, {
        pinned: true
      });

      expect(pinnedProjects).toHaveLength(1);
      expect(pinnedProjects[0].title).toBe('Website Redesign');

      const { projects: unpinnedProjects } = await Project.searchProjects(testUserId, {
        pinned: false
      });

      expect(unpinnedProjects).toHaveLength(4);
    });

    it('should support pagination with limit and skip', async () => {
      const { projects: firstPage } = await Project.searchProjects(testUserId, {
        limit: 2,
        skip: 0
      });

      const { projects: secondPage } = await Project.searchProjects(testUserId, {
        limit: 2,
        skip: 2
      });

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(2);

      // Pages should have different projects
      const firstPageIds = firstPage.map(p => p._id.toString());
      const secondPageIds = secondPage.map(p => p._id.toString());
      expect(firstPageIds.some(id => secondPageIds.includes(id))).toBe(false);
    });

    it('should sort by specified field (ascending)', async () => {
      const { projects } = await Project.searchProjects(testUserId, {
        sort: 'title',
        pinned: false // Exclude pinned to avoid pinned-first sorting interference
      });

      // Check projects are sorted alphabetically by title
      for (let i = 1; i < projects.length; i++) {
        expect(projects[i].title >= projects[i - 1].title).toBe(true);
      }
    });

    it('should show pinned projects first by default', async () => {
      const { projects } = await Project.searchProjects(testUserId);

      // Pinned project should be first
      expect(projects[0].pinned).toBe(true);
      expect(projects[0].title).toBe('Website Redesign');
    });

    it('should populate lifeAreaId', async () => {
      const { projects } = await Project.searchProjects(testUserId, {
        lifeAreaId: testLifeArea._id
      });

      expect(projects[0].lifeAreaId).toBeDefined();
      expect(projects[0].lifeAreaId.name).toBe('Work');
      expect(projects[0].lifeAreaId.color).toBe('#ff0000');
    });

    it('should ignore "all" status filter', async () => {
      const { projects, total } = await Project.searchProjects(testUserId, {
        status: 'all'
      });

      expect(projects).toHaveLength(5);
      expect(total).toBe(5);
    });

    it('should not return projects from other users', async () => {
      const otherUser = await User.create({
        email: `other-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Project.create({
        userId: otherUser._id,
        title: 'Other User Project'
      });

      const { projects, total } = await Project.searchProjects(testUserId);

      expect(total).toBe(5); // Only original test user's projects
      expect(projects.every(p => p.userId.toString() === testUserId.toString())).toBe(true);
    });
  });

  // ==========================================================================
  // getUpcoming() Tests
  // ==========================================================================

  describe('getUpcoming(userId, days)', () => {
    it('should return projects due within specified days', async () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      const inTenDays = new Date();
      inTenDays.setDate(inTenDays.getDate() + 10);

      await Project.create([
        {
          userId: testUserId,
          title: 'Due soon',
          status: 'active',
          deadline: inThreeDays
        },
        {
          userId: testUserId,
          title: 'Due later',
          status: 'active',
          deadline: inTenDays
        }
      ]);

      const upcomingIn7Days = await Project.getUpcoming(testUserId, 7);

      expect(upcomingIn7Days).toHaveLength(1);
      expect(upcomingIn7Days[0].title).toBe('Due soon');
    });

    it('should default to 7 days if not specified', async () => {
      const inFiveDays = new Date();
      inFiveDays.setDate(inFiveDays.getDate() + 5);

      await Project.create({
        userId: testUserId,
        title: 'Due in 5 days',
        status: 'active',
        deadline: inFiveDays
      });

      const upcoming = await Project.getUpcoming(testUserId);

      expect(upcoming).toHaveLength(1);
    });

    it('should only include active projects', async () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      await Project.create([
        {
          userId: testUserId,
          title: 'Active project',
          status: 'active',
          deadline: inThreeDays
        },
        {
          userId: testUserId,
          title: 'Completed project',
          status: 'completed',
          deadline: inThreeDays
        },
        {
          userId: testUserId,
          title: 'On hold project',
          status: 'on_hold',
          deadline: inThreeDays
        }
      ]);

      const upcoming = await Project.getUpcoming(testUserId, 7);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].title).toBe('Active project');
    });

    it('should not include projects due in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      await Project.create([
        {
          userId: testUserId,
          title: 'Overdue project',
          status: 'active',
          deadline: yesterday
        },
        {
          userId: testUserId,
          title: 'Upcoming project',
          status: 'active',
          deadline: inThreeDays
        }
      ]);

      const upcoming = await Project.getUpcoming(testUserId, 7);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].title).toBe('Upcoming project');
    });

    it('should sort by deadline (earliest first)', async () => {
      const inTwoDays = new Date();
      inTwoDays.setDate(inTwoDays.getDate() + 2);

      const inFiveDays = new Date();
      inFiveDays.setDate(inFiveDays.getDate() + 5);

      const inOneDays = new Date();
      inOneDays.setDate(inOneDays.getDate() + 1);

      await Project.create([
        { userId: testUserId, title: 'Due in 5 days', status: 'active', deadline: inFiveDays },
        { userId: testUserId, title: 'Due in 1 day', status: 'active', deadline: inOneDays },
        { userId: testUserId, title: 'Due in 2 days', status: 'active', deadline: inTwoDays }
      ]);

      const upcoming = await Project.getUpcoming(testUserId, 7);

      expect(upcoming[0].title).toBe('Due in 1 day');
      expect(upcoming[1].title).toBe('Due in 2 days');
      expect(upcoming[2].title).toBe('Due in 5 days');
    });

    it('should populate lifeAreaId', async () => {
      const lifeArea = await LifeArea.create({
        userId: testUserId,
        name: 'Personal',
        color: '#00ff00'
      });

      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      await Project.create({
        userId: testUserId,
        title: 'Project with life area',
        status: 'active',
        deadline: inThreeDays,
        lifeAreaId: lifeArea._id
      });

      const upcoming = await Project.getUpcoming(testUserId, 7);

      expect(upcoming[0].lifeAreaId.name).toBe('Personal');
    });

    it('should return empty array when no upcoming projects', async () => {
      const upcoming = await Project.getUpcoming(testUserId, 7);

      expect(upcoming).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getOverdue() Tests
  // ==========================================================================

  describe('getOverdue(userId)', () => {
    it('should return projects past their deadline', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Project.create({
        userId: testUserId,
        title: 'Overdue project',
        status: 'active',
        deadline: yesterday
      });

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue).toHaveLength(1);
      expect(overdue[0].title).toBe('Overdue project');
    });

    it('should only include active projects', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Project.create([
        {
          userId: testUserId,
          title: 'Active overdue',
          status: 'active',
          deadline: yesterday
        },
        {
          userId: testUserId,
          title: 'Completed overdue',
          status: 'completed',
          deadline: yesterday
        }
      ]);

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue).toHaveLength(1);
      expect(overdue[0].title).toBe('Active overdue');
    });

    it('should not include projects without deadlines', async () => {
      await Project.create({
        userId: testUserId,
        title: 'No deadline project',
        status: 'active'
        // No deadline
      });

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue).toHaveLength(0);
    });

    it('should not include projects with future deadlines', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      await Project.create({
        userId: testUserId,
        title: 'Future project',
        status: 'active',
        deadline: nextWeek
      });

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue).toHaveLength(0);
    });

    it('should sort by deadline (most overdue first)', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Project.create([
        { userId: testUserId, title: 'Yesterday', status: 'active', deadline: yesterday },
        { userId: testUserId, title: 'Week ago', status: 'active', deadline: oneWeekAgo },
        { userId: testUserId, title: '3 days ago', status: 'active', deadline: threeDaysAgo }
      ]);

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue[0].title).toBe('Week ago');
      expect(overdue[1].title).toBe('3 days ago');
      expect(overdue[2].title).toBe('Yesterday');
    });

    it('should populate lifeAreaId', async () => {
      const lifeArea = await LifeArea.create({
        userId: testUserId,
        name: 'Work',
        color: '#0000ff'
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Project.create({
        userId: testUserId,
        title: 'Overdue with area',
        status: 'active',
        deadline: yesterday,
        lifeAreaId: lifeArea._id
      });

      const overdue = await Project.getOverdue(testUserId);

      expect(overdue[0].lifeAreaId.name).toBe('Work');
    });
  });

  // ==========================================================================
  // getUserTags() Tests
  // ==========================================================================

  describe('getUserTags(userId)', () => {
    it('should return all unique tags with counts', async () => {
      await Project.create([
        { userId: testUserId, title: 'P1', tags: ['web', 'client'] },
        { userId: testUserId, title: 'P2', tags: ['web', 'mobile'] },
        { userId: testUserId, title: 'P3', tags: ['web', 'client', 'urgent'] }
      ]);

      const tags = await Project.getUserTags(testUserId);

      expect(tags).toHaveLength(4); // web, client, mobile, urgent

      // web should be most common (3 projects)
      expect(tags[0].tag).toBe('web');
      expect(tags[0].count).toBe(3);

      // client should be second (2 projects)
      expect(tags[1].tag).toBe('client');
      expect(tags[1].count).toBe(2);
    });

    it('should sort by count descending, then alphabetically', async () => {
      await Project.create([
        { userId: testUserId, title: 'P1', tags: ['alpha', 'beta'] },
        { userId: testUserId, title: 'P2', tags: ['alpha', 'gamma'] },
        { userId: testUserId, title: 'P3', tags: ['beta', 'gamma'] }
      ]);

      const tags = await Project.getUserTags(testUserId);

      // All tags have count 2, should be sorted alphabetically
      expect(tags[0].tag).toBe('alpha');
      expect(tags[1].tag).toBe('beta');
      expect(tags[2].tag).toBe('gamma');
    });

    it('should return empty array when no projects', async () => {
      const tags = await Project.getUserTags(testUserId);

      expect(tags).toHaveLength(0);
    });

    it('should return empty array when projects have no tags', async () => {
      await Project.create([
        { userId: testUserId, title: 'P1', tags: [] },
        { userId: testUserId, title: 'P2', tags: [] }
      ]);

      const tags = await Project.getUserTags(testUserId);

      expect(tags).toHaveLength(0);
    });

    it('should not include tags from other users', async () => {
      const otherUser = await User.create({
        email: `other-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Project.create([
        { userId: testUserId, title: 'My project', tags: ['mytag'] },
        { userId: otherUser._id, title: 'Other project', tags: ['othertag'] }
      ]);

      const tags = await Project.getUserTags(testUserId);

      expect(tags).toHaveLength(1);
      expect(tags[0].tag).toBe('mytag');
    });
  });

  // ==========================================================================
  // calculateProgress() Tests
  // ==========================================================================

  describe('calculateProgress()', () => {
    it('should calculate progress from linked tasks', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Project with tasks'
      });

      // Create 4 tasks - 2 done, 2 todo
      const tasks = await Task.create([
        { userId: testUserId, title: 'Task 1', status: 'done' },
        { userId: testUserId, title: 'Task 2', status: 'done' },
        { userId: testUserId, title: 'Task 3', status: 'todo' },
        { userId: testUserId, title: 'Task 4', status: 'in_progress' }
      ]);

      // Link tasks to project
      project.linkedTaskIds = tasks.map(t => t._id);
      await project.save();

      const progress = await project.calculateProgress();

      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it('should return 0% when no tasks linked', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Empty project'
      });

      const progress = await project.calculateProgress();

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should return 100% when all tasks done', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Complete project'
      });

      const tasks = await Task.create([
        { userId: testUserId, title: 'Task 1', status: 'done' },
        { userId: testUserId, title: 'Task 2', status: 'done' },
        { userId: testUserId, title: 'Task 3', status: 'done' }
      ]);

      project.linkedTaskIds = tasks.map(t => t._id);
      await project.save();

      const progress = await project.calculateProgress();

      expect(progress.percentage).toBe(100);
    });

    it('should round percentage to integer', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Project'
      });

      // 1 done out of 3 = 33.33...%
      const tasks = await Task.create([
        { userId: testUserId, title: 'Task 1', status: 'done' },
        { userId: testUserId, title: 'Task 2', status: 'todo' },
        { userId: testUserId, title: 'Task 3', status: 'todo' }
      ]);

      project.linkedTaskIds = tasks.map(t => t._id);
      await project.save();

      const progress = await project.calculateProgress();

      expect(progress.percentage).toBe(33); // Rounded
    });

    it('should update the project progress field', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Project'
      });

      const tasks = await Task.create([
        { userId: testUserId, title: 'Task 1', status: 'done' }
      ]);

      project.linkedTaskIds = tasks.map(t => t._id);
      await project.save();

      await project.calculateProgress();

      expect(project.progress.total).toBe(1);
      expect(project.progress.completed).toBe(1);
      expect(project.progress.percentage).toBe(100);
    });
  });

  // ==========================================================================
  // updateProgress() Tests
  // ==========================================================================

  describe('updateProgress()', () => {
    it('should calculate and save progress', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Project'
      });

      const tasks = await Task.create([
        { userId: testUserId, title: 'Task 1', status: 'done' },
        { userId: testUserId, title: 'Task 2', status: 'todo' }
      ]);

      project.linkedTaskIds = tasks.map(t => t._id);
      await project.save();

      const savedProject = await project.updateProgress();

      // Verify it returns the saved project
      expect(savedProject._id.toString()).toBe(project._id.toString());

      // Verify progress was saved to database
      const refreshedProject = await Project.findById(project._id);
      expect(refreshedProject.progress.total).toBe(2);
      expect(refreshedProject.progress.completed).toBe(1);
      expect(refreshedProject.progress.percentage).toBe(50);
    });
  });

  // ==========================================================================
  // linkNote() and unlinkNote() Tests
  // ==========================================================================

  describe('linkNote(noteId) and unlinkNote(noteId)', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await Note.create({
        userId: testUserId,
        title: 'Test Note',
        body: 'Note content'
      });
    });

    describe('linkNote(noteId)', () => {
      it('should link a note to a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project with note'
        });

        await project.linkNote(testNote._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedNoteIds).toHaveLength(1);
        expect(updatedProject.linkedNoteIds[0].toString()).toBe(testNote._id.toString());
      });

      it('should set projectId on the note (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project with note'
        });

        await project.linkNote(testNote._id);

        const updatedNote = await Note.findById(testNote._id);
        expect(updatedNote.projectId.toString()).toBe(project._id.toString());
      });

      it('should not duplicate if note already linked', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project with note',
          linkedNoteIds: [testNote._id]
        });

        await project.linkNote(testNote._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedNoteIds).toHaveLength(1);
      });

      it('should return the project instance', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        const result = await project.linkNote(testNote._id);

        expect(result._id.toString()).toBe(project._id.toString());
      });
    });

    describe('unlinkNote(noteId)', () => {
      it('should unlink a note from a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedNoteIds: [testNote._id]
        });

        await project.unlinkNote(testNote._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedNoteIds).toHaveLength(0);
      });

      it('should clear projectId on the note (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedNoteIds: [testNote._id]
        });

        await Note.findByIdAndUpdate(testNote._id, { projectId: project._id });

        await project.unlinkNote(testNote._id);

        const updatedNote = await Note.findById(testNote._id);
        expect(updatedNote.projectId).toBeNull();
      });

      it('should return the project instance', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedNoteIds: [testNote._id]
        });

        const result = await project.unlinkNote(testNote._id);

        expect(result._id.toString()).toBe(project._id.toString());
      });
    });
  });

  // ==========================================================================
  // linkTask() and unlinkTask() Tests
  // ==========================================================================

  describe('linkTask(taskId) and unlinkTask(taskId)', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await Task.create({
        userId: testUserId,
        title: 'Test Task',
        status: 'done'
      });
    });

    describe('linkTask(taskId)', () => {
      it('should link a task to a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkTask(testTask._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedTaskIds).toHaveLength(1);
        expect(updatedProject.linkedTaskIds[0].toString()).toBe(testTask._id.toString());
      });

      it('should set projectId on the task (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkTask(testTask._id);

        const updatedTask = await Task.findById(testTask._id);
        expect(updatedTask.projectId.toString()).toBe(project._id.toString());
      });

      it('should recalculate progress after linking', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkTask(testTask._id);

        // testTask is done, so progress should be 100%
        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.progress.total).toBe(1);
        expect(updatedProject.progress.completed).toBe(1);
        expect(updatedProject.progress.percentage).toBe(100);
      });

      it('should not duplicate if task already linked', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedTaskIds: [testTask._id]
        });

        await project.linkTask(testTask._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedTaskIds).toHaveLength(1);
      });
    });

    describe('unlinkTask(taskId)', () => {
      it('should unlink a task from a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedTaskIds: [testTask._id]
        });

        await project.unlinkTask(testTask._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedTaskIds).toHaveLength(0);
      });

      it('should clear projectId on the task (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedTaskIds: [testTask._id]
        });

        await Task.findByIdAndUpdate(testTask._id, { projectId: project._id });

        await project.unlinkTask(testTask._id);

        const updatedTask = await Task.findById(testTask._id);
        expect(updatedTask.projectId).toBeNull();
      });

      it('should recalculate progress after unlinking', async () => {
        const doneTask = await Task.create({
          userId: testUserId,
          title: 'Done task',
          status: 'done'
        });

        const todoTask = await Task.create({
          userId: testUserId,
          title: 'Todo task',
          status: 'todo'
        });

        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedTaskIds: [doneTask._id, todoTask._id],
          progress: { total: 2, completed: 1, percentage: 50 }
        });

        await project.unlinkTask(doneTask._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.progress.total).toBe(1);
        expect(updatedProject.progress.completed).toBe(0);
        expect(updatedProject.progress.percentage).toBe(0);
      });
    });
  });

  // ==========================================================================
  // linkEvent() and unlinkEvent() Tests
  // ==========================================================================

  describe('linkEvent(eventId) and unlinkEvent(eventId)', () => {
    let testEvent;

    beforeEach(async () => {
      testEvent = await Event.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 3600000) // 1 hour later
      });
    });

    describe('linkEvent(eventId)', () => {
      it('should link an event to a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkEvent(testEvent._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedEventIds).toHaveLength(1);
        expect(updatedProject.linkedEventIds[0].toString()).toBe(testEvent._id.toString());
      });

      it('should set projectId on the event (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkEvent(testEvent._id);

        const updatedEvent = await Event.findById(testEvent._id);
        expect(updatedEvent.projectId.toString()).toBe(project._id.toString());
      });

      it('should not duplicate if event already linked', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedEventIds: [testEvent._id]
        });

        await project.linkEvent(testEvent._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedEventIds).toHaveLength(1);
      });
    });

    describe('unlinkEvent(eventId)', () => {
      it('should unlink an event from a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedEventIds: [testEvent._id]
        });

        await project.unlinkEvent(testEvent._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedEventIds).toHaveLength(0);
      });

      it('should clear projectId on the event (bidirectional)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedEventIds: [testEvent._id]
        });

        await Event.findByIdAndUpdate(testEvent._id, { projectId: project._id });

        await project.unlinkEvent(testEvent._id);

        const updatedEvent = await Event.findById(testEvent._id);
        expect(updatedEvent.projectId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // linkFile() and unlinkFile() Tests
  // ==========================================================================

  describe('linkFile(fileId) and unlinkFile(fileId)', () => {
    let testFile;

    beforeEach(async () => {
      testFile = await File.create({
        userId: testUserId,
        filename: 'test-doc.pdf',
        originalName: 'test-doc.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageProvider: 's3',
        storageKey: 'files/test-doc.pdf',
        storageBucket: 'mybrain-test-bucket'
      });
    });

    describe('linkFile(fileId)', () => {
      it('should link a file to a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkFile(testFile._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedFileIds).toHaveLength(1);
        expect(updatedProject.linkedFileIds[0].toString()).toBe(testFile._id.toString());
      });

      it('should add project to file linkedProjectIds (bidirectional with $addToSet)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project'
        });

        await project.linkFile(testFile._id);

        const updatedFile = await File.findById(testFile._id);
        expect(updatedFile.linkedProjectIds).toHaveLength(1);
        expect(updatedFile.linkedProjectIds[0].toString()).toBe(project._id.toString());
      });

      it('should not duplicate if file already linked', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedFileIds: [testFile._id]
        });

        await project.linkFile(testFile._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedFileIds).toHaveLength(1);
      });

      it('should allow file to be linked to multiple projects', async () => {
        const project1 = await Project.create({
          userId: testUserId,
          title: 'Project 1'
        });

        const project2 = await Project.create({
          userId: testUserId,
          title: 'Project 2'
        });

        await project1.linkFile(testFile._id);
        await project2.linkFile(testFile._id);

        const updatedFile = await File.findById(testFile._id);
        expect(updatedFile.linkedProjectIds).toHaveLength(2);
      });
    });

    describe('unlinkFile(fileId)', () => {
      it('should unlink a file from a project', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedFileIds: [testFile._id]
        });

        await project.unlinkFile(testFile._id);

        const updatedProject = await Project.findById(project._id);
        expect(updatedProject.linkedFileIds).toHaveLength(0);
      });

      it('should remove project from file linkedProjectIds (bidirectional with $pull)', async () => {
        const project = await Project.create({
          userId: testUserId,
          title: 'Project',
          linkedFileIds: [testFile._id]
        });

        await File.findByIdAndUpdate(testFile._id, {
          $addToSet: { linkedProjectIds: project._id }
        });

        await project.unlinkFile(testFile._id);

        const updatedFile = await File.findById(testFile._id);
        expect(updatedFile.linkedProjectIds).toHaveLength(0);
      });

      it('should only remove from one project when file linked to multiple', async () => {
        const project1 = await Project.create({
          userId: testUserId,
          title: 'Project 1',
          linkedFileIds: [testFile._id]
        });

        const project2 = await Project.create({
          userId: testUserId,
          title: 'Project 2',
          linkedFileIds: [testFile._id]
        });

        await File.findByIdAndUpdate(testFile._id, {
          linkedProjectIds: [project1._id, project2._id]
        });

        await project1.unlinkFile(testFile._id);

        const updatedFile = await File.findById(testFile._id);
        expect(updatedFile.linkedProjectIds).toHaveLength(1);
        expect(updatedFile.linkedProjectIds[0].toString()).toBe(project2._id.toString());
      });
    });
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('Schema Validation', () => {
    it('should require userId', async () => {
      await expect(Project.create({
        title: 'No user project'
      })).rejects.toThrow();
    });

    it('should require title', async () => {
      await expect(Project.create({
        userId: testUserId
      })).rejects.toThrow();
    });

    it('should enforce title max length', async () => {
      const longTitle = 'a'.repeat(201);

      await expect(Project.create({
        userId: testUserId,
        title: longTitle
      })).rejects.toThrow();
    });

    it('should enforce valid status enum', async () => {
      await expect(Project.create({
        userId: testUserId,
        title: 'Test',
        status: 'invalid_status'
      })).rejects.toThrow();
    });

    it('should enforce valid priority enum', async () => {
      await expect(Project.create({
        userId: testUserId,
        title: 'Test',
        priority: 'invalid_priority'
      })).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const project = await Project.create({
        userId: testUserId,
        title: 'Minimal project'
      });

      expect(project.status).toBe('active');
      expect(project.priority).toBe('medium');
      expect(project.description).toBe('');
      expect(project.outcome).toBe('');
      expect(project.tags).toEqual([]);
      expect(project.linkedNoteIds).toEqual([]);
      expect(project.linkedTaskIds).toEqual([]);
      expect(project.linkedEventIds).toEqual([]);
      expect(project.linkedFileIds).toEqual([]);
      // Progress is a subdocument, check properties individually
      expect(project.progress.total).toBe(0);
      expect(project.progress.completed).toBe(0);
      expect(project.progress.percentage).toBe(0);
      expect(project.pinned).toBe(false);
    });
  });
});
