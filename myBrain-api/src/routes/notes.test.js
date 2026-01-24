import request from 'supertest';
import app from '../test/testApp.js';

describe('Notes Routes', () => {
  let authCookies;

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

    // Use token from response body to create cookie string
    const token = loginRes.body.token;
    authCookies = `token=${token}`;
  });

  describe('POST /notes', () => {
    it('should create a new note', async () => {
      const res = await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
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
        .set('Cookie', authCookies)
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
  });

  describe('GET /notes', () => {
    beforeEach(async () => {
      // Create some test notes
      await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Note 1', body: 'Body 1' });

      await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Note 2', body: 'Body 2', tags: ['important'] });

      await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Note 3', body: 'Body 3' });
    });

    it('should return list of notes', async () => {
      const res = await request(app)
        .get('/notes')
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(res.body.notes.length).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ q: 'Note 1' })
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBeGreaterThan(0);
    });

    it('should filter by tag', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ tag: 'important' })
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes.length).toBe(1);
      expect(res.body.notes[0].tags).toContain('important');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/notes')
        .query({ limit: 2 })
        .set('Cookie', authCookies);

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
        .set('Cookie', authCookies)
        .send({ title: 'Single Note', body: 'Single note body' });

      noteId = res.body.note._id;
    });

    it('should return single note', async () => {
      const res = await request(app)
        .get(`/notes/${noteId}`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note._id).toBe(noteId);
      expect(res.body.note.title).toBe('Single Note');
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .get('/notes/507f1f77bcf86cd799439011')
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Original Title', body: 'Original body' });

      noteId = res.body.note._id;
    });

    it('should update note', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Cookie', authCookies)
        .send({ title: 'Updated Title', body: 'Updated body' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('Updated Title');
      expect(res.body.note.body).toBe('Updated body');
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}`)
        .set('Cookie', authCookies)
        .send({ title: 'New Title Only' });

      expect(res.statusCode).toBe(200);
      expect(res.body.note.title).toBe('New Title Only');
      expect(res.body.note.body).toBe('Original body');
    });
  });

  describe('Note actions', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Action Test Note' });

      noteId = res.body.note._id;
    });

    it('should pin note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(true);
    });

    it('should unpin note', async () => {
      // Pin first
      await request(app)
        .post(`/notes/${noteId}/pin`)
        .set('Cookie', authCookies);

      // Then unpin
      const res = await request(app)
        .post(`/notes/${noteId}/unpin`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.pinned).toBe(false);
    });

    it('should archive note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/archive`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('archived');
    });

    it('should trash note', async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/trash`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('trashed');
      expect(res.body.note.trashedAt).toBeDefined();
    });

    it('should restore trashed note', async () => {
      // Trash first
      await request(app)
        .post(`/notes/${noteId}/trash`)
        .set('Cookie', authCookies);

      // Then restore
      const res = await request(app)
        .post(`/notes/${noteId}/restore`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.note.status).toBe('active');
    });
  });

  describe('DELETE /notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/notes')
        .set('Cookie', authCookies)
        .send({ title: 'Delete Me' });

      noteId = res.body.note._id;
    });

    it('should permanently delete note', async () => {
      const res = await request(app)
        .delete(`/notes/${noteId}`)
        .set('Cookie', authCookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify note is gone
      const getRes = await request(app)
        .get(`/notes/${noteId}`)
        .set('Cookie', authCookies);

      expect(getRes.statusCode).toBe(404);
    });
  });
});
