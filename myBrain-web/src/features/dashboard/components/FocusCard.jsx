/**
 * =============================================================================
 * FOCUSCARD.JSX - Dynamic Hero Card Component
 * =============================================================================
 *
 * A prominent hero card that shows the highest-priority item requiring attention.
 * The content changes dynamically based on what's most important right now.
 *
 * PRIORITY ORDER:
 * 1. Event happening NOW or in < 15 minutes
 * 2. Overdue items (tasks past due date)
 * 3. Priority task due today
 * 4. Unread messages needing response
 * 5. All clear - show accomplishments or next upcoming
 *
 * VARIANTS:
 * - default (blue): Standard focus
 * - urgent (red): Overdue or time-critical
 * - event (blue): Event happening soon
 * - success (green): All clear, showing accomplishments
 *
 * =============================================================================
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronRight,
  Sparkles
} from 'lucide-react';

/**
 * FocusCard
 * ---------
 * Dynamic hero card showing the most important thing right now.
 *
 * @param {Object} data - Dashboard data from API
 * @param {Function} onTaskClick - Handler for task clicks
 * @param {Function} onEventClick - Handler for event clicks
 */
export default function FocusCard({ data, onTaskClick, onEventClick }) {
  const focusContent = useMemo(() => {
    if (!data) return null;

    const now = new Date();

    // 1. Check for event happening NOW or starting soon
    const upcomingEvents = data.urgentItems?.upcomingEvents || [];
    const todayEvents = data.events?.today || [];
    const allEvents = [...upcomingEvents, ...todayEvents];

    for (const event of allEvents) {
      const startTime = new Date(event.startDate);
      const endTime = event.endDate ? new Date(event.endDate) : null;
      const minutesUntil = (startTime - now) / (1000 * 60);

      // Event happening now
      if (endTime && startTime <= now && now <= endTime) {
        return {
          type: 'event-now',
          variant: 'event',
          label: 'HAPPENING NOW',
          title: event.title,
          meta: event.location || 'In progress',
          action: { label: 'View event', onClick: () => onEventClick?.(event) },
          icon: Calendar,
          item: event
        };
      }

      // Event starting in < 15 minutes
      if (minutesUntil > 0 && minutesUntil <= 15) {
        return {
          type: 'event-soon',
          variant: 'event',
          label: `STARTING IN ${Math.ceil(minutesUntil)} MIN`,
          title: event.title,
          meta: event.location || formatTime(startTime),
          action: { label: 'View event', onClick: () => onEventClick?.(event) },
          icon: Clock,
          item: event
        };
      }
    }

    // 2. Check for overdue tasks
    const overdueTasks = data.urgentItems?.overdueTasks || [];
    if (overdueTasks.length > 0) {
      const mostOverdue = overdueTasks[0];
      const daysOverdue = getDaysOverdue(mostOverdue.dueDate);

      return {
        type: 'overdue',
        variant: 'urgent',
        label: 'OVERDUE',
        title: mostOverdue.title,
        meta: daysOverdue === 0
          ? 'Was due today'
          : `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        action: { label: 'Handle now', onClick: () => onTaskClick?.(mostOverdue) },
        icon: AlertTriangle,
        item: mostOverdue,
        badge: overdueTasks.length > 1 ? `+${overdueTasks.length - 1} more` : null
      };
    }

    // 3. Check for priority task due today
    const dueTodayTasks = data.urgentItems?.dueTodayTasks || [];
    const highPriorityToday = dueTodayTasks.find(t =>
      t.priority === 'urgent' || t.priority === 'high'
    );

    if (highPriorityToday) {
      return {
        type: 'priority-task',
        variant: 'default',
        label: `${highPriorityToday.priority.toUpperCase()} PRIORITY`,
        title: highPriorityToday.title,
        meta: 'Due today',
        action: { label: 'Start task', onClick: () => onTaskClick?.(highPriorityToday) },
        icon: Clock,
        item: highPriorityToday
      };
    }

    // 4. Check for unread messages
    const unreadMessages = data.attentionItems?.unreadMessages || 0;
    if (unreadMessages > 0) {
      const firstConversation = data.messages?.[0];

      return {
        type: 'messages',
        variant: 'default',
        label: 'UNREAD MESSAGES',
        title: `${unreadMessages} message${unreadMessages !== 1 ? 's' : ''} waiting`,
        meta: firstConversation
          ? `From ${firstConversation.participants?.[0]?.name || 'someone'}`
          : 'Check your inbox',
        action: { label: 'View messages', link: '/app/messages' },
        icon: MessageSquare
      };
    }

    // 5. All clear - show accomplishments
    const completedToday = data.stats?.tasks?.completedToday || 0;

    if (completedToday > 0) {
      return {
        type: 'accomplishment',
        variant: 'success',
        label: "TODAY'S PROGRESS",
        title: `${completedToday} task${completedToday !== 1 ? 's' : ''} completed`,
        meta: "Great work! Keep the momentum going.",
        action: { label: 'View all tasks', link: '/app/tasks' },
        icon: CheckCircle2
      };
    }

    // Default: Show next upcoming
    const nextEvent = todayEvents[0];
    if (nextEvent) {
      const startTime = new Date(nextEvent.startDate);

      return {
        type: 'next-up',
        variant: 'default',
        label: 'NEXT UP',
        title: nextEvent.title,
        meta: nextEvent.allDay ? 'All day' : formatTime(startTime),
        action: { label: 'View calendar', link: '/app/calendar' },
        icon: Calendar,
        item: nextEvent
      };
    }

    // Nothing to show
    return {
      type: 'all-clear',
      variant: 'success',
      label: 'ALL CLEAR',
      title: "You're all caught up!",
      meta: "No urgent items. Time to plan ahead or take a break.",
      action: { label: 'Explore', link: '/app/tasks' },
      icon: Sparkles
    };
  }, [data, onTaskClick, onEventClick]);

  if (!focusContent) return null;

  const Icon = focusContent.icon;
  const variantClass = `focus-card-${focusContent.variant}`;

  return (
    <div className={`focus-card ${variantClass}`}>
      <div className="focus-card-content">
        {Icon && <Icon className="w-6 h-6 flex-shrink-0" />}
        <span className="focus-card-label">{focusContent.label}</span>
        <span className="focus-card-title">{focusContent.title}</span>
        <span className="focus-card-meta">{focusContent.meta}</span>
        {focusContent.badge && (
          <span className="px-2.5 py-1 bg-white/20 rounded text-sm font-medium">
            {focusContent.badge}
          </span>
        )}
      </div>

      {focusContent.action && (
        <div className="focus-card-action">
          {focusContent.action.link ? (
            <Link to={focusContent.action.link} className="focus-card-btn">
              {focusContent.action.label}
              <ChevronRight className="w-4 h-4 inline ml-1" />
            </Link>
          ) : (
            <button
              onClick={focusContent.action.onClick}
              className="focus-card-btn"
            >
              {focusContent.action.label}
              <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getDaysOverdue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);

  // Reset to start of day for comparison
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.floor((now - due) / (1000 * 60 * 60 * 24));
}
