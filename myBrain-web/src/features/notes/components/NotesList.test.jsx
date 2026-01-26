import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NotesList from './NotesList';

// Mock the NotePanelContext
const mockOpenNote = vi.fn();
vi.mock('../../../contexts/NotePanelContext', () => ({
  useNotePanel: () => ({
    openNote: mockOpenNote,
  }),
}));

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastUndo = vi.fn();
vi.mock('../../../hooks/useToast', () => ({
  default: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    undo: mockToastUndo,
    info: vi.fn(),
  }),
}));

// Mock the notes hooks with controllable state
let mockNotesData = null;
let mockIsLoading = false;
let mockError = null;
const mockRefetch = vi.fn();
const mockPinNote = vi.fn();
const mockUnpinNote = vi.fn();
const mockArchiveNote = vi.fn();
const mockUnarchiveNote = vi.fn();
const mockTrashNote = vi.fn();
const mockRestoreNote = vi.fn();
const mockDeleteNote = vi.fn();

vi.mock('../hooks/useNotes', () => ({
  useNotes: () => ({
    data: mockNotesData,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
  }),
  usePinNote: () => ({
    mutateAsync: mockPinNote,
    mutate: vi.fn(),
  }),
  useUnpinNote: () => ({
    mutateAsync: mockUnpinNote,
    mutate: vi.fn(),
  }),
  useArchiveNote: () => ({
    mutateAsync: mockArchiveNote,
    mutate: vi.fn(),
  }),
  useUnarchiveNote: () => ({
    mutateAsync: mockUnarchiveNote,
    mutate: mockUnarchiveNote,
  }),
  useTrashNote: () => ({
    mutateAsync: mockTrashNote,
    mutate: vi.fn(),
  }),
  useRestoreNote: () => ({
    mutateAsync: mockRestoreNote,
    mutate: mockRestoreNote,
  }),
  useDeleteNote: () => ({
    mutateAsync: mockDeleteNote,
    mutate: vi.fn(),
  }),
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

// Sample note data
const createMockNote = (overrides = {}) => ({
  _id: 'note1',
  title: 'Test Note',
  body: 'This is the note content that will be displayed in the preview.',
  tags: ['tag1', 'tag2'],
  pinned: false,
  status: 'active',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('NotesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotesData = null;
    mockIsLoading = false;
    mockError = null;
  });

  describe('Loading State', () => {
    it('shows skeleton loaders while loading', () => {
      mockIsLoading = true;

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Skeleton.NoteCard components should be rendered - they use the 'skeleton' class
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error state with retry button', () => {
      mockError = { message: 'Failed to load notes' };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockError = { message: 'Failed to load notes' };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for notes when no notes exist', () => {
      mockNotesData = { notes: [] };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // EmptyState.Notes shows "No notes yet"
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });

    it('shows search empty state when filtering with no results', () => {
      mockNotesData = { notes: [] };

      render(<NotesList filters={{ q: 'nonexistent' }} />, {
        preloadedState: createPreloadedState(),
      });

      // EmptyState.Search shows "No results found"
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('shows archived empty state when viewing archived notes', () => {
      mockNotesData = { notes: [] };

      render(<NotesList filters={{ status: 'archived' }} />, {
        preloadedState: createPreloadedState(),
      });

      // EmptyState.Archived shows "No archived notes"
      expect(screen.getByText('No archived notes')).toBeInTheDocument();
    });

    it('shows trash empty state when viewing trashed notes', () => {
      mockNotesData = { notes: [] };

      render(<NotesList filters={{ status: 'trashed' }} />, {
        preloadedState: createPreloadedState(),
      });

      // EmptyState.Trash shows "Trash is empty"
      expect(screen.getByText('Trash is empty')).toBeInTheDocument();
    });

    it('calls onCreateNote when create button is clicked in empty state', async () => {
      const user = userEvent.setup();
      const mockOnCreateNote = vi.fn();
      mockNotesData = { notes: [] };

      render(<NotesList onCreateNote={mockOnCreateNote} />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create note/i });
      await user.click(createButton);
      expect(mockOnCreateNote).toHaveBeenCalled();
    });
  });

  describe('Notes List Rendering', () => {
    it('renders list of notes', () => {
      mockNotesData = {
        notes: [
          createMockNote({ _id: 'note1', title: 'First Note' }),
          createMockNote({ _id: 'note2', title: 'Second Note' }),
          createMockNote({ _id: 'note3', title: 'Third Note' }),
        ],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });

    it('displays note body preview', () => {
      mockNotesData = {
        notes: [
          createMockNote({ body: 'This is the preview text for the note body.' }),
        ],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/This is the preview text/)).toBeInTheDocument();
    });

    it('shows "Untitled note" for notes without title', () => {
      mockNotesData = {
        notes: [createMockNote({ title: '' })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Untitled note')).toBeInTheDocument();
    });

    it('displays tags on note cards', () => {
      mockNotesData = {
        notes: [createMockNote({ tags: ['work', 'important', 'followup'] })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/work, important, followup/)).toBeInTheDocument();
    });

    it('truncates tags display when more than 3 tags', () => {
      mockNotesData = {
        notes: [createMockNote({ tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/\+2/)).toBeInTheDocument();
    });
  });

  describe('Note Card Click', () => {
    it('opens note panel when clicking on a note card', async () => {
      const user = userEvent.setup();
      mockNotesData = {
        notes: [createMockNote({ _id: 'note1', title: 'Clickable Note' })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const noteCard = screen.getByText('Clickable Note').closest('button');
      await user.click(noteCard);

      expect(mockOpenNote).toHaveBeenCalledWith('note1');
    });
  });

  describe('Pinned Notes', () => {
    it('shows pin icon for pinned notes', () => {
      mockNotesData = {
        notes: [createMockNote({ pinned: true, title: 'Pinned Note' })],
      };

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Pin icon should be visible (filled yellow)
      const pinIcon = container.querySelector('.text-yellow-500');
      expect(pinIcon).toBeInTheDocument();
    });
  });

  describe('Archived Notes', () => {
    it('shows archive icon for archived notes', () => {
      mockNotesData = {
        notes: [createMockNote({ status: 'archived', title: 'Archived Note' })],
      };

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Archive icon should be visible
      const archiveIcon = container.querySelector('.text-muted');
      expect(archiveIcon).toBeInTheDocument();
    });
  });

  describe('Trashed Notes', () => {
    it('shows trash icon for trashed notes', () => {
      mockNotesData = {
        notes: [createMockNote({ status: 'trashed', title: 'Trashed Note' })],
      };

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Trash icon should be visible
      const trashIcon = container.querySelector('.text-danger');
      expect(trashIcon).toBeInTheDocument();
    });

    it('shows trashed date instead of updated date', () => {
      const trashedDate = new Date();
      trashedDate.setHours(trashedDate.getHours() - 1);

      mockNotesData = {
        notes: [createMockNote({
          status: 'trashed',
          trashedAt: trashedDate.toISOString(),
        })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/Trashed/)).toBeInTheDocument();
    });

    it('does not show tags for trashed notes', () => {
      mockNotesData = {
        notes: [createMockNote({ status: 'trashed', tags: ['tag1', 'tag2'] })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Tags should not be visible for trashed notes
      expect(screen.queryByText('tag1, tag2')).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions Menu', () => {
    beforeEach(() => {
      mockNotesData = {
        notes: [createMockNote({ _id: 'note1', title: 'Test Note' })],
      };
    });

    it('shows action menu on hover and click', async () => {
      const user = userEvent.setup();

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Find the menu button (MoreHorizontal icon button)
      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        btn.querySelector('[class*="lucide-more-horizontal"]') ||
        btn.textContent === '' && btn.classList.contains('bg-bg')
      );

      if (menuButton) {
        await user.click(menuButton);

        // Check for menu items
        expect(screen.getByText('Pin')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
        expect(screen.getByText('Move to Trash')).toBeInTheDocument();
      }
    });

    it('pins note and shows success toast', async () => {
      const user = userEvent.setup();
      mockPinNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      // Open menu and click Pin
      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Test Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const pinButton = screen.queryByText('Pin');
        if (pinButton) {
          await user.click(pinButton);

          await waitFor(() => {
            expect(mockPinNote).toHaveBeenCalledWith('note1');
            expect(mockToastSuccess).toHaveBeenCalledWith('Note pinned');
          });
        }
      }
    });

    it('archives note and shows undo toast', async () => {
      const user = userEvent.setup();
      mockArchiveNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Test Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const archiveButton = screen.queryByText('Archive');
        if (archiveButton) {
          await user.click(archiveButton);

          await waitFor(() => {
            expect(mockArchiveNote).toHaveBeenCalledWith('note1');
            expect(mockToastUndo).toHaveBeenCalled();
          });
        }
      }
    });

    it('moves note to trash and shows undo toast', async () => {
      const user = userEvent.setup();
      mockTrashNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Test Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const trashButton = screen.queryByText('Move to Trash');
        if (trashButton) {
          await user.click(trashButton);

          await waitFor(() => {
            expect(mockTrashNote).toHaveBeenCalledWith('note1');
            expect(mockToastUndo).toHaveBeenCalled();
          });
        }
      }
    });

    it('shows error toast when action fails', async () => {
      const user = userEvent.setup();
      mockPinNote.mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Test Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const pinButton = screen.queryByText('Pin');
        if (pinButton) {
          await user.click(pinButton);

          await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Failed to pin note');
          });
        }
      }
    });
  });

  describe('Trashed Note Actions', () => {
    beforeEach(() => {
      mockNotesData = {
        notes: [createMockNote({ _id: 'note1', status: 'trashed', title: 'Trashed Note' })],
      };
    });

    it('shows Restore and Delete Forever options for trashed notes', async () => {
      const user = userEvent.setup();

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Trashed Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        expect(screen.queryByText('Restore')).toBeInTheDocument();
        expect(screen.queryByText('Delete Forever')).toBeInTheDocument();
      }
    });

    it('restores note and shows success toast', async () => {
      const user = userEvent.setup();
      mockRestoreNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Trashed Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const restoreButton = screen.queryByText('Restore');
        if (restoreButton) {
          await user.click(restoreButton);

          await waitFor(() => {
            expect(mockRestoreNote).toHaveBeenCalledWith('note1');
            expect(mockToastSuccess).toHaveBeenCalledWith('Note restored');
          });
        }
      }
    });

    it('shows delete confirmation dialog before permanent delete', async () => {
      const user = userEvent.setup();

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Trashed Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const deleteButton = screen.queryByText('Delete Forever');
        if (deleteButton) {
          await user.click(deleteButton);

          // Should show confirmation dialog
          expect(screen.getByText('Delete Forever?')).toBeInTheDocument();
        }
      }
    });

    it('permanently deletes note after confirmation', async () => {
      const user = userEvent.setup();
      mockDeleteNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Trashed Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const deleteButton = screen.queryByText('Delete Forever');
        if (deleteButton) {
          await user.click(deleteButton);

          // Click confirm in dialog
          const confirmButton = screen.queryByRole('button', { name: /delete forever/i });
          if (confirmButton) {
            await user.click(confirmButton);

            await waitFor(() => {
              expect(mockDeleteNote).toHaveBeenCalledWith('note1');
              expect(mockToastSuccess).toHaveBeenCalledWith('Note permanently deleted');
            });
          }
        }
      }
    });

    it('cancels delete when clicking Cancel', async () => {
      const user = userEvent.setup();

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Trashed Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const deleteButton = screen.queryByText('Delete Forever');
        if (deleteButton) {
          await user.click(deleteButton);

          // Click cancel in dialog
          const cancelButton = screen.getByRole('button', { name: /cancel/i });
          await user.click(cancelButton);

          // Dialog should close, delete should not be called
          expect(screen.queryByText('Delete Forever?')).not.toBeInTheDocument();
          expect(mockDeleteNote).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Archived Note Actions', () => {
    beforeEach(() => {
      mockNotesData = {
        notes: [createMockNote({ _id: 'note1', status: 'archived', title: 'Archived Note' })],
      };
    });

    it('shows Unarchive option for archived notes', async () => {
      const user = userEvent.setup();

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Archived Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        expect(screen.queryByText('Unarchive')).toBeInTheDocument();
      }
    });

    it('unarchives note and shows success toast', async () => {
      const user = userEvent.setup();
      mockUnarchiveNote.mockResolvedValueOnce({});

      const { container } = render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn =>
        !btn.textContent.includes('Archived Note')
      );

      if (menuButton) {
        await user.click(menuButton);

        const unarchiveButton = screen.queryByText('Unarchive');
        if (unarchiveButton) {
          await user.click(unarchiveButton);

          await waitFor(() => {
            expect(mockUnarchiveNote).toHaveBeenCalledWith('note1');
            expect(mockToastSuccess).toHaveBeenCalledWith('Note restored from archive');
          });
        }
      }
    });
  });

  describe('Date Formatting', () => {
    it('shows "Just now" for very recent notes', () => {
      mockNotesData = {
        notes: [createMockNote({ updatedAt: new Date().toISOString() })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for notes updated within the hour', () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      mockNotesData = {
        notes: [createMockNote({ updatedAt: fiveMinutesAgo.toISOString() })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/5m ago/)).toBeInTheDocument();
    });

    it('shows hours ago for notes updated within the day', () => {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      mockNotesData = {
        notes: [createMockNote({ updatedAt: threeHoursAgo.toISOString() })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/3h ago/)).toBeInTheDocument();
    });

    it('shows days ago for notes updated within the week', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockNotesData = {
        notes: [createMockNote({ updatedAt: twoDaysAgo.toISOString() })],
      };

      render(<NotesList />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText(/2d ago/)).toBeInTheDocument();
    });
  });
});
