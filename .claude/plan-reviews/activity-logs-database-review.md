# Activity Logs Database Review

**Reviewer:** Database Engineer
**Date:** 2026-01-29
**Plans Reviewed:** 10-14 (Activity Logs Overview, Session Model, Security Alerts, Enhanced API, Frontend)
**Status:** APPROVED WITH RECOMMENDATIONS

---

## Executive Summary

The Activity Logs feature introduces 5 new MongoDB collections (Session, IPGeoCache, SecurityAlert, FailedLogin, and Log model extensions) to enable comprehensive security monitoring and activity tracking. Overall, the database design is **sound** and follows existing patterns in the codebase. However, there are several recommendations to optimize performance and ensure scalability.

**Risk Level:** LOW-MEDIUM
- Low risk for data integrity
- Medium risk for query performance at scale without proposed optimizations

---

## 1. Schema Design Assessment

### 1.1 Session Model

**File:** `myBrain-api/src/models/Session.js`

**Strengths:**
- Clean separation of concerns (identity, device, location, lifecycle)
- Enum validations for status and revokedReason are consistent with existing patterns
- ObjectId references with proper user relationship
- Good use of nested objects for device/location (consistent with User.profile pattern)

**Issues & Recommendations:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| `sessionId` uses `nanoid(20)` but no format validation | Low | Add regex validation: `/^ses_[A-Za-z0-9_-]{20}$/` |
| `device.type` nested enum conflicts with Mongoose | Medium | Rename to `device.deviceType` to avoid reserved word |
| Missing `latitude`/`longitude` in location | High | Add lat/lng fields for impossible travel detection |
| No `createdAt` explicit field, relying on timestamps | Low | This is fine, but plan mentions `createdAt` queries |

**Schema Consistency Check:**
- Follows existing patterns from `User.js` (nested objects, enums)
- Similar structure to `RateLimitEvent.js` for security tracking
- TTL pattern matches `Log.js` and `AnalyticsEvent.js`

**Recommended Schema Modification:**
```javascript
location: {
  ip: { type: String, required: true },
  city: String,
  region: String,
  country: String,
  countryCode: String,
  timezone: String,
  latitude: Number,   // ADD: Required for impossible travel
  longitude: Number,  // ADD: Required for impossible travel
  geoResolved: { type: Boolean, default: false }
}
```

### 1.2 IPGeoCache Model

**File:** `myBrain-api/src/models/IPGeoCache.js`

**Strengths:**
- Simple, focused schema for caching
- Good TTL strategy (30 days is appropriate for IP reassignment cycles)
- `unique: true` on IP prevents duplicates

**Issues & Recommendations:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Missing `latitude`/`longitude` | High | Add for distance calculations |
| `resolvedAt` used for TTL but plan says 30 days | Low | Verify TTL field matches |
| No validation on IP format | Low | Add IPv4/IPv6 validation |

**Recommended Addition:**
```javascript
latitude: { type: Number, default: null },
longitude: { type: Number, default: null },
```

### 1.3 SecurityAlert Model

**File:** `myBrain-api/src/models/SecurityAlert.js`

**Strengths:**
- Well-defined alert types with clear categorization
- Severity levels match industry standards (info/warning/critical)
- 1-hour deduplication via `createAlert` static method is smart
- Status workflow (unread -> read -> dismissed) is intuitive

**Issues & Recommendations:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| `metadata` is untyped Mixed | Low | Consider typed subdocument for common fields |
| 90-day TTL is on `createdAt`, not `dismissedAt` | Medium | Critical alerts may be dismissed but still valuable |
| No index on `severity` alone | Low | May need for admin dashboards |

**TTL Concern:**
The plan uses TTL on `createdAt` with 90 days. This means:
- Critical security alerts are deleted 90 days after creation, regardless of status
- Consider: Keep dismissed alerts for 30 days, unread for 180 days

**Alternative TTL Strategy:**
```javascript
// Option A: Simple TTL (current plan)
securityAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Option B: Keep critical alerts longer (recommended)
// Use a scheduled job instead of TTL to delete based on severity + age
```

### 1.4 FailedLogin Model

**File:** `myBrain-api/src/models/FailedLogin.js`

**Strengths:**
- Good separation from rate limiting (different purpose)
- `attemptedEmail` indexing enables account-targeted attack detection
- 7-day TTL is appropriate for security pattern analysis

**Issues & Recommendations:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| `emailExists` Boolean is redundant with `userId` | Low | Remove - null userId already indicates non-existent email |
| `distinct` queries for password spray detection may be slow | Medium | Add compound index |
| No rate limiting on FailedLogin creation itself | Low | Could be exploited to fill DB |

**Missing Index:**
```javascript
// For password spray detection (getRecentByIP with distinct)
failedLoginSchema.index({ ip: 1, timestamp: -1, attemptedEmail: 1 });
```

### 1.5 Log Model Extensions

**Current State:** Log model is well-designed with comprehensive indexing.

**Proposed Changes:**
- Add `device` to `clientInfo` subdocument
- Add new indexes for activity queries

**Assessment:**
- Changes are additive and backwards compatible
- No migration needed for existing documents (fields will be undefined)

**Recommended Indexes for Activity API:**
```javascript
// For activity grouping query (Phase 3)
logSchema.index({ userId: 1, eventName: 1, timestamp: -1 });

// For category filtering using regex
// WARNING: Regex on route won't use standard indexes efficiently
// Consider adding explicit category field instead
logSchema.index({ userId: 1, method: 1, timestamp: -1 });
```

---

## 2. Index Strategy Analysis

### 2.1 Proposed Indexes vs Query Patterns

| Collection | Index | Query Pattern | Efficiency |
|------------|-------|---------------|------------|
| Session | `userId + status + lastActivityAt` | Get active sessions | GOOD |
| Session | `jwtId + status` | Auth validation | GOOD |
| Session | `expiresAt` (TTL) | Auto-cleanup | GOOD |
| SecurityAlert | `userId + status + createdAt` | User's alerts | GOOD |
| SecurityAlert | `createdAt` (TTL) | Auto-cleanup | GOOD |
| FailedLogin | `ip + timestamp` | Recent by IP | GOOD |
| FailedLogin | `userId + timestamp` | Recent by user | GOOD |
| FailedLogin | `timestamp` (TTL) | Auto-cleanup | GOOD |
| IPGeoCache | `ip` (unique) | Lookup cache | GOOD |
| IPGeoCache | `resolvedAt` (TTL) | Auto-cleanup | GOOD |

### 2.2 Missing Indexes (Performance Risk)

**HIGH PRIORITY:**
1. **Activity API category filter** - Uses `$regexMatch` on route field
   - Regex queries cannot use B-tree indexes efficiently
   - **Recommendation:** Add explicit `category` field to Log model

2. **Activity grouping aggregation** - Groups by `eventName` with hour truncation
   - Need: `{ userId: 1, eventName: 1, timestamp: -1 }`

3. **Security checks using `distinct`** - `Session.distinct('device.browser')` and `Session.distinct('location.city')`
   - Distinct operations scan all matching documents
   - **Recommendation:** Add covered indexes

**MEDIUM PRIORITY:**
4. **SecurityAlert for admin views** - Missing `severity` index for filtering

5. **FailedLogin password spray** - Missing compound index for IP + email distinct

### 2.3 Index Overhead Assessment

| Collection | Estimated Indexes | Write Impact |
|------------|-------------------|--------------|
| Session | 3-4 | Low (one write per login) |
| SecurityAlert | 2-3 | Low (rare writes) |
| FailedLogin | 3-4 | Medium (many failed attempts possible) |
| IPGeoCache | 2 | Low (cached, infrequent) |
| Log (additions) | +2 | Low (already heavily indexed) |

**Total new indexes:** ~12-15
**Impact:** Acceptable. Write overhead is minimal given the write patterns.

---

## 3. Query Performance Analysis

### 3.1 High-Risk Queries

**1. Activity Grouping Aggregation (Phase 3)**

```javascript
Log.aggregate([
  { $match: query },
  { $sort: { timestamp: -1 } },
  { $limit: parsedLimit * 3 },
  {
    $group: {
      _id: { eventName: '$eventName', hour: { $dateTrunc: { date: '$timestamp', unit: 'hour' } } },
      // ...
    }
  }
])
```

**Concerns:**
- `$match` with regex on `route` field is O(n) scan
- `$group` with `$dateTrunc` computed at runtime
- Sorting before grouping is expensive

**Recommendation:**
```javascript
// 1. Add category field to Log model (denormalization)
// 2. Pre-filter with indexed fields before regex
// 3. Use materialized view or pre-computed hourly stats
```

**2. Statistics API with Multiple Aggregations (Phase 3)**

```javascript
const [totalActions, byCategory, byDay, loginCount] = await Promise.all([
  Log.countDocuments(...),
  Log.aggregate([...$switch with $regexMatch...]),
  Log.aggregate([...$dayOfWeek...]),
  Log.countDocuments(...)
]);
```

**Concerns:**
- 4 parallel queries hitting the same collection
- `$switch` with `$regexMatch` cannot use indexes
- `$dayOfWeek` computed at runtime

**Recommendation:**
- Pre-compute daily/weekly stats in a separate collection
- Use the existing `UsageStats` model pattern
- Or add category field to avoid regex

**3. Session Validation with Cache (Phase 1)**

```javascript
const session = await Session.findOne({
  sessionId: sid,
  jwtId: jti,
  status: 'active'
}).select('_id').lean();
```

**Assessment:** This is well-designed.
- Uses indexed fields
- Projection minimizes data transfer
- In-memory cache with 60s TTL reduces DB hits
- `lean()` skips Mongoose hydration

**4. `distinct` Queries for New Device/Location Detection**

```javascript
const knownBrowsers = await Session.distinct('device.browser', {
  userId,
  createdAt: { $gte: lookback }
});
```

**Concerns:**
- `distinct` scans all matching documents
- With many sessions, this could be slow

**Recommendation:**
- Add covered index: `{ userId: 1, createdAt: -1, 'device.browser': 1 }`
- Or maintain a denormalized `knownDevices` array on User model
- Or use aggregation with `$group` which can use indexes better

### 3.2 Index Coverage Analysis

| Query | Fields Used | Index Available | Covered? |
|-------|-------------|-----------------|----------|
| Get active sessions | userId, status, lastActivityAt | Yes | Partial |
| Validate session | sessionId, jwtId, status | Yes (jwtId+status) | No |
| User's alerts | userId, status, createdAt | Yes | Partial |
| Failed logins by user | userId, timestamp | Yes | Partial |
| Activity by category | userId, route (regex), timestamp | No | NO |
| Activity stats | userId, eventName, timestamp | Needs adding | Partial |

---

## 4. TTL Strategy Review

### 4.1 Proposed TTL Values

| Collection | TTL Field | Duration | Assessment |
|------------|-----------|----------|------------|
| Session | expiresAt | 30 days after expiry | APPROPRIATE |
| SecurityAlert | createdAt | 90 days | ACCEPTABLE |
| FailedLogin | timestamp | 7 days | APPROPRIATE |
| IPGeoCache | resolvedAt | 30 days | APPROPRIATE |
| Log | timestamp | 90 days (existing) | NO CHANGE |

### 4.2 TTL Consistency Review

**Good:**
- All TTL indexes use standard MongoDB TTL pattern
- Consistent with existing models (Log, AnalyticsEvent, RateLimitEvent)
- Environment variable configuration follows Log.js pattern

**Concerns:**
- Session TTL is 30 days **after expiry**, not creation
  - This is correct but needs clear documentation
  - Sessions with 7-day JWT life will be deleted 37 days after creation

- SecurityAlert deletes all alerts after 90 days regardless of severity
  - Critical alerts may be valuable for longer
  - Consider keeping critical alerts for 1 year

### 4.3 TTL Field Recommendations

```javascript
// Session: Good - TTL on expiresAt makes sense
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// SecurityAlert: Consider severity-based retention
// Option: Add expiresAt field, set based on severity
// critical: 365 days, warning: 90 days, info: 30 days

// FailedLogin: 7 days is good for short-term pattern detection
failedLoginSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// IPGeoCache: 30 days is appropriate
ipGeoCacheSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
```

---

## 5. Data Volume Projections

### 5.1 Per-User Estimates

| Collection | Events/User/Day | Documents/User/Month |
|------------|-----------------|----------------------|
| Session | 1-3 logins | 30-90 |
| SecurityAlert | 0-2 alerts | 0-60 |
| FailedLogin | 0-5 failures | 0-150 (7-day TTL caps this) |
| IPGeoCache | N/A (shared) | N/A |
| Log (activity) | 50-200 actions | 1500-6000 |

### 5.2 Collection Size Projections

**Assumptions:**
- 100 active users (current: ~1 user)
- 1000 active users (future)

| Collection | 100 Users | 1000 Users | Notes |
|------------|-----------|------------|-------|
| Session | ~9K docs | ~90K docs | 30-day TTL |
| SecurityAlert | ~6K docs | ~60K docs | 90-day TTL |
| FailedLogin | ~5K docs | ~50K docs | 7-day TTL |
| IPGeoCache | ~1K docs | ~5K docs | Shared cache |
| Log | ~180K docs | ~1.8M docs | 90-day TTL |

### 5.3 Storage Estimates

| Collection | Avg Doc Size | 1000 Users Storage |
|------------|--------------|-------------------|
| Session | ~1 KB | ~90 MB |
| SecurityAlert | ~500 bytes | ~30 MB |
| FailedLogin | ~400 bytes | ~20 MB |
| IPGeoCache | ~300 bytes | ~1.5 MB |
| Log | ~1.5 KB | ~2.7 GB |

**Total additional storage at 1000 users:** ~2.8 GB
**MongoDB Atlas M10 limit:** 10 GB
**Assessment:** Well within limits, but Log collection dominates

---

## 6. Existing Model Integration

### 6.1 Session Model Conflicts

**Concern:** Does "Session" conflict with any existing session handling?

**Analysis:**
- No existing `Session` model in the codebase
- Current auth uses stateless JWT stored in HttpOnly cookies
- User model has `lastLoginAt` and `lastLoginIp` (single values)
- No conflict detected

**Integration Points:**
- Auth routes (`auth.js`) need modification to create sessions
- Auth middleware (`auth.js`) needs session validation
- User model's `lastLoginIp` becomes redundant but can coexist

### 6.2 Log Model Extension

**Backwards Compatibility:**
- Adding `device` to `clientInfo` is additive
- Existing documents will have `device: undefined`
- No migration required
- New indexes won't affect existing queries

**Recommended Approach:**
```javascript
// In requestLogger.js, check before accessing
const device = log.clientInfo?.device || { type: 'unknown', browser: 'Unknown', os: 'Unknown' };
```

### 6.3 IPGeoCache vs Existing Caching

**Existing Patterns:**
- No IP geolocation caching currently exists
- `SavedLocation` model is user-specific, not IP-based
- Weather API uses external caching (WeatherAPI)

**Assessment:** IPGeoCache is a new pattern but appropriate for this use case.

### 6.4 Notification Integration

**Plan:** SecurityAlert creates Notifications for critical alerts.

**Integration Check:**
```javascript
// Notification.type enum includes 'security_alert' - ALREADY EXISTS
// actionUrl pattern: '/app/settings?tab=activity' - COMPATIBLE
// This integration is well-designed
```

---

## 7. Migration & Rollback Strategy

### 7.1 Migration Plan

**Phase 1 Migration (Session, IPGeoCache):**
1. Deploy new models (no data migration needed)
2. Modify auth routes to create sessions on login
3. Existing JWTs continue to work (no `sid` claim = skip session check)
4. Gradual transition as users re-login

**Phase 2 Migration (SecurityAlert, FailedLogin):**
1. Deploy new models
2. Enable security checks
3. No data migration needed

**Phase 3 Migration (Log extension):**
1. Add new indexes to Log collection
   - **WARNING:** Index creation on large collections can impact performance
   - Use `{ background: true }` option
   - Schedule during low-traffic period
2. Update requestLogger to include device info
3. Existing logs remain unchanged

### 7.2 Index Creation Script

```javascript
// Run manually during maintenance window
db.logs.createIndex(
  { userId: 1, eventName: 1, timestamp: -1 },
  { background: true, name: 'activity_query_idx' }
);

db.logs.createIndex(
  { userId: 1, route: 1, timestamp: -1 },
  { background: true, name: 'activity_route_idx' }
);
```

### 7.3 Rollback Plan

**Phase 1 Rollback:**
1. Comment out session validation in auth middleware
2. Sessions continue to be created (harmless)
3. Users don't notice any change

**Phase 2 Rollback:**
1. Disable security checks in auth routes
2. Alerts stop being created
3. Existing alerts remain (will TTL out)

**Phase 3 Rollback:**
1. Revert activity endpoint to simple query
2. New indexes remain (harmless, can drop later)
3. Device info in logs remains (harmless)

### 7.4 Data Cleanup (if needed)

```javascript
// Drop new collections entirely (nuclear option)
db.sessions.drop();
db.securityalerts.drop();
db.failedlogins.drop();
db.ipgeocaches.drop();

// Remove new indexes from Log
db.logs.dropIndex('activity_query_idx');
db.logs.dropIndex('activity_route_idx');
```

---

## 8. Recommendations Summary

### 8.1 Critical (Must Fix Before Implementation)

1. **Add latitude/longitude to Session.location and IPGeoCache**
   - Required for impossible travel detection
   - Currently plan references `calculateDistance()` but no coordinates stored

2. **Add explicit category field to Log model** (or create ActivitySummary model)
   - Regex matching on `route` field cannot be indexed
   - Will cause full collection scans as data grows

### 8.2 High Priority (Should Fix)

3. **Add covered indexes for `distinct` queries**
   ```javascript
   sessionSchema.index({ userId: 1, createdAt: -1, 'device.browser': 1 });
   sessionSchema.index({ userId: 1, createdAt: -1, 'location.city': 1 });
   ```

4. **Add compound index for password spray detection**
   ```javascript
   failedLoginSchema.index({ ip: 1, timestamp: -1, attemptedEmail: 1 });
   ```

5. **Rename `device.type` to avoid Mongoose reserved word issues**
   - Use `device.deviceType` instead

### 8.3 Medium Priority (Consider)

6. **Consider severity-based TTL for SecurityAlert**
   - Critical alerts may be valuable for compliance/audit for 1 year

7. **Pre-compute activity statistics**
   - Avoid running expensive aggregations on every stats request
   - Use pattern from existing `UsageStats` model

8. **Add validation on sessionId format**
   ```javascript
   sessionId: {
     type: String,
     required: true,
     unique: true,
     validate: {
       validator: v => /^ses_[A-Za-z0-9_-]{20}$/.test(v),
       message: 'Invalid session ID format'
     }
   }
   ```

### 8.4 Low Priority (Nice to Have)

9. **Add IP format validation to FailedLogin and IPGeoCache**
10. **Remove redundant `emailExists` field from FailedLogin**
11. **Document TTL behavior in model comments**

---

## 9. Performance Monitoring Plan

### 9.1 Queries to Monitor

After deployment, monitor these queries for performance:

1. **Session validation** (auth middleware)
   - Target: < 5ms (with cache hit), < 50ms (cache miss)
   - Alert if: > 100ms average

2. **Activity list with grouping**
   - Target: < 200ms
   - Alert if: > 500ms average

3. **Activity statistics**
   - Target: < 500ms
   - Alert if: > 2000ms average

4. **New device/location detection**
   - Target: < 100ms
   - Alert if: > 300ms average

### 9.2 Collection Size Monitoring

Set up alerts for:
- Session collection > 100K documents
- Log collection > 2M documents
- Any collection > 5GB

### 9.3 Index Usage Monitoring

After 1 week, run:
```javascript
db.sessions.aggregate([{ $indexStats: {} }]);
db.securityalerts.aggregate([{ $indexStats: {} }]);
db.failedlogins.aggregate([{ $indexStats: {} }]);
db.logs.aggregate([{ $indexStats: {} }]);
```

Remove unused indexes, add missing ones based on query patterns.

---

## 10. Final Assessment

### 10.1 Approval Status: APPROVED WITH RECOMMENDATIONS

The database design is fundamentally sound and follows established patterns in the codebase. The main concerns are:

1. **Missing coordinates for impossible travel** - Must be fixed
2. **Regex-based category filtering** - Should be addressed before scale

### 10.2 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Session validation latency | Low | Medium | In-memory cache handles this |
| Activity query slowness | Medium | Low | Only affects user's own data |
| Index creation impact | Low | Medium | Use background indexing |
| TTL not working | Low | Low | Easy to fix, data grows slowly |

### 10.3 Go/No-Go Checklist

- [x] Schema design follows existing patterns
- [x] Indexes cover main query patterns
- [x] TTL strategy is appropriate
- [ ] Lat/lng added to location schemas (REQUIRED)
- [x] Backwards compatible with existing data
- [x] Rollback plan documented
- [x] No conflicts with existing models

**Verdict:** Proceed with implementation after adding latitude/longitude fields.

---

*Review completed by Database Engineer on 2026-01-29*
