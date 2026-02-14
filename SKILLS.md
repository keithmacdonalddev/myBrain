# Claude Code Skills

Quick reference for available slash commands in `.claude/skills/`.

| Skill | What it does |
|-------|--------------|
| `/accessibility-audit` | Audit UI for WCAG AA accessibility compliance |
| `/playground` | Create interactive HTML configurators with controls, live preview, and copyable prompt output. Six templates available: design-playground, data-explorer, concept-map, document-critique, diff-review, code-map |
| `/agent-status` | Shows active agents and teammates with status. For teams: Shift+Up/Down to navigate |
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
| `/mem-search` | Search past session history - find files touched, commands run |
| `/mem-status` | Show memory system status - sessions, observations, storage size |
| `/memory-agent` | Live memory management agent that runs in background throughout session |
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
- **What did I work on before?** → `/mem-search` to search session history

### QA Skills
- **How's our test coverage?** → `/qa-status` for a quick summary
- **Full quality audit?** → `/audit-now` for comprehensive review
- **Overnight deep audit?** → `/health-audit` for 9-area audit with optional auto-fix

### Design Skills
- **Design question?** → `/design` to discuss ideas
- **UI looks inconsistent?** → `/design-review` to audit
- **Want to preview an idea?** → `/prototype` to create static HTML sample
- **Want to configure something visually?** → `/playground` to create interactive configurator
  - Templates: `design-playground` (visual styling), `data-explorer` (queries), `concept-map` (learning), `document-critique` (review workflow), `diff-review` (code review), `code-map` (architecture)
  - Example: `/playground:design-playground` or `/playground:diff-review`
- **Added inspiration images?** → `/inspiration` to analyze them

### Design System Compliance Skills
- **Full design system audit?** → `/design-audit` for comprehensive review
- **Quick theme check?** → `/theme-check` for CSS variables and dark mode
- **Visual hierarchy issues?** → `/visual-qa` for hierarchy, patterns, consistency
- **Accessibility issues?** → `/accessibility-audit` for WCAG AA compliance

## Skill Location

Skills are stored in `.claude/skills/<name>/SKILL.md`. Each skill has its own folder containing a `SKILL.md` file with instructions.

## Playground Templates

The `/playground` skill creates interactive HTML explorers for visual configuration. Available templates:

| Template | Use For | Example Use Cases |
|----------|---------|-------------------|
| `design-playground` | Visual design decisions | CSS tweaking, component styling, spacing/typography exploration |
| `data-explorer` | Query building | SQL queries, API parameters, regex patterns, data pipelines |
| `concept-map` | Learning and exploration | Knowledge gaps, scope mapping, concept relationships |
| `document-critique` | Document review | Approve/reject/comment workflow for plans, specs, proposals |
| `diff-review` | Code review | Line-by-line commentary on git diffs, commits, PRs |
| `code-map` | Architecture visualization | Component relationships, data flow, layer diagrams |

**Usage:** `/playground:template-name`

**How it works:**
1. Creates self-contained HTML file with interactive controls
2. Adjust controls visually to configure what you want
3. Copy generated prompt from output area
4. Paste prompt back to Claude for implementation
