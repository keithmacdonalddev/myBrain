---
name: prototype
description: Create HTML/CSS/JS prototype files to preview design ideas before implementing. Opens in browser for review.
---

You are creating a design prototype for preview and feedback.

## Your Task

Create a standalone HTML file that demonstrates a design idea. The user can open it in their browser to see it live.

## Process

### 1. Understand the Request

What are we prototyping?
- Component (button, card, modal)
- Layout (page structure, grid)
- Interaction (hover effect, animation)
- Full feature (combination of above)

### 2. Create the Prototype File

Location: `.claude/design/prototypes/[descriptive-name].html`

Naming convention:
- `card-hover-effect-v1.html`
- `dashboard-layout-bento.html`
- `modal-slide-animation.html`
- `button-variants.html`

### 3. File Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Prototype Name] - myBrain Design</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Theme variables from design system */
    :root {
      --bg: #ffffff;
      --panel: #f9fafb;
      --panel2: #f3f4f6;
      --border: #e5e7eb;
      --text: #111827;
      --muted: #6b7280;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --danger: #ef4444;
      --success: #10b981;
      --warning: #f59e0b;
      --shadow-card: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
      --shadow-elevated: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
    }

    .dark {
      --bg: #09090b;
      --panel: #18181b;
      --panel2: #27272a;
      --border: #3f3f46;
      --text: #fafafa;
      --muted: #a1a1aa;
      --primary: #60a5fa;
      --primary-hover: #3b82f6;
      --danger: #f87171;
      --success: #34d399;
      --warning: #fbbf24;
      --shadow-card: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15);
      --shadow-elevated: 0 4px 12px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 40px;
      min-height: 100vh;
    }

    /* Theme toggle */
    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
    }

    /* Prototype styles below */

  </style>
</head>
<body>
  <button class="theme-toggle" onclick="document.documentElement.classList.toggle('dark')">
    Toggle Dark Mode
  </button>

  <h1 style="margin-bottom: 24px; font-size: 24px; font-weight: 600;">[Prototype Name]</h1>

  <!-- Prototype content here -->

  <script>
    // Interactive JS here if needed
  </script>
</body>
</html>
```

### 4. Include Interactivity

- Theme toggle (always include)
- Hover states
- Click interactions if relevant
- State variations (default, hover, active, disabled)

### 5. Show Multiple Variations

When prototyping components, show:
- Different sizes
- Different states
- Different contexts (light/dark)
- Before/after comparisons

### 6. Tell User How to View

After creating:
```
Prototype created: .claude/design/prototypes/[name].html

To view:
1. Navigate to the file in your file explorer
2. Double-click to open in browser
3. Toggle dark mode with button in top-right
4. Let me know your feedback!
```

### 7. Log the Prototype

Add entry to `.claude/design/design-log.md` → Prototypes Created section

## Quality Checklist

- [ ] Works in light and dark mode
- [ ] Responsive (test by resizing browser)
- [ ] Uses design system variables
- [ ] Shows relevant states/variations
- [ ] Clean, readable code for reference
- [ ] Clear labels/sections
