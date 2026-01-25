/**
 * =============================================================================
 * INBOXPAGE.TEST.JSX - Tests for Inbox Page Component
 * =============================================================================
 * Tests cover:
 * - Loading, error, and empty states
 * - Note card rendering and interactions
 * - Convert to task functionality
 * - Mark done (process) functionality
 * - Note panel integration
 * - Progress header display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import InboxPage from './InboxPage';

// Mock hooks from useNotes
vi.mock('../notes/hooks/useNotes', () => ({
  useInboxNotes: vi.fn(),
  useProcessNote: vi.fn(),
  useConvertNoteToTask: vi.fn()
}));

// Mock analytics hook
vi.mock('../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn()
}));

// Mock toast hook
vi.mock('../../hooks/useToast', () => ({
  default: vi.fn()
}));

// Mock MobilePageHeader
vi.mock('../../components/layout/MobilePageHeader', () => ({
  default: vi.fn(({ title }) => (
    <div data-testid="mobile-page-header">{title}</div>
  ))
}));

// Mock NoteSlidePanel
vi.mock('../../components/notes/NoteSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="note-slide-panel" />)
}));

// Mock TaskSlidePanel
vi.mock('../../components/tasks/TaskSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="task-slide-panel" />)
}));

// Mock NotePanelContext
const mockOpenNote = vi.fn();
vi.mock('../../contexts/NotePanelContext', () => ({
  NotePanelProvider: vi.fn(({ children }) => <div>{children}</div>),
  useNotePanel: vi.fn(() => ({
    isOpen: false,
    noteId: null,
    openNote: mockOpenNote,
    openNewNote: vi.fn(),
    closeNote: vi.fn()
  }))
}));

// Mock TaskPanelContext
const mockOpenTask = vi.fn();
vi.mock('../../contexts/TaskPanelContext', () => ({
  TaskPanelProvider: vi.fn(({ children }) => <div>{children}</div>),
  useTaskPanel: vi.fn(() => ({
    isOpen: false,
    taskId: null,
    openTask: mockOpenTask,
    openNewTask: vi.fn(),
    closeTask: vi.fn()
  }))
}));

// Import mocked hooks
import { useInboxNotes, useProcessNote, useConvertNoteToTask } from '../notes/hooks/useNotes';
import { usePageTracking } from '../../hooks/useAnalytics';
import useToast from '../../hooks/useToast';

describe('InboxPage', () => {
  // Mock toast functions
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  };

  // Sample note data
  const mockNotes = [
    {
      _id: 'note-1',
      title: 'First inbox note',
      body: 'This is the body of the first note with some content to display.',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
    },
    {
      _id: 'note-2',
      title: 'Second inbox note',
      body: 'Another note body here.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    },
    {
      _id: 'note-3',
      title: '', // Untitled note
      body: 'Note without a title.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    useInboxNotes.mockReturnValue({
      data: { notes: mockNotes, total: 3 },
      isLoading: false,
      error: null
    });

    useProcessNote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({})
    });

    useConvertNoteToTask.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { task: { _id: 'task-123' } }
      })
    });

    usePageTracking.mockReturnValue({});
    useToast.mockReturnValue(mockToast);
  });

  describe('Loading State', () => {
    it('renders loading skeletons while fetching data', () => {
      useInboxNotes.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      const { container } = render(<InboxPage />);

      // Should show 3 skeleton placeholders
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(3);
    });

    it('shows skeleton with correct styling', () => {
      useInboxNotes.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      const { container } = render(<InboxPage />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('bg-panel');
      expect(skeleton).toHaveClass('rounded-2xl');
    });
  });

  describe('Error State', () => {
    it('renders error message when fetch fails', () => {
      useInboxNotes.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      });

      render(<InboxPage />);

      expect(screen.getByText('Failed to load inbox')).toBeInTheDocument();
    });

    it('displays error with danger styling', () => {
      useInboxNotes.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      });

      render(<InboxPage />);

      const errorText = screen.getByText('Failed to load inbox');
      expect(errorText).toHaveClass('text-danger');
    });
  });

  describe('Empty State (Inbox Zero)', () => {
    it('renders InboxZeroState when no notes exist', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [], total: 0 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.getByText('Inbox Zero!')).toBeInTheDocument();
    });

    it('shows celebration message in empty state', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [], total: 0 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.getByText(/processed all your quick notes/i)).toBeInTheDocument();
    });

    it('shows pro tip in empty state', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [], total: 0 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.getByText(/pro tip/i)).toBeInTheDocument();
      expect(screen.getByText(/quick note on the dashboard/i)).toBeInTheDocument();
    });

    it('shows explanation of inbox in empty state', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [], total: 0 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.getByText(/what's the inbox/i)).toBeInTheDocument();
    });
  });

  describe('Note Cards Rendering', () => {
    it('renders all note cards when data exists', () => {
      render(<InboxPage />);

      expect(screen.getByText('First inbox note')).toBeInTheDocument();
      expect(screen.getByText('Second inbox note')).toBeInTheDocument();
    });

    it('displays note body preview', () => {
      render(<InboxPage />);

      expect(screen.getByText(/body of the first note/i)).toBeInTheDocument();
    });

    it('shows "Untitled Note" for notes without title', () => {
      render(<InboxPage />);

      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });

    it('displays relative time for recent notes', () => {
      render(<InboxPage />);

      // 5 minutes ago should show "5m ago"
      expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
    });

    it('displays hours for older notes', () => {
      render(<InboxPage />);

      // 2 hours ago should show "2h ago"
      expect(screen.getByText(/2h ago/i)).toBeInTheDocument();
    });

    it('displays days for notes older than 24 hours', () => {
      render(<InboxPage />);

      // 3 days ago should show "3d ago"
      expect(screen.getByText(/3d ago/i)).toBeInTheDocument();
    });

    it('renders Convert to Task button for each note', () => {
      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      expect(convertButtons).toHaveLength(3);
    });

    it('renders Mark Done button for each note', () => {
      render(<InboxPage />);

      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });
      expect(markDoneButtons).toHaveLength(3);
    });
  });

  describe('Convert to Task Functionality', () => {
    it('calls convertToTask mutation when clicking Convert to Task button', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({
        data: { task: { _id: 'task-123' } }
      });

      useConvertNoteToTask.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      await user.click(convertButtons[0]);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'note-1',
        keepNote: true
      });
    });

    it('shows success toast after successful conversion', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({
        data: { task: { _id: 'task-123' } }
      });

      useConvertNoteToTask.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      await user.click(convertButtons[0]);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Converted to task');
      });
    });

    it('opens task panel after successful conversion', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({
        data: { task: { _id: 'task-123' } }
      });

      useConvertNoteToTask.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      await user.click(convertButtons[0]);

      await waitFor(() => {
        expect(mockOpenTask).toHaveBeenCalledWith('task-123');
      });
    });

    it('shows error toast when conversion fails', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Conversion failed'));

      useConvertNoteToTask.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      await user.click(convertButtons[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to convert to task');
      });
    });

    it('does not propagate click event to card', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({
        data: { task: { _id: 'task-123' } }
      });

      useConvertNoteToTask.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      await user.click(convertButtons[0]);

      // openNote should not be called when clicking the button
      expect(mockOpenNote).not.toHaveBeenCalled();
    });
  });

  describe('Mark Done Functionality', () => {
    it('calls processNote mutation when clicking Mark Done button', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});

      useProcessNote.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });
      await user.click(markDoneButtons[0]);

      expect(mockMutateAsync).toHaveBeenCalledWith('note-1');
    });

    it('shows success toast after marking done', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});

      useProcessNote.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });
      await user.click(markDoneButtons[0]);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Note processed');
      });
    });

    it('shows error toast when mark done fails', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Process failed'));

      useProcessNote.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });
      await user.click(markDoneButtons[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to process note');
      });
    });

    it('does not propagate click event to card', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});

      useProcessNote.mockReturnValue({
        mutateAsync: mockMutateAsync
      });

      render(<InboxPage />);

      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });
      await user.click(markDoneButtons[0]);

      // openNote should not be called when clicking the button
      expect(mockOpenNote).not.toHaveBeenCalled();
    });
  });

  describe('Note Panel Integration', () => {
    it('opens note panel when clicking on a note card', async () => {
      const user = userEvent.setup();

      render(<InboxPage />);

      // Click on the note title (which is inside the card)
      const noteTitle = screen.getByText('First inbox note');
      await user.click(noteTitle);

      expect(mockOpenNote).toHaveBeenCalledWith('note-1');
    });

    it('renders NoteSlidePanel component', () => {
      render(<InboxPage />);

      expect(screen.getByTestId('note-slide-panel')).toBeInTheDocument();
    });

    it('renders TaskSlidePanel component', () => {
      render(<InboxPage />);

      expect(screen.getByTestId('task-slide-panel')).toBeInTheDocument();
    });
  });

  describe('Progress Header', () => {
    it('shows item count when notes exist', () => {
      render(<InboxPage />);

      // There are two elements (mobile and desktop) - check that at least one exists
      const itemCountElements = screen.getAllByText(/3 items to process/i);
      expect(itemCountElements.length).toBeGreaterThan(0);
    });

    it('shows singular form for single item', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [mockNotes[0]], total: 1 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      // There are two elements (mobile and desktop) - check that at least one exists
      const itemCountElements = screen.getAllByText(/1 item to process/i);
      expect(itemCountElements.length).toBeGreaterThan(0);
    });

    it('shows remaining count in stats', () => {
      render(<InboxPage />);

      // The remaining count is shown in a large format
      const remainingText = screen.getByText('3');
      expect(remainingText).toBeInTheDocument();
    });

    it('shows progress percentage', () => {
      render(<InboxPage />);

      // With 3 items and 0 processed, percentage is 0%
      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('renders progress bar when items exist', () => {
      const { container } = render(<InboxPage />);

      // Progress bar container
      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toBeInTheDocument();
    });

    it('hides progress section when inbox is empty', () => {
      useInboxNotes.mockReturnValue({
        data: { notes: [], total: 0 },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.queryByText(/% complete/i)).not.toBeInTheDocument();
    });

    it('shows helper tips when items exist', () => {
      render(<InboxPage />);

      expect(screen.getByText('Make it actionable')).toBeInTheDocument();
      expect(screen.getByText('Archive as reference')).toBeInTheDocument();
    });
  });

  describe('Mobile Page Header', () => {
    it('renders MobilePageHeader with correct title', () => {
      render(<InboxPage />);

      expect(screen.getByTestId('mobile-page-header')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-page-header')).toHaveTextContent('Inbox');
    });
  });

  describe('Page Tracking', () => {
    it('calls usePageTracking hook', () => {
      render(<InboxPage />);

      expect(usePageTracking).toHaveBeenCalled();
    });
  });

  describe('Context Providers', () => {
    it('wraps content with NotePanelProvider', () => {
      // This is implicitly tested by the fact that note panel interactions work
      render(<InboxPage />);

      // The panels should be rendered
      expect(screen.getByTestId('note-slide-panel')).toBeInTheDocument();
    });

    it('wraps content with TaskPanelProvider', () => {
      // This is implicitly tested by the fact that task panel interactions work
      render(<InboxPage />);

      expect(screen.getByTestId('task-slide-panel')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('shows "just now" for very recent notes', () => {
      useInboxNotes.mockReturnValue({
        data: {
          notes: [{
            _id: 'note-recent',
            title: 'Just added',
            body: 'Very recent note',
            createdAt: new Date().toISOString() // now
          }],
          total: 1
        },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('shows formatted date for notes older than a week', () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // 10 days ago

      useInboxNotes.mockReturnValue({
        data: {
          notes: [{
            _id: 'note-old',
            title: 'Old note',
            body: 'An older note',
            createdAt: oldDate.toISOString()
          }],
          total: 1
        },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      // Should show a formatted date instead of "Xd ago"
      const dateText = screen.getByText(/added/i);
      expect(dateText).toBeInTheDocument();
    });
  });

  describe('Note Body Truncation', () => {
    it('truncates long note bodies', () => {
      const longBody = 'A'.repeat(200);

      useInboxNotes.mockReturnValue({
        data: {
          notes: [{
            _id: 'note-long',
            title: 'Long note',
            body: longBody,
            createdAt: new Date().toISOString()
          }],
          total: 1
        },
        isLoading: false,
        error: null
      });

      render(<InboxPage />);

      // Body should be truncated to 150 characters
      const bodyElement = screen.getByText('A'.repeat(150));
      expect(bodyElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('note cards are clickable', () => {
      const { container } = render(<InboxPage />);

      const cards = container.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('buttons have descriptive text', () => {
      render(<InboxPage />);

      const convertButtons = screen.getAllByRole('button', { name: /convert to task/i });
      const markDoneButtons = screen.getAllByRole('button', { name: /mark done/i });

      expect(convertButtons[0]).toBeVisible();
      expect(markDoneButtons[0]).toBeVisible();
    });
  });
});
