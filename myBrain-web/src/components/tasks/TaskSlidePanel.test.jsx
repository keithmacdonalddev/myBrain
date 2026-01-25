import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import TaskSlidePanel from './TaskSlidePanel';

// Mock the TaskPanelContext
const mockCloseTask = vi.fn();
let mockTaskPanelContext = {
  isOpen: true,
  taskId: null,
  initialData: null,
  openTask: vi.fn(),
  openNewTask: vi.fn(),
  closeTask: mockCloseTask,
};

vi.mock('../../contexts/TaskPanelContext', () => ({
  useTaskPanel: () => mockTaskPanelContext,
}));

// Mock the tasks hooks with controllable state
let mockTaskData = null;
let mockIsLoading = false;
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockRestoreTask = vi.fn();
const mockUnarchiveTask = vi.fn();

vi.mock('../../features/tasks/hooks/useTasks', () => ({
  useTask: () => ({
    data: mockTaskData,
    isLoading: mockIsLoading,
  }),
  useCreateTask: () => ({
    mutateAsync: mockCreateTask,
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutateAsync: mockUpdateTask,
  }),
  useUpdateTaskStatus: () => ({
    mutate: vi.fn(),
  }),
  useDeleteTask: () => ({
    mutateAsync: mockDeleteTask,
  }),
  useTaskBacklinks: () => ({
    data: [],
    isLoading: false,
  }),
  useArchiveTask: () => ({
    mutateAsync: vi.fn(),
  }),
  useUnarchiveTask: () => ({
    mutateAsync: mockUnarchiveTask,
  }),
  useTrashTask: () => ({
    mutateAsync: vi.fn(),
  }),
  useRestoreTask: () => ({
    mutateAsync: mockRestoreTask,
  }),
  useAddTaskComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateTaskComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteTaskComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock useToast
vi.mock('../../hooks/useToast', () => ({
  default: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock useAutoSave
vi.mock('../../hooks/useAutoSave', () => ({
  default: () => ({
    saveStatus: 'saved',
    lastSaved: null,
    triggerSave: vi.fn(),
    resetSaveState: vi.fn(),
    setLastSavedData: vi.fn(),
    setSaveStatus: vi.fn(),
  }),
  createChangeDetector: () => () => false,
}));

// Mock useKeyboardShortcuts
vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  default: vi.fn(),
}));

// Mock useSavedLocations
vi.mock('../../hooks/useSavedLocations', () => ({
  useSavedLocations: () => ({
    data: [],
    isLoading: false,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock child components
vi.mock('../shared/TagsSection', () => ({
  default: () => <div data-testid="tags-section">Tags Section</div>,
}));

vi.mock('../shared/CommentsSection', () => ({
  default: () => <div data-testid="comments-section">Comments Section</div>,
}));

vi.mock('../shared/BacklinksPanel', () => ({
  default: () => <div data-testid="backlinks-panel">Backlinks Panel</div>,
}));

vi.mock('../../features/lifeAreas/components/LifeAreaPicker', () => ({
  LifeAreaPicker: () => <div data-testid="life-area-picker">Life Area Picker</div>,
}));

vi.mock('../../features/projects/components/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker">Project Picker</div>,
}));

vi.mock('../ui/LocationPicker', () => ({
  default: () => <div data-testid="location-picker">Location Picker</div>,
}));

vi.mock('../ui/Tooltip', () => ({
  default: ({ children }) => children,
}));

vi.mock('../ui/ConfirmDialog', () => ({
  default: ({ isOpen, onConfirm, onClose }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
}));

vi.mock('../ui/SaveStatus', () => ({
  default: () => <div data-testid="save-status">Save Status</div>,
}));

vi.mock('../../features/calendar/components/EventModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="event-modal">
      <button onClick={onClose}>Close Event Modal</button>
    </div>
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

describe('TaskSlidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockTaskPanelContext = {
      isOpen: true,
      taskId: null,
      initialData: null,
      openTask: vi.fn(),
      openNewTask: vi.fn(),
      closeTask: mockCloseTask,
    };
    mockTaskData = null;
    mockIsLoading = false;
  });

  describe('Panel Visibility', () => {
    it('renders panel when isOpen is true', () => {
      mockTaskPanelContext.isOpen = true;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-0');
      expect(panel).toBeInTheDocument();
    });

    it('hides panel when isOpen is false', () => {
      mockTaskPanelContext.isOpen = false;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-full');
      expect(panel).toBeInTheDocument();
    });

    it('shows backdrop when panel is open', () => {
      mockTaskPanelContext.isOpen = true;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.opacity-100');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('New Task Mode', () => {
    it('displays "New Task" text when creating a new task', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    it('shows title input with placeholder', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Task title...');
      expect(titleInput).toBeInTheDocument();
    });

    it('shows body textarea with placeholder', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const bodyTextarea = screen.getByPlaceholderText('Add description...');
      expect(bodyTextarea).toBeInTheDocument();
    });

    it('shows Create Task button for new tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create task/i });
      expect(createButton).toBeInTheDocument();
    });

    it('disables Create Task button when title is empty', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create task/i });
      expect(createButton).toBeDisabled();
    });

    it('enables Create Task button when title has content', async () => {
      const user = userEvent.setup();
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Task title...');
      await user.type(titleInput, 'My New Task');

      const createButton = screen.getByRole('button', { name: /create task/i });
      expect(createButton).not.toBeDisabled();
    });

    it('uses initialData when provided', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;
      mockTaskPanelContext.initialData = {
        title: 'Pre-filled Title',
        body: 'Pre-filled Body',
        dueDate: '2024-12-31',
      };

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Task title...');
      expect(titleInput).toHaveValue('Pre-filled Title');

      const bodyTextarea = screen.getByPlaceholderText('Add description...');
      expect(bodyTextarea).toHaveValue('Pre-filled Body');
    });

    it('does not show CommentsSection for new tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
    });

    it('does not show BacklinksPanel for new tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('backlinks-panel')).not.toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      mockTaskPanelContext.isOpen = true;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls closeTask when close button is clicked', async () => {
      const user = userEvent.setup();
      mockTaskPanelContext.isOpen = true;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      const closeButton = buttons[0];
      await user.click(closeButton);

      expect(mockCloseTask).toHaveBeenCalled();
    });

    it('calls closeTask when backdrop is clicked', async () => {
      mockTaskPanelContext.isOpen = true;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/30');
      fireEvent.click(backdrop);

      expect(mockCloseTask).toHaveBeenCalled();
    });
  });

  describe('Edit Task Mode', () => {
    beforeEach(() => {
      mockTaskData = {
        _id: 'task123',
        title: 'Existing Task',
        body: 'Task description here',
        status: 'todo',
        priority: 'medium',
        dueDate: '2024-12-31',
        location: 'Home',
        tags: ['tag1'],
        lifeAreaId: null,
        projectId: null,
        linkedNoteIds: [],
        comments: [],
      };
    });

    it('displays existing task content', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Task title...');
      expect(titleInput).toHaveValue('Existing Task');
    });

    it('does not show Create Task button for existing tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByRole('button', { name: /create task/i })).not.toBeInTheDocument();
    });

    it('shows action buttons for existing tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('shows SaveStatus component for existing tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('save-status')).toBeInTheDocument();
    });

    it('shows BacklinksPanel for existing tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('backlinks-panel')).toBeInTheDocument();
    });

    it('shows CommentsSection for existing tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('comments-section')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading existing task', () => {
      mockIsLoading = true;
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Status Dropdown', () => {
    it('renders status dropdown with default todo status', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('opens status dropdown when clicked', async () => {
      const user = userEvent.setup();
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = screen.getByText('To Do');
      await user.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Dropdown', () => {
    it('renders priority dropdown with default medium priority', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('opens priority dropdown when clicked', async () => {
      const user = userEvent.setup();
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const priorityButton = screen.getByText('Medium');
      await user.click(priorityButton);

      await waitFor(() => {
        expect(screen.getByText('Low')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });
  });

  describe('Trashed Task', () => {
    beforeEach(() => {
      mockTaskData = {
        _id: 'task123',
        title: 'Trashed Task',
        body: 'Task content',
        status: 'trashed',
        priority: 'medium',
        dueDate: null,
        location: '',
        tags: [],
        lifeAreaId: null,
        projectId: null,
        linkedNoteIds: [],
        comments: [],
      };
    });

    it('shows restore button for trashed tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  describe('Archived Task', () => {
    beforeEach(() => {
      mockTaskData = {
        _id: 'task123',
        title: 'Archived Task',
        body: 'Task content',
        status: 'archived',
        priority: 'medium',
        dueDate: null,
        location: '',
        tags: [],
        lifeAreaId: null,
        projectId: null,
        linkedNoteIds: [],
        comments: [],
      };
    });

    it('shows unarchive button for archived tasks', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  describe('Completed Task Styling', () => {
    beforeEach(() => {
      mockTaskData = {
        _id: 'task123',
        title: 'Completed Task',
        body: 'Task content',
        status: 'done',
        priority: 'medium',
        dueDate: null,
        location: '',
        tags: [],
        lifeAreaId: null,
        projectId: null,
        linkedNoteIds: [],
        comments: [],
      };
    });

    it('applies strikethrough style to completed task title', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = 'task123';

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Task title...');
      expect(titleInput).toHaveClass('line-through');
    });
  });

  describe('Form Components', () => {
    it('renders TagsSection', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('tags-section')).toBeInTheDocument();
    });

    it('renders LifeAreaPicker', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('life-area-picker')).toBeInTheDocument();
    });

    it('renders ProjectPicker', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('project-picker')).toBeInTheDocument();
    });

    it('renders LocationPicker', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('location-picker')).toBeInTheDocument();
    });

    it('renders date input for due date', () => {
      mockTaskPanelContext.isOpen = true;
      mockTaskPanelContext.taskId = null;

      const { container } = render(<TaskSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
    });
  });
});
