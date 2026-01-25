/**
 * =============================================================================
 * LIFEAREASERVICE.TEST.JS - Life Area Service Tests
 * =============================================================================
 *
 * Comprehensive tests for life area business logic including:
 * - CRUD operations
 * - CASCADE DELETION (critical - reassigns items to default)
 * - Default area management
 * - Ordering and archiving
 * - Edge cases and validation
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as lifeAreaService from './lifeAreaService.js';
import LifeArea from '../models/LifeArea.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Event from '../models/Event.js';
import Project from '../models/Project.js';

// =============================================================================
// TEST SETUP
// =============================================================================

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up all collections after each test
  await LifeArea.deleteMany({});
  await Note.deleteMany({});
  await Task.deleteMany({});
  await Event.deleteMany({});
  await Project.deleteMany({});
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a unique user ID for test isolation
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Create a test life area with default values
 */
async function createTestLifeArea(userId, overrides = {}) {
  return await LifeArea.create({
    userId,
    name: 'Test Area',
    color: '#6366f1',
    icon: 'Briefcase',
    order: 0,
    isDefault: false,
    isArchived: false,
    ...overrides,
  });
}

/**
 * Create a test note linked to a life area
 */
async function createTestNote(userId, lifeAreaId, overrides = {}) {
  return await Note.create({
    userId,
    lifeAreaId,
    title: 'Test Note',
    body: 'Test body',
    ...overrides,
  });
}

/**
 * Create a test task linked to a life area
 */
async function createTestTask(userId, lifeAreaId, overrides = {}) {
  return await Task.create({
    userId,
    lifeAreaId,
    title: 'Test Task',
    status: 'todo',
    ...overrides,
  });
}

/**
 * Create a test event linked to a life area
 */
async function createTestEvent(userId, lifeAreaId, overrides = {}) {
  return await Event.create({
    userId,
    lifeAreaId,
    title: 'Test Event',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000), // 1 hour later
    ...overrides,
  });
}

/**
 * Create a test project linked to a life area
 */
async function createTestProject(userId, lifeAreaId, overrides = {}) {
  return await Project.create({
    userId,
    lifeAreaId,
    title: 'Test Project',
    status: 'active',
    ...overrides,
  });
}

// =============================================================================
// CREATE LIFE AREA TESTS
// =============================================================================

describe('createLifeArea', () => {
  it('should create a life area with valid data', async () => {
    const userId = createUserId();

    const area = await lifeAreaService.createLifeArea(userId, {
      name: 'Work & Career',
      description: 'Professional life',
      color: '#ef4444',
      icon: 'Briefcase',
    });

    expect(area).toBeDefined();
    expect(area.name).toBe('Work & Career');
    expect(area.description).toBe('Professional life');
    expect(area.color).toBe('#ef4444');
    expect(area.icon).toBe('Briefcase');
    expect(area.userId.toString()).toBe(userId.toString());
    expect(area.isDefault).toBe(false);
    expect(area.isArchived).toBe(false);
  });

  it('should create area with minimal data', async () => {
    const userId = createUserId();

    const area = await lifeAreaService.createLifeArea(userId, {
      name: 'Minimal Area',
    });

    expect(area.name).toBe('Minimal Area');
    expect(area.color).toBe('#6366f1'); // Default color
    expect(area.icon).toBe('Circle'); // Default icon
  });

  it('should throw error if name is missing', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.createLifeArea(userId, {})
    ).rejects.toThrow();
  });

  it('should throw error if name is empty string', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.createLifeArea(userId, { name: '' })
    ).rejects.toThrow();
  });

  it('should throw error if name is whitespace only', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.createLifeArea(userId, { name: '   ' })
    ).rejects.toThrow();
  });

  it('should assign next order number automatically', async () => {
    const userId = createUserId();

    const area1 = await lifeAreaService.createLifeArea(userId, {
      name: 'Area 1',
    });

    const area2 = await lifeAreaService.createLifeArea(userId, {
      name: 'Area 2',
    });

    expect(area2.order).toBeGreaterThan(area1.order);
  });

  it('should handle unicode characters in name', async () => {
    const userId = createUserId();

    const area = await lifeAreaService.createLifeArea(userId, {
      name: 'Health 健康 🏃',
    });

    expect(area.name).toBe('Health 健康 🏃');
  });

  it('should reject invalid color format', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.createLifeArea(userId, {
        name: 'Test',
        color: 'not-a-color',
      })
    ).rejects.toThrow();
  });

  it('should reject very long name', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.createLifeArea(userId, {
        name: 'a'.repeat(101), // Assuming 100 char limit
      })
    ).rejects.toThrow();
  });
});

// =============================================================================
// GET LIFE AREAS TESTS
// =============================================================================

describe('getLifeAreas', () => {
  it('should return all non-archived areas by default', async () => {
    const userId = createUserId();

    await createTestLifeArea(userId, { name: 'Active 1' });
    await createTestLifeArea(userId, { name: 'Active 2' });
    await createTestLifeArea(userId, { name: 'Archived', isArchived: true });

    const areas = await lifeAreaService.getLifeAreas(userId);

    expect(areas.length).toBe(2);
    expect(areas.every(a => !a.isArchived)).toBe(true);
  });

  it('should include archived areas when requested', async () => {
    const userId = createUserId();

    await createTestLifeArea(userId, { name: 'Active' });
    await createTestLifeArea(userId, { name: 'Archived', isArchived: true });

    const areas = await lifeAreaService.getLifeAreas(userId, true);

    expect(areas.length).toBe(2);
  });

  it('should return areas sorted by order', async () => {
    const userId = createUserId();

    await createTestLifeArea(userId, { name: 'Third', order: 2 });
    await createTestLifeArea(userId, { name: 'First', order: 0 });
    await createTestLifeArea(userId, { name: 'Second', order: 1 });

    const areas = await lifeAreaService.getLifeAreas(userId);

    expect(areas[0].name).toBe('First');
    expect(areas[1].name).toBe('Second');
    expect(areas[2].name).toBe('Third');
  });

  it('should isolate areas by user', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    await createTestLifeArea(user1, { name: 'User 1 Area' });
    await createTestLifeArea(user2, { name: 'User 2 Area' });

    const user1Areas = await lifeAreaService.getLifeAreas(user1);
    const user2Areas = await lifeAreaService.getLifeAreas(user2);

    expect(user1Areas.length).toBe(1);
    expect(user2Areas.length).toBe(1);
    expect(user1Areas[0].name).toBe('User 1 Area');
    expect(user2Areas[0].name).toBe('User 2 Area');
  });

  it('should return empty array for user with no areas', async () => {
    const userId = createUserId();

    const areas = await lifeAreaService.getLifeAreas(userId);

    expect(areas).toEqual([]);
  });
});

// =============================================================================
// GET LIFE AREA BY ID TESTS
// =============================================================================

describe('getLifeAreaById', () => {
  it('should return life area by ID', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId, { name: 'Test Area' });

    const found = await lifeAreaService.getLifeAreaById(userId, area._id);

    expect(found).toBeDefined();
    expect(found.name).toBe('Test Area');
  });

  it('should return null for non-existent ID', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const found = await lifeAreaService.getLifeAreaById(userId, fakeId);

    expect(found).toBeNull();
  });

  it('should return null for other user\'s area', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    const area = await createTestLifeArea(user1, { name: 'User 1 Area' });

    const found = await lifeAreaService.getLifeAreaById(user2, area._id);

    expect(found).toBeNull();
  });

  it('should include item counts when requested', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId);

    // Create items linked to this area
    await createTestNote(userId, area._id);
    await createTestNote(userId, area._id);
    await createTestTask(userId, area._id);

    const found = await lifeAreaService.getLifeAreaById(userId, area._id, true);

    expect(found.noteCount).toBe(2);
    expect(found.taskCount).toBe(1);
  });
});

// =============================================================================
// UPDATE LIFE AREA TESTS
// =============================================================================

describe('updateLifeArea', () => {
  it('should update life area with valid data', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId, { name: 'Old Name' });

    const updated = await lifeAreaService.updateLifeArea(userId, area._id, {
      name: 'New Name',
      color: '#10b981',
    });

    expect(updated.name).toBe('New Name');
    expect(updated.color).toBe('#10b981');
  });

  it('should return null for non-existent area', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const updated = await lifeAreaService.updateLifeArea(userId, fakeId, {
      name: 'New Name',
    });

    expect(updated).toBeNull();
  });

  it('should not allow updating _id', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId);
    const originalId = area._id.toString();
    const newId = new mongoose.Types.ObjectId();

    await lifeAreaService.updateLifeArea(userId, area._id, {
      _id: newId,
      name: 'Updated',
    });

    const found = await LifeArea.findById(originalId);
    expect(found).toBeDefined();
    expect(found._id.toString()).toBe(originalId);
  });

  it('should not allow updating userId', async () => {
    const user1 = createUserId();
    const user2 = createUserId();
    const area = await createTestLifeArea(user1);

    await lifeAreaService.updateLifeArea(user1, area._id, {
      userId: user2,
    });

    const found = await LifeArea.findById(area._id);
    expect(found.userId.toString()).toBe(user1.toString());
  });

  it('should handle partial updates', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId, {
      name: 'Original',
      color: '#6366f1',
      description: 'Original description',
    });

    await lifeAreaService.updateLifeArea(userId, area._id, {
      name: 'Updated',
    });

    const found = await LifeArea.findById(area._id);
    expect(found.name).toBe('Updated');
    expect(found.color).toBe('#6366f1'); // Unchanged
    expect(found.description).toBe('Original description'); // Unchanged
  });
});

// =============================================================================
// DELETE LIFE AREA TESTS (CRITICAL - CASCADE DELETION)
// =============================================================================

describe('deleteLifeArea - CASCADE DELETION', () => {
  it('should delete life area and reassign all items to default', async () => {
    const userId = createUserId();

    // Create default area
    const defaultArea = await createTestLifeArea(userId, {
      name: 'Default',
      isDefault: true,
    });

    // Create area to delete
    const areaToDelete = await createTestLifeArea(userId, {
      name: 'To Delete',
    });

    // Create items in the area to be deleted
    const note = await createTestNote(userId, areaToDelete._id);
    const task = await createTestTask(userId, areaToDelete._id);
    const event = await createTestEvent(userId, areaToDelete._id);
    const project = await createTestProject(userId, areaToDelete._id);

    // Delete the area
    const result = await lifeAreaService.deleteLifeArea(userId, areaToDelete._id);

    expect(result.deleted.name).toBe('To Delete');
    expect(result.reassignedTo._id.toString()).toBe(defaultArea._id.toString());

    // Verify items were reassigned to default area
    const updatedNote = await Note.findById(note._id);
    const updatedTask = await Task.findById(task._id);
    const updatedEvent = await Event.findById(event._id);
    const updatedProject = await Project.findById(project._id);

    expect(updatedNote.lifeAreaId.toString()).toBe(defaultArea._id.toString());
    expect(updatedTask.lifeAreaId.toString()).toBe(defaultArea._id.toString());
    expect(updatedEvent.lifeAreaId.toString()).toBe(defaultArea._id.toString());
    expect(updatedProject.lifeAreaId.toString()).toBe(defaultArea._id.toString());

    // Verify area was deleted
    const deletedArea = await LifeArea.findById(areaToDelete._id);
    expect(deletedArea).toBeNull();
  });

  it('should prevent deleting default area', async () => {
    const userId = createUserId();

    const defaultArea = await createTestLifeArea(userId, {
      name: 'Default',
      isDefault: true,
    });

    await expect(
      lifeAreaService.deleteLifeArea(userId, defaultArea._id)
    ).rejects.toThrow('Cannot delete the default category');

    // Verify area still exists
    const stillExists = await LifeArea.findById(defaultArea._id);
    expect(stillExists).toBeDefined();
  });

  it('should create default area if none exists before deletion', async () => {
    const userId = createUserId();

    const area = await createTestLifeArea(userId, { name: 'To Delete' });
    await createTestNote(userId, area._id);

    const result = await lifeAreaService.deleteLifeArea(userId, area._id);

    expect(result.reassignedTo).toBeDefined();
    expect(result.reassignedTo.isDefault).toBe(true);

    // Verify default area was created
    const defaultArea = await LifeArea.findOne({ userId, isDefault: true });
    expect(defaultArea).toBeDefined();
  });

  it('should handle deleting area with many items', async () => {
    const userId = createUserId();

    const defaultArea = await createTestLifeArea(userId, { isDefault: true });
    const area = await createTestLifeArea(userId, { name: 'Many Items' });

    // Create 10 notes, 10 tasks, 5 events, 5 projects
    for (let i = 0; i < 10; i++) {
      await createTestNote(userId, area._id, { title: `Note ${i}` });
      await createTestTask(userId, area._id, { title: `Task ${i}` });
    }
    for (let i = 0; i < 5; i++) {
      await createTestEvent(userId, area._id, { title: `Event ${i}` });
      await createTestProject(userId, area._id, { title: `Project ${i}` });
    }

    await lifeAreaService.deleteLifeArea(userId, area._id);

    // Count items in default area
    const noteCount = await Note.countDocuments({ userId, lifeAreaId: defaultArea._id });
    const taskCount = await Task.countDocuments({ userId, lifeAreaId: defaultArea._id });
    const eventCount = await Event.countDocuments({ userId, lifeAreaId: defaultArea._id });
    const projectCount = await Project.countDocuments({ userId, lifeAreaId: defaultArea._id });

    expect(noteCount).toBe(10);
    expect(taskCount).toBe(10);
    expect(eventCount).toBe(5);
    expect(projectCount).toBe(5);
  });

  it('should only reassign items belonging to the user', async () => {
    const user1 = createUserId();
    const user2 = createUserId();

    // User 1 setup
    const user1Default = await createTestLifeArea(user1, { isDefault: true });
    const user1Area = await createTestLifeArea(user1, { name: 'User 1 Area' });
    await createTestNote(user1, user1Area._id);

    // User 2 has a note in an area with same ID (simulated)
    const user2Area = await createTestLifeArea(user2, { name: 'User 2 Area' });
    await createTestNote(user2, user2Area._id);

    // Delete user 1's area
    await lifeAreaService.deleteLifeArea(user1, user1Area._id);

    // Verify user 1's note was reassigned
    const user1Note = await Note.findOne({ userId: user1 });
    expect(user1Note.lifeAreaId.toString()).toBe(user1Default._id.toString());

    // Verify user 2's note was NOT affected
    const user2Note = await Note.findOne({ userId: user2 });
    expect(user2Note.lifeAreaId.toString()).toBe(user2Area._id.toString());
  });

  it('should return null when deleting non-existent area', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const result = await lifeAreaService.deleteLifeArea(userId, fakeId);

    expect(result).toBeNull();
  });

  it('should handle area with zero items gracefully', async () => {
    const userId = createUserId();

    await createTestLifeArea(userId, { isDefault: true });
    const area = await createTestLifeArea(userId, { name: 'Empty Area' });

    const result = await lifeAreaService.deleteLifeArea(userId, area._id);

    expect(result.deleted.name).toBe('Empty Area');
  });
});

// =============================================================================
// SET DEFAULT TESTS
// =============================================================================

describe('setDefault', () => {
  it('should set a life area as default', async () => {
    const userId = createUserId();

    const area1 = await createTestLifeArea(userId, { name: 'Area 1', isDefault: true });
    const area2 = await createTestLifeArea(userId, { name: 'Area 2' });

    await lifeAreaService.setDefault(userId, area2._id);

    const updated1 = await LifeArea.findById(area1._id);
    const updated2 = await LifeArea.findById(area2._id);

    expect(updated1.isDefault).toBe(false);
    expect(updated2.isDefault).toBe(true);
  });

  it('should ensure only one area is default', async () => {
    const userId = createUserId();

    const area1 = await createTestLifeArea(userId, { name: 'Area 1' });
    const area2 = await createTestLifeArea(userId, { name: 'Area 2' });
    const area3 = await createTestLifeArea(userId, { name: 'Area 3' });

    await lifeAreaService.setDefault(userId, area2._id);

    const defaultAreas = await LifeArea.find({ userId, isDefault: true });

    expect(defaultAreas.length).toBe(1);
    expect(defaultAreas[0]._id.toString()).toBe(area2._id.toString());
  });

  it('should return null for non-existent area', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const result = await lifeAreaService.setDefault(userId, fakeId);

    expect(result).toBeNull();
  });
});

// =============================================================================
// REORDER LIFE AREAS TESTS
// =============================================================================

describe('reorderLifeAreas', () => {
  it('should reorder life areas', async () => {
    const userId = createUserId();

    const area1 = await createTestLifeArea(userId, { name: 'Area 1', order: 0 });
    const area2 = await createTestLifeArea(userId, { name: 'Area 2', order: 1 });
    const area3 = await createTestLifeArea(userId, { name: 'Area 3', order: 2 });

    // Reverse the order
    await lifeAreaService.reorderLifeAreas(userId, [
      area3._id.toString(),
      area2._id.toString(),
      area1._id.toString(),
    ]);

    const updated1 = await LifeArea.findById(area1._id);
    const updated2 = await LifeArea.findById(area2._id);
    const updated3 = await LifeArea.findById(area3._id);

    expect(updated3.order).toBe(0);
    expect(updated2.order).toBe(1);
    expect(updated1.order).toBe(2);
  });

  it('should handle empty array', async () => {
    const userId = createUserId();

    await expect(
      lifeAreaService.reorderLifeAreas(userId, [])
    ).resolves.not.toThrow();
  });

  it('should ignore invalid IDs in order array', async () => {
    const userId = createUserId();
    const area1 = await createTestLifeArea(userId);
    const fakeId = new mongoose.Types.ObjectId();

    await lifeAreaService.reorderLifeAreas(userId, [
      area1._id.toString(),
      fakeId.toString(),
    ]);

    const updated = await LifeArea.findById(area1._id);
    expect(updated.order).toBe(0);
  });
});

// =============================================================================
// ARCHIVE LIFE AREA TESTS
// =============================================================================

describe('archiveLifeArea', () => {
  it('should archive a life area', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId, { name: 'To Archive' });

    await lifeAreaService.archiveLifeArea(userId, area._id, true);

    const archived = await LifeArea.findById(area._id);
    expect(archived.isArchived).toBe(true);
  });

  it('should unarchive a life area', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId, {
      name: 'Archived',
      isArchived: true,
    });

    await lifeAreaService.archiveLifeArea(userId, area._id, false);

    const unarchived = await LifeArea.findById(area._id);
    expect(unarchived.isArchived).toBe(false);
  });

  it('should return null for non-existent area', async () => {
    const userId = createUserId();
    const fakeId = new mongoose.Types.ObjectId();

    const result = await lifeAreaService.archiveLifeArea(userId, fakeId, true);

    expect(result).toBeNull();
  });

  it('should prevent archiving default area', async () => {
    const userId = createUserId();
    const defaultArea = await createTestLifeArea(userId, {
      name: 'Default',
      isDefault: true,
    });

    await expect(
      lifeAreaService.archiveLifeArea(userId, defaultArea._id, true)
    ).rejects.toThrow('Cannot archive the default category');
  });
});

// =============================================================================
// GET LIFE AREA ITEMS TESTS
// =============================================================================

describe('getLifeAreaItems', () => {
  it('should return all items in a life area', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId);

    await createTestNote(userId, area._id);
    await createTestNote(userId, area._id);
    await createTestTask(userId, area._id);
    await createTestEvent(userId, area._id);
    await createTestProject(userId, area._id);

    const items = await lifeAreaService.getLifeAreaItems(userId, area._id);

    expect(items.notes.length).toBe(2);
    expect(items.tasks.length).toBe(1);
    expect(items.events.length).toBe(1);
    expect(items.projects.length).toBe(1);
  });

  it('should filter by item type', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId);

    await createTestNote(userId, area._id);
    await createTestTask(userId, area._id);

    const items = await lifeAreaService.getLifeAreaItems(userId, area._id, {
      includeNotes: true,
      includeTasks: false,
    });

    expect(items.notes).toBeDefined();
    expect(items.tasks).not.toBeDefined();
  });

  it('should return empty arrays for area with no items', async () => {
    const userId = createUserId();
    const area = await createTestLifeArea(userId);

    const items = await lifeAreaService.getLifeAreaItems(userId, area._id);

    expect(items.notes).toEqual([]);
    expect(items.tasks).toEqual([]);
    expect(items.events).toEqual([]);
    expect(items.projects).toEqual([]);
  });
});

// =============================================================================
// ENSURE DEFAULT LIFE AREA TESTS
// =============================================================================

describe('ensureDefaultLifeArea', () => {
  it('should create default area if none exists', async () => {
    const userId = createUserId();

    const defaultArea = await lifeAreaService.ensureDefaultLifeArea(userId);

    expect(defaultArea).toBeDefined();
    expect(defaultArea.isDefault).toBe(true);
    expect(defaultArea.name).toBe('General');
  });

  it('should return existing default area if it exists', async () => {
    const userId = createUserId();

    const existing = await createTestLifeArea(userId, {
      name: 'My Default',
      isDefault: true,
    });

    const defaultArea = await lifeAreaService.ensureDefaultLifeArea(userId);

    expect(defaultArea._id.toString()).toBe(existing._id.toString());
    expect(defaultArea.name).toBe('My Default');
  });

  it('should not create duplicate default areas', async () => {
    const userId = createUserId();

    await lifeAreaService.ensureDefaultLifeArea(userId);
    await lifeAreaService.ensureDefaultLifeArea(userId);

    const defaults = await LifeArea.find({ userId, isDefault: true });

    expect(defaults.length).toBe(1);
  });
});
