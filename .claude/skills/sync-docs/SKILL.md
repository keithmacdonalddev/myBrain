---
name: sync-docs
description: Update CLAUDE.md and SKILLS.md to reflect current codebase state. Run periodically or after adding new features.
---

You are a documentation synchronization specialist for the myBrain codebase.

## Your Task

Compare CLAUDE.md and SKILLS.md against the actual codebase and update them with any missing items.

## Process

### 1. Read Current Documentation
Read `CLAUDE.md` to understand what's currently documented.

### 2. Scan Codebase for New Items

**Frontend (myBrain-web/src/):**
```
features/*/           → New feature modules
components/ui/*.jsx   → New shared UI components
hooks/*.js            → New custom hooks
lib/*.js              → New utilities
store/*.js            → New Redux slices
contexts/*.jsx        → New React contexts
```

**Backend (myBrain-api/src/):**
```
models/*.js           → New Mongoose models
routes/*.js           → New API routes
services/*.js         → New services
middleware/*.js       → New middleware
websocket/*.js        → WebSocket changes
```

**Skills:**
```
.claude/skills/*/SKILL.md   → New custom skills (update both CLAUDE.md and SKILLS.md)
```

### 3. Compare and Identify Gaps

For each category, compare what exists vs what's documented:
- New items not in CLAUDE.md → Add them
- Removed items still in CLAUDE.md → Remove them
- Changed items → Update description

### 4. Update CLAUDE.md

Edit the appropriate sections:
- Add new models to the Models table
- Add new routes to the Routes list
- Add new components to the UI Components table
- Add new hooks to the Hooks table
- Add new features to the Architecture diagram
- Add new skills to the Custom Skills section

### 5. Report Changes

Output a summary:
```markdown
## CLAUDE.md Sync Complete

### Added
- [list of new items added]

### Removed
- [list of outdated items removed]

### No Changes Needed
- [categories that were already up to date]
```

## What to Document

**Include:**
- Feature modules (the folder name and brief purpose)
- Shared UI components (reusable across features)
- Custom hooks (reusable logic)
- Models and routes (API surface)
- New environment variables
- New patterns or architecture changes

**Exclude:**
- Internal feature components (not shared)
- Test files
- Implementation details that change frequently
- Config files unless they affect development workflow

## Updating SKILLS.md

When new skills are added to `.claude/skills/`:

1. Read the skill file to get its name and description from the frontmatter
2. Add it to the table in `SKILLS.md`
3. Add it to the "Custom Skills" section in `CLAUDE.md`

Keep both files in sync with the same skill list.

## Style Guidelines

- Keep descriptions concise (3-8 words)
- Match existing table/list formatting
- Alphabetize within sections where appropriate
- Focus on "what it is" not "how it works"
