import { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { getTimeAgo } from '../../lib/dateUtils';

/**
 * Shared SaveStatus component for displaying auto-save status
 * Used across NoteSlidePanel, TaskSlidePanel, ProjectSlidePanel, FileDetailsPanel
 *
 * @param {string} status - Current save status: 'saved' | 'saving' | 'unsaved' | 'error'
 * @param {Date} lastSaved - Timestamp of last successful save
 * @param {string} className - Additional CSS classes
 */
export default function SaveStatus({ status, lastSaved, className = '' }) {
  const [showFlash, setShowFlash] = useState(false);
  const prevStatusRef = useRef(status);

  // Flash effect when transitioning from saving to saved
  useEffect(() => {
    if (prevStatusRef.current === 'saving' && status === 'saved') {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(lastSaved));

  useEffect(() => {
    if (status === 'saved' && lastSaved) {
      const interval = setInterval(() => {
        setTimeAgo(getTimeAgo(lastSaved));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, lastSaved]);

  useEffect(() => {
    setTimeAgo(getTimeAgo(lastSaved));
  }, [lastSaved]);

  // Background styles using CSS variables
  const getBgStyle = () => {
    if (showFlash) {
      return { backgroundColor: 'var(--success-glow)' };
    }
    if (status === 'error') {
      return { backgroundColor: 'var(--danger-glow)' };
    }
    return {};
  };

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-300 ${className}`}
      style={getBgStyle()}
    >
      {status === 'saving' && (
        <>
          <Cloud className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--primary)' }} />
          <span style={{ color: 'var(--primary)' }}>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Cloud
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showFlash ? 'scale-110' : ''}`}
            style={{ color: 'var(--success)' }}
          />
          <span style={{ color: 'var(--success)' }}>Saved {timeAgo}</span>
        </>
      )}
      {status === 'unsaved' && (
        <>
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--warning)' }}
          />
          <span style={{ color: 'var(--warning)' }}>Unsaved changes</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)' }}>Save failed</span>
        </>
      )}
    </div>
  );
}

// Re-export getTimeAgo for backward compatibility with any components still importing from here
export { getTimeAgo } from '../../lib/dateUtils';
