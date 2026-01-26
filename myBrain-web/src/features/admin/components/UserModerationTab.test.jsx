import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserModerationTab from './UserModerationTab';

// Mock the hooks
vi.mock('../hooks/useAdminUsers', () => ({
  useUserModerationHistory: vi.fn(),
  useWarnUser: vi.fn(),
  useSuspendUser: vi.fn(),
  useUnsuspendUser: vi.fn(),
  useBanUser: vi.fn(),
  useUnbanUser: vi.fn(),
  useAddAdminNote: vi.fn(),
  useSendAdminMessage: vi.fn(),
}));

// Mock the modal components
vi.mock('./WarnUserModal', () => ({
  default: vi.fn(({ user, onClose, onSubmit }) => (
    <div data-testid="warn-user-modal">
      <span>Warn Modal for {user.email}</span>
      <button onClick={onClose}>Close Warn</button>
      <button onClick={() => onSubmit('test reason', 1)}>Submit Warn</button>
    </div>
  )),
}));

vi.mock('./SuspendUserModal', () => ({
  default: vi.fn(({ user, onClose, onSubmit }) => (
    <div data-testid="suspend-user-modal">
      <span>Suspend Modal for {user.email}</span>
      <button onClick={onClose}>Close Suspend</button>
      <button onClick={() => onSubmit('suspend reason', '2024-12-31')}>Submit Suspend</button>
    </div>
  )),
}));

vi.mock('./BanUserModal', () => ({
  default: vi.fn(({ user, onClose, onSubmit }) => (
    <div data-testid="ban-user-modal">
      <span>Ban Modal for {user.email}</span>
      <button onClick={onClose}>Close Ban</button>
      <button onClick={() => onSubmit('ban reason')}>Submit Ban</button>
    </div>
  )),
}));

vi.mock('./AddAdminNoteModal', () => ({
  default: vi.fn(({ user, onClose, onSubmit }) => (
    <div data-testid="add-note-modal">
      <span>Add Note Modal for {user.email}</span>
      <button onClick={onClose}>Close Note</button>
      <button onClick={() => onSubmit('note content')}>Submit Note</button>
    </div>
  )),
}));

vi.mock('./SendAdminMessageModal', () => ({
  default: vi.fn(({ user, onClose, onSubmit }) => (
    <div data-testid="send-message-modal">
      <span>Send Message Modal for {user.email}</span>
      <button onClick={onClose}>Close Message</button>
      <button onClick={() => onSubmit({ subject: 'Test', message: 'Hello', category: 'general', priority: 'normal' })}>Submit Message</button>
    </div>
  )),
}));

// Mock ConfirmDialog
vi.mock('../../../components/ui/ConfirmDialog', () => ({
  default: vi.fn(({ isOpen, onClose, onConfirm, title, confirmText }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
      </div>
    );
  }),
}));

// Import the mocked modules to set return values
import {
  useUserModerationHistory,
  useWarnUser,
  useSuspendUser,
  useUnsuspendUser,
  useBanUser,
  useUnbanUser,
  useAddAdminNote,
  useSendAdminMessage,
} from '../hooks/useAdminUsers';

describe('UserModerationTab', () => {
  // Base mock user
  const createMockUser = (overrides = {}) => ({
    _id: 'user123',
    email: 'test@example.com',
    status: 'active',
    role: 'user',
    moderationStatus: {
      warningCount: 0,
      lastWarningAt: null,
      isSuspended: false,
      isBanned: false,
      suspendedUntil: null,
      suspendReason: null,
      banReason: null,
      bannedAt: null,
    },
    ...overrides,
  });

  // Mock mutation return value factory
  const createMockMutation = (overrides = {}) => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    error: null,
    ...overrides,
  });

  // Setup default hook mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no moderation history
    useUserModerationHistory.mockReturnValue({
      data: { actions: [], total: 0 },
      isLoading: false,
      error: null,
    });

    useWarnUser.mockReturnValue(createMockMutation());
    useSuspendUser.mockReturnValue(createMockMutation());
    useUnsuspendUser.mockReturnValue(createMockMutation());
    useBanUser.mockReturnValue(createMockMutation());
    useUnbanUser.mockReturnValue(createMockMutation());
    useAddAdminNote.mockReturnValue(createMockMutation());
    useSendAdminMessage.mockReturnValue(createMockMutation());
  });

  // ==========================================
  // Status Cards Tests
  // ==========================================

  describe('Status Cards', () => {
    it('renders warning count status card with zero warnings', () => {
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Warning Count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders warning count with actual count when user has warnings', () => {
      const user = createMockUser({
        moderationStatus: {
          warningCount: 3,
          lastWarningAt: '2024-01-15T10:00:00Z',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders last warning date when available', () => {
      const user = createMockUser({
        moderationStatus: {
          warningCount: 1,
          lastWarningAt: '2024-01-15T10:00:00Z',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Last Warning')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
    });

    it('shows "Never" when no last warning date', () => {
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('shows Active status for active users', () => {
      const user = createMockUser({ status: 'active' });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  // ==========================================
  // Suspended Status Tests
  // ==========================================

  describe('Suspended Status', () => {
    it('shows Suspended status when user is suspended', () => {
      const user = createMockUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: '2024-12-31T23:59:59Z',
          suspendReason: 'Violation of terms',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Suspended')).toBeInTheDocument();
    });

    it('shows suspended until date when user is suspended', () => {
      const user = createMockUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: '2024-12-31T23:59:59Z',
          suspendReason: 'Violation of terms',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Suspended Until')).toBeInTheDocument();
      expect(screen.getByText(/Dec 31, 2024/i)).toBeInTheDocument();
    });

    it('displays suspension reason when user is suspended', () => {
      const user = createMockUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: '2024-12-31T23:59:59Z',
          suspendReason: 'Repeated policy violations',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Suspension Reason:')).toBeInTheDocument();
      expect(screen.getByText('Repeated policy violations')).toBeInTheDocument();
    });

    it('shows Unsuspend button for suspended users instead of Suspend', () => {
      const user = createMockUser({
        moderationStatus: {
          isSuspended: true,
          suspendedUntil: '2024-12-31T23:59:59Z',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /unsuspend/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^suspend$/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // Banned Status Tests
  // ==========================================

  describe('Banned Status', () => {
    it('shows Banned status when user is banned', () => {
      const user = createMockUser({
        moderationStatus: {
          isBanned: true,
          banReason: 'Permanent violation',
          bannedAt: '2024-01-01T00:00:00Z',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Banned')).toBeInTheDocument();
    });

    it('displays ban reason and date when user is banned', () => {
      const user = createMockUser({
        moderationStatus: {
          isBanned: true,
          banReason: 'Repeated severe violations',
          bannedAt: '2024-01-15T10:00:00Z',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Ban Reason:')).toBeInTheDocument();
      expect(screen.getByText('Repeated severe violations')).toBeInTheDocument();
      expect(screen.getByText(/Banned on: Jan 15, 2024/i)).toBeInTheDocument();
    });

    it('shows Unban button for banned users', () => {
      const user = createMockUser({
        moderationStatus: {
          isBanned: true,
          banReason: 'Violation',
        },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /unban/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^suspend$/i })).not.toBeInTheDocument();
    });

    it('does not show Ban button when user is already banned', () => {
      const user = createMockUser({
        moderationStatus: {
          isBanned: true,
        },
      });
      render(<UserModerationTab user={user} />);

      // When banned, user sees "Unban" but not the standalone "Ban" button
      // Check that Ban button is not in the document (only Unban is present)
      const allButtons = screen.getAllByRole('button');
      const banButtons = allButtons.filter(btn => btn.textContent === 'Ban');
      expect(banButtons).toHaveLength(0);
    });

    it('disables Issue Warning button when user is banned', () => {
      const user = createMockUser({
        moderationStatus: {
          isBanned: true,
        },
      });
      render(<UserModerationTab user={user} />);

      const warnButton = screen.getByRole('button', { name: /issue warning/i });
      expect(warnButton).toBeDisabled();
    });
  });

  // ==========================================
  // Action Buttons Tests
  // ==========================================

  describe('Action Buttons', () => {
    it('renders all action buttons for active non-admin user', () => {
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /issue warning/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suspend/i })).toBeInTheDocument();
      // Find Ban button by exact text match
      const allButtons = screen.getAllByRole('button');
      const banButton = allButtons.find(btn => btn.textContent === 'Ban');
      expect(banButton).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('enables action buttons for regular users', () => {
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /issue warning/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /suspend/i })).not.toBeDisabled();
      // Find Ban button by exact text match
      const allButtons = screen.getAllByRole('button');
      const banButton = allButtons.find(btn => btn.textContent === 'Ban');
      expect(banButton).not.toBeDisabled();
    });
  });

  // ==========================================
  // Admin User Protection Tests
  // ==========================================

  describe('Admin User Protection', () => {
    it('disables Issue Warning button for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      expect(screen.getByRole('button', { name: /issue warning/i })).toBeDisabled();
    });

    it('disables Suspend button for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      expect(screen.getByRole('button', { name: /suspend/i })).toBeDisabled();
    });

    it('disables Ban button for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      // Find the Ban button (not Unban) - it has exact text "Ban"
      const allButtons = screen.getAllByRole('button');
      const banButton = allButtons.find(btn => btn.textContent === 'Ban');
      expect(banButton).toBeDisabled();
    });

    it('shows admin protection note for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      expect(screen.getByText(/admin users cannot be warned, suspended, or banned/i)).toBeInTheDocument();
    });

    it('does not show admin protection note for regular users', () => {
      const user = createMockUser({ role: 'user' });
      render(<UserModerationTab user={user} />);

      expect(screen.queryByText(/admin users cannot be warned, suspended, or banned/i)).not.toBeInTheDocument();
    });

    it('allows Add Note button for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      expect(screen.getByRole('button', { name: /add note/i })).not.toBeDisabled();
    });

    it('allows Send Message button for admin users', () => {
      const adminUser = createMockUser({ role: 'admin' });
      render(<UserModerationTab user={adminUser} />);

      expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
    });
  });

  // ==========================================
  // Modal Opening Tests
  // ==========================================

  describe('Modal Opening', () => {
    it('opens warn modal when Issue Warning is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /issue warning/i }));

      expect(screen.getByTestId('warn-user-modal')).toBeInTheDocument();
      expect(screen.getByText(`Warn Modal for ${user.email}`)).toBeInTheDocument();
    });

    it('opens suspend modal when Suspend is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /suspend/i }));

      expect(screen.getByTestId('suspend-user-modal')).toBeInTheDocument();
    });

    it('opens ban modal when Ban is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      // Find Ban button by exact text match
      const allButtons = screen.getAllByRole('button');
      const banButton = allButtons.find(btn => btn.textContent === 'Ban');
      await userObj.click(banButton);

      expect(screen.getByTestId('ban-user-modal')).toBeInTheDocument();
    });

    it('opens add note modal when Add Note is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /add note/i }));

      expect(screen.getByTestId('add-note-modal')).toBeInTheDocument();
    });

    it('opens send message modal when Send Message is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /send message/i }));

      expect(screen.getByTestId('send-message-modal')).toBeInTheDocument();
    });

    it('closes warn modal when close is triggered', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /issue warning/i }));
      expect(screen.getByTestId('warn-user-modal')).toBeInTheDocument();

      await userObj.click(screen.getByRole('button', { name: /close warn/i }));
      expect(screen.queryByTestId('warn-user-modal')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // Confirm Dialog Tests
  // ==========================================

  describe('Confirm Dialogs', () => {
    it('opens unsuspend confirm dialog when Unsuspend is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser({
        moderationStatus: { isSuspended: true },
      });
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /unsuspend/i }));

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      // The title "Unsuspend User" appears in the confirm dialog
      expect(screen.getAllByText('Unsuspend User').length).toBeGreaterThan(0);
    });

    it('opens unban confirm dialog when Unban is clicked', async () => {
      const userObj = userEvent.setup();
      const user = createMockUser({
        moderationStatus: { isBanned: true },
      });
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /unban/i }));

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      // The title "Unban User" appears in the confirm dialog
      expect(screen.getAllByText('Unban User').length).toBeGreaterThan(0);
    });

    it('calls unsuspend mutation when confirm dialog is confirmed', async () => {
      const userObj = userEvent.setup();
      const mockUnsuspend = vi.fn().mockResolvedValue({});
      useUnsuspendUser.mockReturnValue({
        mutateAsync: mockUnsuspend,
        isPending: false,
      });

      const user = createMockUser({
        moderationStatus: { isSuspended: true },
      });
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /unsuspend/i }));
      await userObj.click(screen.getByRole('button', { name: /unsuspend user/i }));

      expect(mockUnsuspend).toHaveBeenCalledWith({
        userId: 'user123',
        reason: 'Suspension lifted by admin',
      });
    });

    it('calls unban mutation when confirm dialog is confirmed', async () => {
      const userObj = userEvent.setup();
      const mockUnban = vi.fn().mockResolvedValue({});
      useUnbanUser.mockReturnValue({
        mutateAsync: mockUnban,
        isPending: false,
      });

      const user = createMockUser({
        moderationStatus: { isBanned: true },
      });
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /unban/i }));
      await userObj.click(screen.getByRole('button', { name: /unban user/i }));

      expect(mockUnban).toHaveBeenCalledWith({
        userId: 'user123',
        reason: 'Ban lifted by admin',
      });
    });
  });

  // ==========================================
  // Mutation Submission Tests
  // ==========================================

  describe('Mutation Submissions', () => {
    it('calls warn mutation when warn modal submits', async () => {
      const userObj = userEvent.setup();
      const mockWarn = vi.fn().mockResolvedValue({});
      useWarnUser.mockReturnValue({
        mutateAsync: mockWarn,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /issue warning/i }));
      await userObj.click(screen.getByRole('button', { name: /submit warn/i }));

      expect(mockWarn).toHaveBeenCalledWith({
        userId: 'user123',
        reason: 'test reason',
        level: 1,
      });
    });

    it('calls suspend mutation when suspend modal submits', async () => {
      const userObj = userEvent.setup();
      const mockSuspend = vi.fn().mockResolvedValue({});
      useSuspendUser.mockReturnValue({
        mutateAsync: mockSuspend,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /suspend/i }));
      await userObj.click(screen.getByRole('button', { name: /submit suspend/i }));

      expect(mockSuspend).toHaveBeenCalledWith({
        userId: 'user123',
        reason: 'suspend reason',
        until: '2024-12-31',
      });
    });

    it('calls ban mutation when ban modal submits', async () => {
      const userObj = userEvent.setup();
      const mockBan = vi.fn().mockResolvedValue({});
      useBanUser.mockReturnValue({
        mutateAsync: mockBan,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      // Find Ban button by exact text match
      const allButtons = screen.getAllByRole('button');
      const banButton = allButtons.find(btn => btn.textContent === 'Ban');
      await userObj.click(banButton);
      await userObj.click(screen.getByRole('button', { name: /submit ban/i }));

      expect(mockBan).toHaveBeenCalledWith({
        userId: 'user123',
        reason: 'ban reason',
      });
    });

    it('calls addAdminNote mutation when note modal submits', async () => {
      const userObj = userEvent.setup();
      const mockAddNote = vi.fn().mockResolvedValue({});
      useAddAdminNote.mockReturnValue({
        mutateAsync: mockAddNote,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /add note/i }));
      await userObj.click(screen.getByRole('button', { name: /submit note/i }));

      expect(mockAddNote).toHaveBeenCalledWith({
        userId: 'user123',
        content: 'note content',
      });
    });

    it('calls sendAdminMessage mutation when message modal submits', async () => {
      const userObj = userEvent.setup();
      const mockSendMessage = vi.fn().mockResolvedValue({});
      useSendAdminMessage.mockReturnValue({
        mutateAsync: mockSendMessage,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /send message/i }));
      await userObj.click(screen.getByRole('button', { name: /submit message/i }));

      expect(mockSendMessage).toHaveBeenCalledWith({
        userId: 'user123',
        subject: 'Test',
        message: 'Hello',
        category: 'general',
        priority: 'normal',
      });
    });
  });

  // ==========================================
  // Success Message Tests
  // ==========================================

  describe('Success Messages', () => {
    it('shows success message after successful warning', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const userObj = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockWarn = vi.fn().mockResolvedValue({});
      useWarnUser.mockReturnValue({
        mutateAsync: mockWarn,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /issue warning/i }));
      await userObj.click(screen.getByRole('button', { name: /submit warn/i }));

      await waitFor(() => {
        expect(screen.getByText(/warning issued successfully/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('shows success message after successful note addition', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const userObj = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockAddNote = vi.fn().mockResolvedValue({});
      useAddAdminNote.mockReturnValue({
        mutateAsync: mockAddNote,
        isPending: false,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /add note/i }));
      await userObj.click(screen.getByRole('button', { name: /submit note/i }));

      await waitFor(() => {
        expect(screen.getByText(/note added successfully/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  // ==========================================
  // Moderation History Tests
  // ==========================================

  describe('Moderation History', () => {
    it('shows loading state while fetching history', () => {
      useUserModerationHistory.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Moderation History')).toBeInTheDocument();
      // Loader should be present
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error message when history fetch fails', () => {
      useUserModerationHistory.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });

    it('shows empty state when no moderation history', () => {
      useUserModerationHistory.mockReturnValue({
        data: { actions: [], total: 0 },
        isLoading: false,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('No moderation history')).toBeInTheDocument();
    });

    it('displays moderation history items', () => {
      useUserModerationHistory.mockReturnValue({
        data: {
          actions: [
            {
              _id: 'action1',
              actionType: 'warning',
              reason: 'First warning for spam',
              details: { warningLevel: 1 },
              performedBy: { name: 'Admin User' },
              createdAt: '2024-01-15T10:00:00Z',
            },
            {
              _id: 'action2',
              actionType: 'suspension',
              reason: 'Temporary suspension',
              details: { suspendedUntil: '2024-02-15T10:00:00Z' },
              performedBy: { email: 'admin@test.com' },
              createdAt: '2024-01-20T10:00:00Z',
            },
          ],
          total: 2,
        },
        isLoading: false,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      // Check history header with count
      expect(screen.getByText('(2)')).toBeInTheDocument();

      // Check first action
      expect(screen.getByText('First warning for spam')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText(/by Admin User/i)).toBeInTheDocument();

      // Check second action
      expect(screen.getByText('Temporary suspension')).toBeInTheDocument();
      expect(screen.getByText(/by admin@test.com/i)).toBeInTheDocument();
    });

    it('displays note content in history item', () => {
      useUserModerationHistory.mockReturnValue({
        data: {
          actions: [
            {
              _id: 'action1',
              actionType: 'note',
              reason: 'Internal note',
              details: { noteContent: 'This is an internal note about the user.' },
              performedBy: { name: 'Admin' },
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('This is an internal note about the user.')).toBeInTheDocument();
    });

    it('shows unknown when performedBy is missing', () => {
      useUserModerationHistory.mockReturnValue({
        data: {
          actions: [
            {
              _id: 'action1',
              actionType: 'warning',
              reason: 'System warning',
              performedBy: null,
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      expect(screen.getByText(/by Unknown/)).toBeInTheDocument();
    });
  });

  // ==========================================
  // Edge Cases
  // ==========================================

  describe('Edge Cases', () => {
    it('handles user with no moderationStatus', () => {
      const user = {
        _id: 'user123',
        email: 'test@example.com',
        status: 'active',
        role: 'user',
        // No moderationStatus
      };
      render(<UserModerationTab user={user} />);

      expect(screen.getByText('Warning Count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles mutation errors gracefully', async () => {
      const userObj = userEvent.setup();
      const mockWarn = vi.fn().mockRejectedValue(new Error('API Error'));
      useWarnUser.mockReturnValue({
        mutateAsync: mockWarn,
        isPending: false,
        error: null,
      });

      const user = createMockUser();
      render(<UserModerationTab user={user} />);

      await userObj.click(screen.getByRole('button', { name: /issue warning/i }));
      await userObj.click(screen.getByRole('button', { name: /submit warn/i }));

      // Should not throw, error is handled by mutation
      expect(mockWarn).toHaveBeenCalled();
    });

    it('disables Unsuspend button when mutation is pending', () => {
      useUnsuspendUser.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      const user = createMockUser({
        moderationStatus: { isSuspended: true },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /unsuspend/i })).toBeDisabled();
    });

    it('disables Unban button when mutation is pending', () => {
      useUnbanUser.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      const user = createMockUser({
        moderationStatus: { isBanned: true },
      });
      render(<UserModerationTab user={user} />);

      expect(screen.getByRole('button', { name: /unban/i })).toBeDisabled();
    });
  });
});
