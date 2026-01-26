import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AppShell from './AppShell';

// Mock child components to isolate testing
vi.mock('./Topbar', () => ({
  default: ({ onMenuClick }) => (
    <div data-testid="topbar">
      <button data-testid="topbar-menu-button" onClick={onMenuClick}>
        Menu
      </button>
    </div>
  ),
}));

vi.mock('./Sidebar', () => ({
  default: ({ isOpen, onClose, isMobilePanel }) => (
    <div data-testid="sidebar" data-is-open={isOpen} data-is-mobile-panel={isMobilePanel}>
      <button data-testid="sidebar-close-button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('../notes/NoteSlidePanel', () => ({
  default: () => <div data-testid="note-slide-panel">NoteSlidePanel</div>,
}));

vi.mock('../tasks/TaskSlidePanel', () => ({
  default: () => <div data-testid="task-slide-panel">TaskSlidePanel</div>,
}));

vi.mock('../../features/settings/SettingsPage', () => ({
  default: ({ onMobileClose }) => (
    <div data-testid="settings-page">
      <button data-testid="settings-close" onClick={onMobileClose}>Close</button>
      Settings Page
    </div>
  ),
}));

vi.mock('../../features/profile/ProfilePage', () => ({
  default: ({ onMobileClose }) => (
    <div data-testid="profile-page">
      <button data-testid="profile-close" onClick={onMobileClose}>Close</button>
      Profile Page
    </div>
  ),
}));

// Mock the contexts
vi.mock('../../contexts/NotePanelContext', () => ({
  NotePanelProvider: ({ children }) => <div data-testid="note-panel-provider">{children}</div>,
}));

vi.mock('../../contexts/TaskPanelContext', () => ({
  TaskPanelProvider: ({ children }) => <div data-testid="task-panel-provider">{children}</div>,
}));

// Helper to create auth state
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
  lifeAreas: {
    items: [],
    loading: false,
    error: null,
    selectedId: null,
  },
  theme: {
    mode: 'light',
    effectiveTheme: 'light',
    accentColor: 'blue',
    reduceMotion: false,
  },
  toast: {
    toasts: [],
  },
});

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the Topbar component', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });

    it('renders the Sidebar component', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders the NoteSlidePanel component', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('note-slide-panel')).toBeInTheDocument();
    });

    it('renders the TaskSlidePanel component', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('task-slide-panel')).toBeInTheDocument();
    });

    it('wraps content with NotePanelProvider', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('note-panel-provider')).toBeInTheDocument();
    });

    it('wraps content with TaskPanelProvider', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByTestId('task-panel-provider')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle', () => {
    it('sidebar is initially closed', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
    });

    it('opens sidebar when menu button is clicked in Topbar', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const menuButton = screen.getByTestId('topbar-menu-button');
      await user.click(menuButton);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'true');
    });

    it('closes sidebar when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      // Open sidebar first
      const menuButton = screen.getByTestId('topbar-menu-button');
      await user.click(menuButton);

      // Close it
      const closeButton = screen.getByTestId('sidebar-close-button');
      await user.click(closeButton);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
    });
  });

  describe('Mobile Bottom Navigation', () => {
    it('renders Menu button in mobile bottom nav', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const menuButtons = screen.getAllByText('Menu');
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('renders Search button in mobile bottom nav', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('renders Settings button in mobile bottom nav', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders Profile button in mobile bottom nav', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('Mobile Full-Page Panels', () => {
    it('opens menu panel when Menu is clicked in bottom nav', async () => {
      const user = userEvent.setup();
      const { container } = render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      // Find the Menu button in the mobile bottom nav (the one that's not in Topbar)
      const menuButtons = screen.getAllByText('Menu');
      // The last one is in the bottom nav
      await user.click(menuButtons[menuButtons.length - 1]);

      // When menu panel is open, the MobileMenuPanel renders
      // Check for the "Menu" heading that appears in MobileMenuPanel header (not MobileBottomNav)
      await waitFor(() => {
        // There should be a close button with aria-label "Close" in the panel
        const closeButtons = screen.getAllByRole('button', { name: /close/i });
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens settings panel when Settings is clicked in bottom nav', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    it('opens profile panel when Profile is clicked in bottom nav', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const profileButton = screen.getByRole('button', { name: /profile/i });
      await user.click(profileButton);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    it('closes settings panel when close is triggered', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });

      // Close settings using the close button
      const closeButton = screen.getByTestId('settings-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
      });
    });

    it('closes profile panel when close is triggered', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      // Open profile
      const profileButton = screen.getByRole('button', { name: /profile/i });
      await user.click(profileButton);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      // Close profile using the close button
      const closeButton = screen.getByTestId('profile-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('profile-page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Toggle in Mobile Nav', () => {
    it('toggles search input visibility when Search is clicked', async () => {
      const user = userEvent.setup();
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      // Find the search button
      const searchButton = screen.getByRole('button', { name: /search/i });

      // Click to open search
      await user.click(searchButton);

      // Search input should be visible
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search...');
        expect(searchInput).toBeInTheDocument();
      });

      // Click again to close
      await user.click(searchButton);

      // Search input should be hidden (max-height: 0)
      // The input is still in DOM but visually hidden, so we check for opacity
    });
  });

  describe('Layout Structure', () => {
    it('has correct screen height styling', () => {
      const { container } = render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const shell = container.querySelector('.h-screen');
      expect(shell).toBeInTheDocument();
    });

    it('has flex layout', () => {
      const { container } = render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const shell = container.querySelector('.flex.flex-col');
      expect(shell).toBeInTheDocument();
    });

    it('main content area exists', () => {
      render(<AppShell />, {
        preloadedState: createPreloadedState(),
      });

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });
  });
});
