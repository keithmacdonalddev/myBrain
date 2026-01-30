# Implementation Remediation Plan Review

Plan: `.claude/plans/implementation-remediation-plan.md`
Review date: 2026-01-30
Reviewer: Codex (senior engineer)

## Scope
- API: auth, messages, itemShares/shares, error handling, upload, connections, users, project/note/task services
- Web: routing, messages, social, notes/tasks, API client, UI base modal
- UI/UX: agent-browser review of `dashboard-screenshot.png` and `dashboard-screenshot2.png` (static screenshots)

## Findings (ordered by severity)

### Critical
1) Global rate limiting would be a no-op.
   - Plan uses `app.use('/api', globalLimiter)` but routes are mounted at `/auth`, `/notes`, `/tasks`, etc.
   - File: `myBrain-api/src/server.js:289-314`
   - Risk: false sense of protection; limiter never runs.
   - Recommendation: apply limiter before routes at `/` (with explicit skips) or wrap each router.

2) Password-protected share brute-force protection targets a nonexistent endpoint.
   - Plan uses `POST /item-shares/:token/verify-password` but actual endpoints are `GET /item-shares/token/:token` and `POST /share/:token/verify`.
   - Files: `myBrain-api/src/routes/itemShares.js:1913`, `myBrain-api/src/routes/shares.js:301`
   - Risk: no protection on real endpoints.
   - Recommendation: attach rate limiting to `POST /share/:token/verify` and optionally to `/item-shares/token/:token`.

3) JWT secret fallback removal is incomplete.
   - Plan updates only `middleware/auth.js`, but fallback also exists in `routes/auth.js` and `websocket/index.js`.
   - Files: `myBrain-api/src/middleware/auth.js:84`, `myBrain-api/src/routes/auth.js:173`, `myBrain-api/src/websocket/index.js:156`
   - Risk: tokens may still be signed/verified with a default secret in production; WS auth still accepts default.
   - Recommendation: centralize secret loading and fail fast across all modules.

### High
4) Error handling standardization duplicates existing AppError and would break current error format/tests.
   - `AppError` already exists in `errorHandler.js`, and responses include `requestId` used by logging/tests.
   - Files: `myBrain-api/src/middleware/errorHandler.js:266,429`, `myBrain-api/src/middleware/errorHandler.test.js`
   - Risk: dropping `requestId` and replacing helpers will break tests and operational logging.
   - Recommendation: reuse existing AppError and migrate routes to throw/next while preserving requestId.

5) ReDoS sanitization scope is misplaced; the risky regex is in user search, not notes/tasks/projects.
   - Notes/Tasks/Projects use `$text`; messages fallback regex already escapes input.
   - User search uses `$regex` with unsanitized input.
   - Files: `myBrain-api/src/models/Note.js:376`, `Task.js:492`, `Project.js:706`, `myBrain-api/src/routes/messages.js:1972/1983`, `myBrain-api/src/routes/users.js:245-248`
   - Risk: ReDoS exposure remains in `/users/search` (and admin search).
   - Recommendation: escape regex in user/admin search rather than adding sanitize to already-safe endpoints.

6) Test connection seed script uses wrong field names and bypasses stats.
   - Connection schema uses `requesterId/addresseeId`, not `requester/addressee`.
   - socialStats.connectionCount is updated on accept in routes; direct inserts skip this.
   - File: `myBrain-api/src/models/Connection.js`
   - Risk: connections will not show up correctly; counts/mutuals wrong.
   - Recommendation: use correct fields and update socialStats (or call model helpers).

7) Test profile population script writes wrong field paths.
   - Profile fields live under `profile.*`, not top-level.
   - File: `myBrain-api/src/models/User.js`
   - Risk: UI still shows "User" / "??" after running the script.
   - Recommendation: update `profile.firstName`, `profile.lastName`, `profile.displayName`, `profile.bio`.

8) API data extraction standardization impacts tests/components not listed.
   - `connectionsApi`/`messagesApi` currently return axios responses; hooks/components/tests destructure `.data`.
   - Plan only mentions hooks, not tests or component usage.
   - Files: `myBrain-web/src/lib/api.js:936,1065`, `myBrain-web/src/features/messages/components/NewConversationModal.jsx:21`, `myBrain-web/src/features/social/components/ShareModal.jsx`, `myBrain-web/src/lib/api.test.js`, `myBrain-web/src/features/social/hooks/useConnections.test.jsx`
   - Risk: widespread runtime/test failures.
   - Recommendation: include test updates and component usage audit in plan.

### Medium
9) /notes 404 fix is likely incorrect; app routes are nested under /app.
   - /app/notes is the intended path; /notes is not defined.
   - File: `myBrain-web/src/app/App.jsx:160`
   - Risk: adding /notes could bypass `ProtectedRoute` and `AppShell`.
   - Recommendation: add redirect `/notes -> /app/notes` if desired.

10) Messages routes placeholder fix will not affect runtime.
   - `features/messages/routes.jsx` is not used; `MessagesPage` is wired directly.
   - Files: `myBrain-web/src/app/App.jsx:30,219`, `myBrain-web/src/features/messages/routes.jsx:3-18`
   - Recommendation: either wire it in, or remove placeholder and update plan.

11) Forgot password link lacks supporting route/back-end flow.
   - No `/forgot-password` route in `App.jsx`; auth routes do not implement reset endpoints.
   - Files: `myBrain-web/src/features/auth/LoginPage.jsx`, `myBrain-web/src/app/App.jsx`, `myBrain-api/src/routes/auth.js`
   - Risk: link would 404; incomplete feature.
   - Recommendation: add end-to-end reset flow or omit link.

12) BaseModal does not implement a true focus trap.
   - Only sets initial focus; does not cycle or prevent focus from leaving.
   - File: `myBrain-web/src/components/ui/BaseModal.jsx:69-75`
   - Recommendation: enhance BaseModal or use a focus-trap helper if this is a goal.

13) Error state handling already exists for some pages.
   - Notes and Tasks pages include error fallbacks.
   - Files: `myBrain-web/src/features/notes/routes.jsx` (NotesGrid), `myBrain-web/src/features/tasks/components/TasksList.jsx`
   - Recommendation: update plan to focus on pages missing error states (SharedWithMe, MyShares, Messages).

14) Upload magic-number validation cannot run in Multer fileFilter.
   - fileFilter only sees metadata; buffer is available after upload.
   - File: `myBrain-api/src/middleware/upload.js`
   - Recommendation: validate in routes after upload using `req.file.buffer`.

15) Backlinks pagination alone does not fix N+1.
   - `getNoteBacklinks` and `getTaskBacklinks` fetch each source individually.
   - Files: `myBrain-api/src/services/noteService.js`, `myBrain-api/src/services/taskService.js:779+`
   - Recommendation: batch by sourceType using `$in` or aggregation.

16) Project "N+1" fix is mischaracterized.
   - `getProjectById` uses a fixed set of parallel queries, not N+1.
   - File: `myBrain-api/src/services/projectService.js`
   - Recommendation: treat as optional performance optimization, not critical.

### Low
17) stripHtmlForPreview XSS severity is overstated.
   - Uses a detached element; no DOM insertion.
   - File: `myBrain-web/src/lib/utils.js:143`
   - Recommendation: consider DOMPurify only if threat model requires it.

18) DefaultAvatar uses dangerouslySetInnerHTML but SVG is static.
   - File: `myBrain-web/src/components/ui/DefaultAvatar.jsx:177,213`
   - Recommendation: keep or sanitize as defense-in-depth.

19) People You May Know display likely a data issue, not UI bug.
   - API returns email/profile fields; UI uses `getDisplayName` fallback.
   - Files: `myBrain-api/src/routes/connections.js`, `myBrain-web/src/features/social/components/SuggestedConnections.jsx`, `myBrain-web/src/components/ui/UserAvatar.jsx`
   - Recommendation: fix seed/test data first; UI fallback already exists.

## Open Questions / Assumptions
- Is `/notes` intended to be a shortcut to `/app/notes`, or should it remain 404 to enforce the AppShell?
- Should brute-force protection apply to both `/share/*` and `/item-shares/*` password flows?
- Should blocked users be prevented from sending messages in existing conversations (currently only enforced at conversation creation)?
- Are the `@mybrain.test` accounts referenced in the plan already present, or should we align with `scripts/seedMockUsers.js`?

## UI/UX Review (agent browser)
- Reviewed `dashboard-screenshot.png` and `dashboard-screenshot2.png` with agent-browser.
- No interactive UI was available to inspect; static screenshots only.

## Plan Adjustment Summary
- Correct endpoint paths and route prefix assumptions (rate limits, messages, share verification).
- Re-scope security work to actual risk (user search regex, JWT secret in all modules).
- Fix data scripts to align with schema (profile fields, connection fields, stats updates).
- Expand API data standardization to include tests/components.
- Focus UI/UX work on gaps (error states, ARIA labels, real focus trap).
