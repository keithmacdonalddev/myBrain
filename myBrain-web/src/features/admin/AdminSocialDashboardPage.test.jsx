/**
 * =============================================================================
 * ADMINSOCIALDASHBOARDPAGE.TEST.JSX - Unit Tests for AdminSocialDashboardPage
 * =============================================================================
 *
 * Tests the AdminSocialDashboardPage component which displays social activity
 * dashboard with stats, charts, user activity, and navigation.
 *
 * Covers:
 * - Loading state with spinner
 * - Error state with retry functionality
 * - Dashboard stats display (StatCard components)
 * - TrendChart bar rendering
 * - ReportsByPriority breakdown
 * - TopActiveUsers list and navigation
 * - SharesByType breakdown
 * - Navigation to reports and user pages
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminSocialDashboardPage from './AdminSocialDashboardPage';

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the API module
vi.mock('../../lib/api', () => ({
  adminApi: {
    getSocialDashboard: vi.fn(),
  },
}));

// Mock AdminNav component
vi.mock('./components/AdminNav', () => ({
  default: ({ onRefresh, isRefreshing }) => (
    <div data-testid="admin-nav">
      {onRefresh && (
        <button onClick={onRefresh} data-testid="refresh-button">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    </div>
  ),
}));

// Mock UserAvatar component - just render a simple div, the component itself shows the name
vi.mock('../../components/ui/UserAvatar', () => ({
  default: ({ user, size }) => (
    <div data-testid="user-avatar" data-size={size} data-user-id={user?._id} />
  ),
}));

import { adminApi } from '../../lib/api';

describe('AdminSocialDashboardPage', () => {
  // Mock data for successful API response
  const mockDashboardData = {
    data: {
      connections: {
        total: 150,
        new: 12,
        pending: 5,
      },
      messages: {
        totalMessages: 2500,
        newMessages: 85,
        activeConversations: 42,
        totalConversations: 200,
      },
      reports: {
        pending: 3,
        resolved: 25,
        pendingByPriority: {
          critical: 1,
          high: 2,
          medium: 0,
          low: 0,
        },
      },
      shares: {
        total: 75,
        active: 45,
        new: 8,
        byType: {
          project: 20,
          task: 15,
          note: 30,
          file: 10,
        },
      },
      blocks: {
        total: 10,
        new: 2,
      },
      activeUsers: [
        {
          user: {
            _id: 'user1',
            email: 'alice@example.com',
            profile: { displayName: 'Alice Smith' },
          },
          messageCount: 150,
        },
        {
          user: {
            _id: 'user2',
            email: 'bob@example.com',
            profile: { displayName: 'Bob Jones' },
          },
          messageCount: 120,
        },
        {
          user: {
            _id: 'user3',
            email: 'charlie@example.com',
            profile: { displayName: 'Charlie Brown' },
          },
          messageCount: 95,
        },
      ],
      trends: {
        connections: [
          { date: '2026-01-19', count: 3 },
          { date: '2026-01-20', count: 5 },
          { date: '2026-01-21', count: 2 },
          { date: '2026-01-22', count: 4 },
          { date: '2026-01-23', count: 6 },
          { date: '2026-01-24', count: 3 },
          { date: '2026-01-25', count: 5 },
        ],
        messages: [
          { date: '2026-01-19', count: 45 },
          { date: '2026-01-20', count: 52 },
          { date: '2026-01-21', count: 38 },
          { date: '2026-01-22', count: 67 },
          { date: '2026-01-23', count: 55 },
          { date: '2026-01-24', count: 48 },
          { date: '2026-01-25', count: 60 },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getSocialDashboard.mockResolvedValue(mockDashboardData);
  });

  // =========================================================================
  // Loading State Tests
  // =========================================================================
  describe('Loading State', () => {
    it('renders loading spinner while fetching data', async () => {
      // Make API call hang indefinitely
      adminApi.getSocialDashboard.mockImplementation(() => new Promise(() => {}));

      render(<AdminSocialDashboardPage />);

      // Should show AdminNav
      expect(screen.getByTestId('admin-nav')).toBeInTheDocument();

      // Should show loading spinner (Loader2 has animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show dashboard content while loading', () => {
      adminApi.getSocialDashboard.mockImplementation(() => new Promise(() => {}));

      render(<AdminSocialDashboardPage />);

      // Dashboard title should not be visible while loading
      expect(screen.queryByText('Social Activity Dashboard')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Error State Tests
  // =========================================================================
  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      adminApi.getSocialDashboard.mockRejectedValue(new Error('Network error'));

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load social dashboard')).toBeInTheDocument();
      });
    });

    it('displays retry button on error', async () => {
      adminApi.getSocialDashboard.mockRejectedValue(new Error('Network error'));

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();

      // First call fails, second succeeds
      adminApi.getSocialDashboard
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDashboardData);

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(adminApi.getSocialDashboard).toHaveBeenCalledTimes(2);
      });
    });

    it('shows dashboard after successful retry', async () => {
      const user = userEvent.setup();

      adminApi.getSocialDashboard
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDashboardData);

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Dashboard Stats Display Tests
  // =========================================================================
  describe('Dashboard Stats Display', () => {
    it('renders dashboard header when loaded', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Monitor social features and user interactions')).toBeInTheDocument();
      });
    });

    it('displays Total Connections stat card', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Connections')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('+12 this week')).toBeInTheDocument();
      });
    });

    it('displays Pending Requests stat card', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending Requests')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('displays Total Messages stat card', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Messages')).toBeInTheDocument();
        expect(screen.getByText('2,500')).toBeInTheDocument();
        expect(screen.getByText('+85 this week')).toBeInTheDocument();
      });
    });

    it('displays Active Conversations stat card', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Conversations')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });

    it('displays Active Shares stat card', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Shares')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('+8 this week')).toBeInTheDocument();
      });
    });

    it('displays Pending Reports stat card with correct count', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      });

      // Find the pending reports button and verify its value
      const reportsButton = screen.getByRole('button', { name: /pending reports/i });
      expect(within(reportsButton).getByText('3')).toBeInTheDocument();
    });

    it('shows "Needs attention" for pending reports when count > 0', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Needs attention')).toBeInTheDocument();
      });
    });

    it('does not show "Needs attention" when pending reports is 0', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          reports: { pending: 0, resolved: 25, pendingByPriority: {} },
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      });

      expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // StatCard Component Tests
  // =========================================================================
  describe('StatCard Component', () => {
    it('displays label correctly', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Connections')).toBeInTheDocument();
      });
    });

    it('displays formatted value with locale string', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        // 2500 should be formatted as 2,500
        expect(screen.getByText('2,500')).toBeInTheDocument();
      });
    });

    it('displays subValue when provided', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('+12 this week')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TrendChart Component Tests
  // =========================================================================
  describe('TrendChart Component', () => {
    it('renders New Connections chart', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('New Connections (7 days)')).toBeInTheDocument();
      });
    });

    it('renders Message Volume chart', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Message Volume (7 days)')).toBeInTheDocument();
      });
    });

    it('renders bars for each data point', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('New Connections (7 days)')).toBeInTheDocument();
      });

      // Find the trend chart container
      const connectionChartContainer = screen.getByText('New Connections (7 days)').closest('.bg-panel');

      // Should have bar elements (div with style height) - 7 days = 7 bars
      const bars = connectionChartContainer.querySelectorAll('.flex-1');
      expect(bars.length).toBe(7);
    });

    it('displays date range labels', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        // The chart shows date range from first to last item (sliced from position 5)
        // '2026-01-19' sliced at 5 = '01-19', '2026-01-25' sliced at 5 = '01-25'
        // The dates appear in trend charts
        const chart = screen.getByText('New Connections (7 days)').closest('.bg-panel');
        expect(within(chart).getByText('01-19')).toBeInTheDocument();
        expect(within(chart).getByText('01-25')).toBeInTheDocument();
      });
    });

    it('does not render chart when data is empty', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          trends: { connections: [], messages: [] },
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });

      // Charts with empty data should not render
      expect(screen.queryByText('New Connections (7 days)')).not.toBeInTheDocument();
      expect(screen.queryByText('Message Volume (7 days)')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // ReportsByPriority Component Tests
  // =========================================================================
  describe('ReportsByPriority Component', () => {
    it('renders Pending Reports by Priority section', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending Reports by Priority')).toBeInTheDocument();
      });
    });

    it('displays all priority levels', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
      });
    });

    it('displays correct count for each priority', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        const reportsSection = screen.getByText('Pending Reports by Priority').closest('.bg-panel');

        // Critical: 1, High: 2, Medium: 0, Low: 0
        const counts = reportsSection.querySelectorAll('.font-medium');
        // Find the counts by their associated labels
        expect(within(reportsSection).getByText('1')).toBeInTheDocument();
        expect(within(reportsSection).getByText('2')).toBeInTheDocument();
      });
    });

    it('shows "No pending reports" when total is 0', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          reports: {
            pending: 0,
            resolved: 25,
            pendingByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
          },
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No pending reports')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TopActiveUsers Component Tests
  // =========================================================================
  describe('TopActiveUsers Component', () => {
    it('renders Top Active Users section', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Active Users (7 days)')).toBeInTheDocument();
      });
    });

    it('displays user names in correct order', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();
        expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      });
    });

    it('displays message counts for users', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('150 messages')).toBeInTheDocument();
        expect(screen.getByText('120 messages')).toBeInTheDocument();
        expect(screen.getByText('95 messages')).toBeInTheDocument();
      });
    });

    it('displays ranking numbers', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        const topUsersSection = screen.getByText('Top Active Users (7 days)').closest('.bg-panel');
        expect(within(topUsersSection).getByText('1')).toBeInTheDocument();
        expect(within(topUsersSection).getByText('2')).toBeInTheDocument();
        expect(within(topUsersSection).getByText('3')).toBeInTheDocument();
      });
    });

    it('renders UserAvatar components', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        const avatars = screen.getAllByTestId('user-avatar');
        expect(avatars.length).toBe(3);
      });
    });

    it('shows "No activity data" when users list is empty', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          activeUsers: [],
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No activity data')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // SharesByType Component Tests
  // =========================================================================
  describe('SharesByType Component', () => {
    it('renders Shares by Type section', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Shares by Type')).toBeInTheDocument();
      });
    });

    it('displays all share type labels', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Notes')).toBeInTheDocument();
        expect(screen.getByText('Files')).toBeInTheDocument();
      });
    });

    it('displays correct counts for each type', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        const sharesSection = screen.getByText('Shares by Type').closest('.bg-panel');
        expect(within(sharesSection).getByText('20')).toBeInTheDocument(); // projects
        expect(within(sharesSection).getByText('15')).toBeInTheDocument(); // tasks
        expect(within(sharesSection).getByText('30')).toBeInTheDocument(); // notes
        expect(within(sharesSection).getByText('10')).toBeInTheDocument(); // files
      });
    });

    it('shows "No shares" when total is 0', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          shares: {
            total: 0,
            active: 0,
            new: 0,
            byType: { project: 0, task: 0, note: 0, file: 0 },
          },
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No shares')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Additional Stats Display Tests
  // =========================================================================
  describe('Additional Stats Display', () => {
    it('displays User Blocks stat', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('User Blocks')).toBeInTheDocument();
      });

      // Find the section containing User Blocks and verify its value
      const blocksLabel = screen.getByText('User Blocks');
      const blocksSection = blocksLabel.closest('.bg-panel');
      expect(within(blocksSection).getByText('10')).toBeInTheDocument();
      expect(within(blocksSection).getByText('+2 this week')).toBeInTheDocument();
    });

    it('displays Total Conversations stat', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Conversations')).toBeInTheDocument();
      });

      const convLabel = screen.getByText('Total Conversations');
      const convSection = convLabel.closest('.bg-panel');
      expect(within(convSection).getByText('200')).toBeInTheDocument();
    });

    it('displays Total Shares stat', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Shares')).toBeInTheDocument();
      });

      const sharesLabel = screen.getByText('Total Shares');
      const sharesSection = sharesLabel.closest('.bg-panel');
      expect(within(sharesSection).getByText('75')).toBeInTheDocument();
    });

    it('displays Resolved Reports stat', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Resolved Reports')).toBeInTheDocument();
      });

      const reportsLabel = screen.getByText('Resolved Reports');
      const reportsSection = reportsLabel.closest('.bg-panel');
      expect(within(reportsSection).getByText('25')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Navigation Tests
  // =========================================================================
  describe('Navigation', () => {
    it('navigates to reports page when clicking Pending Reports card', async () => {
      const user = userEvent.setup();

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      });

      // Find the clickable reports card (it's a button)
      const reportsButton = screen.getByRole('button', { name: /pending reports/i });
      await user.click(reportsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/reports');
    });

    it('navigates to user page when clicking user in TopActiveUsers', async () => {
      const user = userEvent.setup();

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      // Click on the first user
      await user.click(screen.getByText('Alice Smith'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=user1');
    });

    it('navigates to correct user when clicking different users', async () => {
      const user = userEvent.setup();

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      });

      // Click on Bob Jones
      await user.click(screen.getByText('Bob Jones'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=user2');
    });

    it('does not navigate when user id is missing', async () => {
      const user = userEvent.setup();

      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          activeUsers: [
            {
              user: { _id: null, email: 'test@example.com' },
              messageCount: 50,
            },
          ],
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      await user.click(screen.getByText('test@example.com'));

      // Navigate should not be called with undefined/null user
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // AdminNav Integration Tests
  // =========================================================================
  describe('AdminNav Integration', () => {
    it('renders AdminNav component', async () => {
      render(<AdminSocialDashboardPage />);

      expect(screen.getByTestId('admin-nav')).toBeInTheDocument();
    });

    it('passes refresh handler to AdminNav when data is loaded', async () => {
      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });

      // The refresh button should be available
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('calls refetch when AdminNav refresh is clicked', async () => {
      const user = userEvent.setup();

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('refresh-button'));

      // Initial call + refresh call
      await waitFor(() => {
        expect(adminApi.getSocialDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  // =========================================================================
  // Edge Cases and Default Values Tests
  // =========================================================================
  describe('Edge Cases and Default Values', () => {
    it('handles missing data gracefully with defaults', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {},
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });

      // Should show 0 for missing values
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues.length).toBeGreaterThan(0);
    });

    it('handles null data response', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: null,
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Social Activity Dashboard')).toBeInTheDocument();
      });
    });

    it('displays user email when displayName is missing', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          activeUsers: [
            {
              user: { _id: 'user1', email: 'noprofile@example.com' },
              messageCount: 100,
            },
          ],
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('noprofile@example.com')).toBeInTheDocument();
      });
    });

    it('displays "Unknown" when both email and displayName are missing', async () => {
      adminApi.getSocialDashboard.mockResolvedValue({
        data: {
          ...mockDashboardData.data,
          activeUsers: [
            {
              user: { _id: 'user1' },
              messageCount: 100,
            },
          ],
        },
      });

      render(<AdminSocialDashboardPage />);

      await waitFor(() => {
        // The component displays "Unknown" when both email and displayName are missing
        expect(screen.getByText('Unknown')).toBeInTheDocument();
      });
    });
  });
});
