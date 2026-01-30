# Activity Logs Feature - Backend Architecture Review

**Reviewer:** Senior Backend Engineer
**Date:** January 29, 2026
**Plans Reviewed:** Phases 1-3 of Activity Logs Feature

---

## Executive Summary

The Activity Logs feature proposes a comprehensive session management and security monitoring system across three phases. After thorough review of the existing codebase patterns in `myBrain-api`, I have identified several areas of strong alignment with existing architecture, as well as critical concerns that need to be addressed before implementation.

**Overall Assessment:** The plans are well-structured but require modifications to properly integrate with existing patterns, particularly around auth middleware, error handling, and the Wide Events logging system.

### Key Findings

| Category | Status | Severity |
|----------|--------|----------|
| Architecture Fit | Needs Adjustment | Medium |
| Auth Integration | Critical Issues | High |
| API Design | Good | Low |
| Service Layer | Needs Adjustment | Medium |
| Error Handling | Incomplete | Medium |
| Code Reuse | Good | Low |

---

## Phase 1: Session Model & Auth Integration

### Plan Overview
- Create new `Session.js` model
- Modify `auth.js` middleware
- Enhance `auth.js` routes (login/logout)
- Add session cleanup cron job

### Architecture Fit Analysis

**Positive Aspects:**
1. The proposed Session model structure follows existing Mongoose patterns (similar to `Notification.js`, `Log.js`)
2. Separation of device info into nested object is consistent with `clientInfo` in Log model
3. TTL indexes for automatic session expiration follows `Notification.js` pattern

**Concerns:**

#### 1. Session-JWT Relationship (CRITICAL)

The current auth system uses stateless JWTs stored in HttpOnly cookies. The plan proposes adding database sessions, creating a hybrid approach.

**Current Auth Flow (from `middleware/auth.js`):**
```javascript
const token = req.cookies.token;
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const user = await User.findById(decoded.userId);
```

**Proposed Change Risk:**
The plan suggests adding session validation in `requireAuth`:
```javascript
// Proposed (from plan)
const session = await Session.findById(decoded.sessionId);
if (!session || !session.isValid) {
  // Reject request
}
```

**Issues:**
1. **Breaking Change:** Existing JWTs do not contain `sessionId`. All existing sessions will fail validation.
2. **Migration Path Missing:** No plan for handling tokens issued before this change.
3. **Performance Impact:** Every authenticated request now requires a database lookup (Session.findById).

**Recommendations:**
- Add `sessionId` claim to JWT only for new tokens
- Make session validation optional during migration period (check if `sessionId` exists in token)
- Consider Redis for session store to reduce DB load
- Add session validation caching (in-memory TTL cache)

#### 2. Token Refresh Race Condition (HIGH)

The plan mentions updating `lastActivityAt` on each request. If user has multiple tabs open:

```
Tab 1: GET /notes       -> Updates session.lastActivityAt
Tab 2: GET /tasks       -> Updates session.lastActivityAt (race condition)
```

**Recommendation:**
- Debounce activity updates (update only if >1 minute since last update)
- Use MongoDB `$max` operator to avoid overwriting newer timestamps:
```javascript
await Session.findByIdAndUpdate(sessionId, {
  $max: { lastActivityAt: new Date() }
});
```

#### 3. Logout Session Handling

**Current logout (from `routes/auth.js`):**
```javascript
router.post('/logout', async (req, res) => {
  res.clearCookie('token', {...});
  req.eventName = 'auth_logout';
  res.json({ message: 'Logged out successfully' });
});
```

**Proposed logout needs to:**
1. Validate the session exists before invalidating
2. Handle case where session was already invalidated (concurrent logouts)
3. Clear cookie even if session invalidation fails (user should be logged out)

**Recommendation:**
```javascript
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Invalidate session if it exists (don't fail if already invalid)
    if (req.session) {
      await Session.findByIdAndUpdate(req.session._id, {
        isValid: false,
        endedAt: new Date(),
        endReason: 'user_logout'
      });
    }
  } catch (sessionError) {
    // Log but don't fail - still clear cookie
    console.error('Session invalidation failed:', sessionError);
  }

  res.clearCookie('token', {...});
  res.json({ message: 'Logged out successfully' });
});
```

### Session Model Review

**Proposed Schema Concerns:**

1. **Missing Index:** Need compound index on `(userId, isValid, createdAt)` for fetching active sessions by user

2. **Device Info Schema:**
```javascript
// Proposed
deviceInfo: {
  browser: String,
  os: String,
  device: String,
  userAgent: String
}
```

Should match existing `clientInfo` pattern from `Log.js`:
```javascript
// Existing pattern in Log.js
clientInfo: {
  ip: String,
  userAgent: String,
  // ...
}
```

**Recommendation:** Add IP address to deviceInfo, or rename to match existing `clientInfo` pattern for consistency.

3. **IP Geolocation:**
The plan mentions storing location data. Consider:
- Privacy implications (GDPR compliance)
- IP geolocation service reliability
- Caching geoip lookups to reduce external API calls

---

## Phase 2: Security Alerts System

### Plan Overview
- Create `securityService.js`
- Add `GET /profile/security-alerts`
- Add `POST /profile/sessions/:id/revoke`
- Add `POST /profile/sessions/revoke-all`

### Service Layer Analysis

**Positive Aspects:**
1. Follows existing service pattern (similar to `moderationService.js`)
2. Clear separation of security logic from route handling
3. Alert thresholds are configurable

**Concerns:**

#### 1. Alert Detection Logic

**Location Change Detection:**
```javascript
// Proposed (from plan)
if (newSession.location !== lastSession.location) {
  await createSecurityAlert('new_location', userId, newSession);
}
```

**Issues:**
- IP geolocation is imprecise (can change within same city)
- VPN users will trigger constant alerts
- Mobile users change networks frequently

**Recommendation:**
- Track location at city/region level, not precise coordinates
- Add alert suppression for known VPN IP ranges
- Allow users to mark locations as "trusted"
- Implement "significant change" threshold (different country, not different neighborhood)

#### 2. Rate Limiting for Security Endpoints

The plan doesn't mention rate limiting for:
- `POST /profile/sessions/:id/revoke` - Could be used to spam session revocations
- `POST /profile/sessions/revoke-all` - Destructive action needs protection

**Recommendation:**
```javascript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const securityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
});

router.post('/sessions/:id/revoke', requireAuth, securityRateLimit, async (req, res) => {...});
```

#### 3. Notification Integration

The plan creates new `security_alert` notification type. This already exists in `Notification.js`:
```javascript
// Existing in Notification.js
type: {
  enum: [
    // ...
    'security_alert', // Already exists!
    // ...
  ]
}
```

**Recommendation:** Reuse existing notification type. No need to create new one.

#### 4. Alert Service Pattern

The proposed `securityService.js` should follow `moderationService.js` pattern:

```javascript
// Current pattern in moderationService.js
export async function warnUser(targetUserId, adminId, { reason, level = 1 }) {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }
  // ... business logic
  return { user, action };
}
```

**Ensure securityService.js:**
- Throws errors with statusCode property
- Returns structured objects
- Doesn't access req/res directly
- Has comprehensive JSDoc comments (matching existing style)

---

## Phase 3: Enhanced Activity API

### Plan Overview
- 6 new endpoints for activity management
- Modifications to Log model
- Activity filtering and search

### API Design Review

**Proposed Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profile/activity` | GET | List activity (already exists!) |
| `/profile/activity/export` | GET | Export activity data |
| `/profile/activity/search` | GET | Search activity |
| `/profile/security-alerts` | GET | List security alerts |
| `/profile/sessions` | GET | List sessions |
| `/profile/sessions/:id/revoke` | POST | Revoke session |
| `/profile/sessions/revoke-all` | POST | Revoke all sessions |

**Critical Issue:** `GET /profile/activity` already exists in `profile.js` (lines 1295-1387)!

The existing endpoint:
- Returns human-readable activity descriptions
- Groups by date (timeline view)
- Filters by days and limit
- Uses the `formatActivityDescription()` helper

**Recommendation:**
1. Enhance existing endpoint instead of creating new one
2. Add new query parameters for additional filtering
3. Maintain backward compatibility with existing response format

**Enhanced endpoint suggestion:**
```javascript
// GET /profile/activity
// Existing params: limit, days
// New params: category, search, startDate, endDate

router.get('/activity', requireAuth, async (req, res) => {
  const {
    limit = 50,
    days = 30,
    // New optional params
    category,      // 'content' | 'account' | 'security' | 'settings'
    search,        // Text search in action descriptions
    startDate,     // ISO date string
    endDate        // ISO date string
  } = req.query;
  // ... enhanced implementation
});
```

### Log Model Modifications

**Proposed Changes:**
- Add new fields for enhanced filtering
- Add indexes for activity queries

**Current Log Model has:**
```javascript
// From requestLogger.js pattern
{
  requestId, timestamp, method, route, statusCode,
  userId, clientInfo, eventName, entityIds, metadata
}
```

**Recommendation:** The existing Log model appears sufficient. Add only:
1. Index on `(userId, timestamp, method)` if not exists
2. Index on `(userId, eventName)` for event-based filtering

**Do NOT add:**
- New fields that duplicate existing data
- Fields that could be derived at query time

---

## Cross-Cutting Concerns

### 1. Wide Events Logging Integration

All new endpoints must follow the Wide Events logging pattern documented in `.claude/rules/logging.md`:

```javascript
import { attachEntityId } from '../middleware/requestLogger.js';

// In route handlers:
attachEntityId(req, 'sessionId', session._id);
req.eventName = 'session.revoke.success';
```

**Checklist for each new endpoint:**
- [ ] Set `req.eventName` for significant actions
- [ ] Attach relevant entity IDs
- [ ] Capture mutation context (`req.mutation = { before, after }`)

### 2. Error Handling Consistency

All new routes must follow the pattern in `.claude/rules/api-errors.md`:

```javascript
// Use next(error) pattern
if (!session) {
  const error = new Error('Session not found');
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  return next(error);
}
```

**Do NOT use inconsistent patterns:**
```javascript
// Wrong - inconsistent with codebase
return res.status(404).json({ msg: 'not found' });
```

### 3. Middleware Order

New auth middleware changes must maintain order:
1. `requestLogger` (creates request context)
2. `requireAuth` (validates token, sets req.user)
3. `featureGate` (if applicable)
4. Route handler

### 4. Test Coverage

The plans don't mention testing strategy. Required tests:

**Unit Tests:**
- Session model validation
- Security service alert detection
- Activity formatting functions

**Integration Tests:**
- Session creation on login
- Session invalidation on logout
- Session revocation endpoints
- Activity export endpoint

**Edge Cases:**
- Concurrent login from multiple devices
- Session revocation during active request
- Clock skew for session expiration

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing auth | All users logged out | Migration period with optional validation |
| DB performance (session lookup per request) | Slower responses | Redis caching or in-memory TTL cache |
| Race conditions in activity updates | Data inconsistency | Debounce and use `$max` operator |

### Medium Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positive security alerts | User fatigue | Configurable thresholds, alert suppression |
| IP geolocation accuracy | Misleading location data | City-level precision, user feedback |
| Session table growth | DB size | TTL indexes, cleanup cron |

### Low Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| API response format changes | Frontend adjustments | Backward compatible enhancements |
| New indexes on Log collection | Brief performance dip | Off-peak deployment |

---

## Integration Checklist

Before implementation, verify:

### Phase 1 Prerequisites
- [ ] Define migration strategy for existing JWTs
- [ ] Set up session caching mechanism
- [ ] Create Session model with proper indexes
- [ ] Update JWT payload structure (add sessionId)
- [ ] Add feature flag for session validation (gradual rollout)

### Phase 2 Prerequisites
- [ ] Verify `security_alert` notification type exists (it does)
- [ ] Define IP geolocation provider and caching strategy
- [ ] Set up rate limiting for security endpoints
- [ ] Create securityService.js following moderationService.js patterns

### Phase 3 Prerequisites
- [ ] Audit existing `/profile/activity` endpoint
- [ ] Define export format (CSV? JSON?)
- [ ] Add required indexes to Log collection
- [ ] Plan for large activity exports (streaming, pagination)

---

## Recommendations Summary

### Must Fix (Before Implementation)

1. **Session-JWT Migration:** Add backward-compatible session validation that doesn't break existing tokens
2. **Race Condition:** Implement debounced activity updates with `$max` operator
3. **Existing Endpoint:** Enhance existing `/profile/activity` instead of creating duplicate
4. **Error Handling:** Ensure all new routes use `next(error)` pattern

### Should Fix (During Implementation)

1. **Performance:** Add caching layer for session validation
2. **Security:** Add rate limiting to session revocation endpoints
3. **Consistency:** Match existing `clientInfo` pattern in Session model
4. **Testing:** Create comprehensive test suite before deployment

### Could Fix (Future Enhancement)

1. **Trusted Locations:** Allow users to mark locations as trusted
2. **VPN Detection:** Reduce false positives for VPN users
3. **Alert Preferences:** User-configurable alert thresholds
4. **Real-time Updates:** WebSocket notifications for security alerts

---

## Conclusion

The Activity Logs feature plans are well-conceived and address real user needs for security visibility. However, the integration with the existing auth system requires careful handling to avoid breaking changes and performance issues.

**Recommended Approach:**
1. Implement Phase 1 with feature flag for gradual rollout
2. Add caching layer before enabling session validation for all users
3. Thoroughly test migration path with existing user sessions
4. Monitor performance metrics closely during rollout

The plans should be updated to address the critical issues identified in this review before proceeding with implementation.

---

*Review completed by Senior Backend Engineer*
*Next step: Update plans based on review findings*
