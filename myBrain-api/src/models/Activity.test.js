/**
 * =============================================================================
 * ACTIVITY MODEL TESTS
 * =============================================================================
 *
 * Tests for Activity model static methods:
 * - getFeed(userId, options) - Get activity feed for user and connections
 * - getUserActivities(userId, viewerId, options) - Get activities by specific user
 * - createActivity(data) - Generic activity creation with privacy check
 * - logProjectCreated(userId, project) - Log project creation
 * - logProjectCompleted(userId, project) - Log project completion
 * - logTaskCompleted(userId, task) - Log task completion
 * - logConnectionMade(userId1, userId2, connectionId) - Log new connection
 * - logItemShared(userId, share, itemTitle) - Log item sharing
 * - cleanupOldActivities(daysToKeep) - Remove old activities
 *
 * Test categories:
 * 1. Activity creation - Each type logged correctly
 * 2. Feed generation - Includes own + connections' activities
 * 3. Filtering - By type, date, user
 * 4. Pagination - Limit/offset
 * 5. Privacy - Only see appropriate activities
 * 6. Cleanup - Old activities removed
 * 7. Metadata - Correct actor, target, timestamps
 *
 * =============================================================================
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Activity from './Activity.js';
import User from './User.js';
import Connection from './Connection.js';

describe('Activity Model', () => {
  let userA;
  let userB;
  let userC;

  // Create test users before each test
  beforeEach(async () => {
    const timestamp = Date.now();

    userA = await User.create({
      email: `usera-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User A',
        firstName: 'Alice',
        lastName: 'Anderson'
      },
      socialSettings: {
        showActivity: true
      }
    });

    userB = await User.create({
      email: `userb-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User B',
        firstName: 'Bob',
        lastName: 'Brown'
      },
      socialSettings: {
        showActivity: true
      }
    });

    userC = await User.create({
      email: `userc-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User C',
        firstName: 'Charlie',
        lastName: 'Chen'
      },
      socialSettings: {
        showActivity: true
      }
    });
  });

  // ==========================================================================
  // createActivity() Tests
  // ==========================================================================

  describe('createActivity(data)', () => {
    it('should create an activity with required fields', async () => {
      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        entitySnapshot: { title: 'Test Project' }
      });

      expect(activity).toBeDefined();
      expect(activity.userId.toString()).toBe(userA._id.toString());
      expect(activity.type).toBe('project_created');
    });

    it('should set default visibility to connections', async () => {
      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity.visibility).toBe('connections');
    });

    it('should accept custom visibility setting', async () => {
      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        visibility: 'public'
      });

      expect(activity.visibility).toBe('public');
    });

    it('should return null if user has showActivity disabled', async () => {
      // Update user to disable activity
      await User.findByIdAndUpdate(userA._id, {
        'socialSettings.showActivity': false
      });

      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity).toBeNull();
    });

    it('should store entitySnapshot correctly', async () => {
      const snapshot = {
        title: 'Test Project',
        description: 'A project description',
        status: 'in_progress'
      };

      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        entitySnapshot: snapshot
      });

      expect(activity.entitySnapshot.title).toBe(snapshot.title);
      expect(activity.entitySnapshot.description).toBe(snapshot.description);
      expect(activity.entitySnapshot.status).toBe(snapshot.status);
    });

    it('should store metadata correctly', async () => {
      const metadata = { taskCount: 5, previousStatus: 'draft' };

      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_completed',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        metadata: metadata
      });

      expect(activity.metadata.taskCount).toBe(5);
      expect(activity.metadata.previousStatus).toBe('draft');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity.createdAt).toBeDefined();
      expect(activity.updatedAt).toBeDefined();
    });

    it('should accept all valid activity types', async () => {
      const validTypes = [
        'project_created',
        'project_updated',
        'project_completed',
        'task_created',
        'task_completed',
        'note_created',
        'note_updated',
        'file_uploaded',
        'connection_made',
        'item_shared',
        'profile_updated',
        'status_updated'
      ];

      for (const type of validTypes) {
        const activity = await Activity.createActivity({
          userId: userA._id,
          type: type,
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project'
        });

        expect(activity.type).toBe(type);
      }
    });

    it('should accept all valid entity types', async () => {
      const validEntityTypes = [
        'project',
        'task',
        'note',
        'file',
        'folder',
        'connection',
        'share',
        'profile'
      ];

      for (const entityType of validEntityTypes) {
        const activity = await Activity.createActivity({
          userId: userA._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: entityType
        });

        expect(activity.entityType).toBe(entityType);
      }
    });

    it('should accept all valid visibility values', async () => {
      const validVisibilities = ['private', 'connections', 'public'];

      for (const visibility of validVisibilities) {
        const activity = await Activity.createActivity({
          userId: userA._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project',
          visibility: visibility
        });

        expect(activity.visibility).toBe(visibility);
      }
    });
  });

  // ==========================================================================
  // logProjectCreated() Tests
  // ==========================================================================

  describe('logProjectCreated(userId, project)', () => {
    it('should create a project_created activity', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        description: 'Project description',
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity).toBeDefined();
      expect(activity.type).toBe('project_created');
      expect(activity.entityId.toString()).toBe(project._id.toString());
      expect(activity.entityType).toBe('project');
    });

    it('should store project title in snapshot', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        description: 'Project description',
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity.entitySnapshot.title).toBe('New Project');
    });

    it('should truncate long descriptions in snapshot', async () => {
      const longDescription = 'a'.repeat(300);
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        description: longDescription,
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity.entitySnapshot.description.length).toBe(200);
    });

    it('should store project status in snapshot', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        description: 'Project description',
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity.entitySnapshot.status).toBe('active');
    });

    it('should set visibility to connections', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity.visibility).toBe('connections');
    });

    it('should return null if user has showActivity disabled', async () => {
      await User.findByIdAndUpdate(userA._id, {
        'socialSettings.showActivity': false
      });

      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'New Project',
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity).toBeNull();
    });
  });

  // ==========================================================================
  // logProjectCompleted() Tests
  // ==========================================================================

  describe('logProjectCompleted(userId, project)', () => {
    it('should create a project_completed activity', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Project'
      };

      const activity = await Activity.logProjectCompleted(userA._id, project);

      expect(activity).toBeDefined();
      expect(activity.type).toBe('project_completed');
      expect(activity.entityId.toString()).toBe(project._id.toString());
      expect(activity.entityType).toBe('project');
    });

    it('should store project title in snapshot', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Project'
      };

      const activity = await Activity.logProjectCompleted(userA._id, project);

      expect(activity.entitySnapshot.title).toBe('Completed Project');
    });

    it('should set status to completed in snapshot', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Project'
      };

      const activity = await Activity.logProjectCompleted(userA._id, project);

      expect(activity.entitySnapshot.status).toBe('completed');
    });

    it('should set visibility to connections', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Project'
      };

      const activity = await Activity.logProjectCompleted(userA._id, project);

      expect(activity.visibility).toBe('connections');
    });
  });

  // ==========================================================================
  // logTaskCompleted() Tests
  // ==========================================================================

  describe('logTaskCompleted(userId, task)', () => {
    it('should create a task_completed activity', async () => {
      const task = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Task'
      };

      const activity = await Activity.logTaskCompleted(userA._id, task);

      expect(activity).toBeDefined();
      expect(activity.type).toBe('task_completed');
      expect(activity.entityId.toString()).toBe(task._id.toString());
      expect(activity.entityType).toBe('task');
    });

    it('should store task title in snapshot', async () => {
      const task = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Task'
      };

      const activity = await Activity.logTaskCompleted(userA._id, task);

      expect(activity.entitySnapshot.title).toBe('Completed Task');
    });

    it('should set status to completed in snapshot', async () => {
      const task = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Task'
      };

      const activity = await Activity.logTaskCompleted(userA._id, task);

      expect(activity.entitySnapshot.status).toBe('completed');
    });

    it('should set visibility to connections', async () => {
      const task = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Completed Task'
      };

      const activity = await Activity.logTaskCompleted(userA._id, task);

      expect(activity.visibility).toBe('connections');
    });
  });

  // ==========================================================================
  // logConnectionMade() Tests
  // ==========================================================================

  describe('logConnectionMade(userId1, userId2, connectionId)', () => {
    it('should create activities for both users', async () => {
      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      const activities = await Activity.find({ entityId: connectionId });

      expect(activities).toHaveLength(2);
    });

    it('should create connection_made activity for first user', async () => {
      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      const activity = await Activity.findOne({
        userId: userA._id,
        entityId: connectionId
      });

      expect(activity).toBeDefined();
      expect(activity.type).toBe('connection_made');
      expect(activity.entityType).toBe('connection');
    });

    it('should create connection_made activity for second user', async () => {
      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      const activity = await Activity.findOne({
        userId: userB._id,
        entityId: connectionId
      });

      expect(activity).toBeDefined();
      expect(activity.type).toBe('connection_made');
      expect(activity.entityType).toBe('connection');
    });

    it('should store other user displayName in snapshot for first user', async () => {
      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      const activity = await Activity.findOne({
        userId: userA._id,
        entityId: connectionId
      });

      expect(activity.entitySnapshot.title).toBe('User B');
    });

    it('should store other user displayName in snapshot for second user', async () => {
      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      const activity = await Activity.findOne({
        userId: userB._id,
        entityId: connectionId
      });

      expect(activity.entitySnapshot.title).toBe('User A');
    });

    it('should fall back to email if displayName not set', async () => {
      // Create user without displayName
      const timestamp = Date.now();
      const userNoName = await User.create({
        email: `noname-${timestamp}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userNoName._id, connectionId);

      const activity = await Activity.findOne({
        userId: userA._id,
        entityId: connectionId
      });

      expect(activity.entitySnapshot.title).toBe(`noname-${timestamp}@example.com`);
    });

    it('should respect showActivity setting for each user', async () => {
      // Disable activity for userB
      await User.findByIdAndUpdate(userB._id, {
        'socialSettings.showActivity': false
      });

      const connectionId = new mongoose.Types.ObjectId();

      await Activity.logConnectionMade(userA._id, userB._id, connectionId);

      // Only userA's activity should be created
      const activities = await Activity.find({ entityId: connectionId });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId.toString()).toBe(userA._id.toString());
    });
  });

  // ==========================================================================
  // logItemShared() Tests
  // ==========================================================================

  describe('logItemShared(userId, share, itemTitle)', () => {
    it('should create an item_shared activity', async () => {
      const share = {
        _id: new mongoose.Types.ObjectId()
      };

      const activity = await Activity.logItemShared(userA._id, share, 'Shared Document');

      expect(activity).toBeDefined();
      expect(activity.type).toBe('item_shared');
      expect(activity.entityId.toString()).toBe(share._id.toString());
      expect(activity.entityType).toBe('share');
    });

    it('should store item title in snapshot', async () => {
      const share = {
        _id: new mongoose.Types.ObjectId()
      };

      const activity = await Activity.logItemShared(userA._id, share, 'Shared Document');

      expect(activity.entitySnapshot.title).toBe('Shared Document');
    });

    it('should set visibility to connections', async () => {
      const share = {
        _id: new mongoose.Types.ObjectId()
      };

      const activity = await Activity.logItemShared(userA._id, share, 'Shared Document');

      expect(activity.visibility).toBe('connections');
    });
  });

  // ==========================================================================
  // getFeed() Tests
  // ==========================================================================

  describe('getFeed(userId, options)', () => {
    beforeEach(async () => {
      // Create connection between A and B
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create activities
      await Activity.create([
        {
          userId: userA._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project',
          entitySnapshot: { title: 'Project A' },
          visibility: 'connections',
          createdAt: new Date(Date.now() - 3000)
        },
        {
          userId: userB._id,
          type: 'task_completed',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'task',
          entitySnapshot: { title: 'Task B' },
          visibility: 'connections',
          createdAt: new Date(Date.now() - 2000)
        },
        {
          userId: userC._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project',
          entitySnapshot: { title: 'Project C' },
          visibility: 'connections',
          createdAt: new Date(Date.now() - 1000)
        }
      ]);
    });

    it('should return activities from user and connections', async () => {
      const feed = await Activity.getFeed(userA._id);

      // Should include A's and B's activities (they are connected)
      expect(feed.length).toBeGreaterThanOrEqual(2);

      const userIds = feed.map(a => a.userId._id.toString());
      expect(userIds).toContain(userA._id.toString());
      expect(userIds).toContain(userB._id.toString());
    });

    it('should not include activities from non-connected users', async () => {
      const feed = await Activity.getFeed(userA._id);

      // C is not connected to A
      const userIds = feed.map(a => a.userId._id.toString());
      expect(userIds).not.toContain(userC._id.toString());
    });

    it('should only include connections and public visibility', async () => {
      // Create private activity for userB
      await Activity.create({
        userId: userB._id,
        type: 'note_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'note',
        entitySnapshot: { title: 'Private Note' },
        visibility: 'private'
      });

      const feed = await Activity.getFeed(userA._id);

      const privateActivities = feed.filter(a => a.visibility === 'private');
      expect(privateActivities).toHaveLength(0);
    });

    it('should include public activities from connections', async () => {
      await Activity.create({
        userId: userB._id,
        type: 'project_completed',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        entitySnapshot: { title: 'Public Project' },
        visibility: 'public'
      });

      const feed = await Activity.getFeed(userA._id);

      const publicActivities = feed.filter(a => a.visibility === 'public');
      expect(publicActivities.length).toBeGreaterThan(0);
    });

    it('should sort by createdAt descending (newest first)', async () => {
      const feed = await Activity.getFeed(userA._id);

      for (let i = 1; i < feed.length; i++) {
        expect(feed[i - 1].createdAt >= feed[i].createdAt).toBe(true);
      }
    });

    it('should support limit option', async () => {
      const feed = await Activity.getFeed(userA._id, { limit: 1 });

      expect(feed).toHaveLength(1);
    });

    it('should support skip option', async () => {
      const fullFeed = await Activity.getFeed(userA._id);
      const skippedFeed = await Activity.getFeed(userA._id, { skip: 1 });

      if (fullFeed.length > 1) {
        expect(skippedFeed[0]._id.toString()).toBe(fullFeed[1]._id.toString());
      }
    });

    it('should support before option for infinite scroll', async () => {
      const fullFeed = await Activity.getFeed(userA._id);

      if (fullFeed.length > 0) {
        const beforeDate = fullFeed[0].createdAt;
        const olderFeed = await Activity.getFeed(userA._id, { before: beforeDate });

        // All items in olderFeed should have createdAt < beforeDate
        olderFeed.forEach(activity => {
          expect(activity.createdAt < beforeDate).toBe(true);
        });
      }
    });

    it('should populate user details', async () => {
      const feed = await Activity.getFeed(userA._id);

      if (feed.length > 0) {
        expect(feed[0].userId.email).toBeDefined();
        expect(feed[0].userId.profile).toBeDefined();
      }
    });

    it('should return empty array when user has no connections', async () => {
      // Create new user with no connections
      const timestamp = Date.now();
      const lonelyUser = await User.create({
        email: `lonely-${timestamp}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      const feed = await Activity.getFeed(lonelyUser._id);

      expect(feed).toHaveLength(0);
    });

    it('should include own activities even without connections', async () => {
      // Create activity for lonely user
      const timestamp = Date.now();
      const lonelyUser = await User.create({
        email: `lonely-${timestamp}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Activity.create({
        userId: lonelyUser._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        entitySnapshot: { title: 'Solo Project' },
        visibility: 'connections'
      });

      const feed = await Activity.getFeed(lonelyUser._id);

      expect(feed).toHaveLength(1);
      expect(feed[0].userId._id.toString()).toBe(lonelyUser._id.toString());
    });
  });

  // ==========================================================================
  // getUserActivities() Tests
  // ==========================================================================

  describe('getUserActivities(userId, viewerId, options)', () => {
    beforeEach(async () => {
      // Create activities for userA with different visibilities
      await Activity.create([
        {
          userId: userA._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project',
          entitySnapshot: { title: 'Public Project' },
          visibility: 'public',
          createdAt: new Date(Date.now() - 3000)
        },
        {
          userId: userA._id,
          type: 'task_completed',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'task',
          entitySnapshot: { title: 'Connections Task' },
          visibility: 'connections',
          createdAt: new Date(Date.now() - 2000)
        },
        {
          userId: userA._id,
          type: 'note_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'note',
          entitySnapshot: { title: 'Private Note' },
          visibility: 'private',
          createdAt: new Date(Date.now() - 1000)
        }
      ]);
    });

    describe('when viewing own profile', () => {
      it('should see all own activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id);

        expect(activities).toHaveLength(3);
      });

      it('should include private activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id);

        const privateActivities = activities.filter(a => a.visibility === 'private');
        expect(privateActivities.length).toBeGreaterThan(0);
      });

      it('should include connections activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id);

        const connectionsActivities = activities.filter(a => a.visibility === 'connections');
        expect(connectionsActivities.length).toBeGreaterThan(0);
      });

      it('should include public activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id);

        const publicActivities = activities.filter(a => a.visibility === 'public');
        expect(publicActivities.length).toBeGreaterThan(0);
      });
    });

    describe('when connected to user', () => {
      beforeEach(async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted',
          acceptedAt: new Date()
        });
      });

      it('should see connections and public activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userB._id);

        expect(activities).toHaveLength(2);
      });

      it('should not see private activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userB._id);

        const privateActivities = activities.filter(a => a.visibility === 'private');
        expect(privateActivities).toHaveLength(0);
      });
    });

    describe('when not connected to user', () => {
      it('should only see public activities', async () => {
        // userC is not connected to userA
        const activities = await Activity.getUserActivities(userA._id, userC._id);

        expect(activities).toHaveLength(1);
        expect(activities[0].visibility).toBe('public');
      });

      it('should not see connections activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userC._id);

        const connectionsActivities = activities.filter(a => a.visibility === 'connections');
        expect(connectionsActivities).toHaveLength(0);
      });

      it('should not see private activities', async () => {
        const activities = await Activity.getUserActivities(userA._id, userC._id);

        const privateActivities = activities.filter(a => a.visibility === 'private');
        expect(privateActivities).toHaveLength(0);
      });
    });

    describe('filtering and pagination', () => {
      it('should filter by activity type', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id, {
          type: 'project_created'
        });

        expect(activities.every(a => a.type === 'project_created')).toBe(true);
      });

      it('should support limit option', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id, {
          limit: 1
        });

        expect(activities).toHaveLength(1);
      });

      it('should support skip option', async () => {
        const fullActivities = await Activity.getUserActivities(userA._id, userA._id);
        const skippedActivities = await Activity.getUserActivities(userA._id, userA._id, {
          skip: 1
        });

        if (fullActivities.length > 1) {
          expect(skippedActivities[0]._id.toString()).toBe(fullActivities[1]._id.toString());
        }
      });

      it('should sort by createdAt descending', async () => {
        const activities = await Activity.getUserActivities(userA._id, userA._id);

        for (let i = 1; i < activities.length; i++) {
          expect(activities[i - 1].createdAt >= activities[i].createdAt).toBe(true);
        }
      });
    });

    it('should return empty array when user has no activities', async () => {
      const activities = await Activity.getUserActivities(userB._id, userB._id);

      expect(activities).toHaveLength(0);
    });
  });

  // ==========================================================================
  // cleanupOldActivities() Tests
  // ==========================================================================

  describe('cleanupOldActivities(daysToKeep)', () => {
    it('should delete activities older than specified days', async () => {
      // Create old activity (100 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        createdAt: oldDate
      });

      // Create recent activity
      await Activity.create({
        userId: userA._id,
        type: 'task_completed',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'task'
      });

      const result = await Activity.cleanupOldActivities(90);

      expect(result.deletedCount).toBe(1);
    });

    it('should keep activities newer than specified days', async () => {
      // Create recent activity (50 days ago)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 50);

      await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        createdAt: recentDate
      });

      await Activity.cleanupOldActivities(90);

      const remainingActivities = await Activity.find({});
      expect(remainingActivities).toHaveLength(1);
    });

    it('should use default of 90 days if not specified', async () => {
      // Create activity 95 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95);

      await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        createdAt: oldDate
      });

      // Create activity 85 days ago
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 85);

      await Activity.create({
        userId: userA._id,
        type: 'task_completed',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'task',
        createdAt: recentDate
      });

      const result = await Activity.cleanupOldActivities();

      expect(result.deletedCount).toBe(1);
    });

    it('should return deleteMany result object', async () => {
      const result = await Activity.cleanupOldActivities(90);

      expect(result).toHaveProperty('deletedCount');
      expect(typeof result.deletedCount).toBe('number');
    });

    it('should delete multiple old activities', async () => {
      // Create multiple old activities
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      await Activity.create([
        {
          userId: userA._id,
          type: 'project_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'project',
          createdAt: oldDate
        },
        {
          userId: userB._id,
          type: 'task_completed',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'task',
          createdAt: oldDate
        },
        {
          userId: userC._id,
          type: 'note_created',
          entityId: new mongoose.Types.ObjectId(),
          entityType: 'note',
          createdAt: oldDate
        }
      ]);

      const result = await Activity.cleanupOldActivities(90);

      expect(result.deletedCount).toBe(3);
    });

    it('should handle cleanup with no old activities', async () => {
      // Create only recent activities
      await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      const result = await Activity.cleanupOldActivities(90);

      expect(result.deletedCount).toBe(0);
    });

    it('should respect custom days to keep value', async () => {
      // Create activity 35 days ago
      const date35DaysAgo = new Date();
      date35DaysAgo.setDate(date35DaysAgo.getDate() - 35);

      await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        createdAt: date35DaysAgo
      });

      // With 30 days threshold, this should be deleted
      const result = await Activity.cleanupOldActivities(30);

      expect(result.deletedCount).toBe(1);
    });
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('Schema Validation', () => {
    it('should require userId', async () => {
      await expect(Activity.create({
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      })).rejects.toThrow();
    });

    it('should require type', async () => {
      await expect(Activity.create({
        userId: userA._id,
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      })).rejects.toThrow();
    });

    it('should reject invalid type value', async () => {
      await expect(Activity.create({
        userId: userA._id,
        type: 'invalid_type',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      })).rejects.toThrow();
    });

    it('should reject invalid entityType value', async () => {
      await expect(Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'invalid_entity'
      })).rejects.toThrow();
    });

    it('should reject invalid visibility value', async () => {
      await expect(Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        visibility: 'invalid_visibility'
      })).rejects.toThrow();
    });

    it('should allow entityId to be optional', async () => {
      const activity = await Activity.create({
        userId: userA._id,
        type: 'profile_updated',
        entityType: 'profile'
      });

      expect(activity).toBeDefined();
      expect(activity.entityId).toBeUndefined();
    });

    it('should allow entityType to be optional', async () => {
      const activity = await Activity.create({
        userId: userA._id,
        type: 'status_updated',
        entityId: new mongoose.Types.ObjectId()
      });

      expect(activity).toBeDefined();
      expect(activity.entityType).toBeUndefined();
    });
  });

  // ==========================================================================
  // Index Tests
  // ==========================================================================

  describe('Database Indexes', () => {
    it('should have index on userId', async () => {
      const indexes = await Activity.collection.indexes();
      const userIdIndex = indexes.find(idx =>
        idx.key && idx.key.userId !== undefined
      );

      expect(userIdIndex).toBeDefined();
    });

    it('should have index on type', async () => {
      const indexes = await Activity.collection.indexes();
      const typeIndex = indexes.find(idx =>
        idx.key && idx.key.type !== undefined
      );

      expect(typeIndex).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle user with null socialSettings', async () => {
      // Create user without socialSettings
      const timestamp = Date.now();
      const userNoSettings = await User.create({
        email: `nosettings-${timestamp}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      // This should not throw
      const activity = await Activity.createActivity({
        userId: userNoSettings._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity).toBeDefined();
    });

    it('should handle project with null description', async () => {
      const project = {
        _id: new mongoose.Types.ObjectId(),
        title: 'No Description Project',
        description: null,
        status: 'active'
      };

      const activity = await Activity.logProjectCreated(userA._id, project);

      expect(activity).toBeDefined();
      expect(activity.entitySnapshot.description).toBeUndefined();
    });

    it('should handle very long metadata objects', async () => {
      const largeMetadata = {
        items: Array(100).fill({ key: 'value', number: 12345 })
      };

      const activity = await Activity.createActivity({
        userId: userA._id,
        type: 'project_completed',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project',
        metadata: largeMetadata
      });

      expect(activity.metadata.items).toHaveLength(100);
    });

    it('should handle ObjectId as string for userId', async () => {
      const activity = await Activity.createActivity({
        userId: userA._id.toString(),
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity).toBeDefined();
    });
  });

  // ==========================================================================
  // Timestamp Tests
  // ==========================================================================

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const before = new Date();

      const activity = await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      const after = new Date();

      expect(activity.createdAt >= before).toBe(true);
      expect(activity.createdAt <= after).toBe(true);
    });

    it('should set updatedAt on creation', async () => {
      const activity = await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      expect(activity.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const activity = await Activity.create({
        userId: userA._id,
        type: 'project_created',
        entityId: new mongoose.Types.ObjectId(),
        entityType: 'project'
      });

      const originalUpdatedAt = activity.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      activity.visibility = 'public';
      await activity.save();

      expect(activity.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
