import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import NoteEditor from './NoteEditor';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the notes hooks with controllable state
let mockNoteData = null;
let mockIsLoading = false;
const mockUpdateNote = vi.fn();
const mockCreateNote = vi.fn();
const mockPinNote = vi.fn();
const mockUnpinNote = vi.fn();
const mockArchiveNote = vi.fn();
const mockUnarchiveNote = vi.fn();
const mockTrashNote = vi.fn();
const mockRestoreNote = vi.fn();
const mockDeleteNote = vi.fn();

vi.mock('../hooks/useNotes', () => ({
  useNote: () => ({
    data: mockNoteData,
    isLoading: mockIsLoading,
  }),
  useUpdateNote: () => ({
    mutateAsync: mockUpdateNote,
    isPending: false,
  }),
  useCreateNote: () => ({
    mutateAsync: mockCreateNote,
    isPending: false,
  }),
  usePinNote: () => ({
    mutateAsync: mockPinNote,
    isPending: false,
  }),
  useUnpinNote: () => ({
    mutateAsync: mockUnpinNote,
    isPending: false,
  }),
  useArchiveNote: () => ({
    mutateAsync: mockArchiveNote,
    isPending: false,
  }),
  useUnarchiveNote: () => ({
    mutateAsync: mockUnarchiveNote,
    isPending: false,
  }),
  useTrashNote: () => ({
    mutateAsync: mockTrashNote,
    isPending: false,
  }),
  useRestoreNote: () => ({
    mutateAsync: mockRestoreNote,
    isPending: false,
  }),
  useDeleteNote: () => ({
    mutateAsync: mockDeleteNote,
    isPending: false,
  }),
}));

// Mock child components
vi.mock('../../../components/shared/TagsSection', () => ({
  default: ({ tags, onChange, disabled }) => (
    <div data-testid="tags-section" data-disabled={disabled}>
      Tags: {tags?.join(', ')}
      <button onClick={() => onChange(['tag1', 'tag2'])}>Add Tags</button>
    </div>
  ),
}));

vi.mock('../../../components/ui/Tooltip', () => ({
  default: ({ children, content }) => (
    <div data-tooltip={content}>{children}</div>
  ),
}));

vi.mock('../../../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onConfirm, onClose, title }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
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

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoteData = null;
    mockIsLoading = false;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading existing note', () => {
      mockIsLoading = true;

      const { container } = render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show loading spinner for new notes', () => {
      const { container } = render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('New Note Mode', () => {
    it('renders editor for new note with empty fields', () => {
      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      const bodyTextarea = screen.getByLabelText('Note content');

      expect(titleInput).toHaveValue('');
      expect(bodyTextarea).toHaveValue('');
    });

    it('updates title input value when typing', async () => {
      const user = userEvent.setup();

      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.type(titleInput, 'Test Title');

      // Verify that the input value was updated
      expect(titleInput).toHaveValue('Test Title');
    });

    it('shows "Start typing to create a note" hint initially', () => {
      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Start typing to create a note')).toBeInTheDocument();
    });

    it('does not show action menu for new notes', () => {
      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByLabelText('Note options')).not.toBeInTheDocument();
    });

    it('auto-creates note after debounce when content is entered', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockCreateNote.mockResolvedValueOnce({
        data: { note: { _id: 'new-note-123' } },
      });

      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.type(titleInput, 'My New Note');

      // Advance timers past the debounce period (2 seconds)
      vi.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledWith({
          title: 'My New Note',
          body: '',
          tags: [],
        });
      });

      vi.useRealTimers();
    });

    it('navigates to new note after creation', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockCreateNote.mockResolvedValueOnce({
        data: { note: { _id: 'new-note-123' } },
      });

      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.type(titleInput, 'My New Note');

      vi.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/notes/new-note-123', { replace: true });
      });

      vi.useRealTimers();
    });

    it('does not auto-create if both title and body are empty', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      // Just advance time without typing anything
      vi.advanceTimersByTime(3000);

      expect(mockCreateNote).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Edit Note Mode', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Existing Note Title',
        body: 'Existing note content here',
        tags: ['tag1', 'tag2'],
        pinned: false,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
    });

    it('renders editor with existing note content', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      const bodyTextarea = screen.getByLabelText('Note content');

      expect(titleInput).toHaveValue('Existing Note Title');
      expect(bodyTextarea).toHaveValue('Existing note content here');
    });

    it('shows tags section with note tags', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('tags-section')).toBeInTheDocument();
      expect(screen.getByText('Tags: tag1, tag2')).toBeInTheDocument();
    });

    it('shows action menu button for existing notes', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByLabelText('Note options')).toBeInTheDocument();
    });

    it('auto-saves note after changes with debounce', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockUpdateNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Advance timers past the debounce period (2 seconds)
      vi.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledWith({
          id: 'note123',
          data: {
            title: 'Updated Title',
            body: 'Existing note content here',
            tags: ['tag1', 'tag2'],
          },
        });
      });

      vi.useRealTimers();
    });

    it('shows save status indicator', async () => {
      const { container } = render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      // Should show saved status initially after note loads
      // The SaveStatusIndicator shows a Cloud icon and "Saved" text
      // Wait for the component to settle with the saved status
      await waitFor(() => {
        const cloudIcon = container.querySelector('.text-success');
        expect(cloudIcon).toBeInTheDocument();
      });
    });

    it('allows manual save with save button', async () => {
      const user = userEvent.setup();
      mockUpdateNote.mockResolvedValueOnce({});

      const { container } = render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.type(titleInput, ' - edited');

      // Find the save button by its class pattern - it's the small button with bg-primary
      const saveButton = container.querySelector('button.bg-primary');
      expect(saveButton).toBeInTheDocument();

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalled();
      });
    });
  });

  describe('Note Actions Menu', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Test Note',
        body: 'Test content',
        tags: [],
        pinned: false,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
    });

    it('opens action menu when clicking menu button', async () => {
      const user = userEvent.setup();

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);

      expect(screen.getByText('Pin')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Move to Trash')).toBeInTheDocument();
    });

    it('calls pin action when clicking Pin', async () => {
      const user = userEvent.setup();
      mockPinNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Pin'));

      expect(mockPinNote).toHaveBeenCalledWith('note123');
    });

    it('shows Unpin option for pinned notes', async () => {
      const user = userEvent.setup();
      mockNoteData.pinned = true;

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);

      expect(screen.getByText('Unpin')).toBeInTheDocument();
    });

    it('calls archive action and navigates back', async () => {
      const user = userEvent.setup();
      mockArchiveNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Archive'));

      await waitFor(() => {
        expect(mockArchiveNote).toHaveBeenCalledWith('note123');
        expect(mockNavigate).toHaveBeenCalledWith('/app/notes');
      });
    });

    it('calls trash action and navigates back', async () => {
      const user = userEvent.setup();
      mockTrashNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Move to Trash'));

      await waitFor(() => {
        expect(mockTrashNote).toHaveBeenCalledWith('note123');
        expect(mockNavigate).toHaveBeenCalledWith('/app/notes');
      });
    });
  });

  describe('Pinned Note', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Pinned Note',
        body: 'Content',
        tags: [],
        pinned: true,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
    });

    it('shows pin indicator for pinned notes', () => {
      const { container } = render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      // Check for the pin tooltip
      const pinTooltip = container.querySelector('[data-tooltip="This note is pinned"]');
      expect(pinTooltip).toBeInTheDocument();
    });
  });

  describe('Archived Note', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Archived Note',
        body: 'Content',
        tags: [],
        pinned: false,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      };
    });

    it('shows archived badge', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('shows Unarchive option in menu', async () => {
      const user = userEvent.setup();

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);

      expect(screen.getByText('Unarchive')).toBeInTheDocument();
    });
  });

  describe('Trashed Note', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Trashed Note',
        body: 'Content',
        tags: [],
        pinned: false,
        status: 'trashed',
        updatedAt: new Date().toISOString(),
      };
    });

    it('shows trashed badge', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Trashed')).toBeInTheDocument();
    });

    it('disables title input', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByLabelText('Note title')).toBeDisabled();
    });

    it('disables body textarea', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByLabelText('Note content')).toBeDisabled();
    });

    it('hides tags section', () => {
      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('tags-section')).not.toBeInTheDocument();
    });

    it('shows Restore and Delete Forever options in menu', async () => {
      const user = userEvent.setup();

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);

      expect(screen.getByText('Restore')).toBeInTheDocument();
      expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    });

    it('calls restore action', async () => {
      const user = userEvent.setup();
      mockRestoreNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Restore'));

      expect(mockRestoreNote).toHaveBeenCalledWith('note123');
    });

    it('shows delete confirmation dialog when clicking Delete Forever', async () => {
      const user = userEvent.setup();

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Delete Forever'));

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Permanently Delete Note')).toBeInTheDocument();
    });

    it('calls delete and navigates when confirming delete', async () => {
      const user = userEvent.setup();
      mockDeleteNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByLabelText('Note options');
      await user.click(menuButton);
      await user.click(screen.getByText('Delete Forever'));
      await user.click(screen.getByText('Confirm Delete'));

      await waitFor(() => {
        expect(mockDeleteNote).toHaveBeenCalledWith('note123');
        expect(mockNavigate).toHaveBeenCalledWith('/app/notes');
      });
    });
  });

  describe('Back Navigation', () => {
    it('navigates back to notes list when clicking back button', async () => {
      const user = userEvent.setup();

      render(<NoteEditor isNew={true} />, {
        preloadedState: createPreloadedState(),
      });

      const backButton = screen.getByLabelText('Back to notes');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/app/notes');
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Test Note',
        body: 'Test content',
        tags: [],
        pinned: false,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
    });

    it('saves note on Ctrl+S', async () => {
      const user = userEvent.setup();
      mockUpdateNote.mockResolvedValueOnce({});

      render(<NoteEditor noteId="note123" />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByLabelText('Note title');
      await user.type(titleInput, ' - modified');

      // Trigger Ctrl+S
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalled();
      });
    });
  });
});
