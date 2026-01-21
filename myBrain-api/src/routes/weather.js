import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachEntityId } from '../middleware/requestLogger.js';
import weatherService from '../services/weatherService.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * GET /weather
 * Get weather for user's default location or specified location
 * Query params:
 *   - location: Optional location string (uses user's profile location if not provided)
 *   - units: 'metric' (default) or 'imperial'
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { location, units = 'metric' } = req.query;
    let locationToUse = location;

    // If no location specified, use user's profile location
    if (!locationToUse) {
      const user = await User.findById(req.user._id);
      locationToUse = user?.profile?.location;

      if (!locationToUse) {
        return res.status(400).json({
          success: false,
          error: 'No location specified and no default location set in profile',
        });
      }
    }

    const weatherData = await weatherService.getWeather(locationToUse, units);

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    if (error.message === 'Location not found') {
      return res.status(404).json({
        success: false,
        error: 'Location not found. Please check the location name and try again.',
      });
    }
    next(error);
  }
});

/**
 * GET /weather/geocode
 * Geocode a location name to get coordinates
 */
router.get('/geocode', requireAuth, async (req, res, next) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location query parameter is required',
      });
    }

    const result = await weatherService.geocodeLocation(location);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Location not found',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /weather/locations
 * Get user's saved weather locations
 * Profile location is always first and default
 */
router.get('/locations', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const additionalLocations = user?.weatherLocations || [];

    const allLocations = [];

    // Profile location is always first and default
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',
        name: 'My Location',
        location: user.profile.location,
        isDefault: true,
        isProfileLocation: true,
      });
    }

    // Add user's additional weather locations (none are default)
    additionalLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,
        name: loc.name,
        location: loc.location,
        isDefault: false,
        isProfileLocation: false,
      });
    });

    res.json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /weather/locations
 * Add a new weather location (profile location is always default, these are additional)
 */
router.post('/locations', requireAuth, async (req, res, next) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        error: 'Name and location are required',
      });
    }

    // Validate that the location can be geocoded
    const geocoded = await weatherService.geocodeLocation(location);
    if (!geocoded) {
      return res.status(400).json({
        success: false,
        error: 'Could not find this location. Try a city name like "Toronto, Ontario".',
      });
    }

    const user = await User.findById(req.user._id);

    // Add new location (never default - profile location is always default)
    user.weatherLocations.push({
      name: name.trim(),
      location: location.trim(),
      isDefault: false,
    });

    await user.save();

    // Return the full list including profile location
    const allLocations = [];
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',
        name: 'My Location',
        location: user.profile.location,
        isDefault: true,
        isProfileLocation: true,
      });
    }
    user.weatherLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,
        name: loc.name,
        location: loc.location,
        isDefault: false,
        isProfileLocation: false,
      });
    });

    // Add logging for Wide Events
    const newLocation = user.weatherLocations[user.weatherLocations.length - 1];
    attachEntityId(req, 'locationId', newLocation._id);
    req.eventName = 'weather.location.create.success';

    res.status(201).json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /weather/locations/:id
 * Remove a weather location (cannot remove profile location)
 */
router.delete('/locations/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cannot delete profile location
    if (id === 'profile') {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove your profile location. Update it in Profile Settings instead.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location ID',
      });
    }

    const user = await User.findById(req.user._id);
    const locationIndex = user.weatherLocations.findIndex(
      loc => loc._id.toString() === id
    );

    if (locationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Location not found',
      });
    }

    // Add logging for Wide Events before removing
    attachEntityId(req, 'locationId', id);
    req.eventName = 'weather.location.delete.success';

    user.weatherLocations.splice(locationIndex, 1);
    await user.save();

    // Return the full list including profile location
    const allLocations = [];
    if (user?.profile?.location) {
      allLocations.push({
        _id: 'profile',
        name: 'My Location',
        location: user.profile.location,
        isDefault: true,
        isProfileLocation: true,
      });
    }
    user.weatherLocations.forEach(loc => {
      allLocations.push({
        _id: loc._id,
        name: loc.name,
        location: loc.location,
        isDefault: false,
        isProfileLocation: false,
      });
    });

    res.json({
      success: true,
      data: allLocations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
