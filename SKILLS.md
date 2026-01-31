# Claude Code Skills

Quick reference for available slash commands in `.claude/skills/`.

| Skill | What it does |
|-------|--------------|
| `/accessibility-audit` | Audit UI for WCAG AA accessibility compliance |
| `/agent-status` | Shows active agents with IDs, models, status, and progress |
| `/audit-now` | Full health check: coverage, security, dependencies, quality, performance |
| `/checkpoint` | Quick save - commits and pushes your changes to GitHub |
| `/code-reviewer` | Reviews code for quality, security, and best practices |
| `/commenter` | Adds comprehensive comments matching myBrain's style |
| `/design` | Quick design consultation - bounce ideas, get feedback |
| `/design-audit` | Comprehensive design system compliance audit |
| `/design-review` | Audit UI code for design system compliance |
| `/health-audit` | Comprehensive overnight audit (9 areas) with optional --fix mode and monitoring |
| `/inspiration` | Analyze images in inspiration folder, identify patterns |
| `/logging-audit` | Audits backend routes for proper Wide Events logging |
| `/prototype` | Create HTML/CSS/JS preview files for design ideas |
| `/qa-status` | Get current test coverage and code quality status |
| `/reuse-check` | Finds missed reuse opportunities and duplicate code |
| `/rules-review` | Audit all rules files and memory.md for structure, issues, redundancies, contradictions, and stale content |
| `/smoke-test` | Run automated browser tests to verify the app works |
| `/sync-docs` | Updates architecture/environment docs and SKILLS.md |
| `/theme-check` | Quick theme compliance verification (CSS variables, dark mode) |
| `/visual-qa` | Visual quality assurance - hierarchy, patterns, consistency |

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
- **Want to see running agents?** → `/agent-status` to see all active agents with models
- **Done with a feature?** → `/checkpoint` to save and push your work
- **Want to undo?** → Say "undo last commit" to revert
- **Check what changed?** → Say "show recent commits"
- **Made UI changes?** → `/smoke-test` to verify app still works
- **Wrote new code?** → `/code-reviewer` to check for issues
- **Code needs documentation?** → `/commenter` on the file
- **Suspect duplicate code?** → `/reuse-check` on the feature
- **Added new files/features?** → `/sync-docs` to update docs

### QA Skills
- **How's our test coverage?** → `/qa-status` for a quick summary
- **Full quality audit?** → `/audit-now` for comprehensive review
- **Overnight deep audit?** → `/health-audit` for 9-area audit with optional auto-fix

### Design Skills
- **Design question?** → `/design` to discuss ideas
- **UI looks inconsistent?** → `/design-review` to audit
- **Want to preview an idea?** → `/prototype` to create HTML sample
- **Added inspiration images?** → `/inspiration` to analyze them

### Design System Compliance Skills
- **Full design system audit?** → `/design-audit` for comprehensive review
- **Quick theme check?** → `/theme-check` for CSS variables and dark mode
- **Visual hierarchy issues?** → `/visual-qa` for hierarchy, patterns, consistency
- **Accessibility issues?** → `/accessibility-audit` for WCAG AA compliance

## Skill Location

Skills are stored in `.claude/skills/<name>/SKILL.md`. Each skill has its own folder containing a `SKILL.md` file with instructions.
