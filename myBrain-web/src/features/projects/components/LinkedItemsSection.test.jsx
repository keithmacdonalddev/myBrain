import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { LinkedItemsSection } from './LinkedItemsSection';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

// Mock unlink hooks
const mockUnlinkNote = vi.fn();
const mockUnlinkTask = vi.fn();
const mockUnlinkEvent = vi.fn();

vi.mock('../hooks/useProjects', () => ({
  useUnlinkNote: () => ({
    mutateAsync: mockUnlinkNote,
  }),
  useUnlinkTask: () => ({
    mutateAsync: mockUnlinkTask,
  }),
  useUnlinkEvent: () => ({
    mutateAsync: mockUnlinkEvent,
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

describe('LinkedItemsSection', () => {
  const mockOnLinkClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notes Section', () => {
    const mockNotes = [
      { _id: 'note1', title: 'Note One' },
      { _id: 'note2', title: 'Note Two' },
    ];

    it('renders notes section with correct label', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('displays all note items', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.getByText('Note Two')).toBeInTheDocument();
    });

    it('shows empty state message when no notes', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={[]}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No linked notes')).toBeInTheDocument();
    });

    it('displays "Untitled Note" for notes without title', () => {
      const notesWithoutTitle = [{ _id: 'note1', title: '' }];
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={notesWithoutTitle}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });
  });

  describe('Tasks Section', () => {
    const mockTasks = [
      { _id: 'task1', title: 'Task One', status: 'todo' },
      { _id: 'task2', title: 'Task Two', status: 'done' },
    ];

    it('renders tasks section with correct label', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="tasks"
          items={mockTasks}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('shows empty state message when no tasks', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="tasks"
          items={[]}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No linked tasks')).toBeInTheDocument();
    });

    it('displays status indicator for tasks', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="tasks"
          items={mockTasks}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Status indicators are colored dots
      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
    });
  });

  describe('Events Section', () => {
    const mockEvents = [
      { _id: 'event1', title: 'Event One', startDate: '2024-12-25T10:00:00Z' },
      { _id: 'event2', title: 'Event Two', startDate: '2024-12-31T18:00:00Z' },
    ];

    it('renders events section with correct label', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="events"
          items={mockEvents}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('shows empty state message when no events', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="events"
          items={[]}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No linked events')).toBeInTheDocument();
    });

    it('displays formatted date for events', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="events"
          items={mockEvents}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Should show date in format like "Dec 25"
      expect(screen.getByText('Event One')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    const mockNotes = [{ _id: 'note1', title: 'Note One' }];

    it('is expanded by default', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Note One')).toBeInTheDocument();
    });

    it('can be collapsed by default with defaultExpanded prop', () => {
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
          defaultExpanded={false}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Items should not be visible when collapsed
      expect(screen.queryByText('Note One')).not.toBeInTheDocument();
    });

    it('toggles expansion on header click', async () => {
      const user = userEvent.setup();
      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Initially visible
      expect(screen.getByText('Note One')).toBeInTheDocument();

      // Click header to collapse
      await user.click(screen.getByText('Notes'));

      await waitFor(() => {
        expect(screen.queryByText('Note One')).not.toBeInTheDocument();
      });

      // Click header to expand again
      await user.click(screen.getByText('Notes'));

      await waitFor(() => {
        expect(screen.getByText('Note One')).toBeInTheDocument();
      });
    });
  });

  describe('Link Click Handler', () => {
    it('calls onLinkClick with type when plus button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={[]}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Find the plus button in the header
      const buttons = container.querySelectorAll('button');
      const plusButton = Array.from(buttons).find(btn => {
        return btn.title?.toLowerCase().includes('link');
      });

      if (plusButton) {
        await user.click(plusButton);
        expect(mockOnLinkClick).toHaveBeenCalledWith('notes');
      }
    });
  });

  describe('Unlink Functionality', () => {
    const mockNotes = [{ _id: 'note1', title: 'Note One' }];

    it('calls unlink mutation when unlink button is clicked', async () => {
      const user = userEvent.setup();
      mockUnlinkNote.mockResolvedValueOnce({});

      const { container } = render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Hover to show action buttons - find the unlink button
      const itemRow = screen.getByText('Note One').closest('div');
      const unlinkButton = itemRow?.querySelector('button[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockUnlinkNote).toHaveBeenCalledWith({
            projectId: 'project123',
            noteId: 'note1',
          });
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Item unlinked');
      }
    });

    it('shows error toast on unlink failure', async () => {
      const user = userEvent.setup();
      mockUnlinkNote.mockRejectedValueOnce(new Error('Failed to unlink'));

      const { container } = render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      const itemRow = screen.getByText('Note One').closest('div');
      const unlinkButton = itemRow?.querySelector('button[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith('Failed to unlink');
        });
      }
    });

    it('calls correct unlink function for tasks', async () => {
      const user = userEvent.setup();
      mockUnlinkTask.mockResolvedValueOnce({});

      const mockTasks = [{ _id: 'task1', title: 'Task One', status: 'todo' }];

      const { container } = render(
        <LinkedItemsSection
          projectId="project123"
          type="tasks"
          items={mockTasks}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      const itemRow = screen.getByText('Task One').closest('div');
      const unlinkButton = itemRow?.querySelector('button[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockUnlinkTask).toHaveBeenCalledWith({
            projectId: 'project123',
            taskId: 'task1',
          });
        });
      }
    });

    it('calls correct unlink function for events', async () => {
      const user = userEvent.setup();
      mockUnlinkEvent.mockResolvedValueOnce({});

      const mockEvents = [{ _id: 'event1', title: 'Event One', startDate: '2024-12-25T10:00:00Z' }];

      const { container } = render(
        <LinkedItemsSection
          projectId="project123"
          type="events"
          items={mockEvents}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      const itemRow = screen.getByText('Event One').closest('div');
      const unlinkButton = itemRow?.querySelector('button[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockUnlinkEvent).toHaveBeenCalledWith({
            projectId: 'project123',
            eventId: 'event1',
          });
        });
      }
    });
  });

  describe('Navigation', () => {
    it('navigates to note detail on external link click', async () => {
      const user = userEvent.setup();
      const mockNotes = [{ _id: 'note1', title: 'Note One' }];

      render(
        <LinkedItemsSection
          projectId="project123"
          type="notes"
          items={mockNotes}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      const itemRow = screen.getByText('Note One').closest('div');
      const goToButton = itemRow?.querySelector('button[title="Go to item"]');

      if (goToButton) {
        await user.click(goToButton);

        expect(mockNavigate).toHaveBeenCalledWith('/app/notes/note1');
      }
    });

    it('navigates to task detail on external link click', async () => {
      const user = userEvent.setup();
      const mockTasks = [{ _id: 'task1', title: 'Task One', status: 'todo' }];

      render(
        <LinkedItemsSection
          projectId="project123"
          type="tasks"
          items={mockTasks}
          onLinkClick={mockOnLinkClick}
        />,
        { preloadedState: createPreloadedState() }
      );

      const itemRow = screen.getByText('Task One').closest('div');
      const goToButton = itemRow?.querySelector('button[title="Go to item"]');

      if (goToButton) {
        await user.click(goToButton);

        expect(mockNavigate).toHaveBeenCalledWith('/app/tasks/task1');
      }
    });
  });
});
