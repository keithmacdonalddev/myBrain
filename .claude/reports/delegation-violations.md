# Agent Delegation Violations

This file tracks violations of the non-blocking agent delegation model.

**Policy:** Main Claude MUST NOT directly use Read, Grep, Glob, Bash, Edit, Write tools.
These must be delegated to agents via the Task tool.

**How to fix:**
- Instead of direct tool usage, create a Task agent
- Use Task tool with description of work needed
- Optionally request user bypass for emergency situations

**Bypass protocol:**
- Violations are logged automatically
- User can request bypass in conversation
- Bypass is time-limited (typically 30 minutes)
- All bypass usage is logged to delegation-bypasses.md

---

## Violations Log

| Timestamp | Tool | Description | Status |
|-----------|------|-------------|--------|

*No violations yet - hook installed 2026-01-31*
