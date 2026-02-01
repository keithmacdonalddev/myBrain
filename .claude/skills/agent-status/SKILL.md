# Agent Status Skill

Display real-time status of all active and recently completed agents.

## When User Invokes /agent-status

Immediately output a status table showing:

### Active Agents Table

```
| ID | Task | Model | Memo | Status | Progress | Tokens |
|----|------|-------|------|--------|----------|--------|
| [agent_id] | [short description] | haiku/sonnet/opus | [why this model] | Running/Completed | [tools used] | [token count] |
```

**Memo field**: Briefly explains why this model was chosen for this specific task. Examples:
- "Simple verification, low risk" (haiku)
- "Complex multi-file edit, needs judgment" (sonnet)
- "High-stakes auth code, quality critical" (opus)
- "Pattern matching only, speed matters" (haiku)
- "User-facing copy, tone matters" (opus)

### Recently Completed Agents (last 5)

```
| ID | Task | Model | Result | Tokens |
|----|------|-------|--------|--------|
| [agent_id] | [short description] | haiku/sonnet/opus | PASS/FAIL + summary | [token count] |
```

### Summary Stats

- **Total Active:** X agents
- **Completed This Session:** Y agents
- **Models Used:** breakdown by model type
- **Total tokens used:** X (across all agents)

## How Main Claude Tracks Agents

When dispatching agents, ALWAYS record:
1. Agent ID (from Task tool response)
2. Task description (3-5 words)
3. Model used (haiku/sonnet/opus)
4. **Model memo** - WHY this model was chosen for this task
5. Type (Execution/Monitor)

When agents complete, update with:
1. Result (PASS/FAIL)
2. Brief summary of outcome

## Agent Tracking Format

Main Claude maintains mental tracking of:

```
ACTIVE_AGENTS = [
  { id: "abc123", task: "Fix header CSS", model: "haiku", memo: "Simple CSS fix, low risk", type: "Execution", status: "running", tokens: 14501 },
  { id: "def456", task: "Monitor header fix", model: "haiku", memo: "Verification only", type: "Monitor", status: "running", tokens: 8200 }
]

COMPLETED_AGENTS = [
  { id: "xyz789", task: "Build verification", model: "haiku", memo: "Build check, pass/fail only", result: "PASS", summary: "0 errors", tokens: 25000 }
]
```

## Example Output

```
/agent-status

ACTIVE AGENTS (2)
=================
| ID      | Task              | Model  | Memo                      | Type      | Status  | Tokens |
|---------|-------------------|--------|---------------------------|-----------|---------|--------|
| a4d3d65 | Fix AppShell code | sonnet | Multi-file, needs context | Execution | Running | 34521  |
| af63d98 | Monitor fix       | haiku  | Verification only         | Monitor   | Running | 12105  |

RECENTLY COMPLETED (3)
======================
| ID      | Task              | Model | Memo               | Result             | Tokens |
|---------|-------------------|-------|--------------------|--------------------|--------|
| a919789 | Build verify      | haiku | Pass/fail check    | PASS - 0 errors    | 25000  |
| a149e07 | Screenshot header | haiku | Browser automation | PASS - saved       | 18750  |
| abc274c | Update greeting   | haiku | Simple text change | PASS - CSS updated | 15200  |

SUMMARY
=======
- Active: 2 agents
- Completed this session: 12 agents
- Model breakdown: haiku (10), sonnet (2)
- Total tokens used: 487,500 (across all agents)
```

## Token Tracking

Token usage is provided in system notifications during agent execution:
- Progress: "Agent X progress: Y new tools used, Z new tokens"
- Track cumulative tokens for each agent
- Report final token count when agent completes

Token tracking helps identify:
- Which agents consume the most resources
- Cost efficiency of agent selections
- Patterns in token usage across task types

## Model Selection Guidelines

When choosing a model, consider and document:

| Factor | Haiku | Sonnet | Opus |
|--------|-------|--------|------|
| Simple verification | ✓ | | |
| Pattern matching | ✓ | | |
| Multi-file edits | | ✓ | |
| Complex logic | | ✓ | ✓ |
| Quality-critical | | | ✓ |
| User-facing content | | | ✓ |
| Speed priority | ✓ | | |
| Judgment required | | ✓ | ✓ |

**Always document reasoning** - this prevents lazy defaults and ensures intentional selection.

## Agent Type Taxonomy

When dispatching agents, categorize them by type:

| Type | Purpose | When to Use |
|------|---------|-------------|
| Execution | Do actual work (coding, file edits, refactoring) | Any implementation task |
| Monitor | Watch execution agents for correctness/compliance | Complex/risky tasks, parallel execution |
| Verification | Browser-based testing with screenshots/measurements | After any UI change, before marking complete |
| Audit | Run comprehensive checks (accessibility, design, quality) | Periodic health checks, before releases |
| Research/Explore | Investigate codebase, find patterns, gather context | Understanding before implementation |
| QA-Review | Review code for quality, security, consistency | After significant changes |
| Test-Writer | Write tests for code changes | After new features/components |
| Documentation | Update docs, architecture files, memory.md | After any structural changes |
| Build/Validate | Run builds, check for errors | After code changes |

### Type Field in Tracking

Include type in agent tracking:

```
ACTIVE_AGENTS = [
  { id: "abc123", task: "Fix header CSS", model: "haiku", memo: "Simple CSS fix", type: "Execution", status: "running" },
  { id: "def456", task: "Monitor header fix", model: "haiku", memo: "Verification only", type: "Monitor", status: "running" },
  { id: "ghi789", task: "Screenshot header", model: "haiku", memo: "Visual proof needed", type: "Verification", status: "running" }
]
```

### Type Selection Guidelines

- **Always pair Execution with Monitor** for complex/risky tasks
- **Always run Verification** before marking UI work complete
- **Use Research/Explore first** when requirements are unclear
- **Run Audit agents periodically** not just at end of phases

## Notes

- This skill displays Claude's internal tracking, not a system query
- Accuracy depends on Claude consistently tracking agent dispatches
- Use /tasks CLI command for system-level task info (but without models)
