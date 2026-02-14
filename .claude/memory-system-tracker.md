# Memory System Tracker

**Purpose:** Track the custom memory system over the next week. Point Claude to this file at session start.

**Quick Start for Claude:** Read this entire file, then run the verification checks below.

---

## Current Status (2026-02-01)

**TL;DR:** Live background Haiku agent runs throughout each session doing continuous AI summarization.

### What Was Just Done (2026-02-01 ~04:30)
- **MAJOR CHANGE:** Implemented LIVE BACKGROUND MEMORY AGENT
- `inject-context.mjs` now spawns a background `claude -p` with Haiku model at session start
- Agent loops every 2-3 minutes, consolidating and summarizing
- Agent dies automatically when VS Code closes (child process)
- `finalize-session.mjs` kills PID on graceful exit (Stop/SessionEnd hooks)
- Added SessionEnd hook as backup to Stop hook
- PID tracking prevents duplicate agents (`.claude/memory/.memory-agent.pid`)
- 4-hour timeout in agent prompt as safety net

### How It Works Now
1. **Session starts** → `inject-context.mjs` spawns Haiku agent in background
2. **During session** → Agent loops every 2-3 min, consolidates if 50+ new lines
3. **Graceful exit** → Stop/SessionEnd hooks kill PID via `finalize-session.mjs`
4. **VS Code closes** → Child process dies automatically (no orphans)

### Previous Work (2026-01-31)
- Reviewed claude-mem codebase and compared to our implementation
- Fixed 5 bugs (path handling, timezone, duplicate markers, etc.)
- Added rich observation format (emojis, file types, stats)
- Added tagged content preservation for folder CLAUDE.md
- Added home directory safety guards

### Live Agent Features
1. **Continuous AI summarization** - Not just mechanical grouping
2. **Decision extraction** - Finds "decided to", "I prefer", etc. and adds to memory.md
3. **Smart consolidation** - Groups repeated file touches intelligently
4. **Time-based preservation** - Last 30 min detailed, older summarized
5. **Self-terminating** - Exits after 4 hours or 30 min of no changes

### What's Verified ✅
- All hook scripts pass `node --check`
- Hooks configured in settings.local.json
- PID file system for preventing duplicates
- Stop + SessionEnd hooks for cleanup

### What's NOT Verified Yet ⚠️
- Live agent actually spawning (restart session to test)
- Agent loop behavior working correctly
- Orphan prevention when VS Code crashes

---

## What Was Built

A custom memory system inspired by claude-mem but without its problems:

| Component | File | Purpose |
|-----------|------|---------|
| Observation capture + consolidation | `.claude/hooks/capture-observation.mjs` | Auto-captures every tool use AND consolidates automatically |
| Context injection | `.claude/hooks/inject-context.mjs` | Injects last 3 days at session start |
| Session finalization | `.claude/hooks/finalize-session.mjs` | Writes session end marker |
| Folder context | `.claude/hooks/generate-folder-context.mjs` | Creates CLAUDE.md in active folders |
| Consolidation state | `.claude/memory/.consolidation-state.json` | Tracks observation counts for consolidation triggers |
| Search skill | `.claude/skills/mem-search/SKILL.md` | Search past sessions |
| Status skill | `.claude/skills/mem-status/SKILL.md` | Check system health |

**Storage:** `.claude/memory/sessions/YYYY-MM-DD.md`

**Config:** `.claude/settings.local.json` (hooks section)

---

## Session Start Verification (Run Every Session)

### Quick Health Check

```bash
# 1. Session files exist?
ls -la .claude/memory/sessions/

# 2. Today's file being written?
cat .claude/memory/sessions/$(date +%Y-%m-%d).md 2>/dev/null | tail -10

# 3. Hook scripts valid?
node --check .claude/hooks/capture-observation.mjs && echo "capture: OK"
node --check .claude/hooks/inject-context.mjs && echo "inject: OK"
node --check .claude/hooks/finalize-session.mjs && echo "finalize: OK"
node --check .claude/hooks/generate-folder-context.mjs && echo "folder-context: OK"

# 4. Folder CLAUDE.md files created?
find . -name "CLAUDE.md" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.claude/*" 2>/dev/null
```

### Or Just Run
```
/mem-status
```

---

## Weekly Testing Checklist

### Day 1-2: Basic Functionality
- [ ] Observations being captured (check session file has entries)
- [ ] Session files have correct date format
- [ ] Timestamps are accurate
- [ ] Tool types captured correctly (Read, Edit, Bash, etc.)
- [ ] File paths captured correctly

### Day 3-4: Context Injection
- [ ] New sessions show recent history in context
- [ ] Last 3 days of history visible
- [ ] Context is relevant and useful
- [ ] Not too verbose (manageable token count)

### Day 5-6: Folder Context
- [ ] CLAUDE.md files created in active folders
- [ ] Root CLAUDE.md NOT touched
- [ ] Only folders with 5+ observations get files
- [ ] .git/, node_modules/ properly skipped
- [ ] Content is accurate and useful

### Day 7: AI Features
- [ ] Session summaries being written
- [ ] Summaries are accurate and concise
- [ ] Summary appears at end of session file

---

## Issue Tracking

### Known Issues

| Date | Issue | Status | Notes |
|------|-------|--------|-------|
| 2026-01-31 | AI summary agent can't find session file | Fixed | Updated prompt to be more explicit - step-by-step instructions |
| 2026-01-31 | Folder context path handling bug | Fixed | extractFolderFromObservation now handles absolute paths correctly |
| 2026-01-31 | Multiple session end markers | Fixed | Added 2-minute cooldown to prevent rapid duplicate markers |
| 2026-01-31 | StructuredOutput captured as observation | Fixed | Added to skip list in capture-observation.mjs |
| 2026-01-31 | Timezone mismatch (UTC date, local time) | Fixed | Changed to use local date in both capture and finalize hooks |

### Issues Found This Week

| Date | Issue | Severity | Reproduction Steps | Status |
|------|-------|----------|-------------------|--------|
| 2026-01-31 | Folder context path bug | Critical | Any session with file operations would fail to create folder CLAUDE.md | Fixed |
| 2026-01-31 | Multiple session end markers | Low | Stop and restart session rapidly | Fixed |
| 2026-01-31 | StructuredOutput noise | Low | Any session - internal tool captured | Fixed |
| 2026-01-31 | Timezone mismatch | Medium | Use system near midnight UTC | Fixed |
| 2026-01-31 | AI summary can't find file | Medium | End session - agent looks in wrong path | Fixed |
| 2026-01-31 | Folder CLAUDE.md duplicate content | Low | Legacy content from before tags existed | Fixed (cleaned manually) |

---

## What's Working Well

| Date | Observation |
|------|-------------|
| 2026-01-31 | **Multi-instance stress test passed** - 3 Claude instances working in parallel, no race conditions |
| 2026-01-31 | Session file grew 68% (33KB→55KB) in 2 minutes under heavy load |
| 2026-01-31 | Observation capture is reliable - every tool use logged correctly |
| 2026-01-31 | Hook scripts are valid JavaScript with proper error handling |
| 2026-01-31 | Silent fail pattern prevents breaking Claude Code |
| 2026-01-31 | Session file format is clean and searchable |

---

## What Needs Improvement

| Date | Issue | Proposed Fix | Priority |
|------|-------|--------------|----------|
| 2026-01-31 | AI summary agent reliability | Monitor if new prompt works - may need further refinement | Medium |
| 2026-01-31 | Context injection not yet verified | Need to start new session to test | Low |

---

## Metrics to Track

### Observation Quality
- Are file paths accurate?
- Are timestamps correct?
- Are all tool types captured?
- Any missing observations?

### Context Usefulness
- Is injected context helpful?
- Is it too much/too little?
- Does it help with continuity?

### Folder Context
- Are the right folders getting CLAUDE.md?
- Is the content useful when working in those folders?
- Any unwanted files being created?

### AI Summary Quality
- Are summaries accurate?
- Are they concise enough?
- Do they capture the key work done?

---

## Session Notes

### Template for Each Session

```markdown
### Session: YYYY-MM-DD HH:MM

**Memory System Status:**
- Observations today: X
- Session files: X total
- Folder CLAUDE.md files: X

**Issues Found:**
- (none / describe issues)

**Working Well:**
- (observations)

**Changes Made:**
- (if any fixes/improvements made)
```

---

### Session Notes Log

(Add notes below as you monitor the system)

### Session: 2026-01-31 18:37 (BASELINE)

**Memory System Status:**
- Session files: 1 total (2026-01-31.md)
- Observations today: 50+ (was 43 at last session end, now actively capturing)
- Storage: 4817 bytes
- Folder CLAUDE.md files: 1 (root only - no auto-generated ones yet)

**Hook Validation:**
- capture-observation.mjs: OK
- inject-context.mjs: OK
- finalize-session.mjs: OK
- generate-folder-context.mjs: OK

**Hooks Configuration (settings.local.json):**
- SessionStart: inject-context.mjs (5s timeout)
- PostToolUse: capture-observation.mjs (5s timeout, matches .*)
- Stop:
  - finalize-session.mjs (10s timeout)
  - generate-folder-context.mjs (15s timeout)
  - AI summary agent (30s timeout)

**What's Working:**
- Observations are being captured correctly
- Tool types captured: Read, Write, Edit, Glob, Grep, Bash, Task, Skill, WebFetch, WebSearch
- Timestamps are accurate (HH:MM format)
- File paths captured correctly
- Session file has correct date format (YYYY-MM-DD.md)
- Session end markers being written (shows observation count)
- Multiple session boundaries visible in today's file (7 session ends)
- Skip list working: TodoWrite, TodoRead, AskUserQuestion excluded

**Issues Found:**
- AI summary agent couldn't find session file (prompt was too vague)

**Changes Made:**
- Updated agent prompt in settings.local.json to be step-by-step:
  1. Run `date +%Y-%m-%d` first
  2. Then read the specific file
  3. Use Edit tool to append (not Write)

**Notes:**
- This is Day 1 baseline before active tracking begins
- Folder context generation requires 5+ observations per folder
- No auto-generated folder CLAUDE.md files yet (expected - need more activity in specific folders)
- Context injection configured for last 3 days, max 30 lines per day

### Session: 2026-01-31 18:50 (BUG FIXES)

**Issues Identified & Fixed:**

1. **Folder Context Path Bug (Critical)**
   - Problem: `extractFolderFromObservation()` returned absolute paths like `C:/Users/.../myBrain-api/src/routes`
   - Then `generateFolderClaudeMd()` joined with PROJECT_ROOT again = invalid path
   - Fix: Now strips PROJECT_ROOT prefix from absolute paths before processing

2. **Multiple Session End Markers**
   - Problem: Every Stop hook (including AI agent stops) wrote "Session ended at" marker
   - Result: 9 markers in one day's file
   - Fix: Added 2-minute cooldown - skips if last marker was < 2 mins ago

3. **StructuredOutput in Skip List**
   - Problem: Internal Claude tool was being captured as observations
   - Fix: Added to skipTools array in capture-observation.mjs

4. **Timezone Mismatch**
   - Problem: Date used `toISOString()` (UTC) but time used `toTimeString()` (local)
   - Near midnight, file date wouldn't match observation times
   - Fix: Both capture and finalize hooks now use local date

**Verification:**
- All hook scripts pass `node --check`
- Scripts ready for testing on next session

### Session: 2026-01-31 19:38 (MONITORING)

**Memory System Status:**
- Session files: 1 total (2026-01-31.md, 18KB, 276 lines)
- Observations today: 190+ (growing as session continues)
- Folder CLAUDE.md files: 2 auto-generated ✅

**Hook Validation:**
- capture-observation.mjs: OK ✅
- inject-context.mjs: OK ✅
- finalize-session.mjs: OK ✅
- generate-folder-context.mjs: OK ✅

**What's Working:**
- Observation capture with rich format (emojis, file types)
- Session end markers with observation counts
- Multiple session boundaries visible (181, 183, 187 observations)
- **Folder CLAUDE.md generation working** - 2 files created:
  - `myBrain-api/src/models/CLAUDE.md` (10 observations)
  - `myBrain-api/src/routes/CLAUDE.md` (11 observations)
- Root CLAUDE.md protected (not touched)

**Issues Found:**
1. Folder CLAUDE.md files have duplicate content - legacy content from before `<memory-context>` tags were added exists alongside new tagged content. This is a one-time migration artifact; future updates will only modify tagged sections.

2. AI summary agent still not generating summaries - no "Narrative" or "Concepts" sections found in session file.

**Checklist Progress:**
- [x] Observations being captured correctly
- [x] Session files have correct date format
- [x] Timestamps are accurate
- [x] Tool types captured correctly
- [x] File paths captured correctly
- [x] Folder CLAUDE.md files created (5+ threshold)
- [x] Root CLAUDE.md protected
- [ ] AI summary agent still needs verification

---

### Session: 2026-01-31 19:15 (ENHANCEMENTS)

**Reviewed claude-mem plugin** and implemented missing features:

1. **Rich Observation Format**
   - Added emoji icons: 📖 Read, ✏️ Write, 🔧 Edit, 🔍 Glob, 🔎 Grep, 💻 Bash, 🌐 Fetch, 🤖 Agent, ⚡ Skill
   - Added file type detection: [JS], [React], [TS], [CSS], etc.
   - Added output stats: line count, match count
   - Added bash command categorization: [Git], [Package], [Test], [Node]
   - Added error detection with ⚠️ marker

2. **Tagged Content Preservation for Folder CLAUDE.md**
   - Uses `<memory-context>` tags to wrap auto-generated content
   - Preserves user-added notes outside the tags
   - Only replaces content inside tags on updates

3. **Enhanced Session Summary Agent**
   - Now generates **Concepts**, **Narrative**, and **Key Files**
   - Uses explicit absolute path to prevent home directory confusion

4. **Home Directory Safety Guards**
   - All 4 hook scripts now check they're not using ~/.claude/
   - Will error and exit if accidentally pointed at home directory
   - Agent prompt explicitly uses full project path

**Files Modified:**
- `.claude/hooks/capture-observation.mjs` - Rich format + safety check
- `.claude/hooks/inject-context.mjs` - Safety check
- `.claude/hooks/finalize-session.mjs` - Safety check
- `.claude/hooks/generate-folder-context.mjs` - Tagged sections + safety check
- `.claude/settings.local.json` - Enhanced agent prompt

---

## Emergency Fixes

### If Hooks Aren't Running

1. Check settings.local.json has hooks section
2. Restart Claude Code
3. Verify hook scripts have no syntax errors

### If Session Files Empty

1. Check capture-observation.mjs is valid JS
2. Check file permissions on .claude/memory/sessions/
3. Try running hook manually: `echo '{"tool_name":"Read","tool_input":{"file_path":"test.js"}}' | node .claude/hooks/capture-observation.mjs`

### If Folder CLAUDE.md Not Created

1. Check generate-folder-context.mjs is valid JS
2. Verify folder has 5+ observations
3. Check folder isn't in skip list (node_modules, .git, etc.)

### If Root CLAUDE.md Gets Modified

**This should NEVER happen.** If it does:
1. `git checkout CLAUDE.md` to restore
2. Check generate-folder-context.mjs - the protection check may have a bug
3. Report as critical issue in this tracker

---

## Reference: Full Architecture

```
Session Start
     │
     ▼
┌─────────────────────────────────────┐
│ inject-context.mjs                  │
│ - Reads last 3 days of sessions     │
│ - Outputs to Claude's context       │
└─────────────────────────────────────┘
     │
     ▼
[User works with Claude]
     │
     ▼ (every tool use)
┌─────────────────────────────────────┐
│ capture-observation.mjs             │
│ - Captures tool name, file paths    │
│ - Appends to today's session file   │
└─────────────────────────────────────┘
     │
     ▼ (session ends)
┌─────────────────────────────────────┐
│ finalize-session.mjs                │
│ - Writes session end marker         │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ generate-folder-context.mjs         │
│ - Analyzes last 7 days              │
│ - Creates CLAUDE.md in active dirs  │
│ - NEVER touches root CLAUDE.md      │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Agent: Summarize session            │
│ - Reads today's session file        │
│ - Appends AI summary                │
└─────────────────────────────────────┘
```

---

## Success Criteria (End of Week)

After one week, the system should:

1. **Reliability:** Capturing observations consistently every session
2. **Continuity:** New sessions have useful context from previous work
3. **Folder Context:** Active code folders have relevant CLAUDE.md files
4. **No Pollution:** Root CLAUDE.md untouched, no unwanted files
5. **Summaries:** Each session ends with a useful AI summary
6. **Searchable:** Can find past work with `/mem-search`

---

*Created: 2026-01-31*
*Last Updated: 2026-01-31*
