# Claude Code Skills

Quick reference for available slash commands in `.claude/skills/`.

| Skill | What it does |
|-------|--------------|
| `/checkpoint` | Quick save - commits all changes and pushes to GitHub |
| `/code-reviewer` | Reviews code for quality, security, and best practices |
| `/commenter` | Adds comprehensive comments matching myBrain's style |
| `/logging-audit` | Audits backend routes for proper Wide Events logging |
| `/reuse-check` | Finds missed reuse opportunities and duplicate code |
| `/sync-docs` | Updates CLAUDE.md and SKILLS.md to reflect current codebase |

## Usage

Type the skill name as a slash command in Claude Code:

```
/checkpoint
```

Or with a target file/folder:

```
/commenter src/services/taskService.js
/reuse-check src/features/messages/
```

## When to Use Each

- **Starting work?** → No skill needed, just describe what you want
- **Done with a feature?** → `/checkpoint` to save your work
- **Wrote new code?** → `/code-reviewer` to check for issues
- **Code needs documentation?** → `/commenter` on the file
- **Suspect duplicate code?** → `/reuse-check` on the feature
- **Added new files/features?** → `/sync-docs` to update docs

## Skill Location

Skills are stored in `.claude/skills/<name>/SKILL.md`. Each skill has its own folder containing a `SKILL.md` file with instructions.
