import { useEffect } from 'react';

/**
 * GlobalShortcuts - Listens for global keyboard shortcuts
 *
 * Currently supports:
 * - Ctrl+Shift+Space (or Cmd+Shift+Space on Mac) - Open quick capture
 * - Ctrl+Shift+F (or Cmd+Shift+F on Mac) - Open feedback modal
 *
 * Note: We use Space instead of N because Ctrl+Shift+N is the browser's
 * "New Incognito Window" shortcut on Chrome/Edge.
 * F is chosen for feedback to avoid conflicts with browser shortcuts.
 */
function GlobalShortcuts({ onQuickCapture, onOpenFeedback }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isEditable = activeElement?.isContentEditable;
      const isInput = tagName === 'input' || tagName === 'textarea' || isEditable;

      // Allow shortcut even in inputs if Ctrl+Shift is held (intentional action)
      // But for safety, we'll only allow it in non-input contexts
      if (isInput) {
        return; // Don't capture while typing
      }

      // Ctrl+Shift+Space (or Cmd+Shift+Space on Mac) for quick capture
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') {
        e.preventDefault();
        onQuickCapture();
        return;
      }

      // Ctrl+Shift+F (or Cmd+Shift+F on Mac) for feedback
      // Use toLowerCase() for consistent key matching across browsers
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (onOpenFeedback) {
          onOpenFeedback();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickCapture, onOpenFeedback]);

  // This component doesn't render anything
  return null;
}

export default GlobalShortcuts;
