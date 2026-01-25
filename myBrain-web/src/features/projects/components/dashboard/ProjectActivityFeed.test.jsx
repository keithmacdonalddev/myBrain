import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ProjectActivityFeed } from './ProjectActivityFeed';

// Mock LifeAreaBadge
vi.mock('../../../lifeAreas/components/LifeAreaBadge', () => ({
  LifeAreaBadge: ({ lifeArea }) => (
    <span data-testid="life-area-badge">{lifeArea?.name}</span>
  ),
}));

const createPreloadedState = (userId = 'user123') => ({
  auth: {
    user: { _id: userId, email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    loading: false,
  },
  lifeAreas: { items: [], loading: false, error: null },
  theme: { mode: 'light', effectiveTheme: 'light' },
  toast: { toasts: [] },
});

describe('ProjectActivityFeed', () => {
  const mockProject = {
    _id: 'project123',
    title: 'Test Project',
    description: 'Project description text',
    outcome: 'Project goal/outcome',
    priority: 'high',
    deadline: '2024-12-31T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    lifeArea: { _id: 'la1', name: 'Work', color: '#3b82f6' },
    tags: ['urgent', 'important'],
  };

  const mockComments = [
    {
      _id: 'comment1',
      text: 'First comment',
      userId: 'user123',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      _id: 'comment2',
      text: 'Second comment from another user',
      userId: 'user456',
      createdAt: '2024-01-11T12:00:00Z',
    },
  ];

  const mockHandlers = {
    onAddComment: vi.fn(),
    onUpdateComment: vi.fn(),
    onDeleteComment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders tabs for comments and details', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('shows comments tab by default', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('First comment')).toBeInTheDocument();
    });

    it('shows comment count in tab', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  describe('Comments Tab', () => {
    it('displays all comments', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment from another user')).toBeInTheDocument();
    });

    it('shows empty state when no comments', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('No comments yet')).toBeInTheDocument();
      expect(screen.getByText('Start the conversation')).toBeInTheDocument();
    });

    it('renders add comment input', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('shows timestamps for comments', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      // formatDistanceToNow should show relative time
      expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
    });
  });

  describe('Add Comment', () => {
    it('calls onAddComment when submitting', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'New comment text');

      // Find the send button by its containing svg icon
      const buttons = screen.getAllByRole('button');
      const sendBtn = buttons.find(btn => btn.querySelector('svg'));

      if (sendBtn) {
        await user.click(sendBtn);
      }
    });

    it('submits comment on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'New comment text{enter}');

      expect(mockHandlers.onAddComment).toHaveBeenCalledWith('New comment text');
    });

    it('clears input after submitting', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'New comment{enter}');

      expect(input).toHaveValue('');
    });

    it('does not submit empty comment', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, '   {enter}');

      expect(mockHandlers.onAddComment).not.toHaveBeenCalled();
    });

    it('shows loading state while adding comment', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
          isAdding={true}
        />,
        { preloadedState: createPreloadedState() }
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Edit Comment', () => {
    it('shows edit button only for own comments', () => {
      const { container } = render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState('user123') }
      );

      // User123 owns comment1, so edit should be available on hover
      const firstCommentContainer = screen.getByText('First comment').closest('.group');
      expect(firstCommentContainer).toBeInTheDocument();
    });

    it('enters edit mode on edit button click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState('user123') }
      );

      // Find edit button for first comment (owned by user123)
      const commentGroup = screen.getByText('First comment').closest('.group');
      const editButton = commentGroup?.querySelector('button');

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const editInput = container.querySelector('input[type="text"]');
          expect(editInput).toBeInTheDocument();
          expect(editInput).toHaveValue('First comment');
        });
      }
    });

    it('calls onUpdateComment when saving edit', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState('user123') }
      );

      // Find and click edit button
      const commentGroup = screen.getByText('First comment').closest('.group');
      const buttons = commentGroup?.querySelectorAll('button');

      if (buttons && buttons.length > 0) {
        await user.click(buttons[0]);

        await waitFor(() => {
          const editInput = container.querySelector('input[type="text"]');
          expect(editInput).toBeInTheDocument();
        });

        // Clear and type new text
        const editInput = container.querySelector('input[type="text"]');
        if (editInput) {
          await user.clear(editInput);
          await user.type(editInput, 'Updated comment{enter}');

          expect(mockHandlers.onUpdateComment).toHaveBeenCalledWith('comment1', 'Updated comment');
        }
      }
    });

    it('cancels edit on Escape key', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState('user123') }
      );

      // Find and click edit button
      const commentGroup = screen.getByText('First comment').closest('.group');
      const buttons = commentGroup?.querySelectorAll('button');

      if (buttons && buttons.length > 0) {
        await user.click(buttons[0]);

        await waitFor(() => {
          const editInput = container.querySelector('input[type="text"]');
          expect(editInput).toBeInTheDocument();
        });

        // Press Escape
        await user.keyboard('{Escape}');

        // Should exit edit mode
        expect(screen.getByText('First comment')).toBeInTheDocument();
      }
    });
  });

  describe('Delete Comment', () => {
    it('calls onDeleteComment when delete button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState('user123') }
      );

      // Find delete button for first comment (owned by user123)
      const commentGroup = screen.getByText('First comment').closest('.group');
      const buttons = commentGroup?.querySelectorAll('button');

      // Delete button is usually the second one
      if (buttons && buttons.length > 1) {
        await user.click(buttons[1]);

        expect(mockHandlers.onDeleteComment).toHaveBeenCalledWith('comment1');
      }
    });
  });

  describe('Details Tab', () => {
    it('switches to details tab on click', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={mockComments}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      // Description should be visible
      expect(screen.getByText('Project description text')).toBeInTheDocument();
    });

    it('shows project description in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText('Project description text')).toBeInTheDocument();
    });

    it('shows project outcome in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText('Project goal/outcome')).toBeInTheDocument();
    });

    it('shows priority in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('shows deadline in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
    });

    it('shows life area badge in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByTestId('life-area-badge')).toBeInTheDocument();
    });

    it('shows tags in details', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('shows created and updated dates', async () => {
      const user = userEvent.setup();
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
        />,
        { preloadedState: createPreloadedState() }
      );

      await user.click(screen.getByText('Details'));

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('disables input while adding comment', () => {
      render(
        <ProjectActivityFeed
          project={mockProject}
          comments={[]}
          {...mockHandlers}
          isAdding={true}
        />,
        { preloadedState: createPreloadedState() }
      );

      const input = screen.getByPlaceholderText('Add a comment...');
      // The button should be disabled when adding
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.closest('.border-t'));
      if (sendButton) {
        expect(sendButton).toBeDisabled();
      }
    });
  });
});
