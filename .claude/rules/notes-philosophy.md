---
paths:
  - "myBrain-web/src/features/notes/**/*.jsx"
  - "myBrain-web/src/features/notes/**/*.js"
  - "myBrain-web/src/components/notes/**/*.jsx"
  - "myBrain-api/src/routes/notes.js"
  - "myBrain-api/src/services/noteService.js"
  - "myBrain-api/src/models/Note.js"
---

## Quick Reference
- Notes are TEMPORARY captures - inbox items awaiting processing
- Notes must be processed into Tasks, Events, Projects, or discarded
- UI must always show processing options (Convert to Task/Event/Project, Archive)
- Stale notes (unprocessed too long) should be flagged
- "Developing" notes still need visible processing options

---

# Notes Philosophy: Second Brain Principle

**Core Decision (2026-01-28):** Notes are TEMPORARY captures that must be processed into Tasks, Events, Projects, or discarded. Notes should never sit permanently - they are inbox items awaiting action.

## Why This Matters

Notes in a Second Brain system are not permanent storage. They are:
- Quick captures of ideas, thoughts, information
- Temporary holding areas for processing
- Inbox items that need sorting

Notes that sit indefinitely become:
- Clutter that reduces system trust
- Missed actions and forgotten ideas
- Cognitive load that slows decision-making

## Enforcement Requirements

### 1. Processing Options Always Visible

Every note view must show clear processing options:

| Action | Purpose |
|--------|---------|
| Convert to Task | Actionable item with due date |
| Convert to Event | Time-specific occurrence |
| Convert to Project | Multi-step work requiring breakdown |
| Archive/Discard | Processed or no longer relevant |

**Implementation:** Include processing buttons/actions in:
- Note detail view
- Note slide panel
- Note list item actions

### 2. Stale Note Flagging

Notes unprocessed beyond a threshold should be visually flagged:

| State | Visual Treatment |
|-------|------------------|
| Fresh (< 3 days) | Normal appearance |
| Aging (3-7 days) | Subtle warning indicator |
| Stale (> 7 days) | Clear "needs attention" flag |

**Implementation:** Add `createdAt` age indicator and/or filter for "needs processing" notes.

### 3. "Developing" Notes Are Not Exempt

Even notes in active development status need processing options:

- "Developing" means actively being worked on, not permanent
- Eventually must convert to final destination or archive
- Processing options remain visible regardless of status

### 4. No Permanent Note State

There should be no note status that implies "done" or "permanent":

- Avoid statuses like "Complete", "Final", "Reference"
- If a note needs to persist, it should convert to a Project or Knowledge Base entry
- Archive is for processed/discarded notes, not permanent storage

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Notes as permanent storage | Defeats inbox purpose | Convert to proper entity |
| Hidden processing options | Friction discourages action | Always visible buttons |
| No stale indicators | Notes forgotten | Age-based visual flags |
| "Archive" as storage | Misused as permanent | Clear messaging on archive meaning |

## Related Files

- `myBrain-web/src/features/notes/` - Notes feature UI
- `myBrain-web/src/components/notes/` - Note slide panel
- `myBrain-api/src/routes/notes.js` - Notes API
- `myBrain-api/src/models/Note.js` - Note model
