/**
 * =============================================================================
 * LIFEAREA.JS - Life Area Category Data Model
 * =============================================================================
 *
 * This file defines the LifeArea model - the data structure for organizing
 * content by areas of life in myBrain. Life areas are high-level categories
 * that help users organize their notes, tasks, events, and projects.
 *
 * WHAT IS A LIFE AREA?
 * --------------------
 * A life area represents a broad category or domain of your life. They help
 * you organize everything in myBrain by where it fits in your life.
 *
 * EXAMPLES OF LIFE AREAS:
 * - "Work & Career" - job tasks, professional projects, career goals
 * - "Personal" - personal projects, hobbies, relationships
 * - "Health & Fitness" - workouts, medical appointments, health goals
 * - "Finance" - budgets, investments, financial planning
 * - "Family" - family events, kids activities, home management
 * - "Learning" - courses, books, skill development
 *
 * WHY LIFE AREAS MATTER:
 * ----------------------
 * 1. ORGANIZATION: Group related content together
 * 2. FOCUS: Filter views to see only one area at a time
 * 3. BALANCE: See how much attention you're giving each life area
 * 4. CONTEXT: Quickly switch mental context between areas
 *
 * RELATIONSHIP TO OTHER MODELS:
 * ----------------------------
 * Notes, Tasks, Events, and Projects can all have a lifeAreaId that
 * links them to a specific life area. This allows filtering and
 * grouping across all content types.
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
// LIFE AREA SCHEMA DEFINITION
// =============================================================================

/**
 * The LifeArea Schema
 * -------------------
 * Defines all the fields a LifeArea document can have.
 */
const lifeAreaSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this life area
   * - Required: Every life area must belong to a user
   * - References: Points to a User document
   * - Index: Creates a database index for faster lookups by user
   *
   * Each user has their own set of life areas - they're not shared.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // BASIC INFO
  // ===========================================================================

  /**
   * name: The life area's name
   * - Required: Every life area needs a name
   * - Max 50 characters: Keep names concise
   * - Trimmed: Removes extra whitespace
   *
   * EXAMPLES: "Work & Career", "Health", "Family", "Personal"
   */
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  /**
   * description: Optional explanation of what belongs in this area
   * - Max 200 characters: Keep it brief
   *
   * EXAMPLE: "Professional responsibilities, projects, meetings, and career goals"
   */
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },

  // ===========================================================================
  // APPEARANCE
  // ===========================================================================

  /**
   * color: Visual color for this life area
   * - Default: Indigo (#6366f1)
   * - Used to color-code items belonging to this area
   *
   * Helps users quickly identify which area content belongs to
   * in lists, calendars, and other views.
   */
  color: {
    type: String,
    default: '#6366f1' // Indigo
  },

  /**
   * icon: Icon name to display with this life area
   * - Default: "Folder"
   * - Uses icon names from the UI library (e.g., Lucide icons)
   *
   * EXAMPLES: "Briefcase" for work, "Heart" for health, "Home" for family
   */
  icon: {
    type: String,
    default: 'Folder'
  },

  // ===========================================================================
  // ORDERING & STATUS
  // ===========================================================================

  /**
   * order: Position in the list of life areas
   * - Used to sort life areas in the sidebar and dropdowns
   * - Lower numbers appear first
   * - Users can drag to reorder
   */
  order: {
    type: Number,
    default: 0
  },

  /**
   * isDefault: Whether this is the user's default life area
   * - Only ONE area per user can be the default
   * - New items may be assigned to the default area automatically
   * - A unique partial index ensures only one default per user
   */
  isDefault: {
    type: Boolean,
    default: false
  },

  /**
   * isArchived: Whether this life area is archived
   * - Archived areas are hidden from normal views
   * - Items in archived areas are still accessible
   * - Useful for temporarily hiding areas without deleting
   *
   * EXAMPLE: Archive "Learning" area during busy work periods
   */
  isArchived: {
    type: Boolean,
    default: false
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the life area was created
   * - updatedAt: When the life area was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways life areas are queried.
 */

// For listing a user's life areas in order
// Used by: Sidebar, area selection dropdowns
lifeAreaSchema.index({ userId: 1, order: 1 });

/**
 * Unique Partial Index for Default Area
 * -------------------------------------
 * This special index ensures only ONE life area per user can be the default.
 *
 * HOW IT WORKS:
 * - partialFilterExpression: Only indexes documents where isDefault is true
 * - unique: true: Prevents duplicates in that filtered set
 *
 * RESULT: Each user can have at most one default area
 */
lifeAreaSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert life area to a clean JSON object for API responses.
 * Removes internal MongoDB fields like __v (version key).
 *
 * @returns {Object} - Clean life area object
 */
lifeAreaSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v; // Remove MongoDB version field
  return obj;
};

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getByUser(userId, includeArchived)
 * ----------------------------------
 * Get all life areas for a user, sorted by their order.
 *
 * @param {string} userId - User's ID
 * @param {boolean} includeArchived - Whether to include archived areas (default: false)
 * @returns {Array} - Array of life areas sorted by order
 *
 * EXAMPLE:
 * const areas = await LifeArea.getByUser(userId);
 * // Returns: [{ name: "Work", order: 0 }, { name: "Personal", order: 1 }, ...]
 */
lifeAreaSchema.statics.getByUser = async function(userId, includeArchived = false) {
  const query = { userId };

  // Exclude archived unless explicitly requested
  if (!includeArchived) {
    query.isArchived = { $ne: true }; // $ne = not equal
  }

  return this.find(query).sort({ order: 1 }); // Sort by order ascending
};

/**
 * getOrCreateDefault(userId)
 * --------------------------
 * Get the user's default life area, creating one if it doesn't exist.
 * This ensures every user always has at least one life area.
 *
 * @param {string} userId - User's ID
 * @returns {Object} - The default life area
 *
 * THE DEFAULT AREA:
 * When a new user's default area is created, it's initialized with:
 * - name: "Work & Career"
 * - description: Professional responsibilities, projects, meetings...
 * - color: Blue (#3b82f6)
 * - icon: Briefcase
 */
lifeAreaSchema.statics.getOrCreateDefault = async function(userId) {
  // Try to find existing default
  let defaultArea = await this.findOne({ userId, isDefault: true });

  // Create one if it doesn't exist
  if (!defaultArea) {
    defaultArea = await this.create({
      userId,
      name: 'Work & Career',
      description: 'Professional responsibilities, projects, meetings, and career development goals',
      color: '#3b82f6',      // Blue
      icon: 'Briefcase',
      isDefault: true,
      order: 0               // First in list
    });
  }

  return defaultArea;
};

/**
 * setDefault(userId, lifeAreaId)
 * ------------------------------
 * Make a specific life area the default for a user.
 * Unsets any existing default first.
 *
 * @param {string} userId - User's ID
 * @param {string} lifeAreaId - ID of the area to make default
 * @returns {Object} - The updated life area
 *
 * IMPORTANT:
 * Only one area can be default at a time. This method:
 * 1. Removes isDefault from any existing default
 * 2. Sets isDefault on the specified area
 */
lifeAreaSchema.statics.setDefault = async function(userId, lifeAreaId) {
  // First, unset any existing default for this user
  await this.updateMany(
    { userId, isDefault: true },
    { isDefault: false }
  );

  // Then, set the new default
  return this.findOneAndUpdate(
    { _id: lifeAreaId, userId },   // Find by ID and verify ownership
    { isDefault: true },
    { new: true }                   // Return the updated document
  );
};

/**
 * reorder(userId, orderedIds)
 * ---------------------------
 * Update the order of multiple life areas at once.
 * Used when the user drags to reorder areas in the sidebar.
 *
 * @param {string} userId - User's ID
 * @param {Array} orderedIds - Array of life area IDs in the desired order
 * @returns {Object} - MongoDB bulkWrite result
 *
 * EXAMPLE:
 * // User drags "Personal" above "Work"
 * await LifeArea.reorder(userId, [personalId, workId, healthId]);
 * // Now: Personal=0, Work=1, Health=2
 */
lifeAreaSchema.statics.reorder = async function(userId, orderedIds) {
  // Create bulk update operations
  // Each ID gets its position in the array as its new order
  const operations = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId }, // Verify ownership
      update: { order: index }     // Set order to array position
    }
  }));

  // Execute all updates in one database operation
  return this.bulkWrite(operations);
};

/**
 * getItemCounts(lifeAreaId)
 * -------------------------
 * Get counts of all items (notes, tasks, events, projects) in a life area.
 * Useful for showing item counts in the sidebar or area overview.
 *
 * @param {string} lifeAreaId - ID of the life area
 * @returns {Object} - Counts for each item type and total
 *
 * EXAMPLE:
 * const counts = await LifeArea.getItemCounts(areaId);
 * // Returns: { notes: 15, tasks: 8, events: 3, projects: 2, total: 28 }
 *
 * NOTE: Only counts active items:
 * - Notes that aren't trashed
 * - Tasks that aren't done or cancelled
 * - Events that aren't cancelled
 * - Projects that aren't completed
 */
lifeAreaSchema.statics.getItemCounts = async function(lifeAreaId) {
  // Get references to other models
  const Note = mongoose.model('Note');
  const Task = mongoose.model('Task');
  const Event = mongoose.model('Event');
  const Project = mongoose.model('Project');

  // Query all counts in parallel for efficiency
  const [noteCount, taskCount, eventCount, projectCount] = await Promise.all([
    // Count active notes
    Note.countDocuments({ lifeAreaId, status: { $ne: 'trashed' } }),

    // Count active tasks (not done or cancelled)
    Task.countDocuments({ lifeAreaId, status: { $nin: ['done', 'cancelled'] } }),

    // Count active events (not cancelled)
    Event.countDocuments({ lifeAreaId, status: { $ne: 'cancelled' } }),

    // Count active projects (not completed)
    Project.countDocuments({ lifeAreaId, status: { $nin: ['completed'] } })
  ]);

  return {
    notes: noteCount,
    tasks: taskCount,
    events: eventCount,
    projects: projectCount,
    total: noteCount + taskCount + eventCount + projectCount
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the LifeArea model from the schema.
 * This gives us methods to:
 * - Create areas: LifeArea.create({ userId, name, color, icon })
 * - Find areas: LifeArea.find({ userId }), LifeArea.findById(id)
 * - Update areas: LifeArea.findByIdAndUpdate(id, updates)
 * - Delete areas: LifeArea.findByIdAndDelete(id)
 * - Get by user: LifeArea.getByUser(userId)
 * - Get/create default: LifeArea.getOrCreateDefault(userId)
 * - Set default: LifeArea.setDefault(userId, areaId)
 * - Reorder: LifeArea.reorder(userId, orderedIds)
 * - Get counts: LifeArea.getItemCounts(areaId)
 */
const LifeArea = mongoose.model('LifeArea', lifeAreaSchema);

export default LifeArea;
