import request from 'supertest';
import app from '../test/testApp.js';

describe('Tasks Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'tasks@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'tasks@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          body: 'This is a test task description.',
          priority: 'high',
          tags: ['test', 'example'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.task).toBeDefined();
      expect(res.body.task.title).toBe('Test Task');
      expect(res.body.task.body).toBe('This is a test task description.');
      expect(res.body.task.priority).toBe('high');
    });

    it('should create task with minimal data', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Minimal Task',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.task.title).toBe('Minimal Task');
    });

    it('should reject task without title', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          body: 'No title provided',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /tasks', () => {
    beforeEach(async () => {
      // Create some test tasks
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 1', body: 'Body 1' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 2', body: 'Body 2', priority: 'high' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 3', body: 'Body 3' });
    });

    it('should return list of tasks', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks).toBeDefined();
      expect(res.body.tasks.length).toBe(3);
    });

    it('should filter by status', async () => {
      // First mark one task as done
      const createRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Done Task', status: 'done' });

      const res = await request(app)
        .get('/tasks')
        .query({ status: 'done' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBeGreaterThan(0);
      expect(res.body.tasks.every(t => t.status === 'done')).toBe(true);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(2);
    });
  });

  describe('GET /tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Single Task', body: 'Task body' });

      taskId = res.body.task._id;
    });

    it('should return single task', async () => {
      const res = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task._id).toBe(taskId);
      expect(res.body.task.title).toBe('Single Task');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/tasks/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app)
        .get('/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  describe('PATCH /tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Original Title', body: 'Original body' });

      taskId = res.body.task._id;
    });

    it('should update task', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title', body: 'Updated body' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.title).toBe('Updated Title');
      expect(res.body.task.body).toBe('Updated body');
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title Only' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.title).toBe('New Title Only');
      expect(res.body.task.body).toBe('Original body');
    });
  });

  describe('POST /tasks/:id/status', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Status Test Task' });

      taskId = res.body.task._id;
    });

    it('should update task status to done', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('done');
    });

    it('should update task status to in_progress', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('in_progress');
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS');
    });
  });

  describe('Task actions', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Action Test Task' });

      taskId = res.body.task._id;
    });

    it('should archive task', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('archived');
    });

    it('should unarchive task', async () => {
      // Archive first
      await request(app)
        .post(`/tasks/${taskId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then unarchive
      const res = await request(app)
        .post(`/tasks/${taskId}/unarchive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('todo');
    });

    it('should trash task', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('trashed');
    });

    it('should restore trashed task', async () => {
      // Trash first
      await request(app)
        .post(`/tasks/${taskId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then restore
      const res = await request(app)
        .post(`/tasks/${taskId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('todo');
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Delete Me' });

      taskId = res.body.task._id;
    });

    it('should permanently delete task', async () => {
      const res = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify task is gone
      const getRes = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('Task comments', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task with Comments' });

      taskId = res.body.task._id;
    });

    it('should add comment to task', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'This is a comment' });

      expect(res.statusCode).toBe(201);
      expect(res.body.task.comments).toBeDefined();
      expect(res.body.task.comments.length).toBe(1);
      expect(res.body.task.comments[0].text).toBe('This is a comment');
    });

    it('should update comment', async () => {
      // Add comment first
      const addRes = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Original comment' });

      const commentId = addRes.body.task.comments[0]._id;

      // Update the comment
      const res = await request(app)
        .patch(`/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Updated comment' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.comments[0].text).toBe('Updated comment');
    });

    it('should delete comment', async () => {
      // Add comment first
      const addRes = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Comment to delete' });

      const commentId = addRes.body.task.comments[0]._id;

      // Delete the comment
      const res = await request(app)
        .delete(`/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.comments.length).toBe(0);
    });
  });
});
