import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ConnectionsList from './ConnectionsList';

// Mock child component
vi.mock('./ConnectionCard', () => ({
  default: ({ connection, type }) => (
    <div data-testid="connection-card" data-type={type}>
      {connection.user?.profile?.displayName || 'User'}
    </div>
  ),
}));

// Mock the hooks
vi.mock('../hooks/useConnections', () => ({
  useConnections: vi.fn(),
  usePendingRequests: vi.fn(),
  useSentRequests: vi.fn(),
  useBlockedUsers: vi.fn(),
  useConnectionCounts: vi.fn(),
  useUnblockUser: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import {
  useConnections,
  usePendingRequests,
  useSentRequests,
  useBlockedUsers,
  useConnectionCounts,
  useUnblockUser,
} from '../hooks/useConnections';

const mockConnections = {
  connections: [
    {
      _id: 'conn1',
      user: { _id: 'user1', profile: { displayName: 'John Doe' } },
    },
    {
      _id: 'conn2',
      user: { _id: 'user2', profile: { displayName: 'Jane Smith' } },
    },
  ],
};

const mockPendingRequests = {
  requests: [
    {
      _id: 'req1',
      user: { _id: 'user3', profile: { displayName: 'Bob Wilson' } },
    },
  ],
};

const mockSentRequests = {
  requests: [
    {
      _id: 'req2',
      user: { _id: 'user4', profile: { displayName: 'Alice Brown' } },
    },
  ],
};

const mockBlockedUsers = {
  blocked: [
    {
      _id: 'block1',
      user: { _id: 'user5', profile: { displayName: 'Blocked User' } },
      blockedAt: '2024-01-15T10:00:00Z',
    },
  ],
  total: 1,
};

const mockCounts = {
  connections: 2,
  pending: 1,
  sent: 1,
};

describe('ConnectionsList', () => {
  const mockUnblock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useConnectionCounts).mockReturnValue({
      data: mockCounts,
      isLoading: false,
    });

    vi.mocked(useConnections).mockReturnValue({
      data: mockConnections,
      isLoading: false,
    });

    vi.mocked(usePendingRequests).mockReturnValue({
      data: mockPendingRequests,
      isLoading: false,
    });

    vi.mocked(useSentRequests).mockReturnValue({
      data: mockSentRequests,
      isLoading: false,
    });

    vi.mocked(useBlockedUsers).mockReturnValue({
      data: mockBlockedUsers,
      isLoading: false,
    });

    vi.mocked(useUnblockUser).mockReturnValue({
      mutate: mockUnblock,
      isPending: false,
    });
  });

  it('renders tab buttons', () => {
    render(<ConnectionsList />);

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('displays connection counts on tabs', () => {
    render(<ConnectionsList />);

    // Counts should be visible as badges in tabs
    const countBadges = document.querySelectorAll('.text-xs.rounded-full');
    expect(countBadges.length).toBeGreaterThan(0);

    // Check that counts are rendered
    expect(screen.getByText('2')).toBeInTheDocument(); // connections count
  });

  it('shows connections tab by default', () => {
    render(<ConnectionsList />);

    const connectionCards = screen.getAllByTestId('connection-card');
    expect(connectionCards).toHaveLength(2);
    expect(connectionCards[0]).toHaveAttribute('data-type', 'connection');
  });

  it('starts with initial tab if provided', () => {
    render(<ConnectionsList initialTab="pending" />);

    const connectionCards = screen.getAllByTestId('connection-card');
    expect(connectionCards).toHaveLength(1);
    expect(connectionCards[0]).toHaveAttribute('data-type', 'pending');
  });

  it('switches to pending tab when clicked', async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);

    await user.click(screen.getByText('Pending'));

    const connectionCards = screen.getAllByTestId('connection-card');
    expect(connectionCards).toHaveLength(1);
    expect(connectionCards[0]).toHaveAttribute('data-type', 'pending');
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('switches to sent tab when clicked', async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);

    await user.click(screen.getByText('Sent'));

    const connectionCards = screen.getAllByTestId('connection-card');
    expect(connectionCards).toHaveLength(1);
    expect(connectionCards[0]).toHaveAttribute('data-type', 'sent');
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
  });

  it('switches to blocked tab when clicked', async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));

    expect(screen.getByText('Blocked User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument();
  });

  it('unblocks user when unblock button clicked', async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));
    await user.click(screen.getByRole('button', { name: 'Unblock' }));

    expect(mockUnblock).toHaveBeenCalledWith('user5');
  });

  it('shows loading state while fetching connections', () => {
    vi.mocked(useConnections).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ConnectionsList />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no connections', () => {
    vi.mocked(useConnections).mockReturnValue({
      data: { connections: [] },
      isLoading: false,
    });

    render(<ConnectionsList />);

    expect(screen.getByText('No connections yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Search for people to connect with or check your pending requests.'
      )
    ).toBeInTheDocument();
  });

  it('shows empty state when no pending requests', async () => {
    const user = userEvent.setup();
    vi.mocked(usePendingRequests).mockReturnValue({
      data: { requests: [] },
      isLoading: false,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Pending'));

    expect(screen.getByText('No pending requests')).toBeInTheDocument();
    expect(
      screen.getByText(
        'When someone sends you a connection request, it will appear here.'
      )
    ).toBeInTheDocument();
  });

  it('shows empty state when no sent requests', async () => {
    const user = userEvent.setup();
    vi.mocked(useSentRequests).mockReturnValue({
      data: { requests: [] },
      isLoading: false,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Sent'));

    expect(screen.getByText('No sent requests')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connection requests you\'ve sent will appear here.'
      )
    ).toBeInTheDocument();
  });

  it('shows empty state when no blocked users', async () => {
    const user = userEvent.setup();
    vi.mocked(useBlockedUsers).mockReturnValue({
      data: { blocked: [], total: 0 },
      isLoading: false,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));

    expect(screen.getByText('No blocked users')).toBeInTheDocument();
    expect(
      screen.getByText('Users you block will appear here.')
    ).toBeInTheDocument();
  });

  it('shows loading state for pending tab', async () => {
    const user = userEvent.setup();
    vi.mocked(usePendingRequests).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Pending'));

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows loading state for sent tab', async () => {
    const user = userEvent.setup();
    vi.mocked(useSentRequests).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Sent'));

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows loading state for blocked tab', async () => {
    const user = userEvent.setup();
    vi.mocked(useBlockedUsers).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ConnectionsList className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('disables unblock button when mutation is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(useUnblockUser).mockReturnValue({
      mutate: mockUnblock,
      isPending: true,
    });

    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));

    expect(screen.getByRole('button', { name: 'Unblock' })).toBeDisabled();
  });

  it('displays blocked date for blocked users', async () => {
    const user = userEvent.setup();
    render(<ConnectionsList />);

    await user.click(screen.getByText('Blocked'));

    // Look for the date format in the blocked user card
    expect(screen.getByText(/Blocked \d/)).toBeInTheDocument();
  });

  it('handles zero counts gracefully', () => {
    vi.mocked(useConnectionCounts).mockReturnValue({
      data: { connections: 0, pending: 0, sent: 0 },
      isLoading: false,
    });

    render(<ConnectionsList />);

    // Tabs should still render without count badges (0 counts don't show badge)
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
