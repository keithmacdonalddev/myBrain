# Plan Review: Security Alerts System

**Reviewer:** Senior Engineer
**Date:** January 29, 2026
**Plan Reviewed:** `.claude/plans/12-activity-logs-security-alerts.md`

---

## Summary
The security alerts design is directionally correct but has several correctness and privacy gaps when mapped to the current codebase. The proposed detection logic relies on data not present in the Session model and introduces timing differences during login that undermine existing anti-enumeration protections.

---

## Critical Issues
1. **Impossible travel detection cannot work with current fields.** `checkImpossibleTravel` requires `latitude` and `longitude`, but neither the Session model nor the geoip utility in Phase 1 includes those fields. As written, the check will always short-circuit to "no coordinates".

2. **Timing side-channel on login failures.** The plan calls `getLocationFromIP` only when the email exists. That makes invalid-email and wrong-password responses measurably different, reintroducing account enumeration risk. This is especially problematic because `myBrain-api/src/routes/auth.js` intentionally uses a unified error message for this reason.

3. **Phase 2 uses Phase 1 data retention settings that conflict with alert windows.** FailedLogin TTL is 7 days, SecurityAlert TTL is 90 days, but Session TTL is shorter in Phase 1. Alert checks based on 90-day history will be unreliable if session data expires earlier.

---

## High-Priority Fixes
- **Add geo fields** to Session and IPGeoCache (latitude, longitude). Ensure `getLocationFromIP` returns them consistently.
- **Make failed login logging non-blocking** and equal-cost for existing and non-existing emails to avoid timing differences. Use background processing or a uniform delay.
- **Align retention windows** for Sessions and FailedLogin with the lookback windows used by detection (`newDevice.lookbackDays`, etc.).

---

## Design and Consistency Issues
- **Schema duplication:** `SecurityAlert` declares a `createdAt` field while also enabling `timestamps: true`. This is redundant and may produce conflicting values. Use one approach.
- **Device uniqueness too coarse:** `checkNewDevice` only checks browser name; this will flag frequent false positives. The plan already includes `generateDeviceFingerprint` but never uses it.
- **Location uniqueness too coarse:** `checkNewLocation` only checks `city`. Use `{ city, countryCode }` or a normalized location key.
- **Rate-limit interaction:** The auth rate limiter short-circuits login requests before they reach the route handler. Those attempts will not appear in `FailedLogin`, which undermines burst detection. Consider integrating with the rate-limit handler (similar to `RateLimitEvent` tracking) or explicitly note the limitation.

---

## Notification Integration
The plan references `Notification.createNotification` which exists in `myBrain-api/src/models/Notification.js`, but there is no UI to reconcile SecurityAlert status (read/dismissed) with Notification state (`isRead`). Decide whether SecurityAlert is independent or whether it should drive Notification read status to avoid inconsistent badges.

---

## Test Impact
Additional tests needed:
- `SecurityAlert` deduplication behavior (same type within 1 hour)
- Failed-login burst detection with rate-limit interference
- Impossible-travel detection with valid coordinates
- Timing parity between invalid-email and wrong-password flows

---

## Verdict
**Needs changes before implementation.** The alert logic must be aligned with available data, and login failure tracking must preserve anti-enumeration protections.
