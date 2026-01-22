/**
 * =============================================================================
 * WEATHER.JS - Weather Data Routes
 * =============================================================================
 *
 * This file handles weather information in myBrain.
 * Users can get current weather and forecasts for their locations.
 *
 * WHAT IS THE WEATHER FEATURE?
 * ----------------------------
 * Weather feature provides:
 * - CURRENT CONDITIONS: Temperature, humidity, wind
 * - FORECAST: 7-day weather prediction
 * - ALERTS: Severe weather warnings
 * - WIDGETS: Display weather on dashboard
 * - LOCATION TRACKING: Weather for saved locations
 *
 * WHERE IS WEATHER USED?
 * ----------------------
 * - DASHBOARD: Weather widget shows current conditions
 * - PLANNING: Check weather before scheduling events
 * - ACTIVITY PLANNING: Choose activities based on forecast
 * - TRAVEL: Check weather for trip destinations
 * - NOTIFICATIONS: Alerts if severe weather expected
 *
 * WEATHER DATA SOURCE:
 * --------------------
 * Uses OpenWeatherMap API:
 * - Free tier: 1000 calls/day
 * - Premium tier: Unlimited
 * - Updated: Every 10-15 minutes
 * - Coverage: Global (200,000+ cities)
 *
 * WEATHER METRICS:
 * ----------------
 * - TEMPERATURE: Current and "feels like"
 * - HUMIDITY: Percentage of moisture
 * - WIND SPEED: Current wind speed
 * - WIND DIRECTION: Which direction it's coming from
 * - PRESSURE: Barometric pressure
 * - VISIBILITY: How far you can see
 * - UV INDEX: Sun exposure risk
 * - PRECIPITATION: Rain/snow probability
 * - CLOUDS: Cloud coverage percentage
 *
 * WEATHER UNITS:
 * ---------------
 * - METRIC: Celsius, m/s, mm (default)
 * - IMPERIAL: Fahrenheit, mph, inches
 * - User can choose in settings
 *
 * FORECAST:
 * ----------
 * 7-day forecast includes:
 * - High/low temperatures
 * - Condition (sunny, rainy, cloudy)
 * - Precipitation probability
 * - Wind speed
 * - Humidity
 *
 * SEVERE WEATHER ALERTS:
 * ----------------------
 * Alerts include:
 * - THUNDERSTORMS: Lightning risk
 * - TORNADOES: Tornado warning/watch
 * - EXTREME HEAT: Dangerous temperatures
 * - EXTREME COLD: Dangerous temperatures
 * - HEAVY RAIN: Flooding risk
 * - WINTER STORM: Snow/ice hazard
 * - WIND: Dangerous wind speeds
 * - FLOODS: Flooding expected
 *
 * SAVED LOCATIONS WEATHER:
 * -------------------------
 * If you enable weather tracking for saved location:
 * - Daily forecast displayed on dashboard
 * - Alerts sent if severe weather
 * - Accessible from location details
 *
 * CACHING:
 * --------
 * Weather data cached locally:
 * - Current weather: Cached 10 minutes
 * - Forecast: Cached 4 hours
 * - Reduces API calls and improves speed
 *
 * PRIVACY:
 * --------
 * - Location data not shared publicly
 * - Only user sees their weather
 * - API calls logged (not shared)
 * - Third-party API (OpenWeatherMap) privacy policy applies
 *
 * ENDPOINTS:
 * -----------
 * - GET /weather - Get current weather (user's location or specified)
 * - GET /weather/forecast - Get 7-day forecast
 * - GET /weather/:location - Get weather for specific location
 * - GET /weather/locations/:id - Get weather for saved location
 * - GET /weather/alerts - Get active severe weather alerts
 * - POST /weather/subscribe - Subscribe to location alerts
 *
 * QUERY PARAMETERS:
 * -----------------
 * - location: Specific location name or coordinates
 * - units: 'metric' (C) or 'imperial' (F)
 * - lang: Language code for descriptions
 *
 * DEFAULT LOCATION:
 * ------------------
 * If no location specified:
 * - Uses user's profile location
 * - If not set, request location parameter
 * - User can set default in settings
 *
 * ERRORS:
 * --------
 * Common issues:
 * - INVALID LOCATION: City not found
 * - API RATE LIMIT: Too many requests
 * - API ERROR: Weather service temporarily unavailable
 * - NO LOCATION: Must specify location or set default
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, DELETE)
 * - Define routes (URLs that the frontend can call)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Mongoose provides database utilities for MongoDB validation.
 * We use mongoose.Types.ObjectId.isValid() to verify that location IDs
 * are properly formatted MongoDB object IDs before querying the database.
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every weather request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Request logger attaches important IDs to the request for Wide Events logging.
 * attachEntityId(req, 'locationId', value) marks what entity this request affected.
 * This helps us track and search logs by specific weather locations.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Weather service contains business logic for weather operations.
 * It handles API calls to OpenWeatherMap, geocoding locations,
 * caching weather data, and managing saved weather locations.
 */
import weatherService from '../services/weatherService.js';

/**
 * User model represents a user account in myBrain.
 * We import this to fetch user's profile location and weather preferences.
 * Each user can have a default location and additional saved locations.
 */
import User from '../models/User.js';

const router = express.Router();

/**
 * GET /weather
 * Get weather for user's default location or specified location
 *
 * WHAT IT DOES:
 * Returns current weather conditions and forecast for a location.
 * Can use user's default location or request weather for specific location.
 *
 * DEFAULT LOCATION:
 * If no location specified in request:
 * - Uses user's profile location (set in Settings)
 * - If no profile location, returns error
 *
 * TEMPERATURE UNITS:
 * - metric (default): Celsius, m/s wind, mm precipitation
 * - imperial: Fahrenheit, mph wind, inches precipitation
 *
 * USE CASES:
 * - Dashboard widget: Show weather for user's home location
 * - Planning: Check weather for specific city before scheduling event
 * - Travel: Get forecast for trip destination
 *
 * QUERY PARAMETERS:
 * - location: Optional - location name or coordinates (e.g., "Toronto", "40.7128,-74.0060")
 * - units: Optional - 'metric' (default) or 'imperial'
 *
 * EXAMPLE REQUESTS:
 * GET /weather → Uses user's profile location
 * GET /weather?location=Paris → Gets weather for Paris
 * GET /weather?units=imperial → Gets in Fahrenheit
 * GET /weather?location=London&units=imperial → London in Fahrenheit
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // =====================================================
    // EXTRACT & VALIDATE INPUT
    // =====================================================
    // Step 1: Extract location and temperature units from query parameters
    // units defaults to 'metric' (Celsius), can be 'imperial' (Fahrenheit)
    const { location, units = 'metric' } = req.query;
    let locationToUse = location;

    // =====================================================
    // DETERMINE LOCATION
    // =====================================================
    // Step 2: If no location specified in request, try to use user's profile location
    if (!locationToUse) {
      // Fetch user document to get their default/profile location
      const user = await User.findById(req.user._id);
      locationToUse = user?.profile?.location;

      // Step 3: Check if user has a profile location configured
      // If not, we have no way to know which weather to retrieve
      if (!locationToUse) {
        return res.status(400).json({
          success: false,
          error: 'No location specified and no default location set in profile',
        });
      }
    }

    // =====================================================
    // FETCH WEATHER
    // =====================================================
    // Step 4: Get weather data from service
    // weatherService handles:
    // - Calling OpenWeatherMap API
    // - Caching results (10 min cache for current weather)
    // - Formatting response
    const weatherData = await weatherService.getWeather(locationToUse, units);

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 5: Return weather data to frontend
    // Includes current conditions, forecast, alerts, etc.
    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    // Handle specific error case: location name not found in geocoding
    if (error.message === 'Location not found') {
      return res.status(404).json({
        success: false,
        error: 'Location not found. Please check the location name and try again.',
      });
    }
    // Let error handler middleware deal with other unexpected errors
    next(error);
  }
});

/**
 * GET /weather/geocode
 * Geocode a location name to get coordinates
 *
 * WHAT IT DOES:
 * Converts location name (like "Toronto, Ontario") to coordinates (latitude, longitude).
 * Used when adding new weather locations or validating location names.
 *
 * GEOCODING:
 * Geocoding is the process of finding coordinates from location name:
 * Input: "San Francisco, California"
 * Output: { latitude: 37.7749, longitude: -122.4194 }
 *
 * USE CASES:
 * - Validate location name before saving
 * - Get coordinates for maps integration
 * - Auto-suggest location format to user
 * - Support multiple location name formats
 *
 * QUERY PARAMETERS:
 * - location: Required - location name to geocode
 *   Can be: city, "city, state", "city, country"
 *
 * EXAMPLE REQUESTS:
 * GET /weather/geocode?location=Tokyo
 * GET /weather/geocode?location=New York, USA
 * GET /weather/geocode?location=Paris, France
 */
router.get('/geocode', requireAuth, async (req, res, next) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract location name from query parameters
    const { location } = req.query;

    // Step 2: Validate that location parameter was provided
    // Location is required to geocode
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location query parameter is required',
      });
    }

    // =====================================================
    // GEOCODE LOCATION
    // =====================================================
    // Step 3: Call service to convert location name to coordinates
    // Service calls OpenWeatherMap geocoding API
    // Returns object with: latitude, longitude, country, state, etc.
    const result = await weatherService.geocodeLocation(location);

    // Step 4: Check if location was successfully geocoded
    // If not found in OpenWeatherMap database, result will be null
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Location not found',
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 5: Return geocoded coordinates to frontend
    // Frontend can use these coordinates for:
    // - Mapping
    // - Weather API calls
    // - Saving location with GPS coordinates
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Let error handler middleware deal with unexpected errors
    next(error);
  }
});

/**
 * GET /weather/locations
 * Get user's saved weather locations
 *
 * WHAT IT DOES:
 * Returns list of all locations user is tracking weather for.
 * Always includes user's profile location as default + any additional saved locations.
 *
 * LOCATION TYPES:
 * - Profile Location: User's home/work location (from Settings profile)
 *   * Always default (can't be removed)
 *   * Can only be changed in Profile Settings
 * - Additional Locations: User-created weather tracking locations
 *   * Can be added/removed freely
 *   * Great for travel, second homes, etc.
 *
 * USE CASES:
 * - Show list of tracked locations in weather widget
 * - Let user switch between locations to see their weather
 * - Manage saved locations (add/remove)
 *
 * EXAMPLE RESPONSE:
 * {
 *   success: true,
 *   data: [
 *     {
 *       _id: "profile",
 *       name: "My Location",
 *       location: "Toronto, Ontario",
 *       isDefault: true,
 *       isProfileLocation: true
 *     },
 *     {
 *       _id: "123abc",
 *       name: "Vacation Home",
 *       location: "Miami, Florida",
 *       isDefault: false,
 *       isProfileLocation: false
 *     }
 *   ]
 * }
 */
router.get('/locations', requireAuth, async (req, res, next) => {
  try {
    // =====================================================
    // FETCH USER & LOCATIONS
    // =====================================================
    // Step 1: Fetch user document from database
    const user = await User.findById(req.user._id);
    // Get user's additional weather locations (array field)
    const additionalLocations = user?.weatherLocations || [];

    // =====================================================
    // BUILD LOCATIONS LIST
    // =====================================================
    // Step 2: Create array to hold all locations (profile + saved)
    const allLocations = [];

    // Step 3: Add profile location first (it's always the default)
    // Profile location comes from user's Settings/Profile section
    // This is the user's primary location
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',                           // Special ID 'profile' for profile location
        name: 'My Location',                      // Standard display name
        location: user.profile.location,          // The actual location string (city, etc.)
        isDefault: true,                          // Profile location is always default
        isProfileLocation: true,                  // Marks this as special profile location
      });
    }

    // Step 4: Add any additional weather tracking locations user has saved
    // These are user-created locations for monitoring weather in multiple places
    additionalLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,                             // MongoDB ObjectId of saved location
        name: loc.name,                           // User-given name (e.g., "Summer Cabin")
        location: loc.location,                   // Location string (e.g., "Muskoka, Ontario")
        isDefault: false,                         // Additional locations are not default
        isProfileLocation: false,                 // These are user-created, not from profile
      });
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 5: Return all locations to frontend
    // Frontend uses this to populate location picker in weather widget
    res.json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    // Let error handler middleware deal with unexpected errors
    next(error);
  }
});

/**
 * POST /weather/locations
 * Add a new weather location
 *
 * WHAT IT DOES:
 * Creates a new weather tracking location for the user.
 * Profile location is always the default - this adds additional locations.
 *
 * VALIDATION:
 * Location name is validated by geocoding it:
 * - If geocoding succeeds, location is saved
 * - If geocoding fails, returns error (location not found)
 * This ensures saved locations are valid and can be looked up later.
 *
 * USE CASES:
 * - Add vacation home for weather tracking
 * - Track weather for office location
 * - Monitor weather in multiple cities
 * - Save frequently-checked locations
 *
 * EXAMPLE REQUEST:
 * POST /weather/locations
 * Body: {
 *   name: "Summer Cabin",
 *   location: "Muskoka, Ontario"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   success: true,
 *   data: [
 *     { _id: "profile", name: "My Location", ... },
 *     { _id: "123abc", name: "Summer Cabin", location: "Muskoka, Ontario", ... }
 *   ]
 * }
 */
router.post('/locations', requireAuth, async (req, res, next) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract location details from request body
    const { name, location } = req.body;

    // Step 2: Validate required fields
    // Both name and location are required to save
    if (!name || !location) {
      return res.status(400).json({
        success: false,
        error: 'Name and location are required',
      });
    }

    // =====================================================
    // VERIFY LOCATION EXISTS
    // =====================================================
    // Step 3: Validate location by geocoding it
    // This ensures:
    // - Location is real and exists
    // - Location can be looked up later for weather
    // - Prevents saving invalid/made-up locations
    const geocoded = await weatherService.geocodeLocation(location);
    if (!geocoded) {
      return res.status(400).json({
        success: false,
        error: 'Could not find this location. Try a city name like "Toronto, Ontario".',
      });
    }

    // =====================================================
    // SAVE LOCATION
    // =====================================================
    // Step 4: Fetch user document from database
    const user = await User.findById(req.user._id);

    // Step 5: Add new location to user's weatherLocations array
    // Never mark as default - profile location is always the default
    user.weatherLocations.push({
      name: name.trim(),
      location: location.trim(),
      isDefault: false,
    });

    // Step 6: Save user document with the new location added
    await user.save();

    // =====================================================
    // BUILD RESPONSE
    // =====================================================
    // Step 7: Build complete location list for response
    // Include profile location first + all saved locations
    const allLocations = [];

    // Add profile location if it exists
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',
        name: 'My Location',
        location: user.profile.location,
        isDefault: true,
        isProfileLocation: true,
      });
    }

    // Add all saved weather locations
    user.weatherLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,
        name: loc.name,
        location: loc.location,
        isDefault: false,
        isProfileLocation: false,
      });
    });

    // =====================================================
    // LOGGING
    // =====================================================
    // Step 8: Log this action for Wide Events tracking
    // Get the newly created location to attach its ID
    const newLocation = user.weatherLocations[user.weatherLocations.length - 1];
    attachEntityId(req, 'locationId', newLocation._id);
    req.eventName = 'weather.location.create.success';

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 9: Return success with updated complete location list
    res.status(201).json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    // Let error handler middleware deal with unexpected errors
    next(error);
  }
});

/**
 * DELETE /weather/locations/:id
 * Remove a weather location (cannot remove profile location)
 *
 * WHAT IT DOES:
 * Deletes a saved weather location from user's list.
 * Does NOT delete profile location - that can only be changed in Settings.
 *
 * PROTECTION:
 * Cannot delete profile location because it's user's primary location.
 * To change default location, user must update Profile Settings.
 *
 * USE CASES:
 * - Remove vacation home after trip
 * - Delete location user no longer needs weather for
 * - Clean up old saved locations
 *
 * EXAMPLE REQUEST:
 * DELETE /weather/locations/123abc
 * Result: Location removed from saved list
 */
router.delete('/locations/:id', requireAuth, async (req, res, next) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract location ID from URL path
    const { id } = req.params;

    // Step 2: Check if trying to delete profile location
    // Profile location is special - cannot be deleted via this endpoint
    // Must be changed in Profile Settings instead
    if (id === 'profile') {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove your profile location. Update it in Profile Settings instead.',
      });
    }

    // Step 3: Validate that ID is a valid MongoDB ObjectId
    // Prevents database errors from invalid ID formats
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location ID',
      });
    }

    // =====================================================
    // FIND & DELETE LOCATION
    // =====================================================
    // Step 4: Fetch user and find the location to delete
    const user = await User.findById(req.user._id);
    // Find index of location in user's weatherLocations array
    const locationIndex = user.weatherLocations.findIndex(
      loc => loc._id.toString() === id
    );

    // Step 5: Check if location exists and belongs to user
    // If not found, return 404
    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Location not found',
      });
    }

    // =====================================================
    // LOGGING (before deletion)
    // =====================================================
    // Step 6: Log this action for Wide Events tracking
    // Must attach ID before removing from array
    attachEntityId(req, 'locationId', id);
    req.eventName = 'weather.location.delete.success';

    // =====================================================
    // DELETE LOCATION
    // =====================================================
    // Step 7: Remove location from weatherLocations array
    // splice(index, 1) removes 1 element at the specified index
    user.weatherLocations.splice(locationIndex, 1);

    // Step 8: Save user document with updated locations array
    await user.save();

    // =====================================================
    // BUILD RESPONSE
    // =====================================================
    // Step 9: Build complete location list for response
    // Include profile location + remaining saved locations
    const allLocations = [];

    // Add profile location if it exists
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',
        name: 'My Location',
        location: user.profile.location,
        isDefault: true,
        isProfileLocation: true,
      });
    }

    // Add remaining weather locations
    user.weatherLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,
        name: loc.name,
        location: loc.location,
        isDefault: false,
        isProfileLocation: false,
      });
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 10: Return success with updated location list
    res.json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    // Let error handler middleware deal with unexpected errors
    next(error);
  }
});

export default router;
