const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionApi', {
  discoverSessions: () => ipcRenderer.invoke('discover-sessions'),
  formatSessions: (uuids) => ipcRenderer.invoke('format-sessions', uuids),
  readFormattedSession: (uuid) => ipcRenderer.invoke('read-formatted-session', uuid)
});
