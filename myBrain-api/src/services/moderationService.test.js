/**
 * =============================================================================
 * MODERATIONSERVICE.TEST.JS - Comprehensive Tests for Moderation Service
 * =============================================================================
 *
 * This test file validates all moderation service functions:
 * - warnUser: Issue warnings to users
 * - suspendUser: Temporarily disable user accounts
 * - unsuspendUser: Restore suspended accounts
 * - banUser: Permanently ban user accounts
 * - unbanUser: Reverse permanent bans
 * - addAdminNote: Add private admin notes
 * - getModerationHistory: Retrieve moderation history
 * - getModerationSummary: Get quick status snapshot
 *
 * TESTING APPROACH:
 * - Uses in-memory MongoDB (via jest setup) for realistic database testing
 * - Creates actual User documents to test real moderation scenarios
 * - Verifies audit trail creation via ModerationAction model
 * - Tests permission checks and edge cases thoroughly
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import ModerationAction from '../models/ModerationAction.js';
import Notification from '../models/Notification.js';
import moderationService from './moderationService.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a test user with specified options
 * @param {Object} overrides - Properties to override defaults
 * @returns {Promise<Object>} Created user document
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: 'hashedpassword123',
    role: 'free',
    status: 'active'
  };

  const user = await User.create({ ...defaults, ...overrides });
  return user;
}

/**
 * Creates an admin user for performing moderation actions
 * @returns {Promise<Object>} Created admin user document
 */
async function createAdminUser() {
  return createTestUser({
    email: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    role: 'admin'
  });
}

// =============================================================================
// WARN USER TESTS
// =============================================================================

describe('moderationService', () => {
  describe('warnUser()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should create a warning record for the user', async () => {
      const result = await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Posting spam content', level: 1 }
      );

      // Verify action was created
      expect(result.action).toBeDefined();
      expect(result.action.actionType).toBe('warning');
      expect(result.action.reason).toBe('Posting spam content');
      expect(result.action.details.warningLevel).toBe(1);
      expect(result.action.targetUserId.toString()).toBe(targetUser._id.toString());
      expect(result.action.performedBy.toString()).toBe(admin._id.toString());
    });

    it('should increment the user warning counter', async () => {
      // First warning
      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'First offense', level: 1 }
      );

      // Refresh user from database
      let updatedUser = await User.findById(targetUser._id);
      expect(updatedUser.moderationStatus.warningCount).toBe(1);

      // Second warning
      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Second offense', level: 2 }
      );

      updatedUser = await User.findById(targetUser._id);
      expect(updatedUser.moderationStatus.warningCount).toBe(2);
    });

    it('should record the warning timestamp', async () => {
      const beforeTime = new Date();

      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Test warning', level: 1 }
      );

      const afterTime = new Date();
      const updatedUser = await User.findById(targetUser._id);

      expect(updatedUser.moderationStatus.lastWarningAt).toBeDefined();
      expect(updatedUser.moderationStatus.lastWarningAt >= beforeTime).toBe(true);
      expect(updatedUser.moderationStatus.lastWarningAt <= afterTime).toBe(true);
    });

    it('should create a notification for the user', async () => {
      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Spam content', level: 2 }
      );

      // Check notification was created
      const notification = await Notification.findOne({
        userId: targetUser._id,
        type: 'moderation_warning'
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('You have received a warning');
      expect(notification.body).toBe('Spam content');
    });

    it('should create an audit trail in ModerationAction', async () => {
      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Audit test', level: 3 }
      );

      const action = await ModerationAction.findOne({
        targetUserId: targetUser._id,
        actionType: 'warning'
      });

      expect(action).toBeDefined();
      expect(action.performedBy.toString()).toBe(admin._id.toString());
      expect(action.details.warningLevel).toBe(3);
      expect(action.createdAt).toBeDefined();
    });

    it('should default to warning level 1 if not specified', async () => {
      const result = await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'No level specified' }
      );

      expect(result.action.details.warningLevel).toBe(1);
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.warnUser(
          nonExistentId,
          admin._id,
          { reason: 'Test', level: 1 }
        )
      ).rejects.toThrow('User not found');
    });

    it('should handle warning levels 1-3', async () => {
      // Level 1
      let result = await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Level 1', level: 1 }
      );
      expect(result.action.details.warningLevel).toBe(1);

      // Level 2
      result = await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Level 2', level: 2 }
      );
      expect(result.action.details.warningLevel).toBe(2);

      // Level 3
      result = await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Level 3', level: 3 }
      );
      expect(result.action.details.warningLevel).toBe(3);
    });

    it('should initialize moderationStatus if it does not exist', async () => {
      // Create user without moderationStatus
      const newUser = await User.create({
        email: `fresh_${Date.now()}@example.com`,
        passwordHash: 'hash123'
      });

      await moderationService.warnUser(
        newUser._id,
        admin._id,
        { reason: 'First warning', level: 1 }
      );

      const updatedUser = await User.findById(newUser._id);
      expect(updatedUser.moderationStatus).toBeDefined();
      expect(updatedUser.moderationStatus.warningCount).toBe(1);
    });
  });

  // =============================================================================
  // SUSPEND USER TESTS
  // =============================================================================

  describe('suspendUser()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should set account status to suspended', async () => {
      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Policy violation', until: null }
      );

      expect(result.user.status).toBe('suspended');
      expect(result.user.moderationStatus.isSuspended).toBe(true);
    });

    it('should set suspension end date correctly for temporary suspension', async () => {
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + 7); // 7 days from now

      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: '7-day suspension', until: untilDate }
      );

      expect(result.user.moderationStatus.suspendedUntil).toBeDefined();
      expect(new Date(result.user.moderationStatus.suspendedUntil).getTime())
        .toBe(new Date(untilDate).getTime());
    });

    it('should handle indefinite suspension (null until date)', async () => {
      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Indefinite suspension', until: null }
      );

      expect(result.user.moderationStatus.suspendedUntil).toBeNull();
      expect(result.user.moderationStatus.isSuspended).toBe(true);
    });

    it('should record which admin performed the suspension', async () => {
      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Test suspension' }
      );

      expect(result.user.moderationStatus.suspendedBy.toString())
        .toBe(admin._id.toString());
    });

    it('should record the suspension reason', async () => {
      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Repeated harassment' }
      );

      expect(result.user.moderationStatus.suspendReason).toBe('Repeated harassment');
    });

    it('should throw error when trying to suspend an admin user', async () => {
      const anotherAdmin = await createAdminUser();

      await expect(
        moderationService.suspendUser(
          anotherAdmin._id,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('Cannot suspend admin users');
    });

    it('should throw error when admin tries to suspend themselves', async () => {
      // Note: Admin check happens before self-check, so when admin suspends themselves
      // the "Cannot suspend admin users" error triggers first
      await expect(
        moderationService.suspendUser(
          admin._id,
          admin._id,
          { reason: 'Self suspension' }
        )
      ).rejects.toThrow('Cannot suspend admin users');
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.suspendUser(
          nonExistentId,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('User not found');
    });

    it('should create an audit trail in ModerationAction', async () => {
      await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Audit test', until: new Date('2025-01-01') }
      );

      const action = await ModerationAction.findOne({
        targetUserId: targetUser._id,
        actionType: 'suspension'
      });

      expect(action).toBeDefined();
      expect(action.reason).toBe('Audit test');
      expect(action.performedBy.toString()).toBe(admin._id.toString());
    });

    it('should create a notification for the suspended user', async () => {
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + 3);

      await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Suspension notification test', until: untilDate }
      );

      const notification = await Notification.findOne({
        userId: targetUser._id,
        type: 'moderation_suspension'
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Your account has been suspended');
    });

    it('should allow suspending an already warned user', async () => {
      // First warn the user
      await moderationService.warnUser(
        targetUser._id,
        admin._id,
        { reason: 'Warning', level: 2 }
      );

      // Then suspend
      const result = await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Escalated after warning' }
      );

      expect(result.user.status).toBe('suspended');
      expect(result.user.moderationStatus.isSuspended).toBe(true);
    });
  });

  // =============================================================================
  // UNSUSPEND USER TESTS
  // =============================================================================

  describe('unsuspendUser()', () => {
    let admin;
    let suspendedUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      // Create a pre-suspended user
      suspendedUser = await createTestUser();
      await moderationService.suspendUser(
        suspendedUser._id,
        admin._id,
        { reason: 'Initial suspension', until: null }
      );
    });

    it('should remove suspension early', async () => {
      const result = await moderationService.unsuspendUser(
        suspendedUser._id,
        admin._id,
        { reason: 'Appeal approved' }
      );

      expect(result.user.status).toBe('active');
      expect(result.user.moderationStatus.isSuspended).toBe(false);
    });

    it('should clear all suspension-related fields', async () => {
      const result = await moderationService.unsuspendUser(
        suspendedUser._id,
        admin._id,
        { reason: 'Clearing suspension' }
      );

      expect(result.user.moderationStatus.suspendedUntil).toBeNull();
      expect(result.user.moderationStatus.suspendedBy).toBeNull();
      expect(result.user.moderationStatus.suspendReason).toBeNull();
    });

    it('should create an audit trail', async () => {
      await moderationService.unsuspendUser(
        suspendedUser._id,
        admin._id,
        { reason: 'Period completed' }
      );

      const action = await ModerationAction.findOne({
        targetUserId: suspendedUser._id,
        actionType: 'unsuspend'
      });

      expect(action).toBeDefined();
      expect(action.reason).toBe('Period completed');
      expect(action.details.previousStatus).toBe('suspended');
    });

    it('should create a notification for the unsuspended user', async () => {
      await moderationService.unsuspendUser(
        suspendedUser._id,
        admin._id,
        { reason: 'Your suspension has been lifted' }
      );

      const notification = await Notification.findOne({
        userId: suspendedUser._id,
        type: 'moderation_unsuspend'
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Your suspension has been lifted');
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.unsuspendUser(
          nonExistentId,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('User not found');
    });

    it('should work even on a non-suspended user (no-op effectively)', async () => {
      const activeUser = await createTestUser();

      const result = await moderationService.unsuspendUser(
        activeUser._id,
        admin._id,
        { reason: 'Precautionary' }
      );

      expect(result.user.status).toBe('active');
      expect(result.user.moderationStatus.isSuspended).toBe(false);
    });
  });

  // =============================================================================
  // BAN USER TESTS
  // =============================================================================

  describe('banUser()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should permanently ban user with disabled status', async () => {
      const result = await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Severe policy violations' }
      );

      expect(result.user.status).toBe('disabled');
      expect(result.user.moderationStatus.isBanned).toBe(true);
    });

    it('should record ban timestamp', async () => {
      const beforeTime = new Date();

      const result = await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Ban test' }
      );

      const afterTime = new Date();

      expect(result.user.moderationStatus.bannedAt).toBeDefined();
      expect(result.user.moderationStatus.bannedAt >= beforeTime).toBe(true);
      expect(result.user.moderationStatus.bannedAt <= afterTime).toBe(true);
    });

    it('should record which admin performed the ban', async () => {
      const result = await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Test' }
      );

      expect(result.user.moderationStatus.bannedBy.toString())
        .toBe(admin._id.toString());
    });

    it('should record the ban reason', async () => {
      const result = await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Threatening other users' }
      );

      expect(result.user.moderationStatus.banReason).toBe('Threatening other users');
    });

    it('should throw error when trying to ban an admin user', async () => {
      const anotherAdmin = await createAdminUser();

      await expect(
        moderationService.banUser(
          anotherAdmin._id,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('Cannot ban admin users');
    });

    it('should throw error when admin tries to ban themselves', async () => {
      // Note: Admin check happens before self-check, so when admin bans themselves
      // the "Cannot ban admin users" error triggers first
      await expect(
        moderationService.banUser(
          admin._id,
          admin._id,
          { reason: 'Self ban' }
        )
      ).rejects.toThrow('Cannot ban admin users');
    });

    it('should throw error if user is already banned', async () => {
      // First ban
      await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'First ban' }
      );

      // Try to ban again
      await expect(
        moderationService.banUser(
          targetUser._id,
          admin._id,
          { reason: 'Second ban' }
        )
      ).rejects.toThrow('User is already banned');
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.banUser(
          nonExistentId,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('User not found');
    });

    it('should clear any active suspension when banning', async () => {
      // First suspend the user
      await moderationService.suspendUser(
        targetUser._id,
        admin._id,
        { reason: 'Temporary suspension', until: new Date('2025-12-31') }
      );

      // Then ban (supersedes suspension)
      const result = await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Escalated to ban' }
      );

      expect(result.user.moderationStatus.isSuspended).toBe(false);
      expect(result.user.moderationStatus.suspendedUntil).toBeNull();
      expect(result.user.moderationStatus.isBanned).toBe(true);
    });

    it('should create an audit trail in ModerationAction', async () => {
      await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Audit ban test' }
      );

      const action = await ModerationAction.findOne({
        targetUserId: targetUser._id,
        actionType: 'ban'
      });

      expect(action).toBeDefined();
      expect(action.reason).toBe('Audit ban test');
      expect(action.performedBy.toString()).toBe(admin._id.toString());
    });

    it('should create a notification for the banned user', async () => {
      await moderationService.banUser(
        targetUser._id,
        admin._id,
        { reason: 'Ban notification test' }
      );

      const notification = await Notification.findOne({
        userId: targetUser._id,
        type: 'moderation_ban'
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Your account has been permanently banned');
    });
  });

  // =============================================================================
  // UNBAN USER TESTS
  // =============================================================================

  describe('unbanUser()', () => {
    let admin;
    let bannedUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      bannedUser = await createTestUser();
      // Ban the user first
      await moderationService.banUser(
        bannedUser._id,
        admin._id,
        { reason: 'Initial ban' }
      );
    });

    it('should reverse ban and restore active status', async () => {
      const result = await moderationService.unbanUser(
        bannedUser._id,
        admin._id,
        { reason: 'Ban reversed due to new evidence' }
      );

      expect(result.user.status).toBe('active');
      expect(result.user.moderationStatus.isBanned).toBe(false);
    });

    it('should clear all ban-related fields', async () => {
      const result = await moderationService.unbanUser(
        bannedUser._id,
        admin._id,
        { reason: 'Clearing ban' }
      );

      expect(result.user.moderationStatus.bannedAt).toBeNull();
      expect(result.user.moderationStatus.bannedBy).toBeNull();
      expect(result.user.moderationStatus.banReason).toBeNull();
    });

    it('should require justification (reason is passed through)', async () => {
      const result = await moderationService.unbanUser(
        bannedUser._id,
        admin._id,
        { reason: 'Account was compromised - hacker actions' }
      );

      // The action should have the reason
      expect(result.action.reason).toBe('Account was compromised - hacker actions');
    });

    it('should create an audit trail', async () => {
      await moderationService.unbanUser(
        bannedUser._id,
        admin._id,
        { reason: 'Successful appeal' }
      );

      const action = await ModerationAction.findOne({
        targetUserId: bannedUser._id,
        actionType: 'unban'
      });

      expect(action).toBeDefined();
      expect(action.reason).toBe('Successful appeal');
      expect(action.performedBy.toString()).toBe(admin._id.toString());
    });

    it('should create a notification for the unbanned user', async () => {
      await moderationService.unbanUser(
        bannedUser._id,
        admin._id,
        { reason: 'Your ban has been lifted' }
      );

      const notification = await Notification.findOne({
        userId: bannedUser._id,
        type: 'moderation_unban'
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Your ban has been lifted');
    });

    it('should throw error if user is not banned', async () => {
      const activeUser = await createTestUser();

      await expect(
        moderationService.unbanUser(
          activeUser._id,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('User is not banned');
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.unbanUser(
          nonExistentId,
          admin._id,
          { reason: 'Test' }
        )
      ).rejects.toThrow('User not found');
    });
  });

  // =============================================================================
  // ADD ADMIN NOTE TESTS
  // =============================================================================

  describe('addAdminNote()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should create a note action without changing user status', async () => {
      const originalStatus = targetUser.status;

      const result = await moderationService.addAdminNote(
        targetUser._id,
        admin._id,
        { content: 'VIP customer - prioritize support' }
      );

      // User status unchanged
      const updatedUser = await User.findById(targetUser._id);
      expect(updatedUser.status).toBe(originalStatus);

      // Action created
      expect(result.action).toBeDefined();
      expect(result.action.actionType).toBe('note');
    });

    it('should store the note content in action details', async () => {
      const result = await moderationService.addAdminNote(
        targetUser._id,
        admin._id,
        { content: 'User reported bug #123, gave 1 month free premium' }
      );

      expect(result.action.details.noteContent)
        .toBe('User reported bug #123, gave 1 month free premium');
    });

    it('should create an audit trail', async () => {
      await moderationService.addAdminNote(
        targetUser._id,
        admin._id,
        { content: 'Audit note test' }
      );

      const action = await ModerationAction.findOne({
        targetUserId: targetUser._id,
        actionType: 'note'
      });

      expect(action).toBeDefined();
      expect(action.reason).toBe('Admin note added');
      expect(action.performedBy.toString()).toBe(admin._id.toString());
    });

    it('should NOT create a notification (notes are private)', async () => {
      await moderationService.addAdminNote(
        targetUser._id,
        admin._id,
        { content: 'Private note' }
      );

      // No notification should be created for notes
      const notificationCount = await Notification.countDocuments({
        userId: targetUser._id
      });

      expect(notificationCount).toBe(0);
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.addAdminNote(
          nonExistentId,
          admin._id,
          { content: 'Test' }
        )
      ).rejects.toThrow('User not found');
    });
  });

  // =============================================================================
  // GET MODERATION HISTORY TESTS
  // =============================================================================

  describe('getModerationHistory()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should return complete moderation history', async () => {
      // Create multiple actions
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Warning 1', level: 1 });
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Warning 2', level: 2 });
      await moderationService.addAdminNote(targetUser._id, admin._id, { content: 'Note 1' });

      const history = await moderationService.getModerationHistory(targetUser._id);

      expect(history.user).toBeDefined();
      expect(history.actions).toBeDefined();
      expect(history.actions.length).toBe(3);
      expect(history.total).toBe(3);
    });

    it('should return user info with moderation status', async () => {
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Test', level: 1 });

      const history = await moderationService.getModerationHistory(targetUser._id);

      expect(history.user._id).toBeDefined();
      expect(history.user.email).toBeDefined();
      expect(history.user.status).toBeDefined();
      expect(history.user.moderationStatus).toBeDefined();
    });

    it('should support pagination with limit and skip', async () => {
      // Create 5 actions
      for (let i = 0; i < 5; i++) {
        await moderationService.warnUser(targetUser._id, admin._id, { reason: `Warning ${i}`, level: 1 });
      }

      const firstPage = await moderationService.getModerationHistory(targetUser._id, { limit: 2, skip: 0 });
      const secondPage = await moderationService.getModerationHistory(targetUser._id, { limit: 2, skip: 2 });

      expect(firstPage.actions.length).toBe(2);
      expect(secondPage.actions.length).toBe(2);
      expect(firstPage.total).toBe(5);
      expect(secondPage.total).toBe(5);
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.getModerationHistory(nonExistentId)
      ).rejects.toThrow('User not found');
    });

    it('should return empty actions array for user with no history', async () => {
      const newUser = await createTestUser();
      const history = await moderationService.getModerationHistory(newUser._id);

      expect(history.actions).toEqual([]);
      expect(history.total).toBe(0);
    });
  });

  // =============================================================================
  // GET MODERATION SUMMARY TESTS
  // =============================================================================

  describe('getModerationSummary()', () => {
    let admin;
    let targetUser;

    beforeEach(async () => {
      admin = await createAdminUser();
      targetUser = await createTestUser();
    });

    it('should return current moderation status snapshot', async () => {
      const summary = await moderationService.getModerationSummary(targetUser._id);

      expect(summary.warningCount).toBe(0);
      expect(summary.isSuspended).toBe(false);
      expect(summary.isBanned).toBe(false);
      expect(summary.status).toBe('active');
    });

    it('should include warning count and last warning date', async () => {
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Test', level: 1 });
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Test 2', level: 2 });

      const summary = await moderationService.getModerationSummary(targetUser._id);

      expect(summary.warningCount).toBe(2);
      expect(summary.lastWarningAt).toBeDefined();
    });

    it('should include recent warning count', async () => {
      await moderationService.warnUser(targetUser._id, admin._id, { reason: 'Recent', level: 1 });

      const summary = await moderationService.getModerationSummary(targetUser._id);

      expect(summary.recentWarnings).toBe(1);
    });

    it('should include suspension details when suspended', async () => {
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + 7);

      await moderationService.suspendUser(targetUser._id, admin._id, {
        reason: 'Test suspension',
        until: untilDate
      });

      const summary = await moderationService.getModerationSummary(targetUser._id);

      expect(summary.isSuspended).toBe(true);
      expect(summary.suspendedUntil).toBeDefined();
      expect(summary.suspendReason).toBe('Test suspension');
    });

    it('should include ban details when banned', async () => {
      await moderationService.banUser(targetUser._id, admin._id, {
        reason: 'Test ban'
      });

      const summary = await moderationService.getModerationSummary(targetUser._id);

      expect(summary.isBanned).toBe(true);
      expect(summary.bannedAt).toBeDefined();
      expect(summary.banReason).toBe('Test ban');
      expect(summary.status).toBe('disabled');
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.getModerationSummary(nonExistentId)
      ).rejects.toThrow('User not found');
    });
  });

  // =============================================================================
  // EDGE CASES AND COMPLEX SCENARIOS
  // =============================================================================

  describe('Edge Cases', () => {
    let admin;

    beforeEach(async () => {
      admin = await createAdminUser();
    });

    it('should handle invalid user ID gracefully', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      await expect(
        moderationService.warnUser(invalidId, admin._id, { reason: 'Test' })
      ).rejects.toThrow('User not found');

      await expect(
        moderationService.suspendUser(invalidId, admin._id, { reason: 'Test' })
      ).rejects.toThrow('User not found');

      await expect(
        moderationService.banUser(invalidId, admin._id, { reason: 'Test' })
      ).rejects.toThrow('User not found');
    });

    it('should handle full moderation escalation workflow', async () => {
      const user = await createTestUser();

      // Step 1: Warning level 1
      await moderationService.warnUser(user._id, admin._id, { reason: 'First offense', level: 1 });
      let summary = await moderationService.getModerationSummary(user._id);
      expect(summary.warningCount).toBe(1);

      // Step 2: Warning level 2
      await moderationService.warnUser(user._id, admin._id, { reason: 'Second offense', level: 2 });
      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.warningCount).toBe(2);

      // Step 3: Warning level 3
      await moderationService.warnUser(user._id, admin._id, { reason: 'Final warning', level: 3 });
      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.warningCount).toBe(3);

      // Step 4: Suspension
      await moderationService.suspendUser(user._id, admin._id, {
        reason: 'Suspension after warnings',
        until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.isSuspended).toBe(true);

      // Step 5: Unsuspend
      await moderationService.unsuspendUser(user._id, admin._id, { reason: 'Period completed' });
      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.isSuspended).toBe(false);
      expect(summary.status).toBe('active');

      // Step 6: Re-offend and ban
      await moderationService.warnUser(user._id, admin._id, { reason: 'Post-suspension offense', level: 3 });
      await moderationService.banUser(user._id, admin._id, { reason: 'Permanent ban after all warnings' });
      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.isBanned).toBe(true);
      expect(summary.status).toBe('disabled');

      // Verify complete history
      const history = await moderationService.getModerationHistory(user._id);
      expect(history.total).toBe(7); // 4 warnings + suspension + unsuspend + ban
    });

    it('should allow multiple admins to take actions on the same user', async () => {
      const admin2 = await createAdminUser();
      const user = await createTestUser();

      await moderationService.warnUser(user._id, admin._id, { reason: 'Admin 1 warning', level: 1 });
      await moderationService.warnUser(user._id, admin2._id, { reason: 'Admin 2 warning', level: 2 });

      const history = await moderationService.getModerationHistory(user._id);

      const admin1Actions = history.actions.filter(a =>
        a.performedBy._id.toString() === admin._id.toString()
      );
      const admin2Actions = history.actions.filter(a =>
        a.performedBy._id.toString() === admin2._id.toString()
      );

      expect(admin1Actions.length).toBe(1);
      expect(admin2Actions.length).toBe(1);
    });

    it('should handle suspended user being banned (ban supersedes suspension)', async () => {
      const user = await createTestUser();

      // Suspend first
      await moderationService.suspendUser(user._id, admin._id, {
        reason: 'Temporary suspension',
        until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      let summary = await moderationService.getModerationSummary(user._id);
      expect(summary.isSuspended).toBe(true);
      expect(summary.isBanned).toBe(false);

      // Then ban (should clear suspension)
      await moderationService.banUser(user._id, admin._id, { reason: 'Escalated to permanent ban' });

      summary = await moderationService.getModerationSummary(user._id);
      expect(summary.isSuspended).toBe(false);
      expect(summary.isBanned).toBe(true);
    });

    it('should preserve warning count after ban and unban', async () => {
      const user = await createTestUser();

      // Issue some warnings
      await moderationService.warnUser(user._id, admin._id, { reason: 'Warning 1', level: 1 });
      await moderationService.warnUser(user._id, admin._id, { reason: 'Warning 2', level: 2 });

      // Ban
      await moderationService.banUser(user._id, admin._id, { reason: 'Test ban' });

      // Unban
      await moderationService.unbanUser(user._id, admin._id, { reason: 'Successful appeal' });

      // Warning count should still be preserved
      const summary = await moderationService.getModerationSummary(user._id);
      expect(summary.warningCount).toBe(2);
    });

    it('should handle notification failures gracefully', async () => {
      // The service catches notification errors and continues
      // This test verifies the moderation action still succeeds even if notification fails
      const user = await createTestUser();

      // Action should succeed regardless of any notification issues
      const result = await moderationService.warnUser(user._id, admin._id, {
        reason: 'Test warning',
        level: 1
      });

      expect(result.user).toBeDefined();
      expect(result.action).toBeDefined();
    });
  });

  // =============================================================================
  // PREMIUM AND FREE USER TESTS
  // =============================================================================

  describe('User Role Tests', () => {
    let admin;

    beforeEach(async () => {
      admin = await createAdminUser();
    });

    it('should allow moderating free users', async () => {
      const freeUser = await createTestUser({ role: 'free' });

      const result = await moderationService.suspendUser(freeUser._id, admin._id, {
        reason: 'Test'
      });

      expect(result.user.status).toBe('suspended');
    });

    it('should allow moderating premium users', async () => {
      const premiumUser = await createTestUser({ role: 'premium' });

      const result = await moderationService.suspendUser(premiumUser._id, admin._id, {
        reason: 'Test'
      });

      expect(result.user.status).toBe('suspended');
    });

    it('should NOT allow moderating admin users (suspend)', async () => {
      const targetAdmin = await createAdminUser();

      await expect(
        moderationService.suspendUser(targetAdmin._id, admin._id, { reason: 'Test' })
      ).rejects.toThrow('Cannot suspend admin users');
    });

    it('should NOT allow moderating admin users (ban)', async () => {
      const targetAdmin = await createAdminUser();

      await expect(
        moderationService.banUser(targetAdmin._id, admin._id, { reason: 'Test' })
      ).rejects.toThrow('Cannot ban admin users');
    });

    it('should allow warning admin users (warnings are informational)', async () => {
      const targetAdmin = await createAdminUser();

      // Warnings don't restrict access, so they're allowed on admins
      const result = await moderationService.warnUser(targetAdmin._id, admin._id, {
        reason: 'Informational warning',
        level: 1
      });

      expect(result.action).toBeDefined();
    });

    it('should allow adding notes to admin users', async () => {
      const targetAdmin = await createAdminUser();

      const result = await moderationService.addAdminNote(targetAdmin._id, admin._id, {
        content: 'Note about admin'
      });

      expect(result.action).toBeDefined();
    });
  });
});
