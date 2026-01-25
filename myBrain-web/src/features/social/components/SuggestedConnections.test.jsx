import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import SuggestedConnections from './SuggestedConnections';

// Mock the hooks
vi.mock('../hooks/useConnections', () => ({
  useSuggestions: vi.fn(),
  useSendConnectionRequest: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import { useSuggestions, useSendConnectionRequest } from '../hooks/useConnections';

const mockSuggestions = {
  suggestions: [
    {
      _id: 'user1',
      profile: {
        displayName: 'John Doe',
        bio: 'Software developer',
      },
      stats: {
        connectionCount: 42,
      },
    },
    {
      _id: 'user2',
      profile: {
        displayName: 'Jane Smith',
        bio: 'Designer',
      },
      stats: {
        connectionCount: 28,
      },
    },
    {
      _id: 'user3',
      profile: {
        firstName: 'Bob',
        lastName: 'Wilson',
      },
      stats: {
        connectionCount: 1,
      },
    },
  ],
};

describe('SuggestedConnections', () => {
  const mockSendRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSuggestions).mockReturnValue({
      data: mockSuggestions,
      isLoading: false,
      error: null,
    });

    vi.mocked(useSendConnectionRequest).mockReturnValue({
      mutate: mockSendRequest,
      isPending: false,
    });
  });

  it('renders loading state while fetching suggestions', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<SuggestedConnections />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders nothing when there is an error', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    const { container } = render(<SuggestedConnections />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when there are no suggestions', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: { suggestions: [] },
      isLoading: false,
      error: null,
    });

    const { container } = render(<SuggestedConnections />);

    expect(container.firstChild).toBeNull();
  });

  it('renders section title', () => {
    render(<SuggestedConnections />);

    expect(screen.getByText('People you may know')).toBeInTheDocument();
  });

  it('displays suggested users', () => {
    render(<SuggestedConnections />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('displays user bio when available', () => {
    render(<SuggestedConnections />);

    expect(screen.getByText('Software developer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('displays connection count with correct pluralization', () => {
    render(<SuggestedConnections />);

    expect(screen.getByText('42 connections')).toBeInTheDocument();
    expect(screen.getByText('28 connections')).toBeInTheDocument();
    expect(screen.getByText('1 connection')).toBeInTheDocument();
  });

  it('links user name to their profile', () => {
    render(<SuggestedConnections />);

    const links = screen.getAllByRole('link');
    // Each user has 2 links (avatar and name)
    const profileLinks = links.filter((link) =>
      link.getAttribute('href')?.includes('/app/social/profile/')
    );
    expect(profileLinks.length).toBeGreaterThan(0);
    expect(profileLinks[0]).toHaveAttribute('href', '/app/social/profile/user1');
  });

  it('shows connect button for each user', () => {
    render(<SuggestedConnections />);

    const connectButtons = screen.getAllByTitle('Connect');
    expect(connectButtons).toHaveLength(3);
  });

  it('sends connection request when connect button clicked', async () => {
    const user = userEvent.setup();
    render(<SuggestedConnections />);

    const connectButtons = screen.getAllByTitle('Connect');
    await user.click(connectButtons[0]);

    expect(mockSendRequest).toHaveBeenCalledWith({
      userId: 'user1',
      source: 'suggested',
    });
  });

  it('disables connect button when request is pending', () => {
    vi.mocked(useSendConnectionRequest).mockReturnValue({
      mutate: mockSendRequest,
      isPending: true,
    });

    render(<SuggestedConnections />);

    const connectButtons = screen.getAllByTitle('Connect');
    connectButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('requests default limit of 5 suggestions', () => {
    render(<SuggestedConnections />);

    expect(useSuggestions).toHaveBeenCalledWith(5);
  });

  it('requests custom limit when provided', () => {
    render(<SuggestedConnections limit={10} />);

    expect(useSuggestions).toHaveBeenCalledWith(10);
  });

  it('applies custom className', () => {
    const { container } = render(<SuggestedConnections className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows "Unknown User" for users without profile info', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: {
        suggestions: [{ _id: 'user4' }],
      },
      isLoading: false,
      error: null,
    });

    render(<SuggestedConnections />);

    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('shows first name only when display name not set', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: {
        suggestions: [
          {
            _id: 'user5',
            profile: { firstName: 'Alice' },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<SuggestedConnections />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('does not show connection count when zero or undefined', () => {
    vi.mocked(useSuggestions).mockReturnValue({
      data: {
        suggestions: [
          {
            _id: 'user6',
            profile: { displayName: 'Test User' },
            stats: { connectionCount: 0 },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<SuggestedConnections />);

    expect(screen.queryByText(/0 connection/)).not.toBeInTheDocument();
  });

  it('renders user avatar with link', () => {
    render(<SuggestedConnections />);

    // Each user should have an avatar link
    const avatarLinks = screen.getAllByRole('link').filter((link) =>
      link.getAttribute('href')?.includes('/app/social/profile/')
    );
    // Should have at least one link per user (avatar or name)
    expect(avatarLinks.length).toBeGreaterThanOrEqual(3);
  });
});
