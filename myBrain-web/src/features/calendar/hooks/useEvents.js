import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../../lib/api';

export function useEvents(params = {}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.getEvents(params).then(res => res.data),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useEvent(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getEvent(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useUpcomingEvents(days = 7) {
  return useQuery({
    queryKey: ['events', 'upcoming', days],
    queryFn: () => eventsApi.getUpcoming(days).then(res => res.data),
  });
}

export function useDayEvents(date) {
  return useQuery({
    queryKey: ['events', 'day', date],
    queryFn: () => eventsApi.getDayEvents(date).then(res => res.data),
    enabled: !!date,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => eventsApi.createEvent(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => eventsApi.updateEvent(id, data).then(res => res.data),
    onSuccess: (data, variables) => {
      // Invalidate all event-related queries to ensure calendar updates
      queryClient.invalidateQueries({ queryKey: ['events'], refetchType: 'all' });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => eventsApi.deleteEvent(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useLinkTaskToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, taskId }) => eventsApi.linkTask(eventId, taskId).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUnlinkTaskFromEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, taskId }) => eventsApi.unlinkTask(eventId, taskId).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useLinkNoteToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, noteId }) => eventsApi.linkNote(eventId, noteId).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUnlinkNoteFromEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, noteId }) => eventsApi.unlinkNote(eventId, noteId).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
