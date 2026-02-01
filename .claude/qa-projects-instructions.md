# COMPREHENSIVE QA TESTING - PROJECTS PAGE
## Critical Context for QA Agents

### Quality Standards
- User requirement: "better than 100% quality"
- Only accept verification with SCREENSHOTS and concrete evidence
- "Barely readable" = FAIL, only "clearly visible at a glance" = PASS
- Don't trust "PASS" without proof

### Test Account
- Email: e2e-test-1769287337359@mybrain.test
- Password: ClaudeTest123
- URL: https://my-brain-gules.vercel.app/projects (or localhost:5173/projects for local)

### Session & Screenshots
- Use: agent-browser --session projects-qa [command]
- Save screenshots to: .claude/design/screenshots/qa/
- Naming: YYYY-MM-DD-[viewport]-[description].png
  - Example: 2026-01-31-mobile-375px-projects-list.png

### Breakpoints to Test
1. Desktop: 1280px
2. Tablet: 768px
3. Mobile: 375px (iPhone SE size)

### Test Coverage Required
1. **Visual Inspection** - Screenshots, styling, colors, spacing
2. **CRUD Operations** - Create, Read, Update, Delete with confirmation
3. **Project Features** - Tasks, progress, status, colors, descriptions
4. **Edge Cases** - 100+ tasks, long text, duplicates, archive
5. **Issues to Find** - Progress calc errors, task linking, UI inconsistencies

### Critical Verification Points
✅ Progress calculation: Tasks completed / Total tasks = % complete
✅ Task linking: Tasks show correct project ID
✅ UI consistency: Same styling across list, card, and detail views
✅ Mobile layout: No horizontal overflow, touch targets >44px
✅ Dark mode: Text contrast >4.5:1 (WCAG AA)
✅ Error states: Missing confirmation dialogs, unresponsive buttons
✅ Loading states: Skeletons or spinners showing while loading

### What Counts as Evidence
- Screenshot showing the feature working/broken
- Console output showing errors (F12 developer tools)
- Specific measurements (sizes, colors, spacing)
- Description of actual user actions taken and results

### What Does NOT Count
- "It looks fine" without screenshot
- "Build passes" (compilation ≠ verification)
- "Code looks correct" (review ≠ verification)
- "I clicked it" without confirming the action worked

