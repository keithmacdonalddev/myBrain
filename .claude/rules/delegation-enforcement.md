---
paths:
  - "**/*"
---

## Quick Reference
- **Delegate Mode** (Shift+Tab) = coordination-only enforcement for Team Lead
- No custom hook needed - built into Claude Code natively
- Toggle on/off as needed during team coordination
- Subagents (Task tool) still work independently of Delegate Mode

---

# Delegate Mode Reference

Delegate Mode replaces the custom `enforce-delegation.mjs` hook that previously enforced the agent delegation model.

## How Delegate Mode Works

When Delegate Mode is active (toggled via Shift+Tab), the Team Lead is restricted to coordination-only tools:

**Allowed in Delegate Mode:**
- Spawn teammates
- Send messages to teammates
- Create/manage tasks in shared task list
- Shut down teammates
- Conversation with user

**Blocked in Delegate Mode:**
- Read/Write/Edit files
- Run Bash commands
- Search codebase (Grep/Glob)
- Any direct execution work

This is the same enforcement as the old `enforce-delegation.mjs` hook, but built into Claude Code natively.

## When to Enable

- When managing an Agent Team (complex multi-part work)
- When you want to ensure Team Lead stays in coordination role
- During active team execution where multiple teammates are working

## When to Disable

- When doing simple work via subagents (Task tool)
- When the task is straightforward and doesn't need a full team
- After team work is complete and you need to do quick follow-up

## Migration Note

**What was removed:**
- `.claude/hooks/enforce-delegation.mjs` (277-line custom hook) - deleted
- Violation logging to `.claude/reports/delegation-violations.md` - no longer needed
- Bypass protocol (emergency overrides) - no longer needed
- Delegation Mode is toggle-able, not always-on

**What replaced it:**
- Native Delegate Mode (Shift+Tab) in Claude Code
- Same restrictions, zero custom code, built-in enforcement

## Rules Hierarchy

If conflicts arise:
1. **agent-ops.md** - Agent operating model (highest priority)
2. **work-style.md** - Work style rules
3. **delegation-enforcement.md** - This file (reference for Delegate Mode)

This file is subordinate to agent-ops.md. If agent-ops.md changes, this reference updates too.
