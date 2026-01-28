/**
 * =============================================================================
 * FOCUSZONE.JSX - Needs Your Attention Section
 * =============================================================================
 *
 * Displays attention cards for items that need action.
 * Shows celebratory message when all clear.
 *
 * Cards shown:
 * - Inbox: Unprocessed notes count
 * - Overdue: Overdue tasks count
 * - Due Today: Tasks due today count
 * - Events: Today's events count
 *
 * Key principle: Cards only appear if count > 0
 *
 * =============================================================================
 */

import { CheckCircle, Sparkles } from 'lucide-react';
import AttentionCard from './AttentionCard';

/**
 * FocusZone
 * ---------
 * Container for attention cards. Shows "all clear" when nothing needs attention.
 *
 * @param {Object} data - Dashboard data containing counts and items
 * @param {Function} onTaskClick - Callback when clicking a task item
 * @param {Function} onNoteClick - Callback when clicking a note item
 * @param {Function} onEventClick - Callback when clicking an event item
 */
export default function FocusZone({ data, onTaskClick, onNoteClick, onEventClick }) {
  // Extract counts and items from dashboard data
  const inboxCount = data?.inbox?.length || 0;
  const overdueCount = data?.urgentItems?.overdueTasks?.length || 0;
  const dueTodayCount = data?.urgentItems?.dueTodayTasks?.length || 0;
  const eventsCount = data?.events?.today?.length || 0;

  const totalAttention = inboxCount + overdueCount + dueTodayCount + eventsCount;

  // All clear state - nothing needs attention
  if (totalAttention === 0) {
    return (
      <section className="focus-zone focus-zone-clear">
        <div className="focus-zone-header">
          <Sparkles className="w-5 h-5 text-success" />
          <h2 className="focus-zone-title">You're all caught up!</h2>
        </div>
        <p className="focus-zone-message">
          Nothing needs your attention right now. Time to create something new.
        </p>
      </section>
    );
  }

  return (
    <section className="focus-zone">
      <div className="focus-zone-header">
        <h2 className="focus-zone-title">Needs Your Attention</h2>
        <span className="focus-zone-count">{totalAttention} items</span>
      </div>

      <div className="focus-zone-cards">
        <AttentionCard
          variant="inbox"
          count={inboxCount}
          items={data?.inbox || []}
          onItemClick={onNoteClick}
        />
        <AttentionCard
          variant="overdue"
          count={overdueCount}
          items={data?.urgentItems?.overdueTasks || []}
          onItemClick={onTaskClick}
        />
        <AttentionCard
          variant="dueToday"
          count={dueTodayCount}
          items={data?.urgentItems?.dueTodayTasks || []}
          onItemClick={onTaskClick}
        />
        <AttentionCard
          variant="events"
          count={eventsCount}
          items={data?.events?.today || []}
          onItemClick={onEventClick}
        />
      </div>
    </section>
  );
}
