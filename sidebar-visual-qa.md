# Sidebar Visual QA - Deep Inspection Session

## Test Parameters
- Test Account: claude-test-user@mybrain.test / ClaudeTest123
- Local URL: http://localhost:5173
- Production URL: https://my-brain-gules.vercel.app
- Viewport: 1280px width
- Session: sidebar-visual-qa
- Screenshot output: .claude/design/screenshots/qa/sidebar/

## Inspection Checklist

### 1. Header Section (Logo + Title)
- [ ] Logo: 28x28px gradient (blue to purple)
- [ ] Title: "myBrain" 17px, 600 weight
- [ ] Bottom border: 1px solid separator
- [ ] Glassmorphism: backdrop blur visible
- [ ] Light mode: white background, glassmorphic
- [ ] Dark mode: solid dark background

### 2. Quick Actions Section (2x2 Grid)
- [ ] Section title: uppercase, muted color
- [ ] Button styling: 8px gap between buttons
- [ ] Primary buttons: blue bg, white text
- [ ] Secondary buttons: gray bg
- [ ] Quick Capture: purple gradient, full width span
- [ ] Hover effects: brightness change, scale
- [ ] Icon sizes: consistent 14-16px

### 3. Navigate Section (8 Items)
- [ ] All items render: Dashboard, Today, Tasks, Notes, Calendar, Projects, Inbox, Files
- [ ] Icon size: 20px consistent
- [ ] Label: 13px, proper alignment
- [ ] Badge styling: red pill, white text
- [ ] Badge counts: correct numbers displayed
- [ ] Active state: blue background + blue text
- [ ] Hover state: gray background
- [ ] Spacing: 8px gaps between items

### 4. Today's Progress Section
- [ ] Activity Rings visible
- [ ] Three rings: red/orange (outer), green (middle), blue (inner)
- [ ] Ring sizes: 100px, 76px, 52px
- [ ] Labels below rings
- [ ] Percentages displayed
- [ ] Ring strokes correct
- [ ] Progress animation smooth

### 5. Streak Banner
- [ ] Gradient background: orange to red
- [ ] Fire emoji present
- [ ] Text styling: white, bold
- [ ] Border radius: 10px
- [ ] Only shows when streak > 0
- [ ] Proper padding and spacing

### 6. Projects Section
- [ ] Project list rendered
- [ ] Color dots: 10px circles
- [ ] Progress indicators visible
- [ ] "See All" link styled correctly
- [ ] Hover states on items

## Visual Measurements to Verify
- Sidebar width: 260px (light mode) or 260px (dark mode)
- Section padding: 12px horizontal, consistent
- Item height: 40px base
- Font sizing: title 17px, section headers 11px, items 13px
- Border colors: consistent with design system
- Icon colors: match text colors in each state

## Dark Mode Checks
- Text contrast: #E5E5E5 on #1A1A1A (12.6:1)
- Secondary text: #A0A0A0 (6.3:1)
- Tertiary text: #B0B0B0 (7:1)
- Border visibility: clear but subtle
- Ring colors: maintained in dark mode
- Streak banner: gradient works in dark mode

## Issues to Flag
- [ ] Text is hard to read (contrast too low)
- [ ] Icons are misaligned
- [ ] Spacing is inconsistent
- [ ] Colors don't match prototype
- [ ] Hover effects not working
- [ ] Active states not visible
- [ ] Badges incorrect size or position
- [ ] Activity rings not rendering
- [ ] Dark mode text unreadable
- [ ] Typography sizes wrong

## Evidence Needed
- Full sidebar screenshot (light mode)
- Full sidebar screenshot (dark mode)
- Zoomed header comparison
- Zoomed activity rings
- Badge examples with counts
- Hover state evidence
- Active state evidence
- Dark mode contrast verification
