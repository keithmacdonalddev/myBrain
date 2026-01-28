/**
 * =============================================================================
 * ATTENTIONCARD.JSX - Individual Attention Card
 * =============================================================================
 *
 * A card that shows items needing attention with count and optional preview.
 * Cards only appear if count > 0. Clicking navigates or expands to show items.
 *
 * Variants:
 * - inbox: Primary blue - unprocessed notes
 * - overdue: Danger red - overdue tasks
 * - dueToday: Warning amber - tasks due today
 * - events: Info blue - today's events
 *
 * =============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, AlertCircle, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

// Icon and color mapping for variants
const VARIANT_CONFIG = {
  inbox: {
    icon: Inbox,
    label: 'Inbox',
    color: 'primary',
    bgClass: 'attention-card-primary',
    navigateTo: '/app/inbox'
  },
  overdue: {
    icon: AlertCircle,
    label: 'Overdue',
    color: 'danger',
    bgClass: 'attention-card-danger',
    navigateTo: '/app/tasks?filter=overdue'
  },
  dueToday: {
    icon: Clock,
    label: 'Due Today',
    color: 'warning',
    bgClass: 'attention-card-warning',
    navigateTo: '/app/today'
  },
  events: {
    icon: Calendar,
    label: 'Events',
    color: 'info',
    bgClass: 'attention-card-info',
    navigateTo: '/app/calendar'
  }
};

/**
 * AttentionCard
 * -------------
 * Individual attention card showing count and optional preview.
 *
 * @param {string} variant - Card type: 'inbox', 'overdue', 'dueToday', 'events'
 * @param {number} count - Number of items needing attention
 * @param {Array} items - Optional array of items for preview (max 3 shown)
 * @param {Function} onItemClick - Callback when clicking an item in preview
 */
export default function AttentionCard({ variant, count, items = [], onItemClick }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const config = VARIANT_CONFIG[variant];
  if (!config || count === 0) return null;

  const Icon = config.icon;
  const hasItems = items.length > 0;
  const previewItems = items.slice(0, 3);

  // Handle card click - navigate to relevant page
  const handleCardClick = () => {
    if (hasItems) {
      setIsExpanded(!isExpanded);
    } else {
      navigate(config.navigateTo);
    }
  };

  // Handle "View All" click - always navigate
  const handleViewAll = (e) => {
    e.stopPropagation();
    navigate(config.navigateTo);
  };

  // Format item display based on variant
  const formatItem = (item) => {
    switch (variant) {
      case 'inbox':
        return {
          title: item.title || 'Untitled note',
          meta: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
        };
      case 'overdue':
      case 'dueToday':
        return {
          title: item.title || 'Untitled task',
          meta: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : ''
        };
      case 'events':
        return {
          title: item.title || 'Untitled event',
          meta: item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        };
      default:
        return { title: item.title || 'Item', meta: '' };
    }
  };

  return (
    <div
      className={`attention-card ${config.bgClass}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Card header with icon and count */}
      <div className="attention-card-header">
        <div className="attention-card-icon-wrapper">
          <Icon className="attention-card-icon" />
        </div>
        <div className="attention-card-info">
          <span className="attention-card-count">{count}</span>
          <span className="attention-card-label">{config.label}</span>
        </div>
        {hasItems && (
          <div className="attention-card-expand">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Expanded preview */}
      {isExpanded && hasItems && (
        <div className="attention-card-preview">
          {previewItems.map((item, index) => {
            const formatted = formatItem(item);
            return (
              <button
                key={item._id || index}
                className="attention-card-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick?.(item);
                }}
              >
                <span className="attention-card-item-title">{formatted.title}</span>
                {formatted.meta && (
                  <span className="attention-card-item-meta">{formatted.meta}</span>
                )}
              </button>
            );
          })}
          {count > 3 && (
            <button
              className="attention-card-view-all"
              onClick={handleViewAll}
            >
              View all {count} items
            </button>
          )}
        </div>
      )}
    </div>
  );
}
