/**
 * =============================================================================
 * DASHBOARDPAGEV2.TEST.JSX - Tests for V2 Dashboard Components
 * =============================================================================
 *
 * Basic tests to ensure V2 dashboard components render without errors
 * and handle empty/loading states gracefully.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import DashboardPageV2 from './DashboardPageV2';
import TasksWidgetV2 from './widgets-v2/TasksWidgetV2';
import EventsWidgetV2 from './widgets-v2/EventsWidgetV2';

// Mock the dashboard data hooks
vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
  useDashboardSession: vi.fn(),
}));

// Mock the analytics hook
vi.mock('../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn(),
}));

// Mock the API module for widget mutations
vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import the mocked hooks
import { useDashboardData, useDashboardSession } from './hooks/useDashboardData';

describe('DashboardPageV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardSession.mockReturnValue({});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state when data is loading', () => {
      useDashboardData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(<DashboardPageV2 />);

      expect(container.querySelector('.v2-dashboard--loading')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state when there is an error', () => {
      const mockRefetch = vi.fn();
      useDashboardData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      });

      const { container } = render(<DashboardPageV2 />);

      expect(container.querySelector('.v2-dashboard--error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Successful Render', () => {
    it('renders dashboard with empty data', () => {
      useDashboardData.mockReturnValue({
        data: {
          tasks: [],
          recentItems: { notes: [] },
          events: { today: [], tomorrow: [] },
          inbox: [],
          stats: {},
          urgentItems: {},
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<DashboardPageV2 />);

      // Should render the main dashboard structure
      expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
      expect(screen.getByText("Here's what's happening today")).toBeInTheDocument();
    });

    it('renders dashboard header with greeting', () => {
      useDashboardData.mockReturnValue({
        data: {
          tasks: [],
          recentItems: { notes: [] },
          events: { today: [], tomorrow: [] },
          inbox: [],
          stats: {},
          urgentItems: {},
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<DashboardPageV2 />, {
        preloadedState: {
          auth: {
            user: { _id: 'test-user', name: 'John Doe', email: 'test@test.com' },
            isAuthenticated: true,
          },
        },
      });

      // Should show user's first name in greeting
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it('renders radar button', () => {
      useDashboardData.mockReturnValue({
        data: {
          tasks: [],
          recentItems: { notes: [] },
          events: { today: [], tomorrow: [] },
          inbox: [],
          stats: {},
          urgentItems: {},
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<DashboardPageV2 />);

      expect(screen.getByRole('button', { name: /radar/i })).toBeInTheDocument();
    });
  });
});

describe('TasksWidgetV2', () => {
  describe('Empty State', () => {
    it('renders without crashing with empty data', () => {
      render(<TasksWidgetV2 tasks={[]} overdueTasks={[]} dueTodayTasks={[]} />);

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('No tasks to show')).toBeInTheDocument();
    });

    it('shows create task button in empty state', () => {
      render(<TasksWidgetV2 tasks={[]} overdueTasks={[]} dueTodayTasks={[]} />);

      expect(screen.getByRole('button', { name: /create a task/i })).toBeInTheDocument();
    });
  });

  describe('With Tasks', () => {
    it('renders overdue tasks section', () => {
      const overdueTasks = [
        { _id: '1', title: 'Overdue Task 1', status: 'todo', priority: 'high' },
      ];

      render(<TasksWidgetV2 tasks={[]} overdueTasks={overdueTasks} dueTodayTasks={[]} />);

      // Overdue section header includes count like "Overdue (1)"
      expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Overdue Task 1')).toBeInTheDocument();
    });

    it('renders due today tasks section', () => {
      const dueTodayTasks = [
        { _id: '2', title: 'Task For Today', status: 'todo', priority: 'medium' },
      ];

      render(<TasksWidgetV2 tasks={[]} overdueTasks={[]} dueTodayTasks={dueTodayTasks} />);

      // Due Today section header includes count like "Due Today (1)"
      expect(screen.getByText(/Due Today \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Task For Today')).toBeInTheDocument();
    });

    it('renders upcoming tasks section', () => {
      const tasks = [
        { _id: '3', title: 'Upcoming Task', status: 'todo', dueDate: '2024-12-31' },
      ];

      render(<TasksWidgetV2 tasks={tasks} overdueTasks={[]} dueTodayTasks={[]} />);

      // Use getAllByText since 'Upcoming' appears in both header and task title
      const upcomingElements = screen.getAllByText(/Upcoming/);
      expect(upcomingElements.length).toBeGreaterThan(0);
    });

    it('renders new task button in header', () => {
      render(<TasksWidgetV2 tasks={[]} overdueTasks={[]} dueTodayTasks={[]} />);

      expect(screen.getByRole('button', { name: /\+ new/i })).toBeInTheDocument();
    });
  });

  describe('Task Display', () => {
    it('displays task with due date', () => {
      const tasks = [
        { _id: '1', title: 'Task with Date', status: 'todo', dueDate: '2024-01-15T10:00:00' },
      ];

      render(<TasksWidgetV2 tasks={tasks} overdueTasks={[]} dueTodayTasks={[]} />);

      expect(screen.getByText('Task with Date')).toBeInTheDocument();
      expect(screen.getByText('Jan 15')).toBeInTheDocument();
    });

    it('displays completed task with strikethrough styling', () => {
      const tasks = [
        { _id: '1', title: 'Completed Task', status: 'completed' },
      ];

      render(<TasksWidgetV2 tasks={tasks} overdueTasks={[]} dueTodayTasks={[]} />);

      const taskTitle = screen.getByText('Completed Task');
      expect(taskTitle).toHaveClass('v2-task-title--completed');
    });
  });
});

describe('EventsWidgetV2', () => {
  describe('Empty State', () => {
    it('renders without crashing with empty data', () => {
      render(<EventsWidgetV2 events={{ today: [], tomorrow: [] }} />);

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });

    it('shows count of zero when empty', () => {
      render(<EventsWidgetV2 events={{ today: [], tomorrow: [] }} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('With Events', () => {
    it('renders today events section', () => {
      const events = {
        today: [
          { _id: '1', title: 'Today Meeting', startDate: '2024-01-25T10:00:00' },
        ],
        tomorrow: [],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Today Meeting')).toBeInTheDocument();
    });

    it('renders tomorrow events section', () => {
      const events = {
        today: [],
        tomorrow: [
          { _id: '2', title: 'Tomorrow Event', startDate: '2024-01-26T14:00:00' },
        ],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow Event')).toBeInTheDocument();
    });

    it('displays correct event count', () => {
      const events = {
        today: [
          { _id: '1', title: 'Event 1', startDate: '2024-01-25T10:00:00' },
          { _id: '2', title: 'Event 2', startDate: '2024-01-25T11:00:00' },
        ],
        tomorrow: [
          { _id: '3', title: 'Event 3', startDate: '2024-01-26T10:00:00' },
        ],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Event Details', () => {
    it('displays event time', () => {
      const events = {
        today: [
          { _id: '1', title: 'Meeting', startDate: '2024-01-25T14:30:00' },
        ],
        tomorrow: [],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('displays event location when provided', () => {
      const events = {
        today: [
          { _id: '1', title: 'Meeting', startDate: '2024-01-25T10:00:00', location: 'Room 101' },
        ],
        tomorrow: [],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByText('Room 101')).toBeInTheDocument();
    });

    it('displays join meeting button when meeting URL provided', () => {
      const events = {
        today: [
          { _id: '1', title: 'Video Call', startDate: '2024-01-25T10:00:00', meetingUrl: 'https://zoom.us/123' },
        ],
        tomorrow: [],
      };

      render(<EventsWidgetV2 events={events} />);

      expect(screen.getByRole('button', { name: /join meeting/i })).toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('handles undefined events prop gracefully', () => {
      render(<EventsWidgetV2 />);

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });

    it('handles missing today/tomorrow arrays gracefully', () => {
      render(<EventsWidgetV2 events={{}} />);

      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });
  });
});
