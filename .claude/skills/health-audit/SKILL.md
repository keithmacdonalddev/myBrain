---
name: health-audit
description: Comprehensive codebase audit with optional fix implementation and monitoring
---

# Health Audit Skill

Run a comprehensive codebase audit with three depth levels. Designed for flexible use from quick checks to thorough deep dives.

## When to Use

- **Quick check** - Fast pattern-based audit before releases or after refactors
- **Standard audit** - Weekly health check with real browser testing
- **Deep dive** - Monthly comprehensive review or before major releases
- **After major refactors** - Verify nothing regressed

## Tiers

### Quick (Default)
```
/health-audit
```
Pattern-based static analysis. Fast, no servers required.

**Includes:**
- Run test suites (frontend + backend)
- Grep for anti-patterns (hardcoded colors, console.logs, etc.)
- npm audit/outdated
- Documentation accuracy checks
- Pattern-based accessibility scan

**Time:** 30-45 min | **Cost:** ~$3

---

### Standard (--standard)
```
/health-audit --standard
```
Everything in Quick, plus real browser testing.

**Additional checks:**
- **E2E key flows with agent-browser:**
  - Login flow
  - Dashboard load
  - Create/edit/delete task
  - Create/edit/delete note
  - Settings page
  - (5-7 critical user flows)
- **Lighthouse performance on 5 key pages:**
  - Dashboard
  - Tasks list
  - Notes list
  - Calendar
  - Settings
- **Real accessibility scan:**
  - Visit each page, check for WCAG violations via axe-core patterns
  - Not just grep, but actual DOM analysis via agent-browser
- **Console error collection:**
  - Visit each page, capture any JS errors

**Time:** 1-2 hours | **Cost:** ~$15

**Requires:** Frontend and backend servers running

---

### Deep (--deep)
```
/health-audit --deep
```
Everything in Standard, plus exhaustive code review.

**Additional checks:**
- **Full E2E all pages:**
  - Every route in the app
  - All CRUD operations
  - Edge cases (empty states, errors, loading)
- **Line-by-line code review:**
  - Read every component file
  - Check for anti-patterns
  - Security review of auth code
  - Check all API routes for proper validation
- **Database analysis:**
  - Check for missing indexes
  - Identify N+1 query patterns
  - Review schema for issues
- **Security deep scan:**
  - Check all routes for auth
  - Look for injection vulnerabilities
  - Review error handling for info leaks
  - Check rate limiting coverage
- **Full Lighthouse on all pages**
- **Mobile responsive check:**
  - Key pages at 375px, 768px, 1280px viewports

**Time:** 2-4 hours | **Cost:** ~$50

**Requires:** Frontend and backend servers running

---

## Tier Comparison

| Check | Quick | Standard | Deep |
|-------|:-----:|:--------:|:----:|
| Test suites | Yes | Yes | Yes |
| npm audit/outdated | Yes | Yes | Yes |
| Pattern grep (colors, console.log) | Yes | Yes | Yes |
| Documentation accuracy | Yes | Yes | Yes |
| Accessibility (pattern-based) | Yes | Yes | Yes |
| Dead code detection | Yes | Yes | Yes |
| Security review (static) | Yes | Yes | Yes |
| Code quality scan | Yes | Yes | Yes |
| Dependency health | Yes | Yes | Yes |
| E2E key flows (5-7 flows) | - | Yes | Yes |
| Lighthouse (5 pages) | - | Yes | Yes |
| Accessibility (real DOM) | - | Yes | Yes |
| Console error capture | - | Yes | Yes |
| E2E all pages | - | - | Yes |
| Line-by-line code review | - | - | Yes |
| Database analysis | - | - | Yes |
| Security deep scan | - | - | Yes |
| Lighthouse all pages | - | - | Yes |
| Mobile responsive check | - | - | Yes |

---

## Modes

### audit-only (Default)
```
/health-audit              # Quick audit only
/health-audit --standard   # Standard audit only
/health-audit --deep       # Deep audit only
```
Generates a comprehensive report without making any changes.

### audit-and-fix
```
/health-audit --fix              # Quick audit, then fix
/health-audit --standard --fix   # Standard audit, then fix
/health-audit --deep --fix       # Deep audit, then fix
```
Generates report, then fixes critical and high priority issues with monitoring agents.

---

## Expected Duration

| Tier | Audit Only | Audit + Fix |
|------|-----------|-------------|
| Quick | 30-45 min | 45-90 min |
| Standard | 1-2 hours | 2-3 hours |
| Deep | 2-4 hours | 4-6 hours |

Fix time varies based on number of issues found.

---

## Arguments

| Argument | Effect |
|----------|--------|
| (none) | Quick audit only, generate report |
| `--standard` | Standard tier with E2E and Lighthouse |
| `--deep` | Deep tier with full code review |
| `--fix` | After audit, fix critical/high issues with monitoring |

Arguments can be combined: `/health-audit --deep --fix`

---

## Example Usage

```
# Quick audit (default) - no servers needed
/health-audit

# Quick audit with fixes
/health-audit --fix

# Standard audit with browser testing
/health-audit --standard

# Standard audit with fixes
/health-audit --standard --fix

# Deep comprehensive audit
/health-audit --deep

# Deep audit with fixes (longest, most thorough)
/health-audit --deep --fix
```

---

## Prerequisites Check

### Quick Tier
No prerequisites - runs against static files only.

### Standard and Deep Tiers

**BEFORE starting, verify servers are running:**

```bash
# Check if frontend is running (port 5173)
curl -s http://localhost:5173 > /dev/null && echo "Frontend OK" || echo "Frontend NOT running"

# Check if backend is running (port 5000)
curl -s http://localhost:5000/api/health > /dev/null && echo "Backend OK" || echo "Backend NOT running"
```

**If servers aren't running:**
1. Inform user: "Standard/Deep tier requires running servers. Would you like me to start them, or fall back to Quick tier?"
2. If user approves starting servers:
   ```bash
   # Terminal 1 - Start backend
   cd myBrain-api && npm run dev &

   # Terminal 2 - Start frontend
   cd myBrain-web && npm run dev &

   # Wait for servers to be ready (30 seconds)
   sleep 30
   ```
3. If user prefers fallback: Run Quick tier instead

---

## Process Overview

```
+----------------------------------------------------------------------+
|                    PHASE 1: AUDIT                                     |
+----------------------------------------------------------------------+
|                                                                       |
|  1. Create progress file immediately                                  |
|  2. [Standard/Deep] Verify servers are running                        |
|  3. Launch audit agents (parallel where possible)                     |
|     - Quick: 9 static analysis agents                                 |
|     - Standard: + E2E agents, Lighthouse agent, Console agent         |
|     - Deep: + Full review agents, Database agent, Security agent      |
|  4. Update progress file as each section completes                    |
|  5. Generate prioritized recommendations                              |
|                                                                       |
+----------------------------------------------------------------------+
|                    PHASE 2: FIX (--fix mode only)                     |
+----------------------------------------------------------------------+
|                                                                       |
|  1. Review critical/high issues                                       |
|  2. Launch fix agents (parallel when independent)                     |
|  3. Launch monitoring agents (MANDATORY)                              |
|  4. Final verification: run full test suite + build                   |
|                                                                       |
+----------------------------------------------------------------------+
```

---

## Phase 1: Audit

### Step 1: Initialize Progress File

**IMMEDIATELY** create the report file so progress is visible:

```bash
# Create report file with timestamp
REPORT_FILE=".claude/overnight-audit-$(date +%Y-%m-%d).md"
```

Write initial content:
```markdown
# Health Audit

**Date:** [date]
**Tier:** [Quick/Standard/Deep]
**Status:** In Progress
**Started:** [timestamp]

---

## Progress

| Section | Status | Findings |
|---------|--------|----------|
| Test Suite & Coverage | Pending | - |
| Dead Code Detection | Pending | - |
| Design System Compliance | Pending | - |
| Documentation Accuracy | Pending | - |
| Accessibility Issues | Pending | - |
| Backend Security Review | Pending | - |
| Code Quality Issues | Pending | - |
| Dependency Health | Pending | - |
| [Standard+] E2E Key Flows | Pending | - |
| [Standard+] Lighthouse Performance | Pending | - |
| [Standard+] Console Errors | Pending | - |
| [Deep] Full Code Review | Pending | - |
| [Deep] Database Analysis | Pending | - |
| [Deep] Mobile Responsive | Pending | - |
| Recommendations | Pending | - |

---

## Detailed Findings

*Sections will appear below as they complete...*
```

**Update this file after EACH section completes.**

---

### Step 2: Launch Audit Agents

Use Opus model for all audit agents (quality matters for analysis).

#### Core Agents (All Tiers)

##### Agent 1: Test Suite & Coverage

```
Analyze test health for myBrain project:

1. Run frontend tests:
   cd myBrain-web && npm test -- --run 2>&1

2. Run backend tests (IMPORTANT: use --maxWorkers=1 on Windows to avoid crashes):
   cd myBrain-api && npm test -- --maxWorkers=1 2>&1

3. Get coverage reports:
   cd myBrain-web && npm run test:coverage -- --run 2>&1 | tail -100
   cd myBrain-api && npm run test:coverage -- --maxWorkers=1 2>&1 | tail -100

4. Identify:
   - Failing tests (list each with file and reason)
   - Skipped tests (list each)
   - Coverage gaps (files with <50% coverage)
   - Routes/components without any tests

Return:
- Test pass/fail counts
- Coverage percentages (lines, branches, functions)
- List of failures with details
- Priority files needing tests
```

##### Agent 2: Dead Code Detection

```
Find unused code in myBrain project:

1. Find exports never imported:
   - List exported functions/components not imported anywhere
   - Check both frontend and backend

2. Find unused files:
   - Files not imported by any other file
   - Exclude entry points and config files

3. Find commented-out code blocks (>5 lines)

4. Find unused variables (check ESLint if available)

5. Find unused dependencies:
   - Packages in package.json not imported anywhere

Return:
- Unused exports (file:export name)
- Orphaned files
- Large commented blocks
- Unused dependencies

Note: Mark items as "PLANNED FEATURE" if they appear intentional
```

##### Agent 3: Design System Compliance

```
Audit UI code against design system (.claude/design/design-system.md):

1. Hardcoded colors:
   - Find hex colors, rgb(), etc. in JSX/CSS
   - Should use CSS variables from theme.css

   ACCEPTABLE EXCEPTIONS (don't flag these):
   - SVG decorative elements (gradients, illustrations)
   - Chart/graph libraries (Recharts colors)
   - User-selectable color palettes (task colors, tags)
   - Third-party component overrides that require inline styles

2. Inconsistent spacing:
   - Find hardcoded px values that should use spacing scale
   - Check for inconsistent padding/margin patterns

3. Typography violations:
   - Hardcoded font sizes outside the scale
   - Missing font-weight consistency

4. Component pattern violations:
   - Inline styles that should use design system classes
   - Non-standard component structures

Return:
- Violations by category
- File:line for each
- Severity (high/medium/low)
```

##### Agent 4: Documentation Accuracy

```
Verify documentation matches reality:

1. Check CLAUDE.md:
   - Do listed models exist in myBrain-api/src/models/?
   - Do listed routes exist in myBrain-api/src/routes/?
   - Do listed components exist in myBrain-web/src/components/?
   - Do listed hooks exist in myBrain-web/src/hooks/?

2. Check .claude/docs/architecture.md (if exists):
   - Same checks as above

3. Check .claude/docs/environment.md (if exists):
   - Are documented env vars actually used?
   - Are there undocumented env vars?

4. Check skills documentation:
   - Do skills in SKILLS.md have SKILL.md files?
   - Are skill descriptions accurate?

Return:
- Documented but missing items
- Undocumented but existing items
- Stale/incorrect descriptions
```

##### Agent 5: Accessibility Issues (Pattern-Based)

```
Audit frontend for accessibility compliance:

1. Missing alt text:
   - Images without alt attributes
   - Icons without aria-labels

2. Missing ARIA:
   - Interactive elements without proper roles
   - Missing aria-expanded, aria-controls, etc.

3. Keyboard navigation:
   - Click handlers without keyboard equivalents
   - Missing tabindex where needed

4. Color contrast:
   - Text colors that may fail contrast checks
   - Focus indicators that may be invisible

5. Touch targets:
   - Buttons/links smaller than 44x44px

   ACCEPTABLE EXCEPTION:
   - Using invisible expanded touch area technique (padding/pseudo-element)

6. Form accessibility:
   - Inputs without labels
   - Missing error announcements

Return:
- Issues by category with file:line
- WCAG level violated (A, AA, AAA)
- Severity (critical/high/medium/low)
```

##### Agent 6: Backend Security Review

```
Security audit for myBrain-api:

1. Authentication gaps:
   - Routes missing requireAuth middleware
   - Routes that should have requireAdmin but don't
   - JWT configuration review

2. Input validation:
   - Routes accepting user input without validation
   - Missing sanitization on text fields
   - NoSQL injection vulnerabilities

3. Authorization checks:
   - Routes that access resources without ownership verification
   - Missing user.id checks on queries

4. Sensitive data exposure:
   - Passwords or tokens in responses
   - Overly verbose error messages
   - Debug info in production responses

5. Rate limiting:
   - Auth endpoints without rate limits
   - Expensive operations without throttling

6. Secret handling:
   - Hardcoded secrets in code
   - Secrets in logs

Return:
- Vulnerabilities by severity (critical/high/medium/low)
- Specific route:line for each issue
- Recommended fix approach
```

##### Agent 7: Code Quality Issues

```
Analyze code quality across the codebase:

1. Console statements:
   - console.log/debug/info in production code
   - Exclude test files

2. TODO/FIXME inventory:
   - List all with file:line and content
   - Flag old TODOs (if date available)

3. Complexity issues:
   - Files over 300 lines
   - Functions over 50 lines
   - Deeply nested conditionals (>3 levels)

4. Code duplication:
   - Similar code blocks in multiple places
   - Components that should share code

5. Error handling:
   - Empty catch blocks
   - Swallowed errors
   - Missing error boundaries

6. Type safety (if TypeScript):
   - Any types that should be specific
   - Missing type annotations

Return:
- Issues by category
- File:line for each
- Priority for fixing
```

##### Agent 8: Dependency Health

```
Analyze dependencies for both projects:

1. Outdated packages:
   cd myBrain-web && npm outdated 2>&1
   cd myBrain-api && npm outdated 2>&1

2. Security vulnerabilities:
   cd myBrain-web && npm audit 2>&1
   cd myBrain-api && npm audit 2>&1

3. Unused dependencies:
   - Packages in package.json not imported anywhere

4. Duplicate dependencies:
   - Same package at multiple versions

5. License issues:
   - Packages with restrictive licenses

Return:
- Outdated packages (current vs latest, breaking changes)
- Vulnerabilities by severity
- Unused packages
- License concerns
```

##### Agent 9: Generate Recommendations

**Run AFTER agents 1-8 complete.**

```
Review all findings and generate prioritized recommendations:

1. Critical (Fix immediately):
   - Security vulnerabilities
   - Failing tests blocking development
   - Data integrity risks

2. High (Fix this week):
   - Accessibility violations (WCAG A)
   - Dead code causing confusion
   - Documentation inaccuracies

3. Medium (Fix this month):
   - Code quality issues
   - Design system violations
   - Test coverage gaps

4. Low (Fix when convenient):
   - Minor style inconsistencies
   - Optimization opportunities
   - Nice-to-have improvements

For each recommendation:
- Specific action to take
- Files affected
- Estimated effort (quick/medium/large)
- Why it matters
```

---

#### Standard Tier Agents (--standard)

Launch these IN ADDITION to Core Agents.

##### Agent S1: E2E Key Flows

**Requires servers running. Uses agent-browser.**

```
Test critical user flows using agent-browser.

Test Credentials (from .claude/credentials.json):
- Regular user: claude-test-user@mybrain.test
- Admin user: claude-test-admin@mybrain.test

Agent-Browser Command Pattern:
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude <command>

FLOWS TO TEST:

1. LOGIN FLOW:
   - Open http://localhost:5173/login
   - snapshot -i to get form refs
   - Fill email and password
   - Click login button
   - Verify redirect to dashboard
   - Check for console errors

2. DASHBOARD LOAD:
   - Verify dashboard renders
   - Check all widgets load
   - No console errors

3. CREATE TASK:
   - Navigate to tasks
   - Click add task button
   - Fill task details
   - Submit
   - Verify task appears in list

4. EDIT TASK:
   - Click on existing task
   - Modify details
   - Save
   - Verify changes persisted

5. DELETE TASK:
   - Click delete on a test task
   - Confirm deletion
   - Verify task removed

6. CREATE NOTE:
   - Navigate to notes
   - Create new note
   - Add content
   - Verify saves

7. SETTINGS PAGE:
   - Navigate to settings
   - Verify all sections load
   - Check form interactions work

For each flow, report:
- Pass/Fail status
- Any console errors captured
- Screenshot path if failure
- Time taken
```

##### Agent S2: Lighthouse Performance

**Requires servers running.**

```
Run Lighthouse performance audits on 5 key pages.

Pages to audit:
1. Dashboard: http://localhost:5173/
2. Tasks list: http://localhost:5173/tasks
3. Notes list: http://localhost:5173/notes
4. Calendar: http://localhost:5173/calendar
5. Settings: http://localhost:5173/settings

For each page, capture:
- Performance score (0-100)
- First Contentful Paint
- Largest Contentful Paint
- Time to Interactive
- Cumulative Layout Shift
- Total Blocking Time

Use Chrome DevTools Protocol or Lighthouse CLI if available.
If not available, use agent-browser to navigate and collect basic timing metrics.

Report:
- Scores for each page
- Pages with score < 50 (critical)
- Pages with score < 80 (warning)
- Top 3 recommendations per page
```

##### Agent S3: Real Accessibility Scan

**Requires servers running. Uses agent-browser.**

```
Perform real DOM accessibility analysis on each page.

Agent-Browser Command Pattern:
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude <command>

Pages to scan:
1. Login page
2. Dashboard
3. Tasks list
4. Notes list
5. Calendar
6. Settings
7. Profile

For each page:
1. Navigate to page
2. Run console command to check for axe-core violations (if available)
3. Otherwise, manually check:
   - All images have alt text
   - All buttons have accessible names
   - Focus order makes sense (tab through)
   - Color contrast appears adequate
   - Forms have labels

Report per page:
- Number of violations
- Violation details (element, rule, impact)
- WCAG level (A, AA, AAA)

This is MORE thorough than pattern-based grep because it sees the actual rendered DOM.
```

##### Agent S4: Console Error Collection

**Requires servers running. Uses agent-browser.**

```
Visit every main page and capture console errors.

Agent-Browser Command Pattern:
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude <command>

Pages to visit:
1. Login
2. Dashboard
3. Tasks
4. Notes
5. Projects
6. Calendar
7. Settings
8. Profile
9. Admin (if admin user)

For each page:
1. Navigate to page
2. Wait for load (3 seconds)
3. Run: console
4. Capture any errors or warnings

Report:
- Page-by-page console output
- Count of errors per page
- Count of warnings per page
- Unique error messages (deduplicated)
```

---

#### Deep Tier Agents (--deep)

Launch these IN ADDITION to Core and Standard Agents.

##### Agent D1: Full E2E All Pages

**Requires servers running. Uses agent-browser.**

```
Comprehensive E2E testing of EVERY route and feature.

Test ALL routes from the router:
- /login
- /signup
- /
- /dashboard
- /tasks
- /tasks/:id
- /notes
- /notes/:id
- /projects
- /projects/:id
- /calendar
- /files
- /images
- /inbox
- /messages
- /notifications
- /settings
- /profile
- /admin/*

For each route:
1. Navigate and verify loads
2. Test all CRUD operations available
3. Test empty states
4. Test error states (disconnect network briefly)
5. Test loading states
6. Check mobile viewport (375px)

Report:
- Complete route coverage matrix
- Pass/fail per route
- Issues found with screenshots
```

##### Agent D2: Line-by-Line Code Review

```
Thorough code review of every file.

FRONTEND (myBrain-web/src/):
For each component file:
- Check for anti-patterns
- Verify prop types or TypeScript types
- Check for memory leaks (missing cleanup)
- Review useEffect dependencies
- Check for unnecessary re-renders
- Verify error boundaries exist

BACKEND (myBrain-api/src/):
For each route file:
- Verify all routes have auth middleware
- Check input validation exists
- Verify ownership checks on resources
- Check error handling is complete
- Verify logging follows Wide Events pattern

AUTH CODE SPECIAL REVIEW:
- auth.js middleware
- auth routes
- JWT configuration
- Password handling

Report:
- Issues by file with line numbers
- Severity ratings
- Specific fix recommendations
```

##### Agent D3: Database Analysis

```
Analyze MongoDB schema and query patterns.

1. SCHEMA REVIEW:
   Read all files in myBrain-api/src/models/
   For each model:
   - Check for missing indexes on queried fields
   - Check for proper field types
   - Verify required fields are marked
   - Check for data integrity constraints

2. QUERY PATTERN ANALYSIS:
   Read all route and service files
   For each database query:
   - Identify potential N+1 queries
   - Check for missing .lean() on read queries
   - Verify pagination is implemented
   - Check for unbounded queries

3. INDEX RECOMMENDATIONS:
   Based on query patterns, suggest indexes for:
   - Frequently queried fields
   - Sort fields
   - Compound queries

Report:
- Missing indexes with impact
- N+1 query locations
- Schema improvement suggestions
```

##### Agent D4: Security Deep Scan

```
Exhaustive security audit.

1. AUTH CHECK ALL ROUTES:
   List every route in myBrain-api/src/routes/
   For each:
   - Does it require auth? Should it?
   - Does it check resource ownership?
   - Are there any bypass possibilities?

2. INJECTION VULNERABILITIES:
   Check for:
   - MongoDB operator injection ($where, $regex unescaped)
   - Eval usage
   - Dynamic property access with user input
   - Template injection

3. ERROR HANDLING:
   Check every catch block:
   - Does it expose stack traces?
   - Does it leak internal details?
   - Are errors properly logged?

4. RATE LIMITING:
   - Are login routes limited?
   - Are signup routes limited?
   - Are expensive operations limited?
   - Is there global rate limiting?

5. DATA EXPOSURE:
   Check every response:
   - Are passwords ever included?
   - Are tokens ever in response body?
   - Are other users' private data exposed?

Report:
- Vulnerabilities by severity (critical/high/medium/low)
- Specific locations with proof
- Remediation steps
```

##### Agent D5: Mobile Responsive Check

**Requires servers running. Uses agent-browser.**

```
Check key pages at three viewports.

Agent-Browser Command Pattern:
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude <command>

Viewports:
- Mobile: 375 x 812
- Tablet: 768 x 1024
- Desktop: 1280 x 800

Pages to check:
1. Dashboard
2. Tasks list
3. Notes list
4. Calendar
5. Settings
6. Task detail panel
7. Note editor

For each page at each viewport:
1. Set viewport: set viewport <width> <height>
2. Navigate to page
3. Take screenshot: screenshot .claude/design/screenshots/responsive-[page]-[viewport].png
4. Check for:
   - Horizontal overflow
   - Overlapping elements
   - Unreadable text (too small)
   - Inaccessible buttons (off-screen)
   - Navigation usability

Report:
- Screenshot paths
- Issues per page per viewport
- Recommended CSS fixes
```

---

### Step 3: Update Progress File

After EACH agent completes, update the progress table:

```markdown
| Test Suite & Coverage | Complete | 3 failures, 45% coverage |
```

And add detailed findings section:

```markdown
## Test Suite & Coverage

**Status:** Complete
**Time:** [X minutes]

### Summary
- Frontend: 47 tests, 2 failures
- Backend: 23 tests, 1 failure
- Coverage: 45% lines, 38% branches

### Failures
1. `TasksListSkeleton.test.jsx` - Expected element not found
2. ...

### Priority Files Needing Tests
1. `myBrain-api/src/routes/tasks.js` - Most used, no tests
2. ...
```

---

### Step 4: Final Report Structure

After all agents complete, update file with final summary:

```markdown
# Health Audit

**Date:** [date]
**Tier:** [Quick/Standard/Deep]
**Status:** Complete
**Duration:** [X minutes]

---

## Executive Summary

[2-3 sentences about overall health in plain English]

---

## Health Score: X/100

| Category | Score | Status |
|----------|-------|--------|
| Test Suite | X/15 | [status] |
| Dead Code | X/10 | [status] |
| Design System | X/10 | [status] |
| Documentation | X/10 | [status] |
| Accessibility | X/15 | [status] |
| Security | X/20 | [status] |
| Code Quality | X/10 | [status] |
| Dependencies | X/10 | [status] |

[Standard/Deep only:]
| E2E Flows | X/10 | [status] |
| Performance | X/10 | [status] |

---

## Issues by Priority

### Critical (X issues)
[List with file:line]

### High (X issues)
[List with file:line]

### Medium (X issues)
[List]

### Low (X issues)
[List]

---

## Recommendations

[From Agent 9]

---

## Detailed Findings

[Sections from each agent]

---

*Generated by /health-audit skill*
```

---

## Phase 2: Fix Implementation (--fix mode only)

### Prerequisites

Only proceed to fixes if:
1. Audit phase completed successfully
2. User requested `--fix` mode
3. Critical or high priority issues exist

### Step 1: Review and Plan

Present fix plan to user (even in overnight mode, log it):

```markdown
## Fix Plan

Will fix X critical and Y high priority issues:

### Critical Fixes
1. [Issue] - [approach]
2. [Issue] - [approach]

### High Priority Fixes
1. [Issue] - [approach]
2. [Issue] - [approach]

Skipping:
- [Issue] - [reason: acceptable exception / requires manual review / etc.]
```

### Step 2: Launch Fix Agents

**Model selection for fixes:**
- Use Opus for complex fixes (security, architecture)
- Can use Sonnet for simple fixes (console.log removal, typos, adding alt text)

**Parallel vs Sequential:**
- Independent fixes run in parallel (e.g., fixing frontend a11y while fixing backend security)
- Dependent fixes run sequentially (e.g., fix before adding tests for the fix)

### Step 3: Launch Monitoring Agents (MANDATORY)

**Every fix implementation MUST have monitoring agents:**

```
Launch 2 monitoring agents:

FRONTEND MONITOR:
- Watch frontend fix agents
- Verify changes follow design system
- Check for TypeScript/lint errors
- Ensure no regression in test files
- Report issues immediately

BACKEND MONITOR:
- Watch backend fix agents
- Verify auth patterns followed
- Check for security best practices
- Ensure logging compliance
- Report issues immediately
```

**Monitoring agents run in parallel with fix agents, observing output.**

### Step 4: Fix Retry Protocol

For each fix:
1. **Attempt 1:** Apply fix
2. **Verify:** Run relevant tests
3. **If failed - Attempt 2:** Adjust approach based on failure
4. **Verify:** Run relevant tests
5. **If failed again:** Escalate - add to "Needs Manual Review" section

Maximum 2 retry attempts per fix. Don't burn cycles on stubborn issues.

### Step 5: Final Verification (MANDATORY)

After ALL fixes complete, run full verification:

```bash
# Frontend verification
cd myBrain-web && npm test -- --run && npm run build

# Backend verification (use --maxWorkers=1 on Windows)
cd myBrain-api && npm test -- --maxWorkers=1

# Check for lint errors
cd myBrain-web && npm run lint 2>&1 || true
```

**Success criteria:**
- All tests pass
- Build succeeds
- No new lint errors introduced

**If verification fails:**
- Identify which fix caused the issue
- Revert that specific fix
- Add to "Needs Manual Review"
- Re-run verification

### Step 6: Update Report

Add fix results to the report:

```markdown
---

## Fix Results

**Mode:** audit-and-fix
**Fixes Attempted:** X
**Fixes Successful:** Y
**Fixes Failed/Skipped:** Z

### Successful Fixes
1. [What was fixed] - [files changed]
2. ...

### Needs Manual Review
1. [Issue] - [why automatic fix failed]
2. ...

### Verification
- Frontend tests: PASS/FAIL
- Backend tests: PASS/FAIL
- Build: PASS/FAIL

---
```

---

## Known Acceptable Exceptions

Don't flag these as issues:

### Hardcoded Colors
- **SVG decorative elements:** Gradients, illustrations that are fixed designs
- **Chart libraries:** Recharts, D3, etc. require their own color configs
- **User-selectable palettes:** Task colors, tag colors, avatar backgrounds
- **Third-party overrides:** When inline styles are the only way to customize

### Touch Targets
- **Invisible expansion technique:** Using padding or ::before/::after to expand touch area while keeping visual size

### Unused Code
- **PLANNED FEATURE comments:** Code marked for future use
- **Feature flags:** Code behind disabled feature flags
- **Utility functions:** Generic utilities that may not be used yet

### Test Skips
- **Environment-specific:** Tests that only work in certain environments
- **Flaky tests:** Tests marked skip with "flaky" comment pending fix

---

## Output Location

Reports are saved to:
```
.claude/overnight-audit-YYYY-MM-DD.md
```

---

## Success Criteria

### Audit Phase
- All sections for chosen tier completed
- Progress file updated throughout
- Clear prioritization of issues
- Actionable recommendations

### Fix Phase (if --fix)
- Monitoring agents ran for all fixes
- Final verification passed
- No regressions introduced
- Clear log of what was changed and what needs manual review

---

## Completion Output

```
Health Audit Complete

Tier: [Quick/Standard/Deep]
Mode: [audit-only / audit-and-fix]
Duration: [X minutes]
Health Score: [X/100]

Critical: X | High: Y | Medium: Z | Low: W

[If --fix mode:]
Fixes Applied: X/Y successful
Verification: PASS/FAIL

Report: .claude/overnight-audit-YYYY-MM-DD.md

[Next steps or "Codebase is healthy!"]
```

---

## Post-Completion: Update Tracking (MANDATORY)

After the audit completes, you MUST update the Audit Tracking table in `.claude/memory.md`:

1. **Find the `## Audit Tracking` section** in memory.md

2. **Add a new row to the history table:**
   ```markdown
   | YYYY-MM-DD | /health-audit | [Brief key issues summary] | `.claude/overnight-audit-YYYY-MM-DD.md` |
   ```

3. **Update the "Last Audit" and "Next Suggested" lines:**
   ```markdown
   **Last Audit:** YYYY-MM-DD ([tier] tier via /health-audit)
   **Next Suggested:** [next month 1st] or after major feature completion
   ```

**Why this is mandatory:** Future Claude sessions need to know when audits were run to:
- Avoid suggesting redundant audits
- Track trends over time
- Know where to find previous reports

**Example update:**
```markdown
| 2026-02-15 | /health-audit | Test failures fixed, 2 security issues | `.claude/overnight-audit-2026-02-15.md` |
```

This ensures operational knowledge persists across sessions.
