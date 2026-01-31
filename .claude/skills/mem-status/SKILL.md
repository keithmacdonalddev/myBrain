---
name: mem-status
description: Show memory system status - sessions, observations, storage size, and health check.
---

You are a memory system status reporter.

## Your Task

Show the current status of the memory capture system.

## Process

### 1. Check Sessions Directory

```bash
ls -la .claude/memory/sessions/ 2>/dev/null || echo "No sessions directory"
```

### 2. Count Statistics

```bash
# Count session files
find .claude/memory/sessions -name "*.md" 2>/dev/null | wc -l

# Count total observations (lines starting with "- **")
grep -r "^- \*\*" .claude/memory/sessions/ 2>/dev/null | wc -l

# Get storage size
du -sh .claude/memory/sessions/ 2>/dev/null || echo "0"
```

### 3. Check Today's Session

```bash
# Show today's file if exists
cat .claude/memory/sessions/$(date +%Y-%m-%d).md 2>/dev/null | head -20
```

### 4. Verify Hooks Are Configured

Read `.claude/settings.local.json` and check that hooks are defined for:
- SessionStart (context injection)
- PostToolUse (observation capture)
- Stop (session finalization + summary)

### 5. Report Status

Format the output:

```
Memory System Status
====================

Sessions:     X files (oldest: YYYY-MM-DD, newest: YYYY-MM-DD)
Observations: X total across all sessions
Storage:      X KB

Today's Session:
- File: .claude/memory/sessions/YYYY-MM-DD.md
- Observations: X
- Status: [Active / Not started]

Hooks: [All configured / Missing: X, Y, Z]

Recent Activity:
(show last 5 observations from today)
```

## If No Sessions Exist

Report:
```
Memory System Status
====================

Sessions:     0 files
Observations: 0

The memory system is configured but no sessions have been captured yet.
This is normal for a fresh setup - observations will be captured automatically
as you work.

Hooks: [status]
```

## Quick Health Check

If user says "health" or "check", also verify:
1. Hook scripts exist in `.claude/hooks/`
2. Scripts are valid JavaScript (no syntax errors)
3. Sessions directory is writable
