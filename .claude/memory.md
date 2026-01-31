---
paths:
  - "**/*"
---

## Quick Reference

**CRITICAL - Every Session:**
- READ AND UNDERSTAND ALL DOC FILES FULLY before any work
- VERIFY tables/claims against actual files (don't trust stale data)
- All work → background agents (`run_in_background: true`)
- Main Claude = conversation only, never blocks
- Tell user: "Sending X agent(s) to [task]. (Y active)"
- Parallel agents for independent tasks
- Monitor agent outputs, catch issues early
- **Provide agents MORE context than necessary** (screenshots, failure history, quality standards)

**Doc Files to Read:**
- This file (memory.md) - preferences, decisions, failures, **skill usage context**
- .claude/rules/agent-ops.md - agent operating model (authoritative)
- .claude/rules/work-style.md - agent delegation rules
- .claude/rules/dynamic-docs.md - update triggers
- CLAUDE.md - doc index and warnings

**Skill Usage Highlights:**
- `/health-audit` = OVERNIGHT tool (30min-4hr depending on tier)
- `/checkpoint` = run after ANY completed feature (don't ask)
- `/smoke-test` = run after ANY UI changes

**See:** `.claude/rules/work-style.md` for full agent rules

---

# Claude Memory

This file persists observations across sessions. Claude should:
- **Read this at session start** to recall context
- **Update it** when patterns or important information emerge
- **Review periodically** to identify automation opportunities

---

## User Preferences

How the user prefers to work:

| Preference | Notes | Enforcement |
|------------|-------|-------------|
| Explanation depth | Explain what you're doing, use simple terms (non-coder) | See `user-context.md` for detailed guidance |
| Commit reminders | Run /checkpoint after completing features (don't ask, just do it) | See `git.md` - automatic after features |
| Risk warnings | Warn before destructive or hard-to-undo actions | See `safety.md` for full list |
| Claude as expert | "You should be the expert, I'm relying on you" - be proactive, document thoroughly | See `user-context.md` Expert Mode section |
| Productivity focus | Fast capture, quick conversion to tasks/projects, speed is key | See `user-context.md` Productivity Focus section |
| Don't ask, do | If documentation/skills are needed, create them without asking | See `user-context.md` Autonomous Action section |
| Plans location | Save all plans to `.claude/plans/` (project folder, not user folder) | Absolute path: `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\plans\` |
| Plan review process | Plans are presented to senior engineers for review before implementation | See `user-context.md` Plan Review Process section |

---

## Work Style Preferences

**See `.claude/rules/work-style.md` for authoritative agent delegation and work style rules.**

Key points (details in rules file):
- Main Claude stays available for conversation; agents do all work
- Default to background agents (`run_in_background: true`)
- Communicate when dispatching: "Sending X agent(s) to [task]. (Y active)"
- Monitor agent outputs, catch issues early
- Model selection: bias toward Opus for quality, lighter models only when confident

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
- **Last Reviewed:** 2026-01-20
- **Next Review:** 2026-02-20

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
| 2026-01-31 | **Dashboard V2 Design Direction** | Base: Apple Command Center (feel, layout, typography). Interactions: Material Cockpit (hover action buttons). Accent: Mission Control (activity log). Toggle: Radar HUD. See `.claude/design/design-system.md` and `.claude/design/dashboard-redesign-2026-01/PROCESS-SUMMARY.md`. |
| 2026-01-31 | **Design System V2 with --v2-* variables** | New dashboard components use `--v2-*` CSS variables. Legacy components keep `--bg`, `--panel`, etc. Zero breakage migration. See `.claude/plans/PLAN-RECONCILIATION.md`. |
| 2026-01-31 | **Theme selector: .dark class (not data-theme)** | Keep `.dark` class as PRIMARY selector. Matches existing codebase, Tailwind convention. `[data-theme="dark"]` from prototype converted. |
| 2026-01-31 | **Red only for TRUE errors** | Color psychology rule: Red NEVER for overdue, urgency, or "you should". Use amber/orange for warnings. Red reserved for actual errors only. |
| 2026-01-31 | **Design system monitoring agents** | Created 3 monitoring agents: design-system-compliance-monitor, visual-hierarchy-monitor, accessibility-compliance-monitor. Use during UI implementation for 100% compliance. |
| 2026-01-31 | **Design system audit skills** | Created 4 skills: /design-audit (full audit), /theme-check (quick), /visual-qa (hierarchy), /accessibility-audit (WCAG AA). |
| 2026-01-28 | **Notes always need processing** | Core Second Brain principle: Notes are TEMPORARY captures that must be processed into Tasks, Events, Projects, or discarded. Notes should never sit permanently - they are inbox items awaiting action. Even "Developing" notes need visible processing options. |
| 2025-01-20 | Skills over subagents | User prefers explicit control; revisit when automation patterns emerge |
| 2025-01-20 | Wide Events logging pattern | Based on loggingsucks.com; one log per request with full context |
| 2025-01-20 | Design Option C (Hybrid) | Always-on design awareness + skills for focused work; monthly review |
| 2025-01-20 | Full design system infrastructure | User needs expert-level design support; created comprehensive system |
| 2025-01-22 | App-wide glassmorphism | Visual chrome (sidebar, topbar, modals, panels) gets glass effect; content areas stay solid |
| 2026-01-24 | agent-browser Windows workaround | npm wrapper broken on Windows; use .exe directly or Git Bash |
| 2026-01-24 | Claude's agent-browser session | Must use `--session claude` flag to avoid daemon conflicts with user sessions |
| 2026-01-24 | Browser automation usage | Proactive: after UI features, smoke tests, responsive checks. Screenshots go to `.claude/design/screenshots/` with `YYYY-MM-DD-context-description.png` naming |
| 2026-01-24 | Single shared database | Dev and prod use same MongoDB. Test accounts work in both environments. Only real user is owner. |
| 2026-01-29 | Direct push workflow | No PRs - commit and push directly to main. Solo project doesn't need PR review gates. `/checkpoint` updated. |
| 2026-01-24 | Smoke test after UI changes | Found 2 bugs (useState/useEffect, object rendering) on first test run - validates the approach |
| 2026-01-31 | Agent context requirements | Agents MUST receive: (1) user screenshots showing problems, (2) failure history, (3) quality standards ("better than 100%"), (4) specific failing elements. Over-communicate context - cost is low, agent failures waste time. |
| 2026-01-31 | Documentation refactor - progressive disclosure | CLAUDE.md is index only (~100 lines). Detailed docs in .claude/rules/ and .claude/docs/. agent-ops.md is authoritative for agent model. Prevents bloat, single source of truth. |

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
| 2025-01-22 | glass-heavy on BaseModal (RESOLVED) | Initially broke modal functionality. Later resolved - BaseModal now uses `glass-heavy` successfully (commit 037911d, 2026-01-23). The CSS glass classes were improved to support heavier blur on modals. |
| 2026-01-30 | Direct file edits for "quick" tasks | Violated agent delegation rules. Reading only quick references is insufficient - must fully read and understand all doc files. Zero exceptions for any work. |
| 2026-01-31 | Agents with minimal context for dark mode fix | Agents repeatedly said "PASS" while user showed screenshots of obvious failures. Root cause: agents lacked context (no screenshots, no failure history, no quality standards). Main Claude must provide MORE context than necessary to agents. |

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
| 2026-01-31 | **DESIGN SYSTEM V2 + ENFORCEMENT INFRASTRUCTURE**: (1) Audited V2 implementation vs prototype - ~55% complete, missing Activity Log, Quick Stats, Projects widgets. (2) Rewrote design-system.md (Version 2.0) - 15 sections, Three Fundamentals, Five Principles, V2 color system, typography hierarchy, anti-patterns. (3) Created 3 monitoring agents: design-system-compliance-monitor, visual-hierarchy-monitor, accessibility-compliance-monitor. (4) Created 4 audit skills: /design-audit, /theme-check, /visual-qa, /accessibility-audit. (5) Created COMPREHENSIVE-REVISED-PLAN.md for 100% prototype fidelity implementation. Implementation NOT started yet - tooling and planning complete. |
| 2026-01-31 | **DARK MODE FIX + AGENT CONTEXT RULE**: After agents repeatedly failed to fix dark mode (said "PASS" despite user screenshots showing obvious failures), fixed directly with nuclear CSS approach (all text elements explicit colors). Root cause: agents lacked context. Added Agent Context Requirements section to agent-ops.md - agents must receive screenshots, failure history, quality standards. Updated memory.md with lessons learned. |
| 2026-01-31 | **DOCUMENTATION REFACTOR COMPLETE**: Refactored CLAUDE.md from ~920 lines to ~102 lines (index only). Created modular structure: agent-ops.md (authoritative), architecture.md, runbook.md, code-reuse.md, environment.md, user-context.md, safety.md, git.md. Updated dynamic-docs.md to target new files. Anti-bloat rule added. |
| 2026-01-21 | **COMPREHENSIVE AUDIT COMPLETED**: Thorough line-by-line review of backend found: Most route files (18+) ARE fully commented per commenter skill standard. Enhanced 2 files (savedLocations.js, lifeAreas.js) with comprehensive import + inline comments. Verified: admin, analytics, apiKeys, users, messages, notifications, files, images, projects, tasks, notes, connections, dashboard, events, filters, folders, itemShares, auth - all have excellent inline documentation. **Final status: ~96% of routes complete, ready for services/models/middleware verification.** |
| 2026-01-21 | **MAJOR CORRECTION - AUDIT REVEALS INCOMPLETE WORK**: Initial claim of 100% completion was wrong. Detailed audit found ~14% initially (only 10/27 routes with full inline comments). Files had comprehensive FILE HEADERS but lacked: (1) Educational import comments, (2) Detailed inline comments, (3) Step-by-step logic. Created detailed commentplan.md with accurate tracking. Started commenter skill work. |
| 2026-01-24 | **BROWSER AUTOMATION + SMOKE TESTING**: (1) Set up agent-browser with Windows workarounds, (2) Created test accounts for dev/prod (same DB), (3) First smoke test found 2 bugs in DashboardPage.jsx - validates approach, (4) Created `/smoke-test` skill, (5) Added production URLs to CLAUDE.md. Key insight: automated testing catches bugs that manual testing misses. |
| 2026-01-30 | **CLS FIX + RULE REINFORCEMENT**: Implemented layout shift fixes for Dashboard, WeatherWidget, ProjectsList, TasksList with view-aware skeletons. After violating agent delegation rules (doing direct file edits), strengthened rules to require FULL reading and understanding of ALL doc files at session start - not just quick references. |
| 2026-01-29 | **RATE LIMIT FIXES IMPLEMENTED**: Two parallel agents implemented 20 fixes across backend (IP validation, regex escaping, atomic operations, cache improvements) and frontend (accessibility, error handling, debouncing). Added localhost IPs to whitelist. Changed Git workflow from PRs to direct push. |

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

### Trigger: Update Documentation Index / References

| Condition | Action |
|-----------|--------|
| New model/route/component/hook/context/service/middleware | Update `.claude/docs/architecture.md` |
| New environment variable required | Update `.claude/docs/environment.md` |
| New pattern established | Update `.claude/docs/architecture.md` Key Patterns |
| New rule or doc file added | Update CLAUDE.md index |
| New skill created | Update `SKILLS.md` |

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

### Trigger: Audit Reminders

| Condition | Action |
|-----------|--------|
| 1st of month | Suggest `/audit-now` for monthly health check |
| Major feature completed | Offer quick audit before pushing |
| User mentions "slow" or "buggy" | Suggest `/audit-now` to diagnose |
| 30+ days since last audit | Gentle reminder that audit is due |
| Before major deployment | Recommend full audit |

---

## Audit Tracking

| Date | Skill Used | Key Issues | Report |
|------|------------|------------|--------|
| 2026-01-30 | /health-audit | Jest worker crashes, 32 failing backend test suites, hardcoded colors (50+), touch target violations | `.claude/overnight-audit-2026-01-30.md` |
| 2026-01-24 | /audit-now | 3.3% frontend / 7% backend coverage, 137 console.logs, 25/27 routes untested | `.claude/reports/2026-01-24-audit.md` |

**Last Audit:** 2026-01-30 (Quick tier via /health-audit)
**Next Suggested:** 2026-02-01 (monthly audit) or after major feature completion

---

## Skill Usage Context

Operational knowledge about when and how to use skills:

| Skill | Usage Context | Notes |
|-------|---------------|-------|
| `/health-audit` | **OVERNIGHT TOOL** - designed for comprehensive multi-hour audits. Quick tier ~30-45min, Standard ~1-2hr, Deep ~2-4hr. Launch before leaving for extended time. | Best run overnight or when not actively working. Creates `.claude/overnight-audit-YYYY-MM-DD.md` report. |
| `/audit-now` | Quick QA check - faster than health-audit. Good for spot checks during active development. | Creates report in `.claude/reports/`. |
| `/checkpoint` | Run after completing ANY feature or fix. Don't ask, just do it. | User preference: auto-run after features |
| `/smoke-test` | Run after ANY UI changes to catch obvious breaks. | Found 2 bugs on first use (2026-01-24) |
| `/code-reviewer` | Run immediately after writing or modifying code. | Proactive quality check |
| `/design-review` | After UI work or when something "looks off". | Check against design-system.md |
| `/commenter` | Run when files need comprehensive comments. Target files lacking import documentation, section headers, or inline business logic explanation. | Reference server.js as the gold standard. Comments every import, section, function, and complex logic. |
| `/design` | **On-demand design consultation.** Bounce ideas, get quick opinions, compare options, discuss design approaches. | Reads design-system.md and design-log.md first. Will offer prototyping or wishlist additions. |
| `/inspiration` | Run when new images appear in `.claude/design/inspiration/` folder. Analyzes user's design preferences from saved images. | Updates design-log.md with findings. Wait for 2-3 similar images before treating as a confirmed pattern. |
| `/logging-audit` | Run to check backend routes for Wide Events logging compliance. Use before deploying backend changes or periodically to ensure logging standards. | Reports only by default - ask to fix. Checks for attachEntityId, event names, and mutation context. |
| `/prototype` | When exploring design ideas visually. Create HTML/CSS/JS previews to test concepts before implementing in React. | Creates files in `.claude/design/prototypes/`. Includes theme toggle. Log prototypes in design-log.md. |
| `/qa-status` | Get quick snapshot of test coverage and code quality. Use to understand current testing state or when planning what to test next. | Provides plain-English summary. Shows coverage %, test file counts, and untested high-priority routes. |
| `/reuse-check` | **Run after implementing features.** Checks for missed reuse opportunities, code duplication, and refactoring candidates. | Reviews specified files or recent git changes. Identifies extraction candidates for hooks, utils, components. |
| `/rules-review` | **Monthly health check** (1st of month) or when documentation feels stale/contradictory. Audits all rules files and memory.md. | Generates health score (100 pts), finds redundancies, contradictions, stale content, and broken references. |
| `/sync-docs` | Run periodically or after adding new features/components/models/routes. Syncs architecture.md, environment.md, and SKILLS.md with codebase. | Compares what's documented vs what exists. Adds missing items, removes stale entries. |
| `/design-audit` | **Full design system compliance audit.** Scans for hardcoded colors, spacing violations, typography issues, anti-patterns. Run on specific path or entire frontend. | Creates comprehensive report with violations by severity. Use before merging UI changes. |
| `/theme-check` | **Quick theme verification.** Fast check for CSS variables and dark mode support. | Lighter than /design-audit. Good for spot checks during development. |
| `/visual-qa` | **Visual hierarchy check.** Verifies typography hierarchy, 5-second test, metric patterns, anti-patterns. | Checks for "One Glance, One Truth" principle compliance. |
| `/accessibility-audit` | **WCAG AA compliance audit.** Checks keyboard accessibility, ARIA labels, contrast, semantic HTML. | Reports critical/serious/minor issues. Run before shipping UI changes. |
| `/agent-status` | Show active agents when you want visibility into what's running | Shows IDs, models, status |
| `/playground` | **Interactive feature exploration.** Creates self-contained HTML with controls, live preview, and copyable prompt. Use when configuring features visually before implementation. Templates: design-playground, data-explorer, concept-map, document-critique, diff-review, code-map. | Different from `/prototype` (static). Playground outputs a prompt you copy back to Claude for implementation. Best for large/visual/structural input spaces. |

**Key Context Learned:**
- User wants `/checkpoint` run automatically after features (don't ask permission)
- `/health-audit` was created specifically for overnight/unattended comprehensive audits
- Always run `/smoke-test` after UI changes - it catches real bugs

---

## Pending Trigger Checks

Track items approaching thresholds:

| Item | Current Count | Threshold | Status |
|------|---------------|-----------|--------|
| | | | (none yet) |

---

*Last updated: 2026-01-31*
