# Frontend Review: Activity Logs Phase 4

**Reviewer:** Senior Frontend Engineer
**Date:** 2026-01-29
**Plan:** `14-activity-logs-frontend.md`
**Status:** Needs Revision

---

## Executive Summary

The Phase 4 frontend plan proposes a comprehensive Activity page with 9 components and 4 hooks. While the overall architecture is sound, there are several areas where the plan deviates from established myBrain-web patterns, misses reuse opportunities, and has potential implementation issues that should be addressed before proceeding.

**Key Findings:**
- **Good:** Component decomposition, tab-based navigation using existing TabNav
- **Concerns:** Route structure incorrect, missing API client methods, pagination approach inconsistent, several reusable components not leveraged
- **Critical:** useInfiniteQuery not established pattern in codebase (only standard useQuery used)

---

## Component Architecture Analysis

### Positive Aspects

1. **Component Decomposition** - The plan breaks down the UI into logical, single-responsibility components (SessionCard, AlertCard, etc.)

2. **TabNav Reuse** - Correctly identifies and uses existing `TabNav` component from `components/ui/TabNav.jsx`

3. **Page Structure** - The ActivityPage layout follows existing patterns seen in SettingsPage.jsx

### Issues Identified

#### 1. Route Structure Mismatch (CRITICAL)

**Plan proposes:** `/settings/activity`

**Current routing pattern:** Settings is NOT a nested route. Looking at `App.jsx`:
```jsx
<Route path="settings" element={<SettingsPage />} />
```

The settings path does not use nested routes (`/settings/*`). Instead, SettingsPage handles all sections internally via useState.

**Options:**
- **Option A (Recommended):** Create `/app/activity` as a sibling route, similar to `/app/profile`
- **Option B:** Modify SettingsPage to use nested routes (larger change)

**Recommendation:** Use Option A. Create ActivityPage at `/app/activity` path.

#### 2. Folder Structure Inconsistent

**Plan proposes:**
```
myBrain-web/src/features/settings/components/activity/
myBrain-web/src/features/settings/hooks/
```

**Current patterns:**
- Settings feature has NO hooks folder currently
- Settings feature has NO components folder currently
- Other features use: `features/{name}/hooks/` and `features/{name}/components/`

**Recommendation:** Either:
1. Create `features/activity/` as a new feature module (cleaner)
2. Or add to settings but document the deviation

**Preferred:** Create as `features/activity/` - this is substantial enough to be its own feature.

---

## Hook Implementation Review

### Issue 1: useInfiniteQuery Not Established

**Plan uses:** `useInfiniteQuery` for LoginHistory

**Reality check:** The codebase does NOT currently use `useInfiniteQuery`. Every hook examined uses standard `useQuery` with skip/limit pagination:

- `useNotes.js` - uses `useQuery` with filters
- `useMessages.js` - uses `useQuery` with limit param
- `AdminLogsPage.jsx` - manual page state with skip/limit

**Recommendation:** Use the established pagination pattern:
```javascript
// Established pattern (AdminLogsPage style)
const [page, setPage] = useState(1);
const skip = (page - 1) * limit;

useQuery({
  queryKey: ['login-history', page, limit],
  queryFn: () => api.get('/profile/activity/logins', { params: { skip, limit } })
});
```

Or implement proper cursor-based with manual state, not useInfiniteQuery.

### Issue 2: Query Key Consistency

**Plan uses:**
```javascript
queryKey: ['sessions']
queryKey: ['security-alerts']
queryKey: ['login-history']
queryKey: ['activity-stats', period]
```

**Recommended pattern** (based on useNotes.js):
```javascript
// Define query keys factory
export const activityKeys = {
  all: ['activity'],
  sessions: () => [...activityKeys.all, 'sessions'],
  session: (id) => [...activityKeys.sessions(), id],
  alerts: () => [...activityKeys.all, 'alerts'],
  loginHistory: (params) => [...activityKeys.all, 'login-history', params],
  stats: (period) => [...activityKeys.all, 'stats', period],
};
```

This enables proper cache invalidation with `invalidateQueries({ queryKey: activityKeys.all })`.

### Issue 3: Missing API Client Methods

**Plan assumes** direct api.get() calls like:
```javascript
api.get('/auth/sessions')
api.get('/profile/security-alerts')
```

**Established pattern:** Define methods in `lib/api.js` under feature-specific objects:

```javascript
// Should be added to lib/api.js
export const profileApi = {
  // ... existing methods ...

  // New activity endpoints
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  logoutAll: () => api.post('/auth/logout-all'),

  getSecurityAlerts: (params) => api.get('/profile/security-alerts', { params }),
  dismissAlert: (id, data) => api.patch(`/profile/security-alerts/${id}`, data),

  getLoginHistory: (params) => api.get('/profile/activity/logins', { params }),
  getActivityStats: (params) => api.get('/profile/activity/stats', { params }),
  exportActivity: (params) => api.get('/profile/activity/export', { params, responseType: 'blob' }),
};
```

---

## Reuse Opportunities (CRITICAL)

### Components That MUST Be Reused

| Existing Component | Plan Should Use For |
|--------------------|---------------------|
| `Skeleton` | Loading states in all tabs |
| `Skeleton.List` | Sessions list loading |
| `Skeleton.Card` | Alert cards loading |
| `EmptyState` | All empty states (no sessions, no alerts, etc.) |
| `EmptyState.Error` | Error states with retry |
| `TabNav` | Already using (good) |
| `ConfirmDialog` | "Sign out all" confirmation |
| `BaseModal` | If any modals needed |

### Plan Issues

**SessionsListSkeleton mentioned but not defined:**
```jsx
if (isLoading) return <SessionsListSkeleton />;
```

**Should be:**
```jsx
if (isLoading) return <Skeleton.List count={3} />;
```

**Empty state in SessionsList:**
```jsx
<EmptyState icon={Monitor} title="..." description="..." />
```

**Should be:**
```jsx
import { EmptyState } from '../../../components/ui/EmptyState';
// Use the existing EmptyState which has proper styling
```

### Missing Toast Integration

The plan's mutations don't show toast feedback. Current pattern from SettingsPage.jsx:

```javascript
const toast = useToast();

const revokeMutation = useRevokeSession();

const handleRevoke = async (sessionId) => {
  try {
    await revokeMutation.mutateAsync(sessionId);
    toast.success('Session revoked');
  } catch (err) {
    toast.error(err.message || 'Failed to revoke session');
  }
};
```

---

## State Management Assessment

### URL State for Tabs

**Plan correctly uses:**
```jsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'overview';
```

This is good - allows deep linking to specific tabs.

### Missing Considerations

1. **Tab persistence on navigation** - When user navigates away and back, should tab persist? URL state handles this.

2. **Loading states per tab** - Each tab component should handle its own loading, not parent (plan does this correctly).

3. **Error boundaries** - Consider wrapping each tab content with ErrorBoundary for isolation.

---

## UI/UX Pattern Consistency

### Matches Existing Patterns

- Card-based UI (SessionCard) matches other cards
- Button styling uses established classes
- Color usage (danger for revoke) is consistent

### Deviations to Address

1. **Badge on Tab** - Plan shows badge count on alerts tab:
   ```jsx
   { id: 'alerts', label: 'Security Alerts', icon: ShieldAlert, badge: alertsData?.unreadCount }
   ```

   **Issue:** TabNav component doesn't support `badge` prop, only `count`:
   ```jsx
   // From TabNav.jsx line 32
   {tab.count != null && tab.count > 0 && (
   ```

   **Fix:** The `count` prop is already supported. Change `badge` to `count` in plan.

2. **StatCard Component** - Not defined in plan or existing UI components.

   **Options:**
   - Create as part of this feature
   - Generalize and add to `components/ui/StatCard.jsx` for reuse elsewhere

   **Recommendation:** Create in `components/ui/` as it could be reused in admin dashboards.

---

## Data Flow Analysis

### API Endpoint Matching

| Frontend Hook | Expected Backend Endpoint | Verified? |
|---------------|---------------------------|-----------|
| useSessions | GET /auth/sessions | Phase 1 plan |
| useRevokeSession | DELETE /auth/sessions/:id | Phase 1 plan |
| useLogoutAll | POST /auth/logout-all | Phase 1 plan |
| useSecurityAlerts | GET /profile/security-alerts | Phase 2 plan |
| useDismissAlert | PATCH /profile/security-alerts/:id | Phase 2 plan |
| useLoginHistory | GET /profile/activity/logins | Phase 3 plan |
| useActivityStats | GET /profile/activity/stats | Phase 3 plan |
| (export) | GET /profile/activity/export | Phase 3 plan |

**All endpoints verified in backend plans.**

### Pagination Alignment

**Backend (Phase 3) uses:** Cursor-based pagination with `nextCursor`

**Frontend should match:**
```javascript
// If using cursor-based:
{ params: { cursor: pageParam, limit: 20 } }

// Response shape:
{ items: [...], nextCursor: 'abc123' | null }
```

---

## Missing Considerations

### 1. Real-time Updates via WebSocket

Security alerts and sessions could benefit from real-time updates:
- New security alert triggers
- Session revoked from another device

**Recommendation:** Add WebSocket listener in ActivityPage:
```jsx
import { useSocketEvent } from '../../hooks/useWebSocket.jsx';

useSocketEvent('security:alert', (alert) => {
  queryClient.invalidateQueries({ queryKey: activityKeys.alerts() });
  toast.warning('New security alert');
});

useSocketEvent('session:revoked', (data) => {
  queryClient.invalidateQueries({ queryKey: activityKeys.sessions() });
});
```

### 2. Optimistic Updates

Session revoke could benefit from optimistic update:
```javascript
useMutation({
  mutationFn: (id) => profileApi.revokeSession(id),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: activityKeys.sessions() });
    const prev = queryClient.getQueryData(activityKeys.sessions());
    queryClient.setQueryData(activityKeys.sessions(), old => ({
      ...old,
      sessions: old.sessions.filter(s => s.id !== id)
    }));
    return { prev };
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(activityKeys.sessions(), context.prev);
  }
});
```

### 3. Accessibility

Plan doesn't address:
- ARIA labels for session actions
- Keyboard navigation for session list
- Screen reader announcements for alert status changes
- Focus management after revoke/dismiss actions

**Add to components:**
```jsx
<button
  aria-label={`Revoke session on ${session.device.display}`}
  role="button"
  ...
>
```

### 4. Mobile Responsiveness

Plan mentions "tabs scroll horizontally" but doesn't specify implementation.

**Current TabNav behavior:** Does NOT scroll on mobile. Plan should either:
1. Use TabNav's `variant="pill"` which has overflow handling
2. Or add horizontal scroll wrapper

### 5. Error Handling in Mutations

Plan's mutations lack error handling:
```javascript
// Plan shows:
useMutation({
  mutationFn: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
  onSuccess: () => queryClient.invalidateQueries(['sessions'])
});

// Should include:
useMutation({
  mutationFn: (sessionId) => profileApi.revokeSession(sessionId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: activityKeys.sessions() });
    toast.success('Session revoked');
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Failed to revoke session');
  }
});
```

---

## Recommendations Summary

### Must Fix Before Implementation

1. **Route path:** Change from `/settings/activity` to `/app/activity`
2. **Feature folder:** Create as `features/activity/` not nested in settings
3. **Query keys:** Use factory pattern like useNotes
4. **API methods:** Add to `lib/api.js` profileApi object
5. **Pagination:** Use established skip/limit pattern, not useInfiniteQuery
6. **Reuse EmptyState:** Import existing component
7. **Reuse Skeleton:** Use existing variants
8. **Tab badge:** Change `badge` to `count` to match TabNav API

### Should Fix

1. Add toast feedback to mutations
2. Add optimistic updates for revoke/dismiss
3. Add WebSocket listeners for real-time updates
4. Add ConfirmDialog for "Sign out all"
5. Create StatCard as reusable UI component
6. Add error boundaries per tab

### Consider

1. Accessibility improvements (ARIA, keyboard nav)
2. Mobile tab scrolling solution
3. Export progress indicator for large exports

---

## Implementation Checklist (Revised)

### Phase 4A: Setup and Hooks

- [ ] Create `features/activity/` folder structure
- [ ] Add API methods to `lib/api.js` profileApi
- [ ] Create `hooks/useActivityData.js` with query keys factory
- [ ] Create `useSessions` hook with proper patterns
- [ ] Create `useSecurityAlerts` hook
- [ ] Create `useLoginHistory` hook (skip/limit pagination)
- [ ] Create `useActivityStats` hook
- [ ] Add route to App.jsx at `/app/activity`

### Phase 4B: Components

- [ ] Create `ActivityPage.jsx` with tab navigation
- [ ] Create `ActivityOverview.jsx` using Skeleton, EmptyState
- [ ] Create `SessionsList.jsx` with ConfirmDialog for bulk action
- [ ] Create `SessionCard.jsx` with proper accessibility
- [ ] Create `LoginHistory.jsx` with established pagination
- [ ] Create `SecurityAlerts.jsx`
- [ ] Create `AlertCard.jsx`
- [ ] Create `ActivityTimeline.jsx` (can reuse existing timeline pattern from SettingsPage)
- [ ] Create `ActivityExport.jsx`
- [ ] Create `DeviceIcon.jsx`
- [ ] Add `StatCard.jsx` to `components/ui/`

### Phase 4C: Integration

- [ ] Add WebSocket listeners for real-time updates
- [ ] Update SettingsPage with summary card linking to activity page
- [ ] Test all tabs and interactions
- [ ] Verify mobile responsiveness
- [ ] Add unit tests for hooks

---

## Files Reference

### Existing Files to Import From

| Import | From |
|--------|------|
| Skeleton | `../../components/ui/Skeleton` |
| EmptyState | `../../components/ui/EmptyState` |
| TabNav | `../../components/ui/TabNav` |
| ConfirmDialog | `../../components/ui/ConfirmDialog` |
| useToast | `../../hooks/useToast` |
| profileApi | `../../lib/api` |
| useSocketEvent | `../../hooks/useWebSocket.jsx` |

### Reference Implementation Files

- `features/admin/AdminLogsPage.jsx` - Pagination pattern
- `features/notes/hooks/useNotes.js` - Query keys factory pattern
- `features/settings/SettingsPage.jsx` - Timeline grouping (ActivitySettings component)
- `features/messages/hooks/useMessages.js` - Real-time WebSocket pattern

---

## Conclusion

The plan has good architectural foundations but needs revision to align with established myBrain-web patterns. The most critical issues are:

1. Incorrect route structure
2. Using useInfiniteQuery when codebase uses skip/limit
3. Missing API client method definitions
4. Not leveraging existing UI components

With the revisions outlined above, the implementation will be more consistent with the codebase and easier to maintain.

**Recommendation:** Revise plan before implementation, then proceed with Phase 4A-C checklist.
