# CLAUDE.md

Personal productivity platform (MERN stack) with plugin-style architecture for aggressive feature growth.

---

## Critical Warnings

**Shared Database:** Dev and production use the SAME MongoDB Atlas database. Changes in dev affect production data. Only active users are the owner and test accounts.

**Production URLs:**
| Service  | URL                                | Host   |
|----------|-----------------------------------|--------|
| Frontend | https://my-brain-gules.vercel.app | Vercel |
| Backend  | https://mybrain-api.onrender.com  | Render |

---

## Session Start (Required Reading)

Before ANY work, read and understand these files completely:

1. **[.claude/memory.md](.claude/memory.md)** - Preferences, decisions, failed approaches
2. **[.claude/rules/agent-ops.md](.claude/rules/agent-ops.md)** - Agent operating model (authoritative)
3. **[.claude/rules/work-style.md](.claude/rules/work-style.md)** - Delegation + monitoring rules
4. **[.claude/rules/dynamic-docs.md](.claude/rules/dynamic-docs.md)** - Documentation update triggers

Failure to read these wastes user time and erodes trust.

---

## Documentation Index

### Rules (How to Behave)
| File | Purpose |
|------|---------|
| [agent-ops.md](.claude/rules/agent-ops.md) | Lead engineer + monitoring agent model (authoritative) |
| [work-style.md](.claude/rules/work-style.md) | Delegation, parallel execution, monitoring |
| [user-context.md](.claude/rules/user-context.md) | Non-coder communication rules |
| [design.md](.claude/rules/design.md) | UI/UX rules, design philosophy |
| [safety.md](.claude/rules/safety.md) | Safety rules and prohibited actions |
| [git.md](.claude/rules/git.md) | Git workflow + /checkpoint usage |
| [logging.md](.claude/rules/logging.md) | Wide Events logging pattern |
| [testing.md](.claude/rules/testing.md) | Test requirements and patterns |
| [qa-standards.md](.claude/rules/qa-standards.md) | QA expectations |
| [security.md](.claude/rules/security.md) | Security practices |
| [services.md](.claude/rules/services.md) | Backend service conventions |
| [api-errors.md](.claude/rules/api-errors.md) | API error handling standards |
| [frontend-components.md](.claude/rules/frontend-components.md) | UI component conventions |

### Reference (What Exists)
| File | Purpose |
|------|---------|
| [architecture.md](.claude/docs/architecture.md) | Codebase structure, models, routes, components |
| [code-reuse.md](.claude/docs/code-reuse.md) | Reuse requirements before creating new code |
| [environment.md](.claude/docs/environment.md) | Environment variables |
| [runbook.md](.claude/docs/runbook.md) | Run/test/deploy/troubleshoot guide |
| [agent-browser-docs.md](.claude/agent-browser-docs.md) | Browser automation commands |

### Design
| File | Purpose |
|------|---------|
| [design-system.md](.claude/design/design-system.md) | Colors, spacing, typography, components |
| [design-log.md](.claude/design/design-log.md) | Decisions, preferences, prototype history |
| [mobile-patterns.md](.claude/design/mobile-patterns.md) | Mobile implementation reference |

### Skills
See **[SKILLS.md](SKILLS.md)** for all available slash commands.

---

## Key Behaviors (Summary)

These are summaries. Authoritative details are in the linked files.

### Agent Delegation
Main Claude stays available for conversation. ALL work delegated to background agents.
Monitoring agents are mandatory for every task.
→ See [agent-ops.md](.claude/rules/agent-ops.md)

### User Communication
User has no coding experience. Explain simply, warn about risks, suggest next steps.
→ See [user-context.md](.claude/rules/user-context.md)

### Design Leadership
Main Claude is lead designer. Apply symmetry, simplicity, harmonious proportions.
→ See [design.md](.claude/rules/design.md)

### Code Reuse
Always check existing components/hooks/utilities before creating new ones.
→ See [code-reuse.md](.claude/docs/code-reuse.md)

### After Completing Features
Run `/checkpoint` to commit and push. Run `/smoke-test` after UI changes.

---

## Anti-Bloat Rule

This file is an index and warning surface. All detailed guidance lives in `.claude/rules/` or `.claude/docs/`.
If content grows beyond this scope, move it to the appropriate file and link here.
