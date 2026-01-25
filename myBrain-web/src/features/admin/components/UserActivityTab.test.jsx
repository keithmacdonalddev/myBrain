import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserActivityTab from './UserActivityTab';

// Mock the hook
vi.mock('../hooks/useAdminUsers', () => ({
  useUserActivity: vi.fn(),
}));

import { useUserActivity } from '../hooks/useAdminUsers';

describe('UserActivityTab', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    lastLoginAt: '2026-01-20T10:00:00Z',
    lastLoginIp: '192.168.1.1',
  };

  const mockActivityData = {
    stats: {
      totalRequests: 150,
      contentCreated: 25,
      contentUpdated: 40,
      logins: 10,
    },
    timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        activities: [
          {
            _id: '1',
            eventName: 'note.create',
            method: 'POST',
            route: '/api/notes',
            timestamp: new Date().toISOString(),
            statusCode: 201,
            durationMs: 45,
          },
          {
            _id: '2',
            eventName: 'task.update',
            method: 'PATCH',
            route: '/api/tasks/123',
            timestamp: new Date().toISOString(),
            statusCode: 200,
            durationMs: 32,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders date range selector buttons', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByRole('button', { name: 'Last 24 hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
  });

  it('renders stats cards with correct values', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('150')).toBeInTheDocument(); // Total Requests
    expect(screen.getByText('10')).toBeInTheDocument(); // Logins
    expect(screen.getByText('25')).toBeInTheDocument(); // Created
    expect(screen.getByText('40')).toBeInTheDocument(); // Updated
  });

  it('renders stats labels', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('Logins')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('renders activity timeline header', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useUserActivity.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<UserActivityTab user={mockUser} />);

    // Check for spinning loader
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    useUserActivity.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('Failed to load user activity')).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    useUserActivity.mockReturnValue({
      data: { stats: mockActivityData.stats, timeline: [] },
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('No activity in selected period')).toBeInTheDocument();
  });

  it('changes date range when button is clicked', async () => {
    const user = userEvent.setup();
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    // Click 30 days button
    await user.click(screen.getByRole('button', { name: 'Last 30 days' }));

    // The 30d button should now have active styling
    const button30d = screen.getByRole('button', { name: 'Last 30 days' });
    expect(button30d).toHaveClass('border-primary');
  });

  it('displays last login information', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText(/Last login:/)).toBeInTheDocument();
    expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
  });

  it('does not display last login IP if not available', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    const userNoIp = {
      ...mockUser,
      lastLoginIp: null,
    };

    render(<UserActivityTab user={userNoIp} />);

    expect(screen.getByText(/Last login:/)).toBeInTheDocument();
    expect(screen.queryByText(/from/)).not.toBeInTheDocument();
  });

  it('does not display last login if not available', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    const userNoLogin = {
      ...mockUser,
      lastLoginAt: null,
    };

    render(<UserActivityTab user={userNoLogin} />);

    expect(screen.queryByText(/Last login:/)).not.toBeInTheDocument();
  });

  it('renders activity items with method and route', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('PATCH')).toBeInTheDocument();
    expect(screen.getByText('api/notes')).toBeInTheDocument();
    expect(screen.getByText('api/tasks')).toBeInTheDocument();
  });

  it('shows status codes for activities', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('201')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows duration for activities', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('45ms')).toBeInTheDocument();
    expect(screen.getByText('32ms')).toBeInTheDocument();
  });

  it('displays Today for current date activities', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('displays default stats when data is null', () => {
    useUserActivity.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    // Should show 0 for all stats
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it('7 days button is active by default', () => {
    useUserActivity.mockReturnValue({
      data: mockActivityData,
      isLoading: false,
      error: null,
    });

    render(<UserActivityTab user={mockUser} />);

    const button7d = screen.getByRole('button', { name: 'Last 7 days' });
    expect(button7d).toHaveClass('border-primary');
  });
});
