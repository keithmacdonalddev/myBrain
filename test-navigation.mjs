import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const reportDir = './.claude/reports/qa';
const screenshotDir = './.claude/design/screenshots/qa/navigation';

// Ensure directories exist
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const report = {
  date: new Date().toISOString(),
  testAccount: 'claude-test-user@mybrain.test',
  environment: 'http://localhost:5173',
  results: [],
  issues: [],
  summary: {}
};

// List of all routes from App.jsx
const testRoutes = [
  // Public routes
  { path: '/login', type: 'public', description: 'Login page' },
  { path: '/signup', type: 'public', description: 'Signup page' },
  { path: '/forgot-password', type: 'public', description: 'Forgot password page' },

  // Protected routes
  { path: '/app', type: 'protected', description: 'Dashboard (V1 or V2 based on flag)' },
  { path: '/app/today', type: 'protected', description: 'Today view' },
  { path: '/app/inbox', type: 'protected', description: 'Inbox' },
  { path: '/app/calendar', type: 'protected', description: 'Calendar' },
  { path: '/app/tasks', type: 'protected', description: 'Tasks list' },
  { path: '/app/notes', type: 'protected', description: 'Notes list' },
  { path: '/app/images', type: 'protected', description: 'Images gallery' },
  { path: '/app/files', type: 'protected', description: 'Files' },
  { path: '/app/projects', type: 'protected', description: 'Projects' },
  { path: '/app/fitness', type: 'protected-beta', description: 'Fitness tracking' },
  { path: '/app/kb', type: 'protected-beta', description: 'Knowledge base' },
  { path: '/app/messages', type: 'protected-flag', description: 'Messages' },
  { path: '/app/notifications', type: 'protected-flag', description: 'Notifications' },
  { path: '/app/social/connections', type: 'protected-flag', description: 'Connections' },
  { path: '/app/social/shared', type: 'protected-flag', description: 'Shared with me' },
  { path: '/app/social/my-shares', type: 'protected-flag', description: 'My shares' },
  { path: '/app/profile', type: 'protected', description: 'User profile' },
  { path: '/app/settings', type: 'protected', description: 'Settings' },
  { path: '/app/settings/activity', type: 'protected', description: 'Activity logs' },

  // Admin routes
  { path: '/admin', type: 'admin', description: 'Admin inbox' },
  { path: '/admin/users', type: 'admin', description: 'Admin users' },
  { path: '/admin/logs', type: 'admin', description: 'Admin logs' },
  { path: '/admin/reports', type: 'admin', description: 'Admin reports' },
  { path: '/admin/roles', type: 'admin', description: 'Admin roles' },
  { path: '/admin/sidebar', type: 'admin', description: 'Admin sidebar config' },
  { path: '/admin/analytics', type: 'admin', description: 'Admin analytics' },
  { path: '/admin/database', type: 'admin', description: 'Admin database' },
  { path: '/admin/system', type: 'admin', description: 'Admin system' },
  { path: '/admin/social', type: 'admin', description: 'Admin social dashboard' },

  // 404 test
  { path: '/nonexistent-page', type: 'public', description: '404 Not Found' }
];

const log = (msg) => {
  console.log(msg);
};

const runCommand = (cmd) => {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (error) {
    return null;
  }
};

// Test function
const testRoute = async (route) => {
  log(`Testing: ${route.path}`);

  // Navigate to route
  runCommand(`agent-browser --session nav-test open "http://localhost:5173${route.path}"`);

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get current URL
  const currentUrl = runCommand(`agent-browser --session nav-test get url`);

  // Determine if navigation succeeded
  const success = currentUrl && currentUrl.includes('localhost:5173');

  const result = {
    route: route.path,
    type: route.type,
    description: route.description,
    currentUrl: currentUrl || 'N/A',
    directAccess: success ? 'YES' : 'NO',
    status: success ? 'PASS' : 'FAIL'
  };

  report.results.push(result);

  if (!success) {
    report.issues.push({
      route: route.path,
      type: 'Navigation Failed',
      url: currentUrl
    });
  }

  return result;
};

// Main execution
const main = async () => {
  log('Starting Navigation QA Testing...');
  log(`Test environment: http://localhost:5173`);
  log(`Session: nav-test`);
  log('');

  // Start browser
  log('Initializing browser session...');
  runCommand(`agent-browser --session nav-test open "http://localhost:5173"`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test each route
  log(`\nTesting ${testRoutes.length} routes...`);
  for (const route of testRoutes) {
    try {
      const result = await testRoute(route);
      log(`  ${result.status}: ${route.path}`);
    } catch (err) {
      log(`  ERROR: ${route.path} - ${err.message}`);
      report.issues.push({
        route: route.path,
        type: 'Test Error',
        message: err.message
      });
    }
  }

  // Close browser
  log('\nCleaning up...');
  runCommand(`agent-browser --session nav-test close`);

  // Generate summary
  const passCount = report.results.filter(r => r.status === 'PASS').length;
  const failCount = report.results.filter(r => r.status === 'FAIL').length;

  report.summary = {
    total: report.results.length,
    passed: passCount,
    failed: failCount,
    passRate: ((passCount / report.results.length) * 100).toFixed(1) + '%'
  };

  // Write report
  const reportFilename = path.join(reportDir, `qa-navigation-${Date.now()}.json`);
  fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));

  // Also write markdown report
  let markdownReport = `# Navigation & Routing QA Report\n\n`;
  markdownReport += `**Date:** ${new Date().toISOString()}\n`;
  markdownReport += `**Environment:** http://localhost:5173\n`;
  markdownReport += `**Test Account:** claude-test-user@mybrain.test\n\n`;

  markdownReport += `## Summary\n`;
  markdownReport += `- Total Routes Tested: ${report.summary.total}\n`;
  markdownReport += `- Passed: ${report.summary.passed}\n`;
  markdownReport += `- Failed: ${report.summary.failed}\n`;
  markdownReport += `- Pass Rate: ${report.summary.passRate}\n\n`;

  markdownReport += `## Test Results\n\n`;
  markdownReport += `| Route | Type | Description | Direct Access | Status |\n`;
  markdownReport += `|-------|------|-------------|----------------|--------|\n`;

  for (const result of report.results) {
    markdownReport += `| \`${result.route}\` | ${result.type} | ${result.description} | ${result.directAccess} | ${result.status} |\n`;
  }

  if (report.issues.length > 0) {
    markdownReport += `\n## Issues Found\n\n`;
    for (const issue of report.issues) {
      markdownReport += `### ${issue.type}: ${issue.route}\n`;
      markdownReport += `- URL: ${issue.url || 'N/A'}\n`;
      markdownReport += `- Message: ${issue.message || 'Route failed to navigate'}\n\n`;
    }
  }

  const markdownFilename = path.join(reportDir, `qa-navigation-${Date.now()}.md`);
  fs.writeFileSync(markdownFilename, markdownReport);

  log(`\n✓ Reports generated:`);
  log(`  - ${markdownFilename}`);
  log(`  - ${reportFilename}`);

  log(`\n${report.summary.passed}/${report.summary.total} tests passed (${report.summary.passRate})`);
};

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
