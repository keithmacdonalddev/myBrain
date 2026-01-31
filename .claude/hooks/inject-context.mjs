#!/usr/bin/env node
/**
 * Memory Context Injection Hook - SessionStart
 *
 * Injects recent session history into Claude's context at session start.
 * Shows last 3 days of activity to maintain continuity.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const SESSIONS_DIR = join(PROJECT_ROOT, '.claude', 'memory', 'sessions');

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
const context = getRecentSessions();

if (context) {
  // Output context for Claude Code to inject
  // The hookSpecificOutput field gets added to Claude's context
  console.log(JSON.stringify({
    continue: true,
    suppressOutput: false,
    hookSpecificOutput: context
  }));
} else {
  console.log(JSON.stringify({
    continue: true,
    suppressOutput: true
  }));
}

process.exit(0);
