# Plan Review: FEEDBACK-SYSTEM-MASTER-PLAN

**Review Date:** 2026-01-31
**Reviewer:** Senior Engineer (Codex)
**Status:** REVISION REQUIRED (Not approved yet)

---

## Evidence Reviewed

- Plan file: `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\plans\FEEDBACK-SYSTEM-MASTER-PLAN.md`
- Rules and docs:
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\agent-ops.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\work-style.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\design.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\security.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\api-errors.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\frontend-components.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\design-system.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\mobile-patterns.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\docs\architecture.md`
- Codebase references (key integration points):
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\layout\AppShell.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\capture\FloatingCaptureButton.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\ui\BaseModal.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\AdminInboxPage.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\AdminReportsPage.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\components\AdminNav.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\lib\api.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\Task.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\Notification.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\AdminMessage.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\Report.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\websocket\index.js`
- UI/UX spot checks via agent-browser + test accounts:
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\screenshots\2026-01-31-plan-review-dashboard.png`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\screenshots\2026-01-31-plan-review-admin.png`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\screenshots\2026-01-31-plan-review-admin-reports.png`

---

## Executive Summary

The plan is comprehensive and well-structured, but it does not yet align with several critical codebase constraints, security/privacy requirements, and UI/UX system rules. The highest risks are: (1) hard-coded routing to a specific admin user/project, (2) public endpoints without sufficient abuse prevention or anti-enumeration protection, (3) metadata capture that risks PII leakage and oversized documents, and (4) UI placement conflicts on mobile with existing floating capture patterns. These must be addressed before implementation.

**Decision:** Not approved. Revision required.

---

## Key Findings (Ordered by Severity)

### Critical

1) **Hard-coded admin routing and project ownership is unsafe and brittle**
- The plan routes feedback tasks to a specific admin email and a “myBrain” project (hard-coded). This will fail if the email or project name changes, and it violates the codebase’s ownership model (tasks are always owned by a user).
- Required change: Use a configurable “feedback owner” and “destination project” (SystemSettings or admin config). If missing, create (or select) a default project for that admin user. Do not hardcode email addresses or project names.

2) **Public feedback endpoints are under-protected and prone to abuse**
- The plan exposes `POST /api/feedback` without auth and proposes `GET /api/feedback/status/:referenceId` with “email verification” but no anti-enumeration protection. This is vulnerable to spam, brute-force enumeration, and service abuse.
- Required change: Integrate with existing rate-limit infrastructure, add CAPTCHA/honeypot for unauthenticated submissions, and require a signed/unguessable token for status checks (do not rely on reference IDs alone).

3) **Metadata capture scope risks PII leakage and oversized documents**
- Capturing console errors, network failures, “recent actions,” and user context without strict redaction is a high privacy risk. It can include tokens, query strings, email content, or user-entered data. Large arrays risk MongoDB’s 16MB document limit.
- Required change: Explicit redaction rules (strip query params, headers, tokens, emails unless user opts in), strict caps (e.g., last N errors and N actions), and field allowlists. Add opt-in for advanced diagnostics and screenshot capture.

4) **UI placement conflicts with existing mobile UX patterns**
- There is already a mobile floating capture button (`FloatingCaptureButton.jsx`) and bottom nav (`AppShell.jsx`). A second floating feedback widget in the same corner will overlap and violate mobile safe-area patterns.
- Required change: Define responsive placement rules (desktop only by default, or stack with safe offsets), and/or integrate feedback access into existing topbar/sidebar/help menu for mobile.

### High

5) **Plan does not align with required component reuse patterns**
- The plan proposes bespoke modals and widgets but does not commit to existing components (`BaseModal`, `EmptyState`, `Skeleton`, `Tooltip`) or feature module conventions (routes/index structure).
- Required change: Specify `BaseModal` for feedback modal, `Skeleton` for loading, `EmptyState` for empty views, and the standard feature structure under `myBrain-web/src/features/`.

6) **Admin UX should integrate with existing admin navigation and inbox**
- A new standalone admin dashboard for feedback conflicts with the current admin navigation and inbox (`AdminNav.jsx`, `AdminInboxPage.jsx`).
- Required change: Add a new Admin tab and integrate feedback alerts into the Admin Inbox (or Admin Reports pattern) rather than creating a parallel admin surface.

7) **Messaging integration is redundant with existing AdminMessage + Notification**
- The plan proposes a new two-way messaging system, but the codebase already has `AdminMessage` and `Notification` models plus admin message routes. This should be reused or extended.
- Required change: Leverage `AdminMessage` for admin responses and `Notification.notifyAdminMessage` for user alerts. If two-way replies are required, explicitly extend the existing admin message system instead of creating a parallel message channel.

8) **Task metadata field does not exist**
- The plan inserts a `metadata` object into tasks, but `Task.js` does not support a metadata field.
- Required change: Store feedback linkage inside the Feedback model and keep tasks clean, or add a supported field in the Task schema if absolutely required (with schema and migration plan).

### Medium

9) **Design system compliance not explicitly enforced**
- The plan does not specify which token system to use (legacy `--bg/--panel` vs V2 `--v2-*`). Admin pages currently use legacy tokens; dashboard uses V2.
- Required change: For user-facing widget/modal, use legacy tokens unless this feature is explicitly dashboard V2. All colors must use CSS variables per design rules.

10) **Shortcut conflicts and UX coherence**
- The plan proposes `Ctrl/Cmd + Shift + F`, but global shortcuts are centralized in `GlobalShortcuts.jsx`. This change needs to be coordinated to avoid conflicts and preserve the existing quick-capture shortcut.
- Required change: Add the feedback shortcut to the global shortcuts system and document it; ensure it doesn’t conflict with browser/system defaults.

11) **App version capture is undefined**
- The plan includes `appVersion`, but there’s no existing app version mechanism in the frontend.
- Required change: Define how build/version info is injected (e.g., `VITE_APP_VERSION` or a build hash) and document it.

12) **WebSocket event naming and routing not aligned with current socket patterns**
- Current WebSocket events use `user:${id}` rooms and established event names in `websocket/index.js`. The plan’s new events should follow the existing pattern.
- Required change: Define socket emissions using the existing room conventions and match naming style (`feedback:new`, `feedback:updated` is fine if routed through `user:${id}` rooms).

### Low

13) **Reference IDs use 2024 instead of current year**
- The plan examples show `FB-2024-0142`, but the current date is 2026-01-31. This creates confusion in examples and UX copy.
- Required change: Update all reference ID examples to 2026 or remove year-coupling entirely.

14) **File upload constraints need alignment with existing upload limits**
- The plan suggests 5MB screenshots but does not reference existing upload size limits or storage rules.
- Required change: Align with existing file/image upload constraints and S3 policy.

---

## UI/UX Review (Design System Compliance)

- **Widget placement:** Must not overlap the existing floating quick capture button and mobile bottom nav. Use a responsive strategy (desktop floating, mobile entry via menu/topbar/help).
- **Modal:** Must use `BaseModal` for focus trapping, keyboard handling, and glassmorphism consistency. Avoid custom overlay implementations.
- **Color and spacing:** Use CSS variables only, follow the 4px/8px spacing scale, and respect touch target rules (44x44px).
- **Red usage:** Red is reserved for true errors. “Bug report” type should not be coded as an error state in UI unless the user explicitly indicates a breaking issue.
- **Dark mode:** All states (idle/hover/disabled/success/error) must be verified in dark mode. No hardcoded colors.

---

## Required Changes for Approval

1) Replace hard-coded admin email/project with configurable SystemSettings and safe fallback creation.
2) Add anti-abuse measures: rate-limit integration, CAPTCHA/honeypot for unauthenticated submissions, and non-enumerable status tokens.
3) Define strict metadata allowlists + redaction rules + caps (limit arrays and size, avoid sensitive content).
4) Rework UI placement to avoid mobile conflicts with existing FAB and bottom nav.
5) Commit to codebase reuse rules: `BaseModal`, `Skeleton`, `EmptyState`, `api.js`, standard feature folder structure.
6) Integrate admin feedback UI into existing AdminNav + Admin Inbox/Reports patterns.
7) Reuse or extend `AdminMessage` + `Notification` for two-way communication.
8) Remove `Task.metadata` usage or formally extend the Task schema with migration plan.
9) Specify app version source and update plan examples to current year (2026).

---

## Approval Status

**Not approved.** Address all Critical and High findings, then resubmit for review.

---

## Suggested Follow-Up Checks (Post-Revision)

- Confirm feedback widget placement on mobile and desktop with real UI tests.
- Validate that metadata capture is redacted and size-capped (documented and tested).
- Ensure new endpoints follow `api-errors.md` conventions and include auth triple tests where applicable.
- Update `architecture.md` and `environment.md` if new models/routes/env vars are introduced.
