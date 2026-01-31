#!/usr/bin/env node
/**
 * Memory Finalize Hook - Stop/SessionEnd
 *
 * Adds a session end marker to today's session file.
 * Runs when Claude Code session stops.
 *
 * IMPORTANT: This hook uses PROJECT-relative paths only.
 * Never uses the home directory ~/.claude/ folder.
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
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

const now = new Date();
// Use local date (not UTC) to match local timestamps
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD local
const timeStr = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM local
const sessionFile = join(SESSIONS_DIR, `${dateStr}.md`);

if (existsSync(sessionFile)) {
  const content = readFileSync(sessionFile, 'utf-8');

  // Check if we just wrote an end marker (within last 2 minutes)
  // This prevents duplicate markers from rapid session restarts
  const lastEndMatch = content.match(/\*\*Session ended at (\d{2}:\d{2})\*\*/g);
  if (lastEndMatch && lastEndMatch.length > 0) {
    const lastEndTime = lastEndMatch[lastEndMatch.length - 1].match(/(\d{2}):(\d{2})/);
    if (lastEndTime) {
      const lastHour = parseInt(lastEndTime[1]);
      const lastMin = parseInt(lastEndTime[2]);
      const nowParts = timeStr.split(':');
      const nowHour = parseInt(nowParts[0]);
      const nowMin = parseInt(nowParts[1]);

      // If less than 2 minutes since last end marker, skip
      const lastMins = lastHour * 60 + lastMin;
      const nowMins = nowHour * 60 + nowMin;
      if (Math.abs(nowMins - lastMins) < 2) {
        console.log(JSON.stringify({ continue: true, suppressOutput: true }));
        process.exit(0);
      }
    }
  }

  // Count observations in today's file
  const observationCount = (content.match(/^- \*\*/gm) || []).length;

  const endMarker = `\n---\n\n**Session ended at ${timeStr}** (${observationCount} observations)\n\n`;
  appendFileSync(sessionFile, endMarker);
}

// Output success
console.log(JSON.stringify({ continue: true, suppressOutput: true }));
process.exit(0);
