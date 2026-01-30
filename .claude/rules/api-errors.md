---
paths:
  - "myBrain-api/src/routes/**/*.js"
---

## Quick Reference
- Always use `next(error)` - never send inconsistent error formats directly
- Standard format: `{ error: { message, code, field? } }`
- Set `error.statusCode` and `error.code` before passing to next()
- Always wrap async handlers in try-catch
- Check ownership: 404 if not found, 403 if wrong user
- Never expose internal error details to users in production

---

# API Error Handling Rules

## Core Principle

**Consistent error responses** across all endpoints. Errors should be informative for debugging but safe for users.

## Standard Error Response Format

All errors should return this structure:

```javascript
{
  error: {
    message: "Human-readable message",
    code: "ERROR_CODE",
    field: "fieldName"  // Optional, for validation errors
  }
}
```

## Using the Error Handler

**ALWAYS use next(error)** to pass errors to the centralized error handler:

```javascript
// Good - let error handler format the response
router.get('/:id', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// Bad - inconsistent error format
router.get('/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.status(404).json({ msg: 'not found' }); // Inconsistent!
  }
});
```

## Error Status Codes

Use appropriate HTTP status codes:

| Code | When to Use | Example |
|------|-------------|---------|
| 400 | Invalid input | Missing required field, invalid format |
| 401 | Not authenticated | No token, expired token |
| 403 | Not authorized | User can't access this resource |
| 404 | Not found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, version conflict |
| 422 | Validation failed | Business rule violation |
| 429 | Rate limited | Too many requests |
| 500 | Server error | Unexpected errors, bugs |

## Creating Errors

```javascript
// Helper pattern for consistent errors
function createError(message, statusCode, code, field = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (field) error.field = field;
  return error;
}

// Usage
if (!req.body.title) {
  return next(createError('Title is required', 400, 'VALIDATION_ERROR', 'title'));
}

if (!note) {
  return next(createError('Note not found', 404, 'NOT_FOUND'));
}

if (note.userId.toString() !== req.user._id.toString()) {
  return next(createError('Access denied', 403, 'FORBIDDEN'));
}
```

## Common Error Codes

Use these standard codes:

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource doesn't exist |
| `FORBIDDEN` | User lacks permission |
| `UNAUTHORIZED` | Authentication required |
| `DUPLICATE` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## Validation Errors

For multiple validation errors:

```javascript
const errors = [];
if (!title) errors.push({ field: 'title', message: 'Title is required' });
if (!content) errors.push({ field: 'content', message: 'Content is required' });

if (errors.length > 0) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.details = errors;
  return next(error);
}
```

## Ownership Checks

Standard pattern for checking resource ownership:

```javascript
// Check if user owns the resource
const note = await Note.findById(req.params.id);

if (!note) {
  return next(createError('Note not found', 404, 'NOT_FOUND'));
}

if (note.userId.toString() !== req.user._id.toString()) {
  return next(createError('Access denied', 403, 'FORBIDDEN'));
}
```

## Try-Catch Pattern

**ALWAYS wrap async route handlers** in try-catch:

```javascript
router.post('/', requireAuth, async (req, res, next) => {
  try {
    // ... route logic
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
```

## Don't Expose Internal Errors

Never send raw error messages to users in production:

```javascript
// The error handler should do this, but be careful:

// Bad - exposes internal details
res.status(500).json({ error: err.message, stack: err.stack });

// Good - generic message, details logged server-side
res.status(500).json({
  error: {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId  // For support tickets
  }
});
```

## Attach Error to Request for Logging

When handling errors, attach to request for logging:

```javascript
try {
  // ... route logic
} catch (err) {
  req.error = err;  // Attach for logging middleware
  next(err);
}
```
