---
paths:
  - "**/*"
---

## Quick Reference
- Never delete DB data, modify .env with real creds, or use --force without asking
- Push to main is normal, but only after tests and /checkpoint
- Always test locally, commit before risky changes, back up before migrations
- Never commit: .env, credentials.json, any file with secrets

---

# Safety Rules

These actions require explicit user permission or have hard restrictions.

---

## Never Do Without Asking

| Action | Risk | Ask First |
|--------|------|-----------|
| Delete database collections/documents | Data loss, affects production (shared DB) | Always |
| Modify `.env` with real credentials | Security exposure | Always |
| Run commands with `--force` flags | Can't undo, may lose work | Always |
| Modify payment code | Financial risk | Always |
| Modify authentication code | Security risk | Always |
| Run database migrations | Data transformation, hard to reverse | Always |
| Delete files that might be needed | Data loss | Always |

---

## Always Do

| Action | Why |
|--------|-----|
| Test locally before deploying | Catch bugs before they hit production |
| Commit before risky changes | Easy rollback if something breaks |
| Back up database before migrations | Data safety |
| Review changes before pushing | Last check for mistakes |
| Use /checkpoint after features | Ensures work is saved |
| Run /smoke-test after UI changes | Catches obvious breaks |

---

## Files to Never Commit

These contain secrets - never push to GitHub:

| File Pattern | Contains |
|--------------|----------|
| `.env` | API keys, database URLs, secrets |
| `.env.*` | Environment-specific secrets |
| `credentials.json` | Service account credentials |
| `serviceAccount.json` | Firebase/GCP credentials |
| `*.pem` | Private keys |
| `*.key` | Private keys |
| Any file with passwords/tokens | Secrets |

**If accidentally committed:**
1. Remove from git: `git rm --cached <file>`
2. Add to .gitignore
3. Rotate the exposed credentials immediately
4. Force push to remove from history (ask user first)

---

## Shared Database Warning

**Dev and production use the SAME MongoDB Atlas database.**

This means:
- Test data created in dev appears in production
- Deleting data in dev deletes it from production
- Schema changes affect production immediately
- Only real users: owner + test accounts

**Before any database operation:**
1. Confirm it won't affect real user data
2. Use test accounts for testing
3. Back up if doing anything destructive

---

## Deployment Safety

Before pushing to production:

1. **Test locally** - Does everything work?
2. **Check console** - Any JavaScript errors? (F12)
3. **Run /smoke-test** - Automated verification
4. **Commit all changes** - Nothing left uncommitted
5. **Know the rollback** - What's the last working commit?

**If something breaks in production:**
1. Don't panic
2. Check the error logs
3. Revert to last working commit if needed: `git revert HEAD`
4. Fix properly, then redeploy

---

## Git Safety

| Safe | Dangerous |
|------|-----------|
| `git add .` | `git push --force` |
| `git commit -m "..."` | `git reset --hard` |
| `git push` | `git rebase` on shared branches |
| `git revert` | `git clean -fd` |

**Never use without explicit user request:**
- `--force` flags
- `--hard` flags
- Interactive rebase on main

---

## When User Asks for Something Risky

1. **Acknowledge** the request
2. **Explain** the specific risk
3. **Offer** a safer alternative if possible
4. **Confirm** they want to proceed
5. **Execute** only after confirmation

**Example:**
> User: "Delete all the test tasks from the database"
>
> Claude: "That will delete tasks from the production database too (they share the same DB).
> I can either:
> A) Delete only tasks created by test accounts
> B) Delete tasks with 'test' in the title
> C) Proceed with deleting all tasks (affects production)
> Which would you prefer?"
