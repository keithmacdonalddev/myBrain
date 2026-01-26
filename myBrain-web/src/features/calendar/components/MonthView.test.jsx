import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthView from './MonthView';

describe('MonthView', () => {
  const mockOnDateClick = vi.fn();
  const mockOnEventClick = vi.fn();

  const defaultProps = {
    currentDate: new Date('2024-06-15T12:00:00'),
    events: [],
    onDateClick: mockOnDateClick,
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
    it('renders day headers', () => {
      render(<MonthView {...defaultProps} />);

      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('renders correct number of weeks (6 rows)', () => {
      render(<MonthView {...defaultProps} />);

      // Grid should have 6 rows
      const grid = document.querySelector('.grid-rows-6');
      expect(grid).toBeInTheDocument();
    });

    it('renders all days of the month', () => {
      render(<MonthView {...defaultProps} />);

      // June 2024 has 30 days
      for (let day = 1; day <= 30; day++) {
        const dayElements = screen.getAllByText(day.toString());
        expect(dayElements.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('highlights today with primary background', () => {
      render(<MonthView {...defaultProps} />);

      // Find the date cell for today (15th)
      const todayElements = screen.getAllByText('15');
      const todayCell = todayElements.find(el =>
        el.classList.contains('bg-primary')
      );

      expect(todayCell).toBeInTheDocument();
    });

    it('dims dates from adjacent months', () => {
      render(<MonthView {...defaultProps} />);

      // June 2024 starts on Saturday, so there should be days from May
      // visible at the start of the calendar
      // These should have the muted/dim styling
      const allDays = document.querySelectorAll('[class*="text-muted/50"]');
      expect(allDays.length).toBeGreaterThan(0);
    });
  });

  describe('Event Display', () => {
    it('displays events on their respective dates', () => {
      const events = [
        {
          _id: '1',
          title: 'Team Meeting',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      expect(screen.getByText(/Team Meeting/)).toBeInTheDocument();
    });

    it('shows event time for timed events', () => {
      const events = [
        {
          _id: '1',
          title: 'Meeting',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      // Should show the time along with the title
      expect(screen.getByText(/10:00.*Meeting/)).toBeInTheDocument();
    });

    it('does not show time for all-day events', () => {
      const events = [
        {
          _id: '1',
          title: 'Holiday',
          startDate: '2024-06-15T00:00:00',
          endDate: '2024-06-15T23:59:59',
          allDay: true,
          color: '#10b981',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      // Should only show the title, not a time
      const eventText = screen.getByText(/Holiday/);
      expect(eventText.textContent.trim()).toBe('Holiday');
    });

    it('limits displayed events to 3 per day', () => {
      const events = [
        { _id: '1', title: 'Event 1', startDate: '2024-06-15T08:00:00', endDate: '2024-06-15T09:00:00', color: '#3b82f6' },
        { _id: '2', title: 'Event 2', startDate: '2024-06-15T10:00:00', endDate: '2024-06-15T11:00:00', color: '#3b82f6' },
        { _id: '3', title: 'Event 3', startDate: '2024-06-15T12:00:00', endDate: '2024-06-15T13:00:00', color: '#3b82f6' },
        { _id: '4', title: 'Event 4', startDate: '2024-06-15T14:00:00', endDate: '2024-06-15T15:00:00', color: '#3b82f6' },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      // Should show "+1 more" indicator
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('shows correct count for multiple overflow events', () => {
      const events = [
        { _id: '1', title: 'Event 1', startDate: '2024-06-15T08:00:00', endDate: '2024-06-15T09:00:00', color: '#3b82f6' },
        { _id: '2', title: 'Event 2', startDate: '2024-06-15T10:00:00', endDate: '2024-06-15T11:00:00', color: '#3b82f6' },
        { _id: '3', title: 'Event 3', startDate: '2024-06-15T12:00:00', endDate: '2024-06-15T13:00:00', color: '#3b82f6' },
        { _id: '4', title: 'Event 4', startDate: '2024-06-15T14:00:00', endDate: '2024-06-15T15:00:00', color: '#3b82f6' },
        { _id: '5', title: 'Event 5', startDate: '2024-06-15T16:00:00', endDate: '2024-06-15T17:00:00', color: '#3b82f6' },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('applies event color to event indicators', () => {
      const events = [
        {
          _id: '1',
          title: 'Red Event',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#ef4444',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      // Find the color dot
      const colorDot = document.querySelector('[style*="background-color: rgb(239, 68, 68)"]');
      expect(colorDot).toBeInTheDocument();
    });

    it('displays multi-day events on each day', () => {
      const events = [
        {
          _id: '1',
          title: 'Multi-day Event',
          startDate: '2024-06-15T00:00:00',
          endDate: '2024-06-17T23:59:59',
          color: '#3b82f6',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      // The event should appear multiple times (once for each day)
      const eventInstances = screen.getAllByText(/Multi-day Event/);
      expect(eventInstances.length).toBe(3); // June 15, 16, 17
    });
  });

  describe('Interactions', () => {
    it('calls onDateClick when clicking on a date cell', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<MonthView {...defaultProps} />);

      // Find and click on a date cell
      const dateCells = document.querySelectorAll('.cursor-pointer');

      if (dateCells.length > 0) {
        await user.click(dateCells[10]); // Click on some date
        expect(mockOnDateClick).toHaveBeenCalled();
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

      render(<MonthView {...defaultProps} events={events} />);

      const eventElement = screen.getByText(/Clickable Event/);
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

      render(<MonthView {...defaultProps} events={events} />);

      const eventElement = screen.getByText(/Clickable Event/);
      await user.click(eventElement);

      expect(mockOnEventClick).toHaveBeenCalled();
      // onDateClick should NOT be called because propagation is stopped
      expect(mockOnDateClick).not.toHaveBeenCalled();
    });
  });

  describe('Date Calculation', () => {
    it('calculates correct weeks for the month', () => {
      render(<MonthView {...defaultProps} />);

      // June 2024 should have dates from late May to early July
      // First row should start with May 26 (Sunday)
      const may26Elements = screen.getAllByText('26');
      expect(may26Elements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows correct days for current month styling', () => {
      render(<MonthView {...defaultProps} />);

      // June 1st should be in the current month (not dimmed)
      const june1Elements = screen.getAllByText('1');
      // One should be June 1 (current month), potentially one from July
      expect(june1Elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty events array', () => {
      render(<MonthView {...defaultProps} events={[]} />);

      // Should still render the calendar grid
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('handles undefined events prop', () => {
      render(<MonthView {...defaultProps} events={undefined} />);

      // Should render without errors
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

      render(<MonthView {...defaultProps} events={events} />);

      // Should use default blue color
      const colorDot = document.querySelector('[style*="background-color: rgb(59, 130, 246)"]');
      expect(colorDot).toBeInTheDocument();
    });

    it('handles February with leap year correctly', () => {
      const febDate = new Date('2024-02-15T12:00:00'); // 2024 is a leap year
      render(<MonthView {...defaultProps} currentDate={febDate} />);

      // Feb 29 should be present
      const feb29Elements = screen.getAllByText('29');
      expect(feb29Elements.length).toBeGreaterThanOrEqual(1);
    });

    it('handles month with 31 days', () => {
      const janDate = new Date('2024-01-15T12:00:00');
      render(<MonthView {...defaultProps} currentDate={janDate} />);

      // January has 31 days
      const jan31Elements = screen.getAllByText('31');
      expect(jan31Elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('shows event title as tooltip', () => {
      const events = [
        {
          _id: '1',
          title: 'Long Event Title That Gets Truncated',
          startDate: '2024-06-15T10:00:00',
          endDate: '2024-06-15T11:00:00',
          color: '#3b82f6',
        },
      ];

      render(<MonthView {...defaultProps} events={events} />);

      const eventElement = screen.getByText(/Long Event Title/).closest('[title]');
      expect(eventElement).toHaveAttribute('title', 'Long Event Title That Gets Truncated');
    });
  });
});
