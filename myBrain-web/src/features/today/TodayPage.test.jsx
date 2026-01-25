/**
 * =============================================================================
 * TODAYPAGE.TEST.JSX - Tests for Today Page Component
 * =============================================================================
 *
 * Tests the TodayPage component which shows:
 * - Today's schedule (events)
 * - Overdue tasks (red section)
 * - Due today tasks
 * - Inbox preview with count
 * - All clear state when nothing scheduled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import TodayPage from './TodayPage';

// -----------------------------------------------------------------------------
// Mock Hooks
// -----------------------------------------------------------------------------

vi.mock('../tasks/hooks/useTasks', () => ({
  useTodayView: vi.fn(),
  useUpdateTaskStatus: vi.fn()
}));

vi.mock('../notes/hooks/useNotes', () => ({
  useInboxCount: vi.fn()
}));

vi.mock('../calendar/hooks/useEvents', () => ({
  useDayEvents: vi.fn()
}));

vi.mock('../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn()
}));

// -----------------------------------------------------------------------------
// Mock Components
// -----------------------------------------------------------------------------

vi.mock('../../components/layout/MobilePageHeader', () => ({
  default: vi.fn(({ title }) => (
    <div data-testid="mobile-header">{title}</div>
  ))
}));

vi.mock('../../components/ui/Skeleton', () => ({
  default: vi.fn(({ className }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  ))
}));

vi.mock('../../components/tasks/TaskSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="task-slide-panel" />)
}));

vi.mock('../calendar/components/EventModal', () => ({
  default: vi.fn(({ event, onClose }) => (
    <div data-testid="event-modal">
      <span data-testid="event-modal-title">{event?.title || 'New Event'}</span>
      <button onClick={onClose} data-testid="close-event-modal">Close</button>
    </div>
  ))
}));

// -----------------------------------------------------------------------------
// Mock Context - TaskPanelContext
// -----------------------------------------------------------------------------

const mockOpenTask = vi.fn();
const mockOpenNewTask = vi.fn();
const mockCloseTask = vi.fn();

vi.mock('../../contexts/TaskPanelContext', () => ({
  TaskPanelProvider: vi.fn(({ children }) => (
    <div data-testid="task-panel-provider">{children}</div>
  )),
  useTaskPanel: vi.fn(() => ({
    isOpen: false,
    taskId: null,
    initialData: null,
    openTask: mockOpenTask,
    openNewTask: mockOpenNewTask,
    closeTask: mockCloseTask
  }))
}));

// -----------------------------------------------------------------------------
// Import Mocked Modules
// -----------------------------------------------------------------------------

import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useInboxCount } from '../notes/hooks/useNotes';
import { useDayEvents } from '../calendar/hooks/useEvents';
import { usePageTracking } from '../../hooks/useAnalytics';
import { useTaskPanel } from '../../contexts/TaskPanelContext';

// -----------------------------------------------------------------------------
// Test Data
// -----------------------------------------------------------------------------

const mockOverdueTask = {
  _id: 'overdue-task-1',
  title: 'Overdue Task',
  status: 'todo',
  priority: 'high',
  dueDate: '2024-01-20'
};

const mockDueTodayTask = {
  _id: 'today-task-1',
  title: 'Due Today Task',
  status: 'todo',
  priority: 'medium',
  dueDate: '2024-01-25'
};

const mockCompletedTask = {
  _id: 'completed-task-1',
  title: 'Completed Task',
  status: 'done',
  priority: 'low',
  dueDate: '2024-01-25'
};

const mockLowPriorityTask = {
  _id: 'low-task-1',
  title: 'Low Priority Task',
  status: 'todo',
  priority: 'low',
  dueDate: '2024-01-25'
};

const mockEvent = {
  _id: 'event-1',
  title: 'Team Meeting',
  startDate: '2024-01-25T10:00:00',
  endDate: '2024-01-25T11:00:00',
  color: '#3b82f6',
  allDay: false
};

const mockAllDayEvent = {
  _id: 'event-2',
  title: 'Conference',
  startDate: '2024-01-25T00:00:00',
  endDate: '2024-01-25T23:59:59',
  color: '#10b981',
  allDay: true
};

const mockEventWithLocation = {
  _id: 'event-3',
  title: 'Client Meeting',
  startDate: '2024-01-25T14:00:00',
  endDate: '2024-01-25T15:00:00',
  color: '#f59e0b',
  allDay: false,
  location: 'Conference Room A'
};

const mockEventWithMeetingUrl = {
  _id: 'event-4',
  title: 'Video Call',
  startDate: '2024-01-25T16:00:00',
  endDate: '2024-01-25T17:00:00',
  color: '#6366f1',
  allDay: false,
  meetingUrl: 'https://zoom.us/meeting'
};

// -----------------------------------------------------------------------------
// Test Setup
// -----------------------------------------------------------------------------

describe('TodayPage', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    useTodayView.mockReturnValue({
      data: {
        overdue: [],
        dueToday: [],
        inboxCount: 0
      },
      isLoading: false
    });

    useUpdateTaskStatus.mockReturnValue({
      mutate: mockMutate
    });

    useInboxCount.mockReturnValue({
      data: 0,
      isLoading: false
    });

    useDayEvents.mockReturnValue({
      data: { events: [] },
      isLoading: false
    });

    usePageTracking.mockReturnValue({});
  });

  // ---------------------------------------------------------------------------
  // Loading State Tests
  // ---------------------------------------------------------------------------

  describe('Loading State', () => {
    it('renders loading state with skeletons when data is loading', () => {
      useTodayView.mockReturnValue({
        data: null,
        isLoading: true
      });

      useDayEvents.mockReturnValue({
        data: null,
        isLoading: true
      });

      render(<TodayPage />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('shows skeletons when only today view is loading', () => {
      useTodayView.mockReturnValue({
        data: null,
        isLoading: true
      });

      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1);
    });

    it('shows skeletons when only events are loading', () => {
      useTodayView.mockReturnValue({
        data: { overdue: [], dueToday: [], inboxCount: 0 },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: null,
        isLoading: true
      });

      render(<TodayPage />);

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Schedule Section Tests
  // ---------------------------------------------------------------------------

  describe('Schedule Section', () => {
    it('renders schedule section with events', () => {
      useDayEvents.mockReturnValue({
        data: { events: [mockEvent] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/schedule/i)).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    });

    it('shows event count in schedule header', () => {
      useDayEvents.mockReturnValue({
        data: { events: [mockEvent, mockAllDayEvent] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/schedule \(2\)/i)).toBeInTheDocument();
    });

    it('shows empty message when no events scheduled', () => {
      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/no events scheduled for today/i)).toBeInTheDocument();
    });

    it('renders all-day event with correct time display', () => {
      useDayEvents.mockReturnValue({
        data: { events: [mockAllDayEvent] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Conference')).toBeInTheDocument();
      expect(screen.getByText('All day')).toBeInTheDocument();
    });

    it('renders event with location', () => {
      useDayEvents.mockReturnValue({
        data: { events: [mockEventWithLocation] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Client Meeting')).toBeInTheDocument();
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    });

    it('renders event with meeting URL indicator', () => {
      useDayEvents.mockReturnValue({
        data: { events: [mockEventWithMeetingUrl] },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Video Call')).toBeInTheDocument();
    });

    it('renders Open Calendar link', () => {
      render(<TodayPage />);

      const calendarLink = screen.getByText(/open calendar/i);
      expect(calendarLink).toBeInTheDocument();
      expect(calendarLink.closest('a')).toHaveAttribute('href', '/app/calendar');
    });
  });

  // ---------------------------------------------------------------------------
  // Overdue Tasks Section Tests
  // ---------------------------------------------------------------------------

  describe('Overdue Tasks Section', () => {
    it('renders overdue section when overdue tasks exist', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [mockOverdueTask],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      // Check for the section header (contains "Overdue (1)")
      expect(screen.getByText(/overdue \(1\)/i)).toBeInTheDocument();
      // Check for the task title
      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
    });

    it('shows overdue count in section header', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [mockOverdueTask, { ...mockOverdueTask, _id: 'overdue-2', title: 'Another Overdue' }],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/overdue \(2\)/i)).toBeInTheDocument();
    });

    it('does not render overdue section when no overdue tasks', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.queryByText(/overdue \(/i)).not.toBeInTheDocument();
    });

    it('shows high priority flag on overdue task', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [mockOverdueTask],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      const { container } = render(<TodayPage />);

      // High priority tasks should have a flag icon with red color
      const flagIcon = container.querySelector('.text-red-500');
      expect(flagIcon).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Due Today Tasks Section Tests
  // ---------------------------------------------------------------------------

  describe('Due Today Tasks Section', () => {
    it('renders due today section with tasks', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      // Check for the section header (contains "Due Today (1)")
      expect(screen.getByText(/due today \(1\)/i)).toBeInTheDocument();
      // Check for the task title
      expect(screen.getByText('Due Today Task')).toBeInTheDocument();
    });

    it('shows due today count in section header', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask, mockCompletedTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/due today \(2\)/i)).toBeInTheDocument();
    });

    it('shows empty message when no tasks due today', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/no tasks due today\. nice work!/i)).toBeInTheDocument();
    });

    it('renders completed task with strikethrough styling', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockCompletedTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      const completedTaskElement = screen.getByText('Completed Task');
      expect(completedTaskElement).toHaveClass('line-through');
    });

    it('shows low priority flag on low priority task', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockLowPriorityTask],
          inboxCount: 0
        },
        isLoading: false
      });

      const { container } = render(<TodayPage />);

      // Low priority tasks should have a flag icon with gray color
      const flagIcon = container.querySelector('.text-gray-400');
      expect(flagIcon).toBeInTheDocument();
    });

    it('does not show flag for medium priority tasks', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      const { container } = render(<TodayPage />);

      // Medium priority tasks should not show a flag
      // Check that there's no flag icon with any priority color for the task row
      const taskRow = screen.getByText('Due Today Task').closest('div');
      const flagIcons = taskRow.querySelectorAll('.text-gray-400, .text-red-500');
      expect(flagIcons.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Inbox Section Tests
  // ---------------------------------------------------------------------------

  describe('Inbox Section', () => {
    it('renders inbox section with count', () => {
      useInboxCount.mockReturnValue({
        data: 5,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows unprocessed notes message with count', () => {
      useInboxCount.mockReturnValue({
        data: 3,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/you have 3 unprocessed notes waiting for review/i)).toBeInTheDocument();
    });

    it('shows singular note message for count of 1', () => {
      useInboxCount.mockReturnValue({
        data: 1,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/you have 1 unprocessed note waiting for review/i)).toBeInTheDocument();
    });

    it('shows inbox zero message when no items', () => {
      useInboxCount.mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText(/inbox zero! you're all caught up/i)).toBeInTheDocument();
    });

    it('renders View Inbox link', () => {
      useInboxCount.mockReturnValue({
        data: 5,
        isLoading: false
      });

      render(<TodayPage />);

      const inboxLink = screen.getByText(/view inbox/i);
      expect(inboxLink).toBeInTheDocument();
      expect(inboxLink.closest('a')).toHaveAttribute('href', '/app/inbox');
    });

    it('uses todayData inboxCount as fallback', () => {
      useInboxCount.mockReturnValue({
        data: null,
        isLoading: false
      });

      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [],
          inboxCount: 7
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // All Clear State Tests
  // ---------------------------------------------------------------------------

  describe('All Clear State', () => {
    it('shows all clear state when nothing scheduled', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      useInboxCount.mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('All Clear!')).toBeInTheDocument();
      expect(screen.getByText(/nothing urgent today\. time to work on what matters/i)).toBeInTheDocument();
    });

    it('does not show all clear when there are overdue tasks', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [mockOverdueTask],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      useInboxCount.mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.queryByText('All Clear!')).not.toBeInTheDocument();
    });

    it('does not show all clear when there are due today tasks', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      useInboxCount.mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.queryByText('All Clear!')).not.toBeInTheDocument();
    });

    it('does not show all clear when there are events', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: { events: [mockEvent] },
        isLoading: false
      });

      useInboxCount.mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.queryByText('All Clear!')).not.toBeInTheDocument();
    });

    it('does not show all clear when there are inbox items', () => {
      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [],
          inboxCount: 0
        },
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: { events: [] },
        isLoading: false
      });

      useInboxCount.mockReturnValue({
        data: 3,
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.queryByText('All Clear!')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Task Interactions Tests
  // ---------------------------------------------------------------------------

  describe('Task Interactions', () => {
    it('toggles task status from todo to done when clicking checkbox', async () => {
      const user = userEvent.setup();

      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      // Find the checkbox button (the circle icon button)
      const taskRow = screen.getByText('Due Today Task').closest('div');
      const checkboxButton = taskRow.querySelector('button');

      await user.click(checkboxButton);

      expect(mockMutate).toHaveBeenCalledWith({
        id: 'today-task-1',
        status: 'done'
      });
    });

    it('toggles task status from done to todo when clicking checkbox', async () => {
      const user = userEvent.setup();

      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockCompletedTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      const taskRow = screen.getByText('Completed Task').closest('div');
      const checkboxButton = taskRow.querySelector('button');

      await user.click(checkboxButton);

      expect(mockMutate).toHaveBeenCalledWith({
        id: 'completed-task-1',
        status: 'todo'
      });
    });

    it('opens task panel when clicking on task row', async () => {
      const user = userEvent.setup();

      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      // Click on the task title (not the checkbox)
      await user.click(screen.getByText('Due Today Task'));

      expect(mockOpenTask).toHaveBeenCalledWith('today-task-1');
    });

    it('does not open task panel when clicking checkbox', async () => {
      const user = userEvent.setup();

      useTodayView.mockReturnValue({
        data: {
          overdue: [],
          dueToday: [mockDueTodayTask],
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      const taskRow = screen.getByText('Due Today Task').closest('div');
      const checkboxButton = taskRow.querySelector('button');

      await user.click(checkboxButton);

      // Checkbox click should toggle status, not open panel
      expect(mockMutate).toHaveBeenCalled();
      // openTask should not be called because stopPropagation is used
      expect(mockOpenTask).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Event Interactions Tests
  // ---------------------------------------------------------------------------

  describe('Event Interactions', () => {
    it('opens event modal when clicking on event', async () => {
      const user = userEvent.setup();

      useDayEvents.mockReturnValue({
        data: { events: [mockEvent] },
        isLoading: false
      });

      render(<TodayPage />);

      await user.click(screen.getByText('Team Meeting'));

      expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      expect(screen.getByTestId('event-modal-title')).toHaveTextContent('Team Meeting');
    });

    it('closes event modal when close button clicked', async () => {
      const user = userEvent.setup();

      useDayEvents.mockReturnValue({
        data: { events: [mockEvent] },
        isLoading: false
      });

      render(<TodayPage />);

      // Open modal
      await user.click(screen.getByText('Team Meeting'));
      expect(screen.getByTestId('event-modal')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByTestId('close-event-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument();
      });
    });

    it('opens event modal for new event when clicking add button', async () => {
      const user = userEvent.setup();

      render(<TodayPage />);

      // Find the add event button (Plus icon in schedule section)
      const addButton = screen.getByTitle('Add event');

      await user.click(addButton);

      expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      expect(screen.getByTestId('event-modal-title')).toHaveTextContent('New Event');
    });
  });

  // ---------------------------------------------------------------------------
  // Component Structure Tests
  // ---------------------------------------------------------------------------

  describe('Component Structure', () => {
    it('renders mobile header', () => {
      render(<TodayPage />);

      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-header')).toHaveTextContent('Today');
    });

    it('renders task slide panel', () => {
      render(<TodayPage />);

      expect(screen.getByTestId('task-slide-panel')).toBeInTheDocument();
    });

    it('wraps content in TaskPanelProvider', () => {
      render(<TodayPage />);

      expect(screen.getByTestId('task-panel-provider')).toBeInTheDocument();
    });

    it('tracks page view on render', () => {
      render(<TodayPage />);

      expect(usePageTracking).toHaveBeenCalled();
    });

    it('displays current date string', () => {
      render(<TodayPage />);

      // The date display should show the day of the week and month
      // Since we can't mock Date easily here, we just check that there's date-like text
      const dateElements = screen.getAllByText(
        /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
      );
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases Tests
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles null data gracefully', () => {
      useTodayView.mockReturnValue({
        data: null,
        isLoading: false
      });

      useDayEvents.mockReturnValue({
        data: null,
        isLoading: false
      });

      // Should not throw
      expect(() => render(<TodayPage />)).not.toThrow();
    });

    it('handles undefined events array gracefully', () => {
      useDayEvents.mockReturnValue({
        data: {},
        isLoading: false
      });

      render(<TodayPage />);

      // Should show schedule section with 0 events
      expect(screen.getByText(/schedule \(0\)/i)).toBeInTheDocument();
    });

    it('renders multiple overdue and due today tasks', () => {
      const overdueTasks = [
        { _id: 'o1', title: 'Overdue 1', status: 'todo', priority: 'high' },
        { _id: 'o2', title: 'Overdue 2', status: 'todo', priority: 'medium' },
        { _id: 'o3', title: 'Overdue 3', status: 'todo', priority: 'low' }
      ];

      const dueTodayTasks = [
        { _id: 't1', title: 'Today 1', status: 'todo', priority: 'high' },
        { _id: 't2', title: 'Today 2', status: 'done', priority: 'medium' }
      ];

      useTodayView.mockReturnValue({
        data: {
          overdue: overdueTasks,
          dueToday: dueTodayTasks,
          inboxCount: 0
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Overdue 1')).toBeInTheDocument();
      expect(screen.getByText('Overdue 2')).toBeInTheDocument();
      expect(screen.getByText('Overdue 3')).toBeInTheDocument();
      expect(screen.getByText('Today 1')).toBeInTheDocument();
      expect(screen.getByText('Today 2')).toBeInTheDocument();
    });

    it('renders multiple events with different types', () => {
      useDayEvents.mockReturnValue({
        data: {
          events: [mockEvent, mockAllDayEvent, mockEventWithLocation, mockEventWithMeetingUrl]
        },
        isLoading: false
      });

      render(<TodayPage />);

      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.getByText('Conference')).toBeInTheDocument();
      expect(screen.getByText('Client Meeting')).toBeInTheDocument();
      expect(screen.getByText('Video Call')).toBeInTheDocument();
      expect(screen.getByText(/schedule \(4\)/i)).toBeInTheDocument();
    });

    it('handles event with originalEventId in key generation', () => {
      const recurringEvent = {
        originalEventId: 'original-123',
        title: 'Recurring Meeting',
        startDate: '2024-01-25T10:00:00',
        endDate: '2024-01-25T11:00:00'
      };

      useDayEvents.mockReturnValue({
        data: { events: [recurringEvent] },
        isLoading: false
      });

      // Should not throw due to missing _id
      expect(() => render(<TodayPage />)).not.toThrow();
      expect(screen.getByText('Recurring Meeting')).toBeInTheDocument();
    });
  });
});
