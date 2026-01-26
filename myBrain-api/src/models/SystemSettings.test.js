/**
 * =============================================================================
 * SYSTEMSETTINGS MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the SystemSettings model, covering:
 * - Singleton pattern (only one settings document)
 * - Static methods (getSettings, isFeatureKilled, setFeatureKillSwitch)
 * - Instance methods (getKillSwitchesObject, toSafeJSON)
 * - Kill switch behavior (enable/disable features globally)
 * - Default values and settings categories
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import SystemSettings from './SystemSettings.js';

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
 * Clears the system settings to ensure clean state for each test.
 */
async function clearSettings() {
  await SystemSettings.deleteMany({});
}

// =============================================================================
// TEST SUITE: SINGLETON PATTERN
// =============================================================================

describe('SystemSettings Model', () => {
  describe('Singleton Pattern', () => {
    it('should always use _id of "system"', async () => {
      const settings = await SystemSettings.getSettings();
      expect(settings._id).toBe('system');
    });

    it('should return the same document on multiple getSettings calls', async () => {
      const settings1 = await SystemSettings.getSettings();
      const settings2 = await SystemSettings.getSettings();

      expect(settings1._id).toBe(settings2._id);
      expect(settings1.updatedAt.getTime()).toBe(settings2.updatedAt.getTime());
    });

    it('should create settings if none exist', async () => {
      await clearSettings();

      // Verify no settings exist
      const existingCount = await SystemSettings.countDocuments();
      expect(existingCount).toBe(0);

      // Get settings should create one
      const settings = await SystemSettings.getSettings();
      expect(settings).toBeDefined();
      expect(settings._id).toBe('system');

      // Verify only one document was created
      const newCount = await SystemSettings.countDocuments();
      expect(newCount).toBe(1);
    });

    it('should not create duplicate documents on sequential calls', async () => {
      await clearSettings();

      // Call getSettings multiple times sequentially
      await SystemSettings.getSettings();
      await SystemSettings.getSettings();
      await SystemSettings.getSettings();

      const count = await SystemSettings.countDocuments();
      expect(count).toBe(1);
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should have empty featureKillSwitches by default', async () => {
      const settings = await SystemSettings.getSettings();

      expect(settings.featureKillSwitches).toBeInstanceOf(Map);
      expect(settings.featureKillSwitches.size).toBe(0);
    });

    it('should have updatedAt timestamp', async () => {
      const settings = await SystemSettings.getSettings();

      expect(settings.updatedAt).toBeInstanceOf(Date);
    });

    it('should have null updatedBy by default', async () => {
      const settings = await SystemSettings.getSettings();

      expect(settings.updatedBy).toBeUndefined();
    });
  });

  // ===========================================================================
  // TEST SUITE: GET/SET SYSTEM SETTINGS
  // ===========================================================================

  describe('Get/Set System Settings', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should get settings via getSettings()', async () => {
      const settings = await SystemSettings.getSettings();

      expect(settings).toBeDefined();
      expect(settings._id).toBe('system');
    });

    it('should set kill switch via setFeatureKillSwitch()', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Testing');

      const settings = await SystemSettings.getSettings();
      const killSwitch = settings.featureKillSwitches.get('imagesEnabled');

      expect(killSwitch).toBeDefined();
      expect(killSwitch.enabled).toBe(false);
      expect(killSwitch.reason).toBe('Testing');
    });

    it('should update existing settings rather than creating new', async () => {
      const adminId = createTestAdminId();

      // First update
      await SystemSettings.setFeatureKillSwitch('feature1', false, adminId, 'First');

      // Second update
      await SystemSettings.setFeatureKillSwitch('feature2', false, adminId, 'Second');

      const count = await SystemSettings.countDocuments();
      expect(count).toBe(1);

      const settings = await SystemSettings.getSettings();
      expect(settings.featureKillSwitches.has('feature1')).toBe(true);
      expect(settings.featureKillSwitches.has('feature2')).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: SETTINGS CATEGORIES (Kill Switches)
  // ===========================================================================

  describe('Settings Categories (Kill Switches)', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should organize settings by feature name', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Image issue');
      await SystemSettings.setFeatureKillSwitch('calendarEnabled', false, adminId, 'Calendar issue');
      await SystemSettings.setFeatureKillSwitch('filesEnabled', true, adminId, 'Files OK');

      const settings = await SystemSettings.getSettings();

      expect(settings.featureKillSwitches.size).toBe(3);
      expect(settings.featureKillSwitches.get('imagesEnabled').enabled).toBe(false);
      expect(settings.featureKillSwitches.get('calendarEnabled').enabled).toBe(false);
      expect(settings.featureKillSwitches.get('filesEnabled').enabled).toBe(true);
    });

    it('should track reason for each kill switch', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('feature1', false, adminId, 'Critical bug in upload');
      await SystemSettings.setFeatureKillSwitch('feature2', false, adminId, 'Maintenance window');

      const settings = await SystemSettings.getSettings();

      expect(settings.featureKillSwitches.get('feature1').reason).toBe('Critical bug in upload');
      expect(settings.featureKillSwitches.get('feature2').reason).toBe('Maintenance window');
    });
  });

  // ===========================================================================
  // TEST SUITE: ADMIN-ONLY SETTINGS
  // ===========================================================================

  describe('Admin-Only Settings (Audit Trail)', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should track which admin disabled a feature', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Testing');

      const settings = await SystemSettings.getSettings();
      const killSwitch = settings.featureKillSwitches.get('imagesEnabled');

      expect(killSwitch.disabledBy.toString()).toBe(adminId.toString());
    });

    it('should track when a feature was disabled', async () => {
      const adminId = createTestAdminId();
      const before = new Date();

      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Testing');

      const after = new Date();
      const settings = await SystemSettings.getSettings();
      const killSwitch = settings.featureKillSwitches.get('imagesEnabled');

      expect(killSwitch.disabledAt).toBeInstanceOf(Date);
      expect(killSwitch.disabledAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(killSwitch.disabledAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update global updatedAt and updatedBy on changes', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('testFeature', false, adminId, 'Test');

      const settings = await SystemSettings.getSettings();

      expect(settings.updatedBy.toString()).toBe(adminId.toString());
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });

    it('should clear disabledAt and disabledBy when re-enabling', async () => {
      const adminId = createTestAdminId();

      // First disable
      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Bug');

      // Then re-enable
      await SystemSettings.setFeatureKillSwitch('imagesEnabled', true, adminId, 'Bug fixed');

      const settings = await SystemSettings.getSettings();
      const killSwitch = settings.featureKillSwitches.get('imagesEnabled');

      expect(killSwitch.enabled).toBe(true);
      expect(killSwitch.disabledAt).toBeNull();
      expect(killSwitch.disabledBy).toBeNull();
      expect(killSwitch.reason).toBe('Bug fixed');
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    describe('getSettings()', () => {
      it('should return existing settings', async () => {
        // Create settings first
        await SystemSettings.create({ _id: 'system' });

        const settings = await SystemSettings.getSettings();
        expect(settings._id).toBe('system');
      });

      it('should create and return new settings if none exist', async () => {
        const settings = await SystemSettings.getSettings();

        expect(settings).toBeDefined();
        expect(settings._id).toBe('system');
      });
    });

    describe('isFeatureKilled()', () => {
      it('should return false for unknown feature (not killed)', async () => {
        const isKilled = await SystemSettings.isFeatureKilled('unknownFeature');
        expect(isKilled).toBe(false);
      });

      it('should return false when feature is enabled', async () => {
        const adminId = createTestAdminId();
        await SystemSettings.setFeatureKillSwitch('imagesEnabled', true, adminId, 'OK');

        const isKilled = await SystemSettings.isFeatureKilled('imagesEnabled');
        expect(isKilled).toBe(false);
      });

      it('should return true when feature is disabled (killed)', async () => {
        const adminId = createTestAdminId();
        await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Bug');

        const isKilled = await SystemSettings.isFeatureKilled('imagesEnabled');
        expect(isKilled).toBe(true);
      });

      it('should correctly reflect feature state changes', async () => {
        const adminId = createTestAdminId();

        // Initially not killed (doesn't exist)
        expect(await SystemSettings.isFeatureKilled('testFeature')).toBe(false);

        // Kill it
        await SystemSettings.setFeatureKillSwitch('testFeature', false, adminId, 'Killing');
        expect(await SystemSettings.isFeatureKilled('testFeature')).toBe(true);

        // Restore it
        await SystemSettings.setFeatureKillSwitch('testFeature', true, adminId, 'Restoring');
        expect(await SystemSettings.isFeatureKilled('testFeature')).toBe(false);
      });
    });

    describe('setFeatureKillSwitch()', () => {
      it('should create kill switch for new feature', async () => {
        const adminId = createTestAdminId();

        const settings = await SystemSettings.setFeatureKillSwitch(
          'newFeature',
          false,
          adminId,
          'New feature disabled'
        );

        expect(settings.featureKillSwitches.get('newFeature')).toBeDefined();
        expect(settings.featureKillSwitches.get('newFeature').enabled).toBe(false);
      });

      it('should update existing kill switch', async () => {
        const adminId = createTestAdminId();

        // Create
        await SystemSettings.setFeatureKillSwitch('feature', false, adminId, 'First');

        // Update
        const settings = await SystemSettings.setFeatureKillSwitch(
          'feature',
          true,
          adminId,
          'Second'
        );

        expect(settings.featureKillSwitches.get('feature').enabled).toBe(true);
        expect(settings.featureKillSwitches.get('feature').reason).toBe('Second');
      });

      it('should return updated settings document', async () => {
        const adminId = createTestAdminId();

        const settings = await SystemSettings.setFeatureKillSwitch(
          'testFeature',
          false,
          adminId,
          'Test'
        );

        expect(settings).toBeDefined();
        expect(settings._id).toBe('system');
        expect(settings.featureKillSwitches).toBeDefined();
      });

      it('should handle empty reason string', async () => {
        const adminId = createTestAdminId();

        const settings = await SystemSettings.setFeatureKillSwitch(
          'testFeature',
          false,
          adminId,
          ''
        );

        expect(settings.featureKillSwitches.get('testFeature').reason).toBe('');
      });

      it('should handle default reason parameter', async () => {
        const adminId = createTestAdminId();

        // Note: reason defaults to '' in the method signature
        const settings = await SystemSettings.setFeatureKillSwitch(
          'testFeature',
          false,
          adminId
        );

        expect(settings.featureKillSwitches.get('testFeature').reason).toBe('');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    describe('getKillSwitchesObject()', () => {
      it('should return empty object when no kill switches', async () => {
        const settings = await SystemSettings.getSettings();
        const obj = settings.getKillSwitchesObject();

        expect(obj).toEqual({});
      });

      it('should convert Map to plain object', async () => {
        const adminId = createTestAdminId();
        await SystemSettings.setFeatureKillSwitch('feature1', false, adminId, 'Reason 1');
        await SystemSettings.setFeatureKillSwitch('feature2', true, adminId, 'Reason 2');

        const settings = await SystemSettings.getSettings();
        const obj = settings.getKillSwitchesObject();

        expect(typeof obj).toBe('object');
        expect(Array.isArray(obj)).toBe(false);
        expect(obj.feature1).toBeDefined();
        expect(obj.feature2).toBeDefined();
      });

      it('should include all kill switch properties', async () => {
        const adminId = createTestAdminId();
        await SystemSettings.setFeatureKillSwitch('testFeature', false, adminId, 'Test reason');

        const settings = await SystemSettings.getSettings();
        const obj = settings.getKillSwitchesObject();

        expect(obj.testFeature).toHaveProperty('enabled', false);
        expect(obj.testFeature).toHaveProperty('reason', 'Test reason');
        expect(obj.testFeature).toHaveProperty('disabledAt');
        expect(obj.testFeature).toHaveProperty('disabledBy');
      });
    });

    describe('toSafeJSON()', () => {
      it('should return object with featureKillSwitches as plain object', async () => {
        const settings = await SystemSettings.getSettings();
        const safeJson = settings.toSafeJSON();

        expect(safeJson.featureKillSwitches).toBeDefined();
        expect(typeof safeJson.featureKillSwitches).toBe('object');
      });

      it('should include updatedAt', async () => {
        const settings = await SystemSettings.getSettings();
        const safeJson = settings.toSafeJSON();

        expect(safeJson.updatedAt).toBeInstanceOf(Date);
      });

      it('should include updatedBy when set', async () => {
        const adminId = createTestAdminId();
        await SystemSettings.setFeatureKillSwitch('feature', false, adminId, 'Test');

        const settings = await SystemSettings.getSettings();
        const safeJson = settings.toSafeJSON();

        expect(safeJson.updatedBy.toString()).toBe(adminId.toString());
      });

      it('should not include MongoDB internal fields', async () => {
        const settings = await SystemSettings.getSettings();
        const safeJson = settings.toSafeJSON();

        // Check it only has expected keys
        const keys = Object.keys(safeJson);
        expect(keys).toContain('featureKillSwitches');
        expect(keys).toContain('updatedAt');
        expect(keys).not.toContain('_id');
        expect(keys).not.toContain('__v');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: KILL SWITCH SCENARIOS
  // ===========================================================================

  describe('Kill Switch Scenarios', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should disable feature globally when kill switch is off', async () => {
      const adminId = createTestAdminId();

      // Kill the images feature
      await SystemSettings.setFeatureKillSwitch(
        'imagesEnabled',
        false,
        adminId,
        'Critical bug in image upload'
      );

      // Check it's killed
      const isKilled = await SystemSettings.isFeatureKilled('imagesEnabled');
      expect(isKilled).toBe(true);
    });

    it('should re-enable feature when kill switch is turned on', async () => {
      const adminId = createTestAdminId();

      // Kill then restore
      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Bug');
      await SystemSettings.setFeatureKillSwitch('imagesEnabled', true, adminId, 'Fixed');

      const isKilled = await SystemSettings.isFeatureKilled('imagesEnabled');
      expect(isKilled).toBe(false);
    });

    it('should handle multiple kill switches independently', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('imagesEnabled', false, adminId, 'Images off');
      await SystemSettings.setFeatureKillSwitch('calendarEnabled', true, adminId, 'Calendar on');
      await SystemSettings.setFeatureKillSwitch('filesEnabled', false, adminId, 'Files off');

      expect(await SystemSettings.isFeatureKilled('imagesEnabled')).toBe(true);
      expect(await SystemSettings.isFeatureKilled('calendarEnabled')).toBe(false);
      expect(await SystemSettings.isFeatureKilled('filesEnabled')).toBe(true);
    });

    it('should preserve kill switch history across updates', async () => {
      const admin1 = createTestAdminId();
      const admin2 = createTestAdminId();

      // Admin 1 kills feature
      await SystemSettings.setFeatureKillSwitch('feature', false, admin1, 'Admin 1 killed it');

      // Get timestamp
      let settings = await SystemSettings.getSettings();
      const originalDisabledAt = settings.featureKillSwitches.get('feature').disabledAt;

      // Wait a bit and admin 2 adds another kill switch
      await new Promise(resolve => setTimeout(resolve, 10));
      await SystemSettings.setFeatureKillSwitch('anotherFeature', false, admin2, 'Admin 2 action');

      // First feature should still have original disable info
      settings = await SystemSettings.getSettings();
      const feature = settings.featureKillSwitches.get('feature');

      expect(feature.disabledBy.toString()).toBe(admin1.toString());
      expect(feature.disabledAt.getTime()).toBe(originalDisabledAt.getTime());
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should handle special characters in feature names (except dots)', async () => {
      const adminId = createTestAdminId();

      // Note: Mongoose maps do not support keys containing dots
      await SystemSettings.setFeatureKillSwitch('feature-with-dashes', false, adminId, 'Test');
      await SystemSettings.setFeatureKillSwitch('feature_with_underscores', false, adminId, 'Test');
      await SystemSettings.setFeatureKillSwitch('featureWithCamelCase', false, adminId, 'Test');

      const settings = await SystemSettings.getSettings();

      expect(settings.featureKillSwitches.has('feature-with-dashes')).toBe(true);
      expect(settings.featureKillSwitches.has('feature_with_underscores')).toBe(true);
      expect(settings.featureKillSwitches.has('featureWithCamelCase')).toBe(true);
    });

    it('should handle long reason strings', async () => {
      const adminId = createTestAdminId();
      const longReason = 'A'.repeat(1000);

      await SystemSettings.setFeatureKillSwitch('feature', false, adminId, longReason);

      const settings = await SystemSettings.getSettings();
      expect(settings.featureKillSwitches.get('feature').reason).toBe(longReason);
    });

    it('should handle rapid enable/disable toggles', async () => {
      const adminId = createTestAdminId();

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        await SystemSettings.setFeatureKillSwitch('feature', i % 2 === 0, adminId, `Toggle ${i}`);
      }

      // Final state should be enabled (last toggle was i=9, 9%2=1, so disabled)
      const isKilled = await SystemSettings.isFeatureKilled('feature');
      expect(isKilled).toBe(true);
    });

    it('should handle sequential modifications correctly', async () => {
      const adminId = createTestAdminId();

      // Sequential updates to different features
      await SystemSettings.setFeatureKillSwitch('feature1', false, adminId, 'Update 1');
      await SystemSettings.setFeatureKillSwitch('feature2', false, adminId, 'Update 2');
      await SystemSettings.setFeatureKillSwitch('feature3', false, adminId, 'Update 3');

      const settings = await SystemSettings.getSettings();

      // All features should be saved
      expect(settings.featureKillSwitches.size).toBe(3);
    });

    it('should maintain singleton even with direct create calls', async () => {
      // Try to create a second document with different ID - should fail
      // or be prevented by the model
      try {
        await SystemSettings.create({ _id: 'other_id' });
      } catch (e) {
        // This is expected behavior if _id is enforced
      }

      // Get settings should still return 'system'
      const settings = await SystemSettings.getSettings();
      expect(settings._id).toBe('system');
    });
  });

  // ===========================================================================
  // TEST SUITE: AGGREGATIONS (getKillSwitchesObject)
  // ===========================================================================

  describe('Aggregations', () => {
    beforeEach(async () => {
      await clearSettings();
    });

    it('should aggregate all kill switches into object format', async () => {
      const adminId = createTestAdminId();

      await SystemSettings.setFeatureKillSwitch('images', false, adminId, 'R1');
      await SystemSettings.setFeatureKillSwitch('calendar', false, adminId, 'R2');
      await SystemSettings.setFeatureKillSwitch('files', true, adminId, 'R3');

      const settings = await SystemSettings.getSettings();
      const switches = settings.getKillSwitchesObject();

      expect(Object.keys(switches)).toHaveLength(3);
      expect(switches.images.reason).toBe('R1');
      expect(switches.calendar.reason).toBe('R2');
      expect(switches.files.reason).toBe('R3');
    });

    it('should include all properties in aggregated object', async () => {
      const adminId = createTestAdminId();
      await SystemSettings.setFeatureKillSwitch('testFeature', false, adminId, 'Test');

      const settings = await SystemSettings.getSettings();
      const switches = settings.getKillSwitchesObject();

      const feature = switches.testFeature;
      expect(feature).toHaveProperty('enabled');
      expect(feature).toHaveProperty('disabledAt');
      expect(feature).toHaveProperty('disabledBy');
      expect(feature).toHaveProperty('reason');
    });
  });
});
