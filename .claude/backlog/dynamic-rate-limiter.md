# Feature: Dynamic Rate Limiter Configuration

**Created:** 2026-01-29
**Priority:** Low (workaround exists)
**Status:** Backlog

---

## Problem

The rate limit settings (Time Window, Max Attempts) in the admin panel save to the database but **don't actually take effect** until server restart. This is because `express-rate-limit` is configured once at startup with static values.

## Current Workaround

1. Trusted IPs whitelist works immediately (IPs bypass rate limiting)
2. Enable/Disable toggle works immediately
3. For config changes: modify code and restart server

## Proposed Solution

Replace `express-rate-limit` with `rate-limiter-flexible`:

```javascript
// Instead of static config
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Static
  max: 10,                    // Static
});

// Use dynamic config
import { RateLimiterMongo } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMongo({
  storeClient: mongoose.connection,
  points: config.maxAttempts,      // Dynamic from DB
  duration: config.windowMs / 1000  // Dynamic from DB
});
```

## Implementation Plan

See: `.claude/plans/rate-limit-backend-fixes-plan.md` (Fix 1: Dynamic Rate Limiting)

## Effort Estimate

- 2-3 hours implementation
- Needs careful testing (rate limiting is security-critical)

## When to Implement

Consider implementing when:
- Multiple users need real-time rate limit adjustments
- Frequent brute force attacks require quick response
- Non-technical admins need to manage settings

## Related Files

- `myBrain-api/src/routes/auth.js` - Rate limiter middleware
- `myBrain-api/src/models/SystemSettings.js` - Config storage
- `myBrain-web/src/features/admin/AdminSystemPage.jsx` - Admin UI

---

*Note: A UI warning was added to AdminSystemPage.jsx explaining this limitation.*
