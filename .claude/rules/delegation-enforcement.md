---
paths:
  - "**/*"
---

## Quick Reference

- **Core Rule:** Main Claude NEVER uses Read, Grep, Glob, Bash, Edit, Write directly
- **Why:** These block conversation; must be delegated to agents via Task tool
- **Allowed coordination tools:** Task, TaskOutput, TodoWrite, AskUserQuestion (no delegation needed)
- **Enforcement:** Automated via `enforce-delegation.mjs` hook
- **User Bypass:** Can be approved for emergencies, time-limited (typically 30 min)
- **Violation logs:** `.claude/reports/delegation-violations.md`
- **Bypass logs:** `.claude/reports/delegation-bypasses.md`

---

# Delegation Enforcement

This rule enforces the non-blocking agent delegation model that requires Main Claude to stay available for conversation while delegating all execution work to background agents.

## Context

**Session 2026-01-31:** Main Claude directly edited files multiple times instead of delegating to agents. This violated the core architecture principle and broke conversational availability. This rule with automated enforcement prevents future violations.

## The Core Prohibition

Main Claude MUST NOT directly invoke these tools:
- `Read` - File reading must be delegated
- `Grep` - Code searching must be delegated
- `Glob` - File pattern matching must be delegated
- `Bash` - Command execution must be delegated
- `Edit` - File editing must be delegated
- `Write` - File writing must be delegated

**Reason:** These operations block Main Claude and prevent conversation continuation. The entire point of the agent delegation model is that Main Claude stays available to talk to the user.

## What IS Allowed (No Delegation Needed)

These tools can be used directly by Main Claude without delegation:

| Tool | Reason |
|------|--------|
| Task | Creates agents to do work (this is delegation) |
| TaskOutput | Reads results from agents (coordination, not execution) |
| TodoWrite | Manages task lists (coordination, not execution) |
| AskUserQuestion | Asks for clarification (coordination, not execution) |
| NotebookEdit | Editing Jupyter notebooks (specialized, rarely needed) |
| Skill | Invoking skills (these launch in background) |

These are coordination/management tools, not execution tools.

## When You Need to Use a Restricted Tool

Instead of using it directly, follow this pattern:

**DON'T:**
```
Read(file_path: "src/components/Button.jsx")
[Claude reads the file]
Edit(file_path: "src/components/Button.jsx", old_string: "...", new_string: "...")
[Claude edits the file]
```

**DO:**
```
Task(description: "Read src/components/Button.jsx, find the color prop handler, and update it to support theme variables. Create test file if needed.")
[Agent does the work in background]
[Claude stays available for conversation]
```

## Enforcement Mechanism

A hook (`enforce-delegation.mjs`) runs after every tool invocation:

1. **Detection:** Monitors if Main Claude used a restricted tool
2. **Checking:** Verifies if bypass is active (user-approved emergency exception)
3. **Logging:** Records violations to `.claude/reports/delegation-violations.md`
4. **Warning:** Displays message that Claude sees, reminding of the rule
5. **Bypasses:** Tracks any user-approved emergency bypasses

### Violation Logging

Violations are automatically logged with:
- Timestamp (ISO 8601)
- Tool name (Read, Grep, Bash, etc.)
- Description of what was being read/edited
- Status

All violations are logged regardless of bypass status (so user can see patterns).

## User Bypass Protocol

For genuine emergencies where Main Claude needs to directly use a restricted tool:

### Step 1: Request Bypass
```
I need to temporarily bypass delegation to [tool] because [specific emergency reason].
User, please approve a 30-minute bypass for [tool].
```

**What counts as emergency:**
- Production data corruption discovered that needs immediate investigation
- Critical security vulnerability requiring urgent analysis
- System broken in a way that blocks all other work
- User explicitly requests Main Claude handle it directly

**What does NOT count as emergency:**
- "This will be faster if I do it directly"
- "I don't feel like writing a Task description"
- "Just need to quickly check this one file"

### Step 2: User Approval
User grants bypass in conversation:
```
Bypass approved: Read for 30 minutes.
Reason: Data corruption investigation needed.
```

### Step 3: Logging
Claude logs the bypass:
- Timestamp granted
- Tool
- Reason provided by user
- Duration
- Status (Active)

### Step 4: Automatic Expiration
Bypass automatically expires after specified duration. If Main Claude tries to use the tool after expiration, the hook flags it as a violation.

### Step 5: Session Documentation
At session end, document in session notes:
- Why bypass was needed
- What was accomplished
- Whether it should happen again

## Bypass Conditions

| Duration | Use Case |
|----------|----------|
| 5 minutes | Quick validation check |
| 15 minutes | Investigation + fix |
| 30 minutes | Complex emergency |
| Longer | Shouldn't be needed (escalate to regular workflow) |

**Default:** 30 minutes if user doesn't specify

**Maximum:** 60 minutes (longer bypasses indicate the work should be delegated instead)

## What the Hook Actually Does

The `enforce-delegation.mjs` hook:

1. **Runs:** After every tool invocation (PostToolUse event)
2. **Checks:** If tool is in restricted list (Read, Grep, Glob, Bash, Edit, Write)
3. **Detects:** Whether Main Claude or an agent used it
4. **Validates:** Is there an active bypass for this tool?
5. **Logs:** Creates violation entry if no bypass
6. **Warns:** Outputs message to Claude's context
7. **Exits:** Allows work to continue (hook doesn't block execution, just warns)

### Bypass Validation Logic

```
IF tool in [Read, Grep, Glob, Bash, Edit, Write]
  AND agent_type NOT set (means Main Claude)
  THEN check bypass file
    IF bypass exists AND timestamp + duration > now
      THEN allow and log usage
    ELSE flag violation and warn
```

## Violation Reports

### .claude/reports/delegation-violations.md

Contains table of all violations:

| Timestamp | Tool | Description | Status |
|-----------|------|-------------|--------|
| 2026-01-31T14:22:45Z | Read | Read file: src/pages/Dashboard.jsx | Logged - User intervention needed |
| 2026-01-31T14:25:12Z | Edit | Edit file: src/components/Button.jsx | Logged - User intervention needed |

**Review this:** Once per week to identify patterns
**Action if violations exist:** Discuss with Claude why delegation wasn't used

### .claude/reports/delegation-bypasses.md

Contains table of approved bypasses:

| Granted | Tool | Reason | Duration | Status |
|---------|------|--------|----------|--------|
| 2026-01-31 14:00 | Read | Production data corruption found | 30 min | Active |
| 2026-01-31 14:31 | Edit | Corruption fix | 30 min | Expired |

**Status meanings:**
- `Active` - Bypass still valid
- `Expired` - Duration has passed
- `Used` - Bypass was used during its active window

## Interaction with Agent Delegation Rules

This rule **reinforces** (not replaces) the rules in:
- `.claude/rules/agent-ops.md` - Agent operating model (authoritative)
- `.claude/rules/work-style.md` - Agent delegation requirements

**Relationship:**
- `agent-ops.md` and `work-style.md`: Define why and how delegation works
- `delegation-enforcement.md`: Automated technical enforcement
- `enforce-delegation.mjs`: Hook that makes enforcement automatic

## If Hook Flags You

If you see a delegation violation warning:

1. **Acknowledge** the flag in conversation
2. **Delegate** the work - create a Task agent instead
3. **Explain** why you used the tool directly (if not obvious)
4. **Request bypass** if it was a genuine emergency
5. **Learn** from pattern - see if you're missing good reasons to delegate

## Integration with Session Notes

The hook doesn't interact with session logging. Violations are:
- Flagged by enforcement hook
- Logged to violations.md
- Visible in Claude's warning message
- Up to user to review and discuss

This is intentional - Claude should handle violations in real-time conversation, not auto-fix.

## Maintenance

### For Claude
- Check violations.md weekly during review
- Look for patterns (e.g., always doing reads directly)
- Use as learning signal about delegation habits

### For User
- Review violations.md if pattern emerges
- Provide feedback on when bypasses are legitimately needed
- Help Claude understand what counts as emergency

### For Developers
- Hook logic is in `enforce-delegation.mjs`
- Violation file: `.claude/reports/delegation-violations.md`
- Bypass file: `.claude/reports/delegation-bypasses.md`
- Hook runs automatically (no configuration needed)

## Edge Cases

### Agent Tool Usage
Agents can use ANY tools freely - this rule only applies to Main Claude.
Hook checks `agent_type` - if set, tool is allowed regardless of type.

### Nested Delegations
When Task creates an agent, that agent uses tools. This is fine.
Example: Task → Agent A reads file → Agent A creates Task for Agent B → Agent B writes file
All of this is compliant because Main Claude only used Task.

### Multiple Tools in Task Description
One Task can describe work requiring multiple tools:
```
Task(description: "Read src/api/auth.js, check for security issues with password validation,
  update the regex pattern to follow OWASP standards, add comments explaining the fix.")
```
Agent will use Read, Grep, Edit as needed. All OK because Main Claude delegated via one Task.

### Coordination Tools
Task, TaskOutput, TodoWrite, AskUserQuestion bypass the enforcement entirely.
These are coordination - explicitly allowed.

## Rules Hierarchy

If conflicts arise:
1. **agent-ops.md** - Agent operating model (highest priority)
2. **work-style.md** - Work style rules
3. **delegation-enforcement.md** - This file (implements enforcement of above)

This file is subordinate to agent-ops.md. If agent-ops.md changes, this rule changes too.
