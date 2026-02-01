#!/usr/bin/env node
/**
 * Agent Delegation Enforcement Hook - PostToolUse
 *
 * Enforces the non-blocking agent delegation model:
 * - Main Claude must NOT directly use: Read, Grep, Glob, Bash, Edit, Write
 * - These tools must be delegated to agents via Task tool
 * - Exception: User can request emergency bypass (logged + time-limited)
 *
 * Allowed coordination tools (no delegation needed):
 * - Task, TaskOutput, TodoWrite, AskUserQuestion
 *
 * This hook prevents core architecture violations that break the delegation model.
 * Violations logged to: .claude/reports/delegation-violations.md
 * Bypasses logged to: .claude/reports/delegation-bypasses.md
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
const REPORTS_DIR = join(PROJECT_ROOT, '.claude', 'reports');
const BYPASS_FILE = join(REPORTS_DIR, 'delegation-bypasses.md');
const VIOLATIONS_FILE = join(REPORTS_DIR, 'delegation-violations.md');

// Safety check: ensure we're not accidentally using home directory
const HOME_CLAUDE = join(homedir(), '.claude');
if (REPORTS_DIR.startsWith(HOME_CLAUDE)) {
  console.error('ERROR: Refusing to use home .claude directory');
  process.exit(1);
}

// Ensure reports directory exists
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// Tools that must be delegated to agents
const DELEGATION_REQUIRED_TOOLS = ['Read', 'Grep', 'Glob', 'Bash', 'Edit', 'Write'];

// Coordination tools that don't require delegation
const COORDINATION_TOOLS = ['Task', 'TaskOutput', 'TodoWrite', 'AskUserQuestion', 'NotebookEdit'];

// Skip internal tools
const SKIP_TOOLS = ['Skill'];

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    checkDelegation(hookData);
  } catch (e) {
    // Silent fail - don't break Claude Code if hook fails
    process.exit(0);
  }
});

// Timeout safety - exit if no input after 3 seconds
setTimeout(() => process.exit(0), 3000);

function checkDelegation(hookData) {
  const { tool_name, tool_input, tool_output, agent_type } = hookData || {};

  if (!tool_name) {
    process.exit(0);
    return;
  }

  // Skip internal/coordination tools
  if (SKIP_TOOLS.includes(tool_name) || COORDINATION_TOOLS.includes(tool_name)) {
    process.exit(0);
    return;
  }

  // Check if this is a tool that requires delegation
  if (DELEGATION_REQUIRED_TOOLS.includes(tool_name)) {
    // Only Main Claude violations matter - agents can use any tools
    // Agent context would have agent_type set
    if (!agent_type || agent_type === 'main') {
      // Check if there's an active bypass
      if (!isBypassActive(tool_name)) {
        logViolation(tool_name, tool_input);
        // Output warning message that Claude will see
        console.log(JSON.stringify({
          continue: true,
          suppressOutput: false,
          hookSpecificOutput: buildWarningMessage(tool_name)
        }));
        process.exit(0);
        return;
      } else {
        // Bypass is active, log it but allow
        logBypassUsage(tool_name, tool_input);
      }
    }
  }

  // Continue normally
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

function isBypassActive(toolName) {
  if (!existsSync(BYPASS_FILE)) {
    return false;
  }

  try {
    const content = readFileSync(BYPASS_FILE, 'utf-8');
    const lines = content.split('\n');
    const now = Date.now();

    for (const line of lines) {
      // Parse lines like: "| 2026-01-31 12:30 | Read | 30 | Active"
      if (line.includes('|') && line.includes(toolName) && line.includes('Active')) {
        // Extract timestamp and duration
        const match = line.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*Active/);
        if (match) {
          const [, timestamp, tool, durationStr] = match;
          const grantTime = new Date(timestamp).getTime();
          const durationMs = parseInt(durationStr) * 60 * 1000; // Convert minutes to ms

          if (now - grantTime < durationMs) {
            return true; // Bypass still active
          }
        }
      }
    }
  } catch (e) {
    // If file can't be read, assume no bypass
    return false;
  }

  return false;
}

function logViolation(toolName, toolInput) {
  const now = new Date();
  const timestamp = now.toISOString();
  const description = getToolDescription(toolName, toolInput);

  // Ensure file exists with header
  if (!existsSync(VIOLATIONS_FILE)) {
    const header = `# Agent Delegation Violations

This file tracks violations of the non-blocking agent delegation model.

**Policy:** Main Claude MUST NOT directly use Read, Grep, Glob, Bash, Edit, Write tools.
These must be delegated to agents via the Task tool.

**How to fix:**
- Instead of direct tool usage, create a Task agent
- Use Task tool with description of work needed
- Optionally request user bypass for emergency situations

**Bypass protocol:**
- Violations are logged automatically
- User can request bypass in conversation
- Bypass is time-limited (typically 30 minutes)
- All bypass usage is logged to delegation-bypasses.md

---

## Violations Log

| Timestamp | Tool | Description | Status |
|-----------|------|-------------|--------|
`;
    appendFileSync(VIOLATIONS_FILE, header);
  }

  const status = 'Logged - User intervention needed';
  const row = `| ${timestamp} | ${toolName} | ${description} | ${status} |\n`;
  appendFileSync(VIOLATIONS_FILE, row);
}

function logBypassUsage(toolName, toolInput) {
  const now = new Date();
  const timestamp = now.toISOString();
  const description = getToolDescription(toolName, toolInput);

  // Ensure file exists with header
  if (!existsSync(BYPASS_FILE)) {
    const header = `# Agent Delegation Bypasses

This file tracks authorized bypasses of the delegation model for emergency situations.

**Bypass Protocol:**
1. Main Claude identifies emergency situation requiring direct tool usage
2. Requests user approval in conversation with context
3. User approves and specifies duration (typically 30 minutes)
4. Bypass logged with timestamp and duration
5. Bypass automatically expires after specified time
6. Session notes explain why bypass was needed

---

## Active & Historical Bypasses

| Granted | Tool | Reason | Duration | Status |
|---------|------|--------|----------|--------|
`;
    appendFileSync(BYPASS_FILE, header);
  }

  // Note: Full bypass logging happens when user grants approval
  // This is just usage tracking
}

function getToolDescription(toolName, toolInput) {
  const truncate = (str, max = 80) => {
    if (!str) return '';
    const s = String(str);
    return s.length > max ? s.slice(0, max) + '...' : s;
  };

  switch (toolName) {
    case 'Read':
      return `Read file: ${truncate(toolInput?.file_path || 'unknown')}`;
    case 'Write':
      return `Write file: ${truncate(toolInput?.file_path || 'unknown')}`;
    case 'Edit':
      return `Edit file: ${truncate(toolInput?.file_path || 'unknown')}`;
    case 'Bash':
      return `Run bash: ${truncate(toolInput?.command || 'unknown')}`;
    case 'Glob':
      return `Glob files: ${truncate(toolInput?.pattern || 'unknown')}`;
    case 'Grep':
      return `Search: ${truncate(toolInput?.pattern || 'unknown')}`;
    default:
      return `Direct tool use`;
  }
}

function buildWarningMessage(toolName) {
  return `
---

⚠️ **DELEGATION MODEL VIOLATION DETECTED**

Direct tool use by Main Claude: \`${toolName}\`

**Policy Enforcement:** The non-blocking agent delegation model requires ALL execution work (including \`Read\`, \`Grep\`, \`Glob\`, \`Bash\`, \`Edit\`, \`Write\`) to be delegated to agents via the Task tool.

Main Claude must stay conversational and available.

**How to fix:**
- Create a Task agent to handle the work
- Use the Task tool instead of direct tool usage
- Specify the work needed and let agents execute

**Example:**
Instead of: \`Read(file_path)\` and then \`Edit(file_path)\`
Use: \`Task(description: "Read file X, analyze it, then edit Y")\`

**Exception - User Bypass:**
For genuine emergencies, you can request user approval:
"I need to temporarily bypass delegation to [reason]. User, please approve 30-minute bypass for [tool]."

This violation has been logged to \`.claude/reports/delegation-violations.md\`

---
`;
}
