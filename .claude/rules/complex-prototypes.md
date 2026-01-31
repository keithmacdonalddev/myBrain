---
paths:
  - "**/*.html"
  - "**/*.jsx"
  - "**/*.css"
  - ".claude/design/prototypes/**"
---

## Quick Reference
- Always read original source files before building
- Verify against originals line-by-line, not just instructions
- Use visual verification (agent-browser) to compare results
- Launch monitoring agent WITH execution agent from start
- Produce explicit checklist showing each requirement verified

---

# Complex Prototype Merging

**When to apply:** Merging multiple prototypes/designs into one, complex UI work with specific visual requirements, retrying tasks that have failed before, or any work where "matching the original" is critical.

This rule captures lessons learned from repeated failures merging 4 dashboard prototypes. The core issue: agents missed features, didn't match originals, and quality suffered because they relied on instructions instead of verifying against source files.

---

## Before Starting

### 1. Read ALL Source Files Completely

**This is non-negotiable.** Before any code is written:

- Open and read every original source/reference file from top to bottom
- Copy exact code blocks you'll need (don't rewrite from memory or instructions)
- Note specific line numbers, class names, component structure from originals
- Identify ALL features, styling, and functionality in each source

**Why this matters:** Instructions summarize features but miss details. The source files are the truth.

### 2. Create Explicit Checklist

Build a table of everything that must be preserved or included:

| Feature/Section | Source File | Line Numbers | Status | Notes |
|-----------------|-------------|--------------|--------|-------|
| Weather widget | dashboard-v1.html | 45-78 | Pending | Uses Chart.js library |
| Event list | dashboard-v2.html | 120-160 | Pending | Custom scroll styling |
| Goals progress | dashboard-v3.html | 200-250 | Pending | Animated bars |
| Calendar strip | dashboard-v4.html | 15-40 | Pending | Date picker on click |

Update this table as you go. This is YOUR proof that you haven't missed anything.

### 3. Launch Agents in Parallel

**Critical:** Dispatch execution agent AND monitoring agent at the same time.

- **Execution agent:** Builds the merged prototype
- **Monitoring agent:** Watches progress, compares against originals, flags issues real-time

**Do NOT start with just execution agent and add monitoring later.** Quality suffers when monitoring isn't there from the start.

---

## During Execution

### Reference Original Code, Don't Rewrite

**Pattern to follow:**
1. Find the feature in original source file
2. Note the exact line numbers
3. Copy that code block exactly (preserve formatting, classes, structure)
4. Paste into merged version at appropriate location
5. Adjust only what's necessary for integration (variable names, paths, etc.)

**What NOT to do:**
- Rewrite code based on what you think it should be
- Paraphrase functionality from instructions
- Simplify or "improve" code from originals
- Skip details because "they seem optional"

### Use Specific Line References

Every code section should reference its source:

```html
<!-- From dashboard-v1.html lines 45-78: Weather Widget -->
<div class="weather-widget">
  <!-- Original markup preserved exactly -->
</div>
```

For React components:
```jsx
// From CalendarStripWidget.jsx lines 12-45: Calendar strip interaction
// Copied exactly to preserve event binding behavior
```

### Check Work Against Originals as You Go

Don't wait until the end to verify. Check incrementally:

1. After merging each major section, compare against original
2. Use agent-browser to screenshot both versions
3. Verify styling matches (colors, spacing, fonts)
4. Verify functionality works (clicks, animations, state changes)
5. Verify data structures match (props, state shape)

**If mismatch found:** Stop, investigate, fix before proceeding to next section.

---

## Before Completion

### 1. Produce Verification Table

Create a comprehensive table showing what was verified:

| Requirement | Source Location | Final Location | Verified | Status |
|-------------|-----------------|-----------------|----------|--------|
| Weather widget HTML | dashboard-v1.html:45-78 | merged.html:120-155 | ✅ line-by-line | Exact match |
| Weather CSS classes | dashboard-v1.css:200-250 | merged.html style block | ✅ screenshot compare | Visual match |
| Event list functionality | dashboard-v2.jsx:45-120 | MergedDashboard.jsx:180-255 | ✅ interaction test | Click handlers work |
| Goals animation | dashboard-v3.jsx:89-150 | MergedDashboard.jsx:300-361 | ✅ visual inspection | Animation timing preserved |
| Calendar integration | dashboard-v4.jsx:15-40 | MergedDashboard.jsx:50-75 | ✅ functional test | Date picker works |

**Every row should have a checkmark.** If not, something wasn't actually verified.

### 2. Visual Verification with agent-browser

**Don't skip this.** Actually look at what you built:

1. Open the merged version in browser
2. Compare side-by-side with original screenshots
3. Check each feature:
   - Does it render? (appears on page)
   - Does it style correctly? (colors, spacing, fonts)
   - Does it function? (click, scroll, input, animation)
   - Does it match the original? (layout, proportions, behavior)

**Specific checks:**

```bash
# Take screenshot of merged version
agent-browser screenshot merged-dashboard.png

# Compare against original version
# (visually or use agent-browser to open original)
```

### 3. Feature-by-Feature Comparison

For each major feature, create a comparison:

**Feature:** Weather Widget

| Aspect | Original | Merged | Match |
|--------|----------|--------|-------|
| HTML structure | `<div class="weather-widget">` | Same | ✅ |
| CSS classes | `.weather-widget`, `.temp-display`, `.forecast-item` | All present | ✅ |
| Styling values | Colors: #2c3e50, font: 14px | Same values | ✅ |
| Data binding | Renders `weather.temp`, `weather.forecast` | Same props | ✅ |
| Responsive | Adapts at 768px breakpoint | Breakpoint preserved | ✅ |
| Interactions | None (display only) | Verified | ✅ |

---

## When to Apply This Rule

Check all that apply:

- [ ] Merging 2+ prototype versions into one final version
- [ ] Complex UI work with specific visual requirements from originals
- [ ] Retrying a task that has failed before (quality was poor, features missed)
- [ ] Work where "matching the original exactly" is a key requirement
- [ ] Complex component merging with many features to preserve
- [ ] Prototype combining features from multiple source files

**If ANY checkbox applies: Use this rule.**

---

## Common Pitfalls This Rule Prevents

### Pitfall 1: Relying on Instructions Instead of Source Files

**Problem:** Agent reads instructions like "merge the weather widget from dashboard-v1" and builds it from scratch based on what they think a weather widget should be.

**Result:** Missing details, wrong styling, broken functionality, doesn't match original.

**Prevention:** Read the actual source file. Copy exact code blocks.

### Pitfall 2: End-of-Process Verification Only

**Problem:** Agent builds entire prototype, then at the end compares against original and finds mismatches everywhere.

**Result:** Major rework needed, time wasted, quality issues.

**Prevention:** Verify as you go. Check each section against original before moving to next.

### Pitfall 3: Monitoring Agent Arrives Late

**Problem:** Execution starts, monitoring agent is added later to check work.

**Result:** Issues not caught early, features already built wrong, expensive to fix.

**Prevention:** Launch monitoring agent at the same time as execution agent. They work in parallel from start.

### Pitfall 4: Missing Line-by-Line Verification

**Problem:** Execution agent says "I compared it" but didn't actually verify specific lines match.

**Result:** Subtle differences exist (wrong class names, missing props, different event handlers).

**Prevention:** Explicit checklist with line numbers. Every row must be verified, not just checked.

### Pitfall 5: Visual Verification Skipped or Rushed

**Problem:** "It looks right" without actually taking screenshots and comparing.

**Result:** Spacing is off, colors don't match, animations are wrong.

**Prevention:** Agent-browser screenshots, side-by-side comparison, specific checks for each feature.

---

## Example: Applying the Rule

**Scenario:** Merging 4 dashboard prototypes into one final version.

**Step 1: Read originals**
```
Read CalendarStripWidget.jsx completely
Read EventsWidget.jsx completely
Read GoalsWidget.jsx completely
Read WeatherWidget.jsx completely
```

**Step 2: Create checklist**
```
| Calendar strip | CalendarStripWidget.jsx | 1-85 | Pending |
| Events list | EventsWidget.jsx | 1-120 | Pending |
| Goals progress | GoalsWidget.jsx | 1-95 | Pending |
| Weather display | WeatherWidget.jsx | 1-110 | Pending |
```

**Step 3: Dispatch agents**
```
Sending 2 agents to merge dashboard prototypes:
- execution-agent: Builds MergedDashboard.jsx
- monitoring-agent: Verifies against originals in real-time
(2 active)
```

**Step 4: Check as you go**
As execution agent adds each widget:
- Monitoring agent takes screenshot
- Compares against original
- Verifies line-by-line against source
- Reports any mismatches immediately
- Execution agent fixes before continuing

**Step 5: Final verification**
```
Verification table completed - all 4 widgets verified
Screenshots show exact match to originals
Feature comparison complete - no items missing
Ready for completion
```

---

## Monitoring Agent Checklist

If using dedicated monitoring agent, they should track:

- [ ] Original source files read completely (verify with specific line counts)
- [ ] Code blocks copied exactly from sources, not rewritten
- [ ] Line number references present in merged code
- [ ] Screenshot comparison done for each major section
- [ ] Feature verification table completed with all checkmarks
- [ ] No discrepancies between original and merged version
- [ ] All CSS classes and styling preserved from originals
- [ ] All functionality and interactions working as original
- [ ] Data binding/props match original component expectations
- [ ] Responsive behavior matches original breakpoints

---

## Anti-Pattern: What NOT to Do

**❌ Skip reading originals, rely on instructions only**
→ Results in incomplete, incorrect merges

**❌ Build all code first, verify at the end**
→ Late discovery of major issues

**❌ Use execution agent only, skip monitoring**
→ Quality suffers, mistakes go unnoticed

**❌ Say "I compared it" without actual verification**
→ Subtle differences exist but aren't caught

**❌ Quick visual check without systematic comparison**
→ Details are missed

**✅ Read originals completely → Create checklist → Dispatch both agents → Verify incrementally → Produce verification table**
→ High quality, complete, accurate merge

---

## Template: Verification Report

Use this template for final verification:

```markdown
# [Feature Name] Verification Report

## Source Reference
- **Original file:** [path/file.jsx]
- **Lines referenced:** [start-end]
- **Final location:** [merged-file.jsx lines start-end]

## Code Verification
- [x] HTML/JSX structure matches line-by-line
- [x] CSS classes all present
- [x] Styling values identical
- [x] Props and data binding match
- [x] Event handlers preserved
- [x] Comments and documentation intact

## Visual Verification
- [x] Screenshot comparison done
- [x] Layout matches original
- [x] Colors match original
- [x] Typography matches original
- [x] Spacing/alignment matches original

## Functional Verification
- [x] Feature renders without errors
- [x] Interactions work as original
- [x] State management works
- [x] No console errors
- [x] Responsive behavior intact

## Status: ✅ COMPLETE
All verifications passed. Feature ready for integration.
```
