/**
 * DashboardPageV2 - Redesigned dashboard matching prototype layout
 *
 * Structure:
 * 1. Header/Topbar - Greeting, date, weather pill, radar button, theme toggle, avatar
 * 2. TODAY'S FOCUS - 4 metric cards + currently working on task with progress
 * 3. Widget Grid - Tasks (left), Schedule (right)
 * 4. Bottom Bar - Keyboard shortcuts
 *
 * This component is shown when dashboardV2Enabled feature flag is true.
 */

import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { usePageTracking } from '../../hooks/useAnalytics';
import { RefreshCw, Radar, Sun, Cloud, AlertTriangle, Calendar, Inbox, CheckCircle, Play, Pause, SkipForward, Check } from 'lucide-react';

// Existing components
import ThemeToggle from '../../components/ui/ThemeToggle';
import UserAvatar from '../../components/ui/UserAvatar';
import RadarView from './widgets-v2/RadarView';

// Data hooks
import { useDashboardData, useDashboardSession } from './hooks/useDashboardData';
import { useWeather, useWeatherLocations } from '../../hooks/useWeather';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

// V2 Widgets
import TasksWidgetV2 from './widgets-v2/TasksWidgetV2';
import EventsWidgetV2 from './widgets-v2/EventsWidgetV2';
import ActivityLogWidgetV2 from './widgets-v2/ActivityLogWidgetV2';
import QuickStatsWidgetV2 from './widgets-v2/QuickStatsWidgetV2';
import ProjectsWidgetV2 from './widgets-v2/ProjectsWidgetV2';
import InboxWidgetV2 from './widgets-v2/InboxWidgetV2';
import BottomBarV2 from './components/BottomBarV2';

// Styles
import './styles/dashboard-v2.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * WeatherPill - Compact weather display for topbar
 * Shows weather icon and temperature in a pill-shaped container
 */
function WeatherPill() {
  const weatherEnabled = useFeatureFlag('weatherEnabled');
  const { data: locations = [] } = useWeatherLocations();
  const currentLocation = locations[0];
  const { data: weather, isLoading } = useWeather(currentLocation?.location || null, 'metric');

  if (!weatherEnabled || isLoading || !weather) {
    return null;
  }

  const { current } = weather;
  const icon = current?.icon;

  // Map icon name to Lucide component
  const WeatherIcon = icon?.includes('sun') ? Sun : Cloud;

  return (
    <div className="v2-weather-pill">
      <WeatherIcon className="v2-weather-pill__icon" />
      <span className="v2-weather-pill__temp">{current.temperature}°C</span>
    </div>
  );
}

/**
 * MetricCard - Single metric display with icon, value, and label
 *
 * @param {Object} props
 * @param {string} props.icon - Emoji or icon character
 * @param {number|string} props.value - The metric value
 * @param {string} props.label - Label text below the value
 * @param {string} props.type - 'danger' | 'success' | 'default'
 * @param {Function} props.onClick - Optional click handler
 */
function MetricCard({ icon, value, label, type = 'default', onClick }) {
  const typeClass = type === 'danger' ? 'v2-metric-card--danger' :
                    type === 'success' ? 'v2-metric-card--success' : '';

  return (
    <div
      className={`v2-metric-card ${typeClass}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="v2-metric-card__icon">{icon}</span>
      <span className="v2-metric-card__value">{value}</span>
      <span className="v2-metric-card__label">{label}</span>
    </div>
  );
}

/**
 * CurrentTaskCard - Shows the task currently being worked on
 * Includes progress bar and action buttons (Complete, Pause, Skip)
 *
 * @param {Object} props
 * @param {Object} props.task - The current task object
 * @param {Function} props.onComplete - Handler for complete action
 * @param {Function} props.onPause - Handler for pause action
 * @param {Function} props.onSkip - Handler for skip action
 */
function CurrentTaskCard({ task, onComplete, onPause, onSkip }) {
  // Calculate progress - mock for now, can be enhanced with actual time tracking
  const progress = task?.progress || 60;
  const estimatedTimeRemaining = task?.estimatedMinutes ? `Est. ${task.estimatedMinutes} min remaining` : 'In progress';

  if (!task) {
    return (
      <div className="v2-current-task v2-current-task--empty">
        <div className="v2-current-task__content">
          <p className="v2-current-task__label">Currently Working On</p>
          <p className="v2-current-task__name v2-current-task__name--empty">
            No task in progress. Pick one from below to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-current-task">
      <div className="v2-current-task__content">
        <p className="v2-current-task__label">Currently Working On</p>
        <p className="v2-current-task__name">{task.title}</p>
        <div className="v2-progress-bar">
          <div className="v2-progress-bar__fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="v2-progress-bar__label">{progress}% complete - {estimatedTimeRemaining}</p>
      </div>
      <div className="v2-current-task__actions">
        <button className="v2-action-btn v2-action-btn--primary" onClick={onComplete}>
          <Check className="v2-icon" /> Complete
        </button>
        <button className="v2-action-btn v2-action-btn--secondary" onClick={onPause}>
          <Pause className="v2-icon" /> Pause
        </button>
        <button className="v2-action-btn v2-action-btn--secondary" onClick={onSkip}>
          <SkipForward className="v2-icon" /> Skip
        </button>
      </div>
    </div>
  );
}

// BottomBarV2 imported from './components/BottomBarV2'
// Provides working keyboard shortcuts: T (task), N (note), E (event), Cmd/Ctrl+K (command)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get greeting based on time of day
 */
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Format current date: "Friday, January 31, 2026"
 */
function formatCurrentDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format current time with remaining work hours
 */
function formatTimeRemaining() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Assume work day ends at 6 PM
  const endHour = 18;
  const remainingHours = endHour - hours;
  const remainingMinutes = 60 - minutes;

  if (remainingHours <= 0) {
    return `${timeString} - Day complete!`;
  }

  return `${timeString} - ${remainingHours}h ${remainingMinutes}m remaining`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function DashboardPageV2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useSelector((state) => state.auth);

  // Data fetching
  const { data, isLoading, error, refetch } = useDashboardData();
  useDashboardSession();
  usePageTracking();

  // Radar view state
  const [isRadarOpen, setIsRadarOpen] = useState(false);

  // Current task tracking (first incomplete high-priority task or first overdue)
  const currentTask = useMemo(() => {
    if (!data) return null;
    const overdueTasks = data?.urgentItems?.overdueTasks || [];
    const dueTodayTasks = data?.urgentItems?.dueTodayTasks || [];

    // Prefer first overdue task, then first due today
    if (overdueTasks.length > 0) return overdueTasks[0];
    if (dueTodayTasks.length > 0) return dueTodayTasks[0];
    return null;
  }, [data]);

  // Task mutations for current task actions
  const completeTask = useMutation({
    mutationFn: (taskId) => api.post(`/tasks/${taskId}/status`, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries(['dashboard'])
  });

  // Keyboard shortcut: 'R' toggles radar
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement.tagName === 'INPUT' ||
                             activeElement.tagName === 'TEXTAREA' ||
                             activeElement.isContentEditable;

      if (!isInputFocused && e.key.toLowerCase() === 'r') {
        setIsRadarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="v2-dashboard v2-dashboard--loading">
        <div className="v2-loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="v2-dashboard v2-dashboard--error">
        <p>Failed to load dashboard</p>
        <button type="button" onClick={() => refetch()} className="v2-btn v2-btn--secondary">
          <RefreshCw className="v2-icon" /> Retry
        </button>
      </div>
    );
  }

  // Extract data from API response
  const tasks = data?.tasks || [];
  const events = data?.events || { today: [], tomorrow: [] };
  const inbox = data?.inbox || [];
  const stats = data?.stats || {};
  const urgentItems = data?.urgentItems || {};

  // Additional data for new widgets
  const activity = data?.activity || [];
  const projects = data?.recentItems?.projects || [];
  const notesCount = data?.recentItems?.notes?.length || 0;

  // Calculate metrics
  const overdueCount = urgentItems.overdueTasks?.length || 0;
  const eventsCount = (events.today?.length || 0) + (events.tomorrow?.length || 0);
  const inboxCount = inbox.length || 0;
  const completedToday = stats.completedTasksToday || 0;
  const totalTodayTasks = (urgentItems.dueTodayTasks?.length || 0) + completedToday;
  const completionPercent = totalTodayTasks > 0
    ? Math.round((completedToday / totalTodayTasks) * 100)
    : 0;

  // Handlers for current task actions
  const handleCompleteTask = () => {
    if (currentTask) {
      completeTask.mutate(currentTask._id);
    }
  };

  const handlePauseTask = () => {
    // Future: implement task pausing with time tracking
    console.log('Pause task:', currentTask?._id);
  };

  const handleSkipTask = () => {
    // Future: implement task skipping (defer to tomorrow)
    console.log('Skip task:', currentTask?._id);
  };

  return (
    <div className="v2-dashboard">
      {/* ================================================================
          HEADER / TOPBAR
          ================================================================ */}
      <header className="v2-topbar">
        <div className="v2-topbar__left">
          <h1 className="v2-greeting">
            Good {getTimeOfDay()}, {currentUser?.name?.split(' ')[0] || currentUser?.profile?.firstName || 'there'}
          </h1>
          <p className="v2-date-display">{formatCurrentDate()}</p>
        </div>
        <div className="v2-topbar__right">
          <WeatherPill />
          <button
            type="button"
            className="v2-radar-btn"
            onClick={() => setIsRadarOpen(true)}
          >
            <Radar className="v2-icon" />
            Radar
            <span className="v2-shortcut">R</span>
          </button>
          <ThemeToggle className="v2-theme-toggle" />
          <UserAvatar user={currentUser} size="sm" onClick={() => navigate('/profile')} />
        </div>
      </header>

      {/* ================================================================
          TODAY'S FOCUS SECTION
          ================================================================ */}
      <section className="v2-focus-section">
        <div className="v2-focus-header">
          <h2 className="v2-focus-title">TODAY'S FOCUS</h2>
          <span className="v2-focus-time">{formatTimeRemaining()}</span>
        </div>

        {/* Metric Cards Row */}
        <div className="v2-metrics-row">
          <MetricCard
            icon="⚠️"
            value={overdueCount}
            label="Overdue"
            type={overdueCount > 0 ? 'danger' : 'default'}
            onClick={() => navigate('/tasks?filter=overdue')}
          />
          <MetricCard
            icon="📅"
            value={eventsCount}
            label="Events"
            onClick={() => navigate('/calendar')}
          />
          <MetricCard
            icon="📥"
            value={inboxCount}
            label="Inbox"
            onClick={() => navigate('/inbox')}
          />
          <MetricCard
            icon="✓"
            value={`${completionPercent}%`}
            label="Completed"
            type={completionPercent >= 80 ? 'success' : 'default'}
          />
        </div>

        {/* Current Task Card */}
        <CurrentTaskCard
          task={currentTask}
          onComplete={handleCompleteTask}
          onPause={handlePauseTask}
          onSkip={handleSkipTask}
        />
      </section>

      {/* ================================================================
          WIDGET GRID - Main content area
          ================================================================ */}
      <div className="v2-widget-grid">
        {/* Row 1: Tasks and Schedule */}
        <TasksWidgetV2
          tasks={tasks}
          overdueTasks={urgentItems.overdueTasks || []}
          dueTodayTasks={urgentItems.dueTodayTasks || []}
        />
        <EventsWidgetV2
          events={events}
          onViewCalendar={() => navigate('/calendar')}
        />

        {/* Row 2: Inbox and Projects */}
        <InboxWidgetV2 items={inbox} />
        <ProjectsWidgetV2
          projects={projects}
          loading={isLoading}
        />

        {/* Row 3: Activity Log and Quick Stats */}
        <ActivityLogWidgetV2
          activity={activity}
          loading={isLoading}
        />
        <QuickStatsWidgetV2
          stats={stats}
          eventsCount={eventsCount}
          notesCount={notesCount}
          loading={isLoading}
        />
      </div>

      {/* ================================================================
          BOTTOM BAR - Keyboard shortcuts
          ================================================================ */}
      <BottomBarV2 />

      {/* ================================================================
          RADAR VIEW OVERLAY
          ================================================================ */}
      <RadarView
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        tasks={tasks}
        events={events}
        inbox={inbox}
      />
    </div>
  );
}

export default DashboardPageV2;
