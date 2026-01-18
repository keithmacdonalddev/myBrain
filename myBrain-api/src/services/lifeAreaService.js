import LifeArea from '../models/LifeArea.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import Event from '../models/Event.js';
import Project from '../models/Project.js';

/**
 * LifeArea Service
 * Business logic for life area operations
 */

/**
 * Create a new life area
 */
export async function createLifeArea(userId, data) {
  // Get max order for new area
  const maxOrder = await LifeArea.findOne({ userId })
    .sort({ order: -1 })
    .select('order');

  const lifeArea = new LifeArea({
    userId,
    name: data.name,
    description: data.description || '',
    color: data.color || '#6366f1',
    icon: data.icon || 'Folder',
    order: maxOrder ? maxOrder.order + 1 : 0,
    isDefault: false,
    isArchived: false
  });

  await lifeArea.save();
  return lifeArea;
}

/**
 * Get all life areas for a user
 */
export async function getLifeAreas(userId, includeArchived = false) {
  return LifeArea.getByUser(userId, includeArchived);
}

/**
 * Get a single life area by ID with item counts
 */
export async function getLifeAreaById(userId, lifeAreaId, includeCounts = false) {
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  if (includeCounts) {
    const counts = await LifeArea.getItemCounts(lifeAreaId);
    return { ...lifeArea.toSafeJSON(), counts };
  }

  return lifeArea;
}

/**
 * Update a life area
 */
export async function updateLifeArea(userId, lifeAreaId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;
  delete updates.userId;
  delete updates.createdAt;
  delete updates.isDefault; // Use setDefault instead

  const lifeArea = await LifeArea.findOneAndUpdate(
    { _id: lifeAreaId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  return lifeArea;
}

/**
 * Delete a life area
 * Reassigns items to the default area
 */
export async function deleteLifeArea(userId, lifeAreaId) {
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  // Cannot delete default area
  if (lifeArea.isDefault) {
    throw new Error('Cannot delete the default life area');
  }

  // Get or create default area
  const defaultArea = await LifeArea.getOrCreateDefault(userId);

  // Reassign all items to default area
  await Promise.all([
    Note.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    Task.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    Event.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    Project.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    )
  ]);

  // Delete the life area
  await LifeArea.findByIdAndDelete(lifeAreaId);

  return { deleted: lifeArea, reassignedTo: defaultArea };
}

/**
 * Set a life area as the default
 */
export async function setDefault(userId, lifeAreaId) {
  return LifeArea.setDefault(userId, lifeAreaId);
}

/**
 * Reorder life areas
 */
export async function reorderLifeAreas(userId, orderedIds) {
  return LifeArea.reorder(userId, orderedIds);
}

/**
 * Archive or unarchive a life area
 */
export async function archiveLifeArea(userId, lifeAreaId, isArchived) {
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  // Cannot archive default area
  if (lifeArea.isDefault && isArchived) {
    throw new Error('Cannot archive the default life area');
  }

  lifeArea.isArchived = isArchived;
  await lifeArea.save();

  return lifeArea;
}

/**
 * Get all items in a life area
 */
export async function getLifeAreaItems(userId, lifeAreaId, options = {}) {
  const { types = ['note', 'task', 'event', 'project'], limit = 50, skip = 0 } = options;

  const results = {};

  if (types.includes('note')) {
    results.notes = await Note.find({ userId, lifeAreaId, status: { $ne: 'trashed' } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('task')) {
    results.tasks = await Task.find({ userId, lifeAreaId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('event')) {
    results.events = await Event.find({ userId, lifeAreaId, status: { $ne: 'cancelled' } })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('project')) {
    results.projects = await Project.find({ userId, lifeAreaId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  return results;
}

/**
 * Ensure user has a default life area
 */
export async function ensureDefaultLifeArea(userId) {
  return LifeArea.getOrCreateDefault(userId);
}

export default {
  createLifeArea,
  getLifeAreas,
  getLifeAreaById,
  updateLifeArea,
  deleteLifeArea,
  setDefault,
  reorderLifeAreas,
  archiveLifeArea,
  getLifeAreaItems,
  ensureDefaultLifeArea
};
