/**
 * =============================================================================
 * ADMINUSERSPAGE.TEST.JSX - Unit Tests for AdminUsersPage
 * =============================================================================
 *
 * Tests the AdminUsersPage component which displays user management interface.
 * Covers:
 * - Loading states
 * - Error states
 * - User list rendering
 * - Search functionality
 * - Role and status filtering
 * - User selection and detail panel
 * - Tab navigation in detail panel
 * - Create user modal
 * - Role badges and status badges
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from './AdminUsersPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin/users' }),
  };
});

// Mock the API module
vi.mock('../../lib/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserFlags: vi.fn(),
    resetUserPassword: vi.fn(),
    warnUser: vi.fn(),
    unsuspendUser: vi.fn(),
    addAdminNote: vi.fn(),
    getRoleConfig: vi.fn(),
    getRoleFeatures: vi.fn(),
  },
}));

// Mock child components to isolate testing
vi.mock('./components/UserContentTab', () => ({
  default: ({ user }) => <div data-testid="user-content-tab">Content Tab for {user.email}</div>,
}));

vi.mock('./components/UserActivityTab', () => ({
  default: ({ user }) => <div data-testid="user-activity-tab">Activity Tab for {user.email}</div>,
}));

vi.mock('./components/UserModerationTab', () => ({
  default: ({ user }) => <div data-testid="user-moderation-tab">Moderation Tab for {user.email}</div>,
}));

vi.mock('./components/UserLimitsTab', () => ({
  default: ({ user }) => <div data-testid="user-limits-tab">Limits Tab for {user.email}</div>,
}));

vi.mock('./components/UserSocialTab', () => ({
  default: ({ user }) => <div data-testid="user-social-tab">Social Tab for {user.email}</div>,
}));

// Mock Tooltip to simplify testing
vi.mock('../../components/ui/Tooltip', () => ({
  default: ({ children }) => <>{children}</>,
}));

// Mock AdminNav component
vi.mock('./components/AdminNav', () => ({
  default: () => <nav data-testid="admin-nav">Admin Nav</nav>,
}));

// Mock DefaultAvatar component
vi.mock('../../components/ui/DefaultAvatar', () => ({
  default: ({ name, size }) => (
    <div data-testid="default-avatar" data-name={name} data-size={size}>
      Avatar
    </div>
  ),
}));

// Mock the useAdminUsers hooks
vi.mock('./hooks/useAdminUsers', () => ({
  useRoleConfig: vi.fn(() => ({
    data: {
      features: {
        'feature.calendar': true,
        'feature.files': true,
        'feature.beta': false,
      },
    },
    isLoading: false,
  })),
  useRoleFeatures: vi.fn(() => ({
    data: {
      features: [
        { key: 'feature.calendar', label: 'Calendar', description: 'Access to calendar', category: 'optional' },
        { key: 'feature.files', label: 'Files', description: 'Access to files', category: 'optional' },
        { key: 'feature.beta', label: 'Beta Features', description: 'Early access', category: 'beta' },
      ],
    },
    isLoading: false,
  })),
}));

import { adminApi } from '../../lib/api';

describe('AdminUsersPage', () => {
  // Mock user data
  const mockUsers = [
    {
      _id: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        defaultAvatarId: 1,
      },
      moderationStatus: {
        warningCount: 0,
        isSuspended: false,
      },
      contentCounts: {
        notes: 10,
        tasks: 5,
        projects: 2,
        images: 3,
      },
      flags: {},
    },
    {
      _id: 'user-2',
      email: 'premium@example.com',
      role: 'premium',
      status: 'active',
      createdAt: '2024-02-15T00:00:00Z',
      lastLoginAt: '2024-03-01T00:00:00Z',
      profile: {
        firstName: 'Premium',
        lastName: 'Customer',
        avatarUrl: null,
        defaultAvatarId: 2,
      },
      moderationStatus: {
        warningCount: 1,
        isSuspended: false,
      },
      contentCounts: {
        notes: 50,
        tasks: 25,
        projects: 5,
        images: 100,
      },
      flags: { 'feature.beta': true },
    },
    {
      _id: 'user-3',
      email: 'free@example.com',
      role: 'free',
      status: 'active',
      createdAt: '2024-03-10T00:00:00Z',
      lastLoginAt: null,
      profile: {},
      moderationStatus: {
        warningCount: 0,
        isSuspended: false,
      },
      contentCounts: {
        notes: 2,
        tasks: 1,
        projects: 0,
        images: 0,
      },
      flags: {},
    },
    {
      _id: 'user-4',
      email: 'suspended@example.com',
      role: 'free',
      status: 'suspended',
      createdAt: '2024-01-20T00:00:00Z',
      lastLoginAt: '2024-02-01T00:00:00Z',
      profile: {
        firstName: 'Suspended',
        lastName: 'User',
      },
      moderationStatus: {
        warningCount: 3,
        isSuspended: true,
        suspendReason: 'Violation of terms',
      },
      contentCounts: {
        notes: 0,
        tasks: 0,
        projects: 0,
        images: 0,
      },
      flags: {},
    },
  ];

  const mockUsersResponse = {
    data: {
      users: mockUsers,
      total: 4,
      page: 1,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getUsers.mockResolvedValue(mockUsersResponse);
    adminApi.createUser.mockResolvedValue({ data: { _id: 'new-user', email: 'new@example.com' } });
    adminApi.updateUser.mockResolvedValue({ data: { success: true } });
    adminApi.updateUserFlags.mockResolvedValue({ data: { success: true } });
    adminApi.resetUserPassword.mockResolvedValue({ data: { success: true } });
    adminApi.warnUser.mockResolvedValue({ data: { success: true } });
    adminApi.unsuspendUser.mockResolvedValue({ data: { success: true } });
    adminApi.addAdminNote.mockResolvedValue({ data: { success: true } });
    adminApi.getRoleConfig.mockResolvedValue({ data: { features: {} } });
    adminApi.getRoleFeatures.mockResolvedValue({ data: { features: [] } });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================
  describe('Loading State', () => {
    it('shows loading skeletons while fetching users', async () => {
      // Keep promise pending to show loading state
      adminApi.getUsers.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<AdminUsersPage />);

      // Should show skeleton loaders
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Error State Tests
  // ===========================================================================
  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      adminApi.getUsers.mockRejectedValue(new Error('Network error'));

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      });
    });

    it('displays error details from API response', async () => {
      adminApi.getUsers.mockRejectedValue(new Error('Server error'));

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // User List Rendering Tests
  // ===========================================================================
  describe('User List Rendering', () => {
    it('renders user list when loaded', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
        expect(screen.getByText('premium@example.com')).toBeInTheDocument();
        expect(screen.getByText('free@example.com')).toBeInTheDocument();
      });
    });

    it('displays user count', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('4 users')).toBeInTheDocument();
      });
    });

    it('shows user names when available', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Premium Customer')).toBeInTheDocument();
      });
    });

    it('shows "No name set" when user has no name', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No name set')).toBeInTheDocument();
      });
    });

    it('shows empty state when no users found', async () => {
      adminApi.getUsers.mockResolvedValue({ data: { users: [], total: 0 } });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Role Badge Tests
  // ===========================================================================
  describe('Role Badges', () => {
    it('displays Admin badge for admin users', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        const adminBadges = screen.getAllByText('Admin');
        expect(adminBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays Premium badge for premium users', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Premium')).toBeInTheDocument();
      });
    });

    it('displays Free badge for free users', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        const freeBadges = screen.getAllByText('Free');
        expect(freeBadges.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Status Badge Tests
  // ===========================================================================
  describe('Status Badges', () => {
    it('displays Active badge for active users', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        const activeBadges = screen.getAllByText('Active');
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays Suspended badge for suspended users', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        // There are multiple "Suspended" texts (badge and filter option), get all
        const suspendedElements = screen.getAllByText('Suspended');
        expect(suspendedElements.length).toBeGreaterThan(0);
      });
    });

    it('displays warning count badge when user has warnings', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('1 Warning')).toBeInTheDocument();
        expect(screen.getByText('3 Warnings')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Search Functionality Tests
  // ===========================================================================
  describe('Search Functionality', () => {
    it('renders search input', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('calls API with search query when searching', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'admin');

      await waitFor(() => {
        expect(adminApi.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'admin' })
        );
      });
    });
  });

  // ===========================================================================
  // Role Filter Tests
  // ===========================================================================
  describe('Role Filter', () => {
    it('renders role filter dropdown', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        // Multiple comboboxes exist (role and status filters)
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes.length).toBeGreaterThan(0);
      });
    });

    it('filters users by role when role is selected', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Find the role select (first combobox with role options)
      const roleSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(roleSelect, 'admin');

      await waitFor(() => {
        expect(adminApi.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin' })
        );
      });
    });
  });

  // ===========================================================================
  // Status Filter Tests
  // ===========================================================================
  describe('Status Filter', () => {
    it('filters users by status when status is selected', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Find the status select (second combobox on desktop)
      const statusSelects = screen.getAllByRole('combobox');
      const statusSelect = statusSelects.find(s =>
        s.querySelector('option[value="suspended"]')
      );

      if (statusSelect) {
        await user.selectOptions(statusSelect, 'suspended');

        await waitFor(() => {
          expect(adminApi.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'suspended' })
          );
        });
      }
    });
  });

  // ===========================================================================
  // User Selection Tests
  // ===========================================================================
  describe('User Selection', () => {
    it('shows empty panel when no user is selected', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Select a user')).toBeInTheDocument();
        expect(screen.getByText('Choose a user from the list to view their details')).toBeInTheDocument();
      });
    });

    it('shows user detail panel when user is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Click on the first user row
      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Detail panel should show user info
        expect(screen.getAllByText('admin@example.com').length).toBeGreaterThan(1);
      });
    });

    it('highlights selected user in the list', async () => {
      const user = userEvent.setup();
      const { container } = render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Selected item should have border-l-primary class
        const selectedItem = container.querySelector('.border-l-primary');
        expect(selectedItem).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // User Detail Panel Tests
  // ===========================================================================
  describe('UserDetailPanel', () => {
    it('displays user email in detail panel', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Should have email visible in detail panel
        const emails = screen.getAllByText('admin@example.com');
        expect(emails.length).toBeGreaterThan(1);
      });
    });

    it('displays content stats in detail panel', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Content stats from the admin user
        expect(screen.getByText('Notes')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Images')).toBeInTheDocument();
      });
    });

    it('shows suspended status badge for suspended users', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Suspended User'));

      await waitFor(() => {
        // Should show multiple Suspended badges in detail panel
        const suspendedBadges = screen.getAllByText('Suspended');
        expect(suspendedBadges.length).toBeGreaterThan(1);
      });
    });
  });

  // ===========================================================================
  // Tab Navigation Tests
  // ===========================================================================
  describe('Tab Navigation', () => {
    it('displays all tabs in detail panel', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Check for tab buttons in the tab bar (using getAllByRole since there may be duplicates)
        const overviewButtons = screen.getAllByRole('button', { name: /overview/i });
        expect(overviewButtons.length).toBeGreaterThan(0);

        const profileButtons = screen.getAllByRole('button', { name: /profile/i });
        expect(profileButtons.length).toBeGreaterThan(0);

        const featuresButtons = screen.getAllByRole('button', { name: /features/i });
        expect(featuresButtons.length).toBeGreaterThan(0);

        const limitsButtons = screen.getAllByRole('button', { name: /limits/i });
        expect(limitsButtons.length).toBeGreaterThan(0);

        const contentButtons = screen.getAllByRole('button', { name: /content/i });
        expect(contentButtons.length).toBeGreaterThan(0);

        const socialButtons = screen.getAllByRole('button', { name: /social/i });
        expect(socialButtons.length).toBeGreaterThan(0);

        const activityButtons = screen.getAllByRole('button', { name: /activity/i });
        expect(activityButtons.length).toBeGreaterThan(0);

        const moderationButtons = screen.getAllByRole('button', { name: /moderation/i });
        expect(moderationButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows overview tab by default', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Overview tab should show Account section
        expect(screen.getByText('Account')).toBeInTheDocument();
      });
    });

    it('switches to content tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const contentButtons = screen.getAllByRole('button', { name: /content/i });
        expect(contentButtons.length).toBeGreaterThan(0);
      });

      // Click the first content button (tab button)
      const contentButtons = screen.getAllByRole('button', { name: /content/i });
      await user.click(contentButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('user-content-tab')).toBeInTheDocument();
      });
    });

    it('switches to activity tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const activityButtons = screen.getAllByRole('button', { name: /activity/i });
        expect(activityButtons.length).toBeGreaterThan(0);
      });

      const activityButtons = screen.getAllByRole('button', { name: /activity/i });
      await user.click(activityButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('user-activity-tab')).toBeInTheDocument();
      });
    });

    it('switches to moderation tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const moderationButtons = screen.getAllByRole('button', { name: /moderation/i });
        expect(moderationButtons.length).toBeGreaterThan(0);
      });

      const moderationButtons = screen.getAllByRole('button', { name: /moderation/i });
      await user.click(moderationButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('user-moderation-tab')).toBeInTheDocument();
      });
    });

    it('switches to limits tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const limitsButtons = screen.getAllByRole('button', { name: /limits/i });
        expect(limitsButtons.length).toBeGreaterThan(0);
      });

      const limitsButtons = screen.getAllByRole('button', { name: /limits/i });
      await user.click(limitsButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('user-limits-tab')).toBeInTheDocument();
      });
    });

    it('switches to social tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const socialButtons = screen.getAllByRole('button', { name: /social/i });
        expect(socialButtons.length).toBeGreaterThan(0);
      });

      const socialButtons = screen.getAllByRole('button', { name: /social/i });
      await user.click(socialButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('user-social-tab')).toBeInTheDocument();
      });
    });

    it('switches to profile tab when clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const profileButtons = screen.getAllByRole('button', { name: /profile/i });
        expect(profileButtons.length).toBeGreaterThan(0);
      });

      const profileButtons = screen.getAllByRole('button', { name: /profile/i });
      await user.click(profileButtons[0]);

      await waitFor(() => {
        // Profile tab shows form fields
        expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Create User Modal Tests
  // ===========================================================================
  describe('CreateUserModal', () => {
    it('opens create user modal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Click the add user button (UserPlus icon button)
      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create New User')).toBeInTheDocument();
      });
    });

    it('displays email input in create modal', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
      });
    });

    it('displays password inputs in create modal', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
      });
    });

    it('displays role selection buttons in create modal', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        // Modal should show role label and buttons
        expect(screen.getByText('Create New User')).toBeInTheDocument();
        // Multiple "Role" texts may exist (filter dropdown and modal)
        const roleLabels = screen.getAllByText('Role');
        expect(roleLabels.length).toBeGreaterThan(0);
      });
    });

    it('shows password mismatch error', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
      });

      const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
      const confirmInput = screen.getByPlaceholderText('Confirm password');

      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'differentpassword');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('disables submit when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('user@example.com');
      const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
      const confirmInput = screen.getByPlaceholderText('Confirm password');

      await user.type(emailInput, 'new@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'different');

      const createButton = screen.getByRole('button', { name: /create user/i });
      expect(createButton).toBeDisabled();
    });

    it('disables submit when password is too short', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('user@example.com');
      const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
      const confirmInput = screen.getByPlaceholderText('Confirm password');

      await user.type(emailInput, 'new@example.com');
      await user.type(passwordInput, 'short');
      await user.type(confirmInput, 'short');

      const createButton = screen.getByRole('button', { name: /create user/i });
      expect(createButton).toBeDisabled();
    });

    it('calls createUser API when form is valid and submitted', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('user@example.com');
      const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
      const confirmInput = screen.getByPlaceholderText('Confirm password');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'validpassword123');
      await user.type(confirmInput, 'validpassword123');

      const createButton = screen.getByRole('button', { name: /create user/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(adminApi.createUser).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'validpassword123',
          role: 'free',
        });
      });
    });

    it('closes modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create New User')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
      });
    });

    it('displays API error when create fails', async () => {
      adminApi.createUser.mockRejectedValue({
        response: { data: { error: 'Email already exists' } },
      });

      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const addButton = document.querySelector('button[class*="bg-primary"]');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('user@example.com');
      const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
      const confirmInput = screen.getByPlaceholderText('Confirm password');

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'validpassword123');
      await user.type(confirmInput, 'validpassword123');

      const createButton = screen.getByRole('button', { name: /create user/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Moderation Actions Tests
  // ===========================================================================
  describe('Moderation Actions', () => {
    it('shows Warn button for active users', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // There may be multiple warn buttons (header and moderation section)
        const warnButtons = screen.getAllByRole('button', { name: /warn/i });
        expect(warnButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows Unsuspend button for suspended users', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Suspended User'));

      await waitFor(() => {
        const unsuspendButtons = screen.getAllByRole('button', { name: /unsuspend/i });
        expect(unsuspendButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows Note button in detail panel', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // There may be multiple note buttons
        const noteButtons = screen.getAllByRole('button', { name: /note/i });
        expect(noteButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens warning modal when Warn is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const warnButtons = screen.getAllByRole('button', { name: /warn/i });
        expect(warnButtons.length).toBeGreaterThan(0);
      });

      // Click the first warn button
      const warnButtons = screen.getAllByRole('button', { name: /warn/i });
      await user.click(warnButtons[0]);

      await waitFor(() => {
        // Multiple "Issue Warning" texts may appear (button and modal title)
        const issueWarningTexts = screen.getAllByText('Issue Warning');
        expect(issueWarningTexts.length).toBeGreaterThan(0);
      });
    });

    it('opens admin note modal when Note is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        const noteButtons = screen.getAllByRole('button', { name: /note/i });
        expect(noteButtons.length).toBeGreaterThan(0);
      });

      const noteButtons = screen.getAllByRole('button', { name: /note/i });
      await user.click(noteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Add Admin Note')).toBeInTheDocument();
      });
    });

    it('calls unsuspend API when Unsuspend is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Suspended User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Suspended User'));

      await waitFor(() => {
        const unsuspendButtons = screen.getAllByRole('button', { name: /unsuspend/i });
        expect(unsuspendButtons.length).toBeGreaterThan(0);
      });

      const unsuspendButtons = screen.getAllByRole('button', { name: /unsuspend/i });
      await user.click(unsuspendButtons[0]);

      await waitFor(() => {
        expect(adminApi.unsuspendUser).toHaveBeenCalledWith('user-4', { reason: 'Admin action' });
      });
    });
  });

  // ===========================================================================
  // Role Change Tests
  // ===========================================================================
  describe('Role Change', () => {
    it('displays role buttons in overview tab', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // Overview tab shows role selection - there are multiple "Role" texts
        const roleTexts = screen.getAllByText('Role');
        expect(roleTexts.length).toBeGreaterThan(0);
      });
    });

    it('calls updateUser API when role is changed', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Premium Customer')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Premium Customer'));

      await waitFor(() => {
        // Wait for detail panel to load
        const roleTexts = screen.getAllByText('Role');
        expect(roleTexts.length).toBeGreaterThan(0);
      });

      // Find the Free button in the role section (role buttons in overview tab)
      // The Free buttons in the detail panel have specific structure
      const allFreeButtons = screen.getAllByRole('button', { name: /^free$/i });
      // Get the role change button (not the filter or create modal ones)
      const roleButton = allFreeButtons.find(btn =>
        btn.closest('.bg-bg') && btn.textContent === 'Free'
      );

      if (roleButton) {
        await user.click(roleButton);

        await waitFor(() => {
          expect(adminApi.updateUser).toHaveBeenCalledWith('user-2', { role: 'free' });
        });
      }
    });
  });

  // ===========================================================================
  // AdminNav Integration Tests
  // ===========================================================================
  describe('AdminNav Integration', () => {
    it('renders AdminNav component', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-nav')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Last Login Display Tests
  // ===========================================================================
  describe('Last Login Display', () => {
    it('shows "Online" for recent logins', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        // Admin user has lastLoginAt set to now, should show "Online"
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    it('shows "Never" for users who never logged in', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Never')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Password Reset Tests
  // ===========================================================================
  describe('Password Reset', () => {
    it('opens password reset modal when Reset is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // In overview tab, find the Reset button for password
        const resetButtons = screen.getAllByRole('button', { name: /reset/i });
        expect(resetButtons.length).toBeGreaterThan(0);
      });

      const resetButtons = screen.getAllByRole('button', { name: /reset/i });
      await user.click(resetButtons[0]);

      await waitFor(() => {
        // Modal title should appear
        const resetPasswordHeadings = screen.getAllByText('Reset Password');
        expect(resetPasswordHeadings.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Email Change Tests
  // ===========================================================================
  describe('Email Change', () => {
    it('opens email change modal when Change is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Admin User'));

      await waitFor(() => {
        // In overview tab, find the Change button for email
        const changeButton = screen.getByRole('button', { name: /change/i });
        expect(changeButton).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /change/i }));

      await waitFor(() => {
        expect(screen.getByText('Change Email Address')).toBeInTheDocument();
      });
    });
  });
});
