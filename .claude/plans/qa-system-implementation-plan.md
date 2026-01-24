# Comprehensive QA System Implementation Plan

**Document Version:** 1.0
**Created:** 2024-01-24
**Author:** Claude (AI Assistant)
**Status:** Pending Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Context](#project-context)
3. [Current State Analysis](#current-state-analysis)
4. [Proposed Architecture](#proposed-architecture)
5. [Implementation Details](#implementation-details)
6. [Risk Assessment](#risk-assessment)
7. [Confidence Levels](#confidence-levels)
8. [Open Questions & Concerns](#open-questions--concerns)
9. [Implementation Order](#implementation-order)
10. [Success Criteria](#success-criteria)
11. [Appendix: Full File Contents](#appendix-full-file-contents)

---

## Executive Summary

### Goal

Implement a fully automated Quality Assurance system for the myBrain application that:

1. **Automatically writes tests** when new code is written
2. **Runs comprehensive tests** (unit + E2E) on every Pull Request
3. **Periodically audits** the entire codebase for coverage gaps and improvements
4. **Reviews UI/UX** for consistency, accessibility, and improvement opportunities
5. **Requires zero manual intervention** from the user for routine QA tasks

### Scope

| Component | Description |
|-----------|-------------|
| 3 Agents | Auto-invoked by Claude during development |
| 3 Rules | Standards Claude always follows |
| 2 Skills | Manual override capabilities |
| 1 Config | QA preferences and thresholds |
| 2 CI Workflows | Automated testing on PRs + scheduled audits |
| 1 Reports System | Audit output storage |

### User Impact

**Before:** User must manually invoke testing, remember to write tests, and review code quality.

**After:** User works normally; all QA happens automatically in the background with pass/fail notifications.

---

## Project Context

### Application Overview

**myBrain** is a personal productivity platform built with:

- **Frontend:** React 18, Vite, Redux Toolkit, TanStack Query, TailwindCSS
- **Backend:** Express, Mongoose, JWT authentication, Socket.io
- **Database:** MongoDB Atlas (shared between dev and production)
- **Hosting:** Vercel (frontend), Render (backend)

### Repository Structure

```
myBrain/
├── myBrain-web/                 # React frontend
│   ├── src/
│   │   ├── features/            # 19 feature modules
│   │   ├── components/ui/       # Shared UI components
│   │   ├── store/               # Redux slices
│   │   ├── hooks/               # Custom hooks
│   │   └── test/                # Test utilities
│   ├── vitest.config.js
│   └── package.json
│
├── myBrain-api/                 # Express backend
│   ├── src/
│   │   ├── routes/              # 27 API route files
│   │   ├── models/              # Mongoose models
│   │   ├── services/            # Business logic
│   │   └── test/                # Test utilities
│   ├── jest.config.js
│   └── package.json
│
├── .github/workflows/           # CI/CD
│   └── ci.yml                   # Current CI workflow
│
└── .claude/                     # Claude Code configuration
    ├── skills/                  # 12 existing skills
    ├── rules/                   # 7 existing rules
    └── design/                  # Design system files
```

### User Context

The project owner has no coding experience. Claude handles all development work. The user interacts via natural language commands like "checkpoint" to save work. The QA system must operate transparently without requiring technical knowledge.

---

## Current State Analysis

### Existing Test Infrastructure

#### Frontend Testing (Vitest + React Testing Library)

**Configuration:** `myBrain-web/vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

**Test Setup:** `myBrain-web/src/test/setup.js`
```javascript
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

**Existing Frontend Tests (4 files):**

| File | Coverage |
|------|----------|
| `src/components/ui/Skeleton.test.jsx` | Skeleton component variants |
| `src/components/ui/EmptyState.test.jsx` | Empty state component |
| `src/store/authSlice.test.js` | Auth Redux slice |
| `src/store/toastSlice.test.js` | Toast Redux slice |

#### Backend Testing (Jest + Supertest + MongoDB Memory Server)

**Configuration:** `myBrain-api/jest.config.js`
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/test/**/*.js',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['./src/test/setup.js'],
  testTimeout: 10000,
  verbose: true,
};
```

**Test Setup:** `myBrain-api/src/test/setup.js`
```javascript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// Connect to in-memory database before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect and stop server after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**Existing Backend Tests (2 files):**

| File | Coverage |
|------|----------|
| `src/routes/auth.test.js` | Auth endpoints (register, login, logout, me) |
| `src/routes/notes.test.js` | Notes CRUD operations |

### Current CI Workflow

**File:** `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Frontend tests and build
  frontend:
    name: Frontend Tests & Build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: myBrain-web

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: myBrain-web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint
        continue-on-error: true  # Don't fail on lint warnings for now

      - name: Run tests
        run: npm test -- --run
        env:
          CI: true

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: https://mybrain-api.onrender.com

  # Backend tests
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: myBrain-api

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: myBrain-api/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          CI: true
          NODE_ENV: test
          JWT_SECRET: test-secret-for-ci
```

### Existing Rules

**`.claude/rules/testing.md`** - Already exists with comprehensive testing guidelines including:
- Arrange-Act-Assert pattern
- Naming conventions
- Frontend testing with React Testing Library
- Backend testing with Jest + Supertest
- Mocking strategies
- Query priority for accessibility

### Existing Relevant Skills

**`.claude/skills/smoke-test/SKILL.md`** - Browser-based E2E testing using agent-browser
**`.claude/skills/code-reviewer/SKILL.md`** - Code quality and security review

### Coverage Gap Analysis

#### Backend Routes (27 total, 2 tested = 7% coverage)

| Route File | Has Tests | Priority |
|------------|-----------|----------|
| auth.js | ✅ Yes | - |
| notes.js | ✅ Yes | - |
| tasks.js | ❌ No | HIGH |
| projects.js | ❌ No | HIGH |
| events.js | ❌ No | HIGH |
| users.js | ❌ No | HIGH |
| profile.js | ❌ No | MEDIUM |
| files.js | ❌ No | MEDIUM |
| images.js | ❌ No | MEDIUM |
| folders.js | ❌ No | MEDIUM |
| tags.js | ❌ No | MEDIUM |
| lifeAreas.js | ❌ No | MEDIUM |
| messages.js | ❌ No | MEDIUM |
| connections.js | ❌ No | MEDIUM |
| notifications.js | ❌ No | MEDIUM |
| shares.js | ❌ No | LOW |
| itemShares.js | ❌ No | LOW |
| filters.js | ❌ No | LOW |
| savedLocations.js | ❌ No | LOW |
| weather.js | ❌ No | LOW |
| dashboard.js | ❌ No | LOW |
| settings.js | ❌ No | LOW |
| analytics.js | ❌ No | LOW |
| admin.js | ❌ No | LOW |
| reports.js | ❌ No | LOW |
| logs.js | ❌ No | LOW |
| apiKeys.js | ❌ No | LOW |

#### Frontend Features (19 total, minimal component testing)

| Feature | Has Tests | Priority |
|---------|-----------|----------|
| auth | Partial (slice only) | HIGH |
| dashboard | ❌ No | HIGH |
| tasks | ❌ No | HIGH |
| notes | ❌ No | HIGH |
| projects | ❌ No | HIGH |
| calendar | ❌ No | MEDIUM |
| files | ❌ No | MEDIUM |
| images | ❌ No | MEDIUM |
| messages | ❌ No | MEDIUM |
| notifications | ❌ No | MEDIUM |
| profile | ❌ No | MEDIUM |
| settings | ❌ No | MEDIUM |
| social | ❌ No | LOW |
| admin | ❌ No | LOW |
| fitness | ❌ No | LOW |
| inbox | ❌ No | LOW |
| kb | ❌ No | LOW |
| lifeAreas | ❌ No | LOW |
| today | ❌ No | LOW |

---

## Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QA SYSTEM ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 1: DURING DEVELOPMENT                       │    │
│  │                         (Claude Agents)                              │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │ test-writer  │  │code-reviewer │  │ ui-reviewer  │               │    │
│  │  │              │  │              │  │              │               │    │
│  │  │ Auto-writes  │  │ Checks for   │  │ Checks UI    │               │    │
│  │  │ unit + E2E   │  │ bugs,security│  │ consistency  │               │    │
│  │  │ tests for    │  │ performance  │  │ accessibility│               │    │
│  │  │ new code     │  │ best practice│  │ improvements │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  │                                                                      │    │
│  │  Governed by: .claude/rules/testing-standards.md                    │    │
│  │               .claude/rules/code-quality.md                          │    │
│  │               .claude/rules/ui-standards.md                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 2: ON EVERY PULL REQUEST                    │    │
│  │                         (GitHub Actions CI)                          │    │
│  │                                                                      │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │    │
│  │  │ Unit Tests │ │ E2E Tests  │ │  Coverage  │ │   Build    │        │    │
│  │  │ (Vitest/   │ │ (Playwright│ │   Check    │ │   Check    │        │    │
│  │  │  Jest)     │ │  headless) │ │  (≥70%)    │ │            │        │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘        │    │
│  │                                                                      │    │
│  │  PR blocked if any check fails                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 3: SCHEDULED AUDITS                         │    │
│  │                    (GitHub Actions Scheduled)                        │    │
│  │                                                                      │    │
│  │  Weekly:                          Monthly:                           │    │
│  │  ┌────────────────────┐           ┌────────────────────┐            │    │
│  │  │ Coverage Audit     │           │ Full Code Audit    │            │    │
│  │  │ - Find untested    │           │ - Code quality     │            │    │
│  │  │   code             │           │ - Performance      │            │    │
│  │  │ - Generate tests   │           │ - Security scan    │            │    │
│  │  │ - Create PR        │           │ - UI/UX review     │            │    │
│  │  └────────────────────┘           └────────────────────┘            │    │
│  │                                                                      │    │
│  │  Output: .claude/reports/YYYY-MM-DD-audit.md                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 4: MANUAL OVERRIDES                         │    │
│  │                         (Claude Skills)                              │    │
│  │                                                                      │    │
│  │  /qa-status  - "How's our test coverage? Any issues?"               │    │
│  │  /audit-now  - "Run a full audit right now"                         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CONFIGURATION                                     │    │
│  │                                                                      │    │
│  │  .claude/config/qa-config.md                                        │    │
│  │  - Coverage thresholds                                              │    │
│  │  - E2E test pages                                                   │    │
│  │  - Audit schedules                                                  │    │
│  │  - Notification preferences                                         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Agents (3 new files in `.claude/agents/`)

| Agent | Trigger | Responsibility |
|-------|---------|----------------|
| `test-writer.md` | After Claude writes/modifies code | Write corresponding unit and E2E tests |
| `code-reviewer.md` | After Claude writes/modifies code | Review for bugs, security, performance |
| `ui-reviewer.md` | After Claude touches UI code | Check design consistency, accessibility |

#### Rules (3 new files in `.claude/rules/`)

| Rule | Purpose |
|------|---------|
| `qa-standards.md` | Overarching QA requirements Claude must follow |
| `code-quality.md` | Code quality standards to enforce |
| `ui-standards.md` | UI/UX standards to enforce |

#### Skills (2 new folders in `.claude/skills/`)

| Skill | Usage |
|-------|-------|
| `/qa-status` | On-demand coverage and quality report |
| `/audit-now` | Trigger full audit without waiting for schedule |

#### CI Workflows (2 files in `.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` (update) | Push/PR to main | Add E2E tests and coverage gates |
| `weekly-audit.yml` (new) | Scheduled (weekly) | Run comprehensive audit, create report |

#### Configuration (1 new file)

| File | Purpose |
|------|---------|
| `.claude/config/qa-config.md` | Thresholds, preferences, test targets |

---

## Implementation Details

### 1. New Agent: test-writer.md

**File:** `.claude/agents/test-writer.md`

```markdown
---
name: test-writer
description: Automatically writes tests for new code
trigger: after-code-change
---

# Test Writer Agent

You are an automated test writer. After Claude writes or modifies code, you analyze the changes and write corresponding tests.

## When to Activate

Activate when Claude has:
- Created a new file (component, route, service, hook, utility)
- Modified existing functionality
- Added new functions or methods
- Changed API endpoints

Do NOT activate for:
- Documentation changes only
- Configuration file changes
- Style-only changes (CSS, formatting)
- Test file changes

## Process

### 1. Analyze the Change

Look at what was created/modified:
- What type of file? (component, route, service, hook, utility)
- What functions/methods were added or changed?
- What are the inputs and outputs?
- What edge cases exist?

### 2. Determine Test Type Needed

| Change Type | Test Type | Framework |
|-------------|-----------|-----------|
| React component | Component test | Vitest + RTL |
| Redux slice | Unit test | Vitest |
| Custom hook | Hook test | Vitest + RTL |
| API route | Integration test | Jest + Supertest |
| Service function | Unit test | Jest |
| Utility function | Unit test | Vitest or Jest |

### 3. Write Tests

Follow the patterns in `.claude/rules/testing.md`:

**For React Components:**
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    render(<ComponentName />);
    // Assert on rendered output
  });

  it('handles user interaction', () => {
    const onAction = vi.fn();
    render(<ComponentName onAction={onAction} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });

  it('displays error state', () => {
    render(<ComponentName error="Something went wrong" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

**For API Routes:**
```javascript
import request from 'supertest';
import app from '../test/testApp.js';

describe('Resource API', () => {
  describe('POST /api/resource', () => {
    it('creates resource when authenticated', async () => {
      const res = await request(app)
        .post('/api/resource')
        .set('Cookie', authCookie)
        .send({ name: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/resource')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/resource')
        .set('Cookie', authCookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
```

### 4. Test Coverage Requirements

For new code, aim for:
- **Happy path**: Normal successful usage
- **Error handling**: Invalid inputs, missing data
- **Edge cases**: Empty arrays, null values, boundaries
- **Authentication**: Protected routes return 401/403 appropriately
- **Authorization**: Users can only access their own resources

### 5. Place Tests Correctly

Tests go next to the code they test:
```
ComponentName.jsx
ComponentName.test.jsx  # <-- Same folder

routes/
  tasks.js
  tasks.test.js         # <-- Same folder
```

### 6. Run Tests

After writing tests, run them to verify they pass:
```bash
# Frontend
cd myBrain-web && npm test -- --run

# Backend
cd myBrain-api && npm test
```

### 7. Report

Tell the user (briefly):
- "Added tests for [component/route name]"
- Number of test cases
- Any edge cases that need manual verification

## E2E Test Considerations

For user-facing features, also consider if an E2E test is needed:
- New pages or routes → Add to E2E test list
- Critical user flows (login, create task, etc.) → E2E test required
- UI state changes → Screenshot comparison recommended

Note E2E tests in `.claude/config/qa-config.md` for the CI to pick up.
```

### 2. New Agent: code-reviewer.md

**File:** `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Automatically reviews code for quality, security, and best practices
trigger: after-code-change
---

# Code Reviewer Agent

You are an automated code reviewer. After Claude writes or modifies code, you review it for issues.

## When to Activate

Activate on any code change (not just tests or docs).

## Review Checklist

### Security (CRITICAL)
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] Input validation on all user inputs
- [ ] Proper authentication checks (requireAuth middleware)
- [ ] Authorization checks (user owns resource)
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] XSS prevention (sanitized HTML output)
- [ ] CSRF protection on state-changing operations

### Error Handling
- [ ] Try-catch blocks around async operations
- [ ] Errors passed to error handler (next(error))
- [ ] User-friendly error messages
- [ ] Sensitive info not exposed in errors

### Performance
- [ ] No N+1 queries (fetching in loops)
- [ ] Proper indexing considered for queries
- [ ] Large lists paginated
- [ ] No memory leaks (cleanup in useEffect)
- [ ] Expensive operations memoized

### Code Quality
- [ ] Functions do one thing
- [ ] Clear naming (variables, functions)
- [ ] No code duplication (DRY)
- [ ] Reasonable function length (<50 lines)
- [ ] No console.log in production code

### React Specific
- [ ] Keys on list items
- [ ] useEffect dependencies correct
- [ ] No state updates on unmounted components
- [ ] Props destructured and typed
- [ ] Loading and error states handled

### API Specific
- [ ] Proper HTTP status codes
- [ ] Consistent response format
- [ ] Rate limiting on sensitive endpoints
- [ ] Request logging for audit trail

## Output Format

If issues found, report by severity:

**CRITICAL (must fix before merge):**
- Security vulnerabilities
- Data loss risks
- Authentication/authorization bypasses

**WARNING (should fix):**
- Performance issues
- Missing error handling
- Code quality concerns

**SUGGESTION (consider improving):**
- Readability improvements
- Potential refactoring
- Best practice recommendations

If no issues: "Code review passed. No issues found."

## Auto-Fix

For simple issues (missing try-catch, console.log removal), fix them automatically and note the fix.

For complex issues, describe the problem and suggest a solution.
```

### 3. New Agent: ui-reviewer.md

**File:** `.claude/agents/ui-reviewer.md`

```markdown
---
name: ui-reviewer
description: Automatically reviews UI code for design consistency and accessibility
trigger: after-ui-change
---

# UI Reviewer Agent

You are an automated UI/UX reviewer. After Claude modifies UI code, you review it for consistency and accessibility.

## When to Activate

Activate when Claude modifies:
- React components (`.jsx` files in `components/` or `features/`)
- CSS/style files
- Layout components

## Review Checklist

### Design System Compliance

Reference: `.claude/design/design-system.md`

- [ ] Colors from design system palette
- [ ] Spacing using standard scale (4, 8, 12, 16, 24, 32, 48, 64)
- [ ] Typography using defined font sizes
- [ ] Border radius consistent (default: 8px)
- [ ] Shadows using defined values
- [ ] Icons from Lucide React

### Component Patterns

- [ ] Using existing UI components where available
  - BaseModal for modals
  - ConfirmDialog for confirmations
  - Skeleton for loading states
  - EmptyState for empty views
  - ToastContainer for notifications
- [ ] Consistent button styles (primary, secondary, ghost)
- [ ] Form inputs using standard styling
- [ ] Cards with consistent padding and borders

### Accessibility

- [ ] Interactive elements have accessible names
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] Alt text on images
- [ ] Form labels associated with inputs
- [ ] Error messages linked to inputs

### Responsive Design

- [ ] Works at mobile (375px)
- [ ] Works at tablet (768px)
- [ ] Works at desktop (1280px)
- [ ] No horizontal scrolling
- [ ] Touch targets minimum 44x44px on mobile

### User Experience

- [ ] Loading states shown during async operations
- [ ] Error states informative and actionable
- [ ] Empty states guide user to action
- [ ] Feedback on user actions (toasts, visual changes)
- [ ] No layout shift on content load

## Output Format

**INCONSISTENCY (fix before merge):**
- Design system violations
- Accessibility failures (WCAG)

**IMPROVEMENT (consider):**
- UX enhancements
- Responsive tweaks
- Consistency suggestions

**SCREENSHOT RECOMMENDED:**
- If significant UI change, recommend taking screenshot

## Auto-Fix

For simple issues (wrong color, missing class), fix automatically.

For complex issues (layout problems, accessibility), describe and suggest.
```

### 4. New Rule: qa-standards.md

**File:** `.claude/rules/qa-standards.md`

```markdown
---
paths:
  - "**/*"
---

# QA Standards

## Core Principle

**All code changes must be tested before merging.** This rule applies to every PR.

## Automatic Test Requirements

When Claude writes code, the test-writer agent MUST create tests covering:

### For New Features
1. Happy path (feature works as expected)
2. Error cases (invalid input, failures)
3. Edge cases (empty data, boundaries)
4. Authentication/authorization (if applicable)

### For Bug Fixes
1. Test that reproduces the bug (fails before fix)
2. Test that verifies the fix (passes after fix)
3. Related edge cases that might have similar issues

### For Refactoring
1. Existing tests still pass
2. No new functionality = no new tests needed
3. If tests were missing, add them

## Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Overall project | 60% | 80% |
| New code in PR | 80% | 95% |
| Critical paths (auth, payments) | 90% | 100% |

## E2E Test Requirements

The following user flows MUST have E2E tests:

1. **Authentication**
   - Login with valid credentials
   - Login with invalid credentials
   - Logout
   - Session persistence

2. **Core Features**
   - Create, view, edit, delete task
   - Create, view, edit, delete note
   - Create, view, edit, delete project
   - Create, view, edit, delete event

3. **Critical Paths**
   - Dashboard loads without errors
   - Navigation between main sections
   - File upload (if applicable)

## Code Review Requirements

Every code change MUST pass review for:
- Security (no vulnerabilities)
- Error handling (graceful failures)
- Performance (no obvious bottlenecks)
- Code quality (readable, maintainable)

## UI Review Requirements

Every UI change MUST pass review for:
- Design system compliance
- Accessibility (WCAG AA)
- Responsive design (mobile, tablet, desktop)
- User experience (loading, error, empty states)

## Exceptions

Tests may be skipped ONLY for:
- Configuration files (env, config.js)
- Pure documentation
- Generated files
- Third-party code

Document any exception with: `// No test needed: [reason]`
```

### 5. New Rule: code-quality.md

**File:** `.claude/rules/code-quality.md`

```markdown
---
paths:
  - "myBrain-api/src/**/*.js"
  - "myBrain-web/src/**/*.js"
  - "myBrain-web/src/**/*.jsx"
---

# Code Quality Standards

## Core Principle

**Code should be simple, readable, and maintainable.** Prefer clarity over cleverness.

## Naming Conventions

### Variables and Functions
```javascript
// Good - descriptive, clear intent
const userTasks = await fetchTasksForUser(userId);
const isTaskOverdue = dueDate < new Date();
function calculateTotalPrice(items, discount) { }

// Bad - vague, single letters, abbreviations
const x = await fetch(id);
const flag = d < new Date();
function calc(i, d) { }
```

### Components
```javascript
// Good - PascalCase, describes what it renders
function TaskCard({ task, onComplete }) { }
function UserProfileHeader({ user }) { }

// Bad
function card({ data }) { }
function Header1() { }
```

### Constants
```javascript
// Good - SCREAMING_SNAKE_CASE for true constants
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const API_ENDPOINTS = { USERS: '/api/users' };

// Bad
const maxfilesize = 10485760;
```

## Function Guidelines

### Single Responsibility
```javascript
// Good - one function, one job
async function fetchUserTasks(userId) {
  return Task.find({ userId }).sort({ dueDate: 1 });
}

function formatTaskForDisplay(task) {
  return {
    ...task,
    dueDateFormatted: formatDate(task.dueDate),
    isOverdue: task.dueDate < new Date()
  };
}

// Bad - doing too much
async function getAndFormatTasks(userId) {
  const tasks = await Task.find({ userId });
  return tasks.map(t => ({
    ...t,
    formatted: formatDate(t.dueDate),
    overdue: t.dueDate < new Date()
  }));
}
```

### Keep Functions Short
- Target: Under 30 lines
- Maximum: 50 lines
- If longer, extract helper functions

### Pure Functions When Possible
```javascript
// Good - pure, predictable, testable
function calculateDiscount(price, discountPercent) {
  return price * (1 - discountPercent / 100);
}

// Avoid - side effects make testing hard
function applyDiscount(order) {
  order.total = order.subtotal * 0.9;  // Mutates input
  sendDiscountEmail(order.user);        // Side effect
}
```

## Error Handling

### Always Handle Async Errors
```javascript
// Good
async function fetchUser(id) {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw error;
  }
}

// Bad - unhandled promise rejection
async function fetchUser(id) {
  return User.findById(id);
}
```

### Fail Fast
```javascript
// Good - check preconditions early
function processOrder(order) {
  if (!order) throw new Error('Order is required');
  if (!order.items?.length) throw new Error('Order must have items');

  // Main logic here
}

// Bad - buried null check
function processOrder(order) {
  // ... lots of code ...
  if (order && order.items) {
    // finally do something
  }
}
```

## Avoid Code Duplication (DRY)

If code appears 2+ times, extract it:

```javascript
// Bad - duplicated validation
router.post('/tasks', (req, res) => {
  if (!req.body.title || req.body.title.length > 200) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  // ...
});

router.put('/tasks/:id', (req, res) => {
  if (!req.body.title || req.body.title.length > 200) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  // ...
});

// Good - extracted
function validateTaskTitle(title) {
  if (!title || title.length > 200) {
    throw new ValidationError('Title must be 1-200 characters');
  }
}

router.post('/tasks', (req, res) => {
  validateTaskTitle(req.body.title);
  // ...
});
```

## Performance Guidelines

### Avoid N+1 Queries
```javascript
// Bad - N+1 query
const projects = await Project.find({ userId });
for (const project of projects) {
  project.tasks = await Task.find({ projectId: project._id });
}

// Good - single query with populate or aggregation
const projects = await Project.find({ userId }).populate('tasks');
// or
const projects = await Project.aggregate([
  { $match: { userId } },
  { $lookup: { from: 'tasks', localField: '_id', foreignField: 'projectId', as: 'tasks' } }
]);
```

### Paginate Large Lists
```javascript
// Good
const page = parseInt(req.query.page) || 1;
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
const skip = (page - 1) * limit;

const tasks = await Task.find({ userId })
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });
```

### Memoize Expensive Computations
```javascript
// Good - React memoization
const expensiveResult = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Comments

### When to Comment
```javascript
// Good - explains WHY, not WHAT
// Using 7 days because users reported confusion with shorter sessions
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

// Good - explains complex algorithm
// Binary search for O(log n) lookup in sorted array
function findInsertPosition(sortedArray, value) { }

// Bad - explains obvious WHAT
// Loop through users
for (const user of users) { }

// Bad - outdated comment
// Returns the user's name
function getUserEmail() { }  // Comment lies!
```

## Imports

### Order Imports
```javascript
// 1. External packages
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

// 3. Relative imports
import { useTaskActions } from './hooks';
import './TaskList.css';
```

## File Organization

### Co-locate Related Code
```
features/
  tasks/
    components/
      TaskCard.jsx
      TaskCard.test.jsx      # Test next to component
      TaskList.jsx
      TaskList.test.jsx
    hooks/
      useTasks.js
      useTasks.test.js
    pages/
      TasksPage.jsx
    index.js                  # Public exports
```
```

### 6. New Rule: ui-standards.md

**File:** `.claude/rules/ui-standards.md`

```markdown
---
paths:
  - "myBrain-web/src/components/**/*.jsx"
  - "myBrain-web/src/features/**/*.jsx"
  - "myBrain-web/src/styles/**/*.css"
---

# UI/UX Standards

## Core Principle

**Consistency, accessibility, and user delight.** Every UI element should feel part of the same application.

## Design System Reference

Always check `.claude/design/design-system.md` for:
- Color palette
- Typography scale
- Spacing system
- Component patterns

## Color Usage

### Semantic Colors
```jsx
// Good - semantic color usage
<div className="bg-surface text-primary">
<button className="bg-accent text-white">
<span className="text-error">Error message</span>
<span className="text-muted">Secondary info</span>

// Bad - hardcoded colors
<div style={{ background: '#1a1a2e', color: '#ffffff' }}>
<span className="text-[#ff0000]">
```

### Dark Mode
All colors must work in both light and dark mode. Use CSS variables:
```css
.card {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
```

## Spacing

Use the spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 (in pixels)

```jsx
// Good - consistent spacing
<div className="p-4 mb-6 gap-4">  // 16px, 24px, 16px
<div className="px-6 py-4">       // 24px horizontal, 16px vertical

// Bad - arbitrary values
<div className="p-[13px] mb-[22px]">
<div style={{ padding: '15px' }}>
```

## Typography

Use defined text sizes:
```jsx
// Good
<h1 className="text-2xl font-semibold">Page Title</h1>
<h2 className="text-xl font-medium">Section Title</h2>
<p className="text-base text-secondary">Body text</p>
<span className="text-sm text-muted">Caption</span>

// Bad - inconsistent sizing
<h1 style={{ fontSize: '26px' }}>
<p className="text-[15px]">
```

## Component Patterns

### Buttons
```jsx
// Primary action
<button className="btn btn-primary">Save</button>

// Secondary action
<button className="btn btn-secondary">Cancel</button>

// Destructive action
<button className="btn btn-danger">Delete</button>

// Ghost/subtle action
<button className="btn btn-ghost">More options</button>
```

### Cards
```jsx
<div className="bg-surface rounded-lg border border-default p-4 shadow-sm">
  {/* Card content */}
</div>
```

### Form Inputs
```jsx
<label className="block text-sm font-medium mb-1">
  Email
</label>
<input
  type="email"
  className="input w-full"
  placeholder="you@example.com"
/>
<p className="text-sm text-error mt-1">
  {error}
</p>
```

### Modals
Always use `BaseModal` component:
```jsx
import BaseModal from '@/components/ui/BaseModal';

<BaseModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
>
  {/* Modal content */}
</BaseModal>
```

## Loading States

Always show loading feedback:
```jsx
// Good - skeleton while loading
if (isLoading) {
  return <Skeleton.Card />;
}

// Good - button loading state
<button disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</button>

// Bad - no loading indication
if (isLoading) return null;
```

## Error States

Always handle errors gracefully:
```jsx
// Good - informative error
if (error) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={error.message}
      action={<button onClick={refetch}>Try again</button>}
    />
  );
}

// Bad - generic or no error handling
if (error) return <p>Error</p>;
```

## Empty States

Guide users when there's no data:
```jsx
// Good - actionable empty state
<EmptyState
  icon={FileText}
  title="No notes yet"
  description="Create your first note to get started"
  action={
    <button onClick={createNote} className="btn btn-primary">
      Create Note
    </button>
  }
/>

// Bad - just text
<p>No notes</p>
```

## Accessibility Requirements

### Interactive Elements
```jsx
// Good - accessible button
<button
  aria-label="Delete task"
  onClick={handleDelete}
>
  <TrashIcon />
</button>

// Good - accessible link
<a href="/tasks" aria-current={isActive ? 'page' : undefined}>
  Tasks
</a>

// Bad - no accessible name
<button onClick={handleDelete}>
  <TrashIcon />
</button>
```

### Forms
```jsx
// Good - label associated with input
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-describedby="email-error" />
<p id="email-error" role="alert">{error}</p>

// Bad - no label association
<label>Email</label>
<input type="email" />
```

### Focus Management
```jsx
// Good - visible focus state
<button className="focus:ring-2 focus:ring-accent focus:outline-none">

// Good - focus trap in modal
<BaseModal>
  {/* Focus automatically trapped */}
</BaseModal>
```

## Responsive Design

### Breakpoints
```jsx
// Mobile first approach
<div className="p-4 md:p-6 lg:p-8">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<nav className="hidden md:flex">  // Hide on mobile
```

### Touch Targets
Minimum 44x44px on mobile:
```jsx
// Good - adequate touch target
<button className="p-3 min-h-[44px] min-w-[44px]">

// Bad - too small
<button className="p-1">
```

## Animation

Use subtle, purposeful animation:
```jsx
// Good - subtle transition
<div className="transition-colors duration-150 hover:bg-surface-hover">

// Good - meaningful animation
<div className="animate-fade-in">  // Content appearing

// Bad - excessive animation
<div className="animate-bounce animate-pulse">
```

## Icons

Use Lucide React icons consistently:
```jsx
import { Plus, Trash2, Edit, Check } from 'lucide-react';

// Consistent sizing
<Plus className="w-4 h-4" />      // Small
<Plus className="w-5 h-5" />      // Default
<Plus className="w-6 h-6" />      // Large
```
```

### 7. New Skill: qa-status

**File:** `.claude/skills/qa-status/SKILL.md`

```markdown
---
name: qa-status
description: Get current test coverage and code quality status on-demand
---

# QA Status Skill

You are a QA reporter providing a snapshot of the project's quality metrics.

## Your Task

Generate a comprehensive QA status report showing:
1. Test coverage metrics
2. Test pass/fail status
3. Code quality indicators
4. Recent audit findings

## Process

### 1. Run Coverage Reports

**Frontend:**
```bash
cd myBrain-web && npm run test:coverage -- --run 2>&1 | tail -30
```

**Backend:**
```bash
cd myBrain-api && npm run test:coverage 2>&1 | tail -30
```

### 2. Count Test Files

```bash
# Frontend tests
find myBrain-web/src -name "*.test.js" -o -name "*.test.jsx" | wc -l

# Backend tests
find myBrain-api/src -name "*.test.js" | wc -l
```

### 3. Check for Untested Files

```bash
# Routes without tests
for f in myBrain-api/src/routes/*.js; do
  base=$(basename "$f" .js)
  if [[ "$base" != *.test ]] && [[ ! -f "${f%.js}.test.js" ]]; then
    echo "No test: $base"
  fi
done
```

### 4. Check Recent CI Status

```bash
gh run list --limit 5
```

### 5. Read Latest Audit Report (if exists)

```bash
ls -la .claude/reports/*.md 2>/dev/null | tail -5
```

### 6. Generate Report

Format:
```
QA Status Report
================
Generated: [date]

## Test Coverage

| Area | Coverage | Status |
|------|----------|--------|
| Frontend | XX% | [OK/NEEDS WORK] |
| Backend | XX% | [OK/NEEDS WORK] |

## Test Counts

- Frontend: X test files, Y test cases
- Backend: X test files, Y test cases

## Untested Areas (Priority)

HIGH:
- [ ] tasks.js route
- [ ] projects.js route

MEDIUM:
- [ ] files.js route
- [ ] images.js route

## Recent CI Runs

| Run | Status | Date |
|-----|--------|------|
| #123 | Passed | Jan 24 |
| #122 | Failed | Jan 23 |

## Recommendations

1. [Most impactful improvement]
2. [Second priority]
3. [Third priority]
```

## If Coverage Command Fails

Report that coverage tooling may need setup and provide manual file counts instead.
```

### 8. New Skill: audit-now

**File:** `.claude/skills/audit-now/SKILL.md`

```markdown
---
name: audit-now
description: Run a comprehensive QA audit immediately without waiting for scheduled run
---

# Audit Now Skill

You are a QA auditor performing a comprehensive review of the codebase.

## Your Task

Perform a full audit covering:
1. Test coverage gaps
2. Code quality issues
3. Security concerns
4. UI/UX inconsistencies
5. Performance opportunities

## Process

### 1. Coverage Audit

**Find untested backend routes:**
```bash
cd myBrain-api/src/routes
for f in *.js; do
  if [[ "$f" != *.test.js ]]; then
    test_file="${f%.js}.test.js"
    if [[ ! -f "$test_file" ]]; then
      echo "UNTESTED: $f"
    fi
  fi
done
```

**Find untested frontend components:**
```bash
cd myBrain-web/src
find components features -name "*.jsx" | while read f; do
  test_file="${f%.jsx}.test.jsx"
  if [[ ! -f "$test_file" ]]; then
    echo "UNTESTED: $f"
  fi
done | head -20
```

### 2. Code Quality Scan

**Check for console.logs:**
```bash
grep -r "console.log" myBrain-api/src --include="*.js" | grep -v test | head -10
grep -r "console.log" myBrain-web/src --include="*.js" --include="*.jsx" | grep -v test | head -10
```

**Check for TODO comments:**
```bash
grep -r "TODO\|FIXME\|HACK" myBrain-*/src --include="*.js" --include="*.jsx" | head -10
```

**Check for large files:**
```bash
find myBrain-*/src -name "*.js" -o -name "*.jsx" | xargs wc -l | sort -rn | head -10
```

### 3. Security Scan

**Check for potential secrets:**
```bash
grep -rE "(password|secret|api_key|apikey|token).*=.*['\"]" myBrain-*/src --include="*.js" | grep -v test | head -5
```

**Check auth middleware usage:**
```bash
grep -L "requireAuth" myBrain-api/src/routes/*.js | grep -v auth.js | grep -v test
```

### 4. UI Consistency Check

**Check for hardcoded colors:**
```bash
grep -rE "#[0-9a-fA-F]{3,6}" myBrain-web/src --include="*.jsx" --include="*.css" | grep -v node_modules | head -10
```

**Check for inline styles:**
```bash
grep -r "style={{" myBrain-web/src --include="*.jsx" | wc -l
```

### 5. Generate Audit Report

Create report at `.claude/reports/[DATE]-audit.md`:

```markdown
# QA Audit Report

**Date:** [date]
**Type:** Manual Audit

## Summary

| Category | Issues Found | Severity |
|----------|--------------|----------|
| Test Coverage | X | HIGH |
| Code Quality | X | MEDIUM |
| Security | X | [varies] |
| UI Consistency | X | LOW |

## Test Coverage Gaps

### Backend Routes (Untested)
| Route | Priority | Estimated Tests |
|-------|----------|-----------------|
| tasks.js | HIGH | 15-20 |
| projects.js | HIGH | 15-20 |
| ... | ... | ... |

### Frontend Components (Untested)
[List top 10 by priority]

## Code Quality Issues

### Console.logs in Production Code
[List files with line numbers]

### TODOs/FIXMEs
[List with context]

### Large Files (>300 lines)
[List with line counts]

## Security Concerns

[Any findings or "No issues found"]

## UI Inconsistencies

[Any findings or "No issues found"]

## Recommendations

### Immediate (This Week)
1. [Action item]
2. [Action item]

### Short-term (This Month)
1. [Action item]
2. [Action item]

### Long-term
1. [Action item]
```

### 6. Offer Next Steps

After audit, ask user:
- "Want me to start writing tests for [highest priority item]?"
- "Should I fix the [specific issue] now?"
```

### 9. Configuration: qa-config.md

**File:** `.claude/config/qa-config.md`

```markdown
# QA Configuration

This file configures the automated QA system behavior.

## Coverage Thresholds

```yaml
coverage:
  # Minimum acceptable coverage (PR warning if below)
  minimum:
    overall: 60
    new_code: 80

  # Target coverage (goal to work toward)
  target:
    overall: 80
    new_code: 95

  # Block PR if coverage drops below this
  blocking: 50
```

## E2E Test Configuration

```yaml
e2e:
  # Pages that must have E2E tests
  required_pages:
    - /login
    - /app (dashboard)
    - /app/tasks
    - /app/notes
    - /app/projects

  # User flows that must have E2E tests
  required_flows:
    - login_success
    - login_failure
    - logout
    - create_task
    - complete_task
    - create_note
    - create_project

  # Test account credentials (reference only, actual in credentials.json)
  test_accounts:
    regular_user: claude-test-user@mybrain.test
    admin_user: claude-test-admin@mybrain.test
```

## Audit Schedule

```yaml
audits:
  # Weekly audit (coverage focus)
  weekly:
    enabled: true
    day: sunday
    focus:
      - coverage_gaps
      - new_untested_code
    auto_create_tests: true
    create_pr: true

  # Monthly audit (comprehensive)
  monthly:
    enabled: true
    day: 1  # First of month
    focus:
      - full_coverage_audit
      - code_quality
      - security_scan
      - ui_consistency
      - performance_review
    create_report: true
    create_pr: true
```

## Notification Preferences

```yaml
notifications:
  # What to report to user
  show:
    - ci_results
    - audit_summaries
    - coverage_changes

  # What to do silently
  silent:
    - routine_test_writing
    - minor_code_fixes

  # When to alert (interrupt user)
  alert:
    - security_issues
    - ci_failures
    - coverage_drop_significant  # >5% drop
```

## Agent Behavior

```yaml
agents:
  test_writer:
    # Auto-run after any code change
    auto_run: true
    # Create tests for files changed in current PR
    scope: changed_files
    # Also suggest E2E tests when appropriate
    suggest_e2e: true

  code_reviewer:
    auto_run: true
    # Auto-fix simple issues
    auto_fix:
      - remove_console_logs
      - add_missing_try_catch
      - fix_obvious_typos
    # Just report complex issues
    report_only:
      - architecture_concerns
      - major_refactoring

  ui_reviewer:
    auto_run: true
    # Only on UI file changes
    trigger_paths:
      - "myBrain-web/src/components/**"
      - "myBrain-web/src/features/**"
    # Take screenshots for significant changes
    auto_screenshot: true
```

## Priority Matrix

When deciding what to test first:

```yaml
priority:
  high:
    - Authentication/authorization code
    - Data mutation endpoints (POST, PUT, DELETE)
    - User-facing core features (tasks, notes, projects)
    - Payment/billing code (if any)

  medium:
    - Read endpoints (GET)
    - UI components used in multiple places
    - Utility functions with complex logic

  low:
    - Admin-only features
    - Logging/analytics
    - Rarely used features
```
```

### 10. Updated CI Workflow

**File:** `.github/workflows/ci.yml` (REPLACE EXISTING)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Frontend tests, build, and coverage
  frontend:
    name: Frontend Tests & Build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: myBrain-web

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: myBrain-web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint
        continue-on-error: true

      - name: Run tests with coverage
        run: npm run test:coverage -- --run
        env:
          CI: true

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: myBrain-web/coverage/

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 50" | bc -l) )); then
            echo "::error::Coverage $COVERAGE% is below minimum 50%"
            exit 1
          fi

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: https://mybrain-api.onrender.com

  # Backend tests and coverage
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: myBrain-api

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: myBrain-api/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          CI: true
          NODE_ENV: test
          JWT_SECRET: test-secret-for-ci

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: myBrain-api/coverage/

  # E2E Tests (runs after unit tests pass)
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [frontend, backend]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Playwright
        run: |
          npm init -y
          npm install @playwright/test
          npx playwright install chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true
          BASE_URL: https://my-brain-gules.vercel.app
          TEST_USER_EMAIL: claude-test-user@mybrain.test
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        continue-on-error: true  # Don't block PR while E2E is being set up

      - name: Upload E2E results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: playwright-report/
```

### 11. Weekly Audit Workflow (NEW)

**File:** `.github/workflows/weekly-audit.yml`

```yaml
name: Weekly QA Audit

on:
  schedule:
    # Run every Sunday at 2 AM UTC
    - cron: '0 2 * * 0'
  workflow_dispatch:  # Allow manual trigger

jobs:
  audit:
    name: Run QA Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd myBrain-web && npm ci
          cd ../myBrain-api && npm ci

      - name: Run frontend coverage
        run: cd myBrain-web && npm run test:coverage -- --run || true

      - name: Run backend coverage
        run: cd myBrain-api && npm run test:coverage || true

      - name: Generate audit report
        run: |
          DATE=$(date +%Y-%m-%d)
          mkdir -p .claude/reports

          echo "# Weekly QA Audit Report" > .claude/reports/$DATE-weekly-audit.md
          echo "" >> .claude/reports/$DATE-weekly-audit.md
          echo "**Generated:** $DATE" >> .claude/reports/$DATE-weekly-audit.md
          echo "**Type:** Automated Weekly Audit" >> .claude/reports/$DATE-weekly-audit.md
          echo "" >> .claude/reports/$DATE-weekly-audit.md

          echo "## Frontend Coverage" >> .claude/reports/$DATE-weekly-audit.md
          cat myBrain-web/coverage/coverage-summary.json | jq '.' >> .claude/reports/$DATE-weekly-audit.md || echo "Coverage data not available" >> .claude/reports/$DATE-weekly-audit.md
          echo "" >> .claude/reports/$DATE-weekly-audit.md

          echo "## Backend Coverage" >> .claude/reports/$DATE-weekly-audit.md
          cat myBrain-api/coverage/coverage-summary.json | jq '.' >> .claude/reports/$DATE-weekly-audit.md || echo "Coverage data not available" >> .claude/reports/$DATE-weekly-audit.md
          echo "" >> .claude/reports/$DATE-weekly-audit.md

          echo "## Untested Files" >> .claude/reports/$DATE-weekly-audit.md
          echo "### Backend Routes" >> .claude/reports/$DATE-weekly-audit.md
          for f in myBrain-api/src/routes/*.js; do
            base=$(basename "$f")
            if [[ "$base" != *.test.js ]]; then
              test_file="${f%.js}.test.js"
              if [[ ! -f "$test_file" ]]; then
                echo "- $base" >> .claude/reports/$DATE-weekly-audit.md
              fi
            fi
          done

      - name: Create Pull Request with report
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: Weekly QA audit report for ${{ github.event.repository.updated_at }}"
          title: "Weekly QA Audit Report"
          body: |
            ## Automated QA Audit

            This PR contains the weekly QA audit report.

            Please review the coverage metrics and untested files.

            ---
            *Generated automatically by GitHub Actions*
          branch: audit/weekly-${{ github.run_number }}
          delete-branch: true
```

### 12. Playwright Configuration (NEW)

**File:** `playwright.config.js` (project root)

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before tests (for local development)
  webServer: process.env.CI ? undefined : {
    command: 'cd myBrain-web && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 13. E2E Test File (NEW)

**File:** `e2e/auth.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();

    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL);
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL);
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);

    // Find and click logout
    await page.getByRole('button', { name: /logout|sign out/i }).click();

    // Should be back at login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### 14. E2E Test: Core Features (NEW)

**File:** `e2e/core-features.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Core Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL);
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('dashboard loads without errors', async ({ page }) => {
    // Check no error boundaries triggered
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();

    // Check key elements present
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('can navigate to tasks page', async ({ page }) => {
    await page.getByRole('link', { name: /tasks/i }).click();
    await expect(page).toHaveURL(/\/app\/tasks/);
  });

  test('can navigate to notes page', async ({ page }) => {
    await page.getByRole('link', { name: /notes/i }).click();
    await expect(page).toHaveURL(/\/app\/notes/);
  });

  test('can navigate to projects page', async ({ page }) => {
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
  });
});
```

---

## Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| E2E tests flaky in CI | Use retries, increase timeouts, run against stable production |
| Coverage threshold blocks legitimate PRs | Start with low threshold (50%), increase gradually |
| Audit creates too many PRs | Consolidate into weekly summary, require manual merge |
| Test writing slows down development | Make test-writer agent fast, run in background |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| Playwright setup complex | Use simple config, document setup steps |
| Weekly audit times out | Set reasonable timeout, split into smaller jobs |
| Coverage tools give different results locally vs CI | Use same Node version, lock dependencies |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Rules too strict | Start lenient, tighten over time |
| Skills conflict with agents | Clear documentation on when each activates |

---

## Confidence Levels

| Component | Confidence | Notes |
|-----------|------------|-------|
| Agents (test-writer, code-reviewer, ui-reviewer) | 85% | Concept is sound, may need tuning |
| Rules (qa-standards, code-quality, ui-standards) | 95% | Standard best practices |
| Skills (qa-status, audit-now) | 90% | Straightforward implementation |
| CI Updates (coverage, E2E) | 75% | E2E in CI is complex, may need iteration |
| Weekly Audit Workflow | 70% | GitHub Actions scheduling can be tricky |
| Playwright Setup | 80% | Standard setup, but login flow may vary |
| Configuration (qa-config) | 95% | Just documentation |

**Overall Confidence: 83%**

The core concept is solid. The main uncertainty is around E2E testing in CI, which may require iteration to get working smoothly.

---

## Open Questions & Concerns

### Questions for Reviewer

1. **E2E Test Strategy:** Should E2E tests run against production or a preview deployment? Production is more stable but tests could affect real data (test account only).

2. **Coverage Thresholds:** Starting at 50% minimum seems low but realistic given current ~7% backend coverage. Should we be more aggressive?

3. **Agent Trigger Timing:** Should agents run after every file save, or batch changes and run when Claude is "done" with a task?

4. **Audit PR Frequency:** Weekly PRs might be noisy. Should audit just create reports without PRs, and let user decide when to act?

5. **Test Account Security:** Test account passwords need to be in GitHub Secrets. Is the current approach (reference in config, actual in secrets) secure enough?

### Concerns

1. **Playwright Installation in CI:** Playwright requires browser binaries (~400MB). This adds significant time to CI. Consider caching strategy.

2. **MongoDB Memory Server Reliability:** Sometimes flaky in CI. May need to add retry logic or increase timeout.

3. **E2E Test Maintenance:** E2E tests are notoriously brittle. Need strategy for keeping them updated as UI changes.

4. **Agent Coordination:** If all three agents run simultaneously, could create conflicting changes. May need sequencing.

---

## Implementation Order

### Phase 1: Foundation (Day 1)
1. Create `.claude/agents/` folder
2. Create `.claude/config/` folder
3. Create `.claude/reports/` folder
4. Add `qa-config.md`
5. Add three agent files
6. Add three rule files

### Phase 2: Skills (Day 1)
7. Add `qa-status` skill
8. Add `audit-now` skill

### Phase 3: CI Updates (Day 2)
9. Update `ci.yml` with coverage reporting
10. Add coverage threshold check
11. Test CI changes on a branch

### Phase 4: E2E Setup (Day 2-3)
12. Add `playwright.config.js`
13. Create `e2e/` folder
14. Add auth E2E tests
15. Add core features E2E tests
16. Add Playwright to CI workflow

### Phase 5: Scheduled Audit (Day 3)
17. Add `weekly-audit.yml` workflow
18. Test scheduled workflow manually
19. Verify report generation

### Phase 6: Integration Testing (Day 4)
20. Run full workflow end-to-end
21. Verify agents trigger correctly
22. Verify CI passes/fails appropriately
23. Verify audit creates reports

### Phase 7: Documentation (Day 4)
24. Update CLAUDE.md with QA system docs
25. Update SKILLS.md with new skills
26. Create user guide for QA system

---

## Success Criteria

### Immediate (After Implementation)

- [ ] All new agent files created and syntactically correct
- [ ] All new rule files created and syntactically correct
- [ ] All new skill files created and syntactically correct
- [ ] CI workflow runs without errors
- [ ] Coverage reports generated in CI

### Short-term (1 Week After)

- [ ] At least 5 PRs have gone through new CI
- [ ] test-writer agent has created at least 3 test files
- [ ] No false positives blocking legitimate PRs
- [ ] Weekly audit workflow runs successfully

### Medium-term (1 Month After)

- [ ] Backend coverage increased from 7% to 30%+
- [ ] Frontend coverage increased to 20%+
- [ ] E2E tests covering all critical flows
- [ ] User reports QA is "invisible" (doesn't require their attention)

### Long-term (3 Months After)

- [ ] Overall coverage at 60%+
- [ ] Zero production bugs that would have been caught by tests
- [ ] Audit reports show consistent quality
- [ ] QA system requires minimal maintenance

---

## Appendix: Full File Contents

All file contents are provided inline in the Implementation Details section above. Summary:

| File | Lines | Section |
|------|-------|---------|
| `.claude/agents/test-writer.md` | ~150 | Section 5.1 |
| `.claude/agents/code-reviewer.md` | ~100 | Section 5.2 |
| `.claude/agents/ui-reviewer.md` | ~100 | Section 5.3 |
| `.claude/rules/qa-standards.md` | ~80 | Section 5.4 |
| `.claude/rules/code-quality.md` | ~200 | Section 5.5 |
| `.claude/rules/ui-standards.md` | ~200 | Section 5.6 |
| `.claude/skills/qa-status/SKILL.md` | ~100 | Section 5.7 |
| `.claude/skills/audit-now/SKILL.md` | ~120 | Section 5.8 |
| `.claude/config/qa-config.md` | ~120 | Section 5.9 |
| `.github/workflows/ci.yml` | ~100 | Section 5.10 |
| `.github/workflows/weekly-audit.yml` | ~80 | Section 5.11 |
| `playwright.config.js` | ~40 | Section 5.12 |
| `e2e/auth.spec.js` | ~50 | Section 5.13 |
| `e2e/core-features.spec.js` | ~40 | Section 5.14 |

**Total new code: ~1,480 lines across 14 files**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-24 | Claude | Initial draft |

---

*This plan is ready for review. Please provide feedback on the approach, implementation details, and any concerns.*

This is a highly impressive and detailed implementation plan. It demonstrates a strong understanding of the "AI-driven development" loop (using Agents) combined with traditional DevOps best practices (CI/CD).

However, as requested, I have performed a **strict review** of the plan. While the architecture is sound, there are several **critical implementation risks**—specifically regarding the transition from 7% to 50% coverage, the handling of E2E test data, and the context overhead of the proposed agents.

Here is my comprehensive feedback.

--- SENIOR AGENT REVIEW #1 ---

### 1. Critical Risks (The "Showstoppers")

These issues must be addressed before implementation begins, or they will block development or cause data instability.

#### A. The "Coverage Trap" (Gate vs. Reality)

* **The Issue:** The plan proposes a `blocking: 50` coverage threshold in `.claude/config/qa-config.md` and enforces it in the CI workflow.
* **The Reality:** Your current backend coverage is **7%**.
* **The Consequence:** If you implement this plan as written, **every single Pull Request will fail immediately**. You will not be able to merge any code until you manually write tests for nearly half the application. This will stall development entirely.
* **Strict Recommendation:**
* **Do not use absolute percentage gates yet.** Use **"Diff Coverage"** (coverage on *new* code only) set to 80-90%.
* Alternatively, set the absolute gate to **current_coverage - 1%** (e.g., 6%) to prevent regression, but do not set it to 50% until you are actually close to that number.



#### B. E2E Data Pollution & Concurrency

* **The Issue:** The Playwright configuration (`playwright.config.js` and `ci.yml`) implies running against a deployed URL (`VITE_API_URL` / `BASE_URL`) using a single set of credentials (`TEST_USER_EMAIL`).
* **The Risk:**
1. **Race Conditions:** If two PRs run CI at the same time, they will log in as the same user. One test might delete a task while the other is trying to read it. Both tests will flake/fail.
2. **Dirty State:** The plan does not mention a "teardown" phase. If a test creates a project but fails before deletion, that project stays in the DB forever.
3. **Production Risk:** If `my-brain-gules.vercel.app` is your production or staging environment, running destructive tests (Delete Task/Project) is high risk.


* **Strict Recommendation:**
* **Seed/Reset Scripts:** You must implement a database seed/reset script that runs *before* the E2E suite starts in CI.
* **Test Isolation:** Ideally, the `test-writer` should generate unique user credentials for every test run (e.g., `test-user-${timestamp}@mybrain.test`), or you must run E2E tests sequentially, never in parallel.



#### C. Context Window Overload

* **The Issue:** You are adding 3 Agents, 3 Rules, and extensive instructions.
* **The Consequence:** When you ask Claude to "fix a bug," it now has to load all these instructions. This reduces the available context window for the actual code and increases "time-to-first-token" (latency). It may also confuse the model if the Agent instructions conflict with the user prompt.
* **Strict Recommendation:** Consolidate the Agents. You don't need `code-reviewer` AND `ui-reviewer` as separate files. Merge them into a single `reviewer` agent to save tokens and reduce complexity.

---

### 2. Architecture & Technical Review

#### 2.1 Agent Strategy

* **`test-writer`:** The logic is sound, but the prompt should explicitly forbid "mocking everything." A common AI failure mode is writing tests that mock so much they don't actually test the logic.
* *Add to Agent Rule:* "Prefer integration tests for API routes over unit tests. Do not mock Mongoose models unless absolutely necessary."


* **`qa-status` Skill:** The `tail -30` command in your script is risky. If the output format changes or is shorter, you might miss the summary line. Use `grep` or specific JSON reporters (which you are already generating) to parse coverage.

#### 2.2 CI/CD Workflow (`ci.yml`)

* **Frontend/Backend Split:** Good separation.
* **`continue-on-error: true` for E2E:** This negates the purpose of CI. If E2E fails, the PR *should* be blocked (once you have stable tests).
* **Artifacts:** You are uploading coverage reports but not combining them. Consider using a Codecov or Coveralls action (if budget allows) or a script to merge them for a unified view.

#### 2.3 Playwright Implementation

* **Authentication:** The proposed `auth.spec.js` is UI-driven (typing into forms). This is slow.
* *Optimization:* For non-auth tests (like `core-features.spec.js`), implement a helper to programmatically set the JWT/Session in `localStorage` or cookies, bypassing the UI login screen to speed up tests.


* **Mobile Testing:** The plan mentions "Responsive Design" in rules but the Playwright config only sets up `Desktop Chrome`.
* *Add:* `projects: [{ name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }]` to `playwright.config.js`.



---

### 3. Logic & Process Gaps

* **The "Audit" Noise:** The Weekly Audit creates a PR. If no one merges that PR, next week's audit will create *another* PR, potentially conflicting with the first.
* *Fix:* The workflow should check if an audit branch already exists and update it, rather than creating a new one every time.


* **Manual Intervention Paradox:** The Goal states "Requires zero manual intervention," but the `test-writer` creates tests that need to be committed. Who commits them?
* *Clarification:* If Claude is running locally (CLI), it can commit. If this is a GitHub Action, it needs write permissions. The plan implies Claude (the user) does the work, so this is likely fine, but "Zero intervention" is marketing fluff—the user still has to review and accept the test files.



---

### 4. Detailed "Redlines" (Specific Corrections)

I have identified specific lines in your plan that need changing before approval.

| File / Section | Current Value | Recommended Change | Reason |
| --- | --- | --- | --- |
| **qa-config.md** | `blocking: 50` | `blocking: 5` (or remove entirely for now) | Prevents immediate deadlock of all development. |
| **qa-config.md** | `new_code: 80` | `new_code: 70` | 80% is hard for UI components; 70% is a realistic start. |
| **ci.yml** | `run: npm run lint` | `run: npm run lint` (remove `continue-on-error`) | If linting fails, the code is dirty. Don't merge it. |
| **playwright.config** | `baseURL: ...vercel.app` | `baseURL: 'http://localhost:5173'` | **Always** run CI tests against the local built version, not production. |
| **test-writer** | "Edge cases" | "Happy Path First" | AI struggles with edge cases. Focus on getting 1 success path first. |

---

### 5. Implementation Roadmap Adjustments

Your implementation order is slightly aggressive. I suggest this modified order:

1. **Phase 1: The Safety Net (Local Only)**
* Install Playwright and write the `auth.spec.js` *locally*.
* Verify you can run it against `localhost`.
* **Do not** add to CI yet.


2. **Phase 2: CI Coverage (Non-Blocking)**
* Update `ci.yml` to run tests and report coverage.
* **Remove** the failure threshold. Just let us see the numbers.


3. **Phase 3: The Agents**
* Deploy the agents (`test-writer`, etc.).
* Use them for 1 week to generate tests for *new* features.


4. **Phase 4: Enforce & Expand**
* Once coverage hits ~20%, enable the blocking threshold.
* Enable the Weekly Audit.



---

### Next Step

The plan is **80% ready**, but the 20% that is missing (data isolation and realistic thresholds) will cause immediate project failure.


--- SENIOR AGENT REVIEW #2 ---

Below is a **strict, senior-level QA / Director of Engineering review** of your QA System Implementation Plan. I am treating this as if it were proposed for a real production org with long-term maintainability, regulatory risk, and scaling concerns.

I will be **direct, opinionated, and specific**. Overall: this is a **very strong plan**, but it also contains **dangerous assumptions, over-automation risks, and several architectural gaps** that should be addressed *before* adoption.

---

# Executive Verdict (High-Level)

**Overall grade: A– (strong but not production-safe yet)**

### What you did exceptionally well

* Clear layering (dev-time → PR → scheduled audits → manual overrides)
* Thoughtful coverage of **testing, code quality, UI/UX, and security**
* Realistic acknowledgment of current coverage gaps
* Good separation of concerns between agents, rules, skills, and CI
* Strong bias toward automation (which is correct for your context)

### Where this plan is risky

1. **Over-trusting automated test generation**
2. **No explicit test ownership or “test correctness” verification**
3. **E2E strategy is underdefined and potentially flaky**
4. **Coverage metrics are over-weighted vs. behavioral correctness**
5. **Agents have overlapping authority with no conflict resolution**
6. **CI and Claude responsibilities are blurred**
7. **Security review is partially performative**
8. **Audit workflows can generate noise and PR spam**

None of these are fatal — but several *will* cause pain if not addressed early.

---

# 1. Conceptual & Architectural Review

## 1.1 Core Assumption: “Automatically writes tests”

This is the **biggest risk** in the entire plan.

### Problem

Automatically generated tests often:

* Assert implementation details instead of behavior
* Mirror the code instead of validating requirements
* Pass even when the feature is broken (false confidence)
* Break frequently on refactors

Your plan assumes:

> “Tests written = quality increased”

That is **not always true**.

### Recommendation (Critical)

Add a **Test Quality Gate** concept:

> *“A test is only valuable if it would fail when the feature is broken.”*

Concrete actions:

* Require **at least one test per feature that simulates user intent**, not implementation
* For backend routes: assert **side effects**, not just status codes
* For frontend: assert **visible outcomes**, not component internals

Add this rule explicitly:

```md
Tests must fail if:
- Authorization is removed
- Validation is bypassed
- Side effects are skipped
```

Without this, coverage becomes a vanity metric.

---

## 1.2 Agent Model (Claude Agents)

### Strengths

* Clear responsibilities
* Good triggers
* Well-defined scopes

### Critical Issue: **Authority Overlap**

You currently have:

* `test-writer` modifying code
* `code-reviewer` modifying code
* `ui-reviewer` modifying code

### Problem

What happens when:

* Test-writer writes a test
* Code-reviewer auto-fixes the implementation
* UI-reviewer modifies markup
* The test is now invalid

There is **no declared ordering or arbitration**.

### Recommendation

Define a **strict execution order**:

1. Code is written
2. Code-reviewer runs (may auto-fix)
3. UI-reviewer runs (may auto-fix)
4. **Only then** test-writer runs
5. Tests must be regenerated if code changed

Document this explicitly.

---

## 1.3 Claude vs CI Responsibility Boundary

Right now, responsibilities are blurred:

| Responsibility      | Claude | CI |
| ------------------- | ------ | -- |
| Write tests         | ✅      | ❌  |
| Validate tests pass | ⚠️     | ✅  |
| Enforce coverage    | ⚠️     | ✅  |
| Decide PR blocking  | ❌      | ✅  |
| Generate audits     | ⚠️     | ✅  |

### Problem

Claude is both **author** and **reviewer**.

That violates a core QA principle:

> *The system that writes the code should not be the final authority on its correctness.*

### Recommendation

CI should be the **single source of truth** for:

* Pass/fail
* Coverage enforcement
* Blocking merges

Claude should:

* Prepare
* Suggest
* Generate
* Explain

Never *decide*.

This is mostly true already — but you should **state it explicitly**.

---

# 2. Testing Strategy Review

## 2.1 Unit vs Integration vs E2E Balance

### Current Bias

You are heavily weighted toward:

* Unit tests
* Route-level integration tests

### Risk

Your app is:

* Auth-heavy
* State-heavy
* UI-driven

That means **cross-layer bugs** are more likely than pure logic bugs.

### Recommendation

Adopt a **Test Pyramid with explicit ratios**:

| Level       | Target |
| ----------- | ------ |
| Unit        | 50–60% |
| Integration | 25–35% |
| E2E         | 5–10%  |

E2E should be:

* Minimal
* High-value
* Extremely stable

---

## 2.2 E2E Strategy (Major Gap)

### Issues

* E2E tests are allowed to fail (`continue-on-error`)
* No environment isolation
* Shared test accounts
* No data reset strategy
* No flake mitigation strategy

This is **not production-safe**.

### Recommendations (Important)

1. **Dedicated E2E environment**

   * Separate DB
   * Seeded data
2. **Idempotent tests**

   * Tests clean up after themselves
3. **No shared accounts**

   * Each test creates its own user or uses a namespaced user
4. **Gradual enforcement**

   * Phase 1: informational
   * Phase 2: required for critical flows
   * Phase 3: blocking

---

## 2.3 Coverage Thresholds

### What’s Good

* Differentiating minimum vs target
* Higher bar for new code

### What’s Dangerous

Coverage is:

* Line-based
* Global
* Blind to importance

### Recommendation

Introduce **Weighted Coverage**:

* Auth routes count more
* Mutation endpoints count more
* UI core flows count more

Coverage should be **contextual**, not flat.

---

# 3. Backend-Specific Review

## 3.1 Mongo Memory Server

### Good

* Fast
* Isolated
* Deterministic

### Risk

* Does not behave exactly like Atlas
* Index behavior differs
* Performance issues are invisible

### Recommendation

Add:

* **One nightly test run against real Mongo (staging)**
* Especially for aggregation-heavy routes

---

## 3.2 Authorization Coverage

You emphasize auth — good — but enforcement is implicit.

### Recommendation

Add a **mandatory auth test pattern**:
For every protected route:

* unauthenticated → 401
* authenticated wrong user → 403
* authenticated owner → success

Make this non-negotiable.

---

# 4. Frontend & UI Review

## 4.1 UI Reviewer Strengths

This is one of the strongest parts of the plan.

* Excellent accessibility checklist
* Good design system enforcement
* Clear responsive breakpoints

### One Missing Piece: **Visual Regression**

You mention screenshots but do not enforce them.

### Recommendation

For major UI changes:

* Baseline screenshots
* Diff-based review (even manual at first)

Without this, UI regressions will slip through.

---

## 4.2 React Testing Philosophy

Ensure the following rule is explicit:

> “Do not test implementation details.”

No:

* Internal state
* Hook internals
* Component methods

Yes:

* Visible text
* ARIA roles
* User interactions

---

# 5. Security Review (Needs Tightening)

### Good

* Input validation
* Auth checks
* Secret scanning

### Gaps

* No dependency vulnerability scanning
* No rate-limit validation tests
* No permission matrix tests (admin vs user)

### Recommendations

Add:

* `npm audit` (non-blocking initially)
* Explicit permission tests for admin routes
* Rate-limit tests for sensitive endpoints

---

# 6. Audit System Review

## 6.1 Weekly Audit PR Spam Risk

Auto-generating PRs weekly is dangerous:

* Alert fatigue
* PR backlog
* Reduced signal

### Recommendation

Change behavior:

* Weekly audit → **report only**
* Monthly audit → optional PR
* Auto-PR only when:

  * Coverage regression
  * Security issue
  * Critical path untested

---

## 6.2 Reports Location

Storing reports in-repo is fine **short-term**, but:

* Repo noise
* Merge conflicts
* History bloat

Plan a future migration:

* GitHub artifacts
* External storage
* Wiki or dashboard

---

# 7. Process & Human Factors

## 7.1 Zero-Experience Owner Constraint

You handled this well, but one concern remains:

If everything is automated:

* The owner may trust green checks blindly

### Recommendation

Add **Plain-English Summaries**:

* “This passed, but X is still risky”
* “Coverage increased, but core flow Y is untested”

QA is as much communication as automation.

---

# 8. Questions You Should Answer Before Finalizing

Please have the team answer these **before implementation**:

1. **Who is allowed to override QA failures?**
2. **What happens when Claude-generated tests are wrong?**
3. **What is the rollback plan if QA blocks all progress?**
4. **How do we detect flaky tests automatically?**
5. **What is the maximum acceptable CI runtime?**
6. **What metrics matter more than coverage?**
7. **How will this scale when test count hits 1,000+?**

---

# Final Recommendation

**Proceed with this plan, but with amendments.**

If you:

* Add execution ordering
* Reduce blind trust in auto-tests
* Harden E2E strategy
* Clarify authority boundaries
* Prevent audit noise

…this becomes a **best-in-class QA system for an AI-driven development workflow**.

