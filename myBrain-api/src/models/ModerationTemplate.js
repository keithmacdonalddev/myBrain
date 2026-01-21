/**
 * ModerationTemplate.js
 * =====================
 * Predefined templates for moderation actions.
 * Helps admins maintain consistency in warnings and suspensions.
 */

import mongoose from 'mongoose';

const moderationTemplateSchema = new mongoose.Schema({
  /**
   * name: Display name for the template
   */
  name: {
    type: String,
    required: true,
    trim: true
  },

  /**
   * actionType: What type of moderation action this template is for
   */
  actionType: {
    type: String,
    enum: ['warning', 'suspension', 'ban'],
    required: true
  },

  /**
   * reason: Pre-filled reason text
   */
  reason: {
    type: String,
    required: true,
    trim: true
  },

  /**
   * warningLevel: For warning templates, the severity level
   */
  warningLevel: {
    type: Number,
    min: 1,
    max: 3
  },

  /**
   * suspensionDays: For suspension templates, the number of days
   * null means indefinite
   */
  suspensionDays: {
    type: Number,
    min: 1
  },

  /**
   * category: Category for organizing templates
   */
  category: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate_content', 'policy_violation', 'other'],
    default: 'other'
  },

  /**
   * description: Optional description for admins
   */
  description: {
    type: String,
    trim: true
  },

  /**
   * isActive: Whether this template is available for use
   */
  isActive: {
    type: Boolean,
    default: true
  },

  /**
   * usageCount: Track how often this template is used
   */
  usageCount: {
    type: Number,
    default: 0
  },

  /**
   * createdBy: Admin who created this template
   */
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  /**
   * lastUsedAt: When this template was last used
   */
  lastUsedAt: Date
}, {
  timestamps: true
});

// =============================================================================
// INDEXES
// =============================================================================

moderationTemplateSchema.index({ actionType: 1, isActive: 1 });
moderationTemplateSchema.index({ category: 1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getTemplatesForAction(actionType)
 * ---------------------------------
 * Get all active templates for a specific action type.
 */
moderationTemplateSchema.statics.getTemplatesForAction = function(actionType) {
  return this.find({
    actionType,
    isActive: true
  })
    .sort({ usageCount: -1, name: 1 })
    .lean();
};

/**
 * incrementUsage(templateId)
 * --------------------------
 * Increment the usage count when a template is used.
 */
moderationTemplateSchema.statics.incrementUsage = function(templateId) {
  return this.findByIdAndUpdate(templateId, {
    $inc: { usageCount: 1 },
    lastUsedAt: new Date()
  });
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Return a safe representation of the template.
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

const ModerationTemplate = mongoose.model('ModerationTemplate', moderationTemplateSchema);

export default ModerationTemplate;
