import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ConnectionCard from './ConnectionCard';

// Mock the hooks
vi.mock('../hooks/useConnections', () => ({
  useAcceptConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeclineConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useRemoveConnection: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useBlockUser: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import {
  useAcceptConnection,
  useDeclineConnection,
  useRemoveConnection,
  useBlockUser,
} from '../hooks/useConnections';

const mockConnection = {
  _id: 'conn123',
  user: {
    _id: 'user456',
    profile: {
      displayName: 'John Doe',
      bio: 'Software developer',
    },
  },
  connectedAt: '2024-01-15T10:00:00Z',
};

const mockPendingConnection = {
  _id: 'conn789',
  user: {
    _id: 'user101',
    profile: {
      displayName: 'Jane Smith',
    },
  },
  message: 'Would love to connect!',
};

const mockSentConnection = {
  _id: 'conn111',
  user: {
    _id: 'user222',
    profile: {
      displayName: 'Bob Wilson',
    },
  },
  sentAt: '2024-01-16T10:00:00Z',
};

describe('ConnectionCard', () => {
  const mockAccept = vi.fn();
  const mockDecline = vi.fn();
  const mockRemove = vi.fn();
  const mockBlock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAcceptConnection).mockReturnValue({
      mutate: mockAccept,
      isPending: false,
    });

    vi.mocked(useDeclineConnection).mockReturnValue({
      mutate: mockDecline,
      isPending: false,
    });

    vi.mocked(useRemoveConnection).mockReturnValue({
      mutate: mockRemove,
      isPending: false,
    });

    vi.mocked(useBlockUser).mockReturnValue({
      mutate: mockBlock,
      isPending: false,
    });
  });

  describe('Connection type', () => {
    it('renders user display name', () => {
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders user bio when available', () => {
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      expect(screen.getByText('Software developer')).toBeInTheDocument();
    });

    it('renders connection date', () => {
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      expect(screen.getByText(/Connected/)).toBeInTheDocument();
    });

    it('links to user profile', () => {
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/app/social/profile/user456');
    });

    it('shows message button when onMessage provided', () => {
      const onMessage = vi.fn();
      render(
        <ConnectionCard
          connection={mockConnection}
          type="connection"
          onMessage={onMessage}
        />
      );

      expect(screen.getByTitle('Message')).toBeInTheDocument();
    });

    it('calls onMessage when message button clicked', async () => {
      const user = userEvent.setup();
      const onMessage = vi.fn();
      render(
        <ConnectionCard
          connection={mockConnection}
          type="connection"
          onMessage={onMessage}
        />
      );

      await user.click(screen.getByTitle('Message'));

      expect(onMessage).toHaveBeenCalledWith(mockConnection.user);
    });

    it('shows more options menu on button click', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      // Click the more options button - find by looking for button with MoreHorizontal icon
      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
      await user.click(moreButton);

      expect(screen.getByText('Remove connection')).toBeInTheDocument();
      expect(screen.getByText('Block user')).toBeInTheDocument();
    });

    it('removes connection when remove option clicked', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
      await user.click(moreButton);
      await user.click(screen.getByText('Remove connection'));

      expect(mockRemove).toHaveBeenCalledWith('conn123');
    });

    it('shows block confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
      await user.click(moreButton);
      await user.click(screen.getByText('Block user'));

      expect(screen.getByText(/Block John Doe\?/)).toBeInTheDocument();
    });

    it('blocks user when confirmed', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
      await user.click(moreButton);
      await user.click(screen.getByText('Block user'));
      await user.click(screen.getByRole('button', { name: 'Block' }));

      expect(mockBlock).toHaveBeenCalledWith({
        userId: 'user456',
        reason: 'other',
      });
    });

    it('cancels block when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockConnection} type="connection" />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
      await user.click(moreButton);
      await user.click(screen.getByText('Block user'));

      // Click cancel in block confirmation
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Block confirmation should be closed
      expect(screen.queryByText(/Block John Doe\?/)).not.toBeInTheDocument();
      expect(mockBlock).not.toHaveBeenCalled();
    });
  });

  describe('Pending type', () => {
    it('renders pending request message', () => {
      render(<ConnectionCard connection={mockPendingConnection} type="pending" />);

      expect(screen.getByText('"Would love to connect!"')).toBeInTheDocument();
    });

    it('shows accept and decline buttons', () => {
      render(<ConnectionCard connection={mockPendingConnection} type="pending" />);

      expect(screen.getByTitle('Accept')).toBeInTheDocument();
      expect(screen.getByTitle('Decline')).toBeInTheDocument();
    });

    it('accepts connection when accept button clicked', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockPendingConnection} type="pending" />);

      await user.click(screen.getByTitle('Accept'));

      expect(mockAccept).toHaveBeenCalledWith('conn789');
    });

    it('declines connection when decline button clicked', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockPendingConnection} type="pending" />);

      await user.click(screen.getByTitle('Decline'));

      expect(mockDecline).toHaveBeenCalledWith('conn789');
    });

    it('disables buttons when mutation is pending', () => {
      vi.mocked(useAcceptConnection).mockReturnValue({
        mutate: mockAccept,
        isPending: true,
      });

      render(<ConnectionCard connection={mockPendingConnection} type="pending" />);

      expect(screen.getByTitle('Accept')).toBeDisabled();
      expect(screen.getByTitle('Decline')).toBeDisabled();
    });
  });

  describe('Sent type', () => {
    it('renders sent date', () => {
      render(<ConnectionCard connection={mockSentConnection} type="sent" />);

      expect(screen.getByText(/Request sent/)).toBeInTheDocument();
    });

    it('shows cancel button', () => {
      render(<ConnectionCard connection={mockSentConnection} type="sent" />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('cancels request when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<ConnectionCard connection={mockSentConnection} type="sent" />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockRemove).toHaveBeenCalledWith('conn111');
    });

    it('disables cancel button when remove is pending', () => {
      vi.mocked(useRemoveConnection).mockReturnValue({
        mutate: mockRemove,
        isPending: true,
      });

      render(<ConnectionCard connection={mockSentConnection} type="sent" />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  describe('Unknown user handling', () => {
    it('shows "Unknown User" for user without profile', () => {
      const connectionWithoutProfile = {
        _id: 'conn999',
        user: { _id: 'user999' },
      };

      render(
        <ConnectionCard connection={connectionWithoutProfile} type="connection" />
      );

      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });

    it('shows first name only when display name not set', () => {
      const connectionWithFirstName = {
        _id: 'conn888',
        user: {
          _id: 'user888',
          profile: { firstName: 'Alice' },
        },
      };

      render(
        <ConnectionCard connection={connectionWithFirstName} type="connection" />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows full name when first and last name set', () => {
      const connectionWithFullName = {
        _id: 'conn777',
        user: {
          _id: 'user777',
          profile: { firstName: 'Alice', lastName: 'Smith' },
        },
      };

      render(
        <ConnectionCard connection={connectionWithFullName} type="connection" />
      );

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ConnectionCard
          connection={mockConnection}
          type="connection"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
