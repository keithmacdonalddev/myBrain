# Admin Panel QA Test Plan

## Test Credentials
- Email: claude-test-admin@mybrain.test
- Password: ClaudeTest123
- Session: admin-qa

## Test Sections

### 1. Access Verification
- [ ] Login with admin account
- [ ] Navigate to /admin
- [ ] Verify dashboard loads
- [ ] Check sidebar navigation

### 2. Users Management
- [ ] View users list
- [ ] Search/filter functionality
- [ ] View user details
- [ ] Test user role management
- [ ] Test feature flags toggle
- [ ] Check pagination

### 3. Reports Section
- [ ] View reports list
- [ ] Check report details
- [ ] Test any filters

### 4. Analytics
- [ ] View analytics dashboard
- [ ] Check all charts render
- [ ] Test date filters if available

### 5. Logs
- [ ] View logs section
- [ ] Test search/filter
- [ ] Check pagination

### 6. Database Management
- [ ] View database tools
- [ ] Document available features
- [ ] Test read-only operations only

### 7. Sidebar/Roles
- [ ] View sidebar configuration
- [ ] Check roles management
- [ ] Test any customization

### 8. Social/Moderation
- [ ] Check social dashboard
- [ ] View moderation features
- [ ] Test inbox if available

### 9. System Settings
- [ ] View system page
- [ ] Check available settings
- [ ] Test any toggles

### 10. Security Testing
- [ ] Try accessing as non-admin
- [ ] Verify proper redirect/403
- [ ] Check data privacy

## Visual Testing
- [ ] Light mode all pages
- [ ] Dark mode all pages
- [ ] Mobile responsiveness
- [ ] Consistency with app design

## Issues to Document
- Broken features
- UI inconsistencies
- Missing functionality
- Performance issues
- Security vulnerabilities
