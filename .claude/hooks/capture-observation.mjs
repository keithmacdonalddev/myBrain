#!/usr/bin/env node
/**
 * Memory Capture Hook - PostToolUse
 *
 * Automatically captures tool usage observations to session files.
 * Runs after every tool invocation in Claude Code.
 *
 * Storage: .claude/memory/sessions/YYYY-MM-DD.md
 *
 * IMPORTANT: This hook uses PROJECT-relative paths only.
 * Never uses the home directory ~/.claude/ folder.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
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
  const skipTools = ['TodoWrite', 'TodoRead', 'AskUserQuestion', 'StructuredOutput'];
  if (skipTools.includes(tool_name)) {
    process.exit(0);
    return;
  }

  const now = new Date();
  // Use local date (not UTC) to match local timestamps
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD local
  const timeStr = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM local
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

// Helper functions for richer observations
function getFileType(filePath) {
  if (!filePath) return '';
  const ext = filePath.split('.').pop()?.toLowerCase();
  const typeMap = {
    'js': 'JS', 'jsx': 'React', 'ts': 'TS', 'tsx': 'React/TS',
    'css': 'CSS', 'scss': 'SCSS', 'html': 'HTML',
    'json': 'JSON', 'md': 'Markdown', 'yaml': 'YAML', 'yml': 'YAML',
    'py': 'Python', 'rb': 'Ruby', 'go': 'Go', 'rs': 'Rust',
    'sql': 'SQL', 'sh': 'Shell', 'bash': 'Shell',
    'env': 'Env', 'gitignore': 'Git'
  };
  return typeMap[ext] || '';
}

function getFileName(filePath) {
  if (!filePath) return 'unknown';
  return filePath.split(/[/\\]/).pop() || filePath;
}

function categorizeBashCommand(cmd) {
  if (!cmd) return '';
  const lower = cmd.toLowerCase();
  if (lower.startsWith('git ')) return 'Git';
  if (lower.startsWith('npm ') || lower.startsWith('yarn ') || lower.startsWith('pnpm ')) return 'Package';
  if (lower.startsWith('node ')) return 'Node';
  if (lower.includes('test')) return 'Test';
  if (lower.startsWith('ls') || lower.startsWith('dir') || lower.startsWith('find')) return 'Files';
  if (lower.startsWith('cat') || lower.startsWith('head') || lower.startsWith('tail')) return 'Read';
  if (lower.startsWith('grep') || lower.startsWith('rg')) return 'Search';
  return '';
}

function detectError(output) {
  if (!output) return false;
  const errorPatterns = /error:|Error:|ERROR|failed|Failed|FAILED|exception|Exception/i;
  return errorPatterns.test(output);
}

function getOutputStats(output) {
  if (!output) return '';
  const lines = (output.match(/\n/g) || []).length + 1;
  if (lines > 100) return `~${Math.round(lines / 10) * 10} lines`;
  if (lines > 20) return `${lines} lines`;
  return '';
}

function formatObservation(toolName, input, output, time) {
  const truncate = (str, max = 200) => {
    if (!str) return '';
    const s = String(str);
    return s.length > max ? s.slice(0, max) + '...' : s;
  };

  const hasError = detectError(output);
  const errorMark = hasError ? ' ⚠️' : '';

  switch (toolName) {
    case 'Read': {
      const fileType = getFileType(input?.file_path);
      const fileName = getFileName(input?.file_path);
      const typeTag = fileType ? ` [${fileType}]` : '';
      return `- **${time}** | 📖 Read | \`${fileName}\`${typeTag}`;
    }

    case 'Write': {
      const fileType = getFileType(input?.file_path);
      const fileName = getFileName(input?.file_path);
      const typeTag = fileType ? ` [${fileType}]` : '';
      return `- **${time}** | ✏️ Write | \`${fileName}\`${typeTag}`;
    }

    case 'Edit': {
      const fileType = getFileType(input?.file_path);
      const fileName = getFileName(input?.file_path);
      const typeTag = fileType ? ` [${fileType}]` : '';
      return `- **${time}** | 🔧 Edit | \`${fileName}\`${typeTag}`;
    }

    case 'Glob': {
      const matchCount = (output?.match(/\n/g) || []).length;
      const pattern = input?.pattern || '';
      return `- **${time}** | 🔍 Glob | \`${pattern}\` → ${matchCount} files`;
    }

    case 'Grep': {
      const matchCount = (output?.match(/\n/g) || []).length;
      const pattern = truncate(input?.pattern, 40);
      const path = input?.path ? getFileName(input.path) : 'cwd';
      return `- **${time}** | 🔎 Grep | \`${pattern}\` in ${path} → ${matchCount} matches`;
    }

    case 'Bash': {
      const cmd = truncate(input?.command, 70);
      const category = categorizeBashCommand(input?.command);
      const catTag = category ? ` [${category}]` : '';
      const stats = getOutputStats(output);
      const statsTag = stats ? ` (${stats})` : '';
      return `- **${time}** | 💻 Bash | \`${cmd}\`${catTag}${statsTag}${errorMark}`;
    }

    case 'WebFetch': {
      const url = input?.url || '';
      const domain = url.match(/https?:\/\/([^/]+)/)?.[1] || url;
      return `- **${time}** | 🌐 Fetch | ${domain}`;
    }

    case 'WebSearch':
      return `- **${time}** | 🔍 Search | "${truncate(input?.query, 60)}"`;

    case 'Task': {
      const agent = input?.subagent_type || 'agent';
      const desc = truncate(input?.description, 50);
      return `- **${time}** | 🤖 Agent | ${agent}: ${desc}`;
    }

    case 'Skill':
      return `- **${time}** | ⚡ Skill | /${input?.skill} ${input?.args || ''}`.trim();

    case 'NotebookEdit':
      return `- **${time}** | 📓 Notebook | ${getFileName(input?.notebook_path)}`;

    default:
      return `- **${time}** | ${toolName}${errorMark}`;
  }
}
