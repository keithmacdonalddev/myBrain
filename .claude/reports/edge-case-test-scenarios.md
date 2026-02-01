# Edge Case Testing Scenarios
**Detailed Test Cases with Step-by-Step Instructions**

---

## How to Use This Document

Each test case includes:
1. **Scenario Name** - What's being tested
2. **Risk Level** - CRITICAL / MEDIUM / LOW
3. **Affected Fields** - Where to test
4. **Test Steps** - Exact steps to reproduce
5. **Expected Result** - What should happen
6. **Pass Criteria** - How to know it passed
7. **Evidence** - What to capture

---

## Test Case 1: XSS via Script Tag

**Risk Level:** 🔴 CRITICAL
**Category:** Security - HTML Injection
**Affected Fields:** Task title, Task description, Note title, Note content, Message content

### Test Steps:

1. Log into test account
2. Navigate to "Create Task" form
3. Click on "Task Title" field
4. Type or paste: `<script>alert('XSS')</script>`
5. Click away from field (blur event)
6. Check browser console (F12 → Console tab)
7. Look for any JavaScript alert dialog
8. Submit the form
9. Reload the page
10. Check if the text displays as literal string

### Expected Result:
- No alert dialog appears (script doesn't execute)
- Text displays as literal: `<script>alert('XSS')</script>`
- Browser console shows NO errors
- In database, stored safely as escaped text

### Pass Criteria:
✅ PASS if:
- No alert dialog appears
- Text is visible as literal string
- No JavaScript errors in console

❌ FAIL if:
- Alert dialog appears (XSS vulnerability)
- Text is missing or mangled
- JavaScript errors in console

### Evidence to Capture:
1. Screenshot of task creation form with XSS input
2. Screenshot after form submission (text should be literal)
3. Console log (F12 → Console) showing no errors
4. Screenshot of saved task showing literal text

---

## Test Case 2: XSS via HTML Entities

**Risk Level:** 🔴 CRITICAL
**Category:** Security - HTML Entity Injection
**Affected Fields:** All text input fields

### Test Steps:

1. Open Create Task form
2. Click Task Title field
3. Type: `&lt;script&gt;alert('XSS')&lt;/script&gt;`
4. Submit form
5. View the saved task
6. Check if entities are displayed literally or decoded

### Expected Result:
- Text displays literally as: `&lt;script&gt;alert('XSS')&lt;/script&gt;`
- Not rendered as: `<script>alert('XSS')</script>`
- No script execution

### Pass Criteria:
✅ PASS if:
- Text displays with entity characters visible
- No alert dialog appears
- Text is safe to view

❌ FAIL if:
- Text is decoded and rendered as HTML tags
- Script executes
- Text looks suspicious

### Evidence:
1. Screenshot of input
2. Screenshot of saved result
3. Inspect element (F12 → Inspector) showing HTML structure

---

## Test Case 3: XSS via Event Handler

**Risk Level:** 🔴 CRITICAL
**Category:** Security - Event Handler Injection
**Affected Fields:** All text fields

### Test Steps:

1. Open Create Task form
2. Click Task Title field
3. Type: `<img src=x onerror=alert('XSS')>`
4. Submit form
5. Check if alert appears
6. Reload page and verify text

### Expected Result:
- No alert dialog appears
- Text displays safely as literal string
- No images loaded with error handlers

### Pass Criteria:
✅ PASS if: No alert appears, text is literal
❌ FAIL if: Alert appears, indicating XSS vulnerability

### Evidence:
1. Screenshot before submission
2. Screenshot after submission
3. Screenshot of saved text

---

## Test Case 4: XSS via JavaScript URL

**Risk Level:** 🔴 CRITICAL
**Category:** Security - URL Injection
**Affected Fields:** Project links, message links

### Test Steps:

1. Open Create Project form
2. Go to "Links" section
3. Click "Add Link" button
4. Enter URL: `javascript:alert('XSS')`
5. Submit form
6. Click the link in the saved project
7. Check if alert appears

### Expected Result:
- Either: Link is rejected with error message
- Or: Link is saved but doesn't execute JavaScript when clicked
- Text displays as literal string

### Pass Criteria:
✅ PASS if:
- Link is rejected with validation error, OR
- Link is saved but clicking it doesn't execute script

❌ FAIL if:
- Alert dialog appears when clicking link
- Indicates XSS vulnerability

### Evidence:
1. Screenshot of link input form
2. Screenshot of error message (if rejected)
3. Screenshot showing link doesn't execute script

---

## Test Case 5: XSS via Data URL

**Risk Level:** 🔴 CRITICAL
**Category:** Security - Data URL Injection
**Affected Fields:** Project links

### Test Steps:

1. Open Create Project form
2. Click "Add Link" button
3. Enter: `data:text/html,<script>alert('XSS')</script>`
4. Try to submit
5. Check if data URL executes

### Expected Result:
- Data URL is rejected with error, OR
- Data URL is stored but sanitized

### Pass Criteria:
✅ PASS if: Link is rejected or doesn't execute
❌ FAIL if: Script executes

### Evidence:
Screenshot showing rejection or safe behavior

---

## Test Case 6: Text Truncation - 500 Characters

**Risk Level:** 🟡 MEDIUM
**Category:** Data Loss - Silent Truncation
**Affected Fields:** Task title, Note title, Project name

### Test Steps:

1. Generate 500-character string:
   ```
   AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA... (500 times)
   ```
2. Open Create Task form
3. Paste 500-char string into Task Title field
4. Check if any truncation indicator appears (visual truncation or message)
5. Submit form
6. Reload page
7. Check if full 500 characters are still there
8. Copy the title text
9. Count characters in clipboard

### Expected Result:
Either:
- A) Form shows error: "Title too long (max 255 chars)"
- B) Form shows truncation warning before submit
- C) Full 500 characters are accepted and stored

NOT acceptable:
- Silent truncation (saves 255 chars without telling user)
- Data loss without warning

### Pass Criteria:
✅ PASS if:
- Validation error shown, OR
- Full text accepted and verified in database

❌ FAIL if:
- Text is silently truncated
- User has no warning
- Data appears lost

### Evidence:
1. Screenshot of input form
2. Copy/paste text from saved field to verify length
3. Browser DevTools inspect element showing actual text

---

## Test Case 7: Whitespace-Only Title

**Risk Level:** 🟡 MEDIUM
**Category:** Validation - Empty Input
**Affected Fields:** Task title, Note title, Project name

### Test Steps:

1. Open Create Task form
2. Click Task Title field
3. Type: "     " (5 spaces)
4. Click elsewhere to blur
5. Try to submit form
6. Check for validation error message

### Expected Result:
- Validation error: "Title cannot be empty" or similar
- Form prevents submission
- Title field is highlighted in red

### Pass Criteria:
✅ PASS if: Validation error appears
❌ FAIL if: Form accepts and saves whitespace-only title

### Evidence:
1. Screenshot showing 5 spaces in field
2. Screenshot showing validation error message

---

## Test Case 8: Whitespace-Only with Tabs

**Risk Level:** 🟡 MEDIUM
**Category:** Validation - Tab Characters
**Affected Fields:** Task title, Note title

### Test Steps:

1. Click Task Title field
2. Type: "\t\t\t" (3 tabs)
3. Try to submit
4. Check for validation error

### Expected Result:
- Validation rejects tabs
- Trimmed version is either rejected or tabs are removed
- No whitespace-only items created

### Pass Criteria:
✅ PASS if: Form prevents submission
❌ FAIL if: Whitespace-only item created

### Evidence:
Screenshot of validation error

---

## Test Case 9: Performance - 100+ Tasks

**Risk Level:** 🟡 MEDIUM
**Category:** Performance - Data Scaling
**Affected Fields:** All list views

### Test Steps:

1. Log into test account
2. Open browser DevTools (F12)
3. Go to Performance tab
4. Create 100 new tasks rapidly:
   - Script:
   ```javascript
   for(let i = 0; i < 100; i++) {
     // Click add task button
     // Type: "Task " + i
     // Submit
     // Repeat
   }
   ```
5. Navigate to task list
6. Scroll through entire list (top to bottom)
7. Monitor frame rate in DevTools
8. Search for a task
9. Note any stuttering, lag, or crashes

### Expected Result:
- Scrolling remains smooth (60 FPS ideally)
- List loads quickly
- Search is responsive
- No crashes or white screen
- DevTools Performance shows no red flags

### Pass Criteria:
✅ PASS if:
- Scrolling is smooth
- List renders in <1 second
- Search responds within 500ms
- No crashes

❌ FAIL if:
- Scrolling is stuttered/janky
- List takes >3 seconds to load
- Search lags
- App crashes

### Evidence:
1. Screenshot showing 100+ tasks in list
2. Performance graph from DevTools
3. Frame rate measurements
4. Memory usage graph

---

## Test Case 10: Emoji Display

**Risk Level:** 🟢 LOW
**Category:** Rendering - Special Characters
**Affected Fields:** All text fields

### Test Steps:

1. Open Create Task form
2. Type: "🎉 Task with emoji 🔥 ✅ 🚀"
3. Submit form
4. View saved task
5. Check rendering on different screen sizes
6. Check on mobile view (responsive)

### Expected Result:
- All emojis display correctly
- No garbled characters
- Layout doesn't break
- Emojis don't overflow text

### Pass Criteria:
✅ PASS if: Emojis display cleanly
❌ FAIL if: Layout breaks or emojis look garbled

### Evidence:
1. Screenshot of task with emojis
2. Screenshot on mobile view
3. Screenshot showing no layout overflow

---

## Test Case 11: Unicode Display (Mixed Scripts)

**Risk Level:** 🟢 LOW
**Category:** Rendering - International Text
**Affected Fields:** All text fields

### Test Steps:

1. Create task with mixed scripts:
   "English 中文 العربية Ελληνικά 日本語"
2. Submit and view
3. Check rendering quality
4. Check alignment (Arabic should be RTL)

### Expected Result:
- All text displays correctly
- RTL text aligns from right to left
- No character corruption
- Layout doesn't break

### Pass Criteria:
✅ PASS if: All scripts display correctly
❌ FAIL if: Text is garbled or misaligned

### Evidence:
Screenshot showing mixed scripts rendered correctly

---

## Test Case 12: Single Character Input

**Risk Level:** 🟢 LOW
**Category:** Boundary - Minimum Length
**Affected Fields:** Task title, Note title

### Test Steps:

1. Open Create Task form
2. Type single character: "A"
3. Submit form
4. Verify it saves and displays

### Expected Result:
- Single character is accepted
- Displays correctly
- Searchable

### Pass Criteria:
✅ PASS if: Single char accepted and saved
❌ FAIL if: Form rejects single character

### Evidence:
Screenshot showing single-char task saved

---

## Test Case 13: Very Long Description (10,000+ chars)

**Risk Level:** 🟡 MEDIUM
**Category:** Text Length - Large Content
**Affected Fields:** Task description, Note content

### Test Steps:

1. Generate 10,000-character string
2. Open Create Task form
3. Paste into Description field
4. Submit
5. Reload page
6. Check if entire text is preserved
7. Monitor performance (page load time)

### Expected Result:
- Form accepts large text (or shows error)
- No data loss
- Page still loads reasonably fast (<2s)
- Editor doesn't lag

### Pass Criteria:
✅ PASS if:
- Large text accepted, OR clear error shown
- Full text saved if accepted
- Performance acceptable

❌ FAIL if:
- Silent truncation
- Page becomes very slow
- Editor lags when editing

### Evidence:
1. Screenshot of large text input
2. Page load time measurement
3. Verification of full text saved

---

## Test Case 14: Special Symbols

**Risk Level:** 🟡 MEDIUM
**Category:** Character Handling - Special Chars
**Affected Fields:** All text fields

### Test Steps:

1. Type: "!@#$%^&*()_+-=[]{}|;:'\",./<>?"
2. Submit task
3. Verify text displays correctly
4. Check database for proper escaping

### Expected Result:
- All symbols display
- No encoding issues
- Safe in database

### Pass Criteria:
✅ PASS if: All symbols preserved and displayed
❌ FAIL if: Some symbols disappear or corrupt

### Evidence:
Screenshot showing all symbols preserved

---

## Test Case 15: Date Boundary - Far Past

**Risk Level:** 🟢 LOW
**Category:** Date Input - Boundary
**Affected Fields:** Due date, Event date

### Test Steps:

1. Open Create Task form
2. Click Due Date field
3. Enter: 1900-01-01
4. Submit
5. Check if accepted or error shown

### Expected Result:
- Either: Error message "Date too far in past"
- Or: Accepted with warning
- Or: Accepted normally

### Pass Criteria:
✅ PASS if: Behavior is consistent and documented
❌ FAIL if: Crashes or shows unexpected error

### Evidence:
Screenshot of date input and result

---

## Test Case 16: Date Boundary - Invalid Date

**Risk Level:** 🟡 MEDIUM
**Category:** Date Validation - Invalid
**Affected Fields:** Due date, Event date

### Test Steps:

1. Try to enter: 2024-02-30 (invalid)
2. Check if calendar picker prevents this
3. If text input, check if error appears

### Expected Result:
- Validation rejects invalid date
- Error message shown: "Invalid date"
- User prevented from entering

### Pass Criteria:
✅ PASS if: Invalid date prevented
❌ FAIL if: Invalid date accepted

### Evidence:
Screenshot showing error or prevention

---

## Test Case 17: Leap Year Date

**Risk Level:** 🟢 LOW
**Category:** Date Handling - Leap Year
**Affected Fields:** Due date

### Test Steps:

1. Enter: 2024-02-29 (valid leap year)
2. Submit
3. Verify it's accepted

### Expected Result:
- Leap year date accepted
- No error

### Pass Criteria:
✅ PASS if: Accepted normally
❌ FAIL if: Rejected as invalid

### Evidence:
Screenshot showing leap year date accepted

---

## Test Case 18: Arabic/RTL Text Layout

**Risk Level:** 🔴 CRITICAL
**Category:** Layout - RTL Languages
**Affected Fields:** All text fields (especially titles)

### Test Steps:

1. Enter Arabic text: "مرحبا بك في البرنامج"
2. Submit task
3. View saved task
4. Check text alignment (should be right-to-left)
5. Check for layout overflow

### Expected Result:
- Text displays in RTL direction
- No layout breaks
- Text is readable
- No overflow

### Pass Criteria:
✅ PASS if: RTL layout correct, readable
❌ FAIL if: Layout broken, text unreadable, overflow

### Evidence:
1. Screenshot showing RTL text
2. Screenshot of layout (no overflow)
3. Full page screenshot showing alignment

---

## Test Case 19: Long Arabic/RTL Text

**Risk Level:** 🔴 CRITICAL
**Category:** Layout - RTL with Long Text
**Affected Fields:** Task title, Note title

### Test Steps:

1. Enter long Arabic: "طويل جداً طويل جداً طويل جداً طويل جداً" (repeat until 100+ chars)
2. Submit
3. Check if layout breaks
4. Check on mobile view

### Expected Result:
- Text wraps properly
- No overflow
- Readable on all screen sizes
- No horizontal scroll needed

### Pass Criteria:
✅ PASS if: Wraps properly, readable, no overflow
❌ FAIL if: Layout breaks, text overflows, unreadable

### Evidence:
1. Desktop screenshot
2. Mobile screenshot
3. Both showing proper wrapping

---

## Test Case 20: Quote Characters in Title

**Risk Level:** 🟡 MEDIUM
**Category:** Character Escaping - Quotes
**Affected Fields:** All fields

### Test Steps:

1. Type: 'Test"with"quotes and\'single\'quotes'
2. Submit
3. Verify text is preserved exactly

### Expected Result:
- All quotes preserved
- No escaping issues
- Text displayed as entered

### Pass Criteria:
✅ PASS if: Quotes preserved correctly
❌ FAIL if: Quotes disappeared or mangled

### Evidence:
Screenshot showing quotes preserved

---

## Summary Checklist

After completing all tests, mark status:

- [ ] Test Case 1: XSS Script Tag
- [ ] Test Case 2: XSS HTML Entities
- [ ] Test Case 3: XSS Event Handler
- [ ] Test Case 4: XSS JavaScript URL
- [ ] Test Case 5: XSS Data URL
- [ ] Test Case 6: Text Truncation 500 chars
- [ ] Test Case 7: Whitespace-Only Title
- [ ] Test Case 8: Whitespace Tabs
- [ ] Test Case 9: Performance 100+ Tasks
- [ ] Test Case 10: Emoji Display
- [ ] Test Case 11: Unicode Mixed Scripts
- [ ] Test Case 12: Single Character
- [ ] Test Case 13: 10,000+ Character Description
- [ ] Test Case 14: Special Symbols
- [ ] Test Case 15: Date Far Past
- [ ] Test Case 16: Invalid Date
- [ ] Test Case 17: Leap Year Date
- [ ] Test Case 18: Arabic RTL Layout
- [ ] Test Case 19: Long Arabic RTL
- [ ] Test Case 20: Quote Characters

---

**Last Updated:** 2026-01-31
**Test Account:** e2e-test-1769299570772@mybrain.test
**Related Files:**
- `qa-edge-cases-2026-01-31.md` (main report)
- `edge-case-test-checklist.md` (quick checklist)
