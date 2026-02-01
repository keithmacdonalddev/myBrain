#!/bin/bash

# Console QA Testing Script
# Systematically tests all pages for console errors

SESSION="console-qa"
BASE_URL="https://my-brain-gules.vercel.app"
REPORT_FILE=".claude/reports/qa-console-$(date +%Y%m%d-%H%M%S).md"
mkdir -p ".claude/reports"

echo "Starting Console QA Testing..."
echo "Test Account: claude-test-user@mybrain.test / ClaudeTest123"
echo "Session: $SESSION"
echo ""

# Function to test a page
test_page() {
    local PAGE_NAME=$1
    local URL=$2

    echo "Testing: $PAGE_NAME"
    echo "URL: $URL"
    echo "---"

    # Navigate to page
    agent-browser --session $SESSION open "$URL" 2>&1
    sleep 2

    # Get console output
    echo "Console Messages:"
    agent-browser --session $SESSION console 2>&1
    echo ""

    # Get errors
    echo "Errors:"
    agent-browser --session $SESSION errors 2>&1
    echo ""

    # Get network requests
    echo "Network Requests:"
    agent-browser --session $SESSION network requests 2>&1 | head -20
    echo ""

    # Clear console for next test
    agent-browser --session $SESSION console --clear 2>&1
    echo ""
    echo "=========================================="
    echo ""
}

# Login first
echo "LOGIN PAGE TEST"
test_page "Login" "$BASE_URL/login"

# Fill login form
echo "Attempting login with test credentials..."
agent-browser --session $SESSION find label "Email" fill "claude-test-user@mybrain.test" 2>&1
sleep 1
agent-browser --session $SESSION find label "Password" fill "ClaudeTest123" 2>&1
sleep 1
agent-browser --session $SESSION find role button click --name "Sign In" 2>&1
sleep 3

# Wait for redirect
agent-browser --session $SESSION wait --url "**/dashboard" 2>&1
sleep 2

# Now test each page
test_page "Dashboard" "$BASE_URL/dashboard"

# Tasks page
echo "Opening Tasks page..."
agent-browser --session $SESSION open "$BASE_URL/tasks" 2>&1
sleep 2
test_page "Tasks List" "$BASE_URL/tasks"

# Notes page
echo "Opening Notes page..."
agent-browser --session $SESSION open "$BASE_URL/notes" 2>&1
sleep 2
test_page "Notes List" "$BASE_URL/notes"

# Projects page
echo "Opening Projects page..."
agent-browser --session $SESSION open "$BASE_URL/projects" 2>&1
sleep 2
test_page "Projects" "$BASE_URL/projects"

# Calendar page
echo "Opening Calendar page..."
agent-browser --session $SESSION open "$BASE_URL/calendar" 2>&1
sleep 2
test_page "Calendar" "$BASE_URL/calendar"

# Settings page
echo "Opening Settings page..."
agent-browser --session $SESSION open "$BASE_URL/settings" 2>&1
sleep 2
test_page "Settings" "$BASE_URL/settings"

# Profile page
echo "Opening Profile page..."
agent-browser --session $SESSION open "$BASE_URL/profile" 2>&1
sleep 2
test_page "Profile" "$BASE_URL/profile"

# Inbox page
echo "Opening Inbox page..."
agent-browser --session $SESSION open "$BASE_URL/inbox" 2>&1
sleep 2
test_page "Inbox" "$BASE_URL/inbox"

# Today page
echo "Opening Today page..."
agent-browser --session $SESSION open "$BASE_URL/today" 2>&1
sleep 2
test_page "Today" "$BASE_URL/today"

# Test theme toggle
echo "Testing Dark Mode Toggle..."
agent-browser --session $SESSION console --clear 2>&1
agent-browser --session $SESSION find role button click --name "theme" 2>&1
sleep 2
agent-browser --session $SESSION console 2>&1
echo "Dark mode toggle - Console check completed"
echo ""

# Test creating a task
echo "Testing Task Creation..."
agent-browser --session $SESSION console --clear 2>&1
agent-browser --session $SESSION open "$BASE_URL/tasks" 2>&1
sleep 1
agent-browser --session $SESSION find role button click --name "Add Task" 2>&1 || agent-browser --session $SESSION find role button click --name "New Task" 2>&1 || agent-browser --session $SESSION find role button click --name "Create" 2>&1
sleep 2
agent-browser --session $SESSION console 2>&1
echo ""

echo "Console QA Testing Complete!"
agent-browser --session $SESSION close 2>&1
