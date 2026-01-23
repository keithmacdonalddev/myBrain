import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TooltipsContext from '../../contexts/TooltipsContext';

/**
 * Tooltip component with configurable position and delay
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The trigger element
 * @param {string} props.content - Tooltip text content
 * @param {string} props.position - Position: 'top' | 'bottom' | 'left' | 'right'
 * @param {number} props.delay - Show delay in ms (default: 300)
 * @param {boolean} props.disabled - Whether tooltip is disabled
 * @param {boolean} props.ignoreGlobalSetting - If true, always show tooltip regardless of global setting
 */
function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  disabled = false,
  ignoreGlobalSetting = false
}) {
  // Get global tooltip setting from context (may be null if outside provider)
  const tooltipsContext = useContext(TooltipsContext);
  const globalEnabled = tooltipsContext?.tooltipsEnabled ?? true;

  // Check if tooltip should be disabled (respects global setting unless ignoreGlobalSetting is true)
  const isDisabled = disabled || (!ignoreGlobalSetting && !globalEnabled);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const isHoveringRef = useRef(false);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isHoveringRef.current = false;
    setIsVisible(false);
  }, []);

  const showTooltip = useCallback(() => {
    if (isDisabled || !content) return;

    isHoveringRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Only show if still hovering
      if (isHoveringRef.current) {
        setIsVisible(true);
      }
    }, delay);
  }, [isDisabled, content, delay]);

  // Calculate position when visible
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top, left;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + 8;
          break;
        default:
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      }

      // Keep tooltip within viewport
      const padding = 8;
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  // Hide tooltip on scroll, resize, or click anywhere
  useEffect(() => {
    if (!isVisible) return;

    const handleHide = () => {
      hideTooltip();
    };

    // Hide on scroll (any scrollable parent)
    window.addEventListener('scroll', handleHide, true);
    window.addEventListener('resize', handleHide);
    window.addEventListener('click', handleHide);

    return () => {
      window.removeEventListener('scroll', handleHide, true);
      window.removeEventListener('resize', handleHide);
      window.removeEventListener('click', handleHide);
    };
  }, [isVisible, hideTooltip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isHoveringRef.current = false;
    };
  }, []);

  // Hide when disabled changes
  useEffect(() => {
    if (isDisabled) {
      hideTooltip();
    }
  }, [isDisabled, hideTooltip]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && content && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 99999,
          }}
          className="px-2.5 py-1.5 text-xs font-medium text-text bg-panel glass rounded-md shadow-lg animate-fade-in pointer-events-none max-w-[250px] text-center"
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-panel tooltip-arrow transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
}

export default Tooltip;
