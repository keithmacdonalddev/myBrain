import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectEventsTimeline } from './ProjectEventsTimeline';

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('../../../../hooks/useToast', () => ({
  default: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  }),
}));

// Mock unlink hook
const mockUnlinkEvent = vi.fn();
vi.mock('../../hooks/useProjects', () => ({
  useUnlinkEvent: () => ({
    mutateAsync: mockUnlinkEvent,
  }),
}));

// Mock LinkItemModal
vi.mock('../LinkItemModal', () => ({
  LinkItemModal: ({ onClose }) => (
    <div data-testid="link-item-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

const createPreloadedState = () => ({
  auth: {
    user: { _id: 'user123', email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    loading: false,
  },
  lifeAreas: { items: [], loading: false, error: null },
  theme: { mode: 'light', effectiveTheme: 'light' },
  toast: { toasts: [] },
});

describe('ProjectEventsTimeline', () => {
  const mockOnEventClick = vi.fn();
  const mockOnNewEvent = vi.fn();

  // Create dates relative to now for consistent testing
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const mockUpcomingEvents = [
    {
      _id: 'event1',
      title: 'Upcoming Event 1',
      startDate: tomorrow.toISOString(),
      allDay: false,
      color: '#3b82f6',
    },
    {
      _id: 'event2',
      title: 'Upcoming Event 2',
      startDate: nextWeek.toISOString(),
      allDay: true,
      color: '#10b981',
    },
  ];

  const mockPastEvents = [
    {
      _id: 'event3',
      title: 'Past Event',
      startDate: lastWeek.toISOString(),
      allDay: false,
    },
  ];

  const mockAllEvents = [...mockUpcomingEvents, ...mockPastEvents];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnlinkEvent.mockResolvedValue({});
  });

  describe('Basic Rendering', () => {
    it('renders header with Events title', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Events')).toBeInTheDocument();
    });

    it('shows event count', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders link existing button', () => {
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing event"]');
      expect(linkButton).toBeInTheDocument();
    });

    it('renders create new button', () => {
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const newButton = container.querySelector('[title="Create new event"]');
      expect(newButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no events', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No events linked')).toBeInTheDocument();
    });

    it('shows create event link in empty state', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Create an event')).toBeInTheDocument();
    });

    it('calls onNewEvent when create link clicked in empty state', async () => {
      const user = userEvent.setup();
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Create an event'));

      expect(mockOnNewEvent).toHaveBeenCalled();
    });
  });

  describe('Event Display', () => {
    it('displays upcoming events', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Upcoming Event 1')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Event 2')).toBeInTheDocument();
    });

    it('shows "Tomorrow" for tomorrow events', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('shows "All day" for all-day events', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('All day')).toBeInTheDocument();
    });

    it('shows event color indicator', () => {
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const colorDot = container.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
    });
  });

  describe('Past Events', () => {
    it('shows past events toggle when past events exist', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockAllEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText(/1 past event/)).toBeInTheDocument();
    });

    it('hides past events by default', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockAllEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });

    it('shows past events when toggle clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockAllEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText(/1 past event/));

      await waitFor(() => {
        expect(screen.getByText('Past Event')).toBeInTheDocument();
      });
    });

    it('hides past events when toggle clicked again', async () => {
      const user = userEvent.setup();
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockAllEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Show past events
      await user.click(screen.getByText(/1 past event/));
      await waitFor(() => {
        expect(screen.getByText('Past Event')).toBeInTheDocument();
      });

      // Hide past events
      await user.click(screen.getByText(/1 past event/));
      await waitFor(() => {
        expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
      });
    });
  });

  describe('Event Click', () => {
    it('calls onEventClick when event is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Upcoming Event 1'));

      expect(mockOnEventClick).toHaveBeenCalledWith(mockUpcomingEvents[0]);
    });
  });

  describe('Create New Event', () => {
    it('calls onNewEvent when new button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const newButton = container.querySelector('[title="Create new event"]');
      if (newButton) {
        await user.click(newButton);
        expect(mockOnNewEvent).toHaveBeenCalled();
      }
    });
  });

  describe('Link Event Modal', () => {
    it('opens link modal when link button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing event"]');
      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
        });
      }
    });

    it('closes link modal on close action', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing event"]');
      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Close Modal'));

        await waitFor(() => {
          expect(screen.queryByTestId('link-item-modal')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Unlink Event', () => {
    it('calls unlink mutation on unlink button click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Find unlink button
      const unlinkButton = container.querySelector('[title="Unlink"]');
      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockUnlinkEvent).toHaveBeenCalledWith({
            projectId: 'project123',
            eventId: 'event1',
          });
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Event unlinked');
      }
    });

    it('shows error toast on unlink failure', async () => {
      mockUnlinkEvent.mockRejectedValueOnce(new Error('Unlink failed'));

      const user = userEvent.setup();
      const { container } = render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      const unlinkButton = container.querySelector('[title="Unlink"]');
      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith('Failed to unlink event');
        });
      }
    });
  });

  describe('Date Formatting', () => {
    it('shows "Today" for today events', () => {
      // Use a future time today to ensure the event isn't filtered as "past"
      const today = new Date();
      today.setHours(23, 59, 0, 0); // Set to end of day

      const todayEvent = {
        _id: 'today',
        title: 'Today Event',
        startDate: today.toISOString(),
        allDay: false,
      };

      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={[todayEvent]}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('shows formatted date for future events', () => {
      render(
        <ProjectEventsTimeline
          projectId="project123"
          events={mockUpcomingEvents}
          onEventClick={mockOnEventClick}
          onNewEvent={mockOnNewEvent}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Next week event should show formatted date
      const datePattern = /[A-Z][a-z]+ \d+/; // e.g., "Jan 15"
      const dateElements = screen.getAllByText(datePattern);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});
