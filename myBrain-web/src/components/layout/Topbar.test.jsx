import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import Topbar from './Topbar';

// Mock the useFeatureFlag hook
vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(() => false),
}));

// Mock the NotificationBell component since it has its own dependencies
vi.mock('../../features/notifications/components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

// Helper to create auth state with defaults
const createAuthState = (overrides = {}) => ({
  user: {
    _id: 'user123',
    email: 'test@example.com',
    profile: {
      displayName: 'Test User',
      avatarUrl: null,
      defaultAvatarId: null,
    },
    role: 'user',
    flags: {},
    ...overrides.user,
  },
  isAuthenticated: true,
  loading: false,
  ...overrides,
});

// Helper to create default preloaded state
const createPreloadedState = (authOverrides = {}) => ({
  auth: createAuthState(authOverrides),
  theme: {
    mode: 'light',
    effectiveTheme: 'light',
    accentColor: 'blue',
    reduceMotion: false,
  },
  lifeAreas: {
    items: [],
    loading: false,
    error: null,
    selectedId: null,
  },
  toast: {
    toasts: [],
  },
});

describe('Topbar', () => {
  const mockOnMenuClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the topbar with myBrain title', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('myBrain')).toBeInTheDocument();
    });

    it('renders the menu toggle button', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('renders the search input on larger screens', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const searchInput = screen.getByPlaceholderText('Search...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders the settings button', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeInTheDocument();
    });

    it('renders user avatar button', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      // User dropdown trigger button
      const avatarButton = screen.getByRole('button', { expanded: false });
      expect(avatarButton).toBeInTheDocument();
    });
  });

  describe('Menu Toggle Interaction', () => {
    it('calls onMenuClick when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(menuButton);

      expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Dropdown', () => {
    it('opens dropdown when user avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      // Find and click the user dropdown trigger
      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      // Dropdown should be open
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('displays user display name and email in dropdown', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      // Open dropdown
      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when touchstart outside', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      // Open dropdown
      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Touch outside
      fireEvent.touchStart(document.body);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Display Name Logic', () => {
    it('uses displayName when available', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState({
          user: {
            profile: {
              displayName: 'Custom Name',
            },
          },
        }),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('Custom Name')).toBeInTheDocument();
    });

    it('uses firstName and lastName when displayName is not set', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState({
          user: {
            profile: {
              displayName: null,
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        }),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('uses firstName only when lastName is not set', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState({
          user: {
            profile: {
              displayName: null,
              firstName: 'John',
              lastName: null,
            },
          },
        }),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('uses email prefix when no name info is available', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState({
          user: {
            email: 'john.doe@example.com',
            profile: {
              displayName: null,
              firstName: null,
              lastName: null,
            },
          },
        }),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      await user.click(avatarButton);

      expect(screen.getByText('john.doe')).toBeInTheDocument();
    });
  });

  describe('Notification Bell', () => {
    it('shows notification bell when socialEnabled feature flag is true', async () => {
      const { useFeatureFlag } = await import('../../hooks/useFeatureFlag');
      useFeatureFlag.mockReturnValue(true);

      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('hides notification bell when socialEnabled feature flag is false', async () => {
      const { useFeatureFlag } = await import('../../hooks/useFeatureFlag');
      useFeatureFlag.mockReturnValue(false);

      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('menu button has accessible label', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveAttribute('aria-label', 'Toggle menu');
    });

    it('settings button has accessible label', () => {
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toHaveAttribute('aria-label');
    });

    it('user dropdown trigger has aria-expanded attribute', async () => {
      const user = userEvent.setup();
      render(<Topbar onMenuClick={mockOnMenuClick} />, {
        preloadedState: createPreloadedState(),
      });

      const avatarButton = screen.getByRole('button', { expanded: false });
      expect(avatarButton).toHaveAttribute('aria-expanded', 'false');
      expect(avatarButton).toHaveAttribute('aria-haspopup', 'true');

      await user.click(avatarButton);

      expect(avatarButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
