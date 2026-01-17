import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Inbox,
  FolderOpen,
  AlertCircle,
  Plus
} from 'lucide-react';

const ICONS = {
  notes: FileText,
  search: Search,
  inbox: Inbox,
  folder: FolderOpen,
  error: AlertCircle,
};

/**
 * Empty state component for consistent empty states across the app
 *
 * Usage:
 * <EmptyState
 *   icon="notes"
 *   title="No notes yet"
 *   description="Create your first note to get started"
 *   action={{ label: "Create Note", to: "/app/notes/new" }}
 * />
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className = '',
  children,
}) {
  const IconComponent = typeof icon === 'string' ? ICONS[icon] || Inbox : icon;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 bg-panel rounded-full flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-muted" />
      </div>

      {title && (
        <h3 className="text-lg font-medium text-text mb-2">{title}</h3>
      )}

      {description && (
        <p className="text-sm text-muted text-center max-w-sm mb-6">{description}</p>
      )}

      {action && (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
          >
            {action.icon || <Plus className="w-4 h-4" />}
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
          >
            {action.icon || <Plus className="w-4 h-4" />}
            {action.label}
          </button>
        )
      )}

      {children}
    </div>
  );
}

// Preset empty states
EmptyState.Notes = function EmptyNotes({ onCreateNote }) {
  return (
    <EmptyState
      icon="notes"
      title="No notes yet"
      description="Create your first note to capture your thoughts and ideas."
      action={{
        label: 'Create Note',
        onClick: onCreateNote,
      }}
    />
  );
};

EmptyState.Search = function EmptySearch({ query }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={query ? `No matches for "${query}". Try a different search term.` : 'Try searching for something.'}
    />
  );
};

EmptyState.Archived = function EmptyArchived() {
  return (
    <EmptyState
      icon="folder"
      title="No archived notes"
      description="Notes you archive will appear here."
    />
  );
};

EmptyState.Trash = function EmptyTrash() {
  return (
    <EmptyState
      icon="inbox"
      title="Trash is empty"
      description="Notes you delete will appear here for 30 days before being permanently removed."
    />
  );
};

EmptyState.Error = function EmptyError({ message, onRetry }) {
  return (
    <EmptyState
      icon="error"
      title="Something went wrong"
      description={message || 'We encountered an error while loading. Please try again.'}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
};

export default EmptyState;
