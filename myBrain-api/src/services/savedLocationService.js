import SavedLocation from '../models/SavedLocation.js';

/**
 * Get all saved locations for a user
 */
export async function getLocations(userId) {
  const locations = await SavedLocation.getUserLocations(userId);
  return locations.map(loc => loc.toSafeJSON());
}

/**
 * Get a single saved location
 */
export async function getLocation(userId, locationId) {
  const location = await SavedLocation.findOne({ _id: locationId, userId });
  return location ? location.toSafeJSON() : null;
}

/**
 * Create a new saved location
 */
export async function createLocation(userId, data) {
  // Get the highest order number
  const lastLocation = await SavedLocation.findOne({ userId })
    .sort({ order: -1 })
    .select('order');

  const order = lastLocation ? lastLocation.order + 1 : 0;

  const location = new SavedLocation({
    userId,
    name: data.name,
    address: data.address,
    coordinates: data.coordinates || { lat: null, lon: null },
    category: data.category || 'other',
    order,
    isDefault: data.isDefault || false
  });

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await SavedLocation.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  await location.save();
  return location.toSafeJSON();
}

/**
 * Update a saved location
 */
export async function updateLocation(userId, locationId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.userId;
  delete updates.createdAt;

  // If setting as default, unset other defaults first
  if (updates.isDefault) {
    await SavedLocation.updateMany(
      { userId, isDefault: true, _id: { $ne: locationId } },
      { $set: { isDefault: false } }
    );
  }

  const location = await SavedLocation.findOneAndUpdate(
    { _id: locationId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  return location ? location.toSafeJSON() : null;
}

/**
 * Delete a saved location
 */
export async function deleteLocation(userId, locationId) {
  const result = await SavedLocation.findOneAndDelete({ _id: locationId, userId });
  return result ? result.toSafeJSON() : null;
}

/**
 * Set a location as default
 */
export async function setDefaultLocation(userId, locationId) {
  const location = await SavedLocation.setDefault(userId, locationId);
  return location ? location.toSafeJSON() : null;
}

/**
 * Reorder saved locations
 */
export async function reorderLocations(userId, orderedIds) {
  const locations = await SavedLocation.reorder(userId, orderedIds);
  return locations.map(loc => loc.toSafeJSON());
}

export default {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  setDefaultLocation,
  reorderLocations
};
