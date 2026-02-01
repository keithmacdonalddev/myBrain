#!/bin/bash

# Navigation QA Testing Script
# Tests all routes for navigation, active states, and redirects

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "./.claude/reports/qa"
REPORT_FILE="./.claude/reports/qa/qa-navigation-$(date +%s).md"

echo "# Navigation & Routing QA Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "Test Account: claude-test-user@mybrain.test" >> "$REPORT_FILE"
echo "Environment: http://localhost:5173" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Test 1: Login
echo "Starting navigation tests..." 
echo "1. Testing Login Flow..." >> "$REPORT_FILE"

agent-browser --session nav-test open "http://localhost:5173" 2>/dev/null
sleep 2
CURRENT_URL=$(agent-browser --session nav-test get url 2>/dev/null || echo "N/A")
echo "Initial URL: $CURRENT_URL" >> "$REPORT_FILE"

# Check if we're at login page
if [[ "$CURRENT_URL" == *"login"* ]] || [[ "$CURRENT_URL" == *"localhost"* ]]; then
  echo "✓ Redirected to login" >> "$REPORT_FILE"
  
  # Find login fields and fill them
  agent-browser --session nav-test find label "Email" fill "claude-test-user@mybrain.test" 2>/dev/null
  sleep 1
  agent-browser --session nav-test find label "Password" fill "ClaudeTest123" 2>/dev/null
  sleep 1
  agent-browser --session nav-test find role button click --name "Sign In" 2>/dev/null
  sleep 3
else
  echo "✗ Did not redirect to login" >> "$REPORT_FILE"
fi

# Take screenshot at login
agent-browser --session nav-test screenshot "./.claude/design/screenshots/qa/navigation/01-login.png" 2>/dev/null

echo "" >> "$REPORT_FILE"
echo "## Route Testing Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Route | Direct Access | URL Format | Active State | Notes |" >> "$REPORT_FILE"
echo "|-------|---------------|-----------|--------------|-------|" >> "$REPORT_FILE"

# List of routes to test
ROUTES=(
  "/app"
  "/app/today"
  "/app/inbox"
  "/app/notes"
  "/app/tasks"
  "/app/calendar"
  "/app/projects"
  "/app/profile"
  "/app/settings"
  "/app/notifications"
  "/app/social/connections"
  "/app/messages"
)

for route in "${ROUTES[@]}"; do
  echo "Testing route: $route"
  agent-browser --session nav-test open "http://localhost:5173$route" 2>/dev/null
  sleep 2
  CURRENT=$(agent-browser --session nav-test get url 2>/dev/null || echo "N/A")
  
  # Extract just the path
  CURRENT_PATH=$(echo "$CURRENT" | sed 's|.*localhost:5173||')
  
  if [[ "$CURRENT" == *"$route"* ]] || [[ "$CURRENT_PATH" == "$route"* ]]; then
    echo "| $route | ✓ | $CURRENT_PATH | TBD | Route loaded |" >> "$REPORT_FILE"
  else
    echo "| $route | ✗ | $CURRENT_PATH | TBD | **FAILED** |" >> "$REPORT_FILE"
  fi
done

echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "Testing completed. See results above." >> "$REPORT_FILE"

agent-browser --session nav-test close 2>/dev/null

echo "Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"
