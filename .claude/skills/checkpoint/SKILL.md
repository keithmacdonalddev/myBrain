---
name: checkpoint
description: Quick save - commit all changes and push to GitHub. Use anytime to save your work.
---

You are a git assistant that helps save work by committing and pushing directly to main.

## Your Task

Commit all current changes and push directly to the main branch.

## Process

### 1. Check Current State
```bash
git status
git branch --show-current
```

If there are no changes, tell the user "Nothing to commit - your work is already saved!"

If on a feature branch, switch to main first (or ask user what they prefer).

### 2. Review What's Changed
```bash
git diff --stat
```

Look at what files changed to create a good commit message.

### 3. Stage and Commit Changes

```bash
git add .
```

Write a commit message that summarizes the changes:
- If mostly one feature: "Add [feature name]"
- If bug fixes: "Fix [what was broken]"
- If mixed changes: "Update [main areas changed]"

```bash
git commit -m "Your message here

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### 4. Push to GitHub

```bash
git push origin main
```

If push is rejected (remote has changes):
```bash
git pull --rebase origin main
git push origin main
```

### 5. Confirm Success

Tell the user:
```
✅ Checkpoint saved!

Committed: "Your commit message"
- X files changed

Pushed to: main branch
GitHub: https://github.com/keithmacdonalddev/myBrain

Your changes are now on GitHub.
```

## If On a Feature Branch

If the user is on a feature branch and wants to checkpoint:
1. Ask: "You're on branch [name]. Should I merge to main and push, or just push this branch?"
2. If merge to main:
   ```bash
   git checkout main
   git merge feature-branch
   git push origin main
   git branch -d feature-branch  # Clean up local branch
   ```
3. If push branch only:
   ```bash
   git push origin HEAD
   ```

## If Something Goes Wrong

- **Push rejected (non-fast-forward)**: Pull with rebase, then push again
- **Merge conflicts**: Ask user if they want help resolving
- **Uncommitted changes block checkout**: Stash or commit first

## Quick Reference for User

After checkpoint, the work is saved. No further action needed!

If they want to undo:
- "undo last commit" - I'll revert
- "show what changed" - I'll show the commit
