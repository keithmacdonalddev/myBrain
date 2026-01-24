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
| Claude as expert | "You should be the expert, I'm relying on you" - be proactive, document thoroughly |
| Productivity focus | Fast capture, quick conversion to tasks/projects, speed is key |
| Don't ask, do | If documentation/skills are needed, create them without asking |

---

## Design Preferences

Visual and aesthetic preferences learned over time:

| Preference | Evidence | Confidence |
|------------|----------|------------|
| Mobile implementation is solid | "the current mobile structure I do like a lot" | High |
| Dislikes generic dashboard layouts | Rejected bento grid as "same old feel" | High |
| iOS/Apple design language | "meant to act like iPhone... think Apple design" | High |
| Wants genuinely fresh ideas | "rethink from first principles" | High |

### Design Option Level
- **Current:** C (Hybrid)
- **Last Reviewed:** 2025-01-20
- **Next Review:** 2025-02-20

### Aesthetic Direction

- Color preferences: Dark mode zinc palette (already implemented)
- Layout preferences: iOS-style navigation, clean mobile, skeptical of "bento grids"
- Animation preferences: iOS slide transitions (300ms cubic-bezier)
- Overall mood: Productivity-focused, not decorative
- Glassmorphism: Applied to visual chrome (sidebar, topbar, modals, panels, dropdowns, toasts, tooltips)

### Key Design Documents
- `mobile-patterns.md` - Comprehensive mobile implementation reference
- `design-system.md` - Full design system
- `design-log.md` - Decisions and learned preferences

---

## Decisions Made

Architectural and design decisions (don't revisit these):

| Date | Decision | Reason |
|------|----------|--------|
| 2025-01-20 | Skills over subagents | User prefers explicit control; revisit when automation patterns emerge |
| 2025-01-20 | Wide Events logging pattern | Based on loggingsucks.com; one log per request with full context |
| 2025-01-20 | Design Option C (Hybrid) | Always-on design awareness + skills for focused work; monthly review |
| 2025-01-20 | Full design system infrastructure | User needs expert-level design support; created comprehensive system |
| 2025-01-22 | App-wide glassmorphism | Visual chrome (sidebar, topbar, modals, panels) gets glass effect; content areas stay solid |
| 2026-01-24 | agent-browser Windows workaround | npm wrapper broken on Windows; use .exe directly or Git Bash |
| 2026-01-24 | Claude's agent-browser session | Must use `--session claude` flag to avoid daemon conflicts with user sessions |
| 2026-01-24 | Browser automation usage | Proactive: after UI features, smoke tests, responsive checks. Screenshots go to `.claude/design/screenshots/` with `YYYY-MM-DD-context-description.png` naming |
| 2026-01-24 | Single shared database | Dev and prod use same MongoDB. Test accounts work in both environments. Only real user is owner. |
| 2026-01-24 | Smoke test after UI changes | Found 2 bugs (useState/useEffect, object rendering) on first test run - validates the approach |

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
| 2025-01-21 | Bento grid dashboard prototype | "Same old feel, nothing new" - just rearranging widgets |
| 2025-01-21 | Creating mobile prototype | Mobile is already good - don't fix what isn't broken |
| 2025-01-22 | App-wide glassmorphism batch update | Broke the entire app - sidebar invisible, panels transparent. Fixed with incremental approach, testing each component. |
| 2025-01-22 | glass-heavy on BaseModal | Broke modal functionality (wouldn't appear). Use regular `glass` on modals instead. |

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
| 2026-01-24 | Git Bash vs PowerShell | Basic - knows Git Bash is Unix-like |
| 2026-01-24 | agent-browser | Understands CLI for browser automation, refs workflow |

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
| 2025-01-22 | **GLASSMORPHISM IMPLEMENTED**: First batch attempt broke app. Re-did incrementally, testing each component. Final: glass on Topbar, Sidebar, BaseModal, Dropdowns, Toasts, Tooltips; glass-heavy on slide panels (Task/Note/Project). Note: glass-heavy breaks BaseModal - use regular glass there. |
| 2026-01-21 | **COMPREHENSIVE AUDIT COMPLETED**: Thorough line-by-line review of backend found: Most route files (18+) ARE fully commented per commenter skill standard. Enhanced 2 files (savedLocations.js, lifeAreas.js) with comprehensive import + inline comments. Verified: admin, analytics, apiKeys, users, messages, notifications, files, images, projects, tasks, notes, connections, dashboard, events, filters, folders, itemShares, auth - all have excellent inline documentation. **Final status: ~96% of routes complete, ready for services/models/middleware verification.** |
| 2026-01-21 | **MAJOR CORRECTION - AUDIT REVEALS INCOMPLETE WORK**: Initial claim of 100% completion was wrong. Detailed audit found ~14% initially (only 10/27 routes with full inline comments). Files had comprehensive FILE HEADERS but lacked: (1) Educational import comments, (2) Detailed inline comments, (3) Step-by-step logic. Created detailed commentplan.md with accurate tracking. Started commenter skill work. |
| 2026-01-24 | **BROWSER AUTOMATION + SMOKE TESTING**: (1) Set up agent-browser with Windows workarounds, (2) Created test accounts for dev/prod (same DB), (3) First smoke test found 2 bugs in DashboardPage.jsx - validates approach, (4) Created `/smoke-test` skill, (5) Added production URLs to CLAUDE.md. Key insight: automated testing catches bugs that manual testing misses. |
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

### Trigger: Design Actions

| Condition | Action |
|-----------|--------|
| New files in `.claude/design/inspiration/` | Run /inspiration to analyze |
| User shares screenshot | Assess and log in design-log.md |
| User says "feels off" / "looks wrong" | Request screenshot, investigate |
| UI component modified | Check against design system |
| 5 sessions since last screenshot | Ask for fresh screenshots |
| Monthly | Ask about design option level (A/B/C) |
| Prototype created | Follow up for feedback |
| User expresses design preference | Log in design-log.md preferences |
| Design decision made | Log in design-log.md decisions |

### Trigger: Browser Automation

| Condition | Action |
|-----------|--------|
| UI feature completed | Screenshot the result, save to `.claude/design/screenshots/` |
| Significant UI change | Take before/after screenshots |
| After frontend changes | Smoke test: open app, check for console errors |
| Form-related changes | Test validation and error states |
| Layout changes | Check mobile (375px), tablet (768px), desktop (1280px) |
| User asks "what does X look like" | Take screenshot and show |
| Debugging visual issues | Screenshot current state |
| After UI/frontend changes | Run `/smoke-test` to verify app works |
| Before committing UI changes | Quick smoke test to catch errors |

### Trigger: Design Reminders

| Frequency | Reminder |
|-----------|----------|
| Session start | Check inspiration folder for new images |
| After UI work | Suggest /design-review |
| Monthly | "Want to revisit design option level?" |
| After prototype | "Did you get a chance to view the prototype?" |
| 5 sessions | "A screenshot of current app state would help" |

---

## Pending Trigger Checks

Track items approaching thresholds:

| Item | Current Count | Threshold | Status |
|------|---------------|-----------|--------|
| | | | (none yet) |

---

*Last updated: 2026-01-24*
