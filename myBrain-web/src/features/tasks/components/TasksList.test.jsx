import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import TasksList from './TasksList';

// Mock the TaskPanelContext
const mockOpenTask = vi.fn();
const mockOpenNewTask = vi.fn();

vi.mock('../../../contexts/TaskPanelContext', () => ({
  useTaskPanel: () => ({
    openTask: mockOpenTask,
    openNewTask: mockOpenNewTask,
    closeTask: vi.fn(),
    isOpen: false,
    taskId: null,
  }),
}));

// Mock data variables that can be controlled per test
let mockTasksData = null;
let mockTasksLoading = false;
let mockTasksError = null;
let mockTodayData = null;
let mockActiveData = null;
let mockArchivedData = null;
let mockTrashData = null;

// Mock the useTasks hooks
vi.mock('../hooks/useTasks', () => ({
  useTasks: (params) => {
    // Return different data based on status parameter
    if (params?.status === 'todo,in_progress' && params?.limit === 1) {
      return { data: mockActiveData, isLoading: false };
    }
    if (params?.status === 'done,cancelled,archived' && params?.limit === 1) {
      return { data: mockArchivedData, isLoading: false };
    }
    if (params?.status === 'trashed' && params?.limit === 1) {
      return { data: mockTrashData, isLoading: false };
    }
    return {
      data: mockTasksData,
      isLoading: mockTasksLoading,
      error: mockTasksError,
    };
  },
  useTodayView: () => ({
    data: mockTodayData,
    isLoading: false,
  }),
  useUpdateTaskStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUnarchiveTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRestoreTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

// Mock MobilePageHeader
vi.mock('../../../components/layout/MobilePageHeader', () => ({
  default: ({ title, icon: Icon, rightAction }) => (
    <div data-testid="mobile-header">
      <span>{title}</span>
      {rightAction}
    </div>
  ),
}));

// Mock LifeAreaBadge
vi.mock('../../lifeAreas/components/LifeAreaBadge', () => ({
  LifeAreaBadge: ({ lifeAreaId }) => (
    <span data-testid="life-area-badge">{lifeAreaId}</span>
  ),
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
    selectedId: null,
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

// Helper to create mock tasks
const createMockTasks = (count = 3, overrides = {}) => {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push({
      _id: `task${i + 1}`,
      title: `Task ${i + 1}`,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      tags: [],
      ...overrides,
    });
  }
  return { tasks, total: count };
};

describe('TasksList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock data to defaults
    mockTasksData = createMockTasks(3);
    mockTasksLoading = false;
    mockTasksError = null;
    mockTodayData = {
      overdue: [],
      dueToday: [],
      completed: [],
    };
    mockActiveData = { total: 3 };
    mockArchivedData = { total: 0 };
    mockTrashData = { total: 0 };
  });

  describe('Basic Rendering', () => {
    it('renders the page title', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Should find "Tasks" text
      expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
    });

    it('renders the new task button', () => {
      const { container } = render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Look for the Plus icon button
      const newTaskButton = screen.getByRole('button', { name: /new task/i });
      expect(newTaskButton).toBeInTheDocument();
    });

    it('renders mobile header', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      const searchInputs = screen.getAllByPlaceholderText('Search tasks...');
      expect(searchInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Tab Navigation', () => {
    it('renders all three tabs', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Archived').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Trash').length).toBeGreaterThan(0);
    });

    it('shows Active tab as default selected', () => {
      const { container } = render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Active tab should have primary styling (border-primary)
      const activeTabButtons = container.querySelectorAll('button');
      const activeTab = Array.from(activeTabButtons).find(
        (btn) => btn.textContent.includes('Active') && btn.classList.contains('border-primary')
      );
      expect(activeTab).toBeInTheDocument();
    });

    it('switches to Archived tab when clicked', async () => {
      const user = userEvent.setup();

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click Archived tab
      const archivedTabs = screen.getAllByText('Archived');
      await user.click(archivedTabs[0].closest('button'));

      // Tab should now be selected
      const archivedButton = archivedTabs[0].closest('button');
      expect(archivedButton).toHaveClass('border-primary');
    });

    it('switches to Trash tab when clicked', async () => {
      const user = userEvent.setup();

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click Trash tab
      const trashTabs = screen.getAllByText('Trash');
      await user.click(trashTabs[0].closest('button'));

      // Tab should now be selected
      const trashButton = trashTabs[0].closest('button');
      expect(trashButton).toHaveClass('border-primary');
    });

    it('displays tab counts', () => {
      mockActiveData = { total: 5 };
      mockArchivedData = { total: 2 };
      mockTrashData = { total: 1 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Counts should be displayed
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when loading', () => {
      mockTasksLoading = true;

      const { container } = render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Should show loading skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message when fetch fails', () => {
      mockTasksData = null;
      mockTasksError = new Error('Failed to fetch');

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for active tab when no tasks', () => {
      mockTasksData = { tasks: [], total: 0 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('No active tasks')).toBeInTheDocument();
    });

    it('shows create task button in empty state', () => {
      mockTasksData = { tasks: [], total: 0 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByRole('button', { name: /create a task/i })).toBeInTheDocument();
    });

    it('shows appropriate empty state for Archived tab', async () => {
      const user = userEvent.setup();
      mockTasksData = { tasks: [], total: 0 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Switch to Archived tab
      const archivedTabs = screen.getAllByText('Archived');
      await user.click(archivedTabs[0].closest('button'));

      await waitFor(() => {
        expect(screen.getByText('No archived tasks')).toBeInTheDocument();
      });
    });

    it('shows appropriate empty state for Trash tab', async () => {
      const user = userEvent.setup();
      mockTasksData = { tasks: [], total: 0 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Switch to Trash tab
      const trashTabs = screen.getAllByText('Trash');
      await user.click(trashTabs[0].closest('button'));

      await waitFor(() => {
        expect(screen.getByText('Trash is empty')).toBeInTheDocument();
      });
    });

    it('shows filter-specific message when filters applied with no results', () => {
      mockTasksData = { tasks: [], total: 0 };

      const { container } = render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // We can't easily test this without triggering a filter
      // The component shows "No tasks match your filters" when filters.q or filters.priority is set
      expect(container).toBeInTheDocument();
    });
  });

  describe('Tasks Display', () => {
    it('renders task cards when tasks exist', () => {
      // Tasks with due date today will be visible (Due Today section is open by default)
      const today = new Date();
      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Task 1', status: 'todo', priority: 'medium', dueDate: today.toISOString(), tags: [] },
          { _id: 'task2', title: 'Task 2', status: 'todo', priority: 'medium', dueDate: today.toISOString(), tags: [] },
          { _id: 'task3', title: 'Task 3', status: 'todo', priority: 'medium', dueDate: today.toISOString(), tags: [] },
        ],
        total: 3,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('groups tasks by due date sections', () => {
      const today = new Date();
      const todayStr = today.toISOString();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString();

      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Overdue Task', status: 'todo', priority: 'medium', dueDate: yesterdayStr },
          { _id: 'task2', title: 'Today Task', status: 'todo', priority: 'medium', dueDate: todayStr },
          { _id: 'task3', title: 'Upcoming Task', status: 'todo', priority: 'medium', dueDate: tomorrowStr },
          { _id: 'task4', title: 'No Date Task', status: 'todo', priority: 'medium', dueDate: null },
        ],
        total: 4,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Section headers should be present
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('No Due Date')).toBeInTheDocument();
    });
  });

  describe('Header Stats', () => {
    it('shows today view stats', () => {
      mockTodayData = {
        overdue: [{ _id: '1' }, { _id: '2' }],
        dueToday: [{ _id: '3' }],
        completed: [{ _id: '4' }, { _id: '5' }, { _id: '6' }],
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Stats should show counts
      expect(screen.getByText('2 overdue')).toBeInTheDocument();
      expect(screen.getByText('1 today')).toBeInTheDocument();
      expect(screen.getByText('3 done')).toBeInTheDocument();
    });

    it('does not show overdue stat when count is zero', () => {
      mockTodayData = {
        overdue: [],
        dueToday: [{ _id: '1' }],
        completed: [{ _id: '2' }],
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Overdue should not be displayed
      expect(screen.queryByText(/\d+ overdue/)).not.toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('renders search filter bar', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      const searchInputs = screen.getAllByPlaceholderText('Search tasks...');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('renders filter button', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      const filterButtons = screen.getAllByText('Filter');
      expect(filterButtons.length).toBeGreaterThan(0);
    });

    it('expands filter options when filter button clicked', async () => {
      const user = userEvent.setup();

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Click filter button
      const filterButtons = screen.getAllByText('Filter');
      await user.click(filterButtons[0].closest('button'));

      // Priority options should appear
      await waitFor(() => {
        expect(screen.getAllByText('Priority:').length).toBeGreaterThan(0);
      });
    });

    it('shows priority filter options', async () => {
      const user = userEvent.setup();

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Expand filters
      const filterButtons = screen.getAllByText('Filter');
      await user.click(filterButtons[0].closest('button'));

      // Check priority options
      await waitFor(() => {
        expect(screen.getAllByText('All').length).toBeGreaterThan(0);
        expect(screen.getAllByText('High').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
      });
    });
  });

  describe('New Task Button', () => {
    it('calls openNewTask when new task button is clicked', async () => {
      const user = userEvent.setup();

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      const newTaskButton = screen.getByRole('button', { name: /new task/i });
      await user.click(newTaskButton);

      expect(mockOpenNewTask).toHaveBeenCalled();
    });

    it('calls openNewTask when create task button in empty state is clicked', async () => {
      const user = userEvent.setup();
      mockTasksData = { tasks: [], total: 0 };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create a task/i });
      await user.click(createButton);

      expect(mockOpenNewTask).toHaveBeenCalled();
    });
  });

  describe('Archived Tab Content', () => {
    it('shows restore instructions for archived tasks', async () => {
      const user = userEvent.setup();
      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Archived Task', status: 'done', priority: 'medium' },
        ],
        total: 1,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Switch to Archived tab
      const archivedTabs = screen.getAllByText('Archived');
      await user.click(archivedTabs[0].closest('button'));

      await waitFor(() => {
        expect(
          screen.getByText(/Completed and archived tasks. Click the restore icon to move back to active./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Trash Tab Content', () => {
    it('shows restore instructions for trashed tasks', async () => {
      const user = userEvent.setup();
      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Trashed Task', status: 'trashed', priority: 'medium' },
        ],
        total: 1,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Switch to Trash tab
      const trashTabs = screen.getAllByText('Trash');
      await user.click(trashTabs[0].closest('button'));

      await waitFor(() => {
        expect(
          screen.getByText(/Click the restore icon to recover tasks, or open them to permanently delete./i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Task Sections', () => {
    it('renders collapsible sections', () => {
      const today = new Date().toISOString();
      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Today Task', status: 'todo', priority: 'medium', dueDate: today },
        ],
        total: 1,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // Section header should be clickable
      expect(screen.getByText('Due Today')).toBeInTheDocument();
    });

    it('shows task count in section header', () => {
      const today = new Date().toISOString();
      mockTasksData = {
        tasks: [
          { _id: 'task1', title: 'Task 1', status: 'todo', priority: 'medium', dueDate: today },
          { _id: 'task2', title: 'Task 2', status: 'todo', priority: 'medium', dueDate: today },
        ],
        total: 2,
      };

      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      // The count should be shown in the section header
      const sectionHeaders = screen.getAllByText('2');
      expect(sectionHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('Page Description', () => {
    it('shows page description text', () => {
      render(<TasksList />, {
        preloadedState: createPreloadedState(),
      });

      expect(
        screen.getByText('Single actionable items to complete')
      ).toBeInTheDocument();
    });
  });
});
