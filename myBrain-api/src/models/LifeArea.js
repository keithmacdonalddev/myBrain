import mongoose from 'mongoose';

const lifeAreaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1' // Indigo
  },
  icon: {
    type: String,
    default: 'Folder'
  },
  order: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
lifeAreaSchema.index({ userId: 1, order: 1 });
lifeAreaSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

// Method to convert to safe JSON
lifeAreaSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Get all categories for a user, sorted by order
lifeAreaSchema.statics.getByUser = async function(userId, includeArchived = false) {
  const query = { userId };
  if (!includeArchived) {
    query.isArchived = { $ne: true };
  }
  return this.find(query).sort({ order: 1 });
};

// Get default category for a user, creating one if it doesn't exist
lifeAreaSchema.statics.getOrCreateDefault = async function(userId) {
  let defaultArea = await this.findOne({ userId, isDefault: true });

  if (!defaultArea) {
    defaultArea = await this.create({
      userId,
      name: 'Work & Career',
      description: 'Professional responsibilities, projects, meetings, and career development goals',
      color: '#3b82f6',
      icon: 'Briefcase',
      isDefault: true,
      order: 0
    });
  }

  return defaultArea;
};

// Set a category as the default (unsets any existing default)
lifeAreaSchema.statics.setDefault = async function(userId, lifeAreaId) {
  // Unset existing default
  await this.updateMany(
    { userId, isDefault: true },
    { isDefault: false }
  );

  // Set new default
  return this.findOneAndUpdate(
    { _id: lifeAreaId, userId },
    { isDefault: true },
    { new: true }
  );
};

// Reorder categories
lifeAreaSchema.statics.reorder = async function(userId, orderedIds) {
  const operations = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId },
      update: { order: index }
    }
  }));

  return this.bulkWrite(operations);
};

// Get item counts for a category
lifeAreaSchema.statics.getItemCounts = async function(lifeAreaId) {
  const Note = mongoose.model('Note');
  const Task = mongoose.model('Task');
  const Event = mongoose.model('Event');
  const Project = mongoose.model('Project');

  const [noteCount, taskCount, eventCount, projectCount] = await Promise.all([
    Note.countDocuments({ lifeAreaId, status: { $ne: 'trashed' } }),
    Task.countDocuments({ lifeAreaId, status: { $nin: ['done', 'cancelled'] } }),
    Event.countDocuments({ lifeAreaId, status: { $ne: 'cancelled' } }),
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

const LifeArea = mongoose.model('LifeArea', lifeAreaSchema);

export default LifeArea;
