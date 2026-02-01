# Session Viewer - Developer Guide

Beautiful desktop application for browsing and formatting Claude session history.

## Quick Start

### Prerequisites
- Node.js 14+ ([Download](https://nodejs.org))
- npm (included with Node.js)

### Development Mode

```bash
# Install dependencies
npm install

# Start development server with Electron
npm run dev

# This will:
# 1. Start React dev server on http://localhost:3000
# 2. Open Electron window connected to dev server
# 3. Enable hot reload for React components
```

### Production Build

```bash
# Build React app and create Electron executable
npm run build

# This creates:
# - dist/Session Viewer Setup.exe (installer)
# - dist/Session Viewer.exe (portable executable)
```

## Project Structure

```
.claude/session-viewer/
├── electron-main.js          # Electron main process
├── preload.js                # IPC preload script
├── package.json              # Dependencies and scripts
├── src/
│   ├── index.js             # React entry point
│   ├── App.jsx              # Main React component
│   ├── App.css              # Global styles
│   └── components/
│       ├── SessionList.jsx  # Session list with search/filter
│       ├── FormatPanel.jsx  # Format controls and progress
│       ├── SessionViewer.jsx # Markdown viewer
│       └── Settings.jsx     # Settings and about page
└── public/
    └── index.html           # HTML template
```

## Development

### Adding New Components

1. Create file in `src/components/ComponentName.jsx`
2. Import in `src/App.jsx`
3. Add to navigation tabs if needed

### Styling

- Global styles: `src/App.css`
- All components use CSS classes from App.css
- Dark mode support via `body.dark-mode` class

### Backend API (IPC)

The app communicates with Electron main process via IPC:

- `discover-sessions` - List all JSONL files
- `format-sessions` - Format selected sessions
- `read-formatted-session` - Read formatted markdown

See `electron-main.js` for implementation.

## Integration with CLI Formatter

The app uses the existing CLI formatter at `.claude/scripts/format-sessions.mjs`:

```javascript
// electron-main.js
execSync(`node "${FORMATTER_SCRIPT}" ${fileArgs}`, {
  cwd: path.join(__dirname, '../..')
});
```

To update formatter logic, modify the CLI script directly.

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Electron Won't Start

```bash
# Clear Electron cache
rm -rf ~/Library/Application\ Support/Session\ Viewer/
```

### Build Fails

```bash
# Clean rebuild
rm -rf node_modules build dist
npm install
npm run build
```

## Environment Variables

Create `.env.local` if needed (not committed):

```bash
REACT_APP_SESSION_DIR=C:\Users\NewAdmin\.claude\projects\C--Users-NewAdmin-Desktop-PROJECTS-myBrain
REACT_APP_OUTPUT_DIR=C:\Users\NewAdmin\.claude\memory\formatted-sessions
```

## Release Process

1. Update version in `package.json`
2. Run `npm run build`
3. Test `.exe` in `dist/`
4. Commit and tag: `git tag v1.0.1`
5. Distribute `dist/Session Viewer Setup.exe` or `dist/Session Viewer.exe`

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [electron-builder](https://www.electron.build)
