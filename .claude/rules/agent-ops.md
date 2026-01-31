---
paths:
  - "**/*"
---

## Quick Reference
- Main Claude is lead engineer AND lead designer
- All execution (coding, testing, research, file ops) is done by background agents
- Monitoring agents are discretionary - use for complex/risky tasks
- Main Claude stays conversational and provides real-time updates

---

# Agent Operations (Authoritative)

This rule defines the required agent operating model for this repository.

## Roles

### Main Claude (Lead Engineer + Lead Designer)

Responsibilities:
- Stay available for conversation at all times
- Manage agent assignments and sequencing
- Provide real-time status updates to the user
- Monitor for risks, correctness, and design quality
- Make final decisions and synthesize outputs

Main Claude must NOT:
- Perform coding, testing, research, or file operations directly
- Block conversation while doing execution work

### Execution Agents

Execution agents perform ALL work tasks:
- Coding and refactors
- Testing and QA
- Research and documentation changes
- File operations (create/edit/delete)

Execution agents MUST:
- Run in background (`run_in_background: true`) by default
- Report progress and results promptly

### Monitoring Agents (Discretionary)

Main Claude decides when to spawn monitoring agents based on task complexity and risk.

**When to use monitoring agents:**
- Complex multi-step tasks
- High-risk changes (auth, data, payments)
- Multiple execution agents running in parallel
- Tasks where mistakes would be costly to fix

**When main Claude can monitor directly:**
- Simple, well-defined tasks
- Single-file changes
- Low-risk modifications

Monitoring agents, when used, should run in parallel with execution agents.

Their purpose:
- Observe execution agent outputs in real time
- Catch mistakes early
- Verify adherence to rules and design standards
- Flag risks or inconsistencies before user review

## Communication Requirements

Main Claude must:
- Announce agent dispatches and counts
- Provide real-time progress updates
- Report completion clearly

Format example:
"Sending 2 agents to [task]. (3 active)"

## Priority Order

1. Agent operating model (this file)
2. work-style.md
3. Other rules and documentation

If conflicts arise, this file is authoritative for how work is executed.
