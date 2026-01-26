import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTasks,
  useTask,
  useTodayView,
  useTaskTags,
  useTaskBacklinks,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useLinkNoteToTask,
  useUnlinkNoteFromTask,
  useArchiveTask,
  useUnarchiveTask,
  useTrashTask,
  useRestoreTask,
  useAddTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
  taskKeys,
} from './useTasks';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  tasksApi: {
    getTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
    getTodayView: vi.fn(),
    getTaskTags: vi.fn(),
    linkNote: vi.fn(),
    unlinkNote: vi.fn(),
    getBacklinks: vi.fn(),
    archiveTask: vi.fn(),
    unarchiveTask: vi.fn(),
    trashTask: vi.fn(),
    restoreTask: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

// Import the mocked API
import { tasksApi } from '../../../lib/api';

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

describe('useTasks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test taskKeys factory functions
  describe('taskKeys', () => {
    it('generates correct query keys', () => {
      expect(taskKeys.all).toEqual(['tasks']);
      expect(taskKeys.lists()).toEqual(['tasks', 'list']);
      expect(taskKeys.list({ status: 'pending' })).toEqual(['tasks', 'list', { status: 'pending' }]);
      expect(taskKeys.details()).toEqual(['tasks', 'detail']);
      expect(taskKeys.detail('123')).toEqual(['tasks', 'detail', '123']);
      expect(taskKeys.tags()).toEqual(['tasks', 'tags']);
      expect(taskKeys.today()).toEqual(['tasks', 'today']);
      expect(taskKeys.backlinks('123')).toEqual(['tasks', 'backlinks', '123']);
    });
  });

  // Test useTasks hook
  describe('useTasks', () => {
    it('fetches tasks successfully', async () => {
      const mockTasks = {
        tasks: [
          { _id: '1', title: 'Task 1', status: 'pending' },
          { _id: '2', title: 'Task 2', status: 'done' },
        ],
        total: 2,
      };
      tasksApi.getTasks.mockResolvedValueOnce({ data: mockTasks });

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTasks);
      expect(tasksApi.getTasks).toHaveBeenCalledWith({});
    });

    it('handles error when fetching tasks fails', async () => {
      const error = new Error('Failed to fetch tasks');
      tasksApi.getTasks.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch tasks');
    });

    it('passes filters to API call', async () => {
      tasksApi.getTasks.mockResolvedValueOnce({ data: { tasks: [], total: 0 } });

      renderHook(() => useTasks({ status: 'pending', priority: 'high' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(tasksApi.getTasks).toHaveBeenCalledWith({ status: 'pending', priority: 'high' })
      );
    });
  });

  // Test useTask hook
  describe('useTask', () => {
    it('fetches a single task successfully', async () => {
      const mockTask = { _id: '123', title: 'Test Task', status: 'pending' };
      tasksApi.getTask.mockResolvedValueOnce({ data: { task: mockTask } });

      const { result } = renderHook(() => useTask('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTask);
      expect(tasksApi.getTask).toHaveBeenCalledWith('123');
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useTask(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(tasksApi.getTask).not.toHaveBeenCalled();
    });

    it('handles error when fetching task fails', async () => {
      tasksApi.getTask.mockRejectedValueOnce(new Error('Task not found'));

      const { result } = renderHook(() => useTask('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTodayView hook
  describe('useTodayView', () => {
    it('fetches today view data successfully', async () => {
      const mockTodayData = {
        overdue: [{ _id: '1', title: 'Overdue Task' }],
        today: [{ _id: '2', title: 'Today Task' }],
        upcoming: [{ _id: '3', title: 'Upcoming Task' }],
      };
      tasksApi.getTodayView.mockResolvedValueOnce({ data: mockTodayData });

      const { result } = renderHook(() => useTodayView(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTodayData);
    });
  });

  // Test useTaskTags hook
  describe('useTaskTags', () => {
    it('fetches task tags successfully', async () => {
      const mockTags = ['urgent', 'work', 'personal'];
      tasksApi.getTaskTags.mockResolvedValueOnce({ data: { tags: mockTags } });

      const { result } = renderHook(() => useTaskTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
    });
  });

  // Test useTaskBacklinks hook
  describe('useTaskBacklinks', () => {
    it('fetches backlinks successfully', async () => {
      const mockBacklinks = [{ _id: 'note1', title: 'Linked Note' }];
      tasksApi.getBacklinks.mockResolvedValueOnce({ data: { backlinks: mockBacklinks } });

      const { result } = renderHook(() => useTaskBacklinks('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockBacklinks);
      expect(tasksApi.getBacklinks).toHaveBeenCalledWith('123');
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useTaskBacklinks(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(tasksApi.getBacklinks).not.toHaveBeenCalled();
    });
  });

  // Test useCreateTask mutation
  describe('useCreateTask', () => {
    it('creates a task successfully', async () => {
      const newTask = { title: 'New Task', description: 'Task description' };
      const createdTask = { _id: '123', ...newTask, status: 'pending' };
      tasksApi.createTask.mockResolvedValueOnce({ data: { task: createdTask } });

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newTask);
      });

      expect(tasksApi.createTask).toHaveBeenCalledWith(newTask);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating task fails', async () => {
      tasksApi.createTask.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ title: 'Bad Task' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateTask mutation
  describe('useUpdateTask', () => {
    it('updates a task successfully', async () => {
      const updateData = { title: 'Updated Title' };
      tasksApi.updateTask.mockResolvedValueOnce({
        data: { task: { _id: '123', ...updateData } },
      });

      const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: updateData });
      });

      expect(tasksApi.updateTask).toHaveBeenCalledWith('123', updateData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating task fails', async () => {
      tasksApi.updateTask.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

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

  // Test useUpdateTaskStatus mutation
  describe('useUpdateTaskStatus', () => {
    it('updates task status successfully', async () => {
      tasksApi.updateTaskStatus.mockResolvedValueOnce({
        data: { task: { _id: '123', status: 'done' } },
      });

      const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', status: 'done' });
      });

      expect(tasksApi.updateTaskStatus).toHaveBeenCalledWith('123', 'done');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating status fails', async () => {
      tasksApi.updateTaskStatus.mockRejectedValueOnce(new Error('Status update failed'));

      const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', status: 'invalid' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteTask mutation
  describe('useDeleteTask', () => {
    it('deletes a task successfully', async () => {
      tasksApi.deleteTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(tasksApi.deleteTask).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting task fails', async () => {
      tasksApi.deleteTask.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

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

  // Test useLinkNoteToTask mutation
  describe('useLinkNoteToTask', () => {
    it('links a note to task successfully', async () => {
      tasksApi.linkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkNoteToTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ taskId: 'task123', noteId: 'note456' });
      });

      expect(tasksApi.linkNote).toHaveBeenCalledWith('task123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnlinkNoteFromTask mutation
  describe('useUnlinkNoteFromTask', () => {
    it('unlinks a note from task successfully', async () => {
      tasksApi.unlinkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkNoteFromTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ taskId: 'task123', noteId: 'note456' });
      });

      expect(tasksApi.unlinkNote).toHaveBeenCalledWith('task123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useArchiveTask mutation
  describe('useArchiveTask', () => {
    it('archives a task successfully', async () => {
      tasksApi.archiveTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useArchiveTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(tasksApi.archiveTask).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnarchiveTask mutation
  describe('useUnarchiveTask', () => {
    it('unarchives a task successfully', async () => {
      tasksApi.unarchiveTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnarchiveTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(tasksApi.unarchiveTask).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useTrashTask mutation
  describe('useTrashTask', () => {
    it('trashes a task successfully', async () => {
      tasksApi.trashTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useTrashTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(tasksApi.trashTask).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useRestoreTask mutation
  describe('useRestoreTask', () => {
    it('restores a task successfully', async () => {
      tasksApi.restoreTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useRestoreTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(tasksApi.restoreTask).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useAddTaskComment mutation
  describe('useAddTaskComment', () => {
    it('adds a comment successfully', async () => {
      tasksApi.addComment.mockResolvedValueOnce({
        data: { comment: { _id: 'comment123', text: 'Test comment' } },
      });

      const { result } = renderHook(() => useAddTaskComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ taskId: '123', text: 'Test comment' });
      });

      expect(tasksApi.addComment).toHaveBeenCalledWith('123', 'Test comment');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUpdateTaskComment mutation
  describe('useUpdateTaskComment', () => {
    it('updates a comment successfully', async () => {
      tasksApi.updateComment.mockResolvedValueOnce({
        data: { comment: { _id: 'comment123', text: 'Updated comment' } },
      });

      const { result } = renderHook(() => useUpdateTaskComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          taskId: '123',
          commentId: 'comment123',
          text: 'Updated comment',
        });
      });

      expect(tasksApi.updateComment).toHaveBeenCalledWith('123', 'comment123', 'Updated comment');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useDeleteTaskComment mutation
  describe('useDeleteTaskComment', () => {
    it('deletes a comment successfully', async () => {
      tasksApi.deleteComment.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteTaskComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ taskId: '123', commentId: 'comment123' });
      });

      expect(tasksApi.deleteComment).toHaveBeenCalledWith('123', 'comment123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
