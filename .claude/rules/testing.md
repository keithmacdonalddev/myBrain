---
paths:
  - "**/*.test.js"
  - "**/*.test.jsx"
  - "myBrain-api/src/**/*.test.js"
  - "myBrain-web/src/**/*.test.jsx"
---

# Testing Rules

## Core Principle

**Tests should be readable, maintainable, and test behavior, not implementation.**

## Test File Location

Tests live alongside the code they test:

```
components/
  ui/
    Skeleton.jsx
    Skeleton.test.jsx   # Test file next to component
routes/
  notes.js
  notes.test.js         # Test file next to route
```

## Test Structure

Use the **Arrange-Act-Assert** pattern:

```javascript
describe('NotesService', () => {
  describe('createNote', () => {
    it('should create a note with valid data', async () => {
      // Arrange - set up test data
      const noteData = { title: 'Test', content: 'Content' };
      const userId = 'user123';

      // Act - perform the action
      const result = await notesService.createNote(noteData, userId);

      // Assert - verify the outcome
      expect(result.title).toBe('Test');
      expect(result.userId).toBe(userId);
    });

    it('should throw if title is missing', async () => {
      // Arrange
      const noteData = { content: 'Content' };

      // Act & Assert
      await expect(notesService.createNote(noteData, 'user123'))
        .rejects.toThrow('Title is required');
    });
  });
});
```

## Naming Conventions

```javascript
// Describe blocks: noun (what you're testing)
describe('NotesService', () => {
  describe('createNote', () => {
    // It blocks: should + expected behavior
    it('should create a note with valid data', ...);
    it('should throw if title is missing', ...);
    it('should set createdAt timestamp', ...);
  });
});
```

## Frontend Testing (Vitest + React Testing Library)

### Component Tests

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NoteCard from './NoteCard';

describe('NoteCard', () => {
  it('renders note title', () => {
    render(<NoteCard note={{ title: 'My Note', content: '...' }} />);

    expect(screen.getByText('My Note')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<NoteCard note={mockNote} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith(mockNote.id);
  });
});
```

### Query Priority

Use queries in this priority order (most to least preferred):

1. `getByRole` - accessible to everyone
2. `getByLabelText` - form fields
3. `getByPlaceholderText` - form fields without labels
4. `getByText` - non-interactive elements
5. `getByTestId` - last resort

```jsx
// Good - tests accessibility
screen.getByRole('button', { name: /submit/i });

// Okay - for form fields
screen.getByLabelText('Email');

// Avoid if possible
screen.getByTestId('submit-button');
```

## Backend Testing (Jest + Supertest)

### API Route Tests

```javascript
import request from 'supertest';
import app from '../server';
import Note from '../models/Note';

describe('Notes API', () => {
  let authToken;

  beforeAll(async () => {
    // Set up test user and get auth token
    authToken = await getTestAuthToken();
  });

  afterEach(async () => {
    // Clean up test data
    await Note.deleteMany({ title: /^TEST_/ });
  });

  describe('POST /api/notes', () => {
    it('should create a note when authenticated', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'TEST_Note', content: 'Content' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('TEST_Note');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/notes')
        .send({ title: 'TEST_Note', content: 'Content' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Content' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## What to Test

### DO Test:
- Happy path (normal usage)
- Edge cases (empty input, max values)
- Error handling (invalid input, unauthorized)
- User interactions (clicks, form submissions)
- Accessibility (can be used with keyboard)

### DON'T Test:
- Implementation details (internal state, private methods)
- Third-party libraries (they have their own tests)
- Trivial code (simple getters, pass-through functions)

## Mocking

### Mock External Services

```javascript
// Mock the service
vi.mock('../services/emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}));

// In test
import { sendEmail } from '../services/emailService';

it('should send welcome email on signup', async () => {
  await authService.signup({ email: 'test@test.com', password: 'pass' });

  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'test@test.com', template: 'welcome' })
  );
});
```

### Mock Database (if not using test DB)

```javascript
vi.mock('../models/Note', () => ({
  findById: vi.fn(),
  create: vi.fn(),
}));
```

## Test Data

Use factories or fixtures for consistent test data:

```javascript
// testUtils/factories.js
export const createMockNote = (overrides = {}) => ({
  _id: 'note123',
  title: 'Test Note',
  content: 'Test content',
  userId: 'user123',
  createdAt: new Date(),
  ...overrides
});

// In tests
const note = createMockNote({ title: 'Custom Title' });
```

## Running Tests

```bash
# Frontend
cd myBrain-web
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# Backend
cd myBrain-api
npm test              # Run all tests
npm run test:watch    # Watch mode
```
