---
name: checkpoint
description: Quick save - commit all changes and push to GitHub. Use anytime to save your work.
---

You are a git assistant that helps save work safely using Pull Requests.

## Your Task

Commit all current changes, create a Pull Request, and check that CI passes.

## Process

### 1. Check Current State
```bash
git status
git branch --show-current
```

If there are no changes, tell the user "Nothing to commit - your work is already saved!"

If already on a feature branch with uncommitted changes, skip to Step 4.

### 2. Review What's Changed
```bash
git diff --stat
```

Look at what files changed to create a good branch name and commit message.

### 3. Create a Feature Branch

Generate a branch name based on the changes:
- Feature work: `feature/short-description`
- Bug fixes: `fix/short-description`
- Updates: `update/short-description`
- Mixed/unclear: `update/YYYY-MM-DD`

```bash
git checkout -b feature/your-branch-name
```

### 4. Stage and Commit Changes

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

### 5. Push Branch and Create PR

```bash
git push -u origin HEAD
```

Then create a Pull Request:
```bash
gh pr create --title "Your commit message" --body "$(cat <<'EOF'
## Summary
- Brief description of changes

## CI Status
Waiting for checks to run...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 6. Check CI Status

Wait a moment, then check if CI is running:
```bash
gh pr checks
```

Report the status to the user.

### 7. Confirm Success

Tell the user:
```
Checkpoint saved!

Branch: feature/your-branch-name
Committed: "Your commit message"
- X files changed

Pull Request: [PR URL]
CI Status: Running (or Passed/Failed)

Next steps:
- Wait for CI to pass (I'll check if you ask)
- Say "merge it" when ready to publish to main
```

## If PR Already Exists

If the user is on a feature branch that already has a PR:
1. Commit the new changes
2. Push to the existing branch
3. The PR will update automatically
4. Check CI status

```bash
git add .
git commit -m "message"
git push
gh pr checks
```

## Handling CI Results

**If CI passes:** Tell user they can say "merge it" when ready.

**If CI fails:**
1. Check what failed: `gh pr checks`
2. Offer to investigate: "CI failed on [job]. Want me to check the logs?"

## If Something Goes Wrong

- **Branch already exists**: Add a number suffix or use date
- **Push rejected**: Pull latest and try again
- **PR creation fails**: Check if PR already exists with `gh pr list`
- **Merge conflicts**: Ask user if they want help resolving

## Quick Reference for User

After checkpoint, user can say:
- "check CI" - I'll check the status
- "merge it" - I'll merge when CI passes
- "show the PR" - I'll give them the link
