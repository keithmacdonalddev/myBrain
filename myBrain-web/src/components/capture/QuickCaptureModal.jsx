/**
 * =============================================================================
 * QUICKCAPTUREMODAL - Zero-friction Note Capture
 * =============================================================================
 *
 * A modal for quick note capture with smart parsing.
 *
 * Behavior:
 * - Opens with Ctrl+Shift+Space (handled by GlobalShortcuts)
 * - Single textarea for content
 * - Enter = Save to inbox (processed=false) and close
 * - Shift+Enter = New line
 * - Escape = Close without saving
 * - Does NOT open note panel after (zero friction)
 *
 * Uses shared useQuickCapture hook for state and mutations.
 */

import { useEffect, useRef } from 'react';
import { X, Loader2, Zap } from 'lucide-react';
import { useQuickCapture as useQuickCaptureContext } from '../../contexts/QuickCaptureContext';
import { useQuickCapture } from './hooks/useQuickCapture';
import QuickCaptureInput from './QuickCaptureInput';

function QuickCaptureModal() {
  // Context for modal open/close state
  const { isOpen, closeCapture } = useQuickCaptureContext();

  // Shared quick capture hook with smart parsing enabled
  const { content, setContent, isSubmitting, submit, reset, isValid } = useQuickCapture({
    defaultType: 'note',
    smartParsing: true,
    onSuccess: () => closeCapture(),
    autoReset: true,
    messages: {
      noteSuccess: 'Captured to Inbox',
      noteError: 'Failed to capture',
    },
  });

  // Refs for focus management
  const textareaRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus textarea when modal opens, restore focus when closed
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      // Focus textarea after a short delay (for animation)
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } else {
      // Restore focus to previous element
      previousActiveElement.current?.focus?.();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Reset content when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  // Handle save action
  const handleSave = async () => {
    try {
      await submit();
    } catch (err) {
      console.error('Quick capture failed:', err);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCapture();
      return;
    }

    // Enter to save (unless Shift is held for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeCapture}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h2 id="quick-capture-title" className="font-medium text-text">
              Quick Capture
            </h2>
          </div>
          <button
            onClick={closeCapture}
            className="p-2 hover:bg-bg rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <QuickCaptureInput
            ref={textareaRef}
            value={content}
            onChange={setContent}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            multiline={true}
            disabled={isSubmitting}
          />

          {/* Hints */}
          <div className="flex items-center justify-between mt-3 text-xs text-muted">
            <span>
              <kbd className="px-1.5 py-0.5 bg-bg border border-border rounded text-[10px]">Enter</kbd>
              {' '}to save
              <span className="mx-2">|</span>
              <kbd className="px-1.5 py-0.5 bg-bg border border-border rounded text-[10px]">Shift+Enter</kbd>
              {' '}new line
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-bg border border-border rounded text-[10px]">Esc</kbd>
              {' '}to close
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={closeCapture}
            className="px-4 py-2 text-sm text-muted hover:text-text transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Capture'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickCaptureModal;
