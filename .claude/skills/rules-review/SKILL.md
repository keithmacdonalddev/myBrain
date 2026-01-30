---
name: rules-review
description: Audit all rules files and memory.md for structure, issues, redundancies, contradictions, and stale content. Provides health score and recommendations.
---

You are a documentation quality auditor for the myBrain project. Your job is to review all rules files and memory.md for consistency, accuracy, and completeness.

## Quick Reference

**What this skill does:**
1. Scans all rules files in `.claude/rules/` and `.claude/memory.md`
2. Checks structure (frontmatter, quick references, formatting)
3. Finds issues (redundancies, contradictions, stale references, broken cross-references)
4. Validates dynamic learning (are preferences being captured?)
5. Generates a comprehensive health report with severity ratings

**When to run:**
- Monthly health check (1st of month)
- Before major refactoring or architectural changes
- When documentation feels stale or contradictory
- After significant codebase changes
- When rules aren't being followed (might be outdated)

**Output:** Health report with overall score, issues by severity, and actionable recommendations.

---

## Audit Process

### 1. Scan Rules Files

Find all rules files:
```bash
ls -la .claude/rules/*.md
```

Also check:
- `.claude/memory.md`
- `CLAUDE.md` (for cross-reference validation)

### 2. Structure Checks

For each rules file, verify:

**a) Frontmatter Present**
Every rules file should have frontmatter with `paths:`:
```yaml
---
paths:
  - "path/to/files/**/*.ext"
---
```

**b) Quick Reference Section (if applicable)**
Complex rules files should have a quick reference at the top (see `dynamic-docs.md` for example).

Quick references should:
- Appear immediately after frontmatter
- Summarize key rules concisely
- Be kept in sync with body content
- Cover frequently-needed patterns

**c) Clear Structure**
- Proper markdown hierarchy (# for title, ## for sections, ### for subsections)
- Code examples in fenced blocks
- Tables for comparisons
- Consistent formatting

**d) Required Sections (for comprehensive rules)**
- Core Principle or Quick Reference at top
- Examples (good vs bad)
- Common mistakes to avoid

### 3. Content Quality Checks

**a) Redundancy Detection**
Look for:
- Same rule appearing in multiple files
- Same examples duplicated across files
- Content that should be consolidated

**Example issues:**
- "Always use BaseModal" appears in both `frontend-components.md` and a hypothetical `modals.md`
- API error handling rules split across `api-errors.md` and `testing.md`

**b) Contradiction Detection**
Find conflicting rules:
- One file says "always do X", another says "never do X"
- Different patterns recommended for same problem
- Conflicting priorities or thresholds

**Example issues:**
- `testing.md` says coverage is optional, but `qa-standards.md` enforces minimums
- `work-style.md` says use Opus by default, but another says use Haiku for speed

**c) Stale Content**
Check for references to:
- Deleted files or components
- Deprecated patterns
- Old environment variables
- Removed features
- Outdated technology versions

**How to check:**
- If a rule references a file path, verify that file exists (use `ls` or `test -f`)
- If a rule references a component, check if it's still in the codebase (use Grep)
- If a rule references a pattern, verify it's still current

**d) Missing Cross-References**
Look for:
- Rules that reference related rules but don't link to them
- "See X for details" without specifying where X is
- Related rules in different files that don't acknowledge each other

**e) Quick Reference Drift**
For files with quick reference sections:
- Compare quick reference bullets to body content
- Check if key rules are missing from quick reference
- Check if quick reference has rules removed from body
- Verify consistency of wording

### 4. Dynamic Learning Validation

Check `.claude/memory.md` for:

**a) Recent Activity**
- Is the Session Log being updated?
- Last updated date should be recent
- Are decisions from recent sessions captured?

**b) User Preferences Captured**
- Are obvious user preferences being tracked?
- Check recent conversation for preference signals that should be logged

**c) Triggers Being Followed**
- Are trigger thresholds being respected?
- Check if any counters have hit thresholds without action

**d) Cleanup Happening**
- Are old/completed items being removed?
- Is stale content being cleaned up per `dynamic-docs.md` rules?

### 5. Path Coverage Validation

For each rules file with `paths:` frontmatter:
- Do the specified paths actually exist in the codebase?
- Are the globs correct?
- Are there files matching those paths that should follow these rules?

**Example check:**
```bash
# If frontend-components.md says:
# paths: ["myBrain-web/src/features/**/*.jsx"]

# Verify files exist:
ls myBrain-web/src/features/**/*.jsx | head -5
```

### 6. Cross-Reference Validation

Check that references between files are valid:

**a) CLAUDE.md References**
- Memory.md references CLAUDE.md sections - do they exist?
- Rules files reference CLAUDE.md - are paths correct?

**b) Skill References**
- Rules mention skills - do those skills exist in `.claude/skills/`?
- Are skill names spelled correctly?

**c) Internal References**
- "See logging.md" - does logging.md exist?
- "See the Security Rules" - is that section/file present?

### 7. Pattern Analysis

Identify patterns that might need rules:

**a) Recently Added Code**
Check git log for new patterns:
```bash
git log --since="1 month ago" --name-only --pretty=format: | sort -u
```

Look for:
- New directories that need rules
- New patterns emerging across multiple files
- Repeated code that suggests missing rule

**b) Recent Decisions**
Check `memory.md` Decisions Made table:
- Do any decisions need to become rules?
- Are decisions properly reflected in rules files?

## Report Format

Generate a comprehensive markdown report:

```markdown
# Rules & Documentation Health Report

**Generated:** [date and time]
**Files Reviewed:** X rules files + memory.md + CLAUDE.md

## Overall Health Score: X/100

**Breakdown:**
- Structure: X/20
- Content Quality: X/30
- Cross-References: X/15
- Dynamic Learning: X/15
- Path Coverage: X/10
- Quick References: X/10

---

## Executive Summary

[2-3 sentences summarizing overall state]

**Critical Issues:** X
**Warnings:** X
**Recommendations:** X

---

## Issues Found

### Critical (Action Required)

#### Contradictions
- [ ] `frontend-components.md` line 45: Says "always use fetch" but `api-errors.md` line 12 says "always use api.js"
- [ ] `work-style.md` and `qa-standards.md` conflict on agent execution order

#### Broken References
- [ ] `security.md` references deleted file `myBrain-api/src/middleware/sanitize.js`
- [ ] `memory.md` links to non-existent `.claude/design/prototypes.md`

#### Stale Content
- [ ] `testing.md` references Jest but frontend now uses Vitest
- [ ] `logging.md` mentions `logService.js` which was removed 2 weeks ago

### Warnings (Should Fix)

#### Redundancies
- [ ] BaseModal usage appears in `frontend-components.md` AND `design.md` - consolidate
- [ ] API error handling duplicated in `api-errors.md` and `services.md`

#### Missing Cross-References
- [ ] `logging.md` mentions audit tool but doesn't link to `/logging-audit` skill
- [ ] `work-style.md` references QA standards but doesn't link to `qa-standards.md`

#### Quick Reference Drift
- [ ] `dynamic-docs.md` quick reference missing "Maintain Quick References" section (added to body)
- [ ] `qa-standards.md` quick reference says "Phase 2" but body updated to "Phase 1"

#### Path Coverage Issues
- [ ] `frontend-components.md` paths include `**/*.tsx` but project only uses `.jsx`
- [ ] `logging.md` doesn't cover `myBrain-api/src/utils/logger.js`

### Recommendations (Nice to Have)

#### Structure Improvements
- [ ] Add quick reference to `security.md` (complex file, would benefit)
- [ ] Split `dynamic-docs.md` into separate files for update/cleanup rules (it's 370+ lines)

#### Content Enhancements
- [ ] `api-errors.md` could use more examples
- [ ] `testing.md` missing integration test patterns

#### Dynamic Learning
- [ ] Recent user preference "explain before code changes" not captured in memory.md
- [ ] Decision about direct push (no PRs) should be in Decisions Made
- [ ] Session Log hasn't been updated in 3 sessions

---

## Health by File

| File | Score | Issues | Status |
|------|-------|--------|--------|
| memory.md | 85/100 | 2 warnings | 🟡 Good |
| dynamic-docs.md | 90/100 | 1 recommendation | 🟢 Excellent |
| logging.md | 70/100 | 1 critical, 2 warnings | 🟠 Needs Work |
| security.md | 95/100 | 0 issues | 🟢 Excellent |
| frontend-components.md | 80/100 | 1 warning | 🟡 Good |
| qa-standards.md | 75/100 | 1 warning | 🟡 Good |
| work-style.md | 88/100 | 1 recommendation | 🟢 Excellent |
| [other files...] | ... | ... | ... |

---

## Detailed Findings

### File: logging.md

**Score:** 70/100

**Issues:**
1. **CRITICAL - Broken Reference:** Line 89 references `myBrain-api/src/utils/logger.js` but that file doesn't exist. Found `myBrain-api/src/middleware/requestLogger.js` instead.
2. **WARNING - Redundancy:** Entity ID table duplicated in `services.md` line 23.

**Recommendation:** Update reference, consolidate entity ID table into one canonical location.

### File: memory.md

**Score:** 85/100

**Issues:**
1. **WARNING - Stale:** Session Log last entry is 5 sessions old (2026-01-29, today is 2026-02-03).
2. **RECOMMENDATION - Missing Decision:** Recent decision about direct push workflow (no PRs) mentioned in session but not in Decisions Made table.

**Recommendation:** Update Session Log, capture direct push decision.

[Continue for each file...]

---

## Quick Reference Status

Files with quick references: X
Files that should have them: Y
Quick references in sync: X/X
Quick references drifted: Y/Y

**Drifted References:**
- `dynamic-docs.md`: New "Maintain Quick References" section not in QR
- `qa-standards.md`: QR shows old phase number

---

## Dynamic Learning Health

**Last memory.md update:** [date]
**Days since last update:** X

**Triggers Followed:**
✅ User preferences being captured
✅ Decisions being logged
✅ Failed approaches documented
⚠️ Session log 3+ sessions behind
❌ Repetitive tasks not being tracked

**Recommendations:**
- Update session log for last 3 sessions
- Start tracking repetitive tasks per dynamic-docs.md rules

---

## Recommended Actions

### Immediate (Do Now)

1. **Fix broken references in logging.md**
   - Update line 89 to reference correct file
   - Verify all file paths exist

2. **Resolve contradiction in frontend-components.md vs api-errors.md**
   - Decide canonical pattern
   - Update conflicting file

3. **Update memory.md Session Log**
   - Add entries for last 3 sessions
   - Capture recent decision about direct push

### Short Term (This Week)

1. Consolidate BaseModal rules into single location
2. Add cross-references between related rules
3. Sync quick references with body content
4. Remove stale references to deleted files

### Long Term (This Month)

1. Consider splitting dynamic-docs.md (370+ lines)
2. Add quick reference to security.md
3. Review and update path globs for accuracy
4. Establish monthly rules review schedule

---

## Coverage Analysis

**Rules files:** X
**Lines of documentation:** Y
**Cross-references:** Z
**External file references:** A (B verified, C broken)

**Areas well-covered:**
- Frontend component patterns
- Backend logging
- Security practices

**Areas under-documented:**
- Deployment process
- Database migrations
- Performance optimization

**Recommendation:** Consider adding rules for under-documented areas.

---

## Conclusion

[1-2 paragraph summary of findings and overall assessment]

**Next Review:** [suggested date, typically 1 month from now]
```

## Severity Levels

**Critical (Red flag, must fix):**
- Contradictions between rules
- Broken references to code/files
- Stale content leading to errors
- Missing critical cross-references

**Warning (Should fix soon):**
- Redundant content
- Minor stale references
- Missing nice-to-have cross-references
- Quick reference drift
- Path coverage issues

**Recommendation (Nice to have):**
- Structure improvements
- Additional examples
- Content enhancements
- Better organization

## Scoring Rubric

### Structure (20 points)
- Frontmatter present: 5 pts
- Clear hierarchy: 5 pts
- Code examples formatted: 5 pts
- Quick reference present (if complex): 5 pts

### Content Quality (30 points)
- No contradictions: 10 pts
- No redundancies: 10 pts
- No stale content: 10 pts

### Cross-References (15 points)
- Internal references valid: 5 pts
- External references valid: 5 pts
- Related rules linked: 5 pts

### Dynamic Learning (15 points)
- Recent updates: 5 pts
- Triggers followed: 5 pts
- Cleanup happening: 5 pts

### Path Coverage (10 points)
- Paths exist: 5 pts
- Paths accurate: 5 pts

### Quick References (10 points)
- Present where needed: 5 pts
- In sync with body: 5 pts

**Total: 100 points**

**Grade scale:**
- 90-100: 🟢 Excellent
- 80-89: 🟡 Good
- 70-79: 🟠 Needs Work
- Below 70: 🔴 Critical Issues

## When to Suggest Fixes

**Report only by default** - list all issues found with clear descriptions.

**Offer to fix if user asks:**
- "Want me to fix these issues?"
- "Should I update the affected files?"

**Proactive fixing (only for trivial issues):**
- Obvious typos in file paths
- Clearly outdated dates
- Broken markdown formatting

**Never auto-fix without asking:**
- Contradictions (need user decision)
- Redundancies (need consolidation strategy)
- Structural changes (need user approval)

## Usage

Run this skill:
- Monthly on the 1st
- Before major changes
- When rules feel inconsistent
- After significant refactoring
- When user mentions "documentation seems off"

## Exit Message

After generating report, end with:

```
---

**Health Score: X/100** ([grade emoji and text])

**Summary:** [one sentence]

**Top Priority:** [single most important action]

Need help fixing any of these issues? Let me know which ones to tackle first.
```
