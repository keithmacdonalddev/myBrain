#!/usr/bin/env node
/**
 * Memory Capture Hook - PostToolUse
 *
 * Automatically captures tool usage observations to session files.
 * Runs after every tool invocation in Claude Code.
 *
 * Storage: .claude/memory/sessions/YYYY-MM-DD.md
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const SESSIONS_DIR = join(PROJECT_ROOT, '.claude', 'memory', 'sessions');

// Ensure sessions directory exists
if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    captureObservation(hookData);
  } catch (e) {
    // Silent fail - don't break Claude Code if hook fails
    process.exit(0);
  }
});

// Timeout safety - exit if no input after 3 seconds
setTimeout(() => process.exit(0), 3000);

function captureObservation(hookData) {
  const { tool_name, tool_input, tool_output } = hookData || {};

  if (!tool_name) {
    process.exit(0);
    return;
  }

  // Skip noisy/internal tools
  const skipTools = ['TodoWrite', 'TodoRead', 'AskUserQuestion'];
  if (skipTools.includes(tool_name)) {
    process.exit(0);
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
  const sessionFile = join(SESSIONS_DIR, `${dateStr}.md`);

  // Extract relevant info based on tool type
  let observation = formatObservation(tool_name, tool_input, tool_output, timeStr);

  if (!observation) {
    process.exit(0);
    return;
  }

  // Create file header if new file
  if (!existsSync(sessionFile)) {
    const header = `# Session: ${dateStr}\n\n> Auto-captured by memory hooks. Search with /mem-search.\n\n---\n\n`;
    appendFileSync(sessionFile, header);
  }

  // Append observation
  appendFileSync(sessionFile, observation + '\n');

  // Output success (Claude Code expects JSON response)
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

function formatObservation(toolName, input, output, time) {
  const truncate = (str, max = 200) => {
    if (!str) return '';
    const s = String(str);
    return s.length > max ? s.slice(0, max) + '...' : s;
  };

  switch (toolName) {
    case 'Read':
      return `- **${time}** | Read | \`${input?.file_path || 'unknown'}\``;

    case 'Write':
      return `- **${time}** | Write | \`${input?.file_path || 'unknown'}\``;

    case 'Edit':
      return `- **${time}** | Edit | \`${input?.file_path || 'unknown'}\``;

    case 'Glob':
      const globCount = output?.match(/\n/g)?.length || 0;
      return `- **${time}** | Glob | \`${input?.pattern}\` (${globCount} matches)`;

    case 'Grep':
      return `- **${time}** | Grep | \`${truncate(input?.pattern, 50)}\` in ${input?.path || 'cwd'}`;

    case 'Bash':
      const cmd = truncate(input?.command, 80);
      return `- **${time}** | Bash | \`${cmd}\``;

    case 'WebFetch':
      return `- **${time}** | WebFetch | ${input?.url}`;

    case 'WebSearch':
      return `- **${time}** | WebSearch | "${input?.query}"`;

    case 'Task':
      return `- **${time}** | Task | ${input?.subagent_type}: ${truncate(input?.description, 60)}`;

    case 'Skill':
      return `- **${time}** | Skill | /${input?.skill} ${input?.args || ''}`;

    default:
      return `- **${time}** | ${toolName}`;
  }
}
