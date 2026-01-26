import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFolders,
  useFolderTree,
  useFolder,
  useFolderBreadcrumb,
  useFolderStats,
  useTrashedFolders,
  useCreateFolder,
  useUpdateFolder,
  useMoveFolder,
  useTrashFolder,
  useRestoreFolder,
  useDeleteFolder,
  folderKeys,
} from './useFolders';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  foldersApi: {
    getFolders: vi.fn(),
    getFolderTree: vi.fn(),
    getFolder: vi.fn(),
    getBreadcrumb: vi.fn(),
    getFolderStats: vi.fn(),
    getTrashedFolders: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    moveFolder: vi.fn(),
    trashFolder: vi.fn(),
    restoreFolder: vi.fn(),
    deleteFolder: vi.fn(),
  },
}));

// Import the mocked API
import { foldersApi } from '../../../lib/api';

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

describe('useFolders hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test folderKeys factory functions
  describe('folderKeys', () => {
    it('generates correct query keys', () => {
      expect(folderKeys.all).toEqual(['folders']);
      expect(folderKeys.lists()).toEqual(['folders', 'list']);
      expect(folderKeys.list({ parentId: '123' })).toEqual(['folders', 'list', { parentId: '123' }]);
      expect(folderKeys.tree()).toEqual(['folders', 'tree']);
      expect(folderKeys.details()).toEqual(['folders', 'detail']);
      expect(folderKeys.detail('abc')).toEqual(['folders', 'detail', 'abc']);
      expect(folderKeys.breadcrumb('xyz')).toEqual(['folders', 'breadcrumb', 'xyz']);
      expect(folderKeys.stats('123')).toEqual(['folders', 'stats', '123']);
      expect(folderKeys.trash()).toEqual(['folders', 'trash']);
    });
  });

  // Test useFolders hook
  describe('useFolders', () => {
    it('fetches folders successfully', async () => {
      const mockFolders = [
        { _id: '1', name: 'Documents' },
        { _id: '2', name: 'Images' },
      ];
      foldersApi.getFolders.mockResolvedValueOnce({ data: { folders: mockFolders } });

      const { result } = renderHook(() => useFolders(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFolders);
      expect(foldersApi.getFolders).toHaveBeenCalledWith({});
    });

    it('handles error when fetching folders fails', async () => {
      const error = new Error('Failed to fetch folders');
      foldersApi.getFolders.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useFolders(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch folders');
    });

    it('passes params to API call', async () => {
      foldersApi.getFolders.mockResolvedValueOnce({ data: { folders: [] } });

      renderHook(() => useFolders({ parentId: '123' }), { wrapper: createWrapper() });

      await waitFor(() => expect(foldersApi.getFolders).toHaveBeenCalledWith({ parentId: '123' }));
    });
  });

  // Test useFolderTree hook
  describe('useFolderTree', () => {
    it('fetches folder tree successfully', async () => {
      const mockTree = [
        { _id: '1', name: 'Root', children: [{ _id: '2', name: 'Child' }] },
      ];
      foldersApi.getFolderTree.mockResolvedValueOnce({ data: { tree: mockTree } });

      const { result } = renderHook(() => useFolderTree(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTree);
      expect(foldersApi.getFolderTree).toHaveBeenCalledWith({});
    });

    it('handles error when fetching folder tree fails', async () => {
      foldersApi.getFolderTree.mockRejectedValueOnce(new Error('Tree error'));

      const { result } = renderHook(() => useFolderTree(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useFolder hook
  describe('useFolder', () => {
    it('fetches a single folder by ID', async () => {
      const mockFolder = { _id: '123', name: 'My Folder', files: [] };
      foldersApi.getFolder.mockResolvedValueOnce({ data: mockFolder });

      const { result } = renderHook(() => useFolder('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFolder);
      expect(foldersApi.getFolder).toHaveBeenCalledWith('123', {});
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFolder(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(foldersApi.getFolder).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is undefined', async () => {
      const { result } = renderHook(() => useFolder(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(foldersApi.getFolder).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is empty string', async () => {
      const { result } = renderHook(() => useFolder(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(foldersApi.getFolder).not.toHaveBeenCalled();
    });

    it('handles error when fetching folder fails', async () => {
      foldersApi.getFolder.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useFolder('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useFolderBreadcrumb hook
  describe('useFolderBreadcrumb', () => {
    it('fetches folder breadcrumb successfully', async () => {
      const mockBreadcrumb = [
        { _id: '1', name: 'Root' },
        { _id: '2', name: 'Parent' },
        { _id: '3', name: 'Current' },
      ];
      foldersApi.getBreadcrumb.mockResolvedValueOnce({ data: { breadcrumb: mockBreadcrumb } });

      const { result } = renderHook(() => useFolderBreadcrumb('3'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockBreadcrumb);
      expect(foldersApi.getBreadcrumb).toHaveBeenCalledWith('3');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFolderBreadcrumb(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(foldersApi.getBreadcrumb).not.toHaveBeenCalled();
    });
  });

  // Test useFolderStats hook
  describe('useFolderStats', () => {
    it('fetches folder stats successfully', async () => {
      const mockStats = { totalFiles: 10, totalSize: 1024000, subfolders: 3 };
      foldersApi.getFolderStats.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useFolderStats('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockStats);
      expect(foldersApi.getFolderStats).toHaveBeenCalledWith('123');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFolderStats(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(foldersApi.getFolderStats).not.toHaveBeenCalled();
    });
  });

  // Test useTrashedFolders hook
  describe('useTrashedFolders', () => {
    it('fetches trashed folders successfully', async () => {
      const mockTrashed = [
        { _id: '1', name: 'Deleted Folder', trashedAt: '2024-01-01' },
      ];
      foldersApi.getTrashedFolders.mockResolvedValueOnce({ data: { folders: mockTrashed } });

      const { result } = renderHook(() => useTrashedFolders(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTrashed);
      expect(foldersApi.getTrashedFolders).toHaveBeenCalled();
    });

    it('handles error when fetching trashed folders fails', async () => {
      foldersApi.getTrashedFolders.mockRejectedValueOnce(new Error('Fetch error'));

      const { result } = renderHook(() => useTrashedFolders(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCreateFolder mutation
  describe('useCreateFolder', () => {
    it('creates a folder successfully', async () => {
      const newFolder = { name: 'New Folder' };
      const createdFolder = { _id: 'new-id', name: 'New Folder' };
      foldersApi.createFolder.mockResolvedValueOnce({ data: createdFolder });

      const { result } = renderHook(() => useCreateFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newFolder);
      });

      expect(foldersApi.createFolder).toHaveBeenCalledWith(newFolder);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('creates a folder with parentId', async () => {
      const newFolder = { name: 'Subfolder', parentId: 'parent-id' };
      const createdFolder = { _id: 'new-id', name: 'Subfolder', parentId: 'parent-id' };
      foldersApi.createFolder.mockResolvedValueOnce({ data: createdFolder });

      const { result } = renderHook(() => useCreateFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newFolder);
      });

      expect(foldersApi.createFolder).toHaveBeenCalledWith(newFolder);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating folder fails', async () => {
      foldersApi.createFolder.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'Bad Folder' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateFolder mutation
  describe('useUpdateFolder', () => {
    it('updates a folder successfully', async () => {
      const updatedFolder = { _id: '123', name: 'Updated Name' };
      foldersApi.updateFolder.mockResolvedValueOnce({ data: updatedFolder });

      const { result } = renderHook(() => useUpdateFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: { name: 'Updated Name' } });
      });

      expect(foldersApi.updateFolder).toHaveBeenCalledWith('123', { name: 'Updated Name' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating folder fails', async () => {
      foldersApi.updateFolder.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', data: {} });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useMoveFolder mutation
  describe('useMoveFolder', () => {
    it('moves a folder successfully', async () => {
      foldersApi.moveFolder.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useMoveFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', parentId: '456' });
      });

      expect(foldersApi.moveFolder).toHaveBeenCalledWith('123', '456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('moves a folder to root (null parentId)', async () => {
      foldersApi.moveFolder.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useMoveFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', parentId: null });
      });

      expect(foldersApi.moveFolder).toHaveBeenCalledWith('123', null);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when moving folder fails', async () => {
      foldersApi.moveFolder.mockRejectedValueOnce(new Error('Move failed'));

      const { result } = renderHook(() => useMoveFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', parentId: '456' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTrashFolder mutation
  describe('useTrashFolder', () => {
    it('trashes a folder successfully', async () => {
      foldersApi.trashFolder.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useTrashFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(foldersApi.trashFolder).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when trashing folder fails', async () => {
      foldersApi.trashFolder.mockRejectedValueOnce(new Error('Trash failed'));

      const { result } = renderHook(() => useTrashFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRestoreFolder mutation
  describe('useRestoreFolder', () => {
    it('restores a folder from trash successfully', async () => {
      foldersApi.restoreFolder.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useRestoreFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(foldersApi.restoreFolder).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when restoring folder fails', async () => {
      foldersApi.restoreFolder.mockRejectedValueOnce(new Error('Restore failed'));

      const { result } = renderHook(() => useRestoreFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteFolder mutation
  describe('useDeleteFolder', () => {
    it('deletes a folder permanently', async () => {
      foldersApi.deleteFolder.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteFolder(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(foldersApi.deleteFolder).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting folder fails', async () => {
      foldersApi.deleteFolder.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteFolder(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
