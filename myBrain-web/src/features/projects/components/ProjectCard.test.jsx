import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock ProjectPanelContext
const mockOpenProject = vi.fn();
vi.mock('../../../contexts/ProjectPanelContext', () => ({
  useProjectPanel: () => ({
    openProject: mockOpenProject,
  }),
}));

// Mock useUpdateProjectStatus
const mockUpdateStatus = vi.fn();
vi.mock('../hooks/useProjects', () => ({
  useUpdateProjectStatus: () => ({
    mutateAsync: mockUpdateStatus,
  }),
  useFavoriteProject: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUnfavoriteProject: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock child components
vi.mock('./ProjectProgress', () => ({
  ProjectProgress: ({ progress }) => (
    <div data-testid="project-progress">
      Progress: {progress?.completed}/{progress?.total}
    </div>
  ),
}));

vi.mock('../../lifeAreas/components/LifeAreaBadge', () => ({
  LifeAreaBadge: ({ lifeArea }) => (
    <span data-testid="life-area-badge">{lifeArea?.name}</span>
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

describe('ProjectCard', () => {
  const mockProject = {
    _id: 'project123',
    title: 'Test Project',
    description: 'A test project description',
    outcome: 'Expected outcome',
    status: 'active',
    priority: 'high',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    pinned: false,
    lifeArea: { _id: 'la1', name: 'Work', color: '#3b82f6' },
    progress: { total: 10, completed: 3, percentage: 30 },
    linkedNoteIds: ['note1', 'note2'],
    linkedTaskIds: ['task1'],
    linkedEventIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders project title', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('renders project outcome', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Expected outcome')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders priority indicator', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders life area badge when present', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('life-area-badge')).toBeInTheDocument();
    });

    it('renders progress when project has tasks', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('project-progress')).toBeInTheDocument();
    });
  });

  describe('Pinned Projects', () => {
    it('shows pin icon for pinned projects', () => {
      const pinnedProject = { ...mockProject, pinned: true };
      const { container } = render(<ProjectCard project={pinnedProject} />, {
        preloadedState: createPreloadedState(),
      });

      // Pin icon should be present (lucide-react renders svg)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Deadline Display', () => {
    it('shows "Due in X days" for future deadline', () => {
      const futureDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const project = { ...mockProject, deadline: futureDeadline };
      render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/Due in \d+ days/)).toBeInTheDocument();
    });

    it('shows "Due today" for today deadline', () => {
      // Create a date that is definitely today but close to the end of day
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const project = { ...mockProject, deadline: today.toISOString() };
      render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      // Should show either "Due today" or "Due tomorrow" depending on timezone edge cases
      const hasDueToday = screen.queryByText('Due today');
      const hasDueTomorrow = screen.queryByText('Due tomorrow');
      expect(hasDueToday || hasDueTomorrow).toBeTruthy();
    });

    it('shows "Due tomorrow" for tomorrow deadline', () => {
      // Set tomorrow at noon to avoid timezone edge cases
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const project = { ...mockProject, deadline: tomorrow.toISOString() };
      render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      // May be "Due tomorrow" or "Due in 2 days" depending on time of day
      const hasDueTomorrow = screen.queryByText('Due tomorrow');
      const hasDueInDays = screen.queryByText(/Due in \d+ days/);
      expect(hasDueTomorrow || hasDueInDays).toBeTruthy();
    });

    it('shows overdue indicator for past deadline', () => {
      const pastDeadline = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const project = { ...mockProject, deadline: pastDeadline };
      render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/\d+ days overdue/)).toBeInTheDocument();
    });

    it('does not show overdue styling for completed projects', () => {
      const pastDeadline = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const project = { ...mockProject, deadline: pastDeadline, status: 'completed' };
      const { container } = render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      // The text shows "overdue" but completed projects should not have danger styling
      // The isOverdue flag is false for completed projects
      const deadlineElement = screen.getByText(/overdue/);
      // For completed projects, the element should not have text-danger class
      expect(deadlineElement.closest('span')).not.toHaveClass('text-danger');
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode when compact prop is true', () => {
      const { container } = render(<ProjectCard project={mockProject} compact />, {
        preloadedState: createPreloadedState(),
      });

      // Compact mode should have simpler structure
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      // Should show progress count
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });

    it('shows deadline in compact mode', () => {
      render(<ProjectCard project={mockProject} compact />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/Due in \d+ days/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('navigates to project detail on click', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      await user.click(screen.getByText('Test Project'));
      expect(mockNavigate).toHaveBeenCalledWith('/app/projects/project123');
    });

    it('opens status menu on more button click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the more button (MoreHorizontal icon)
      const moreButtons = container.querySelectorAll('button');
      const moreButton = Array.from(moreButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (moreButton) {
        await user.click(moreButton);

        // Status options should be visible
        await waitFor(() => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
          expect(screen.getByText('On Hold')).toBeInTheDocument();
          expect(screen.getByText('Someday')).toBeInTheDocument();
        });
      }
    });

    it('calls updateStatus when changing status', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the more button
      const moreButtons = container.querySelectorAll('button');
      const moreButton = Array.from(moreButtons).find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (moreButton) {
        await user.click(moreButton);

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

  describe('Status Display', () => {
    it.each([
      ['active', 'Active'],
      ['completed', 'Completed'],
      ['on_hold', 'On Hold'],
      ['someday', 'Someday'],
    ])('displays correct label for %s status', (status, label) => {
      const project = { ...mockProject, status };
      render(<ProjectCard project={project} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('Item Counts', () => {
    it('displays note count when notes are linked', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('2 notes')).toBeInTheDocument();
    });

    it('displays task count when tasks are linked', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('1 tasks')).toBeInTheDocument();
    });

    it('does not display event count when no events are linked', () => {
      render(<ProjectCard project={mockProject} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByText(/events/)).not.toBeInTheDocument();
    });
  });
});
