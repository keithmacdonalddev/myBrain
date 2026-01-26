/**
 * =============================================================================
 * SAVEDLOCATIONSMANAGER.TEST.JSX - Unit Tests for SavedLocationsManager
 * =============================================================================
 *
 * Tests the SavedLocationsManager component which manages saved locations.
 * Covers:
 * - Loading state
 * - Empty state
 * - Location list rendering
 * - Create location form
 * - Edit location functionality
 * - Delete location with confirmation
 * - Set default location
 * - Category selection (home/work/other)
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import SavedLocationsManager from './SavedLocationsManager';

// Mock the saved locations hooks
vi.mock('../../hooks/useSavedLocations', () => ({
  useSavedLocations: vi.fn(),
  useCreateSavedLocation: vi.fn(),
  useUpdateSavedLocation: vi.fn(),
  useDeleteSavedLocation: vi.fn(),
  useSetDefaultLocation: vi.fn(),
}));

// Mock the toast hook
vi.mock('../../hooks/useToast', () => ({
  default: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the LocationPicker component
vi.mock('../ui/LocationPicker', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input
      data-testid="location-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

import {
  useSavedLocations,
  useCreateSavedLocation,
  useUpdateSavedLocation,
  useDeleteSavedLocation,
  useSetDefaultLocation,
} from '../../hooks/useSavedLocations';

describe('SavedLocationsManager', () => {
  const mockCreateLocation = vi.fn();
  const mockUpdateLocation = vi.fn();
  const mockDeleteLocation = vi.fn();
  const mockSetDefaultLocation = vi.fn();

  const mockLocations = [
    {
      _id: '1',
      name: 'Home',
      address: '123 Main St, Toronto, ON',
      category: 'home',
      isDefault: true,
    },
    {
      _id: '2',
      name: 'Office',
      address: '456 Business Ave, Toronto, ON',
      category: 'work',
      isDefault: false,
    },
    {
      _id: '3',
      name: 'Gym',
      address: '789 Fitness Rd, Toronto, ON',
      category: 'other',
      isDefault: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useSavedLocations.mockReturnValue({
      data: mockLocations,
      isLoading: false,
    });

    useCreateSavedLocation.mockReturnValue({
      mutateAsync: mockCreateLocation,
      isPending: false,
    });

    useUpdateSavedLocation.mockReturnValue({
      mutateAsync: mockUpdateLocation,
      isPending: false,
    });

    useDeleteSavedLocation.mockReturnValue({
      mutateAsync: mockDeleteLocation,
      isPending: false,
    });

    useSetDefaultLocation.mockReturnValue({
      mutateAsync: mockSetDefaultLocation,
      isPending: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders the component with header', () => {
      render(<SavedLocationsManager />);

      expect(screen.getByText('Saved Locations')).toBeInTheDocument();
      expect(screen.getByText('Save frequently used addresses for quick access')).toBeInTheDocument();
    });

    it('renders add location button', () => {
      render(<SavedLocationsManager />);

      expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading spinner when data is loading', () => {
      useSavedLocations.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(<SavedLocationsManager />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no locations exist', () => {
      useSavedLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<SavedLocationsManager />);

      expect(screen.getByText('No saved locations yet')).toBeInTheDocument();
      expect(screen.getByText(/Add your home, work, or other frequently used addresses/)).toBeInTheDocument();
    });

    it('shows add location link in empty state', () => {
      useSavedLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<SavedLocationsManager />);

      expect(screen.getByText('Add your first location')).toBeInTheDocument();
    });

    it('opens create form when clicking link in empty state', async () => {
      const user = userEvent.setup();
      useSavedLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<SavedLocationsManager />);

      await user.click(screen.getByText('Add your first location'));

      expect(screen.getByText('Add New Location')).toBeInTheDocument();
    });
  });

  describe('Locations List', () => {
    it('renders all saved locations', () => {
      render(<SavedLocationsManager />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, Toronto, ON')).toBeInTheDocument();
      expect(screen.getByText('Office')).toBeInTheDocument();
      expect(screen.getByText('456 Business Ave, Toronto, ON')).toBeInTheDocument();
      expect(screen.getByText('Gym')).toBeInTheDocument();
    });

    it('shows default badge for default location', () => {
      render(<SavedLocationsManager />);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('shows category-specific icons', () => {
      const { container } = render(<SavedLocationsManager />);

      // Check for colored icon containers based on category
      expect(container.querySelector('.bg-blue-500\\/10')).toBeInTheDocument(); // home
      expect(container.querySelector('.bg-amber-500\\/10')).toBeInTheDocument(); // work
    });
  });

  describe('Create Location Form', () => {
    it('opens create form when clicking add button', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByText('Add New Location')).toBeInTheDocument();
    });

    it('has name and address input fields', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByPlaceholderText('e.g., Home, Office, Gym')).toBeInTheDocument();
      expect(screen.getByTestId('location-picker')).toBeInTheDocument();
    });

    it('has category selection buttons', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      // Look for category buttons within the form
      const homeButtons = screen.getAllByRole('button', { name: /home/i });
      const workButtons = screen.getAllByRole('button', { name: /work/i });
      const otherButtons = screen.getAllByRole('button', { name: /other/i });

      expect(homeButtons.length).toBeGreaterThan(0);
      expect(workButtons.length).toBeGreaterThan(0);
      expect(otherButtons.length).toBeGreaterThan(0);
    });

    it('closes form when clicking cancel', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));
      expect(screen.getByText('Add New Location')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText('Add New Location')).not.toBeInTheDocument();
      });
    });

    it('disables save button when fields are empty', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      const saveButton = screen.getByRole('button', { name: /save location/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when fields are filled', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      const nameInput = screen.getByPlaceholderText('e.g., Home, Office, Gym');
      const addressInput = screen.getByTestId('location-picker');

      await user.type(nameInput, 'New Place');
      await user.type(addressInput, '999 New St');

      const saveButton = screen.getByRole('button', { name: /save location/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('calls createLocation on form submit', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      const nameInput = screen.getByPlaceholderText('e.g., Home, Office, Gym');
      const addressInput = screen.getByTestId('location-picker');

      await user.type(nameInput, 'New Place');
      await user.type(addressInput, '999 New St');

      const form = nameInput.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockCreateLocation).toHaveBeenCalledWith({
          name: 'New Place',
          address: '999 New St',
          category: 'other', // default category
        });
      });
    });

    it('shows loading state while creating', async () => {
      const user = userEvent.setup();
      useCreateSavedLocation.mockReturnValue({
        mutateAsync: mockCreateLocation,
        isPending: true,
      });

      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Edit Location', () => {
    it('shows edit button on location row hover', () => {
      render(<SavedLocationsManager />);

      // Edit button should exist (visible on hover via CSS)
      const editButtons = screen.getAllByTitle('Edit');
      expect(editButtons.length).toBe(3);
    });

    it('enters edit mode when clicking edit button', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      // Should show edit form with current values
      expect(screen.getByDisplayValue('Home')).toBeInTheDocument();
    });

    it('shows save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('cancels edit and restores original values', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      // Change the name
      const nameInput = screen.getByDisplayValue('Home');
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      // Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should show original name
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('calls updateLocation on save', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const editButtons = screen.getAllByTitle('Edit');
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Home');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Home');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateLocation).toHaveBeenCalledWith({
          id: '1',
          data: expect.objectContaining({
            name: 'Updated Home',
          }),
        });
      });
    });
  });

  describe('Delete Location', () => {
    it('shows delete button on location row', () => {
      render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      expect(deleteButtons.length).toBe(3);
    });

    it('opens confirmation modal when clicking delete', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete Location?')).toBeInTheDocument();
      expect(screen.getByText('This cannot be undone')).toBeInTheDocument();
    });

    it('closes confirmation modal when clicking cancel', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText('Delete Location?')).not.toBeInTheDocument();
      });
    });

    it('calls deleteLocation when confirming delete', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      // Find the confirm button in the modal - it has bg-danger class and text "Delete"
      const confirmButton = screen.getAllByRole('button').find(btn =>
        btn.textContent === 'Delete' && btn.className.includes('bg-danger')
      );
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteLocation).toHaveBeenCalledWith('1');
      });
    });

    it('closes confirmation on backdrop click', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('Delete Location?')).not.toBeInTheDocument();
      });
    });

    it('shows loading state while deleting', async () => {
      const user = userEvent.setup();
      useDeleteSavedLocation.mockReturnValue({
        mutateAsync: mockDeleteLocation,
        isPending: true,
      });

      const { container } = render(<SavedLocationsManager />);

      const deleteButtons = screen.getAllByTitle('Delete');
      await user.click(deleteButtons[0]);

      // When isPending is true, the delete confirm button shows a spinner instead of text
      const spinningLoader = container.querySelector('.animate-spin');
      expect(spinningLoader).toBeInTheDocument();
    });
  });

  describe('Set Default Location', () => {
    it('shows set default button for non-default locations', () => {
      render(<SavedLocationsManager />);

      // Home is default, so only Office and Gym should have set default buttons
      const setDefaultButtons = screen.getAllByTitle('Set as default');
      expect(setDefaultButtons.length).toBe(2);
    });

    it('does not show set default button for current default location', () => {
      render(<SavedLocationsManager />);

      // Find the Home row and check it doesn't have a set default button
      const homeRow = screen.getByText('Home').closest('div[class*="rounded-xl"]');
      const setDefaultButton = homeRow.querySelector('button[title="Set as default"]');
      expect(setDefaultButton).toBeNull();
    });

    it('calls setDefaultLocation when clicking set default button', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      const setDefaultButtons = screen.getAllByTitle('Set as default');
      await user.click(setDefaultButtons[0]);

      expect(mockSetDefaultLocation).toHaveBeenCalledWith('2'); // Office ID
    });
  });

  describe('Category Selection', () => {
    it('changes category when clicking category buttons in create form', async () => {
      const user = userEvent.setup();
      render(<SavedLocationsManager />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      // Other is default, click Home
      const categoryButtons = screen.getAllByRole('button');
      const homeButton = categoryButtons.find(btn =>
        btn.textContent === 'Home' && btn.type === 'button'
      );

      if (homeButton) {
        await user.click(homeButton);

        // Fill in required fields and submit
        const nameInput = screen.getByPlaceholderText('e.g., Home, Office, Gym');
        const addressInput = screen.getByTestId('location-picker');

        await user.type(nameInput, 'My Home');
        await user.type(addressInput, '123 Home St');

        const form = nameInput.closest('form');
        fireEvent.submit(form);

        await waitFor(() => {
          expect(mockCreateLocation).toHaveBeenCalledWith(
            expect.objectContaining({
              category: 'home',
            })
          );
        });
      }
    });
  });

  describe('Drag Handle', () => {
    it('shows drag handle on location rows', () => {
      const { container } = render(<SavedLocationsManager />);

      // GripVertical icon is rendered, look for its container
      const dragHandles = container.querySelectorAll('.cursor-grab');
      expect(dragHandles.length).toBe(3);
    });
  });
});
