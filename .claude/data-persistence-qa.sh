#!/bin/bash

# Data Persistence & State Management QA Testing
# Test Account: e2e-test-1769300679838@mybrain.test / ClaudeTest123
# URL: https://my-brain-gules.vercel.app

set -e

REPORT_DIR="/c/Users/NewAdmin/Desktop/PROJECTS/myBrain/.claude/reports"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
REPORT_FILE="$REPORT_DIR/qa-data-persistence-$TIMESTAMP.md"

mkdir -p "$REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Data Persistence & State Management QA Report

**Generated:** $(date)
**Test Account:** e2e-test-1769300679838@mybrain.test
**Environment:** https://my-brain-gules.vercel.app

---

## Quick Summary

| Category | Pass | Fail | Pending |
|----------|------|------|---------|
| Create → Refresh | ? | ? | ? |
| Logout/Login | ? | ? | ? |
| Browser Close/Reopen | ? | ? | ? |
| Form State | ? | ? | ? |
| Filter/Sort | ? | ? | ? |
| Scroll Position | ? | ? | ? |
| Theme Persistence | ? | ? | ? |
| Sidebar State | ? | ? | ? |
| Multi-Tab Sync | ? | ? | ? |
| Optimistic Updates | ? | ? | ? |
| Data Integrity | ? | ? | ? |
| Concurrent Edits | ? | ? | ? |

---

## Detailed Test Results

### Category A: Create → Refresh → Verify

#### A1: Task Creation and Refresh
- **Test:** Create task > Note details > F5 refresh > Verify task exists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### A2: Note Creation and Refresh
- **Test:** Create note > Navigate away > Refresh > Verify note exists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### A3: Project Creation and Refresh
- **Test:** Create project > Set properties > Refresh > Verify all data
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### A4: Event Creation and Refresh
- **Test:** Create calendar event > Add details > Refresh > Verify event persists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### A5: Profile Changes and Refresh
- **Test:** Update profile > Change avatar/name > Refresh > Verify changes
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### A6: Settings Changes and Refresh
- **Test:** Change settings > Modify preferences > Refresh > Verify settings saved
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

### Category B: Create → Logout → Login → Verify

#### B1: Task Persistence After Logout
- **Test:** Create task > Logout > Login > Verify task still exists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### B2: Note Persistence After Logout
- **Test:** Create note > Logout > Login > Verify note exists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### B3: Project Persistence After Logout
- **Test:** Create project > Logout > Login > Verify project exists
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### B4: User State Restoration
- **Test:** Check theme, sidebar, settings after logout/login
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

### Category C: Create → Close Browser → Reopen → Verify

#### C1: Session Restoration
- **Test:** Create items > Close browser > Reopen > Login > Verify items
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### C2: Local Storage Preservation
- **Test:** Check localStorage keys persist across browser restart
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

### Category D: Form State & Navigation

#### D1: Form State Preservation
- **Test:** Start filling form > Navigate away > Come back > Check data
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### D2: Filter/Sort State
- **Test:** Apply filters on list > Navigate to other page > Return > Filters still applied?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### D3: Scroll Position
- **Test:** Scroll down long list > Click item > Go back > Check scroll position
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### D4: Theme Persistence
- **Test:** Set dark mode > Refresh > Check dark > Logout/Login > Check dark
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### D5: Sidebar State
- **Test:** Collapse sidebar > Navigate pages > Sidebar stays collapsed?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

### Category E: Real-time & Concurrency

#### E1: Multi-Tab Sync
- **Test:** Open app in 2 tabs > Create item in tab 1 > Does tab 2 update?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### E2: Optimistic Updates
- **Test:** Create item > Does it appear immediately? Or wait for server?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### E3: Concurrent Edits
- **Test:** Open same item in 2 tabs > Edit both > Save both > Which wins?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

### Category F: Data Integrity

#### F1: Edit Verification
- **Test:** Edit task > Refresh > Changes persisted?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

#### F2: Delete Verification
- **Test:** Delete task > Refresh > Task gone?
- **Status:** PENDING
- **Evidence:** (To be captured)
- **Issues:** None reported yet

---

## Issues Found

| ID | Severity | Category | Description | Steps to Reproduce | Expected | Actual | Status |
|----|-----------|-----------|-----------|----|----------|--------|---------|
| | | | | | | | |

---

## Recommendations

*To be populated based on findings*

---

## Test Execution Notes

- Started: $(date)
- Environment: Production (https://my-brain-gules.vercel.app)
- Account: e2e-test-1769300679838@mybrain.test
- Manual testing with evidence collection

EOF

echo "Report template created: $REPORT_FILE"
echo ""
echo "Manual Testing Instructions:"
echo "============================"
echo ""
echo "1. Open: https://my-brain-gules.vercel.app"
echo "2. Login with: e2e-test-1769300679838@mybrain.test / ClaudeTest123"
echo ""
echo "Test Sequence A: Create → Refresh → Verify"
echo "  - Create a task with title 'QA-Test-Task-$(date +%s)'"
echo "  - Note the task ID and all properties"
echo "  - Press F5 to hard refresh"
echo "  - Verify the task still exists with same properties"
echo ""
echo "Test Sequence B: Create → Logout → Login"
echo "  - Create multiple items (task, note, project)"
echo "  - Click Logout"
echo "  - Login again with same account"
echo "  - Verify all items still exist"
echo ""
echo "Test Sequence C: Theme Persistence"
echo "  - Set dark mode"
echo "  - Refresh page (F5)"
echo "  - Verify still in dark mode"
echo "  - Logout and login again"
echo "  - Verify still in dark mode"
echo ""
echo "Report will be saved to: $REPORT_FILE"

