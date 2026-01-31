#!/bin/bash

# Phase 5 Visual Verification Screenshot Task
# Takes full-page screenshots of all Phase 5 pages in light mode
# Login with test account, navigate to each page, capture screenshots

SCREENSHOT_DIR="C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\design\screenshots\phase5-visual-verify"
PROD_URL="https://my-brain-gules.vercel.app"
TEST_EMAIL="claude-test-user@mybrain.test"
TEST_PASSWORD="ClaudeTest123"

echo "Starting Phase 5 Visual Verification Screenshots..."
echo "Using test account: $TEST_EMAIL"
echo "Output directory: $SCREENSHOT_DIR"
echo ""

# Start agent-browser session
export AGENT_BROWSER_SESSION=phase5-verify
export AGENT_BROWSER_PROFILE="$HOME/.mybrain-phase5-profile"

# Function to log step
log_step() {
  echo "[$(date '+%H:%M:%S')] $1"
}

# Function to take screenshot
take_screenshot() {
  local page_name=$1
  local url=$2
  
  log_step "Navigating to: $url"
  agent-browser open "$url" --profile "$AGENT_BROWSER_PROFILE"
  
  log_step "Setting light mode..."
  agent-browser set media light
  
  log_step "Waiting for page to load..."
  agent-browser wait --load networkidle
  
  log_step "Taking screenshot: $page_name"
  agent-browser screenshot --full "$SCREENSHOT_DIR/$page_name-light.png"
  
  if [ $? -eq 0 ]; then
    log_step "✓ Screenshot saved: $page_name-light.png"
  else
    log_step "✗ Failed to save screenshot: $page_name-light.png"
  fi
}

# Step 1: Navigate to login page
log_step "Opening app..."
agent-browser open "$PROD_URL" --profile "$AGENT_BROWSER_PROFILE"
agent-browser wait --load networkidle

# Step 2: Login
log_step "Logging in with test credentials..."
agent-browser find label "Email" fill "$TEST_EMAIL"
agent-browser find label "Password" fill "$TEST_PASSWORD"
agent-browser find role button click --name "Sign In"
log_step "Waiting for dashboard to load..."
agent-browser wait --url "**/app" --load networkidle

# Step 3: Take screenshots of all pages
log_step ""
log_step "=== Taking Screenshots of All Phase 5 Pages ==="
log_step ""

# Enable V2 flag if needed for Dashboard V2
log_step "Setting light mode globally..."
agent-browser set media light

# Page 1: Dashboard V2 (with V2 flag)
take_screenshot "01-dashboard-v2" "$PROD_URL/app?v2=true"
agent-browser wait 2000

# Page 2: Today page
take_screenshot "02-today" "$PROD_URL/app/today"
agent-browser wait 2000

# Page 3: Tasks page
take_screenshot "03-tasks" "$PROD_URL/app/tasks"
agent-browser wait 2000

# Page 4: Notes page
take_screenshot "04-notes" "$PROD_URL/app/notes"
agent-browser wait 2000

# Page 5: Projects page
take_screenshot "05-projects" "$PROD_URL/app/projects"
agent-browser wait 2000

# Page 6: Calendar page
take_screenshot "06-calendar" "$PROD_URL/app/calendar"
agent-browser wait 2000

# Page 7: Settings page
take_screenshot "07-settings" "$PROD_URL/app/settings"
agent-browser wait 2000

# Page 8: Profile page
take_screenshot "08-profile" "$PROD_URL/app/profile"
agent-browser wait 2000

# Page 9: Inbox page (if it exists)
take_screenshot "09-inbox" "$PROD_URL/app/inbox"
agent-browser wait 2000

# Close browser
log_step "Closing browser..."
agent-browser close

log_step ""
log_step "=== Phase 5 Screenshot Verification Complete ==="
log_step "Screenshots saved to: $SCREENSHOT_DIR"
log_step ""
log_step "Next steps:"
log_step "1. Review screenshots for visual issues"
log_step "2. Check text readability in light mode"
log_step "3. Verify colors and contrast"
log_step "4. Report any broken layouts or missing elements"

