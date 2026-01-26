import request from 'supertest';
import app from '../test/testApp.js';
import mongoose from 'mongoose';

describe('Reports Routes', () => {
  let userToken;
  let userId;
  let otherUserToken;
  let otherUserId;

  // Create users before each test
  beforeEach(async () => {
    // Create and login first user (reporter)
    await request(app)
      .post('/auth/register')
      .send({
        email: 'reporter@example.com',
        password: 'Password123!',
      });

    const userRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'reporter@example.com',
        password: 'Password123!',
      });

    userToken = userRes.body.token;

    // Get the user ID
    const User = mongoose.model('User');
    const user = await User.findOne({ email: 'reporter@example.com' });
    userId = user._id.toString();

    // Create and login second user (to be reported)
    await request(app)
      .post('/auth/register')
      .send({
        email: 'reported@example.com',
        password: 'Password123!',
      });

    const otherUserRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'reported@example.com',
        password: 'Password123!',
      });

    otherUserToken = otherUserRes.body.token;

    const otherUser = await User.findOne({ email: 'reported@example.com' });
    otherUserId = otherUser._id.toString();
  });

  // =============================================================================
  // POST /reports - Submit a new report
  // =============================================================================
  describe('POST /reports', () => {
    describe('Successful report submissions', () => {
      it('should create a report for a user', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
            description: 'This user is sending spam messages',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Report submitted successfully');
        expect(res.body.reportId).toBeDefined();
      });

      it('should create a report for a message', async () => {
        // Create a message first
        const Message = mongoose.model('Message');
        const Conversation = mongoose.model('Conversation');

        // Create a conversation
        const conversation = await Conversation.create({
          participants: [userId, otherUserId],
          lastMessage: new Date(),
        });

        // Create a message from the other user
        const message = await Message.create({
          conversationId: conversation._id,
          senderId: otherUserId,
          content: 'Test message',
          contentType: 'text',
        });

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'message',
            targetId: message._id.toString(),
            reason: 'harassment',
            description: 'This message contains harassment',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Report submitted successfully');
        expect(res.body.reportId).toBeDefined();
      });

      it('should create a report for a note', async () => {
        // Create a note using the other user
        const noteRes = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ title: 'Test Note', body: 'Test content' });

        const noteId = noteRes.body.note._id;

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'note',
            targetId: noteId,
            reason: 'inappropriate_content',
            description: 'This note contains inappropriate content',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.reportId).toBeDefined();
      });

      it('should auto-assign high priority for harassment reports', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'harassment',
            description: 'User is bullying me',
          });

        expect(res.statusCode).toBe(201);

        // Check the report was created with high priority
        const Report = mongoose.model('Report');
        const report = await Report.findById(res.body.reportId);
        expect(report.priority).toBe('high');
      });

      it('should auto-assign low priority for spam reports', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
            description: 'User is sending spam',
          });

        expect(res.statusCode).toBe(201);

        const Report = mongoose.model('Report');
        const report = await Report.findById(res.body.reportId);
        expect(report.priority).toBe('low');
      });

      it('should create report without description (optional field)', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.reportId).toBeDefined();
      });
    });

    describe('Validation errors', () => {
      it('should reject invalid target type', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'invalid_type',
            targetId: otherUserId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid target type');
        expect(res.body.code).toBe('INVALID_TARGET_TYPE');
      });

      it('should reject invalid target ID format', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: 'not-a-valid-id',
            reason: 'spam',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid target ID');
        expect(res.body.code).toBe('INVALID_TARGET_ID');
      });

      it('should reject invalid reason', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'invalid_reason',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid reason');
        expect(res.body.code).toBe('INVALID_REASON');
      });

      it('should reject self-reporting', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: userId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Cannot report yourself');
        expect(res.body.code).toBe('SELF_REPORT');
      });

      it('should reject reporting non-existent user', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: fakeUserId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('User not found');
        expect(res.body.code).toBe('TARGET_NOT_FOUND');
      });

      it('should reject reporting non-existent message', async () => {
        const fakeMessageId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'message',
            targetId: fakeMessageId,
            reason: 'harassment',
          });

        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('Message not found');
        expect(res.body.code).toBe('TARGET_NOT_FOUND');
      });

      it('should reject reporting non-existent note', async () => {
        const fakeNoteId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'note',
            targetId: fakeNoteId,
            reason: 'inappropriate_content',
          });

        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe('note not found');
        expect(res.body.code).toBe('TARGET_NOT_FOUND');
      });

      it('should reject duplicate reports on same target', async () => {
        // Create first report
        await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
          });

        // Try to create duplicate report
        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'harassment', // Different reason doesn't matter
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('You have already reported this content');
        expect(res.body.code).toBe('DUPLICATE_REPORT');
      });
    });

    describe('Authentication', () => {
      it('should reject report submission without auth token', async () => {
        const res = await request(app)
          .post('/reports')
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(401);
      });

      it('should reject report submission with invalid token', async () => {
        const res = await request(app)
          .post('/reports')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            targetType: 'user',
            targetId: otherUserId,
            reason: 'spam',
          });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('All valid reasons', () => {
      const validReasons = [
        'spam',
        'harassment',
        'hate_speech',
        'inappropriate_content',
        'impersonation',
        'copyright',
        'privacy_violation',
        'scam',
        'other',
      ];

      validReasons.forEach((reason) => {
        it(`should accept reason: ${reason}`, async () => {
          // Create a new user for each test to avoid duplicate report issues
          const User = mongoose.model('User');
          const uniqueUser = await User.create({
            email: `target-${reason}@example.com`,
            passwordHash: 'hashedpassword123',
          });

          const res = await request(app)
            .post('/reports')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              targetType: 'user',
              targetId: uniqueUser._id.toString(),
              reason,
              description: `Testing reason: ${reason}`,
            });

          expect(res.statusCode).toBe(201);
        });
      });
    });

    describe('All valid target types', () => {
      it('should accept targetType: project', async () => {
        // Create a project using the other user
        const projectRes = await request(app)
          .post('/projects')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ title: 'Test Project' });

        const projectId = projectRes.body.project._id;

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'project',
            targetId: projectId,
            reason: 'inappropriate_content',
          });

        expect(res.statusCode).toBe(201);
      });

      it('should accept targetType: task', async () => {
        // Create a task using the other user
        const taskRes = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ title: 'Test Task' });

        const taskId = taskRes.body.task._id;

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'task',
            targetId: taskId,
            reason: 'inappropriate_content',
          });

        expect(res.statusCode).toBe(201);
      });
    });
  });

  // =============================================================================
  // GET /reports/my-reports - Get user's submitted reports
  // =============================================================================
  describe('GET /reports/my-reports', () => {
    beforeEach(async () => {
      // Create some reports from the user
      await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'spam',
          description: 'Spam report 1',
        });

      // Create another user to report
      const User = mongoose.model('User');
      const thirdUser = await User.create({
        email: 'third@example.com',
        passwordHash: 'hashedpassword123',
      });

      await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: thirdUser._id.toString(),
          reason: 'harassment',
          description: 'Harassment report',
        });
    });

    it('should return list of reports submitted by user', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toBeDefined();
      expect(res.body.reports.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it('should return reports with correct fields', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      const report = res.body.reports[0];
      expect(report.targetType).toBeDefined();
      expect(report.reason).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.createdAt).toBeDefined();
    });

    it('should return reports in descending order by date', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      const reports = res.body.reports;
      const dates = reports.map((r) => new Date(r.createdAt));

      // Check that dates are in descending order
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });

    it('should support pagination with limit', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.length).toBe(1);
      expect(res.body.total).toBe(2);
      expect(res.body.limit).toBe(1);
    });

    it('should support pagination with skip', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .query({ skip: 1 })
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.length).toBe(1);
      expect(res.body.skip).toBe(1);
    });

    it('should return empty array for user with no reports', async () => {
      const res = await request(app)
        .get('/reports/my-reports')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should reject without auth token', async () => {
      const res = await request(app).get('/reports/my-reports');

      expect(res.statusCode).toBe(401);
    });
  });

  // =============================================================================
  // Report status lifecycle
  // =============================================================================
  describe('Report status lifecycle', () => {
    it('should create report with pending status by default', async () => {
      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'spam',
        });

      expect(res.statusCode).toBe(201);

      const Report = mongoose.model('Report');
      const report = await Report.findById(res.body.reportId);
      expect(report.status).toBe('pending');
    });

    it('should save content snapshot for user reports', async () => {
      // Update the other user with profile info
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(otherUserId, {
        'profile.displayName': 'Test User',
        'profile.bio': 'Test bio',
      });

      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'spam',
        });

      expect(res.statusCode).toBe(201);

      const Report = mongoose.model('Report');
      const report = await Report.findById(res.body.reportId);
      expect(report.contentSnapshot).toBeDefined();
      expect(report.contentSnapshot.email).toBe('reported@example.com');
    });

    it('should save content snapshot for message reports', async () => {
      // Create a message
      const Message = mongoose.model('Message');
      const Conversation = mongoose.model('Conversation');

      const conversation = await Conversation.create({
        participants: [userId, otherUserId],
        lastMessage: new Date(),
      });

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: otherUserId,
        content: 'Offensive message content here',
        contentType: 'text',
      });

      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'message',
          targetId: message._id.toString(),
          reason: 'harassment',
        });

      expect(res.statusCode).toBe(201);

      const Report = mongoose.model('Report');
      const report = await Report.findById(res.body.reportId);
      expect(report.contentSnapshot).toBeDefined();
      expect(report.contentSnapshot.content).toBe('Offensive message content here');
      expect(report.contentSnapshot.contentType).toBe('text');
    });

    it('should track reported user ID for message reports', async () => {
      // Create a message
      const Message = mongoose.model('Message');
      const Conversation = mongoose.model('Conversation');

      const conversation = await Conversation.create({
        participants: [userId, otherUserId],
        lastMessage: new Date(),
      });

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: otherUserId,
        content: 'Test message',
        contentType: 'text',
      });

      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'message',
          targetId: message._id.toString(),
          reason: 'harassment',
        });

      expect(res.statusCode).toBe(201);

      const Report = mongoose.model('Report');
      const report = await Report.findById(res.body.reportId);
      expect(report.reportedUserId.toString()).toBe(otherUserId);
    });
  });

  // =============================================================================
  // Priority assignment tests
  // =============================================================================
  describe('Priority assignment', () => {
    const highPriorityReasons = ['harassment', 'hate_speech', 'scam'];
    const lowPriorityReasons = ['spam'];
    const mediumPriorityReasons = ['inappropriate_content', 'impersonation', 'copyright', 'privacy_violation', 'other'];

    highPriorityReasons.forEach((reason) => {
      it(`should assign high priority for ${reason}`, async () => {
        const User = mongoose.model('User');
        const targetUser = await User.create({
          email: `target-high-${reason}@example.com`,
          passwordHash: 'hashedpassword123',
        });

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: targetUser._id.toString(),
            reason,
          });

        expect(res.statusCode).toBe(201);

        const Report = mongoose.model('Report');
        const report = await Report.findById(res.body.reportId);
        expect(report.priority).toBe('high');
      });
    });

    lowPriorityReasons.forEach((reason) => {
      it(`should assign low priority for ${reason}`, async () => {
        const User = mongoose.model('User');
        const targetUser = await User.create({
          email: `target-low-${reason}@example.com`,
          passwordHash: 'hashedpassword123',
        });

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: targetUser._id.toString(),
            reason,
          });

        expect(res.statusCode).toBe(201);

        const Report = mongoose.model('Report');
        const report = await Report.findById(res.body.reportId);
        expect(report.priority).toBe('low');
      });
    });

    mediumPriorityReasons.forEach((reason) => {
      it(`should assign medium priority for ${reason}`, async () => {
        const User = mongoose.model('User');
        const targetUser = await User.create({
          email: `target-med-${reason}@example.com`,
          passwordHash: 'hashedpassword123',
        });

        const res = await request(app)
          .post('/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'user',
            targetId: targetUser._id.toString(),
            reason,
          });

        expect(res.statusCode).toBe(201);

        const Report = mongoose.model('Report');
        const report = await Report.findById(res.body.reportId);
        expect(report.priority).toBe('medium');
      });
    });
  });

  // =============================================================================
  // Edge cases
  // =============================================================================
  describe('Edge cases', () => {
    it('should allow reporting same target after previous report is resolved', async () => {
      // Create first report
      const res1 = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'spam',
        });

      expect(res1.statusCode).toBe(201);

      // Resolve the report (simulate admin action)
      const Report = mongoose.model('Report');
      await Report.findByIdAndUpdate(res1.body.reportId, {
        status: 'resolved',
        resolution: {
          action: 'no_action',
          notes: 'No violation found',
        },
      });

      // Should be able to report again
      const res2 = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'harassment',
        });

      expect(res2.statusCode).toBe(201);
      expect(res2.body.reportId).not.toBe(res1.body.reportId);
    });

    it('should allow different users to report the same target', async () => {
      // First user reports
      const res1 = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'spam',
        });

      expect(res1.statusCode).toBe(201);

      // Create third user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'third.reporter@example.com',
          password: 'Password123!',
        });

      const thirdRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'third.reporter@example.com',
          password: 'Password123!',
        });

      const thirdToken = thirdRes.body.token;

      // Third user reports same target
      const res2 = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${thirdToken}`)
        .send({
          targetType: 'user',
          targetId: otherUserId,
          reason: 'harassment',
        });

      expect(res2.statusCode).toBe(201);
      expect(res2.body.reportId).not.toBe(res1.body.reportId);
    });

    it('should truncate long message content in snapshot', async () => {
      // Create a message with very long content
      const Message = mongoose.model('Message');
      const Conversation = mongoose.model('Conversation');

      const conversation = await Conversation.create({
        participants: [userId, otherUserId],
        lastMessage: new Date(),
      });

      const longContent = 'A'.repeat(1000); // 1000 characters
      const message = await Message.create({
        conversationId: conversation._id,
        senderId: otherUserId,
        content: longContent,
        contentType: 'text',
      });

      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'message',
          targetId: message._id.toString(),
          reason: 'harassment',
        });

      expect(res.statusCode).toBe(201);

      const Report = mongoose.model('Report');
      const report = await Report.findById(res.body.reportId);
      // Content should be truncated to 500 characters
      expect(report.contentSnapshot.content.length).toBe(500);
    });
  });
});
