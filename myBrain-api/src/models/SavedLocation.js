/**
 * =============================================================================
 * SAVEDLOCATION.JS - User's Saved Locations for Weather
 * =============================================================================
 *
 * This file defines the SavedLocation model - the data structure for storing
 * locations that users want to track weather for in myBrain.
 *
 * WHAT IS A SAVED LOCATION?
 * -------------------------
 * A saved location is a place (like your home, office, or gym) that you
 * save so you can quickly check the weather there. Instead of typing
 * your address every time, you save it once and access it easily.
 *
 * EXAMPLE SCENARIO:
 * -----------------
 * A user might save these locations:
 * 1. Home (123 Main St) - marked as DEFAULT
 * 2. Office (456 Business Ave)
 * 3. Gym (789 Fitness Blvd)
 *
 * When they open the weather feature:
 * - The default location (Home) shows automatically
 * - They can quickly switch to Office or Gym
 * - No need to type addresses repeatedly
 *
 * CATEGORIES:
 * -----------
 * Locations can be organized into categories:
 * - HOME: Your residence(s)
 * - WORK: Office, job sites, etc.
 * - OTHER: Gym, parents' house, vacation spots, etc.
 *
 * DEFAULT LOCATION:
 * -----------------
 * One location can be marked as the "default". This location:
 * - Shows first when opening weather feature
 * - Is displayed on the dashboard widget
 * - Only ONE location can be default per user
 *
 * ORDERING:
 * ---------
 * Users can reorder their locations to customize which ones
 * appear first in the dropdown list.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// SAVED LOCATION SCHEMA DEFINITION
// =============================================================================

/**
 * The Saved Location Schema
 * -------------------------
 * Defines all the fields a SavedLocation document can have.
 */
const savedLocationSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this saved location
   * - Required: Every location belongs to a user
   * - Index: For finding a user's locations quickly
   *
   * Users can only see and use their own saved locations.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // LOCATION DETAILS
  // ===========================================================================

  /**
   * name: Friendly name for this location
   * - Required: Must have a name to identify it
   * - Max 100 characters
   *
   * EXAMPLES:
   * - "Home"
   * - "Downtown Office"
   * - "Mom's House"
   * - "Vacation Cabin"
   */
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  /**
   * address: The full address string
   * - Required: Need address to look up weather
   * - Max 500 characters
   *
   * EXAMPLES:
   * - "123 Main Street, City, State 12345"
   * - "New York, NY"
   * - "Paris, France"
   */
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },

  /**
   * coordinates: GPS coordinates for precise location
   * - Optional: For future map features
   * - Stored as latitude and longitude
   *
   * WHY COORDINATES?
   * Weather APIs often work better with coordinates than addresses.
   * We can geocode the address once and store coordinates for faster lookups.
   */
  coordinates: {
    /**
     * lat: Latitude coordinate
     * - Range: -90 to 90
     * - EXAMPLE: 40.7128 (New York City)
     */
    lat: { type: Number, default: null },

    /**
     * lon: Longitude coordinate
     * - Range: -180 to 180
     * - EXAMPLE: -74.0060 (New York City)
     */
    lon: { type: Number, default: null }
  },

  // ===========================================================================
  // ORGANIZATION
  // ===========================================================================

  /**
   * category: What type of location is this?
   * - Helps organize locations in the UI
   *
   * VALUES:
   * - 'home': Primary residence, house, apartment
   * - 'work': Office, job site, business location
   * - 'other': Everything else (gym, school, relatives, etc.)
   */
  category: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'other'
  },

  /**
   * order: Position in the user's location list
   * - Lower numbers appear first
   * - Used for custom sorting
   *
   * EXAMPLE:
   * Home (order: 0) appears before Office (order: 1)
   */
  order: {
    type: Number,
    default: 0
  },

  /**
   * isDefault: Is this the user's default location?
   * - Only ONE location can be default per user
   * - Default location shows first in weather feature
   * - Displayed on dashboard widget
   */
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the location was saved
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index for User's Locations
 * -----------------------------------
 * Quickly find all locations for a user, sorted by order.
 * Used when displaying the location dropdown.
 */
savedLocationSchema.index({ userId: 1, order: 1 });

/**
 * Unique Default Index
 * --------------------
 * Ensures only ONE location can be default per user.
 *
 * HOW IT WORKS:
 * - partialFilterExpression: Only applies to documents where isDefault = true
 * - unique: true: Can't have duplicates
 * - Result: Each user can have at most one default location
 *
 * WHY PARTIAL?
 * We only care about uniqueness when isDefault is true.
 * Multiple locations with isDefault: false is fine.
 */
savedLocationSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

// =============================================================================
// INSTANCE METHODS (Called on a location document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Removes internal fields like __v (version key).
 *
 * @returns {Object} - Safe JSON representation
 */
savedLocationSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getUserLocations(userId)
 * ------------------------
 * Get all saved locations for a user, sorted properly.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Array of location documents
 *
 * SORTING:
 * 1. First by order (custom user sorting)
 * 2. Then by createdAt (newest first) as tiebreaker
 *
 * EXAMPLE:
 * const locations = await SavedLocation.getUserLocations(userId);
 * // Returns: [Home (order 0), Office (order 1), Gym (order 2)]
 */
savedLocationSchema.statics.getUserLocations = async function(userId) {
  return this.find({ userId }).sort({ order: 1, createdAt: -1 });
};

/**
 * setDefault(userId, locationId)
 * ------------------------------
 * Set a location as the user's default.
 * Automatically removes default from any other location.
 *
 * @param {string} userId - User's ID
 * @param {string} locationId - Location to make default
 * @returns {Object} - Updated location document
 *
 * HOW IT WORKS:
 * 1. Remove isDefault from ALL user's locations
 * 2. Set isDefault: true on the specified location
 * 3. Return the updated location
 *
 * EXAMPLE:
 * // User wants their Office to be default instead of Home
 * await SavedLocation.setDefault(userId, officeId);
 * // Now Office shows first in weather feature
 */
savedLocationSchema.statics.setDefault = async function(userId, locationId) {
  // Step 1: Remove default from all other locations
  await this.updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false } }
  );

  // Step 2: Set new default
  return this.findOneAndUpdate(
    { _id: locationId, userId },
    { $set: { isDefault: true } },
    { new: true } // Return the updated document
  );
};

/**
 * reorder(userId, orderedIds)
 * --------------------------
 * Reorder locations based on a new order of IDs.
 *
 * @param {string} userId - User's ID
 * @param {Array} orderedIds - Array of location IDs in desired order
 * @returns {Array} - Updated locations in new order
 *
 * HOW IT WORKS:
 * The position in the array becomes the new order value.
 * - orderedIds[0] gets order: 0
 * - orderedIds[1] gets order: 1
 * - And so on...
 *
 * EXAMPLE:
 * // User drags Office above Home in the list
 * const newOrder = [officeId, homeId, gymId];
 * await SavedLocation.reorder(userId, newOrder);
 * // Now: Office (0), Home (1), Gym (2)
 */
savedLocationSchema.statics.reorder = async function(userId, orderedIds) {
  // Build bulk update operations
  // Each ID gets its array index as the new order value
  const updates = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId }, // Only update this user's locations
      update: { $set: { order: index } }
    }
  }));

  // Execute all updates in one database operation
  await this.bulkWrite(updates);

  // Return the newly ordered locations
  return this.getUserLocations(userId);
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the SavedLocation model from the schema.
 * This gives us methods to:
 * - Get locations: SavedLocation.getUserLocations(userId)
 * - Set default: SavedLocation.setDefault(userId, locationId)
 * - Reorder: SavedLocation.reorder(userId, orderedIds)
 * - Convert to JSON: location.toSafeJSON()
 *
 * TYPICAL USAGE:
 * 1. User adds a new location (home address)
 * 2. User marks it as default
 * 3. When they open weather, default location loads first
 * 4. They can add more locations (office, gym)
 * 5. They can reorder locations by dragging in the UI
 * 6. They can switch default to a different location
 */
const SavedLocation = mongoose.model('SavedLocation', savedLocationSchema);

export default SavedLocation;
