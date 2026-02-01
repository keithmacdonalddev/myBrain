# Profile Page QA - Issue Details & Action Items

**Report Date:** 2026-01-31
**Test Environment:** Local (http://localhost:5173) & Production (https://my-brain-gules.vercel.app)

---

## Issue #1: Display Name - No Maximum Length

**Severity:** MEDIUM
**Component:** ProfilePage.jsx, PersonalInfoTab
**Status:** IDENTIFIED

### Current Behavior
- Display name field accepts unlimited length text
- No maxLength attribute on input (line 397-403)
- No character counter shown to user
- No validation on form submit

### Why This Is a Problem
1. Long names (100+ chars) can break the profile header layout
2. Other features displaying display name may overflow (dashboard widgets, user cards)
3. Mobile views especially vulnerable due to limited width
4. No user feedback about length limitations

### Example Failure Cases
- Input: "Lorem ipsum dolor sit amet consectetur adipiscing elit duis aute irure dolor in reprehenderit in voluptate velit"
- Result: Text overflows profile header, truncation needed elsewhere

### Recommended Fix
```jsx
// Line 397-403, PersonalInfoTab
// BEFORE:
<input
  type="text"
  value={formData.displayName}
  onChange={(e) => handleChange('displayName', e.target.value)}
  placeholder="How you want to be called"
  className="..."
/>

// AFTER:
<input
  type="text"
  value={formData.displayName}
  onChange={(e) => handleChange('displayName', e.target.value.slice(0, 50))}
  maxLength="50"
  placeholder="How you want to be called"
  className="..."
/>
<p className="text-xs text-[color:var(--v2-text-tertiary)] mt-1">
  {formData.displayName.length}/50 characters
</p>
```

### Testing to Verify Fix
1. Enter 100+ characters in display name
2. Verify text stops at 50 chars
3. Verify character counter shows "50/50"
4. Verify form submit works with any length up to 50
5. Verify mobile layout doesn't overflow with 50 chars

### Priority
**High** - Fix before next release to prevent layout issues

---

## Issue #2: Phone Field - No Format Validation

**Severity:** LOW
**Component:** ProfilePage.jsx, PersonalInfoTab (lines 426-437)
**Status:** IDENTIFIED

### Current Behavior
- Phone field uses HTML5 `type="tel"` but provides no validation
- Accepts any text string as valid input
- No format specification or helper text provided to user
- No error message if format is invalid
- Example: Accepts "abcdefgh" as valid phone number

### Why This Is a Problem
1. Users don't know what format to enter (E.164? National? With spaces?)
2. Data stored without validation could be unusable
3. International users may be confused about format
4. No validation feedback until form tries to save

### Example Failure Cases
- Valid but ambiguous: "555-123-4567" vs "5551234567" vs "+1 555 123 4567"
- Invalid accepted: "call me later" or "N/A" stored in phone field
- International: User unsure if "+44" or "0044" format is expected

### Recommended Fix
```jsx
// Add validation function at top of component
const validatePhone = (phone) => {
  if (!phone) return { valid: true, error: '' };
  // E.164 format validation: +1-15+ digits
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number too short' };
  }
  if (cleaned.length > 15) {
    return { valid: false, error: 'Phone number too long' };
  }
  return { valid: true, error: '' };
};

// Add phone error state to component
const [phoneError, setPhoneError] = useState('');

// Update handler
const handlePhoneChange = (value) => {
  handleChange('phone', value);
  const validation = validatePhone(value);
  setPhoneError(validation.error);
};

// Update form field (lines 426-437)
<div>
  <label className="block text-sm font-medium text-[color:var(--v2-text-primary)] mb-1">
    <Phone className="w-4 h-4 inline mr-1" />
    Phone
  </label>
  <input
    type="tel"
    value={formData.phone}
    onChange={(e) => handlePhoneChange(e.target.value)}
    placeholder="+1 (555) 123-4567"
    className={`w-full px-3 py-2 bg-[color:var(--v2-bg-tertiary)] border rounded-lg
      text-[color:var(--v2-text-primary)] focus:outline-none focus:ring-2
      ${phoneError ? 'border-red-500 focus:ring-red-300' : 'border-[color:var(--v2-border-default)] focus:ring-[color:var(--v2-blue-light)]'}`}
  />
  {phoneError && (
    <p className="text-xs text-red-500 mt-1">{phoneError}</p>
  )}
  <p className="text-xs text-[color:var(--v2-text-tertiary)] mt-1">
    Format: +1 (555) 123-4567 or +country number
  </p>
</div>
```

### Testing to Verify Fix
1. Enter "123" - should show "Phone number too short"
2. Enter "+1 555 123 4567" - should validate successfully
3. Enter "+44 20 7946 0958" - should validate successfully
4. Enter "call me" - should show error
5. Character counter updates as user types

### Priority
**Low** - Nice to have, doesn't block functionality

---

## Issue #3: Avatar Selector - Can't Switch to Default When Custom Exists

**Severity:** MEDIUM
**Component:** DefaultAvatar.jsx, AvatarSelector (lines 186-224)
**Status:** IDENTIFIED

### Current Behavior
- When user has a custom uploaded avatar, all default avatar buttons become disabled
- Disabled buttons have opacity-40 and "cursor-not-allowed" styling
- Hovering shows tooltip: "Delete custom avatar first"
- User must delete custom avatar before any default can be selected
- Creating unnecessary friction in avatar selection process

### Why This Is a Problem
1. **UX Friction:** Requires extra step (delete) before switching
2. **Discoverable Issue:** User doesn't know they can change defaults without deleting
3. **Poor Flow:** Should be: try default → confirmation → done
   Instead is: delete custom → then select default → two steps
4. **Accessibility:** Screen readers announce buttons as disabled without clear context

### Current Code (Problem Area)
```jsx
// Lines 207-213 in DefaultAvatar.jsx
<button
  onClick={() => handleClick(avatar.id)}
  disabled={!!currentAvatarUrl}  // ← PROBLEM: Always disabled if custom exists
  className={`... ${
    currentAvatarUrl
      ? 'opacity-40 cursor-not-allowed border-transparent'  // ← Blocked state
      : selectedId === avatar.id
        ? 'border-primary ring-2 ring-primary/30 scale-110'
        : 'border-transparent hover:border-border hover:scale-105'
  }`}
/>
```

### Example User Flow (Current - Bad)
1. User uploads custom avatar ✓
2. Later decides: "I want to try a different avatar"
3. Clicks blue circle avatar → blocked, tooltip appears
4. User confused: "How do I change?"
5. Realizes must delete avatar first
6. Clicks delete → confirmation dialog → deleted
7. Now clicks blue circle avatar → works
8. **Total steps: 3 (delete, confirm, select)**

### Recommended Better Flow
```jsx
// New implementation in ProfilePage.jsx

const [avatarToSwitch, setAvatarToSwitch] = useState(null);

const handleSelectDefaultAvatarWithConfirm = async (avatarId) => {
  // If user already has custom avatar, confirm replacement
  if (user?.profile?.avatarUrl) {
    setAvatarToSwitch(avatarId);
  } else {
    // No custom avatar, can switch directly
    await handleSelectDefaultAvatar(avatarId);
  }
};

// New modal for confirmation
{avatarToSwitch && (
  <ConfirmDialog
    isOpen={true}
    onClose={() => setAvatarToSwitch(null)}
    onConfirm={() => {
      handleSelectDefaultAvatar(avatarToSwitch);
      setAvatarToSwitch(null);
    }}
    title="Replace Avatar?"
    message={`Replace your custom avatar with this default avatar. Your current avatar will be deleted.`}
    confirmText="Replace Avatar"
    cancelText="Keep Current"
    variant="warning"
  />
)}
```

### Updated AvatarSelector Component
```jsx
export function AvatarSelector({
  selectedId,
  onSelect,
  currentAvatarUrl,
  onCustomAvatarBlock
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        {currentAvatarUrl
          ? 'Select a default avatar to replace your current one.'
          : 'Choose a default avatar or upload your own.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            disabled={false}  // ← Allow all to be clickable
            title={avatar.name}
            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
              selectedId === avatar.id
                ? 'border-primary ring-2 ring-primary/30 scale-110'
                : 'border-transparent hover:border-border hover:scale-105'
            }`}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(avatar.svg, { USE_PROFILES: { svg: true } })
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### Testing to Verify Fix
1. Upload custom avatar
2. Click on default avatar - should show confirmation dialog
3. Confirm replacement - should replace avatar immediately
4. Cancel dialog - should keep custom avatar
5. After replacement, new default is selected
6. Can switch between defaults without extra steps

### Priority
**Medium** - Important UX improvement but doesn't block functionality

---

## Issue #4: Delete Account - No Email Confirmation

**Severity:** HIGH (Security)
**Component:** ProfilePage.jsx, DeleteAccountModal (lines 272-340)
**Status:** IDENTIFIED

### Current Behavior
- Delete account requires only password confirmation
- Modal appears (line 314-320) with single password input
- User enters password → clicks "Delete Forever"
- Account deleted immediately, no email verification step
- No recovery option if accidentally confirmed

### Why This Is a Problem
1. **Accidental Deletion Risk:** Password could be autofilled, user clicks in haste
2. **No Verification:** Unlike email change (line 59) which verifies with password
3. **Industry Standard:** Major services (Google, Microsoft, AWS) all require email confirmation
4. **Unrecoverable:** Once deleted, data is gone with no recovery option
5. **Shared Device Risk:** Someone with access to unlocked device could delete account

### Example Failure Cases
- Browser autofills password, user clicks "Delete Forever" without reading
- User accidentally clicks delete button while reviewing settings
- Guest using shared device deletes account without proper authorization
- Competitor/ex with password access deletes account

### Current Code (Problem)
```jsx
// Lines 278-294 in ProfilePage.jsx - DeleteAccountModal handleDelete
const handleDelete = async () => {
  if (!password) {
    toast.error('Please enter your password');
    return;
  }

  setIsDeleting(true);
  try {
    await profileApi.deleteAccount(password);  // ← Deletes immediately
    toast.success('Account deleted');
    window.location.href = '/login';
  } catch (error) {
    toast.error(error.message || 'Failed to delete account');
  } finally {
    setIsDeleting(false);
  }
};
```

### Recommended Fix (Two-Step Process)

**Step 1: Frontend Change - Send Confirmation Request**
```jsx
// Updated handleDelete in DeleteAccountModal
const handleDelete = async () => {
  if (!password) {
    toast.error('Please enter your password');
    return;
  }

  setIsDeleting(true);
  try {
    // Request deletion token (backend sends email)
    const response = await profileApi.requestAccountDeletion(password);

    if (response.status === 202) {  // Accepted, confirmation needed
      setShowConfirmationSent(true);
      toast.success('Confirmation email sent to your inbox. Please confirm within 24 hours.');
      // Auto-close modal after 2 seconds
      setTimeout(() => onClose(), 2000);
    }
  } catch (error) {
    toast.error(error.message || 'Failed to request account deletion');
  } finally {
    setIsDeleting(false);
  }
};
```

**Step 2: Backend Change - Add Email Confirmation**
```javascript
// In profile.js routes
router.post('/request-deletion', requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = req.user;

    // Verify password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid password');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    // Generate deletion token (valid for 24 hours)
    const deletionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(deletionToken).digest('hex');

    user.deletionTokenHash = tokenHash;
    user.deletionTokenExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send confirmation email
    await emailService.sendAccountDeletionEmail(user.email, deletionToken);

    res.status(202).json({
      message: 'Confirmation email sent. Please check your inbox to confirm deletion.'
    });
  } catch (err) {
    next(err);
  }
});

// Handle email link click
router.post('/confirm-deletion/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      deletionTokenHash: tokenHash,
      deletionTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      const error = new Error('Invalid or expired deletion token');
      error.statusCode = 400;
      error.code = 'INVALID_TOKEN';
      return next(error);
    }

    // Delete all user data
    await Promise.all([
      Note.deleteMany({ userId: user._id }),
      Task.deleteMany({ userId: user._id }),
      // ... delete other user data
      User.deleteOne({ _id: user._id })
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
});
```

### Testing to Verify Fix
1. Click "Delete Account" button
2. Enter password → should see "Confirmation email sent"
3. Check email inbox for deletion confirmation link
4. Wait 5 seconds, account should still be active (not deleted)
5. Click email confirmation link
6. Account should be deleted and user redirected to login
7. Test expired token (wait 25 hours) - should show "token expired"
8. Test wrong password - should show "invalid password"

### Priority
**Critical** - Must implement before production if handling real user data

---

## Summary: Issues by Component

| Issue | Severity | Component | Lines | Type |
|-------|----------|-----------|-------|------|
| #1 Display Name Length | MEDIUM | PersonalInfoTab | 397-403 | Validation |
| #2 Phone Format | LOW | PersonalInfoTab | 426-437 | Validation |
| #3 Avatar Switching | MEDIUM | AvatarSelector | 186-224 | UX |
| #4 Delete Account | HIGH | DeleteAccountModal | 278-294 | Security |

---

## Implementation Timeline Recommendation

### Before Production Release
- [ ] Issue #4 (Delete Account Email Confirmation) - **CRITICAL**

### First Patch (Within 1 Week)
- [ ] Issue #1 (Display Name Length) - **HIGH**
- [ ] Issue #3 (Avatar Selector UX) - **MEDIUM**

### Next Sprint (Optional)
- [ ] Issue #2 (Phone Format Validation) - **LOW**

---

## Testing Regression Checklist

After fixing each issue, verify:

### Issue #1 Fix
- [ ] Display name accepts 50 chars max
- [ ] Character counter displays "50/50"
- [ ] Cannot type beyond 50 chars
- [ ] Form saves with any length ≤ 50
- [ ] Profile header doesn't overflow on mobile
- [ ] Tablet view still has enough space

### Issue #2 Fix
- [ ] Phone field validates E.164 format
- [ ] Error shows for invalid format
- [ ] Error clears on valid entry
- [ ] Helper text visible to user
- [ ] International formats work (+44, etc)

### Issue #3 Fix
- [ ] Can click default avatars with custom set
- [ ] Confirmation dialog appears on click
- [ ] Cancel button closes dialog
- [ ] Confirm button replaces avatar
- [ ] Previous custom avatar is deleted
- [ ] New default avatar is selected

### Issue #4 Fix
- [ ] Deletion starts 2-step flow
- [ ] Email sent to account email
- [ ] Email contains confirmation link
- [ ] Link expires in 24 hours
- [ ] Clicking link completes deletion
- [ ] Token validation works
- [ ] Invalid/expired tokens show error
- [ ] Account not deleted until email confirmed

---

## Questions for Product Team

1. **Issue #4:** Should we offer account recovery/reactivation window after deletion?
2. **Issue #3:** Is one-step default switching (current) or two-step with confirmation preferred?
3. **Issue #1:** Is 50 chars enough for display names, or should be higher?
4. **Issue #2:** Should we accept both E.164 and local formats, or require specific format?

---

**Report Generated:** 2026-01-31
**For Questions:** Reference QA Report: `/c/Users/NewAdmin/Desktop/PROJECTS/myBrain/.claude/reports/qa-profile-20260131.md`

