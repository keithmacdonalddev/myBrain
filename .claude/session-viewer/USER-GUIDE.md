# Session Viewer - User Guide

Welcome to Session Viewer! This guide explains how to use the app to browse and format your Claude session history.

## What is Session Viewer?

Session Viewer is a desktop application that helps you:
- **See all your sessions** - Browse all 1,400+ Claude sessions stored on your computer
- **Format sessions to Markdown** - Convert complex session data into beautiful, readable documents
- **View formatted sessions** - Read your sessions with syntax highlighting and proper formatting
- **Search and navigate** - Find specific sessions and browse between them
- **Use light or dark mode** - Choose your preferred theme

## Installing Session Viewer

### Option 1: Installer (Recommended for Most Users)

1. Download `Session Viewer Setup.exe`
2. Double-click to run the installer
3. Follow the installation wizard
4. Click "Finish" to launch the app
5. Add a desktop shortcut for easy access

### Option 2: Portable (No Installation Needed)

1. Download `Session Viewer.exe`
2. Double-click to launch immediately
3. No installation required - just works!

## Using Session Viewer

### Tab 1: Sessions (Default)

This is the main view where you browse and format sessions.

**Session List:**
- Shows all your Claude sessions
- Each row displays:
  - **Checkbox** - Select sessions you want to format
  - **Title** - The main topic of the session
  - **Date** - When the session was created
  - **Size** - How large the session file is
  - **Status** - Whether it's already formatted or needs formatting
  - **View button** - Opens formatted session (if available)

**Search:**
- Use the search box at the top to find sessions
- Type keywords from the session title
- Results update instantly

**Sort:**
- Click the dropdown to sort by: Date, Name, or Size
- Default is newest sessions first

**Format Sessions:**

Here's how to format sessions:

1. **Select sessions** - Click checkboxes next to sessions you want to format
   - Click individual checkboxes to select specific sessions
   - Click the header checkbox to select/deselect all
   - You'll see the count: "X sessions selected"

2. **Click "Format Selected"** - The blue button formats your selected sessions
   - The button shows "Formatting..." with a spinner
   - Processing may take a few seconds (or longer for many sessions)
   - Don't close the app while formatting

3. **Success!** - When formatting completes:
   - The session status changes from "○ Pending" to "✓ Formatted"
   - A "View" button appears on formatted sessions
   - The app is ready to format more sessions

### Tab 2: Viewer

View beautifully formatted sessions with:

**Navigation:**
- **Previous / Next buttons** - Browse between formatted sessions
- **Counter** - Shows "3 / 47" (viewing 3 of 47 formatted sessions)
- **Search** - Find text within the current session (press the search button)

**Reading:**
- Sessions display with proper formatting:
  - **Headers** - Main topics and sections are clearly visible
  - **Code blocks** - Code is shown with syntax highlighting
  - **Lists** - Bullet points and numbered lists are formatted nicely
  - **Links and tables** - Displayed in readable format
  - **Quotes** - Indented and highlighted

**Tips:**
- Use browser search (Ctrl+F on Windows) to find text across the whole page
- Sessions can be long - scroll to see more
- Formatted sessions are saved permanently (see next section)

### Tab 3: Settings

Configure your preferences:

**Dark Mode:**
- Toggle between light and dark theme
- Saves your preference automatically

**Directory Information:**
- Shows where your session files are stored
- Shows where formatted sessions are saved

**About:**
- Version number
- App description
- List of features

## Understanding Session Status

**✓ Formatted (Green):**
- Session has been converted to readable Markdown
- "View" button is available to read it

**○ Pending (Yellow):**
- Session hasn't been formatted yet
- Select it and click "Format Selected" to convert it
- After formatting completes, status changes to green

## Where Are My Formatted Sessions Saved?

Formatted sessions are automatically saved to:
```
C:\Users\[YourName]\.claude\memory\formatted-sessions\
```

Each formatted session creates a `.md` file with the same name as the original session.

You can:
- Open these files in any text editor
- Share them with others
- Read them outside the app using any Markdown viewer
- Edit them manually if needed

## Common Tasks

### Task 1: Format All Sessions

1. Go to the **Sessions** tab
2. Click the checkbox in the header row (next to "Title")
3. All sessions are now selected
4. Click "Format Selected"
5. Wait for completion

### Task 2: Format Sessions from a Specific Date

1. Go to the **Sessions** tab
2. Search for the date in the search box (e.g., "2026-01")
3. Sessions from that month appear
4. Select the ones you want
5. Click "Format Selected"

### Task 3: View a Formatted Session

1. Go to the **Sessions** tab
2. Find a session with status "✓ Formatted"
3. Click the "View" button
4. The **Viewer** tab opens automatically
5. Read the beautifully formatted session!

### Task 4: Format and View the Newest Session

1. Go to the **Sessions** tab
2. The first session (top row) is the newest
3. Check its checkbox
4. Click "Format Selected"
5. Once done, click the "View" button
6. Enjoy your formatted session!

## Troubleshooting

### Problem: "The app won't open"
**Solution:**
- Try double-clicking the .exe file again
- If it still doesn't work, try restarting your computer
- Make sure you have Windows 10 or later

### Problem: "Sessions are taking a long time to format"
**Solution:**
- This is normal for large batches of sessions
- Be patient - the app is still working (you'll see "Formatting..." on the button)
- Don't close the app while it's working

### Problem: "Search doesn't find sessions I expect"
**Solution:**
- Search looks in the session title only
- If titles aren't extracted, all sessions appear as "Unknown Session"
- This doesn't affect formatting - they'll still work fine

### Problem: "View button is greyed out"
**Solution:**
- The session hasn't been formatted yet
- Select it and click "Format Selected" first
- Wait for completion (status changes to green)
- Then the View button will be available

### Problem: "I can't find my formatted sessions"
**Solution:**
- Check the **Settings** tab
- Look for "Formatted Output" directory
- Open that folder in File Explorer
- You'll see all your .md files there
- You can open them in any text editor or Markdown viewer

## Tips for Best Experience

1. **Start small** - Format a few sessions first to understand the process
2. **Use dark mode at night** - Less eye strain when reading
3. **Save formatted sessions** - They're permanently saved, so you can reference them later
4. **Search within sessions** - Use Ctrl+F to find specific text in long sessions
5. **Navigate with Previous/Next** - Easier than going back to list and selecting another

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search within current session |
| `Tab` | Switch between interface elements |
| `Space` | Check/uncheck selected checkbox |

## Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Make sure you have the latest version of the app
3. Try restarting the app
4. Check that your session directory path is correct (in Settings)

## Advanced: Accessing Files Directly

If you want to work with formatted sessions directly:

1. Open File Explorer
2. Navigate to: `C:\Users\[YourName]\.claude\memory\formatted-sessions\`
3. You'll see `.md` files for each formatted session
4. Open in your preferred Markdown editor or viewer
5. No special tools needed - it's just plain text!

## Privacy & Data

- All sessions stay on your computer
- No data is sent to the internet
- Formatted sessions are stored locally
- You have full control over all files

Enjoy using Session Viewer! 📚
