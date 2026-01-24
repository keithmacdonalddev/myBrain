---
paths:
  - "**/*.test.js"
  - "**/*.test.jsx"
  - "**/*.spec.js"
  - "**/*.spec.jsx"
---

# Test Quality Gates

## Core Principle

> "A test that passes when the feature is broken is worse than no test."

Tests create confidence. Bad tests create **false confidence**, which is dangerous.

## The Golden Rule

**Every test must answer: "Would this fail if the feature broke?"**

If the answer is "no" or "maybe," the test needs improvement.

## Mandatory Quality Checks

Before committing any test, verify:

### 1. Tests Assert Behavior, Not Implementation

```javascript
// ✅ GOOD - Tests visible outcome
it('displays the task title', () => {
  render(<TaskCard task={mockTask} />);
  expect(screen.getByText('Buy groceries')).toBeInTheDocument();
});

// ❌ BAD - Tests internal state
it('sets isLoading to true', () => {
  const { result } = renderHook(() => useTask());
  expect(result.current.state.isLoading).toBe(true);
});
```

### 2. Tests Verify Side Effects

```javascript
// ✅ GOOD - Verifies database was updated
it('creates the task in database', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test Task' });

  // Verify it's actually in the database
  const saved = await Task.findById(res.body._id);
  expect(saved).toBeTruthy();
  expect(saved.title).toBe('Test Task');
});

// ❌ BAD - Only checks response, not side effect
it('returns 201', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test Task' });

  expect(res.status).toBe(201);
  // But did it actually save? We don't know!
});
```

### 3. Minimal Mocking

```javascript
// ✅ GOOD - Only mock external services
jest.mock('../services/emailService'); // External API
// Let the actual database, auth, and business logic run

// ❌ BAD - Mocks everything (tests nothing real)
jest.mock('../models/Task');
jest.mock('../services/taskService');
jest.mock('../middleware/auth');
// Now what are we even testing?
```

### 4. Auth Triple for Protected Routes

**REQUIRED for every protected endpoint:**

```javascript
describe('POST /api/tasks', () => {
  // Test 1: No auth
  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  // Test 2: Wrong user
  it('returns 403 for non-owner', async () => {
    const res = await request(app)
      .get('/api/tasks/' + otherUserTaskId)
      .set('Cookie', myAuthCookie);
    expect(res.status).toBe(403);
  });

  // Test 3: Valid owner
  it('returns 200 for owner', async () => {
    const res = await request(app)
      .get('/api/tasks/' + myTaskId)
      .set('Cookie', myAuthCookie);
    expect(res.status).toBe(200);
  });
});
```

## Anti-Patterns to Avoid

### 1. Mock-Only Assertions

```javascript
// ❌ BAD - Only asserts mock was called
it('calls the service', async () => {
  await createTask({ title: 'Test' });
  expect(mockTaskService.create).toHaveBeenCalled();
});
// This passes even if the feature is completely broken!
```

### 2. Snapshot Abuse

```javascript
// ❌ BAD - Snapshots entire component
it('renders correctly', () => {
  const { container } = render(<Dashboard />);
  expect(container).toMatchSnapshot();
});
// Changes to unrelated parts break this test
// Doesn't actually verify behavior

// ✅ GOOD - Specific assertions
it('shows welcome message with user name', () => {
  render(<Dashboard user={{ name: 'Alice' }} />);
  expect(screen.getByText('Welcome, Alice')).toBeInTheDocument();
});
```

### 3. Implementation Coupling

```javascript
// ❌ BAD - Breaks if you rename internal method
it('calls _validateInput', () => {
  const spy = jest.spyOn(service, '_validateInput');
  service.createTask({ title: 'Test' });
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD - Tests the contract, not the implementation
it('rejects invalid input', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: '' });
  expect(res.status).toBe(400);
});
```

### 4. Testing Third-Party Libraries

```javascript
// ❌ BAD - Testing that date-fns works
it('formats dates correctly', () => {
  expect(format(new Date('2024-01-01'), 'yyyy-MM-dd')).toBe('2024-01-01');
});
// date-fns has its own tests!

// ✅ GOOD - Test YOUR code that uses date-fns
it('displays task due date in readable format', () => {
  render(<TaskCard task={{ ...mockTask, dueDate: '2024-01-15' }} />);
  expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
});
```

## Test Failure Sensitivity Checklist

Before considering a test complete, ask:

| Question | Expected Answer |
|----------|-----------------|
| If I remove the auth middleware, would auth tests fail? | Yes |
| If I remove validation, would validation tests fail? | Yes |
| If I skip the database save, would persistence tests fail? | Yes |
| If I return wrong data, would response tests fail? | Yes |
| If I break the UI, would component tests fail? | Yes |

If any answer is "no" or "not sure," improve the test.

## Frontend Testing Guidelines

### Query Priority (Accessibility First)

Use queries in this order:

1. `getByRole` - Best, tests accessibility
2. `getByLabelText` - Good for form fields
3. `getByText` - Good for content
4. `getByPlaceholderText` - Acceptable for inputs
5. `getByTestId` - Last resort only

```javascript
// ✅ BEST - Accessible query
screen.getByRole('button', { name: /save/i });

// ✅ GOOD - Form field
screen.getByLabelText('Email');

// ⚠️ OKAY - Visible text
screen.getByText('Welcome back');

// ❌ AVOID - Implementation detail
screen.getByTestId('save-button');
```

### User Event over fireEvent

```javascript
// ✅ BETTER - Simulates real user
await userEvent.click(button);
await userEvent.type(input, 'hello');

// ⚠️ OKAY - But less realistic
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'hello' } });
```

## Backend Testing Guidelines

### Use Real Database (MongoDB Memory Server)

We have `mongodb-memory-server` configured. Use it:

```javascript
// Tests run against real MongoDB (in-memory)
// This catches real database issues

it('creates task with all fields', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test', priority: 'high' });

  // Actually saved with correct fields
  const task = await Task.findById(res.body._id);
  expect(task.priority).toBe('high');
});
```

### Test Error Scenarios

```javascript
it('handles database errors gracefully', async () => {
  // Temporarily break the connection
  await mongoose.disconnect();

  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test' });

  expect(res.status).toBe(500);
  expect(res.body.code).toBe('INTERNAL_ERROR');

  // Reconnect for other tests
  await mongoose.connect(testUri);
});
```

## Test Coverage Isn't Everything

High coverage with bad tests is worse than moderate coverage with good tests.

**Prefer:**
- 60% coverage with behavior tests
- Tests that catch real bugs
- Tests that don't break on refactors

**Over:**
- 90% coverage with mock-heavy tests
- Tests that assert implementation details
- Tests that break when you rename a variable

## Warning Signs in Test Code

If you see these, reconsider the approach:

| Warning Sign | Problem |
|--------------|---------|
| More `jest.mock()` than actual tests | Over-mocking |
| Assertions on `.state` or private methods | Implementation coupling |
| `toMatchSnapshot()` everywhere | Lazy testing |
| No assertions on database/API response | Missing verification |
| Tests that never fail | Probably not testing anything |
