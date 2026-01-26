/**
 * =============================================================================
 * REPORT.TEST.JS - Tests for Content/User Reporting Model
 * =============================================================================
 *
 * Tests covering:
 * - CRUD operations for reports
 * - Validation of required fields and enums
 * - Report types and reasons
 * - Report status transitions (pending, reviewing, resolved, dismissed)
 * - Priority assignment
 * - Getting reports by status
 * - Reporter and reported user relationships
 * - Resolution and dismissal workflows
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Report from './Report.js';
import User from './User.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a test user with minimal required fields
 */
const createTestUser = async (emailSuffix) => {
  return User.create({
    email: `testuser${emailSuffix}@example.com`,
    passwordHash: 'hashedpassword123'
  });
};

/**
 * Creates a basic report for testing
 */
const createTestReport = async (reporter, targetType, targetId, options = {}) => {
  return Report.create({
    reporterId: reporter._id,
    targetType,
    targetId,
    reason: options.reason || 'spam',
    description: options.description,
    reportedUserId: options.reportedUserId,
    contentSnapshot: options.contentSnapshot,
    priority: options.priority,
    status: options.status
  });
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

describe('Report Model - CRUD Operations', () => {
  let reporter, reportedUser, targetId;

  beforeEach(async () => {
    reporter = await createTestUser('reporter');
    reportedUser = await createTestUser('reported');
    targetId = new mongoose.Types.ObjectId();
  });

  describe('Create', () => {
    test('should create a report with required fields', async () => {
      const report = await Report.create({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'harassment'
      });

      expect(report).toBeDefined();
      expect(report.reporterId.toString()).toBe(reporter._id.toString());
      expect(report.targetType).toBe('user');
      expect(report.reason).toBe('harassment');
      expect(report.status).toBe('pending'); // Default
      expect(report.priority).toBe('medium'); // Default
    });

    test('should create a report with optional fields', async () => {
      const report = await Report.create({
        reporterId: reporter._id,
        targetType: 'message',
        targetId,
        reason: 'spam',
        description: 'User sending promotional messages',
        reportedUserId: reportedUser._id,
        contentSnapshot: { text: 'Buy my product!', sentAt: new Date() }
      });

      expect(report.description).toBe('User sending promotional messages');
      expect(report.reportedUserId.toString()).toBe(reportedUser._id.toString());
      expect(report.contentSnapshot.text).toBe('Buy my product!');
    });

    test('should create reports for all target types', async () => {
      const targetTypes = ['user', 'message', 'project', 'task', 'note', 'file', 'share', 'comment'];

      for (const type of targetTypes) {
        const newReporter = await createTestUser(`${type}reporter`);
        const report = await Report.create({
          reporterId: newReporter._id,
          targetType: type,
          targetId: new mongoose.Types.ObjectId(),
          reason: 'spam'
        });

        expect(report.targetType).toBe(type);
      }
    });

    test('should create reports with all reason types', async () => {
      const reasons = [
        'spam', 'harassment', 'hate_speech', 'inappropriate_content',
        'impersonation', 'copyright', 'privacy_violation', 'scam', 'other'
      ];

      for (let i = 0; i < reasons.length; i++) {
        const newReporter = await createTestUser(`reason${i}reporter`);
        const report = await Report.create({
          reporterId: newReporter._id,
          targetType: 'user',
          targetId: new mongoose.Types.ObjectId(),
          reason: reasons[i]
        });

        expect(report.reason).toBe(reasons[i]);
      }
    });
  });

  describe('Read', () => {
    test('should find a report by id', async () => {
      const created = await createTestReport(reporter, 'user', reportedUser._id, { reason: 'harassment' });

      const found = await Report.findById(created._id);
      expect(found).toBeDefined();
      expect(found.reason).toBe('harassment');
    });

    test('should find reports by reporter', async () => {
      await createTestReport(reporter, 'user', new mongoose.Types.ObjectId());
      await createTestReport(reporter, 'message', new mongoose.Types.ObjectId());

      const reports = await Report.find({ reporterId: reporter._id });
      expect(reports).toHaveLength(2);
    });

    test('should find reports by status', async () => {
      await createTestReport(reporter, 'user', new mongoose.Types.ObjectId(), { status: 'pending' });
      await createTestReport(reporter, 'message', new mongoose.Types.ObjectId(), { status: 'resolved' });

      const pending = await Report.find({ status: 'pending' });
      const resolved = await Report.find({ status: 'resolved' });

      expect(pending).toHaveLength(1);
      expect(resolved).toHaveLength(1);
    });
  });

  describe('Update', () => {
    test('should update report status', async () => {
      const report = await createTestReport(reporter, 'user', reportedUser._id);

      report.status = 'reviewing';
      await report.save();

      const updated = await Report.findById(report._id);
      expect(updated.status).toBe('reviewing');
    });

    test('should update report priority', async () => {
      const report = await createTestReport(reporter, 'user', reportedUser._id);

      report.priority = 'critical';
      await report.save();

      const updated = await Report.findById(report._id);
      expect(updated.priority).toBe('critical');
    });
  });

  describe('Delete', () => {
    test('should delete a report', async () => {
      const report = await createTestReport(reporter, 'user', reportedUser._id);

      await Report.findByIdAndDelete(report._id);

      const found = await Report.findById(report._id);
      expect(found).toBeNull();
    });
  });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('Report Model - Validation', () => {
  let reporter;

  beforeEach(async () => {
    reporter = await createTestUser('vreporter');
  });

  describe('Required Fields', () => {
    test('should fail without reporterId', async () => {
      const report = new Report({
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail without targetType', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail without targetId', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        reason: 'spam'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail without reason', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId()
      });

      await expect(report.save()).rejects.toThrow();
    });
  });

  describe('Enum Validation', () => {
    test('should fail with invalid targetType', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'invalid_type',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail with invalid reason', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'invalid_reason'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail with invalid status', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        status: 'invalid_status'
      });

      await expect(report.save()).rejects.toThrow();
    });

    test('should fail with invalid priority', async () => {
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        priority: 'invalid_priority'
      });

      await expect(report.save()).rejects.toThrow();
    });
  });

  describe('Field Constraints', () => {
    test('should allow description up to 1000 characters', async () => {
      const longDescription = 'a'.repeat(1000);
      const report = await Report.create({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        description: longDescription
      });

      expect(report.description).toHaveLength(1000);
    });

    test('should fail with description over 1000 characters', async () => {
      const tooLongDescription = 'a'.repeat(1001);
      const report = new Report({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        description: tooLongDescription
      });

      await expect(report.save()).rejects.toThrow();
    });
  });
});

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

describe('Report Model - Status Transitions', () => {
  let reporter, admin;

  beforeEach(async () => {
    reporter = await createTestUser('streporter');
    admin = await createTestUser('stadmin');
  });

  describe('Resolve', () => {
    test('should resolve report with action', async () => {
      const report = await createTestReport(reporter, 'user', new mongoose.Types.ObjectId());

      await report.resolve(admin._id, 'warning', 'User warned for spam');

      expect(report.status).toBe('resolved');
      expect(report.resolution.resolvedBy.toString()).toBe(admin._id.toString());
      expect(report.resolution.action).toBe('warning');
      expect(report.resolution.notes).toBe('User warned for spam');
      expect(report.resolution.resolvedAt).toBeDefined();
    });

    test('should save resolution to database', async () => {
      const report = await createTestReport(reporter, 'message', new mongoose.Types.ObjectId());

      await report.resolve(admin._id, 'content_removed', 'Deleted offensive message');

      const found = await Report.findById(report._id);
      expect(found.status).toBe('resolved');
      expect(found.resolution.action).toBe('content_removed');
    });

    test('should accept all valid actions', async () => {
      const actions = ['no_action', 'warning', 'content_removed', 'user_suspended', 'user_banned'];

      for (let i = 0; i < actions.length; i++) {
        const newReporter = await createTestUser(`action${i}reporter`);
        const report = await createTestReport(newReporter, 'user', new mongoose.Types.ObjectId());

        await report.resolve(admin._id, actions[i], `Action: ${actions[i]}`);

        expect(report.resolution.action).toBe(actions[i]);
      }
    });
  });

  describe('Dismiss', () => {
    test('should dismiss report', async () => {
      const report = await createTestReport(reporter, 'user', new mongoose.Types.ObjectId());

      await report.dismiss(admin._id, 'No violation found');

      expect(report.status).toBe('dismissed');
      expect(report.resolution.action).toBe('no_action');
      expect(report.resolution.notes).toBe('No violation found');
      expect(report.resolution.resolvedBy.toString()).toBe(admin._id.toString());
    });

    test('should save dismissal to database', async () => {
      const report = await createTestReport(reporter, 'note', new mongoose.Types.ObjectId());

      await report.dismiss(admin._id, 'Content is fine');

      const found = await Report.findById(report._id);
      expect(found.status).toBe('dismissed');
    });
  });

  describe('Valid Status Values', () => {
    test('should allow all valid statuses', async () => {
      const statuses = ['pending', 'reviewing', 'resolved', 'dismissed'];

      for (let i = 0; i < statuses.length; i++) {
        const newReporter = await createTestUser(`status${i}reporter`);
        const report = await Report.create({
          reporterId: newReporter._id,
          targetType: 'user',
          targetId: new mongoose.Types.ObjectId(),
          reason: 'spam',
          status: statuses[i]
        });

        expect(report.status).toBe(statuses[i]);
      }
    });
  });
});

// =============================================================================
// PRIORITY ASSIGNMENT
// =============================================================================

describe('Report Model - Priority', () => {
  let reporter;

  beforeEach(async () => {
    reporter = await createTestUser('preporter');
  });

  describe('Manual Priority', () => {
    test('should accept all valid priorities', async () => {
      const priorities = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < priorities.length; i++) {
        const newReporter = await createTestUser(`priority${i}reporter`);
        const report = await Report.create({
          reporterId: newReporter._id,
          targetType: 'user',
          targetId: new mongoose.Types.ObjectId(),
          reason: 'spam',
          priority: priorities[i]
        });

        expect(report.priority).toBe(priorities[i]);
      }
    });
  });

  describe('Automatic Priority via createReport', () => {
    test('should assign high priority for harassment', async () => {
      const report = await Report.createReport({
        reporterId: reporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'harassment'
      });

      expect(report.priority).toBe('high');
    });

    test('should assign high priority for hate_speech', async () => {
      const newReporter = await createTestUser('hatespeechreporter');
      const report = await Report.createReport({
        reporterId: newReporter._id,
        targetType: 'message',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'hate_speech'
      });

      expect(report.priority).toBe('high');
    });

    test('should assign high priority for scam', async () => {
      const newReporter = await createTestUser('scamreporter');
      const report = await Report.createReport({
        reporterId: newReporter._id,
        targetType: 'user',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'scam'
      });

      expect(report.priority).toBe('high');
    });

    test('should assign low priority for spam', async () => {
      const newReporter = await createTestUser('spamreporter');
      const report = await Report.createReport({
        reporterId: newReporter._id,
        targetType: 'message',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam'
      });

      expect(report.priority).toBe('low');
    });

    test('should assign medium priority for other reasons', async () => {
      const reasons = ['inappropriate_content', 'impersonation', 'copyright', 'privacy_violation', 'other'];

      for (let i = 0; i < reasons.length; i++) {
        const newReporter = await createTestUser(`medium${i}reporter`);
        const report = await Report.createReport({
          reporterId: newReporter._id,
          targetType: 'user',
          targetId: new mongoose.Types.ObjectId(),
          reason: reasons[i]
        });

        expect(report.priority).toBe('medium');
      }
    });
  });
});

// =============================================================================
// STATIC METHODS - QUERYING REPORTS
// =============================================================================

describe('Report Model - Static Query Methods', () => {
  let reporter1, reporter2, admin, reportedUser;

  beforeEach(async () => {
    reporter1 = await createTestUser('qreporter1');
    reporter2 = await createTestUser('qreporter2');
    admin = await createTestUser('qadmin');
    reportedUser = await createTestUser('qreported');
  });

  describe('getPendingReports', () => {
    beforeEach(async () => {
      // Create various reports
      await createTestReport(reporter1, 'user', reportedUser._id, {
        status: 'pending',
        priority: 'high',
        reportedUserId: reportedUser._id
      });
      await createTestReport(reporter2, 'message', new mongoose.Types.ObjectId(), {
        status: 'pending',
        priority: 'low'
      });
      await createTestReport(reporter1, 'note', new mongoose.Types.ObjectId(), {
        status: 'resolved'
      });
    });

    test('should return pending reports by default', async () => {
      const reports = await Report.getPendingReports();

      expect(reports).toHaveLength(2);
      reports.forEach(r => expect(r.status).toBe('pending'));
    });

    test('should filter by status', async () => {
      const reports = await Report.getPendingReports({ status: 'resolved' });

      expect(reports).toHaveLength(1);
      expect(reports[0].status).toBe('resolved');
    });

    test('should filter by priority', async () => {
      const reports = await Report.getPendingReports({ priority: 'high' });

      expect(reports).toHaveLength(1);
      expect(reports[0].priority).toBe('high');
    });

    test('should filter by targetType', async () => {
      const reports = await Report.getPendingReports({ targetType: 'message' });

      expect(reports).toHaveLength(1);
      expect(reports[0].targetType).toBe('message');
    });

    test('should respect limit', async () => {
      const reports = await Report.getPendingReports({ limit: 1 });

      expect(reports).toHaveLength(1);
    });

    test('should respect skip', async () => {
      const reports = await Report.getPendingReports({ skip: 1 });

      expect(reports).toHaveLength(1);
    });

    test('should populate reporter info', async () => {
      const reports = await Report.getPendingReports();

      expect(reports[0].reporterId).toBeDefined();
      expect(reports[0].reporterId.email).toBeDefined();
    });
  });

  describe('getReportsForUser', () => {
    beforeEach(async () => {
      await createTestReport(reporter1, 'user', reportedUser._id, {
        reportedUserId: reportedUser._id
      });
      await createTestReport(reporter2, 'message', new mongoose.Types.ObjectId(), {
        reportedUserId: reportedUser._id
      });
      await createTestReport(reporter1, 'note', new mongoose.Types.ObjectId(), {
        reportedUserId: reporter1._id // Different user
      });
    });

    test('should return reports for a specific user', async () => {
      const reports = await Report.getReportsForUser(reportedUser._id);

      expect(reports).toHaveLength(2);
      reports.forEach(r => {
        expect(r.reportedUserId.toString()).toBe(reportedUser._id.toString());
      });
    });

    test('should respect limit option', async () => {
      const reports = await Report.getReportsForUser(reportedUser._id, { limit: 1 });

      expect(reports).toHaveLength(1);
    });

    test('should return empty for user with no reports', async () => {
      const newUser = await createTestUser('noreports');
      const reports = await Report.getReportsForUser(newUser._id);

      expect(reports).toHaveLength(0);
    });
  });

  describe('getReportCounts', () => {
    beforeEach(async () => {
      await createTestReport(reporter1, 'user', new mongoose.Types.ObjectId(), { status: 'pending' });
      await createTestReport(reporter2, 'user', new mongoose.Types.ObjectId(), { status: 'pending' });
      await createTestReport(reporter1, 'user', new mongoose.Types.ObjectId(), { status: 'reviewing' });
      await createTestReport(reporter2, 'user', new mongoose.Types.ObjectId(), { status: 'resolved' });
      await createTestReport(reporter1, 'user', new mongoose.Types.ObjectId(), { status: 'dismissed' });
    });

    test('should return counts by status', async () => {
      const counts = await Report.getReportCounts();

      expect(counts.pending).toBe(2);
      expect(counts.reviewing).toBe(1);
      expect(counts.resolved).toBe(1);
      expect(counts.dismissed).toBe(1);
    });

    test('should include total count', async () => {
      const counts = await Report.getReportCounts();

      expect(counts.total).toBe(5);
    });

    test('should return zeros for empty database', async () => {
      // Clear all reports
      await Report.deleteMany({});

      const counts = await Report.getReportCounts();

      expect(counts.pending).toBe(0);
      expect(counts.reviewing).toBe(0);
      expect(counts.resolved).toBe(0);
      expect(counts.dismissed).toBe(0);
      expect(counts.total).toBe(0);
    });
  });

  describe('createReport', () => {
    test('should create a report', async () => {
      const report = await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'spam'
      });

      expect(report).toBeDefined();
      expect(report.status).toBe('pending');
    });

    test('should prevent duplicate active reports', async () => {
      await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'spam'
      });

      // Same reporter, same target should fail
      await expect(
        Report.createReport({
          reporterId: reporter1._id,
          targetType: 'user',
          targetId: reportedUser._id,
          reason: 'harassment'
        })
      ).rejects.toThrow('You have already reported this content');
    });

    test('should allow different reporters to report same target', async () => {
      await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'spam'
      });

      const report2 = await Report.createReport({
        reporterId: reporter2._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'harassment'
      });

      expect(report2).toBeDefined();
    });

    test('should allow re-reporting after previous report is resolved', async () => {
      // Create and resolve first report
      const report1 = await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'spam'
      });
      report1.status = 'resolved';
      await report1.save();

      // Should now be able to report again
      const report2 = await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'user',
        targetId: reportedUser._id,
        reason: 'spam'
      });

      expect(report2).toBeDefined();
    });

    test('should include content snapshot when provided', async () => {
      const snapshot = { text: 'Offensive message', timestamp: new Date() };
      const report = await Report.createReport({
        reporterId: reporter1._id,
        targetType: 'message',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'harassment',
        contentSnapshot: snapshot
      });

      expect(report.contentSnapshot.text).toBe('Offensive message');
    });
  });
});

// =============================================================================
// CONTENT SNAPSHOT
// =============================================================================

describe('Report Model - Content Snapshot', () => {
  let reporter;

  beforeEach(async () => {
    reporter = await createTestUser('csreporter');
  });

  test('should store simple content snapshot', async () => {
    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'message',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'harassment',
      contentSnapshot: { text: 'Bad message' }
    });

    expect(report.contentSnapshot.text).toBe('Bad message');
  });

  test('should store complex content snapshot', async () => {
    const snapshot = {
      title: 'Spam project',
      description: 'Buy our product',
      createdAt: new Date(),
      owner: { name: 'Spammer' },
      tasks: ['Task 1', 'Task 2']
    };

    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'project',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'spam',
      contentSnapshot: snapshot
    });

    expect(report.contentSnapshot.title).toBe('Spam project');
    expect(report.contentSnapshot.tasks).toHaveLength(2);
  });

  test('should preserve snapshot even after content is deleted', async () => {
    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'note',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'inappropriate_content',
      contentSnapshot: { content: 'Inappropriate content here' }
    });

    // Original content could be deleted, but snapshot remains
    const found = await Report.findById(report._id);
    expect(found.contentSnapshot.content).toBe('Inappropriate content here');
  });
});

// =============================================================================
// TIMESTAMPS
// =============================================================================

describe('Report Model - Timestamps', () => {
  let reporter;

  beforeEach(async () => {
    reporter = await createTestUser('tsreporter');
  });

  test('should have createdAt timestamp', async () => {
    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'user',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'spam'
    });

    expect(report.createdAt).toBeDefined();
    expect(report.createdAt instanceof Date).toBe(true);
  });

  test('should have updatedAt timestamp', async () => {
    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'user',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'spam'
    });

    expect(report.updatedAt).toBeDefined();
  });

  test('should update updatedAt when modified', async () => {
    const report = await Report.create({
      reporterId: reporter._id,
      targetType: 'user',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'spam'
    });

    const originalUpdatedAt = report.updatedAt;

    await new Promise(resolve => setTimeout(resolve, 10));
    report.status = 'reviewing';
    await report.save();

    expect(report.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
