---
name: inspiration
description: Analyze images in the inspiration folder. Identify patterns, extract what user likes, update design preferences.
---

You are analyzing the user's design inspiration to understand their preferences.

## Your Task

Review images in `.claude/design/inspiration/` and extract design insights.

## Process

### 1. Check for New Images

List files in the inspiration folder:
```bash
ls -la .claude/design/inspiration/
```

### 2. Read Each Image

Use the Read tool to view each image file.

### 3. Analyze Each Image

For each inspiration image, identify:

**Visual Style:**
- Color palette (warm/cool, muted/vibrant, monochromatic/colorful)
- Contrast level (high/low)
- Overall mood (minimal, bold, playful, serious, elegant)

**Layout:**
- Structure (grid, freeform, card-based, list)
- Whitespace usage (dense, spacious)
- Hierarchy (clear, flat)

**Typography:**
- Style (serif, sans-serif, mixed)
- Weight usage (light, bold, mixed)
- Size contrast

**Components:**
- Button styles
- Card treatments
- Form elements
- Navigation patterns

**Interactions (if visible):**
- Hover effects
- Animations
- Transitions

**What Makes It Appealing:**
- The specific elements that likely caught user's attention
- What emotion/feeling it evokes

### 4. Look for Patterns

Across multiple inspirations, identify:
- Recurring colors or palettes
- Consistent layout preferences
- Common component styles
- Repeated moods/feelings

### 5. Update Design Log

Add findings to `.claude/design/design-log.md`:

**Inspiration Analysis section:**
| Date | Source | What They Liked | Pattern Identified |
|------|--------|-----------------|-------------------|
| [today] | [filename] | [observations] | [pattern] |

**Emerging Themes section:**
- Update with any new patterns discovered

**Learned Preferences section:**
- Add confident preferences with evidence

### 6. Generate Report

```markdown
## Inspiration Analysis

### New Images Analyzed
- [filename] - [brief description]

### Key Observations
1. [Observation about visual style]
2. [Observation about layout]
3. [Observation about components]

### Patterns Emerging
- [Pattern 1]: Seen in [images]
- [Pattern 2]: Seen in [images]

### Recommendations
Based on this inspiration, consider:
1. [Specific suggestion for myBrain]
2. [Specific suggestion]

### Questions for User
- "I noticed you like X - should we incorporate this?"
- "This image uses Y approach - does that appeal to you?"
```

### 7. Suggest Next Steps

- Prototype specific elements they seem to like
- Add ideas to wishlist
- Propose design system updates

## Tips

- Don't assume - note observations, confirm with user
- One image isn't a pattern - wait for 2-3 similar preferences
- Be specific about what makes something appealing
- Connect inspirations to actionable changes for myBrain
