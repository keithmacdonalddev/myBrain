#!/usr/bin/env node

/**
 * Performance QA Audit for myBrain
 * Measures page load times, runtime performance, and API response times
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const TIMESTAMP = new Date().toISOString().split('T')[0];
const REPORT_FILE = path.join(__dirname, `.claude/reports/qa-performance-${TIMESTAMP}.md`);

// Test configuration
const TEST_URL = 'http://localhost:5173';
const PAGES = [
  { name: 'Dashboard', path: '/dashboard', target: 3000 },
  { name: 'Tasks', path: '/tasks', target: 2000 },
  { name: 'Notes', path: '/notes', target: 2000 },
  { name: 'Projects', path: '/projects', target: 2000 },
  { name: 'Calendar', path: '/calendar', target: 2000 },
  { name: 'Settings', path: '/settings', target: 1000 },
  { name: 'Profile', path: '/profile', target: 1000 },
];

const API_ENDPOINTS = [
  '/api/tasks',
  '/api/notes',
  '/api/projects',
  '/api/calendar',
  '/api/user/profile',
];

let reportContent = '';

function addToReport(text) {
  reportContent += text + '\n';
  process.stdout.write(text + '\n');
}

async function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(TEST_URL, { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function measurePageLoad(url) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();

    const req = http.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to ms
        resolve({ success: true, duration, statusCode: res.statusCode });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, duration: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout', duration: null });
    });
  });
}

async function measureAPIResponse(endpoint) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();

    const req = http.get(`http://localhost:5000${endpoint}`, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to ms
        resolve({ success: true, duration, statusCode: res.statusCode });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, duration: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout', duration: null });
    });
  });
}

async function runAudit() {
  addToReport('# Performance QA Report\n');
  addToReport(`Generated: ${new Date().toISOString()}`);
  addToReport(`Environment: Local Development\n`);

  // Check server health
  addToReport('## Server Health Check\n');
  const isHealthy = await checkServerHealth();
  if (isHealthy) {
    addToReport('✓ Frontend server is healthy\n');
  } else {
    addToReport('✗ Frontend server is not responding\n');
    return;
  }

  // Page Load Tests
  addToReport('## Page Load Performance\n');
  addToReport('| Page | Load Time | Target | Status |\n');
  addToReport('|------|-----------|--------|--------|\n');

  const loadResults = [];

  for (const page of PAGES) {
    const url = TEST_URL + page.path;
    const result = await measurePageLoad(url);

    if (result.success) {
      const duration = result.duration.toFixed(2);
      const status = result.duration < page.target ? '✓ PASS' : '✗ FAIL';
      addToReport(`| ${page.name} | ${duration}ms | ${page.target}ms | ${status} |`);
      loadResults.push({ page: page.name, duration: result.duration, target: page.target });
    } else {
      addToReport(`| ${page.name} | Error | ${page.target}ms | ✗ ERROR |`);
      loadResults.push({ page: page.name, duration: null, target: page.target });
    }
  }

  // API Response Times
  addToReport('\n## API Response Performance\n');
  addToReport('| Endpoint | Response Time | Status |\n');
  addToReport('|----------|---------------|---------|\n');

  const apiResults = [];
  const apiTarget = 500; // 500ms target

  for (const endpoint of API_ENDPOINTS) {
    const result = await measureAPIResponse(endpoint);

    if (result.success) {
      const duration = result.duration.toFixed(2);
      const status = result.duration < apiTarget ? '✓ PASS' : '✗ SLOW';
      addToReport(`| ${endpoint} | ${duration}ms | ${status} |`);
      apiResults.push({ endpoint, duration: result.duration });
    } else {
      addToReport(`| ${endpoint} | Error | ✗ FAIL |`);
    }
  }

  // Analysis
  addToReport('\n## Performance Analysis\n');

  const avgLoadTime = loadResults.filter(r => r.duration).reduce((a, b) => a + b.duration, 0) / loadResults.filter(r => r.duration).length;
  const failedPages = loadResults.filter(r => r.duration && r.duration >= r.target);

  addToReport(`### Load Time Summary`);
  addToReport(`- Average page load: ${avgLoadTime.toFixed(2)}ms`);
  addToReport(`- Pages passing target: ${loadResults.length - failedPages.length}/${loadResults.length}`);

  if (failedPages.length > 0) {
    addToReport(`- Pages exceeding target:`);
    failedPages.forEach(p => {
      const excess = (p.duration - p.target).toFixed(2);
      addToReport(`  - ${p.page}: ${p.duration.toFixed(2)}ms (${excess}ms over target)`);
    });
  }

  const slowAPIs = apiResults.filter(r => r.duration && r.duration >= apiTarget);
  if (slowAPIs.length > 0) {
    addToReport(`### Slow API Endpoints`);
    slowAPIs.forEach(api => {
      addToReport(`- ${api.endpoint}: ${api.duration.toFixed(2)}ms`);
    });
  }

  // Known Issues
  addToReport('\n## Known Performance Issues\n');
  addToReport('### Bundle Size');
  addToReport('- index.js: 655KB (significantly large)');
  addToReport('- RichTextEditor: 336KB (heavy component)');
  addToReport('');
  addToReport('### Recommended Optimizations');
  addToReport('1. **Code Splitting**');
  addToReport('   - Lazy load RichTextEditor component');
  addToReport('   - Split route bundles (Dashboard, Tasks, Notes, etc.)');
  addToReport('   - Target: Reduce main bundle to < 400KB');
  addToReport('');
  addToReport('2. **Asset Optimization**');
  addToReport('   - Enable gzip/brotli compression');
  addToReport('   - Implement image lazy loading');
  addToReport('   - Minify CSS and JavaScript');
  addToReport('');
  addToReport('3. **Runtime Performance**');
  addToReport('   - Review component re-render patterns');
  addToReport('   - Implement React.memo for expensive components');
  addToReport('   - Profile with React DevTools');
  addToReport('');
  addToReport('4. **Network**');
  addToReport('   - Implement service worker caching');
  addToReport('   - Use HTTP/2 Server Push');
  addToReport('   - Cache API responses where appropriate');
  addToReport('');
  addToReport('5. **Monitoring**');
  addToReport('   - Add Web Vitals tracking (CLS, LCP, FID)');
  addToReport('   - Set up performance alerts');
  addToReport('   - Monitor production metrics');

  // Testing Notes
  addToReport('\n## Manual Testing Required\n');
  addToReport('The following require manual browser testing:');
  addToReport('- [ ] Scroll performance on long lists (Tasks, Calendar)');
  addToReport('- [ ] Animation smoothness (theme toggle, modals)');
  addToReport('- [ ] Memory leaks (navigate pages 10+ times)');
  addToReport('- [ ] Interaction latency (buttons, inputs, navigation)');
  addToReport('- [ ] Layout shift (CLS) during page load');
  addToReport('- [ ] Performance on slow network (DevTools throttling)');

  // Write report to file
  fs.writeFileSync(REPORT_FILE, reportContent, 'utf8');
  addToReport(`\n✓ Report saved to: ${REPORT_FILE}`);
}

// Run the audit
runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
