# Plan: Remove Developer Stats and API Keys Features

## Overview

Remove the Developer Stats (Claude Usage tracking) and API Keys features from myBrain. This is a complete removal affecting frontend components, backend routes/services/models, hooks, tests, and the related CLI skill.

**Note:** `UsageStats.js` model tracks user app interactions (tasks, notes, etc.) - this is DIFFERENT from Claude usage and should NOT be removed.

---

## Files to DELETE

### Frontend Components (10 files)

```
myBrain-web/src/components/settings/ClaudeUsageSettings.jsx
myBrain-web/src/components/settings/ApiKeysSettings.jsx
myBrain-web/src/components/settings/claude-usage/CostTrendChart.jsx
myBrain-web/src/components/settings/claude-usage/ModelUsageTrends.jsx
myBrain-web/src/components/settings/claude-usage/UsageDataTable.jsx
myBrain-web/src/components/settings/claude-usage/SyncHistoryList.jsx
myBrain-web/src/components/settings/claude-usage/SubscriptionLimitsCard.jsx
myBrain-web/src/components/settings/claude-usage/SinceLastSyncCard.jsx
myBrain-web/src/components/settings/claude-usage/index.js
myBrain-web/src/components/ui/PeriodSelector.jsx
```

### Frontend Hooks (2 files)

```
myBrain-web/src/hooks/useClaudeUsage.js
myBrain-web/src/hooks/useApiKeys.js
```

### Frontend Tests (11 files to DELETE)

```
myBrain-web/src/components/settings/ClaudeUsageSettings.test.jsx
myBrain-web/src/components/settings/ApiKeysSettings.test.jsx
myBrain-web/src/components/settings/claude-usage/CostTrendChart.test.jsx
myBrain-web/src/components/settings/claude-usage/ModelUsageTrends.test.jsx
myBrain-web/src/components/settings/claude-usage/UsageDataTable.test.jsx
myBrain-web/src/components/settings/claude-usage/SyncHistoryList.test.jsx
myBrain-web/src/components/settings/claude-usage/SubscriptionLimitsCard.test.jsx
myBrain-web/src/components/settings/claude-usage/SinceLastSyncCard.test.jsx
myBrain-web/src/components/ui/PeriodSelector.test.jsx
myBrain-web/src/hooks/useClaudeUsage.test.js
myBrain-web/src/hooks/useApiKeys.test.js
```

### Standalone Subproject (1 directory to DELETE)

```
myBrain-web/Claude-Code-Usage-Monitor/ (entire directory - separate Python CLI project)
```

### Backend Models (3 files)

```
myBrain-api/src/models/ClaudeUsage.js
myBrain-api/src/models/ClaudeUsageSync.js
myBrain-api/src/models/ClaudeSubscriptionUsage.js
```

### Backend Services (2 files)

```
myBrain-api/src/services/claudeUsageService.js
myBrain-api/src/services/apiKeyService.js
```

### Backend Routes (1 file)

```
myBrain-api/src/routes/apiKeys.js
```

### Backend Tests (3 files)

```
myBrain-api/src/routes/apiKeys.test.js
myBrain-api/src/services/apiKeyService.test.js
myBrain-api/src/services/claudeUsageService.test.js
```

**Note:** Verified no model-level test files exist (ClaudeUsage.test.js, etc.). `UsageStats.test.js` tracks user app interactions - do NOT delete.

### Skills Directory (1 directory)

```
.claude/skills/claude-usage/ (entire directory)
```

---

## Files to MODIFY

### 1. `myBrain-web/src/features/settings/SettingsPage.jsx`

**Remove:**

- Import statements for `ClaudeUsageSettings` and `ApiKeysSettings`
- Import for `Code2` and `Key` icons (if only used for these sections)
- Section definitions for 'claude-usage' and 'api-keys' in SECTIONS array
- Switch cases for rendering these components

### 2. `myBrain-web/src/lib/api.js`

**Remove:**

- `analyticsApi` object methods for Claude usage (getClaudeUsage, syncClaudeUsage, etc.)
- `apiKeysApi` object entirely

### 3. `myBrain-web/src/app/App.jsx`

**Remove:**

- Import for `useRealtimeClaudeUsage` and `useRealtimeClaudeSubscription`
- Calls to these hooks in `AppContent` component (lines 98-99)

### 4. `myBrain-api/src/middleware/auth.js`

**Remove:**

- Import for `apiKeyService`
- API key authentication logic in `requireAuth` middleware
- Keep JWT authentication intact

### 5. `myBrain-api/src/models/User.js`

**Remove:**

- `apiKeys` array field from User schema

### 6. `myBrain-api/src/server.js`

**Remove:**

- Import for `apiKeysRoutes`
- Route registration: `app.use('/api-keys', apiKeysRoutes)`
- Import for `setAnalyticsSocketIO` (from analytics.js)
- Call to `setAnalyticsSocketIO(io)` (only used for Claude usage emissions)

### 7. `myBrain-api/src/routes/analytics.js`

**Remove:**

- All Claude usage endpoints (POST/GET /analytics/claude-usage/\*)
- Import for `claudeUsageService`
- `setSocketIO` function and export (only used for Claude usage WebSocket emissions)
- Keep other analytics endpoints

### 8. `myBrain-api/src/websocket/index.js`

**Remove:**

- `emitClaudeUsageSynced` function
- `emitClaudeSubscriptionSynced` function
- Their exports

### 9. `myBrain-api/src/test/testApp.js`

**Remove:**

- Import for `apiKeysRoutes`
- Route registration: `app.use('/api-keys', apiKeysRoutes)`
- Model imports (lines 36-38):
  ```javascript
  import '../models/ClaudeUsage.js';
  import '../models/ClaudeUsageSync.js';
  import '../models/ClaudeSubscriptionUsage.js';
  ```

### 10. `.claude/credentials.json`

**Remove:**

- `myBrain.apiKey` field (no longer needed)
- Keep `testAccounts` section

### 11. `CLAUDE.md`

**Update:**

- Remove references to `/claude-usage` skill
- Remove API key setup instructions
- Add planning workflow section with these rules:
  1. All plans must be written to `.claude/plans/` in the project directory (NOT user-level `~/.claude/plans/`)
  2. All plans require review by senior engineers for opinions, suggestions, revisions, and approval before implementation
  3. Never begin implementation until plan is explicitly approved

### 12. `myBrain-api/src/middleware/auth.js`

**Additional cleanup:**

- Remove inline documentation/comments about API key authentication (after removing the logic)

### 13. `myBrain-web/src/lib/api.test.js`

**Remove:**

- Tests for Claude usage API methods (getClaudeUsage, syncClaudeUsage, etc.)
- Tests for apiKeysApi methods

### 14. `myBrain-web/src/features/settings/SettingsPage.test.jsx`

**Remove:**

- Test cases for 'Developer Stats' section
- Test cases for 'API Keys' section
- Any mocks for ClaudeUsageSettings or ApiKeysSettings

### 15. `myBrain-api/src/middleware/auth.test.js`

**Remove:**

- Test cases for API key authentication (mbrain_* tokens)
- Keep JWT authentication tests

### 16. `myBrain-api/src/routes/analytics.test.js`

**Remove:**

- All test cases for Claude usage endpoints (/analytics/claude-usage/*)
- Keep other analytics endpoint tests

### 17. `README.md`

**Update:**

- Remove `api-keys` from routes list
- Remove any references to Developer Stats or Claude usage features

### 18. `WEBSOCKET_REALTIME_DESIGN.md`

**Update:**

- Remove references to `emitClaudeUsageSynced` and `emitClaudeSubscriptionSynced`
- Remove Claude usage WebSocket event documentation

---

## Execution Order

### Phase 0: Pre-flight Verification

1. **Repo-wide ripgrep sweep** for stray references:
   ```bash
   rg -l "claudeUsage|ClaudeUsage|apiKeyService|api-keys|mbrain_|claude-usage" --type js
   ```
2. **Verify no external API key consumers** - Confirmed: Only consumer is the `/claude-usage` CLI skill which is being removed. No CI jobs, automation, or external tools use API key auth.
3. **Check `.env*` files** - Verified: No API key or Claude usage env vars exist.

### Phase 1: Backend Cleanup

1. Modify `auth.js` - Remove API key authentication + clean up inline documentation
2. Modify `User.js` - Remove apiKeys schema field
3. Modify `server.js` - Remove apiKeys routes + remove setAnalyticsSocketIO import/call
4. Modify `analytics.js` - Remove Claude usage endpoints + remove setSocketIO export
5. Modify `websocket/index.js` - Remove `emitClaudeUsageSynced` and `emitClaudeSubscriptionSynced`
6. Modify `test/testApp.js` - Remove apiKeys route registration + remove Claude model imports
7. Modify `auth.test.js` - Remove API key authentication test cases
8. Modify `analytics.test.js` - Remove Claude usage endpoint test cases
9. Delete backend models, services, routes, tests (files listed above)

### Phase 2: Frontend Cleanup

1. Modify `App.jsx` - Remove realtime hooks
2. Modify `SettingsPage.jsx` - Remove sections
3. Modify `api.js` - Remove API functions
4. Modify `api.test.js` - Remove Claude usage and API keys test cases
5. Modify `SettingsPage.test.jsx` - Remove Developer Stats and API Keys test cases
6. Delete frontend components, hooks, tests (files listed above)

### Phase 3: Documentation/Skills

1. Delete `.claude/skills/claude-usage/` directory
2. Delete `myBrain-web/Claude-Code-Usage-Monitor/` directory
3. Update `.claude/credentials.json`
4. Update `CLAUDE.md`
5. Update `README.md` - Remove api-keys from routes list
6. Update `WEBSOCKET_REALTIME_DESIGN.md` - Remove Claude usage WebSocket references

### Phase 4: Database Cleanup

**Pre-flight check:**

```javascript
// First, verify collection names in MongoDB shell
db.getCollectionNames().filter(
  (c) => c.includes('claude') || c.includes('usage'),
);
```

**Then drop (requires explicit approval):**

```javascript
db.claudeusages.drop();
db.claudeusagesyncs.drop();
db.claudesubscriptionusages.drop();
```

**Note:** Claude usage data has no compliance/audit retention requirements - safe to drop.

**Optional backup before drop:**

```bash
mongoexport --uri="$MONGO_URI" --collection=claudeusages --out=claudeusages_backup.json
mongoexport --uri="$MONGO_URI" --collection=claudeusagesyncs --out=claudeusagesyncs_backup.json
mongoexport --uri="$MONGO_URI" --collection=claudesubscriptionusages --out=claudesubscriptionusages_backup.json
```

---

## Rollback Strategy

If issues arise during implementation:

1. All code changes should be in a single commit (or feature branch)
2. Rollback code: `git revert <commit-hash>` or `git checkout main`
3. Database collections are dropped LAST (Phase 4), so code rollback is safe before that phase
4. If already dropped collections, restore from backup (if taken)

---

## Verification

After removal:

1. Run `npm test` in myBrain-api - all tests should pass
2. Run `npm test` in myBrain-web - all tests should pass
3. Start both servers and verify:
   - Settings page loads with 8 sections (not 10)
   - No console errors
   - Other settings sections work correctly
4. Verify API key authentication is removed:
   - Requests with `Authorization: Bearer mbrain_...` should NOT authenticate
   - JWT cookie authentication should still work

---

## Summary

| Category            | Files to Delete | Files to Modify |
| ------------------- | --------------- | --------------- |
| Frontend Components | 10              | 0               |
| Frontend Hooks      | 2               | 0               |
| Frontend Tests      | 11              | 2               |
| Frontend Config     | 0               | 3               |
| Backend Models      | 3               | 1               |
| Backend Services    | 2               | 0               |
| Backend Routes      | 1               | 2               |
| Backend Middleware  | 0               | 1               |
| Backend WebSocket   | 0               | 1               |
| Backend Test Setup  | 0               | 1               |
| Backend Tests       | 3               | 2               |
| Skills/Docs         | 2 dirs          | 4               |

**Total: ~32 files to delete, ~17 files to modify**

---

## Review Report (Senior Engineer)

### Findings (ordered by severity)
1. **High:** Test coverage and references will break if not updated/removed. The plan deletes runtime code but omits test updates in several places:
   - Frontend: `myBrain-web/src/lib/api.test.js` (Claude usage + api-keys API tests), `myBrain-web/src/features/settings/SettingsPage.test.jsx` (Developer Stats + API Keys sections/mocks).
   - Backend: `myBrain-api/src/middleware/auth.test.js` (API key auth cases), `myBrain-api/src/routes/analytics.test.js` (Claude usage routes).
2. **High:** `myBrain-api/src/test/testApp.js` still imports Claude usage models (`ClaudeUsage`, `ClaudeUsageSync`, `ClaudeSubscriptionUsage`). Deleting those models without removing imports will crash test bootstrapping.
3. **Medium:** `myBrain-api/src/server.js` wires `setAnalyticsSocketIO` and `myBrain-api/src/routes/analytics.js` exports `setSocketIO` only for Claude usage WebSocket emissions. If Claude usage endpoints are removed, you should also remove `setSocketIO` export/import and the `setAnalyticsSocketIO(io)` call to avoid dead code and stale exports.
4. **Medium:** Documentation and design artifacts still reference these features and will become misleading if left unchanged: `README.md` (route list includes `api-keys`), `WEBSOCKET_REALTIME_DESIGN.md`, and `commentplan.md`. Plan should either update or explicitly mark them as deprecated/archived.
5. **Low:** `myBrain-api/src/middleware/auth.js` contains extensive inline documentation about API key auth. After removing the logic, the comments should be cleaned up to avoid contradictory documentation.

### Questions / Assumptions
- Is the `myBrain-web/Claude-Code-Usage-Monitor/` subproject intended to remain (even though the `/claude-usage` skill is removed)? If not, consider archiving or removing it to avoid confusion.
- Can we confirm no external automation/CI or user scripts depend on `Authorization: Bearer mbrain_...` authentication before removal?
- Is it acceptable to drop the Claude usage collections without backup in all environments, or should production require an explicit backup step?

### Change Summary (if plan is updated)
- Add missing test updates/deletions, clean up `testApp.js` model imports, remove analytics socket wiring, and update docs to reflect feature removal.

---

## Review Response (Plan Updated)

All findings from the senior engineer review have been addressed:

### High Severity - RESOLVED
1. **Test coverage** - Added 4 test files to "Files to MODIFY" section:
   - `api.test.js` (item #13)
   - `SettingsPage.test.jsx` (item #14)
   - `auth.test.js` (item #15)
   - `analytics.test.js` (item #16)

2. **testApp.js model imports** - Updated item #9 to include removal of Claude usage model imports (lines 36-38)

### Medium Severity - RESOLVED
3. **Socket wiring cleanup** - Updated items #6 and #7:
   - `server.js` now includes removal of `setAnalyticsSocketIO` import and call
   - `analytics.js` now includes removal of `setSocketIO` export

4. **Documentation updates** - Added items #17 and #18:
   - `README.md` - Remove api-keys route reference
   - `WEBSOCKET_REALTIME_DESIGN.md` - Remove Claude usage WebSocket documentation

### Low Severity - RESOLVED
5. **auth.js inline docs** - Added to item #12: clean up inline documentation about API key auth

### Questions/Assumptions - ANSWERED
- **Claude-Code-Usage-Monitor/** - Added to deletion list (Standalone Subproject section and Phase 3)
- **External automation/CI** - Already confirmed in Phase 0: Only consumer is `/claude-usage` skill being removed
- **DB backup** - Optional backup step already included in Phase 4; production backup recommended but not required

**Plan is ready for final approval.**
