---
name: qa-status
description: Get current test coverage and code quality status with plain-English summary
---

# QA Status Skill

Generate a human-friendly QA status report showing coverage, test counts, and recommendations.

## Process

### 1. Run Coverage Reports

**Frontend:**
```bash
cd myBrain-web && npm run test:coverage -- --run 2>/dev/null
```

**Backend:**
```bash
cd myBrain-api && npm run test:coverage 2>/dev/null
```

### 2. Parse Coverage Results

Use the JSON output for accurate parsing:

```bash
# Frontend coverage percentage
cat myBrain-web/coverage/coverage-summary.json 2>/dev/null | jq '.total.lines.pct' || echo "N/A"

# Backend coverage percentage
cat myBrain-api/coverage/coverage-summary.json 2>/dev/null | jq '.total.lines.pct' || echo "N/A"
```

### 3. Count Test Files

```bash
# Frontend test files
find myBrain-web/src -name "*.test.js" -o -name "*.test.jsx" 2>/dev/null | grep -v node_modules | wc -l

# Backend test files
find myBrain-api/src -name "*.test.js" 2>/dev/null | grep -v node_modules | wc -l
```

### 4. Find Untested Routes

```bash
# Backend routes without tests
for f in myBrain-api/src/routes/*.js; do
  base=$(basename "$f" .js)
  if [[ "$base" != *.test ]]; then
    test_file="${f%.js}.test.js"
    if [[ ! -f "$test_file" ]]; then
      echo "$base"
    fi
  fi
done
```

### 5. Check Recent CI Status

```bash
gh run list --limit 3 --json status,conclusion,displayTitle 2>/dev/null || echo "GitHub CLI not available"
```

### 6. Generate Report

Provide a plain-English report:

```markdown
📊 QA Status Report
==================
Generated: [date]

## The Big Picture

[Plain English summary based on coverage level]

Coverage below 20%:
"Your test coverage is at X%. This is early days - we're building
up tests as we go. Focus on testing core features first."

Coverage 20-40%:
"Your test coverage is at X%. Making good progress! The main
flows are getting coverage. Consider enabling diff-coverage checks."

Coverage 40-60%:
"Your test coverage is at X%. Solid foundation! Most core paths
are tested. Focus on edge cases and error handling."

Coverage above 60%:
"Your test coverage is at X%. Great coverage! Focus on maintaining
quality, not just increasing the number."

## By the Numbers

| Area | Coverage | Test Files |
|------|----------|------------|
| Frontend | X% | Y files |
| Backend | X% | Y files |

## What's Not Tested Yet

**High Priority** (core features, used often):
- [ ] tasks.js route
- [ ] projects.js route

**Medium Priority** (test when you touch them):
- [ ] files.js route
- [ ] images.js route

**Lower Priority** (test eventually):
- [ ] admin.js route
- [ ] logs.js route

## Recent CI Runs

| Status | What |
|--------|------|
| ✅ Passed | "Update task validation" |
| ✅ Passed | "Add project filtering" |
| ❌ Failed | "Fix auth bug" - tests failed |

## Recommendation

[One actionable sentence]

Example: "Next time we work on tasks, let's add tests for
tasks.js - it's heavily used but has no tests yet."
```

### 7. If Commands Fail

If coverage commands don't work, provide:
- Manual file counts instead
- Clear explanation of what's missing
- How to set it up

```markdown
⚠️ Coverage tools not fully configured

**What I can tell you:**
- Frontend has X test files
- Backend has Y test files

**To enable coverage reports:**
Run `npm run test:coverage` in each folder to generate reports.
```

## Example Output

```markdown
📊 QA Status Report
==================
Generated: January 24, 2024

## The Big Picture

Your test coverage is at 15%. This is early days - we're building
up tests as we add features. The tests we have are focused on
auth and notes, which is a good start.

## By the Numbers

| Area | Coverage | Test Files |
|------|----------|------------|
| Frontend | 8% | 4 files |
| Backend | 22% | 2 files |

## What's Not Tested Yet

**High Priority:**
- [ ] tasks.js - Core feature, no tests
- [ ] projects.js - Core feature, no tests

**Medium Priority:**
- [ ] events.js
- [ ] files.js

## Recent CI Runs

| Status | What |
|--------|------|
| ✅ | Update checkpoint skill |
| ✅ | Add CI workflow |

## Recommendation

The tasks route is used constantly but has no tests.
Let's add tests for it in the next coding session.
```
