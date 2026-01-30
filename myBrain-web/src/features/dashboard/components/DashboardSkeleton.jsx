/**
 * =============================================================================
 * DASHBOARDSKELETON.JSX - Dashboard Loading Skeleton
 * =============================================================================
 *
 * Matches the exact layout of DashboardPage to prevent CLS (Cumulative Layout
 * Shift) during initial load. Mirrors:
 * - dash-container structure
 * - DashboardHeader (greeting + weather)
 * - QuickCapture zone
 * - 3-column dash-layout grid with widget placeholders
 */

import { Skeleton } from '../../../components/ui/Skeleton';

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

// Header skeleton
function HeaderSkeleton() {
  return (
    <div className="dash-header flex items-center justify-between mb-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-36" />
      </div>
      <WeatherWidgetCompactSkeleton />
    </div>
  );
}

/**
 * DashboardSkeleton
 *
 * Full dashboard layout skeleton that matches DashboardPage structure:
 * - Header with greeting and compact weather
 * - QuickCapture zone
 * - 3-column layout with widget placeholders
 */
export default function DashboardSkeleton() {
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
        <div className="dash-col">
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={140} />
          <WidgetSkeleton height={140} />
        </div>

        {/* Right column - Notes, Inbox, Projects, Activity */}
        <div className="dash-col">
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={140} />
          <WidgetSkeleton height={180} />
          <WidgetSkeleton height={120} />
        </div>
      </div>
    </div>
  );
}
