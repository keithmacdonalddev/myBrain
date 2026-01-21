/**
 * =============================================================================
 * INBOXWIDGET.JSX - Inbox Notes Widget
 * =============================================================================
 *
 * Shows unprocessed notes in the inbox awaiting review and organization.
 *
 * SIZE: default (4 columns)
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { Inbox, ChevronRight, StickyNote } from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetBadge,
  WidgetListItem
} from '../components/DashboardGrid';

/**
 * InboxWidget
 * -----------
 * @param {Array} notes - Unprocessed inbox notes
 * @param {boolean} isLoading - Loading state
 * @param {Function} onNoteClick - Handler for note clicks
 */
export default function InboxWidget({
  notes = [],
  isLoading = false,
  onNoteClick
}) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (body) => {
    if (!body) return 'Empty note';
    // Strip HTML and truncate
    const text = body.replace(/<[^>]*>/g, '').trim();
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
  };

  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<Inbox className="w-4 h-4 text-cyan-500" />}
          iconBg="bg-cyan-500/10"
          title="Inbox"
        />
        <WidgetBody>
          <WidgetLoading />
        </WidgetBody>
      </>
    );
  }

  return (
    <>
      <WidgetHeader
        icon={<Inbox className="w-4 h-4 text-cyan-500" />}
        iconBg="bg-cyan-500/10"
        title="Inbox"
        badge={notes.length > 0 && <WidgetBadge value={notes.length} variant="primary" />}
      />

      <WidgetBody>
        {notes.length === 0 ? (
          <WidgetEmpty
            icon={<Inbox className="w-8 h-8" />}
            title="Inbox empty"
            text="All notes have been processed."
          />
        ) : (
          <div className="widget-list">
            {notes.slice(0, 4).map((note) => (
              <WidgetListItem
                key={note._id}
                icon={<StickyNote className="w-4 h-4 text-cyan-500" />}
                iconBg="bg-cyan-500/10"
                title={note.title || 'Untitled'}
                meta={formatDate(note.createdAt)}
                onClick={() => onNoteClick?.(note)}
              />
            ))}
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <Link to="/app/inbox" className="widget-footer-link">
          View inbox <ChevronRight className="w-4 h-4" />
        </Link>
      </WidgetFooter>
    </>
  );
}

InboxWidget.defaultSize = 'default';
