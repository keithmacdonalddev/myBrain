# Edge Case Testing Checklist
**Quick Reference for Running Tests**

## Setup
- [ ] Test account ready: `e2e-test-1769299570772@mybrain.test` / `ClaudeTest123`
- [ ] Frontend running: `http://localhost:5173`
- [ ] Backend running: `http://localhost:5000`
- [ ] Browser console open: `F12`
- [ ] Screenshots directory: `.claude/design/screenshots/debug/`

---

## CRITICAL ISSUES - Test Immediately

### 1. XSS Vulnerabilities (HTML Injection)

**Test in Task Title:**
```
Input: <script>alert('xss')</script>
Expected: Text displays literally, NO alert appears
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/xss-script-test.png
```

**Test in Task Title:**
```
Input: &amp; &lt; &gt; &quot;
Expected: Text displays as literal entity, not parsed
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/xss-entities-test.png
```

**Test in Project Link:**
```
Input: javascript:alert('xss')
Expected: Link rejected or sanitized
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/xss-javascript-test.png
```

**Test in Note Content:**
```
Input: <img src=x onerror=alert('xss')>
Expected: Sanitized or displayed as literal
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/xss-img-test.png
```

### 2. RTL Language Handling (Arabic/Hebrew)

**Test in Task Title:**
```
Input: العربية مرحبا
Expected: Renders with proper RTL layout
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/rtl-arabic-test.png
```

**Test in Profile Bio (long RTL):**
```
Input: طويل جداً طويل جداً طويل جداً طويل جداً طويل جداً
Expected: No layout overflow, text remains readable
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/rtl-overflow-test.png
```

### 3. Special Character Escaping

**Test in all text fields:**
```
Input: Test"with'quotes and\nnewtines
Expected: All characters preserved correctly
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/special-chars-test.png
```

---

## MEDIUM PRIORITY - Test Next

### 4. Text Truncation

**Test Task Title (500+ characters):**
```
Steps:
1. Generate 500-char string (e.g., 'A' repeated 500 times)
2. Enter in Task Title field
3. Submit form
4. Reload page
5. Check if full text is still there or truncated

Input: [500 'A' characters]
Expected: Either shows error, shows truncation warning, or saves full text
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/truncation-test.png
```

### 5. Whitespace Validation

**Test Task Title (spaces only):**
```
Input: "     " (5 spaces)
Expected: Validation error, not accepted
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/whitespace-spaces-test.png
```

**Test Task Title (tabs only):**
```
Input: "\t\t\t" (tabs)
Expected: Validation error, not accepted
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/whitespace-tabs-test.png
```

**Test Task Title (newlines only):**
```
Input: "\n\n" (newlines)
Expected: Validation error, not accepted
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/whitespace-newlines-test.png
```

### 6. Performance (100+ Items)

**Create 100+ tasks:**
```
Steps:
1. Create multiple tasks rapidly (100+)
2. Navigate to task list
3. Scroll through list
4. Search for tasks
5. Note any slowness, crashes, or memory issues

Expected: Smooth scrolling, responsive UI
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/performance-100items.png
```

---

## LOW PRIORITY - Test Last

### 7. Emoji & Unicode Display

**Test Task Title:**
```
Input: 🎉 Task with emoji 🔥 日本語 Ελληνικά
Expected: All characters display correctly
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/emoji-unicode-test.png
```

### 8. Single Character Input

**Test Task Title:**
```
Input: "A"
Expected: Accepted normally
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/single-char-test.png
```

### 9. Date Boundaries

**Test Due Date (far past):**
```
Input: 1900-01-01
Expected: Accept or show appropriate error
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/date-past-test.png
```

**Test Due Date (far future):**
```
Input: 2099-12-31
Expected: Accept normally
Status: [ ] PASS [ ] FAIL
Evidence: /tmp/date-future-test.png
```

---

## Testing Commands

### Automated Testing (agent-browser)
```bash
# Login and test
agent-browser --session edge-qa open "https://my-brain-gules.vercel.app"
agent-browser --session edge-qa find label "Email" fill "e2e-test-1769299570772@mybrain.test"
agent-browser --session edge-qa find label "Password" fill "ClaudeTest123"
agent-browser --session edge-qa find role button click --name "Sign In"
agent-browser --session edge-qa wait 3000

# Take screenshots
agent-browser --session edge-qa screenshot "/tmp/test-01.png"

# Get page content
agent-browser --session edge-qa snapshot -i
```

### Manual Testing
1. Open browser DevTools: `F12`
2. Go to Console tab: Look for red errors
3. Go to Network tab: Check API responses
4. Test each field with edge case input
5. Take screenshot after each test

---

## Issues Found

### Critical (SECURITY)
- [ ] XSS vulnerability in [field]
- [ ] RTL layout broken for [language]

### Medium (USABILITY)
- [ ] Text truncation without warning in [field]
- [ ] Whitespace accepted as valid in [field]
- [ ] Performance lag with [N] items

### Low (COSMETIC)
- [ ] Emoji display issue in [field]
- [ ] Date boundary handling for [case]

---

## Sign-Off Template

When you complete testing, fill this out:

```markdown
## Test Run: [DATE]

**Tester:** [Name]
**Duration:** [Time]
**Environment:** [Local/Production]

### Results Summary
- Total tests: [N]
- Passed: [N]
- Failed: [N]
- Issues found: [N]

### Critical Issues
1. [Issue]
2. [Issue]

### Medium Issues
1. [Issue]
2. [Issue]

### Low Issues
1. [Issue]
2. [Issue]

**Recommendation:** [Next steps]
```

---

## Notes

1. **Always use test account** - Don't test with real user data
2. **Capture evidence** - Screenshots are proof
3. **Check console** - Red errors = failures
4. **Test both sites** - Local (localhost:5173) + Production
5. **Document everything** - Vague findings are useless
6. **Report critical issues first** - Then work down priority

---

**Last Updated:** 2026-01-31
**Test Account:** e2e-test-1769299570772@mybrain.test
**Main Report:** `.claude/reports/qa-edge-cases-2026-01-31.md`
