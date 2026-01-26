import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserSocialTab from './UserSocialTab';

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock UserAvatar component to simplify tests
vi.mock('../../../components/ui/UserAvatar', () => ({
  default: ({ user, size }) => (
    <div data-testid="user-avatar" data-size={size}>
      {user?.profile?.displayName || user?.email || 'Avatar'}
    </div>
  ),
}));

// Mock adminApi
vi.mock('../../../lib/api', () => ({
  adminApi: {
    getUserSocialStats: vi.fn(),
    getUserConnections: vi.fn(),
    getUserBlocks: vi.fn(),
    getUserMessages: vi.fn(),
    getUserShares: vi.fn(),
    getUserConnectionPatterns: vi.fn(),
    getUserReports: vi.fn(),
  },
}));

import { adminApi } from '../../../lib/api';

// Helper to wait for stats to load - uses a unique value that only appears in stats
const waitForStatsLoaded = async () => {
  // 3 / 1 is only displayed in the blocks stat card
  await waitFor(() => {
    expect(screen.getByText('3 / 1')).toBeInTheDocument();
  }, { timeout: 3000 });
};

describe('UserSocialTab', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    profile: {
      displayName: 'Test User',
    },
  };

  const mockStats = {
    connections: {
      total: 15,
      pendingReceived: 2,
      pendingSent: 1,
    },
    blocks: {
      blocked: 3,
      blockedBy: 1,
    },
    messaging: {
      messagesSent: 42,
      conversations: 5,
    },
    sharing: {
      itemsShared: 8,
      itemsReceived: 12,
    },
  };

  const mockConnections = {
    connections: [
      {
        _id: 'conn1',
        connectedUser: {
          _id: 'connUser1',
          email: 'friend1@example.com',
          displayName: 'Friend One',
        },
        updatedAt: '2026-01-15T10:00:00Z',
      },
      {
        _id: 'conn2',
        connectedUser: {
          _id: 'connUser2',
          email: 'friend2@example.com',
          displayName: 'Friend Two',
        },
        updatedAt: '2026-01-10T10:00:00Z',
      },
    ],
  };

  const mockBlocks = {
    blockedByUser: [
      {
        _id: 'block1',
        user: {
          _id: 'blockedUser1',
          email: 'blocked@example.com',
          displayName: 'Blocked User',
        },
        reason: 'Spam',
      },
    ],
    blockedThisUser: [
      {
        _id: 'block2',
        user: {
          _id: 'blockerUser1',
          email: 'blocker@example.com',
          displayName: 'Blocker User',
        },
        reason: 'Harassment',
      },
    ],
  };

  const mockMessages = {
    conversations: [
      {
        _id: 'conv1',
        participants: [
          { _id: 'user123', email: 'test@example.com', displayName: 'Test User' },
          { _id: 'otherUser1', email: 'other@example.com', displayName: 'Other User' },
        ],
        messageCount: 25,
        userMessageCount: 15,
      },
    ],
    totalMessagesSent: 42,
  };

  const mockShares = {
    sharedByUser: [
      {
        _id: 'share1',
        itemType: 'note',
        shareType: 'view',
        sharedWith: [{ _id: 'recipient1' }],
      },
    ],
    sharedWithUser: [
      {
        _id: 'share2',
        itemType: 'task',
        owner: { email: 'owner@example.com', displayName: 'Owner' },
        permission: 'edit',
      },
    ],
  };

  const mockConnectionPatterns = {
    riskLevel: 'low',
    riskIndicators: [],
    requests: {
      sent: 10,
      accepted: 8,
      declined: 2,
      rejectionRate: 20,
    },
    blockedBy: {
      count: 0,
      users: [],
    },
  };

  const mockReports = {
    reports: [
      {
        _id: 'report1',
        status: 'pending',
        reason: 'inappropriate_content',
        description: 'Posted spam',
        createdAt: '2026-01-20T10:00:00Z',
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Set up default successful responses
    adminApi.getUserSocialStats.mockResolvedValue({ data: mockStats });
    adminApi.getUserConnections.mockResolvedValue({ data: mockConnections });
    adminApi.getUserBlocks.mockResolvedValue({ data: mockBlocks });
    adminApi.getUserMessages.mockResolvedValue({ data: mockMessages });
    adminApi.getUserShares.mockResolvedValue({ data: mockShares });
    adminApi.getUserConnectionPatterns.mockResolvedValue({ data: mockConnectionPatterns });
    adminApi.getUserReports.mockResolvedValue({ data: mockReports });
  });

  // Helper to find section header button by text
  const findSectionHeader = (text) => {
    const buttons = screen.getAllByRole('button');
    return buttons.find(btn =>
      btn.textContent.includes(text) &&
      btn.className.includes('w-full') &&
      btn.className.includes('bg-panel')
    );
  };

  // ==================== Loading State Tests ====================

  it('renders loading state initially', () => {
    adminApi.getUserSocialStats.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<UserSocialTab user={mockUser} />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ==================== Stats Cards Tests ====================

  it('renders stats cards when data is loaded', async () => {
    render(<UserSocialTab user={mockUser} />);

    // Wait for unique stat values to appear
    await waitForStatsLoaded();

    // Check all stat values are present
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('8 / 12')).toBeInTheDocument();
  });

  // ==================== Pending Requests Tests ====================

  it('displays pending requests when present', async () => {
    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Pending:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/2 received, 1 sent/)).toBeInTheDocument();
  });

  it('does not display pending requests when none exist', async () => {
    adminApi.getUserSocialStats.mockResolvedValue({
      data: {
        ...mockStats,
        connections: {
          ...mockStats.connections,
          pendingReceived: 0,
          pendingSent: 0,
        },
      },
    });

    render(<UserSocialTab user={mockUser} />);

    // Wait for stats to load
    await waitForStatsLoaded();

    expect(screen.queryByText(/Pending:/)).not.toBeInTheDocument();
  });

  // ==================== Connections Section (Default Expanded) ====================

  it('connections section is expanded by default and shows users', async () => {
    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('friend1@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('friend2@example.com')).toBeInTheDocument();
  });

  it('connections section shows empty state when no connections', async () => {
    adminApi.getUserConnections.mockResolvedValue({
      data: { connections: [] },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('No connections')).toBeInTheDocument();
    });
  });

  it('connections section shows error state', async () => {
    adminApi.getUserConnections.mockRejectedValue(new Error('Network error'));

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load connections')).toBeInTheDocument();
    });
  });

  it('shows more connections link when over 10 connections', async () => {
    const manyConnections = Array.from({ length: 15 }, (_, i) => ({
      _id: `conn${i}`,
      connectedUser: {
        _id: `user${i}`,
        email: `user${i}@example.com`,
      },
      updatedAt: '2026-01-15T10:00:00Z',
    }));

    adminApi.getUserConnections.mockResolvedValue({
      data: { connections: manyConnections },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('+5 more connections')).toBeInTheDocument();
    });
  });

  // ==================== Risk Indicators Tests ====================

  it('displays risk indicators when present', async () => {
    adminApi.getUserConnectionPatterns.mockResolvedValue({
      data: {
        ...mockConnectionPatterns,
        riskIndicators: [
          { severity: 'high', message: 'High block rate detected' },
          { severity: 'medium', message: 'Unusual connection pattern' },
        ],
      },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Risk Indicators')).toBeInTheDocument();
    });

    expect(screen.getByText('High block rate detected')).toBeInTheDocument();
    expect(screen.getByText('Unusual connection pattern')).toBeInTheDocument();
  });

  it('does not display risk indicators section when none exist', async () => {
    render(<UserSocialTab user={mockUser} />);

    // Wait for stats to load
    await waitForStatsLoaded();

    // Risk Indicators heading should not appear when there are no indicators
    expect(screen.queryByText('Risk Indicators')).not.toBeInTheDocument();
  });

  // ==================== Navigation Tests ====================

  it('clicking on a connected user navigates to their profile', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('friend1@example.com')).toBeInTheDocument();
    });

    // Find the user card container with cursor-pointer class
    const userEmail = screen.getByText('friend1@example.com');
    const userCard = userEmail.closest('[class*="cursor-pointer"]');
    await user.click(userCard);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/users?user=connUser1');
  });

  // ==================== Default/Edge Case Tests ====================

  it('handles missing stats gracefully', async () => {
    adminApi.getUserSocialStats.mockResolvedValue({ data: {} });

    render(<UserSocialTab user={mockUser} />);

    // Wait for the component to render by checking for stat labels
    await waitFor(() => {
      expect(screen.getByText('Blocked / By')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show 0 / 0 for blocked/blockedBy with missing stats
    const blockedLabel = screen.getByText('Blocked / By');
    const blockedStatCard = blockedLabel.closest('button');
    // Verify it rendered with fallback values
    expect(within(blockedStatCard).getByText('0 / 0')).toBeInTheDocument();
  });

  // ==================== Section Expansion via Stat Cards ====================

  it('clicking messages stat card expands messages section', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    // Click the Messages stat card (find by the value since it's unique)
    const messagesValue = screen.getByText('42');
    const messagesStatCard = messagesValue.closest('button');
    await user.click(messagesStatCard);

    // Messages section should now be expanded and show data
    await waitFor(() => {
      expect(screen.getByText('Total messages sent: 42')).toBeInTheDocument();
    });

    expect(screen.getByText('Other User')).toBeInTheDocument();
  });

  it('messages section shows empty state when no conversations', async () => {
    const user = userEvent.setup();
    adminApi.getUserMessages.mockResolvedValue({
      data: { conversations: [], totalMessagesSent: 0 },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    // Expand messages section by clicking stat card
    const messagesValue = screen.getByText('42');
    const messagesStatCard = messagesValue.closest('button');
    await user.click(messagesStatCard);

    await waitFor(() => {
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });
  });

  it('clicking shares stat card expands shares section', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('8 / 12')).toBeInTheDocument();
    });

    // Expand shares section via stat card
    const sharesValue = screen.getByText('8 / 12');
    const sharesStatCard = sharesValue.closest('button');
    await user.click(sharesStatCard);

    await waitFor(() => {
      expect(screen.getByText('Items shared by this user')).toBeInTheDocument();
    });

    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('Items shared with this user')).toBeInTheDocument();
    expect(screen.getByText('task')).toBeInTheDocument();
  });

  it('shares section shows empty state when no shares', async () => {
    const user = userEvent.setup();
    adminApi.getUserShares.mockResolvedValue({
      data: { sharedByUser: [], sharedWithUser: [] },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('8 / 12')).toBeInTheDocument();
    });

    const sharesValue = screen.getByText('8 / 12');
    const sharesStatCard = sharesValue.closest('button');
    await user.click(sharesStatCard);

    await waitFor(() => {
      expect(screen.getByText('No shared items')).toBeInTheDocument();
    });
  });

  it('clicking blocks stat card expands blocks section', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('3 / 1')).toBeInTheDocument();
    });

    // Click blocks stat card
    const blocksValue = screen.getByText('3 / 1');
    const blocksStatCard = blocksValue.closest('button');
    await user.click(blocksStatCard);

    await waitFor(() => {
      expect(screen.getByText('Users blocked by this user')).toBeInTheDocument();
    });

    expect(screen.getByText('blocked@example.com')).toBeInTheDocument();
    expect(screen.getByText('Blocked: Spam')).toBeInTheDocument();
    expect(screen.getByText('Users who blocked this user')).toBeInTheDocument();
    expect(screen.getByText('blocker@example.com')).toBeInTheDocument();
  });

  it('blocks section shows empty state when no blocks', async () => {
    const user = userEvent.setup();
    adminApi.getUserBlocks.mockResolvedValue({
      data: { blockedByUser: [], blockedThisUser: [] },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('3 / 1')).toBeInTheDocument();
    });

    const blocksValue = screen.getByText('3 / 1');
    const blocksStatCard = blocksValue.closest('button');
    await user.click(blocksStatCard);

    await waitFor(() => {
      expect(screen.getByText('No blocks')).toBeInTheDocument();
    });
  });

  // ==================== Reports Section Tests ====================

  it('reports section shows reports when expanded via section header', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    // Wait for stats to load
    await waitForStatsLoaded();

    // Find and click the section header using text content
    const reportsText = screen.getByText('Reports Against User');
    const reportsHeader = reportsText.closest('button');
    await user.click(reportsHeader);

    await waitFor(() => {
      expect(screen.getByText('Total reports: 1')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('inappropriate content')).toBeInTheDocument();
  });

  it('reports section shows empty state when no reports', async () => {
    const user = userEvent.setup();
    adminApi.getUserReports.mockResolvedValue({
      data: { reports: [], total: 0 },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitForStatsLoaded();

    const reportsText = screen.getByText('Reports Against User');
    const reportsHeader = reportsText.closest('button');
    await user.click(reportsHeader);

    await waitFor(() => {
      expect(screen.getByText('No reports against this user')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('reports section view all link navigates correctly', async () => {
    const user = userEvent.setup();
    adminApi.getUserReports.mockResolvedValue({
      data: {
        reports: Array.from({ length: 5 }, (_, i) => ({
          _id: `report${i}`,
          status: 'pending',
          reason: 'spam',
          createdAt: '2026-01-20T10:00:00Z',
        })),
        total: 8,
      },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitForStatsLoaded();

    const reportsText = screen.getByText('Reports Against User');
    const reportsHeader = reportsText.closest('button');
    await user.click(reportsHeader);

    await waitFor(() => {
      expect(screen.getByText('View all 8 reports')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('View all 8 reports'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/reports?user=user123');
  });

  // ==================== Connection Patterns Section ====================

  it('connection patterns section shows stats when expanded', async () => {
    const user = userEvent.setup();
    render(<UserSocialTab user={mockUser} />);

    await waitForStatsLoaded();

    const patternsText = screen.getByText('Connection Patterns');
    const patternsHeader = patternsText.closest('button');
    await user.click(patternsHeader);

    await waitFor(() => {
      expect(screen.getByText('Risk Level:')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('Requests Sent (30d)')).toBeInTheDocument();
  });

  it('connection patterns shows high risk level with red color', async () => {
    const user = userEvent.setup();
    adminApi.getUserConnectionPatterns.mockResolvedValue({
      data: {
        ...mockConnectionPatterns,
        riskLevel: 'high',
      },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitForStatsLoaded();

    const patternsText = screen.getByText('Connection Patterns');
    const patternsHeader = patternsText.closest('button');
    await user.click(patternsHeader);

    await waitFor(() => {
      const riskBadge = screen.getByText('high');
      expect(riskBadge).toHaveClass('text-red-500');
    }, { timeout: 3000 });
  });

  it('connection patterns shows blocked by users warning', async () => {
    const user = userEvent.setup();
    adminApi.getUserConnectionPatterns.mockResolvedValue({
      data: {
        ...mockConnectionPatterns,
        blockedBy: {
          count: 3,
          users: [
            {
              user: {
                _id: 'blocker1',
                email: 'blocker1@example.com',
                profile: { displayName: 'Blocker One' },
              },
              reason: 'Spam',
            },
          ],
        },
      },
    });

    render(<UserSocialTab user={mockUser} />);

    await waitForStatsLoaded();

    const patternsText = screen.getByText('Connection Patterns');
    const patternsHeader = patternsText.closest('button');
    await user.click(patternsHeader);

    await waitFor(() => {
      expect(screen.getByText(/Blocked by 3 user/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
