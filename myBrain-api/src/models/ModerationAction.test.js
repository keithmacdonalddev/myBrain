/**
 * =============================================================================
 * MODERATIONACTION.TEST.JS - Tests for Admin Moderation Actions Model
 * =============================================================================
 *
 * Tests covering:
 * - CRUD operations for moderation actions
 * - Validation of required fields
 * - Action types (warning, suspension, unsuspend, ban, unban, note, status_change)
 * - Action history for users
 * - Admin who took action
 * - Action-specific details (warningLevel, suspendedUntil, noteContent, status changes)
 * - Query helpers for moderation history
 * - Warning count tracking
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import ModerationAction from './ModerationAction.js';
import User from './User.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a test user with minimal required fields
 */
const createTestUser = async (emailSuffix, options = {}) => {
  return User.create({
    email: `testuser${emailSuffix}@example.com`,
    passwordHash: 'hashedpassword123',
    role: options.role || 'free',
    profile: options.profile || {}
  });
};

/**
 * Creates a basic moderation action for testing
 */
const createTestAction = async (targetUser, admin, actionType, options = {}) => {
  return ModerationAction.create({
    targetUserId: targetUser._id,
    performedBy: admin._id,
    actionType,
    reason: options.reason || 'Test action reason',
    details: options.details || {}
  });
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

describe('ModerationAction Model - CRUD Operations', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('target');
    admin = await createTestUser('admin', { role: 'admin' });
  });

  describe('Create', () => {
    test('should create a moderation action with required fields', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'First warning for inappropriate behavior'
      });

      expect(action).toBeDefined();
      expect(action.targetUserId.toString()).toBe(targetUser._id.toString());
      expect(action.performedBy.toString()).toBe(admin._id.toString());
      expect(action.actionType).toBe('warning');
      expect(action.reason).toBe('First warning for inappropriate behavior');
      expect(action.createdAt).toBeDefined();
    });

    test('should create actions for all action types', async () => {
      const actionTypes = ['warning', 'suspension', 'unsuspend', 'ban', 'unban', 'note', 'status_change'];

      for (let i = 0; i < actionTypes.length; i++) {
        const user = await createTestUser(`actiontype${i}`);
        const action = await ModerationAction.create({
          targetUserId: user._id,
          performedBy: admin._id,
          actionType: actionTypes[i],
          reason: `Action: ${actionTypes[i]}`
        });

        expect(action.actionType).toBe(actionTypes[i]);
      }
    });

    test('should create a warning with warningLevel', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'First warning',
        details: { warningLevel: 1 }
      });

      expect(action.details.warningLevel).toBe(1);
    });

    test('should create a suspension with suspendedUntil', async () => {
      const suspendedUntil = new Date('2025-12-31');
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'suspension',
        reason: '7-day suspension',
        details: { suspendedUntil }
      });

      expect(action.details.suspendedUntil.getTime()).toBe(suspendedUntil.getTime());
    });

    test('should create a note with noteContent', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: 'Internal documentation',
        details: { noteContent: 'User requested account recovery. Verified identity via email.' }
      });

      expect(action.details.noteContent).toBe('User requested account recovery. Verified identity via email.');
    });

    test('should create a status_change with previous and new status', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'status_change',
        reason: 'Reactivating account',
        details: { previousStatus: 'inactive', newStatus: 'active' }
      });

      expect(action.details.previousStatus).toBe('inactive');
      expect(action.details.newStatus).toBe('active');
    });
  });

  describe('Read', () => {
    test('should find an action by id', async () => {
      const created = await createTestAction(targetUser, admin, 'warning');

      const found = await ModerationAction.findById(created._id);
      expect(found).toBeDefined();
      expect(found.actionType).toBe('warning');
    });

    test('should find actions by target user', async () => {
      await createTestAction(targetUser, admin, 'warning');
      await createTestAction(targetUser, admin, 'note');

      const actions = await ModerationAction.find({ targetUserId: targetUser._id });
      expect(actions).toHaveLength(2);
    });

    test('should find actions by admin', async () => {
      const admin2 = await createTestUser('admin2', { role: 'admin' });
      await createTestAction(targetUser, admin, 'warning');
      await createTestAction(targetUser, admin2, 'warning');

      const actionsBy1 = await ModerationAction.find({ performedBy: admin._id });
      expect(actionsBy1).toHaveLength(1);
    });
  });

  describe('Delete', () => {
    test('should delete an action', async () => {
      const action = await createTestAction(targetUser, admin, 'note');

      await ModerationAction.findByIdAndDelete(action._id);

      const found = await ModerationAction.findById(action._id);
      expect(found).toBeNull();
    });
  });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('ModerationAction Model - Validation', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('vtarget');
    admin = await createTestUser('vadmin', { role: 'admin' });
  });

  describe('Required Fields', () => {
    test('should fail without targetUserId', async () => {
      const action = new ModerationAction({
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Test reason'
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should fail without performedBy', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        actionType: 'warning',
        reason: 'Test reason'
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should fail without actionType', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        reason: 'Test reason'
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should fail without reason', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning'
      });

      await expect(action.save()).rejects.toThrow();
    });
  });

  describe('Enum Validation', () => {
    test('should fail with invalid actionType', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'invalid_action',
        reason: 'Test reason'
      });

      await expect(action.save()).rejects.toThrow();
    });
  });

  describe('Field Constraints', () => {
    test('should allow reason up to 1000 characters', async () => {
      const longReason = 'a'.repeat(1000);
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: longReason
      });

      expect(action.reason).toHaveLength(1000);
    });

    test('should fail with reason over 1000 characters', async () => {
      const tooLongReason = 'a'.repeat(1001);
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: tooLongReason
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should allow noteContent up to 5000 characters', async () => {
      const longNote = 'a'.repeat(5000);
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: 'Long note',
        details: { noteContent: longNote }
      });

      expect(action.details.noteContent).toHaveLength(5000);
    });

    test('should fail with noteContent over 5000 characters', async () => {
      const tooLongNote = 'a'.repeat(5001);
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: 'Too long note',
        details: { noteContent: tooLongNote }
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should validate warningLevel min value', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Invalid warning',
        details: { warningLevel: 0 }
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should validate warningLevel max value', async () => {
      const action = new ModerationAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Invalid warning',
        details: { warningLevel: 4 }
      });

      await expect(action.save()).rejects.toThrow();
    });

    test('should allow warningLevel values 1-3', async () => {
      for (let level = 1; level <= 3; level++) {
        const user = await createTestUser(`warnlevel${level}`);
        const action = await ModerationAction.create({
          targetUserId: user._id,
          performedBy: admin._id,
          actionType: 'warning',
          reason: `Warning level ${level}`,
          details: { warningLevel: level }
        });

        expect(action.details.warningLevel).toBe(level);
      }
    });
  });
});

// =============================================================================
// STATIC METHODS - LOGGING ACTIONS
// =============================================================================

describe('ModerationAction Model - logAction Static Method', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('logtarget');
    admin = await createTestUser('logadmin', { role: 'admin' });
  });

  test('should log a warning action', async () => {
    const action = await ModerationAction.logAction({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'warning',
      reason: 'Posting inappropriate content',
      details: { warningLevel: 1 }
    });

    expect(action).toBeDefined();
    expect(action.actionType).toBe('warning');
    expect(action.details.warningLevel).toBe(1);
  });

  test('should log a suspension action', async () => {
    const suspendedUntil = new Date('2025-06-01');
    const action = await ModerationAction.logAction({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'suspension',
      reason: 'Repeated violations',
      details: { suspendedUntil }
    });

    expect(action.actionType).toBe('suspension');
    expect(action.details.suspendedUntil.getTime()).toBe(suspendedUntil.getTime());
  });

  test('should log a note action', async () => {
    const action = await ModerationAction.logAction({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'note',
      reason: 'Internal documentation',
      details: { noteContent: 'User requested help with account recovery' }
    });

    expect(action.actionType).toBe('note');
    expect(action.details.noteContent).toContain('account recovery');
  });

  test('should log action without details', async () => {
    const action = await ModerationAction.logAction({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'unsuspend',
      reason: 'Suspension period ended early'
    });

    expect(action).toBeDefined();
    expect(action.actionType).toBe('unsuspend');
  });
});

// =============================================================================
// STATIC METHODS - GETTING HISTORY
// =============================================================================

describe('ModerationAction Model - getHistory Static Method', () => {
  let targetUser, admin1, admin2;

  beforeEach(async () => {
    targetUser = await createTestUser('historytarget');
    admin1 = await createTestUser('historyadmin1', { role: 'admin', profile: { firstName: 'John', lastName: 'Admin' } });
    admin2 = await createTestUser('historyadmin2', { role: 'admin' });

    // Create a history of actions
    await createTestAction(targetUser, admin1, 'warning', {
      reason: 'First warning',
      details: { warningLevel: 1 }
    });
    await createTestAction(targetUser, admin2, 'note', {
      reason: 'Follow-up note',
      details: { noteContent: 'Monitoring user behavior' }
    });
    await createTestAction(targetUser, admin1, 'warning', {
      reason: 'Second warning',
      details: { warningLevel: 2 }
    });
  });

  test('should return moderation history for a user', async () => {
    const { actions, total } = await ModerationAction.getHistory(targetUser._id);

    expect(actions).toHaveLength(3);
    expect(total).toBe(3);
  });

  test('should sort by newest first', async () => {
    // Create a separate user with controlled timing for this test
    const sortUser = await createTestUser('sorthistoryuser');
    const sortAdmin = await createTestUser('sorthistoryadmin', { role: 'admin' });

    await ModerationAction.logAction({
      targetUserId: sortUser._id,
      performedBy: sortAdmin._id,
      actionType: 'warning',
      reason: 'Older action'
    });

    // Wait to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 50));

    await ModerationAction.logAction({
      targetUserId: sortUser._id,
      performedBy: sortAdmin._id,
      actionType: 'note',
      reason: 'Newer action'
    });

    const { actions } = await ModerationAction.getHistory(sortUser._id);

    // Most recent action should be first
    expect(actions[0].reason).toBe('Newer action');
    expect(actions[1].reason).toBe('Older action');
  });

  test('should populate admin details', async () => {
    const { actions } = await ModerationAction.getHistory(targetUser._id);

    const actionByAdmin1 = actions.find(a => a.reason === 'First warning');
    expect(actionByAdmin1.performedBy).toBeDefined();
    expect(actionByAdmin1.performedBy.email).toBeDefined();
  });

  test('should respect limit option', async () => {
    const { actions, total } = await ModerationAction.getHistory(targetUser._id, { limit: 2 });

    expect(actions).toHaveLength(2);
    expect(total).toBe(3); // Total is still 3
  });

  test('should respect skip option', async () => {
    const { actions } = await ModerationAction.getHistory(targetUser._id, { skip: 2 });

    expect(actions).toHaveLength(1);
  });

  test('should return empty for user with no history', async () => {
    const newUser = await createTestUser('nohistory');
    const { actions, total } = await ModerationAction.getHistory(newUser._id);

    expect(actions).toHaveLength(0);
    expect(total).toBe(0);
  });
});

// =============================================================================
// STATIC METHODS - WARNING COUNT
// =============================================================================

describe('ModerationAction Model - getRecentWarningCount Static Method', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('warntarget');
    admin = await createTestUser('warnadmin', { role: 'admin' });
  });

  test('should count warnings in last 90 days by default', async () => {
    await createTestAction(targetUser, admin, 'warning');
    await createTestAction(targetUser, admin, 'warning');
    await createTestAction(targetUser, admin, 'note'); // Not a warning

    const count = await ModerationAction.getRecentWarningCount(targetUser._id);

    expect(count).toBe(2);
  });

  test('should respect custom day range', async () => {
    // Create warnings
    await createTestAction(targetUser, admin, 'warning');
    await createTestAction(targetUser, admin, 'warning');

    // Create an old warning (simulate by directly setting createdAt)
    const oldWarning = await createTestAction(targetUser, admin, 'warning');
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    await ModerationAction.updateOne({ _id: oldWarning._id }, { createdAt: oldDate });

    // 30 days should only count 2
    const count = await ModerationAction.getRecentWarningCount(targetUser._id, 30);
    expect(count).toBe(2);

    // 60 days should count all 3
    const count60 = await ModerationAction.getRecentWarningCount(targetUser._id, 60);
    expect(count60).toBe(3);
  });

  test('should not count non-warning actions', async () => {
    await createTestAction(targetUser, admin, 'warning');
    await createTestAction(targetUser, admin, 'suspension');
    await createTestAction(targetUser, admin, 'note');
    await createTestAction(targetUser, admin, 'ban');

    const count = await ModerationAction.getRecentWarningCount(targetUser._id);

    expect(count).toBe(1);
  });

  test('should return 0 for user with no warnings', async () => {
    const count = await ModerationAction.getRecentWarningCount(targetUser._id);

    expect(count).toBe(0);
  });
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

describe('ModerationAction Model - Instance Methods', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('insttarget');
    admin = await createTestUser('instadmin', { role: 'admin', profile: { firstName: 'Jane', lastName: 'Doe' } });
  });

  describe('toSafeJSON', () => {
    test('should convert action to safe JSON', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Test warning'
      });

      // Populate the performedBy field
      await action.populate('performedBy', 'email profile.firstName profile.lastName');

      const safeJSON = action.toSafeJSON();

      expect(safeJSON).toBeDefined();
      expect(safeJSON.actionType).toBe('warning');
    });

    test('should format admin name from profile', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Test warning'
      });

      await action.populate('performedBy', 'email profile.firstName profile.lastName');

      const safeJSON = action.toSafeJSON();

      expect(safeJSON.performedBy.name).toBe('Jane Doe');
    });

    test('should fallback to email when no name', async () => {
      const adminNoName = await createTestUser('adminnoname', { role: 'admin' });
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: adminNoName._id,
        actionType: 'warning',
        reason: 'Test warning'
      });

      await action.populate('performedBy', 'email profile.firstName profile.lastName');

      const safeJSON = action.toSafeJSON();

      expect(safeJSON.performedBy.name).toBe(adminNoName.email);
    });

    test('should include admin ID and email', async () => {
      const action = await ModerationAction.create({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'note',
        reason: 'Test note'
      });

      await action.populate('performedBy', 'email profile.firstName profile.lastName');

      const safeJSON = action.toSafeJSON();

      expect(safeJSON.performedBy._id.toString()).toBe(admin._id.toString());
      expect(safeJSON.performedBy.email).toBe(admin.email);
    });
  });
});

// =============================================================================
// ACTION TYPES - SPECIFIC SCENARIOS
// =============================================================================

describe('ModerationAction Model - Action Type Scenarios', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('scenariotarget');
    admin = await createTestUser('scenarioadmin', { role: 'admin' });
  });

  describe('Warning Escalation', () => {
    test('should track warning escalation levels', async () => {
      // Level 1 warning
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'First offense',
        details: { warningLevel: 1 }
      });

      // Level 2 warning
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Second offense',
        details: { warningLevel: 2 }
      });

      // Level 3 warning (final)
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'warning',
        reason: 'Final warning',
        details: { warningLevel: 3 }
      });

      const { actions } = await ModerationAction.getHistory(targetUser._id);
      const warnings = actions.filter(a => a.actionType === 'warning');

      expect(warnings).toHaveLength(3);
      expect(warnings.map(w => w.details.warningLevel).sort()).toEqual([1, 2, 3]);
    });
  });

  describe('Suspension and Unsuspend Flow', () => {
    test('should track suspension and unsuspension', async () => {
      // Suspend user
      const suspendedUntil = new Date('2025-12-31');
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'suspension',
        reason: 'Multiple violations',
        details: { suspendedUntil }
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));

      // Later unsuspend early
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'unsuspend',
        reason: 'Appealed successfully'
      });

      const { actions } = await ModerationAction.getHistory(targetUser._id);

      expect(actions).toHaveLength(2);
      expect(actions[0].actionType).toBe('unsuspend');
      expect(actions[1].actionType).toBe('suspension');
    });
  });

  describe('Ban and Unban Flow', () => {
    test('should track ban and unban', async () => {
      // Ban user
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'ban',
        reason: 'Severe violation - permanent ban'
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));

      // Later unban
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'unban',
        reason: 'Ban lifted after appeal review'
      });

      const { actions } = await ModerationAction.getHistory(targetUser._id);

      expect(actions).toHaveLength(2);
      expect(actions[0].actionType).toBe('unban');
      expect(actions[1].actionType).toBe('ban');
    });
  });

  describe('Status Changes', () => {
    test('should track status change history', async () => {
      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'status_change',
        reason: 'Deactivating account per user request',
        details: { previousStatus: 'active', newStatus: 'inactive' }
      });

      await ModerationAction.logAction({
        targetUserId: targetUser._id,
        performedBy: admin._id,
        actionType: 'status_change',
        reason: 'Reactivating account',
        details: { previousStatus: 'inactive', newStatus: 'active' }
      });

      const { actions } = await ModerationAction.getHistory(targetUser._id);
      const statusChanges = actions.filter(a => a.actionType === 'status_change');

      expect(statusChanges).toHaveLength(2);
    });
  });
});

// =============================================================================
// TIMESTAMPS
// =============================================================================

describe('ModerationAction Model - Timestamps', () => {
  let targetUser, admin;

  beforeEach(async () => {
    targetUser = await createTestUser('tstimestamp');
    admin = await createTestUser('tsadmin', { role: 'admin' });
  });

  test('should have createdAt timestamp', async () => {
    const action = await ModerationAction.create({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'warning',
      reason: 'Test'
    });

    expect(action.createdAt).toBeDefined();
    expect(action.createdAt instanceof Date).toBe(true);
  });

  test('should set createdAt to current time by default', async () => {
    const before = new Date();
    const action = await ModerationAction.create({
      targetUserId: targetUser._id,
      performedBy: admin._id,
      actionType: 'note',
      reason: 'Test'
    });
    const after = new Date();

    expect(action.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(action.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// =============================================================================
// MULTIPLE USERS AND ADMINS
// =============================================================================

describe('ModerationAction Model - Multiple Users and Admins', () => {
  let user1, user2, admin1, admin2;

  beforeEach(async () => {
    user1 = await createTestUser('multiuser1');
    user2 = await createTestUser('multiuser2');
    admin1 = await createTestUser('multiadmin1', { role: 'admin' });
    admin2 = await createTestUser('multiadmin2', { role: 'admin' });
  });

  test('should track actions by different admins', async () => {
    await createTestAction(user1, admin1, 'warning');
    await createTestAction(user1, admin2, 'note');
    await createTestAction(user1, admin1, 'warning');

    const { actions } = await ModerationAction.getHistory(user1._id);

    const admin1Actions = actions.filter(a => a.performedBy._id.toString() === admin1._id.toString());
    const admin2Actions = actions.filter(a => a.performedBy._id.toString() === admin2._id.toString());

    expect(admin1Actions).toHaveLength(2);
    expect(admin2Actions).toHaveLength(1);
  });

  test('should keep separate histories for different users', async () => {
    await createTestAction(user1, admin1, 'warning');
    await createTestAction(user1, admin1, 'warning');
    await createTestAction(user2, admin1, 'warning');

    const { actions: user1Actions, total: user1Total } = await ModerationAction.getHistory(user1._id);
    const { actions: user2Actions, total: user2Total } = await ModerationAction.getHistory(user2._id);

    expect(user1Total).toBe(2);
    expect(user2Total).toBe(1);
  });
});
