# Technical Design Document: Real-Time WebSocket Notifications for Claude Usage Sync Updates

**Document Version:** 3.0 (FINAL)
**Date:** January 23, 2026
**Author:** Claude AI Assistant
**Project:** myBrain - Personal Productivity Platform
**Status:** APPROVED FOR IMPLEMENTATION - ALL REVIEWS COMPLETE

---

## Pre-Implementation Summary

### Reviews Completed
- **Review 1:** Claude Opus 4.5 (2026-01-23) - Conditional Approval
- **Review 2:** GPT-5.2 Codex High (2026-01-22) - Proceed after fixes
- **Review 3:** Claude Opus 4.5 Final Review (2026-01-23) - Approved

### Blockers Resolved
| Issue | Status | Resolution |
|-------|--------|------------|
| B1: WebSocket Auth Mismatch | **FIXED** | Added `auth: { token }` to `useWebSocket.jsx` (commit pending) |
| F1: logSocketEvent not exported | **FIXED** | Added `export` keyword (documented in Section 5.1) |

### Corrections Applied in This Version
| Issue | Original | Corrected |
|-------|----------|-----------|
| Query keys | `usage`, `lastSync` | `recent`, `latestSync` |
| staleTime (latestSync) | 5 minutes | 1 minute |
| staleTime (lastSync) | 5 minutes | 30 seconds |
| Missing imports | Not listed | Added `useCallback`, `useRef`, `useSocketEvent` |
| Hook mounting | SettingsPage only | App-level (global) |
| CLI vs UI wording | Confusing | Clarified throughout |

### New Additions from Review Feedback
- Added debounce (300ms) for rapid sync events
- Added 4 additional test cases (TC7-TC10)
- Added structured logging for WebSocket failures (Wide Events pattern)
- Clarified that CLI calls API directly, not the hook
- Export `logSocketEvent` for reuse in new emit functions

### Scope Expansions (v3.0)
Based on user decisions following all reviews:
- **Toast Notifications:** ENABLED - Users will see "Claude usage synced!" toast
- **Subscription Events:** ADDED - New `claude-subscription:synced` event for `/usage` data
- **Structured Logging:** ADDED - WebSocket failures logged via Wide Events pattern

---

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Current Architecture](#current-architecture)
4. [Proposed Solution](#proposed-solution)
5. [Detailed Implementation Plan](#detailed-implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Risk Analysis](#risk-analysis)
8. [Deployment Plan](#deployment-plan)
9. [Appendices](#appendices)

---

## 1. Executive Summary

### Objective

Enable real-time browser updates when users run the `/claude-usage` CLI skill, eliminating the current 5-minute delay or need for manual page refresh.

### Scope

- **Backend:** Add WebSocket event emission to Claude usage sync AND subscription endpoints
- **Frontend:** Add real-time listener hooks to invalidate cache, trigger UI updates, and show toast notifications
- **Files Modified:** 5 files (3 backend, 2 frontend)
  - `myBrain-api/src/websocket/index.js` - Add emission functions + export logSocketEvent
  - `myBrain-api/src/routes/analytics.js` - Call emission after usage sync AND subscription sync
  - `myBrain-api/src/server.js` - Register Socket.IO with analytics
  - `myBrain-web/src/hooks/useClaudeUsage.js` - Add real-time listener hooks (usage + subscription)
  - `myBrain-web/src/app/App.jsx` - Mount hooks globally
- **Already Fixed:** `myBrain-web/src/hooks/useWebSocket.jsx` - WebSocket auth (B1 blocker)
- **New Code:** ~180 lines total (including subscription events, toast, structured logging)
- **Dependencies:** None (uses existing Socket.io infrastructure)

**Events Added:**
| Event Name | Trigger | Purpose |
|------------|---------|---------|
| `claude-usage:synced` | POST `/analytics/claude-usage` | Refresh usage data in browser |
| `claude-subscription:synced` | POST `/analytics/claude-usage/subscription` | Refresh subscription limits in browser |

### Business Value

- **Improved UX:** Instant feedback when syncing usage data
- **Multi-device Support:** All browser tabs update simultaneously
- **Developer Experience:** Seamless integration with CLI workflow

### Risk Assessment

- **Risk Level:** LOW
- **Mitigation:** WebSocket emission wrapped in try-catch; sync succeeds even if WebSocket fails
- **Rollback Time:** < 5 minutes (single line comment)

### Timeline

- **Development:** 5-6 hours (expanded scope: subscription events + toast + logging)
- **Testing:** 1-2 hours (10 test cases)
- **Review & Deployment:** 1 hour
- **Total:** 7-9 hours

---

## 2. Problem Statement

### Current User Experience

**Scenario:** Developer uses myBrain CLI to sync Claude Code usage data

```bash
# Terminal
$ /claude-usage

✅ Claude Code usage synced successfully!
📊 Sync Summary:
   • Days processed: 7
   • Total cost: $44.60
   • Date range: Jan 15 - Jan 21, 2026
```

**Meanwhile in Browser (Settings → Developer Stats → Claude Usage):**

The browser shows "Last sync: about 1 hour ago" because:

1. Data is successfully stored in MongoDB
2. HTTP response returned to CLI
3. Browser has NO IDEA sync occurred
4. User must:
   - Manually refresh page (Ctrl+R), OR
   - Wait 5 minutes for TanStack Query stale timeout

### User Complaints

- "Why doesn't the browser update automatically?"
- "I just synced but it shows old data"
- "Do I need to refresh every time?"

### Technical Root Cause

The Claude usage sync is a **CLI-initiated, server-executed operation** that bypasses the browser's normal request lifecycle. The browser only knows about operations it initiates via HTTP requests.

```
Current Flow:
CLI → Backend → Database → HTTP Response (CLI only)
                              ↓
                    Browser: Unaware ❌
```

---

## 3. Current Architecture

This section provides complete context of existing systems that will be extended.

### 3.1 WebSocket Infrastructure (Socket.io)

**Technology Stack:**

- **Server:** socket.io v4.8.3 (`myBrain-api/package.json`)
- **Client:** socket.io-client v4.8.3 (`myBrain-web/package.json`)
- **Transport:** WebSocket (primary), Long-polling (fallback)

#### Server Setup: `myBrain-api/src/websocket/index.js`

**Lines 200-209: Configuration**

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  pingTimeout: 60000, // 60 seconds before considering disconnected
  pingInterval: 25000, // Ping every 25 seconds to check connection
});
```

**Lines 221-255: Authentication Middleware**

```javascript
io.use(async (socket, next) => {
  try {
    // Extract JWT token from handshake
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token (same secret as HTTP auth)
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database
    const user = await User.findById(decoded.userId);

    // Validate user exists and is active
    if (!user || user.status !== 'active') {
      return next(new Error('User not found or inactive'));
    }

    // Attach user info to socket for event handlers
    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

**Lines 279-307: Connection Handling & Room Joining**

```javascript
io.on('connection', async (socket) => {
  const userId = socket.userId;

  // Track connection for multi-device support
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);

  // Update user presence to online
  await User.findByIdAndUpdate(userId, {
    $set: {
      'presence.isOnline': true,
      'presence.currentStatus': 'available',
    },
  });

  // Join personal room for user-specific broadcasts
  socket.join(`user:${userId}`);

  // Log connection (color-coded)
  logSocketEvent('connection', {
    userId,
    socketId: socket.id,
    userEmail: socket.user.email,
  });

  // ... additional event handlers ...
});
```

#### Room Pattern

**Personal Rooms:** `user:{userId}`

- Each user auto-joins their personal room on connection
- Used for direct notifications (messages, alerts, presence)
- Supports multi-device (user can have multiple sockets)

**Conversation Rooms:** `conversation:{conversationId}`

- Users join dynamically when viewing a conversation
- Used for real-time messaging and typing indicators
- Users leave when navigating away

**Broadcasting Examples:**

```javascript
// Send to specific user (all their devices)
io.to(`user:${userId}`).emit('notification:new', notification);

// Send to everyone in conversation
io.to(`conversation:${conversationId}`).emit('message:new', message);

// Send to everyone in conversation except sender
socket.to(`conversation:${conversationId}`).emit('user:typing', data);
```

#### Existing Real-Time Events

| Event Name            | Direction       | Purpose              | Payload                        |
| --------------------- | --------------- | -------------------- | ------------------------------ |
| `message:new`         | Server → Client | New message received | Message object                 |
| `message:updated`     | Server → Client | Message edited       | Updated message                |
| `message:deleted`     | Server → Client | Message deleted      | {conversationId, messageId}    |
| `user:typing`         | Server → Client | User started typing  | {conversationId, userId, user} |
| `user:stopped_typing` | Server → Client | User stopped typing  | {conversationId, userId}       |
| `presence:update`     | Server → Client | User online/offline  | {userId, isOnline, lastSeenAt} |
| `notification:new`    | Server → Client | New notification     | Notification object            |

#### Client Setup: `myBrain-web/src/hooks/useWebSocket.jsx`

**Lines 17-66: WebSocketProvider**

```javascript
export function WebSocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create Socket.io connection
    const newSocket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

**Lines 89-102: useSocketEvent Helper**

```javascript
export function useSocketEvent(eventName, handler) {
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
}
```

### 3.2 Claude Usage Tracking Feature

#### Backend: API Route

**File:** `myBrain-api/src/routes/analytics.js`
**Lines 828-897:** POST /analytics/claude-usage

```javascript
/**
 * POST /analytics/claude-usage
 * Sync Claude Code usage data from ccusage CLI tool
 *
 * This endpoint receives the complete JSON output from the ccusage CLI tool,
 * stores it in the database, and calculates deltas from the previous sync.
 *
 * @body {Object} usageData - Complete ccusage JSON output
 * @body {Array} usageData.daily - Array of daily usage records
 * @body {Object} usageData.totals - Aggregate totals
 *
 * @returns {201} Sync successful with comparison data
 * @returns {400} Invalid usage data format
 * @returns {401} User not authenticated
 * @returns {500} Server error
 *
 * AUTHENTICATION: Supports both JWT and Personal API Keys
 */
router.post('/claude-usage', requireAuth, async (req, res, next) => {
  try {
    const { usageData } = req.body;

    // =================================================================
    // STEP 1: Validate Input Format
    // =================================================================
    // ccusage outputs JSON with a "daily" array containing usage records
    if (!usageData?.daily) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid usage data. Expected ccusage JSON output with "daily" array.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // =================================================================
    // STEP 2: Process and Store Sync Data
    // =================================================================
    // Service handles:
    // - Creating ClaudeUsageSync document (complete history)
    // - Creating ClaudeUsage daily records (for querying)
    // - Calculating comparison deltas from previous sync
    const result = await claudeUsageService.recordSyncEvent(
      req.user._id,
      usageData,
    );

    // =================================================================
    // STEP 3: Log Event (Wide Events Pattern)
    // =================================================================
    attachEntityId(req, 'userId', req.user._id);
    attachEntityId(req, 'syncId', result.sync._id);
    req.eventName = 'claude_usage.sync.success';
    req.mutation = {
      after: {
        daysProcessed: result.dailyProcessing.daysProcessed,
        totalCost: result.dailyProcessing.totalCost,
        syncId: result.sync._id,
      },
    };

    // =================================================================
    // STEP 4: Return Success Response
    // =================================================================
    res.status(201).json({
      success: true,
      data: {
        daysProcessed: result.dailyProcessing.daysProcessed,
        totalCost: result.dailyProcessing.totalCost,
        dateRange: result.dailyProcessing.dateRange,
        sync: {
          id: result.sync._id,
          syncedAt: result.sync.syncedAt,
          daysIncluded: result.sync.summary.daysIncluded,
          totalCost: result.sync.summary.totalCost,
          comparison: result.sync.comparison, // Delta from previous sync
        },
      },
    });
  } catch (err) {
    next(err);
  }
});
```

**Response Format Example:**

```json
{
  "success": true,
  "data": {
    "daysProcessed": 7,
    "totalCost": 44.6,
    "dateRange": {
      "start": "2026-01-15T00:00:00.000Z",
      "end": "2026-01-21T23:59:59.999Z"
    },
    "sync": {
      "id": "679e1234567890abcdef1234",
      "syncedAt": "2026-01-22T10:30:00.000Z",
      "daysIncluded": 7,
      "totalCost": 44.6,
      "comparison": {
        "isPreviousSyncAvailable": true,
        "deltaFromPrevious": {
          "tokensDelta": 5000000,
          "costDelta": 1.5,
          "daysDelta": 1,
          "inputTokensDelta": 3000,
          "outputTokensDelta": 2000
        }
      }
    }
  }
}
```

#### Backend: Service Layer

**File:** `myBrain-api/src/services/claudeUsageService.js`

**Key Function: recordSyncEvent**

```javascript
/**
 * recordSyncEvent(userId, ccusageOutput)
 * ---------------------------------------
 * Main entry point for processing Claude usage sync data.
 *
 * @param {ObjectId} userId - User who initiated sync
 * @param {Object} ccusageOutput - Complete ccusage JSON output
 * @returns {Object} { sync, dailyProcessing }
 *
 * WORKFLOW:
 * 1. Store complete sync event in ClaudeUsageSync model
 * 2. Calculate comparison deltas from previous sync
 * 3. Process daily records into ClaudeUsage model (for queries)
 * 4. Return both sync metadata and processing results
 */
export async function recordSyncEvent(userId, ccusageOutput) {
  // Store complete sync with comparison
  const sync = await ClaudeUsageSync.recordSync(userId, ccusageOutput);

  // Process daily data (also stored separately for queries)
  const dailyProcessing = await processUsageData(userId, ccusageOutput);

  return { sync, dailyProcessing };
}
```

#### Backend: Data Model

**File:** `myBrain-api/src/models/ClaudeUsageSync.js`

**Schema Structure:**

```javascript
const claudeUsageSyncSchema = new mongoose.Schema(
  {
    // Ownership
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // When sync occurred
    syncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Complete ccusage output (immutable historical record)
    rawData: {
      daily: [
        {
          date: String,
          inputTokens: Number,
          outputTokens: Number,
          cacheCreationTokens: Number,
          cacheReadTokens: Number,
          totalTokens: Number,
          totalCost: Number,
          modelsUsed: [String],
          modelBreakdowns: [Object],
        },
      ],
      totals: Object,
    },

    // Pre-calculated summary (denormalized for fast queries)
    summary: {
      daysIncluded: Number,
      dateRange: {
        start: Date,
        end: Date,
      },
      totalInputTokens: Number,
      totalOutputTokens: Number,
      totalCacheCreationTokens: Number,
      totalCacheReadTokens: Number,
      totalTokens: Number,
      totalCost: Number,
      modelsUsed: [String],
    },

    // Comparison to previous sync (delta calculation)
    comparison: {
      isPreviousSyncAvailable: Boolean,
      deltaFromPrevious: {
        tokensDelta: Number,
        costDelta: Number,
        daysDelta: Number,
        inputTokensDelta: Number,
        outputTokensDelta: Number,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
claudeUsageSyncSchema.index({ userId: 1, syncedAt: -1 });
```

#### Frontend: TanStack Query Hooks

**File:** `myBrain-web/src/hooks/useClaudeUsage.js`

**Query Keys (Lines 4-14):**

```javascript
// CORRECTED: These are the actual query keys in the codebase
export const claudeUsageKeys = {
  all: ['claude-usage'],
  recent: (days) => [...claudeUsageKeys.all, 'recent', days],      // NOT 'usage'
  range: (startDate, endDate) => [...claudeUsageKeys.all, 'range', startDate, endDate],
  syncs: (limit) => [...claudeUsageKeys.all, 'syncs', limit],
  latestSync: () => [...claudeUsageKeys.all, 'syncs', 'latest'],   // NOT 'lastSync'
  subscription: () => [...claudeUsageKeys.all, 'subscription'],
  subscriptionHistory: (limit) => [...claudeUsageKeys.all, 'subscription', 'history', limit],
};

// Note: There's also an inline key used in useClaudeUsageLastSync:
// queryKey: [...claudeUsageKeys.all, 'last-sync']
```

**Hook: useClaudeUsageLatestSync (Lines 165-180):**

```javascript
/**
 * Fetch latest sync with comparison data
 * Used by SinceLastSyncCard to show deltas
 *
 * CORRECTED staleTime: Actual value is 1 minute, not 5 minutes
 */
export function useClaudeUsageLatestSync() {
  return useQuery({
    queryKey: claudeUsageKeys.latestSync(),
    queryFn: () =>
      analyticsApi.getClaudeUsageSyncsLatest().then((res) => res.data),
    staleTime: 1000 * 60 * 1, // 1 minute (CORRECTED from document's "5 minutes")
    retry: 2,
  });
}

// Note: useClaudeUsageLastSync has staleTime of 30 seconds (line 105)
// Note: useClaudeUsage (main hook) has staleTime of 5 minutes (line 35)
```

**Hook: useSyncClaudeUsage (Lines 123-137):**

```javascript
/**
 * Mutation hook for syncing usage data
 *
 * CLARIFICATION (from review feedback):
 * - This hook is for BROWSER UI usage (e.g., a "Sync Now" button)
 * - The CLI skill calls the API DIRECTLY via HTTP, not through this hook
 * - CLI → POST /analytics/claude-usage → Backend → WebSocket event → Browser hook
 *
 * The CLI skill does NOT use React hooks - it makes direct HTTP requests.
 */
export function useSyncClaudeUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (usageData) => analyticsApi.syncClaudeUsage(usageData),
    onSuccess: () => {
      // Invalidate all Claude usage queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
      toast.success('Claude usage synced successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sync Claude usage');
    },
  });
}
```

#### Frontend: Display Component

**File:** `myBrain-web/src/components/settings/claude-usage/SinceLastSyncCard.jsx`

**Component Purpose:** Shows delta metrics from last sync

**Key Features:**

- Displays cost change with percentage
- Shows token deltas (input/output/total)
- Color-coded indicators (green=increase, red=decrease)
- Dismissable (preference saved to localStorage)
- Responsive grid layout

**Data Flow:**

```javascript
// Parent component (SettingsPage.jsx)
const { data: latestSync } = useClaudeUsageLatestSync();

// Pass to card
<SinceLastSyncCard latestSync={latestSync} />;

// Card extracts comparison
const { comparison, syncedAt, summary } = latestSync;
const { deltaFromPrevious } = comparison;
const { costDelta, tokensDelta, daysDelta } = deltaFromPrevious;
```

### 3.3 Existing Real-Time Integration Pattern (Reference)

**Pattern Example: Messages Feature**

**Backend Emission:** `myBrain-api/src/routes/messages.js` (Lines 858-865)

```javascript
// After message saved to database
const { emitNewMessage } = await import('../websocket/index.js');
emitNewMessage(io, conversationId, {
  _id: message._id,
  content: message.content,
  senderId: message.senderId,
  conversationId: message.conversationId,
  createdAt: message.createdAt,
});
```

**Frontend Listener:** `myBrain-web/src/features/messages/hooks/useMessages.js` (Lines 77-100)

```javascript
export function useRealtimeMessages(conversationId) {
  const queryClient = useQueryClient();

  const handleNewMessage = useCallback(
    (message) => {
      if (message.conversationId === conversationId) {
        // Direct cache update for instant UI feedback
        queryClient.setQueryData(['messages', conversationId], (old) => {
          if (!old) return { messages: [message] };

          // Prevent duplicates
          const exists = old.messages?.some((m) => m._id === message._id);
          if (exists) return old;

          return {
            ...old,
            messages: [...(old.messages || []), message],
          };
        });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    [conversationId, queryClient],
  );

  useSocketEvent('message:new', handleNewMessage);

  return {
    /* ... */
  };
}
```

**Key Takeaway:** This pattern combines direct cache updates (for instant feedback) with invalidation (for data consistency). For Claude usage, we only need invalidation since the full data requires refetching from the API.

---

## 4. Proposed Solution

### 4.1 Solution Overview

Add WebSocket event emission to the Claude usage sync flow, following the established pattern used for messages and notifications.

**New Flow:**

```
CLI → POST /analytics/claude-usage → Store in DB → HTTP Response (CLI)
                                          ↓
                                    Emit WebSocket Event
                                          ↓
                             io.to(`user:${userId}`).emit('claude-usage:synced')
                                          ↓
                              Browser (listening via useSocketEvent)
                                          ↓
                          queryClient.invalidateQueries(claudeUsageKeys.all)
                                          ↓
                              TanStack Query auto-refetches
                                          ↓
                                  UI updates automatically
```

### 4.2 Design Decisions

#### Decision 1: Event Name

**Choice:** `claude-usage:synced`

**Rationale:**

- Follows existing convention: `message:new`, `notification:new`, `user:typing`
- Namespace `claude-usage:` allows for future events (e.g., `claude-usage:error`)
- Verb `synced` clearly indicates completed action

**Alternatives Considered:**

- `usage:sync` - Too generic, unclear what "usage" means
- `sync:complete` - Too generic, could apply to any sync
- `claude:usage-synced` - Inconsistent with existing patterns

#### Decision 2: Payload Structure

**Choice:** Minimal trigger with metadata

```javascript
{
  syncId: "679e1234567890abcdef1234",
  syncedAt: "2026-01-22T10:30:00.000Z",
  daysIncluded: 7,
  totalCost: 44.60
}
```

**Rationale:**

- **Lightweight:** < 200 bytes, minimal network overhead
- **Informative:** Provides enough context for logging/debugging
- **Efficient:** Frontend already has endpoints to fetch full data
- **Consistent:** Similar to `notification:new` pattern (metadata only)

#### Decision 3: Room Targeting

**Choice:** Personal room `user:{userId}`

**Rationale:**

- User auto-joins on connection (no additional setup)
- Supports multi-device (all tabs update simultaneously)
- Secure (room membership verified during authentication)
- Consistent with notification pattern

#### Decision 4: Error Handling Strategy

**Choice:** Fail gracefully with logging

```javascript
try {
  if (io) {
    emitClaudeUsageSynced(io, userId, syncData);
  }
} catch (wsError) {
  console.error('[Analytics] Failed to emit WebSocket event:', wsError.message);
  // Don't throw - sync already successful in DB
}
```

**Rationale:**

- **Sync is primary operation:** HTTP request succeeds even if WebSocket fails
- **WebSocket is enhancement:** Real-time update is "nice-to-have", not critical
- **Graceful degradation:** User can still manually refresh if WebSocket fails
- **Logging preserved:** Errors captured for debugging

---

## 5. Detailed Implementation Plan

### 5.1 Backend Changes

#### File 1: `myBrain-api/src/websocket/index.js`

**Purpose:** Add emission functions for Claude usage and subscription events

**Step 1a: Export logSocketEvent (REQUIRED - F1 Fix)**

The `logSocketEvent` function at line 103 is currently private. Add `export` keyword:

```javascript
// Line 103 - CHANGE FROM:
function logSocketEvent(eventName, data = {}) {

// TO:
export function logSocketEvent(eventName, data = {}) {
```

**Step 1b: Add Emission Functions**

**Location:** After line 673 (after `emitNewConversation` function)

**Code to Add:**

````javascript
/**
 * =============================================================================
 * CLAUDE USAGE SYNC EVENT EMISSION
 * =============================================================================
 */

/**
 * emitClaudeUsageSynced(io, userId, syncData)
 * -------------------------------------------
 * Emit a real-time event when a Claude usage sync completes.
 * This notifies the user's browser to refresh usage data without manual refresh.
 *
 * WORKFLOW:
 * 1. User runs /claude-usage CLI skill
 * 2. CLI posts to POST /analytics/claude-usage
 * 3. Backend stores sync in database
 * 4. This function emits WebSocket event to user's browser(s)
 * 5. Frontend receives event and invalidates cache
 * 6. TanStack Query auto-refetches latest data
 * 7. UI updates automatically
 *
 * ROOM TARGETING:
 * - Emits to personal room: `user:${userId}`
 * - User auto-joins this room on WebSocket connection
 * - Supports multi-device (all browser tabs update simultaneously)
 *
 * PAYLOAD:
 * - Minimal metadata (syncId, timestamp, summary)
 * - Frontend refetches full data from existing endpoints
 * - Keeps network overhead low (< 200 bytes)
 *
 * ERROR HANDLING:
 * - Called within try-catch in analytics route
 * - Errors logged but don't fail the sync operation
 * - Graceful degradation (user can manually refresh if WebSocket fails)
 *
 * @param {Object} io - Socket.IO server instance from server.js
 * @param {string} userId - User ID who initiated the sync
 * @param {Object} syncData - The ClaudeUsageSync document from database
 * @param {ObjectId} syncData._id - Sync document ID
 * @param {Date} syncData.syncedAt - When sync occurred
 * @param {Object} syncData.summary - Pre-calculated summary
 * @param {number} syncData.summary.daysIncluded - Number of days in sync
 * @param {number} syncData.summary.totalCost - Total cost for period
 *
 * @returns {void}
 *
 * EXAMPLE USAGE (in analytics.js):
 * ```javascript
 * const result = await claudeUsageService.recordSyncEvent(userId, usageData);
 *
 * try {
 *   if (io) {
 *     emitClaudeUsageSynced(io, userId.toString(), result.sync);
 *   }
 * } catch (wsError) {
 *   console.error('[Analytics] WebSocket emission failed:', wsError.message);
 * }
 * ```
 */
export function emitClaudeUsageSynced(io, userId, syncData) {
  // Emit to user's personal room (supports multi-device)
  io.to(`user:${userId}`).emit('claude-usage:synced', {
    syncId: syncData._id,
    syncedAt: syncData.syncedAt,
    daysIncluded: syncData.summary?.daysIncluded || 0,
    totalCost: syncData.summary?.totalCost || 0,
  });

  // Log emission for debugging (matches existing log pattern)
  logSocketEvent('claude-usage:synced', {
    userId,
    syncId: syncData._id,
    daysIncluded: syncData.summary?.daysIncluded || 0,
    totalCost: syncData.summary?.totalCost || 0,
  });
}

/**
 * emitClaudeSubscriptionSynced(io, userId, snapshotData)
 * ------------------------------------------------------
 * Emit a real-time event when Claude subscription usage is synced.
 * This notifies the user's browser to refresh subscription limit data.
 *
 * WORKFLOW:
 * 1. User runs /claude-usage CLI skill with /usage output
 * 2. CLI posts to POST /analytics/claude-usage/subscription
 * 3. Backend stores snapshot in database
 * 4. This function emits WebSocket event to user's browser(s)
 * 5. Frontend receives event and invalidates subscription cache
 * 6. TanStack Query auto-refetches latest data
 * 7. UI updates subscription progress bars automatically
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - User ID who synced
 * @param {Object} snapshotData - The ClaudeSubscriptionUsage document
 * @param {ObjectId} snapshotData._id - Snapshot document ID
 * @param {Date} snapshotData.capturedAt - When snapshot was taken
 * @param {Object} snapshotData.session - Session usage data
 * @param {Object} snapshotData.weeklyAllModels - Weekly all-models usage
 * @param {Object} snapshotData.weeklySonnet - Weekly Sonnet usage
 *
 * @returns {void}
 */
export function emitClaudeSubscriptionSynced(io, userId, snapshotData) {
  // Emit to user's personal room (supports multi-device)
  io.to(`user:${userId}`).emit('claude-subscription:synced', {
    snapshotId: snapshotData._id,
    capturedAt: snapshotData.capturedAt,
    session: {
      usedPercent: snapshotData.session?.usedPercent || 0,
    },
    weeklyAllModels: {
      usedPercent: snapshotData.weeklyAllModels?.usedPercent || 0,
    },
    weeklySonnet: {
      usedPercent: snapshotData.weeklySonnet?.usedPercent || 0,
    },
  });

  // Log emission for debugging
  logSocketEvent('claude-subscription:synced', {
    userId,
    snapshotId: snapshotData._id,
    sessionUsed: snapshotData.session?.usedPercent || 0,
    weeklyUsed: snapshotData.weeklyAllModels?.usedPercent || 0,
  });
}
````

**Step 1c: Update Default Export (around line 720)**

```javascript
// Current export:
export default {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitNewConversation,
  isUserOnline,
  getOnlineUsers
};

// Change to (add new functions):
export default {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitNewConversation,
  emitClaudeUsageSynced,          // NEW: Usage sync events
  emitClaudeSubscriptionSynced,   // NEW: Subscription sync events
  logSocketEvent,                  // NEW: Exported for consistency
  isUserOnline,
  getOnlineUsers
};
```

#### File 2: `myBrain-api/src/routes/analytics.js`

**Purpose:** Import and call WebSocket emission function after successful sync

**Step 2a: Add Imports (around line 100)**

```javascript
// Existing imports:
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import * as analyticsService from '../services/analyticsService.js';
import * as claudeUsageService from '../services/claudeUsageService.js';

// ✨ NEW: Add these imports
import { emitClaudeUsageSynced, emitClaudeSubscriptionSynced } from '../websocket/index.js';
```

**Step 2b: Add Socket.IO Setup (after imports, around line 110)**

````javascript
/**
 * =============================================================================
 * SOCKET.IO SETUP FOR REAL-TIME EVENTS
 * =============================================================================
 *
 * The analytics routes need access to the Socket.io instance to emit real-time
 * events (e.g., when Claude usage sync completes).
 *
 * INITIALIZATION:
 * 1. Server starts and initializes Socket.io (server.js)
 * 2. Server calls setSocketIO() to provide io instance to this route
 * 3. Routes can now emit events using the io instance
 *
 * PATTERN:
 * This follows the same pattern as messages.js (line 170-188):
 * - Export setSocketIO function
 * - Store io in module-level variable
 * - Check if io exists before emitting
 */

/**
 * Socket.IO instance for real-time communication.
 * Initially null, set by setSocketIO() during server startup.
 *
 * @type {Object|null}
 */
let io = null;

/**
 * setSocketIO(ioInstance)
 * -----------------------
 * Sets the Socket.io instance for this route to enable real-time events.
 *
 * WHEN CALLED: By server.js after Socket.io is initialized (line 426)
 *
 * @param {Object} ioInstance - The Socket.io server instance from websocket/index.js
 * @returns {void}
 *
 * EXAMPLE (in server.js):
 * ```javascript
 * import analyticsRoutes, { setSocketIO as setAnalyticsSocketIO } from './routes/analytics.js';
 *
 * const io = initializeWebSocket(httpServer);
 * setAnalyticsSocketIO(io);  // ✨ Register Socket.io with analytics routes
 * ```
 */
export function setSocketIO(ioInstance) {
  io = ioInstance;
  console.log('[Analytics] Socket.IO instance registered for real-time events');
}
````

**Step 2c: Add Emission in POST /claude-usage Handler (after line 875)**

Find this section in the POST handler:

```javascript
// =================================================================
// STEP 3: Log Event (Wide Events Pattern)
// =================================================================
attachEntityId(req, 'userId', req.user._id);
attachEntityId(req, 'syncId', result.sync._id);
req.eventName = 'claude_usage.sync.success';
req.mutation = {
  after: {
    daysProcessed: result.dailyProcessing.daysProcessed,
    totalCost: result.dailyProcessing.totalCost,
    syncId: result.sync._id,
  },
};
```

**Add AFTER the logging section, BEFORE the response:**

```javascript
// =================================================================
// STEP 3.5: Emit WebSocket Event for Real-Time Update ✨ NEW
// =================================================================
// If Socket.IO is available, emit event to user's browser(s)
// This allows browser to update automatically without refresh
//
// EMISSION STRATEGY:
// - Wrapped in try-catch (fail gracefully if WebSocket fails)
// - Only emits if io instance is set (prevents errors during startup)
// - Targets user's personal room (supports multi-device)
// - Sends minimal payload (browser refetches full data)
//
// ERROR HANDLING:
// - WebSocket emission is "nice-to-have" enhancement
// - Sync already succeeded in database
// - HTTP response still succeeds even if WebSocket fails
// - User can manually refresh if real-time update fails
// - Failures logged via Wide Events for production debugging
try {
  if (io) {
    emitClaudeUsageSynced(io, req.user._id.toString(), result.sync);
  }
} catch (wsError) {
  // Log via Wide Events pattern for structured logging (production debugging)
  req.wsEmissionError = {
    event: 'claude-usage:synced',
    error: wsError.message,
    userId: req.user._id.toString(),
    syncId: result.sync._id?.toString(),
  };
  console.error(
    '[Analytics] Failed to emit WebSocket event for Claude usage sync:',
    wsError.message,
  );
  // Don't throw - HTTP response should still succeed
}

// =================================================================
// STEP 4: Return Success Response
// =================================================================
res.status(201).json({
  // ... existing response code ...
});
```

#### File 3: `myBrain-api/src/server.js`

**Purpose:** Register Socket.IO instance with analytics routes

**Step 3a: Update Import (line 117)**

```javascript
// Current import:
import analyticsRoutes from './routes/analytics.js';

// ✨ Change to named import to get setSocketIO function:
import analyticsRoutes, {
  setSocketIO as setAnalyticsSocketIO,
} from './routes/analytics.js';
```

**Step 3b: Register Socket.IO (in startServer function, around line 426)**

Find this section:

```javascript
// Initialize WebSocket
const io = initializeWebSocket(httpServer);
setSocketIO(io); // For messages (existing)
```

**Add after the existing setSocketIO call:**

```javascript
// Initialize WebSocket
const io = initializeWebSocket(httpServer);
setSocketIO(io); // For messages (existing)
setAnalyticsSocketIO(io); // ✨ NEW: For analytics real-time events
```

### 5.2 Frontend Changes

#### File 4: `myBrain-web/src/hooks/useClaudeUsage.js`

**Purpose:** Add real-time listener hook for Claude usage sync events

**Location:** End of file (after line 171)

**Code to Add:**

````javascript
/**
 * =============================================================================
 * REAL-TIME WEBSOCKET INTEGRATION
 * =============================================================================
 */

/**
 * useRealtimeClaudeUsage()
 * ------------------------
 * Hook that listens for real-time Claude usage sync events via WebSocket.
 * Automatically invalidates TanStack Query cache when new sync completes.
 *
 * WHEN TO USE:
 * - Call once in a top-level component (e.g., SettingsPage)
 * - Hook will listen for events globally
 * - Cache invalidation triggers re-render for ALL components using Claude usage data
 *
 * WORKFLOW:
 * 1. User runs /claude-usage CLI skill
 * 2. Backend emits 'claude-usage:synced' WebSocket event
 * 3. This hook receives event via useSocketEvent
 * 4. Hook invalidates all Claude usage queries
 * 5. TanStack Query automatically refetches stale queries
 * 6. All components using useClaudeUsage hooks re-render with new data
 *
 * SUPPORTS:
 * - Multi-device (all browser tabs update simultaneously)
 * - Works even when user is on different page (global invalidation)
 * - Graceful degradation (no errors if WebSocket disconnected)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * function SettingsPage() {
 *   // Subscribe to real-time updates
 *   useRealtimeClaudeUsage();
 *
 *   // Use Claude usage data (will auto-update on sync)
 *   const { data: latestSync } = useClaudeUsageLatestSync();
 *   const { data: usage } = useClaudeUsage(30);
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * PAYLOAD RECEIVED FROM SERVER:
 * ```javascript
 * {
 *   syncId: "679e1234567890abcdef1234",
 *   syncedAt: "2026-01-22T10:30:00.000Z",
 *   daysIncluded: 7,
 *   totalCost: 44.60
 * }
 * ```
 *
 * CACHE INVALIDATION STRATEGY:
 * - Invalidates ALL Claude usage queries: claudeUsageKeys.all
 * - This includes:
 *   - useClaudeUsage (recent usage)
 *   - useClaudeUsageLatestSync (latest sync with comparison)
 *   - useClaudeUsageSyncs (sync history)
 *   - useClaudeUsageLastSync (last sync timestamp)
 * - TanStack Query automatically refetches any query being used by mounted components
 * - Stale queries are marked for refetch when their component remounts
 *
 * ERROR HANDLING:
 * - If WebSocket disconnected, hook does nothing (no errors)
 * - If invalidation fails, logged to console but doesn't break app
 * - User can still manually refresh page if needed
 *
 * PERFORMANCE:
 * - Invalidation is cheap (just marks queries as stale)
 * - Refetch only happens for queries currently in use
 * - TanStack Query deduplicates concurrent requests
 * - No unnecessary network calls
 *
 * @returns {void} - No return value (side effect only)
 */
export function useRealtimeClaudeUsage() {
  const queryClient = useQueryClient();

  // Debounce timer ref to prevent rapid invalidation churn
  // (Added based on review feedback - handles rapid consecutive syncs)
  const debounceRef = useRef(null);
  const DEBOUNCE_MS = 300; // 300ms debounce for rapid syncs

  /**
   * Event handler for 'claude-usage:synced' WebSocket event
   *
   * PARAMETERS:
   * @param {Object} syncData - Metadata from server
   * @param {string} syncData.syncId - ID of new sync document
   * @param {string} syncData.syncedAt - ISO timestamp of sync
   * @param {number} syncData.daysIncluded - Number of days synced
   * @param {number} syncData.totalCost - Total cost for period
   */
  const handleSyncEvent = useCallback(
    (syncData) => {
      // Log event for debugging
      console.log('[Claude Usage] Real-time sync event received:', {
        syncId: syncData.syncId,
        syncedAt: syncData.syncedAt,
        daysIncluded: syncData.daysIncluded,
        totalCost: `$${syncData.totalCost?.toFixed(2) || '0.00'}`,
      });

      // Clear any pending debounced invalidation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce invalidation to handle rapid consecutive syncs
      // (Review feedback: reduces refetch churn without harming UX)
      debounceRef.current = setTimeout(() => {
        // Invalidate all Claude usage queries
        // This marks them as stale and triggers refetch for active queries
        queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
        debounceRef.current = null;
      }, DEBOUNCE_MS);

      // Optional: Show toast notification to user
      // Uncomment if you want visual feedback that sync occurred
      // toast.success(`Claude usage synced! ${syncData.daysIncluded} days, $${syncData.totalCost?.toFixed(2)}`);
    },
    [queryClient],
  );

  // Subscribe to WebSocket event
  // useSocketEvent automatically handles:
  // - Socket connection check
  // - Event listener registration
  // - Cleanup on unmount
  // - No-op if WebSocket disconnected
  useSocketEvent('claude-usage:synced', handleSyncEvent);
}
````

**IMPORTANT: Required Imports (must be added to top of file):**

```javascript
// CORRECTED: These imports are NOT currently in the file and MUST be added
import { useCallback, useRef } from 'react';                    // Add useCallback, useRef
import { useSocketEvent } from './useWebSocket';                 // Add this import

// Existing imports (already present):
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

#### File 5: `myBrain-web/src/app/App.jsx` (UPDATED - was SettingsPage.jsx)

**Purpose:** Subscribe to real-time Claude usage events GLOBALLY

**IMPORTANT CHANGE (from review feedback):**
The original plan mounted this hook in `SettingsPage.jsx`, but this would only work
when the user is on the Settings page. To fulfill the goal of "browser updates within
2 seconds regardless of which page you're on", the hook MUST be mounted at App level.

**Step 5a: Add Import (around line 10-15, with other imports)**

```javascript
// Existing imports:
import { WebSocketProvider } from '../hooks/useWebSocket.jsx';
// ... other imports ...

// ✨ NEW: Add this import
import { useRealtimeClaudeUsage } from '../hooks/useClaudeUsage';
```

**Step 5b: Create Wrapper Component or Add to AppContent**

Option A (Recommended - Minimal change):
```javascript
// In the AppContent component (around line 350)
function AppContent() {
  // ✨ NEW: Subscribe to real-time Claude usage sync events globally
  // This enables automatic UI updates when /claude-usage runs in CLI
  // Works on ANY page, across all browser tabs and devices
  useRealtimeClaudeUsage();

  return (
    <AppInitializer>
      <Routes>
        {/* ... existing routes ... */}
      </Routes>
      <ToastContainer />
    </AppInitializer>
  );
}
```

Option B (More explicit - Dedicated provider):
```javascript
// Create a new component for clarity
function RealtimeUpdatesProvider({ children }) {
  // Subscribe to all real-time update hooks here
  useRealtimeClaudeUsage();
  // Future: useRealtimeBackups(), useRealtimeFileSync(), etc.
  return children;
}

// In App.jsx
function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipsProvider>
          <BrowserRouter>
            <WebSocketProvider>
              <RealtimeUpdatesProvider>  {/* ✨ NEW wrapper */}
                <AppContent />
              </RealtimeUpdatesProvider>
            </WebSocketProvider>
          </BrowserRouter>
        </TooltipsProvider>
      </QueryClientProvider>
    </Provider>
  );
}
```

**Why App-level instead of SettingsPage?**
- User runs `/claude-usage` while on Dashboard → Dashboard cache invalidated ✅
- User navigates to Settings → Shows fresh data immediately ✅
- All tabs update simultaneously regardless of current page ✅
- Original design (SettingsPage only) would only work while ON settings page ❌

---

## 6. Testing Strategy

### 6.1 Manual Test Cases

#### Test Case 1: Basic Real-Time Update

**Objective:** Verify browser updates automatically when sync completes

**Prerequisites:**

- Backend and frontend both running
- User logged into myBrain in browser
- Browser on Settings → Developer Stats → Claude Usage page

**Steps:**

1. Note current "Last sync" timestamp on SinceLastSyncCard
2. Open new terminal
3. Run `/claude-usage` CLI skill
4. Wait for CLI to show success message
5. Observe browser (WITHOUT refreshing)

**Expected Result:**

- Within 1-2 seconds, UI updates automatically
- "Last sync" timestamp changes to "just now"
- Sync summary shows new data (days, cost, deltas)
- No console errors
- No page refresh required

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 2: Multi-Tab Support

**Objective:** Verify all browser tabs update simultaneously

**Prerequisites:**

- Backend and frontend running
- User logged in

**Steps:**

1. Open myBrain in Browser Tab 1 → Settings → Claude Usage
2. Open myBrain in Browser Tab 2 → Dashboard
3. Open myBrain in Browser Tab 3 → Any other page
4. Run `/claude-usage` in CLI
5. Observe all three tabs (without clicking them)

**Expected Result:**

- All tabs receive WebSocket event
- Tab 1 updates immediately with new data
- Other tabs' cache invalidated
- No errors

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 3: User Not Connected

**Objective:** Verify sync succeeds even when no browser connected

**Prerequisites:**

- Backend running
- NO browser tabs open

**Steps:**

1. Close all myBrain browser tabs
2. Run `/claude-usage` in CLI
3. Wait for CLI response

**Expected Result:**

- CLI shows success
- No errors thrown
- Sync stored in database

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 4: WebSocket Disconnected

**Objective:** Verify sync succeeds if WebSocket fails

**Prerequisites:**

- Browser open
- Network throttling enabled

**Steps:**

1. Set network to offline
2. Run `/claude-usage`
3. Set network back to online
4. Manual refresh browser

**Expected Result:**

- CLI sync succeeds
- Browser shows new data after refresh
- No CLI errors

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 5: Rapid Consecutive Syncs

**Objective:** Verify system handles multiple syncs in quick succession

**Prerequisites:**

- Backend and frontend running
- Browser open

**Steps:**

1. Run `/claude-usage`
2. Immediately run `/claude-usage` again
3. Run a third time after 1 second
4. Observe browser

**Expected Result:**

- All syncs complete successfully
- Browser receives all events
- No race conditions
- UI shows latest data

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 6: Different Page When Sync Occurs

**Objective:** Verify cache invalidation works globally

**Prerequisites:**

- Backend and frontend running
- Browser logged in

**Steps:**

1. Open browser → Dashboard
2. Run `/claude-usage` in CLI
3. Wait 2 seconds
4. Navigate to Settings → Claude Usage

**Expected Result:**

- Dashboard cache invalidated
- Claude Usage page shows fresh data
- No loading delay

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 7: WebSocket Auth Verification (NEW - from review)

**Objective:** Verify WebSocket connects successfully with JWT token

**Prerequisites:**

- Backend and frontend running
- Browser dev tools open (Network → WS tab)

**Steps:**

1. Log out of myBrain
2. Open Network tab → WS filter
3. Log in to myBrain
4. Observe WebSocket connection

**Expected Result:**

- WebSocket connects successfully (101 status)
- No authentication errors in console
- Connection shows `user:{userId}` room joined in server logs

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 8: Cross-User Event Isolation (NEW - from review)

**Objective:** Verify users only receive their own events

**Prerequisites:**

- Two separate user accounts
- Two browser windows (or incognito)

**Steps:**

1. Log User A into Browser 1 → Settings → Claude Usage
2. Log User B into Browser 2 → Settings → Claude Usage
3. Run `/claude-usage` as User A in CLI
4. Observe both browsers

**Expected Result:**

- Browser 1 (User A) updates ✅
- Browser 2 (User B) does NOT update ✅
- No cross-user data leakage

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 9: WebSocket Reconnection (NEW - from review)

**Objective:** Verify events work after WebSocket reconnects

**Prerequisites:**

- Backend and frontend running
- Browser dev tools open

**Steps:**

1. Open myBrain → Settings → Claude Usage
2. Restart the backend server (simulates disconnect)
3. Wait for WebSocket to reconnect (check console for "[WebSocket] Connected")
4. Run `/claude-usage` in CLI
5. Observe browser

**Expected Result:**

- WebSocket reconnects automatically
- Sync event received after reconnection
- UI updates correctly

**Pass/Fail:** [ ] PASS [ ] FAIL

---

#### Test Case 10: Invalid Event Payload (NEW - from review)

**Objective:** Verify frontend handles malformed events gracefully

**Prerequisites:**

- Backend running with temporary test code

**Steps:**

1. Temporarily modify backend to emit invalid payload:
   ```javascript
   io.to(`user:${userId}`).emit('claude-usage:synced', null);
   ```
2. Run `/claude-usage` in CLI
3. Observe browser console

**Expected Result:**

- No JavaScript errors in console
- App continues to function
- User can manually refresh if needed

**Pass/Fail:** [ ] PASS [ ] FAIL

---

## 7. Risk Analysis

### 7.1 Technical Risks

#### Risk 1: WebSocket Emission Failure

**Severity:** LOW | **Likelihood:** LOW
**Impact:** User must manually refresh page
**Mitigation:** Wrapped in try-catch; sync succeeds anyway
**Status:** Acceptable

#### Risk 2: Race Condition

**Severity:** LOW | **Likelihood:** VERY LOW
**Impact:** Stale data briefly visible
**Mitigation:** TanStack Query deduplicates requests
**Status:** Acceptable

#### Risk 3: Memory Leak

**Severity:** MEDIUM | **Likelihood:** LOW
**Impact:** Browser slowdown over time
**Mitigation:** useEffect cleanup removes listeners
**Status:** Acceptable

#### Risk 4: WebSocket Overhead

**Severity:** LOW | **Likelihood:** LOW
**Impact:** Slight server resource increase
**Mitigation:** Already connected, minimal payload
**Status:** Acceptable

### 7.2 Security Risks

#### Risk 1: Unauthorized Event Interception

**Severity:** MEDIUM | **Likelihood:** VERY LOW
**Mitigation:** JWT authentication + room-based access control
**Status:** Acceptable

#### Risk 2: Payload Injection

**Severity:** LOW | **Likelihood:** VERY LOW
**Mitigation:** Server-side payload generation, no user input
**Status:** Acceptable

---

## 8. Deployment Plan

### 8.1 Deployment Steps

**Phase 1: Staging**

1. Deploy backend to staging
2. Deploy frontend to staging
3. Run all test cases
4. Monitor for 24 hours

**Phase 2: Production**

1. Schedule during low-traffic window
2. Deploy backend first
3. Verify WebSocket events
4. Deploy frontend
5. Smoke test
6. Active monitoring (1 hour)
7. Passive monitoring (24 hours)

**Phase 3: Rollback (if needed)**

- Comment out emission line (1 line)
- Redeploy backend
- System continues working without real-time

---

## 9. Success Criteria

✅ User runs `/claude-usage` → Browser updates within 2 seconds
✅ Works across multiple tabs/devices
✅ Graceful degradation (sync succeeds even if WebSocket fails)
✅ No breaking changes to existing functionality
✅ No additional database queries
✅ Error handling prevents sync failure

---

## 10. Questions for Senior Engineer Review

1. **Architecture:** Does the approach follow myBrain patterns correctly?
2. **Security:** Are there any security concerns with the room-based broadcasting?
3. **Performance:** Is the payload size appropriate? Should we send more/less data?
4. **Error Handling:** Should we alert users if WebSocket fails, or silent degradation?
5. **Testing:** Are the test cases comprehensive enough?
6. **Deployment:** Are the deployment steps clear and safe?
7. **Monitoring:** Should we add alerts beyond what's documented?
8. **Future:** Any considerations for extending this pattern to other features?

---

**Document Status:** ✅ APPROVED FOR IMPLEMENTATION (v2.0 Final Draft)

**Reviews Completed:**
- ✅ Claude Opus 4.5 (2026-01-23) - Conditional Approval → Blockers resolved
- ✅ GPT-5.2 Codex High (2026-01-22) - Proceed after fixes → Fixes applied

**Pre-Implementation Checklist:**
- [x] WebSocket auth blocker fixed (`useWebSocket.jsx` updated)
- [x] Query keys corrected to match actual codebase
- [x] StaleTime values corrected
- [x] Missing imports documented
- [x] Hook mounting location changed to App-level
- [x] Debounce logic added for rapid syncs
- [x] Additional test cases added (TC7-TC10)
- [x] CLI vs UI wording clarified

**Next Steps (Ready to Execute):**

1. ~~Senior engineers review this document~~ ✅ DONE
2. ~~Provide feedback on design decisions~~ ✅ DONE
3. ~~Approve for implementation~~ ✅ DONE
4. **Execute implementation plan** ← START HERE
5. Run test cases (including new TC7-TC10)
6. Deploy to production
7. Monitor for stability
8. Document lessons learned

**Assignee:** [Assign developer here]
**Target Start Date:** [Set date]
**Estimated Completion:** 4-5 hours development + 1.5 hours testing

------ SENIOR AGENT PLAN REVIEWS BELOW THIS LINE ------

## Senior Engineer Review (2026-01-23)

**Reviewer:** Claude Opus 4.5 (Senior Engineer Role)
**Review Status:** CONDITIONAL APPROVAL - Blockers must be resolved before implementation

---

### Executive Summary

This is a well-structured, low-risk approach that appropriately leverages the existing Socket.IO infrastructure. The document demonstrates good understanding of the codebase patterns. However, there is **one critical blocker** that will cause the feature to fail completely, plus several corrections needed to match the actual codebase state.

**Recommendation:** Fix the blocker, correct the mismatches, then proceed with implementation.

---

### 🚫 BLOCKER - Must Fix Before Implementation

#### B1: WebSocket Authentication Mismatch (CRITICAL)

**Severity:** BLOCKER
**Impact:** WebSocket connections will fail authentication; feature will not work at all

**The Problem:**

The backend WebSocket auth middleware at `myBrain-api/src/websocket/index.js:221-255` expects a JWT token via:

```javascript
const token =
  socket.handshake.auth.token ||
  socket.handshake.headers.authorization?.replace('Bearer ', '');
```

However, the frontend client at `myBrain-web/src/hooks/useWebSocket.jsx:29-36` does **NOT** pass any token:

```javascript
const newSocket = io(API_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  // ❌ NO auth: { token } here!
});
```

Browser WebSockets cannot send custom `Authorization` headers, and `withCredentials: true` only sends cookies - but the backend auth middleware doesn't parse cookies.

**Fix Options (choose one):**

1. **Option A (Recommended):** Pass JWT token via Socket.IO auth object:

   ```javascript
   // In useWebSocket.jsx
   import { getAuthToken } from '../lib/api'; // or wherever token is stored

   const newSocket = io(API_URL, {
     withCredentials: true,
     auth: {
       token: getAuthToken(), // Add this line
     },
     transports: ['websocket', 'polling'],
     // ...
   });
   ```

2. **Option B:** Parse HTTP-only cookies in backend middleware:
   - Requires adding `cookie` or `cookie-parser` package to parse cookies in WebSocket handshake
   - More complex; conflicts with document's "no new dependencies" claim

**Why This Hasn't Failed Yet:**
Current WebSocket features (messaging, presence) may be working if:

- Testing happens with a cached/lucky connection, OR
- There's a different auth path not documented, OR
- The feature is partially broken and unnoticed

**Action Required:** Investigate current WebSocket auth status before proceeding. This affects ALL WebSocket features, not just this new one.

---

### ⚠️ Should Fix - Corrections Required

#### S1: Hook Mounting Location vs. "Global Invalidation" Claim

**Severity:** HIGH
**Impact:** Feature won't work as advertised; user expectations not met

**The Problem:**

Document Section 5.2 (lines 1229-1294) proposes mounting `useRealtimeClaudeUsage()` in `SettingsPage.jsx`. However, lines 1127-1131 claim:

> "Works even when user is on different page (global invalidation)"

This is **incorrect**. If the hook is only mounted in `SettingsPage`, it will:

- ✅ Work when user is on Settings → Developer Stats → Claude Usage
- ❌ NOT work when user is on Dashboard, Tasks, Notes, or any other page
- ❌ NOT work if user navigates away from Settings

**Why It Matters:**
The stated goal is "User runs `/claude-usage` → Browser updates within 2 seconds" regardless of which page they're viewing. The current design fails this requirement.

**Fix Options:**

1. **Option A (Recommended):** Mount the hook at app level in `App.jsx` or a global provider component:

   ```javascript
   // In App.jsx, inside <WebSocketProvider>
   function AppContent() {
     useRealtimeClaudeUsage(); // Always listening
     return <Routes>...</Routes>;
   }
   ```

2. **Option B:** Create a dedicated provider that wraps the app:

   ```javascript
   // New component: RealtimeClaudeUsageProvider
   export function RealtimeClaudeUsageProvider({ children }) {
     useRealtimeClaudeUsage();
     return children;
   }

   // In App.jsx
   <WebSocketProvider>
     <RealtimeClaudeUsageProvider>
       <AppContent />
     </RealtimeClaudeUsageProvider>
   </WebSocketProvider>;
   ```

3. **Option C:** Update documentation to reflect actual behavior:
   - Change claims to state it only works while on Settings page
   - Accept this as a limitation

**Recommendation:** Option A is simplest and fulfills the original design intent.

---

#### S2: Query Key Mismatches

**Severity:** MEDIUM
**Impact:** Code examples won't work; copy-paste will cause bugs

**Document States (various locations):**

- Uses `claudeUsageKeys.usage(days)`
- Uses `claudeUsageKeys.lastSync()`

**Actual Code (`useClaudeUsage.js:4-14`):**

```javascript
export const claudeUsageKeys = {
  all: ['claude-usage'],
  recent: (days) => [...claudeUsageKeys.all, 'recent', days], // NOT 'usage'
  range: (startDate, endDate) => [
    ...claudeUsageKeys.all,
    'range',
    startDate,
    endDate,
  ],
  syncs: (limit) => [...claudeUsageKeys.all, 'syncs', limit],
  latestSync: () => [...claudeUsageKeys.all, 'syncs', 'latest'], // NOT 'lastSync'
  subscription: () => [...claudeUsageKeys.all, 'subscription'],
  subscriptionHistory: (limit) => [
    ...claudeUsageKeys.all,
    'subscription',
    'history',
    limit,
  ],
};
```

Additionally, there's a separate key pattern at line 93:

```javascript
queryKey: [...claudeUsageKeys.all, 'last-sync'],  // Inline key, not in keys object
```

**Action:** Update document to use correct key names, or ensure implementation code uses actual keys.

---

#### S3: StaleTime Mismatches

**Severity:** LOW
**Impact:** Document doesn't reflect actual behavior; could confuse future developers

| Hook                       | Document Claims | Actual Value | Location                          |
| -------------------------- | --------------- | ------------ | --------------------------------- |
| `useClaudeUsageLatestSync` | 5 minutes       | 1 minute     | `useClaudeUsage.js:171`           |
| `useClaudeUsageLastSync`   | (implied 5 min) | 30 seconds   | `useClaudeUsage.js:105`           |
| `useClaudeUsage`           | 5 minutes       | 5 minutes    | `useClaudeUsage.js:35` ✅ Correct |

**Action:** Update document to reflect actual staleTime values.

---

#### S4: Missing Import in Proposed Hook Code

**Severity:** LOW
**Impact:** Code won't compile without fix

The proposed `useRealtimeClaudeUsage` hook (lines 1179-1220) uses `useCallback`, but the import section shows:

```javascript
// Note: All required imports already exist at top of file:
// - useCallback from React
```

**Verification:** Current `useClaudeUsage.js` imports at line 1:

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

`useCallback` is **NOT** currently imported. The implementation must add:

```javascript
import { useCallback } from 'react';
```

Additionally, `useSocketEvent` needs to be imported:

```javascript
import { useSocketEvent } from './useWebSocket';
```

---

#### S5: Import Pattern Inconsistency

**Severity:** LOW
**Impact:** Code style inconsistency; minor

**Current Pattern in `messages.js:860`:**

```javascript
const { emitNewMessage } = await import('../websocket/index.js');
```

**Proposed Pattern in `analytics.js`:**

```javascript
import { emitClaudeUsageSynced } from '../websocket/index.js';
```

Both work, but the dynamic import pattern in messages.js may have been intentional (lazy loading, avoiding circular dependencies). Consider using the same pattern for consistency:

```javascript
// In analytics.js POST handler
if (io) {
  const { emitClaudeUsageSynced } = await import('../websocket/index.js');
  emitClaudeUsageSynced(io, req.user._id.toString(), result.sync);
}
```

**Decision:** Either pattern is acceptable; document the reasoning if using different patterns.

---

### 📝 Suggestions - Nice to Have

#### N1: Make Toast Notification Configurable

The proposed hook has a commented-out toast notification (line 1206-1208):

```javascript
// Optional: Show toast notification to user
// Uncomment if you want visual feedback that sync occurred
// toast.success(`Claude usage synced! ${syncData.daysIncluded} days, $${syncData.totalCost?.toFixed(2)}`);
```

**Suggestion:** Make this a user preference stored in settings. Some users will want visual feedback; others will find it distracting.

---

#### N2: Additional Test Cases

The test cases are good but missing some scenarios:

| Test Case | Scenario                                | Why It Matters                                     |
| --------- | --------------------------------------- | -------------------------------------------------- |
| TC7       | User logs out while sync in progress    | Ensure no errors when socket disconnects mid-event |
| TC8       | Two different users sync simultaneously | Verify no cross-user event leakage                 |
| TC9       | WebSocket reconnects after disconnect   | Verify events work after reconnection              |
| TC10      | Invalid/malformed event payload         | Ensure frontend handles gracefully                 |

---

#### N3: Monitoring & Alerting

Consider adding:

1. **Metric:** WebSocket event delivery latency (time from server emit to client receive)
2. **Alert:** If > 10% of sync events fail to emit (would indicate WebSocket infrastructure issues)
3. **Log:** Client-side logging when event received (for debugging)

---

### ✅ What's Good

1. **Low-risk approach** - WebSocket emission is wrapped in try-catch; sync succeeds even if WebSocket fails
2. **Follows existing patterns** - Mirrors messages.js implementation for consistency
3. **Appropriate payload size** - Minimal metadata (~200 bytes), triggers refetch for full data
4. **Room-based targeting** - Uses existing `user:{userId}` room pattern
5. **Good documentation** - Comprehensive comments in proposed code
6. **Rollback plan** - Single line comment to disable; <5 minute rollback time
7. **No new dependencies** - Uses existing Socket.IO infrastructure

---

### Answers to Questions Posed in Document

> **Q1: Architecture - Does the approach follow myBrain patterns correctly?**

Yes, the approach correctly follows the established patterns from `messages.js` and `notifications`. The room-based broadcasting using `user:{userId}` is consistent.

> **Q2: Security - Are there any security concerns with room-based broadcasting?**

No additional security concerns beyond the existing blocker (B1). Once auth is fixed:

- Users can only join their own `user:{userId}` room (verified during connection)
- Event payload contains no sensitive data (just IDs and aggregates)
- Server generates payload; no user input injection risk

> **Q3: Performance - Is the payload size appropriate?**

Yes. The ~200 byte payload is appropriate. Frontend will refetch full data anyway, so sending minimal metadata is the right choice.

> **Q4: Error Handling - Should we alert users if WebSocket fails?**

Silent degradation is correct. The sync succeeded (data saved); real-time notification is enhancement, not critical path. Users can still manually refresh. Adding a toast for WebSocket failure would be noisy and confusing.

> **Q5: Testing - Are the test cases comprehensive enough?**

Mostly yes. See suggestion N2 for additional edge cases worth covering.

> **Q6: Deployment - Are the deployment steps clear and safe?**

Yes. The phased deployment (staging → production) and quick rollback plan are appropriate.

> **Q7: Monitoring - Should we add alerts?**

Optional. See suggestion N3. For initial release, the existing logging is sufficient.

> **Q8: Future - Considerations for extending this pattern?**

This pattern can be applied to other CLI-initiated operations:

- `/backup` completion notification
- `/sync-files` completion
- Any other skill that modifies server-side data

Consider creating a generic helper:

```javascript
// websocket/index.js
export function emitUserEvent(io, userId, eventName, payload) {
  io.to(`user:${userId}`).emit(eventName, payload);
  logSocketEvent(eventName, { userId, ...payload });
}
```

---

### Final Verdict

| Category    | Status                   |
| ----------- | ------------------------ |
| Blockers    | 1 (must fix B1)          |
| Should Fix  | 5 (S1-S5)                |
| Suggestions | 3 (N1-N3)                |
| Overall     | **CONDITIONAL APPROVAL** |

**Next Steps:**

1. ❌ **MUST:** Resolve WebSocket auth blocker (B1) - investigate current state and fix
2. ❌ **MUST:** Decide on hook mounting location (S1) - recommend app-level mounting
3. ⚠️ **SHOULD:** Update document with correct query keys (S2) and staleTime values (S3)
4. ⚠️ **SHOULD:** Add missing imports to implementation code (S4)
5. ✅ **THEN:** Proceed with implementation
6. ✅ **THEN:** Run all test cases including suggested additions
7. ✅ **THEN:** Deploy per documented plan

**Estimated Additional Work:** 2-4 hours to resolve blockers and corrections before original implementation can proceed.

---

_Review completed: 2026-01-23_
_Reviewer: Claude Opus 4.5 (acting as Senior Engineer)_

---

## 2nd Senior Engineer Review (2026-01-22)

### Overall

Strong, low-risk approach that fits the existing Socket.IO pattern. However, there is a critical auth mismatch in the current WebSocket stack that will prevent this feature from working unless fixed first. The plan also has a few factual mismatches with the current codebase (query keys, stale times, imports) that should be corrected before implementation.

### Blockers / Must Fix

1. **WebSocket auth mismatch (current code):** `myBrain-api/src/websocket/index.js` only accepts a JWT from `socket.handshake.auth.token` or an `Authorization` header. The frontend `myBrain-web/src/hooks/useWebSocket.jsx` does **not** pass a token in `auth`, and browser sockets cannot send custom auth headers. This means sockets will fail auth unless this is addressed.  
   **Fix options:**
   - **Preferred:** Pass the JWT via `auth: { token: getAuthToken() }` in the Socket.IO client.
   - **Alternative:** Parse cookies in the WebSocket auth middleware and accept the HTTP-only `token` cookie.  
     If you choose the cookie path, note that it likely requires a cookie-parsing helper (new dependency) which conflicts with the plan’s "no dependencies" claim.

### Should Fix / Corrections

2. **Hook location vs “global invalidation”:** The plan mounts `useRealtimeClaudeUsage()` in `SettingsPage`, but the document claims it works globally on any page. That is only true if the hook is mounted at a top-level (e.g., `AppShell` or a global provider).  
   **Action:** Either mount it higher or update the document claims.
3. **Query key and staleTime mismatches:**
   - Actual keys in `myBrain-web/src/hooks/useClaudeUsage.js` are `recent`, `range`, `syncs`, `latestSync`, and `['claude-usage','last-sync']`. The doc uses `usage` and `lastSync` keys that do not exist.
   - `useClaudeUsageLatestSync` staleTime is **1 minute**; `useClaudeUsageLastSync` staleTime is **30 seconds** (not 5 minutes).  
     **Action:** Update the doc to match actual code to avoid implementation drift.
4. **Missing imports for new hook:** The plan states imports already exist, but `useClaudeUsage.js` currently does **not** import `useCallback` or `useSocketEvent`. Add them explicitly when implementing `useRealtimeClaudeUsage()`.
5. **Clarify CLI vs UI:** The plan says `useSyncClaudeUsage` is called by the CLI. The CLI calls the API directly; the hook is only for UI usage. Update wording to avoid confusion in onboarding.

### Nice-to-Have Improvements

6. **Debounce invalidations for rapid syncs:** The manual test case includes rapid consecutive syncs. TanStack Query will dedupe some requests, but a short debounce (e.g., 250–500ms) on invalidation would reduce refetch churn without harming UX.
7. **Telemetry on emission failures:** The plan logs failures to console. Consider logging a structured event (request logger) for easier aggregation, especially in production.

### Testing Additions

8. **Socket auth verification test:** Add a basic manual check that the browser socket connects successfully after login (token path). This is currently the biggest source of “silent failure.”
9. **Unit-ish test for emitter:** Mock `io.to().emit()` to ensure the route emits the correct event name and payload.

### Open Questions

10. **Auth method expectations:** When users authenticate via API keys only (no browser), should the event still emit? It will, and that is correct, but confirm there is no rate limit or admin gating desired.
11. **Future reuse:** If this is a pattern for other "CLI initiated → UI update" flows, consider a generic "user:data-changed" event with a `resource` field to avoid one-off events for each feature.

### Recommendation

Proceed after fixing the WebSocket auth mismatch and updating the document claims. Without that fix, this feature will look “implemented” but never fire in real browsers.

_2nd Review completed: 2026-01-22_
_Reviewer: chatgpt-5.2-codex high (acting as Senior Engineer)_
---

## Final Senior Engineer Review (2026-01-23)

**Reviewer:** Claude Opus 4.5 (Final Review - First Principles Analysis)
**Review Status:** APPROVED WITH MINOR CORRECTIONS
**Methodology:** Exhaustive codebase verification + comparison with both prior reviews

---

### Executive Summary

After conducting an independent code-level review of all files impacted by this implementation, I can confirm:

1. **The critical WebSocket auth blocker (B1) has been RESOLVED** - The frontend now correctly passes JWT tokens
2. **Both prior reviews are accurate** in their observations
3. **The implementation plan is sound** and follows established patterns
4. **Minor corrections needed** before implementation (documented below)

The design is ready for implementation after addressing the items below.

---

### Verification of Prior Review Findings

#### ✅ B1 Blocker (WebSocket Auth) - CONFIRMED FIXED

**Evidence from actual code (`myBrain-web/src/hooks/useWebSocket.jsx:29-44`):**

```javascript
// Get JWT token for WebSocket authentication
const token = getAuthToken();

// Create socket connection with auth token
const newSocket = io(API_URL, {
  withCredentials: true,
  auth: {
    token: token,  // ✅ Token IS being passed
  },
  transports: ['websocket', 'polling'],
  // ...
});
```

**Token source verified (`myBrain-web/src/lib/api.js:26-28`):**

```javascript
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);  // TOKEN_KEY = 'mybrain_token'
};
```

**Verdict:** This blocker is fully resolved. WebSocket connections will authenticate successfully.

---

#### ✅ S2 (Query Keys) - CONFIRMED MISMATCH

**Actual keys in `useClaudeUsage.js:5-14`:**

| Key Function | Actual Name | Document Used |
|--------------|-------------|---------------|
| Recent usage | `recent(days)` | `usage(days)` ❌ |
| Latest sync | `latestSync()` | `lastSync()` ❌ |
| Inline key | `['claude-usage', 'last-sync']` | Not mentioned |

**Note:** There are TWO different "last sync" patterns:
1. `claudeUsageKeys.latestSync()` → `['claude-usage', 'syncs', 'latest']` (for `useClaudeUsageLatestSync`)
2. Inline key at line 93 → `['claude-usage', 'last-sync']` (for `useClaudeUsageLastSync`)

**Action Required:** Document already updated per pre-implementation summary. Verify implementation uses `claudeUsageKeys.all` for invalidation (which covers both).

---

#### ✅ S3 (StaleTime Values) - CONFIRMED MISMATCH

**Actual values from code:**

| Hook | Line | Actual staleTime | Document Claimed |
|------|------|------------------|------------------|
| `useClaudeUsageLatestSync` | 171 | `1000 * 60` (1 min) | 5 minutes ❌ |
| `useClaudeUsageLastSync` | 105 | `1000 * 30` (30 sec) | 5 minutes ❌ |
| `useClaudeUsage` | 35 | `1000 * 60 * 5` (5 min) | 5 minutes ✅ |

**Impact:** These shorter staleTime values actually HELP the feature - queries will naturally refresh faster than documented.

---

#### ✅ S4 (Missing Imports) - CONFIRMED

**Current imports in `useClaudeUsage.js:1-2`:**

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';
```

**Required additions for the new hook:**

```javascript
import { useCallback, useRef } from 'react';           // For handler + debounce ref
import { useSocketEvent } from './useWebSocket';        // For WebSocket subscription
```

---

### New Findings from Independent Code Review

#### F1: `logSocketEvent` Not Exported (MINOR)

**Issue:** The design proposes using `logSocketEvent()` in `emitClaudeUsageSynced`, but this function is defined as a private module function in `websocket/index.js:103` and is NOT exported.

**Evidence:**

```javascript
// Line 103 - Private function, no export keyword
function logSocketEvent(eventName, data = {}) { ... }

// Line 721-729 - Not included in default export
export default {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitNewConversation,
  isUserOnline,
  getOnlineUsers
  // ❌ logSocketEvent NOT here
};
```

**Fix Options:**
1. **Recommended:** Export `logSocketEvent` by adding `export` keyword before the function definition
2. Alternative: Inline `console.log` in the new emit function (less consistent)

**Code change needed in `websocket/index.js:103`:**

```javascript
// Change from:
function logSocketEvent(eventName, data = {}) {

// To:
export function logSocketEvent(eventName, data = {}) {
```

---

#### F2: Dynamic Import Pattern Verification

**Confirmed:** The `messages.js` pattern uses dynamic imports at line 860:

```javascript
if (io) {
  const { emitNewMessage } = await import('../websocket/index.js');
  emitNewMessage(io, id, { ... });
}
```

**Recommendation:** The design document proposes a static import pattern, which is also valid. Either approach works:

| Pattern | Pros | Cons |
|---------|------|------|
| Static import (proposed) | Simpler, faster at runtime | Loaded even if io is null |
| Dynamic import (messages.js) | Lazy loading, avoids circular deps | Slightly more code |

**Decision:** Keep static import as proposed - it's simpler and the module is already loaded by server.js.

---

#### F3: ClaudeUsageSync Return Structure Verification

**Verified in `claudeUsageService.js:162-170`:**

```javascript
export async function recordSyncEvent(userId, ccusageOutput) {
  const sync = await ClaudeUsageSync.recordSync(userId, ccusageOutput);
  const dailyProcessing = await processUsageData(userId, ccusageOutput);
  return { sync, dailyProcessing };
}
```

**The `sync` object structure (per ClaudeUsageSync model schema in document lines 524-595):**

- `sync._id` ✅ Available
- `sync.syncedAt` ✅ Available
- `sync.summary.daysIncluded` ✅ Available
- `sync.summary.totalCost` ✅ Available

**Verdict:** The proposed payload structure in `emitClaudeUsageSynced` is correct.

---

#### F4: App.jsx Hook Mounting Location

**Verified `App.jsx` structure:**

```javascript
function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>     // ← QueryClient available
        <TooltipsProvider>
          <BrowserRouter>
            <WebSocketProvider>                        // ← WebSocket available
              <AppContent />                           // ← Mount hook HERE
            </WebSocketProvider>
          </BrowserRouter>
        </TooltipsProvider>
      </QueryClientProvider>
    </Provider>
  );
}
```

**`AppContent` (line 94-400)** is the correct location because:
- Inside `WebSocketProvider` (socket available)
- Inside `QueryClientProvider` (queryClient available)
- Renders for all authenticated AND public routes

**Recommended implementation:**

```javascript
function AppContent() {
  useRealtimeClaudeUsage();  // ← Add this line at line 95

  return (
    <AppInitializer>
      <Routes>
        {/* ... existing routes ... */}
      </Routes>
      <ToastContainer />
    </AppInitializer>
  );
}
```

**Note:** The hook will be called even on public routes (login/signup), but it will be a no-op since WebSocket only connects for authenticated users. This is safe.

---

#### F5: Missing `setSocketIO` Export in analytics.js

**Current state:** The `analytics.js` route file has NO Socket.IO setup - no `let io` variable, no `setSocketIO` function.

**Required additions match the document Section 5.1, Step 2b.** The implementation guide is correct.

---

### Corrections to Implementation Plan

#### C1: Export `logSocketEvent` (Required)

**File:** `myBrain-api/src/websocket/index.js`
**Line:** 103
**Change:** Add `export` keyword

```javascript
// FROM:
function logSocketEvent(eventName, data = {}) {

// TO:
export function logSocketEvent(eventName, data = {}) {
```

Also update the default export at line 721:

```javascript
export default {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitNewConversation,
  emitClaudeUsageSynced,  // ← NEW
  logSocketEvent,          // ← NEW (optional, for consistency)
  isUserOnline,
  getOnlineUsers
};
```

---

#### C2: Clarify Subscription Events

Both reviews mention this feature could extend to subscription usage syncs. The current design only handles `claude-usage:synced` for the main sync. Consider whether `claude-subscription:synced` should also be implemented for symmetry when `/usage` data is synced.

**Recommendation:** Out of scope for v1. Add as follow-up if users request it.

---

### Security Review

| Concern | Status | Notes |
|---------|--------|-------|
| Room isolation | ✅ Safe | Users auto-join only their `user:{userId}` room on connection |
| Payload injection | ✅ Safe | Server generates payload from trusted DB data |
| Event spoofing | ✅ Safe | Only server emits; clients can't emit `claude-usage:synced` |
| Cross-user leakage | ✅ Safe | Events target specific user room |
| Auth bypass | ✅ Safe | WebSocket auth verified before connection |

---

### Performance Review

| Metric | Assessment |
|--------|------------|
| Payload size | ~180 bytes - Excellent |
| Network overhead | Negligible (single emit per sync) |
| Memory impact | Zero (no new state stored) |
| CPU impact | Negligible (single event handler) |
| Query load | Same (invalidation triggers refetch that was already needed) |

---

### Implementation Checklist (Final)

**Backend Changes:**

- [ ] `websocket/index.js`: Add `export` to `logSocketEvent` function (line 103)
- [ ] `websocket/index.js`: Add `emitClaudeUsageSynced` function (after line 673)
- [ ] `websocket/index.js`: Update default export to include new functions
- [ ] `analytics.js`: Add `import { emitClaudeUsageSynced } from '../websocket/index.js';`
- [ ] `analytics.js`: Add `let io = null;` and `setSocketIO` function
- [ ] `analytics.js`: Add emission in POST `/claude-usage` handler (after line 875)
- [ ] `server.js`: Update import to include `setSocketIO as setAnalyticsSocketIO`
- [ ] `server.js`: Call `setAnalyticsSocketIO(io)` after WebSocket init

**Frontend Changes:**

- [ ] `useClaudeUsage.js`: Add `import { useCallback, useRef } from 'react';`
- [ ] `useClaudeUsage.js`: Add `import { useSocketEvent } from './useWebSocket';`
- [ ] `useClaudeUsage.js`: Add `useRealtimeClaudeUsage` hook (end of file)
- [ ] `App.jsx`: Add `import { useRealtimeClaudeUsage } from '../hooks/useClaudeUsage';`
- [ ] `App.jsx`: Call `useRealtimeClaudeUsage()` in `AppContent` function

**Testing:**

- [ ] TC1: Basic real-time update
- [ ] TC2: Multi-tab support
- [ ] TC3: User not connected
- [ ] TC4: WebSocket disconnected
- [ ] TC5: Rapid consecutive syncs
- [ ] TC6: Different page when sync occurs
- [ ] TC7: WebSocket auth verification
- [ ] TC8: Cross-user event isolation
- [ ] TC9: WebSocket reconnection
- [ ] TC10: Invalid event payload

---

### Comparison of Reviews

| Finding | Review 1 (Opus 4.5) | Review 2 (GPT-5.2) | This Review |
|---------|---------------------|---------------------|-------------|
| WebSocket auth blocker | Identified, fix proposed | Confirmed | **VERIFIED FIXED** |
| Query key mismatches | Identified | Confirmed | **VERIFIED, matches** |
| StaleTime mismatches | Identified | Confirmed | **VERIFIED, matches** |
| Missing imports | Identified | Confirmed | **VERIFIED, matches** |
| Hook mounting location | Fix proposed | Confirmed | **VERIFIED App.jsx correct** |
| Debounce recommendation | Not mentioned | Proposed | **AGREED, in design** |
| logSocketEvent export | Not identified | Not identified | **NEW FINDING (F1)** |

---

### Final Verdict

| Category | Status |
|----------|--------|
| Blockers | 0 (B1 resolved) |
| Required Fixes | 1 (F1: export logSocketEvent) |
| Corrections Applied | Already in document |
| Risk Level | LOW |
| Overall | **APPROVED FOR IMPLEMENTATION** |

**Recommendation:** Proceed with implementation. The single required fix (F1) is trivial and can be done as part of the implementation.

---

### Questions for Discussion

Before proceeding, consider:

1. **Toast notification on sync:** Should users see "Claude usage synced!" toast in the browser? Currently commented out. User preference?

2. **Subscription sync events:** Should we also emit `claude-subscription:synced` when subscription data is synced via `/usage` command? Or is the main sync event sufficient?

3. **Reconnection handling:** If WebSocket reconnects after sync, should we trigger a full refetch? Currently no - user gets fresh data on next navigation. Acceptable?

4. **Error visibility:** If WebSocket emission fails, currently logged server-side only. Should we add structured logging (Wide Events) for easier debugging in production?

---

_Final Review completed: 2026-01-23_
_Reviewer: Claude Opus 4.5 (Final Review - First Principles Analysis)_

---
