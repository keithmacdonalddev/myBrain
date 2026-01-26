# Comprehensive Backend Testing Plan

## Executive Summary

This plan addresses all gaps identified in the backend testing audit:
- **14 untested services** (including 4 security-critical)
- **3 untested middleware** (including 875-line requestLogger)
- **33 untested models** (7 with complex business logic)
- **11 route endpoint gaps** (notes alone has 11 untested endpoints)
- **Quality improvements** needed in existing tests

**Approach:** Maximum parallelization using specialized agents, organized into 6 phases.

---

## Phase 1: Security-Critical Services (4 agents in parallel)

These handle authentication, file access control, and admin operations. Must be tested first.

| Agent | Service | Functions | Tests Expected |
|-------|---------|-----------|----------------|
| 1A | `apiKeyService.js` | 8 functions (generateApiKey, hashApiKey, verifyApiKey, createApiKey, revokeApiKey, listApiKeys, updateLastUsed, findUserByApiKey) | ~40 tests |
| 1B | `shareService.js` | 12 functions (createShare, getShareByToken, verifyShareAccess, accessShare, getFileShares, getUserShares, updateShare, revokeShare, revokeFileShares, getShareAccessLog, getPublicFileInfo, getUserShareCount) | ~60 tests |
| 1C | `adminContentService.js` | 13 functions (getUserContentCounts, getUserNotes, getUserTasks, getUserProjects, getUserImages, getUserActivityTimeline, getUserActivityStats, getUserContent, getUserConnections, getUserBlocks, getUserMessages, getUserShares, getUserSocialStats) | ~65 tests |
| 1D | `adminSocialService.js` | 11 functions (getSocialDashboardStats, getConnectionStats, getConnectionTrends, getMessageStats, getMessageTrends, getReportStats, getShareStats, getBlockStats, getTopActiveUsers, getUserSocialMetrics, getConnectionPatterns) | ~55 tests |

**Phase 1 Total: ~220 tests**

---

## Phase 2: Complex Services (5 agents in parallel)

High-complexity services with multiple dependencies and business logic.

| Agent | Service | Functions | Tests Expected |
|-------|---------|-----------|----------------|
| 2A | `dashboardService.js` | 15 functions (getDashboardData, getUrgentItems, getAttentionItems, getRecentItems, getTodayEvents, getTomorrowEvents, getPriorityTasks, getActiveProjects, getUnreadConversations, getInboxNotes, getUnreadNotifications, getPendingShares, getRecentActivity, getCompletionStats, getUserDashboardPreferences) | ~75 tests |
| 2B | `analyticsService.js` | 7 functions (trackEvent, getOverview, getFeatureAnalytics, getUserAnalytics, getErrorAnalytics, getRetentionMetrics, parseUserAgent) | ~45 tests |
| 2C | `linkService.js` | 6 functions (createLink, removeLink, getBacklinks, getOutgoingLinks, getAllLinks, deleteEntityLinks) | ~35 tests |
| 2D | `imageProcessingService.js` | 9 functions (processImage, extractMetadata, generateThumbnail, resizeImage, convertFormat, applyTransforms, cropImage, isValidImage, getSupportedFormats) | ~50 tests |
| 2E | `usageService.js` + `claudeUsageService.js` | Combined service tests | ~40 tests |

**Phase 2 Total: ~245 tests**

---

## Phase 3: Simple Services + Middleware (5 agents in parallel)

Simpler services and all middleware in parallel.

| Agent | Target | Functions | Tests Expected |
|-------|--------|-----------|----------------|
| 3A | `weatherService.js` | 6 functions (getWeather, geocodeLocation, getWeatherByCoordinates, extractLocationParts, tryGeocode, formatWeatherData) | ~35 tests |
| 3B | `savedLocationService.js` | 7 functions (getLocations, getLocation, createLocation, updateLocation, deleteLocation, setDefaultLocation, reorderLocations) | ~40 tests |
| 3C | `requestLogger.js` middleware | 7 functions (requestLogger, getStatusColor, formatDuration, truncate, formatTimestamp, logToConsole, attachEntityId) | ~50 tests |
| 3D | `ensureTags.js` middleware | ensureTags function + 26 default tags | ~25 tests |
| 3E | `ensureLifeAreas.js` middleware | ensureLifeAreas function + 6 default categories | ~20 tests |

**Phase 3 Total: ~170 tests**

---

## Phase 4: Complex Models (7 agents in parallel)

Models with significant business logic (statics and instance methods).

| Agent | Model | Statics | Methods | Tests Expected |
|-------|-------|---------|---------|----------------|
| 4A | `Notification.js` | 16 statics (getNotifications, getUnreadCount, markAllAsRead, markAllAsSeen, createNotification, notifyConnectionRequest, notifyConnectionAccepted, notifyItemShared, notifyNewMessage, notifyModerationWarning, notifyModerationSuspension, notifyModerationBan, notifyModerationUnsuspend, notifyModerationUnban, notifyAdminMessage, cleanupOldNotifications) | 2 methods (markAsRead, markAsSeen) | ~70 tests |
| 4B | `Conversation.js` | 4 statics (findDirectConversation, getOrCreateDirect, getConversationsForUser, getTotalUnreadCount) | 9 methods (getParticipantMeta, updateLastMessage, markAsRead, toggleArchive, mute, unmute, isMuted, addParticipant, removeParticipant) | ~65 tests |
| 4C | `Activity.js` | 9 statics (getFeed, getUserActivities, createActivity, logProjectCreated, logProjectCompleted, logTaskCompleted, logConnectionMade, logItemShared, cleanupOldActivities) | 0 methods | ~50 tests |
| 4D | `Folder.js` | 7 statics (updateDescendantPaths, getFolderTree, getBreadcrumb, updateFolderStats, getFolderContents, nameExistsInParent, canMoveTo) | 2 methods (toSafeJSON, generatePath) | ~55 tests |
| 4E | `Message.js` | 3 statics (getMessages, createSystemMessage, getUnreadCount) | 5 methods (markAsRead, edit, softDelete, canEdit, canDelete) | ~50 tests |
| 4F | `ItemShare.js` | 8 statics (generateShareToken, hashPassword, getSharedWithUser, getPendingShares, getSharedByUser, getByToken, getSharesForItem, getShareCounts) | 6 methods (verifyPassword, isExpired, hasReachedMaxAccess, hasUserAccess, getUserPermission, logAccess) | ~60 tests |
| 4G | `AnalyticsEvent.js` | 7 statics (track, getFeatureUsage, getPopularActions, getDailyActiveUsers, getPageViews, getDeviceBreakdown, getHourlyActivity) | 0 methods | ~40 tests |

**Phase 4 Total: ~390 tests**

---

## Phase 5: Remaining Models (6 agents in parallel)

Models with simpler validation but still need coverage.

| Agent | Models | Focus | Tests Expected |
|-------|--------|-------|----------------|
| 5A | `UserBlock.js`, `Report.js`, `ModerationAction.js` | Moderation models - statics, validation | ~50 tests |
| 5B | `SavedFilter.js`, `SavedLocation.js`, `SidebarConfig.js` | User preference models - validation, defaults | ~45 tests |
| 5C | `File.js`, `FileShare.js`, `Image.js` | File-related models - validation, statics | ~55 tests |
| 5D | `Event.js`, `LifeArea.js`, `Tag.js` | Organization models - validation, statics | ~50 tests |
| 5E | `Link.js`, `AdminMessage.js`, `ModerationTemplate.js` | Utility models - validation | ~40 tests |
| 5F | `Log.js`, `SystemSettings.js`, `RoleConfig.js`, `UsageStats.js` | System models - validation | ~40 tests |

**Phase 5 Total: ~280 tests**

---

## Phase 6: Route Endpoint Gaps + Quality Improvements (8 agents in parallel)

Fill gaps in existing route tests and improve test quality.

| Agent | Target | Scope | Tests Expected |
|-------|--------|-------|----------------|
| 6A | `notes.test.js` gaps | 11 missing endpoints (inbox, tags, pin/unpin, archive, process, convert-to-task, backlinks, recent, pinned, all-tags, search) | ~55 tests |
| 6B | `tasks.test.js` gaps | link-note, backlinks, tags, due dates, priorities, user isolation | ~40 tests |
| 6C | `profile.test.js` gaps | DELETE /profile, PATCH /dashboard-preferences, GET /activity | ~25 tests |
| 6D | `users.test.js` gaps | GET connections, PATCH social-settings, PATCH presence | ~25 tests |
| 6E | `auth.test.js` gaps | GET /subscription, rate limiting verification, account status checks | ~30 tests |
| 6F | User isolation tests | Add user isolation tests to all route files | ~50 tests |
| 6G | Error scenario tests | Comprehensive error handling across routes | ~40 tests |
| 6H | Response validation | Validate response content, not just status codes | ~35 tests |

**Phase 6 Total: ~300 tests**

---

## Execution Summary

| Phase | Description | Agents | Est. Tests | Dependencies |
|-------|-------------|--------|------------|--------------|
| 1 | Security-Critical Services | 4 | ~220 | None |
| 2 | Complex Services | 5 | ~245 | None |
| 3 | Simple Services + Middleware | 5 | ~170 | None |
| 4 | Complex Models | 7 | ~390 | None |
| 5 | Remaining Models | 6 | ~280 | None |
| 6 | Route Gaps + Quality | 8 | ~300 | Phases 1-5 |

**Total Agents: 35**
**Total Expected Tests: ~1,605**
**Current Backend Tests: 1,246**
**Target Backend Tests: ~2,850**

---

## Parallel Execution Strategy

Phases 1-5 can run **completely in parallel** (no dependencies):
- **Wave 1:** Launch Phases 1, 2, 3, 4, 5 simultaneously (27 agents)
- **Wave 2:** After Wave 1 completes, launch Phase 6 (8 agents)

Maximum concurrent agents per wave: **27 agents**

---

## Test Quality Standards

Each agent will follow these standards:

### Required Test Categories
1. **Happy Path** - Normal successful operations
2. **Authentication** - 401/403 for protected functions
3. **Validation** - Invalid input handling
4. **User Isolation** - Can't access other users' data
5. **Edge Cases** - Empty arrays, null values, max limits
6. **Error Handling** - Database errors, external service failures

### Test Structure Template
```javascript
describe('ServiceName', () => {
  describe('functionName', () => {
    describe('success cases', () => {
      it('should do X when Y', async () => {});
    });

    describe('validation', () => {
      it('should reject invalid input', async () => {});
    });

    describe('user isolation', () => {
      it('should not return other user data', async () => {});
    });

    describe('error handling', () => {
      it('should handle database errors gracefully', async () => {});
    });
  });
});
```

### Assertions Required
- Status codes AND response body structure
- Database state verification (check records created/modified)
- Side effects verification (related records updated)
- Error messages and codes (not just status)

---

## File Locations

All test files follow the pattern:
- Services: `myBrain-api/src/services/{name}.test.js`
- Middleware: `myBrain-api/src/middleware/{name}.test.js`
- Models: `myBrain-api/src/models/{name}.test.js`
- Routes: `myBrain-api/src/routes/{name}.test.js`

---

## Verification

After each phase:
1. Run `npm test` to verify all tests pass
2. Check test count increased as expected
3. Verify no flaky tests (run twice)

After all phases:
1. Run full test suite
2. Verify coverage report
3. Run with `--verbose` to check test quality

---

## Dependencies to Consider

### External Services (may need mocking)
- AWS S3 (shareService, fileService)
- Open-Meteo API (weatherService)
- Sharp image library (imageProcessingService)

### Cross-Model Dependencies
- Notification depends on User (for actorId population)
- Activity depends on Connection (for feed visibility)
- ItemShare depends on multiple item models
- Dashboard aggregates from 9+ models

### Test Infrastructure Available
- `src/test/setup.js` - MongoDB Memory Server setup
- `src/test/testApp.js` - Express app for supertest
- Existing helpers in other test files (can be extracted)
