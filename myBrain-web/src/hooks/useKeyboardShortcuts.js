import { useEffect, useCallback } from 'react';

/**
 * Custom hook for handling keyboard shortcuts in slide panels and modals
 * Provides common shortcuts like Escape to close and Ctrl+S to save
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the panel/modal is open
 * @param {Function} options.onClose - Called when Escape is pressed
 * @param {Function} options.onSave - Called when Ctrl+S/Cmd+S is pressed
 * @param {Function} options.onClearTimeout - Optional function to clear save timeout before manual save
 * @param {Object} options.customShortcuts - Additional custom shortcuts { key: handler }
 * @param {boolean} options.enableSave - Whether to enable save shortcut (default: true)
 * @param {boolean} options.enableClose - Whether to enable close shortcut (default: true)
 *
 * @example
 * // Basic usage
 * useKeyboardShortcuts({
 *   isOpen,
 *   onClose: closePanel,
 *   onSave: saveData,
 * });
 *
 * @example
 * // With timeout clearing and custom shortcuts
 * useKeyboardShortcuts({
 *   isOpen,
 *   onClose: closePanel,
 *   onSave: saveData,
 *   onClearTimeout: () => clearTimeout(saveTimeoutRef.current),
 *   customShortcuts: {
 *     'd': () => handleDelete(),
 *     'Enter': () => handleSubmit(),
 *   }
 * });
 */
export default function useKeyboardShortcuts({
  isOpen,
  onClose,
  onSave,
  onClearTimeout,
  customShortcuts = {},
  enableSave = true,
  enableClose = true,
}) {
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    // Escape to close
    if (enableClose && e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
      return;
    }

    // Ctrl+S or Cmd+S to save
    if (enableSave && (e.ctrlKey || e.metaKey) && e.key === 's' && onSave) {
      e.preventDefault();
      if (onClearTimeout) {
        onClearTimeout();
      }
      onSave();
      return;
    }

    // Custom shortcuts
    const handler = customShortcuts[e.key];
    if (handler) {
      // Check if the shortcut requires modifiers
      const shortcutDef = customShortcuts[e.key];
      if (typeof shortcutDef === 'function') {
        // Don't trigger custom shortcuts when typing in inputs (unless it's a modifier combo)
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
                        e.target.isContentEditable;
        if (isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
          return;
        }
        e.preventDefault();
        shortcutDef(e);
      }
    }
  }, [isOpen, onClose, onSave, onClearTimeout, customShortcuts, enableSave, enableClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for panel-specific keyboard shortcuts
 * Simplified version for slide panels with auto-save
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the panel is open
 * @param {Function} options.onClose - Close handler
 * @param {Function} options.onSave - Save handler
 * @param {Object} options.saveTimeoutRef - Ref to the save timeout
 */
export function usePanelShortcuts({ isOpen, onClose, onSave, saveTimeoutRef }) {
  useKeyboardShortcuts({
    isOpen,
    onClose,
    onSave,
    onClearTimeout: saveTimeoutRef?.current
      ? () => clearTimeout(saveTimeoutRef.current)
      : undefined,
  });
}

/**
 * Hook for modal keyboard shortcuts
 * Escape to close, Enter to confirm (optional)
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is open
 * @param {Function} options.onClose - Close handler
 * @param {Function} options.onConfirm - Optional confirm handler (triggered by Enter)
 * @param {boolean} options.enableEnterConfirm - Enable Enter to confirm (default: false)
 */
export function useModalShortcuts({ isOpen, onClose, onConfirm, enableEnterConfirm = false }) {
  useKeyboardShortcuts({
    isOpen,
    onClose,
    enableSave: false,
    customShortcuts: enableEnterConfirm && onConfirm ? {
      'Enter': (e) => {
        // Don't trigger Enter in textareas or when buttons are focused
        if (e.target.tagName === 'TEXTAREA') return;
        if (e.target.tagName === 'BUTTON') {
          // Let the button handle its own click
          return;
        }
        onConfirm();
      }
    } : {},
  });
}
