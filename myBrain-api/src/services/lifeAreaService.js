/**
 * =============================================================================
 * LIFEAREASERVICE.JS - Life Area (Category) Management Service
 * =============================================================================
 *
 * This service handles all business logic for life areas (categories)
 * in myBrain. Life areas are the top-level organizational structure
 * for notes, tasks, events, and projects.
 *
 * WHAT ARE LIFE AREAS?
 * --------------------
 * Life areas (also called categories) represent ongoing areas of
 * responsibility in a person's life. Unlike projects (which have an end),
 * life areas are continuous.
 *
 * EXAMPLES:
 * - Work & Career
 * - Health & Fitness
 * - Family & Relationships
 * - Finance
 * - Personal Growth
 * - Home & Living
 *
 * WHY USE LIFE AREAS?
 * -------------------
 * 1. ORGANIZATION: Group related items together
 * 2. BALANCE: See if you're neglecting any area
 * 3. FOCUS: Filter by area to reduce cognitive load
 * 4. REPORTING: Track activity per area
 *
 * LIFE AREA FEATURES:
 * -------------------
 * 1. CUSTOM COLORS: Each area has a distinct color
 * 2. ICONS: Visual identifier from Lucide icon library
 * 3. DEFAULT: One area is marked as default for new items
 * 4. ORDERING: Custom display order
 * 5. ARCHIVING: Hide without deleting
 *
 * ITEM REASSIGNMENT:
 * ------------------
 * When a life area is deleted, all items (notes, tasks, events, projects)
 * that were in that area are moved to the default area. This prevents
 * orphaned items.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * LifeArea model - The MongoDB schema for life areas/categories.
 * We use this to create, retrieve, update, and delete life area documents.
 * LifeArea contains: name, description, color, icon, order, isDefault, isArchived.
 */
import LifeArea from '../models/LifeArea.js';

/**
 * Note model - Notes can be tagged with a life area.
 * We need this when a life area is deleted so we can reassign its notes
 * to the default area. This prevents orphaned notes.
 */
import Note from '../models/Note.js';

/**
 * Task model - Tasks can be tagged with a life area.
 * When deleting a life area, we reassign all tasks in that area
 * to the default life area to maintain data integrity.
 */
import Task from '../models/Task.js';

/**
 * Event model - Calendar events can be organized by life area.
 * When a life area is deleted, all events in that area are moved
 * to the default area to preserve the calendar data.
 */
import Event from '../models/Event.js';

/**
 * Project model - Projects can be tied to specific life areas.
 * When deleting a life area, all projects are reassigned to the default
 * area so project work isn't lost when reorganizing life areas.
 */
import Project from '../models/Project.js';

// =============================================================================
// CREATE LIFE AREA
// =============================================================================

/**
 * createLifeArea(userId, data)
 * ----------------------------
 * Creates a new life area (category) for a user.
 *
 * @param {ObjectId} userId - The user creating the area
 * @param {Object} data - Life area data
 *   - data.name: Area name (required)
 *   - data.description: Area description (optional)
 *   - data.color: Hex color code (optional, default: '#6366f1')
 *   - data.icon: Lucide icon name (optional, default: 'Folder')
 *
 * @returns {Object} The created LifeArea document
 *
 * ORDER CALCULATION:
 * New areas are added at the end of the list. Order is calculated
 * by finding the highest existing order and adding 1.
 *
 * NEW AREAS ARE NOT DEFAULT:
 * Newly created areas are never marked as default. Use setDefault()
 * to change the default area.
 *
 * EXAMPLE:
 * ```javascript
 * const area = await createLifeArea(userId, {
 *   name: 'Side Projects',
 *   description: 'Personal coding projects and experiments',
 *   color: '#8b5cf6',
 *   icon: 'Code'
 * });
 * ```
 */
export async function createLifeArea(userId, data) {
  // Find the highest order value to put new area at the end
  const maxOrder = await LifeArea.findOne({ userId })
    .sort({ order: -1 })  // Sort descending by order
    .select('order');      // Only need the order field

  // Create the life area document
  const lifeArea = new LifeArea({
    userId,
    name: data.name,
    description: data.description || '',
    color: data.color || '#6366f1',    // Default: indigo
    icon: data.icon || 'Folder',        // Default icon
    order: maxOrder ? maxOrder.order + 1 : 0,  // End of list or first
    isDefault: false,                   // Never default when created
    isArchived: false                   // Start active
  });

  await lifeArea.save();
  return lifeArea;
}

// =============================================================================
// GET LIFE AREAS
// =============================================================================

/**
 * getLifeAreas(userId, includeArchived)
 * -------------------------------------
 * Gets all life areas for a user.
 *
 * @param {ObjectId} userId - The user whose areas to retrieve
 * @param {boolean} includeArchived - Include archived areas? (default: false)
 *
 * @returns {Array} Array of LifeArea documents sorted by order
 *
 * SORTED BY ORDER:
 * Areas are returned in the user's custom order, with the default
 * area typically first.
 *
 * EXAMPLE:
 * ```javascript
 * // Get active areas only
 * const areas = await getLifeAreas(userId);
 *
 * // Get all areas including archived
 * const allAreas = await getLifeAreas(userId, true);
 * ```
 */
export async function getLifeAreas(userId, includeArchived = false) {
  // Delegate to the model's static method
  return LifeArea.getByUser(userId, includeArchived);
}

// =============================================================================
// GET SINGLE LIFE AREA
// =============================================================================

/**
 * getLifeAreaById(userId, lifeAreaId, includeCounts)
 * --------------------------------------------------
 * Gets a single life area by its ID.
 *
 * @param {ObjectId} userId - The user who owns the area
 * @param {ObjectId} lifeAreaId - The area's unique ID
 * @param {boolean} includeCounts - Include item counts? (default: false)
 *
 * @returns {Object|null} The LifeArea document (optionally with counts)
 *
 * ITEM COUNTS:
 * When includeCounts is true, the returned object includes counts
 * of how many items are in this area:
 * ```javascript
 * {
 *   _id: '...',
 *   name: 'Work',
 *   // ... other fields
 *   counts: {
 *     notes: 45,
 *     tasks: 12,
 *     events: 8,
 *     projects: 3
 *   }
 * }
 * ```
 */
export async function getLifeAreaById(userId, lifeAreaId, includeCounts = false) {
  // Find the area by ID and verify ownership
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  // Optionally include item counts
  if (includeCounts) {
    const counts = await LifeArea.getItemCounts(lifeAreaId);
    return { ...lifeArea.toSafeJSON(), counts };
  }

  return lifeArea;
}

// =============================================================================
// UPDATE LIFE AREA
// =============================================================================

/**
 * updateLifeArea(userId, lifeAreaId, updates)
 * -------------------------------------------
 * Updates a life area with new data.
 *
 * @param {ObjectId} userId - The user who owns the area
 * @param {ObjectId} lifeAreaId - The area to update
 * @param {Object} updates - Fields to update
 *   - Can include: name, description, color, icon, order
 *   - Cannot include: _id, userId, createdAt, isDefault
 *
 * @returns {Object|null} The updated LifeArea document, or null
 *
 * PROTECTED FIELDS:
 * - _id: Can't change document ID
 * - userId: Can't change ownership
 * - createdAt: Can't change creation time
 * - isDefault: Use setDefault() instead
 *
 * WHY PROTECT isDefault?
 * ----------------------
 * Setting default requires special logic to unset the previous default.
 * Use the setDefault() function which handles this properly.
 *
 * EXAMPLE:
 * ```javascript
 * const area = await updateLifeArea(userId, areaId, {
 *   name: 'Work & Business',
 *   color: '#3b82f6'
 * });
 * ```
 */
export async function updateLifeArea(userId, lifeAreaId, updates) {
  // Remove fields that shouldn't be updated directly
  delete updates._id;         // Can't change document ID
  delete updates.userId;      // Can't change ownership
  delete updates.createdAt;   // Can't change creation time
  delete updates.isDefault;   // Use setDefault() instead

  // Update and return the area
  const lifeArea = await LifeArea.findOneAndUpdate(
    { _id: lifeAreaId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  return lifeArea;
}

// =============================================================================
// DELETE LIFE AREA
// =============================================================================

/**
 * deleteLifeArea(userId, lifeAreaId)
 * ----------------------------------
 * Deletes a life area and reassigns its items.
 *
 * @param {ObjectId} userId - The user who owns the area
 * @param {ObjectId} lifeAreaId - The area to delete
 *
 * @returns {Object|null} { deleted, reassignedTo } or null if not found
 *
 * @throws {Error} "Cannot delete the default category" if trying to
 *                 delete the default area
 *
 * CANNOT DELETE DEFAULT:
 * The default area cannot be deleted because:
 * - New items need a place to go
 * - Deleted items from other areas need somewhere to land
 *
 * To delete the current default:
 * 1. First, make another area the default
 * 2. Then delete the original area
 *
 * REASSIGNMENT:
 * All items (notes, tasks, events, projects) in the deleted area
 * are automatically moved to the default area.
 *
 * EXAMPLE:
 * ```javascript
 * const result = await deleteLifeArea(userId, oldAreaId);
 * // result = {
 * //   deleted: { name: 'Old Area', ... },
 * //   reassignedTo: { name: 'Work', isDefault: true, ... }
 * // }
 * ```
 */
export async function deleteLifeArea(userId, lifeAreaId) {
  // Find the area to delete
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  // =========================================================================
  // PREVENT DEFAULT DELETION
  // =========================================================================

  if (lifeArea.isDefault) {
    throw new Error('Cannot delete the default category');
  }

  // =========================================================================
  // GET OR CREATE DEFAULT AREA
  // =========================================================================
  // We need the default area to reassign items to

  const defaultArea = await LifeArea.getOrCreateDefault(userId);

  // =========================================================================
  // REASSIGN ALL ITEMS TO DEFAULT AREA
  // =========================================================================
  // Run all updates in parallel for performance

  await Promise.all([
    // Move all notes from deleted area to default
    Note.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    // Move all tasks from deleted area to default
    Task.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    // Move all events from deleted area to default
    Event.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    ),
    // Move all projects from deleted area to default
    Project.updateMany(
      { userId, lifeAreaId },
      { lifeAreaId: defaultArea._id }
    )
  ]);

  // =========================================================================
  // DELETE THE LIFE AREA
  // =========================================================================

  await LifeArea.findByIdAndDelete(lifeAreaId);

  return { deleted: lifeArea, reassignedTo: defaultArea };
}

// =============================================================================
// SET DEFAULT AREA
// =============================================================================

/**
 * setDefault(userId, lifeAreaId)
 * ------------------------------
 * Sets a specific life area as the default.
 *
 * @param {ObjectId} userId - The user who owns the areas
 * @param {ObjectId} lifeAreaId - The area to make default
 *
 * @returns {Object|null} The updated LifeArea document, or null
 *
 * WHAT IS THE DEFAULT AREA?
 * -------------------------
 * The default area is where new items go when no area is specified.
 * Only ONE area can be default at a time.
 *
 * HOW IT WORKS:
 * 1. Unset isDefault on all other areas for this user
 * 2. Set isDefault=true on the specified area
 *
 * EXAMPLE:
 * ```javascript
 * // Make "Personal" the default area
 * const area = await setDefault(userId, personalAreaId);
 * // Now area.isDefault === true
 * // All other areas have isDefault === false
 * ```
 */
export async function setDefault(userId, lifeAreaId) {
  // Delegate to the model's static method which handles the logic
  return LifeArea.setDefault(userId, lifeAreaId);
}

// =============================================================================
// REORDER LIFE AREAS
// =============================================================================

/**
 * reorderLifeAreas(userId, orderedIds)
 * ------------------------------------
 * Reorders the user's life areas.
 *
 * @param {ObjectId} userId - The user who owns the areas
 * @param {Array} orderedIds - Array of area IDs in desired order
 *   - First ID gets order 0
 *   - Second ID gets order 1
 *   - etc.
 *
 * @returns {Array} Array of updated LifeArea documents
 *
 * HOW IT WORKS:
 * Each area ID in the array gets its order field set to its array index.
 *
 * EXAMPLE:
 * ```javascript
 * // Current order: Work (0), Health (1), Finance (2)
 * // User wants: Health (0), Work (1), Finance (2)
 * await reorderLifeAreas(userId, [healthId, workId, financeId]);
 * ```
 *
 * USE CASE:
 * Drag-and-drop reordering in the sidebar. When user drags an area
 * to a new position, the frontend sends the complete new order.
 */
export async function reorderLifeAreas(userId, orderedIds) {
  // Delegate to the model's static method
  return LifeArea.reorder(userId, orderedIds);
}

// =============================================================================
// ARCHIVE/UNARCHIVE LIFE AREA
// =============================================================================

/**
 * archiveLifeArea(userId, lifeAreaId, isArchived)
 * -----------------------------------------------
 * Archives or unarchives a life area.
 *
 * @param {ObjectId} userId - The user who owns the area
 * @param {ObjectId} lifeAreaId - The area to archive/unarchive
 * @param {boolean} isArchived - True to archive, false to unarchive
 *
 * @returns {Object|null} The updated LifeArea document, or null
 *
 * @throws {Error} "Cannot archive the default category" if trying to
 *                 archive the default area
 *
 * WHAT IS ARCHIVING?
 * ------------------
 * Archived areas are hidden from the main list but still exist.
 * Items in archived areas remain accessible.
 *
 * WHY ARCHIVE INSTEAD OF DELETE?
 * - Keep historical data
 * - Easily restore if needed
 * - Seasonal areas (e.g., "Holiday Planning")
 *
 * CANNOT ARCHIVE DEFAULT:
 * The default area cannot be archived because it's needed
 * for new items and as a fallback.
 *
 * EXAMPLE:
 * ```javascript
 * // Archive an area
 * await archiveLifeArea(userId, areaId, true);
 *
 * // Unarchive it later
 * await archiveLifeArea(userId, areaId, false);
 * ```
 */
export async function archiveLifeArea(userId, lifeAreaId, isArchived) {
  // Find the area
  const lifeArea = await LifeArea.findOne({ _id: lifeAreaId, userId });

  if (!lifeArea) return null;

  // Cannot archive the default area
  if (lifeArea.isDefault && isArchived) {
    throw new Error('Cannot archive the default category');
  }

  // Update the archive status
  lifeArea.isArchived = isArchived;
  await lifeArea.save();

  return lifeArea;
}

// =============================================================================
// GET LIFE AREA ITEMS
// =============================================================================

/**
 * getLifeAreaItems(userId, lifeAreaId, options)
 * ---------------------------------------------
 * Gets all items in a specific life area.
 *
 * @param {ObjectId} userId - The user who owns the area
 * @param {ObjectId} lifeAreaId - The area to get items for
 * @param {Object} options - Query options
 *   - options.types: Which item types to include (default: all)
 *   - options.limit: Max items per type (default: 50)
 *   - options.skip: Pagination offset (default: 0)
 *
 * @returns {Object} Object with arrays for each item type
 *
 * SUPPORTED TYPES:
 * - 'note': Notes in this area
 * - 'task': Tasks in this area
 * - 'event': Events in this area
 * - 'project': Projects in this area
 *
 * RETURNED STRUCTURE:
 * ```javascript
 * {
 *   notes: [ ... ],    // If 'note' in types
 *   tasks: [ ... ],    // If 'task' in types
 *   events: [ ... ],   // If 'event' in types
 *   projects: [ ... ]  // If 'project' in types
 * }
 * ```
 *
 * FILTERS APPLIED:
 * - Notes: Excludes trashed notes
 * - Events: Excludes cancelled events
 * - Tasks/Projects: All (including completed)
 *
 * EXAMPLE:
 * ```javascript
 * // Get only notes and tasks
 * const items = await getLifeAreaItems(userId, areaId, {
 *   types: ['note', 'task'],
 *   limit: 20
 * });
 * ```
 */
export async function getLifeAreaItems(userId, lifeAreaId, options = {}) {
  const {
    types = ['note', 'task', 'event', 'project'],  // All types by default
    limit = 50,
    skip = 0
  } = options;

  const results = {};

  // =========================================================================
  // FETCH EACH REQUESTED TYPE
  // =========================================================================

  if (types.includes('note')) {
    // Get notes (exclude trashed)
    results.notes = await Note.find({
      userId,
      lifeAreaId,
      status: { $ne: 'trashed' }
    })
      .sort({ updatedAt: -1 })  // Most recently updated first
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('task')) {
    // Get all tasks (including completed)
    results.tasks = await Task.find({ userId, lifeAreaId })
      .sort({ createdAt: -1 })  // Most recently created first
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('event')) {
    // Get events (exclude cancelled)
    results.events = await Event.find({
      userId,
      lifeAreaId,
      status: { $ne: 'cancelled' }
    })
      .sort({ startDate: 1 })   // Upcoming first
      .skip(skip)
      .limit(limit);
  }

  if (types.includes('project')) {
    // Get all projects
    results.projects = await Project.find({ userId, lifeAreaId })
      .sort({ updatedAt: -1 })  // Most recently updated first
      .skip(skip)
      .limit(limit);
  }

  return results;
}

// =============================================================================
// ENSURE DEFAULT LIFE AREA
// =============================================================================

/**
 * ensureDefaultLifeArea(userId)
 * -----------------------------
 * Ensures the user has a default life area (creates one if needed).
 *
 * @param {ObjectId} userId - The user to check
 *
 * @returns {Object} The default LifeArea document
 *
 * WHEN TO CALL:
 * - During user onboarding
 * - When accessing areas for a new user
 * - Before operations that require a default area
 *
 * DEFAULT AREA CREATED:
 * If no areas exist, this creates a default "General" area:
 * - name: "General"
 * - color: '#6366f1' (indigo)
 * - icon: 'Folder'
 * - isDefault: true
 *
 * IDEMPOTENT:
 * Safe to call multiple times. If a default exists, it's returned.
 * If not, one is created.
 */
export async function ensureDefaultLifeArea(userId) {
  // Delegate to the model's static method
  return LifeArea.getOrCreateDefault(userId);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all life area service functions.
 *
 * USAGE:
 * ```javascript
 * import lifeAreaService from './services/lifeAreaService.js';
 *
 * // Create a new area
 * const area = await lifeAreaService.createLifeArea(userId, {
 *   name: 'Health',
 *   color: '#10b981',
 *   icon: 'Heart'
 * });
 *
 * // Get all areas
 * const areas = await lifeAreaService.getLifeAreas(userId);
 *
 * // Delete an area (items move to default)
 * const { deleted, reassignedTo } = await lifeAreaService.deleteLifeArea(userId, areaId);
 * ```
 */
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
