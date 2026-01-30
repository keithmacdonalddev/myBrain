# Frontend Code Review: Social Features, Messaging, and API Client

**Review Date:** 2026-01-29
**Reviewer:** Senior Frontend Engineer
**Scope:** Social features, Messaging components, API client, State management
**Overall Score:** 7.5/10

---

## Executive Summary

The myBrain frontend demonstrates solid React architecture with well-organized feature modules, proper use of TanStack Query for server state management, and consistent UI patterns. The social and messaging features are well-implemented with good separation of concerns between hooks, components, and pages.

**Key Strengths:**
- Excellent use of TanStack Query with custom hooks for data fetching
- Consistent component patterns across features
- Good error handling in mutations with toast notifications
- Well-structured WebSocket integration for real-time messaging
- Proper axios data extraction patterns in API client

**Areas for Improvement:**
- Missing PropTypes/TypeScript for type safety
- Some accessibility concerns in interactive elements
- Inconsistent modal patterns (not all use BaseModal)
- Missing error boundaries at feature level
- Some duplicate code across similar components

---

## 1. Social Features Components

### 1.1 SharedWithMePage.jsx

**Location:** `myBrain-web/src/features/social/pages/SharedWithMePage.jsx`

**Strengths:**
- Clean component structure with extracted sub-components (`SharedItemCard`)
- Good use of TanStack Query with proper query key management
- Well-implemented filter functionality with state management
- Proper handling of pending shares with accept functionality

**Issues Found:**

```jsx
// Issue: Missing key prop optimization - filter changes trigger re-renders
const { data, isLoading } = useQuery({
  queryKey: ['shared-with-me', filter],  // filter in queryKey causes refetch on filter change
  queryFn: () => itemSharesApi.getSharedWithMe({...})
});
```

**Recommendation:** Consider caching all shares and filtering client-side for better UX, or use staleTime to reduce refetches.

```jsx
// Issue: Missing aria-label on filter buttons
<button onClick={() => setFilter('all')} className="...">
  All
</button>
```

**Recommendation:** Add `aria-label` for accessibility and `role="group"` for filter button container.

### 1.2 ConnectionsPage.jsx

**Location:** `myBrain-web/src/features/social/pages/ConnectionsPage.jsx`

**Strengths:**
- Clean, minimal page component delegating to child components
- Proper use of URL search params for tab state
- Good responsive layout with grid system

**Issues Found:**
- No error boundary wrapping the page
- No loading fallback for child components

### 1.3 ConnectionsList.jsx

**Location:** `myBrain-web/src/features/social/components/ConnectionsList.jsx`

**Strengths:**
- Well-structured tab navigation
- Efficient conditional data fetching based on active tab
- Proper loading and empty states

**Issues Found:**

```jsx
// Issue: Query options missing 'enabled' support for conditional fetching
const connectionsQuery = useConnections({ enabled: activeTab === 'connections' });
```

Looking at useConnections hook:
```jsx
// The 'enabled' option is not being passed to useQuery
export function useConnections(options = {}) {
  const { limit = 50, skip = 0 } = options;  // 'enabled' not destructured
  return useQuery({
    queryKey: [...connectionKeys.list(), { limit, skip }],
    queryFn: async () => {...},
    // Missing: enabled: options.enabled
  });
}
```

**Recommendation:** Add `enabled` option support to all connection hooks to prevent unnecessary network requests.

### 1.4 UserProfilePage.jsx

**Location:** `myBrain-web/src/features/social/pages/UserProfilePage.jsx`

**Strengths:**
- Comprehensive profile display with stats, bio, and connection status
- Good handling of private profiles
- Proper block confirmation with modal
- Report modal integration

**Issues Found:**

```jsx
// Issue: Inline modal doesn't follow BaseModal pattern
{showBlockConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-panel border border-border rounded-lg p-6 max-w-sm w-full mx-4">
      ...
    </div>
  </div>
)}
```

**Recommendation:** Extract to a ConfirmDialog component or use existing ConfirmDialog from `src/components/ui/`.

```jsx
// Issue: Missing keyboard accessibility for dropdown menu
<button onClick={() => setShowMenu(!showMenu)} className="...">
  <MoreHorizontal className="w-5 h-5" />
</button>
```

**Recommendation:** Add `onKeyDown` handler for Escape key and focus management.

### 1.5 ShareModal.jsx

**Location:** `myBrain-web/src/features/social/components/ShareModal.jsx`

**Strengths:**
- Comprehensive share options (connection, public, password)
- Good permission level selection UI
- Proper handling of existing shares vs new shares
- Copy link functionality with visual feedback

**Issues Found:**

```jsx
// Issue: Not using BaseModal for consistent modal behavior
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className="relative bg-panel glass-heavy border...">
```

**Recommendation:** Extend BaseModal for consistent focus trapping, escape key handling, and animation.

```jsx
// Issue: Password visibility - using text input for password
<input
  type="text"  // Should be type="password" with toggle
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
```

**Recommendation:** Use password input with visibility toggle for better security.

---

## 2. Messaging Components

### 2.1 MessagesPage.jsx

**Location:** `myBrain-web/src/features/messages/pages/MessagesPage.jsx`

**Strengths:**
- Excellent responsive design with mobile/desktop views
- Real-time updates via WebSocket integration
- Good typing indicator implementation
- Clean separation of conversation list and thread

**Issues Found:**

```jsx
// Issue: useEffect with missing dependency causes eslint warning
useEffect(() => {
  if (selectedConversationId) {
    markAsReadMutation.mutate(selectedConversationId);
    setIsMobileListView(false);
  }
}, [selectedConversationId]);  // Missing: markAsReadMutation
```

**Recommendation:** Either add mutation to dependencies with useCallback, or use a ref to track the mutation.

```jsx
// Issue: Duplicate participant lookup logic
const getOtherParticipant = (conv) => {
  return conv?.participants?.find(p => p._id !== currentUser?._id);
};
```

This function is duplicated in ConversationList.jsx.

**Recommendation:** Extract to shared utility function.

### 2.2 MessageThread.jsx

**Location:** `myBrain-web/src/features/messages/components/MessageThread.jsx`

**Strengths:**
- Clean message grouping by date
- Good reaction picker implementation
- Proper auto-scroll behavior on new messages
- Attachment display handling

**Issues Found:**

```jsx
// Issue: Potential XSS vulnerability with message content
<p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
```

While React escapes content by default, if rich content is added later, this could be a risk.

**Recommendation:** Consider sanitization if supporting rich text/markdown in the future.

```jsx
// Issue: ReactionPicker uses emojis directly - may not work on all systems
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
```

**Recommendation:** Consider using emoji library or providing fallback for systems without emoji support.

### 2.3 MessageInput.jsx

**Location:** `myBrain-web/src/features/messages/components/MessageInput.jsx`

**Strengths:**
- Auto-resize textarea implementation
- File attachment support with previews
- Typing indicator integration
- Keyboard shortcut handling (Enter to send, Shift+Enter for newline)

**Issues Found:**

```jsx
// Issue: Console error logging without proper error handling
} catch (error) {
  console.error('Failed to upload attachments:', error);
  // No user feedback (toast notification)
}
```

**Recommendation:** Add toast notification for upload failures.

```jsx
// Issue: Emoji button disabled without explanation
<button disabled title="Emoji (coming soon)">
  <Smile className="w-5 h-5" />
</button>
```

**Recommendation:** Consider hiding the button entirely or using a tooltip component for better UX.

### 2.4 useMessages.js Hook

**Location:** `myBrain-web/src/features/messages/hooks/useMessages.js`

**Strengths:**
- Well-structured custom hooks for all messaging operations
- Proper cache management with query invalidation
- Real-time message handling with optimistic updates
- Good separation of concerns

**Issues Found:**

```jsx
// Issue: useMarkAsRead is a no-op - comments explain why but this could confuse developers
export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (conversationId) => {
      // GET messages already marks as read automatically
      // This is a no-op for now until explicit endpoint is added
      return { success: true, conversationId };
    },
    ...
  });
}
```

**Recommendation:** Either implement the endpoint or remove the hook until needed to avoid confusion.

```jsx
// Issue: Typing timeout clears ALL users every 5 seconds
useEffect(() => {
  const timer = setInterval(() => {
    setTypingUsers([]);  // Clears all, even if someone just started typing
  }, 5000);
  return () => clearInterval(timer);
}, []);
```

**Recommendation:** Track individual user timeouts instead of clearing all.

---

## 3. API Client Review

### 3.1 itemSharesApi Methods

**Location:** `myBrain-web/src/lib/api.js` (lines 1009-1062)

**Strengths:**
- Proper axios data extraction with `.then(res => res.data)`
- Comprehensive API coverage for all share operations
- Good parameter handling

**Pattern Analysis:**
```jsx
// Correct pattern - extracts data from axios response
export const itemSharesApi = {
  getSharedWithMe: (params = {}) =>
    api.get('/item-shares', { params }).then(res => res.data),
  ...
};
```

This is the correct pattern and is consistently applied across all itemSharesApi methods.

### 3.2 messagesApi Methods

**Location:** `myBrain-web/src/lib/api.js` (lines 1064-1140)

**Issue Found:**
```jsx
// Inconsistent pattern - returns axios response object
export const messagesApi = {
  getConversations: (params = {}) =>
    api.get('/messages/conversations', { params }),  // Returns AxiosResponse
  ...
};
```

The hooks then have to extract data:
```jsx
const { data } = await messagesApi.getConversations();
```

**Recommendation:** Standardize to `.then(res => res.data)` pattern like itemSharesApi for consistency.

### 3.3 connectionsApi Methods

**Location:** `myBrain-web/src/lib/api.js` (lines 935-984)

**Same Issue:** Returns raw axios response, requiring data extraction in hooks.

```jsx
export const connectionsApi = {
  getConnections: (params = {}) =>
    api.get('/connections', { params }),  // Inconsistent with itemSharesApi
  ...
};
```

**Recommendation:** Update all API methods to consistently extract data:
```jsx
getConnections: (params = {}) =>
  api.get('/connections', { params }).then(res => res.data),
```

---

## 4. State Management Review

### 4.1 Redux Usage (authSlice.js)

**Strengths:**
- Clean async thunk implementation
- Proper error handling in thunks
- Good token management with localStorage fallback

**Issues Found:**

```jsx
// Issue: Token cleared even on logout API failure - correct behavior but no retry logic
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
      clearAuthToken();
      return null;
    } catch (error) {
      clearAuthToken();  // Always clear - good
      return rejectWithValue(error.message);  // But still rejects - confusing
    }
  }
);
```

**Recommendation:** If logout always succeeds from user perspective, don't rejectWithValue.

### 4.2 TanStack Query Usage

**Strengths:**
- Excellent query key organization with factory functions
- Proper staleTime configuration
- Good invalidation patterns after mutations

**Best Practice Example:**
```jsx
export const connectionKeys = {
  all: ['connections'],
  list: () => [...connectionKeys.all, 'list'],
  pending: () => [...connectionKeys.all, 'pending'],
  // ...
};
```

### 4.3 WebSocket Context

**Location:** `myBrain-web/src/hooks/useWebSocket.jsx`

**Strengths:**
- Clean context-based WebSocket management
- Automatic connection/disconnection based on auth state
- Reconnection handling with configurable attempts
- Event subscription hooks

**Issues Found:**

```jsx
// Issue: Socket reference in useEffect dependencies
useEffect(() => {
  if (!isAuthenticated || !user) {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      ...
    }
    return;
  }
  ...
}, [isAuthenticated, user]);  // socket not in deps but used in cleanup
```

**Recommendation:** Use a ref for socket to avoid stale closure issues.

---

## 5. Component Patterns Analysis

### 5.1 Consistency

**Modal Patterns:**
- ShareModal, ReportModal, GroupMembersModal - All implement their own modal containers
- Should use BaseModal from `src/components/ui/BaseModal.jsx`

**Empty States:**
- Uses shared EmptyState component - Good
- Some inline empty states (ConnectionsList) - Should use shared component

**Loading States:**
- Uses shared Skeleton component - Good
- Consistent loading patterns across components

### 5.2 Props and Types

**Issue:** No PropTypes or TypeScript throughout the codebase.

```jsx
// Example: ConnectionCard has no type definitions
export default function ConnectionCard({
  connection,
  type = 'connection',  // What values are valid?
  onMessage,
  className,
}) {
```

**Recommendation:** Add PropTypes at minimum:
```jsx
import PropTypes from 'prop-types';

ConnectionCard.propTypes = {
  connection: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    user: PropTypes.object,
    // ...
  }).isRequired,
  type: PropTypes.oneOf(['connection', 'pending', 'sent']),
  onMessage: PropTypes.func,
  className: PropTypes.string,
};
```

### 5.3 Error Handling

**Strengths:**
- Mutations include onError handlers with toast notifications
- useConnections hooks have good error feedback

**Missing:**
- No error boundaries at feature level
- Query error states often not handled in UI

```jsx
// Example: UserProfilePage handles error
if (error) {
  return <div>User not found...</div>;
}

// But SharedWithMePage does not check for error
const { data, isLoading } = useQuery({...});
// Missing: if (error) return <ErrorState />;
```

---

## 6. Accessibility Concerns

### 6.1 Critical Issues

1. **Focus Management in Modals:**
   - Custom modals don't trap focus
   - No focus return to trigger on close

2. **Keyboard Navigation:**
   - Dropdown menus lack keyboard support
   - Filter buttons missing proper ARIA attributes

3. **Screen Reader Support:**
   - Many interactive elements lack aria-labels
   - No live regions for real-time updates

### 6.2 Recommendations

```jsx
// Add to modal components:
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    const focusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);

// Add to typing indicator for screen readers:
<div role="status" aria-live="polite" aria-label={`${names} ${users.length === 1 ? 'is' : 'are'} typing`}>
  {/* visual indicator */}
</div>
```

---

## 7. Code Organization

### 7.1 Feature Structure

```
features/
  social/
    components/      # Reusable components
    hooks/           # TanStack Query hooks
    pages/           # Page components
    routes.jsx       # Route definitions
    index.js         # Public exports
```

**Assessment:** Well-organized with clear separation of concerns.

### 7.2 Duplicate Code Identified

1. **getOtherParticipant function** - Duplicated in MessagesPage and ConversationList
2. **ITEM_TYPE_CONFIG** - Duplicated in SharedWithMePage and MySharesPage
3. **formatFileSize** - Duplicated in MessageThread and MessageInput

**Recommendation:** Extract to shared utilities:
```jsx
// src/lib/messageUtils.js
export const getOtherParticipant = (conversation, currentUserId) => ...
export const formatFileSize = (bytes) => ...

// src/lib/itemTypes.js
export const ITEM_TYPE_CONFIG = {...}
```

---

## 8. Performance Considerations

### 8.1 Render Optimization

**Good Practices:**
- TanStack Query provides automatic caching
- useDebounce used for search inputs
- Conditional rendering for loading states

**Potential Issues:**
```jsx
// Issue: New function created on every render
{filteredConnections.map((conn) => (
  <button onClick={() => toggleUser(conn._id)}>
```

**Recommendation:** Use useCallback for event handlers passed to child components.

### 8.2 Bundle Size

**Concern:** Each modal includes its own implementation rather than extending BaseModal.

**Recommendation:** Consolidate modal implementations to reduce bundle size.

---

## 9. Routes Configuration Issues

### 9.1 messages/routes.jsx

**Critical Issue:**

```jsx
// This file defines a placeholder MessagesPage that's DIFFERENT from pages/MessagesPage.jsx
function MessagesPage() {
  return (
    <div className="p-6">
      <h1>Messages</h1>
      <p>This feature is coming soon!</p>
    </div>
  );
}
```

The actual MessagesPage implementation exists at `features/messages/pages/MessagesPage.jsx` but the routes file has a different placeholder component.

**Recommendation:** Update routes.jsx to import the actual MessagesPage:
```jsx
import MessagesPage from './pages/MessagesPage';

export const messagesRoutes = (
  <Route path="messages" element={<MessagesPage />} />
);
```

---

## 10. Security Considerations

### 10.1 XSS Prevention

React's automatic escaping provides protection, but review needed for:
- Message content rendering
- User-provided bio/descriptions
- Share link handling

### 10.2 Token Handling

```jsx
// Good: Token stored in localStorage with proper cleanup
export const setAuthToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};
```

### 10.3 Clipboard API

```jsx
// Secure: Using navigator.clipboard.writeText
await navigator.clipboard.writeText(shareLink);
```

---

## Summary of Recommendations

### High Priority

1. **Fix routes.jsx** - Messages route uses placeholder instead of actual component
2. **Standardize API data extraction** - Make messagesApi and connectionsApi consistent with itemSharesApi
3. **Add error handling to queries** - Handle error states in SharedWithMePage and others
4. **Add PropTypes** - Type safety for all component props
5. **Fix useMarkAsRead** - Either implement properly or remove

### Medium Priority

1. **Use BaseModal** - Migrate custom modals to extend BaseModal
2. **Extract duplicate code** - Shared utilities for common functions
3. **Improve accessibility** - Focus management, ARIA labels, keyboard navigation
4. **Add error boundaries** - Feature-level error boundaries

### Low Priority

1. **Add useCallback** - Optimize render performance
2. **Password input** - Use proper password field with toggle
3. **Emoji fallback** - Handle systems without emoji support
4. **Typing indicator** - Individual user timeout tracking

---

## Appendix: Files Reviewed

1. `myBrain-web/src/lib/api.js`
2. `myBrain-web/src/features/social/pages/SharedWithMePage.jsx`
3. `myBrain-web/src/features/social/pages/ConnectionsPage.jsx`
4. `myBrain-web/src/features/social/pages/UserProfilePage.jsx`
5. `myBrain-web/src/features/social/pages/MySharesPage.jsx`
6. `myBrain-web/src/features/social/components/ConnectionsList.jsx`
7. `myBrain-web/src/features/social/components/ConnectionCard.jsx`
8. `myBrain-web/src/features/social/components/ShareModal.jsx`
9. `myBrain-web/src/features/social/components/ReportModal.jsx`
10. `myBrain-web/src/features/social/components/UserSearch.jsx`
11. `myBrain-web/src/features/social/hooks/useConnections.js`
12. `myBrain-web/src/features/social/routes.jsx`
13. `myBrain-web/src/features/messages/pages/MessagesPage.jsx`
14. `myBrain-web/src/features/messages/components/MessageThread.jsx`
15. `myBrain-web/src/features/messages/components/MessageInput.jsx`
16. `myBrain-web/src/features/messages/components/ConversationList.jsx`
17. `myBrain-web/src/features/messages/components/NewConversationModal.jsx`
18. `myBrain-web/src/features/messages/hooks/useMessages.js`
19. `myBrain-web/src/features/messages/routes.jsx`
20. `myBrain-web/src/hooks/useWebSocket.jsx`
21. `myBrain-web/src/store/authSlice.js`

---

*Review completed by Senior Frontend Engineer on 2026-01-29*
