import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayView from './DayView';

describe('DayView', () => {
  const mockOnTimeClick = vi.fn();
  const mockOnEventClick = vi.fn();

  const defaultProps = {
    currentDate: new Date('2024-06-15T12:00:00'),
    events: [],
    onTimeClick: mockOnTimeClick,
    onEventClick: mockOnEventClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the current date for "today" checks
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders the day view with correct date', () => {
      render(<DayView {...defaultProps} />);

      // Should show the day of month
      expect(screen.getByText('15')).toBeInTheDocument();
      // Should show the weekday
      expect(screen.getByText('Saturday')).toBeInTheDocument();
      // Should show month and year
      expect(screen.getByText('June 2024')).toBeInTheDocument();
    });

    it('renders all 24 hour labels', () => {
      render(<DayView {...defaultProps} />);

      // Check for AM hours
      expect(screen.getByText('12 AM')).toBeInTheDocument();
      expect(screen.getByText('1 AM')).toBeInTheDocument();
      expect(screen.getByText('9 AM')).toBeInTheDocument();

      // Check for PM hours
      expect(screen.getByText('12 PM')).toBeInTheDocument();
      expect(screen.getByText('1 PM')).toBeInTheDocument();
      expect(screen.getByText('11 PM')).toBeInTheDocument();
    });

    it('highlights today with primary color', () => {
      // currentDate matches the mocked system time, so it should be "today"
      render(<DayView {...defaultProps} />);

      const dateNumber = screen.getByText('15');
      expect(dateNumber).toHaveClass('text-primary');
    });

    it('does not highlight non-today dates', () => {
      const differentDate = new Date('2024-06-20T12:00:00');
      render(<DayView {...defaultProps} currentDate={differentDate} />);

      const dateNumber = screen.getByText('20');
      expect(dateNumber).not.toHaveClass('text-primary');
      expect(dateNumber).toHaveClass('text-text');
    });
  });

  describe('Event Display', () => {
    it('displays timed events in the grid', () => {
      const events = [
        {
          _id: '1',
          title: 'Morning Meeting',
          startDate: '2024-06-15T09:00:00',
          endDate: '2024-06-15T10:00:00',
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    });

    it('displays all-day events in separate section', () => {
      const events = [
        {
          _id: '1',
          title: 'Company Holiday',
          startDate: '2024-06-15T00:00:00',
          endDate: '2024-06-15T23:59:59',
          allDay: true,
          color: '#10b981',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      expect(screen.getByText('All day')).toBeInTheDocument();
      expect(screen.getByText('Company Holiday')).toBeInTheDocument();
    });

    it('shows event time range for timed events', () => {
      const events = [
        {
          _id: '1',
          title: 'Lunch Meeting',
          startDate: '2024-06-15T12:00:00',
          endDate: '2024-06-15T13:30:00',
          color: '#f59e0b',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      // Should show start and end times
      expect(screen.getByText(/12:00/)).toBeInTheDocument();
      expect(screen.getByText(/1:30/)).toBeInTheDocument();
    });

    it('displays event location when provided', () => {
      const events = [
        {
          _id: '1',
          title: 'Office Meeting',
          startDate: '2024-06-15T14:00:00',
          endDate: '2024-06-15T15:00:00',
          location: 'Conference Room A',
          color: '#8b5cf6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('filters events to only show those on the current date', () => {
      const events = [
        {
          _id: '1',
          title: 'Today Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
        {
          _id: '2',
          title: 'Tomorrow Event',
          startDate: '2024-06-16T10:00:00',
          endDate: '2024-06-16T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      expect(screen.getByText('Today Event')).toBeInTheDocument();
      expect(screen.queryByText('Tomorrow Event')).not.toBeInTheDocument();
    });

    it('applies event color to event blocks', () => {
      const events = [
        {
          _id: '1',
          title: 'Colored Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#ef4444',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Colored Event').closest('div[style]');
      expect(eventElement).toHaveStyle({ backgroundColor: '#ef4444' });
    });
  });

  describe('Interactions', () => {
    it('calls onTimeClick when clicking on a time slot', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<DayView {...defaultProps} />);

      // Find the time grid rows (they are clickable divs with hover effect)
      const timeSlots = document.querySelectorAll('.h-\\[60px\\].border-b.hover\\:bg-bg\\/50');

      if (timeSlots.length > 0) {
        await user.click(timeSlots[9]); // Click on 9 AM slot

        expect(mockOnTimeClick).toHaveBeenCalled();
        const clickedTime = mockOnTimeClick.mock.calls[0][0];
        expect(clickedTime.getHours()).toBe(9);
      }
    });

    it('calls onEventClick when clicking on an event', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const events = [
        {
          _id: '1',
          title: 'Clickable Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Clickable Event');
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalledWith(events[0]);
    });

    it('calls onEventClick when clicking on an all-day event', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const events = [
        {
          _id: '1',
          title: 'All Day Event',
          startDate: '2024-06-15T00:00:00',
          endDate: '2024-06-15T23:59:59',
          allDay: true,
          color: '#10b981',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('All Day Event');
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalledWith(events[0]);
    });

    it('stops event propagation when clicking on event (does not trigger time click)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const events = [
        {
          _id: '1',
          title: 'Clickable Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Clickable Event');
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalled();
      expect(mockOnTimeClick).not.toHaveBeenCalled();
    });
  });

  describe('Current Time Indicator', () => {
    it('shows current time indicator when viewing today', () => {
      render(<DayView {...defaultProps} />);

      // CurrentTimeIndicator renders a red dot and line
      const redDot = document.querySelector('.bg-red-500.rounded-full');
      expect(redDot).toBeInTheDocument();
    });

    it('does not show current time indicator for non-today dates', () => {
      const differentDate = new Date('2024-06-20T12:00:00');
      render(<DayView {...defaultProps} currentDate={differentDate} />);

      // There should be no red dot for the time indicator
      const redDots = document.querySelectorAll('.bg-red-500.rounded-full');
      expect(redDots.length).toBe(0);
    });
  });

  describe('Event Positioning', () => {
    it('positions events based on start time', () => {
      const events = [
        {
          _id: '1',
          title: 'Morning Event',
          startDate: '2024-06-15T09:00:00', // 9 AM
          endDate: '2024-06-15T10:00:00',
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Morning Event').closest('.absolute');
      // 9 hours * 60 pixels = 540px from top
      expect(eventElement).toHaveStyle({ top: '540px' });
    });

    it('sets event height based on duration', () => {
      const events = [
        {
          _id: '1',
          title: 'Two Hour Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T12:00:00', // 2 hours
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Two Hour Event').closest('.absolute');
      // 2 hours * 60 pixels = 120px height
      expect(eventElement).toHaveStyle({ height: '120px' });
    });

    it('ensures minimum height for short events', () => {
      const events = [
        {
          _id: '1',
          title: 'Quick Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T10:15:00', // 15 minutes
          color: '#3b82f6',
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Quick Event').closest('.absolute');
      // Minimum height should be 30px
      expect(eventElement).toHaveStyle({ height: '30px' });
    });
  });

  describe('Handles Edge Cases', () => {
    it('handles empty events array gracefully', () => {
      render(<DayView {...defaultProps} events={[]} />);

      // Should still render the time grid
      expect(screen.getByText('12 AM')).toBeInTheDocument();
    });

    it('handles undefined events prop gracefully', () => {
      render(<DayView {...defaultProps} events={undefined} />);

      // Should still render without errors
      expect(screen.getByText('12 AM')).toBeInTheDocument();
    });

    it('handles events without color gracefully', () => {
      const events = [
        {
          _id: '1',
          title: 'No Color Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          // No color specified
        },
      ];

      render(<DayView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('No Color Event').closest('div[style]');
      // Should use default blue color
      expect(eventElement).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });
});
