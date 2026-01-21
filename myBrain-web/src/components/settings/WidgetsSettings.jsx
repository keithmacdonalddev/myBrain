/**
 * =============================================================================
 * WIDGETSSETTINGS.JSX - Dashboard Widgets Settings
 * =============================================================================
 *
 * Settings for managing dashboard widgets:
 * - Show/hide widgets
 * - See which widgets are pinned
 * - Reset to defaults
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Pin,
  RotateCcw,
  CheckSquare,
  Calendar,
  FolderKanban,
  TrendingUp,
  Inbox,
  Clock,
  Bell,
  MessageSquare,
  Share2,
  Activity,
  Image,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useDashboardData, useDashboardPreferences } from '../../features/dashboard/hooks/useDashboardData';

/**
 * All available widgets in the system
 */
const ALL_WIDGETS = [
  {
    id: 'tasks',
    name: "Today's Tasks",
    description: 'Overdue and due today tasks',
    icon: CheckSquare,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    category: 'productivity',
    implemented: true
  },
  {
    id: 'events',
    name: "Today's Events",
    description: 'Calendar events for today',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    category: 'productivity',
    implemented: true
  },
  {
    id: 'calendar',
    name: 'Mini Calendar',
    description: 'Monthly calendar view',
    icon: Calendar,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    category: 'productivity',
    implemented: true
  },
  {
    id: 'projects',
    name: 'Active Projects',
    description: 'Projects with progress',
    icon: FolderKanban,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    category: 'productivity',
    implemented: true
  },
  {
    id: 'stats',
    name: 'Your Progress',
    description: 'Task and project statistics',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'overview',
    implemented: true
  },
  {
    id: 'inbox',
    name: 'Inbox',
    description: 'Unprocessed notes',
    icon: Inbox,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    category: 'attention',
    implemented: true
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Clock and date display',
    icon: Clock,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    category: 'utility',
    implemented: true
  },
  // Not yet implemented widgets
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Recent notifications',
    icon: Bell,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    category: 'attention',
    implemented: false
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Unread conversations',
    icon: MessageSquare,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    category: 'attention',
    implemented: false
  },
  {
    id: 'shared',
    name: 'Shared With You',
    description: 'Items shared by others',
    icon: Share2,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    category: 'social',
    implemented: false
  },
  {
    id: 'activity',
    name: 'Activity Feed',
    description: 'Recent activity',
    icon: Activity,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    category: 'overview',
    implemented: false
  },
  {
    id: 'media',
    name: 'Recent Media',
    description: 'Images and files',
    icon: Image,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    category: 'content',
    implemented: false
  },
  {
    id: 'featureGuide',
    name: 'Feature Guide',
    description: 'Learn about features',
    icon: HelpCircle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    category: 'utility',
    implemented: true
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Widgets' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'overview', label: 'Overview' },
  { id: 'utility', label: 'Utility' },
  { id: 'social', label: 'Social' },
  { id: 'content', label: 'Content' }
];

/**
 * WidgetsSettings
 * ---------------
 * Settings component for managing dashboard widgets
 */
export default function WidgetsSettings() {
  const [filter, setFilter] = useState('all');

  // Get dashboard data for current preferences
  const { data: dashboardData, isLoading: isLoadingData } = useDashboardData();

  // Get preference mutation functions
  const { hideWidget, showWidget, resetPreferences, isUpdating } = useDashboardPreferences();

  const pinnedWidgets = dashboardData?.preferences?.pinnedWidgets || [];
  const hiddenWidgets = dashboardData?.preferences?.hiddenWidgets || [];

  const pinnedIds = new Set(pinnedWidgets.map(pw => pw.widgetId));
  const hiddenIds = new Set(hiddenWidgets);

  const filteredWidgets = filter === 'all'
    ? ALL_WIDGETS
    : ALL_WIDGETS.filter(w => w.category === filter);

  const handleToggleVisibility = (widgetId) => {
    if (hiddenIds.has(widgetId)) {
      showWidget(widgetId);
    } else {
      hideWidget(widgetId);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all widget settings to defaults? This will unpin all widgets and show all hidden widgets.')) {
      resetPreferences();
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Dashboard Widgets</h2>
        <p className="text-sm text-muted">Choose which widgets appear on your dashboard</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${filter === cat.id
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-bg border border-border'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Widget list */}
      <div className="space-y-2">
        {filteredWidgets.map(widget => {
          const Icon = widget.icon;
          const isPinned = pinnedIds.has(widget.id);
          const isHidden = hiddenIds.has(widget.id);
          const isImplemented = widget.implemented;

          return (
            <div
              key={widget.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all
                ${isHidden ? 'bg-bg/50 border-border opacity-60' : 'bg-bg border-border'}
                ${!isImplemented ? 'opacity-50' : ''}`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 ${widget.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${widget.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text">
                    {widget.name}
                  </span>
                  {isPinned && (
                    <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                  {!isImplemented && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning rounded font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{widget.description}</p>
              </div>

              {/* Toggle */}
              {isImplemented && (
                <button
                  onClick={() => handleToggleVisibility(widget.id)}
                  disabled={isUpdating}
                  className={`p-2.5 rounded-lg transition-colors flex-shrink-0
                    ${isHidden
                      ? 'text-muted hover:text-text hover:bg-panel'
                      : 'text-primary hover:bg-primary/10'}`}
                  title={isHidden ? 'Show widget' : 'Hide widget'}
                >
                  {isHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleReset}
          disabled={isUpdating}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted hover:text-text transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
