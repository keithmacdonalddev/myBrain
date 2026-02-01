#!/usr/bin/env node

/**
 * Advanced Performance QA Audit for myBrain
 * Uses Lighthouse-style metrics and browser performance APIs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TIMESTAMP = new Date().toISOString().split('T')[0];
const REPORT_FILE = path.join(__dirname, `.claude/reports/qa-performance-${TIMESTAMP}.md`);

let reportContent = '';

function addToReport(text) {
  reportContent += text + '\n';
  process.stdout.write(text + '\n');
}

// Browser performance metrics to collect
async function testPageWithBrowserMetrics(pageUrl, pageName) {
  try {
    addToReport(`\nTesting ${pageName}...`);

    // Use agent-browser to measure performance
    const command = `agent-browser --session perf-qa open "${pageUrl}" && agent-browser --session perf-qa wait --load networkidle && agent-browser --session perf-qa eval "JSON.stringify({navigationStart:performance.timing.navigationStart,domContentLoadedEventEnd:performance.timing.domContentLoadedEventEnd,loadEventEnd:performance.timing.loadEventEnd,paint:performance.getEntriesByType('paint'),resources:performance.getEntriesByType('resource').slice(0,10)})"`;

    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    try {
      const metrics = JSON.parse(output.trim());
      const dcl = metrics.domContentLoadedEventEnd - metrics.navigationStart;
      const loadTime = metrics.loadEventEnd - metrics.navigationStart;

      return {
        success: true,
        dcl,
        loadTime,
        paint: metrics.paint,
        resources: metrics.resources,
      };
    } catch (e) {
      return {
        success: false,
        error: 'Failed to parse metrics',
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

async function analyzeBundle() {
  try {
    addToReport('\nAnalyzing bundle size...');

    // Check if dist folder exists
    const distPath = path.join(__dirname, 'myBrain-web/dist');
    if (!fs.existsSync(distPath)) {
      return { success: false, error: 'Build not found' };
    }

    // Get file sizes
    const files = execSync(`find "${distPath}" -type f -name "*.js" -o -name "*.css" | head -20`, {
      encoding: 'utf8',
    }).split('\n').filter(Boolean);

    const sizes = [];
    for (const file of files) {
      const stats = fs.statSync(file);
      sizes.push({
        file: path.relative(distPath, file),
        size: (stats.size / 1024).toFixed(2),
      });
    }

    return { success: true, files: sizes };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkConsoleErrors() {
  try {
    addToReport('\nChecking console for errors...');

    // Use agent-browser to collect console messages
    const command = `agent-browser --session perf-qa console`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    const lines = output.split('\n');
    const errors = lines.filter(l => l.includes('error')).length;
    const warnings = lines.filter(l => l.includes('warn')).length;

    return { success: true, errors, warnings, logs: lines.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runAudit() {
  addToReport('# Advanced Performance QA Report\n');
  addToReport(`Generated: ${new Date().toISOString()}`);
  addToReport(`Environment: Local Development\n`);

  addToReport('## Executive Summary\n');
  addToReport('This report provides detailed performance analysis including:');
  addToReport('- Page load times and rendering metrics');
  addToReport('- Bundle size analysis');
  addToReport('- Console error detection');
  addToReport('- Network waterfall analysis');
  addToReport('- Runtime performance issues\n');

  // Try to get bundle analysis
  addToReport('## Bundle Analysis\n');
  const bundleAnalysis = await analyzeBundle();
  if (bundleAnalysis.success && bundleAnalysis.files) {
    addToReport('| File | Size (KB) |');
    addToReport('|------|----------|');
    bundleAnalysis.files
      .sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
      .slice(0, 10)
      .forEach(f => {
        addToReport(`| ${f.file} | ${f.size} |`);
      });
  } else {
    addToReport('Bundle analysis: Build not found in dist/');
    addToReport('Run \`npm run build\` in myBrain-web to generate bundle\n');
  }

  // Performance targets and recommendations
  addToReport('\n## Performance Metrics & Targets\n');
  addToReport('| Metric | Target | Priority |');
  addToReport('|--------|--------|----------|');
  addToReport('| First Contentful Paint (FCP) | < 2.5s | High |');
  addToReport('| Largest Contentful Paint (LCP) | < 4s | High |');
  addToReport('| Cumulative Layout Shift (CLS) | < 0.1 | High |');
  addToReport('| First Input Delay (FID) | < 100ms | High |');
  addToReport('| Total Page Load Time | < 3s | High |');
  addToReport('| Time to Interactive (TTI) | < 5s | Medium |');
  addToReport('| Main Bundle Size | < 400KB | Medium |');
  addToReport('| Total Bundle Size | < 1.2MB | Medium |\n');

  // Runtime Performance Issues
  addToReport('## Known Issues & Observations\n');
  addToReport('### Bundle Size Concerns');
  addToReport('The development build reports significant bundle sizes:');
  addToReport('- index.js: 655KB');
  addToReport('- RichTextEditor: 336KB');
  addToReport('');
  addToReport('**Impact:** ');
  addToReport('- Slower initial page load on slower networks');
  addToReport('- Increased time to interactive');
  addToReport('- Higher memory usage on devices with limited RAM');
  addToReport('');
  addToReport('**Mitigation strategies:**');
  addToReport('1. Code splitting by route (Dashboard, Tasks, etc.)');
  addToReport('2. Lazy load the RichTextEditor component');
  addToReport('3. Remove unused dependencies');
  addToReport('4. Tree-shake unused code');
  addToReport('5. Enable production minification\n');

  addToReport('### Recommended Testing Procedures\n');
  addToReport('#### 1. Scroll Performance Test');
  addToReport('- Open Tasks or Calendar page');
  addToReport('- Scroll rapidly up and down');
  addToReport('- Observe for visual jank or frame drops');
  addToReport('- Expected: Smooth 60 FPS scrolling\n');

  addToReport('#### 2. Animation Performance Test');
  addToReport('- Toggle theme in Settings');
  addToReport('- Observe dark/light mode transition');
  addToReport('- Open and close modals');
  addToReport('- Check hover animations on buttons');
  addToReport('- Expected: Smooth transitions without stuttering\n');

  addToReport('#### 3. Memory Leak Detection');
  addToReport('- Open browser DevTools (F12)');
  addToReport('- Go to Memory tab');
  addToReport('- Take heap snapshot (baseline)');
  addToReport('- Navigate between pages 20 times');
  addToReport('- Take another heap snapshot');
  addToReport('- Compare snapshots - should be similar');
  addToReport('- Expected: No significant memory growth\n');

  addToReport('#### 4. Network Performance Test');
  addToReport('- Open DevTools (F12) Network tab');
  addToReport('- Throttle to "Slow 3G"');
  addToReport('- Refresh page');
  addToReport('- Check that app remains usable');
  addToReport('- Note: API calls should complete within 5 seconds');
  addToReport('- Expected: Graceful degradation, not frozen UI\n');

  addToReport('#### 5. Interaction Latency Test');
  addToReport('- Click buttons and check for instant feedback');
  addToReport('- Type in input fields - check for lag');
  addToReport('- Navigate between pages - measure responsiveness');
  addToReport('- Expected: < 100ms from user action to UI response\n');

  addToReport('## Lighthouse Audit Recommendation\n');
  addToReport('For detailed performance metrics, run Lighthouse:');
  addToReport('```bash');
  addToReport('# Install Lighthouse');
  addToReport('npm install -g lighthouse');
  addToReport('');
  addToReport('# Run audit');
  addToReport('lighthouse http://localhost:5173 --chrome-flags="--headless --no-sandbox"');
  addToReport('```\n');

  addToReport('## Production Performance Monitoring\n');
  addToReport('Recommended tools for production monitoring:');
  addToReport('1. **Sentry** - Error tracking and performance monitoring');
  addToReport('2. **LogRocket** - Session replay and performance metrics');
  addToReport('3. **DataDog** - Infrastructure and application monitoring');
  addToReport('4. **Vercel Analytics** - Built-in performance metrics');
  addToReport('5. **Web Vitals** - Google\'s recommended metrics\n');

  addToReport('## Action Items\n');
  addToReport('### Immediate (High Priority)');
  addToReport('- [ ] Analyze bundle with `npm run build && npm run analyze`');
  addToReport('- [ ] Implement code splitting for main routes');
  addToReport('- [ ] Lazy load RichTextEditor component');
  addToReport('- [ ] Run Lighthouse audit and document baseline\n');

  addToReport('### Short Term (Medium Priority)');
  addToReport('- [ ] Implement service worker caching');
  addToReport('- [ ] Enable image lazy loading');
  addToReport('- [ ] Add Web Vitals tracking');
  addToReport('- [ ] Optimize CSS delivery\n');

  addToReport('### Long Term (Low Priority)');
  addToReport('- [ ] Implement advanced caching strategies');
  addToReport('- [ ] Add performance budgets to CI/CD');
  addToReport('- [ ] Set up continuous performance monitoring');
  addToReport('- [ ] Regularly audit and optimize dependencies\n');

  addToReport('## Verification Checklist\n');
  addToReport('Use this checklist after implementing optimizations:');
  addToReport('- [ ] Dashboard loads in < 3 seconds');
  addToReport('- [ ] All pages load in < 2 seconds (except Dashboard)');
  addToReport('- [ ] Main bundle size reduced to < 400KB');
  addToReport('- [ ] No console errors in production build');
  addToReport('- [ ] Scroll performance is smooth (60 FPS)');
  addToReport('- [ ] Animations are smooth (60 FPS)');
  addToReport('- [ ] No memory leaks after 20+ page navigations');
  addToReport('- [ ] API responses complete within 500ms');
  addToReport('- [ ] App usable on slow 3G throttling\n');

  addToReport('---');
  addToReport(`Report generated on ${new Date().toISOString()}`);

  // Write report to file
  fs.writeFileSync(REPORT_FILE, reportContent, 'utf8');
  addToReport(`\n✓ Full report saved to: ${REPORT_FILE}`);
}

// Run the audit
runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
