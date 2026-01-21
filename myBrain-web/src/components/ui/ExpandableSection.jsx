import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Loader2 } from 'lucide-react';

/**
 * Generic expandable/collapsible section component
 *
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} props.defaultExpanded - Initial expanded state (default: true)
 * @param {React.ComponentType} props.icon - Optional icon component
 * @param {string} props.iconClassName - Icon CSS classes
 * @param {number|string} props.count - Optional count badge
 * @param {React.ReactNode} props.headerRight - Content on right side of header
 * @param {string} props.className - Additional classes for container
 * @param {string} props.headerClassName - Additional classes for header button
 * @param {string} props.contentClassName - Additional classes for content area
 * @param {boolean} props.bordered - Add border styling (default: false)
 * @param {boolean} props.disabled - Disable expand/collapse
 * @param {boolean} props.isLoading - Show loading state
 * @param {string} props.emptyText - Text to show when content is empty
 * @param {boolean} props.isEmpty - Whether content is empty
 * @param {'vertical' | 'horizontal'} props.chevronStyle - Chevron animation style
 * @param {Function} props.onToggle - Called when expanded state changes
 */
export default function ExpandableSection({
  title,
  children,
  defaultExpanded = true,
  icon: Icon,
  iconClassName = 'w-4 h-4 text-muted',
  count,
  headerRight,
  className = '',
  headerClassName = '',
  contentClassName = '',
  bordered = false,
  disabled = false,
  isLoading = false,
  emptyText,
  isEmpty = false,
  chevronStyle = 'horizontal',
  onToggle,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (disabled) return;
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  };

  const renderChevron = () => {
    if (chevronStyle === 'vertical') {
      return isExpanded ? (
        <ChevronUp className="w-4 h-4 text-muted" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted" />
      );
    }
    return isExpanded ? (
      <ChevronDown className="w-4 h-4 text-muted transition-transform" />
    ) : (
      <ChevronRight className="w-4 h-4 text-muted transition-transform" />
    );
  };

  if (isLoading) {
    return (
      <div className={`${bordered ? 'border-t border-border' : ''} px-4 py-3 ${className}`}>
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bordered ? 'border-b border-border last:border-b-0' : ''} ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center gap-2 p-3 hover:bg-bg/50 transition-colors disabled:cursor-default disabled:hover:bg-transparent ${headerClassName}`}
      >
        {!disabled && renderChevron()}
        {Icon && <Icon className={iconClassName} />}
        <span className="text-sm font-medium text-text">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted">({count})</span>
        )}
        <div className="flex-1" />
        {headerRight && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </div>
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className={`px-3 pb-3 ${contentClassName}`}>
          {isEmpty && emptyText ? (
            <p className="text-sm text-muted py-2 px-2">{emptyText}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simpler expandable section with minimal styling
 * Good for inline collapsible content
 */
export function CollapsibleContent({
  label,
  children,
  defaultExpanded = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-primary hover:underline"
      >
        {isExpanded ? 'Hide' : 'Show'} {label}
      </button>
      {isExpanded && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Expandable section with animated height transition
 * Uses CSS transitions for smooth expand/collapse
 */
export function AnimatedExpandableSection({
  title,
  children,
  defaultExpanded = false,
  icon: Icon,
  iconClassName = 'w-4 h-4 text-muted',
  count,
  headerRight,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-bg/50 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform duration-200 ${
            isExpanded ? '' : '-rotate-90'
          }`}
        />
        {Icon && <Icon className={iconClassName} />}
        <span className="text-sm font-medium text-text">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted">({count})</span>
        )}
        <div className="flex-1" />
        {headerRight && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </div>
        )}
      </button>

      {/* Animated Content */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Accordion component for mutually exclusive sections
 * Only one section can be expanded at a time
 */
export function Accordion({ sections, defaultActiveKey, className = '' }) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || null);

  return (
    <div className={`divide-y divide-border ${className}`}>
      {sections.map((section) => (
        <div key={section.key}>
          <button
            type="button"
            onClick={() => setActiveKey(activeKey === section.key ? null : section.key)}
            className="w-full flex items-center gap-2 p-3 hover:bg-bg/50 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform duration-200 ${
                activeKey === section.key ? '' : '-rotate-90'
              }`}
            />
            {section.icon && <section.icon className="w-4 h-4 text-muted" />}
            <span className="text-sm font-medium text-text">{section.title}</span>
            {section.count !== undefined && (
              <span className="text-xs text-muted">({section.count})</span>
            )}
          </button>

          {activeKey === section.key && (
            <div className="px-3 pb-3">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
