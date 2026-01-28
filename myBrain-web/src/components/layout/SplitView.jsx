import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * SplitView - Two-panel resizable layout
 *
 * @param {React.ReactNode} left - Left panel content
 * @param {React.ReactNode} right - Right panel content
 * @param {number} defaultLeftWidth - Default left panel width in px (default: 320)
 * @param {number} minLeftWidth - Minimum left width (default: 240)
 * @param {number} maxLeftWidth - Maximum left width (default: 480)
 * @param {React.ReactNode} emptyState - Shown in right panel when no content
 * @param {boolean} showLeft - Whether to show left panel on mobile (for navigation)
 * @param {Function} onToggleLeft - Called to toggle left panel visibility on mobile
 */
export default function SplitView({
  left,
  right,
  defaultLeftWidth = 320,
  minLeftWidth = 240,
  maxLeftWidth = 480,
  emptyState,
  showLeft = true,
  // eslint-disable-next-line no-unused-vars
  onToggleLeft,
}) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.min(maxLeftWidth, Math.max(minLeftWidth, startWidth.current + diff));
    setLeftWidth(newWidth);
  }, [minLeftWidth, maxLeftWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel - desktop always visible, mobile conditional */}
      <div
        className={`flex-shrink-0 border-r border-border overflow-y-auto bg-bg
          hidden md:block`}
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      {/* Mobile left panel */}
      {showLeft && (
        <div className="md:hidden flex-1 overflow-y-auto bg-bg">
          {left}
        </div>
      )}

      {/* Resize handle - desktop only */}
      <div
        className="hidden md:flex w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors items-center justify-center group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-8 bg-border rounded-full group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Right panel - desktop always visible, mobile conditional */}
      <div className="hidden md:flex flex-1 overflow-y-auto bg-bg min-w-0">
        {right || emptyState || (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            Select an item to view
          </div>
        )}
      </div>

      {/* Mobile right panel */}
      {!showLeft && (
        <div className="md:hidden flex-1 overflow-y-auto bg-bg">
          {right}
        </div>
      )}
    </div>
  );
}
