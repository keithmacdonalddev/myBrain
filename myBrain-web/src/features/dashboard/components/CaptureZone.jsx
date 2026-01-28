/**
 * =============================================================================
 * CAPTUREZONE.JSX - Hero Capture Input
 * =============================================================================
 *
 * The primary capture zone at the top of the dashboard.
 * Following Second Brain principles: Capture must be FAST and frictionless.
 *
 * Features:
 * - Large, prominent text input for quick thought capture
 * - Action buttons to save as Note, Task, or Event
 * - Time-based greeting with user's name
 * - Weather widget positioned on the right
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FileText, CheckSquare, CalendarPlus, Keyboard } from 'lucide-react';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import WeatherWidget from '../../../components/ui/WeatherWidget';

/**
 * CaptureZone
 * -----------
 * Hero capture input with greeting and weather.
 *
 * @param {Function} onNewEvent - Callback when user wants to create an event
 */
export default function CaptureZone({ onNewEvent }) {
  const { user } = useSelector((state) => state.auth);
  const { openNewNote } = useNotePanel();
  const { openNewTask } = useTaskPanel();
  const [thought, setThought] = useState('');
  const [time, setTime] = useState(new Date());

  // Update time every minute for greeting
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name
  const firstName = user?.profile?.firstName
    || user?.profile?.displayName?.split(' ')[0]
    || 'there';

  // Handle capture actions
  const handleCapture = (type) => {
    const text = thought.trim();
    if (!text) return;

    // Clear input immediately for snappy feel
    setThought('');

    switch (type) {
      case 'note':
        openNewNote({ title: text });
        break;
      case 'task':
        openNewTask({ title: text });
        break;
      case 'event':
        onNewEvent?.({ title: text });
        break;
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (!thought.trim()) return;

    // Enter creates a note by default (following Second Brain - capture first)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCapture('note');
    }
  };

  return (
    <section className="capture-zone">
      <div className="capture-zone-content">
        {/* Greeting */}
        <h1 className="capture-zone-greeting">
          {getGreeting()}, <span className="text-primary">{firstName}</span>
        </h1>

        {/* Main capture input */}
        <div className="capture-zone-input-wrapper">
          <input
            type="text"
            className="capture-zone-input"
            placeholder="What's on your mind?"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>

        {/* Action buttons */}
        <div className="capture-zone-actions">
          <button
            className="capture-zone-btn capture-zone-btn-note"
            onClick={() => handleCapture('note')}
            disabled={!thought.trim()}
            title="Save as Note (Enter)"
          >
            <FileText className="w-4 h-4" />
            <span>Note</span>
          </button>
          <button
            className="capture-zone-btn capture-zone-btn-task"
            onClick={() => handleCapture('task')}
            disabled={!thought.trim()}
            title="Make it a Task"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Task</span>
          </button>
          <button
            className="capture-zone-btn capture-zone-btn-event"
            onClick={() => handleCapture('event')}
            disabled={!thought.trim()}
            title="Schedule Event"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Event</span>
          </button>

          {/* Keyboard hint */}
          <span className="capture-zone-hint">
            <Keyboard className="w-3 h-3" />
            <span>Press Enter for Note</span>
          </span>
        </div>
      </div>

      {/* Weather widget - compact version for dashboard */}
      <div className="capture-zone-weather">
        <WeatherWidget compact />
      </div>
    </section>
  );
}
