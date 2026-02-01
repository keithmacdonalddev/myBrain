# Data Persistence Technical Analysis

**Document Purpose:** Deep dive into myBrain's data persistence mechanisms
**Date:** 2026-01-31
**Scope:** Frontend state management, caching, localStorage, Redux

---

## Table of Contents
1. [Redux State Persistence](#redux-state-persistence)
2. [TanStack Query Caching](#tanstack-query-caching)
3. [localStorage Implementation](#localstorage-implementation)
4. [Authentication Token Management](#authentication-token-management)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Identified Gaps](#identified-gaps)

---

## Redux State Persistence

### Current Implementation

**Redux Store Location:** `myBrain-web/src/store/index.js`

```javascript
// Store configuration
export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    toast: toastReducer,
    lifeAreas: lifeAreasReducer,
    sidebar: sidebarReducer,
  },
});
```

### Slices Analysis

#### 1. authSlice.js - Authentication State
**Persistence Mechanism:** Hybrid (localStorage + HttpOnly cookies)

**State Properties:**
```javascript
{
  user: null,           // User object from server
  isAuthenticated: false,
  isLoading: true,      // Starts true for auth check
  error: null
}
```

**Persistence Points:**

| Action | Persistence | Code Location |
|--------|-------------|---------------|
| Login | localStorage token | `api.js` line 19: `localStorage.setItem(TOKEN_KEY, token)` |
| Logout | Remove token | `api.js` line 24: `localStorage.removeItem(TOKEN_KEY)` |
| CheckAuth | Validate server | `authSlice.js` line 62-79: Server-side validation |
| Session Restore | Via token | `api.js` line 28: `getAuthToken()` retrieves on app mount |

**Key Function: App Mount Auth Check**
```javascript
// App.jsx line 92
useEffect(() => {
  dispatch(checkAuth());  // Validates token on mount
  dispatch(initializeTheme());
}, [dispatch]);
```

**Async Thunk: checkAuth()**
```javascript
// authSlice.js lines 62-79
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await authApi.getMe();  // Server validation
      if (response.data.user) {
        dispatch(loadSidebarPreference(response.data.user));
      }
      return response.data.user;
    } catch (error) {
      clearAuthToken();  // Clear if invalid
      return null;
    }
  }
);
```

**Issues Identified:**
- ✅ Token properly cleared on logout
- ✅ Token validated on app mount
- ✅ Fallback to clear token if invalid
- ⚠️ Token expiration not handled (server-side?)

#### 2. themeSlice.js - Theme Persistence
**Persistence Mechanism:** localStorage (100% explicit)

**State Properties:**
```javascript
{
  mode: 'dark',              // 'light', 'dark', or 'system'
  effectiveTheme: 'dark',    // actual applied theme
  accentColor: 'blue',       // accent color ID
  reduceMotion: false,       // accessibility preference
  glassIntensity: 'medium',  // 'low', 'medium', 'high'
  themeId: 'apple'          // dashboard theme
}
```

**localStorage Keys:**
```
'themeMode'        → mode (light/dark/system)
'accentColor'      → accent color ID
'glassIntensity'   → glass effect level
'reduceMotion'     → boolean (as string)
'dashboardThemeId' → dashboard theme ID
'theme'            → LEGACY (for backwards compat)
```

**Persistence Implementation:**

```javascript
// themeSlice.js line 154-166
setThemeMode: (state, action) => {
  const mode = action.payload;
  state.mode = mode;
  state.effectiveTheme = getEffectiveTheme(mode);
  localStorage.setItem('themeMode', mode);  // PERSIST
  localStorage.removeItem('theme');         // Clean legacy
  applyThemeToDocument(...);
}
```

**Initialization on Mount:**
```javascript
// themeSlice.js line 29-44
const getInitialMode = () => {
  if (typeof window === 'undefined') return 'dark';

  const stored = localStorage.getItem('themeMode');  // READ from storage
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored;
  }

  const legacyTheme = localStorage.getItem('theme');  // Fallback
  if (legacyTheme && ['light', 'dark'].includes(legacyTheme)) {
    return legacyTheme;
  }

  return 'system';  // Default
};
```

**Assessment:** ✅ EXCELLENT - Explicit, with fallback handling and legacy support

#### 3. sidebarSlice.js - Sidebar State
**Status:** Found in imports, needs detailed review

**Expected Behavior:**
- Sidebar collapsed/expanded state
- Sidebar preference from user object
- Persistence across navigation

#### 4. lifeAreasSlice.js - Life Areas
**Expected Behavior:**
- User's life area categories
- Loaded from user object
- Probably doesn't need explicit localStorage (server-side)

#### 5. toastSlice.js - Toast Notifications
**Expected Behavior:**
- Ephemeral state
- No persistence needed
- Auto-clears

---

## TanStack Query Caching

### Configuration in App.jsx

```javascript
// App.jsx lines 65-73
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      retry: 1,                   // Retry once on failure
    },
  },
});
```

### Implications

| Configuration | Impact | Behavior |
|---------------|--------|----------|
| staleTime: 5min | Cache validity | Fresh data from cache for 5min after fetch |
| retry: 1 | Error handling | Failed requests retry once, then fail |
| No gcTime | Cache retention | Default: 5 min after unused |

### Data Caching Flow

```
User Create Task
    ↓
API Call: POST /tasks
    ↓
Server Response: { task: {...}, success: true }
    ↓
TanStack Query Cache: Cache response with staleTime=5min
    ↓
Page Refresh (within 5min)
    ↓
TanStack Query: Check cache status
    → If fresh (< 5min): Return from cache (instant)
    → If stale (> 5min): Refetch from server (fresh data)
    ↓
User sees data (from cache or fresh fetch)
```

### Issue: No Persistent Cache

**Finding:** TanStack Query caches only in memory
- [ ] No localStorage integration
- [ ] No IndexedDB for offline
- [ ] Cache lost on browser close
- [ ] Cold start = empty cache

**Implications:**
- First load after browser restart: Must fetch from server
- If API down: No fallback to cached data
- Offline: No access to previously cached data

---

## localStorage Implementation

### Verified Keys

| Key | Set By | Location | Persistence |
|-----|--------|----------|-------------|
| mybrain_token | authApi.login() | api.js:19 | ✅ Survives refresh & close |
| themeMode | setThemeMode() | themeSlice.js:161 | ✅ Verified |
| accentColor | setAccentColor() | themeSlice.js:182 | ✅ Explicit |
| glassIntensity | setGlassIntensity() | themeSlice.js:201 | ✅ Explicit |
| reduceMotion | setReduceMotion() | themeSlice.js:190 | ✅ Explicit |
| dashboardThemeId | setThemeId() | themeSlice.js:212 | ✅ Explicit |
| theme | LEGACY | themeSlice.js | ⚠️ Only for backwards compat |

### Risk Assessment

**High Confidence Persistent:**
- ✅ Auth token (verified implementation)
- ✅ All theme settings (explicit persistence)
- ✅ Accessibility prefs (explicit persistence)

**Unknown:**
- ❓ Form drafts (not found in search)
- ❓ Filter state (need to check each feature)
- ❓ Scroll position (not found)
- ❓ Sidebar collapsed state (need to verify sidebarSlice.js)

---

## Authentication Token Management

### Token Storage Strategy

```
Token Flow on Login
───────────────────────────────────────

Server Response
    ├── token: "eyJhbGc..." (JWT)
    ├── user: {...user data}
    └── success: true

Client Processing (authSlice.js:30-44)
    ├── setAuthToken(token) → localStorage.setItem('mybrain_token', token)
    ├── setUser(user) → Redux state
    └── setIsAuthenticated(true)

API Requests (api.js:32-41)
    ├── Request interceptor
    ├── getAuthToken() → localStorage.getItem('mybrain_token')
    ├── Set header: Authorization: "Bearer {token}"
    └── Send request with token
```

### Token Lifecycle

```javascript
// api.js: Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();  // Retrieve on EVERY request
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

**Assessment:**
- ✅ Token persists across page refresh
- ✅ Token validated on app mount (checkAuth)
- ✅ Token sent with every API request
- ✅ Token cleared on logout
- ⚠️ Token expiration handling unclear (server-side?)

---

## Data Flow Diagrams

### Diagram 1: Full Page Refresh Flow

```
User Refreshes Browser (F5)
        ↓
App.jsx mounts
        ↓
useEffect() runs (line 91-94)
        ├── dispatch(checkAuth())
        │        ↓
        │   getMe() API call
        │        ↓
        │   Server validates token
        │        ├── If valid: Return user object
        │        └── If invalid: Reject, clear token
        │
        └── dispatch(initializeTheme())
                 ↓
            getInitialMode() from localStorage
                 ↓
            Apply theme to document
        ↓
App fully loaded
        ├── TanStack Query cache check
        │   ├── If fresh (< 5min): Show from cache
        │   └── If stale (> 5min): Refetch from API
        │
        └── Redux state intact
            ├── theme: From localStorage ✅
            ├── auth: From server validation ✅
            └── UI renders with current state
```

### Diagram 2: Logout → Login Flow

```
User Logout
        ├── authSlice.logout() called
        ├── API: POST /auth/logout
        ├── Redux: user = null, isAuthenticated = false
        ├── localStorage: Remove token
        └── Redirect to /login

User Login
        ├── Form submission
        ├── authSlice.login({ email, password }) called
        ├── API: POST /auth/login
        ├── Response: { token, user, success }
        ├── setAuthToken(token) → localStorage ✅
        ├── setUser(user) → Redux state ✅
        ├── TanStack Query: Cache invalidated? ⚠️ VERIFY
        └── Redirect to /app
```

**Question:** Are TanStack Query caches invalidated on logout?
- If not, user might see old cached data from previous user
- This is a **SECURITY ISSUE** if not handled

### Diagram 3: Multi-Tab Scenario

```
Tab A                       Tab B
────────────────────────────────────
Create Task                 (Idle)
    │
    ├─→ API: POST /tasks
    │        ↓
    │    Server: Save to DB
    │        ↓
    │    Response: { task, success }
    │
    ├─→ TanStack Cache updated
    ├─→ Redux? (if shared)
    └─→ UI updates

                            Question: Does Tab B know?
                            ├── localStorage event? ❌ Not likely
                            ├── WebSocket? ⚠️ VERIFY
                            ├── Manual refresh? ✅ Yes
                            └── Polling? ⚠️ UNCLEAR
```

---

## Identified Gaps

### Gap 1: Form Draft Persistence ❌
**Issue:** No form state saving mechanism found
**Risk:** HIGH - Data loss potential
**Solution:**
- [ ] Add auto-save to form components
- [ ] Save to localStorage
- [ ] Show "Unsaved changes" warning
- [ ] Restore on return

### Gap 2: Scroll Position Not Restored ❌
**Issue:** Scroll resets on navigation
**Risk:** LOW - UX issue, not data loss
**Solution:**
- [ ] Use React Router scroll restoration
- [ ] Save scroll position on navigation away
- [ ] Restore on navigation back

### Gap 3: Multi-Tab Sync Unclear ⚠️
**Issue:** How changes in one tab sync to another?
**Risk:** MEDIUM - Stale data potential
**Solution:**
- [ ] Test WebSocket for real-time sync
- [ ] Add storage event listeners if needed
- [ ] Document expected behavior

### Gap 4: TanStack Query Cache Security ❌
**Issue:** Cache not cleared on logout?
**Risk:** HIGH - Security issue
**Solution:**
- [ ] Clear all queries on logout
- [ ] Verify `queryClient.clear()` called
- [ ] Check logoutSuccess handler

### Gap 5: No Offline Persistence ❌
**Issue:** No IndexedDB or service worker
**Risk:** MEDIUM - Offline access lost
**Solution:**
- [ ] Consider adding IndexedDB
- [ ] Implement service worker
- [ ] Sync on reconnect

### Gap 6: No Conflict Detection ⚠️
**Issue:** Concurrent edits not detected
**Risk:** MEDIUM - Last-write-wins silently
**Solution:**
- [ ] Add edit timestamps
- [ ] Detect conflicts on server
- [ ] Show conflict UI to user

---

## Recommendations

### Critical (Do First)
1. **Verify Cache Security on Logout**
   - Ensure TanStack Query cache cleared
   - Prevent user B seeing user A's cached data
   - Code to check: `authSlice.js` logout handler

2. **Test Multi-Tab Behavior**
   - Create task in tab A
   - Check if tab B sees it without refresh
   - Document findings

3. **Verify Form Auto-Save Exists**
   - Search for draft saving
   - If missing, implement it

### Important (Do Soon)
4. **Add Scroll Position Restoration**
5. **Implement Form State Validation**
6. **Document Concurrent Edit Behavior**

### Nice to Have
7. **Add IndexedDB for offline**
8. **Add service worker**
9. **Add conflict resolution UI**

---

## Testing Checklist

### Unit Testing
- [ ] Redux slices persist/restore from localStorage
- [ ] Theme getInitialMode() reads from localStorage
- [ ] Auth checkAuth() validates token
- [ ] TanStack Query cache configuration correct

### Integration Testing
- [ ] Full logout → login → data appears
- [ ] Page refresh → state restored
- [ ] Browser close/open → logged in automatically
- [ ] Cache invalidation on logout

### End-to-End Testing
- [ ] Create task → refresh → task persists
- [ ] Multi-tab → create in A → appears in B?
- [ ] Logout from A → B still logged in?
- [ ] Concurrent edits → last-write-wins?

---

## Conclusion

**Current State:**
- Redux + localStorage integration: ✅ GOOD
- Theme persistence: ✅ EXCELLENT
- Auth token management: ✅ GOOD
- TanStack Query caching: ⚠️ NEEDS VERIFICATION
- Form draft saving: ❌ MISSING
- Offline persistence: ❌ MISSING
- Multi-tab sync: ⚠️ UNCLEAR
- Conflict detection: ❌ MISSING

**Overall Assessment:** MEDIUM confidence in data persistence
- Core mechanisms in place
- Manual testing required to verify
- Some gaps identified that should be addressed

---

**Document Generated:** 2026-01-31
**Analysis Type:** Code Review + Architecture Assessment
**Next Steps:** Execute manual test procedures
