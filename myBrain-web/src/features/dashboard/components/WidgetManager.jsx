/**
 * =============================================================================
 * WIDGETMANAGER.JSX - Widget Management Modal
 * =============================================================================
 *
 * A modal that allows users to manage their dashboard widgets:
 * - See all available widgets
 * - Show/hide widgets
 * - See which widgets are pinned
 * - Reset to defaults
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  X,
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
  FileText,
  HelpCircle
} from 'lucide-react';

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
  // Note: Weather widget is in the sidebar and managed via Settings → Weather
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
    implemented: false
  }
];

const CATEGORIES = [
  { id: 'productivity', label: 'Productivity' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'overview', label: 'Overview' },
  { id: 'utility', label: 'Utility' },
  { id: 'social', label: 'Social' },
  { id: 'content', label: 'Content' }
];

/**
 * WidgetManager
 * -------------
 * Modal for managing dashboard widgets
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Close handler
 * @param {Array} pinnedWidgets - Currently pinned widgets
 * @param {Array} hiddenWidgets - Currently hidden widgets
 * @param {Function} onHide - Hide widget handler
 * @param {Function} onShow - Show widget handler
 * @param {Function} onReset - Reset to defaults handler
 */
export default function WidgetManager({
  isOpen,
  onClose,
  pinnedWidgets = [],
  hiddenWidgets = [],
  onHide,
  onShow,
  onReset
}) {
  const [filter, setFilter] = useState('all');

  if (!isOpen) return null;

  const pinnedIds = new Set(pinnedWidgets.map(pw => pw.widgetId));
  const hiddenIds = new Set(hiddenWidgets);

  const filteredWidgets = filter === 'all'
    ? ALL_WIDGETS
    : ALL_WIDGETS.filter(w => w.category === filter);

  const handleToggleVisibility = (widgetId) => {
    if (hiddenIds.has(widgetId)) {
      onShow?.(widgetId);
    } else {
      onHide?.(widgetId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-panel border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Manage Widgets</h2>
            <p className="text-sm text-muted">Show, hide, or pin widgets on your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
              ${filter === 'all' ? 'bg-primary text-white' : 'text-muted hover:text-text hover:bg-bg'}`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                ${filter === cat.id ? 'bg-primary text-white' : 'text-muted hover:text-text hover:bg-bg'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredWidgets.map(widget => {
              const Icon = widget.icon;
              const isPinned = pinnedIds.has(widget.id);
              const isHidden = hiddenIds.has(widget.id);
              const isImplemented = widget.implemented;

              return (
                <div
                  key={widget.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                    ${isHidden ? 'bg-bg/50 border-border opacity-60' : 'bg-bg border-border hover:border-primary/30'}
                    ${!isImplemented ? 'opacity-50' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 ${widget.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${widget.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text truncate">
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
                    <p className="text-xs text-muted truncate">{widget.description}</p>
                  </div>

                  {/* Toggle */}
                  {isImplemented && (
                    <button
                      onClick={() => handleToggleVisibility(widget.id)}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0
                        ${isHidden
                          ? 'text-muted hover:text-text hover:bg-panel'
                          : 'text-primary hover:bg-primary/10'}`}
                      title={isHidden ? 'Show widget' : 'Hide widget'}
                    >
                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg/50">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-text transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
