/**
 * =============================================================================
 * MODERATIONTEMPLATE.JS - Moderation Action Templates Model
 * =============================================================================
 *
 * This file defines the ModerationTemplate model - reusable templates that
 * help administrators apply consistent moderation actions to users.
 *
 * WHAT IS A MODERATION TEMPLATE?
 * ------------------------------
 * A moderation template is a pre-written response that admins can use when
 * warning, suspending, or banning users. Instead of writing the same message
 * repeatedly, admins select a template and the message is applied instantly.
 *
 * WHY USE TEMPLATES?
 * ------------------
 * 1. CONSISTENCY: All users receive the same messaging for the same violation
 * 2. SPEED: Admins don't have to write messages from scratch
 * 3. COMPLIANCE: Ensures company policy language is used correctly
 * 4. PROFESSIONALISM: Pre-written templates are clearer and more fair
 * 5. ANALYTICS: Track which responses are most effective
 *
 * TEMPLATE TYPES:
 * ---------------
 * 1. WARNING: Tell a user they violated policy (no account action)
 *    - Severity level 1-3 (level 3 = final warning before suspension)
 *    - EXAMPLE: "Please review community guidelines. Repeat violations may result in suspension."
 *
 * 2. SUSPENSION: Temporarily disable user's account (7-30 days typical)
 *    - Includes suspension duration (days)
 *    - EXAMPLE: "Your account has been suspended for 7 days due to repeated policy violations."
 *
 * 3. BAN: Permanently remove user from the platform
 *    - Irreversible action
 *    - EXAMPLE: "Your account has been permanently banned for violating our terms of service."
 *
 * CATEGORIES:
 * -----------
 * Templates are organized by violation type for easy discovery:
 * - spam: Unwanted promotional content
 * - harassment: Bullying, threats, intimidation
 * - inappropriate_content: NSFW or offensive material
 * - policy_violation: Other ToS violations
 * - other: Miscellaneous issues
 *
 * TEMPLATE WORKFLOW:
 * ------------------
 * 1. Admin creates template with action type and category
 * 2. Admin uses template on a user (e.g., issue warning with template)
 * 3. Template's usageCount increments (tracks popularity)
 * 4. Admin can deactivate template when it's no longer needed
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
// MODERATION TEMPLATE SCHEMA DEFINITION
// =============================================================================

/**
 * The Moderation Template Schema
 * ------------------------------
 * Defines all the fields a ModerationTemplate document can have.
 */
const moderationTemplateSchema = new mongoose.Schema({

  // ===========================================================================
  // TEMPLATE IDENTIFICATION
  // ===========================================================================

  /**
   * name: Human-readable name for the template
   * - Required: Every template needs a name
   * - Trimmed: Removes extra whitespace
   *
   * EXAMPLES:
   * - "First Warning: Spam"
   * - "Harassment - Final Warning"
   * - "Permanent Ban: Hate Speech"
   *
   * This name appears in the admin interface when selecting templates.
   */
  name: {
    type: String,
    required: true,
    trim: true
  },

  // ===========================================================================
  // ACTION TYPE & SEVERITY
  // ===========================================================================

  /**
   * actionType: What kind of moderation action this template represents
   * - Required: Must specify the action type
   *
   * VALUES:
   * - 'warning': Send user a warning (account not affected)
   * - 'suspension': Temporarily disable user's account (7-30 days)
   * - 'ban': Permanently remove user from platform (irreversible)
   *
   * This determines what happens to the user's account when applied.
   */
  actionType: {
    type: String,
    enum: ['warning', 'suspension', 'ban'],
    required: true
  },

  /**
   * reason: The message template sent to the user
   * - Required: Every template must have reason text
   * - Trimmed: Removes extra whitespace
   * - Max length in practice: should be 500-1000 characters
   *
   * This is the EXACT text the user will receive.
   * EXAMPLES:
   * - "We noticed multiple spam messages in your recent activity. Please review our community guidelines."
   * - "Your account has been suspended for 7 days due to harassment. Review our Code of Conduct before returning."
   *
   * Should be professional, clear, and reference policy document when appropriate.
   */
  reason: {
    type: String,
    required: true,
    trim: true
  },

  /**
   * warningLevel: Severity of the warning (for warning templates only)
   * - Optional: Only applies to 'warning' actionType
   * - Range: 1-3 (where 3 = final warning)
   *
   * VALUES:
   * - 1: First warning (minor issue)
   * - 2: Second warning (escalating issue)
   * - 3: Final warning (next violation = suspension)
   *
   * BUSINESS RULE:
   * Two level-1 warnings + one level-2 = one level-3 warning.
   * After 3 level-3 warnings, user gets suspended.
   * Helps escalate enforcement fairly.
   */
  warningLevel: {
    type: Number,
    min: 1,
    max: 3
  },

  /**
   * suspensionDays: How long the suspension lasts (for suspension templates only)
   * - Optional: Only applies to 'suspension' actionType
   * - null: Indefinite suspension (rare, usually for serious violations)
   * - Min: 1 day
   *
   * EXAMPLES:
   * - 7: One week suspension
   * - 14: Two weeks suspension
   * - 30: One month suspension
   *
   * After this period, user's account is automatically re-enabled.
   */
  suspensionDays: {
    type: Number,
    min: 1
  },

  // ===========================================================================
  // ORGANIZATION & CATEGORIZATION
  // ===========================================================================

  /**
   * category: Type of policy violation this template addresses
   * - Optional: Defaults to 'other'
   * - Helps admins find the right template quickly
   * - Index: Can filter templates by category
   *
   * VALUES:
   * - 'spam': Unwanted promotional/repetitive content
   * - 'harassment': Bullying, threats, intimidation
   * - 'inappropriate_content': NSFW, violent, or offensive material
   * - 'policy_violation': Other community guidelines violations
   * - 'other': Miscellaneous issues not fitting above
   *
   * ADMIN EXPERIENCE:
   * "User is spamming? → Filter by 'spam' → Select appropriate template"
   */
  category: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate_content', 'policy_violation', 'other'],
    default: 'other'
  },

  // ===========================================================================
  // INTERNAL DOCUMENTATION
  // ===========================================================================

  /**
   * description: Admin-facing notes about when/why to use this template
   * - Optional: Internal documentation for moderators
   * - Not shown to users
   * - Max practical length: 200-300 characters
   *
   * EXAMPLES:
   * - "Use for repeated spam after first warning"
   * - "Only for users with 3+ warnings already"
   * - "Check if suspension or ban is more appropriate"
   *
   * Helps admins understand when this template is appropriate.
   */
  description: {
    type: String,
    trim: true
  },

  // ===========================================================================
  // LIFECYCLE & USAGE TRACKING
  // ===========================================================================

  /**
   * isActive: Whether this template is currently available for use
   * - Default: true (active when created)
   * - Admins can set to false to retire old templates
   * - Inactive templates don't appear in selection dropdowns
   *
   * WHY NOT DELETE?
   * Templates are deactivated (not deleted) so we can track historical usage:
   * "How many users got this message?" → query by template ID even if deactivated
   */
  isActive: {
    type: Boolean,
    default: true
  },

  /**
   * usageCount: How many times this template has been applied
   * - Default: 0 (incremented when template is used)
   * - Used for sorting (most-used templates appear first)
   * - Helps identify which templates are most effective
   *
   * ANALYTICS:
   * High usage + low repeat violations = effective template
   * High usage + high repeat violations = template might need updating
   */
  usageCount: {
    type: Number,
    default: 0
  },

  /**
   * lastUsedAt: When this template was most recently applied to a user
   * - Tracks when template was last used in a moderation action
   * - Helps identify stale/obsolete templates
   * - Cleared when template is deactivated
   */
  lastUsedAt: Date,

  // ===========================================================================
  // AUDIT TRAIL
  // ===========================================================================

  /**
   * createdBy: Which admin created this template
   * - Optional: References a User document
   * - Tracks who designed this message
   * - For accountability: "Who wrote this template?"
   *
   * POLICY CONTEXT:
   * Legal/compliance may need to know who authorized specific language.
   */
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the template was created
   * - updatedAt: When the template was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index: actionType + isActive
 * ------------------------------------
 * For finding active templates for a specific action type.
 * Used by: Admin moderation interface to display available templates
 *
 * Query example:
 * db.collection.find({ actionType: 'warning', isActive: true })
 *   .sort({ usageCount: -1 })
 */
moderationTemplateSchema.index({ actionType: 1, isActive: 1 });

/**
 * Index: category
 * ---------------
 * For filtering templates by violation category.
 * Used by: Admin filtering (show templates for "spam" violations only)
 *
 * Query example:
 * db.collection.find({ category: 'harassment', isActive: true })
 */
moderationTemplateSchema.index({ category: 1 });

// =============================================================================
// STATIC METHODS (Called on the Model)
// =============================================================================

/**
 * getTemplatesForAction(actionType)
 * ---------------------------------
 * Get all active templates for a specific moderation action type.
 * Used for displaying available templates when admin needs to warn/suspend/ban a user.
 *
 * @param {string} actionType - Type of action ('warning', 'suspension', 'ban')
 * @returns {Promise<Array>} - Array of template documents sorted by usage
 *
 * EXAMPLE USAGE:
 * // Get warning templates (most-used first)
 * const warnings = await ModerationTemplate.getTemplatesForAction('warning');
 * // Admin selects from this list when warning a user
 *
 * SORTING:
 * Templates sorted by:
 * 1. usageCount (descending) - most-used templates first
 * 2. name (ascending) - alphabetical as tiebreaker
 *
 * WHY THIS ORDER?
 * Most-used templates are typically the best/clearest ones.
 * Showing them first saves admin time.
 */
moderationTemplateSchema.statics.getTemplatesForAction = function(actionType) {
  return this.find({
    actionType,        // Only this action type
    isActive: true    // Only active templates (not retired ones)
  })
    .sort({ usageCount: -1, name: 1 })  // Most used first, then alphabetical
    .lean();          // Return plain objects (faster, no methods)
};

/**
 * incrementUsage(templateId)
 * --------------------------
 * Increment the usage counter when a template is applied to a user.
 * Called immediately after using a template in a moderation action.
 *
 * @param {string} templateId - ID of the template that was used
 * @returns {Promise<Object>} - Updated template document
 *
 * EXAMPLE USAGE:
 * // After applying a warning with this template:
 * await ModerationTemplate.incrementUsage(templateId);
 *
 * WHAT THIS DOES:
 * 1. Finds the template by ID
 * 2. Increments usageCount by 1
 * 3. Updates lastUsedAt to now
 * 4. Returns updated document
 *
 * WHY TRACK USAGE?
 * - Most-used templates = most effective → show them first
 * - Usage patterns help admins understand moderation trends
 * - Identifies rarely-used templates (candidates for retirement)
 */
moderationTemplateSchema.statics.incrementUsage = function(templateId) {
  return this.findByIdAndUpdate(templateId, {
    $inc: { usageCount: 1 },       // Increment counter by 1
    lastUsedAt: new Date()          // Update last used timestamp
  });
};

// =============================================================================
// INSTANCE METHODS (Called on a single template document)
// =============================================================================

/**
 * toSafeJSON()
 * -----------
 * Convert template to a clean JSON object safe for API responses.
 * Removes MongoDB internals and sensitive fields.
 *
 * @returns {Object} - Clean template object for API response
 *
 * RETURNED FIELDS:
 * - _id: Template ID
 * - name: Display name
 * - actionType: 'warning' | 'suspension' | 'ban'
 * - reason: Message sent to user
 * - warningLevel: (for warnings) 1-3
 * - suspensionDays: (for suspensions) days
 * - category: Violation category
 * - description: Admin notes (helpful info)
 * - isActive: Whether template is available
 * - usageCount: How many times used
 * - createdAt: When created
 *
 * FIELDS EXCLUDED:
 * - __v: MongoDB version key (internal)
 * - updatedAt: Not needed in API response
 * - createdBy: Not exposed to frontend
 * - lastUsedAt: Backend-only field
 *
 * WHY NOT EXPOSE EVERYTHING?
 * - Keeps API responses small and focused
 * - Hides admin decisions (createdBy) from frontend
 * - Frontend only needs fields relevant for template selection
 */
moderationTemplateSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  return {
    _id: obj._id,
    name: obj.name,
    actionType: obj.actionType,
    reason: obj.reason,
    warningLevel: obj.warningLevel,
    suspensionDays: obj.suspensionDays,
    category: obj.category,
    description: obj.description,
    isActive: obj.isActive,
    usageCount: obj.usageCount,
    createdAt: obj.createdAt
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the ModerationTemplate model from the schema.
 * This gives us methods to:
 *
 * STATIC METHODS (on Model):
 * - getTemplatesForAction(actionType) - Get templates for admin to choose from
 * - incrementUsage(templateId) - Track template usage statistics
 * - find(), findById(), create(), etc. - Standard Mongoose CRUD operations
 *
 * INSTANCE METHODS (on a template document):
 * - toSafeJSON() - Convert to safe API response format
 * - save() - Update template changes
 * - etc. - Standard Mongoose document methods
 *
 * TYPICAL ADMIN WORKFLOW:
 * 1. Admin wants to warn a user
 * 2. System calls: ModerationTemplate.getTemplatesForAction('warning')
 * 3. Admin selects a template from the list
 * 4. System applies the template to the user
 * 5. System calls: ModerationTemplate.incrementUsage(templateId)
 * 6. Template's usage count increases for future analytics
 */
const ModerationTemplate = mongoose.model('ModerationTemplate', moderationTemplateSchema);

export default ModerationTemplate;
