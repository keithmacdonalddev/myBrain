/**
 * =============================================================================
 * ADMININBOXPAGE.TEST.JSX - Unit Tests for AdminInboxPage
 * =============================================================================
 *
 * Tests the AdminInboxPage component which displays actionable admin items.
 * Covers:
 * - Loading states
 * - Error states
 * - Empty inbox state
 * - Urgent items section
 * - Needs review section
 * - FYI section
 * - Platform stats display
 * - Dismiss functionality
 * - User actions (unsuspend, navigate)
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminInboxPage from './AdminInboxPage';

// Mock react-router-dom
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
    getInbox: vi.fn(),
    unsuspendUser: vi.fn(),
  },
}));

import { adminApi } from '../../lib/api';

describe('AdminInboxPage', () => {
  const mockInboxData = {
    data: {
      inbox: {
        urgent: [
          {
            id: 'urgent-1',
            type: 'suspended_user',
            title: 'User Suspended',
            description: 'User was auto-suspended for suspicious activity',
            timestamp: new Date().toISOString(),
            user: {
              _id: 'user-1',
              email: 'suspended@example.com',
              role: 'free',
              profile: {
                displayName: 'Suspended User',
                avatarUrl: null,
              },
            },
          },
          {
            id: 'urgent-2',
            type: 'error_spike',
            title: 'Error Spike Detected',
            description: '500% increase in 500 errors in the last hour',
            timestamp: new Date().toISOString(),
          },
        ],
        needsReview: [
          {
            id: 'review-1',
            type: 'warned_user',
            title: 'User Has Multiple Warnings',
            description: 'User has received 3 warnings this month',
            timestamp: new Date().toISOString(),
            user: {
              _id: 'user-2',
              email: 'warned@example.com',
              role: 'premium',
              profile: {
                displayName: 'Warned User',
                avatarUrl: null,
              },
            },
          },
          {
            id: 'review-2',
            type: 'recent_errors',
            title: 'Elevated Error Rate',
            description: 'Error rate is above normal threshold',
            timestamp: new Date().toISOString(),
          },
        ],
        fyi: [
          {
            id: 'fyi-1',
            type: 'new_signups',
            title: '12 New Users Today',
            description: 'Higher than average signup rate',
            timestamp: new Date().toISOString(),
            meta: { count: 12 },
            users: [
              { _id: 'new-1', email: 'new1@example.com', profile: { avatarUrl: null } },
              { _id: 'new-2', email: 'new2@example.com', profile: { avatarUrl: null } },
              { _id: 'new-3', email: 'new3@example.com', profile: { avatarUrl: null } },
            ],
          },
        ],
      },
      stats: {
        totalUsers: 1250,
        onlineNow: 45,
        errorRate: 0.5,
        newUsersToday: 12,
      },
      generatedAt: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getInbox.mockResolvedValue(mockInboxData);
    adminApi.unsuspendUser.mockResolvedValue({ data: { success: true } });
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching data', async () => {
      adminApi.getInbox.mockImplementation(() => new Promise(() => {}));

      render(<AdminInboxPage />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      adminApi.getInbox.mockRejectedValue(new Error('Failed to load'));

      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load inbox')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      adminApi.getInbox.mockRejectedValue(new Error('Failed to load'));

      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('retries when clicking try again', async () => {
      const user = userEvent.setup();
      adminApi.getInbox.mockRejectedValueOnce(new Error('Failed to load'));

      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      adminApi.getInbox.mockResolvedValue(mockInboxData);
      await user.click(screen.getByText('Try again'));

      expect(adminApi.getInbox).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty Inbox State', () => {
    it('shows empty state when all sections are empty', async () => {
      adminApi.getInbox.mockResolvedValue({
        data: {
          inbox: { urgent: [], needsReview: [], fyi: [] },
          stats: { totalUsers: 1000, onlineNow: 20, errorRate: 0.1, newUsersToday: 5 },
          generatedAt: new Date().toISOString(),
        },
      });

      render(<AdminInboxPage />);

      await waitFor(() => {
        // EmptyInbox component shows "All caught up" message
        expect(screen.getByText('All caught up')).toBeInTheDocument();
        expect(screen.getByText('Nothing needs your attention right now.')).toBeInTheDocument();
      });
    });
  });

  describe('Urgent Section', () => {
    it('renders urgent section header', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Urgent')).toBeInTheDocument();
      });
    });

    it('shows urgent item count', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Requires immediate action')).toBeInTheDocument();
      });
    });

    it('displays urgent items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('User Suspended')).toBeInTheDocument();
        expect(screen.getByText('Error Spike Detected')).toBeInTheDocument();
      });
    });

    it('shows Review button for suspended users', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
      });
    });

    it('shows Unsuspend button for suspended users', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unsuspend' })).toBeInTheDocument();
      });
    });

    it('shows View Logs button for error spikes', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        // Multiple View Logs buttons may exist (error_spike and recent_errors)
        expect(screen.getAllByRole('button', { name: 'View Logs' }).length).toBeGreaterThan(0);
      });
    });

    it('navigates to user when clicking Review', async () => {
      const user = userEvent.setup();
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Review' }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=user-1');
    });

    it('calls unsuspend API when clicking Unsuspend', async () => {
      const user = userEvent.setup();
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unsuspend' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Unsuspend' }));

      expect(adminApi.unsuspendUser).toHaveBeenCalledWith('user-1', { reason: 'Approved via inbox' });
    });

    it('navigates to logs when clicking View Logs', async () => {
      const user = userEvent.setup();
      render(<AdminInboxPage />);

      await waitFor(() => {
        // Multiple View Logs buttons may exist
        expect(screen.getAllByRole('button', { name: 'View Logs' }).length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByRole('button', { name: 'View Logs' })[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/logs');
    });
  });

  describe('Needs Review Section', () => {
    it('renders needs review section header', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Needs Review')).toBeInTheDocument();
      });
    });

    it('shows needs review subtitle', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Flagged by automated systems')).toBeInTheDocument();
      });
    });

    it('displays needs review items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('User Has Multiple Warnings')).toBeInTheDocument();
        expect(screen.getByText('Elevated Error Rate')).toBeInTheDocument();
      });
    });

    it('shows Investigate button for warned users', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Investigate' })).toBeInTheDocument();
      });
    });

    it('navigates to user when clicking Investigate', async () => {
      const user = userEvent.setup();
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Investigate' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Investigate' }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=user-2');
    });
  });

  describe('FYI Section', () => {
    it('renders FYI section header', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('FYI')).toBeInTheDocument();
      });
    });

    it('shows FYI subtitle', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('No action required')).toBeInTheDocument();
      });
    });

    it('displays FYI items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('12 New Users Today')).toBeInTheDocument();
      });
    });

    it('shows View Users button for new signups', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View Users' })).toBeInTheDocument();
      });
    });

    it('navigates to users page when clicking View Users', async () => {
      const user = userEvent.setup();
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View Users' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'View Users' }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('displays user avatars for new signups', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        const avatars = document.querySelectorAll('img[alt=""]');
        expect(avatars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dismiss Functionality', () => {
    it('has dismiss buttons on dismissable items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        // Find the dismiss buttons (X icons on cards with title="Dismiss")
        const dismissButtons = document.querySelectorAll('[title="Dismiss"]');
        expect(dismissButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Platform Stats', () => {
    it('renders platform status section', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Platform Status')).toBeInTheDocument();
      });
    });

    it('displays total users stat', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });
    });

    it('displays online now stat', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Online Now')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('displays error rate stat', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('0.5%')).toBeInTheDocument();
      });
    });

    it('displays new today stat', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('New Today')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('shows error rate in red when above threshold', async () => {
      adminApi.getInbox.mockResolvedValue({
        ...mockInboxData,
        data: {
          ...mockInboxData.data,
          stats: {
            ...mockInboxData.data.stats,
            errorRate: 2.5,
          },
        },
      });

      render(<AdminInboxPage />);

      await waitFor(() => {
        const errorRate = screen.getByText('2.5%');
        expect(errorRate).toHaveClass('text-red-500');
      });
    });

    it('shows error rate in green when below threshold', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        const errorRate = screen.getByText('0.5%');
        expect(errorRate).toHaveClass('text-green-500');
      });
    });
  });

  describe('Last Updated', () => {
    it('displays last updated timestamp', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });

  describe('User Info Display', () => {
    it('displays user email in urgent items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('suspended@example.com')).toBeInTheDocument();
      });
    });

    it('displays user email in needs review items', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('warned@example.com')).toBeInTheDocument();
      });
    });

    it('displays user role tier', async () => {
      render(<AdminInboxPage />);

      await waitFor(() => {
        expect(screen.getByText('premium tier')).toBeInTheDocument();
      });
    });
  });
});
