/**
 * =============================================================================
 * EVENT MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Event model, covering:
 * - Schema validation (required fields, enums, maxlengths)
 * - Date/time handling and validation
 * - Recurring events
 * - All-day events
 * - Reminders
 * - User isolation
 * - Default values
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import Event from './Event.js';
import User from './User.js';
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user for event ownership.
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

/**
 * Creates an event with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestEvent(userId, overrides = {}) {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const defaults = {
    userId,
    title: `Test Event ${Date.now()}`,
    startDate: now,
    endDate: oneHourLater,
  };
  return Event.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('Event Model', () => {

  describe('Schema Validation', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    // -------------------------------------------------------------------------
    // Required Fields
    // -------------------------------------------------------------------------
    describe('Required Fields', () => {
      it('should require userId', async () => {
        await expect(
          Event.create({
            title: 'Test Event',
            startDate: new Date(),
            endDate: new Date(Date.now() + 3600000),
          })
        ).rejects.toThrow(/userId.*required|Path `userId` is required/i);
      });

      it('should require title', async () => {
        await expect(
          Event.create({
            userId: testUser._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 3600000),
          })
        ).rejects.toThrow(/title.*required|Path `title` is required/i);
      });

      it('should require startDate', async () => {
        await expect(
          Event.create({
            userId: testUser._id,
            title: 'Test Event',
            endDate: new Date(Date.now() + 3600000),
          })
        ).rejects.toThrow(/startDate.*required|Path `startDate` is required/i);
      });

      it('should require endDate', async () => {
        await expect(
          Event.create({
            userId: testUser._id,
            title: 'Test Event',
            startDate: new Date(),
          })
        ).rejects.toThrow(/endDate.*required|Path `endDate` is required/i);
      });

      it('should create event with all required fields', async () => {
        const event = await createTestEvent(testUser._id);
        expect(event._id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.startDate).toBeDefined();
        expect(event.endDate).toBeDefined();
      });
    });

    // -------------------------------------------------------------------------
    // Title Validation
    // -------------------------------------------------------------------------
    describe('Title Validation', () => {
      it('should trim whitespace from title', async () => {
        const event = await createTestEvent(testUser._id, {
          title: '  My Event  ',
        });
        expect(event.title).toBe('My Event');
      });

      it('should reject title exceeding 200 characters', async () => {
        await expect(
          createTestEvent(testUser._id, {
            title: 'a'.repeat(201),
          })
        ).rejects.toThrow();
      });

      it('should accept title at exactly 200 characters', async () => {
        const event = await createTestEvent(testUser._id, {
          title: 'a'.repeat(200),
        });
        expect(event.title.length).toBe(200);
      });
    });

    // -------------------------------------------------------------------------
    // Description Validation
    // -------------------------------------------------------------------------
    describe('Description Validation', () => {
      it('should accept optional description', async () => {
        const event = await createTestEvent(testUser._id, {
          description: 'Meeting agenda: discuss Q4 goals',
        });
        expect(event.description).toBe('Meeting agenda: discuss Q4 goals');
      });

      it('should trim whitespace from description', async () => {
        const event = await createTestEvent(testUser._id, {
          description: '  Meeting notes  ',
        });
        expect(event.description).toBe('Meeting notes');
      });

      it('should reject description exceeding 5000 characters', async () => {
        await expect(
          createTestEvent(testUser._id, {
            description: 'a'.repeat(5001),
          })
        ).rejects.toThrow();
      });
    });

    // -------------------------------------------------------------------------
    // Location Validation
    // -------------------------------------------------------------------------
    describe('Location Validation', () => {
      it('should accept optional location', async () => {
        const event = await createTestEvent(testUser._id, {
          location: 'Conference Room A',
        });
        expect(event.location).toBe('Conference Room A');
      });

      it('should trim whitespace from location', async () => {
        const event = await createTestEvent(testUser._id, {
          location: '  Main Office  ',
        });
        expect(event.location).toBe('Main Office');
      });

      it('should reject location exceeding 500 characters', async () => {
        await expect(
          createTestEvent(testUser._id, {
            location: 'a'.repeat(501),
          })
        ).rejects.toThrow();
      });
    });

    // -------------------------------------------------------------------------
    // Status Validation
    // -------------------------------------------------------------------------
    describe('Status Validation', () => {
      it('should default to confirmed status', async () => {
        const event = await createTestEvent(testUser._id);
        expect(event.status).toBe('confirmed');
      });

      it('should accept valid status values', async () => {
        const confirmed = await createTestEvent(testUser._id, { status: 'confirmed' });
        const tentative = await createTestEvent(testUser._id, { status: 'tentative' });
        const cancelled = await createTestEvent(testUser._id, { status: 'cancelled' });

        expect(confirmed.status).toBe('confirmed');
        expect(tentative.status).toBe('tentative');
        expect(cancelled.status).toBe('cancelled');
      });

      it('should reject invalid status', async () => {
        await expect(
          createTestEvent(testUser._id, { status: 'maybe' })
        ).rejects.toThrow();
      });
    });

    // -------------------------------------------------------------------------
    // External Source Validation
    // -------------------------------------------------------------------------
    describe('External Source Validation', () => {
      it('should default to manual source', async () => {
        const event = await createTestEvent(testUser._id);
        expect(event.externalSource).toBe('manual');
      });

      it('should accept valid external sources', async () => {
        const google = await createTestEvent(testUser._id, { externalSource: 'google' });
        const outlook = await createTestEvent(testUser._id, { externalSource: 'outlook' });
        const manual = await createTestEvent(testUser._id, { externalSource: 'manual' });

        expect(google.externalSource).toBe('google');
        expect(outlook.externalSource).toBe('outlook');
        expect(manual.externalSource).toBe('manual');
      });

      it('should reject invalid external source', async () => {
        await expect(
          createTestEvent(testUser._id, { externalSource: 'apple' })
        ).rejects.toThrow();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DATE/TIME HANDLING
  // ===========================================================================

  describe('Date/Time Handling', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should reject endDate before startDate', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000); // 1 hour before

      await expect(
        createTestEvent(testUser._id, {
          startDate: now,
          endDate: earlier,
        })
      ).rejects.toThrow(/End date must be after start date/i);
    });

    it('should accept endDate equal to startDate', async () => {
      const now = new Date();

      const event = await createTestEvent(testUser._id, {
        startDate: now,
        endDate: now,
      });
      expect(event.startDate.getTime()).toBe(event.endDate.getTime());
    });

    it('should accept endDate after startDate', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 3600000);

      const event = await createTestEvent(testUser._id, {
        startDate: now,
        endDate: later,
      });
      expect(event.endDate.getTime()).toBeGreaterThan(event.startDate.getTime());
    });

    it('should store dates correctly', async () => {
      const startDate = new Date('2026-03-15T14:00:00.000Z');
      const endDate = new Date('2026-03-15T15:30:00.000Z');

      const event = await createTestEvent(testUser._id, {
        startDate,
        endDate,
      });

      expect(event.startDate.toISOString()).toBe(startDate.toISOString());
      expect(event.endDate.toISOString()).toBe(endDate.toISOString());
    });

    it('should default timezone to UTC', async () => {
      const event = await createTestEvent(testUser._id);
      expect(event.timezone).toBe('UTC');
    });

    it('should accept custom timezone', async () => {
      const event = await createTestEvent(testUser._id, {
        timezone: 'America/New_York',
      });
      expect(event.timezone).toBe('America/New_York');
    });
  });

  // ===========================================================================
  // TEST SUITE: ALL-DAY EVENTS
  // ===========================================================================

  describe('All-Day Events', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default allDay to false', async () => {
      const event = await createTestEvent(testUser._id);
      expect(event.allDay).toBe(false);
    });

    it('should accept allDay true', async () => {
      const event = await createTestEvent(testUser._id, { allDay: true });
      expect(event.allDay).toBe(true);
    });

    it('should create all-day event spanning a single day', async () => {
      const startDate = new Date('2026-03-15T00:00:00.000Z');
      const endDate = new Date('2026-03-16T00:00:00.000Z');

      const event = await createTestEvent(testUser._id, {
        title: 'Birthday',
        allDay: true,
        startDate,
        endDate,
      });

      expect(event.allDay).toBe(true);
      expect(event.startDate.toISOString()).toBe(startDate.toISOString());
      expect(event.endDate.toISOString()).toBe(endDate.toISOString());
    });

    it('should create multi-day all-day event', async () => {
      const startDate = new Date('2026-03-15T00:00:00.000Z');
      const endDate = new Date('2026-03-18T00:00:00.000Z'); // 3 days

      const event = await createTestEvent(testUser._id, {
        title: 'Vacation',
        allDay: true,
        startDate,
        endDate,
      });

      expect(event.allDay).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: RECURRING EVENTS
  // ===========================================================================

  describe('Recurring Events', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create event without recurrence', async () => {
      const event = await createTestEvent(testUser._id);
      expect(event.recurrence).toBeUndefined();
    });

    it('should create daily recurring event', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'daily',
          interval: 1,
        },
      });

      expect(event.recurrence.frequency).toBe('daily');
      expect(event.recurrence.interval).toBe(1);
    });

    it('should create weekly recurring event', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        },
      });

      expect(event.recurrence.frequency).toBe('weekly');
      expect(event.recurrence.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should create bi-weekly recurring event', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'weekly',
          interval: 2,
        },
      });

      expect(event.recurrence.frequency).toBe('weekly');
      expect(event.recurrence.interval).toBe(2);
    });

    it('should create monthly recurring event', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'monthly',
          interval: 1,
        },
      });

      expect(event.recurrence.frequency).toBe('monthly');
    });

    it('should create yearly recurring event', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'yearly',
          interval: 1,
        },
      });

      expect(event.recurrence.frequency).toBe('yearly');
    });

    it('should accept recurrence with end date', async () => {
      const endDate = new Date('2026-12-31T23:59:59.000Z');
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endDate,
        },
      });

      expect(event.recurrence.endDate.toISOString()).toBe(endDate.toISOString());
    });

    it('should accept recurrence with count', async () => {
      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'daily',
          interval: 1,
          count: 10,
        },
      });

      expect(event.recurrence.count).toBe(10);
    });

    it('should accept recurrence with exceptions', async () => {
      const exception1 = new Date('2026-03-20T00:00:00.000Z');
      const exception2 = new Date('2026-03-27T00:00:00.000Z');

      const event = await createTestEvent(testUser._id, {
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          exceptions: [exception1, exception2],
        },
      });

      expect(event.recurrence.exceptions).toHaveLength(2);
    });

    it('should reject invalid frequency', async () => {
      await expect(
        createTestEvent(testUser._id, {
          recurrence: {
            frequency: 'hourly',
            interval: 1,
          },
        })
      ).rejects.toThrow();
    });

    it('should reject interval less than 1', async () => {
      await expect(
        createTestEvent(testUser._id, {
          recurrence: {
            frequency: 'daily',
            interval: 0,
          },
        })
      ).rejects.toThrow();
    });

    it('should reject invalid daysOfWeek values', async () => {
      await expect(
        createTestEvent(testUser._id, {
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: [7], // Invalid: max is 6 (Saturday)
          },
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // TEST SUITE: REMINDERS
  // ===========================================================================

  describe('Reminders', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create event without reminders', async () => {
      const event = await createTestEvent(testUser._id);
      expect(event.reminders).toEqual([]);
    });

    it('should create event with single reminder', async () => {
      const event = await createTestEvent(testUser._id, {
        reminders: [{ type: 'notification', minutes: 15 }],
      });

      expect(event.reminders).toHaveLength(1);
      expect(event.reminders[0].type).toBe('notification');
      expect(event.reminders[0].minutes).toBe(15);
    });

    it('should create event with multiple reminders', async () => {
      const event = await createTestEvent(testUser._id, {
        reminders: [
          { type: 'notification', minutes: 15 },
          { type: 'email', minutes: 1440 }, // 1 day
        ],
      });

      expect(event.reminders).toHaveLength(2);
    });

    it('should default reminder type to notification', async () => {
      const event = await createTestEvent(testUser._id, {
        reminders: [{ minutes: 30 }],
      });

      expect(event.reminders[0].type).toBe('notification');
    });

    it('should default reminder minutes to 15', async () => {
      const event = await createTestEvent(testUser._id, {
        reminders: [{ type: 'notification' }],
      });

      expect(event.reminders[0].minutes).toBe(15);
    });

    it('should accept email reminder type', async () => {
      const event = await createTestEvent(testUser._id, {
        reminders: [{ type: 'email', minutes: 60 }],
      });

      expect(event.reminders[0].type).toBe('email');
    });

    it('should reject invalid reminder type', async () => {
      await expect(
        createTestEvent(testUser._id, {
          reminders: [{ type: 'sms', minutes: 30 }],
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ISOLATION
  // ===========================================================================

  describe('User Isolation', () => {
    let user1, user2;

    beforeEach(async () => {
      user1 = await createTestUser();
      user2 = await createTestUser();
    });

    it('should only find events for the correct user', async () => {
      await createTestEvent(user1._id, { title: 'User 1 Event' });
      await createTestEvent(user2._id, { title: 'User 2 Event' });

      const user1Events = await Event.find({ userId: user1._id });
      const user2Events = await Event.find({ userId: user2._id });

      expect(user1Events).toHaveLength(1);
      expect(user1Events[0].title).toBe('User 1 Event');
      expect(user2Events).toHaveLength(1);
      expect(user2Events[0].title).toBe('User 2 Event');
    });

    it('should not return events from other users', async () => {
      await createTestEvent(user1._id, { title: 'Event A' });
      await createTestEvent(user1._id, { title: 'Event B' });
      await createTestEvent(user2._id, { title: 'Event C' });

      const user1Events = await Event.find({ userId: user1._id });
      expect(user1Events).toHaveLength(2);
      expect(user1Events.every(e => e.userId.equals(user1._id))).toBe(true);
    });

    it('should allow same title for different users', async () => {
      const event1 = await createTestEvent(user1._id, { title: 'Team Meeting' });
      const event2 = await createTestEvent(user2._id, { title: 'Team Meeting' });

      expect(event1.title).toBe('Team Meeting');
      expect(event2.title).toBe('Team Meeting');
      expect(event1._id).not.toEqual(event2._id);
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should set correct defaults for new event', async () => {
      const event = await createTestEvent(testUser._id);

      expect(event.allDay).toBe(false);
      expect(event.timezone).toBe('UTC');
      expect(event.status).toBe('confirmed');
      expect(event.externalSource).toBe('manual');
      expect(event.color).toBe('#3b82f6');
      expect(event.reminders).toEqual([]);
      expect(event.linkedTasks).toEqual([]);
      expect(event.linkedNotes).toEqual([]);
      expect(event.lifeAreaId).toBeNull();
      expect(event.projectId).toBeNull();
    });

    it('should set timestamps on creation', async () => {
      const event = await createTestEvent(testUser._id);

      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
      expect(event.createdAt instanceof Date).toBe(true);
      expect(event.updatedAt instanceof Date).toBe(true);
    });

    it('should update updatedAt on modification', async () => {
      const event = await createTestEvent(testUser._id);
      const originalUpdatedAt = event.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      event.title = 'Updated Title';
      await event.save();

      expect(event.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ===========================================================================
  // TEST SUITE: CRUD OPERATIONS
  // ===========================================================================

  describe('CRUD Operations', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create an event', async () => {
      const event = await createTestEvent(testUser._id, {
        title: 'New Event',
        description: 'Description',
        location: 'Office',
      });

      expect(event._id).toBeDefined();
      expect(event.title).toBe('New Event');
    });

    it('should read an event by ID', async () => {
      const created = await createTestEvent(testUser._id, { title: 'Find Me' });
      const found = await Event.findById(created._id);

      expect(found).not.toBeNull();
      expect(found.title).toBe('Find Me');
    });

    it('should update an event', async () => {
      const event = await createTestEvent(testUser._id, { title: 'Original' });

      const updated = await Event.findByIdAndUpdate(
        event._id,
        { title: 'Updated', status: 'tentative' },
        { new: true }
      );

      expect(updated.title).toBe('Updated');
      expect(updated.status).toBe('tentative');
    });

    it('should delete an event', async () => {
      const event = await createTestEvent(testUser._id);
      await Event.findByIdAndDelete(event._id);

      const found = await Event.findById(event._id);
      expect(found).toBeNull();
    });

    it('should find events in date range', async () => {
      const baseDate = new Date('2026-03-15T10:00:00.000Z');

      // Create events on different dates
      await createTestEvent(testUser._id, {
        title: 'Event 1',
        startDate: new Date('2026-03-10T10:00:00.000Z'),
        endDate: new Date('2026-03-10T11:00:00.000Z'),
      });
      await createTestEvent(testUser._id, {
        title: 'Event 2',
        startDate: new Date('2026-03-15T10:00:00.000Z'),
        endDate: new Date('2026-03-15T11:00:00.000Z'),
      });
      await createTestEvent(testUser._id, {
        title: 'Event 3',
        startDate: new Date('2026-03-20T10:00:00.000Z'),
        endDate: new Date('2026-03-20T11:00:00.000Z'),
      });

      // Find events between Mar 14 and Mar 16
      const rangeStart = new Date('2026-03-14T00:00:00.000Z');
      const rangeEnd = new Date('2026-03-16T23:59:59.000Z');

      const events = await Event.find({
        userId: testUser._id,
        startDate: { $lte: rangeEnd },
        endDate: { $gte: rangeStart },
      });

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Event 2');
    });
  });

  // ===========================================================================
  // TEST SUITE: RELATIONSHIPS
  // ===========================================================================

  describe('Relationships', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should accept linked tasks', async () => {
      const taskId1 = new mongoose.Types.ObjectId();
      const taskId2 = new mongoose.Types.ObjectId();

      const event = await createTestEvent(testUser._id, {
        linkedTasks: [taskId1, taskId2],
      });

      expect(event.linkedTasks).toHaveLength(2);
    });

    it('should accept linked notes', async () => {
      const noteId = new mongoose.Types.ObjectId();

      const event = await createTestEvent(testUser._id, {
        linkedNotes: [noteId],
      });

      expect(event.linkedNotes).toHaveLength(1);
    });

    it('should accept lifeAreaId', async () => {
      const lifeAreaId = new mongoose.Types.ObjectId();

      const event = await createTestEvent(testUser._id, {
        lifeAreaId,
      });

      expect(event.lifeAreaId).toEqual(lifeAreaId);
    });

    it('should accept projectId', async () => {
      const projectId = new mongoose.Types.ObjectId();

      const event = await createTestEvent(testUser._id, {
        projectId,
      });

      expect(event.projectId).toEqual(projectId);
    });

    it('should accept externalId for calendar sync', async () => {
      const event = await createTestEvent(testUser._id, {
        externalId: 'google-cal-event-12345',
        externalSource: 'google',
      });

      expect(event.externalId).toBe('google-cal-event-12345');
      expect(event.externalSource).toBe('google');
    });
  });

  // ===========================================================================
  // TEST SUITE: APPEARANCE
  // ===========================================================================

  describe('Appearance', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default color to primary blue', async () => {
      const event = await createTestEvent(testUser._id);
      expect(event.color).toBe('#3b82f6');
    });

    it('should accept custom color', async () => {
      const event = await createTestEvent(testUser._id, {
        color: '#ef4444',
      });
      expect(event.color).toBe('#ef4444');
    });

    it('should accept meeting URL', async () => {
      const event = await createTestEvent(testUser._id, {
        meetingUrl: 'https://zoom.us/j/123456789',
      });
      expect(event.meetingUrl).toBe('https://zoom.us/j/123456789');
    });

    it('should trim meeting URL', async () => {
      const event = await createTestEvent(testUser._id, {
        meetingUrl: '  https://meet.google.com/abc-defg-hij  ',
      });
      expect(event.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
    });
  });
});
