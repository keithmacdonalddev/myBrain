import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNotes,
  useNote,
  useTags,
  useRecentNotes,
  usePinnedNotes,
  useLastOpenedNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  usePinNote,
  useUnpinNote,
  useArchiveNote,
  useUnarchiveNote,
  useTrashNote,
  useRestoreNote,
  useInboxNotes,
  useInboxCount,
  useProcessNote,
  useUnprocessNote,
  useConvertNoteToTask,
  useNoteBacklinks,
  noteKeys,
} from './useNotes';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  notesApi: {
    getNotes: vi.fn(),
    getNote: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    pinNote: vi.fn(),
    unpinNote: vi.fn(),
    archiveNote: vi.fn(),
    unarchiveNote: vi.fn(),
    trashNote: vi.fn(),
    restoreNote: vi.fn(),
    getTags: vi.fn(),
    getRecentNotes: vi.fn(),
    getPinnedNotes: vi.fn(),
    getLastOpenedNote: vi.fn(),
    getInboxNotes: vi.fn(),
    getInboxCount: vi.fn(),
    processNote: vi.fn(),
    unprocessNote: vi.fn(),
    convertToTask: vi.fn(),
    getBacklinks: vi.fn(),
  },
}));

// Import the mocked API
import { notesApi } from '../../../lib/api';

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

describe('useNotes hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test noteKeys factory functions
  describe('noteKeys', () => {
    it('generates correct query keys', () => {
      expect(noteKeys.all).toEqual(['notes']);
      expect(noteKeys.lists()).toEqual(['notes', 'list']);
      expect(noteKeys.list({ status: 'active' })).toEqual(['notes', 'list', { status: 'active' }]);
      expect(noteKeys.details()).toEqual(['notes', 'detail']);
      expect(noteKeys.detail('123')).toEqual(['notes', 'detail', '123']);
      expect(noteKeys.tags()).toEqual(['notes', 'tags']);
      expect(noteKeys.recent()).toEqual(['notes', 'recent']);
      expect(noteKeys.pinned()).toEqual(['notes', 'pinned']);
      expect(noteKeys.lastOpened()).toEqual(['notes', 'lastOpened']);
      expect(noteKeys.inbox()).toEqual(['notes', 'inbox']);
      expect(noteKeys.inboxCount()).toEqual(['notes', 'inboxCount']);
      expect(noteKeys.backlinks('123')).toEqual(['notes', 'backlinks', '123']);
    });
  });

  // Test useNotes hook
  describe('useNotes', () => {
    it('fetches notes successfully', async () => {
      const mockNotes = {
        notes: [
          { _id: '1', title: 'Note 1', content: 'Content 1' },
          { _id: '2', title: 'Note 2', content: 'Content 2' },
        ],
        total: 2,
      };
      notesApi.getNotes.mockResolvedValueOnce({ data: mockNotes });

      const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNotes);
      expect(notesApi.getNotes).toHaveBeenCalledWith({});
    });

    it('handles error when fetching notes fails', async () => {
      const error = new Error('Failed to fetch notes');
      notesApi.getNotes.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch notes');
    });

    it('passes filters to API call', async () => {
      notesApi.getNotes.mockResolvedValueOnce({ data: { notes: [], total: 0 } });

      renderHook(() => useNotes({ status: 'active', lifeAreaId: '123' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(notesApi.getNotes).toHaveBeenCalledWith({ status: 'active', lifeAreaId: '123' })
      );
    });
  });

  // Test useNote hook
  describe('useNote', () => {
    it('fetches a single note successfully', async () => {
      const mockNote = { _id: '123', title: 'Test Note', content: 'Test Content' };
      notesApi.getNote.mockResolvedValueOnce({ data: { note: mockNote } });

      const { result } = renderHook(() => useNote('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNote);
      expect(notesApi.getNote).toHaveBeenCalledWith('123');
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useNote(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(notesApi.getNote).not.toHaveBeenCalled();
    });

    it('handles error when fetching note fails', async () => {
      notesApi.getNote.mockRejectedValueOnce(new Error('Note not found'));

      const { result } = renderHook(() => useNote('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTags hook
  describe('useTags', () => {
    it('fetches tags successfully', async () => {
      const mockTags = ['work', 'personal', 'ideas'];
      notesApi.getTags.mockResolvedValueOnce({ data: { tags: mockTags } });

      const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
    });
  });

  // Test useRecentNotes hook
  describe('useRecentNotes', () => {
    it('fetches recent notes with default limit', async () => {
      const mockNotes = [{ _id: '1', title: 'Recent 1' }];
      notesApi.getRecentNotes.mockResolvedValueOnce({ data: { notes: mockNotes } });

      const { result } = renderHook(() => useRecentNotes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNotes);
      expect(notesApi.getRecentNotes).toHaveBeenCalledWith(5);
    });

    it('fetches recent notes with custom limit', async () => {
      notesApi.getRecentNotes.mockResolvedValueOnce({ data: { notes: [] } });

      renderHook(() => useRecentNotes(10), { wrapper: createWrapper() });

      await waitFor(() => expect(notesApi.getRecentNotes).toHaveBeenCalledWith(10));
    });
  });

  // Test usePinnedNotes hook
  describe('usePinnedNotes', () => {
    it('fetches pinned notes successfully', async () => {
      const mockNotes = [{ _id: '1', title: 'Pinned Note', pinned: true }];
      notesApi.getPinnedNotes.mockResolvedValueOnce({ data: { notes: mockNotes } });

      const { result } = renderHook(() => usePinnedNotes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNotes);
    });
  });

  // Test useLastOpenedNote hook
  describe('useLastOpenedNote', () => {
    it('fetches last opened note successfully', async () => {
      const mockNote = { _id: '1', title: 'Last Opened' };
      notesApi.getLastOpenedNote.mockResolvedValueOnce({ data: { note: mockNote } });

      const { result } = renderHook(() => useLastOpenedNote(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNote);
    });
  });

  // Test useInboxNotes hook
  describe('useInboxNotes', () => {
    it('fetches inbox notes successfully', async () => {
      const mockData = { notes: [{ _id: '1', isProcessed: false }], total: 1 };
      notesApi.getInboxNotes.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useInboxNotes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockData);
    });
  });

  // Test useInboxCount hook
  describe('useInboxCount', () => {
    it('fetches inbox count successfully', async () => {
      notesApi.getInboxCount.mockResolvedValueOnce({ data: { count: 5 } });

      const { result } = renderHook(() => useInboxCount(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toBe(5);
    });
  });

  // Test useNoteBacklinks hook
  describe('useNoteBacklinks', () => {
    it('fetches backlinks successfully', async () => {
      const mockBacklinks = [{ _id: '2', title: 'Linking Note' }];
      notesApi.getBacklinks.mockResolvedValueOnce({ data: { backlinks: mockBacklinks } });

      const { result } = renderHook(() => useNoteBacklinks('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockBacklinks);
      expect(notesApi.getBacklinks).toHaveBeenCalledWith('123');
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useNoteBacklinks(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(notesApi.getBacklinks).not.toHaveBeenCalled();
    });
  });

  // Test useCreateNote mutation
  describe('useCreateNote', () => {
    it('creates a note successfully', async () => {
      const newNote = { title: 'New Note', content: 'New Content' };
      const createdNote = { _id: '123', ...newNote };
      notesApi.createNote.mockResolvedValueOnce({ data: { note: createdNote } });

      const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newNote);
      });

      expect(notesApi.createNote).toHaveBeenCalledWith(newNote);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating note fails', async () => {
      notesApi.createNote.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ title: 'Bad Note' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateNote mutation
  describe('useUpdateNote', () => {
    it('updates a note successfully', async () => {
      const updateData = { title: 'Updated Title' };
      notesApi.updateNote.mockResolvedValueOnce({
        data: { note: { _id: '123', ...updateData } },
      });

      const { result } = renderHook(() => useUpdateNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: updateData });
      });

      expect(notesApi.updateNote).toHaveBeenCalledWith('123', updateData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating note fails', async () => {
      notesApi.updateNote.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateNote(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', data: { title: 'Bad' } });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteNote mutation
  describe('useDeleteNote', () => {
    it('deletes a note successfully', async () => {
      notesApi.deleteNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.deleteNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting note fails', async () => {
      notesApi.deleteNote.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });

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

  // Test usePinNote mutation
  describe('usePinNote', () => {
    it('pins a note successfully', async () => {
      notesApi.pinNote.mockResolvedValueOnce({ data: { note: { _id: '123', pinned: true } } });

      const { result } = renderHook(() => usePinNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.pinNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnpinNote mutation
  describe('useUnpinNote', () => {
    it('unpins a note successfully', async () => {
      notesApi.unpinNote.mockResolvedValueOnce({ data: { note: { _id: '123', pinned: false } } });

      const { result } = renderHook(() => useUnpinNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.unpinNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useArchiveNote mutation
  describe('useArchiveNote', () => {
    it('archives a note successfully', async () => {
      notesApi.archiveNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useArchiveNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.archiveNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnarchiveNote mutation
  describe('useUnarchiveNote', () => {
    it('unarchives a note successfully', async () => {
      notesApi.unarchiveNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnarchiveNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.unarchiveNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useTrashNote mutation
  describe('useTrashNote', () => {
    it('trashes a note successfully', async () => {
      notesApi.trashNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useTrashNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.trashNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useRestoreNote mutation
  describe('useRestoreNote', () => {
    it('restores a note successfully', async () => {
      notesApi.restoreNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useRestoreNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.restoreNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useProcessNote mutation
  describe('useProcessNote', () => {
    it('processes a note successfully', async () => {
      notesApi.processNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useProcessNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.processNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnprocessNote mutation
  describe('useUnprocessNote', () => {
    it('unprocesses a note successfully', async () => {
      notesApi.unprocessNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnprocessNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(notesApi.unprocessNote).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useConvertNoteToTask mutation
  describe('useConvertNoteToTask', () => {
    it('converts a note to task successfully', async () => {
      notesApi.convertToTask.mockResolvedValueOnce({ data: { task: { _id: 'task123' } } });

      const { result } = renderHook(() => useConvertNoteToTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', keepNote: true });
      });

      expect(notesApi.convertToTask).toHaveBeenCalledWith('123', true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('converts a note to task without keeping note', async () => {
      notesApi.convertToTask.mockResolvedValueOnce({ data: { task: { _id: 'task123' } } });

      const { result } = renderHook(() => useConvertNoteToTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', keepNote: false });
      });

      expect(notesApi.convertToTask).toHaveBeenCalledWith('123', false);
    });
  });
});
