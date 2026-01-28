/**
 * =============================================================================
 * MINICALENDAR.TEST.JSX - Tests for Mini Calendar Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import MiniCalendar from './MiniCalendar';

// Mock the useEvents hook
vi.mock('../../calendar/hooks/useEvents', () => ({
  useEvents: vi.fn()
}));

import { useEvents } from '../../calendar/hooks/useEvents';

describe('MiniCalendar', () => {
  let originalDate;

  beforeEach(() => {
    vi.clearAllMocks();
    originalDate = global.Date;

    // Default mock for useEvents
    useEvents.mockReturnValue({
      data: { events: [] },
      isLoading: false
    });
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  // Helper to mock current date
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
    it('renders calendar widget', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('displays current month and year', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });

    it('displays day headers', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      // Day headers S, M, T, W, T, F, S
      const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      dayHeaders.forEach(day => {
        // There should be at least one of each day header
        expect(screen.getAllByText(day).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays calendar days', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      // Should show current day (25) - multiple calendars may be rendered
      expect(screen.getAllByText('25').length).toBeGreaterThan(0);
      // Should show other days in the month
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    });
  });

  describe('Today Highlighting', () => {
    it('highlights today in the calendar', () => {
      mockDate('2024-01-25T10:00:00');
      const { container } = render(<MiniCalendar />);

      // Today should have special styling - check if '25' has the today class
      const todayCell = container.querySelector('.bg-primary');
      expect(todayCell).toBeInTheDocument();
      expect(todayCell).toHaveTextContent('25');
    });
  });

  describe('Month Navigation', () => {
    it('goes to previous month when clicking left arrow', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      render(<MiniCalendar />);

      expect(screen.getByText('Jan 2024')).toBeInTheDocument();

      const prevButton = screen.getAllByRole('button')[0];
      await user.click(prevButton);

      expect(screen.getByText('Dec 2023')).toBeInTheDocument();
    });

    it('goes to next month when clicking right arrow', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      render(<MiniCalendar />);

      expect(screen.getByText('Jan 2024')).toBeInTheDocument();

      const nextButton = screen.getAllByRole('button')[2]; // After month label
      await user.click(nextButton);

      expect(screen.getByText('Feb 2024')).toBeInTheDocument();
    });

    it('goes back to current month when clicking month label', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      render(<MiniCalendar />);

      // Navigate away
      const nextButton = screen.getAllByRole('button')[2];
      await user.click(nextButton);
      expect(screen.getByText('Feb 2024')).toBeInTheDocument();

      // Click month label to go back to today
      await user.click(screen.getByText('Feb 2024'));
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });
  });

  describe('Event Indicators', () => {
    it('shows event dot on days with events', () => {
      mockDate('2024-01-25T10:00:00');

      useEvents.mockReturnValue({
        data: {
          events: [
            { _id: '1', startDate: '2024-01-15T10:00:00', title: 'Event 1' },
            { _id: '2', startDate: '2024-01-20T10:00:00', title: 'Event 2' }
          ]
        },
        isLoading: false
      });

      const { container } = render(<MiniCalendar />);

      // Days with events should have event dots
      const eventDots = container.querySelectorAll('.rounded-full.bg-primary');
      expect(eventDots.length).toBeGreaterThan(0);
    });
  });

  describe('Day Links', () => {
    it('links days to calendar page with date', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      // Find a day link
      const dayLinks = screen.getAllByRole('link');
      expect(dayLinks.length).toBeGreaterThan(0);

      // Each link should go to calendar with date param
      const link = dayLinks[0];
      expect(link.getAttribute('href')).toContain('/app/calendar?date=');
    });
  });

  describe('Calendar Footer', () => {
    it('has link to full calendar', () => {
      mockDate('2024-01-25T10:00:00');
      render(<MiniCalendar />);

      const calendarLink = screen.getByRole('link', { name: 'Open Calendar' });
      expect(calendarLink).toHaveAttribute('href', '/app/calendar');
    });
  });

  describe('Loading State', () => {
    it('still renders calendar while loading events', () => {
      mockDate('2024-01-25T10:00:00');

      useEvents.mockReturnValue({
        data: null,
        isLoading: true
      });

      render(<MiniCalendar />);

      // Calendar should still be visible
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });
  });

  describe('Different Months', () => {
    it('shows correct number of days for February', async () => {
      mockDate('2024-02-15T10:00:00');
      render(<MiniCalendar />);

      // Multiple calendars may be rendered (responsive)
      expect(screen.getAllByText('Feb 2024').length).toBeGreaterThan(0);
      // February 2024 has 29 days (leap year)
      expect(screen.getAllByText('29').length).toBeGreaterThan(0);
    });

    it('shows days from previous month grayed out', () => {
      mockDate('2024-01-25T10:00:00');
      const { container } = render(<MiniCalendar />);

      // January 2024 starts on Monday, so Dec 31 (Sunday) should show
      // Previous month days have muted styling
      const allDayLinks = container.querySelectorAll('a');
      const mutedDays = Array.from(allDayLinks).filter(
        link => link.className.includes('muted') || link.className.includes('text-muted')
      );

      expect(mutedDays.length).toBeGreaterThan(0);
    });
  });
});
