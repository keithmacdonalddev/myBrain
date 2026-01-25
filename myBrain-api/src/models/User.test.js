/**
 * =============================================================================
 * USER MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the User model, covering:
 * - Instance methods (hasFlag, isPremium, isAdmin, etc.)
 * - Static methods (getFeatureLists)
 * - Validation (email, required fields)
 * - Edge cases (expired suspensions, multiple flag sources, privacy settings)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import User from './User.js';
// Import other models needed for getCurrentUsage() tests
import './Note.js';
import './Task.js';
import './Project.js';
import './Event.js';
import './Image.js';
import './LifeArea.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a user with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'free',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: INSTANCE METHODS
// =============================================================================

describe('User Model', () => {
  // ---------------------------------------------------------------------------
  // hasFlag(flagName)
  // ---------------------------------------------------------------------------
  describe('hasFlag()', () => {
    it('should return true when flag is explicitly enabled', async () => {
      const user = await createTestUser({
        flags: new Map([['betaFeature', true]]),
      });
      expect(user.hasFlag('betaFeature')).toBe(true);
    });

    it('should return false when flag is explicitly disabled', async () => {
      const user = await createTestUser({
        flags: new Map([['betaFeature', false]]),
      });
      expect(user.hasFlag('betaFeature')).toBe(false);
    });

    it('should return false when flag does not exist', async () => {
      const user = await createTestUser();
      expect(user.hasFlag('nonExistentFlag')).toBe(false);
    });

    it('should return false for undefined flag value', async () => {
      const user = await createTestUser({
        flags: new Map([['someFlag', undefined]]),
      });
      expect(user.hasFlag('someFlag')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isPremium()
  // ---------------------------------------------------------------------------
  describe('isPremium()', () => {
    it('should return true for premium users', async () => {
      const user = await createTestUser({ role: 'premium' });
      expect(user.isPremium()).toBe(true);
    });

    it('should return true for admin users', async () => {
      const user = await createTestUser({ role: 'admin' });
      expect(user.isPremium()).toBe(true);
    });

    it('should return false for free users', async () => {
      const user = await createTestUser({ role: 'free' });
      expect(user.isPremium()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isAdmin()
  // ---------------------------------------------------------------------------
  describe('isAdmin()', () => {
    it('should return true for admin users', async () => {
      const user = await createTestUser({ role: 'admin' });
      expect(user.isAdmin()).toBe(true);
    });

    it('should return false for premium users', async () => {
      const user = await createTestUser({ role: 'premium' });
      expect(user.isAdmin()).toBe(false);
    });

    it('should return false for free users', async () => {
      const user = await createTestUser({ role: 'free' });
      expect(user.isAdmin()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isSuspendedNow()
  // ---------------------------------------------------------------------------
  describe('isSuspendedNow()', () => {
    it('should return false when user is not suspended', async () => {
      const user = await createTestUser({
        moderationStatus: { isSuspended: false },
      });
      expect(user.isSuspendedNow()).toBe(false);
    });

    it('should return true for permanent suspension (no end date)', async () => {
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: null,
        },
      });
      expect(user.isSuspendedNow()).toBe(true);
    });

    it('should return true when temporary suspension has not expired', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: futureDate,
        },
      });
      expect(user.isSuspendedNow()).toBe(true);
    });

    it('should return false when temporary suspension has expired', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: pastDate,
        },
      });
      expect(user.isSuspendedNow()).toBe(false);
    });

    it('should handle missing moderationStatus gracefully', async () => {
      const user = await createTestUser();
      // Manually remove moderationStatus to simulate old data
      user.moderationStatus = undefined;
      expect(user.isSuspendedNow()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isBannedNow()
  // ---------------------------------------------------------------------------
  describe('isBannedNow()', () => {
    it('should return true when user is banned', async () => {
      const user = await createTestUser({
        moderationStatus: {
          isBanned: true,
          bannedAt: new Date(),
        },
      });
      expect(user.isBannedNow()).toBe(true);
    });

    it('should return false when user is not banned', async () => {
      const user = await createTestUser({
        moderationStatus: { isBanned: false },
      });
      expect(user.isBannedNow()).toBe(false);
    });

    it('should handle missing moderationStatus gracefully', async () => {
      const user = await createTestUser();
      user.moderationStatus = undefined;
      expect(user.isBannedNow()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // checkAndClearSuspension()
  // ---------------------------------------------------------------------------
  describe('checkAndClearSuspension()', () => {
    it('should return false when user is not suspended', async () => {
      const user = await createTestUser({
        moderationStatus: { isSuspended: false },
      });
      const result = await user.checkAndClearSuspension();
      expect(result).toBe(false);
    });

    it('should not clear permanent suspension', async () => {
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: null,
        },
        status: 'suspended',
      });
      const result = await user.checkAndClearSuspension();
      expect(result).toBe(false);
      expect(user.moderationStatus.isSuspended).toBe(true);
    });

    it('should clear expired temporary suspension and update status', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: pastDate,
        },
        status: 'suspended',
      });

      const result = await user.checkAndClearSuspension();

      expect(result).toBe(true);
      expect(user.moderationStatus.isSuspended).toBe(false);
      expect(user.status).toBe('active');
    });

    it('should save changes to database after clearing suspension', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: pastDate,
        },
        status: 'suspended',
      });

      await user.checkAndClearSuspension();

      // Re-fetch from database to verify persistence
      const freshUser = await User.findById(user._id);
      expect(freshUser.moderationStatus.isSuspended).toBe(false);
      expect(freshUser.status).toBe('active');
    });

    it('should not clear active temporary suspension', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const user = await createTestUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: futureDate,
        },
        status: 'suspended',
      });

      const result = await user.checkAndClearSuspension();

      expect(result).toBe(false);
      expect(user.moderationStatus.isSuspended).toBe(true);
      expect(user.status).toBe('suspended');
    });
  });

  // ---------------------------------------------------------------------------
  // hasFeatureAccess(featureName, roleConfig)
  // ---------------------------------------------------------------------------
  describe('hasFeatureAccess()', () => {
    it('should deny access when user has explicit false flag', async () => {
      const user = await createTestUser({
        role: 'premium',
        flags: new Map([['calendarEnabled', false]]),
      });
      expect(user.hasFeatureAccess('calendarEnabled')).toBe(false);
    });

    it('should grant access when user has explicit true flag', async () => {
      const user = await createTestUser({
        role: 'free',
        flags: new Map([['calendarEnabled', true]]),
      });
      expect(user.hasFeatureAccess('calendarEnabled')).toBe(true);
    });

    it('should use roleConfig when provided and no user flag set', async () => {
      const user = await createTestUser({ role: 'free' });
      const roleConfig = {
        features: new Map([['customFeature', true]]),
      };
      expect(user.hasFeatureAccess('customFeature', roleConfig)).toBe(true);
    });

    it('should handle roleConfig with plain object features', async () => {
      const user = await createTestUser({ role: 'free' });
      const roleConfig = {
        features: { customFeature: true },
      };
      expect(user.hasFeatureAccess('customFeature', roleConfig)).toBe(true);
    });

    it('should grant premium features to premium users without explicit flag', async () => {
      const user = await createTestUser({ role: 'premium' });
      expect(user.hasFeatureAccess('calendarEnabled')).toBe(true);
      expect(user.hasFeatureAccess('imagesEnabled')).toBe(true);
      expect(user.hasFeatureAccess('projectsEnabled')).toBe(true);
    });

    it('should grant premium features to admin users', async () => {
      const user = await createTestUser({ role: 'admin' });
      expect(user.hasFeatureAccess('weatherEnabled')).toBe(true);
      expect(user.hasFeatureAccess('analyticsEnabled')).toBe(true);
    });

    it('should deny premium features to free users without explicit flag', async () => {
      const user = await createTestUser({ role: 'free' });
      expect(user.hasFeatureAccess('calendarEnabled')).toBe(false);
    });

    it('should deny beta features even to premium users without explicit flag', async () => {
      const user = await createTestUser({ role: 'premium' });
      expect(user.hasFeatureAccess('fitnessEnabled')).toBe(false);
      expect(user.hasFeatureAccess('kbEnabled')).toBe(false);
    });

    it('should user flag override roleConfig', async () => {
      const user = await createTestUser({
        role: 'free',
        flags: new Map([['customFeature', false]]),
      });
      const roleConfig = {
        features: { customFeature: true },
      };
      // User's explicit false should win over roleConfig's true
      expect(user.hasFeatureAccess('customFeature', roleConfig)).toBe(false);
    });

    it('should return false for unknown feature with no config', async () => {
      const user = await createTestUser({ role: 'free' });
      expect(user.hasFeatureAccess('unknownFeature')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getEffectiveFlags(roleConfig)
  // ---------------------------------------------------------------------------
  describe('getEffectiveFlags()', () => {
    it('should return empty object when no flags or roleConfig', async () => {
      const user = await createTestUser();
      const flags = user.getEffectiveFlags(null);
      expect(flags).toEqual({});
    });

    it('should return role features when user has no flags', async () => {
      const user = await createTestUser();
      const roleConfig = {
        features: { roleFeature1: true, roleFeature2: false },
      };
      const flags = user.getEffectiveFlags(roleConfig);
      expect(flags.roleFeature1).toBe(true);
      expect(flags.roleFeature2).toBe(false);
    });

    it('should merge user flags with role features', async () => {
      const user = await createTestUser({
        flags: new Map([['userFeature', true]]),
      });
      const roleConfig = {
        features: { roleFeature: true },
      };
      const flags = user.getEffectiveFlags(roleConfig);
      expect(flags.roleFeature).toBe(true);
      expect(flags.userFeature).toBe(true);
    });

    it('should user flags override role features', async () => {
      const user = await createTestUser({
        flags: new Map([['sharedFeature', false]]),
      });
      const roleConfig = {
        features: { sharedFeature: true },
      };
      const flags = user.getEffectiveFlags(roleConfig);
      expect(flags.sharedFeature).toBe(false); // User's false overrides role's true
    });

    it('should handle roleConfig with Map features', async () => {
      const user = await createTestUser({
        flags: new Map([['userFeature', true]]),
      });
      const roleConfig = {
        features: new Map([['roleFeature', true]]),
      };
      const flags = user.getEffectiveFlags(roleConfig);
      expect(flags.roleFeature).toBe(true);
      expect(flags.userFeature).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getEffectiveLimits(roleConfig)
  // ---------------------------------------------------------------------------
  describe('getEffectiveLimits()', () => {
    it('should return defaults (-1 unlimited) when no roleConfig', async () => {
      const user = await createTestUser();
      const limits = user.getEffectiveLimits(null);

      expect(limits.maxNotes).toBe(-1);
      expect(limits.maxTasks).toBe(-1);
      expect(limits.maxProjects).toBe(-1);
      expect(limits.maxEvents).toBe(-1);
      expect(limits.maxImages).toBe(-1);
      expect(limits.maxStorageBytes).toBe(-1);
      expect(limits.maxCategories).toBe(-1);
    });

    it('should use roleConfig limits when provided', async () => {
      const user = await createTestUser();
      const roleConfig = {
        limits: {
          maxNotes: 100,
          maxTasks: 50,
          maxProjects: 10,
        },
      };
      const limits = user.getEffectiveLimits(roleConfig);

      expect(limits.maxNotes).toBe(100);
      expect(limits.maxTasks).toBe(50);
      expect(limits.maxProjects).toBe(10);
      expect(limits.maxEvents).toBe(-1); // Default for unspecified
    });

    it('should user limitOverrides override role limits', async () => {
      const user = await createTestUser({
        limitOverrides: new Map([
          ['maxNotes', 500],
          ['maxTasks', 200],
        ]),
      });
      const roleConfig = {
        limits: {
          maxNotes: 100,
          maxTasks: 50,
        },
      };
      const limits = user.getEffectiveLimits(roleConfig);

      expect(limits.maxNotes).toBe(500); // Override wins
      expect(limits.maxTasks).toBe(200); // Override wins
    });

    it('should not override with null or undefined values', async () => {
      const user = await createTestUser({
        limitOverrides: new Map([
          ['maxNotes', null],
        ]),
      });
      const roleConfig = {
        limits: { maxNotes: 100 },
      };
      const limits = user.getEffectiveLimits(roleConfig);

      expect(limits.maxNotes).toBe(100); // Role limit preserved
    });

    it('should allow 0 as valid override', async () => {
      const user = await createTestUser({
        limitOverrides: new Map([
          ['maxNotes', 0],
        ]),
      });
      const roleConfig = {
        limits: { maxNotes: 100 },
      };
      const limits = user.getEffectiveLimits(roleConfig);

      expect(limits.maxNotes).toBe(0); // 0 is valid override
    });

    it('should allow -1 (unlimited) as override', async () => {
      const user = await createTestUser({
        limitOverrides: new Map([
          ['maxNotes', -1],
        ]),
      });
      const roleConfig = {
        limits: { maxNotes: 100 },
      };
      const limits = user.getEffectiveLimits(roleConfig);

      expect(limits.maxNotes).toBe(-1); // Unlimited override
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentUsage()
  // ---------------------------------------------------------------------------
  describe('getCurrentUsage()', () => {
    it('should return zero counts for new user with no content', async () => {
      const user = await createTestUser();
      const usage = await user.getCurrentUsage();

      expect(usage.notes).toBe(0);
      expect(usage.tasks).toBe(0);
      expect(usage.projects).toBe(0);
      expect(usage.events).toBe(0);
      expect(usage.images).toBe(0);
      expect(usage.categories).toBe(0);
      expect(usage.storageBytes).toBe(0);
    });

    it('should count notes for user', async () => {
      const user = await createTestUser();
      const Note = mongoose.model('Note');

      // Create some notes for this user
      await Note.create([
        { userId: user._id, title: 'Note 1', content: '' },
        { userId: user._id, title: 'Note 2', content: '' },
        { userId: user._id, title: 'Note 3', content: '' },
      ]);

      const usage = await user.getCurrentUsage();
      expect(usage.notes).toBe(3);
    });

    it('should not count notes from other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const Note = mongoose.model('Note');

      await Note.create([
        { userId: user._id, title: 'My Note', content: '' },
        { userId: otherUser._id, title: 'Other Note', content: '' },
      ]);

      const usage = await user.getCurrentUsage();
      expect(usage.notes).toBe(1);
    });

    it('should count multiple content types', async () => {
      const user = await createTestUser();
      const Note = mongoose.model('Note');
      const Task = mongoose.model('Task');
      const Project = mongoose.model('Project');

      await Note.create({ userId: user._id, title: 'Note', content: '' });
      await Task.create([
        { userId: user._id, title: 'Task 1' },
        { userId: user._id, title: 'Task 2' },
      ]);
      await Project.create({ userId: user._id, title: 'Project' });

      const usage = await user.getCurrentUsage();
      expect(usage.notes).toBe(1);
      expect(usage.tasks).toBe(2);
      expect(usage.projects).toBe(1);
    });

    it('should calculate storage bytes from images', async () => {
      const user = await createTestUser();
      const Image = mongoose.model('Image');

      await Image.create([
        { userId: user._id, filename: 'img1.jpg', originalName: 'img1.jpg', format: 'jpg', size: 1000, storageKey: 'key1' },
        { userId: user._id, filename: 'img2.jpg', originalName: 'img2.jpg', format: 'jpg', size: 2500, storageKey: 'key2' },
        { userId: user._id, filename: 'img3.jpg', originalName: 'img3.jpg', format: 'jpg', size: 500, storageKey: 'key3' },
      ]);

      const usage = await user.getCurrentUsage();
      expect(usage.images).toBe(3);
      expect(usage.storageBytes).toBe(4000);
    });
  });

  // ---------------------------------------------------------------------------
  // toPublicProfile(viewerUser, isConnected)
  // ---------------------------------------------------------------------------
  describe('toPublicProfile()', () => {
    it('should show minimal info for private profile to non-connected viewer', async () => {
      const user = await createTestUser({
        profile: {
          displayName: 'John Doe',
          bio: 'My bio',
          location: 'New York',
        },
        socialSettings: {
          profileVisibility: 'private',
        },
      });

      const profile = user.toPublicProfile(null, false);

      expect(profile._id).toEqual(user._id);
      expect(profile.profile.displayName).toBe('John Doe');
      expect(profile.isPrivate).toBe(true);
      expect(profile.profile.bio).toBeUndefined();
      expect(profile.profile.location).toBeUndefined();
    });

    it('should show full profile for connections-only to connected user', async () => {
      const user = await createTestUser({
        profile: {
          displayName: 'Jane Doe',
          bio: 'My bio',
          location: 'Boston',
        },
        socialSettings: {
          profileVisibility: 'connections',
        },
      });
      const viewer = await createTestUser();

      const profile = user.toPublicProfile(viewer, true);

      expect(profile.isPrivate).toBeUndefined();
      expect(profile.profile.bio).toBe('My bio');
      expect(profile.profile.location).toBe('Boston');
    });

    it('should show full profile for public visibility', async () => {
      const user = await createTestUser({
        profile: {
          displayName: 'Public User',
          bio: 'Public bio',
        },
        socialSettings: {
          profileVisibility: 'public',
        },
      });

      const profile = user.toPublicProfile(null, false);

      expect(profile.isPrivate).toBeUndefined();
      expect(profile.profile.bio).toBe('Public bio');
    });

    it('should always show own profile to self', async () => {
      const user = await createTestUser({
        profile: {
          displayName: 'Private User',
          bio: 'Secret bio',
        },
        socialSettings: {
          profileVisibility: 'private',
        },
      });

      const profile = user.toPublicProfile(user, false);

      expect(profile.isPrivate).toBeUndefined();
      expect(profile.profile.bio).toBe('Secret bio');
    });

    it('should respect visibleFields settings', async () => {
      const user = await createTestUser({
        profile: {
          displayName: 'Selective User',
          bio: 'My bio',
          location: 'Hidden City',
          website: 'https://example.com',
        },
        socialSettings: {
          profileVisibility: 'public',
          visibleFields: {
            bio: true,
            location: false, // Hide location
            website: true,
            stats: false, // Hide stats
          },
        },
      });

      const profile = user.toPublicProfile(null, false);

      expect(profile.profile.bio).toBe('My bio');
      expect(profile.profile.location).toBeUndefined();
      expect(profile.profile.website).toBe('https://example.com');
      expect(profile.stats).toBeUndefined();
    });

    it('should show presence for connections when showOnlineStatus is connections', async () => {
      const user = await createTestUser({
        profile: { displayName: 'Online User' },
        socialSettings: {
          profileVisibility: 'public',
          showOnlineStatus: 'connections',
        },
        presence: {
          isOnline: true,
          currentStatus: 'available',
          statusMessage: 'Working',
        },
      });
      const viewer = await createTestUser();

      // Not connected - should not see presence
      const profileNotConnected = user.toPublicProfile(viewer, false);
      expect(profileNotConnected.presence).toBeUndefined();

      // Connected - should see presence
      const profileConnected = user.toPublicProfile(viewer, true);
      expect(profileConnected.presence).toBeDefined();
      expect(profileConnected.presence.isOnline).toBe(true);
      expect(profileConnected.presence.statusMessage).toBe('Working');
    });

    it('should show presence to everyone when showOnlineStatus is everyone', async () => {
      const user = await createTestUser({
        profile: { displayName: 'Public Presence' },
        socialSettings: {
          profileVisibility: 'public',
          showOnlineStatus: 'everyone',
        },
        presence: {
          isOnline: true,
          currentStatus: 'busy',
        },
      });

      const profile = user.toPublicProfile(null, false);
      expect(profile.presence).toBeDefined();
      expect(profile.presence.currentStatus).toBe('busy');
    });

    it('should include isConnected flag in response', async () => {
      const user = await createTestUser({
        socialSettings: { profileVisibility: 'public' },
      });

      const profileNotConnected = user.toPublicProfile(null, false);
      const profileConnected = user.toPublicProfile(null, true);

      expect(profileNotConnected.isConnected).toBe(false);
      expect(profileConnected.isConnected).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // canMessageUser(targetUser, isConnected)
  // ---------------------------------------------------------------------------
  describe('canMessageUser()', () => {
    it('should deny messaging when target has allowMessages: none', async () => {
      const sender = await createTestUser();
      const target = await createTestUser({
        socialSettings: { allowMessages: 'none' },
      });

      const canMessage = await sender.canMessageUser(target, true);
      expect(canMessage).toBe(false);
    });

    it('should allow messaging when target has allowMessages: everyone', async () => {
      const sender = await createTestUser();
      const target = await createTestUser({
        socialSettings: { allowMessages: 'everyone' },
      });

      const canMessage = await sender.canMessageUser(target, false);
      expect(canMessage).toBe(true);
    });

    it('should allow messaging connected users when allowMessages: connections', async () => {
      const sender = await createTestUser();
      const target = await createTestUser({
        socialSettings: { allowMessages: 'connections' },
      });

      const canMessageConnected = await sender.canMessageUser(target, true);
      const canMessageNotConnected = await sender.canMessageUser(target, false);

      expect(canMessageConnected).toBe(true);
      expect(canMessageNotConnected).toBe(false);
    });

    it('should default to connections when allowMessages not set', async () => {
      const sender = await createTestUser();
      const target = await createTestUser({
        socialSettings: {},
      });

      const canMessageConnected = await sender.canMessageUser(target, true);
      const canMessageNotConnected = await sender.canMessageUser(target, false);

      expect(canMessageConnected).toBe(true);
      expect(canMessageNotConnected).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // canRequestConnection(targetUser)
  // ---------------------------------------------------------------------------
  describe('canRequestConnection()', () => {
    it('should allow connection requests when target allows everyone', async () => {
      const requester = await createTestUser();
      const target = await createTestUser({
        socialSettings: { allowConnectionRequests: 'everyone' },
      });

      const canRequest = requester.canRequestConnection(target);
      expect(canRequest).toBe(true);
    });

    it('should deny connection requests when target has none', async () => {
      const requester = await createTestUser();
      const target = await createTestUser({
        socialSettings: { allowConnectionRequests: 'none' },
      });

      const canRequest = requester.canRequestConnection(target);
      expect(canRequest).toBe(false);
    });

    it('should default to allowing when setting not specified', async () => {
      const requester = await createTestUser();
      const target = await createTestUser({
        socialSettings: {},
      });

      const canRequest = requester.canRequestConnection(target);
      expect(canRequest).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    // ---------------------------------------------------------------------------
    // getFeatureLists()
    // ---------------------------------------------------------------------------
    describe('getFeatureLists()', () => {
      it('should return PREMIUM_FEATURES and BETA_FEATURES arrays', () => {
        const lists = User.getFeatureLists();

        expect(lists).toHaveProperty('PREMIUM_FEATURES');
        expect(lists).toHaveProperty('BETA_FEATURES');
        expect(Array.isArray(lists.PREMIUM_FEATURES)).toBe(true);
        expect(Array.isArray(lists.BETA_FEATURES)).toBe(true);
      });

      it('should include expected premium features', () => {
        const { PREMIUM_FEATURES } = User.getFeatureLists();

        expect(PREMIUM_FEATURES).toContain('calendarEnabled');
        expect(PREMIUM_FEATURES).toContain('imagesEnabled');
        expect(PREMIUM_FEATURES).toContain('projectsEnabled');
        expect(PREMIUM_FEATURES).toContain('weatherEnabled');
      });

      it('should include expected beta features', () => {
        const { BETA_FEATURES } = User.getFeatureLists();

        expect(BETA_FEATURES).toContain('fitnessEnabled');
        expect(BETA_FEATURES).toContain('kbEnabled');
        expect(BETA_FEATURES).toContain('messagesEnabled');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: VALIDATION
  // =============================================================================

  describe('Validation', () => {
    // ---------------------------------------------------------------------------
    // Email Validation
    // ---------------------------------------------------------------------------
    describe('Email validation', () => {
      it('should require email', async () => {
        await expect(
          User.create({ passwordHash: 'hash123' })
        ).rejects.toThrow(/Email is required/);
      });

      it('should reject invalid email format', async () => {
        await expect(
          User.create({ email: 'invalid-email', passwordHash: 'hash123' })
        ).rejects.toThrow(/valid email/);
      });

      it('should accept valid email', async () => {
        const user = await User.create({
          email: 'valid@example.com',
          passwordHash: 'hash123',
        });
        expect(user.email).toBe('valid@example.com');
      });

      it('should lowercase email', async () => {
        const user = await User.create({
          email: 'UPPERCASE@EXAMPLE.COM',
          passwordHash: 'hash123',
        });
        expect(user.email).toBe('uppercase@example.com');
      });

      it('should trim whitespace from email', async () => {
        const user = await User.create({
          email: '  spaces@example.com  ',
          passwordHash: 'hash123',
        });
        expect(user.email).toBe('spaces@example.com');
      });

      it('should enforce unique email', async () => {
        await User.create({
          email: 'unique@example.com',
          passwordHash: 'hash123',
        });

        await expect(
          User.create({
            email: 'unique@example.com',
            passwordHash: 'hash456',
          })
        ).rejects.toThrow(/duplicate key/i);
      });
    });

    // ---------------------------------------------------------------------------
    // Password Validation
    // ---------------------------------------------------------------------------
    describe('Password validation', () => {
      it('should require passwordHash', async () => {
        await expect(
          User.create({ email: 'test@example.com' })
        ).rejects.toThrow(/Password is required/);
      });

      it('should accept valid passwordHash', async () => {
        const user = await User.create({
          email: 'password@example.com',
          passwordHash: '$2a$10$validhash',
        });
        expect(user.passwordHash).toBe('$2a$10$validhash');
      });
    });

    // ---------------------------------------------------------------------------
    // Role Validation
    // ---------------------------------------------------------------------------
    describe('Role validation', () => {
      it('should default to free role', async () => {
        const user = await User.create({
          email: 'newuser@example.com',
          passwordHash: 'hash123',
        });
        expect(user.role).toBe('free');
      });

      it('should accept valid roles', async () => {
        const freeUser = await User.create({
          email: 'free@example.com',
          passwordHash: 'hash',
          role: 'free',
        });
        const premiumUser = await User.create({
          email: 'premium@example.com',
          passwordHash: 'hash',
          role: 'premium',
        });
        const adminUser = await User.create({
          email: 'admin@example.com',
          passwordHash: 'hash',
          role: 'admin',
        });

        expect(freeUser.role).toBe('free');
        expect(premiumUser.role).toBe('premium');
        expect(adminUser.role).toBe('admin');
      });

      it('should reject invalid role', async () => {
        await expect(
          User.create({
            email: 'invalid@example.com',
            passwordHash: 'hash',
            role: 'superuser',
          })
        ).rejects.toThrow();
      });
    });

    // ---------------------------------------------------------------------------
    // Status Validation
    // ---------------------------------------------------------------------------
    describe('Status validation', () => {
      it('should default to active status', async () => {
        const user = await User.create({
          email: 'status@example.com',
          passwordHash: 'hash',
        });
        expect(user.status).toBe('active');
      });

      it('should accept valid statuses', async () => {
        const user = await User.create({
          email: 'disabled@example.com',
          passwordHash: 'hash',
          status: 'disabled',
        });
        expect(user.status).toBe('disabled');
      });
    });

    // ---------------------------------------------------------------------------
    // Profile Field Validation
    // ---------------------------------------------------------------------------
    describe('Profile field validation', () => {
      it('should reject firstName exceeding max length', async () => {
        await expect(
          User.create({
            email: 'longname@example.com',
            passwordHash: 'hash',
            profile: { firstName: 'a'.repeat(51) },
          })
        ).rejects.toThrow(/cannot exceed 50 characters/);
      });

      it('should reject invalid website URL', async () => {
        await expect(
          User.create({
            email: 'badsite@example.com',
            passwordHash: 'hash',
            profile: { website: 'not-a-url' },
          })
        ).rejects.toThrow(/valid URL/);
      });

      it('should accept valid website URL', async () => {
        const user = await User.create({
          email: 'goodsite@example.com',
          passwordHash: 'hash',
          profile: { website: 'https://example.com' },
        });
        expect(user.profile.website).toBe('https://example.com');
      });

      it('should allow empty website', async () => {
        const user = await User.create({
          email: 'nosite@example.com',
          passwordHash: 'hash',
          profile: { website: '' },
        });
        expect(user.profile.website).toBe('');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    describe('Multiple feature flag sources', () => {
      it('should correctly prioritize: user false > roleConfig true', async () => {
        const user = await createTestUser({
          flags: new Map([['testFeature', false]]),
        });
        const roleConfig = {
          features: { testFeature: true },
        };

        expect(user.hasFeatureAccess('testFeature', roleConfig)).toBe(false);
      });

      it('should correctly prioritize: user true > premium auto-enable', async () => {
        const user = await createTestUser({
          role: 'free',
          flags: new Map([['calendarEnabled', true]]),
        });

        expect(user.hasFeatureAccess('calendarEnabled')).toBe(true);
      });

      it('should correctly prioritize: premium auto-enable when no explicit flag', async () => {
        const user = await createTestUser({ role: 'premium' });

        expect(user.hasFeatureAccess('calendarEnabled')).toBe(true);
      });
    });

    describe('Virtual properties', () => {
      it('should compute fullName from firstName and lastName', async () => {
        const user = await createTestUser({
          profile: {
            firstName: 'John',
            lastName: 'Doe',
          },
        });

        expect(user.profile.fullName).toBe('John Doe');
      });

      it('should return firstName only when lastName missing', async () => {
        const user = await createTestUser({
          profile: { firstName: 'John' },
        });

        expect(user.profile.fullName).toBe('John');
      });

      it('should return lastName only when firstName missing', async () => {
        const user = await createTestUser({
          profile: { lastName: 'Doe' },
        });

        expect(user.profile.fullName).toBe('Doe');
      });

      it('should return empty string when no name set', async () => {
        const user = await createTestUser();

        expect(user.profile.fullName).toBe('');
      });
    });

    describe('toSafeJSON()', () => {
      it('should exclude sensitive fields', async () => {
        const user = await createTestUser({
          passwordResetToken: 'secret-token',
          pendingEmailToken: 'email-token',
        });

        const safeJson = user.toSafeJSON();

        expect(safeJson.passwordHash).toBeUndefined();
        expect(safeJson.__v).toBeUndefined();
        expect(safeJson.passwordResetToken).toBeUndefined();
        expect(safeJson.pendingEmailToken).toBeUndefined();
      });

      it('should include effective flags for premium user', async () => {
        const user = await createTestUser({ role: 'premium' });

        const safeJson = user.toSafeJSON();

        expect(safeJson.flags.calendarEnabled).toBe(true);
        expect(safeJson.flags.imagesEnabled).toBe(true);
      });

      it('should respect explicit false flags for premium user', async () => {
        const user = await createTestUser({
          role: 'premium',
          flags: new Map([['calendarEnabled', false]]),
        });

        const safeJson = user.toSafeJSON();

        expect(safeJson.flags.calendarEnabled).toBe(false);
      });

      it('should use roleConfig for effective flags when provided', async () => {
        const user = await createTestUser({ role: 'free' });
        const roleConfig = {
          features: { specialFeature: true },
        };

        const safeJson = user.toSafeJSON(roleConfig);

        expect(safeJson.flags.specialFeature).toBe(true);
      });

      it('should convert limitOverrides Map to object', async () => {
        const user = await createTestUser({
          limitOverrides: new Map([['maxNotes', 500]]),
        });

        const safeJson = user.toSafeJSON();

        expect(safeJson.limitOverrides).toEqual({ maxNotes: 500 });
      });
    });

    describe('Suspension boundary conditions', () => {
      it('should handle suspension expiring at exact current time', async () => {
        // This tests the edge case of exact time boundary
        const now = new Date();
        const user = await createTestUser({
          moderationStatus: {
            isSuspended: true,
            suspendedUntil: now,
          },
        });

        // At the exact boundary, should be considered expired (>= check)
        const result = await user.checkAndClearSuspension();
        expect(result).toBe(true);
      });
    });

    describe('Default values', () => {
      it('should set correct defaults for new user', async () => {
        const user = await createTestUser();

        expect(user.role).toBe('free');
        expect(user.status).toBe('active');
        expect(user.moderationStatus.warningCount).toBe(0);
        expect(user.moderationStatus.isSuspended).toBe(false);
        expect(user.moderationStatus.isBanned).toBe(false);
        expect(user.socialSettings.profileVisibility).toBe('public');
        expect(user.socialSettings.allowMessages).toBe('connections');
        expect(user.presence.isOnline).toBe(false);
        expect(user.presence.currentStatus).toBe('offline');
      });
    });
  });
});
