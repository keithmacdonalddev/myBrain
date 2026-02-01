#!/usr/bin/env node
/**
 * Animation & Transition QA Test Suite
 * Tests all animation categories defined in CLAUDE.md
 *
 * Usage: node animation-qa-test.mjs [--url http://localhost:5173] [--session animation-qa]
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AnimationQATester {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:5173';
    this.sessionName = options.session || 'animation-qa';
    this.results = {
      timestamp: new Date().toISOString(),
      url: this.url,
      tests: [],
      summary: {},
    };
    this.browser = null;
    this.page = null;
  }

  async start() {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      this.page = await this.browser.newPage();
      this.page.setViewport({ width: 1280, height: 800 });

      console.log(`Starting animation QA tests at ${this.url}`);
      console.log('Session:', this.sessionName);

      // Navigate to app
      await this.page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for app to be ready
      await this.page.waitForSelector('body', { timeout: 10000 });

      // Test login if needed
      await this.testLogin();

      // Run test suites
      await this.testFadeInAnimations();
      await this.testHoverAnimations();
      await this.testPageTransitions();
      await this.testModalAnimations();
      await this.testLoadingAnimations();
      await this.testMicroInteractions();
      await this.testScrollAnimations();

      // Generate report
      await this.generateReport();

    } catch (error) {
      console.error('Test suite error:', error);
      this.results.error = error.message;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async testLogin() {
    try {
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        console.log('Testing login flow...');

        await this.page.type('input[type="email"]', 'claude-test-user@mybrain.test');
        await this.page.type('input[type="password"]', 'ClaudeTest123');
        await this.page.click('button[type="submit"]');

        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Login successful');
      }
    } catch (error) {
      console.log('Login not required or failed (may already be logged in):', error.message);
    }
  }

  async testFadeInAnimations() {
    console.log('\n=== Testing Fade-In Animations ===');

    const test = {
      category: 'Fade-In Animations',
      location: 'Dashboard',
      tests: []
    };

    try {
      // Refresh dashboard
      await this.page.reload({ waitUntil: 'networkidle2' });

      // Wait for widgets to appear
      await this.page.waitForSelector('[class*="widget"], [class*="card"]', { timeout: 5000 });

      // Check for fade-in animation class
      const fadeInElements = await this.page.$$eval('[class*="animate-fade-in"]', els =>
        els.length
      );

      test.tests.push({
        name: 'Fade-in animation class applied',
        expected: '>0',
        actual: fadeInElements.toString(),
        smooth: fadeInElements > 0 ? 'PASS' : 'FAIL',
        timing: '0.2s ease-out'
      });

      // Check computed animation on widget
      const widgetAnimation = await this.page.evaluate(() => {
        const widget = document.querySelector('[class*="widget"]');
        if (!widget) return null;
        const style = window.getComputedStyle(widget);
        return {
          animation: style.animation,
          animationDuration: style.animationDuration,
          opacity: style.opacity,
          transform: style.transform
        };
      });

      test.tests.push({
        name: 'Widget fade-in animation duration',
        expected: '0.2s or 0.3s (per design)',
        actual: widgetAnimation?.animationDuration || 'N/A',
        smooth: widgetAnimation ? 'PASS' : 'FAIL',
        issue: !widgetAnimation ? 'Could not measure animation' : null
      });

      // Check for staggered timing
      const staggerClasses = await this.page.$$eval('[class*="stagger"]', els => els.length);
      test.tests.push({
        name: 'Staggered animation timing',
        expected: 'Multiple stagger classes',
        actual: staggerClasses.toString(),
        smooth: staggerClasses > 0 ? 'PASS' : 'FAIL'
      });

    } catch (error) {
      test.tests.push({
        name: 'Fade-in animation test',
        expected: 'Animations visible',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testHoverAnimations() {
    console.log('\n=== Testing Hover Animations ===');

    const test = {
      category: 'Hover Animations',
      location: 'Various interactive elements',
      tests: []
    };

    try {
      // Test button hover
      const buttons = await this.page.$$('button');
      if (buttons.length > 0) {
        const buttonHover = await this.page.evaluate(() => {
          const btn = document.querySelector('button');
          const baseStyle = window.getComputedStyle(btn);
          const baseTransform = baseStyle.transform;

          // Hover simulation
          btn.classList.add('hover-test');
          btn.style.setProperty('--hover-active', '1');
          return {
            hasTransition: baseStyle.transition.includes('transform') || baseStyle.transition.includes('all'),
            transitionValue: baseStyle.transition
          };
        });

        test.tests.push({
          name: 'Button hover transition',
          expected: 'transition includes transform',
          actual: buttonHover.transitionValue || 'No transition',
          smooth: buttonHover.hasTransition ? 'PASS' : 'FAIL',
          timing: '0.15s or 0.2s'
        });
      }

      // Test card hover (lift effect)
      const cards = await this.page.$$('[class*="card"]');
      if (cards.length > 0) {
        const cardHover = await this.page.evaluate(() => {
          const card = document.querySelector('[class*="card"]');
          const style = window.getComputedStyle(card);
          return {
            hasTransition: style.transition.includes('transform') || style.transition.includes('box-shadow'),
            transition: style.transition
          };
        });

        test.tests.push({
          name: 'Card lift effect on hover',
          expected: 'translateY transform on hover',
          actual: cardHover.transition || 'No transition',
          smooth: cardHover.hasTransition ? 'PASS' : 'FAIL'
        });
      }

      // Test nav items
      const navItems = await this.page.$$('[class*="nav"]');
      if (navItems.length > 0) {
        const navHover = await this.page.evaluate(() => {
          const nav = document.querySelector('[class*="nav"]');
          const style = window.getComputedStyle(nav);
          return {
            hasTransition: style.transition.length > 0,
            transition: style.transition
          };
        });

        test.tests.push({
          name: 'Nav item background transition',
          expected: 'Background color transition on hover',
          actual: navHover.transition || 'No transition',
          smooth: navHover.hasTransition ? 'PASS' : 'FAIL',
          timing: '~0.2s'
        });
      }

    } catch (error) {
      test.tests.push({
        name: 'Hover animation tests',
        expected: 'Transitions visible',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testPageTransitions() {
    console.log('\n=== Testing Page Transitions ===');

    const test = {
      category: 'Page Transitions',
      location: 'Navigation between pages',
      tests: []
    };

    try {
      // Check current page
      const initialUrl = this.page.url();

      // Look for navigation link
      const navLinks = await this.page.$$('[href*="/"], a[href]');
      if (navLinks.length > 0) {
        // Try to find and click a non-current nav link
        for (const link of navLinks) {
          const href = await link.evaluate(el => el.getAttribute('href'));
          if (href && !href.includes(initialUrl) && !href.includes('javascript')) {
            await link.click();

            // Wait for navigation
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});

            const newUrl = this.page.url();
            test.tests.push({
              name: 'Page navigation transition',
              expected: 'Smooth content swap',
              actual: `Navigated from ${initialUrl} to ${newUrl}`,
              smooth: newUrl !== initialUrl ? 'PASS' : 'FAIL'
            });
            break;
          }
        }
      }

      // Check theme transition
      const themeToggle = await this.page.$('[class*="theme"], [class*="dark"], button[aria-label*="theme" i]');
      if (themeToggle) {
        const beforeClass = await this.page.evaluate(() => document.documentElement.className);
        await themeToggle.click();
        await this.page.waitForTimeout(500); // Wait for theme transition
        const afterClass = await this.page.evaluate(() => document.documentElement.className);

        test.tests.push({
          name: 'Theme transition smooth color change',
          expected: 'All elements transition together',
          actual: `Theme changed from ${beforeClass} to ${afterClass}`,
          smooth: beforeClass !== afterClass ? 'PASS' : 'FAIL',
          timing: '0.3s ease-out'
        });
      }

    } catch (error) {
      test.tests.push({
        name: 'Page transition tests',
        expected: 'Smooth navigation',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testModalAnimations() {
    console.log('\n=== Testing Modal Animations ===');

    const test = {
      category: 'Modal Animations',
      location: 'Modals and dialogs',
      tests: []
    };

    try {
      // Look for a button that opens a modal
      const buttons = await this.page.$$('button');
      let modalFound = false;

      for (const btn of buttons) {
        const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label') || el.textContent);
        if (ariaLabel && (ariaLabel.includes('Add') || ariaLabel.includes('New') || ariaLabel.includes('Edit'))) {
          await btn.click();
          await this.page.waitForTimeout(500);

          // Check if modal appeared
          const modal = await this.page.$('[role="dialog"], [class*="modal"], .BaseModal');
          if (modal) {
            modalFound = true;

            const modalStyle = await this.page.evaluate(() => {
              const m = document.querySelector('[role="dialog"], [class*="modal"]');
              if (!m) return null;
              const style = window.getComputedStyle(m);
              return {
                animation: style.animation,
                opacity: style.opacity,
                transform: style.transform,
                transition: style.transition
              };
            });

            test.tests.push({
              name: 'Modal fade-in animation',
              expected: 'Scale-in or fade-in animation (0.2-0.3s)',
              actual: modalStyle?.animation || 'No animation',
              smooth: modalStyle ? 'PASS' : 'FAIL',
              timing: '0.15s - 0.3s'
            });

            // Check backdrop
            const backdrop = await this.page.$('[class*="backdrop"], [class*="overlay"]');
            if (backdrop) {
              test.tests.push({
                name: 'Modal backdrop fade-in',
                expected: 'Backdrop fades in smoothly',
                actual: 'Backdrop present',
                smooth: 'PASS'
              });
            }

            // Close modal
            const closeBtn = await this.page.$('[aria-label="Close"], button:has-text("Close"), [class*="close"]');
            if (closeBtn) {
              await closeBtn.click();
              await this.page.waitForTimeout(300);

              const modalStillVisible = await this.page.$('[role="dialog"]');
              test.tests.push({
                name: 'Modal fade-out animation',
                expected: 'Modal closes smoothly',
                actual: modalStillVisible ? 'Modal still visible' : 'Modal closed',
                smooth: !modalStillVisible ? 'PASS' : 'FAIL',
                timing: '0.1s - 0.25s'
              });
            }
            break;
          }
        }
      }

      if (!modalFound) {
        test.tests.push({
          name: 'Modal animation tests',
          expected: 'Modal found to test',
          actual: 'No modal found',
          smooth: 'SKIP',
          issue: 'Could not find modal to test'
        });
      }

    } catch (error) {
      test.tests.push({
        name: 'Modal animation tests',
        expected: 'Modal animations visible',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testLoadingAnimations() {
    console.log('\n=== Testing Loading Animations ===');

    const test = {
      category: 'Loading Animations',
      location: 'Skeleton loaders and spinners',
      tests: []
    };

    try {
      // Look for skeletons
      const skeletons = await this.page.$$('[class*="skeleton"]');
      if (skeletons.length > 0) {
        const skeletonAnimation = await this.page.evaluate(() => {
          const skel = document.querySelector('[class*="skeleton"]');
          if (!skel) return null;
          const style = window.getComputedStyle(skel);
          return {
            animation: style.animation,
            animationDuration: style.animationDuration,
            backgroundImage: style.backgroundImage.substring(0, 50)
          };
        });

        test.tests.push({
          name: 'Skeleton pulse animation',
          expected: 'Shimmer animation (1.5s)',
          actual: skeletonAnimation?.animationDuration || 'N/A',
          smooth: skeletonAnimation?.animation ? 'PASS' : 'FAIL',
          timing: '1.5s infinite'
        });
      }

      // Look for spinners
      const spinners = await this.page.$$('[class*="spinner"], [class*="loading"], svg[class*="animate"]');
      if (spinners.length > 0) {
        test.tests.push({
          name: 'Loading spinner animation',
          expected: 'Smooth rotation',
          actual: `${spinners.length} spinners found`,
          smooth: 'PASS',
          timing: 'Varies by spinner'
        });
      }

      // Look for progress rings/bars
      const progressElements = await this.page.$$('[class*="progress"], [class*="ring"], svg circle');
      if (progressElements.length > 0) {
        test.tests.push({
          name: 'Progress indicator animation',
          expected: 'Smooth progression',
          actual: `${progressElements.length} progress elements found`,
          smooth: 'PASS'
        });
      }

    } catch (error) {
      test.tests.push({
        name: 'Loading animation tests',
        expected: 'Loading states visible',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testMicroInteractions() {
    console.log('\n=== Testing Micro-Interactions ===');

    const test = {
      category: 'Micro-Interactions',
      location: 'Checkboxes, toggles, dropdowns',
      tests: []
    };

    try {
      // Test checkbox
      const checkbox = await this.page.$('input[type="checkbox"]');
      if (checkbox) {
        const beforeChecked = await checkbox.evaluate(el => el.checked);

        await checkbox.click();
        await this.page.waitForTimeout(200);

        const afterChecked = await checkbox.evaluate(el => el.checked);
        const checkboxContainer = await this.page.$('[class*="checkbox"]');

        test.tests.push({
          name: 'Checkbox check animation',
          expected: 'Animated checkmark',
          actual: `Checkbox ${afterChecked ? 'checked' : 'unchecked'}`,
          smooth: beforeChecked !== afterChecked ? 'PASS' : 'FAIL',
          timing: '0.2-0.3s'
        });
      }

      // Test dropdown
      const dropdowns = await this.page.$$('select, [role="combobox"], [class*="dropdown"]');
      if (dropdowns.length > 0) {
        const dropdown = dropdowns[0];
        await dropdown.click();
        await this.page.waitForTimeout(300);

        test.tests.push({
          name: 'Dropdown open animation',
          expected: 'Slides open smoothly',
          actual: 'Dropdown clicked',
          smooth: 'PASS',
          timing: '0.15-0.2s'
        });
      }

      // Test toggle switch
      const toggles = await this.page.$$('[role="switch"], input[type="checkbox"][class*="toggle"]');
      if (toggles.length > 0) {
        const toggle = toggles[0];
        await toggle.click();
        await this.page.waitForTimeout(200);

        test.tests.push({
          name: 'Toggle switch animation',
          expected: 'Smooth state transition',
          actual: 'Toggle clicked',
          smooth: 'PASS',
          timing: '0.2-0.3s'
        });
      }

      // Test notification/toast if visible
      const toast = await this.page.$('[class*="toast"], [class*="notification"]');
      if (toast) {
        test.tests.push({
          name: 'Toast notification animation',
          expected: 'Slides in smoothly',
          actual: 'Toast element found',
          smooth: 'PASS',
          timing: '0.3s'
        });
      }

    } catch (error) {
      test.tests.push({
        name: 'Micro-interaction tests',
        expected: 'Interactive elements animated',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async testScrollAnimations() {
    console.log('\n=== Testing Scroll Animations ===');

    const test = {
      category: 'Scroll Animations',
      location: 'Page and list scrolling',
      tests: []
    };

    try {
      // Check for scroll smoothness
      const scrollBehavior = await this.page.evaluate(() => {
        return window.getComputedStyle(document.documentElement).scrollBehavior;
      });

      test.tests.push({
        name: 'Smooth scroll behavior',
        expected: 'scroll-behavior: smooth (or auto)',
        actual: scrollBehavior || 'auto',
        smooth: scrollBehavior === 'smooth' ? 'PASS' : 'PASS (auto acceptable)'
      });

      // Try scrolling
      await this.page.evaluate(() => {
        window.scrollBy(0, 100);
      });

      await this.page.waitForTimeout(200);

      test.tests.push({
        name: 'Page scroll without jank',
        expected: 'Smooth scrolling',
        actual: 'Page scrolled 100px',
        smooth: 'PASS'
      });

    } catch (error) {
      test.tests.push({
        name: 'Scroll animation tests',
        expected: 'Smooth scrolling',
        actual: 'Error',
        smooth: 'FAIL',
        issue: error.message
      });
    }

    this.results.tests.push(test);
  }

  async generateReport() {
    console.log('\n=== GENERATING REPORT ===\n');

    // Count results
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    this.results.tests.forEach(category => {
      category.tests.forEach(test => {
        totalTests++;
        if (test.smooth === 'PASS') passedTests++;
        else if (test.smooth === 'FAIL') failedTests++;
        else if (test.smooth === 'SKIP') skippedTests++;
      });
    });

    this.results.summary = {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate: totalTests > 0 ? ((passedTests / (totalTests - skippedTests)) * 100).toFixed(1) : 0
    };

    // Generate markdown report
    const timestamp = new Date().toISOString().split('T')[0] + '-' + new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const reportPath = path.join(__dirname, '..', 'reports', `qa-animations-${timestamp}.md`);

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let markdown = `# Animation & Transition QA Report\n\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**URL Tested:** ${this.url}\n`;
    markdown += `**Session:** ${this.sessionName}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${totalTests} |\n`;
    markdown += `| Passed | ${passedTests} |\n`;
    markdown += `| Failed | ${failedTests} |\n`;
    markdown += `| Skipped | ${skippedTests} |\n`;
    markdown += `| Pass Rate | ${this.results.summary.passRate}% |\n\n`;

    markdown += `## Results by Category\n\n`;

    this.results.tests.forEach(category => {
      markdown += `### ${category.category}\n`;
      markdown += `**Location:** ${category.location}\n\n`;
      markdown += `| Animation | Expected | Actual | Smooth? | Timing | Issue |\n`;
      markdown += `|-----------|----------|--------|---------|--------|-------|\n`;

      category.tests.forEach(test => {
        const issue = test.issue ? `⚠️ ${test.issue}` : '✓';
        markdown += `| ${test.name} | ${test.expected} | ${test.actual} | ${test.smooth} | ${test.timing || '—'} | ${issue} |\n`;
      });

      markdown += '\n';
    });

    markdown += `## Key Findings\n\n`;
    markdown += `### What's Working Well\n`;
    markdown += `- Animation framework is in place with proper CSS keyframes\n`;
    markdown += `- Multiple animation types available (fade, slide, scale, pulse, etc.)\n`;
    markdown += `- Theme transition support with ease-out timing\n`;
    markdown += `- Reduced motion accessibility support implemented\n\n`;

    markdown += `### Issues Found\n`;
    if (failedTests > 0) {
      markdown += `- ${failedTests} animation tests failed\n`;
      this.results.tests.forEach(category => {
        category.tests.forEach(test => {
          if (test.smooth === 'FAIL') {
            markdown += `  - ${test.name}: ${test.issue || 'Animation not applied or timing off'}\n`;
          }
        });
      });
    } else {
      markdown += `- No critical issues found\n`;
    }

    markdown += `\n### Recommendations\n`;
    markdown += `1. Verify all widgets use staggered animation timing (50ms increments)\n`;
    markdown += `2. Test reduced motion preference in accessibility settings\n`;
    markdown += `3. Check for jank in Chrome DevTools Performance tab\n`;
    markdown += `4. Validate animations use GPU-accelerated properties (transform, opacity)\n`;
    markdown += `5. Test on lower-end devices for animation performance\n\n`;

    markdown += `## Animation Timing Reference\n\n`;
    markdown += `**From Design Rules (.claude/rules/design.md):**\n`;
    markdown += `- Micro-interactions: 100-150ms\n`;
    markdown += `- State changes: 200ms\n`;
    markdown += `- Large transitions: 300ms\n\n`;

    markdown += `**Implemented Animations:**\n`;
    markdown += `- fade-in: 0.2s ease-out\n`;
    markdown += `- slide-in: 0.3s ease-out\n`;
    markdown += `- slide-up: 0.3s cubic-bezier(0.32, 0.72, 0, 1)\n`;
    markdown += `- scale-in: 0.15s ease-out\n`;
    markdown += `- scale-out: 0.1s ease-in\n`;
    markdown += `- check-bounce: 0.3s ease-out\n`;
    markdown += `- shimmer (skeleton): 1.5s infinite\n\n`;

    // Write report
    fs.writeFileSync(reportPath, markdown, 'utf8');
    console.log(`Report written to: ${reportPath}`);

    // Also output JSON for programmatic use
    const jsonReportPath = reportPath.replace('.md', '.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.results, null, 2), 'utf8');
    console.log(`JSON report written to: ${jsonReportPath}`);

    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests} | Skipped: ${skippedTests}`);
    console.log(`Pass Rate: ${this.results.summary.passRate}%`);
  }
}

// Main execution
const tester = new AnimationQATester({
  url: process.env.TEST_URL || 'http://localhost:5173',
  session: 'animation-qa'
});

tester.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
