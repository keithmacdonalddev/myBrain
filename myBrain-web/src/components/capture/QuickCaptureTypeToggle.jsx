/**
 * =============================================================================
 * QUICKCAPTURETYPETOGGLE - Type Toggle Buttons for Quick Capture
 * =============================================================================
 *
 * Toggle buttons for switching between note and task capture types.
 * Uses the existing dash-capture-type CSS classes from dashboard.css.
 */

import { FileText, CheckSquare } from 'lucide-react';

/**
 * Type toggle buttons for quick capture
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current type ('note' or 'task')
 * @param {Function} props.onChange - Called with new type when selection changes
 * @param {boolean} props.disabled - Whether the buttons are disabled
 */
function QuickCaptureTypeToggle({ value, onChange, disabled = false }) {
  return (
    <>
      <button
        type="button"
        className={`dash-capture-type ${value === 'note' ? 'active' : ''}`}
        onClick={() => onChange('note')}
        disabled={disabled}
      >
        <FileText className="w-4 h-4" />
        Note
      </button>
      <button
        type="button"
        className={`dash-capture-type ${value === 'task' ? 'active' : ''}`}
        onClick={() => onChange('task')}
        disabled={disabled}
      >
        <CheckSquare className="w-4 h-4" />
        Task
      </button>
    </>
  );
}

export default QuickCaptureTypeToggle;
