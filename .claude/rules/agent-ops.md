---
paths:
  - "**/*"
---

## Quick Reference
- Main Claude is lead engineer AND lead designer
- All execution (coding, testing, research, file ops) is done by background agents
- Monitoring agents are discretionary - use for complex/risky tasks
- Main Claude stays conversational and provides real-time updates
- **CRITICAL: Provide agents MORE context than necessary** - include screenshots, failure history, quality standards

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
- Receive full context (see Agent Context Requirements below)

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

## Agent Context Requirements (CRITICAL)

**Agents fail when they lack context.** Main Claude MUST provide MORE context than seems necessary.

### Always Include in Agent Prompts:

1. **User Evidence**
   - Screenshots the user shared showing problems
   - Exact quotes of user feedback ("this is unreadable", "still broken")
   - User's quality standards ("better than 100% quality", "as many reviewers as necessary")

2. **Failure History**
   - What was already tried and failed
   - Why previous attempts failed
   - Specific elements that keep breaking

3. **Verification Requirements**
   - Don't trust "PASS" without evidence
   - Require screenshots or computed values as proof
   - "Barely readable" = FAIL, only "clearly visible at a glance" = PASS

4. **Full File Context**
   - Relevant CSS/code sections
   - Related files that might conflict
   - Known problem patterns in the codebase

### Why This Matters

Agents that say "PASS" when the user shows screenshots of obvious failures waste time and erode trust. The cost of over-communicating context is low; the cost of agents working blind is high.

**Rule:** If an agent could benefit from knowing something, include it. When in doubt, include it.

### Example - Bad vs Good Agent Prompt

**BAD:**
```
Fix the dark mode text colors in dashboard.html
```

**GOOD:**
```
Fix dark mode text colors in dashboard.html

CONTEXT:
- User has shown 3 screenshots proving text is unreadable
- Previous 5 attempts by agents said "PASS" but failed
- Specific failing elements: task titles, schedule event names, metric values
- User standard: "better than 100% quality" - barely readable = FAIL

VERIFICATION:
- Take screenshot after fix
- Check computed color values via browser
- Every text element must be "clearly visible at a glance"

HISTORY OF FAILURES:
- #6B6B6B was too dark (3.5:1 contrast)
- #909090 still not readable enough
- Some elements not using CSS variables
```

## Priority Order

1. Agent operating model (this file)
2. work-style.md
3. Other rules and documentation

If conflicts arise, this file is authoritative for how work is executed.
