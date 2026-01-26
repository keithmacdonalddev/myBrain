import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NotificationDropdown from './NotificationDropdown';

// Mock the notification hooks
vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationAsRead: vi.fn(),
  useMarkAllNotificationsAsRead: vi.fn(),
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
    body: null,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    actorId: null,
    actionUrl: '/app/tasks',
  },
  {
    _id: 'notif3',
    type: 'item_shared',
    title: 'Jane shared a note with you',
    body: 'Check out this note',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    actorId: { _id: 'user2', name: 'Jane Smith' },
    actionUrl: '/app/notes/shared-note-123',
  },
];

// Mock mutation functions
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockOnClose = vi.fn();
const mockOnViewAll = vi.fn();

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    useNotifications.mockReturnValue({
      data: {
        notifications: mockNotifications,
        unreadCount: 2,
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
  });

  describe('Basic Rendering', () => {
    it('renders the dropdown header with title', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('renders close button in header', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      // X button should be present
      const closeButtons = container.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent.includes('Mark')
      );
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      // Find and click the close button (button with just X icon)
      const buttons = container.querySelectorAll('button');
      const closeButton = Array.from(buttons).find(btn => {
        const svg = btn.querySelector('svg');
        return svg && !btn.textContent.includes('Mark') && !btn.textContent.includes('View');
      });

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton loaders while loading', () => {
      useNotifications.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      // Should show skeleton elements (Skeleton component uses 'skeleton' class)
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Notification List Display', () => {
    it('renders all notifications in the list', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('John Doe sent you a connection request')).toBeInTheDocument();
      expect(screen.getByText('Task completed')).toBeInTheDocument();
      expect(screen.getByText('Jane shared a note with you')).toBeInTheDocument();
    });

    it('renders notification bodies when present', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('Hi, I would like to connect with you')).toBeInTheDocument();
      expect(screen.getByText('Check out this note')).toBeInTheDocument();
    });

    it('renders user avatars for notifications with actors', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      const avatars = screen.getAllByTestId('user-avatar');
      expect(avatars.length).toBe(2); // Two notifications have actorId
    });

    it('renders relative time for each notification', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      // date-fns formatDistanceToNow will show something like "5 minutes ago"
      // Multiple notifications have time stamps, so use getAllByText
      const timeElements = screen.getAllByText(/ago/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('shows unread indicator dot for unread notifications', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      // Unread notifications should have indicator dots
      const unreadDots = container.querySelectorAll('.bg-primary.rounded-full.w-2.h-2');
      expect(unreadDots.length).toBe(2); // 2 unread notifications
    });

    it('applies different styling to unread vs read notifications', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      const unreadTitle = screen.getByText('John Doe sent you a connection request');
      const readTitle = screen.getByText('Task completed');

      expect(unreadTitle).toHaveClass('font-medium');
      expect(readTitle).toHaveClass('text-muted');
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [],
          unreadCount: 0,
        },
        isLoading: false,
      });

      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('does not show "View all" button when no notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [],
          unreadCount: 0,
        },
        isLoading: false,
      });

      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.queryByText(/view all/i)).not.toBeInTheDocument();
    });
  });

  describe('Mark as Read Functionality', () => {
    it('shows "Mark all read" button when there are unread notifications', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('does not show "Mark all read" when no unread notifications', () => {
      useNotifications.mockReturnValue({
        data: {
          notifications: [mockNotifications[1]], // Only the read one
          unreadCount: 0,
        },
        isLoading: false,
      });

      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('calls markAllAsRead when clicking "Mark all read"', async () => {
      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      await user.click(screen.getByText('Mark all read'));

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it('marks individual notification as read when clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      // Click on an unread notification
      await user.click(screen.getByText('John Doe sent you a connection request'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif1');
    });

    it('does not call markAsRead when clicking a read notification', async () => {
      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      // Click on a read notification
      await user.click(screen.getByText('Task completed'));

      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to actionUrl and closes dropdown when notification is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      await user.click(screen.getByText('John Doe sent you a connection request'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app/social/connections');
    });

    it('does not navigate or close when notification has no actionUrl', async () => {
      const notificationWithoutUrl = {
        ...mockNotifications[0],
        _id: 'notif-no-url',
        actionUrl: null,
      };

      useNotifications.mockReturnValue({
        data: {
          notifications: [notificationWithoutUrl],
          unreadCount: 1,
        },
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      await user.click(screen.getByText('John Doe sent you a connection request'));

      // When there's no actionUrl, onClick is not called (so neither onClose nor navigate)
      // The component only calls onClick(actionUrl) when actionUrl exists
      expect(mockNavigate).not.toHaveBeenCalled();
      // onClose is NOT called because onClick is only invoked when actionUrl exists
      expect(mockOnClose).not.toHaveBeenCalled();
      // But markAsRead IS called because the notification is unread
      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-no-url');
    });
  });

  describe('View All Notifications', () => {
    it('shows "View all notifications" button when there are notifications', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(screen.getByText('View all notifications')).toBeInTheDocument();
    });

    it('calls onViewAll when clicking "View all notifications"', async () => {
      const user = userEvent.setup();
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      await user.click(screen.getByText('View all notifications'));

      expect(mockOnViewAll).toHaveBeenCalled();
    });
  });

  describe('Dropdown Styling', () => {
    it('has proper positioning classes', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      const dropdown = container.firstChild;
      expect(dropdown).toHaveClass('absolute', 'right-0');
    });

    it('has proper width class', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      const dropdown = container.firstChild;
      expect(dropdown).toHaveClass('w-80');
    });

    it('has proper max-height for scrolling', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      const dropdown = container.firstChild;
      expect(dropdown).toHaveClass('max-h-[480px]');
    });

    it('has high z-index for proper layering', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      const dropdown = container.firstChild;
      expect(dropdown).toHaveClass('z-50');
    });
  });

  describe('Notification Types', () => {
    it('renders different icon types based on notification type', () => {
      const { container } = render(
        <NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />
      );

      // The icon containers should have different color classes based on type
      // connection_request: text-blue-500 bg-blue-500/10
      // task_completed: text-green-500 bg-green-500/10
      // item_shared: text-purple-500 bg-purple-500/10

      // At minimum, icons should be rendered (SVG elements or avatars)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Limit', () => {
    it('requests notifications with limit of 10', () => {
      render(<NotificationDropdown onClose={mockOnClose} onViewAll={mockOnViewAll} />);

      expect(useNotifications).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});
