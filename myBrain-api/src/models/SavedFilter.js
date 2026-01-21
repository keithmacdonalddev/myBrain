/**
 * =============================================================================
 * SAVEDFILTER.JS - User's Saved Filter Configurations
 * =============================================================================
 *
 * This file defines the SavedFilter model - the data structure for storing
 * a user's custom filter presets for notes and tasks in myBrain.
 *
 * WHAT IS A SAVED FILTER?
 * -----------------------
 * A saved filter is a preset that remembers specific search/filter settings.
 * Instead of re-entering the same filters every time, users can save them
 * and apply them with one click.
 *
 * EXAMPLE SCENARIO:
 * -----------------
 * A user frequently wants to see:
 * - All high priority tasks
 * - That are not completed
 * - Tagged with "work"
 * - Sorted by due date
 *
 * Instead of setting these 4 filters every time, they save it as
 * "Work Priorities" and click once to apply all settings.
 *
 * FILTER TYPES:
 * -------------
 * Saved filters can be created for two entity types:
 * 1. NOTES: Filter notes by search, tags, status, etc.
 * 2. TASKS: Filter tasks by priority, due date, tags, completion status, etc.
 *
 * CUSTOMIZATION:
 * --------------
 * Each saved filter can have:
 * - A custom name (e.g., "Work Priorities", "Personal Projects")
 * - A custom icon (from available icon set)
 * - A custom color (for visual distinction)
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
// SAVED FILTER SCHEMA DEFINITION
// =============================================================================

/**
 * The Saved Filter Schema
 * -----------------------
 * Defines all the fields a SavedFilter document can have.
 */
const savedFilterSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this saved filter
   * - Required: Every filter belongs to a user
   * - Index: For finding a user's filters quickly
   *
   * Users can only see and use their own saved filters.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // FILTER IDENTIFICATION
  // ===========================================================================

  /**
   * name: Display name for the saved filter
   * - Required: Must have a name to identify it
   * - Max 50 characters
   *
   * EXAMPLES:
   * - "Work Priorities"
   * - "Overdue Tasks"
   * - "Meeting Notes"
   * - "Personal Todos"
   */
  name: {
    type: String,
    required: [true, 'Filter name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  /**
   * entityType: What type of items does this filter apply to?
   * - Required: Must specify what to filter
   *
   * VALUES:
   * - 'note': This filter applies to notes
   * - 'task': This filter applies to tasks
   */
  entityType: {
    type: String,
    enum: ['note', 'task'],
    required: true
  },

  // ===========================================================================
  // FILTER CRITERIA
  // ===========================================================================

  /**
   * filters: The actual filter settings to apply
   * - Contains all the criteria used to filter items
   *
   * This is an embedded object with various filter options.
   */
  filters: {
    /**
     * q: Search query text
     * - Searches content/title of items
     * - Empty string = no text filter
     *
     * EXAMPLE: "meeting" - find items containing "meeting"
     */
    q: { type: String, default: '' },

    /**
     * status: Filter by status
     * - Mixed type: Can be string, array, or object
     * - null = don't filter by status
     *
     * EXAMPLES:
     * - For tasks: 'todo', 'in_progress', 'done'
     * - For notes: 'active', 'archived'
     */
    status: { type: mongoose.Schema.Types.Mixed, default: null },

    /**
     * tags: Filter by tags
     * - Array of tag names/IDs
     * - Empty array = don't filter by tags
     *
     * EXAMPLE: ['work', 'urgent'] - show items with both tags
     */
    tags: { type: [String], default: [] },

    /**
     * priority: Filter by priority level
     * - null = don't filter by priority
     *
     * EXAMPLES:
     * - 'high': Only high priority items
     * - 'medium': Only medium priority items
     * - 'low': Only low priority items
     */
    priority: { type: String, default: null },

    /**
     * dueDate: Filter by due date
     * - Mixed type: Can be object with date range, string like 'overdue', etc.
     * - null = don't filter by due date
     *
     * EXAMPLES:
     * - 'overdue': Tasks past their due date
     * - { $lte: Date } : Due before a certain date
     * - 'today': Due today
     */
    dueDate: { type: mongoose.Schema.Types.Mixed, default: null },

    /**
     * processed: Filter by processed status (for notes)
     * - true: Only processed notes
     * - false: Only unprocessed notes
     * - null: Don't filter by processed status
     *
     * Note: "Processed" typically means a note has been reviewed
     * and any actionable items extracted from it.
     */
    processed: { type: Boolean, default: null }
  },

  // ===========================================================================
  // DISPLAY OPTIONS
  // ===========================================================================

  /**
   * sortBy: How to sort the filtered results
   * - Default: '-updatedAt' (most recently updated first)
   *
   * EXAMPLES:
   * - '-updatedAt': Most recently updated first
   * - '-createdAt': Newest first
   * - 'dueDate': Earliest due date first
   * - '-priority': Highest priority first
   */
  sortBy: {
    type: String,
    default: '-updatedAt'
  },

  /**
   * icon: Icon to display for this filter
   * - From the application's icon library
   *
   * EXAMPLES: 'filter', 'star', 'flag', 'clock', 'briefcase'
   */
  icon: {
    type: String,
    default: 'filter'
  },

  /**
   * color: Color for visual distinction
   * - Hex color or color name
   * - null = use default color
   *
   * EXAMPLES: '#ff0000', 'blue', 'purple'
   */
  color: {
    type: String,
    default: null
  }
}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the filter was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index for User's Filters
 * ---------------------------------
 * Quickly find all filters for a user by entity type.
 * Used when showing "Your Note Filters" or "Your Task Filters".
 */
savedFilterSchema.index({ userId: 1, entityType: 1 });

// =============================================================================
// INSTANCE METHODS (Called on a filter document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Removes internal fields like __v (version key).
 *
 * @returns {Object} - Safe JSON representation
 */
savedFilterSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the SavedFilter model from the schema.
 * This gives us methods to:
 * - Create filter: new SavedFilter({ userId, name, entityType, filters }).save()
 * - Find user's filters: SavedFilter.find({ userId, entityType })
 * - Update filter: SavedFilter.findByIdAndUpdate(id, updates)
 * - Delete filter: SavedFilter.findByIdAndDelete(id)
 * - Convert to JSON: filter.toSafeJSON()
 *
 * TYPICAL USAGE:
 * 1. User creates filter with specific criteria
 * 2. Filter is saved with a name like "Work Tasks"
 * 3. Later, user clicks "Work Tasks" in sidebar
 * 4. App loads the filter and applies all criteria
 * 5. User sees filtered results instantly
 */
const SavedFilter = mongoose.model('SavedFilter', savedFilterSchema);

export default SavedFilter;
