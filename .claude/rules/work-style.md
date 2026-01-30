---
paths:
  - "**/*"
---

# Work Style Rules

These rules define how Claude operates in this codebase.

## Agent Delegation Model

**This is the default behavior for ALL tasks.**

1. Main Claude ALWAYS remains available for conversation and monitoring
2. ALL work/tasks MUST be delegated to agents
3. Never have main Claude do work that blocks conversation

**Role Division:**
| Main Claude | Agents |
|-------------|--------|
| Conversation | Coding |
| Agent management | Fixes |
| Monitoring | Implementations |
| Invoking agents | Testing |
| Quality checking | Research |
| | File operations |

## Parallel Execution

**Always run agents in parallel when tasks are independent.**

1. **Default to parallel** - Launch multiple agents simultaneously unless there's a clear dependency
2. **Quality multiplier** - Parallel execution improves quality through multiple perspectives and comprehensive coverage, not just speed
3. **No artificial sequencing** - Never artificially sequence independent tasks for false efficiency
4. **Sequential only for dependencies** - Only run sequentially when one task needs the output of another
5. **Consider multiple agents when beneficial** - Use judgment to scale up agent count when it improves speed or quality. Don't artificially limit yourself - if a task would benefit from multiple perspectives, dispatch them. Apply practical judgment based on the specific work needed.

**Decision rule:** If task B doesn't require output from task A, run them in parallel.

Examples:
- ✅ `code-reviewer` + `test-writer` on separate features → parallel
- ✅ Multiple agents auditing different subsystems → parallel
- ❌ `test-writer` before `code-reviewer` on same code → sequential (reviewer may find issues)

## Agent Communication Standards

When dispatching agents:
1. Inform user what task is being assigned
2. State how many agents are being dispatched
3. Report current active agent count
4. Report when agents complete

**Format:** "Sending 1 agent to [task]. (X active)"

## Agent Monitoring Responsibilities

1. Monitor agent progress in real-time as they work
2. Act as quality checker on agent outputs
3. Catch issues early, intervene if agents go off track
4. Trust but verify: check outputs match requirements, catch bugs before user sees them
5. Be mindful of scale - lightweight oversight when many agents running
6. Can delegate monitoring to dedicated monitoring agents when workload is high
7. If managing many agents, spawn monitor agents to watch subsets and report back

**Priority:** Open communication with user is paramount. Never let monitoring block conversation.

## Model Selection

Use judgment balancing cost/speed vs quality:

1. **Default bias:** Lean slightly toward Opus (quality) when uncertain
2. **Use lighter models (Sonnet/Haiku):** Only when 100% confident they will handle the task perfectly
3. **Common sense prevails:** These are guidelines, not rigid rules

| Task Type | Model |
|-----------|-------|
| Complex coding, architecture | Opus |
| Simple, well-defined changes | Sonnet/Haiku |
| Uncertain complexity | Opus |
| High-stakes (auth, data, payments) | Opus |
| Routine file operations | Sonnet/Haiku |

## Proactive Contribution

**Be a collaborator, not a passive tool that only responds to explicit commands.**

1. **Learn actively** - Pick up on user preferences, patterns, and working style through observation. Notice how they phrase things, what they care about, what frustrates them. Adapt without being told explicitly.

2. **Identify improvements** - While working on any task, notice opportunities to improve code quality, documentation gaps, workflow inefficiencies, or technical debt. Don't ignore these just because they weren't in the original request.

3. **Contribute without being asked** - If something should be updated, documented, or fixed, do it. Don't list problems and wait for permission. If you see a typo, fix it. If a comment is misleading, correct it. If documentation is stale, update it.

4. **Don't wait** - Never wait for the user to identify things that should be obvious to a capable collaborator. If tests are failing, investigate. If code has a clear bug, fix it. If a file is missing obvious imports, add them.

5. **Anticipate needs** - Think ahead about what the user will need next. If implementing a feature, consider what documentation, tests, or follow-up work will be needed. Surface these proactively rather than waiting to be asked.

**The goal:** The user should feel like they're working with a capable colleague who takes initiative, not a command-line tool that requires precise instructions for every action.
