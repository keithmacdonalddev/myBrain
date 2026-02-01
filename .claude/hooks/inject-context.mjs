#!/usr/bin/env node
/**
 * Memory Context Injection Hook - SessionStart
 *
 * Injects recent session history into Claude's context at session start.
 * Shows last 3 days of activity to maintain continuity.
 *
 * IMPORTANT: This hook uses PROJECT-relative paths only.
 * Never uses the home directory ~/.claude/ folder.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(join(__dirname, '..', '..'));
const SESSIONS_DIR = join(PROJECT_ROOT, '.claude', 'memory', 'sessions');

// Safety check: ensure we're not accidentally using home directory
const HOME_CLAUDE = join(homedir(), '.claude');
if (SESSIONS_DIR.startsWith(HOME_CLAUDE)) {
  console.error('ERROR: Refusing to use home .claude directory');
  process.exit(1);
}

// Configuration
const DAYS_TO_SHOW = 3;
const MAX_LINES_PER_DAY = 30;

function getRecentSessions() {
  if (!existsSync(SESSIONS_DIR)) {
    return null;
  }

  const files = readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, DAYS_TO_SHOW);

  if (files.length === 0) {
    return null;
  }

  let context = '## Recent Session History\n\n';
  context += '> Auto-injected from `.claude/memory/sessions/`. Search with `/mem-search`.\n\n';

  for (const file of files) {
    const filePath = join(SESSIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    // Extract just the observations (lines starting with "- **")
    const lines = content.split('\n');
    const observations = lines
      .filter(line => line.startsWith('- **'))
      .slice(0, MAX_LINES_PER_DAY);

    if (observations.length > 0) {
      const date = file.replace('.md', '');
      context += `### ${date}\n\n`;
      context += observations.join('\n') + '\n\n';
    }
  }

  return context;
}

// Main execution
let output = getRecentSessions() || '';

// Add memory agent instruction
const memoryAgentInstruction = `

---

## Memory Agent Required

Spawn a background Haiku memory agent for this session. Run it with a long timeout.

**Agent Responsibilities:**

1. **Live Summaries** (every 50 observations OR 15 minutes)
   - Generate narrative summary: Major Work, Features, Day Flow
   - Update the session file with current progress
   - Keep summary at the TOP of session file for quick reference

2. **Consolidate Repetitive Logs**
   - Detect patterns: same file touched multiple times in short intervals
   - Compress: "14:32-14:45 | Heavy editing | theme.css (12 touches, 6 edits)"
   - Preserve distinct important actions (builds, different files, errors)
   - Keep session file lean but informative

3. **Extract to memory.md**
   - Spot decisions being made → add to Decisions table
   - Notice repeated patterns → add to Preferences
   - See failures/rollbacks → add to Failed Approaches
   - Learn new user preferences → document them

4. **Maintain Context Quality**
   - Keep recent observations detailed
   - Compress older observations (2+ hours old)
   - Preserve key moments (errors, completions, decisions)
   - Ensure session file stays thorough but navigable

5. **Update Folder CLAUDE.md Files**
   - As work focuses on a folder, update its context file
   - Don't wait for session end

**Model:** Use Haiku for efficiency
**Frequency:** Check every 10-15 minutes, or when observation count crosses thresholds (50, 100, 150...)
**Goal:** Keep memory system lean, informative, and thorough - never lose important context, but don't drown in noise
`;

output += memoryAgentInstruction;

// Output context for Claude Code to inject
console.log(JSON.stringify({
  continue: true,
  suppressOutput: false,
  hookSpecificOutput: output
}));

process.exit(0);
