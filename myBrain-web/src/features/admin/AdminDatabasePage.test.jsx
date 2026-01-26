/**
 * =============================================================================
 * ADMINDATABASEPAGE.TEST.JSX - Unit Tests for AdminDatabasePage
 * =============================================================================
 *
 * Tests the AdminDatabasePage component which displays MongoDB database metrics.
 * Covers:
 * - Loading states
 * - Error states
 * - Database overview stats
 * - Health status display
 * - Document counts
 * - Growth statistics
 * - Collection details
 * - Slow queries panel
 * - Server info
 * - Refresh functionality
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminDatabasePage from './AdminDatabasePage';

// Mock the API module
vi.mock('../../lib/api', () => ({
  adminApi: {
    getDatabaseMetrics: vi.fn(),
    getDatabaseHealth: vi.fn(),
    getSlowQueries: vi.fn(),
  },
}));

import { adminApi } from '../../lib/api';

describe('AdminDatabasePage', () => {
  const mockMetrics = {
    data: {
      database: {
        totalSizeMB: 256,
        dataSizeMB: 200,
        indexSizeMB: 56,
        avgObjSize: 1024,
        objects: 50000,
        collections: 15,
      },
      connection: {
        readyStateText: 'Connected',
        host: 'cluster0.mongodb.net',
        port: 27017,
      },
      documentCounts: {
        total: 50000,
        users: 250,
        notes: 5000,
        tasks: 3000,
        projects: 500,
        events: 1000,
        images: 2500,
        files: 1500,
        folders: 200,
        logs: 35000,
        lifeAreas: 50,
        tags: 1000,
      },
      growth: {
        users: { last7Days: 15, last30Days: 45, avgPerDay30: 1.5 },
        notes: { last7Days: 500, last30Days: 1500, avgPerDay30: 50 },
        tasks: { last7Days: 300, last30Days: 900, avgPerDay30: 30 },
      },
      collections: [
        {
          name: 'logs',
          count: 35000,
          size: 50000000,
          storageSize: 60000000,
          avgObjSize: 1428,
          totalIndexSize: 5000000,
          indexCount: 4,
        },
        {
          name: 'notes',
          count: 5000,
          size: 10000000,
          storageSize: 12000000,
          avgObjSize: 2000,
          totalIndexSize: 1000000,
          indexCount: 3,
        },
        {
          name: 'users',
          count: 250,
          size: 500000,
          storageSize: 600000,
          avgObjSize: 2000,
          totalIndexSize: 100000,
          indexCount: 5,
        },
      ],
      server: {
        version: '7.0.5',
        uptimeDays: 45,
        currentConnections: 12,
        availableConnections: 488,
        opcounters: {
          insert: 150000,
          query: 2500000,
          update: 800000,
          delete: 50000,
          getmore: 100000,
          command: 3000000,
        },
      },
      timestamp: new Date().toISOString(),
    },
  };

  const mockHealth = {
    data: {
      healthy: true,
      checks: {
        ping: {
          latencyMs: 25,
        },
      },
    },
  };

  const mockSlowQueries = {
    data: {
      slowQueries: [
        {
          method: 'GET',
          route: '/api/logs',
          count: 15,
          avgDuration: 750,
          minDuration: 520,
          maxDuration: 1200,
          lastOccurred: new Date().toISOString(),
        },
        {
          method: 'POST',
          route: '/api/analytics/query',
          count: 8,
          avgDuration: 650,
          minDuration: 510,
          maxDuration: 980,
          lastOccurred: new Date().toISOString(),
        },
      ],
      distribution: [
        { range: '0-100ms', count: 50000 },
        { range: '100-200ms', count: 15000 },
        { range: '200-500ms', count: 5000 },
        { range: '500ms+', count: 23 },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    adminApi.getDatabaseMetrics.mockResolvedValue(mockMetrics);
    adminApi.getDatabaseHealth.mockResolvedValue(mockHealth);
    adminApi.getSlowQueries.mockResolvedValue(mockSlowQueries);
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching data', async () => {
      // Make the API calls hang
      adminApi.getDatabaseMetrics.mockImplementation(() => new Promise(() => {}));
      adminApi.getDatabaseHealth.mockImplementation(() => new Promise(() => {}));

      render(<AdminDatabasePage />);

      // Should show spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when metrics API fails', async () => {
      adminApi.getDatabaseMetrics.mockRejectedValue(new Error('Connection failed'));

      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load database metrics')).toBeInTheDocument();
      });
    });

    it('shows error details', async () => {
      adminApi.getDatabaseMetrics.mockRejectedValue(new Error('Network timeout'));

      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Header and Health', () => {
    it('renders database metrics header', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Database Metrics')).toBeInTheDocument();
      });
    });

    it('displays healthy status badge when database is healthy', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });
    });

    it('displays unhealthy status when database is unhealthy', async () => {
      adminApi.getDatabaseHealth.mockResolvedValue({
        data: {
          healthy: false,
          checks: { ping: { latencyMs: 2000 } },
        },
      });

      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      });
    });

    it('shows ping latency', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('(25ms)')).toBeInTheDocument();
      });
    });
  });

  describe('Overview Stats', () => {
    it('displays database size', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Database Size')).toBeInTheDocument();
        expect(screen.getByText('256 MB')).toBeInTheDocument();
      });
    });

    it('displays data size', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Data Size')).toBeInTheDocument();
        expect(screen.getByText('200 MB')).toBeInTheDocument();
      });
    });

    it('displays index size', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Index Size')).toBeInTheDocument();
        expect(screen.getByText('56 MB')).toBeInTheDocument();
      });
    });

    it('displays connection status', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Connection')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('displays total objects count', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('50,000 total objects')).toBeInTheDocument();
      });
    });
  });

  describe('Document Counts', () => {
    it('renders document counts section', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Document Counts')).toBeInTheDocument();
      });
    });

    it('displays individual document counts', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument();
        expect(screen.getByText('250')).toBeInTheDocument();
        expect(screen.getByText('notes')).toBeInTheDocument();
        expect(screen.getByText('5,000')).toBeInTheDocument();
      });
    });

    it('displays total documents', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText(/Total Documents:/)).toBeInTheDocument();
        expect(screen.getByText('50,000')).toBeInTheDocument();
      });
    });
  });

  describe('Growth Stats', () => {
    it('renders growth section', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Growth (Last 30 Days)')).toBeInTheDocument();
      });
    });

    it('displays growth for each entity type', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        // Check for 7-day growth numbers
        expect(screen.getByText('15')).toBeInTheDocument(); // users last 7 days
        expect(screen.getByText('500')).toBeInTheDocument(); // notes last 7 days
        expect(screen.getByText('300')).toBeInTheDocument(); // tasks last 7 days
      });
    });
  });

  describe('Collections', () => {
    it('renders collections section', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Collections')).toBeInTheDocument();
      });
    });

    it('displays collection names', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('logs')).toBeInTheDocument();
        expect(screen.getByText('notes')).toBeInTheDocument();
        expect(screen.getByText('users')).toBeInTheDocument();
      });
    });

    it('displays collection document counts', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('35,000 docs')).toBeInTheDocument();
        expect(screen.getByText('5,000 docs')).toBeInTheDocument();
        expect(screen.getByText('250 docs')).toBeInTheDocument();
      });
    });

    it('expands collection to show details when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('logs')).toBeInTheDocument();
      });

      // Click on the logs collection row
      const logsRow = screen.getByText('logs').closest('button');
      await user.click(logsRow);

      // Should now show detailed info
      await waitFor(() => {
        expect(screen.getByText('Storage Size')).toBeInTheDocument();
        expect(screen.getByText('Avg Doc Size')).toBeInTheDocument();
        expect(screen.getByText('Total Index Size')).toBeInTheDocument();
        expect(screen.getByText('Indexes')).toBeInTheDocument();
      });
    });
  });

  describe('Slow Queries', () => {
    it('renders slow queries section', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Slow Queries')).toBeInTheDocument();
      });
    });

    it('displays slow query routes', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('/api/logs')).toBeInTheDocument();
        expect(screen.getByText('/api/analytics/query')).toBeInTheDocument();
      });
    });

    it('displays slow query methods', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('GET')).toBeInTheDocument();
        expect(screen.getByText('POST')).toBeInTheDocument();
      });
    });

    it('displays average duration', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('750ms')).toBeInTheDocument();
        expect(screen.getByText('650ms')).toBeInTheDocument();
      });
    });

    it('allows changing time period', async () => {
      const user = userEvent.setup();
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Slow Queries')).toBeInTheDocument();
      });

      // Find and change the period selector
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '30');

      expect(adminApi.getSlowQueries).toHaveBeenCalled();
    });

    it('shows no slow queries message when none exist', async () => {
      adminApi.getSlowQueries.mockResolvedValue({
        data: {
          slowQueries: [],
          distribution: [],
        },
      });

      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('No slow queries detected')).toBeInTheDocument();
      });
    });

    it('displays response time distribution', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Response Time Distribution')).toBeInTheDocument();
      });
    });
  });

  describe('Server Info', () => {
    it('renders server info section', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Server Info')).toBeInTheDocument();
      });
    });

    it('displays MongoDB version', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('MongoDB Version')).toBeInTheDocument();
        expect(screen.getByText('7.0.5')).toBeInTheDocument();
      });
    });

    it('displays uptime', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Uptime')).toBeInTheDocument();
        expect(screen.getByText('45 days')).toBeInTheDocument();
      });
    });

    it('displays connection counts', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Current Connections')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Available Connections')).toBeInTheDocument();
        expect(screen.getByText('488')).toBeInTheDocument();
      });
    });

    it('displays operation counters', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Operation Counters (since server start)')).toBeInTheDocument();
        expect(screen.getByText('insert')).toBeInTheDocument();
        expect(screen.getByText('query')).toBeInTheDocument();
        expect(screen.getByText('update')).toBeInTheDocument();
        expect(screen.getByText('delete')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('has refresh button', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh all metrics');
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('refreshes data when clicking refresh button', async () => {
      const user = userEvent.setup();
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText('Database Metrics')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('Refresh all metrics');
      await user.click(refreshButton);

      expect(adminApi.getDatabaseMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Timestamp', () => {
    it('displays last updated timestamp', async () => {
      render(<AdminDatabasePage />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });
});
