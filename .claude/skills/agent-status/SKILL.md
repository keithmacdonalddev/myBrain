# Agent Status Skill

Display real-time status of all active and recently completed agents.

## When User Invokes /agent-status

Immediately output a status table showing:

### Active Agents Table

```
| ID | Task | Model | Status | Progress |
|----|------|-------|--------|----------|
| [agent_id] | [short description] | haiku/sonnet/opus | Running/Completed | [tools used] |
```

### Recently Completed Agents (last 5)

```
| ID | Task | Model | Result |
|----|------|-------|--------|
| [agent_id] | [short description] | haiku/sonnet/opus | PASS/FAIL + summary |
```

### Summary Stats

- **Total Active:** X agents
- **Completed This Session:** Y agents
- **Models Used:** breakdown by model type

## How Main Claude Tracks Agents

When dispatching agents, ALWAYS record:
1. Agent ID (from Task tool response)
2. Task description (3-5 words)
3. Model used (haiku/sonnet/opus)
4. Type (Execution/Monitor)

When agents complete, update with:
1. Result (PASS/FAIL)
2. Brief summary of outcome

## Agent Tracking Format

Main Claude maintains mental tracking of:

```
ACTIVE_AGENTS = [
  { id: "abc123", task: "Fix header CSS", model: "haiku", type: "Execution", status: "running" },
  { id: "def456", task: "Monitor header fix", model: "haiku", type: "Monitor", status: "running" }
]

COMPLETED_AGENTS = [
  { id: "xyz789", task: "Build verification", model: "haiku", result: "PASS", summary: "0 errors" }
]
```

## Example Output

```
/agent-status

ACTIVE AGENTS (2)
=================
| ID      | Task              | Model | Type      | Status  |
|---------|-------------------|-------|-----------|---------|
| a4d3d65 | Fix AppShell code | haiku | Execution | Running |
| af63d98 | Monitor fix       | haiku | Monitor   | Running |

RECENTLY COMPLETED (3)
======================
| ID      | Task              | Model | Result |
|---------|-------------------|-------|--------|
| a919789 | Build verify      | haiku | PASS - 0 errors |
| a149e07 | Screenshot header | haiku | PASS - saved |
| abc274c | Update greeting   | haiku | PASS - CSS updated |

SUMMARY
=======
- Active: 2 agents
- Completed this session: 12 agents
- Model breakdown: haiku (10), opus (2)
```

## Notes

- This skill displays Claude's internal tracking, not a system query
- Accuracy depends on Claude consistently tracking agent dispatches
- Use /tasks CLI command for system-level task info (but without models)
