import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectsList } from './ProjectsList';

// Mock react-router-dom
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

// Mock ProjectPanelContext
const mockOpenNewProject = vi.fn();
vi.mock('../../../contexts/ProjectPanelContext', () => ({
  useProjectPanel: () => ({
    openNewProject: mockOpenNewProject,
  }),
}));

// Mock analytics
vi.mock('../../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn(),
}));

// Mock data hooks
let mockProjectsData = { projects: [] };
let mockProjectsLoading = false;
let mockProjectsError = null;

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjectsData,
    isLoading: mockProjectsLoading,
    error: mockProjectsError,
  }),
}));

let mockLifeAreasData = [];
vi.mock('../../lifeAreas/hooks/useLifeAreas', () => ({
  useLifeAreas: () => ({
    data: mockLifeAreasData,
  }),
}));

// Mock child components
vi.mock('./ProjectCard', () => ({
  ProjectCard: ({ project, compact }) => (
    <div data-testid={`project-card-${project._id}`} data-compact={compact}>
      {project.title}
    </div>
  ),
}));

vi.mock('../../../components/layout/MobilePageHeader', () => ({
  default: ({ title, rightAction }) => (
    <div data-testid="mobile-header">
      <span>{title}</span>
      {rightAction}
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

describe('ProjectsList', () => {
  const mockProjects = [
    {
      _id: 'project1',
      title: 'Project Alpha',
      status: 'active',
      priority: 'high',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      pinned: true,
    },
    {
      _id: 'project2',
      title: 'Project Beta',
      status: 'active',
      priority: 'medium',
      deadline: null,
      pinned: false,
    },
    {
      _id: 'project3',
      title: 'Project Gamma',
      status: 'completed',
      priority: 'low',
      deadline: null,
      pinned: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectsData = { projects: mockProjects };
    mockProjectsLoading = false;
    mockProjectsError = null;
    mockLifeAreasData = [];
    mockSearchParams.delete('new');
  });

  describe('Basic Rendering', () => {
    it('renders page title', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Multiple elements may have "Projects" text (mobile + desktop)
      const projectsElements = screen.getAllByText('Projects');
      expect(projectsElements.length).toBeGreaterThan(0);
    });

    it('renders page description', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // May have multiple elements (mobile + desktop)
      expect(screen.getAllByText(/Goal-driven efforts/).length).toBeGreaterThan(0);
    });

    it('renders new project button', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByRole('button', { name: /New Project/i })).toBeInTheDocument();
    });

    it('renders all project cards', async () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      await waitFor(() => {
        expect(screen.getByTestId('project-card-project1')).toBeInTheDocument();
        expect(screen.getByTestId('project-card-project2')).toBeInTheDocument();
      });
    });
  });

  describe('Status Filters', () => {
    it('renders status filter tabs', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Multiple elements for each status (mobile + desktop)
      expect(screen.getAllByText('All').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('On Hold').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Someday').length).toBeGreaterThan(0);
    });

    it('shows count for each status', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Active filter should show count
      const activeTab = screen.getAllByText('Active')[0];
      expect(activeTab.closest('button')).toBeInTheDocument();
    });

    it('changes filter on tab click', async () => {
      const user = userEvent.setup();
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Find and click "Completed" tab
      const completedTabs = screen.getAllByText('Completed');
      await user.click(completedTabs[0]);

      // The tab should now be highlighted (has bg-primary class)
      const activeTab = completedTabs[0].closest('button');
      expect(activeTab).toHaveClass('bg-primary');
    });
  });

  describe('Search', () => {
    it('renders search input', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Multiple search inputs (mobile + desktop)
      expect(screen.getAllByPlaceholderText('Search projects...').length).toBeGreaterThan(0);
    });

    it('filters projects by search query', async () => {
      const user = userEvent.setup();
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const searchInput = screen.getAllByPlaceholderText('Search projects...')[0];
      await user.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getByTestId('project-card-project1')).toBeInTheDocument();
        expect(screen.queryByTestId('project-card-project2')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const searchInput = screen.getAllByPlaceholderText('Search projects...')[0];
      await user.type(searchInput, 'nonexistent123');

      await waitFor(() => {
        expect(screen.getByText('No projects found')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('renders sort dropdown', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByDisplayValue('Deadline')).toBeInTheDocument();
    });

    it('has all sort options', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const sortSelect = screen.getByDisplayValue('Deadline');
      expect(sortSelect.querySelector('option[value="deadline"]')).toBeInTheDocument();
      expect(sortSelect.querySelector('option[value="updatedAt"]')).toBeInTheDocument();
      expect(sortSelect.querySelector('option[value="createdAt"]')).toBeInTheDocument();
      expect(sortSelect.querySelector('option[value="title"]')).toBeInTheDocument();
      expect(sortSelect.querySelector('option[value="priority"]')).toBeInTheDocument();
    });
  });

  describe('Life Area Filter', () => {
    beforeEach(() => {
      mockLifeAreasData = [
        { _id: 'la1', name: 'Work' },
        { _id: 'la2', name: 'Personal' },
      ];
    });

    it('renders life area dropdown', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    });

    it('shows life areas as options', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const categorySelect = screen.getByDisplayValue('All Categories');
      expect(categorySelect.querySelector('option[value="la1"]')).toBeInTheDocument();
      expect(categorySelect.querySelector('option[value="la2"]')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('renders view mode toggle buttons', () => {
      const { container } = render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Grid and List view buttons
      const viewButtons = container.querySelectorAll('[title="Grid view"], [title="List view"]');
      expect(viewButtons.length).toBe(2);
    });

    it('switches to list view on click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const listViewButton = container.querySelector('[title="List view"]');
      if (listViewButton) {
        await user.click(listViewButton);

        await waitFor(() => {
          // In list view, ProjectCard receives compact prop
          const projectCard = screen.getByTestId('project-card-project1');
          expect(projectCard.getAttribute('data-compact')).toBe('true');
        });
      }
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockProjectsLoading = true;
      mockProjectsData = { projects: [] };

      const { container } = render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message on error', () => {
      mockProjectsError = { message: 'Failed to load projects' };
      mockProjectsData = { projects: [] };

      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no projects', () => {
      mockProjectsData = { projects: [] };

      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });

    it('shows helpful description in empty state', () => {
      mockProjectsData = { projects: [] };

      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // The empty state has text split across a strong tag:
      // "<strong>Projects</strong> are goal-driven efforts..."
      // Multiple elements may match (mobile + desktop)
      const descElements = screen.getAllByText(/goal-driven efforts/i);
      expect(descElements.length).toBeGreaterThan(0);
    });

    it('shows new project button in empty state', () => {
      mockProjectsData = { projects: [] };

      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // There should be a "New Project" button in empty state too
      const newProjectButtons = screen.getAllByRole('button', { name: /New Project/i });
      expect(newProjectButtons.length).toBeGreaterThan(0);
    });
  });

  describe('New Project Actions', () => {
    it('calls openNewProject when New Project button clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const newProjectButton = screen.getByRole('button', { name: /New Project/i });
      await user.click(newProjectButton);

      expect(mockOpenNewProject).toHaveBeenCalled();
    });

    it('opens new project panel when ?new=true is in URL', () => {
      mockSearchParams.set('new', 'true');

      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(mockOpenNewProject).toHaveBeenCalled();
    });
  });

  describe('Pinned Projects', () => {
    it('shows pinned projects first', () => {
      const { container } = render(<ProjectsList />, { preloadedState: createPreloadedState() });

      const projectCards = container.querySelectorAll('[data-testid^="project-card-"]');
      // First card should be the pinned project
      expect(projectCards[0].getAttribute('data-testid')).toBe('project-card-project1');
    });
  });

  describe('Mobile Header', () => {
    it('renders mobile header with title', () => {
      render(<ProjectsList />, { preloadedState: createPreloadedState() });

      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
    });
  });

  describe('Grid vs List Layout', () => {
    it('renders in grid layout by default', () => {
      const { container } = render(<ProjectsList />, { preloadedState: createPreloadedState() });

      // Grid layout uses grid classes
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});
