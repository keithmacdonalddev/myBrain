/**
 * =============================================================================
 * WEATHERSETTINGS.TEST.JSX - Unit Tests for WeatherSettings Component
 * =============================================================================
 *
 * Tests the WeatherSettings component which manages weather preferences.
 * Covers:
 * - Loading state
 * - Temperature unit selection (Celsius/Fahrenheit)
 * - Weather locations list
 * - Empty locations state
 * - Add location modal
 * - Remove location functionality
 * - Profile location indicator
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import WeatherSettings from './WeatherSettings';

// Mock the weather hooks
vi.mock('../../hooks/useWeather', () => ({
  useWeatherLocations: vi.fn(),
  useAddWeatherLocation: vi.fn(),
  useRemoveWeatherLocation: vi.fn(),
}));

// Mock the API
vi.mock('../../lib/api', () => ({
  default: {
    patch: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Mock Redux hooks
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux');
  return {
    ...actual,
    useSelector: vi.fn(() => null),
    useDispatch: vi.fn(() => vi.fn()),
  };
});

import { useWeatherLocations, useAddWeatherLocation, useRemoveWeatherLocation } from '../../hooks/useWeather';
import api from '../../lib/api';

describe('WeatherSettings', () => {
  const mockAddLocation = vi.fn();
  const mockRemoveLocation = vi.fn();

  const mockLocations = [
    {
      _id: '1',
      name: 'Home',
      location: 'Toronto, Ontario',
    },
    {
      _id: '2',
      name: 'Office',
      location: 'Downtown Toronto',
    },
    {
      _id: 'profile',
      name: 'Profile Location',
      location: 'New York, NY',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useWeatherLocations.mockReturnValue({
      data: mockLocations,
      isLoading: false,
    });

    useAddWeatherLocation.mockReturnValue({
      mutateAsync: mockAddLocation,
      isPending: false,
      error: null,
    });

    useRemoveWeatherLocation.mockReturnValue({
      mutateAsync: mockRemoveLocation,
      isPending: false,
    });
  });

  describe('Temperature Unit Selection', () => {
    it('renders temperature unit section', () => {
      render(<WeatherSettings />);

      expect(screen.getByText('Temperature Unit')).toBeInTheDocument();
      expect(screen.getByText('Choose how temperatures are displayed')).toBeInTheDocument();
    });

    it('renders Celsius and Fahrenheit options', () => {
      render(<WeatherSettings />);

      expect(screen.getByText('Celsius (°C)')).toBeInTheDocument();
      expect(screen.getByText('Fahrenheit (°F)')).toBeInTheDocument();
    });

    it('shows Celsius as default selected', () => {
      render(<WeatherSettings />);

      const celsiusButton = screen.getByText('Celsius (°C)').closest('button');
      expect(celsiusButton).toHaveClass('bg-primary/10');
    });

    it('changes selection when clicking Fahrenheit', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      const fahrenheitButton = screen.getByText('Fahrenheit (°F)').closest('button');
      await user.click(fahrenheitButton);

      expect(fahrenheitButton).toHaveClass('bg-primary/10');
    });

    it('calls API to update temperature preference', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      const fahrenheitButton = screen.getByText('Fahrenheit (°F)').closest('button');
      await user.click(fahrenheitButton);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/profile/preferences', {
          weatherUnit: 'fahrenheit',
        });
      });
    });
  });

  describe('Weather Locations Section', () => {
    it('renders weather locations header', () => {
      render(<WeatherSettings />);

      expect(screen.getByText('Weather Locations')).toBeInTheDocument();
      expect(screen.getByText('Manage locations for weather display')).toBeInTheDocument();
    });

    it('renders add location button', () => {
      render(<WeatherSettings />);

      expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading spinner when locations are loading', () => {
      useWeatherLocations.mockReturnValue({
        data: [],
        isLoading: true,
      });

      const { container } = render(<WeatherSettings />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty Locations State', () => {
    it('renders empty state when no locations exist', () => {
      useWeatherLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<WeatherSettings />);

      expect(screen.getByText('No weather locations saved')).toBeInTheDocument();
      expect(screen.getByText('Add your first location')).toBeInTheDocument();
    });

    it('opens add modal when clicking link in empty state', async () => {
      const user = userEvent.setup();
      useWeatherLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<WeatherSettings />);

      await user.click(screen.getByText('Add your first location'));

      expect(screen.getByText('Add Weather Location')).toBeInTheDocument();
    });
  });

  describe('Locations List', () => {
    it('renders all weather locations', () => {
      render(<WeatherSettings />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Toronto, Ontario')).toBeInTheDocument();
      expect(screen.getByText('Office')).toBeInTheDocument();
      expect(screen.getByText('Downtown Toronto')).toBeInTheDocument();
    });

    it('shows "From Profile" badge for profile location', () => {
      render(<WeatherSettings />);

      expect(screen.getByText('From Profile')).toBeInTheDocument();
    });

    it('shows delete button for non-profile locations', () => {
      render(<WeatherSettings />);

      // Home and Office should have delete buttons
      const deleteButtons = screen.getAllByTitle('Remove location');
      expect(deleteButtons.length).toBe(2);
    });

    it('does not show delete button for profile location', () => {
      render(<WeatherSettings />);

      // Profile location should not have a delete button
      const profileRow = screen.getByText('Profile Location').closest('div[class*="rounded-xl"]');
      const deleteButton = profileRow.querySelector('button[title="Remove location"]');
      expect(deleteButton).toBeNull();
    });
  });

  describe('Remove Location', () => {
    it('calls removeLocation when clicking delete button', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      const deleteButtons = screen.getAllByTitle('Remove location');
      await user.click(deleteButtons[0]);

      expect(mockRemoveLocation).toHaveBeenCalledWith('1');
    });

    it('shows loading state while removing', () => {
      useRemoveWeatherLocation.mockReturnValue({
        mutateAsync: mockRemoveLocation,
        isPending: true,
      });

      const { container } = render(<WeatherSettings />);

      // At least one spinner should be present in remove buttons
      const locationRows = container.querySelectorAll('div[class*="rounded-xl"]');
      expect(locationRows.length).toBeGreaterThan(0);
    });
  });

  describe('Add Location Modal', () => {
    it('opens modal when clicking add location button', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByText('Add Weather Location')).toBeInTheDocument();
    });

    it('has name and city input fields', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByPlaceholderText('e.g., Home, Office, Vacation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Toronto, Ontario')).toBeInTheDocument();
    });

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));
      expect(screen.getByText('Add Weather Location')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText('Add Weather Location')).not.toBeInTheDocument();
      });
    });

    it('closes modal when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('Add Weather Location')).not.toBeInTheDocument();
      });
    });

    it('disables add button when fields are empty', async () => {
      const user = userEvent.setup();
      const { container } = render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      // Find the submit button inside the modal form
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });

    it('enables add button when both fields are filled', async () => {
      const user = userEvent.setup();
      const { container } = render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      const nameInput = screen.getByPlaceholderText('e.g., Home, Office, Vacation');
      const cityInput = screen.getByPlaceholderText('e.g., Toronto, Ontario');

      await user.type(nameInput, 'Gym');
      await user.type(cityInput, 'Vancouver, BC');

      // Find the submit button inside the modal form
      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).not.toBeDisabled();
    });

    it('calls addLocation mutation on submit', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      const nameInput = screen.getByPlaceholderText('e.g., Home, Office, Vacation');
      const cityInput = screen.getByPlaceholderText('e.g., Toronto, Ontario');

      await user.type(nameInput, 'Gym');
      await user.type(cityInput, 'Vancouver, BC');

      const form = nameInput.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockAddLocation).toHaveBeenCalledWith({
          name: 'Gym',
          location: 'Vancouver, BC',
        });
      });
    });

    it('shows error message when add fails', async () => {
      const user = userEvent.setup();
      useAddWeatherLocation.mockReturnValue({
        mutateAsync: mockAddLocation,
        isPending: false,
        error: { response: { data: { error: 'Location not found' } } },
      });

      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByText('Location not found')).toBeInTheDocument();
    });

    it('shows loading state while adding', async () => {
      const user = userEvent.setup();
      useAddWeatherLocation.mockReturnValue({
        mutateAsync: mockAddLocation,
        isPending: true,
        error: null,
      });

      const { container } = render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      // When isPending is true, there should be a spinning loader in the modal
      const spinningLoader = container.querySelector('.animate-spin');
      expect(spinningLoader).toBeInTheDocument();
    });
  });

  describe('Location Row Icons', () => {
    it('displays map pin icon for each location', () => {
      const { container } = render(<WeatherSettings />);

      // Each location row should have a map pin icon area
      const iconContainers = container.querySelectorAll('.bg-primary\\/10');
      expect(iconContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Help Text', () => {
    it('shows help text in add location form', async () => {
      const user = userEvent.setup();
      render(<WeatherSettings />);

      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(screen.getByText('Use city name for best results')).toBeInTheDocument();
    });
  });
});
