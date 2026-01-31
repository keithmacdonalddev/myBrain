/**
 * RadarView - Full-screen radar overlay showing tasks, events, and notes as blips
 *
 * This component displays a radar visualization where items are positioned
 * based on their urgency/time:
 * - Innermost ring: Items due within 1 hour (NOW)
 * - Middle ring: Items due today (SOON)
 * - Outer ring: Items due this week (LATER)
 *
 * Blip colors by type:
 * - Tasks = blue circles
 * - Events = green circles
 * - Notes/Inbox = orange circles
 *
 * Blip size indicates priority (larger = more urgent)
 */

import { useMemo } from 'react';
import { X } from 'lucide-react';

/**
 * Blip color configuration by item type
 * Uses CSS variable references that work in SVG fill attributes
 * These map to the v2 design system colors defined in theme.css
 */
const BLIP_COLORS = {
  task: 'var(--v2-accent-primary)',       // Blue - uses accent color
  event: 'var(--v2-status-success)',      // Green - uses success color
  note: 'var(--v2-status-warning)',       // Orange - uses warning color
  inbox: 'var(--v2-status-warning)',      // Orange (same as notes)
};

/**
 * Ring configuration
 * - ring 1 (NOW): 20% from center - items due within 1 hour
 * - ring 2 (SOON): 45% from center - items due today
 * - ring 3 (LATER): 70% from center - items due this week
 */
const RINGS = [
  { id: 'now', label: 'NOW', radius: 0.2 },
  { id: 'soon', label: 'SOON', radius: 0.45 },
  { id: 'later', label: 'LATER', radius: 0.7 },
];

/**
 * Determine which ring an item belongs to based on due date
 *
 * @param {Date|string} dueDate - The item's due date
 * @returns {number} Ring number (1=NOW, 2=SOON, 3=LATER)
 */
function getRingForDueDate(dueDate) {
  if (!dueDate) return 3; // No due date = outer ring

  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntil = (due - now) / (1000 * 60 * 60);

  if (hoursUntil <= 1) return 1;  // NOW - within 1 hour
  if (hoursUntil <= 24) return 2; // SOON - within today
  return 3;                        // LATER - this week
}

/**
 * Calculate x,y position for a blip based on ring and angle
 *
 * @param {number} ring - Ring number (1, 2, or 3)
 * @param {number} angle - Angle in degrees (0-360)
 * @param {number} viewBoxSize - SVG viewBox size
 * @returns {{ x: number, y: number }} Coordinates
 */
function calculateBlipPosition(ring, angle, viewBoxSize) {
  const center = viewBoxSize / 2;
  const maxRadius = center * 0.85; // Leave some padding
  const ringConfig = RINGS[ring - 1] || RINGS[2];
  const radius = maxRadius * ringConfig.radius;

  // Convert angle to radians (0 degrees = right, going counter-clockwise)
  const radians = (angle * Math.PI) / 180;

  return {
    x: center + radius * Math.cos(radians),
    y: center - radius * Math.sin(radians), // Negative because SVG y increases downward
  };
}

/**
 * Transform items into radar blips with positions
 *
 * @param {Array} items - Array of items
 * @param {string} type - Item type ('task', 'event', 'note', 'inbox')
 * @param {number} viewBoxSize - SVG viewBox size
 * @returns {Array} Array of blip objects with position data
 */
function transformItemsToBlips(items, type, viewBoxSize) {
  if (!items || items.length === 0) return [];

  return items.map((item, index) => {
    // Get due date field (tasks have dueDate, events have startDate)
    const dueDate = item.dueDate || item.startDate || item.createdAt;
    const ring = getRingForDueDate(dueDate);

    // Distribute items evenly within a sector based on type
    // Tasks: 0-90 degrees (top-right)
    // Events: 90-180 degrees (top-left)
    // Notes/Inbox: 180-270 degrees (bottom-left) + 270-360 (bottom-right)
    let sectorStart, sectorEnd;
    switch (type) {
      case 'task':
        sectorStart = 0;
        sectorEnd = 90;
        break;
      case 'event':
        sectorStart = 90;
        sectorEnd = 180;
        break;
      case 'note':
        sectorStart = 180;
        sectorEnd = 270;
        break;
      case 'inbox':
        sectorStart = 270;
        sectorEnd = 360;
        break;
      default:
        sectorStart = 0;
        sectorEnd = 360;
    }

    // Calculate angle within sector
    const sectorRange = sectorEnd - sectorStart;
    const angle =
      items.length === 1
        ? sectorStart + sectorRange / 2 // Center if single item
        : sectorStart + 10 + ((sectorRange - 20) * index) / (items.length - 1); // Distribute with padding

    const position = calculateBlipPosition(ring, angle, viewBoxSize);

    // Determine size based on priority
    let size = 8; // Default size
    if (item.priority === 'high' || ring === 1) {
      size = 12; // Larger for urgent items
    } else if (item.priority === 'low') {
      size = 6; // Smaller for low priority
    }

    return {
      id: item._id || `${type}-${index}`,
      type,
      title: item.title || item.name || 'Untitled',
      x: position.x,
      y: position.y,
      size,
      ring,
      urgent: ring === 1 || item.priority === 'high',
      originalItem: item,
    };
  });
}

/**
 * RadarView Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the radar overlay is visible
 * @param {function} props.onClose - Callback when user closes the radar
 * @param {Array} props.tasks - Array of task objects
 * @param {Array} props.events - Array of event objects
 * @param {Array} props.inbox - Array of inbox/note items
 */
function RadarView({ isOpen, onClose, tasks = [], events = [], inbox = [] }) {
  // Don't render anything if not open
  if (!isOpen) return null;

  // SVG viewBox size (square)
  const viewBoxSize = 400;
  const center = viewBoxSize / 2;

  // Transform all items into positioned blips
  const blips = useMemo(() => {
    return [
      ...transformItemsToBlips(tasks, 'task', viewBoxSize),
      ...transformItemsToBlips(events, 'event', viewBoxSize),
      ...transformItemsToBlips(inbox, 'inbox', viewBoxSize),
    ];
  }, [tasks, events, inbox]);

  /**
   * Handle blip click - shows tooltip with item details
   * Future: Could open the item's slide panel
   */
  const handleBlipClick = (blip) => {
    // For now, just a placeholder - can be extended to open panels
    // TODO: Implement panel opening based on blip.type
  };

  return (
    <div className="v2-radar-overlay" role="dialog" aria-modal="true" aria-label="Radar view">
      {/* Close button */}
      <button
        className="v2-radar-close"
        onClick={onClose}
        aria-label="Close radar"
      >
        <X size={20} />
      </button>

      {/* Radar container */}
      <div className="v2-radar-container">
        <svg
          className="v2-radar-svg"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          role="img"
          aria-label="Productivity radar showing tasks, events, and notes"
        >
          {/* Ring 3 (LATER) - outermost */}
          <circle
            className="v2-radar-ring"
            cx={center}
            cy={center}
            r={center * 0.85 * RINGS[2].radius}
          />

          {/* Ring 2 (SOON) - middle */}
          <circle
            className="v2-radar-ring"
            cx={center}
            cy={center}
            r={center * 0.85 * RINGS[1].radius}
          />

          {/* Ring 1 (NOW) - innermost */}
          <circle
            className="v2-radar-ring"
            cx={center}
            cy={center}
            r={center * 0.85 * RINGS[0].radius}
          />

          {/* Grid lines - cross pattern */}
          <line
            className="v2-radar-grid"
            x1={center}
            y1={center - center * 0.85 * RINGS[2].radius}
            x2={center}
            y2={center + center * 0.85 * RINGS[2].radius}
          />
          <line
            className="v2-radar-grid"
            x1={center - center * 0.85 * RINGS[2].radius}
            y1={center}
            x2={center + center * 0.85 * RINGS[2].radius}
            y2={center}
          />

          {/* Center point - "YOU" */}
          <circle
            className="v2-radar-center-dot"
            cx={center}
            cy={center}
            r={8}
          />
          <text
            className="v2-radar-center-label"
            x={center}
            y={center + 24}
          >
            YOU
          </text>

          {/* Ring labels */}
          <text
            className="v2-radar-ring-label"
            x={center + 12}
            y={center - center * 0.85 * RINGS[0].radius + 4}
          >
            NOW
          </text>
          <text
            className="v2-radar-ring-label"
            x={center + 12}
            y={center - center * 0.85 * RINGS[1].radius + 4}
          >
            SOON
          </text>
          <text
            className="v2-radar-ring-label"
            x={center + 12}
            y={center - center * 0.85 * RINGS[2].radius + 4}
          >
            LATER
          </text>

          {/* Render all blips */}
          {blips.map((blip) => (
            <g
              key={blip.id}
              className={`v2-radar-blip ${blip.urgent ? 'v2-radar-blip--urgent' : ''}`}
              onClick={() => handleBlipClick(blip)}
              role="button"
              tabIndex={0}
              aria-label={`${blip.type}: ${blip.title}${blip.urgent ? ' (urgent)' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBlipClick(blip);
                }
              }}
            >
              {/* Blip circle */}
              <circle
                cx={blip.x}
                cy={blip.y}
                r={blip.size}
                fill={BLIP_COLORS[blip.type]}
                className="v2-radar-blip-circle"
              />

              {/* Tooltip on hover */}
              <title>{blip.title}</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default RadarView;
