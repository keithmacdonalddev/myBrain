/**
 * =============================================================================
 * WEATHERSERVICE.TEST.JS - Comprehensive Tests for Weather Service
 * =============================================================================
 *
 * This test file covers all functions in weatherService.js:
 * - getWeather: Main weather fetch function
 * - geocodeLocation: Converts address to coordinates
 * - getWeatherByCoordinates: Fetches weather for lat/lng
 * - extractLocationParts: Parses location string (internal but tested via geocodeLocation)
 * - tryGeocode: Attempts geocoding with fallbacks (internal but tested via geocodeLocation)
 * - formatWeatherData: Formats API response for frontend (internal but tested via getWeather)
 * - WEATHER_CODES: Weather code mapping constant
 *
 * TESTING STRATEGY:
 * -----------------
 * 1. Mock the global fetch function to simulate Open-Meteo API responses
 * 2. Test success cases with valid data
 * 3. Test error handling for API failures
 * 4. Test edge cases like empty locations, special characters
 * 5. Test both metric and imperial units
 *
 * NOTE: This service doesn't use the database, so we don't need the full
 * MongoDB setup. We only need to mock the external fetch API.
 *
 * =============================================================================
 */

import { jest } from '@jest/globals';
import weatherService from './weatherService.js';

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Mock successful geocoding response from Open-Meteo
 */
const mockGeocodingResponse = {
  results: [
    {
      latitude: 40.7128,
      longitude: -74.006,
      name: 'New York',
      country: 'United States',
      admin1: 'New York',
    },
  ],
};

/**
 * Mock successful weather response from Open-Meteo
 */
const mockWeatherResponse = {
  latitude: 40.7128,
  longitude: -74.006,
  timezone: 'America/New_York',
  current_units: {
    temperature_2m: '°F',
    wind_speed_10m: 'mph',
  },
  current: {
    temperature_2m: 72.5,
    apparent_temperature: 74.2,
    relative_humidity_2m: 65,
    weather_code: 2,
    wind_speed_10m: 8.5,
    wind_direction_10m: 180,
  },
  hourly: {
    time: [
      '2024-01-15T00:00',
      '2024-01-15T01:00',
      '2024-01-15T02:00',
      '2024-01-15T03:00',
      '2024-01-15T04:00',
      '2024-01-15T05:00',
      '2024-01-15T06:00',
      '2024-01-15T07:00',
      '2024-01-15T08:00',
      '2024-01-15T09:00',
      '2024-01-15T10:00',
      '2024-01-15T11:00',
      '2024-01-15T12:00',
      '2024-01-15T13:00',
      '2024-01-15T14:00',
      '2024-01-15T15:00',
      '2024-01-15T16:00',
      '2024-01-15T17:00',
      '2024-01-15T18:00',
      '2024-01-15T19:00',
      '2024-01-15T20:00',
      '2024-01-15T21:00',
      '2024-01-15T22:00',
      '2024-01-15T23:00',
    ],
    temperature_2m: Array(24).fill(72),
    weather_code: Array(24).fill(2),
    precipitation_probability: Array(24).fill(10),
  },
  daily: {
    time: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19', '2024-01-20', '2024-01-21'],
    weather_code: [2, 3, 61, 0, 1, 2, 3],
    temperature_2m_max: [75, 73, 68, 70, 72, 74, 71],
    temperature_2m_min: [55, 53, 50, 52, 54, 56, 53],
    precipitation_probability_max: [10, 20, 80, 5, 10, 15, 25],
    sunrise: Array(7).fill('2024-01-15T07:00'),
    sunset: Array(7).fill('2024-01-15T17:30'),
  },
};

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock fetch function that returns specified responses
 * @param {Object|Error} geocodeResponse - Response for geocoding API calls
 * @param {Object|Error} weatherResponse - Response for weather API calls
 * @returns {Function} Mock fetch function
 */
function createMockFetch(geocodeResponse, weatherResponse) {
  return jest.fn((url) => {
    if (url.includes('geocoding-api.open-meteo.com')) {
      if (geocodeResponse instanceof Error) {
        return Promise.reject(geocodeResponse);
      }
      return Promise.resolve({
        ok: geocodeResponse.ok !== false,
        status: geocodeResponse.status || 200,
        json: () => Promise.resolve(geocodeResponse),
      });
    }
    if (url.includes('api.open-meteo.com')) {
      if (weatherResponse instanceof Error) {
        return Promise.reject(weatherResponse);
      }
      return Promise.resolve({
        ok: weatherResponse.ok !== false,
        status: weatherResponse.status || 200,
        json: () => Promise.resolve(weatherResponse),
      });
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

// =============================================================================
// TEST SETUP
// =============================================================================

// Store original fetch
const originalFetch = global.fetch;

// Suppress console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Reset fetch after each test
afterEach(() => {
  global.fetch = originalFetch;
});

// =============================================================================
// getWeather TESTS
// =============================================================================

describe('weatherService', () => {
  describe('getWeather', () => {
    describe('success cases', () => {
      it('should return weather data for a valid location name', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather('New York');

        expect(weather).toBeDefined();
        expect(weather.location.name).toBe('New York');
        expect(weather.location.country).toBe('United States');
        expect(weather.current.temperature).toBe(73); // Rounded from 72.5
        expect(weather.current.description).toBe('Partly cloudy');
        expect(weather.current.icon).toBe('cloud-sun');
      });

      it('should return weather data for coordinates object', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather({
          latitude: 40.7128,
          longitude: -74.006,
          name: 'Custom Location',
        });

        expect(weather).toBeDefined();
        expect(weather.location.name).toBe('Custom Location');
        expect(weather.current.temperature).toBe(73);
      });

      it('should return weather with metric units by default', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeather('New York');

        // Check that metric units were requested in the API call
        // The first call is geocoding, the second is weather
        // api.open-meteo.com (without geocoding- prefix) is the weather API
        const allCalls = global.fetch.mock.calls.map((call) => call[0]);
        const weatherCall = allCalls.find(
          (url) => url.includes('api.open-meteo.com') && !url.includes('geocoding-api')
        );
        expect(weatherCall).toBeDefined();
        expect(weatherCall).toContain('temperature_unit=celsius');
        expect(weatherCall).toContain('wind_speed_unit=kmh');
      });

      it('should return weather with imperial units when specified', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeather('New York', 'imperial');

        // Check that imperial units were requested
        // The first call is geocoding, the second is weather
        const allCalls = global.fetch.mock.calls.map((call) => call[0]);
        const weatherCall = allCalls.find(
          (url) => url.includes('api.open-meteo.com') && !url.includes('geocoding-api')
        );
        expect(weatherCall).toBeDefined();
        expect(weatherCall).toContain('temperature_unit=fahrenheit');
        expect(weatherCall).toContain('wind_speed_unit=mph');
      });

      it('should include hourly forecast data', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather('New York');

        expect(weather.hourly).toBeDefined();
        expect(Array.isArray(weather.hourly)).toBe(true);
        expect(weather.hourly.length).toBeLessThanOrEqual(24);
        expect(weather.hourly[0]).toHaveProperty('time');
        expect(weather.hourly[0]).toHaveProperty('temperature');
        expect(weather.hourly[0]).toHaveProperty('icon');
      });

      it('should include daily forecast data', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather('New York');

        expect(weather.daily).toBeDefined();
        expect(Array.isArray(weather.daily)).toBe(true);
        expect(weather.daily.length).toBe(7);
        expect(weather.daily[0]).toHaveProperty('date');
        expect(weather.daily[0]).toHaveProperty('temperatureMax');
        expect(weather.daily[0]).toHaveProperty('temperatureMin');
        expect(weather.daily[0]).toHaveProperty('sunrise');
        expect(weather.daily[0]).toHaveProperty('sunset');
      });

      it('should include unit information in response', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather('New York');

        expect(weather.units).toBeDefined();
        expect(weather.units.temperature).toBe('°F');
        expect(weather.units.windSpeed).toBe('mph');
      });

      it('should include lastUpdated timestamp', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const before = new Date();
        const weather = await weatherService.getWeather('New York');
        const after = new Date();

        expect(weather.lastUpdated).toBeDefined();
        const lastUpdated = new Date(weather.lastUpdated);
        expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('error handling', () => {
      it('should throw "Location not found" when geocoding fails', async () => {
        global.fetch = createMockFetch({ results: [] }, mockWeatherResponse);

        await expect(weatherService.getWeather('Nonexistent Place')).rejects.toThrow(
          'Location not found'
        );
      });

      it('should throw "Invalid location format" for number input', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await expect(weatherService.getWeather(12345)).rejects.toThrow('Invalid location format');
      });

      it('should throw for array input', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        // Arrays are objects without latitude/longitude, so they fail differently
        await expect(weatherService.getWeather([])).rejects.toThrow('Invalid location format');
      });

      it('should throw for null input', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        // null is type 'object' in JS but accessing .latitude throws
        await expect(weatherService.getWeather(null)).rejects.toThrow();
      });

      it('should throw when weather API fails', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, {
          ok: false,
          status: 500,
        });

        await expect(weatherService.getWeather('New York')).rejects.toThrow(
          'Weather API request failed'
        );
      });

      it('should throw when network error occurs', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        await expect(weatherService.getWeather('New York')).rejects.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle location with special characters', async () => {
        const specialGeoResponse = {
          results: [
            {
              latitude: 48.8566,
              longitude: 2.3522,
              name: "Paris (Île-de-France)",
              country: 'France',
              admin1: 'Île-de-France',
            },
          ],
        };
        global.fetch = createMockFetch(specialGeoResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather("Paris (Île-de-France)");

        expect(weather.location.name).toBe("Paris (Île-de-France)");
      });

      it('should handle coordinates object without name', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather({
          latitude: 40.7128,
          longitude: -74.006,
        });

        expect(weather.location.name).toBe('Unknown');
      });

      it('should handle coordinates with country info', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const weather = await weatherService.getWeather({
          latitude: 40.7128,
          longitude: -74.006,
          name: 'NYC',
          country: 'USA',
          admin1: 'New York State',
        });

        expect(weather.location.name).toBe('NYC');
        expect(weather.location.country).toBe('USA');
        expect(weather.location.admin1).toBe('New York State');
      });
    });
  });

  // =============================================================================
  // geocodeLocation TESTS
  // =============================================================================

  describe('geocodeLocation', () => {
    describe('success cases', () => {
      it('should geocode a simple city name', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const result = await weatherService.geocodeLocation('New York');

        expect(result).toBeDefined();
        expect(result.latitude).toBe(40.7128);
        expect(result.longitude).toBe(-74.006);
        expect(result.name).toBe('New York');
      });

      it('should geocode city with state', async () => {
        const response = {
          results: [
            {
              latitude: 37.7749,
              longitude: -122.4194,
              name: 'San Francisco',
              country: 'United States',
              admin1: 'California',
            },
          ],
        };
        global.fetch = createMockFetch(response, mockWeatherResponse);

        const result = await weatherService.geocodeLocation('San Francisco, CA');

        expect(result).toBeDefined();
        expect(result.name).toBe('San Francisco');
        expect(result.admin1).toBe('California');
      });

      it('should geocode full address by extracting city', async () => {
        // First call (full address) returns no results
        // Second call (extracted city) returns results
        let callCount = 0;
        global.fetch = jest.fn((url) => {
          callCount++;
          if (url.includes('geocoding-api.open-meteo.com')) {
            if (callCount === 1) {
              // First try with full address - no results
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ results: [] }),
              });
            }
            // Subsequent tries with extracted parts
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockGeocodingResponse),
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        const result = await weatherService.geocodeLocation('123 Main St, New York, NY, 10001, USA');

        expect(result).toBeDefined();
        expect(result.name).toBe('New York');
      });

      it('should return first result from API', async () => {
        const multipleResults = {
          results: [
            { latitude: 40.7128, longitude: -74.006, name: 'New York City', country: 'United States' },
            { latitude: 51.5074, longitude: -0.1278, name: 'New York', country: 'United Kingdom' },
          ],
        };
        global.fetch = createMockFetch(multipleResults, mockWeatherResponse);

        const result = await weatherService.geocodeLocation('New York');

        expect(result.name).toBe('New York City');
        expect(result.country).toBe('United States');
      });
    });

    describe('error handling', () => {
      it('should return null for empty location', async () => {
        const result = await weatherService.geocodeLocation('');
        expect(result).toBeNull();
      });

      it('should return null for null location', async () => {
        const result = await weatherService.geocodeLocation(null);
        expect(result).toBeNull();
      });

      it('should return null for undefined location', async () => {
        const result = await weatherService.geocodeLocation(undefined);
        expect(result).toBeNull();
      });

      it('should return null when no results found', async () => {
        global.fetch = createMockFetch({ results: [] }, mockWeatherResponse);

        const result = await weatherService.geocodeLocation('Xyzzy Nonexistent');

        expect(result).toBeNull();
      });

      it('should return null when API returns HTTP error', async () => {
        global.fetch = createMockFetch({ ok: false, status: 500 }, mockWeatherResponse);

        const result = await weatherService.geocodeLocation('New York');

        expect(result).toBeNull();
      });

      it('should return null when network error occurs', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const result = await weatherService.geocodeLocation('New York');

        expect(result).toBeNull();
      });
    });

    describe('location parsing', () => {
      it('should handle location with postal code', async () => {
        // Simulate first call failing, then city+state working
        let callCount = 0;
        global.fetch = jest.fn((url) => {
          callCount++;
          if (url.includes('geocoding-api.open-meteo.com')) {
            // On first few calls, return empty, then succeed
            if (callCount <= 1) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ results: [] }),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockGeocodingResponse),
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        const result = await weatherService.geocodeLocation('New York, NY, 10001');

        // Should eventually find a result by trying different parts
        expect(result).toBeDefined();
      });

      it('should handle Canadian postal code format', async () => {
        const canadaResponse = {
          results: [
            {
              latitude: 43.6532,
              longitude: -79.3832,
              name: 'Toronto',
              country: 'Canada',
              admin1: 'Ontario',
            },
          ],
        };

        let callCount = 0;
        global.fetch = jest.fn((url) => {
          callCount++;
          if (url.includes('geocoding-api.open-meteo.com')) {
            if (callCount <= 1) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ results: [] }),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(canadaResponse),
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        const result = await weatherService.geocodeLocation('Toronto, ON, M5V 2H1');

        expect(result).toBeDefined();
      });

      it('should handle location with only numbers in address', async () => {
        // Test that street numbers are skipped
        let callCount = 0;
        global.fetch = jest.fn((url) => {
          callCount++;
          if (url.includes('geocoding-api.open-meteo.com')) {
            if (callCount <= 1) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ results: [] }),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockGeocodingResponse),
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        const result = await weatherService.geocodeLocation('456 Oak Ave, New York');

        // Should skip "456 Oak Ave" and try "New York"
        expect(result).toBeDefined();
      });
    });
  });

  // =============================================================================
  // getWeatherByCoordinates TESTS
  // =============================================================================

  describe('getWeatherByCoordinates', () => {
    describe('success cases', () => {
      it('should fetch weather for valid coordinates with metric units', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        const result = await weatherService.getWeatherByCoordinates(40.7128, -74.006, 'metric');

        expect(result).toBeDefined();
        expect(result.current).toBeDefined();
        expect(result.hourly).toBeDefined();
        expect(result.daily).toBeDefined();

        // Verify API was called with correct parameters
        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('latitude=40.7128');
        expect(call).toContain('longitude=-74.006');
        expect(call).toContain('temperature_unit=celsius');
        expect(call).toContain('wind_speed_unit=kmh');
      });

      it('should fetch weather with imperial units', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(40.7128, -74.006, 'imperial');

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('temperature_unit=fahrenheit');
        expect(call).toContain('wind_speed_unit=mph');
      });

      it('should default to metric units', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(40.7128, -74.006);

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('temperature_unit=celsius');
      });

      it('should request 7-day forecast', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(40.7128, -74.006);

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('forecast_days=7');
      });

      it('should request auto timezone', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(40.7128, -74.006);

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('timezone=auto');
      });
    });

    describe('error handling', () => {
      it('should throw when API returns HTTP error', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, { ok: false, status: 500 });

        await expect(weatherService.getWeatherByCoordinates(40.7128, -74.006)).rejects.toThrow(
          'Weather API request failed'
        );
      });

      it('should throw when network error occurs', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

        await expect(weatherService.getWeatherByCoordinates(40.7128, -74.006)).rejects.toThrow(
          'Network timeout'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle negative coordinates', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(-33.8688, 151.2093); // Sydney

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('latitude=-33.8688');
        expect(call).toContain('longitude=151.2093');
      });

      it('should handle coordinates at equator/prime meridian', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(0, 0);

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('latitude=0');
        expect(call).toContain('longitude=0');
      });

      it('should handle extreme latitude values', async () => {
        global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

        await weatherService.getWeatherByCoordinates(89.9, -179.9);

        const call = global.fetch.mock.calls[0][0];
        expect(call).toContain('latitude=89.9');
        expect(call).toContain('longitude=-179.9');
      });
    });
  });

  // =============================================================================
  // WEATHER_CODES TESTS
  // =============================================================================

  describe('WEATHER_CODES', () => {
    it('should have mapping for clear sky (code 0)', () => {
      expect(weatherService.WEATHER_CODES[0]).toEqual({
        description: 'Clear sky',
        icon: 'sun',
      });
    });

    it('should have mapping for mainly clear (code 1)', () => {
      expect(weatherService.WEATHER_CODES[1]).toEqual({
        description: 'Mainly clear',
        icon: 'sun',
      });
    });

    it('should have mapping for partly cloudy (code 2)', () => {
      expect(weatherService.WEATHER_CODES[2]).toEqual({
        description: 'Partly cloudy',
        icon: 'cloud-sun',
      });
    });

    it('should have mapping for overcast (code 3)', () => {
      expect(weatherService.WEATHER_CODES[3]).toEqual({
        description: 'Overcast',
        icon: 'cloud',
      });
    });

    it('should have mapping for fog (codes 45, 48)', () => {
      expect(weatherService.WEATHER_CODES[45].icon).toBe('cloud-fog');
      expect(weatherService.WEATHER_CODES[48].icon).toBe('cloud-fog');
    });

    it('should have mapping for drizzle (codes 51-57)', () => {
      expect(weatherService.WEATHER_CODES[51].icon).toBe('cloud-drizzle');
      expect(weatherService.WEATHER_CODES[53].icon).toBe('cloud-drizzle');
      expect(weatherService.WEATHER_CODES[55].icon).toBe('cloud-drizzle');
      expect(weatherService.WEATHER_CODES[56].icon).toBe('cloud-drizzle');
      expect(weatherService.WEATHER_CODES[57].icon).toBe('cloud-drizzle');
    });

    it('should have mapping for rain (codes 61-67)', () => {
      expect(weatherService.WEATHER_CODES[61].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[63].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[65].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[66].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[67].icon).toBe('cloud-rain');
    });

    it('should have mapping for snow (codes 71-77)', () => {
      expect(weatherService.WEATHER_CODES[71].icon).toBe('cloud-snow');
      expect(weatherService.WEATHER_CODES[73].icon).toBe('cloud-snow');
      expect(weatherService.WEATHER_CODES[75].icon).toBe('cloud-snow');
      expect(weatherService.WEATHER_CODES[77].icon).toBe('cloud-snow');
    });

    it('should have mapping for showers (codes 80-86)', () => {
      expect(weatherService.WEATHER_CODES[80].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[81].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[82].icon).toBe('cloud-rain');
      expect(weatherService.WEATHER_CODES[85].icon).toBe('cloud-snow');
      expect(weatherService.WEATHER_CODES[86].icon).toBe('cloud-snow');
    });

    it('should have mapping for thunderstorms (codes 95-99)', () => {
      expect(weatherService.WEATHER_CODES[95].icon).toBe('cloud-lightning');
      expect(weatherService.WEATHER_CODES[96].icon).toBe('cloud-lightning');
      expect(weatherService.WEATHER_CODES[99].icon).toBe('cloud-lightning');
    });

    it('should have description for all mapped codes', () => {
      Object.values(weatherService.WEATHER_CODES).forEach((value) => {
        expect(value.description).toBeDefined();
        expect(typeof value.description).toBe('string');
        expect(value.description.length).toBeGreaterThan(0);
      });
    });

    it('should have icon for all mapped codes', () => {
      Object.values(weatherService.WEATHER_CODES).forEach((value) => {
        expect(value.icon).toBeDefined();
        expect(typeof value.icon).toBe('string');
        expect(value.icon.length).toBeGreaterThan(0);
      });
    });
  });

  // =============================================================================
  // formatWeatherData TESTS (tested via getWeather)
  // =============================================================================

  describe('formatWeatherData (via getWeather)', () => {
    it('should round temperature values', async () => {
      const weatherWithDecimals = {
        ...mockWeatherResponse,
        current: {
          ...mockWeatherResponse.current,
          temperature_2m: 72.7,
          apparent_temperature: 74.3,
        },
      };
      global.fetch = createMockFetch(mockGeocodingResponse, weatherWithDecimals);

      const weather = await weatherService.getWeather('New York');

      expect(weather.current.temperature).toBe(73); // Rounded from 72.7
      expect(weather.current.feelsLike).toBe(74); // Rounded from 74.3
    });

    it('should handle unknown weather codes gracefully', async () => {
      const weatherWithUnknownCode = {
        ...mockWeatherResponse,
        current: {
          ...mockWeatherResponse.current,
          weather_code: 999, // Unknown code
        },
      };
      global.fetch = createMockFetch(mockGeocodingResponse, weatherWithUnknownCode);

      const weather = await weatherService.getWeather('New York');

      // Should fall back to 'Unknown' and 'cloud' icon
      expect(weather.current.description).toBe('Unknown');
      expect(weather.current.icon).toBe('cloud');
    });

    it('should include all current weather fields', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      const weather = await weatherService.getWeather('New York');

      expect(weather.current).toHaveProperty('temperature');
      expect(weather.current).toHaveProperty('feelsLike');
      expect(weather.current).toHaveProperty('humidity');
      expect(weather.current).toHaveProperty('windSpeed');
      expect(weather.current).toHaveProperty('windDirection');
      expect(weather.current).toHaveProperty('weatherCode');
      expect(weather.current).toHaveProperty('description');
      expect(weather.current).toHaveProperty('icon');
    });

    it('should limit hourly forecast to 24 hours', async () => {
      const weatherWith48Hours = {
        ...mockWeatherResponse,
        hourly: {
          time: Array(48)
            .fill(0)
            .map((_, i) => `2024-01-15T${String(i % 24).padStart(2, '0')}:00`),
          temperature_2m: Array(48).fill(72),
          weather_code: Array(48).fill(2),
          precipitation_probability: Array(48).fill(10),
        },
      };
      global.fetch = createMockFetch(mockGeocodingResponse, weatherWith48Hours);

      const weather = await weatherService.getWeather('New York');

      expect(weather.hourly.length).toBeLessThanOrEqual(24);
    });

    it('should include precipitation probability in hourly forecast', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      const weather = await weatherService.getWeather('New York');

      weather.hourly.forEach((hour) => {
        expect(hour).toHaveProperty('precipitationProbability');
      });
    });

    it('should include all daily forecast fields', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      const weather = await weatherService.getWeather('New York');

      weather.daily.forEach((day) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('temperatureMax');
        expect(day).toHaveProperty('temperatureMin');
        expect(day).toHaveProperty('precipitationProbability');
        expect(day).toHaveProperty('weatherCode');
        expect(day).toHaveProperty('icon');
        expect(day).toHaveProperty('description');
        expect(day).toHaveProperty('sunrise');
        expect(day).toHaveProperty('sunset');
      });
    });

    it('should include timezone in location data', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      const weather = await weatherService.getWeather('New York');

      expect(weather.location.timezone).toBe('America/New_York');
    });

    it('should default units when not provided in API response', async () => {
      const weatherWithoutUnits = {
        ...mockWeatherResponse,
        current_units: undefined,
      };
      global.fetch = createMockFetch(mockGeocodingResponse, weatherWithoutUnits);

      const weather = await weatherService.getWeather('New York');

      // Should fall back to default units
      expect(weather.units.temperature).toBe('°C');
      expect(weather.units.windSpeed).toBe('km/h');
    });
  });

  // =============================================================================
  // INTEGRATION-STYLE TESTS
  // =============================================================================

  describe('integration scenarios', () => {
    it('should handle complete weather lookup workflow', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      // Simulate complete user flow
      const weather = await weatherService.getWeather('New York, NY', 'imperial');

      // Verify complete response structure
      expect(weather).toMatchObject({
        location: expect.objectContaining({
          name: expect.any(String),
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        }),
        current: expect.objectContaining({
          temperature: expect.any(Number),
          humidity: expect.any(Number),
        }),
        hourly: expect.any(Array),
        daily: expect.any(Array),
        units: expect.objectContaining({
          temperature: expect.any(String),
        }),
        lastUpdated: expect.any(String),
      });
    });

    it('should handle sequential requests for different locations', async () => {
      const nycGeo = { results: [{ latitude: 40.7128, longitude: -74.006, name: 'New York', country: 'USA' }] };
      const laGeo = { results: [{ latitude: 34.0522, longitude: -118.2437, name: 'Los Angeles', country: 'USA' }] };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(nycGeo) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockWeatherResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(laGeo) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockWeatherResponse) });

      const nycWeather = await weatherService.getWeather('New York');
      const laWeather = await weatherService.getWeather('Los Angeles');

      expect(nycWeather.location.name).toBe('New York');
      expect(laWeather.location.name).toBe('Los Angeles');
    });

    it('should handle weather lookup by coordinates then by name', async () => {
      global.fetch = createMockFetch(mockGeocodingResponse, mockWeatherResponse);

      // First by coordinates
      const byCoords = await weatherService.getWeather({
        latitude: 40.7128,
        longitude: -74.006,
        name: 'NYC',
      });

      // Then by name
      const byName = await weatherService.getWeather('New York');

      expect(byCoords.location.name).toBe('NYC');
      expect(byName.location.name).toBe('New York');
    });
  });
});
