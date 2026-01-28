import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../../../lib/api';

// Query keys
export const noteKeys = {
  all: ['notes'],
  lists: () => [...noteKeys.all, 'list'],
  list: (filters) => [...noteKeys.lists(), filters],
  details: () => [...noteKeys.all, 'detail'],
  detail: (id) => [...noteKeys.details(), id],
  tags: () => [...noteKeys.all, 'tags'],
  recent: () => [...noteKeys.all, 'recent'],
  pinned: () => [...noteKeys.all, 'pinned'],
  lastOpened: () => [...noteKeys.all, 'lastOpened'],
  inbox: () => [...noteKeys.all, 'inbox'],
  inboxCount: () => [...noteKeys.all, 'inboxCount'],
  backlinks: (id) => [...noteKeys.all, 'backlinks', id],
};

/**
 * Hook to fetch notes with filters
 */
export function useNotes(filters = {}) {
  return useQuery({
    queryKey: noteKeys.list(filters),
    queryFn: async () => {
      const response = await notesApi.getNotes(filters);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single note
 */
export function useNote(id) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: async () => {
      const response = await notesApi.getNote(id);
      return response.data.note;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch user's tags
 */
export function useTags() {
  return useQuery({
    queryKey: noteKeys.tags(),
    queryFn: async () => {
      const response = await notesApi.getTags();
      return response.data.tags;
    },
  });
}

/**
 * Hook to fetch recent notes
 */
export function useRecentNotes(limit = 5) {
  return useQuery({
    queryKey: noteKeys.recent(),
    queryFn: async () => {
      const response = await notesApi.getRecentNotes(limit);
      return response.data.notes;
    },
  });
}

/**
 * Hook to fetch pinned notes
 */
export function usePinnedNotes() {
  return useQuery({
    queryKey: noteKeys.pinned(),
    queryFn: async () => {
      const response = await notesApi.getPinnedNotes();
      return response.data.notes;
    },
  });
}

/**
 * Hook to fetch last opened note
 */
export function useLastOpenedNote() {
  return useQuery({
    queryKey: noteKeys.lastOpened(),
    queryFn: async () => {
      const response = await notesApi.getLastOpenedNote();
      return response.data.note;
    },
  });
}

/**
 * Hook to create a note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => notesApi.createNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() });
      queryClient.invalidateQueries({ queryKey: noteKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: noteKeys.inboxCount() });
      // Also invalidate dashboard so it refreshes immediately
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook to update a note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => notesApi.updateNote(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() });
    },
  });
}

/**
 * Hook to delete a note permanently
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
    },
  });
}

/**
 * Hook to pin a note
 */
export function usePinNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.pinNote(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

      // Snapshot previous value
      const previousNote = queryClient.getQueryData(noteKeys.detail(id));

      // Optimistically update
      if (previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), {
          ...previousNote,
          pinned: true,
        });
      }

      return { previousNote };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
    },
  });
}

/**
 * Hook to unpin a note
 */
export function useUnpinNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.unpinNote(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(id) });

      // Snapshot previous value
      const previousNote = queryClient.getQueryData(noteKeys.detail(id));

      // Optimistically update
      if (previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), {
          ...previousNote,
          pinned: false,
        });
      }

      return { previousNote };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(id), context.previousNote);
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
    },
  });
}

/**
 * Hook to archive a note
 */
export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.archiveNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
    },
  });
}

/**
 * Hook to unarchive a note
 */
export function useUnarchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.unarchiveNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

/**
 * Hook to trash a note
 */
export function useTrashNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.trashNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.recent() });
      queryClient.invalidateQueries({ queryKey: noteKeys.pinned() });
    },
  });
}

/**
 * Hook to restore a note from trash
 */
export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.restoreNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

/**
 * Hook to fetch inbox notes (unprocessed)
 */
export function useInboxNotes(options = {}) {
  return useQuery({
    queryKey: noteKeys.inbox(),
    queryFn: async () => {
      const response = await notesApi.getInboxNotes(options);
      return response.data;
    },
  });
}

/**
 * Hook to fetch inbox count
 */
export function useInboxCount() {
  return useQuery({
    queryKey: noteKeys.inboxCount(),
    queryFn: async () => {
      const response = await notesApi.getInboxCount();
      return response.data.count;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to process a note (remove from inbox)
 */
export function useProcessNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.processNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: noteKeys.inboxCount() });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

/**
 * Hook to unprocess a note (move back to inbox)
 */
export function useUnprocessNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.unprocessNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: noteKeys.inboxCount() });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

/**
 * Hook to convert a note to a task
 */
export function useConvertNoteToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, keepNote = true }) => notesApi.convertToTask(id, keepNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: noteKeys.inboxCount() });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Invalidate tasks
    },
  });
}

/**
 * Hook to fetch note backlinks
 */
export function useNoteBacklinks(id) {
  return useQuery({
    queryKey: noteKeys.backlinks(id),
    queryFn: async () => {
      const response = await notesApi.getBacklinks(id);
      return response.data.backlinks;
    },
    enabled: !!id,
  });
}
