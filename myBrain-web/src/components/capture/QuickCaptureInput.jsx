/**
 * =============================================================================
 * QUICKCAPTUREINPUT - Shared Input Component for Quick Capture
 * =============================================================================
 *
 * A reusable input component that supports both single-line and multiline modes.
 * Used by QuickCaptureModal (multiline) and DashboardCards QuickCapture (single-line).
 */

import { forwardRef } from 'react';

/**
 * Quick capture input component
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Called with new value when input changes
 * @param {Function} props.onKeyDown - Called on keydown events
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.multiline - Whether to render as textarea (multiline) or input (single-line)
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.autoFocus - Whether to auto-focus the input
 * @param {string} props.className - Additional CSS classes
 */
const QuickCaptureInput = forwardRef(function QuickCaptureInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "What's on your mind?",
  multiline = false,
  disabled = false,
  autoFocus = false,
  className = '',
}, ref) {
  // Multiline uses a custom style, single-line uses the existing dash-capture-input class
  const baseClass = multiline
    ? 'w-full h-32 px-3 py-2 bg-bg border border-border rounded-xl text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50'
    : 'dash-capture-input';

  if (multiline) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${baseClass} ${className}`}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`${baseClass} ${className}`}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
});

export default QuickCaptureInput;
