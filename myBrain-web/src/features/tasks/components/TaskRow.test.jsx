import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import TaskRow from './TaskRow';

// Mock the TaskPanelContext
const mockOpenTask = vi.fn();

vi.mock('../../../contexts/TaskPanelContext', () => ({
  useTaskPanel: () => ({
    openTask: mockOpenTask,
    openNewTask: vi.fn(),
    closeTask: vi.fn(),
    isOpen: false,
    taskId: null,
  }),
}));

// Mock the useTasks hooks
const mockUpdateStatusMutate = vi.fn();

vi.mock('../hooks/useTasks', () => ({
  useUpdateTaskStatus: () => ({
    mutate: mockUpdateStatusMutate,
    isPending: false,
  }),
}));

// Mock dateUtils
vi.mock('../../../lib/dateUtils', () => ({
  getDueDateDisplay: vi.fn((dueDate) => {
    if (!dueDate) return null;

    // Match the actual function's logic: normalize dates to day boundaries
    const d = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Overdue', className: 'bg-red-100 text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Today', className: 'bg-yellow-100 text-yellow-600' };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', className: 'bg-blue-100 text-blue-600' };
    } else {
      return { text: d.toLocaleDateString(), className: 'bg-gray-100 text-gray-600' };
    }
  }),
}));

// Helper to create default preloaded state
const createPreloadedState = () => ({
  auth: {
    user: { _id: 'user123', email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    loading: false,
  },
  lifeAreas: {
    items: [],
    loading: false,
    error: null,
  },
  theme: {
    mode: 'light',
    effectiveTheme: 'light',
  },
  toast: {
    toasts: [],
  },
});

describe('TaskRow', () => {
  // Default task for testing
  const defaultTask = {
    _id: 'task123',
    title: 'Test Task',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the task title', () => {
      render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('renders the status icon button', () => {
      const { container } = render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = container.querySelector('button');
      expect(statusButton).toBeInTheDocument();
    });

    it('renders as a clickable row', () => {
      const { container } = render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const row = container.querySelector('.cursor-pointer');
      expect(row).toBeInTheDocument();
    });
  });

  describe('Task Status Display', () => {
    it('shows todo status icon for todo tasks', () => {
      const todoTask = { ...defaultTask, status: 'todo' };

      const { container } = render(<TaskRow task={todoTask} />, {
        preloadedState: createPreloadedState(),
      });

      // The Circle icon is used for todo status
      const statusButton = container.querySelector('button');
      expect(statusButton).toHaveClass('text-muted');
    });

    it('shows in_progress status icon for in_progress tasks', () => {
      const inProgressTask = { ...defaultTask, status: 'in_progress' };

      const { container } = render(<TaskRow task={inProgressTask} />, {
        preloadedState: createPreloadedState(),
      });

      // The Clock icon is used for in_progress status
      const statusButton = container.querySelector('button');
      expect(statusButton).toHaveClass('text-blue-500');
    });

    it('shows done status icon for completed tasks', () => {
      const doneTask = { ...defaultTask, status: 'done' };

      const { container } = render(<TaskRow task={doneTask} />, {
        preloadedState: createPreloadedState(),
      });

      // The CheckCircle2 icon is used for done status
      const statusButton = container.querySelector('button');
      expect(statusButton).toHaveClass('text-green-500');
    });

    it('shows cancelled status icon for cancelled tasks', () => {
      const cancelledTask = { ...defaultTask, status: 'cancelled' };

      const { container } = render(<TaskRow task={cancelledTask} />, {
        preloadedState: createPreloadedState(),
      });

      // The XCircle icon is used for cancelled status
      const statusButton = container.querySelector('button');
      expect(statusButton).toHaveClass('text-red-500');
    });

    it('applies strikethrough style to completed task title', () => {
      const doneTask = { ...defaultTask, status: 'done' };

      render(<TaskRow task={doneTask} />, {
        preloadedState: createPreloadedState(),
      });

      const title = screen.getByText('Test Task');
      expect(title).toHaveClass('line-through');
      expect(title).toHaveClass('text-muted');
    });

    it('applies strikethrough style to cancelled task title', () => {
      const cancelledTask = { ...defaultTask, status: 'cancelled' };

      render(<TaskRow task={cancelledTask} />, {
        preloadedState: createPreloadedState(),
      });

      const title = screen.getByText('Test Task');
      expect(title).toHaveClass('line-through');
    });

    it('does not apply strikethrough to active task title', () => {
      render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const title = screen.getByText('Test Task');
      expect(title).not.toHaveClass('line-through');
      expect(title).toHaveClass('text-text');
    });
  });

  describe('Priority Display', () => {
    it('shows priority flag for high priority tasks', () => {
      const highPriorityTask = { ...defaultTask, priority: 'high' };

      const { container } = render(<TaskRow task={highPriorityTask} />, {
        preloadedState: createPreloadedState(),
      });

      // High priority shows a red flag icon
      const flagIcon = container.querySelector('.text-red-500');
      expect(flagIcon).toBeInTheDocument();
    });

    it('shows priority flag for low priority tasks', () => {
      const lowPriorityTask = { ...defaultTask, priority: 'low' };

      const { container } = render(<TaskRow task={lowPriorityTask} />, {
        preloadedState: createPreloadedState(),
      });

      // Low priority shows a gray flag icon
      const flagIcon = container.querySelector('.text-gray-400');
      expect(flagIcon).toBeInTheDocument();
    });

    it('does not show priority flag for medium priority tasks', () => {
      const mediumPriorityTask = { ...defaultTask, priority: 'medium' };

      const { container } = render(<TaskRow task={mediumPriorityTask} />, {
        preloadedState: createPreloadedState(),
      });

      // Medium priority does not show flag - Flag class would indicate priority
      const flagIcons = container.querySelectorAll('.w-3.h-3');
      // Filter to only flag-like icons (not other small icons)
      const priorityFlags = Array.from(flagIcons).filter(
        (el) => el.classList.contains('text-red-500') || el.classList.contains('text-gray-400')
      );
      expect(priorityFlags.length).toBe(0);
    });
  });

  describe('Due Date Display', () => {
    it('shows due date badge for tasks with due date', () => {
      // Use today's date since the mock returns "Today" for dates that match current date
      const today = new Date();
      const taskWithDueDate = {
        ...defaultTask,
        dueDate: today.toISOString(),
      };

      render(<TaskRow task={taskWithDueDate} />, {
        preloadedState: createPreloadedState(),
      });

      // The due date text should be visible (mock returns "Today" for today's date)
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('does not show due date for tasks without due date', () => {
      render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByText('Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
      expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    });

    it('does not show due date for completed tasks', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const completedTaskWithDueDate = {
        ...defaultTask,
        status: 'done',
        dueDate: tomorrow.toISOString(),
      };

      render(<TaskRow task={completedTaskWithDueDate} />, {
        preloadedState: createPreloadedState(),
      });

      // Due date should not be visible for completed tasks
      expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
    });
  });

  describe('Tags Display', () => {
    it('displays task tags', () => {
      const taskWithTags = {
        ...defaultTask,
        tags: ['urgent', 'work'],
      };

      render(<TaskRow task={taskWithTags} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('shows only first two tags when there are more', () => {
      const taskWithManyTags = {
        ...defaultTask,
        tags: ['urgent', 'work', 'personal', 'home'],
      };

      render(<TaskRow task={taskWithManyTags} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.queryByText('personal')).not.toBeInTheDocument();
      expect(screen.queryByText('home')).not.toBeInTheDocument();
      // Shows +2 indicator
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('does not show tags indicator when task has no tags', () => {
      render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('opens task panel when row is clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const row = container.querySelector('.cursor-pointer');
      await user.click(row);

      expect(mockOpenTask).toHaveBeenCalledWith('task123');
    });

    it('toggles status when status button is clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = container.querySelector('button');
      await user.click(statusButton);

      // Should toggle from todo to done
      expect(mockUpdateStatusMutate).toHaveBeenCalledWith({
        id: 'task123',
        status: 'done',
      });
    });

    it('toggles from done to todo when clicking completed task status', async () => {
      const user = userEvent.setup();
      const doneTask = { ...defaultTask, status: 'done' };

      const { container } = render(<TaskRow task={doneTask} />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = container.querySelector('button');
      await user.click(statusButton);

      // Should toggle from done to todo
      expect(mockUpdateStatusMutate).toHaveBeenCalledWith({
        id: 'task123',
        status: 'todo',
      });
    });

    it('status click does not trigger row click', async () => {
      const user = userEvent.setup();

      const { container } = render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = container.querySelector('button');
      await user.click(statusButton);

      // openTask should not be called when clicking status button
      expect(mockOpenTask).not.toHaveBeenCalled();
    });
  });

  describe('Different Task States', () => {
    it('renders task with all metadata', () => {
      const fullTask = {
        _id: 'task456',
        title: 'Complete Project Report',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date().toISOString(), // Today
        tags: ['work', 'important'],
      };

      const { container } = render(<TaskRow task={fullTask} />, {
        preloadedState: createPreloadedState(),
      });

      // Title
      expect(screen.getByText('Complete Project Report')).toBeInTheDocument();

      // Status indicator
      const statusButton = container.querySelector('button');
      expect(statusButton).toHaveClass('text-blue-500');

      // Priority flag
      const flagIcon = container.querySelector('.text-red-500');
      expect(flagIcon).toBeInTheDocument();

      // Tags
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('renders minimal task with only required fields', () => {
      const minimalTask = {
        _id: 'task789',
        title: 'Simple Task',
        status: 'todo',
        priority: 'medium',
      };

      render(<TaskRow task={minimalTask} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Simple Task')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('has correct styling for active todo task', () => {
      render(<TaskRow task={defaultTask} />, {
        preloadedState: createPreloadedState(),
      });

      const title = screen.getByText('Test Task');
      expect(title).toHaveClass('text-text');
      expect(title).not.toHaveClass('line-through');
    });

    it('has correct styling for completed task', () => {
      const doneTask = { ...defaultTask, status: 'done' };

      render(<TaskRow task={doneTask} />, {
        preloadedState: createPreloadedState(),
      });

      const title = screen.getByText('Test Task');
      expect(title).toHaveClass('text-muted');
      expect(title).toHaveClass('line-through');
    });
  });
});
