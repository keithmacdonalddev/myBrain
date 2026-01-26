/**
 * =============================================================================
 * LOG MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Log model, covering:
 * - Schema validation (required fields, enums)
 * - Default values (timestamp, sampled, etc.)
 * - Static methods (searchLogs)
 * - Instance methods (toSafeJSON)
 * - Indexing behavior
 * - Log levels and sample reasons
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Log from './Log.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a log entry with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestLog(overrides = {}) {
  const defaults = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    route: '/api/test',
    method: 'GET',
    statusCode: 200,
    durationMs: 50,
    eventName: 'test.request.success',
  };
  return Log.create({ ...defaults, ...overrides });
}

/**
 * Creates a test user ObjectId for user association tests.
 */
function createTestUserId() {
  return new mongoose.Types.ObjectId();
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('Log Model', () => {
  describe('Schema Validation', () => {
    // -------------------------------------------------------------------------
    // Required Fields
    // -------------------------------------------------------------------------
    describe('Required fields', () => {
      it('should require requestId', async () => {
        await expect(
          Log.create({
            route: '/api/test',
            method: 'GET',
            statusCode: 200,
            durationMs: 50,
            eventName: 'test.request',
          })
        ).rejects.toThrow(/requestId.*required/i);
      });

      it('should require route', async () => {
        await expect(
          Log.create({
            requestId: 'req_123',
            method: 'GET',
            statusCode: 200,
            durationMs: 50,
            eventName: 'test.request',
          })
        ).rejects.toThrow(/route.*required/i);
      });

      it('should require method', async () => {
        await expect(
          Log.create({
            requestId: 'req_123',
            route: '/api/test',
            statusCode: 200,
            durationMs: 50,
            eventName: 'test.request',
          })
        ).rejects.toThrow(/method.*required/i);
      });

      it('should require statusCode', async () => {
        await expect(
          Log.create({
            requestId: 'req_123',
            route: '/api/test',
            method: 'GET',
            durationMs: 50,
            eventName: 'test.request',
          })
        ).rejects.toThrow(/statusCode.*required/i);
      });

      it('should require durationMs', async () => {
        await expect(
          Log.create({
            requestId: 'req_123',
            route: '/api/test',
            method: 'GET',
            statusCode: 200,
            eventName: 'test.request',
          })
        ).rejects.toThrow(/durationMs.*required/i);
      });

      it('should require eventName', async () => {
        await expect(
          Log.create({
            requestId: 'req_123',
            route: '/api/test',
            method: 'GET',
            statusCode: 200,
            durationMs: 50,
          })
        ).rejects.toThrow(/eventName.*required/i);
      });
    });

    // -------------------------------------------------------------------------
    // Enum Validation
    // -------------------------------------------------------------------------
    describe('Method enum validation', () => {
      it('should accept valid HTTP methods', async () => {
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'CLIENT'];

        for (const method of methods) {
          const log = await createTestLog({
            method,
            requestId: `req_${method}_${Date.now()}`
          });
          expect(log.method).toBe(method);
        }
      });

      it('should reject invalid HTTP method', async () => {
        await expect(
          createTestLog({ method: 'INVALID' })
        ).rejects.toThrow();
      });
    });

    describe('SampleReason enum validation', () => {
      it('should accept valid sample reasons', async () => {
        const reasons = ['error', 'slow', 'debug_user', 'random', 'always', 'admin', 'client_error', 'mutation', 'auth'];

        for (const reason of reasons) {
          const log = await createTestLog({
            sampleReason: reason,
            requestId: `req_${reason}_${Date.now()}`
          });
          expect(log.sampleReason).toBe(reason);
        }
      });

      it('should reject invalid sample reason', async () => {
        await expect(
          createTestLog({ sampleReason: 'invalid_reason' })
        ).rejects.toThrow();
      });
    });

    // -------------------------------------------------------------------------
    // Unique Constraints
    // -------------------------------------------------------------------------
    describe('Unique constraints', () => {
      it('should enforce unique requestId', async () => {
        const requestId = 'req_unique_test_123';
        await createTestLog({ requestId });

        await expect(
          createTestLog({ requestId })
        ).rejects.toThrow(/duplicate key/i);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    it('should set timestamp to current date by default', async () => {
      const before = new Date();
      const log = await createTestLog();
      const after = new Date();

      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set sampled to true by default', async () => {
      const log = await createTestLog();
      expect(log.sampled).toBe(true);
    });

    it('should set sampleReason to random by default', async () => {
      const log = await createTestLog();
      expect(log.sampleReason).toBe('random');
    });

    it('should set userId to null by default', async () => {
      const log = await createTestLog();
      expect(log.userId).toBeNull();
    });

    it('should set userRole to null by default', async () => {
      const log = await createTestLog();
      expect(log.userRole).toBeNull();
    });

    it('should set userEmail to null by default', async () => {
      const log = await createTestLog();
      expect(log.userEmail).toBeNull();
    });

    it('should set featureFlags to empty object by default', async () => {
      const log = await createTestLog();
      expect(log.featureFlags).toEqual({});
    });

    it('should set metadata to empty object by default', async () => {
      const log = await createTestLog();
      expect(log.metadata).toEqual({});
    });

    it('should set entityIds fields to null by default', async () => {
      const log = await createTestLog();
      expect(log.entityIds.noteId).toBeNull();
      expect(log.entityIds.workflowId).toBeNull();
      expect(log.entityIds.runId).toBeNull();
      expect(log.entityIds.areaId).toBeNull();
      expect(log.entityIds.targetUserId).toBeNull();
    });

    it('should set error fields to null by default', async () => {
      const log = await createTestLog();
      expect(log.error.category).toBeNull();
      expect(log.error.code).toBeNull();
      expect(log.error.name).toBeNull();
      expect(log.error.messageSafe).toBeNull();
      expect(log.error.stack).toBeNull();
      expect(log.error.context).toBeNull();
    });

    it('should set clientInfo fields to null by default', async () => {
      const log = await createTestLog();
      expect(log.clientInfo.ip).toBeNull();
      expect(log.clientInfo.userAgent).toBeNull();
      expect(log.clientInfo.origin).toBeNull();
    });
  });

  // ===========================================================================
  // TEST SUITE: LOG LEVELS (via statusCode and sampleReason)
  // ===========================================================================

  describe('Log Levels and Types', () => {
    it('should create info level log (2xx status)', async () => {
      const log = await createTestLog({
        statusCode: 200,
        sampleReason: 'random',
      });
      expect(log.statusCode).toBe(200);
      expect(log.sampleReason).toBe('random');
    });

    it('should create warning level log (4xx status)', async () => {
      const log = await createTestLog({
        statusCode: 401,
        sampleReason: 'auth',
        error: {
          category: 'auth',
          code: 'UNAUTHORIZED',
          messageSafe: 'Invalid credentials',
        },
      });
      expect(log.statusCode).toBe(401);
      expect(log.error.category).toBe('auth');
    });

    it('should create error level log (5xx status)', async () => {
      const log = await createTestLog({
        statusCode: 500,
        sampleReason: 'error',
        error: {
          category: 'server',
          code: 'INTERNAL_ERROR',
          name: 'Error',
          messageSafe: 'Internal server error',
          stack: 'Error: Something went wrong\n    at ...',
          context: { action: 'createNote' },
        },
      });
      expect(log.statusCode).toBe(500);
      expect(log.sampleReason).toBe('error');
      expect(log.error.stack).toBeTruthy();
    });

    it('should create slow request log', async () => {
      const log = await createTestLog({
        durationMs: 5000,
        sampleReason: 'slow',
      });
      expect(log.durationMs).toBe(5000);
      expect(log.sampleReason).toBe('slow');
    });

    it('should create admin action log', async () => {
      const log = await createTestLog({
        route: '/api/admin/users',
        method: 'PATCH',
        sampleReason: 'admin',
        userRole: 'admin',
      });
      expect(log.sampleReason).toBe('admin');
      expect(log.userRole).toBe('admin');
    });

    it('should create mutation log', async () => {
      const log = await createTestLog({
        method: 'POST',
        sampleReason: 'mutation',
        eventName: 'notes.create.success',
      });
      expect(log.method).toBe('POST');
      expect(log.sampleReason).toBe('mutation');
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ASSOCIATION
  // ===========================================================================

  describe('User Association', () => {
    it('should store userId reference', async () => {
      const userId = createTestUserId();
      const log = await createTestLog({ userId });

      expect(log.userId).toEqual(userId);
    });

    it('should store user context (role and email)', async () => {
      const userId = createTestUserId();
      const log = await createTestLog({
        userId,
        userRole: 'premium',
        userEmail: 'test@example.com',
      });

      expect(log.userRole).toBe('premium');
      expect(log.userEmail).toBe('test@example.com');
    });

    it('should store feature flags snapshot', async () => {
      const log = await createTestLog({
        featureFlags: {
          betaFeatures: true,
          advancedSearch: false,
          darkMode: true,
        },
      });

      expect(log.featureFlags.betaFeatures).toBe(true);
      expect(log.featureFlags.advancedSearch).toBe(false);
      expect(log.featureFlags.darkMode).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: REQUEST METADATA
  // ===========================================================================

  describe('Request Metadata', () => {
    it('should store entity IDs for tracing', async () => {
      const log = await createTestLog({
        entityIds: {
          noteId: 'note_abc123',
          workflowId: 'wf_xyz789',
          areaId: 'area_456',
          targetUserId: 'user_target',
        },
      });

      expect(log.entityIds.noteId).toBe('note_abc123');
      expect(log.entityIds.workflowId).toBe('wf_xyz789');
      expect(log.entityIds.areaId).toBe('area_456');
      expect(log.entityIds.targetUserId).toBe('user_target');
    });

    it('should store client information', async () => {
      const log = await createTestLog({
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          origin: 'https://mybrain.app',
        },
      });

      expect(log.clientInfo.ip).toBe('192.168.1.1');
      expect(log.clientInfo.userAgent).toContain('Chrome');
      expect(log.clientInfo.origin).toBe('https://mybrain.app');
    });

    it('should store additional metadata', async () => {
      const log = await createTestLog({
        metadata: {
          queryParams: { page: 1, limit: 20 },
          responseSize: 4523,
          cacheHit: true,
        },
      });

      expect(log.metadata.queryParams).toEqual({ page: 1, limit: 20 });
      expect(log.metadata.responseSize).toBe(4523);
      expect(log.metadata.cacheHit).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS (searchLogs)
  // ===========================================================================

  describe('Static Methods', () => {
    describe('searchLogs()', () => {
      beforeEach(async () => {
        // Create test data for search tests
        const userId = createTestUserId();
        const now = new Date();
        const hourAgo = new Date(now - 60 * 60 * 1000);
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

        await Log.create([
          {
            requestId: 'req_search_1',
            route: '/api/notes',
            method: 'GET',
            statusCode: 200,
            durationMs: 50,
            eventName: 'notes.list.success',
            userId,
            timestamp: now,
          },
          {
            requestId: 'req_search_2',
            route: '/api/notes',
            method: 'POST',
            statusCode: 201,
            durationMs: 100,
            eventName: 'notes.create.success',
            userId,
            timestamp: hourAgo,
          },
          {
            requestId: 'req_search_3',
            route: '/api/auth/login',
            method: 'POST',
            statusCode: 401,
            durationMs: 30,
            eventName: 'auth.login.failure',
            error: { code: 'INVALID_CREDENTIALS' },
            timestamp: dayAgo,
          },
          {
            requestId: 'req_search_4',
            route: '/api/tasks',
            method: 'GET',
            statusCode: 500,
            durationMs: 200,
            eventName: 'tasks.list.error',
            error: { code: 'DATABASE_ERROR' },
            timestamp: hourAgo,
          },
        ]);
      });

      it('should return all logs with default options', async () => {
        const { logs, total } = await Log.searchLogs();

        expect(logs.length).toBe(4);
        expect(total).toBe(4);
      });

      it('should search by requestId', async () => {
        const { logs, total } = await Log.searchLogs({ requestId: 'req_search_1' });

        expect(logs.length).toBe(1);
        expect(total).toBe(1);
        expect(logs[0].requestId).toBe('req_search_1');
      });

      it('should filter by userId', async () => {
        const log = await Log.findOne({ requestId: 'req_search_1' });
        const { logs, total } = await Log.searchLogs({ userId: log.userId.toString() });

        expect(total).toBe(2);
        logs.forEach(l => expect(l.userId.toString()).toBe(log.userId.toString()));
      });

      it('should filter by eventName (partial match)', async () => {
        const { logs } = await Log.searchLogs({ eventName: 'notes' });

        expect(logs.length).toBe(2);
        logs.forEach(l => expect(l.eventName).toMatch(/notes/));
      });

      it('should filter by exact statusCode', async () => {
        const { logs, total } = await Log.searchLogs({ statusCode: 401 });

        expect(total).toBe(1);
        expect(logs[0].statusCode).toBe(401);
      });

      it('should filter by minStatusCode', async () => {
        const { logs } = await Log.searchLogs({ minStatusCode: 400 });

        expect(logs.length).toBe(2);
        logs.forEach(l => expect(l.statusCode).toBeGreaterThanOrEqual(400));
      });

      it('should filter by maxStatusCode', async () => {
        const { logs } = await Log.searchLogs({ maxStatusCode: 299 });

        expect(logs.length).toBe(2);
        logs.forEach(l => expect(l.statusCode).toBeLessThanOrEqual(299));
      });

      it('should filter by status code range', async () => {
        const { logs } = await Log.searchLogs({ minStatusCode: 400, maxStatusCode: 499 });

        expect(logs.length).toBe(1);
        expect(logs[0].statusCode).toBe(401);
      });

      it('should filter by time range', async () => {
        const now = new Date();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

        const { logs } = await Log.searchLogs({
          from: twoHoursAgo,
          to: now,
        });

        expect(logs.length).toBe(3); // Excludes the day-old log
      });

      it('should filter for logs with errors', async () => {
        const { logs } = await Log.searchLogs({ hasError: true });

        expect(logs.length).toBe(2);
        logs.forEach(l => expect(l.error.code).toBeTruthy());
      });

      it('should respect limit option', async () => {
        const { logs, total } = await Log.searchLogs({ limit: 2 });

        expect(logs.length).toBe(2);
        expect(total).toBe(4); // Total is still all matching
      });

      it('should respect skip option for pagination', async () => {
        const { logs: firstPage } = await Log.searchLogs({ limit: 2, skip: 0 });
        const { logs: secondPage } = await Log.searchLogs({ limit: 2, skip: 2 });

        expect(firstPage.length).toBe(2);
        expect(secondPage.length).toBe(2);

        // Pages should have different logs
        const firstIds = firstPage.map(l => l.requestId);
        const secondIds = secondPage.map(l => l.requestId);
        expect(firstIds).not.toEqual(secondIds);
      });

      it('should sort by timestamp descending by default', async () => {
        const { logs } = await Log.searchLogs();

        for (let i = 1; i < logs.length; i++) {
          expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
            logs[i].timestamp.getTime()
          );
        }
      });

      it('should sort ascending when specified', async () => {
        const { logs } = await Log.searchLogs({ sort: 'timestamp' });

        for (let i = 1; i < logs.length; i++) {
          expect(logs[i - 1].timestamp.getTime()).toBeLessThanOrEqual(
            logs[i].timestamp.getTime()
          );
        }
      });

      it('should handle eventName case-insensitively', async () => {
        const { logs } = await Log.searchLogs({ eventName: 'NOTES' });

        expect(logs.length).toBe(2);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should remove __v field', async () => {
        const log = await createTestLog();
        const safeJson = log.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
      });

      it('should preserve all other fields', async () => {
        const log = await createTestLog({
          route: '/api/notes',
          method: 'POST',
          statusCode: 201,
          durationMs: 150,
          eventName: 'notes.create.success',
          sampleReason: 'mutation',
        });
        const safeJson = log.toSafeJSON();

        expect(safeJson.requestId).toBe(log.requestId);
        expect(safeJson.route).toBe('/api/notes');
        expect(safeJson.method).toBe('POST');
        expect(safeJson.statusCode).toBe(201);
        expect(safeJson.durationMs).toBe(150);
        expect(safeJson.eventName).toBe('notes.create.success');
        expect(safeJson.sampleReason).toBe('mutation');
      });

      it('should include error details when present', async () => {
        const log = await createTestLog({
          statusCode: 500,
          error: {
            category: 'server',
            code: 'DB_ERROR',
            messageSafe: 'Database connection failed',
          },
        });
        const safeJson = log.toSafeJSON();

        expect(safeJson.error.category).toBe('server');
        expect(safeJson.error.code).toBe('DB_ERROR');
        expect(safeJson.error.messageSafe).toBe('Database connection failed');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: TIMESTAMP INDEXING (Schema Definition Tests)
  // ===========================================================================
  // Note: MongoDB Memory Server may not always create indexes the same way as
  // production MongoDB. These tests verify the schema index definitions exist.

  describe('Timestamp Indexing (Schema Definition)', () => {
    it('should define timestamp field with index option', () => {
      const schema = Log.schema;
      const timestampPath = schema.path('timestamp');

      // Verify timestamp field exists and has index option
      expect(timestampPath).toBeDefined();
      expect(timestampPath.options.index).toBe(true);
    });

    it('should define requestId field with index and unique options', () => {
      const schema = Log.schema;
      const requestIdPath = schema.path('requestId');

      expect(requestIdPath.options.index).toBe(true);
      expect(requestIdPath.options.unique).toBe(true);
    });

    it('should define statusCode field with index option', () => {
      const schema = Log.schema;
      const statusCodePath = schema.path('statusCode');

      expect(statusCodePath.options.index).toBe(true);
    });

    it('should define userId field with index option', () => {
      const schema = Log.schema;
      const userIdPath = schema.path('userId');

      expect(userIdPath.options.index).toBe(true);
    });

    it('should define eventName field with index option', () => {
      const schema = Log.schema;
      const eventNamePath = schema.path('eventName');

      expect(eventNamePath.options.index).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: LOG RETENTION / TTL (Schema Definition Tests)
  // ===========================================================================
  // Note: TTL indexes are defined in the schema but may not be verified in
  // MongoDB Memory Server. These tests verify the schema structure.

  describe('Log Retention (Schema Definition)', () => {
    it('should have schema indexes defined', () => {
      const schema = Log.schema;
      const indexes = schema.indexes();

      // There should be multiple indexes defined
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have compound indexes defined in schema', () => {
      const schema = Log.schema;
      const indexes = schema.indexes();

      // Check for compound indexes (arrays with objects containing multiple keys)
      const compoundIndexes = indexes.filter(idx =>
        Object.keys(idx[0]).length > 1
      );

      expect(compoundIndexes.length).toBeGreaterThan(0);
    });

    it('should have TTL-enabled timestamp index in schema', () => {
      const schema = Log.schema;
      const indexes = schema.indexes();

      // Find index with expireAfterSeconds
      const ttlIndex = indexes.find(idx =>
        idx[1] && idx[1].expireAfterSeconds !== undefined
      );

      expect(ttlIndex).toBeDefined();
    });

    it('should configure TTL based on LOG_RETENTION_DAYS (default 90 days)', () => {
      const schema = Log.schema;
      const indexes = schema.indexes();

      const ttlIndex = indexes.find(idx =>
        idx[1] && idx[1].expireAfterSeconds !== undefined
      );

      // Default is 90 days = 90 * 24 * 60 * 60 = 7776000 seconds
      const expectedSeconds = 90 * 24 * 60 * 60;
      expect(ttlIndex[1].expireAfterSeconds).toBe(expectedSeconds);
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very long routes', async () => {
      const longRoute = '/api/admin/users/123/settings/preferences/notifications/email';
      const log = await createTestLog({ route: longRoute });

      expect(log.route).toBe(longRoute);
    });

    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        nested: {
          deeply: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
        mixed: [{ a: 1 }, { b: 2 }],
      };
      const log = await createTestLog({ metadata: complexMetadata });

      expect(log.metadata.nested.deeply.value).toBe('test');
      expect(log.metadata.array).toEqual([1, 2, 3]);
    });

    it('should handle CLIENT method for client-side errors', async () => {
      const log = await createTestLog({
        method: 'CLIENT',
        sampleReason: 'client_error',
        route: 'window.error',
        error: {
          category: 'client',
          code: 'UNHANDLED_PROMISE',
          messageSafe: 'Unhandled promise rejection',
        },
      });

      expect(log.method).toBe('CLIENT');
      expect(log.sampleReason).toBe('client_error');
    });

    it('should preserve timestamps for automatic createdAt/updatedAt', async () => {
      const log = await createTestLog();

      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle minimal log entry with only required fields', async () => {
      const log = await Log.create({
        requestId: 'req_minimal_test',
        route: '/api/health',
        method: 'GET',
        statusCode: 200,
        durationMs: 5,
        eventName: 'health.check',
      });

      expect(log.requestId).toBe('req_minimal_test');
      expect(log.sampled).toBe(true);
      expect(log.sampleReason).toBe('random');
    });

    it('should handle log entry with all fields populated', async () => {
      const userId = createTestUserId();
      const log = await Log.create({
        requestId: 'req_full_test',
        timestamp: new Date(),
        route: '/api/notes/123',
        method: 'PUT',
        statusCode: 200,
        durationMs: 250,
        userId,
        userRole: 'premium',
        userEmail: 'user@example.com',
        featureFlags: { betaEnabled: true },
        entityIds: {
          noteId: 'note_123',
          workflowId: 'wf_456',
          runId: 'run_789',
          areaId: 'area_abc',
          targetUserId: 'target_user',
        },
        error: {
          category: null,
          code: null,
          name: null,
          messageSafe: null,
          stack: null,
          context: null,
        },
        clientInfo: {
          ip: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
          origin: 'https://test.com',
        },
        eventName: 'notes.update.success',
        sampled: true,
        sampleReason: 'mutation',
        metadata: { changedFields: ['title', 'content'] },
      });

      expect(log.requestId).toBe('req_full_test');
      expect(log.userId.toString()).toBe(userId.toString());
      expect(log.entityIds.noteId).toBe('note_123');
      expect(log.metadata.changedFields).toEqual(['title', 'content']);
    });
  });
});
