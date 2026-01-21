/**
 * =============================================================================
 * TIMEWIDGET.JSX - Time and Greeting Widget
 * =============================================================================
 *
 * A compact widget showing the current time, date, and personalized greeting.
 * Updates every second to keep time current.
 *
 * SIZE: narrow (3 columns)
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Clock } from 'lucide-react';
import { WidgetHeader, WidgetBody } from '../components/DashboardGrid';

export default function TimeWidget() {
  const { user } = useSelector((state) => state.auth);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name from profile
  const firstName = user?.profile?.firstName
    || user?.profile?.displayName?.split(' ')[0]
    || 'there';

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <WidgetHeader
        icon={<Clock className="w-4 h-4 text-blue-500" />}
        iconBg="bg-blue-500/10"
        title="Time"
      />
      <WidgetBody>
        <div className="text-center">
          <div className="text-sm text-muted mb-1">
            {getGreeting()}, <span className="text-primary font-medium">{firstName}</span>
          </div>
          <div className="time-widget-clock">{timeStr}</div>
          <div className="time-widget-date">{dateStr}</div>
        </div>
      </WidgetBody>
    </>
  );
}

TimeWidget.defaultSize = 'narrow';
