import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  useLifeAreas,
  useLifeArea,
  useLifeAreaItems,
  useCreateLifeArea,
  useUpdateLifeArea,
  useDeleteLifeArea,
  useSetDefaultLifeArea,
  useReorderLifeAreas,
  useArchiveLifeArea,
  lifeAreaKeys,
} from './useLifeAreas';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  lifeAreasApi: {
    getLifeAreas: vi.fn(),
    getLifeArea: vi.fn(),
    getLifeAreaItems: vi.fn(),
    createLifeArea: vi.fn(),
    updateLifeArea: vi.fn(),
    deleteLifeArea: vi.fn(),
    setDefault: vi.fn(),
    reorderLifeAreas: vi.fn(),
    archiveLifeArea: vi.fn(),
  },
}));

// Import the mocked API
import { lifeAreasApi } from '../../../lib/api';

// Create a mock Redux store
const createMockStore = () => {
  return configureStore({
    reducer: {
      lifeAreas: (state = { items: [] }, action) => {
        switch (action.type) {
          case 'lifeAreas/updateLifeAreaInStore':
            return {
              ...state,
              items: state.items.map((la) =>
                la._id === action.payload._id ? action.payload : la
              ),
            };
          case 'lifeAreas/addLifeAreaToStore':
            return { ...state, items: [...state.items, action.payload] };
          case 'lifeAreas/removeLifeAreaFromStore':
            return {
              ...state,
              items: state.items.filter((la) => la._id !== action.payload),
            };
          case 'lifeAreas/reorderLifeAreasInStore':
            return { ...state, items: action.payload };
          default:
            return state;
        }
      },
    },
  });
};

// Create a wrapper with QueryClientProvider and Redux Provider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const store = createMockStore();
  return ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe('useLifeAreas hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test lifeAreaKeys factory functions
  describe('lifeAreaKeys', () => {
    it('generates correct query keys', () => {
      expect(lifeAreaKeys.all).toEqual(['lifeAreas']);
      expect(lifeAreaKeys.lists()).toEqual(['lifeAreas', 'list']);
      expect(lifeAreaKeys.list(false)).toEqual(['lifeAreas', 'list', { includeArchived: false }]);
      expect(lifeAreaKeys.list(true)).toEqual(['lifeAreas', 'list', { includeArchived: true }]);
      expect(lifeAreaKeys.details()).toEqual(['lifeAreas', 'detail']);
      expect(lifeAreaKeys.detail('abc')).toEqual(['lifeAreas', 'detail', 'abc']);
      expect(lifeAreaKeys.items('123')).toEqual(['lifeAreas', 'items', '123']);
    });
  });

  // Test useLifeAreas hook
  describe('useLifeAreas', () => {
    it('fetches life areas successfully', async () => {
      const mockLifeAreas = [
        { _id: '1', name: 'Work', color: '#ff0000' },
        { _id: '2', name: 'Personal', color: '#00ff00' },
      ];
      lifeAreasApi.getLifeAreas.mockResolvedValueOnce({
        data: { lifeAreas: mockLifeAreas },
      });

      const { result } = renderHook(() => useLifeAreas(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLifeAreas);
      expect(lifeAreasApi.getLifeAreas).toHaveBeenCalledWith(false);
    });

    it('fetches life areas including archived', async () => {
      const mockLifeAreas = [
        { _id: '1', name: 'Work', isArchived: false },
        { _id: '2', name: 'Old Project', isArchived: true },
      ];
      lifeAreasApi.getLifeAreas.mockResolvedValueOnce({
        data: { lifeAreas: mockLifeAreas },
      });

      const { result } = renderHook(() => useLifeAreas(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLifeAreas);
      expect(lifeAreasApi.getLifeAreas).toHaveBeenCalledWith(true);
    });

    it('handles error when fetching life areas fails', async () => {
      const error = new Error('Failed to fetch life areas');
      lifeAreasApi.getLifeAreas.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLifeAreas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch life areas');
    });

    it('returns empty array when no life areas exist', async () => {
      lifeAreasApi.getLifeAreas.mockResolvedValueOnce({
        data: { lifeAreas: [] },
      });

      const { result } = renderHook(() => useLifeAreas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual([]);
    });
  });

  // Test useLifeArea hook
  describe('useLifeArea', () => {
    it('fetches a single life area by ID', async () => {
      const mockLifeArea = { _id: '123', name: 'Work', color: '#ff0000' };
      lifeAreasApi.getLifeArea.mockResolvedValueOnce({
        data: { lifeArea: mockLifeArea },
      });

      const { result } = renderHook(() => useLifeArea('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLifeArea);
      expect(lifeAreasApi.getLifeArea).toHaveBeenCalledWith('123', false);
    });

    it('fetches life area with counts when requested', async () => {
      const mockLifeArea = { _id: '123', name: 'Work', notesCount: 5, tasksCount: 10 };
      lifeAreasApi.getLifeArea.mockResolvedValueOnce({
        data: { lifeArea: mockLifeArea },
      });

      const { result } = renderHook(() => useLifeArea('123', true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLifeArea);
      expect(lifeAreasApi.getLifeArea).toHaveBeenCalledWith('123', true);
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useLifeArea(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(lifeAreasApi.getLifeArea).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is undefined', async () => {
      const { result } = renderHook(() => useLifeArea(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(lifeAreasApi.getLifeArea).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is empty string', async () => {
      const { result } = renderHook(() => useLifeArea(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(lifeAreasApi.getLifeArea).not.toHaveBeenCalled();
    });

    it('handles error when fetching life area fails', async () => {
      lifeAreasApi.getLifeArea.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useLifeArea('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useLifeAreaItems hook
  describe('useLifeAreaItems', () => {
    it('fetches life area items successfully', async () => {
      const mockItems = {
        notes: [{ _id: 'n1', title: 'Note 1' }],
        tasks: [{ _id: 't1', title: 'Task 1' }],
        projects: [{ _id: 'p1', name: 'Project 1' }],
      };
      lifeAreasApi.getLifeAreaItems.mockResolvedValueOnce({ data: mockItems });

      const { result } = renderHook(() => useLifeAreaItems('123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockItems);
      expect(lifeAreasApi.getLifeAreaItems).toHaveBeenCalledWith('123', {});
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useLifeAreaItems(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(lifeAreasApi.getLifeAreaItems).not.toHaveBeenCalled();
    });

    it('passes params to API call', async () => {
      lifeAreasApi.getLifeAreaItems.mockResolvedValueOnce({ data: {} });

      renderHook(() => useLifeAreaItems('123', { type: 'notes' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(lifeAreasApi.getLifeAreaItems).toHaveBeenCalledWith('123', { type: 'notes' })
      );
    });
  });

  // Test useCreateLifeArea mutation
  describe('useCreateLifeArea', () => {
    it('creates a life area successfully', async () => {
      const newLifeArea = { name: 'Fitness', color: '#00ff00' };
      const createdLifeArea = { _id: 'new-id', ...newLifeArea };
      lifeAreasApi.createLifeArea.mockResolvedValueOnce({
        data: { lifeArea: createdLifeArea },
      });

      const { result } = renderHook(() => useCreateLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newLifeArea);
      });

      expect(lifeAreasApi.createLifeArea).toHaveBeenCalledWith(newLifeArea);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating life area fails', async () => {
      lifeAreasApi.createLifeArea.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'Bad Life Area' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateLifeArea mutation
  describe('useUpdateLifeArea', () => {
    it('updates a life area successfully', async () => {
      const updatedLifeArea = { _id: '123', name: 'Updated Name', color: '#0000ff' };
      lifeAreasApi.updateLifeArea.mockResolvedValueOnce({
        data: { lifeArea: updatedLifeArea },
      });

      const { result } = renderHook(() => useUpdateLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: { name: 'Updated Name' } });
      });

      expect(lifeAreasApi.updateLifeArea).toHaveBeenCalledWith('123', { name: 'Updated Name' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating life area fails', async () => {
      lifeAreasApi.updateLifeArea.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateLifeArea(), { wrapper: createWrapper() });

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

  // Test useDeleteLifeArea mutation
  describe('useDeleteLifeArea', () => {
    it('deletes a life area successfully', async () => {
      lifeAreasApi.deleteLifeArea.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(lifeAreasApi.deleteLifeArea).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting life area fails', async () => {
      lifeAreasApi.deleteLifeArea.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteLifeArea(), { wrapper: createWrapper() });

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

  // Test useSetDefaultLifeArea mutation
  describe('useSetDefaultLifeArea', () => {
    it('sets a life area as default successfully', async () => {
      lifeAreasApi.setDefault.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useSetDefaultLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(lifeAreasApi.setDefault).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when setting default fails', async () => {
      lifeAreasApi.setDefault.mockRejectedValueOnce(new Error('Set default failed'));

      const { result } = renderHook(() => useSetDefaultLifeArea(), { wrapper: createWrapper() });

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

  // Test useReorderLifeAreas mutation
  describe('useReorderLifeAreas', () => {
    it('reorders life areas successfully', async () => {
      const orderedIds = ['id3', 'id1', 'id2'];
      lifeAreasApi.reorderLifeAreas.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useReorderLifeAreas(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(orderedIds);
      });

      expect(lifeAreasApi.reorderLifeAreas).toHaveBeenCalledWith(orderedIds);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when reordering fails', async () => {
      lifeAreasApi.reorderLifeAreas.mockRejectedValueOnce(new Error('Reorder failed'));

      const { result } = renderHook(() => useReorderLifeAreas(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync(['id1', 'id2']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useArchiveLifeArea mutation
  describe('useArchiveLifeArea', () => {
    it('archives a life area successfully', async () => {
      const archivedLifeArea = { _id: '123', name: 'Work', isArchived: true };
      lifeAreasApi.archiveLifeArea.mockResolvedValueOnce({
        data: { lifeArea: archivedLifeArea },
      });

      const { result } = renderHook(() => useArchiveLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', isArchived: true });
      });

      expect(lifeAreasApi.archiveLifeArea).toHaveBeenCalledWith('123', true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('unarchives a life area successfully', async () => {
      const unarchivedLifeArea = { _id: '123', name: 'Work', isArchived: false };
      lifeAreasApi.archiveLifeArea.mockResolvedValueOnce({
        data: { lifeArea: unarchivedLifeArea },
      });

      const { result } = renderHook(() => useArchiveLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', isArchived: false });
      });

      expect(lifeAreasApi.archiveLifeArea).toHaveBeenCalledWith('123', false);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when archiving fails', async () => {
      lifeAreasApi.archiveLifeArea.mockRejectedValueOnce(new Error('Archive failed'));

      const { result } = renderHook(() => useArchiveLifeArea(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', isArchived: true });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
