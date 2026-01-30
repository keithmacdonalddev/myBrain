# Plan Review: Enhanced Activity API

**Reviewer:** Senior Engineer
**Date:** January 29, 2026
**Plan Reviewed:** `.claude/plans/13-activity-logs-enhanced-api.md`

---

## Summary
The planned endpoints are useful, but the proposal conflicts with existing `/profile/activity` behavior and relies on inconsistent event naming and route categorization. Several query behaviors are also underspecified or unsafe (regex search, grouping pagination, CSV escaping).

---

## Critical Issues
1. **Existing `/profile/activity` already exists and is in use.** The current endpoint (in `myBrain-api/src/routes/profile.js`) returns `activities`, `timeline`, `total`, `period` and powers the Settings activity UI. The plan does not describe how to preserve this response shape or migrate the frontend.

2. **Event name mismatch in current code.** The plan uses `eventName: 'auth.login.success'` for login stats, which is correct given `myBrain-api/src/routes/auth.js`, but current activity formatting and admin stats still use legacy `auth_login`. Phase 3 must include a mapping or migration to avoid inconsistent counts.

3. **Grouping pipeline can drop or bias results.** The aggregation uses `$limit` before `$group`, which will discard older items and distort grouped counts. Grouping should happen before limiting or use `$facet` to compute groups and pagination safely.

---

## High-Priority Fixes
- **Backward compatibility:** Either extend the existing `/profile/activity` endpoint to accept new parameters while preserving the current response (and add a new endpoint for the new shape), or explicitly migrate `SettingsPage` and tests.
- **Route categorization:** The regex map uses incorrect route names (`savedLocations`, `lifeAreas`, `itemShares`) while actual routes are kebab-cased (`/saved-locations`, `/life-areas`, `/item-shares`). This will make category filters inaccurate.
- **Regex safety:** `search` is applied as a raw regex with user input. This is vulnerable to ReDoS and should escape user input or use a text index.
- **CSV export escaping:** The CSV generation does not escape quotes, commas, or newlines in fields. Use a CSV writer or properly escape values.

---

## Compatibility and Infrastructure Concerns
- **MongoDB `$dateTrunc` requirement:** `$dateTrunc` requires MongoDB 5.0+. If the deployment is on 4.4, the grouping pipeline will fail. Provide a fallback using `$dateToString`.
- **Log sampling constraints:** The logging system samples non-mutation requests. While the plan filters to mutation methods, any future expansion to include reads will require increasing log retention or sampling rules in `myBrain-api/src/utils/logger.js`.
- **Request logger integration location:** The plan mentions mutating `logEntry.clientInfo.device` in `requestLogger`, but `requestLogger` builds a `logData` object and passes it to `logWideEvent`. The device parsing should happen when `logData.clientInfo` is built or inside `logWideEvent`.

---

## API Design Questions
- Should `cursor` pagination be compatible with `dateFrom/dateTo`, or mutually exclusive? The plan currently ignores `dateFrom/dateTo` if `cursor` is provided.
- Should grouped pagination return stable cursors (consider identical timestamps)?
- Should `/profile/security-alerts` support pagination and not just `limit`?

---

## Test Impact
Add or update tests for:
- Backward compatibility of `/profile/activity` response (existing Settings view)
- Category filtering with kebab-cased routes
- Grouped pagination correctness
- CSV export escaping and large result handling

---

## Verdict
**Needs revision before implementation.** The endpoint design is solid, but it must preserve existing API consumers, fix category and event-name inconsistencies, and harden search/export behaviors.
