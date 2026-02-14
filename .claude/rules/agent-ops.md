---
paths:
  - "**/*"
---

## Quick Reference
- Team Lead (Claude) is lead engineer AND lead designer
- **Agent Teams** for complex multi-part work (Shift+Tab for Delegate Mode)
- **Subagents** (Task tool) for simple focused tasks
- Monitoring via dedicated teammate or direct lead oversight
- **CRITICAL: Monitors are coaches** - ask "what is this doing, what did it miss, how does it integrate?"
- Team Lead stays conversational and provides real-time updates
- **CRITICAL: Provide teammates/agents MORE context than necessary** - include screenshots, failure history, quality standards
- **Verification gate is mandatory before marking UI work complete** - evidence required: screenshots, user flow testing, adversarial testing

---

# Agent Operations (Authoritative)

This rule defines the required agent operating model for this repository.

## Roles

### Team Lead (Lead Engineer + Lead Designer)

Responsibilities:
- Stay available for conversation at all times
- Create Agent Teams for complex multi-part work
- Use Delegate Mode (Shift+Tab) when coordinating teams
- Manage task assignments and sequencing
- Provide real-time status updates to the user
- Monitor for risks, correctness, and design quality
- Make final decisions and synthesize outputs

Team Lead must NOT:
- Block conversation while doing execution work
- Skip verification gates on UI work

### Teammates (Agent Teams)

Teammates are independent Claude Code instances spawned via Agent Teams:
- Claim tasks from the shared task list
- Can message each other directly (peer-to-peer)
- Load CLAUDE.md and project context automatically
- Navigate between teammates with Shift+Up/Down
- Work independently on their claimed tasks

Teammates MUST:
- Report progress and results promptly
- Receive full context (see Agent Context Requirements below)
- Follow all project rules (design system, coding standards, etc.)

### Subagents (Task Tool)

Subagents are still valid for simple, focused tasks:
- Single-file operations
- Quick checks or lookups
- Simple file operations
- Run in background (`run_in_background: true`) by default

### When to Use Teams vs Subagents

| Scenario | Use |
|----------|-----|
| Multi-file feature implementation | Agent Team |
| Cross-layer work (frontend + backend) | Agent Team |
| Code review needing multiple perspectives | Agent Team |
| Complex debugging with multiple hypotheses | Agent Team |
| Single focused task (one file, one goal) | Subagent (Task tool) |
| Quick file read or simple check | Subagent (Task tool) |
| Simple file operation | Subagent (Task tool) |

### Monitoring

Team Lead decides monitoring approach based on task complexity:

**For complex work (Agent Teams):**
- Spawn a dedicated monitor teammate
- Monitor teammate watches execution teammates
- Reports issues back to Team Lead

**For simple work (Subagents):**
- Team Lead monitors directly
- Check outputs when agents complete

**CRITICAL: Monitors are coaches, not cheerleaders.**

Think of a coach fine-tuning their star athlete - watching closely, understanding the goal, catching issues before they compound, ensuring the player fits with the team.

**What monitors must ask:**

*Understanding:*
1. **What is this code doing?** - Understand the actual behavior
2. **What is it affecting?** - What files, data, state does it touch?
3. **Is it impacting other code?** - Side effects? Breaking existing functionality?

*Intent:*
4. **Is it doing what was intended?** - Does it match the plan/requirements?
5. **Did the writer overlook something?** - Missing pieces, gaps, incomplete work
6. **Does it follow codebase patterns?** - Consistent with how similar things are done here?

*Integration:*
7. **How far does it integrate?** - What systems does it connect to?
8. **What does it depend on?** - Are those dependencies correct and available?
9. **What depends on it?** - What breaks if this is wrong?

*Completeness:*
10. **What else needs to go here?** - What's missing to make it complete?
11. **Are both paths handled?** - Success AND failure, not just happy path
12. **Is it wired up?** - Connected to the rest of the system, not orphaned code

**Monitor focus areas:**
- Plan alignment - does it match what was specified?
- Pattern consistency - does it fit how this codebase works?
- Integration completeness - is it actually connected, not just existing?
- Error paths - what happens when things go wrong?
- Dependencies - both what it needs and what needs it

**Output format:**
```
ISSUE: [what's wrong] - [location] - [what should happen instead]
GAP: [what's missing] - [why it matters]
INTEGRATION: [what else is affected] - [what needs to be connected]
PATTERN: [inconsistency with codebase] - [how it should be done here]
```

Monitors refine and catch oversights. They ensure code is complete, connected, and consistent - not just present.

## Communication Requirements

Team Lead must:
- Announce team creation and teammate assignments
- Provide real-time progress updates
- Report completion clearly

Format examples:
- "Creating team for [task]: 2 execution + 1 monitor teammates."
- "Sending 1 agent to [task]. (3 active)"

## Agent Context Requirements (CRITICAL)

**Teammates and agents fail when they lack context.** Team Lead MUST provide MORE context than seems necessary.

### Always Include in Prompts:

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

**Rule:** If a teammate could benefit from knowing something, include it. When in doubt, include it.

### Example - Bad vs Good Prompt

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

## Verification Gate (Mandatory)

UI work is NOT complete until verification is done. This is a hard gate, not optional.

### Verification Requirements

1. **Visual verification**
   - Screenshot with agent-browser
   - Compare to prototype/design spec
   - Check both light and dark mode

2. **Functional testing**
   - Log into test account
   - Actually USE the feature as a user would
   - Complete the full user flow, not just view it

3. **Adversarial testing**
   - Try to break it: edge cases, rapid clicks, unexpected inputs
   - Test empty states, error conditions, loading states
   - Test what happens with missing data

4. **Cross-feature testing**
   - Does this change break something else?
   - Test related features after the change

### What Counts as Evidence

- Screenshots showing the feature working
- Console output showing no errors
- Specific measurements (contrast ratios, touch target sizes)
- Description of user flows tested and results

### What Does NOT Count

- Agent saying "PASS" without evidence
- "Build passes" (that's compilation, not verification)
- "Code looks correct" (that's review, not verification)
- "Tests pass" (unit tests ≠ real browser testing)

### Workflow

```
[Code Complete] → [Build Passes] → [Verification Agent] → [Evidence Captured] → [Actually Complete]
                                          ↓
                              - Visual: screenshot
                              - Functional: use it
                              - Adversarial: try to break it
                              - Cross-feature: check related
```

"PASS" without evidence = not verified. No commit until verification evidence exists.

## Priority Order

1. Agent operating model (this file)
2. work-style.md
3. Other rules and documentation

If conflicts arise, this file is authoritative for how work is executed.
