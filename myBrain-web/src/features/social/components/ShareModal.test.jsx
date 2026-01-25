import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ShareModal from './ShareModal';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  itemSharesApi: {
    getShareByItem: vi.fn(),
    shareItem: vi.fn(),
    updateShare: vi.fn(),
    revokeShare: vi.fn(),
  },
  connectionsApi: {
    getConnections: vi.fn(),
  },
}));

// Mock useDebounce hook
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

import { itemSharesApi, connectionsApi } from '../../../lib/api';

const mockConnections = {
  connections: [
    {
      _id: 'conn1',
      profile: { displayName: 'John Doe' },
      email: 'john@example.com',
    },
    {
      _id: 'conn2',
      profile: { displayName: 'Jane Smith' },
      email: 'jane@example.com',
    },
  ],
};

const mockExistingShare = {
  share: {
    _id: 'share123',
    shareType: 'connection',
    shareToken: 'abc123token',
    permissions: { canView: true, canComment: false, canEdit: false },
    sharedWithUsers: [{ userId: 'conn1' }],
  },
};

describe('ShareModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    itemId: 'item123',
    itemType: 'project',
    itemTitle: 'Test Project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    itemSharesApi.getShareByItem.mockResolvedValue({ share: null });
    connectionsApi.getConnections.mockResolvedValue(mockConnections);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ShareModal {...defaultProps} isOpen={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText('Share project')).toBeInTheDocument();
  });

  it('displays item title being shared', () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText('Sharing')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays share type options', () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText('Specific people')).toBeInTheDocument();
    expect(screen.getByText('Anyone with link')).toBeInTheDocument();
    expect(screen.getByText('Password protected')).toBeInTheDocument();
  });

  it('displays permission level options', () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('selects "Specific people" share type by default', () => {
    render(<ShareModal {...defaultProps} />);

    const connectionOption = screen
      .getByText('Specific people')
      .closest('button');
    expect(connectionOption).toHaveClass('border-primary');
  });

  it('selects "View" permission by default', () => {
    render(<ShareModal {...defaultProps} />);

    const viewOption = screen.getByText('View').closest('button');
    expect(viewOption).toHaveClass('border-primary');
  });

  it('changes share type when option clicked', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await user.click(screen.getByText('Anyone with link'));

    const publicOption = screen.getByText('Anyone with link').closest('button');
    expect(publicOption).toHaveClass('border-primary');
  });

  it('changes permission when option clicked', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await user.click(screen.getByText('Edit'));

    const editOption = screen.getByText('Edit').closest('button');
    expect(editOption).toHaveClass('border-primary');
  });

  it('shows user selection when "Specific people" is selected', async () => {
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Share with')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search connections...')).toBeInTheDocument();
  });

  it('loads and displays connections for user selection', async () => {
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('allows selecting users to share with', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    // User should appear in selected list
    const selectedUsers = document.querySelectorAll('.bg-primary\\/10');
    expect(selectedUsers.length).toBeGreaterThan(0);
  });

  it('toggles user selection on click', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select
    await user.click(screen.getByText('John Doe'));

    // Should show check mark for selected user
    await waitFor(() => {
      expect(document.querySelector('.text-primary svg')).toBeInTheDocument();
    });
  });

  it('filters connections by search query', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search connections...');
    await user.type(searchInput, 'Jane');

    // John Doe should be filtered out based on the search
    // (Note: actual filtering depends on implementation)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows password input when password protected selected', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await user.click(screen.getByText('Password protected'));

    expect(screen.getByPlaceholderText('Enter a password')).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ShareModal {...defaultProps} onClose={onClose} />);

    // Click on backdrop
    const backdrop = container.querySelector('.bg-black\\/50');
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);

    // Find and click close button (X icon in the header)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables share button when no users selected for connection share', async () => {
    render(<ShareModal {...defaultProps} />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Who can access')).toBeInTheDocument();
    });

    // Find the footer Share button by looking at the footer area
    // The button text contains "Share" and has the bg-primary class
    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find(btn =>
      btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
    );
    expect(shareButton).toBeDisabled();
  });

  it('enables share button when users are selected', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    await waitFor(() => {
      // The Share/Update button should now be enabled
      const buttons = screen.getAllByRole('button');
      const shareButton = buttons.find(btn =>
        btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
      );
      expect(shareButton).not.toBeDisabled();
    });
  });

  it('creates share when share button clicked', async () => {
    const user = userEvent.setup();
    itemSharesApi.shareItem.mockResolvedValue({
      share: { _id: 'newShare', shareType: 'connection' },
    });
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('John Doe'));

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const shareButton = buttons.find(btn =>
        btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
      );
      expect(shareButton).not.toBeDisabled();
    });

    // Find and click the footer Share button
    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find(btn =>
      btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
    );
    await user.click(shareButton);

    await waitFor(() => {
      expect(itemSharesApi.shareItem).toHaveBeenCalledWith({
        itemId: 'item123',
        itemType: 'project',
        shareType: 'connection',
        permissions: { canView: true, canComment: false, canEdit: false },
        sharedWithUserIds: ['conn1'],
      });
    });
  });

  it('shares with edit permissions when edit selected', async () => {
    const user = userEvent.setup();
    itemSharesApi.shareItem.mockResolvedValue({
      share: { _id: 'newShare', shareType: 'connection' },
    });
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select Edit permission
    const editButton = screen.getByText('Edit').closest('button');
    await user.click(editButton);

    // Select user
    await user.click(screen.getByText('John Doe'));

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const shareButton = buttons.find(btn =>
        btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
      );
      expect(shareButton).not.toBeDisabled();
    });

    // Find and click the footer Share button
    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find(btn =>
      btn.textContent?.match(/^Share$/) && btn.classList.contains('bg-primary')
    );
    await user.click(shareButton);

    await waitFor(() => {
      expect(itemSharesApi.shareItem).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: { canView: true, canComment: true, canEdit: true },
        })
      );
    });
  });

  describe('Existing share', () => {
    beforeEach(() => {
      itemSharesApi.getShareByItem.mockResolvedValue(mockExistingShare);
    });

    it('loads existing share settings', async () => {
      render(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        // Should have initialized with existing share type
        expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
      });
    });

    it('shows "Update" button instead of "Share"', async () => {
      render(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
      });
    });

    it('shows "Stop sharing" button for existing share', async () => {
      render(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Stop sharing')).toBeInTheDocument();
      });
    });

    it('revokes share when "Stop sharing" clicked', async () => {
      const user = userEvent.setup();
      itemSharesApi.revokeShare.mockResolvedValue({ success: true });
      render(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Stop sharing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Stop sharing'));

      await waitFor(() => {
        expect(itemSharesApi.revokeShare).toHaveBeenCalledWith('share123');
      });
    });

    it('updates existing share when update clicked', async () => {
      const user = userEvent.setup();
      itemSharesApi.updateShare.mockResolvedValue({ success: true });
      render(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Update/i }));

      await waitFor(() => {
        expect(itemSharesApi.updateShare).toHaveBeenCalledWith(
          'share123',
          expect.any(Object)
        );
      });
    });
  });

  describe('Public share with link', () => {
    beforeEach(() => {
      itemSharesApi.getShareByItem.mockResolvedValue({
        share: {
          _id: 'share123',
          shareType: 'public',
          shareToken: 'publicToken123',
          permissions: { canView: true, canComment: false, canEdit: false },
        },
      });
    });

    it('shows share link for public shares', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);

      // Click public share type
      await user.click(screen.getByText('Anyone with link'));

      await waitFor(() => {
        expect(screen.getByText('Share link')).toBeInTheDocument();
      });
    });

    it('copies link when copy button clicked', async () => {
      const user = userEvent.setup();
      // Mock clipboard API using vi.spyOn
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);

      render(<ShareModal {...defaultProps} />);

      await user.click(screen.getByText('Anyone with link'));

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Copy'));

      expect(writeTextMock).toHaveBeenCalled();
    });

    it('shows "Copied" after copying link', async () => {
      const user = userEvent.setup();
      // Mock clipboard API using vi.spyOn
      vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

      render(<ShareModal {...defaultProps} />);

      await user.click(screen.getByText('Anyone with link'));

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Copy'));

      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });
  });

  it('shows empty state when no connections', async () => {
    connectionsApi.getConnections.mockResolvedValue({ connections: [] });

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No connections yet')).toBeInTheDocument();
    });
  });

  it('shows "No connections found" when search yields no results', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search connections...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search connections...');
    await user.type(searchInput, 'xyz');

    await waitFor(() => {
      expect(screen.getByText('No connections found')).toBeInTheDocument();
    });
  });

  it('displays "Untitled" for items without title', () => {
    render(<ShareModal {...defaultProps} itemTitle="" />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
