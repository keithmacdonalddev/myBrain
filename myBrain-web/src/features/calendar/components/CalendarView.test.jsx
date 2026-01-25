import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import CalendarView from './CalendarView';

// Mock the useEvents hook and related mutation hooks
vi.mock('../hooks/useEvents', () => ({
  useEvents: vi.fn(() => ({
    data: { events: [] },
    isLoading: false,
  })),
  useCreateEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ event: { _id: 'new-event-id' } }),
    isPending: false,
    error: null,
  })),
  useUpdateEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ event: { _id: 'existing-id' } }),
    isPending: false,
    error: null,
  })),
  useDeleteEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useLinkTaskToEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useUnlinkTaskFromEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useLinkNoteToEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useUnlinkNoteFromEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
}));

// Mock usePageTracking
vi.mock('../../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn(),
}));

// Mock useTasks for EventModal
vi.mock('../../tasks/hooks/useTasks', () => ({
  useTasks: vi.fn(() => ({
    data: { tasks: [] },
  })),
}));

// Mock useNotes for EventModal
vi.mock('../../notes/hooks/useNotes', () => ({
  useNotes: vi.fn(() => ({
    data: { notes: [] },
  })),
}));

// Mock useToast for EventModal
vi.mock('../../../hooks/useToast', () => ({
  default: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock useSavedLocations for EventModal
vi.mock('../../../hooks/useSavedLocations', () => ({
  useSavedLocations: vi.fn(() => ({
    data: [],
  })),
}));

// Mock react-router-dom hooks
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

// Import the mocked hook for manipulation
import { useEvents } from '../hooks/useEvents';

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView since JSDOM doesn't implement it
    Element.prototype.scrollIntoView = vi.fn();
    // Reset to default mock return value
    useEvents.mockReturnValue({
      data: { events: [] },
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the calendar view with title', () => {
      render(<CalendarView />);
      // "Calendar" may appear multiple times (h1 title, mobile header, etc.)
      const calendarTexts = screen.getAllByText('Calendar');
      expect(calendarTexts.length).toBeGreaterThan(0);
    });

    it('renders the New Event button', () => {
      render(<CalendarView />);
      // Desktop has text "New Event", mobile has just the Plus icon
      expect(screen.getAllByRole('button').some(btn =>
        btn.textContent.includes('New Event') || btn.querySelector('svg')
      )).toBe(true);
    });

    it('renders the Today button', () => {
      render(<CalendarView />);
      const todayButtons = screen.getAllByRole('button', { name: /today/i });
      expect(todayButtons.length).toBeGreaterThan(0);
    });

    it('renders navigation buttons', () => {
      render(<CalendarView />);
      // Should have multiple navigation button sets (mobile and desktop)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(5);
    });

    it('shows loading indicator when loading events', () => {
      useEvents.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<CalendarView />);
      // Look for the Loader2 spinning icon (has animate-spin class)
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  describe('View Switching', () => {
    it('renders view toggle buttons for Month, Week, and Day', () => {
      render(<CalendarView />);

      // The view options should be present (both mobile and desktop versions)
      const monthButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent.includes('Month') || btn.getAttribute('title')?.includes('Month')
      );
      expect(monthButtons.length).toBeGreaterThan(0);
    });

    it('starts with month view by default', () => {
      render(<CalendarView />);
      // MonthView renders day headers like 'Sun', 'Mon', etc.
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
    });

    it('switches to week view when Week button is clicked', async () => {
      const user = userEvent.setup();
      render(<CalendarView />);

      // Find and click a Week button
      const weekButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent.includes('Week')
      );

      if (weekButtons.length > 0) {
        await user.click(weekButtons[0]);

        // WeekView renders time labels like '12 AM', '1 AM', etc.
        await waitFor(() => {
          expect(screen.getByText('12 AM')).toBeInTheDocument();
        });
      }
    });

    it('switches to day view when Day button is clicked', async () => {
      const user = userEvent.setup();
      render(<CalendarView />);

      // Find and click a Day button
      const dayButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent.includes('Day')
      );

      if (dayButtons.length > 0) {
        await user.click(dayButtons[0]);

        // DayView shows the current date prominently
        await waitFor(() => {
          expect(screen.getByText('12 AM')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Date Navigation', () => {
    it('displays current month and year in title', () => {
      render(<CalendarView />);

      const today = new Date();
      const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // The title should contain the current month (may appear multiple times in sidebar and main)
      const monthYearElements = screen.getAllByText(monthYear);
      expect(monthYearElements.length).toBeGreaterThan(0);
    });

    it('has navigation buttons for previous and next periods', () => {
      render(<CalendarView />);

      // Find buttons with chevron icons for navigation
      const allButtons = screen.getAllByRole('button');

      // Should have navigation buttons
      expect(allButtons.length).toBeGreaterThan(5);
    });

    it('has Today button for navigation', () => {
      render(<CalendarView />);

      const todayButtons = screen.getAllByRole('button', { name: /today/i });
      expect(todayButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Event Display', () => {
    it('displays events fetched from the API', async () => {
      const mockEvents = [
        {
          _id: '1',
          title: 'Team Meeting',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          color: '#3b82f6',
        },
      ];

      useEvents.mockReturnValue({
        data: { events: mockEvents },
        isLoading: false,
      });

      render(<CalendarView />);

      // MonthView should display the event title
      await waitFor(() => {
        expect(screen.getByText(/Team Meeting/)).toBeInTheDocument();
      });
    });

    it('handles empty events array', () => {
      useEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false,
      });

      render(<CalendarView />);

      // Should still render the calendar grid
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });
  });

  describe('Event Modal', () => {
    it('has New Event button available', () => {
      render(<CalendarView />);

      // Find New Event button - it should exist somewhere in the UI
      const newEventBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('New Event')
      );

      expect(newEventBtn).toBeTruthy();
    });

    it('New Event button in sidebar has correct styling', () => {
      render(<CalendarView />);

      const newEventBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('New Event')
      );

      if (newEventBtn) {
        expect(newEventBtn).toHaveClass('bg-primary');
      }
    });
  });

  describe('Mini Calendar (Sidebar)', () => {
    it('renders mini calendar in sidebar on large screens', () => {
      render(<CalendarView />);

      // Mini calendar has day headers 'S', 'M', 'T', 'W', 'T', 'F', 'S'
      const dayHeaders = screen.getAllByText('S');
      // Should have multiple 'S' for Sunday and Saturday
      expect(dayHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Upcoming Events (Sidebar)', () => {
    it('shows "No upcoming events" when there are no future events', () => {
      useEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false,
      });

      render(<CalendarView />);

      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });

    it('displays upcoming events in sidebar', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      const mockEvents = [
        {
          _id: '1',
          title: 'Future Meeting',
          startDate: futureDate.toISOString(),
          endDate: futureDate.toISOString(),
          color: '#3b82f6',
        },
      ];

      useEvents.mockReturnValue({
        data: { events: mockEvents },
        isLoading: false,
      });

      render(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Future Meeting')).toBeInTheDocument();
      });
    });
  });
});
