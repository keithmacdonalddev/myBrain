# Plan Review: Enhanced Activity Logs Overview

**Reviewer:** Senior Engineer
**Date:** January 29, 2026
**Plan Reviewed:** `.claude/plans/10-activity-logs-overview.md`

---

## Summary
The overview captures the right product goals, but the architecture plan does not fully account for existing activity infrastructure and auth patterns in the codebase. Several dependencies are understated (auth/session validation in middleware and WebSocket auth, and existing activity/log formatting). Before implementation, the plan needs to align phase sequencing, reconcile existing endpoints, and update supporting systems outside the listed scope.

---

## High-Risk Gaps
1. **Phase ordering mismatch (blocking).** Phase 1 uses `checkNewDevice` and `checkNewLocation` but those functions are defined in Phase 2 (`myBrain-api/src/services/securityService.js` in the plan). Either Phase 2 must precede Phase 1 or Phase 1 must introduce stubs/temporary logic. The statement "Phase 1 and 2 can be done in parallel" is not accurate without rework.

2. **Existing activity stack is already in production.** `/profile/activity` already exists with formatting and timeline grouping in `myBrain-api/src/routes/profile.js`, and the Settings page depends on it in `myBrain-web/src/features/settings/SettingsPage.jsx`. The plan treats Phase 3 as greenfield and does not describe backward compatibility or migration for the existing response shape.

3. **Auth/session validation touches more than REST middleware.** The auth plan only mentions `middleware/auth.js`, but WebSocket auth (`myBrain-api/src/websocket/index.js`) and optional auth (`optionalAuth` in `middleware/auth.js`) will remain session-blind unless explicitly updated. That is a security bypass risk once sessions are introduced.

4. **Log/event naming is inconsistent in current code.** Existing activity uses legacy event names (`auth_login`) in multiple places (`myBrain-api/src/routes/profile.js`, `myBrain-api/src/services/adminContentService.js`), but actual logs are created with `auth.login.success` from `myBrain-api/src/routes/auth.js`. Phase 3 should include a cleanup or mapping plan.

5. **Data retention vs lookback mismatch.** Planned session/history lookback windows (90 days) do not align with existing log TTL (default 90 days) and proposed session TTL (30 days after expiry). If sessions expire and are deleted in ~37 days, 90-day "new device" detection will always flag false positives.

---

## Required Plan Updates
- **Clarify dependencies and sequencing** between Phase 1 and Phase 2. If Phase 1 needs security helpers, merge those into Phase 1 or reorder phases.
- **Define backward compatibility** for the existing `/profile/activity` response used by `SettingsPage.jsx` and `useUserActivity` (`myBrain-web/src/features/profile/hooks/useActivity.js`).
- **Expand auth scope** to include WebSocket auth and `optionalAuth` session validation.
- **Add an event-name reconciliation strategy** for `auth_login` vs `auth.login.success` across profile activity and admin activity stats.
- **Align retention windows** (session TTL, failed login TTL, security alert TTL, activity export range) with actual data availability.

---

## Additional Observations
- The overview does not mention front-end routing changes for `/app/settings/activity` even though the app routing is defined in `myBrain-web/src/app/App.jsx` (there is no `routes.jsx`).
- External dependency (IP geolocation) introduces latency, reliability, and privacy concerns. The plan should explicitly call out timeouts and fallback behavior.

---

## Test and Monitoring Expectations
- Add migration tests for tokens without `sid/jti`.
- Add regression tests for existing Settings activity timeline (or update tests if response shape changes).
- Add performance monitoring for login latency with geoip and session creation.

---

## Verdict
**Needs revision before implementation.** The feature scope is strong, but the plan needs concrete integration steps and a phased migration strategy that respects current activity logging and routing.
