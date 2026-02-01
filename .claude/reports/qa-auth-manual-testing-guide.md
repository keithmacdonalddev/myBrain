# Auth Pages Manual Testing Guide

**Date:** 2026-01-31
**Purpose:** Step-by-step manual testing instructions for QA
**Test Environments:** http://localhost:5173 (local) and https://my-brain-gules.vercel.app (production)

---

## Setup

### Test Accounts
- **Email:** test@example.com
- **Password:** TestPassword123!
- **Signup Test Email:** (use unique email each time, e.g., qa-test-2026-01-31@example.com)

### Tools Needed
- Modern browser (Chrome, Firefox, Safari, or Edge)
- Developer tools (F12 key)
- Text editor or notepad for test results

### Environment Check
Before testing, verify:
- [ ] App loads and is responsive
- [ ] No JavaScript errors in console (F12 → Console tab)
- [ ] Dark mode toggle works (if present)
- [ ] Mobile responsive (developer tools → toggle device toolbar)

---

## Test Suite 1: LOGIN PAGE

### Navigation
**Goal:** Verify login page is accessible and loads correctly

#### Test 1.1: Page Load
1. Navigate to http://localhost:5173/login
2. **Verify:**
   - [ ] Page loads within 2 seconds
   - [ ] Title is "myBrain" (or contains "myBrain")
   - [ ] Heading says "Sign in to your account"
   - [ ] Email input is visible
   - [ ] Password input is visible
   - [ ] "Sign In" button is visible
   - [ ] "Forgot password?" link is visible
   - [ ] "Create one" (signup) link is visible

#### Test 1.2: Visual Layout (Light Mode)
1. On login page, ensure light mode is selected
2. **Verify:**
   - [ ] Text is clearly readable
   - [ ] Input fields have visible borders
   - [ ] Button has clear background color
   - [ ] Links are distinguishable from regular text
   - [ ] No elements are cut off or overlapping
   - [ ] Form is centered on page

#### Test 1.3: Visual Layout (Dark Mode)
1. Toggle to dark mode (if available)
2. **Verify:**
   - [ ] Text is still clearly readable
   - [ ] Input fields have visible borders in dark mode
   - [ ] Button is still clickable and visible
   - [ ] Links are visible in dark mode
   - [ ] No color contrast issues

#### Test 1.4: Mobile View
1. Open developer tools (F12)
2. Click device toolbar toggle (mobile icon)
3. Select iPhone SE or similar (375px width)
4. **Verify:**
   - [ ] Form fits on screen without horizontal scroll
   - [ ] All fields are clickable
   - [ ] Button is full width and easy to tap
   - [ ] Text is readable (not too small)
   - [ ] No elements overlap

#### Test 1.5: Tablet View
1. In developer tools, change to iPad or 768px width
2. **Verify:**
   - [ ] Form is nicely centered
   - [ ] Not too wide for screen
   - [ ] Proportions look good
   - [ ] All interactive elements are accessible

### Form Validation

#### Test 1.6: Empty Field Submission
1. Click "Sign In" button without entering anything
2. **Verify:**
   - [ ] Email error message appears: "Email is required"
   - [ ] Password error message appears: "Password is required"
   - [ ] Form is not submitted to server
   - [ ] Page does not redirect

#### Test 1.7: Invalid Email Format
1. Type "not-an-email" in email field
2. Press Tab to move to password field
3. **Verify:**
   - [ ] Error message appears below email field: "Please enter a valid email address"
   - [ ] Error text is red
   - [ ] Email field border is red
   - [ ] Password field doesn't show error

#### Test 1.8: Invalid Email Variations
Test each of these invalid emails:
- "plainaddress" → Should show error
- "email@" → Should show error
- "@example.com" → Should show error
- "email @example.com" (space) → Should show error

#### Test 1.9: Valid Email Format
1. Type "test@example.com" in email field
2. Press Tab
3. **Verify:**
   - [ ] No error message for email
   - [ ] Email field border is normal (not red)
   - [ ] Focus moves to password field

#### Test 1.10: Password Field Interaction
1. Leave email field with valid value "test@example.com"
2. Click password field
3. Type "password123"
4. Press Tab
5. **Verify:**
   - [ ] Password characters are masked (dots or asterisks, not visible)
   - [ ] Password field shows no error
   - [ ] Focus moves to next element (forgot password link or button)

### Form Submission

#### Test 1.11: Wrong Password (Account Exists)
1. Enter email: test@example.com
2. Enter password: WrongPassword123
3. Click "Sign In"
4. **Verify:**
   - [ ] Button shows "Signing in..." text
   - [ ] Button is disabled (appears greyed out)
   - [ ] Email and password fields are disabled
   - [ ] After 2-3 seconds, error message appears
   - [ ] Error message is generic (not "user not found" or "wrong password")
   - [ ] Page does NOT redirect

#### Test 1.12: Non-existent Account
1. Enter email: nonexistent@example.com
2. Enter password: anypassword123
3. Click "Sign In"
4. **Verify:**
   - [ ] Same error message as wrong password (prevents email enumeration)
   - [ ] No indication that email doesn't exist

#### Test 1.13: Valid Login
1. Enter email: test@example.com
2. Enter password: TestPassword123!
3. Click "Sign In"
4. **Verify:**
   - [ ] Button shows "Signing in..."
   - [ ] After 2-3 seconds, page redirects to /app or dashboard
   - [ ] Login was successful

#### Test 1.14: Already Logged In Redirect
1. If already logged in, navigate to /login
2. **Verify:**
   - [ ] Page automatically redirects to /app
   - [ ] Login form is not shown

### Keyboard Navigation

#### Test 1.15: Tab Navigation
1. Reload login page
2. Press Tab (don't click anything)
3. **Verify:**
   - [ ] First Tab focuses email field (visible focus ring)
   - [ ] Second Tab focuses password field
   - [ ] Third Tab focuses "Forgot password?" link (or button)
   - [ ] Tab order makes sense

#### Test 1.16: Enter Key Submission
1. Type test@example.com in email field
2. Press Tab to go to password field
3. Type TestPassword123!
4. Press Enter (instead of clicking button)
5. **Verify:**
   - [ ] Form submits successfully
   - [ ] Page redirects to /app

#### Test 1.17: Shift+Tab (Reverse Navigation)
1. Click "Sign In" button (focus on button)
2. Press Shift+Tab
3. **Verify:**
   - [ ] Focus moves backwards through form
   - [ ] Password field gets focus
   - [ ] Shift+Tab again moves to email field

### Links

#### Test 1.18: "Forgot password?" Link
1. On login page, click "Forgot password?" link
2. **Verify:**
   - [ ] Page navigates to /forgot-password
   - [ ] Forgot password form appears

#### Test 1.19: "Create one" (Sign up) Link
1. On login page, click "Create one" link
2. **Verify:**
   - [ ] Page navigates to /signup
   - [ ] Signup form appears

### Security

#### Test 1.20: SQL Injection Attempt
1. In email field, type: ' OR '1'='1
2. Click "Sign In"
3. **Verify:**
   - [ ] Error message: "Please enter a valid email address"
   - [ ] Form doesn't submit
   - [ ] No database bypass attempt

#### Test 1.21: XSS Injection Attempt
1. In email field, type: <script>alert('xss')</script>
2. Click "Sign In"
3. **Verify:**
   - [ ] Error message: "Please enter a valid email address"
   - [ ] No alert box pops up
   - [ ] No script is executed

#### Test 1.22: Very Long Input
1. Copy/paste a 1000-character string into email field
2. Click "Sign In"
3. **Verify:**
   - [ ] Field doesn't overflow page width
   - [ ] Error message appears
   - [ ] No freezing or lag

### Accessibility

#### Test 1.23: Screen Reader (if available)
1. Enable screen reader (NVDA, JAWS, VoiceOver, etc.)
2. Navigate login page
3. **Verify:**
   - [ ] Form fields are announced with labels
   - [ ] Input types are announced ("email input" vs "password input")
   - [ ] Error messages are announced
   - [ ] Button purpose is clear
   - [ ] Links are announced with destination

#### Test 1.24: Error Announcements
1. Click "Sign In" with empty fields
2. Listen to screen reader or check for role="alert"
3. **Verify:**
   - [ ] Error messages are announced
   - [ ] Errors are announced as alerts (immediate notification)

---

## Test Suite 2: SIGNUP PAGE

### Navigation & Load

#### Test 2.1: Page Load
1. Navigate to http://localhost:5173/signup
2. **Verify:**
   - [ ] Page loads within 2 seconds
   - [ ] Heading says "Create your account" (or similar)
   - [ ] Email input is visible
   - [ ] Password input is visible
   - [ ] Confirm password input is visible
   - [ ] "Create Account" button is visible
   - [ ] "Sign in" link is visible

### Form Fields

#### Test 2.2: Email Field
1. Click on email field
2. Type an email
3. **Verify:**
   - [ ] Placeholder text disappears when typing
   - [ ] Email appears as entered
   - [ ] No autocorrection interferes
   - [ ] Field has focus ring when selected

#### Test 2.3: Password Field
1. Click on password field
2. Type "testpassword123"
3. **Verify:**
   - [ ] Characters are masked (not visible)
   - [ ] Placeholder text shows "At least 8 characters"
   - [ ] Field has focus ring

#### Test 2.4: Confirm Password Field
1. Type password in confirm field
2. **Verify:**
   - [ ] Characters are masked
   - [ ] Matches password field structure

### Form Validation

#### Test 2.5: Required Fields
1. Click "Create Account" without entering anything
2. **Verify:**
   - [ ] Error message: "All fields are required"
   - [ ] Form doesn't submit

#### Test 2.6: Email Format Validation
Test each email with expected result:
- "invalid" → Should show format error
- "invalid@" → Should show format error
- "@example.com" → Should show format error
- "valid@example.com" → Should NOT show format error

#### Test 2.7: Password Length Validation
1. Type password "short" (less than 8 chars)
2. Type matching confirm password
3. Click "Create Account"
4. **Verify:**
   - [ ] Error: "Password must be at least 8 characters"

#### Test 2.8: Password Mismatch
1. Type password "ValidPassword123" in password field
2. Type different password "DifferentPassword123" in confirm
3. Click "Create Account"
4. **Verify:**
   - [ ] Error: "Passwords do not match"
   - [ ] Clear indication of which fields don't match

#### Test 2.9: All Validations Pass
1. Type email: qa-test-unique-{timestamp}@example.com (must be unique)
2. Type password: ValidPassword123
3. Type matching confirm password
4. Click "Create Account"
5. **Verify:**
   - [ ] Button shows "Creating account..."
   - [ ] After 2-3 seconds, redirects to /app or dashboard
   - [ ] Account is created successfully
   - [ ] User is logged in

### Error Display

#### Test 2.10: Duplicate Email (Second Attempt)
1. Try to sign up with same email again
2. **Verify:**
   - [ ] Error message from backend displays
   - [ ] Message is clear (e.g., "Email already exists")
   - [ ] Form is not submitted twice

### Links

#### Test 2.11: "Sign in" Link
1. Click "Already have an account? Sign in"
2. **Verify:**
   - [ ] Navigates to /login

### Accessibility

#### Test 2.12: Labels Associated
1. Click on "Email" label text
2. **Verify:**
   - [ ] Focus moves to email input field
   - [ ] Same for "Password" and "Confirm Password" labels

---

## Test Suite 3: FORGOT PASSWORD PAGE

### Navigation & Load

#### Test 3.1: Page Load
1. Navigate to http://localhost:5173/forgot-password
2. **Verify:**
   - [ ] Page loads showing email request form
   - [ ] Heading says "Forgot password?" or similar
   - [ ] Email input visible
   - [ ] "Send reset link" button visible
   - [ ] Mail icon or similar visual displayed
   - [ ] "Back to login" link visible

### Form Interaction

#### Test 3.2: Valid Email Submission
1. Type "test@example.com" in email field
2. Click "Send reset link"
3. **Verify:**
   - [ ] Button shows "Sending..."
   - [ ] After 1-2 seconds, success page appears
   - [ ] Success message says "Check your email"
   - [ ] Email address is displayed in confirmation
   - [ ] Message mentions 1 hour expiration
   - [ ] Checkmark icon displayed

#### Test 3.3: Non-existent Email
1. Type "nonexistent@example.com"
2. Click "Send reset link"
3. **Verify:**
   - [ ] Same success message appears (prevents email enumeration)
   - [ ] No indication that email doesn't exist
   - [ ] User cannot tell if email is registered

#### Test 3.4: Invalid Email Format
1. Type "not-an-email" in email field
2. Click "Send reset link"
3. **Verify:**
   - [ ] Error message appears (optional, depends on implementation)
   - [ ] Form doesn't submit to backend

#### Test 3.5: Empty Field
1. Leave email field empty
2. Try to click "Send reset link" button
3. **Verify:**
   - [ ] Button is disabled (greyed out)
   - [ ] Cannot submit empty form

### Success State

#### Test 3.6: Back to Login Link (Success State)
1. After submission succeeds and success message shows
2. Click "Back to login" link
3. **Verify:**
   - [ ] Navigates to /login

#### Test 3.7: Back to Login Link (Form State)
1. On initial forgot password form
2. Click "Back to login" link
3. **Verify:**
   - [ ] Navigates to /login

---

## Test Suite 4: RESET PASSWORD PAGE

### Navigation with Token

#### Test 4.1: Page Load with Valid Token
1. Get reset link from email (or manually construct: /reset-password?token=abc123)
2. Navigate to that URL
3. **Verify:**
   - [ ] Page loads with password form
   - [ ] Heading says "Set new password" or similar
   - [ ] Two password inputs visible
   - [ ] Eye icon toggle on both fields
   - [ ] "Reset password" button visible
   - [ ] Lock icon displayed

#### Test 4.2: Page Load Without Token
1. Navigate to /reset-password (no ?token param)
2. **Verify:**
   - [ ] Page redirects to /forgot-password
   - [ ] User is back at forgot password form

### Password Toggle

#### Test 4.3: Show/Hide Password Toggle
1. Click Eye icon on first password field
2. **Verify:**
   - [ ] Password becomes visible (text appears)
   - [ ] Icon changes (closed eye to open eye)
3. Click Eye icon again
4. **Verify:**
   - [ ] Password is masked again
   - [ ] Icon changes back

#### Test 4.4: Separate Toggles
1. Show first password field (click eye)
2. **Verify:**
   - [ ] Confirm password field is still masked
   - [ ] Toggles are independent

### Form Validation

#### Test 4.5: Password Length
1. Type "short" in password field
2. Type "short" in confirm field
3. Click "Reset password"
4. **Verify:**
   - [ ] Error: "Password must be at least 8 characters"

#### Test 4.6: Password Mismatch
1. Type "ValidPassword123" in first field
2. Type "DifferentPassword123" in second field
3. Click "Reset password"
4. **Verify:**
   - [ ] Error: "Passwords do not match"

#### Test 4.7: Valid Password Reset
1. Type "NewPassword123" in first field
2. Type "NewPassword123" in second field
3. Click "Reset password"
4. **Verify:**
   - [ ] Button shows "Resetting..."
   - [ ] After 2-3 seconds, success page appears
   - [ ] Checkmark icon shown
   - [ ] Success message displays
   - [ ] "Continue to login" button visible

#### Test 4.8: Success Button
1. After successful password reset
2. Click "Continue to login" button
3. **Verify:**
   - [ ] Navigates to /login
   - [ ] Can login with new password

### Error Handling

#### Test 4.9: Expired Token
1. Use old reset link (or manipulate token)
2. Try to reset password
3. **Verify:**
   - [ ] Error message appears: "Token expired" or similar
   - [ ] User is informed to request new reset link

#### Test 4.10: Invalid Token
1. Try to reset with random token: /reset-password?token=invalid
2. **Verify:**
   - [ ] Error message appears
   - [ ] Form doesn't process

---

## Cross-Page Tests

### Test 5.1: Complete Auth Flow
1. Start at login page
2. Click "Create one" (sign up)
3. Sign up with new email and password
4. Verify login succeeds
5. **Result:**
   - [ ] Complete flow works end-to-end

### Test 5.2: Password Reset Flow
1. On login page, click "Forgot password?"
2. Enter account email
3. Check email for reset link
4. Click link and set new password
5. Go back to login
6. Login with new password
7. **Result:**
   - [ ] Complete reset flow works

### Test 5.3: Multiple Browsers
1. Test login on Chrome
2. Test on Firefox
3. Test on Safari or Edge
4. **Verify:**
   - [ ] Works consistently across browsers

### Test 5.4: Private/Incognito Mode
1. Open private/incognito window
2. Test login/signup
3. **Verify:**
   - [ ] Works without session data from regular mode
   - [ ] No cookies/session pollution

---

## Post-Test Checklist

- [ ] All critical tests passed (empty fields, invalid inputs, successful submission)
- [ ] All visual tests passed (colors, layout, responsive design)
- [ ] All security tests passed (no injection vulnerabilities)
- [ ] All accessibility tests passed (keyboard nav, screen readers)
- [ ] All error messages are clear and helpful
- [ ] No console errors (F12 → Console)
- [ ] No unfixed issues from previous QA report
- [ ] All links work correctly
- [ ] Mobile and desktop views both work
- [ ] Dark mode works (if available)

---

## Issues Found During Testing

Use this section to document any new issues found:

### Issue Template
```
ISSUE #X: [Title]
Severity: Critical / Moderate / Minor
Page: LoginPage / SignupPage / ForgotPasswordPage / ResetPasswordPage
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [If applicable]
```

---

## Test Execution Log

| Test ID | Status | Notes | Tester | Date |
|---------|--------|-------|--------|------|
| 1.1 | PASS / FAIL | [Notes] | [Name] | [Date] |
| 1.2 | PASS / FAIL | [Notes] | [Name] | [Date] |
| ... | ... | ... | ... | ... |

---

## Sign-off

**Tested By:** ________________
**Date:** ________________
**Environment:** [localhost / production]
**Result:** [All Pass / Issues Found]
**Approved For:** [Testing / Deployment]

---

**Last Updated:** 2026-01-31
**For Issues:** Document in qa-auth-comprehensive report and communicate with development team
