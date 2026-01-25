import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConnections,
  usePendingRequests,
  useSentRequests,
  useConnectionCounts,
  useSuggestions,
  useBlockedUsers,
  useUserSearch,
  useUserProfile,
  useSendConnectionRequest,
  useAcceptConnection,
  useDeclineConnection,
  useRemoveConnection,
  useBlockUser,
  useUnblockUser,
  useUpdateSocialSettings,
  useUpdatePresence,
  connectionKeys,
  userKeys,
} from './useConnections';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  connectionsApi: {
    getConnections: vi.fn(),
    getPending: vi.fn(),
    getSent: vi.fn(),
    getCounts: vi.fn(),
    getSuggestions: vi.fn(),
    getBlocked: vi.fn(),
    sendRequest: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
    remove: vi.fn(),
    block: vi.fn(),
    unblock: vi.fn(),
  },
  usersApi: {
    search: vi.fn(),
    getProfile: vi.fn(),
    updateSocialSettings: vi.fn(),
    updatePresence: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Import the mocked APIs
import { connectionsApi, usersApi } from '../../../lib/api';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useConnections hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test connectionKeys and userKeys factory functions
  describe('query keys', () => {
    it('generates correct connection query keys', () => {
      expect(connectionKeys.all).toEqual(['connections']);
      expect(connectionKeys.list()).toEqual(['connections', 'list']);
      expect(connectionKeys.pending()).toEqual(['connections', 'pending']);
      expect(connectionKeys.sent()).toEqual(['connections', 'sent']);
      expect(connectionKeys.counts()).toEqual(['connections', 'counts']);
      expect(connectionKeys.suggestions()).toEqual(['connections', 'suggestions']);
      expect(connectionKeys.blocked()).toEqual(['connections', 'blocked']);
    });

    it('generates correct user query keys', () => {
      expect(userKeys.all).toEqual(['users']);
      expect(userKeys.search('john')).toEqual(['users', 'search', 'john']);
      expect(userKeys.profile('123')).toEqual(['users', 'profile', '123']);
      expect(userKeys.connections('123')).toEqual(['users', 'connections', '123']);
    });
  });

  // Test useConnections hook
  describe('useConnections', () => {
    it('fetches connections successfully', async () => {
      const mockConnections = [
        { _id: 'conn1', user: { _id: 'user1', displayName: 'John' } },
        { _id: 'conn2', user: { _id: 'user2', displayName: 'Jane' } },
      ];
      connectionsApi.getConnections.mockResolvedValueOnce({
        data: mockConnections,
      });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockConnections);
      expect(connectionsApi.getConnections).toHaveBeenCalledWith({
        limit: 50,
        skip: 0,
      });
    });

    it('handles error when fetching connections fails', async () => {
      connectionsApi.getConnections.mockRejectedValueOnce(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('respects pagination options', async () => {
      connectionsApi.getConnections.mockResolvedValueOnce({ data: [] });

      renderHook(() => useConnections({ limit: 20, skip: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(connectionsApi.getConnections).toHaveBeenCalledWith({
          limit: 20,
          skip: 10,
        })
      );
    });
  });

  // Test usePendingRequests hook
  describe('usePendingRequests', () => {
    it('fetches pending requests successfully', async () => {
      const mockPending = [
        { _id: 'req1', requester: { _id: 'user1', displayName: 'Alice' } },
      ];
      connectionsApi.getPending.mockResolvedValueOnce({ data: mockPending });

      const { result } = renderHook(() => usePendingRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockPending);
      expect(connectionsApi.getPending).toHaveBeenCalledWith({
        limit: 50,
        skip: 0,
      });
    });

    it('handles error when fetching pending requests fails', async () => {
      connectionsApi.getPending.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => usePendingRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSentRequests hook
  describe('useSentRequests', () => {
    it('fetches sent requests successfully', async () => {
      const mockSent = [
        { _id: 'req1', recipient: { _id: 'user2', displayName: 'Bob' } },
      ];
      connectionsApi.getSent.mockResolvedValueOnce({ data: mockSent });

      const { result } = renderHook(() => useSentRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockSent);
    });

    it('handles error when fetching sent requests fails', async () => {
      connectionsApi.getSent.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useSentRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useConnectionCounts hook
  describe('useConnectionCounts', () => {
    it('fetches connection counts successfully', async () => {
      const mockCounts = { connections: 10, pending: 3, sent: 2 };
      connectionsApi.getCounts.mockResolvedValueOnce({ data: mockCounts });

      const { result } = renderHook(() => useConnectionCounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockCounts);
    });

    it('handles error when fetching counts fails', async () => {
      connectionsApi.getCounts.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useConnectionCounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSuggestions hook
  describe('useSuggestions', () => {
    it('fetches suggestions with default limit', async () => {
      const mockSuggestions = [
        { _id: 'user1', displayName: 'Suggested User' },
      ];
      connectionsApi.getSuggestions.mockResolvedValueOnce({
        data: mockSuggestions,
      });

      const { result } = renderHook(() => useSuggestions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockSuggestions);
      expect(connectionsApi.getSuggestions).toHaveBeenCalledWith(10);
    });

    it('fetches suggestions with custom limit', async () => {
      connectionsApi.getSuggestions.mockResolvedValueOnce({ data: [] });

      renderHook(() => useSuggestions(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(connectionsApi.getSuggestions).toHaveBeenCalledWith(5)
      );
    });

    it('handles error when fetching suggestions fails', async () => {
      connectionsApi.getSuggestions.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useSuggestions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBlockedUsers hook
  describe('useBlockedUsers', () => {
    it('fetches blocked users successfully', async () => {
      const mockBlocked = [{ _id: 'user1', displayName: 'Blocked User' }];
      connectionsApi.getBlocked.mockResolvedValueOnce({ data: mockBlocked });

      const { result } = renderHook(() => useBlockedUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockBlocked);
    });

    it('handles error when fetching blocked users fails', async () => {
      connectionsApi.getBlocked.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useBlockedUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUserSearch hook
  describe('useUserSearch', () => {
    it('searches users when query has at least 2 characters', async () => {
      const mockResults = [{ _id: 'user1', displayName: 'John Doe' }];
      usersApi.search.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useUserSearch('jo'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockResults);
      expect(usersApi.search).toHaveBeenCalledWith('jo', { limit: 20, skip: 0 });
    });

    it('does not search when query is too short', async () => {
      const { result } = renderHook(() => useUserSearch('j'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(usersApi.search).not.toHaveBeenCalled();
    });

    it('does not search when query is empty', async () => {
      const { result } = renderHook(() => useUserSearch(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(usersApi.search).not.toHaveBeenCalled();
    });

    it('respects enabled option', async () => {
      const { result } = renderHook(
        () => useUserSearch('john', { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(usersApi.search).not.toHaveBeenCalled();
    });

    it('handles error when search fails', async () => {
      usersApi.search.mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() => useUserSearch('john'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUserProfile hook
  describe('useUserProfile', () => {
    it('fetches user profile by ID', async () => {
      const mockProfile = { _id: 'user1', displayName: 'John', bio: 'Hello' };
      usersApi.getProfile.mockResolvedValueOnce({ data: mockProfile });

      const { result } = renderHook(() => useUserProfile('user1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockProfile);
      expect(usersApi.getProfile).toHaveBeenCalledWith('user1');
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useUserProfile(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(usersApi.getProfile).not.toHaveBeenCalled();
    });

    it('handles error when fetching profile fails', async () => {
      usersApi.getProfile.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useUserProfile('user1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSendConnectionRequest mutation
  describe('useSendConnectionRequest', () => {
    it('sends connection request successfully', async () => {
      const mockResponse = { _id: 'conn1', status: 'pending' };
      connectionsApi.sendRequest.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useSendConnectionRequest(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user2',
          message: 'Hi!',
          source: 'search',
        });
      });

      expect(connectionsApi.sendRequest).toHaveBeenCalledWith(
        'user2',
        'Hi!',
        'search'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when sending request fails', async () => {
      connectionsApi.sendRequest.mockRejectedValueOnce(
        new Error('Request failed')
      );

      const { result } = renderHook(() => useSendConnectionRequest(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ userId: 'user2' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useAcceptConnection mutation
  describe('useAcceptConnection', () => {
    it('accepts connection successfully', async () => {
      connectionsApi.accept.mockResolvedValueOnce({
        data: { status: 'accepted' },
      });

      const { result } = renderHook(() => useAcceptConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conn1');
      });

      expect(connectionsApi.accept).toHaveBeenCalledWith('conn1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when accepting fails', async () => {
      connectionsApi.accept.mockRejectedValueOnce(new Error('Accept failed'));

      const { result } = renderHook(() => useAcceptConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('conn1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeclineConnection mutation
  describe('useDeclineConnection', () => {
    it('declines connection successfully', async () => {
      connectionsApi.decline.mockResolvedValueOnce({
        data: { status: 'declined' },
      });

      const { result } = renderHook(() => useDeclineConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conn1');
      });

      expect(connectionsApi.decline).toHaveBeenCalledWith('conn1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when declining fails', async () => {
      connectionsApi.decline.mockRejectedValueOnce(new Error('Decline failed'));

      const { result } = renderHook(() => useDeclineConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('conn1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRemoveConnection mutation
  describe('useRemoveConnection', () => {
    it('removes connection successfully', async () => {
      connectionsApi.remove.mockResolvedValueOnce({
        data: { message: 'Connection removed' },
      });

      const { result } = renderHook(() => useRemoveConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conn1');
      });

      expect(connectionsApi.remove).toHaveBeenCalledWith('conn1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when removing fails', async () => {
      connectionsApi.remove.mockRejectedValueOnce(new Error('Remove failed'));

      const { result } = renderHook(() => useRemoveConnection(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('conn1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBlockUser mutation
  describe('useBlockUser', () => {
    it('blocks user successfully', async () => {
      connectionsApi.block.mockResolvedValueOnce({ data: { blocked: true } });

      const { result } = renderHook(() => useBlockUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user2',
          reason: 'spam',
          notes: 'Sending spam messages',
        });
      });

      expect(connectionsApi.block).toHaveBeenCalledWith(
        'user2',
        'spam',
        'Sending spam messages'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when blocking fails', async () => {
      connectionsApi.block.mockRejectedValueOnce(new Error('Block failed'));

      const { result } = renderHook(() => useBlockUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ userId: 'user2' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnblockUser mutation
  describe('useUnblockUser', () => {
    it('unblocks user successfully', async () => {
      connectionsApi.unblock.mockResolvedValueOnce({ data: { unblocked: true } });

      const { result } = renderHook(() => useUnblockUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('user2');
      });

      expect(connectionsApi.unblock).toHaveBeenCalledWith('user2');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when unblocking fails', async () => {
      connectionsApi.unblock.mockRejectedValueOnce(new Error('Unblock failed'));

      const { result } = renderHook(() => useUnblockUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('user2');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateSocialSettings mutation
  describe('useUpdateSocialSettings', () => {
    it('updates social settings successfully', async () => {
      usersApi.updateSocialSettings.mockResolvedValueOnce({
        data: { visibility: 'connections' },
      });

      const { result } = renderHook(() => useUpdateSocialSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ visibility: 'connections' });
      });

      expect(usersApi.updateSocialSettings).toHaveBeenCalledWith({
        visibility: 'connections',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating settings fails', async () => {
      usersApi.updateSocialSettings.mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useUpdateSocialSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ visibility: 'public' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdatePresence mutation
  describe('useUpdatePresence', () => {
    it('updates presence successfully', async () => {
      usersApi.updatePresence.mockResolvedValueOnce({
        data: { status: 'online', statusMessage: 'Working' },
      });

      const { result } = renderHook(() => useUpdatePresence(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          status: 'online',
          statusMessage: 'Working',
        });
      });

      expect(usersApi.updatePresence).toHaveBeenCalledWith('online', 'Working');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating presence fails', async () => {
      usersApi.updatePresence.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdatePresence(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ status: 'away' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
