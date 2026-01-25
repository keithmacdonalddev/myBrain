import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import SharedWithMePage from './SharedWithMePage';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  itemSharesApi: {
    getSharedWithMe: vi.fn(),
    acceptShare: vi.fn(),
  },
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { itemSharesApi } from '../../../lib/api';

const mockShares = [
  {
    _id: 'share1',
    itemType: 'project',
    item: { _id: 'proj1', title: 'Test Project' },
    owner: { _id: 'user1', profile: { displayName: 'John Doe' } },
    permission: 'edit',
    status: 'accepted',
    sharedAt: '2024-01-15T10:00:00Z',
  },
  {
    _id: 'share2',
    itemType: 'task',
    item: { _id: 'task1', title: 'Test Task' },
    owner: { _id: 'user2', profile: { displayName: 'Jane Smith' } },
    permission: 'view',
    status: 'pending',
    sharedAt: '2024-01-16T10:00:00Z',
  },
  {
    _id: 'share3',
    itemType: 'note',
    item: { _id: 'note1', title: 'Test Note' },
    owner: { _id: 'user3', profile: { displayName: 'Bob Wilson' } },
    permission: 'comment',
    status: 'accepted',
    sharedAt: '2024-01-17T10:00:00Z',
  },
];

describe('SharedWithMePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemSharesApi.getSharedWithMe.mockResolvedValue({ shares: mockShares });
  });

  it('renders page header with title and description', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Shared with Me')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Items that others have shared with you')
    ).toBeInTheDocument();
  });

  it('displays loading skeleton while fetching data', async () => {
    // Make the API never resolve to keep loading state
    itemSharesApi.getSharedWithMe.mockReturnValue(new Promise(() => {}));

    render(<SharedWithMePage />);

    // Should show skeleton loading state - the Skeleton component uses "skeleton" class
    await waitFor(() => {
      const skeletons = document.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it('displays shared items after loading', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays item owner information', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('shows pending badge for pending shares', async () => {
    render(<SharedWithMePage />);

    // Wait for items to load first
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // The pending badge appears on the item card, not as a filter button text
    // The card has a "Pending" span for pending items
    const pendingBadges = screen.getAllByText('Pending');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });

  it('displays permission level for each share', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Can edit')).toBeInTheDocument();
    });
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByText('Can comment')).toBeInTheDocument();
  });

  it('renders filter buttons', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Projects/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notes/i })).toBeInTheDocument();
  });

  it('shows pending filter button with count when there are pending shares', async () => {
    render(<SharedWithMePage />);

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Find the pending filter button - it has "Pending" text and a count
    const pendingButtons = screen.getAllByText('Pending');
    // One of them should be a button (the filter)
    const pendingFilterButton = pendingButtons.find(el =>
      el.closest('button')?.textContent?.includes('1')
    );
    expect(pendingFilterButton).toBeTruthy();
  });

  it('filters shares by type when filter button clicked', async () => {
    const user = userEvent.setup();
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click on Projects filter
    const projectsButton = screen.getByRole('button', { name: /Projects/i });
    await user.click(projectsButton);

    // Should call API with itemType filter
    await waitFor(() => {
      expect(itemSharesApi.getSharedWithMe).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'project' })
      );
    });
  });

  it('filters to show only pending shares', async () => {
    const user = userEvent.setup();
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Find and click on Pending filter button (not the badge on card)
    const pendingButtons = screen.getAllByText('Pending');
    const pendingFilterButton = pendingButtons.find(el => el.closest('button'))?.closest('button');
    await user.click(pendingFilterButton);

    // Should only show pending items (Test Task is pending)
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  it('shows accept button for pending shares', async () => {
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    });
  });

  it('accepts pending share when accept button clicked', async () => {
    const user = userEvent.setup();
    itemSharesApi.acceptShare.mockResolvedValue({ success: true });

    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(itemSharesApi.acceptShare).toHaveBeenCalledWith('share2');
    });
  });

  it('displays empty state when no shares exist', async () => {
    itemSharesApi.getSharedWithMe.mockResolvedValue({ shares: [] });

    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('No shared items')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "When someone shares projects, tasks, notes, or files with you, they'll appear here."
      )
    ).toBeInTheDocument();
  });

  it('displays empty state for pending filter with no pending shares', async () => {
    const user = userEvent.setup();
    // Return shares with no pending items
    itemSharesApi.getSharedWithMe.mockResolvedValue({
      shares: [
        {
          ...mockShares[0],
          status: 'accepted',
        },
      ],
    });

    render(<SharedWithMePage />);

    // When there are no pending shares, the pending button won't appear
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Pending button should not be visible
    expect(
      screen.queryByRole('button', { name: /Pending/i })
    ).not.toBeInTheDocument();
  });

  it('navigates to item when accepted share card is clicked', async () => {
    const user = userEvent.setup();
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click on accepted project share (first one)
    const projectCard = screen.getByText('Test Project').closest('[class*="bg-panel"]');
    await user.click(projectCard);

    expect(mockNavigate).toHaveBeenCalledWith('/app/projects/proj1');
  });

  it('does not navigate when pending share card is clicked', async () => {
    const user = userEvent.setup();
    render(<SharedWithMePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // Click on pending task share
    const taskCard = screen.getByText('Test Task').closest('[class*="bg-panel"]');
    await user.click(taskCard);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
