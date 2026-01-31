/**
 * BottomBarV2 - Keyboard shortcuts bar for dashboard
 *
 * Fixed to bottom of main content area.
 * Shows quick keyboard shortcuts for common actions:
 * - T: New Task
 * - N: New Note
 * - E: New Event
 * - Cmd/Ctrl+K: Command palette (opens quick capture)
 *
 * Shortcuts only trigger when not typing in an input field.
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useQuickCapture } from '../../../contexts/QuickCaptureContext';
import EventModal from '../../calendar/components/EventModal';

function BottomBarV2() {
  const navigate = useNavigate();
  const { openNewTask } = useTaskPanel();
  const { openNewNote } = useNotePanel();
  const { openCapture } = useQuickCapture();

  // Local state for event modal since events don't have a global context
  const [showEventModal, setShowEventModal] = useState(false);

  /**
   * Check if the user is currently typing in an input field
   * Returns true if we should ignore keyboard shortcuts
   */
  const isTyping = useCallback(() => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    const isEditable = activeElement?.isContentEditable;
    return tagName === 'input' || tagName === 'textarea' || isEditable;
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e) => {
    // Skip if user is typing (unless it's a modifier combo like Cmd+K)
    const typing = isTyping();

    // Cmd/Ctrl+K - Command palette (works even while typing)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCapture();
      return;
    }

    // Skip other shortcuts if typing
    if (typing) return;

    // T - New Task
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      openNewTask();
      return;
    }

    // N - New Note
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openNewNote();
      return;
    }

    // E - New Event
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      setShowEventModal(true);
      return;
    }
  }, [isTyping, openNewTask, openNewNote, openCapture]);

  // Register global keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle click on shortcut items (for users who prefer clicking)
  const handleNewTask = () => openNewTask();
  const handleNewNote = () => openNewNote();
  const handleNewEvent = () => setShowEventModal(true);
  const handleCommand = () => openCapture();
  const handleCustomize = () => navigate('/app/settings');

  // Detect Mac for showing correct modifier key
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl+';

  return (
    <>
      <div className="v2-bottom-bar">
        {/* Keyboard shortcuts */}
        <div className="v2-shortcuts">
          <button
            type="button"
            className="v2-shortcut-item"
            onClick={handleNewTask}
            title="Press T to create a new task"
          >
            <kbd>T</kbd>
            <span>New Task</span>
          </button>

          <button
            type="button"
            className="v2-shortcut-item"
            onClick={handleNewNote}
            title="Press N to create a new note"
          >
            <kbd>N</kbd>
            <span>New Note</span>
          </button>

          <button
            type="button"
            className="v2-shortcut-item"
            onClick={handleNewEvent}
            title="Press E to create a new event"
          >
            <kbd>E</kbd>
            <span>New Event</span>
          </button>

          <button
            type="button"
            className="v2-shortcut-item"
            onClick={handleCommand}
            title={`Press ${isMac ? '⌘' : 'Ctrl+'}K to open command palette`}
          >
            <kbd>{modKey}K</kbd>
            <span>Command</span>
          </button>
        </div>

        {/* Customize button */}
        <button
          type="button"
          className="v2-customize-btn"
          onClick={handleCustomize}
          title="Customize dashboard"
        >
          <Settings className="v2-icon" />
          <span>Customize</span>
        </button>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={null}
          initialDate={new Date()}
          onClose={() => setShowEventModal(false)}
          onCreated={() => setShowEventModal(false)}
        />
      )}
    </>
  );
}

export default BottomBarV2;
