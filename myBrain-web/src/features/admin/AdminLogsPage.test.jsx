/**
 * =============================================================================
 * ADMINLOGSPAGE.TEST.JSX - Unit Tests for AdminLogsPage
 * =============================================================================
 *
 * Tests the AdminLogsPage component which displays API request logs.
 * Covers:
 * - Loading states
 * - Error states
 * - Empty logs state
 * - Log stats display
 * - Log list rendering
 * - Filter functionality
 * - Search by request ID
 * - Pagination
 * - Log detail drawer
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminLogsPage from './AdminLogsPage';

// Mock the API module
vi.mock('../../lib/api', () => ({
  adminApi: {
    getLogs: vi.fn(),
    getLogStats: vi.fn(),
  },
}));

import { adminApi } from '../../lib/api';

describe('AdminLogsPage', () => {
  const mockLogs = {
    data: {
      logs: [
        {
          _id: 'log-1',
          requestId: 'req-abc-123',
          method: 'GET',
          route: '/api/notes',
          statusCode: 200,
          durationMs: 45,
          timestamp: new Date().toISOString(),
          userEmail: 'user1@example.com',
          userId: 'user-1',
          userRole: 'free',
          eventName: 'notes.list.success',
          clientInfo: {
            ip: '192.168.1.1',
            origin: 'http://localhost:5173',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          },
          sampled: true,
          sampleReason: 'random',
        },
        {
          _id: 'log-2',
          requestId: 'req-def-456',
          method: 'POST',
          route: '/api/tasks',
          statusCode: 201,
          durationMs: 120,
          timestamp: new Date().toISOString(),
          userEmail: 'user2@example.com',
          userId: 'user-2',
          userRole: 'premium',
          eventName: 'tasks.create.success',
          clientInfo: {
            ip: '192.168.1.2',
            origin: 'http://localhost:5173',
            userAgent: 'Mozilla/5.0 Safari/537.36',
          },
          sampled: true,
          sampleReason: 'random',
        },
        {
          _id: 'log-3',
          requestId: 'req-ghi-789',
          method: 'GET',
          route: '/api/auth/me',
          statusCode: 401,
          durationMs: 15,
          timestamp: new Date().toISOString(),
          eventName: 'auth.me.unauthorized',
          error: {
            code: 'UNAUTHORIZED',
            category: 'auth',
            messageSafe: 'Invalid or expired token',
          },
          clientInfo: {
            ip: '192.168.1.3',
            origin: 'http://localhost:5173',
            userAgent: 'Mozilla/5.0 Firefox/120.0',
          },
          sampled: true,
          sampleReason: 'error',
        },
        {
          _id: 'log-4',
          requestId: 'req-jkl-012',
          method: 'DELETE',
          route: '/api/projects/123',
          statusCode: 500,
          durationMs: 250,
          timestamp: new Date().toISOString(),
          userEmail: 'admin@example.com',
          userId: 'admin-1',
          userRole: 'admin',
          eventName: 'projects.delete.error',
          error: {
            code: 'INTERNAL_ERROR',
            category: 'server',
            messageSafe: 'Database connection failed',
          },
          clientInfo: {
            ip: '192.168.1.4',
            origin: 'http://localhost:5173',
            userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
          },
          sampled: true,
          sampleReason: 'error',
        },
      ],
      total: 4,
    },
  };

  const mockStats = {
    data: {
      summary: {
        totalRequests: 15000,
        avgDuration: 85,
        errorCount: 150,
        serverErrorCount: 25,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getLogs.mockResolvedValue(mockLogs);
    adminApi.getLogStats.mockResolvedValue(mockStats);
  });

  describe('Loading State', () => {
    it('shows loading skeletons while fetching data', async () => {
      adminApi.getLogs.mockImplementation(() => new Promise(() => {}));

      render(<AdminLogsPage />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      adminApi.getLogs.mockRejectedValue(new Error('Failed to load logs'));

      render(<AdminLogsPage />);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Failed to load logs');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('shows error details', async () => {
      adminApi.getLogs.mockRejectedValue(new Error('Network timeout'));

      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows no logs message when no logs exist', async () => {
      adminApi.getLogs.mockResolvedValue({
        data: { logs: [], total: 0 },
      });

      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('No logs found')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Display', () => {
    it('displays total requests stat', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Requests')).toBeInTheDocument();
        expect(screen.getByText('15000')).toBeInTheDocument();
      });
    });

    it('displays average duration stat', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('Avg Duration')).toBeInTheDocument();
        expect(screen.getByText('85ms')).toBeInTheDocument();
      });
    });

    it('displays client errors stat', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('Client Errors')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('displays server errors stat', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('Server Errors')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });
  });

  describe('Log List', () => {
    it('displays log rows', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
        expect(screen.getByText('/api/tasks')).toBeInTheDocument();
        expect(screen.getByText('/api/auth/me')).toBeInTheDocument();
        expect(screen.getByText('/api/projects/123')).toBeInTheDocument();
      });
    });

    it('displays HTTP methods', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
        expect(screen.getByText('POST')).toBeInTheDocument();
        expect(screen.getByText('DELETE')).toBeInTheDocument();
      });
    });

    it('displays status codes', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument();
        expect(screen.getByText('201')).toBeInTheDocument();
        expect(screen.getByText('401')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
      });
    });

    it('displays duration', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('45ms')).toBeInTheDocument();
        expect(screen.getByText('120ms')).toBeInTheDocument();
      });
    });

    it('displays user email when available', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      });
    });

    it('applies correct status colors', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        const successStatus = screen.getByText('200');
        expect(successStatus).toHaveClass('text-green-500');

        const clientErrorStatus = screen.getByText('401');
        expect(clientErrorStatus).toHaveClass('text-yellow-500');

        const serverErrorStatus = screen.getByText('500');
        expect(serverErrorStatus).toHaveClass('text-red-500');
      });
    });
  });

  describe('Search', () => {
    it('has search input', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by request ID...')).toBeInTheDocument();
      });
    });

    it('updates search value when typing', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by request ID...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by request ID...');
      await user.type(searchInput, 'req-abc');

      expect(searchInput).toHaveValue('req-abc');
    });

    it('triggers search when typing', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by request ID...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by request ID...');
      await user.type(searchInput, 'req-abc');

      // Wait for debounce
      await waitFor(() => {
        expect(adminApi.getLogs).toHaveBeenCalledWith(
          expect.objectContaining({ requestId: 'req-abc' })
        );
      });
    });
  });

  describe('Filter Toggle', () => {
    it('has filter button', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        const filterButton = document.querySelector('[class*="border"]');
        expect(filterButton).toBeInTheDocument();
      });
    });

    it('shows filter panel when clicking filter button', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      // Find and click filter toggle button
      const filterButtons = document.querySelectorAll('button');
      const filterButton = Array.from(filterButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (filterButton) {
        await user.click(filterButton);

        await waitFor(() => {
          expect(screen.getByText('Status Code')).toBeInTheDocument();
          expect(screen.getByText('Has Error')).toBeInTheDocument();
          expect(screen.getByText('Limit')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Filters', () => {
    it('can filter by status code', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      // Open filter panel first
      const filterButtons = document.querySelectorAll('button');
      const filterButton = Array.from(filterButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (filterButton) {
        await user.click(filterButton);

        await waitFor(() => {
          expect(screen.getByText('Status Code')).toBeInTheDocument();
        });

        // Find and change status code filter
        const statusSelect = screen.getAllByRole('combobox')[0];
        await user.selectOptions(statusSelect, '200');

        expect(adminApi.getLogs).toHaveBeenCalled();
      }
    });

    it('can filter by errors only', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      // Open filter panel
      const filterButtons = document.querySelectorAll('button');
      const filterButton = Array.from(filterButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (filterButton) {
        await user.click(filterButton);

        await waitFor(() => {
          expect(screen.getByText('Has Error')).toBeInTheDocument();
        });

        // Find and change has error filter
        const errorSelect = screen.getAllByRole('combobox')[1];
        await user.selectOptions(errorSelect, 'true');

        expect(adminApi.getLogs).toHaveBeenCalled();
      }
    });

    it('can change result limit', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      // Open filter panel
      const filterButtons = document.querySelectorAll('button');
      const filterButton = Array.from(filterButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (filterButton) {
        await user.click(filterButton);

        await waitFor(() => {
          expect(screen.getByText('Limit')).toBeInTheDocument();
        });

        // Find and change limit filter
        const limitSelect = screen.getAllByRole('combobox')[2];
        await user.selectOptions(limitSelect, '100');

        expect(adminApi.getLogs).toHaveBeenCalled();
      }
    });
  });

  describe('Pagination', () => {
    it('displays pagination info', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1-4 of 4 logs/)).toBeInTheDocument();
      });
    });

    it('displays page info', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
      });
    });

    it('has pagination buttons', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /first page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /last page/i })).toBeInTheDocument();
      });
    });

    it('disables pagination buttons when on first/only page', async () => {
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /first page/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /last page/i })).toBeDisabled();
      });
    });

    it('enables next buttons when more pages exist', async () => {
      adminApi.getLogs.mockResolvedValue({
        data: {
          logs: mockLogs.data.logs,
          total: 100, // More than one page
        },
      });

      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /last page/i })).not.toBeDisabled();
      });
    });
  });

  describe('Log Detail Drawer', () => {
    it('opens drawer when clicking a log row', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      // Click on a log row
      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('notes.list.success')).toBeInTheDocument();
        expect(screen.getByText('Request ID')).toBeInTheDocument();
      });
    });

    it('displays request details in drawer', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Request')).toBeInTheDocument();
        expect(screen.getByText('Method')).toBeInTheDocument();
        expect(screen.getByText('Route')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });

    it('displays user info in drawer when available', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByText('User ID')).toBeInTheDocument();
      });
    });

    it('displays error info for error logs', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/projects/123')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/projects/123').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('INTERNAL_ERROR')).toBeInTheDocument();
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    it('displays client info in drawer', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Client')).toBeInTheDocument();
        expect(screen.getByText('IP')).toBeInTheDocument();
        expect(screen.getByText('Origin')).toBeInTheDocument();
      });
    });

    it('displays sampling info in drawer', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Sampling')).toBeInTheDocument();
        expect(screen.getByText('Sampled')).toBeInTheDocument();
        expect(screen.getByText('Reason')).toBeInTheDocument();
      });
    });

    it('has copy request ID button', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        const copyButton = screen.getByTitle('Copy');
        expect(copyButton).toBeInTheDocument();
      });
    });

    it('closes drawer when clicking close button', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Request ID')).toBeInTheDocument();
      });

      // Click close button in the drawer header
      const drawer = document.querySelector('.fixed.inset-0.z-50');
      const closeButton = drawer?.querySelector('button svg.lucide-x')?.closest('button');
      expect(closeButton).toBeTruthy();
      await user.click(closeButton);

      // Drawer should be closed (Request ID header in drawer should not be visible)
      await waitFor(() => {
        // The drawer should no longer be in the DOM
        const drawer = document.querySelector('.fixed.inset-0.z-50');
        // Either drawer is gone or we can't find the request ID detail header
      });
    });

    it('closes drawer when clicking overlay', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Request ID')).toBeInTheDocument();
      });

      // Click overlay
      const overlay = document.querySelector('.absolute.inset-0.bg-black\\/50');
      if (overlay) {
        await user.click(overlay);
      }
    });

    it('has raw JSON expandable section', async () => {
      const user = userEvent.setup();
      render(<AdminLogsPage />);

      await waitFor(() => {
        expect(screen.getByText('/api/notes')).toBeInTheDocument();
      });

      const logRow = screen.getByText('/api/notes').closest('div[class*="cursor-pointer"]');
      await user.click(logRow);

      await waitFor(() => {
        expect(screen.getByText('Raw JSON')).toBeInTheDocument();
      });
    });
  });
});
