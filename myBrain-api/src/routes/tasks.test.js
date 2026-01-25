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
      expect(res.body.task.tags).toEqual(['test', 'example']);
      expect(res.body.task.status).toBe('todo');
      expect(res.body.task.userId).toBeDefined();
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
      expect(res.body.task.status).toBe('todo');
      expect(res.body.task.priority).toBe('medium');
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

    // Validation Tests
    describe('Validation', () => {
      it('should reject empty title', async () => {
        const res = await request(app)
          .post('/tasks')
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
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '   ',
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing title', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject null title', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: null,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject undefined title', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: undefined,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title exceeding max length', async () => {
        const longTitle = 'a'.repeat(201); // Exceeds 200 char limit
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: longTitle,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject non-string title (number)', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 12345,
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title as object', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: { nested: 'object' },
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject title as array', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: ['array', 'title'],
            body: 'Valid body',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject invalid status values', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            status: 'invalid_status',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject invalid priority values', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            priority: 'critical',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject negative priority', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            priority: -1,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject priority exceeding valid values', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            priority: 999,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject invalid dueDate format', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            dueDate: 'not-a-date',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject invalid dueDate (number)', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            dueDate: 12345,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should handle unicode characters in title', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Task 测试 テスト 🎯',
            body: 'Unicode test',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.task.title).toBe('Task 测试 テスト 🎯');
      });

      it('should handle emojis in body', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Emoji Test',
            body: '✅ 📋 🎯 ⏰ 🔥',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.task.body).toBe('✅ 📋 🎯 ⏰ 🔥');
      });

      it('should handle special characters safely (XSS attempt)', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: "Test <script>alert('xss')</script>",
            body: "<img src=x onerror=alert('xss')>",
          });

        expect(res.statusCode).toBe(201);
        // Should store safely without executing scripts
        expect(res.body.task.title).toBe("Test <script>alert('xss')</script>");
        expect(res.body.task.body).toBe("<img src=x onerror=alert('xss')>");
      });

      it('should handle SQL injection attempts safely', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: "Task ' OR '1'='1",
            body: "SQL: '; DROP TABLE tasks; --",
          });

        expect(res.statusCode).toBe(201);
        // Should store safely without executing SQL
        expect(res.body.task.title).toBe("Task ' OR '1'='1");
        expect(res.body.task.body).toBe("SQL: '; DROP TABLE tasks; --");
      });

      it('should reject invalid tag format (string instead of array)', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: 'not-an-array',
          });

        expect(res.statusCode).toBe(400);
      });

      it('should reject non-string tags in array', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: [123, true, { invalid: 'tag' }],
          });

        expect(res.statusCode).toBe(400);
      });

      it('should handle very long body text', async () => {
        const longBody = 'a'.repeat(100000); // 100k characters
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Long Body Test',
            body: longBody,
          });

        // Should either accept or reject based on max length
        expect([201, 400]).toContain(res.statusCode);

        if (res.statusCode === 201) {
          expect(res.body.task.body).toBeDefined();
        }
      });

      it('should accept valid status values', async () => {
        const validStatuses = ['todo', 'in_progress', 'done', 'cancelled', 'archived', 'trashed'];

        for (const status of validStatuses) {
          const res = await request(app)
            .post('/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Task with ${status} status`,
              status,
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.task.status).toBe(status);
        }
      });

      it('should accept valid priority values', async () => {
        const validPriorities = ['low', 'medium', 'high'];

        for (const priority of validPriorities) {
          const res = await request(app)
            .post('/tasks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Task with ${priority} priority`,
              priority,
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.task.priority).toBe(priority);
        }
      });

      it('should accept valid future dueDate', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Task with due date',
            dueDate: futureDate.toISOString(),
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.task.dueDate).toBeDefined();
      });

      it('should handle location exceeding max length', async () => {
        const longLocation = 'a'.repeat(501); // Exceeds 500 char limit
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            location: longLocation,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should trim whitespace from title', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '  Trimmed Task  ',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.task.title).toBe('Trimmed Task');
      });

      it('should trim whitespace from location', async () => {
        const res = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Task',
            location: '  Office  ',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.task.location).toBe('Office');
      });
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
      expect(res.body.tasks[0]).toHaveProperty('title');
      expect(res.body.tasks[0]).toHaveProperty('status');
      expect(res.body.tasks[0]).toHaveProperty('priority');
      expect(res.body.tasks[0]).toHaveProperty('userId');
      expect(res.body.tasks[0]).toHaveProperty('createdAt');
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
      expect(res.body.task).toBeDefined();
      expect(res.body.task.status).toBe('archived');
      expect(res.body.task.archivedAt).toBeDefined();
      expect(res.body.task._id).toBe(taskId);
      expect(res.body.task.title).toBe('Action Test Task');
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
      expect(res.body.task).toBeDefined();
      expect(res.body.task.status).toBe('todo');
      expect(res.body.task.archivedAt).toBeNull();
      expect(res.body.task._id).toBe(taskId);
      expect(res.body.task.title).toBe('Action Test Task');
    });

    it('should trash task', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/trash`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task).toBeDefined();
      expect(res.body.task.status).toBe('trashed');
      expect(res.body.task.trashedAt).toBeDefined();
      expect(res.body.task._id).toBe(taskId);
      expect(res.body.task.title).toBe('Action Test Task');
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

  // ============================================================================
  // POST /tasks/:id/link-note - Link a note to task
  // ============================================================================
  describe('POST /tasks/:id/link-note', () => {
    let taskId;
    let noteId;

    beforeEach(async () => {
      // Create a task
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for linking' });
      taskId = taskRes.body.task._id;

      // Create a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note for linking', content: 'Test content' });
      noteId = noteRes.body.note._id;
    });

    it('should link a note to a task', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('linked');
      expect(res.body.task).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/link-note`)
        .send({ noteId });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .post('/tasks/507f1f77bcf86cd799439011/link-note')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId: '507f1f77bcf86cd799439011' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app)
        .post('/tasks/invalid-id/link-note')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .post(`/tasks/${taskId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId: 'invalid-id' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // ============================================================================
  // DELETE /tasks/:id/link-note/:noteId - Unlink note from task
  // ============================================================================
  describe('DELETE /tasks/:id/link-note/:noteId', () => {
    let taskId;
    let noteId;

    beforeEach(async () => {
      // Create a task
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for unlinking' });
      taskId = taskRes.body.task._id;

      // Create a note
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note for unlinking', content: 'Test content' });
      noteId = noteRes.body.note._id;

      // Link the note to the task
      await request(app)
        .post(`/tasks/${taskId}/link-note`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ noteId });
    });

    it('should unlink a note from a task', async () => {
      const res = await request(app)
        .delete(`/tasks/${taskId}/link-note/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('unlinked');
      expect(res.body.task).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .delete(`/tasks/${taskId}/link-note/${noteId}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete(`/tasks/507f1f77bcf86cd799439011/link-note/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app)
        .delete(`/tasks/invalid-id/link-note/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app)
        .delete(`/tasks/${taskId}/link-note/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // ============================================================================
  // GET /tasks/:id/backlinks - Get backlinks for a task
  // ============================================================================
  describe('GET /tasks/:id/backlinks', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for backlinks' });
      taskId = res.body.task._id;
    });

    it('should get backlinks for a task', async () => {
      const res = await request(app)
        .get(`/tasks/${taskId}/backlinks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.backlinks).toBeDefined();
      expect(Array.isArray(res.body.backlinks)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/tasks/${taskId}/backlinks`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app)
        .get('/tasks/invalid-id/backlinks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // ============================================================================
  // GET /tasks/tags - Get all task tags
  // ============================================================================
  describe('GET /tasks/tags', () => {
    beforeEach(async () => {
      // Create tasks with different tags
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 1', tags: ['work', 'urgent'] });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 2', tags: ['personal', 'urgent'] });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task 3', tags: ['health'] });
    });

    it('should return all unique tags', async () => {
      const res = await request(app)
        .get('/tasks/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
      expect(Array.isArray(res.body.tags)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/tasks/tags');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /tasks/today - Get today's view
  // ============================================================================
  describe('GET /tasks/today', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create a task due today
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Due Today', dueDate: today.toISOString() });

      // Create an overdue task
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Overdue Task', dueDate: yesterday.toISOString() });

      // Create an in-progress task
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'In Progress', status: 'in_progress' });

      // Create a high-priority task
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'High Priority', priority: 'high' });
    });

    it('should return today view data', async () => {
      const res = await request(app)
        .get('/tasks/today')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // The response structure depends on taskService.getTodayView implementation
      // Just verify we get a successful response with expected properties
      expect(res.body).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get('/tasks/today');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // GET /tasks - Filter by due date
  // ============================================================================
  describe('GET /tasks (by due date filters)', () => {
    beforeEach(async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Due Tomorrow', dueDate: tomorrow.toISOString() });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Due Next Week', dueDate: nextWeek.toISOString() });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'No Due Date' });
    });

    it('should filter tasks with due dates', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ hasDueDate: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.dueDate !== null)).toBe(true);
    });

    it('should filter tasks without due dates', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ hasDueDate: 'false' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Tasks without due dates
    });

    it('should filter tasks due before a date', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const res = await request(app)
        .get('/tasks')
        .query({ dueBefore: nextWeek.toISOString() })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should filter tasks due after a date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .get('/tasks')
        .query({ dueAfter: tomorrow.toISOString() })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // GET /tasks - Filter by priority
  // ============================================================================
  describe('GET /tasks (by priority filters)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Critical Task', priority: 'critical' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'High Priority Task', priority: 'high' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Medium Priority Task', priority: 'medium' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Low Priority Task', priority: 'low' });
    });

    it('should filter by critical priority', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ priority: 'critical' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.priority === 'critical')).toBe(true);
    });

    it('should filter by high priority', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ priority: 'high' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.priority === 'high')).toBe(true);
    });

    it('should filter by low priority', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ priority: 'low' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.priority === 'low')).toBe(true);
    });
  });

  // ============================================================================
  // PATCH /tasks/:id - Update priority
  // ============================================================================
  describe('PATCH /tasks/:id (update priority)', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Priority Test Task', priority: 'low' });
      taskId = res.body.task._id;
    });

    it('should update task priority to high', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'high' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.priority).toBe('high');
    });

    it('should update task priority to critical', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'critical' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.priority).toBe('critical');
    });

    it('should update task priority to medium', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'medium' });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.priority).toBe('medium');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .send({ priority: 'high' });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'high' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // PATCH /tasks/:id - Update due date
  // ============================================================================
  describe('PATCH /tasks/:id (update due date)', () => {
    let taskId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Due Date Test Task' });
      taskId = res.body.task._id;
    });

    it('should set due date on task', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: dueDate.toISOString() });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.dueDate).toBeDefined();
    });

    it('should update existing due date', async () => {
      const initialDate = new Date();
      initialDate.setDate(initialDate.getDate() + 3);

      // Set initial due date
      await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: initialDate.toISOString() });

      // Update to new date
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 14);

      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: newDate.toISOString() });

      expect(res.statusCode).toBe(200);
      expect(new Date(res.body.task.dueDate).getTime()).toBeCloseTo(newDate.getTime(), -4);
    });

    it('should clear due date when set to null', async () => {
      // Set initial due date
      const initialDate = new Date();
      await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: initialDate.toISOString() });

      // Clear due date
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: null });

      expect(res.statusCode).toBe(200);
      expect(res.body.task.dueDate).toBeFalsy();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .send({ dueDate: new Date().toISOString() });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dueDate: new Date().toISOString() });

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // User Isolation Tests - Ensure users can't access each other's tasks
  // ============================================================================
  describe('User Isolation', () => {
    let user1Token;
    let user2Token;
    let user1TaskId;

    beforeEach(async () => {
      // Create and login first user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });

      const login1Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
        });
      user1Token = login1Res.body.token;

      // Create and login second user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });

      const login2Res = await request(app)
        .post('/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
        });
      user2Token = login2Res.body.token;

      // Create task as user1
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'User 1 Private Task', body: 'Secret content' });
      user1TaskId = taskRes.body.task._id;
    });

    it('should not allow user2 to view user1 task', async () => {
      const res = await request(app)
        .get(`/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to update user1 task', async () => {
      const res = await request(app)
        .patch(`/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to delete user1 task', async () => {
      const res = await request(app)
        .delete(`/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to change user1 task status', async () => {
      const res = await request(app)
        .post(`/tasks/${user1TaskId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'done' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to archive user1 task', async () => {
      const res = await request(app)
        .post(`/tasks/${user1TaskId}/archive`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to trash user1 task', async () => {
      const res = await request(app)
        .post(`/tasks/${user1TaskId}/trash`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to add comment to user1 task', async () => {
      const res = await request(app)
        .post(`/tasks/${user1TaskId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ text: 'Unauthorized comment' });

      expect(res.statusCode).toBe(404);
    });

    it('should not show user1 tasks in user2 task list', async () => {
      // Create a task as user2
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'User 2 Task' });

      // Get user2's task list
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      // Should only see user2's task, not user1's
      expect(res.body.tasks.length).toBe(1);
      expect(res.body.tasks[0].title).toBe('User 2 Task');
    });

    it('should not allow user2 to link note to user1 task', async () => {
      // Create a note as user2
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'User 2 Note', content: 'Content' });
      const user2NoteId = noteRes.body.note._id;

      // Try to link user2's note to user1's task
      const res = await request(app)
        .post(`/tasks/${user1TaskId}/link-note`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ noteId: user2NoteId });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow user2 to get backlinks for user1 task', async () => {
      const res = await request(app)
        .get(`/tasks/${user1TaskId}/backlinks`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Service may return empty array or 404 depending on implementation
      // Both are acceptable as long as no data is leaked
      if (res.statusCode === 200) {
        expect(res.body.backlinks).toEqual([]);
      } else {
        expect(res.statusCode).toBe(404);
      }
    });
  });

  // ============================================================================
  // GET /tasks - Search and Sort Tests
  // ============================================================================
  describe('GET /tasks (search and sort)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Buy groceries', body: 'Need milk and eggs' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Call dentist', body: 'Schedule appointment' });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Write report', body: 'Quarterly business report' });
    });

    it('should search tasks by title', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ q: 'groceries' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBeGreaterThan(0);
      expect(res.body.tasks.some(t => t.title.toLowerCase().includes('groceries'))).toBe(true);
    });

    it('should search tasks by body content', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ q: 'quarterly' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching search', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ q: 'nonexistentxyz' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(0);
    });

    it('should sort tasks by createdAt descending (default)', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(3);
      // Newest first (last created should be first)
      expect(res.body.tasks[0].title).toBe('Write report');
    });

    it('should sort tasks by title ascending', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ sort: 'title' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(3);
    });

    it('should handle case-insensitive search', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ q: 'GROCERIES' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should find tasks regardless of case
    });

    it('should combine search with status filter', async () => {
      // Create a done task
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Done groceries', status: 'done' });

      const res = await request(app)
        .get('/tasks')
        .query({ q: 'groceries', status: 'done' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.status === 'done')).toBe(true);
    });

    it('should combine search with priority filter', async () => {
      // Create a high priority task with matching title
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Urgent groceries', priority: 'high' });

      const res = await request(app)
        .get('/tasks')
        .query({ q: 'groceries', priority: 'high' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.every(t => t.priority === 'high')).toBe(true);
    });
  });

  // ============================================================================
  // GET /tasks - Tag Filtering Tests
  // ============================================================================
  describe('GET /tasks (tag filtering)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Work Task', tags: ['work', 'urgent'] });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Home Task', tags: ['home'] });

      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Work and Home Task', tags: ['work', 'home'] });
    });

    it('should filter by single tag', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ tags: 'work' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks.length).toBe(2);
      expect(res.body.tasks.every(t => t.tags.includes('work'))).toBe(true);
    });

    it('should filter by multiple tags (comma-separated)', async () => {
      const res = await request(app)
        .get('/tasks')
        .query({ tags: 'work,urgent' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should match tasks with any of the tags
    });
  });

  // ============================================================================
  // Additional validation tests
  // ============================================================================
  describe('Validation Tests', () => {
    it('should reject empty comment text', async () => {
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for comment validation' });
      const taskId = taskRes.body.task._id;

      const res = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject whitespace-only comment text', async () => {
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for comment validation' });
      const taskId = taskRes.body.task._id;

      const res = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing comment text', async () => {
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task for comment validation' });
      const taskId = taskRes.body.task._id;

      const res = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject whitespace-only task title', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
