# Agent‑First Documentation Refactor Report

**Date:** 2026-01-31  
**Project:** myBrain  
**Scope:** Instruction/rules/doc refactor to enforce agent‑first operating model while reducing CLAUDE.md bloat.

---

## Goals

1. **Preserve all existing requirements** from the original `CLAUDE.md` and rules ecosystem.
2. **Refactor for maintainability** by reducing CLAUDE.md bloat.
3. **Enforce agent‑first operations**: main Claude is lead engineer/designer; all execution via background agents; monitoring agents required; main Claude remains conversational with real‑time updates.
4. **Align documentation structure** so rules and reference docs are canonical, with CLAUDE.md as a lean router/index.

---

## Plan Followed

1. Remove the draft condensation file (was only an example).
2. Promote all `*-PROPOSED.md` rule/doc files to canonical names.
3. Introduce a single authoritative agent‑ops rule to enforce lead/monitoring agent model.
4. Slim `CLAUDE.md` into a router: warnings, required reading, and index only.
5. Move detailed content into `.claude/rules/` and `.claude/docs/` and update dynamic‑docs triggers accordingly.
6. Update skills and cross‑references to target the new doc structure.
7. Add a runbook doc to centralize run/test/deploy/troubleshooting guidance.

---

## Implementation Completed

### 1) Removed Draft
- Deleted `CLAUDE-PROPOSED.md` (no longer needed).

### 2) Canonicalized Rules & Docs (Proposed → Real)
- `.claude/rules/user-context-PROPOSED.md` → `.claude/rules/user-context.md`
- `.claude/rules/safety-PROPOSED.md` → `.claude/rules/safety.md`
- `.claude/rules/git-PROPOSED.md` → `.claude/rules/git.md`
- `.claude/docs/architecture-PROPOSED.md` → `.claude/docs/architecture.md`
- `.claude/docs/code-reuse-PROPOSED.md` → `.claude/docs/code-reuse.md`
- `.claude/docs/environment-PROPOSED.md` → `.claude/docs/environment.md`

### 3) Added Authoritative Agent Operating Model
- Added `.claude/rules/agent-ops.md` (authoritative agent model with lead engineer/designer + mandatory monitoring agents + background execution requirement).
- Updated `.claude/rules/work-style.md` to reference agent‑ops and require it in session start reads.

### 4) Slimmed CLAUDE.md into Router/Index
- Replaced bloated content with:
  - Critical warnings
  - Session start required reading
  - Full rules/docs/design index
  - Behavior summaries
  - Anti‑bloat guidance

### 5) Repointed Dynamic Docs & Memory Triggers
- `.claude/rules/dynamic-docs.md` now targets:
  - `.claude/docs/architecture.md` for models/routes/components/hooks/contexts/services/middleware
  - `.claude/docs/environment.md` for env vars
  - `SKILLS.md` for skills
- `.claude/memory.md` updated to reference new reading order and doc targets.

### 6) Updated Skills & Cross‑References
- `/sync-docs` updated to sync architecture/environment docs + `SKILLS.md` (not CLAUDE.md).
- `/rules-review` updated to include doc files in audits.
- `SKILLS.md` updated to reflect new `/sync-docs` scope.

### 7) Added Runbook
- Added `.claude/docs/runbook.md` to centralize run/test/deploy/troubleshooting guidance + test accounts.

### 8) Design Rule Alignment
- Added explicit design philosophy (symmetry, simplicity, harmonious proportions) to `.claude/rules/design.md`.

---

## Files Touched

### Removed
- `CLAUDE-PROPOSED.md`

### Added
- `.claude/rules/agent-ops.md`
- `.claude/docs/runbook.md`

### Renamed / Moved
- `.claude/rules/user-context-PROPOSED.md` → `.claude/rules/user-context.md`
- `.claude/rules/safety-PROPOSED.md` → `.claude/rules/safety.md`
- `.claude/rules/git-PROPOSED.md` → `.claude/rules/git.md`
- `.claude/docs/architecture-PROPOSED.md` → `.claude/docs/architecture.md`
- `.claude/docs/code-reuse-PROPOSED.md` → `.claude/docs/code-reuse.md`
- `.claude/docs/environment-PROPOSED.md` → `.claude/docs/environment.md`

### Edited
- `CLAUDE.md`
- `.claude/memory.md`
- `.claude/rules/work-style.md`
- `.claude/rules/dynamic-docs.md`
- `.claude/rules/design.md`
- `.claude/rules/safety.md`
- `.claude/skills/sync-docs/SKILL.md`
- `.claude/skills/rules-review/SKILL.md`
- `SKILLS.md`

---

## Where We Stand Now (Before vs After)

### Before
- `CLAUDE.md` was a monolithic handbook (large and drifting risk).
- Proposed docs existed but weren’t canonical, and links pointed to non‑existent paths.
- Dynamic update rules assumed CLAUDE.md held architecture/environment details.
- No single authoritative agent‑ops rule enforcing monitoring‑agent requirement.

### After
- `CLAUDE.md` is a **lean router/index** with warnings + required reading.
- **Canonical docs live in `.claude/rules/` and `.claude/docs/`** (architecture, environment, code‑reuse, runbook).
- **Agent‑first model is explicit and authoritative** in `.claude/rules/agent-ops.md`.
- Dynamic update triggers now target the canonical docs, not CLAUDE.md.
- Skill system aligns with the new doc layout.

---

## Final State Summary

- **Agent execution model is enforced** and centralized.
- **Documentation structure is modular** and reduces bloat risk.
- **Cross‑references now point to real files.**
- **Doc updates are routed to the right targets** (architecture/environment docs + SKILLS.md).

---

## Optional Next Steps (If Desired)

1. Run `/rules-review` to validate cross‑references and check for any remaining drift.
2. Run `/sync-docs` to ensure architecture/environment docs match current codebase state.
3. Commit with `/checkpoint` if you want to snapshot this refactor.

---

## Note on Deleted Reviews

You confirmed the following deleted review files should remain removed:
- `.claude/implementation-reviews/backend-api-review.md`
- `.claude/implementation-reviews/data-integrity-review.md`
- `.claude/implementation-reviews/frontend-code-review.md`
- `.claude/implementation-reviews/security-code-quality-review.md`
- `.claude/implementation-reviews/social-features-integration-review.md`
