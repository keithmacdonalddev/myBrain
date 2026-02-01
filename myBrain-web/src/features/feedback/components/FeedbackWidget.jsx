import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

/**
 * FeedbackWidget - Floating button for desktop feedback collection
 *
 * A floating action button positioned in the bottom-right corner (desktop only).
 * Opens a feedback modal when clicked. On mobile, feedback is accessed via the
 * sidebar menu item instead.
 *
 * Features:
 * - Desktop only (hidden on mobile via hidden sm:block)
 * - Fixed position: bottom-right with 24px margin
 * - z-index: 40 (below modals at z-50, above content)
 * - Semi-transparent when idle (opacity-60), full opacity on hover
 * - Subtle entrance animation
 * - Uses CSS variables for theming (legacy tokens)
 * - Tooltip on hover: "Report a bug or give feedback"
 *
 * @param {Function} onOpenFeedback - Callback when button is clicked to open feedback modal
 */
function FeedbackWidget({ onOpenFeedback }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (onOpenFeedback) {
      onOpenFeedback();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden sm:block fixed right-6 bottom-8 z-40 w-12 h-12 rounded-full transition-all duration-200 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95 group"
      style={{
        backgroundColor: `var(--primary)`,
        opacity: hovered ? 1 : 0.6,
        boxShadow: hovered ? 'var(--shadow-elevated)' : 'var(--shadow-md)',
      }}
      aria-label="Report a bug or give feedback"
      title="Report a bug or give feedback"
    >
      <MessageSquare className="w-5 h-5 text-white transition-transform duration-200" style={{ marginLeft: '1px' }} />

      {/* Tooltip on hover */}
      <div
        className="absolute bottom-full mb-2 px-3 py-2 rounded-lg text-xs font-medium text-white transition-opacity duration-200 pointer-events-none whitespace-nowrap"
        style={{
          backgroundColor: `rgba(var(--text-rgb, 0, 0, 0), 0.9)`,
          opacity: hovered ? 1 : 0,
        }}
      >
        Report a bug or give feedback
      </div>
    </button>
  );
}

export default FeedbackWidget;
