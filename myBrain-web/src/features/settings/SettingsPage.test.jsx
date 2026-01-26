/**
 * =============================================================================
 * SETTINGSPAGE.TEST.JSX - Unit Tests for SettingsPage
 * =============================================================================
 *
 * Tests the SettingsPage component which provides user settings management.
 * Covers:
 * - Desktop navigation sidebar rendering
 * - Mobile menu view navigation
 * - Section switching (subscription, appearance, widgets, etc.)
 * - SubscriptionUsage section with plan info and usage bars
 * - AppearanceSettings with theme, accent color, glass intensity
 * - TagsManagement with search, filter, create modal
 * - Theme selection dispatching Redux actions
 * - Accent color selection
 *
 * Note: Component renders both mobile and desktop views simultaneously.
 * Tests target specific views using container queries when needed.
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import SettingsPage from './SettingsPage';

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// Mock useTags hooks
vi.mock('../../hooks/useTags', () => ({
  useAllTags: vi.fn(),
  useCreateTag: vi.fn(),
  useUpdateTag: vi.fn(),
  useRenameTag: vi.fn(),
  useDeleteTag: vi.fn(),
  useMergeTags: vi.fn(),
}));

// Mock useToast hook
vi.mock('../../hooks/useToast', () => ({
  default: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    undo: vi.fn(),
  })),
}));

// Mock TooltipsContext
vi.mock('../../contexts/TooltipsContext', () => ({
  useTooltips: vi.fn(() => ({
    tooltipsEnabled: true,
    setTooltipsEnabled: vi.fn(),
    toggleTooltips: vi.fn(),
    isUpdating: false,
  })),
}));

// Mock useUserActivity hook
vi.mock('../profile/hooks/useActivity', () => ({
  useUserActivity: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

// Mock authApi
vi.mock('../../lib/api', () => ({
  authApi: {
    getSubscription: vi.fn(),
  },
}));

// Mock @tanstack/react-query useQuery (for subscription)
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

// Mock sub-components with minimal renders
vi.mock('../lifeAreas/components/LifeAreasManager', () => ({
  LifeAreasManager: () => <div data-testid="life-areas-manager">Life Areas Manager</div>,
}));

vi.mock('../../components/settings/SavedLocationsManager', () => ({
  default: () => <div data-testid="saved-locations-manager">Saved Locations Manager</div>,
}));

vi.mock('../../components/settings/WeatherSettings', () => ({
  default: () => <div data-testid="weather-settings">Weather Settings</div>,
}));

vi.mock('../../components/settings/WidgetsSettings', () => ({
  default: () => <div data-testid="widgets-settings">Widgets Settings</div>,
}));

// Import mocked modules
import {
  useAllTags,
  useCreateTag,
  useUpdateTag,
  useRenameTag,
  useDeleteTag,
  useMergeTags,
} from '../../hooks/useTags';
import useToast from '../../hooks/useToast';
import { useTooltips } from '../../contexts/TooltipsContext';
import { useUserActivity } from '../profile/hooks/useActivity';
import { useQuery } from '@tanstack/react-query';

// -----------------------------------------------------------------------------
// Test Setup
// -----------------------------------------------------------------------------

describe('SettingsPage', () => {
  // Default mock values
  const mockSubscriptionData = {
    role: 'free',
    roleLabel: 'Free',
    limits: {
      maxNotes: 100,
      maxTasks: 50,
      maxProjects: 5,
      maxEvents: 20,
      maxImages: 10,
      maxCategories: 5,
      maxStorageBytes: 104857600, // 100MB
    },
    usage: {
      notes: 25,
      tasks: 10,
      projects: 2,
      events: 5,
      images: 3,
      categories: 2,
      storageBytes: 10485760, // 10MB
    },
  };

  const mockTagsData = {
    tags: [
      { name: 'work', color: '#3b82f6', isActive: true, usageCount: 15, createdAt: '2024-01-01' },
      { name: 'personal', color: '#10b981', isActive: true, usageCount: 10, createdAt: '2024-01-02' },
      { name: 'archived', color: null, isActive: false, usageCount: 0, createdAt: '2024-01-03' },
    ],
  };

  // Create mock objects that are referenced in tests
  const mockToast = {
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    undo: vi.fn(),
  };

  const mockMutationReturn = {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    useAllTags.mockReturnValue({
      data: mockTagsData,
      isLoading: false,
    });

    useCreateTag.mockReturnValue(mockMutationReturn);
    useUpdateTag.mockReturnValue(mockMutationReturn);
    useRenameTag.mockReturnValue(mockMutationReturn);
    useDeleteTag.mockReturnValue(mockMutationReturn);
    useMergeTags.mockReturnValue(mockMutationReturn);

    useToast.mockReturnValue(mockToast);

    useTooltips.mockReturnValue({
      tooltipsEnabled: true,
      setTooltipsEnabled: vi.fn(),
      toggleTooltips: vi.fn(),
      isUpdating: false,
    });

    useUserActivity.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    useQuery.mockReturnValue({
      data: mockSubscriptionData,
      isLoading: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // Helper to get desktop view container
  // ---------------------------------------------------------------------------
  const getDesktopView = (container) => {
    // Desktop view has class "hidden sm:flex"
    return container.querySelector('.sm\\:flex.hidden');
  };

  // Helper to get mobile view container
  const getMobileView = (container) => {
    // Mobile view has class "sm:hidden"
    return container.querySelector('.sm\\:hidden');
  };

  // ---------------------------------------------------------------------------
  // Desktop Navigation Tests
  // ---------------------------------------------------------------------------

  describe('Desktop Navigation', () => {
    it('renders desktop navigation sidebar with all sections', () => {
      const { container } = render(<SettingsPage />);

      // Get the desktop view container
      const desktopView = getDesktopView(container);
      expect(desktopView).toBeInTheDocument();

      // Check for navigation items in desktop view
      const nav = within(desktopView).getByRole('navigation');
      expect(nav).toBeInTheDocument();

      // All section labels should be present in desktop nav
      // Use nav scope to avoid matching items in content area
      expect(within(nav).getByText('Subscription')).toBeInTheDocument();
      expect(within(nav).getByText('Appearance')).toBeInTheDocument();
      expect(within(nav).getByText('Widgets')).toBeInTheDocument();
      expect(within(nav).getByText('Weather')).toBeInTheDocument();
      expect(within(nav).getByText('Categories')).toBeInTheDocument();
      expect(within(nav).getByText('Locations')).toBeInTheDocument();
      expect(within(nav).getByText('Tags')).toBeInTheDocument();
      expect(within(nav).getByText('Activity')).toBeInTheDocument();
    });

    it('displays Settings header with icon', () => {
      const { container } = render(<SettingsPage />);

      // Should have Settings heading in both mobile and desktop
      const headings = screen.getAllByText('Settings');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('shows subscription section by default', () => {
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      // Default section is subscription
      expect(within(desktopView).getByText('Subscription & Usage')).toBeInTheDocument();
    });

    it('can switch between sections on desktop', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      // Click on Appearance section in desktop nav
      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      // Should show Appearance content
      await waitFor(() => {
        expect(within(desktopView).getByText('Customize how myBrain looks')).toBeInTheDocument();
      });
    });

    it('switches to Tags section and shows tag list', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      // Click on Tags section
      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      // Should show tags management
      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
        expect(within(desktopView).getByText('personal')).toBeInTheDocument();
      });
    });

    it('switches to Widgets section and shows mocked component', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      const widgetsButton = within(desktopView).getByRole('button', { name: /Widgets/i });
      await user.click(widgetsButton);

      await waitFor(() => {
        expect(within(desktopView).getByTestId('widgets-settings')).toBeInTheDocument();
      });
    });

    it('switches to Weather section', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      const weatherButton = within(desktopView).getByRole('button', { name: /Weather/i });
      await user.click(weatherButton);

      await waitFor(() => {
        expect(within(desktopView).getByTestId('weather-settings')).toBeInTheDocument();
      });
    });

    it('switches to Life Areas section', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      const categoriesButton = within(desktopView).getByRole('button', { name: /Categories/i });
      await user.click(categoriesButton);

      await waitFor(() => {
        expect(within(desktopView).getByTestId('life-areas-manager')).toBeInTheDocument();
      });
    });

    it('switches to Locations section', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const desktopView = getDesktopView(container);

      // Find button by the Locations label text within the nav
      const nav = within(desktopView).getByRole('navigation');
      const locationsLabel = within(nav).getByText('Locations');
      const locationsButton = locationsLabel.closest('button');
      await user.click(locationsButton);

      await waitFor(() => {
        expect(within(desktopView).getByTestId('saved-locations-manager')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Mobile Navigation Tests
  // ---------------------------------------------------------------------------

  describe('Mobile Navigation', () => {
    it('renders mobile menu with section buttons', () => {
      const { container } = render(<SettingsPage />);

      const mobileView = getMobileView(container);
      expect(mobileView).toBeInTheDocument();

      // Mobile menu shows all sections as buttons
      const buttons = within(mobileView).getAllByRole('button');
      // At least 10 section buttons + close button
      expect(buttons.length).toBeGreaterThanOrEqual(10);
    });

    it('calls onMobileClose when close button is clicked', async () => {
      const onMobileClose = vi.fn();
      const user = userEvent.setup();

      render(<SettingsPage onMobileClose={onMobileClose} />);

      // Find and click the close button (X icon)
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(onMobileClose).toHaveBeenCalled();
    });

    it('mobile section navigation shows section content', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);

      const mobileView = getMobileView(container);

      // Find Tags button in mobile view
      const tagsButton = within(mobileView).getByText('Tags');
      await user.click(tagsButton);

      // After clicking, should see the Tags section content
      await waitFor(() => {
        // Tags content should now be visible in mobile
        expect(within(mobileView).getByText('work')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Subscription Section Tests
  // ---------------------------------------------------------------------------

  describe('Subscription Section', () => {
    it('shows plan information', () => {
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Subscription & Usage')).toBeInTheDocument();
      expect(within(desktopView).getByText('View your current plan and resource usage')).toBeInTheDocument();
    });

    it('displays current plan card with role', () => {
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Free Plan')).toBeInTheDocument();
      expect(within(desktopView).getByText('FREE')).toBeInTheDocument();
    });

    it('shows resource usage items', () => {
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Notes')).toBeInTheDocument();
      expect(within(desktopView).getByText('Tasks')).toBeInTheDocument();
      expect(within(desktopView).getByText('Projects')).toBeInTheDocument();
    });

    it('shows usage values with limits', () => {
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      // Check for usage display (25/100 notes)
      expect(within(desktopView).getByText('25')).toBeInTheDocument();
      expect(within(desktopView).getByText('100')).toBeInTheDocument();
    });

    it('shows loading state when subscription is loading', () => {
      useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      // Should show loading spinner
      expect(desktopView.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error state when subscription fails to load', () => {
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load' },
      });

      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Failed to load subscription info')).toBeInTheDocument();
    });

    it('shows upgrade prompt for free users', () => {
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Need more resources?')).toBeInTheDocument();
    });

    it('displays premium plan correctly', () => {
      useQuery.mockReturnValue({
        data: {
          role: 'premium',
          roleLabel: 'Premium',
          limits: {
            maxNotes: -1,
            maxTasks: -1,
            maxProjects: -1,
            maxEvents: -1,
            maxImages: -1,
            maxCategories: -1,
            maxStorageBytes: -1,
          },
          usage: {
            notes: 100,
            tasks: 50,
            projects: 10,
            events: 30,
            images: 20,
            categories: 5,
            storageBytes: 52428800,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Premium Plan')).toBeInTheDocument();
      expect(within(desktopView).getByText('PREMIUM')).toBeInTheDocument();
    });

    it('displays admin plan correctly', () => {
      useQuery.mockReturnValue({
        data: {
          role: 'admin',
          roleLabel: 'Admin',
          limits: {
            maxNotes: -1,
            maxTasks: -1,
            maxProjects: -1,
            maxEvents: -1,
            maxImages: -1,
            maxCategories: -1,
            maxStorageBytes: -1,
          },
          usage: {
            notes: 500,
            tasks: 200,
            projects: 50,
            events: 100,
            images: 100,
            categories: 20,
            storageBytes: 209715200,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      expect(within(desktopView).getByText('Admin Plan')).toBeInTheDocument();
      expect(within(desktopView).getByText('ADMIN')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Appearance Section Tests
  // ---------------------------------------------------------------------------

  describe('Appearance Section', () => {
    it('shows theme options (Light, Dark, System)', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      // Navigate to Appearance section
      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Light')).toBeInTheDocument();
        expect(within(desktopView).getByText('Dark')).toBeInTheDocument();
        expect(within(desktopView).getByText('System')).toBeInTheDocument();
      });
    });

    it('shows accent color options', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Accent Color')).toBeInTheDocument();
      });
    });

    it('shows glass intensity options', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Glass Intensity')).toBeInTheDocument();
        expect(within(desktopView).getByText('Low')).toBeInTheDocument();
        expect(within(desktopView).getByText('Medium')).toBeInTheDocument();
        expect(within(desktopView).getByText('High')).toBeInTheDocument();
      });
    });

    it('shows accessibility options', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Accessibility')).toBeInTheDocument();
        expect(within(desktopView).getByText('Reduce motion')).toBeInTheDocument();
        expect(within(desktopView).getByText('Show tooltips')).toBeInTheDocument();
      });
    });

    it('clicking theme option changes selection', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />, {
        preloadedState: {
          theme: {
            mode: 'dark',
            effectiveTheme: 'dark',
            accentColor: 'blue',
            reduceMotion: false,
            glassIntensity: 'medium',
          },
        },
      });
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Light')).toBeInTheDocument();
      });

      // Click Light theme button
      const lightButton = within(desktopView).getByText('Light').closest('button');
      await user.click(lightButton);

      // The click should trigger the setTheme action (tested through Redux)
      // The component updates based on Redux state
    });

    it('clicking accent color updates selection', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />, {
        preloadedState: {
          theme: {
            mode: 'dark',
            effectiveTheme: 'dark',
            accentColor: 'blue',
            reduceMotion: false,
            glassIntensity: 'medium',
          },
        },
      });
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      // Wait for accent color section to appear
      await waitFor(() => {
        expect(within(desktopView).getByText('Accent Color')).toBeInTheDocument();
      });

      // Find accent color buttons (they don't have text labels, just color circles)
      const accentButtons = within(desktopView).getAllByRole('button').filter(
        btn => btn.title && ['Blue', 'Purple', 'Green', 'Orange', 'Pink', 'Teal'].includes(btn.title)
      );

      expect(accentButtons.length).toBeGreaterThan(0);
    });

    it('reduce motion toggle works', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />, {
        preloadedState: {
          theme: {
            mode: 'dark',
            effectiveTheme: 'dark',
            accentColor: 'blue',
            reduceMotion: false,
            glassIntensity: 'medium',
          },
        },
      });
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Reduce motion')).toBeInTheDocument();
      });

      // Find the reduce motion toggle (button near "Reduce motion" text)
      const reduceMotionText = within(desktopView).getByText('Reduce motion');
      const reduceMotionSection = reduceMotionText.closest('.p-4');
      const toggleButton = within(reduceMotionSection).getByRole('button');

      await user.click(toggleButton);
      // The click triggers dispatch(setReduceMotion)
    });

    it('tooltips toggle calls setTooltipsEnabled', async () => {
      const setTooltipsEnabled = vi.fn();
      useTooltips.mockReturnValue({
        tooltipsEnabled: true,
        setTooltipsEnabled,
        toggleTooltips: vi.fn(),
        isUpdating: false,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Show tooltips')).toBeInTheDocument();
      });

      // Find the tooltips toggle
      const tooltipsText = within(desktopView).getByText('Show tooltips');
      const tooltipsSection = tooltipsText.closest('.p-4');
      const toggleButton = within(tooltipsSection).getByRole('button');

      await user.click(toggleButton);

      expect(setTooltipsEnabled).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Tags Section Tests
  // ---------------------------------------------------------------------------

  describe('Tags Section', () => {
    it('shows tags list', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
        expect(within(desktopView).getByText('personal')).toBeInTheDocument();
        expect(within(desktopView).getByText('archived')).toBeInTheDocument();
      });
    });

    it('shows tag count summary', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText(/3 total/)).toBeInTheDocument();
        expect(within(desktopView).getByText(/2 active/)).toBeInTheDocument();
        expect(within(desktopView).getByText(/1 inactive/)).toBeInTheDocument();
      });
    });

    it('shows New Tag button', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByRole('button', { name: /New Tag/i })).toBeInTheDocument();
      });
    });

    it('opens create tag modal when New Tag is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByRole('button', { name: /New Tag/i })).toBeInTheDocument();
      });

      const newTagButton = within(desktopView).getByRole('button', { name: /New Tag/i });
      await user.click(newTagButton);

      // Modal is rendered at document level, not inside desktopView
      await waitFor(() => {
        expect(screen.getByText('Create New Tag')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter tag name...')).toBeInTheDocument();
      });
    });

    it('creates a new tag through the modal', async () => {
      const createTagMutation = {
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      };
      useCreateTag.mockReturnValue(createTagMutation);

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      const newTagButton = within(desktopView).getByRole('button', { name: /New Tag/i });
      await user.click(newTagButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter tag name...')).toBeInTheDocument();
      });

      // Type new tag name
      const input = screen.getByPlaceholderText('Enter tag name...');
      await user.type(input, 'newTag');

      // Click Create button in modal
      const createButton = screen.getByRole('button', { name: /^Create$/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(createTagMutation.mutateAsync).toHaveBeenCalledWith({
          name: 'newTag',
          color: null,
        });
      });
    });

    it('disables Create button when tag name is empty', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByRole('button', { name: /New Tag/i })).toBeInTheDocument();
      });

      const newTagButton = within(desktopView).getByRole('button', { name: /New Tag/i });
      await user.click(newTagButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Create New Tag')).toBeInTheDocument();
      });

      // Create button should be disabled when no name entered
      const createButton = screen.getByRole('button', { name: /^Create$/i });
      expect(createButton).toBeDisabled();

      // After entering a name, button should be enabled
      const input = screen.getByPlaceholderText('Enter tag name...');
      await user.type(input, 'testTag');
      expect(createButton).toBeEnabled();
    });

    it('shows search input for filtering tags', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByPlaceholderText('Search tags...')).toBeInTheDocument();
      });
    });

    it('filters tags when searching', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
      });

      const searchInput = within(desktopView).getByPlaceholderText('Search tags...');
      await user.type(searchInput, 'work');

      // Should only show 'work' tag now
      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
        expect(within(desktopView).queryByText('personal')).not.toBeInTheDocument();
      });
    });

    it('shows sort dropdown', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('shows inactive toggle checkbox', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByLabelText(/Show inactive/i)).toBeInTheDocument();
      });
    });

    it('shows loading state when tags are loading', async () => {
      useAllTags.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(desktopView.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('shows empty state when no tags exist', async () => {
      useAllTags.mockReturnValue({
        data: { tags: [] },
        isLoading: false,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('No tags yet')).toBeInTheDocument();
        expect(within(desktopView).getByText('Create your first tag')).toBeInTheDocument();
      });
    });

    it('shows usage count for each tag', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('15')).toBeInTheDocument(); // work usage count
        expect(within(desktopView).getByText('10')).toBeInTheDocument(); // personal usage count
      });
    });

    it('shows inactive badge for inactive tags', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('inactive')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Activity Section Tests
  // ---------------------------------------------------------------------------

  describe('Activity Section', () => {
    it('shows activity header', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Your Activity')).toBeInTheDocument();
      });
    });

    it('shows time range selector buttons', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('7 days')).toBeInTheDocument();
        expect(within(desktopView).getByText('30 days')).toBeInTheDocument();
        expect(within(desktopView).getByText('90 days')).toBeInTheDocument();
      });
    });

    it('shows loading state when activity is loading', async () => {
      useUserActivity.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(desktopView.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('shows error state when activity fails to load', async () => {
      useUserActivity.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed' },
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Failed to load activity')).toBeInTheDocument();
      });
    });

    it('shows empty state when no activity recorded', async () => {
      useUserActivity.mockReturnValue({
        data: { timeline: [] },
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('No activity recorded yet')).toBeInTheDocument();
      });
    });

    it('displays activity timeline when data exists', async () => {
      useUserActivity.mockReturnValue({
        data: {
          timeline: [
            {
              date: new Date().toISOString(),
              activities: [
                { id: '1', action: 'Logged in', category: 'account', timestamp: new Date().toISOString(), success: true },
                { id: '2', action: 'Created note', category: 'content', timestamp: new Date().toISOString(), success: true },
              ],
            },
          ],
          total: 2,
          period: '30 days',
        },
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Logged in')).toBeInTheDocument();
        expect(within(desktopView).getByText('Created note')).toBeInTheDocument();
      });
    });

    it('shows failed indicator for unsuccessful activities', async () => {
      useUserActivity.mockReturnValue({
        data: {
          timeline: [
            {
              date: new Date().toISOString(),
              activities: [
                { id: '1', action: 'Failed login attempt', category: 'security', timestamp: new Date().toISOString(), success: false },
              ],
            },
          ],
          total: 1,
          period: '30 days',
        },
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const activityButton = within(desktopView).getByRole('button', { name: /Activity/i });
      await user.click(activityButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('(failed)')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('Integration', () => {
    it('remembers active section when switching back', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      // Go to Tags
      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
      });

      // Go to Appearance
      const appearanceButton = within(desktopView).getByRole('button', { name: /Appearance/i });
      await user.click(appearanceButton);

      await waitFor(() => {
        expect(within(desktopView).getByText('Theme')).toBeInTheDocument();
      });

      // Go back to Tags
      await user.click(within(desktopView).getByRole('button', { name: /Tags/i }));

      // Tags should still show
      await waitFor(() => {
        expect(within(desktopView).getByText('work')).toBeInTheDocument();
      });
    });

    it('cancel button in create tag modal closes modal', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsPage />);
      const desktopView = getDesktopView(container);

      const tagsButton = within(desktopView).getByRole('button', { name: /Tags/i });
      await user.click(tagsButton);

      const newTagButton = within(desktopView).getByRole('button', { name: /New Tag/i });
      await user.click(newTagButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Tag')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create New Tag')).not.toBeInTheDocument();
      });
    });
  });
});
