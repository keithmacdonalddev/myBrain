# Backend API Implementation Review

**Reviewer**: Claude (Senior Backend Engineer Perspective)
**Date**: 2026-01-29
**Scope**: myBrain API - Routes, Models, Services, Error Handling, Security
**Overall Score**: 7.5/10

---

## Executive Summary

The myBrain API demonstrates solid architectural patterns with a clean separation between routes, services, and models. The codebase follows consistent conventions and includes comprehensive audit logging. However, there are opportunities for improvement in error handling consistency, database query optimization, and security hardening.

**Key Strengths:**
- Excellent route documentation with detailed JSDoc comments
- Consistent use of service layer for business logic
- Comprehensive audit logging via `attachEntityId` and `attachError`
- Good ObjectId validation before database queries
- Proper authentication middleware (`requireAuth`) applied globally

**Areas for Improvement:**
- Error handling pattern deviates from documented standards
- Some N+1 query patterns in entity linking
- Missing rate limiting on sensitive endpoints
- Inconsistent authorization checks across routes

---

## Detailed Findings

### Critical Issues

#### C1: Error Handling Deviates from Documented Standards

**Severity**: Critical
**Location**: All route files (notes.js, tasks.js, projects.js, messages.js, connections.js, itemShares.js)

**Issue**: The documented standard in `.claude/rules/api-errors.md` specifies using `next(error)` to pass errors to a centralized error handler. However, all routes return errors directly using `res.status().json()`.

**Current Pattern (Inconsistent)**:
```javascript
// In routes/notes.js, lines 267-274
} catch (error) {
  attachError(req, error, { operation: 'notes_fetch' });
  res.status(500).json({
    error: 'Failed to fetch notes',
    code: 'NOTES_FETCH_ERROR'
  });
}
```

**Documented Standard**:
```javascript
} catch (error) {
  attachError(req, error, { operation: 'notes_fetch' });
  next(error);  // Let centralized handler format response
}
```

**Impact**:
- Inconsistent error response formats across the API
- Error handler middleware features (like requestId, stack trace suppression in production) are bypassed
- Harder to maintain consistent error format

**Recommendation**: Refactor all route error handling to use `next(error)` pattern with the centralized `errorHandler.js` middleware.

---

#### C2: Missing Input Sanitization on Text Search Queries

**Severity**: Critical
**Location**: `messages.js` (lines around search functionality)

**Issue**: The search functionality falls back to regex when text index is unavailable, but doesn't sanitize user input before constructing the regex pattern.

```javascript
// Potential regex injection if user-supplied query is not sanitized
if (filters.search) {
  query.$text = { $search: filters.search };
  // Or fallback to regex without sanitization
}
```

**Impact**: Could allow regex denial-of-service (ReDoS) attacks with specially crafted search strings.

**Recommendation**:
1. Escape special regex characters in user input
2. Set a timeout on regex queries
3. Limit search string length

---

### Major Issues

#### M1: N+1 Query Pattern in Entity Linking

**Severity**: Major
**Location**: `projectService.js` - `getProjectById` with `populateLinks=true`

**Issue**: When populating linked items (notes, tasks, events), each type may result in separate queries, and population patterns could lead to N+1 queries.

```javascript
// Potential N+1 when project has many linked items
const project = await Project.findOne({ _id: projectId, userId })
  .populate('linkedNotes')
  .populate('linkedTasks')
  .populate('linkedEvents');
```

**Impact**: Performance degradation for projects with many linked items.

**Recommendation**:
1. Use aggregation pipeline for complex queries
2. Implement pagination for linked items
3. Consider lazy loading linked items separately

---

#### M2: Blocking Check Missing in Some Social Endpoints

**Severity**: Major
**Location**: `connections.js`, `messages.js`

**Issue**: While `connections.js` consistently checks if users are blocked before operations, some endpoints in `messages.js` might not verify blocking status before allowing message delivery.

**Expected Pattern**:
```javascript
// Check if user is blocked BEFORE any interaction
const isBlocked = await UserBlock.exists({
  $or: [
    { blockerId: req.user._id, blockedId: targetUserId },
    { blockerId: targetUserId, blockedId: req.user._id }
  ]
});
if (isBlocked) {
  return res.status(403).json({ error: 'Cannot interact with this user' });
}
```

**Impact**: Blocked users might still be able to send messages or interact in unexpected ways.

**Recommendation**: Audit all social feature endpoints to ensure consistent blocking checks.

---

#### M3: Password-Protected Share Brute Force Vulnerability

**Severity**: Major
**Location**: `itemShares.js`

**Issue**: The password verification for protected shares doesn't appear to have rate limiting or account lockout after failed attempts.

```javascript
// No rate limiting visible on password verification
router.post('/:token/verify-password', async (req, res) => {
  const { password } = req.body;
  const share = await ItemShare.findOne({ accessToken: token });
  const isValid = await bcrypt.compare(password, share.password);
  // No lockout after failed attempts
});
```

**Impact**: Attackers can brute-force passwords on protected shares.

**Recommendation**:
1. Implement exponential backoff after failed attempts
2. Lock out after 5-10 failed attempts for 15 minutes
3. Log failed password attempts for security monitoring

---

#### M4: Missing Pagination on Backlinks Queries

**Severity**: Major
**Location**: `noteService.js`, `taskService.js` - backlinks methods

**Issue**: The `getNoteBacklinks` and `getTaskBacklinks` methods may return unbounded results for items with many backlinks.

```javascript
// No limit on backlinks query
async getNoteBacklinks(userId, noteId) {
  const tasks = await Task.find({ linkedNoteIds: noteId, userId });
  const projects = await Project.find({ linkedNotes: noteId, userId });
  // No limit - could return thousands of items
}
```

**Impact**: Memory issues and slow responses for heavily-linked items.

**Recommendation**: Add pagination or limit parameters to backlinks queries (default 50, max 100).

---

### Minor Issues

#### m1: Duplicate Import of Mongoose in Routes

**Severity**: Minor
**Location**: `notes.js` (line 230)

**Issue**: Mongoose is imported at the top of the file and also dynamically imported within a function.

```javascript
import mongoose from 'mongoose';  // Line ~111

// Later in the route handler (line 230):
const mongoose = (await import('mongoose')).default;  // Unnecessary
```

**Impact**: Minor code bloat and potential confusion.

**Recommendation**: Remove the dynamic import and use the static import consistently.

---

#### m2: Inconsistent Error Codes

**Severity**: Minor
**Location**: Various route files

**Issue**: Error codes are not consistently named. Some use underscores, some use camelCase, some are generic.

**Examples**:
- `NOTES_FETCH_ERROR` vs `NOTE_CREATE_ERROR` (plural vs singular)
- `INVALID_ID` vs `INVALID_STATUS` (different contexts)
- `NOT_FOUND` vs `TASK_NOT_FOUND` (generic vs specific)

**Recommendation**: Create an error code enum/constants file for consistency:
```javascript
// utils/errorCodes.js
export const ErrorCodes = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL: 'INTERNAL_ERROR',
  // Resource-specific
  NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  // etc.
};
```

---

#### m3: Missing Indexes on Frequently Filtered Fields

**Severity**: Minor
**Location**: Various models

**Issue**: Some frequently-filtered fields may not have indexes.

**Potentially Missing Indexes**:
- `Note.tags` (array index for tag filtering)
- `Task.dueDate` (for date range queries)
- `Project.deadline` (for upcoming/overdue queries)
- `Message.conversationId` + `createdAt` (compound for pagination)

**Recommendation**: Review query patterns in production and add indexes for fields filtered/sorted frequently.

---

#### m4: toSafeJSON Method Not Standardized

**Severity**: Minor
**Location**: All models

**Issue**: The `toSafeJSON()` method is used consistently across routes, which is good. However, the implementation details should be audited to ensure sensitive fields are consistently excluded.

**Fields to always exclude**:
- `__v` (Mongoose version key)
- Password hashes (if any)
- Internal tracking fields
- User emails in shared contexts (privacy)

**Recommendation**: Create a base model mixin or utility that standardizes `toSafeJSON()` implementation.

---

### Suggestions for Improvement

#### S1: Add Request Validation Middleware

**Current**: Each route manually validates request body and params.

**Suggested**: Use a validation library like `joi` or `zod` with middleware:

```javascript
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lifeAreaId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

router.post('/', validate(createNoteSchema), async (req, res, next) => {
  // req.body is now validated and typed
});
```

**Benefits**:
- Consistent validation
- Automatic error messages
- TypeScript-friendly
- Reduces boilerplate in routes

---

#### S2: Implement Soft Delete Consistently

**Current**: Some entities have trash/restore (notes, tasks), others have permanent delete only (projects delete linked items).

**Suggested**: Standardize soft delete across all entities:

```javascript
// Add to all relevant models
const baseSchema = {
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
};

// Query middleware to exclude soft-deleted by default
schema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});
```

---

#### S3: Add Transaction Support for Multi-Document Operations

**Current**: `projectService.archiveProject` example shows transaction usage, but not all multi-document operations use transactions.

**At-Risk Operations**:
- Creating a task and linking it to a project
- Deleting a project and its linked items
- Converting a note to a task

**Recommendation**: Wrap multi-document mutations in transactions:

```javascript
async function convertNoteToTask(userId, noteId, keepNote) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const note = await Note.findOne({ _id: noteId, userId }).session(session);
    const task = await Task.create([{ ...taskData }], { session });

    if (!keepNote) {
      await Note.deleteOne({ _id: noteId }).session(session);
    } else {
      note.linkedTaskId = task[0]._id;
      await note.save({ session });
    }

    await session.commitTransaction();
    return { task: task[0], note: keepNote ? note : null };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

#### S4: Add API Versioning Preparation

**Current**: Routes are at `/api/notes`, `/api/tasks`, etc.

**Suggested**: Prepare for API versioning now:

```javascript
// server.js
app.use('/api/v1/notes', notesRoutes);
app.use('/api/v1/tasks', tasksRoutes);

// Alias current version
app.use('/api/notes', notesRoutes);  // Temporary backward compatibility
```

This makes future breaking changes easier to manage.

---

## Security Analysis

### Authentication: Good

- JWT tokens used consistently
- `requireAuth` middleware applied at router level
- HttpOnly cookies (based on CLAUDE.md)

### Authorization: Needs Improvement

| Check | Implementation | Status |
|-------|---------------|--------|
| Ownership verification | Services check `userId` | OK |
| Admin-only routes | `requireAdmin` middleware | OK |
| Shared item access | Verified in itemShares | OK |
| Comment ownership | Checked in services | OK |
| Cross-user data leak | Generally protected | Review Needed |

**Concern**: The authorization pattern varies between checking ownership in routes vs services. Standardize to always check in services.

### Input Validation: Partial

- ObjectId validation: Consistent (Good)
- Required fields: Checked manually (OK)
- Type coercion: Handled (OK)
- Length limits: Mostly missing (Concern)
- Sanitization: Not comprehensive (Concern)

### Rate Limiting: Missing

No visible rate limiting on:
- Password attempts (itemShares)
- Login attempts (auth routes - need to verify)
- API requests per user
- Expensive operations (search, exports)

---

## Database Operations Review

### Indexing Assessment

**Existing Indexes (from models)**:
- `userId` on most collections (single-tenant queries)
- `status` fields for filtering
- Compound indexes on Connection model

**Recommended Additional Indexes**:
```javascript
// Note.js
noteSchema.index({ userId: 1, status: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ userId: 1, processed: 1 });

// Task.js
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, projectId: 1 });

// Message.js
messageSchema.index({ conversationId: 1, createdAt: -1 });

// ItemShare.js
itemShareSchema.index({ accessToken: 1 }, { unique: true });
```

### Population Patterns

**Current**: Uses Mongoose `.populate()` for relationships.

**Concern**: Deep population can be expensive:
```javascript
// Potentially slow
Project.findById(id)
  .populate('linkedNotes')
  .populate('linkedTasks')
  .populate('linkedEvents')
  .populate('comments.userId', 'name avatar');
```

**Recommendation**: Use lean queries and selective population:
```javascript
// Faster
Project.findById(id)
  .populate('linkedTasks', 'title status dueDate')  // Select only needed fields
  .lean();
```

---

## Code Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| Documentation | 9/10 | Excellent JSDoc comments throughout |
| Consistency | 7/10 | Good patterns but some variance |
| Separation of Concerns | 8/10 | Clean route/service/model split |
| Error Handling | 6/10 | Works but deviates from standards |
| Test Coverage | 5/10 | Tests exist but coverage gaps |
| Security | 7/10 | Good foundation, needs hardening |

---

## Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| High | C1: Fix error handling pattern | Medium | High |
| High | C2: Sanitize search input | Low | High |
| High | M3: Add rate limiting on shares | Medium | High |
| Medium | M1: Fix N+1 queries | Medium | Medium |
| Medium | M2: Audit blocking checks | Low | Medium |
| Medium | M4: Add backlinks pagination | Low | Medium |
| Low | m1-m4: Minor fixes | Low | Low |
| Low | S1-S4: Suggestions | Varies | Medium |

---

## Conclusion

The myBrain API is well-structured with a clear architectural vision. The extensive documentation, consistent logging, and clean service layer separation provide a solid foundation. The main areas requiring attention are:

1. **Error handling standardization** - Align with documented patterns
2. **Security hardening** - Add rate limiting and input sanitization
3. **Query optimization** - Add indexes and fix N+1 patterns
4. **Consistency improvements** - Standardize error codes and authorization patterns

The codebase is maintainable and the patterns are sensible. With the recommended improvements, particularly around error handling and security, this API would be production-ready for scale.

---

**Review Completed**: 2026-01-29
**Next Review Recommended**: After implementing critical and major fixes
