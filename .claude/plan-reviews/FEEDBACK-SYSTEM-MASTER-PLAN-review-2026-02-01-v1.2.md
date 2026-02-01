# Plan Review: FEEDBACK-SYSTEM-MASTER-PLAN (v1.2)

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
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\features\admin\components\AdminNav.jsx`
  - `C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\myBrain-web\src\lib\api.js`

---

## Executive Summary

This update fixes the SystemSettings mismatch and adds clear anti‑enumeration guidance for status tokens. Overall direction is now aligned with existing architecture and UI patterns. A few remaining issues are blocking approval: (1) sidebar placement in the Social section makes “Report Issue” disappear when social features are disabled, (2) SystemSettings references still use “feedback_routing” in multiple places, (3) token expiry/rotation is described but not supported by any schema field, and (4) the plan contains hardcoded UI color classes that violate the design system rules. Once those are corrected, this plan should be ready for approval.

**Decision:** Not approved. Revision required.

---

## Key Findings (Ordered by Severity)

### High

1) **Sidebar placement depends on a feature flag and may be invisible**
- The plan places “Report Issue” in the Sidebar Social section. That section is only visible when `socialEnabled` is true, which means feedback access can disappear for many users.
- Required change: Move “Report Issue” to a non‑flagged section (Main/Settings/Help) or explicitly make it independent of `socialEnabled` by defining it as its own section or with `featureFlag: null`.

2) **SystemSettings naming still inconsistent in multiple places**
- The plan now defines `feedbackRouting` correctly, but the routing diagram and Phase 1 still refer to `feedback_routing` as if it’s a separate entry. `SystemSettings` is a singleton with fields, not key/value entries.
- Required change: Replace all references to `feedback_routing` with `feedbackRouting` and remove language about “creating a SystemSettings entry.”

3) **Token expiry/rotation is specified but not supported by schema**
- The plan says tokens expire after 90 days or rotate on resolution, but the Feedback schema has no `statusTokenCreatedAt` or `statusTokenExpiresAt` to enforce this.
- Required change: Add a field to support expiry/rotation (e.g., `statusTokenCreatedAt` or `statusTokenExpiresAt`) and include logic for rotation and invalidation in the plan.

### Medium

4) **Executive summary still claims CAPTCHA-protected public endpoint**
- Scope overview says “CAPTCHA-protected endpoint,” but Phase 1 explicitly says MVP is honeypot/time-check only and CAPTCHA is Phase 5. This is inconsistent in the summary layer.
- Required change: Update the Scope Overview to match the Phase 1/Phase 5 split or move CAPTCHA to MVP.

5) **Hardcoded color utilities in UI examples**
- The success state example uses `text-green-500`, which violates the design rule “Never hardcode colors; use CSS variables.”
- Required change: Replace Tailwind color utility classes in plan examples with CSS variable usage or semantic tokens (`text-[var(--success)]` or equivalent pattern).

6) **Status endpoint response shape lacks explicit schema alignment**
- You’ve defined minimal response fields, but `lastUpdated` isn’t explicitly tied to `updatedAt` in the model or route. It should be defined to prevent inconsistent behavior.
- Required change: State that `lastUpdated` maps to `Feedback.updatedAt` and never exposes more than status + timestamp.

---

## UI/UX Compliance Review

- **Modal usage:** Uses BaseModal; good.
- **Mobile access:** Widget hidden on mobile; good.
- **Navigation placement:** Needs adjustment due to feature-flag dependency (see High #1).
- **Design tokens:** The plan still includes hardcoded colors in sample UI code; must be replaced with CSS variables.

---

## Required Changes for Approval

1) Move “Report Issue” to a non‑feature‑flagged sidebar section (or explicitly make it independent of `socialEnabled`).
2) Replace all remaining “feedback_routing” references with `feedbackRouting` and remove “create entry” language.
3) Add schema support for token expiry/rotation and document the exact mechanism.
4) Fix summary layer CAPTCHA wording to match the phased plan.
5) Replace hardcoded color classes in UI examples with CSS variable usage.
6) Explicitly map `lastUpdated` to `Feedback.updatedAt` in the status endpoint response.

---

## Approval Status

**Not approved.** Address the items above and resubmit.

---

## Suggested Post-Revision Validation

- Verify sidebar placement appears for users without `socialEnabled`.
- Confirm status token expiry works and old tokens cannot be used.
- UI review: confirm all sample components use CSS variables for colors.
