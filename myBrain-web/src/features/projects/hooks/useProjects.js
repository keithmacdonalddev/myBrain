import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../../lib/api';

// Query keys
export const projectKeys = {
  all: ['projects'],
  lists: () => [...projectKeys.all, 'list'],
  list: (filters) => [...projectKeys.lists(), filters],
  details: () => [...projectKeys.all, 'detail'],
  detail: (id) => [...projectKeys.details(), id],
  tags: () => [...projectKeys.all, 'tags'],
  upcoming: (days) => [...projectKeys.all, 'upcoming', days],
  overdue: () => [...projectKeys.all, 'overdue'],
};

/**
 * Hook to fetch projects with filters
 */
export function useProjects(filters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      const response = await projectsApi.getProjects(filters);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single project
 * @param {string} id - Project ID
 * @param {boolean} populateLinks - Whether to include full linked items (notes, tasks, events)
 */
export function useProject(id, populateLinks = false) {
  return useQuery({
    // Include populateLinks in key so different populations don't conflict
    queryKey: [...projectKeys.detail(id), { populateLinks }],
    queryFn: async () => {
      const response = await projectsApi.getProject(id, populateLinks);
      return response.data.project;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch upcoming projects
 */
export function useUpcomingProjects(days = 7) {
  return useQuery({
    queryKey: projectKeys.upcoming(days),
    queryFn: async () => {
      const response = await projectsApi.getUpcoming(days);
      return response.data.projects;
    },
  });
}

/**
 * Hook to fetch overdue projects
 */
export function useOverdueProjects() {
  return useQuery({
    queryKey: projectKeys.overdue(),
    queryFn: async () => {
      const response = await projectsApi.getOverdue();
      return response.data.projects;
    },
  });
}

/**
 * Hook to fetch project tags
 */
export function useProjectTags() {
  return useQuery({
    queryKey: projectKeys.tags(),
    queryFn: async () => {
      const response = await projectsApi.getProjectTags();
      return response.data.tags;
    },
  });
}

/**
 * Hook to create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.tags() });
      queryClient.invalidateQueries({ queryKey: projectKeys.upcoming() });
    },
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => projectsApi.updateProject(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.tags() });
      queryClient.invalidateQueries({ queryKey: projectKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: projectKeys.overdue() });
    },
  });
}

/**
 * Hook to update project status with optimistic updates
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => projectsApi.updateProjectStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) });

      const previousProject = queryClient.getQueryData(projectKeys.detail(id));

      if (previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), {
          ...previousProject,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
        });
      }

      return { previousProject };
    },
    onError: (err, { id }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject);
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: projectKeys.overdue() });
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: projectKeys.overdue() });
    },
  });
}

/**
 * Hook to favorite a project
 */
export function useFavoriteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => projectsApi.favoriteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Hook to unfavorite a project
 */
export function useUnfavoriteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => projectsApi.unfavoriteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Hook to link a note to a project
 */
export function useLinkNoteToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, noteId }) => projectsApi.linkNote(projectId, noteId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to unlink a note from a project
 */
export function useUnlinkNoteFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, noteId }) => projectsApi.unlinkNote(projectId, noteId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to link a task to a project
 */
export function useLinkTaskToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, taskId }) => projectsApi.linkTask(projectId, taskId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to unlink a task from a project
 */
export function useUnlinkTaskFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, taskId }) => projectsApi.unlinkTask(projectId, taskId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to link an event to a project
 */
export function useLinkEventToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, eventId }) => projectsApi.linkEvent(projectId, eventId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to unlink an event from a project
 */
export function useUnlinkEventFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, eventId }) => projectsApi.unlinkEvent(projectId, eventId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to add a comment to a project
 */
export function useAddProjectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, text }) => projectsApi.addComment(projectId, text),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to update a comment on a project
 */
export function useUpdateProjectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, commentId, text }) => projectsApi.updateComment(projectId, commentId, text),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Hook to delete a comment from a project
 */
export function useDeleteProjectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, commentId }) => projectsApi.deleteComment(projectId, commentId),
    onSuccess: (response, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// Shorter alias exports for convenience
export const useLinkNote = useLinkNoteToProject;
export const useUnlinkNote = useUnlinkNoteFromProject;
export const useLinkTask = useLinkTaskToProject;
export const useUnlinkTask = useUnlinkTaskFromProject;
export const useLinkEvent = useLinkEventToProject;
export const useUnlinkEvent = useUnlinkEventFromProject;
