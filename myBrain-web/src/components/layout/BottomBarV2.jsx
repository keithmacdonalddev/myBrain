/**
 * BottomBarV2 - Reusable keyboard shortcuts bar component
 *
 * Fixed to bottom of viewport, positioned to the right of the sidebar.
 * Shows quick keyboard shortcuts for common actions.
 *
 * Features:
 * - Glassmorphism effect (blur + transparency)
 * - Keyboard shortcuts that only trigger when not typing
 * - Responsive: hides labels on mobile, shows only keys
 * - Customizable via props
 *
 * Default shortcuts:
 * - N: New Task
 * - E: New Event
 * - R: Toggle Radar
 * - ?: Help
 *
 * Usage:
 *   <BottomBarV2
 *     sidebarWidth={260}
 *     onCustomize={() => navigate('/app/settings')}
 *   />
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { useQuickCapture } from '../../contexts/QuickCaptureContext';
import EventModal from '../../features/calendar/components/EventModal';
import './BottomBarV2.css';

/**
 * BottomBarV2 Component
 *
 * @param {Object} props
 * @param {number} [props.sidebarWidth=260] - Width of sidebar in pixels (used for positioning)
 * @param {Function} [props.onCustomize] - Handler for customize button click
 * @param {boolean} [props.showRadar=false] - Whether radar shortcut is enabled
 * @param {Function} [props.onToggleRadar] - Handler for radar toggle
 * @param {Function} [props.onOpenHelp] - Handler for help shortcut
 */
function BottomBarV2({
  sidebarWidth = 260,
  onCustomize,
  showRadar = false,
  onToggleRadar,
  onOpenHelp
}) {
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
   * Only single-key shortcuts when not typing
   * Modifier combos (Cmd+K) work even while typing
   */
  const handleKeyDown = useCallback((e) => {
    const typing = isTyping();

    // Cmd/Ctrl+K - Command palette (works even while typing)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCapture();
      return;
    }

    // Skip other shortcuts if typing
    if (typing) return;

    // Get uppercase key for consistent matching
    const key = e.key.toUpperCase();

    // N - New Task (changed from T to match prototype spec)
    if (key === 'N') {
      e.preventDefault();
      openNewTask();
      return;
    }

    // E - New Event
    if (key === 'E') {
      e.preventDefault();
      setShowEventModal(true);
      return;
    }

    // R - Toggle Radar (if enabled)
    if (key === 'R' && onToggleRadar) {
      e.preventDefault();
      onToggleRadar();
      return;
    }

    // ? - Help (Shift+/ on US keyboards)
    if (e.key === '?' && onOpenHelp) {
      e.preventDefault();
      onOpenHelp();
      return;
    }
  }, [isTyping, openNewTask, openCapture, onToggleRadar, onOpenHelp]);

  // Register global keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click handlers for shortcut buttons
  const handleNewTask = () => openNewTask();
  const handleNewEvent = () => setShowEventModal(true);
  const handleRadar = () => onToggleRadar?.();
  const handleHelp = () => onOpenHelp?.();
  const handleCustomizeClick = () => {
    if (onCustomize) {
      onCustomize();
    } else {
      navigate('/app/settings');
    }
  };

  // Build shortcuts array based on props
  const shortcuts = [
    { key: 'N', label: 'New Task', action: handleNewTask },
    { key: 'E', label: 'New Event', action: handleNewEvent },
  ];

  // Conditionally add radar shortcut
  if (showRadar && onToggleRadar) {
    shortcuts.push({ key: 'R', label: 'Toggle Radar', action: handleRadar });
  }

  // Conditionally add help shortcut
  if (onOpenHelp) {
    shortcuts.push({ key: '?', label: 'Help', action: handleHelp });
  }

  return (
    <>
      <div
        className="bottom-bar-v2"
        style={{ left: `${sidebarWidth}px` }}
        role="toolbar"
        aria-label="Keyboard shortcuts"
      >
        {/* Keyboard shortcuts */}
        <div className="quick-keys">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.key}
              type="button"
              className="quick-key"
              onClick={shortcut.action}
              title={`Press ${shortcut.key} for ${shortcut.label}`}
            >
              <span className="key-badge">{shortcut.key}</span>
              <span>{shortcut.label}</span>
            </button>
          ))}
        </div>

        {/* Customize button */}
        <button
          type="button"
          className="customize-btn"
          onClick={handleCustomizeClick}
          title="Customize dashboard"
        >
          <Settings size={16} />
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
