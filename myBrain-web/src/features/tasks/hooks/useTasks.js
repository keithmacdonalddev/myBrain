import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../../lib/api';

// Query keys
export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (filters) => [...taskKeys.lists(), filters],
  details: () => [...taskKeys.all, 'detail'],
  detail: (id) => [...taskKeys.details(), id],
  tags: () => [...taskKeys.all, 'tags'],
  today: () => [...taskKeys.all, 'today'],
  backlinks: (id) => [...taskKeys.all, 'backlinks', id],
};

/**
 * Hook to fetch tasks with filters
 */
export function useTasks(filters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const response = await tasksApi.getTasks(filters);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single task
 */
export function useTask(id) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await tasksApi.getTask(id);
      return response.data.task;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch today view data
 */
export function useTodayView() {
  return useQuery({
    queryKey: taskKeys.today(),
    queryFn: async () => {
      const response = await tasksApi.getTodayView();
      return response.data;
    },
  });
}

/**
 * Hook to fetch task tags
 */
export function useTaskTags() {
  return useQuery({
    queryKey: taskKeys.tags(),
    queryFn: async () => {
      const response = await tasksApi.getTaskTags();
      return response.data.tags;
    },
  });
}

/**
 * Hook to fetch task backlinks
 */
export function useTaskBacklinks(id) {
  return useQuery({
    queryKey: taskKeys.backlinks(id),
    queryFn: async () => {
      const response = await tasksApi.getBacklinks(id);
      return response.data.backlinks;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags() });
    },
  });
}

/**
 * Hook to update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateTask(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
      queryClient.invalidateQueries({ queryKey: taskKeys.tags() });
    },
  });
}

/**
 * Hook to update task status with optimistic updates
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => tasksApi.updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), {
          ...previousTask,
          status,
          completedAt: status === 'done' || status === 'cancelled' ? new Date().toISOString() : null,
        });
      }

      return { previousTask };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.today() });
    },
  });
}

/**
 * Hook to link a note to a task
 */
export function useLinkNoteToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, noteId }) => tasksApi.linkNote(taskId, noteId),
    onSuccess: (response, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.backlinks(taskId) });
    },
  });
}

/**
 * Hook to unlink a note from a task
 */
export function useUnlinkNoteFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, noteId }) => tasksApi.unlinkNote(taskId, noteId),
    onSuccess: (response, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.backlinks(taskId) });
    },
  });
}
