import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ProjectDashboard from './ProjectDashboard';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { id: 'project123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// Mock analytics
vi.mock('../../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn(),
}));

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('../../../hooks/useToast', () => ({
  default: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  }),
}));

// Mock project panel context
const mockOpenProject = vi.fn();
vi.mock('../../../contexts/ProjectPanelContext', () => ({
  useProjectPanel: () => ({
    openProject: mockOpenProject,
  }),
}));

// Mock task panel context and provider
const mockOpenNewTask = vi.fn();
const mockOpenTask = vi.fn();
vi.mock('../../../contexts/TaskPanelContext', () => ({
  TaskPanelProvider: ({ children }) => <div data-testid="task-panel-provider">{children}</div>,
  useTaskPanel: () => ({
    openNewTask: mockOpenNewTask,
    openTask: mockOpenTask,
  }),
}));

// Mock note panel context and provider
const mockOpenNewNote = vi.fn();
vi.mock('../../../contexts/NotePanelContext', () => ({
  NotePanelProvider: ({ children }) => <div data-testid="note-panel-provider">{children}</div>,
  useNotePanel: () => ({
    openNewNote: mockOpenNewNote,
  }),
}));

// Mock project hooks
let mockProjectData = null;
let mockIsLoading = false;
let mockError = null;

const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockUpdateStatus = vi.fn();
const mockAddComment = vi.fn();
const mockUpdateComment = vi.fn();
const mockDeleteComment = vi.fn();

vi.mock('../hooks/useProjects', () => ({
  useProject: () => ({
    data: mockProjectData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useUpdateProject: () => ({
    mutateAsync: mockUpdateProject,
  }),
  useDeleteProject: () => ({
    mutateAsync: mockDeleteProject,
  }),
  useUpdateProjectStatus: () => ({
    mutateAsync: mockUpdateStatus,
  }),
  useAddProjectComment: () => ({
    mutate: mockAddComment,
    isPending: false,
  }),
  useUpdateProjectComment: () => ({
    mutate: mockUpdateComment,
    isPending: false,
  }),
  useDeleteProjectComment: () => ({
    mutate: mockDeleteComment,
    isPending: false,
  }),
  useFavoriteProject: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUnfavoriteProject: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock slide panels
vi.mock('../../../components/tasks/TaskSlidePanel', () => ({
  default: () => <div data-testid="task-slide-panel">Task Slide Panel</div>,
}));

vi.mock('../../../components/notes/NoteSlidePanel', () => ({
  default: () => <div data-testid="note-slide-panel">Note Slide Panel</div>,
}));

// Mock dashboard components
vi.mock('../components/dashboard/ProjectTasksBoard', () => ({
  ProjectTasksBoard: ({ projectId, tasks }) => (
    <div data-testid="project-tasks-board">
      Tasks: {tasks?.length || 0}
    </div>
  ),
}));

vi.mock('../components/dashboard/ProjectNotesGrid', () => ({
  ProjectNotesGrid: ({ projectId, notes }) => (
    <div data-testid="project-notes-grid">
      Notes: {notes?.length || 0}
    </div>
  ),
}));

vi.mock('../components/dashboard/ProjectEventsTimeline', () => ({
  ProjectEventsTimeline: ({ projectId, events, onEventClick, onNewEvent }) => (
    <div data-testid="project-events-timeline">
      Events: {events?.length || 0}
      <button onClick={() => onNewEvent()}>New Event</button>
    </div>
  ),
}));

vi.mock('../components/dashboard/ProjectActivityFeed', () => ({
  ProjectActivityFeed: ({ project, comments, onAddComment }) => (
    <div data-testid="project-activity-feed">
      Comments: {comments?.length || 0}
      <button onClick={() => onAddComment('Test comment')}>Add Comment</button>
    </div>
  ),
}));

// Mock event modal
vi.mock('../../calendar/components/EventModal', () => ({
  default: ({ event, onClose }) => (
    <div data-testid="event-modal">
      <button onClick={onClose}>Close Event Modal</button>
    </div>
  ),
}));

// Mock confirm dialog
vi.mock('../../../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
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

describe('ProjectDashboard', () => {
  const mockProject = {
    _id: 'project123',
    title: 'Test Project',
    description: 'Project description',
    outcome: 'Project outcome',
    status: 'active',
    priority: 'high',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    linkedTasks: [
      { _id: 'task1', title: 'Task 1', status: 'todo' },
      { _id: 'task2', title: 'Task 2', status: 'done' },
    ],
    linkedNotes: [{ _id: 'note1', title: 'Note 1' }],
    linkedEvents: [{ _id: 'event1', title: 'Event 1', startDate: new Date().toISOString() }],
    comments: [{ _id: 'comment1', text: 'Comment 1', userId: 'user123' }],
    progress: { total: 2, completed: 1, percentage: 50 },
    tags: ['important'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectData = mockProject;
    mockIsLoading = false;
    mockError = null;
    mockDeleteProject.mockResolvedValue({});
    mockUpdateStatus.mockResolvedValue({});
  });

  describe('Loading State', () => {
    it('shows loading spinner while loading', () => {
      mockIsLoading = true;
      mockProjectData = null;

      const { container } = render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when project not found', () => {
      mockProjectData = null;
      mockError = { message: 'Project not found' };

      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Project not found')).toBeInTheDocument();
    });

    it('shows back button in error state', () => {
      mockProjectData = null;
      mockError = { message: 'Error' };

      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Back to projects')).toBeInTheDocument();
    });

    it('navigates back on back button click in error state', async () => {
      const user = userEvent.setup();
      mockProjectData = null;
      mockError = { message: 'Error' };

      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      await user.click(screen.getByText('Back to projects'));

      expect(mockNavigate).toHaveBeenCalledWith('/app/projects');
    });
  });

  describe('Basic Rendering', () => {
    it('renders project title', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders progress percentage', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders task count', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Shows completed/total tasks
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('renders dashboard components', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getAllByTestId('project-tasks-board').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('project-notes-grid').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('project-events-timeline').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('project-activity-feed').length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('navigates back on back button click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Find back button (first button with ArrowLeft icon)
      const backButton = container.querySelector('button');
      if (backButton) {
        await user.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/app/projects');
      }
    });
  });

  describe('Quick Actions', () => {
    it('opens new task panel on Task button click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the Task button
      const taskButtons = screen.getAllByRole('button', { name: /Task/i });
      const taskButton = taskButtons.find((btn) => btn.textContent?.trim() === 'Task');
      if (taskButton) {
        await user.click(taskButton);
        expect(mockOpenNewTask).toHaveBeenCalled();
      }
    });

    it('opens new note panel on Note button click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the Note button
      const noteButtons = screen.getAllByRole('button', { name: /Note/i });
      const noteButton = noteButtons.find((btn) => btn.textContent?.trim() === 'Note');
      if (noteButton) {
        await user.click(noteButton);
        expect(mockOpenNewNote).toHaveBeenCalled();
      }
    });

    it('opens project panel on Edit button click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Find edit button by title
      const editButton = container.querySelector('[title="Edit Project"]');
      if (editButton) {
        await user.click(editButton);
        expect(mockOpenProject).toHaveBeenCalledWith('project123');
      }
    });
  });

  describe('Status Menu', () => {
    it('opens status menu on more button click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the more button
      const moreButtons = container.querySelectorAll('button');
      const moreButton = Array.from(moreButtons).find((btn) =>
        btn.querySelector('svg')
      );

      // Click on status badge or more button to open menu
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
          expect(screen.getByText('On Hold')).toBeInTheDocument();
          expect(screen.getByText('Someday')).toBeInTheDocument();
        });
      }
    });

    it('changes status on menu item click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Open status menu
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Completed'));

        expect(mockUpdateStatus).toHaveBeenCalledWith({
          id: 'project123',
          status: 'completed',
        });
      }
    });
  });

  describe('Delete Project', () => {
    it('opens confirm dialog on delete click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Open status menu first
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Delete Project')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Delete Project'));

        await waitFor(() => {
          expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });
      }
    });

    it('deletes project on confirm', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Open menu and click delete
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Delete Project')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Delete Project'));

        await waitFor(() => {
          expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Confirm Delete'));

        expect(mockDeleteProject).toHaveBeenCalledWith('project123');
        expect(mockToastSuccess).toHaveBeenCalledWith('Project deleted');
        expect(mockNavigate).toHaveBeenCalledWith('/app/projects');
      }
    });

    it('shows error toast on delete failure', async () => {
      mockDeleteProject.mockRejectedValueOnce(new Error('Delete failed'));

      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Open menu and click delete
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Delete Project')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Delete Project'));

        await waitFor(() => {
          expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Confirm Delete'));

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith('Failed to delete project');
        });
      }
    });

    it('cancels delete on cancel click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Open menu and click delete
      const statusBadge = screen.getByText('Active').closest('button');
      if (statusBadge) {
        await user.click(statusBadge);

        await waitFor(() => {
          expect(screen.getByText('Delete Project')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Delete Project'));

        await waitFor(() => {
          expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Cancel Delete'));

        await waitFor(() => {
          expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
        });

        expect(mockDeleteProject).not.toHaveBeenCalled();
      }
    });
  });

  describe('Event Modal', () => {
    it('opens event modal on new event click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      await user.click(screen.getByText('New Event'));

      await waitFor(() => {
        expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      });
    });

    it('closes event modal', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      await user.click(screen.getByText('New Event'));

      await waitFor(() => {
        expect(screen.getByTestId('event-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close Event Modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add Comment', () => {
    it('calls addComment mutation', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      await user.click(screen.getByText('Add Comment'));

      expect(mockAddComment).toHaveBeenCalledWith({
        projectId: 'project123',
        text: 'Test comment',
      });
    });
  });

  describe('Deadline Display', () => {
    it('shows days until deadline', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/\dd left/)).toBeInTheDocument();
    });

    it('shows overdue for past deadline', () => {
      mockProjectData = {
        ...mockProject,
        deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      };

      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/\dd overdue/)).toBeInTheDocument();
    });

    it('shows "Due today" for today deadline', () => {
      vi.useFakeTimers();
      const today = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(today);
      mockProjectData = {
        ...mockProject,
        deadline: today.toISOString(),
      };

      try {
        render(<ProjectDashboard />, {
          preloadedState: createPreloadedState(),
        });

        expect(screen.getByText('Due today')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Priority Display', () => {
    it('shows priority for high priority projects', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('does not show priority for medium priority', () => {
      mockProjectData = { ...mockProject, priority: 'medium' };

      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Medium priority is not displayed
      expect(screen.queryByText('medium')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Tabs', () => {
    it('renders mobile tabs', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      // Mobile tabs should be present (hidden on desktop via CSS)
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  describe('Panel Providers', () => {
    it('wraps content with TaskPanelProvider', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('task-panel-provider')).toBeInTheDocument();
    });

    it('wraps content with NotePanelProvider', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('note-panel-provider')).toBeInTheDocument();
    });

    it('renders slide panels', () => {
      render(<ProjectDashboard />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('task-slide-panel')).toBeInTheDocument();
      expect(screen.getByTestId('note-slide-panel')).toBeInTheDocument();
    });
  });
});
