---
paths:
  - "myBrain-api/src/services/**/*.js"
---

# Service Layer Rules

## Core Principle

**Services contain business logic. Routes handle HTTP. Models handle data.**

## Architecture

```
Route (HTTP handling)
  ↓
Service (business logic)
  ↓
Model (database operations)
```

## Service Responsibilities

Services should:
- Contain all business logic
- Be reusable across routes
- Not know about HTTP (req, res)
- Return data or throw errors
- Handle complex operations

Services should NOT:
- Access req or res objects
- Format HTTP responses
- Handle authentication (middleware does this)
- Contain database schema logic (models do this)

## Service Structure

```javascript
// services/noteService.js

import Note from '../models/Note.js';

/**
 * Create a new note
 * @param {Object} noteData - Note content
 * @param {string} userId - Owner's ID
 * @returns {Promise<Note>} Created note
 */
export async function createNote(noteData, userId) {
  const { title, content, tags, lifeAreaId } = noteData;

  // Business logic validations
  if (!title?.trim()) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  // Create the note
  const note = await Note.create({
    title: title.trim(),
    content,
    tags,
    lifeAreaId,
    userId
  });

  return note;
}

/**
 * Get notes for a user with filtering
 */
export async function getNotes(userId, filters = {}) {
  const query = { userId };

  if (filters.lifeAreaId) {
    query.lifeAreaId = filters.lifeAreaId;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const notes = await Note.find(query)
    .sort({ updatedAt: -1 })
    .limit(filters.limit || 50);

  return notes;
}

/**
 * Update a note
 */
export async function updateNote(noteId, userId, updates) {
  const note = await Note.findOne({ _id: noteId, userId });

  if (!note) {
    const error = new Error('Note not found');
    error.statusCode = 404;
    throw error;
  }

  // Apply allowed updates only
  const allowedFields = ['title', 'content', 'tags', 'lifeAreaId', 'archived'];
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      note[field] = updates[field];
    }
  });

  note.updatedAt = new Date();
  await note.save();

  return note;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId, userId) {
  const note = await Note.findOneAndDelete({ _id: noteId, userId });

  if (!note) {
    const error = new Error('Note not found');
    error.statusCode = 404;
    throw error;
  }

  return note;
}
```

## Using Services in Routes

```javascript
// routes/notes.js
import * as noteService from '../services/noteService.js';

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const note = await noteService.createNote(req.body, req.user._id);

    // Logging (route responsibility)
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.create.success';

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});
```

## Error Handling in Services

**Throw errors with status codes:**

```javascript
// Good - error with context
if (!note) {
  const error = new Error('Note not found');
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  throw error;
}

// The route's error handler will format this appropriately
```

## Complex Operations

For operations involving multiple models:

```javascript
/**
 * Archive a project and all its tasks
 */
export async function archiveProject(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // Start a session for transaction (optional but recommended)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Archive project
    project.archived = true;
    project.archivedAt = new Date();
    await project.save({ session });

    // Archive all tasks in project
    await Task.updateMany(
      { projectId, userId },
      { archived: true, archivedAt: new Date() },
      { session }
    );

    await session.commitTransaction();
    return project;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

## Service Naming Conventions

| Operation | Function Name |
|-----------|---------------|
| Create | `createNote`, `createTask` |
| Get one | `getNoteById`, `getTaskById` |
| Get many | `getNotes`, `getTasks`, `getUserTasks` |
| Update | `updateNote`, `updateTask` |
| Delete | `deleteNote`, `deleteTask` |
| Special | `archiveNote`, `shareNote`, `duplicateTask` |

## Reusing Logic

If logic is used in multiple services, extract to utils:

```javascript
// utils/ownership.js
export async function verifyOwnership(Model, resourceId, userId) {
  const resource = await Model.findOne({ _id: resourceId, userId });

  if (!resource) {
    const error = new Error('Resource not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  return resource;
}

// In service
import { verifyOwnership } from '../utils/ownership.js';

const note = await verifyOwnership(Note, noteId, userId);
```

## Testing Services

Services are easy to test because they don't depend on HTTP:

```javascript
describe('noteService', () => {
  describe('createNote', () => {
    it('should create a note with valid data', async () => {
      const note = await noteService.createNote(
        { title: 'Test', content: 'Content' },
        userId
      );

      expect(note.title).toBe('Test');
    });

    it('should throw if title is missing', async () => {
      await expect(
        noteService.createNote({ content: 'Content' }, userId)
      ).rejects.toThrow('Title is required');
    });
  });
});
```
