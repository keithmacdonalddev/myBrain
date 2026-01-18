import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 50
  },
  usageCount: {
    type: Number,
    default: 1,
    min: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  color: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique tags per user
tagSchema.index({ userId: 1, name: 1 }, { unique: true });

// Index for sorting by usage
tagSchema.index({ userId: 1, usageCount: -1 });

// Static method to increment usage for multiple tags
tagSchema.statics.trackUsage = async function(userId, tagNames) {
  if (!tagNames || tagNames.length === 0) return [];

  const normalizedTags = tagNames.map(t => t.trim().toLowerCase()).filter(Boolean);
  if (normalizedTags.length === 0) return [];

  const operations = normalizedTags.map(name => ({
    updateOne: {
      filter: { userId, name },
      update: {
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() },
        $setOnInsert: { userId, name, color: null }
      },
      upsert: true
    }
  }));

  await this.bulkWrite(operations);

  return this.find({ userId, name: { $in: normalizedTags } });
};

// Static method to decrement usage for tags being removed
tagSchema.statics.decrementUsage = async function(userId, tagNames) {
  if (!tagNames || tagNames.length === 0) return;

  const normalizedTags = tagNames.map(t => t.trim().toLowerCase()).filter(Boolean);
  if (normalizedTags.length === 0) return;

  await this.updateMany(
    { userId, name: { $in: normalizedTags } },
    { $inc: { usageCount: -1 } }
  );

  // Clean up tags with 0 or negative usage count
  await this.deleteMany({ userId, usageCount: { $lte: 0 } });
};

// Static method to get user's active tags sorted by popularity
tagSchema.statics.getPopularTags = async function(userId, limit = 50) {
  return this.find({ userId, isActive: true })
    .sort({ usageCount: -1, lastUsed: -1 })
    .limit(limit)
    .lean();
};

// Static method to search active tags
tagSchema.statics.searchTags = async function(userId, query, limit = 10) {
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return this.find({ userId, name: regex, isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get ALL tags (including inactive) for management
tagSchema.statics.getAllTags = async function(userId, options = {}) {
  const { sortBy = 'usageCount', sortOrder = -1, includeInactive = true } = options;

  const query = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  return this.find(query)
    .sort(sortOptions)
    .lean();
};

// Static method to rename a tag across all items
tagSchema.statics.renameTag = async function(userId, oldName, newName) {
  const normalizedOld = oldName.trim().toLowerCase();
  const normalizedNew = newName.trim().toLowerCase();

  if (normalizedOld === normalizedNew) return null;

  // Check if new name already exists
  const existingNew = await this.findOne({ userId, name: normalizedNew });
  if (existingNew) {
    throw new Error('A tag with this name already exists');
  }

  // Update the tag
  return this.findOneAndUpdate(
    { userId, name: normalizedOld },
    { $set: { name: normalizedNew } },
    { new: true }
  );
};

// Static method to merge tags (combine usage counts)
tagSchema.statics.mergeTags = async function(userId, sourceNames, targetName) {
  const normalizedTarget = targetName.trim().toLowerCase();
  const normalizedSources = sourceNames.map(n => n.trim().toLowerCase()).filter(n => n !== normalizedTarget);

  if (normalizedSources.length === 0) return null;

  // Get all source tags
  const sourceTags = await this.find({ userId, name: { $in: normalizedSources } });
  const totalUsage = sourceTags.reduce((sum, t) => sum + t.usageCount, 0);

  // Update or create target tag
  const targetTag = await this.findOneAndUpdate(
    { userId, name: normalizedTarget },
    {
      $inc: { usageCount: totalUsage },
      $set: { lastUsed: new Date() }
    },
    { new: true, upsert: true }
  );

  // Delete source tags
  await this.deleteMany({ userId, name: { $in: normalizedSources } });

  return { targetTag, mergedCount: normalizedSources.length, addedUsage: totalUsage };
};

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
