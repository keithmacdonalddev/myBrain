import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ProjectSlidePanel from './ProjectSlidePanel';

// Mock the ProjectPanelContext
const mockCloseProject = vi.fn();
let mockProjectPanelContext = {
  isOpen: true,
  projectId: null,
  openProject: vi.fn(),
  openNewProject: vi.fn(),
  closeProject: mockCloseProject,
};

vi.mock('../../contexts/ProjectPanelContext', () => ({
  useProjectPanel: () => mockProjectPanelContext,
}));

// Mock the projects hooks with controllable state
let mockProjectData = null;
let mockIsLoading = false;
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();

vi.mock('../../features/projects/hooks/useProjects', () => ({
  useProject: () => ({
    data: mockProjectData,
    isLoading: mockIsLoading,
  }),
  useCreateProject: () => ({
    mutateAsync: mockCreateProject,
    isPending: false,
  }),
  useUpdateProject: () => ({
    mutateAsync: mockUpdateProject,
  }),
  useDeleteProject: () => ({
    mutateAsync: mockDeleteProject,
  }),
  useAddProjectComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateProjectComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteProjectComment: () => ({
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

// Mock child components
vi.mock('../shared/TagsSection', () => ({
  default: () => <div data-testid="tags-section">Tags Section</div>,
}));

vi.mock('../shared/CommentsSection', () => ({
  default: () => <div data-testid="comments-section">Comments Section</div>,
}));

vi.mock('../../features/lifeAreas/components/LifeAreaPicker', () => ({
  LifeAreaPicker: () => <div data-testid="life-area-picker">Life Area Picker</div>,
}));

vi.mock('../../features/projects/components/LinkedItemsSection', () => ({
  LinkedItemsSection: () => <div data-testid="linked-items-section">Linked Items</div>,
}));

vi.mock('../../features/projects/components/LinkItemModal', () => ({
  LinkItemModal: () => <div data-testid="link-item-modal">Link Item Modal</div>,
}));

vi.mock('../../features/projects/components/ProjectProgress', () => ({
  ProjectProgress: () => <div data-testid="project-progress">Project Progress</div>,
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

describe('ProjectSlidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockProjectPanelContext = {
      isOpen: true,
      projectId: null,
      openProject: vi.fn(),
      openNewProject: vi.fn(),
      closeProject: mockCloseProject,
    };
    mockProjectData = null;
    mockIsLoading = false;
  });

  describe('Panel Visibility', () => {
    it('renders panel when isOpen is true', () => {
      mockProjectPanelContext.isOpen = true;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-0');
      expect(panel).toBeInTheDocument();
    });

    it('hides panel when isOpen is false', () => {
      mockProjectPanelContext.isOpen = false;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-full');
      expect(panel).toBeInTheDocument();
    });

    it('shows backdrop when panel is open', () => {
      mockProjectPanelContext.isOpen = true;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.opacity-100');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('New Project Mode', () => {
    it('displays "New Project" text when creating a new project', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('shows title input with placeholder', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Project title...');
      expect(titleInput).toBeInTheDocument();
    });

    it('shows description textarea with placeholder', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const descTextarea = screen.getByPlaceholderText('Project details...');
      expect(descTextarea).toBeInTheDocument();
    });

    it('shows outcome input with placeholder', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const outcomeInput = screen.getByPlaceholderText('What does success look like?');
      expect(outcomeInput).toBeInTheDocument();
    });

    it('shows Create Project button for new projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton).toBeInTheDocument();
    });

    it('disables Create Project button when title is empty', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton).toBeDisabled();
    });

    it('enables Create Project button when title has content', async () => {
      const user = userEvent.setup();
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Project title...');
      await user.type(titleInput, 'My New Project');

      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton).not.toBeDisabled();
    });

    it('does not show LinkedItemsSection for new projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('linked-items-section')).not.toBeInTheDocument();
    });

    it('does not show CommentsSection for new projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      mockProjectPanelContext.isOpen = true;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls closeProject when close button is clicked', async () => {
      const user = userEvent.setup();
      mockProjectPanelContext.isOpen = true;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      const closeButton = buttons[0];
      await user.click(closeButton);

      expect(mockCloseProject).toHaveBeenCalled();
    });

    it('calls closeProject when backdrop is clicked', async () => {
      mockProjectPanelContext.isOpen = true;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/30');
      fireEvent.click(backdrop);

      expect(mockCloseProject).toHaveBeenCalled();
    });
  });

  describe('Edit Project Mode', () => {
    beforeEach(() => {
      mockProjectData = {
        _id: 'project123',
        title: 'Existing Project',
        description: 'Project description here',
        outcome: 'Expected outcome',
        status: 'active',
        priority: 'medium',
        deadline: '2024-12-31',
        lifeAreaId: null,
        tags: ['tag1'],
        pinned: false,
        linkedNotes: [],
        linkedTasks: [],
        linkedEvents: [],
        comments: [],
        progress: { completed: 0, total: 0 },
      };
    });

    it('displays existing project content', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Project title...');
      expect(titleInput).toHaveValue('Existing Project');
    });

    it('does not show Create Project button for existing projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByRole('button', { name: /create project/i })).not.toBeInTheDocument();
    });

    it('shows SaveStatus component for existing projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('save-status')).toBeInTheDocument();
    });

    it('shows LinkedItemsSection for existing projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const linkedSections = screen.getAllByTestId('linked-items-section');
      expect(linkedSections.length).toBe(3);
    });

    it('shows CommentsSection for existing projects', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('comments-section')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading existing project', () => {
      mockIsLoading = true;
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Status Dropdown', () => {
    it('renders status dropdown with default active status', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('opens status dropdown when clicked', async () => {
      const user = userEvent.setup();
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const statusButton = screen.getByText('Active');
      await user.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('On Hold')).toBeInTheDocument();
        expect(screen.getByText('Someday')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Dropdown', () => {
    it('renders priority dropdown with default medium priority', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('opens priority dropdown when clicked', async () => {
      const user = userEvent.setup();
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
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

  describe('Form Components', () => {
    it('renders TagsSection', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('tags-section')).toBeInTheDocument();
    });

    it('renders LifeAreaPicker', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('life-area-picker')).toBeInTheDocument();
    });

    it('renders date input for deadline', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = null;

      const { container } = render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
    });
  });

  describe('Project with Progress', () => {
    beforeEach(() => {
      mockProjectData = {
        _id: 'project123',
        title: 'Project with Tasks',
        description: '',
        outcome: '',
        status: 'active',
        priority: 'medium',
        deadline: null,
        lifeAreaId: null,
        tags: [],
        pinned: false,
        linkedNotes: [],
        linkedTasks: [],
        linkedEvents: [],
        comments: [],
        progress: { completed: 3, total: 5 },
      };
    });

    it('shows ProjectProgress when project has tasks', () => {
      mockProjectPanelContext.isOpen = true;
      mockProjectPanelContext.projectId = 'project123';

      render(<ProjectSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('project-progress')).toBeInTheDocument();
    });
  });
});
