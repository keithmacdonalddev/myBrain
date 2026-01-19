import mongoose from 'mongoose';

// Default sidebar sections
const DEFAULT_SECTIONS = [
  { key: 'main', label: 'Main', order: 0, collapsible: false },
  { key: 'working-memory', label: 'Working Memory', order: 1, collapsible: false },
  { key: 'categories', label: 'Categories', order: 2, collapsible: true },
  { key: 'beta', label: 'Beta', order: 3, collapsible: false },
  { key: 'admin', label: 'Admin', order: 4, collapsible: false }
];

// Default sidebar items
const DEFAULT_ITEMS = [
  // Main section
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/app', section: 'main', order: 0, visible: true, featureFlag: null },
  { key: 'today', label: 'Today', icon: 'Calendar', path: '/app/today', section: 'main', order: 1, visible: true, featureFlag: null },
  { key: 'inbox', label: 'Inbox', icon: 'Inbox', path: '/app/inbox', section: 'main', order: 2, visible: true, featureFlag: null },
  // Working Memory section
  { key: 'calendar', label: 'Calendar', icon: 'CalendarDays', path: '/app/calendar', section: 'working-memory', order: 0, visible: true, featureFlag: 'calendarEnabled' },
  { key: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/app/tasks', section: 'working-memory', order: 1, visible: true, featureFlag: null },
  { key: 'notes', label: 'Notes', icon: 'StickyNote', path: '/app/notes', section: 'working-memory', order: 2, visible: true, featureFlag: null },
  { key: 'images', label: 'Images', icon: 'Image', path: '/app/images', section: 'working-memory', order: 3, visible: true, featureFlag: 'imagesEnabled' },
  { key: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/app/projects', section: 'working-memory', order: 4, visible: true, featureFlag: 'projectsEnabled' },
  // Beta section
  { key: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/app/fitness', section: 'beta', order: 0, visible: true, featureFlag: 'fitnessEnabled' },
  { key: 'kb', label: 'Knowledge Base', icon: 'BookOpen', path: '/app/kb', section: 'beta', order: 1, visible: true, featureFlag: 'kbEnabled' },
  { key: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/app/messages', section: 'beta', order: 2, visible: true, featureFlag: 'messagesEnabled' },
  // Admin section
  { key: 'admin', label: 'Admin Panel', icon: 'Shield', path: '/admin', section: 'admin', order: 0, visible: true, featureFlag: null, requiresAdmin: true }
];

const sidebarItemSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  visible: {
    type: Boolean,
    default: true
  },
  featureFlag: {
    type: String,
    default: null
  },
  requiresAdmin: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const sidebarSectionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  collapsible: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const sidebarConfigSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'sidebar'
  },
  items: {
    type: [sidebarItemSchema],
    default: DEFAULT_ITEMS
  },
  sections: {
    type: [sidebarSectionSchema],
    default: DEFAULT_SECTIONS
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: false,
  collection: 'sidebar_config'
});

/**
 * Get sidebar config singleton
 * Creates default config if none exists
 */
sidebarConfigSchema.statics.getConfig = async function() {
  let config = await this.findById('sidebar');
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
 * Update sidebar configuration
 * @param {Object} updates - Updates to apply (items and/or sections)
 * @param {ObjectId} adminId - Admin user ID making the change
 */
sidebarConfigSchema.statics.updateConfig = async function(updates, adminId) {
  const config = await this.getConfig();

  if (updates.items && Array.isArray(updates.items)) {
    config.items = updates.items;
  }

  if (updates.sections && Array.isArray(updates.sections)) {
    config.sections = updates.sections;
  }

  config.updatedAt = new Date();
  config.updatedBy = adminId;

  await config.save();
  return config;
};

/**
 * Reset to default configuration
 * @param {ObjectId} adminId - Admin user ID making the change
 */
sidebarConfigSchema.statics.resetToDefaults = async function(adminId) {
  const config = await this.getConfig();

  config.items = DEFAULT_ITEMS;
  config.sections = DEFAULT_SECTIONS;
  config.updatedAt = new Date();
  config.updatedBy = adminId;

  await config.save();
  return config;
};

/**
 * Convert to safe JSON for API response
 */
sidebarConfigSchema.methods.toSafeJSON = function() {
  return {
    items: this.items,
    sections: this.sections,
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy
  };
};

/**
 * Get default items (static method for reference)
 */
sidebarConfigSchema.statics.getDefaultItems = function() {
  return DEFAULT_ITEMS;
};

/**
 * Get default sections (static method for reference)
 */
sidebarConfigSchema.statics.getDefaultSections = function() {
  return DEFAULT_SECTIONS;
};

const SidebarConfig = mongoose.model('SidebarConfig', sidebarConfigSchema);

export default SidebarConfig;
