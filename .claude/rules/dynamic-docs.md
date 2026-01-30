---
paths: ["**/*"]
---

## Quick Reference
- Update memory.md when: preferences detected, decisions made, approaches fail, concepts explained
- Update CLAUDE.md when: new code/models/routes/components/hooks/services created
- Create skill when: same task done 3+ times, user says "I wish I could..."
- Create rule when: behavior must be consistently enforced
- Immediate updates: failed approaches, preferences, new skills (don't batch)
- Remove outdated docs proactively - wrong docs are worse than no docs
- Keep quick references synced with body content

---

# Dynamic Documentation Updates

**Key Principle:** Be proactive. Don't wait to be asked. If a trigger condition is met, act on it immediately.

Documentation is only useful if it stays current. This file enforces automatic updates to project documentation as work happens.

---

## Update memory.md When...

### User Preferences Detected

**Trigger phrases:**
- "I prefer...", "I like...", "I want..."
- "Don't do...", "Never...", "Stop..."
- "Always...", "From now on..."
- "That's annoying", "I hate when..."

**Action:** Add to `## User Preferences` table with the exact preference and context.

**Example:**
> User: "I prefer you explain changes before making them"
>
> Action: Add row to User Preferences: `| Explain first | User wants explanations before code changes | High |`

### Decision Made

**Trigger:** Any architectural, design, workflow, or tooling decision that should persist.

**Indicators:**
- "Let's go with..."
- "We decided to..."
- Choosing between alternatives
- Setting a standard or pattern

**Action:** Add to `## Decisions Made` table with date, decision, and reasoning.

**Example:**
> User approves using TanStack Query over Redux for server state
>
> Action: Add: `| 2026-01-29 | TanStack Query for server state | Better caching, simpler than Redux for API data |`

### Approach Failed

**Trigger:** Something was tried and didn't work.

**Indicators:**
- Error that required rollback
- Approach that broke functionality
- Solution that user rejected
- Performance issue discovered

**Action:** Add to `## Failed Approaches` table with date, what was tried, and why it failed.

**Why this matters:** Prevents repeating mistakes across sessions.

### Concept Explained

**Trigger:** Explaining a technical concept to the user.

**Action:** Add to `## Knowledge Growth` table with date, concept, and understanding level.

**Understanding levels:**
- `Basic` - Knows what it is
- `Intermediate` - Understands how to use it
- `Advanced` - Could explain it to others

**Why this matters:** Avoids over-explaining things the user already knows.

### Session Ends with Significant Work

**Trigger:** Any of these completed:
- Feature implemented
- Bug fixed
- Major refactoring
- Infrastructure change
- Multiple files modified

**Action:** Add one-line summary to `## Session Log` table.

**Format:** `| YYYY-MM-DD | **TITLE**: Brief description of what was accomplished |`

### Repetitive Task Observed

**Trigger:** Performing the same manual task that was done before.

**Action:**
1. Check if task exists in `## Repetitive Tasks` table
2. If exists: increment count
3. If new: add with count = 1

**Threshold:** When count reaches 3+, suggest creating a skill.

---

## Update CLAUDE.md When...

### New Code Created

| Created | Section to Update |
|---------|-------------------|
| New model in `models/` | Add to Models table |
| New route in `routes/` | Add to Routes list |
| New component in `components/ui/` | Add to UI Components table |
| New hook in `hooks/` | Add to Hooks table |
| New context in `contexts/` | Add to Contexts table |
| New service in `services/` | Add to Services list |
| New middleware in `middleware/` | Add to Middleware list |
| New skill in `.claude/skills/` | Add to Custom Skills section |

**Action:** Update the relevant table/list in CLAUDE.md with the new item, its file path, and purpose.

### Environment Variable Added

**Trigger:** Any of:
- New `process.env.SOMETHING` in backend
- New `import.meta.env.SOMETHING` in frontend
- New entry in `.env.example`

**Action:** Add to Environment Variables section with name and purpose.

### New Pattern Established

**Trigger:** Introducing a new way of doing things that should be consistent.

**Examples:**
- New error handling approach
- New component structure pattern
- New testing strategy
- New API response format

**Action:** Add to Key Patterns section with description and example.

### Project Structure Changes

**Trigger:** Adding new directories or reorganizing existing structure.

**Action:** Update the Architecture diagram in CLAUDE.md.

---

## Create New Skill When...

### Same Task Done 3+ Times

**Trigger:** `## Repetitive Tasks` count reaches 3 for any task.

**Action:**
1. Notify user: "I've done [task] 3 times now. Want me to create a skill for it?"
2. If approved, create skill in `.claude/skills/<name>/SKILL.md`
3. Add to CLAUDE.md Custom Skills section

### User Says "I wish I could just..."

**Trigger phrases:**
- "I wish I could just..."
- "It would be nice if..."
- "Can we automate..."
- "Is there a way to quickly..."

**Action:** Immediately suggest creating a skill. If user agrees, create it.

### Complex Multi-Step Process Identified

**Trigger:** A task requiring 5+ manual steps that will be repeated.

**Action:** Suggest bundling into a skill with clear description of what it would automate.

---

## Create New Rule When...

### Behavior Needs Consistent Enforcement

**Trigger:** A behavior that should ALWAYS or NEVER happen.

**Examples:**
- "Always run tests before committing"
- "Never modify production data directly"
- "Always use BaseModal for dialogs"

**Action:** Create rule file in `.claude/rules/<name>.md` with frontmatter specifying which paths it applies to.

### User Preference Should Always Apply

**Trigger:** A preference that's strong enough to be a rule, not just a preference.

**Difference from preference:**
- Preference: "I prefer dark mode" (nice to have)
- Rule: "Never push without testing" (must enforce)

**Action:** Create rule file or add to existing relevant rule file.

### Important Pattern Must Not Be Forgotten

**Trigger:** A pattern or practice that caused problems when not followed.

**Action:** Create rule to enforce it, referencing the incident that prompted it.

---

## Proactive Documentation Checklist

At the end of each significant task, check:

- [ ] Did user express any preferences? → Update memory.md
- [ ] Was a decision made? → Update memory.md
- [ ] Did something fail? → Document in memory.md
- [ ] Was a concept explained? → Log in memory.md
- [ ] Was code created? → Update CLAUDE.md
- [ ] Is this task repetitive? → Track count, suggest skill at 3+
- [ ] Should this behavior be enforced? → Consider a rule

---

## Update Timing

**Immediate updates (don't batch):**
- Failed approaches (before forgetting details)
- User preferences (capture exact wording)
- New skills created

**End of task updates:**
- Session log entry
- CLAUDE.md code additions
- Repetitive task counts

**Why immediate matters:** Context degrades over time. Capture decisions and failures while details are fresh.

---

## Cross-Reference Consistency

When updating documentation, ensure consistency:

1. **Skills appear in both:**
   - `.claude/skills/<name>/SKILL.md` (the skill itself)
   - `CLAUDE.md` Custom Skills section (reference)
   - `SKILLS.md` quick reference (if exists)

2. **Decisions appear in:**
   - `memory.md` Decisions Made (always)
   - `CLAUDE.md` if it affects documented patterns
   - Relevant `.claude/design/` files if design-related

3. **New code appears in:**
   - `CLAUDE.md` appropriate section
   - Related documentation (e.g., new auth middleware → update auth section)

---

## Maintain Quick References

**When updating any rule file that has a quick reference section:**

1. **Sync additions** - When adding a key rule, also add it to that file's quick reference
2. **Key rules = quick reference worthy** - Core behavior, frequently needed patterns, critical requirements
3. **Minor details = body only** - Edge cases, detailed examples, implementation notes
4. **Sync removals** - If a rule is removed, also remove from quick reference
5. **Keep them aligned** - Quick references should reflect the current body content, not stale snapshots

**What belongs in quick references:**
- Rules that affect most work in that domain
- Common mistakes to avoid
- Patterns that must be followed consistently
- Things you'll need to reference frequently

**What doesn't:**
- Detailed examples (link to body instead)
- Edge case handling
- Historical context
- Verbose explanations

---

## Maintenance & Cleanup

**Key Principle:** Documentation should be living and accurate, not a graveyard of outdated info. Prune actively.

Documentation that's wrong is worse than no documentation - it misleads and wastes time. Removal is just as important as addition.

### Remove from memory.md When...

| Condition | Action |
|-----------|--------|
| Preference contradicted by newer preference | Remove old, keep new |
| Decision reversed or superseded | Remove old decision, add new with "supersedes" note |
| "Failed approach" later made to work | Remove from failed, optionally add to decisions |
| User's knowledge grew beyond documented level | Update knowledge level or remove if obvious |
| Promise/commitment fulfilled | Remove from tracking |
| Session log entry older than useful context | Archive or remove entries older than ~30 days |

**Example:**
> memory.md says "User prefers tabs over spaces"
> User later says "Actually, let's use spaces everywhere"
> Action: Remove the tabs preference, add spaces preference

### Remove from CLAUDE.md When...

| Condition | Action |
|-----------|--------|
| Model deleted from `models/` | Remove from Models table |
| Route deleted from `routes/` | Remove from Routes list |
| Component deleted from `components/` | Remove from Components table |
| Hook deleted from `hooks/` | Remove from Hooks table |
| Service deleted from `services/` | Remove from Services list |
| Middleware deleted | Remove from Middleware list |
| Environment variable no longer used | Remove from Environment Variables |
| Pattern deprecated or replaced | Remove old pattern, document new one |
| Directory structure changed | Update Architecture diagram |

**When refactoring:** If you rename or move something, update all references in documentation - don't leave stale paths.

### Remove/Update Skills When...

| Condition | Action |
|-----------|--------|
| Skill becomes obsolete | Delete skill file, remove from CLAUDE.md and SKILLS.md |
| Better approach replaces skill | Update skill or replace entirely |
| Skill merged into another | Delete merged skill, update surviving skill's docs |
| Skill's underlying code changed | Update skill instructions to match |

**Before deleting a skill:** Check if user explicitly created/requested it. If so, ask before removing.

### Remove Rules When...

| Condition | Action |
|-----------|--------|
| Rule superseded by better rule | Remove old rule file |
| Behavior no longer needed | Delete rule file |
| Rule conflicts with newer preferences | Remove conflicting rule, preference wins |
| Rule was for temporary situation | Delete when situation resolved |

**Example:**
> Rule says "Always use lodash for array operations"
> Team decides native JS methods are preferred now
> Action: Remove the lodash rule

### Cleanup Triggers

**Proactive cleanup moments:**
- When contradictory information is noticed
- When documentation references deleted code
- When following documented steps that no longer work
- At the start of a new major feature (good time for doc audit)
- When user says "that's not right anymore"

**Reactive cleanup:**
- User explicitly says something is outdated
- Build/lint/test fails due to stale documentation
- Following docs leads to errors

### Cross-Reference Cleanup

When removing something, check all related locations:

1. **Deleting a skill:**
   - `.claude/skills/<name>/SKILL.md` (delete)
   - `CLAUDE.md` Custom Skills section (remove reference)
   - `SKILLS.md` quick reference (remove entry)

2. **Deleting code:**
   - `CLAUDE.md` relevant table (remove row)
   - Any rules that reference it (update or remove)
   - `memory.md` if decisions referenced it (update context)

3. **Reversing a decision:**
   - `memory.md` Decisions Made (remove old, add new)
   - `CLAUDE.md` if patterns changed (update)
   - Rules if behavior changed (update or remove)

---

## Don't Document These

Not everything needs documentation. Skip:

- Trivial one-time fixes
- Typo corrections
- Dependency updates (unless breaking)
- Routine file moves
- Temporary debugging code
- User's personal notes or comments

Focus documentation on things that affect future work.
