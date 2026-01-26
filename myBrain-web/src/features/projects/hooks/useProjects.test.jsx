import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProjects,
  useProject,
  useUpcomingProjects,
  useOverdueProjects,
  useProjectTags,
  useCreateProject,
  useUpdateProject,
  useUpdateProjectStatus,
  useDeleteProject,
  useLinkNoteToProject,
  useUnlinkNoteFromProject,
  useLinkTaskToProject,
  useUnlinkTaskFromProject,
  useLinkEventToProject,
  useUnlinkEventFromProject,
  useAddProjectComment,
  useUpdateProjectComment,
  useDeleteProjectComment,
  projectKeys,
} from './useProjects';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  projectsApi: {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    getUpcoming: vi.fn(),
    getOverdue: vi.fn(),
    getProjectTags: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    updateProjectStatus: vi.fn(),
    deleteProject: vi.fn(),
    linkNote: vi.fn(),
    unlinkNote: vi.fn(),
    linkTask: vi.fn(),
    unlinkTask: vi.fn(),
    linkEvent: vi.fn(),
    unlinkEvent: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

// Import the mocked API
import { projectsApi } from '../../../lib/api';

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

describe('useProjects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test projectKeys factory functions
  describe('projectKeys', () => {
    it('generates correct query keys', () => {
      expect(projectKeys.all).toEqual(['projects']);
      expect(projectKeys.lists()).toEqual(['projects', 'list']);
      expect(projectKeys.list({ status: 'active' })).toEqual(['projects', 'list', { status: 'active' }]);
      expect(projectKeys.details()).toEqual(['projects', 'detail']);
      expect(projectKeys.detail('123')).toEqual(['projects', 'detail', '123']);
      expect(projectKeys.tags()).toEqual(['projects', 'tags']);
      expect(projectKeys.upcoming(7)).toEqual(['projects', 'upcoming', 7]);
      expect(projectKeys.overdue()).toEqual(['projects', 'overdue']);
    });
  });

  // Test useProjects hook
  describe('useProjects', () => {
    it('fetches projects successfully', async () => {
      const mockProjects = {
        projects: [
          { _id: '1', name: 'Project 1', status: 'active' },
          { _id: '2', name: 'Project 2', status: 'completed' },
        ],
        total: 2,
      };
      projectsApi.getProjects.mockResolvedValueOnce({ data: mockProjects });

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockProjects);
      expect(projectsApi.getProjects).toHaveBeenCalledWith({});
    });

    it('handles error when fetching projects fails', async () => {
      const error = new Error('Failed to fetch projects');
      projectsApi.getProjects.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch projects');
    });

    it('passes filters to API call', async () => {
      projectsApi.getProjects.mockResolvedValueOnce({ data: { projects: [], total: 0 } });

      renderHook(() => useProjects({ status: 'active', lifeAreaId: '123' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(projectsApi.getProjects).toHaveBeenCalledWith({ status: 'active', lifeAreaId: '123' })
      );
    });
  });

  // Test useProject hook
  describe('useProject', () => {
    it('fetches a single project successfully', async () => {
      const mockProject = { _id: '123', name: 'Test Project', status: 'active' };
      projectsApi.getProject.mockResolvedValueOnce({ data: { project: mockProject } });

      const { result } = renderHook(() => useProject('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockProject);
      expect(projectsApi.getProject).toHaveBeenCalledWith('123', false);
    });

    it('fetches project with populated links', async () => {
      const mockProject = {
        _id: '123',
        name: 'Test Project',
        linkedNotes: [{ _id: 'note1', title: 'Note' }],
      };
      projectsApi.getProject.mockResolvedValueOnce({ data: { project: mockProject } });

      const { result } = renderHook(() => useProject('123', true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(projectsApi.getProject).toHaveBeenCalledWith('123', true);
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useProject(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectsApi.getProject).not.toHaveBeenCalled();
    });

    it('handles error when fetching project fails', async () => {
      projectsApi.getProject.mockRejectedValueOnce(new Error('Project not found'));

      const { result } = renderHook(() => useProject('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpcomingProjects hook
  describe('useUpcomingProjects', () => {
    it('fetches upcoming projects with default days', async () => {
      const mockProjects = [{ _id: '1', name: 'Upcoming Project' }];
      projectsApi.getUpcoming.mockResolvedValueOnce({ data: { projects: mockProjects } });

      const { result } = renderHook(() => useUpcomingProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockProjects);
      expect(projectsApi.getUpcoming).toHaveBeenCalledWith(7);
    });

    it('fetches upcoming projects with custom days', async () => {
      projectsApi.getUpcoming.mockResolvedValueOnce({ data: { projects: [] } });

      renderHook(() => useUpcomingProjects(14), { wrapper: createWrapper() });

      await waitFor(() => expect(projectsApi.getUpcoming).toHaveBeenCalledWith(14));
    });
  });

  // Test useOverdueProjects hook
  describe('useOverdueProjects', () => {
    it('fetches overdue projects successfully', async () => {
      const mockProjects = [{ _id: '1', name: 'Overdue Project' }];
      projectsApi.getOverdue.mockResolvedValueOnce({ data: { projects: mockProjects } });

      const { result } = renderHook(() => useOverdueProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockProjects);
    });
  });

  // Test useProjectTags hook
  describe('useProjectTags', () => {
    it('fetches project tags successfully', async () => {
      const mockTags = ['web', 'mobile', 'design'];
      projectsApi.getProjectTags.mockResolvedValueOnce({ data: { tags: mockTags } });

      const { result } = renderHook(() => useProjectTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
    });
  });

  // Test useCreateProject mutation
  describe('useCreateProject', () => {
    it('creates a project successfully', async () => {
      const newProject = { name: 'New Project', description: 'Project description' };
      const createdProject = { _id: '123', ...newProject, status: 'active' };
      projectsApi.createProject.mockResolvedValueOnce({ data: { project: createdProject } });

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newProject);
      });

      expect(projectsApi.createProject).toHaveBeenCalledWith(newProject);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating project fails', async () => {
      projectsApi.createProject.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'Bad Project' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateProject mutation
  describe('useUpdateProject', () => {
    it('updates a project successfully', async () => {
      const updateData = { name: 'Updated Name' };
      projectsApi.updateProject.mockResolvedValueOnce({
        data: { project: { _id: '123', ...updateData } },
      });

      const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: updateData });
      });

      expect(projectsApi.updateProject).toHaveBeenCalledWith('123', updateData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating project fails', async () => {
      projectsApi.updateProject.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', data: { name: 'Bad' } });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateProjectStatus mutation
  describe('useUpdateProjectStatus', () => {
    it('updates project status successfully', async () => {
      projectsApi.updateProjectStatus.mockResolvedValueOnce({
        data: { project: { _id: '123', status: 'completed' } },
      });

      const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', status: 'completed' });
      });

      expect(projectsApi.updateProjectStatus).toHaveBeenCalledWith('123', 'completed');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating status fails', async () => {
      projectsApi.updateProjectStatus.mockRejectedValueOnce(new Error('Status update failed'));

      const { result } = renderHook(() => useUpdateProjectStatus(), { wrapper: createWrapper() });

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

  // Test useDeleteProject mutation
  describe('useDeleteProject', () => {
    it('deletes a project successfully', async () => {
      projectsApi.deleteProject.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(projectsApi.deleteProject).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting project fails', async () => {
      projectsApi.deleteProject.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

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

  // Test useLinkNoteToProject mutation
  describe('useLinkNoteToProject', () => {
    it('links a note to project successfully', async () => {
      projectsApi.linkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkNoteToProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', noteId: 'note456' });
      });

      expect(projectsApi.linkNote).toHaveBeenCalledWith('proj123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnlinkNoteFromProject mutation
  describe('useUnlinkNoteFromProject', () => {
    it('unlinks a note from project successfully', async () => {
      projectsApi.unlinkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkNoteFromProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', noteId: 'note456' });
      });

      expect(projectsApi.unlinkNote).toHaveBeenCalledWith('proj123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useLinkTaskToProject mutation
  describe('useLinkTaskToProject', () => {
    it('links a task to project successfully', async () => {
      projectsApi.linkTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkTaskToProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', taskId: 'task456' });
      });

      expect(projectsApi.linkTask).toHaveBeenCalledWith('proj123', 'task456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnlinkTaskFromProject mutation
  describe('useUnlinkTaskFromProject', () => {
    it('unlinks a task from project successfully', async () => {
      projectsApi.unlinkTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkTaskFromProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', taskId: 'task456' });
      });

      expect(projectsApi.unlinkTask).toHaveBeenCalledWith('proj123', 'task456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useLinkEventToProject mutation
  describe('useLinkEventToProject', () => {
    it('links an event to project successfully', async () => {
      projectsApi.linkEvent.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkEventToProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', eventId: 'event456' });
      });

      expect(projectsApi.linkEvent).toHaveBeenCalledWith('proj123', 'event456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnlinkEventFromProject mutation
  describe('useUnlinkEventFromProject', () => {
    it('unlinks an event from project successfully', async () => {
      projectsApi.unlinkEvent.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkEventFromProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj123', eventId: 'event456' });
      });

      expect(projectsApi.unlinkEvent).toHaveBeenCalledWith('proj123', 'event456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useAddProjectComment mutation
  describe('useAddProjectComment', () => {
    it('adds a comment successfully', async () => {
      projectsApi.addComment.mockResolvedValueOnce({
        data: { comment: { _id: 'comment123', text: 'Test comment' } },
      });

      const { result } = renderHook(() => useAddProjectComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: '123', text: 'Test comment' });
      });

      expect(projectsApi.addComment).toHaveBeenCalledWith('123', 'Test comment');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUpdateProjectComment mutation
  describe('useUpdateProjectComment', () => {
    it('updates a comment successfully', async () => {
      projectsApi.updateComment.mockResolvedValueOnce({
        data: { comment: { _id: 'comment123', text: 'Updated comment' } },
      });

      const { result } = renderHook(() => useUpdateProjectComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: '123',
          commentId: 'comment123',
          text: 'Updated comment',
        });
      });

      expect(projectsApi.updateComment).toHaveBeenCalledWith('123', 'comment123', 'Updated comment');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useDeleteProjectComment mutation
  describe('useDeleteProjectComment', () => {
    it('deletes a comment successfully', async () => {
      projectsApi.deleteComment.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteProjectComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ projectId: '123', commentId: 'comment123' });
      });

      expect(projectsApi.deleteComment).toHaveBeenCalledWith('123', 'comment123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
