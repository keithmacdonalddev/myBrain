/**
 * =============================================================================
 * DASHBOARDSKELETON.JSX - Dashboard Loading Skeleton
 * =============================================================================
 *
 * Matches the exact layout of DashboardPage to prevent CLS (Cumulative Layout
 * Shift) during initial load. Supports both V1 and V2 dashboard layouts.
 *
 * V1 Layout (default):
 * - dash-container structure
 * - DashboardHeader (greeting + weather)
 * - QuickCapture zone
 * - 3-column dash-layout grid with widget placeholders
 *
 * V2 Layout (dashboardV2Enabled flag):
 * - v2-dashboard structure
 * - Header with greeting and radar button
 * - Stats bar with 4 stat cards
 * - Quick actions row
 * - 2-column grid with Tasks, Inbox, Events, Notes widgets
 */

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { Skeleton } from '../../../components/ui/Skeleton';

// Import V2 styles for skeleton
import '../styles/dashboard-v2.css';

// Widget skeleton with configurable height
function WidgetSkeleton({ height = 180, className = '' }) {
  return (
    <div
      className={`dash-widget bg-panel border border-border rounded-xl p-4 ${className}`}
      style={{ minHeight: height }}
    >
      {/* Widget header */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      {/* Widget content lines */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Weather widget compact skeleton
function WeatherWidgetCompactSkeleton() {
  return (
    <div className="weather-compact bg-panel glass-subtle border border-border rounded-xl p-3">
      {/* City name + actions */}
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </div>
      {/* Main: icon + temp + hi/lo */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-14 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-1 ml-auto">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
      {/* Feels like */}
      <Skeleton className="h-3 w-24 mt-2" />
    </div>
  );
}

// QuickCapture zone skeleton
function QuickCaptureSkeleton() {
  return (
    <div className="bg-panel border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-5 w-48" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Header skeleton - matches exact structure of DashboardHeader.jsx
function HeaderSkeleton() {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        {/* Date skeleton - matches dashboard-date span */}
        <Skeleton className="h-4 w-28 mb-1" />
        {/* Greeting skeleton - matches dashboard-greeting h1 */}
        <Skeleton className="h-8 w-48" />
        {/* Subtitle skeleton - matches dashboard-subtitle p */}
        <Skeleton className="h-5 w-56 mt-1" />
      </div>
      <div className="dashboard-header-right">
        <WeatherWidgetCompactSkeleton />
      </div>
    </header>
  );
}

/**
 * DashboardSkeletonV1
 *
 * Full dashboard layout skeleton that matches DashboardPage structure:
 * - Header with greeting and compact weather
 * - QuickCapture zone
 * - 3-column layout with widget placeholders
 */
function DashboardSkeletonV1() {
  return (
    <div className="dash-container dash-skeleton">
      {/* Header skeleton - greeting + weather compact */}
      <HeaderSkeleton />

      {/* QuickCapture zone skeleton */}
      <QuickCaptureSkeleton />

      {/* Main Grid - 3 column layout matching dash-layout */}
      <div className="dash-layout">
        {/* Left column - Tasks widget (taller) */}
        <div className="dash-col">
          <WidgetSkeleton height={320} />
        </div>

        {/* Middle column - Calendar, Reminders, Goals */}
        {/* All widgets must be at least 180px to match .dash-widget min-height in dashboard-rich.css */}
        <div className="dash-col">
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={180} />
        </div>

        {/* Right column - Notes, Inbox, Projects, Activity */}
        {/* All widgets must be at least 180px to match .dash-widget min-height in dashboard-rich.css */}
        <div className="dash-col">
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={180} />
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   V2 SKELETON COMPONENTS
   Match the V2 dashboard design system with proper shimmer animations
   ============================================================================= */

/**
 * V2 Skeleton base component with V2 styling
 * Uses V2 CSS variables for background and shimmer animation
 */
function SkeletonV2({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-v2 ${className}`}
      style={style}
    />
  );
}

/**
 * V2 Header skeleton - matches V2 dashboard header
 * Greeting text + Radar button
 */
function HeaderSkeletonV2() {
  return (
    <header className="v2-dashboard__header">
      <div className="v2-dashboard__greeting">
        {/* Greeting heading */}
        <SkeletonV2 className="skeleton-v2-heading" style={{ width: '280px', height: '32px' }} />
        {/* Subtitle */}
        <SkeletonV2 style={{ width: '200px', height: '18px', marginTop: '8px' }} />
      </div>
      {/* Radar button placeholder */}
      <SkeletonV2 style={{ width: '100px', height: '36px', borderRadius: 'var(--v2-radius-md)' }} />
    </header>
  );
}

/**
 * V2 Stats Bar skeleton - 4 stat cards in a row
 */
function StatsBarSkeletonV2() {
  return (
    <div className="v2-stats-bar">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="v2-stat-card">
          {/* Icon placeholder */}
          <SkeletonV2 style={{ width: '40px', height: '40px', borderRadius: 'var(--v2-radius-sm)' }} />
          <div className="v2-stat-content">
            {/* Value */}
            <SkeletonV2 style={{ width: '48px', height: '28px', marginBottom: '4px' }} />
            {/* Label */}
            <SkeletonV2 style={{ width: '64px', height: '14px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * V2 Quick Actions skeleton - row of action buttons
 */
function QuickActionsSkeletonV2() {
  return (
    <div className="v2-quick-actions" style={{ marginBottom: 'var(--v2-spacing-lg)' }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonV2
          key={i}
          style={{
            width: '120px',
            height: '36px',
            borderRadius: 'var(--v2-radius-md)'
          }}
        />
      ))}
    </div>
  );
}

/**
 * V2 Widget skeleton - matches v2-widget container
 * @param {string} title - Widget title for header
 * @param {number} itemCount - Number of list items to show
 */
function WidgetSkeletonV2({ title = '', itemCount = 4 }) {
  return (
    <section className="v2-widget">
      {/* Widget header */}
      <div className="v2-widget__header">
        <SkeletonV2 style={{ width: '80px', height: '16px' }} />
        <SkeletonV2 style={{ width: '40px', height: '16px' }} />
      </div>

      {/* Widget content - list items */}
      <div className="v2-widget__content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--v2-spacing-xs)' }}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--v2-spacing-sm)',
                padding: 'var(--v2-spacing-sm) var(--v2-spacing-md)',
                background: 'var(--v2-bg-elevated)',
                borderRadius: 'var(--v2-radius-md)'
              }}
            >
              {/* Checkbox/icon placeholder */}
              <SkeletonV2 style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0 }} />
              {/* Title placeholder */}
              <SkeletonV2 style={{ flex: 1, height: '16px', maxWidth: `${70 + (i % 3) * 10}%` }} />
              {/* Date/meta placeholder */}
              <SkeletonV2 style={{ width: '50px', height: '14px', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * V2 Tasks Widget skeleton - includes group headers
 */
function TasksWidgetSkeletonV2() {
  return (
    <section className="v2-widget v2-widget--tasks">
      {/* Widget header */}
      <div className="v2-widget__header">
        <SkeletonV2 style={{ width: '60px', height: '16px' }} />
        <SkeletonV2 style={{ width: '50px', height: '16px' }} />
      </div>

      {/* Widget content with task groups */}
      <div className="v2-widget__content">
        {/* Due Today group */}
        <div className="v2-task-group">
          <SkeletonV2 style={{ width: '100px', height: '14px', marginBottom: 'var(--v2-spacing-sm)' }} />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--v2-spacing-sm)',
                padding: 'var(--v2-spacing-sm) var(--v2-spacing-md)',
                background: 'var(--v2-bg-elevated)',
                borderRadius: 'var(--v2-radius-md)',
                marginBottom: 'var(--v2-spacing-xs)'
              }}
            >
              <SkeletonV2 style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0 }} />
              <SkeletonV2 style={{ flex: 1, height: '16px', maxWidth: `${60 + i * 10}%` }} />
              <SkeletonV2 style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Upcoming group */}
        <div className="v2-task-group">
          <SkeletonV2 style={{ width: '80px', height: '14px', marginBottom: 'var(--v2-spacing-sm)' }} />
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--v2-spacing-sm)',
                padding: 'var(--v2-spacing-sm) var(--v2-spacing-md)',
                background: 'var(--v2-bg-elevated)',
                borderRadius: 'var(--v2-radius-md)',
                marginBottom: 'var(--v2-spacing-xs)'
              }}
            >
              <SkeletonV2 style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0 }} />
              <SkeletonV2 style={{ flex: 1, height: '16px', maxWidth: `${50 + i * 15}%` }} />
              <SkeletonV2 style={{ width: '45px', height: '14px', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * V2 Events Widget skeleton - includes time column
 */
function EventsWidgetSkeletonV2() {
  return (
    <section className="v2-widget">
      {/* Widget header */}
      <div className="v2-widget__header">
        <SkeletonV2 style={{ width: '70px', height: '16px' }} />
        <SkeletonV2 style={{ width: '30px', height: '20px', borderRadius: 'var(--v2-radius-full)' }} />
      </div>

      {/* Widget content with event items */}
      <div className="v2-widget__content">
        {/* Today section */}
        <div className="v2-event-group">
          <SkeletonV2 style={{ width: '50px', height: '12px', marginBottom: 'var(--v2-spacing-sm)' }} />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--v2-spacing-sm) var(--v2-spacing-md)',
                background: 'var(--v2-bg-elevated)',
                borderRadius: 'var(--v2-radius-md)',
                borderLeft: '3px solid var(--v2-border-default)',
                marginBottom: 'var(--v2-spacing-xs)'
              }}
            >
              {/* Time column */}
              <div style={{ minWidth: '60px', paddingRight: 'var(--v2-spacing-md)' }}>
                <SkeletonV2 style={{ width: '45px', height: '16px', marginBottom: '2px' }} />
                <SkeletonV2 style={{ width: '35px', height: '12px' }} />
              </div>
              {/* Event content */}
              <div style={{ flex: 1 }}>
                <SkeletonV2 style={{ width: `${60 + i * 10}%`, height: '16px', marginBottom: '4px' }} />
                <SkeletonV2 style={{ width: '80px', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * DashboardSkeletonV2
 *
 * Full V2 dashboard layout skeleton that matches DashboardPageV2 structure:
 * - Header with greeting and radar button
 * - Stats bar with 4 stat cards
 * - Quick actions row
 * - 2-column grid with Tasks, Inbox, Events, Notes widgets
 */
function DashboardSkeletonV2() {
  return (
    <div className="v2-dashboard v2-dashboard--skeleton">
      {/* Header skeleton */}
      <HeaderSkeletonV2 />

      {/* Stats bar skeleton */}
      <StatsBarSkeletonV2 />

      {/* Quick actions skeleton */}
      <QuickActionsSkeletonV2 />

      {/* Main Grid - 2 column layout matching v2-dashboard__grid */}
      <div className="v2-dashboard__grid">
        {/* Left column - Tasks and Inbox */}
        <div className="v2-dashboard__col v2-dashboard__col--primary">
          <TasksWidgetSkeletonV2 />
          <WidgetSkeletonV2 itemCount={3} />
        </div>

        {/* Right column - Events and Notes */}
        <div className="v2-dashboard__col v2-dashboard__col--secondary">
          <EventsWidgetSkeletonV2 />
          <WidgetSkeletonV2 itemCount={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton - Main export
 *
 * Routes to V1 or V2 skeleton based on dashboardV2Enabled feature flag.
 * This ensures skeleton matches the actual dashboard layout that will load.
 */
export default function DashboardSkeleton() {
  const dashboardV2Enabled = useFeatureFlag('dashboardV2Enabled');

  if (dashboardV2Enabled) {
    return <DashboardSkeletonV2 />;
  }

  return <DashboardSkeletonV1 />;
}
