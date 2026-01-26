import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NotificationsPage from './NotificationsPage';

// Mock the notification hooks
vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationAsRead: vi.fn(),
  useMarkAllNotificationsAsRead: vi.fn(),
  useDeleteNotification: vi.fn(),
  useDeleteReadNotifications: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock UserAvatar component
vi.mock('../../../components/ui/UserAvatar', () => ({
  default: ({ user }) => (
    <div data-testid="user-avatar">{user?.name || 'Avatar'}</div>
  ),
}));

import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteReadNotifications,
} from '../hooks/useNotifications';

// Sample notification data
const mockNotifications = [
  {
    _id: 'notif1',
    type: 'connection_request',
    title: 'John Doe sent you a connection request',
    body: 'Hi, I would like to connect with you',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    actorId: { _id: 'user1', name: 'John Doe' },
    actionUrl: '/app/social/connections',
  },
  {
    _id: 'notif2',
    type: 'task_completed',
    title: 'Task completed',
    body: 'Your task "Review PR" has been marked as complete',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    actorId: null,
    actionUrl: '/app/tasks',
  },
  {
    _id: 'notif3',
    type: 'item_shared',
    title: 'Jane shared a note with you',
    body: null,
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    actorId: { _id: 'user2', name: 'Jane Smith' },
    actionUrl: '/app/notes/shared-note-123',
  },
];

// Mock mutation functions
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
const mockDeleteRead = vi.fn();

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    useNotifications.mockReturnValue({
      data: {
        notifications: mockNotifications,
        unreadCount: 2,
        total: 3,
      },
      isLoading: false,
    });

    useMarkNotificationAsRead.mockReturnValue({
      mutate: mockMarkAsRead,
      isPending: false,
    });

    useMarkAllNotificationsAsRead.mockReturnValue({
      mutate: mockMarkAllAsRead,
      isPending: false,
    });

    useDeleteNotification.mockReturnValue({
      mutate: mockDeleteNotification,
      isPending: false,
    });

    useDeleteReadNotifications.mockReturnValue({
      mutate: mockDeleteRead,
      isPending: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders the page title and bell icon', () => {
      render(<NotificationsPage />);

      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    });

    it('displays unread count message when there are unread notifications', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('You have 2 unread notifications')).toBeInTheDocument();
    });

    it('displays "All caught up!" message when no unread notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[1]], // Only the read one
          unreadCount: 0,
          total: 1,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('displays singular "notification" when count is 1', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[0]],
          unreadCount: 1,
          total: 1,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      expect(screen.getByText('You have 1 unread notification')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton loaders while loading', () => {
      useNotifications.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(<NotificationsPage />);

      // Should show skeleton elements (Skeleton component uses 'skeleton' class)
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Notification List Display', () => {
    it('renders all notifications in the list', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('John Doe sent you a connection request')).toBeInTheDocument();
      expect(screen.getByText('Task completed')).toBeInTheDocument();
      expect(screen.getByText('Jane shared a note with you')).toBeInTheDocument();
    });

    it('renders notification bodies when present', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Hi, I would like to connect with you')).toBeInTheDocument();
      expect(screen.getByText('Your task "Review PR" has been marked as complete')).toBeInTheDocument();
    });

    it('renders user avatars for notifications with actors', () => {
      render(<NotificationsPage />);

      const avatars = screen.getAllByTestId('user-avatar');
      expect(avatars.length).toBe(2); // Two notifications have actorId
    });

    it('renders relative time for notifications', () => {
      render(<NotificationsPage />);

      // date-fns formatDistanceToNow will show something like "5 minutes ago"
      // Multiple notifications have time stamps, so use getAllByText
      const timeElements = screen.getAllByText(/ago/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications exist', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText('When you get notifications, they will appear here.')).toBeInTheDocument();
    });

    it('shows different empty state message when filtering unread only', async () => {
      const user = userEvent.setup();

      useNotifications.mockReturnValue({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      // Click the "Unread only" filter
      await user.click(screen.getByText('Unread only'));

      expect(screen.getByText('No unread notifications')).toBeInTheDocument();
      expect(screen.getByText("You've read all your notifications.")).toBeInTheDocument();
    });
  });

  describe('Mark as Read Functionality', () => {
    it('shows "Mark as read" button for unread notifications', () => {
      render(<NotificationsPage />);

      const markAsReadButtons = screen.getAllByText('Mark as read');
      expect(markAsReadButtons.length).toBe(2); // 2 unread notifications
    });

    it('does not show "Mark as read" button for read notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[1]], // Only the read notification
          unreadCount: 0,
          total: 1,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      expect(screen.queryByText('Mark as read')).not.toBeInTheDocument();
    });

    it('calls markAsRead mutation when clicking "Mark as read" button', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const markAsReadButtons = screen.getAllByText('Mark as read');
      await user.click(markAsReadButtons[0]);

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif1');
    });

    it('calls markAsRead when clicking an unread notification card', async () => {
      const user = userEvent.setup();
      const { container } = render(<NotificationsPage />);

      // Find the notification card by its title text, then get the clickable parent
      const notificationTitle = screen.getByText('John Doe sent you a connection request');
      const notificationCard = notificationTitle.closest('.cursor-pointer');
      await user.click(notificationCard);

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif1');
    });

    it('does not call markAsRead when clicking a read notification card', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      // Find the notification card by its title text, then get the clickable parent
      const notificationTitle = screen.getByText('Task completed');
      const notificationCard = notificationTitle.closest('.cursor-pointer');
      await user.click(notificationCard);

      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Mark All as Read Functionality', () => {
    it('shows "Mark all as read" button when there are unread notifications', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    it('does not show "Mark all as read" button when no unread notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[1]],
          unreadCount: 0,
          total: 1,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });

    it('calls markAllAsRead mutation when clicking the button', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      await user.click(screen.getByText('Mark all as read'));

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete button for each notification', () => {
      render(<NotificationsPage />);

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBe(3); // All 3 notifications have delete button
    });

    it('calls deleteNotification mutation when clicking delete', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockDeleteNotification).toHaveBeenCalledWith('notif1');
    });

    it('shows "Clear read" button', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Clear read')).toBeInTheDocument();
    });

    it('calls deleteReadNotifications when clicking "Clear read"', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      await user.click(screen.getByText('Clear read'));

      expect(mockDeleteRead).toHaveBeenCalled();
    });

    it('disables "Clear read" button when all notifications are unread', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[0], mockNotifications[2]], // Both unread
          unreadCount: 2,
          total: 2,
        },
        isLoading: false,
      });

      render(<NotificationsPage />);

      const clearReadButton = screen.getByText('Clear read');
      expect(clearReadButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('navigates to actionUrl when clicking a notification with actionUrl', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const notificationTitle = screen.getByText('John Doe sent you a connection request');
      const notificationCard = notificationTitle.closest('.cursor-pointer');
      await user.click(notificationCard);

      expect(mockNavigate).toHaveBeenCalledWith('/app/social/connections');
    });

    it('does not navigate when notification has no actionUrl', async () => {
      const notificationWithoutUrl = {
        ...mockNotifications[0],
        actionUrl: null,
      };

      useNotifications.mockReturnValue({
        data: {
          notifications: [notificationWithoutUrl],
          unreadCount: 1,
          total: 1,
        },
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<NotificationsPage />);

      const notificationTitle = screen.getByText('John Doe sent you a connection request');
      const notificationCard = notificationTitle.closest('.cursor-pointer');
      await user.click(notificationCard);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Filter Functionality', () => {
    it('renders filter buttons', () => {
      render(<NotificationsPage />);

      expect(screen.getByText('Unread only')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Connection Requests')).toBeInTheDocument();
      expect(screen.getByText('Shared Items')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('toggles unread only filter when clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      const unreadOnlyButton = screen.getByText('Unread only');

      // Initially not active
      expect(unreadOnlyButton).not.toHaveClass('bg-primary');

      await user.click(unreadOnlyButton);

      // Hook should be called with unreadOnly: true
      expect(useNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ unreadOnly: true })
      );
    });

    it('applies type filter when clicking a type filter button', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      await user.click(screen.getByText('Connection Requests'));

      expect(useNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'connection_request' })
      );
    });

    it('clears type filter when clicking "All"', async () => {
      const user = userEvent.setup();
      render(<NotificationsPage />);

      // First apply a filter
      await user.click(screen.getByText('Messages'));

      // Then click All
      await user.click(screen.getByText('All'));

      expect(useNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: null })
      );
    });
  });

  describe('Notification Card Styling', () => {
    it('applies special border styling to unread notifications', () => {
      render(<NotificationsPage />);

      const unreadTitle = screen.getByText('John Doe sent you a connection request');
      const unreadCard = unreadTitle.closest('.cursor-pointer');
      expect(unreadCard).toHaveClass('border-l-4', 'border-l-primary');
    });

    it('applies bold text to unread notification titles', () => {
      render(<NotificationsPage />);

      const unreadTitle = screen.getByText('John Doe sent you a connection request');
      expect(unreadTitle).toHaveClass('font-semibold');
    });
  });
});
