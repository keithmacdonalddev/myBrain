import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const priorityStyles = {
  urgent: {
    border: 'border-l-red-500',
    bg: 'hover:bg-red-500/5',
    dot: 'bg-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'hover:bg-amber-500/5',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'hover:bg-blue-500/5',
    dot: 'bg-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
  },
};

function ActionCard({
  priority = 'info',
  title,
  description,
  meta,
  children,
  actions,
  onDismiss,
  avatar,
}) {
  const styles = priorityStyles[priority] || priorityStyles.info;

  return (
    <div
      className={`bg-panel border border-border border-l-[3px] ${styles.border} rounded-lg p-4 transition-all shadow-theme-card hover:shadow-theme-elevated ${styles.bg}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-text font-medium mb-1">{title}</p>
          {description && (
            <p className="text-sm text-muted mb-3">{description}</p>
          )}
          {(meta || avatar) && (
            <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
              {avatar && (
                <img
                  src={avatar}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              )}
              {meta}
            </div>
          )}
          {children}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ children, variant = 'default', onClick, className = '' }) {
  const variants = {
    default: 'border border-border text-muted hover:text-text hover:border-text/30',
    primary: 'bg-text text-bg hover:bg-text/90',
    warning: 'bg-amber-500 text-black hover:bg-amber-400',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors active:scale-[0.98] ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function InboxSection({ priority, title, subtitle, children, count }) {
  const styles = priorityStyles[priority] || priorityStyles.info;

  if (!children || (Array.isArray(children) && children.length === 0)) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 ${styles.dot} rounded-full`} />
        <h2 className="text-sm font-medium text-text uppercase tracking-wide">{title}</h2>
        {count > 0 && (
          <span className={`px-1.5 py-0.5 text-xs rounded ${
            priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
            priority === 'warning' ? 'bg-amber-500/10 text-amber-500' :
            'bg-blue-500/10 text-blue-500'
          }`}>
            {count}
          </span>
        )}
        {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

function EmptyInbox() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]">
      <div className="w-12 h-12 bg-panel rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-text font-medium mb-1">All caught up</p>
      <p className="text-sm text-muted">Nothing needs your attention right now.</p>
    </div>
  );
}

export { ActionCard, ActionButton, InboxSection, EmptyInbox };
export default ActionCard;
