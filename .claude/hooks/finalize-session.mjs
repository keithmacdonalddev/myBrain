#!/usr/bin/env node
/**
 * Memory Finalize Hook - Stop/SessionEnd
 *
 * Adds a session end marker to today's session file.
 * Runs when Claude Code session stops.
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const SESSIONS_DIR = join(PROJECT_ROOT, '.claude', 'memory', 'sessions');

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
const sessionFile = join(SESSIONS_DIR, `${dateStr}.md`);

if (existsSync(sessionFile)) {
  // Count observations in today's file
  const content = readFileSync(sessionFile, 'utf-8');
  const observationCount = (content.match(/^- \*\*/gm) || []).length;

  const endMarker = `\n---\n\n**Session ended at ${timeStr}** (${observationCount} observations)\n\n`;
  appendFileSync(sessionFile, endMarker);
}

// Output success
console.log(JSON.stringify({ continue: true, suppressOutput: true }));
process.exit(0);
