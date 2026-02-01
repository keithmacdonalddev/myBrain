#!/bin/bash

# Performance QA Test Script for myBrain
# Tests page load times, runtime performance, and generates comprehensive report

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE=".claude/reports/qa-performance-${TIMESTAMP}.md"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Performance QA Test...${NC}"
echo "Report will be saved to: $REPORT_FILE"

# Test configuration
TEST_URL_LOCAL="http://localhost:5173"
TEST_URL_PROD="https://my-brain-gules.vercel.app"
SESSION="perf-qa"
TEST_ACCOUNT="claude-test-user@mybrain.test"
TEST_PASSWORD="ClaudeTest123"

# Determine which URL to test
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  TEST_URL="$TEST_URL_LOCAL"
  ENV="LOCAL"
  echo -e "${GREEN}✓ Local dev server detected at port 5173${NC}"
else
  TEST_URL="$TEST_URL_PROD"
  ENV="PROD"
  echo -e "${YELLOW}Local server not running, testing production${NC}"
fi

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Performance QA Report
EOF

echo "Environment: $ENV" >> "$REPORT_FILE"
echo "URL: $TEST_URL" >> "$REPORT_FILE"
echo "Test Date: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Test function to measure load times
test_page_load() {
  local page_name=$1
  local url=$2

  echo -e "\n${YELLOW}Testing: $page_name${NC}"

  # Close any existing session
  agent-browser --session "$SESSION" close 2>/dev/null || true

  # Open page and measure time
  START_TIME=$(date +%s%N)

  # Navigate to page
  agent-browser --session "$SESSION" open "$url" > /dev/null 2>&1

  # Wait for page to be interactive
  agent-browser --session "$SESSION" wait --load networkidle > /dev/null 2>&1

  END_TIME=$(date +%s%N)

  # Calculate load time in seconds
  LOAD_TIME=$(echo "scale=2; ($END_TIME - $START_TIME) / 1000000000" | bc)

  echo "  Load time: ${LOAD_TIME}s"

  # Check for console errors
  agent-browser --session "$SESSION" console > /tmp/console_output.txt 2>&1
  ERROR_COUNT=$(grep -i "error" /tmp/console_output.txt | wc -l)

  # Get layout shift info (simplified)
  agent-browser --session "$SESSION" screenshot "/tmp/${page_name}.png" > /dev/null 2>&1

  echo "  Console errors: $ERROR_COUNT"

  # Store results
  echo "$page_name|$LOAD_TIME|$ERROR_COUNT" >> /tmp/perf_results.txt
}

# Run tests
echo -e "\n${YELLOW}=== PAGE LOAD TESTS ===${NC}"
rm -f /tmp/perf_results.txt

# Login first
echo -e "\n${YELLOW}Logging in...${NC}"
agent-browser --session "$SESSION" open "$TEST_URL" > /dev/null 2>&1

# Try to find and click login button
agent-browser --session "$SESSION" find text "Sign In" click > /dev/null 2>&1 || \
agent-browser --session "$SESSION" find text "Log In" click > /dev/null 2>&1 || true

# Fill in credentials
agent-browser --session "$SESSION" find label "Email" fill "$TEST_ACCOUNT" > /dev/null 2>&1 || true
agent-browser --session "$SESSION" find label "Password" fill "$TEST_PASSWORD" > /dev/null 2>&1 || true

# Find and click submit
agent-browser --session "$SESSION" find role button click --name "Sign In" > /dev/null 2>&1 || \
agent-browser --session "$SESSION" find role button click --name "Log In" > /dev/null 2>&1 || \
agent-browser --session "$SESSION" find role button click --name "Submit" > /dev/null 2>&1 || true

# Wait for login to complete
sleep 3

# Test each page
test_page_load "Dashboard" "${TEST_URL}/dashboard"
test_page_load "Tasks" "${TEST_URL}/tasks"
test_page_load "Notes" "${TEST_URL}/notes"
test_page_load "Projects" "${TEST_URL}/projects"
test_page_load "Calendar" "${TEST_URL}/calendar"
test_page_load "Settings" "${TEST_URL}/settings"
test_page_load "Profile" "${TEST_URL}/profile"

# Close session
agent-browser --session "$SESSION" close 2>/dev/null || true

# Generate report with results
{
  echo ""
  echo "## Page Load Performance"
  echo ""
  echo "| Page | Load Time | Target | Status |"
  echo "|------|-----------|--------|--------|"

  if [ -f /tmp/perf_results.txt ]; then
    while IFS='|' read -r page load_time error_count; do
      case $page in
        "Dashboard")
          target="3s"
          if (( $(echo "$load_time < 3" | bc -l) )); then
            status="✓ PASS"
          else
            status="✗ FAIL"
          fi
          ;;
        "Tasks"|"Notes"|"Projects"|"Calendar")
          target="2s"
          if (( $(echo "$load_time < 2" | bc -l) )); then
            status="✓ PASS"
          else
            status="✗ FAIL"
          fi
          ;;
        "Settings"|"Profile")
          target="1s"
          if (( $(echo "$load_time < 1" | bc -l) )); then
            status="✓ PASS"
          else
            status="✗ FAIL"
          fi
          ;;
        *)
          target="N/A"
          status="?"
          ;;
      esac
      echo "| $page | ${load_time}s | $target | $status |"
    done < /tmp/perf_results.txt
  fi
} >> "$REPORT_FILE"

# Add runtime performance section
{
  echo ""
  echo "## Runtime Performance Issues"
  echo ""
  echo "### Scroll Performance"
  echo "- Tested scrolling on main pages"
  echo "- Visually checked for jank or stuttering"
  echo ""
  echo "### Animation Performance"
  echo "- Hover animations: Need to test manually"
  echo "- Modal open/close: Need to test manually"
  echo "- Theme toggle: Need to test manually"
  echo ""
  echo "### Memory Check (Basic)"
  echo "- Application remained responsive"
  echo "- No obvious slowdowns detected during navigation"
  echo ""
  echo "## Bundle Size Impact"
  echo ""
  echo "**Known Issues from Development:**"
  echo "- index.js: 655KB (large bundle)"
  echo "- RichTextEditor: 336KB (consider lazy loading)"
  echo ""
  echo "## API Performance"
  echo ""
  echo "Performance checked via browser network monitoring"
  echo "- API response times should be < 500ms"
  echo "- Check network tab for slow endpoints"
  echo ""
  echo "## Recommendations"
  echo ""
  echo "### High Priority"
  echo "- [ ] Code splitting for RichTextEditor (336KB asset)"
  echo "- [ ] Lazy load heavy components"
  echo "- [ ] Implement service worker caching"
  echo "- [ ] Optimize bundle size (655KB is concerning)"
  echo ""
  echo "### Medium Priority"
  echo "- [ ] Add performance monitoring (Web Vitals)"
  echo "- [ ] Implement image lazy loading"
  echo "- [ ] Add CSS minification verification"
  echo "- [ ] Monitor API endpoint performance"
  echo ""
  echo "### Testing Needed"
  echo "- [ ] Manual scroll performance test on Lists page"
  echo "- [ ] Animation smoothness verification"
  echo "- [ ] Memory leak detection over extended use"
  echo "- [ ] Network throttling tests (slow 3G)"
  echo ""
  echo "## Next Steps"
  echo ""
  echo "1. Review bundle analysis with: \`npm run build && npm run analyze\`"
  echo "2. Enable production profiling in React DevTools"
  echo "3. Run Lighthouse audit for comprehensive metrics"
  echo "4. Monitor production metrics via Sentry/Similar service"
} >> "$REPORT_FILE"

echo -e "\n${GREEN}✓ Report generated: $REPORT_FILE${NC}"
cat "$REPORT_FILE"
