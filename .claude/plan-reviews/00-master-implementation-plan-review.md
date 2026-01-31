# Plan Review: Dashboard Redesign (All Plan Files)

**Reviewer:** Senior Engineer
**Scope:** All files in `.claude/plans/` (master plan + supporting plans + reconciliation + migration + testing + future themes)
**Codebase Reviewed:** `myBrain-web/`, `myBrain-api/`
**Date:** 2026-01-31

---

## Executive Summary

The plan set is comprehensive and shows strong intent for phased delivery, risk management, and UI polish. However, several plan documents still conflict with the authoritative reconciliation decisions and with the current codebase. Those conflicts will cause immediate implementation thrash (especially in theming/CSS strategy, dark mode selector, and timeline assumptions). The backend and data-layer plans also propose endpoints and field names that already exist under different names, which will create duplication or break the UI unless aligned.

**Recommendation:** Do not start Phase 1 implementation until the plan set is fully synchronized with `PLAN-RECONCILIATION.md` and with current API/data shapes. Fixing these mismatches first will prevent rework and avoid regressions.

---

## Key Findings

### Critical

1) **Theming/CSS strategy conflicts across plans (will break migration discipline).**
- `01-css-theming-plan.md` defines unprefixed variables (`--bg-primary`, `--text-primary`, etc.) and a renaming strategy, while `PLAN-RECONCILIATION.md` mandates **v2-prefixed variables** and additive-only migration. `css-variable-migration-guide.md` also enforces v2 aliases. These are incompatible approaches and will create double systems if not resolved.
- Additionally, `06-interactions-animations-plan.md` still uses `[data-theme="light"]` selectors, but the codebase uses `.dark` on `document.documentElement`. This will cause dark/light overrides to fail or be applied inconsistently. (`.claude/plans/06-interactions-animations-plan.md:1107,1111,1123`)

**Impact:** High likelihood of dark mode regressions and CSS conflicts when Phase 1 begins.

2) **Migration timeline contradicts master plan and reconciliation.**
- `00-master-implementation-plan.md` and `PLAN-RECONCILIATION.md` set a realistic 8–11 week timeline. `08-migration-strategy-plan.md` still specifies ~22 days total. (`.claude/plans/08-migration-strategy-plan.md:1465,1471`)

**Impact:** Execution expectations will diverge across reviewers and the implementation schedule will be set incorrectly.

### High

3) **Backend plan proposes new endpoints that already exist under different names.**
- Existing endpoints:
  - Task complete: `POST /tasks/:id/complete` already exists (`myBrain-api/src/routes/tasks.js`).
  - Note → task conversion: `POST /notes/:id/convert-to-task` already exists (`myBrain-api/src/routes/notes.js`).
  - Inbox processing: `POST /notes/:id/process` exists (`myBrain-api/src/routes/notes.js`).
- Plan proposes `POST /tasks/from-note`, `POST /tasks/:id/defer`, and `POST /api/inbox/:id/triage` as new endpoints. This duplicates or conflicts with existing flows.

**Impact:** Duplicated API surface and divergent logic paths; higher regression risk and maintenance cost.

4) **Event data field mismatch in plans vs codebase.**
- Plan references `startTime` / `meetingLink`, but the model uses `startDate` / `meetingUrl` (`myBrain-api/src/models/Event.js`).

**Impact:** Schedule widget and join actions will fail unless the plan’s data field names are corrected.

5) **Radar integration placement conflicts with current context providers.**
- `05-radar-feature-plan.md` suggests rendering `RadarView` as a sibling to the main layout in `App.jsx`. However, `TaskPanelProvider`, `NotePanelProvider`, and `ProjectPanelProvider` are currently defined inside `AppShell` (`myBrain-web/src/components/layout/AppShell.jsx`). Any Radar feature that calls `useTaskPanel`/`useNotePanel` will fail outside these providers.

**Impact:** Radar actions that open panels will crash or be no-ops unless provider placement is adjusted.

### Medium

6) **Theme slice/data mismatch with plan’s proposed theme persistence.**
- Plan uses localStorage key `theme-mode` and proposes `resolvedMode`, but the codebase uses `themeMode` and `effectiveTheme` (`myBrain-web/src/store/themeSlice.js`).

**Impact:** Risk of duplicate state or broken theme persistence if plan is implemented literally.

7) **Quick capture shortcut mismatch and command palette gap.**
- Plan assumes `Cmd/Ctrl+K` command palette; current quick capture uses `Ctrl/Cmd+Shift+Space` (`myBrain-web/src/components/capture/GlobalShortcuts.jsx`). There is no command palette implementation.

**Impact:** Either a new command palette must be planned, or the shortcut/design must align with the existing quick capture flow.

8) **Migration plan still includes `git reset --hard` references.**
- While labeled “never use,” these commands still appear in the migration plan (`.claude/plans/08-migration-strategy-plan.md:758–759,1554–1555`). `PLAN-RECONCILIATION.md` explicitly required removing them.

**Impact:** Risk of accidental destructive rollback if someone follows the plan literally.

### Low

9) **TypeScript-style interfaces appear in JS-only codebase.**
- Several plan snippets use TS interfaces and `.ts` file paths. The current repo is JavaScript-only (`myBrain-web` and `myBrain-api`).

**Impact:** Minor confusion, but should be clarified to avoid mixed-language drift.

---

## Codebase Integration Notes

- **Dashboard data shape:** The backend returns `recentItems` and no `upcomingTasks` field (`myBrain-api/src/services/dashboardService.js`). The current dashboard uses `data?.recentNotes` and `data?.upcomingTasks` (`myBrain-web/src/features/dashboard/DashboardPage.jsx`), which is already a mismatch. The V2 dashboard must map to the actual API shape (or the API must be extended additively).

- **Feature flags:** User flags and `useFeatureFlag` already exist (`myBrain-web/src/hooks/useFeatureFlag.js`, `myBrain-api/src/models/User.js`). The plan can leverage this directly; no new infrastructure is needed.

- **Sidebar config:** Sidebar uses dynamic config from `useSidebarConfig` and includes collapsible sections. The plan’s static sidebar sections must be reconciled with this config so new sections don’t bypass the admin-configurable sidebar system (`myBrain-web/src/components/layout/Sidebar.jsx`).

- **Quick capture:** There are two capture flows: inline dashboard capture (`DashboardCards.jsx`) and global modal capture (`QuickCaptureModal.jsx`). Any “new quick capture” UI should style and reuse these existing flows rather than introduce a new modal.

- **Weather widget:** A full WeatherWidget exists with `compact` mode. The Topbar “weather pill” should be implemented as a compact variant or a thin wrapper to avoid rewriting weather logic (`myBrain-web/src/components/ui/WeatherWidget.jsx`).

---

## Risk & Scope Assessment

- **Overall Risk:** Medium-High until plan conflicts are resolved; Medium after alignment.
- **Primary Risk Drivers:** CSS migration strategy conflicts, dark-mode selector inconsistencies, and backend endpoint duplication.
- **Shared Database Risk:** Still present. All schema changes must remain additive and behind feature flags.
- **Timeline Risk:** High if migration plan (22 days) is used instead of the master plan (8–11 weeks).

---

## Recommended Adjustments (Required Before Implementation)

1) **Synchronize theming/CSS strategy across all plan files.**
   - Update `01-css-theming-plan.md` to use **v2-prefixed variables** and additive-only migration to match `PLAN-RECONCILIATION.md` and `css-variable-migration-guide.md`.
   - Replace all `[data-theme="..."]` selectors in `06-interactions-animations-plan.md` with `.dark` selectors.

2) **Unify the timeline.**
   - Update `08-migration-strategy-plan.md` timeline to the 8–11 week estimate used in `00-master-implementation-plan.md` and `PLAN-RECONCILIATION.md`.

3) **Align backend endpoints with existing routes.**
   - Replace proposed endpoints with existing ones where possible:
     - Task complete: use `POST /tasks/:id/complete`.
     - Note → task: use `POST /notes/:id/convert-to-task`.
     - Inbox process: use `POST /notes/:id/process`.
   - If a new “triage” endpoint is still desired, define it as an **orchestrator** that calls existing services rather than duplicating logic.

4) **Correct event data field names in the UI plan.**
   - Use `startDate`/`endDate` and `meetingUrl` to match the current model.

5) **Radar placement must respect providers.**
   - Either move `TaskPanelProvider`/`NotePanelProvider` up to `App.jsx` or render `RadarView` inside `AppShell` so it can access the panel contexts.

6) **Shortcuts and command palette clarity.**
   - Decide whether the plan is adding a **new command palette** (Cmd/Ctrl+K). If not, align the plan to the existing Ctrl/Cmd+Shift+Space quick capture shortcut.

7) **Remove all destructive git commands from plans (even as warnings).**
   - Replace mentions with safe `git revert` or feature-flag rollback steps.

---

## Acceptance Criteria (Phase 1 MVP)

**Functional:**
- New dashboard loads with no console errors under feature flag `dashboardV2Enabled`.
- Old dashboard remains available when the flag is off.
- Dark and light themes render correctly using `.dark` class on `<html>`.
- Sidebar collapse/expand still works; no layout regressions in AppShell.
- Quick capture still works (both inline and modal).

**UI/UX:**
- Layout matches prototype for spacing, typography, and widget container styling.
- No overlap with mobile bottom nav; desktop bottom bar only appears on desktop.
- All widgets show data using the current `/api/dashboard` response shape.

**Safety/Quality:**
- No backend changes required for Phase 1.
- Feature flag rollback instantly restores old dashboard.
- `/smoke-test` passes after UI changes.

---

## Final Recommendation

**Approve after revisions.** The plan is strong but not yet implementation-ready due to internal conflicts and codebase mismatches. Once the adjustments above are applied, the plan will be safe to execute and should reduce rework significantly.
