---
name: audit-now
description: Run comprehensive QA audit with actionable recommendations
---

# Audit Now Skill

Run a full QA audit covering coverage, security, code quality, and provide actionable recommendations.

## Process

### 1. Coverage Analysis

Run coverage for both frontend and backend:

```bash
# Frontend
cd myBrain-web && npm run test:coverage -- --run 2>/dev/null

# Backend
cd myBrain-api && npm run test:coverage 2>/dev/null
```

Parse results:
```bash
# Get percentages
cat myBrain-web/coverage/coverage-summary.json 2>/dev/null | jq '.total'
cat myBrain-api/coverage/coverage-summary.json 2>/dev/null | jq '.total'
```

### 2. Security Scan

```bash
# npm audit for vulnerabilities
cd myBrain-web && npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'
cd ../myBrain-api && npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'
```

```bash
# Check for potential secrets in code
grep -rE "(password|secret|api_key|apikey|token)\s*[:=]\s*['\"][^'\"]+['\"]" myBrain-*/src --include="*.js" 2>/dev/null | grep -v test | grep -v node_modules | head -5
```

### 3. Code Quality Scan

```bash
# Console.logs in production code
grep -r "console.log" myBrain-api/src --include="*.js" 2>/dev/null | grep -v test | grep -v node_modules | wc -l

# TODO/FIXME comments
grep -rE "TODO|FIXME|HACK|XXX" myBrain-*/src --include="*.js" --include="*.jsx" 2>/dev/null | grep -v node_modules | wc -l

# Large files (over 300 lines)
find myBrain-*/src -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | xargs wc -l 2>/dev/null | sort -rn | head -10
```

### 4. Untested Code Inventory

```bash
# Backend routes without tests
echo "=== Untested Backend Routes ==="
for f in myBrain-api/src/routes/*.js; do
  base=$(basename "$f" .js)
  if [[ "$base" != *.test ]]; then
    test_file="${f%.js}.test.js"
    if [[ ! -f "$test_file" ]]; then
      echo "- $base.js"
    fi
  fi
done

# Frontend components without tests (sample)
echo "=== Sample Untested Components ==="
find myBrain-web/src/components -name "*.jsx" 2>/dev/null | head -10 | while read f; do
  test_file="${f%.jsx}.test.jsx"
  if [[ ! -f "$test_file" ]]; then
    echo "- $(basename $f)"
  fi
done
```

### 5. Auth Middleware Check

```bash
# Routes that might be missing auth
grep -L "requireAuth" myBrain-api/src/routes/*.js 2>/dev/null | grep -v test | grep -v auth.js
```

### 6. Generate Audit Report

Save to `.claude/reports/[DATE]-audit.md`:

```markdown
# QA Audit Report

**Date:** [date]
**Type:** Manual Audit (/audit-now)

## Executive Summary

[2-3 sentences in plain English]

Example: "Coverage is at 15%, up from where we started. Security
scan found 2 moderate vulnerabilities in dependencies that should
be reviewed. The main gap is the tasks and projects routes, which
are heavily used but have no tests."

## Coverage Status

| Area | Lines | Branches | Functions |
|------|-------|----------|-----------|
| Frontend | X% | Y% | Z% |
| Backend | X% | Y% | Z% |

**Current Phase:** 1 (Informational)
**Next Phase:** At 20% overall, will enable diff-coverage checks

## Security Findings

### Dependency Vulnerabilities

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 0 | - |
| High | 0 | - |
| Moderate | 2 | Review this week |
| Low | 5 | Fix when convenient |

### Code Security

- [ ] Potential secrets in code: [count found]
- [ ] Routes missing auth check: [list if any]

## Untested Code

### Backend Routes (X of Y untested)

**🔴 High Priority** (test these first):
| Route | Why Priority |
|-------|--------------|
| tasks.js | Core feature, heavily used |
| projects.js | Core feature |

**🟡 Medium Priority**:
- events.js
- files.js
- images.js

**🟢 Lower Priority**:
- admin.js
- logs.js
- analytics.js

### Frontend Components

[Count] components without tests.
Focus on: [list most important 3-5]

## Code Quality

| Metric | Count | Action |
|--------|-------|--------|
| Console.logs | X | Remove before production |
| TODO comments | Y | Review and address |
| Large files (>300 lines) | Z | Consider splitting |

## Recommendations

### This Week
1. **[Most impactful]** Add tests for tasks.js route
2. **[Quick win]** Run `npm audit fix` to resolve moderate vulnerabilities
3. **[Cleanup]** Remove console.logs from production code

### This Month
1. Add tests for remaining core routes (projects, events)
2. Review TODO comments and create issues for valid ones
3. Split large files if they're hard to maintain

### Long Term
1. Reach 40% coverage to enable floor enforcement
2. Add E2E tests for critical user flows
3. Set up visual regression testing

## Action Items

- [ ] Run `npm audit fix` in both folders
- [ ] Add auth triple tests to tasks.js
- [ ] Remove X console.logs from [files]
- [ ] Review TODO at [file:line]
```

### 7. Save Report

```bash
DATE=$(date +%Y-%m-%d)
# Report content saved to .claude/reports/$DATE-audit.md
```

### 8. Offer Next Steps

After generating the report, ask:

```
Audit complete! The report is saved at .claude/reports/[date]-audit.md

Want me to:
1. Start writing tests for [highest priority untested route]?
2. Fix the security vulnerabilities (`npm audit fix`)?
3. Clean up the console.logs?

Just let me know what to tackle first.
```

## Example Summary

```
📋 Audit Complete

**Coverage:** 15% (Frontend: 8%, Backend: 22%)
**Security:** 2 moderate vulnerabilities found
**Untested routes:** 25 of 27

**Top Priority:**
1. tasks.js - no tests, heavily used
2. npm audit fix - 2 moderate vulns

Report saved: .claude/reports/2024-01-24-audit.md

What should we tackle first?
```
