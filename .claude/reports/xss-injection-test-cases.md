# XSS & Injection Test Cases - Detailed Testing Guide

**Status:** Ready for Execution via agent-browser
**Session:** xss-qa
**Test Account:** e2e-test-1769287518446@mybrain.test / ClaudeTest123

---

## Test Payloads Reference

### Basic XSS Payloads
```
Payload 1 (Script Alert):      <script>alert('XSS')</script>
Payload 2 (Image onerror):     <img src=x onerror=alert('XSS')>
Payload 3 (SVG onload):        <svg onload=alert('XSS')>
Payload 4 (JavaScript URL):    javascript:alert('XSS')
Payload 5 (Body onload):       <body onload=alert('XSS')>
```

### Event Handler Payloads
```
Payload 6 (Mouseover):         " onmouseover="alert('XSS')
Payload 7 (Focus):             ' onfocus='alert('XSS')
Payload 8 (Input autofocus):   <input onfocus=alert('XSS') autofocus>
Payload 9 (Marquee):           <marquee onstart=alert('XSS')>
```

### Encoded Payloads
```
Payload 10 (HTML entity):      &lt;script&gt;alert('XSS')&lt;/script&gt;
Payload 11 (Numeric entity):   &#60;script&#62;alert('XSS')&#60;/script&#62;
Payload 12 (URL encoded):      %3Cscript%3Ealert('XSS')%3C/script%3E
```

### Attribute Injection Payloads
```
Payload 13 (Double quote break): "><script>alert('XSS')</script>
Payload 14 (Single quote break):  '><script>alert('XSS')</script>
Payload 15 (Img src break):       "><img src=x onerror=alert('XSS')>
```

### SQL/NoSQL Injection Payloads
```
Payload 16 (SQL OR):           ' OR '1'='1
Payload 17 (SQL Comment):      '; DROP TABLE users; --
Payload 18 (NoSQL $ne):        {$ne: null}
Payload 19 (NoSQL $gt):        {$gt: ""}
```

---

## Test Case 1: Task Creation with XSS Payloads

### Preconditions
- User is logged in to myBrain application
- Dashboard or Tasks page is loaded
- "Create Task" modal is available

### Test Steps

#### 1.1 Basic Script Injection in Task Title
```
1. Click "Create Task" or "Add Task" button
2. In Title field, type: <script>alert('XSS')</script>
3. Leave description empty
4. Click "Save" or "Create"
5. Observe the task list - verify title displays as literal text
6. Check browser console (F12 → Console tab)
   - Expected: No JavaScript alert appears
   - Expected: No console errors
   - Expected: Script tag visible as plain text
```

**Verification:**
- [ ] Title displays as: `<script>alert('XSS')</script>` (literal text)
- [ ] No alert dialog appears
- [ ] Browser console shows no errors
- [ ] Refresh page and verify payload is still safe

#### 1.2 Image onerror in Task Title
```
1. Create new task
2. In Title field, type: <img src=x onerror="alert('XSS')">
3. Save task
4. Check if alert appears
5. Check page source (right-click → View Page Source)
   - Search for the payload
   - Verify it's HTML-escaped, not raw HTML
```

**Verification:**
- [ ] No alert appears
- [ ] Page source shows escaped content: `&lt;img src=x...` or similar
- [ ] Title displays as text in UI

#### 1.3 Event Handler in Task Description
```
1. Create new task
2. In Description field, type: " onmouseover="alert('XSS')
3. Click to close the input (blur it)
4. Hover your mouse over the task in the list
5. Check if alert appears
```

**Verification:**
- [ ] No alert on mouseover
- [ ] Payload displays as literal text
- [ ] No event handlers are active

---

## Test Case 2: Note Creation with XSS Payloads

### Preconditions
- User is logged in
- Notes feature is accessible
- Create note modal/form is available

### Test Steps

#### 2.1 Script Injection in Note Title
```
1. Navigate to Notes section
2. Click "Create Note" or "New Note"
3. In Title field, enter: <script>alert('From Title')</script>
4. Leave body empty
5. Click "Save"
6. Check browser console
```

**Verification:**
- [ ] No alert appears
- [ ] Note title shows as text: `<script>alert('From Title')</script>`
- [ ] Console is clean

#### 2.2 Complex Payload in Note Body
```
1. Create new note
2. In Body field, enter: <svg><script>alert('SVG Attack')</script></svg>
3. Save note
4. Open note to view full content
5. Check browser console
```

**Verification:**
- [ ] No alert appears
- [ ] SVG tags are either stripped or escaped
- [ ] Content displays safely

#### 2.3 Rich Text with Event Handler
```
1. Create new note
2. In Body, try to add formatted text with event handler:
   <b onclick="alert('clicked')">Click me</b>
3. Save and reload
4. Click on the bold text
5. Verify no alert appears
```

**Verification:**
- [ ] No alert on click
- [ ] Text displays but onclick is not functional
- [ ] Formatting is preserved (if supported)

---

## Test Case 3: Profile Field Injection

### Preconditions
- User is logged in
- Settings or Profile page is accessible

### Test Steps

#### 3.1 Display Name with Injection
```
1. Navigate to Settings → Profile or Account Settings
2. Find "Display Name" field
3. Clear current name and enter: <script>alert('Profile XSS')</script>
4. Click "Save" or "Update"
5. Check browser console
6. Reload the page and verify saved value
```

**Verification:**
- [ ] No alert appears during save
- [ ] Name displays as: `<script>alert('Profile XSS')</script>`
- [ ] Payload persists after reload (safe persistence)

#### 3.2 Bio Field with HTML Payload
```
1. Navigate to Settings → Profile
2. Find "Bio" or "About Me" field
3. Enter: <img src=invalid onerror="alert('Bio XSS')">
4. Save profile
5. Navigate to profile view page
6. Check if alert appears
```

**Verification:**
- [ ] No alert in settings
- [ ] No alert on profile view
- [ ] Payload displays as text
- [ ] Image tag is escaped/removed

#### 3.3 Location Field with Special Characters
```
1. Navigate to Settings → Profile
2. Find "Location" field
3. Enter: <style>body { display:none; }</style>NYC
4. Save
5. Check if page rendering changes
```

**Verification:**
- [ ] Page renders normally (style tag doesn't hide content)
- [ ] Location displays with style tag as text
- [ ] No CSS injection occurs

---

## Test Case 4: Search and Filtering with Injection

### Preconditions
- Notes/Tasks exist with searchable content
- Search functionality is available

### Test Steps

#### 4.1 Search Query with Regex Payload
```
1. Navigate to search feature (if available)
2. In search box, enter: .*+?search.*|.*
3. Press Enter to search
4. Check browser console for errors
5. Verify search executes without hanging
```

**Verification:**
- [ ] Search completes (doesn't hang/timeout)
- [ ] No ReDoS attack is successful
- [ ] Results display normally or "no results" message

#### 4.2 Search with Script Tag
```
1. Use search feature
2. Enter: <script>alert('Search XSS')</script>
3. Press Enter
4. Check if alert appears
```

**Verification:**
- [ ] No alert
- [ ] Search treats payload as literal search term
- [ ] No results found (expected)

---

## Test Case 5: URL Parameter Testing

### Preconditions
- Application URLs are accessible
- Browser console is open (F12)

### Test Steps

#### 5.1 Query Parameter XSS
```
1. Current URL: https://my-brain-gules.vercel.app/tasks
2. Modify URL to: https://my-brain-gules.vercel.app/tasks?search=<script>alert('URL XSS')</script>
3. Press Enter to navigate
4. Check browser console and page
```

**Verification:**
- [ ] No alert appears
- [ ] Page loads normally
- [ ] Parameter is URL-encoded if displayed

#### 5.2 ID Parameter Injection
```
1. Navigate to any resource detail page (e.g., /notes/:id)
2. Note the ID in URL
3. Change URL to inject: /notes/<script>alert('ID XSS')</script>
4. Press Enter
5. Verify page behavior
```

**Verification:**
- [ ] No alert
- [ ] 404 error or safe handling
- [ ] No unvalidated redirect

---

## Test Case 6: Data Persistence and Reload

### For Each Payload Entered

```
Test Flow:
1. Enter payload in field (as described above)
2. Save/Submit
3. Reload page (Ctrl+R)
4. Verify payload displays as safe text
5. Verify page works normally
6. Verify no alerts appear on reload
```

---

## Verification Checklist - All Tests

For **each test case**, verify:

### No Alert Execution
- [ ] No alert dialog appears at any point
- [ ] No confirmation dialog appears
- [ ] No error dialog appears

### No Console Errors
- [ ] Open browser DevTools (F12)
- [ ] Switch to Console tab
- [ ] Verify no red error messages
- [ ] Verify no uncaught exceptions

### Safe Display
- [ ] Payload displays as literal text in UI
- [ ] Special characters are escaped or removed
- [ ] HTML/JavaScript tags don't execute

### Persistence
- [ ] After saving, reload the page
- [ ] Payload still displays safely
- [ ] No alert on reload

### Page Functionality
- [ ] Application remains functional
- [ ] No broken features or UI
- [ ] Navigation works normally
- [ ] Other content displays correctly

---

## Evidence Collection

For each test, document:

1. **Screenshot** of the input field with payload
2. **Screenshot** of saved content showing safe display
3. **Browser Console** output (if any errors/warnings)
4. **Page Source** showing escaped content (View Page Source)
5. **Network Tab** showing API response with escaped payload

---

## Expected Results Summary

| Payload | Location | Expected Result | Severity If Failed |
|---------|----------|-----------------|-------------------|
| `<script>` | Task Title | Text display, no execution | CRITICAL |
| `<img onerror>` | Note Body | Text display, no event | CRITICAL |
| Event handler | Profile Bio | Text display, no execution | CRITICAL |
| Regex attack | Search box | Completes, no hang | HIGH |
| URL encoded | URL param | Safe URL encoding | HIGH |
| SQL injection | Search | Treated as literal | MEDIUM |
| NoSQL injection | API calls | Parameterized queries | MEDIUM |

---

## Test Execution Order

**Recommended sequence** (from most to least visible):

1. Task Fields (Test Case 1)
2. Note Fields (Test Case 2)
3. Profile Fields (Test Case 3)
4. Search (Test Case 4)
5. URL Parameters (Test Case 5)
6. Verification and Reload (Test Case 6)

**Estimated Time:** 45-60 minutes for comprehensive testing

---

## Notes for Testers

- **Expect Success:** Based on code review, application should safely handle all payloads
- **Document Everything:** Take screenshots at each step for report
- **Test Multiple Times:** Some attacks may require specific conditions
- **Check Network:** Look at API responses in Network tab for unescaped payloads
- **Test Loaded Pages:** Some XSS may be stored and appear later, not immediately

---

## Command Reference for Manual Testing

### Browser DevTools
```
F12                   - Open DevTools
Ctrl+Shift+I          - Open DevTools (alternative)
Console tab           - View JavaScript console
Network tab           - View API requests/responses
Right-click → Inspect - Inspect element
```

### Check Escaping
```
Right-click page → View Page Source
Search for your payload
Verify it shows escaped (< becomes &lt;, etc.)
```

---

*Document Version: 1.0*
*Created: 2026-01-31*
*Test Coverage: XSS (13 payloads) + SQL/NoSQL Injection (4 payloads)*
