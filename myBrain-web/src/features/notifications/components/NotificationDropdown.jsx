import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  UserPlus,
  Share2,
  MessageSquare,
  CheckCircle,
  FolderKanban,
  Heart,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../hooks/useNotifications';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';

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

function NotificationItem({ notification, onRead, onClick }) {
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
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-bg transition-colors ${
        !notification.isRead ? 'bg-primary/5' : ''
      }`}
    >
      {/* Actor avatar or icon */}
      {notification.actorId ? (
        <UserAvatar user={notification.actorId} size="sm" showPresence={false} />
      ) : (
        <div className={`p-2 rounded-full ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.isRead ? 'font-medium text-text' : 'text-muted'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
      )}
    </button>
  );
}

function NotificationDropdown({ onClose, onViewAll }) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ limit: 10 });
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationClick = (actionUrl) => {
    onClose();
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-panel border border-border rounded-xl shadow-theme-floating overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-text">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onRead={(id) => markAsReadMutation.mutate(id)}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1 p-3 border-t border-border text-sm text-primary hover:bg-bg transition-colors"
        >
          View all notifications
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default NotificationDropdown;
