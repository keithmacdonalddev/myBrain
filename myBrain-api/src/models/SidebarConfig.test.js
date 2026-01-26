/**
 * =============================================================================
 * SIDEBAR CONFIG MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the SidebarConfig model, covering:
 * - Singleton pattern (single config document with ID 'sidebar')
 * - Schema validation (required fields for items and sections)
 * - Default configuration (default items and sections)
 * - Menu item visibility and ordering
 * - Static methods (getConfig, updateConfig, resetToDefaults)
 * - Instance methods (toSafeJSON)
 * - Feature flag and admin requirements
 * - Order customization
 * - Edge cases
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import SidebarConfig from './SidebarConfig.js';
import User from './User.js';

// Import test setup for MongoDB Memory Server
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
 * Override any field by passing in the overrides object.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'admin',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Clears the sidebar config to ensure clean state between tests.
 */
async function clearSidebarConfig() {
  await SidebarConfig.deleteMany({});
}

// =============================================================================
// TEST SUITE: SINGLETON PATTERN
// =============================================================================

describe('SidebarConfig Model', () => {
  // Clear config before each test to ensure clean state
  beforeEach(async () => {
    await clearSidebarConfig();
  });

  describe('Singleton Pattern', () => {
    it('should create config with ID sidebar', async () => {
      const config = await SidebarConfig.getConfig();
      expect(config._id).toBe('sidebar');
    });

    it('should return same config on subsequent getConfig calls', async () => {
      const config1 = await SidebarConfig.getConfig();
      const config2 = await SidebarConfig.getConfig();

      expect(config1._id).toBe(config2._id);
    });

    it('should create config if none exists', async () => {
      // Ensure no config exists
      const count = await SidebarConfig.countDocuments();
      expect(count).toBe(0);

      // getConfig should create it
      await SidebarConfig.getConfig();

      const newCount = await SidebarConfig.countDocuments();
      expect(newCount).toBe(1);
    });

    it('should not create duplicate configs', async () => {
      // Call getConfig multiple times
      await SidebarConfig.getConfig();
      await SidebarConfig.getConfig();
      await SidebarConfig.getConfig();

      const count = await SidebarConfig.countDocuments();
      expect(count).toBe(1);
    });

    it('should find config by ID sidebar', async () => {
      await SidebarConfig.getConfig();

      const found = await SidebarConfig.findById('sidebar');
      expect(found).not.toBeNull();
      expect(found._id).toBe('sidebar');
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT CONFIGURATION
  // ===========================================================================

  describe('Default Configuration', () => {
    describe('Default Items', () => {
      it('should include dashboard in default items', async () => {
        const config = await SidebarConfig.getConfig();
        const dashboard = config.items.find(item => item.key === 'dashboard');

        expect(dashboard).toBeDefined();
        expect(dashboard.label).toBe('Dashboard');
        expect(dashboard.icon).toBe('LayoutDashboard');
        expect(dashboard.path).toBe('/app');
        expect(dashboard.section).toBe('main');
      });

      it('should include today in default items', async () => {
        const config = await SidebarConfig.getConfig();
        const today = config.items.find(item => item.key === 'today');

        expect(today).toBeDefined();
        expect(today.label).toBe('Today');
        expect(today.path).toBe('/app/today');
      });

      it('should include notes in default items', async () => {
        const config = await SidebarConfig.getConfig();
        const notes = config.items.find(item => item.key === 'notes');

        expect(notes).toBeDefined();
        expect(notes.label).toBe('Notes');
        expect(notes.section).toBe('working-memory');
      });

      it('should include tasks in default items', async () => {
        const config = await SidebarConfig.getConfig();
        const tasks = config.items.find(item => item.key === 'tasks');

        expect(tasks).toBeDefined();
        expect(tasks.label).toBe('Tasks');
        expect(tasks.icon).toBe('CheckSquare');
      });

      it('should include projects with feature flag', async () => {
        const config = await SidebarConfig.getConfig();
        const projects = config.items.find(item => item.key === 'projects');

        expect(projects).toBeDefined();
        expect(projects.featureFlag).toBe('projectsEnabled');
      });

      it('should include admin item with requiresAdmin flag', async () => {
        const config = await SidebarConfig.getConfig();
        const admin = config.items.find(item => item.key === 'admin');

        expect(admin).toBeDefined();
        expect(admin.requiresAdmin).toBe(true);
        expect(admin.path).toBe('/admin');
      });

      it('should have all items visible by default', async () => {
        const config = await SidebarConfig.getConfig();
        const invisibleItems = config.items.filter(item => item.visible === false);

        expect(invisibleItems.length).toBe(0);
      });
    });

    describe('Default Sections', () => {
      it('should include main section', async () => {
        const config = await SidebarConfig.getConfig();
        const main = config.sections.find(s => s.key === 'main');

        expect(main).toBeDefined();
        expect(main.label).toBe('Main');
        expect(main.order).toBe(0);
        expect(main.collapsible).toBe(false);
      });

      it('should include working-memory section', async () => {
        const config = await SidebarConfig.getConfig();
        const workingMemory = config.sections.find(s => s.key === 'working-memory');

        expect(workingMemory).toBeDefined();
        expect(workingMemory.label).toBe('Working Memory');
        expect(workingMemory.order).toBe(1);
      });

      it('should include social section', async () => {
        const config = await SidebarConfig.getConfig();
        const social = config.sections.find(s => s.key === 'social');

        expect(social).toBeDefined();
        expect(social.label).toBe('Social');
        expect(social.order).toBe(2);
      });

      it('should include categories section (collapsible)', async () => {
        const config = await SidebarConfig.getConfig();
        const categories = config.sections.find(s => s.key === 'categories');

        expect(categories).toBeDefined();
        expect(categories.collapsible).toBe(true);
      });

      it('should include beta section (collapsible)', async () => {
        const config = await SidebarConfig.getConfig();
        const beta = config.sections.find(s => s.key === 'beta');

        expect(beta).toBeDefined();
        expect(beta.collapsible).toBe(true);
        expect(beta.order).toBe(4);
      });

      it('should include admin section', async () => {
        const config = await SidebarConfig.getConfig();
        const admin = config.sections.find(s => s.key === 'admin');

        expect(admin).toBeDefined();
        expect(admin.order).toBe(5);
      });

      it('should have sections in correct order', async () => {
        const config = await SidebarConfig.getConfig();
        const sortedSections = [...config.sections].sort((a, b) => a.order - b.order);

        expect(sortedSections[0].key).toBe('main');
        expect(sortedSections[1].key).toBe('working-memory');
        expect(sortedSections[2].key).toBe('social');
        expect(sortedSections[3].key).toBe('categories');
        expect(sortedSections[4].key).toBe('beta');
        expect(sortedSections[5].key).toBe('admin');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: MENU ITEM VISIBILITY
  // ===========================================================================

  describe('Menu Item Visibility', () => {
    it('should allow setting item visibility to false', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      // Update to hide notes
      const updatedItems = config.items.map(item =>
        item.key === 'notes' ? { ...item.toObject(), visible: false } : item.toObject()
      );

      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const notes = updated.items.find(item => item.key === 'notes');

      expect(notes.visible).toBe(false);
    });

    it('should allow setting item visibility to true', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      // First hide, then show
      let updatedItems = config.items.map(item =>
        item.key === 'notes' ? { ...item.toObject(), visible: false } : item.toObject()
      );
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const hiddenConfig = await SidebarConfig.getConfig();
      updatedItems = hiddenConfig.items.map(item =>
        item.key === 'notes' ? { ...item.toObject(), visible: true } : item.toObject()
      );
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const notes = updated.items.find(item => item.key === 'notes');

      expect(notes.visible).toBe(true);
    });

    it('should preserve visibility for other items when updating one', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      // Hide only notes
      const updatedItems = config.items.map(item =>
        item.key === 'notes' ? { ...item.toObject(), visible: false } : item.toObject()
      );

      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const tasks = updated.items.find(item => item.key === 'tasks');
      const dashboard = updated.items.find(item => item.key === 'dashboard');

      expect(tasks.visible).toBe(true);
      expect(dashboard.visible).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: ORDER CUSTOMIZATION
  // ===========================================================================

  describe('Order Customization', () => {
    it('should allow changing item order within section', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      // Swap notes and tasks order
      const updatedItems = config.items.map(item => {
        if (item.key === 'notes') return { ...item.toObject(), order: 1 };
        if (item.key === 'tasks') return { ...item.toObject(), order: 0 };
        return item.toObject();
      });

      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const notes = updated.items.find(item => item.key === 'notes');
      const tasks = updated.items.find(item => item.key === 'tasks');

      expect(tasks.order).toBe(0);
      expect(notes.order).toBe(1);
    });

    it('should allow changing section order', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      // Move social before working-memory
      const updatedSections = config.sections.map(section => {
        if (section.key === 'social') return { ...section.toObject(), order: 1 };
        if (section.key === 'working-memory') return { ...section.toObject(), order: 2 };
        return section.toObject();
      });

      await SidebarConfig.updateConfig({ sections: updatedSections }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const social = updated.sections.find(s => s.key === 'social');
      const workingMemory = updated.sections.find(s => s.key === 'working-memory');

      expect(social.order).toBe(1);
      expect(workingMemory.order).toBe(2);
    });

    it('should maintain order consistency after multiple updates', async () => {
      const admin = await createTestUser();

      // First update
      let config = await SidebarConfig.getConfig();
      let updatedItems = config.items.map(item => {
        if (item.key === 'notes') return { ...item.toObject(), order: 5 };
        return item.toObject();
      });
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      // Second update
      config = await SidebarConfig.getConfig();
      updatedItems = config.items.map(item => {
        if (item.key === 'tasks') return { ...item.toObject(), order: 6 };
        return item.toObject();
      });
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const final = await SidebarConfig.getConfig();
      const notes = final.items.find(item => item.key === 'notes');
      const tasks = final.items.find(item => item.key === 'tasks');

      expect(notes.order).toBe(5);
      expect(tasks.order).toBe(6);
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    describe('getConfig()', () => {
      it('should create config with defaults if none exists', async () => {
        const config = await SidebarConfig.getConfig();

        expect(config).not.toBeNull();
        expect(config.items.length).toBeGreaterThan(0);
        expect(config.sections.length).toBeGreaterThan(0);
      });

      it('should return existing config if one exists', async () => {
        // Create config
        await SidebarConfig.getConfig();

        // Get same config
        const config = await SidebarConfig.getConfig();

        expect(config._id).toBe('sidebar');
      });
    });

    describe('updateConfig()', () => {
      it('should update items when provided', async () => {
        const admin = await createTestUser();
        const newItem = {
          key: 'custom',
          label: 'Custom Feature',
          icon: 'Star',
          path: '/app/custom',
          section: 'main',
          order: 10,
          visible: true,
          featureFlag: null,
          requiresAdmin: false,
        };

        const config = await SidebarConfig.getConfig();
        const updatedItems = [...config.items.map(i => i.toObject()), newItem];

        await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

        const updated = await SidebarConfig.getConfig();
        const custom = updated.items.find(item => item.key === 'custom');

        expect(custom).toBeDefined();
        expect(custom.label).toBe('Custom Feature');
      });

      it('should update sections when provided', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const updatedSections = config.sections.map(s => {
          if (s.key === 'main') return { ...s.toObject(), label: 'Main Menu' };
          return s.toObject();
        });

        await SidebarConfig.updateConfig({ sections: updatedSections }, admin._id);

        const updated = await SidebarConfig.getConfig();
        const main = updated.sections.find(s => s.key === 'main');

        expect(main.label).toBe('Main Menu');
      });

      it('should record updatedBy admin ID', async () => {
        const admin = await createTestUser();

        await SidebarConfig.updateConfig({}, admin._id);

        const config = await SidebarConfig.getConfig();
        expect(config.updatedBy.toString()).toBe(admin._id.toString());
      });

      it('should update updatedAt timestamp', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();
        const originalUpdatedAt = config.updatedAt;

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));

        await SidebarConfig.updateConfig({}, admin._id);

        const updated = await SidebarConfig.getConfig();
        expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });

      it('should not update items if not provided', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();
        const originalItemCount = config.items.length;

        await SidebarConfig.updateConfig({ sections: config.sections.map(s => s.toObject()) }, admin._id);

        const updated = await SidebarConfig.getConfig();
        expect(updated.items.length).toBe(originalItemCount);
      });

      it('should not update sections if not provided', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();
        const originalSectionCount = config.sections.length;

        await SidebarConfig.updateConfig({ items: config.items.map(i => i.toObject()) }, admin._id);

        const updated = await SidebarConfig.getConfig();
        expect(updated.sections.length).toBe(originalSectionCount);
      });
    });

    describe('resetToDefaults()', () => {
      it('should reset items to defaults', async () => {
        const admin = await createTestUser();

        // Modify config
        const config = await SidebarConfig.getConfig();
        const modifiedItems = config.items.map(item => ({
          ...item.toObject(),
          visible: false,
        }));
        await SidebarConfig.updateConfig({ items: modifiedItems }, admin._id);

        // Reset
        await SidebarConfig.resetToDefaults(admin._id);

        const reset = await SidebarConfig.getConfig();
        const visibleItems = reset.items.filter(item => item.visible === true);

        expect(visibleItems.length).toBe(reset.items.length);
      });

      it('should reset sections to defaults', async () => {
        const admin = await createTestUser();

        // Modify config
        const config = await SidebarConfig.getConfig();
        const modifiedSections = config.sections.map(section => ({
          ...section.toObject(),
          label: 'Modified',
        }));
        await SidebarConfig.updateConfig({ sections: modifiedSections }, admin._id);

        // Reset
        await SidebarConfig.resetToDefaults(admin._id);

        const reset = await SidebarConfig.getConfig();
        const main = reset.sections.find(s => s.key === 'main');

        expect(main.label).toBe('Main');
      });

      it('should record updatedBy admin ID on reset', async () => {
        const admin = await createTestUser();

        await SidebarConfig.resetToDefaults(admin._id);

        const config = await SidebarConfig.getConfig();
        expect(config.updatedBy.toString()).toBe(admin._id.toString());
      });

      it('should update updatedAt on reset', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();
        const originalUpdatedAt = config.updatedAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        await SidebarConfig.resetToDefaults(admin._id);

        const reset = await SidebarConfig.getConfig();
        expect(reset.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });
    });

    describe('getDefaultItems()', () => {
      it('should return array of default items', () => {
        const defaultItems = SidebarConfig.getDefaultItems();

        expect(Array.isArray(defaultItems)).toBe(true);
        expect(defaultItems.length).toBeGreaterThan(0);
      });

      it('should include dashboard in default items', () => {
        const defaultItems = SidebarConfig.getDefaultItems();
        const dashboard = defaultItems.find(item => item.key === 'dashboard');

        expect(dashboard).toBeDefined();
      });

      it('should not be affected by config modifications', async () => {
        const admin = await createTestUser();

        // Modify config
        const config = await SidebarConfig.getConfig();
        const modifiedItems = config.items.slice(0, 2).map(i => i.toObject());
        await SidebarConfig.updateConfig({ items: modifiedItems }, admin._id);

        // getDefaultItems should still return all defaults
        const defaultItems = SidebarConfig.getDefaultItems();

        expect(defaultItems.length).toBeGreaterThan(2);
      });
    });

    describe('getDefaultSections()', () => {
      it('should return array of default sections', () => {
        const defaultSections = SidebarConfig.getDefaultSections();

        expect(Array.isArray(defaultSections)).toBe(true);
        expect(defaultSections.length).toBeGreaterThan(0);
      });

      it('should include main section in defaults', () => {
        const defaultSections = SidebarConfig.getDefaultSections();
        const main = defaultSections.find(s => s.key === 'main');

        expect(main).toBeDefined();
      });

      it('should not be affected by config modifications', async () => {
        const admin = await createTestUser();

        // Modify config
        const config = await SidebarConfig.getConfig();
        const modifiedSections = config.sections.slice(0, 2).map(s => s.toObject());
        await SidebarConfig.updateConfig({ sections: modifiedSections }, admin._id);

        // getDefaultSections should still return all defaults
        const defaultSections = SidebarConfig.getDefaultSections();

        expect(defaultSections.length).toBeGreaterThan(2);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should return object with items array', async () => {
        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(Array.isArray(safeJson.items)).toBe(true);
      });

      it('should return object with sections array', async () => {
        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(Array.isArray(safeJson.sections)).toBe(true);
      });

      it('should include updatedAt', async () => {
        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(safeJson.updatedAt).toBeDefined();
      });

      it('should include updatedBy if set', async () => {
        const admin = await createTestUser();
        await SidebarConfig.updateConfig({}, admin._id);

        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(safeJson.updatedBy).toBeDefined();
      });

      it('should not include _id', async () => {
        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(safeJson._id).toBeUndefined();
      });

      it('should not include __v', async () => {
        const config = await SidebarConfig.getConfig();
        const safeJson = config.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: FEATURE FLAGS AND ADMIN REQUIREMENTS
  // ===========================================================================

  describe('Feature Flags and Admin Requirements', () => {
    it('should mark projects as requiring projectsEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const projects = config.items.find(item => item.key === 'projects');

      expect(projects.featureFlag).toBe('projectsEnabled');
    });

    it('should mark images as requiring imagesEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const images = config.items.find(item => item.key === 'images');

      expect(images.featureFlag).toBe('imagesEnabled');
    });

    it('should mark calendar as requiring calendarEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const calendar = config.items.find(item => item.key === 'calendar');

      expect(calendar.featureFlag).toBe('calendarEnabled');
    });

    it('should mark social items as requiring socialEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const connections = config.items.find(item => item.key === 'connections');
      const messages = config.items.find(item => item.key === 'messages');
      const shared = config.items.find(item => item.key === 'shared');

      expect(connections.featureFlag).toBe('socialEnabled');
      expect(messages.featureFlag).toBe('socialEnabled');
      expect(shared.featureFlag).toBe('socialEnabled');
    });

    it('should mark fitness as requiring fitnessEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const fitness = config.items.find(item => item.key === 'fitness');

      expect(fitness.featureFlag).toBe('fitnessEnabled');
    });

    it('should mark kb as requiring kbEnabled', async () => {
      const config = await SidebarConfig.getConfig();
      const kb = config.items.find(item => item.key === 'kb');

      expect(kb.featureFlag).toBe('kbEnabled');
    });

    it('should mark admin panel as requiresAdmin', async () => {
      const config = await SidebarConfig.getConfig();
      const admin = config.items.find(item => item.key === 'admin');

      expect(admin.requiresAdmin).toBe(true);
    });

    it('should not require admin for regular items', async () => {
      const config = await SidebarConfig.getConfig();
      const dashboard = config.items.find(item => item.key === 'dashboard');
      const notes = config.items.find(item => item.key === 'notes');
      const tasks = config.items.find(item => item.key === 'tasks');

      expect(dashboard.requiresAdmin).toBe(false);
      expect(notes.requiresAdmin).toBe(false);
      expect(tasks.requiresAdmin).toBe(false);
    });

    it('should have no feature flag for core items', async () => {
      const config = await SidebarConfig.getConfig();
      const dashboard = config.items.find(item => item.key === 'dashboard');
      const today = config.items.find(item => item.key === 'today');
      const inbox = config.items.find(item => item.key === 'inbox');
      const notes = config.items.find(item => item.key === 'notes');
      const tasks = config.items.find(item => item.key === 'tasks');

      expect(dashboard.featureFlag).toBeNull();
      expect(today.featureFlag).toBeNull();
      expect(inbox.featureFlag).toBeNull();
      expect(notes.featureFlag).toBeNull();
      expect(tasks.featureFlag).toBeNull();
    });
  });

  // ===========================================================================
  // TEST SUITE: SCHEMA VALIDATION
  // ===========================================================================

  describe('Schema Validation', () => {
    describe('Item Schema', () => {
      it('should require key for items', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidItem = {
          label: 'Missing Key',
          icon: 'Star',
          path: '/app/test',
          section: 'main',
          order: 10,
        };

        const updatedItems = [...config.items.map(i => i.toObject()), invalidItem];

        await expect(
          SidebarConfig.updateConfig({ items: updatedItems }, admin._id)
        ).rejects.toThrow(/key.*required|Path `key` is required/i);
      });

      it('should require label for items', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidItem = {
          key: 'test',
          icon: 'Star',
          path: '/app/test',
          section: 'main',
          order: 10,
        };

        const updatedItems = [...config.items.map(i => i.toObject()), invalidItem];

        await expect(
          SidebarConfig.updateConfig({ items: updatedItems }, admin._id)
        ).rejects.toThrow(/label.*required|Path `label` is required/i);
      });

      it('should require icon for items', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidItem = {
          key: 'test',
          label: 'Test',
          path: '/app/test',
          section: 'main',
          order: 10,
        };

        const updatedItems = [...config.items.map(i => i.toObject()), invalidItem];

        await expect(
          SidebarConfig.updateConfig({ items: updatedItems }, admin._id)
        ).rejects.toThrow(/icon.*required|Path `icon` is required/i);
      });

      it('should require path for items', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidItem = {
          key: 'test',
          label: 'Test',
          icon: 'Star',
          section: 'main',
          order: 10,
        };

        const updatedItems = [...config.items.map(i => i.toObject()), invalidItem];

        await expect(
          SidebarConfig.updateConfig({ items: updatedItems }, admin._id)
        ).rejects.toThrow(/path.*required|Path `path` is required/i);
      });

      it('should require section for items', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidItem = {
          key: 'test',
          label: 'Test',
          icon: 'Star',
          path: '/app/test',
          order: 10,
        };

        const updatedItems = [...config.items.map(i => i.toObject()), invalidItem];

        await expect(
          SidebarConfig.updateConfig({ items: updatedItems }, admin._id)
        ).rejects.toThrow(/section.*required|Path `section` is required/i);
      });
    });

    describe('Section Schema', () => {
      it('should require key for sections', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidSection = {
          label: 'Missing Key',
          order: 10,
        };

        const updatedSections = [...config.sections.map(s => s.toObject()), invalidSection];

        await expect(
          SidebarConfig.updateConfig({ sections: updatedSections }, admin._id)
        ).rejects.toThrow(/key.*required|Path `key` is required/i);
      });

      it('should require label for sections', async () => {
        const admin = await createTestUser();
        const config = await SidebarConfig.getConfig();

        const invalidSection = {
          key: 'test',
          order: 10,
        };

        const updatedSections = [...config.sections.map(s => s.toObject()), invalidSection];

        await expect(
          SidebarConfig.updateConfig({ sections: updatedSections }, admin._id)
        ).rejects.toThrow(/label.*required|Path `label` is required/i);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty items array', async () => {
      const admin = await createTestUser();

      await SidebarConfig.updateConfig({ items: [] }, admin._id);

      const config = await SidebarConfig.getConfig();
      expect(config.items.length).toBe(0);
    });

    it('should handle empty sections array', async () => {
      const admin = await createTestUser();

      await SidebarConfig.updateConfig({ sections: [] }, admin._id);

      const config = await SidebarConfig.getConfig();
      expect(config.sections.length).toBe(0);
    });

    it('should handle item with all optional fields set to null', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      const newItem = {
        key: 'test',
        label: 'Test',
        icon: 'Star',
        path: '/app/test',
        section: 'main',
        order: 10,
        visible: true,
        featureFlag: null,
        requiresAdmin: false,
      };

      const updatedItems = [...config.items.map(i => i.toObject()), newItem];
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const test = updated.items.find(item => item.key === 'test');

      expect(test).toBeDefined();
      expect(test.featureFlag).toBeNull();
    });

    it('should handle unicode characters in labels', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      const updatedSections = config.sections.map(s => {
        if (s.key === 'main') return { ...s.toObject(), label: '主菜单 Main' };
        return s.toObject();
      });

      await SidebarConfig.updateConfig({ sections: updatedSections }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const main = updated.sections.find(s => s.key === 'main');

      expect(main.label).toBe('主菜单 Main');
    });

    it('should handle special characters in paths', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      const newItem = {
        key: 'special',
        label: 'Special',
        icon: 'Star',
        path: '/app/special-path_123',
        section: 'main',
        order: 10,
        visible: true,
        featureFlag: null,
        requiresAdmin: false,
      };

      const updatedItems = [...config.items.map(i => i.toObject()), newItem];
      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const special = updated.items.find(item => item.key === 'special');

      expect(special.path).toBe('/app/special-path_123');
    });

    it('should handle negative order values', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      const updatedItems = config.items.map(item => {
        if (item.key === 'dashboard') return { ...item.toObject(), order: -1 };
        return item.toObject();
      });

      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const dashboard = updated.items.find(item => item.key === 'dashboard');

      expect(dashboard.order).toBe(-1);
    });

    it('should handle large order values', async () => {
      const admin = await createTestUser();
      const config = await SidebarConfig.getConfig();

      const updatedItems = config.items.map(item => {
        if (item.key === 'dashboard') return { ...item.toObject(), order: 999999 };
        return item.toObject();
      });

      await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);

      const updated = await SidebarConfig.getConfig();
      const dashboard = updated.items.find(item => item.key === 'dashboard');

      expect(dashboard.order).toBe(999999);
    });

    it('should maintain config after multiple rapid updates', async () => {
      const admin = await createTestUser();

      // Rapid updates
      for (let i = 0; i < 5; i++) {
        const config = await SidebarConfig.getConfig();
        const updatedItems = config.items.map(item => {
          if (item.key === 'dashboard') return { ...item.toObject(), order: i };
          return item.toObject();
        });
        await SidebarConfig.updateConfig({ items: updatedItems }, admin._id);
      }

      const final = await SidebarConfig.getConfig();
      const dashboard = final.items.find(item => item.key === 'dashboard');

      expect(dashboard.order).toBe(4); // Last update
    });
  });
});
