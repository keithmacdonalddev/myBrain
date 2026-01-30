# Plan Review: Frontend Activity Page

**Reviewer:** Senior Engineer
**Date:** January 29, 2026
**Plan Reviewed:** `.claude/plans/14-activity-logs-frontend.md`

---

## Summary
The proposed UI direction is good, but the plan assumes files and routes that do not exist in the current web app. Several component/API mismatches will cause runtime errors without additional changes.

---

## Critical Issues
1. **Routing file and path are incorrect.** The plan references `myBrain-web/src/app/routes.jsx`, but routing is defined in `myBrain-web/src/app/App.jsx`. Also, the app uses `/app/settings` (not `/settings`). A new activity page should route to `/app/settings/activity`, and the Settings link should use that path.

2. **TabNav API mismatch.** `TabNav` uses `tab.count` for badges, not `tab.badge`. The plan’s `badge` property will be ignored unless TabNav is updated. File: `myBrain-web/src/components/ui/TabNav.jsx`.

3. **Missing helper functions/components.** The plan uses `formatRelativeTime`, `SessionsListSkeleton`, `StatCard`, `AlertCard`, `CurrentSessionSummary`, and `DeviceIcon` without defining or reusing existing equivalents. This will not compile as written.

---

## High-Priority Fixes
- **Update routing in App.jsx** to add the activity page and ensure it is under `/app/settings/activity`.
- **Fix SettingsPage link path** to point to `/app/settings/activity` (or use a relative link from `/app/settings`).
- **Use existing date utilities** (`getRelativeDate` or `getTimeAgo` from `myBrain-web/src/lib/dateUtils.js`) instead of `formatRelativeTime`.
- **Define or reuse components** for StatCard/AlertCard/etc., or move them into the activity feature folder with clear implementations.

---

## Functional Gaps
- **Export download handling:** Axios defaults to JSON. The export UI must request CSV/JSON as a blob and trigger a download (or use `window.location` with query params).
- **Infinite query hooks:** `useLoginHistory` needs `useInfiniteQuery` import and should guard against `undefined` cursor values.
- **Settings page tests will break:** Existing tests in `myBrain-web/src/features/settings/SettingsPage.test.jsx` assert the old activity timeline UI. The plan does not account for updating tests.

---

## Consistency Concerns
- The Settings page is used as a slide-in panel on mobile (`myBrain-web/src/components/layout/AppShell.jsx`). Navigating to a dedicated activity page should consider how the panel is dismissed or replaced.
- The plan uses new hooks that bypass `profileApi` / `authApi` helpers. Either add new helper methods in `myBrain-web/src/lib/api.js` or keep the new hooks consistent with the existing API layer pattern.

---

## Test Impact
Add or update tests for:
- Route rendering at `/app/settings/activity`
- Settings page Activity section (now summary card)
- Tab badge rendering using `count`
- Export flow (mock blob download)

---

## Verdict
**Needs revision before implementation.** The UI concept is solid, but the plan must correct routing, component APIs, and test updates to avoid immediate runtime failures.
