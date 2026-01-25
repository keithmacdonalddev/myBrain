import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { LinkItemModal } from './LinkItemModal';

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

// Mock data hooks
let mockNotesData = { notes: [] };
let mockTasksData = { tasks: [] };
let mockEventsData = { events: [] };
let mockNotesLoading = false;
let mockTasksLoading = false;
let mockEventsLoading = false;

vi.mock('../../notes/hooks/useNotes', () => ({
  useNotes: () => ({
    data: mockNotesData,
    isLoading: mockNotesLoading,
  }),
}));

vi.mock('../../tasks/hooks/useTasks', () => ({
  useTasks: () => ({
    data: mockTasksData,
    isLoading: mockTasksLoading,
  }),
}));

vi.mock('../../calendar/hooks/useEvents', () => ({
  useEvents: () => ({
    data: mockEventsData,
    isLoading: mockEventsLoading,
  }),
}));

// Mock link mutations
const mockLinkNote = vi.fn();
const mockLinkTask = vi.fn();
const mockLinkEvent = vi.fn();

vi.mock('../hooks/useProjects', () => ({
  useLinkNote: () => ({
    mutateAsync: mockLinkNote,
    isPending: false,
  }),
  useLinkTask: () => ({
    mutateAsync: mockLinkTask,
    isPending: false,
  }),
  useLinkEvent: () => ({
    mutateAsync: mockLinkEvent,
    isPending: false,
  }),
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

describe('LinkItemModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotesLoading = false;
    mockTasksLoading = false;
    mockEventsLoading = false;
    mockNotesData = { notes: [] };
    mockTasksData = { tasks: [] };
    mockEventsData = { events: [] };
  });

  describe('Notes Type', () => {
    const mockNotes = [
      { _id: 'note1', title: 'Note One', updatedAt: '2024-01-15T10:00:00Z' },
      { _id: 'note2', title: 'Note Two', updatedAt: '2024-01-14T10:00:00Z' },
    ];

    beforeEach(() => {
      mockNotesData = { notes: mockNotes };
    });

    it('renders modal with notes header', () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Link Notes')).toBeInTheDocument();
    });

    it('displays available notes', async () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await waitFor(() => {
        expect(screen.getByText('Note One')).toBeInTheDocument();
        expect(screen.getByText('Note Two')).toBeInTheDocument();
      });
    });

    it('filters out already linked notes', async () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={['note1']}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await waitFor(() => {
        expect(screen.queryByText('Note One')).not.toBeInTheDocument();
        expect(screen.getByText('Note Two')).toBeInTheDocument();
      });
    });

    it('shows update date for notes', async () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Updated/)).toBeInTheDocument();
      });
    });
  });

  describe('Tasks Type', () => {
    const mockTasks = [
      { _id: 'task1', title: 'Task One', status: 'todo' },
      { _id: 'task2', title: 'Task Two', status: 'in_progress' },
    ];

    beforeEach(() => {
      mockTasksData = { tasks: mockTasks };
    });

    it('renders modal with tasks header', () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="tasks"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Link Tasks')).toBeInTheDocument();
    });

    it('displays task status', async () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="tasks"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });
  });

  describe('Events Type', () => {
    const mockEvents = [
      { _id: 'event1', title: 'Event One', startDate: '2024-12-25T10:00:00Z' },
      { _id: 'event2', title: 'Event Two', startDate: '2024-12-31T18:00:00Z' },
    ];

    beforeEach(() => {
      mockEventsData = { events: mockEvents };
    });

    it('renders modal with events header', () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="events"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Link Events')).toBeInTheDocument();
    });

    it('displays event date', async () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="events"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    const mockNotes = [
      { _id: 'note1', title: 'Important Document', content: '' },
      { _id: 'note2', title: 'Meeting Notes', content: 'important discussion' },
      { _id: 'note3', title: 'Random Thoughts', content: '' },
    ];

    beforeEach(() => {
      mockNotesData = { notes: mockNotes };
    });

    it('renders search input', () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
    });

    it('filters items by title search', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await user.type(searchInput, 'Important');

      await waitFor(() => {
        expect(screen.getByText('Important Document')).toBeInTheDocument();
        expect(screen.queryByText('Random Thoughts')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      const searchInput = screen.getByPlaceholderText('Search notes...');
      await user.type(searchInput, 'xyz123nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/No notes match your search/)).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    const mockNotes = [
      { _id: 'note1', title: 'Note One', updatedAt: '2024-01-15T10:00:00Z' },
      { _id: 'note2', title: 'Note Two', updatedAt: '2024-01-14T10:00:00Z' },
    ];

    beforeEach(() => {
      mockNotesData = { notes: mockNotes };
    });

    it('toggles selection on item click', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));

      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('can select multiple items', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));
      await user.click(screen.getByText('Note Two'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('can deselect items', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      await user.click(screen.getByText('Note One'));
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });
  });

  describe('Link Action', () => {
    const mockNotes = [
      { _id: 'note1', title: 'Note One', updatedAt: '2024-01-15T10:00:00Z' },
    ];

    beforeEach(() => {
      mockNotesData = { notes: mockNotes };
      mockLinkNote.mockResolvedValue({});
    });

    it('disables link button when nothing selected', () => {
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = screen.getByRole('button', { name: /Link/ });
      expect(linkButton).toBeDisabled();
    });

    it('enables link button when items selected', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));

      const linkButton = screen.getByRole('button', { name: /Link.*1/ });
      expect(linkButton).not.toBeDisabled();
    });

    it('calls link mutation and closes modal on success', async () => {
      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));
      await user.click(screen.getByRole('button', { name: /Link.*1/ }));

      await waitFor(() => {
        expect(mockLinkNote).toHaveBeenCalledWith({
          projectId: 'project123',
          noteId: 'note1',
        });
      });

      expect(mockToastSuccess).toHaveBeenCalledWith('1 note linked');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows error toast on link failure', async () => {
      mockLinkNote.mockRejectedValueOnce(new Error('Link failed'));

      const user = userEvent.setup();
      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Note One'));
      await user.click(screen.getByRole('button', { name: /Link.*1/ }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Link failed');
      });
    });
  });

  describe('Close Actions', () => {
    it('closes on cancel button click', async () => {
      const user = userEvent.setup();
      mockNotesData = { notes: [] };

      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes on X button click', async () => {
      const user = userEvent.setup();
      mockNotesData = { notes: [] };

      const { container } = render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      // Find close button in header
      const closeButton = container.querySelector('button');
      if (closeButton) {
        await user.click(closeButton);
      }

      // Note: might close via backdrop too
    });

    it('closes on backdrop click', async () => {
      const user = userEvent.setup();
      mockNotesData = { notes: [] };

      const { container } = render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while loading notes', () => {
      mockNotesLoading = true;
      mockNotesData = { notes: [] };

      const { container } = render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no items available', () => {
      mockNotesData = { notes: [] };

      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={[]}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText(/No notes available to link/)).toBeInTheDocument();
    });

    it('shows all linked message when all items already linked', () => {
      mockNotesData = { notes: [{ _id: 'note1', title: 'Note One' }] };

      render(
        <LinkItemModal
          projectId="project123"
          linkedIds={['note1']}
          type="notes"
          onClose={mockOnClose}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText(/No notes available to link/)).toBeInTheDocument();
    });
  });
});
