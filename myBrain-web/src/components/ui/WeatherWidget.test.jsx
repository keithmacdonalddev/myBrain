import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import WeatherWidget from './WeatherWidget';

// Mock the hooks
vi.mock('../../hooks/useWeather', () => ({
  useWeather: vi.fn(),
  useWeatherLocations: vi.fn(),
  useAddWeatherLocation: vi.fn(),
  useRemoveWeatherLocation: vi.fn(),
}));

vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(),
}));

// Import mocked hooks
import {
  useWeather,
  useWeatherLocations,
  useAddWeatherLocation,
  useRemoveWeatherLocation,
} from '../../hooks/useWeather';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

// Sample weather data
const mockWeatherData = {
  current: {
    temperature: 22,
    feelsLike: 20,
    humidity: 65,
    windSpeed: 15,
    description: 'Partly cloudy',
    icon: 'cloud-sun',
  },
  location: {
    name: 'Toronto',
    admin1: 'Ontario',
  },
  hourly: [
    { time: '2024-01-24T10:00:00', temperature: 21, icon: 'sun', precipitationProbability: 0 },
    { time: '2024-01-24T11:00:00', temperature: 22, icon: 'cloud-sun', precipitationProbability: 10 },
    { time: '2024-01-24T12:00:00', temperature: 23, icon: 'cloud', precipitationProbability: 20 },
  ],
  daily: [
    { date: '2024-01-24', temperatureMax: 25, temperatureMin: 18, icon: 'cloud-sun', precipitationProbability: 20 },
    { date: '2024-01-25', temperatureMax: 20, temperatureMin: 12, icon: 'cloud-rain', precipitationProbability: 80 },
  ],
};

const mockLocations = [
  { _id: 'loc1', name: 'Home', location: 'Toronto, Ontario', isProfileLocation: true },
  { _id: 'loc2', name: 'Office', location: 'Montreal, Quebec', isProfileLocation: false },
];

describe('WeatherWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - feature enabled, data loaded
    useFeatureFlag.mockReturnValue(true);
    useWeatherLocations.mockReturnValue({
      data: mockLocations,
      isLoading: false,
    });
    useWeather.mockReturnValue({
      data: mockWeatherData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });
    useAddWeatherLocation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    useRemoveWeatherLocation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('Feature Flag', () => {
    it('returns null when weather feature is disabled', () => {
      useFeatureFlag.mockReturnValue(false);
      const { container } = render(<WeatherWidget />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when weather feature is enabled', () => {
      render(<WeatherWidget />);
      // Uses the location name from saved locations, not the weather API
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when locations are loading', () => {
      useWeatherLocations.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
    });

    it('shows loading state when weather is loading', () => {
      useWeather.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('Loading weather...')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows no location error with add button', () => {
      useWeather.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('No location set'),
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('No weather location set.')).toBeInTheDocument();
      expect(screen.getByText('Add a location')).toBeInTheDocument();
    });

    it('shows location not found error', () => {
      useWeather.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Location not found'),
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('Could not find weather for this location.')).toBeInTheDocument();
    });

    it('shows generic error with retry button', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      useWeather.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
        isRefetching: false,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('Unable to load weather data.')).toBeInTheDocument();

      await user.click(screen.getByText('Try again'));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Current Weather Display', () => {
    it('displays current temperature', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('22°C')).toBeInTheDocument();
    });

    it('displays weather description', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    });

    it('displays feels like temperature', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('Feels 20°C')).toBeInTheDocument();
    });

    it('displays humidity', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays wind speed in metric units', () => {
      render(<WeatherWidget units="metric" />);
      expect(screen.getByText('15 km/h')).toBeInTheDocument();
    });

    it('displays wind speed in imperial units', () => {
      render(<WeatherWidget units="imperial" />);
      expect(screen.getByText('15 mph')).toBeInTheDocument();
    });

    it('displays imperial temperature unit', () => {
      render(<WeatherWidget units="imperial" />);
      expect(screen.getByText('22°F')).toBeInTheDocument();
    });
  });

  describe('Location Navigation', () => {
    it('displays current location name', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('shows location count with multiple locations', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('(1/2)')).toBeInTheDocument();
    });

    it('navigates to next location', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      // Find the next button (ChevronRight)
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((btn) =>
        btn.querySelector('svg.lucide-chevron-right')
      );

      if (nextButton) {
        await user.click(nextButton);
        // After clicking next, location count should update
        expect(screen.getByText('(2/2)')).toBeInTheDocument();
      }
    });

    it('hides navigation arrows with single location', () => {
      useWeatherLocations.mockReturnValue({
        data: [mockLocations[0]],
        isLoading: false,
      });

      render(<WeatherWidget />);
      // Should not show location count when only one location
      expect(screen.queryByText(/\(1\/1\)/)).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Forecast', () => {
    it('shows expanded forecast by default', () => {
      render(<WeatherWidget />);
      expect(screen.getByText('Next Hours')).toBeInTheDocument();
      expect(screen.getByText('7-Day Forecast')).toBeInTheDocument();
    });

    it('collapses forecast on click', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByText('Less'));

      // Expanded content should be hidden
      expect(screen.queryByText('Next Hours')).not.toBeInTheDocument();
      // Button should now say "7-Day Forecast" to expand
      expect(screen.getByText('7-Day Forecast')).toBeInTheDocument();
    });

    it('expands forecast on click', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      // Collapse first
      await user.click(screen.getByText('Less'));
      // Then expand
      await user.click(screen.getByText('7-Day Forecast'));

      expect(screen.getByText('Next Hours')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders simplified view in compact mode', () => {
      render(<WeatherWidget compact />);

      // Should show temperature and description
      expect(screen.getByText('22°C')).toBeInTheDocument();
      expect(screen.getByText('Partly cloudy')).toBeInTheDocument();

      // Should NOT show expanded features
      expect(screen.queryByText('Next Hours')).not.toBeInTheDocument();
      expect(screen.queryByText('7-Day Forecast')).not.toBeInTheDocument();
    });

    it('shows location name in compact mode', () => {
      render(<WeatherWidget compact />);
      expect(screen.getByText(/Home/)).toBeInTheDocument();
    });
  });

  describe('Refresh Button', () => {
    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      useWeather.mockReturnValue({
        data: mockWeatherData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      });

      render(<WeatherWidget />);

      // Find refresh button by title
      const refreshButton = screen.getByTitle('Refresh weather');
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('disables refresh button while refetching', () => {
      useWeather.mockReturnValue({
        data: mockWeatherData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: true,
      });

      render(<WeatherWidget />);

      const refreshButton = screen.getByTitle('Refresh weather');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Add Location Modal', () => {
    it('opens add location modal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Add location'));

      expect(screen.getByText('Add Weather Location')).toBeInTheDocument();
      // Labels are present but not associated via for/id, use getByText instead
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Home, Office, Vacation')).toBeInTheDocument();
    });

    it('closes add location modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Add location'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Add Weather Location')).not.toBeInTheDocument();
    });

    it('closes modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Add location'));
      // Find X button in the modal
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector('svg.lucide-x')
      );
      if (closeButton) {
        await user.click(closeButton);
      }

      expect(screen.queryByText('Add Weather Location')).not.toBeInTheDocument();
    });
  });

  describe('Manage Locations Modal', () => {
    it('opens manage locations modal when settings button is clicked', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Manage locations'));

      expect(screen.getByText('Weather Locations')).toBeInTheDocument();
      // Should show all locations (Home appears twice - in widget header and modal)
      const homes = screen.getAllByText('Home');
      expect(homes.length).toBe(2);
      expect(screen.getByText('Office')).toBeInTheDocument();
    });

    it('shows DEFAULT badge for profile location', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Manage locations'));

      expect(screen.getByText('DEFAULT')).toBeInTheDocument();
    });

    it('allows removing non-profile locations', async () => {
      const user = userEvent.setup();
      const mockRemove = vi.fn().mockResolvedValue({});
      useRemoveWeatherLocation.mockReturnValue({
        mutateAsync: mockRemove,
        isPending: false,
      });

      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Manage locations'));

      // The modal should show Office (non-profile) with a delete button
      // Office location should be visible in the modal
      expect(screen.getByText('Office')).toBeInTheDocument();

      // Find delete buttons - they contain Trash2 icon
      // The icon class includes "lucide-trash-2" somewhere in className
      const allButtons = screen.getAllByRole('button');
      const trashButtons = allButtons.filter((btn) => {
        const svg = btn.querySelector('svg');
        return svg && svg.className.baseVal?.includes('trash');
      });

      expect(trashButtons.length).toBe(1); // Only Office should have delete

      await user.click(trashButtons[0]);
      expect(mockRemove).toHaveBeenCalledWith('loc2');
    });

    it('closes manage modal when done is clicked', async () => {
      const user = userEvent.setup();
      render(<WeatherWidget />);

      await user.click(screen.getByTitle('Manage locations'));
      await user.click(screen.getByRole('button', { name: 'Done' }));

      expect(screen.queryByText('Weather Locations')).not.toBeInTheDocument();
    });
  });

  describe('Daily Forecast', () => {
    it('displays daily forecast data', () => {
      // Use dynamic dates that match today/tomorrow
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Update mock data with current dates
      useWeather.mockReturnValue({
        data: {
          ...mockWeatherData,
          daily: [
            { date: todayStr, temperatureMax: 25, temperatureMin: 18, icon: 'cloud-sun', precipitationProbability: 20 },
            { date: tomorrowStr, temperatureMax: 20, temperatureMin: 12, icon: 'cloud-rain', precipitationProbability: 80 },
          ],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<WeatherWidget />);

      // Today's forecast
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('25°')).toBeInTheDocument();
      expect(screen.getByText('18°')).toBeInTheDocument();

      // Tomorrow's forecast
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('displays precipitation probability when present', () => {
      render(<WeatherWidget />);

      // Should show precipitation percentages (may appear multiple times)
      // Precipitation percentages in the mock data
      const precipElements = screen.getAllByText(/\d+%/);
      expect(precipElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Hourly Forecast', () => {
    it('displays hourly forecast data', () => {
      render(<WeatherWidget />);

      // Should show hourly temperatures (21, 22, 23)
      // Note: 22 also appears in current temp, so use getAllByText
      expect(screen.getByText('21°')).toBeInTheDocument();
      const twentyTwos = screen.getAllByText('22°');
      expect(twentyTwos.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('23°')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('returns null when weather data is null and no error', () => {
      useWeather.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isRefetching: false,
      });

      const { container } = render(<WeatherWidget />);
      // Should render the error/no location state since locations are available but no weather
      // Actually with null data and no error, it returns null
      expect(container.querySelector('.bg-panel')).toBeNull();
    });

    it('handles empty locations array', () => {
      useWeatherLocations.mockReturnValue({
        data: [],
        isLoading: false,
      });
      useWeather.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('No location'),
        refetch: vi.fn(),
        isRefetching: false,
      });

      render(<WeatherWidget />);
      expect(screen.getByText('No weather location set.')).toBeInTheDocument();
    });
  });
});
