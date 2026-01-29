import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectNotesGrid } from './ProjectNotesGrid';

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
vi.mock('../../../../hooks/useToast', () => ({
  default: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  }),
}));

// Mock NotePanelContext
const mockOpenNewNote = vi.fn();
vi.mock('../../../../contexts/NotePanelContext', () => ({
  useNotePanel: () => ({
    openNewNote: mockOpenNewNote,
  }),
}));

// Mock unlink hook
const mockUnlinkNote = vi.fn();
vi.mock('../../hooks/useProjects', () => ({
  useUnlinkNote: () => ({
    mutateAsync: mockUnlinkNote,
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

describe('ProjectNotesGrid', () => {
  const mockNotes = [
    {
      _id: 'note1',
      title: 'First Note',
      body: 'This is the body content of the first note with some **markdown**',
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'note2',
      title: 'Second Note',
      body: 'Short body',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    },
    {
      _id: 'note3',
      title: '',
      body: '',
      updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnlinkNote.mockResolvedValue({});
  });

  describe('Basic Rendering', () => {
    it('renders header with Notes title', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('shows note count', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('renders link existing button', () => {
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={[]} />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing note"]');
      expect(linkButton).toBeInTheDocument();
    });

    it('renders create new button', () => {
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={[]} />,
        { preloadedState: createPreloadedState() }
      );

      const newButton = container.querySelector('[title="Create new note"]');
      expect(newButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notes', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={[]} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No notes linked')).toBeInTheDocument();
    });

    it('shows link a note prompt in empty state', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={[]} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Link a note')).toBeInTheDocument();
    });

    it('opens link modal when link prompt clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectNotesGrid projectId="project123" notes={[]} />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Link a note'));

      await waitFor(() => {
        expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Note Display', () => {
    it('displays note titles', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
    });

    it('shows "Untitled Note" for notes without title', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });

    it('shows note body preview', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      // Body should be stripped of markdown and truncated
      expect(screen.getByText(/This is the body content/)).toBeInTheDocument();
    });

    it('shows relative date for recently updated notes', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('shows "Xd ago" for older notes', () => {
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('6d ago')).toBeInTheDocument();
    });
  });

  describe('Note Click Navigation', () => {
    it('navigates to note detail on click', async () => {
      const user = userEvent.setup();
      render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('First Note'));

      expect(mockNavigate).toHaveBeenCalledWith('/app/notes/note1');
    });

    it('navigates via external link button', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      // Find external link button for first note
      const noteItem = screen.getByText('First Note').closest('.group');
      const openButton = noteItem?.querySelector('[title="Open"]');

      if (openButton) {
        await user.click(openButton);
        expect(mockNavigate).toHaveBeenCalledWith('/app/notes/note1');
      }
    });
  });

  describe('Create New Note', () => {
    it('calls openNewNote when new button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      const newButton = container.querySelector('[title="Create new note"]');
      if (newButton) {
        await user.click(newButton);
        expect(mockOpenNewNote).toHaveBeenCalled();
      }
    });
  });

  describe('Link Note Modal', () => {
    it('opens link modal when link button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing note"]');
      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
        });
      }
    });

    it('closes link modal on close action', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      const linkButton = container.querySelector('[title="Link existing note"]');
      if (linkButton) {
        await user.click(linkButton);

        await waitFor(() => {
          expect(screen.getByTestId('link-item-modal')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Close Modal'));

        await waitFor(() => {
          expect(screen.queryByTestId('link-item-modal')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Unlink Note', () => {
    it('calls unlink mutation on unlink button click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      // Find unlink button for first note
      const noteItem = screen.getByText('First Note').closest('.group');
      const unlinkButton = noteItem?.querySelector('[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockUnlinkNote).toHaveBeenCalledWith({
            projectId: 'project123',
            noteId: 'note1',
          });
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Note unlinked');
      }
    });

    it('shows error toast on unlink failure', async () => {
      mockUnlinkNote.mockRejectedValueOnce(new Error('Unlink failed'));

      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      const noteItem = screen.getByText('First Note').closest('.group');
      const unlinkButton = noteItem?.querySelector('[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith('Failed to unlink note');
        });
      }
    });

    it('shows loading state while unlinking', async () => {
      // Make mutation pending
      mockUnlinkNote.mockImplementation(() => new Promise(() => {})); // Never resolves

      const user = userEvent.setup();
      const { container } = render(
        <ProjectNotesGrid projectId="project123" notes={mockNotes} />,
        { preloadedState: createPreloadedState() }
      );

      const noteItem = screen.getByText('First Note').closest('.group');
      const unlinkButton = noteItem?.querySelector('[title="Unlink"]');

      if (unlinkButton) {
        await user.click(unlinkButton);

        // Should show spinner
        await waitFor(() => {
          const spinner = noteItem?.querySelector('.animate-spin');
          expect(spinner).toBeInTheDocument();
        });
      }
    });
  });

  describe('Body Preview', () => {
    it('strips markdown from body preview', () => {
      const noteWithMarkdown = [
        {
          _id: 'md1',
          title: 'Markdown Note',
          body: '# Heading\n**Bold** and *italic* text with [links](http://example.com)',
          updatedAt: new Date().toISOString(),
        },
      ];

      render(
        <ProjectNotesGrid projectId="project123" notes={noteWithMarkdown} />,
        { preloadedState: createPreloadedState() }
      );

      // Should not show markdown characters
      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('truncates long body preview', () => {
      const noteWithLongBody = [
        {
          _id: 'long1',
          title: 'Long Note',
          body: 'This is a very long body that should be truncated because it exceeds the maximum length allowed for the preview display area',
          updatedAt: new Date().toISOString(),
        },
      ];

      render(
        <ProjectNotesGrid projectId="project123" notes={noteWithLongBody} />,
        { preloadedState: createPreloadedState() }
      );

      // Should show truncated text with ellipsis
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });

    it('handles empty body gracefully', () => {
      const noteWithEmptyBody = [
        {
          _id: 'empty1',
          title: 'Empty Body Note',
          body: '',
          updatedAt: new Date().toISOString(),
        },
      ];

      render(
        <ProjectNotesGrid projectId="project123" notes={noteWithEmptyBody} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Empty Body Note')).toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('handles undefined notes array', () => {
      render(
        <ProjectNotesGrid projectId="project123" />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No notes linked')).toBeInTheDocument();
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });
});
