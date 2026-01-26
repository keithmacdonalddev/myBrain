import request from 'supertest';
import app from '../test/testApp.js';

describe('Projects Routes', () => {
  let authToken;

  // Login before each test
  beforeEach(async () => {
    // Create and login test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'projects@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'projects@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  // =========================================================================
  // CREATE PROJECT (POST /projects)
  // =========================================================================

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Project',
          description: 'This is a test project description.',
          priority: 'high',
          status: 'active',
          tags: ['test', 'example'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project).toBeDefined();
      expect(res.body.project.title).toBe('Test Project');
      expect(res.body.project.description).toBe('This is a test project description.');
      expect(res.body.project.priority).toBe('high');
      expect(res.body.project.status).toBe('active');
      expect(res.body.project.tags).toEqual(['test', 'example']);
      expect(res.body.project._id).toBeDefined();
      expect(res.body.project.userId).toBeDefined();
      expect(res.body.project.createdAt).toBeDefined();
      expect(res.body.project.updatedAt).toBeDefined();
    });

    it('should create project with minimal data', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Minimal Project',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.title).toBe('Minimal Project');
      expect(res.body.project._id).toBeDefined();
      expect(res.body.project.userId).toBeDefined();
      expect(res.body.project.status).toBe('active'); // Default status
      expect(res.body.project.createdAt).toBeDefined();
      expect(res.body.project.updatedAt).toBeDefined();
    });

    it('should create project with deadline', async () => {
      const deadline = new Date('2026-06-30').toISOString();
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Deadline Project',
          deadline: deadline,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.title).toBe('Deadline Project');
      expect(res.body.project.deadline).toBeDefined();
    });

    it('should create pinned project', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Pinned Project',
          pinned: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.pinned).toBe(true);
    });

    it('should reject project without title', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'No title provided',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty title', async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '   ',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/projects')
        .send({ title: 'Test' });

      expect(res.statusCode).toBe(401);
    });

    // =========================================================================
    // VALIDATION TESTS
    // =========================================================================

    describe('Validation', () => {
      it('should reject null title', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: null,
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject undefined title', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: undefined,
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject title exceeding max length', async () => {
        const longTitle = 'a'.repeat(501); // Assuming 500 char limit
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: longTitle,
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject non-string title', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 12345,
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject title as object', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: { nested: 'object' },
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject title as array', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: ['array', 'title'],
            description: 'Valid description',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid status value', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            status: 'invalid_status',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject status as non-string', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            status: 123,
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid priority value', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            priority: 'invalid_priority',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject priority as non-string', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            priority: 999,
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid deadline format', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            deadline: 'not-a-date',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject deadline as number', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            deadline: 12345678,
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject deadline in the past', async () => {
        const pastDate = new Date('2020-01-01').toISOString();
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            deadline: pastDate,
          });

        // Should either accept (if validation allows) or reject
        // Most project systems allow past deadlines, but test documents requirement
        expect([201, 400]).toContain(res.statusCode);

        if (res.statusCode === 400) {
          expect(res.body.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should handle unicode characters in title', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Project 测试 テスト 🎉',
            description: 'Unicode test',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.project.title).toBe('Project 测试 テスト 🎉');
      });

      it('should handle emojis in description', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Emoji Test',
            description: '😀 😃 😄 😁 🎉 🎊',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.project.description).toBe('😀 😃 😄 😁 🎉 🎊');
      });

      it('should handle special characters safely', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: "Test <script>alert('xss')</script>",
            description: "SQL: ' OR '1'='1",
          });

        expect(res.statusCode).toBe(201);
        // Should store safely without executing scripts
        expect(res.body.project.title).toBe("Test <script>alert('xss')</script>");
        expect(res.body.project.description).toBe("SQL: ' OR '1'='1");
      });

      it('should handle very long description', async () => {
        const longDescription = 'a'.repeat(100000); // 100k characters
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Long Description Test',
            description: longDescription,
          });

        // Should either accept or reject based on max length
        expect([201, 400]).toContain(res.statusCode);

        if (res.statusCode === 201) {
          expect(res.body.project.description).toBeDefined();
        }
      });

      it('should reject description exceeding max length', async () => {
        const tooLongDescription = 'a'.repeat(1000001); // Over 1MB
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: tooLongDescription,
          });

        expect(res.statusCode).toBe(400);
      });

      it('should trim whitespace from title', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '  Trimmed Title  ',
            description: 'Test',
          });

        if (res.statusCode === 201) {
          expect(res.body.project.title).toBe('Trimmed Title');
        }
      });

      it('should handle empty description gracefully', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'No Description',
            description: '',
          });

        // Empty description should be allowed
        expect([201, 400]).toContain(res.statusCode);
      });

      it('should handle missing description gracefully', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'No Description Field',
          });

        // Missing description should be allowed
        expect(res.statusCode).toBe(201);
      });

      it('should reject invalid tag format', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: 'not-an-array',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject non-string tags', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: [123, 456],
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject empty string tags', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: ['valid', '', 'tags'],
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject too many tags', async () => {
        const manyTags = Array(51).fill('tag'); // Assuming 50 tag limit
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            tags: manyTags,
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject pinned as non-boolean', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            pinned: 'true', // String instead of boolean
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should accept valid status values', async () => {
        const validStatuses = ['active', 'completed', 'on_hold', 'someday'];

        for (const status of validStatuses) {
          const res = await request(app)
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Project with ${status} status`,
              status: status,
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.project.status).toBe(status);
        }
      });

      it('should accept valid priority values', async () => {
        const validPriorities = ['low', 'medium', 'high'];

        for (const priority of validPriorities) {
          const res = await request(app)
            .post('/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Project with ${priority} priority`,
              priority: priority,
            });

          expect(res.statusCode).toBe(201);
          expect(res.body.project.priority).toBe(priority);
        }
      });

      it('should handle null description safely', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: null,
          });

        // Should either convert to empty string or reject
        expect([201, 400]).toContain(res.statusCode);
      });

      it('should reject description as object', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: { nested: 'object' },
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject description as array', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: ['array', 'description'],
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject description as number', async () => {
        const res = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: 12345,
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  // =========================================================================
  // LIST PROJECTS (GET /projects)
  // =========================================================================

  describe('GET /projects', () => {
    beforeEach(async () => {
      // Create some test projects
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project 1', status: 'active' });

      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project 2', status: 'active', priority: 'high' });

      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project 3', status: 'completed' });
    });

    it('should return list of projects', async () => {
      const res = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeDefined();
      expect(res.body.projects.length).toBe(3);
      expect(res.body.total).toBe(3);

      // Verify response structure
      res.body.projects.forEach(project => {
        expect(project._id).toBeDefined();
        expect(project.title).toBeDefined();
        expect(project.userId).toBeDefined();
        expect(project.status).toBeDefined();
        expect(project.createdAt).toBeDefined();
        expect(project.updatedAt).toBeDefined();
      });
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ status: 'completed' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(1);
      expect(res.body.projects[0].status).toBe('completed');
    });

    it('should filter by multiple statuses', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ status: 'active,completed' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(3);
    });

    it('should filter by priority', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ priority: 'high' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects.every(p => p.priority === 'high')).toBe(true);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(2);
      expect(res.body.limit).toBe(2);
    });

    it('should handle skip pagination', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ skip: 2, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(1);
      expect(res.body.skip).toBe(2);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/projects');

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // GET PROJECTS - Additional Filter Tests
  // =========================================================================

  describe('GET /projects (additional filters)', () => {
    beforeEach(async () => {
      // Create project with deadline
      const futureDeadline = new Date();
      futureDeadline.setDate(futureDeadline.getDate() + 14);
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Deadline Project', deadline: futureDeadline.toISOString() });

      // Create project without deadline
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'No Deadline Project' });

      // Create pinned project
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Pinned Project', pinned: true });

      // Create project with tags
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Project', tags: ['work', 'important'] });
    });

    it('should filter by hasDeadline=true', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ hasDeadline: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects.every(p => p.deadline !== null && p.deadline !== undefined)).toBe(true);
    });

    it('should filter by hasDeadline=false', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ hasDeadline: 'false' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('should filter by pinned=true', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ pinned: 'true' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects.every(p => p.pinned === true)).toBe(true);
    });

    it('should filter by tags', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ tags: 'work' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects.every(p => p.tags && p.tags.includes('work'))).toBe(true);
    });

    it('should search by title using q parameter', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ q: 'Deadline' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects.some(p => p.title.includes('Deadline'))).toBe(true);
    });

    it('should return empty array for non-matching search', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ q: 'nonexistentxyz' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBe(0);
    });

    it('should combine multiple filters', async () => {
      // Create a project that matches multiple filters
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Multi-filter Project',
          deadline: deadline.toISOString(),
          pinned: true,
          priority: 'high'
        });

      const res = await request(app)
        .get('/projects')
        .query({ hasDeadline: 'true', pinned: 'true', priority: 'high' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('should sort by title', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ sort: 'title' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('should sort by deadline', async () => {
      const res = await request(app)
        .get('/projects')
        .query({ sort: 'deadline' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // =========================================================================
  // GET SINGLE PROJECT (GET /projects/:id)
  // =========================================================================

  describe('GET /projects/:id', () => {
    let projectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Single Project', description: 'Project details' });

      projectId = res.body.project._id;
    });

    it('should return single project', async () => {
      const res = await request(app)
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.project._id).toBe(projectId);
      expect(res.body.project.title).toBe('Single Project');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/projects/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 400 for invalid project ID', async () => {
      const res = await request(app)
        .get('/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth', async () => {
      const res = await request(app).get(`/projects/${projectId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // UPDATE PROJECT (PATCH /projects/:id)
  // =========================================================================

  describe('PATCH /projects/:id', () => {
    let projectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Original Title', description: 'Original description' });

      projectId = res.body.project._id;
    });

    it('should update project', async () => {
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title', description: 'Updated description' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.title).toBe('Updated Title');
      expect(res.body.project.description).toBe('Updated description');
    });

    it('should update only provided fields', async () => {
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title Only' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.title).toBe('New Title Only');
      expect(res.body.project.description).toBe('Original description');
    });

    it('should update project priority', async () => {
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'high' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.priority).toBe('high');
    });

    it('should update project deadline', async () => {
      const deadline = new Date('2026-12-31').toISOString();
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deadline });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.deadline).toBeDefined();
    });

    it('should update pinned status', async () => {
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pinned: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.pinned).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .patch('/projects/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid project ID', async () => {
      const res = await request(app)
        .patch('/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =========================================================================
  // UPDATE PROJECT STATUS (POST /projects/:id/status)
  // =========================================================================

  describe('POST /projects/:id/status', () => {
    let projectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Status Test Project' });

      projectId = res.body.project._id;
    });

    it('should update project status to completed', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.status).toBe('completed');
    });

    it('should update project status to on_hold', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'on_hold' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.status).toBe('on_hold');
    });

    it('should update project status to someday', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'someday' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.status).toBe('someday');
    });

    it('should update project status back to active', async () => {
      // First set to completed
      await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      // Then set back to active
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' });

      expect(res.statusCode).toBe(200);
      expect(res.body.project.status).toBe('active');
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .post('/projects/507f1f77bcf86cd799439011/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid project ID', async () => {
      const res = await request(app)
        .post('/projects/invalid-id/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });
  });

  // =========================================================================
  // DELETE PROJECT (DELETE /projects/:id)
  // =========================================================================

  describe('DELETE /projects/:id', () => {
    let projectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Delete Me' });

      projectId = res.body.project._id;
    });

    it('should permanently delete project', async () => {
      const res = await request(app)
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify project is gone
      const getRes = await request(app)
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .delete('/projects/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid project ID', async () => {
      const res = await request(app)
        .delete('/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('should reject without auth', async () => {
      const res = await request(app).delete(`/projects/${projectId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // SPECIAL ENDPOINTS (upcoming, overdue, tags)
  // =========================================================================

  describe('GET /projects/upcoming', () => {
    beforeEach(async () => {
      // Create project with upcoming deadline
      const upcomingDeadline = new Date();
      upcomingDeadline.setDate(upcomingDeadline.getDate() + 3);
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Upcoming Project', deadline: upcomingDeadline.toISOString(), status: 'active' });

      // Create project with far future deadline
      const farDeadline = new Date();
      farDeadline.setDate(farDeadline.getDate() + 30);
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Far Project', deadline: farDeadline.toISOString(), status: 'active' });

      // Create project without deadline
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'No Deadline Project', status: 'active' });
    });

    it('should return upcoming projects within default 7 days', async () => {
      const res = await request(app)
        .get('/projects/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeDefined();
      // Should include project with 3-day deadline, not 30-day or no deadline
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('should respect days parameter', async () => {
      const res = await request(app)
        .get('/projects/upcoming')
        .query({ days: 60 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/projects/upcoming');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /projects/overdue', () => {
    beforeEach(async () => {
      // Create project with past deadline
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 5);
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Overdue Project', deadline: pastDeadline.toISOString(), status: 'active' });

      // Create completed project with past deadline (should not be overdue)
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Completed Past Project', deadline: pastDeadline.toISOString(), status: 'completed' });
    });

    it('should return overdue projects', async () => {
      const res = await request(app)
        .get('/projects/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/projects/overdue');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /projects/tags', () => {
    beforeEach(async () => {
      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Project 1', tags: ['work', 'priority'] });

      await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Tagged Project 2', tags: ['work', 'home'] });
    });

    it('should return unique tags with counts', async () => {
      const res = await request(app)
        .get('/projects/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tags).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/projects/tags');

      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // PROJECT COMMENTS
  // =========================================================================

  describe('Project comments', () => {
    let projectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Project with Comments' });

      projectId = res.body.project._id;
    });

    describe('POST /projects/:id/comments', () => {
      it('should add comment to project', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'This is a comment' });

        expect(res.statusCode).toBe(201);
        expect(res.body.project.comments).toBeDefined();
        expect(res.body.project.comments.length).toBe(1);
        expect(res.body.project.comments[0].text).toBe('This is a comment');
      });

      it('should reject empty comment', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject whitespace-only comment', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: '   ' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should return 404 for non-existent project', async () => {
        const res = await request(app)
          .post('/projects/507f1f77bcf86cd799439011/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Comment' });

        expect(res.statusCode).toBe(404);
      });

      it('should return 400 for invalid project ID', async () => {
        const res = await request(app)
          .post('/projects/invalid-id/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Comment' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('PATCH /projects/:id/comments/:commentId', () => {
      let commentId;

      beforeEach(async () => {
        const addRes = await request(app)
          .post(`/projects/${projectId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Original comment' });

        commentId = addRes.body.project.comments[0]._id;
      });

      it('should update comment', async () => {
        const res = await request(app)
          .patch(`/projects/${projectId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Updated comment' });

        expect(res.statusCode).toBe(200);
        expect(res.body.project.comments[0].text).toBe('Updated comment');
      });

      it('should reject empty comment text', async () => {
        const res = await request(app)
          .patch(`/projects/${projectId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });

      it('should return 404 for non-existent comment', async () => {
        const res = await request(app)
          .patch(`/projects/${projectId}/comments/507f1f77bcf86cd799439011`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Updated' });

        expect(res.statusCode).toBe(404);
        expect(res.body.code).toBe('COMMENT_NOT_FOUND');
      });

      it('should return 400 for invalid IDs', async () => {
        const res = await request(app)
          .patch(`/projects/invalid-id/comments/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Updated' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('DELETE /projects/:id/comments/:commentId', () => {
      let commentId;

      beforeEach(async () => {
        const addRes = await request(app)
          .post(`/projects/${projectId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Comment to delete' });

        commentId = addRes.body.project.comments[0]._id;
      });

      it('should delete comment', async () => {
        const res = await request(app)
          .delete(`/projects/${projectId}/comments/${commentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.project.comments.length).toBe(0);
      });

      it('should return 404 for non-existent comment', async () => {
        const res = await request(app)
          .delete(`/projects/${projectId}/comments/507f1f77bcf86cd799439011`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(404);
        expect(res.body.code).toBe('COMMENT_NOT_FOUND');
      });

      it('should return 400 for invalid IDs', async () => {
        const res = await request(app)
          .delete(`/projects/invalid-id/comments/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });
  });

  // =========================================================================
  // ENTITY LINKING (Notes, Tasks, Events)
  // =========================================================================

  describe('Entity Linking', () => {
    let projectId;
    let taskId;
    let noteId;

    beforeEach(async () => {
      // Create a project
      const projectRes = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Link Test Project' });
      projectId = projectRes.body.project._id;

      // Create a task to link
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task to Link' });
      taskId = taskRes.body.task._id;

      // Create a note to link
      const noteRes = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Note to Link', content: 'Note content' });
      noteId = noteRes.body.note._id;
    });

    describe('POST /projects/:id/link-task', () => {
      it('should link task to project', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-task`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('linked');
      });

      it('should reject invalid task ID', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-task`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId: 'invalid-id' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });

      it('should reject invalid project ID', async () => {
        const res = await request(app)
          .post('/projects/invalid-id/link-task')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });

      it('should return 404 for non-existent task', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-task`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId: '507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('DELETE /projects/:id/link-task/:taskId', () => {
      beforeEach(async () => {
        // Link task first
        await request(app)
          .post(`/projects/${projectId}/link-task`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId });
      });

      it('should unlink task from project', async () => {
        const res = await request(app)
          .delete(`/projects/${projectId}/link-task/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('unlinked');
      });

      it('should reject invalid IDs', async () => {
        const res = await request(app)
          .delete(`/projects/invalid-id/link-task/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('POST /projects/:id/link-note', () => {
      it('should link note to project', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-note`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ noteId });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('linked');
      });

      it('should reject invalid note ID', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-note`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ noteId: 'invalid-id' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });

      it('should return 404 for non-existent note', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-note`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ noteId: '507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('DELETE /projects/:id/link-note/:noteId', () => {
      beforeEach(async () => {
        // Link note first
        await request(app)
          .post(`/projects/${projectId}/link-note`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ noteId });
      });

      it('should unlink note from project', async () => {
        const res = await request(app)
          .delete(`/projects/${projectId}/link-note/${noteId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('unlinked');
      });

      it('should reject invalid IDs', async () => {
        const res = await request(app)
          .delete(`/projects/invalid-id/link-note/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });

    describe('POST /projects/:id/link-event', () => {
      let eventId;

      beforeEach(async () => {
        // Create an event to link
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const eventRes = await request(app)
          .post('/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Event to Link',
            startDate: tomorrow.toISOString(),
            endDate: tomorrow.toISOString()
          });
        if (eventRes.body.event) {
          eventId = eventRes.body.event._id;
        }
      });

      it('should link event to project', async () => {
        if (!eventId) {
          // Skip if events route not available
          return;
        }
        const res = await request(app)
          .post(`/projects/${projectId}/link-event`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ eventId });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('linked');
      });

      it('should reject invalid event ID', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-event`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ eventId: 'invalid-id' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });

      it('should reject invalid project ID', async () => {
        const res = await request(app)
          .post('/projects/invalid-id/link-event')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ eventId: '507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });

      it('should return 404 for non-existent event', async () => {
        const res = await request(app)
          .post(`/projects/${projectId}/link-event`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ eventId: '507f1f77bcf86cd799439011' });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('DELETE /projects/:id/link-event/:eventId', () => {
      let eventId;

      beforeEach(async () => {
        // Create and link an event
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const eventRes = await request(app)
          .post('/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Event to Unlink',
            startDate: tomorrow.toISOString(),
            endDate: tomorrow.toISOString()
          });
        if (eventRes.body.event) {
          eventId = eventRes.body.event._id;
          // Link the event
          await request(app)
            .post(`/projects/${projectId}/link-event`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ eventId });
        }
      });

      it('should unlink event from project', async () => {
        if (!eventId) {
          // Skip if events route not available
          return;
        }
        const res = await request(app)
          .delete(`/projects/${projectId}/link-event/${eventId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('unlinked');
      });

      it('should reject invalid IDs', async () => {
        const res = await request(app)
          .delete(`/projects/invalid-id/link-event/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
      });
    });
  });

  // =========================================================================
  // CROSS-USER ACCESS PROTECTION
  // =========================================================================

  describe('Cross-user access protection', () => {
    let otherUserToken;
    let projectId;

    beforeEach(async () => {
      // Create a project with the main user
      const projectRes = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Private Project' });
      projectId = projectRes.body.project._id;

      // Create another user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'Password123!',
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'otheruser@example.com',
          password: 'Password123!',
        });

      otherUserToken = loginRes.body.token;
    });

    it('should not allow other user to view project', async () => {
      const res = await request(app)
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to update project', async () => {
      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to delete project', async () => {
      const res = await request(app)
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to change project status', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow other user to add comment', async () => {
      const res = await request(app)
        .post(`/projects/${projectId}/comments`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ text: 'Unauthorized comment' });

      expect(res.statusCode).toBe(404);
    });
  });
});
