import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * ContextMenu - Right-click (and long-press) context menu rendered via portal
 *
 * @param {Array} items - Array of { label, icon?, onClick, variant?, divider? }
 *   variant: "danger" for destructive actions
 *   divider: true to show a divider before this item
 * @param {React.ReactNode} children - Element to attach context menu to
 * @param {boolean} disabled - Disable the context menu
 */
export default function ContextMenu({ items, children, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  const longPressTimer = useRef(null);
  const containerRef = useRef(null);

  const openMenu = useCallback((x, y) => {
    // Clamp to viewport
    const menuWidth = 192;
    const menuHeight = items.length * 40;
    const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
    const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);
    setPosition({ x: Math.max(8, clampedX), y: Math.max(8, clampedY) });
    setIsOpen(true);
  }, [items.length]);

  const handleContextMenu = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  }, [disabled, openMenu]);

  // Long press for mobile
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      openMenu(touch.clientX, touch.clientY);
    }, 500);
  }, [disabled, openMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Close on click outside or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClose = () => setIsOpen(false);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {children}
      </div>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-panel glass border border-border rounded-xl shadow-theme-floating py-1 animate-scale-in"
          style={{ left: position.x, top: position.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => {
            if (!item) return null;
            const Icon = item.icon;
            return (
              <div key={index}>
                {item.divider && (
                  <div className="my-1 border-t border-border" />
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick?.();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    item.variant === 'danger'
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-text hover:bg-bg'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
