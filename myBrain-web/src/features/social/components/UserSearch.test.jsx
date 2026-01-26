import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserSearch from './UserSearch';

// Mock the hooks
vi.mock('../hooks/useConnections', () => ({
  useUserSearch: vi.fn(),
  useSendConnectionRequest: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock useDebounce
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

import { useUserSearch, useSendConnectionRequest } from '../hooks/useConnections';

const mockSearchResults = {
  users: [
    {
      _id: 'user1',
      profile: { displayName: 'John Doe', bio: 'Developer' },
      connectionStatus: null,
    },
    {
      _id: 'user2',
      profile: { displayName: 'Jane Smith', bio: 'Designer' },
      connectionStatus: 'accepted',
    },
    {
      _id: 'user3',
      profile: { displayName: 'Bob Wilson' },
      connectionStatus: 'pending',
      isRequester: true,
    },
    {
      _id: 'user4',
      profile: { displayName: 'Alice Brown' },
      connectionStatus: 'pending',
      isRequester: false,
    },
  ],
  hasMore: true,
  total: 10,
};

describe('UserSearch', () => {
  const mockSendRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUserSearch).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
    });

    vi.mocked(useSendConnectionRequest).mockReturnValue({
      mutate: mockSendRequest,
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<UserSearch />);

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('shows search icon', () => {
    const { container } = render(<UserSearch />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not show dropdown initially', () => {
    render(<UserSearch />);

    expect(screen.queryByText('No users found')).not.toBeInTheDocument();
  });

  it('shows dropdown on input focus with query >= 2 chars', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: { users: [], hasMore: false, total: 0 },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'jo');

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup();
    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'test');

    // Should show X button to clear
    expect(document.querySelector('button svg')).toBeInTheDocument();
  });

  it('clears input when clear button clicked', async () => {
    const user = userEvent.setup();
    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'test');

    // Click clear button
    const clearButton = document.querySelector('button');
    await user.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('shows loading state while searching', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: true,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: mockSearchResults,
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
  });

  it('displays user bio when available', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: mockSearchResults,
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('shows connect button for users without connection', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByTitle('Connect')).toBeInTheDocument();
    });
  });

  it('shows "Connected" badge for connected users', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user2',
            profile: { displayName: 'Jane Smith' },
            connectionStatus: 'accepted',
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'jane');

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('shows "Pending" status for outgoing pending requests', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user3',
            profile: { displayName: 'Bob Wilson' },
            connectionStatus: 'pending',
            isRequester: true,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'bob');

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows "View request" link for incoming pending requests', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user4',
            profile: { displayName: 'Alice Brown' },
            connectionStatus: 'pending',
            isRequester: false,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'alice');

    await waitFor(() => {
      expect(screen.getByText('View request')).toBeInTheDocument();
    });
  });

  it('sends connection request when connect button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByTitle('Connect')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Connect'));

    expect(mockSendRequest).toHaveBeenCalledWith({
      userId: 'user1',
      source: 'search',
    });
  });

  it('disables connect button when request is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(useSendConnectionRequest).mockReturnValue({
      mutate: mockSendRequest,
      isPending: true,
    });
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByTitle('Connect')).toBeDisabled();
    });
  });

  it('shows "more results" message when hasMore is true', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: mockSearchResults,
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByText('6 more results...')).toBeInTheDocument();
    });
  });

  it('links to user profile', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      const profileLink = screen.getByRole('link');
      expect(profileLink).toHaveAttribute('href', '/app/social/profile/user1');
    });
  });

  it('closes dropdown when clicking on user profile link', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('link'));

    // Dropdown should close (result should no longer be visible)
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user1',
            profile: { displayName: 'John Doe' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <UserSearch />
      </div>
    );

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<UserSearch className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows "Unknown User" for users without profile', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user5',
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });
  });

  it('handles user with only first and last name', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserSearch).mockReturnValue({
      data: {
        users: [
          {
            _id: 'user6',
            profile: { firstName: 'Test', lastName: 'User' },
            connectionStatus: null,
          },
        ],
        hasMore: false,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UserSearch />);

    const input = screen.getByPlaceholderText('Search users...');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
