---
name: audit-now
description: Run comprehensive QA audit with actionable recommendations
---

# Comprehensive Audit Skill

Run a full QA audit covering all aspects of code health. Uses parallel agents for efficiency.

## When This Runs

**Automatic reminders** (check `.claude/memory.md` triggers):
- After 5 sessions without an audit
- After major feature completion
- If last audit was >7 days ago

## Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT ORCHESTRATOR                        │
├─────────────────────────────────────────────────────────────┤
│  Launch 6 parallel agents:                                   │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Coverage │ │ Security │ │ Deps     │                     │
│  │ Agent    │ │ Agent    │ │ Agent    │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Quality  │ │ Perf     │ │ Design   │                     │
│  │ Agent    │ │ Agent    │ │ Agent    │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  Consolidate results → Generate report → Offer fixes        │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Check Last Audit

Before starting, check when audit was last run:

```bash
grep -A2 "Last Audit" .claude/audit-tracking.md 2>/dev/null || echo "No previous audit found"
```

---

## Step 2: Launch Parallel Agents

Use the Task tool to launch these 6 agents simultaneously:

### Agent 1: Coverage Analysis
```
Analyze test coverage for myBrain project:

1. Run frontend coverage:
   cd myBrain-web && npm run test:coverage -- --run 2>&1 | tail -50

2. Run backend coverage:
   cd myBrain-api && npm run test:coverage 2>&1 | tail -50

3. Parse coverage-summary.json files for percentages

4. List untested files:
   - Backend routes without .test.js files
   - Key frontend components without tests

5. Return structured summary:
   - Frontend: lines%, branches%, functions%
   - Backend: lines%, branches%, functions%
   - Top 5 untested high-priority files
   - Trend vs last audit (if available)
```

### Agent 2: Security Scan
```
Run security analysis on myBrain project:

1. npm audit both projects:
   cd myBrain-web && npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'
   cd myBrain-api && npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities'

2. Check for secrets in code:
   grep -rE "(password|secret|api_key|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]" myBrain-*/src --include="*.js" --include="*.jsx" | grep -v test | grep -v node_modules

3. Check auth middleware coverage:
   - List routes missing requireAuth
   - List routes with requireAdmin

4. Check for common vulnerabilities:
   - SQL/NoSQL injection patterns
   - XSS opportunities (dangerouslySetInnerHTML)
   - Unvalidated redirects

5. Return structured summary:
   - Vulnerability counts by severity
   - Secrets found (file:line, redacted)
   - Auth coverage gaps
   - OWASP issues found
```

### Agent 3: Dependency Health
```
Analyze dependencies for myBrain project:

1. Check outdated packages:
   cd myBrain-web && npm outdated --json 2>/dev/null | head -50
   cd myBrain-api && npm outdated --json 2>/dev/null | head -50

2. Check for unused dependencies:
   - Compare package.json to actual imports
   - Flag packages not imported anywhere

3. Check for duplicate dependencies:
   npm ls --all 2>/dev/null | grep -E "deduped|invalid"

4. Return structured summary:
   - Major version updates available
   - Potentially unused packages
   - Duplicate/conflicting versions
```

### Agent 4: Code Quality
```
Analyze code quality for myBrain project:

1. Console statements:
   grep -r "console\.(log|debug|info)" myBrain-*/src --include="*.js" --include="*.jsx" | grep -v test | grep -v node_modules | wc -l

2. TODO/FIXME inventory:
   grep -rn "TODO\|FIXME\|HACK\|XXX" myBrain-*/src --include="*.js" --include="*.jsx" | grep -v node_modules

3. Large files (>300 lines):
   find myBrain-*/src -name "*.js" -o -name "*.jsx" | xargs wc -l | sort -rn | head -15

4. Complex functions (crude heuristic - functions >50 lines):
   Check for long function bodies

5. Dead code detection:
   - Exported functions never imported
   - Unused variables (if ESLint available)

6. ESLint errors (if configured):
   cd myBrain-web && npm run lint 2>&1 | tail -30

7. Return structured summary:
   - Console.log count and locations
   - TODO list with file:line
   - Large files list
   - ESLint error count
```

### Agent 5: Performance Analysis
```
Analyze performance concerns for myBrain project:

1. Bundle analysis (if build exists):
   - Check dist folder sizes
   - Identify largest chunks

2. Large imports:
   grep -r "import.*from" myBrain-web/src --include="*.jsx" | grep -E "lodash|moment|@mui"

3. N+1 query patterns:
   grep -rn "\.find\|\.findOne" myBrain-api/src --include="*.js" | grep -v test

4. Missing indexes (check models):
   grep -rn "index:" myBrain-api/src/models

5. Unoptimized React patterns:
   - Missing useCallback/useMemo on expensive operations
   - Large component re-renders

6. Return structured summary:
   - Bundle sizes
   - Heavy imports to consider
   - Potential N+1 queries
   - Missing indexes
```

### Agent 6: Design & Logging Compliance
```
Check design system and logging compliance:

1. Design system compliance:
   - Components using hardcoded colors vs theme
   - Inconsistent spacing values
   - Missing accessibility attributes

2. Wide Events logging compliance:
   - Routes missing attachEntityId
   - Routes missing req.eventName
   - Routes missing mutation context

3. Return structured summary:
   - Design violations count
   - Logging compliance percentage
   - Specific files needing attention
```

---

## Step 3: Consolidate Results

After all agents complete, combine into single report.

---

## Step 4: Generate Report

Save to `.claude/reports/YYYY-MM-DD-comprehensive-audit.md`:

```markdown
# Comprehensive Audit Report

**Date:** [date]
**Duration:** [X minutes]
**Type:** Full Audit (/audit-now)

---

## Health Score: X/100

| Category | Score | Status |
|----------|-------|--------|
| Test Coverage | X/20 | 🔴/🟡/🟢 |
| Security | X/25 | 🔴/🟡/🟢 |
| Dependencies | X/15 | 🔴/🟡/🟢 |
| Code Quality | X/20 | 🔴/🟡/🟢 |
| Performance | X/10 | 🔴/🟡/🟢 |
| Compliance | X/10 | 🔴/🟡/🟢 |

---

## Executive Summary

[2-3 sentences in plain English about overall health]

---

## 🔴 Critical Issues (Fix Now)

1. [Issue with specific file:line]
2. [Issue with specific file:line]

## 🟡 Important Issues (Fix This Week)

1. [Issue]
2. [Issue]

## 🟢 Minor Issues (Fix When Convenient)

1. [Issue]
2. [Issue]

---

## Detailed Findings

### Test Coverage
[Agent 1 results formatted]

### Security
[Agent 2 results formatted]

### Dependencies
[Agent 3 results formatted]

### Code Quality
[Agent 4 results formatted]

### Performance
[Agent 5 results formatted]

### Compliance
[Agent 6 results formatted]

---

## Trends

| Metric | Last Audit | This Audit | Change |
|--------|------------|------------|--------|
| Coverage | X% | Y% | +Z% |
| Vulnerabilities | X | Y | -Z |
| Console.logs | X | Y | -Z |

---

## Recommended Actions

### Immediate (Today)
- [ ] [Specific action]
- [ ] [Specific action]

### This Week
- [ ] [Specific action]
- [ ] [Specific action]

### This Month
- [ ] [Specific action]

---

*Generated by /audit-now skill*
```

---

## Step 5: Update Tracking

After generating report, update tracking file:

```bash
# Create or update .claude/audit-tracking.md
```

Content:
```markdown
# Audit Tracking

## Last Audit
- **Date:** [today's date]
- **Health Score:** X/100
- **Report:** .claude/reports/[filename].md

## History
| Date | Score | Key Issues |
|------|-------|------------|
| [date] | X/100 | [brief summary] |

## Next Audit
- **Suggested:** [date + 7 days]
- **Trigger:** After 5 sessions or major feature
```

---

## Step 6: Update Memory Triggers

Add to `.claude/memory.md` under "Pending Trigger Checks":

```markdown
| Audit reminder | [sessions since] | 5 sessions | Suggest /audit-now |
```

---

## Step 7: Offer Fixes

After presenting report:

```
Audit complete! Health Score: X/100

🔴 Critical issues found: [count]
🟡 Important issues: [count]

I can help fix these now. What would you like to tackle?

1. Fix critical security issues
2. Add tests for untested routes
3. Clean up console.logs and TODOs
4. Update outdated dependencies
5. Fix design/logging compliance

Or say "skip" to just keep the report.
```

---

## Quick Mode

If user says `/audit-now quick`:
- Skip agents 5 and 6 (performance, compliance)
- Only report critical/important issues
- Faster execution (~2 min vs ~5 min)

---

## Output Format

Always end with:

```
📋 Audit Complete

Health Score: X/100 [🔴/🟡/🟢]

Critical: X | Important: Y | Minor: Z

Report: .claude/reports/YYYY-MM-DD-comprehensive-audit.md
Last audit: [X days ago / First audit]

What should we fix first?
```
