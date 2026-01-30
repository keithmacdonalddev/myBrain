# Plan Review: Session Model and Auth Integration

**Reviewer:** Senior Engineer
**Date:** January 29, 2026
**Plan Reviewed:** `.claude/plans/11-activity-logs-session-model.md`

---

## Summary
The session model design is broadly compatible with the existing Mongo/Mongoose patterns, but the integration points with auth, middleware, and WebSockets are incomplete. Several implementation details will cause functional regressions or security gaps unless addressed.

---

## Blockers and Critical Issues
1. **`req.decoded` does not exist in the current auth stack.** The plan references `req.decoded` in logout handling, but `middleware/auth.js` never populates this property. Any logout logic relying on it will fail. Either store decoded claims on the request in `requireAuth` or re-verify the JWT in the logout handler (as current logout does). Files: `myBrain-api/src/middleware/auth.js`, `myBrain-api/src/routes/auth.js`.

2. **Session validation bypass via WebSockets and optional auth.** Only `requireAuth` is modified in the plan. `optionalAuth` and WebSocket auth (`myBrain-api/src/websocket/index.js`) would continue to accept revoked sessions because they only verify JWT signature. This defeats the purpose of session revocation.

3. **Phase 1 depends on Phase 2 code.** Login flow calls `checkNewDevice`/`checkNewLocation` which are defined in the Phase 2 security service. This breaks the stated independence of Phase 1.

4. **Session TTL conflicts with security lookback windows.** Session docs are proposed to expire 30 days after JWT expiry, but security checks in Phase 2 look back 90 days. That data will be gone, causing constant "new device/location" false positives.

---

## High-Priority Fixes
- **JWT/session compatibility:** The plan assumes new tokens include `sid` and `jti`. Ensure legacy tokens without these claims still work (current code uses `{ userId }` only). The proposed conditional check helps, but you must keep it until all tokens expire.
- **Session expiry checks:** Session validation currently checks only `status: 'active'`. It should also compare `expiresAt` with `now`, or compute `expiresAt` from the JWT `exp` claim. Otherwise sessions can remain "active" in the DB beyond intended validity.
- **Avoid login latency spikes:** `getLocationFromIP` is called synchronously in the login handler. This adds third-party network latency to login and creates timing differences between existing-email and non-existing-email paths (email enumeration risk). Make this non-blocking or run on a background queue.
- **Cache hygiene:** The proposed in-memory session cache never evicts entries; it only checks TTL on read. Add periodic cleanup or use a proper LRU cache to prevent unbounded memory growth.

---

## Design Mismatches and Missing Details
- **Session model fields for geo checks:** Phase 2's impossible-travel check needs `latitude`/`longitude`, but the Session model and geoip plan do not include them.
- **`revokedBy` schema typing:** `revokedBy` is listed as `ObjectId` without `mongoose.Schema.Types.ObjectId` and `ref`. Use a proper schema type to avoid validation issues.
- **`expiresAt` alignment:** JWT expiry is configurable via `JWT_EXPIRES_IN` in `myBrain-api/src/routes/auth.js`. The session expiry should be derived from the same value, not hard-coded 7 days.
- **Last activity updates:** Writing `lastActivityAt` for every request will generate heavy write load. Use throttling (e.g., update only if > 1 minute) and `$max` to avoid races.

---

## Security and Privacy Considerations
- Store IP/UA data only if retention policies allow it, and document how long IP/location will be retained.
- Normalize `req.ip` values (IPv6, `::ffff:`) before storing and before calling geo services.

---

## Test Impact
New tests will be required for:
- JWTs with and without `sid/jti`
- Session revocation impact on `requireAuth`, `optionalAuth`, and WebSockets
- Login latency and failure handling when geoip fails or times out

---

## Verdict
**Needs changes before implementation.** The plan is close, but it must cover all auth entry points (REST + WebSocket + optional auth), fix cross-phase dependencies, and address session lifecycle details to avoid regressions.
