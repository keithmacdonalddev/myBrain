# Format Sessions Skill

Access session formatting and viewing tools via Claude Code commands.

## Usage

### Format CLI (Command Line)

```bash
/format-sessions --all              # Format all sessions
/format-sessions --since 2026-01-25 # Format last 7 days
/format-sessions --file UUID        # Format specific session
```

### Launch GUI (Desktop App)

```bash
/format-sessions --gui    # Launch Session Viewer desktop application
```

## What This Does

### CLI Mode (`/format-sessions`)

**Converts session JSONL files to readable Markdown**

The CLI formatter:
- Discovers all stored JSONL session files
- Parses conversation flow and tool calls
- Generates beautifully formatted Markdown
- Saves to `.claude/memory/formatted-sessions/`
- Shows progress and statistics

**Example:**
```bash
# Format last 3 days of sessions
/format-sessions --since 2026-01-29

# Output:
# Processing 12 sessions...
# ✓ 01fad6c0-e099-4485-819b-ec2216f158b9.md (15 KB)
# ✓ 028f7253-fca6-478c-b6f7-9bba170c4106.md (125 KB)
# ... completed 12 of 12
# Output: .claude/memory/formatted-sessions/
```

### GUI Mode (`/format-sessions --gui`)

**Beautiful desktop app for browsing and formatting sessions**

The GUI provides:
- Visual session list with search and filter
- Checkbox multi-selection
- One-click formatting with progress tracking
- Beautiful Markdown viewer with syntax highlighting
- Session navigation (previous/next)
- Light/dark theme support
- Search within sessions

**User Flow:**
1. Launch app (double-click `.exe` or use skill)
2. Browse all sessions in visual list
3. Select sessions you want to format (checkboxes)
4. Click "Format Selected" button
5. Watch progress in real-time
6. Click "View" to read formatted session
7. Navigate between sessions with Previous/Next

## File Locations

### Session Storage
```
C:\Users\NewAdmin\.claude\projects\C--Users-NewAdmin-Desktop-PROJECTS-myBrain\
├── *.jsonl (1,400+ raw session files)
└── */subagents/*.jsonl (nested agent sessions)
```

### Formatted Output
```
.claude/memory/formatted-sessions/
├── 01fad6c0-e099-4485-819b-ec2216f158b9.md
├── 028f7253-fca6-478c-b6f7-9bba170c4106.md
└── ... (one .md per formatted session)
```

### CLI Script
```
.claude/scripts/format-sessions.mjs (main executable)
.claude/scripts/lib/jsonl-parser.mjs (parser module)
.claude/scripts/lib/markdown-formatter.mjs (formatter module)
```

### GUI Application
```
.claude/session-viewer/
├── electron-main.js (Electron entry point)
├── package.json (dependencies)
├── src/ (React components)
├── dist/ (built executable)
│   ├── Session Viewer Setup.exe (installer)
│   └── Session Viewer.exe (portable app)
└── USER-GUIDE.md (detailed user instructions)
```

## CLI Examples

### Example 1: Format All Sessions
```bash
/format-sessions --all
```
Processes all 1,400+ sessions and creates Markdown files.

### Example 2: Format Last Week
```bash
/format-sessions --since 2026-01-25
```
Formats only sessions modified after January 25, 2026.

### Example 3: Format Date Range
```bash
/format-sessions --since 2026-01-20 --until 2026-01-25
```
Formats sessions between January 20-25, 2026.

### Example 4: Format Single Session
```bash
/format-sessions --file 01fad6c0-e099-4485-819b-ec2216f158b9
```
Formats just the specified session UUID.

## What Gets Formatted

Each formatted session includes:

1. **Header Section**
   - Session UUID and filename
   - Creation date
   - File size and message count

2. **Summary**
   - Session title (extracted from data)
   - Message statistics
   - Tool call count
   - Files modified
   - Timeline

3. **Full Conversation**
   - Every user message
   - Every assistant response
   - All tool calls used
   - Tool results (formatted nicely)

4. **Error Tracking**
   - Any errors or warnings
   - Failed operations
   - Debugging info

## Performance

**CLI Processing Speed:**
- Small sessions (< 100 KB): < 1 second
- Large sessions (1-10 MB): 3-10 seconds
- Batch processing (128 sessions): ~40 seconds total
- Very large batches (all 1,430 sessions): ~10-15 minutes

**Output Size:**
- Average compression: 76:1 (1.6 GB → 21 MB)
- Markdown is readable and portable
- Files can be shared, edited, or archived

## GUI Features

**Session List Tab:**
- Browse all JSONL files
- Search by session title
- Sort by date, name, or size
- See formatting status (Pending/Formatted)
- Multi-select with checkboxes
- Single-click formatting

**Viewer Tab:**
- Beautiful Markdown rendering
- Syntax highlighting for code blocks
- Session navigation (previous/next)
- Search within session text
- Dark mode support

**Settings Tab:**
- Toggle light/dark theme
- View directory paths
- App information and features

## Requirements

### CLI
- Node.js 14+ (already installed for Claude Code)
- No additional dependencies

### GUI
- Windows 10 or later
- No installation required (portable .exe)
- Or run installer for system integration

## Troubleshooting

### CLI Issues

**"command not found"**
- Ensure you're in the myBrain project directory
- CLI script is at `.claude/scripts/format-sessions.mjs`

**"No sessions found"**
- Check that session storage directory exists
- Verify: `C:\Users\NewAdmin\.claude\projects\C--Users-NewAdmin-Desktop-PROJECTS-myBrain\`

**"Permission denied" on output**
- Output directory may not exist
- Run: `mkdir -p .claude/memory/formatted-sessions`

### GUI Issues

**"App won't launch"**
- Make sure Windows 10+
- Try double-clicking `.exe` again
- Restart computer if needed

**"Formatting hangs"**
- Close other apps using system resources
- Don't close app while formatting
- Try formatting fewer sessions at once

**"Sessions list is empty"**
- Check Settings tab for directory path
- Verify session files exist in storage directory

## Next Steps

1. **Try the CLI first:** `/format-sessions --since 2026-01-25`
   - Fast way to test the formatter
   - Good for automation scripts

2. **Use the GUI for browsing:** `/format-sessions --gui`
   - User-friendly visual interface
   - Great for exploring your session history
   - Perfect for reading and referencing past work

3. **Access formatted files directly:**
   - All `.md` files saved to `.claude/memory/formatted-sessions/`
   - Open in any text editor
   - Share or archive as needed

## Technical Details

See documentation:
- **CLI Reference:** `.claude/scripts/FORMAT-SESSIONS-GUIDE.md`
- **JSONL Schema:** `.claude/docs/jsonl-schema.md`
- **GUI Developer Guide:** `.claude/session-viewer/README.md`
- **GUI User Guide:** `.claude/session-viewer/USER-GUIDE.md`

---

**Version:** 1.0.0
**Status:** Production Ready
**Components:** CLI Formatter + Electron GUI
