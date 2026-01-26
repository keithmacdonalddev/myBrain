/**
 * =============================================================================
 * MODERATIONTEMPLATE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the ModerationTemplate model, covering:
 * - Schema validation (required fields, enums, min/max values)
 * - CRUD operations (create, read, update, delete)
 * - Template types (warning, suspension, ban)
 * - Template categories (spam, harassment, inappropriate_content, etc.)
 * - Warning levels (1-3)
 * - Suspension days
 * - Active/inactive status
 * - Usage tracking (usageCount, lastUsedAt)
 * - Static methods (getTemplatesForAction, incrementUsage)
 * - Instance methods (toSafeJSON)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import ModerationTemplate from './ModerationTemplate.js';
import User from './User.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test admin user.
 */
async function createTestAdmin(overrides = {}) {
  const defaults = {
    email: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'admin',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Creates a test moderation template with sensible defaults.
 */
async function createTestTemplate(overrides = {}) {
  const defaults = {
    name: 'Test Template',
    actionType: 'warning',
    reason: 'This is a test warning message.',
    category: 'other',
    isActive: true,
  };
  return ModerationTemplate.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('ModerationTemplate Model', () => {
  describe('Schema Validation', () => {
    it('should require name', async () => {
      await expect(
        ModerationTemplate.create({
          actionType: 'warning',
          reason: 'Test reason',
        })
      ).rejects.toThrow(/name.*required/i);
    });

    it('should require actionType', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test Template',
          reason: 'Test reason',
        })
      ).rejects.toThrow(/actionType.*required/i);
    });

    it('should require reason', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test Template',
          actionType: 'warning',
        })
      ).rejects.toThrow(/reason.*required/i);
    });

    it('should trim name', async () => {
      const template = await ModerationTemplate.create({
        name: '  Trimmed Name  ',
        actionType: 'warning',
        reason: 'Test reason',
      });
      expect(template.name).toBe('Trimmed Name');
    });

    it('should trim reason', async () => {
      const template = await ModerationTemplate.create({
        name: 'Test',
        actionType: 'warning',
        reason: '  Trimmed Reason  ',
      });
      expect(template.reason).toBe('Trimmed Reason');
    });

    it('should accept valid actionType values', async () => {
      const validTypes = ['warning', 'suspension', 'ban'];

      for (const actionType of validTypes) {
        const template = await ModerationTemplate.create({
          name: `Template ${actionType}`,
          actionType,
          reason: 'Test reason',
        });
        expect(template.actionType).toBe(actionType);
      }
    });

    it('should reject invalid actionType', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test',
          actionType: 'invalid',
          reason: 'Test reason',
        })
      ).rejects.toThrow(/actionType/i);
    });

    it('should default category to other', async () => {
      const template = await createTestTemplate();
      expect(template.category).toBe('other');
    });

    it('should accept valid category values', async () => {
      const validCategories = ['spam', 'harassment', 'inappropriate_content', 'policy_violation', 'other'];

      for (const category of validCategories) {
        const template = await ModerationTemplate.create({
          name: `Template ${category}`,
          actionType: 'warning',
          reason: 'Test reason',
          category,
        });
        expect(template.category).toBe(category);
      }
    });

    it('should reject invalid category', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test',
          actionType: 'warning',
          reason: 'Test reason',
          category: 'invalid',
        })
      ).rejects.toThrow(/category/i);
    });

    it('should default isActive to true', async () => {
      const template = await createTestTemplate();
      expect(template.isActive).toBe(true);
    });

    it('should default usageCount to 0', async () => {
      const template = await createTestTemplate();
      expect(template.usageCount).toBe(0);
    });

    it('should enforce warningLevel minimum of 1', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test',
          actionType: 'warning',
          reason: 'Test reason',
          warningLevel: 0,
        })
      ).rejects.toThrow(/warningLevel/i);
    });

    it('should enforce warningLevel maximum of 3', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test',
          actionType: 'warning',
          reason: 'Test reason',
          warningLevel: 4,
        })
      ).rejects.toThrow(/warningLevel/i);
    });

    it('should accept valid warningLevel values', async () => {
      for (const level of [1, 2, 3]) {
        const template = await ModerationTemplate.create({
          name: `Warning Level ${level}`,
          actionType: 'warning',
          reason: 'Test reason',
          warningLevel: level,
        });
        expect(template.warningLevel).toBe(level);
      }
    });

    it('should enforce suspensionDays minimum of 1', async () => {
      await expect(
        ModerationTemplate.create({
          name: 'Test',
          actionType: 'suspension',
          reason: 'Test reason',
          suspensionDays: 0,
        })
      ).rejects.toThrow(/suspensionDays/i);
    });

    it('should accept valid suspensionDays values', async () => {
      const template = await ModerationTemplate.create({
        name: 'Test Suspension',
        actionType: 'suspension',
        reason: 'Test reason',
        suspensionDays: 7,
      });
      expect(template.suspensionDays).toBe(7);
    });
  });

  // =============================================================================
  // TEST SUITE: CRUD OPERATIONS
  // =============================================================================

  describe('CRUD Operations', () => {
    it('should create a template successfully', async () => {
      const admin = await createTestAdmin();

      const template = await ModerationTemplate.create({
        name: 'First Warning: Spam',
        actionType: 'warning',
        reason: 'We noticed spam activity on your account.',
        category: 'spam',
        warningLevel: 1,
        description: 'Use for first-time spam offenders',
        createdBy: admin._id,
      });

      expect(template._id).toBeDefined();
      expect(template.name).toBe('First Warning: Spam');
      expect(template.actionType).toBe('warning');
      expect(template.reason).toBe('We noticed spam activity on your account.');
      expect(template.category).toBe('spam');
      expect(template.warningLevel).toBe(1);
      expect(template.description).toBe('Use for first-time spam offenders');
      expect(template.createdBy.toString()).toBe(admin._id.toString());
      expect(template.isActive).toBe(true);
      expect(template.usageCount).toBe(0);
      expect(template.createdAt).toBeDefined();
    });

    it('should find a template by id', async () => {
      const created = await createTestTemplate();
      const found = await ModerationTemplate.findById(created._id);

      expect(found).not.toBeNull();
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('should update a template', async () => {
      const template = await createTestTemplate();

      template.name = 'Updated Template Name';
      template.reason = 'Updated reason text';
      await template.save();

      const updated = await ModerationTemplate.findById(template._id);
      expect(updated.name).toBe('Updated Template Name');
      expect(updated.reason).toBe('Updated reason text');
    });

    it('should delete a template', async () => {
      const template = await createTestTemplate();

      await ModerationTemplate.deleteOne({ _id: template._id });

      const found = await ModerationTemplate.findById(template._id);
      expect(found).toBeNull();
    });

    it('should find templates by actionType', async () => {
      await createTestTemplate({ name: 'Warning 1', actionType: 'warning' });
      await createTestTemplate({ name: 'Warning 2', actionType: 'warning' });
      await createTestTemplate({ name: 'Ban', actionType: 'ban' });

      const warnings = await ModerationTemplate.find({ actionType: 'warning' });
      const bans = await ModerationTemplate.find({ actionType: 'ban' });

      expect(warnings).toHaveLength(2);
      expect(bans).toHaveLength(1);
    });
  });

  // =============================================================================
  // TEST SUITE: TEMPLATE TYPES
  // =============================================================================

  describe('Template Types', () => {
    describe('Warning Templates', () => {
      it('should create warning template with level 1', async () => {
        const template = await ModerationTemplate.create({
          name: 'First Warning',
          actionType: 'warning',
          reason: 'This is your first warning.',
          warningLevel: 1,
        });

        expect(template.actionType).toBe('warning');
        expect(template.warningLevel).toBe(1);
      });

      it('should create warning template with level 2', async () => {
        const template = await ModerationTemplate.create({
          name: 'Second Warning',
          actionType: 'warning',
          reason: 'This is your second warning.',
          warningLevel: 2,
        });

        expect(template.warningLevel).toBe(2);
      });

      it('should create warning template with level 3 (final)', async () => {
        const template = await ModerationTemplate.create({
          name: 'Final Warning',
          actionType: 'warning',
          reason: 'This is your final warning before suspension.',
          warningLevel: 3,
        });

        expect(template.warningLevel).toBe(3);
      });

      it('should allow warning without warningLevel', async () => {
        const template = await ModerationTemplate.create({
          name: 'Generic Warning',
          actionType: 'warning',
          reason: 'Please review our guidelines.',
        });

        expect(template.warningLevel).toBeUndefined();
      });
    });

    describe('Suspension Templates', () => {
      it('should create suspension template with days', async () => {
        const template = await ModerationTemplate.create({
          name: '7-Day Suspension',
          actionType: 'suspension',
          reason: 'Your account has been suspended for 7 days.',
          suspensionDays: 7,
        });

        expect(template.actionType).toBe('suspension');
        expect(template.suspensionDays).toBe(7);
      });

      it('should create 14-day suspension template', async () => {
        const template = await ModerationTemplate.create({
          name: '14-Day Suspension',
          actionType: 'suspension',
          reason: 'Your account has been suspended for 14 days.',
          suspensionDays: 14,
        });

        expect(template.suspensionDays).toBe(14);
      });

      it('should create 30-day suspension template', async () => {
        const template = await ModerationTemplate.create({
          name: '30-Day Suspension',
          actionType: 'suspension',
          reason: 'Your account has been suspended for 30 days.',
          suspensionDays: 30,
        });

        expect(template.suspensionDays).toBe(30);
      });

      it('should allow indefinite suspension (no days)', async () => {
        const template = await ModerationTemplate.create({
          name: 'Indefinite Suspension',
          actionType: 'suspension',
          reason: 'Your account has been suspended indefinitely.',
        });

        expect(template.suspensionDays).toBeUndefined();
      });
    });

    describe('Ban Templates', () => {
      it('should create ban template', async () => {
        const template = await ModerationTemplate.create({
          name: 'Permanent Ban',
          actionType: 'ban',
          reason: 'Your account has been permanently banned.',
        });

        expect(template.actionType).toBe('ban');
      });

      it('should create ban template for hate speech', async () => {
        const template = await ModerationTemplate.create({
          name: 'Permanent Ban: Hate Speech',
          actionType: 'ban',
          reason: 'Your account has been permanently banned for hate speech.',
          category: 'harassment',
        });

        expect(template.actionType).toBe('ban');
        expect(template.category).toBe('harassment');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: CATEGORIES
  // =============================================================================

  describe('Template Categories', () => {
    it('should create spam category template', async () => {
      const template = await createTestTemplate({
        name: 'Spam Warning',
        category: 'spam',
      });
      expect(template.category).toBe('spam');
    });

    it('should create harassment category template', async () => {
      const template = await createTestTemplate({
        name: 'Harassment Warning',
        category: 'harassment',
      });
      expect(template.category).toBe('harassment');
    });

    it('should create inappropriate_content category template', async () => {
      const template = await createTestTemplate({
        name: 'Inappropriate Content Warning',
        category: 'inappropriate_content',
      });
      expect(template.category).toBe('inappropriate_content');
    });

    it('should create policy_violation category template', async () => {
      const template = await createTestTemplate({
        name: 'Policy Violation Warning',
        category: 'policy_violation',
      });
      expect(template.category).toBe('policy_violation');
    });

    it('should filter templates by category', async () => {
      await createTestTemplate({ name: 'Spam 1', category: 'spam' });
      await createTestTemplate({ name: 'Spam 2', category: 'spam' });
      await createTestTemplate({ name: 'Harassment', category: 'harassment' });

      const spamTemplates = await ModerationTemplate.find({ category: 'spam' });
      expect(spamTemplates).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: ACTIVE/INACTIVE STATUS
  // =============================================================================

  describe('Active/Inactive Status', () => {
    it('should default to active', async () => {
      const template = await createTestTemplate();
      expect(template.isActive).toBe(true);
    });

    it('should create inactive template', async () => {
      const template = await createTestTemplate({ isActive: false });
      expect(template.isActive).toBe(false);
    });

    it('should deactivate a template', async () => {
      const template = await createTestTemplate();

      template.isActive = false;
      await template.save();

      const updated = await ModerationTemplate.findById(template._id);
      expect(updated.isActive).toBe(false);
    });

    it('should reactivate a template', async () => {
      const template = await createTestTemplate({ isActive: false });

      template.isActive = true;
      await template.save();

      const updated = await ModerationTemplate.findById(template._id);
      expect(updated.isActive).toBe(true);
    });

    it('should filter active templates only', async () => {
      await createTestTemplate({ name: 'Active 1', isActive: true });
      await createTestTemplate({ name: 'Active 2', isActive: true });
      await createTestTemplate({ name: 'Inactive', isActive: false });

      const activeTemplates = await ModerationTemplate.find({ isActive: true });
      expect(activeTemplates).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: USAGE TRACKING
  // =============================================================================

  describe('Usage Tracking', () => {
    it('should start with usageCount of 0', async () => {
      const template = await createTestTemplate();
      expect(template.usageCount).toBe(0);
    });

    it('should not have lastUsedAt initially', async () => {
      const template = await createTestTemplate();
      expect(template.lastUsedAt).toBeUndefined();
    });

    it('should track usage manually', async () => {
      const template = await createTestTemplate();

      template.usageCount = 5;
      template.lastUsedAt = new Date();
      await template.save();

      const updated = await ModerationTemplate.findById(template._id);
      expect(updated.usageCount).toBe(5);
      expect(updated.lastUsedAt).toBeDefined();
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    describe('getTemplatesForAction()', () => {
      it('should return empty array when no templates exist', async () => {
        const templates = await ModerationTemplate.getTemplatesForAction('warning');
        expect(templates).toHaveLength(0);
      });

      it('should return only templates for specified action type', async () => {
        await createTestTemplate({ name: 'Warning 1', actionType: 'warning' });
        await createTestTemplate({ name: 'Warning 2', actionType: 'warning' });
        await createTestTemplate({ name: 'Ban', actionType: 'ban' });

        const templates = await ModerationTemplate.getTemplatesForAction('warning');

        expect(templates).toHaveLength(2);
        expect(templates.every(t => t.actionType === 'warning')).toBe(true);
      });

      it('should only return active templates', async () => {
        await createTestTemplate({ name: 'Active', actionType: 'warning', isActive: true });
        await createTestTemplate({ name: 'Inactive', actionType: 'warning', isActive: false });

        const templates = await ModerationTemplate.getTemplatesForAction('warning');

        expect(templates).toHaveLength(1);
        expect(templates[0].name).toBe('Active');
      });

      it('should sort by usageCount descending (most used first)', async () => {
        await createTestTemplate({ name: 'Less Used', actionType: 'warning', usageCount: 5 });
        await createTestTemplate({ name: 'Most Used', actionType: 'warning', usageCount: 100 });
        await createTestTemplate({ name: 'Medium Used', actionType: 'warning', usageCount: 50 });

        const templates = await ModerationTemplate.getTemplatesForAction('warning');

        expect(templates[0].name).toBe('Most Used');
        expect(templates[1].name).toBe('Medium Used');
        expect(templates[2].name).toBe('Less Used');
      });

      it('should sort by name ascending as secondary sort', async () => {
        await createTestTemplate({ name: 'Charlie', actionType: 'warning', usageCount: 10 });
        await createTestTemplate({ name: 'Alpha', actionType: 'warning', usageCount: 10 });
        await createTestTemplate({ name: 'Beta', actionType: 'warning', usageCount: 10 });

        const templates = await ModerationTemplate.getTemplatesForAction('warning');

        expect(templates[0].name).toBe('Alpha');
        expect(templates[1].name).toBe('Beta');
        expect(templates[2].name).toBe('Charlie');
      });

      it('should return plain objects (lean)', async () => {
        await createTestTemplate({ actionType: 'warning' });

        const templates = await ModerationTemplate.getTemplatesForAction('warning');

        // Lean documents don't have mongoose methods
        expect(templates[0].save).toBeUndefined();
        expect(templates[0].toSafeJSON).toBeUndefined();
      });

      it('should work for suspension templates', async () => {
        await createTestTemplate({ name: 'Suspension', actionType: 'suspension', suspensionDays: 7 });

        const templates = await ModerationTemplate.getTemplatesForAction('suspension');

        expect(templates).toHaveLength(1);
        expect(templates[0].actionType).toBe('suspension');
      });

      it('should work for ban templates', async () => {
        await createTestTemplate({ name: 'Ban', actionType: 'ban' });

        const templates = await ModerationTemplate.getTemplatesForAction('ban');

        expect(templates).toHaveLength(1);
        expect(templates[0].actionType).toBe('ban');
      });
    });

    describe('incrementUsage()', () => {
      it('should increment usageCount by 1', async () => {
        const template = await createTestTemplate();
        expect(template.usageCount).toBe(0);

        await ModerationTemplate.incrementUsage(template._id);

        const updated = await ModerationTemplate.findById(template._id);
        expect(updated.usageCount).toBe(1);
      });

      it('should set lastUsedAt to current time', async () => {
        const template = await createTestTemplate();
        const before = new Date();

        await ModerationTemplate.incrementUsage(template._id);

        const after = new Date();
        const updated = await ModerationTemplate.findById(template._id);

        expect(updated.lastUsedAt).toBeDefined();
        expect(updated.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(updated.lastUsedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should increment multiple times', async () => {
        const template = await createTestTemplate();

        await ModerationTemplate.incrementUsage(template._id);
        await ModerationTemplate.incrementUsage(template._id);
        await ModerationTemplate.incrementUsage(template._id);

        const updated = await ModerationTemplate.findById(template._id);
        expect(updated.usageCount).toBe(3);
      });

      it('should update lastUsedAt on each increment', async () => {
        const template = await createTestTemplate();

        await ModerationTemplate.incrementUsage(template._id);
        const firstUse = (await ModerationTemplate.findById(template._id)).lastUsedAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        await ModerationTemplate.incrementUsage(template._id);
        const secondUse = (await ModerationTemplate.findById(template._id)).lastUsedAt;

        expect(secondUse.getTime()).toBeGreaterThan(firstUse.getTime());
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should return safe fields', async () => {
        const template = await createTestTemplate();

        const safeJson = template.toSafeJSON();

        expect(safeJson._id).toBeDefined();
        expect(safeJson.name).toBe('Test Template');
        expect(safeJson.actionType).toBe('warning');
        expect(safeJson.reason).toBe('This is a test warning message.');
        expect(safeJson.category).toBe('other');
        expect(safeJson.isActive).toBe(true);
        expect(safeJson.usageCount).toBe(0);
        expect(safeJson.createdAt).toBeDefined();
      });

      it('should exclude internal fields', async () => {
        const template = await createTestTemplate();

        const safeJson = template.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
        expect(safeJson.updatedAt).toBeUndefined();
        expect(safeJson.createdBy).toBeUndefined();
        expect(safeJson.lastUsedAt).toBeUndefined();
      });

      it('should include warningLevel when present', async () => {
        const template = await ModerationTemplate.create({
          name: 'Warning',
          actionType: 'warning',
          reason: 'Test reason',
          warningLevel: 2,
        });

        const safeJson = template.toSafeJSON();

        expect(safeJson.warningLevel).toBe(2);
      });

      it('should include suspensionDays when present', async () => {
        const template = await ModerationTemplate.create({
          name: 'Suspension',
          actionType: 'suspension',
          reason: 'Test reason',
          suspensionDays: 14,
        });

        const safeJson = template.toSafeJSON();

        expect(safeJson.suspensionDays).toBe(14);
      });

      it('should include description when present', async () => {
        const template = await createTestTemplate({
          description: 'Use this for repeat offenders',
        });

        const safeJson = template.toSafeJSON();

        expect(safeJson.description).toBe('Use this for repeat offenders');
      });
    });
  });

  // =============================================================================
  // TEST SUITE: CREATEDBY TRACKING
  // =============================================================================

  describe('CreatedBy Tracking', () => {
    it('should store creator admin', async () => {
      const admin = await createTestAdmin();

      const template = await ModerationTemplate.create({
        name: 'Test',
        actionType: 'warning',
        reason: 'Test reason',
        createdBy: admin._id,
      });

      expect(template.createdBy.toString()).toBe(admin._id.toString());
    });

    it('should allow template without createdBy', async () => {
      const template = await createTestTemplate();

      expect(template.createdBy).toBeUndefined();
    });

    it('should populate createdBy', async () => {
      const admin = await createTestAdmin();

      const template = await ModerationTemplate.create({
        name: 'Test',
        actionType: 'warning',
        reason: 'Test reason',
        createdBy: admin._id,
      });

      const populated = await ModerationTemplate.findById(template._id).populate('createdBy', 'email');

      expect(populated.createdBy.email).toBe(admin.email);
    });
  });

  // =============================================================================
  // TEST SUITE: DESCRIPTION FIELD
  // =============================================================================

  describe('Description Field', () => {
    it('should store description', async () => {
      const template = await createTestTemplate({
        description: 'Use for first-time offenders only',
      });

      expect(template.description).toBe('Use for first-time offenders only');
    });

    it('should trim description', async () => {
      const template = await createTestTemplate({
        description: '  Trimmed Description  ',
      });

      expect(template.description).toBe('Trimmed Description');
    });

    it('should allow template without description', async () => {
      const template = await createTestTemplate();

      expect(template.description).toBeUndefined();
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const before = new Date();
      const template = await createTestTemplate();
      const after = new Date();

      expect(template.createdAt).toBeDefined();
      expect(template.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(template.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const template = await createTestTemplate();
      const originalUpdatedAt = template.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      template.name = 'Updated Name';
      await template.save();

      expect(template.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle template with all fields', async () => {
      const admin = await createTestAdmin();

      const template = await ModerationTemplate.create({
        name: 'Full Template',
        actionType: 'warning',
        reason: 'Complete warning message with all details.',
        warningLevel: 2,
        category: 'harassment',
        description: 'Use after first verbal warning',
        isActive: true,
        usageCount: 25,
        lastUsedAt: new Date(),
        createdBy: admin._id,
      });

      expect(template.name).toBe('Full Template');
      expect(template.actionType).toBe('warning');
      expect(template.warningLevel).toBe(2);
      expect(template.category).toBe('harassment');
      expect(template.description).toBe('Use after first verbal warning');
      expect(template.isActive).toBe(true);
      expect(template.usageCount).toBe(25);
      expect(template.lastUsedAt).toBeDefined();
      expect(template.createdBy.toString()).toBe(admin._id.toString());
    });

    it('should handle suspension template with all fields', async () => {
      const admin = await createTestAdmin();

      const template = await ModerationTemplate.create({
        name: '7-Day Suspension: Spam',
        actionType: 'suspension',
        reason: 'Account suspended for 7 days due to spam.',
        suspensionDays: 7,
        category: 'spam',
        description: 'For repeat spam offenders',
        isActive: true,
        createdBy: admin._id,
      });

      expect(template.actionType).toBe('suspension');
      expect(template.suspensionDays).toBe(7);
      expect(template.category).toBe('spam');
    });

    it('should handle long suspension periods', async () => {
      const template = await ModerationTemplate.create({
        name: 'Long Suspension',
        actionType: 'suspension',
        reason: 'Extended suspension.',
        suspensionDays: 365,
      });

      expect(template.suspensionDays).toBe(365);
    });
  });
});
