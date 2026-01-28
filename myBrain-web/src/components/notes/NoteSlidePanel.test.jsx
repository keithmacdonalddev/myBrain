import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import NoteSlidePanel from './NoteSlidePanel';

// Mock the NotePanelContext
const mockCloseNote = vi.fn();
let mockNotePanelContext = {
  isOpen: true,
  noteId: null,
  initialData: null,
  openNote: vi.fn(),
  openNewNote: vi.fn(),
  closeNote: mockCloseNote,
};

vi.mock('../../contexts/NotePanelContext', () => ({
  useNotePanel: () => mockNotePanelContext,
}));

// Mock the TaskPanelContext
vi.mock('../../contexts/TaskPanelContext', () => ({
  useTaskPanel: () => ({
    openTask: vi.fn(),
  }),
}));

// Mock the notes hooks with controllable state
let mockNoteData = null;
let mockIsLoading = false;
const mockCreateNote = vi.fn();

vi.mock('../../features/notes/hooks/useNotes', () => ({
  useNote: () => ({
    data: mockNoteData,
    isLoading: mockIsLoading,
  }),
  useCreateNote: () => ({
    mutateAsync: mockCreateNote,
    isPending: false,
  }),
  useUpdateNote: () => ({
    mutateAsync: vi.fn(),
  }),
  usePinNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useUnpinNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useArchiveNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useUnarchiveNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useTrashNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useRestoreNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useDeleteNote: () => ({
    mutateAsync: vi.fn(),
  }),
  useConvertNoteToTask: () => ({
    mutateAsync: vi.fn(),
  }),
  useNoteBacklinks: () => ({
    data: [],
    isLoading: false,
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

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock child components
vi.mock('../shared/TagsSection', () => ({
  default: () => <div data-testid="tags-section">Tags Section</div>,
}));

vi.mock('../../features/lifeAreas/components/LifeAreaPicker', () => ({
  LifeAreaPicker: () => <div data-testid="life-area-picker">Life Area Picker</div>,
}));

vi.mock('../../features/projects/components/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker">Project Picker</div>,
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

vi.mock('../shared/BacklinksPanel', () => ({
  default: () => <div data-testid="backlinks-panel">Backlinks Panel</div>,
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

describe('NoteSlidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockNotePanelContext = {
      isOpen: true,
      noteId: null,
      initialData: null,
      openNote: vi.fn(),
      openNewNote: vi.fn(),
      closeNote: mockCloseNote,
    };
    mockNoteData = null;
    mockIsLoading = false;
  });

  describe('Panel Visibility', () => {
    it('renders panel when isOpen is true', () => {
      mockNotePanelContext.isOpen = true;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-0');
      expect(panel).toBeInTheDocument();
    });

    it('hides panel when isOpen is false', () => {
      mockNotePanelContext.isOpen = false;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const panel = container.querySelector('.translate-x-full');
      expect(panel).toBeInTheDocument();
    });

    it('shows backdrop when panel is open', () => {
      mockNotePanelContext.isOpen = true;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.opacity-100');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('New Note Mode', () => {
    it('displays "New Note" text when creating a new note', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('New Note')).toBeInTheDocument();
    });

    it('shows title input with placeholder', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Note title...');
      expect(titleInput).toBeInTheDocument();
    });

    it('shows body textarea with placeholder', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const bodyTextarea = screen.getByPlaceholderText('Start writing...');
      expect(bodyTextarea).toBeInTheDocument();
    });

    it('shows Create Note button for new notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create note/i });
      expect(createButton).toBeInTheDocument();
    });

    it('disables Create Note button when title and body are empty', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const createButton = screen.getByRole('button', { name: /create note/i });
      expect(createButton).toBeDisabled();
    });

    it('enables Create Note button when title has content', async () => {
      const user = userEvent.setup();
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Note title...');
      await user.type(titleInput, 'My New Note');

      const createButton = screen.getByRole('button', { name: /create note/i });
      expect(createButton).not.toBeDisabled();
    });

    it('uses initialData when provided', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;
      mockNotePanelContext.initialData = {
        title: 'Pre-filled Title',
        body: 'Pre-filled Body',
      };

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Note title...');
      expect(titleInput).toHaveValue('Pre-filled Title');

      const bodyTextarea = screen.getByPlaceholderText('Start writing...');
      expect(bodyTextarea).toHaveValue('Pre-filled Body');
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      mockNotePanelContext.isOpen = true;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls closeNote when close button is clicked', async () => {
      const user = userEvent.setup();
      mockNotePanelContext.isOpen = true;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      const closeButton = buttons[0];
      await user.click(closeButton);

      expect(mockCloseNote).toHaveBeenCalled();
    });

    it('calls closeNote when backdrop is clicked', async () => {
      mockNotePanelContext.isOpen = true;

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/30');
      fireEvent.click(backdrop);

      expect(mockCloseNote).toHaveBeenCalled();
    });
  });

  describe('Edit Note Mode', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Existing Note',
        body: 'Note content here',
        tags: ['tag1'],
        lifeAreaId: null,
        projectId: null,
        pinned: false,
        status: 'active',
      };
    });

    it('displays existing note content', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Note title...');
      expect(titleInput).toHaveValue('Existing Note');
    });

    it('does not show Create Note button for existing notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByRole('button', { name: /create note/i })).not.toBeInTheDocument();
    });

    it('shows action buttons for existing notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('shows SaveStatus component for existing notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('save-status')).toBeInTheDocument();
    });

    it('shows BacklinksPanel for existing notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('backlinks-panel')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading existing note', () => {
      mockIsLoading = true;
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      const { container } = render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Trashed Note', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Trashed Note',
        body: 'Note content',
        tags: [],
        pinned: false,
        status: 'trashed',
      };
    });

    it('shows trashed indicator', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Trashed')).toBeInTheDocument();
    });

    it('disables title input for trashed notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const titleInput = screen.getByPlaceholderText('Note title...');
      expect(titleInput).toBeDisabled();
    });

    it('disables body textarea for trashed notes', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      const bodyTextarea = screen.getByPlaceholderText('Start writing...');
      expect(bodyTextarea).toBeDisabled();
    });
  });

  describe('Archived Note', () => {
    beforeEach(() => {
      mockNoteData = {
        _id: 'note123',
        title: 'Archived Note',
        body: 'Note content',
        tags: [],
        pinned: false,
        status: 'archived',
      };
    });

    it('shows archived indicator', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = 'note123';

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('Form Components', () => {
    it('renders TagsSection', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('tags-section')).toBeInTheDocument();
    });

    it('renders LifeAreaPicker', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('life-area-picker')).toBeInTheDocument();
    });

    it('renders ProjectPicker', () => {
      mockNotePanelContext.isOpen = true;
      mockNotePanelContext.noteId = null;

      render(<NoteSlidePanel />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('project-picker')).toBeInTheDocument();
    });
  });
});
