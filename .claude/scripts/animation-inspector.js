/**
 * Animation Inspector
 * Run in Chrome DevTools console to inspect all animations on page
 *
 * Usage:
 * 1. Open Chrome DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy & paste this entire script
 * 4. Run: AnimationInspector.analyzeAll()
 * 5. Copy results and paste into report
 */

const AnimationInspector = {
  results: {
    timestamp: new Date().toISOString(),
    animations: [],
    transitions: [],
    keyframes: [],
    summary: {}
  },

  /**
   * Get all stylesheets (including external)
   */
  getAllStylesheets() {
    const sheets = [];
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        if (sheet.cssRules) {
          sheets.push(sheet);
        }
      } catch (e) {
        // CORS or other restrictions
      }
    }
    return sheets;
  },

  /**
   * Extract all @keyframes from stylesheets
   */
  extractKeyframes() {
    const keyframes = {};

    this.getAllStylesheets().forEach(sheet => {
      try {
        for (let i = 0; i < sheet.cssRules.length; i++) {
          const rule = sheet.cssRules[i];
          if (rule.type === CSSRule.KEYFRAMES_RULE) {
            keyframes[rule.name] = {
              name: rule.name,
              keyframes: Array.from(rule.cssRules).map(kr => ({
                key: kr.keyText,
                style: kr.style.cssText
              }))
            };
          }
        }
      } catch (e) {
        // Ignore errors from cross-origin stylesheets
      }
    });

    this.results.keyframes = Object.values(keyframes);
    return keyframes;
  },

  /**
   * Find all elements with animations
   */
  findAnimatedElements() {
    const animated = [];

    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const animation = style.animation;
      const animationName = style.animationName;

      if (animation && animation !== 'none') {
        animated.push({
          element: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.replace(/ /g, '.')}` : ''),
          animation: animation,
          animationName: animationName,
          animationDuration: style.animationDuration,
          animationTimingFunction: style.animationTimingFunction,
          animationDelay: style.animationDelay,
          animationIterationCount: style.animationIterationCount
        });
      }
    });

    this.results.animations = animated;
    return animated;
  },

  /**
   * Find all elements with transitions
   */
  findTransitionedElements() {
    const transitioned = [];

    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const transition = style.transition;
      const transitionDuration = style.transitionDuration;

      if (transition && transition !== 'none' && transitionDuration && transitionDuration !== '0s') {
        transitioned.push({
          element: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
          transition: transition,
          transitionDuration: transitionDuration,
          transitionProperty: style.transitionProperty,
          transitionTimingFunction: style.transitionTimingFunction,
          transitionDelay: style.transitionDelay
        });
      }
    });

    this.results.transitions = transitioned;
    return transitioned;
  },

  /**
   * Check specific animation class performance
   */
  checkAnimationClass(className) {
    const elements = document.querySelectorAll(`.${className}`);
    if (elements.length === 0) return null;

    const el = elements[0];
    const style = window.getComputedStyle(el);

    return {
      className: className,
      elementCount: elements.length,
      animation: style.animation,
      animationDuration: style.animationDuration,
      animationTimingFunction: style.animationTimingFunction,
      transform: style.transform,
      opacity: style.opacity,
      willChange: style.willChange
    };
  },

  /**
   * Check for reduced motion support
   */
  checkReducedMotion() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      prefersReducedMotion: prefersReduced,
      browserSupport: true,
      mediaQueryWorks: window.matchMedia('(prefers-reduced-motion: reduce)').media
    };
  },

  /**
   * Analyze hover animations
   */
  analyzeHoverAnimations() {
    const hoverAnimations = [];

    // Check common interactive elements
    ['button', 'a', '[class*="card"]', '[class*="nav"]', 'input'].forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const baseStyle = window.getComputedStyle(el);
        const transition = baseStyle.transition;

        if (transition && transition !== 'none') {
          hoverAnimations.push({
            selector: selector,
            element: el.tagName + (el.id ? `#${el.id}` : ''),
            transition: transition,
            transitionDuration: baseStyle.transitionDuration
          });
        }
      });
    });

    return hoverAnimations;
  },

  /**
   * Check GPU acceleration
   */
  checkGPUAcceleration() {
    const report = {
      animationsUsingTransform: 0,
      animationsUsingOpacity: 0,
      animationsUsingOtherProps: 0,
      details: []
    };

    document.querySelectorAll('[class*="animate"]').forEach(el => {
      const style = window.getComputedStyle(el);
      const transform = style.transform;
      const opacity = style.opacity;

      if (transform && transform !== 'none') {
        report.animationsUsingTransform++;
      } else if (opacity !== '1') {
        report.animationsUsingOpacity++;
      } else {
        report.animationsUsingOtherProps++;
        report.details.push({
          element: el.className,
          animation: style.animation,
          transform: transform,
          willChange: style.willChange
        });
      }
    });

    return report;
  },

  /**
   * Generate comprehensive report
   */
  analyzeAll() {
    console.clear();
    console.log('='.repeat(60));
    console.log('ANIMATION INSPECTOR - COMPREHENSIVE ANALYSIS');
    console.log('='.repeat(60));

    // Extract keyframes
    console.log('\n[1/5] Extracting keyframes...');
    this.extractKeyframes();
    console.log(`Found ${this.results.keyframes.length} keyframe definitions`);
    this.results.keyframes.forEach(kf => {
      console.log(`  - ${kf.name} (${kf.keyframes.length} steps)`);
    });

    // Find animated elements
    console.log('\n[2/5] Finding animated elements...');
    const animations = this.findAnimatedElements();
    console.log(`Found ${animations.length} elements with animations`);
    animations.slice(0, 10).forEach(a => {
      console.log(`  - ${a.element}`);
      console.log(`    Animation: ${a.animation}`);
      console.log(`    Duration: ${a.animationDuration}`);
    });
    if (animations.length > 10) {
      console.log(`  ... and ${animations.length - 10} more`);
    }

    // Find transitions
    console.log('\n[3/5] Finding transition animations...');
    const transitions = this.findTransitionedElements();
    console.log(`Found ${transitions.length} elements with transitions`);
    transitions.slice(0, 10).forEach(t => {
      console.log(`  - ${t.element}`);
      console.log(`    Transition: ${t.transition}`);
      console.log(`    Duration: ${t.transitionDuration}`);
    });
    if (transitions.length > 10) {
      console.log(`  ... and ${transitions.length - 10} more`);
    }

    // Check specific animations
    console.log('\n[4/5] Checking common animation classes...');
    const commonClasses = [
      'animate-fade-in',
      'animate-slide-in',
      'animate-scale-in',
      'animate-pulse-dot',
      'btn-interactive',
      'card-interactive',
      'animate-check-bounce'
    ];

    commonClasses.forEach(className => {
      const check = this.checkAnimationClass(className);
      if (check) {
        console.log(`  ✓ ${className}`);
        console.log(`    Count: ${check.elementCount}`);
        console.log(`    Duration: ${check.animationDuration}`);
        console.log(`    Timing: ${check.animationTimingFunction}`);
      } else {
        console.log(`  ✗ ${className} (not found)`);
      }
    });

    // Check GPU acceleration
    console.log('\n[5/5] Checking GPU acceleration...');
    const gpu = this.checkGPUAcceleration();
    console.log(`  ✓ Using transform: ${gpu.animationsUsingTransform} elements`);
    console.log(`  ✓ Using opacity: ${gpu.animationsUsingOpacity} elements`);
    console.log(`  ⚠ Using other props: ${gpu.animationsUsingOtherProps} elements`);
    if (gpu.details.length > 0) {
      console.log('  Details of non-GPU animations:');
      gpu.details.forEach(d => {
        console.log(`    - ${d.element}: ${d.animation}`);
      });
    }

    // Check accessibility
    console.log('\n[ACCESSIBILITY] Reduced motion support:');
    const reducedMotion = this.checkReducedMotion();
    console.log(`  Prefers reduced motion: ${reducedMotion.prefersReducedMotion}`);
    console.log(`  Browser support: ${reducedMotion.browserSupport}`);

    console.log('\n' + '='.repeat(60));
    console.log('COPY RESULTS:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(this.results, null, 2));
    console.log('\n' + '='.repeat(60));

    return this.results;
  },

  /**
   * Export results as markdown table
   */
  exportMarkdown() {
    let md = '# Animation Report\n\n';

    md += '## Animations Found\n\n';
    md += '| Element | Animation | Duration | Timing Function |\n';
    md += '|---------|-----------|----------|------------------|\n';

    this.results.animations.forEach(a => {
      md += `| ${a.element} | ${a.animation} | ${a.animationDuration} | ${a.animationTimingFunction} |\n`;
    });

    md += '\n## Transitions Found\n\n';
    md += '| Element | Property | Duration | Timing Function |\n';
    md += '|---------|----------|----------|------------------|\n';

    this.results.transitions.forEach(t => {
      md += `| ${t.element} | ${t.transitionProperty} | ${t.transitionDuration} | ${t.transitionTimingFunction} |\n`;
    });

    return md;
  }
};

// Run analysis
console.log('Starting comprehensive animation analysis...');
const results = AnimationInspector.analyzeAll();

// Make available globally
window.AnimationInspector = AnimationInspector;
window.AnimationResults = results;

console.log('\n✅ Analysis complete! Results available in window.AnimationResults');
console.log('Run: copy(JSON.stringify(window.AnimationResults, null, 2)) to copy to clipboard');
