# Agent Definitions

These `.md` files define agent roles and capabilities. They serve as **reference context for team spawn prompts**, not direct agent configurations.

## How They're Used

When the Team Lead creates an Agent Team or spawns a subagent, these files provide the role description and behavioral guidelines included in the agent's prompt.

## Available Agents

| File | Role |
|------|------|
| `qa-reviewer.md` | Code quality, security, and UI review |
| `test-writer.md` | Behavior-focused test writing |
| `prototype-fidelity-monitor.md` | React vs HTML prototype fidelity checking |
| `css-compliance-monitor.md` | CSS variable and dark mode compliance |
| `design-system-compliance-monitor.md` | Design system compliance monitoring |
| `visual-hierarchy-monitor.md` | Visual hierarchy and layout compliance |
| `accessibility-compliance-monitor.md` | WCAG AA accessibility compliance |
| `implementation-progress-monitor.md` | Implementation progress tracking |

## With Agent Teams

These same agent definitions work as teammate roles. When creating a team, reference the relevant agent file to define each teammate's responsibilities.
