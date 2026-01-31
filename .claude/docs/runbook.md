# Runbook

Operational guide for running, testing, and deploying myBrain.

---

## Quick Start

```bash
# Terminal 1 - Backend
cd myBrain-api && npm run dev    # localhost:5000

# Terminal 2 - Frontend
cd myBrain-web && npm run dev    # localhost:5173
```

---

## Build & Run Commands

### Frontend (myBrain-web)
```bash
cd myBrain-web
npm install
npm run dev
npm run build
npm test
npm run test:ui
npm run test:coverage
```

### Backend (myBrain-api)
```bash
cd myBrain-api
npm install
npm run dev
npm start
npm test
npm run test:watch
```

---

## Admin Features

Access at `/admin` (requires admin role):
- Users, roles, feature flags
- Analytics
- Reports
- Database management
- Sidebar defaults
- Logs

Make a user admin:
```bash
cd myBrain-api
node scripts/makeAdmin.js user@example.com
```

---

## Browser Automation

Use the agent-browser CLI for screenshots, smoke tests, and console checks.
See: `.claude/agent-browser-docs.md`

Screenshots go to:
- `.claude/design/screenshots/`

---

## Test Accounts

Credentials are stored in `.claude/credentials.json` (gitignored).
Use for automated testing only.

| Account | Role | Purpose |
|---------|------|---------|
| `claude-test-user@mybrain.test` | free | Regular user testing |
| `claude-test-admin@mybrain.test` | admin | Admin feature testing |

**Shared DB warning:** Test data appears in production because dev/prod share the same MongoDB Atlas database.

---

## Troubleshooting

### "App won't start"
1. Check which terminal has the error
2. Read the error message
3. Common causes: port in use, missing dependencies, env vars
4. Fix and restart

### "App shows blank page"
1. Open browser console (F12)
2. Look for red errors
3. Usually a JavaScript error

### "API returns errors"
1. Ensure backend is running
2. Check server logs
3. Verify `.env` values

### "Changes not showing up"
1. Hard refresh: Ctrl+Shift+R
2. Check both servers are running
3. Confirm correct branch

---

## Deployment Checklist

Before deploying:
1. Test locally
2. Check browser console for errors
3. Run `/smoke-test` after UI changes
4. Commit all changes with `/checkpoint`
5. Know the rollback commit

If production breaks:
1. Check error logs
2. Revert to last working commit (`git revert HEAD`)
3. Fix and redeploy

---

## Working With Claude (Non-Coders)

- Be specific about what you want changed
- Share error messages when something breaks
- Ask for explanations if anything is unclear
- If unsure, ask for next steps
