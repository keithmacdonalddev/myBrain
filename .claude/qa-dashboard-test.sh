#!/bin/bash

# Comprehensive Dashboard QA Testing Script
# Tests the dashboard at multiple widths, themes, and interactions

SESSION="dashboard-qa"
BASE_URL="https://my-brain-gules.vercel.app"
EMAIL="claude-test-user@mybrain.test"
PASSWORD="ClaudeTest123"

echo "========================================="
echo "DASHBOARD QA TEST - STARTING"
echo "========================================="

# Create screenshots directory
mkdir -p .claude/design/screenshots/qa
mkdir -p .claude/design/screenshots/qa/desktop
mkdir -p .claude/design/screenshots/qa/tablet
mkdir -p .claude/design/screenshots/qa/mobile
mkdir -p .claude/reports

# Test 1: Desktop Light Mode (1280px)
echo ""
echo "[1/12] Taking desktop light mode screenshot (1280px)..."
agent-browser launch --headless "$BASE_URL" --session "$SESSION" --width 1280 --height 800 --screenshot .claude/design/screenshots/qa/desktop/2026-01-31-light-1280px.png 2>&1

# Test 2: Desktop Dark Mode (1280px)
echo "[2/12] Testing dark mode toggle and taking desktop dark screenshot..."
agent-browser click --session "$SESSION" '[aria-label="Toggle dark mode"]' 2>&1
sleep 1
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-dark-1280px.png 2>&1

# Test 3: Tablet Light Mode (768px)
echo "[3/12] Taking tablet light mode screenshot (768px)..."
agent-browser launch --headless "$BASE_URL" --session "${SESSION}-tablet" --width 768 --height 1024 --screenshot .claude/design/screenshots/qa/tablet/2026-01-31-light-768px.png 2>&1

# Test 4: Tablet Dark Mode (768px)
echo "[4/12] Testing tablet dark mode..."
agent-browser click --session "${SESSION}-tablet" '[aria-label="Toggle dark mode"]' 2>&1
sleep 1
agent-browser screenshot --session "${SESSION}-tablet" .claude/design/screenshots/qa/tablet/2026-01-31-dark-768px.png 2>&1

# Test 5: Mobile Light Mode (375px)
echo "[5/12] Taking mobile light mode screenshot (375px)..."
agent-browser launch --headless "$BASE_URL" --session "${SESSION}-mobile" --width 375 --height 667 --screenshot .claude/design/screenshots/qa/mobile/2026-01-31-light-375px.png 2>&1

# Test 6: Mobile Dark Mode (375px)
echo "[6/12] Testing mobile dark mode..."
agent-browser click --session "${SESSION}-mobile" '[aria-label="Toggle dark mode"]' 2>&1
sleep 1
agent-browser screenshot --session "${SESSION}-mobile" .claude/design/screenshots/qa/mobile/2026-01-31-dark-375px.png 2>&1

# Test 7: Check console errors
echo "[7/12] Checking for console errors..."
agent-browser console --session "$SESSION" > .claude/reports/console-errors-desktop.txt 2>&1

# Test 8: Check hover states
echo "[8/12] Testing hover states on widgets..."
agent-browser hover --session "$SESSION" '.widget-container' 2>&1
sleep 0.5
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-hover-state.png 2>&1

# Test 9: Test widget interactions
echo "[9/12] Testing quick action buttons..."
agent-browser click --session "$SESSION" '[data-testid="new-task-btn"]' 2>&1
sleep 1
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-new-task-modal.png 2>&1

# Test 10: Test theme toggle
echo "[10/12] Testing theme toggle functionality..."
agent-browser click --session "$SESSION" '[aria-label="Toggle dark mode"]' 2>&1
sleep 0.5
agent-browser click --session "$SESSION" '[aria-label="Toggle dark mode"]' 2>&1
sleep 0.5
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-final-state.png 2>&1

# Test 11: Check accessibility
echo "[11/12] Checking focus indicators..."
agent-browser keyboard --session "$SESSION" "Tab" 2>&1
sleep 0.5
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-focus-state.png 2>&1

# Test 12: Final full page
echo "[12/12] Taking final full-page screenshot..."
agent-browser screenshot --session "$SESSION" .claude/design/screenshots/qa/desktop/2026-01-31-final-full.png 2>&1

echo ""
echo "========================================="
echo "DASHBOARD QA TEST - COMPLETE"
echo "========================================="
echo "Screenshots saved to: .claude/design/screenshots/qa/"
echo "Console output saved to: .claude/reports/console-errors-desktop.txt"

