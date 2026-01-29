import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserProfilePage from './UserProfilePage';

// Mock the hooks
vi.mock('../hooks/useConnections', () => ({
  useUserProfile: vi.fn(),
  useSendConnectionRequest: vi.fn(() => ({
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

// Mock ReportModal
vi.mock('../components/ReportModal', () => ({
  default: ({ isOpen, onClose, targetType, targetId, targetName }) =>
    isOpen ? (
      <div data-testid="report-modal">
        Report Modal - {targetType} - {targetId} - {targetName}
        <button onClick={onClose}>Close Report</button>
      </div>
    ) : null,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: 'user123' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock utils to control getPrivacySafeLocation output
vi.mock('../../../lib/utils', async () => {
  const actual = await vi.importActual('../../../lib/utils');
  return {
    ...actual,
    getPrivacySafeLocation: (location) => location || '',
  };
});

import {
  useUserProfile,
  useSendConnectionRequest,
  useRemoveConnection,
  useBlockUser,
} from '../hooks/useConnections';

const mockProfile = {
  profile: {
    _id: 'user123',
    profile: {
      displayName: 'John Doe',
      bio: 'Software developer',
      location: 'San Francisco, CA',
      website: 'https://johndoe.dev',
    },
    joinedAt: '2023-06-15T00:00:00Z',
    presence: {
      statusMessage: 'Working on something cool',
    },
    stats: {
      connectionCount: 42,
      projectCount: 10,
      sharedItemCount: 5,
    },
    isConnected: false,
    isPrivate: false,
  },
  connection: null,
  canMessage: false,
  canConnect: true,
};

const mockConnectedProfile = {
  ...mockProfile,
  profile: {
    ...mockProfile.profile,
    isConnected: true,
  },
  connection: {
    status: 'accepted',
    connectionId: 'conn123',
  },
  canMessage: true,
  canConnect: false,
};

describe('UserProfilePage', () => {
  const mockSendRequest = vi.fn();
  const mockRemoveConnection = vi.fn();
  const mockBlockUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSendConnectionRequest).mockReturnValue({
      mutate: mockSendRequest,
      isPending: false,
    });

    vi.mocked(useRemoveConnection).mockReturnValue({
      mutate: mockRemoveConnection,
      isPending: false,
    });

    vi.mocked(useBlockUser).mockReturnValue({
      mutate: mockBlockUser,
      isPending: false,
    });
  });

  it('displays loading state while fetching profile', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<UserProfilePage />);

    // Should show loader
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays error state when profile not found', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Not found'),
    });

    render(<UserProfilePage />);

    expect(screen.getByText('User not found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This user may not exist or you may not have permission to view their profile.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Back to connections')).toBeInTheDocument();
  });

  it('displays profile information when loaded', async () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Working on something cool')).toBeInTheDocument();
  });

  it('displays bio section when user has bio', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Software developer')).toBeInTheDocument();
  });

  it('displays user location when available', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('displays user website when available', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText('johndoe.dev')).toBeInTheDocument();
  });

  it('displays join date', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText(/Joined June 2023/)).toBeInTheDocument();
  });

  it('displays user stats', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('shows Connect button when user can connect', async () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('sends connection request when Connect button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(mockSendRequest).toHaveBeenCalledWith({
      userId: 'user123',
      source: 'profile',
    });
  });

  it('shows Message button when connected and can message', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('shows pending status when connection request is pending', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        ...mockProfile,
        connection: { status: 'pending', isRequester: true },
        canConnect: false,
      },
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByText('Request Pending')).toBeInTheDocument();
  });

  it('shows "Wants to Connect" when other user sent request', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        ...mockProfile,
        connection: { status: 'pending', isRequester: false },
        canConnect: false,
      },
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByText('Wants to Connect')).toBeInTheDocument();
  });

  it('opens more options menu when menu button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    // Click on the more options button - find it by looking for the button containing MoreHorizontal
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
    await user.click(moreButton);

    expect(screen.getByText('Remove connection')).toBeInTheDocument();
    expect(screen.getByText('Report user')).toBeInTheDocument();
    expect(screen.getByText('Block user')).toBeInTheDocument();
  });

  it('removes connection when "Remove connection" clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    // Open menu
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
    await user.click(moreButton);

    await user.click(screen.getByText('Remove connection'));

    expect(mockRemoveConnection).toHaveBeenCalledWith('conn123');
  });

  it('opens block confirmation when "Block user" clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    // Open menu
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
    await user.click(moreButton);

    await user.click(screen.getByText('Block user'));

    expect(screen.getByText(/Block John Doe\?/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "They won't be able to see your profile, message you, or connect with you."
      )
    ).toBeInTheDocument();
  });

  it('blocks user when confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    // Open menu
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
    await user.click(moreButton);

    await user.click(screen.getByText('Block user'));
    await user.click(screen.getByRole('button', { name: 'Block' }));

    expect(mockBlockUser).toHaveBeenCalledWith({
      userId: 'user123',
      reason: 'other',
    });
  });

  it('opens report modal when "Report user" clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserProfile).mockReturnValue({
      data: mockConnectedProfile,
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    // Open menu
    const buttons = screen.getAllByRole('button');
    const moreButton = buttons.find(btn => btn.querySelector('svg.lucide-more-horizontal'));
    await user.click(moreButton);

    await user.click(screen.getByText('Report user'));

    expect(screen.getByTestId('report-modal')).toBeInTheDocument();
    expect(screen.getByTestId('report-modal')).toHaveTextContent('user');
    expect(screen.getByTestId('report-modal')).toHaveTextContent('user123');
    expect(screen.getByTestId('report-modal')).toHaveTextContent('John Doe');
  });

  it('displays private profile message for private users', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        ...mockProfile,
        profile: {
          ...mockProfile.profile,
          isPrivate: true,
        },
        canConnect: true,
      },
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByText('This user has a private profile.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Connection Request' })
    ).toBeInTheDocument();
  });

  it('shows connected badge when user is connected', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        ...mockConnectedProfile,
        profile: {
          ...mockConnectedProfile.profile,
          isConnected: true,
        },
      },
      isLoading: false,
      error: null,
    });

    render(<UserProfilePage />, {
      preloadedState: {
        auth: { user: { _id: 'currentUser' } },
      },
    });

    expect(screen.getByText(/You are connected with John Doe/)).toBeInTheDocument();
  });
});
