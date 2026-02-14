# Agent Teams Research: Feature Analysis & Workflow Comparison

**Date:** 2026-02-05
**Source:** https://code.claude.com/docs/en/agent-teams
**Status:** Experimental (disabled by default, requires opt-in)

---

## What Are Agent Teams?

Agent Teams let you coordinate **multiple independent Claude Code instances** working together. One session acts as the **team lead** (coordinator), and **teammates** are full Claude Code sessions with their own context windows that can communicate directly with each other.

This is fundamentally different from subagents (the Task tool), which run within the lead's session and can only report back to the lead.

### Key Architecture

| Component     | Role                                                              |
|:------------- |:----------------------------------------------------------------- |
| **Team Lead** | Main Claude Code session that creates team, spawns/coordinates    |
| **Teammates** | Separate Claude Code instances, each with own context window      |
| **Task List** | Shared work items that teammates claim and complete               |
| **Mailbox**   | Messaging system for direct agent-to-agent communication          |

### How to Enable (When Available)

```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Feature Deep Dive

### Inter-Agent Communication
- Teammates can **message each other directly** (not just back to lead)
- **Broadcast** sends to all teammates simultaneously
- Messages are delivered automatically, no polling needed
- Teammates notify the lead when they finish and go idle

### Shared Task List
- All agents see task status and can claim available work
- Tasks have three states: pending, in progress, completed
- Tasks support **dependencies** (blocked until dependencies resolve)
- File locking prevents race conditions on task claims
- Teammates can **self-claim** the next unassigned, unblocked task

### Display Modes
| Mode | Description | Requirements |
|------|-------------|-------------|
| **In-process** | All teammates in one terminal, Shift+Up/Down to navigate | Any terminal |
| **Split panes** | Each teammate in own pane, click to interact | tmux or iTerm2 |
| **Auto** (default) | Split if already in tmux, otherwise in-process | - |

### Delegate Mode
- Press **Shift+Tab** to restrict the lead to coordination-only
- Lead cannot touch code, only spawn/message/manage teammates
- Useful when you want pure orchestration without the lead doing work itself

### Plan Approval for Teammates
- Can require teammates to **plan before implementing**
- Teammate works in read-only mode until lead approves the plan
- Lead approves/rejects autonomously based on criteria you provide
- Example: "only approve plans that include test coverage"

### Permissions
- Teammates inherit the lead's permission settings at spawn
- Can change individual teammate modes after spawning
- Cannot set per-teammate modes at spawn time

### Context
- Teammates load the same project context (CLAUDE.md, MCP servers, skills)
- Teammates do **NOT** inherit lead's conversation history
- Spawn prompt is the only task-specific context they receive

---

## Agent Teams vs. Subagents (Task Tool) Comparison

|                       | Subagents (Current)                        | Agent Teams (New)                             |
|:----------------------|:-------------------------------------------|:----------------------------------------------|
| **Context**           | Own context, results return to caller      | Own context, fully independent                |
| **Communication**     | Report back to main Claude ONLY            | Message each other directly                   |
| **Coordination**      | Main Claude manages all work               | Shared task list, self-coordination           |
| **Task Management**   | TodoWrite (manual)                         | Native shared task list with dependencies     |
| **User Interaction**  | User talks to main Claude only             | User can message individual teammates         |
| **Display**           | Invisible to user (background)             | Visible in terminal (split panes or in-proc)  |
| **Token Cost**        | Lower (results summarized back)            | Higher (each is a separate Claude instance)   |
| **Best For**          | Focused tasks, only result matters         | Complex work needing discussion/collaboration |
| **Lifecycle**         | Ephemeral (die after task)                 | Persistent until shut down                    |
| **Nesting**           | Can spawn sub-subagents                    | No nested teams (only lead manages)           |
| **Session Resumption**| N/A                                        | NOT supported (known limitation)              |

---

## Comparison to Our Current myBrain Workflow

### What Our Workflow Already Has (Custom-Built via Rules)

| Concept | Our Implementation | Agent Teams Equivalent |
|---------|-------------------|----------------------|
| Lead stays conversational | `agent-ops.md` + `delegation-enforcement.md` + hook | **Delegate Mode** (built-in) |
| All work delegated | `work-style.md` rules + enforcement hook | **Delegate Mode** (one button) |
| Monitoring agents | `agent-ops.md` monitoring section | Lead monitors teammates natively |
| Background agents | `run_in_background: true` convention | Teammates run independently by default |
| Task management | TodoWrite / TaskCreate manual tracking | **Native shared task list** with dependencies |
| Agent context requirements | Detailed prompt guidelines in `agent-ops.md` | Spawn prompt + CLAUDE.md auto-loaded |
| Violation enforcement | `enforce-delegation.mjs` hook | **Delegate Mode** makes violations impossible |
| Parallel execution | `work-style.md` parallel rules | Native parallel teammates |

### What Agent Teams Would ADD (New Capabilities)

1. **Inter-Agent Communication** - Teammates can discuss, debate, and challenge each other's findings. Currently impossible with subagents.

2. **User Can Talk to Individual Agents** - Shift+Up/Down to select a teammate and send direct messages. Currently, all communication goes through main Claude.

3. **Visual Agent Activity** - See what each agent is doing in real-time via split panes or in-process display. Currently, agents are invisible background processes.

4. **Self-Claiming Tasks** - Agents pick up the next available task automatically when done. Currently, main Claude must manually dispatch each task.

5. **Native Dependency Management** - Tasks block/unblock automatically. Currently managed through manual sequencing.

6. **Plan Approval Workflow** - Require agents to plan before implementing, with automated approval criteria. Currently done through ad-hoc monitoring.

7. **Formal Team Lifecycle** - Create team, spawn teammates, shut down, clean up. Currently just "launch and forget" subagents.

### What Agent Teams Would REPLACE

| Current Component | Replaced By | Notes |
|-------------------|-------------|-------|
| `delegation-enforcement.md` | **Delegate Mode** | One button replaces 280-line rule file + hook |
| `enforce-delegation.mjs` hook | **Delegate Mode** | No custom code needed |
| `delegation-bypasses.md` / `violations.md` | N/A | No violations possible in delegate mode |
| Manual TodoWrite tracking | **Shared Task List** | Native, with dependencies and auto-claiming |
| Monitoring agent guidelines | **Native lead monitoring** | Lead sees all teammate activity automatically |
| Agent communication format rules | **Built-in messaging** | "Sending X agents to..." replaced by team display |
| Background agent default rule | **Default behavior** | Teammates are always independent by default |

### What Would NOT Change

These parts of the workflow remain relevant regardless:

- **`agent-ops.md` core philosophy** - Lead engineer role, verification gates, context requirements
- **`work-style.md` quality standards** - Parallel execution principles, model selection, proactive contribution
- **Verification Gate** - Still need evidence-based verification for UI work
- **Monitor "coaching" questions** - The 12 monitoring questions remain valuable
- **QA agent ordering** - qa-reviewer before test-writer still applies
- **All other rules** - Safety, git, design, logging, testing, etc.

---

## Honest Assessment: Better or Worse?

### Agent Teams is BETTER For:

1. **Complex multi-file features** - Teammates own different parts, communicate when integration is needed
2. **Code review** - 3 reviewers (security, performance, tests) working simultaneously and challenging each other
3. **Debugging competing hypotheses** - Agents investigate different theories and argue, which fights anchoring bias
4. **Cross-layer work** - Frontend, backend, and tests each owned by a different teammate
5. **Reducing Main Claude bottleneck** - Self-claiming means less coordination overhead
6. **Eliminating custom enforcement** - Delegate mode replaces our entire enforcement hook system

### Current Workflow is BETTER For:

1. **Simple tasks** - Agent Teams adds coordination overhead that isn't worth it for single-file changes
2. **Token cost** - Agent Teams uses significantly more tokens (each teammate is a full Claude instance)
3. **Reliability** - Agent Teams is experimental with known limitations (no session resumption, task lag, slow shutdown)
4. **Windows environment** - Split panes require tmux/iTerm2, neither native on Windows. In-process mode works but is less useful.
5. **Sequential work** - Same-file edits or dependent chains don't benefit from teams
6. **Mature documentation** - Our workflow has detailed, battle-tested rules. Agent Teams is new and learning curve exists.

### The Verdict

**Agent Teams is a significant upgrade for the CONCEPT, but not ready to replace the current workflow TODAY.**

Here's why:

1. **Experimental status** - The docs explicitly warn about known limitations. Our current workflow is proven and stable.

2. **Windows compatibility** - The best feature (split panes) doesn't work on Windows Terminal. In-process mode is functional but diminished.

3. **Token cost** - For a solo project, the higher token consumption matters. Our subagent approach is more cost-efficient.

4. **Our workflow already implements the core ideas** - We custom-built many Agent Teams concepts (delegation, monitoring, parallel execution). The main thing we're missing is inter-agent communication.

5. **The inter-agent communication IS genuinely valuable** - For complex tasks like multi-reviewer code review, debugging, or cross-layer features, having agents discuss with each other would catch more issues than agents reporting independently to a lead.

### Recommendation

**Hybrid approach when Agent Teams stabilizes:**

- **Keep** the current subagent workflow as the default for routine work (lower cost, proven reliability)
- **Add** Agent Teams for specific high-value scenarios:
  - Complex multi-file features (3+ agents needed)
  - Code review with multiple perspectives
  - Debugging stubborn issues with competing hypotheses
  - Cross-layer coordination (frontend + backend + tests)
- **Retire** the delegation enforcement hook (`enforce-delegation.mjs`) once Delegate Mode is stable - it does the same thing natively
- **Simplify** `delegation-enforcement.md` to just reference Delegate Mode
- **Keep** all other rules files - they provide quality standards that apply regardless of whether work is done by subagents or teammates

---

## Current Limitations (Critical)

1. **Not yet available on all plans** - Experimental feature requiring opt-in
2. **No session resumption** for in-process teammates - `/resume` and `/rewind` don't restore them
3. **Task status can lag** - teammates sometimes fail to mark tasks complete
4. **Shutdown can be slow** - teammates finish current work before stopping
5. **One team per session** - must clean up before starting a new team
6. **No nested teams** - teammates can't spawn their own teams
7. **Lead is fixed** - can't promote a teammate or transfer leadership
8. **Split panes unsupported** on: VS Code terminal, Windows Terminal, Ghostty

---

## Migration Path (When Ready)

### Phase 1: Enable & Experiment
```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```
- Try Agent Teams for a code review or research task
- Compare quality and token cost vs current subagent approach
- Keep current workflow as fallback

### Phase 2: Adopt for Complex Tasks
- Use Agent Teams for multi-file features and code review
- Keep subagents for simple, single-focus tasks
- Update `agent-ops.md` with guidance on when to use teams vs subagents

### Phase 3: Simplify Enforcement
- Enable Delegate Mode as default
- Remove `enforce-delegation.mjs` hook
- Simplify `delegation-enforcement.md` to reference Delegate Mode
- Update `work-style.md` to reflect native team coordination

### Phase 4: Full Integration
- Update all workflow rules to reference Agent Teams where applicable
- Create team composition templates for common scenarios
- Establish token budget guidelines for team usage

---

## Best Use Cases for myBrain

| Scenario | Approach | Why |
|----------|----------|-----|
| Simple bug fix | Subagent (current) | Low overhead, cost-efficient |
| Single component change | Subagent (current) | Team coordination not worth it |
| New feature (frontend + backend + tests) | Agent Team | Cross-layer coordination, parallel ownership |
| Code review | Agent Team | Multiple perspectives that challenge each other |
| Debugging mystery issue | Agent Team | Competing hypotheses with debate |
| QA audit across app | Agent Team | Parallel audit of different subsystems |
| Quick file read/edit | Subagent (current) | Minimal task, no coordination needed |
| Design system changes | Agent Team | Impact across many components, need verification |

---

## Files That Would Change (Future)

| File | Change | When |
|------|--------|------|
| `.claude/settings.local.json` | Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` to env | Phase 1 |
| `.claude/rules/agent-ops.md` | Add "When to use Agent Teams vs Subagents" section | Phase 2 |
| `.claude/rules/work-style.md` | Update delegation model to reference teams | Phase 2 |
| `.claude/rules/delegation-enforcement.md` | Simplify to reference Delegate Mode | Phase 3 |
| `.claude/hooks/enforce-delegation.mjs` | Remove (replaced by Delegate Mode) | Phase 3 |
| `CLAUDE.md` | Update Agent Delegation section | Phase 3 |

---

## Summary

Agent Teams is the platform catching up to what we built manually. Our custom delegation model, enforcement hooks, and monitoring rules anticipated the need for coordinated multi-agent workflows. Agent Teams now provides many of these as native features with better UX (visual display, inter-agent messaging, shared task lists).

**Today:** Keep the current workflow. It works, it's proven, and Agent Teams isn't stable enough yet.

**Soon:** When Agent Teams exits experimental status, adopt it for complex tasks and retire our custom enforcement infrastructure. The rules about quality, verification, and communication standards stay - they're workflow philosophy, not implementation details.

The biggest win will be **inter-agent communication** - agents that can debate and challenge each other produce better results than agents that only report to a central coordinator. That's genuinely new capability we can't replicate with subagents.
