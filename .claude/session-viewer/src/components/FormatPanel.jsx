import React from 'react';

function FormatPanel({ selectedCount, onFormat, formatting }) {
  return (
    <div className="format-panel">
      <div className="format-info">
        <div className="format-count">
          {selectedCount === 0 ? '🎯 Select sessions to format' : `📋 ${selectedCount} session${selectedCount !== 1 ? 's' : ''} selected`}
        </div>
        {formatting && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            Formatting in progress...
          </div>
        )}
      </div>
      <button
        className="format-btn"
        onClick={onFormat}
        disabled={selectedCount === 0 || formatting}
      >
        {formatting && <span className="format-spinner"></span>}
        {formatting ? 'Formatting...' : 'Format Selected'}
      </button>
    </div>
  );
}

export default FormatPanel;
