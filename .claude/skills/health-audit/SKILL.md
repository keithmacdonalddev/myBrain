---
name: health-audit
description: Comprehensive overnight codebase audit with optional fix implementation and monitoring
---

# Health Audit Skill

Run a comprehensive codebase audit covering 9 quality dimensions. Designed for overnight runs with optional automatic fix implementation.

## When to Use

- **Overnight audits** - Run before bed, wake up to a healthier codebase
- **Before releases** - Full quality check before deploying major changes
- **Periodic health checks** - Weekly or monthly comprehensive review
- **After major refactors** - Verify nothing regressed

## Modes

### audit-only (Default)
```
/health-audit
```
Generates a comprehensive report without making any changes.

### audit-and-fix
```
/health-audit --fix
```
Generates report, then fixes critical and high priority issues with monitoring agents.

---

## Expected Duration

Based on testing:
- **Audit only:** 30-45 minutes
- **Audit + fix:** 45-90 minutes (depends on number of issues)

The skill is designed for "before bed" runs, not true overnight execution.

---

## Process Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: AUDIT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Create progress file immediately                             │
│  2. Launch 9 parallel audit agents                               │
│  3. Update progress file as each section completes               │
│  4. Generate prioritized recommendations                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    PHASE 2: FIX (--fix mode only)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Review critical/high issues                                  │
│  2. Launch fix agents (parallel when independent)                │
│  3. Launch monitoring agents (MANDATORY)                         │
│  4. Final verification: run full test suite + build              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
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
# Overnight Health Audit

**Date:** [date]
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
| Recommendations | Pending | - |

---

## Detailed Findings

*Sections will appear below as they complete...*
```

**Update this file after EACH section completes.**

---

### Step 2: Launch 9 Parallel Audit Agents

Use Opus model for all audit agents (quality matters for analysis).

#### Agent 1: Test Suite & Coverage

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

#### Agent 2: Dead Code Detection

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

#### Agent 3: Design System Compliance

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

#### Agent 4: Documentation Accuracy

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

#### Agent 5: Accessibility Issues

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

#### Agent 6: Backend Security Review

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

#### Agent 7: Code Quality Issues

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

#### Agent 8: Dependency Health

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

#### Agent 9: Generate Recommendations

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
# Overnight Health Audit

**Date:** [date]
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
- All 9 sections completed
- Progress file updated throughout
- Clear prioritization of issues
- Actionable recommendations

### Fix Phase (if --fix)
- Monitoring agents ran for all fixes
- Final verification passed
- No regressions introduced
- Clear log of what was changed and what needs manual review

---

## Arguments

| Argument | Effect |
|----------|--------|
| (none) | Audit only, generate report |
| `--fix` | Audit, then fix critical/high issues with monitoring |
| `--quick` | Skip low-priority checks (deps license, WCAG AAA) |

---

## Example Usage

```
# Full overnight audit
/health-audit

# Audit and fix critical issues
/health-audit --fix

# Quick audit before release
/health-audit --quick
```

---

## Completion Output

```
Health Audit Complete

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
