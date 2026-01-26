/**
 * =============================================================================
 * ADMINREPORTSPAGE.TEST.JSX - Unit Tests for AdminReportsPage
 * =============================================================================
 *
 * Tests the AdminReportsPage component which displays user reports for moderation.
 * Covers:
 * - Loading states
 * - Error states
 * - Empty reports state
 * - Report counts display
 * - Status filter buttons
 * - Report cards display
 * - Report details modal
 * - Resolve and dismiss actions
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminReportsPage from './AdminReportsPage';

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
    getReports: vi.fn(),
    getReportCounts: vi.fn(),
    updateReport: vi.fn(),
  },
}));

import { adminApi } from '../../lib/api';

describe('AdminReportsPage', () => {
  const mockReporter = {
    _id: 'reporter-1',
    email: 'reporter@example.com',
    profile: {
      displayName: 'Report Sender',
      avatarUrl: null,
    },
  };

  const mockReportedUser = {
    _id: 'reported-1',
    email: 'baduser@example.com',
    profile: {
      displayName: 'Bad User',
      avatarUrl: null,
    },
  };

  const mockReports = {
    data: {
      reports: [
        {
          _id: 'report-1',
          reason: 'harassment',
          targetType: 'user',
          priority: 'high',
          status: 'pending',
          description: 'This user is sending harassing messages',
          reporterId: mockReporter,
          reportedUserId: mockReportedUser,
          createdAt: new Date().toISOString(),
          contentSnapshot: {
            email: 'baduser@example.com',
            displayName: 'Bad User',
            bio: 'Some inappropriate bio content',
          },
        },
        {
          _id: 'report-2',
          reason: 'spam',
          targetType: 'message',
          priority: 'medium',
          status: 'pending',
          description: 'Spam messages in the chat',
          reporterId: mockReporter,
          reportedUserId: mockReportedUser,
          createdAt: new Date().toISOString(),
          contentSnapshot: {
            content: 'Buy now! Limited time offer!',
          },
        },
        {
          _id: 'report-3',
          reason: 'inappropriate_content',
          targetType: 'note',
          priority: 'critical',
          status: 'pending',
          description: 'Inappropriate content shared publicly',
          reporterId: mockReporter,
          reportedUserId: mockReportedUser,
          createdAt: new Date().toISOString(),
          contentSnapshot: {
            title: 'Some title',
            content: 'Inappropriate content here',
          },
        },
      ],
    },
  };

  const mockCounts = {
    data: {
      pending: 3,
      reviewing: 1,
      resolved: 10,
      dismissed: 5,
      total: 19,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getReports.mockResolvedValue(mockReports);
    adminApi.getReportCounts.mockResolvedValue(mockCounts);
    adminApi.updateReport.mockResolvedValue({ data: { success: true } });
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching data', async () => {
      adminApi.getReports.mockImplementation(() => new Promise(() => {}));

      render(<AdminReportsPage />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      adminApi.getReports.mockRejectedValue(new Error('Failed to load reports'));

      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load reports')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      adminApi.getReports.mockRejectedValue(new Error('Failed to load'));

      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('retries when clicking try again', async () => {
      const user = userEvent.setup();
      adminApi.getReports.mockRejectedValueOnce(new Error('Failed to load'));

      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      adminApi.getReports.mockResolvedValue(mockReports);
      await user.click(screen.getByText('Try again'));

      expect(adminApi.getReports).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no reports exist', async () => {
      adminApi.getReports.mockResolvedValue({
        data: { reports: [] },
      });

      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('No pending reports')).toBeInTheDocument();
      });
    });

    it('shows appropriate message for different status filters', async () => {
      const user = userEvent.setup();
      adminApi.getReports.mockResolvedValue({
        data: { reports: [] },
      });

      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('No pending reports')).toBeInTheDocument();
      });

      // Click on resolved filter
      await user.click(screen.getByText('Resolved'));

      await waitFor(() => {
        expect(screen.getByText('No reports with resolved status.')).toBeInTheDocument();
      });
    });
  });

    describe('Report Counts', () => {
      it('displays pending count', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
          expect(screen.getAllByText('3').length).toBeGreaterThan(0);
        });
      });

      it('displays reviewing count', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Reviewing').length).toBeGreaterThan(0);
          expect(screen.getAllByText('1').length).toBeGreaterThan(0);
        });
      });

      it('displays resolved count', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
          expect(screen.getAllByText('10').length).toBeGreaterThan(0);
        });
      });

      it('displays dismissed count', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Dismissed').length).toBeGreaterThan(0);
          expect(screen.getAllByText('5').length).toBeGreaterThan(0);
        });
      });
    });

  describe('Status Filter', () => {
    it('shows pending filter as active by default', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        const pendingButton = screen.getByText('Pending').closest('button');
        expect(pendingButton).toHaveClass('border-yellow-500');
      });
    });

    it('switches to reviewing filter when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Reviewing'));

      expect(adminApi.getReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'reviewing' })
      );
    });

    it('switches to resolved filter when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Resolved'));

      expect(adminApi.getReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' })
      );
    });

    it('switches to dismissed filter when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Dismissed'));

      expect(adminApi.getReports).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'dismissed' })
      );
    });
  });

    describe('Report Cards', () => {
    it('displays report reason', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Harassment')).toBeInTheDocument();
        expect(screen.getByText('Spam')).toBeInTheDocument();
        expect(screen.getByText('Inappropriate Content')).toBeInTheDocument();
      });
    });

    it('displays report status', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        const pendingBadges = screen.getAllByText('Pending');
        expect(pendingBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays target type', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Message')).toBeInTheDocument();
        expect(screen.getByText('Note')).toBeInTheDocument();
      });
    });

      it('displays reporter info', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Report Sender').length).toBeGreaterThan(0);
        });
      });

      it('displays reported user info', async () => {
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getAllByText('Bad User').length).toBeGreaterThan(0);
          expect(screen.getAllByText('Reported User').length).toBeGreaterThan(0);
        });
      });

    it('displays report description', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('This user is sending harassing messages')).toBeInTheDocument();
      });
    });

    it('has View Details button', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        const viewButtons = screen.getAllByText('View Details');
        expect(viewButtons.length).toBe(3);
      });
    });

    it('has Resolve button for pending reports', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        const resolveButtons = screen.getAllByText('Resolve');
        expect(resolveButtons.length).toBe(3);
      });
    });

    it('has Dismiss button for pending reports', async () => {
      render(<AdminReportsPage />);

      await waitFor(() => {
        const dismissButtons = screen.getAllByText('Dismiss');
        expect(dismissButtons.length).toBe(3);
      });
    });

    it('does not show action buttons for non-pending reports', async () => {
      adminApi.getReports.mockResolvedValue({
        data: {
          reports: [
            {
              ...mockReports.data.reports[0],
              status: 'resolved',
              resolution: {
                action: 'warning',
                notes: 'Issued a warning',
                resolvedAt: new Date().toISOString(),
              },
            },
          ],
        },
      });

      const user = userEvent.setup();
      render(<AdminReportsPage />);

      // Switch to resolved filter
      await waitFor(() => {
        expect(screen.getByText('Resolved')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Resolved'));

      await waitFor(() => {
        // Should have View Details but not Resolve/Dismiss
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
      });
    });
  });

  describe('Report Actions', () => {
    it('resolves report when clicking Resolve', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Resolve')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Resolve')[0]);

      expect(adminApi.updateReport).toHaveBeenCalledWith('report-1', {
        status: 'resolved',
        action: 'no_action',
        notes: '',
      });
    });

    it('dismisses report when clicking Dismiss', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Dismiss')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Dismiss')[0]);

      expect(adminApi.updateReport).toHaveBeenCalledWith('report-1', {
        status: 'dismissed',
        notes: '',
      });
    });
  });

  describe('Report Details Modal', () => {
    it('opens modal when clicking View Details', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Report Details')).toBeInTheDocument();
      });
    });

    it('displays report reason in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Reason')).toBeInTheDocument();
      });
    });

    it('displays target type in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Target Type')).toBeInTheDocument();
      });
    });

    it('displays priority in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('displays reporter section in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Reporter')).toBeInTheDocument();
      });
    });

    it('displays content snapshot in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Content Snapshot (at time of report)')).toBeInTheDocument();
      });
    });

    it('has action select in modal for pending reports', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Take Action')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
      });
    });

    it('has notes textarea in modal', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Add notes about this resolution...')).toBeInTheDocument();
      });
    });

    it('shows warning for user suspension action', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const actionSelect = screen.getByRole('combobox');
      await user.selectOptions(actionSelect, 'user_suspended');

      await waitFor(() => {
        expect(screen.getByText('This will immediately suspend the reported user')).toBeInTheDocument();
      });
    });

    it('shows warning for user ban action', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const actionSelect = screen.getByRole('combobox');
      await user.selectOptions(actionSelect, 'user_banned');

      await waitFor(() => {
        expect(screen.getByText(/This will permanently ban the user/)).toBeInTheDocument();
      });
    });

    it('closes modal when clicking Cancel', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByText('Report Details')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Report Details')).not.toBeInTheDocument();
      });
    });

    it('resolves from modal with action and notes', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select action
      const actionSelect = screen.getByRole('combobox');
      await user.selectOptions(actionSelect, 'warning');

      // Add notes
      const notesInput = screen.getByPlaceholderText('Add notes about this resolution...');
      await user.type(notesInput, 'First warning issued');

      // Click resolve button in modal
      const resolveButtons = screen.getAllByText('Resolve');
      const modalResolve = resolveButtons[resolveButtons.length - 1];
      await user.click(modalResolve);

      expect(adminApi.updateReport).toHaveBeenCalledWith('report-1', {
        status: 'resolved',
        action: 'warning',
        notes: 'First warning issued',
      });
    });

    it('navigates to user when clicking View in reporter section', async () => {
      const user = userEvent.setup();
      render(<AdminReportsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('View Details')[0]);

      await waitFor(() => {
        const viewLinks = screen.getAllByText('View');
        expect(viewLinks.length).toBeGreaterThan(0);
      });

      const viewLinks = screen.getAllByText('View');
      await user.click(viewLinks[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=reporter-1');
    });
  });

    describe('Priority Display', () => {
      it('displays critical priority with correct styling', async () => {
        const user = userEvent.setup();
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getByText('Inappropriate content shared publicly')).toBeInTheDocument();
        });

        const card = screen
          .getByText('Inappropriate content shared publicly')
          .closest('div[class*="bg-panel"]');
        expect(card).toBeTruthy();
        const viewButton = within(card).getByRole('button', { name: /view details/i });
        await user.click(viewButton);

        await waitFor(() => {
          expect(screen.getByText('Critical')).toBeInTheDocument();
        });
      });

      it('displays high priority with correct styling', async () => {
        const user = userEvent.setup();
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getByText('This user is sending harassing messages')).toBeInTheDocument();
        });

        const card = screen
          .getByText('This user is sending harassing messages')
          .closest('div[class*="bg-panel"]');
        expect(card).toBeTruthy();
        const viewButton = within(card).getByRole('button', { name: /view details/i });
        await user.click(viewButton);

        await waitFor(() => {
          expect(screen.getByText('High')).toBeInTheDocument();
        });
      });

      it('displays medium priority with correct styling', async () => {
        const user = userEvent.setup();
        render(<AdminReportsPage />);

        await waitFor(() => {
          expect(screen.getByText('Spam messages in the chat')).toBeInTheDocument();
        });

        const card = screen
          .getByText('Spam messages in the chat')
          .closest('div[class*="bg-panel"]');
        expect(card).toBeTruthy();
        const viewButton = within(card).getByRole('button', { name: /view details/i });
        await user.click(viewButton);

        await waitFor(() => {
          expect(screen.getByText('Medium')).toBeInTheDocument();
        });
      });
  });
});
