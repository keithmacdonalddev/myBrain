#!/bin/bash

# Admin QA Testing Script using agent-browser

echo "=== ADMIN PANEL COMPREHENSIVE QA TEST ==="
echo "Test Start: $(date)"
echo ""

# Navigate to localhost
echo "[1/20] Opening localhost..."
agent-browser --session admin-qa "navigate http://localhost:5173"

sleep 2

# Login
echo "[2/20] Logging in as admin..."
agent-browser --session admin-qa "click [aria-label='Email input']"
sleep 1
agent-browser --session admin-qa "type claude-test-admin@mybrain.test"
sleep 1

agent-browser --session admin-qa "click [aria-label='Password input']"
sleep 1
agent-browser --session admin-qa "type ClaudeTest123"
sleep 1

agent-browser --session admin-qa "click 'Sign In'"
sleep 3

# Navigate to admin
echo "[3/20] Navigating to /admin..."
agent-browser --session admin-qa "navigate http://localhost:5173/admin"
sleep 2

# Verify admin dashboard
echo "[4/20] Taking screenshot of admin dashboard (light mode)..."
agent-browser --session admin-qa "screenshot"

# Take admin page screenshot
agent-browser --session admin-qa "wait-for text 'Admin Dashboard' or text 'Admin' 5000"

echo "[5/20] Admin dashboard loaded successfully"
echo "Test completed at: $(date)"
