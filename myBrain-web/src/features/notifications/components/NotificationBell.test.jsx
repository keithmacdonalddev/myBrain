import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NotificationBell from './NotificationBell';

// Mock the notification hooks
vi.mock('../hooks/useNotifications', () => ({
  useUnreadNotificationCount: vi.fn(),
  useRealtimeNotifications: vi.fn(),
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

// Mock NotificationDropdown component
vi.mock('./NotificationDropdown', () => ({
  default: ({ onClose, onViewAll }) => (
    <div data-testid="notification-dropdown">
      <button onClick={onClose} data-testid="close-dropdown">Close</button>
      <button onClick={onViewAll} data-testid="view-all">View All</button>
    </div>
  ),
}));

import {
  useUnreadNotificationCount,
  useRealtimeNotifications,
} from '../hooks/useNotifications';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    useUnreadNotificationCount.mockReturnValue({
      data: { unreadCount: 0 },
    });

    useRealtimeNotifications.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the bell button', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button', { name: /notifications/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with proper title attribute', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Notifications');
    });

    it('calls useRealtimeNotifications hook', () => {
      render(<NotificationBell />);

      expect(useRealtimeNotifications).toHaveBeenCalled();
    });
  });

  describe('Notification Count Badge', () => {
    it('does not show badge when unread count is 0', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 0 },
      });

      render(<NotificationBell />);

      // Badge should not exist
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows badge with count when there are unread notifications', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 5 },
      });

      render(<NotificationBell />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows badge with count for single notification', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 1 },
      });

      render(<NotificationBell />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows "99+" when unread count exceeds 99', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 150 },
      });

      render(<NotificationBell />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('shows exact count at boundary of 99', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 99 },
      });

      render(<NotificationBell />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('shows "99+" at boundary of 100', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 100 },
      });

      render(<NotificationBell />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('badge has proper styling classes', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: 5 },
      });

      render(<NotificationBell />);

      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-red-500', 'text-white', 'rounded-full');
    });

    it('handles undefined data gracefully', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: undefined,
      });

      render(<NotificationBell />);

      // Should not crash and not show badge
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('handles null unreadCount gracefully', () => {
      useUnreadNotificationCount.mockReturnValue({
        data: { unreadCount: null },
      });

      render(<NotificationBell />);

      // Should not crash and not show badge
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dropdown Open/Close', () => {
    it('does not show dropdown initially', () => {
      render(<NotificationBell />);

      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('opens dropdown when bell button is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    it('closes dropdown when bell button is clicked again', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });

      // Open
      await user.click(bellButton);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Close
      await user.click(bellButton);
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('closes dropdown when onClose callback is triggered', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click close button in dropdown
      await user.click(screen.getByTestId('close-dropdown'));
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <NotificationBell />
          <button data-testid="outside-element">Outside</button>
        </div>
      );

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('does not close when clicking inside dropdown', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /notifications/i }));

      const dropdown = screen.getByTestId('notification-dropdown');

      // Click inside dropdown
      fireEvent.mouseDown(dropdown);

      // Dropdown should still be visible
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });

  describe('View All Navigation', () => {
    it('closes dropdown and navigates when View All is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /notifications/i }));

      // Click View All
      await user.click(screen.getByTestId('view-all'));

      // Dropdown should be closed
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();

      // Should navigate to notifications page
      expect(mockNavigate).toHaveBeenCalledWith('/app/notifications');
    });
  });

  describe('Accessibility', () => {
    it('bell button is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);

      const button = screen.getByRole('button', { name: /notifications/i });

      // Tab to the button and press Enter
      button.focus();
      expect(document.activeElement).toBe(button);

      await user.keyboard('{Enter}');

      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });
});
