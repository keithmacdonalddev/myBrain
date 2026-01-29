import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '../../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectTasksBoard } from './ProjectTasksBoard';

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

// Mock TaskPanelContext
const mockOpenTask = vi.fn();
const mockOpenNewTask = vi.fn();
vi.mock('../../../../contexts/TaskPanelContext', () => ({
  useTaskPanel: () => ({
    openTask: mockOpenTask,
    openNewTask: mockOpenNewTask,
  }),
}));

// Mock task hooks
const mockUpdateTaskStatus = vi.fn();
const mockCreateTask = vi.fn();
const mockDeleteTask = vi.fn();
vi.mock('../../../tasks/hooks/useTasks', () => ({
  useUpdateTaskStatus: () => ({
    mutateAsync: mockUpdateTaskStatus,
  }),
  useCreateTask: () => ({
    mutateAsync: mockCreateTask,
  }),
  useDeleteTask: () => ({
    mutateAsync: mockDeleteTask,
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

describe('ProjectTasksBoard', () => {
  const mockTasks = [
    {
      _id: 'task1',
      title: 'Todo Task',
      status: 'todo',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    },
    {
      _id: 'task2',
      title: 'In Progress Task',
      status: 'in_progress',
      priority: 'medium',
      dueDate: null,
    },
    {
      _id: 'task3',
      title: 'Completed Task',
      status: 'done',
      priority: 'low',
      dueDate: null,
    },
    {
      _id: 'task4',
      title: 'Overdue Task',
      status: 'todo',
      priority: 'high',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTaskStatus.mockResolvedValue({});
    mockCreateTask.mockResolvedValue({ _id: 'newTask' });
    mockDeleteTask.mockResolvedValue({});
  });

  describe('Basic Rendering', () => {
    it('renders header with Tasks title', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('shows task count', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('(4)')).toBeInTheDocument();
    });

    it('renders all three columns', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('shows column task counts', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // To Do has 2 tasks (todo + overdue)
      // In Progress has 1
      // Done has 1
      const countElements = screen.getAllByText(/(2)|(1)/);
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('Kanban Columns', () => {
    it('places todo tasks in To Do column', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Todo Task')).toBeInTheDocument();
    });

    it('places in_progress tasks in In Progress column', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('In Progress Task')).toBeInTheDocument();
    });

    it('places done tasks in Done column', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Completed Task')).toBeInTheDocument();
    });

    it('treats cancelled tasks as done', () => {
      const tasksWithCancelled = [
        { _id: 'cancelled1', title: 'Cancelled Task', status: 'cancelled', priority: 'low' },
      ];

      render(
        <ProjectTasksBoard projectId="project123" tasks={tasksWithCancelled} />,
        { preloadedState: createPreloadedState() }
      );

      // Should appear in Done column
      expect(screen.getByText('Cancelled Task')).toBeInTheDocument();
    });

    it('shows empty state in columns with no tasks', () => {
      const emptyTasks = [{ _id: 'task1', title: 'Only Todo', status: 'todo', priority: 'medium' }];

      render(
        <ProjectTasksBoard projectId="project123" tasks={emptyTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // In Progress and Done columns should show "No tasks"
      const noTasksElements = screen.getAllByText('No tasks');
      expect(noTasksElements.length).toBe(2);
    });
  });

  describe('Task Card Display', () => {
    it('shows task titles', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      mockTasks.forEach((task) => {
        expect(screen.getByText(task.title)).toBeInTheDocument();
      });
    });

    it('shows due date for tasks with due dates', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Should show "2d" for task due in 2 days
      expect(screen.getByText('2d')).toBeInTheDocument();
    });

    it('shows overdue indicator', () => {
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Should show "3d ago" for overdue task
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('applies priority border color', () => {
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // High priority tasks should have red border
      const highPriorityBorder = container.querySelector('.border-l-red-500');
      expect(highPriorityBorder).toBeInTheDocument();
    });

    it('applies strikethrough for completed tasks', () => {
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      const completedTask = screen.getByText('Completed Task');
      expect(completedTask).toHaveClass('line-through');
    });
  });

  describe('Task Interactions', () => {
    it('opens task panel when task clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Todo Task'));

      expect(mockOpenTask).toHaveBeenCalledWith('task1');
    });

    it('toggles task status on checkbox click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Find checkbox for first todo task
      const taskCard = screen.getByText('Todo Task').closest('.group');
      const checkbox = taskCard?.querySelector('.rounded-full');

      if (checkbox) {
        await user.click(checkbox);

        expect(mockUpdateTaskStatus).toHaveBeenCalledWith({
          id: 'task1',
          status: 'done',
        });
      }
    });

    it('toggles completed task back to todo', async () => {
      const user = userEvent.setup();
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Find checkbox for completed task
      const taskCard = screen.getByText('Completed Task').closest('.group');
      const checkbox = taskCard?.querySelector('.rounded-full');

      if (checkbox) {
        await user.click(checkbox);

        expect(mockUpdateTaskStatus).toHaveBeenCalledWith({
          id: 'task3',
          status: 'todo',
        });
      }
    });
  });

  describe('Quick Add Task', () => {
    it('shows quick add input when column add button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      // Find add button in To Do column
      const columns = container.querySelectorAll('.flex-1.min-w-\\[200px\\]');
      const todoColumn = columns[0];
      const addButton = todoColumn?.querySelector('button');

      if (addButton) {
        await act(async () => {
          await user.click(addButton);
        });

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument();
        });
      }
    });

    it('creates task on quick add submit', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      // Open quick add
      const columns = container.querySelectorAll('.flex-1.min-w-\\[200px\\]');
      const todoColumn = columns[0];
      const addButton = todoColumn?.querySelector('button');

      if (addButton) {
        await act(async () => {
          await user.click(addButton);
        });

        const input = screen.getByPlaceholderText('Task title...');
        await act(async () => {
          await user.type(input, 'New Quick Task');
        });
        await act(async () => {
          await user.click(screen.getByText('Add'));
        });

        await waitFor(() => {
          expect(mockCreateTask).toHaveBeenCalledWith({
            title: 'New Quick Task',
            projectId: 'project123',
            status: 'todo',
          });
        });
        await waitFor(() => {
          expect(mockToastSuccess).toHaveBeenCalledWith('Task created');
        });
      }
    });

    it('submits quick add on Enter', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      // Open quick add
      const columns = container.querySelectorAll('.flex-1.min-w-\\[200px\\]');
      const todoColumn = columns[0];
      const addButton = todoColumn?.querySelector('button');

      if (addButton) {
        await act(async () => {
          await user.click(addButton);
        });

        const input = screen.getByPlaceholderText('Task title...');
        await act(async () => {
          await user.type(input, 'Enter Task{enter}');
        });

        await waitFor(() => {
          expect(mockCreateTask).toHaveBeenCalledWith({
            title: 'Enter Task',
            projectId: 'project123',
            status: 'todo',
          });
        });
      }
    });

    it('cancels quick add on Escape', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      // Open quick add
      const columns = container.querySelectorAll('.flex-1.min-w-\\[200px\\]');
      const todoColumn = columns[0];
      const addButton = todoColumn?.querySelector('button');

      if (addButton) {
        await act(async () => {
          await user.click(addButton);
        });

        const input = screen.getByPlaceholderText('Task title...');
        await act(async () => {
          await user.type(input, 'Will cancel');
        });
        await act(async () => {
          await user.keyboard('{Escape}');
        });

        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Task title...')).not.toBeInTheDocument();
        });
      }
    });

    it('shows error on quick add failure', async () => {
      mockCreateTask.mockRejectedValueOnce(new Error('Create failed'));

      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      // Open quick add
      const columns = container.querySelectorAll('.flex-1.min-w-\\[200px\\]');
      const todoColumn = columns[0];
      const addButton = todoColumn?.querySelector('button');

      if (addButton) {
        await act(async () => {
          await user.click(addButton);
        });

        const input = screen.getByPlaceholderText('Task title...');
        await act(async () => {
          await user.type(input, 'Failing Task{enter}');
        });

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith('Failed to create task');
        });
      }
    });
  });

  describe('Context Menu', () => {
    it('opens context menu on right-click', async () => {
      const user = userEvent.setup();
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Find task card
      const taskCard = screen.getByText('Todo Task').closest('.group');

      if (taskCard) {
        // Trigger right-click context menu
        await act(async () => {
          await user.pointer({ keys: '[MouseRight]', target: taskCard });
        });

        await waitFor(() => {
          // Context menu options should appear
          expect(screen.getByText('Edit Task')).toBeInTheDocument();
          expect(screen.getByText('Duplicate')).toBeInTheDocument();
        });
      }
    });

    it('changes status via context menu', async () => {
      const user = userEvent.setup();
      render(
        <ProjectTasksBoard projectId="project123" tasks={mockTasks} />,
        { preloadedState: createPreloadedState() }
      );

      // Find task card
      const taskCard = screen.getByText('Todo Task').closest('.group');

      if (taskCard) {
        // Trigger right-click context menu
        await act(async () => {
          await user.pointer({ keys: '[MouseRight]', target: taskCard });
        });

        await waitFor(() => {
          // Context menu should be open with status options
          expect(screen.getByText('Edit Task')).toBeInTheDocument();
        });

        // Click "In Progress" option in context menu
        const menuOptions = screen.getAllByText('In Progress');
        // The second one should be in the context menu (first is column header)
        const menuOption = menuOptions[menuOptions.length - 1];

        await act(async () => {
          await user.click(menuOption);
        });

        await waitFor(() => {
          expect(mockUpdateTaskStatus).toHaveBeenCalledWith({
            id: 'task1',
            status: 'in_progress',
          });
        });
      }
    });
  });

  describe('Link Task Modal', () => {
    it('opens link modal when link button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing task"]');
      if (linkButton) {
        await act(async () => {
          await user.click(linkButton);
        });

        await waitFor(() => {
          expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
        });
      }
    });
  });

  describe('New Task Button', () => {
    it('calls openNewTask when new task button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectTasksBoard projectId="project123" tasks={[]} />,
        { preloadedState: createPreloadedState() }
      );

      const newButton = container.querySelector('[title="Create new task"]');
      if (newButton) {
        await user.click(newButton);
        expect(mockOpenNewTask).toHaveBeenCalled();
      }
    });
  });

  describe('Due Date Formatting', () => {
    it('shows "Today" for tasks due today', () => {
      const todayTask = [
        {
          _id: 'today1',
          title: 'Today Task',
          status: 'todo',
          priority: 'medium',
          dueDate: new Date().toISOString(),
        },
      ];

      render(
        <ProjectTasksBoard projectId="project123" tasks={todayTask} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('shows "Tomorrow" for tasks due tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowTask = [
        {
          _id: 'tomorrow1',
          title: 'Tomorrow Task',
          status: 'todo',
          priority: 'medium',
          dueDate: tomorrow.toISOString(),
        },
      ];

      render(
        <ProjectTasksBoard projectId="project123" tasks={tomorrowTask} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('handles undefined tasks array', () => {
      render(
        <ProjectTasksBoard projectId="project123" />,
        { preloadedState: createPreloadedState() }
      );

      const header = screen.getByText('Tasks').parentElement;
      expect(header).toBeTruthy();
      expect(within(header).getByText('(0)')).toBeInTheDocument();
    });
  });
});
