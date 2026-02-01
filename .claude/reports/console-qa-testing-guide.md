# Console QA Testing Guide
**Purpose:** Manual and automated testing procedures for console errors and network monitoring

---

## Quick Start

### Setup
1. Open DevTools: `F12`
2. Go to Console tab
3. Set filter: `All levels` (to see logs, warnings, errors)
4. Go to Network tab to monitor requests

### Test Account
- **Email:** claude-test-user@mybrain.test
- **Password:** ClaudeTest123

---

## Page-by-Page Testing

### 1. Login Page
**URL:** https://my-brain-gules.vercel.app/login

**Expected Console State:** Clean (no errors)

**Test Sequence:**
```
1. Clear console (Ctrl+L or via console API)
2. Observe initial console state
3. Fill email: claude-test-user@mybrain.test
4. Fill password: ClaudeTest123
5. Click "Sign In"
6. Note any console errors or warnings
7. Verify successful redirect to dashboard
```

**What to Check:**
- [ ] No JavaScript errors
- [ ] No failed resource loads (404, etc.)
- [ ] No CORS errors
- [ ] Network tab shows successful auth request

**Common Issues:**
- 401 Unauthorized - Invalid credentials
- 403 Forbidden - Account suspended
- Network timeout - Backend down
- CORS errors - Proxy misconfiguration

---

### 2. Dashboard Page
**URL:** https://my-brain-gules.vercel.app/dashboard

**Expected Console State:** Clean (possibly some widget loading messages)

**Test Sequence:**
```
1. Clear console after page loads
2. Wait for all widgets to render (2-3 seconds)
3. Check console for any initialization errors
4. Toggle theme (light/dark)
5. Scroll through dashboard
6. Click on various widgets
7. Observe console for any delayed errors
```

**What to Check:**
- [ ] Widget components render without errors
- [ ] Theme toggle works smoothly
- [ ] No React rendering errors
- [ ] No missing resources
- [ ] All API calls succeed (Network tab)

**Common Issues:**
- Widget crashes (check WidgetErrorBoundary)
- Missing theme variables
- API timeouts
- Image loading failures

---

### 3. Tasks Page
**URL:** https://my-brain-gules.vercel.app/tasks

**Expected Console State:** Clean during page load, errors only when actions fail

**Test Sequence:**
```
1. Clear console
2. Wait for task list to load
3. Scroll through list
4. Click "Create Task" button
5. Fill form and submit
6. Check console during submission
7. Edit an existing task
8. Delete a task
9. Note any errors at each step
```

**What to Check:**
- [ ] List loads without errors
- [ ] Create form opens without issues
- [ ] API request succeeds (POST)
- [ ] Success message appears
- [ ] Task appears in list
- [ ] Edit preserves data
- [ ] Delete works with confirmation

**Error Messages to Track:**
- "Failed to create task" → API error
- "Cannot update a component" → State management issue
- Missing task ID → Data validation error

---

### 4. Notes Page
**URL:** https://my-brain-gules.vercel.app/notes

**Test Sequence:**
```
1. Clear console
2. Load notes list
3. Create new note
4. Edit note title
5. Edit note content
6. Delete note
7. Monitor console at each step
```

**What to Check:**
- [ ] All CRUD operations work
- [ ] Error messages are clear
- [ ] No console spam
- [ ] API responses are timely

---

### 5. Projects Page
**URL:** https://my-brain-gules.vercel.app/projects

**Test Sequence:**
```
1. Clear console
2. Load projects
3. Create project
4. Edit project
5. Add project member (if available)
6. Delete project
```

**What to Check:**
- [ ] Project operations succeed
- [ ] Member operations handled correctly
- [ ] Error handling for duplicate names
- [ ] Cascading delete warnings

---

### 6. Calendar Page
**URL:** https://my-brain-gules.vercel.app/calendar

**Test Sequence:**
```
1. Clear console
2. Navigate between months
3. Add event
4. Click event to view details
5. Edit event
6. Delete event
7. Check different views (month/week/day if available)
```

**What to Check:**
- [ ] Calendar renders correctly
- [ ] Event creation works
- [ ] Date picker handles edge cases
- [ ] Time selection works

---

### 7. Settings Page
**URL:** https://my-brain-gules.vercel.app/settings

**Test Sequence:**
```
1. Clear console
2. Load settings
3. Toggle each setting
4. Wait for auto-save
5. Refresh page
6. Verify settings persisted
```

**What to Check:**
- [ ] Settings save without errors
- [ ] Changes reflect immediately
- [ ] No network errors
- [ ] Persistence verified after refresh

---

### 8. Profile Page
**URL:** https://my-brain-gules.vercel.app/profile

**Test Sequence:**
```
1. Clear console
2. Load profile
3. Edit profile information
4. Upload profile picture (if available)
5. Change password
6. Save changes
```

**What to Check:**
- [ ] Profile data loads correctly
- [ ] Edits are validated
- [ ] Upload succeeds
- [ ] No exposure of sensitive data in logs

---

### 9. Theme Toggle
**Location:** Any page with theme toggle

**Test Sequence:**
```
1. Open DevTools Console
2. Find theme toggle button (usually top-right)
3. Click to toggle dark/light
4. Observe console for errors
5. Verify CSS variables update
6. Refresh page
7. Verify theme persisted
```

**What to Check:**
- [ ] No errors on toggle
- [ ] DOM updates correctly
- [ ] CSS variables apply
- [ ] Local storage saves
- [ ] Theme persists across sessions

---

## Network Monitoring

### Using Network Tab

**Setup:**
1. Open DevTools → Network tab
2. Set throttling to "Fast 3G" (optional, for real-world testing)
3. Enable "Preserve log" checkbox
4. Proceed with testing

**What to Monitor:**
- Request type (XHR, Fetch, img, css, js)
- Status code (200, 401, 403, 404, 500)
- Response time
- Request size vs Response size

### Common Network Issues

| Issue | Indicator | Solution |
|-------|-----------|----------|
| Failed auth | 401 responses | Check auth token |
| Permission denied | 403 responses | Check user role |
| Missing endpoint | 404 responses | Check API routes |
| Server error | 500 responses | Check backend logs |
| Slow requests | >3 seconds | Check network/server load |
| Blocked requests | Red responses | Check CORS headers |

---

## Error Categories

### Critical Errors (Stop & Report)
- Uncaught JavaScript exceptions
- React rendering failures
- Authentication failures (not from bad credentials)
- Data loss or corruption
- Security warnings

### Warnings (Monitor)
- Deprecation warnings
- Performance warnings
- Missing dependencies
- Unhandled promise rejections

### Info (Document)
- Debug logs
- Performance metrics
- Event logs

---

## Console Filtering

### By Severity
- **Errors:** Console → Error filter
- **Warnings:** Console → Warning filter
- **Info:** Console → Info filter
- **Verbose:** Console → Verbose filter

### By Source
- **Frontend:** Look for `/assets/index-*.js` in source
- **Backend:** API responses shown in Network tab
- **Third-party:** Look for domain names (googleapis.com, etc.)

---

## Recording Errors

### Template for Documenting Errors

```markdown
## Error: [Error Message]

**Page:** [URL where it occurred]
**Trigger:** [Action that caused it]
**Frequency:** [Always / Sometimes / Random]
**Severity:** [Critical / High / Medium / Low]

**Full Message:**
[Complete error text from console]

**Stack Trace:**
[If available]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Network Calls:**
[Any failed API calls visible in Network tab]

**Screenshots:**
[If applicable]
```

---

## Automated Testing

### Using agent-browser

**Installation:**
```bash
npm install -g agent-browser
agent-browser install
```

**Basic Commands:**
```bash
# Navigate to page
agent-browser open "https://my-brain-gules.vercel.app/login"

# Check console output
agent-browser console

# Check for uncaught errors
agent-browser errors

# Check network requests
agent-browser network requests

# Take screenshot
agent-browser screenshot

# Check specific element
agent-browser snapshot -i
```

**Script Example:**
```bash
#!/bin/bash
agent-browser open "https://my-brain-gules.vercel.app/login"
sleep 2
agent-browser console
agent-browser errors
```

---

## Performance Metrics

### Acceptable Ranges

| Metric | Acceptable | Warning | Critical |
|--------|-----------|---------|----------|
| Page Load | < 2s | 2-5s | > 5s |
| API Response | < 500ms | 500ms-2s | > 2s |
| JavaScript Parse | < 300ms | 300-500ms | > 500ms |
| CSS Paint | < 200ms | 200-400ms | > 400ms |

### Monitoring Tools
- Chrome DevTools → Performance tab
- Lighthouse audit (built-in)
- Performance API in console

---

## Checklist

### Before Testing
- [ ] Clear browser cache (optional)
- [ ] Close other tabs using the app
- [ ] Close browser extensions (except DevTools)
- [ ] Have test account credentials
- [ ] Have a way to record findings

### During Testing
- [ ] Take screenshots of errors
- [ ] Note exact steps to reproduce
- [ ] Check both light and dark modes
- [ ] Test on mobile (DevTools mobile mode)
- [ ] Try edge cases (empty states, large data sets)

### After Testing
- [ ] Document all errors found
- [ ] Categorize by severity
- [ ] Check if already reported
- [ ] Create test case for reproduction
- [ ] Assign to appropriate team member

---

## Troubleshooting Tips

### "DevTools closed error"
- Re-open DevTools with F12
- Refresh page (Ctrl+R)
- Check console again

### "No network requests visible"
- Reload page to see initial requests
- Enable "Preserve log"
- Check if API calls are XHR (not image/css)

### "Console is blank"
- Check if filter is set correctly
- Try typing in console: `console.log('test')`
- Reload page

### "Can't reproduce error"
- Try multiple times
- Try different browser
- Check different network speed
- Check if specific user data causes it

---

## Best Practices

1. **Test regularly** - After each feature release
2. **Be systematic** - Test every page in order
3. **Document everything** - Screenshot each error
4. **Isolate issues** - One variable at a time
5. **Check network** - Errors often originate there
6. **Test edge cases** - Empty states, max data, quick interactions
7. **Report clearly** - Include steps to reproduce

---

## Resources

- **Chrome DevTools:** [https://developer.chrome.com/docs/devtools/]
- **MDN Console API:** [https://developer.mozilla.org/en-US/docs/Web/API/Console]
- **React Error Boundaries:** [https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary]

---

**Last Updated:** 2026-01-31
**Reviewer:** Console QA Testing Agent
