import React from 'react';

function Settings({ darkMode, onToggleDarkMode }) {
  const sessionDir = 'C:\\Users\\NewAdmin\\.claude\\projects\\C--Users-NewAdmin-Desktop-PROJECTS-myBrain\\';
  const outputDir = 'C:\\Users\\NewAdmin\\.claude\\memory\\formatted-sessions\\';

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h2>⚙️ Settings</h2>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Dark Mode</div>
            <div style={{ fontSize: '0.85rem', color: '#999' }}>Toggle between light and dark theme</div>
          </div>
          <button
            className={`settings-toggle ${darkMode ? 'active' : ''}`}
            onClick={onToggleDarkMode}
          />
        </div>
      </div>

      <div className="settings-section">
        <h2>📁 Directories</h2>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Session Storage</div>
            <div className="settings-value">{sessionDir}</div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Formatted Output</div>
            <div className="settings-value">{outputDir}</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>ℹ️ About</h2>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Session Viewer</div>
            <div style={{ fontSize: '0.85rem', color: '#999' }}>v1.0.0</div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Description</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Beautiful desktop application for browsing, searching, and formatting Claude session history.
              Built with Electron + React.
            </div>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-label">
            <div style={{ fontWeight: '600' }}>Features</div>
            <ul style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', marginLeft: '1.5rem' }}>
              <li>Discover all JSONL session files</li>
              <li>Multi-select sessions for batch formatting</li>
              <li>Beautiful markdown viewer with syntax highlighting</li>
              <li>Search and filter capabilities</li>
              <li>Light and dark theme support</li>
              <li>Session navigation (previous/next)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
