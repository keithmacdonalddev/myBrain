import React, { useState, useEffect } from 'react';
import './App.css';
import SessionList from './components/SessionList';
import SessionViewer from './components/SessionViewer';
import FormatPanel from './components/FormatPanel';
import Settings from './components/Settings';

function App() {
  const [tab, setTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [viewingSession, setViewingSession] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formatting, setFormatting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessions = await window.sessionApi.discoverSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
    setLoading(false);
  };

  const handleSelectSession = (uuid, selected) => {
    const newSelected = new Set(selectedSessions);
    if (selected) {
      newSelected.add(uuid);
    } else {
      newSelected.delete(uuid);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedSessions(new Set(sessions.map(s => s.uuid)));
    } else {
      setSelectedSessions(new Set());
    }
  };

  const handleFormat = async () => {
    if (selectedSessions.size === 0) return;

    setFormatting(true);
    try {
      await window.sessionApi.formatSessions(Array.from(selectedSessions));
      // Reload sessions to update formatted status
      await loadSessions();
      setSelectedSessions(new Set());
    } catch (error) {
      console.error('Error formatting sessions:', error);
    }
    setFormatting(false);
  };

  const handleViewSession = async (uuid) => {
    try {
      const result = await window.sessionApi.readFormattedSession(uuid);
      if (result.success) {
        setViewingSession({ uuid, content: result.content });
        setTab('viewer');
      }
    } catch (error) {
      console.error('Error reading session:', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 Session Viewer</h1>
        <nav className="tabs">
          <button
            className={`tab ${tab === 'sessions' ? 'active' : ''}`}
            onClick={() => setTab('sessions')}
          >
            Sessions
          </button>
          <button
            className={`tab ${tab === 'viewer' ? 'active' : ''}`}
            onClick={() => setTab('viewer')}
            disabled={!viewingSession}
          >
            Viewer
          </button>
          <button
            className={`tab ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'sessions' && (
          <div className="sessions-tab">
            <FormatPanel
              selectedCount={selectedSessions.size}
              onFormat={handleFormat}
              formatting={formatting}
            />
            <SessionList
              sessions={sessions}
              loading={loading}
              selectedSessions={selectedSessions}
              onSelectSession={handleSelectSession}
              onSelectAll={handleSelectAll}
              onViewSession={handleViewSession}
            />
          </div>
        )}

        {tab === 'viewer' && viewingSession && (
          <SessionViewer
            session={viewingSession}
            allSessions={sessions.filter(s => s.formatted)}
            onNavigate={(uuid) => handleViewSession(uuid)}
          />
        )}

        {tab === 'settings' && (
          <Settings darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        )}
      </main>
    </div>
  );
}

export default App;
