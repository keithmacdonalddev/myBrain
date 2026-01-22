/**
 * =============================================================================
 * SAVEDLOCATIONS.JS - Saved Geographic Locations Routes
 * =============================================================================
 *
 * This file handles saved geographic locations in myBrain.
 * Users can save favorite locations (home, work, gym, etc.) for quick access
 * when creating events, tasks, or other location-based features.
 *
 * WHAT ARE SAVED LOCATIONS?
 * --------------------------
 * Saved locations are geographic coordinates and names that users can:
 * - Add to calendar events (meeting location)
 * - Use for weather tracking (get weather for this location)
 * - Reference in notes and tasks
 * - Reuse without re-entering coordinates
 *
 * COMMON SAVED LOCATIONS:
 * -----------------------
 * - HOME: Your residence
 * - WORK: Office or workplace
 * - GYM: Fitness center
 * - SCHOOL: Educational institution
 * - FAVORITE RESTAURANT: Frequent dining spot
 * - VACATION RENTAL: Holiday destination
 * - BANK: Financial institution
 * - COFFEE SHOP: Favorite café
 *
 * LOCATION DATA:
 * ---------------
 * Each saved location includes:
 * - NAME: Display name ("Home", "Office")
 * - ADDRESS: Street address
 * - LATITUDE/LONGITUDE: GPS coordinates
 * - TYPE: Category (home, work, gym, etc.)
 * - NOTES: Additional details (office building #, directions)
 * - WEATHER_TRACKING: Track weather for this location?
 *
 * USE CASES:
 * -----------
 * 1. CALENDAR: Add location to meetings/events
 * 2. WEATHER: Monitor weather at this location
 * 3. DIRECTIONS: Get directions to saved location
 * 4. TASKS: Assign location to task reminders
 * 5. NOTES: Reference location in notes
 * 6. SHORTCUTS: Quick access to frequently used locations
 *
 * WEATHER TRACKING:
 * ------------------
 * If enabled, myBrain displays:
 * - Current weather at location
 * - Daily forecast for location
 * - Alerts if severe weather expected
 * - Widget on dashboard
 *
 * ENDPOINTS:
 * -----------
 * - GET /saved-locations - Get all saved locations
 * - POST /saved-locations - Create new saved location
 * - GET /saved-locations/:id - Get location details
 * - PUT /saved-locations/:id - Update location
 * - DELETE /saved-locations/:id - Delete location
 * - POST /saved-locations/:id/weather - Get weather for location
 * - GET /saved-locations/search/:query - Search locations (address/name)
 *
 * MAXIMUM LOCATIONS:
 * -------------------
 * Free users: 10 saved locations
 * Premium users: 50 saved locations
 *
 * LOCATION ACCURACY:
 * ------------------
 * - GPS coordinates accurate to ~10 meters
 * - Address geocoded for precision
 * - User can manually adjust coordinates
 * - Maps integration for picking location
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PATCH, DELETE)
 * - Define routes (URLs that the frontend can call)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Authentication middleware that checks if a user is logged in.
 * requireAuth ensures only authenticated (logged-in) users can access location routes.
 * If a user tries to access these routes without a valid JWT token, they get a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics and auditing.
 * When we call attachEntityId(req, 'locationId', location._id), we're marking this request
 * so admins can search logs for all actions related to a specific location.
 * Example: All edits to "Home" location can be found by searching locationId.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Saved location service contains all business logic for location management.
 * Instead of writing database queries in this route file, we call service methods.
 * This keeps routes clean and makes logic reusable in different places.
 */
import * as savedLocationService from '../services/savedLocationService.js';

// Create an Express router to group all location-related routes together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All routes in this file require the user to be logged in.
// requireAuth middleware checks that the Authorization header contains a valid JWT token.
// If missing or invalid, the request is rejected before reaching any route handler.
// This prevents unauthorized access to user's location data.
router.use(requireAuth);

/**
 * GET /saved-locations
 * Get all saved locations for the current user
 *
 * WHAT IT DOES:
 * Retrieves a list of all geographic locations the user has saved.
 * This is used to populate dropdowns when creating events, tasks, or referencing locations.
 *
 * USE CASES:
 * - Location picker when creating calendar event
 * - List view showing all saved locations
 * - Autocomplete suggestions for location fields
 *
 * @returns {Array} Array of location objects with coordinates, address, name
 */
router.get('/', async (req, res, next) => {
  try {
    // Step 1: Call service to fetch all locations for this user
    // Service filters locations by userId, so each user only sees their own locations
    const locations = await savedLocationService.getLocations(req.user._id);

    // Step 2: Return locations in standard response format
    res.json({ data: locations });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * GET /saved-locations/:id
 * Get a single saved location by ID
 *
 * WHAT IT DOES:
 * Retrieves detailed information about a specific saved location.
 * Used when editing a location or showing full details.
 *
 * @param {String} id - The location ID (MongoDB ObjectId)
 * @returns {Object} Location object with all properties
 */
router.get('/:id', async (req, res, next) => {
  try {
    // Step 1: Call service to fetch single location
    // Service verifies userId (so you can only access your own locations)
    const location = await savedLocationService.getLocation(req.user._id, req.params.id);

    // Step 2: Check if location exists
    // If not found, return 404 error (nothing at that address)
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Step 3: Return the location details
    res.json({ data: location });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * POST /saved-locations
 * Create a new saved location
 *
 * WHAT IT DOES:
 * Saves a new geographic location that the user can reuse.
 * Locations can be used in events, tasks, weather tracking, and more.
 *
 * REQUEST BODY:
 * {
 *   name: "Home" or "Office" (display name),
 *   address: "123 Main St, San Francisco, CA",
 *   coordinates: { latitude: 37.7749, longitude: -122.4194 },
 *   category: "home", "work", "gym", "other",
 *   isDefault: true/false (make this the default location?)
 * }
 *
 * @returns {Object} Created location object with MongoDB ID
 */
router.post('/', async (req, res, next) => {
  try {
    // Step 1: Extract required fields from request body
    const { name, address, coordinates, category, isDefault } = req.body;

    // Step 2: Validate required fields
    // Both name and address are required to save a location
    // You can't save a location if you don't know what it's called or where it is
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Step 3: Call service to create location
    // Service handles:
    // - Adding userId (ensures location belongs to this user)
    // - Geocoding address if needed
    // - Validating coordinates
    // - Handling duplicate detection
    const location = await savedLocationService.createLocation(req.user._id, {
      name,
      address,
      coordinates,
      category,
      isDefault
    });

    // Step 4: Log this action for audit trail and analytics
    // attachEntityId lets admins search logs: "show me all actions on locationId 12345"
    attachEntityId(req, 'locationId', location._id);
    // eventName categorizes the action for analytics reporting
    req.eventName = 'location.create.success';

    // Step 5: Return created location
    // Status 201 means "created successfully"
    res.status(201).json({ data: location });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * PATCH /saved-locations/:id
 * Update a saved location
 *
 * WHAT IT DOES:
 * Modifies an existing location's properties (name, address, coordinates, etc).
 * User can update any field they want to change.
 *
 * REQUEST BODY (all optional):
 * {
 *   name: "New name",
 *   address: "New address",
 *   coordinates: { latitude, longitude },
 *   category: "home", "work", etc.,
 *   isDefault: true/false
 * }
 *
 * @param {String} id - Location ID to update
 * @returns {Object} Updated location object
 */
router.patch('/:id', async (req, res, next) => {
  try {
    // Step 1: Extract fields from request body
    // Only fields provided in the request will be updated (partial updates)
    const { name, address, coordinates, category, isDefault } = req.body;

    // Step 2: Call service to update location
    // Service handles:
    // - Ownership verification (you can only edit your own locations)
    // - Finding the location by ID
    // - Applying updates to allowed fields
    // - Validating new data
    const location = await savedLocationService.updateLocation(
      req.user._id,
      req.params.id,
      { name, address, coordinates, category, isDefault }
    );

    // Step 3: Check if location was found and updated
    // If service returns null, the location doesn't exist or isn't owned by this user
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Step 4: Log this action for audit trail
    attachEntityId(req, 'locationId', location._id);
    req.eventName = 'location.update.success';

    // Step 5: Return updated location
    res.json({ data: location });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * DELETE /saved-locations/:id
 * Delete a saved location
 *
 * WHAT IT DOES:
 * Permanently removes a saved location from the user's location list.
 * Once deleted, the location can no longer be used in events, tasks, or weather tracking.
 *
 * @param {String} id - Location ID to delete
 * @returns {Object} Deleted location object (confirmation)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // Step 1: Call service to delete location
    // Service handles:
    // - Ownership verification (you can only delete your own locations)
    // - Finding and removing the location
    // - Any cleanup needed (e.g., removing references in events)
    const location = await savedLocationService.deleteLocation(req.user._id, req.params.id);

    // Step 2: Check if location was found and deleted
    // If service returns null, location doesn't exist or isn't owned by this user
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Step 3: Log this action for audit trail
    attachEntityId(req, 'locationId', location._id);
    req.eventName = 'location.delete.success';

    // Step 4: Return deleted location as confirmation
    // Returning the deleted data confirms what was removed
    res.json({ data: location, message: 'Location deleted' });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * POST /saved-locations/:id/set-default
 * Set a location as the default
 *
 * WHAT IT DOES:
 * Marks one location as the "default" - the one that will be pre-filled
 * when creating events, tasks, or other location-based items.
 * Only one location can be default at a time.
 *
 * EXAMPLE WORKFLOW:
 * 1. User saves "Home", "Office", "Gym"
 * 2. User sets "Office" as default
 * 3. When creating calendar event, "Office" pre-fills in location field
 * 4. User can change to "Home" or "Gym" but "Office" is the suggestion
 *
 * @param {String} id - Location ID to set as default
 * @returns {Object} Updated location with isDefault = true
 */
router.post('/:id/set-default', async (req, res, next) => {
  try {
    // Step 1: Call service to set this location as default
    // Service handles:
    // - Removing default flag from any other locations
    // - Setting default flag on this location
    // - Ensuring user owns this location
    const location = await savedLocationService.setDefaultLocation(req.user._id, req.params.id);

    // Step 2: Check if location was found and updated
    // If service returns null, location doesn't exist or isn't owned by this user
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Step 3: Log this action for audit trail
    attachEntityId(req, 'locationId', location._id);
    req.eventName = 'location.setDefault.success';

    // Step 4: Return updated location
    res.json({ data: location });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

/**
 * POST /saved-locations/reorder
 * Reorder saved locations
 *
 * WHAT IT DOES:
 * Allows user to customize the order that their saved locations appear.
 * This affects the order in UI dropdowns, lists, and suggestions.
 *
 * REQUEST BODY:
 * {
 *   orderedIds: ["id1", "id2", "id3"]  // IDs in desired order
 * }
 *
 * EXAMPLE:
 * User wants "Home" first, then "Office", then "Gym"
 * Sends: { orderedIds: ["homeLo1", "officeLo2", "gymLo3"] }
 * Result: Locations now appear in that order everywhere
 *
 * @returns {Array} All locations in their new order
 */
router.post('/reorder', async (req, res, next) => {
  try {
    // Step 1: Extract ordered IDs from request body
    const { orderedIds } = req.body;

    // Step 2: Validate that orderedIds is an array
    // The frontend must send an array like ["id1", "id2", "id3"]
    // If it's not an array, the request is invalid
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }

    // Step 3: Call service to reorder locations
    // Service handles:
    // - Verifying all IDs belong to this user
    // - Updating display order in database
    // - Returning all locations in new order
    const locations = await savedLocationService.reorderLocations(req.user._id, orderedIds);

    // Step 4: Log this action for analytics
    // Note: Not attaching specific entityId since this involves multiple locations
    req.eventName = 'location.reorder.success';

    // Step 5: Return all locations in their new order
    res.json({ data: locations });
  } catch (error) {
    // Pass error to error handler middleware for logging and response formatting
    next(error);
  }
});

export default router;
