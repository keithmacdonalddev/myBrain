/**
 * =============================================================================
 * ADMINSYSTEMPAGE.TEST.JSX - Unit Tests for AdminSystemPage
 * =============================================================================
 *
 * Tests the AdminSystemPage component which manages feature kill switches.
 * Covers:
 * - Loading states
 * - Error states
 * - Feature cards grouped by category (Core Features, Beta Features)
 * - KillSwitchCard enabled/disabled states
 * - Toggle enable (immediate)
 * - Toggle disable (requires confirmation and reason)
 * - Success message after toggle
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminSystemPage from './AdminSystemPage';

// Mock the hooks module
vi.mock('./hooks/useAdminUsers', () => ({
  useKillSwitches: vi.fn(),
  useToggleKillSwitch: vi.fn(),
}));

// Mock AdminNav component to simplify tests
vi.mock('./components/AdminNav', () => ({
  default: () => <nav data-testid="admin-nav">Admin Navigation</nav>,
}));

import { useKillSwitches, useToggleKillSwitch } from './hooks/useAdminUsers';

describe('AdminSystemPage', () => {
  // Mock data for successful state
  const mockKillSwitchesData = {
    killSwitches: {
      calendarEnabled: { enabled: true },
      projectsEnabled: { enabled: true },
      imagesEnabled: { enabled: true },
      weatherEnabled: { enabled: true },
      lifeAreasEnabled: { enabled: true },
      analyticsEnabled: { enabled: true },
      fitnessEnabled: {
        enabled: false,
        reason: 'Under maintenance',
        disabledAt: '2026-01-20T10:00:00Z',
      },
      kbEnabled: { enabled: true },
      messagesEnabled: { enabled: true },
    },
    updatedAt: '2026-01-25T12:00:00Z',
  };

  const mockToggleMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mock implementations
    useKillSwitches.mockReturnValue({
      data: mockKillSwitchesData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    useToggleKillSwitch.mockReturnValue(mockToggleMutation);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('Loading State', () => {
    it('shows loading spinner while fetching data', () => {
      useKillSwitches.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminSystemPage />);

      // Should show loading spinner (Loader2 component with animate-spin)
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('does not show feature cards while loading', () => {
      useKillSwitches.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminSystemPage />);

      // Feature cards should not be visible
      expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
      expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // ERROR STATE TESTS
  // ============================================================================

  describe('Error State', () => {
    it('displays error message when API fails', () => {
      useKillSwitches.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
      });

      render(<AdminSystemPage />);

      expect(screen.getByText('Failed to load system settings')).toBeInTheDocument();
    });

    it('shows error icon with error message', () => {
      useKillSwitches.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed'),
        refetch: vi.fn(),
      });

      render(<AdminSystemPage />);

      // Error message container should have red styling
      const errorContainer = screen.getByText('Failed to load system settings').closest('div');
      expect(errorContainer).toHaveClass('text-red-500');
    });
  });

  // ============================================================================
  // CATEGORY GROUPING TESTS
  // ============================================================================

  describe('Feature Cards by Category', () => {
    it('renders Core Features category heading', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Core Features')).toBeInTheDocument();
      });
    });

    it('renders Beta Features category heading', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Beta Features')).toBeInTheDocument();
      });
    });

    it('renders core feature cards (Calendar, Projects, Images, Weather, Categories, Analytics)', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Images')).toBeInTheDocument();
        expect(screen.getByText('Weather')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    it('renders beta feature cards (Fitness, Knowledge Base, Messages)', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
        expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
      });
    });

    it('displays feature descriptions', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Event scheduling and calendar views')).toBeInTheDocument();
        expect(screen.getByText('Project management with linked items')).toBeInTheDocument();
      });
    });

    it('shows the info card about kill switches', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('About Kill Switches')).toBeInTheDocument();
        expect(screen.getByText(/Kill switches allow you to globally disable features/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // KILLSWITCHCARD - ENABLED STATE TESTS
  // ============================================================================

  describe('KillSwitchCard - Enabled State', () => {
    it('shows enabled feature with green power button', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        const calendarCard = screen.getByText('Calendar').closest('.p-4');
        // Enabled cards have green styling on button
        const button = calendarCard.querySelector('button');
        expect(button).toHaveClass('bg-green-500/10');
      });
    });

    it('does not show DISABLED badge for enabled features', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        // Calendar is enabled, should not have DISABLED badge
        const calendarCard = screen.getByText('Calendar').closest('.p-4');
        expect(within(calendarCard).queryByText('DISABLED')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // KILLSWITCHCARD - DISABLED STATE TESTS
  // ============================================================================

  describe('KillSwitchCard - Disabled State with Reason', () => {
    it('shows DISABLED badge for disabled features', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        const fitnessCard = screen.getByText('Fitness').closest('.p-4');
        expect(within(fitnessCard).getByText('DISABLED')).toBeInTheDocument();
      });
    });

    it('shows reason for disabled feature', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Under maintenance')).toBeInTheDocument();
      });
    });

    it('shows red power off button for disabled features', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        const fitnessCard = screen.getByText('Fitness').closest('.p-4');
        const button = fitnessCard.querySelector('button');
        expect(button).toHaveClass('bg-red-500/10');
      });
    });

    it('shows disabled timestamp', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        // The date should be formatted and displayed
        // Jan 20, 2026 in the component's locale format
        expect(screen.getByText(/Jan/)).toBeInTheDocument();
      });
    });

    it('displays disabled count warning banner when features are disabled', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 feature is currently disabled/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // ENABLE TOGGLE TESTS
  // ============================================================================

  describe('Click Enable - Toggles Immediately', () => {
    it('calls toggle mutation immediately when enabling a disabled feature', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      // Find the Fitness card and click its toggle button (it's disabled, so clicking enables)
      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      // Should call mutateAsync with enable = true
      expect(mockMutateAsync).toHaveBeenCalledWith({
        feature: 'fitnessEnabled',
        enabled: true,
        reason: '',
      });
    });

    it('does not show confirmation dialog when enabling', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      // No confirmation dialog should appear
      expect(screen.queryByText(/Disable Fitness/)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // DISABLE TOGGLE TESTS - CONFIRMATION DIALOG
  // ============================================================================

  describe('Click Disable - Shows Confirmation with Reason Input', () => {
    it('shows confirmation dialog when clicking to disable an enabled feature', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Calendar is enabled, clicking should show confirmation
      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      expect(screen.getByText('Disable Calendar?')).toBeInTheDocument();
    });

    it('shows warning message in confirmation dialog', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      expect(
        screen.getByText(/This will prevent all users from accessing this feature/)
      ).toBeInTheDocument();
    });

    it('shows reason textarea in confirmation dialog', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      expect(screen.getByPlaceholderText('Enter reason for disabling...')).toBeInTheDocument();
    });

    it('shows Cancel and Disable buttons in confirmation dialog', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disable/ })).toBeInTheDocument();
    });

    it('closes confirmation dialog when Cancel is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      // Click Cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Disable Calendar?')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // DISABLE REQUIRES REASON TESTS
  // ============================================================================

  describe('Disable Requires Reason to Submit', () => {
    it('Disable button is disabled when reason is empty', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      // The Disable button should be disabled
      const disableButton = screen.getByRole('button', { name: /Disable/ });
      expect(disableButton).toBeDisabled();
    });

    it('Disable button is disabled when reason is only whitespace', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      // Type only whitespace
      const textarea = screen.getByPlaceholderText('Enter reason for disabling...');
      await user.type(textarea, '   ');

      const disableButton = screen.getByRole('button', { name: /Disable/ });
      expect(disableButton).toBeDisabled();
    });

    it('Disable button becomes enabled when reason is provided', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      // Type a reason
      const textarea = screen.getByPlaceholderText('Enter reason for disabling...');
      await user.type(textarea, 'Scheduled maintenance');

      const disableButton = screen.getByRole('button', { name: /Disable/ });
      expect(disableButton).not.toBeDisabled();
    });

    it('calls toggle mutation with reason when Disable is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      // Type a reason
      const textarea = screen.getByPlaceholderText('Enter reason for disabling...');
      await user.type(textarea, 'Scheduled maintenance');

      // Click Disable
      const disableButton = screen.getByRole('button', { name: /Disable/ });
      await user.click(disableButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        feature: 'calendarEnabled',
        enabled: false,
        reason: 'Scheduled maintenance',
      });
    });

    it('closes confirmation dialog after successful disable', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter reason for disabling...');
      await user.type(textarea, 'Scheduled maintenance');

      const disableButton = screen.getByRole('button', { name: /Disable/ });
      await user.click(disableButton);

      await waitFor(() => {
        expect(screen.queryByText('Disable Calendar?')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SUCCESS MESSAGE TESTS
  // ============================================================================

  describe('Success Message After Toggle', () => {
    it('shows success message after enabling a feature', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      // Enable Fitness (which is disabled)
      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('fitnessEnabled has been enabled')).toBeInTheDocument();
      });
    });

    it('shows success message after disabling a feature', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Disable Calendar
      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter reason for disabling...');
      await user.type(textarea, 'Testing');

      const disableButton = screen.getByRole('button', { name: /Disable/ });
      await user.click(disableButton);

      await waitFor(() => {
        expect(screen.getByText('calendarEnabled has been disabled')).toBeInTheDocument();
      });
    });

    it('success message disappears after 3 seconds', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('fitnessEnabled has been enabled')).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('fitnessEnabled has been enabled')).not.toBeInTheDocument();
      });
    });

    it('success message has green styling', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      await waitFor(() => {
        const successMessage = screen.getByText('fitnessEnabled has been enabled').closest('div');
        expect(successMessage).toHaveClass('bg-green-500/10');
        expect(successMessage).toHaveClass('text-green-500');
      });
    });
  });

  // ============================================================================
  // LOADING STATE DURING MUTATION TESTS
  // ============================================================================

  describe('Loading State During Mutation', () => {
    it('shows spinner in toggle button while mutation is pending', async () => {
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // All toggle buttons should show loading state when mutation is pending
      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const spinner = calendarCard.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables toggle button while mutation is pending', async () => {
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const calendarCard = screen.getByText('Calendar').closest('.p-4');
      const toggleButton = calendarCard.querySelector('button');
      expect(toggleButton).toBeDisabled();
    });
  });

  // ============================================================================
  // ADMINNAV TESTS
  // ============================================================================

  describe('AdminNav Integration', () => {
    it('renders AdminNav component', () => {
      render(<AdminSystemPage />);

      expect(screen.getByTestId('admin-nav')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // LAST UPDATED DISPLAY
  // ============================================================================

  describe('Last Updated Display', () => {
    it('shows last updated timestamp when data is available', async () => {
      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // MULTIPLE DISABLED FEATURES
  // ============================================================================

  describe('Multiple Disabled Features', () => {
    it('shows correct plural form when multiple features are disabled', async () => {
      useKillSwitches.mockReturnValue({
        data: {
          killSwitches: {
            calendarEnabled: { enabled: false, reason: 'Test' },
            projectsEnabled: { enabled: false, reason: 'Test' },
            imagesEnabled: { enabled: true },
            weatherEnabled: { enabled: true },
            lifeAreasEnabled: { enabled: true },
            analyticsEnabled: { enabled: true },
            fitnessEnabled: { enabled: true },
            kbEnabled: { enabled: true },
            messagesEnabled: { enabled: true },
          },
          updatedAt: '2026-01-25T12:00:00Z',
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText(/2 features are currently disabled/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING DURING MUTATION
  // ============================================================================

  describe('Error Handling During Mutation', () => {
    it('handles mutation error gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Failed to toggle'));
      useToggleKillSwitch.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<AdminSystemPage />);

      await waitFor(() => {
        expect(screen.getByText('Fitness')).toBeInTheDocument();
      });

      const fitnessCard = screen.getByText('Fitness').closest('.p-4');
      const toggleButton = fitnessCard.querySelector('button');
      await user.click(toggleButton);

      // Should not show success message on error
      expect(screen.queryByText(/has been enabled/)).not.toBeInTheDocument();
    });
  });
});
