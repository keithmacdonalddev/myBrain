import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NewConversationModal from './NewConversationModal';

// Mock the API
vi.mock('../../../lib/api', () => ({
  connectionsApi: {
    getConnections: vi.fn(),
  },
}));

// Mock the hooks
vi.mock('../hooks/useMessages', () => ({
  useCreateConversation: vi.fn(),
}));

// Mock useDebounce to return value immediately
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (value) => value,
  default: (value) => value,
}));

// Import mocks
import { connectionsApi } from '../../../lib/api';
import { useCreateConversation } from '../hooks/useMessages';

describe('NewConversationModal', () => {
  const mockConnections = [
    {
      _id: 'user456',
      email: 'john@example.com',
      profile: { displayName: 'John Doe', bio: 'Software Developer' },
    },
    {
      _id: 'user789',
      email: 'jane@example.com',
      profile: { displayName: 'Jane Smith', bio: 'Designer' },
    },
    {
      _id: 'user101',
      email: 'bob@example.com',
      profile: { displayName: 'Bob Wilson' },
    },
  ];

  const defaultProps = {
    onClose: vi.fn(),
    onConversationCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    connectionsApi.getConnections.mockResolvedValue({ data: { connections: mockConnections } });

    useCreateConversation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ conversation: { _id: 'new-conv' } }),
      isPending: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders the modal title', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New Conversation')).toBeInTheDocument();
      });
    });

    it('renders the search input', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search your connections...')).toBeInTheDocument();
      });
    });

    it('renders the close button', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        // Close button has X icon
        const closeButtons = screen.getAllByRole('button');
        const closeButton = closeButtons.find(btn =>
          btn.querySelector('svg') &&
          btn.classList.contains('hover:bg-bg')
        );
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('renders the start conversation button', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Conversation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading text while fetching connections', async () => {
      // Delay the response
      connectionsApi.getConnections.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { connections: [] } }), 100))
      );

      render(<NewConversationModal {...defaultProps} />);

      expect(screen.getByText('Loading connections...')).toBeInTheDocument();
    });
  });

  describe('Connections Display', () => {
    it('displays connections list', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('displays connection bio when available', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Software Developer')).toBeInTheDocument();
        expect(screen.getByText('Designer')).toBeInTheDocument();
      });
    });

    it('shows email username when displayName is not available', async () => {
      const connectionsWithEmail = [{
        _id: 'user456',
        email: 'noprofile@example.com',
      }];

      connectionsApi.getConnections.mockResolvedValue({ data: { connections: connectionsWithEmail } });

      render(<NewConversationModal {...defaultProps} />);

      // getDisplayName returns email username (before @) when no displayName
      await waitFor(() => {
        expect(screen.getByText('noprofile')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no connections', async () => {
      connectionsApi.getConnections.mockResolvedValue({ data: { connections: [] } });

      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No connections yet/)).toBeInTheDocument();
      });
    });

    it('shows "No connections found" when search has no results', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search your connections...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No connections found')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters connections by name', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search your connections...');
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('filters connections case-insensitively', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search your connections...');
      await user.type(searchInput, 'JOHN');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('filters by email username when displayName not present', async () => {
      const connectionsWithEmail = [{
        _id: 'user456',
        email: 'unique@email.com',
      }];

      connectionsApi.getConnections.mockResolvedValue({ data: { connections: connectionsWithEmail } });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      // getDisplayName returns email username (before @)
      await waitFor(() => {
        expect(screen.getByText('unique')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search your connections...');
      await user.type(searchInput, 'unique');

      expect(screen.getByText('unique')).toBeInTheDocument();
    });

    it('shows all connections when search is cleared', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search your connections...');
      await user.type(searchInput, 'John');
      await user.clear(searchInput);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('User Selection', () => {
    it('selects a user when clicked', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Check for selection indicator (checkmark)
      const selectedButton = screen.getByText('John Doe').closest('button');
      expect(selectedButton).toHaveClass('bg-primary/10');
    });

    it('shows checkmark for selected user', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Should have checkmark
      expect(screen.getByText(/✓/)).toBeInTheDocument();
    });

    it('deselects user when clicked again', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('John Doe'));

      const selectedButton = screen.getByText('John Doe').closest('button');
      expect(selectedButton).not.toHaveClass('bg-primary/10');
    });

    it('enables start conversation button when user is selected', async () => {
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Conversation/i });
      expect(startButton).toBeDisabled();

      await user.click(screen.getByText('John Doe'));

      expect(startButton).not.toBeDisabled();
    });
  });

  describe('Starting Conversation', () => {
    it('calls createConversation when start button is clicked', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ conversation: { _id: 'new-conv' } });
      useCreateConversation.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByRole('button', { name: /Start Conversation/i }));

      // Component calls mutateAsync with { userId: user._id }
      expect(mutateAsync).toHaveBeenCalledWith({ userId: 'user456' });
    });

    it('calls onConversationCreated after successful creation', async () => {
      const onConversationCreated = vi.fn();
      const newConv = { _id: 'new-conv', participants: [] };

      useCreateConversation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ conversation: newConv }),
        isPending: false,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} onConversationCreated={onConversationCreated} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByRole('button', { name: /Start Conversation/i }));

      await waitFor(() => {
        expect(onConversationCreated).toHaveBeenCalledWith(newConv);
      });
    });

    it('shows loading state while creating conversation', async () => {
      useCreateConversation.mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 100))
        ),
        isPending: true,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });

    it('disables start button while pending', async () => {
      useCreateConversation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      const startButton = screen.getByRole('button', { name: /Starting/i });
      expect(startButton).toBeDisabled();
    });

    it('handles creation error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useCreateConversation.mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Creation failed')),
        isPending: false,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByRole('button', { name: /Start Conversation/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create conversation:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Closing', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('New Conversation')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('svg') && btn.classList.contains('hover:bg-bg')
      );
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('New Conversation')).toBeInTheDocument();
      });

      // Click the backdrop
      const backdrop = document.querySelector('.bg-black\\/50');
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('auto-focuses search input', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search your connections...');
        expect(searchInput).toHaveFocus();
      });
    });

    it('has accessible button for starting conversation', async () => {
      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Conversation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles API returning null connections', async () => {
      connectionsApi.getConnections.mockResolvedValue({ data: { connections: null } });

      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No connections yet/)).toBeInTheDocument();
      });
    });

    it('handles API returning undefined', async () => {
      connectionsApi.getConnections.mockResolvedValue(undefined);

      render(<NewConversationModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No connections yet/)).toBeInTheDocument();
      });
    });

    it('handles result directly from mutateAsync (not wrapped)', async () => {
      const onConversationCreated = vi.fn();
      const newConv = { _id: 'direct-conv' };

      useCreateConversation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue(newConv), // Direct result, not { conversation: ... }
        isPending: false,
      });

      const user = userEvent.setup();
      render(<NewConversationModal {...defaultProps} onConversationCreated={onConversationCreated} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByRole('button', { name: /Start Conversation/i }));

      await waitFor(() => {
        expect(onConversationCreated).toHaveBeenCalledWith(newConv);
      });
    });
  });
});
