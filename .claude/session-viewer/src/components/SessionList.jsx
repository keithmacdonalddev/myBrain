import React, { useState } from 'react';

function SessionList({ sessions, loading, selectedSessions, onSelectSession, onSelectAll, onViewSession }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const filtered = sessions
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return b.mtime - a.mtime;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.size - a.size;
      return 0;
    });

  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString();
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div className="session-list">
      <div style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
        <input
          type="text"
          placeholder="🔍 Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {filtered.length} sessions • {selectedSessions.size} selected
          </span>
        </div>
      </div>

      <div className="session-list-header">
        <input
          type="checkbox"
          checked={selectedSessions.size === sessions.length && sessions.length > 0}
          onChange={(e) => onSelectAll(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <span>Title</span>
        <span>Date</span>
        <span>Size</span>
        <span>Status</span>
      </div>

      <div className="session-list-body">
        {filtered.map((session) => (
          <div key={session.uuid} className="session-item">
            <input
              type="checkbox"
              checked={selectedSessions.has(session.uuid)}
              onChange={(e) => onSelectSession(session.uuid, e.target.checked)}
              className="session-checkbox"
              style={{ cursor: 'pointer' }}
            />
            <div className="session-title" title={session.title}>
              {session.title || 'Untitled Session'}
            </div>
            <div className="session-date">{formatDate(session.mtime)}</div>
            <div className="session-size">{formatSize(session.size)}</div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <span className={`session-status ${session.formatted ? 'formatted' : 'unformatted'}`}>
                {session.formatted ? '✓ Formatted' : '○ Pending'}
              </span>
              {session.formatted && (
                <button
                  className="session-btn"
                  onClick={() => onViewSession(session.uuid)}
                  style={{ marginLeft: '0.5rem' }}
                >
                  View
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionList;
