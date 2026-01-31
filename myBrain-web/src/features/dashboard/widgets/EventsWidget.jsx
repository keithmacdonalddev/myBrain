/**
 * =============================================================================
 * EVENTSWIDGET.JSX - Today's Events Widget
 * =============================================================================
 *
 * Shows today's calendar events with time indicators.
 * Events happening now are highlighted.
 *
 * SIZE: default (4 columns)
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, MapPin } from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetBadge
} from '../components/DashboardGrid';

/**
 * EventsWidget
 * ------------
 * @param {Array} events - Today's events
 * @param {boolean} isLoading - Loading state
 * @param {Function} onEventClick - Handler for event clicks
 * @param {string} title - Widget title (default: "Today's Events")
 */
export default function EventsWidget({
  events = [],
  isLoading = false,
  onEventClick,
  title = "Today's Events"
}) {
  const now = new Date();

  const formatEventTime = (event) => {
    if (event.allDay) return 'All day';
    const date = new Date(event.startDate);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isHappeningNow = (event) => {
    if (event.allDay) return false;
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
    return now >= start && now <= end;
  };

  const getTimeUntil = (event) => {
    const start = new Date(event.startDate);
    const minutes = Math.round((start - now) / (1000 * 60));

    if (minutes < 0) return null;
    if (minutes < 60) return `in ${minutes}m`;
    if (minutes < 120) return 'in 1h';
    return null;
  };

  // Event colors for visual distinction - uses semantic colors from design system
  // Falls back to primary if no color assigned
  const getEventColor = (event) => {
    if (event.color) return event.color;
    return 'var(--primary)';
  };

  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<Calendar className="w-4 h-4 text-blue-500" />}
          iconBg="bg-blue-500/10"
          title={title}
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
        icon={<Calendar className="w-4 h-4 text-blue-500" />}
        iconBg="bg-blue-500/10"
        title={title}
        badge={events.length > 0 && <WidgetBadge value={events.length} variant="primary" />}
      />

      <WidgetBody>
        {events.length === 0 ? (
          <WidgetEmpty
            icon={<Calendar className="w-8 h-8" />}
            title="No events"
            text="No events scheduled for today."
          />
        ) : (
          <div className="widget-list">
            {events.slice(0, 5).map((event, index) => {
              const happening = isHappeningNow(event);
              const timeUntil = getTimeUntil(event);
              const color = getEventColor(event);

              return (
                <div
                  key={event._id || `${event.originalEventId}-${event.startDate}`}
                  className={`widget-list-item ${happening ? 'ring-2 ring-primary/30' : ''}`}
                  onClick={() => onEventClick?.(event)}
                >
                  <div
                    className="w-1 h-full self-stretch rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  <div className="widget-list-item-content">
                    <div className="widget-list-item-title flex items-center gap-2">
                      {event.title}
                      {happening && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="widget-list-item-meta flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatEventTime(event)}</span>
                      {timeUntil && (
                        <span className="text-primary font-medium">{timeUntil}</span>
                      )}
                      {event.location && (
                        <>
                          <span className="text-muted">•</span>
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <Link to="/app/calendar" className="widget-footer-link">
          Open calendar <ChevronRight className="w-4 h-4" />
        </Link>
      </WidgetFooter>
    </>
  );
}

EventsWidget.defaultSize = 'default';
