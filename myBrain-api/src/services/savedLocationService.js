/**
 * =============================================================================
 * SAVEDLOCATIONSERVICE.JS - Weather Locations Management Service
 * =============================================================================
 *
 * This service handles all business logic for managing saved locations
 * that users use with the weather feature in myBrain.
 *
 * WHAT ARE SAVED LOCATIONS?
 * -------------------------
 * Saved locations are places that users save for quick weather lookups.
 * Instead of typing "New York" every time, users can save it and get
 * weather for that location with one click.
 *
 * LOCATION FEATURES:
 * ------------------
 * 1. MULTIPLE LOCATIONS: Users can save many locations
 * 2. DEFAULT LOCATION: One location can be set as default
 * 3. CATEGORIES: Organize locations (home, work, travel, other)
 * 4. ORDERING: Custom order for the location list
 * 5. COORDINATES: Store lat/lon for accurate weather data
 *
 * CATEGORY TYPES:
 * ---------------
 * - home: User's home location
 * - work: User's workplace
 * - travel: Places frequently traveled to
 * - other: Any other saved location
 *
 * DEFAULT LOCATION:
 * -----------------
 * One location can be marked as default. When the weather widget loads,
 * it automatically shows weather for the default location. Only one
 * location can be default at a time.
 *
 * ORDERING:
 * ---------
 * Locations have an 'order' field that determines their display order.
 * Users can reorder their locations by changing these values.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * SavedLocation model - The MongoDB schema for saved locations.
 */
import SavedLocation from '../models/SavedLocation.js';

// =============================================================================
// GET ALL LOCATIONS
// =============================================================================

/**
 * getLocations(userId)
 * --------------------
 * Gets all saved locations for a user.
 *
 * @param {ObjectId} userId - The user whose locations to retrieve
 *
 * @returns {Array} Array of location objects (sanitized for API response)
 *
 * SORTED BY:
 * The model's getUserLocations() method returns locations sorted by
 * their 'order' field.
 *
 * EXAMPLE:
 * ```javascript
 * const locations = await getLocations(userId);
 * // [
 * //   { name: 'Home', address: '123 Main St', isDefault: true },
 * //   { name: 'Work', address: '456 Office Blvd', isDefault: false },
 * // ]
 * ```
 */
export async function getLocations(userId) {
  // Get locations using the model's static method (sorted by order)
  const locations = await SavedLocation.getUserLocations(userId);

  // Convert each location to safe JSON (removes sensitive data)
  return locations.map(loc => loc.toSafeJSON());
}

// =============================================================================
// GET SINGLE LOCATION
// =============================================================================

/**
 * getLocation(userId, locationId)
 * -------------------------------
 * Gets a single saved location by its ID.
 *
 * @param {ObjectId} userId - The user who owns the location
 * @param {ObjectId} locationId - The location's unique ID
 *
 * @returns {Object|null} The location object, or null if not found
 *
 * SECURITY:
 * Requires both locationId AND userId to match. Users can only
 * access their own saved locations.
 */
export async function getLocation(userId, locationId) {
  // Find location by ID and verify ownership
  const location = await SavedLocation.findOne({ _id: locationId, userId });

  // Return sanitized object or null
  return location ? location.toSafeJSON() : null;
}

// =============================================================================
// CREATE LOCATION
// =============================================================================

/**
 * createLocation(userId, data)
 * ----------------------------
 * Creates a new saved location for a user.
 *
 * @param {ObjectId} userId - The user creating the location
 * @param {Object} data - Location data
 *   - data.name: Display name (e.g., "Home", "Office")
 *   - data.address: Full address string
 *   - data.coordinates: { lat, lon } for weather API
 *   - data.category: 'home', 'work', 'travel', or 'other'
 *   - data.isDefault: Set as default location?
 *
 * @returns {Object} The created location object
 *
 * ORDER CALCULATION:
 * New locations are added at the end of the list. The order is
 * calculated by finding the highest existing order and adding 1.
 *
 * DEFAULT HANDLING:
 * If isDefault is true, all other locations are unmarked as default
 * before setting this one. Only one default is allowed.
 *
 * EXAMPLE:
 * ```javascript
 * const location = await createLocation(userId, {
 *   name: 'Beach House',
 *   address: '789 Ocean Drive, Miami, FL',
 *   coordinates: { lat: 25.7617, lon: -80.1918 },
 *   category: 'travel',
 *   isDefault: false
 * });
 * ```
 */
export async function createLocation(userId, data) {
  // =========================================================================
  // CALCULATE ORDER
  // =========================================================================
  // Find the location with the highest order value

  const lastLocation = await SavedLocation.findOne({ userId })
    .sort({ order: -1 })  // Sort descending by order
    .select('order');      // Only need the order field

  // New location goes at the end (highest order + 1, or 0 if first)
  const order = lastLocation ? lastLocation.order + 1 : 0;

  // =========================================================================
  // CREATE LOCATION DOCUMENT
  // =========================================================================

  const location = new SavedLocation({
    userId,
    name: data.name,
    address: data.address,
    coordinates: data.coordinates || { lat: null, lon: null },
    category: data.category || 'other',
    order,
    isDefault: data.isDefault || false
  });

  // =========================================================================
  // HANDLE DEFAULT FLAG
  // =========================================================================
  // If this location is being set as default, unset all others

  if (data.isDefault) {
    await SavedLocation.updateMany(
      { userId, isDefault: true },          // Find all current defaults
      { $set: { isDefault: false } }        // Unset them
    );
  }

  // Save and return the new location
  await location.save();
  return location.toSafeJSON();
}

// =============================================================================
// UPDATE LOCATION
// =============================================================================

/**
 * updateLocation(userId, locationId, updates)
 * -------------------------------------------
 * Updates a saved location with new data.
 *
 * @param {ObjectId} userId - The user who owns the location
 * @param {ObjectId} locationId - The location to update
 * @param {Object} updates - Fields to update
 *   - Can include: name, address, coordinates, category, isDefault
 *   - Cannot include: _id, userId, createdAt
 *
 * @returns {Object|null} The updated location object, or null
 *
 * PROTECTED FIELDS:
 * Certain fields are removed from updates to prevent:
 * - Changing ownership (userId)
 * - Changing immutable fields (_id, createdAt)
 *
 * DEFAULT HANDLING:
 * If isDefault is being set to true, all other locations are
 * unmarked as default first.
 */
export async function updateLocation(userId, locationId, updates) {
  // =========================================================================
  // REMOVE PROTECTED FIELDS
  // =========================================================================

  delete updates._id;         // Can't change document ID
  delete updates.userId;      // Can't change ownership
  delete updates.createdAt;   // Can't change creation time

  // =========================================================================
  // HANDLE DEFAULT FLAG
  // =========================================================================
  // If setting as default, unset all other defaults first

  if (updates.isDefault) {
    await SavedLocation.updateMany(
      { userId, isDefault: true, _id: { $ne: locationId } },  // Exclude this location
      { $set: { isDefault: false } }
    );
  }

  // =========================================================================
  // UPDATE AND RETURN
  // =========================================================================

  const location = await SavedLocation.findOneAndUpdate(
    { _id: locationId, userId },           // Query: verify ownership
    { $set: updates },                      // Update: apply changes
    { new: true, runValidators: true }     // Options: return updated, validate
  );

  return location ? location.toSafeJSON() : null;
}

// =============================================================================
// DELETE LOCATION
// =============================================================================

/**
 * deleteLocation(userId, locationId)
 * ----------------------------------
 * Deletes a saved location permanently.
 *
 * @param {ObjectId} userId - The user who owns the location
 * @param {ObjectId} locationId - The location to delete
 *
 * @returns {Object|null} The deleted location object, or null
 *
 * NOTE:
 * If the deleted location was the default, no automatic reassignment
 * happens. The user should manually set a new default.
 */
export async function deleteLocation(userId, locationId) {
  // Find and delete the location
  const result = await SavedLocation.findOneAndDelete({ _id: locationId, userId });

  return result ? result.toSafeJSON() : null;
}

// =============================================================================
// SET DEFAULT LOCATION
// =============================================================================

/**
 * setDefaultLocation(userId, locationId)
 * --------------------------------------
 * Sets a specific location as the default.
 *
 * @param {ObjectId} userId - The user who owns the locations
 * @param {ObjectId} locationId - The location to make default
 *
 * @returns {Object|null} The updated location object, or null
 *
 * HOW IT WORKS:
 * Uses the model's static setDefault() method which:
 * 1. Unsets all current defaults for this user
 * 2. Sets the specified location as default
 *
 * ONLY ONE DEFAULT:
 * Only one location can be default at a time. Setting a new default
 * automatically unsets the previous one.
 *
 * EXAMPLE:
 * ```javascript
 * // User wants to change their default location to their office
 * const location = await setDefaultLocation(userId, officeLocationId);
 * // Now office shows up automatically in weather widget
 * ```
 */
export async function setDefaultLocation(userId, locationId) {
  // Use the model's static method to handle the default switch
  const location = await SavedLocation.setDefault(userId, locationId);

  return location ? location.toSafeJSON() : null;
}

// =============================================================================
// REORDER LOCATIONS
// =============================================================================

/**
 * reorderLocations(userId, orderedIds)
 * ------------------------------------
 * Reorders the user's saved locations.
 *
 * @param {ObjectId} userId - The user who owns the locations
 * @param {Array} orderedIds - Array of location IDs in desired order
 *   - First ID gets order 0
 *   - Second ID gets order 1
 *   - etc.
 *
 * @returns {Array} Array of updated location objects
 *
 * HOW IT WORKS:
 * The orderedIds array represents the desired order. Each location
 * ID in the array gets its order field set to its array index.
 *
 * EXAMPLE:
 * ```javascript
 * // Current order: Home (0), Work (1), Gym (2)
 * // User drags Gym to the top
 * await reorderLocations(userId, [gymId, homeId, workId]);
 * // New order: Gym (0), Home (1), Work (2)
 * ```
 *
 * USES:
 * Drag-and-drop reordering in the UI. When user drags a location
 * to a new position, the frontend sends the complete new order.
 */
export async function reorderLocations(userId, orderedIds) {
  // Use the model's static method to perform the reorder
  const locations = await SavedLocation.reorder(userId, orderedIds);

  // Return sanitized locations
  return locations.map(loc => loc.toSafeJSON());
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all saved location service functions.
 *
 * USAGE:
 * ```javascript
 * import savedLocationService from './services/savedLocationService.js';
 * const locations = await savedLocationService.getLocations(userId);
 *
 * // Or with named imports:
 * import { getLocations, createLocation } from './services/savedLocationService.js';
 * ```
 */
export default {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  setDefaultLocation,
  reorderLocations
};
