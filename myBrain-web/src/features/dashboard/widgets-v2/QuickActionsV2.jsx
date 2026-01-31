/**
 * QuickActionsV2 - Quick action buttons for V2 dashboard
 *
 * Provides one-click access to common actions:
 * - New Task: Opens task slide panel
 * - New Note: Opens note slide panel
 * - New Event: Navigates to calendar new event page
 * - Quick Capture: Opens quick capture modal
 */

import { useNavigate } from 'react-router-dom';
import { PlusSquare, FilePlus, CalendarPlus, Zap } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useQuickCapture } from '../../../contexts/QuickCaptureContext';

/**
 * QuickActionsV2 Component
 *
 * Displays a row of quick action buttons for common tasks.
 * Each button triggers its respective action (open panel, navigate, etc.)
 */
function QuickActionsV2() {
  // Navigation hook for routing to new event page
  const navigate = useNavigate();

  // Panel contexts for opening task and note panels
  const { openNewTask } = useTaskPanel();
  const { openNewNote } = useNotePanel();

  // Quick capture context for opening the capture modal
  const { openCapture } = useQuickCapture();

  /**
   * Handle new task action - opens task slide panel
   */
  const handleNewTask = () => {
    openNewTask();
  };

  /**
   * Handle new note action - opens note slide panel
   */
  const handleNewNote = () => {
    openNewNote();
  };

  /**
   * Handle new event action - navigates to calendar new event page
   */
  const handleNewEvent = () => {
    navigate('/calendar/new');
  };

  /**
   * Handle quick capture action - opens quick capture modal
   */
  const handleQuickCapture = () => {
    openCapture();
  };

  return (
    <div className="v2-quick-actions">
      {/* New Task Button */}
      <button
        type="button"
        className="v2-quick-action"
        onClick={handleNewTask}
        aria-label="Create new task"
      >
        <PlusSquare className="v2-icon" />
        <span>New Task</span>
      </button>

      {/* New Note Button */}
      <button
        type="button"
        className="v2-quick-action"
        onClick={handleNewNote}
        aria-label="Create new note"
      >
        <FilePlus className="v2-icon" />
        <span>New Note</span>
      </button>

      {/* New Event Button */}
      <button
        type="button"
        className="v2-quick-action"
        onClick={handleNewEvent}
        aria-label="Create new event"
      >
        <CalendarPlus className="v2-icon" />
        <span>New Event</span>
      </button>

      {/* Quick Capture Button */}
      <button
        type="button"
        className="v2-quick-action"
        onClick={handleQuickCapture}
        aria-label="Open quick capture"
      >
        <Zap className="v2-icon" />
        <span>Quick Capture</span>
      </button>
    </div>
  );
}

export default QuickActionsV2;
