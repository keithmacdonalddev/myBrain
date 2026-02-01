# Real-Time Instance Coordination Plan

## 1. Current State

- **Memory system** captures observations from all instances across sessions
- **Context injection** happens at session START only via memory.md
- **Instances contribute TO the system** by writing observations but don't read FROM it during execution
- **Session continuity** works well - each session starts with full context from previous sessions
- **No real-time awareness** between running instances

## 2. Problem Statement

- Running instances don't know about each other's work in real-time
- No coordination mechanism to prevent conflicts during execution
- If multiple instances work simultaneously on overlapping areas, conflicts could arise
- Currently mitigated by task assignment, but not enforced technically

## 3. When Real-Time Sharing Would Help

- Multiple instances assigned to the same feature (rare but possible)
- Shared file modifications needed from different instances
- One instance's output is input for another
- Avoiding duplicate work on the same subsystem
- Preventing conflicting changes to the same files

## 4. When It's NOT Needed (Current Case)

- **Separate features** (Feedback System vs Dashboard V2)
- **Isolated file areas** - each task has distinct file scope
- **Independent tasks** with no overlap or dependencies
- **Low conflict risk** due to careful task assignment
- **Session-based workflows** - instances don't run indefinitely

## 5. Potential Implementation Approaches

### Option A: Shared Scratchpad File
**Concept:** File-based coordination that instances read/write during execution

```
.claude/runtime/ACTIVE-TASKS.json
{
  "last_updated": "2026-01-31T14:30:00Z",
  "active_instances": [
    {
      "id": "session_xyz",
      "task": "Feedback System - Phase 1",
      "files_being_modified": [
        "client/src/features/Feedback",
        "server/api/feedback.js"
      ],
      "started_at": "2026-01-31T14:15:00Z",
      "status": "in_progress"
    }
  ]
}
```

**Pros:**
- Simple to implement and understand
- File-based, fits existing infrastructure
- Minimal overhead
- Easy to debug and audit

**Cons:**
- Polling overhead (how often to check?)
- Data can become stale between checks
- No guaranteed atomicity
- Requires manual cleanup on crashes

### Option B: Lock File System
**Concept:** Instance "claims" files before modifying, others check before touching

```
.claude/runtime/locks/
  client_src_features_Feedback.lock
  server_api_feedback_js.lock
```

**Pros:**
- Prevents conflicts deterministically
- Clear ownership model
- Easy to understand

**Cons:**
- Could cause instances to wait/block
- Deadlock potential if not careful
- Single instance can hold locks indefinitely
- Overhead of lock management

### Option C: Coordinator Instance
**Concept:** One dedicated instance monitors others and alerts on overlap

**Pros:**
- Central oversight and control
- Can make intelligent decisions
- Prevents problems proactively

**Cons:**
- Single point of failure
- Additional overhead
- Complex to implement
- Over-engineered for current use case

## 6. Recommendation

**Priority: LOW - Do not implement yet**

Rationale:
- Current memory system is **sufficient for most use cases**
- Task assignment is working well
- Real-time coordination adds **complexity without clear ROI**
- **No conflicts have occurred** in current workflows
- **Session-based execution** reduces conflict surface area

**Consider implementing IF:**
- Conflict frequency increases
- Regular patterns of simultaneous work emerge
- Manual conflict resolution becomes time-consuming

## 7. Decision Framework for Future

Use this checklist to decide if real-time coordination is needed:

- [ ] Have conflicts occurred in actual execution?
- [ ] Is conflict resolution taking significant time?
- [ ] Do planned tasks regularly overlap?
- [ ] Is manual coordination becoming a bottleneck?

If 2+ boxes are checked → **Prototype Option A**

## 8. Next Steps (If Needed)

1. **Monitor conflict frequency** over next 20+ sessions
2. **Log instances** at session start/end in memory.md
3. **Document any conflicts** that occur and how they were resolved
4. **If conflicts become common**, prototype Option A (Shared Scratchpad)
5. **Evaluate prototype** for 5+ sessions before full deployment

## 9. Implementation Notes (If Activated)

If coordination becomes necessary:

- Leverage existing `.claude/runtime/` directory structure
- Keep files under 10KB to avoid memory bloat
- Implement 5-minute stale-entry cleanup
- Log all coordination events to session memory
- Make coordination observable/auditable
- Fail gracefully (coordination errors shouldn't block work)
