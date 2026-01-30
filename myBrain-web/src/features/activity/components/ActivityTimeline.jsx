/**
 * ActivityTimeline Component
 *
 * Full timeline of user activity with category filter, search, and grouping.
 * Shows all tracked actions in chronological order with rich metadata display.
 *
 * ENRICHED DISPLAY:
 * - Entity titles: "Created note: 'Project Planning'"
 * - Device info for logins: "Signed in from Chrome on Windows"
 * - File details: "Uploaded: report.pdf (2.4 MB)"
 * - Context: "Created note: 'Meeting Notes' in Work"
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
  Monitor,
  Smartphone,
  Tablet,
  Folder,
  Tag,
  AlertCircle,
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

// Priority labels for visual display
const PRIORITY_LABELS = {
  high: { label: 'High', color: 'text-red-500' },
  medium: { label: 'Medium', color: 'text-amber-500' },
  low: { label: 'Low', color: 'text-green-500' },
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
 * Get device icon based on device type
 */
function getDeviceIcon(deviceType) {
  switch (deviceType) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    case 'desktop':
    default:
      return Monitor;
  }
}

/**
 * Format device info for display
 * Returns: "Chrome on Windows" or "Safari on iOS"
 */
function formatDeviceInfo(deviceInfo) {
  if (!deviceInfo) return null;
  const { browser, os } = deviceInfo;
  if (!browser && !os) return null;
  if (browser && os) return `${browser} on ${os}`;
  return browser || os;
}

/**
 * ActivityMetadata Component
 * Renders enriched metadata below the main action text
 */
function ActivityMetadata({ activity }) {
  const metadata = [];

  // Entity title (note, task, project name)
  if (activity.entityTitle) {
    metadata.push(
      <span key="title" className="font-medium text-text">
        &apos;{activity.entityTitle}&apos;
      </span>
    );
  }

  // File info (name, size, type)
  if (activity.fileInfo) {
    const { name, size } = activity.fileInfo;
    const parts = [];
    if (name) parts.push(name);
    if (size) parts.push(`(${size})`);
    if (parts.length > 0) {
      metadata.push(
        <span key="file" className="text-muted">
          {parts.join(' ')}
        </span>
      );
    }
  }

  // Life area or project context
  if (activity.lifeArea || activity.project) {
    const context = activity.project || activity.lifeArea;
    metadata.push(
      <span key="context" className="flex items-center gap-1 text-muted">
        <Folder className="w-3 h-3" />
        {context}
      </span>
    );
  }

  // Priority for tasks
  if (activity.priority && PRIORITY_LABELS[activity.priority]) {
    const { label, color } = PRIORITY_LABELS[activity.priority];
    metadata.push(
      <span key="priority" className={`flex items-center gap-1 ${color}`}>
        <AlertCircle className="w-3 h-3" />
        {label}
      </span>
    );
  }

  // Device info for login activities
  if (activity.deviceInfo) {
    const deviceText = formatDeviceInfo(activity.deviceInfo);
    if (deviceText) {
      const DeviceIcon = getDeviceIcon(activity.deviceInfo.deviceType);
      metadata.push(
        <span key="device" className="flex items-center gap-1 text-muted">
          <DeviceIcon className="w-3 h-3" />
          {deviceText}
        </span>
      );
    }
  }

  // Settings changed
  if (activity.settingChanged) {
    metadata.push(
      <span key="setting" className="flex items-center gap-1 text-muted">
        <Tag className="w-3 h-3" />
        {activity.settingChanged}
      </span>
    );
  }

  if (metadata.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
      {metadata}
    </div>
  );
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

    // Apply search filter - search across action, entity title, and context
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((a) => {
        // Search in action text
        if (a.action?.toLowerCase().includes(query)) return true;
        // Search in entity title
        if (a.entityTitle?.toLowerCase().includes(query)) return true;
        // Search in life area
        if (a.lifeArea?.toLowerCase().includes(query)) return true;
        // Search in project name
        if (a.project?.toLowerCase().includes(query)) return true;
        // Search in file name
        if (a.fileInfo?.name?.toLowerCase().includes(query)) return true;
        return false;
      });
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
                        {/* Enriched metadata display */}
                        <ActivityMetadata activity={activity} />
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
                className="flex items-start gap-3 p-3 bg-panel border border-border rounded-lg"
              >
                <div className={`p-1.5 rounded-lg bg-bg flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text">{activity.action}</p>
                  {/* Enriched metadata display */}
                  <ActivityMetadata activity={activity} />
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <p className="text-xs text-muted">
                    {formatDate(activity.timestamp, { includeTime: true })}
                  </p>
                  {!activity.success && (
                    <span className="text-xs text-[var(--danger)]">(failed)</span>
                  )}
                </div>
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
