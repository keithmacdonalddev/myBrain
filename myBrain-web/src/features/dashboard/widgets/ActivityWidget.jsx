/**
 * =============================================================================
 * ACTIVITYWIDGET.JSX - Social Activity Feed Widget
 * =============================================================================
 *
 * Shows recent activities from the user and their connections.
 * Displays project completions, new connections, shared items, etc.
 *
 * SIZE: default (4 columns)
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  UserPlus,
  Share2,
  FileText,
  Upload
} from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetListItem
} from '../components/DashboardGrid';
import UserAvatar from '../../../components/ui/UserAvatar';

/**
 * Get icon and color for activity type
 */
function getActivityIcon(type) {
  switch (type) {
    case 'project_created':
    case 'project_updated':
      return { icon: <FolderKanban className="w-4 h-4" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
    case 'project_completed':
      return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500', bg: 'bg-green-500/10' };
    case 'task_completed':
      return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    case 'connection_made':
      return { icon: <UserPlus className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 'item_shared':
      return { icon: <Share2 className="w-4 h-4" />, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    case 'note_created':
    case 'note_updated':
      return { icon: <FileText className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'file_uploaded':
      return { icon: <Upload className="w-4 h-4" />, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
    default:
      return { icon: <Activity className="w-4 h-4" />, color: 'text-muted', bg: 'bg-muted/10' };
  }
}

/**
 * Get human-readable activity message
 */
function getActivityMessage(activity) {
  const title = activity.entitySnapshot?.title || 'an item';

  switch (activity.type) {
    case 'project_created':
      return `created project "${title}"`;
    case 'project_updated':
      return `updated project "${title}"`;
    case 'project_completed':
      return `completed project "${title}"`;
    case 'task_created':
      return `created task "${title}"`;
    case 'task_completed':
      return `completed task "${title}"`;
    case 'note_created':
      return `created note "${title}"`;
    case 'note_updated':
      return `updated note "${title}"`;
    case 'file_uploaded':
      return `uploaded "${title}"`;
    case 'connection_made':
      return `connected with ${title}`;
    case 'item_shared':
      return `shared "${title}"`;
    case 'profile_updated':
      return 'updated their profile';
    case 'status_updated':
      return 'updated their status';
    default:
      return 'did something';
  }
}

/**
 * Get user display name
 */
function getUserName(user) {
  if (!user) return 'Someone';
  return user.profile?.displayName ||
         user.profile?.firstName ||
         user.email?.split('@')[0] ||
         'Someone';
}

/**
 * ActivityWidget
 * --------------
 * @param {Array} activities - Recent activities from connections
 * @param {boolean} isLoading - Loading state
 * @param {string} currentUserId - Current user's ID for "You" display
 */
export default function ActivityWidget({
  activities = [],
  isLoading = false,
  currentUserId
}) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<Activity className="w-4 h-4 text-violet-500" />}
          iconBg="bg-violet-500/10"
          title="Activity"
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
        icon={<Activity className="w-4 h-4 text-violet-500" />}
        iconBg="bg-violet-500/10"
        title="Activity"
      />

      <WidgetBody>
        {activities.length === 0 ? (
          <WidgetEmpty
            icon={<Activity className="w-8 h-8" />}
            title="No recent activity"
            text="Connect with others to see their updates here."
          />
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const { icon, color, bg } = getActivityIcon(activity.type);
              const isOwnActivity = activity.userId?._id === currentUserId;
              const userName = isOwnActivity ? 'You' : getUserName(activity.userId);

              return (
                <div
                  key={activity._id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-bg transition-colors"
                >
                  {/* User avatar or activity icon */}
                  {activity.userId && !isOwnActivity ? (
                    <UserAvatar user={activity.userId} size="sm" />
                  ) : (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center ${color}`}>
                      {icon}
                    </div>
                  )}

                  {/* Activity content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text leading-snug">
                      <span className="font-medium">{userName}</span>
                      {' '}
                      <span className="text-muted">{getActivityMessage(activity)}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <Link to="/app/connections" className="widget-footer-link">
          View connections <ChevronRight className="w-4 h-4" />
        </Link>
      </WidgetFooter>
    </>
  );
}

ActivityWidget.defaultSize = 'default';
