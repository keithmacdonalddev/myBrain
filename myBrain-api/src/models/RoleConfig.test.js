/**
 * =============================================================================
 * ROLECONFIG MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the RoleConfig model, covering:
 * - Schema validation (role enum)
 * - Default roles (free, premium, admin)
 * - Permission definitions (limits and features)
 * - Feature flags per role
 * - Role hierarchy and defaults
 * - Static methods (getConfig, getAllConfigs, updateConfig, etc.)
 * - Instance methods (toSafeJSON)
 * - Sync with defaults behavior
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import RoleConfig, { getDefaultConfig } from './RoleConfig.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test admin ObjectId for tracking who makes changes.
 */
function createTestAdminId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Clears all role configs to ensure clean state for each test.
 */
async function clearRoleConfigs() {
  await RoleConfig.deleteMany({});
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('RoleConfig Model', () => {
  describe('Schema Validation', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    describe('Role enum validation', () => {
      it('should accept "free" as valid role', async () => {
        const config = await RoleConfig.create(getDefaultConfig('free'));
        expect(config._id).toBe('free');
      });

      it('should accept "premium" as valid role', async () => {
        const config = await RoleConfig.create(getDefaultConfig('premium'));
        expect(config._id).toBe('premium');
      });

      it('should accept "admin" as valid role', async () => {
        const config = await RoleConfig.create(getDefaultConfig('admin'));
        expect(config._id).toBe('admin');
      });

      it('should reject invalid role', async () => {
        await expect(
          RoleConfig.create({ _id: 'superuser' })
        ).rejects.toThrow();
      });
    });

    describe('Unique constraints', () => {
      it('should enforce unique role _id', async () => {
        await RoleConfig.create(getDefaultConfig('free'));

        await expect(
          RoleConfig.create(getDefaultConfig('free'))
        ).rejects.toThrow(/duplicate key/i);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    describe('Free role defaults', () => {
      it('should have restricted limits for free users', async () => {
        const config = await RoleConfig.getConfig('free');

        expect(config.limits.maxNotes).toBe(100);
        expect(config.limits.maxTasks).toBe(50);
        expect(config.limits.maxProjects).toBe(5);
        expect(config.limits.maxEvents).toBe(50);
        expect(config.limits.maxImages).toBe(20);
        expect(config.limits.maxStorageBytes).toBe(100 * 1024 * 1024); // 100MB
        expect(config.limits.maxCategories).toBe(3);
        expect(config.limits.maxFiles).toBe(100);
        expect(config.limits.maxFileSize).toBe(25 * 1024 * 1024); // 25MB
        expect(config.limits.maxFolders).toBe(10);
        expect(config.limits.maxVersionsPerFile).toBe(3);
        expect(config.limits.maxPublicShares).toBe(5);
      });

      it('should have all features disabled for free users', async () => {
        const config = await RoleConfig.getConfig('free');

        expect(config.features.get('calendarEnabled')).toBe(false);
        expect(config.features.get('projectsEnabled')).toBe(false);
        expect(config.features.get('imagesEnabled')).toBe(false);
        expect(config.features.get('filesEnabled')).toBe(false);
        expect(config.features.get('weatherEnabled')).toBe(false);
        expect(config.features.get('socialEnabled')).toBe(false);
        expect(config.features.get('fitnessEnabled')).toBe(false);
        expect(config.features.get('kbEnabled')).toBe(false);
      });
    });

    describe('Premium role defaults', () => {
      it('should have unlimited or high limits for premium users', async () => {
        const config = await RoleConfig.getConfig('premium');

        expect(config.limits.maxNotes).toBe(-1); // Unlimited
        expect(config.limits.maxTasks).toBe(-1);
        expect(config.limits.maxProjects).toBe(-1);
        expect(config.limits.maxEvents).toBe(-1);
        expect(config.limits.maxImages).toBe(-1);
        expect(config.limits.maxStorageBytes).toBe(10 * 1024 * 1024 * 1024); // 10GB
        expect(config.limits.maxCategories).toBe(-1);
        expect(config.limits.maxFiles).toBe(-1);
        expect(config.limits.maxFileSize).toBe(100 * 1024 * 1024); // 100MB
      });

      it('should have most features enabled for premium users', async () => {
        const config = await RoleConfig.getConfig('premium');

        expect(config.features.get('calendarEnabled')).toBe(true);
        expect(config.features.get('projectsEnabled')).toBe(true);
        expect(config.features.get('imagesEnabled')).toBe(true);
        expect(config.features.get('filesEnabled')).toBe(true);
        expect(config.features.get('weatherEnabled')).toBe(true);
        expect(config.features.get('socialEnabled')).toBe(true);
        expect(config.features.get('notesAdvancedSearch')).toBe(true);
        expect(config.features.get('notesExport')).toBe(true);
      });

      it('should have beta features disabled for premium users', async () => {
        const config = await RoleConfig.getConfig('premium');

        expect(config.features.get('fitnessEnabled')).toBe(false);
        expect(config.features.get('kbEnabled')).toBe(false);
        expect(config.features.get('messagesEnabled')).toBe(false);
      });
    });

    describe('Admin role defaults', () => {
      it('should have unlimited limits for admin users', async () => {
        const config = await RoleConfig.getConfig('admin');

        expect(config.limits.maxNotes).toBe(-1);
        expect(config.limits.maxTasks).toBe(-1);
        expect(config.limits.maxProjects).toBe(-1);
        expect(config.limits.maxEvents).toBe(-1);
        expect(config.limits.maxImages).toBe(-1);
        expect(config.limits.maxStorageBytes).toBe(-1);
        expect(config.limits.maxCategories).toBe(-1);
        expect(config.limits.maxFiles).toBe(-1);
        expect(config.limits.maxFileSize).toBe(-1);
        expect(config.limits.maxFolders).toBe(-1);
        expect(config.limits.maxVersionsPerFile).toBe(-1);
        expect(config.limits.maxPublicShares).toBe(-1);
      });

      it('should have all features enabled for admin users', async () => {
        const config = await RoleConfig.getConfig('admin');

        expect(config.features.get('calendarEnabled')).toBe(true);
        expect(config.features.get('projectsEnabled')).toBe(true);
        expect(config.features.get('imagesEnabled')).toBe(true);
        expect(config.features.get('filesEnabled')).toBe(true);
        expect(config.features.get('weatherEnabled')).toBe(true);
        expect(config.features.get('socialEnabled')).toBe(true);
        expect(config.features.get('fitnessEnabled')).toBe(true);
        expect(config.features.get('kbEnabled')).toBe(true);
        expect(config.features.get('messagesEnabled')).toBe(true);
        expect(config.features.get('notesAdvancedSearch')).toBe(true);
        expect(config.features.get('notesExport')).toBe(true);
      });
    });

    describe('File type defaults', () => {
      it('should allow all file types by default', async () => {
        const config = await RoleConfig.getConfig('free');

        expect(config.limits.allowedFileTypes).toEqual(['*']);
        expect(config.limits.forbiddenFileTypes).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: PERMISSION DEFINITIONS
  // ===========================================================================

  describe('Permission Definitions', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    describe('Limits structure', () => {
      it('should have all expected limit fields', async () => {
        const config = await RoleConfig.getConfig('free');

        const expectedFields = [
          'maxNotes', 'maxTasks', 'maxProjects', 'maxEvents',
          'maxImages', 'maxStorageBytes', 'maxCategories',
          'maxFiles', 'maxFileSize', 'maxFolders',
          'maxVersionsPerFile', 'maxPublicShares',
          'allowedFileTypes', 'forbiddenFileTypes'
        ];

        expectedFields.forEach(field => {
          expect(config.limits).toHaveProperty(field);
        });
      });

      it('should use -1 to represent unlimited', async () => {
        const config = await RoleConfig.getConfig('admin');

        // All numeric limits should be -1 for admin
        expect(config.limits.maxNotes).toBe(-1);
        expect(config.limits.maxTasks).toBe(-1);
        expect(config.limits.maxStorageBytes).toBe(-1);
      });
    });

    describe('Features structure', () => {
      it('should have features as a Map', async () => {
        const config = await RoleConfig.getConfig('free');

        expect(config.features).toBeInstanceOf(Map);
      });

      it('should have all expected feature flags', async () => {
        const config = await RoleConfig.getConfig('admin');

        const expectedFeatures = [
          'calendarEnabled', 'projectsEnabled', 'imagesEnabled',
          'filesEnabled', 'weatherEnabled', 'lifeAreasEnabled',
          'analyticsEnabled', 'savedLocationsEnabled', 'socialEnabled',
          'fitnessEnabled', 'kbEnabled', 'messagesEnabled',
          'notesAdvancedSearch', 'notesExport'
        ];

        expectedFeatures.forEach(feature => {
          expect(config.features.has(feature)).toBe(true);
        });
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT ROLES
  // ===========================================================================

  describe('Default Roles', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should create free role config with correct defaults', async () => {
      const config = await RoleConfig.getConfig('free');

      expect(config._id).toBe('free');
      expect(config.limits).toBeDefined();
      expect(config.features).toBeDefined();
    });

    it('should create admin role config with correct defaults', async () => {
      const config = await RoleConfig.getConfig('admin');

      expect(config._id).toBe('admin');
      expect(config.limits.maxNotes).toBe(-1);
    });

    it('should get all configs for all roles', async () => {
      const configs = await RoleConfig.getAllConfigs();

      expect(configs).toHaveLength(3);

      const roles = configs.map(c => c._id);
      expect(roles).toContain('free');
      expect(roles).toContain('premium');
      expect(roles).toContain('admin');
    });
  });

  // ===========================================================================
  // TEST SUITE: FEATURE FLAGS PER ROLE
  // ===========================================================================

  describe('Feature Flags Per Role', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should have different feature access by role', async () => {
      const freeConfig = await RoleConfig.getConfig('free');
      const premiumConfig = await RoleConfig.getConfig('premium');
      const adminConfig = await RoleConfig.getConfig('admin');

      // Calendar
      expect(freeConfig.features.get('calendarEnabled')).toBe(false);
      expect(premiumConfig.features.get('calendarEnabled')).toBe(true);
      expect(adminConfig.features.get('calendarEnabled')).toBe(true);

      // Beta feature (fitness)
      expect(freeConfig.features.get('fitnessEnabled')).toBe(false);
      expect(premiumConfig.features.get('fitnessEnabled')).toBe(false);
      expect(adminConfig.features.get('fitnessEnabled')).toBe(true);
    });

    it('should allow updating feature flags', async () => {
      const adminId = createTestAdminId();

      // Update free to have calendar access
      const config = await RoleConfig.updateConfig('free', {
        features: { calendarEnabled: true }
      }, adminId);

      expect(config.features.get('calendarEnabled')).toBe(true);
    });

    it('should preserve other features when updating one', async () => {
      const adminId = createTestAdminId();

      // Get initial state
      const initial = await RoleConfig.getConfig('free');
      const initialProjectsValue = initial.features.get('projectsEnabled');

      // Update only calendar
      await RoleConfig.updateConfig('free', {
        features: { calendarEnabled: true }
      }, adminId);

      // Projects should be unchanged
      const updated = await RoleConfig.getConfig('free');
      expect(updated.features.get('projectsEnabled')).toBe(initialProjectsValue);
    });
  });

  // ===========================================================================
  // TEST SUITE: ROLE HIERARCHY
  // ===========================================================================

  describe('Role Hierarchy', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should have ascending permissions: free < premium < admin', async () => {
      const free = await RoleConfig.getConfig('free');
      const premium = await RoleConfig.getConfig('premium');
      const admin = await RoleConfig.getConfig('admin');

      // Count enabled features
      const freeFeatureCount = Array.from(free.features.values()).filter(v => v).length;
      const premiumFeatureCount = Array.from(premium.features.values()).filter(v => v).length;
      const adminFeatureCount = Array.from(admin.features.values()).filter(v => v).length;

      expect(freeFeatureCount).toBeLessThan(premiumFeatureCount);
      expect(premiumFeatureCount).toBeLessThanOrEqual(adminFeatureCount);
    });

    it('should have ascending limits: free < premium < admin', async () => {
      const free = await RoleConfig.getConfig('free');
      const premium = await RoleConfig.getConfig('premium');
      const admin = await RoleConfig.getConfig('admin');

      // Free has hard limits
      expect(free.limits.maxNotes).toBeGreaterThan(0);
      expect(free.limits.maxNotes).toBeLessThan(premium.limits.maxNotes === -1 ? Infinity : premium.limits.maxNotes);

      // Premium has high or unlimited
      // Admin has unlimited
      expect(admin.limits.maxNotes).toBe(-1);
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    describe('getConfig()', () => {
      it('should return existing config', async () => {
        await RoleConfig.create(getDefaultConfig('free'));

        const config = await RoleConfig.getConfig('free');
        expect(config._id).toBe('free');
      });

      it('should create config if not exists', async () => {
        const config = await RoleConfig.getConfig('premium');

        expect(config._id).toBe('premium');

        // Should be saved to database
        const found = await RoleConfig.findById('premium');
        expect(found).toBeDefined();
      });

      it('should return free defaults for unknown role', async () => {
        // getDefaultConfig returns free for unknown roles
        const defaults = getDefaultConfig('unknown');
        expect(defaults._id).toBe('free');
      });
    });

    describe('getAllConfigs()', () => {
      it('should return configs for all three roles', async () => {
        const configs = await RoleConfig.getAllConfigs();

        expect(configs).toHaveLength(3);
      });

      it('should create missing configs', async () => {
        // Start with no configs
        const count = await RoleConfig.countDocuments();
        expect(count).toBe(0);

        // Get all should create them
        await RoleConfig.getAllConfigs();

        const newCount = await RoleConfig.countDocuments();
        expect(newCount).toBe(3);
      });
    });

    describe('updateConfig()', () => {
      it('should update limits', async () => {
        const adminId = createTestAdminId();

        const config = await RoleConfig.updateConfig('free', {
          limits: { maxNotes: 200 }
        }, adminId);

        expect(config.limits.maxNotes).toBe(200);
      });

      it('should update features', async () => {
        const adminId = createTestAdminId();

        const config = await RoleConfig.updateConfig('free', {
          features: { calendarEnabled: true }
        }, adminId);

        expect(config.features.get('calendarEnabled')).toBe(true);
      });

      it('should update both limits and features', async () => {
        const adminId = createTestAdminId();

        const config = await RoleConfig.updateConfig('free', {
          limits: { maxTasks: 100 },
          features: { projectsEnabled: true }
        }, adminId);

        expect(config.limits.maxTasks).toBe(100);
        expect(config.features.get('projectsEnabled')).toBe(true);
      });

      it('should track updatedBy', async () => {
        const adminId = createTestAdminId();

        const config = await RoleConfig.updateConfig('free', {
          limits: { maxNotes: 150 }
        }, adminId);

        expect(config.updatedBy.toString()).toBe(adminId.toString());
      });

      it('should remove feature when set to null', async () => {
        const adminId = createTestAdminId();

        // First add a custom feature
        await RoleConfig.updateConfig('free', {
          features: { customFeature: true }
        }, adminId);

        // Then remove it
        const config = await RoleConfig.updateConfig('free', {
          features: { customFeature: null }
        }, adminId);

        expect(config.features.has('customFeature')).toBe(false);
      });
    });

    describe('syncWithDefaults()', () => {
      it('should add missing features without overwriting existing', async () => {
        const adminId = createTestAdminId();

        // Create config with custom setting
        await RoleConfig.updateConfig('free', {
          features: { calendarEnabled: true } // Custom: free doesn't normally have this
        }, adminId);

        // Sync with defaults
        const config = await RoleConfig.syncWithDefaults('free', adminId);

        // Custom setting should be preserved
        expect(config.features.get('calendarEnabled')).toBe(true);

        // Should still have all default features
        expect(config.features.has('projectsEnabled')).toBe(true);
      });

      it('should add missing limits without overwriting existing', async () => {
        const adminId = createTestAdminId();

        // Create config with custom limit
        await RoleConfig.updateConfig('free', {
          limits: { maxNotes: 500 }
        }, adminId);

        // Sync
        const config = await RoleConfig.syncWithDefaults('free', adminId);

        // Custom limit preserved
        expect(config.limits.maxNotes).toBe(500);

        // Default limits still present
        expect(config.limits.maxTasks).toBeDefined();
      });
    });

    describe('resetToDefaults()', () => {
      it('should reset all settings to defaults', async () => {
        const adminId = createTestAdminId();

        // Customize the config
        await RoleConfig.updateConfig('free', {
          limits: { maxNotes: 999, maxTasks: 999 },
          features: { calendarEnabled: true, projectsEnabled: true }
        }, adminId);

        // Reset
        const config = await RoleConfig.resetToDefaults('free', adminId);

        // Should be back to defaults
        expect(config.limits.maxNotes).toBe(100);
        expect(config.limits.maxTasks).toBe(50);
        expect(config.features.get('calendarEnabled')).toBe(false);
      });

      it('should track who reset the config', async () => {
        const adminId = createTestAdminId();

        const config = await RoleConfig.resetToDefaults('free', adminId);

        expect(config.updatedBy.toString()).toBe(adminId.toString());
      });
    });

    describe('syncAllWithDefaults()', () => {
      it('should sync all three roles', async () => {
        const adminId = createTestAdminId();

        const results = await RoleConfig.syncAllWithDefaults(adminId);

        expect(results).toHaveLength(3);
        expect(results.map(r => r._id)).toContain('free');
        expect(results.map(r => r._id)).toContain('premium');
        expect(results.map(r => r._id)).toContain('admin');
      });
    });

    describe('getAllFeatures()', () => {
      it('should return array of feature definitions', () => {
        const features = RoleConfig.getAllFeatures();

        expect(Array.isArray(features)).toBe(true);
        expect(features.length).toBeGreaterThan(0);
      });

      it('should include feature key, label, description, and category', () => {
        const features = RoleConfig.getAllFeatures();
        const feature = features[0];

        expect(feature).toHaveProperty('key');
        expect(feature).toHaveProperty('label');
        expect(feature).toHaveProperty('description');
        expect(feature).toHaveProperty('category');
      });

      it('should have features in categories: optional, beta, enhanced', () => {
        const features = RoleConfig.getAllFeatures();
        const categories = [...new Set(features.map(f => f.category))];

        expect(categories).toContain('optional');
        expect(categories).toContain('beta');
        expect(categories).toContain('enhanced');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    describe('toSafeJSON()', () => {
      it('should convert features Map to object', async () => {
        const config = await RoleConfig.getConfig('free');
        const safeJson = config.toSafeJSON();

        expect(typeof safeJson.features).toBe('object');
        expect(safeJson.features instanceof Map).toBe(false);
      });

      it('should include all properties', async () => {
        const config = await RoleConfig.getConfig('premium');
        const safeJson = config.toSafeJSON();

        expect(safeJson._id).toBe('premium');
        expect(safeJson.limits).toBeDefined();
        expect(safeJson.features).toBeDefined();
      });

      it('should preserve feature values', async () => {
        const config = await RoleConfig.getConfig('admin');
        const safeJson = config.toSafeJSON();

        expect(safeJson.features.calendarEnabled).toBe(true);
        expect(safeJson.features.fitnessEnabled).toBe(true);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: PRE-SAVE MIDDLEWARE
  // ===========================================================================

  describe('Pre-save Middleware', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should update updatedAt on save', async () => {
      const adminId = createTestAdminId();
      const config = await RoleConfig.getConfig('free');

      const originalUpdatedAt = config.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      config.limits.maxNotes = 150;
      await config.save();

      expect(config.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should handle 0 as valid limit value', async () => {
      const adminId = createTestAdminId();

      const config = await RoleConfig.updateConfig('free', {
        limits: { maxNotes: 0 }
      }, adminId);

      expect(config.limits.maxNotes).toBe(0);
    });

    it('should handle negative values (unlimited indicator)', async () => {
      const adminId = createTestAdminId();

      const config = await RoleConfig.updateConfig('free', {
        limits: { maxNotes: -1 }
      }, adminId);

      expect(config.limits.maxNotes).toBe(-1);
    });

    it('should handle empty features update', async () => {
      const adminId = createTestAdminId();

      const config = await RoleConfig.updateConfig('free', {
        features: {}
      }, adminId);

      // Should not error, features should remain
      expect(config.features.size).toBeGreaterThan(0);
    });

    it('should handle empty limits update', async () => {
      const adminId = createTestAdminId();

      const config = await RoleConfig.updateConfig('free', {
        limits: {}
      }, adminId);

      // Should not error, limits should remain
      expect(config.limits.maxNotes).toBeDefined();
    });

    it('should handle custom file types', async () => {
      const adminId = createTestAdminId();

      const config = await RoleConfig.updateConfig('free', {
        limits: {
          allowedFileTypes: ['image/*', 'application/pdf'],
          forbiddenFileTypes: ['.exe', '.bat', '.sh']
        }
      }, adminId);

      expect(config.limits.allowedFileTypes).toEqual(['image/*', 'application/pdf']);
      expect(config.limits.forbiddenFileTypes).toEqual(['.exe', '.bat', '.sh']);
    });

    it('should handle rapid updates to same config', async () => {
      const adminId = createTestAdminId();

      // Rapid sequential updates
      for (let i = 0; i < 5; i++) {
        await RoleConfig.updateConfig('free', {
          limits: { maxNotes: 100 + i }
        }, adminId);
      }

      const config = await RoleConfig.getConfig('free');
      expect(config.limits.maxNotes).toBe(104);
    });

    it('should handle sequential updates to different fields', async () => {
      const adminId = createTestAdminId();

      // Sequential updates to different fields
      await RoleConfig.updateConfig('free', { limits: { maxNotes: 200 } }, adminId);
      await RoleConfig.updateConfig('free', { limits: { maxTasks: 100 } }, adminId);
      await RoleConfig.updateConfig('free', { features: { calendarEnabled: true } }, adminId);

      const config = await RoleConfig.getConfig('free');
      expect(config).toBeDefined();
      expect(config.limits.maxNotes).toBe(200);
      expect(config.limits.maxTasks).toBe(100);
      expect(config.features.get('calendarEnabled')).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: AGGREGATIONS
  // ===========================================================================

  describe('Aggregations', () => {
    beforeEach(async () => {
      await clearRoleConfigs();
    });

    it('should return all configs with correct structure', async () => {
      const configs = await RoleConfig.getAllConfigs();

      configs.forEach(config => {
        expect(config._id).toBeDefined();
        expect(['free', 'premium', 'admin']).toContain(config._id);
        expect(config.limits).toBeDefined();
        expect(config.features).toBeDefined();
      });
    });

    it('should allow comparing limits across roles', async () => {
      const configs = await RoleConfig.getAllConfigs();

      const freeConfig = configs.find(c => c._id === 'free');
      const premiumConfig = configs.find(c => c._id === 'premium');
      const adminConfig = configs.find(c => c._id === 'admin');

      // Free has hard limit, premium/admin have unlimited
      expect(freeConfig.limits.maxNotes).toBeGreaterThan(0);
      expect(premiumConfig.limits.maxNotes).toBe(-1);
      expect(adminConfig.limits.maxNotes).toBe(-1);
    });
  });

  // ===========================================================================
  // TEST SUITE: getDefaultConfig EXPORT
  // ===========================================================================

  describe('getDefaultConfig Export', () => {
    it('should export getDefaultConfig function', () => {
      expect(typeof getDefaultConfig).toBe('function');
    });

    it('should return complete config for each role', () => {
      const freeConfig = getDefaultConfig('free');
      const premiumConfig = getDefaultConfig('premium');
      const adminConfig = getDefaultConfig('admin');

      expect(freeConfig._id).toBe('free');
      expect(premiumConfig._id).toBe('premium');
      expect(adminConfig._id).toBe('admin');

      // Each should have limits and features
      [freeConfig, premiumConfig, adminConfig].forEach(config => {
        expect(config.limits).toBeDefined();
        expect(config.features).toBeDefined();
      });
    });

    it('should return free defaults for unknown role', () => {
      const unknownConfig = getDefaultConfig('superuser');

      expect(unknownConfig._id).toBe('free');
      expect(unknownConfig.limits.maxNotes).toBe(100);
    });
  });
});
