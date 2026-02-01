import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

const SESSIONS_DIR = path.join(process.env.USERPROFILE || '/home/user', '.claude/projects/C--Users-NewAdmin-Desktop-PROJECTS-myBrain');
const OUTPUT_DIR = path.join(__dirname, '../../memory/formatted-sessions');
const FORMATTER_SCRIPT = path.join(__dirname, '../../scripts/format-sessions.mjs');

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for session discovery
ipcMain.handle('discover-sessions', async () => {
  try {
    const files = readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl') && !f.includes('/'))
      .map(filename => {
        const filepath = path.join(SESSIONS_DIR, filename);
        const stat = statSync(filepath);
        const uuid = filename.replace('.jsonl', '');

        // Check if formatted version exists
        const formattedPath = path.join(OUTPUT_DIR, `${uuid}.md`);
        let formattedExists = false;
        try {
          statSync(formattedPath);
          formattedExists = true;
        } catch (e) {}

        // Try to extract title from JSONL file
        let title = 'Unknown Session';
        try {
          const content = readFileSync(filepath, 'utf8').split('\n')[0];
          const obj = JSON.parse(content);
          if (obj.type === 'queue-operation') {
            // Skip queue operations, look for actual summary
            const lines = readFileSync(filepath, 'utf8').split('\n');
            for (const line of lines) {
              if (line.trim()) {
                const parsed = JSON.parse(line);
                if (parsed.summary) {
                  title = parsed.summary;
                  break;
                }
              }
            }
          } else if (obj.summary) {
            title = obj.summary;
          }
        } catch (e) {}

        return {
          uuid,
          filename,
          path: filepath,
          size: stat.size,
          mtime: stat.mtime.getTime(),
          formatted: formattedExists,
          title
        };
      });

    return files.sort((a, b) => b.mtime - a.mtime);
  } catch (error) {
    console.error('Error discovering sessions:', error);
    return [];
  }
});

// IPC Handler for formatting sessions
ipcMain.handle('format-sessions', async (event, uuids) => {
  try {
    const fileArgs = uuids.map(uuid => `--file ${uuid}`).join(' ');
    const command = `node "${FORMATTER_SCRIPT}" ${fileArgs}`;

    const result = execSync(command, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return {
      success: true,
      message: result,
      formatted: uuids
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});

// IPC Handler for reading formatted session
ipcMain.handle('read-formatted-session', async (event, uuid) => {
  try {
    const filepath = path.join(OUTPUT_DIR, `${uuid}.md`);
    const content = readFileSync(filepath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Create preload script
const preloadContent = `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionApi', {
  discoverSessions: () => ipcRenderer.invoke('discover-sessions'),
  formatSessions: (uuids) => ipcRenderer.invoke('format-sessions', uuids),
  readFormattedSession: (uuid) => ipcRenderer.invoke('read-formatted-session', uuid)
});
`;

const preloadPath = path.join(__dirname, 'preload.js');
try {
  writeFileSync(preloadPath, preloadContent);
} catch (e) {
  // File may already exist
}
