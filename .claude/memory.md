# Claude Memory

This file persists observations across sessions. Claude should:
- **Read this at session start** to recall context
- **Update it** when patterns or important information emerge
- **Review periodically** to identify automation opportunities

---

## User Preferences

How the user prefers to work:

| Preference | Notes |
|------------|-------|
| Explanation depth | Explain what you're doing, use simple terms (non-coder) |
| Commit reminders | Prompt to commit after completing features |
| Risk warnings | Warn before destructive or hard-to-undo actions |

---

## Decisions Made

Architectural and design decisions (don't revisit these):

| Date | Decision | Reason |
|------|----------|--------|
| 2025-01-20 | Skills over subagents | User prefers explicit control; revisit when automation patterns emerge |
| 2025-01-20 | Wide Events logging pattern | Based on loggingsucks.com; one log per request with full context |

---

## Repetitive Tasks

Track tasks done multiple times - candidates for automation:

| Task | Count | Last Seen | Notes |
|------|-------|-----------|-------|
| Manual sync-docs | 1 | 2025-01-20 | Created /sync-docs skill |
| Manual checkpoint | 1 | 2025-01-20 | Created /checkpoint skill |

**Threshold:** When count reaches 3+, suggest creating a skill or subagent.

---

## Failed Approaches

Things that didn't work - don't try again:

| Date | What We Tried | Why It Failed |
|------|---------------|---------------|
| 2025-01-20 | Skills in `.claude/agents/` | Wrong location; must be `.claude/skills/<name>/SKILL.md` |

---

## Pain Points

Files or features that frequently cause issues:

| Area | Issue | Notes |
|------|-------|-------|
| | | (none tracked yet) |

---

## Knowledge Growth

Concepts explained to the user (don't over-explain these):

| Date | Concept | Understanding Level |
|------|---------|---------------------|
| 2025-01-20 | Git workflow (add/commit/push) | Basic |
| 2025-01-20 | Skills vs Subagents | Understands difference |
| 2025-01-20 | Claude Code rules files | Understands purpose |
| 2025-01-20 | Wide Events logging | Understands concept |

---

## Promises & Follow-ups

Commitments made that need tracking:

| Date | Promise | Status |
|------|---------|--------|
| | | (none pending) |

---

## Repeated Questions

Questions asked multiple times - may need documentation or skill:

| Question | Times Asked | Resolution |
|----------|-------------|------------|
| | | (none tracked yet) |

---

## Session Log

Brief summaries of recent sessions:

| Date | Summary |
|------|---------|
| 2025-01-20 | Created 6 skills (checkpoint, sync-docs, commenter, reuse-check, logging-audit, code-reviewer). Fixed skill location from agents/ to skills/. Added Wide Events logging to all routes. Created rules files. Major CLAUDE.md update. |

---

## Automation Candidates

When patterns emerge, note them here for future subagent consideration:

| Pattern | Times Observed | Suggested Automation |
|---------|----------------|----------------------|
| | | (none yet - tracking) |

---

## Triggers & Thresholds

**IMPORTANT: Check these conditions and act when thresholds are met.**

### Trigger: Create New Skill

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Same manual task repeated | 3+ times | Suggest creating a skill |
| User says "I wish I could just..." | 1 time | Suggest a skill for it |
| Same question asked | 3+ times | Create skill or add to docs |
| User expresses frustration with process | 2+ times | Suggest skill to automate |

### Trigger: Suggest Subagent

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Skill exists but user wants it automatic | 1 time | Suggest converting to subagent |
| Complex multi-step workflow | 5+ steps repeated | Suggest subagent |
| User wants parallel task execution | 1 time | Suggest subagent |
| Same skill sequence invoked | 3+ times | Suggest combining into subagent |

### Trigger: Update CLAUDE.md

| Condition | Action |
|-----------|--------|
| New model created | Add to Models table |
| New route created | Add to Routes list |
| New component in `components/ui/` | Add to UI Components table |
| New hook created | Add to Hooks table |
| New context created | Add to Contexts table |
| New service created | Add to Services list |
| New middleware created | Add to Middleware list |
| New environment variable required | Add to Environment Variables |
| New pattern established | Add to Key Patterns |
| User preference discovered | Add to Developer Context |
| New skill created | Add to Custom Skills |

### Trigger: Update memory.md

| Condition | Action |
|-----------|--------|
| User says "I prefer..." or "Don't do..." | Add to User Preferences |
| Architectural decision made | Add to Decisions Made |
| Approach tried and failed | Add to Failed Approaches |
| File/feature causes repeated issues | Add to Pain Points |
| Explained new concept to user | Add to Knowledge Growth |
| Made commitment to follow up | Add to Promises |
| User asks same thing again | Increment in Repeated Questions |
| End of significant session | Add to Session Log |
| Noticed repetitive task | Add to Repetitive Tasks (increment count) |

---

## Pending Trigger Checks

Track items approaching thresholds:

| Item | Current Count | Threshold | Status |
|------|---------------|-----------|--------|
| | | | (none yet) |

---

*Last updated: 2025-01-20*
