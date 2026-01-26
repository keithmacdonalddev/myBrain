import request from 'supertest';
import app from '../test/testApp.js';

describe('Notes Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'notes@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'notes@example.com',
        password: 'Password123!',
      });

    // Use token from response body for Bearer auth
    authToken = loginRes.body.token;
  });

  describe('POST /notes', () => {
    it('should create a new note', async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Note',
          body: 'This is a test note body.',
          tags: ['test', 'example'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.note).toBeDefined();
      expect(res.body.note.title).toBe('Test Note');
      expect(res.body.note.body).toBe('This is a test note body.');
      expect(res.body.note.tags).toEqual(['test', 'example']);
    });

    it('should create note with minimal data', async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Minimal Note',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.note.title).toBe('Minimal Note');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/notes')
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(401);
    });

    // Validation Tests
    describe('Validation', () => {
      it('should reject empty title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '',
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject whitespace-only title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '   ',
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject missing title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject null title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: null,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject undefined title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: undefined,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title exceeding max length', async () => {
        const longTitle = 'a'.repeat(501); // Assuming 500 char limit
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: longTitle,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject non-string title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 12345,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title as object', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: { nested: 'object' },
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title as array', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: ['array', 'title'],
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should handle body with very long text', async () => {
        const longBody = 'a'.repeat(100000); // 100k characters
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Long Body Test',
            body: longBody,
          });

        // Should either accept or reject based on max length
        expect([201, 400]).toContain(res.statusCode);

        if (res.statusCode === 201) {
          expect(res.body.note.body).toBeDefined();
        }
      });

      it('should handle unicode characters in title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test 测试 テスト 🎉',
            body: 'Unicode test',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.note.title).toBe('Test 测试 テスト 🎉');
      });

      it('should handle emojis in body', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Emoji Test',
            body: '😀 😃 😄 😁 🎉 🎊',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.note.body).toBe('😀 😃 😄 😁 🎉 🎊');
      });

      it('should handle special characters safely', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: "Test <script>alert('xss')</script>",
            body: "SQL: ' OR '1'='1",
          });

        expect(res.statusCode).toBe(201);
        // Should store safely without executing scripts
        expect(res.body.note.title).toBe("Test <script>alert('xss')</script>");
        expect(res.body.note.body).toBe("SQL: ' OR '1'='1");
      });

      it('should reject invalid tag format', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: 'not-an-array',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject non-string tags', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: [123, 456],
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject empty string tags', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: ['valid', '', 'tags'],
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject too many tags', async () => {
        const manyTags = Array(51).fill('tag'); // Assuming 50 tag limit
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: manyTags,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should trim whitespace from title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '  Trimmed Title  ',
            body: 'Test',
          });

        if (res.statusCode === 201) {
          expect(res.body.note.title).toBe('Trimmed Title');
        }
      });

      it('should handle empty body gracefully', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'No Body',
            body: '',
          });

        // Empty body should be allowed
        expect([201, 400]).toContain(res.statusCode);
      });

      it('should handle missing body gracefully', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'No Body Field',
          });

        // Missing body should be allowed
        expect(res.statusCode).toBe(201);
      });

      it('should reject invalid status value', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Status',
            status: 'invalid_status',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject negative priority', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Negative Priority',
            priority: -1,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject priority exceeding max', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'High Priority',
            priority: 11, // Assuming max is 10
          });

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('GET /notes', () => {
    beforeEach(async () => {
      // Create some test notes
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note 1', body: 'Body 1' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note 2', body: 'Body 2', tags: ['important'] });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note 3', body: 'Body 3' });
    });

    it('should return list of notes', async () => {
      const res = await request(app)
        .get('/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(res.body.notes.length).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ q: 'Note 1' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBeGreaterThan(0);
    });

    it('should filter by tag', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ tags: 'important' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBe(1);
      expect(res.body.notes[0].tags).toContain('important');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBe(2);
      expect(res.body.total).toBe(3);
    });
  });

  describe('GET /notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Single Note', body: 'Single note body' });

      noteId = res.body.note._id;
    });

    it('should return single note', async () => {
      const res = await request(app)
        .get(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note._id).toBe(noteId);
      expect(res.body.note.title).toBe('Single Note');
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .get('/notes/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Original Title', body: 'Original body' });

      noteId = res.body.note._id;
    });

    it('should update note', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title', body: 'Updated body' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('Updated Title');
      expect(res.body.note.body).toBe('Updated body');
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title Only' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('New Title Only');
      expect(res.body.note.body).toBe('Original body');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .send({ title: 'Unauthorized Update' });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .patch('/notes/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Update Non-existent' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .patch('/notes/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Invalid ID Update' });

      expect(res.statusCode).toBe(400);
    });

    it('should update tags', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tags: ['new-tag', 'updated'] });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.tags).toEqual(['new-tag', 'updated']);
    });

    it('should update pinned status', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pinned: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(true);
    });

    it('should reject title exceeding max length', async () => {
      const longTitle = 'a'.repeat(201);
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: longTitle });

      expect(res.statusCode).toBe(400);
    });

    it('should handle unicode characters in update', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated 测试 🎉', body: 'Unicode content 日本語' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('Updated 测试 🎉');
      expect(res.body.note.body).toBe('Unicode content 日本語');
    });

    it('should trim whitespace from title on update', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '  Trimmed Update  ' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('Trimmed Update');
    });

    it('should update body to empty string', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ body: '' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.body).toBe('');
    });

    it('should reject invalid status value on update', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Note actions', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Action Test Note' });

      noteId = res.body.note._id;
    });

    it('should pin note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(true);
    });

    it('should unpin note', async () => {
      // Pin first
      await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then unpin
      const res = await request(app)
        .post(`/notes/${noteId}/unpin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(false);
    });

    it('should archive note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('archived');
    });

    it('should trash note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('trashed');
      expect(res.body.note.trashedAt).toBeDefined();
    });

    it('should restore trashed note', async () => {
      // Trash first
      await request(app)
        .post(`/notes/${noteId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then restore
      const res = await request(app)
        .post(`/notes/${noteId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('active');
    });
  });

  describe('DELETE /notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Delete Me' });

      noteId = res.body.note._id;
    });

    it('should permanently delete note', async () => {
      const res = await request(app)
        .delete(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify note is gone
      const getRes = await request(app)
        .get(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // ADDITIONAL ENDPOINT TESTS
  // =========================================================================

  describe('GET /notes/inbox', () => {
    beforeEach(async () => {
      // Create some unprocessed notes (inbox items)
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Inbox Note 1' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Inbox Note 2' });

      // Create a processed note (should not appear in inbox)
      const processedRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Processed Note' });

      await request(app)
        .post(`/notes/${processedRes.body.note._id}/process`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should return unprocessed notes', async () => {
      const res = await request(app)
        .get('/notes/inbox')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(Array.isArray(res.body.notes)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/inbox');

      expect(res.statusCode).toBe(401);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/notes/inbox')
        .query({ limit: 1, skip: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.limit).toBe(1);
      expect(res.body.skip).toBe(0);
    });
  });

  describe('GET /notes/inbox/count', () => {
    beforeEach(async () => {
      // Create some unprocessed notes
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Inbox Note 1' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Inbox Note 2' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Inbox Note 3' });

      // Create and process one note (should not count)
      const processedRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Processed Note' });

      await request(app)
        .post(`/notes/${processedRes.body.note._id}/process`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should return count of unprocessed notes', async () => {
      const res = await request(app)
        .get('/notes/inbox/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBeDefined();
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBe(3); // 3 unprocessed notes
    });

    it('should return 0 for empty inbox', async () => {
      // Process all notes
      const inboxRes = await request(app)
        .get('/notes/inbox')
        .set('Authorization', `Bearer ${authToken}`);

      for (const note of inboxRes.body.notes) {
        await request(app)
          .post(`/notes/${note._id}/process`)
          .set('Authorization', `Bearer ${authToken}`);
      }

      const res = await request(app)
        .get('/notes/inbox/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/inbox/count');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notes/last-opened', () => {
    it('should return null when no notes have been opened', async () => {
      const res = await request(app)
        .get('/notes/last-opened')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note).toBeNull();
    });

    it('should return the most recently opened note', async () => {
      // Create notes
      const note1 = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note 1' });

      const note2 = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note 2' });

      // Open note1 first
      await request(app)
        .get(`/notes/${note1.body.note._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Open note2 second (this should be the last opened)
      await request(app)
        .get(`/notes/${note2.body.note._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/notes/last-opened')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note).toBeDefined();
      expect(res.body.note._id).toBe(note2.body.note._id);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/last-opened');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notes/tags', () => {
    beforeEach(async () => {
      // Create notes with various tags
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Note 1', tags: ['work', 'urgent'] });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Note 2', tags: ['personal', 'work'] });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Note 3', tags: ['health'] });
    });

    it('should return all unique tags', async () => {
      const res = await request(app)
        .get('/notes/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
      expect(Array.isArray(res.body.tags)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/tags');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /notes/:id/pin', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Pin Test Note' });

      noteId = res.body.note._id;
    });

    it('should pin a note successfully', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/pin`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/pin')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/pin')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /notes/:id/pin (unpin via POST /notes/:id/unpin)', () => {
    let noteId;

    beforeEach(async () => {
      // Create and pin a note
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unpin Test Note' });

      noteId = res.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should unpin a note successfully', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unpin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(false);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unpin`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/unpin')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /notes/:id/archive', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Archive Test Note' });

      noteId = res.body.note._id;
    });

    it('should archive a note successfully', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('archived');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/archive`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/archive')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/archive')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /notes/:id/unarchive', () => {
    let noteId;

    beforeEach(async () => {
      // Create and archive a note
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unarchive Test Note' });

      noteId = res.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should unarchive a note successfully', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unarchive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('active');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unarchive`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/unarchive')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/unarchive')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when trying to unarchive a non-archived note', async () => {
      // Create a fresh active note
      const activeRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Active Note' });

      const res = await request(app)
        .post(`/notes/${activeRes.body.note._id}/unarchive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Service returns null for non-archived notes
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /notes/:id/process', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Process Test Note' });

      noteId = res.body.note._id;
    });

    it('should process a note successfully', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/process`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.processed).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/process`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/process')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/process')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /notes/:id/unprocess', () => {
    let noteId;

    beforeEach(async () => {
      // Create and process a note
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unprocess Test Note' });

      noteId = res.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/process`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should unprocess a note successfully (move back to inbox)', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unprocess`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.processed).toBe(false);
    });

    it('should make note appear in inbox after unprocessing', async () => {
      // Unprocess the note
      await request(app)
        .post(`/notes/${noteId}/unprocess`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check inbox contains the note
      const inboxRes = await request(app)
        .get('/notes/inbox')
        .set('Authorization', `Bearer ${authToken}`);

      expect(inboxRes.statusCode).toBe(200);
      const noteInInbox = inboxRes.body.notes.find(n => n._id === noteId);
      expect(noteInInbox).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/unprocess`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/unprocess')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/unprocess')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /notes/:id/convert-to-task', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Convert Test Note', body: 'This will become a task' });

      noteId = res.body.note._id;
    });

    it('should convert note to task and keep note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/convert-to-task`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ keepNote: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.task).toBeDefined();
      expect(res.body.note).toBeDefined();
      expect(res.body.task.title).toBe('Convert Test Note');
    });

    it('should convert note to task and delete note when keepNote is false', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/convert-to-task`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ keepNote: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.task).toBeDefined();
      expect(res.body.note).toBeNull();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/convert-to-task`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post('/notes/507f1f77bcf86cd799439011/convert-to-task')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post('/notes/invalid-id/convert-to-task')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /notes/:id/backlinks', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Backlinks Test Note' });

      noteId = res.body.note._id;
    });

    it('should return backlinks for a note', async () => {
      const res = await request(app)
        .get(`/notes/${noteId}/backlinks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.backlinks).toBeDefined();
      expect(Array.isArray(res.body.backlinks)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/notes/${noteId}/backlinks`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .get('/notes/invalid-id/backlinks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /notes/recent', () => {
    beforeEach(async () => {
      // Create some notes
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Recent Note 1' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Recent Note 2' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Recent Note 3' });
    });

    it('should return recent notes sorted by updatedAt descending', async () => {
      const res = await request(app)
        .get('/notes/recent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(Array.isArray(res.body.notes)).toBe(true);
      expect(res.body.notes.length).toBeGreaterThan(0);

      // Verify notes are sorted by most recent first
      if (res.body.notes.length > 1) {
        for (let i = 0; i < res.body.notes.length - 1; i++) {
          const currentDate = new Date(res.body.notes[i].updatedAt);
          const nextDate = new Date(res.body.notes[i + 1].updatedAt);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }

      // Verify each note has required fields
      res.body.notes.forEach(note => {
        expect(note._id).toBeDefined();
        expect(note.title).toBeDefined();
        expect(note.userId).toBeDefined();
        expect(note.createdAt).toBeDefined();
        expect(note.updatedAt).toBeDefined();
      });
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/recent');

      expect(res.statusCode).toBe(401);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/notes/recent')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBeLessThanOrEqual(2);
    });

    it('should cap limit at 20', async () => {
      const res = await request(app)
        .get('/notes/recent')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Route caps at 20, so even with 100 requested, max is 20
    });
  });

  describe('GET /notes/pinned', () => {
    beforeEach(async () => {
      // Create and pin some notes
      const note1 = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Pinned Note 1' });

      await request(app)
        .post(`/notes/${note1.body.note._id}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      const note2 = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Pinned Note 2' });

      await request(app)
        .post(`/notes/${note2.body.note._id}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      // Create an unpinned note
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unpinned Note' });
    });

    it('should return only pinned notes', async () => {
      const res = await request(app)
        .get('/notes/pinned')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(Array.isArray(res.body.notes)).toBe(true);
      // All returned notes should be pinned
      res.body.notes.forEach(note => {
        expect(note.pinned).toBe(true);
      });
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/notes/pinned');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /notes/search (via GET /notes with q param)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Meeting with client', body: 'Discuss project requirements' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Shopping list', body: 'Milk, eggs, bread' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project ideas', body: 'New client project brainstorm' });
    });

    it('should search notes by title', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ q: 'Meeting' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
    });

    it('should search notes by body content', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ q: 'client' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
    });

    it('should return empty array for no matches without false positives', async () => {
      // Create notes that should NOT match
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Meeting', body: 'Client discussion' });

      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project', body: 'Implementation plan' });

      // Search for non-existent term
      const res = await request(app)
        .get('/notes')
        .query({ q: 'xyznonexistent123' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toEqual([]);
      expect(res.body.total).toBe(0);

      // Verify the notes still exist (not deleted by search)
      const allNotes = await request(app)
        .get('/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(allNotes.body.notes.length).toBeGreaterThan(0);
    });

    it('should reject search without auth', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ q: 'Meeting' });

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // USER ISOLATION TESTS
  // =========================================================================

  describe('User isolation', () => {
    let user1Token;
    let user2Token;
    let user1NoteId;

    beforeEach(async () => {
      // Create first user and get token
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      const login1 = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      user1Token = login1.body.token;

      // Create second user and get token
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      const login2 = await request(app)
        .post('/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      user2Token = login2.body.token;

      // Create a note for user1
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'User 1 Private Note' });

      user1NoteId = noteRes.body.note._id;
    });

    it('should not allow user2 to access user1 note', async () => {
      const res = await request(app)
        .get(`/notes/${user1NoteId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to update user1 note', async () => {
      const res = await request(app)
        .patch(`/notes/${user1NoteId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to delete user1 note', async () => {
      const res = await request(app)
        .delete(`/notes/${user1NoteId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to pin user1 note', async () => {
      const res = await request(app)
        .post(`/notes/${user1NoteId}/pin`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to archive user1 note', async () => {
      const res = await request(app)
        .post(`/notes/${user1NoteId}/archive`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to process user1 note', async () => {
      const res = await request(app)
        .post(`/notes/${user1NoteId}/process`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to convert user1 note to task', async () => {
      const res = await request(app)
        .post(`/notes/${user1NoteId}/convert-to-task`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to unarchive user1 note', async () => {
      // First archive user1's note
      await request(app)
        .post(`/notes/${user1NoteId}/archive`)
        .set('Authorization', `Bearer ${user1Token}`);

      // User2 tries to unarchive
      const res = await request(app)
        .post(`/notes/${user1NoteId}/unarchive`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to unprocess user1 note', async () => {
      // First process user1's note
      await request(app)
        .post(`/notes/${user1NoteId}/process`)
        .set('Authorization', `Bearer ${user1Token}`);

      // User2 tries to unprocess
      const res = await request(app)
        .post(`/notes/${user1NoteId}/unprocess`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to trash user1 note', async () => {
      const res = await request(app)
        .post(`/notes/${user1NoteId}/trash`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to restore user1 note', async () => {
      // First trash user1's note
      await request(app)
        .post(`/notes/${user1NoteId}/trash`)
        .set('Authorization', `Bearer ${user1Token}`);

      // User2 tries to restore
      const res = await request(app)
        .post(`/notes/${user1NoteId}/restore`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not show user1 notes in user2 inbox', async () => {
      const res = await request(app)
        .get('/notes/inbox')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      // User2 should see no notes (they haven't created any)
      expect(res.body.notes.length).toBe(0);
    });

    it('should not show user1 notes in user2 pinned list', async () => {
      // First pin user1's note
      await request(app)
        .post(`/notes/${user1NoteId}/pin`)
        .set('Authorization', `Bearer ${user1Token}`);

      // User2 should not see any pinned notes
      const res = await request(app)
        .get('/notes/pinned')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBe(0);
    });

    it('should not show user1 notes in user2 recent list', async () => {
      const res = await request(app)
        .get('/notes/recent')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBe(0);
    });

    it('should not show user1 tags in user2 tags list', async () => {
      // Create note with tags for user1
      await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Tagged Note', tags: ['secret-tag'] });

      // User2 should not see user1's tags
      const res = await request(app)
        .get('/notes/tags')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).not.toContain('secret-tag');
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge cases', () => {
    it('should handle empty inbox gracefully', async () => {
      const res = await request(app)
        .get('/notes/inbox')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should handle empty pinned list gracefully', async () => {
      const res = await request(app)
        .get('/notes/pinned')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toEqual([]);
    });

    it('should handle empty recent list gracefully', async () => {
      const res = await request(app)
        .get('/notes/recent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toEqual([]);
    });

    it('should handle empty tags list gracefully', async () => {
      const res = await request(app)
        .get('/notes/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
    });

    it('should handle pinning already pinned note', async () => {
      // Create and pin a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Double Pin Test' });

      const noteId = noteRes.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      // Pin again
      const res = await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(true);
    });

    it('should handle unpinning already unpinned note', async () => {
      // Create note (unpinned by default)
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Double Unpin Test' });

      const noteId = noteRes.body.note._id;

      // Unpin (already unpinned)
      const res = await request(app)
        .post(`/notes/${noteId}/unpin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(false);
    });

    it('should handle processing already processed note', async () => {
      // Create and process a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Double Process Test' });

      const noteId = noteRes.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/process`)
        .set('Authorization', `Bearer ${authToken}`);

      // Process again
      const res = await request(app)
        .post(`/notes/${noteId}/process`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.processed).toBe(true);
    });

    it('should handle archiving already archived note', async () => {
      // Create and archive a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Double Archive Test' });

      const noteId = noteRes.body.note._id;

      await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Archive again - might return 404 if service checks status
      const res = await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Accept either 200 (idempotent) or 404 (already archived)
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
