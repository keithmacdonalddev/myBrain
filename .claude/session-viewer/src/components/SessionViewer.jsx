import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function SessionViewer({ session, allSessions, onNavigate }) {
  const [search, setSearch] = useState('');

  const currentIndex = allSessions.findIndex(s => s.uuid === session.uuid);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allSessions.length - 1;

  const handlePrevious = () => {
    if (canGoPrev) {
      onNavigate(allSessions[currentIndex - 1].uuid);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(allSessions[currentIndex + 1].uuid);
    }
  };

  // Extract title from first heading
  const titleMatch = session.content.match(/^# (.+?)$/m);
  const title = titleMatch ? titleMatch[1] : 'Session';

  let displayContent = session.content;
  if (search.trim()) {
    const regex = new RegExp(`(${search})`, 'gi');
    displayContent = session.content.replace(regex, '**$1**');
  }

  return (
    <div className="session-viewer">
      <div className="viewer-header">
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>{title}</h2>
          {search && (
            <input
              type="text"
              placeholder="🔍 Search within session..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '250px',
                marginTop: '0.5rem'
              }}
            />
          )}
          {!search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '0.9rem',
                marginTop: '0.5rem'
              }}
              onMouseEnter={() => setSearch('start-search')}
            >
              🔍 Search within this session
            </button>
          )}
        </div>
        <div className="viewer-nav">
          <button
            className="nav-btn"
            onClick={handlePrevious}
            disabled={!canGoPrev}
          >
            ← Previous
          </button>
          <span style={{ padding: '0.5rem 1rem', color: '#666' }}>
            {currentIndex + 1} / {allSessions.length}
          </span>
          <button
            className="nav-btn"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <pre>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default SessionViewer;
