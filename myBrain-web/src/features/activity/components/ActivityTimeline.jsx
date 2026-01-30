/**
 * ActivityTimeline Component
 *
 * Full timeline of user activity with category filter, search, and grouping.
 * Shows all tracked actions in chronological order.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Search,
  LogIn,
  Shield,
  FileText,
  Settings,
  Calendar,
} from 'lucide-react';
import { activityKeys } from '../hooks/useActivityData';
import { activityApi } from '../../../lib/api';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/dateUtils';

// Category configuration with icons and colors
const CATEGORIES = {
  all: { label: 'All', icon: Activity, color: 'text-muted' },
  account: { label: 'Account', icon: LogIn, color: 'text-blue-500' },
  security: { label: 'Security', icon: Shield, color: 'text-amber-500' },
  content: { label: 'Content', icon: FileText, color: 'text-green-500' },
  settings: { label: 'Settings', icon: Settings, color: 'text-purple-500' },
};

/**
 * Get icon component for a category
 */
function getCategoryIcon(category) {
  return CATEGORIES[category]?.icon || Activity;
}

/**
 * Get color class for a category
 */
function getCategoryColor(category) {
  return CATEGORIES[category]?.color || 'text-muted';
}

/**
 * Activity timeline with filters and grouping options
 */
export default function ActivityTimeline() {
  // Filter and display state
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(true);
  const [days, setDays] = useState(30);

  // Fetch activity data
  const { data, isLoading } = useQuery({
    queryKey: activityKeys.timeline({ days, limit: 200 }),
    queryFn: async () => {
      const response = await activityApi.getActivity({ days, limit: 200 });
      return response.data;
    },
  });

  // Filter activities by category and search
  const filteredActivities = useMemo(() => {
    if (!data?.timeline) return [];

    // Flatten all activities from timeline
    const allActivities = data.timeline.flatMap((day) =>
      day.activities.map((activity) => ({
        ...activity,
        date: day.date,
      }))
    );

    // Apply category filter
    let filtered = allActivities;
    if (category !== 'all') {
      filtered = filtered.filter((a) => a.category === category);
    }

    // Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.action?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data?.timeline, category, search]);

  // Group activities by date if grouped mode is on
  const groupedActivities = useMemo(() => {
    if (!grouped) return null;

    const groups = {};
    filteredActivities.forEach((activity) => {
      const date = activity.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]) - new Date(a[0])
    );
  }, [filteredActivities, grouped]);

  // Format date header
  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton.List count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          />
        </div>

        {/* Time range selector */}
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>

        {/* Grouped toggle */}
        <button
          onClick={() => setGrouped(!grouped)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
            grouped
              ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'border-border text-muted hover:border-[var(--primary)]/50'
          }`}
        >
          Grouped
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORIES).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                category === key
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-border text-muted hover:border-[var(--primary)]/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Activities display */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activities found"
          description={
            search
              ? `No activities match "${search}"`
              : 'Your activity will appear here as you use myBrain'
          }
        />
      ) : grouped && groupedActivities ? (
        // Grouped view
        <div className="space-y-6">
          {groupedActivities.map(([date, activities]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted" />
                <span className="text-sm font-medium text-text">
                  {formatDateHeader(date)}
                </span>
                <span className="text-xs text-muted">
                  ({activities.length} actions)
                </span>
              </div>

              <div className="border-l-2 border-border pl-4 ml-2 space-y-3">
                {activities.map((activity) => {
                  const Icon = getCategoryIcon(activity.category);
                  const colorClass = getCategoryColor(activity.category);

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg bg-bg flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">{activity.action}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {!activity.success && (
                            <span className="text-[var(--danger)] ml-2">(failed)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat list view
        <div className="space-y-2">
          {filteredActivities.map((activity) => {
            const Icon = getCategoryIcon(activity.category);
            const colorClass = getCategoryColor(activity.category);

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 bg-panel border border-border rounded-lg"
              >
                <div className={`p-1.5 rounded-lg bg-bg flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{activity.action}</p>
                </div>
                <p className="text-xs text-muted flex-shrink-0">
                  {formatDate(activity.timestamp, { includeTime: true })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer with total count */}
      {data?.total > 0 && (
        <p className="text-xs text-muted text-center pt-4 border-t border-border">
          Showing {filteredActivities.length} of {data.total} activities from the last {days} days
        </p>
      )}
    </div>
  );
}
