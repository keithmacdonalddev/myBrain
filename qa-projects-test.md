# QA Test Plan for Projects Page

## Test Environment
- URL: https://my-brain-gules.vercel.app/projects
- Test Account: e2e-test-1769287337359@mybrain.test / ClaudeTest123
- Session: projects-qa
- Screenshots saved to: .claude/design/screenshots/qa/

## Test Phases

### Phase 1: Visual Inspection
1. Desktop view (1280px) - Projects list/grid, cards styling, progress indicators
2. Tablet view (768px) - Layout responsiveness
3. Mobile view (375px) - Mobile layout, touch targets
4. Dark mode verification - Text readability, color contrast
5. Light mode verification (if supported)

### Phase 2: CRUD Operations
1. CREATE - Create new project with all available fields
2. READ - View project list and individual project details
3. UPDATE - Edit project details (name, description, status, colors, icons)
4. DELETE - Delete project with confirmation dialog

### Phase 3: Project Features
1. Add tasks to project
2. View project tasks list
3. Verify progress calculation (% complete based on tasks)
4. Test project status changes (active, archived, completed)
5. Test color/icon selection
6. Test description editing (including very long descriptions)

### Phase 4: Edge Cases
1. Project with 100+ tasks - check performance and rendering
2. Very long description (1000+ chars) - layout doesn't break
3. Duplicate project names - allowed or prevented?
4. Archive/restore functionality
5. Project with no tasks - progress bar at 0%

### Phase 5: Issue Detection
- Progress not calculating correctly
- Tasks not linking to projects properly
- UI inconsistencies across views
- Mobile layout breaking points
- Performance issues with large task lists
- Missing error states
- Missing loading states

