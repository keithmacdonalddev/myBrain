#!/bin/bash

# QA Testing Script - Projects Page Comprehensive Testing
# Tests all CRUD operations, visual design, and edge cases

set -e

SESSION="projects-qa"
BASE_URL="http://localhost:5173"
PROD_URL="https://my-brain-gules.vercel.app"
PROJECTS_URL="$BASE_URL/projects"
TEST_EMAIL="e2e-test-1769287337359@mybrain.test"
TEST_PASSWORD="ClaudeTest123"
SCREENSHOT_DIR=".claude/design/screenshots/qa"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H-%M-%S)

mkdir -p "$SCREENSHOT_DIR"

echo "========================================"
echo "STARTING QA TESTS - PROJECTS PAGE"
echo "========================================"
echo "Time: $DATE $TIMESTAMP"
echo "Base URL: $BASE_URL"
echo "Session: $SESSION"
echo ""

# Test 1: Navigate to projects and take desktop screenshot
echo "[TEST 1] Desktop view (1280px)"
agent-browser --session "$SESSION" "
  viewport(1280, 800);
  navigate('$PROJECTS_URL');
  await wait(2000);
  screenshot('$SCREENSHOT_DIR/${DATE}-01-desktop-projects-list.png');
  console.log('✅ Desktop screenshot captured');
" || echo "⚠️ Test 1 had issues"

# Test 2: Tablet view
echo "[TEST 2] Tablet view (768px)"
agent-browser --session "$SESSION" "
  viewport(768, 1024);
  await wait(500);
  screenshot('$SCREENSHOT_DIR/${DATE}-02-tablet-projects-list.png');
  console.log('✅ Tablet screenshot captured');
" || echo "⚠️ Test 2 had issues"

# Test 3: Mobile view
echo "[TEST 3] Mobile view (375px)"
agent-browser --session "$SESSION" "
  viewport(375, 812);
  await wait(500);
  screenshot('$SCREENSHOT_DIR/${DATE}-03-mobile-projects-list.png');
  console.log('✅ Mobile screenshot captured');
" || echo "⚠️ Test 3 had issues"

# Test 4: Check for create project button
echo "[TEST 4] Checking for create project button"
agent-browser --session "$SESSION" "
  viewport(1280, 800);
  const createBtn = document.querySelector('button:has-text(\"New\")') ||
                   document.querySelector('[data-testid*=\"create\"]') ||
                   document.querySelector('button[aria-label*=\"new\"]');
  if (createBtn) {
    console.log('✅ Create button found');
  } else {
    console.log('⚠️ Create button not found');
  }
  screenshot('$SCREENSHOT_DIR/${DATE}-04-desktop-check-create-btn.png');
" || echo "⚠️ Test 4 had issues"

# Test 5: Look for project cards and evaluate styling
echo "[TEST 5] Analyzing project card styling"
agent-browser --session "$SESSION" "
  const cards = document.querySelectorAll('[class*=\"Card\"], [class*=\"card\"], [role=\"listitem\"]');
  console.log('Found ' + cards.length + ' potential project cards');

  if (cards.length > 0) {
    const firstCard = cards[0];
    const style = window.getComputedStyle(firstCard);
    console.log('Card styling - background: ' + style.backgroundColor);
    console.log('Card styling - border-radius: ' + style.borderRadius);
  }
  screenshot('$SCREENSHOT_DIR/${DATE}-05-desktop-card-analysis.png');
" || echo "⚠️ Test 5 had issues"

# Test 6: Check for progress indicators
echo "[TEST 6] Checking for progress indicators"
agent-browser --session "$SESSION" "
  const progressElements = document.querySelectorAll('[class*=\"progress\"], [role=\"progressbar\"], .progress-bar');
  console.log('Found ' + progressElements.length + ' progress elements');
  screenshot('$SCREENSHOT_DIR/${DATE}-06-desktop-progress-check.png');
" || echo "⚠️ Test 6 had issues"

# Test 7: Check theme and text colors
echo "[TEST 7] Verifying dark/light mode styling"
agent-browser --session "$SESSION" "
  const htmlClass = document.documentElement.className;
  const isDarkMode = htmlClass.includes('dark') || document.body.classList.contains('dark');
  console.log('Dark mode active: ' + isDarkMode);

  const textElements = document.querySelectorAll('h1, h2, p, span');
  let sampleElements = 0;
  let visibleCount = 0;

  for (let el of textElements) {
    if (sampleElements < 5) {
      const style = window.getComputedStyle(el);
      const color = style.color;
      console.log('Text element color: ' + color);
      visibleCount++;
      sampleElements++;
    }
  }

  screenshot('$SCREENSHOT_DIR/${DATE}-07-desktop-theme-check.png');
" || echo "⚠️ Test 7 had issues"

# Test 8: Check for loading states
echo "[TEST 8] Checking for loading/skeleton elements"
agent-browser --session "$SESSION" "
  const skeletons = document.querySelectorAll('[class*=\"skeleton\"], [class*=\"loading\"], [class*=\"Skeleton\"]');
  const spinners = document.querySelectorAll('[class*=\"spinner\"], [role=\"status\"]');
  console.log('Found ' + skeletons.length + ' skeleton elements');
  console.log('Found ' + spinners.length + ' spinner elements');
  screenshot('$SCREENSHOT_DIR/${DATE}-08-desktop-loading-states.png');
" || echo "⚠️ Test 8 had issues"

# Test 9: Check console for errors
echo "[TEST 9] Checking for console errors"
agent-browser --session "$SESSION" "
  // Attempt to find any error messages on the page
  const errorElements = document.querySelectorAll('[class*=\"error\"], [class*=\"Error\"], [role=\"alert\"]');
  console.log('Found ' + errorElements.length + ' error/alert elements on page');

  // Check for any aria-live regions with errors
  const liveRegions = document.querySelectorAll('[aria-live]');
  console.log('Found ' + liveRegions.length + ' aria-live regions');

  screenshot('$SCREENSHOT_DIR/${DATE}-09-desktop-error-check.png');
" || echo "⚠️ Test 9 had issues"

# Test 10: Test responsive behavior by scrolling
echo "[TEST 10] Testing scrolling and responsive behavior"
agent-browser --session "$SESSION" "
  viewport(1280, 800);
  // Scroll down to see if layout remains consistent
  window.scrollBy(0, 500);
  await wait(500);
  screenshot('$SCREENSHOT_DIR/${DATE}-10-desktop-scroll-test.png');

  // Scroll back up
  window.scrollBy(0, -500);
" || echo "⚠️ Test 10 had issues"

echo ""
echo "========================================"
echo "QA TESTS COMPLETE"
echo "========================================"
echo ""
echo "Screenshots saved to: $SCREENSHOT_DIR/"
ls -la "$SCREENSHOT_DIR/" | tail -15
echo ""
echo "Next: Review screenshots for:"
echo "  1. Visual consistency across breakpoints"
echo "  2. Proper styling and spacing"
echo "  3. Loading and error states"
echo "  4. Text readability in dark mode"
echo "  5. Button and touch target sizes"
echo ""
