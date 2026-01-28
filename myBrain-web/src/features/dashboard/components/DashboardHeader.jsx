/**
 * =============================================================================
 * DASHBOARDHEADER.JSX - Compact Header with Greeting and Weather
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import WeatherWidget from '../../../components/ui/WeatherWidget';

export default function DashboardHeader({ onNewNote, onNewTask, onNewEvent }) {
  const { user } = useSelector((state) => state.auth);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.profile?.firstName
    || user?.profile?.displayName?.split(' ')[0]
    || 'there';

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <span className="dashboard-date">{dateStr} &middot; {timeStr}</span>
        <h1 className="dashboard-greeting">
          {getGreeting()}, <span className="text-primary">{firstName}</span>
        </h1>
        <p className="dashboard-subtitle">Here's what needs your attention</p>
      </div>
      <div className="dashboard-header-right">
        <WeatherWidget compact />
      </div>
    </header>
  );
}
