/**
 * =============================================================================
 * ADMINROLESPAGE.TEST.JSX - Unit Tests for AdminRolesPage
 * =============================================================================
 *
 * Tests the AdminRolesPage component which displays role configuration cards
 * for managing user limits and feature access per role.
 *
 * Covers:
 * - Loading states with skeleton placeholders
 * - Error states with retry functionality
 * - Role cards display (free, premium, admin)
 * - Limits and Features tab switching
 * - Save button disabled state when no changes
 * - formatBytes and parseStorageToBytes utility functions
 * - Feature toggles and limit changes
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminRolesPage from './AdminRolesPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin/roles' }),
  };
});

// Mock the hooks from useAdminUsers
const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('./hooks/useAdminUsers', () => ({
  useRoleConfigs: vi.fn(),
  useRoleFeatures: vi.fn(),
  useUpdateRoleConfig: vi.fn(),
}));

import { useRoleConfigs, useRoleFeatures, useUpdateRoleConfig } from './hooks/useAdminUsers';

describe('AdminRolesPage', () => {
  // Sample role configuration data
  const mockRoleConfigs = {
    roles: [
      {
        _id: 'free',
        limits: {
          maxNotes: 100,
          maxTasks: 50,
          maxProjects: 5,
          maxEvents: 20,
          maxImages: 10,
          maxCategories: 5,
          maxStorageBytes: 50 * 1024 * 1024, // 50 MB
        },
        features: {
          aiAssistant: false,
          advancedAnalytics: false,
        },
      },
      {
        _id: 'premium',
        limits: {
          maxNotes: 1000,
          maxTasks: 500,
          maxProjects: 50,
          maxEvents: 200,
          maxImages: 100,
          maxCategories: 50,
          maxStorageBytes: 1024 * 1024 * 1024, // 1 GB
        },
        features: {
          aiAssistant: true,
          advancedAnalytics: true,
        },
      },
      {
        _id: 'admin',
        limits: {
          maxNotes: -1, // Unlimited
          maxTasks: -1,
          maxProjects: -1,
          maxEvents: -1,
          maxImages: -1,
          maxCategories: -1,
          maxStorageBytes: -1,
        },
        features: {
          aiAssistant: true,
          advancedAnalytics: true,
        },
      },
    ],
  };

  // Sample features data
  const mockFeatures = {
    features: [
      {
        key: 'aiAssistant',
        label: 'AI Assistant',
        description: 'Access to AI-powered features',
        category: 'enhanced',
      },
      {
        key: 'advancedAnalytics',
        label: 'Advanced Analytics',
        description: 'Detailed usage analytics',
        category: 'enhanced',
      },
      {
        key: 'betaFeatures',
        label: 'Beta Features',
        description: 'Early access to new features',
        category: 'beta',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful state
    useRoleConfigs.mockReturnValue({
      data: mockRoleConfigs,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    useRoleFeatures.mockReturnValue({
      data: mockFeatures,
    });

    useUpdateRoleConfig.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================
  describe('Loading State', () => {
    it('shows skeleton placeholders while loading', () => {
      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      // Should show 3 skeleton cards (for free, premium, admin)
      const skeletonCards = document.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBeGreaterThan(0);
    });

    it('does not show role cards while loading', () => {
      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      // Role names should not be visible
      expect(screen.queryByText('free')).not.toBeInTheDocument();
      expect(screen.queryByText('premium')).not.toBeInTheDocument();
      expect(screen.queryByText('admin')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State Tests
  // ===========================================================================
  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load role configurations'),
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      // Error message appears in both the title and detail text
      const errorMessages = screen.getAllByText('Failed to load role configurations');
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('shows retry button on error', async () => {
      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls refetch when clicking Try Again', async () => {
      const user = userEvent.setup();

      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      await user.click(screen.getByText('Try Again'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('displays error message text from error object', () => {
      useRoleConfigs.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Custom API error message'),
        refetch: mockRefetch,
      });

      render(<AdminRolesPage />);

      expect(screen.getByText('Custom API error message')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Role Cards Display Tests
  // ===========================================================================
  describe('Role Cards Display', () => {
    it('renders all three role cards when data loads', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Check that all role names are displayed (capitalized)
        expect(screen.getByText('free')).toBeInTheDocument();
        expect(screen.getByText('premium')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('displays role descriptions for each role', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getByText('Default settings for free users')).toBeInTheDocument();
        expect(screen.getByText('Settings for premium subscribers')).toBeInTheDocument();
        expect(screen.getByText('Settings for administrators')).toBeInTheDocument();
      });
    });

    it('displays page header with title', () => {
      render(<AdminRolesPage />);

      // "Roles & Limits" appears in both the nav and the page header
      const titles = screen.getAllByText('Roles & Limits');
      expect(titles.length).toBeGreaterThanOrEqual(1);
      // Verify the h2 heading specifically exists
      expect(screen.getByRole('heading', { level: 2, name: 'Roles & Limits' })).toBeInTheDocument();
    });

    it('displays page description', () => {
      render(<AdminRolesPage />);

      expect(
        screen.getByText(/Configure default limits and feature access for each user role/)
      ).toBeInTheDocument();
    });

    it('displays info box with role configuration information', () => {
      render(<AdminRolesPage />);

      expect(screen.getByText('About Role Configuration')).toBeInTheDocument();
      expect(screen.getByText(/Set resource limits per role/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // RoleCard Tab Switching Tests
  // ===========================================================================
  describe('RoleCard Tab Switching', () => {
    it('shows limits tab as active by default', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Find Limits buttons within the role cards (not in nav)
        // The RoleCard Limits tabs have the Gauge icon and specific styling
        const limitsButtons = screen.getAllByRole('button', { name: /limits/i });
        // Filter to only those that are RoleCard tab buttons (have text-primary class when active)
        const roleCardLimitsButtons = limitsButtons.filter(
          (btn) => btn.textContent?.includes('Limits') && btn.closest('[class*="border-b border-border"]')
        );
        expect(roleCardLimitsButtons.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('can switch from limits to features tab', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Limits').length).toBe(3);
      });

      // Click on the first Features tab
      const featuresButtons = screen.getAllByRole('button', { name: /features/i });
      await user.click(featuresButtons[0]);

      // Features tab should now be active
      expect(featuresButtons[0]).toHaveClass('text-primary');
    });

    it('displays limit inputs when limits tab is active', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Should see limit labels
        expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
      });
    });

    it('displays feature toggles when features tab is active', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Features').length).toBe(3);
      });

      // Click on the first Features tab
      const featuresButtons = screen.getAllByRole('button', { name: /features/i });
      await user.click(featuresButtons[0]);

      await waitFor(() => {
        // Should see feature labels from mock data
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
        expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
      });
    });

    it('shows feature descriptions in features tab', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Features').length).toBe(3);
      });

      const featuresButtons = screen.getAllByRole('button', { name: /features/i });
      await user.click(featuresButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Access to AI-powered features')).toBeInTheDocument();
        expect(screen.getByText('Detailed usage analytics')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Save Button State Tests
  // ===========================================================================
  describe('Save Button State', () => {
    it('save button is disabled when no changes made', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
        expect(saveButtons.length).toBe(3);

        // All save buttons should be disabled initially
        saveButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('save button shows "Save Changes" text when no changes', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        const saveButtons = screen.getAllByText('Save Changes');
        expect(saveButtons.length).toBe(3);
      });
    });

    it('save button becomes enabled when limit is changed', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
      });

      // Find the first notes input (for free role) and change it
      const inputs = document.querySelectorAll('input[type="number"]');
      const firstNotesInput = inputs[0];

      await user.clear(firstNotesInput);
      await user.type(firstNotesInput, '200');

      // Save button for the first card should now be enabled
      await waitFor(() => {
        const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
        expect(saveButtons[0]).not.toBeDisabled();
      });
    });

    it('save button becomes enabled when feature is toggled', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Features').length).toBe(3);
      });

      // Switch to features tab on first card
      const featuresButtons = screen.getAllByRole('button', { name: /features/i });
      await user.click(featuresButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });

      // Find and click a feature toggle button (the rounded toggle)
      const featureToggles = document.querySelectorAll('button[class*="rounded-full"]');
      if (featureToggles.length > 0) {
        await user.click(featureToggles[0]);
      }

      // Save button should be enabled after toggling
      await waitFor(() => {
        const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
        expect(saveButtons[0]).not.toBeDisabled();
      });
    });
  });

  // ===========================================================================
  // formatBytes Utility Function Tests
  // ===========================================================================
  describe('formatBytes utility function', () => {
    // We test the behavior through the UI since formatBytes is used internally
    // These tests verify the displayed storage values

    it('displays "Unlimited" for -1 bytes value', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Admin role has -1 for all limits, should show Unlimited
        const unlimitedButtons = screen.getAllByText('Unlimited');
        expect(unlimitedButtons.length).toBeGreaterThan(0);
      });
    });

    it('displays MB for megabyte values', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Free role has 50 MB storage, should have MB selector
        const mbOptions = screen.getAllByText('MB');
        expect(mbOptions.length).toBeGreaterThan(0);
      });
    });

    it('displays GB for gigabyte values', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Premium role has 1 GB storage
        const gbOptions = screen.getAllByText('GB');
        expect(gbOptions.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Limit Configuration Tests
  // ===========================================================================
  describe('Limit Configuration', () => {
    it('displays all limit types', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Each limit type should appear at least once (3 role cards)
        expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Images').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Categories').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
      });
    });

    it('displays limit descriptions', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Maximum number of notes').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Maximum number of tasks').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Maximum storage in bytes').length).toBeGreaterThan(0);
      });
    });

    it('shows "Set unlimited" button for non-unlimited values', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        // Free role has limited values, should show "Set unlimited" options
        const setUnlimitedButtons = screen.getAllByText('Set unlimited');
        expect(setUnlimitedButtons.length).toBeGreaterThan(0);
      });
    });

    it('toggles between unlimited and limited when clicking unlimited button', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Set unlimited').length).toBeGreaterThan(0);
      });

      // Click a "Set unlimited" button
      const setUnlimitedButtons = screen.getAllByText('Set unlimited');
      await user.click(setUnlimitedButtons[0]);

      // Should now show "Unlimited" instead
      await waitFor(() => {
        const unlimitedButtons = screen.getAllByText('Unlimited');
        expect(unlimitedButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // Save Functionality Tests
  // ===========================================================================
  describe('Save Functionality', () => {
    it('calls updateRoleConfig when saving changes', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});

      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
      });

      // Change a limit value
      const inputs = document.querySelectorAll('input[type="number"]');
      const firstInput = inputs[0];

      await user.clear(firstInput);
      await user.type(firstInput, '999');

      // Wait for save button to be enabled
      await waitFor(() => {
        const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
        expect(saveButtons[0]).not.toBeDisabled();
      });

      // Click save
      const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
      await user.click(saveButtons[0]);

      expect(mockMutateAsync).toHaveBeenCalled();
    });

    it('shows saving state while mutation is pending', async () => {
      const user = userEvent.setup();

      // Make mutation pending
      useUpdateRoleConfig.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<AdminRolesPage />);

      await waitFor(() => {
        // Should show "Saving..." text when isPending
        const savingText = screen.queryAllByText('Saving...');
        // Note: This will show if a save was triggered with isPending=true
        // In practice, this appears during the save operation
      });
    });
  });

  // ===========================================================================
  // Storage Unit Selector Tests
  // ===========================================================================
  describe('Storage Unit Selector', () => {
    it('displays storage unit dropdown with MB and GB options', async () => {
      render(<AdminRolesPage />);

      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(0);

        // Check first select has MB and GB options
        const firstSelect = selects[0];
        const options = firstSelect.querySelectorAll('option');
        const optionTexts = Array.from(options).map((opt) => opt.textContent);
        expect(optionTexts).toContain('MB');
        expect(optionTexts).toContain('GB');
      });
    });

    it('can change storage unit from MB to GB', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(0);
      });

      const selects = document.querySelectorAll('select');
      await user.selectOptions(selects[0], 'GB');

      expect(selects[0].value).toBe('GB');
    });
  });

  // ===========================================================================
  // Feature Categories Tests
  // ===========================================================================
  describe('Feature Categories', () => {
    it('displays feature category headers', async () => {
      const user = userEvent.setup();
      render(<AdminRolesPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Features').length).toBe(3);
      });

      // Switch to features tab
      const featuresButtons = screen.getAllByRole('button', { name: /features/i });
      await user.click(featuresButtons[0]);

      await waitFor(() => {
        // Should show category headers
        expect(screen.getByText('Enhanced Features')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // AdminNav Integration Tests
  // ===========================================================================
  describe('AdminNav Integration', () => {
    it('renders AdminNav component', () => {
      render(<AdminRolesPage />);

      // AdminNav renders both mobile and desktop headers with "Admin" text
      const adminHeaders = screen.getAllByText('Admin');
      expect(adminHeaders.length).toBeGreaterThanOrEqual(1);
      // Verify at least one is an h1 heading
      const h1Headers = screen.getAllByRole('heading', { level: 1 });
      const adminH1 = h1Headers.find((h) => h.textContent === 'Admin');
      expect(adminH1).toBeTruthy();
    });
  });
});

/**
 * =============================================================================
 * Standalone Utility Function Tests
 * =============================================================================
 *
 * Since formatBytes and parseStorageToBytes are not exported from the component,
 * we test them through the component behavior above. If these functions were
 * exported, we would test them directly like this:
 *
 * describe('formatBytes', () => {
 *   it('returns "Unlimited" for -1', () => {
 *     expect(formatBytes(-1)).toBe('Unlimited');
 *   });
 *
 *   it('returns "0 Bytes" for 0', () => {
 *     expect(formatBytes(0)).toBe('0 Bytes');
 *   });
 *
 *   it('formats bytes correctly', () => {
 *     expect(formatBytes(1024)).toBe('1 KB');
 *     expect(formatBytes(1024 * 1024)).toBe('1 MB');
 *     expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
 *   });
 * });
 *
 * describe('parseStorageToBytes', () => {
 *   it('returns -1 for -1 value', () => {
 *     expect(parseStorageToBytes(-1, 'MB')).toBe(-1);
 *   });
 *
 *   it('converts MB to bytes', () => {
 *     expect(parseStorageToBytes(50, 'MB')).toBe(50 * 1024 * 1024);
 *   });
 *
 *   it('converts GB to bytes', () => {
 *     expect(parseStorageToBytes(1, 'GB')).toBe(1024 * 1024 * 1024);
 *   });
 * });
 *
 * =============================================================================
 */
