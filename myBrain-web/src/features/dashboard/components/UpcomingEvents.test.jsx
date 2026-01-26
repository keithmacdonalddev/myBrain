/**
 * =============================================================================
 * UPCOMINGEVENTS.TEST.JSX - Tests for Upcoming Events Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UpcomingEvents from './UpcomingEvents';

// Mock the hooks
vi.mock('../../calendar/hooks/useEvents', () => ({
  useUpcomingEvents: vi.fn(),
  useCreateEvent: vi.fn()
}));

// Mock EventModal
vi.mock('../../calendar/components/EventModal', () => ({
  default: vi.fn(({ event, onClose }) => (
    event !== undefined ? (
      <div data-testid="event-modal">
        <span>{event ? `Editing: ${event.title}` : 'New Event'}</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ))
}));

import { useUpcomingEvents, useCreateEvent } from '../../calendar/hooks/useEvents';

describe('UpcomingEvents', () => {
  let originalDate;

  beforeEach(() => {
    vi.clearAllMocks();
    originalDate = global.Date;

    // Default mock
    useUpcomingEvents.mockReturnValue({
      data: { events: [] },
      isLoading: false
    });

    useCreateEvent.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    });
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  function mockDate(dateString) {
    const mockDateInstance = new originalDate(dateString);
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDateInstance;
        }
        return new originalDate(...args);
      }
      static now() {
        return mockDateInstance.getTime();
      }
    };
  }

  describe('Basic Rendering', () => {
    it('renders component title', () => {
      render(<UpcomingEvents />);
      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    });

    it('renders add event button', () => {
      render(<UpcomingEvents />);
      expect(screen.getByTitle('New event')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      useUpcomingEvents.mockReturnValue({
        data: null,
        isLoading: true
      });

      const { container } = render(<UpcomingEvents />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no events', () => {
      useUpcomingEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
      expect(screen.getByText('Create an event')).toBeInTheDocument();
    });

    it('opens event modal when clicking create button in empty state', async () => {
      const user = userEvent.setup();

      useUpcomingEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      render(<UpcomingEvents />);

      await user.click(screen.getByText('Create an event'));
      expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      expect(screen.getByText('New Event')).toBeInTheDocument();
    });
  });

  describe('Events Display', () => {
    it('displays events grouped by date', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Team Meeting', startDate: '2024-01-25T14:00:00' },
            { _id: '2', title: 'Standup', startDate: '2024-01-26T09:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Standup')).toBeInTheDocument();
    });

    it('shows event time', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:30:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      // Time format varies by locale (2:30 PM or 14:30)
      expect(screen.getByText(/2:30|14:30/)).toBeInTheDocument();
    });

    it('shows "All day" for all-day events', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Holiday', startDate: '2024-01-25T00:00:00', allDay: true }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('All day')).toBeInTheDocument();
    });

    it('shows location when provided', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:00:00', location: 'Room 101' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('Room 101')).toBeInTheDocument();
    });

    it('shows video indicator for events with meeting URL', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Video Call', startDate: '2024-01-25T14:00:00', meetingUrl: 'https://meet.example.com' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('Video')).toBeInTheDocument();
    });

    it('displays event color indicator', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:00:00', color: '#ff0000' }
          ]
        },
        isLoading: false
      });

      const { container } = render(<UpcomingEvents />);

      const colorIndicator = container.querySelector('[style*="background-color"]');
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  describe('Event Grouping', () => {
    it('groups multiple events on same day', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Morning Meeting', startDate: '2024-01-25T09:00:00' },
            { _id: '2', title: 'Lunch', startDate: '2024-01-25T12:00:00' },
            { _id: '3', title: 'Review', startDate: '2024-01-25T15:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      // All events should be under "Today"
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('shows "+X more" when more than 3 events on same day', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Event 1', startDate: '2024-01-25T09:00:00' },
            { _id: '2', title: 'Event 2', startDate: '2024-01-25T10:00:00' },
            { _id: '3', title: 'Event 3', startDate: '2024-01-25T11:00:00' },
            { _id: '4', title: 'Event 4', startDate: '2024-01-25T12:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('shows "+X more days with events" when more than 3 days', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Event 1', startDate: '2024-01-25T09:00:00' },
            { _id: '2', title: 'Event 2', startDate: '2024-01-26T10:00:00' },
            { _id: '3', title: 'Event 3', startDate: '2024-01-27T11:00:00' },
            { _id: '4', title: 'Event 4', startDate: '2024-01-28T12:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.getByText('+1 more days with events')).toBeInTheDocument();
    });
  });

  describe('Event Modal', () => {
    it('opens modal when clicking add button', async () => {
      const user = userEvent.setup();

      render(<UpcomingEvents />);

      await user.click(screen.getByTitle('New event'));
      expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      expect(screen.getByText('New Event')).toBeInTheDocument();
    });

    it('opens modal with event data when clicking event', async () => {
      const user = userEvent.setup();
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Team Meeting', startDate: '2024-01-25T14:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      await user.click(screen.getByText('Team Meeting'));
      expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      expect(screen.getByText('Editing: Team Meeting')).toBeInTheDocument();
    });

    it('closes modal when close is triggered', async () => {
      const user = userEvent.setup();

      render(<UpcomingEvents />);

      await user.click(screen.getByTitle('New event'));
      expect(screen.getByTestId('event-modal')).toBeInTheDocument();

      await user.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument();
    });
  });

  describe('Footer Link', () => {
    it('shows calendar link when events exist', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Event', startDate: '2024-01-25T14:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      const link = screen.getByRole('link', { name: /view calendar/i });
      expect(link).toHaveAttribute('href', '/app/calendar');
    });

    it('hides calendar link when no events', () => {
      useUpcomingEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      render(<UpcomingEvents />);

      expect(screen.queryByRole('link', { name: /view calendar/i })).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats future dates correctly', () => {
      mockDate('2024-01-25T10:00:00');

      useUpcomingEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', title: 'Event', startDate: '2024-01-30T14:00:00' }
          ]
        },
        isLoading: false
      });

      render(<UpcomingEvents />);

      // Should show formatted date like "Tue, Jan 30"
      expect(screen.getByText(/jan/i)).toBeInTheDocument();
    });
  });
});
