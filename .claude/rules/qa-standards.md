---
paths:
  - "**/*"
---

# QA Standards

## Core Principles

1. **CI is the single source of truth** - Claude suggests, CI decides, user approves
2. **Gradual enforcement** - Never block progress without clear path forward
3. **Behavior over implementation** - Tests must catch real bugs
4. **Plain-English communication** - User should understand what's happening

## Authority Boundaries

| Decision | Claude | CI | User |
|----------|--------|----|----- |
| Write tests | ✅ | ❌ | ❌ |
| Suggest fixes | ✅ | ❌ | ❌ |
| Run tests | ❌ | ✅ | ❌ |
| Pass/fail checks | ❌ | ✅ | ❌ |
| Override failure | ❌ | ❌ | ✅ |
| Approve push | ❌ | ❌ | ✅ |

**Claude NEVER decides if code is ready to ship. Claude prepares, suggests, generates, and explains. CI validates. User approves.**

## Agent Execution Order

**STRICT ORDER - Never run agents in parallel:**

1. `qa-reviewer` runs FIRST
   - Reviews code quality, security, UI
   - May auto-fix simple issues
   - Reports findings

2. `test-writer` runs SECOND
   - Only after qa-reviewer completes
   - Only if no critical issues blocking
   - Writes tests for the reviewed code

If qa-reviewer finds critical issues, test-writer waits until they're fixed.

## Coverage Strategy

### Current Phase: 1 (Informational)

See `.claude/config/qa-config.md` for phase definitions.

**Phase 1 (Now):** Report coverage, never block pushes
**Phase 2 (At 20%):** New code must be tested
**Phase 3 (At 40%):** Coverage floor enforced

### What Counts as Tested

Code is considered tested when:
- There's a corresponding `.test.js` or `.test.jsx` file
- Tests cover the happy path at minimum
- Protected routes have auth tests (401/403/200)
- User input has validation tests

## Test Requirements by Change Type

### New Feature
1. Happy path test (required)
2. Auth triple if protected (required)
3. Validation tests if user input (required)
4. Edge cases (recommended)
5. E2E consideration if user-facing (recommended)

### Bug Fix
1. Test that reproduces the bug (required)
2. Test that verifies the fix (required)
3. Related edge cases (recommended)

### Refactoring
1. Existing tests must pass (required)
2. No new tests required unless previously missing

## Communication Standards

### Always Provide Plain-English Summary

For test results:
```
✅ All tests passed (47 tests, 0.8s)

What this means: Your code works as expected and
didn't break anything else.
```

Or:
```
⚠️ 2 tests failed

What happened: The task creation test expected
the API to return the new task, but it got an error.

What to do: Check the createTask function -
the validation might be rejecting valid input.
```

### For Coverage Reports

```
📊 Coverage: 23% (+2%)

What this means: About 1 in 4 lines of code has tests.
This is early days - focus on core features first.

Priority to test next: tasks.js (heavily used, no tests)
```

## Override Protocol

When user overrides a QA failure:

1. **Log the override** in `.claude/reports/overrides.md`
2. **Explain the risk** in plain English
3. **Document the reason** provided by user
4. **Continue** - user has final authority

Example log entry:
```markdown
## Override: 2024-01-24

**What failed:** Coverage dropped 3%
**User decision:** Proceed anyway
**Reason:** "Hotfix needed urgently, will add tests tomorrow"
**Risk accepted:** Temporary coverage regression
```

## E2E Test Scope

**What E2E validates:**
- User flows work end-to-end
- Frontend and backend integrate correctly
- Critical paths don't have obvious breaks

**What E2E does NOT validate:**
- Production performance
- Infrastructure behavior
- Load handling
- Third-party service reliability

This is intentional - E2E tests run against local builds for safety and determinism.
