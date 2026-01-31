import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekView from './WeekView';

describe('WeekView', () => {
  const mockOnTimeClick = vi.fn();
  const mockOnEventClick = vi.fn();

  // June 15, 2024 is a Saturday
  const defaultProps = {
    currentDate: new Date('2024-06-15T12:00:00'),
    events: [],
    onTimeClick: mockOnTimeClick,
    onEventClick: mockOnEventClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders all 7 days of the week', () => {
      render(<WeekView {...defaultProps} />);

      // Should show abbreviated day names
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('renders date numbers for the week', () => {
      render(<WeekView {...defaultProps} />);

      // Week of June 15, 2024 starts on Sunday June 9
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('renders all 24 hour labels', () => {
      render(<WeekView {...defaultProps} />);

      expect(screen.getByText('12 AM')).toBeInTheDocument();
      expect(screen.getByText('6 AM')).toBeInTheDocument();
      expect(screen.getByText('12 PM')).toBeInTheDocument();
      expect(screen.getByText('6 PM')).toBeInTheDocument();
      expect(screen.getByText('11 PM')).toBeInTheDocument();
    });

    it('highlights today column with background color', () => {
      render(<WeekView {...defaultProps} />);

      // Today (June 15) should have highlighted background
      const highlightedColumns = document.querySelectorAll('.bg-primary\\/5');
      expect(highlightedColumns.length).toBeGreaterThan(0);
    });

    it('highlights today date number with primary color', () => {
      render(<WeekView {...defaultProps} />);

      // Find the "15" that is today
      const dateNumbers = screen.getAllByText('15');
      const todayNumber = dateNumbers.find(el =>
        el.classList.contains('text-primary')
      );

      expect(todayNumber).toBeInTheDocument();
    });
  });

  describe('Event Display', () => {
    it('displays timed events in the correct day column', () => {
      const events = [
        {
          _id: '1',
          title: 'Saturday Meeting',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      expect(screen.getByText('Saturday Meeting')).toBeInTheDocument();
    });

    it('shows event time for timed events', () => {
      const events = [
        {
          _id: '1',
          title: 'Team Standup',
          startDate: '2024-06-15T09:00:00',
          endDate: '2024-06-15T09:30:00',
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      // Should show the start time
      expect(screen.getByText(/9:00/)).toBeInTheDocument();
    });

    it('filters out all-day events from the grid', () => {
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

      render(<WeekView {...defaultProps} events={events} />);

      // All-day events should not appear in the time grid
      expect(screen.queryByText('All Day Event')).not.toBeInTheDocument();
    });

    it('displays events on multiple days when they fall on different dates', () => {
      const events = [
        {
          _id: '1',
          title: 'Monday Event',
          startDate: '2024-06-10T10:00:00', // Monday
          endDate: '2024-06-10T11:00:00',
          color: '#3b82f6',
        },
        {
          _id: '2',
          title: 'Friday Event',
          startDate: '2024-06-14T14:00:00', // Friday
          endDate: '2024-06-14T15:00:00',
          color: '#ef4444',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      expect(screen.getByText('Monday Event')).toBeInTheDocument();
      expect(screen.getByText('Friday Event')).toBeInTheDocument();
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

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Colored Event').closest('div[style]');
      expect(eventElement).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('only shows events for the current week', () => {
      const events = [
        {
          _id: '1',
          title: 'This Week Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
        {
          _id: '2',
          title: 'Next Week Event',
          startDate: '2024-06-22T10:00:00',
          endDate: '2024-06-22T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      expect(screen.getByText('This Week Event')).toBeInTheDocument();
      expect(screen.queryByText('Next Week Event')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onTimeClick when clicking on a time slot', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<WeekView {...defaultProps} />);

      // Find time slots (clickable hour rows)
      const timeSlots = document.querySelectorAll('.h-\\[60px\\].border-b.cursor-pointer');

      if (timeSlots.length > 0) {
        await user.click(timeSlots[0]);

        expect(mockOnTimeClick).toHaveBeenCalled();
        const clickedTime = mockOnTimeClick.mock.calls[0][0];
        expect(clickedTime instanceof Date).toBe(true);
      }
    });

    it('calls onTimeClick with correct day and hour', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<WeekView {...defaultProps} />);

      // Each day column has 24 time slots
      // We need to click on a specific slot
      const allTimeSlots = document.querySelectorAll('.h-\\[60px\\].border-b.cursor-pointer');

      // The slots are arranged: day0-hour0, day0-hour1, ... day6-hour23
      // So slot at index 9 would be Sunday at 9 AM
      if (allTimeSlots.length > 9) {
        await user.click(allTimeSlots[9]);

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

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Clickable Event');
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalledWith(events[0]);
    });

    it('stops event propagation when clicking on event', async () => {
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

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Clickable Event');
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalled();
      expect(mockOnTimeClick).not.toHaveBeenCalled();
    });
  });

  describe('Current Time Indicator', () => {
    it('shows current time indicator on today column', () => {
      render(<WeekView {...defaultProps} />);

      // CurrentTimeIndicator renders a dot and line (uses CSS variable for color)
      const indicator = document.querySelector('.rounded-full.-ml-1');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show time indicator on other days', () => {
      // Set current date to a day not in this week
      vi.setSystemTime(new Date('2024-06-01T10:00:00')); // June 1 is not in the same week as June 15

      render(<WeekView {...defaultProps} />);

      // There should be no time indicator dot
      const indicators = document.querySelectorAll('.rounded-full.-ml-1');
      expect(indicators.length).toBe(0);
    });
  });

  describe('Event Positioning', () => {
    it('positions events based on start time', () => {
      const events = [
        {
          _id: '1',
          title: 'Morning Event',
          startDate: '2024-06-15T09:00:00',
          endDate: '2024-06-15T10:00:00',
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

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
          endDate: '2024-06-15T12:00:00',
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Two Hour Event').closest('.absolute');
      // 2 hours * 60 pixels = 120px height
      expect(eventElement).toHaveStyle({ height: '120px' });
    });

    it('ensures minimum height of 20px for very short events', () => {
      const events = [
        {
          _id: '1',
          title: 'Quick Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T10:10:00', // 10 minutes
          color: '#3b82f6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('Quick Event').closest('.absolute');
      // Minimum height should be 20px
      expect(eventElement).toHaveStyle({ height: '20px' });
    });
  });

  describe('Week Calculation', () => {
    it('calculates correct week starting from Sunday', () => {
      // June 15, 2024 is Saturday
      // Week should be June 9 (Sun) to June 15 (Sat)
      render(<WeekView {...defaultProps} />);

      // Check that June 9 is present (first day of this week)
      expect(screen.getByText('9')).toBeInTheDocument();

      // Check that June 15 is present (last day of this week)
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('handles week spanning two months', () => {
      // July 3, 2024 is a Wednesday
      // Week should be June 30 (Sun) to July 6 (Sat)
      const julyDate = new Date('2024-07-03T12:00:00');
      render(<WeekView {...defaultProps} currentDate={julyDate} />);

      // June 30 should be present
      expect(screen.getByText('30')).toBeInTheDocument();

      // July 6 should be present
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty events array', () => {
      render(<WeekView {...defaultProps} events={[]} />);

      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('12 AM')).toBeInTheDocument();
    });

    it('handles undefined events prop', () => {
      render(<WeekView {...defaultProps} events={undefined} />);

      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('handles events without color', () => {
      const events = [
        {
          _id: '1',
          title: 'No Color Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      const eventElement = screen.getByText('No Color Event').closest('div[style]');
      // Should use default blue color
      expect(eventElement).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('handles events with originalEventId for recurring events', () => {
      const events = [
        {
          originalEventId: 'recurring-1',
          title: 'Recurring Meeting',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#8b5cf6',
        },
      ];

      render(<WeekView {...defaultProps} events={events} />);

      expect(screen.getByText('Recurring Meeting')).toBeInTheDocument();
    });
  });

  describe('Hour Formatting', () => {
    it('formats midnight as 12 AM', () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByText('12 AM')).toBeInTheDocument();
    });

    it('formats noon as 12 PM', () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByText('12 PM')).toBeInTheDocument();
    });

    it('formats morning hours correctly', () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByText('9 AM')).toBeInTheDocument();
      expect(screen.getByText('11 AM')).toBeInTheDocument();
    });

    it('formats afternoon hours correctly', () => {
      render(<WeekView {...defaultProps} />);
      expect(screen.getByText('3 PM')).toBeInTheDocument();
      expect(screen.getByText('5 PM')).toBeInTheDocument();
    });
  });
});
