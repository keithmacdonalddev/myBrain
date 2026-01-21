/**
 * =============================================================================
 * SIDEBARCONFIG.JS - Navigation Sidebar Configuration Model
 * =============================================================================
 *
 * This file defines the SidebarConfig model - the data structure for managing
 * the navigation sidebar that appears on the left side of myBrain.
 *
 * WHAT IS SIDEBAR CONFIG?
 * -----------------------
 * The sidebar is the navigation menu on the left side of the application.
 * It shows links to different features like Dashboard, Notes, Tasks, etc.
 *
 * This model lets administrators customize:
 * - What items appear in the sidebar
 * - What order they appear in
 * - Which sections they belong to
 * - Which items are visible or hidden
 *
 * SINGLETON PATTERN:
 * ------------------
 * This model uses a "singleton" pattern - there's only ONE sidebar config
 * for the entire application. It always has the ID "sidebar".
 *
 * When you call getConfig(), it:
 * 1. Tries to find the existing config
 * 2. If none exists, creates one with defaults
 * 3. Returns the single config document
 *
 * SIDEBAR STRUCTURE:
 * ------------------
 * The sidebar has two levels:
 *
 * 1. SECTIONS: Groups that organize related items
 *    - Main (Dashboard, Today, Inbox)
 *    - Working Memory (Notes, Tasks, Projects, etc.)
 *    - Social (Connections, Messages, Shared)
 *    - Categories (Life areas)
 *    - Beta (Experimental features)
 *    - Admin (Admin panel)
 *
 * 2. ITEMS: Individual navigation links within sections
 *    - Each item has: key, label, icon, path, section, order
 *    - Items can require feature flags to be visible
 *    - Items can require admin role to be visible
 *
 * FEATURE FLAGS:
 * --------------
 * Items can have a "featureFlag" that controls visibility.
 * For example: Projects requires "projectsEnabled" to be true.
 *
 * If a user doesn't have the feature enabled in their role,
 * the item won't show in their sidebar.
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
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * DEFAULT_SECTIONS
 * ----------------
 * The default section groups for the sidebar.
 * Each section can contain multiple navigation items.
 *
 * Properties:
 * - key: Unique identifier (used in code)
 * - label: Display name shown to users
 * - order: Position in the sidebar (lower = higher up)
 * - collapsible: Can the section be collapsed/expanded?
 */
const DEFAULT_SECTIONS = [
  { key: 'main', label: 'Main', order: 0, collapsible: false },              // Always visible core items
  { key: 'working-memory', label: 'Working Memory', order: 1, collapsible: false }, // Main productivity tools
  { key: 'social', label: 'Social', order: 2, collapsible: false },          // Social features
  { key: 'categories', label: 'Categories', order: 3, collapsible: true },   // Life areas (can collapse)
  { key: 'beta', label: 'Beta', order: 4, collapsible: true },               // Experimental features (can collapse)
  { key: 'admin', label: 'Admin', order: 5, collapsible: false }             // Admin tools
];

/**
 * DEFAULT_ITEMS
 * -------------
 * The default navigation items for the sidebar.
 *
 * Properties:
 * - key: Unique identifier
 * - label: Display text
 * - icon: Icon name (from Lucide icons library)
 * - path: URL path to navigate to
 * - section: Which section this item belongs to
 * - order: Position within the section (lower = higher up)
 * - visible: Is this item shown? (can be toggled by admin)
 * - featureFlag: Feature flag that must be enabled (null = always shown)
 * - requiresAdmin: Only show to admin users
 */
const DEFAULT_ITEMS = [
  // ===========================================
  // MAIN SECTION - Core navigation
  // ===========================================
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/app', section: 'main', order: 0, visible: true, featureFlag: null },
  { key: 'today', label: 'Today', icon: 'Calendar', path: '/app/today', section: 'main', order: 1, visible: true, featureFlag: null },
  { key: 'inbox', label: 'Inbox', icon: 'Inbox', path: '/app/inbox', section: 'main', order: 2, visible: true, featureFlag: null },

  // ===========================================
  // WORKING MEMORY SECTION - Productivity tools
  // (Order: Notes, Tasks, Projects, Images, Files, Calendar)
  // ===========================================
  { key: 'notes', label: 'Notes', icon: 'StickyNote', path: '/app/notes', section: 'working-memory', order: 0, visible: true, featureFlag: null },
  { key: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/app/tasks', section: 'working-memory', order: 1, visible: true, featureFlag: null },
  { key: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/app/projects', section: 'working-memory', order: 2, visible: true, featureFlag: 'projectsEnabled' },
  { key: 'images', label: 'Images', icon: 'Image', path: '/app/images', section: 'working-memory', order: 3, visible: true, featureFlag: 'imagesEnabled' },
  { key: 'files', label: 'Files', icon: 'FolderOpen', path: '/app/files', section: 'working-memory', order: 4, visible: true, featureFlag: 'filesEnabled' },
  { key: 'calendar', label: 'Calendar', icon: 'CalendarDays', path: '/app/calendar', section: 'working-memory', order: 5, visible: true, featureFlag: 'calendarEnabled' },

  // ===========================================
  // SOCIAL SECTION - Connection features
  // ===========================================
  { key: 'connections', label: 'Connections', icon: 'Users', path: '/app/social/connections', section: 'social', order: 0, visible: true, featureFlag: 'socialEnabled' },
  { key: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/app/messages', section: 'social', order: 1, visible: true, featureFlag: 'socialEnabled' },
  { key: 'shared', label: 'Shared with Me', icon: 'Share2', path: '/app/social/shared', section: 'social', order: 2, visible: true, featureFlag: 'socialEnabled' },

  // ===========================================
  // BETA SECTION - Experimental features
  // ===========================================
  { key: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/app/fitness', section: 'beta', order: 0, visible: true, featureFlag: 'fitnessEnabled' },
  { key: 'kb', label: 'Knowledge Base', icon: 'BookOpen', path: '/app/kb', section: 'beta', order: 1, visible: true, featureFlag: 'kbEnabled' },

  // ===========================================
  // ADMIN SECTION - Admin tools
  // ===========================================
  { key: 'admin', label: 'Admin Panel', icon: 'Shield', path: '/admin', section: 'admin', order: 0, visible: true, featureFlag: null, requiresAdmin: true }
];

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

/**
 * Sidebar Item Schema
 * -------------------
 * Defines the structure of a single navigation item.
 */
const sidebarItemSchema = new mongoose.Schema({
  /**
   * key: Unique identifier for this item
   * - Used to reference the item in code
   * - EXAMPLE: 'notes', 'tasks', 'projects'
   */
  key: {
    type: String,
    required: true
  },

  /**
   * label: Display text shown to users
   * - EXAMPLE: 'Notes', 'Tasks', 'Projects'
   */
  label: {
    type: String,
    required: true
  },

  /**
   * icon: Icon name from the icon library (Lucide)
   * - EXAMPLE: 'StickyNote', 'CheckSquare', 'FolderKanban'
   */
  icon: {
    type: String,
    required: true
  },

  /**
   * path: URL path to navigate to when clicked
   * - EXAMPLE: '/app/notes', '/app/tasks'
   */
  path: {
    type: String,
    required: true
  },

  /**
   * section: Which section this item belongs to
   * - EXAMPLE: 'main', 'working-memory', 'social'
   */
  section: {
    type: String,
    required: true
  },

  /**
   * order: Position within the section
   * - Lower numbers appear higher in the list
   * - EXAMPLE: 0 = first, 1 = second, etc.
   */
  order: {
    type: Number,
    required: true,
    default: 0
  },

  /**
   * visible: Is this item currently visible?
   * - Admin can toggle this to show/hide items
   */
  visible: {
    type: Boolean,
    default: true
  },

  /**
   * featureFlag: Feature flag required to show this item
   * - If set, item only shows if user has this feature enabled
   * - null = always shown (no feature flag required)
   * - EXAMPLE: 'projectsEnabled', 'calendarEnabled'
   */
  featureFlag: {
    type: String,
    default: null
  },

  /**
   * requiresAdmin: Does this item require admin role?
   * - If true, only admin users see this item
   * - EXAMPLE: Admin Panel requires admin role
   */
  requiresAdmin: {
    type: Boolean,
    default: false
  }
}, { _id: false }); // Don't create separate _id for sub-documents

/**
 * Sidebar Section Schema
 * ----------------------
 * Defines the structure of a section (group of items).
 */
const sidebarSectionSchema = new mongoose.Schema({
  /**
   * key: Unique identifier for this section
   * - EXAMPLE: 'main', 'working-memory', 'social'
   */
  key: {
    type: String,
    required: true
  },

  /**
   * label: Display text shown to users
   * - EXAMPLE: 'Main', 'Working Memory', 'Social'
   */
  label: {
    type: String,
    required: true
  },

  /**
   * order: Position in the sidebar
   * - Lower numbers appear higher
   */
  order: {
    type: Number,
    required: true,
    default: 0
  },

  /**
   * collapsible: Can this section be collapsed/expanded?
   * - True: Users can click to collapse and hide items
   * - False: Section is always expanded
   */
  collapsible: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// =============================================================================
// SIDEBAR CONFIG SCHEMA DEFINITION
// =============================================================================

/**
 * The Sidebar Config Schema
 * -------------------------
 * Main schema for the sidebar configuration document.
 */
const sidebarConfigSchema = new mongoose.Schema({
  /**
   * _id: Fixed ID for the singleton pattern
   * - Always 'sidebar' - there's only one config document
   */
  _id: {
    type: String,
    default: 'sidebar'
  },

  /**
   * items: Array of navigation items
   * - Each item is a link in the sidebar
   * - Default: DEFAULT_ITEMS defined above
   */
  items: {
    type: [sidebarItemSchema],
    default: DEFAULT_ITEMS
  },

  /**
   * sections: Array of section groups
   * - Each section contains related items
   * - Default: DEFAULT_SECTIONS defined above
   */
  sections: {
    type: [sidebarSectionSchema],
    default: DEFAULT_SECTIONS
  },

  /**
   * updatedAt: When the config was last changed
   */
  updatedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * updatedBy: Which admin made the last change
   */
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: false,        // We manage updatedAt ourselves
  collection: 'sidebar_config' // Custom collection name
});

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getConfig()
 * -----------
 * Get the sidebar configuration (singleton pattern).
 * Creates default config if none exists.
 *
 * @returns {Object} - The sidebar configuration document
 *
 * EXAMPLE:
 * const config = await SidebarConfig.getConfig();
 * // config.items = array of navigation items
 * // config.sections = array of section groups
 */
sidebarConfigSchema.statics.getConfig = async function() {
  // Try to find existing config
  let config = await this.findById('sidebar');

  // If no config exists, create one with defaults
  if (!config) {
    config = await this.create({
      _id: 'sidebar',
      items: DEFAULT_ITEMS,
      sections: DEFAULT_SECTIONS
    });
  }

  return config;
};

/**
 * updateConfig(updates, adminId)
 * ------------------------------
 * Update the sidebar configuration.
 *
 * @param {Object} updates - Updates to apply
 *   - items: New items array
 *   - sections: New sections array
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - The updated configuration
 *
 * EXAMPLE:
 * // Add a new item
 * const newItems = [...currentItems, newItem];
 * await SidebarConfig.updateConfig({ items: newItems }, adminId);
 */
sidebarConfigSchema.statics.updateConfig = async function(updates, adminId) {
  // Get current config (or create default)
  const config = await this.getConfig();

  // Update items if provided
  if (updates.items && Array.isArray(updates.items)) {
    config.items = updates.items;
  }

  // Update sections if provided
  if (updates.sections && Array.isArray(updates.sections)) {
    config.sections = updates.sections;
  }

  // Record who made the change and when
  config.updatedAt = new Date();
  config.updatedBy = adminId;

  await config.save();
  return config;
};

/**
 * resetToDefaults(adminId)
 * ------------------------
 * Reset the sidebar to default configuration.
 * Useful if customizations cause problems.
 *
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - The reset configuration
 */
sidebarConfigSchema.statics.resetToDefaults = async function(adminId) {
  const config = await this.getConfig();

  // Reset to defaults
  config.items = DEFAULT_ITEMS;
  config.sections = DEFAULT_SECTIONS;
  config.updatedAt = new Date();
  config.updatedBy = adminId;

  await config.save();
  return config;
};

/**
 * getDefaultItems()
 * -----------------
 * Get the default items (for reference or comparison).
 *
 * @returns {Array} - Default sidebar items
 */
sidebarConfigSchema.statics.getDefaultItems = function() {
  return DEFAULT_ITEMS;
};

/**
 * getDefaultSections()
 * --------------------
 * Get the default sections (for reference or comparison).
 *
 * @returns {Array} - Default sidebar sections
 */
sidebarConfigSchema.statics.getDefaultSections = function() {
  return DEFAULT_SECTIONS;
};

// =============================================================================
// INSTANCE METHODS (Called on a config document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Excludes internal fields like __v.
 *
 * @returns {Object} - Safe JSON representation
 */
sidebarConfigSchema.methods.toSafeJSON = function() {
  return {
    items: this.items,
    sections: this.sections,
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the SidebarConfig model from the schema.
 * This gives us methods to:
 * - Get config: SidebarConfig.getConfig()
 * - Update config: SidebarConfig.updateConfig(updates, adminId)
 * - Reset to defaults: SidebarConfig.resetToDefaults(adminId)
 * - Get defaults: getDefaultItems(), getDefaultSections()
 */
const SidebarConfig = mongoose.model('SidebarConfig', sidebarConfigSchema);

export default SidebarConfig;
