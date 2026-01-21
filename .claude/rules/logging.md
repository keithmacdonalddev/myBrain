---
paths:
  - "myBrain-api/src/routes/**/*.js"
  - "myBrain-api/src/services/**/*.js"
---

# Logging Rules (Wide Events Pattern)

This project uses the "Wide Events" logging pattern from loggingsucks.com. All backend code must follow these rules.

## Core Principle

**One comprehensive log entry per request** containing ALL relevant context. Logs are for debugging and analytics, not just error tracking.

## Required in Route Handlers

### 1. Attach Entity IDs

When a route works with a specific entity, attach its ID for searchability:

```javascript
import { attachEntityId } from '../middleware/requestLogger.js';

// In route handler:
const note = await Note.findById(noteId);
attachEntityId(req, 'noteId', note._id);

// For user-owned resources, also attach userId:
attachEntityId(req, 'userId', note.userId);

// For related entities:
attachEntityId(req, 'projectId', note.projectId);
```

### 2. Set Custom Event Names (for important actions)

For business-critical actions, set a descriptive event name:

```javascript
// In route handler:
req.eventName = 'note.archive.success';
req.eventName = 'payment.checkout.failed';
req.eventName = 'user.subscription.upgraded';
```

### 3. Add Mutation Context (for state changes)

When updating data, capture before/after state:

```javascript
// Before update
const before = { status: task.status, priority: task.priority };

// After update
task.status = 'completed';
await task.save();

// Attach mutation context
req.mutation = {
  before,
  after: { status: task.status, priority: task.priority }
};
```

## Entity ID Naming Convention

Use consistent names across the codebase:

| Entity | ID Name |
|--------|---------|
| Note | `noteId` |
| Task | `taskId` |
| Project | `projectId` |
| Event | `eventId` |
| File | `fileId` |
| Folder | `folderId` |
| Image | `imageId` |
| User (target) | `targetUserId` |
| Connection | `connectionId` |
| Message | `messageId` |
| Conversation | `conversationId` |

## What NOT to Log

- Passwords or tokens (already sanitized by middleware)
- Full file contents
- Large arrays (log count instead)
- PII beyond what's needed for debugging

## Examples

### Good Route Handler

```javascript
router.put('/:id', requireAuth, async (req, res) => {
  const note = await Note.findById(req.params.id);

  // Attach entity IDs for searchability
  attachEntityId(req, 'noteId', note._id);
  attachEntityId(req, 'userId', note.userId);

  // Capture before state
  const before = { title: note.title, archived: note.archived };

  // Update
  note.title = req.body.title;
  await note.save();

  // Capture mutation
  req.mutation = { before, after: { title: note.title, archived: note.archived } };

  // Set event name for analytics
  req.eventName = 'note.update.success';

  res.json(note);
});
```

### Bad Route Handler (Missing Logging)

```javascript
router.put('/:id', requireAuth, async (req, res) => {
  const note = await Note.findById(req.params.id);
  note.title = req.body.title;
  await note.save();
  res.json(note);
  // Missing: entityIds, mutation context, event name
});
```

## Querying Logs

With proper logging, you can query:
- "All requests that touched note X"
- "All failed checkouts for premium users"
- "All mutations by user Y in the last hour"
- "All slow requests to the projects endpoint"

This is only possible if entity IDs and context are consistently attached.
