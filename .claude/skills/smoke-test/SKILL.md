---
name: smoke-test
description: Run automated browser tests to verify the app works. Tests login, dashboard, and key pages.
---

You are a QA engineer running automated smoke tests on the myBrain application using agent-browser.

## Your Task

Run a quick smoke test to verify the application is working. Check for:
1. App loads without errors
2. Login works with test account
3. Dashboard renders correctly
4. No console errors

## Configuration

**Browser command prefix:**
```bash
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude
```

**Test credentials:** Read from `.claude/credentials.json`

**Environments:**
- Dev: `http://localhost:5173` (default)
- Prod: `https://my-brain-gules.vercel.app/`

## Process

### 1. Determine Environment

If user says "prod" or "production", use production URL. Otherwise use localhost.

Check if servers are running (for dev):
```bash
curl -s http://localhost:5173 > /dev/null && echo "Frontend OK" || echo "Frontend not running"
curl -s http://localhost:5000 > /dev/null && echo "Backend OK" || echo "Backend not running"
```

### 2. Open Browser and Login

```bash
# Open login page
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude open [URL]/login

# Get form fields
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude snapshot -i

# Fill and submit (using test user credentials)
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude fill @e1 "claude-test-user@mybrain.test"
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude fill @e2 "ClaudeTest123"
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude click @e3
```

### 3. Verify Dashboard Loads

```bash
# Wait and check URL
sleep 2
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude get url

# Check for errors in console
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude console
```

Look for:
- URL should be `/app` (dashboard)
- Console should NOT have red `[error]` entries (warnings are OK)
- If "Something went wrong" appears, the test FAILED

### 4. Screenshot Dashboard

Follow the screenshot naming convention in `.claude/rules/screenshots.md`. Use the `verify/smoke/` folder:

```bash
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude screenshot "/c/Users/NewAdmin/Desktop/PROJECTS/myBrain/.claude/design/screenshots/verify/smoke/[YYYY-MM-DD]-dashboard.png"
```

Example: `verify/smoke/2026-01-31-dashboard.png`

### 5. Test Key Pages (Optional)

If user wants thorough testing, also check:
- `/app/tasks` - Tasks page
- `/app/notes` - Notes page
- `/app/projects` - Projects page

### 6. Close Browser

```bash
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude close
```

### 7. Report Results

Summarize:

```
Smoke Test Results
==================
Environment: [dev/prod]
Date: [date]

Login:      [PASS/FAIL]
Dashboard:  [PASS/FAIL]
Console:    [X errors / clean]

Screenshot: .claude/design/screenshots/verify/smoke/[YYYY-MM-DD]-dashboard.png

[Any issues found]
```

## If Tests Fail

1. **Login fails**: Check if servers are running, check credentials
2. **Dashboard error**: Expand "Error details", report the error message
3. **Console errors**: List the errors, suggest investigation
4. **Network errors**: Check backend connection

## Arguments

- No args: Test dev environment (localhost)
- `prod`: Test production environment
- `thorough`: Test all key pages, not just dashboard
