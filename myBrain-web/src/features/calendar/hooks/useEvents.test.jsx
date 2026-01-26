import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEvents,
  useEvent,
  useUpcomingEvents,
  useDayEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useLinkTaskToEvent,
  useUnlinkTaskFromEvent,
  useLinkNoteToEvent,
  useUnlinkNoteFromEvent,
} from './useEvents';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  eventsApi: {
    getEvents: vi.fn(),
    getEvent: vi.fn(),
    getUpcoming: vi.fn(),
    getDayEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    linkTask: vi.fn(),
    unlinkTask: vi.fn(),
    linkNote: vi.fn(),
    unlinkNote: vi.fn(),
  },
}));

// Import the mocked API
import { eventsApi } from '../../../lib/api';

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

describe('useEvents hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useEvents hook
  describe('useEvents', () => {
    it('fetches events successfully when date range is provided', async () => {
      const mockEvents = {
        events: [
          { _id: '1', title: 'Event 1', startDate: '2024-01-15' },
          { _id: '2', title: 'Event 2', startDate: '2024-01-16' },
        ],
      };
      eventsApi.getEvents.mockResolvedValueOnce({ data: mockEvents });

      const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const { result } = renderHook(() => useEvents(params), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockEvents);
      expect(eventsApi.getEvents).toHaveBeenCalledWith(params);
    });

    it('does not fetch when startDate or endDate is missing', async () => {
      const { result } = renderHook(() => useEvents({ startDate: '2024-01-01' }), {
        wrapper: createWrapper(),
      });

      // Query should be disabled (idle) when dates are not provided
      expect(result.current.fetchStatus).toBe('idle');
      expect(eventsApi.getEvents).not.toHaveBeenCalled();
    });

    it('does not fetch when params are empty', async () => {
      const { result } = renderHook(() => useEvents({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(eventsApi.getEvents).not.toHaveBeenCalled();
    });

    it('handles error when fetching events fails', async () => {
      const error = new Error('Failed to fetch events');
      eventsApi.getEvents.mockRejectedValueOnce(error);

      const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const { result } = renderHook(() => useEvents(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch events');
    });
  });

  // Test useEvent hook
  describe('useEvent', () => {
    it('fetches a single event successfully', async () => {
      const mockEvent = { _id: '123', title: 'Test Event', startDate: '2024-01-15' };
      eventsApi.getEvent.mockResolvedValueOnce({ data: mockEvent });

      const { result } = renderHook(() => useEvent('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockEvent);
      expect(eventsApi.getEvent).toHaveBeenCalledWith('123');
    });

    it('does not fetch when id is not provided', async () => {
      const { result } = renderHook(() => useEvent(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(eventsApi.getEvent).not.toHaveBeenCalled();
    });

    it('handles error when fetching event fails', async () => {
      eventsApi.getEvent.mockRejectedValueOnce(new Error('Event not found'));

      const { result } = renderHook(() => useEvent('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpcomingEvents hook
  describe('useUpcomingEvents', () => {
    it('fetches upcoming events with default days', async () => {
      const mockEvents = {
        events: [{ _id: '1', title: 'Upcoming Event' }],
      };
      eventsApi.getUpcoming.mockResolvedValueOnce({ data: mockEvents });

      const { result } = renderHook(() => useUpcomingEvents(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockEvents);
      expect(eventsApi.getUpcoming).toHaveBeenCalledWith(7);
    });

    it('fetches upcoming events with custom days', async () => {
      eventsApi.getUpcoming.mockResolvedValueOnce({ data: { events: [] } });

      renderHook(() => useUpcomingEvents(14), { wrapper: createWrapper() });

      await waitFor(() => expect(eventsApi.getUpcoming).toHaveBeenCalledWith(14));
    });

    it('handles error when fetching upcoming events fails', async () => {
      eventsApi.getUpcoming.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useUpcomingEvents(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDayEvents hook
  describe('useDayEvents', () => {
    it('fetches events for a specific day successfully', async () => {
      const mockEvents = {
        events: [
          { _id: '1', title: 'Morning Meeting' },
          { _id: '2', title: 'Afternoon Call' },
        ],
      };
      eventsApi.getDayEvents.mockResolvedValueOnce({ data: mockEvents });

      const { result } = renderHook(() => useDayEvents('2024-01-15'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockEvents);
      expect(eventsApi.getDayEvents).toHaveBeenCalledWith('2024-01-15');
    });

    it('does not fetch when date is not provided', async () => {
      const { result } = renderHook(() => useDayEvents(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(eventsApi.getDayEvents).not.toHaveBeenCalled();
    });

    it('handles error when fetching day events fails', async () => {
      eventsApi.getDayEvents.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useDayEvents('2024-01-15'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCreateEvent mutation
  describe('useCreateEvent', () => {
    it('creates an event successfully', async () => {
      const newEvent = {
        title: 'New Event',
        startDate: '2024-01-20',
        endDate: '2024-01-20',
      };
      const createdEvent = { _id: '123', ...newEvent };
      eventsApi.createEvent.mockResolvedValueOnce({ data: { event: createdEvent } });

      const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(newEvent);
      });

      expect(eventsApi.createEvent).toHaveBeenCalledWith(newEvent);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating event fails', async () => {
      eventsApi.createEvent.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ title: 'Bad Event' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateEvent mutation
  describe('useUpdateEvent', () => {
    it('updates an event successfully', async () => {
      const updateData = { title: 'Updated Event Title' };
      eventsApi.updateEvent.mockResolvedValueOnce({
        data: { event: { _id: '123', ...updateData } },
      });

      const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: updateData });
      });

      expect(eventsApi.updateEvent).toHaveBeenCalledWith('123', updateData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating event fails', async () => {
      eventsApi.updateEvent.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() });

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

  // Test useDeleteEvent mutation
  describe('useDeleteEvent', () => {
    it('deletes an event successfully', async () => {
      eventsApi.deleteEvent.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(eventsApi.deleteEvent).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting event fails', async () => {
      eventsApi.deleteEvent.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteEvent(), { wrapper: createWrapper() });

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

  // Test useLinkTaskToEvent mutation
  describe('useLinkTaskToEvent', () => {
    it('links a task to event successfully', async () => {
      eventsApi.linkTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkTaskToEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ eventId: 'event123', taskId: 'task456' });
      });

      expect(eventsApi.linkTask).toHaveBeenCalledWith('event123', 'task456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when linking task fails', async () => {
      eventsApi.linkTask.mockRejectedValueOnce(new Error('Link failed'));

      const { result } = renderHook(() => useLinkTaskToEvent(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ eventId: 'event123', taskId: 'task456' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnlinkTaskFromEvent mutation
  describe('useUnlinkTaskFromEvent', () => {
    it('unlinks a task from event successfully', async () => {
      eventsApi.unlinkTask.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkTaskFromEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ eventId: 'event123', taskId: 'task456' });
      });

      expect(eventsApi.unlinkTask).toHaveBeenCalledWith('event123', 'task456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when unlinking task fails', async () => {
      eventsApi.unlinkTask.mockRejectedValueOnce(new Error('Unlink failed'));

      const { result } = renderHook(() => useUnlinkTaskFromEvent(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ eventId: 'event123', taskId: 'task456' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useLinkNoteToEvent mutation
  describe('useLinkNoteToEvent', () => {
    it('links a note to event successfully', async () => {
      eventsApi.linkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkNoteToEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ eventId: 'event123', noteId: 'note456' });
      });

      expect(eventsApi.linkNote).toHaveBeenCalledWith('event123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when linking note fails', async () => {
      eventsApi.linkNote.mockRejectedValueOnce(new Error('Link failed'));

      const { result } = renderHook(() => useLinkNoteToEvent(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ eventId: 'event123', noteId: 'note456' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnlinkNoteFromEvent mutation
  describe('useUnlinkNoteFromEvent', () => {
    it('unlinks a note from event successfully', async () => {
      eventsApi.unlinkNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkNoteFromEvent(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ eventId: 'event123', noteId: 'note456' });
      });

      expect(eventsApi.unlinkNote).toHaveBeenCalledWith('event123', 'note456');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when unlinking note fails', async () => {
      eventsApi.unlinkNote.mockRejectedValueOnce(new Error('Unlink failed'));

      const { result } = renderHook(() => useUnlinkNoteFromEvent(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ eventId: 'event123', noteId: 'note456' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
