/**
 * RadarBlip - Individual item rendered on the RadarView radar display
 *
 * A presentation component that renders a single blip (task, event, or note)
 * on the radar. Receives all positioning from the parent RadarView component.
 *
 * Features:
 * - SVG circle element with type-based coloring
 * - Native tooltip showing item title on hover
 * - Optional pulse animation for high-priority items
 * - Click handler to open item details
 */

import { useMemo } from 'react';

/**
 * Type-to-CSS class mapping for blip colors
 * Colors are defined in dashboard-v2.css
 */
const TYPE_CLASSES = {
  task: 'v2-radar-blip--task',
  event: 'v2-radar-blip--event',
  note: 'v2-radar-blip--note',
};

/**
 * RadarBlip Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.item - The task/event/note object containing at least { _id, title }
 * @param {'task'|'event'|'note'} props.type - Item type, determines blip color
 * @param {number} props.x - X position as percentage (0-100)
 * @param {number} props.y - Y position as percentage (0-100)
 * @param {number} props.size - Radius of the blip in pixels (8-16px recommended)
 * @param {Function} props.onClick - Called with item when blip is clicked
 */
function RadarBlip({ item, type, x, y, size, onClick }) {
  /**
   * Determine if this item should have the pulse animation
   * High-priority tasks and items marked as urgent get the animation
   */
  const isUrgent = useMemo(() => {
    // Tasks with high priority get pulse animation
    if (type === 'task' && item.priority === 'high') {
      return true;
    }
    // Events starting within the next hour could be considered urgent
    if (type === 'event' && item.startTime) {
      const now = new Date();
      const eventTime = new Date(item.startTime);
      const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      return eventTime >= now && eventTime <= hourFromNow;
    }
    return false;
  }, [type, item]);

  /**
   * Build the CSS class string based on type and urgency
   */
  const className = useMemo(() => {
    const classes = ['v2-radar-blip'];

    // Add type-specific class for coloring
    if (TYPE_CLASSES[type]) {
      classes.push(TYPE_CLASSES[type]);
    }

    // Add pulse animation for urgent items
    if (isUrgent) {
      classes.push('v2-radar-blip--urgent');
    }

    return classes.join(' ');
  }, [type, isUrgent]);

  /**
   * Handle click - calls parent onClick with the item
   */
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(item);
    }
  };

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <circle
      className={className}
      cx={`${x}%`}
      cy={`${y}%`}
      r={size}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${type}: ${item.title || 'Untitled'}`}
    >
      {/* Native SVG tooltip - shows item title on hover */}
      <title>{item.title || 'Untitled'}</title>
    </circle>
  );
}

export default RadarBlip;
