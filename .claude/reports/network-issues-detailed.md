# Network Failure Testing - Detailed Issues

**Test Date:** 2026-01-31
**Environment:** Production (https://my-brain-gules.vercel.app)

---

## Issue Summary Table

| ID | Title | Severity | Type | Status | Effort |
|----|-------|----------|------|--------|--------|
| NQ-001 | No offline indicator | Minor | UX | New | 1-2h |
| NQ-002 | Silent API failure on form submit | Minor | UX | New | 2-3h |
| NQ-003 | No automatic retry for mutations | Minor | UX | New | 3-4h |
| NQ-004 | Missing useNetworkStatus hook | Minor | Dev | New | 1-2h |
| NQ-005 | No request queuing system | Minor | Dev | New | 4-6h |

---

## Detailed Issues

### NQ-001: No Offline Indicator

**Severity:** Minor (UX)
**Category:** User Experience
**Status:** Open
**Priority:** High

#### Description
When the application goes offline, there is no visual indicator to the user that the connection has been lost. Users don't know whether they're viewing stale cached data or current data.

#### Current Behavior
- App continues to function
- Form submissions fail silently
- API calls fail without visible feedback
- No status bar or banner indicates offline state

#### Expected Behavior
- Visual indicator (status bar, badge, or banner) shows connection status
- Different styling for online vs offline
- User knows why features aren't working
- Clear indication of when connection returns

#### Impact
- User confusion about whether changes were saved
- Assumption that app is broken when it's just offline
- No awareness of why data might be stale
- Poor UX in unreliable network conditions

#### Recommended Solution
```jsx
// New component: OfflineIndicator.jsx
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-yellow-500 text-white flex items-center justify-center">
      <AlertTriangle className="w-4 h-4 mr-2" />
      You are offline - some features may not work
    </div>
  );
}
```

**Effort:** 1-2 hours
**Dependencies:** None
**Testing:** Test online/offline transitions, verify visibility, check mobile

---

### NQ-002: Silent API Failure on Form Submit

**Severity:** Minor (UX)
**Category:** Error Handling
**Status:** Open
**Priority:** High

#### Description
When a form is submitted and the API request fails (network error, timeout, server error), the form submission fails silently with no error message shown to the user.

#### Current Behavior
Observed in: Task creation form submission while offline
- User fills form and clicks Save
- Network request fails
- No error dialog or toast appears
- Form remains populated but user doesn't know why

#### Expected Behavior
- Error toast notification appears (e.g., "Failed to save: Network error")
- Toast includes retry button
- User sees what went wrong
- Clear next steps (retry, check connection, contact support)

#### Technical Root Cause
- API error handler in axios interceptor (api.js:1225-1240) enhances error
- But enhanced error is not displayed to user
- Components using API calls must implement their own error handling
- Not all components show error toasts

#### Impact
- User doesn't know if save succeeded
- Frustration when offline (no feedback)
- Possible data loss concerns
- Bad user experience

#### Recommended Solution
Create error toast handler:

```jsx
// In API response interceptor (api.js)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ... enhanced error creation ...

    // Show toast notification
    const message = enhancedError.message || 'An error occurred';
    const isNetworkError = !window.navigator.onLine;

    if (isNetworkError) {
      store.dispatch(showToast({
        type: 'error',
        message: 'Network error - you appear to be offline',
        duration: 5000,
        action: 'Retry'
      }));
    } else if (enhancedError.status >= 500) {
      store.dispatch(showToast({
        type: 'error',
        message: 'Server error - please try again later',
        duration: 5000
      }));
    } else if (enhancedError.status >= 400) {
      // Don't show generic 4xx errors - let component handle
    }

    return Promise.reject(enhancedError);
  }
);
```

**Effort:** 2-3 hours
**Dependencies:** Toast system (already exists)
**Testing:** Form submission offline, server error simulation, network error simulation

---

### NQ-003: No Automatic Retry for Mutations

**Severity:** Minor (UX)
**Category:** Feature
**Status:** Open
**Priority:** High

#### Description
When a mutation (POST, PATCH, DELETE) fails due to network error, the request is lost. User must manually resubmit the form after reconnecting.

#### Current Behavior
1. User fills form and submits while offline
2. Request fails
3. Form remains populated
4. User manually submits again
5. Success

#### Expected Behavior
1. User submits while offline
2. Request queued locally
3. When online, request automatically retries
4. Success without user action
5. User notified of pending changes

#### Why This Matters
- Offline-first applications auto-retry by default
- Users expect "optimistic updates"
- Better UX when connectivity is unreliable
- Reduces friction in poor network conditions

#### Recommended Solution
Implement request queuing:

```jsx
// hooks/useRequestQueue.js
export function useRequestQueue() {
  const queueRef = useRef([]);

  const enqueue = (fn) => {
    queueRef.current.push(fn);
    return fn();
  };

  useEffect(() => {
    const handleOnline = async () => {
      const queue = queueRef.current;
      queueRef.current = [];

      for (const fn of queue) {
        try {
          await fn();
        } catch (error) {
          console.error('Queued request failed:', error);
          // Re-queue on failure
          queueRef.current.push(fn);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return { enqueue };
}
```

**Effort:** 3-4 hours
**Dependencies:** IndexedDB or localStorage for persistence
**Testing:** Offline mutation, reconnect, verify retry, test error cases

---

### NQ-004: Missing useNetworkStatus Hook

**Severity:** Minor (Dev)
**Category:** Code Architecture
**Status:** Open
**Priority:** Medium

#### Description
There is no centralized hook for network status. Components that need to react to connectivity changes must implement their own `navigator.onLine` listeners.

#### Current Behavior
- No `useNetworkStatus` hook found in codebase
- Components implement own online/offline logic (duplication)
- No debouncing of rapid connection changes
- No unified way to check network status

#### Expected Behavior
```jsx
// Usage in any component
const { isOnline, isOffline } = useNetworkStatus();

if (isOffline) {
  return <OfflineMode />;
}

return <OnlineMode />;
```

#### Recommended Solution
Create reusable hook:

```jsx
// hooks/useNetworkStatus.js
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Debounce to prevent rapid flapping
    const debounceOnline = debounce(handleOnline, 500);
    const debounceOffline = debounce(handleOffline, 500);

    window.addEventListener('online', debounceOnline);
    window.addEventListener('offline', debounceOffline);

    return () => {
      window.removeEventListener('online', debounceOnline);
      window.removeEventListener('offline', debounceOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
}
```

**Effort:** 1-2 hours
**Dependencies:** useDebounce hook (may already exist)
**Testing:** Verify state changes, test debouncing, use in multiple components

---

### NQ-005: No Request Queuing System

**Severity:** Minor (Dev)
**Category:** Architecture
**Status:** Open
**Priority:** Medium

#### Description
Requests made while offline are lost. There is no system to queue mutations and replay them when the connection returns.

#### Current Behavior
1. App goes offline
2. User submits form
3. API call fails
4. Request is discarded
5. User must manually resubmit

#### Expected Behavior
1. App goes offline
2. User submits form
3. Request queued locally (IndexedDB)
4. Visual indicator shows "Saving..."
5. App reconnects
6. Queued requests auto-retry
7. Success, no user action needed

#### Why This Matters
- Offline-first is increasingly important
- Mobile users experience frequent disconnections
- Better UX in unreliable networks
- Reduces support burden

#### Technical Approach
Use IndexedDB to persist failed mutations:

```jsx
// utils/requestQueue.js
class RequestQueue {
  async enqueue(request) {
    // Store in IndexedDB
    const db = await this.getDB();
    const tx = db.transaction(['requests'], 'readwrite');
    tx.store.add({
      id: Date.now(),
      method: request.method,
      url: request.url,
      data: request.data,
      timestamp: Date.now()
    });
    return tx.done;
  }

  async replay() {
    const db = await this.getDB();
    const tx = db.transaction(['requests'], 'readonly');
    const requests = await tx.store.getAll();

    for (const req of requests) {
      try {
        await api[req.method.toLowerCase()](req.url, req.data);
        // Remove from queue
        const delTx = db.transaction(['requests'], 'readwrite');
        delTx.store.delete(req.id);
      } catch (error) {
        console.error('Replay failed:', error);
      }
    }
  }
}
```

**Effort:** 4-6 hours
**Dependencies:** IndexedDB setup, request format standardization
**Testing:** Queue requests offline, go online, verify replay, test error cases

---

## Test Evidence

### NQ-001: Offline Indicator
- **Tested:** Yes, offline page loads
- **Evidence:** Screenshot `network-qa-02-offline-login.png`
- **Result:** No indicator visible while offline

### NQ-002: Form Submission Error
- **Tested:** Yes, task form submitted offline
- **Evidence:** Screenshot `network-qa-06-offline-save-attempt.png`
- **Result:** No error dialog shown

### NQ-003: Auto-Retry
- **Tested:** Implicit (form resubmitted manually)
- **Evidence:** Form data preserved across offline/online
- **Result:** Manual retry worked, auto-retry not tested

### NQ-004: useNetworkStatus Hook
- **Tested:** Code analysis only
- **Evidence:** Grep search found no such hook
- **Result:** Hook doesn't exist

### NQ-005: Request Queuing
- **Tested:** Code analysis only
- **Evidence:** API responses not queued
- **Result:** No queuing system present

---

## Implementation Roadmap

### Phase 1 (Week 1-2): Quick Wins
- [ ] NQ-001: Add offline indicator (1-2h)
- [ ] NQ-002: Add error toast notifications (2-3h)
- **Total:** 3-5 hours

### Phase 2 (Week 3-4): Core Features
- [ ] NQ-004: Create useNetworkStatus hook (1-2h)
- [ ] NQ-003: Add automatic retry (3-4h)
- **Total:** 4-6 hours

### Phase 3 (Week 5-6): Advanced
- [ ] NQ-005: Implement request queuing (4-6h)
- [ ] Service worker caching (6-8h)
- **Total:** 10-14 hours

---

## Success Criteria

### For NQ-001
- [ ] Red status bar visible when offline
- [ ] Green status bar visible when online
- [ ] Consistent across pages
- [ ] Mobile responsive
- [ ] Works during rapid transitions

### For NQ-002
- [ ] Error toast appears on API failure
- [ ] Shows helpful error message
- [ ] Includes retry button
- [ ] Auto-dismisses after 5s
- [ ] Works for all API calls

### For NQ-003
- [ ] Failed mutations stored locally
- [ ] Auto-retried when online
- [ ] No duplicate submissions
- [ ] User notified of status
- [ ] Works offline-first

### For NQ-004
- [ ] Hook returns `{ isOnline, isOffline }`
- [ ] Debounced to prevent flapping
- [ ] Used in 3+ components
- [ ] Tested with rapid transitions
- [ ] Type-safe

### For NQ-005
- [ ] Requests stored in IndexedDB
- [ ] Replayed when online
- [ ] No duplicates on retry
- [ ] Handles errors gracefully
- [ ] UI shows pending changes

---

## Acceptance Criteria

All issues are "Minor" severity and don't block production. However, implementing them would significantly improve user experience, especially for:
- Mobile users on cellular networks
- Users in areas with poor coverage
- During network outages
- In offline-first scenarios

**Recommendation:** Implement Phase 1 immediately (quick wins), plan Phase 2 and 3 for next sprints.

---

**Report Generated:** 2026-01-31
**Testing Tool:** agent-browser
**Status:** All issues documented and actionable
