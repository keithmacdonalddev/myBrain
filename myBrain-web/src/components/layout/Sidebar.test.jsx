import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

// Mock the hooks
vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlags: vi.fn(() => ({
    calendarEnabled: true,
    imagesEnabled: true,
    filesEnabled: true,
    projectsEnabled: true,
    lifeAreasEnabled: true,
    socialEnabled: false,
    fitnessEnabled: false,
    kbEnabled: false,
  })),
}));

vi.mock('../../hooks/useSidebarConfig', () => ({
  useSidebarConfig: vi.fn(() => ({
    data: null, // Use default config
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../../features/notes/hooks/useNotes', () => ({
  useInboxCount: vi.fn(() => ({
    data: 5,
    isLoading: false,
    error: null,
  })),
}));

// Helper to create auth state
const createAuthState = (overrides = {}) => ({
  user: {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    flags: {},
    ...overrides.user,
  },
  isAuthenticated: true,
  loading: false,
  ...overrides,
});

// Helper to create life areas state
const createLifeAreasState = (overrides = {}) => ({
  items: [
    { _id: 'la1', name: 'Health', color: '#10b981', isDefault: true, isActive: true },
    { _id: 'la2', name: 'Career', color: '#3b82f6', isDefault: false, isActive: true },
  ],
  loading: false,
  error: null,
  selectedId: null,
  ...overrides,
});

// Helper to create default preloaded state
const createPreloadedState = (authOverrides = {}, lifeAreasOverrides = {}) => ({
  auth: createAuthState(authOverrides),
  lifeAreas: createLifeAreasState(lifeAreasOverrides),
  theme: {
    mode: 'light',
    effectiveTheme: 'light',
    accentColor: 'blue',
    reduceMotion: false,
  },
  toast: {
    toasts: [],
  },
});

describe('Sidebar', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the sidebar navigation', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('renders main navigation items', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('renders working memory section items', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('renders version footer', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('myBrain v0.1.0')).toBeInTheDocument();
    });
  });

  describe('Sidebar Open/Close State', () => {
    it('applies correct transform when closed', () => {
      const { container } = render(
        <Sidebar isOpen={false} onClose={mockOnClose} />,
        { preloadedState: createPreloadedState() }
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('applies correct transform when open', () => {
      const { container } = render(
        <Sidebar isOpen={true} onClose={mockOnClose} />,
        { preloadedState: createPreloadedState() }
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('translate-x-0');
    });

    it('shows backdrop when open on mobile', () => {
      const { container } = render(
        <Sidebar isOpen={true} onClose={mockOnClose} />,
        { preloadedState: createPreloadedState() }
      );

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('hides backdrop when closed', () => {
      const { container } = render(
        <Sidebar isOpen={false} onClose={mockOnClose} />,
        { preloadedState: createPreloadedState() }
      );

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Mobile Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar isOpen={true} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = screen.getByRole('button', { name: /close menu/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Sidebar isOpen={true} onClose={mockOnClose} />,
        { preloadedState: createPreloadedState() }
      );

      const backdrop = container.querySelector('[aria-hidden="true"]');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders mobile header with Menu text when open', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Menu')).toBeInTheDocument();
    });
  });

  describe('Inbox Count Badge', () => {
    it('displays inbox count badge when count > 0', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Admin Section', () => {
    it('shows admin panel link for admin users', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState({ user: { role: 'admin' } }),
      });

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('hides admin panel link for non-admin users', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState({ user: { role: 'user' } }),
      });

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });
  });

  describe('Feature Flag Based Items', () => {
    it('shows Projects when projectsEnabled flag is true', async () => {
      const { useFeatureFlags } = await import('../../hooks/useFeatureFlag');
      useFeatureFlags.mockReturnValue({
        projectsEnabled: true,
        imagesEnabled: false,
        filesEnabled: false,
        calendarEnabled: false,
        lifeAreasEnabled: false,
        socialEnabled: false,
        fitnessEnabled: false,
        kbEnabled: false,
      });

      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('hides Projects when projectsEnabled flag is false', async () => {
      const { useFeatureFlags } = await import('../../hooks/useFeatureFlag');
      useFeatureFlags.mockReturnValue({
        projectsEnabled: false,
        imagesEnabled: false,
        filesEnabled: false,
        calendarEnabled: false,
        lifeAreasEnabled: false,
        socialEnabled: false,
        fitnessEnabled: false,
        kbEnabled: false,
      });

      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    });
  });

  describe('Collapsible Sections', () => {
    it('expands Categories section when clicked', async () => {
      const user = userEvent.setup();
      const { useFeatureFlags } = await import('../../hooks/useFeatureFlag');
      useFeatureFlags.mockReturnValue({
        lifeAreasEnabled: true,
        projectsEnabled: true,
        imagesEnabled: true,
        filesEnabled: true,
        calendarEnabled: true,
        socialEnabled: false,
        fitnessEnabled: false,
        kbEnabled: false,
      });

      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the Categories section header
      const categoriesButton = screen.getByRole('button', { name: /categories/i });
      await user.click(categoriesButton);

      // Life areas should be visible
      await waitFor(() => {
        expect(screen.getByText('Health')).toBeInTheDocument();
        expect(screen.getByText('Career')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Panel Mode', () => {
    it('renders simplified version when isMobilePanel is true', () => {
      render(
        <Sidebar isOpen={true} onClose={mockOnClose} isMobilePanel={true} />,
        { preloadedState: createPreloadedState() }
      );

      // Should render navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('does not render mobile header when isMobilePanel is true', () => {
      render(
        <Sidebar isOpen={true} onClose={mockOnClose} isMobilePanel={true} />,
        { preloadedState: createPreloadedState() }
      );

      // Close button should not be present (no mobile header)
      expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('renders NavLinks with correct paths', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/app');

      const todayLink = screen.getByRole('link', { name: /today/i });
      expect(todayLink).toHaveAttribute('href', '/app/today');

      const inboxLink = screen.getByRole('link', { name: /inbox/i });
      expect(inboxLink).toHaveAttribute('href', '/app/inbox');

      const notesLink = screen.getByRole('link', { name: /notes/i });
      expect(notesLink).toHaveAttribute('href', '/app/notes');

      const tasksLink = screen.getByRole('link', { name: /tasks/i });
      expect(tasksLink).toHaveAttribute('href', '/app/tasks');
    });

    it('calls onClose when navigation link is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar isOpen={true} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('sidebar has navigation role and accessible name', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('close button has accessible label', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = screen.getByRole('button', { name: /close menu/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close menu');
    });
  });

  describe('Loading Skeleton', () => {
    it('shows skeleton items when life areas are loading', async () => {
      const user = userEvent.setup();
      const { useFeatureFlags } = await import('../../hooks/useFeatureFlag');
      useFeatureFlags.mockReturnValue({
        lifeAreasEnabled: true,
        projectsEnabled: true,
        imagesEnabled: true,
        filesEnabled: true,
        calendarEnabled: true,
        socialEnabled: false,
        fitnessEnabled: false,
        kbEnabled: false,
      });

      // Need to have items for Categories section to render, but set loading to true
      const { container } = render(
        <Sidebar isOpen={false} onClose={mockOnClose} />,
        {
          preloadedState: createPreloadedState({}, {
            loading: true,
            items: [
              { _id: 'la1', name: 'Health', color: '#10b981', isDefault: true, isActive: true },
            ]
          }),
        }
      );

      // Expand Categories section by finding button containing "Categories" text
      const categoriesButton = screen.getByText(/categories/i).closest('button');
      if (categoriesButton) {
        await user.click(categoriesButton);
      }

      // Check for skeleton elements when expanded
      await waitFor(() => {
        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });
});
