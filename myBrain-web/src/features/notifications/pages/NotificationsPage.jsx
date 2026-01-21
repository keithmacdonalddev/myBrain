import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  UserPlus,
  Share2,
  MessageSquare,
  CheckCircle,
  FolderKanban,
  Heart,
  Trash2,
  Check,
  Filter
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteReadNotifications,
} from '../hooks/useNotifications';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

const NOTIFICATION_ICONS = {
  connection_request: UserPlus,
  connection_accepted: UserPlus,
  item_shared: Share2,
  share_accepted: Share2,
  new_message: MessageSquare,
  task_completed: CheckCircle,
  project_completed: FolderKanban,
  mention: MessageSquare,
  like: Heart,
  default: Bell,
};

const NOTIFICATION_COLORS = {
  connection_request: 'text-blue-500 bg-blue-500/10',
  connection_accepted: 'text-green-500 bg-green-500/10',
  item_shared: 'text-purple-500 bg-purple-500/10',
  share_accepted: 'text-purple-500 bg-purple-500/10',
  new_message: 'text-primary bg-primary/10',
  task_completed: 'text-green-500 bg-green-500/10',
  project_completed: 'text-green-500 bg-green-500/10',
  mention: 'text-yellow-500 bg-yellow-500/10',
  like: 'text-red-500 bg-red-500/10',
  default: 'text-muted bg-muted/10',
};

const NOTIFICATION_TYPES = [
  { value: null, label: 'All' },
  { value: 'connection_request', label: 'Connection Requests' },
  { value: 'item_shared', label: 'Shared Items' },
  { value: 'new_message', label: 'Messages' },
  { value: 'task_completed', label: 'Tasks' },
];

function NotificationCard({ notification, onRead, onDelete, onClick }) {
  const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
  const colorClass = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.default;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification._id);
    }
    if (notification.actionUrl) {
      onClick(notification.actionUrl);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 bg-panel border border-border rounded-lg ${
        !notification.isRead ? 'border-l-4 border-l-primary' : ''
      } hover:border-primary/30 transition-colors cursor-pointer`}
      onClick={handleClick}
    >
      {/* Actor avatar or icon */}
      {notification.actorId ? (
        <UserAvatar user={notification.actorId} size="md" showPresence={false} />
      ) : (
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`${!notification.isRead ? 'font-semibold text-text' : 'text-text'}`}>
            {notification.title}
          </p>
          <span className="text-xs text-muted whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>

        {notification.body && (
          <p className="text-sm text-muted mt-1">
            {notification.body}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification._id);
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark as read
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification._id);
            }}
            className="text-xs text-red-500 hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState({ unreadOnly: false, type: null });

  const { data, isLoading } = useNotifications({
    limit: 100,
    unreadOnly: filter.unreadOnly,
    type: filter.type,
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteReadMutation = useDeleteReadNotifications();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const total = data?.total || 0;

  const handleNotificationClick = (actionUrl) => {
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
          </h1>
          <p className="text-muted mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={() => deleteReadMutation.mutate()}
            disabled={deleteReadMutation.isPending || total === unreadCount}
            className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            Clear read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter(f => ({ ...f, unreadOnly: !f.unreadOnly }))}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter.unreadOnly
              ? 'bg-primary text-white'
              : 'bg-panel border border-border text-muted hover:text-text'
          }`}
        >
          Unread only
        </button>

        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type.value || 'all'}
            onClick={() => setFilter(f => ({ ...f, type: type.value }))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter.type === type.value
                ? 'bg-primary text-white'
                : 'bg-panel border border-border text-muted hover:text-text'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter.unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            filter.unreadOnly
              ? "You've read all your notifications."
              : 'When you get notifications, they will appear here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              onRead={(id) => markAsReadMutation.mutate(id)}
              onDelete={(id) => deleteNotificationMutation.mutate(id)}
              onClick={handleNotificationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
