import request from 'supertest';
import app from '../test/testApp.js';

describe('Events Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'events@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'events@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  // Helper to create a valid event date range
  const getFutureDates = (daysFromNow = 1, durationHours = 1) => {
    const start = new Date();
    start.setDate(start.getDate() + daysFromNow);
    start.setHours(10, 0, 0, 0);

    const end = new Date(start);
    end.setHours(start.getHours() + durationHours);

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  describe('POST /events', () => {
    it('should create a new event', async () => {
      const { startDate, endDate } = getFutureDates(1, 2);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Team Meeting',
          description: 'Weekly sync up',
          startDate,
          endDate,
          location: 'Conference Room A',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event).toBeDefined();
      expect(res.body.event.title).toBe('Team Meeting');
      expect(res.body.event.description).toBe('Weekly sync up');
      expect(res.body.event.location).toBe('Conference Room A');
    });

    it('should create event with minimal data (title and dates only)', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Minimal Event',
          startDate,
          endDate,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event.title).toBe('Minimal Event');
    });

    it('should create all-day event', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Company Holiday',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          allDay: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event.allDay).toBe(true);
    });

    it('should create event with meeting URL', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Virtual Meeting',
          startDate,
          endDate,
          meetingUrl: 'https://zoom.us/j/123456789',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event.meetingUrl).toBe('https://zoom.us/j/123456789');
    });

    it('should create event with color', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Important Event',
          startDate,
          endDate,
          color: '#ef4444',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event.color).toBe('#ef4444');
    });

    it('should create event with reminders', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event with Reminders',
          startDate,
          endDate,
          reminders: [
            { type: 'notification', minutes: 15 },
            { type: 'email', minutes: 1440 },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.event.reminders).toHaveLength(2);
      expect(res.body.event.reminders[0].minutes).toBe(15);
    });

    it('should reject event without title', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate,
          endDate,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject event without startDate', async () => {
      const { endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'No Start Date',
          endDate,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject event without endDate', async () => {
      const { startDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'No End Date',
          startDate,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('should reject without auth', async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .send({
          title: 'Test Event',
          startDate,
          endDate,
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /events', () => {
    beforeEach(async () => {
      // Create events for different dates
      const dates1 = getFutureDates(1);
      const dates2 = getFutureDates(5);
      const dates3 = getFutureDates(10);

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Event 1', ...dates1 });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Event 2', ...dates2 });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Event 3', ...dates3 });
    });

    it('should return events in date range', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 15);

      const res = await request(app)
        .get('/events')
        .query({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events).toBeDefined();
      expect(res.body.events.length).toBe(3);
    });

    it('should filter events by date range', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 3);

      const res = await request(app)
        .get('/events')
        .query({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Only Event 1 should be in this range
      expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/events')
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /events/upcoming', () => {
    beforeEach(async () => {
      // Create events at different future dates
      const dates1 = getFutureDates(1);
      const dates2 = getFutureDates(5);
      const dates3 = getFutureDates(14);

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Soon Event', ...dates1 });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Week Event', ...dates2 });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Later Event', ...dates3 });
    });

    it('should return upcoming events (default 7 days)', async () => {
      const res = await request(app)
        .get('/events/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events).toBeDefined();
      // Should include events within 7 days
      expect(res.body.events.length).toBeGreaterThanOrEqual(2);
    });

    it('should return upcoming events with custom days parameter', async () => {
      const res = await request(app)
        .get('/events/upcoming')
        .query({ days: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Only the "Soon Event" should be in 3 days
      expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/events/upcoming');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /events/day/:date', () => {
    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      // Create events for tomorrow
      const start1 = new Date(dateString + 'T09:00:00Z');
      const end1 = new Date(dateString + 'T10:00:00Z');
      const start2 = new Date(dateString + 'T14:00:00Z');
      const end2 = new Date(dateString + 'T15:00:00Z');

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Morning Meeting',
          startDate: start1.toISOString(),
          endDate: end1.toISOString(),
        });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Afternoon Meeting',
          startDate: start2.toISOString(),
          endDate: end2.toISOString(),
        });
    });

    it('should return events for a specific day', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/events/day/${dateString}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events).toBeDefined();
      expect(res.body.events.length).toBe(2);
    });

    it('should return empty array for day with no events', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 100);
      const dateString = farFuture.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/events/day/${dateString}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events).toHaveLength(0);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/events/day/2025-02-15');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /events/:id', () => {
    let eventId;

    beforeEach(async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Single Event',
          description: 'Event description',
          startDate,
          endDate,
          location: 'Test Location',
        });

      eventId = res.body.event._id;
    });

    it('should return single event', async () => {
      const res = await request(app)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.event._id).toBe(eventId);
      expect(res.body.event.title).toBe('Single Event');
      expect(res.body.event.description).toBe('Event description');
      expect(res.body.event.location).toBe('Test Location');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .get('/events/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/events/${eventId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /events/:id', () => {
    let eventId;

    beforeEach(async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Original Title',
          description: 'Original description',
          startDate,
          endDate,
          location: 'Original Location',
        });

      eventId = res.body.event._id;
    });

    it('should update event title', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.title).toBe('Updated Title');
      // Other fields should remain unchanged
      expect(res.body.event.description).toBe('Original description');
    });

    it('should update event description', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.description).toBe('Updated description');
    });

    it('should update event location', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: 'New Conference Room' });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.location).toBe('New Conference Room');
    });

    it('should update event times', async () => {
      const { startDate, endDate } = getFutureDates(3, 2);

      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startDate, endDate });

      expect(res.statusCode).toBe(200);
      expect(new Date(res.body.event.startDate).toISOString()).toBe(startDate);
    });

    it('should update meeting URL', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ meetingUrl: 'https://meet.google.com/abc-defg-hij' });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Multi-Update Title',
          description: 'Multi-Update description',
          color: '#10b981',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.title).toBe('Multi-Update Title');
      expect(res.body.event.description).toBe('Multi-Update description');
      expect(res.body.event.color).toBe('#10b981');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .patch('/events/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch(`/events/${eventId}`)
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /events/:id', () => {
    let eventId;

    beforeEach(async () => {
      const { startDate, endDate } = getFutureDates();

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Delete Me',
          startDate,
          endDate,
        });

      eventId = res.body.event._id;
    });

    it('should delete event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify event is gone
      const getRes = await request(app)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .delete('/events/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /events/:id/link-task', () => {
    let eventId;
    let taskId;

    beforeEach(async () => {
      // Create an event
      const { startDate, endDate } = getFutureDates();
      const eventRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event for Linking',
          startDate,
          endDate,
        });
      eventId = eventRes.body.event._id;

      // Create a task
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task to Link' });
      taskId = taskRes.body.task._id;
    });

    it('should link task to event', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-task`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.linkedTasks).toContain(taskId);
    });

    it('should reject without taskId', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-task`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_TASK_ID');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .post('/events/507f1f77bcf86cd799439011/link-task')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-task`)
        .send({ taskId });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /events/:id/link-task/:taskId', () => {
    let eventId;
    let taskId;

    beforeEach(async () => {
      // Create an event
      const { startDate, endDate } = getFutureDates();
      const eventRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event with Linked Task',
          startDate,
          endDate,
        });
      eventId = eventRes.body.event._id;

      // Create a task
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Linked Task' });
      taskId = taskRes.body.task._id;

      // Link the task to the event
      await request(app)
        .post(`/events/${eventId}/link-task`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });
    });

    it('should unlink task from event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}/link-task/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.event.linkedTasks).not.toContain(taskId);
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .delete(`/events/507f1f77bcf86cd799439011/link-task/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}/link-task/${taskId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /events/:id/link-note', () => {
    let eventId;
    let noteId;

    beforeEach(async () => {
      // Create an event
      const { startDate, endDate } = getFutureDates();
      const eventRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event for Note Linking',
          startDate,
          endDate,
        });
      eventId = eventRes.body.event._id;

      // Create a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note to Link', content: 'Note content' });
      noteId = noteRes.body.note._id;
    });

    it('should link note to event', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });

      expect(res.statusCode).toBe(200);
      expect(res.body.event.linkedNotes).toContain(noteId);
    });

    it('should reject without noteId', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('MISSING_NOTE_ID');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .post('/events/507f1f77bcf86cd799439011/link-note')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/link-note`)
        .send({ noteId });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /events/:id/link-note/:noteId', () => {
    let eventId;
    let noteId;

    beforeEach(async () => {
      // Create an event
      const { startDate, endDate } = getFutureDates();
      const eventRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Event with Linked Note',
          startDate,
          endDate,
        });
      eventId = eventRes.body.event._id;

      // Create a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Linked Note', content: 'Note content' });
      noteId = noteRes.body.note._id;

      // Link the note to the event
      await request(app)
        .post(`/events/${eventId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });
    });

    it('should unlink note from event', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}/link-note/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.event.linkedNotes).not.toContain(noteId);
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .delete(`/events/507f1f77bcf86cd799439011/link-note/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete(`/events/${eventId}/link-note/${noteId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Event status filtering', () => {
    it('should filter events by status', async () => {
      // Create events with different statuses
      const dates = getFutureDates(2);

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Confirmed Event',
          ...dates,
        });

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Tentative Event',
          ...dates,
        });

      // Update second event to be tentative
      const allRes = await request(app)
        .get('/events')
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`);

      const tentativeEvent = allRes.body.events.find(e => e.title === 'Tentative Event');

      await request(app)
        .patch(`/events/${tentativeEvent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'tentative' });

      // Now filter by status
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const res = await request(app)
        .get('/events')
        .query({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status: 'tentative',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events.length).toBeGreaterThanOrEqual(1);
      expect(res.body.events.every(e => e.status === 'tentative')).toBe(true);
    });

    it('should return only confirmed events by default in upcoming', async () => {
      // Create a confirmed and tentative event
      const dates = getFutureDates(2);

      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Confirmed for Upcoming',
          ...dates,
        });

      const tentativeRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Tentative for Upcoming',
          ...dates,
        });

      // Update to tentative
      await request(app)
        .patch(`/events/${tentativeRes.body.event._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'tentative' });

      // Get upcoming events (should only return confirmed)
      const res = await request(app)
        .get('/events/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // All returned events should be confirmed
      expect(res.body.events.every(e => e.status === 'confirmed')).toBe(true);
    });
  });

  describe('Event isolation between users', () => {
    let otherUserToken;

    beforeEach(async () => {
      // Create another user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Password123!',
        });

      otherUserToken = loginRes.body.token;

      // Create event as first user
      const { startDate, endDate } = getFutureDates();
      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'User 1 Event',
          startDate,
          endDate,
        });
    });

    it('should not return other user events', async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const res = await request(app)
        .get('/events')
        .query({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.events.length).toBe(0);
    });

    it('should not allow other user to get event by id', async () => {
      const { startDate, endDate } = getFutureDates();
      const createRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Private Event',
          startDate,
          endDate,
        });

      const eventId = createRes.body.event._id;

      const res = await request(app)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to update event', async () => {
      const { startDate, endDate } = getFutureDates();
      const createRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Private Event',
          startDate,
          endDate,
        });

      const eventId = createRes.body.event._id;

      const res = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked!' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to delete event', async () => {
      const { startDate, endDate } = getFutureDates();
      const createRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Private Event',
          startDate,
          endDate,
        });

      const eventId = createRes.body.event._id;

      const res = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
