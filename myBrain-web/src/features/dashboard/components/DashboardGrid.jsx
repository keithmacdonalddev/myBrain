/**
 * =============================================================================
 * DASHBOARDGRID.JSX - Intelligent Dashboard Grid Container
 * =============================================================================
 *
 * A 12-column CSS Grid container that handles:
 * - Widget placement based on size (narrow, default, wide, full)
 * - Pinned widget positioning
 * - Dynamic widget arrangement around pinned positions
 * - Responsive breakpoints for mobile/tablet/desktop
 *
 * WIDGET SIZES:
 * - narrow: 3 columns (1/4 width on desktop)
 * - default: 4 columns (1/3 width on desktop)
 * - wide: 6 columns (1/2 width on desktop)
 * - full: 12 columns (full width)
 *
 * USAGE:
 * <DashboardGrid
 *   widgets={[
 *     { id: 'time', component: TimeWidget, size: 'narrow' },
 *     { id: 'tasks', component: TasksWidget, size: 'default' },
 *   ]}
 *   pinnedWidgets={[{ widgetId: 'calendar', position: 'top-right' }]}
 *   onPin={(widgetId) => handlePin(widgetId)}
 *   onUnpin={(widgetId) => handleUnpin(widgetId)}
 * />
 *
 * =============================================================================
 */

import { useMemo, useState } from 'react';
import { Pin, PinOff, MapPin, Grip, Star } from 'lucide-react';
import '../../../styles/dashboard.css';

/**
 * Pin position options for widgets
 */
const PIN_POSITIONS = [
  { id: 'always-show', label: 'Always Show', icon: Star, description: 'Always visible at top' },
  { id: 'top-left', label: 'Top Left', icon: Grip, description: 'Fixed top-left corner' },
  { id: 'top-right', label: 'Top Right', icon: Grip, description: 'Fixed top-right corner' },
  { id: 'bottom-left', label: 'Bottom Left', icon: Grip, description: 'Fixed bottom-left corner' },
  { id: 'bottom-right', label: 'Bottom Right', icon: Grip, description: 'Fixed bottom-right corner' },
];

/**
 * Maps widget size to CSS class
 */
const SIZE_CLASSES = {
  narrow: 'widget-narrow',
  default: 'widget-default',
  wide: 'widget-wide',
  full: 'widget-full'
};

/**
 * DashboardGrid
 * -------------
 * Main grid container for the intelligent dashboard.
 *
 * @param {Array} widgets - Array of widget definitions
 * @param {Array} pinnedWidgets - Array of pinned widget configs
 * @param {Function} onPin - Callback when widget is pinned
 * @param {Function} onUnpin - Callback when widget is unpinned
 * @param {boolean} editMode - Whether in edit mode (show all pin buttons)
 */
export default function DashboardGrid({
  widgets = [],
  pinnedWidgets = [],
  onPin,
  onUnpin,
  editMode = false
}) {
  // Create a map of pinned widget IDs for quick lookup
  const pinnedMap = useMemo(() => {
    const map = new Map();
    pinnedWidgets.forEach(pw => map.set(pw.widgetId, pw));
    return map;
  }, [pinnedWidgets]);

  // Arrange widgets - pinned ones first, then by priority
  const arrangedWidgets = useMemo(() => {
    const pinned = [];
    const unpinned = [];

    widgets.forEach(widget => {
      if (pinnedMap.has(widget.id)) {
        pinned.push({
          ...widget,
          isPinned: true,
          pinnedConfig: pinnedMap.get(widget.id)
        });
      } else {
        unpinned.push({
          ...widget,
          isPinned: false
        });
      }
    });

    // Sort pinned widgets by position priority
    const positionOrder = ['top-left', 'top-right', 'always-show', 'bottom-left', 'bottom-right'];
    pinned.sort((a, b) => {
      const posA = positionOrder.indexOf(a.pinnedConfig?.position || 'always-show');
      const posB = positionOrder.indexOf(b.pinnedConfig?.position || 'always-show');
      return posA - posB;
    });

    // Return pinned first, then unpinned
    return [...pinned, ...unpinned];
  }, [widgets, pinnedMap]);

  return (
    <div className="dashboard-grid">
      {arrangedWidgets.map(widget => (
        <WidgetWrapper
          key={widget.id}
          widget={widget}
          isPinned={widget.isPinned}
          onPin={onPin}
          onUnpin={onUnpin}
          editMode={editMode}
        />
      ))}
    </div>
  );
}

/**
 * WidgetWrapper
 * -------------
 * Wrapper component for each widget with pin/unpin functionality.
 */
function WidgetWrapper({ widget, isPinned, onPin, onUnpin, editMode }) {
  const [showPinMenu, setShowPinMenu] = useState(false);
  const {
    id,
    component: WidgetComponent,
    size = 'default',
    props = {}
  } = widget;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.default;

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (isPinned) {
      onUnpin?.(id);
    } else {
      setShowPinMenu(true);
    }
  };

  const handleSelectPosition = (position) => {
    onPin?.(id, position, size);
    setShowPinMenu(false);
  };

  return (
    <div className={`dashboard-widget ${sizeClass}`}>
      {/* Pin button - shown on hover or in edit mode */}
      {(editMode || onPin) && (
        <div className="widget-actions" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10 }}>
          <button
            className={`widget-action-btn ${isPinned ? 'pinned' : ''}`}
            onClick={handlePinClick}
            title={isPinned ? 'Unpin widget' : 'Pin widget'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          {/* Pin position dropdown */}
          {showPinMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); setShowPinMenu(false); }}
              />
              <div className="pin-position-menu">
                <div className="pin-menu-header">Pin to position</div>
                {PIN_POSITIONS.map((pos) => {
                  const Icon = pos.icon;
                  return (
                    <button
                      key={pos.id}
                      className="pin-menu-item"
                      onClick={(e) => { e.stopPropagation(); handleSelectPosition(pos.id); }}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="pin-menu-item-text">
                        <span className="pin-menu-item-label">{pos.label}</span>
                        <span className="pin-menu-item-desc">{pos.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* The actual widget component */}
      <WidgetComponent {...props} widgetId={id} isPinned={isPinned} />
    </div>
  );
}

/**
 * WidgetHeader
 * ------------
 * Reusable header component for widgets.
 *
 * @param {React.ReactNode} icon - Icon element
 * @param {string} iconBg - Background color class for icon
 * @param {string} title - Widget title
 * @param {string} subtitle - Optional subtitle
 * @param {React.ReactNode} badge - Optional badge element
 * @param {React.ReactNode} actions - Optional action buttons
 */
export function WidgetHeader({ icon, iconBg, title, subtitle, badge, actions, children }) {
  return (
    <div className="widget-header">
      <div className="widget-header-left">
        {icon && (
          <div className={`widget-icon ${iconBg || 'bg-primary/10'}`}>
            {icon}
          </div>
        )}
        <div>
          <h3 className="widget-title">{title}</h3>
          {subtitle && <p className="widget-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        {actions}
        {children}
      </div>
    </div>
  );
}

/**
 * WidgetBody
 * ----------
 * Reusable body component for widgets.
 *
 * @param {boolean} compact - Use compact padding
 * @param {React.ReactNode} children - Content
 */
export function WidgetBody({ compact = false, children, className = '' }) {
  return (
    <div className={`${compact ? 'widget-body-compact' : 'widget-body'} ${className}`}>
      {children}
    </div>
  );
}

/**
 * WidgetFooter
 * ------------
 * Reusable footer component for widgets.
 *
 * @param {React.ReactNode} children - Content (usually a link)
 */
export function WidgetFooter({ children }) {
  return (
    <div className="widget-footer">
      {children}
    </div>
  );
}

/**
 * WidgetEmpty
 * -----------
 * Empty state component for widgets.
 *
 * @param {React.ReactNode} icon - Icon element
 * @param {string} title - Empty state title
 * @param {string} text - Description text
 */
export function WidgetEmpty({ icon, title, text }) {
  return (
    <div className="widget-empty">
      {icon && <div className="widget-empty-icon">{icon}</div>}
      {title && <div className="widget-empty-title">{title}</div>}
      {text && <div className="widget-empty-text">{text}</div>}
    </div>
  );
}

/**
 * WidgetLoading
 * -------------
 * Loading state component for widgets.
 */
export function WidgetLoading() {
  return (
    <div className="widget-loading">
      <div className="widget-loading-spinner" />
    </div>
  );
}

/**
 * WidgetBadge
 * -----------
 * Badge component for widget headers.
 *
 * @param {string|number} value - Badge value
 * @param {string} variant - Badge variant (primary, danger, success, warning)
 */
export function WidgetBadge({ value, variant = 'primary' }) {
  return (
    <span className={`widget-badge widget-badge-${variant}`}>
      {value}
    </span>
  );
}

/**
 * WidgetListItem
 * --------------
 * Reusable list item for widget content.
 *
 * @param {React.ReactNode} icon - Icon element
 * @param {string} iconBg - Background color for icon
 * @param {string} title - Item title
 * @param {string} meta - Metadata text
 * @param {React.ReactNode} trailing - Trailing element
 * @param {Function} onClick - Click handler
 */
export function WidgetListItem({ icon, iconBg, title, meta, trailing, onClick }) {
  return (
    <div className="widget-list-item" onClick={onClick} role={onClick ? 'button' : undefined}>
      {icon && (
        <div className={`widget-list-item-icon ${iconBg || ''}`}>
          {icon}
        </div>
      )}
      <div className="widget-list-item-content">
        <div className="widget-list-item-title">{title}</div>
        {meta && <div className="widget-list-item-meta">{meta}</div>}
      </div>
      {trailing}
    </div>
  );
}
