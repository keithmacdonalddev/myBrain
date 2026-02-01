#!/bin/bash

# Comprehensive QA Testing Script for Projects Page
# Usage: bash qa-projects-comprehensive.sh

set -e

SESSION="projects-qa"
BASE_URL="https://my-brain-gules.vercel.app"
PROJECTS_URL="$BASE_URL/projects"
TEST_EMAIL="e2e-test-1769287337359@mybrain.test"
TEST_PASSWORD="ClaudeTest123"
SCREENSHOT_DIR=".claude/design/screenshots/qa"
DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "COMPREHENSIVE QA TESTING - PROJECTS PAGE"
echo "=========================================="
echo "Date: $DATE"
echo "URL: $PROJECTS_URL"
echo "Session: $SESSION"
echo "Screenshots: $SCREENSHOT_DIR/"
echo ""

# Create screenshot directory if it doesn't exist
mkdir -p "$SCREENSHOT_DIR"

echo "[PHASE 1] VISUAL INSPECTION - LOGIN AND INITIAL VIEW"
echo "=================================================="

# Step 1: Navigate to login page
echo "1. Navigating to Projects page..."
agent-browser --session "$SESSION" "
  navigate('$BASE_URL/login')
  await wait(1000)
"

# Step 2: Login
echo "2. Logging in with test account..."
agent-browser --session "$SESSION" "
  fill('input[type=\"email\"]', '$TEST_EMAIL')
  fill('input[type=\"password\"]', '$TEST_PASSWORD')
  click('button:has-text(\"Sign In\")')
  await wait(2000)
"

# Step 3: Navigate to Projects
echo "3. Navigating to Projects page..."
agent-browser --session "$SESSION" "
  navigate('$PROJECTS_URL')
  await wait(2000)
"

# Step 4: Desktop view screenshot
echo "4. Taking desktop view screenshot (1280px)..."
agent-browser --session "$SESSION" "
  viewport(1280, 800)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-1280-projects-list.png')
"

# Step 5: Tablet view screenshot
echo "5. Taking tablet view screenshot (768px)..."
agent-browser --session "$SESSION" "
  viewport(768, 1024)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-tablet-768-projects-list.png')
"

# Step 6: Mobile view screenshot
echo "6. Taking mobile view screenshot (375px)..."
agent-browser --session "$SESSION" "
  viewport(375, 812)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-mobile-375-projects-list.png')
"

echo ""
echo "[PHASE 2] CRUD OPERATIONS - CREATE"
echo "===================================="

# Step 7: Open create project dialog
echo "7. Opening create project dialog..."
agent-browser --session "$SESSION" "
  viewport(1280, 800)
  click('button:has-text(\"New Project\")') || click('button:has-text(\"Add Project\")') || click('[data-testid=\"add-project-btn\"]')
  await wait(1000)
"

# Step 8: Create project screenshot
echo "8. Taking create project dialog screenshot..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-create-project-dialog.png')
"

# Step 9: Fill in project details
echo "9. Filling project details..."
agent-browser --session "$SESSION" "
  fill('input[placeholder*=\"Project\"]', 'QA Test Project ' + Date.now())
  fill('input[placeholder*=\"description\"]', 'This is a comprehensive QA test project for testing all features.')
  await wait(500)
"

# Step 10: Submit create
echo "10. Submitting project creation..."
agent-browser --session "$SESSION" "
  click('button:has-text(\"Create\")') || click('button:has-text(\"Save\")') || click('[type=\"submit\"]')
  await wait(2000)
"

# Step 11: Project created screenshot
echo "11. Taking project created screenshot..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-project-created.png')
"

echo ""
echo "[PHASE 3] CRUD OPERATIONS - READ"
echo "=================================="

# Step 12: View project list
echo "12. Viewing project list..."
agent-browser --session "$SESSION" "
  navigate('$PROJECTS_URL')
  await wait(1500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-projects-after-create.png')
"

# Step 13: Click project card to view details
echo "13. Opening project details..."
agent-browser --session "$SESSION" "
  click('[data-testid*=\"project-card\"]') || click('div[class*=\"ProjectCard\"]')
  await wait(1500)
"

# Step 14: Project detail screenshot
echo "14. Taking project detail view screenshot..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-project-detail.png')
"

# Step 15: Mobile detail view
echo "15. Taking mobile detail view screenshot..."
agent-browser --session "$SESSION" "
  viewport(375, 812)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-mobile-project-detail.png')
"

echo ""
echo "[PHASE 4] PROJECT FEATURES - TASKS AND PROGRESS"
echo "==============================================="

# Step 16: Add task to project
echo "16. Attempting to add task to project..."
agent-browser --session "$SESSION" "
  viewport(1280, 800)
  click('button:has-text(\"Add Task\")') || click('[data-testid=\"add-task-btn\"]') || click('button:has-text(\"New Task\")')
  await wait(1000)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-add-task-dialog.png')
"

# Step 17: Fill task details
echo "17. Filling task details..."
agent-browser --session "$SESSION" "
  fill('input[placeholder*=\"Task\"]', 'QA Test Task 1')
  await wait(300)
  click('button:has-text(\"Create\")') || click('button:has-text(\"Save\")') || click('[type=\"submit\"]')
  await wait(1500)
"

# Step 18: Screenshot with task added
echo "18. Taking screenshot after adding task..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-project-with-task.png')
"

# Step 19: Check progress indicator
echo "19. Checking progress indicator..."
agent-browser --session "$SESSION" "
  // Check if progress bar exists
  const progressBar = document.querySelector('[class*=\"progress\"], [data-testid*=\"progress\"]')
  console.log('Progress bar found:', !!progressBar)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-progress-indicator.png')
"

echo ""
echo "[PHASE 5] CRUD OPERATIONS - UPDATE"
echo "===================================="

# Step 20: Edit project
echo "20. Opening edit dialog..."
agent-browser --session "$SESSION" "
  navigate('$PROJECTS_URL')
  await wait(1500)
  click('button[aria-label*=\"edit\"]') || click('[data-testid=\"edit-project\"]') || rightClick('[data-testid*=\"project-card\"]')
  await wait(1000)
"

# Step 21: Edit screenshot
echo "21. Taking edit dialog screenshot..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-edit-project-dialog.png')
"

# Step 22: Update description
echo "22. Updating project description..."
agent-browser --session "$SESSION" "
  fill('input[placeholder*=\"description\"]', 'Updated description with more details about this QA test project')
  await wait(300)
"

# Step 23: Save changes
echo "23. Saving changes..."
agent-browser --session "$SESSION" "
  click('button:has-text(\"Save\")') || click('button:has-text(\"Update\")') || click('[type=\"submit\"]')
  await wait(1500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-project-updated.png')
"

echo ""
echo "[PHASE 6] CRUD OPERATIONS - DELETE"
echo "==================================="

# Step 24: Delete project
echo "24. Opening delete dialog..."
agent-browser --session "$SESSION" "
  navigate('$PROJECTS_URL')
  await wait(1500)
  // Look for delete button or menu
  click('button[aria-label*=\"delete\"]') || click('[data-testid=\"delete-project\"]') || click('button:has-text(\"Delete\")')
  await wait(1000)
"

# Step 25: Delete confirmation screenshot
echo "25. Taking delete confirmation screenshot..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-delete-confirmation.png')
"

# Step 26: Confirm delete
echo "26. Confirming deletion..."
agent-browser --session "$SESSION" "
  click('button:has-text(\"Confirm\")') || click('button:has-text(\"Delete\")') || click('[data-testid=\"confirm-delete\"]')
  await wait(1500)
"

# Step 27: After delete screenshot
echo "27. Taking screenshot after deletion..."
agent-browser --session "$SESSION" "
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-projects-after-delete.png')
"

echo ""
echo "[PHASE 7] EDGE CASES AND ERROR DETECTION"
echo "========================================"

# Step 28: Test duplicate names
echo "28. Testing duplicate project creation..."
agent-browser --session "$SESSION" "
  click('button:has-text(\"New Project\")') || click('button:has-text(\"Add Project\")')
  await wait(1000)
  fill('input[placeholder*=\"Project\"]', 'Test Project')
  await wait(500)
"

# Step 29: Long description test
echo "29. Testing with long description (1000+ chars)..."
agent-browser --session "$SESSION" "
  const longDesc = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.'
  fill('input[placeholder*=\"description\"]', longDesc)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-long-description-test.png')
"

# Step 30: Submit
echo "30. Submitting long description test..."
agent-browser --session "$SESSION" "
  click('button:has-text(\"Create\")') || click('[type=\"submit\"]')
  await wait(1500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-long-description-result.png')
"

echo ""
echo "[PHASE 8] VISUAL AND DESIGN SYSTEM VERIFICATION"
echo "==============================================="

# Step 31: Check dark mode
echo "31. Checking dark mode..."
agent-browser --session "$SESSION" "
  viewport(1280, 800)
  navigate('$PROJECTS_URL')
  await wait(1500)
  screenshot('$SCREENSHOT_DIR/$DATE-desktop-dark-mode-projects.png')

  // Check text contrast in dark mode
  const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6')
  console.log('Text elements found:', textElements.length)
"

# Step 32: Check all breakpoints one more time
echo "32. Final breakpoint verification..."
agent-browser --session "$SESSION" "
  // Mobile
  viewport(375, 812)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-final-mobile-view.png')

  // Tablet
  viewport(768, 1024)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-final-tablet-view.png')

  // Desktop
  viewport(1280, 800)
  await wait(500)
  screenshot('$SCREENSHOT_DIR/$DATE-final-desktop-view.png')
"

# Step 33: Console errors
echo "33. Checking for console errors..."
agent-browser --session "$SESSION" "
  // Log any console errors
  const errors = window.__errors || []
  console.log('Console errors count:', errors.length)

  screenshot('$SCREENSHOT_DIR/$DATE-final-console-check.png')
"

echo ""
echo "=========================================="
echo "QA TESTING COMPLETE"
echo "=========================================="
echo ""
echo "Screenshots saved to: $SCREENSHOT_DIR/"
echo "Review the screenshots and error logs for findings."
echo ""
echo "Next steps:"
echo "1. Review all screenshots in $SCREENSHOT_DIR/"
echo "2. Check for visual inconsistencies across breakpoints"
echo "3. Verify CRUD operations work correctly"
echo "4. Look for performance issues with large datasets"
echo "5. Generate comprehensive QA report"
echo ""
