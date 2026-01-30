# Security Review: Activity Logs Feature

**Reviewer:** Senior Security Engineer
**Date:** 2026-01-29
**Plans Reviewed:** 10-14 (Activity Logs Overview, Session Model, Security Alerts, Enhanced API, Frontend)
**Status:** REVIEW COMPLETE

---

## Executive Summary

The Activity Logs feature introduces significant changes to the authentication system, including session management, JWT modifications, and security alerting. While the overall design is sound, there are several security concerns that need to be addressed before implementation.

### Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Requires fix before implementation |
| High | 3 | Should be fixed before production |
| Medium | 5 | Should be addressed |
| Low | 4 | Recommendations |

---

## Critical Findings

### CRIT-01: Session Cache Bypass Attack Vector

**Location:** Phase 1 - Auth Middleware Session Validation (Plan 11)

**Issue:** The 1-minute in-memory session cache creates a window where revoked sessions can still be used.

```javascript
// Current plan:
const sessionCache = new Map();
// Cache TTL: 60 seconds

async function validateSession(sid, jti) {
  const cached = sessionCache.get(cacheKey);
  if (cached && Date.now() - cached.checkedAt < 60000) {
    return cached.isValid;  // Returns cached result for up to 60 seconds
  }
  // ... database check
}
```

**Attack Scenario:**
1. Attacker compromises a valid session token
2. User notices suspicious activity and revokes the session
3. Attacker has up to 60 seconds to continue using the revoked session

**Impact:** High - Compromised sessions cannot be immediately revoked, defeating the purpose of session revocation.

**Recommendation:**
```javascript
// Option 1: Reduce cache TTL significantly
const CACHE_TTL = 15000; // 15 seconds max

// Option 2: Use cache invalidation on revocation
export async function invalidateSessionCache(sessionId) {
  sessionCache.delete(`${sessionId}:*`);  // Clear all JTI variants
}

// Call from revocation endpoints
await invalidateSessionCache(sessionId);

// Option 3: Critical operations skip cache
async function validateSession(sid, jti, skipCache = false) {
  if (!skipCache) {
    const cached = sessionCache.get(cacheKey);
    // ...
  }
  // Always hit database
}

// For sensitive operations (password change, profile update):
const isValid = await validateSession(decoded.sid, decoded.jti, true);
```

**Priority:** Must fix before implementation

---

## High Severity Findings

### HIGH-01: Password Change Does Not Revoke All Sessions

**Location:** Phase 2 - Security Service Integration (Plan 12)

**Issue:** The plan mentions creating a `password_changed` security alert but does NOT explicitly revoke all other sessions when password is changed.

**Current code in profile.js:**
```javascript
// POST /profile/change-password
user.passwordHash = passwordHash;
user.passwordChangedAt = new Date();
await user.save();
// No session revocation!
```

**Attack Scenario:**
1. Attacker has valid session token from stolen credentials
2. User changes password (thinking they're securing account)
3. Attacker's old session remains valid until JWT expires (7 days!)

**Impact:** Critical security gap - password change should invalidate all sessions.

**Recommendation:**
Add to password change flow:
```javascript
// After password change succeeds:
await Session.updateMany(
  { userId: user._id, status: 'active' },
  {
    status: 'revoked',
    revokedAt: new Date(),
    revokedReason: 'password_changed'
  }
);

// Optionally keep current session (force re-login is more secure)
// Or re-issue a new JWT with new session
```

**Priority:** Must fix before production

---

### HIGH-02: Geolocation API Failure Handling

**Location:** Phase 1 - Login Flow (Plan 11)

**Issue:** The plan shows geolocation being called but doesn't specify error handling:

```javascript
// Get location (don't block login if slow)
const location = await getLocationFromIP(req.ip);
```

**Concerns:**
1. What happens if ip-api.com is down? Does login fail?
2. What happens if geolocation throws an exception?
3. What is the timeout? Could it delay login significantly?

**Recommendations:**
```javascript
// Wrap in try-catch with timeout
let location = { ip: req.ip, geoResolved: false };
try {
  const locationPromise = getLocationFromIP(req.ip);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Geo timeout')), 3000)
  );
  location = await Promise.race([locationPromise, timeoutPromise]);
  location.ip = req.ip;
} catch (error) {
  console.warn('[AUTH] Geolocation failed, continuing without:', error.message);
  // Login should succeed even if geo fails
}
```

**Priority:** Must handle before production

---

### HIGH-03: Failed Login Tracking Can Enable Account Enumeration

**Location:** Phase 2 - Failed Login Tracking (Plan 12)

**Issue:** The FailedLogin model stores whether an email exists:

```javascript
const failedLoginSchema = new mongoose.Schema({
  attemptedEmail: { type: String, required: true },
  emailExists: { type: Boolean, default: false },  // SENSITIVE!
  // ...
});
```

While the login endpoint returns the same error for both invalid email and wrong password (good!), this data is stored in the database. If accessed through:
- Admin APIs
- Security alerts
- Data export
- Database breach

An attacker could enumerate valid accounts.

**Recommendation:**
1. Don't store `emailExists` field
2. Or encrypt it
3. Or only store for admin users (reduce exposure)

```javascript
// Remove emailExists entirely from the model
// OR only track attempts against existing accounts:
if (user) {
  failureData.userId = user._id;
  failureData.reason = 'wrong_password';
  await FailedLogin.create(failureData);
  await checkFailedLoginPattern(user._id);
}
// Don't create record for non-existent emails (they can't be attacked)
```

**Priority:** Should fix before production

---

## Medium Severity Findings

### MED-01: Activity Export Rate Limiting Missing

**Location:** Phase 3 - Export Endpoint (Plan 13)

**Issue:** The `/profile/activity/export` endpoint processes up to 10,000 log entries and formats them for download. No rate limiting is specified.

```javascript
const logs = await Log.find({...}).limit(10000).lean();
const activities = logs.map(log => {
  // CPU-intensive formatting for each log
});
```

**Attack Scenario:**
1. Attacker repeatedly calls export endpoint
2. Each call processes 10,000 documents
3. Server CPU exhaustion, DoS

**Recommendation:**
```javascript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour max
  message: { error: 'Too many export requests', code: 'RATE_LIMITED' }
});

router.get('/activity/export', requireAuth, exportLimiter, async (req, res) => {
  // ...
});
```

**Priority:** Should add before production

---

### MED-02: Session Endpoints Missing Authorization Checks

**Location:** Phase 1 - Session Management Endpoints (Plan 11)

**Issue:** The plan doesn't show authorization checks for session operations:

```javascript
// DELETE /auth/sessions/:sessionId
// Should verify the session belongs to the requesting user!
```

**Recommendation:**
```javascript
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  const session = await Session.findOne({ sessionId: req.params.sessionId });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // CRITICAL: Verify ownership
  if (session.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  // Now safe to revoke
  await session.revoke('user_revoked');
  res.json({ message: 'Session revoked' });
});
```

**Priority:** Must add before implementation

---

### MED-03: Security Alert Status Endpoint Vulnerable to IDOR

**Location:** Phase 3 - Security Alerts API (Plan 13)

**Issue:** The PATCH endpoint for dismissing alerts only checks if alert exists:

```javascript
router.patch('/security-alerts/:id', requireAuth, async (req, res) => {
  const alert = await SecurityAlert.findOneAndUpdate(
    { _id: id, userId: req.user._id },  // Good - has userId check
    // ...
  );
  // ...
});
```

**Analysis:** The plan actually shows the userId check, which is correct. However, ensure this is implemented exactly as shown. The original code in the plan is secure.

**Status:** No action needed if implemented as planned.

---

### MED-04: Search Parameter Regex Injection

**Location:** Phase 3 - Enhanced Activity Endpoint (Plan 13)

**Issue:** The search parameter is used directly in a regex:

```javascript
if (search) {
  query.$or = [
    { eventName: { $regex: search, $options: 'i' } },
    { route: { $regex: search, $options: 'i' } }
  ];
}
```

**Attack Scenario:**
1. User provides: `search=.*.*.*.*.*.*.*.*.*.*a`
2. ReDoS (Regular Expression Denial of Service)

**Recommendation:**
```javascript
// Escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (search) {
  const safeSearch = escapeRegex(search);
  query.$or = [
    { eventName: { $regex: safeSearch, $options: 'i' } },
    { route: { $regex: safeSearch, $options: 'i' } }
  ];
}

// Or use text search instead of regex
```

**Priority:** Should fix before production

---

### MED-05: Cursor Pagination Date Injection

**Location:** Phase 3 - Activity API (Plan 13)

**Issue:** The cursor parameter is passed directly to Date constructor:

```javascript
if (cursor) {
  query.timestamp = { $lt: new Date(cursor) };
}
```

**Concerns:**
1. Invalid date strings should be validated
2. Could this be used to bypass filtering?

**Recommendation:**
```javascript
if (cursor) {
  const cursorDate = new Date(cursor);
  if (isNaN(cursorDate.getTime())) {
    return res.status(400).json({ error: 'Invalid cursor format', code: 'INVALID_CURSOR' });
  }
  query.timestamp = { $lt: cursorDate };
}
```

**Priority:** Should validate input

---

## Low Severity Findings

### LOW-01: IP Address Logged in Plain Text

**Location:** Multiple plans - Session, FailedLogin, Log models

**Issue:** IP addresses are stored in plain text. While necessary for security features, this is PII in some jurisdictions (GDPR).

**Recommendation:**
- Document the data retention period (currently 7-90 days depending on model)
- Consider hashing IPs for older records
- Add to privacy policy
- Ensure export includes IP disclosure notice

---

### LOW-02: User-Agent Parsing Could Be Improved

**Location:** Phase 1 - Device Parser (Plan 11)

**Issue:** The plan mentions using regex patterns for User-Agent parsing. This can be fragile and may not handle all cases.

**Recommendation:**
Consider using a well-maintained library like `ua-parser-js` instead of custom regex:

```javascript
import UAParser from 'ua-parser-js';

export function parseUserAgent(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  return {
    type: getDeviceType(result.device),
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || '',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || ''
  };
}
```

---

### LOW-03: Impossible Travel Detection Limitations

**Location:** Phase 2 - Security Service (Plan 12)

**Issue:** The impossible travel detection has some limitations:
1. VPN users will trigger false positives
2. Multiple family members sharing account could trigger alerts
3. 1000 km/h threshold may not account for supersonic travel (rare but possible)

**Recommendation:**
- Add a "trusted VPN" or "known locations" feature
- Consider making severity "warning" instead of "critical" for first occurrence
- Add dismissal reason options: "VPN", "Shared account", "False positive"

---

### LOW-04: Session TTL vs JWT Expiration Mismatch Possible

**Location:** Phase 1 - Session Model (Plan 11)

**Issue:**
- JWT expires in 7 days
- Session TTL index deletes after 30 days past `expiresAt`
- This is actually correct, but could be confusing

**Recommendation:**
Add comment explaining the logic:
```javascript
// TTL: 30 days AFTER session expires
// This keeps sessions for audit purposes after JWT expires
// JWT (7 days) + TTL (30 days) = 37 days total retention
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
```

---

## Authentication Flow Review

### Login Flow Security Analysis

```
Current Plan:
1. Validate credentials
2. Create session with device/location
3. Check if new device/location
4. Generate JWT with sid/jti
5. Set cookie
6. Return response
7. (Async) Process security checks
```

**Concerns:**
1. Security checks run async AFTER response - user won't see alerts immediately
2. No MFA support considered
3. No account lockout after failed attempts (only rate limiting)

**Recommendations:**
1. Consider showing "new device" alert in login response
2. Plan for MFA addition in future
3. Consider temporary lockout after N failures (plan shows alerts but not lockout)

### Logout Flow Security Analysis

```
Current Plan:
1. Extract sid from JWT
2. Revoke session in database
3. Clear cookie
4. Return success
```

**Issue:** If session revocation fails (database error), the cookie is still cleared. User thinks they're logged out, but session remains valid.

**Recommendation:**
```javascript
router.post('/logout', async (req, res) => {
  try {
    if (sid) {
      await Session.findOneAndUpdate(
        { sessionId: sid },
        { status: 'revoked', revokedAt: new Date(), revokedReason: 'user_logout' }
      );
    }
    res.clearCookie('token', getCookieOptions());
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Still clear cookie even if DB fails
    res.clearCookie('token', getCookieOptions());
    // But log the error
    console.error('[AUTH] Session revocation failed:', error);
    res.json({ message: 'Logged out successfully', warning: 'Session cleanup delayed' });
  }
});
```

---

## Data Protection Assessment

### Sensitive Data Inventory

| Data | Model | Retention | Privacy Concern |
|------|-------|-----------|-----------------|
| IP Address | Session, FailedLogin, Log, IPGeoCache | 7-90 days | PII (GDPR) |
| User-Agent | Session, FailedLogin, Log | 7-90 days | Device fingerprinting |
| Location (City/Country) | Session, IPGeoCache | 30 days | PII (GDPR) |
| Login timestamps | Session, Log | 30-90 days | Behavioral data |
| Failed passwords | NOT STORED | N/A | Correct - never log passwords |

### Account Deletion Considerations

**Current State:** No explicit mention in plans about what happens to Session, FailedLogin, SecurityAlert data when account is deleted.

**Recommendation:** Add cascade delete:
```javascript
// When user account is deleted:
await Session.deleteMany({ userId: user._id });
await FailedLogin.deleteMany({ userId: user._id });
await SecurityAlert.deleteMany({ userId: user._id });
```

### Export Data Privacy

The activity export includes IP addresses. Consider:
1. Warning user that export contains IP data
2. Option to anonymize IPs in export
3. Adding to privacy policy that users can export their data

---

## Rate Limiting Assessment

### Current Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| POST /auth/login | 10 per 15 min | Good - exists |
| POST /auth/register | 10 per 15 min | Good - exists |
| GET /auth/sessions | None specified | Should add |
| DELETE /auth/sessions/:id | None specified | Should add |
| POST /auth/logout-all | None specified | Should add (prevent DoS on sessions table) |
| GET /profile/activity | None specified | Should add |
| GET /profile/activity/export | None specified | MUST add (resource intensive) |
| GET /profile/security-alerts | None specified | Should add |

### Failed Login DoS Concern

**Issue:** The failed login tracking creates database writes on every failed attempt. An attacker could:
1. Send many failed logins for random emails
2. Fill up FailedLogin collection
3. Trigger excessive security alerts

**Mitigation:** The 7-day TTL helps, but consider:
1. Rate limit at IP level for ALL failed logins (not just valid accounts)
2. Cap FailedLogin documents per email (e.g., keep only last 20)

---

## Security Testing Checklist

### Authentication Tests
- [ ] Login with valid credentials creates session
- [ ] Login with invalid email returns same error as wrong password
- [ ] Login with correct email, wrong password returns generic error
- [ ] JWT contains sid and jti claims
- [ ] Session is created in database with correct data
- [ ] Rate limiting blocks after 10 attempts in 15 minutes

### Session Management Tests
- [ ] GET /auth/sessions returns only current user's sessions
- [ ] DELETE /auth/sessions/:id only works for own sessions
- [ ] Cannot delete current session
- [ ] POST /auth/logout-all revokes all except current
- [ ] Revoked session returns 401 on next request
- [ ] Session cache invalidates within acceptable time

### Security Alert Tests
- [ ] New device login creates alert
- [ ] New location login creates alert
- [ ] 3 failed logins creates warning alert
- [ ] 5 failed logins creates critical alert + notification
- [ ] Impossible travel detection triggers on unrealistic speed
- [ ] Alert deduplication works (1 hour window)
- [ ] PATCH /security-alerts/:id only works for own alerts

### Data Protection Tests
- [ ] Activity export respects date range limits
- [ ] Export is rate limited
- [ ] Search parameter is sanitized (no ReDoS)
- [ ] Cursor pagination validates date format
- [ ] Account deletion removes related session/alert data

### Authorization Tests
- [ ] All session endpoints require authentication
- [ ] All activity endpoints require authentication
- [ ] Session operations verify ownership
- [ ] Alert operations verify ownership
- [ ] Cannot access other users' data through ID manipulation

---

## Recommendations Summary

### Must Fix Before Implementation
1. **CRIT-01:** Session cache bypass - reduce TTL or add invalidation
2. **HIGH-01:** Password change must revoke all sessions
3. **MED-02:** Session endpoints must verify ownership

### Must Fix Before Production
1. **HIGH-02:** Handle geolocation API failures gracefully
2. **HIGH-03:** Don't store emailExists in FailedLogin
3. **MED-01:** Add rate limiting to export endpoint
4. **MED-04:** Escape regex in search parameter
5. **MED-05:** Validate cursor date format

### Should Address
1. Add rate limiting to all new endpoints
2. Add cascade delete for account deletion
3. Document IP retention and add to privacy policy
4. Consider using ua-parser-js library
5. Plan for MFA support in session model

### Nice to Have
1. Trusted VPN/location feature for impossible travel
2. IP anonymization option in export
3. Account lockout after N failures

---

## Approval Status

**Recommendation:** CONDITIONAL APPROVAL

This feature can proceed to implementation with the following conditions:
1. All Critical and High severity findings must be addressed
2. Medium severity findings should be addressed before production deployment
3. Security testing checklist must be completed before release

**Next Steps:**
1. Address CRIT-01 and HIGH findings in implementation
2. Create test cases for security checklist
3. Schedule security review of implemented code
4. Plan penetration testing before production release

---

*Review completed by: Senior Security Engineer*
*Review date: 2026-01-29*
