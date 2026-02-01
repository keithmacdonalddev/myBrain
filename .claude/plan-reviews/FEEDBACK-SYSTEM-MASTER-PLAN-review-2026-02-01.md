# Plan Review: FEEDBACK-SYSTEM-MASTER-PLAN (v1.1)

**Review Date:** 2026-02-01
**Reviewer:** Senior Engineer (Codex)
**Status:** REVISION REQUIRED (Not approved yet)

---

## Evidence Reviewed

- Plan file: `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\plans\FEEDBACK-SYSTEM-MASTER-PLAN.md`
- Core rules/docs:
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\design.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\frontend-components.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\security.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\rules\api-errors.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\design-system.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\mobile-patterns.md`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\docs\architecture.md`
- Codebase integration points checked:
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\SystemSettings.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\Task.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\Notification.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\AdminMessage.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\layout\AppShell.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\ui\BaseModal.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\AdminInboxPage.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\components\AdminNav.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\lib\api.js`

---

## Executive Summary

This revision resolves most of the original critical issues (hard-coded routing, metadata PII risk, admin/messaging reuse, Task.metadata misuse, and UI placement conflicts). Great progress. Remaining blockers are mostly architectural and security consistency: the plan’s SystemSettings approach conflicts with the actual singleton schema, CAPTCHA requirements are contradictory across phases, and public status endpoints still need explicit anti-enumeration + rate-limit/expiry guidance. Once those are fixed, the plan is close to approval.

**Decision:** Not approved. Minor but important revisions required.

---

## Key Findings (Ordered by Severity)

### High

1) **SystemSettings usage does not match the actual schema**
- The plan stores feedback routing in a key/value object:
  ```js
  { key: "feedback_routing", value: { ... } }
  ```
  but `SystemSettings.js` is a singleton model with fixed fields (no generic key/value structure). This will not work as written.
- Required change: Define a concrete `feedbackRouting` (or similar) field on `SystemSettings` and document a getter/setter. Add an admin UI location to manage it (or specify a seeding/default creation path).

2) **CAPTCHA requirement is inconsistent across phases**
- The plan states public POST requires CAPTCHA for guests, but Phase 1 only adds honeypot/time checks and Phase 5 adds CAPTCHA. This is contradictory and will lead to unclear implementation.
- Required change: Decide whether CAPTCHA is Phase 1 (recommended for public endpoint) or Phase 5. If Phase 5, update the endpoint description to reflect “honeypot only” for MVP.

3) **Public status endpoint still needs explicit anti-enumeration controls**
- You added `statusToken` (good), but the plan doesn’t specify rate limits or token expiry/rotation. Public `GET /api/feedback/status/:statusToken` should be rate-limited and should avoid leaking user info.
- Required change: Specify per-IP rate limiting for status checks and optional token expiry (e.g., rotate on status change or expire after 30–90 days). Also confirm response fields are minimal.

4) **Metadata caps table references `consoleErrors` but schema/fields do not**
- The redaction table mentions `consoleErrors`, but the model and capture payload do not. This is inconsistent.
- Required change: Either remove `consoleErrors` from caps or add it consistently across schema + capture logic with strict redaction.

### Medium

5) **Admin UI placement needs exact integration points**
- The plan says “add Report Issue in mobile menu/sidebar” but doesn’t specify where in `Sidebar.jsx` or `MobileMenuPanel` it will live or how it will follow the existing navigation hierarchy.
- Required change: Identify a concrete location (e.g., “Help” or “Settings” group) and state it follows existing Sidebar item structure and icon/label rules.

6) **Notification type additions require corresponding UI handling**
- You plan to extend `Notification` types (`feedback_received`, `feedback_updated`, `feedback_response`) but don’t mention frontend rendering rules.
- Required change: Add a short note on how these will be displayed in the notifications UI (title/body/actionUrl) to avoid “unknown type” handling.

7) **App version mechanism must be added to env docs**
- You introduced `VITE_APP_VERSION` but didn’t mention updating `environment.md` and build scripts. This is a doc consistency gap.
- Required change: Add a doc update step in the plan (“update environment.md and build pipeline”).

### Low

8) **Desktop widget z-index note is misleading**
- The plan says the widget has the same z-index as FloatingCaptureButton and “stacked above it,” but the capture button is mobile-only. The note can mislead implementation.
- Required change: Clarify that there’s no stacking conflict on desktop and remove “stacked above” wording.

---

## UI/UX Compliance Review

- **BaseModal reuse:** Correct and aligned.
- **Mobile collision:** Resolved by removing floating widget on mobile. Good.
- **Tokens:** Admin uses legacy tokens as required. Good.
- **Red usage:** Explicitly avoided for bug category. Good.
- **Touch targets and modal behavior:** OK via BaseModal and mobileFullscreen.

Remaining UX action: specify exact menu placement in Sidebar/Mobile panel to ensure consistent navigation patterns and avoid burying the entry point.

---

## Required Changes for Approval

1) Replace the “key/value” feedback routing design with a real `SystemSettings` field and accessor methods.
2) Resolve CAPTCHA phase inconsistency (MVP vs Phase 5) and update endpoint descriptions accordingly.
3) Add explicit rate limits + minimal response guidance for `GET /api/feedback/status/:statusToken`.
4) Fix the `consoleErrors` cap inconsistency (remove or implement).
5) Specify exact UI placement in sidebar/mobile menu (group + label + icon rules).
6) Note notification rendering handling for new feedback notification types.
7) Add documentation update step for `VITE_APP_VERSION` in `environment.md`.

---

## Approval Status

**Not approved.** Address the items above and resubmit.

---

## Suggested Post-Revision Validation

- Confirm new SystemSettings field is surfaced in admin settings UI or seeded with defaults.
- Ensure feedback status endpoint returns only minimal public fields.
- Verify UI entry point in sidebar/mobile with agent-browser screenshots.
