/**
 * =============================================================================
 * EVENTSWIDGET.TEST.JSX - Tests for Events Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import EventsWidget from './EventsWidget';

describe('EventsWidget', () => {
  let originalDate;

  beforeEach(() => {
    originalDate = global.Date;
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
    it('renders widget title', () => {
      render(<EventsWidget />);
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(<EventsWidget title="Custom Events Title" />);
      expect(screen.getByText('Custom Events Title')).toBeInTheDocument();
    });

    it('renders calendar link in footer', () => {
      render(<EventsWidget events={[{ _id: '1', title: 'Event', startDate: '2024-01-25T10:00:00' }]} />);
      const link = screen.getByRole('link', { name: /open calendar/i });
      expect(link).toHaveAttribute('href', '/app/calendar');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { container } = render(<EventsWidget isLoading={true} />);
      expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    });

    it('shows title during loading', () => {
      render(<EventsWidget isLoading={true} />);
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no events', () => {
      render(<EventsWidget events={[]} />);

      expect(screen.getByText('No events')).toBeInTheDocument();
      expect(screen.getByText('No events scheduled for today.')).toBeInTheDocument();
    });
  });

  describe('Events Display', () => {
    it('displays event titles', () => {
      mockDate('2024-01-25T10:00:00');

      const events = [
        { _id: '1', title: 'Team Meeting', startDate: '2024-01-25T14:00:00' },
        { _id: '2', title: 'Standup', startDate: '2024-01-25T09:00:00' }
      ];

      render(<EventsWidget events={events} />);

      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.getByText('Standup')).toBeInTheDocument();
    });

    it('displays event times', () => {
      mockDate('2024-01-25T10:00:00');

      const events = [
        { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:30:00' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('displays "All day" for all-day events', () => {
      const events = [
        { _id: '1', title: 'Holiday', startDate: '2024-01-25T00:00:00', allDay: true }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('All day')).toBeInTheDocument();
    });

    it('displays event count badge', () => {
      const events = [
        { _id: '1', title: 'Event 1', startDate: '2024-01-25T10:00:00' },
        { _id: '2', title: 'Event 2', startDate: '2024-01-25T11:00:00' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('limits displayed events to 5', () => {
      const events = Array.from({ length: 7 }, (_, i) => ({
        _id: String(i + 1),
        title: `Event ${i + 1}`,
        startDate: `2024-01-25T${10 + i}:00:00`
      }));

      render(<EventsWidget events={events} />);

      expect(screen.getByText('Event 1')).toBeInTheDocument();
      expect(screen.getByText('Event 5')).toBeInTheDocument();
      expect(screen.queryByText('Event 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Event 7')).not.toBeInTheDocument();
    });
  });

  describe('Event Details', () => {
    it('displays event location when provided', () => {
      const events = [
        { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:00:00', location: 'Room 101' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('Room 101')).toBeInTheDocument();
    });

    it('displays event color indicator', () => {
      const events = [
        { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:00:00', color: '#ff0000' }
      ];

      const { container } = render(<EventsWidget events={events} />);

      const colorIndicator = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]');
      expect(colorIndicator).toBeInTheDocument();
    });

    it('applies default color sequence when no color provided', () => {
      const events = [
        { _id: '1', title: 'Meeting 1', startDate: '2024-01-25T10:00:00' },
        { _id: '2', title: 'Meeting 2', startDate: '2024-01-25T11:00:00' }
      ];

      const { container } = render(<EventsWidget events={events} />);

      // Should have color indicators
      const colorIndicators = container.querySelectorAll('[style*="background-color"]');
      expect(colorIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Event Happening Now', () => {
    it('shows "NOW" badge for events in progress', () => {
      mockDate('2024-01-25T14:30:00');

      const events = [
        {
          _id: '1',
          title: 'Current Meeting',
          startDate: '2024-01-25T14:00:00',
          endDate: '2024-01-25T15:00:00'
        }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('NOW')).toBeInTheDocument();
    });

    it('applies ring styling to current event', () => {
      mockDate('2024-01-25T14:30:00');

      const events = [
        {
          _id: '1',
          title: 'Current Meeting',
          startDate: '2024-01-25T14:00:00',
          endDate: '2024-01-25T15:00:00'
        }
      ];

      const { container } = render(<EventsWidget events={events} />);
      expect(container.querySelector('.ring-2')).toBeInTheDocument();
    });
  });

  describe('Time Until Event', () => {
    it('shows time until event starting soon', () => {
      mockDate('2024-01-25T09:45:00');

      const events = [
        { _id: '1', title: 'Meeting', startDate: '2024-01-25T10:00:00' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('in 15m')).toBeInTheDocument();
    });

    it('shows "in 1h" for events starting in about an hour', () => {
      mockDate('2024-01-25T09:00:00');

      const events = [
        { _id: '1', title: 'Meeting', startDate: '2024-01-25T10:30:00' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('in 1h')).toBeInTheDocument();
    });

    it('does not show time until for past events', () => {
      mockDate('2024-01-25T12:00:00');

      const events = [
        { _id: '1', title: 'Morning Meeting', startDate: '2024-01-25T09:00:00' }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.queryByText(/in \d+m/)).not.toBeInTheDocument();
    });
  });

  describe('Event Click Handler', () => {
    it('calls onEventClick when event is clicked', async () => {
      const user = userEvent.setup();
      const onEventClick = vi.fn();

      const event = { _id: '1', title: 'Clickable Event', startDate: '2024-01-25T14:00:00' };

      render(<EventsWidget events={[event]} onEventClick={onEventClick} />);

      await user.click(screen.getByText('Clickable Event'));
      expect(onEventClick).toHaveBeenCalledWith(event);
    });
  });

  describe('Recurring Events', () => {
    it('handles recurring event instances with originalEventId', () => {
      const events = [
        {
          originalEventId: 'recurring-1',
          title: 'Daily Standup',
          startDate: '2024-01-25T09:00:00'
        }
      ];

      render(<EventsWidget events={events} />);
      expect(screen.getByText('Daily Standup')).toBeInTheDocument();
    });
  });
});
