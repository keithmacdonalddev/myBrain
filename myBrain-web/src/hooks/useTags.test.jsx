import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTags,
  useAllTags,
  usePopularTags,
  useSearchTags,
  useCreateTag,
  useTrackTagUsage,
  useRenameTag,
  useMergeTags,
  useUpdateTag,
  useDeleteTag,
  tagKeys,
} from './useTags';

// Mock the API module
vi.mock('../lib/api', () => ({
  tagsApi: {
    getTags: vi.fn(),
    getAllTags: vi.fn(),
    getPopularTags: vi.fn(),
    searchTags: vi.fn(),
    createTag: vi.fn(),
    trackUsage: vi.fn(),
    renameTag: vi.fn(),
    mergeTags: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

// Import the mocked API
import { tagsApi } from '../lib/api';

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

describe('useTags hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test tagKeys factory functions
  describe('tagKeys', () => {
    it('generates correct query keys', () => {
      expect(tagKeys.all).toEqual(['tags']);
      expect(tagKeys.allTags()).toEqual(['tags', 'all']);
      expect(tagKeys.popular()).toEqual(['tags', 'popular']);
      expect(tagKeys.search('test')).toEqual(['tags', 'search', 'test']);
    });
  });

  // Test useTags hook
  describe('useTags', () => {
    it('fetches tags successfully', async () => {
      const mockTags = [
        { name: 'work', count: 10 },
        { name: 'personal', count: 5 },
      ];
      tagsApi.getTags.mockResolvedValueOnce({ data: mockTags });

      const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
      expect(tagsApi.getTags).toHaveBeenCalledWith({});
    });

    it('handles error when fetching tags fails', async () => {
      const error = new Error('Failed to fetch tags');
      tagsApi.getTags.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch tags');
    });

    it('passes options to API call', async () => {
      tagsApi.getTags.mockResolvedValueOnce({ data: [] });

      renderHook(() => useTags({ limit: 5 }), { wrapper: createWrapper() });

      await waitFor(() => expect(tagsApi.getTags).toHaveBeenCalledWith({ limit: 5 }));
    });
  });

  // Test useAllTags hook
  describe('useAllTags', () => {
    it('fetches all tags including inactive', async () => {
      const mockAllTags = [
        { name: 'active-tag', isActive: true },
        { name: 'inactive-tag', isActive: false },
      ];
      tagsApi.getAllTags.mockResolvedValueOnce({ data: mockAllTags });

      const { result } = renderHook(() => useAllTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockAllTags);
      expect(tagsApi.getAllTags).toHaveBeenCalledWith({});
    });

    it('handles error when fetching all tags fails', async () => {
      tagsApi.getAllTags.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useAllTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test usePopularTags hook
  describe('usePopularTags', () => {
    it('fetches popular tags with default limit', async () => {
      const mockPopular = [{ name: 'popular', count: 100 }];
      tagsApi.getPopularTags.mockResolvedValueOnce({ data: mockPopular });

      const { result } = renderHook(() => usePopularTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockPopular);
      expect(tagsApi.getPopularTags).toHaveBeenCalledWith(10);
    });

    it('fetches popular tags with custom limit', async () => {
      tagsApi.getPopularTags.mockResolvedValueOnce({ data: [] });

      renderHook(() => usePopularTags(5), { wrapper: createWrapper() });

      await waitFor(() => expect(tagsApi.getPopularTags).toHaveBeenCalledWith(5));
    });
  });

  // Test useSearchTags hook
  describe('useSearchTags', () => {
    it('searches tags when query is provided', async () => {
      const mockResults = { tags: [{ name: 'test-tag' }] };
      tagsApi.searchTags.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearchTags('test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockResults);
      expect(tagsApi.searchTags).toHaveBeenCalledWith('test');
    });

    it('does not fetch when query is empty', async () => {
      const { result } = renderHook(() => useSearchTags(''), {
        wrapper: createWrapper(),
      });

      // Should not be loading because query is disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(tagsApi.searchTags).not.toHaveBeenCalled();
    });

    it('does not fetch when query is null', async () => {
      const { result } = renderHook(() => useSearchTags(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(tagsApi.searchTags).not.toHaveBeenCalled();
    });

    it('fetches when query has at least 1 character', async () => {
      tagsApi.searchTags.mockResolvedValueOnce({ data: { tags: [] } });

      renderHook(() => useSearchTags('a'), { wrapper: createWrapper() });

      await waitFor(() => expect(tagsApi.searchTags).toHaveBeenCalledWith('a'));
    });
  });

  // Test useCreateTag mutation
  describe('useCreateTag', () => {
    it('creates a tag successfully', async () => {
      const newTag = { name: 'new-tag', color: '#ff0000' };
      tagsApi.createTag.mockResolvedValueOnce({ data: newTag });

      const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newTag);
      });

      expect(tagsApi.createTag).toHaveBeenCalledWith(newTag);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating tag fails', async () => {
      tagsApi.createTag.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateTag(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'bad-tag' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTrackTagUsage mutation
  describe('useTrackTagUsage', () => {
    it('tracks tag usage successfully', async () => {
      tagsApi.trackUsage.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useTrackTagUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(['tag1', 'tag2']);
      });

      expect(tagsApi.trackUsage).toHaveBeenCalledWith(['tag1', 'tag2']);
    });
  });

  // Test useRenameTag mutation
  describe('useRenameTag', () => {
    it('renames a tag successfully', async () => {
      tagsApi.renameTag.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useRenameTag(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ oldName: 'old', newName: 'new' });
      });

      expect(tagsApi.renameTag).toHaveBeenCalledWith('old', 'new');
    });
  });

  // Test useMergeTags mutation
  describe('useMergeTags', () => {
    it('merges tags successfully', async () => {
      tagsApi.mergeTags.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useMergeTags(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          sourceTags: ['tag1', 'tag2'],
          targetTag: 'merged-tag',
        });
      });

      expect(tagsApi.mergeTags).toHaveBeenCalledWith(['tag1', 'tag2'], 'merged-tag');
    });
  });

  // Test useUpdateTag mutation
  describe('useUpdateTag', () => {
    it('updates a tag successfully', async () => {
      tagsApi.updateTag.mockResolvedValueOnce({ data: { name: 'tag', color: '#00ff00' } });

      const { result } = renderHook(() => useUpdateTag(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: 'tag', data: { color: '#00ff00' } });
      });

      expect(tagsApi.updateTag).toHaveBeenCalledWith('tag', { color: '#00ff00' });
    });
  });

  // Test useDeleteTag mutation
  describe('useDeleteTag', () => {
    it('deletes a tag successfully', async () => {
      tagsApi.deleteTag.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('tag-to-delete');
      });

      expect(tagsApi.deleteTag).toHaveBeenCalledWith('tag-to-delete');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting tag fails', async () => {
      tagsApi.deleteTag.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteTag(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('bad-tag');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
