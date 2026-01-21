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

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-300 ${
      showFlash ? 'bg-green-500/10' : ''
    } ${status === 'error' ? 'bg-red-500/10' : ''} ${className}`}>
      {status === 'saving' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span className="text-blue-500">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Cloud className={`w-3.5 h-3.5 text-green-500 transition-transform duration-200 ${showFlash ? 'scale-110' : ''}`} />
          <span className="text-green-600">Saved {timeAgo}</span>
        </>
      )}
      {status === 'unsaved' && (
        <>
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-yellow-600">Unsaved changes</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      )}
    </div>
  );
}

// Re-export getTimeAgo for backward compatibility with any components still importing from here
export { getTimeAgo } from '../../lib/dateUtils';
