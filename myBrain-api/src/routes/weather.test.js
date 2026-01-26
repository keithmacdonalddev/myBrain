/**
 * =============================================================================
 * WEATHER.TEST.JS - Tests for Weather Routes
 * =============================================================================
 *
 * Tests for weather-related endpoints:
 * - GET /weather - Get weather for user's default or specified location
 * - GET /weather/geocode - Geocode a location name to coordinates
 * - GET /weather/locations - Get user's saved weather locations
 * - POST /weather/locations - Add a new weather location
 * - DELETE /weather/locations/:id - Remove a weather location
 *
 * MOCKING STRATEGY:
 * For ESM compatibility, we use jest.unstable_mockModule which must be called
 * before importing the module that uses the mocked dependency.
 */

import { jest } from '@jest/globals';

// Mock weatherService BEFORE importing the app (which imports weather routes)
const mockGetWeather = jest.fn();
const mockGeocodeLocation = jest.fn();

jest.unstable_mockModule('../services/weatherService.js', () => ({
  default: {
    getWeather: mockGetWeather,
    geocodeLocation: mockGeocodeLocation,
    getWeatherByCoordinates: jest.fn(),
    WEATHER_CODES: {},
  },
}));

// Now import the app after setting up mocks
const { default: app } = await import('../test/testApp.js');
const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { default: User } = await import('../models/User.js');

describe('Weather Routes', () => {
  let authToken;
  let testUserId;

  /**
   * Create and login a test user before each test.
   * This ensures clean state and valid authentication.
   */
  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create test user
    await request(app)
      .post('/auth/register')
      .send({
        email: 'weather@example.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'weather@example.com',
        password: 'Password123!',
      });

    authToken = loginRes.body.token;

    // Get user ID for direct database operations in some tests
    const user = await User.findOne({ email: 'weather@example.com' });
    testUserId = user._id;
  });

  // ==========================================================================
  // GET /weather - Get weather for location
  // ==========================================================================
  describe('GET /weather', () => {
    const mockWeatherData = {
      location: {
        name: 'New York',
        country: 'United States',
        admin1: 'New York',
        latitude: 40.71,
        longitude: -74.01,
        timezone: 'America/New_York',
      },
      current: {
        temperature: 22,
        feelsLike: 24,
        humidity: 65,
        windSpeed: 15,
        windDirection: 180,
        weatherCode: 2,
        description: 'Partly cloudy',
        icon: 'cloud-sun',
      },
      hourly: [],
      daily: [],
      units: {
        temperature: '°C',
        windSpeed: 'km/h',
      },
      lastUpdated: '2024-01-15T12:00:00Z',
    };

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/weather');

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when no location specified and no profile location', async () => {
      const res = await request(app)
        .get('/weather')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No location specified');
    });

    it('should get weather for specified location', async () => {
      // Setup mock
      mockGetWeather.mockResolvedValue(mockWeatherData);

      const res = await request(app)
        .get('/weather')
        .query({ location: 'New York' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.location.name).toBe('New York');
      expect(res.body.data.current.temperature).toBe(22);

      // Verify service was called with correct parameters
      expect(mockGetWeather).toHaveBeenCalledWith('New York', 'metric');
    });

    it('should use user profile location when no location specified', async () => {
      // Setup user with profile location
      await User.findByIdAndUpdate(testUserId, {
        'profile.location': 'Toronto, Ontario',
      });

      // Setup mock
      mockGetWeather.mockResolvedValue({
        ...mockWeatherData,
        location: { ...mockWeatherData.location, name: 'Toronto' },
      });

      const res = await request(app)
        .get('/weather')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify service was called with profile location
      expect(mockGetWeather).toHaveBeenCalledWith('Toronto, Ontario', 'metric');
    });

    it('should support imperial units', async () => {
      mockGetWeather.mockResolvedValue({
        ...mockWeatherData,
        units: { temperature: '°F', windSpeed: 'mph' },
      });

      const res = await request(app)
        .get('/weather')
        .query({ location: 'New York', units: 'imperial' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(mockGetWeather).toHaveBeenCalledWith('New York', 'imperial');
    });

    it('should return 404 when location not found', async () => {
      // Setup mock to throw "Location not found" error
      mockGetWeather.mockRejectedValue(new Error('Location not found'));

      const res = await request(app)
        .get('/weather')
        .query({ location: 'NonexistentPlace12345' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Location not found');
    });
  });

  // ==========================================================================
  // GET /weather/geocode - Geocode a location
  // ==========================================================================
  describe('GET /weather/geocode', () => {
    const mockGeocodedLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      name: 'New York',
      country: 'United States',
      admin1: 'New York',
    };

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/weather/geocode');

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when location parameter is missing', async () => {
      const res = await request(app)
        .get('/weather/geocode')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Location query parameter is required');
    });

    it('should geocode a valid location', async () => {
      mockGeocodeLocation.mockResolvedValue(mockGeocodedLocation);

      const res = await request(app)
        .get('/weather/geocode')
        .query({ location: 'New York' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.latitude).toBe(40.7128);
      expect(res.body.data.longitude).toBe(-74.006);
      expect(res.body.data.name).toBe('New York');
    });

    it('should return 404 when location cannot be geocoded', async () => {
      mockGeocodeLocation.mockResolvedValue(null);

      const res = await request(app)
        .get('/weather/geocode')
        .query({ location: 'NonexistentPlace12345' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Location not found');
    });
  });

  // ==========================================================================
  // GET /weather/locations - Get user's saved locations
  // ==========================================================================
  describe('GET /weather/locations', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/weather/locations');

      expect(res.statusCode).toBe(401);
    });

    it('should return empty array when user has no locations', async () => {
      const res = await request(app)
        .get('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should include profile location as first item', async () => {
      // Setup user with profile location
      await User.findByIdAndUpdate(testUserId, {
        'profile.location': 'Toronto, Ontario',
      });

      const res = await request(app)
        .get('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe('profile');
      expect(res.body.data[0].name).toBe('My Location');
      expect(res.body.data[0].location).toBe('Toronto, Ontario');
      expect(res.body.data[0].isDefault).toBe(true);
      expect(res.body.data[0].isProfileLocation).toBe(true);
    });

    it('should return all saved locations after profile location', async () => {
      // Setup user with profile location and additional locations
      await User.findByIdAndUpdate(testUserId, {
        'profile.location': 'Toronto, Ontario',
        weatherLocations: [
          { name: 'Office', location: 'New York, NY', isDefault: false },
          { name: 'Beach House', location: 'Miami, FL', isDefault: false },
        ],
      });

      const res = await request(app)
        .get('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(3);

      // First item should be profile location
      expect(res.body.data[0]._id).toBe('profile');
      expect(res.body.data[0].isProfileLocation).toBe(true);

      // Additional locations should follow
      expect(res.body.data[1].name).toBe('Office');
      expect(res.body.data[1].isProfileLocation).toBe(false);
      expect(res.body.data[2].name).toBe('Beach House');
    });
  });

  // ==========================================================================
  // POST /weather/locations - Add a new weather location
  // ==========================================================================
  describe('POST /weather/locations', () => {
    const mockGeocodedLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      name: 'New York',
      country: 'United States',
      admin1: 'New York',
    };

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/weather/locations')
        .send({ name: 'Office', location: 'New York, NY' });

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: 'New York, NY' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Name and location are required');
    });

    it('should return 400 when location is missing', async () => {
      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Office' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Name and location are required');
    });

    it('should return 400 when location cannot be geocoded', async () => {
      mockGeocodeLocation.mockResolvedValue(null);

      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid', location: 'NonexistentPlace12345' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Could not find this location');
    });

    it('should add a new location successfully', async () => {
      mockGeocodeLocation.mockResolvedValue(mockGeocodedLocation);

      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Office', location: 'New York, NY' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      // Find the new location in the response
      const newLocation = res.body.data.find(loc => loc.name === 'Office');
      expect(newLocation).toBeDefined();
      expect(newLocation.location).toBe('New York, NY');
      expect(newLocation.isDefault).toBe(false);
      expect(newLocation.isProfileLocation).toBe(false);
    });

    it('should trim whitespace from name and location', async () => {
      mockGeocodeLocation.mockResolvedValue(mockGeocodedLocation);

      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '  Office  ', location: '  New York, NY  ' });

      expect(res.statusCode).toBe(201);

      const newLocation = res.body.data.find(loc => loc.name === 'Office');
      expect(newLocation.name).toBe('Office');
      expect(newLocation.location).toBe('New York, NY');
    });

    it('should include profile location in response when present', async () => {
      // Setup user with profile location
      await User.findByIdAndUpdate(testUserId, {
        'profile.location': 'Toronto, Ontario',
      });

      mockGeocodeLocation.mockResolvedValue(mockGeocodedLocation);

      const res = await request(app)
        .post('/weather/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Office', location: 'New York, NY' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]._id).toBe('profile');
      expect(res.body.data[1].name).toBe('Office');
    });
  });

  // ==========================================================================
  // DELETE /weather/locations/:id - Delete a weather location
  // ==========================================================================
  describe('DELETE /weather/locations/:id', () => {
    let locationId;

    beforeEach(async () => {
      // Add a weather location to delete
      await User.findByIdAndUpdate(testUserId, {
        weatherLocations: [
          { name: 'Office', location: 'New York, NY', isDefault: false },
        ],
      });

      // Get the location ID
      const user = await User.findById(testUserId);
      locationId = user.weatherLocations[0]._id.toString();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/weather/locations/${locationId}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when trying to delete profile location', async () => {
      const res = await request(app)
        .delete('/weather/locations/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cannot remove your profile location');
    });

    it('should return 400 for invalid MongoDB ObjectId', async () => {
      const res = await request(app)
        .delete('/weather/locations/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid location ID');
    });

    it('should return 404 when location does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/weather/locations/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Location not found');
    });

    it('should delete a location successfully', async () => {
      const res = await request(app)
        .delete(`/weather/locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify location is removed from user
      const user = await User.findById(testUserId);
      expect(user.weatherLocations.length).toBe(0);
    });

    it('should return updated locations list after deletion', async () => {
      // Add profile location and another weather location
      await User.findByIdAndUpdate(testUserId, {
        'profile.location': 'Toronto, Ontario',
        $push: {
          weatherLocations: { name: 'Beach House', location: 'Miami, FL', isDefault: false },
        },
      });

      const res = await request(app)
        .delete(`/weather/locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2); // Profile + Beach House

      const locationNames = res.body.data.map(loc => loc.name);
      expect(locationNames).toContain('My Location');
      expect(locationNames).toContain('Beach House');
      expect(locationNames).not.toContain('Office');
    });
  });

  // ==========================================================================
  // Edge cases and error handling
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle weather service errors gracefully', async () => {
      mockGetWeather.mockRejectedValue(new Error('API unavailable'));

      const res = await request(app)
        .get('/weather')
        .query({ location: 'New York' })
        .set('Authorization', `Bearer ${authToken}`);

      // Should pass error to error handler
      expect(res.statusCode).toBe(500);
    });

    it('should handle geocode service errors gracefully', async () => {
      mockGeocodeLocation.mockRejectedValue(new Error('Geocoding failed'));

      const res = await request(app)
        .get('/weather/geocode')
        .query({ location: 'New York' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(500);
    });
  });
});
