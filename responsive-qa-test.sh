#!/bin/bash

# Comprehensive Responsive QA Testing Script
# Tests all breakpoints across all pages
# Saves screenshots for analysis

set -e

TEST_SESSION="responsive-qa"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
SCREENSHOT_DIR=".claude/design/screenshots/qa/responsive"

# Test breakpoints (width x height)
declare -a BREAKPOINTS=(
  "375:812"    # Mobile S (iPhone SE)
  "428:926"    # Mobile L (iPhone 14 Pro Max)
  "768:1024"   # Tablet (iPad)
  "1280:720"   # Desktop (Standard)
  "1920:1080"  # Desktop L (Full HD)
)

# Pages to test
declare -a PAGES=(
  "/"
  "/dashboard"
  "/tasks"
  "/notes"
  "/projects"
  "/calendar"
  "/settings"
  "/profile"
  "/inbox"
  "/today"
)

# Label for breakpoints
declare -A BREAKPOINT_LABELS=(
  ["375:812"]="mobile-s-375px"
  ["428:926"]="mobile-l-428px"
  ["768:1024"]="tablet-768px"
  ["1280:720"]="desktop-1280px"
  ["1920:1080"]="desktop-xl-1920px"
)

# Function to test a single page at a breakpoint
test_page_at_breakpoint() {
  local page=$1
  local width=$2
  local height=$3
  local label=$4

  echo "Testing: $page at ${width}x${height}px (${label})..."

  # Set viewport and navigate
  agent-browser --session "$TEST_SESSION" set viewport "$width" "$height"
  agent-browser --session "$TEST_SESSION" goto "http://localhost:5173${page}"

  # Wait for page to load
  sleep 2

  # Take screenshot
  screenshot_file="${SCREENSHOT_DIR}/${TIMESTAMP}-${label}-${page//\//-}.png"
  agent-browser --session "$TEST_SESSION" screenshot "$screenshot_file"

  echo "✓ Screenshot saved: $screenshot_file"
}

# Initialize session
echo "Initializing agent-browser session: $TEST_SESSION"
agent-browser --session "$TEST_SESSION" init

echo ""
echo "=========================================="
echo "COMPREHENSIVE RESPONSIVE TESTING"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo "Test Session: $TEST_SESSION"
echo "Screenshot Directory: $SCREENSHOT_DIR"
echo ""

# Test each breakpoint across all pages
for breakpoint in "${BREAKPOINTS[@]}"; do
  IFS=':' read -r width height <<< "$breakpoint"
  label="${BREAKPOINT_LABELS[$breakpoint]}"

  echo ""
  echo "--- Testing Breakpoint: ${label} (${width}x${height}) ---"

  for page in "${PAGES[@]}"; do
    test_page_at_breakpoint "$page" "$width" "$height" "$label"
  done
done

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "Screenshots saved to: $SCREENSHOT_DIR"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review screenshots for visual issues"
echo "2. Check for horizontal scrolling"
echo "3. Verify text readability"
echo "4. Test touch targets on mobile"
echo "5. Check navigation responsiveness"
