# Plan Review: FEEDBACK-SYSTEM-MASTER-PLAN (v1.3)

**Review Date:** 2026-02-01
**Reviewer:** Senior Engineer (Codex)
**Status:** REVISION REQUIRED (Not approved yet)

---

## Evidence Reviewed

- Plan file: `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\plans\FEEDBACK-SYSTEM-MASTER-PLAN.md`
- Codebase integration points:
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-api\src\models\SystemSettings.js`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\layout\Sidebar.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\components\ui\BaseModal.jsx`

---

## Executive Summary

This revision is very close. The remaining gaps are not conceptual but operational: the plan doesn’t specify how the “Report Issue” sidebar item is persisted/managed in the data‑driven sidebar config (risk: item hidden/removed), and the offline queue behavior introduces new infrastructure without an implementation plan. Fix these and the plan should be ready for approval.

**Decision:** Not approved. Final revisions required.

---

## Key Findings (Ordered by Severity)

### High

1) **Sidebar placement still risks becoming invisible**
- The sidebar is driven by a configurable `sidebarConfig` and items can be hidden or reordered. The plan says “Main section, always visible,” but does not specify how this is enforced in the config model or admin tooling. This is a real UX risk: if the item is removed in config, there’s no fallback access on mobile.
- Required change: Specify how “Report Issue” is injected into the sidebar config and marked as non‑removable (or enforced at render time). Include its default order and tooltip entry.

### Medium

2) **Offline submission queue is new infrastructure with no implementation plan**
- The edge case table promises offline queueing (“Saved! Will submit when you’re back online”) but the plan doesn’t define storage, retry policy, or sync conflict handling. This could become a hidden scope increase.
- Required change: Either (a) define a minimal offline queue design (localStorage, retry backoff, max retained items), or (b) downgrade this to a future phase and clarify MVP behavior (“retry on reconnect not guaranteed”).

---

## UI/UX Compliance Review

- **Modal usage:** BaseModal ✅
- **Mobile access:** No floating button; sidebar entry ✅
- **Design tokens:** CSS variable usage corrected ✅
- **Remaining UX risk:** Sidebar entry permanence not defined (see High #1).

---

## Required Changes for Approval

1) Define how “Report Issue” is enforced in `sidebarConfig` (non‑removable or auto‑injected at render time) and its default order/tooltip.
2) Clarify the offline submission queue scope (MVP design or defer to later phase).

---

## Approval Status

**Not approved.** Address the items above and resubmit.

---

## Suggested Post-Revision Validation

- Verify the sidebar entry appears for all users, even if sidebar config is customized.
- If offline queue stays in MVP, test reconnect/retry flow with localStorage persistence.
