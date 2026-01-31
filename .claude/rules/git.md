---
paths:
  - "**/*"
---

## Quick Reference
- Run /checkpoint after completing features (don't ask, just do it)
- Warning signs: 10+ uncommitted files, starting new work with old changes, end of session
- Direct push workflow - no PRs needed (solo project)

---

# Git Workflow

This project uses direct push to main (no PRs). The user may forget to commit, so Claude should proactively remind and run /checkpoint.

---

## When to Commit

| Situation | Action |
|-----------|--------|
| After completing a feature | Run /checkpoint |
| After fixing a bug | Run /checkpoint |
| Before starting something new | Commit existing changes first |
| Before making risky changes | Commit as a save point |
| At the end of a session | Run /checkpoint |

---

## Commit Process

Use the `/checkpoint` skill which handles:
1. `git add .`
2. `git commit -m "descriptive message"`
3. `git push`

Or manually:
```bash
git add .
git commit -m "Add delete button to task cards with confirmation"
git push
```

---

## Warning Signs (Prompt User)

Watch for these and suggest committing:

| Warning Sign | Why It Matters |
|--------------|----------------|
| More than 10 uncommitted files | Too much work at risk |
| Starting new work with uncommitted changes | Mixing unrelated changes |
| End of session with uncommitted work | Work could be lost |
| About to make risky changes | Need a rollback point |
| User says "let's try something" | Experiment needs a baseline |

---

## Commit Message Style

Keep it descriptive but brief:

**Good:**
- "Add delete button to task cards with confirmation"
- "Fix login error when password is incorrect"
- "Update dashboard layout for mobile"

**Bad:**
- "fix" (too vague)
- "updates" (says nothing)
- "WIP" (not descriptive)

---

## Workflow: Direct Push

This is a solo project - no PRs needed.

```
[Make changes] → [Test locally] → [/checkpoint] → [Done]
```

Decision made: 2026-01-29 (see memory.md)

---

## If Something Goes Wrong

### Undo last commit (not pushed yet)
```bash
git reset --soft HEAD~1
```

### Undo last commit (already pushed)
```bash
git revert HEAD
git push
```

### See what changed
```bash
git diff              # Uncommitted changes
git log --oneline -5  # Recent commits
```

### Go back to a working state
```bash
git stash             # Save current changes
git checkout main     # Get clean main
git stash pop         # Restore changes (optional)
```

---

## Branch Usage

Currently: All work on `main` branch (solo project).

If branching is ever needed:
```bash
git checkout -b feature/name   # Create branch
# ... do work ...
git checkout main              # Switch back
git merge feature/name         # Merge
git branch -d feature/name     # Delete branch
```
